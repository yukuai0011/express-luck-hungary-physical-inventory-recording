param(
    [string]$Configuration = "Release"
)

$ErrorActionPreference = 'Stop'

Write-Host "Building Flutter Windows $Configuration..."
flutter config --enable-windows-desktop | Out-Null
flutter pub get | Out-Null
# Normalize build mode for flutter CLI
$buildMode = $Configuration.ToLower()
switch ($buildMode) {
    'release' { $configFolder = 'Release' }
    'profile' { $configFolder = 'Profile' }
    'debug'   { $configFolder = 'Debug' }
    default   { $configFolder = 'Release'; $buildMode = 'release' }
}

flutter build windows --$buildMode | Out-Null

# Find the Release folder produced by Flutter (supporting multiple Flutter versions/architectures)
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$candidate1 = Join-Path $projectRoot "build/windows/x64/runner/$configFolder"
$candidate2 = Join-Path $projectRoot "build/windows/arm64/runner/$configFolder"
$candidate3 = Join-Path $projectRoot "build/windows/runner/$configFolder"
$candidates = @($candidate1, $candidate2, $candidate3)

$releaseDir = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

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
