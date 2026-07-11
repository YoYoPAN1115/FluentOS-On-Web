/**
 * Browser application
 */

const BrowserApp = {
    container: null,
    tabs: [],
    activeTabId: null,
    tabIdCounter: 0,
    SEARCH_PAGE_PREFIX: 'fluent-search://results/',

    init(windowId) {
        const contentContainer = document.querySelector(`#${windowId}-content`);
        if (!contentContainer) {
            console.error('[BrowserApp] content container not found', windowId);
            return;
        }

        this.container = contentContainer;
        this.tabs = [];
        this.activeTabId = null;
        this.tabIdCounter = 0;

        this.render();
        this.createNewTab();

        if (!this._favoriteSitesChangeHandler) {
            this._favoriteSitesChangeHandler = () => {
                if (this.getActiveTab()?.url === 'about:blank') this.renderStartPageFavorites();
                this.updateBookmarkButton();
            };
            window.addEventListener('fluent-favorite-sites-change', this._favoriteSitesChangeHandler);
        }
    },

    render() {
        this.container.innerHTML = `
            <div class="browser-app">
                <div class="browser-header">
                    <div class="browser-navbar">
                        <div class="browser-nav-controls">
                            <button class="browser-nav-btn" id="browser-back" title="${t('browser.back')}" disabled>
                                <img src="Theme/Icon/Symbol_icon/stroke/Arrow Left.svg" alt="${t('browser.back')}">
                            </button>
                            <button class="browser-nav-btn" id="browser-forward" title="${t('browser.forward')}" disabled>
                                <img src="Theme/Icon/Symbol_icon/stroke/Arrow Right.svg" alt="${t('browser.forward')}">
                            </button>
                            <button class="browser-nav-btn" id="browser-refresh" title="${t('browser.refresh')}">
                                <img src="Theme/Icon/Symbol_icon/stroke/Refresh.svg" alt="${t('browser.refresh')}">
                            </button>
                            <button class="browser-nav-btn" id="browser-home" title="${t('browser.home')}">
                                <img src="Theme/Icon/Symbol_icon/stroke/Home.svg" alt="${t('browser.home')}">
                            </button>
                        </div>

                        <div class="browser-address-bar">
                            <img src="Theme/Icon/Symbol_icon/stroke/Search.svg" alt="" class="address-bar-icon">
                            <input type="text" id="browser-address" placeholder="${t('browser.search.placeholder')}" spellcheck="false">
                        </div>

                        <div class="browser-tools">
                            <button class="browser-tool-btn" id="browser-bookmark" title="${t('browser.bookmark')}" aria-pressed="false">
                                <img src="Theme/Icon/Symbol_icon/stroke/Star.svg" alt="${t('browser.bookmark')}">
                            </button>
                        </div>
                    </div>
                </div>

                <div class="browser-content" id="browser-content"></div>
            </div>
        `;

        this.addStyles();
        this.bindEvents();
        this.renderTabs();
    },

    bindEvents() {
        const backBtn = this.container.querySelector('#browser-back');
        const forwardBtn = this.container.querySelector('#browser-forward');
        const refreshBtn = this.container.querySelector('#browser-refresh');
        const homeBtn = this.container.querySelector('#browser-home');
        const addressBar = this.container.querySelector('#browser-address');
        const bookmarkBtn = this.container.querySelector('#browser-bookmark');

        backBtn?.addEventListener('click', () => this.goBack());
        forwardBtn?.addEventListener('click', () => this.goForward());
        refreshBtn?.addEventListener('click', () => this.refresh());
        homeBtn?.addEventListener('click', () => this.goHome());

        addressBar?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.navigate(addressBar.value);
            }
        });

        bookmarkBtn?.addEventListener('click', async () => {
            const tab = this.getActiveTab();
            if (!tab || !tab.url || tab.url === 'about:blank') {
                State.addNotification({
                    title: t('browser.title'),
                    message: '当前页面无法收藏',
                    type: 'info'
                });
                return;
            }

            try {
                if (!window.FavoriteSites) throw new Error('FavoriteSites unavailable');
                bookmarkBtn.disabled = true;
                const existing = this.getFavoriteForUrl(tab.url);
                if (existing) {
                    FavoriteSites.removeSite(existing.id);
                } else {
                    await FavoriteSites.addFromUrl(tab.url, tab.title);
                }
                if (typeof Widgets !== 'undefined' && Widgets.renderAll) Widgets.renderAll();
                const message = existing
                    ? `已取消收藏 ${tab.title || tab.url}`
                    : `已收藏 ${tab.title || tab.url}`;
                if (window.FluentUI && FluentUI.Toast) {
                    FluentUI.Toast({
                        title: t('browser.title'),
                        message,
                        type: 'success'
                    });
                } else {
                    State.addNotification({
                        title: t('browser.title'),
                        message,
                        type: 'success'
                    });
                }
            } catch (error) {
                State.addNotification({
                    title: t('browser.title'),
                    message: '收藏失败，请稍后重试',
                    type: 'error'
                });
            } finally {
                bookmarkBtn.disabled = false;
                this.updateBookmarkButton();
            }
        });

        if (window.SearchHistory && addressBar) {
            SearchHistory.bindPopover(addressBar, {
                anchor: addressBar.closest('.browser-address-bar'),
                className: 'browser-search-history',
                minWidth: 360,
                onSelect: query => this.navigate(query)
            });
        }
    },

    getWindowElement() {
        return this.container?.closest('.window') || null;
    },

    ensureTitlebarTabsHost() {
        const windowElement = this.getWindowElement();
        const titlebar = windowElement?.querySelector('.window-titlebar');
        const controls = titlebar?.querySelector('.window-controls');
        if (!titlebar || !controls) return null;

        let host = titlebar.querySelector('.browser-titlebar-tabs-host');
        if (!host) {
            host = document.createElement('div');
            host.className = 'browser-titlebar-tabs-host';
            titlebar.insertBefore(host, controls);
        }
        return host;
    },

    escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    },

    buildSearchResultsUrl(query) {
        return `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
    },

    isSearchResultsUrl(url) {
        return typeof url === 'string' && url.startsWith(this.SEARCH_PAGE_PREFIX);
    },

    getSearchQueryFromUrl(url) {
        if (!this.isSearchResultsUrl(url)) return '';
        return decodeURIComponent(url.slice(this.SEARCH_PAGE_PREFIX.length));
    },

    getSearchResultsTitle(query) {
        return `Search: ${query}`;
    },

    createNewTab(url = null) {
        const tabId = `tab-${this.tabIdCounter++}`;
        const tab = {
            id: tabId,
            title: t('browser.new-tab'),
            url: 'about:blank',
            history: [],
            historyIndex: -1
        };

        this.tabs.push(tab);
        this.switchTab(tabId);

        if (url) {
            this.navigate(url);
        } else {
            this.showStartPage();
        }
    },

    renderTabs() {
        const tabsContainer = this.ensureTitlebarTabsHost();
        if (!tabsContainer) return;

        tabsContainer.innerHTML = '';
        const tabBar = FluentUI.TabBar({
            tabs: this.tabs.map((tab) => ({
                id: tab.id,
                label: tab.title,
                icon: 'Globe',
                closable: true
            })),
            activeTab: this.activeTabId,
            onTabChange: (tabId) => this.switchTab(tabId),
            onTabClose: (tabId) => this.closeTab(tabId),
            showAddButton: true,
            onAddTab: () => this.createNewTab(),
            className: 'browser-titlebar-tabs'
        });
        tabsContainer.appendChild(tabBar);
        tabsContainer.querySelectorAll('.fluent-tab, .fluent-tab-close, .fluent-tabbar-add').forEach((node) => {
            node.dataset.noWindowDrag = 'true';
        });
    },

    switchTab(tabId) {
        this.activeTabId = tabId;
        this.renderTabs();
        this.renderContent();
        this.updateNavButtons();
        this.updateAddressBar();
    },

    closeTab(tabId) {
        const index = this.tabs.findIndex((tab) => tab.id === tabId);
        if (index === -1) return;

        this.tabs.splice(index, 1);

        if (tabId === this.activeTabId) {
            if (this.tabs.length > 0) {
                const newIndex = Math.max(0, index - 1);
                this.switchTab(this.tabs[newIndex].id);
            } else {
                this.createNewTab();
            }
        }

        this.renderTabs();
    },

    getActiveTab() {
        return this.tabs.find((tab) => tab.id === this.activeTabId) || null;
    },

    getFavoriteForUrl(url) {
        if (!window.FavoriteSites || !url || url === 'about:blank') return null;
        const urlKey = FavoriteSites.getUrlKey(url);
        if (!urlKey) return null;
        return FavoriteSites.getSites().find(site => FavoriteSites.getUrlKey(site.url) === urlKey) || null;
    },

    updateBookmarkButton() {
        const button = this.container?.querySelector('#browser-bookmark');
        const image = button?.querySelector('img');
        if (!button || !image) return;

        const tab = this.getActiveTab();
        const canBookmark = Boolean(tab?.url && tab.url !== 'about:blank');
        const isBookmarked = canBookmark && Boolean(this.getFavoriteForUrl(tab.url));
        const label = isBookmarked ? '取消收藏' : t('browser.bookmark');

        button.classList.toggle('bookmarked', isBookmarked);
        button.setAttribute('aria-pressed', String(isBookmarked));
        button.title = label;
        image.src = `Theme/Icon/Symbol_icon/${isBookmarked ? 'fill' : 'stroke'}/Star.svg`;
        image.alt = label;
    },

    navigate(input) {
        const tab = this.getActiveTab();
        if (!tab) return;

        let url = String(input || '').trim();
        if (!url) return;

        if (url === 'about:blank') {
            this.showStartPage();
            return;
        }

        const looksLikeUrl = url.includes('.') &&
            !url.includes(' ') &&
            (url.startsWith('http://') || url.startsWith('https://') || /^[\w-]+\./.test(url));

        if (looksLikeUrl) {
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = `https://${url}`;
            }
        } else {
            if (window.SearchHistory) SearchHistory.add(url);
            url = this.buildSearchResultsUrl(url);
        }

        tab.historyIndex += 1;
        tab.history = tab.history.slice(0, tab.historyIndex);
        tab.history.push(url);
        tab.url = url;

        try {
            if (this.isSearchResultsUrl(url)) {
                tab.title = this.getSearchResultsTitle(this.getSearchQueryFromUrl(url));
            } else {
                const urlObj = new URL(url);
                tab.title = urlObj.hostname.replace('www.', '') || t('browser.new-tab');
            }
        } catch (error) {
            tab.title = t('browser.new-tab');
        }

        this.renderTabs();
        this.renderContent();
        this.updateNavButtons();
        this.updateAddressBar();
    },

    showStartPage() {
        const tab = this.getActiveTab();
        if (!tab) return;

        tab.url = 'about:blank';
        tab.title = t('browser.new-tab');

        const contentContainer = this.container.querySelector('#browser-content');
        contentContainer.innerHTML = `
            <div class="browser-start-page">
                <time class="start-page-time" aria-label="当前时间"></time>

                <div class="start-page-search">
                    <img src="Theme/Icon/Symbol_icon/stroke/Search.svg" alt="" class="search-icon">
                    <input type="text" placeholder="${t('browser.search.placeholder')}" id="start-page-search" spellcheck="false">
                </div>

                <div class="start-page-favorites" aria-live="polite">
                    <div class="start-page-section-title">收藏网站</div>
                    <div class="start-page-shortcuts">
                        <div class="start-page-favorites-loading">正在加载收藏…</div>
                    </div>
                </div>
            </div>
        `;

        this.startStartPageClock();

        const startSearch = contentContainer.querySelector('#start-page-search');
        startSearch?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.navigate(startSearch.value);
            }
        });
        if (window.SearchHistory && startSearch) {
            SearchHistory.bindPopover(startSearch, {
                anchor: startSearch.closest('.start-page-search'),
                className: 'browser-search-history start-page-search-history',
                minWidth: 360,
                onSelect: query => this.navigate(query)
            });
        }
        this.renderStartPageFavorites();

        this.renderTabs();
        this.updateAddressBar();
    },

    startStartPageClock() {
        clearTimeout(this._startPageClockTimer);

        const update = () => {
            const clock = this.container?.querySelector('.start-page-time');
            if (!clock) {
                this._startPageClockTimer = null;
                return;
            }

            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            clock.textContent = `${hours}:${minutes}`;
            clock.dateTime = `${hours}:${minutes}`;

            const delayToNextMinute = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
            this._startPageClockTimer = setTimeout(update, delayToNextMinute + 20);
        };

        update();
    },

    stopStartPageClock() {
        clearTimeout(this._startPageClockTimer);
        this._startPageClockTimer = null;
    },

    async renderStartPageFavorites() {
        const contentContainer = this.container?.querySelector('#browser-content');
        const grid = contentContainer?.querySelector('.start-page-shortcuts');
        if (!grid || !window.FavoriteSites) return;
        const renderSeq = (this._favoritesRenderSeq || 0) + 1;
        this._favoritesRenderSeq = renderSeq;
        const sites = await FavoriteSites.getDisplaySites(FavoriteSites.getSites().length);
        if (renderSeq !== this._favoritesRenderSeq || !grid.isConnected || !grid.closest('.browser-start-page')) return;

        grid.innerHTML = sites.map((site, index) => `
            <button class="shortcut-item" type="button" data-site-index="${index}" title="${this.escapeHtml(site.title || site.url)}">
                <span class="shortcut-icon">
                    <span class="shortcut-letter">${this.escapeHtml((site.title || site.url || '?').trim().slice(0, 1).toUpperCase())}</span>
                    ${site.icon ? `<img src="${this.escapeHtml(site.icon)}" alt="">` : ''}
                </span>
                <span class="shortcut-name">${this.escapeHtml(site.title || site.url)}</span>
            </button>
        `).join('') + `
            <button class="shortcut-item add-favorite-site" type="button" title="添加收藏网站">
                <span class="shortcut-icon"><img src="Theme/Icon/Symbol_icon/stroke/Add.svg" alt=""></span>
                <span class="shortcut-name">添加收藏网站</span>
            </button>`;

        grid.querySelectorAll('.shortcut-icon img').forEach(image => {
            image.addEventListener('error', () => image.remove(), { once: true });
        });
        grid.querySelectorAll('.shortcut-item[data-site-index]').forEach(button => {
            const site = sites[Number(button.dataset.siteIndex)];
            button.addEventListener('click', () => site && this.navigate(site.url));
            button.addEventListener('contextmenu', event => {
                event.preventDefault();
                event.stopPropagation();
                if (site) this.showFavoriteContextMenu(site, event.clientX, event.clientY);
            });
        });
        grid.querySelector('.add-favorite-site')?.addEventListener('click', () => {
            FavoriteSites.openAddDialog({ onAdded: () => this.renderStartPageFavorites() });
        });
    },

    showFavoriteContextMenu(site, x, y) {
        this._favoriteContextMenu?.remove();
        if (!window.FluentUI?.ContextMenu) return;
        const menu = FluentUI.ContextMenu({
            className: 'browser-favorite-context-menu',
            items: [{
                label: '删除收藏',
                icon: 'Trash',
                action: 'remove',
                onClick: () => {
                    FavoriteSites.removeSite(site.id);
                    menu.remove();
                    if (this._favoriteContextMenu === menu) this._favoriteContextMenu = null;
                }
            }]
        });
        document.body.appendChild(menu);
        menu.show(x, y);
        this._favoriteContextMenu = menu;
        const dismiss = event => {
            if (!menu.contains(event.target)) {
                menu.remove();
                if (this._favoriteContextMenu === menu) this._favoriteContextMenu = null;
            }
        };
        setTimeout(() => document.addEventListener('pointerdown', dismiss, { once: true }), 0);
    },

    renderSearchResultsPage(query) {
        const contentContainer = this.container.querySelector('#browser-content');
        const escapedQuery = this.escapeHtml(query);
        const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

        contentContainer.innerHTML = `
            <div class="browser-search-results-page">
                <div class="browser-search-results-hero">
                    <span class="browser-search-results-badge">Bing</span>
                    <h2>${escapedQuery}</h2>
                    <p>Search opens in Bing by default.</p>
                </div>
                <div class="browser-search-results-grid">
                    <a class="browser-search-card" href="${bingUrl}" data-open-in-tab="true" rel="noopener noreferrer">
                        <strong>Bing Search</strong>
                        <span>${escapedQuery}</span>
                    </a>
                </div>
            </div>
        `;

        contentContainer.querySelectorAll('[data-open-in-tab="true"]').forEach((link) => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                this.createNewTab(link.href);
            });
        });
    },

    attachIframeLinkInterception(iframe) {
        let iframeDoc;
        let iframeWindow;

        try {
            iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            iframeWindow = iframe.contentWindow;
        } catch (error) {
            return;
        }

        if (!iframeDoc || !iframeWindow || iframeDoc.__fluentBrowserLinksBound) return;
        iframeDoc.__fluentBrowserLinksBound = true;

        iframeDoc.querySelectorAll('a[href]').forEach((link) => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });

        iframeDoc.addEventListener('click', (event) => {
            const link = event.target.closest('a[href]');
            if (!link) return;

            const rawHref = link.getAttribute('href');
            if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;

            let nextUrl = rawHref;
            try {
                nextUrl = new URL(rawHref, iframeWindow.location.href).href;
            } catch (error) {}

            event.preventDefault();
            event.stopPropagation();
            this.createNewTab(nextUrl);
        }, true);

        try {
            iframeWindow.open = (url) => {
                if (!url) return null;
                let nextUrl = url;
                try {
                    nextUrl = new URL(url, iframeWindow.location.href).href;
                } catch (error) {}
                this.createNewTab(nextUrl);
                return null;
            };
        } catch (error) {}
    },

    renderContent() {
        const tab = this.getActiveTab();
        if (!tab) return;

        const contentContainer = this.container.querySelector('#browser-content');
        if (!contentContainer) return;

        if (tab.url === 'about:blank') {
            this.showStartPage();
            return;
        }

        this.stopStartPageClock();

        if (this.isSearchResultsUrl(tab.url)) {
            this.renderSearchResultsPage(this.getSearchQueryFromUrl(tab.url));
            return;
        }

        contentContainer.innerHTML = `
            <iframe
                src="${tab.url}"
                class="browser-iframe"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            ></iframe>
        `;

        const iframe = contentContainer.querySelector('iframe');
        iframe?.addEventListener('load', () => {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (iframeDoc?.title) {
                    tab.title = iframeDoc.title;
                    this.renderTabs();
                }
                this.attachIframeLinkInterception(iframe);
            } catch (error) {}
        });
    },

    goBack() {
        const tab = this.getActiveTab();
        if (!tab || tab.historyIndex <= 0) return;

        tab.historyIndex -= 1;
        tab.url = tab.history[tab.historyIndex];
        if (this.isSearchResultsUrl(tab.url)) {
            tab.title = this.getSearchResultsTitle(this.getSearchQueryFromUrl(tab.url));
        }
        this.renderTabs();
        this.renderContent();
        this.updateNavButtons();
        this.updateAddressBar();
    },

    goForward() {
        const tab = this.getActiveTab();
        if (!tab || tab.historyIndex >= tab.history.length - 1) return;

        tab.historyIndex += 1;
        tab.url = tab.history[tab.historyIndex];
        if (this.isSearchResultsUrl(tab.url)) {
            tab.title = this.getSearchResultsTitle(this.getSearchQueryFromUrl(tab.url));
        }
        this.renderTabs();
        this.renderContent();
        this.updateNavButtons();
        this.updateAddressBar();
    },

    refresh() {
        const tab = this.getActiveTab();
        if (!tab) return;

        if (tab.url === 'about:blank') {
            this.showStartPage();
        } else {
            this.renderContent();
        }
    },

    goHome() {
        this.showStartPage();
    },

    updateNavButtons() {
        const tab = this.getActiveTab();
        const backBtn = this.container.querySelector('#browser-back');
        const forwardBtn = this.container.querySelector('#browser-forward');

        if (!backBtn || !forwardBtn) return;

        if (!tab) {
            backBtn.disabled = true;
            forwardBtn.disabled = true;
            return;
        }

        backBtn.disabled = tab.historyIndex <= 0;
        forwardBtn.disabled = tab.historyIndex >= tab.history.length - 1;
    },

    updateAddressBar() {
        const tab = this.getActiveTab();
        const addressBar = this.container.querySelector('#browser-address');
        this.updateBookmarkButton();
        if (!addressBar) return;

        if (!tab || tab.url === 'about:blank') {
            addressBar.value = '';
            return;
        }

        if (this.isSearchResultsUrl(tab.url)) {
            addressBar.value = this.getSearchQueryFromUrl(tab.url);
            return;
        }

        addressBar.value = tab.url;
    },

    addStyles() {
        if (document.getElementById('browser-app-styles')) return;

        const style = document.createElement('style');
        style.id = 'browser-app-styles';
        style.textContent = `
            .browser-app {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                background: var(--bg-secondary);
            }

            .browser-header {
                background: var(--bg-secondary);
                border-bottom: 1px solid var(--border-color);
            }

            .browser-navbar {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 12px 12px;
            }

            .browser-nav-controls {
                display: flex;
                gap: 4px;
            }

            .browser-nav-btn,
            .browser-tool-btn {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                background: transparent;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background var(--transition-fast);
            }

            .browser-nav-btn:hover:not(:disabled),
            .browser-tool-btn:hover {
                background: rgba(0, 0, 0, 0.05);
            }

            .dark-mode .browser-nav-btn:hover:not(:disabled),
            .dark-mode .browser-tool-btn:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .browser-nav-btn:disabled {
                opacity: 0.3;
                cursor: not-allowed;
            }

            .browser-nav-btn img,
            .browser-tool-btn img {
                width: 18px;
                height: 18px;
            }

            .browser-address-bar {
                flex: 1;
                display: flex;
                align-items: center;
                gap: 8px;
                background: var(--bg-tertiary);
                border-radius: 20px;
                padding: 0 16px;
                height: 40px;
                min-width: 0;
            }

            .address-bar-icon {
                width: 16px;
                height: 16px;
                opacity: 0.5;
            }

            #browser-address {
                flex: 1;
                min-width: 0;
                background: transparent;
                border: none;
                outline: none;
                font-size: 14px;
                color: var(--text-primary);
            }

            #browser-address::placeholder {
                color: var(--text-secondary);
            }

            .browser-tools {
                display: flex;
                gap: 4px;
            }

            .browser-content {
                flex: 1;
                background: var(--bg-primary);
                overflow: hidden;
                position: relative;
            }

            .browser-iframe {
                width: 100%;
                height: 100%;
                border: none;
                background: #fff;
            }

            .window[data-app-id="browser"] .window-title-section {
                min-width: 0;
                flex: 0 0 auto;
            }

            .window[data-app-id="browser"] .window-title {
                white-space: nowrap;
            }

            .window[data-app-id="browser"] .browser-titlebar-tabs-host {
                flex: 1;
                min-width: 0;
                margin: 0 12px 0 18px;
                display: flex;
                align-items: center;
            }

            .window[data-app-id="browser"] .browser-titlebar-tabs {
                width: 100%;
                min-width: 0;
                gap: 6px;
                background: transparent;
                border: none;
                box-shadow: none;
                backdrop-filter: none;
                -webkit-backdrop-filter: none;
            }

            .window[data-app-id="browser"] .browser-titlebar-tabs .fluent-tabbar-tabs {
                min-width: 0;
            }

            .window[data-app-id="browser"] .browser-titlebar-tabs .fluent-tab {
                min-width: 120px;
                max-width: 220px;
                border-radius: 10px;
                background: rgba(0, 0, 0, 0.04);
            }

            .window[data-app-id="browser"] .browser-titlebar-tabs .fluent-tab.active {
                background: rgba(255, 255, 255, 0.72);
                box-shadow: 0 1px 0 rgba(255, 255, 255, 0.28) inset;
            }

            .dark-mode .window[data-app-id="browser"] .browser-titlebar-tabs .fluent-tab {
                background: rgba(255, 255, 255, 0.06);
            }

            .dark-mode .window[data-app-id="browser"] .browser-titlebar-tabs .fluent-tab.active {
                background: rgba(255, 255, 255, 0.12);
                box-shadow: none;
            }

            .window[data-app-id="browser"] .browser-titlebar-tabs .fluent-tab-close,
            .window[data-app-id="browser"] .browser-titlebar-tabs .fluent-tabbar-add {
                opacity: 1;
            }

            body.fluent-v2 .window[data-app-id="browser"] .window-titlebar {
                margin: 0;
                padding: 12px 14px;
                border: 1px solid rgba(0, 0, 0, 0.06);
                border-bottom: none;
                border-radius: var(--browser-float-radius) var(--browser-float-radius) 0 0;
                background: rgba(249, 249, 249, 0.78) !important;
                backdrop-filter: blur(28px) saturate(180%);
                -webkit-backdrop-filter: blur(28px) saturate(180%);
                box-shadow: none;
            }

            body.fluent-v2.dark-mode .window[data-app-id="browser"] .window-titlebar {
                border-color: rgba(255, 255, 255, 0.08);
                background: rgba(34, 34, 34, 0.78) !important;
            }

            body.fluent-v2 .window[data-app-id="browser"] .window-content {
                background: transparent;
            }

            body.fluent-v2 .window[data-app-id="browser"] {
                --browser-float-radius: var(--radius-lg, 16px);
                border-radius: var(--browser-float-radius);
                overflow: hidden;
            }

            body.fluent-v2 .window[data-app-id="browser"].maximized,
            body.fluent-v2 .window[data-app-id="browser"].maximized .window-titlebar,
            body.fluent-v2 .window[data-app-id="browser"].maximized .browser-app,
            body.fluent-v2 .window[data-app-id="browser"].maximized .browser-content {
                border-radius: 0 !important;
            }

            body.fluent-v2 .window[data-app-id="browser"] .browser-app {
                border-radius: 0 0 var(--browser-float-radius) var(--browser-float-radius);
                overflow: hidden;
                background: rgba(249, 249, 249, 0.78);
            }

            body.fluent-v2.dark-mode .window[data-app-id="browser"] .browser-app {
                background: rgba(34, 34, 34, 0.78);
            }

            body.fluent-v2 .window[data-app-id="browser"] .browser-header {
                margin: 0;
                border: 1px solid rgba(0, 0, 0, 0.06);
                border-top: none;
                border-radius: 0;
                background: rgba(249, 249, 249, 0.78) !important;
                backdrop-filter: blur(28px) saturate(180%) !important;
                -webkit-backdrop-filter: blur(28px) saturate(180%) !important;
                box-shadow: none;
            }

            body.fluent-v2.dark-mode .window[data-app-id="browser"] .browser-header {
                border-color: rgba(255, 255, 255, 0.08) !important;
                background: rgba(34, 34, 34, 0.78) !important;
            }

            body.fluent-v2 .window[data-app-id="browser"] .browser-titlebar-tabs-host {
                margin-left: 16px;
            }

            body.fluent-v2 .window[data-app-id="browser"] .browser-titlebar-tabs .fluent-tab {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.04);
            }

            body.fluent-v2 .window[data-app-id="browser"] .browser-titlebar-tabs .fluent-tab:hover {
                background: rgba(255, 255, 255, 0.14);
            }

            body.fluent-v2 .window[data-app-id="browser"] .browser-titlebar-tabs .fluent-tab.active {
                background: rgba(255, 255, 255, 0.16) !important;
                border-color: rgba(255, 255, 255, 0.08);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
            }

            body.fluent-v2 .window[data-app-id="browser"] .browser-titlebar-tabs .fluent-tabbar-add,
            body.fluent-v2 .window[data-app-id="browser"] .browser-nav-btn,
            body.fluent-v2 .window[data-app-id="browser"] .browser-tool-btn {
                border-radius: 999px;
            }

            body.fluent-v2 .window[data-app-id="browser"] .browser-address-bar {
                background: rgba(255, 255, 255, 0.08) !important;
                border: 1px solid rgba(255, 255, 255, 0.06) !important;
                backdrop-filter: blur(20px) !important;
                -webkit-backdrop-filter: blur(20px) !important;
            }

            body.fluent-v2 .window[data-app-id="browser"] .browser-content {
                background: transparent;
                border-radius: 0 0 var(--browser-float-radius) var(--browser-float-radius);
                overflow: hidden;
            }

            .browser-search-results-page {
                height: 100%;
                padding: 32px;
                overflow-y: auto;
                background:
                    radial-gradient(circle at top left, rgba(0, 120, 212, 0.12), transparent 32%),
                    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.76));
            }

            .dark-mode .browser-search-results-page {
                background:
                    radial-gradient(circle at top left, rgba(0, 120, 212, 0.2), transparent 32%),
                    linear-gradient(180deg, rgba(28, 28, 30, 0.96), rgba(28, 28, 30, 0.88));
            }

            .browser-search-results-hero {
                max-width: 760px;
                margin: 0 auto 28px;
            }

            .browser-search-results-badge {
                display: inline-flex;
                align-items: center;
                padding: 6px 12px;
                border-radius: 999px;
                font-size: 12px;
                font-weight: 600;
                background: rgba(0, 120, 212, 0.12);
                color: var(--accent);
            }

            .browser-search-results-hero h2 {
                margin: 16px 0 10px;
                font-size: 34px;
                line-height: 1.1;
                color: var(--text-primary);
            }

            .browser-search-results-hero p {
                margin: 0;
                font-size: 14px;
                line-height: 1.6;
                color: var(--text-secondary);
            }

            .browser-search-results-grid {
                max-width: 760px;
                margin: 0 auto;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 14px;
            }

            .browser-search-card {
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 18px;
                border-radius: 18px;
                text-decoration: none;
                color: inherit;
                background: rgba(255, 255, 255, 0.68);
                border: 1px solid rgba(255, 255, 255, 0.55);
                box-shadow: 0 18px 40px rgba(16, 24, 40, 0.08);
                transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
            }

            .browser-search-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 24px 48px rgba(16, 24, 40, 0.14);
                background: rgba(255, 255, 255, 0.82);
            }

            .dark-mode .browser-search-card {
                background: rgba(255, 255, 255, 0.06);
                border-color: rgba(255, 255, 255, 0.08);
                box-shadow: none;
            }

            .dark-mode .browser-search-card:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .browser-search-card strong {
                font-size: 16px;
                color: var(--text-primary);
            }

            .browser-search-card span {
                font-size: 13px;
                color: var(--text-secondary);
                word-break: break-word;
            }

            .browser-start-page {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 80px 20px 20px;
                overflow-y: auto;
            }

            .start-page-time {
                display: block;
                margin-bottom: 40px;
                color: var(--text-primary);
                font-size: 48px;
                font-weight: 600;
                line-height: 1;
                letter-spacing: -1px;
                font-variant-numeric: tabular-nums;
            }

            .start-page-search {
                box-sizing: border-box;
                flex: 0 0 48px;
                width: 100%;
                max-width: 600px;
                min-height: 48px;
                max-height: 48px;
                display: flex;
                align-items: center;
                gap: 12px;
                background: var(--bg-tertiary);
                border-radius: 24px;
                padding: 0 24px;
                height: 48px;
                margin-bottom: 34px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .start-page-search .search-icon {
                width: 20px;
                height: 20px;
                opacity: 0.5;
            }

            #start-page-search {
                flex: 1;
                min-width: 0;
                height: 100%;
                padding: 0;
                background: transparent;
                border: none;
                outline: none;
                font-size: 16px;
                color: var(--text-primary);
            }

            #start-page-search::placeholder {
                color: var(--text-secondary);
            }

            .start-page-shortcuts {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
                gap: 14px;
                max-width: 800px;
                width: 100%;
            }

            .start-page-favorites {
                width: 100%;
                max-width: 800px;
            }

            .start-page-section-title {
                margin: 0 4px 12px;
                color: var(--text-secondary);
                font-size: 13px;
                font-weight: 600;
            }

            .start-page-favorites-loading,
            .start-page-favorites-empty {
                grid-column: 1 / -1;
                padding: 24px;
                color: var(--text-secondary);
                text-align: center;
                font-size: 13px;
            }

            .shortcut-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
                cursor: pointer;
                padding: 12px 8px;
                border-radius: 12px;
                border: 0;
                background: transparent;
                transition: background var(--transition-fast);
            }

            .shortcut-item:hover {
                background: rgba(0, 0, 0, 0.03);
            }

            .add-favorite-site .shortcut-icon {
                border: 1px dashed rgba(var(--accent-rgb, 0, 120, 212), 0.46);
                background: rgba(var(--accent-rgb, 0, 120, 212), 0.08);
            }

            .add-favorite-site .shortcut-icon img {
                width: 24px;
                height: 24px;
                opacity: 0.72;
            }

            .dark-mode .shortcut-item:hover {
                background: rgba(255, 255, 255, 0.05);
            }

            .shortcut-icon {
                position: relative;
                width: 60px;
                height: 60px;
                border-radius: 12px;
                background: var(--bg-tertiary);
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }

            .shortcut-icon img {
                position: relative;
                z-index: 1;
                width: 38px;
                height: 38px;
                object-fit: contain;
            }

            .shortcut-letter {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--accent);
                font-size: 22px;
                font-weight: 700;
            }

            .shortcut-name {
                width: 100%;
                font-size: 13px;
                color: var(--text-primary);
                text-align: center;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .browser-app *::-webkit-scrollbar {
                width: 6px;
                height: 6px;
            }

            .browser-app *::-webkit-scrollbar-track {
                background: transparent;
            }

            .browser-app *::-webkit-scrollbar-thumb {
                background: var(--text-tertiary);
                border-radius: 3px;
            }

            .browser-app *::-webkit-scrollbar-thumb:hover {
                background: var(--text-secondary);
            }

            .browser-app * {
                scrollbar-width: thin;
                scrollbar-color: var(--text-tertiary) transparent;
            }

            @media (max-width: 900px) {
                .window[data-app-id="browser"] .window-titlebar {
                    align-items: flex-start;
                    gap: 10px;
                }

                .window[data-app-id="browser"] .browser-titlebar-tabs-host {
                    margin: 0 0 0 8px;
                }

                .window[data-app-id="browser"] .browser-titlebar-tabs .fluent-tab {
                    min-width: 96px;
                }

                .browser-navbar {
                    flex-wrap: wrap;
                }

                .browser-tools {
                    margin-left: auto;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

if (typeof window !== 'undefined') {
    window.BrowserApp = BrowserApp;
}
