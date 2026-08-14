# TrafficCheck

URL **헬스체크 / 응답시간 측정**과 **부하 테스트**를 하나의 GUI로 제공하는 이식성 높은 도구입니다.
대상 URL·서버는 **전부 빈칸**으로 시작하며, 사용자가 각자 입력해서 사용합니다(값이 없어도 정상 실행됩니다).

- 순수 **Python 표준 라이브러리**만 사용(런타임 의존성 없음) → 다른 PC로 복사해도 그대로 동작
- **Windows / macOS / Linux** 지원, **GUI**(Tkinter) 제공
- 설정(입력한 URL 등)은 실행 파일 옆 `trafficcheck_settings.json`에 저장되어 재실행 시 복원

## ⚠️ 사용 범위 (중요)

**부하 테스트는 본인이 소유하거나 명시적으로 허가받은 서버/도메인에만** 사용하세요.
허가 없는 대상에 부하를 발생시키는 행위는 불법이며 서비스 약관 위반일 수 있습니다.
이 도구는 정상적인 벤치마크/모니터링 용도이며, IP 위조·프록시 우회·캡차 우회 같은
악용 기능은 포함하지 않습니다. 부하 테스트 탭은 실행 전 **권한 확인 체크박스**를 요구합니다.

## 기능

### 1) URL 헬스체크 탭
- 검사할 URL을 한 줄에 하나씩 입력 → 지정한 주기(초)마다 요청
- 각 URL의 상태코드, 응답시간(ms), 정상/실패 결과를 표로 표시

### 2) 부하 테스트 탭
- 대상 URL 1개 + 메서드(GET/HEAD/POST) + 동시 요청 수 입력
- **총 요청 수** 또는 **지속 시간(초)** 중 하나로 실행
- 결과: 총/성공/실패 수, 처리량(req/s), 지연시간 min·avg·max·p50·p90·p95·p99, 상태코드 분포

## 소스로 바로 실행 (빌드 없이)

Python 3.9+ 필요. (Windows/macOS의 기본 Python에는 Tkinter가 포함되어 있습니다.
리눅스는 `sudo apt install python3-tk` 필요할 수 있음.)

```bash
python run_gui.py
```

헤드리스(디스플레이 없는 서버)에서 동작 확인:

```bash
python -m trafficcheck --selftest https://example.com
```

## 실행 파일(EXE) 만들기

> 빌드 도구는 **크로스 컴파일이 안 됩니다.** 배포하려는 OS에서 각각 빌드하세요.

### Windows (권장 · 어느 Windows PC에서든 실행)
```bat
build.bat
```
빌드하면 두 가지 배포물이 나옵니다. **둘 다 파이썬 등 다른 설치가 전혀 필요 없습니다**
(Python 런타임 + Tk + MS Visual C++ 런타임이 모두 포함).

1. **`TrafficCheck-Setup.exe`** — 단일 **설치 파일**. 이거 하나만 실행하면 설치되고,
   시작 메뉴/바탕화면 바로가기가 생기며 바로 실행됩니다. **다른 설치가 필요 없습니다.**
   (Inno Setup이 설치된 PC에서 빌드할 때 생성됩니다: https://jrsoftware.org/isdl.php)
2. **`TrafficCheck-windows.zip`** — 설치가 싫을 때 쓰는 **포터블** 버전. 압축을 풀고
   `TrafficCheck.exe`를 더블클릭. USB/다른 PC로 폴더째 옮겨도 동작.

내부적으로 **cx_Freeze**로 빌드합니다(표준 Python DLL 로더 사용 → 여러 Windows 버전에서 안정적).
설정은 실행 파일 위치 기준으로 `trafficcheck_settings.json`에 저장되어 유지됩니다.

> 굳이 "설치 없이 단일 exe 파일 하나"만 원하면 PyInstaller로도 가능합니다:
> `pip install pyinstaller && pyinstaller --onefile --windowed --name TrafficCheck run_gui.py`

### macOS / Linux
```bash
./build.sh
```
→ `dist/TrafficCheck` 단일 실행파일 생성(PyInstaller).

## 다른 PC에서 사용하기

- **가장 쉬운 방법**: 배포된 `TrafficCheck-windows.zip`을 받아 압축을 풀고 `TrafficCheck.exe` 실행.
- Python·별도 설치 불필요, 인터넷 연결 불필요(대상 URL 접속 제외).
- 폴더 전체를 USB나 다른 PC로 복사하면 그대로 동작하며, 입력한 URL 등 설정도 함께 이동합니다.

## 테스트

```bash
python -m unittest discover -s tests -p "test_*.py" -v
```

로컬 임시 HTTP 서버를 띄워 엔진(헬스체크/부하테스트)을 검증합니다(외부 네트워크 불필요).

## 폴더 구조

```
traffic-tool/
├─ run_gui.py            # 실행/빌드 진입점
├─ setup_cxfreeze.py    # Windows(cx_Freeze) 빌드 설정
├─ build.bat            # Windows 빌드 (cx_Freeze → 폴더 + zip)
├─ build.sh             # macOS/Linux 빌드 (PyInstaller → 단일 파일)
├─ requirements.txt     # cx_Freeze / pyinstaller (빌드 전용)
├─ trafficcheck/
│  ├─ engine.py         # stdlib 요청 엔진(헬스체크/부하테스트)
│  ├─ gui.py            # Tkinter GUI (2탭)
│  ├─ settings.py       # 포터블 설정 저장/불러오기
│  └─ __main__.py       # `python -m trafficcheck` (+ --selftest)
└─ tests/test_engine.py # 엔진 단위 테스트
```
