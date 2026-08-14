"""Engine tests using a local throwaway HTTP server (no network needed)."""

import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from trafficcheck.engine import (
    HealthMonitor,
    LoadConfig,
    check_url,
    run_load_test,
)


class _Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):  # silence
        pass

    def _reply(self):
        if self.path == "/slow":
            time.sleep(0.05)
        if self.path == "/err":
            self.send_response(500)
            self.end_headers()
            self.wfile.write(b"err")
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"ok")

    do_GET = _reply
    do_HEAD = _reply
    do_POST = _reply


class EngineTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()

    def test_check_ok(self):
        r = check_url(self.base + "/")
        self.assertTrue(r.ok)
        self.assertEqual(r.status, 200)
        self.assertIsNotNone(r.latency_ms)

    def test_check_500_reachable_but_not_ok(self):
        r = check_url(self.base + "/err")
        self.assertFalse(r.ok)
        self.assertEqual(r.status, 500)

    def test_check_bad_host(self):
        r = check_url("http://127.0.0.1:1/")  # nothing listening
        self.assertFalse(r.ok)
        self.assertTrue(r.error)

    def test_check_empty_url(self):
        r = check_url("")
        self.assertFalse(r.ok)
        self.assertEqual(r.error, "empty url")

    def test_load_by_count(self):
        stats = run_load_test(LoadConfig(url=self.base + "/", total_requests=50, concurrency=8))
        self.assertEqual(stats.total, 50)
        self.assertEqual(stats.success, 50)
        self.assertEqual(stats.failed, 0)
        self.assertGreater(stats.rps, 0)
        self.assertGreaterEqual(stats.p95_ms, stats.p50_ms)

    def test_load_by_duration(self):
        stats = run_load_test(LoadConfig(url=self.base + "/", duration_seconds=0.5, concurrency=4))
        self.assertGreater(stats.total, 0)
        self.assertGreater(stats.rps, 0)

    def test_load_counts_500_as_failed(self):
        stats = run_load_test(LoadConfig(url=self.base + "/err", total_requests=10, concurrency=2))
        self.assertEqual(stats.success, 0)
        self.assertEqual(stats.failed, 10)
        self.assertIn(500, stats.status_counts)

    def test_load_validation(self):
        with self.assertRaises(ValueError):
            LoadConfig(url="").validate()
        with self.assertRaises(ValueError):
            LoadConfig(url="http://x", concurrency=0, total_requests=1).validate()
        with self.assertRaises(ValueError):
            LoadConfig(url="http://x").validate()  # no count and no duration

    def test_stop_event(self):
        stop = threading.Event()
        stop.set()  # already stopped -> should do nothing
        stats = run_load_test(LoadConfig(url=self.base + "/", total_requests=1000, concurrency=4),
                              stop_event=stop)
        self.assertEqual(stats.total, 0)

    def test_health_monitor(self):
        results = []
        mon = HealthMonitor([self.base + "/", self.base + "/err"], interval=1,
                            on_result=results.append)
        mon.start()
        time.sleep(0.6)
        mon.stop()
        self.assertGreaterEqual(len(results), 2)
        urls = {r.url for r in results}
        self.assertIn(self.base + "/", urls)


if __name__ == "__main__":
    unittest.main(verbosity=2)
