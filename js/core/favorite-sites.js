/**
 * Favorite website data and launch behavior for widgets and Browser.
 */
const FavoriteSites = {
    STORAGE_KEY: 'fluentos.favoriteSites',
    META_CACHE_KEY: 'fluentos.favoriteSiteMeta',
    ASK_PREF_KEY: 'fluentos.favoriteSiteAskPrefs',
    META_TTL: 7 * 24 * 60 * 60 * 1000,

    defaults: [
        'https://chatgpt.com/',
        'https://www.bilibili.com/',
        'https://www.baidu.com/',
        'https://www.taobao.com/',
        'https://www.jd.com/',
        'https://music.163.com/',
        'https://weibo.com/',
        'https://www.canva.com/',
        'https://chat.deepseek.com/',
        'https://chat.qwen.ai/',
        'https://www.kimi.com/',
        'https://mail.qq.com/',
        'https://www.ithome.com/',
        'https://www.douyin.com/',
        'https://www.cnblogs.com/',
        'https://www.photopea.com/'
    ],

    _memory: { sites: null, meta: null, prefs: null },

    init() {
        this.ensureDefaults();
    },

    ensureDefaults() {
        if (localStorage.getItem(this.STORAGE_KEY)) return;
        const sites = this.defaults.map((url, index) => ({
            id: `site-${index + 1}`,
            url,
            createdAt: new Date().toISOString()
        }));
        this.saveSites(sites);
    },

    readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    },

    writeJSON(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    getSites() {
        if (this._memory.sites) return this._memory.sites;
        this.ensureDefaults();
        const sites = this.readJSON(this.STORAGE_KEY, []);
        this._memory.sites = Array.isArray(sites) ? sites.filter(site => site && site.url) : [];
        return this._memory.sites;
    },

    saveSites(sites) {
        const clean = (Array.isArray(sites) ? sites : [])
            .filter(site => site && site.url)
            .map(site => ({
                id: site.id || `site-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                url: this.normalizeInputUrl(site.url),
                title: site.title || '',
                icon: site.icon || '',
                createdAt: site.createdAt || new Date().toISOString()
            }));
        this._memory.sites = clean;
        this.writeJSON(this.STORAGE_KEY, clean);
        return clean;
    },

    normalizeInputUrl(input) {
        let value = String(input || '').trim();
        if (!value) return '';
        if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
        try {
            const url = new URL(value);
            url.hash = '';
            return url.href;
        } catch {
            return value;
        }
    },

    getOriginKey(input) {
        try {
            const url = new URL(this.normalizeInputUrl(input));
            const host = url.hostname.toLowerCase().replace(/^www\./, '');
            return `${url.protocol}//${host}`;
        } catch {
            return String(input || '').trim().toLowerCase();
        }
    },

    sameSource(a, b) {
        return this.getOriginKey(a) === this.getOriginKey(b);
    },

    getHostLabel(input) {
        try {
            return new URL(this.normalizeInputUrl(input)).hostname.replace(/^www\./, '');
        } catch {
            return String(input || '').replace(/^https?:\/\//i, '').split('/')[0] || 'Website';
        }
    },

    getMetaCache() {
        if (this._memory.meta) return this._memory.meta;
        const meta = this.readJSON(this.META_CACHE_KEY, {});
        this._memory.meta = meta && typeof meta === 'object' ? meta : {};
        return this._memory.meta;
    },

    saveMetaCache(meta) {
        this._memory.meta = meta;
        this.writeJSON(this.META_CACHE_KEY, meta);
    },

    getPrefs() {
        if (this._memory.prefs) return this._memory.prefs;
        const prefs = this.readJSON(this.ASK_PREF_KEY, {});
        this._memory.prefs = prefs && typeof prefs === 'object' ? prefs : {};
        return this._memory.prefs;
    },

    setPref(originKey, action) {
        const prefs = this.getPrefs();
        prefs[originKey] = action;
        this._memory.prefs = prefs;
        this.writeJSON(this.ASK_PREF_KEY, prefs);
    },

    getCatalogApps() {
        if (typeof AppShop !== 'undefined' && AppShop.refreshCatalog) AppShop.refreshCatalog();
        if (typeof AppShop !== 'undefined' && Array.isArray(AppShop.apps)) return AppShop.apps;
        return Array.isArray(window.FluentPWACatalog) ? window.FluentPWACatalog : [];
    },

    findAppForUrl(url) {
        const apps = this.getCatalogApps();
        return apps.find(app => app && app.url && this.sameSource(app.url, url)) || null;
    },

    iconForApp(app) {
        if (!app) return '';
        if (typeof AppShop !== 'undefined' && AppShop.getIconPath) return AppShop.getIconPath(app.icon);
        return app.icon && app.icon.includes('/') ? app.icon : `Theme/Icon/App_icon/${app.icon || 'app_gallery.png'}`;
    },

    fallbackIcon(url) {
        const host = this.getHostLabel(url);
        return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
    },

    async fetchSiteMeta(url) {
        const normalizedUrl = this.normalizeInputUrl(url);
        const originKey = this.getOriginKey(normalizedUrl);
        const cache = this.getMetaCache();
        const cached = cache[originKey];
        if (cached && Date.now() - cached.time < this.META_TTL) return cached.value;

        const app = this.findAppForUrl(normalizedUrl);
        if (app) {
            const value = {
                title: app.name || this.getHostLabel(normalizedUrl),
                icon: this.iconForApp(app),
                appId: app.id,
                fromAppShop: true
            };
            cache[originKey] = { time: Date.now(), value };
            this.saveMetaCache(cache);
            return value;
        }

        const value = {
            title: this.getHostLabel(normalizedUrl),
            icon: this.fallbackIcon(normalizedUrl),
            appId: null,
            fromAppShop: false
        };

        try {
            const html = await this.fetchHtml(normalizedUrl);
            const parsed = this.parseHtmlMeta(html, normalizedUrl);
            if (parsed.title) value.title = parsed.title;
            if (parsed.icon) value.icon = parsed.icon;
        } catch (err) {
            console.info('[FavoriteSites] metadata fallback used', normalizedUrl, err);
        }

        cache[originKey] = { time: Date.now(), value };
        this.saveMetaCache(cache);
        return value;
    },

    async fetchHtml(url) {
        const endpoint = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const res = await fetch(endpoint, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
    },

    parseHtmlMeta(html, pageUrl) {
        const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
        const title = (
            doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
            doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
            doc.querySelector('title')?.textContent ||
            ''
        ).trim();

        const iconEl = doc.querySelector(
            'link[rel~="apple-touch-icon"],link[rel~="icon"],link[rel="shortcut icon"]'
        );
        const iconHref = iconEl?.getAttribute('href') || '';
        let icon = '';
        if (iconHref) {
            try {
                icon = new URL(iconHref, pageUrl).href;
            } catch {
                icon = '';
            }
        }
        return { title, icon };
    },

    async getDisplaySites(limit = 8) {
        const sites = this.getSites().slice(0, limit);
        const entries = await Promise.all(sites.map(async (site) => {
            const url = this.normalizeInputUrl(site.url);
            const meta = await this.fetchSiteMeta(url);
            return {
                ...site,
                url,
                title: site.title || meta.title || this.getHostLabel(url),
                icon: site.icon || meta.icon || this.fallbackIcon(url),
                appId: meta.appId || null,
                fromAppShop: meta.fromAppShop === true
            };
        }));
        return entries;
    },

    async addFromUrl(url, title = '') {
        const normalizedUrl = this.normalizeInputUrl(url);
        if (!normalizedUrl) return null;
        const sites = this.getSites();
        const originKey = this.getOriginKey(normalizedUrl);
        const existing = sites.find(site => this.getOriginKey(site.url) === originKey);
        const meta = await this.fetchSiteMeta(normalizedUrl);
        if (existing) {
            existing.url = normalizedUrl;
            existing.title = title || existing.title || meta.title;
            this.saveSites(sites);
            return existing;
        }
        const site = {
            id: `site-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            url: normalizedUrl,
            title: title || meta.title || this.getHostLabel(normalizedUrl),
            icon: meta.fromAppShop ? meta.icon : '',
            createdAt: new Date().toISOString()
        };
        sites.unshift(site);
        this.saveSites(sites);
        return site;
    },

    removeSite(siteId) {
        const sites = this.getSites();
        const next = sites.filter(site => site.id !== siteId);
        this.saveSites(next);
        return next;
    },

    openExternal(url) {
        window.open(this.normalizeInputUrl(url), '_blank', 'noopener,noreferrer');
    },

    openInternal(url) {
        WindowManager.openApp('browser');
        setTimeout(() => {
            if (window.BrowserApp && typeof BrowserApp.navigate === 'function') {
                BrowserApp.navigate(this.normalizeInputUrl(url));
            }
        }, 450);
    },

    installApp(app) {
        if (!app) return;
        if (typeof AppShop !== 'undefined' && AppShop.installApp) {
            AppShop.installApp(app.id);
        } else if (typeof WindowManager !== 'undefined') {
            WindowManager.openApp('appshop');
        }
    },

    openSite(site, options = {}) {
        const surface = options.surface || 'desktop';
        const url = this.normalizeInputUrl(site?.url || site);
        if (!url) return;

        if (surface === 'lock') {
            this.openExternal(url);
            return;
        }

        const app = this.findAppForUrl(url);
        if (!app) {
            this.openExternal(url);
            return;
        }

        if (typeof AppShop !== 'undefined' && AppShop.isInstalled?.(app.id)) {
            AppShop.openApp(app);
            return;
        }

        const originKey = this.getOriginKey(url);
        const remembered = this.getPrefs()[originKey];
        if (remembered === 'install') {
            this.installApp(app);
            return;
        }
        if (remembered === 'browser') {
            this.openInternal(url);
            return;
        }

        this.showAppAvailableDialog(app, url, originKey);
    },

    showAppAvailableDialog(app, url, originKey) {
        if (typeof FluentUI === 'undefined' || !FluentUI.Dialog) {
            this.openInternal(url);
            return;
        }

        const name = app?.name || this.getHostLabel(url);
        const checkboxId = `favorite-site-remember-${Date.now()}`;
        let rememberChoice = false;
        const dialogRef = FluentUI.Dialog({
            type: 'info',
            title: 'App Shop 中提供相关 App',
            content: `
                <div class="favorite-site-dialog">
                    <p>“${this.escapeHtml(name)}”已在 App Shop 中提供。你想立即安装，还是继续使用内置浏览器打开这个网站？</p>
                    <label class="favorite-site-remember">
                        <input id="${checkboxId}" type="checkbox">
                        <span>下次不再提问</span>
                    </label>
                </div>
            `,
            buttons: [
                { text: '使用内置浏览器打开', variant: 'secondary', value: 'browser' },
                { text: '立即安装', variant: 'primary', value: 'install' }
            ],
            onClose: (result) => {
                if (result !== 'install' && result !== 'browser') return;
                if (rememberChoice) this.setPref(originKey, result);
                if (result === 'install') this.installApp(app);
                else this.openInternal(url);
            }
        });
        dialogRef?.dialog?.querySelector(`#${checkboxId}`)?.addEventListener('change', (event) => {
            rememberChoice = event.target.checked === true;
        });
    },

    escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }
};

if (typeof window !== 'undefined') {
    window.FavoriteSites = FavoriteSites;
}
