/**
 * Zero-API smoke test for standalone: use with /minimal.html
 */
(function () {
  'use strict';
  console.log('[MINIMAL] app script running');
  var el = document.getElementById('minimal-out');
  var st = false;
  try {
    st = window.matchMedia('(display-mode: standalone)').matches;
  } catch (e) {}
  if (window.navigator.standalone === true) st = true;
  var lines = [
    'Minimal boot shell loaded.',
    'standalone / display-mode: ' + st,
    'href: ' + location.href,
    'If you see this inside the installed PWA, JS boot is OK.'
  ];
  if (el) el.textContent = lines.join('\n');
})();
