/**
 * FIRST external script on the page — before sanity.js / radio.js / main.js.
 * Template-aligned global handlers for uncaught errors / rejections.
 */
(function () {
  'use strict';

  console.log('[BOOT] JS STARTED');

  function showFatal(html) {
    if (document.body) {
      document.body.innerHTML = html;
      return;
    }
    document.addEventListener(
      'DOMContentLoaded',
      function onReady() {
        document.removeEventListener('DOMContentLoaded', onReady);
        if (document.body) document.body.innerHTML = html;
      },
      { once: true }
    );
  }

  window.onerror = function (msg, src, line, col, err) {
    console.error('[FATAL ERROR]', {
      msg: msg,
      src: src,
      line: line,
      col: col,
      err: err
    });

    showFatal(
      '<div style="\n      background:black;\n      color:red;\n      padding:40px;\n      font-size:28px;\n      font-family:monospace;\n      white-space:pre-wrap;\n    ">\n      FATAL ERROR:\n\n      ' +
        String(msg) +
        '\n\n      FILE:\n      ' +
        String(src) +
        '\n\n      LINE:\n      ' +
        String(line) +
        '\n    </div>'
    );
    return false;
  };

  window.onunhandledrejection = function (e) {
    console.error('[PROMISE CRASH]', e.reason);

    var reasonText = '';
    try {
      if (e.reason != null && typeof e.reason === 'object') {
        if (e.reason instanceof Error) {
          reasonText = e.reason.message + '\n' + (e.reason.stack || '');
        } else {
          reasonText = JSON.stringify(e.reason, null, 2);
        }
      } else {
        reasonText = String(e.reason);
      }
    } catch (x) {
      reasonText = String(e.reason);
    }

    showFatal(
      '<div style="\n      background:black;\n      color:orange;\n      padding:40px;\n      font-size:28px;\n      font-family:monospace;\n      white-space:pre-wrap;\n    ">\n      PROMISE ERROR:\n\n      ' +
        reasonText.replace(/</g, '&lt;') +
        '\n    </div>'
    );
  };

  var standalone = false;
  try {
    standalone = window.matchMedia('(display-mode: standalone)').matches;
  } catch (e1) {}
  try {
    if (window.navigator.standalone === true) standalone = true;
  } catch (e2) {}
  console.log('[STANDALONE]', standalone);
})();
