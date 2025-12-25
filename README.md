# Gladia Live Transcription for OBS

Live captions overlay for OBS using the Gladia API.

![Version](https://img.shields.io/badge/version-3.7.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)


## Installation

### Option 1: Install via script (easiest)

#### macOS / Linux

Open a Terminal and paste this command:

```bash
curl -fsSL https://raw.githubusercontent.com/KazeTachinuu/gladia-to-obs/master/install.sh | bash
```

#### Windows

Open PowerShell and paste this command:

```powershell
irm https://raw.githubusercontent.com/KazeTachinuu/gladia-to-obs/master/install.ps1 | iex
```

### Option 2: Manual download

1. Go to the [Releases page](https://github.com/KazeTachinuu/gladia-to-obs/releases/latest)
2. Download the file for your system:
   - **macOS**: `transcription-mac-universal`
   - **Windows**: `transcription-windows-x64.exe`
   - **Linux**: `transcription-linux-x64`
3. **macOS only**: Remove the quarantine attribute (required for downloaded files):
   ```bash
   xattr -cr ~/Downloads/transcription-mac-universal
   ```
4. Make it executable and run (macOS/Linux: `chmod +x <file>` first)


## Usage Guide

### Step 1: Get a Gladia API Key (free)

1. Go to **[gladia.io](https://gladia.io)**
2. Create a free account
3. Copy your API key from the dashboard


### Step 2: Start the server

Open a Terminal (or PowerShell on Windows) and type:

```
transcription
```

A web page will open automatically in your browser.


### Step 3: Configure transcription

On the web page that opened:

1. **Paste your API key** in the "API Key" field
2. **Select your language** from the dropdown
3. **Click "Start"** to begin transcription

You should see text appearing in the "Preview" area.


### Step 4: Add captions to OBS

1. In OBS, click **"+" in Sources**
2. Select **"Browser"** (or "Browser Source")
3. Give it a name (e.g., "Captions")
4. In the settings:
   - **URL**: `http://localhost:8080/overlay`
   - **Width**: `1920`
   - **Height**: `1080`
5. Click **OK**

Captions will appear at the bottom of your screen with a transparent background.


### To stop the server

In the Terminal, press **CTRL + C**.


## Settings

### Transcription

| Setting | Description |
|---------|-------------|
| **Language** | Spoken language (or auto-detect) |
| **Translate to** | Optionally translate captions to another language |
| **Custom Vocabulary** | Names, brands, or technical terms to improve recognition |

### Display

| Setting | Description |
|---------|-------------|
| **Position** | Where captions appear on screen (X/Y) |
| **Size** | Font size (24–80px) |
| **Style** | Outline (Netflix-style) or background box |

### Advanced

| Setting | Description |
|---------|-------------|
| **Response speed** | How fast captions appear after speech (lower = faster) |
| **Max segment** | Maximum caption length before line break (5–20s) |


## Development

```bash
# Development mode
bun run dev

# Build for current platform
bun run build

# Build for all platforms
bun run build:all
```


## License

MIT
