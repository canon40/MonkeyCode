"""Request engine for TrafficCheck.

Uses only the Python standard library so the packaged executable stays small
and dependency-free (works on any PC without pip installs).

Two capabilities:

* :func:`check_url` / :class:`HealthMonitor` - periodic health & response-time
  checks for a user-supplied list of URLs (all blank by default).
* :func:`run_load_test` - a simple concurrent benchmark against a single
  user-supplied URL, for servers the user owns or is authorised to test.

No IP spoofing, proxy rotation, captcha bypass or other abuse features are
provided by design.
"""

from __future__ import annotations

import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Callable, Optional

DEFAULT_TIMEOUT = 10.0
DEFAULT_USER_AGENT = "TrafficCheck/1.0 (+https://localhost)"

# Generous but bounded limits so this stays a benchmarking tool, not an
# attack tool. The GUI also requires an explicit authorisation confirmation.
MAX_CONCURRENCY = 500
MAX_TOTAL_REQUESTS = 1_000_000


# --------------------------------------------------------------------------- #
# Health check
# --------------------------------------------------------------------------- #
@dataclass
class CheckResult:
    url: str
    ok: bool
    status: Optional[int]
    latency_ms: Optional[float]
    error: str = ""
    timestamp: float = field(default_factory=time.time)


def check_url(
    url: str,
    timeout: float = DEFAULT_TIMEOUT,
    method: str = "GET",
    user_agent: str = DEFAULT_USER_AGENT,
) -> CheckResult:
    """Perform a single request and measure the response time.

    A non-2xx/3xx HTTP status is still considered "reachable" (``ok`` reflects
    status < 400). Network/timeout errors set ``ok=False`` with an error text.
    """
    url = (url or "").strip()
    if not url:
        return CheckResult(url=url, ok=False, status=None, latency_ms=None,
                           error="empty url")
    if "://" not in url:
        url = "http://" + url

    req = urllib.request.Request(url, method=method, headers={"User-Agent": user_agent})
    start = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            resp.read(2048)  # touch the body so timing reflects a real response
            status = resp.getcode()
            latency = (time.monotonic() - start) * 1000.0
            return CheckResult(url=url, ok=status is not None and status < 400,
                               status=status, latency_ms=latency)
    except urllib.error.HTTPError as exc:
        latency = (time.monotonic() - start) * 1000.0
        return CheckResult(url=url, ok=exc.code < 400, status=exc.code,
                           latency_ms=latency, error=f"HTTP {exc.code}")
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
        latency = (time.monotonic() - start) * 1000.0
        reason = getattr(exc, "reason", exc)
        return CheckResult(url=url, ok=False, status=None, latency_ms=latency,
                           error=str(reason))


class HealthMonitor:
    """Repeatedly checks a list of URLs on an interval in a background thread."""

    def __init__(
        self,
        urls: list[str],
        interval: float = 30.0,
        timeout: float = DEFAULT_TIMEOUT,
        on_result: Optional[Callable[[CheckResult], None]] = None,
    ):
        self.urls = [u.strip() for u in urls if u and u.strip()]
        self.interval = max(1.0, float(interval))
        self.timeout = timeout
        self.on_result = on_result
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def _loop(self) -> None:
        while not self._stop.is_set():
            for url in self.urls:
                if self._stop.is_set():
                    break
                result = check_url(url, timeout=self.timeout)
                if self.on_result:
                    self.on_result(result)
            # Sleep in small slices so stop() is responsive.
            waited = 0.0
            while waited < self.interval and not self._stop.is_set():
                time.sleep(min(0.2, self.interval - waited))
                waited += 0.2

    def start(self) -> None:
        if not self.urls:
            raise ValueError("no URLs to monitor")
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=5)

    @property
    def running(self) -> bool:
        return bool(self._thread and self._thread.is_alive())


# --------------------------------------------------------------------------- #
# Load test
# --------------------------------------------------------------------------- #
@dataclass
class LoadConfig:
    url: str
    method: str = "GET"
    concurrency: int = 10
    total_requests: int = 0      # 0 => use duration_seconds instead
    duration_seconds: float = 0  # 0 => use total_requests instead
    timeout: float = DEFAULT_TIMEOUT
    user_agent: str = DEFAULT_USER_AGENT

    def validate(self) -> None:
        if not (self.url or "").strip():
            raise ValueError("url is required")
        if self.concurrency < 1:
            raise ValueError("concurrency must be >= 1")
        if self.concurrency > MAX_CONCURRENCY:
            raise ValueError(f"concurrency must be <= {MAX_CONCURRENCY}")
        if self.total_requests <= 0 and self.duration_seconds <= 0:
            raise ValueError("set total_requests or duration_seconds")
        if self.total_requests > MAX_TOTAL_REQUESTS:
            raise ValueError(f"total_requests must be <= {MAX_TOTAL_REQUESTS}")


