"""Tkinter GUI for TrafficCheck.

Two tabs:
  * Health check  - user pastes their own URLs (one per line), starts periodic
                    checks, sees status + response time.
  * Load test     - user enters a single target they own/are authorised to
                    test; an authorisation checkbox gates the Start button.

All target fields are blank by default and remembered between runs via
``settings``. The GUI stays responsive by running work in background threads
and polling a queue with ``after``.
"""

from __future__ import annotations

import queue
import threading
import tkinter as tk
from tkinter import messagebox, ttk

from . import __version__, settings
from .engine import CheckResult, HealthMonitor, LoadConfig, LoadStats, run_load_test


class TrafficCheckApp(ttk.Frame):
    def __init__(self, master: tk.Misc):
        super().__init__(master, padding=8)
        self.pack(fill="both", expand=True)
        self.cfg = settings.load()
        self._events: "queue.Queue[tuple]" = queue.Queue()
        self._monitor: HealthMonitor | None = None
        self._load_thread: threading.Thread | None = None
        self._load_stop = threading.Event()

        nb = ttk.Notebook(self)
        nb.pack(fill="both", expand=True)
        self._build_health_tab(nb)
        self._build_load_tab(nb)

        master.protocol("WM_DELETE_WINDOW", self._on_close)
        self.after(120, self._drain_events)

    # ----------------------------- Health tab ---------------------------- #
    def _build_health_tab(self, nb: ttk.Notebook) -> None:
        tab = ttk.Frame(nb, padding=8)
        nb.add(tab, text="URL 헬스체크")

        ttk.Label(tab, text="검사할 URL (한 줄에 하나씩 · 비워두면 사용자가 입력):").pack(anchor="w")
        self.health_text = tk.Text(tab, height=6, width=80)
        self.health_text.pack(fill="x", pady=(2, 6))
        self.health_text.insert("1.0", "\n".join(self.cfg.get("health_urls", [])))

        row = ttk.Frame(tab)
        row.pack(fill="x")
        ttk.Label(row, text="주기(초):").pack(side="left")
        self.health_interval = tk.StringVar(value=str(self.cfg.get("health_interval", 30)))
        ttk.Entry(row, width=6, textvariable=self.health_interval).pack(side="left", padx=(2, 12))
        ttk.Label(row, text="타임아웃(초):").pack(side="left")
        self.health_timeout = tk.StringVar(value=str(self.cfg.get("health_timeout", 10)))
        ttk.Entry(row, width=6, textvariable=self.health_timeout).pack(side="left", padx=2)
        self.health_start_btn = ttk.Button(row, text="시작", command=self._start_health)
        self.health_start_btn.pack(side="right")
        self.health_stop_btn = ttk.Button(row, text="정지", command=self._stop_health, state="disabled")
        self.health_stop_btn.pack(side="right", padx=(0, 6))

        cols = ("time", "url", "status", "latency", "result")
        self.health_tree = ttk.Treeview(tab, columns=cols, show="headings", height=12)
        for c, w, t in (
            ("time", 90, "시각"), ("url", 320, "URL"), ("status", 70, "상태코드"),
            ("latency", 100, "응답(ms)"), ("result", 90, "결과"),
        ):
            self.health_tree.heading(c, text=t)
            self.health_tree.column(c, width=w, anchor="w")
        self.health_tree.pack(fill="both", expand=True, pady=(8, 0))

    def _start_health(self) -> None:
        urls = [l.strip() for l in self.health_text.get("1.0", "end").splitlines() if l.strip()]
        if not urls:
            messagebox.showinfo("안내", "검사할 URL을 한 줄에 하나씩 입력하세요.")
            return
        try:
            interval = float(self.health_interval.get())
            timeout = float(self.health_timeout.get())
        except ValueError:
            messagebox.showerror("오류", "주기/타임아웃은 숫자여야 합니다.")
            return
        for item in self.health_tree.get_children():
            self.health_tree.delete(item)
        self._monitor = HealthMonitor(
            urls, interval=interval, timeout=timeout,
            on_result=lambda r: self._events.put(("health", r)),
        )
        self._monitor.start()
        self.health_start_btn.config(state="disabled")
        self.health_stop_btn.config(state="normal")
        self._save()

    def _stop_health(self) -> None:
        if self._monitor:
            self._monitor.stop()
            self._monitor = None
        self.health_start_btn.config(state="normal")
        self.health_stop_btn.config(state="disabled")

    def _on_health_result(self, r: CheckResult) -> None:
        import time as _t
        ts = _t.strftime("%H:%M:%S", _t.localtime(r.timestamp))
        latency = f"{r.latency_ms:.0f}" if r.latency_ms is not None else "-"
        status = str(r.status) if r.status is not None else "-"
        result = "정상" if r.ok else (r.error or "실패")
        self.health_tree.insert("", 0, values=(ts, r.url, status, latency, result))

    # ------------------------------ Load tab ------------------------------ #
    def _build_load_tab(self, nb: ttk.Notebook) -> None:
        tab = ttk.Frame(nb, padding=8)
        nb.add(tab, text="부하 테스트")

        warn = ("주의: 부하 테스트는 본인이 소유하거나 명시적으로 허가받은 서버에만 사용하세요. "
                "허가 없는 대상에 대한 부하는 불법일 수 있습니다.")
        lbl = ttk.Label(tab, text=warn, wraplength=560, foreground="#b45309")
        lbl.pack(anchor="w", pady=(0, 6))

        form = ttk.Frame(tab)
        form.pack(fill="x")
        ttk.Label(form, text="대상 URL (비워두면 사용자가 입력):").grid(row=0, column=0, sticky="w")
        self.load_url = tk.StringVar(value=self.cfg.get("load_url", ""))
        ttk.Entry(form, width=52, textvariable=self.load_url).grid(row=0, column=1, columnspan=3, sticky="we", pady=2)

        ttk.Label(form, text="메서드:").grid(row=1, column=0, sticky="w")
        self.load_method = tk.StringVar(value=self.cfg.get("load_method", "GET"))
        ttk.Combobox(form, width=8, textvariable=self.load_method,
                     values=["GET", "HEAD", "POST"], state="readonly").grid(row=1, column=1, sticky="w", pady=2)
        ttk.Label(form, text="동시 요청 수:").grid(row=1, column=2, sticky="e")
        self.load_conc = tk.StringVar(value=str(self.cfg.get("load_concurrency", 10)))
        ttk.Entry(form, width=8, textvariable=self.load_conc).grid(row=1, column=3, sticky="w", pady=2)

        self.load_mode = tk.StringVar(value=self.cfg.get("load_mode", "count"))
        ttk.Radiobutton(form, text="총 요청 수", variable=self.load_mode, value="count").grid(row=2, column=0, sticky="w")
        self.load_total = tk.StringVar(value=str(self.cfg.get("load_total_requests", 200)))
        ttk.Entry(form, width=10, textvariable=self.load_total).grid(row=2, column=1, sticky="w", pady=2)
        ttk.Radiobutton(form, text="지속 시간(초)", variable=self.load_mode, value="duration").grid(row=2, column=2, sticky="e")
        self.load_duration = tk.StringVar(value=str(self.cfg.get("load_duration_seconds", 10)))
        ttk.Entry(form, width=10, textvariable=self.load_duration).grid(row=2, column=3, sticky="w", pady=2)

        ttk.Label(form, text="타임아웃(초):").grid(row=3, column=0, sticky="w")
        self.load_timeout = tk.StringVar(value=str(self.cfg.get("load_timeout", 10)))
        ttk.Entry(form, width=8, textvariable=self.load_timeout).grid(row=3, column=1, sticky="w", pady=2)
        form.columnconfigure(1, weight=1)

        self.authorized = tk.BooleanVar(value=False)
        ttk.Checkbutton(
            tab, variable=self.authorized, command=self._refresh_load_btn,
            text="이 대상 서버를 소유하고 있거나 부하 테스트 권한이 있음을 확인합니다.",
        ).pack(anchor="w", pady=(6, 4))

        btns = ttk.Frame(tab)
        btns.pack(fill="x")
        self.load_start_btn = ttk.Button(btns, text="시작", command=self._start_load, state="disabled")
        self.load_start_btn.pack(side="right")
        self.load_stop_btn = ttk.Button(btns, text="정지", command=self._stop_load, state="disabled")
        self.load_stop_btn.pack(side="right", padx=(0, 6))
        self.load_progress = ttk.Label(btns, text="")
        self.load_progress.pack(side="left")

        self.load_output = tk.Text(tab, height=14, width=80, state="disabled")
        self.load_output.pack(fill="both", expand=True, pady=(8, 0))

    def _refresh_load_btn(self) -> None:
        running = self._load_thread is not None and self._load_thread.is_alive()
        self.load_start_btn.config(state=("normal" if self.authorized.get() and not running else "disabled"))

    def _start_load(self) -> None:
        if not self.authorized.get():
            messagebox.showwarning("확인 필요", "권한 확인 체크박스를 먼저 선택하세요.")
            return
        try:
            config = LoadConfig(
                url=self.load_url.get(),
                method=self.load_method.get(),
                concurrency=int(self.load_conc.get()),
                total_requests=int(self.load_total.get()) if self.load_mode.get() == "count" else 0,
                duration_seconds=float(self.load_duration.get()) if self.load_mode.get() == "duration" else 0,
                timeout=float(self.load_timeout.get()),
            )
            config.validate()
        except ValueError as exc:
            messagebox.showerror("입력 오류", str(exc))
            return

        self._save()
        self._load_stop.clear()
        self._set_output(f"부하 테스트 시작: {config.url}\n동시 {config.concurrency} · "
                         + (f"총 {config.total_requests}회" if config.total_requests else f"{config.duration_seconds}초")
                         + " ...\n")
        self.load_start_btn.config(state="disabled")
        self.load_stop_btn.config(state="normal")

        def run() -> None:
            try:
                stats = run_load_test(
                    config, stop_event=self._load_stop,
                    progress_cb=lambda n: self._events.put(("load_progress", n)),
                )
                self._events.put(("load_done", stats))
            except Exception as exc:  # surface engine errors in the GUI
                self._events.put(("load_error", str(exc)))

        self._load_thread = threading.Thread(target=run, daemon=True)
        self._load_thread.start()

    def _stop_load(self) -> None:
        self._load_stop.set()
        self.load_stop_btn.config(state="disabled")

    def _on_load_done(self, s: LoadStats) -> None:
        lines = [
            "완료.",
            f"총 요청: {s.total}  성공: {s.success}  실패: {s.failed}",
            f"소요: {s.elapsed_s:.2f}s  처리량: {s.rps:.1f} req/s",
            f"지연(ms)  min {s.latency_min_ms:.0f} · avg {s.latency_avg_ms:.0f} · max {s.latency_max_ms:.0f}",
            f"p50 {s.p50_ms:.0f} · p90 {s.p90_ms:.0f} · p95 {s.p95_ms:.0f} · p99 {s.p99_ms:.0f}",
        ]
        if s.status_counts:
            lines.append("상태코드: " + ", ".join(f"{k}:{v}" for k, v in sorted(s.status_counts.items())))
        if s.errors:
            lines.append("오류: " + ", ".join(f"{k} x{v}" for k, v in s.errors.items()))
        self._set_output("\n".join(lines) + "\n")
        self.load_stop_btn.config(state="disabled")
        self._refresh_load_btn()

    def _set_output(self, text: str) -> None:
        self.load_output.config(state="normal")
        self.load_output.delete("1.0", "end")
        self.load_output.insert("1.0", text)
        self.load_output.config(state="disabled")

    # ------------------------------ Plumbing ------------------------------ #
    def _drain_events(self) -> None:
        try:
            while True:
                kind, payload = self._events.get_nowait()
                if kind == "health":
                    self._on_health_result(payload)
                elif kind == "load_progress":
                    self.load_progress.config(text=f"진행: {payload}")
                elif kind == "load_done":
                    self.load_progress.config(text="")
                    self._on_load_done(payload)
                elif kind == "load_error":
                    self.load_progress.config(text="")
                    messagebox.showerror("부하 테스트 오류", str(payload))
                    self.load_stop_btn.config(state="disabled")
                    self._refresh_load_btn()
        except queue.Empty:
            pass
        self.after(120, self._drain_events)

    def _save(self) -> None:
        data = {
            "health_urls": [l.strip() for l in self.health_text.get("1.0", "end").splitlines() if l.strip()],
            "health_interval": _num(self.health_interval.get(), 30),
            "health_timeout": _num(self.health_timeout.get(), 10),
            "load_url": self.load_url.get().strip(),
            "load_method": self.load_method.get(),
            "load_concurrency": _num(self.load_conc.get(), 10),
            "load_mode": self.load_mode.get(),
            "load_total_requests": _num(self.load_total.get(), 200),
            "load_duration_seconds": _num(self.load_duration.get(), 10),
            "load_timeout": _num(self.load_timeout.get(), 10),
        }
        try:
            settings.save(data)
        except OSError:
            pass  # non-fatal: settings are a convenience

    def _on_close(self) -> None:
        self._stop_health()
        self._load_stop.set()
        try:
            self._save()
        finally:
            self.master.destroy()


def _num(value: str, default):
    try:
        f = float(value)
        return int(f) if f.is_integer() else f
    except (TypeError, ValueError):
        return default


def main() -> None:
    root = tk.Tk()
    root.title(f"TrafficCheck v{__version__}")
    root.geometry("640x560")
    TrafficCheckApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
