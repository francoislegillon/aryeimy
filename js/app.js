// Entry point for the AR QR Gallery experience.
// Handles capability detection, slug routing, and manifest loading before AR boot logic is added.

import { detectSupport, waitForAPNGSupport } from './support.js';
import { getSlugFromPath } from './router.js';
import { fetchManifest, ManifestError } from './manifest.js';
import { preloadAssets } from './preload.js';
import { buildOverlays, setOverlayVisibility } from './overlays.js';

const STATUS_TONES = ['info', 'error', 'success', 'loading'];

const state = {
  support: null,
  evaluation: null,
  slug: null,
  manifest: null,
  preload: null,
  arStarted: false,
  overlayPlanes: [],
  overlayEntries: [],
  trackingLossTimer: null,
  warnings: []
};

const instructionsState = {
  container: null,
  text: null,
  link: null,
  defaultText: ''
};

const appBaseUrl =
  typeof window !== 'undefined'
    ? (() => {
        try {
          return new URL('./', window.location.href).toString();
        } catch (error) {
          console.warn('[app] Failed to determine app base URL', error);
          return window.location.href;
        }
      })()
    : null;

let arLibsPromise = null;

const preloaderEls = {
  container: null,
  bar: null,
  fill: null,
  detail: null
};

export async function init() {
  state.support = detectSupport();
  const overrides = readSupportOverrides();
  state.evaluation = evaluateSupport(state.support, overrides);

  const initialSlug = getSlugFromPath(window.location);
  state.slug = initialSlug;
  ensureCanonicalUrl(initialSlug);

  exposeDebugState();
  applySupportClasses(state.evaluation.supported);
  renderFallback(state.evaluation);
  renderStatus(state.evaluation);

  if (!state.evaluation.supported) {
    return;
  }

  await resolveSlugAndManifest();
}

async function resolveSlugAndManifest() {
  state.slug = getSlugFromPath(window.location);
  ensureCanonicalUrl(state.slug);
  state.preload = null;
  state.arStarted = false;
  state.overlayPlanes = [];
  state.overlayEntries = [];
  clearTrackingLossTip();
  clearWarnings();
  updateFooterLink(null);
  hideErrorView();
  updateFallbackVideo(null);
  setInstructionsDefault();

  if (!state.slug) {
    setStatus(
      'info',
      'Device ready. Append “/ar/<slug>” to load an artwork.',
      'Tip: try /ar/demo while developing locally.'
    );
    return;
  }

  setStatus('loading', `Loading artwork manifest for “${state.slug}”…`);

  try {
    const manifest = await fetchManifest(state.slug);
    state.manifest = manifest;
    updateTitle(manifest.title);
    hideErrorView();
    updateFooterLink(manifest.aboutLink);
    updateFallbackVideo(manifest);
    exposeDebugState();
    await preloadForManifest(manifest);
    if (!state.preload) {
      return;
    }
    await startARScene();
  } catch (error) {
    handleManifestError(error);
    state.manifest = null;
    exposeDebugState();
  }
}

function ensureCanonicalUrl(slug) {
  if (!slug || typeof history.replaceState !== 'function') {
    return;
  }

  const { pathname, search, hash } = window.location;
  const pathSegments = pathname.split('/');
  const arIndex = pathSegments.findIndex((segment) => segment === 'ar');
  let baseSegments;

  if (arIndex !== -1) {
    baseSegments = pathSegments.slice(0, arIndex + 1);
  } else {
    baseSegments = pathSegments.slice();
    while (baseSegments.length > 1 && baseSegments[baseSegments.length - 1] === '') {
      baseSegments.pop();
    }
    baseSegments.push('ar');
  }

  const normalizedBaseSegments = baseSegments.filter(
    (segment, index) => index === 0 || segment
  );

  if (normalizedBaseSegments.length === 0 || normalizedBaseSegments[0] !== '') {
    normalizedBaseSegments.unshift('');
  }

  const canonicalSegments = [...normalizedBaseSegments, encodeURIComponent(slug), ''];
  const canonicalPath = canonicalSegments.join('/');

  const params = new URLSearchParams(search || '');
  const hasSlugParam = params.has('slug');
  params.delete('slug');
  const nextSearch = params.toString();
  const nextUrl = `${canonicalPath}${nextSearch ? `?${nextSearch}` : ''}${hash || ''}`;

  if (pathname === canonicalPath && !hasSlugParam) {
    return;
  }

  history.replaceState(null, '', nextUrl);
}

