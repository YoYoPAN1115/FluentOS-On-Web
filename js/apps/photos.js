/**
 * 照片应用 - PhotosApp
 * Bing 每日壁纸查看器，支持滚轮缩放、图片调整
 * 工具栏支持 V2 药丸悬浮模式
 */
const PhotosApp = {
    windowId: null,
    container: null,
    images: [],
    currentIndex: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    isPanning: false,
    panStart: { x: 0, y: 0 },
    rotation: 0,
    flipH: false,
    flipV: false,
    adjustments: { brightness: 100, contrast: 100, saturate: 100 },
    isFullscreen: false,

    // 工具栏按钮定义（stroke/fill 图标自动切换）
    getToolbarButtons() {
        return [
            { id: 'prev', icon: 'Chevron Left', label: t('photos.prev'), action: 'prevImage' },
            { id: 'next', icon: 'Chevron Right', label: t('photos.next'), action: 'nextImage' },
            { id: 'zoom-in', icon: 'Zoom In', label: t('photos.zoom-in'), action: 'zoomIn' },
            { id: 'zoom-out', icon: 'Zoom Out', label: t('photos.zoom-out'), action: 'zoomOut' },
            { id: 'rotate-left', icon: 'Refresh Reverse', label: t('photos.rotate-left'), action: 'rotateLeft' },
            { id: 'rotate-right', icon: 'Refresh', label: t('photos.rotate-right'), action: 'rotateRight' },
            { id: 'flip-h', icon: 'Exchange A', label: t('photos.flip-h'), action: 'flipHorizontal' },
            { id: 'flip-v', icon: 'Exchange B', label: t('photos.flip-v'), action: 'flipVertical' },
            { id: 'adjust', icon: 'Color Swatch', label: t('photos.adjust'), action: 'toggleAdjustPanel' },
            { id: 'reset', icon: 'Reload', label: t('photos.reset'), action: 'resetAll' },
            { id: 'fullscreen', icon: 'Maximize', label: t('photos.fullscreen'), action: 'toggleFullscreen' },
            { id: 'download', icon: 'Download', label: t('photos.download'), action: 'downloadImage' },
            { id: 'wallpaper', icon: 'Television Upload', label: t('photos.wallpaper'), action: 'toggleWallpaperMenu' },
            { id: 'info', icon: 'Information Circle', label: t('photos.info'), action: 'toggleInfo' }
        ];
    },

    init(windowId) {
        this.windowId = windowId;
        this.container = document.getElementById(`${windowId}-content`);
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.rotation = 0;
        this.flipH = false;
        this.flipV = false;
        this.adjustments = { brightness: 100, contrast: 100, saturate: 100 };
        this.addStyles();
        this.renderSkeleton();
        this.fetchBingWallpapers();

        // 监听语言切换
        this._langHandler = () => {
            this.renderSkeleton();
            if (this.images.length > 0) this.renderGallery();
            else this.fetchBingWallpapers();
        };
        State.on('languageChange', this._langHandler);
    },

    renderSkeleton() {
        this.container.innerHTML = '';
        const app = document.createElement('div');
        app.className = 'photos-app';
        app.innerHTML = `
            <div class="photos-gallery">
                <div class="photos-loading">
                    <div class="photos-spinner"></div>
                    <p>${t('photos.loading')}</p>
                </div>
            </div>
            <div class="photos-viewer" style="display:none;">
                <div class="photos-canvas-wrap">
                    <img class="photos-main-img" src="" alt="" draggable="false">
                </div>
                ${this.renderToolbar()}
                <div class="photos-adjust-panel" style="display:none;">
                    <div class="photos-adjust-title">${t('photos.adjust-title')}</div>
                    <div class="photos-adjust-item">
                        <label>${t('photos.brightness')}</label>
                        <input type="range" min="0" max="200" value="100" data-adj="brightness">
                        <span class="photos-adj-val">100%</span>
                    </div>
                    <div class="photos-adjust-item">
                        <label>${t('photos.contrast')}</label>
                        <input type="range" min="0" max="200" value="100" data-adj="contrast">
                        <span class="photos-adj-val">100%</span>
                    </div>
                    <div class="photos-adjust-item">
                        <label>${t('photos.saturation')}</label>
                        <input type="range" min="0" max="200" value="100" data-adj="saturate">
                        <span class="photos-adj-val">100%</span>
                    </div>
                </div>
                <div class="photos-info-panel" style="display:none;"></div>
                <div class="photos-wallpaper-menu" style="display:none;">
                    <button class="photos-wpmenu-item" data-wp-action="desktop">
                        <img src="Theme/Icon/Symbol_icon/stroke/Television.svg" alt="">
                        <span>${t('photos.set-desktop')}</span>
                    </button>
                    <button class="photos-wpmenu-item" data-wp-action="lock">
                        <img src="Theme/Icon/Symbol_icon/stroke/Lock.svg" alt="">
                        <span>${t('photos.set-lock')}</span>
                    </button>
                </div>
                <button class="photos-back-btn">
                    <img src="Theme/Icon/Symbol_icon/stroke/Arrow Left.svg" alt="">
                    <span>${t('photos.back')}</span>
                </button>
                <div class="photos-counter"></div>
            </div>
        `;
        this.container.appendChild(app);
        this.bindEvents();
    },

    renderToolbar() {
        const isV2 = document.body.classList.contains('fluent-v2');
        const cls = isV2 ? 'photos-toolbar photos-toolbar-v2' : 'photos-toolbar photos-toolbar-classic';
        const buttons = this.getToolbarButtons();
        let html = `<div class="${cls}">`;
        for (const btn of buttons) {
            html += `
                <button class="photos-tool-btn" data-action="${btn.action}" data-icon="${btn.icon}" data-tooltip="${btn.label}">
                    <img src="Theme/Icon/Symbol_icon/stroke/${btn.icon}.svg" alt="${btn.label}">
                    <span class="photos-tool-tooltip">${btn.label}</span>
                </button>`;
        }
        html += '</div>';
        return html;
    },

    async fetchBingWallpapers() {
        try {
            // 使用 bing.biturl.top 第三方 API（无 CORS 限制）
            // 并发请求最近 10 天的壁纸，index=0 为今天，index=1 为昨天...
            const count = 10;
            const promises = [];
            for (let i = 0; i < count; i++) {
                const url = `https://bing.biturl.top/?resolution=1920&format=json&index=${i}&mkt=zh-CN`;
                promises.push(
                    fetch(url)
                        .then(r => r.ok ? r.json() : null)
                        .catch(() => null)
                );
            }
            const results = await Promise.all(promises);
            this.images = results
                .filter(r => r && r.url)
                .map((r, i) => {
                    const hdUrl = r.url.replace(/1920x1080/g, 'UHD');
                    const dateStr = r.start_date || '';
                    // 从 copyright 中提取标题（括号前的部分）
                    const title = (r.copyright || '').split(/[（(]/)[0].trim();
                    return {
                        url: r.url,
                        urlHD: hdUrl,
                        title: title || `${t('photos.wallpaper-default')}#${i + 1}`,
                        copyright: r.copyright || '',
                        date: dateStr,
                        copyrightlink: r.copyright_link || ''
                    };
                });
            if (this.images.length === 0) throw new Error('No wallpapers');
            this.renderGallery();
        } catch (e2) {
            console.error('[PhotosApp] Bing wallpaper API failed', e2);
            this.renderGalleryError();
        }
    },

    renderGalleryError() {
        const gallery = this.container.querySelector('.photos-gallery');
        if (!gallery) return;
        gallery.innerHTML = `
            <div class="photos-error">
                <img src="Theme/Icon/Symbol_icon/stroke/Exclamation Circle.svg" alt="">
                <h3>${t('photos.error-title')}</h3>
                <p>${t('photos.error-desc')}</p>
                <button class="photos-retry-btn">${t('photos.retry')}</button>
            </div>`;
        const retryBtn = gallery.querySelector('.photos-retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.fetchBingWallpapers());
        }
    },

    getGreeting() {
        const h = new Date().getHours();
        if (h < 6) return t('photos.greeting.night');
        if (h < 12) return t('photos.greeting.morning');
        if (h < 14) return t('photos.greeting.noon');
        if (h < 18) return t('photos.greeting.afternoon');
        return t('photos.greeting.evening');
    },

    getDateString() {
        const now = new Date();
        const month = t(`photos.month-${now.getMonth() + 1}`);
        return t('photos.date-format', { month, day: now.getDate() });
    },

    renderGallery(query) {
        const gallery = this.container.querySelector('.photos-gallery');
        if (!gallery) return;

        const q = (query || '').trim().toLowerCase();
        const colors = ['#f44336','#4caf50','#ff9800','#2196f3','#9c27b0','#00bcd4','#e91e63','#8bc34a','#ff5722'];

        // 如果搜索栏已存在，只更新卡片区域
        const existingHome = gallery.querySelector('.photos-home');
        if (existingHome) {
            const container = existingHome.querySelector('.photos-cards-container');
            const clearBtn = existingHome.querySelector('.photos-search-clear');
            const searchBar = existingHome.querySelector('.photos-search-bar');
            if (container) {
                container.innerHTML = this._buildCardsHTML(q, colors);
                if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
                if (searchBar) {
                    if (q) searchBar.classList.add('photos-search-active');
                    else searchBar.classList.remove('photos-search-active');
                }
                return;
            }
        }

        // 首次渲染：构建完整 DOM
        gallery.innerHTML = `
            <div class="photos-home">
                <div class="photos-home-header">
                    <h1 class="photos-greeting">${this.getGreeting()}</h1>
                    <p class="photos-date">${this.getDateString()}</p>
                </div>
                <div class="photos-search-bar">
                    <img src="Theme/Icon/Symbol_icon/stroke/Search.svg" alt="" class="photos-search-icon">
                    <input type="text" class="photos-search-input" placeholder="${t('photos.search')}">
                    <img src="Theme/Icon/Symbol_icon/stroke/Cancel.svg" alt="" class="photos-search-clear" style="display:none;">
                </div>
                <div class="photos-cards-container">
                    ${this._buildCardsHTML(q, colors)}
                </div>
            </div>`;
    },

    _buildCardsHTML(q, colors) {
        let filtered = this.images.map((img, i) => ({ img, idx: i }));
        if (q) {
            filtered = filtered.filter(({ img }) =>
                (img.title || '').toLowerCase().includes(q) ||
                (img.copyright || '').toLowerCase().includes(q) ||
                (img.date || '').includes(q)
            );
        }

        if (filtered.length === 0) {
            return `<div class="photos-no-result"><p>${t('photos.no-result')}</p></div>`;
        }

        if (q) {
            // 搜索模式：全部用自适应网格小卡片
            return `<div class="photos-card-grid">
                ${filtered.map(({ img, idx }) => `
                <div class="photos-card photos-card-small" data-index="${idx}">
                    <div class="photos-card-inner">
                        <img src="${img.url}" alt="${img.title}" loading="lazy">
                        <div class="photos-card-caption">
                            <span class="photos-card-dot" style="background:${colors[idx % colors.length]};"></span>
                            <span class="photos-card-title">${img.title}</span>
                        </div>
                    </div>
                </div>`).join('')}
            </div>`;
        }

        // 默认模式：精选大卡片 + 自适应网格
        const f = filtered[0];
        const rest = filtered.slice(1);
        return `${f ? `
            <div class="photos-card photos-card-featured" data-index="${f.idx}">
                <div class="photos-card-inner">
                    <img src="${f.img.url}" alt="${f.img.title}" loading="lazy">
                    <div class="photos-card-caption">
                        <span class="photos-card-dot" style="background:#0078d4;"></span>
                        <span class="photos-card-title">${f.img.title}</span>
                    </div>
                    <div class="photos-card-meta">${this.formatDate(f.img.date)}</div>
                </div>
            </div>` : ''}
            <div class="photos-card-grid">
                ${rest.map(({ img, idx }) => `
                <div class="photos-card photos-card-small" data-index="${idx}">
                    <div class="photos-card-inner">
                        <img src="${img.url}" alt="${img.title}" loading="lazy">
                        <div class="photos-card-caption">
                            <span class="photos-card-dot" style="background:${colors[idx % colors.length]};"></span>
                            <span class="photos-card-title">${img.title}</span>
                        </div>
                    </div>
                </div>`).join('')}
            </div>`;
    },

    formatDate(dateStr) {
        if (!dateStr || dateStr.length < 8) return '';
        return `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
    },

    // 获取卡片相对于 .photos-app 容器的位置
    _getCardRect(index) {
        const card = this.container.querySelector(`.photos-card[data-index="${index}"]`);
        const app = this.container.querySelector('.photos-app');
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
        this.currentIndex = index;
        this.resetTransform();
        const gallery = this.container.querySelector('.photos-gallery');
        const viewer = this.container.querySelector('.photos-viewer');
        const mainImg = this.container.querySelector('.photos-main-img');
        if (!gallery || !viewer || !mainImg) return;

        const rect = this._getCardRect(index);
        const img = this.images[index];
        if (!img) return;

        // 准备查看器内容（先设置 src）
        mainImg.src = img.url;
        mainImg.alt = img.title;
        const counter = this.container.querySelector('.photos-counter');
        if (counter) counter.textContent = `${index + 1}/ ${this.images.length}`;

        // 创建飞行克隆
        if (rect) {
            const card = this.container.querySelector(`.photos-card[data-index="${index}"] img`);
            const clone = document.createElement('div');
            clone.className = 'photos-hero-clone';
            clone.style.cssText = `
                position:absolute; z-index:50; border-radius:12px; overflow:hidden;
                left:${rect.left}px; top:${rect.top}px; width:${rect.width}px; height:${rect.height}px;
                background-image:url(${img.url}); background-size:cover; background-position:center;
                transition: left 0.45s cubic-bezier(0.4,0,0.2,1), top 0.45s cubic-bezier(0.4,0,0.2,1),
                            width 0.45s cubic-bezier(0.4,0,0.2,1), height 0.45s cubic-bezier(0.4,0,0.2,1),
                            border-radius 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.15s ease;
            `;
            const app = this.container.querySelector('.photos-app');
            app.appendChild(clone);

            // 隐藏画廊，显示查看器（透明）
            gallery.style.display = 'none';
            viewer.style.display = 'flex';
            viewer.style.opacity = '0';
            mainImg.style.opacity = '0';

            // 目标：全屏
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
                mainImg.style.opacity = '1';
                clone.style.opacity = '0';
                setTimeout(() => clone.remove(), 200);
            }, 420);
        } else {
            gallery.style.display = 'none';
            viewer.style.display = 'flex';
            viewer.style.opacity = '1';
            mainImg.style.opacity = '1';
        }

        this.applyTransform();
        this.updateInfoPanel();
    },

    closeViewer() {
        const gallery = this.container.querySelector('.photos-gallery');
        const viewer = this.container.querySelector('.photos-viewer');
        const mainImg = this.container.querySelector('.photos-main-img');
        if (!gallery || !viewer) return;

        // 隐藏面板
        ['.photos-adjust-panel', '.photos-info-panel', '.photos-wallpaper-menu'].forEach(s => {
            const p = this.container.querySelector(s);
            if (p) { p.classList.remove('photos-panel-visible'); p.style.display = 'none'; }
        });

        // 先恢复画廊（隐藏状态）以便计算卡片位置
        gallery.style.display = '';
        gallery.style.visibility = 'hidden';
        const rect = this._getCardRect(this.currentIndex);
        gallery.style.visibility = '';

        if (rect && mainImg) {
            const app = this.container.querySelector('.photos-app');
            const appR = app.getBoundingClientRect();
            const img = this.images[this.currentIndex];

            const clone = document.createElement('div');
            clone.className = 'photos-hero-clone';
            clone.style.cssText = `
                position:absolute; z-index:50; border-radius:0px; overflow:hidden;
                left:0px; top:0px; width:${appR.width}px; height:${appR.height}px;
                background-image:url(${img ? img.url : mainImg.src}); background-size:cover; background-position:center;
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
                clone.style.borderRadius = '12px';
            });

            setTimeout(() => {
                clone.style.opacity = '0';
                setTimeout(() => clone.remove(), 200);
            }, 380);
        } else {
            viewer.style.display = 'none';
        }
    },

    updateViewer() {
        const img = this.images[this.currentIndex];
        if (!img) return;
        const mainImg = this.container.querySelector('.photos-main-img');
        const counter = this.container.querySelector('.photos-counter');
        if (mainImg) {
            mainImg.src = img.url;
            mainImg.alt = img.title;
        }
        if (counter) counter.textContent = `${this.currentIndex + 1}/ ${this.images.length}`;
        this.applyTransform();
        this.updateInfoPanel();
    },

    updateInfoPanel() {
        const panel = this.container.querySelector('.photos-info-panel');
        const img = this.images[this.currentIndex];
        if (!panel || !img) return;
        const dateLabel = t('photos.info-date');
        const copyrightLabel = t('photos.info-copyright');
        const zoomLabel = t('photos.info-zoom');
        const rotateLabel = t('photos.info-rotate');
        panel.innerHTML = `
            <div class="photos-info-title">${img.title}</div>
            <div class="photos-info-row"><span>${dateLabel}</span><span>${this.formatDate(img.date)}</span></div>
            <div class="photos-info-row"><span>${copyrightLabel}</span><span>${img.copyright}</span></div>
            <div class="photos-info-row"><span>${zoomLabel}</span><span>${Math.round(this.zoom * 100)}%</span></div>
            <div class="photos-info-row"><span>${rotateLabel}</span><span>${this.rotation}°</span></div>
        `;
    },

    applyTransform(smooth = true) {
        const mainImg = this.container.querySelector('.photos-main-img');
        if (!mainImg) return;
        const scaleX = this.flipH ? -this.zoom : this.zoom;
        const scaleY = this.flipV ? -this.zoom : this.zoom;
        mainImg.style.transition = smooth
            ? 'transform 0.35s cubic-bezier(0.4,0,0.2,1), filter 0.3s ease'
            : 'none';
        mainImg.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${scaleX}, ${scaleY}) rotate(${this.rotation}deg)`;
        mainImg.style.filter = `brightness(${this.adjustments.brightness}%) contrast(${this.adjustments.contrast}%) saturate(${this.adjustments.saturate}%)`;
    },

    resetTransform() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.rotation = 0;
        this.flipH = false;
        this.flipV = false;
        this.adjustments = { brightness: 100, contrast: 100, saturate: 100 };
        // 重置滑块
        this.container.querySelectorAll('.photos-adjust-item input').forEach(inp => {
            inp.value = 100;
            const val = inp.closest('.photos-adjust-item').querySelector('.photos-adj-val');
            if (val) val.textContent = '100%';
        });
    },

    // 工具栏动作
    prevImage() {
        if (this.currentIndex > 0) { this.currentIndex--; this.resetTransform(); this.updateViewer(); }
    },
    nextImage() {
        if (this.currentIndex < this.images.length - 1) { this.currentIndex++; this.resetTransform(); this.updateViewer(); }
    },
    zoomIn() { this.zoom = Math.min(this.zoom * 1.25, 10); this.applyTransform(); this.updateInfoPanel(); },
    zoomOut() { this.zoom = Math.max(this.zoom / 1.25, 0.1); this.applyTransform(); this.updateInfoPanel(); },
    rotateLeft() { this.rotation = (this.rotation - 90) % 360; this.applyTransform(); this.updateInfoPanel(); },
    rotateRight() { this.rotation = (this.rotation + 90) % 360; this.applyTransform(); this.updateInfoPanel(); },
    flipHorizontal() { this.flipH = !this.flipH; this.applyTransform(); },
    flipVertical() { this.flipV = !this.flipV; this.applyTransform(); },
    resetAll() { this.resetTransform(); this.applyTransform(); this.updateInfoPanel(); },

    // 面板滑入/滑出动画通用方法
    _togglePanel(selector) {
        const panel = this.container.querySelector(selector);
        if (!panel) return;
        const isVisible = panel.classList.contains('photos-panel-visible');
        if (isVisible) {
            panel.classList.remove('photos-panel-visible');
            setTimeout(() => { panel.style.display = 'none'; }, 250);
        } else {
            // 关闭其他面板
            ['.photos-adjust-panel', '.photos-info-panel', '.photos-wallpaper-menu'].forEach(s => {
                if (s === selector) return;
                const other = this.container.querySelector(s);
                if (other && other.classList.contains('photos-panel-visible')) {
                    other.classList.remove('photos-panel-visible');
                    setTimeout(() => { other.style.display = 'none'; }, 250);
                }
            });
            panel.style.display = 'flex';
            requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('photos-panel-visible')));
        }
    },

    toggleAdjustPanel() { this._togglePanel('.photos-adjust-panel'); },
    toggleInfo() { this._togglePanel('.photos-info-panel'); },
    toggleWallpaperMenu() { this._togglePanel('.photos-wallpaper-menu'); },

    setAsDesktopWallpaper() {
        const img = this.images[this.currentIndex];
        if (!img) return;
        if (typeof State !== 'undefined' && typeof Desktop !== 'undefined') {
            State.updateSettings({ wallpaperDesktop: img.url });
            Desktop.updateWallpaper();
            State.addNotification({ title: t('photos.wallpaper'), message: t('photos.desktop-set'), type: 'success' });
        }
        this._togglePanel('.photos-wallpaper-menu');
    },

    setAsLockWallpaper() {
        const img = this.images[this.currentIndex];
        if (!img) return;
        if (typeof State !== 'undefined') {
            State.updateSettings({ wallpaperLock: img.url });
            if (typeof LockScreen !== 'undefined' && LockScreen.updateWallpaper) LockScreen.updateWallpaper();
            State.addNotification({ title: t('photos.wallpaper'), message: t('photos.lock-set'), type: 'success' });
        }
        this._togglePanel('.photos-wallpaper-menu');
    },

    toggleFullscreen() {
        const viewer = this.container.querySelector('.photos-viewer');
        if (!viewer) return;
        viewer.classList.toggle('photos-fullscreen');
    },
    downloadImage() {
        const img = this.images[this.currentIndex];
        if (!img) return;
        const a = document.createElement('a');
        a.href = img.url;
        a.download = `bing-wallpaper-${img.date || 'image'}.jpg`;
        a.target = '_blank';
        a.click();
    },

    // 有对应 fill 图标的列表
    fillIcons: ['Zoom In', 'Zoom Out', 'Color Swatch', 'Information Circle', 'Television Upload'],

    // 图标点击动画
    animateIcon(btn) {
        const img = btn.querySelector('img');
        const iconName = btn.dataset.icon;
        if (!img || !iconName) return;

        const hasFill = this.fillIcons.includes(iconName);
        img.style.transition = 'transform 0.15s ease, opacity 0.15s ease';

        if (hasFill) {
            // stroke → fill → stroke
            img.src = `Theme/Icon/Symbol_icon/fill/${iconName}.svg`;
            img.style.transform = 'scale(0.85)';
            setTimeout(() => { img.style.transform = 'scale(1)'; }, 150);
            setTimeout(() => { img.src = `Theme/Icon/Symbol_icon/stroke/${iconName}.svg`; }, 400);
        } else {
            // 无 fill 版本：缩放 + 闪烁动画
            img.style.transform = 'scale(0.75)';
            img.style.opacity = '0.5';
            setTimeout(() => {
                img.style.transform = 'scale(1.1)';
                img.style.opacity = '1';
            }, 120);
            setTimeout(() => {
                img.style.transform = 'scale(1)';
            }, 250);
        }
    },

    bindEvents() {
        const app = this.container.querySelector('.photos-app');
        if (!app) return;

        // 搜索输入（使用事件委托，因为 renderGallery 会重建 DOM）
        let searchTimer = null;
        app.addEventListener('input', (e) => {
            if (!e.target.classList.contains('photos-search-input')) return;
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                this.renderGallery(e.target.value);
            }, 200);
        });
        // 搜索清除按钮
        app.addEventListener('click', (e) => {
            if (e.target.closest('.photos-search-clear')) {
                const input = app.querySelector('.photos-search-input');
                if (input) input.value = '';
                this.renderGallery();
                return;
            }

            const cardItem = e.target.closest('.photos-card');
            if (cardItem) {
                this.openViewer(parseInt(cardItem.dataset.index));
                return;
            }
            const backBtn = e.target.closest('.photos-back-btn');
            if (backBtn) { this.closeViewer(); return; }

            const toolBtn = e.target.closest('.photos-tool-btn');
            if (toolBtn) {
                const action = toolBtn.dataset.action;
                if (action && typeof this[action] === 'function') {
                    this.animateIcon(toolBtn);
                    this[action]();
                }
                return;
            }

            // 壁纸菜单项点击
            const wpItem = e.target.closest('.photos-wpmenu-item');
            if (wpItem) {
                const wpAction = wpItem.dataset.wpAction;
                if (wpAction === 'desktop') this.setAsDesktopWallpaper();
                else if (wpAction === 'lock') this.setAsLockWallpaper();
                return;
            }

            // 点击查看器空白区域关闭所有面板
            if (e.target.closest('.photos-canvas-wrap') && !e.target.closest('.photos-tool-btn')) {
                ['.photos-adjust-panel', '.photos-info-panel', '.photos-wallpaper-menu'].forEach(s => {
                    const p = this.container.querySelector(s);
                    if (p && p.classList.contains('photos-panel-visible')) {
                        p.classList.remove('photos-panel-visible');
                        setTimeout(() => { p.style.display = 'none'; }, 250);
                    }
                });
            }
        });

        // 滚轮缩放
        const canvasWrap = app.querySelector('.photos-canvas-wrap');
        if (canvasWrap) {
            canvasWrap.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                this.zoom = Math.max(0.1, Math.min(10, this.zoom * delta));
                this.applyTransform(false);
                this.updateInfoPanel();
            }, { passive: false });

            // 拖拽平移
            canvasWrap.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                this.isPanning = true;
                this.panStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
                canvasWrap.style.cursor = 'grabbing';
            });
            window.addEventListener('mousemove', (e) => {
                if (!this.isPanning) return;
                this.panX = e.clientX - this.panStart.x;
                this.panY = e.clientY - this.panStart.y;
                this.applyTransform(false);
            });
            window.addEventListener('mouseup', () => {
                if (this.isPanning) {
                    this.isPanning = false;
                    if (canvasWrap) canvasWrap.style.cursor = '';
                }
            });
        }

        // 调整面板滑块
        app.querySelectorAll('.photos-adjust-item input').forEach(inp => {
            inp.addEventListener('input', () => {
                const key = inp.dataset.adj;
                const val = parseInt(inp.value);
                this.adjustments[key] = val;
                const valSpan = inp.closest('.photos-adjust-item').querySelector('.photos-adj-val');
                if (valSpan) valSpan.textContent = `${val}%`;
                this.applyTransform(false);
            });
        });
    },

    addStyles() {
        const existing = document.getElementById('photos-app-styles');
        if (existing) existing.remove();
        const style = document.createElement('style');
        style.id = 'photos-app-styles';
        style.textContent = this.getCSS();
        document.head.appendChild(style);
    },

    getCSS() {
        return `
            .photos-app { display:flex; flex-direction:column; height:100%; background:var(--bg-primary); overflow:hidden; position:relative; }
            .photos-app *::-webkit-scrollbar { width:6px; height:6px; }
            .photos-app *::-webkit-scrollbar-track { background:transparent; }
            .photos-app *::-webkit-scrollbar-thumb { background:var(--text-tertiary); border-radius:3px; }
            .photos-app *::-webkit-scrollbar-thumb:hover { background:var(--text-secondary); }
            .photos-app * { scrollbar-width:thin; scrollbar-color:var(--text-tertiary) transparent; }

            /* ===== 主页 ===== */
            .photos-gallery { flex:1; overflow-y:auto; padding:0; }
            .photos-home { padding:0 0 32px; }

            /* 问候头部 */
            .photos-home-header { text-align:center; padding:48px 32px 12px; }
            .photos-greeting { margin:0; font-size:42px; font-weight:300; color:var(--text-primary); letter-spacing:-0.5px; }
            .photos-date { margin:6px 0 0; font-size:16px; color:var(--text-secondary); font-weight:400; }

            /* 搜索栏 */
            .photos-search-bar { display:flex; align-items:center; gap:10px; max-width:520px; margin:20px auto 36px; padding:10px 18px; background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:24px; transition:box-shadow 0.2s, border-color 0.2s; }
            .photos-search-bar:hover, .photos-search-bar:focus-within { border-color:var(--accent); box-shadow:0 2px 12px rgba(0,120,212,0.08); }
            .photos-search-active { border-color:var(--accent); box-shadow:0 2px 12px rgba(0,120,212,0.12); }
            .photos-search-icon { width:16px; height:16px; opacity:0.5; flex-shrink:0; }
            .dark-mode .photos-search-icon { filter:brightness(0) invert(1); }
            .photos-search-input { flex:1; border:none; background:transparent; outline:none; font-size:14px; color:var(--text-primary); cursor:text; }
            .photos-search-input::placeholder { color:var(--text-tertiary); }
            .photos-search-clear { width:16px; height:16px; opacity:0.4; cursor:pointer; flex-shrink:0; transition:opacity 0.15s; }
            .photos-search-clear:hover { opacity:0.8; }
            .dark-mode .photos-search-clear { filter:brightness(0) invert(1); }
            .photos-no-result { text-align:center; padding:60px 20px; color:var(--text-secondary); font-size:14px; }

            /* 卡片容器 */
            .photos-cards-container { display:flex; flex-direction:column; gap:16px; padding:0 32px; max-width:1200px; margin:0 auto; }

            /* 卡片通用 */
            .photos-card { cursor:pointer; border-radius:12px; overflow:hidden; background:var(--bg-secondary); box-shadow:0 1px 4px rgba(0,0,0,0.06); transition:transform 0.2s, box-shadow 0.2s; }
            .photos-card:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,0.1); }
            .dark-mode .photos-card { box-shadow:0 1px 4px rgba(0,0,0,0.2); }
            .dark-mode .photos-card:hover { box-shadow:0 6px 20px rgba(0,0,0,0.35); }
            .photos-card-inner { position:relative; }
            .photos-card-inner > img { width:100%; display:block; object-fit:cover; }

            /* 精选大卡片 */
            .photos-card-featured { max-width:100%; }
            .photos-card-featured .photos-card-inner > img { aspect-ratio:2/1; }
            .photos-card-meta { position:absolute; top:12px; right:12px; padding:3px 10px; background:rgba(0,0,0,0.45); backdrop-filter:blur(6px); color:#fff; border-radius:10px; font-size:11px; }

            /* 卡片标题 */
            .photos-card-caption { display:flex; align-items:center; gap:8px; padding:10px 14px; }
            .photos-card-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
            .photos-card-title { font-size:13px; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

            /* 自适应网格 — 用 auto-fill 根据容器宽度自动调整列数 */
            .photos-card-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:16px; }
            .photos-card-small .photos-card-inner > img { aspect-ratio:16/10; }

            /* 旧的固定3列行（兼容） */
            .photos-card-row { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:16px; }

            /* 加载 & 错误 */
            .photos-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:16px; color:var(--text-secondary); }
            .photos-spinner { width:32px; height:32px; border:3px solid var(--border-color); border-top-color:var(--accent); border-radius:50%; animation:photos-spin 0.8s linear infinite; }
            @keyframes photos-spin { to { transform:rotate(360deg); }}
            .photos-error { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:12px; color:var(--text-secondary); }
            .photos-error img { width:48px; height:48px; opacity:0.4; }
            .photos-error h3 { margin:0; font-size:18px; }
            .photos-error p { margin:0; font-size:13px; }
            .photos-retry-btn { padding:8px 24px; background:var(--accent); color:#fff; border:none; border-radius:20px; cursor:pointer; font-size:13px; }
            .photos-retry-btn:hover { opacity:0.9; }

            /* ===== 飞行克隆动画 ===== */
            .photos-hero-clone { pointer-events:none; will-change:left,top,width,height,border-radius,opacity; }

            /* ===== 查看器 ===== */
            .photos-viewer { display:flex; flex-direction:column; height:100%; position:relative; background:#000 !important; background-color:#000 !important; background-image:none !important; transition:opacity 0.3s ease; }
            .photos-canvas-wrap { flex:1; display:flex; align-items:center; justify-content:center; overflow:hidden; cursor:grab; position:relative; background:#000 !important; }
            .photos-main-img { max-width:100%; max-height:100%; object-fit:contain; transition:filter 0.2s, opacity 0.25s ease; user-select:none; -webkit-user-drag:none; }
            .photos-back-btn { position:absolute; top:12px; left:12px; display:flex; align-items:center; gap:6px; padding:6px 14px; background:rgba(0,0,0,0.5) !important; background-color:rgba(0,0,0,0.5) !important; backdrop-filter:blur(10px); color:#fff !important; border:none; border-radius:20px; cursor:pointer; font-size:13px; z-index:10; transition:background 0.2s; }
            .photos-back-btn:hover { background:rgba(0,0,0,0.7) !important; background-color:rgba(0,0,0,0.7) !important; }
            .photos-back-btn img { width:16px; height:16px; filter:brightness(0) invert(1); }
            .photos-counter { position:absolute; top:12px; right:12px; padding:4px 12px; background:rgba(0,0,0,0.5) !important; background-color:rgba(0,0,0,0.5) !important; backdrop-filter:blur(10px); color:#fff !important; border-radius:12px; font-size:12px; z-index:10; }

            /* ===== 工具栏通用：tooltip ===== */
            .photos-tool-btn { position:relative; }
            .photos-tool-tooltip { position:absolute; bottom:calc(100% + 8px); left:50%; transform:translateX(-50%) translateY(4px); padding:4px 10px; background:rgba(20,20,20,0.92); color:#fff; font-size:11px; white-space:nowrap; border-radius:6px; pointer-events:none; opacity:0; transition:opacity 0.18s ease, transform 0.18s ease; z-index:30; }
            .photos-tool-btn:hover .photos-tool-tooltip { opacity:1; transform:translateX(-50%) translateY(0); }

            /* 经典工具栏 — 查看器内始终深色背景 */
            .photos-toolbar-classic { display:flex; align-items:center; justify-content:center; gap:2px; padding:8px 16px; background:rgba(24,24,24,0.95) !important; background-color:rgba(24,24,24,0.95) !important; backdrop-filter:blur(16px); border-top:1px solid rgba(255,255,255,0.08); flex-shrink:0; flex-wrap:wrap; }
            .photos-toolbar-classic .photos-tool-btn { display:flex; align-items:center; gap:6px; padding:8px 12px; background:transparent !important; background-color:transparent !important; background-image:none !important; border:none !important; border-radius:6px; cursor:pointer; color:rgba(255,255,255,0.9) !important; font-size:12px; transition:background 0.15s; -webkit-background-clip:unset !important; background-clip:unset !important; }
            .photos-toolbar-classic .photos-tool-btn:hover { background:rgba(255,255,255,0.1) !important; background-color:rgba(255,255,255,0.1) !important; }
            .photos-toolbar-classic .photos-tool-btn::before, .photos-toolbar-classic .photos-tool-btn::after { display:none !important; }
            .photos-toolbar-classic .photos-tool-btn img { width:18px; height:18px; opacity:0.9; filter:brightness(0) invert(1) !important; }

            /* V2 药丸悬浮工具栏 — 查看器内半透明深色 */
            .photos-toolbar-v2 { position:absolute; bottom:24px; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:4px; padding:8px 16px; background:rgba(30,30,30,0.78) !important; background-color:rgba(30,30,30,0.78) !important; backdrop-filter:blur(20px) saturate(150%); border-radius:28px; box-shadow:0 4px 24px rgba(0,0,0,0.3); z-index:20; }
            .photos-toolbar-v2 .photos-tool-btn { display:flex; align-items:center; justify-content:center; width:36px; height:36px; padding:0; background:transparent !important; background-color:transparent !important; background-image:none !important; border:none !important; border-radius:50%; cursor:pointer; transition:background 0.15s, transform 0.15s; -webkit-background-clip:unset !important; background-clip:unset !important; color:transparent; }
            .photos-toolbar-v2 .photos-tool-btn:hover { background:rgba(255,255,255,0.12) !important; background-color:rgba(255,255,255,0.12) !important; transform:scale(1.1); }
            .photos-toolbar-v2 .photos-tool-btn::before, .photos-toolbar-v2 .photos-tool-btn::after { display:none !important; }
            .photos-toolbar-v2 .photos-tool-btn img { width:20px; height:20px; opacity:0.9; filter:brightness(0) invert(1) !important; }
            .photos-toolbar-v2 .photos-tool-btn > span.photos-tool-tooltip { display:block !important; }

            /* 调整面板 — 滑入/滑出动画 */
            .photos-adjust-panel { position:absolute; bottom:80px; right:16px; display:flex; flex-direction:column; gap:12px; padding:16px 20px; background:rgba(30,30,30,0.9) !important; background-color:rgba(30,30,30,0.9) !important; backdrop-filter:blur(20px); border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.3); z-index:25; min-width:220px; opacity:0; transform:translateY(12px) scale(0.96); transition:opacity 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1); pointer-events:none; }
            .photos-adjust-panel.photos-panel-visible { opacity:1; transform:translateY(0) scale(1); pointer-events:auto; }
            .photos-adjust-title { font-size:14px; font-weight:600; color:#fff !important; margin-bottom:4px; }
            .photos-adjust-item { display:flex; align-items:center; gap:10px; }
            .photos-adjust-item label { font-size:12px; color:rgba(255,255,255,0.7) !important; min-width:42px; }
            .photos-adjust-item input[type=range] { flex:1; height:4px; -webkit-appearance:none; appearance:none; background:rgba(255,255,255,0.2) !important; border-radius:2px; outline:none; }
            .photos-adjust-item input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:var(--accent); cursor:pointer; }
            .photos-adj-val { font-size:11px; color:rgba(255,255,255,0.5) !important; min-width:32px; text-align:right; }

            /* 信息面板 — 滑入/滑出动画 */
            .photos-info-panel { position:absolute; bottom:80px; left:16px; display:flex; flex-direction:column; gap:8px; padding:16px 20px; background:rgba(30,30,30,0.9) !important; background-color:rgba(30,30,30,0.9) !important; backdrop-filter:blur(20px); border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.3); z-index:25; min-width:240px; max-width:320px; opacity:0; transform:translateY(12px) scale(0.96); transition:opacity 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1); pointer-events:none; }
            .photos-info-panel.photos-panel-visible { opacity:1; transform:translateY(0) scale(1); pointer-events:auto; }
            .photos-info-title { font-size:14px; font-weight:600; color:#fff !important; margin-bottom:4px; }
            .photos-info-row { display:flex; justify-content:space-between; gap:12px; font-size:12px; }
            .photos-info-row span:first-child { color:rgba(255,255,255,0.6) !important; flex-shrink:0; }
            .photos-info-row span:last-child { color:#fff !important; text-align:right; word-break:break-all; }

            /* 壁纸菜单 — 滑入/滑出动画 */
            .photos-wallpaper-menu { position:absolute; bottom:80px; right:50%; transform:translateX(50%) translateY(12px) scale(0.96); display:flex; flex-direction:column; gap:2px; padding:6px; background:rgba(30,30,30,0.92) !important; background-color:rgba(30,30,30,0.92) !important; backdrop-filter:blur(20px) saturate(150%); border-radius:10px; box-shadow:0 6px 24px rgba(0,0,0,0.4); z-index:25; min-width:180px; opacity:0; transition:opacity 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1); pointer-events:none; }
            .photos-wallpaper-menu.photos-panel-visible { opacity:1; transform:translateX(50%) translateY(0) scale(1); pointer-events:auto; }
            .photos-wpmenu-item { display:flex; align-items:center; gap:10px; padding:10px 14px; background:transparent !important; background-color:transparent !important; background-image:none !important; border:none !important; border-radius:6px; cursor:pointer; color:#fff !important; font-size:13px; transition:background 0.15s; -webkit-background-clip:unset !important; background-clip:unset !important; }
            .photos-wpmenu-item:hover { background:rgba(255,255,255,0.1) !important; background-color:rgba(255,255,255,0.1) !important; }
            .photos-wpmenu-item::before, .photos-wpmenu-item::after { display:none !important; }
            .photos-wpmenu-item img { width:18px; height:18px; filter:brightness(0) invert(1) !important; opacity:0.9; }
            .photos-wpmenu-item span { white-space:nowrap; }

            /* 全屏 */
            .photos-fullscreen { position:fixed !important; top:0; left:0; width:100vw !important; height:100vh !important; z-index:9999; }
        `;
    }
};

window.PhotosApp = PhotosApp;
