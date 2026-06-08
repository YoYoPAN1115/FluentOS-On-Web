/**
 * Camera App
 * Native Fluent OS webcam capture app.
 */
const CameraApp = {
    windowId: null,
    container: null,
    stream: null,
    mediaRecorder: null,
    recordedChunks: [],
    lastCapture: null,
    mode: 'photo',
    facingMode: 'user',
    gridVisible: true,
    recordStartedAt: 0,
    recordTimer: null,

    init(windowId) {
        this.windowId = windowId;
        this.container = document.getElementById(`${windowId}-content`);
        this.render();
        setTimeout(() => this.startCamera(), 0);
    },

    render() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="camera-app camera-mode-photo">
                <video class="camera-video" autoplay playsinline muted></video>
                <canvas class="camera-canvas" hidden></canvas>
                <div class="camera-grid" aria-hidden="true"></div>
                <div class="camera-dim"></div>

                <div class="camera-permission">
                    <img src="Theme/Icon/App_icon/camera.png" alt="">
                    <h2>${t('camera.permission-title')}</h2>
                    <p>${t('camera.permission-desc')}</p>
                    <button class="fluent-btn fluent-btn-primary camera-start">${t('camera.start')}</button>
                </div>

                <div class="camera-zoom-pill">1x</div>
                <div class="camera-record-time">00:00</div>

                <div class="camera-controls">
                    <button class="camera-round-btn camera-flash" type="button" title="${t('camera.flash')}">
                        <img src="Theme/Icon/Symbol_icon/stroke/Bolt.svg" alt="">
                    </button>
                    <button class="camera-round-btn camera-grid-toggle active" type="button" title="${t('camera.grid')}">
                        <img src="Theme/Icon/Symbol_icon/stroke/Layout Grid.svg" alt="">
                    </button>
                    <button class="camera-round-btn camera-timer" type="button" title="${t('camera.timer')}">
                        <img src="Theme/Icon/Symbol_icon/stroke/Timer.svg" alt="">
                    </button>
                    <button class="camera-round-btn camera-switch" type="button" title="${t('camera.switch')}">
                        <img src="Theme/Icon/Symbol_icon/stroke/Refresh.svg" alt="">
                    </button>

                    <button class="camera-shutter" type="button" aria-label="${t('camera.capture')}">
                        <span></span>
                    </button>

                    <button class="camera-thumbnail" type="button" title="${t('camera.preview')}" disabled>
                        <img class="camera-thumb-image" alt="">
                        <span class="camera-thumb-empty"></span>
                    </button>

                    <div class="camera-mode-switch" role="tablist" aria-label="${t('camera.mode')}">
                        <button class="camera-mode-btn" type="button" data-mode="video">${t('camera.video')}</button>
                        <button class="camera-mode-btn active" type="button" data-mode="photo">${t('camera.photo')}</button>
                    </div>
                </div>
            </div>
        `;
        this.addStyles();
        this.bindEvents();
        this.updateMode();
    },

    bindEvents() {
        this.container.querySelector('.camera-start')?.addEventListener('click', () => this.startCamera());
        this.container.querySelector('.camera-shutter')?.addEventListener('click', () => this.handleShutter());
        this.container.querySelector('.camera-thumbnail')?.addEventListener('click', () => this.openPreview());
        this.container.querySelector('.camera-grid-toggle')?.addEventListener('click', () => this.toggleGrid());
        this.container.querySelector('.camera-switch')?.addEventListener('click', () => this.switchCamera());
        this.container.querySelectorAll('.camera-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
        });
    },

    async startCamera() {
        if (!navigator.mediaDevices?.getUserMedia) {
            this.showCameraError();
            return;
        }

        try {
            this.stopCamera(false);
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });

            const video = this.container.querySelector('.camera-video');
            video.srcObject = this.stream;
            await video.play();
            this.setCameraActive(true);
        } catch (error) {
            console.error('[Camera] start failed:', error);
            this.showCameraError();
        }
    },

    showCameraError() {
        this.setCameraActive(false);
        FluentUI.Toast({
            title: t('camera.error-title'),
            message: t('camera.error-desc'),
            type: 'error'
        });
    },

    stopCamera(clearCapture = false) {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.clearRecordTimer();
        this.mediaRecorder = null;
        this.recordedChunks = [];

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        const video = this.container?.querySelector('.camera-video');
        if (video) video.srcObject = null;
        this.setCameraActive(false);
        if (clearCapture) this.clearCapture();
    },

    setCameraActive(active) {
        const app = this.container?.querySelector('.camera-app');
        if (!app) return;
        app.classList.toggle('is-active', active);
        app.classList.toggle('is-recording', this.isRecording());
        const shutter = this.container.querySelector('.camera-shutter');
        const switchBtn = this.container.querySelector('.camera-switch');
        if (shutter) shutter.disabled = !active;
        if (switchBtn) switchBtn.disabled = !active || this.isRecording();
    },

    setMode(mode) {
        if (!['photo', 'video'].includes(mode) || this.isRecording()) return;
        this.mode = mode;
        this.updateMode();
    },

    updateMode() {
        const app = this.container?.querySelector('.camera-app');
        if (!app) return;
        app.classList.toggle('camera-mode-photo', this.mode === 'photo');
        app.classList.toggle('camera-mode-video', this.mode === 'video');
        this.container.querySelectorAll('.camera-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === this.mode);
        });
        const shutter = this.container.querySelector('.camera-shutter');
        if (shutter) {
            shutter.setAttribute('aria-label', this.mode === 'video' ? t('camera.record') : t('camera.capture'));
        }
    },

    handleShutter() {
        if (this.mode === 'video') {
            if (this.isRecording()) {
                this.stopRecording();
            } else {
                this.startRecording();
            }
            return;
        }
        this.capturePhoto();
    },

    capturePhoto() {
        const video = this.container.querySelector('.camera-video');
        const canvas = this.container.querySelector('.camera-canvas');
        if (!video || !canvas || !video.videoWidth || !video.videoHeight) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(blob => {
            if (!blob) return;
            this.setLastCapture({
                type: 'photo',
                blob,
                url: URL.createObjectURL(blob),
                filename: `fluent-camera-${this.getTimestamp()}.png`
            });
            FluentUI.Toast({
                title: t('camera.photo-ready'),
                message: t('camera.photo-ready-desc'),
                type: 'success'
            });
        }, 'image/png');
    },

    startRecording() {
        if (!this.stream || !window.MediaRecorder) {
            FluentUI.Toast({
                title: t('camera.record-error-title'),
                message: t('camera.record-error-desc'),
                type: 'error'
            });
            return;
        }

        try {
            this.recordedChunks = [];
            const preferred = [
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm'
            ].find(type => MediaRecorder.isTypeSupported(type));
            this.mediaRecorder = new MediaRecorder(this.stream, preferred ? { mimeType: preferred } : undefined);
            this.mediaRecorder.addEventListener('dataavailable', event => {
                if (event.data && event.data.size > 0) this.recordedChunks.push(event.data);
            });
            this.mediaRecorder.addEventListener('stop', () => this.finishRecording());
            this.mediaRecorder.start();
            this.recordStartedAt = Date.now();
            this.startRecordTimer();
            this.setCameraActive(true);
        } catch (error) {
            console.error('[Camera] record failed:', error);
            FluentUI.Toast({
                title: t('camera.record-error-title'),
                message: t('camera.record-error-desc'),
                type: 'error'
            });
        }
    },

    stopRecording() {
        if (!this.isRecording()) return;
        this.mediaRecorder.stop();
        this.clearRecordTimer();
        this.setCameraActive(true);
    },

    finishRecording() {
        const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.clearRecordTimer();
        this.setCameraActive(true);
        if (!blob.size) return;
        this.setLastCapture({
            type: 'video',
            blob,
            url: URL.createObjectURL(blob),
            filename: `fluent-camera-${this.getTimestamp()}.webm`
        });
        FluentUI.Toast({
            title: t('camera.video-ready'),
            message: t('camera.video-ready-desc'),
            type: 'success'
        });
    },

    isRecording() {
        return this.mediaRecorder && this.mediaRecorder.state === 'recording';
    },

    startRecordTimer() {
        this.clearRecordTimer();
        this.updateRecordTimer();
        this.recordTimer = setInterval(() => this.updateRecordTimer(), 500);
    },

    updateRecordTimer() {
        const timer = this.container?.querySelector('.camera-record-time');
        if (!timer) return;
        const elapsed = Math.max(0, Math.floor((Date.now() - this.recordStartedAt) / 1000));
        const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const seconds = String(elapsed % 60).padStart(2, '0');
        timer.textContent = `${minutes}:${seconds}`;
    },

    clearRecordTimer() {
        clearInterval(this.recordTimer);
        this.recordTimer = null;
        const timer = this.container?.querySelector('.camera-record-time');
        if (timer) timer.textContent = '00:00';
    },

    setLastCapture(capture) {
        this.clearCapture();
        this.lastCapture = capture;
        const thumb = this.container.querySelector('.camera-thumbnail');
        const image = this.container.querySelector('.camera-thumb-image');
        if (!thumb || !image) return;
        thumb.disabled = false;
        thumb.classList.add('has-capture');
        if (capture.type === 'photo') {
            image.src = capture.url;
            image.hidden = false;
            return;
        }

        const video = document.createElement('video');
        video.src = capture.url;
        video.muted = true;
        video.playsInline = true;
        video.addEventListener('loadeddata', () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 160;
            canvas.height = video.videoHeight || 90;
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            image.src = canvas.toDataURL('image/png');
            image.hidden = false;
        }, { once: true });
    },

    clearCapture() {
        if (this.lastCapture?.url) URL.revokeObjectURL(this.lastCapture.url);
        this.lastCapture = null;
        const thumb = this.container?.querySelector('.camera-thumbnail');
        const image = this.container?.querySelector('.camera-thumb-image');
        if (thumb) {
            thumb.disabled = true;
            thumb.classList.remove('has-capture');
        }
        if (image) {
            image.removeAttribute('src');
            image.hidden = true;
        }
    },

    openPreview() {
        if (!this.lastCapture) return;
        const overlay = document.createElement('div');
        overlay.className = 'camera-preview-overlay';
        const media = this.lastCapture.type === 'photo'
            ? `<img src="${this.lastCapture.url}" alt="${t('camera.preview')}">`
            : `<video src="${this.lastCapture.url}" controls autoplay playsinline></video>`;
        overlay.innerHTML = `
            <div class="camera-preview-modal">
                <button class="camera-preview-close" type="button" title="${t('close')}">
                    <img src="Theme/Icon/Symbol_icon/stroke/Cancel.svg" alt="${t('close')}">
                </button>
                <div class="camera-preview-media">${media}</div>
                <button class="camera-preview-download fluent-btn fluent-btn-primary" type="button">
                    <img src="Theme/Icon/Symbol_icon/stroke/Download.svg" alt="">
                    <span>${t('camera.download')}</span>
                </button>
            </div>
        `;
        this.container.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('show'));
        const close = () => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 180);
        };
        overlay.addEventListener('click', event => {
            if (event.target === overlay) close();
        });
        overlay.querySelector('.camera-preview-close')?.addEventListener('click', close);
        overlay.querySelector('.camera-preview-download')?.addEventListener('click', () => this.downloadCapture());
    },

    downloadCapture() {
        if (!this.lastCapture) return;
        const link = document.createElement('a');
        link.href = this.lastCapture.url;
        link.download = this.lastCapture.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    toggleGrid() {
        this.gridVisible = !this.gridVisible;
        const app = this.container?.querySelector('.camera-app');
        const btn = this.container?.querySelector('.camera-grid-toggle');
        if (app) app.classList.toggle('grid-hidden', !this.gridVisible);
        if (btn) btn.classList.toggle('active', this.gridVisible);
    },

    async switchCamera() {
        if (this.isRecording()) return;
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
        await this.startCamera();
    },

    getTimestamp() {
        return new Date().toISOString().replace(/[:.]/g, '-');
    },

    beforeClose() {
        this.stopCamera(true);
        return true;
    },

    addStyles() {
        if (document.getElementById('camera-app-styles')) return;
        const style = document.createElement('style');
        style.id = 'camera-app-styles';
        style.textContent = `
            .window[data-app-id="camera"] .window-content {
                padding: 0;
                overflow: hidden;
                background: #05070a;
            }
            .camera-app {
                position: relative;
                width: 100%;
                height: 100%;
                min-height: 0;
                overflow: hidden;
                background: #05070a;
                color: #fff;
                user-select: none;
            }
            .camera-video {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                background: #05070a;
                opacity: 0;
                transition: opacity 180ms ease;
            }
            .camera-app.is-active .camera-video {
                opacity: 1;
            }
            .camera-dim {
                position: absolute;
                inset: 0;
                pointer-events: none;
                background: linear-gradient(90deg, transparent 0 70%, rgba(0, 0, 0, 0.18) 100%);
            }
            .camera-grid {
                position: absolute;
                inset: 0;
                pointer-events: none;
                opacity: 0.48;
                background:
                    linear-gradient(to right, transparent 0, transparent calc(33.333% - 0.5px), rgba(255, 255, 255, 0.42) calc(33.333% - 0.5px), rgba(255, 255, 255, 0.42) calc(33.333% + 0.5px), transparent calc(33.333% + 0.5px), transparent calc(66.666% - 0.5px), rgba(255, 255, 255, 0.42) calc(66.666% - 0.5px), rgba(255, 255, 255, 0.42) calc(66.666% + 0.5px), transparent calc(66.666% + 0.5px)),
                    linear-gradient(to bottom, transparent 0, transparent calc(33.333% - 0.5px), rgba(255, 255, 255, 0.42) calc(33.333% - 0.5px), rgba(255, 255, 255, 0.42) calc(33.333% + 0.5px), transparent calc(33.333% + 0.5px), transparent calc(66.666% - 0.5px), rgba(255, 255, 255, 0.42) calc(66.666% - 0.5px), rgba(255, 255, 255, 0.42) calc(66.666% + 0.5px), transparent calc(66.666% + 0.5px));
            }
            .camera-app.grid-hidden .camera-grid {
                display: none;
            }
            .camera-permission {
                position: absolute;
                inset: 0;
                z-index: 4;
                display: grid;
                place-items: center;
                align-content: center;
                gap: 14px;
                padding: 24px;
                text-align: center;
                background: radial-gradient(circle at 50% 38%, rgba(55, 65, 81, 0.96), rgba(3, 7, 18, 0.98) 62%);
            }
            .camera-app.is-active .camera-permission {
                display: none;
            }
            .camera-permission img {
                width: 78px;
                height: 78px;
            }
            .camera-permission h2 {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
            }
            .camera-permission p {
                max-width: 360px;
                margin: 0;
                color: rgba(255, 255, 255, 0.7);
                line-height: 1.5;
            }
            .camera-zoom-pill,
            .camera-record-time {
                position: absolute;
                z-index: 3;
                border-radius: 999px;
                background: rgba(27, 31, 36, 0.62);
                color: #fff;
                box-shadow: 0 12px 34px rgba(0, 0, 0, 0.22);
                backdrop-filter: blur(18px);
            }
            .camera-zoom-pill {
                left: 28px;
                top: 50%;
                transform: translateY(-50%);
                width: 48px;
                height: 48px;
                display: grid;
                place-items: center;
                font-size: 16px;
            }
            .camera-record-time {
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: none;
                padding: 7px 13px;
                font-variant-numeric: tabular-nums;
                font-size: 14px;
                letter-spacing: 0;
            }
            .camera-app.is-recording .camera-record-time {
                display: block;
                background: rgba(210, 35, 35, 0.82);
            }
            .camera-controls {
                position: absolute;
                z-index: 3;
                right: 28px;
                top: 50%;
                transform: translateY(-50%);
                display: grid;
                justify-items: center;
                gap: 16px;
            }
            .camera-round-btn,
            .camera-thumbnail,
            .camera-shutter {
                border: 0;
                padding: 0;
                cursor: pointer;
                color: #fff;
                background: rgba(38, 43, 50, 0.68);
                box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
                backdrop-filter: blur(18px);
            }
            .camera-round-btn {
                width: 58px;
                height: 58px;
                border-radius: 50%;
                display: grid;
                place-items: center;
                opacity: 0.95;
                transition: transform 160ms ease, background 160ms ease, opacity 160ms ease;
            }
            .camera-round-btn:hover,
            .camera-thumbnail:hover {
                transform: scale(1.04);
                background: rgba(53, 59, 68, 0.78);
            }
            .camera-round-btn:disabled,
            .camera-thumbnail:disabled {
                cursor: default;
                opacity: 0.55;
            }
            .camera-round-btn img {
                width: 25px;
                height: 25px;
                filter: invert(1);
                opacity: 0.92;
            }
            .camera-grid-toggle.active img {
                filter: invert(83%) sepia(92%) saturate(603%) hue-rotate(8deg) brightness(105%) contrast(104%);
            }
            .camera-shutter {
                width: 86px;
                height: 86px;
                border-radius: 50%;
                margin: 8px 0 10px;
                display: grid;
                place-items: center;
                background: rgba(31, 38, 47, 0.74);
                transition: transform 140ms ease, background 160ms ease;
            }
            .camera-shutter:hover {
                transform: scale(1.03);
            }
            .camera-shutter span {
                width: 70px;
                height: 70px;
                border-radius: 50%;
                background: #fff;
                box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.92);
                transition: border-radius 160ms ease, width 160ms ease, height 160ms ease, background 160ms ease;
            }
            .camera-mode-video .camera-shutter span {
                background: #f23d3d;
            }
            .camera-app.is-recording .camera-shutter span {
                width: 34px;
                height: 34px;
                border-radius: 9px;
                background: #f23d3d;
            }
            .camera-thumbnail {
                width: 62px;
                height: 62px;
                border-radius: 50%;
                overflow: hidden;
                display: grid;
                place-items: center;
                box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.22), 0 16px 40px rgba(0, 0, 0, 0.28);
            }
            .camera-thumb-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
            }
            .camera-thumb-image[hidden] {
                display: none;
            }
            .camera-thumb-empty {
                width: 26px;
                height: 26px;
                border-radius: 50%;
                border: 2px solid rgba(255, 255, 255, 0.36);
            }
            .camera-thumbnail.has-capture .camera-thumb-empty {
                display: none;
            }
            .camera-mode-switch {
                display: grid;
                justify-items: center;
                gap: 8px;
                margin-top: 10px;
                font-size: 14px;
                letter-spacing: 0;
            }
            .camera-mode-btn {
                border: 0;
                min-width: 96px;
                min-height: 42px;
                border-radius: 22px;
                padding: 0 18px;
                color: rgba(255, 255, 255, 0.88);
                background: transparent;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                letter-spacing: 0;
            }
            .camera-mode-btn.active {
                color: #ffff53;
                background: rgba(37, 43, 51, 0.72);
                box-shadow: 0 12px 34px rgba(0, 0, 0, 0.24);
                backdrop-filter: blur(18px);
            }
            .camera-preview-overlay {
                position: absolute;
                inset: 0;
                z-index: 20;
                display: grid;
                place-items: center;
                padding: 22px;
                background: rgba(0, 0, 0, 0);
                opacity: 0;
                transition: opacity 180ms ease, background 180ms ease;
            }
            .camera-preview-overlay.show {
                opacity: 1;
                background: rgba(0, 0, 0, 0.76);
            }
            .camera-preview-modal {
                position: relative;
                width: min(920px, 100%);
                height: min(620px, 100%);
                display: grid;
                grid-template-rows: minmax(0, 1fr) auto;
                gap: 14px;
            }
            .camera-preview-media {
                min-height: 0;
                border-radius: 8px;
                overflow: hidden;
                background: #000;
                display: grid;
                place-items: center;
            }
            .camera-preview-media img,
            .camera-preview-media video {
                max-width: 100%;
                max-height: 100%;
                width: 100%;
                height: 100%;
                object-fit: contain;
            }
            .camera-preview-close {
                position: absolute;
                top: 12px;
                right: 12px;
                z-index: 2;
                width: 42px;
                height: 42px;
                border: 0;
                border-radius: 50%;
                background: rgba(32, 37, 44, 0.72);
                display: grid;
                place-items: center;
                cursor: pointer;
                backdrop-filter: blur(18px);
            }
            .camera-preview-close img {
                width: 20px;
                height: 20px;
                filter: invert(1);
            }
            .camera-preview-download {
                justify-self: center;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }
            .camera-preview-download img {
                width: 18px;
                height: 18px;
                filter: invert(1);
            }
            @media (max-width: 760px) {
                .camera-controls {
                    right: 16px;
                    gap: 12px;
                }
                .camera-round-btn {
                    width: 48px;
                    height: 48px;
                }
                .camera-shutter {
                    width: 76px;
                    height: 76px;
                }
                .camera-shutter span {
                    width: 62px;
                    height: 62px;
                }
                .camera-mode-btn {
                    min-width: 82px;
                    min-height: 36px;
                    font-size: 13px;
                }
                .camera-zoom-pill {
                    left: 16px;
                    width: 42px;
                    height: 42px;
                    font-size: 14px;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

window.CameraApp = CameraApp;
