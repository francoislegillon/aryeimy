// Routing utilities for parsing artwork slugs from the current URL.

export function getSlugFromPath(locationLike = window.location) {
  const { pathname, search } = locationLike;
  const segments = pathname.split('/').filter(Boolean);

  let slug = null;
  const arIndex = segments.indexOf('ar');
  if (arIndex !== -1 && segments[arIndex + 1]) {
    slug = segments[arIndex + 1];
  }

  if (!slug) {
    const params = new URLSearchParams(search || '');
    const paramSlug = params.get('slug');
    if (paramSlug) {
      slug = paramSlug;
    }
  }

  if (!slug) return null;
  slug = decodeURIComponent(slug);
  slug = slug.replace(/\.html$/i, '');
  slug = slug.replace(/[^a-zA-Z0-9-_]/g, '-');
  return slug || null;
}
