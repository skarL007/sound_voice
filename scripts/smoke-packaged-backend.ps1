param(
    [int]$Port = 9472
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendExe = Join-Path $repoRoot "python_dist\voicelaunch-backend\voicelaunch-backend.exe"

function Get-ListeningProcessId {
    param(
        [int]$TargetPort
    )

    $pattern = "^\s*TCP\s+\S+:$TargetPort\s+\S+\s+LISTENING\s+(\d+)\s*$"
    $match = netstat -ano -p tcp |
        ForEach-Object {
            if ($_ -match $pattern) {
                [int]$matches[1]
            }
        } |
        Select-Object -First 1

    if ($null -eq $match) {
        return $null
    }

    return $match
}

$existingProcessId = Get-ListeningProcessId -TargetPort $Port
if ($null -ne $existingProcessId) {
    throw "Port $Port is already in use by PID $existingProcessId."
}

if (-not (Test-Path $backendExe)) {
    throw "Backend executable not found: $backendExe"
}

$process = $null

try {
    $process = Start-Process -FilePath $backendExe -ArgumentList @("--host", "127.0.0.1", "--port", "$Port") -PassThru

    $healthUri = "http://127.0.0.1:$Port/health"
    $modelsUri = "http://127.0.0.1:$Port/models"
    $installDepsUri = "http://127.0.0.1:$Port/models/install-deps"
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

    $listeningProcessId = Get-ListeningProcessId -TargetPort $Port
    if ($listeningProcessId -ne $process.Id) {
        throw "Port $Port is served by PID $listeningProcessId, but started backend PID is $($process.Id)."
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

    $installDepsResponse = Invoke-RestMethod -Method Post -Uri $installDepsUri -TimeoutSec 5 -ContentType "application/json" -Body '{"modelId":"xtts_v2"}'
    if ($installDepsResponse.success -ne $false) {
        throw "Expected install-deps to be blocked in packaged runtime: $($installDepsResponse | ConvertTo-Json -Compress)"
    }

    $installDepsError = [string]$installDepsResponse.error
    if (($installDepsError -notlike "*packaged beta backend*") -or ($installDepsError -notlike "*Piper and Kokoro*")) {
        throw "Unexpected install-deps error payload: $($installDepsResponse | ConvertTo-Json -Compress)"
    }

    Write-Host "Health OK:" ($health | ConvertTo-Json -Compress)
    Write-Host "Models OK:" (($modelIds -join ", "))
    Write-Host "Install-deps blocked:" ($installDepsResponse | ConvertTo-Json -Compress)
} finally {
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force
        $process.WaitForExit()
    }
}
