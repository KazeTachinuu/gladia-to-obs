# Transcription Server Installer for Windows
# Usage: irm https://your-domain.com/install.ps1 | iex
# Or: powershell -ExecutionPolicy Bypass -File install.ps1

param(
    [string]$Version = "latest",
    [string]$InstallDir = "$env:LOCALAPPDATA\Programs\transcription"
)

$ErrorActionPreference = "Stop"
$BinaryName = "transcription"

function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red; exit 1 }

# Get download URL - UPDATE THIS with your actual hosting
function Get-DownloadUrl {
    param($Platform, $Ver)

    # Option 1: GitHub Releases
    # return "https://github.com/YOUR_USERNAME/transcription/releases/download/v$Ver/transcription-$Platform.exe"

    # Option 2: Direct URL
    # return "https://your-bucket.s3.amazonaws.com/transcription/$Ver/transcription-$Platform.exe"

    # Placeholder - update with your actual URL
    return "https://github.com/YOUR_USERNAME/transcription/releases/latest/download/transcription-$Platform.exe"
}

function Get-Checksum {
    param($FilePath)
    return (Get-FileHash -Path $FilePath -Algorithm SHA256).Hash.ToLower()
}

function Test-Checksum {
    param($FilePath, $Expected)

    if (-not $Expected) {
        Write-Warn "No checksum provided, skipping verification"
        return $true
    }

    $actual = Get-Checksum $FilePath
    if ($actual -ne $Expected.ToLower()) {
        Write-Err "Checksum verification failed!`nExpected: $Expected`nActual: $actual"
        return $false
    }

    Write-Info "Checksum verified"
    return $true
}

function Add-ToPath {
    param($Dir)

    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentPath -notlike "*$Dir*") {
        Write-Info "Adding $Dir to PATH"
        [Environment]::SetEnvironmentVariable(
            "Path",
            "$currentPath;$Dir",
            "User"
        )
        $env:Path = "$env:Path;$Dir"
    }
}

# Main installation
function Install-Transcription {
    Write-Host ""
    Write-Host "Transcription Server Installer" -ForegroundColor Cyan
    Write-Host "===============================" -ForegroundColor Cyan
    Write-Host ""

    $platform = "win-x64"
    Write-Info "Platform: $platform"

    # Create install directory
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }

    $downloadUrl = Get-DownloadUrl -Platform $platform -Ver $Version
    $tempFile = Join-Path $env:TEMP "transcription-download.exe"
    $installPath = Join-Path $InstallDir "$BinaryName.exe"

    Write-Info "Downloading from $downloadUrl"

    try {
        # Use TLS 1.2
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($downloadUrl, $tempFile)
    }
    catch {
        Write-Err "Download failed: $_"
    }

    # Optional: Verify checksum
    # Test-Checksum -FilePath $tempFile -Expected "EXPECTED_SHA256_HERE"

    # Move to install location
    Move-Item -Path $tempFile -Destination $installPath -Force

    Write-Info "Installed to $installPath"

    # Add to PATH
    Add-ToPath -Dir $InstallDir

    Write-Host ""
    Write-Host "Installation complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Run the transcription server:" -ForegroundColor Cyan
    Write-Host "  transcription" -ForegroundColor White
    Write-Host ""
    Write-Host "Then open http://localhost:8080 in your browser" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "NOTE: You may need to restart your terminal for PATH changes to take effect." -ForegroundColor Yellow
}

Install-Transcription
