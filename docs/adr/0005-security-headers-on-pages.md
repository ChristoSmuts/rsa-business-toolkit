# 0005: Security controls within GitHub Pages limits

- Status: accepted
- Date: 2026-09-15

## Context

GitHub Pages does not let a site set HTTP response headers. There is no way to send a Content-Security-Policy, HSTS, X-Frame-Options or Permissions-Policy header.

## Decision

- Send a Content-Security-Policy through a `<meta http-equiv>` tag on every page: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'`.
- No inline scripts. The theme script that runs before first paint is an external file.
- Send `<meta name="referrer" content="strict-origin-when-cross-origin">`.
- External links use `rel="noopener noreferrer"`.
- The site makes no third-party requests. Fonts and icons are self-hosted or inlined at build time. An end-to-end test fails on any request to another origin and on any CSP violation.
- No service worker in the first release.

## Consequences

- A meta CSP cannot express `frame-ancestors`, `report-uri` or `sandbox`, so framing protection is not available on Pages.
- `style-src` allows inline styles because Astro inlines small stylesheets and icons carry style attributes. Scripts remain fully restricted.
- Moving to a host that supports headers later only requires copying the policy into real headers.
