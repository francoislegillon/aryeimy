/*! Stub MindAR A-Frame build for offline development. */
(function(){
  if (!window.AFRAME) {
    console.warn('[MindAR:stub] AFRAME not present; stub inactive.');
    return;
  }

  class MindARStubController {
    constructor(sceneEl, config){
      this.sceneEl = sceneEl;
      this.config = config || {};
      this.running = false;
      this.videoEl = null;
      this.targetEntities = new Set();
      this._timers = [];
    }

    async start(){
      if (this.running) return;
      this.running = true;
      await this._setupVideo();
      this._simulateTracking();
      console.info('[MindAR:stub] Started mock tracking with config:', this.config);
    }

    stop(){
      this.running = false;
      this._timers.forEach(clearTimeout);
      this._timers.length = 0;
      if (this.videoEl){
        const stream = this.videoEl.srcObject;
        if (stream) stream.getTracks().forEach(track => track.stop());
        this.videoEl.remove();
        this.videoEl = null;
      }
      console.info('[MindAR:stub] Stopped mock tracking.');
    }

    registerTargetEntity(el){
      this.targetEntities.add(el);
    }

    unregisterTargetEntity(el){
      this.targetEntities.delete(el);
    }

    async _setupVideo(){
      if (this.videoEl) return;
      const video = document.createElement('video');
      video.playsInline = true;
      video.autoplay = true;
      video.muted = true;
      video.setAttribute('data-mindar-stub-video', '');
      video.style.position = 'absolute';
      video.style.top = '0';
      video.style.left = '0';
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      this.sceneEl.appendChild(video);
      this.videoEl = video;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
          video.srcObject = stream;
        } catch (error) {
          console.warn('[MindAR:stub] Unable to access camera; falling back to placeholder frame.', error);
          this._usePlaceholderFrame();
        }
      } else {
        this._usePlaceholderFrame();
      }
    }

    _usePlaceholderFrame(){
      if (!this.videoEl) return;
      this.videoEl.removeAttribute('srcObject');
      this.videoEl.poster = '';
      this.videoEl.style.background = '#111';
      this.videoEl.style.display = 'block';
    }

    _simulateTracking(){
      const found = new Event('targetFound');
      const lost = new Event('targetLost');
      const cycle = () => {
        if (!this.running) return;
        this.targetEntities.forEach(el => el.dispatchEvent(found));
        const t1 = setTimeout(() => {
          if (!this.running) return;
          this.targetEntities.forEach(el => el.dispatchEvent(lost));
        }, 6000);
        const t2 = setTimeout(() => {
          if (!this.running) return;
          this.targetEntities.forEach(el => el.dispatchEvent(found));
          cycle();
        }, 9000);
        this._timers.push(t1, t2);
      };
      const initial = setTimeout(() => {
        if (!this.running) return;
        this.targetEntities.forEach(el => el.dispatchEvent(found));
        cycle();
      }, 2000);
      this._timers.push(initial);
    }
  }

  const controllerMap = new WeakMap();

  function getController(sceneEl, config){
    let controller = controllerMap.get(sceneEl);
    if (!controller){
      controller = new MindARStubController(sceneEl, config);
      controllerMap.set(sceneEl, controller);
    }
    return controller;
  }

  AFRAME.registerComponent('mindar-image', {
    schema: { imageTargetSrc: { type: 'string' }, autoStart: { type: 'boolean', default: true } },
    init(){
      this.controller = getController(this.el, this.data);
      if (this.data && this.data.autoStart !== false) {
        this.play();
      }
    },
    async play(){
      await this.controller.start();
    },
    pause(){
      this.controller.stop();
    },
    remove(){
      this.controller.stop();
      controllerMap.delete(this.el);
    }
  });

  AFRAME.registerComponent('mindar-image-target', {
    schema: { targetIndex: { type: 'int', default: 0 } },
    init(){
      const sceneEl = this.el.closest('a-scene');
      if (!sceneEl){
        console.warn('[MindAR:stub] mindar-image-target requires parent a-scene.');
        return;
      }
      this.controller = getController(sceneEl, {});
      this.controller.registerTargetEntity(this.el);
    },
    remove(){
      if (this.controller){
        this.controller.unregisterTargetEntity(this.el);
      }
    }
  });

  window.MINDAR = {
    version: 'stub-0.1.0'
  };
  console.info('[MindAR:stub] Loaded minimal MindAR placeholder.');
})();
