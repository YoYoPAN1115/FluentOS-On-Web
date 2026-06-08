/**
 * 全局状态管理
 */
const State = {
    // 当前视图
    view: 'boot', // 'boot' | 'lock' | 'login' | 'desktop'
    
    // 设置
    settings: {},
    
    // 会话
    session: {},
    
    // 文件系统
    fs: {},
    
    // 桌面布局
    desktopLayout: {},
    
    // 通知列表
    notifications: [],
    
    // 打开的窗口
    windows: [],
    
    // 运行的应用
    runningApps: new Set(),

    // 应用使用记录
    appUsage: {},
    
    // 事件监听器
    listeners: {},

    // 初始化
    init() {
        // 从 localStorage 加载数据
        this.settings = Storage.get(Storage.keys.SETTINGS);
        this.session = Storage.get(Storage.keys.SESSION);
        this.fs = Storage.get(Storage.keys.FS);
        this.desktopLayout = Storage.get(Storage.keys.DESKTOP_LAYOUT);
        this.appUsage = Storage.get(Storage.keys.APP_USAGE) || {};
        this.notifications = Storage.get(Storage.keys.NOTIFICATIONS) || [];
        this.ensureSettingsDefaults();
        this.restoreStrictCspOnStartup();
        
        // 校验并修复文件系统完整性（防止关键目录缺失）
        this.ensureFSIntegrity();
        
        // 重置灵翼交互状态（每次启动时都需要重新授权摄像头）
        if (this.settings.lingyiEnabled) {
            this.settings.lingyiEnabled = false;
            Storage.set(Storage.keys.SETTINGS, this.settings);
        }
        
        // 应用主题
        this.applyTheme();
        this.applyAccentColorSetting();
        
        // 应用动画设置
        this.applyAnimationSetting();
        
        // 应用模糊设置
        this.applyBlurSetting();
        
        // 应用窗口模糊设置
        this.applyWindowBlurSetting();
        
        // 应用新版 UI 设置
        this.applyFluentV2Setting();
        this.applyMaterialSetting();
        if (this.settings.accentColorAuto === true) {
            this.updateAccentFromWallpaper(this.settings.wallpaperDesktop);
        }
        this.applyButtonGlowSetting();
        this.applyStrictCspSetting();
        
        // 应用亮度设置
        this.applyBrightness();
        this.applyVolume();
    },

    // 确保文件系统关键目录存在
    ensureFSIntegrity() {
        if (!this.fs || !this.fs.root) {
            this.fs = Storage.get(Storage.keys.FS) || { root: { id: 'root', name: '此电脑', type: 'folder', children: [] } };
        }
        const root = this.fs.root;
        root.children = root.children || [];
        const ensureFolder = (id, name) => {
            let node = root.children.find(c => c.id === id);
            if (!node) {
                node = { id, name, type: 'folder', children: [] };
                root.children.push(node);
            } else if (!Array.isArray(node.children)) {
                node.children = [];
            }
        };
        ensureFolder('desktop', '桌面');
        ensureFolder('documents', '文档');
        ensureFolder('pictures', '图片');
        ensureFolder('downloads', '下载');
        ensureFolder('recycle', '回收站');
        // 保存修复结果
        Storage.set(Storage.keys.FS, this.fs);
    },

    getDefaultUserAvatar() {
        return 'Theme/Profile_img/UserAva.png';
    },

    getBuiltInUserAvatars() {
        return [
            this.getDefaultUserAvatar(),
            ...Array.from({ length: 10 }, (_, i) => `Theme/Profile_img/${i + 1}.jpg`)
        ];
    },

    normalizeUserAvatar(value) {
        const fallback = this.getDefaultUserAvatar();
        if (typeof value !== 'string') return fallback;

        const raw = value.trim();
        if (!raw) return fallback;
        if (/^data:image\//i.test(raw)) return raw;

        let normalized = raw.replace(/\\/g, '/');
        if (/^https?:\/\//i.test(normalized)) {
            try {
                const url = new URL(normalized, window.location.href);
                if (url.origin !== window.location.origin) return fallback;
                normalized = decodeURIComponent(url.pathname.replace(/^\//, ''));
            } catch (_) {
                return fallback;
            }
        }

        normalized = normalized.replace(/^\.\//, '').replace(/^\//, '');
        const lower = normalized.toLowerCase();

        if (
            lower === 'userava.png'
            || lower === 'theme/icon/userava.png'
            || lower === 'icon/userava.png'
            || lower === 'profile_img/userava.png'
            || lower === 'theme/profile_img/userava.png'
        ) {
            return fallback;
        }

        const builtIn = this.getBuiltInUserAvatars();
        const exact = builtIn.find((item) => item.toLowerCase() === lower);
        if (exact) return exact;

        const profileMatch = lower.match(/^(?:theme\/)?profile_img\/(\d+)\.jpg$/);
        if (profileMatch) {
            const index = Number(profileMatch[1]);
            if (index >= 1 && index <= 10) {
                return `Theme/Profile_img/${index}.jpg`;
            }
        }

        const plainMatch = lower.match(/^(\d+)\.jpg$/);
        if (plainMatch) {
            const index = Number(plainMatch[1]);
            if (index >= 1 && index <= 10) {
                return `Theme/Profile_img/${index}.jpg`;
            }
        }

        return fallback;
    },

    ensureSettingsDefaults() {
        this.settings = this.settings || {};
        let changed = false;

        const defaults = {
            strictCspEnabled: false,
            strictCspLastEnabled: false,
            fingoCustomMode: false,
            fingoCustomLastEnabled: false,
            fingoProvider: 'openai',
            fingoApiKey: '',
            fingoApiEncrypted: null,
            fingoApiStorageType: 'none',
            fingoApiSaveMode: 'temporary',
            autoEnterFullscreen: true,
            enableExternalFileImport: false,
            enableWindowBlur: false,
            enableFluentV2: true,
            materialType: 'gaussian',
            blurIntensity: 40,
            accentColor: '#0078d4',
            accentColorAuto: false,
            accentColorExpanded: false,
            accentColorReadability: false,
            wallpaperAccentColor: '#0078d4',
            recentAccentColors: ['#d83b01', '#0078d4', '#00b7c3', '#4c4a48', '#e81123'],
            enableButtonGlowEffect: true,
            userName: 'Owner',
            userEmail: 'owner@sample.com',
            userAvatar: this.getDefaultUserAvatar(),
            quickWindowSwitchEnabled: true,
            windowEdgeSnapEnabled: true,
            windowHoverSnapEnabled: true,
            windowTopMaximizeEnabled: false,
            startPinnedApps: ['files', 'settings', 'calculator', 'notes', 'browser', 'clock', 'weather', 'appshop', 'camera', 'photos', 'media'],
            developerModeUnlocked: false,
            debugModeEnabled: false,
            windowBoundsMemory: {}
        };

        Object.keys(defaults).forEach((key) => {
            if (this.settings[key] === undefined) {
                this.settings[key] = defaults[key];
                changed = true;
            }
        });

        if (this.settings.enableFluentV2 !== true) {
            this.settings.enableFluentV2 = true;
            changed = true;
        }

        const normalizedAccent = this.normalizeAccentColor(this.settings.accentColor);
        if (normalizedAccent !== this.settings.accentColor) {
            this.settings.accentColor = normalizedAccent;
            changed = true;
        }

        const normalizedWallpaperAccent = this.normalizeAccentColor(this.settings.wallpaperAccentColor, normalizedAccent);
        if (normalizedWallpaperAccent !== this.settings.wallpaperAccentColor) {
            this.settings.wallpaperAccentColor = normalizedWallpaperAccent;
            changed = true;
        }

        const normalizedRecentAccentColors = this.normalizeRecentAccentColors(this.settings.recentAccentColors);
        if (JSON.stringify(normalizedRecentAccentColors) !== JSON.stringify(this.settings.recentAccentColors)) {
            this.settings.recentAccentColors = normalizedRecentAccentColors;
            changed = true;
        }

        // Migration: remember prior "enabled" state for startup auto-restore.
        if (this.settings.strictCspEnabled === true && this.settings.strictCspLastEnabled !== true) {
            this.settings.strictCspLastEnabled = true;
            changed = true;
        }

        // Migration: preserve prior custom mode preference for startup restoration.
        if (this.settings.fingoCustomMode === true && this.settings.fingoCustomLastEnabled !== true) {
            this.settings.fingoCustomLastEnabled = true;
            changed = true;
        }

        if (!this.settings.fingoApiStorageType) {
            if (this.settings.fingoApiEncrypted && this.settings.fingoApiEncrypted.ciphertext) {
                this.settings.fingoApiStorageType = 'permanent-encrypted';
            } else {
                this.settings.fingoApiStorageType = 'none';
            }
            changed = true;
        }

        if ((this.settings.fingoApiKey || '').trim()) {
            // Security hardening: plain-text permanent API key storage is no longer supported.
            this.settings.fingoApiKey = '';
            if (this.settings.fingoApiStorageType === 'permanent-plain') {
                this.settings.fingoApiStorageType = 'none';
            }
            changed = true;
        }

        const normalizedUserAvatar = this.normalizeUserAvatar(this.settings.userAvatar);
        if (normalizedUserAvatar !== this.settings.userAvatar) {
            this.settings.userAvatar = normalizedUserAvatar;
            changed = true;
        }

        if (changed) {
            Storage.set(Storage.keys.SETTINGS, this.settings);
        }
    },

    restoreStrictCspOnStartup() {
        if (!this.settings) return;
        let changed = false;

        if (this.settings.strictCspEnabled !== true && this.settings.strictCspLastEnabled === true) {
            this.settings.strictCspEnabled = true;
            changed = true;
        }

        // If strict CSP is restored, restore last custom-mode preference too.
        if (
            this.settings.strictCspEnabled === true
            && this.settings.fingoCustomMode !== true
            && this.settings.fingoCustomLastEnabled === true
        ) {
            this.settings.fingoCustomMode = true;
            changed = true;
        }

        if (changed) {
            Storage.set(Storage.keys.SETTINGS, this.settings);
        }
    },

    // 订阅状态变化
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    },

    // 触发事件
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    },

    // 切换视图
    setView(newView) {
        const oldView = this.view;
        this.view = newView;
        this.emit('viewChange', { oldView, newView });
    },

    // 更新设置
    updateSettings(updates) {
        const safeUpdates = { ...(updates || {}) };
        if (Object.prototype.hasOwnProperty.call(safeUpdates, 'enableFluentV2')) {
            safeUpdates.enableFluentV2 = true;
        }
        const turningOffCustomMode = safeUpdates.fingoCustomMode === false
            && this.settings
            && this.settings.fingoCustomMode === true;
        if (Object.prototype.hasOwnProperty.call(safeUpdates, 'userAvatar')) {
            safeUpdates.userAvatar = this.normalizeUserAvatar(safeUpdates.userAvatar);
        }
        if (Object.prototype.hasOwnProperty.call(safeUpdates, 'accentColor')) {
            safeUpdates.accentColor = this.normalizeAccentColor(safeUpdates.accentColor);
        }
        if (Object.prototype.hasOwnProperty.call(safeUpdates, 'wallpaperAccentColor')) {
            safeUpdates.wallpaperAccentColor = this.normalizeAccentColor(safeUpdates.wallpaperAccentColor);
        }
        if (Object.prototype.hasOwnProperty.call(safeUpdates, 'recentAccentColors')) {
            safeUpdates.recentAccentColors = this.normalizeRecentAccentColors(safeUpdates.recentAccentColors);
        }
        if (safeUpdates.strictCspEnabled === true) {
            safeUpdates.strictCspLastEnabled = true;
        } else if (safeUpdates.strictCspEnabled === false) {
            // User explicitly disabled: keep it permanently off.
            safeUpdates.strictCspLastEnabled = false;
        }
        if (safeUpdates.fingoCustomMode === true) {
            if (!Object.prototype.hasOwnProperty.call(safeUpdates, 'fingoCustomLastEnabled')) {
                safeUpdates.fingoCustomLastEnabled = true;
            }
        } else if (safeUpdates.fingoCustomMode === false) {
            if (!Object.prototype.hasOwnProperty.call(safeUpdates, 'fingoCustomLastEnabled')) {
                safeUpdates.fingoCustomLastEnabled = false;
            }
        }
        if (turningOffCustomMode) {
            // Security hardening: when custom mode is disabled, clear all API key material.
            safeUpdates.fingoApiKey = '';
            safeUpdates.fingoApiEncrypted = null;
            safeUpdates.fingoApiStorageType = 'none';
        }

        this.settings = { ...this.settings, ...safeUpdates };
        Storage.set(Storage.keys.SETTINGS, this.settings);
        this.emit('settingsChange', safeUpdates);
        if (turningOffCustomMode) {
            if (typeof window !== 'undefined' && window.Fingo) {
                window.Fingo._sessionApiKey = '';
                window.Fingo._pendingDecryptPromise = null;
            }
            this.emit('fingoApiKeyReady', { storageType: 'none', decrypted: false });
        }
        
        // 应用相关设置
        if (safeUpdates.theme !== undefined) {
            this.applyTheme();
        }
        if (safeUpdates.enableAnimation !== undefined) {
            this.applyAnimationSetting();
        }
        if (safeUpdates.enableBlur !== undefined) {
            this.applyBlurSetting();
        }
        if (safeUpdates.brightness !== undefined) {
            this.applyBrightness();
        }
        if (safeUpdates.volume !== undefined) {
            this.applyVolume();
        }
        if (safeUpdates.enableWindowBlur !== undefined) {
            this.applyWindowBlurSetting();
        }
        if (safeUpdates.enableFluentV2 !== undefined) {
            this.applyFluentV2Setting();
        }
        if (
            safeUpdates.materialType !== undefined ||
            safeUpdates.blurIntensity !== undefined ||
            safeUpdates.wallpaperDesktop !== undefined ||
            safeUpdates.theme !== undefined
        ) {
            this.applyMaterialSetting();
        }
        if (
            safeUpdates.accentColor !== undefined ||
            safeUpdates.wallpaperAccentColor !== undefined ||
            safeUpdates.accentColorReadability !== undefined ||
            safeUpdates.theme !== undefined
        ) {
            this.applyAccentColorSetting();
        }
        if (
            safeUpdates.accentColorAuto === true ||
            (safeUpdates.wallpaperDesktop !== undefined && this.settings.accentColorAuto === true)
        ) {
            this.updateAccentFromWallpaper(this.settings.wallpaperDesktop);
        }
        if (safeUpdates.enableButtonGlowEffect !== undefined) {
            this.applyButtonGlowSetting();
        }
        if (safeUpdates.strictCspEnabled !== undefined) {
            this.applyStrictCspSetting();
        }
    },

    // 更新会话
    updateSession(updates) {
        this.session = { ...this.session, ...updates };
        Storage.set(Storage.keys.SESSION, this.session);
        this.emit('sessionChange', updates);
    },

    // 应用主题
    applyTheme() {
        const theme = this.settings.theme;
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else if (theme === 'light') {
            document.body.classList.remove('dark-mode');
        } else if (theme === 'auto') {
            // 根据系统时间自动切换
            const hour = new Date().getHours();
            if (hour >= 18 || hour < 6) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        }
        // 广播系统主题变更事件，方便应用（如 Office）实时同步
        try {
            const isDarkMode = document.body.classList.contains('dark-mode');
            const payload = {
                theme: isDarkMode ? 'dark' : 'light',
                isDarkMode
            };
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
                window.dispatchEvent(new CustomEvent('systemThemeChanged', { detail: payload }));
            }
        } catch (e) {
            // ignore
        }
    },

    normalizeAccentColor(value, fallback = '#0078d4') {
        const raw = String(value || '').trim();
        const match = raw.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (!match) return fallback;
        const hex = match[1].length === 3
            ? match[1].split('').map((char) => char + char).join('')
            : match[1];
        return `#${hex.toLowerCase()}`;
    },

    normalizeRecentAccentColors(colors) {
        const defaults = ['#d83b01', '#0078d4', '#00b7c3', '#4c4a48', '#e81123'];
        const source = Array.isArray(colors) && colors.length ? colors : defaults;
        const seen = new Set();
        return source
            .map((color) => this.normalizeAccentColor(color, ''))
            .filter((color) => color && !seen.has(color) && seen.add(color))
            .slice(0, 8);
    },

    addRecentAccentColor(color, colors = null) {
        const normalized = this.normalizeAccentColor(color);
        const source = Array.isArray(colors) ? colors : this.settings.recentAccentColors;
        return this.normalizeRecentAccentColors([normalized, ...(source || [])]);
    },

    hexToRgb(hex) {
        const normalized = this.normalizeAccentColor(hex);
        const value = parseInt(normalized.slice(1), 16);
        return {
            r: (value >> 16) & 255,
            g: (value >> 8) & 255,
            b: value & 255
        };
    },

    rgbToHex(r, g, b) {
        const toHex = (value) => Math.max(0, Math.min(255, Math.round(value)))
            .toString(16)
            .padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    },

    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                default:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }

        return { h, s, l };
    },

    hslToRgb(h, s, l) {
        if (s === 0) {
            const gray = l * 255;
            return { r: gray, g: gray, b: gray };
        }

        const hueToRgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        return {
            r: hueToRgb(p, q, h + 1 / 3) * 255,
            g: hueToRgb(p, q, h) * 255,
            b: hueToRgb(p, q, h - 1 / 3) * 255
        };
    },

    createAccentHoverColor(hex) {
        const { r, g, b } = this.hexToRgb(hex);
        const hsl = this.rgbToHsl(r, g, b);
        hsl.s = Math.min(0.92, hsl.s + 0.05);
        hsl.l = document.body && document.body.classList.contains('dark-mode')
            ? Math.min(0.78, hsl.l + 0.08)
            : Math.max(0.26, hsl.l - 0.08);
        const next = this.hslToRgb(hsl.h, hsl.s, hsl.l);
        return this.rgbToHex(next.r, next.g, next.b);
    },

    optimizeAccentColorForReadability(hex) {
        if (this.settings.accentColorReadability !== true || typeof document === 'undefined') {
            return this.normalizeAccentColor(hex);
        }

        const { r, g, b } = this.hexToRgb(hex);
        const hsl = this.rgbToHsl(r, g, b);
        const isDarkMode = document.body && document.body.classList.contains('dark-mode');

        hsl.s = Math.min(0.9, Math.max(0.34, hsl.s + 0.02));
        hsl.l = isDarkMode
            ? Math.min(0.74, hsl.l + (hsl.l < 0.5 ? 0.1 : 0.06))
            : Math.max(0.24, hsl.l - (hsl.l > 0.55 ? 0.1 : 0.06));

        const next = this.hslToRgb(hsl.h, hsl.s, hsl.l);
        return this.rgbToHex(next.r, next.g, next.b);
    },

    applyAccentColorSetting() {
        if (typeof document === 'undefined') return;
        const rawAccent = this.normalizeAccentColor(this.settings.accentColor);
        const accent = this.optimizeAccentColorForReadability(rawAccent);
        const hover = this.createAccentHoverColor(accent);
        const { r, g, b } = this.hexToRgb(accent);
        const targets = [document.documentElement, document.body].filter(Boolean);

        targets.forEach((target) => {
            target.style.setProperty('--accent', accent);
            target.style.setProperty('--accent-raw', rawAccent);
            target.style.setProperty('--accent-hover', hover);
            target.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
            target.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.16)`);
        });
    },

    async updateAccentFromWallpaper(wallpaper) {
        if (typeof document === 'undefined') return null;
        const source = wallpaper || this.settings.wallpaperDesktop;
        if (!source) return null;
        const token = (this._accentExtractionToken || 0) + 1;
        this._accentExtractionToken = token;

        try {
            const color = await this.extractAccentColorFromImage(source);
            if (!color || this._accentExtractionToken !== token || this.settings.accentColorAuto !== true) {
                return color || null;
            }
            this.updateSettings({
                accentColor: color,
                wallpaperAccentColor: color,
                recentAccentColors: this.addRecentAccentColor(color)
            });
            return color;
        } catch (error) {
            console.warn('Accent color extraction failed', error);
            return null;
        }
    },

    async extractAccentColorFromImage(src) {
        const tryImage = async (imageSrc, shouldRevoke = false) => {
            try {
                const img = await this.loadImageForAccentExtraction(imageSrc);
                return this.sampleAccentColorFromImage(img);
            } finally {
                if (shouldRevoke && typeof URL !== 'undefined') URL.revokeObjectURL(imageSrc);
            }
        };

        try {
            return await tryImage(src);
        } catch (firstError) {
            if (!/^https?:\/\//i.test(String(src || '')) || typeof fetch !== 'function' || typeof URL === 'undefined') {
                throw firstError;
            }
            const response = await fetch(src, { mode: 'cors' });
            const blob = await response.blob();
            return tryImage(URL.createObjectURL(blob), true);
        }
    },

    loadImageForAccentExtraction(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            if (!/^data:image\//i.test(String(src || '')) && !/^blob:/i.test(String(src || ''))) {
                img.crossOrigin = 'anonymous';
            }
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    },

    sampleAccentColorFromImage(img) {
        const canvas = document.createElement('canvas');
        const width = Math.max(1, Math.min(112, img.naturalWidth || img.width || 112));
        const height = Math.max(1, Math.min(72, img.naturalHeight || img.height || 72));
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const data = ctx.getImageData(0, 0, width, height).data;
        const buckets = new Map();

        for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            if (a < 170) continue;

            const hsl = this.rgbToHsl(r, g, b);
            if (hsl.l < 0.16 || hsl.l > 0.86 || hsl.s < 0.16) continue;

            const key = [
                Math.round(r / 24) * 24,
                Math.round(g / 24) * 24,
                Math.round(b / 24) * 24
            ].join(',');
            const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, weight: 0, score: 0 };
            const vividness = hsl.s * 2.2 + (1 - Math.abs(hsl.l - 0.52)) * 1.3;
            const weight = 1 + vividness;
            bucket.r += r * weight;
            bucket.g += g * weight;
            bucket.b += b * weight;
            bucket.weight += weight;
            bucket.score += weight;
            buckets.set(key, bucket);
        }

        let best = null;
        buckets.forEach((bucket) => {
            if (!best || bucket.score > best.score) best = bucket;
        });
        if (!best || best.weight <= 0) return null;

        const avg = {
            r: best.r / best.weight,
            g: best.g / best.weight,
            b: best.b / best.weight
        };
        const hsl = this.rgbToHsl(avg.r, avg.g, avg.b);
        hsl.s = Math.max(0.38, Math.min(0.86, hsl.s));
        hsl.l = Math.max(0.32, Math.min(0.62, hsl.l));
        const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
        return this.rgbToHex(rgb.r, rgb.g, rgb.b);
    },

    // 应用动画设置
    applyAnimationSetting() {
        if (this.settings.enableAnimation) {
            document.body.classList.remove('animations-disabled');
            document.body.classList.add('animations-enabled');
        } else {
            document.body.classList.remove('animations-enabled');
            document.body.classList.add('animations-disabled');
        }
    },

    // 应用模糊设置
    applyBlurSetting() {
        if (this.settings.enableBlur) {
            document.body.classList.remove('blur-disabled');
            document.body.classList.add('blur-enabled');
        } else {
            document.body.classList.remove('blur-enabled');
            document.body.classList.add('blur-disabled');
        }
    },

    // 应用亮度设置
    applyBrightness() {
        const brightness = this.settings.brightness || 100;
        document.body.style.filter = `brightness(${brightness}%)`;
    },

    // 应用音量设置
    applyVolume() {
        const rawVolume = Number(this.settings.volume ?? 50);
        const volume = Math.min(100, Math.max(0, Number.isFinite(rawVolume) ? rawVolume : 50));

        const volumeSlider = document.getElementById('volume-slider');
        const volumeValue = document.getElementById('volume-value');
        if (volumeSlider) volumeSlider.value = String(volume);
        if (volumeValue) volumeValue.textContent = String(volume);

        if (typeof MediaApp !== 'undefined' && typeof MediaApp.syncVolumeFromState === 'function') {
            MediaApp.syncVolumeFromState();
        }
    },

    // 应用窗口模糊设置
    applyWindowBlurSetting() {
        if (this.settings.enableWindowBlur === true) {
            document.body.classList.add('window-blur-enabled');
            document.body.classList.remove('window-blur-disabled');
        } else {
            document.body.classList.add('window-blur-disabled');
            document.body.classList.remove('window-blur-enabled');
        }
    },

    // 应用新版 UI 设置
    applyFluentV2Setting() {
        this.settings.enableFluentV2 = true;
        document.body.classList.add('fluent-v2');
    },

    applyMaterialSetting() {
        const material = this.settings.materialType === 'mica' ? 'mica' : 'gaussian';
        const blur = Math.max(12, Math.min(70, Number(this.settings.blurIntensity ?? 40)));
        const micaBlur = 75;
        const materialBlur = material === 'mica' ? micaBlur : blur;
        const wallpaper = this.settings.wallpaperDesktop || 'Theme/Picture/Fluent-2.png';
        const safeWallpaper = String(wallpaper).replace(/\\/g, '/').replace(/"/g, '\\"');

        document.body.classList.remove(
            'material-gaussian',
            'material-mica'
        );
        document.body.classList.add(`material-${material}`);
        document.body.style.setProperty('--v2-blur', `${materialBlur}px`);
        document.body.style.setProperty('--v2-blur-light', `${Math.max(8, Math.round(materialBlur * 0.5))}px`);
        document.body.style.setProperty('--fluent-material-blur', `${materialBlur}px`);
        document.body.style.setProperty('--fluent-material-blur-light', `${Math.max(8, Math.round(materialBlur * 0.5))}px`);
        document.body.style.setProperty('--fluent-mica-blur', `${micaBlur}px`);
        document.body.style.setProperty('--fluent-wallpaper-url', `url("${safeWallpaper}")`);
    },

    applyButtonGlowSetting() {
        const enabled = this.settings.enableButtonGlowEffect !== false;
        if (typeof document === 'undefined' || !document.body) return;
        document.body.classList.toggle('button-glow-enabled', enabled);
        this.ensureButtonGlowListeners();
        if (!enabled) {
            this.clearButtonGlowTarget();
        }
    },

    ensureButtonGlowListeners() {
        if (this._buttonGlowListenersReady === true || typeof document === 'undefined') return;
        this._buttonGlowListenersReady = true;
        this._buttonGlowTarget = null;
        this._buttonGlowSelector = [
            'button',
            'a[href]',
            '[role="button"]',
            '.fluent-btn',
            '.fluent-icon-btn',
            '.fluent-toggle-wrapper',
            '.fluent-select-trigger',
            '.fluent-tab-close',
            '.window-control-btn',
            '.taskbar-btn',
            '.desktop-icon',
            '.start-app',
            '.start-app-item',
            '.start-all-app-row',
            '.recent-item',
            '.start-section-link',
            '.start-footer-btn',
            '.start-power-btn',
            '.fluent-sidebar-item',
            '.settings-advanced-entry',
            '.settings-recommend-item',
            '.settings-recent-item',
            '.network-option-item',
            '.app-list-item',
            '.wallpaper-item'
        ].join(',');

        document.addEventListener('pointermove', (event) => this.handleButtonGlowPointerMove(event), { passive: true });
        document.addEventListener('pointerout', (event) => this.handleButtonGlowPointerOut(event), { passive: true });
        document.addEventListener('pointerdown', (event) => this.handleButtonGlowPointerDown(event), { passive: true });
    },

    getButtonGlowTarget(source) {
        if (!source || !document.body.classList.contains('button-glow-enabled')) return null;
        const toggleWrapper = source.closest ? source.closest('.fluent-toggle-wrapper') : null;
        if (toggleWrapper) {
            if (toggleWrapper.classList.contains('fluent-toggle-disabled')) return null;
            return toggleWrapper.querySelector('.fluent-toggle-track');
        }
        const target = source.closest ? source.closest(this._buttonGlowSelector) : null;
        if (!target || target.closest('.button-glow-disabled')) return null;
        if (target.disabled || target.getAttribute('aria-disabled') === 'true') return null;
        return target;
    },

    prepareButtonGlowTarget(target) {
        if (!target || target.dataset.buttonGlowReady === 'true') return;
        target.dataset.buttonGlowReady = 'true';
        target.classList.add('button-glow-target');
        if (target.classList.contains('fluent-toggle-track')) {
            const surface = document.createElement('span');
            surface.className = 'button-toggle-glow-surface';
            surface.setAttribute('aria-hidden', 'true');
            const edge = document.createElement('span');
            edge.className = 'button-edge-glow';
            edge.setAttribute('aria-hidden', 'true');
            surface.appendChild(edge);
            target.insertBefore(surface, target.firstChild);
            return;
        }
        const edge = document.createElement('span');
        edge.className = 'button-edge-glow';
        edge.setAttribute('aria-hidden', 'true');
        target.appendChild(edge);
    },

    clearButtonGlowTarget(target = this._buttonGlowTarget) {
        if (!target) return;
        target.classList.remove('button-glow-hover');
        if (this._buttonGlowTarget === target) {
            this._buttonGlowTarget = null;
        }
    },

    updateButtonGlowPosition(target, event) {
        const rect = target.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
        target.style.setProperty('--button-glow-x', `${x}px`);
        target.style.setProperty('--button-glow-y', `${y}px`);
    },

    handleButtonGlowPointerMove(event) {
        const target = this.getButtonGlowTarget(event.target);
        if (!target) {
            this.clearButtonGlowTarget();
            return;
        }
        this.prepareButtonGlowTarget(target);
        if (this._buttonGlowTarget && this._buttonGlowTarget !== target) {
            this.clearButtonGlowTarget(this._buttonGlowTarget);
        }
        this._buttonGlowTarget = target;
        this.updateButtonGlowPosition(target, event);
        target.classList.add('button-glow-hover');
    },

    handleButtonGlowPointerOut(event) {
        const target = this._buttonGlowTarget;
        if (!target) return;
        const related = event.relatedTarget;
        if (related && target.contains(related)) return;
        this.clearButtonGlowTarget(target);
    },

    handleButtonGlowPointerDown(event) {
        if (event.button !== undefined && event.button !== 0) return;
        const target = this.getButtonGlowTarget(event.target);
        if (!target) return;
        this.prepareButtonGlowTarget(target);
        this.updateButtonGlowPosition(target, event);
        const rect = target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2.25;
        const ripple = document.createElement('span');
        ripple.className = 'button-glow-ripple';
        ripple.setAttribute('aria-hidden', 'true');
        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;
        ripple.style.left = `${event.clientX - rect.left}px`;
        ripple.style.top = `${event.clientY - rect.top}px`;
        const toggleSurface = target.classList.contains('fluent-toggle-track')
            ? target.querySelector('.button-toggle-glow-surface')
            : null;
        (toggleSurface || target).appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    },

    applyStrictCspSetting() {
        const enabled = this.settings.strictCspEnabled === true;
        document.body.classList.toggle('strict-csp-enabled', enabled);
        if (typeof window !== 'undefined' &&
            window.RealCSP &&
            typeof window.RealCSP.apply === 'function') {
            window.RealCSP.apply(enabled);
        }
        if (typeof window !== 'undefined' &&
            window.StrictScriptGuard &&
            typeof window.StrictScriptGuard.setEnabled === 'function') {
            window.StrictScriptGuard.setEnabled(enabled);
        }
    },

    // 添加通知
    addNotification(notification) {
        const newNotification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            time: new Date().toISOString(),
            type: 'info',
            ...notification
        };
        this.notifications.unshift(newNotification);
        
        // 最多保留50条通知
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }
        
        Storage.set(Storage.keys.NOTIFICATIONS, this.notifications);
        this.emit('notificationAdd', newNotification);
        return newNotification.id;
    },

    // 删除通知
    removeNotification(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        Storage.set(Storage.keys.NOTIFICATIONS, this.notifications);
        this.emit('notificationRemove', id);
    },

    // 清空所有通知
    clearNotifications() {
        this.notifications = [];
        Storage.set(Storage.keys.NOTIFICATIONS, []);
        this.emit('notificationsClear');
    },

    // 文件系统操作
    updateFS(newFS) {
        this.fs = newFS;
        Storage.set(Storage.keys.FS, this.fs);
        this.emit('fsChange', newFS);
    },

    // 查找文件/文件夹
    findNode(id, node = this.fs.root) {
        if (node.id === id) return node;
        if (node.children) {
            for (const child of node.children) {
                const result = this.findNode(id, child);
                if (result) return result;
            }
        }
        return null;
    },

    // 查找父节点
    findParentNode(id, node = this.fs.root, parent = null) {
        if (!node) return null;
        if (node.id === id) return parent;
        if (node.children) {
            for (const child of node.children) {
                const result = this.findParentNode(id, child, node);
                if (result) return result;
            }
        }
        return null;
    },

    // 添加应用到运行列表
    addRunningApp(appId) {
        this.runningApps.add(appId);
        this.emit('appStart', appId);
    },

    recordAppUsage(appId, timestamp = Date.now()) {
        if (!appId) return;
        if (!this.appUsage || typeof this.appUsage !== 'object') {
            this.appUsage = {};
        }
        this.appUsage[appId] = timestamp;
        Storage.set(Storage.keys.APP_USAGE, this.appUsage);
        this.emit('appUsageChange', { appId, lastUsed: timestamp });
    },

    getAppLastUsed(appId) {
        const value = this.appUsage && this.appUsage[appId];
        if (!value) return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    },

    // 从运行列表移除应用
    removeRunningApp(appId) {
        this.runningApps.delete(appId);
        this.emit('appStop', appId);
    },

    // 重启系统 - 显示重启覆盖层 6s，然后进入开机界面
    restart() {
        this.updateSession({ isLoggedIn: false });
        this.windows = [];
        this.runningApps.clear();
        this.emit('powerAction', { action: 'restart' });
    },

    // 关机 - 显示关机覆盖层 5s，然后关闭网页
    shutdown() {
        this.updateSession({ isLoggedIn: false });
        this.windows = [];
        this.runningApps.clear();
        this.emit('powerAction', { action: 'shutdown' });
    },

    // 注销 - 显示注销覆盖层 3s，然后进入锁屏
    logout() {
        this.updateSession({ isLoggedIn: false });
        this.windows = [];
        this.runningApps.clear();
        this.emit('powerAction', { action: 'logout' });
    },

    // 锁屏 - 直接进入锁屏
    lock() {
        this.setView('lock');
    }
};
