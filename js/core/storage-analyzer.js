/**
 * FluentOS storage accounting and physical payload cleanup.
 * Static package sizes come from storage-manifest.js; browser data is measured
 * from the payloads that the origin can actually inspect.
 */
const FluentOSStorage = {
    _cache: null,
    _cacheAt: 0,
    _providers: new Map(),
    cacheTtl: 1500,

    utf8Bytes(value) {
        return new TextEncoder().encode(String(value ?? '')).byteLength;
    },

    valueBytes(value, seen = new WeakSet()) {
        if (value == null) return 0;
        if (value instanceof Blob) return Number(value.size || 0);
        if (value instanceof ArrayBuffer) return value.byteLength;
        if (ArrayBuffer.isView(value)) return value.byteLength;
        if (typeof value === 'string') return this.utf8Bytes(value);
        if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
            return this.utf8Bytes(String(value));
        }
        if (typeof value !== 'object' || seen.has(value)) return 0;
        seen.add(value);
        let bytes = Array.isArray(value) ? 2 : 2;
        Object.entries(value).forEach(([key, child]) => {
            bytes += this.utf8Bytes(key) + this.valueBytes(child, seen) + 3;
        });
        return bytes;
    },

    formatBytes(bytes) {
        const value = Math.max(0, Number(bytes) || 0);
        if (value < 1024) return `${Math.round(value)} B`;
        const units = ['KB', 'MB', 'GB', 'TB'];
        let scaled = value / 1024;
        let unit = 0;
        while (scaled >= 1024 && unit < units.length - 1) {
            scaled /= 1024;
            unit += 1;
        }
        const digits = scaled >= 100 ? 0 : (scaled >= 10 ? 1 : 2);
        return `${scaled.toFixed(digits)} ${units[unit]}`;
    },

    normalizePath(path) {
        return String(path || '').replace(/^\.\//, '').replace(/\\/g, '/');
    },

    staticEntry(path) {
        return globalThis.FluentOSStorageManifest?.files?.[this.normalizePath(path)] || null;
    },

    getAppSize(app) {
        if (!app) return 0;
        const iconBytes = Number(this.staticEntry(app.icon)?.size || 0);
        if (app.isPWA === true) return iconBytes + 20;
        const registration = {
            id: app.id || '',
            nameKey: app.nameKey || '',
            icon: app.icon || '',
            component: globalThis.WindowManager?.appConfigs?.[app.id]?.component || ''
        };
        return iconBytes + this.utf8Bytes(JSON.stringify(registration));
    },

    registerProvider(appId, provider) {
        if (!appId || !provider) return;
        this._providers.set(String(appId), provider);
        this.invalidate();
    },

    invalidate() {
        this._cache = null;
        this._cacheAt = 0;
        try { window.dispatchEvent(new CustomEvent('fluentos-storage-change')); } catch (_) {}
    },

    _emptyAppMap(apps) {
        const map = {};
        (apps || []).forEach((app) => {
            map[app.id] = {
                appSizeBytes: this.getAppSize(app),
                dataSizeBytes: 0
            };
        });
        return map;
    },

    _ownerForNode(node) {
        if (!node) return 'other';
        if (['root', 'desktop', 'documents', 'pictures', 'downloads', 'recycle', 'welcome'].includes(String(node.id || ''))) return 'unclassified';
        if (node._notesAppFile === true) return 'notes';
        if (node.source === 'photos-local' || node.source === 'photos-favorite') return 'photos';
        if (node.source === 'media-local') return 'media';
        return 'other';
    },

    _walkFileSystem(appData) {
        const photoOwners = new Map();
        const mediaOwners = new Map();
        let otherBytes = 0;
        const visit = (node) => {
            if (!node || typeof node !== 'object') return;
            const shallow = { ...node };
            delete shallow.children;
            const owner = this._ownerForNode(node);
            const bytes = this.utf8Bytes(JSON.stringify(shallow));
            if (owner !== 'other' && owner !== 'unclassified' && appData[owner]) appData[owner].dataSizeBytes += bytes;
            else if (owner === 'other') otherBytes += bytes;

            if (node.encoding === 'photos-local-cache') {
                photoOwners.set(String(node.cacheId || node.id || ''), owner === 'photos' ? 'photos' : 'other');
            }
            if (node.encoding === 'media-local-cache') {
                mediaOwners.set(String(node.mediaRecordId || `fs-${node.id}`), owner === 'media' ? 'media' : 'other');
            }
            (node.children || []).forEach(visit);
        };
        visit(globalThis.State?.fs?.root);
        return { otherBytes, photoOwners, mediaOwners };
    },

    _readDatabaseRecords(name, storeName) {
        return new Promise((resolve) => {
            if (!globalThis.indexedDB) return resolve([]);
            const request = indexedDB.open(name);
            request.onerror = () => resolve([]);
            request.onupgradeneeded = () => {
                try { request.transaction.abort(); } catch (_) {}
                resolve([]);
            };
            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.close();
                    resolve([]);
                    return;
                }
                const tx = db.transaction(storeName, 'readonly');
                const getAll = tx.objectStore(storeName).getAll();
                getAll.onsuccess = () => resolve(Array.isArray(getAll.result) ? getAll.result : []);
                getAll.onerror = () => resolve([]);
                tx.oncomplete = () => db.close();
                tx.onerror = () => { db.close(); resolve([]); };
            };
        });
    },

    _measureLocalStorage(appData) {
        const owners = [
            { app: 'terminal', test: (key) => key === 'terminal_history' },
            { app: 'clock', test: (key) => key.startsWith('clock_') },
            { app: 'browser', test: (key) => key === 'fluentos.favoriteSites' || key === 'fluentos.searchHistory' },
            { app: 'photos', test: (key) => key.startsWith('fluentos.photos.') },
            { app: 'media', test: (key) => key.startsWith('fluentos.media.') },
            { app: 'appshop', test: (key) => key === 'fluentos.installedApps' || key === 'fluentos.uninstalledDefaultApps' },
            { app: 'fingo', test: (key) => key.startsWith('fluentos.fingo_') }
        ];
        try {
            for (let index = 0; index < localStorage.length; index += 1) {
                const key = localStorage.key(index) || '';
                if (key === 'fluentos.fs') continue;
                const owner = owners.find((entry) => entry.test(key));
                if (!owner || !appData[owner.app]) continue;
                appData[owner.app].dataSizeBytes += this.utf8Bytes(key) + this.utf8Bytes(localStorage.getItem(key) || '');
            }
        } catch (_) {}
    },

    async analyze(apps = [], options = {}) {
        const signature = (apps || []).map((app) => `${app.id}:${app.icon}:${app.isPWA === true}`).join('|');
        if (!options.force && this._cache && this._cache.signature === signature && Date.now() - this._cacheAt < this.cacheTtl) {
            return this._cache.snapshot;
        }

        const appData = this._emptyAppMap(apps);
        const staticFiles = Object.values(globalThis.FluentOSStorageManifest?.files || {});
        const systemCoreBytes = staticFiles.filter((entry) => entry.category === 'core').reduce((sum, entry) => sum + Number(entry.size || 0), 0);
        const systemResourceBytes = staticFiles.filter((entry) => entry.category === 'resource').reduce((sum, entry) => sum + Number(entry.size || 0), 0);
        const fsResult = this._walkFileSystem(appData);
        let otherBytes = fsResult.otherBytes;

        const [photoRecords, mediaRecords] = await Promise.all([
            this._readDatabaseRecords('fluentos.photos.cache.v1', 'localImages'),
            this._readDatabaseRecords('FluentOSMediaLibrary', 'files')
        ]);
        photoRecords.forEach((record) => {
            const bytes = this.valueBytes(record);
            const owner = fsResult.photoOwners.get(String(record?.id || '')) || 'other';
            if (owner === 'photos' && appData.photos) appData.photos.dataSizeBytes += bytes;
            else otherBytes += bytes;
        });
        mediaRecords.forEach((record) => {
            const bytes = this.valueBytes(record);
            const id = String(record?.id || '');
            const owner = fsResult.mediaOwners.get(id) || (id.startsWith('fs-') ? 'other' : 'media');
            if (owner === 'media' && appData.media) appData.media.dataSizeBytes += bytes;
            else otherBytes += bytes;
        });
        this._measureLocalStorage(appData);

        for (const [appId, provider] of this._providers.entries()) {
            if (!appData[appId] || typeof provider.measure !== 'function') continue;
            try { appData[appId].dataSizeBytes += Math.max(0, Number(await provider.measure()) || 0); } catch (_) {}
        }

        let quota = null;
        let browserUsage = null;
        try {
            const estimate = await navigator.storage?.estimate?.();
            quota = Number.isFinite(estimate?.quota) ? Number(estimate.quota) : null;
            browserUsage = Number.isFinite(estimate?.usage) ? Number(estimate.usage) : null;
        } catch (_) {}

        const appBytes = Object.values(appData).reduce((sum, item) => sum + item.appSizeBytes + item.dataSizeBytes, 0);
        const attributableBrowserBytes = otherBytes + Object.values(appData).reduce((sum, item) => sum + item.dataSizeBytes, 0);
        const browserOverheadBytes = browserUsage == null ? 0 : Math.max(0, browserUsage - attributableBrowserBytes);
        const snapshot = {
            quotaBytes: quota,
            browserUsageBytes: browserUsage,
            availableBytes: quota == null || browserUsage == null ? null : Math.max(0, quota - browserUsage),
            categories: {
                systemCoreBytes,
                systemResourceBytes,
                appsBytes: appBytes,
                otherBytes,
                browserOverheadBytes
            },
            apps: appData
        };
        this._cache = { signature, snapshot };
        this._cacheAt = Date.now();
        return snapshot;
    },

    _flattenNodes(nodes) {
        const files = [];
        const visit = (node) => {
            if (!node) return;
            if (node.type === 'file') files.push(node);
            (node.children || []).forEach(visit);
        };
        (nodes || []).forEach(visit);
        return files;
    },

    async _deleteMediaRecord(id) {
        if (!id) return true;
        if (globalThis.MediaApp?.deleteStoredMedia) return MediaApp.deleteStoredMedia(id);
        return new Promise((resolve) => {
            const request = indexedDB.open('FluentOSMediaLibrary');
            request.onerror = () => resolve(false);
            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('files')) { db.close(); resolve(true); return; }
                const tx = db.transaction('files', 'readwrite');
                tx.objectStore('files').delete(id);
                tx.oncomplete = () => { db.close(); resolve(true); };
                tx.onerror = () => { db.close(); resolve(false); };
            };
        });
    },

    async purgeNodes(nodes) {
        const results = await Promise.all(this._flattenNodes(nodes).map(async (node) => {
            if (node.encoding === 'photos-local-cache') {
                if (!globalThis.PhotosDataStore?.removeLocalImageCache) return false;
                return PhotosDataStore.removeLocalImageCache(node);
            }
            if (node.encoding === 'media-local-cache') {
                return this._deleteMediaRecord(node.mediaRecordId || `fs-${node.id}`);
            }
            if (node.encoding === 'fap-package-cache') {
                if (!globalThis.DeveloperCenterStore?.removePackageFile) return false;
                return DeveloperCenterStore.removePackageFile(node.packageCacheId || node.content || node.id);
            }
            return true;
        }));
        if (results.some((result) => result === false)) throw new Error('physical_payload_delete_failed');
        this.invalidate();
        return true;
    },

    async purgeAppData(appId) {
        const id = String(appId || '');
        const provider = this._providers.get(id);
        if (provider?.clear) await provider.clear();
        const managedNativeApps = new Set(['tips', 'camera', 'photos', 'media']);
        if (id === 'photos' && globalThis.PhotosDataStore?.clearImportedPhotos) {
            await PhotosDataStore.clearImportedPhotos();
        }
        if (id === 'media' && globalThis.MediaApp?.clearLibrary) {
            const cleared = await MediaApp.clearLibrary();
            if (cleared === false) throw new Error('media_payload_delete_failed');
        }

        const prefixes = [`fluentos.pwa.${id}.`, `fluentos.app.${id}.`, `${id}:`];
        const keys = [];
        for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index) || '';
            if (prefixes.some((prefix) => key.startsWith(prefix))) keys.push(key);
        }
        keys.forEach((key) => localStorage.removeItem(key));

        try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.filter((name) => name.includes(id)).map((name) => caches.delete(name)));
        } catch (_) {}
        if (!managedNativeApps.has(id)) {
            try {
                const databases = await indexedDB.databases?.();
                await Promise.all((databases || []).filter((db) => db.name?.includes(id)).map((db) => new Promise((resolve) => {
                    const request = indexedDB.deleteDatabase(db.name);
                    request.onsuccess = request.onerror = request.onblocked = () => resolve();
                })));
            } catch (_) {}
        }
        this.invalidate();
    }
};

globalThis.FluentOSStorage = FluentOSStorage;