function readSupportOverrides() {
  const params = new URLSearchParams(window.location.search);
  const force = params.get('forceUnsupported');
  return {
    forceUnsupported: force === '1' || force === 'true'
  };
}

function evaluateSupport(flags, overrides) {
  const reasons = [];

  if (overrides.forceUnsupported) {
    reasons.push('Forced unsupported mode (testing override).');
  } else {
    if (flags.isIOS) {
      const version = flags.iOSVersion ?? 0;
      if (version < 15) {
        reasons.push('iOS 15 or newer is required for WebAR camera access.');
      }
    }

    if (flags.isAndroid) {
      const version = flags.androidVersion ?? 0;
      if (version && version < 9) {
        reasons.push('Android 9 (Pie) or newer is required for WebAR.');
      }
    }

    if (!flags.hasWebGL) {
      reasons.push('WebGL support is required to render augmented overlays.');
    }

    if (!flags.hasCamera) {
      reasons.push('A compatible rear camera is required to start the AR experience.');
    }
  }

  return {
    supported: reasons.length === 0,
    reasons,
    flags,
    overrides
  };
}

function applySupportClasses(isSupported) {
  const body = document.body;
  body.classList.toggle('supported', isSupported);
  body.classList.toggle('unsupported', !isSupported);
  const flags = state.support;
  body.setAttribute(
    'data-support-flags',
    JSON.stringify({
      isIOS: flags.isIOS,
      iOSVersion: flags.iOSVersion,
      isAndroid: flags.isAndroid,
      androidVersion: flags.androidVersion,
      hasWebGL: flags.hasWebGL,
      hasCamera: flags.hasCamera,
      supportsAPNG: flags.supportsAPNG
    })
  );
}

function renderStatus(evaluation) {
  if (evaluation.supported) {
    setStatus(
      'info',
      'Device ready. Load an artwork QR slug to launch the augmented experience.'
    );
  } else {
    setStatus(
      'error',
      'This device cannot run the full augmented reality view yet. See guidance below.'
    );
  }
}

function setStatus(tone, message, detail = '') {
  const statusEl = document.querySelector('.status');
  if (!statusEl) return;

  STATUS_TONES.forEach((name) => statusEl.classList.remove(`status--${name}`));
  if (tone) {
    statusEl.classList.add(`status--${tone}`);
  }

  const messageEl = document.getElementById('statusMessage');
  if (messageEl) {
    messageEl.textContent = message;
  }

  const detailEl = document.getElementById('statusDetail');
  if (detailEl) {
    if (detail) {
      detailEl.textContent = detail;
      detailEl.removeAttribute('hidden');
    } else {
      detailEl.textContent = '';
      detailEl.setAttribute('hidden', '');
    }
  }
}

function renderFallback(evaluation) {
  const fallbackEl = document.getElementById('fallback');
  if (!fallbackEl) return;

  if (evaluation.supported) {
    fallbackEl.setAttribute('hidden', '');
    const list = fallbackEl.querySelector('#fallbackReasons');
    if (list) list.innerHTML = '';
    return;
  }

  fallbackEl.removeAttribute('hidden');
  const description = document.getElementById('fallbackDescription');
  if (description) {
    if (evaluation.overrides.forceUnsupported) {
      description.textContent =
        'Fallback view enabled manually for debugging. Replace the query parameter to return to normal mode.';
    } else {
      description.textContent =
        'Your browser doesn\'t support the full augmented reality experience yet. Watch the short demo below and try again on a compatible device.';
    }
  }

  const list = fallbackEl.querySelector('#fallbackReasons');
  if (list) {
    list.innerHTML = '';
    if (evaluation.reasons.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Unknown capability issue prevented the AR experience.';
      list.appendChild(li);
    } else {
      evaluation.reasons.forEach((reason) => {
        const li = document.createElement('li');
        li.textContent = reason;
        list.appendChild(li);
      });
    }
  }
}

function handleManifestError(error) {
  console.error('[app] Manifest load failed', error);
  hidePreloader();
  state.arStarted = false;
  clearTrackingLossTip();
  clearWarnings();
  updateFooterLink(null);
  updateFallbackVideo(null);
  let detail = 'Unexpected error while loading the artwork manifest.';
  if (error instanceof ManifestError) {
    detail = error.message;
  }
  if (state.slug) {
    detail = `${detail} (looked for /ar/${state.slug}/manifest.json)`;
  }
  if (error instanceof ManifestError && error.status === 404) {
    showManifestNotFound(state.slug);
    setStatus(
      'error',
      'Artwork not found.',
      `We couldn’t locate an artwork called “${state.slug}”. Check the QR code or try again later.`
    );
  } else {
    hideErrorView();
    setStatus('error', 'Unable to load artwork manifest.', detail);
  }
}


