<#
.SYNOPSIS
    Closes the port-forward windows and stops minikube.

.DESCRIPTION
    Frees the RAM minikube holds. The cluster's state lives on disk, so
    everything — ArgoCD, Prometheus, your data — comes back on the next start.

.PARAMETER KeepCluster
    Close the tunnels but leave minikube running.

.EXAMPLE
    .\scripts\stop-cluster.ps1
    .\scripts\stop-cluster.ps1 -KeepCluster
#>
param(
    [switch]$KeepCluster
)

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  $msg" -ForegroundColor Green }

Write-Step 'Closing port-forwards'

# Match on the command line rather than the process name: plain `kubectl` also
# covers unrelated commands, and killing those would be rude.
$procs = Get-CimInstance Win32_Process -Filter "Name = 'kubectl.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'port-forward' }

if ($procs) {
    foreach ($p in $procs) {
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Ok "stopped pid $($p.ProcessId)"
    }
} else {
    Write-Ok 'none running'
}

if ($KeepCluster) {
    Write-Step 'Done'
    Write-Ok 'minikube left running (-KeepCluster)'
    return
}

Write-Step 'Stopping minikube'
minikube stop
Write-Ok 'stopped — cluster state is preserved on disk'
