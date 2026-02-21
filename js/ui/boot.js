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
    _backgroundWarmPromise: null,
    _hintRotateTimer: null,
    _hintSwitchTimer: null,

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
            this._bootIntoOobeWithEssentialAssets();
        } else {
            this._preloadAndWarmResourcePackInBackground().catch(() => {});
            setTimeout(() => this.fadeToLock(), this.FAST_DURATION);
        }
    },

    async _bootIntoOobeWithEssentialAssets() {
        let minWaitReached = false;
        let essentialsReady = false;

        const done = () => {
            if (this._firstBootDone) return;
            this._firstBootDone = true;
            this._clearFirstBootTimers();
            this._hideFirstHint();
            this.fadeToLock();
        };

        const tryEnterEarly = () => {
            // 至少等待 5s，并且关键资源完成“缓存 + 解码渲染预热”后才提前进入。
            if (minWaitReached && essentialsReady) {
                done();
            }
        };

        this._firstBootTimers.push(setTimeout(() => {
            minWaitReached = true;
            tryEnterEarly();
        }, this.MIN_FIRST_WAIT));

        this._firstBootTimers.push(setTimeout(() => {
            this._startFirstHintRotation([
                '正在努力加载必要文件，请稍候…',
                'Loading essential files, please wait...'
            ], 3000);
        }, this.FIRST_HINT_AT));

        this._firstBootTimers.push(setTimeout(() => {
            // 最长等待 20s，超时强制进入 OOBE。
            done();
        }, this.FIRST_DURATION));

        let essentialLoadOk = false;
        try {
            const cacheOk = await this._preloadOobeEssentialResources();
            const renderOk = await this._warmRenderOobeEssentialResources();
            essentialLoadOk = cacheOk && renderOk;
        } finally {
            essentialsReady = essentialLoadOk;
            tryEnterEarly();
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
                ring.parentNode.insertBefore(hint, ring.nextSibling);
            } else {
                this.element.querySelector('.boot-content')?.appendChild(hint);
            }
        }
        this.hintElement = hint;
    },

    _showFirstHint(text) {
        this._stopFirstHintRotation();
        this._ensureFirstHint();
        if (!this.hintElement) return;
        this._setFirstHintText(text, { fadeIn: true });
    },

    _setFirstHintText(text, options = {}) {
        if (!this.hintElement) return;
        const { fadeIn = false } = options;
        this.hintElement.classList.remove('switching');
        this.hintElement.textContent = text;
        if (fadeIn) {
            this.hintElement.classList.remove('show');
            // Force a style flush so opacity transition can run on first show.
            void this.hintElement.offsetWidth;
        }
        this.hintElement.classList.add('show');
    },

    _startFirstHintRotation(messages = [], intervalMs = 3000) {
        this._stopFirstHintRotation();
        this._ensureFirstHint();
        if (!this.hintElement) return;

        const list = Array.isArray(messages) ? messages.filter(Boolean) : [];
        if (!list.length) return;

        let index = 0;
        this._setFirstHintText(list[index], { fadeIn: true });

        this._hintRotateTimer = setInterval(() => {
            if (!this.hintElement) return;
            this.hintElement.classList.add('switching');
            this._hintSwitchTimer = setTimeout(() => {
                index = (index + 1) % list.length;
                if (!this.hintElement) return;
                this.hintElement.textContent = list[index];
                this.hintElement.classList.remove('switching');
            }, 360);
        }, Math.max(3000, intervalMs));
    },

    _stopFirstHintRotation() {
        if (this._hintRotateTimer) {
            clearInterval(this._hintRotateTimer);
            this._hintRotateTimer = null;
        }
        if (this._hintSwitchTimer) {
            clearTimeout(this._hintSwitchTimer);
            this._hintSwitchTimer = null;
        }
        if (this.hintElement) {
            this.hintElement.classList.remove('switching');
        }
    },

    _hideFirstHint() {
        this._stopFirstHintRotation();
        if (!this.hintElement) return;
        this.hintElement.classList.remove('show');
        this.hintElement.textContent = '';
    },

    _toRelativeAsset(src) {
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
    },

    _uniqAssets(list = []) {
        return [...new Set(list.map((src) => this._toRelativeAsset(src)).filter(Boolean))];
    },

    _buildPriorityAssets() {
        const settings = State?.settings || {};
        const lockWallpaper = settings.wallpaperLock || 'Theme/Picture/Fluent-1.png';
        const desktopWallpaper = settings.wallpaperDesktop || 'Theme/Picture/Fluent-2.png';

        const lockWallpapers = this._uniqAssets([
            lockWallpaper,
            'Theme/Picture/Fluent-1.png'
        ]);

        const desktopWallpapers = this._uniqAssets([
            desktopWallpaper,
            'Theme/Picture/Fluent-2.png',
            'Theme/Picture/Fluent-3.jpg',
            'Theme/Picture/Fluent-4.jpg',
            'Theme/Picture/Fluent-5.png',
            'Theme/Picture/Fluent-6.jpg',
            'Theme/Picture/Fluent-7.png',
            'Theme/Picture/Fluent-8.png'
        ]);

        const profileAvatarDefaults = [
            'Theme/Profile_img/UserAva.png',
            ...Array.from({ length: 10 }, (_, i) => `Theme/Profile_img/${i + 1}.jpg`)
        ];
        const avatars = this._uniqAssets([
            settings.userAvatar || 'Theme/Profile_img/UserAva.png',
            ...profileAvatarDefaults,
            'Theme/Icon/UserAva.png'
        ]);

        const staticIcons = [
            'Theme/Icon/Symbol_icon/stroke/Search.svg',
            'Theme/Icon/Symbol_icon/stroke/Settings.svg',
            'Theme/Icon/Symbol_icon/stroke/Home.svg',
            'Theme/Icon/Symbol_icon/stroke/User Circle.svg',
            'Theme/Icon/Symbol_icon/stroke/Globe.svg',
            'Theme/Icon/Symbol_icon/stroke/Color Picker.svg',
            'Theme/Icon/Symbol_icon/stroke/Inbox Download.svg',
            'Theme/Icon/Symbol_icon/stroke/Dashboard Check.svg',
            'Theme/Icon/Symbol_icon/stroke/Clock.svg',
            'Theme/Icon/Symbol_icon/stroke/Shut Down.svg',
            'Theme/Icon/Symbol_icon/stroke/Lock.svg',
            'Theme/Icon/Symbol_icon/stroke/Logout.svg',
            'Theme/Icon/Symbol_icon/stroke/Robot Happy.svg',
            'Theme/Icon/Symbol_icon/stroke/Tube.svg',
            'Theme/Icon/Symbol_icon/stroke/Information Circle.svg',
            'Theme/Icon/Symbol_icon/stroke/Moon.svg',
            'Theme/Icon/Symbol_icon/stroke/Sun.svg',
            'Theme/Icon/Symbol_icon/stroke/Volume Up.svg',
            'Theme/Icon/Symbol_icon/stroke/Notification Bell.svg',
            'Theme/Icon/Symbol_icon/stroke/Bluetooth_close.svg',
            'Theme/Icon/Symbol_icon/stroke/Bluetooth_open.svg',
            'Theme/Icon/Symbol_icon/stroke/Broadcast.svg',
            'Theme/Icon/Symbol_icon/stroke/Arrow Right.svg',
            'Theme/Icon/Symbol_icon/stroke/Arrow Left.svg',
            'Theme/Icon/Symbol_icon/stroke/Arrow Down.svg',
            'Theme/Icon/Symbol_icon/stroke/Cancel.svg',
            'Theme/Icon/Symbol_icon/stroke/Exclamation Triangle.svg',
            'Theme/Icon/Symbol_icon/stroke/Document.svg',
            'Theme/Icon/Symbol_icon/stroke/Database 2.svg',
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

        const icons = this._uniqAssets(iconCandidates);
        return { lockWallpapers, desktopWallpapers, avatars, icons };
    },

    _buildOobeEssentialAssets() {
        const pack = this._buildPriorityAssets();
        const oobeIcons = this._uniqAssets([
            'Theme/Icon/Fluent_logo.png',
            'Theme/Icon/Fluent_logo_dark.png',
            ...Array.from(document.querySelectorAll('#oobe-screen img[src]'))
                .map((img) => img.getAttribute('src'))
                .filter((src) => src && src.startsWith('Theme/Icon/'))
        ]);

        return {
            lockWallpapers: pack.lockWallpapers,
            avatars: pack.avatars,
            icons: oobeIcons
        };
    },

    _buildOobeDeferredAssets() {
        const pack = this._buildPriorityAssets();
        const essential = this._buildOobeEssentialAssets();
        const essentialIcons = new Set(essential.icons);
        return {
            desktopWallpapers: pack.desktopWallpapers,
            icons: pack.icons.filter((src) => !essentialIcons.has(src))
        };
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

    async _decodeImageAsset(src) {
        return new Promise((resolve) => {
            let settled = false;
            const finish = (ok) => {
                if (settled) return;
                settled = true;
                resolve(ok);
            };

            const img = new Image();
            img.decoding = 'async';
            img.onload = () => finish(true);
            img.onerror = () => finish(false);
            img.src = src;

            if (typeof img.decode === 'function') {
                img.decode().then(() => finish(true)).catch(() => {
                    // decode 失败时交给 onload/onerror 收尾
                });
            }
        });
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

    async _preloadGroupWithResult(assets, concurrency = 6) {
        if (!assets.length) return true;
        let index = 0;
        let allOk = true;
        const workerCount = Math.min(concurrency, assets.length);
        const workers = Array.from({ length: workerCount }, async () => {
            while (index < assets.length) {
                const current = assets[index++];
                const ok = await this._fetchAndCacheAsset(current);
                if (!ok) allOk = false;
            }
        });
        await Promise.all(workers);
        return allOk;
    },

    async _warmRenderGroup(assets, concurrency = 6) {
        if (!assets.length) return;
        let index = 0;
        const workerCount = Math.min(concurrency, assets.length);
        const workers = Array.from({ length: workerCount }, async () => {
            while (index < assets.length) {
                const current = assets[index++];
                await this._decodeImageAsset(current);
            }
        });
        await Promise.all(workers);
    },

    async _warmRenderGroupWithResult(assets, concurrency = 6) {
        if (!assets.length) return true;
        let index = 0;
        let allOk = true;
        const workerCount = Math.min(concurrency, assets.length);
        const workers = Array.from({ length: workerCount }, async () => {
            while (index < assets.length) {
                const current = assets[index++];
                const ok = await this._decodeImageAsset(current);
                if (!ok) allOk = false;
            }
        });
        await Promise.all(workers);
        return allOk;
    },

    async _preloadResourcePackByPriority() {
        const pack = this._buildPriorityAssets();
        await this._preloadGroup(pack.lockWallpapers, 4);     // 1. 锁屏壁纸
        await this._preloadGroup(pack.desktopWallpapers, 4);  // 2. 桌面壁纸
        await this._preloadGroup(pack.avatars, 2);            // 3. 用户头像
        await this._preloadGroup(pack.icons, 8);              // 4. 各类图标
    },

    async _preloadAndWarmResourcePackInBackground() {
        if (this._backgroundWarmPromise) return this._backgroundWarmPromise;

        this._backgroundWarmPromise = (async () => {
            const pack = this._buildPriorityAssets();

            // 优先保障锁屏首帧资源，再继续预热其余资源。
            await this._preloadGroup(pack.lockWallpapers, 4);
            await this._warmRenderGroup(pack.lockWallpapers, 2);

            await this._preloadGroup(pack.avatars, 2);
            await this._warmRenderGroup(pack.avatars, 2);

            await this._preloadGroup(pack.icons, 8);
            await this._warmRenderGroup(pack.icons, 6);

            await this._preloadGroup(pack.desktopWallpapers, 4);
            await this._warmRenderGroup(pack.desktopWallpapers, 2);
        })().finally(() => {
            this._backgroundWarmPromise = null;
        });

        return this._backgroundWarmPromise;
    },

    async _preloadOobeEssentialResources() {
        const pack = this._buildOobeEssentialAssets();
        const lockOk = await this._preloadGroupWithResult(pack.lockWallpapers, 4); // 必要：锁屏壁纸
        const avatarOk = await this._preloadGroupWithResult(pack.avatars, 2);       // 必要：用户头像
        const iconOk = await this._preloadGroupWithResult(pack.icons, 8);           // 必要：OOBE 图标 + Logo
        return lockOk && avatarOk && iconOk;
    },

    async _warmRenderOobeEssentialResources() {
        const pack = this._buildOobeEssentialAssets();
        const lockOk = await this._warmRenderGroupWithResult(pack.lockWallpapers, 2);
        const avatarOk = await this._warmRenderGroupWithResult(pack.avatars, 2);
        const iconOk = await this._warmRenderGroupWithResult(pack.icons, 6);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return lockOk && avatarOk && iconOk;
    },

    async _preloadOobeDeferredResources() {
        const pack = this._buildOobeDeferredAssets();
        await this._preloadGroup(pack.desktopWallpapers, 4); // OOBE 中继续加载桌面壁纸
        await this._preloadGroup(pack.icons, 8);             // OOBE 中继续加载其余图标
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