async function preloadForManifest(manifest) {
  const supportsAPNG = await waitForAPNGSupport();
  state.support.supportsAPNG = supportsAPNG;
  applySupportClasses(state.evaluation.supported);
  showPreloader();
  setStatus(
    'loading',
    `Preloading assets for “${manifest.title}”…`,
    'Ensuring all overlays are ready before activating the camera.'
  );
  try {
    const resources = await preloadAssets(manifest, {
      supportsAPNG,
      onProgress: handlePreloaderProgress
    });
    state.preload = resources;
    exposeDebugState();
    handlePreloadWarnings(resources);
    hidePreloader();
    setStatus(
      'loading',
      `Assets ready for “${manifest.title}”.`,
      'Initializing camera…'
    );
  } catch (error) {
    console.error('[app] Preload failed', error);
    state.preload = null;
    state.arStarted = false;
    state.overlayPlanes = [];
    state.overlayEntries = [];
    exposeDebugState();
    markPreloaderError(error.message || 'Unknown preload error.');
    setStatus(
      'error',
      'Failed to preload AR assets.',
      error.message || 'Unknown preload error.'
    );
  }
}

async function startARScene() {
  if (!state.manifest || !state.preload || state.arStarted) {
    return;
  }
  const container = document.getElementById('arShell');
  const sceneEl = container ? container.querySelector('a-scene') : null;
  const targetRoot = document.getElementById('targetRoot');
  if (!container || !sceneEl || !targetRoot) {
    console.warn('[app] Missing AR scene container elements.');
    return;
  }

  await ensureARLibsLoaded();

  let containerVisible = false;
  const showContainer = () => {
    if (!containerVisible) {
      container.removeAttribute('hidden');
      container.classList.add('ar-shell--active');
      containerVisible = true;
    }
  };
  const hideContainer = () => {
    if (containerVisible) {
      container.setAttribute('hidden', '');
      container.classList.remove('ar-shell--active');
      containerVisible = false;
    }
  };

  showContainer();

  try {
    await waitForSceneReady(sceneEl);

    const targetUrl = state.preload.target.url;
    sceneEl.setAttribute('mindar-image', `autoStart: true; imageTargetSrc: ${targetUrl}`);
    targetRoot.setAttribute('mindar-image-target', 'targetIndex: 0');
    setInstructionsDefault();
    clearTrackingLossTip();

    const overlayResources = Array.isArray(state.preload.overlays) ? state.preload.overlays : [];
    if (overlayResources.length) {
      const entries = buildOverlays(overlayResources);
      const planes = entries.map((entry) => entry.plane);
      targetRoot.replaceChildren(...planes);
      state.overlayEntries = entries;
      state.overlayPlanes = planes;
      planes.forEach((plane) => setOverlayVisibility(plane, false));
    } else {
      targetRoot.replaceChildren();
      state.overlayEntries = [];
      state.overlayPlanes = [];
    }
    setupTrackingEvents(targetRoot);

    try {
      await startMindARScene(sceneEl);
      state.arStarted = true;
      exposeDebugState();
      setInstructionsDefault();
      setStatus(
        'success',
        `Camera active for “${state.manifest.title}”.`,
        'Point the device at the artwork to begin tracking.'
      );
    } catch (error) {
      console.error('[app] Failed to start AR scene', error);
      state.arStarted = false;
      exposeDebugState();
      hideContainer();
      markPreloaderError('Camera initialization failed.');
      const handled = handleCameraError(error);
      if (!handled) {
        setStatus(
          'error',
          'Unable to start the AR camera.',
          error.message || 'Check camera permissions and reload the page.'
        );
      }
    }
  } catch (error) {
    hideContainer();
    throw error;
  }
}

