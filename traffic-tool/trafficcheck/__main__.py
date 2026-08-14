"""Entry point.

Default: launch the GUI.
``--selftest URL``: run a headless health check + tiny load test (no GUI),
useful on servers/CI without a display.
"""

from __future__ import annotations

import argparse
import sys


def _selftest(url: str) -> int:
    from .engine import LoadConfig, check_url, run_load_test

    print(f"[health] {url}")
    r = check_url(url, timeout=5)
    print(f"  ok={r.ok} status={r.status} latency_ms="
          f"{r.latency_ms:.1f}" if r.latency_ms is not None else "  (no latency)")
    if r.error:
        print(f"  error={r.error}")

    print(f"[load] {url} (20 requests, concurrency 5)")
    stats = run_load_test(LoadConfig(url=url, total_requests=20, concurrency=5, timeout=5))
    print(f"  total={stats.total} success={stats.success} failed={stats.failed} "
          f"rps={stats.rps:.1f} avg_ms={stats.latency_avg_ms:.1f} p95_ms={stats.p95_ms:.1f}")
    return 0 if stats.success > 0 else 1


def main() -> int:
    parser = argparse.ArgumentParser(prog="trafficcheck", description="URL health check & load test")
    parser.add_argument("--selftest", metavar="URL", help="run a headless check+load test and exit")
    args = parser.parse_args()

    if args.selftest:
        return _selftest(args.selftest)

    from .gui import main as gui_main
    gui_main()
    return 0


if __name__ == "__main__":
    sys.exit(main())
