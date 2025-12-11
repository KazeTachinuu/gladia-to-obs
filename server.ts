/**
 * Transcription Server v3.0
 * Modern live transcription for OBS/VMix
 *
 * Best practices:
 * - AudioWorklet (not deprecated ScriptProcessorNode)
 * - Modern CSS (logical properties, container units)
 * - Proper TypeScript types
 * - SSE with keep-alive
 * - shadcn/ui OKLCH colors
 */

const PORT = 8080;

// ============================================================================
// Types
// ============================================================================

interface SSEClient {
  controller: ReadableStreamDefaultController<Uint8Array>;
  id: number;
  lastPing: number;
}

// ============================================================================
// SSE Management with Keep-Alive
// ============================================================================

const clients: Map<number, SSEClient> = new Map();
let nextClientId = 0;

const encoder = new TextEncoder();
const KEEP_ALIVE_INTERVAL = 30_000;

function addClient(controller: ReadableStreamDefaultController<Uint8Array>): number {
  const id = ++nextClientId;
  clients.set(id, { controller, id, lastPing: Date.now() });
  console.log(`[SSE] +${id} (${clients.size} clients)`);
  return id;
}

function removeClient(id: number): void {
  if (clients.delete(id)) {
    console.log(`[SSE] -${id} (${clients.size} clients)`);
  }
}

function broadcast(text: string): void {
  const data = encoder.encode(`data:${JSON.stringify({ text })}\n\n`);
  for (const [id, client] of clients) {
    try {
      client.controller.enqueue(data);
    } catch {
      removeClient(id);
    }
  }
}

// Keep-alive ping
setInterval(() => {
  const ping = encoder.encode(`: ping\n\n`);
  for (const [id, client] of clients) {
    try {
      client.controller.enqueue(ping);
      client.lastPing = Date.now();
    } catch {
      removeClient(id);
    }
  }
}, KEEP_ALIVE_INTERVAL);

// ============================================================================
// AudioWorklet Processor (inline as data URL)
// ============================================================================

