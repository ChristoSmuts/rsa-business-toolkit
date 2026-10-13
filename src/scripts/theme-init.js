// @ts-check
/* global document, localStorage, matchMedia, addEventListener, Element, HTMLScriptElement, MutationObserver */
// Blocking theme init, copied via `?url` and minified in the build (scripts/minify-theme-init.ts):
// keep it tiny, ES2019, no imports.
// The documented exception to "only the store reads storage"; docs/design-system.md, "Scripts, CSP
// and JavaScript budget", says what it reads and sets and why.
(function () {
  var root = document.documentElement;
  /** @type {string | null | undefined} */
  var saved;
  /** @type {string | null | undefined} */
  var lang;
  /** @type {string | null | undefined} */
  var profile;
  var lowData = false;
  try {
    var store = localStorage;
    saved = store.getItem('st.theme');
    lowData = store.getItem('st.lowData') === 'true';
    lang = store.getItem('st.lang');
    profile = store.getItem('st.profile.v1');
  } catch {
    // Storage blocked: follow the system theme, with web fonts, and show the storage warnings from
    // the first paint (utilities.css), so nothing moves when their script runs (WP-50a pass 11, m4).
    root.setAttribute('data-st-storage', 'blocked');
  }
  root.toggleAttribute('data-low-data', lowData);
  // The font preloads (Base.astro keeps them in a <template> just before this script): only when
  // the page will use the fonts. In low data mode the CSS uses the device's fonts, so a preload
  // would only spend the reader's data (WP-50 audit, item 5). `prefers-reduced-data` is left to
  // the CSS: no stable browser ships it, and checking it here would grow every page's script.
  var preloads = /** @type {HTMLTemplateElement | null} */ (
    document.querySelector('[data-st-preload]')
  );
  if (preloads && !lowData) {
    document.head.append(preloads.content);
  }
  root.toggleAttribute('data-st-profile', answers(profile));
  if (lang && lang !== root.lang.split('-')[0]) {
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
  if (matchMedia('(min-width: 1024px)').matches) {
    var words = new MutationObserver(function () {
      var list = document.getElementById('words-used-in-this-file');
      if (list) list.setAttribute('open', '');
      if (list || document.readyState !== 'loading') words.disconnect();
    });
    words.observe(root, { childList: true, subtree: true });
  }
  // Scripts that fail to load, or throw as they run, by name ("YourPathCard", "my-path", "Wizard"):
  // the home card and My path stop keeping space for what they cannot draw, and the wizard shows its
  // no-JavaScript form. Every rule that reads this waits for its element's data-ready, so a later
  // error in an element that is already drawn changes nothing.
  addEventListener(
    'error',
    function (event) {
      var script = event.target;
      var src = script instanceof HTMLScriptElement ? script.src : event.filename || '';
      var name = (src.split('/').pop() || '').split('.')[0] || '';
      if (!name) return;
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
  /** @param {string | null | undefined} raw */
  function answers(raw) {
    var v;
    try {
      v = JSON.parse(raw || '');
    } catch {
      return false;
    }
    var t = v && v.businessTypes;
    if (!Array.isArray(t) || !t.length) return false;
    // Kinds of business (0 to 6), then entities (7 to 9), then stages (10 to 12).
    var ok = (
      'vehicle-dealer food beauty retail-online services-trades professional-creative general ' +
      'sole-prop pty undecided not-started trading pty-growing'
    ).split(' ');
    for (var i = 0; i < t.length; i++) {
      var k = ok.indexOf(t[i]);
      if (k < 0 || k > 6 || t.indexOf(t[i]) < i) return false;
    }
    var e = ok.indexOf(v.entity);
    var s = ok.indexOf(v.stage);
    return e > 6 && e < 10 && s > 9 && (v.stage !== 'pty-growing' || v.entity === 'pty');
  }
})();
