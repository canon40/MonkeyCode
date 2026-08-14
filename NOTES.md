# MonkeyCode Notes

로컬 메모 — Pro Coder 영상 + 공식 README/저장소 기준 (2026-08-13).

## 출처

| 구분 | 링크 |
|------|------|
| 영상 | [Goodbye Claude Code! MonkeyCode… (QQKvLTxf91E)](https://www.youtube.com/watch?v=QQKvLTxf91E) |
| GitHub | https://github.com/chaitin/MonkeyCode |
| 개발사 | Chaitin (长亭科技) |
| 온라인 | https://monkeycode-ai.net/ / https://monkeycode-ai.com/ |
| 문서 | https://monkeycode.docs.baizhi.cloud/ |
| 배포 문서 | https://monkeycode.docs.baizhi.cloud/node/019eb0f3-9424-7c93-9489-4e584f989527 |
| 라이선스 | AGPL-3.0 |

## 한 줄 정의

개인 vibe-coding 도구가 아니라, **팀/엔터프라이즈용 클라우드 AI 개발 플랫폼**.  
요구사항·태스크·모델·개발환경(샌드박스 VM)·PR 리뷰·모바일까지 한 흐름으로 묶는다.

## 영상 핵심 (Pro Coder)

- 카드 없이 매일 **30M 무료 토큰**, 24시간마다 리셋
- 브라우저만으로 서버 사이드 클라우드 환경 실행
- 모델: DeepSeek, GLM, Kimi, MiniMax, Qwen 등
- 병렬 AI 에이전트, 자동 PR/MR 리뷰, iOS/Android 앱
- 셀프호스팅 가능
- 시연: 네온 스네이크 HTML 게임 ≈ 1분, **~488K 토큰**

## README 핵심

- 스택 비중(대략): TypeScript ~54%, Go ~29%, Rust ~12.5% (+ JS/Python)
- 클라우드 개발환경: 빌드/테스트/프리뷰가 서버 샌드박스에서 실행
- SPEC/요구사항/이슈/태스크 관리 + Git 봇 리뷰
- 로컬 IDE/CLI 중심이 아님 (Cursor/Claude Code와 포지션이 다름)

### 권장 사양

| 역할 | 최소 |
|------|------|
| MonkeyCode 콘솔 | 2C / 4GB / 40GB |
| 개발환경 호스트 (Runner) | 8C / 16GB / 100GB |

영상에서 말한 8C/16GB/100GB는 **Runner** 쪽에 가깝다.

### 원클릭 설치 (Linux, root)

```bash
bash -c "$(curl -fsSL 'https://monkeycode-ai.com/online/install')"
```

설치 스크립트는 Linux amd64/arm64만 지원하며, 패키지(예: `v260804`)를 받아 `install.sh`를 실행한다.

## 로컬 작업 상태 (이 PC)

- 클론 경로: `D:\@code\monkeycode`
- WSL2 Ubuntu: 있음 (약 8C / 15GB RAM / ~1TB 디스크, AVX 확인 필요시 가이드 참고)
- Docker Engine: WSL 안에 설치됨 (`scripts/wsl-install-docker.sh`)
- 서브모듈
  - `plugins` (MonkeyCodeOfficialPlugins): 초기화 완료
  - `agent` (OhMyAgent): **비공개/SSH 전용** — HTTPS로도 `Repository not found`, SSH 키 없으면 미클론

## 관련 로컬 문서

- 셀프호스팅 가이드: [`docs/SELFHOST-WSL.md`](docs/SELFHOST-WSL.md)
- 아키텍처 메모: [`docs/ARCHITECTURE-OVERVIEW.md`](docs/ARCHITECTURE-OVERVIEW.md)
