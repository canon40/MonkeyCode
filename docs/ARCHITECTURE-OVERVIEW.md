# MonkeyCode Architecture Overview

클론된 저장소 트리 기준 요약 (로컬 분석 메모).

## 모노레포 맵

```text
MonkeyCode/
├── backend/          Go API 서버 (Echo/DI, Ent, Postgres/Redis/CH)
├── frontend/         웹 콘솔 (Vite + React/TS)
├── desktop/          데스크톱 클라이언트 (Tauri/Rust + UI)
├── mobile/           iOS/Android (Expo/React Native 계열)
├── browser-extension/ 브라우저 확장
├── plugins/          공식 플러그인/스킬 서브모듈 (공개)
├── agent/            OhMyAgent 서브모듈 (비공개 — 로컬 미클론)
├── docs/             스펙/ADR/플랜
└── .github/          CI (이미지 빌드, 데스크톱 릴리스 등)
```

## 런타임 논리 구조

```text
[ Browser / Mobile / Desktop / Git Bot ]
              │  HTTP / WS / gRPC
              ▼
        ┌─────────────┐
        │   ingress   │  :80 / :50443
        └──────┬──────┘
               │
     ┌─────────┼─────────┐
     ▼         ▼         ▼
 frontend   backend   taskflow
               │         │
               ├─ Postgres
               ├─ Redis
               ├─ ClickHouse
               └─ RustFS (S3)
                         │
                         ▼
              Dev VM / Runner sandbox
              (build · test · preview · coding agents)
```

`preview` 서비스는 host 네트워크로 터널 포트 대역(예: 30000–50000)을 열어 웹 프리뷰를 중계한다.

## Backend (`backend/`)

| 경로 | 역할 |
|------|------|
| `cmd/server` | 프로세스 엔트리: config → DI → migrate → biz 등록 → HTTP 서버 |
| `biz/` | 유스케이스: task, team, project, git, host, llmproxy, plugin, skill… |
| `domain/` | 도메인 모델/포트 (user, task, model, gitbot, mcp, terminal…) |
| `pkg/taskflow` | Taskflow 클라이언트 — VM 생성, CodingAgent, live WS |
| `pkg/` | llm, git, oss, oauth/oidc, clickhouse, delayqueue, telemetry… |
| `ent/`, `db/`, `migration/` | ORM·스키마·마이그레이션 |
| `docker-compose.yml` | 풀스택 배포 정의 |
| `templates/install*.tmpl` | Runner/오프라인 설치 스크립트 템플릿 |

### CodingAgent 종류 (`pkg/taskflow/types.go`)

- Codex
- Claude
- MCAIReview (내장 리뷰 에이전트)
- OpenCode

태스크는 VM에 에이전트를 올려 실행하는 모델이다.

## Frontend (`frontend/`)

주요 라우트 (소스 `frontend/doc.md` / `App.tsx`):

- `/` 랜딩, `/login`, `/console`, `/console/tasks`, `/console/task/:id`
- `/console/project/:id`, `/console/gitbot`, `/console/terminal`, `/console/files`
- `/manager` 기업 관리, `/playground` 개발자 광장

페이지·컴포넌트는 `frontend/src/pages`, `frontend/src/components`.

## Clients

| 패키지 | 기술 | 메모 |
|--------|------|------|
| `desktop/` | Rust (Tauri) + UI | `ARCHITECTURE.md`에 텔레메트리/설정 상세 |
| `mobile/` | RN/Expo | 태스크·파일·에이전트 원격 제어 |
| `browser-extension/` | JS | IDE/브라우저 보조 |

## Plugins / Agent

- `plugins`: `chaitin/MonkeyCodeOfficialPlugins` — skills 등
- `agent`: `chaitin/OhMyAgent` — **비공개 저장소**. SSH/권한이 없으면 비어 있음. 코어 에이전트 커널로 보이며, 스펙 문서(`docs/superpowers/specs/…local-agent-design.md`)에서 데스크톱/클라우드 VM 공용 커널 방향이 언급됨.

## 데이터·인프라 의존성

- **PostgreSQL**: 주 트랜잭션 DB
- **Redis**: 세션/큐/분산 claim
- **ClickHouse**: 사용량·분석성 데이터
- **RustFS**: 오브젝트 스토리지 (버킷 초기화는 backend env로 제어)
- **Taskflow**: VM/태스크 오케스트레이터 (별도 컨테이너, gRPC 50443)

## Cursor / Claude Code 와의 위치

README 비교표 기준 MonkeyCode는:

- 로컬 IDE/CLI/코드컴플리션 ❌ (또는 약함)
- 요구사항·SPEC·팀 협업·클라우드 샌드박스·국산 모델·사설 배포·오픈소스 ✅

즉 “에디터 안의 페어프로그래머”가 아니라 **팀용 AI 개발 운영 플랫폼**에 가깝다.
