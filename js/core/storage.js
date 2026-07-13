/**
 * LocalStorage 持久化管理
 */
const Storage = {
    keys: {
        SETTINGS: 'fluentos.settings',
        SESSION: 'fluentos.session',
        FS: 'fluentos.fs',
        DESKTOP_LAYOUT: 'fluentos.desktopLayout',
        APP_USAGE: 'fluentos.appUsage',
        NOTIFICATIONS: 'fluentos.notifications'
    },

    fsInlinePayloadMarker: '__fluentos_removed_inline_payload__',
    fsInlineImagePayloadThreshold: 128 * 1024,
    fsInlineGenericPayloadThreshold: 2 * 1024 * 1024,

    // 获取数据
    get(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            if (!data) return defaultValue;
            if (key === this.keys.FS) return this.parseFS(data, defaultValue);
            return JSON.parse(data);
        } catch (error) {
            console.error('Storage get error:', error);
            return defaultValue;
        }
    },

    parseFS(data, defaultValue = null) {
        const cleaned = this.stripLargeInlinePayloads(data);
        const value = JSON.parse(cleaned.data);
        if (cleaned.changed) {
            this.markRemovedInlinePayloads(value);
            try {
                localStorage.setItem(this.keys.FS, JSON.stringify(value));
                console.warn('[Storage] Removed oversized inline file payloads from fluentos.fs to keep startup responsive.');
            } catch (error) {
                console.error('Storage FS cleanup error:', error);
            }
        }
        return value || defaultValue;
    },

    stripLargeInlinePayloads(data) {
        if (typeof data !== 'string' || data.indexOf('data:') < 0 || data.length < this.fsInlineImagePayloadThreshold) {
            return { data, changed: false };
        }
        let changed = false;
        const marker = this.fsInlinePayloadMarker;
        const stripped = data.replace(/("content"\s*:\s*")data:[^"]+(")/g, (match, prefix, suffix) => {
            const threshold = match.indexOf('data:image/') >= 0
                ? this.fsInlineImagePayloadThreshold
                : this.fsInlineGenericPayloadThreshold;
            if (match.length < threshold) return match;
            changed = true;
            return `${prefix}${marker}${suffix}`;
        });
        return { data: stripped, changed };
    },

    markRemovedInlinePayloads(fsData) {
        const walk = (node) => {
            if (!node || typeof node !== 'object') return;
            if (node.type === 'file' && node.content === this.fsInlinePayloadMarker) {
                node.content = '';
                node.encoding = 'external-data-removed';
                node._payloadRemoved = true;
                node._hiddenFromRecent = true;
                node.modified = node.modified || new Date().toISOString();
            }
            if (Array.isArray(node.children)) node.children.forEach(walk);
        };
        walk(fsData && fsData.root);
    },

    // 保存数据
    set(key, value) {
        try {
            let serialized = JSON.stringify(value);
            if (key === this.keys.FS) {
                const cleaned = this.stripLargeInlinePayloads(serialized);
                if (cleaned.changed) {
                    const cleanedValue = JSON.parse(cleaned.data);
                    this.markRemovedInlinePayloads(cleanedValue);
                    serialized = JSON.stringify(cleanedValue);
                    value = cleanedValue;
                    console.warn('[Storage] Prevented oversized inline file payloads from being written to fluentos.fs.');
                }
            }
            if (localStorage.getItem(key) === serialized) return true;
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    },

    // 删除数据
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    },

    // 清空所有数据
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    },

    async _closeKnownDatabaseConnections() {
        const stores = [globalThis.WallpaperStore, globalThis.PhotosDataStore].filter(Boolean);
        await Promise.all(stores.map(async (store) => {
            try {
                const db = await store._dbPromise;
                if (db && typeof db.close === 'function') db.close();
            } catch (_) {}
            store._dbPromise = null;
        }));
        try {
            globalThis.WallpaperStore?._objectUrls?.forEach?.((url) => URL.revokeObjectURL(url));
            globalThis.WallpaperStore?._objectUrls?.clear?.();
            globalThis.PhotosDataStore?._blobUrls?.forEach?.((url) => URL.revokeObjectURL(url));
            globalThis.PhotosDataStore?._blobUrls?.clear?.();
        } catch (_) {}
    },

    _deleteDatabase(name) {
        return new Promise((resolve, reject) => {
            if (!name || typeof indexedDB === 'undefined') {
                resolve();
                return;
            }
            let settled = false;
            const finish = (error = null) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeout);
                if (error) reject(error);
                else resolve();
            };
            const timeout = setTimeout(() => finish(new Error(`indexeddb_delete_timeout:${name}`)), 5000);
            try {
                const request = indexedDB.deleteDatabase(name);
                request.onsuccess = () => finish();
                request.onerror = () => finish(request.error || new Error(`indexeddb_delete_failed:${name}`));
                request.onblocked = () => {
                    console.warn(`[Storage] IndexedDB deletion is blocked: ${name}`);
                };
            } catch (error) {
                finish(error);
            }
        });
    },

    async _clearOriginFileSystem() {
        if (!navigator.storage?.getDirectory) return;
        const root = await navigator.storage.getDirectory();
        const names = [];
        for await (const [name] of root.entries()) names.push(name);
        await Promise.all(names.map((name) => root.removeEntry(name, { recursive: true })));
    },

    _clearAccessibleCookies() {
        if (typeof document === 'undefined' || !document.cookie) return;
        document.cookie.split(';').forEach((item) => {
            const name = item.split('=')[0]?.trim();
            if (!name) return;
            document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
        });
    },

    // 彻底删除当前 FluentOS 源下的所有用户数据，而不是只重置设置。
    async clearAllUserData() {
        const failures = [];
        const attempt = async (label, action) => {
            try {
                await action();
            } catch (error) {
                failures.push({ label, error });
                console.error(`[Storage] Failed to clear ${label}`, error);
            }
        };

        await attempt('service workers', async () => {
            if (!navigator.serviceWorker?.getRegistrations) return;
            const registrations = await navigator.serviceWorker.getRegistrations();
            const results = await Promise.all(registrations.map((registration) => registration.unregister()));
            if (results.some((result) => result === false)) throw new Error('service_worker_unregister_failed');
        });

        await this._closeKnownDatabaseConnections();

        await attempt('Cache Storage', async () => {
            if (typeof caches === 'undefined') return;
            const names = await caches.keys();
            const results = await Promise.all(names.map((name) => caches.delete(name)));
            if (results.some((result) => result === false)) throw new Error('cache_delete_failed');
        });

        await attempt('origin private file system', () => this._clearOriginFileSystem());

        await attempt('IndexedDB', async () => {
            if (typeof indexedDB === 'undefined') return;
            const names = new Set(['FluentOSWallpaperCache', 'fluentos.photos.cache.v1', 'FluentOSMediaLibrary']);
            if (typeof indexedDB.databases === 'function') {
                const databases = await indexedDB.databases();
                (databases || []).forEach((database) => {
                    if (database?.name) names.add(database.name);
                });
            }
            await Promise.all(Array.from(names).map((name) => this._deleteDatabase(name)));
        });

        // 如果二进制/缓存数据未能完全删除，不要制造“已经重置”的假象。
        if (failures.length) {
            const error = new Error('user_data_clear_incomplete');
            error.failures = failures;
            throw error;
        }

        try { sessionStorage.clear(); } catch (error) { failures.push({ label: 'sessionStorage', error }); }
        try { this._clearAccessibleCookies(); } catch (error) { failures.push({ label: 'cookies', error }); }

        if (failures.length) {
            const error = new Error('user_data_clear_incomplete');
            error.failures = failures;
            throw error;
        }
        try { localStorage.clear(); } catch (error) { failures.push({ label: 'localStorage', error }); }
        if (failures.length) {
            const error = new Error('user_data_clear_incomplete');
            error.failures = failures;
            throw error;
        }
        return true;
    },

    // 初始化默认设置
    initDefaults() {
        // 默认设置
        if (!this.get(this.keys.SETTINGS)) {
            this.set(this.keys.SETTINGS, {
                theme: 'light',
                wallpaperDesktop: 'Theme/Picture/Fluent-2.png',
                wallpaperLock: 'Theme/Picture/Fluent-1.png',
                enableBlur: true,
                enableAnimation: true,
                materialType: 'gaussian',
                blurIntensity: 40,
                accentColor: '#0078d4',
                accentColorAuto: false,
                accentColorExpanded: false,
                accentColorReadability: false,
                wallpaperAccentColor: '#0078d4',
                recentAccentColors: ['#d83b01', '#0078d4', '#00b7c3', '#4c4a48', '#e81123'],
                autoEnterFullscreen: true,
                enableExternalFileImport: false,
                enableWindowBlur: false,
                enableFluentV2: true,
                enableButtonGlowEffect: true,
                pin: '1234',
                userName: 'Owner',
                userEmail: 'owner@sample.com',
                userAvatar: 'Theme/Profile_img/UserAva.jpg',
                language: 'zh',
                volume: 50,
                brightness: 100,
                strictCspEnabled: false,
                strictCspLastEnabled: false,
                fingoCustomMode: false,
                fingoCustomLastEnabled: false,
                fingoProvider: 'openai',
                fingoApiKey: '',
                fingoApiEncrypted: null,
                fingoApiStorageType: 'none',
                fingoApiSaveMode: 'temporary',
                tombstoneBackgroundEnabled: true,
                tombstoneFreezeDelayMs: 60 * 1000,
                tombstoneDimFrozenAppsEnabled: true,
                windowEdgeSnapEnabled: true,
                windowHoverSnapEnabled: true,
                windowBoundsMemory: {}
            });
        }

        // 默认会话
        if (!this.get(this.keys.SESSION)) {
            this.set(this.keys.SESSION, {
                isLoggedIn: false,
                lastLogin: null,
                loginAttempts: 0
            });
        }

        // 默认文件系统
        if (!this.get(this.keys.FS)) {
            this.set(this.keys.FS, {
                root: {
                    id: 'root',
                    name: '此电脑',
                    type: 'folder',
                    children: [
                        {
                            id: 'desktop',
                            name: '桌面',
                            type: 'folder',
                            children: []
                        },
                        {
                            id: 'documents',
                            name: '文档',
                            type: 'folder',
                            children: [
                                {
                                    id: 'welcome',
                                    name: '欢迎.txt',
                                    type: 'file',
                                    content: '欢迎使用 Fluent OS！\n\n这是一个基于 Web 技术构建的仿真操作系统。\n\n功能特性：\n- 完整的开机、锁屏、登录流程\n- 文件管理系统\n- 系统设置\n- 通知中心\n- 控制中心\n\n默认 PIN：1234\n\n享受探索！',
                                    size: 256,
                                    created: new Date().toISOString(),
                                    modified: new Date().toISOString()
                                }
                            ]
                        },
                        {
                            id: 'pictures',
                            name: '图片',
                            type: 'folder',
                            children: []
                        },
                        {
                            id: 'downloads',
                            name: '下载',
                            type: 'folder',
                            children: []
                        },
                        {
                            id: 'recycle',
                            name: '回收站',
                            type: 'folder',
                            children: []
                        }
                    ]
                }
            });
        }

        // 迁移旧版本因缺失 DESKTOP_LAYOUT key 写入到 "undefined" 的桌面布局
        const legacyDesktopLayout = this.get('undefined');
        if (!this.get(this.keys.DESKTOP_LAYOUT) && legacyDesktopLayout && Array.isArray(legacyDesktopLayout.icons)) {
            this.set(this.keys.DESKTOP_LAYOUT, legacyDesktopLayout);
            this.remove('undefined');
        }

        // 默认桌面布局
        if (!this.get(this.keys.DESKTOP_LAYOUT)) {
            this.set(this.keys.DESKTOP_LAYOUT, {
                icons: [
                    { id: 'files', x: 0, y: 0 },
                    { id: 'settings', x: 0, y: 1 },
                    { id: 'calculator', x: 0, y: 2 },
                    { id: 'notes', x: 0, y: 3 },
                    { id: 'appshop', x: 0, y: 4 },
                    { id: 'process-manager', x: 0, y: 5 }
                ]
            });
        }

        // 默认通知
        if (!this.get(this.keys.NOTIFICATIONS)) {
            this.set(this.keys.NOTIFICATIONS, [
                {
                    id: 'welcome',
                    title: '欢迎',
                    message: '欢迎使用 Fluent OS！',
                    type: 'info',
                    time: new Date().toISOString()
                }
            ]);
        }
    }
};
