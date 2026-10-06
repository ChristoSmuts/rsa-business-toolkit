// @ts-check
/* global document, window, Element, HTMLScriptElement */
// Blocking theme init, copied verbatim (unminified) via `?url`: keep it tiny, ES2019, no imports.
// The documented exception to "only the store reads storage"; docs/design-system.md, "Scripts, CSP
// and JavaScript budget", says what it reads and sets and why.
(function () {
  var root = document.documentElement;
  var saved = null;
  var lowData = null;
  var lang = null;
  var profile = null;
  try {
    saved = window.localStorage.getItem('st.theme');
    lowData = window.localStorage.getItem('st.lowData');
    lang = window.localStorage.getItem('st.lang');
    profile = window.localStorage.getItem('st.profile.v1');
  } catch {
    // Storage blocked: follow the system theme, with web fonts.
  }
  if (lowData === 'true') root.setAttribute('data-low-data', '');
  if (answers(profile)) root.setAttribute('data-st-profile', '');
  if (lang && lang !== (root.getAttribute('lang') || '').split('-')[0]) {
    root.setAttribute('data-st-lang-offer', lang);
  }
  if (saved === 'light' || saved === 'dark') {
    root.setAttribute('data-theme', saved);
    var chosen = document.querySelector('meta[name="theme-color"][data-st-scheme="' + saved + '"]');
    var colour = (chosen && chosen.getAttribute('data-st-colour')) || '';
    if (colour) {
      document.querySelectorAll('meta[name="theme-color"]').forEach(function (meta) {
        meta.setAttribute('content', colour);
      });
    }
  }
  root.classList.add('js');
  // A script that fails to load: the home card gives back the space it kept (YourPathCard.astro).
  window.addEventListener(
    'error',
    function (event) {
      if (event.target instanceof HTMLScriptElement) root.setAttribute('data-st-script-failed', '');
    },
    true,
  );
  // Disabled and loading buttons stay focusable (aria-disabled), so swallow their activation.
  document.addEventListener(
    'click',
    function (event) {
      var target = event.target;
      if (target instanceof Element && target.closest('.st-btn[aria-disabled="true"]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );

  // `parseProfile`'s rules (src/lib/profile.ts; tests/dom/theme-init.test.ts keeps them equal).
  /** @param {string | null} raw */
  function answers(raw) {
    var v;
    try {
      v = JSON.parse(raw || '');
    } catch {
      return false;
    }
    var t = v && v.businessTypes;
    if (!Array.isArray(t) || !t.length) return false;
    var ok =
      'vehicle-dealer food beauty retail-online services-trades professional-creative general'
        .split(' ')
        .concat('sole-prop', 'pty', 'undecided', 'not-started', 'trading', 'pty-growing');
    for (var i = 0; i < t.length; i++) {
      var k = ok.indexOf(t[i]);
      if (k < 0 || k > 6 || t.indexOf(t[i]) < i) return false;
    }
    var e = ok.indexOf(v.entity);
    var s = ok.indexOf(v.stage);
    return e > 6 && e < 10 && s > 9 && (v.stage !== 'pty-growing' || v.entity === 'pty');
  }
})();
