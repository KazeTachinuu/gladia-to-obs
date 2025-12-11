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
