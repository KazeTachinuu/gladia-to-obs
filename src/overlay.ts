export const OVERLAY = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 1920px; height: 1080px; overflow: hidden; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: transparent; }
    body.preview { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); }

    #caption {
      position: absolute;
      left: 50%; top: 92%;
      transform: translate(-50%, -50%);
      text-align: center;
      max-width: 1600px;
    }

    #text {
      display: inline;
      color: #fff;
      font-size: 52px;
      font-weight: 700;
      line-height: 1.75;
      letter-spacing: 0.02em;
      opacity: 0;
      transition: opacity 0.15s ease-out, font-size 0.2s ease-out;
      word-wrap: break-word;
    }

    #text.style-none {
      -webkit-text-stroke: 1.5px #000;
      paint-order: stroke fill;
      text-shadow: 3px 3px 6px rgba(0,0,0,0.9), 2px 0 0 #000, -2px 0 0 #000, 0 2px 0 #000, 0 -2px 0 #000, 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 0 20px rgba(0,0,0,0.5);
    }

    #text.style-box {
      -webkit-text-stroke: 0;
      text-shadow: none;
      background: rgba(0,0,0,0.85);
      padding: 12px 24px;
      border-radius: 8px;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }

    #text.visible { opacity: 1; }
  </style>
</head>
<body>
  <div id="caption"><span id="text" class="style-none"></span></div>
  <script>
    if (location.search.includes('bg')) document.body.classList.add('preview');

    const caption = document.getElementById('caption');
    const text = document.getElementById('text');
    let hideTimer = null;
    const HIDE_DELAY = 15000;

    const resetHideTimer = () => {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => text.classList.remove('visible'), HIDE_DELAY);
    };

    const applyStyle = (s) => {
      if (s.fontSize) text.style.fontSize = s.fontSize + 'px';
      if (s.posX !== undefined) caption.style.left = s.posX + '%';
      if (s.posY !== undefined) caption.style.top = s.posY + '%';
      if (s.bgStyle) { text.classList.remove('style-none', 'style-box'); text.classList.add('style-' + s.bgStyle); }
      localStorage.setItem('overlay-style', JSON.stringify(s));
    };

    try { const s = JSON.parse(localStorage.getItem('overlay-style') || '{}'); if (Object.keys(s).length) applyStyle(s); } catch {}

    const connect = () => {
      const es = new EventSource('/stream');
      es.addEventListener('text', ({ data }) => { const m = JSON.parse(data); if (m.text) { text.textContent = m.text; text.classList.add('visible'); resetHideTimer(); } });
      es.addEventListener('style', ({ data }) => applyStyle(JSON.parse(data)));
      es.onerror = () => { es.close(); setTimeout(connect, 2000); };
    };
    connect();
  </script>
</body>
</html>`;
