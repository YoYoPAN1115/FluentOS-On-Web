/**
 * Persistent storage and package codec for Developer Center projects.
 * Project source can be much larger than normal settings, so it intentionally
 * lives in IndexedDB instead of the FluentOS localStorage settings object.
 */
const DeveloperCenterStore = {
    DB_NAME: 'fluentos.developerCenter',
    DB_VERSION: 3,
    PACKAGE_VERSION: 2,
    PACKAGE_EXTENSION: '.fap',
    PACKAGE_MIME: 'application/vnd.fluent.app-package',
    PWA_PERMISSIONS: Object.freeze(['storage.local']),
    SUPPORTED_PERMISSIONS: [
        'storage.local',
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
    PERMISSION_DETAILS: Object.freeze({
        'storage.local': Object.freeze({
            nameZh: '读写浏览器本地存储', nameEn: 'Read and write browser local storage',
            descriptionZh: '允许此 App 在浏览器中持久保存和读取自己的本地数据。PWA 使用其网站来源的 localStorage，自建 App 使用隔离的 FluentOS.storage。',
            descriptionEn: 'Allow this App to persist and read its own browser-local data. PWAs use localStorage for their site origin; created Apps use isolated FluentOS.storage.'
        }),
        'system.theme.write': Object.freeze({
            nameZh: '修改系统主题', nameEn: 'Change system theme',
            descriptionZh: '允许此 App 切换 Fluent 的明暗模式和主题外观。',
            descriptionEn: "Allow this App to change Fluent's light, dark, and theme appearance."
        }),
        'window.manage': Object.freeze({
            nameZh: '管理应用窗口', nameEn: 'Manage its App window',
            descriptionZh: '允许此 App 修改自己的窗口标题和窗口大小。',
            descriptionEn: 'Allow this App to change the title and size of its own window.'
        }),
        'files.readText': Object.freeze({
            nameZh: '读取文本文件', nameEn: 'Read text files',
            descriptionZh: '允许此 App 读取“文档”“下载”和“桌面”中的文本文件。',
            descriptionEn: 'Allow this App to read text files in Documents, Downloads, and Desktop.'
        }),
        'files.writeText': Object.freeze({
            nameZh: '写入文本文件', nameEn: 'Write text files',
            descriptionZh: '允许此 App 修改文本文件，或在“文档”中创建新的文本文件。',
            descriptionEn: 'Allow this App to edit text files or create new text files in Documents.'
        }),
        'desktop.manage': Object.freeze({
            nameZh: '管理桌面快捷方式', nameEn: 'Manage desktop shortcuts',
            descriptionZh: '允许此 App 添加或移除自己的桌面快捷方式。',
            descriptionEn: 'Allow this App to add or remove its own desktop shortcut.'
        }),
        'clipboard.read': Object.freeze({
            nameZh: '读取剪贴板', nameEn: 'Read clipboard',
            descriptionZh: '允许此 App 读取您当前复制的文本。',
            descriptionEn: 'Allow this App to read text you have copied.'
        }),
        'clipboard.write': Object.freeze({
            nameZh: '写入剪贴板', nameEn: 'Write to clipboard',
            descriptionZh: '允许此 App 将文本写入系统剪贴板。',
            descriptionEn: 'Allow this App to place text on the system clipboard.'
        }),
        'network.request': Object.freeze({
            nameZh: '访问网络', nameEn: 'Access the network',
            descriptionZh: '允许此 App 连接安装包中声明的网站和在线服务。',
            descriptionEn: 'Allow this App to connect to websites and online services declared by its package.'
        }),
        'network.image': Object.freeze({
            nameZh: '加载网络图片', nameEn: 'Load online images',
            descriptionZh: '允许此 App 从安装包中声明的网站加载图片。',
            descriptionEn: 'Allow this App to load images from websites declared by its package.'
        })
    }),
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
                if (!db.objectStoreNames.contains('packages')) {
                    db.createObjectStore('packages', { keyPath: 'id' });
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

    permissionInfo(permission, language = null) {
        const details = this.PERMISSION_DETAILS[String(permission || '')];
        const english = String(language || (typeof I18n !== 'undefined' ? I18n.currentLang : 'zh')).toLowerCase().startsWith('en');
        if (!details) {
            const fallback = String(permission || 'Unknown permission');
            return { name: fallback, description: fallback };
        }
        return {
            name: english ? details.nameEn : details.nameZh,
            description: english ? details.descriptionEn : details.descriptionZh
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

    async accountIdentity() {
        const state = typeof State !== 'undefined' ? State : globalThis.State;
        const settings = state?.settings || {};
        const name = String(settings.userName || 'Owner').trim() || 'Owner';
        const deviceName = String(settings.deviceName || 'FLUENTOS-PC').trim() || 'FLUENTOS-PC';
        const email = String(settings.userEmail || '').trim().toLowerCase();
        const source = `${deviceName}\u0000${name}\u0000${email}`;
        let hash = '';
        try {
            const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
            hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
        } catch (_) {
            hash = this.crc32(new TextEncoder().encode(source)).toString(16).padStart(8, '0');
        }
        const suffix = hash.slice(-6).toUpperCase();
        return { name, hash: suffix, displayName: `${name} (${suffix})` };
    },

    async storePackageFile(id, file) {
        const key = String(id || this.createId('package-file'));
        const blob = file instanceof Blob ? file : new Blob([file], { type: this.PACKAGE_MIME });
        const bytes = await blob.arrayBuffer();
        const checksum = this.crc32(new Uint8Array(bytes));
        await this.put('packages', {
            id: key,
            bytes,
            checksum,
            name: String(file?.name || `${key}${this.PACKAGE_EXTENSION}`),
            size: bytes.byteLength,
            mime: this.PACKAGE_MIME,
            modifiedAt: new Date().toISOString()
        });
        return key;
    },

    async loadPackageFile(id, fallbackName = 'app.fap') {
        const record = await this.get('packages', String(id || ''));
        if (!record) return null;
        let bytes = record.bytes;
        if (ArrayBuffer.isView(bytes)) {
            bytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        } else if (Object.prototype.toString.call(bytes) !== '[object ArrayBuffer]') {
            // Backward compatibility for packages cached by database version 2.
            if (!record.blob || typeof record.blob.arrayBuffer !== 'function') return null;
            bytes = await record.blob.arrayBuffer();
        }
        if (Number.isFinite(record.size) && Number(record.size) !== bytes.byteLength) {
            throw new Error('Cached package size check failed');
        }
        if (Number.isInteger(record.checksum) && this.crc32(new Uint8Array(bytes)) !== (record.checksum >>> 0)) {
            throw new Error('Cached package integrity check failed');
        }
        const filename = String(record.name || fallbackName || 'app.fap');
        try {
            return new File([bytes], filename, { type: this.PACKAGE_MIME });
        } catch (_) {
            const blob = new Blob([bytes], { type: this.PACKAGE_MIME });
            blob.name = filename;
            return blob;
        }
    },

    async removePackageFile(id) {
        return this.remove('packages', String(id || ''));
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

    async _inflateZipEntry(data) {
        if (typeof DecompressionStream === 'undefined') {
            throw new Error('This browser cannot decompress Deflate ZIP entries');
        }
        let stream;
        try { stream = new DecompressionStream('deflate-raw'); }
        catch (_) { throw new Error('This browser cannot decompress Deflate ZIP entries'); }
        try {
            const output = new Blob([data]).stream().pipeThrough(stream);
            return new Uint8Array(await new Response(output).arrayBuffer());
        } catch (_) {
            throw new Error('Deflate ZIP entry could not be decompressed');
        }
    },

    /** Read a standard ZIP central directory. Paths, sizes and CRC are validated. */
    async readZip(file) {
        if (Number(file?.size || 0) > 12 * 1024 * 1024) throw new Error('Package is larger than 12 MB');
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (bytes.length < 22) throw new Error('ZIP end record is missing');
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const decoder = new TextDecoder();
        const entries = Object.create(null);

        const minimumEocd = Math.max(0, bytes.length - 65557);
        let endOffset = -1;
        for (let offset = bytes.length - 22; offset >= minimumEocd; offset--) {
            if (this._readU32(view, offset) === 0x06054b50) { endOffset = offset; break; }
        }
        if (endOffset < 0) throw new Error('ZIP end record is missing');
        if (this._readU16(view, endOffset + 4) !== 0 || this._readU16(view, endOffset + 6) !== 0) {
            throw new Error('Multi-disk ZIP packages are not supported');
        }
        const entryCount = this._readU16(view, endOffset + 10);
        const centralSize = this._readU32(view, endOffset + 12);
        const centralOffset = this._readU32(view, endOffset + 16);
        if (!entryCount || entryCount > 128 || entryCount === 0xffff) throw new Error('Invalid ZIP entry count');
        if (centralOffset + centralSize > endOffset || centralOffset + centralSize > bytes.length) throw new Error('Invalid ZIP central directory');

        let offset = centralOffset;
        let totalUncompressed = 0;
        for (let index = 0; index < entryCount; index++) {
            if (offset + 46 > bytes.length || this._readU32(view, offset) !== 0x02014b50) throw new Error('Invalid ZIP central directory entry');
            const flags = this._readU16(view, offset + 8);
            const method = this._readU16(view, offset + 10);
            const expectedCrc = this._readU32(view, offset + 16);
            const compressedSize = this._readU32(view, offset + 20);
            const uncompressedSize = this._readU32(view, offset + 24);
            const nameLength = this._readU16(view, offset + 28);
            const extraLength = this._readU16(view, offset + 30);
            const commentLength = this._readU16(view, offset + 32);
            const localOffset = this._readU32(view, offset + 42);
            const nextOffset = offset + 46 + nameLength + extraLength + commentLength;
            if (!nameLength || nameLength > 512 || nextOffset > bytes.length) throw new Error('Invalid ZIP entry name');
            if (flags & 0x01) throw new Error('Encrypted ZIP entries are not supported');
            if (![0, 8].includes(method)) throw new Error(`Unsupported ZIP compression method: ${method}`);
            const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength)).replace(/\\/g, '/');
            const segments = name.split('/');
            if (!name || name.includes('\0') || name.startsWith('/') || /^[A-Za-z]:/.test(name) || segments.some((part) => part === '..')) {
                throw new Error('Unsafe package path');
            }
            if (localOffset + 30 > bytes.length || this._readU32(view, localOffset) !== 0x04034b50) throw new Error(`ZIP entry header is missing: ${name}`);
            const localNameLength = this._readU16(view, localOffset + 26);
            const localExtraLength = this._readU16(view, localOffset + 28);
            const dataStart = localOffset + 30 + localNameLength + localExtraLength;
            const dataEnd = dataStart + compressedSize;
            if (dataEnd > bytes.length) throw new Error(`Truncated ZIP entry: ${name}`);
            totalUncompressed += uncompressedSize;
            if (totalUncompressed > 24 * 1024 * 1024) throw new Error('Uncompressed package content is larger than 24 MB');

            if (!name.endsWith('/')) {
                if (Object.prototype.hasOwnProperty.call(entries, name)) throw new Error(`Duplicate ZIP entry: ${name}`);
                const compressed = bytes.slice(dataStart, dataEnd);
                const data = method === 0 ? compressed : await this._inflateZipEntry(compressed);
                if (data.length !== uncompressedSize) throw new Error(`ZIP entry size mismatch: ${name}`);
                if (this.crc32(data) !== expectedCrc) throw new Error(`CRC mismatch: ${name}`);
                entries[name] = data;
            }
            offset = nextOffset;
        }
        if (!Object.keys(entries).length) throw new Error('No readable files in package');
        return entries;
    },

    async exportApp(app) {
        const icon = String(app.icon || 'Theme/Icon/App_icon/created_app.png');
        const description = String(app.description || '').trim();
        const developer = String(app.developer || '').trim();
        const developerHash = String(app.developerHash || '').trim().toUpperCase();
        if (!description || description.length > 600 || !developer || developer.length > 160 || !/^[A-F0-9]{6}$/.test(developerHash)) {
            throw new Error('Complete the App information and package it again before exporting');
        }
        const entries = {};
        const manifest = {
            format: 'fluentapp', version: this.PACKAGE_VERSION, id: app.id, projectId: app.projectId,
            name: app.name, type: app.type, title: app.title || app.name,
            description,
            developer,
            developerHash,
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
        const filename = String(file?.name || '');
        if (!filename.toLowerCase().endsWith(this.PACKAGE_EXTENSION)) {
            throw new Error('Only Fluent .fap packages can be opened');
        }
        // .fap is a versioned Fluent package whose payload remains ZIP. Give the
        // decoder a temporary .zip view without mutating or executing the source.
        const zipName = `${filename.slice(0, -this.PACKAGE_EXTENSION.length)}.zip`;
        const packageBytes = await file.arrayBuffer();
        let zipFile;
        try { zipFile = new File([packageBytes], zipName, { type: 'application/zip' }); }
        catch (_) {
            zipFile = new Blob([packageBytes], { type: 'application/zip' });
            zipFile.name = zipName;
        }
        const entries = await this.readZip(zipFile);
        if (!entries['manifest.json']) throw new Error('manifest.json is missing');
        let manifest;
        try { manifest = JSON.parse(new TextDecoder().decode(entries['manifest.json'])); }
        catch (_) { throw new Error('manifest.json is invalid'); }
        if (manifest.format !== 'fluentapp' || manifest.version !== this.PACKAGE_VERSION) throw new Error('Unsupported Fluent App package');
        if (!['pwa', 'professional'].includes(manifest.type) || !String(manifest.name || '').trim()) throw new Error('Invalid app manifest');
        const description = String(manifest.description || '').trim();
        const developer = String(manifest.developer || '').trim();
        const developerHash = String(manifest.developerHash || '').trim().toUpperCase();
        if (!description || description.length > 600 || !developer || developer.length > 160 || !/^[A-F0-9]{6}$/.test(developerHash)) throw new Error('App information is incomplete');
        const permissions = [...new Set(Array.isArray(manifest.permissions) ? manifest.permissions.map(String) : [])];
        if (permissions.length > this.SUPPORTED_PERMISSIONS.length || permissions.some((permission) => !this.SUPPORTED_PERMISSIONS.includes(permission))) {
            throw new Error('The package requests an unknown permission');
        }
        if (manifest.type === 'pwa' && permissions.some((permission) => !this.PWA_PERMISSIONS.includes(permission))) {
            throw new Error('PWA packages can only request supported PWA permissions');
        }
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
            description,
            developer,
            developerHash,
            sourcePackageId: String(manifest.id || ''),
            icon, url: manifest.type === 'pwa' ? String(manifest.url || '') : '',
            html: entries['app/index.html'] ? new TextDecoder().decode(entries['app/index.html']) : '',
            css: entries['app/styles.css'] ? new TextDecoder().decode(entries['app/styles.css']) : '',
            js: entries['app/main.js'] ? new TextDecoder().decode(entries['app/main.js']) : '',
            forceFluentUI: manifest.forceFluentUI === true,
            permissions,
            network
        };
    },

    /**
     * Static installation inspection. This function may parse/compile source for
     * syntax diagnostics, but it never inserts App markup into the live document,
     * creates an iframe, opens its URL, or invokes any App function.
     */
    inspectAppSafety(app) {
        const fail = (reason, detail) => ({ ok: false, reason, detail: String(detail || '') });
        if (!app || !['pwa', 'professional'].includes(app.type)) return fail('package', 'Invalid App manifest');
        if (!String(app.name || '').trim() || !String(app.developer || '').trim()) return fail('package', 'Required App metadata is missing');
        const declaredPermissions = [...new Set(Array.isArray(app.permissions) ? app.permissions.map(String) : [])];
        if (declaredPermissions.some((permission) => !this.SUPPORTED_PERMISSIONS.includes(permission))) {
            return fail('api', 'The App requests an unknown permission');
        }

        if (app.type === 'pwa') {
            if (declaredPermissions.some((permission) => !this.PWA_PERMISSIONS.includes(permission))) {
                return fail('api', 'The PWA requests a permission that is not available to PWAs');
            }
            let url;
            try { url = new URL(String(app.url || '')); }
            catch (_) { return fail('code', 'The App URL is invalid'); }
            const hostname = String(url.hostname || '').toLowerCase();
            const privateHost = /^(?:0\.|10\.|127\.|169\.254\.|192\.168\.)/.test(hostname) ||
                /^172\.(?:1[6-9]|2\d|3[01])\./.test(hostname) ||
                ['localhost', '::1', '[::1]', '0.0.0.0'].includes(hostname) || hostname.endsWith('.local');
            if (url.protocol !== 'https:' || url.username || url.password || privateHost) {
                return fail('malicious', 'The PWA URL does not meet Fluent safety requirements');
            }
            return { ok: true, reason: '', detail: 'Static PWA manifest inspection passed' };
        }

        const html = String(app.html || '');
        const css = String(app.css || '');
        const js = String(app.js || '');
        try {
            // Function construction parses JavaScript but does not invoke it.
            new Function(`"use strict";\n${js}`);
            if (typeof document !== 'undefined') {
                const template = document.createElement('template');
                template.innerHTML = html;
            }
            if (typeof CSSStyleSheet !== 'undefined') {
                const sheet = new CSSStyleSheet();
                sheet.replaceSync(css);
            }
        } catch (error) {
            return fail('code', error?.message || 'Source contains a syntax error');
        }

        const combined = `${html}\n${css}\n${js}`;
        const maliciousRules = [
            { regex: /\beval\s*\(/i, name: 'eval()' },
            { regex: /\bFunction\s*\(/, name: 'Function()' },
            { regex: /\bimport\s*\(/i, name: 'dynamic import' },
            { regex: /document\s*\.\s*cookie/i, name: 'document.cookie' },
            { regex: /(?:\bwindow\s*\.\s*(?:parent|top|opener)\b|\b(?:parent|top|opener)\s*\.\s*(?:document|location|frames|window|parent|top|opener|postMessage)\b)/i, name: 'host-window access' },
            { regex: /<script[^>]+src\s*=\s*["']?https?:/i, name: 'remote script' },
            { regex: /javascript\s*:/i, name: 'javascript URL' }
        ];
        const malicious = maliciousRules.find((rule) => rule.regex.test(combined));
        if (malicious) return fail('malicious', `Blocked code pattern: ${malicious.name}`);

        const apiRules = [
            { regex: /\bfetch\s*\(/i, name: 'fetch' },
            { regex: /\bXMLHttpRequest\b/i, name: 'XMLHttpRequest' },
            { regex: /\bWebSocket\b/i, name: 'WebSocket' },
            { regex: /\bEventSource\b/i, name: 'EventSource' },
            { regex: /navigator\s*\.\s*sendBeacon\s*\(/i, name: 'navigator.sendBeacon' },
            { regex: /\b(?:Worker|SharedWorker|WebAssembly)\b/i, name: 'worker or WebAssembly' },
            { regex: /<\s*(?:img|iframe|script)\b[^>]*(?:src)\s*=\s*["']?\s*https?:\/\//i, name: 'remote embedded resource' },
            { regex: /<\s*link\b[^>]*href\s*=\s*["']?\s*https?:\/\//i, name: 'remote stylesheet' },
            { regex: /(?:url\s*\(\s*|@import\s+)["']?\s*https?:\/\//i, name: 'remote CSS URL' },
            { regex: /\bindexedDB\b/i, name: 'indexedDB' },
            { regex: /\blocalStorage\b|\bsessionStorage\b/i, name: 'direct browser storage' },
            { regex: /navigator\s*\.\s*(?:clipboard|geolocation|mediaDevices|usb|serial|bluetooth)/i, name: 'privileged navigator API' }
        ];
        const apiMatch = apiRules.find((rule) => rule.regex.test(combined));
        if (apiMatch) return fail('api', `High-risk browser API: ${apiMatch.name}`);

        const permissions = new Set(declaredPermissions);
        const permissionRules = [
            { regex: /FluentOS\s*\.\s*storage\s*\.\s*(?:get|set|remove)\s*\(/, permission: 'storage.local' },
            { regex: /FluentOS\s*\.\s*call\s*\(\s*['"]storage\.(?:get|set|remove)['"]/, permission: 'storage.local' },
            { regex: /FluentOS\s*\.\s*system\s*\.\s*(?:setTheme|toggleTheme)\s*\(/, permission: 'system.theme.write' },
            { regex: /FluentOS\s*\.\s*window\s*\.\s*(?:setTitle|setSize)\s*\(/, permission: 'window.manage' },
            { regex: /FluentOS\s*\.\s*files\s*\.\s*(?:listText|readText)\s*\(/, permission: 'files.readText' },
            { regex: /FluentOS\s*\.\s*files\s*\.\s*(?:writeText|createText)\s*\(/, permission: 'files.writeText' },
            { regex: /FluentOS\s*\.\s*desktop\s*\.\s*(?:addShortcut|removeShortcut)\s*\(/, permission: 'desktop.manage' },
            { regex: /FluentOS\s*\.\s*clipboard\s*\.\s*read\s*\(/, permission: 'clipboard.read' },
            { regex: /FluentOS\s*\.\s*clipboard\s*\.\s*write\s*\(/, permission: 'clipboard.write' },
            { regex: /FluentOS\s*\.\s*network\s*\.\s*request\s*\(/, permission: 'network.request' },
            { regex: /FluentOS\s*\.\s*network\s*\.\s*loadImage\s*\(/, permission: 'network.image' }
        ];
        const missingPermission = permissionRules.find((rule) => rule.regex.test(combined) && !permissions.has(rule.permission));
        if (missingPermission) return fail('api', `Undeclared Fluent API permission: ${missingPermission.permission}`);
        try {
            const network = this.normalizeNetworkConfig(app.network);
            if (network.connect.length && !permissions.has('network.request')) return fail('api', 'network.request permission is missing');
            if (network.image.length && !permissions.has('network.image')) return fail('api', 'network.image permission is missing');
            if (permissions.has('network.request') && !network.connect.length) return fail('api', 'network.request has no allowed domain');
            if (permissions.has('network.image') && !network.image.length) return fail('api', 'network.image has no allowed domain');
        } catch (error) {
            return fail('api', error?.message || 'Invalid network permission configuration');
        }
        return { ok: true, reason: '', detail: 'Static source and permission inspection passed' };
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
