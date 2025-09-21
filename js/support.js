// Utility helpers for device/browser capability detection.
// detectSupport() returns environment metadata used to determine AR readiness.

let cachedResult = null;

export function detectSupport(overrides = {}) {
  if (!cachedResult) {
    cachedResult = computeSupport();
  }
  return { ...cachedResult, ...overrides };
}

function computeSupport() {
  const ua = navigator.userAgent || "";
  const isIOS = /iP(ad|hone|od)/.test(ua);
  const iOSVersion = isIOS ? parseIOSVersion(ua) : null;
  const isAndroid = /Android/.test(ua);
  const androidVersion = isAndroid ? parseAndroidVersion(ua) : null;

  return {
    isIOS,
    iOSVersion,
    isAndroid,
    androidVersion,
    hasWebGL: detectWebGL(),
    hasCamera: detectCamera(),
    supportsAPNG: detectAPNGSupport() ?? false
  };
}

function parseIOSVersion(ua) {
  const match = ua.match(/OS (\d+)_?(\d+)?_?(\d+)?/);
  if (!match) return null;
  const parts = match.slice(1).filter(Boolean).map((part) => parseInt(part, 10));
  if (!parts.length) return null;
  const [major, minor = 0] = parts;
  return Number(`${major}.${minor}`);
}

function parseAndroidVersion(ua) {
  const match = ua.match(/Android\s([0-9]+(?:\.[0-9]+)?)/i);
  if (!match) return null;
  return parseFloat(match[1]);
}

function detectWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    );
  } catch (error) {
    console.warn('[support] WebGL detection failed', error);
    return false;
  }
}

function detectCamera() {
  return !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

let cachedAPNGSupport = null;
let apngPromise = null;
const APNG_DATA_URL = 'data:image/apng;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACGFjVEwAAAACAAAAAPONk3AAAAAaZmNUTAAAAAAAAAABAAAAAQAAAAAAAAAAAAEACgAAWn8w0AAAAAtJREFUeJxjYAACAAAFAAF6Xqs/AAAAGmZjVEwAAAABAAAAAQAAAAEAAAAAAAAAAAABAAoAAMEM2gQAAAARZmRBVAAAAAJ4nGP4z8DwHwAFAAH/mpWTZAAAAABJRU5ErkJggg==';
function detectAPNGSupport() {
  if (cachedAPNGSupport !== null) return cachedAPNGSupport;
  if (!apngPromise) {
    apngPromise = runAPNGTest()
      .then((result) => {
        cachedAPNGSupport = result;
        return result;
      })
      .catch((error) => {
        console.warn('[support] APNG detection failed', error);
        cachedAPNGSupport = false;
        return false;
      });
  }
  return cachedAPNGSupport;
}

export function waitForAPNGSupport() {
  if (cachedAPNGSupport !== null) {
    return Promise.resolve(cachedAPNGSupport);
  }
  if (!apngPromise) {
    detectAPNGSupport();
  }
  return apngPromise;
}

function runAPNGTest() {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(false);
      return;
    }
    const canvas = document.createElement('canvas');
    if (!canvas.getContext) {
      resolve(false);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(false);
      return;
    }
    const img = new Image();
    img.addEventListener('load', () => {
      try {
        ctx.clearRect(0, 0, 1, 1);
        ctx.drawImage(img, 0, 0);
        const first = ctx.getImageData(0, 0, 1, 1).data.slice();
        setTimeout(() => {
          try {
            ctx.clearRect(0, 0, 1, 1);
            ctx.drawImage(img, 0, 0);
            const second = ctx.getImageData(0, 0, 1, 1).data;
            const changed =
              first[0] !== second[0] ||
              first[1] !== second[1] ||
              first[2] !== second[2] ||
              first[3] !== second[3];
            resolve(changed && second[3] > 0);
          } catch (innerError) {
            console.warn('[support] APNG verification error', innerError);
            resolve(false);
          }
        }, 120);
      } catch (error) {
        console.warn('[support] APNG canvas error', error);
        resolve(false);
      }
    });
    img.addEventListener('error', () => resolve(false));
    img.src = APNG_DATA_URL;
  });
}
