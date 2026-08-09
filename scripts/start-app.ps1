<#
.SYNOPSIS
    Runs the backend and frontend dev servers, each in its own window.

.DESCRIPTION
    The application needs neither Docker nor minikube — the database is a native
    Windows PostgreSQL service. This checks the prerequisites, installs missing
    dependencies, then starts both servers and waits until they answer.

    The browser calls /api on the frontend's origin and the Next server forwards
    it to the backend, so the frontend depends on the backend being up.

.PARAMETER SkipInstall
    Do not run npm install even if node_modules is missing.

.PARAMETER NoBrowser
    Do not open the browser once both servers are ready.

.EXAMPLE
    .\scripts\start-app.ps1
#>
param(
    [switch]$SkipInstall,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  $msg" -ForegroundColor Yellow }

$root     = Split-Path -Parent $PSScriptRoot
$backend  = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'

$BACKEND_PORT  = 4000
$FRONTEND_PORT = 3000

function Test-Port([int]$port) {
    [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

function Wait-ForUrl([string]$url, [int]$timeoutSeconds) {
    $deadline = (Get-Date).AddSeconds($timeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            Invoke-WebRequest -Uri $url -TimeoutSec 3 -UseBasicParsing | Out-Null
            return $true
        } catch {
            # A 4xx still means something is listening and routing.
            if ($_.Exception.Response) { return $true }
        }
        Start-Sleep -Seconds 2
    }
    return $false
}

Write-Step 'Checking prerequisites'

# The database is native Windows PostgreSQL, not a container.
if (Test-Port 5432) {
    Write-Ok 'PostgreSQL listening on 5432'
} else {
    Write-Warn 'Nothing on port 5432 — is the PostgreSQL service running?'
    Write-Warn 'Start it with:  Start-Service postgresql*'
}

$envFile = Join-Path $backend '.env'
if (Test-Path $envFile) {
    Write-Ok 'backend\.env present'
} else {
    throw 'backend\.env is missing - the backend cannot start without DATABASE_URL and JWT_SECRET'
}

if (-not $SkipInstall) {
    foreach ($pair in @(@{ Name = 'backend'; Path = $backend }, @{ Name = 'frontend'; Path = $frontend })) {
        $modules = Join-Path $pair.Path 'node_modules'
        if (-not (Test-Path $modules)) {
            Write-Warn ('{0}: node_modules missing — running npm install' -f $pair.Name)
            Push-Location $pair.Path
            npm install
            Pop-Location
        } else {
            Write-Ok ('{0}: dependencies present' -f $pair.Name)
        }
    }
}

Write-Step 'Starting servers'

if (Test-Port $BACKEND_PORT) {
    Write-Warn ('backend: port {0} already in use — leaving it alone' -f $BACKEND_PORT)
} else {
    Start-Process powershell -ArgumentList '-NoExit', '-Command',
        "Set-Location '$backend'; Write-Host 'BACKEND  http://localhost:$BACKEND_PORT' -ForegroundColor Cyan; npm run start:dev"
    Write-Ok ('backend  starting on http://localhost:{0}' -f $BACKEND_PORT)
}

if (Test-Port $FRONTEND_PORT) {
    Write-Warn ('frontend: port {0} already in use — leaving it alone' -f $FRONTEND_PORT)
} else {
    Start-Process powershell -ArgumentList '-NoExit', '-Command',
        "Set-Location '$frontend'; Write-Host 'FRONTEND http://localhost:$FRONTEND_PORT' -ForegroundColor Cyan; npm run dev"
    Write-Ok ('frontend starting on http://localhost:{0}' -f $FRONTEND_PORT)
}

Write-Step 'Waiting for them to answer'

$backendUrl  = 'http://localhost:{0}/health' -f $BACKEND_PORT
$frontendUrl = 'http://localhost:{0}/' -f $FRONTEND_PORT

if (Wait-ForUrl $backendUrl 90) {
    Write-Ok 'backend ready'
} else {
    Write-Warn 'backend did not answer in 90s — check its window for errors'
}

if (Wait-ForUrl $frontendUrl 90) {
    Write-Ok 'frontend ready'
} else {
    Write-Warn 'frontend did not answer in 90s — check its window for errors'
}

# Proves the frontend can actually reach the backend through its /api proxy,
# which is the part that silently broke before.
Write-Step 'Checking the /api proxy'
try {
    $probe = 'http://localhost:{0}/api/health' -f $FRONTEND_PORT
    $res = Invoke-WebRequest -Uri $probe -TimeoutSec 8 -UseBasicParsing
    Write-Ok ('frontend -> backend OK  ' + $res.Content)
} catch {
    Write-Warn 'the frontend could not reach the backend through /api'
    Write-Warn 'if the frontend was already running from before, restart it to pick up BACKEND_ORIGIN'
}

Write-Step 'Ready'
Write-Host ('  App:   http://localhost:{0}' -f $FRONTEND_PORT) -ForegroundColor Green
Write-Host ('  API:   http://localhost:{0}' -f $BACKEND_PORT) -ForegroundColor Green
Write-Host '  Admin: sign in, then open /admin' -ForegroundColor Gray

if (-not $NoBrowser) {
    Start-Process ('http://localhost:{0}' -f $FRONTEND_PORT)
}
