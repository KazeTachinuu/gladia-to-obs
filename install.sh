#!/bin/bash
set -e

# Transcription Server Installer (macOS/Linux)
# Usage: curl -fsSL https://raw.githubusercontent.com/KazeTachinuu/gladia-to-obs/master/install.sh | bash

REPO="KazeTachinuu/gladia-to-obs"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"
BINARY_NAME="transcription"

# Colors (works on all terminals)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

info() { echo -e "${GREEN}[OK]${NC} $1"; }
step() { echo -e "${CYAN}[..]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[ERROR]${NC} $1" >&2; exit 1; }

# Detect OS and architecture
detect_platform() {
    local os arch

    case "$(uname -s)" in
        Darwin) os="mac" ;;
        Linux) os="linux" ;;
        MINGW*|MSYS*|CYGWIN*)
            fail "Windows detected. Use PowerShell:\n  irm https://raw.githubusercontent.com/$REPO/master/install.ps1 | iex"
            ;;
        *) fail "Unsupported OS: $(uname -s)" ;;
    esac

    case "$(uname -m)" in
        x86_64|amd64) arch="x64" ;;
        arm64|aarch64) arch="arm64" ;;
        *) fail "Unsupported architecture: $(uname -m)" ;;
    esac

    # macOS: use universal binary
    if [ "$os" = "mac" ]; then
        echo "mac-universal"
    else
        echo "${os}-${arch}"
    fi
}

# Download file (curl or wget)
download() {
    local url="$1" output="$2"

    if command -v curl >/dev/null 2>&1; then
        curl -fSL --progress-bar -o "$output" "$url"
    elif command -v wget >/dev/null 2>&1; then
        wget --show-progress -q -O "$output" "$url"
    else
        fail "curl or wget required"
    fi
}

# Download text content
fetch() {
    local url="$1"
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL "$url" 2>/dev/null
    else
        wget -q -O - "$url" 2>/dev/null
    fi
}

# Get latest version from GitHub
get_latest_version() {
    local release_info version
    release_info=$(fetch "https://api.github.com/repos/$REPO/releases/latest")
    version=$(echo "$release_info" | grep -o '"tag_name": *"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
    echo "${version:-unknown}"
}

# Verify SHA256 checksum
verify_checksum() {
    local file="$1" platform="$2"
    local checksums expected actual

    checksums=$(fetch "https://github.com/$REPO/releases/latest/download/checksums.txt") || true
    expected=$(echo "$checksums" | grep "transcription-${platform}" | awk '{print $1}' | head -n 1)

    if [ -z "$expected" ]; then
        warn "Checksums not available, skipping verification"
        return 0
    fi

    # Calculate checksum (shasum on mac, sha256sum on linux)
    if command -v shasum >/dev/null 2>&1; then
        actual=$(shasum -a 256 "$file" | awk '{print $1}')
    elif command -v sha256sum >/dev/null 2>&1; then
        actual=$(sha256sum "$file" | awk '{print $1}')
    else
        warn "No checksum tool available, skipping verification"
        return 0
    fi

    if [ "$actual" != "$expected" ]; then
        fail "Checksum mismatch!\n  Expected: $expected\n  Got:      $actual"
    fi

    info "Checksum verified"
}

# Add to PATH in shell config
setup_path() {
    local install_dir="$1"
    local shell_name shell_config export_line

    # Already in PATH?
    if command -v "$BINARY_NAME" >/dev/null 2>&1; then
        return 0
    fi

    # Detect shell
    shell_name=$(basename "$SHELL")
    case "$shell_name" in
        zsh)  shell_config="$HOME/.zshrc" ;;
        bash)
            [ -f "$HOME/.bashrc" ] && shell_config="$HOME/.bashrc" || shell_config="$HOME/.bash_profile"
            ;;
        fish) shell_config="$HOME/.config/fish/config.fish" ;;
        *)    shell_config="$HOME/.profile" ;;
    esac

    # Check if already configured
    if [ -f "$shell_config" ] && grep -q "$install_dir" "$shell_config" 2>/dev/null; then
        info "PATH already configured in $shell_config"
        echo -e "    ${YELLOW}Restart your terminal to apply${NC}"
        return 0
    fi

    # Add to config
    if [ "$shell_name" = "fish" ]; then
        export_line="set -gx PATH \"$install_dir\" \$PATH"
    else
        export_line="export PATH=\"$install_dir:\$PATH\""
    fi

    mkdir -p "$(dirname "$shell_config")"
    echo "" >> "$shell_config"
    echo "# $BINARY_NAME" >> "$shell_config"
    echo "$export_line" >> "$shell_config"

    info "Added to PATH in $shell_config"
    echo ""
    echo -e "    ${YELLOW}To use now, run:${NC}  source $shell_config"
    echo -e "    ${YELLOW}Or restart your terminal${NC}"
}

main() {
    # Fetch version first
    local version=$(get_latest_version)

    # Header
    clear
    echo ""
    echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════════════════════╗"
    echo -e "║                                                                              ║"
    echo -e "║${NC}   ${BOLD}TRANSCRIPTION${NC} ${DIM}${version}${NC}                                                        ${BOLD}${CYAN}║"
    echo -e "║${NC}   ${DIM}Live captions for OBS / VMix${NC}                                               ${BOLD}${CYAN}║"
    echo -e "║                                                                              ║"
    echo -e "╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    step "Detecting platform..."
    local platform=$(detect_platform)
    info "Platform: $platform"

    step "Creating directory..."
    mkdir -p "$INSTALL_DIR"
    info "Directory: $INSTALL_DIR"

    local url="https://github.com/$REPO/releases/latest/download/transcription-${platform}"
    local tmp_file=$(mktemp)

    step "Downloading..."
    if ! download "$url" "$tmp_file"; then
        rm -f "$tmp_file"
        fail "Download failed"
    fi
    info "Downloaded"

    step "Verifying..."
    verify_checksum "$tmp_file" "$platform"

    step "Installing ${version}..."
    mv "$tmp_file" "$INSTALL_DIR/$BINARY_NAME"
    chmod +x "$INSTALL_DIR/$BINARY_NAME"
    info "Installed ${version} to $INSTALL_DIR/$BINARY_NAME"

    echo ""
    echo -e "${BOLD}──────────────────────────────────────────────────────────────────────────────────${NC}"

    setup_path "$INSTALL_DIR"

    echo ""
    echo -e "${GREEN}${BOLD}Installation complete!${NC}"
    echo ""
    echo -e "${BOLD}NEXT STEPS:${NC}"
    echo -e "  1. Get a free API key at ${CYAN}https://gladia.io${NC}"
    echo -e "  2. Run: ${BOLD}${CYAN}transcription${NC}"
    echo ""
}

main "$@"
