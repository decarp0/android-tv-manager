$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error 'Node.js 22 or newer is required. Install it from https://nodejs.org/'
  exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error 'npm was not found. Install Node.js with npm, then reopen this terminal.'
  exit 1
}

$nodeMajor = [int]((& node -p "process.versions.node.split('.')[0]"))
if ($nodeMajor -lt 22) {
  Write-Error "Node.js 22 or newer is required; found $(& node --version)."
  exit 1
}

if (-not (Get-Command adb -ErrorAction SilentlyContinue) -and -not $env:ADB_PATH) {
  Write-Warning 'adb was not found on PATH. Install Android Platform-Tools or set ADB_PATH before connecting.'
}

if (-not (Test-Path node_modules) -or -not (Test-Path apps/server/scrcpy-server.bin)) {
  & npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

& npm run dev
exit $LASTEXITCODE