async function startMindARScene(sceneEl) {
  const system = sceneEl.systems ? sceneEl.systems['mindar-image-system'] : null;
  if (system && typeof system.start === 'function') {
    await system.start();
    return;
  }

  let component = sceneEl.components ? sceneEl.components['mindar-image'] : null;
  if (!component) {
    component = await waitForComponent(sceneEl, 'mindar-image');
  }
  if (component && typeof component.play === 'function') {
    const result = component.play();
    if (result && typeof result.then === 'function') {
      await result;
    }
    return;
  }

  const event = new CustomEvent('mindar-start');
  sceneEl.dispatchEvent(event);
}

async function waitForComponent(sceneEl, name, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const component = sceneEl.components ? sceneEl.components[name] : null;
    if (component) {
      return component;
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return null;
}

function setupTrackingEvents(targetRoot) {
  if (!targetRoot || targetRoot.dataset.trackingBound === 'true') {
    return;
  }
  targetRoot.dataset.trackingBound = 'true';
  targetRoot.addEventListener('targetFound', handleTargetFound);
  targetRoot.addEventListener('targetLost', handleTargetLost);
}

function updateOverlayVisibility(visible) {
  state.overlayPlanes.forEach((plane) => setOverlayVisibility(plane, visible));
}

function handleTargetFound() {
  updateOverlayVisibility(true);
  clearTrackingLossTip();
  setInstructionsDefault();
}

function handleTargetLost() {
  updateOverlayVisibility(false);
  scheduleTrackingTip();
}

function handlePreloaderProgress(event) {
  const { status, total, completed, label, attempt } = event;
  if (status === 'start') {
    updatePreloaderDetail(`Loading ${label}…`);
    return;
  }

  if (status === 'retry') {
    updatePreloaderDetail(`Retrying ${label} (attempt ${attempt})…`);
    return;
  }

  if (status === 'loaded') {
    const percent = total ? Math.round((completed / total) * 100) : 100;
    updatePreloaderBar(percent);
    if (completed >= total) {
      updatePreloaderDetail('All assets loaded.');
    } else {
      updatePreloaderDetail(`Loaded ${label}. (${completed}/${total})`);
    }
    return;
  }

  if (status === 'failed') {
    updatePreloaderBar(100);
    updatePreloaderDetail(`Failed to load ${label}.`);
  }
}

function getPreloaderElements() {
  if (!preloaderEls.container) {
    preloaderEls.container = document.getElementById('preloader');
    preloaderEls.bar = document.getElementById('preloaderBar');
    preloaderEls.fill = document.getElementById('preloaderBarFill');
    preloaderEls.detail = document.getElementById('preloaderDetail');
  }
  return preloaderEls;
}

function showPreloader() {
  const { container, fill, bar, detail } = getPreloaderElements();
  if (!container) return;
  container.classList.remove('preloader--error');
  container.removeAttribute('hidden');
  if (fill) fill.style.width = '0%';
  if (bar) bar.setAttribute('aria-valuenow', '0');
  if (detail) detail.textContent = 'Starting asset downloads…';
}

function hidePreloader() {
  const { container } = getPreloaderElements();
  if (container) {
    container.setAttribute('hidden', '');
  }
}

function markPreloaderError(message) {
  const { container, detail, fill, bar } = getPreloaderElements();
  if (!container) return;
  container.classList.add('preloader--error');
  container.removeAttribute('hidden');
  if (fill) fill.style.width = '100%';
  if (bar) bar.setAttribute('aria-valuenow', '100');
  if (detail) detail.textContent = message;
}

function updatePreloaderBar(percent) {
  const { fill, bar } = getPreloaderElements();
  const clamped = Math.min(100, Math.max(0, percent));
  if (fill) {
    fill.style.width = `${clamped}%`;
  }
  if (bar) {
    bar.setAttribute('aria-valuenow', String(clamped));
  }
}

function updatePreloaderDetail(message) {
  const { detail } = getPreloaderElements();
  if (detail) {
    detail.textContent = message;
  }
}

function handlePreloadWarnings(resources) {
  if (!resources) return;
  const failures = Array.isArray(resources.failedOverlays)
    ? resources.failedOverlays
    : [];
  failures.forEach((entry) => {
    const id = entry?.overlay?.id || 'overlay';
    addWarning(`Overlay “${id}” is unavailable.`);
  });

  const oversized = Array.isArray(resources.images)
    ? resources.images.filter((entry) => {
        const width = entry?.dimensions?.width ?? 0;
        const height = entry?.dimensions?.height ?? 0;
        return Math.max(width, height) > 1920;
      })
    : [];
  oversized.forEach((entry) => {
    const width = entry.dimensions?.width ?? 0;
    const height = entry.dimensions?.height ?? 0;
    console.warn(
      `[preload] Overlay ${entry.overlay?.id || 'unknown'} exceeds recommended resolution (${width}x${height}).`
    );
  });

  const totalBytes = resources.stats?.bytes?.total ?? 0;
  if (totalBytes > 12 * 1024 * 1024) {
    const mb = (totalBytes / (1024 * 1024)).toFixed(1);
    console.warn(`[preload] Asset budget exceeded: ${mb} MB loaded.`);
    addWarning('Asset budget exceeded');
  }
}

function getInstructionsElements() {
  if (!instructionsState.container) {
    const container = document.getElementById('arInstructions');
    if (!container) {
      return instructionsState;
    }
    instructionsState.container = container;
    instructionsState.text = container.querySelector('#arInstructionsText') || container;
    instructionsState.link = container.querySelector('#arInstructionsLink');
    const defaultText =
      container.dataset.defaultText ||
      (instructionsState.text ? instructionsState.text.textContent.trim() : container.textContent.trim()) ||
      '';
    instructionsState.defaultText = defaultText;
  }
  return instructionsState;
}

function setInstructionsDefault() {
  const { container, text, link, defaultText } = getInstructionsElements();
  if (!container || !text) return;
  text.textContent = defaultText || 'Point your camera at the artwork to begin.';
  container.classList.remove('ar-shell__instructions--active');
  if (link) {
    link.setAttribute('hidden', '');
    link.removeAttribute('href');
  }
}

function setInstructionsMessage(message, options = {}) {
  const { container, text, link } = getInstructionsElements();
  if (!container || !text || typeof message !== 'string') return;
  text.textContent = message;
  container.classList.toggle('ar-shell__instructions--active', !!options.active);
  if (link) {
    const linkOptions = options.link;
    if (linkOptions && linkOptions.href) {
      link.textContent = linkOptions.text || 'Learn more';
      link.href = linkOptions.href;
      link.target = linkOptions.target || '_blank';
      link.rel = linkOptions.rel || 'noopener noreferrer';
      link.removeAttribute('hidden');
    } else {
      link.setAttribute('hidden', '');
      link.removeAttribute('href');
      link.removeAttribute('target');
      link.removeAttribute('rel');
    }
  }
}

function scheduleTrackingTip(delayMs = 2600) {
  clearTrackingLossTip();
  state.trackingLossTimer = window.setTimeout(() => {
    const message = 'Move closer to the artwork or adjust the lighting to regain tracking.';
    setInstructionsMessage(message, { active: true });
    state.trackingLossTimer = null;
  }, delayMs);
}

function clearTrackingLossTip() {
  if (state.trackingLossTimer) {
    window.clearTimeout(state.trackingLossTimer);
    state.trackingLossTimer = null;
  }
}

function clearWarnings() {
  state.warnings = [];
  renderWarnings();
  exposeDebugState();
}

function addWarning(message) {
  if (!message) return;
  if (state.warnings.includes(message)) {
    return;
  }
  state.warnings.push(message);
  renderWarnings();
  exposeDebugState();
}

function renderWarnings() {
  const container = document.getElementById('arWarnings');
  if (!container) return;
  container.innerHTML = '';
  if (!state.warnings.length) {
    container.setAttribute('hidden', '');
    return;
  }
  container.removeAttribute('hidden');
  state.warnings.forEach((warning) => {
    const pill = document.createElement('span');
    pill.className = 'ar-warning';
    pill.textContent = warning;
    container.appendChild(pill);
  });
}

function showManifestNotFound(slug) {
  const view = document.getElementById('errorView');
  if (!view) return;
  const title = document.getElementById('errorTitle');
  const description = document.getElementById('errorDescription');
  if (title) {
    title.textContent = 'Artwork not found';
  }
  if (description) {
    if (slug) {
      description.textContent = `We couldn’t find an artwork called “${slug}”. Double-check the QR code or contact the curator.`;
    } else {
      description.textContent = 'We couldn’t find that artwork. Double-check the QR code or contact the curator.';
    }
  }
  view.removeAttribute('hidden');
}

function hideErrorView() {
  const view = document.getElementById('errorView');
  if (view) {
    view.setAttribute('hidden', '');
  }
}

function updateFooterLink(url) {
  const footer = document.getElementById('arFooter');
  const link = document.getElementById('aboutLink');
  if (!footer || !link) return;
  if (url) {
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    footer.removeAttribute('hidden');
  } else {
    link.removeAttribute('href');
    link.removeAttribute('target');
    link.removeAttribute('rel');
    footer.setAttribute('hidden', '');
  }
}

function updateFallbackVideo(manifest) {
  const container = document.querySelector('#fallback .fallback-video');
  if (!container) return;
  const placeholder = container.querySelector('.fallback-video__placeholder');
  const existingVideo = container.querySelector('video');
  if (!manifest || !manifest.fallbackVideo) {
    if (existingVideo) {
      existingVideo.remove();
    }
    if (placeholder) {
      placeholder.removeAttribute('hidden');
    }
    return;
  }

  const url = resolveManifestAsset(manifest.fallbackVideo);
  if (!url) return;

  let video = existingVideo;
  if (!video) {
    video = document.createElement('video');
    video.className = 'fallback-video__player';
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.controls = true;
    video.loop = true;
    video.setAttribute('loop', '');
    video.muted = true;
    video.setAttribute('muted', '');
    container.appendChild(video);
  }
  video.src = url;
  video.load();
  video.removeAttribute('hidden');
  if (placeholder) {
    placeholder.setAttribute('hidden', '');
  }
}

function handleCameraError(error) {
  const name = error?.name || '';
  const message = error?.message || '';
  const denied = /NotAllowedError|Permission|denied/i.test(name) || /denied/i.test(message);
  if (!denied) {
    return false;
  }

  const fallbackUrl = resolveManifestAsset(state.manifest?.fallbackVideo);
  setStatus(
    'error',
    'Camera permission required.',
    fallbackUrl
      ? 'Enable camera access in your browser settings or watch the fallback video instead.'
      : 'Enable camera access in your browser settings and reload the page.'
  );
  setInstructionsMessage('Camera access is required to view this experience.', {
    active: true,
    link: fallbackUrl
      ? {
          href: fallbackUrl,
          text: 'Watch the fallback video'
        }
      : null
  });
  if (fallbackUrl) {
    addWarning('Camera access denied — showing fallback video link.');
  } else {
    addWarning('Camera access denied.');
  }
  return true;
}

function resolveManifestAsset(path) {
  if (!path || !state.manifest) return null;
  try {
    return new URL(path, state.manifest.url || window.location.href).toString();
  } catch (error) {
    console.warn('[app] Failed to resolve manifest asset URL', path, error);
    return path;
  }
}

async function ensureARLibsLoaded() {
  if (window.AFRAME && window.AFRAME.components && window.AFRAME.components['mindar-image']) {
    return;
  }
  if (!arLibsPromise) {
    arLibsPromise = (async () => {
      const aframeUrl = resolveScriptUrl('./libs/aframe.min.js');
      const mindarUrl = resolveScriptUrl('./libs/mindar-image-aframe.prod.js');
      await loadScript(aframeUrl);
      await loadScript(mindarUrl);
    })();
  }
  await arLibsPromise;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-dynamic-src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset.dynamicSrc = src;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error(`Failed to load script ${src}`)));
    document.head.appendChild(script);
  });
}

