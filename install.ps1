# Transcription Server Installer for Windows
# Usage: irm https://raw.githubusercontent.com/KazeTachinuu/gladia-to-obs/master/install.ps1 | iex

param(
    [string]$InstallDir = "$env:LOCALAPPDATA\Programs\transcription"
)

$ErrorActionPreference = "Stop"
$Repo = "KazeTachinuu/gladia-to-obs"
$BinaryName = "transcription"

function Show-Header {
    param($Version)
    Clear-Host
    Write-Host ""
    Write-Host "+------------------------------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "|                                                                              |" -ForegroundColor Cyan
    Write-Host "|   " -ForegroundColor Cyan -NoNewline
    Write-Host "TRANSCRIPTION" -ForegroundColor Magenta -NoNewline
    Write-Host " $Version" -ForegroundColor DarkGray -NoNewline
    Write-Host "                                                    |" -ForegroundColor Cyan
    Write-Host "|   " -ForegroundColor Cyan -NoNewline
    Write-Host "Live captions for OBS / VMix" -ForegroundColor DarkGray -NoNewline
    Write-Host "                                              |" -ForegroundColor Cyan
    Write-Host "|                                                                              |" -ForegroundColor Cyan
    Write-Host "+------------------------------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step { param($msg) Write-Host "[..]" -ForegroundColor Cyan -NoNewline; Write-Host " $msg" }
function Write-Ok { param($msg) Write-Host "[OK]" -ForegroundColor Green -NoNewline; Write-Host " $msg" }
function Write-Warn { param($msg) Write-Host "[!]" -ForegroundColor Yellow -NoNewline; Write-Host " $msg" }
function Write-Fail { param($msg) Write-Host "[ERROR]" -ForegroundColor Red -NoNewline; Write-Host " $msg"; exit 1 }

function Get-LatestVersion {
    try {
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -UseBasicParsing
        return $release.tag_name
    }
    catch {
        return "unknown"
    }
}

function Get-DownloadUrl {
    param($Platform)
    return "https://github.com/$Repo/releases/latest/download/transcription-$Platform.exe"
}

function Get-ChecksumsUrl {
    return "https://github.com/$Repo/releases/latest/download/checksums.txt"
}

function Test-Checksum {
    param($FilePath, $Platform)

    try {
        Write-Step "Downloading checksums..."
        $checksumsUrl = Get-ChecksumsUrl
        $checksums = (Invoke-WebRequest -Uri $checksumsUrl -UseBasicParsing).Content

        # Find the checksum for our platform (includes .exe extension)
        $pattern = "([a-f0-9]{64})\s+transcription-$Platform\.exe"
        if ($checksums -match $pattern) {
            $expected = $Matches[1]

            $actual = (Get-FileHash -Path $FilePath -Algorithm SHA256).Hash.ToLower()

            if ($actual -ne $expected) {
                Write-Fail "Checksum verification failed. The file may be corrupted."
                return $false
            }

            Write-Ok "File integrity verified"
            return $true
        }
        else {
            Write-Warn "Checksums not available, skipping verification"
            return $true
        }
    }
    catch {
        Write-Warn "Could not verify checksum: $_"
        return $true
    }
}

function Add-ToPath {
    param($Dir)

    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentPath -notlike "*$Dir*") {
        Write-Step "Adding to PATH..."
        [Environment]::SetEnvironmentVariable(
            "Path",
            "$Dir;$currentPath",
            "User"
        )
        $env:Path = "$Dir;$env:Path"
        Write-Ok "Added to PATH: $Dir"
        Write-Host ""
        Write-Host "[!] " -ForegroundColor Yellow -NoNewline
        Write-Host "Restart your terminal for PATH changes to take effect."
    } else {
        Write-Ok "Already in PATH"
    }
}

# Main installation
function Install-Transcription {
    $version = Get-LatestVersion
    Show-Header -Version $version

    Write-Step "Detecting platform..."
    # Windows ARM64 runs x64 binaries via emulation (Bun doesn't support win-arm64 yet)
    $platform = "win-x64"
    Write-Ok "Platform: $platform"

    # Create install directory
    Write-Step "Creating install directory..."
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }
    Write-Ok "Directory: $InstallDir"

    $downloadUrl = Get-DownloadUrl -Platform $platform
    $tempFile = Join-Path $env:TEMP "transcription-download.exe"
    $installPath = Join-Path $InstallDir "$BinaryName.exe"

    Write-Step "Downloading Transcription..."

    try {
        # Use TLS 1.2
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

        # Download with progress bar visible
        Invoke-WebRequest -Uri $downloadUrl -OutFile $tempFile -UseBasicParsing
    }
    catch {
        Write-Fail "Download failed. Please check your internet connection."
    }

    Write-Ok "Download complete"

    # Verify checksum
    Write-Step "Verifying integrity..."
    $null = Test-Checksum -FilePath $tempFile -Platform $platform

    # Move to install location
    Write-Step "Installing $version..."
    Move-Item -Path $tempFile -Destination $installPath -Force
    Write-Ok "Installed $version to $installPath"

    Write-Host ""
    Write-Host "------------------------------------------------------------------------------" -ForegroundColor White

    # Add to PATH
    Add-ToPath -Dir $InstallDir

    Write-Host ""
    Write-Host "[OK] Installation complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "------------------------------------------------------------------------------" -ForegroundColor White
    Write-Host "NEXT STEPS" -ForegroundColor White
    Write-Host "------------------------------------------------------------------------------" -ForegroundColor White
    Write-Host ""
    Write-Host "   1. Get a free API key at https://gladia.io"
    Write-Host ""
    Write-Host "   2. Start the server with this command:"
    Write-Host ""
    Write-Host "      transcription" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   3. A web page will open automatically for configuration"
    Write-Host ""
    Write-Host "------------------------------------------------------------------------------" -ForegroundColor DarkGray
}

Install-Transcription
