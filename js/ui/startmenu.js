/**
 * 开始菜单模块
 */
const StartMenu = {
    element: null,
    appsGrid: null,
    searchContainer: null,
    searchInput: null,
    powerBtn: null,
    fullscreenBtn: null,
    powerMenu: null,
    powerLogoutMenu: null,
    isOpen: false,
    recentContainer: null,
    currentView: 'home',
    isSearchMode: false,
    searchResultsContainer: null,

    init() {
        this.element = document.getElementById('start-menu');
        this.appsGrid = document.getElementById('start-apps-grid');
        this.searchContainer = this.element?.querySelector('.start-search') || null;
        this.searchInput = document.getElementById('start-search-input');
        this.powerBtn = document.getElementById('power-btn');
        this.fullscreenBtn = document.getElementById('fullscreen-btn');
        this.powerMenu = document.getElementById('power-menu');
        this.powerLogoutMenu = document.getElementById('power-logout-menu');
        this.recentContainer = document.getElementById('start-recent-items');

        this.bindEvents();
        this.updateLanguage();
        this.renderRecent();
        this.syncFullscreenButton();

        this.bindStateEvents();
    },

    bindStateEvents() {
        if (this._stateEventsBound) return;
        this._stateEventsBound = true;

        State.on('languageChange', () => this.updateLanguage());

        // 文件系统、图片预览缓存或 modified 时间变化时刷新推荐。
        const refreshRecent = () => this.renderRecent();
        State.on('fsChange', refreshRecent);
        State.on('notificationAdd', refreshRecent);
        window.addEventListener('photos-cache-ready', refreshRecent);

        State.on('appRepairStart', (appId) => this.updateAppRepairState(appId, true));
        State.on('appRepairEnd', (appId) => this.updateAppRepairState(appId, false));
    },
    
    // 更新应用修复状态
    updateAppRepairState(appId, isRepairing) {
        if (!this.element) return;
        this.element.querySelectorAll('.start-app, .start-all-app-row').forEach(appEl => {
            if (appEl.dataset.appId !== String(appId)) return;
            appEl.classList.toggle('repairing', isRepairing);
            appEl.setAttribute('aria-disabled', isRepairing ? 'true' : 'false');
        });
    },
    
    updateLanguage() {
        // 更新搜索框占位符
        if (this.searchInput) {
            this.searchInput.placeholder = t('start.search.placeholder');
        }
        
        // 更新开始菜单标题
        const pinnedTitle = document.getElementById('start-pinned-title');
        if (pinnedTitle) pinnedTitle.textContent = t('start.pinned');
        
        const allAppsText = document.getElementById('start-all-apps-text');
        if (allAppsText) allAppsText.textContent = t('start.all-apps');
        
        const recommendedTitle = document.getElementById('start-recommended-title');
        if (recommendedTitle) recommendedTitle.textContent = t('start.recommended');
        
        const moreText = document.getElementById('start-more-text');
        if (moreText) moreText.textContent = t('start.more');
        
        const picturesText = document.getElementById('start-pictures-text');
        if (picturesText) picturesText.textContent = t('start.pictures');
        
        const downloadsText = document.getElementById('start-downloads-text');
        if (downloadsText) downloadsText.textContent = t('start.downloads');

        const allAppsBackText = document.getElementById('start-all-apps-back-text');
        if (allAppsBackText) allAppsBackText.textContent = t('start.pinned');

        const allAppsTitle = document.getElementById('start-all-apps-title');
        if (allAppsTitle) allAppsTitle.textContent = t('start.all-apps');
        
        // 更新电源菜单
        const lockText = document.getElementById('power-lock-text');
        if (lockText) lockText.textContent = t('start.power.lock');

        const shutdownText = document.getElementById('power-shutdown-text');
        if (shutdownText) shutdownText.textContent = t('start.power.shutdown');

        const restartText = document.getElementById('power-restart-text');
        if (restartText) restartText.textContent = t('start.power.restart');

        const logoutText = document.getElementById('power-logout-text');
        if (logoutText) logoutText.textContent = t('start.power.logout');

        this.syncFullscreenButton();

        this.renderApps();
    },

    renderApps() {
        if (!this.appsGrid) return;
        this.appsGrid.replaceChildren();
        const pinnedApps = this.getStartPinnedApps()
            .map(appId => Desktop.apps.find(app => app.id === appId))
            .filter(Boolean);
        if (pinnedApps.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'start-empty';
            empty.textContent = t('start.pinned-empty');
            this.appsGrid.appendChild(empty);
            if (this.currentView === 'allApps') this.renderAllApps();
            if (this.isSearchMode) this.renderSearchResults(this.searchInput?.value || '');
            return;
        }
        
        // 渲染所有应用
        pinnedApps.forEach(app => {
            const appElement = document.createElement('div');
            appElement.className = 'start-app';
            appElement.dataset.appId = app.id;
            const repairing = typeof SettingsApp !== 'undefined' && SettingsApp.isAppRepairing(app.id);
            appElement.classList.toggle('repairing', repairing);
            appElement.setAttribute('aria-disabled', repairing ? 'true' : 'false');
            const name = String(Desktop.getAppName(app) || app.id || '');
            const icon = document.createElement('img');
            icon.src = String(app.icon || '');
            icon.alt = name;
            const label = document.createElement('span');
            label.textContent = name;
            appElement.append(icon, label);
            this.appsGrid.appendChild(appElement);
        });
        if (this.currentView === 'allApps') this.renderAllApps();
        if (this.isSearchMode) this.renderSearchResults(this.searchInput?.value || '');
    },

    getStartPinnedApps() {
        const saved = Array.isArray(State.settings.startPinnedApps) ? State.settings.startPinnedApps : [];
        return saved.filter(appId => Desktop.apps.some(app => app.id === appId));
    },

    setStartPinnedApps(appIds) {
        const unique = [...new Set((appIds || []).filter(appId => Desktop.apps.some(app => app.id === appId)))];
        State.updateSettings({ startPinnedApps: unique });
        this.renderApps();
        if (this.currentView === 'allApps') this.renderAllApps();
        if (this.isSearchMode) this.renderSearchResults(this.searchInput?.value || '');
    },

    pinToStart(appId) {
        const pinned = this.getStartPinnedApps();
        if (!pinned.includes(appId)) {
            pinned.push(appId);
            this.setStartPinnedApps(pinned);
        }
    },

    unpinFromStart(appId) {
        this.setStartPinnedApps(this.getStartPinnedApps().filter(id => id !== appId));
    },

    isStartPinned(appId) {
        return this.getStartPinnedApps().includes(appId);
    },

    getAllAppsSorted() {
        const isEnglish = I18n.currentLang === 'en';
        const collator = new Intl.Collator(isEnglish ? 'en-US' : 'zh-CN-u-co-pinyin', {
            numeric: true,
            sensitivity: 'base'
        });
        return (Desktop.apps || [])
            .slice()
            .sort((a, b) => {
                const groupA = this.getAppGroupKey(a);
                const groupB = this.getAppGroupKey(b);
                if (groupA === '#' && groupB !== '#') return 1;
                if (groupB === '#' && groupA !== '#') return -1;
                const groupCompare = collator.compare(groupA, groupB);
                if (groupCompare !== 0) return groupCompare;
                const nameCompare = collator.compare(this.getAppSortName(a), this.getAppSortName(b));
                if (nameCompare !== 0) return nameCompare;
                return String(a.id || '').localeCompare(String(b.id || ''), 'en-US', { sensitivity: 'base' });
            });
    },

    getAppSortName(app) {
        const displayName = String(Desktop.getAppName(app) || app.id || '').trim();
        if (I18n.currentLang !== 'en') return displayName;

        const translatedName = app.nameKey
            ? String(I18n.translations?.en?.[app.nameKey] || '').trim()
            : '';
        if (translatedName) return translatedName;
        if (/^[A-Za-z0-9]/.test(displayName)) return displayName;

        // Some third-party catalog entries currently have only a Chinese display
        // name. Their stable ASCII app id provides deterministic English sorting.
        return String(app.id || displayName).replace(/[-_]+/g, ' ').trim();
    },

    getAppGroupKey(app) {
        if (I18n.currentLang === 'en') {
            const englishName = this.getAppSortName(app);
            const initial = englishName.match(/^[A-Za-z]/);
            return initial ? initial[0].toUpperCase() : '#';
        }

        // Pinyin initials for every built-in and current catalog application.
        // Keep overrides for brands whose ASCII id does not match the Chinese
        // display name (for example alipay -> 支付宝 -> Z).
        const pinyinInitialById = {
            files:'W', settings:'S', 'process-manager':'J', 'developer-center':'K', terminal:'Z', tips:'T',
            calculator:'J', notes:'J', browser:'L', clock:'S', weather:'T', appshop:'A',
            camera:'X', photos:'Z', media:'D', office:'O', 'shimo-office':'S',
            'qq-mail':'Q', didaqingdan:'D', canva:'C', chatgpt:'C', deepseek:'D', qwen:'Q', kimi:'K',
            baidu:'B', 'baidu-netdisk':'B', youdaofanyi:'Y', coolapk:'K', bilibili:'B',
            youku:'Y', douyin:'D', douyu:'D', 'qq-music':'Q', 'kugou-music':'K',
            'netease-music':'W', weibo:'W', taobao:'T', jd:'J', xianyu:'X',
            'taobao-shangou':'T', alipay:'Z', meituan:'M', 'ele-me':'E', didi:'D',
            amap:'G', 'baidu-map':'B', chinadaily:'C', itzhijia:'I', pengpai:'P',
            whiteboard:'B', audiobook:'T', solitaire:'J', jiazhaoba:'J', 'traffic-12123':'J',
            zujuan:'Z', metool:'M', 'video-editor':'S', 'techie-delight':'T', geekfa:'J',
            'snake-classic':'J', photopea:'P', yangshipin:'Y', 'pdf-tools':'P', todo:'M',
            translator:'M', weread:'W', 'douban-book':'D', poem:'G', health:'D', wecom:'Q'
        };
        if (pinyinInitialById[app.id]) return pinyinInitialById[app.id];

        const name = String(Desktop.getAppName(app) || '').trim();
        const latin = name.match(/^[A-Za-z]/);
        if (latin) return latin[0].toUpperCase();
        const pinyinInitials = {
            '哔': 'B', '百': 'B', '浏': 'L', '文': 'W', '设': 'S', '计': 'J', '记': 'J',
            '时': 'S', '天': 'T', '照': 'Z', '多': 'D', '网': 'W', '腾': 'T', '斗': 'D',
            '微': 'W', '淘': 'T', '京': 'J', '拼': 'P', '支': 'Z', '美': 'M', '饿': 'E',
            '高': 'G', '钉': 'D', '企': 'Q', '酷': 'K', '终': 'Z', '进': 'J', '提': 'T',
            '相': 'X', '石': 'S', '滴': 'D', '有': 'Y', '优': 'Y', '抖': 'D', '闲': 'X',
            '澎': 'P', '白': 'B', '听': 'T', '极': 'J', '驾': 'J', '交': 'J', '组': 'Z',
            '视': 'S', '经': 'J', '央': 'Y', '豆': 'D', '古': 'G', '丁': 'D'
        };
        if (pinyinInitials[name[0]]) return pinyinInitials[name[0]];

        const idInitial = String(app.id || '').match(/^[A-Za-z]/);
        return idInitial ? idInitial[0].toUpperCase() : '#';
    },

    ensureAllAppsView() {
        let view = document.getElementById('start-all-apps-view');
        if (view) return view;
        view = document.createElement('div');
        view.id = 'start-all-apps-view';
        view.className = 'start-all-apps-view hidden';
        view.innerHTML = `
            <div class="start-all-apps-header">
                <span id="start-all-apps-title">${t('start.all-apps')}</span>
                <button class="start-all-apps-back" id="start-all-apps-back" type="button">
                    <img src="Theme/Icon/Symbol_icon/stroke/Chevron Left.svg" alt="">
                    <span id="start-all-apps-back-text">${t('start.pinned')}</span>
                </button>
            </div>
            <div class="start-all-apps-list" id="start-all-apps-list"></div>
        `;
        const footer = this.element.querySelector('.start-footer');
        this.element.insertBefore(view, footer);
        view.querySelector('#start-all-apps-back')?.addEventListener('click', () => this.showHomeView());
        return view;
    },

    ensureSearchResultsView() {
        if (this.searchResultsContainer && document.body.contains(this.searchResultsContainer)) return this.searchResultsContainer;
        const section = document.createElement('div');
        section.id = 'start-search-results-view';
        section.className = 'start-search-results-view hidden';
        section.innerHTML = `<div class="start-all-apps-list" id="start-search-results-list"></div>`;
        const footer = this.element.querySelector('.start-footer');
        this.element.insertBefore(section, footer);
        this.searchResultsContainer = section;
        return section;
    },

    getHomeSections() {
        return Array.from(this.element.querySelectorAll('.start-section'));
    },

    showHomeView() {
        this.currentView = 'home';
        this.isSearchMode = false;
        const allAppsView = this.ensureAllAppsView();
        const searchView = this.ensureSearchResultsView();
        const wasOverlayView = this.element.classList.contains('start-all-apps-mode') ||
            this.element.classList.contains('start-search-mode');
        if (wasOverlayView) this.element.classList.add('start-returning-home');
        if (!wasOverlayView) this.clearStartMenuSyncedHeight();
        this.getHomeSections().forEach(section => section.classList.remove('hidden'));
        this.element.classList.remove('start-all-apps-mode', 'start-search-mode');
        this.renderApps();
        this.renderRecent();
        setTimeout(() => {
            if (this.currentView !== 'home') return;
            allAppsView.classList.add('hidden');
            searchView.classList.add('hidden');
            this.element.classList.remove('start-returning-home');
            this.clearStartMenuSyncedHeight();
        }, 220);
    },

    showAllAppsView() {
        this.currentView = 'allApps';
        this.isSearchMode = false;
        this.syncStartMenuHomeHeight();
        this.getHomeSections().forEach(section => section.classList.remove('hidden'));
        this.ensureSearchResultsView().classList.add('hidden');
        const view = this.ensureAllAppsView();
        view.classList.remove('hidden');
        this.element.classList.remove('start-returning-home');
        this.renderAllApps(true);
        this.syncAllAppsListHeight();
        void view.offsetHeight;
        this.element.classList.remove('start-search-mode');
        this.element.classList.add('start-all-apps-mode');
        requestAnimationFrame(() => this.syncAllAppsListHeight());
    },

    enterSearchMode() {
        this.currentView = 'search';
        this.isSearchMode = true;
        this.getHomeSections().forEach(section => section.classList.remove('hidden'));
        this.ensureAllAppsView().classList.add('hidden');
        const view = this.ensureSearchResultsView();
        view.classList.remove('hidden');
        this.element.classList.remove('start-returning-home');
        this.renderSearchResults(this.searchInput.value || '');
        void view.offsetHeight;
        this.element.classList.remove('start-all-apps-mode');
        this.element.classList.add('start-search-mode');
    },

    renderAllApps(resetScroll = false) {
        const list = this.ensureAllAppsView().querySelector('#start-all-apps-list');
        if (!list) return;
        const scrollTop = list.scrollTop;
        list.replaceChildren(this.renderAppList(this.getAllAppsSorted(), true));
        list.scrollTop = resetScroll ? 0 : scrollTop;
        if (this.currentView === 'allApps') this.syncAllAppsListHeight();
    },

    renderSearchResults(query) {
        const view = this.ensureSearchResultsView();
        const list = view.querySelector('#start-search-results-list');
        if (!list) return;
        const q = String(query || '').trim().toLowerCase();
        const apps = this.getAllAppsSorted().filter(app => {
            const name = String(Desktop.getAppName(app) || '').toLowerCase();
            return !q || name.includes(q) || String(app.id || '').toLowerCase().includes(q);
        });
        list.replaceChildren(this.renderAppList(apps, false));
    },

    syncStartMenuHomeHeight() {
        if (!this.element || this.element.classList.contains('hidden')) return;
        this.clearStartMenuSyncedHeight();
        const height = Math.ceil(this.element.getBoundingClientRect().height);
        if (height > 0) {
            this.element.style.height = `${height}px`;
            this.element.style.setProperty('--start-menu-synced-height', `${height}px`);
        }
    },

    clearStartMenuSyncedHeight() {
        if (!this.element) return;
        this.element.style.height = '';
        this.element.style.removeProperty('--start-menu-synced-height');
        this.element.style.removeProperty('--start-apps-list-height');
    },

    getOuterHeight(el) {
        if (!(el instanceof HTMLElement)) return 0;
        const styles = window.getComputedStyle(el);
        return el.offsetHeight +
            (parseFloat(styles.marginTop) || 0) +
            (parseFloat(styles.marginBottom) || 0);
    },

    syncAllAppsListHeight() {
        if (!this.element || this.currentView !== 'allApps') return;
        const view = this.ensureAllAppsView();
        const list = view.querySelector('#start-all-apps-list');
        const header = view.querySelector('.start-all-apps-header');
        if (!list || !header) return;
        const menuStyles = window.getComputedStyle(this.element);
        const viewStyles = window.getComputedStyle(view);
        const menuHeight = this.element.getBoundingClientRect().height;
        const verticalPadding = (parseFloat(menuStyles.paddingTop) || 0) + (parseFloat(menuStyles.paddingBottom) || 0);
        const viewMargins = (parseFloat(viewStyles.marginTop) || 0) + (parseFloat(viewStyles.marginBottom) || 0);
        const searchHeight = this.getOuterHeight(this.searchContainer);
        const headerHeight = this.getOuterHeight(header);
        const available = Math.floor(menuHeight - verticalPadding - viewMargins - searchHeight - headerHeight);
        const listHeight = Math.max(180, available);
        this.element.style.setProperty('--start-apps-list-height', `${listHeight}px`);
    },

    renderAppList(apps, grouped = true) {
        const fragment = document.createDocumentFragment();
        if (!apps || apps.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'start-empty';
            empty.textContent = t('start.no-results');
            fragment.appendChild(empty);
            return fragment;
        }
        let lastGroup = '';
        apps.forEach(app => {
            const name = String(Desktop.getAppName(app) || app.id || '');
            const group = this.getAppGroupKey(app);
            const repairing = typeof SettingsApp !== 'undefined' && SettingsApp.isAppRepairing(app.id);
            if (grouped && group !== lastGroup) {
                const header = document.createElement('div');
                header.className = 'start-app-group';
                header.textContent = group;
                fragment.appendChild(header);
            }
            lastGroup = group;

            const row = document.createElement('div');
            row.className = 'start-all-app-row start-app';
            row.classList.toggle('repairing', repairing);
            row.dataset.appId = String(app.id || '');
            row.setAttribute('aria-disabled', repairing ? 'true' : 'false');

            const icon = document.createElement('img');
            icon.src = String(app.icon || '');
            icon.alt = name;
            const label = document.createElement('span');
            label.textContent = name;
            row.append(icon, label);
            fragment.appendChild(row);
        });
        return fragment;
    },

    openAppAndClose(appId, data = null) {
        if (!appId) return false;
        if (typeof SettingsApp !== 'undefined' && SettingsApp.isAppRepairing(appId)) {
            FluentUI.Toast({
                title: t('start.ctx.app-repairing'),
                message: t('start.ctx.app-repairing-msg'),
                type: 'warning'
            });
            return false;
        }
        WindowManager.openApp(appId, data);
        this.close();
        return true;
    },
    bindEvents() {
        if (this._eventsBound) return;
        this._eventsBound = true;

        // 应用图标拖拽 → 固定到桌面（覆盖固定区与全部应用列表）
        this.element.addEventListener('pointerdown', (e) => this._onAppPointerDown(e));
        // 禁止浏览器原生拖拽（原生拖拽会触发 pointercancel，打断指针拖拽）
        this.element.addEventListener('dragstart', (e) => e.preventDefault());

        // 应用点击
        this.appsGrid.addEventListener('click', (e) => {
            if (this._appDragging) return; // 拖拽结束后的 click 不触发打开
            const appEl = e.target.closest('.start-app');
            if (appEl) {
                const appId = appEl.dataset.appId;
                
                // 检查应用是否正在修复
                if (typeof SettingsApp !== 'undefined' && SettingsApp.isAppRepairing(appId)) {
                    FluentUI.Toast({
                        title: t('start.ctx.app-repairing'),
                        message: t('start.ctx.app-repairing-msg'),
                        type: 'warning'
                    });
                    return;
                }
                
                // 直接打开应用（PWA 应用已注册到 WindowManager）
                this.openAppAndClose(appId);
            }
        });

        // 应用右键菜单
        this.appsGrid.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const app = e.target.closest('.start-app');
            if (app) {
                const appId = app.dataset.appId;
                this.showAppContextMenu(e, appId);
            }
        });

        // 搜索功能
        this.searchInput.addEventListener('focus', () => {
            this.enterSearchMode();
        });

        this.searchInput.addEventListener('input', (e) => {
            this.enterSearchMode();
            this.renderSearchResults(e.target.value || '');
        });

        window.addEventListener('resize', () => {
            if (this.isOpen && this.currentView === 'allApps') {
                this.syncAllAppsListHeight();
            }
        });

        // 电源按钮 - 左键
        this.powerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closePowerLogoutMenu();
            this.togglePowerMenu();
        });

        // 电源按钮 - 右键弹出注销菜单
        this.powerBtn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closePowerMenu();
            this.togglePowerLogoutMenu();
        });

        // 浏览器网页全屏切换
        this.fullscreenBtn?.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await this.toggleDocumentFullscreen();
        });
        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach((eventName) => {
            document.addEventListener(eventName, () => this.syncFullscreenButton());
        });

        // 电源菜单项（左键菜单）
        this.powerMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.power-menu-item');
            if (item) {
                const action = item.dataset.action;
                this.handlePowerAction(action);
            }
        });

        // 注销菜单项（右键菜单）
        this.powerLogoutMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.power-menu-item');
            if (item) {
                const action = item.dataset.action;
                this.handlePowerAction(action);
            }
        });

        // 开始菜单快捷键：Alt 单键触发（避免占用 Mac Command/Win 键）
        this._altStartArmed = false;
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Alt') {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.repeat) {
                    this._altStartArmed = true;
                    e.preventDefault();
                } else {
                    this._altStartArmed = false;
                }
                return;
            }

            this._altStartArmed = false;
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key !== 'Alt') return;
            if (this._altStartArmed) {
                e.preventDefault();
                this.toggle();
            }
            this._altStartArmed = false;
        });

        // 菜单内使用统一委托处理快捷入口和动态生成的全部应用项。
        this.element.addEventListener('click', (e) => {
            if (this._appDragging) return; // 拖拽结束后的 click 不触发打开

            const shortcut = e.target.closest('#pictures-folder-btn, #downloads-folder-btn, #all-apps-btn, #more-recent-btn');
            if (shortcut) {
                switch (shortcut.id) {
                    case 'pictures-folder-btn':
                        this.openFolder('pictures');
                        this.close();
                        break;
                    case 'downloads-folder-btn':
                        this.openFolder('downloads');
                        this.close();
                        break;
                    case 'all-apps-btn':
                        this.showAllAppsView();
                        break;
                    case 'more-recent-btn':
                        this.showAllRecentFiles();
                        break;
                }
                return;
            }

            const appEl = e.target.closest('.start-all-app-row');
            if (!appEl || this.appsGrid.contains(appEl)) return;
            const appId = appEl.dataset.appId;
            if (typeof SettingsApp !== 'undefined' && SettingsApp.isAppRepairing(appId)) {
                FluentUI.Toast({
                    title: t('start.ctx.app-repairing'),
                    message: t('start.ctx.app-repairing-msg'),
                    type: 'warning'
                });
                return;
            }
            this.openAppAndClose(appId);
        });

        this.element.addEventListener('contextmenu', (e) => {
            const app = e.target.closest('.start-all-app-row');
            if (!app || this.appsGrid.contains(app)) return;
            e.preventDefault();
            this.showAppContextMenu(e, app.dataset.appId);
        });

        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target) &&
                !e.target.closest('#start-btn')) {
                this.close();
            }
            if (!this.powerMenu.contains(e.target) &&
                !this.powerLogoutMenu.contains(e.target) &&
                !e.target.closest('#power-btn')) {
                this.closePowerMenu();
                this.closePowerLogoutMenu();
            }
        });

        // 推荐区域右键菜单
        if (this.recentContainer) {
            this.recentContainer.addEventListener('contextmenu', (e) => {
                const item = e.target.closest('.recent-item');
                if (!item) return;
                e.preventDefault();
                const id = item.dataset.id || item.dataset.fileId; // 兼容
                this.showRecentContextMenu(e.clientX, e.clientY, id);
            });

            // 点击打开推荐项
            this.recentContainer.addEventListener('click', (e) => {
                const item = e.target.closest('.recent-item');
                if (!item) return;
                this.openRecentFile(item.dataset.id, item.dataset.filePath);
                this.close();
            });
        }
    },

    isDocumentFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    },

    syncFullscreenButton() {
        if (!this.fullscreenBtn) return;
        const active = this.isDocumentFullscreen();
        const label = t(active ? 'start.fullscreen.exit' : 'start.fullscreen.enter');
        const icon = this.fullscreenBtn.querySelector('img');
        if (icon) {
            icon.src = `Theme/Icon/Symbol_icon/stroke/${active ? 'Minimize' : 'Maximize'}.svg`;
            icon.alt = label;
        }
        this.fullscreenBtn.title = label;
        this.fullscreenBtn.setAttribute('aria-label', label);
        const root = document.documentElement;
        const canEnter = !!(root?.requestFullscreen || root?.webkitRequestFullscreen || root?.mozRequestFullScreen || root?.msRequestFullscreen);
        this.fullscreenBtn.disabled = !active && !canEnter;
    },

    async toggleDocumentFullscreen() {
        try {
            if (this.isDocumentFullscreen()) {
                const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
                if (typeof exit !== 'function') throw new Error('fullscreen_exit_unsupported');
                await Promise.resolve(exit.call(document));
            } else {
                const root = document.documentElement;
                const enter = root?.requestFullscreen || root?.webkitRequestFullscreen || root?.mozRequestFullScreen || root?.msRequestFullscreen;
                if (typeof enter !== 'function') throw new Error('fullscreen_enter_unsupported');
                await Promise.resolve(enter.call(root));
            }
        } catch (error) {
            console.warn('[StartMenu] Failed to toggle fullscreen', error);
            FluentUI.Toast({
                title: t('start.fullscreen.title'),
                message: t('start.fullscreen.failed'),
                type: 'warning'
            });
        } finally {
            this.syncFullscreenButton();
        }
    },

    openFolder(folderId) {
        const targetId = String(folderId || '');
        WindowManager.openApp('files');

        setTimeout(() => {
            const node = typeof State.findNode === 'function' ? State.findNode(targetId) : null;
            if (node?.type === 'folder' &&
                typeof FilesApp !== 'undefined' &&
                typeof FilesApp.navigateToId === 'function') {
                FilesApp.navigateToId(targetId);
                return;
            }

            if (typeof State.addNotification === 'function') {
                State.addNotification({
                    title: t('files.title'),
                    message: targetId,
                    type: 'info'
                });
            }
        }, 120);
    },

    openRecentFile(fileId, filePath = '') {
        const id = String(fileId || '');
        const node = id && typeof State.findNode === 'function' ? State.findNode(id) : null;

        if (node?.type === 'file') {
            if (typeof FilesApp !== 'undefined' && typeof FilesApp.openNodeWithDefaultApp === 'function') {
                const opened = FilesApp.openNodeWithDefaultApp(node);
                if (opened) return;
            }
            WindowManager.openApp('notes', { fileId: id });
            return;
        }

        if (node?.type === 'folder') {
            this.openFolder(id);
            return;
        }

        const normalizedPath = String(filePath || '').toLowerCase();
        if (/\.(?:txt|html?|md)$/.test(normalizedPath)) {
            WindowManager.openApp('notes', { fileId: id });
        } else {
            WindowManager.openApp('files');
        }
    },

    showAllRecentFiles() {
        WindowManager.openApp('files');
        this.close();
    },

    renderRecent() {
        if (!this.recentContainer) return;
        const list = RecentFiles.getRecentFiles().slice(0, 4);
        this.recentContainer.replaceChildren();
        if (!list || list.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'start-empty';
            empty.textContent = t('notification.empty');
            this.recentContainer.appendChild(empty);
            return;
        }

        const fragment = document.createDocumentFragment();
        list.forEach(file => {
            const item = document.createElement('div');
            item.className = 'recent-item';
            item.dataset.id = String(file.id || '');
            item.dataset.filePath = String(file.path || '');
            item.title = String(file.path || '');

            const preview = String(file.preview || file.icon || '');
            const icon = document.createElement('img');
            icon.className = 'recent-item-icon';
            icon.src = preview;
            icon.alt = '';
            if (file.preview) icon.classList.add('recent-item-thumb');

            const info = document.createElement('div');
            info.className = 'recent-item-info';
            const name = document.createElement('div');
            name.className = 'recent-item-name';
            name.textContent = String(file.name || '');
            const time = document.createElement('div');
            time.className = 'recent-item-time';
            time.textContent = String(RecentFiles.formatTime(file.modified) || '');
            info.append(name, time);
            item.append(icon, info);
            fragment.appendChild(item);
        });
        this.recentContainer.appendChild(fragment);
    },

    showRecentContextMenu(x, y, id) {
        let menu = document.getElementById('start-recent-context-menu');
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'start-recent-context-menu';
            menu.className = 'context-menu';
            document.body.appendChild(menu);
        }
        menu.innerHTML = `
            <div class="context-menu-item" data-action="open"><img src="Theme/Icon/Symbol_icon/stroke/Folder Open.svg" alt=""><span>${t('open')}</span></div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="reveal-in-folder"><img src="Theme/Icon/Symbol_icon/stroke/Dashboard Check.svg" alt=""><span>${t('start.ctx.reveal')}</span></div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="remove-recent"><img src="Theme/Icon/Symbol_icon/stroke/Minus Circle.svg" alt=""><span>${t('start.ctx.remove-recent')}</span></div>
            <div class="context-menu-item" data-action="move-to-recycle"><img src="Theme/Icon/Symbol_icon/stroke/Trash.svg" alt=""><span>${t('start.ctx.move-to-recycle')}</span></div>
        `;
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.classList.remove('hidden');

        const closeMenu = () => menu.classList.add('hidden');
        setTimeout(() => {
            document.addEventListener('click', closeMenu, { once: true });
        }, 0);

        menu.onclick = (e) => {
            const item = e.target.closest('.context-menu-item');
            if (!item) return;
            e.stopPropagation();
            closeMenu();
            
            const action = item.dataset.action;
            const node = State.findNode(id);
            if (!node) {
                console.error('[StartMenu] 找不到节点:', id);
                return;
            }
            
            switch (action) {
                case 'open':
                    this.openRecentFile(id, node.path || node.name || '');
                    this.close();
                    break;
                case 'reveal-in-folder':
                    // 在文件资源管理器中定位该文件/文件夹
                    WindowManager.openApp('files');
                    setTimeout(() => {
                        if (typeof FilesApp !== 'undefined' && FilesApp.navigateToId) {
                            // 如果是文件，先定位到父目录
                            let targetId = id;
                            const targetNode = State.findNode(id);
                            if (targetNode && targetNode.type === 'file') {
                                const parent = State.findParentNode(id);
                                if (parent) targetId = parent.id;
                            }
                            FilesApp.navigateToId(targetId, id); // 第二个参数用于高亮选中
                        }
                    }, 120);
                    this.close();
                    break;
                    
                case 'remove-recent':
                    // 从推荐中删除（不删除文件）：仅设置隐藏标记
                    node._hiddenFromRecent = true;
                    State.updateFS(State.fs);
                    this.renderRecent();
                    State.addNotification({
                        title: t('start.ctx.start-menu'),
                        message: t('start.ctx.removed-from-recent'),
                        type: 'success'
                    });
                    break;
                    
                case 'move-to-recycle':
                    // 移动到回收站（移动节点，不删除数据）
                    const parent = State.findParentNode(id);
                    const recycle = State.findNode('recycle');
                    if (!parent || !recycle) {
                        console.error('[StartMenu] 找不到父节点或回收站');
                        return;
                    }
                    if (!parent.children) {
                        console.error('[StartMenu] 父节点没有children');
                        return;
                    }
                    
                    const idx = parent.children.findIndex(c => c.id === id);
                    if (idx === -1) {
                        console.error('[StartMenu] 在父节点中找不到该项');
                        return;
                    }
                    
                    // 移除并添加到回收站
                    const removed = parent.children.splice(idx, 1)[0];
                    removed._recycle = { originalParentId: parent.id };
                    recycle.children = recycle.children || [];
                    recycle.children.unshift(removed);
                    
                    State.updateFS(State.fs);
                    this.renderRecent();
                    State.addNotification({
                        title: t('start.ctx.recycle-bin'),
                        message: t('start.ctx.moved-to-recycle', { name: node.name }),
                        type: 'success'
                    });
                    break;
            }
        };
    },

    /**
     * 开始菜单 App 图标的拖拽：超过阈值后菜单自动收起、
     * 幽灵图标跟随鼠标，松手落在桌面区域时创建桌面快捷方式。
     */
    _onAppPointerDown(e) {
        if (typeof e.button === 'number' && e.button !== 0) return;
        const appEl = e.target.closest('.start-app');
        if (!appEl || !appEl.dataset.appId) return;
        // 阻止图标 img / 文字的原生拖拽与选区拖拽（click 不受影响）
        e.preventDefault();
        const appId = appEl.dataset.appId;
        const startX = e.clientX;
        const startY = e.clientY;
        let ghost = null;
        let dragging = false;

        const onMove = (ev) => {
            if (!dragging) {
                if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 10) return;
                dragging = true;
                this._appDragging = true;
                // 收起开始菜单，露出桌面便于放置
                this.close();
                const app = Desktop.apps.find(a => a.id === appId);
                ghost = document.createElement('div');
                ghost.className = 'taskbar-drag-ghost';
                const icon = document.createElement('img');
                icon.src = String(app?.icon || '');
                icon.alt = '';
                ghost.appendChild(icon);
                document.body.appendChild(ghost);
            }
            ghost.style.left = `${ev.clientX}px`;
            ghost.style.top = `${ev.clientY}px`;
            ghost.classList.toggle('droppable', Taskbar._isDesktopDropPoint(ev.clientX, ev.clientY));
        };

        const onUp = (ev) => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onUp);
            if (!dragging) return;
            if (ghost) ghost.remove();
            if (ev.type === 'pointerup' && Taskbar._isDesktopDropPoint(ev.clientX, ev.clientY)) {
                Desktop.addAppShortcut(appId);
            }
            // click 事件在 pointerup 之后同步派发，再之后才轮到定时器
            setTimeout(() => { this._appDragging = false; }, 0);
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
    },

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    open() {
        if (typeof Taskbar !== 'undefined') Taskbar.hideStartContextMenus?.();
        this.element.classList.remove('hidden');
        this.element.classList.remove('closing');
        this.isOpen = true;
        this.showHomeView();

        // 切换开始按钮图标为fill - Switch start button icon to fill
        const startBtn = document.getElementById('start-btn');
        if (startBtn) startBtn.classList.add('active');

        // 关闭其他面板（互斥）
        ControlCenter.close();
        NotificationCenter.close();
        if (typeof Fingo !== 'undefined' && Fingo && Fingo.isOpen) {
            Fingo.hide('panel-switch');
        }

    },

    close() {
        if (!this.isOpen) return;

        // 添加关闭动画
        if (State.settings.enableAnimation) {
            this.element.classList.add('closing');
            setTimeout(() => {
                this.element.classList.add('hidden');
                this.element.classList.remove('closing');
            }, 200);
        }else {
            this.element.classList.add('hidden');
        }

        this.isOpen = false;
        this.searchInput.value = '';
        this.searchInput.blur();
        this.showHomeView();

        // 切换开始按钮图标回stroke - Switch start button icon back to stroke
        const startBtn = document.getElementById('start-btn');
        if (startBtn) startBtn.classList.remove('active');
    },

    filterApps(query) {
        const apps = this.appsGrid.querySelectorAll('.start-app');
        apps.forEach(app => {
            const name = app.querySelector('span').textContent.toLowerCase();
            if (name.includes(query)) {
                app.style.display = 'flex';
            } else {
                app.style.display = 'none';
            }
        });
    },

    togglePowerMenu() {
        if (this.powerMenu.classList.contains('hidden')) {
            // 计算电源按钮位置
            const btnRect = this.powerBtn.getBoundingClientRect();
            const menuRect = this.powerMenu.getBoundingClientRect();
            
            // 设置菜单位置：在按钮正上方
            this.powerMenu.style.bottom = `${window.innerHeight - btnRect.top + 8}px`;
            this.powerMenu.style.right = `${window.innerWidth - btnRect.right}px`;
            this.powerMenu.style.left = 'auto';
            
            this.powerMenu.classList.remove('hidden');
            
            // 切换图标
            const strokeIcon = this.powerBtn.querySelector('.icon-stroke');
            const fillIcon = this.powerBtn.querySelector('.icon-fill');
            strokeIcon.classList.add('hidden');
            fillIcon.classList.remove('hidden');
        } else {
            this.closePowerMenu();
        }
    },

    closePowerMenu() {
        this.powerMenu.classList.add('hidden');

        const strokeIcon = this.powerBtn.querySelector('.icon-stroke');
        const fillIcon = this.powerBtn.querySelector('.icon-fill');
        strokeIcon.classList.remove('hidden');
        fillIcon.classList.add('hidden');
    },

    togglePowerLogoutMenu() {
        if (this.powerLogoutMenu.classList.contains('hidden')) {
            const btnRect = this.powerBtn.getBoundingClientRect();
            this.powerLogoutMenu.style.bottom = `${window.innerHeight - btnRect.top + 8}px`;
            this.powerLogoutMenu.style.right = `${window.innerWidth - btnRect.right}px`;
            this.powerLogoutMenu.style.left = 'auto';
            this.powerLogoutMenu.classList.remove('hidden');
        } else {
            this.closePowerLogoutMenu();
        }
    },

    closePowerLogoutMenu() {
        this.powerLogoutMenu.classList.add('hidden');
    },

    handlePowerAction(action) {
        this.closePowerMenu();
        this.closePowerLogoutMenu();
        this.close();

        switch (action) {
            case 'shutdown':
                State.shutdown();
                break;
            case 'restart':
                State.restart();
                break;
            case 'logout':
                State.logout();
                break;
            case 'lock':
                State.lock();
                break;
        }
    },

    // 系统内置应用列表（不可卸载）
    systemApps: ['files', 'settings', 'terminal', 'calculator', 'notes', 'browser', 'clock', 'weather', 'appshop'],
    
    showAppContextMenu(event, appId) {
        const app = Desktop.apps.find(a => a.id === appId);
        if (!app) return;

        const isTaskbarPinned = (State.settings.pinnedApps || []).includes(appId);
        const isStartPinned = this.isStartPinned(appId);
        const isSystemApp = this.systemApps.includes(appId);
        const isRepairing = typeof SettingsApp !== 'undefined' && SettingsApp.isAppRepairing(appId);

        // 创建右键菜单
        let contextMenu = document.getElementById('start-app-context-menu');
        if (!contextMenu) {
            contextMenu = document.createElement('div');
            contextMenu.id = 'start-app-context-menu';
            contextMenu.className = 'context-menu hidden';
            document.body.appendChild(contextMenu);
        }

        const createItem = (action, iconName, label, disabled = false, filled = false) => {
            const item = document.createElement('div');
            item.className = 'context-menu-item';
            item.classList.toggle('disabled', disabled);
            item.dataset.action = action;
            item.dataset.appId = String(appId);

            const icon = document.createElement('img');
            icon.src = `Theme/Icon/Symbol_icon/${filled ? 'fill' : 'stroke'}/${iconName}.svg`;
            icon.alt = '';
            const text = document.createElement('span');
            text.textContent = label;
            item.append(icon, text);
            return item;
        };
        const separator = () => {
            const element = document.createElement('div');
            element.className = 'context-menu-separator';
            return element;
        };

        contextMenu.replaceChildren(
            createItem('open', 'Folder Open', isRepairing ? t('start.ctx.repairing') : t('start.ctx.open'), isRepairing),
            createItem(
                isStartPinned ? 'unpin-start' : 'pin-start',
                'Pin',
                t(isStartPinned ? 'start.ctx.unpin-start' : 'start.ctx.pin-start'),
                isRepairing,
                isStartPinned
            ),
            separator(),
            createItem(
                isTaskbarPinned ? 'unpin-taskbar' : 'pin-taskbar',
                'Pin',
                t(isTaskbarPinned ? 'start.ctx.unpin-taskbar' : 'start.ctx.pin-taskbar'),
                isRepairing,
                isTaskbarPinned
            ),
            createItem('settings', 'Settings', t('start.ctx.app-settings'), isRepairing),
            createItem('uninstall', 'Trash', t('start.ctx.uninstall'), isSystemApp || isRepairing)
        );
        contextMenu.style.left = `${event.clientX}px`;
        contextMenu.style.top = `${event.clientY}px`;
        contextMenu.classList.remove('hidden');

        contextMenu.onclick = (e) => {
            const item = e.target.closest('.context-menu-item:not(.disabled)');
            if (!item) return;
            e.stopPropagation();
            this.handleAppContextMenuAction(item.dataset.action, item.dataset.appId);
            contextMenu.classList.add('hidden');
        };

        // 点击外部关闭菜单
        if (this._appContextOutsideClickHandler) {
            document.removeEventListener('click', this._appContextOutsideClickHandler);
        }
        const closeMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.classList.add('hidden');
                document.removeEventListener('click', closeMenu);
                if (this._appContextOutsideClickHandler === closeMenu) {
                    this._appContextOutsideClickHandler = null;
                }
            }
        };
        this._appContextOutsideClickHandler = closeMenu;
        setTimeout(() => {
            if (this._appContextOutsideClickHandler === closeMenu) {
                document.addEventListener('click', closeMenu);
            }
        }, 0);
    },

    openAppSettings(appId) {
        const app = Desktop.apps.find(a => a.id === appId);
        if (!app) return;
        WindowManager.openApp('settings', { page: 'app-detail', appId });
        if (typeof SettingsApp !== 'undefined' && typeof SettingsApp.openData === 'function') {
            setTimeout(() => SettingsApp.openData({ page: 'app-detail', appId }), 0);
        }
        this.close();
    },

    handleAppContextMenuAction(action, appId) {
        switch (action) {
            case 'open':
                this.openAppAndClose(appId);
                break;
            case 'pin-start':
                this.pinToStart(appId);
                break;
            case 'unpin-start':
                this.unpinFromStart(appId);
                break;
            case 'pin-taskbar':
                Taskbar.pinApp(appId);
                break;
            case 'unpin-taskbar':
                Taskbar.unpinApp(appId);
                break;
            case 'settings':
                this.openAppSettings(appId);
                break;
            case 'uninstall': {
                const targetApp = Desktop.apps.find(a => a.id === appId);
                const appName = targetApp ? Desktop.getAppName(targetApp) : appId;

                // 检查应用是否正在运行
                const isRunning = typeof WindowManager !== 'undefined' &&
                    WindowManager.windows.some(w => w.appId === appId);

                const doUninstall = () => {
                    FluentUI.Dialog({
                        title: t('start.ctx.confirm-uninstall'),
                        content: t('start.ctx.confirm-uninstall-msg', { name: appName }),
                        type: 'warning',
                        buttons: [
                            { text: t('start.ctx.cancel'), variant: 'secondary' },
                            { text: t('start.ctx.uninstall'), variant: 'danger', value: 'uninstall' }
                        ],
                        onClose: (result) => {
                            if (result === 'uninstall') {
                                if (typeof AppShop !== 'undefined' && AppShop.uninstallApp) {
                                    AppShop.uninstallApp(appId, {
                                        skipConfirm: true,
                                        skipRunningCheck: true
                                    });
                                }
                            }
                        }
                    });
                };

                if (isRunning) {
                    FluentUI.Dialog({
                        title: t('start.ctx.app-running', { name: appName }),
                        content: t('start.ctx.app-running-msg', { name: appName }),
                        type: 'warning',
                        buttons: [
                            { text: t('start.ctx.cancel'), variant: 'secondary' },
                            { text: t('start.ctx.continue'), variant: 'danger', value: 'confirm' }
                        ],
                        onClose: (result) => {
                            if (result === 'confirm') {
                                // 关闭该应用所有窗口
                                const wins = WindowManager.windows.filter(w => w.appId === appId);
                                wins.forEach(w => WindowManager.closeWindow(w.id));
                                setTimeout(() => doUninstall(), 300);
                            }
                        }
                    });
                } else {
                    doUninstall();
                }
                break;
            }
        }
    }
};
