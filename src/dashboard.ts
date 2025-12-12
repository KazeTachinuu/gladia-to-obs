import { AUDIO_PROCESSOR } from "./audio-processor";
import { env } from "./env";

export const DASHBOARD = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live Transcription</title>
  <style>
    /* =========================================================================
       DESIGN TOKENS (shadcn/ui dark theme)
       ========================================================================= */
    :root {
      --background: hsl(240 10% 3.9%);
      --foreground: hsl(0 0% 98%);
      --card: hsl(240 10% 3.9%);
      --card-foreground: hsl(0 0% 98%);
      --primary: hsl(0 0% 98%);
      --primary-foreground: hsl(240 5.9% 10%);
      --secondary: hsl(240 3.7% 15.9%);
      --secondary-foreground: hsl(0 0% 98%);
      --muted: hsl(240 3.7% 15.9%);
      --muted-foreground: hsl(240 5% 64.9%);
      --destructive: hsl(0 62.8% 30.6%);
      --border: hsl(240 3.7% 15.9%);
      --ring: hsl(240 4.9% 83.9%);
      --radius: 6px;
      color-scheme: dark;
    }

    /* =========================================================================
       RESET & BASE
       ========================================================================= */
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      background: var(--background);
      color: var(--foreground);
      min-height: 100vh;
    }

    a { color: inherit; }
    a:hover { color: var(--foreground); }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: hsl(240 3.7% 25%); border-radius: 4px; }

    /* =========================================================================
       LAYOUT
       ========================================================================= */
    .header {
      position: sticky;
      top: 0;
      z-index: 50;
      border-bottom: 1px solid var(--border);
      background: hsl(240 10% 3.9% / 0.95);
      backdrop-filter: blur(8px);
    }

    .header-inner {
      max-width: 900px;
      margin: 0 auto;
      padding: 0 24px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 600;
    }

    .main {
      max-width: 900px;
      margin: 0 auto;
      padding: 32px 24px;
    }

    .grid {
      display: grid;
      gap: 24px;
    }

    @media (min-width: 768px) {
      .grid { grid-template-columns: 1fr 320px; }
    }

    .stack { display: flex; flex-direction: column; gap: 24px; }
    .row { display: flex; gap: 16px; }
    .row > * { flex: 1; }

    /* =========================================================================
       COMPONENTS: Card
       ========================================================================= */
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 24px;
    }

    .card-sm { padding: 20px; }

    .card-title {
      font-weight: 500;
      margin-bottom: 16px;
    }

    /* =========================================================================
       COMPONENTS: Form Elements
       ========================================================================= */
    .label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .label-muted {
      font-size: 12px;
      font-weight: 400;
      color: var(--muted-foreground);
    }

    .input, .select, .textarea {
      width: 100%;
      height: 40px;
      padding: 0 12px;
      font-size: 14px;
      color: var(--foreground);
      background: var(--secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .input:focus, .select:focus, .textarea:focus {
      outline: none;
      border-color: var(--ring);
      box-shadow: 0 0 0 2px hsl(240 4.9% 83.9% / 0.2);
    }

    .input::placeholder { color: var(--muted-foreground); }

    .textarea {
      height: auto;
      padding: 10px 12px;
      resize: none;
      font-family: inherit;
    }

    .select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
    }

    .input-group {
      position: relative;
    }

    .input-group .input { padding-right: 40px; }

    .input-icon {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--muted-foreground);
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
    }

    .input-icon:hover { color: var(--foreground); }

    /* Range slider */
    input[type="range"] {
      -webkit-appearance: none;
      width: 100%;
      height: 8px;
      background: var(--secondary);
      border-radius: 4px;
      cursor: pointer;
    }

    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      background: var(--primary);
      border-radius: 50%;
      cursor: grab;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      transition: transform 0.1s;
    }

    input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.1); }
    input[type="range"]::-webkit-slider-thumb:active { cursor: grabbing; }

    /* =========================================================================
       COMPONENTS: Button
       ========================================================================= */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 40px;
      padding: 0 16px;
      font-size: 14px;
      font-weight: 500;
      border: none;
      border-radius: var(--radius);
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
    }

    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-primary {
      background: var(--primary);
      color: var(--primary-foreground);
    }
    .btn-primary:hover:not(:disabled) { background: hsl(0 0% 90%); }

    .btn-secondary {
      background: var(--secondary);
      color: var(--secondary-foreground);
    }
    .btn-secondary:hover:not(:disabled) { background: hsl(240 3.7% 20%); }

    .btn-destructive {
      background: var(--destructive);
      color: var(--foreground);
    }
    .btn-destructive:hover:not(:disabled) { background: hsl(0 62.8% 25%); }

    .btn-lg { height: 48px; font-size: 16px; }
    .btn-block { width: 100%; }

    /* =========================================================================
       COMPONENTS: Badge
       ========================================================================= */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 500;
      background: var(--secondary);
      border-radius: 9999px;
    }

    /* Status dot */
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .dot-idle { background: var(--muted-foreground); }
    .dot-live { background: hsl(142 76% 36%); animation: pulse 2s infinite; }
    .dot-error { background: hsl(0 84% 60%); }
    .dot-wait { background: hsl(48 96% 53%); animation: pulse 2s infinite; }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* =========================================================================
       COMPONENTS: Code
       ========================================================================= */
    .code {
      flex: 1;
      padding: 10px 12px;
      font-family: ui-monospace, monospace;
      font-size: 13px;
      background: var(--secondary);
      border-radius: var(--radius);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* =========================================================================
       COMPONENTS: Details/Summary (Accordion)
       ========================================================================= */
    details { border-radius: 8px; }

    details summary {
      padding: 20px;
      font-weight: 500;
      cursor: pointer;
      list-style: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: 8px;
      transition: background 0.15s;
    }

    details summary:hover { background: hsl(240 3.7% 15.9% / 0.5); }
    details summary::-webkit-details-marker { display: none; }

    details[open] summary .chevron { transform: rotate(180deg); }

    details .content {
      padding: 0 20px 20px;
    }

    .chevron {
      color: var(--muted-foreground);
      transition: transform 0.2s;
    }

    /* =========================================================================
       COMPONENTS: Toast
       ========================================================================= */
    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 16px;
      font-size: 14px;
      background: var(--secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s;
    }

    .toast.visible {
      opacity: 1;
      visibility: visible;
    }

    /* =========================================================================
       CUSTOM: Position Picker
       ========================================================================= */
    .position-picker {
      position: relative;
      aspect-ratio: 16/9;
      background: var(--secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      cursor: crosshair;
      overflow: hidden;
      margin-bottom: 20px;
    }

    .position-handle {
      position: absolute;
      transform: translate(-50%, -50%);
    }

    .position-label {
      background: var(--foreground);
      color: var(--background);
      font-size: 12px;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: 4px;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    /* =========================================================================
       CUSTOM: Preview
       ========================================================================= */
    .preview {
      min-height: 100px;
      padding: 16px;
      background: hsl(240 3.7% 15.9% / 0.5);
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: var(--muted-foreground);
    }

    .preview.active { color: var(--foreground); }

    .preview .error {
      color: hsl(0 84% 60%);
    }

    .preview .error small {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      opacity: 0.7;
    }

    /* =========================================================================
       CUSTOM: Restart Feedback Banner
       ========================================================================= */
    .feedback {
      display: none;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      margin-top: 12px;
      font-size: 13px;
      background: hsl(45 93% 47% / 0.15);
      color: hsl(45 93% 58%);
      border-radius: var(--radius);
    }

    .feedback.visible { display: flex; }

    .feedback-btn {
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 500;
      background: hsl(45 93% 47%);
      color: hsl(0 0% 0%);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      white-space: nowrap;
    }

    .feedback-btn:hover { opacity: 0.9; }

    /* =========================================================================
       CUSTOM: Slider with Value
       ========================================================================= */
    .slider-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .slider-value {
      font-family: ui-monospace, monospace;
      font-size: 12px;
    }

    .slider-hint {
      font-size: 12px;
      color: var(--muted-foreground);
      margin-top: 4px;
    }

    .slider-group { margin-bottom: 20px; }
    .slider-group:last-child { margin-bottom: 0; }

    /* =========================================================================
       UTILITIES
       ========================================================================= */
    .hidden { display: none !important; }
    .mt-4 { margin-top: 16px; }
    .mt-6 { margin-top: 24px; }
    .mb-4 { margin-bottom: 16px; }
    .gap-8 { gap: 8px; }
    .gap-12 { gap: 12px; }
    .text-xs { font-size: 12px; }
    .text-muted { color: var(--muted-foreground); }
    .font-mono { font-family: ui-monospace, monospace; }
  </style>
</head>
<body>
  <!-- Header -->
  <header class="header">
    <div class="header-inner">
      <div class="logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
        </svg>
        <span>Live Transcription</span>
      </div>
      <div class="badge">
        <span id="dot" class="dot dot-idle"></span>
        <span id="status-text">Ready</span>
      </div>
    </div>
  </header>

  <!-- Main -->
  <main class="main">
    <div class="grid">
      <!-- Left Column -->
      <div class="stack">
        <!-- Controls -->
        <div class="card">
          <div class="row">
            <div>
              <label class="label">Audio Source</label>
              <select id="audio-source" class="select"><option>Loading...</option></select>
            </div>
            <div>
              <label class="label">Language</label>
              <select id="lang" class="select">
                <option value="fr">French</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="ja">Japanese</option>
                <option value="zh">Chinese</option>
                <option value="ko">Korean</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
          </div>

          <div class="mt-4">
            <label class="label">Translate to <span class="label-muted">(optional)</span></label>
            <select id="translate-to" class="select">
              <option value="">No translation</option>
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="ja">Japanese</option>
              <option value="zh">Chinese</option>
              <option value="ko">Korean</option>
              <option value="ar">Arabic</option>
            </select>
          </div>

          <button id="btn" class="btn btn-primary btn-lg btn-block mt-6">
            <svg id="icon-play" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            <svg id="icon-stop" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="hidden"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
            <span id="btn-text">Start Transcription</span>
          </button>

          <div id="feedback" class="feedback">
            <span id="feedback-text"></span>
            <button id="restart-btn" class="feedback-btn">Restart now</button>
          </div>
        </div>

        <!-- Preview -->
        <div class="card">
          <div class="slider-header">
            <span class="card-title" style="margin:0">Live Preview</span>
            <span id="stats" class="text-xs font-mono">00:00</span>
          </div>
          <div id="preview" class="preview">Click "Start Transcription" to begin</div>
        </div>

        <!-- OBS Setup -->
        <div class="card">
          <div class="card-title">OBS Browser Source</div>
          <div class="stack gap-12">
            <div>
              <label class="label-muted mb-4">This computer</label>
              <div class="row gap-8">
                <code class="code">http://localhost:${env.PORT}/overlay</code>
                <button id="copy-local" class="btn btn-secondary">Copy</button>
              </div>
            </div>
            <div>
              <label class="label-muted mb-4">Network <span class="text-muted">(same WiFi)</span></label>
              <div class="row gap-8">
                <code id="network-url" class="code">Detecting...</code>
                <button id="copy-network" class="btn btn-secondary">Copy</button>
              </div>
            </div>
          </div>
          <p class="text-xs text-muted mt-4">Set resolution to 1920×1080. <a href="http://localhost:${env.PORT}/overlay?bg" target="_blank">Preview overlay</a></p>
        </div>
      </div>

      <!-- Right Column -->
      <div class="stack">
        <!-- API Key -->
        <div class="card card-sm">
          <label class="label">API Key</label>
          <div class="input-group">
            <input type="password" id="key" placeholder="Enter Gladia API key" class="input">
            <button type="button" id="toggle-key" class="input-icon">
              <svg id="eye-open" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <svg id="eye-closed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hidden">
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>
              </svg>
            </button>
          </div>
          <p class="text-xs text-muted mt-4">Get your key at <a href="https://gladia.io" target="_blank">gladia.io</a></p>
        </div>

        <!-- Display -->
        <div class="card card-sm">
          <div class="card-title">Display</div>

          <label class="label-muted mb-4">Position</label>
          <div id="position-picker" class="position-picker">
            <div id="pos-handle" class="position-handle" style="left:50%;top:85%">
              <div class="position-label">Subtitle</div>
            </div>
          </div>

          <div class="slider-header">
            <label class="label-muted">Size</label>
            <span id="font-size-val" class="slider-value">52px</span>
          </div>
          <input type="range" id="font-size" min="24" max="80" step="2" value="52">

          <div class="mt-4">
            <label class="label-muted mb-4">Style</label>
            <select id="bg-style" class="select">
              <option value="none">Outline (Netflix style)</option>
              <option value="box">Background box</option>
            </select>
          </div>

          <input type="hidden" id="pos-x" value="50">
          <input type="hidden" id="pos-y" value="85">
        </div>

        <!-- Advanced -->
        <details class="card" style="padding:0">
          <summary>
            Advanced
            <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
          </summary>
          <div class="content">
            <div class="slider-group">
              <div class="slider-header">
                <label class="label-muted">Response speed</label>
                <span id="silence-val" class="slider-value">0.05s</span>
              </div>
              <input type="range" id="silence" min="0.01" max="2" step="0.01" value="0.05">
              <p id="silence-hint" class="slider-hint">Very fast</p>
            </div>

            <div class="slider-group">
              <div class="slider-header">
                <label class="label-muted">Max segment</label>
                <span id="duration-val" class="slider-value">5s</span>
              </div>
              <input type="range" id="duration" min="5" max="60" step="1" value="5">
              <p id="duration-hint" class="slider-hint">Short</p>
            </div>

            <div>
              <label class="label-muted mb-4">Custom vocabulary</label>
              <textarea id="vocab" rows="2" placeholder="Names, brands, technical terms..." class="textarea"></textarea>
              <p class="slider-hint">Separate words with commas</p>
            </div>
          </div>
        </details>
      </div>
    </div>
  </main>

  <!-- Toast -->
  <div id="toast" class="toast"><span id="toast-text"></span></div>

  <script type="module">
    // =========================================================================
    // DOM
    // =========================================================================
    const $ = id => document.getElementById(id);

    const el = {
      key: $('key'),
      audioSource: $('audio-source'),
      lang: $('lang'),
      translateTo: $('translate-to'),
      silence: $('silence'),
      duration: $('duration'),
      vocab: $('vocab'),
      fontSize: $('font-size'),
      bgStyle: $('bg-style'),
      posX: $('pos-x'),
      posY: $('pos-y'),
      silenceVal: $('silence-val'),
      durationVal: $('duration-val'),
      silenceHint: $('silence-hint'),
      durationHint: $('duration-hint'),
      fontSizeVal: $('font-size-val'),
      btn: $('btn'),
      iconPlay: $('icon-play'),
      iconStop: $('icon-stop'),
      btnText: $('btn-text'),
      dot: $('dot'),
      statusText: $('status-text'),
      preview: $('preview'),
      stats: $('stats'),
      toast: $('toast'),
      toastText: $('toast-text'),
      picker: $('position-picker'),
      handle: $('pos-handle'),
      networkUrl: $('network-url'),
      feedback: $('feedback'),
      feedbackText: $('feedback-text'),
      restartBtn: $('restart-btn'),
    };

    // =========================================================================
    // STATE
    // =========================================================================
    const state = {
      running: false,
      dragging: false,
      ws: null,
      ctx: null,
      stream: null,
      worklet: null,
      startTime: null,
      timer: null,
      reconnectAttempts: 0,
      reconnectTimeout: null,
      lastText: '',
      wsUrl: null,
    };

    // =========================================================================
    // CONSTANTS
    // =========================================================================
    const MAX_RECONNECT_ATTEMPTS = 5;
    const BASE_RECONNECT_DELAY = 1000;

    // =========================================================================
    // UI
    // =========================================================================
    const toast = msg => {
      el.toastText.textContent = msg;
      el.toast.classList.add('visible');
      setTimeout(() => el.toast.classList.remove('visible'), 2000);
    };

    const showFeedback = msg => {
      el.feedbackText.textContent = msg;
      el.feedback.classList.add('visible');
    };

    const hideFeedback = () => {
      el.feedback.classList.remove('visible');
    };

    const setStatus = (text, type) => {
      el.statusText.textContent = text;
      el.dot.className = 'dot dot-' + (type || 'idle');
    };

    const showError = (title, detail) => {
      setStatus('Error', 'error');
      el.preview.innerHTML = '<div class="error"><strong>' + title + '</strong>' +
        (detail ? '<small>' + detail + '</small>' : '') + '</div>';
    };

    const updateTimer = () => {
      if (!state.startTime) return;
      const s = Math.floor((Date.now() - state.startTime) / 1000);
      el.stats.textContent = String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
    };

    // =========================================================================
    // CONFIG PERSISTENCE
    // =========================================================================
    const STORAGE_KEY = 'transcription_config';

    /** Load saved configuration from localStorage */
    const loadConfig = () => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      } catch {
        return {};
      }
    };

    /** Save current configuration to localStorage */
    const saveConfig = () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        apiKey: el.key.value,
        audioSource: el.audioSource.value,
        language: el.lang.value,
        translateTo: el.translateTo.value,
        silenceThreshold: el.silence.value,
        maxDuration: el.duration.value,
        vocabulary: el.vocab.value,
        fontSize: el.fontSize.value,
        positionX: el.posX.value,
        positionY: el.posY.value,
        bgStyle: el.bgStyle.value
      }));
    };

    /** Restore configuration from saved state */
    const restoreConfig = (config) => {
      if (config.apiKey) el.key.value = config.apiKey;
      if (config.language) el.lang.value = config.language;
      if (config.translateTo) el.translateTo.value = config.translateTo;
      if (config.silenceThreshold) {
        el.silence.value = config.silenceThreshold;
        el.silenceVal.textContent = config.silenceThreshold + 's';
      }
      if (config.maxDuration) {
        el.duration.value = config.maxDuration;
        el.durationVal.textContent = config.maxDuration + 's';
      }
      if (config.vocabulary) el.vocab.value = config.vocabulary;
      if (config.fontSize) {
        el.fontSize.value = config.fontSize;
        el.fontSizeVal.textContent = config.fontSize + 'px';
      }
      if (config.positionX) el.posX.value = config.positionX;
      if (config.positionY) el.posY.value = config.positionY;
      if (config.bgStyle) el.bgStyle.value = config.bgStyle;
    };

    // =========================================================================
    // AUDIO DEVICES
    // =========================================================================
    const loadDevices = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach(t => t.stop());
        const devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput');
        el.audioSource.innerHTML = devs.map((d,i) => '<option value="'+d.deviceId+'">'+(d.label||'Mic '+(i+1))+'</option>').join('');
        const config = loadConfig();
        if (config.audioSource && devs.some(d => d.deviceId === config.audioSource)) {
          el.audioSource.value = config.audioSource;
        }
      } catch { el.audioSource.innerHTML = '<option value="">Default</option>'; }
    };

    // =========================================================================
    // DESCRIPTIONS
    // =========================================================================
    const silenceDesc = v => v <= 0.1 ? 'Very fast' : v <= 0.3 ? 'Fast' : v <= 0.5 ? 'Balanced' : v <= 1 ? 'Natural' : 'Slow';
    const durationDesc = v => v <= 10 ? 'Short' : v <= 20 ? 'Medium' : v <= 40 ? 'Long' : 'Very long';

    // =========================================================================
    // POSITION PICKER
    // =========================================================================
    const updateHandle = () => {
      el.handle.style.left = el.posX.value + '%';
      el.handle.style.top = el.posY.value + '%';
    };

    const setPos = e => {
      const r = el.picker.getBoundingClientRect();
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      el.posX.value = Math.max(5, Math.min(95, ((x - r.left) / r.width) * 100)).toFixed(1);
      el.posY.value = Math.max(5, Math.min(95, ((y - r.top) / r.height) * 100)).toFixed(1);
      updateHandle();
    };

    // =========================================================================
    // OVERLAY
    // =========================================================================
    const sendStyle = () => fetch('/style', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fontSize: el.fontSize.value, posX: el.posX.value, posY: el.posY.value, bgStyle: el.bgStyle.value })
    });

    const broadcast = text => fetch('/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    // =========================================================================
    // AUDIO
    // =========================================================================
    const setupAudio = async () => {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('MEDIA_NOT_SUPPORTED');
      if (!window.AudioWorklet) throw new Error('WORKLET_NOT_SUPPORTED');
      state.ctx = new AudioContext();
      const c = { channelCount: 1, echoCancellation: true, noiseSuppression: true };
      if (el.audioSource.value) c.deviceId = { exact: el.audioSource.value };

      try { state.stream = await navigator.mediaDevices.getUserMedia({ audio: c }); }
      catch (e) {
        if (e.name === 'NotAllowedError') throw new Error('MIC_DENIED');
        if (e.name === 'NotFoundError') throw new Error('MIC_NOT_FOUND');
        throw new Error('MIC_ERROR');
      }

      const blob = new Blob([${JSON.stringify(AUDIO_PROCESSOR)}], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await state.ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);

      state.worklet = new AudioWorkletNode(state.ctx, 'pcm-processor');
      state.worklet.port.onmessage = e => { if (state.ws?.readyState === 1) state.ws.send(new Uint8Array(e.data)); };
      state.ctx.createMediaStreamSource(state.stream).connect(state.worklet);
    };

    // =========================================================================
    // SESSION
    // =========================================================================
    const start = async () => {
      const key = el.key.value.trim();
      if (!key) { showError('API key required'); return; }

      saveConfig();
      setStatus('Connecting...', 'wait');
      el.preview.textContent = 'Connecting...';
      el.btn.disabled = true;

      try {
        const body = {
          encoding: 'wav/pcm', sample_rate: 16000, bit_depth: 16, channels: 1,
          endpointing: +el.silence.value,
          maximum_duration_without_endpointing: +el.duration.value,
          language_config: { languages: [el.lang.value] }
        };

        const words = el.vocab.value.split(/[,;]+/).map(w => w.trim()).filter(w => w);
        if (words.length) body.realtime_processing = { custom_vocabulary: true, custom_vocabulary_config: { vocabulary: words } };

        if (el.translateTo.value) {
          body.realtime_processing = body.realtime_processing || {};
          body.realtime_processing.translation = true;
          body.realtime_processing.translation_config = { target_languages: [el.translateTo.value], model: 'enhanced' };
        }

        const res = await fetch('https://api.gladia.io/v2/live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-gladia-key': key },
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          if (res.status === 401) throw new Error('Invalid API key');
          if (res.status === 402) throw new Error('Insufficient credits');
          throw new Error('API error: ' + res.status);
        }

        const { url } = await res.json();
        state.ws = new WebSocket(url);

        state.ws.onopen = async () => {
          try {
            el.preview.textContent = 'Initializing...';
            await setupAudio();
            state.running = true;
            state.reconnectAttempts = 0; // Reset on successful connection
            state.startTime = Date.now();
            state.timer = setInterval(updateTimer, 1000);
            el.btn.disabled = false;
            el.btn.className = 'btn btn-destructive btn-lg btn-block mt-6';
            el.iconPlay.classList.add('hidden');
            el.iconStop.classList.remove('hidden');
            el.btnText.textContent = 'Stop';
            el.preview.textContent = 'Listening...';
            el.preview.classList.add('active');
            setStatus('Live', 'live');
          } catch (e) {
            const errs = {
              MIC_DENIED: ['Microphone blocked', 'Allow microphone access in browser settings'],
              MIC_NOT_FOUND: ['No microphone found', 'Please connect a microphone'],
              MEDIA_NOT_SUPPORTED: ['Browser not supported', 'Please use Chrome, Edge, or Safari'],
              WORKLET_NOT_SUPPORTED: ['Browser outdated', 'Please update your browser or use Chrome/Edge']
            };
            const [t, d] = errs[e.message] || ['Audio error', e.message];
            showError(t, d);
            stop();
          }
        };

        state.ws.onmessage = e => {
          try {
            const m = JSON.parse(e.data);
            let t = null;
            if (m.type === 'translation' && m.data?.translated_utterance?.text) t = m.data.translated_utterance.text.trim();
            else if (m.type === 'transcript' && m.data?.utterance?.text && m.data.is_final && !el.translateTo.value) t = m.data.utterance.text.trim();
            if (t) { el.preview.textContent = t; broadcast(t); }
          } catch {}
        };

        state.ws.onerror = () => {
          if (state.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            attemptReconnect();
          } else {
            showError('Connection failed', 'Max retries reached');
            stop();
          }
        };

        state.ws.onclose = e => {
          if (state.running && e.code !== 1000) {
            if (state.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
              attemptReconnect();
            } else {
              showError('Disconnected', 'Code: ' + e.code);
              stop();
            }
          } else {
            stop();
          }
        };

      } catch (e) { el.btn.disabled = false; showError(e.message); }
    };

    const stop = (resetReconnect = true) => {
      if (state.reconnectTimeout) {
        clearTimeout(state.reconnectTimeout);
        state.reconnectTimeout = null;
      }
      if (resetReconnect) state.reconnectAttempts = 0;

      state.worklet?.disconnect();
      state.ctx?.close().catch(() => {});
      state.stream?.getTracks().forEach(t => t.stop());
      state.ws?.close();
      state.ws = state.ctx = state.stream = state.worklet = null;
      state.running = false;
      clearInterval(state.timer);

      el.btn.disabled = false;
      el.btn.className = 'btn btn-primary btn-lg btn-block mt-6';
      el.iconPlay.classList.remove('hidden');
      el.iconStop.classList.add('hidden');
      el.btnText.textContent = 'Start Transcription';
      hideFeedback();

      if (!el.preview.querySelector('.error')) {
        el.preview.textContent = 'Click "Start Transcription" to begin';
        el.preview.classList.remove('active');
      }
      if (el.statusText.textContent === 'Live') setStatus('Ready', 'idle');
    };

    const attemptReconnect = () => {
      state.reconnectAttempts++;
      const delay = BASE_RECONNECT_DELAY * Math.pow(2, state.reconnectAttempts - 1);
      setStatus('Reconnecting (' + state.reconnectAttempts + '/' + MAX_RECONNECT_ATTEMPTS + ')...', 'wait');
      el.preview.textContent = 'Connection lost. Reconnecting in ' + (delay / 1000) + 's...';

      // Clean up current connection without resetting reconnect state
      state.worklet?.disconnect();
      state.ctx?.close().catch(() => {});
      state.stream?.getTracks().forEach(t => t.stop());
      state.ws = state.ctx = state.stream = state.worklet = null;

      state.reconnectTimeout = setTimeout(() => {
        start();
      }, delay);
    };

    // =========================================================================
    // IP DETECTION
    // =========================================================================
    const detectIP = () => {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.createOffer().then(o => pc.setLocalDescription(o));
      pc.onicecandidate = e => {
        if (!e.candidate) return;
        const m = e.candidate.candidate.match(/([0-9]{1,3}(\\.[0-9]{1,3}){3})/);
        if (m && m[1] && !m[1].startsWith('127.')) { el.networkUrl.textContent = 'http://' + m[1] + ':${env.PORT}/overlay'; pc.close(); }
      };
      setTimeout(() => { if (el.networkUrl.textContent.includes('Detecting')) el.networkUrl.textContent = 'Unavailable'; pc.close(); }, 3000);
    };

    // =========================================================================
    // RESTART
    // =========================================================================
    const restart = async () => {
      hideFeedback();
      setStatus('Restarting...', 'wait');
      el.preview.textContent = 'Restarting with new settings...';
      stop();
      await new Promise(r => setTimeout(r, 300));
      start();
    };

    // =========================================================================
    // EVENTS
    // =========================================================================
    // Settings that require restart to take effect
    el.silence.oninput = () => {
      el.silenceVal.textContent = el.silence.value + 's';
      el.silenceHint.textContent = silenceDesc(+el.silence.value);
      saveConfig();
      if (state.running) showFeedback('Response speed changed — Restart to apply');
    };
    el.duration.oninput = () => {
      el.durationVal.textContent = el.duration.value + 's';
      el.durationHint.textContent = durationDesc(+el.duration.value);
      saveConfig();
      if (state.running) showFeedback('Max segment changed — Restart to apply');
    };
    el.lang.onchange = () => {
      saveConfig();
      if (state.running) showFeedback('Language changed — Restart to apply');
    };
    el.translateTo.onchange = () => {
      saveConfig();
      if (state.running) showFeedback('Translation changed — Restart to apply');
    };
    el.audioSource.onchange = () => {
      saveConfig();
      if (state.running) showFeedback('Audio source changed — Restart to apply');
    };
    el.vocab.onchange = () => {
      saveConfig();
      if (state.running) showFeedback('Vocabulary changed — Restart to apply');
    };

    // Settings that apply immediately (no restart needed)
    el.fontSize.oninput = () => { el.fontSizeVal.textContent = el.fontSize.value + 'px'; saveConfig(); sendStyle(); };
    el.bgStyle.onchange = () => { saveConfig(); sendStyle(); };
    el.key.onchange = saveConfig;

    el.picker.onmousedown = el.picker.ontouchstart = e => { state.dragging = true; setPos(e); };
    document.onmousemove = e => { if (state.dragging) setPos(e); };
    document.ontouchmove = e => { if (state.dragging) { e.preventDefault(); setPos(e); } };
    document.onmouseup = document.ontouchend = () => { if (state.dragging) { state.dragging = false; saveConfig(); sendStyle(); } };

    el.btn.onclick = () => state.running ? stop() : start();
    el.restartBtn.onclick = restart;

    $('copy-local').onclick = () => { navigator.clipboard.writeText('http://localhost:${env.PORT}/overlay'); toast('Copied!'); };
    $('copy-network').onclick = () => { if (!el.networkUrl.textContent.includes('Detecting')) { navigator.clipboard.writeText(el.networkUrl.textContent); toast('Copied!'); } };

    $('toggle-key').onclick = () => {
      const show = el.key.type === 'password';
      el.key.type = show ? 'text' : 'password';
      $('eye-open').classList.toggle('hidden', show);
      $('eye-closed').classList.toggle('hidden', !show);
    };

    document.onkeydown = e => {
      if (e.code === 'Space' && !['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        state.running ? stop() : start();
      }
    };

    navigator.mediaDevices?.addEventListener('devicechange', loadDevices);

    // =========================================================================
    // INIT
    // =========================================================================
    restoreConfig(loadConfig());
    el.silenceHint.textContent = silenceDesc(+el.silence.value);
    el.durationHint.textContent = durationDesc(+el.duration.value);
    updateHandle();
    loadDevices();
    detectIP();
  </script>
</body>
</html>`;
