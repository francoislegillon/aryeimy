// Enhanced debug version of app.js
console.log("[APP] Starting enhanced debug app.js");

// Debug helper
function debugLog(message) {
  const timestamp = new Date().toLocaleTimeString();
  const debugDiv = document.getElementById("debugLog");
  if (debugDiv) {
    debugDiv.innerHTML += `[${timestamp}] APP: ${message}<br>`;
    debugDiv.scrollTop = debugDiv.scrollHeight;
  }
  console.log(`[APP] ${message}`);
}

// Check initial state
debugLog("Script loaded, checking environment...");
debugLog(
  `A-Frame version: ${window.AFRAME ? window.AFRAME.version : "NOT LOADED"}`
);

// Wait for A-Frame to be ready
document.addEventListener("DOMContentLoaded", () => {
  debugLog("DOM ready, checking A-Frame again...");

  if (window.AFRAME) {
    debugLog(`A-Frame available: ${window.AFRAME.version}`);

    // Check if MindAR components are registered
    const hasImageSystem = window.AFRAME.systems["mindar-image-system"];
    const hasImageComponent = window.AFRAME.components["mindar-image"];
    const hasTargetComponent = window.AFRAME.components["mindar-image-target"];

    debugLog(`MindAR system: ${hasImageSystem ? "YES" : "NO"}`);
    debugLog(`MindAR component: ${hasImageComponent ? "YES" : "NO"}`);
    debugLog(`MindAR target: ${hasTargetComponent ? "YES" : "NO"}`);
  } else {
    debugLog("A-Frame NOT available yet");
  }

  // Initialize the app
  initializeApp();
});

async function initializeApp() {
  debugLog("initializeApp() called");

  try {
    // Get the manifest
    debugLog("Fetching manifest...");
    const manifestResponse = await fetch("./manifest.json");
    debugLog(`Manifest response status: ${manifestResponse.status}`);

    if (!manifestResponse.ok) {
      throw new Error(`Manifest fetch failed: ${manifestResponse.status}`);
    }

    const manifest = await manifestResponse.json();
    debugLog(`Manifest loaded: ${manifest.artworks?.length || 0} artworks`);

    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const artworkId =
      urlParams.get("artwork") ||
      window.location.pathname.split("/").pop() ||
      "paramo";
    debugLog(`Looking for artwork: ${artworkId}`);

    // Find the artwork
    const artwork = manifest.artworks.find((art) => art.id === artworkId);
    if (!artwork) {
      debugLog(`Artwork ${artworkId} not found in manifest`);
      showError(
        "Artwork not found",
        "The requested artwork could not be found."
      );
      return;
    }

    debugLog(`Found artwork: ${artwork.title}`);

    // Start the AR experience
    await startARExperience(artwork);
  } catch (error) {
    debugLog(`Error in initializeApp: ${error.message}`);
    console.error("App initialization error:", error);
    showError("Loading error", error.message);
  }
}

async function startARExperience(artwork) {
  debugLog(`startARExperience called for: ${artwork.title}`);

  try {
    // Show preloader
    showPreloader();
    updatePreloaderProgress(10, "Loading AR target...");

    // Load the target file
    debugLog(`Loading target file: ${artwork.targets.image}`);
    const targetResponse = await fetch(artwork.targets.image);
    debugLog(
      `Target response: ${
        targetResponse.status
      }, size: ${targetResponse.headers.get("content-length")} bytes`
    );

    if (!targetResponse.ok) {
      throw new Error(`Target file fetch failed: ${targetResponse.status}`);
    }

    const targetBuffer = await targetResponse.arrayBuffer();
    debugLog(`Target loaded: ${targetBuffer.byteLength} bytes`);
    updatePreloaderProgress(50, "Configuring AR system...");

    // Get the scene
    const scene = document.getElementById("mainScene");
    if (!scene) {
      throw new Error("AR scene element not found");
    }

    debugLog("Scene found, checking if ready...");

    // Wait for scene to be ready
    await new Promise((resolve) => {
      if (scene.hasLoaded) {
        debugLog("Scene already loaded");
        resolve();
      } else {
        debugLog("Waiting for scene to load...");
        scene.addEventListener(
          "loaded",
          () => {
            debugLog("Scene loaded event received");
            resolve();
          },
          { once: true }
        );
      }
    });

    updatePreloaderProgress(75, "Initializing AR camera...");

    // Configure MindAR with the target
    debugLog("Configuring MindAR system...");
    const mindARSystem = scene.systems["mindar-image-system"];
    if (!mindARSystem) {
      throw new Error("MindAR system not found");
    }

    debugLog("MindAR system found, setting target...");

    // Set the target data
    mindARSystem.data.imageTargetSrc = artwork.targets.image;

    updatePreloaderProgress(90, "Starting AR...");

    // Show the AR view
    showARView();

    debugLog("AR view shown, waiting for AR ready...");

    // Monitor AR startup
    let arReadyTimeout = setTimeout(() => {
      debugLog("AR ready timeout (10 seconds)");
    }, 10000);

    scene.addEventListener(
      "arReady",
      () => {
        debugLog("AR is ready!");
        clearTimeout(arReadyTimeout);
        updatePreloaderProgress(100, "AR ready!");
        hidePreloader();
      },
      { once: true }
    );

    scene.addEventListener(
      "arError",
      (event) => {
        debugLog(`AR error: ${JSON.stringify(event.detail)}`);
        clearTimeout(arReadyTimeout);
        showError("AR Error", "Failed to start augmented reality");
      },
      { once: true }
    );
  } catch (error) {
    debugLog(`Error in startARExperience: ${error.message}`);
    console.error("AR experience error:", error);
    showError("AR Error", error.message);
  }
}

// UI helper functions
function showPreloader() {
  debugLog("Showing preloader");
  document.getElementById("preloader").hidden = false;
  document.querySelector(".status").hidden = true;
}

function updatePreloaderProgress(percent, message) {
  debugLog(`Progress: ${percent}% - ${message}`);
  const bar = document.getElementById("preloaderBarFill");
  const detail = document.getElementById("preloaderDetail");
  if (bar) bar.style.width = `${percent}%`;
  if (detail) detail.textContent = message;
}

function hidePreloader() {
  debugLog("Hiding preloader");
  document.getElementById("preloader").hidden = true;
}

function showARView() {
  debugLog("Showing AR view");
  document.getElementById("arShell").hidden = false;
  document.getElementById("arFooter").hidden = false;
}

function showError(title, description) {
  debugLog(`Showing error: ${title} - ${description}`);
  document.getElementById("errorTitle").textContent = title;
  document.getElementById("errorDescription").textContent = description;
  document.getElementById("errorView").hidden = false;
  document.getElementById("preloader").hidden = true;
  document.querySelector(".status").hidden = true;
}

debugLog("App.js script completed loading");
