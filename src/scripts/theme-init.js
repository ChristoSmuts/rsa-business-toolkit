// @ts-check
/* global document, window, Element */
// Blocking theme init, copied verbatim via `?url` (see Base.astro). Keep tiny, ES2019, no imports.
(function () {
  var root = document.documentElement;
  var saved = null;
  try {
    saved = window.localStorage.getItem('st.theme');
  } catch {
    // Storage blocked: follow the system theme.
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
