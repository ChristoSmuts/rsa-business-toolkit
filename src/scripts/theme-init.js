// @ts-check
/* global document, window, Element, HTMLScriptElement, MutationObserver */
// Blocking theme init, copied via `?url` and minified in the build (scripts/minify-theme-init.ts):
// keep it tiny, ES2019, no imports.
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
  // Opens "Words used in this file" from 1024px before it is painted (Doc.astro).
  if (window.matchMedia('(min-width: 1024px)').matches) {
    var words = new MutationObserver(function () {
      var list = document.getElementById('words-used-in-this-file');
      if (list) list.setAttribute('open', '');
      if (list || document.readyState !== 'loading') words.disconnect();
    });
    words.observe(root, { childList: true, subtree: true });
  }
  // Scripts that fail to load, by name ("YourPathCard", "my-path"): the home card and My path stop
  // keeping space for what they cannot draw (YourPathCard.astro, my-path.astro).
  window.addEventListener(
    'error',
    function (event) {
      var script = event.target;
      if (!(script instanceof HTMLScriptElement)) return;
      var name = (script.src.split('/').pop() || '').split('.')[0] || '';
      var failed = (root.getAttribute('data-st-script-failed') || '').split(' ');
      if (failed.indexOf(name) < 0) failed.push(name);
      root.setAttribute('data-st-script-failed', failed.join(' ').trim());
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
