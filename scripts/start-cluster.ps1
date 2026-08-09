<#
.SYNOPSIS
    Starts minikube and opens a port-forward window for each cluster UI.

.DESCRIPTION
    Brings the local environment up in one step: Docker Desktop, minikube, then
    a tunnel per service. Each port-forward runs in its own window because
    kubectl port-forward holds its terminal until you close it.

    Port-forwards die whenever minikube stops or a pod is replaced. Re-run this
    script after a cluster restart, or use -ForwardsOnly if minikube is already
    up and you just lost the tunnels.

.PARAMETER ForwardsOnly
    Skip starting minikube; only open the port-forward windows.

.PARAMETER SkipForwards
    Start minikube and report status, but do not open any tunnels.

.EXAMPLE
    .\scripts\start-cluster.ps1
    .\scripts\start-cluster.ps1 -ForwardsOnly
#>
param(
    [switch]$ForwardsOnly,
    [switch]$SkipForwards
)

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  $msg" -ForegroundColor Yellow }

# Services to expose. Local port, namespace, service, remote port, URL, credentials.
$forwards = @(
    @{ Name = 'Grafana';      Local = 3001; Namespace = 'monitoring'; Service = 'kube-prometheus-stack-grafana';      Remote = 80;   Creds = 'admin / admin' }
    @{ Name = 'Prometheus';   Local = 9090; Namespace = 'monitoring'; Service = 'kube-prometheus-stack-prometheus';   Remote = 9090; Creds = 'no login' }
    @{ Name = 'Alertmanager'; Local = 9093; Namespace = 'monitoring'; Service = 'kube-prometheus-stack-alertmanager'; Remote = 9093; Creds = 'no login' }
    @{ Name = 'ArgoCD';       Local = 8080; Namespace = 'argocd';     Service = 'argocd-server';                      Remote = 80;   Creds = 'admin / see below' }
)

if (-not $ForwardsOnly) {
    Write-Step 'Docker Desktop'
    docker version --format '{{.Server.Version}}' 2>$null | Out-Null
    if (-not $?) {
        Write-Warn 'Docker is not running — starting it (this can take a minute)'
        $docker = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
        if (Test-Path $docker) { Start-Process $docker } else { throw "Docker Desktop not found at $docker" }

        $deadline = (Get-Date).AddMinutes(4)
        while ((Get-Date) -lt $deadline) {
            docker version --format '{{.Server.Version}}' 2>$null | Out-Null
            if ($?) { break }
            Start-Sleep -Seconds 5
        }
        if (-not $?) { throw 'Docker did not become ready in time' }
    }
    Write-Ok "Docker ready ($(docker version --format '{{.Server.Version}}' 2>$null))"

    Write-Step 'minikube'
    # `minikube start` is a no-op if the cluster is already running.
    minikube start
    if ($LASTEXITCODE -ne 0) { throw 'minikube failed to start' }
    Write-Ok 'cluster running'

    Write-Step 'Cluster state'
    kubectl get pods -A --request-timeout=20s
}

if ($SkipForwards) {
    Write-Step 'Done'
    Write-Ok 'Skipped port-forwards (-SkipForwards)'
    return
}

Write-Step 'Opening port-forwards'

foreach ($f in $forwards) {
    # A listener on the port means either a live forward or something else using
    # it; either way, starting a second one would just fail in a hidden window.
    $inUse = Get-NetTCPConnection -LocalPort $f.Local -State Listen -ErrorAction SilentlyContinue
    if ($inUse) {
        Write-Warn ('{0}: port {1} already in use — skipping' -f $f.Name, $f.Local)
        continue
    }

    # Plain locals, and ${x}: for the port pair — a colon straight after a
    # $(...) subexpression ends the string early in Windows PowerShell.
    $name   = $f.Name
    $ns     = $f.Namespace
    $svc    = $f.Service
    $local  = $f.Local
    $remote = $f.Remote

    $cmd    = "kubectl port-forward -n $ns svc/$svc ${local}:${remote}"
    $banner = "$name -> http://localhost:$local"

    Start-Process powershell -ArgumentList '-NoExit', '-Command', "Write-Host '$banner' -ForegroundColor Cyan; $cmd"
    Write-Ok ('{0} http://localhost:{1}   [{2}]' -f $name.PadRight(13), $local, $f.Creds)
}

Write-Step 'ArgoCD admin password'
try {
    $b64 = kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' --request-timeout=15s 2>$null
    if ($b64) {
        Write-Ok ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64)))
    } else {
        Write-Warn 'initial admin secret not found (it is deleted after a password reset)'
    }
} catch {
    Write-Warn 'could not read the ArgoCD secret'
}

Write-Step 'Ready'
Write-Host @'
  Each tunnel runs in its own window — closing one stops that tunnel.
  Port-forwards break when the cluster restarts or a pod is replaced;
  re-run with -ForwardsOnly to reopen them.

  The app itself does not need any of this. To run it locally:
    cd backend  ; npm run start:dev
    cd frontend ; npm run dev
'@ -ForegroundColor Gray
