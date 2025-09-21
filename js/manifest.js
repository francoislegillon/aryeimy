// Manifest fetching and validation helpers.
// Responsible for downloading `/ar/<slug>/manifest.json` and normalizing its structure.

export class ManifestError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ManifestError';
    this.status = options.status ?? null;
    this.details = options.details ?? null;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

export async function fetchManifest(slug) {
  if (!slug) {
    throw new ManifestError('Cannot load manifest without a slug.');
  }

  const url = buildManifestUrl(slug);

  let response;
  try {
    response = await fetch(url, { cache: 'no-cache' });
  } catch (error) {
    throw new ManifestError('Network error while fetching the artwork manifest.', {
      cause: error
    });
  }

  if (!response.ok) {
    throw new ManifestError(`Manifest not found (HTTP ${response.status}).`, {
      status: response.status
    });
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new ManifestError('Manifest file is not valid JSON.', { cause: error });
  }

  const manifest = validateManifest(data, { slug, url });
  return { ...manifest, url };
}

export function validateManifest(data, { slug = null } = {}) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ManifestError('Manifest must be a JSON object.');
  }

  const errors = [];

  const title = ensureString(data.title);
  if (!title) {
    errors.push('`title` must be a non-empty string.');
  }

  const target = ensureString(data.target);
  if (!target) {
    errors.push('`target` is required and must point to a MindAR descriptor file.');
  }

  const overlays = normalizeOverlays(data.overlays, errors);
  const aboutLink = ensureString(data.aboutLink) || null;
  const fallbackVideo = ensureString(data.fallbackVideo) || null;

  if (errors.length) {
    throw new ManifestError(errors.join(' '));
  }

  return {
    slug,
    title,
    target,
    overlays,
    aboutLink,
    fallbackVideo
  };
}

function normalizeOverlays(overlays, errors) {
  if (overlays === undefined) {
    return [];
  }
  if (!Array.isArray(overlays)) {
    errors.push('`overlays` must be an array.');
    return [];
  }

  return overlays
    .map((overlay, index) => normalizeOverlay(overlay, index, errors))
    .filter(Boolean);
}


function normalizeOverlay(overlay, index, errors) {
  if (!overlay || typeof overlay !== 'object') {
    errors.push(`Overlay at index ${index} must be an object.`);
    return null;
  }

  const id = ensureString(overlay.id) || `overlay-${index}`;
  const sources = normalizeOverlaySources(overlay.url, index, errors);
  const zIndex = typeof overlay.zIndex === 'number' ? overlay.zIndex : 0;
  const position = normalizeVector(overlay.position, [0, 0, 0]);
  const scale = normalizeVector(overlay.scale, [1, 1, 1]);
  const loop = overlay.loop !== false;

  return {
    id,
    sources,
    zIndex,
    position,
    scale,
    loop
  };
}

function normalizeOverlaySources(urlField, index, errors) {
  if (typeof urlField === 'string') {
    return {
      apng: null,
      gif: null,
      png: urlField,
      original: urlField
    };
  }

  if (!urlField || typeof urlField !== 'object') {
    errors.push(`Overlay ${index} missing url definitions.`);
    return {
      apng: null,
      gif: null,
      png: null,
      original: null
    };
  }

  const apng = ensureString(urlField.apng) || null;
  const gif = ensureString(urlField.gif) || null;
  const png = ensureString(urlField.png) || ensureString(urlField.static) || null;
  const original = ensureString(urlField.url) || apng || gif || png;

  if (!apng && !gif && !png && !original) {
    errors.push(`Overlay ${index} requires at least one asset url.`);
  }

  return { apng, gif, png, original };
}

function normalizeVector(value, fallback) {
  if (!Array.isArray(value) || value.length < 3) {
    return [...fallback];
  }
  return value.slice(0, 3).map((component, idx) => {
    const parsed = Number(component);
    if (Number.isNaN(parsed)) {
      return fallback[idx] ?? 0;
    }
    return parsed;
  });
}

function ensureString(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return null;
}

function buildManifestUrl(slug) {
  const sanitized = encodeURIComponent(slug);
  const relative = `ar/${sanitized}/manifest.json`;
  const base = `${window.location.origin}/`;
  return new URL(relative, base).toString();
}
