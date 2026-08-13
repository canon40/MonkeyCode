# MonkeyCode Self-Host (WSL2 / Docker)

이 PC 기준 실습 메모. 공식 설치는 **Linux + root** 전제다. Windows에서는 WSL2 Ubuntu를 사용한다.

## 현재 환경 점검 결과

| 항목 | 상태 |
|------|------|
| WSL2 Ubuntu | 사용 가능 |
| Docker Engine (WSL) | 설치됨 (Community 29.x + Compose plugin) |
| 메모리 | ~15GB — 콘솔는 충분, Runner 최소(16GB)와 근접 |
| CPU | 8 논리 코어 — Runner 최소와 동일 |
| 디스크 | WSL 루트 ~1TB급 |
| Windows 네이티브 Docker Desktop | PATH에 없음 (불필요, WSL Docker 사용) |

## 사전 준비

### 1) WSL 기동

```powershell
wsl -d Ubuntu
```

### 2) Docker 데몬

WSL에서 systemd가 불안정하면:

```bash
bash /mnt/d/@code/monkeycode/scripts/wsl-start-docker.sh
# 또는
bash /mnt/d/@code/monkeycode/scripts/wsl-install-docker.sh   # 최초 1회
docker info
```

### 3) AVX (Runner 설치 시)

저장소의 Runner 설치 템플릿(`backend/templates/install.sh.tmpl`)은 x86_64에서 **AVX**를 요구한다.

```bash
grep -qiE '(^|[[:space:]])avx([[:space:]]|$)' /proc/cpuinfo && echo AVX_OK || echo AVX_MISSING
```

## 공식 원클릭 설치 (콘솔 스택)

```bash
# WSL 안에서, root로
bash -c "$(curl -fsSL 'https://monkeycode-ai.com/online/install')"
```

동작 요약:

1. `monkeycode-ai.com/online/install` 스크립트 다운로드
2. OSS에서 `monkeycode-online-linux-amd64.tgz` (버전 예: `v260804`) 수신
3. 패키지 내 `install.sh` 실행 → Docker Compose 기반 서비스 기동

공식 문서: https://monkeycode.docs.baizhi.cloud/node/019eb0f3-9424-7c93-9489-4e584f989527

### 주의

- **포트 80 / 50443** 등을 점유한다. Windows/WSL에서 충돌 나면 `NGINX_PORT` 등으로 조정 필요할 수 있다.
- 이미지·볼륨이 크므로 디스크와 시간을 넉넉히 잡는다.
- Runner(개발 VM 호스트)는 콘솔와 **별도 머신/역할**로 설치하는 모델이다. 이 PC 15GB RAM에 콘솔+Runner를 동시에 올리면 빡빡하다.
- 엔터프라이즈/사내망 배포는 오프라인 패키지·방화벽·TLS 설정이 추가된다.

## 소스의 Compose 스택 (개발/오프라인 이해용)

`backend/docker-compose.yml` 서비스 맵:

| 서비스 | 역할 (요약) |
|--------|-------------|
| `db` | PostgreSQL |
| `redis` | 캐시/큐 |
| `clickhouse` | 분석/로그성 스토어 |
| `rustfs` | S3 호환 오브젝트 스토리지 |
| `ingress` | Nginx 진입점 (80, 50443) |
| `frontend` | 웹 UI |
| `backend` | Go API (`cmd/server`) |
| `taskflow` | 태스크/VM 오케스트레이션 |
| `preview` | 프리뷰 릴레이(host 네트워크, 터널 포트) |

이미지/비밀번호는 `${INSTALL_DIR}`·환경변수로 주입된다. 원클릭 설치 패키지가 이 구성을 채워 넣는 형태다.

## Runner 설치 (콘솔 연동 후)

콘솔에서 발급하는 토큰/GRPC 정보로 Runner를 붙인다. 템플릿 개념:

```text
https://release.baizhi.cloud/monkeycode/runner/$ARCH/installer
  --env TOKEN=...
  --env GRPC_HOST=...
  --env GRPC_PORT=...
```

상세 값은 배포 문서·콘솔 UI를 따른다.

## 권장 진행 순서 (이 PC)

1. **온라인 체험** — https://monkeycode-ai.net/ (설치 없이 30M 토큰 플로우 확인)
2. **WSL Docker로 콘솔만** 셀프호스트 (이 가이드의 원클릭)
3. Runner는 RAM/디스크 여유 있는 **별도 Linux**에 분리 권장
4. 소스 해킹은 `frontend` / `backend` 로컬 빌드 (전체 스택 Compose와 병행)

## 온라인 패키지 실측 결과 (캐시됨)

경로: `.cache/online-pkg/` (버전 **v260804**, amd64)

- `install.sh` → `./installer center` 실행
- 기본 설치 디렉터리: `/data/monkeycode-ai`
- 이미지 레지스트리: `chaitin-registry.cn-hangzhou.cr.aliyuncs.com`
- Compose 서비스: db, redis, clickhouse, rustfs, ingress, taskflow, frontend, backend, preview
- `.env.example`에 `TEAM_EMAIL` / `TEAM_PASSWORD` / DB·Redis·CH·RustFS 시크릿 / `REMOTE_IP` 필요

재캐시:

```bash
bash /mnt/d/@code/monkeycode/scripts/wsl-cache-online-pkg.sh
```

## 로컬에서 실행해 둔 것

- [x] 저장소 클론 → `D:\@code\monkeycode`
- [x] WSL Docker Engine + Compose 설치, AVX_OK, Docker ready
- [x] 온라인 설치 패키지 다운로드·구조 분석 (`.cache/online-pkg`)
- [x] 헬퍼 스크립트: `wsl-install-docker.sh`, `wsl-start-docker.sh`, `wsl-cache-online-pkg.sh`
- [ ] `./installer center` 풀 기동 — 포트 80/관리자 계정·이미지 pull 필요 → 아래 명령으로 실행

```bash
# WSL root
bash /mnt/d/@code/monkeycode/scripts/wsl-start-docker.sh
bash -c "$(curl -fsSL 'https://monkeycode-ai.com/online/install')"
# 또는 캐시본:
cd /mnt/d/@code/monkeycode/.cache/online-pkg/extract/monkeycode-online-linux-amd64
./install.sh
```