const AUDIO_PROCESSOR = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(0);
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const samples = input[0];

    // Resample to 16kHz
    const ratio = sampleRate / 16000;
    const outputLen = Math.floor(samples.length / ratio);
    const pcm = new Int16Array(outputLen);

    for (let i = 0; i < outputLen; i++) {
      const srcIdx = i * ratio;
      const floor = Math.floor(srcIdx);
      const frac = srcIdx - floor;
      const s1 = samples[floor] || 0;
      const s2 = samples[floor + 1] || s1;
      const sample = s1 + frac * (s2 - s1);
      pcm[i] = Math.round(Math.max(-1, Math.min(1, sample)) * 32767);
    }

    this.port.postMessage(pcm.buffer, [pcm.buffer]);
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
`;

// ============================================================================
// Dashboard HTML
// ============================================================================

const DASHBOARD = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transcription</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            background: "oklch(0.145 0 0)",
            foreground: "oklch(0.985 0 0)",
            card: { DEFAULT: "oklch(0.178 0 0)", foreground: "oklch(0.985 0 0)" },
            primary: { DEFAULT: "oklch(0.696 0.17 162)", foreground: "oklch(0.145 0 0)" },
            secondary: { DEFAULT: "oklch(0.269 0 0)", foreground: "oklch(0.985 0 0)" },
            muted: { DEFAULT: "oklch(0.269 0 0)", foreground: "oklch(0.708 0 0)" },
            destructive: { DEFAULT: "oklch(0.577 0.245 27)", foreground: "oklch(0.985 0 0)" },
            border: "oklch(0.269 0 0)",
            ring: "oklch(0.696 0.17 162)",
          },
        }
      }
    }
  </script>
  <style>
    :root { color-scheme: dark; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: oklch(0.145 0 0);
      color: oklch(0.985 0 0);
    }

    /* Modern scrollbar */
    ::-webkit-scrollbar { inline-size: 8px; }
    ::-webkit-scrollbar-thumb { background: oklch(0.3 0 0); border-radius: 4px; }

    /* Range input */
    input[type="range"] {
      -webkit-appearance: none;
      block-size: 6px;
      background: oklch(0.269 0 0);
      border-radius: 3px;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      inline-size: 16px;
      block-size: 16px;
      background: oklch(0.696 0.17 162);
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.1s;
    }
    input[type="range"]::-webkit-slider-thumb:hover {
      transform: scale(1.15);
    }

    /* Pulse */
    @keyframes pulse { 50% { opacity: 0.5; } }
    .pulse { animation: pulse 2s ease-in-out infinite; }

    /* Focus */
    .focus-ring:focus { outline: 2px solid oklch(0.696 0.17 162); outline-offset: 2px; }
  </style>
</head>
<body class="min-h-screen flex flex-col">
  <header class="border-b border-border px-6 py-4">
    <div class="max-w-3xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-primary grid place-items-center">
          <svg class="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
          </svg>
        </div>
        <span class="font-semibold">Transcription</span>
      </div>
      <div id="status" class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm">
        <span id="dot" class="w-2 h-2 rounded-full bg-muted-foreground"></span>
        <span id="status-text">Ready</span>
      </div>
    </div>
  </header>

  <main class="flex-1 p-6">
    <div class="max-w-3xl mx-auto space-y-5">
      <!-- Config -->
      <div class="grid gap-5 sm:grid-cols-2">
        <div class="rounded-lg border border-border bg-card p-5 space-y-4 shadow-sm">
          <h2 class="font-medium">Configuration</h2>
          <div class="space-y-3">
            <label class="block">
              <span class="text-sm text-muted-foreground">API Key</span>
              <div class="relative mt-1">
                <input type="password" id="key" placeholder="Gladia API key"
                  class="w-full h-9 px-3 pr-10 rounded-md bg-secondary border border-border text-sm focus-ring">
                <button type="button" id="toggle-key" class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" title="Toggle visibility">
                  <svg id="eye-open" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                  <svg id="eye-closed" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  </svg>
                </button>
              </div>
            </label>
            <label class="block">
              <span class="text-sm text-muted-foreground">Language</span>
              <select id="lang" class="mt-1 w-full h-9 px-3 rounded-md bg-secondary border border-border text-sm focus-ring">
                <option value="fr">Francais</option>
                <option value="en">English</option>
                <option value="es">Espanol</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
                <option value="pt">Portugues</option>
                <option value="ja">Japanese</option>
                <option value="zh">Chinese</option>
                <option value="ko">Korean</option>
                <option value="ar">Arabic</option>
              </select>
            </label>
          </div>
        </div>

        <div class="rounded-lg border border-border bg-card p-5 space-y-4 shadow-sm">
          <h2 class="font-medium">Timing</h2>
          <div class="space-y-4">
            <label class="block">
              <div class="flex justify-between text-sm mb-2">
                <span class="text-muted-foreground">Silence detection</span>
                <span id="silence-val" class="text-primary font-mono transition-all">0.05s</span>
              </div>
              <input type="range" id="silence" min="0.01" max="2" step="0.01" value="0.05" class="w-full">
              <p id="silence-hint" class="text-xs text-muted-foreground mt-1 h-4"></p>
            </label>
            <label class="block">
              <div class="flex justify-between text-sm mb-2">
                <span class="text-muted-foreground">Max duration</span>
                <span id="duration-val" class="text-primary font-mono transition-all">5s</span>
              </div>
              <input type="range" id="duration" min="5" max="60" step="1" value="5" class="w-full">
              <p id="duration-hint" class="text-xs text-muted-foreground mt-1 h-4"></p>
            </label>
          </div>
          <div id="timing-feedback" class="hidden text-xs py-2 px-3 rounded-md bg-primary/20 text-primary flex items-center justify-between gap-3">
            <span id="feedback-text"></span>
            <button id="restart-btn" class="hidden px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap">
              Restart now
            </button>
          </div>
        </div>
      </div>

      <!-- Start -->
      <button id="btn" class="w-full h-12 rounded-lg bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg hover:shadow-xl focus-ring">
        <svg id="icon-play" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        <svg id="icon-stop" class="w-5 h-5 hidden" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
        <span id="btn-text">Start</span>
      </button>

      <!-- Preview -->
      <div class="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-medium">Preview</h2>
          <span id="stats" class="text-xs text-muted-foreground font-mono">00:00 | 0</span>
        </div>
        <div id="preview" class="min-h-24 p-4 rounded-md bg-secondary text-muted-foreground text-center grid place-items-center text-lg leading-relaxed transition-colors">
          Waiting...
        </div>
      </div>

      <!-- OBS -->
      <div class="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 class="font-medium mb-3">OBS Browser Source</h2>
        <div class="flex gap-2">
          <a href="http://localhost:${PORT}/overlay?bg" target="_blank" id="overlay-link"
            class="flex-1 p-3 rounded-md bg-secondary text-sm font-mono truncate hover:bg-muted transition-colors cursor-pointer"
            title="Click to preview overlay">http://localhost:${PORT}/overlay</a>
          <button id="copy" class="px-4 rounded-md bg-secondary hover:bg-muted transition-colors text-sm focus-ring">Copy</button>
        </div>
        <p class="text-xs text-muted-foreground mt-2">Resolution: 1920x1080 · Click link to preview</p>
      </div>
    </div>
  </main>

  <script type="module">
    // Elements
    const $ = (s) => document.getElementById(s);
    const key = $('key'), lang = $('lang'), silence = $('silence'), duration = $('duration');
    const silenceVal = $('silence-val'), durationVal = $('duration-val');
    const silenceHint = $('silence-hint'), durationHint = $('duration-hint');
    const timingFeedback = $('timing-feedback'), feedbackText = $('feedback-text'), restartBtn = $('restart-btn');
    const btn = $('btn'), iconPlay = $('icon-play'), iconStop = $('icon-stop'), btnText = $('btn-text');
    const dot = $('dot'), statusText = $('status-text'), preview = $('preview'), stats = $('stats');

    // State
    let running = false, ws = null, ctx = null, stream = null, worklet = null;
    let start = null, timer = null, count = 0;
    let feedbackTimeout = null;

    // Config persistence
    const load = () => { try { return JSON.parse(localStorage.getItem('t') || '{}'); } catch { return {}; } };
    const save = () => localStorage.setItem('t', JSON.stringify({ k: key.value, l: lang.value, s: silence.value, d: duration.value }));

    // Feedback helper
    const showFeedback = (msg, showRestart = false) => {
      feedbackText.textContent = msg;
      timingFeedback.classList.remove('hidden');
      if (showRestart) {
        timingFeedback.classList.add('bg-yellow-500/20', 'text-yellow-400');
        timingFeedback.classList.remove('bg-primary/20', 'text-primary');
        restartBtn.classList.remove('hidden');
        clearTimeout(feedbackTimeout);
        // Keep visible while running and settings changed
      } else {
        timingFeedback.classList.remove('bg-yellow-500/20', 'text-yellow-400');
        timingFeedback.classList.add('bg-primary/20', 'text-primary');
        restartBtn.classList.add('hidden');
        clearTimeout(feedbackTimeout);
        feedbackTimeout = setTimeout(() => timingFeedback.classList.add('hidden'), 2500);
      }
    };

    const hideFeedback = () => {
      timingFeedback.classList.add('hidden');
      restartBtn.classList.add('hidden');
    };

    const getSilenceDescription = (val) => {
      if (val <= 0.1) return 'Very fast response';
      if (val <= 0.3) return 'Fast response';
      if (val <= 0.5) return 'Balanced';
      if (val <= 1) return 'Natural pauses';
      return 'Long pauses allowed';
    };

    const getDurationDescription = (val) => {
      if (val <= 10) return 'Short segments';
      if (val <= 20) return 'Medium segments';
      if (val <= 40) return 'Long segments';
      return 'Very long segments';
    };

    const cfg = load();
    if (cfg.k) key.value = cfg.k;
    if (cfg.l) lang.value = cfg.l;
    if (cfg.s) { silence.value = cfg.s; silenceVal.textContent = cfg.s + 's'; silenceHint.textContent = getSilenceDescription(+cfg.s); }
    if (cfg.d) { duration.value = cfg.d; durationVal.textContent = cfg.d + 's'; durationHint.textContent = getDurationDescription(+cfg.d); }

    // Slider handlers with feedback
    silence.oninput = () => {
      const val = silence.value;
      silenceVal.textContent = val + 's';
      silenceHint.textContent = getSilenceDescription(+val);
      silenceVal.classList.add('scale-110');
      setTimeout(() => silenceVal.classList.remove('scale-110'), 150);
      save();
      if (running) {
        showFeedback('Silence detection: ' + val + 's - Will apply on next session', true);
      } else {
        showFeedback('Silence detection set to ' + val + 's');
      }
    };

    duration.oninput = () => {
      const val = duration.value;
      durationVal.textContent = val + 's';
      durationHint.textContent = getDurationDescription(+val);
      durationVal.classList.add('scale-110');
      setTimeout(() => durationVal.classList.remove('scale-110'), 150);
      save();
      if (running) {
        showFeedback('Max duration: ' + val + 's - Will apply on next session', true);
      } else {
        showFeedback('Max duration set to ' + val + 's');
      }
    };

    lang.onchange = () => {
      save();
      const langName = lang.options[lang.selectedIndex].text;
      if (running) {
        showFeedback('Language: ' + langName + ' - Restart to apply', true);
      } else {
        showFeedback('Language set to ' + langName);
      }
    };
    key.onchange = save;

    // Status & Error display
    const setStatus = (t, type) => {
      statusText.textContent = t;
      dot.className = 'w-2 h-2 rounded-full ' +
        (type === 'live' ? 'bg-green-500 pulse' :
         type === 'error' ? 'bg-red-500' :
         type === 'wait' ? 'bg-yellow-500 pulse' : 'bg-muted-foreground');
    };

    const showError = (msg, details = '') => {
      setStatus('Error', 'error');
      preview.innerHTML = '<div class="text-red-400 text-sm"><strong>' + msg + '</strong>' +
        (details ? '<br><span class="text-red-400/70 text-xs">' + details + '</span>' : '') + '</div>';
      preview.classList.remove('text-muted-foreground');
      console.error('[Transcription]', msg, details);
    };

    // Error parser for API responses
    const parseApiError = (status, body) => {
      if (status === 401) return ['Invalid API key', 'Check your Gladia API key'];
      if (status === 402) return ['Payment required', 'Check your Gladia account credits'];
      if (status === 429) return ['Rate limited', 'Too many requests, wait a moment'];
      if (status >= 500) return ['Gladia server error', 'Try again in a few seconds'];
      try {
        const json = JSON.parse(body);
        return [json.message || json.error || 'API error', json.detail || ''];
      } catch {
        return ['API error (' + status + ')', body.slice(0, 100)];
      }
    };

    // Timer
    const updateStats = () => {
      if (!start) return;
      const s = Math.floor((Date.now() - start) / 1000);
      stats.textContent = String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0') + ' | ' + count;
    };

    // AudioWorklet setup
    const setupAudio = async () => {
      // Check browser support
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('MEDIA_NOT_SUPPORTED');
      }
      if (!window.AudioWorklet) {
        throw new Error('WORKLET_NOT_SUPPORTED');
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, sampleRate: 48000 }
        });
      } catch (e) {
        if (e.name === 'NotAllowedError') throw new Error('MIC_DENIED');
        if (e.name === 'NotFoundError') throw new Error('MIC_NOT_FOUND');
        throw new Error('MIC_ERROR:' + e.message);
      }

      ctx = new AudioContext({ sampleRate: 48000 });

      // Register worklet from inline code
      const blob = new Blob([${JSON.stringify(AUDIO_PROCESSOR)}], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);

      worklet = new AudioWorkletNode(ctx, 'pcm-processor');
      worklet.port.onmessage = (e) => {
        if (ws?.readyState === 1) ws.send(new Uint8Array(e.data));
      };

      const source = ctx.createMediaStreamSource(stream);
      source.connect(worklet);
    };

    // Session
    const startSession = async () => {
      const apiKey = key.value.trim();
      if (!apiKey) {
        showError('API key required', 'Enter your Gladia API key');
        return;
      }
      if (apiKey.length < 10) {
        showError('Invalid API key format', 'Key seems too short');
        return;
      }

      save();
      setStatus('Connecting...', 'wait');
      preview.textContent = 'Connecting to Gladia...';
      preview.classList.add('text-muted-foreground');
      btn.disabled = true;

      try {
        // API call
        let res;
        try {
          res = await fetch('https://api.gladia.io/v2/live', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-gladia-key': apiKey },
            body: JSON.stringify({
              encoding: 'wav/pcm', sample_rate: 16000, bit_depth: 16, channels: 1,
              endpointing: +silence.value,
              maximum_duration_without_endpointing: +duration.value,
              language_config: { languages: [lang.value] }
            })
          });
        } catch (e) {
          throw new Error('NETWORK:' + e.message);
        }

        if (!res.ok) {
          const body = await res.text();
          const [msg, detail] = parseApiError(res.status, body);
          throw new Error('API:' + msg + ':' + detail);
        }

        const { url } = await res.json();
        if (!url) throw new Error('API:Invalid response:No WebSocket URL received');

        ws = new WebSocket(url);

        ws.onopen = async () => {
          try {
            preview.textContent = 'Setting up microphone...';
            await setupAudio();

            running = true;
            start = Date.now();
            count = 0;
            timer = setInterval(updateStats, 1000);

            btn.disabled = false;
            btn.classList.replace('bg-primary', 'bg-destructive');
            iconPlay.classList.add('hidden');
            iconStop.classList.remove('hidden');
            btnText.textContent = 'Stop';
            preview.textContent = 'Listening...';
            preview.classList.remove('text-muted-foreground');
            setStatus('Live', 'live');
          } catch (e) {
            const code = e.message;
            if (code === 'MIC_DENIED') showError('Microphone access denied', 'Allow microphone in browser settings');
            else if (code === 'MIC_NOT_FOUND') showError('No microphone found', 'Connect a microphone and try again');
            else if (code === 'MEDIA_NOT_SUPPORTED') showError('Browser not supported', 'Use Chrome, Firefox, or Edge');
            else if (code === 'WORKLET_NOT_SUPPORTED') showError('AudioWorklet not supported', 'Update your browser');
            else if (code.startsWith('MIC_ERROR:')) showError('Microphone error', code.slice(10));
            else showError('Audio setup failed', e.message);
            stopSession();
          }
        };

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'transcript' && msg.data?.utterance?.text) {
              const text = msg.data.utterance.text.trim();
              if (text) {
                preview.textContent = text;
                preview.classList.remove('text-muted-foreground');
                preview.classList.add('text-foreground');
                if (msg.data.is_final) {
                  count++;
                  fetch('/broadcast', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                  });
                }
              }
            } else if (msg.type === 'error') {
              showError('Gladia error', msg.data?.message || 'Unknown error');
              stopSession();
            }
          } catch {}
        };

        ws.onerror = (e) => {
          showError('WebSocket error', 'Connection to Gladia failed');
          stopSession();
        };

        ws.onclose = (e) => {
          if (running) {
            if (e.code === 1006) showError('Connection lost', 'Network issue or server closed connection');
            else if (e.code === 1008) showError('Policy violation', e.reason || 'Check API key');
            else if (e.code !== 1000) showError('Disconnected', 'Code: ' + e.code + (e.reason ? ' - ' + e.reason : ''));
            else setStatus('Stopped', '');
            stopSession();
          }
        };

      } catch (e) {
        btn.disabled = false;
        const msg = e.message;
        if (msg.startsWith('NETWORK:')) {
          showError('Network error', 'Check your internet connection');
        } else if (msg.startsWith('API:')) {
          const parts = msg.slice(4).split(':');
          showError(parts[0], parts[1] || '');
        } else {
          showError('Connection failed', msg);
        }
        stopSession();
      }
    };

    const stopSession = () => {
      worklet?.disconnect();
      ctx?.close().catch(() => {});
      stream?.getTracks().forEach(t => t.stop());
      ws?.close();
      ws = ctx = stream = worklet = null;
      running = false;
      clearInterval(timer);
      hideFeedback();

      btn.disabled = false;
      btn.classList.replace('bg-destructive', 'bg-primary');
      iconPlay.classList.remove('hidden');
      iconStop.classList.add('hidden');
      btnText.textContent = 'Start';

      // Only reset preview if no error is shown
      if (!preview.querySelector('.text-red-400')) {
        preview.textContent = 'Waiting...';
        preview.classList.remove('text-foreground');
        preview.classList.add('text-muted-foreground');
      }
      if (statusText.textContent === 'Live') setStatus('Ready', '');
    };

    btn.onclick = () => running ? stopSession() : startSession();

    // Restart function for settings changes
    const restartSession = async () => {
      hideFeedback();
      setStatus('Restarting...', 'wait');
      preview.textContent = 'Restarting with new settings...';
      stopSession();
      await new Promise(r => setTimeout(r, 300));
      startSession();
    };

    restartBtn.onclick = restartSession;

    // Copy button
    $('copy').onclick = () => {
      navigator.clipboard.writeText('http://localhost:${PORT}/overlay');
      $('copy').textContent = 'Copied!';
      setTimeout(() => $('copy').textContent = 'Copy', 1500);
    };

    // API key visibility toggle
    const eyeOpen = $('eye-open'), eyeClosed = $('eye-closed');
    $('toggle-key').onclick = () => {
      const isPassword = key.type === 'password';
      key.type = isPassword ? 'text' : 'password';
      eyeOpen.classList.toggle('hidden', isPassword);
      eyeClosed.classList.toggle('hidden', !isPassword);
    };

    // Keyboard shortcut: Space to start/stop when not focused on input
    document.onkeydown = (e) => {
      if (e.code === 'Space' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        running ? stopSession() : startSession();
      }
    };
  </script>
</body>
</html>`;

