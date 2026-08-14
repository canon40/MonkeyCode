"""cx_Freeze build script for a self-contained Windows build of TrafficCheck.

Produces a folder (TrafficCheck.exe + python DLL + tk + VC runtime) that runs
on any Windows PC WITHOUT Python installed. cx_Freeze is used (instead of a
one-file PyInstaller build) because its launcher initialises Python via the
standard python DLL, which is the most reliable across Windows versions.

Usage (on Windows):
    py -3 -m pip install -r requirements.txt
    py -3 setup_cxfreeze.py build
Output: build\\exe.win-amd64-<pyver>\\  (contains TrafficCheck.exe)
"""

import sys

from cx_Freeze import Executable, setup

# Win32GUI base => no console window pops up alongside the GUI.
base = "Win32GUI" if sys.platform == "win32" else None

build_exe_options = {
    "packages": ["trafficcheck", "tkinter"],
    "include_msvcr": True,  # bundle the MS VC runtime for clean Windows PCs
    "excludes": ["test", "unittest", "pydoc_data"],
}

setup(
    name="TrafficCheck",
    version="1.0.0",
    description="URL health-check and load-test tool",
    options={"build_exe": build_exe_options},
    executables=[Executable("run_gui.py", base=base, target_name="TrafficCheck")],
)
