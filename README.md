# Transcription

Live captions overlay for OBS and VMix using the Gladia API.

![Version](https://img.shields.io/badge/version-3.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)


## Installation

### macOS / Linux

Open a Terminal and paste this command:

```bash
curl -fsSL https://raw.githubusercontent.com/KazeTachinuu/gladia-to-obs/master/install.sh | bash
```

### Windows

Open PowerShell and paste this command:

```powershell
irm https://raw.githubusercontent.com/KazeTachinuu/gladia-to-obs/master/install.ps1 | iex
```


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


## Advanced Settings

| Setting | Description |
|---------|-------------|
| **Language** | Primary transcription language |
| **Silence Detection** | Delay before cutting a segment after silence (0.01-2s) |
| **Max Duration** | Maximum segment length before automatic cut (5-60s) |


## Supported Languages

English, French, Spanish, German, Italian, Portuguese, Japanese, Chinese, Korean, Arabic


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