// ============================================================================
// Overlay HTML - Netflix-style subtitles
// - 1920x1080 fixed (16:9)
// - Text outline (no background bar)
// - Safe area positioning
// ============================================================================

const OVERLAY = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      inline-size: 1920px;
      block-size: 1080px;
      overflow: hidden;
    }

    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: transparent;
    }

    body.preview { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); }

    #caption {
      position: absolute;
      inset-block-end: 60px;
      inset-inline: 60px;
      text-align: center;
    }

    #text {
      display: inline;
      color: #ffffff;
      font-size: 52px;
      font-weight: 700;
      line-height: 1.35;
      letter-spacing: 0.02em;

      /* Netflix-style outline using text-stroke + shadow */
      -webkit-text-stroke: 1.5px #000000;
      paint-order: stroke fill;
      text-shadow:
        /* Soft drop shadow */
        3px 3px 6px rgba(0, 0, 0, 0.9),
        /* Outline reinforcement */
        1px 1px 0 #000,
        -1px -1px 0 #000,
        1px -1px 0 #000,
        -1px 1px 0 #000,
        /* Glow for depth */
        0 0 20px rgba(0, 0, 0, 0.5);

      opacity: 0;
      transition: opacity 0.15s ease-out;

      /* Word wrap */
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    #text.visible {
      opacity: 1;
    }

    /* Limit container width for better readability */
    #caption {
      max-inline-size: 1400px;
      margin-inline: auto;
      left: 50%;
      transform: translateX(-50%);
      right: auto;
    }
  </style>
