/**
 * Photos App
 * FluentWindow-based photo library for Bing wallpapers, local photos and favorites.
 */
(function () {
    'use strict';

    const PHOTO_SETTINGS_KEY = 'fluentos.photos.settings.v1';
    const PHOTO_BING_CACHE_KEY = 'fluentos.photos.bingCache.v1';
    const PHOTO_LOCAL_IMAGE_PREFIX = 'fluentos.photos.localImage.v1.';
    const PHOTO_IDB_NAME = 'fluentos.photos.cache.v1';
    const PHOTO_IDB_STORE = 'localImages';
    const PHOTO_THUMB_MAX_SIDE = 320;
    const PHOTO_THUMB_QUALITY = 0.72;
    const PHOTO_THUMB_MIME = 'image/webp';
    const VALID_ROOTS = new Set(['desktop', 'downloads', 'pictures', 'documents']);
    const VALID_WIDGET_SOURCES = new Set(['bing', 'local', 'favorites']);
    const LOCAL_FOLDER_NAME = '\u672c\u673a\u7167\u7247';
    const FAVORITES_FOLDER_NAME = '\u6536\u85cf';

    const isEn = () => typeof I18n !== 'undefined' && I18n.currentLang === 'en';
    const nowIso = () => new Date().toISOString();
    const rand = () => Math.random().toString(36).slice(2, 10);

    const PhotosText = {
        zh: {
            bing: 'Bing \u58c1\u7eb8',
            local: '\u672c\u673a\u7167\u7247',
            favorites: '\u6536\u85cf',
            settings: '\u8bbe\u7f6e',
            search: '\u641c\u7d22\u56fe\u7247',
            searchResults: '\u641c\u7d22\u7ed3\u679c',
            searching: '\u6b63\u5728\u641c\u7d22...',
            noResult: '\u6ca1\u6709\u627e\u5230\u5339\u914d\u7684\u56fe\u7247',
            loadingBing: '\u6b63\u5728\u52a0\u8f7d Bing \u58c1\u7eb8...',
            retry: '\u91cd\u8bd5',
            bingFailed: '\u65e0\u6cd5\u52a0\u8f7d Bing \u58c1\u7eb8',
            bingFailedDesc: '\u8bf7\u68c0\u67e5\u7f51\u7edc\u8fde\u63a5\u540e\u91cd\u8bd5',
            emptyLocal: '\u5c1a\u672a\u5bfc\u5165\u672c\u673a\u7167\u7247',
            emptyFavorites: '\u5c1a\u672a\u6536\u85cf\u7167\u7247',
            importPhotos: '\u5bfc\u5165\u7167\u7247',
            importFolder: '\u5bfc\u5165\u6587\u4ef6\u5939',
            clearImported: '\u6e05\u9664\u5df2\u5bfc\u5165\u7167\u7247',
            storageLocation: 'Bing / \u7167\u7247\u6682\u5b58\u5730\u5740',
            storageDesc: '\u4f1a\u81ea\u52a8\u521b\u5efa\u300c\u6536\u85cf\u300d\u548c\u300c\u672c\u673a\u7167\u7247\u300d\u6587\u4ef6\u5939',
            widgetSource: '\u7167\u7247\u5c0f\u7ec4\u4ef6\u663e\u793a\u6765\u6e90',
            widgetDesc: '\u4e0e\u5c0f\u7ec4\u4ef6\u53f3\u952e\u7f16\u8f91\u5361\u7247\u4fdd\u6301\u540c\u6b65',
            sourceBing: 'Bing \u6bcf\u65e5\u58c1\u7eb8',
            sourceLocal: '\u968f\u673a\u672c\u673a\u7167\u7247',
            sourceFavorites: '\u6536\u85cf',
            rootDesktop: '\u684c\u9762',
            rootDownloads: '\u4e0b\u8f7d',
            rootPictures: '\u56fe\u7247 / \u7167\u7247',
            rootDocuments: '\u6587\u6863',
            imported: '\u5df2\u5bfc\u5165 {count} \u5f20\u7167\u7247',
            importEmpty: '\u6ca1\u6709\u53ef\u5bfc\u5165\u7684\u56fe\u7247',
            importFailed: '\u7167\u7247\u5bfc\u5165\u5931\u8d25\uff0c\u6d4f\u89c8\u5668\u7167\u7247\u7f13\u5b58\u5199\u5165\u5931\u8d25',
            cleared: '\u5df2\u6e05\u9664\u5df2\u5bfc\u5165\u7167\u7247',
            clearConfirm: '\u8981\u6e05\u9664\u6240\u6709\u5df2\u5bfc\u5165\u7684\u672c\u673a\u7167\u7247\u5417\uff1f',
            cancel: '\u53d6\u6d88',
            confirm: '\u786e\u5b9a',
            favoriteAdd: '\u5df2\u6dfb\u52a0\u5230\u6536\u85cf',
            favoriteRemove: '\u5df2\u4ece\u6536\u85cf\u79fb\u9664',
            setDesktop: '\u8bbe\u4e3a\u684c\u9762\u58c1\u7eb8',
            setLock: '\u8bbe\u4e3a\u9501\u5c4f\u58c1\u7eb8',
            desktopSet: '\u5df2\u8bbe\u4e3a\u684c\u9762\u58c1\u7eb8',
            lockSet: '\u5df2\u8bbe\u4e3a\u9501\u5c4f\u58c1\u7eb8',
            back: '\u8fd4\u56de',
            prev: '\u4e0a\u4e00\u5f20',
            next: '\u4e0b\u4e00\u5f20',
            zoomIn: '\u653e\u5927',
            zoomOut: '\u7f29\u5c0f',
            rotateLeft: '\u5de6\u65cb\u8f6c',
            rotateRight: '\u53f3\u65cb\u8f6c',
            flipH: '\u6c34\u5e73\u7ffb\u8f6c',
            flipV: '\u5782\u76f4\u7ffb\u8f6c',
            adjust: '\u8c03\u6574',
            reset: '\u91cd\u7f6e',
            fullscreen: '\u5168\u5c4f',
            download: '\u4e0b\u8f7d',
            wallpaper: '\u8bbe\u4e3a\u58c1\u7eb8',
            favorite: '\u6536\u85cf',
            unfavorite: '\u53d6\u6d88\u6536\u85cf',
            info: '\u4fe1\u606f',
            brightness: '\u4eae\u5ea6',
            contrast: '\u5bf9\u6bd4\u5ea6',
            saturation: '\u9971\u548c\u5ea6',
            infoDate: '\u65e5\u671f',
            infoSource: '\u6765\u6e90',
            infoSize: '\u5927\u5c0f',
            infoCopyright: '\u7248\u6743',
            today: '\u4eca\u5929'
        },
        en: {
            bing: 'Bing Wallpapers',
            local: 'Local Photos',
            favorites: 'Favorites',
            settings: 'Settings',
            search: 'Search photos',
            searchResults: 'Search results',
            searching: 'Searching...',
            noResult: 'No matching photos found',
            loadingBing: 'Loading Bing wallpapers...',
            retry: 'Retry',
            bingFailed: 'Unable to load Bing wallpapers',
            bingFailedDesc: 'Check your network connection and try again',
            emptyLocal: 'No local photos imported yet',
            emptyFavorites: 'No favorite photos yet',
            importPhotos: 'Import photos',
            importFolder: 'Import folder',
            clearImported: 'Clear imported photos',
            storageLocation: 'Bing / photo cache location',
            storageDesc: 'Creates Favorites and Local Photos folders automatically',
            widgetSource: 'Photo widget source',
            widgetDesc: 'Synced with the widget right-click editor',
            sourceBing: 'Bing daily wallpaper',
            sourceLocal: 'Random local photo',
            sourceFavorites: 'Favorites',
            rootDesktop: 'Desktop',
            rootDownloads: 'Downloads',
            rootPictures: 'Pictures / Photos',
            rootDocuments: 'Documents',
            imported: 'Imported {count} photo(s)',
            importEmpty: 'No importable images found',
            importFailed: 'Photo import failed. Browser photo cache could not be written.',
            cleared: 'Imported photos cleared',
            clearConfirm: 'Clear all imported local photos?',
            cancel: 'Cancel',
            confirm: 'OK',
            favoriteAdd: 'Added to Favorites',
            favoriteRemove: 'Removed from Favorites',
            setDesktop: 'Set as desktop wallpaper',
            setLock: 'Set as lock screen wallpaper',
            desktopSet: 'Set as desktop wallpaper',
            lockSet: 'Set as lock screen wallpaper',
            back: 'Back',
            prev: 'Previous',
            next: 'Next',
            zoomIn: 'Zoom in',
            zoomOut: 'Zoom out',
            rotateLeft: 'Rotate left',
            rotateRight: 'Rotate right',
            flipH: 'Flip horizontal',
            flipV: 'Flip vertical',
            adjust: 'Adjust',
            reset: 'Reset',
            fullscreen: 'Fullscreen',
            download: 'Download',
            wallpaper: 'Set wallpaper',
            favorite: 'Favorite',
            unfavorite: 'Unfavorite',
            info: 'Info',
            brightness: 'Brightness',
            contrast: 'Contrast',
            saturation: 'Saturation',
            infoDate: 'Date',
            infoSource: 'Source',
            infoSize: 'Size',
            infoCopyright: 'Copyright',
            today: 'Today'
        }
    };

    function text(key, params = {}) {
        const table = PhotosText[isEn() ? 'en' : 'zh'] || PhotosText.zh;
        let value = table[key] || key;
        Object.keys(params).forEach(name => {
            value = value.replace(new RegExp(`\\{${name}\\}`, 'g'), params[name]);
        });
        return value;
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[ch]));
    }

    function escapeAttr(value) {
        return escapeHtml(value).replace(/`/g, '&#96;');
    }

    function splitExt(name) {
        const raw = String(name || '');
        const dot = raw.lastIndexOf('.');
        if (dot <= 0 || dot === raw.length - 1) return { base: raw || 'photo', ext: '' };
        return { base: raw.slice(0, dot), ext: raw.slice(dot) };
    }

    function getExt(name) {
        const ext = splitExt(name).ext;
        return ext ? ext.slice(1).toLowerCase() : '';
    }

    function safeImageName(name, fallback = 'photo.jpg') {
        const raw = String(name || fallback).trim() || fallback;
        const cleaned = raw.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
        return cleaned || fallback;
    }

    function uniqueNameIn(folder, desiredName) {
        const { base, ext } = splitExt(safeImageName(desiredName));
        const current = (folder && Array.isArray(folder.children)) ? folder.children : [];
        const exists = (candidate) => current.some(item => item && item.name === candidate);
        const initial = `${base}${ext}`;
        if (!exists(initial)) return initial;
        let i = 2;
        while (exists(`${base} (${i})${ext}`)) i += 1;
        return `${base} (${i})${ext}`;
    }

    function hashString(value) {
        let hash = 0;
        const textValue = String(value || '');
        for (let i = 0; i < textValue.length; i += 1) {
            hash = ((hash << 5) - hash) + textValue.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    function formatBytes(bytes) {
        const value = Number(bytes || 0);
        if (!Number.isFinite(value) || value <= 0) return '--';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = value;
        let unit = 0;
        while (size >= 1024 && unit < units.length - 1) {
            size /= 1024;
            unit += 1;
        }
        return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
    }

    function dateFromAny(value) {
        if (value instanceof Date) return value;
        if (Number.isFinite(Number(value))) return new Date(Number(value));
        const raw = String(value || '');
        if (/^\d{8}$/.test(raw)) {
            return new Date(Number(raw.slice(0, 4)), Number(raw.slice(4, 6)) - 1, Number(raw.slice(6, 8)));
        }
        const parsed = Date.parse(raw);
        return Number.isFinite(parsed) ? new Date(parsed) : null;
    }

    function dataUrlToBlob(dataUrl) {
        const raw = String(dataUrl || '');
        const match = raw.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
        if (!match) return null;
        const mime = match[1] || 'application/octet-stream';
        const isBase64 = !!match[2];
        const data = match[3] || '';
        const binary = isBase64 ? atob(data) : decodeURIComponent(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: mime });
    }

    async function createImageThumbnail(source, maxSide = PHOTO_THUMB_MAX_SIDE, quality = PHOTO_THUMB_QUALITY) {
        const blob = source instanceof Blob ? source : dataUrlToBlob(source);
        if (!blob || typeof document === 'undefined' || typeof URL === 'undefined') return '';
        const url = URL.createObjectURL(blob);
        try {
            const img = await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = () => reject(new Error('thumb_decode_failed'));
                image.src = url;
            });
            const sourceWidth = img.naturalWidth || img.width || 0;
            const sourceHeight = img.naturalHeight || img.height || 0;
            if (!sourceWidth || !sourceHeight) return '';
            const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
            const width = Math.max(1, Math.round(sourceWidth * scale));
            const height = Math.max(1, Math.round(sourceHeight * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return '';
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            const thumb = canvas.toDataURL(PHOTO_THUMB_MIME, quality);
            if (thumb && !thumb.startsWith('data:image/png')) return thumb;
            return canvas.toDataURL('image/jpeg', quality);
        } catch (_) {
            return '';
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    const PhotosDataStore = {
        settingsKey: PHOTO_SETTINGS_KEY,
        bingCacheKey: PHOTO_BING_CACHE_KEY,
        localImagePrefix: PHOTO_LOCAL_IMAGE_PREFIX,
        localFolderName: LOCAL_FOLDER_NAME,
        favoritesFolderName: FAVORITES_FOLDER_NAME,
        _dbPromise: null,
        _blobUrls: new Map(),
        _thumbs: new Map(),
        _thumbLoads: new Map(),
        _thumbQueue: [],
        _thumbQueueIds: new Set(),
        _thumbQueueRunning: 0,
        _thumbPersistTimer: null,
        _hydrating: null,

        text,
        escapeHtml,
        escapeAttr,
        formatBytes,

        cacheKeyForLocalImage(id) {
            return `${PHOTO_LOCAL_IMAGE_PREFIX}${id}`;
        },

        localImageIdFromKey(key) {
            const raw = String(key || '');
            return raw.startsWith(PHOTO_LOCAL_IMAGE_PREFIX) ? raw.slice(PHOTO_LOCAL_IMAGE_PREFIX.length) : '';
        },

        openImageDB() {
            if (this._dbPromise) return this._dbPromise;
            if (typeof indexedDB === 'undefined') return Promise.reject(new Error('indexeddb_unavailable'));
            this._dbPromise = new Promise((resolve, reject) => {
                const request = indexedDB.open(PHOTO_IDB_NAME, 1);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(PHOTO_IDB_STORE)) db.createObjectStore(PHOTO_IDB_STORE, { keyPath: 'id' });
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error || new Error('indexeddb_open_failed'));
            });
            return this._dbPromise;
        },

        idbRequest(request) {
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error || new Error('indexeddb_request_failed'));
            });
        },

        cachedThumbForId(id) {
            return id ? (this._thumbs.get(id) || '') : '';
        },

        async createLocalImageThumb(source) {
            return createImageThumbnail(source);
        },

        async storeLocalImage(id, source, meta = {}) {
            const blob = source instanceof Blob ? source : dataUrlToBlob(source);
            if (!blob || !String(blob.type || meta.mime || '').toLowerCase().startsWith('image/')) throw new Error('invalid_image_data');
            const db = await this.openImageDB();
            const thumb = meta.thumb || await this.createLocalImageThumb(blob);
            const record = {
                id,
                blob,
                thumb: thumb || '',
                mime: meta.mime || blob.type || 'image/jpeg',
                name: meta.name || id,
                size: Number(meta.size || blob.size || 0),
                lastModified: Number(meta.lastModified || Date.now()),
                updated: Date.now()
            };
            await this.idbRequest(db.transaction(PHOTO_IDB_STORE, 'readwrite').objectStore(PHOTO_IDB_STORE).put(record));
            if (thumb) this._thumbs.set(id, thumb);
            return this.cacheKeyForLocalImage(id);
        },

        setBlobUrl(id, blob) {
            if (!id || !(blob instanceof Blob)) return '';
            const old = this._blobUrls.get(id);
            if (old) URL.revokeObjectURL(old);
            const url = URL.createObjectURL(blob);
            this._blobUrls.set(id, url);
            return url;
        },

        localCacheIdForNode(node) {
            if (!node) return '';
            return node.cacheId || node.id || this.localImageIdFromKey(node.cacheKey) || this.localImageIdFromKey(node.content);
        },

        readLocalImage(node, options = {}) {
            if (!node) return '';
            const id = this.localCacheIdForNode(node);
            const url = id ? this._blobUrls.get(id) : '';
            if (!url && id && options.load !== false) this.loadLocalImage(id);
            return url || '';
        },

        readLocalThumb(node, options = {}) {
            if (!node) return '';
            const id = this.localCacheIdForNode(node);
            const direct = node.thumb || node.photoMeta?.thumb || '';
            if (direct) {
                if (id) this._thumbs.set(id, direct);
                return direct;
            }
            const cached = this.cachedThumbForId(id);
            if (cached) return cached;
            if (id && options.loadThumb !== false) this.enqueueLocalThumbLoad(id, node);
            return '';
        },

        resolveThumbSrc(node, visited = new Set(), options = {}) {
            if (!node || node.type !== 'file') return '';
            if (visited.has(node.id)) return '';
            visited.add(node.id);
            if (node.encoding === 'photos-ref') {
                const refId = node.refId || node.content;
                const ref = refId && typeof State !== 'undefined' && State.findNode ? State.findNode(refId) : null;
                return node.thumb || node.photoMeta?.thumb || (ref ? this.resolveThumbSrc(ref, visited, options) : '');
            }
            if (node.encoding === 'photos-local-cache') return this.readLocalThumb(node, options);
            if (node.thumb || node.photoMeta?.thumb) return node.thumb || node.photoMeta.thumb;
            if (node.encoding === 'url') return node.url || node.imageUrl || node.content || '';
            if (node.url || node.imageUrl) return node.url || node.imageUrl;
            if (/^data:image\//i.test(String(node.content || ''))) return node.content;
            if (/^https?:\/\//i.test(String(node.content || ''))) return node.content;
            return '';
        },

        peekImageSrc(node, options = {}) {
            return this.resolveThumbSrc(node, new Set(), options) || this.resolveImageSrc(node, new Set(), { load: false });
        },

        async loadLocalImage(id) {
            if (!id || this._blobUrls.has(id)) return this._blobUrls.get(id) || '';
            try {
                const db = await this.openImageDB();
                const record = await this.idbRequest(db.transaction(PHOTO_IDB_STORE, 'readonly').objectStore(PHOTO_IDB_STORE).get(id));
                if (!record || !(record.blob instanceof Blob)) return '';
                const url = this.setBlobUrl(id, record.blob);
                if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
                    window.dispatchEvent(new CustomEvent('photos-cache-ready', { detail: { id } }));
                }
                return url;
            } catch (_) {
                return '';
            }
        },

        async removeLocalImageCache(nodeOrId) {
            const id = typeof nodeOrId === 'string' ? nodeOrId : (nodeOrId?.cacheId || nodeOrId?.id || this.localImageIdFromKey(nodeOrId?.cacheKey));
            const old = id ? this._blobUrls.get(id) : '';
            if (old) {
                URL.revokeObjectURL(old);
                this._blobUrls.delete(id);
            }
            if (id) {
                this._thumbs.delete(id);
                this._thumbLoads.delete(id);
                this._thumbQueueIds.delete(id);
                this._thumbQueue = this._thumbQueue.filter(task => task.id !== id);
            }
            try {
                const key = typeof nodeOrId === 'object' && nodeOrId?.cacheKey ? nodeOrId.cacheKey : this.cacheKeyForLocalImage(id);
                if (key) localStorage.removeItem(key);
            } catch (_) {}
            try {
                if (!id) return;
                const db = await this.openImageDB();
                await this.idbRequest(db.transaction(PHOTO_IDB_STORE, 'readwrite').objectStore(PHOTO_IDB_STORE).delete(id));
            } catch (_) {}
        },

        enqueueLocalThumbLoad(id, node) {
            if (!id || this._thumbs.has(id) || this._thumbLoads.has(id) || this._thumbQueueIds.has(id)) return;
            this._thumbQueueIds.add(id);
            this._thumbQueue.push({ id, node });
            this.pumpThumbQueue();
        },

        pumpThumbQueue() {
            while (this._thumbQueueRunning < 2 && this._thumbQueue.length) {
                const task = this._thumbQueue.shift();
                if (!task || !task.id) continue;
                this._thumbQueueIds.delete(task.id);
                this._thumbQueueRunning += 1;
                this.loadLocalThumb(task.id, task.node).finally(() => {
                    this._thumbQueueRunning = Math.max(0, this._thumbQueueRunning - 1);
                    this.pumpThumbQueue();
                });
            }
        },

        scheduleThumbPersist() {
            if (this._thumbPersistTimer) return;
            this._thumbPersistTimer = setTimeout(() => {
                this._thumbPersistTimer = null;
                this.persistFS();
            }, 600);
        },

        attachThumbToNodes(id, thumb) {
            if (!id || !thumb) return;
            let changed = false;
            this.walkFS((node) => {
                if (!node || node.type !== 'file') return;
                const isCacheNode = node.encoding === 'photos-local-cache' && this.localCacheIdForNode(node) === id;
                const isRefNode = node.encoding === 'photos-ref' && (node.refId === id || node.content === id);
                if (!isCacheNode && !isRefNode) return;
                if (node.thumb !== thumb) {
                    node.thumb = thumb;
                    changed = true;
                }
                if (node.photoMeta && node.photoMeta.thumb !== thumb) {
                    node.photoMeta.thumb = thumb;
                    changed = true;
                }
            });
            if (changed) this.scheduleThumbPersist();
        },

        async loadLocalThumb(id, node = null) {
            if (!id) return '';
            const cached = this.cachedThumbForId(id);
            if (cached) return cached;
            if (this._thumbLoads.has(id)) return this._thumbLoads.get(id);
            const promise = (async () => {
                const db = await this.openImageDB();
                const record = await this.idbRequest(db.transaction(PHOTO_IDB_STORE, 'readonly').objectStore(PHOTO_IDB_STORE).get(id));
                if (!record) return '';
                let thumb = record.thumb || '';
                if (!thumb && record.blob instanceof Blob) {
                    thumb = await this.createLocalImageThumb(record.blob);
                    if (thumb) {
                        record.thumb = thumb;
                        record.updated = Date.now();
                        await this.idbRequest(db.transaction(PHOTO_IDB_STORE, 'readwrite').objectStore(PHOTO_IDB_STORE).put(record));
                    }
                }
                if (thumb) {
                    this._thumbs.set(id, thumb);
                    if (node && !node.thumb) {
                        node.thumb = thumb;
                        this.scheduleThumbPersist();
                    }
                    this.attachThumbToNodes(id, thumb);
                    if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
                        window.dispatchEvent(new CustomEvent('photos-cache-ready', { detail: { id, thumb: true } }));
                    }
                }
                return thumb || '';
            })().catch(() => '').finally(() => {
                this._thumbLoads.delete(id);
            });
            this._thumbLoads.set(id, promise);
            return promise;
        },

        listLegacyLocalStorageImageIds() {
            const ids = new Set();
            try {
                for (let i = 0; i < localStorage.length; i += 1) {
                    const key = localStorage.key(i);
                    const id = this.localImageIdFromKey(key);
                    if (id) ids.add(id);
                }
            } catch (_) {}
            return ids;
        },

        async listLocalImageCacheIds() {
            try {
                const db = await this.openImageDB();
                const keys = await this.idbRequest(db.transaction(PHOTO_IDB_STORE, 'readonly').objectStore(PHOTO_IDB_STORE).getAllKeys());
                return new Set((keys || []).map(String));
            } catch (_) {
                return new Set();
            }
        },

        hydrateLocalImageCache() {
            if (this._hydrating) return this._hydrating;
            this._hydrating = (async () => {
                const ids = this.collectLocalCacheRefs({ includeRecycle: true });
                if (!ids.size) return;
                const db = await this.openImageDB();
                const store = db.transaction(PHOTO_IDB_STORE, 'readonly').objectStore(PHOTO_IDB_STORE);
                await Promise.all(Array.from(ids).map(async (id) => {
                    if (!id || this._blobUrls.has(id)) return;
                    const record = await this.idbRequest(store.get(id)).catch(() => null);
                    if (record && record.blob instanceof Blob) this.setBlobUrl(id, record.blob);
                }));
                this.renderWidgets();
                if (typeof window !== 'undefined' && typeof CustomEvent === 'function') window.dispatchEvent(new CustomEvent('photos-cache-ready'));
            })().catch(() => {}).finally(() => { this._hydrating = null; });
            return this._hydrating;
        },

        persistFS() {
            if (typeof State === 'undefined' || !State.updateFS) return false;
            return State.updateFS(State.fs) !== false;
        },

        walkFS(callback, node = (typeof State !== 'undefined' ? State.fs?.root : null), parent = null) {
            if (!node) return;
            callback(node, parent);
            (node.children || []).forEach(child => this.walkFS(callback, child, node));
        },

        isNodeInPhotosLocalFolders(nodeId) {
            if (!nodeId) return false;
            let found = false;
            this.walkFS((node) => {
                if (found || !node || node.type !== 'folder') return;
                const isLocalFolder = node.id && String(node.id).startsWith('photos-local-');
                if (!isLocalFolder && node.name !== LOCAL_FOLDER_NAME) return;
                found = (node.children || []).some(child => child && child.id === nodeId);
            });
            return found;
        },

        isPhotosLocalCacheNode(node) {
            return !!node && node.type === 'file' && node.encoding === 'photos-local-cache';
        },

        collectLocalCacheRefs({ includeRecycle = true } = {}) {
            const ids = new Set();
            this.walkFS((node, parent) => {
                if (!this.isPhotosLocalCacheNode(node)) return;
                if (!includeRecycle && parent && parent.id === 'recycle') return;
                ids.add(node.cacheId || node.id || this.localImageIdFromKey(node.cacheKey));
            });
            ids.delete('');
            return ids;
        },

        async migrateDataUrlNodesToCache() {
            let changed = false;
            const migrations = [];
            this.walkFS((node, parent) => {
                if (!node || node.type !== 'file' || node.encoding !== 'dataurl') return;
                if (!/^data:image\//i.test(String(node.content || ''))) return;
                const inPhotosLocal = parent && parent.type === 'folder' && (String(parent.id || '').startsWith('photos-local-') || parent.name === LOCAL_FOLDER_NAME);
                if (!inPhotosLocal && node.source !== 'photos-local') return;
                migrations.push((async () => {
                    const key = await this.storeLocalImage(node.id, node.content, {
                        mime: node.mime,
                        name: node.name,
                        size: node.size,
                        lastModified: node.lastModified
                    });
                    const thumb = this.cachedThumbForId(node.id);
                    node.cacheKey = key;
                    node.cacheId = node.id;
                    node.content = key;
                    node.encoding = 'photos-local-cache';
                    if (thumb) node.thumb = thumb;
                    changed = true;
                })().catch((err) => {
                    console.warn('[PhotosDataStore] Failed to migrate local photo cache', err);
                }));
            });
            await Promise.all(migrations);
            if (changed) this.persistFS();
            return changed;
        },

        syncWithFS(options = {}) {
            if (this._syncingFS) return false;
            this._syncingFS = true;
            let changed = false;
            try {
                this.walkFS((node) => {
                    if (!node || node.type !== 'folder' || !Array.isArray(node.children)) return;
                    const isFavoritesFolder = String(node.id || '').startsWith('photos-favorites-') || node.name === FAVORITES_FOLDER_NAME;
                    if (!isFavoritesFolder) return;
                    const before = node.children.length;
                    node.children = node.children.filter(child => {
                        if (!child || child.encoding !== 'photos-ref') return true;
                        const refId = child.refId || child.content;
                        return this.isNodeInPhotosLocalFolders(refId);
                    });
                    if (node.children.length !== before) changed = true;
                });

                const referencedCacheIds = this.collectLocalCacheRefs({ includeRecycle: true });
                this.cleanupUnreferencedLocalImages(referencedCacheIds);

                if (changed && options.persist !== false) this.persistFS();
            } finally {
                this._syncingFS = false;
            }
            this.renderWidgets();
            if (changed && typeof window !== 'undefined' && typeof CustomEvent === 'function') {
                window.dispatchEvent(new CustomEvent('photos-library-change'));
            }
            return changed;
        },

        async cleanupUnreferencedLocalImages(referencedCacheIds = this.collectLocalCacheRefs({ includeRecycle: true })) {
            const ids = await this.listLocalImageCacheIds();
            ids.forEach(id => {
                if (!referencedCacheIds.has(id)) this.removeLocalImageCache(id);
            });
            this.listLegacyLocalStorageImageIds().forEach(id => {
                if (!referencedCacheIds.has(id)) this.removeLocalImageCache(id);
            });
        },

        getSettings() {
            let saved = {};
            try {
                saved = JSON.parse(localStorage.getItem(PHOTO_SETTINGS_KEY) || '{}') || {};
            } catch (_) {
                saved = {};
            }
            const storageRootId = VALID_ROOTS.has(saved.storageRootId) ? saved.storageRootId : 'pictures';
            const widgetSource = VALID_WIDGET_SOURCES.has(saved.widgetSource) ? saved.widgetSource : 'bing';
            return { storageRootId, widgetSource };
        },

        saveSettings(patch = {}, options = {}) {
            const current = this.getSettings();
            const next = {
                storageRootId: VALID_ROOTS.has(patch.storageRootId) ? patch.storageRootId : current.storageRootId,
                widgetSource: VALID_WIDGET_SOURCES.has(patch.widgetSource) ? patch.widgetSource : current.widgetSource
            };
            try {
                localStorage.setItem(PHOTO_SETTINGS_KEY, JSON.stringify(next));
            } catch (_) {}
            this.ensureLibraryFolders(next.storageRootId);
            if (options.syncWidgets !== false) this.syncPhotoWidgetSource(next.widgetSource);
            if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
                window.dispatchEvent(new CustomEvent('photos-settings-change', { detail: next }));
            }
            return next;
        },

        syncPhotoWidgetSource(source) {
            if (!VALID_WIDGET_SOURCES.has(source)) return;
            if (typeof State === 'undefined' || !State.settings) return;
            const current = State.settings.widgetsLayout || {};
            const layout = {
                desktop: Array.isArray(current.desktop) ? current.desktop.map(inst => ({ ...inst })) : [],
                lock: Array.isArray(current.lock) ? current.lock.map(inst => ({ ...inst })) : []
            };
            let changed = false;
            ['desktop', 'lock'].forEach(surface => {
                layout[surface] = layout[surface].map(inst => {
                    if (!inst || !String(inst.widgetId || '').startsWith('photos-')) return inst;
                    const settings = { ...(inst.settings || {}), source };
                    if ((inst.settings || {}).source !== source) changed = true;
                    return { ...inst, settings };
                });
            });
            if (changed && typeof State.updateSettings === 'function') {
                State.updateSettings({ widgetsLayout: layout });
            }
            if (typeof Widgets !== 'undefined' && Widgets && typeof Widgets.renderAll === 'function') {
                Widgets.renderAll();
            }
        },

        rootOptions() {
            return [
                { value: 'desktop', label: text('rootDesktop') },
                { value: 'downloads', label: text('rootDownloads') },
                { value: 'pictures', label: text('rootPictures') },
                { value: 'documents', label: text('rootDocuments') }
            ];
        },

        sourceOptions() {
            return [
                { value: 'bing', label: text('sourceBing') },
                { value: 'local', label: text('sourceLocal') },
                { value: 'favorites', label: text('sourceFavorites') }
            ];
        },

        localFolderId(rootId = this.getSettings().storageRootId) {
            return `photos-local-${rootId}`;
        },

        favoritesFolderId(rootId = this.getSettings().storageRootId) {
            return `photos-favorites-${rootId}`;
        },

        findRoot(rootId = this.getSettings().storageRootId) {
            if (typeof State === 'undefined' || !State.findNode) return null;
            const safeRoot = VALID_ROOTS.has(rootId) ? rootId : 'pictures';
            return State.findNode(safeRoot) || State.findNode('pictures') || State.fs?.root || null;
        },

        ensureLibraryFolders(rootId = this.getSettings().storageRootId) {
            const root = this.findRoot(rootId);
            if (!root || root.type !== 'folder') return { root: null, local: null, favorites: null };
            root.children = Array.isArray(root.children) ? root.children : [];
            let changed = false;
            const ensureChild = (id, name) => {
                let node = root.children.find(child => child && (child.id === id || child.name === name));
                if (!node) {
                    node = { id, name, type: 'folder', children: [], created: nowIso(), modified: nowIso() };
                    root.children.push(node);
                    changed = true;
                } else {
                    if (node.type !== 'folder') node.type = 'folder';
                    if (!Array.isArray(node.children)) node.children = [];
                    if (!node.id) node.id = id;
                }
                return node;
            };
            const local = ensureChild(this.localFolderId(rootId), LOCAL_FOLDER_NAME);
            const favorites = ensureChild(this.favoritesFolderId(rootId), FAVORITES_FOLDER_NAME);
            if (changed) this.persistFS();
            return { root, local, favorites };
        },

        isImageFile(file) {
            if (!file) return false;
            const type = String(file.type || '').toLowerCase();
            if (type.startsWith('image/')) return true;
            return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(getExt(file.name));
        },

        isImageNode(node) {
            if (!node || node.type !== 'file') return false;
            const mime = String(node.mime || '').toLowerCase();
            if (mime.startsWith('image/')) return true;
            if (node.encoding === 'url' || node.encoding === 'photos-ref' || node.encoding === 'photos-local-cache') return true;
            if (node.encoding === 'dataurl' && /^data:image\//i.test(String(node.content || ''))) return true;
            return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(getExt(node.name));
        },

        resolveImageSrc(node, visited = new Set(), options = {}) {
            if (!node || node.type !== 'file') return '';
            if (visited.has(node.id)) return '';
            visited.add(node.id);
            if (node.encoding === 'photos-ref') {
                const refId = node.refId || node.content;
                if (!this.isNodeInPhotosLocalFolders(refId)) return '';
                const ref = refId && typeof State !== 'undefined' && State.findNode ? State.findNode(refId) : null;
                return ref ? this.resolveImageSrc(ref, visited, options) : '';
            }
            if (node.encoding === 'photos-local-cache') return this.readLocalImage(node, options);
            if (node.encoding === 'url') return node.url || node.imageUrl || node.content || '';
            if (node.url || node.imageUrl) return node.url || node.imageUrl;
            if (/^data:image\//i.test(String(node.content || ''))) return node.content;
            if (/^https?:\/\//i.test(String(node.content || ''))) return node.content;
            return '';
        },

        nodeDateMs(node) {
            const candidates = [
                node?.lastModified,
                node?.photoMeta?.lastModified,
                node?.modified,
                node?.created,
                node?.photoMeta?.date
            ];
            for (const value of candidates) {
                const date = dateFromAny(value);
                if (date && Number.isFinite(date.getTime())) return date.getTime();
            }
            return Date.now();
        },

        listImagesFromFolder(folder, options = {}) {
            if (!folder || !Array.isArray(folder.children)) return [];
            const includeUnloaded = options.includeUnloaded !== false;
            return folder.children
                .filter(node => {
                    if (!this.isImageNode(node)) return false;
                    const thumb = this.resolveThumbSrc(node, new Set(), { loadThumb: options.loadThumb !== false });
                    const src = this.resolveImageSrc(node, new Set(), { load: options.load === true });
                    return !!thumb || !!src || (includeUnloaded && (node.encoding === 'photos-local-cache' || node.encoding === 'photos-ref'));
                })
                .map(node => ({
                    node,
                    src: this.resolveImageSrc(node, new Set(), { load: options.load === true }),
                    thumb: this.resolveThumbSrc(node, new Set(), { loadThumb: options.loadThumb !== false }),
                    dateMs: this.nodeDateMs(node)
                }))
                .sort((a, b) => b.dateMs - a.dateMs);
        },

        listLocalImages(options = {}) {
            return this.listImagesFromFolder(this.ensureLibraryFolders().local, options);
        },

        listFavoriteImages(options = {}) {
            return this.listImagesFromFolder(this.ensureLibraryFolders().favorites, options);
        },

        readFileAsDataURL(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(reader.error || new Error('read_failed'));
                reader.onabort = () => reject(new Error('aborted'));
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        },

        async importFiles(files) {
            const input = Array.from(files || []).filter(file => this.isImageFile(file));
            if (!input.length) return [];
            const folders = this.ensureLibraryFolders();
            if (!folders.local) return [];
            const imported = [];
            try {
                for (const file of input) {
                    const nodeId = `photo-local-${Date.now()}-${rand()}`;
                    const cacheKey = await this.storeLocalImage(nodeId, file, {
                        mime: file.type,
                        name: file.name,
                        size: file.size,
                        lastModified: file.lastModified
                    });
                    const thumb = this.cachedThumbForId(nodeId);
                    const node = {
                        id: nodeId,
                        name: uniqueNameIn(folders.local, file.name || 'photo.jpg'),
                        type: 'file',
                        content: cacheKey,
                        cacheKey,
                        cacheId: nodeId,
                        size: Number(file.size || 0),
                        mime: String(file.type || 'image/jpeg'),
                        encoding: 'photos-local-cache',
                        source: 'photos-local',
                        thumb,
                        lastModified: Number(file.lastModified || Date.now()),
                        created: nowIso(),
                        modified: nowIso()
                    };
                    folders.local.children.push(node);
                    imported.push(node);
                }
            } catch (err) {
                imported.forEach(node => {
                    this.removeNodeById(folders.local, node.id);
                    this.removeLocalImageCache(node);
                });
                this.persistFS();
                throw err;
            }
            if (imported.length && !this.persistFS()) {
                imported.forEach(node => {
                    this.removeNodeById(folders.local, node.id);
                    this.removeLocalImageCache(node);
                });
                this.persistFS();
                throw new Error('photos_fs_persist_failed');
            }
            this.renderWidgets();
            return imported;
        },

        removeNodeById(folder, id) {
            if (!folder || !Array.isArray(folder.children)) return false;
            const before = folder.children.length;
            folder.children = folder.children.filter(child => child && child.id !== id);
            return folder.children.length !== before;
        },

        addLocalFavorite(nodeId) {
            const folders = this.ensureLibraryFolders();
            const source = typeof State !== 'undefined' && State.findNode ? State.findNode(nodeId) : null;
            if (!source || !this.isImageNode(source) || !folders.favorites) return null;
            const existing = folders.favorites.children.find(child =>
                child && child.encoding === 'photos-ref' && (child.refId === nodeId || child.content === nodeId)
            );
            if (existing) return existing;
            const thumb = this.peekImageSrc(source, { loadThumb: false });
            const node = {
                id: `photo-fav-local-${Date.now()}-${rand()}`,
                name: uniqueNameIn(folders.favorites, source.name || 'photo.jpg'),
                type: 'file',
                content: nodeId,
                refId: nodeId,
                size: Number(source.size || 0),
                mime: String(source.mime || 'image/jpeg'),
                encoding: 'photos-ref',
                source: 'photos-favorite',
                thumb,
                photoMeta: {
                    source: 'local',
                    refId: nodeId,
                    title: source.name || '',
                    thumb,
                    lastModified: source.lastModified || source.modified || source.created || Date.now()
                },
                created: nowIso(),
                modified: nowIso()
            };
            folders.favorites.children.push(node);
            this.persistFS();
            this.renderWidgets();
            return node;
        },

        addBingFavorite(item) {
            const folders = this.ensureLibraryFolders();
            if (!folders.favorites || !item) return null;
            const src = item.urlHD || item.src || item.url || item.thumb || '';
            if (!src) return null;
            const bingId = item.id || item.bingId || item.date || src;
            const existing = folders.favorites.children.find(child => {
                if (!child) return false;
                if (child.encoding !== 'url') return false;
                if (child.photoMeta?.source !== 'bing') return false;
                return child.photoMeta?.bingId === bingId || child.content === src || child.url === src;
            });
            if (existing) return existing;
            const baseName = safeImageName(`${item.title || text('bing')}.jpg`, 'bing-wallpaper.jpg');
            const node = {
                id: `photo-fav-bing-${Date.now()}-${rand()}`,
                name: uniqueNameIn(folders.favorites, baseName),
                type: 'file',
                content: src,
                url: src,
                size: 0,
                mime: 'image/jpeg',
                encoding: 'url',
                source: 'photos-favorite',
                photoMeta: {
                    source: 'bing',
                    bingId,
                    title: item.title || text('bing'),
                    copyright: item.copyright || '',
                    date: item.date || '',
                    url: item.src || item.url || src,
                    urlHD: src
                },
                created: nowIso(),
                modified: nowIso()
            };
            folders.favorites.children.push(node);
            this.persistFS();
            this.renderWidgets();
            return node;
        },

        isLocalFavorite(nodeId) {
            const fav = this.ensureLibraryFolders().favorites;
            return !!(fav && fav.children || []).find(child =>
                child && child.encoding === 'photos-ref' && (child.refId === nodeId || child.content === nodeId)
            );
        },

        isBingFavorite(item) {
            const fav = this.ensureLibraryFolders().favorites;
            const src = item?.urlHD || item?.src || item?.url || '';
            const bingId = item?.id || item?.bingId || item?.date || src;
            return !!(fav && fav.children || []).find(child => {
                if (!child || child.encoding !== 'url' || child.photoMeta?.source !== 'bing') return false;
                return child.photoMeta?.bingId === bingId || child.url === src || child.content === src;
            });
        },

        removeFavoriteForItem(item) {
            const fav = this.ensureLibraryFolders().favorites;
            if (!fav) return false;
            let removed = false;
            if (item?.kind === 'favorite' && item.nodeId) {
                removed = this.removeNodeById(fav, item.nodeId);
            } else if (item?.kind === 'local' && item.nodeId) {
                const before = fav.children.length;
                fav.children = fav.children.filter(child =>
                    !(child && child.encoding === 'photos-ref' && (child.refId === item.nodeId || child.content === item.nodeId))
                );
                removed = fav.children.length !== before;
            } else if (item?.kind === 'bing') {
                const src = item.urlHD || item.src || item.url || '';
                const bingId = item.id || item.bingId || item.date || src;
                const before = fav.children.length;
                fav.children = fav.children.filter(child => {
                    if (!child || child.encoding !== 'url' || child.photoMeta?.source !== 'bing') return true;
                    return !(child.photoMeta?.bingId === bingId || child.url === src || child.content === src);
                });
                removed = fav.children.length !== before;
            }
            if (removed) this.persistFS();
            if (removed) this.renderWidgets();
            return removed;
        },

        clearImportedPhotos() {
            this.ensureLibraryFolders();
            const removedNodes = [];
            const foldersToClean = new Set();
            this.walkFS((node, parent) => {
                if (!parent || !Array.isArray(parent.children)) return;
                if (!this.isClearableLocalPhotoNode(node)) return;
                removedNodes.push(node);
                foldersToClean.add(parent);
            });
            const removedIds = new Set(removedNodes.map(node => node && node.id).filter(Boolean));
            const removedCount = removedIds.size;

            foldersToClean.forEach(folder => {
                folder.children = (folder.children || []).filter(node => !removedIds.has(node && node.id));
            });

            if (removedIds.size) {
                this.walkFS((node) => {
                    if (!node || node.type !== 'folder' || !Array.isArray(node.children)) return;
                    node.children = node.children.filter(child => {
                        if (!child || child.encoding !== 'photos-ref') return true;
                        return !removedIds.has(child.refId || child.content);
                    });
                });
                removedNodes.forEach(node => this.removeLocalImageCache(node));
                this.persistFS();
                this.renderWidgets();
                if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
                    window.dispatchEvent(new CustomEvent('photos-library-change', { detail: { removedIds: Array.from(removedIds) } }));
                }
            }
            return removedCount;
        },

        isClearableLocalPhotoNode(node) {
            if (!node || node.type !== 'file' || !this.isImageNode(node)) return false;
            if (node.source === 'photos-local' || node.source === 'external-import') return true;
            return node.encoding === 'photos-local-cache' || (node.encoding === 'dataurl' && /^data:image\//i.test(String(node.content || '')));
        },

        getWidgetImage(source) {
            const safeSource = VALID_WIDGET_SOURCES.has(source) ? source : this.getSettings().widgetSource;
            const images = safeSource === 'favorites'
                ? this.listFavoriteImages({ load: false, loadThumb: false, includeUnloaded: true })
                : this.listLocalImages({ load: false, loadThumb: false, includeUnloaded: true });
            if (!images.length) return null;
            const bucket = Math.floor(Date.now() / (60 * 60 * 1000));
            const idx = hashString(`${safeSource}:${bucket}:${images.length}`) % images.length;
            const item = images[idx];
            const preview = item.thumb || this.peekImageSrc(item.node, { loadThumb: false });
            if (!preview && item.node) {
                const target = item.node.encoding === 'photos-ref' && typeof State !== 'undefined' && State.findNode
                    ? State.findNode(item.node.refId || item.node.content)
                    : item.node;
                const id = this.localCacheIdForNode(target);
                if (id) this.enqueueLocalThumbLoad(id, target);
            }
            return {
                url: preview,
                pending: !preview,
                title: item.node.photoMeta?.title || item.node.name || text(safeSource === 'favorites' ? 'favorites' : 'local'),
                tag: text(safeSource === 'favorites' ? 'favorites' : 'local')
            };
        },

        readBingCache() {
            try {
                const data = JSON.parse(localStorage.getItem(PHOTO_BING_CACHE_KEY) || '{}');
                return Array.isArray(data.images) ? data.images : [];
            } catch (_) {
                return [];
            }
        },

        writeBingCache(images) {
            try {
                localStorage.setItem(PHOTO_BING_CACHE_KEY, JSON.stringify({ images, time: Date.now() }));
            } catch (_) {}
        },

        renderWidgets() {
            if (typeof Widgets !== 'undefined' && Widgets && typeof Widgets.renderAll === 'function') {
                Widgets.renderAll();
            }
        },

        bindGlobalFSListener() {
            if (this._globalFSBound) return;
            if (typeof State === 'undefined' || typeof State.on !== 'function') return;
            this._globalFSBound = true;
            State.on('fsChange', () => this.syncWithFS({ persist: true }), { key: 'photos-data-store-fs-sync' });
        }
    };

    const PhotosApp = {
        windowId: null,
        container: null,
        frame: null,
        activeView: 'bing',
        bingImages: [],
        bingHomeQuery: '',
        bingLoading: false,
        bingError: false,
        viewerItems: [],
        currentIndex: -1,
        zoom: 1,
        panX: 0,
        panY: 0,
        isPanning: false,
        panStart: { x: 0, y: 0 },
        rotation: 0,
        flipH: false,
        flipV: false,
        adjustments: { brightness: 100, contrast: 100, saturate: 100 },
        viewerBound: false,
        _unsubLang: null,
        _unsubFs: null,
        _settingsHandler: null,
        _cacheReadyHandler: null,
        _importInput: null,
        _folderInput: null,
        _viewerMotion: null,
        _viewerMotionId: 0,

        tr(key, params = {}) {
            return text(key, params);
        },

        init(windowId) {
            this.beforeClose();
            this.windowId = windowId;
            this.container = document.getElementById(`${windowId}-content`);
            if (!this.container) return;
            this.container.classList.add('photos-app');
            this.activeView = 'bing';
            this.bingImages = PhotosDataStore.readBingCache().map((item, index) => this.normalizeBingWallpaper(item, index)).filter(Boolean);
            PhotosDataStore.ensureLibraryFolders();
            PhotosDataStore.migrateDataUrlNodesToCache().then(() => {
                if (this.container && this.frame && ['local', 'favorites'].includes(this.activeView)) this.frame.refresh();
            });
            PhotosDataStore.syncWithFS({ persist: true });
            this.addStyles();
            this.render();
            this.fetchBingWallpapers();

            if (typeof State !== 'undefined' && typeof State.on === 'function') {
                this._unsubLang = State.on('languageChange', () => {
                    if (!this.container) return;
                    this.render();
                });
                this._unsubFs = State.on('fsChange', () => {
                    if (!this.container || !this.frame) return;
                    this.reconcileViewerAfterFSChange();
                    if (['local', 'favorites', 'settings'].includes(this.activeView)) this.frame.refresh();
                });
            }
            this._settingsHandler = () => {
                if (!this.container || !this.frame) return;
                if (this.activeView === 'settings') this.frame.refresh();
            };
            window.addEventListener('photos-settings-change', this._settingsHandler);
            this._cacheReadyHandler = () => {
                if (!this.container || !this.frame) return;
                clearTimeout(this._cacheRefreshTimer);
                this._cacheRefreshTimer = setTimeout(() => {
                    this._cacheRefreshTimer = null;
                    if (!this.container || !this.frame) return;
                    this.reconcileViewerAfterFSChange();
                    if (['local', 'favorites'].includes(this.activeView)) this.frame.refresh();
                }, 80);
            };
            window.addEventListener('photos-cache-ready', this._cacheReadyHandler);
        },

        beforeClose() {
            this._viewerMotionId += 1;
            this.cancelViewerMotion();
            this.container?.classList?.remove('photos-app');
            if (this.frame && typeof this.frame.destroy === 'function') this.frame.destroy();
            this.frame = null;
            if (this._unsubLang) this._unsubLang();
            if (this._unsubFs) this._unsubFs();
            this._unsubLang = null;
            this._unsubFs = null;
            if (this._settingsHandler) window.removeEventListener('photos-settings-change', this._settingsHandler);
            this._settingsHandler = null;
            if (this._cacheReadyHandler) window.removeEventListener('photos-cache-ready', this._cacheReadyHandler);
            this._cacheReadyHandler = null;
            clearTimeout(this._cacheRefreshTimer);
            this._cacheRefreshTimer = null;
            this.container = null;
            this.viewerBound = false;
            this._importInput = null;
            this._folderInput = null;
            return true;
        },

        openData(data = {}) {
            if (data && data.fileId) this.loadFile(data.fileId);
        },

        loadFile(fileId) {
            if (!fileId) return;
            const node = typeof State !== 'undefined' && State.findNode ? State.findNode(fileId) : null;
            if (!node || !PhotosDataStore.isImageNode(node)) return;
            const folders = PhotosDataStore.ensureLibraryFolders();
            const view = folders.favorites?.children?.some(child => child && child.id === fileId) ? 'favorites' : 'local';
            const open = () => {
                const items = this.getItemsForView(view);
                const index = items.findIndex(item => item.nodeId === fileId || item.id === fileId);
                if (index >= 0) this.openViewer(index, items);
                else this.openStandaloneNode(node);
            };
            if (this.frame && this.activeView !== view) {
                this.frame.navigate(view, { preserveScroll: false });
                setTimeout(open, 220);
            } else {
                this.activeView = view;
                setTimeout(open, 0);
            }
        },

        openStandaloneNode(node) {
            this.openViewer(0, [this.itemFromNode(node, 'local')]);
        },

        reconcileViewerAfterFSChange() {
            const viewer = this.container?.querySelector('.photos-viewer');
            if (!viewer || viewer.style.display === 'none' || this.currentIndex < 0) return;
            const current = this.viewerItems[this.currentIndex];
            if (!current || current.kind === 'bing') return;
            const view = current.kind === 'favorite' ? 'favorites' : 'local';
            const items = this.getItemsForView(view);
            const index = items.findIndex(item => item.id === current.id || item.nodeId === current.nodeId);
            if (index < 0) {
                this.viewerItems = items;
                this.currentIndex = -1;
                this.closeViewer();
                return;
            }
            this.viewerItems = items;
            this.currentIndex = index;
            this.updateViewerChrome();
        },

        render() {
            if (!this.container) return;
            this.container.innerHTML = '';
            if (this.frame && typeof this.frame.destroy === 'function') this.frame.destroy();
            if (typeof FluentWindow === 'undefined' || typeof FluentWindow.mount !== 'function') {
                console.error('[PhotosApp] FluentWindow framework is not loaded');
                return;
            }
            this.frame = FluentWindow.mount({
                container: this.container,
                expandedWidth: 224,
                collapsedWidth: 60,
                activeId: this.activeView,
                items: [
                    { id: 'bing', label: this.tr('bing'), icon: 'Image' },
                    { id: 'local', label: this.tr('local'), icon: 'Folder Open' },
                    { id: 'favorites', label: this.tr('favorites'), icon: 'Heart' }
                ],
                footerItems: [
                    { id: 'settings', label: this.tr('settings'), icon: 'Settings' }
                ],
                sidebarSearch: {
                    enabled: true,
                    placeholder: this.tr('search'),
                    resultsTitle: this.tr('searchResults'),
                    emptyText: this.tr('noResult'),
                    loadingText: this.tr('searching'),
                    minQueryLength: 1,
                    debounceMs: 160,
                    search: (query) => this.searchPhotos(query),
                    onResultClick: (result) => {
                        if (!result || !result.data) return;
                        if (this.frame && typeof this.frame.clearSidebarSearch === 'function') this.frame.clearSidebarSearch();
                        this.openSearchResult(result.data);
                    }
                },
                onNavigate: (id, pageEl) => {
                    this.activeView = id || 'bing';
                    pageEl.className = 'fw-page photos-page';
                    this.renderPage(this.activeView, pageEl);
                }
            });
            this.ensureViewer();
        },

        renderPage(view, pageEl) {
            if (view === 'settings') {
                this.renderSettingsPage(pageEl);
                return;
            }
            if (view === 'bing') {
                this.renderBingPage(pageEl);
                return;
            }
            if (view === 'favorites') {
                this.renderCollectionPage(pageEl, {
                    title: this.tr('favorites'),
                    subtitle: `${this.getItemsForView('favorites').length}`,
                    items: this.getItemsForView('favorites'),
                    emptyText: this.tr('emptyFavorites'),
                    grouped: false
                });
                return;
            }
            this.renderCollectionPage(pageEl, {
                title: this.tr('local'),
                subtitle: `${this.getItemsForView('local').length}`,
                items: this.getItemsForView('local'),
                emptyText: this.tr('emptyLocal'),
                grouped: true
            });
        },

        renderBingPage(pageEl) {
            if (this.bingLoading && !this.bingImages.length) {
                pageEl.innerHTML = `
                    <div class="photos-gallery">
                        <div class="photos-loading">
                            <div class="photos-spinner"></div>
                            <p>${escapeHtml(this.tr('loadingBing'))}</p>
                        </div>
                    </div>`;
                return;
            }
            if (this.bingError && !this.bingImages.length) {
                pageEl.innerHTML = `
                    <div class="photos-gallery">
                    <div class="photos-error">
                        <img src="Theme/Icon/Symbol_icon/stroke/Exclamation Circle.svg" alt="">
                        <h3>${escapeHtml(typeof t === 'function' ? t('photos.error-title') : this.tr('bingFailed'))}</h3>
                        <p>${escapeHtml(typeof t === 'function' ? t('photos.error-desc') : this.tr('bingFailedDesc'))}</p>
                        <button class="photos-retry-btn" type="button">${escapeHtml(this.tr('retry'))}</button>
                    </div>
                    </div>`;
                pageEl.querySelector('.photos-retry-btn')?.addEventListener('click', () => this.fetchBingWallpapers(true));
                return;
            }
            const items = this.getItemsForView('bing');
            pageEl.innerHTML = `
                <div class="photos-gallery">
                    <div class="photos-home">
                        <div class="photos-home-header">
                            <h1 class="photos-greeting">${escapeHtml(this.getGreeting())}</h1>
                            <p class="photos-date">${escapeHtml(this.getDateString())}</p>
                        </div>
                        <div class="photos-cards-container">
                            ${this.renderBingCardsHTML(items)}
                        </div>
                    </div>
                </div>`;
            this.bindBingHomeEvents(pageEl, items);
        },

        getGreeting() {
            const h = new Date().getHours();
            if (typeof t !== 'function') return this.tr('bing');
            if (h < 6) return t('photos.greeting.night');
            if (h < 12) return t('photos.greeting.morning');
            if (h < 14) return t('photos.greeting.noon');
            if (h < 18) return t('photos.greeting.afternoon');
            return t('photos.greeting.evening');
        },

        getDateString() {
            const now = new Date();
            if (typeof t !== 'function') return this.formatDate(now.getTime());
            const month = t(`photos.month-${now.getMonth() + 1}`);
            return t('photos.date-format', { month, day: now.getDate() });
        },

        renderBingCardsHTML(items, query = '') {
            const q = String(query || '').trim().toLowerCase();
            const colors = ['#f44336', '#4caf50', '#ff9800', '#2196f3', '#9c27b0', '#00bcd4', '#e91e63', '#8bc34a', '#ff5722'];
            let filtered = items.map((item, index) => ({ item, index }));
            if (q) {
                filtered = filtered.filter(({ item }) =>
                    String(item.title || '').toLowerCase().includes(q) ||
                    String(item.copyright || item.subtitle || '').toLowerCase().includes(q) ||
                    String(item.date || item.dateLabel || '').toLowerCase().includes(q)
                );
            }
            if (!filtered.length) {
                const label = typeof t === 'function' ? t('photos.no-result') : this.tr('noResult');
                return `<div class="photos-no-result"><p>${escapeHtml(label)}</p></div>`;
            }
            if (q) {
                return `<div class="photos-card-grid">
                    ${filtered.map(({ item, index }) => this.renderBingCard(item, index, colors[index % colors.length], false)).join('')}
                </div>`;
            }
            const featured = filtered[0];
            const rest = filtered.slice(1);
            return `${featured ? this.renderBingCard(featured.item, featured.index, '#0078d4', true) : ''}
                <div class="photos-card-grid">
                    ${rest.map(({ item, index }) => this.renderBingCard(item, index, colors[index % colors.length], false)).join('')}
                </div>`;
        },

        renderBingCard(item, index, color, featured) {
            return `
                <div class="photos-card ${featured ? 'photos-card-featured' : 'photos-card-small'}" data-index="${index}" data-photo-id="${escapeAttr(item.id)}">
                    <div class="photos-card-inner">
                        <img src="${escapeAttr(item.thumb || item.src)}" alt="${escapeAttr(item.title)}" loading="lazy">
                        <div class="photos-card-caption">
                            <span class="photos-card-dot" style="background:${escapeAttr(color)};"></span>
                            <span class="photos-card-title">${escapeHtml(item.title)}</span>
                        </div>
                        ${featured ? `<div class="photos-card-meta">${escapeHtml(this.formatBingHomeDate(item.date))}</div>` : ''}
                    </div>
                </div>`;
        },

        bindBingHomeEvents(pageEl, items) {
            pageEl.addEventListener('click', (event) => {
                const card = event.target.closest('.photos-card');
                if (!card || !pageEl.contains(card)) return;
                const index = Number(card.dataset.index);
                if (Number.isFinite(index) && items[index]) this.openViewer(index, items);
            });
        },

        renderMessage(message, icon = 'Image') {
            return `
                <div class="photos-empty">
                    <img src="Theme/Icon/Symbol_icon/stroke/${icon}.svg" alt="">
                    <h2>${escapeHtml(message)}</h2>
                </div>`;
        },

        renderCollectionPage(pageEl, config) {
            const items = config.items || [];
            const body = config.grouped
                ? this.renderGroupedTiles(items, config.emptyText)
                : this.renderTileGrid(items, config.emptyText);
            pageEl.innerHTML = `
                <div class="photos-collection">
                    <header class="photos-page-header">
                        <div>
                            <h1>${escapeHtml(config.title)}</h1>
                            <p>${escapeHtml(config.subtitle || '')}</p>
                        </div>
                    </header>
                    ${body}
                </div>`;
            this.bindTileEvents(pageEl, items);
        },

        renderTileGrid(items, emptyText) {
            if (!items.length) return this.renderEmptyState(emptyText);
            return `<div class="photos-grid">${items.map(item => this.renderTile(item)).join('')}</div>`;
        },

        renderGroupedTiles(items, emptyText) {
            if (!items.length) return this.renderEmptyState(emptyText);
            const groups = new Map();
            items.forEach(item => {
                const key = this.monthGroupKey(item.dateMs);
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(item);
            });
            return Array.from(groups.entries()).map(([key, groupItems]) => `
                <section class="photos-month-section">
                    <h2>${escapeHtml(key)}</h2>
                    <div class="photos-grid">${groupItems.map(item => this.renderTile(item)).join('')}</div>
                </section>
            `).join('');
        },

        renderEmptyState(message) {
            return `
                <div class="photos-empty">
                    <img src="Theme/Icon/Symbol_icon/stroke/Image.svg" alt="">
                    <h2>${escapeHtml(message)}</h2>
                </div>`;
        },

        renderTile(item) {
            const fav = this.isFavorite(item);
            const meta = item.dateLabel || item.subtitle || '';
            const thumb = item.thumb || item.src || 'Theme/Icon/Symbol_icon/stroke/Image.svg';
            return `
                <button class="photos-tile" type="button" data-photo-id="${escapeAttr(item.id)}">
                    <span class="photos-tile-media">
                        <img class="photos-tile-image" src="${escapeAttr(thumb)}" alt="${escapeAttr(item.title)}" loading="lazy">
                        <span class="photos-fav-badge ${fav ? 'active' : ''}" role="button" tabindex="0" data-action="favorite" aria-label="${escapeAttr(fav ? this.tr('unfavorite') : this.tr('favorite'))}">
                            <img src="Theme/Icon/Symbol_icon/${fav ? 'fill' : 'stroke'}/Heart.svg" alt="">
                        </span>
                    </span>
                    <span class="photos-tile-title">${escapeHtml(item.title)}</span>
                    <span class="photos-tile-meta">${escapeHtml(meta)}</span>
                </button>`;
        },

        bindTileEvents(pageEl, items) {
            pageEl.querySelectorAll('.photos-tile').forEach(tile => {
                tile.addEventListener('click', (event) => {
                    const id = tile.dataset.photoId;
                    const index = items.findIndex(item => item.id === id);
                    if (event.target.closest('.photos-fav-badge')) {
                        event.preventDefault();
                        event.stopPropagation();
                        if (index >= 0) this.toggleTileFavorite(items[index], tile);
                        return;
                    }
                    if (index >= 0) this.openViewer(index, items);
                });
                tile.querySelector('.photos-fav-badge')?.addEventListener('keydown', (event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    event.stopPropagation();
                    const id = tile.dataset.photoId;
                    const index = items.findIndex(item => item.id === id);
                    if (index >= 0) this.toggleTileFavorite(items[index], tile);
                });
            });
        },

        renderSettingsPage(pageEl) {
            const settings = PhotosDataStore.getSettings();
            pageEl.innerHTML = `
                <div class="photos-settings">
                    <header class="photos-page-header">
                        <div>
                            <h1>${escapeHtml(this.tr('settings'))}</h1>
                            <p>${escapeHtml(this.tr('storageDesc'))}</p>
                        </div>
                    </header>
                    <section class="photos-settings-panel">
                        <div class="photos-setting-row">
                            <div>
                                <strong>${escapeHtml(this.tr('storageLocation'))}</strong>
                                <span>${escapeHtml(this.tr('storageDesc'))}</span>
                            </div>
                            <div class="photos-setting-control" data-control="storage"></div>
                        </div>
                        <div class="photos-setting-row">
                            <div>
                                <strong>${escapeHtml(this.tr('widgetSource'))}</strong>
                                <span>${escapeHtml(this.tr('widgetDesc'))}</span>
                            </div>
                            <div class="photos-setting-control" data-control="source"></div>
                        </div>
                        <div class="photos-actions">
                            <div data-action-host="import"></div>
                            <div data-action-host="folder"></div>
                            <div data-action-host="clear"></div>
                        </div>
                    </section>
                </div>`;

            const storageHost = pageEl.querySelector('[data-control="storage"]');
            const sourceHost = pageEl.querySelector('[data-control="source"]');
            if (storageHost && window.FluentUI && FluentUI.Select) {
                storageHost.appendChild(FluentUI.Select({
                    value: settings.storageRootId,
                    options: PhotosDataStore.rootOptions(),
                    onChange: (value) => {
                        PhotosDataStore.saveSettings({ storageRootId: value });
                        this.frame?.refresh();
                    }
                }));
            }
            if (sourceHost && window.FluentUI && FluentUI.Select) {
                sourceHost.appendChild(FluentUI.Select({
                    value: settings.widgetSource,
                    options: PhotosDataStore.sourceOptions(),
                    onChange: (value) => {
                        PhotosDataStore.saveSettings({ widgetSource: value }, { syncWidgets: true });
                    }
                }));
            }
            this.mountSettingsButton(pageEl, 'import', this.tr('importPhotos'), 'Image Upload', () => this.openImportPicker());
            this.mountSettingsButton(pageEl, 'folder', this.tr('importFolder'), 'Folder Open', () => this.openFolderPicker());
            this.mountSettingsButton(pageEl, 'clear', this.tr('clearImported'), 'Trash', () => this.confirmClearImported(), 'danger');
        },

        mountSettingsButton(pageEl, hostName, label, icon, onClick, variant = 'secondary') {
            const host = pageEl.querySelector(`[data-action-host="${hostName}"]`);
            if (!host) return;
            if (window.FluentUI && FluentUI.Button) {
                host.appendChild(FluentUI.Button({ text: label, icon, variant, onClick }));
                return;
            }
            const btn = document.createElement('button');
            btn.className = `fluent-btn fluent-btn-${variant}`;
            btn.type = 'button';
            btn.textContent = label;
            btn.addEventListener('click', onClick);
            host.appendChild(btn);
        },

        openImportPicker() {
            if (!this._importInput) {
                this._importInput = document.createElement('input');
                this._importInput.type = 'file';
                this._importInput.accept = 'image/*';
                this._importInput.multiple = true;
                this._importInput.hidden = true;
                this._importInput.addEventListener('change', () => {
                    const files = Array.from(this._importInput.files || []);
                    this._importInput.value = '';
                    this.importFiles(files);
                });
                this.container.appendChild(this._importInput);
            }
            this._importInput.click();
        },

        async openFolderPicker() {
            if (window.showDirectoryPicker) {
                try {
                    const dir = await window.showDirectoryPicker();
                    const files = await this.collectDirectoryImages(dir);
                    await this.importFiles(files);
                    return;
                } catch (err) {
                    if (err && err.name === 'AbortError') return;
                }
            }
            if (!this._folderInput) {
                this._folderInput = document.createElement('input');
                this._folderInput.type = 'file';
                this._folderInput.accept = 'image/*';
                this._folderInput.multiple = true;
                this._folderInput.webkitdirectory = true;
                this._folderInput.hidden = true;
                this._folderInput.addEventListener('change', () => {
                    const files = Array.from(this._folderInput.files || []);
                    this._folderInput.value = '';
                    this.importFiles(files);
                });
                this.container.appendChild(this._folderInput);
            }
            this._folderInput.click();
        },

        async collectDirectoryImages(directoryHandle) {
            const files = [];
            const walk = async (handle) => {
                for await (const entry of handle.values()) {
                    if (entry.kind === 'file') {
                        const file = await entry.getFile();
                        if (PhotosDataStore.isImageFile(file)) files.push(file);
                    } else if (entry.kind === 'directory') {
                        await walk(entry);
                    }
                }
            };
            await walk(directoryHandle);
            return files;
        },

        async importFiles(files) {
            const images = Array.from(files || []).filter(file => PhotosDataStore.isImageFile(file));
            if (!images.length) {
                this.toast(this.tr('importEmpty'), 'warning');
                return;
            }
            try {
                const imported = await PhotosDataStore.importFiles(images);
                this.toast(this.tr('imported', { count: imported.length }), 'success');
                if (this.frame) {
                    this.activeView = 'local';
                    this.frame.navigate('local', { preserveScroll: false });
                }
            } catch (err) {
                console.error('[PhotosApp] import failed', err);
                this.toast(this.tr('importFailed'), 'error');
            }
        },

        confirmClearImported() {
            const run = () => {
                PhotosDataStore.clearImportedPhotos();
                this.toast(this.tr('cleared'), 'success');
                if (this.frame) this.frame.refresh();
            };
            if (window.FluentUI && FluentUI.Dialog) {
                FluentUI.Dialog({
                    title: this.tr('clearImported'),
                    content: this.tr('clearConfirm'),
                    buttons: [
                        { text: this.tr('cancel'), variant: 'secondary', value: false },
                        { text: this.tr('confirm'), variant: 'danger', value: true }
                    ],
                    onClose: (confirmed) => {
                        if (confirmed === true) run();
                    }
                });
                return;
            }
            if (confirm(this.tr('clearConfirm'))) run();
        },

        searchPhotos(query) {
            const q = String(query || '').trim().toLowerCase();
            if (!q) return [];
            const all = [
                ...this.getItemsForView('bing').map(item => ({ ...item, view: 'bing' })),
                ...this.getItemsForView('local').map(item => ({ ...item, view: 'local' })),
                ...this.getItemsForView('favorites').map(item => ({ ...item, view: 'favorites' }))
            ];
            return all
                .filter(item => [item.title, item.subtitle, item.dateLabel, item.copyright, item.name]
                    .some(value => String(value || '').toLowerCase().includes(q)))
                .slice(0, 12)
                .map(item => ({
                    id: item.id,
                    title: item.title,
                    subtitle: item.view === 'bing' ? this.tr('bing') : item.view === 'favorites' ? this.tr('favorites') : this.tr('local'),
                    iconSrc: item.thumb || item.src,
                    data: { view: item.view, itemId: item.id }
                }));
        },

        openSearchResult(data) {
            const view = data.view || 'bing';
            const open = () => this.openItemById(view, data.itemId);
            if (this.frame && this.activeView !== view) {
                this.frame.navigate(view, { preserveScroll: false });
                setTimeout(open, 220);
            } else {
                open();
            }
        },

        openItemById(view, itemId) {
            const items = this.getItemsForView(view);
            const index = items.findIndex(item => item.id === itemId);
            if (index >= 0) this.openViewer(index, items);
        },

        getItemsForView(view) {
            if (view === 'bing') return this.bingImages.map((item, index) => this.itemFromBing(item, index));
            if (view === 'favorites') return PhotosDataStore.listFavoriteImages().map(({ node, src, thumb, dateMs }) => this.itemFromNode(node, 'favorite', src, dateMs, thumb));
            return PhotosDataStore.listLocalImages().map(({ node, src, thumb, dateMs }) => this.itemFromNode(node, 'local', src, dateMs, thumb));
        },

        itemFromBing(item, index) {
            const date = item.date || '';
            const title = item.title || this.tr('bing');
            return {
                id: `bing-${date || index}-${hashString(item.urlHD || item.url || index)}`,
                bingId: item.id || date || item.url,
                kind: 'bing',
                title,
                name: title,
                subtitle: item.copyright || '',
                copyright: item.copyright || '',
                date,
                dateMs: PhotosDataStore.nodeDateMs({ photoMeta: { date } }),
                dateLabel: this.formatBingDate(date),
                src: item.urlHD || item.url,
                thumb: item.url || item.urlHD,
                url: item.url,
                urlHD: item.urlHD,
                raw: item
            };
        },

        itemFromNode(node, kind = 'local', src = PhotosDataStore.resolveImageSrc(node, new Set(), { load: false }), dateMs = PhotosDataStore.nodeDateMs(node), thumb = PhotosDataStore.peekImageSrc(node)) {
            const title = node.photoMeta?.title || node.name || this.tr(kind === 'favorite' ? 'favorites' : 'local');
            return {
                id: node.id,
                nodeId: node.id,
                kind,
                title,
                name: node.name || title,
                subtitle: kind === 'favorite' ? this.tr('favorites') : this.tr('local'),
                copyright: node.photoMeta?.copyright || '',
                dateMs,
                dateLabel: this.formatDate(dateMs),
                src,
                thumb: thumb || src,
                size: node.size || 0,
                mime: node.mime || '',
                node
            };
        },

        isFavorite(item) {
            if (!item) return false;
            if (item.kind === 'favorite') return true;
            if (item.kind === 'bing') return PhotosDataStore.isBingFavorite(item);
            if (item.kind === 'local') return PhotosDataStore.isLocalFavorite(item.nodeId);
            return false;
        },

        toggleTileFavorite(item, tile) {
            if (!item || item.kind === 'favorite') return;
            const wasFavorite = this.isFavorite(item);
            if (wasFavorite) {
                PhotosDataStore.removeFavoriteForItem(item);
                this.toast(this.tr('favoriteRemove'), 'info');
            } else if (item.kind === 'bing') {
                PhotosDataStore.addBingFavorite(item);
                this.toast(this.tr('favoriteAdd'), 'success');
            } else if (item.kind === 'local') {
                PhotosDataStore.addLocalFavorite(item.nodeId);
                this.toast(this.tr('favoriteAdd'), 'success');
            }
            const isNowFavorite = this.isFavorite(item);
            const badge = tile?.querySelector('.photos-fav-badge');
            const icon = badge?.querySelector('img');
            if (badge) {
                badge.classList.toggle('active', isNowFavorite);
                badge.setAttribute('aria-label', isNowFavorite ? this.tr('unfavorite') : this.tr('favorite'));
            }
            if (icon) icon.src = `Theme/Icon/Symbol_icon/${isNowFavorite ? 'fill' : 'stroke'}/Heart.svg`;
            this.frame?.refresh();
        },

        async fetchBingWallpapers(force = false) {
            if (this.bingLoading && !force) return;
            this.bingLoading = true;
            this.bingError = false;
            if (this.frame && this.activeView === 'bing') this.frame.refresh();
            try {
                const count = 10;
                let images = [];
                const loaders = [
                    () => this.fetchBingBiturl(count)
                ];
                let lastError = null;
                for (const load of loaders) {
                    try {
                        images = await load();
                        if (images.length) break;
                    } catch (err) {
                        lastError = err;
                    }
                }
                if (!images.length) throw lastError || new Error('No Bing images');
                this.bingImages = images;
                PhotosDataStore.writeBingCache(images);
            } catch (err) {
                console.error('[PhotosApp] Bing fetch failed', err);
                this.bingError = true;
            } finally {
                this.bingLoading = false;
                if (this.frame && this.activeView === 'bing') this.frame.refresh();
            }
        },

        normalizeBingWallpaper(item, index = 0) {
            if (!item) return null;
            const rawUrl = item.url || item.urlbase;
            const url = item.url
                ? (/^https?:\/\//i.test(item.url) ? item.url : `https://www.bing.com${item.url}`)
                : (item.urlbase ? `https://www.bing.com${item.urlbase}_1920x1080.jpg` : rawUrl);
            if (!url || !/^https?:\/\//i.test(url)) return null;
            const urlHD = item.urlbase ? `https://www.bing.com${item.urlbase}_UHD.jpg` : url.replace(/1920x1080/g, 'UHD');
            const title = (item.copyright || item.title || '').split(/[\uFF08(]/)[0].trim();
            return {
                ...item,
                id: item.hsh || item.startdate || item.enddate || url,
                url,
                urlHD,
                title: title || `${this.tr('bing')} ${index + 1}`,
                copyright: item.copyright || item.title || '',
                date: item.startdate || item.start_date || item.enddate || '',
                copyrightlink: item.copyrightlink || item.copyright_link || ''
            };
        },

        async fetchBingBiturl(count = 10) {
            const promises = [];
            for (let i = 0; i < count; i += 1) {
                const url = `https://bing.biturl.top/?resolution=1920&format=json&index=${i}&mkt=zh-CN`;
                promises.push(fetch(url).then(res => res.ok ? res.json() : null).catch(() => null));
            }
            const results = await Promise.all(promises);
            return results.map((item, index) => this.normalizeBingWallpaper(item, index)).filter(Boolean);
        },

        ensureViewer() {
            if (!this.container) return;
            let viewer = this.container.querySelector('.photos-viewer');
            if (viewer) return;
            viewer = document.createElement('div');
            viewer.className = 'photos-viewer';
            viewer.style.display = 'none';
            viewer.innerHTML = `
                <div class="photos-canvas-wrap">
                    <img class="photos-main-img" src="" alt="" draggable="false">
                </div>
                ${this.renderToolbar()}
                <div class="photos-adjust-panel" style="display:none;">
                    <div class="photos-adjust-title">${escapeHtml(this.i18n('photos.adjust-title', this.tr('adjust')))}</div>
                    <div class="photos-adjust-item">
                        <label>${escapeHtml(this.tr('brightness'))}</label>
                        <input type="range" min="0" max="200" value="100" data-adj="brightness">
                        <span class="photos-adj-val">100%</span>
                    </div>
                    <div class="photos-adjust-item">
                        <label>${escapeHtml(this.tr('contrast'))}</label>
                        <input type="range" min="0" max="200" value="100" data-adj="contrast">
                        <span class="photos-adj-val">100%</span>
                    </div>
                    <div class="photos-adjust-item">
                        <label>${escapeHtml(this.tr('saturation'))}</label>
                        <input type="range" min="0" max="200" value="100" data-adj="saturate">
                        <span class="photos-adj-val">100%</span>
                    </div>
                </div>
                <div class="photos-info-panel" style="display:none;"></div>
                <div class="photos-wallpaper-menu" style="display:none;">
                    <button class="photos-wpmenu-item" data-wp-action="desktop" type="button">
                        <img src="Theme/Icon/Symbol_icon/stroke/Television.svg" alt="">
                        <span>${escapeHtml(this.i18n('photos.set-desktop', this.tr('setDesktop')))}</span>
                    </button>
                    <button class="photos-wpmenu-item" data-wp-action="lock" type="button">
                        <img src="Theme/Icon/Symbol_icon/stroke/Lock.svg" alt="">
                        <span>${escapeHtml(this.i18n('photos.set-lock', this.tr('setLock')))}</span>
                    </button>
                </div>
                <button class="photos-back-btn" type="button">
                    <img src="Theme/Icon/Symbol_icon/stroke/Arrow Left.svg" alt="">
                    <span>${escapeHtml(this.i18n('photos.back', this.tr('back')))}</span>
                </button>
                <div class="photos-counter"></div>`;
            this.container.appendChild(viewer);
            this.bindViewerEvents(viewer);
        },

        i18n(key, fallback = '') {
            return typeof t === 'function' ? t(key) : fallback;
        },

        getToolbarButtons() {
            return [
                { id: 'prev', icon: 'Chevron Left', label: this.i18n('photos.prev', this.tr('prev')), action: 'prevImage' },
                { id: 'next', icon: 'Chevron Right', label: this.i18n('photos.next', this.tr('next')), action: 'nextImage' },
                { id: 'zoom-in', icon: 'Zoom In', label: this.i18n('photos.zoom-in', this.tr('zoomIn')), action: 'zoomIn' },
                { id: 'zoom-out', icon: 'Zoom Out', label: this.i18n('photos.zoom-out', this.tr('zoomOut')), action: 'zoomOut' },
                { id: 'rotate-left', icon: 'Refresh Reverse', label: this.i18n('photos.rotate-left', this.tr('rotateLeft')), action: 'rotateLeft' },
                { id: 'rotate-right', icon: 'Refresh', label: this.i18n('photos.rotate-right', this.tr('rotateRight')), action: 'rotateRight' },
                { id: 'flip-h', icon: 'Exchange A', label: this.i18n('photos.flip-h', this.tr('flipH')), action: 'flipHorizontal' },
                { id: 'flip-v', icon: 'Exchange B', label: this.i18n('photos.flip-v', this.tr('flipV')), action: 'flipVertical' },
                { id: 'adjust', icon: 'Color Swatch', label: this.i18n('photos.adjust', this.tr('adjust')), action: 'toggleAdjustPanel' },
                { id: 'reset', icon: 'Reload', label: this.i18n('photos.reset', this.tr('reset')), action: 'resetAll' },
                { id: 'fullscreen', icon: 'Maximize', label: this.i18n('photos.fullscreen', this.tr('fullscreen')), action: 'toggleFullscreen' },
                { id: 'download', icon: 'Download', label: this.i18n('photos.download', this.tr('download')), action: 'downloadImage' },
                { id: 'favorite', icon: 'Heart', label: this.tr('favorite'), action: 'toggleFavoriteCurrent' },
                { id: 'wallpaper', icon: 'Television Upload', label: this.i18n('photos.wallpaper', this.tr('wallpaper')), action: 'toggleWallpaperMenu' },
                { id: 'info', icon: 'Information Circle', label: this.i18n('photos.info', this.tr('info')), action: 'toggleInfo' }
            ];
        },

        renderToolbar() {
            const isV2 = document.body.classList.contains('fluent-v2');
            const cls = isV2 ? 'photos-toolbar photos-toolbar-v2' : 'photos-toolbar photos-toolbar-classic';
            return `<div class="${cls}">
                ${this.getToolbarButtons().map(btn => `
                    <button class="photos-tool-btn" type="button" data-action="${btn.action}" data-icon="${escapeAttr(btn.icon)}" data-tooltip="${escapeAttr(btn.label)}" aria-label="${escapeAttr(btn.label)}">
                        <img src="Theme/Icon/Symbol_icon/stroke/${btn.icon}.svg" alt="${escapeAttr(btn.label)}">
                        <span class="photos-tool-tooltip">${escapeHtml(btn.label)}</span>
                    </button>
                `).join('')}
            </div>`;
        },

        fillIcons: ['Zoom In', 'Zoom Out', 'Color Swatch', 'Information Circle', 'Television Upload'],

        animateIcon(btn) {
            const img = btn?.querySelector('img');
            const iconName = btn?.dataset?.icon;
            if (!img || !iconName) return;
            const hasFill = this.fillIcons.includes(iconName);
            img.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
            if (hasFill) {
                img.src = `Theme/Icon/Symbol_icon/fill/${iconName}.svg`;
                img.style.transform = 'scale(0.85)';
                setTimeout(() => { img.style.transform = 'scale(1)'; }, 150);
                setTimeout(() => { img.src = `Theme/Icon/Symbol_icon/stroke/${iconName}.svg`; }, 400);
                return;
            }
            img.style.transform = 'scale(0.75)';
            img.style.opacity = '0.5';
            setTimeout(() => {
                img.style.transform = 'scale(1.1)';
                img.style.opacity = '1';
            }, 120);
            setTimeout(() => { img.style.transform = 'scale(1)'; }, 250);
        },

        bindViewerEvents(viewer) {
            viewer.querySelector('.photos-back-btn')?.addEventListener('click', () => this.closeViewer());
            viewer.querySelectorAll('.photos-tool-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.dataset.action;
                    if (action && typeof this[action] === 'function') {
                        this.animateIcon(btn);
                        this[action]();
                    }
                });
            });
            viewer.querySelectorAll('.photos-wpmenu-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (btn.dataset.wpAction === 'desktop') this.setAsDesktopWallpaper();
                    else this.setAsLockWallpaper();
                });
            });
            viewer.querySelectorAll('.photos-adjust-item input').forEach(input => {
                input.addEventListener('input', () => {
                    const key = input.dataset.adj;
                    const value = parseInt(input.value, 10);
                    this.adjustments[key] = value;
                    const label = input.closest('.photos-adjust-item')?.querySelector('.photos-adj-val');
                    if (label) label.textContent = `${value}%`;
                    this.applyTransform(false);
                });
            });
            viewer.addEventListener('click', (event) => {
                if (!event.target.closest('.photos-canvas-wrap') || event.target.closest('.photos-tool-btn')) return;
                this.hidePanels();
            });
            const canvas = viewer.querySelector('.photos-canvas-wrap');
            canvas?.addEventListener('wheel', (event) => {
                event.preventDefault();
                this.zoom = Math.max(0.1, Math.min(10, this.zoom * (event.deltaY > 0 ? 0.9 : 1.1)));
                this.applyTransform(false);
                this.updateInfoPanel();
            }, { passive: false });
            canvas?.addEventListener('mousedown', (event) => {
                if (event.button !== 0) return;
                this.isPanning = true;
                this.panStart = { x: event.clientX - this.panX, y: event.clientY - this.panY };
                canvas.style.cursor = 'grabbing';
            });
            window.addEventListener('mousemove', (event) => {
                if (!this.isPanning) return;
                this.panX = event.clientX - this.panStart.x;
                this.panY = event.clientY - this.panStart.y;
                this.applyTransform(false);
            });
            window.addEventListener('mouseup', () => {
                if (!this.isPanning) return;
                this.isPanning = false;
                canvas.style.cursor = '';
            });
        },

        async openViewer(index, items) {
            this.viewerItems = Array.isArray(items) ? [...items] : this.getItemsForView(this.activeView);
            this.currentIndex = Math.max(0, Math.min(index, this.viewerItems.length - 1));
            if (!this.viewerItems.length) return;
            const motionId = this.beginViewerMotion();
            this.resetTransform();
            const frame = this.container.querySelector('.fw-frame');
            const viewer = this.container.querySelector('.photos-viewer');
            const img = viewer?.querySelector('.photos-main-img');
            let item = this.viewerItems[this.currentIndex];
            if (!viewer || !img || !item) return;
            if (!item.src) {
                const src = await this.ensureItemSrc(item);
                if (this._viewerMotionId !== motionId) return;
                if (!src) {
                    this.finishViewerMotion(motionId);
                    return;
                }
                item = { ...item, src, thumb: item.thumb || src };
                this.viewerItems[this.currentIndex] = item;
            }
            const tileImg = this.findTileImage(item.id);
            const fromRect = tileImg ? this.rectInContainer(tileImg.getBoundingClientRect()) : null;
            const sourceRadius = this.getTileImageRadius(tileImg);
            img.src = item.src;
            img.alt = item.title;
            this.updateViewerChrome();
            viewer.style.display = 'flex';
            img.style.opacity = '0';
            this.setViewerChromeOpacity(viewer, 0);
            this.applyTransform();

            const toRect = this.getViewerImageRect(img, tileImg);
            if (!this.canUseViewerMotion(fromRect, toRect)) {
                if (frame) frame.style.visibility = 'hidden';
                viewer.style.opacity = '1';
                img.style.opacity = '1';
                this.setViewerChromeOpacity(viewer, 1);
                this.finishViewerMotion(motionId);
                return;
            }

            viewer.style.opacity = '0';
            this.playViewerPhotoMotion({
                item,
                fromRect,
                toRect,
                fromRadius: sourceRadius,
                toRadius: '0px',
                viewer,
                direction: 'open'
            }).then(() => {
                if (this._viewerMotionId !== motionId) return;
                if (frame) frame.style.visibility = 'hidden';
                viewer.style.opacity = '1';
                img.style.opacity = '1';
                this.setViewerChromeOpacity(viewer, 1);
                this.finishViewerMotion(motionId);
            }).catch(() => {
                if (this._viewerMotionId !== motionId) return;
                if (frame) frame.style.visibility = 'hidden';
                viewer.style.opacity = '1';
                img.style.opacity = '1';
                this.setViewerChromeOpacity(viewer, 1);
                this.finishViewerMotion(motionId);
            });
        },

        closeViewer() {
            const motionId = this.beginViewerMotion();
            const viewer = this.container?.querySelector('.photos-viewer');
            const frame = this.container?.querySelector('.fw-frame');
            const img = viewer?.querySelector('.photos-main-img');
            if (!viewer || viewer.style.display === 'none') return;
            this.hidePanels();
            const item = this.viewerItems[this.currentIndex];
            if (frame) {
                frame.style.display = '';
                frame.style.visibility = '';
            }
            const tileImg = item ? this.findTileImage(item.id) : null;
            const fromRect = img ? this.rectInContainer(img.getBoundingClientRect()) : null;
            const toRect = tileImg ? this.rectInContainer(tileImg.getBoundingClientRect()) : null;
            if (!item || !this.canUseViewerMotion(fromRect, toRect)) {
                viewer.style.display = 'none';
                viewer.style.opacity = '1';
                if (img) img.style.opacity = '1';
                this.setViewerChromeOpacity(viewer, 1);
                this.finishViewerMotion(motionId);
                return;
            }

            img.style.opacity = '0';
            this.setViewerChromeOpacity(viewer, 0);
            this.playViewerPhotoMotion({
                item,
                fromRect,
                toRect,
                fromRadius: '0px',
                toRadius: this.getTileImageRadius(tileImg),
                viewer,
                direction: 'close'
            }).then(() => {
                if (this._viewerMotionId !== motionId) return;
                viewer.style.display = 'none';
                viewer.style.opacity = '1';
                img.style.opacity = '1';
                this.setViewerChromeOpacity(viewer, 1);
                this.finishViewerMotion(motionId);
            }).catch(() => {
                if (this._viewerMotionId !== motionId) return;
                viewer.style.display = 'none';
                viewer.style.opacity = '1';
                img.style.opacity = '1';
                this.setViewerChromeOpacity(viewer, 1);
                this.finishViewerMotion(motionId);
            });
        },

        beginViewerMotion() {
            this._viewerMotionId += 1;
            this.cancelViewerMotion();
            return this._viewerMotionId;
        },

        finishViewerMotion(motionId) {
            if (this._viewerMotionId !== motionId) return;
            this._viewerMotion = null;
        },

        cancelViewerMotion() {
            if (this._viewerMotion) {
                this._viewerMotion.animations.forEach(animation => {
                    try { animation.cancel(); } catch (_) {}
                });
                this._viewerMotion.clones.forEach(clone => clone.remove());
                this._viewerMotion = null;
            }
            this.container?.querySelectorAll('.photos-hero-clone').forEach(clone => clone.remove());
        },

        canUseViewerMotion(fromRect, toRect) {
            if (!this.container || !fromRect || !toRect) return false;
            if (typeof Element === 'undefined' || typeof Element.prototype.animate !== 'function') return false;
            if (typeof State !== 'undefined' && State.settings?.enableAnimation === false) return false;
            if (document.body?.classList?.contains('animations-disabled')) return false;
            if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
            return [fromRect, toRect].every(rect =>
                Number.isFinite(rect.left) &&
                Number.isFinite(rect.top) &&
                rect.width > 1 &&
                rect.height > 1
            );
        },

        rectInContainer(rect) {
            const containerRect = this.container?.getBoundingClientRect();
            if (!containerRect || !rect) return null;
            return {
                left: rect.left - containerRect.left,
                top: rect.top - containerRect.top,
                width: rect.width,
                height: rect.height
            };
        },

        getViewerImageRect(img, sourceImg) {
            const canvas = this.container?.querySelector('.photos-canvas-wrap');
            const canvasRect = canvas?.getBoundingClientRect();
            const containerRect = this.container?.getBoundingClientRect();
            if (!canvasRect || !containerRect) return null;
            const imgRect = img?.getBoundingClientRect();
            if (imgRect && imgRect.width > 1 && imgRect.height > 1) return this.rectInContainer(imgRect);

            const naturalWidth = img?.naturalWidth || sourceImg?.naturalWidth || 16;
            const naturalHeight = img?.naturalHeight || sourceImg?.naturalHeight || 9;
            const aspect = Math.max(naturalWidth, 1) / Math.max(naturalHeight, 1);
            const canvasAspect = canvasRect.width / Math.max(canvasRect.height, 1);
            let width = canvasRect.width;
            let height = canvasRect.height;
            if (canvasAspect > aspect) {
                width = height * aspect;
            } else {
                height = width / aspect;
            }
            return {
                left: canvasRect.left - containerRect.left + (canvasRect.width - width) / 2,
                top: canvasRect.top - containerRect.top + (canvasRect.height - height) / 2,
                width,
                height
            };
        },

        getTileImageRadius(tileImg) {
            const tile = tileImg?.closest?.('.photos-card, .photos-tile-media, .photos-tile');
            const radius = tile ? getComputedStyle(tile).borderRadius : '';
            return radius || '12px';
        },

        setViewerChromeOpacity(viewer, opacity) {
            if (!viewer) return;
            viewer.querySelectorAll('.photos-back-btn, .photos-counter, .photos-toolbar').forEach(el => {
                el.style.opacity = String(opacity);
                el.style.pointerEvents = opacity ? '' : 'none';
            });
        },

        playViewerPhotoMotion({ item, fromRect, toRect, fromRadius, toRadius, viewer, direction }) {
            const clone = document.createElement('div');
            clone.className = 'photos-hero-clone';
            clone.style.backgroundImage = `url("${String(item.thumb || item.src || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`;
            this.container.appendChild(clone);
            this.paintPhotoClone(clone, fromRect, fromRadius);

            const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';
            const duration = direction === 'close' ? 500 : 560;
            const cloneAnimation = clone.animate([
                this.photoMotionFrame(fromRect, fromRadius),
                this.photoMotionFrame(toRect, toRadius)
            ], {
                duration,
                easing: ease,
                fill: 'forwards'
            });
            const shadeAnimation = viewer.animate([
                { opacity: direction === 'close' ? 1 : 0 },
                { opacity: direction === 'close' ? 0 : 1 }
            ], {
                duration: direction === 'close' ? 300 : 260,
                easing: direction === 'close' ? 'cubic-bezier(0.4, 0, 1, 1)' : 'cubic-bezier(0.16, 1, 0.3, 1)',
                fill: 'forwards'
            });

            const motion = { animations: [cloneAnimation, shadeAnimation], clones: [clone] };
            this._viewerMotion = motion;
            return Promise.allSettled([cloneAnimation.finished, shadeAnimation.finished]).then(() => {
                if (this._viewerMotion === motion) {
                    viewer.style.opacity = direction === 'close' ? '0' : '1';
                    cloneAnimation.cancel();
                    shadeAnimation.cancel();
                    this.paintPhotoClone(clone, toRect, toRadius);
                }
                clone.remove();
            });
        },

        photoMotionFrame(rect, radius) {
            return {
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                borderRadius: radius || '0px',
                opacity: 1
            };
        },

        paintPhotoClone(clone, rect, radius) {
            Object.assign(clone.style, this.photoMotionFrame(rect, radius));
        },

        findTileImage(id) {
            const tiles = Array.from(this.container?.querySelectorAll('.photos-card, .photos-tile') || []);
            const tile = tiles.find(el => el.dataset.photoId === id);
            return tile?.querySelector('img, .photos-tile-image') || null;
        },

        updateViewerChrome() {
            const viewer = this.container?.querySelector('.photos-viewer');
            const item = this.viewerItems[this.currentIndex];
            if (!viewer || !item) return;
            const counter = viewer.querySelector('.photos-counter');
            if (counter) counter.textContent = `${this.currentIndex + 1}/ ${this.viewerItems.length}`;
            const favBtn = viewer.querySelector('[data-action="toggleFavoriteCurrent"]');
            const favIcon = favBtn?.querySelector('img');
            const favTip = favBtn?.querySelector('.photos-tool-tooltip');
            const favorite = this.isFavorite(item);
            if (favBtn) {
                const label = favorite ? this.tr('unfavorite') : this.tr('favorite');
                favBtn.classList.toggle('active', favorite);
                favBtn.dataset.tooltip = label;
                favBtn.setAttribute('aria-pressed', favorite ? 'true' : 'false');
                favBtn.setAttribute('aria-label', label);
                if (favTip) favTip.textContent = label;
            }
            if (favIcon) favIcon.src = `Theme/Icon/Symbol_icon/${favorite ? 'fill' : 'stroke'}/Heart.svg`;
            this.updateInfoPanel();
        },

        async updateViewerImage() {
            let item = this.viewerItems[this.currentIndex];
            const img = this.container?.querySelector('.photos-main-img');
            if (!item || !img) return;
            if (!item.src) {
                const src = await this.ensureItemSrc(item);
                if (!src) return;
                item = { ...item, src, thumb: item.thumb || src };
                this.viewerItems[this.currentIndex] = item;
            }
            this.resetTransform();
            img.src = item.src;
            img.alt = item.title;
            this.updateViewerChrome();
            this.applyTransform();
        },

        async ensureItemSrc(item) {
            if (!item) return '';
            if (item.src) return item.src;
            const node = item.node || (item.nodeId && typeof State !== 'undefined' && State.findNode ? State.findNode(item.nodeId) : null);
            let src = PhotosDataStore.resolveImageSrc(node, new Set(), { load: false });
            if (src) return src;
            let target = node;
            if (node?.encoding === 'photos-ref' && typeof State !== 'undefined' && State.findNode) {
                target = State.findNode(node.refId || node.content);
            }
            const id = PhotosDataStore.localCacheIdForNode(target);
            if (id) src = await PhotosDataStore.loadLocalImage(id);
            return src || PhotosDataStore.resolveImageSrc(target, new Set(), { load: false }) || '';
        },

        prevImage() {
            if (this.currentIndex > 0) {
                this.currentIndex -= 1;
                this.updateViewerImage();
            }
        },

        nextImage() {
            if (this.currentIndex < this.viewerItems.length - 1) {
                this.currentIndex += 1;
                this.updateViewerImage();
            }
        },

        zoomIn() {
            this.zoom = Math.min(this.zoom * 1.25, 10);
            this.applyTransform();
            this.updateInfoPanel();
        },

        zoomOut() {
            this.zoom = Math.max(this.zoom / 1.25, 0.1);
            this.applyTransform();
            this.updateInfoPanel();
        },

        rotateLeft() {
            this.rotation = (this.rotation - 90) % 360;
            this.applyTransform();
            this.updateInfoPanel();
        },

        rotateRight() {
            this.rotation = (this.rotation + 90) % 360;
            this.applyTransform();
            this.updateInfoPanel();
        },

        flipHorizontal() {
            this.flipH = !this.flipH;
            this.applyTransform();
        },

        flipVertical() {
            this.flipV = !this.flipV;
            this.applyTransform();
        },

        resetAll() {
            this.resetTransform();
            this.applyTransform();
            this.updateInfoPanel();
        },

        resetTransform() {
            this.zoom = 1;
            this.panX = 0;
            this.panY = 0;
            this.rotation = 0;
            this.flipH = false;
            this.flipV = false;
            this.adjustments = { brightness: 100, contrast: 100, saturate: 100 };
            this.container?.querySelectorAll('.photos-adjust-item input').forEach(input => {
                input.value = '100';
                const label = input.closest('.photos-adjust-item')?.querySelector('.photos-adj-val');
                if (label) label.textContent = '100%';
            });
        },

        applyTransform(smooth = true) {
            const img = this.container?.querySelector('.photos-main-img');
            if (!img) return;
            const scaleX = this.flipH ? -this.zoom : this.zoom;
            const scaleY = this.flipV ? -this.zoom : this.zoom;
            img.style.transition = smooth ? 'transform 0.35s cubic-bezier(0.4,0,0.2,1), filter 0.3s ease' : 'none';
            img.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${scaleX}, ${scaleY}) rotate(${this.rotation}deg)`;
            img.style.filter = `brightness(${this.adjustments.brightness}%) contrast(${this.adjustments.contrast}%) saturate(${this.adjustments.saturate}%)`;
            this.updateInfoPanel();
        },

        toggleAdjustPanel() {
            this._togglePanel('.photos-adjust-panel');
        },

        toggleInfo() {
            this._togglePanel('.photos-info-panel');
        },

        toggleInfoPanel() {
            this.toggleInfo();
        },

        toggleWallpaperMenu() {
            this._togglePanel('.photos-wallpaper-menu');
        },

        toggleWallpaperPanel() {
            this.toggleWallpaperMenu();
        },

        _togglePanel(selector) {
            const panel = this.container?.querySelector(selector);
            if (!panel) return;
            const visible = panel.classList.contains('photos-panel-visible');
            if (visible) {
                panel.classList.remove('photos-panel-visible');
                setTimeout(() => { panel.style.display = 'none'; }, 250);
                return;
            }
            this.hidePanels(selector);
            panel.style.display = 'flex';
            requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('photos-panel-visible')));
        },

        hidePanels(except) {
            ['.photos-adjust-panel', '.photos-info-panel', '.photos-wallpaper-menu'].forEach(selector => {
                if (selector === except) return;
                const panel = this.container?.querySelector(selector);
                if (!panel) return;
                panel.classList.remove('photos-panel-visible');
                setTimeout(() => {
                    if (!panel.classList.contains('photos-panel-visible')) panel.style.display = 'none';
                }, 250);
            });
        },

        updateInfoPanel() {
            const panel = this.container?.querySelector('.photos-info-panel');
            const item = this.viewerItems[this.currentIndex];
            if (!panel || !item) return;
            panel.innerHTML = `
                <div class="photos-info-title">${escapeHtml(item.title)}</div>
                <div class="photos-info-row"><span>${escapeHtml(this.i18n('photos.info-date', this.tr('infoDate')))}</span><span>${escapeHtml(item.kind === 'bing' ? this.formatBingHomeDate(item.date) : item.dateLabel || '')}</span></div>
                <div class="photos-info-row"><span>${escapeHtml(this.i18n('photos.info-copyright', this.tr('infoCopyright')))}</span><span>${escapeHtml(item.copyright || item.subtitle || '')}</span></div>
                <div class="photos-info-row"><span>${escapeHtml(this.i18n('photos.info-zoom', 'Zoom'))}</span><span>${Math.round(this.zoom * 100)}%</span></div>
                <div class="photos-info-row"><span>${escapeHtml(this.i18n('photos.info-rotate', 'Rotate'))}</span><span>${this.rotation}\u00b0</span></div>
            `;
        },

        toggleFavoriteCurrent() {
            const item = this.viewerItems[this.currentIndex];
            if (!item) return;
            if (this.isFavorite(item)) {
                PhotosDataStore.removeFavoriteForItem(item);
                this.toast(this.tr('favoriteRemove'), 'info');
                if (item.kind === 'favorite') {
                    this.viewerItems.splice(this.currentIndex, 1);
                    if (!this.viewerItems.length) {
                        this.closeViewer();
                        this.frame?.refresh();
                        return;
                    }
                    this.currentIndex = Math.min(this.currentIndex, this.viewerItems.length - 1);
                    this.updateViewerImage();
                }
            } else if (item.kind === 'bing') {
                PhotosDataStore.addBingFavorite(item);
                this.toast(this.tr('favoriteAdd'), 'success');
            } else if (item.kind === 'local') {
                PhotosDataStore.addLocalFavorite(item.nodeId);
                this.toast(this.tr('favoriteAdd'), 'success');
            }
            this.updateViewerChrome();
            this.frame?.refresh();
        },

        setAsDesktopWallpaper() {
            const item = this.viewerItems[this.currentIndex];
            if (!item || !item.src || typeof State === 'undefined') return;
            State.updateSettings({ wallpaperDesktop: item.src });
            if (typeof Desktop !== 'undefined' && Desktop.updateWallpaper) Desktop.updateWallpaper();
            this.toast(this.tr('desktopSet'), 'success');
            this.hidePanels();
        },

        setAsLockWallpaper() {
            const item = this.viewerItems[this.currentIndex];
            if (!item || !item.src || typeof State === 'undefined') return;
            State.updateSettings({ wallpaperLock: item.src });
            if (typeof LockScreen !== 'undefined' && LockScreen.updateWallpaper) LockScreen.updateWallpaper();
            this.toast(this.tr('lockSet'), 'success');
            this.hidePanels();
        },

        toggleFullscreen() {
            const viewer = this.container?.querySelector('.photos-viewer');
            if (!viewer) return;
            viewer.classList.toggle('photos-fullscreen');
        },

        downloadImage() {
            const item = this.viewerItems[this.currentIndex];
            if (!item || !item.src) return;
            const link = document.createElement('a');
            link.href = item.src;
            link.download = safeImageName(item.name || `${item.title || 'photo'}.jpg`);
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.click();
        },

        monthGroupKey(ms) {
            const date = new Date(ms || Date.now());
            if (isEn()) {
                return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            }
            return `${date.getFullYear()}\u5e74 ${date.getMonth() + 1}\u6708`;
        },

        formatDate(ms) {
            const date = new Date(ms || Date.now());
            if (!Number.isFinite(date.getTime())) return '';
            return isEn()
                ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        },

        formatBingDate(dateStr) {
            const date = dateFromAny(dateStr);
            return date ? this.formatDate(date.getTime()) : String(dateStr || '');
        },

        formatBingHomeDate(dateStr) {
            const raw = String(dateStr || '');
            if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
            const date = dateFromAny(raw);
            return date ? this.formatDate(date.getTime()) : raw;
        },

        toast(message, type = 'info') {
            if (window.FluentUI && FluentUI.Toast) {
                FluentUI.Toast({ title: this.tr('bing'), message, type });
            } else if (typeof State !== 'undefined' && State.addNotification) {
                State.addNotification({ title: this.tr('bing'), message, type });
            }
        },

        addStyles() {
            const old = document.getElementById('photos-app-styles');
            if (old) old.remove();
            const style = document.createElement('style');
            style.id = 'photos-app-styles';
            style.textContent = this.getCSS();
            document.head.appendChild(style);
        },

        getCSS() {
            return `
                .window[data-app-id="photos"] .window-content.photos-app { display: flex; flex-direction: column; height: 100%; background: var(--bg-primary); overflow: hidden; position: relative; }
                .photos-app .fw-frame { flex: 1; min-height: 0; }
                .photos-app *::-webkit-scrollbar { width: 6px; height: 6px; }
                .photos-app *::-webkit-scrollbar-track { background: transparent; }
                .photos-app *::-webkit-scrollbar-thumb { background: var(--text-tertiary); border-radius: 3px; }
                .photos-app *::-webkit-scrollbar-thumb:hover { background: var(--text-secondary); }
                .photos-app * { scrollbar-width: thin; scrollbar-color: var(--text-tertiary) transparent; }
                .photos-page { min-height: 100%; box-sizing: border-box; color: var(--text-primary); }
                .photos-collection,
                .photos-settings { min-height: 100%; box-sizing: border-box; padding: 26px; }
                .photos-gallery { flex: 1; min-height: 100%; overflow-y: auto; padding: 0; }
                .photos-home { padding: 0 0 32px; }
                .photos-home-header { text-align: center; padding: 48px 32px 12px; }
                .photos-greeting { margin: 0; font-size: 42px; font-weight: 300; color: var(--text-primary); letter-spacing: -0.5px; }
                .photos-date { margin: 6px 0 0; font-size: 16px; color: var(--text-secondary); font-weight: 400; }
                .photos-search-bar { display: flex; align-items: center; gap: 10px; max-width: 520px; margin: 20px auto 36px; padding: 10px 18px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 24px; transition: box-shadow 0.2s, border-color 0.2s; }
                .photos-search-bar:hover,
                .photos-search-bar:focus-within { border-color: var(--accent); box-shadow: 0 2px 12px rgba(0,120,212,0.08); }
                .photos-search-active { border-color: var(--accent); box-shadow: 0 2px 12px rgba(0,120,212,0.12); }
                .photos-search-icon { width: 16px; height: 16px; opacity: 0.5; flex-shrink: 0; }
                .dark-mode .photos-search-icon { filter: brightness(0) invert(1); }
                .photos-search-input { flex: 1; border: none; background: transparent; outline: none; font-size: 14px; color: var(--text-primary); cursor: text; }
                .photos-search-input::placeholder { color: var(--text-tertiary); }
                .photos-search-clear { width: 16px; height: 16px; opacity: 0.4; cursor: pointer; flex-shrink: 0; transition: opacity 0.15s; }
                .photos-search-clear:hover { opacity: 0.8; }
                .dark-mode .photos-search-clear { filter: brightness(0) invert(1); }
                .photos-no-result { text-align: center; padding: 60px 20px; color: var(--text-secondary); font-size: 14px; }
                .photos-cards-container { display: flex; flex-direction: column; gap: 16px; padding: 0 32px; max-width: 1200px; margin: 0 auto; }
                .photos-card { cursor: pointer; border-radius: 12px; overflow: hidden; background: var(--bg-secondary); box-shadow: 0 1px 4px rgba(0,0,0,0.06); transition: transform 0.2s, box-shadow 0.2s; }
                .photos-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
                .dark-mode .photos-card { box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
                .dark-mode .photos-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.35); }
                .photos-card-inner { position: relative; }
                .photos-card-inner > img { width: 100%; display: block; object-fit: cover; }
                .photos-card-featured { max-width: 100%; }
                .photos-card-featured .photos-card-inner > img { aspect-ratio: 2 / 1; }
                .photos-card-meta { position: absolute; top: 12px; right: 12px; padding: 3px 10px; background: rgba(0,0,0,0.45); backdrop-filter: blur(6px); color: #fff; border-radius: 10px; font-size: 11px; }
                .photos-card-caption { display: flex; align-items: center; gap: 8px; padding: 10px 14px; }
                .photos-card-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
                .photos-card-title { font-size: 13px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .photos-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
                .photos-card-small .photos-card-inner > img { aspect-ratio: 16 / 10; }
                .photos-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100%; gap: 16px; color: var(--text-secondary); }
                .photos-spinner { width: 32px; height: 32px; border: 3px solid var(--border-color); border-top-color: var(--accent); border-radius: 50%; animation: photos-spin 0.8s linear infinite; }
                @keyframes photos-spin { to { transform: rotate(360deg); } }
                .photos-error { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100%; gap: 12px; color: var(--text-secondary); }
                .photos-error img { width: 48px; height: 48px; opacity: 0.4; }
                .photos-error h3 { margin: 0; font-size: 18px; }
                .photos-error p { margin: 0; font-size: 13px; }
                .photos-retry-btn { padding: 8px 24px; background: var(--accent); color: #fff; border: none; border-radius: 20px; cursor: pointer; font-size: 13px; }
                .photos-retry-btn:hover { opacity: 0.9; }
                .photos-page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; margin-bottom: 22px; }
                .photos-page-header h1 { margin: 0; font-size: 28px; line-height: 1.15; font-weight: 650; letter-spacing: 0; }
                .photos-page-header p { margin: 6px 0 0; color: var(--text-secondary); font-size: 13px; }
                .photos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(126px, 1fr)); gap: 14px; align-items: start; }
                .photos-month-section { margin-top: 26px; }
                .photos-month-section:first-child { margin-top: 0; }
                .photos-month-section h2 { margin: 0 0 14px; font-size: 18px; font-weight: 650; letter-spacing: 0; color: var(--text-primary); }
                .photos-tile { min-width: 0; display: grid; gap: 8px; padding: 0 0 8px; border: 0; border-radius: 12px; background: rgba(255,255,255,0.34); color: inherit; text-align: left; cursor: pointer; overflow: hidden; transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1), background 160ms ease, box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1); }
                .dark-mode .photos-tile { background: rgba(255,255,255,0.08); }
                .photos-tile:hover { transform: translateY(-3px); background: rgba(255,255,255,0.55); box-shadow: 0 12px 34px rgba(0,0,0,0.12); }
                .dark-mode .photos-tile:hover { background: rgba(255,255,255,0.12); box-shadow: 0 12px 34px rgba(0,0,0,0.28); }
                .photos-tile-media { position: relative; display: block; aspect-ratio: 1 / 1; overflow: hidden; border-radius: 12px; background: rgba(0,0,0,0.08); }
                .photos-tile-image { width: 100%; height: 100%; display: block; object-fit: cover; }
                .photos-fav-badge { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 999px; background: rgba(0,0,0,0.42); backdrop-filter: blur(14px); opacity: 0; transform: scale(0.82); transition: opacity 160ms ease, transform 220ms cubic-bezier(0.16, 1, 0.3, 1); }
                .photos-tile:hover .photos-fav-badge,
                .photos-fav-badge.active { opacity: 1; transform: scale(1); }
                .photos-fav-badge img { width: 16px; height: 16px; filter: brightness(0) invert(1); }
                .photos-tile-title,
                .photos-tile-meta { min-width: 0; padding: 0 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .photos-tile-title { font-size: 13px; font-weight: 600; }
                .photos-tile-meta { color: var(--text-secondary); font-size: 12px; }
                .photos-empty { min-height: 360px; display: grid; place-items: center; align-content: center; gap: 12px; text-align: center; color: var(--text-secondary); }
                .photos-empty img { width: 52px; height: 52px; opacity: 0.48; }
                .dark-mode .photos-empty img { filter: invert(1); }
                .photos-empty h2 { margin: 0; color: var(--text-primary); font-size: 18px; font-weight: 650; }
                .photos-empty p { margin: 0; font-size: 13px; }
                .photos-settings-panel { display: grid; gap: 12px; max-width: 760px; }
                .photos-setting-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(210px, 280px); align-items: center; gap: 18px; padding: 16px; border-radius: 16px; background: rgba(255,255,255,0.38); border: 1px solid rgba(255,255,255,0.3); }
                .dark-mode .photos-setting-row { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.08); }
                .photos-setting-row strong { display: block; font-size: 15px; }
                .photos-setting-row span { display: block; margin-top: 4px; color: var(--text-secondary); font-size: 12px; line-height: 1.45; }
                .photos-setting-control { display: flex; justify-content: flex-end; min-width: 0; }
                .photos-actions { display: flex; flex-wrap: wrap; gap: 10px; padding-top: 8px; }
                .photos-hero-clone { position: absolute; z-index: 70; overflow: hidden; background-size: cover; background-position: center; background-repeat: no-repeat; pointer-events: none; will-change: left, top, width, height, border-radius, opacity; contain: layout paint style; box-shadow: 0 18px 46px rgba(0,0,0,0.28); }
                .photos-viewer { position: absolute; inset: 0; z-index: 60; display: flex; flex-direction: column; height: 100%; background: #000 !important; background-color: #000 !important; background-image: none !important; color: #fff; overflow: hidden; opacity: 1; }
                .photos-canvas-wrap { flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: grab; position: relative; background: #000 !important; }
                .photos-main-img { max-width: 100%; max-height: 100%; object-fit: contain; transition: filter 0.2s, opacity 0.25s ease; user-select: none; -webkit-user-drag: none; }
                .photos-back-btn { position: absolute !important; top: 12px !important; left: 12px !important; bottom: auto !important; right: auto !important; transform: none !important; display: flex; align-items: center; gap: 6px; padding: 6px 14px; background: rgba(0,0,0,0.5) !important; background-color: rgba(0,0,0,0.5) !important; backdrop-filter: blur(10px); color: #fff !important; border: none; border-radius: 20px; cursor: pointer; font-size: 13px; z-index: 10; transition: background 0.2s; }
                .photos-back-btn:hover { top: 12px !important; left: 12px !important; bottom: auto !important; transform: none !important; background: rgba(0,0,0,0.7) !important; background-color: rgba(0,0,0,0.7) !important; }
                .photos-back-btn img { width: 16px; height: 16px; filter: brightness(0) invert(1); }
                .photos-counter { position: absolute; top: 12px; right: 12px; padding: 4px 12px; background: rgba(0,0,0,0.5) !important; background-color: rgba(0,0,0,0.5) !important; backdrop-filter: blur(10px); color: #fff !important; border-radius: 12px; font-size: 12px; z-index: 10; }
                .photos-tool-btn { position: relative; }
                .photos-tool-tooltip { position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%) translateY(4px); padding: 4px 10px; background: rgba(20,20,20,0.92); color: #fff; font-size: 11px; white-space: nowrap; border-radius: 6px; pointer-events: none; opacity: 0; transition: opacity 0.18s ease, transform 0.18s ease; z-index: 30; }
                .photos-tool-btn:hover .photos-tool-tooltip { opacity: 1; transform: translateX(-50%) translateY(0); }
                .photos-toolbar-classic { display: flex; align-items: center; justify-content: center; gap: 2px; padding: 8px 16px; background: rgba(24,24,24,0.95) !important; background-color: rgba(24,24,24,0.95) !important; backdrop-filter: blur(16px); border-top: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; flex-wrap: wrap; }
                .photos-toolbar-classic .photos-tool-btn { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: transparent !important; background-color: transparent !important; background-image: none !important; border: none !important; border-radius: 6px; cursor: pointer; color: rgba(255,255,255,0.9) !important; font-size: 12px; transition: background 0.15s; -webkit-background-clip: unset !important; background-clip: unset !important; }
                .photos-toolbar-classic .photos-tool-btn:hover { background: rgba(255,255,255,0.1) !important; background-color: rgba(255,255,255,0.1) !important; }
                .photos-toolbar-classic .photos-tool-btn::before,
                .photos-toolbar-classic .photos-tool-btn::after { display: none !important; }
                .photos-toolbar-classic .photos-tool-btn img { width: 18px; height: 18px; opacity: 0.9; filter: brightness(0) invert(1) !important; }
                .photos-toolbar-v2 { position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 4px; padding: 8px 16px; background: rgba(30,30,30,0.78) !important; background-color: rgba(30,30,30,0.78) !important; backdrop-filter: blur(20px) saturate(150%); border-radius: 28px; box-shadow: 0 4px 24px rgba(0,0,0,0.3); z-index: 20; }
                .photos-toolbar-v2 .photos-tool-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; padding: 0; background: transparent !important; background-color: transparent !important; background-image: none !important; border: none !important; border-radius: 50%; cursor: pointer; transition: background 0.15s, transform 0.15s; -webkit-background-clip: unset !important; background-clip: unset !important; color: transparent; }
                .photos-toolbar-v2 .photos-tool-btn:hover { background: rgba(255,255,255,0.12) !important; background-color: rgba(255,255,255,0.12) !important; transform: scale(1.1); }
                .photos-toolbar-v2 .photos-tool-btn.active,
                .photos-toolbar-classic .photos-tool-btn.active { background: rgba(255,255,255,0.16) !important; background-color: rgba(255,255,255,0.16) !important; }
                .photos-toolbar-v2 .photos-tool-btn::before,
                .photos-toolbar-v2 .photos-tool-btn::after { display: none !important; }
                .photos-toolbar-v2 .photos-tool-btn img { width: 20px; height: 20px; opacity: 0.9; filter: brightness(0) invert(1) !important; }
                .photos-toolbar-v2 .photos-tool-btn > span.photos-tool-tooltip { display: block !important; }
                .photos-adjust-panel { position: absolute; bottom: 80px; right: 16px; display: flex; flex-direction: column; gap: 12px; padding: 16px 20px; background: rgba(30,30,30,0.9) !important; background-color: rgba(30,30,30,0.9) !important; backdrop-filter: blur(20px); border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 25; min-width: 220px; opacity: 0; transform: translateY(12px) scale(0.96); transition: opacity 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1); pointer-events: none; }
                .photos-adjust-panel.photos-panel-visible { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
                .photos-adjust-title { font-size: 14px; font-weight: 600; color: #fff !important; margin-bottom: 4px; }
                .photos-adjust-item { display: flex; align-items: center; gap: 10px; }
                .photos-adjust-item label { font-size: 12px; color: rgba(255,255,255,0.7) !important; min-width: 42px; }
                .photos-adjust-item input[type=range] { flex: 1; height: 4px; -webkit-appearance: none; appearance: none; background: rgba(255,255,255,0.2) !important; border-radius: 2px; outline: none; }
                .photos-adjust-item input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--accent); cursor: pointer; }
                .photos-adj-val { font-size: 11px; color: rgba(255,255,255,0.5) !important; min-width: 32px; text-align: right; }
                .photos-info-panel { position: absolute; bottom: 80px; left: 16px; display: flex; flex-direction: column; gap: 8px; padding: 16px 20px; background: rgba(30,30,30,0.9) !important; background-color: rgba(30,30,30,0.9) !important; backdrop-filter: blur(20px); border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 25; min-width: 240px; max-width: 320px; opacity: 0; transform: translateY(12px) scale(0.96); transition: opacity 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1); pointer-events: none; }
                .photos-info-panel.photos-panel-visible { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
                .photos-info-title { font-size: 14px; font-weight: 600; color: #fff !important; margin-bottom: 4px; }
                .photos-info-row { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; }
                .photos-info-row span:first-child { color: rgba(255,255,255,0.6) !important; flex-shrink: 0; }
                .photos-info-row span:last-child { color: #fff !important; text-align: right; word-break: break-all; }
                .photos-wallpaper-menu { position: absolute; bottom: 80px; right: 50%; transform: translateX(50%) translateY(12px) scale(0.96); display: flex; flex-direction: column; gap: 2px; padding: 6px; background: rgba(30,30,30,0.92) !important; background-color: rgba(30,30,30,0.92) !important; backdrop-filter: blur(20px) saturate(150%); border-radius: 10px; box-shadow: 0 6px 24px rgba(0,0,0,0.4); z-index: 25; min-width: 180px; opacity: 0; transition: opacity 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1); pointer-events: none; }
                .photos-wallpaper-menu.photos-panel-visible { opacity: 1; transform: translateX(50%) translateY(0) scale(1); pointer-events: auto; }
                .photos-wpmenu-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: transparent !important; background-color: transparent !important; background-image: none !important; border: none !important; border-radius: 6px; cursor: pointer; color: #fff !important; font-size: 13px; transition: background 0.15s; -webkit-background-clip: unset !important; background-clip: unset !important; }
                .photos-wpmenu-item:hover { background: rgba(255,255,255,0.1) !important; background-color: rgba(255,255,255,0.1) !important; }
                .photos-wpmenu-item::before,
                .photos-wpmenu-item::after { display: none !important; }
                .photos-wpmenu-item img { width: 18px; height: 18px; filter: brightness(0) invert(1) !important; opacity: 0.9; }
                .photos-wpmenu-item span { white-space: nowrap; }
                .photos-fullscreen { position: fixed !important; top: 0; left: 0; width: 100vw !important; height: 100vh !important; z-index: 9999; }
                @media (max-width: 720px) {
                    .photos-collection,
                    .photos-settings { padding: 18px; }
                    .photos-grid { grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 11px; }
                    .photos-setting-row { grid-template-columns: 1fr; }
                    .photos-setting-control { justify-content: stretch; }
                }
            `;
        }
    };

    window.PhotosDataStore = PhotosDataStore;
    PhotosDataStore.bindGlobalFSListener();
    window.PhotosApp = PhotosApp;
}());
