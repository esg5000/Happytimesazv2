/**
 * FIRST script on the page — global boot / crash surface for PWA standalone debugging.
 * Keep dependency-free; load before sanity.js / radio.js / main.js.
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
    console.error('[FATAL ERROR]', { msg, src, line, col, err });
    showFatal(
      '<div style="background:black;color:red;padding:40px;font-size:28px;font-family:monospace;white-space:pre-wrap;">FATAL ERROR:\n\n' +
        String(msg) +
        '\n\nFILE:\n' +
        String(src) +
        '\n\nLINE:\n' +
        String(line) +
        '</div>'
    );
    return false;
  };

  window.onunhandledrejection = function (e) {
    console.error('[PROMISE CRASH]', e.reason);
    var reasonStr = '';
    try {
      reasonStr =
        e.reason && typeof e.reason === 'object'
          ? JSON.stringify(e.reason, null, 2)
          : String(e.reason);
    } catch (x) {
      reasonStr = String(e.reason);
    }
    showFatal(
      '<div style="background:black;color:orange;padding:40px;font-size:28px;font-family:monospace;white-space:pre-wrap;">PROMISE ERROR:\n\n' +
        reasonStr +
        '</div>'
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
