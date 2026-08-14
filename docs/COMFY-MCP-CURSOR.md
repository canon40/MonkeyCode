# Comfy Cloud MCP ↔ Cursor

Endpoint: `https://cloud.comfy.org/mcp`

## 사전 조건

1. [cloud.comfy.org](https://cloud.comfy.org) 계정
2. **Comfy Cloud 구독** (크레딧만으로는 생성 불가)
3. API Key: [platform.comfy.org/profile/api-keys](https://platform.comfy.org/profile/api-keys) (`comfyui-...`)

## Cursor 설정

프로젝트: `.cursor/mcp.json` (이미 추가됨)

환경변수 (Windows PowerShell):

```powershell
[System.Environment]::SetEnvironmentVariable("COMFY_API_KEY", "comfyui-YOUR_KEY", "User")
```

또는 현재 세션만:

```powershell
$env:COMFY_API_KEY = "comfyui-YOUR_KEY"
```

Cursor 완전 재시작 → Settings → Tools & MCPs → `comfy-cloud` 초록불 확인.

## 사용 예

Cursor 채팅:

- `generate an image of a cyberpunk street at night`
- `find a Wan 2.2 video template`

## 참고

- Cursor는 MCP OAuth 미지원 → **X-API-Key 필수**
- Claude Code / Claude Desktop은 OAuth로도 연결 가능
