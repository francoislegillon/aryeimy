// Utilities for resolving asset URLs relative to the deployed site root.
//
// The gallery can be hosted from `/` in development or from a nested path in
// production (for example GitHub Pages under `/project-name/`). When visitors
// open `/ar/<slug>/`, the browser executes the same JavaScript bundle. We need
// a stable way to locate shared assets such as `/libs/*` and
// `/ar/<slug>/manifest.json` regardless of the current page depth. Relying on
// `window.location.href` breaks when the page is already within `/ar/<slug>/`
// because relative URLs end up duplicating the slug segment.
//
// This module computes the application base URL using `import.meta.url`. That
// value always reflects the actual location of the `js/` directory, even when
// the gallery lives inside a subfolder. Other modules can then call
// `resolveAppUrl('libs/aframe.min.js')` and receive an absolute URL that points
// to the correct resource.

const APP_BASE_URL = (() => {
  try {
    const moduleUrl = new URL(import.meta.url);
    const moduleDir = new URL('.', moduleUrl);
    return new URL('..', moduleDir);
  } catch (error) {
    // Fallback for non-browser environments (e.g., unit tests) where
    // `import.meta.url` might not be available. We degrade to the current
    // origin so callers still receive an absolute URL instead of crashing.
    if (typeof window !== 'undefined' && window.location) {
      return new URL('/', window.location.origin);
    }
    return new URL('http://localhost/');
  }
})();

export function resolveAppUrl(path = '') {
  if (!path) {
    return APP_BASE_URL.toString();
  }
  const normalized = path.replace(/^\/+/, '');
  return new URL(normalized, APP_BASE_URL).toString();
}

export function getAppBaseHref() {
  return APP_BASE_URL.toString();
}
