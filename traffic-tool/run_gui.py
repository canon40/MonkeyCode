"""PyInstaller entry script.

Runs the TrafficCheck GUI by default. Also supports the headless self-test so
the packaged executable can be verified without a display:

    TrafficCheck --selftest https://example.com
"""

import sys

from trafficcheck.__main__ import main

if __name__ == "__main__":
    sys.exit(main())
