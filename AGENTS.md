# AGENTS.md

## Cursor Cloud specific instructions

This is the **MonkeyCode** monorepo (enterprise self-hostable AI development
platform). The core, runnable web product in this repo is the **Go backend
API** (`backend/`) plus the **React web console** (`frontend/`). Other
components (`desktop/` Tauri app, `mobile/` Expo app, `browser-extension/`) are
clients; the `agent/` and `plugins/` git submodules are external repos (fetched
over SSH) and are empty here.

### What the environment provides (already installed in the VM)

- Go 1.26 at `/usr/local/go` (symlinked to `/usr/local/bin/go`). The backend
  requires Go >= 1.25 (`backend/go.mod`); the system's Ubuntu `go` 1.22 is too
  old, hence the `/usr/local` install.
- Node 22 + pnpm 10 (frontend), npm (extension/mobile), Rust/cargo (desktop).
- PostgreSQL 16 and Redis 7 installed via apt. There is **no systemd**; start
  them manually (see below). A `monkeycode` / `monkeycode` role + `monkeycode`
  database already exist.

### Starting the required services

Databases (run once per VM boot; both are needed by the backend):

```bash
sudo pg_ctlcluster 16 main start
sudo redis-server /etc/redis/redis.conf --daemonize yes
```

Backend API (`:8888`) — see the important gotcha below about the entrypoint:

```bash
cd backend
go build -o /tmp/mcai-devserver ./cmd/devserver
TASKFLOW_SERVER=http://localhost:18888 /tmp/mcai-devserver
```

Frontend web console (Vite dev server on `:11180`, proxies `/api` to backend):

```bash
cd frontend
TARGET=http://localhost:8888 pnpm run dev:offline -- --host 0.0.0.0 --port 11180
```

Then open `http://localhost:11180/login`, choose the **Admin** (team
administrator) tab, and sign in with the seeded account
`admin@monkeycode.local` / `Admin@12345`.

### Important gotchas (non-obvious)

- **The standalone `cmd/server` cannot boot on its own.** The open-source repo
  is designed to be embedded as a library: the enterprise `domain.MemberManager`
  is injected by a private wrapper via `bridge.go` (`WithMemberManager`), and
  that implementation is not shipped here. Running `cmd/server` panics with
  `could not find service *domain.MemberManager`. For local development use
  **`cmd/devserver`** (added for this environment), which mirrors `cmd/server`
  but registers no-op stubs for `MemberManager` + `ServerConfigProvider` and the
  public-host providers (normally enabled via `bridge.WithPublicHost`). Only the
  add-member / add-admin / OIDC-auto-create admin endpoints are stubbed; login,
  team seeding, and all other flows run real production code.
- Backend config lives in `backend/config/server/config.yaml` (gitignored; copy
  from `config.yaml.example`). It is already created for local dev with captcha
  disabled and the seeded init team. `cmd/devserver` still needs the
  `TASKFLOW_SERVER` env var (read via `os.Getenv`, not from the yaml).
- **Minimal stack = PostgreSQL + Redis only.** ClickHouse, object storage
  (RustFS), `taskflow`, and `preview` are optional and left off. The admin
  dashboard analytics query ClickHouse, so it logs `clickhouse client is nil`
  and shows an "internal server error" toast — this is expected without
  ClickHouse and does not affect login or team/project/member management.
- **Do NOT run `go test ./...` with the `MCAI_*` runtime env vars exported.**
  The `config` package tests assert default values and fail if e.g.
  `MCAI_SECURITY_CAPTCHA_ENABLED` / `MCAI_OBJECT_STORAGE_*` are set in the shell.
  Run tests in a clean env, e.g. `env -i PATH="$PATH" HOME="$HOME" go test ./...`.
- Login passwords: `crypto.HashPassword` bcrypts the raw string and the seeded
  init-team password is stored as `bcrypt("Admin@12345")`. The web console sends
  the raw password (it does NOT MD5 it, despite the Swagger note), so log in with
  the plain `Admin@12345`.
- Frontend edition: use `dev:offline` for the self-hosted console. `dev:online`
  requires a CAP captcha challenge and a `TARGET` origin.

### Lint / test / build (standard commands)

- Backend: `go build ./cmd/devserver`; tests `go test ./...` (clean env, per
  gotcha above). Ent codegen / swagger / migrations: see `backend/Makefile`.
- Frontend: `pnpm run lint`, `pnpm run test:unit`, `pnpm run build:offline`
  (see `frontend/package.json`).
