#!/bin/bash
set -e

# Transcription Server Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/KazeTachinuu/gladia-to-obs/master/install.sh | bash

VERSION="${1:-latest}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"
BINARY_NAME="transcription"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; exit 1; }

# Detect platform
detect_platform() {
    local os arch platform

    case "$(uname -s)" in
        Darwin) os="mac" ;;
        Linux) os="linux" ;;
        MINGW*|MSYS*|CYGWIN*) os="win" ;;
        *) error "Unsupported OS: $(uname -s)" ;;
    esac

    case "$(uname -m)" in
        x86_64|amd64) arch="x64" ;;
        arm64|aarch64) arch="arm64" ;;
        *) error "Unsupported architecture: $(uname -m)" ;;
    esac

    # Windows only supports x64
    if [ "$os" = "win" ]; then
        platform="win-x64"
    # macOS - prefer universal binary
    elif [ "$os" = "mac" ]; then
        platform="mac-universal"
    else
        platform="${os}-${arch}"
    fi

    echo "$platform"
}

# Check for required tools
check_deps() {
    if command -v curl >/dev/null 2>&1; then
        DOWNLOADER="curl"
    elif command -v wget >/dev/null 2>&1; then
        DOWNLOADER="wget"
    else
        error "curl or wget is required"
    fi
}

# Download function
download() {
    local url="$1" output="$2"

    info "Downloading from $url"

    if [ "$DOWNLOADER" = "curl" ]; then
        curl -fsSL ${output:+-o "$output"} "$url"
    else
        wget -q ${output:+-O "$output"} "$url"
    fi
}

get_download_url() {
    local platform="$1"
    local version="$2"
    local ext=""

    [ "$platform" = "win-x64" ] && ext=".exe"

    echo "https://github.com/KazeTachinuu/gladia-to-obs/releases/latest/download/transcription-${platform}${ext}"
}

# Verify checksum (optional but recommended)
verify_checksum() {
    local file="$1"
    local expected="$2"
    local actual

    if [ -z "$expected" ]; then
        warn "No checksum provided, skipping verification"
        return 0
    fi

    if command -v sha256sum >/dev/null 2>&1; then
        actual=$(sha256sum "$file" | cut -d' ' -f1)
    elif command -v shasum >/dev/null 2>&1; then
        actual=$(shasum -a 256 "$file" | cut -d' ' -f1)
    else
        warn "sha256sum/shasum not found, skipping verification"
        return 0
    fi

    if [ "$actual" != "$expected" ]; then
        error "Checksum verification failed!\nExpected: $expected\nActual: $actual"
    fi

    info "Checksum verified"
}

# Main installation
main() {
    info "Transcription Server Installer"
    echo ""

    check_deps

    local platform=$(detect_platform)
    info "Detected platform: $platform"

    # Create install directory
    mkdir -p "$INSTALL_DIR"

    local download_url=$(get_download_url "$platform" "$VERSION")
    local tmp_file=$(mktemp)
    local ext=""
    [ "$platform" = "win-x64" ] && ext=".exe"

    # Download binary
    if ! download "$download_url" "$tmp_file"; then
        rm -f "$tmp_file"
        error "Download failed"
    fi

    # Optional: Verify checksum
    # verify_checksum "$tmp_file" "EXPECTED_SHA256_HERE"

    # Install binary
    local install_path="$INSTALL_DIR/${BINARY_NAME}${ext}"
    mv "$tmp_file" "$install_path"
    chmod +x "$install_path"

    info "Installed to $install_path"

    # Check if install dir is in PATH
    if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
        warn "$INSTALL_DIR is not in your PATH"
        echo ""
        echo "Add this to your shell config (~/.bashrc, ~/.zshrc, etc.):"
        echo ""
        echo "  export PATH=\"\$PATH:$INSTALL_DIR\""
        echo ""
    fi

    echo ""
    echo -e "${GREEN}Installation complete!${NC}"
    echo ""
    echo "Run the transcription server:"
    echo "  $BINARY_NAME"
    echo ""
    echo "Then open http://localhost:8080 in your browser"
}

main "$@"
