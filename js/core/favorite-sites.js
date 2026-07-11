/**
 * Favorite website data and launch behavior for widgets and Browser.
 */
const FavoriteSites = {
    STORAGE_KEY: 'fluentos.favoriteSites',
    META_CACHE_KEY: 'fluentos.favoriteSiteMeta',
    ASK_PREF_KEY: 'fluentos.favoriteSiteAskPrefs',
    MIGRATION_KEY: 'fluentos.favoriteSites.recommendationsMigrated.v1',
    META_TTL: 7 * 24 * 60 * 60 * 1000,

    recommendations: [
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
        this.migrateLegacyDefaults();
    },

    ensureDefaults() {
        if (localStorage.getItem(this.STORAGE_KEY) === null) this.saveSites([]);
    },

    migrateLegacyDefaults() {
        if (localStorage.getItem(this.MIGRATION_KEY) === '1') {
            this.ensureDefaults();
            return;
        }
        const legacy = this.readJSON(this.STORAGE_KEY, []);
        const sites = Array.isArray(legacy) ? legacy : [];
        const migrated = sites.filter(site => {
            if (!site || !site.url) return false;
            const match = String(site.id || '').match(/^site-(\d+)$/);
            if (!match) return true;
            const index = Number(match[1]) - 1;
            const recommendation = this.recommendations[index];
            const isUntouchedSeed = recommendation &&
                this.normalizeInputUrl(site.url) === this.normalizeInputUrl(recommendation) &&
                !String(site.title || '').trim() && !String(site.icon || '').trim();
            return !isUntouchedSeed;
        });
        this.saveSites(migrated);
        localStorage.setItem(this.MIGRATION_KEY, '1');
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
        const normalized = (Array.isArray(sites) ? sites : [])
            .filter(site => site && site.url)
            .map(site => ({
                id: site.id || `site-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                url: this.normalizeInputUrl(site.url),
                title: site.title || '',
                icon: site.icon || '',
                createdAt: site.createdAt || new Date().toISOString()
            }));
        const seen = new Set();
        const clean = normalized.filter(site => {
            const key = this.getUrlKey(site.url);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        this._memory.sites = clean;
        this.writeJSON(this.STORAGE_KEY, clean);
        window.dispatchEvent(new CustomEvent('fluent-favorite-sites-change', { detail: { sites: clean } }));
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

    getUrlKey(input) {
        try {
            return new URL(this.normalizeInputUrl(input)).href;
        } catch {
            return '';
        }
    },

    isHttpUrl(input) {
        try {
            const url = new URL(this.normalizeInputUrl(input));
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
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

    async resolveDisplaySite(site, extra = {}) {
        const url = this.normalizeInputUrl(site.url);
        let meta = null;
        if (!site.title || !site.icon) meta = await this.fetchSiteMeta(url);
        return {
            ...site,
            ...extra,
            url,
            title: site.title || meta?.title || this.getHostLabel(url),
            icon: site.icon || meta?.icon || this.fallbackIcon(url),
            appId: meta?.appId || null,
            fromAppShop: meta?.fromAppShop === true
        };
    },

    async getDisplaySites(limit = 8) {
        const sites = this.getSites().slice(0, limit);
        return Promise.all(sites.map(site => this.resolveDisplaySite(site, { isRecommended: false })));
    },

    async getWidgetDisplaySites(limit = 8) {
        const max = Math.max(0, Number(limit) || 0);
        const userSites = this.getSites().slice(0, max);
        const output = await Promise.all(userSites.map(site =>
            this.resolveDisplaySite(site, { isRecommended: false })
        ));
        if (output.length >= max) return output;

        const usedOrigins = new Set(userSites.map(site => this.getOriginKey(site.url)));
        const recommendations = this.recommendations
            .filter(url => !usedOrigins.has(this.getOriginKey(url)))
            .slice(0, max - output.length)
            .map((url, index) => ({
                id: `recommended-${index}-${this.getHostLabel(url)}`,
                url,
                title: '',
                icon: '',
                createdAt: ''
            }));
        const resolved = await Promise.all(recommendations.map(site =>
            this.resolveDisplaySite(site, { isRecommended: true })
        ));
        return output.concat(resolved);
    },

    async addFromUrl(url, title = '') {
        const normalizedUrl = this.normalizeInputUrl(url);
        if (!normalizedUrl || !this.isHttpUrl(normalizedUrl)) throw new Error('Invalid website URL');
        const sites = this.getSites();
        const urlKey = this.getUrlKey(normalizedUrl);
        const existing = sites.find(site => this.getUrlKey(site.url) === urlKey);
        const meta = await this.fetchSiteMeta(normalizedUrl);
        if (existing) {
            existing.url = normalizedUrl;
            existing.title = meta.title || title || existing.title || this.getHostLabel(normalizedUrl);
            existing.icon = meta.icon || existing.icon || this.fallbackIcon(normalizedUrl);
            this.saveSites(sites);
            return existing;
        }
        const site = {
            id: `site-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            url: normalizedUrl,
            title: meta.title || title || this.getHostLabel(normalizedUrl),
            icon: meta.icon || this.fallbackIcon(normalizedUrl),
            createdAt: new Date().toISOString()
        };
        sites.unshift(site);
        this.saveSites(sites);
        return site;
    },

    parseBookmarksHtml(html) {
        const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
        const anchors = Array.from(doc.querySelectorAll('a[href]'));
        if (!anchors.length) throw new Error('No bookmarks found');
        return anchors.map(anchor => ({
            url: anchor.getAttribute('href') || '',
            title: (anchor.textContent || '').trim(),
            icon: anchor.getAttribute('icon') || anchor.getAttribute('icon_uri') || ''
        }));
    },

    normalizeImportedIcon(icon, url) {
        const value = String(icon || '').trim();
        if (/^https?:\/\//i.test(value)) return value;
        if (/^data:image\//i.test(value) && value.length <= 65536) return value;
        return this.fallbackIcon(url);
    },

    selectBookmarksFile(options = {}) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.html,.htm,text/html';
        input.hidden = true;
        input.addEventListener('change', () => {
            const file = input.files?.[0] || null;
            input.remove();
            if (!file) return;
            setTimeout(async () => {
                const result = await this.importBookmarksFile(file);
                if (typeof options.onComplete === 'function') options.onComplete(result);
            }, 0);
        }, { once: true });
        input.addEventListener('cancel', () => input.remove(), { once: true });
        document.body.appendChild(input);
        input.click();
    },

    async importBookmarksFile(file) {
        try {
            const html = await file.text();
            const entries = this.parseBookmarksHtml(html);
            return await this.importBookmarkEntries(entries);
        } catch (error) {
            console.error('[FavoriteSites] bookmark import failed', error);
            this.notifyImport('收藏导入失败', '未能读取有效的浏览器书签 HTML 文件。', 'error');
            return { added: 0, skipped: 0, error };
        }
    },

    async importBookmarkEntries(entries) {
        const sites = this.getSites().slice();
        const seen = new Set(sites.map(site => this.getUrlKey(site.url)));
        let added = 0;
        let skipped = 0;
        const pending = [];

        (Array.isArray(entries) ? entries : []).forEach(entry => {
            const url = this.normalizeInputUrl(entry?.url);
            const key = this.getUrlKey(url);
            if (!key || !this.isHttpUrl(url) || seen.has(key)) {
                skipped += 1;
                return;
            }
            seen.add(key);
            pending.push({
                id: `site-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                url,
                title: String(entry?.title || '').trim() || this.getHostLabel(url),
                icon: this.normalizeImportedIcon(entry?.icon, url),
                createdAt: new Date().toISOString()
            });
        });

        const batchSize = 20;
        for (let index = 0; index < pending.length; index += batchSize) {
            const batch = pending.slice(index, index + batchSize);
            sites.push(...batch);
            added += batch.length;
            this.saveSites(sites);
            await new Promise(resolve => setTimeout(resolve, 24));
        }

        this.notifyImport(
            '收藏导入完成',
            `已导入 ${added} 个收藏，跳过 ${skipped} 个重复或无效项目。`,
            'success'
        );
        return { added, skipped };
    },

    notifyImport(title, message, type = 'info') {
        if (typeof State !== 'undefined' && State.addNotification) {
            State.addNotification({ title, message, type });
        } else if (window.FluentUI?.Toast) FluentUI.Toast({ title, message, type });
    },

    openAddDialog(options = {}) {
        document.querySelector('.favorite-add-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.className = 'favorite-add-overlay';
        overlay.innerHTML = `
            <div class="favorite-add-dialog" role="dialog" aria-modal="true" aria-labelledby="favorite-add-title">
                <button class="favorite-add-close" type="button" title="关闭" aria-label="关闭">
                    <img src="Theme/Icon/Symbol_icon/stroke/Multiply.svg" alt="">
                </button>
                <div class="favorite-add-head">
                    <span class="favorite-add-head-icon"><img src="Theme/Icon/Symbol_icon/stroke/Bookmark.svg" alt=""></span>
                    <span>
                        <strong id="favorite-add-title">收藏网站</strong>
                        <small>添加显示在浏览器主页和收藏小组件中的快捷网站。</small>
                    </span>
                </div>
                <div class="favorite-add-row">
                    <input class="favorite-add-input" type="url" placeholder="输入网址，例如 example.com" spellcheck="false">
                    <button class="favorite-add-submit" type="button">添加</button>
                </div>
                <div class="favorite-add-error" role="alert" aria-live="polite"></div>
                <button class="favorite-import-button" type="button">
                    <img src="Theme/Icon/Symbol_icon/stroke/Bookmark Download.svg" alt="">
                    <span>导入收藏夹</span>
                </button>
            </div>`;

        const dialog = overlay.querySelector('.favorite-add-dialog');
        const input = overlay.querySelector('.favorite-add-input');
        const submit = overlay.querySelector('.favorite-add-submit');
        const error = overlay.querySelector('.favorite-add-error');
        let closed = false;
        const close = () => {
            if (closed) return;
            closed = true;
            document.removeEventListener('keydown', onKeyDown);
            overlay.classList.add('closing');
            setTimeout(() => overlay.remove(), 180);
        };
        const onKeyDown = event => {
            if (event.key === 'Escape') close();
        };
        const add = async () => {
            const url = input.value.trim();
            error.textContent = '';
            if (!url || !this.isHttpUrl(url)) {
                error.textContent = '请输入有效的网站地址。';
                input.focus();
                return;
            }
            submit.disabled = true;
            submit.textContent = '添加中…';
            try {
                const site = await this.addFromUrl(url);
                if (typeof options.onAdded === 'function') options.onAdded(site);
                close();
            } catch (err) {
                console.error('[FavoriteSites] add favorite failed', err);
                error.textContent = '添加失败，请检查网址后重试。';
                submit.disabled = false;
                submit.textContent = '添加';
            }
        };

        overlay.querySelector('.favorite-add-close').addEventListener('click', close);
        overlay.addEventListener('pointerdown', event => {
            if (event.target === overlay) close();
        });
        dialog.addEventListener('pointerdown', event => event.stopPropagation());
        submit.addEventListener('click', add);
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') add();
        });
        overlay.querySelector('.favorite-import-button').addEventListener('click', () => {
            this.selectBookmarksFile(options.importOptions || {});
            close();
        });
        document.addEventListener('keydown', onKeyDown);
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('visible'));
        setTimeout(() => input.focus(), 40);
        return { overlay, close };
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
