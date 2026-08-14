# Run GLM-5.2 via OpenCode + NVIDIA NIM (on Windows)
# Usage: . D:\@code\monkeycode\scripts\opencode-glm52-nvidia.ps1; opencode
# This cloud agent cannot run OpenCode — use Cursor integrated terminal on Windows.

$keyFile = Join-Path $PSScriptRoot ".nvidia-api-key.local"
if (-not (Test-Path $keyFile)) {
    Write-Error "Missing $keyFile"
    return
}
$env:NVIDIA_API_KEY = (Get-Content $keyFile -Raw).Trim()
Write-Host "MODEL=nvidia-nim/z-ai/glm-5.2"
Write-Host "Starting opencode..."
opencode