function resolveScriptUrl(path) {
  if (!path) return path;
  const base = appBaseUrl || (typeof window !== 'undefined' ? window.location.href : undefined);
  try {
    return base ? new URL(path, base).toString() : path;
  } catch (error) {
    console.warn('[app] Failed to resolve script URL', path, error);
    return path;
  }
}

async function waitForSceneReady(sceneEl) {
  if (!sceneEl) return;
  if (sceneEl.hasLoaded) return;
  await new Promise((resolve) => {
    sceneEl.addEventListener('loaded', resolve, { once: true });
  });
}

function updateTitle(title) {
  const appTitle = document.getElementById('appTitle');
  if (appTitle) {
    appTitle.textContent = title;
  }
  if (typeof document !== 'undefined') {
    document.title = `${title} · AR QR Gallery`;
  }
}

function exposeDebugState() {
  window.__AR_QR_GALLERY__ = {
    support: state.support,
    evaluation: state.evaluation,
    slug: state.slug,
    manifest: state.manifest,
    preload: state.preload,
    arStarted: state.arStarted,
    overlays: state.overlayEntries.map((entry) => entry.overlay.id),
    warnings: [...state.warnings]
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init().catch((error) => console.error('[app] Initialization failed', error));
  });
} else {
  init().catch((error) => console.error('[app] Initialization failed', error));
}
