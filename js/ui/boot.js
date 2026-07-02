/**
 * 开机屏幕模块
 */
const BootScreen = {
    element: null,
    hintElement: null,
    CACHE_KEY: 'fluentos.assets_cached',
    RESOURCE_CACHE_NAME: 'fluentos-resource-pack-v1',
    RESOURCE_META_KEY: 'fluentos.resource-manifest.v1',
    RETURNING_MIN_DURATION: 800,
    RETURNING_MAX_DURATION: 1800,
    FIRST_DURATION: 20000,
    MIN_FIRST_WAIT: 6000,
    FIRST_HINT_AT: 8000,
    _firstBootDone: false,
    _firstBootTimers: [],
    _assetCache: null,
    _backgroundWarmPromise: null,
    _hintRotateTimer: null,
    _hintSwitchTimer: null,
    _projectRootUrl: null,
    _resourceMetadata: null,

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
            this._bootReturningUser();
        }
    },

    async _bootReturningUser() {
        const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));
        const pack = this._buildPriorityAssets();
        const criticalReady = (async () => {
            await this._pruneRemovedIncrementalAssets();
            await this._preloadGroupIncremental(pack.lockWallpapers, 4);
            await this._warmCachedGroup(pack.lockWallpapers, 2);
        })().catch(() => {});

        // Keep the logo visible briefly, but never hold a returning user for a fixed 4 seconds.
        await Promise.race([
            Promise.all([wait(this.RETURNING_MIN_DURATION), criticalReady]),
            wait(this.RETURNING_MAX_DURATION)
        ]);

        this.fadeToLock();
        this._preloadAndWarmResourcePackInBackground({ skipLockWallpapers: true }).catch(() => {});
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
            // 至少等待 6s，并且关键资源完成“缓存 + 解码渲染预热”后才提前进入。
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
            // Non-blocking OOBE icons, app icons and the dark logo follow the critical set.
            this._preloadOobeSupplementalResources().catch(() => {});
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
            // 资源下载完并且至少等待了 6s，才允许提前进入锁屏
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
        const normalize = (value) => {
            const normalized = String(value || '').replace(/^\.\//, '').replace(/^\//, '');
            return normalized.startsWith('css/Theme/') ? normalized.slice(4) : normalized;
        };
        if (/^https?:\/\//i.test(src)) {
            try {
                const url = new URL(src, window.location.href);
                if (url.origin !== window.location.origin) return null;
                return normalize(decodeURIComponent(url.pathname));
            } catch (_) {
                return null;
            }
        }
        return normalize(src);
    },

    _uniqAssets(list = []) {
        return [...new Set(list.map((src) => this._toRelativeAsset(src)).filter(Boolean))];
    },

    _getProjectRootUrl() {
        if (this._projectRootUrl) return this._projectRootUrl;

        const bootScript = document.querySelector('script[src$="js/ui/boot.js"]');
        if (bootScript?.src) {
            this._projectRootUrl = new URL('../../', bootScript.src).href;
            return this._projectRootUrl;
        }

        this._projectRootUrl = new URL('./', window.location.href).href;
        return this._projectRootUrl;
    },

    _assetUrl(src) {
        const normalized = this._toRelativeAsset(src);
        return normalized ? new URL(normalized, this._getProjectRootUrl()).href : null;
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
        const normalizedUserAvatar = (typeof State !== 'undefined' && typeof State.normalizeUserAvatar === 'function')
            ? State.normalizeUserAvatar(settings.userAvatar)
            : (settings.userAvatar || 'Theme/Profile_img/UserAva.png');
        const avatars = this._uniqAssets([
            normalizedUserAvatar || 'Theme/Profile_img/UserAva.png',
            ...profileAvatarDefaults
        ]);

        const appIcons = Array.isArray(window.Desktop?.apps)
            ? Desktop.apps.map(app => app.icon).filter(Boolean)
            : [];

        const iconCandidates = [
            'Theme/Icon/Fluent_logo.png',
            'Theme/Icon/Fluent_logo_dark.png',
            ...appIcons,
            ...Array.from(document.querySelectorAll('img[src]'))
                .map(img => img.getAttribute('src'))
                .filter(src => src && src.startsWith('Theme/Icon/'))
        ];

        const icons = this._uniqAssets(iconCandidates);
        return { lockWallpapers, desktopWallpapers, avatars, icons };
    },

    _buildOobeEssentialAssets() {
        const core = this._uniqAssets([
            'index.html',
            'css/main.css',
            'css/animations.css',
            'css/fluent-ui.css',
            'css/oobe.css',
            'js/core/csp.js',
            'js/core/storage.js',
            'js/core/state.js',
            'js/core/i18n.js',
            'js/core/fluent-ui.js',
            'js/core/resource-manifest.js',
            'js/ui/boot.js',
            'js/ui/oobe.js'
        ]);
        const wallpapers = Array.from({ length: 6 }, (_, i) =>
            `Theme/Preload/OOBE/wallpapers/Fluent-${i + 1}.jpg`
        );
        const avatars = [
            'Theme/Preload/OOBE/avatars/UserAva.jpg',
            ...Array.from({ length: 10 }, (_, i) => `Theme/Preload/OOBE/avatars/${i + 1}.jpg`)
        ];
        const illustrations = this._uniqAssets(
            Array.from(document.querySelectorAll('img[src^="Theme/illustrations/"]'))
                .map((img) => img.getAttribute('src'))
        );

        return {
            core,
            wallpapers,
            avatars,
            icons: ['Theme/Icon/Fluent_logo.png'],
            illustrations
        };
    },

    _buildOobeSupplementalAssets() {
        const appIcons = Array.isArray(window.Desktop?.apps)
            ? Desktop.apps.map((app) => app.icon).filter(Boolean)
            : [];
        const referencedIcons = Array.from(document.querySelectorAll('#oobe-screen img[src^="Theme/Icon/"]'))
            .map((img) => img.getAttribute('src'));
        return this._uniqAssets([
            'Theme/Icon/Fluent_logo_dark.png',
            ...appIcons,
            ...referencedIcons
        ]).filter((src) => src !== 'Theme/Icon/Fluent_logo.png');
    },

    getOobeWallpaperPreview(src) {
        const match = String(src || '').match(/^Theme\/Picture\/Fluent-([1-6])\.(?:png|jpe?g)$/i);
        return match ? `Theme/Preload/OOBE/wallpapers/Fluent-${match[1]}.jpg` : src;
    },

    getOobeAvatarPreview(src) {
        const match = String(src || '').match(/^Theme\/Profile_img\/(UserAva|[1-9]|10)\.(?:png|jpe?g)$/i);
        return match ? `Theme/Preload/OOBE/avatars/${match[1]}.jpg` : src;
    },

    _buildOobeDeferredAssets() {
        const pack = this._buildPriorityAssets();
        const essential = this._buildOobeEssentialAssets();
        const essentialIcons = new Set(essential.icons);
        const aiScripts = this._uniqAssets([
            'js/core/fingo-data.js',
            'js/core/fingo.js'
        ]);
        return {
            desktopWallpapers: pack.desktopWallpapers,
            icons: pack.icons.filter((src) => !essentialIcons.has(src)),
            aiScripts
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
            const assetUrl = this._assetUrl(src);
            if (!assetUrl) return false;
            const cache = await this._getResourceCache();
            const request = new Request(assetUrl, { cache: 'reload' });
            let response = await fetch(request);
            if (!response || !response.ok) {
                response = await fetch(assetUrl, { cache: 'force-cache' });
            }
            if (response && response.ok && cache) {
                await cache.put(assetUrl, response.clone());
            }
            return true;
        } catch (_) {
            return false;
        }
    },

    async _fetchAndCacheAssetFromBrowserCache(src) {
        try {
            const assetUrl = this._assetUrl(src);
            if (!assetUrl) return false;
            const cache = await this._getResourceCache();
            const cached = cache ? await cache.match(assetUrl) : null;
            if (cached) return true;
            const response = await fetch(assetUrl, { cache: 'force-cache' });
            if (!response || !response.ok) return false;
            if (cache) await cache.put(assetUrl, response.clone());
            return true;
        } catch (_) {
            return false;
        }
    },

    async _preloadOobeGroupWithResult(assets, concurrency = 6) {
        if (!assets.length) return true;
        let index = 0;
        let allOk = true;
        const workers = Array.from({ length: Math.min(concurrency, assets.length) }, async () => {
            while (index < assets.length) {
                const ok = await this._fetchAndCacheAssetFromBrowserCache(assets[index++]);
                if (!ok) allOk = false;
            }
        });
        await Promise.all(workers);
        return allOk;
    },

    _getResourceManifest() {
        const manifest = globalThis.FluentOSResourceManifest;
        return manifest && typeof manifest === 'object' ? manifest : { systemVersion: '', resources: {} };
    },

    _getResourceRevision(src) {
        const normalized = this._toRelativeAsset(src);
        const resources = this._getResourceManifest().resources || {};
        return normalized ? (resources[normalized] || '') : '';
    },

    _loadResourceMetadata() {
        if (this._resourceMetadata) return this._resourceMetadata;
        try {
            const parsed = JSON.parse(localStorage.getItem(this.RESOURCE_META_KEY) || '{}');
            this._resourceMetadata = {
                systemVersion: String(parsed.systemVersion || ''),
                resources: parsed.resources && typeof parsed.resources === 'object' ? parsed.resources : {}
            };
        } catch (_) {
            this._resourceMetadata = { systemVersion: '', resources: {} };
        }
        return this._resourceMetadata;
    },

    _saveResourceMetadata() {
        const metadata = this._loadResourceMetadata();
        metadata.systemVersion = String(this._getResourceManifest().systemVersion || '');
        try {
            localStorage.setItem(this.RESOURCE_META_KEY, JSON.stringify(metadata));
        } catch (_) {
            // Cache metadata is an optimization; startup must continue if storage is unavailable.
        }
    },

    async _fetchAndCacheAssetIncremental(src) {
        try {
            const normalized = this._toRelativeAsset(src);
            const assetUrl = this._assetUrl(src);
            if (!normalized || !assetUrl) return false;

            const cache = await this._getResourceCache();
            const cached = cache ? await cache.match(assetUrl) : null;
            const revision = this._getResourceRevision(normalized);
            const metadata = this._loadResourceMetadata();
            const cachedRevision = String(metadata.resources[normalized] || '');

            // Migration path: an existing Cache Storage entry is adopted without a second request.
            // From this release onward, its file revision is tracked for exact incremental updates.
            if (cached && (!revision || !cachedRevision || cachedRevision === revision)) {
                if (revision && cachedRevision !== revision) metadata.resources[normalized] = revision;
                return true;
            }

            // Only a missing file or a file whose own revision changed reaches the network.
            const response = await fetch(assetUrl, { cache: 'no-cache' });
            if (!response || !response.ok) return false;
            if (cache) await cache.put(assetUrl, response.clone());
            if (revision) metadata.resources[normalized] = revision;
            return true;
        } catch (_) {
            return false;
        }
    },

    async _pruneRemovedIncrementalAssets() {
        const metadata = this._loadResourceMetadata();
        const resources = this._getResourceManifest().resources || {};
        const removed = Object.keys(metadata.resources).filter((src) => !resources[src]);
        if (!removed.length) return;
        const cache = await this._getResourceCache();
        await Promise.all(removed.map(async (src) => {
            const assetUrl = this._assetUrl(src);
            if (cache && assetUrl) await cache.delete(assetUrl);
            delete metadata.resources[src];
        }));
    },

    async _preloadGroupIncremental(assets, concurrency = 6) {
        if (!assets.length) return;
        let index = 0;
        const workers = Array.from({ length: Math.min(concurrency, assets.length) }, async () => {
            while (index < assets.length) {
                await this._fetchAndCacheAssetIncremental(assets[index++]);
            }
        });
        await Promise.all(workers);
        this._saveResourceMetadata();
    },

    async _decodeImageAsset(src) {
        return new Promise((resolve) => {
            const assetUrl = this._assetUrl(src);
            if (!assetUrl) {
                resolve(false);
                return;
            }
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
            img.src = assetUrl;

            if (typeof img.decode === 'function') {
                img.decode().then(() => finish(true)).catch(() => {
                    // decode 失败时交给 onload/onerror 收尾
                });
            }
        });
    },

    async _decodeCachedImageAsset(src) {
        try {
            const assetUrl = this._assetUrl(src);
            if (!assetUrl) return false;
            const cache = await this._getResourceCache();
            const response = cache ? await cache.match(assetUrl) : null;
            if (!response) return this._decodeImageAsset(src);

            const objectUrl = URL.createObjectURL(await response.blob());
            try {
                return await new Promise((resolve) => {
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
                    img.src = objectUrl;
                    if (typeof img.decode === 'function') {
                        img.decode().then(() => finish(true)).catch(() => {});
                    }
                });
            } finally {
                URL.revokeObjectURL(objectUrl);
            }
        } catch (_) {
            return false;
        }
    },

    async _warmCachedGroup(assets, concurrency = 6) {
        if (!assets.length) return;
        let index = 0;
        const workers = Array.from({ length: Math.min(concurrency, assets.length) }, async () => {
            while (index < assets.length) {
                await this._decodeCachedImageAsset(assets[index++]);
            }
        });
        await Promise.all(workers);
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

    async _preloadAndWarmResourcePackInBackground(options = {}) {
        if (this._backgroundWarmPromise) return this._backgroundWarmPromise;

        this._backgroundWarmPromise = (async () => {
            const pack = this._buildPriorityAssets();

            await this._pruneRemovedIncrementalAssets();

            // 优先保障锁屏首帧资源，再继续预热其余资源。
            if (!options.skipLockWallpapers) {
                await this._preloadGroupIncremental(pack.lockWallpapers, 4);
                await this._warmCachedGroup(pack.lockWallpapers, 2);
            }

            await this._preloadGroupIncremental(pack.avatars, 2);
            await this._warmCachedGroup(pack.avatars, 2);

            await this._preloadGroupIncremental(pack.icons, 8);
            await this._warmCachedGroup(pack.icons, 6);

            await this._preloadGroupIncremental(pack.desktopWallpapers, 4);
            await this._warmCachedGroup(pack.desktopWallpapers, 2);
            this._saveResourceMetadata();
        })().finally(() => {
            this._backgroundWarmPromise = null;
        });

        return this._backgroundWarmPromise;
    },

    async _preloadOobeEssentialResources() {
        const pack = this._buildOobeEssentialAssets();
        // Strict priority: these groups are the only resources that gate OOBE entry.
        const coreOk = await this._preloadOobeGroupWithResult(pack.core, 6);
        const illustrationOk = await this._preloadOobeGroupWithResult(pack.illustrations, 3);
        const logoOk = await this._preloadOobeGroupWithResult(pack.icons, 1);
        const wallpaperOk = await this._preloadOobeGroupWithResult(pack.wallpapers, 4);
        const avatarOk = await this._preloadOobeGroupWithResult(pack.avatars, 4);
        return coreOk && illustrationOk && logoOk && wallpaperOk && avatarOk;
    },

    async _warmRenderOobeEssentialResources() {
        const pack = this._buildOobeEssentialAssets();
        const wallpaperOk = await this._warmRenderGroupWithResult(pack.wallpapers, 3);
        const avatarOk = await this._warmRenderGroupWithResult(pack.avatars, 4);
        const iconOk = await this._warmRenderGroupWithResult(pack.icons, 1);
        const illustrationOk = await this._warmRenderGroupWithResult(pack.illustrations, 3);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return wallpaperOk && avatarOk && iconOk && illustrationOk;
    },

    async _preloadOobeSupplementalResources() {
        const icons = this._buildOobeSupplementalAssets();
        await this._preloadOobeGroupWithResult(icons, 8);
        await this._warmRenderGroup(icons, 6);
    },

    async _preloadOobeDeferredResources() {
        const pack = this._buildOobeDeferredAssets();
        await this._preloadOobeSupplementalResources();
        await this._preloadGroup(pack.icons, 8);             // OOBE 中继续加载其余图标
        await this._preloadGroup(pack.aiScripts, 2);         // OOBE 中缓存 AI 组件脚本
    },

    fadeToLock() {
        const shouldGoOobe = typeof OOBE !== 'undefined'
            && typeof OOBE.shouldShowOnFirstLaunch === 'function'
            && OOBE.shouldShowOnFirstLaunch();
        const shouldGoDesktop = !shouldGoOobe
            && !!(typeof State !== 'undefined' && State.settings && State.settings.debugModeEnabled === true);

        const bootLogoEl = this.element ? this.element.querySelector('.boot-logo') : null;
        if (shouldGoOobe && typeof OOBE.show === 'function') {
            OOBE.show({ bootLogoEl });
        } else if (shouldGoDesktop && typeof Desktop !== 'undefined' && typeof Desktop.show === 'function') {
            Desktop.show();
        } else {
            LockScreen.show();
        }

        const targetEl = shouldGoOobe
            ? document.getElementById('oobe-screen')
            : (shouldGoDesktop ? document.getElementById('desktop-screen') : document.getElementById('lock-screen'));

        if (!targetEl) {
            State.view = shouldGoOobe ? 'oobe' : (shouldGoDesktop ? 'desktop' : 'lock');
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
            State.view = shouldGoOobe ? 'oobe' : (shouldGoDesktop ? 'desktop' : 'lock');
        }, 800);
    },

    hide() {
        this._clearFirstBootTimers();
        this._hideFirstHint();
        this.element.classList.add('hidden');
    }
};
