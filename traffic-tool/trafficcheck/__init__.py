"""TrafficCheck - portable URL health-check and load-testing tool.

The package is split so the request engine (``engine``) has no GUI dependency
and can be tested/headless-run, while ``gui`` provides the Tkinter front-end.
"""

__version__ = "1.0.0"
__all__ = ["engine", "settings"]
