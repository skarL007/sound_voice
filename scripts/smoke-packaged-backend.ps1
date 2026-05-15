param(
    [int]$Port = 9472
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendExe = Join-Path $repoRoot "python_dist\voicelaunch-backend\voicelaunch-backend.exe"

if (-not (Test-Path $backendExe)) {
    throw "Backend executable not found: $backendExe"
}

$process = $null

try {
    $process = Start-Process -FilePath $backendExe -ArgumentList @("--host", "127.0.0.1", "--port", "$Port") -PassThru

    $healthUri = "http://127.0.0.1:$Port/health"
    $modelsUri = "http://127.0.0.1:$Port/models"
    $health = $null

    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if ($process.HasExited) {
            throw "Backend exited early with code $($process.ExitCode)."
        }

        try {
            $health = Invoke-RestMethod -Uri $healthUri -TimeoutSec 2
            break
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }

    if ($null -eq $health) {
        throw "Health endpoint did not respond on $healthUri."
    }

    if ($health.status -ne "ok") {
        throw "Unexpected /health payload: $($health | ConvertTo-Json -Compress)"
    }

    $models = Invoke-RestMethod -Uri $modelsUri -TimeoutSec 5
    if ($models -isnot [System.Array]) {
        throw "Unexpected /models payload: $($models | ConvertTo-Json -Compress)"
    }

    $modelIds = @($models | ForEach-Object { $_.id })
    foreach ($requiredModel in @("piper", "kokoro")) {
        if ($requiredModel -notin $modelIds) {
            throw "Model '$requiredModel' was not listed by /models."
        }
    }

    Write-Host "Health OK:" ($health | ConvertTo-Json -Compress)
    Write-Host "Models OK:" (($modelIds -join ", "))
} finally {
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force
        $process.WaitForExit()
    }
}
