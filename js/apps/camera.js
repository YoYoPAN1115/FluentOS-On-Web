/**
 * Camera App
 * Native Fluent OS webcam capture app.
 */
const CameraApp = {
    windowId: null,
    container: null,
    frame: null,
    stream: null,
    mediaRecorder: null,
    recordedChunks: [],
    captures: [],
    currentPage: 'camera',
    currentViewerIndex: 0,
    mode: 'photo',
    facingMode: 'user',
    gridVisible: true,
    recordStartedAt: 0,
    recordTimer: null,
    keydownHandler: null,

    init(windowId) {
        this.windowId = windowId;
        this.container = document.getElementById(`${windowId}-content`);
        this.captures = [];
        this.currentPage = 'camera';
        this.mode = 'photo';
        this.addStyles();
        this.render();
        this.bindGlobalKeys();
    },

    render() {
        if (!this.container) return;
        if (this.frame && typeof this.frame.destroy === 'function') this.frame.destroy();

        this.frame = FluentWindow.mount({
            container: this.container,
            expandedWidth: 190,
            collapsedWidth: 58,
            activeId: this.currentPage,
            items: [
                { id: 'camera', label: t('camera.nav-camera'), icon: 'Camera' },
                { id: 'stored', label: t('camera.nav-stored'), icon: 'Image', badge: String(this.captures.length) }
            ],
            onNavigate: (id, pageEl) => {
                this.currentPage = id;
                if (id === 'stored') {
                    this.stopCamera(false);
                    this.renderStoredPage(pageEl);
                    return;
                }
                this.renderCameraPage(pageEl);
            }
        });
    },

    renderCameraPage(pageEl) {
        pageEl.className = 'fw-page camera-fw-page';
        pageEl.innerHTML = `
            <div class="camera-app camera-mode-${this.mode}">
                <div class="camera-stage">
                    <video class="camera-video" autoplay playsinline muted></video>
                    <canvas class="camera-canvas" hidden></canvas>
                    <div class="camera-grid" aria-hidden="true"></div>
                    <div class="camera-dim"></div>

                    <div class="camera-permission">
                        <img src="Theme/Icon/App_icon/camera.png" alt="">
                        <h2>${t('camera.permission-title')}</h2>
                        <p>${t('camera.permission-desc')}</p>
                        <button class="fluent-btn fluent-btn-primary fluent-btn-large camera-start" type="button"><span class="fluent-btn-text">${t('camera.start')}</span></button>
                    </div>

                    <div class="camera-record-time">00:00</div>

                    <div class="camera-capture-bar">
                        <button class="camera-round-btn camera-grid-toggle ${this.gridVisible ? 'active' : ''}" type="button" title="${t('camera.grid')}">
                            <img src="Theme/Icon/Symbol_icon/stroke/Layout Grid.svg" alt="">
                        </button>
                        <button class="camera-shutter" type="button" aria-label="${this.mode === 'video' ? t('camera.record') : t('camera.capture')}">
                            <span></span>
                        </button>
                        <button class="camera-round-btn camera-switch" type="button" title="${t('camera.switch')}">
                            <img src="Theme/Icon/Symbol_icon/stroke/Refresh.svg" alt="">
                        </button>
                    </div>

                    <div class="camera-mode-switch" role="tablist" aria-label="${t('camera.mode')}">
                        <button class="camera-mode-btn active" type="button" data-mode="photo">${t('camera.photo')}</button>
                        <button class="camera-mode-btn" type="button" data-mode="video">${t('camera.video')}</button>
                    </div>
                </div>
            </div>
        `;

        this.bindCameraEvents(pageEl);
        this.updateMode();
        this.applyGridState();
        setTimeout(() => this.startCamera(), 0);
    },

    renderStoredPage(pageEl) {
        pageEl.className = 'fw-page camera-fw-page camera-stored-page';
        pageEl.innerHTML = `
            <div class="camera-stored-app">
                <header class="camera-page-header">
                    <div>
                        <h1>${t('camera.stored-title')}</h1>
                        <p>${this.captures.length ? t('camera.stored-subtitle') : t('camera.stored-empty-desc')}</p>
                    </div>
                    <span class="camera-count-pill">${this.captures.length}</span>
                </header>
                <div class="camera-stored-grid">
                    ${this.renderStoredGrid()}
                </div>
                ${this.renderViewerMarkup()}
            </div>
        `;
        this.bindStoredEvents(pageEl);
    },

    renderStoredGrid() {
        if (!this.captures.length) {
            return `
                <div class="camera-empty-state">
                    <img src="Theme/Icon/Symbol_icon/stroke/Image.svg" alt="">
                    <h2>${t('camera.stored-empty-title')}</h2>
                    <p>${t('camera.stored-empty-desc')}</p>
                </div>
            `;
        }

        return this.captures.map((capture, index) => `
            <button class="camera-capture-card" type="button" data-index="${index}">
                <img src="${this.escapeAttr(capture.thumbUrl || capture.url)}" alt="${this.escapeAttr(capture.title)}">
                ${capture.type === 'video' ? `<span class="camera-media-badge">${t('camera.video')}</span>` : ''}
                <span class="camera-card-meta">${this.escapeHtml(this.formatCaptureTime(capture.createdAt))}</span>
            </button>
        `).join('');
    },

    renderViewerMarkup() {
        return `
            <div class="camera-viewer" style="display:none;">
                <div class="camera-canvas-wrap">
                    <img class="camera-main-img" src="" alt="" draggable="false">
                    <video class="camera-main-video" src="" controls playsinline style="display:none;"></video>
                </div>
                <button class="camera-back-btn" type="button">
                    <img src="Theme/Icon/Symbol_icon/stroke/Chevron Left.svg" alt="">
                    <span>${t('photos.back')}</span>
                </button>
                <div class="camera-counter"></div>
                <div class="camera-viewer-toolbar">
                    <button class="camera-tool-btn" type="button" data-action="downloadCurrent" data-tooltip="${t('camera.download')}">
                        <img src="Theme/Icon/Symbol_icon/stroke/Download.svg" alt="">
                        <span class="camera-tool-tooltip">${t('camera.download')}</span>
                    </button>
                    <button class="camera-tool-btn" type="button" data-action="setCurrentAsWallpaper" data-tooltip="${t('camera.wallpaper')}">
                        <img src="Theme/Icon/Symbol_icon/stroke/Television Upload.svg" alt="">
                        <span class="camera-tool-tooltip">${t('camera.wallpaper')}</span>
                    </button>
                    <button class="camera-tool-btn camera-tool-danger" type="button" data-action="deleteCurrent" data-tooltip="${t('camera.delete')}">
                        <img src="Theme/Icon/Symbol_icon/stroke/Trash.svg" alt="">
                        <span class="camera-tool-tooltip">${t('camera.delete')}</span>
                    </button>
                </div>
            </div>
        `;
    },

    bindCameraEvents(pageEl) {
        pageEl.querySelector('.camera-start')?.addEventListener('click', () => this.startCamera());
        pageEl.querySelector('.camera-shutter')?.addEventListener('click', () => this.handleShutter());
        pageEl.querySelector('.camera-grid-toggle')?.addEventListener('click', () => this.toggleGrid());
        pageEl.querySelector('.camera-switch')?.addEventListener('click', () => this.switchCamera());
        pageEl.querySelectorAll('.camera-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
        });
    },

    bindStoredEvents(pageEl) {
        pageEl.addEventListener('click', (event) => {
            const card = event.target.closest('.camera-capture-card');
            if (card) {
                this.openViewer(Number(card.dataset.index));
                return;
            }

            if (event.target.closest('.camera-back-btn')) {
                this.closeViewer();
                return;
            }

            const tool = event.target.closest('.camera-tool-btn');
            if (tool) {
                const action = tool.dataset.action;
                if (action && typeof this[action] === 'function') this[action]();
            }
        });
    },

    bindGlobalKeys() {
        if (this.keydownHandler) document.removeEventListener('keydown', this.keydownHandler);
        this.keydownHandler = (event) => {
            if (event.key !== 'Escape') return;
            const viewer = this.container?.querySelector('.camera-viewer');
            if (viewer && viewer.style.display !== 'none') this.closeViewer();
        };
        document.addEventListener('keydown', this.keydownHandler);
    },

    async startCamera() {
        const page = this.container?.querySelector('.camera-app');
        if (!page) return;
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
            if (!video) {
                this.stopCamera(false);
                return;
            }
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

    stopCamera(clearCaptures = false) {
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
        if (clearCaptures) this.clearCaptures();
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
            if (this.isRecording()) this.stopRecording();
            else this.startRecording();
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
            const capture = this.createCapture({
                type: 'photo',
                blob,
                url: URL.createObjectURL(blob),
                filename: `fluent-camera-${this.getTimestamp()}.png`
            });
            this.addCapture(capture);
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

        const capture = this.createCapture({
            type: 'video',
            blob,
            url: URL.createObjectURL(blob),
            filename: `fluent-camera-${this.getTimestamp()}.webm`
        });
        this.addCapture(capture);
        this.generateVideoThumb(capture);
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

    createCapture(data) {
        const createdAt = Date.now();
        return {
            id: `camera-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt,
            title: data.type === 'video' ? t('camera.video') : t('camera.photo'),
            thumbUrl: data.url,
            ...data
        };
    },

    addCapture(capture) {
        this.captures.unshift(capture);
        this.updateStoredBadge();
        if (this.currentPage === 'stored') this.refreshStoredPage();
    },

    generateVideoThumb(capture) {
        const video = document.createElement('video');
        video.src = capture.url;
        video.muted = true;
        video.playsInline = true;
        video.addEventListener('loadeddata', () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 320;
            canvas.height = video.videoHeight || 180;
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            capture.thumbUrl = canvas.toDataURL('image/png');
            if (this.currentPage === 'stored') this.refreshStoredGrid();
        }, { once: true });
    },

    refreshStoredPage() {
        if (this.frame && typeof this.frame.refresh === 'function') this.frame.refresh();
    },

    refreshStoredGrid() {
        const grid = this.container?.querySelector('.camera-stored-grid');
        if (grid) grid.innerHTML = this.renderStoredGrid();
        const pill = this.container?.querySelector('.camera-count-pill');
        if (pill) pill.textContent = String(this.captures.length);
    },

    updateStoredBadge() {
        const badge = this.container?.querySelector('.fw-nav-item[data-id="stored"] .fw-nav-badge');
        if (badge) badge.textContent = String(this.captures.length);
    },

    _getCaptureCardRect(index) {
        const card = this.container.querySelector(`.camera-capture-card[data-index="${index}"]`);
        const app = this.container.querySelector('.camera-stored-app');
        if (!card || !app) return null;
        const cardR = card.getBoundingClientRect();
        const appR = app.getBoundingClientRect();
        return {
            left: cardR.left - appR.left,
            top: cardR.top - appR.top,
            width: cardR.width,
            height: cardR.height
        };
    },

    openViewer(index) {
        const capture = this.captures[index];
        if (!capture) return;
        this.currentViewerIndex = index;

        const viewer = this.container.querySelector('.camera-viewer');
        const img = this.container.querySelector('.camera-main-img');
        const video = this.container.querySelector('.camera-main-video');
        const counter = this.container.querySelector('.camera-counter');
        if (!viewer || !img || !video) return;

        if (capture.type === 'video') {
            img.style.display = 'none';
            img.removeAttribute('src');
            video.style.display = '';
            video.src = capture.url;
        } else {
            video.pause();
            video.style.display = 'none';
            video.removeAttribute('src');
            img.style.display = '';
            img.src = capture.url;
            img.alt = capture.title;
        }

        if (counter) counter.textContent = `${index + 1}/ ${this.captures.length}`;
        this.syncWallpaperTool(capture);

        const rect = this._getCaptureCardRect(index);
        const app = this.container.querySelector('.camera-stored-app');
        if (rect && app) {
            const clone = document.createElement('div');
            clone.className = 'camera-hero-clone';
            clone.style.cssText = `
                position:absolute; z-index:50; border-radius:8px; overflow:hidden;
                left:${rect.left}px; top:${rect.top}px; width:${rect.width}px; height:${rect.height}px;
                background-image:url(${capture.thumbUrl || capture.url}); background-size:cover; background-position:center;
                transition: left 0.45s cubic-bezier(0.4,0,0.2,1), top 0.45s cubic-bezier(0.4,0,0.2,1),
                            width 0.45s cubic-bezier(0.4,0,0.2,1), height 0.45s cubic-bezier(0.4,0,0.2,1),
                            border-radius 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.15s ease;
            `;
            app.appendChild(clone);
            viewer.style.display = 'flex';
            viewer.style.opacity = '0';
            img.style.opacity = '0';
            video.style.opacity = '0';

            const appR = app.getBoundingClientRect();
            requestAnimationFrame(() => {
                clone.style.left = '0px';
                clone.style.top = '0px';
                clone.style.width = appR.width + 'px';
                clone.style.height = appR.height + 'px';
                clone.style.borderRadius = '0px';
            });

            setTimeout(() => {
                viewer.style.opacity = '1';
                img.style.opacity = '1';
                video.style.opacity = '1';
                clone.style.opacity = '0';
                setTimeout(() => clone.remove(), 200);
            }, 420);
        } else {
            viewer.style.display = 'flex';
            viewer.style.opacity = '1';
            img.style.opacity = '1';
            video.style.opacity = '1';
        }
    },

    closeViewer() {
        const viewer = this.container.querySelector('.camera-viewer');
        if (!viewer) return;
        const capture = this.captures[this.currentViewerIndex];
        const app = this.container.querySelector('.camera-stored-app');
        const rect = this._getCaptureCardRect(this.currentViewerIndex);
        const video = this.container.querySelector('.camera-main-video');
        if (video) video.pause();

        if (rect && app && capture) {
            const appR = app.getBoundingClientRect();
            const clone = document.createElement('div');
            clone.className = 'camera-hero-clone';
            clone.style.cssText = `
                position:absolute; z-index:50; border-radius:0px; overflow:hidden;
                left:0px; top:0px; width:${appR.width}px; height:${appR.height}px;
                background-image:url(${capture.thumbUrl || capture.url}); background-size:cover; background-position:center;
                transition: left 0.4s cubic-bezier(0.4,0,0.2,1), top 0.4s cubic-bezier(0.4,0,0.2,1),
                            width 0.4s cubic-bezier(0.4,0,0.2,1), height 0.4s cubic-bezier(0.4,0,0.2,1),
                            border-radius 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.15s ease 0.3s;
            `;
            app.appendChild(clone);
            viewer.style.display = 'none';

            requestAnimationFrame(() => {
                clone.style.left = rect.left + 'px';
                clone.style.top = rect.top + 'px';
                clone.style.width = rect.width + 'px';
                clone.style.height = rect.height + 'px';
                clone.style.borderRadius = '8px';
            });

            setTimeout(() => {
                clone.style.opacity = '0';
                setTimeout(() => clone.remove(), 200);
            }, 380);
        } else {
            viewer.style.opacity = '0';
            setTimeout(() => {
                viewer.style.display = 'none';
                viewer.style.opacity = '1';
            }, 180);
        }
    },

    syncWallpaperTool(capture) {
        const btn = this.container?.querySelector('.camera-tool-btn[data-action="setCurrentAsWallpaper"]');
        if (!btn) return;
        btn.disabled = capture?.type !== 'photo';
        btn.classList.toggle('is-disabled', capture?.type !== 'photo');
    },

    downloadCurrent() {
        const capture = this.captures[this.currentViewerIndex];
        if (!capture) return;
        this.downloadCapture(capture);
    },

    downloadCapture(capture) {
        const link = document.createElement('a');
        link.href = capture.url;
        link.download = capture.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    deleteCurrent() {
        const capture = this.captures[this.currentViewerIndex];
        if (!capture) return;
        this.closeViewer();
        setTimeout(() => {
            const index = this.captures.findIndex(item => item.id === capture.id);
            if (index >= 0) this.captures.splice(index, 1);
            if (capture.url && !this.shouldKeepObjectUrl(capture.url)) URL.revokeObjectURL(capture.url);
            this.updateStoredBadge();
            this.refreshStoredPage();
            FluentUI.Toast({
                title: t('camera.delete'),
                message: t('camera.deleted'),
                type: 'success'
            });
        }, 440);
    },

    setCurrentAsWallpaper() {
        const capture = this.captures[this.currentViewerIndex];
        if (!capture || capture.type !== 'photo') return;
        if (typeof State !== 'undefined' && typeof Desktop !== 'undefined') {
            State.updateSettings({ wallpaperDesktop: capture.url });
            Desktop.updateWallpaper();
            State.addNotification({
                title: t('camera.wallpaper'),
                message: t('camera.wallpaper-set'),
                type: 'success'
            });
        }
    },

    toggleGrid() {
        this.gridVisible = !this.gridVisible;
        this.applyGridState();
    },

    applyGridState() {
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

    clearCaptures() {
        this.captures.forEach(capture => {
            if (capture.url && !this.shouldKeepObjectUrl(capture.url)) URL.revokeObjectURL(capture.url);
        });
        this.captures = [];
        this.updateStoredBadge();
    },

    shouldKeepObjectUrl(url) {
        const settings = typeof State !== 'undefined' ? State.settings : null;
        return !!settings && (settings.wallpaperDesktop === url || settings.wallpaperLock === url);
    },

    formatCaptureTime(ts) {
        const date = new Date(ts);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    },

    getTimestamp() {
        return new Date().toISOString().replace(/[:.]/g, '-');
    },

    escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, ch => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[ch]));
    },

    escapeAttr(value) {
        return this.escapeHtml(value);
    },

    beforeClose() {
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
        this.stopCamera(true);
        if (this.frame && typeof this.frame.destroy === 'function') {
            this.frame.destroy();
            this.frame = null;
        }
        return true;
    },

    addStyles() {
        const existing = document.getElementById('camera-app-styles');
        if (existing) existing.remove();
        const style = document.createElement('style');
        style.id = 'camera-app-styles';
        style.textContent = `
            .window[data-app-id="camera"] .window-content {
                padding: 0;
                overflow: hidden;
            }

            .camera-fw-page {
                height: 100%;
                min-height: 0;
                padding: 0 !important;
            }

            .camera-app,
            .camera-stored-app {
                position: relative;
                width: 100%;
                height: 100%;
                min-height: 0;
                overflow: hidden;
                color: var(--text-primary);
            }

            .camera-stage {
                position: relative;
                width: 100%;
                height: 100%;
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
                background:
                    linear-gradient(180deg, rgba(0, 0, 0, 0.16), transparent 30%, transparent 68%, rgba(0, 0, 0, 0.34)),
                    linear-gradient(90deg, rgba(0, 0, 0, 0.18), transparent 20%, transparent 80%, rgba(0, 0, 0, 0.18));
            }

            .camera-grid {
                position: absolute;
                inset: 0;
                pointer-events: none;
                opacity: 0.42;
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

            .camera-record-time {
                position: absolute;
                z-index: 3;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: none;
                padding: 7px 13px;
                border-radius: 999px;
                background: rgba(210, 35, 35, 0.82);
                color: #fff;
                box-shadow: 0 12px 34px rgba(0, 0, 0, 0.22);
                backdrop-filter: blur(18px);
                font-variant-numeric: tabular-nums;
                font-size: 14px;
                letter-spacing: 0;
            }

            .camera-app.is-recording .camera-record-time {
                display: block;
            }

            .camera-capture-bar {
                position: absolute;
                z-index: 3;
                left: 50%;
                bottom: 42px;
                transform: translateX(-50%);
                display: grid;
                grid-template-columns: 54px 88px 54px;
                align-items: center;
                justify-items: center;
                gap: 22px;
            }

            .camera-round-btn,
            .camera-shutter {
                border: 0;
                padding: 0;
                cursor: pointer;
                color: #fff;
                background: rgba(30, 30, 30, 0.78);
                box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
                backdrop-filter: blur(18px);
                -webkit-backdrop-filter: blur(18px);
            }

            .camera-round-btn {
                width: 54px;
                height: 54px;
                border-radius: 50%;
                display: grid;
                place-items: center;
                opacity: 0.95;
                transition: transform 160ms ease, background 160ms ease, opacity 160ms ease;
            }

            .camera-round-btn:hover {
                transform: scale(1.04);
                background: rgba(255, 255, 255, 0.16);
            }

            .camera-round-btn:disabled,
            .camera-shutter:disabled {
                cursor: default;
                opacity: 0.55;
            }

            .camera-round-btn img {
                width: 23px;
                height: 23px;
                filter: invert(1);
                opacity: 0.92;
            }

            .camera-grid-toggle.active img {
                filter: invert(83%) sepia(92%) saturate(603%) hue-rotate(8deg) brightness(105%) contrast(104%);
            }

            .camera-shutter {
                width: 88px;
                height: 88px;
                border-radius: 50%;
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

            .camera-mode-switch {
                position: absolute;
                z-index: 3;
                left: 50%;
                bottom: 150px;
                transform: translateX(-50%);
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 5px;
                border-radius: 999px;
                background: rgba(30, 30, 30, 0.62);
                backdrop-filter: blur(18px);
                -webkit-backdrop-filter: blur(18px);
            }

            .camera-mode-btn {
                border: 0;
                min-width: 72px;
                min-height: 34px;
                border-radius: 18px;
                padding: 0 16px;
                color: rgba(255, 255, 255, 0.82);
                background: transparent;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                letter-spacing: 0;
            }

            .camera-mode-btn.active {
                color: #111;
                background: #ffff53;
            }

            .camera-page-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 18px;
                padding: 28px 32px 18px;
            }

            .camera-page-header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 600;
                letter-spacing: 0;
            }

            .camera-page-header p {
                margin: 6px 0 0;
                color: var(--text-secondary);
                font-size: 13px;
            }

            .camera-count-pill {
                min-width: 34px;
                height: 28px;
                padding: 0 10px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 999px;
                background: rgba(var(--accent-rgb, 0, 120, 212), 0.16);
                color: var(--accent);
                font-weight: 700;
            }

            .camera-stored-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 14px;
                padding: 0 32px 32px;
            }

            .camera-capture-card {
                position: relative;
                aspect-ratio: 1;
                border: 0;
                padding: 0;
                border-radius: 8px;
                overflow: hidden;
                background: rgba(0, 0, 0, 0.08);
                cursor: pointer;
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }

            .camera-capture-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 22px rgba(0, 0, 0, 0.14);
            }

            .camera-capture-card img {
                width: 100%;
                height: 100%;
                display: block;
                object-fit: cover;
            }

            .camera-media-badge,
            .camera-card-meta {
                position: absolute;
                color: #fff;
                background: rgba(0, 0, 0, 0.52);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                font-size: 11px;
            }

            .camera-media-badge {
                top: 8px;
                left: 8px;
                padding: 3px 8px;
                border-radius: 999px;
            }

            .camera-card-meta {
                right: 8px;
                bottom: 8px;
                padding: 3px 7px;
                border-radius: 6px;
                font-variant-numeric: tabular-nums;
            }

            .camera-empty-state {
                grid-column: 1 / -1;
                min-height: 360px;
                display: grid;
                place-items: center;
                align-content: center;
                gap: 12px;
                text-align: center;
                color: var(--text-secondary);
            }

            .camera-empty-state img {
                width: 54px;
                height: 54px;
                opacity: 0.34;
            }

            .camera-empty-state h2 {
                margin: 0;
                font-size: 18px;
                color: var(--text-primary);
            }

            .camera-empty-state p {
                max-width: 310px;
                margin: 0;
                line-height: 1.5;
                font-size: 13px;
            }

            .camera-hero-clone {
                pointer-events: none;
                will-change: left, top, width, height, border-radius, opacity;
            }

            .camera-viewer {
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                z-index: 30;
                background: #000 !important;
                transition: opacity 0.3s ease;
            }

            .camera-canvas-wrap {
                flex: 1;
                min-height: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                position: relative;
                background: #000 !important;
            }

            .camera-main-img,
            .camera-main-video {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                transition: opacity 0.25s ease;
                user-select: none;
                -webkit-user-drag: none;
            }

            .camera-main-video {
                width: 100%;
                height: 100%;
            }

            .camera-back-btn {
                position: absolute;
                top: 12px;
                left: 12px;
                display: flex;
                align-items: center;
                gap: 6px;
                height: 32px;
                min-height: 32px;
                box-sizing: border-box;
                padding: 6px 14px;
                background: rgba(0, 0, 0, 0.5) !important;
                background-color: rgba(0, 0, 0, 0.5) !important;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                color: #fff !important;
                border: none;
                border-radius: 20px;
                cursor: pointer;
                font-size: 13px;
                line-height: 1;
                z-index: 35;
                overflow: hidden;
                transform: none !important;
                transition: background-color 0.2s, background 0.2s;
            }

            body.button-glow-enabled .camera-back-btn.button-glow-target {
                position: absolute;
                top: 12px;
                left: 12px;
            }

            .camera-back-btn:hover {
                background: rgba(0, 0, 0, 0.7) !important;
                background-color: rgba(0, 0, 0, 0.7) !important;
                transform: none !important;
            }

            .camera-back-btn::before,
            .camera-back-btn::after {
                display: none !important;
            }

            .camera-back-btn img {
                width: 16px;
                height: 16px;
                filter: brightness(0) invert(1);
            }

            .camera-counter {
                position: absolute;
                top: 12px;
                right: 12px;
                z-index: 35;
                padding: 4px 12px;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                color: #fff;
                border-radius: 12px;
                font-size: 12px;
            }

            .camera-viewer-toolbar {
                position: absolute;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 8px 16px;
                background: rgba(30, 30, 30, 0.78) !important;
                background-color: rgba(30, 30, 30, 0.78) !important;
                backdrop-filter: blur(20px) saturate(150%);
                -webkit-backdrop-filter: blur(20px) saturate(150%);
                border-radius: 28px;
                box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
                z-index: 36;
            }

            .camera-tool-btn {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                padding: 0;
                background: transparent !important;
                border: none !important;
                border-radius: 50%;
                cursor: pointer;
                transition: background 0.15s, transform 0.15s, opacity 0.15s;
            }

            .camera-tool-btn:hover {
                background: rgba(255, 255, 255, 0.12) !important;
                transform: scale(1.1);
            }

            .camera-tool-btn:disabled,
            .camera-tool-btn.is-disabled {
                opacity: 0.38;
                cursor: default;
                transform: none;
            }

            .camera-tool-btn::before,
            .camera-tool-btn::after {
                display: none !important;
            }

            .camera-tool-btn img {
                width: 20px;
                height: 20px;
                opacity: 0.9;
                filter: brightness(0) invert(1) !important;
            }

            .camera-tool-danger img {
                filter: invert(31%) sepia(89%) saturate(1884%) hue-rotate(337deg) brightness(103%) contrast(93%) !important;
            }

            .camera-tool-tooltip {
                position: absolute;
                bottom: calc(100% + 8px);
                left: 50%;
                transform: translateX(-50%) translateY(4px);
                padding: 4px 10px;
                background: rgba(20, 20, 20, 0.92);
                color: #fff;
                font-size: 11px;
                white-space: nowrap;
                border-radius: 6px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.18s ease, transform 0.18s ease;
                z-index: 40;
            }

            .camera-tool-btn:hover .camera-tool-tooltip {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }

            @media (max-width: 760px) {
                .camera-capture-bar {
                    bottom: 30px;
                    grid-template-columns: 48px 76px 48px;
                    gap: 16px;
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

                .camera-mode-switch {
                    bottom: 126px;
                }

                .camera-page-header {
                    padding: 22px 22px 16px;
                }

                .camera-stored-grid {
                    grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
                    padding: 0 22px 24px;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

window.CameraApp = CameraApp;
