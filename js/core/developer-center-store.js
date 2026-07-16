/**
 * Persistent storage and package codec for Developer Center projects.
 * Project source can be much larger than normal settings, so it intentionally
 * lives in IndexedDB instead of the FluentOS localStorage settings object.
 */
const DeveloperCenterStore = {
    DB_NAME: 'fluentos.developerCenter',
    DB_VERSION: 1,
    PACKAGE_VERSION: 1,
    SUPPORTED_PERMISSIONS: [
        'system.theme.write',
        'window.manage',
        'files.readText',
        'files.writeText',
        'desktop.manage',
        'clipboard.read',
        'clipboard.write',
        'network.request',
        'network.image'
    ],
    DEFAULT_FAVORITES: ['json', 'base64', 'url', 'timestamp', 'hash', 'qrcode'],
    DEFAULT_EDITOR_APPEARANCE: Object.freeze({ fontFamily: 'Cascadia Code, Consolas, monospace', fontSize: 13 }),
    db: null,
    _ready: null,

    init() {
        if (this._ready) return this._ready;
        this._ready = new Promise((resolve) => {
            if (typeof indexedDB === 'undefined') {
                resolve(null);
                return;
            }
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('projects')) {
                    const projects = db.createObjectStore('projects', { keyPath: 'id' });
                    projects.createIndex('modifiedAt', 'modifiedAt');
                }
                if (!db.objectStoreNames.contains('apps')) {
                    const apps = db.createObjectStore('apps', { keyPath: 'id' });
                    apps.createIndex('projectId', 'projectId', { unique: true });
                }
                if (!db.objectStoreNames.contains('preferences')) {
                    db.createObjectStore('preferences', { keyPath: 'key' });
                }
            };
            request.onsuccess = () => {
                this.db = request.result;
                this.db.onversionchange = () => this.db.close();
                resolve(this.db);
            };
            request.onerror = () => {
                console.warn('[DeveloperCenter] IndexedDB unavailable', request.error);
                resolve(null);
            };
        });
        return this._ready;
    },

    async _store(name, mode = 'readonly') {
        const db = await this.init();
        return db ? db.transaction(name, mode).objectStore(name) : null;
    },

    _request(request, fallback = null) {
        if (!request) return Promise.resolve(fallback);
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
        });
    },

    async getAll(storeName) {
        const store = await this._store(storeName);
        return this._request(store?.getAll(), []);
    },

    async get(storeName, id) {
        const store = await this._store(storeName);
        return this._request(store?.get(id), null);
    },

    async put(storeName, value) {
        const store = await this._store(storeName, 'readwrite');
        if (!store) throw new Error('IndexedDB is unavailable');
        await this._request(store.put(value));
        window.dispatchEvent(new CustomEvent('developer-center-data-change', { detail: { storeName } }));
        return value;
    },

    async remove(storeName, id) {
        const store = await this._store(storeName, 'readwrite');
        if (!store) return false;
        await this._request(store.delete(id));
        window.dispatchEvent(new CustomEvent('developer-center-data-change', { detail: { storeName } }));
        return true;
    },

    async clear(storeName) {
        const store = await this._store(storeName, 'readwrite');
        if (!store) return false;
        await this._request(store.clear());
        window.dispatchEvent(new CustomEvent('developer-center-data-change', { detail: { storeName } }));
        return true;
    },

    createId(prefix = 'project') {
        const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        return `${prefix}-${random}`;
    },

    normalizeNetworkDomains(values) {
        const input = Array.isArray(values) ? values : String(values || '').split(/[\s,;]+/);
        const domains = [];
        input.forEach((value) => {
            const raw = String(value || '').trim().toLowerCase().replace(/\.$/, '');
            if (!raw) return;
            if (raw.length > 253 || raw.includes('/') || raw.includes(':') || raw.includes('@')) {
                throw new Error(`Invalid network domain: ${raw}`);
            }
            let hostname = '';
            try { hostname = new URL(`https://${raw}/`).hostname.toLowerCase().replace(/\.$/, ''); }
            catch (_) { throw new Error(`Invalid network domain: ${raw}`); }
            const isIp = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':');
            const isPrivate = !hostname.includes('.') || hostname === 'localhost' || hostname.endsWith('.localhost') ||
                ['.local', '.internal', '.lan', '.home'].some((suffix) => hostname.endsWith(suffix)) ||
                /^(?:0|10|127|169\.254|192\.168)\./.test(hostname) || /^172\.(?:1[6-9]|2\d|3[01])\./.test(hostname);
            if (hostname !== raw || isIp || isPrivate || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(hostname)) {
                throw new Error(`Unsafe network domain: ${raw}`);
            }
            if (!domains.includes(hostname)) domains.push(hostname);
        });
        if (domains.length > 20) throw new Error('A network allowlist can contain at most 20 domains');
        return domains;
    },

    normalizeNetworkConfig(network) {
        const value = network && typeof network === 'object' ? network : {};
        return {
            connect: this.normalizeNetworkDomains(value.connect),
            image: this.normalizeNetworkDomains(value.image)
        };
    },

    async saveProject(project) {
        const now = new Date().toISOString();
        const existing = project.id ? await this.get('projects', project.id) : null;
        const value = {
            ...existing,
            ...project,
            id: project.id || this.createId('project'),
            createdAt: existing?.createdAt || project.createdAt || now,
            modifiedAt: now
        };
        return this.put('projects', value);
    },

    async saveApp(app) {
        const now = new Date().toISOString();
        const existing = app.id ? await this.get('apps', app.id) : null;
        const value = {
            ...existing,
            ...app,
            id: app.id || this.createId('created-app'),
            createdAt: existing?.createdAt || app.createdAt || now,
            modifiedAt: now
        };
        return this.put('apps', value);
    },

    async getFavorites() {
        const item = await this.get('preferences', 'favorites');
        return Array.isArray(item?.value) ? item.value : [...this.DEFAULT_FAVORITES];
    },

    async setFavorites(value) {
        const favorites = [...new Set((value || []).map(String))];
        await this.put('preferences', { key: 'favorites', value: favorites });
        return favorites;
    },

    async resetFavorites() {
        return this.setFavorites(this.DEFAULT_FAVORITES);
    },

    normalizeEditorAppearance(value) {
        const input = value && typeof value === 'object' ? value : {};
        const rawFont = String(input.fontFamily || this.DEFAULT_EDITOR_APPEARANCE.fontFamily).trim();
        const fontFamily = rawFont && rawFont.length <= 120 && !/[;{}<>]/.test(rawFont)
            ? rawFont
            : this.DEFAULT_EDITOR_APPEARANCE.fontFamily;
        const fontSize = Math.max(11, Math.min(24, Math.round(Number(input.fontSize) || this.DEFAULT_EDITOR_APPEARANCE.fontSize)));
        return { fontFamily, fontSize };
    },

    async getEditorAppearance() {
        const item = await this.get('preferences', 'editorAppearance');
        return this.normalizeEditorAppearance(item?.value);
    },

    async setEditorAppearance(value) {
        const appearance = this.normalizeEditorAppearance(value);
        await this.put('preferences', { key: 'editorAppearance', value: appearance });
        return appearance;
    },

    async nameExists(name, excludeProjectId = null) {
        const normalized = String(name || '').trim().toLocaleLowerCase();
        if (!normalized) return false;
        const [projects, apps] = await Promise.all([this.getAll('projects'), this.getAll('apps')]);
        return projects.some((item) => item.id !== excludeProjectId && String(item.name || '').trim().toLocaleLowerCase() === normalized) ||
            apps.some((item) => item.projectId !== excludeProjectId && String(item.name || '').trim().toLocaleLowerCase() === normalized);
    },

    async estimateBytes() {
        const [projects, apps, preferences] = await Promise.all([
            this.getAll('projects'), this.getAll('apps'), this.getAll('preferences')
        ]);
        return new Blob([JSON.stringify({ projects, apps, preferences })]).size;
    },

    _crcTable: null,
    crc32(bytes) {
        if (!this._crcTable) {
            this._crcTable = Array.from({ length: 256 }, (_, index) => {
                let value = index;
                for (let bit = 0; bit < 8; bit++) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
                return value >>> 0;
            });
        }
        let crc = 0xffffffff;
        for (const byte of bytes) crc = this._crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
        return (crc ^ 0xffffffff) >>> 0;
    },

    _u16(value) {
        return [value & 255, (value >>> 8) & 255];
    },

    _u32(value) {
        return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
    },

    _readU16(view, offset) {
        return view.getUint16(offset, true);
    },

    _readU32(view, offset) {
        return view.getUint32(offset, true);
    },

    /** Create a standards-compatible ZIP containing uncompressed UTF-8 files. */
    createZip(entries) {
        const encoder = new TextEncoder();
        const localParts = [];
        const centralParts = [];
        let offset = 0;
        Object.entries(entries).forEach(([rawName, rawContent]) => {
            const name = String(rawName).replace(/\\/g, '/').replace(/^\/+/, '');
            if (!name || name.includes('../') || name.startsWith('/')) throw new Error('Unsafe package path');
            const nameBytes = encoder.encode(name);
            const data = rawContent instanceof Uint8Array ? rawContent : encoder.encode(String(rawContent));
            const crc = this.crc32(data);
            const local = new Uint8Array([
                ...this._u32(0x04034b50), ...this._u16(20), ...this._u16(0x0800), ...this._u16(0),
                ...this._u16(0), ...this._u16(0), ...this._u32(crc), ...this._u32(data.length),
                ...this._u32(data.length), ...this._u16(nameBytes.length), ...this._u16(0), ...nameBytes, ...data
            ]);
            const central = new Uint8Array([
                ...this._u32(0x02014b50), ...this._u16(20), ...this._u16(20), ...this._u16(0x0800),
                ...this._u16(0), ...this._u16(0), ...this._u16(0), ...this._u32(crc),
                ...this._u32(data.length), ...this._u32(data.length), ...this._u16(nameBytes.length),
                ...this._u16(0), ...this._u16(0), ...this._u16(0), ...this._u16(0), ...this._u32(0),
                ...this._u32(offset), ...nameBytes
            ]);
            localParts.push(local);
            centralParts.push(central);
            offset += local.length;
        });
        const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
        const end = new Uint8Array([
            ...this._u32(0x06054b50), ...this._u16(0), ...this._u16(0),
            ...this._u16(centralParts.length), ...this._u16(centralParts.length),
            ...this._u32(centralSize), ...this._u32(offset), ...this._u16(0)
        ]);
        return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
    },

    /** Read Store-mode packages produced by createZip. CRC and paths are validated. */
    async readZip(file) {
        if (Number(file?.size || 0) > 12 * 1024 * 1024) throw new Error('Package is larger than 12 MB');
        const bytes = new Uint8Array(await file.arrayBuffer());
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const decoder = new TextDecoder();
        const entries = {};
        let offset = 0;
        while (offset + 4 <= bytes.length && this._readU32(view, offset) === 0x04034b50) {
            if (offset + 30 > bytes.length) throw new Error('Truncated ZIP header');
            const flags = this._readU16(view, offset + 6);
            const method = this._readU16(view, offset + 8);
            const expectedCrc = this._readU32(view, offset + 14);
            const compressedSize = this._readU32(view, offset + 18);
            const uncompressedSize = this._readU32(view, offset + 22);
            const nameLength = this._readU16(view, offset + 26);
            const extraLength = this._readU16(view, offset + 28);
            if (flags & 0x08) throw new Error('Streaming ZIP entries are not supported');
            if (method !== 0 || compressedSize !== uncompressedSize) throw new Error('Only Store-mode ZIP packages are supported');
            const nameStart = offset + 30;
            const dataStart = nameStart + nameLength + extraLength;
            const dataEnd = dataStart + compressedSize;
            if (dataEnd > bytes.length) throw new Error('Truncated ZIP entry');
            const name = decoder.decode(bytes.slice(nameStart, nameStart + nameLength)).replace(/\\/g, '/');
            if (!name || name.startsWith('/') || name.includes('../') || /^[A-Za-z]:/.test(name)) throw new Error('Unsafe package path');
            const data = bytes.slice(dataStart, dataEnd);
            if (this.crc32(data) !== expectedCrc) throw new Error(`CRC mismatch: ${name}`);
            entries[name] = data;
            offset = dataEnd;
        }
        if (!Object.keys(entries).length) throw new Error('No readable files in package');
        return entries;
    },

    async exportApp(app) {
        const icon = String(app.icon || 'Theme/Icon/App_icon/created_app.png');
        const entries = {};
        const manifest = {
            format: 'fluentapp', version: this.PACKAGE_VERSION, id: app.id, projectId: app.projectId,
            name: app.name, type: app.type, title: app.title || app.name,
            forceFluentUI: app.forceFluentUI === true,
            permissions: [...new Set(Array.isArray(app.permissions) ? app.permissions : [])]
                .filter((permission) => this.SUPPORTED_PERMISSIONS.includes(permission)),
            network: this.normalizeNetworkConfig(app.network),
            iconFile: icon.startsWith('data:') ? 'icon.txt' : null,
            iconPath: icon.startsWith('data:') ? null : icon,
            exportedAt: new Date().toISOString()
        };
        if (app.type === 'pwa') manifest.url = app.url;
        else {
            entries['app/index.html'] = app.html || '';
            entries['app/styles.css'] = app.css || '';
            entries['app/main.js'] = app.js || '';
        }
        if (manifest.iconFile) entries[manifest.iconFile] = icon;
        entries['manifest.json'] = JSON.stringify(manifest, null, 2);
        return this.createZip(entries);
    },

    async importApp(file) {
        const entries = await this.readZip(file);
        if (!entries['manifest.json']) throw new Error('manifest.json is missing');
        let manifest;
        try { manifest = JSON.parse(new TextDecoder().decode(entries['manifest.json'])); }
        catch (_) { throw new Error('manifest.json is invalid'); }
        if (manifest.format !== 'fluentapp' || manifest.version !== this.PACKAGE_VERSION) throw new Error('Unsupported Fluent App package');
        if (!['pwa', 'professional'].includes(manifest.type) || !String(manifest.name || '').trim()) throw new Error('Invalid app manifest');
        const permissions = [...new Set(Array.isArray(manifest.permissions) ? manifest.permissions.map(String) : [])];
        if (permissions.length > this.SUPPORTED_PERMISSIONS.length || permissions.some((permission) => !this.SUPPORTED_PERMISSIONS.includes(permission))) {
            throw new Error('The package requests an unknown permission');
        }
        if (manifest.type === 'pwa' && permissions.length) throw new Error('PWA packages cannot request FluentOS bridge permissions');
        const network = this.normalizeNetworkConfig(manifest.network);
        if (network.connect.length > 0 && !permissions.includes('network.request')) throw new Error('network.request is required for network.connect domains');
        if (network.image.length > 0 && !permissions.includes('network.image')) throw new Error('network.image is required for network.image domains');
        if (permissions.includes('network.request') && network.connect.length === 0) throw new Error('network.request requires at least one network.connect domain');
        if (permissions.includes('network.image') && network.image.length === 0) throw new Error('network.image requires at least one network.image domain');
        const icon = manifest.iconFile && entries[manifest.iconFile]
            ? new TextDecoder().decode(entries[manifest.iconFile])
            : (manifest.iconPath || 'Theme/Icon/App_icon/created_app.png');
        return {
            id: this.createId('created-app'),
            projectId: this.createId('imported-project'),
            name: String(manifest.name).trim(), type: manifest.type, title: manifest.title || manifest.name,
            icon, url: manifest.type === 'pwa' ? String(manifest.url || '') : '',
            html: entries['app/index.html'] ? new TextDecoder().decode(entries['app/index.html']) : '',
            css: entries['app/styles.css'] ? new TextDecoder().decode(entries['app/styles.css']) : '',
            js: entries['app/main.js'] ? new TextDecoder().decode(entries['app/main.js']) : '',
            forceFluentUI: manifest.forceFluentUI === true,
            permissions,
            network
        };
    },

    download(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
};

window.DeveloperCenterStore = DeveloperCenterStore;
