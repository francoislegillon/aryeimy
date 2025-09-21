// Asset preloading utilities. Fetches target descriptors and overlay images before AR starts.

export class AssetLoadError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'AssetLoadError';
    this.context = context;
    if (context.cause) {
      this.cause = context.cause;
    }
  }
}

export async function preloadAssets(manifest, options = {}) {
  if (!manifest) {
    throw new AssetLoadError('Cannot preload assets without a manifest.');
  }

  const supportsAPNG = options.supportsAPNG ?? false;
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  const overlayTasks = buildOverlayTasks(manifest, supportsAPNG);
  const total = 1 + overlayTasks.length;
  const tracker = createProgressTracker(total, onProgress);
  const startedAt = performance.now();

  const targetUrl = resolveAssetUrl(manifest.target, manifest.url);
  const targetBuffer = await loadAsset({
    label: 'Target descriptor',
    url: targetUrl,
    tracker,
    loader: () => fetchBinary(targetUrl)
  });

  const overlayResources = [];
  const failedOverlays = [];
  let overlayBytes = 0;
  for (const task of overlayTasks) {
    const absoluteUrl = resolveAssetUrl(task.source.url, manifest.url);
    const label = `Overlay ${task.overlay.id} (${task.source.kind})`;
    try {
      const imageResult = await loadAsset({
        label,
        url: absoluteUrl,
        tracker,
        loader: () => loadImageAsset(absoluteUrl)
      });
      overlayBytes += imageResult.byteLength ?? 0;
      overlayResources.push({
        overlay: task.overlay,
        source: task.source,
        url: absoluteUrl,
        image: imageResult.image,
        byteLength: imageResult.byteLength ?? 0,
        dimensions: { width: imageResult.width, height: imageResult.height }
      });
    } catch (error) {
      failedOverlays.push({ overlay: task.overlay, source: task.source, error });
      console.warn('[preload] Overlay skipped after retries', {
        overlay: task.overlay?.id,
        kind: task.source?.kind,
        error
      });
    }
  }

  const durationMs = performance.now() - startedAt;
  const targetBytes = targetBuffer ? targetBuffer.byteLength : 0;
  const totalBytes = targetBytes + overlayBytes;
  console.info('[preload] Assets ready', {
    totalAssets: total,
    overlays: overlayResources.length,
    durationMs: Math.round(durationMs),
    bytes: {
      total: totalBytes,
      target: targetBytes,
      overlays: overlayBytes
    }
  });

  return {
    target: { url: targetUrl, buffer: targetBuffer },
    targetBuffer,
    overlays: overlayResources,
    failedOverlays,
    images: overlayResources.map((entry) => ({
      overlay: entry.overlay,
      image: entry.image,
      url: entry.url,
      source: entry.source,
      byteLength: entry.byteLength,
      dimensions: entry.dimensions
    })),
    stats: {
      totalAssets: total,
      durationMs,
      bytes: {
        total: totalBytes,
        target: targetBytes,
        overlays: overlayBytes
      }
    }
  };
}

function buildOverlayTasks(manifest, supportsAPNG) {
  if (!Array.isArray(manifest.overlays)) return [];
  return manifest.overlays
    .map((overlay) => {
      const source = selectOverlaySource(overlay, supportsAPNG);
      if (!source) {
        console.warn('[preload] Overlay skipped due to missing asset definitions', overlay);
        return null;
      }
      return { overlay, source };
    })
    .filter(Boolean);
}

function selectOverlaySource(overlay, supportsAPNG) {
  if (!overlay || typeof overlay !== 'object') return null;
  const sources = overlay.sources || {};
  const ordered = [
    supportsAPNG && sources.apng ? { url: sources.apng, kind: 'apng' } : null,
    sources.gif ? { url: sources.gif, kind: 'gif' } : null,
    sources.png ? { url: sources.png, kind: 'png' } : null,
    sources.original ? { url: sources.original, kind: 'fallback' } : null
  ].filter(Boolean);
  return ordered[0] || null;
}

function resolveAssetUrl(path, manifestUrl) {
  if (!path) return null;
  try {
    return new URL(path, manifestUrl || window.location.href).toString();
  } catch (error) {
    console.warn('[preload] Failed to resolve asset URL', path, error);
    return path;
  }
}

function createProgressTracker(total, onProgress) {
  let completed = 0;
  const emit = (status, payload = {}) => {
    if (!onProgress) return;
    onProgress({ status, total, completed, ...payload });
  };
  return {
    start(label) {
      emit('start', { label });
    },
    retry(label, attempt, error) {
      emit('retry', { label, attempt, error });
    },
    success(label) {
      completed += 1;
      emit('loaded', { label, completed });
    },
    fail(label, error) {
      emit('failed', { label, error });
    }
  };
}

async function loadAsset({ label, loader, tracker, url, maxAttempts = 2 }) {
  let attempt = 0;
  let lastError = null;
  tracker.start(label);
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const result = await loader();
      tracker.success(label);
      return result;
    } catch (error) {
      lastError = error;
      console.warn(
        `[preload] ${label} failed (attempt ${attempt}/${maxAttempts})`,
        url,
        error
      );
      if (attempt < maxAttempts) {
        tracker.retry(label, attempt + 1, error);
      }
    }
  }

  tracker.fail(label, lastError);
  throw new AssetLoadError(`${label} failed to load`, {
    url,
    cause: lastError
  });
}

async function fetchBinary(url) {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) {
    throw new AssetLoadError(`Request failed with status ${response.status}`, {
      url,
      status: response.status
    });
  }
  return response.arrayBuffer();
}

async function loadImageAsset(url) {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) {
    throw new AssetLoadError(`Request failed with status ${response.status}`, {
      url,
      status: response.status
    });
  }
  const buffer = await response.arrayBuffer();
  const byteLength = buffer.byteLength;
  const type = response.headers.get('content-type') || 'image/png';
  const blob = new Blob([buffer], { type });
  const objectUrl = URL.createObjectURL(blob);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };
    const finalize = () => {
      cleanup();
      resolve({
        image: img,
        byteLength,
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };

    img.onload = () => {
      if (typeof img.decode === 'function') {
        img
          .decode()
          .then(finalize)
          .catch((error) => {
            console.warn('[preload] decode warning', url, error);
            finalize();
          });
      } else {
        finalize();
      }
    };
    img.onerror = () => {
      cleanup();
      reject(new AssetLoadError('Image failed to load', { url }));
    };
    img.src = objectUrl;
  });
}
