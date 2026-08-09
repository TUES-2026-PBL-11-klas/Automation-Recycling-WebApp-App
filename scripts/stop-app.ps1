<#
.SYNOPSIS
    Stops the backend and frontend dev servers.

.DESCRIPTION
    Finds whatever is listening on the app's ports and stops it, along with the
    window it is running in. Useful because both servers run in watch mode and
    accumulate stale state across a long session.

.EXAMPLE
    .\scripts\stop-app.ps1
#>

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  $msg" -ForegroundColor Green }

Write-Step 'Stopping app servers'

$stopped = 0
foreach ($port in @(4000, 3000)) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            Write-Ok ('port {0}: stopped {1} (pid {2})' -f $port, $proc.ProcessName, $proc.Id)
            $stopped++
        }
    }
}

if ($stopped -eq 0) { Write-Ok 'nothing was listening on 3000 or 4000' }
