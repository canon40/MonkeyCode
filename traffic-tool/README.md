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

## 실행 파일(EXE 등) 만들기

> PyInstaller는 **크로스 컴파일이 안 됩니다.** 배포하려는 OS에서 각각 빌드하세요.
> (Windows에서 빌드 → `TrafficCheck.exe`, macOS에서 빌드 → macOS 실행파일, Linux에서 빌드 → Linux 바이너리)

### Windows
```bat
build.bat
```
→ `dist\TrafficCheck.exe` 생성. 이 **exe 하나만 다른 Windows PC로 복사**하면 파이썬 설치 없이 실행됩니다.

### macOS / Linux
```bash
./build.sh
```
→ `dist/TrafficCheck` 생성.

빌드는 내부적으로 다음을 실행합니다:
```bash
pip install -r requirements.txt
pyinstaller --onefile --windowed --name TrafficCheck run_gui.py
```

## 다른 PC에서 사용하기

- **Windows exe**: `dist\TrafficCheck.exe` 파일만 복사하면 됩니다(설치 불필요, 포터블).
- 설정 파일은 exe와 같은 폴더에 자동 생성되므로, 폴더째 USB/다른 PC로 옮겨도 입력값이 유지됩니다.

## 테스트

```bash
python -m unittest discover -s tests -p "test_*.py" -v
```

로컬 임시 HTTP 서버를 띄워 엔진(헬스체크/부하테스트)을 검증합니다(외부 네트워크 불필요).

## 폴더 구조

```
traffic-tool/
├─ run_gui.py            # 실행/빌드 진입점
├─ build.bat            # Windows 빌드
├─ build.sh             # macOS/Linux 빌드
├─ requirements.txt     # pyinstaller (빌드 전용)
├─ trafficcheck/
│  ├─ engine.py         # stdlib 요청 엔진(헬스체크/부하테스트)
│  ├─ gui.py            # Tkinter GUI (2탭)
│  ├─ settings.py       # 포터블 설정 저장/불러오기
│  └─ __main__.py       # `python -m trafficcheck` (+ --selftest)
└─ tests/test_engine.py # 엔진 단위 테스트
```