@dataclass
class LoadStats:
    total: int = 0
    success: int = 0
    failed: int = 0
    elapsed_s: float = 0.0
    rps: float = 0.0
    latency_min_ms: float = 0.0
    latency_avg_ms: float = 0.0
    latency_max_ms: float = 0.0
    p50_ms: float = 0.0
    p90_ms: float = 0.0
    p95_ms: float = 0.0
    p99_ms: float = 0.0
    status_counts: dict = field(default_factory=dict)
    errors: dict = field(default_factory=dict)


def _percentile(sorted_vals: list[float], pct: float) -> float:
    if not sorted_vals:
        return 0.0
    k = (len(sorted_vals) - 1) * (pct / 100.0)
    lo = int(k)
    hi = min(lo + 1, len(sorted_vals) - 1)
    frac = k - lo
    return sorted_vals[lo] * (1 - frac) + sorted_vals[hi] * frac


def run_load_test(
    config: LoadConfig,
    stop_event: Optional[threading.Event] = None,
    progress_cb: Optional[Callable[[int], None]] = None,
) -> LoadStats:
    """Run a concurrent benchmark against ``config.url``.

    Blocks until the request budget (count or duration) is exhausted or
    ``stop_event`` is set. Safe to run in a background thread.
    """
    config.validate()
    stop_event = stop_event or threading.Event()

    url = config.url.strip()
    if "://" not in url:
        url = "http://" + url

    latencies: list[float] = []
    status_counts: dict[int, int] = {}
    errors: dict[str, int] = {}
    lock = threading.Lock()
    remaining = {"count": config.total_requests}
    use_duration = config.duration_seconds > 0
    deadline = time.monotonic() + config.duration_seconds if use_duration else 0.0
    done = {"n": 0}

    def claim_request() -> bool:
        if stop_event.is_set():
            return False
        if use_duration:
            return time.monotonic() < deadline
        with lock:
            if remaining["count"] <= 0:
                return False
            remaining["count"] -= 1
            return True

    def worker() -> None:
        while claim_request():
            req = urllib.request.Request(
                url, method=config.method,
                headers={"User-Agent": config.user_agent},
            )
            start = time.monotonic()
            try:
                with urllib.request.urlopen(req, timeout=config.timeout) as resp:
                    resp.read()
                    code = resp.getcode() or 0
                latency = (time.monotonic() - start) * 1000.0
                with lock:
                    latencies.append(latency)
                    status_counts[code] = status_counts.get(code, 0) + 1
                    done["n"] += 1
            except urllib.error.HTTPError as exc:
                latency = (time.monotonic() - start) * 1000.0
                with lock:
                    latencies.append(latency)
                    status_counts[exc.code] = status_counts.get(exc.code, 0) + 1
                    done["n"] += 1
            except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
                reason = str(getattr(exc, "reason", exc))
                with lock:
                    errors[reason] = errors.get(reason, 0) + 1
                    done["n"] += 1
            if progress_cb:
                progress_cb(done["n"])

    started = time.monotonic()
    threads = [threading.Thread(target=worker, daemon=True)
               for _ in range(config.concurrency)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    elapsed = time.monotonic() - started

    ok = sum(c for s, c in status_counts.items() if s and s < 400)
    non_ok_status = sum(c for s, c in status_counts.items() if not (s and s < 400))
    failed = sum(errors.values()) + non_ok_status
    total = ok + failed
    latencies.sort()
    avg = sum(latencies) / len(latencies) if latencies else 0.0

    return LoadStats(
        total=total,
        success=ok,
        failed=failed,
        elapsed_s=elapsed,
        rps=(total / elapsed) if elapsed > 0 else 0.0,
        latency_min_ms=latencies[0] if latencies else 0.0,
        latency_avg_ms=avg,
        latency_max_ms=latencies[-1] if latencies else 0.0,
        p50_ms=_percentile(latencies, 50),
        p90_ms=_percentile(latencies, 90),
        p95_ms=_percentile(latencies, 95),
        p99_ms=_percentile(latencies, 99),
        status_counts=status_counts,
        errors=errors,
    )