</head>
<body>
  <div id="caption"><span id="text"></span></div>
  <script>
    if (location.search.includes('bg')) document.body.classList.add('preview');

    const text = document.getElementById('text');
    let timer;

    const connect = () => {
      const es = new EventSource('/stream');

      es.onmessage = ({ data }) => {
        const { text: content } = JSON.parse(data);
        text.textContent = content;
        text.classList.add('visible');
        clearTimeout(timer);
        timer = setTimeout(() => text.classList.remove('visible'), 5000);
      };

      es.onerror = () => {
        es.close();
        setTimeout(connect, 2000);
      };
    };

    connect();
  </script>
</body>
</html>`;

// ============================================================================
// Bun Server
// ============================================================================

console.log(`
  Transcription v3.0
  http://localhost:${PORT}
  http://localhost:${PORT}/overlay (1920x1080)
`);

Bun.serve({
  port: PORT,
  idleTimeout: 255,

  fetch(req: Request): Response | Promise<Response> {
    const { pathname } = new URL(req.url);

    // Dashboard
    if (pathname === "/" || pathname === "/index.html") {
      return new Response(DASHBOARD, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // Overlay
    if (pathname === "/overlay") {
      return new Response(OVERLAY, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // SSE Stream
    if (pathname === "/stream") {
      let id: number;
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          id = addClient(controller);
        },
        cancel() {
          removeClient(id);
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Broadcast endpoint
    if (pathname === "/broadcast" && req.method === "POST") {
      return req.json().then(({ text }: { text: string }) => {
        if (text) broadcast(text);
        return new Response("ok", { status: 200 });
      }).catch(() => new Response("error", { status: 400 }));
    }

    return new Response("Not Found", { status: 404 });
  }
});

// Open browser
const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
Bun.spawn([cmd, `http://localhost:${PORT}`]);
