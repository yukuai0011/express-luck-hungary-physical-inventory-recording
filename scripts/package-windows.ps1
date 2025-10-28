param(
    [string]$Configuration = "Release"
)

$ErrorActionPreference = 'Stop'

Write-Host "Building Flutter Windows $Configuration..."
flutter config --enable-windows-desktop | Out-Null
flutter pub get | Out-Null
flutter build windows --$Configuration | Out-Null

# Find the Release folder produced by Flutter (supporting multiple Flutter versions)
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$candidates = @(
    Join-Path $projectRoot "build/windows/x64/runner/$Configuration",
    Join-Path $projectRoot "build/windows/runner/$Configuration"
)

$releaseDir = $null
foreach ($c in $candidates) {
    if (Test-Path $c) { $releaseDir = $c; break }
}

if (-not $releaseDir) { throw "Could not locate Windows $Configuration output folder. Looked under: $($candidates -join ', ')" }

# Ensure output directory
$artifactRoot = Join-Path $projectRoot "artifacts"
if (-not (Test-Path $artifactRoot)) { New-Item -ItemType Directory -Path $artifactRoot | Out-Null }

# App name for the archive
$appName = "express_luck_inventory"
$zipPath = Join-Path $artifactRoot "$appName-windows-$Configuration.zip"

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Write-Host "Packaging Windows $Configuration from: $releaseDir"
# Zip the entire folder contents so all DLLs (flutter_windows.dll, icudtl.dat, plugins, connectivity_plus, etc.) are included
Compress-Archive -Path (Join-Path $releaseDir '*') -DestinationPath $zipPath -Force

Write-Host "Created: $zipPath"
