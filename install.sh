#!/bin/bash
set -e

# Transcription Server Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/KazeTachinuu/gladia-to-obs/master/install.sh | bash

REPO="KazeTachinuu/gladia-to-obs"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"
BINARY_NAME="transcription"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Clear screen and show header
clear
echo ""
echo -e "${BOLD}${CYAN}+------------------------------------------------------------------------------+${NC}"
echo -e "${BOLD}${CYAN}|${NC}                                                                              ${BOLD}${CYAN}|${NC}"
echo -e "${BOLD}${CYAN}|${NC}   ${BOLD}TRANSCRIPTION - Installer${NC}                                                 ${BOLD}${CYAN}|${NC}"
echo -e "${BOLD}${CYAN}|${NC}   ${DIM}Live captions for OBS / VMix${NC}                                              ${BOLD}${CYAN}|${NC}"
echo -e "${BOLD}${CYAN}|${NC}                                                                              ${BOLD}${CYAN}|${NC}"
echo -e "${BOLD}${CYAN}+------------------------------------------------------------------------------+${NC}"
echo ""

# Helper functions
info() { echo -e "${GREEN}[OK]${NC} $1"; }
step() { echo -e "${CYAN}[..]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[ERROR]${NC} $1" >&2; exit 1; }

# Detect platform
detect_platform() {
    local os arch

    case "$(uname -s)" in
        Darwin) os="mac" ;;
        Linux) os="linux" ;;
        MINGW*|MSYS*|CYGWIN*)
            echo ""
            fail "Windows detected. Please use PowerShell instead:"
            echo ""
            echo "  irm https://raw.githubusercontent.com/$REPO/master/install.ps1 | iex"
            echo ""
            exit 1
            ;;
        *) fail "Unsupported OS: $(uname -s)" ;;
    esac

    case "$(uname -m)" in
        x86_64|amd64) arch="x64" ;;
        arm64|aarch64) arch="arm64" ;;
        *) fail "Unsupported architecture: $(uname -m)" ;;
    esac

    # macOS - prefer universal binary
    if [ "$os" = "mac" ]; then
        echo "mac-universal"
    else
        echo "${os}-${arch}"
    fi
}

# Check for curl or wget
check_downloader() {
    if command -v curl >/dev/null 2>&1; then
        echo "curl"
    elif command -v wget >/dev/null 2>&1; then
        echo "wget"
    else
        fail "curl or wget is required but not installed"
    fi
}

# Download function (with progress bar)
download() {
    local url="$1" output="$2" downloader="$3"

    if [ "$downloader" = "curl" ]; then
        curl -fL --progress-bar -o "$output" "$url"
    else
        wget --show-progress -O "$output" "$url"
    fi
}

# Get latest release URL from GitHub
get_download_url() {
    local platform="$1"
    echo "https://github.com/$REPO/releases/latest/download/transcription-${platform}"
}

# Verify checksum
verify_checksum() {
    local file="$1" checksums_url="$2" platform="$3" downloader="$4"
    local expected actual

    # Download checksums file
    if [ "$downloader" = "curl" ]; then
        expected=$(curl -fsSL "$checksums_url" 2>/dev/null | grep "transcription-${platform}$" | cut -d' ' -f1)
    else
        expected=$(wget -q -O - "$checksums_url" 2>/dev/null | grep "transcription-${platform}$" | cut -d' ' -f1)
    fi

    if [ -z "$expected" ]; then
        warn "Checksums not available, skipping verification"
        return 0
    fi

    # Calculate actual checksum
    if command -v sha256sum >/dev/null 2>&1; then
        actual=$(sha256sum "$file" | cut -d' ' -f1)
    elif command -v shasum >/dev/null 2>&1; then
        actual=$(shasum -a 256 "$file" | cut -d' ' -f1)
    else
        warn "sha256sum not available, skipping verification"
        return 0
    fi

    if [ "$actual" != "$expected" ]; then
        fail "Checksum verification failed. The file may be corrupted."
    fi

    info "File integrity verified"
}

# Add to shell config
setup_path() {
    local install_dir="$1"
    local shell_config=""
    local added=false

    # Detect shell config file
    if [ -n "$ZSH_VERSION" ] || [ "$SHELL" = "/bin/zsh" ]; then
        shell_config="$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ] || [ "$SHELL" = "/bin/bash" ]; then
        if [ -f "$HOME/.bashrc" ]; then
            shell_config="$HOME/.bashrc"
        elif [ -f "$HOME/.bash_profile" ]; then
            shell_config="$HOME/.bash_profile"
        fi
    fi

    # Check if already in PATH
    if [[ ":$PATH:" == *":$install_dir:"* ]]; then
        return 0
    fi

    # Add to config if possible
    if [ -n "$shell_config" ] && [ -f "$shell_config" ]; then
        if ! grep -q "$install_dir" "$shell_config" 2>/dev/null; then
            echo "" >> "$shell_config"
            echo "# Transcription" >> "$shell_config"
            echo "export PATH=\"\$PATH:$install_dir\"" >> "$shell_config"
            added=true
        fi
    fi

    if [ "$added" = true ]; then
        info "PATH updated in $shell_config"
        echo ""
        echo -e "${YELLOW}[!]${NC} To use the command immediately, run:"
        echo ""
        echo -e "    ${BOLD}source $shell_config${NC}"
        echo ""
    else
        warn "$install_dir is not in your PATH"
        echo ""
        echo "    Add this line to your shell config file:"
        echo ""
        echo -e "    ${BOLD}export PATH=\"\$PATH:$install_dir\"${NC}"
        echo ""
    fi
}

# Main installation
main() {
    step "Checking dependencies..."
    local downloader=$(check_downloader)
    info "Using $downloader"

    step "Detecting platform..."
    local platform=$(detect_platform)
    info "Platform: $platform"

    step "Creating install directory..."
    mkdir -p "$INSTALL_DIR"
    info "Directory: $INSTALL_DIR"

    local download_url=$(get_download_url "$platform")
    local checksums_url="https://github.com/$REPO/releases/latest/download/checksums.txt"
    local tmp_file=$(mktemp)

    step "Downloading Transcription..."
    if ! download "$download_url" "$tmp_file" "$downloader"; then
        rm -f "$tmp_file"
        fail "Download failed. Please check your internet connection."
    fi
    info "Download complete"

    step "Verifying integrity..."
    verify_checksum "$tmp_file" "$checksums_url" "$platform" "$downloader"

    step "Installing..."
    local install_path="$INSTALL_DIR/$BINARY_NAME"
    mv "$tmp_file" "$install_path"
    chmod +x "$install_path"
    info "Installed to $install_path"

    echo ""
    echo -e "${BOLD}------------------------------------------------------------------------------${NC}"
    echo ""

    # Setup PATH
    setup_path "$INSTALL_DIR"

    # Success message
    echo -e "${BOLD}${GREEN}[OK] Installation complete!${NC}"
    echo ""
    echo -e "${BOLD}------------------------------------------------------------------------------${NC}"
    echo -e "${BOLD}NEXT STEPS${NC}"
    echo -e "${BOLD}------------------------------------------------------------------------------${NC}"
    echo ""
    echo "   1. Get a free API key at https://gladia.io"
    echo ""
    echo "   2. Start the server with this command:"
    echo ""
    echo -e "      ${BOLD}${CYAN}transcription${NC}"
    echo ""
    echo "   3. A web page will open automatically for configuration"
    echo ""
    echo -e "${DIM}------------------------------------------------------------------------------${NC}"
}

main "$@"
