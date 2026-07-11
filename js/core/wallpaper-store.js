/**
 * Persistent wallpaper assets.
 * Settings only keep a small wallpaper-cache:<slot> reference; image bytes live
 * in IndexedDB and are resolved to a fresh object URL for every page session.
 */
const WallpaperStore = {
    DB_NAME: 'FluentOSWallpaperCache',
    DB_VERSION: 1,
    STORE_NAME: 'wallpapers',
    REF_PREFIX: 'wallpaper-cache:',
    DEFAULTS: {
        desktop: 'Theme/Picture/Fluent-2.png',
        lock: 'Theme/Picture/Fluent-1.png'
    },
    _dbPromise: null,
    _objectUrls: new Map(),
    _resolvePromises: new Map(),
    _writeGenerations: new Map(),

    normalizeSlot(slot) {
        return slot === 'lock' ? 'lock' : 'desktop';
    },

    referenceForSlot(slot) {
        return `${this.REF_PREFIX}${this.normalizeSlot(slot)}`;
    },

    slotFromReference(value) {
        const raw = String(value || '');
        if (!raw.startsWith(this.REF_PREFIX)) return '';
        const slot = raw.slice(this.REF_PREFIX.length);
        return slot === 'desktop' || slot === 'lock' ? slot : '';
    },

    isReference(value) {
        return !!this.slotFromReference(value);
    },

    isBuiltIn(value) {
        const raw = String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
        return raw.startsWith('Theme/') || raw.startsWith('/Theme/');
    },

    openDB() {
        if (this._dbPromise) return this._dbPromise;
        if (typeof indexedDB === 'undefined') return Promise.reject(new Error('indexeddb_unavailable'));
        this._dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('wallpaper_db_open_failed'));
        });
        return this._dbPromise;
    },

    request(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error || new Error('wallpaper_db_request_failed'));
        });
    },

    async getRecord(slot) {
        const id = this.normalizeSlot(slot);
        const db = await this.openDB();
        return this.request(db.transaction(this.STORE_NAME, 'readonly').objectStore(this.STORE_NAME).get(id));
    },

    async sourceToBlob(source) {
        if (source instanceof Blob) return source;
        const raw = String(source || '').trim();
        if (!raw) throw new Error('empty_wallpaper_source');
        if (this.isReference(raw)) {
            const record = await this.getRecord(this.slotFromReference(raw));
            if (record?.blob instanceof Blob) return record.blob;
            throw new Error('wallpaper_cache_missing');
        }
        const response = await fetch(raw, /^https?:/i.test(raw) ? { mode: 'cors' } : undefined);
        if (!response.ok && response.type !== 'opaque') throw new Error(`wallpaper_fetch_${response.status}`);
        const blob = await response.blob();
        if (!blob || !String(blob.type || '').toLowerCase().startsWith('image/')) {
            throw new Error('invalid_wallpaper_image');
        }
        return blob;
    },

    revokeSlotUrl(slot) {
        const id = this.normalizeSlot(slot);
        const old = this._objectUrls.get(id);
        if (old) URL.revokeObjectURL(old);
        this._objectUrls.delete(id);
    },

    async saveForSlot(slot, source, meta = {}) {
        const id = this.normalizeSlot(slot);
        const pendingResolve = this._resolvePromises.get(id);
        if (pendingResolve) await pendingResolve.catch(() => '');
        const generation = (this._writeGenerations.get(id) || 0) + 1;
        this._writeGenerations.set(id, generation);
        const blob = await this.sourceToBlob(source);
        if (this._writeGenerations.get(id) !== generation) throw new Error('wallpaper_write_superseded');
        const db = await this.openDB();
        const record = {
            id,
            blob,
            mime: blob.type || meta.mime || 'image/jpeg',
            name: meta.name || `${id}-wallpaper`,
            sourceUrl: meta.sourceUrl || (typeof source === 'string' && /^https?:/i.test(source) ? source : ''),
            sourceType: meta.sourceType || 'third-party',
            updated: Date.now()
        };
        await this.request(db.transaction(this.STORE_NAME, 'readwrite').objectStore(this.STORE_NAME).put(record));
        this.revokeSlotUrl(id);
        return this.referenceForSlot(id);
    },

    async clearSlot(slot) {
        const id = this.normalizeSlot(slot);
        const pendingResolve = this._resolvePromises.get(id);
        if (pendingResolve) await pendingResolve.catch(() => '');
        this._writeGenerations.set(id, (this._writeGenerations.get(id) || 0) + 1);
        this.revokeSlotUrl(id);
        try {
            const db = await this.openDB();
            await this.request(db.transaction(this.STORE_NAME, 'readwrite').objectStore(this.STORE_NAME).delete(id));
        } catch (_) {}
    },

    async resolveReference(reference) {
        const slot = this.slotFromReference(reference);
        if (!slot) return '';
        const cached = this._objectUrls.get(slot);
        if (cached) return cached;
        if (this._resolvePromises.has(slot)) return this._resolvePromises.get(slot);
        const generation = this._writeGenerations.get(slot) || 0;
        const promise = (async () => {
            const record = await this.getRecord(slot);
            if (!record?.blob || !(record.blob instanceof Blob)) return '';
            if ((this._writeGenerations.get(slot) || 0) !== generation) return '';
            const url = URL.createObjectURL(record.blob);
            this._objectUrls.set(slot, url);
            return url;
        })().finally(() => this._resolvePromises.delete(slot));
        this._resolvePromises.set(slot, promise);
        return promise;
    },

    async resolveSetting(slot, value) {
        const id = this.normalizeSlot(slot);
        const fallback = this.DEFAULTS[id];
        const raw = String(value || '').trim() || fallback;
        if (this.isBuiltIn(raw)) return { url: raw, reference: raw, migrated: false };
        try {
            if (this.isReference(raw)) {
                const url = await this.resolveReference(raw);
                return url
                    ? { url, reference: raw, migrated: false }
                    : { url: fallback, reference: fallback, migrated: false, missing: true, reset: true };
            }
            const reference = await this.saveForSlot(id, raw, {
                sourceUrl: /^https?:/i.test(raw) ? raw : '',
                sourceType: /^https?:/i.test(raw) ? 'remote' : 'legacy-local'
            });
            const url = await this.resolveReference(reference);
            return { url: url || fallback, reference, migrated: true };
        } catch (error) {
            console.warn('[WallpaperStore] Failed to resolve wallpaper; using fallback.', error);
            const reset = /^(?:blob:|data:)/i.test(raw) || this.isReference(raw);
            return { url: fallback, reference: fallback, migrated: false, reset, error };
        }
    }
};

if (typeof window !== 'undefined') window.WallpaperStore = WallpaperStore;
