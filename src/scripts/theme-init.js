// @ts-check
/* global document, window, Element */
// Blocking theme init, copied verbatim via `?url` (see Base.astro). Keep tiny, ES2019, no imports.
// The one documented exception to "only src/lib/store.ts reads storage": it must run before any
// module loads. It reads `st.theme` (a bare string), `st.lowData` (JSON `true`) and `st.lang` (a
// bare string) in the formats the store writes them; keep them in step with the `theme`, `lowData`
// and `lang` stores. `data-st-lang-offer` (the saved language, when it is not the page's) lets CSS
// show the language banner from the first paint.
(function () {
  var root = document.documentElement;
  var saved = null;
  var lowData = null;
  var lang = null;
  try {
    saved = window.localStorage.getItem('st.theme');
    lowData = window.localStorage.getItem('st.lowData');
    lang = window.localStorage.getItem('st.lang');
  } catch {
    // Storage blocked: follow the system theme, with web fonts.
  }
  if (lowData === 'true') root.setAttribute('data-low-data', '');
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
})();
