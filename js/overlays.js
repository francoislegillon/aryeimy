// Overlay helpers for building A-Frame planes from manifest definitions.

export function buildOverlayPlane(overlay, resource, zOffset = 0) {
  if (!overlay || !resource) {
    throw new Error('Overlay resources missing');
  }
  const plane = document.createElement('a-plane');
  plane.classList.add('overlay-plane');
  plane.dataset.overlayId = overlay.id;
  plane.dataset.overlayKind = resource.source.kind;
  plane.setAttribute('material', buildMaterialAttribute(resource.url));
  plane.setAttribute('position', formatVector(overlay.position, zOffset));
  plane.setAttribute('scale', formatVector(overlay.scale));
  plane.setAttribute('data-z-index', String(overlay.zIndex ?? 0));
  plane.dataset.zOffset = String(zOffset);
  plane.style.zIndex = String((overlay.zIndex ?? 0) + 100);
  plane.style.opacity = '0';
  plane.style.transition = 'opacity 220ms ease';

  const imageEl = createFallbackImage(resource.image, overlay);
  plane.appendChild(imageEl);
  return plane;
}

export function setOverlayVisibility(plane, visible) {
  if (!plane) return;
  if (visible) {
    plane.classList.add('overlay-plane--visible');
    plane.style.opacity = '1';
  } else {
    plane.classList.remove('overlay-plane--visible');
    plane.style.opacity = '0';
  }
}

function buildMaterialAttribute(url) {
  return `src: ${url}; transparent: true; alphaTest: 0.001; side: double; magFilter: linear; minFilter: linearMipMapLinear`;
}

function createFallbackImage(image, overlay) {
  const img = document.createElement('img');
  img.classList.add('overlay-plane__img');
  if (image instanceof HTMLImageElement) {
    img.src = image.src;
  } else {
    img.src = overlay?.sources?.original || overlay?.sources?.png || '';
  }
  img.alt = overlay?.id || 'Overlay';
  img.decoding = 'async';
  img.loading = 'eager';
  img.setAttribute('aria-hidden', 'true');
  return img;
}

function formatVector(values = [], extraZ = 0) {
  if (!Array.isArray(values)) return '0 0 0';
  const padded = [...values];
  while (padded.length < 3) {
    padded.push(0);
  }
  if (padded.length >= 3) {
    padded[2] = Number(padded[2]) + extraZ;
  }
  return padded.slice(0, 3).map((value) => Number(value).toFixed(3)).join(' ');
}

export function buildOverlays(resources, options = {}) {
  if (!Array.isArray(resources)) return [];
  const step = options.step ?? 0.001;
  const sorted = [...resources].sort((a, b) => {
    const aIndex = a.overlay?.zIndex ?? 0;
    const bIndex = b.overlay?.zIndex ?? 0;
    return aIndex - bIndex;
  });
  return sorted.map((resource, index) => {
    const zOffset = index * step;
    const plane = buildOverlayPlane(resource.overlay, resource, zOffset);
    return {
      overlay: resource.overlay,
      resource,
      plane,
      zOffset
    };
  });
}
