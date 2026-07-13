/**
 * 任务栏模块
 */
const Taskbar = {
    element: null,
    startBtn: null,
    appsContainer: null,
    controlCenterBtn: null,
    notificationBtn: null,
    timeElement: null,
    dateElement: null,
    timeInterval: null,
    contextMenu: null,
    startContextMenu: null,
    startPowerMenu: null,
    _startPowerHideTimer: null,
    taskViewBtn: null,
    _taskViewIgnoreClickUntil: 0,
    _hoverPreview: null,
    _hoverPreviewTimer: null,
    _hoverPreviewHideTimer: null,
    _hoverPreviewButton: null,
    _hoverPreviewAppId: null,
    _hoverPreviewWindowId: null,

    init() {
        this.element = document.getElementById('taskbar');
        this.startBtn = document.getElementById('start-btn');
        this.appsContainer = document.getElementById('taskbar-apps');
        this.controlCenterBtn = document.getElementById('control-center-btn');
        this.notificationBtn = document.getElementById('notification-btn');
        this.timeElement = document.getElementById('taskbar-time');
        this.dateElement = document.getElementById('taskbar-date');
        this.taskViewBtn = document.getElementById('taskview-btn');

        this.createContextMenu();
        this.createStartContextMenus();
        this.renderApps();
        this.bindEvents();
        this.updateTime();
        this.timeInterval = setInterval(() => this.updateTime(), 1000);

        // 监听应用状态变化
        State.on('appStart', (appId) => this.onAppStart(appId));
        State.on('appStop', (appId) => this.onAppStop(appId));
        State.on('languageChange', () => {
            this.renderApps();
            this.createStartContextMenus();
        });
        
        // 监听应用修复状态变化
        State.on('appRepairStart', (appId) => this.updateAppRepairState(appId, true));
        State.on('appRepairEnd', (appId) => this.updateAppRepairState(appId, false));
    },
    
    // 更新任务栏应用修复状态
    updateAppRepairState(appId, isRepairing) {
        const btn = this.appsContainer.querySelector(`[data-app-id="${appId}"]`);
        if (btn) {
            btn.classList.toggle('repairing', isRepairing);
            btn.disabled = isRepairing;
            btn.setAttribute('aria-disabled', isRepairing ? 'true' : 'false');
        }
    },

    createContextMenu() {
        // 创建任务栏右键菜单
        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'context-menu hidden';
        this.contextMenu.id = 'taskbar-context-menu';
        document.body.appendChild(this.contextMenu);
    },

    createStartContextMenus() {
        if (typeof FluentUI === 'undefined' || typeof FluentUI.ContextMenu !== 'function') return;
        this.startContextMenu?.remove();
        this.startPowerMenu?.remove();
        this.startContextMenu = null;
        this.startPowerMenu = null;

        const runAction = (action) => {
            this.hideStartContextMenus();
            switch (action) {
                case 'terminal':
                case 'process-manager':
                case 'settings':
                case 'files':
                    WindowManager.openApp(action);
                    break;
                case 'search': {
                    if (typeof StartMenu !== 'undefined') StartMenu.open();
                    setTimeout(() => {
                        const input = document.getElementById('start-search-input');
                        input?.focus();
                        input?.select?.();
                    }, 0);
                    break;
                }
                case 'desktop':
                    globalThis.FluentOSShowDesktop?.();
                    break;
            }
        };

        this.startContextMenu = FluentUI.ContextMenu({
            id: 'start-button-context-menu',
            className: 'context-menu start-button-context-menu',
            items: [
                { id: 'terminal', label: t('terminal.title'), icon: 'Terminal', onClick: () => runAction('terminal') },
                { id: 'process-manager', label: t('processManager.title'), icon: 'Checklist Note', onClick: () => runAction('process-manager') },
                { id: 'settings', label: t('settings.title'), icon: 'Settings', onClick: () => runAction('settings') },
                { id: 'files', label: t('files.title'), icon: 'Folder', onClick: () => runAction('files') },
                { id: 'search', label: t('start.quick.search'), icon: 'Search', onClick: () => runAction('search') },
                { separator: true },
                { id: 'power', label: t('start.quick.power'), icon: 'Shut Down' },
                { id: 'desktop', label: t('start.quick.desktop'), icon: 'Home', onClick: () => runAction('desktop') }
            ]
        });

        this.startPowerMenu = FluentUI.ContextMenu({
            id: 'start-button-power-menu',
            className: 'context-menu start-button-power-menu',
            items: [
                { id: 'lock', label: t('start.power.lock'), icon: 'Lock', onClick: () => this.handleStartPowerAction('lock') },
                { id: 'logout', label: t('start.power.logout'), icon: 'Logout', onClick: () => this.handleStartPowerAction('logout') },
                { id: 'restart', label: t('start.power.restart'), icon: 'Refresh', onClick: () => this.handleStartPowerAction('restart') },
                { id: 'shutdown', label: t('start.power.shutdown'), icon: 'Shut Down', onClick: () => this.handleStartPowerAction('shutdown') }
            ]
        });

        [this.startContextMenu, this.startPowerMenu].forEach((menu) => {
            menu.setAttribute('role', 'menu');
            menu.querySelectorAll('.fluent-context-menu-item').forEach((item) => {
                item.classList.add('context-menu-item');
                item.setAttribute('role', 'menuitem');
                item.tabIndex = -1;
            });
            menu.querySelectorAll('.fluent-context-menu-separator').forEach((item) => item.classList.add('context-menu-separator'));
            document.body.appendChild(menu);
        });

        const powerItem = this.startContextMenu.querySelector('[data-action="power"]');
        if (powerItem) {
            powerItem.classList.add('has-submenu');
            powerItem.setAttribute('aria-haspopup', 'menu');
            powerItem.setAttribute('aria-expanded', 'false');
            powerItem.insertAdjacentHTML('beforeend', '<img class="context-submenu-arrow" src="Theme/Icon/Symbol_icon/stroke/Chevron Right.svg" alt="">');
            powerItem.addEventListener('mouseenter', () => this.showStartPowerMenu());
            powerItem.addEventListener('focusin', () => this.showStartPowerMenu());
            powerItem.addEventListener('click', (event) => {
                event.stopPropagation();
                this.showStartPowerMenu();
            });
            powerItem.addEventListener('keydown', (event) => {
                if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.showStartPowerMenu(true);
                }
            });
        }

        const keepPowerOpen = () => {
            clearTimeout(this._startPowerHideTimer);
            this._startPowerHideTimer = null;
        };
        this.startContextMenu.addEventListener('mouseenter', keepPowerOpen);
        this.startPowerMenu.addEventListener('mouseenter', keepPowerOpen);
        this.startContextMenu.addEventListener('mouseleave', () => this.scheduleHideStartPowerMenu());
        this.startPowerMenu.addEventListener('mouseleave', () => this.scheduleHideStartPowerMenu());
        this.bindStartMenuKeyboard(this.startContextMenu, false);
        this.bindStartMenuKeyboard(this.startPowerMenu, true);
    },

    bindStartMenuKeyboard(menu, isSubmenu) {
        menu?.addEventListener('keydown', (event) => {
            const items = Array.from(menu.querySelectorAll('.fluent-context-menu-item:not(.disabled)'));
            const current = items.indexOf(document.activeElement);
            let next = -1;
            if (event.key === 'ArrowDown') next = current < items.length - 1 ? current + 1 : 0;
            else if (event.key === 'ArrowUp') next = current > 0 ? current - 1 : items.length - 1;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = items.length - 1;
            else if (isSubmenu && event.key === 'ArrowLeft') {
                event.preventDefault();
                this.hideStartPowerMenu();
                this.startContextMenu?.querySelector('[data-action="power"]')?.focus();
                return;
            } else if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                this.hideStartContextMenus();
                this.startBtn?.focus();
                return;
            }
            if (next >= 0) {
                event.preventDefault();
                items[next]?.focus();
            }
        });
    },

    showStartContextMenu(event) {
        if (!this.startContextMenu) return;
        this.hideContextMenu();
        this.hideHoverPreview(true);
        if (typeof StartMenu !== 'undefined') StartMenu.close();
        this.startPowerMenu?.hide();
        this.startContextMenu.show(event.clientX, event.clientY);

        const rect = this.startContextMenu.getBoundingClientRect();
        const buttonRect = this.startBtn.getBoundingClientRect();
        const margin = 8;
        const left = Math.max(margin, Math.min(event.clientX, window.innerWidth - rect.width - margin));
        const top = Math.max(margin, buttonRect.top - rect.height - margin);
        this.startContextMenu.style.left = `${left}px`;
        this.startContextMenu.style.top = `${top}px`;
        this.startContextMenu.querySelector('.fluent-context-menu-item')?.focus();
    },

    showStartPowerMenu(focusFirst = false) {
        if (!this.startContextMenu || !this.startPowerMenu || this.startContextMenu.classList.contains('hidden')) return;
        clearTimeout(this._startPowerHideTimer);
        const parentItem = this.startContextMenu.querySelector('[data-action="power"]');
        if (!parentItem) return;

        this.startPowerMenu.show(0, 0);
        const parentRect = parentItem.getBoundingClientRect();
        const menuRect = this.startPowerMenu.getBoundingClientRect();
        const margin = 8;
        let left = parentRect.right + 6;
        if (left + menuRect.width > window.innerWidth - margin) left = parentRect.left - menuRect.width - 6;
        const top = Math.max(margin, Math.min(parentRect.top, window.innerHeight - menuRect.height - margin));
        this.startPowerMenu.style.left = `${Math.max(margin, left)}px`;
        this.startPowerMenu.style.top = `${top}px`;
        parentItem.classList.add('submenu-open');
        parentItem.setAttribute('aria-expanded', 'true');
        if (focusFirst) this.startPowerMenu.querySelector('.fluent-context-menu-item')?.focus();
    },

    scheduleHideStartPowerMenu() {
        clearTimeout(this._startPowerHideTimer);
        this._startPowerHideTimer = setTimeout(() => {
            const hoveringParent = this.startContextMenu?.matches(':hover');
            const hoveringChild = this.startPowerMenu?.matches(':hover');
            if (hoveringParent || hoveringChild) return;
            this.hideStartPowerMenu();
        }, 140);
    },

    hideStartPowerMenu() {
        clearTimeout(this._startPowerHideTimer);
        this._startPowerHideTimer = null;
        this.startPowerMenu?.hide();
        const parentItem = this.startContextMenu?.querySelector('[data-action="power"]');
        parentItem?.classList.remove('submenu-open');
        parentItem?.setAttribute('aria-expanded', 'false');
    },

    hideStartContextMenus() {
        this.startContextMenu?.hide();
        this.hideStartPowerMenu();
    },

    handleStartPowerAction(action) {
        this.hideStartContextMenus();
        if (action === 'lock') State.lock();
        else if (action === 'logout') State.logout();
        else if (action === 'restart') State.restart();
        else if (action === 'shutdown') State.shutdown();
    },

    renderApps() {
        this.hideHoverPreview(true);
        this.appsContainer.innerHTML = '';
        
        // 获取固定的应用和运行中的应用
        const pinnedApps = State.settings.pinnedApps || [];
        const runningApps = Array.from(State.runningApps);
        
        // 合并列表：固定的应用 + 未固定但运行中的应用
        const allApps = [...new Set([...pinnedApps, ...runningApps])];
        
        allApps.forEach(appId => {
            this.renderAppButton(appId);
        });
        this.syncAllAppIndicators();
    },

    getWindowState(appId) {
        if (typeof WindowManager === 'undefined' || !Array.isArray(WindowManager.windows)) return null;
        return WindowManager.windows.find((w) => w && w.appId === appId && w.element && !w.element.classList.contains('closing')) || null;
    },

    syncAppIndicator(appId, windowState = null) {
        const btn = this.appsContainer.querySelector(`[data-app-id="${appId}"]`);
        if (!btn) return;

        const state = windowState || this.getWindowState(appId);
        const isOpen = !!state;
        const isMinimized = !!state && (state.isMinimized === true || state.element?.style.display === 'none');
        const isActive = !!state && !isMinimized && !state.isMinimizing && !state.isRestoring && !state.element.classList.contains('window-inactive');

        btn.classList.toggle('running', isOpen || isMinimized);
        btn.classList.toggle('taskbar-app-active', isActive);
        btn.classList.toggle('taskbar-app-minimized', isMinimized);
    },

    syncAllAppIndicators() {
        const ids = new Set([
            ...Array.from(State.runningApps || []),
            ...(WindowManager && Array.isArray(WindowManager.windows) ? WindowManager.windows.map((w) => w && w.appId).filter(Boolean) : [])
        ]);
        ids.forEach((appId) => this.syncAppIndicator(appId));
    },

    renderAppButton(appId) {
        const app = Desktop.apps.find(a => a.id === appId);
        if (!app) return;

        // 检查是否已存在
        let btn = this.appsContainer.querySelector(`[data-app-id="${appId}"]`);
        if (btn) return btn;

        btn = document.createElement('button');
        btn.className = 'taskbar-btn taskbar-app';
        btn.dataset.appId = appId;
        const name = Desktop.getAppName(app);
        btn.innerHTML = `<img src="${app.icon}" alt="${name}">`;
        btn.title = name;
        const repairing = typeof SettingsApp !== 'undefined' && SettingsApp.isAppRepairing(appId);
        btn.classList.toggle('repairing', repairing);
        btn.disabled = repairing;
        btn.setAttribute('aria-disabled', repairing ? 'true' : 'false');
        
        // 检查是否运行中
        if (State.runningApps.has(appId)) {
            btn.classList.add('running');
        }
        
        // 添加出现动画
        if (State.settings.enableAnimation) {
            btn.classList.add('taskbar-app-entering');
            setTimeout(() => {
                btn.classList.remove('taskbar-app-entering');
            }, 400);
        }
        
        this.appsContainer.appendChild(btn);
        return btn;
    },

    _escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    _previewWindowZ(windowData) {
        return Number.parseInt(windowData?.element?.style?.zIndex || windowData?.zIndex || '0', 10) || 0;
    },

    _getPreviewWindowForApp(appId) {
        if (typeof WindowManager === 'undefined' || !Array.isArray(WindowManager.windows)) return null;
        const windows = WindowManager.windows
            .filter((w) => w && w.appId === appId && w.element && !w.element.classList.contains('closing'))
            .sort((a, b) => this._previewWindowZ(b) - this._previewWindowZ(a));
        if (!windows.length) return null;
        return windows.find((w) => this._isWindowActive(w)) || windows[0];
    },

    _getPreviewTitle(windowData) {
        const title = windowData?.element?.querySelector('.window-title')?.textContent?.trim();
        if (title) return title;
        const config = (typeof WindowManager !== 'undefined' && WindowManager.getAppConfig) ? WindowManager.getAppConfig(windowData.appId) : null;
        const app = (typeof Desktop !== 'undefined' && Desktop.apps) ? Desktop.apps.find(a => a.id === windowData.appId) : null;
        if (app && typeof Desktop.getAppName === 'function') return Desktop.getAppName(app);
        return config?.title || app?.name || windowData?.appId || 'App';
    },

    _getPreviewIcon(windowData) {
        const config = (typeof WindowManager !== 'undefined' && WindowManager.getAppConfig) ? WindowManager.getAppConfig(windowData.appId) : null;
        const app = (typeof Desktop !== 'undefined' && Desktop.apps) ? Desktop.apps.find(a => a.id === windowData.appId) : null;
        return config?.icon || app?.icon || windowData?.element?.querySelector('.window-icon')?.getAttribute('src') || '';
    },

    _readPixel(value, fallback) {
        if (typeof value === 'string' && value.trim() && !value.trim().endsWith('px')) return fallback;
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) && parsed > 1 ? parsed : fallback;
    },

    _getPreviewBounds(windowData) {
        const el = windowData.element;
        const rect = el.getBoundingClientRect();
        const config = (typeof WindowManager !== 'undefined' && WindowManager.getAppConfig) ? WindowManager.getAppConfig(windowData.appId) : null;
        const saved = windowData.savedPosition || windowData.lastNormalBounds || windowData.savedBounds || {};
        const fallbackWidth = this._readPixel(config?.width, rect.width || 900);
        const fallbackHeight = this._readPixel(config?.height, rect.height || 600);
        const width = this._readPixel(el.style.width, this._readPixel(saved.width, fallbackWidth));
        const height = this._readPixel(el.style.height, this._readPixel(saved.height, fallbackHeight));
        return {
            width: Math.max(320, Math.round(width || 900)),
            height: Math.max(220, Math.round(height || 600))
        };
    },

    _stripPreviewCloneIds(root) {
        if (!root) return;
        if (root.removeAttribute) root.removeAttribute('id');
        root.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    },

    _copyPreviewCanvases(sourceRoot, cloneRoot) {
        const sourceCanvases = sourceRoot?.querySelectorAll?.('canvas') || [];
        const cloneCanvases = cloneRoot?.querySelectorAll?.('canvas') || [];
        sourceCanvases.forEach((source, index) => {
            const target = cloneCanvases[index];
            if (!target) return;
            try {
                target.width = source.width;
                target.height = source.height;
                const ctx = target.getContext('2d');
                if (ctx) ctx.drawImage(source, 0, 0);
            } catch (_) {}
        });
    },

    _clearHoverPreviewTimers() {
        clearTimeout(this._hoverPreviewTimer);
        clearTimeout(this._hoverPreviewHideTimer);
        this._hoverPreviewTimer = null;
        this._hoverPreviewHideTimer = null;
    },

    _scheduleHoverPreview(btn) {
        if (!btn || this._appDragging) return;
        clearTimeout(this._hoverPreviewTimer);
        clearTimeout(this._hoverPreviewHideTimer);
        this._hoverPreviewButton = btn;
        this._hoverPreviewTimer = setTimeout(() => {
            const windowData = this._getPreviewWindowForApp(btn.dataset.appId);
            if (!windowData) {
                this.hideHoverPreview(true);
                return;
            }
            this.showHoverPreview(btn, windowData);
        }, 360);
    },

    _scheduleHideHoverPreview() {
        clearTimeout(this._hoverPreviewTimer);
        clearTimeout(this._hoverPreviewHideTimer);
        this._hoverPreviewTimer = null;
        this._hoverPreviewHideTimer = setTimeout(() => this.hideHoverPreview(), 180);
    },

    _positionHoverPreview(preview = this._hoverPreview, btn = this._hoverPreviewButton) {
        if (!preview || !btn) return;
        const rect = btn.getBoundingClientRect();
        const width = preview.offsetWidth || 260;
        const height = preview.offsetHeight || 190;
        const margin = 8;
        let left = rect.left + rect.width / 2 - width / 2;
        left = Math.max(margin, Math.min(window.innerWidth - width - margin, left));
        let top = rect.top - height - 10;
        if (top < margin) top = rect.bottom + 10;
        preview.style.left = `${Math.round(left)}px`;
        preview.style.top = `${Math.round(top)}px`;
    },

    showHoverPreview(btn, windowData) {
        if (!btn || !windowData?.element) return;
        this.hideHoverPreview(true);
        const title = this._getPreviewTitle(windowData);
        const icon = this._getPreviewIcon(windowData);
        const bounds = this._getPreviewBounds(windowData);
        const preview = document.createElement('div');
        preview.className = 'taskbar-window-preview';
        preview.dataset.appId = windowData.appId || '';
        preview.dataset.windowId = windowData.id || '';
        preview.innerHTML = `
            <div class="taskbar-window-preview-titlebar">
                <div class="taskbar-window-preview-title">
                    ${icon ? `<img src="${this._escapeHtml(icon)}" alt="">` : ''}
                    <span>${this._escapeHtml(title)}</span>
                </div>
                <button class="taskbar-window-preview-close" type="button" aria-label="${this._escapeHtml(t('close'))}">
                    <img src="Theme/Icon/Symbol_icon/stroke/Cancel.svg" alt="">
                </button>
            </div>
        `;

        const frame = document.createElement('div');
        frame.className = 'taskbar-window-preview-frame';
        const clone = windowData.element.cloneNode(true);
        this._stripPreviewCloneIds(clone);
        this._copyPreviewCanvases(windowData.element, clone);
        clone.classList.remove('opening', 'closing', 'minimizing', 'restoring', 'maximizing', 'unmaximizing', 'maximized');
        clone.classList.add('taskbar-window-preview-clone');
        clone.style.position = 'absolute';
        clone.style.left = '0';
        clone.style.top = '0';
        clone.style.width = `${bounds.width}px`;
        clone.style.height = `${bounds.height}px`;
        clone.style.minWidth = '0';
        clone.style.minHeight = '0';
        clone.style.margin = '0';
        clone.style.display = 'flex';
        clone.style.transformOrigin = 'top left';
        clone.style.transition = 'none';
        clone.style.pointerEvents = 'none';
        clone.style.zIndex = '1';
        clone.style.opacity = '1';
        clone.style.boxShadow = 'none';

        const maxWidth = 280;
        const maxHeight = 164;
        const scale = Math.min(maxWidth / bounds.width, maxHeight / bounds.height, 1);
        clone.style.transform = `scale(${Number(scale.toFixed(4))})`;
        frame.style.width = `${Math.round(bounds.width * scale)}px`;
        frame.style.height = `${Math.round(bounds.height * scale)}px`;
        frame.appendChild(clone);
        preview.appendChild(frame);

        preview.addEventListener('pointerenter', () => this._clearHoverPreviewTimers());
        preview.addEventListener('pointerleave', () => this._scheduleHideHoverPreview());
        preview.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const target = (typeof WindowManager !== 'undefined' && Array.isArray(WindowManager.windows))
                ? WindowManager.windows.find((w) => w.id === windowData.id)
                : null;
            if (event.target.closest('.taskbar-window-preview-close')) {
                if (target) WindowManager.closeWindow(target.id);
                this.hideHoverPreview(true);
                return;
            }
            if (target) WindowManager.focusWindow(target.id);
            this.hideHoverPreview(true);
        });

        document.body.appendChild(preview);
        this._hoverPreview = preview;
        this._hoverPreviewButton = btn;
        this._hoverPreviewAppId = windowData.appId || null;
        this._hoverPreviewWindowId = windowData.id || null;
        this._positionHoverPreview(preview, btn);
        requestAnimationFrame(() => {
            this._positionHoverPreview(preview, btn);
            preview.classList.add('show');
        });
    },

    hideHoverPreview(immediate = false) {
        this._clearHoverPreviewTimers();
        const preview = this._hoverPreview;
        if (!preview) return;
        this._hoverPreview = null;
        this._hoverPreviewButton = null;
        this._hoverPreviewAppId = null;
        this._hoverPreviewWindowId = null;
        const remove = () => preview.remove();
        if (immediate) {
            remove();
            return;
        }
        preview.classList.remove('show');
        setTimeout(remove, 160);
    },
    bindEvents() {
        // 开始按钮
        this.startBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideStartContextMenus();
            StartMenu.toggle();
        });

        this.startBtn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showStartContextMenu(e);
        });

        // 应用图标拖拽 → 固定到桌面
        this.appsContainer.addEventListener('pointerdown', (e) => this._onAppPointerDown(e));
        // 禁止浏览器原生拖拽（原生拖拽会触发 pointercancel，打断指针拖拽）
        this.appsContainer.addEventListener('dragstart', (e) => e.preventDefault());

        this.appsContainer.addEventListener('pointerover', (e) => {
            const btn = e.target.closest('.taskbar-app');
            if (!btn || !this.appsContainer.contains(btn)) return;
            const related = e.relatedTarget;
            if (related && (btn.contains(related) || this._hoverPreview?.contains(related))) return;
            this._scheduleHoverPreview(btn);
        });

        this.appsContainer.addEventListener('pointerout', (e) => {
            const btn = e.target.closest('.taskbar-app');
            if (!btn) return;
            const related = e.relatedTarget;
            if (related && (btn.contains(related) || this._hoverPreview?.contains(related))) return;
            this._scheduleHideHoverPreview();
        });

        this.appsContainer.addEventListener('click', (e) => {
            if (this._appDragging) return;
            const btn = e.target.closest('.taskbar-app');
            if (!btn) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            this._handleAppClick(btn.dataset.appId);
        }, true);

        this.appsContainer.addEventListener('dblclick', (e) => {
            if (this._appDragging) return;
            const btn = e.target.closest('.taskbar-app');
            if (!btn) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            this._handleAppDoubleClick(btn.dataset.appId);
        }, true);

        // 应用图标点击
        this.appsContainer.addEventListener('click', (e) => {
            if (this._appDragging) return; // 拖拽结束后的 click 不触发打开/切换
            const btn = e.target.closest('.taskbar-app');
            if (btn) {
                const appId = btn.dataset.appId;
                if (State.runningApps.has(appId)) {
                    // 如果应用已运行，切换窗口显示
                    WindowManager.toggleWindow(appId);
                    WindowManager._syncTaskbarAppState?.(appId);
                } else {
                    // 打开应用
                    WindowManager.openApp(appId);
                    WindowManager._syncTaskbarAppState?.(appId);
                }
            }
        });

        // 应用图标右键菜单
        this.appsContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const btn = e.target.closest('.taskbar-app');
            if (btn) {
                const appId = btn.dataset.appId;
                this.showContextMenu(e, appId);
            }
        });

        // 控制中心按钮
        this.controlCenterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ControlCenter.toggle();
        });

        // 通知按钮
        this.notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            NotificationCenter.toggle();
        });

        // 任务视图按钮
        this.taskViewBtn?.addEventListener('pointerdown', (e) => {
            if (typeof e.button === 'number' && e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            const now = globalThis.performance ? performance.now() : Date.now();
            this._taskViewIgnoreClickUntil = now + 220;
            if (typeof TaskView !== 'undefined') TaskView.toggle();
        });

        this.taskViewBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const now = globalThis.performance ? performance.now() : Date.now();
            if (now < this._taskViewIgnoreClickUntil) return;
            if (typeof TaskView !== 'undefined') TaskView.toggle();
        });

        window.addEventListener('resize', () => this.hideHoverPreview(true));

        // 点击外部关闭右键菜单
        document.addEventListener('click', () => {
            this.hideContextMenu();
            this.hideStartContextMenus();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hideStartContextMenus();
        });

        window.addEventListener('resize', () => this.hideStartContextMenus());

        // 全局快捷键在 main.js 统一注册
    },

    showContextMenu(event, appId) {
        const app = Desktop.apps.find(a => a.id === appId);
        if (!app) return;

        const isPinned = (State.settings.pinnedApps || []).includes(appId);
        const isRunning = State.runningApps.has(appId);

        let menuHTML = '';
        
        if (isRunning) {
            menuHTML += `
                <div class="context-menu-item" data-action="close" data-app-id="${appId}">
                    <img src="Theme/Icon/Symbol_icon/stroke/Cancel.svg" alt="">
                    <span>关闭</span>
                </div>
            `;
        }
        
        if (isPinned) {
            menuHTML += `
                <div class="context-menu-item" data-action="unpin" data-app-id="${appId}">
                    <img src="Theme/Icon/Symbol_icon/fill/Pin.svg" alt="">
                    <span>取消固定</span>
                </div>
            `;
        } else {
            menuHTML += `
                <div class="context-menu-item" data-action="pin" data-app-id="${appId}">
                    <img src="Theme/Icon/Symbol_icon/stroke/Pin.svg" alt="">
                    <span>固定到任务栏</span>
                </div>
            `;
        }

        this.contextMenu.innerHTML = menuHTML;
        
        // 先显示菜单以获取尺寸
        this.contextMenu.style.visibility = 'hidden';
        this.contextMenu.classList.remove('hidden');
        const menuWidth = this.contextMenu.offsetWidth;
        const menuHeight = this.contextMenu.offsetHeight;
        
        // 计算菜单位置：在点击位置正上方，水平居中
        const menuLeft = event.clientX - menuWidth / 2;
        const menuBottom = window.innerHeight - event.clientY + 8;
        
        this.contextMenu.style.left = `${menuLeft}px`;
        this.contextMenu.style.bottom = `${menuBottom}px`;
        this.contextMenu.style.top = 'auto';
        this.contextMenu.style.visibility = 'visible';

        // 绑定菜单项点击事件
        this.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.dataset.action;
                const targetAppId = item.dataset.appId;
                this.handleContextMenuAction(action, targetAppId);
            });
        });
    },

    hideContextMenu() {
        this.contextMenu.classList.add('hidden');
    },

    handleContextMenuAction(action, appId) {
        this.hideContextMenu();
        
        switch (action) {
            case 'close':
                // 关闭应用的所有窗口
                const windows = WindowManager.windows.filter(w => w.appId === appId);
                windows.forEach(w => WindowManager.closeWindow(w.id));
                break;
            case 'pin':
                this.pinApp(appId);
                break;
            case 'unpin':
                this.unpinApp(appId);
                break;
        }
    },

    /**
     * 任务栏 App 图标的拖拽：超过阈值后出现跟随图标的幽灵，
     * 松手时若落在桌面区域，则在桌面创建该 App 的快捷方式。
     */
    _getAppWindow(appId) {
        if (typeof WindowManager === 'undefined') return null;
        if (typeof WindowManager.getAppWindow === 'function') return WindowManager.getAppWindow(appId);
        return WindowManager.windows?.find((w) =>
            w &&
            w.appId === appId &&
            w.element &&
            !w.element.classList.contains('closing')
        ) || null;
    },

    _isWindowMinimized(windowData) {
        return !!windowData && (
            windowData.isMinimized === true ||
            windowData.isMinimizing === true ||
            windowData.element?.style.display === 'none'
        );
    },

    _isWindowVisible(windowData) {
        return !!windowData &&
            windowData.isMinimized !== true &&
            windowData.isMinimizing !== true &&
            windowData.element &&
            windowData.element.style.display !== 'none' &&
            !windowData.element.classList.contains('closing');
    },

    _getVisibleWindowCount() {
        if (typeof WindowManager === 'undefined' || !Array.isArray(WindowManager.windows)) return 0;
        return WindowManager.windows.filter((w) => this._isWindowVisible(w)).length;
    },

    _isWindowActive(windowData) {
        return !!windowData &&
            typeof WindowManager !== 'undefined' &&
            WindowManager.activeWindowId === windowData.id &&
            !windowData.element?.classList.contains('window-inactive');
    },

    _runAppSingleClick(appId) {
        const windowData = this._getAppWindow(appId);
        if (!windowData) {
            WindowManager.openApp(appId);
            WindowManager._syncTaskbarAppState?.(appId);
            return;
        }

        if (this._isWindowMinimized(windowData)) {
            WindowManager.focusWindow(windowData.id);
            WindowManager._syncTaskbarAppState?.(appId);
            return;
        }

        const visibleCount = this._getVisibleWindowCount();
        const isActive = this._isWindowActive(windowData);
        if (visibleCount <= 1 || isActive) {
            WindowManager.minimizeWindow(windowData.id);
            WindowManager._syncTaskbarAppState?.(appId);
            return;
        }

        WindowManager.focusWindow(windowData.id, { forceMotion: true });
        WindowManager._syncTaskbarAppState?.(appId);
    },

    _handleAppClick(appId) {
        this._runAppSingleClick(appId);
    },

    _handleAppDoubleClick(appId) {
        void appId;
    },

    _onAppPointerDown(e) {
        if (typeof e.button === 'number' && e.button !== 0) return;
        const btn = e.target.closest('.taskbar-app');
        if (!btn) return;
        const appId = btn.dataset.appId;
        this.hideHoverPreview(true);
        const startX = e.clientX;
        const startY = e.clientY;
        let ghost = null;
        let dragging = false;

        const onMove = (ev) => {
            if (!dragging) {
                if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 10) return;
                dragging = true;
                this.hideHoverPreview(true);
                this._appDragging = true;
                const app = Desktop.apps.find(a => a.id === appId);
                ghost = document.createElement('div');
                ghost.className = 'taskbar-drag-ghost';
                ghost.innerHTML = `<img src="${app ? app.icon : ''}" alt="">`;
                document.body.appendChild(ghost);
            }
            ghost.style.left = `${ev.clientX}px`;
            ghost.style.top = `${ev.clientY}px`;
            ghost.classList.toggle('droppable', this._isDesktopDropPoint(ev.clientX, ev.clientY));
        };

        const onUp = (ev) => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onUp);
            if (!dragging) return;
            if (ghost) ghost.remove();
            if (ev.type === 'pointerup' && this._isDesktopDropPoint(ev.clientX, ev.clientY)) {
                Desktop.addAppShortcut(appId);
            }
            // click 事件在 pointerup 之后同步派发，再之后才轮到定时器
            setTimeout(() => { this._appDragging = false; }, 0);
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
    },

    /** 判断坐标是否落在可放置快捷方式的桌面区域（开始菜单拖拽也复用） */
    _isDesktopDropPoint(x, y) {
        if (typeof State !== 'undefined' && State.view !== 'desktop') return false;
        const el = document.elementFromPoint(x, y);
        if (!el) return false;
        if (el.closest('.taskbar') || el.closest('.window') || el.closest('#widgets-drawer') || el.closest('#start-menu')) return false;
        return !!el.closest('#desktop-screen');
    },

    pinApp(appId) {
        const pinnedApps = State.settings.pinnedApps || [];
        if (!pinnedApps.includes(appId)) {
            pinnedApps.push(appId);
            State.updateSettings({ pinnedApps });
            this.renderApps();
            State.addNotification({
                title: '任务栏',
                message: '已固定到任务栏',
                type: 'success'
            });
        }
    },

    unpinApp(appId) {
        const pinnedApps = State.settings.pinnedApps || [];
        const index = pinnedApps.indexOf(appId);
        if (index !== -1) {
            pinnedApps.splice(index, 1);
            State.updateSettings({ pinnedApps });
            
            // 如果应用未运行，从任务栏移除
            if (!State.runningApps.has(appId)) {
                const btn = this.appsContainer.querySelector(`[data-app-id="${appId}"]`);
                if (btn) btn.remove();
            }
            
            State.addNotification({
                title: '任务栏',
                message: '已从任务栏取消固定',
                type: 'success'
            });
        }
    },

    onAppStart(appId) {
        // 应用启动时，确保在任务栏显示
        const btn = this.appsContainer.querySelector(`[data-app-id="${appId}"]`);
        if (btn) {
            btn.classList.add('running');
        } else {
            // 如果任务栏没有这个图标，添加它
            this.renderAppButton(appId);
        }
        this.syncAppIndicator(appId);
    },

    onAppStop(appId) {
        if (this._hoverPreviewAppId === appId) this.hideHoverPreview(true);
        // 应用关闭时，更新状态
        const btn = this.appsContainer.querySelector(`[data-app-id="${appId}"]`);
        if (btn) {
            btn.classList.remove('running');
            btn.classList.remove('taskbar-app-active');
            btn.classList.remove('taskbar-app-minimized');
            
            // 如果应用未固定，从任务栏移除（带动画）
            const isPinned = (State.settings.pinnedApps || []).includes(appId);
            if (!isPinned) {
                if (State.settings.enableAnimation) {
                    btn.classList.add('taskbar-app-exiting');
                    setTimeout(() => {
                        btn.remove();
                    }, 300);
                } else {
                    btn.remove();
                }
            }
        }
        this.syncAppIndicator(appId);
    },

    updateTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        this.timeElement.textContent = `${hours}:${minutes}`;
        this.dateElement.textContent = `${month}/${day}`;
    }
};
