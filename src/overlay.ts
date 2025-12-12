/**
 * OBS Overlay Template
 *
 * This HTML template is served at /overlay and displays live transcription
 * captions as a transparent overlay for OBS/VMix browser sources.
 *
 * Features:
 * - Receives text updates via Server-Sent Events (SSE)
 * - Supports dynamic positioning (X/Y percentage)
 * - Two visual styles: Netflix-style outline or background box
 * - Persists style settings in localStorage
 * - Auto-reconnects on connection loss
 */

export const OVERLAY = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    /* Reset */
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    /* Canvas: fixed 1080p for OBS */
    html, body {
      inline-size: 1920px;
      block-size: 1080px;
      overflow: hidden;
    }

    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: transparent;
    }

    /* Preview mode: show background gradient when ?bg query param present */
    body.preview {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    }

    /* Caption container: positioned via JS */
    #caption {
      position: absolute;
      left: 50%;
      top: 92%;
      transform: translate(-50%, -50%);
      text-align: center;
      max-inline-size: 1600px;
    }

    /* Caption text base styles */
    #text {
      display: inline;
      color: #ffffff;
      font-size: 52px;
      font-weight: 700;
      line-height: 1.35;
      letter-spacing: 0.02em;
      opacity: 0;
      transition: opacity 0.15s ease-out, font-size 0.2s ease-out;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    /* Style: Netflix-style outline (default) */
    /* Uses text-shadow for Firefox compatibility (no -webkit-text-stroke support) */
    #text.style-none {
      -webkit-text-stroke: 1.5px #000000;
      paint-order: stroke fill;
      /* Comprehensive text shadow for cross-browser outline effect */
      text-shadow:
        /* Main shadow */
        3px 3px 6px rgba(0, 0, 0, 0.9),
        /* 8-direction outline for browsers without text-stroke */
        2px 0 0 #000, -2px 0 0 #000,
        0 2px 0 #000, 0 -2px 0 #000,
        1px 1px 0 #000, -1px -1px 0 #000,
        1px -1px 0 #000, -1px 1px 0 #000,
        /* Glow */
        0 0 20px rgba(0, 0, 0, 0.5);
      background: transparent;
      padding: 0;
      border-radius: 0;
    }

    /* Style: Black background box */
    #text.style-box {
      -webkit-text-stroke: 0;
      text-shadow: none;
      background: rgba(0, 0, 0, 0.85);
      padding: 12px 24px;
      border-radius: 8px;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }

    /* Visible state */
    #text.visible {
      opacity: 1;
    }
  </style>
</head>
<body>
  <div id="caption"><span id="text" class="style-none"></span></div>

  <script>
    // =========================================================================
    // SETUP
    // =========================================================================
    // Enable preview background if ?bg query param present
    if (location.search.includes('bg')) {
      document.body.classList.add('preview');
    }

    const caption = document.getElementById('caption');
    const text = document.getElementById('text');

    // =========================================================================
    // STYLE MANAGEMENT
    // =========================================================================
    /**
     * Apply style settings to the caption
     * @param {Object} style - Style object with fontSize, posX, posY, bgStyle
     */
    const applyStyle = (style) => {
      if (style.fontSize) {
        text.style.fontSize = style.fontSize + 'px';
      }
      if (style.posX !== undefined && style.posY !== undefined) {
        caption.style.left = style.posX + '%';
        caption.style.top = style.posY + '%';
      }
      if (style.bgStyle) {
        text.classList.remove('style-none', 'style-box');
        text.classList.add('style-' + style.bgStyle);
      }
      // Persist for page reloads
      localStorage.setItem('overlay-style', JSON.stringify(style));
    };

    // Restore saved style on page load
    try {
      const saved = JSON.parse(localStorage.getItem('overlay-style') || '{}');
      if (Object.keys(saved).length) {
        applyStyle(saved);
      }
    } catch { /* ignore parse errors */ }

    // =========================================================================
    // SSE CONNECTION
    // =========================================================================
    /**
     * Connect to the SSE stream and handle messages
     * Auto-reconnects on connection loss
     */
    const connect = () => {
      const eventSource = new EventSource('/stream');

      eventSource.onmessage = ({ data }) => {
        const msg = JSON.parse(data);

        // Handle style update messages
        if (msg.type === 'style') {
          applyStyle(msg);
          return;
        }

        // Handle text update messages
        if (msg.text) {
          text.textContent = msg.text;
          text.classList.add('visible');
        }
      };

      // Auto-reconnect after 2 seconds on error
      eventSource.onerror = () => {
        eventSource.close();
        setTimeout(connect, 2000);
      };
    };

    // Start connection
    connect();
  </script>
</body>
</html>`;
