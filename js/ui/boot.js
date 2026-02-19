/**
 * 开机屏幕模块
 */
const BootScreen = {
    element: null,
    hintElement: null,
    CACHE_KEY: 'fluentos.assets_cached',
    RESOURCE_CACHE_NAME: 'fluentos-resource-pack-v1',
    FAST_DURATION: 4000,
    FIRST_DURATION: 20000,
    MIN_FIRST_WAIT: 5000,
    FIRST_HINT_AT: 8000,
    _firstBootDone: false,
    _firstBootTimers: [],
    _assetCache: null,

    init() {
        this.element = document.getElementById('boot-screen');
        this._ensureFirstHint();
    },

    isFirstBoot() {
        return !localStorage.getItem(this.CACHE_KEY);
    },

    show() {
        const logo = this.element.querySelector('.boot-logo');
        if (logo) {
            logo.src = document.body.classList.contains('dark-mode')
                ? 'Theme/Icon/Fluent_logo_dark.png'
                : 'Theme/Icon/Fluent_logo.png';
            logo.style.opacity = '1';
            logo.style.visibility = '';
        }

        this.element.classList.remove('hidden');
        this.element.style.opacity = '1';
        this.element.style.transition = '';

        this._clearFirstBootTimers();
        this._hideFirstHint();
        this._firstBootDone = false;

        const shouldShowOobe = typeof OOBE !== 'undefined'
            && typeof OOBE.shouldShowOnFirstLaunch === 'function'
            && OOBE.shouldShowOnFirstLaunch();

        if (shouldShowOobe) {
            setTimeout(() => this.fadeToLock(), this.FAST_DURATION);
        } else if (this.isFirstBoot()) {
            this._firstBoot();
        } else {
            setTimeout(() => this.fadeToLock(), this.FAST_DURATION);
        }
    },

    async _firstBoot() {
        let minWaitReached = false;
        let assetsReady = false;

        const done = () => {
            if (this._firstBootDone) return;
            this._firstBootDone = true;
            this._clearFirstBootTimers();
            this._hideFirstHint();
            localStorage.setItem(this.CACHE_KEY, Date.now().toString());
            this.fadeToLock();
        };

        const tryEnterEarly = () => {
            // 资源下载完并且至少等待了 5s，才允许提前进入锁屏
            if (assetsReady && minWaitReached) {
                done();
            }
        };

        this._firstBootTimers.push(setTimeout(() => {
            minWaitReached = true;
            tryEnterEarly();
        }, this.MIN_FIRST_WAIT));

        this._firstBootTimers.push(setTimeout(() => {
            this._showFirstHint('首次使用需加载资源包，请耐心等待。');
        }, this.FIRST_HINT_AT));

        this._firstBootTimers.push(setTimeout(() => {
            // 超过 20s 强制进入锁屏
            done();
        }, this.FIRST_DURATION));

        try {
            await this._preloadResourcePackByPriority();
        } finally {
            assetsReady = true;
            tryEnterEarly();
        }
    },

    _clearFirstBootTimers() {
        this._firstBootTimers.forEach(timer => clearTimeout(timer));
        this._firstBootTimers = [];
    },

    _ensureFirstHint() {
        if (!this.element) return;
        let hint = this.element.querySelector('.boot-first-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.className = 'boot-first-hint';
            const ring = this.element.querySelector('.boot-loading-ring');
            if (ring && ring.parentNode) {
                ring.parentNode.insertBefore(hint, ring);
            } else {
                this.element.querySelector('.boot-content')?.appendChild(hint);
            }
        }
        this.hintElement = hint;
    },

    _showFirstHint(text) {
        this._ensureFirstHint();
        if (!this.hintElement) return;
        this.hintElement.textContent = text;
        this.hintElement.classList.add('show');
    },

    _hideFirstHint() {
        if (!this.hintElement) return;
        this.hintElement.classList.remove('show');
        this.hintElement.textContent = '';
    },

    _buildPriorityAssets() {
        const toRelative = (src) => {
            if (!src || typeof src !== 'string' || src.startsWith('data:')) return null;
            if (/^https?:\/\//i.test(src)) {
                try {
                    const url = new URL(src, window.location.href);
                    if (url.origin !== window.location.origin) return null;
                    return decodeURIComponent(url.pathname.replace(/^\//, ''));
                } catch (_) {
                    return null;
                }
            }
            return src.replace(/^\.\//, '').replace(/^\//, '');
        };

        const uniq = (arr) => [...new Set(arr.map(toRelative).filter(Boolean))];
        const settings = State?.settings || {};
        const lockWallpaper = settings.wallpaperLock || 'Theme/Picture/Fluent-1.png';
        const desktopWallpaper = settings.wallpaperDesktop || 'Theme/Picture/Fluent-2.png';

        const lockWallpapers = uniq([
            lockWallpaper,
            'Theme/Picture/Fluent-1.png'
        ]);

        const desktopWallpapers = uniq([
            desktopWallpaper,
            'Theme/Picture/Fluent-2.png',
            'Theme/Picture/Fluent-3.jpg',
            'Theme/Picture/Fluent-4.jpg',
            'Theme/Picture/Fluent-5.png',
            'Theme/Picture/Fluent-6.jpg',
            'Theme/Picture/Fluent-7.png',
            'Theme/Picture/Fluent-8.png'
        ]);

        const avatars = uniq([
            'Theme/Icon/UserAva.png'
        ]);

        const staticIcons = [
            'Theme/Icon/Symbol_icon/stroke/Search.svg',
            'Theme/Icon/Symbol_icon/stroke/Settings.svg',
            'Theme/Icon/Symbol_icon/stroke/Home.svg',
            'Theme/Icon/Symbol_icon/stroke/Shut Down.svg',
            'Theme/Icon/Symbol_icon/stroke/Lock.svg',
            'Theme/Icon/Symbol_icon/stroke/Logout.svg',
            'Theme/Icon/Symbol_icon/stroke/Moon.svg',
            'Theme/Icon/Symbol_icon/stroke/Sun.svg',
            'Theme/Icon/Symbol_icon/stroke/Volume Up.svg',
            'Theme/Icon/Symbol_icon/stroke/Notification Bell.svg',
            'Theme/Icon/Symbol_icon/stroke/Bluetooth_close.svg',
            'Theme/Icon/Symbol_icon/stroke/Bluetooth_open.svg',
            'Theme/Icon/Symbol_icon/stroke/Broadcast.svg',
            'Theme/Icon/Symbol_icon/stroke/Arrow Right.svg',
            'Theme/Icon/Symbol_icon/stroke/Refresh.svg',
            'Theme/Icon/Symbol_icon/fill/Moon.svg',
            'Theme/Icon/Symbol_icon/fill/Settings.svg',
            'Theme/Icon/Symbol_icon/fill/Shut Down.svg',
            'Theme/Icon/Symbol_icon/fill/Broadcast.svg',
            'Theme/Icon/Symbol_icon/fill/Stars A.svg',
            'Theme/Icon/Symbol_icon/colour/Folder.svg'
        ];

        const appIcons = Array.isArray(window.Desktop?.apps)
            ? Desktop.apps.map(app => app.icon).filter(Boolean)
            : [];

        const iconCandidates = [
            'Theme/Icon/Fluent_logo.png',
            'Theme/Icon/Fluent_logo_dark.png',
            ...staticIcons,
            ...appIcons,
            ...Array.from(document.querySelectorAll('img[src]'))
                .map(img => img.getAttribute('src'))
                .filter(src => src && src.startsWith('Theme/Icon/'))
        ];

        const icons = uniq(iconCandidates);
        return { lockWallpapers, desktopWallpapers, avatars, icons };
    },

    async _getResourceCache() {
        if (!('caches' in window)) return null;
        if (!this._assetCache) {
            this._assetCache = await caches.open(this.RESOURCE_CACHE_NAME);
        }
        return this._assetCache;
    },

    async _fetchAndCacheAsset(src) {
        try {
            const cache = await this._getResourceCache();
            const request = new Request(src, { cache: 'reload' });
            let response = await fetch(request);
            if (!response || !response.ok) {
                response = await fetch(src, { cache: 'force-cache' });
            }
            if (response && response.ok && cache) {
                await cache.put(src, response.clone());
            }
            return true;
        } catch (_) {
            return false;
        }
    },

    async _preloadGroup(assets, concurrency = 6) {
        if (!assets.length) return;
        let index = 0;
        const workerCount = Math.min(concurrency, assets.length);
        const workers = Array.from({ length: workerCount }, async () => {
            while (index < assets.length) {
                const current = assets[index++];
                await this._fetchAndCacheAsset(current);
            }
        });
        await Promise.all(workers);
    },

    async _preloadResourcePackByPriority() {
        const pack = this._buildPriorityAssets();
        await this._preloadGroup(pack.lockWallpapers, 4);     // 1. 锁屏壁纸
        await this._preloadGroup(pack.desktopWallpapers, 4);  // 2. 桌面壁纸
        await this._preloadGroup(pack.avatars, 2);            // 3. 用户头像
        await this._preloadGroup(pack.icons, 8);              // 4. 各类图标
    },

    fadeToLock() {
        const shouldGoOobe = typeof OOBE !== 'undefined'
            && typeof OOBE.shouldShowOnFirstLaunch === 'function'
            && OOBE.shouldShowOnFirstLaunch();

        const bootLogoEl = this.element ? this.element.querySelector('.boot-logo') : null;
        if (shouldGoOobe && typeof OOBE.show === 'function') {
            OOBE.show({ bootLogoEl });
        } else {
            LockScreen.show();
        }

        const targetEl = shouldGoOobe
            ? document.getElementById('oobe-screen')
            : document.getElementById('lock-screen');

        if (!targetEl) {
            State.view = shouldGoOobe ? 'oobe' : 'lock';
            return;
        }

        targetEl.style.opacity = '0';
        targetEl.classList.remove('hidden');

        this.element.style.transition = 'opacity 0.8s ease';
        this.element.style.opacity = '0';
        targetEl.style.transition = 'opacity 0.8s ease';
        targetEl.style.opacity = '1';

        setTimeout(() => {
            this.element.classList.add('hidden');
            this.element.style.transition = '';
            this.element.style.opacity = '';
            targetEl.style.transition = '';
            targetEl.style.opacity = '';
            State.view = shouldGoOobe ? 'oobe' : 'lock';
        }, 800);
    },

    hide() {
        this._clearFirstBootTimers();
        this._hideFirstHint();
        this.element.classList.add('hidden');
    }
};
