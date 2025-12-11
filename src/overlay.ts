export const OVERLAY = `<!DOCTYPE html>
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
      max-inline-size: 1400px;
      margin-inline: auto;
      left: 50%;
      transform: translateX(-50%);
      right: auto;
    }

    #caption.align-left {
      text-align: left;
      left: 60px;
      transform: none;
    }

    #caption.align-right {
      text-align: right;
      left: auto;
      right: 60px;
      transform: none;
    }

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

    /* Netflix style (default) */
    #text.style-none {
      -webkit-text-stroke: 1.5px #000000;
      paint-order: stroke fill;
      text-shadow:
        3px 3px 6px rgba(0, 0, 0, 0.9),
        1px 1px 0 #000,
        -1px -1px 0 #000,
        1px -1px 0 #000,
        -1px 1px 0 #000,
        0 0 20px rgba(0, 0, 0, 0.5);
      background: transparent;
      padding: 0;
      border-radius: 0;
    }

    /* Black box style */
    #text.style-box {
      -webkit-text-stroke: 0;
      text-shadow: none;
      background: rgba(0, 0, 0, 0.85);
      padding: 12px 24px;
      border-radius: 8px;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }

    #text.visible {
      opacity: 1;
    }
  </style>
</head>
<body>
  <div id="caption"><span id="text" class="style-none"></span></div>
  <script>
    if (location.search.includes('bg')) document.body.classList.add('preview');

    const caption = document.getElementById('caption');
    const text = document.getElementById('text');
    let timer;

    // Apply styles from message or localStorage
    const applyStyle = (style) => {
      if (style.fontSize) {
        text.style.fontSize = style.fontSize + 'px';
      }
      if (style.textAlign) {
        caption.classList.remove('align-left', 'align-right');
        if (style.textAlign === 'left') caption.classList.add('align-left');
        if (style.textAlign === 'right') caption.classList.add('align-right');
      }
      if (style.bgStyle) {
        text.classList.remove('style-none', 'style-box');
        text.classList.add('style-' + style.bgStyle);
      }
      // Save to localStorage for persistence
      localStorage.setItem('overlay-style', JSON.stringify(style));
    };

    // Load saved style on init
    try {
      const saved = JSON.parse(localStorage.getItem('overlay-style') || '{}');
      if (Object.keys(saved).length) applyStyle(saved);
    } catch {}

    const connect = () => {
      const es = new EventSource('/stream');

      es.onmessage = ({ data }) => {
        const msg = JSON.parse(data);

        // Handle style updates
        if (msg.type === 'style') {
          applyStyle(msg);
          return;
        }

        // Handle text updates
        if (msg.text) {
          text.textContent = msg.text;
          text.classList.add('visible');
          clearTimeout(timer);
          timer = setTimeout(() => text.classList.remove('visible'), 5000);
        }
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
