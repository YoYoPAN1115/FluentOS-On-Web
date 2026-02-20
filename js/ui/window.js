/**
 * 窗口管理器 - Window Manager
 * Manages all application windows, including creation, positioning, snapping, and lifecycle.
 */
const WindowManager = {
    container: null,
    windows: [],
    zIndexCounter: 1000,
    WINDOW_BOUNDS_KEY: 'windowBoundsMemory',
    SNAP_MENU_HIDE_DELAY: 130,
    EDGE_SNAP_TRIGGER: 42,
    CORNER_SNAP_TRIGGER: 110,
    TASKBAR_AUTO_HIDE_EDGE: 2,
    TASKBAR_AUTO_HIDE_DELAY: 240,
    TASKBAR_HIDE_ANIM_MS: 380,
    MINIMIZE_DOCK_SCALE: 0.08,
    MINIMIZE_DURATION_MS: 460,
    RESTORE_DURATION_MS: 520,
    TASKBAR_ICON_FEEDBACK_MS: 280,
    _taskbarAutoHideBound: false,
    _taskbarAutoHideTimer: null,
    _taskbarHideAnimTimer: null,
    SNAP_LAYOUTS: [
        { id: 'left-half', previewClass: 'preview-left-half', size: 'large' },
        { id: 'right-half', previewClass: 'preview-right-half', size: 'large' },
        { id: 'left-two-thirds', previewClass: 'preview-left-two-thirds', size: 'large' },
        { id: 'right-two-thirds', previewClass: 'preview-right-two-thirds', size: 'large' },
        { id: 'top-left', previewClass: 'preview-top-left', size: 'small' },
        { id: 'top-right', previewClass: 'preview-top-right', size: 'small' },
        { id: 'bottom-left', previewClass: 'preview-bottom-left', size: 'small' },
        { id: 'bottom-right', previewClass: 'preview-bottom-right', size: 'small' }
    ],

    // 应用配置 - Application configurations
    appConfigs: {
        files: { titleKey: 'files.title', icon: 'Theme/Icon/App_icon/files.png', width: 900, height: 600, component: 'FilesApp' },
        settings: { titleKey: 'settings.title', icon: 'Theme/Icon/App_icon/settings.png', width: 950, height: 650, component: 'SettingsApp' },
        calculator: { titleKey: 'calculator.title', icon: 'Theme/Icon/App_icon/calculator.png', width: 400, height: 550, component: 'CalculatorApp' },
        notes: { titleKey: 'notes.title', icon: 'Theme/Icon/App_icon/notes.png', width: 700, height: 500, component: 'NotesApp' },
        browser: { titleKey: 'browser.title', icon: 'Theme/Icon/App_icon/browser.png', width: 1000, height: 700, component: 'BrowserApp' },
        clock: { titleKey: 'clock.title', icon: 'Theme/Icon/App_icon/system_clock.png', width: 900, height: 650, component: 'ClockApp' },
        weather: { titleKey: 'weather.title', icon: 'Theme/Icon/App_icon/weather.png', width: 920, height: 640, component: 'WeatherApp' },
        appshop: { titleKey: 'appshop.title', icon: 'Theme/Icon/App_icon/app_gallery.png', width: 1000, height: 700, component: 'AppShop' },
        photos: { titleKey: 'photos.title', icon: 'Theme/Icon/App_icon/gallery.png', width: 1000, height: 700, component: 'PhotosApp' }
    },

    // 获取应用配置 - Get application configuration
    getAppConfig(appId) {
        const cfg = this.appConfigs[appId];
        if (!cfg) return null;
        return { ...cfg, title: cfg.titleKey ? t(cfg.titleKey) : (cfg.title || appId) };
    },

    init() {
        this.container = document.getElementById('windows-container');
        State.on('languageChange', () => {
            this.windows.forEach(w => {
                const cfg = this.getAppConfig(w.appId);
                if (cfg) {
                    const titleEl = w.element.querySelector('.window-title');
                    if (titleEl) titleEl.textContent = cfg.title;
                }
            });
        });
        State.on('settingsChange', (updates) => {
            if (!updates) return;
            if (updates.windowHoverSnapEnabled === false) {
                this._hideAllSnapMenus();
            }
            if (updates.windowEdgeSnapEnabled === false) {
                this._hideDragSnapHint(true);
            }
        });
        this._initTaskbarAutoHide();
    },

    _isEdgeSnapEnabled() {
        return State.settings.windowEdgeSnapEnabled !== false;
    },

    _isHoverSnapEnabled() {
        return State.settings.windowHoverSnapEnabled !== false;
    },

    _getTaskbarElement() {
        return document.getElementById('taskbar') || document.querySelector('.taskbar');
    },

    _isTaskbarInteractivePanelOpen() {
        const panelIds = ['start-menu', 'control-center', 'notification-center', 'fingo-panel'];
        return panelIds.some((id) => {
            const panel = document.getElementById(id);
            return Boolean(panel && !panel.classList.contains('hidden'));
        });
    },

    _clearTaskbarTimers() {
        clearTimeout(this._taskbarAutoHideTimer);
        clearTimeout(this._taskbarHideAnimTimer);
        this._taskbarAutoHideTimer = null;
        this._taskbarHideAnimTimer = null;
    },

    _showTaskbarForAutoHide(taskbar, withBounce = false) {
        if (!taskbar) return;
        this._clearTaskbarTimers();
        taskbar.classList.remove('hiding');
        taskbar.classList.remove('hidden');
        if (withBounce) {
            taskbar.classList.remove('peek-pop');
            void taskbar.offsetHeight;
            taskbar.classList.add('peek-pop');
            this._taskbarHideAnimTimer = setTimeout(() => {
                taskbar.classList.remove('peek-pop');
                this._taskbarHideAnimTimer = null;
            }, 520);
        } else {
            taskbar.classList.remove('peek-pop');
        }
    },

    _hideTaskbarForAutoHide(taskbar, immediate = false) {
        if (!taskbar) return;
        clearTimeout(this._taskbarAutoHideTimer);
        this._taskbarAutoHideTimer = null;
        clearTimeout(this._taskbarHideAnimTimer);
        this._taskbarHideAnimTimer = null;

        if (immediate) {
            taskbar.classList.remove('peek-pop');
            taskbar.classList.remove('hiding');
            taskbar.classList.add('hidden');
            return;
        }

        taskbar.classList.remove('peek-pop');
        taskbar.classList.add('hiding');
        this._taskbarHideAnimTimer = setTimeout(() => {
            taskbar.classList.remove('hiding');
            taskbar.classList.add('hidden');
            this._taskbarHideAnimTimer = null;
        }, this.TASKBAR_HIDE_ANIM_MS);
    },

    _scheduleTaskbarAutoHide(delay = this.TASKBAR_AUTO_HIDE_DELAY) {
        const taskbar = this._getTaskbarElement();
        if (!taskbar) return;
        clearTimeout(this._taskbarAutoHideTimer);
        this._taskbarAutoHideTimer = setTimeout(() => {
            this._taskbarAutoHideTimer = null;
            if (!document.body.classList.contains('has-maximized-window')) return;
            if (document.body.classList.contains('in-taskview')) return;
            if (taskbar.matches(':hover')) return;
            if (this._isTaskbarInteractivePanelOpen()) return;
            this._hideTaskbarForAutoHide(taskbar);
        }, delay);
    },

    _initTaskbarAutoHide() {
        if (this._taskbarAutoHideBound) return;
        const taskbar = this._getTaskbarElement();
        if (!taskbar) return;
        this._taskbarAutoHideBound = true;

        taskbar.addEventListener('mouseenter', () => {
            if (!document.body.classList.contains('has-maximized-window')) return;
            this._showTaskbarForAutoHide(taskbar);
        });

        taskbar.addEventListener('mouseleave', (e) => {
            if (!document.body.classList.contains('has-maximized-window')) return;
            const viewportHeight = globalThis.innerHeight || 0;
            const nearBottomEdge = e.clientY >= (viewportHeight - this.TASKBAR_AUTO_HIDE_EDGE - 2);
            this._scheduleTaskbarAutoHide(nearBottomEdge ? 520 : this.TASKBAR_AUTO_HIDE_DELAY);
        });

        document.addEventListener('mousemove', (e) => {
            if (!document.body.classList.contains('has-maximized-window')) return;
            if (document.body.classList.contains('in-taskview')) return;

            const viewportHeight = globalThis.innerHeight || 0;
            const nearBottomEdge = e.clientY >= (viewportHeight - this.TASKBAR_AUTO_HIDE_EDGE);
            if (nearBottomEdge) {
                this._showTaskbarForAutoHide(taskbar, taskbar.classList.contains('hidden') || taskbar.classList.contains('hiding'));
                this._scheduleTaskbarAutoHide(900);
                return;
            }

            if (!taskbar.matches(':hover') && !this._isTaskbarInteractivePanelOpen()) {
                this._scheduleTaskbarAutoHide();
            }
        }, true);

        document.addEventListener('click', () => {
            if (!document.body.classList.contains('has-maximized-window')) return;
            if (this._isTaskbarInteractivePanelOpen()) {
                this._showTaskbarForAutoHide(taskbar);
            } else if (!taskbar.matches(':hover')) {
                this._scheduleTaskbarAutoHide(360);
            }
        }, true);
    },

    _getTaskbarReservedHeight() {
        const taskbar = document.querySelector('.taskbar');
        if (!taskbar) return 0;
        return Math.max(0, (taskbar.offsetHeight || 48) + 8);
    },

    _syncZIndexCounter() {
        let maxZ = this.zIndexCounter;
        this.windows.forEach((w) => {
            if (!w || !w.element) return;
            const z = Number.parseInt(w.element.style.zIndex, 10);
            if (Number.isFinite(z)) {
                maxZ = Math.max(maxZ, z);
            }
        });
        this.zIndexCounter = maxZ;
    },

    _isAnimationEnabled() {
        if (typeof State === 'undefined' || !State.settings) return true;
        return State.settings.enableAnimation !== false;
    },

    _playTaskbarDockFeedback(appId) {
        if (!appId || !this._isAnimationEnabled()) return;
        const taskbarBtn = document.querySelector(`.taskbar-app[data-app-id="${appId}"]`);
        if (!taskbarBtn) return;

        taskbarBtn.classList.remove('taskbar-app-dock-hit');
        void taskbarBtn.offsetHeight;
        taskbarBtn.classList.add('taskbar-app-dock-hit');

        if (taskbarBtn._dockHitTimer) {
            clearTimeout(taskbarBtn._dockHitTimer);
        }
        taskbarBtn._dockHitTimer = setTimeout(() => {
            taskbarBtn.classList.remove('taskbar-app-dock-hit');
            taskbarBtn._dockHitTimer = null;
        }, this.TASKBAR_ICON_FEEDBACK_MS);
    },

    _effectiveDuration(duration) {
        if (!this._isAnimationEnabled()) return 0;
        return Math.max(0, Math.round(duration || 0));
    },

    _clearWindowMotionTimers(windowData) {
        if (!windowData) return;
        if (windowData._minimizeTimer) {
            clearTimeout(windowData._minimizeTimer);
            windowData._minimizeTimer = null;
        }
        if (windowData._restoreTimer) {
            clearTimeout(windowData._restoreTimer);
            windowData._restoreTimer = null;
        }
        if (windowData._dockFeedbackTimer) {
            clearTimeout(windowData._dockFeedbackTimer);
            windowData._dockFeedbackTimer = null;
        }
    },

    _captureWindowVisualState(windowData) {
        if (!windowData || !windowData.element) return { transform: '', opacity: '1' };
        const el = windowData.element;
        const computed = getComputedStyle(el);
        const transform = computed.transform && computed.transform !== 'none'
            ? computed.transform
            : (el.style.transform || '');
        const opacity = computed.opacity || (el.style.opacity || '1');
        return { transform, opacity };
    },

    _holdWindowCurrentVisualState(windowData) {
        if (!windowData || !windowData.element) return;
        const el = windowData.element;
        if (el.style.display === 'none') return;

        const visual = this._captureWindowVisualState(windowData);
        el.style.transition = 'none';
        el.style.transformOrigin = 'center center';
        el.style.willChange = 'transform, opacity';
        el.style.transform = visual.transform || '';
        el.style.opacity = visual.opacity;
        el.offsetHeight;
    },

    _getWindowBaseCenter(windowData) {
        const el = windowData.element;
        const styleLeft = Number.parseFloat(el.style.left);
        const styleTop = Number.parseFloat(el.style.top);
        const styleWidth = Number.parseFloat(el.style.width);
        const styleHeight = Number.parseFloat(el.style.height);
        const rect = el.getBoundingClientRect();

        const width = Number.isFinite(styleWidth) && styleWidth > 1 ? styleWidth : rect.width;
        const height = Number.isFinite(styleHeight) && styleHeight > 1 ? styleHeight : rect.height;
        const left = Number.isFinite(styleLeft) ? styleLeft : rect.left;
        const top = Number.isFinite(styleTop) ? styleTop : rect.top;

        return {
            x: left + width / 2,
            y: top + height / 2
        };
    },

    _finalizeMinimize(windowData) {
        if (!windowData || !windowData.element) return;
        const el = windowData.element;
        this._clearWindowMotionTimers(windowData);
        el.style.display = 'none';
        el.classList.remove('minimizing', 'restoring');
        el.style.transition = '';
        el.style.transform = '';
        el.style.transformOrigin = '';
        el.style.willChange = '';
        el.style.opacity = '';
        windowData.isMinimized = true;
        windowData.isMinimizing = false;
        windowData.isRestoring = false;
        this.updateMaximizedWallpaperEffect();
    },

    _finalizeRestore(windowData) {
        if (!windowData || !windowData.element) return;
        const el = windowData.element;
        this._clearWindowMotionTimers(windowData);
        el.style.display = 'flex';
        el.classList.remove('restoring', 'minimizing');
        el.style.transition = '';
        el.style.transform = '';
        el.style.transformOrigin = '';
        el.style.willChange = '';
        el.style.opacity = '';
        windowData.isMinimized = false;
        windowData.isRestoring = false;
        windowData.isMinimizing = false;
    },

    _startMinimizeAnimation(windowData, fromInterruptedRestore = false) {
        if (!windowData || !windowData.element || windowData.isMinimized) return;
        const el = windowData.element;
        this._clearWindowMotionTimers(windowData);

        if (fromInterruptedRestore) {
            this._holdWindowCurrentVisualState(windowData);
        } else {
            el.style.transition = 'none';
            el.style.transformOrigin = 'center center';
            el.style.willChange = 'transform, opacity';
            el.style.transform = '';
            el.style.opacity = '1';
            el.offsetHeight;
        }

        windowData.savedPosition = {
            left: el.style.left,
            top: el.style.top,
            width: el.style.width,
            height: el.style.height
        };

        windowData.isMinimizing = true;
        windowData.isRestoring = false;
        windowData.isMinimized = false;
        el.classList.remove('restoring');
        el.classList.add('minimizing');

        const duration = this._effectiveDuration(this.MINIMIZE_DURATION_MS);
        const dockPoint = this.getTaskbarButtonPosition(windowData.appId);
        const baseCenter = this._getWindowBaseCenter(windowData);
        const translateX = dockPoint.x - baseCenter.x;
        const translateY = dockPoint.y - baseCenter.y;

        if (duration <= 0) {
            this._finalizeMinimize(windowData);
            return;
        }

        const opacityDuration = Math.round(duration * 0.56);
        el.style.transition = `transform ${duration}ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity ${opacityDuration}ms cubic-bezier(0.4, 0, 1, 1)`;

        requestAnimationFrame(() => {
            if (!windowData.isMinimizing) return;
            el.style.transform = `translate(${translateX}px, ${translateY}px) scale(${this.MINIMIZE_DOCK_SCALE})`;
            el.style.opacity = '0';
        });

        windowData._dockFeedbackTimer = setTimeout(() => {
            if (!windowData.isMinimizing) return;
            windowData._dockFeedbackTimer = null;
            this._playTaskbarDockFeedback(windowData.appId);
        }, Math.round(duration * 0.62));

        windowData._minimizeTimer = setTimeout(() => {
            if (!windowData.isMinimizing) return;
            this._finalizeMinimize(windowData);
        }, duration);
    },

    _startRestoreAnimation(windowData, fromInterruptedMinimize = false) {
        if (!windowData || !windowData.element) return;
        const el = windowData.element;
        this._clearWindowMotionTimers(windowData);

        const fromHidden = windowData.isMinimized || el.style.display === 'none';
        if (fromHidden) {
            const saved = windowData.savedPosition || {};
            if (saved.left != null) el.style.left = saved.left;
            if (saved.top != null) el.style.top = saved.top;
            if (saved.width != null) el.style.width = saved.width;
            if (saved.height != null) el.style.height = saved.height;
            el.style.display = 'flex';
        }

        if (fromHidden) {
            const dockPoint = this.getTaskbarButtonPosition(windowData.appId);
            const baseCenter = this._getWindowBaseCenter(windowData);
            const translateX = dockPoint.x - baseCenter.x;
            const translateY = dockPoint.y - baseCenter.y;
            el.style.transition = 'none';
            el.style.transformOrigin = 'center center';
            el.style.willChange = 'transform, opacity';
            el.style.transform = `translate(${translateX}px, ${translateY}px) scale(${this.MINIMIZE_DOCK_SCALE})`;
            el.style.opacity = '0';
            el.offsetHeight;
        } else if (fromInterruptedMinimize) {
            this._holdWindowCurrentVisualState(windowData);
        }

        windowData.isMinimized = false;
        windowData.isRestoring = true;
        windowData.isMinimizing = false;
        el.classList.remove('minimizing');
        el.classList.add('restoring');

        const duration = this._effectiveDuration(this.RESTORE_DURATION_MS);
        if (duration <= 0) {
            this._finalizeRestore(windowData);
            this.focusWindow(windowData.id);
            this.updateMaximizedWallpaperEffect();
            return;
        }

        const opacityDuration = Math.round(duration * 0.68);
        el.style.transition = `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${opacityDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        requestAnimationFrame(() => {
            if (!windowData.isRestoring) return;
            el.style.transform = '';
            el.style.opacity = '1';
        });

        this.focusWindow(windowData.id);
        this.updateMaximizedWallpaperEffect();

        windowData._restoreTimer = setTimeout(() => {
            if (!windowData.isRestoring) return;
            this._finalizeRestore(windowData);
        }, duration);
    },

    _getMinimizeDockPoint() {
        const vw = Math.max(0, globalThis.innerWidth || 0);
        const vh = Math.max(0, globalThis.innerHeight || 0);
        return {
            x: vw / 2,
            y: Math.max(0, vh - 8)
        };
    },

    _clampWindowBounds(bounds) {
        const minWidth = 400;
        const minHeight = 300;
        const width = Math.max(minWidth, Math.round(bounds.width || minWidth));
        const height = Math.max(minHeight, Math.round(bounds.height || minHeight));
        const left = Math.round(Number.isFinite(bounds.left) ? bounds.left : 0);
        const top = Math.max(0, Math.round(Number.isFinite(bounds.top) ? bounds.top : 0));
        return { left, top, width, height };
    },

    _ensureDragSnapHint() {
        if (this._dragSnapHintEl && document.body.contains(this._dragSnapHintEl)) return this._dragSnapHintEl;
        if (!document.body) return null;

        const hint = document.createElement('div');
        hint.className = 'window-edge-snap-hint';
        hint.innerHTML = '<div class="window-edge-snap-hint-core"></div>';
        document.body.appendChild(hint);
        this._dragSnapHintEl = hint;
        return hint;
    },

    _showDragSnapHint(layoutId) {
        const hint = this._ensureDragSnapHint();
        if (!hint) return;
        const bounds = this._getSnapBounds(layoutId);
        if (!bounds) return;

        hint.dataset.layout = layoutId;
        hint.style.left = `${Math.round(bounds.left)}px`;
        hint.style.top = `${Math.round(bounds.top)}px`;
        hint.style.width = `${Math.round(bounds.width)}px`;
        hint.style.height = `${Math.round(bounds.height)}px`;
        hint.classList.add('show');
    },

    _hideDragSnapHint(immediate = false) {
        const hint = this._dragSnapHintEl;
        if (!hint) return;
        clearTimeout(hint._hideTimer);
        if (immediate) {
            hint.classList.remove('show');
            return;
        }
        hint._hideTimer = setTimeout(() => hint.classList.remove('show'), 70);
    },

    _getEdgeSnapLayout(clientX, clientY) {
        if (!this._isEdgeSnapEnabled()) return null;

        const trigger = this.EDGE_SNAP_TRIGGER;
        const cornerTrigger = this.CORNER_SNAP_TRIGGER;
        const viewportWidth = Math.max(0, globalThis.innerWidth || 0);
        const viewportHeight = Math.max(0, (globalThis.innerHeight || 0) - this._getTaskbarReservedHeight());
        if (!viewportWidth || !viewportHeight) return null;

        const nearLeft = clientX <= trigger;
        const nearRight = clientX >= viewportWidth - trigger;
        const nearTop = clientY <= cornerTrigger;
        const nearBottom = clientY >= viewportHeight - cornerTrigger;

        if (nearLeft && nearTop) return 'top-left';
        if (nearRight && nearTop) return 'top-right';
        if (nearLeft && nearBottom) return 'bottom-left';
        if (nearRight && nearBottom) return 'bottom-right';
        if (nearLeft) return 'left-half';
        if (nearRight) return 'right-half';

        return null;
    },

    _applyBoundsToWindow(windowElement, bounds) {
        if (!windowElement || !bounds) return;
        windowElement.style.left = `${Math.round(bounds.left)}px`;
        windowElement.style.top = `${Math.round(bounds.top)}px`;
        windowElement.style.width = `${Math.round(bounds.width)}px`;
        windowElement.style.height = `${Math.round(bounds.height)}px`;
    },

    _readWindowBounds(appId, config) {
        const fallback = {
            left: (globalThis.innerWidth - config.width) / 2,
            top: (globalThis.innerHeight - config.height) / 2 - 50,
            width: config.width,
            height: config.height
        };

        const rawStore = State.settings && State.settings[this.WINDOW_BOUNDS_KEY];
        const store = (rawStore && typeof rawStore === 'object' && !Array.isArray(rawStore)) ? rawStore : {};
        const saved = store[appId];
        if (!saved) return { ...this._clampWindowBounds(fallback), snapLayout: null };

        const left = Number(saved.left);
        const top = Number(saved.top);
        const width = Number(saved.width);
        const height = Number(saved.height);
        if (![left, top, width, height].every(v => Number.isFinite(v))) return { ...this._clampWindowBounds(fallback), snapLayout: null };

        return {
            ...this._clampWindowBounds({ left, top, width, height }),
            snapLayout: typeof saved.snapLayout === 'string' ? saved.snapLayout : null
        };
    },

    _getWindowData(windowId) {
        return this.windows.find(w => w.id === windowId);
    },

    _persistWindowBounds(windowData) {
        if (!windowData || !windowData.element || windowData.isMaximized || windowData.isMinimized) return;
        if (!State || !State.settings) return;

        const bounds = this._clampWindowBounds({
            left: windowData.element.offsetLeft,
            top: windowData.element.offsetTop,
            width: windowData.element.offsetWidth,
            height: windowData.element.offsetHeight
        });

        const rawStore = State.settings[this.WINDOW_BOUNDS_KEY];
        const prevStore = (rawStore && typeof rawStore === 'object' && !Array.isArray(rawStore)) ? rawStore : {};
        const prev = prevStore[windowData.appId];
        const same = prev &&
            Number(prev.left) === bounds.left &&
            Number(prev.top) === bounds.top &&
            Number(prev.width) === bounds.width &&
            Number(prev.height) === bounds.height &&
            (prev.snapLayout || null) === (windowData.snapLayout || null);
        if (same) return;

        const nextStore = {
            ...prevStore,
            [windowData.appId]: {
                left: bounds.left,
                top: bounds.top,
                width: bounds.width,
                height: bounds.height,
                snapLayout: windowData.snapLayout || null,
                updatedAt: Date.now()
            }
        };
        State.updateSettings({ [this.WINDOW_BOUNDS_KEY]: nextStore });
    },

    _ensureSnapMenu(windowElement) {
        const menu = windowElement.querySelector('.window-snap-layout-menu');
        if (!menu || menu.dataset.ready === '1') return menu;

        menu.dataset.ready = '1';
        menu.innerHTML = this.SNAP_LAYOUTS.map(layout => `
            <button class="snap-layout-btn ${layout.size === 'large' ? 'is-large' : 'is-small'}" data-layout="${layout.id}" type="button">
                <span class="snap-layout-mini ${layout.previewClass}"></span>
            </button>
        `).join('');

        menu.addEventListener('mouseenter', () => this._cancelSnapMenuHide(windowElement));
        menu.addEventListener('mouseleave', () => this._scheduleSnapMenuHide(windowElement));
        menu.addEventListener('click', (e) => {
            const btn = e.target.closest('.snap-layout-btn');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            this.applySnapLayout(windowElement.id, btn.dataset.layout);
        });

        return menu;
    },

    _hideSnapMenu(windowElement, immediate = false) {
        const menu = windowElement?.querySelector('.window-snap-layout-menu');
        if (!menu) return;
        clearTimeout(menu._hideTimer);
        if (immediate) {
            menu.classList.remove('show');
            windowElement.classList.remove('snap-menu-open');
            return;
        }
        menu._hideTimer = setTimeout(() => {
            menu.classList.remove('show');
            windowElement.classList.remove('snap-menu-open');
        }, this.SNAP_MENU_HIDE_DELAY);
    },

    _cancelSnapMenuHide(windowElement) {
        const menu = windowElement?.querySelector('.window-snap-layout-menu');
        if (!menu) return;
        clearTimeout(menu._hideTimer);
    },

    _scheduleSnapMenuHide(windowElement, delay = this.SNAP_MENU_HIDE_DELAY) {
        const menu = windowElement?.querySelector('.window-snap-layout-menu');
        if (!menu) return;
        clearTimeout(menu._hideTimer);
        menu._hideTimer = setTimeout(() => {
            menu.classList.remove('show');
            windowElement.classList.remove('snap-menu-open');
        }, delay);
    },

    _hideAllSnapMenus(exceptWindowId = null) {
        const menus = document.querySelectorAll('.window-snap-layout-menu.show');
        menus.forEach((menu) => {
            const host = menu.closest('.window');
            if (exceptWindowId && host && host.id === exceptWindowId) return;
            clearTimeout(menu._hideTimer);
            menu.classList.remove('show');
            host?.classList.remove('snap-menu-open');
        });
    },

    _showSnapMenu(windowElement) {
        if (!this._isHoverSnapEnabled()) return;
        const menu = this._ensureSnapMenu(windowElement);
        if (!menu) return;

        const windowData = this._getWindowData(windowElement.id);
        if (windowData && windowData.isMinimized) return;

        this._hideAllSnapMenus(windowElement.id);
        this._cancelSnapMenuHide(windowElement);
        menu.classList.add('show');
        windowElement.classList.add('snap-menu-open');
    },

    _getSnapBounds(layoutId) {
        const viewportWidth = Math.max(420, globalThis.innerWidth || 420);
        const viewportHeight = Math.max(320, (globalThis.innerHeight || 320) - this._getTaskbarReservedHeight());
        const halfWidth = Math.round(viewportWidth / 2);
        const halfHeight = Math.round(viewportHeight / 2);
        const twoThirdWidth = Math.round(viewportWidth * 0.66);

        switch (layoutId) {
            case 'left-half':
                return { left: 0, top: 0, width: halfWidth, height: viewportHeight };
            case 'right-half':
                return { left: halfWidth, top: 0, width: viewportWidth - halfWidth, height: viewportHeight };
            case 'left-two-thirds':
                return { left: 0, top: 0, width: twoThirdWidth, height: viewportHeight };
            case 'right-two-thirds':
                return { left: viewportWidth - twoThirdWidth, top: 0, width: twoThirdWidth, height: viewportHeight };
            case 'top-left':
                return { left: 0, top: 0, width: halfWidth, height: halfHeight };
            case 'top-right':
                return { left: halfWidth, top: 0, width: viewportWidth - halfWidth, height: halfHeight };
            case 'bottom-left':
                return { left: 0, top: halfHeight, width: halfWidth, height: viewportHeight - halfHeight };
            case 'bottom-right':
                return { left: halfWidth, top: halfHeight, width: viewportWidth - halfWidth, height: viewportHeight - halfHeight };
            default:
                return null;
        }
    },

    applySnapLayout(windowId, layoutId) {
        const windowData = this._getWindowData(windowId);
        if (!windowData) return;

        const bounds = this._getSnapBounds(layoutId);
        if (!bounds) return;

        windowData.element.classList.remove('maximizing', 'unmaximizing', 'maximized');
        windowData.isMaximized = false;
        windowData.snapLayout = layoutId;

        windowData.element.classList.add('snapping');
        this._applyBoundsToWindow(windowData.element, bounds);
        this.focusWindow(windowId);
        this._hideSnapMenu(windowData.element, true);
        this._hideDragSnapHint(true);
        this.updateMaximizedWallpaperEffect();
        this._persistWindowBounds(windowData);

        setTimeout(() => {
            windowData.element.classList.remove('snapping');
        }, 260);
    },

    openApp(appId, data = null) {

        const config = this.getAppConfig(appId);
        if (!config) {
            console.warn(`App ${appId} not configured`);
            State.addNotification({
                title: t('close'),
                message: `Cannot open app: ${appId}`,
                type: 'error'
            });
            return;
        }

        // 检查是否已经打开该应用窗口 - Check if app window already exists
        const existingWindow = this.windows.find(w => w.appId === appId);
        if (existingWindow) {
            this.focusWindow(existingWindow.id);
            
            if (data && config.component && globalThis[config.component]) {
                if (data.fileId && globalThis[config.component].loadFile) {
                    globalThis[config.component].loadFile(data.fileId);
                }
            }
            return;
        }


        // 创建新窗口 - Create new window
        const windowId = `window-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const initialBounds = this._readWindowBounds(appId, config);
        const windowElement = this.createWindow(windowId, appId, config, initialBounds);
        
        this.windows.push({
            id: windowId,
            appId: appId,
            element: windowElement,
            isMinimized: false,
            isMinimizing: false,
            isRestoring: false,
            isMaximized: false,
            snapLayout: initialBounds.snapLayout || null
        });

        this.container.appendChild(windowElement);
        
        State.addRunningApp(appId);

        
        if (config.component && globalThis[config.component]) {
            globalThis[config.component].init(windowId);
            
            if (data && data.fileId && globalThis[config.component].loadFile) {
                setTimeout(() => {
                    globalThis[config.component].loadFile(data.fileId);
                }, 0);
            }
        } else {
            console.error(`[WindowManager] 未找到组件 - Component not found: ${config.component}`);
        }

        // 聚焦新窗口 - Focus the new window
        this.focusWindow(windowId);
    },

    createWindow(windowId, appId, config, initialBounds = null) {
        const windowElement = document.createElement('div');
        windowElement.className = 'window opening';
        windowElement.id = windowId;
        windowElement.dataset.appId = appId;
        
        const bounds = initialBounds || this._readWindowBounds(appId, config);
        this._applyBoundsToWindow(windowElement, bounds);
        this._syncZIndexCounter();
        windowElement.style.zIndex = ++this.zIndexCounter;

        windowElement.innerHTML = `
            <div class="window-resize-handle resize-top"></div>
            <div class="window-resize-handle resize-bottom"></div>
            <div class="window-resize-handle resize-left"></div>
            <div class="window-resize-handle resize-right"></div>
            <div class="window-resize-handle resize-top-left"></div>
            <div class="window-resize-handle resize-top-right"></div>
            <div class="window-resize-handle resize-bottom-left"></div>
            <div class="window-resize-handle resize-bottom-right"></div>
            <div class="window-titlebar">
                <div class="window-title-section">
                    <img src="${config.icon}" class="window-icon" alt="${config.title}">
                    <span class="window-title">${config.title}</span>
                </div>
                <div class="window-controls">
                    <button class="window-control-btn minimize">
                        <img src="Theme/Icon/Symbol_icon/stroke/Minimize.svg" alt="Minimize">
                    </button>
                    <button class="window-control-btn maximize">
                        <img src="Theme/Icon/Symbol_icon/stroke/Maximize.svg" alt="Maximize">
                    </button>
                    <button class="window-control-btn close">
                        <img src="Theme/Icon/Symbol_icon/stroke/Cancel.svg" alt="Close">
                    </button>
                </div>
            </div>
            <div class="window-snap-layout-menu"></div>
            <div class="window-content" id="${windowId}-content"></div>
        `;

        // 绑定窗口事件 - Bind window events
        this.bindWindowEvents(windowElement);

        // 延迟移除opening类 - Remove opening class after animation
        setTimeout(() => {
            windowElement.classList.remove('opening');
        }, 200);

        return windowElement;
    },

    bindWindowEvents(windowElement) {
        const titlebar = windowElement.querySelector('.window-titlebar');
        const minimizeBtn = windowElement.querySelector('.minimize');
        const maximizeBtn = windowElement.querySelector('.maximize');
        const closeBtn = windowElement.querySelector('.close');
        const snapMenu = this._ensureSnapMenu(windowElement);
        if (!titlebar || !minimizeBtn || !maximizeBtn || !closeBtn) {
            console.error('[WindowManager] Window controls missing, skip binding events');
            return;
        }
        
        let isDragging = false;
        let dragPointerId = null;
        let dragMoved = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let dragSnapLayout = null;

        // 绑定标题栏拖动事件 - Bind titlebar drag event
        titlebar.addEventListener('pointerdown', (e) => {
            if (typeof e.button === 'number' && e.button !== 0) return;
            if (e.isPrimary === false) return;
            if (e.target.closest('.window-controls')) return;

            const windowData = this._getWindowData(windowElement.id);
            if (windowData && windowData.isMaximized) return;
            this._hideAllSnapMenus(windowElement.id);
            this._hideDragSnapHint(true);
            dragSnapLayout = null;
            
            isDragging = true;
            dragPointerId = e.pointerId;
            dragMoved = false;
            initialX = e.clientX - windowElement.offsetLeft;
            initialY = e.clientY - windowElement.offsetTop;
            
            // 禁用过渡以实现平滑拖动 - Disable transition for smooth drag
            windowElement.style.transition = 'none';

            if (typeof titlebar.setPointerCapture === 'function') {
                try {
                    titlebar.setPointerCapture(e.pointerId);
                } catch (err) {
                    // no-op for unsupported capture targets
                }
            }
            
            this.focusWindow(windowElement.id);
            e.preventDefault();
        });

        document.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            if (dragPointerId !== null && e.pointerId !== dragPointerId) return;
            
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            dragMoved = true;

            const clamped = this._clampWindowBounds({
                left: currentX,
                top: currentY,
                width: windowElement.offsetWidth,
                height: windowElement.offsetHeight
            });
            
            windowElement.style.left = `${clamped.left}px`;
            windowElement.style.top = `${clamped.top}px`;

            const edgeLayout = this._getEdgeSnapLayout(e.clientX, e.clientY);
            if (edgeLayout) {
                dragSnapLayout = edgeLayout;
                this._showDragSnapHint(edgeLayout);
            } else {
                dragSnapLayout = null;
                this._hideDragSnapHint();
            }
        });

        const finalizeDrag = (e) => {
            if (isDragging) {
                if (dragPointerId !== null && e && e.pointerId !== dragPointerId) return;
                isDragging = false;
                if (dragPointerId !== null && typeof titlebar.releasePointerCapture === 'function') {
                    try {
                        titlebar.releasePointerCapture(dragPointerId);
                    } catch (err) {
                        // no-op
                    }
                }
                dragPointerId = null;
                // 恢复过渡 - Restore transition
                windowElement.style.transition = '';

                const windowData = this._getWindowData(windowElement.id);
                if (windowData && !windowData.isMaximized && dragMoved) {
                    if (dragSnapLayout && this._isEdgeSnapEnabled()) {
                        this.applySnapLayout(windowElement.id, dragSnapLayout);
                    } else {
                        windowData.snapLayout = null;
                        this._persistWindowBounds(windowData);
                    }
                }
                dragSnapLayout = null;
                this._hideDragSnapHint();
            }
        };
        document.addEventListener('pointerup', finalizeDrag);
        document.addEventListener('pointercancel', finalizeDrag);

        // 绑定标题栏拖动事件 - Bind titlebar drag event
        titlebar.addEventListener('dblclick', () => {
            this._hideSnapMenu(windowElement, true);
            this.toggleMaximize(windowElement.id);
        });

        // 最小化按钮 - Minimize button
        minimizeBtn.addEventListener('click', () => {
            this._hideSnapMenu(windowElement, true);
            this.minimizeWindow(windowElement.id);
        });

        maximizeBtn.addEventListener('mouseenter', () => {
            if (this._isHoverSnapEnabled()) this._showSnapMenu(windowElement);
        });
        maximizeBtn.addEventListener('mouseleave', () => {
            this._scheduleSnapMenuHide(windowElement);
        });

        if (snapMenu) {
            snapMenu.addEventListener('pointerdown', (e) => e.stopPropagation());
            snapMenu.addEventListener('mousedown', (e) => e.stopPropagation());
        }

        // 最大化按钮 - Maximize button
        maximizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._hideSnapMenu(windowElement, true);
            this.toggleMaximize(windowElement.id);
        });

        // 关闭按钮 - Close button
        closeBtn.addEventListener('click', () => {
            this._hideSnapMenu(windowElement, true);
            this.closeWindow(windowElement.id);
        });

        windowElement.addEventListener('pointerdown', (e) => {
            if (!e.target.closest('.window-snap-layout-menu')) {
                this._hideAllSnapMenus(windowElement.id);
            }
            this.focusWindow(windowElement.id);
        });
        windowElement.addEventListener('mouseleave', () => {
            this._scheduleSnapMenuHide(windowElement, 90);
        });

        // 绑定调整大小事件 - Bind resize events
        this.bindResizeEvents(windowElement);
    },

    bindResizeEvents(windowElement) {
        const handles = windowElement.querySelectorAll('.window-resize-handle');
        let isResizing = false;
        let resizePointerId = null;
        let resizeDirection = '';
        let startX, startY, startWidth, startHeight, startLeft, startTop;
        let activeResizeHandle = null;

        handles.forEach(handle => {
            handle.addEventListener('pointerdown', (e) => {
                const windowData = this._getWindowData(windowElement.id);
                if (windowData && windowData.isMaximized) return;
                if (typeof e.button === 'number' && e.button !== 0) return;
                if (e.isPrimary === false) return;

                e.stopPropagation();
                isResizing = true;
                resizePointerId = e.pointerId;
                activeResizeHandle = handle;
                windowElement.classList.add('resizing');
                this._hideSnapMenu(windowElement, true);

                // 确定调整方向 - Determine resize direction
                if (handle.classList.contains('resize-top')) resizeDirection = 'n';
                else if (handle.classList.contains('resize-bottom')) resizeDirection = 's';
                else if (handle.classList.contains('resize-left')) resizeDirection = 'w';
                else if (handle.classList.contains('resize-right')) resizeDirection = 'e';
                else if (handle.classList.contains('resize-top-left')) resizeDirection = 'nw';
                else if (handle.classList.contains('resize-top-right')) resizeDirection = 'ne';
                else if (handle.classList.contains('resize-bottom-left')) resizeDirection = 'sw';
                else if (handle.classList.contains('resize-bottom-right')) resizeDirection = 'se';

                startX = e.clientX;
                startY = e.clientY;
                startWidth = windowElement.offsetWidth;
                startHeight = windowElement.offsetHeight;
                startLeft = windowElement.offsetLeft;
                startTop = windowElement.offsetTop;

                // 防止默认行为和文本选择 - Prevent default and text selection
                e.preventDefault();
                if (typeof handle.setPointerCapture === 'function') {
                    try {
                        handle.setPointerCapture(e.pointerId);
                    } catch (err) {
                        // no-op
                    }
                }
            });
        });

        document.addEventListener('pointermove', (e) => {
            if (!isResizing) return;
            if (resizePointerId !== null && e.pointerId !== resizePointerId) return;
            e.preventDefault();

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            if (resizeDirection.includes('e')) {
                newWidth = Math.max(400, startWidth + deltaX);
            }
            if (resizeDirection.includes('w')) {
                newWidth = Math.max(400, startWidth - deltaX);
                newLeft = startLeft + (startWidth - newWidth);
            }
            if (resizeDirection.includes('s')) {
                newHeight = Math.max(300, startHeight + deltaY);
            }
            if (resizeDirection.includes('n')) {
                newHeight = Math.max(300, startHeight - deltaY);
                newTop = startTop + (startHeight - newHeight);
            }

            // 限制窗口边界 - Constrain window bounds
            if (newTop < 0) {
                if (resizeDirection.includes('n')) {
                    const bottom = newTop + newHeight;
                    newTop = 0;
                    newHeight = Math.max(300, bottom);
                } else {
                    newTop = 0;
                }
            }

            windowElement.style.width = `${newWidth}px`;
            windowElement.style.height = `${newHeight}px`;
            windowElement.style.left = `${newLeft}px`;
            windowElement.style.top = `${newTop}px`;
        });

        const finalizeResize = (e) => {
            if (isResizing) {
                if (resizePointerId !== null && e && e.pointerId !== resizePointerId) return;
                isResizing = false;
                if (activeResizeHandle && resizePointerId !== null && typeof activeResizeHandle.releasePointerCapture === 'function') {
                    try {
                        activeResizeHandle.releasePointerCapture(resizePointerId);
                    } catch (err) {
                        // no-op
                    }
                }
                resizePointerId = null;
                activeResizeHandle = null;
                windowElement.classList.remove('resizing');
                resizeDirection = '';

                const windowData = this._getWindowData(windowElement.id);
                if (windowData && !windowData.isMaximized) {
                    windowData.snapLayout = null;
                    this._persistWindowBounds(windowData);
                }
            }
        };
        document.addEventListener('pointerup', finalizeResize);
        document.addEventListener('pointercancel', finalizeResize);
    },

    focusWindow(windowId) {
        const windowData = this.windows.find(w => w.id === windowId);
        if (!windowData) return;

        if (windowData.isMinimizing) {
            this._startRestoreAnimation(windowData, true);
            return;
        }

        if (windowData.isMinimized) {
            this._startRestoreAnimation(windowData, false);
            return;
        }

        this._syncZIndexCounter();
        windowData.element.style.zIndex = ++this.zIndexCounter;

        if (typeof Fingo !== 'undefined' && Fingo && Fingo.isOpen && typeof Fingo._ensurePanelForeground === 'function') {
            Fingo._ensurePanelForeground();
        }
    },

    minimizeWindow(windowId) {
        const windowData = this.windows.find(w => w.id === windowId);
        if (!windowData || windowData.isMinimized || windowData.isMinimizing) return;
        this._startMinimizeAnimation(windowData, windowData.isRestoring);
    },

    toggleWindow(appId) {
        const windowData = this.windows.find(w => w.appId === appId);
        if (!windowData) return;

        if (windowData.isMinimizing) {
            this._startRestoreAnimation(windowData, true);
            return;
        }

        if (windowData.isRestoring) {
            this._startMinimizeAnimation(windowData, true);
            return;
        }

        if (windowData.isMinimized) {
            this._startRestoreAnimation(windowData, false);
        } else {
            this._startMinimizeAnimation(windowData, false);
        }
    },
    toggleMaximize(windowId) {
        const windowData = this.windows.find(w => w.id === windowId);
        if (!windowData) return;
        this._hideSnapMenu(windowData.element, true);
        this._hideDragSnapHint(true);

        if (windowData.isMaximized) {
            // 取消最大化动画 - Unmaximize animation
            windowData.element.classList.add('unmaximizing');
            windowData.element.classList.remove('maximized');
            
            // 恢复到之前的位置和大小 - Restore previous position and size
            
            if (windowData.savedBounds) {
                windowData.element.style.left = windowData.savedBounds.left;
                windowData.element.style.top = windowData.savedBounds.top;
                windowData.element.style.width = windowData.savedBounds.width;
                windowData.element.style.height = windowData.savedBounds.height;
            }
            
            setTimeout(() => {
                windowData.element.classList.remove('unmaximizing');
            }, 550);
            
            windowData.isMaximized = false;
            
            // 应用最大化样式 - Apply maximized styles
            requestAnimationFrame(() => {
                this.updateMaximizedWallpaperEffect();
            });
            this._persistWindowBounds(windowData);
        } else {
            windowData.savedBounds = {
                left: windowData.element.style.left,
                top: windowData.element.style.top,
                width: windowData.element.style.width,
                height: windowData.element.style.height
            };
            
            // 最大化动画 - Maximize animation
            windowData.element.classList.add('maximizing');
            windowData.element.classList.add('maximized');
            
            // 设置最大化位置和大小 - Set maximized position and size
            
            setTimeout(() => {
                windowData.element.classList.remove('maximizing');
            }, 550);
            
            windowData.isMaximized = true;
            
            // 更新壁纸效果 - Update wallpaper effect
            this.updateMaximizedWallpaperEffect();
        }
    },
    
    // 更新最大化窗口的壁纸效果 - Update wallpaper effect for maximized windows
    updateMaximizedWallpaperEffect() {
        const hasMaximized = this.windows.some(w => w.isMaximized && !w.isMinimized && w.element && w.element.style.display !== 'none');
        const taskbar = this._getTaskbarElement();
        
        if (hasMaximized) {
            document.body.classList.add('has-maximized-window');
            if (taskbar) {
                taskbar.classList.add('auto-hide-active');
                if (document.body.classList.contains('in-taskview') || taskbar.matches(':hover') || this._isTaskbarInteractivePanelOpen()) {
                    this._showTaskbarForAutoHide(taskbar);
                } else {
                    this._hideTaskbarForAutoHide(taskbar);
                }
            }
        } else {
            document.body.classList.remove('has-maximized-window');
            this._clearTaskbarTimers();
            if (taskbar) {
                taskbar.classList.remove('auto-hide-active');
                taskbar.classList.remove('peek-pop');
                taskbar.classList.remove('hiding');
                taskbar.classList.remove('hidden');
            }
        }
    },

    closeWindow(windowId) {
        const windowData = this.windows.find(w => w.id === windowId);
        if (!windowData) return;
        this._hideSnapMenu(windowData.element, true);
        this._hideDragSnapHint(true);
        this._persistWindowBounds(windowData);

        const proceedClose = () => {
            this._clearWindowMotionTimers(windowData);
            windowData.isMinimizing = false;
            windowData.isRestoring = false;
            windowData.element.classList.remove('minimizing', 'restoring');
            windowData.element.style.transition = '';
            windowData.element.style.transform = '';
            windowData.element.style.transformOrigin = '';
            windowData.element.style.willChange = '';
            windowData.element.style.opacity = '';
            windowData.element.classList.add('closing');
            setTimeout(() => {
                windowData.element.remove();
                this.windows = this.windows.filter(w => w.id !== windowId);
                const hasOtherWindows = this.windows.some(w => w.appId === windowData.appId);
                if (!hasOtherWindows) {
                    State.removeRunningApp(windowData.appId);
                }
                // 延迟更新壁纸效果 - Update wallpaper effect after animation
                this.updateMaximizedWallpaperEffect();
            }, 250);
        };

        // 调用组件的beforeClose钩子 - Call component beforeClose hook
        try {
            const appId = windowData.appId;
            const config = this.appConfigs[appId]; // raw config ok here, only need component
            const component = config && globalThis[config.component];
            if (component && typeof component.beforeClose === 'function') {
                const result = component.beforeClose();
                if (result && typeof result.then === 'function') {
                    result.then((ok) => { if (ok === false) return; proceedClose(); })
                          .catch(() => proceedClose());
                    return; // 等待用户确认 - Wait for user confirmation
                }
                if (result === false) return; // 用户取消关闭 - User cancelled close
            }
        }catch (e) {
            console.warn('beforeClose 执行失败，继续关闭窗口 - beforeClose failed, continue closing', e);
        }

        proceedClose();
    },
    
    getTaskbarButtonPosition(appId) {
        const taskbarBtn = document.querySelector(`.taskbar-app[data-app-id="${appId}"]`);
        if (taskbarBtn) {
            const rect = taskbarBtn.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        }
        return this._getMinimizeDockPoint();
    }
};

