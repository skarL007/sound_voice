# Baixa e verifica o VB-Audio Virtual Cable (donationware) e extrai os instaladores
# para assets/vbcable, de onde o electron-builder os empacota (extraResources ->
# resources/vbcable) e o instalador NSIS os roda no customInstall.
# Os .exe NAO sao versionados (ver .gitignore); este script os busca no build.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dest = Join-Path $root "assets\vbcable"
$url = "https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack45.zip"
$sha = "b950e39f01af1d04ea623c8f6d8eb9b6ea5c477c637295fabf20631c85116bfb"

if ((Test-Path (Join-Path $dest "VBCABLE_Setup_x64.exe")) -and -not $env:VBCABLE_FORCE) {
  Write-Host "VB-Cable ja presente em $dest (defina VBCABLE_FORCE=1 para rebaixar)."
  exit 0
}

$tmp = Join-Path $env:TEMP "vbcable_pack.zip"
$extract = Join-Path $env:TEMP ("vbcable_x_" + [System.Guid]::NewGuid().ToString('N').Substring(0, 8))
Write-Host "Baixando VB-Cable de $url ..."
Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing
$got = (Get-FileHash $tmp -Algorithm SHA256).Hash.ToLower()
if ($got -ne $sha) { throw "SHA-256 do VB-Cable nao confere! esperado=$sha got=$got" }
New-Item -ItemType Directory -Path $extract -Force | Out-Null
Expand-Archive -Path $tmp -DestinationPath $extract -Force
New-Item -ItemType Directory -Path $dest -Force | Out-Null
Copy-Item (Join-Path $extract "VBCABLE_Setup_x64.exe") $dest -Force
Copy-Item (Join-Path $extract "VBCABLE_Setup.exe") $dest -Force
Write-Host "VB-Cable extraido para $dest (SHA OK)."
