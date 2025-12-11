# Transcription

Live transcription overlay for OBS/VMix using the Gladia API.

![Version](https://img.shields.io/badge/version-3.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- Real-time speech-to-text transcription
- Netflix-style captions overlay (1920x1080)
- Works with OBS, VMix, or any browser source
- 10+ language support
- Configurable silence detection and segment duration
- Single binary - no dependencies

## Installation

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/KazeTachinuu/gladia-to-obs/master/install.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/KazeTachinuu/gladia-to-obs/master/install.ps1 | iex
```

## Usage

1. Get a free API key from [Gladia](https://gladia.io)
2. Run `transcription` in your terminal
3. Enter your API key and click **Start**
4. Add `http://localhost:8080/overlay` as a Browser Source in OBS (1920x1080)

## OBS Setup

1. Add a **Browser Source** to your scene
2. Set the URL to `http://localhost:8080/overlay`
3. Set dimensions to **1920x1080**
4. Enable **Shutdown source when not visible** (optional)

The overlay has a transparent background, so captions appear directly over your content.

## Configuration

| Setting | Description |
|---------|-------------|
| **Language** | Primary transcription language |
| **Silence Detection** | How quickly to end a segment after silence (0.01-2s) |
| **Max Duration** | Maximum segment length before forcing a break (5-60s) |

## Supported Languages

English, French, Spanish, German, Italian, Portuguese, Japanese, Chinese, Korean, Arabic

## Requirements

- Gladia API key (free tier available)
- Microphone
- Modern browser (for the dashboard)

## Development

```bash
# Run in development mode
bun run dev

# Build for current platform
bun run build

# Build all platforms
bun run build:all
```

## License

MIT
