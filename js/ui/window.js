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
    MAXIMIZE_TOGGLE_DURATION_MS: 550,
    CLOSE_DURATION_MS: 250,
    TOMBSTONE_FREEZE_DELAY_MS: 60 * 1000,
    TOMBSTONE_FREEZE_MIN_MS: 3 * 1000,
    TOMBSTONE_FREEZE_MAX_MS: 10 * 60 * 1000,
    UNSNAP_RESTORE_BLEND_MS: 240,
    TOP_MAXIMIZE_DWELL_MS: 1500,
    TASKBAR_ICON_FEEDBACK_MS: 280,
    _taskbarAutoHideBound: false,
    _taskbarAutoHideTimer: null,
    _taskbarHideAnimTimer: null,
    _fullscreenUnmaximizeSyncTimer: null,
    _fullscreenCloseSyncTimer: null,
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
        calculator: { titleKey: 'calculator.title', icon: 'Theme/Icon/App_icon/calculator.png', width: 760, height: 620, minWidth: 520, minHeight: 500, component: 'CalculatorApp' },
        notes: { titleKey: 'notes.title', icon: 'Theme/Icon/App_icon/notes.png', width: 920, height: 640, minWidth: 560, minHeight: 420, component: 'NotesApp' },
        browser: { titleKey: 'browser.title', icon: 'Theme/Icon/App_icon/browser.png', width: 1000, height: 700, component: 'BrowserApp' },
        clock: { titleKey: 'clock.title', icon: 'Theme/Icon/App_icon/clock.png', width: 900, height: 650, component: 'ClockApp' },
        weather: { titleKey: 'weather.title', icon: 'Theme/Icon/App_icon/weather.png', width: 920, height: 640, component: 'WeatherApp' },
        appshop: { titleKey: 'appshop.title', icon: 'Theme/Icon/App_icon/app_gallery.png', width: 1000, height: 700, component: 'AppShop' },
        camera: { titleKey: 'camera.title', icon: 'Theme/Icon/App_icon/camera.png', width: 1100, height: 720, minWidth: 760, minHeight: 520, component: 'CameraApp' },
        photos: { titleKey: 'photos.title', icon: 'Theme/Icon/App_icon/photos.png', width: 1000, height: 700, component: 'PhotosApp' },
        media: { titleKey: 'media.title', icon: 'Theme/Icon/App_icon/media.png', width: 980, height: 640, minWidth: 640, minHeight: 360, component: 'MediaApp' }
    },

    // 获取应用配置 - Get application configuration
    getAppConfig(appId) {
        const cfg = this.appConfigs[appId];
        if (!cfg) return null;
        return { ...cfg, title: cfg.titleKey ? t(cfg.titleKey) : (cfg.title || appId) };
    },

    init() {
        this.container = document.getElementById('windows-container');
        this._bindDesktopInactivityListener();

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
            if (
                Object.prototype.hasOwnProperty.call(updates, 'tombstoneBackgroundEnabled') ||
                Object.prototype.hasOwnProperty.call(updates, 'tombstoneFreezeDelayMs')
            ) {
                this._syncTombstoneSetting();
            }
            if (Object.prototype.hasOwnProperty.call(updates, 'tombstoneDimFrozenAppsEnabled')) {
                this._syncTombstoneAppearance();
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

    _isTopEdgeMaximizeEnabled() {
        return State.settings.windowTopMaximizeEnabled === true;
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

    _setFullscreenCloseSync(active, duration = 0) {
        if (!document.body) return;
        clearTimeout(this._fullscreenCloseSyncTimer);
        this._fullscreenCloseSyncTimer = null;

        if (!active) {
            document.body.classList.remove('fullscreen-close-sync');
            return;
        }

        document.body.classList.add('fullscreen-close-sync');
        if (duration > 0) {
            this._fullscreenCloseSyncTimer = setTimeout(() => {
                document.body.classList.remove('fullscreen-close-sync');
                this._fullscreenCloseSyncTimer = null;
            }, duration);
        }
    },

    _setFullscreenUnmaximizeSync(active, duration = 0) {
        if (!document.body) return;
        clearTimeout(this._fullscreenUnmaximizeSyncTimer);
        this._fullscreenUnmaximizeSyncTimer = null;

        if (!active) {
            document.body.classList.remove('fullscreen-unmaximize-sync');
            return;
        }

        document.body.classList.add('fullscreen-unmaximize-sync');
        if (duration > 0) {
            this._fullscreenUnmaximizeSyncTimer = setTimeout(() => {
                document.body.classList.remove('fullscreen-unmaximize-sync');
                this._fullscreenUnmaximizeSyncTimer = null;
            }, duration);
        }
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

    _isTombstoneBackgroundEnabled() {
        return !!(typeof State !== 'undefined' && State.settings && State.settings.tombstoneBackgroundEnabled === true);
    },

    _shouldDimFrozenWindows() {
        return !(typeof State !== 'undefined' && State.settings && State.settings.tombstoneDimFrozenAppsEnabled === false);
    },

    _getTombstoneFreezeDelayMs() {
        const value = (typeof State !== 'undefined' && State.settings)
            ? Number(State.settings.tombstoneFreezeDelayMs)
            : this.TOMBSTONE_FREEZE_DELAY_MS;
        const fallback = this.TOMBSTONE_FREEZE_DELAY_MS;
        const resolved = Number.isFinite(value) ? value : fallback;
        return Math.max(this.TOMBSTONE_FREEZE_MIN_MS, Math.min(this.TOMBSTONE_FREEZE_MAX_MS, Math.round(resolved)));
    },

    _getWindowComponent(windowData) {
        if (!windowData || !windowData.appId) return null;
        const config = this.appConfigs[windowData.appId];
        return config && config.component ? globalThis[config.component] : null;
    },

    _isPWAWindow(windowData) {
        if (!windowData || !windowData.appId) return false;
        if (typeof PWALoader !== 'undefined' && PWALoader.apps && PWALoader.apps[windowData.appId]) return true;
        const config = this.appConfigs[windowData.appId];
        return !!(config && /^PWA_/i.test(String(config.component || '')));
    },

    _clearTombstoneTimer(windowData) {
        if (!windowData || !windowData._tombstoneTimer) return;
        clearTimeout(windowData._tombstoneTimer);
        windowData._tombstoneTimer = null;
    },

    _setTombstoneClasses(windowData, frozen) {
        if (!windowData || !windowData.element) return;
        const el = windowData.element;
        el.classList.toggle('window-frozen', frozen);
        el.classList.toggle('window-pwa-frozen', frozen && this._isPWAWindow(windowData));
        el.classList.toggle(
            'taskview-window-frozen',
            frozen && document.body.classList.contains('in-taskview') && this._shouldDimFrozenWindows()
        );
        if (frozen) {
            el.dataset.windowFrozen = 'true';
        } else {
            delete el.dataset.windowFrozen;
            el.classList.remove('taskview-window-frozen');
        }

        el.querySelectorAll('iframe').forEach((frame) => {
            if (frozen) {
                frame.dataset.fluentFrozen = 'true';
            } else {
                delete frame.dataset.fluentFrozen;
            }
        });
    },

    _syncTombstoneAppearance() {
        const inTaskView = document.body && document.body.classList.contains('in-taskview');
        const shouldDim = this._shouldDimFrozenWindows();
        this.windows.forEach((windowData) => {
            if (!windowData || !windowData.element) return;
            windowData.element.classList.toggle(
                'taskview-window-frozen',
                windowData.isFrozen === true && inTaskView && shouldDim
            );
        });
    },

    _freezeWindow(windowData) {
        if (!windowData || !windowData.element || windowData.isFrozen === true) return;
        if (!this._isTombstoneBackgroundEnabled()) return;
        if (windowData.isMinimized !== true || windowData.isRestoring || windowData.element.classList.contains('closing')) return;

        this._clearTombstoneTimer(windowData);
        windowData.isFrozen = true;
        windowData.frozenAt = Date.now();
        this._setTombstoneClasses(windowData, true);

        const component = this._getWindowComponent(windowData);
        if (component && typeof component.onTombstoneFreeze === 'function') {
            try {
                component.onTombstoneFreeze(windowData);
            } catch (err) {
                console.warn('[WindowManager] Tombstone freeze hook failed:', err);
            }
        }

        try {
            windowData.element.dispatchEvent(new CustomEvent('fluent-window-freeze', {
                detail: { appId: windowData.appId, windowId: windowData.id, isPWA: this._isPWAWindow(windowData) }
            }));
        } catch (_) {
            // CustomEvent can fail in unusual embedded contexts; freezing state is already applied.
        }
    },

    _restoreWindowFromTombstone(windowData) {
        if (!windowData) return;
        this._clearTombstoneTimer(windowData);
        if (windowData.isFrozen !== true) return;

        windowData.isFrozen = false;
        windowData.frozenAt = null;
        this._setTombstoneClasses(windowData, false);

        const component = this._getWindowComponent(windowData);
        if (component && typeof component.onTombstoneRestore === 'function') {
            try {
                component.onTombstoneRestore(windowData);
            } catch (err) {
                console.warn('[WindowManager] Tombstone restore hook failed:', err);
            }
        }

        if (windowData.element) {
            try {
                windowData.element.dispatchEvent(new CustomEvent('fluent-window-restore-from-freeze', {
                    detail: { appId: windowData.appId, windowId: windowData.id, isPWA: this._isPWAWindow(windowData) }
                }));
            } catch (_) {
                // State restoration has already happened.
            }
        }
    },

    _scheduleTombstoneFreeze(windowData) {
        if (!windowData || !windowData.element) return;
        this._clearTombstoneTimer(windowData);
        if (!this._isTombstoneBackgroundEnabled()) {
            this._restoreWindowFromTombstone(windowData);
            return;
        }
        if (windowData.isMinimized !== true || windowData.isRestoring || windowData.element.classList.contains('closing')) return;

        const minimizedAt = Number(windowData.minimizedAt || Date.now());
        const elapsed = Math.max(0, Date.now() - minimizedAt);
        const delay = Math.max(0, this._getTombstoneFreezeDelayMs() - elapsed);
        windowData._tombstoneTimer = setTimeout(() => {
            windowData._tombstoneTimer = null;
            this._freezeWindow(windowData);
        }, delay);
    },

    _syncTombstoneSetting() {
        if (!this._isTombstoneBackgroundEnabled()) {
            this.windows.forEach((windowData) => {
                this._clearTombstoneTimer(windowData);
                this._restoreWindowFromTombstone(windowData);
            });
            return;
        }

        this.windows.forEach((windowData) => {
            if (windowData && windowData.isMinimized === true) {
                this._scheduleTombstoneFreeze(windowData);
            }
        });
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

    _clearTaskbarIndicatorMotion(appId) {
        if (!appId) return;
        const taskbarBtn = document.querySelector(`.taskbar-app[data-app-id="${appId}"]`);
        if (!taskbarBtn) return;
        if (taskbarBtn._indicatorMotionTimer) {
            clearTimeout(taskbarBtn._indicatorMotionTimer);
            taskbarBtn._indicatorMotionTimer = null;
        }
        taskbarBtn.classList.remove('taskbar-indicator-sync', 'taskbar-indicator-minimizing', 'taskbar-indicator-restoring');
        taskbarBtn.style.removeProperty('--taskbar-indicator-duration');
        taskbarBtn.style.removeProperty('--taskbar-indicator-ease');
    },

    _startTaskbarIndicatorMotion(windowData, mode, duration, easing) {
        if (!windowData || !windowData.appId || duration <= 0) return;
        const taskbarBtn = document.querySelector(`.taskbar-app[data-app-id="${windowData.appId}"]`);
        if (!taskbarBtn) return;

        this._clearTaskbarIndicatorMotion(windowData.appId);
        taskbarBtn.style.setProperty('--taskbar-indicator-duration', `${duration}ms`);
        taskbarBtn.style.setProperty('--taskbar-indicator-ease', easing);
        taskbarBtn.classList.add('taskbar-indicator-sync', `taskbar-indicator-${mode}`);

        taskbarBtn._indicatorMotionTimer = setTimeout(() => {
            this._clearTaskbarIndicatorMotion(windowData.appId);
        }, duration + 40);
    },

    _setTaskbarIndicatorForWindow(windowData, forceActive = false) {
        if (!windowData || !windowData.appId) return;
        const taskbarBtn = document.querySelector(`.taskbar-app[data-app-id="${windowData.appId}"]`);
        if (!taskbarBtn) return;

        const isVisible = windowData.element && windowData.element.style.display !== 'none' && !windowData.element.classList.contains('closing');
        const isInactive = windowData.element?.classList.contains('window-inactive') === true;
        const isMinimized = windowData.isMinimized === true || windowData.element?.style.display === 'none';
        const isActive = forceActive && isVisible && !isMinimized && !windowData.isMinimizing && !isInactive;
        taskbarBtn.classList.toggle('taskbar-app-active', isActive);
        taskbarBtn.classList.toggle('taskbar-app-minimized', isMinimized);
        taskbarBtn.classList.toggle('running', isVisible);
    },

    _syncTaskbarAppState(appId) {
        const taskbarBtn = document.querySelector(`.taskbar-app[data-app-id="${appId}"]`);
        if (!taskbarBtn) return;
        const windowData = this.windows.find((w) => w.appId === appId && w.element && !w.element.classList.contains('closing'));
        const isRunning = !!windowData;
        const isMinimized = !!windowData && (windowData.isMinimized === true || windowData.element?.style.display === 'none');
        const isActive = !!windowData && !isMinimized && !windowData.isMinimizing && !windowData.element.classList.contains('window-inactive');

        taskbarBtn.classList.toggle('running', isRunning || isMinimized);
        taskbarBtn.classList.toggle('taskbar-app-minimized', isMinimized);
        taskbarBtn.classList.toggle('taskbar-app-active', isActive);
    },

    _syncAllTaskbarAppStates() {
        const ids = new Set([
            ...Array.from(State.runningApps || []),
            ...this.windows.map((w) => w && w.appId).filter(Boolean)
        ]);
        ids.forEach((appId) => this._syncTaskbarAppState(appId));
    },

    getAppWindow(appId) {
        return this.windows.find((w) =>
            w &&
            w.appId === appId &&
            w.element &&
            !w.element.classList.contains('closing')
        ) || null;
    },

    _setActiveWindow(windowId = null) {
        this.activeWindowId = windowId;
        this.windows.forEach((w) => {
            if (!w || !w.element) return;
            const isActive = !!windowId && w.id === windowId && !w.isMinimized && !w.isMinimizing;
            w.element.classList.toggle('window-inactive', !isActive && !w.isMinimized && !w.isMinimizing && !w.element.classList.contains('closing'));
        });
    },

    _playWindowFocusMotion(windowData, motionClass) {
        if (!windowData || !windowData.element || !this._isAnimationEnabled()) return;
        const el = windowData.element;
        el.classList.remove('window-focus-pop', 'window-focus-dip');
        void el.offsetWidth;
        el.classList.add(motionClass);
        clearTimeout(windowData._focusMotionTimer);
        windowData._focusMotionTimer = setTimeout(() => {
            el.classList.remove('window-focus-pop', 'window-focus-dip');
            windowData._focusMotionTimer = null;
        }, 340);
    },

    _playFocusTransitionMotion(nextWindowData, previousWindowData, forceMotion = false) {
        if (!this._isAnimationEnabled()) return;
        if (previousWindowData && previousWindowData !== nextWindowData) {
            this._playWindowFocusMotion(previousWindowData, 'window-focus-dip');
        }
        if (forceMotion || (previousWindowData && previousWindowData !== nextWindowData)) {
            this._playWindowFocusMotion(nextWindowData, 'window-focus-pop');
        }
    },

    _bindDesktopInactivityListener() {
        if (this._desktopInactivityBound || typeof document === 'undefined') return;
        this._desktopInactivityBound = true;
        document.addEventListener('pointerdown', (event) => {
            const target = event.target instanceof Element ? event.target : null;
            if (target && target.closest('.window')) return;
            if (target && target.closest('.taskbar')) return;
            this._setActiveWindow(null);
            this._syncAllTaskbarAppStates();
        }, true);
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
        if (windowData._focusMotionTimer) {
            clearTimeout(windowData._focusMotionTimer);
            windowData._focusMotionTimer = null;
        }
        if (windowData._dockFeedbackTimer) {
            clearTimeout(windowData._dockFeedbackTimer);
            windowData._dockFeedbackTimer = null;
        }
        this._clearTombstoneTimer(windowData);
        if (windowData.element) {
            windowData.element.classList.remove('window-focus-pop', 'window-focus-dip');
        }
        this._clearTaskbarIndicatorMotion(windowData.appId);
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
        windowData.minimizedAt = Date.now();
        this.updateMaximizedWallpaperEffect();
        this._syncWidgetDimState();
        this._syncAllTaskbarAppStates();
        this._setTaskbarIndicatorForWindow(windowData, false);
        this._scheduleTombstoneFreeze(windowData);
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
        windowData.minimizedAt = null;
        this._restoreWindowFromTombstone(windowData);
        this._setTaskbarIndicatorForWindow(windowData, true);
        this._syncAllTaskbarAppStates();
        this._syncWidgetDimState();
    },

    _startMinimizeAnimation(windowData, fromInterruptedRestore = false) {
        if (!windowData || !windowData.element || windowData.isMinimized) return;
        const el = windowData.element;
        this._clearWindowMotionTimers(windowData);
        this._restoreWindowFromTombstone(windowData);
        const wasMaximized = windowData.isMaximized === true;

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

        // Sync wallpaper blur transition with minimize motion for maximized windows.
        if (wasMaximized) {
            this.updateMaximizedWallpaperEffect();
        }

        const duration = this._effectiveDuration(this.MINIMIZE_DURATION_MS);
        const dockPoint = this.getTaskbarButtonPosition(windowData.appId);
        const baseCenter = this._getWindowBaseCenter(windowData);
        const translateX = dockPoint.x - baseCenter.x;
        const translateY = dockPoint.y - baseCenter.y;

        if (duration <= 0) {
            this._finalizeMinimize(windowData);
            return;
        }

        const minimizeEase = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
        const opacityDuration = Math.round(duration * 0.56);
        // 小组件恢复正常的过渡与最小化动画同时启动、同节奏
        this._syncWidgetDimState(duration, minimizeEase);
        el.style.transition = `transform ${duration}ms ${minimizeEase}, opacity ${opacityDuration}ms cubic-bezier(0.4, 0, 1, 1)`;
        this._startTaskbarIndicatorMotion(windowData, 'minimizing', duration, minimizeEase);
        this._setTaskbarIndicatorForWindow(windowData, false);

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
        this._restoreWindowFromTombstone(windowData);

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
            this.focusWindow(windowData.id, { suppressMotion: true });
            this.updateMaximizedWallpaperEffect();
            return;
        }

        const restoreEase = 'cubic-bezier(0.16, 1, 0.3, 1)';
        const opacityDuration = Math.round(duration * 0.68);
        // 小组件退避的过渡与恢复动画同时启动、同节奏
        this._syncWidgetDimState(duration, restoreEase);
        el.style.transition = `transform ${duration}ms ${restoreEase}, opacity ${opacityDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        this._startTaskbarIndicatorMotion(windowData, 'restoring', duration, restoreEase);
        requestAnimationFrame(() => {
            if (!windowData.isRestoring) return;
            el.style.transform = '';
            el.style.opacity = '1';
        });

        this.focusWindow(windowData.id, { suppressMotion: true });
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

    _getWindowMinBounds(appOrId = null) {
        const fallback = { minWidth: 400, minHeight: 300 };
        let appId = null;

        if (typeof appOrId === 'string') {
            appId = appOrId;
        } else if (appOrId && typeof appOrId === 'object') {
            appId = appOrId.dataset?.appId || appOrId.appId || null;
        }

        if (!appId) return fallback;
        const config = this.appConfigs[appId];
        if (!config) return fallback;

        return {
            minWidth: Math.max(fallback.minWidth, Math.round(config.minWidth || fallback.minWidth)),
            minHeight: Math.max(fallback.minHeight, Math.round(config.minHeight || fallback.minHeight))
        };
    },

    _clampWindowBounds(bounds, appOrId = null) {
        const { minWidth, minHeight } = this._getWindowMinBounds(appOrId);
        const width = Math.max(minWidth, Math.round(bounds.width || minWidth));
        const height = Math.max(minHeight, Math.round(bounds.height || minHeight));
        const left = Math.round(Number.isFinite(bounds.left) ? bounds.left : 0);
        const top = Math.max(0, Math.round(Number.isFinite(bounds.top) ? bounds.top : 0));
        return { left, top, width, height };
    },

    _captureWindowBounds(windowElement) {
        if (!windowElement) return null;
        return this._clampWindowBounds({
            left: windowElement.offsetLeft,
            top: windowElement.offsetTop,
            width: windowElement.offsetWidth,
            height: windowElement.offsetHeight
        }, windowElement);
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

    _getEdgeSnapLayout(clientX, clientY, windowTop = null) {
        if (!this._isEdgeSnapEnabled()) return null;

        const trigger = this.EDGE_SNAP_TRIGGER;
        const cornerTrigger = this.CORNER_SNAP_TRIGGER;
        const viewportWidth = Math.max(0, globalThis.innerWidth || 0);
        const viewportHeight = Math.max(0, (globalThis.innerHeight || 0) - this._getTaskbarReservedHeight());
        if (!viewportWidth || !viewportHeight) return null;

        const nearLeft = clientX <= trigger;
        const nearRight = clientX >= viewportWidth - trigger;
        const maximizeTopTrigger = Math.max(cornerTrigger, Math.min(180, Math.round(viewportHeight * 0.18)));
        const nearTopCorner = clientY <= cornerTrigger;
        const nearTopMaximize = clientY <= maximizeTopTrigger;
        const nearBottom = clientY >= viewportHeight - cornerTrigger;

        if (nearLeft && nearTopCorner) return 'top-left';
        if (nearRight && nearTopCorner) return 'top-right';
        if (this._isTopEdgeMaximizeEnabled()) {
            // Fallback for browsers/devices where pointer Y near the top edge is unstable:
            // if the dragged window itself reaches the top band, keep corners, otherwise maximize.
            if (Number.isFinite(windowTop) && windowTop <= trigger) {
                if (nearLeft && nearTopCorner) return 'top-left';
                if (nearRight && nearTopCorner) return 'top-right';
                return 'maximize';
            }
            // Top edge maximize should work across a wider top area.
            if (nearTopMaximize) return 'maximize';
        }
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
        const fallbackBounds = this._clampWindowBounds(fallback, appId);

        const rawStore = State.settings && State.settings[this.WINDOW_BOUNDS_KEY];
        const store = (rawStore && typeof rawStore === 'object' && !Array.isArray(rawStore)) ? rawStore : {};
        const saved = store[appId];
        if (!saved) {
            return { ...fallbackBounds, snapLayout: null, lastNormalBounds: { ...fallbackBounds } };
        }

        const left = Number(saved.left);
        const top = Number(saved.top);
        const width = Number(saved.width);
        const height = Number(saved.height);
        if (![left, top, width, height].every(v => Number.isFinite(v))) {
            return { ...fallbackBounds, snapLayout: null, lastNormalBounds: { ...fallbackBounds } };
        }

        const snapLayout = typeof saved.snapLayout === 'string' ? saved.snapLayout : null;
        const lastNormalLeft = Number(saved.lastNormalLeft);
        const lastNormalTop = Number(saved.lastNormalTop);
        const lastNormalWidth = Number(saved.lastNormalWidth);
        const lastNormalHeight = Number(saved.lastNormalHeight);
        const hasLastNormal = [lastNormalLeft, lastNormalTop, lastNormalWidth, lastNormalHeight].every(v => Number.isFinite(v));
        const currentBounds = this._clampWindowBounds({ left, top, width, height }, appId);
        const lastNormalBounds = hasLastNormal
            ? this._clampWindowBounds({
                left: lastNormalLeft,
                top: lastNormalTop,
                width: lastNormalWidth,
                height: lastNormalHeight
            }, appId)
            : (snapLayout ? { ...fallbackBounds } : { ...currentBounds });

        return {
            ...currentBounds,
            snapLayout,
            lastNormalBounds
        };
    },

    _getWindowData(windowId) {
        return this.windows.find(w => w.id === windowId);
    },

    _persistWindowBounds(windowData) {
        if (!windowData || !windowData.element || windowData.isMaximized || windowData.isMinimized) return;
        if (!State || !State.settings) return;

        const bounds = this._captureWindowBounds(windowData.element);
        if (!bounds) return;
        if (!windowData.snapLayout) {
            windowData.lastNormalBounds = { ...bounds };
        }
        const lastNormal = windowData.lastNormalBounds
            ? this._clampWindowBounds(windowData.lastNormalBounds, windowData.appId)
            : null;

        const rawStore = State.settings[this.WINDOW_BOUNDS_KEY];
        const prevStore = (rawStore && typeof rawStore === 'object' && !Array.isArray(rawStore)) ? rawStore : {};
        const prev = prevStore[windowData.appId];
        const same = prev &&
            Number(prev.left) === bounds.left &&
            Number(prev.top) === bounds.top &&
            Number(prev.width) === bounds.width &&
            Number(prev.height) === bounds.height &&
            (prev.snapLayout || null) === (windowData.snapLayout || null) &&
            Number(prev.lastNormalLeft) === Number(lastNormal && lastNormal.left) &&
            Number(prev.lastNormalTop) === Number(lastNormal && lastNormal.top) &&
            Number(prev.lastNormalWidth) === Number(lastNormal && lastNormal.width) &&
            Number(prev.lastNormalHeight) === Number(lastNormal && lastNormal.height);
        if (same) return;

        const nextStore = {
            ...prevStore,
            [windowData.appId]: {
                left: bounds.left,
                top: bounds.top,
                width: bounds.width,
                height: bounds.height,
                snapLayout: windowData.snapLayout || null,
                lastNormalLeft: lastNormal ? lastNormal.left : null,
                lastNormalTop: lastNormal ? lastNormal.top : null,
                lastNormalWidth: lastNormal ? lastNormal.width : null,
                lastNormalHeight: lastNormal ? lastNormal.height : null,
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
        const fullscreenHeight = Math.max(320, globalThis.innerHeight || 320);
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
            case 'maximize':
                return { left: 0, top: 0, width: viewportWidth, height: fullscreenHeight };
            default:
                return null;
        }
    },

    applySnapLayout(windowId, layoutId) {
        const windowData = this._getWindowData(windowId);
        if (!windowData) return;

        if (layoutId === 'maximize') {
            this._hideSnapMenu(windowData.element, true);
            this._hideDragSnapHint(true);
            if (!windowData.isMaximized) {
                this.toggleMaximize(windowId);
            }
            return;
        }

        const bounds = this._getSnapBounds(layoutId);
        if (!bounds) return;

        if (!windowData.isMaximized && !windowData.snapLayout) {
            const currentBounds = this._captureWindowBounds(windowData.element);
            if (currentBounds) windowData.lastNormalBounds = { ...currentBounds };
        }

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

        if (typeof SettingsApp !== 'undefined' && SettingsApp.isAppRepairing(appId)) {
            FluentUI.Toast({
                title: t('start.ctx.app-repairing'),
                message: t('start.ctx.app-repairing-msg'),
                type: 'warning'
            });
            return false;
        }

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

        if (typeof State !== 'undefined' && typeof State.recordAppUsage === 'function') {
            State.recordAppUsage(appId);
        }

        if (config.openMode === 'external' && config.url) {
            window.open(config.url, '_blank', 'noopener,noreferrer');
            return;
        }

        // 检查是否已经打开该应用窗口 - Check if app window already exists
        const existingWindow = this.getAppWindow(appId);
        if (existingWindow) {
            this.focusWindow(existingWindow.id);
            this._syncTaskbarAppState(appId);
            
            if (data && config.component && globalThis[config.component]) {
                if (data.fileId && globalThis[config.component].loadFile) {
                    globalThis[config.component].loadFile(data.fileId);
                } else if (globalThis[config.component].openData) {
                    globalThis[config.component].openData(data);
                }
            }
            return;
        }


        // 创建新窗口 - Create new window
        const windowId = `window-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const initialBounds = this._readWindowBounds(appId, config);
        const windowElement = this.createWindow(windowId, appId, config, initialBounds);
        const initialLastNormalBounds = initialBounds.lastNormalBounds
            ? this._clampWindowBounds(initialBounds.lastNormalBounds, appId)
            : (initialBounds.snapLayout ? null : this._clampWindowBounds(initialBounds, appId));
        
        this.windows.push({
            id: windowId,
            appId: appId,
            element: windowElement,
            isMinimized: false,
            isMinimizing: false,
            isRestoring: false,
            isMaximized: false,
            isFrozen: false,
            minimizedAt: null,
            frozenAt: null,
            snapLayout: initialBounds.snapLayout || null,
            lastNormalBounds: initialLastNormalBounds
        });

        this.container.appendChild(windowElement);
        
        State.addRunningApp(appId);
        this._syncTaskbarAppState(appId);
        // 小组件退避过渡与窗口打开动画（250ms）同步
        this._syncWidgetDimState(this._effectiveDuration(250), 'cubic-bezier(0.4, 0, 0.2, 1)');

        
        if (config.component && globalThis[config.component]) {
            globalThis[config.component].init(windowId);
            
            if (data && data.fileId && globalThis[config.component].loadFile) {
                setTimeout(() => {
                    globalThis[config.component].loadFile(data.fileId);
                }, 0);
            } else if (data && globalThis[config.component].openData) {
                setTimeout(() => {
                    globalThis[config.component].openData(data);
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
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        let dragStartedFromSnap = false;
        let dragUnsnapped = false;
        let topMaximizeReady = false;
        let topMaximizeTimer = null;
        let unsnapBlendTimer = null;

        const clearTopMaximizeDwell = () => {
            if (topMaximizeTimer) {
                clearTimeout(topMaximizeTimer);
                topMaximizeTimer = null;
            }
            topMaximizeReady = false;
        };

        const clearUnsnapBlend = () => {
            if (unsnapBlendTimer) {
                clearTimeout(unsnapBlendTimer);
                unsnapBlendTimer = null;
            }
        };

        // 绑定标题栏拖动事件 - Bind titlebar drag event
        titlebar.addEventListener('pointerdown', (e) => {
            if (typeof e.button === 'number' && e.button !== 0) return;
            if (e.isPrimary === false) return;
            if (e.target.closest('.window-controls')) return;
            if (e.target.closest('[data-no-window-drag="true"]')) return;

            const windowData = this._getWindowData(windowElement.id);
            if (windowData && windowData.isMaximized) return;
            this._hideAllSnapMenus(windowElement.id);
            this._hideDragSnapHint(true);
            dragSnapLayout = null;
            clearTopMaximizeDwell();
            clearUnsnapBlend();
            
            isDragging = true;
            dragPointerId = e.pointerId;
            dragMoved = false;
            dragOffsetX = e.clientX - windowElement.offsetLeft;
            dragOffsetY = e.clientY - windowElement.offsetTop;
            initialX = dragOffsetX;
            initialY = dragOffsetY;
            dragStartedFromSnap = !!(windowData && windowData.snapLayout);
            dragUnsnapped = false;
            
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

            const windowData = this._getWindowData(windowElement.id);
            if (windowData && dragStartedFromSnap && !dragUnsnapped) {
                const restoreBounds = windowData.lastNormalBounds
                    ? this._clampWindowBounds(windowData.lastNormalBounds, windowData.appId)
                    : null;
                if (restoreBounds) {
                    clearUnsnapBlend();
                    const blendMs = Math.max(0, this.UNSNAP_RESTORE_BLEND_MS || 0);
                    if (blendMs > 0) {
                        windowElement.style.transition = [
                            `left ${blendMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                            `top ${blendMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                            `width ${blendMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                            `height ${blendMs}ms cubic-bezier(0.22, 1, 0.36, 1)`
                        ].join(', ');
                    }
                    const snappedWidth = Math.max(1, windowElement.offsetWidth || restoreBounds.width);
                    const titlebarHeight = Math.max(30, titlebar.offsetHeight || 40);
                    const ratioX = Math.max(0, Math.min(1, dragOffsetX / snappedWidth));
                    initialX = Math.min(
                        Math.max(Math.round(restoreBounds.width * ratioX), 48),
                        Math.max(48, restoreBounds.width - 48)
                    );
                    initialY = Math.min(
                        Math.max(dragOffsetY, 8),
                        Math.max(18, titlebarHeight - 6)
                    );
                    const restorePlacement = this._clampWindowBounds({
                        left: e.clientX - initialX,
                        top: e.clientY - initialY,
                        width: restoreBounds.width,
                        height: restoreBounds.height
                    }, windowData.appId);
                    this._applyBoundsToWindow(windowElement, restorePlacement);

                    if (blendMs > 0) {
                        unsnapBlendTimer = setTimeout(() => {
                            unsnapBlendTimer = null;
                            if (isDragging) windowElement.style.transition = 'none';
                        }, blendMs);
                    }
                }
                windowData.snapLayout = null;
                dragUnsnapped = true;
            }

            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            dragMoved = true;

            const clamped = this._clampWindowBounds({
                left: currentX,
                top: currentY,
                width: windowElement.offsetWidth,
                height: windowElement.offsetHeight
            }, windowElement);
            
            windowElement.style.left = `${clamped.left}px`;
            windowElement.style.top = `${clamped.top}px`;

            const edgeLayout = this._getEdgeSnapLayout(e.clientX, e.clientY, clamped.top);
            if (edgeLayout) {
                if (edgeLayout === 'maximize') {
                    this._hideDragSnapHint(true);
                    if (topMaximizeReady) {
                        dragSnapLayout = 'maximize';
                    } else {
                        dragSnapLayout = null;
                        if (!topMaximizeTimer) {
                            topMaximizeTimer = setTimeout(() => {
                                topMaximizeTimer = null;
                                if (!isDragging) return;
                                topMaximizeReady = true;
                                dragSnapLayout = 'maximize';
                            }, this.TOP_MAXIMIZE_DWELL_MS);
                        }
                    }
                } else {
                    clearTopMaximizeDwell();
                    dragSnapLayout = edgeLayout;
                    this._showDragSnapHint(edgeLayout);
                }
            } else {
                clearTopMaximizeDwell();
                dragSnapLayout = null;
                this._hideDragSnapHint(true);
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
                dragStartedFromSnap = false;
                dragUnsnapped = false;
                clearTopMaximizeDwell();
                clearUnsnapBlend();
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
        minimizeBtn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        minimizeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
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
        windowElement.addEventListener('click', () => {
            this.focusWindow(windowElement.id);
        });
        windowElement.addEventListener('mousedown', () => {
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
            const { minWidth, minHeight } = this._getWindowMinBounds(windowElement);

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            if (resizeDirection.includes('e')) {
                newWidth = Math.max(minWidth, startWidth + deltaX);
            }
            if (resizeDirection.includes('w')) {
                newWidth = Math.max(minWidth, startWidth - deltaX);
                newLeft = startLeft + (startWidth - newWidth);
            }
            if (resizeDirection.includes('s')) {
                newHeight = Math.max(minHeight, startHeight + deltaY);
            }
            if (resizeDirection.includes('n')) {
                newHeight = Math.max(minHeight, startHeight - deltaY);
                newTop = startTop + (startHeight - newHeight);
            }

            // 限制窗口边界 - Constrain window bounds
            if (newTop < 0) {
                if (resizeDirection.includes('n')) {
                    const bottom = newTop + newHeight;
                    newTop = 0;
                    newHeight = Math.max(minHeight, bottom);
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

    focusWindow(windowId, options = {}) {
        const windowData = this.windows.find(w => w.id === windowId);
        if (!windowData) return;

        if (windowData.isMinimizing) {
            this._startRestoreAnimation(windowData, true);
            this._syncWidgetDimState();
            return;
        }

        if (windowData.isMinimized) {
            this._startRestoreAnimation(windowData, false);
            this._syncWidgetDimState();
            return;
        }

        const previousActiveId = this.activeWindowId;
        const previousWindowData = previousActiveId
            ? this.windows.find(w => w && w.id === previousActiveId)
            : null;
        const forceMotion = options && options.forceMotion === true;
        const suppressMotion = options && options.suppressMotion === true;
        const alreadyActive = previousActiveId === windowId &&
            windowData.element &&
            !windowData.element.classList.contains('window-inactive');

        if (!alreadyActive) {
            this._syncZIndexCounter();
            windowData.element.style.zIndex = ++this.zIndexCounter;
        }
        this._setActiveWindow(windowId);
        this._syncAllTaskbarAppStates();
        this._syncWidgetDimState();
        this._setTaskbarIndicatorForWindow(windowData, true);
        if (!suppressMotion && (forceMotion || (previousActiveId && previousActiveId !== windowId))) {
            this._playFocusTransitionMotion(windowData, previousWindowData, forceMotion);
        }

        if (typeof Fingo !== 'undefined' && Fingo && Fingo.isOpen && typeof Fingo._ensurePanelForeground === 'function') {
            Fingo._ensurePanelForeground();
        }
    },

    minimizeWindow(windowId) {
        const windowData = this.windows.find(w => w.id === windowId);
        if (!windowData || windowData.isMinimized || windowData.isMinimizing) return;
        this._startMinimizeAnimation(windowData, windowData.isRestoring);
        this._syncWidgetDimState();
    },

    toggleWindow(appId) {
        const windowData = this.getAppWindow(appId);
        if (!windowData) {
            this.openApp(appId);
            return;
        }

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
        this._syncAllTaskbarAppStates();
        this._setTaskbarIndicatorForWindow(windowData, !windowData.isMinimized);
    },
    toggleMaximize(windowId) {
        const windowData = this.windows.find(w => w.id === windowId);
        if (!windowData) return;
        this._hideSnapMenu(windowData.element, true);
        this._hideDragSnapHint(true);

        if (windowData.isMaximized) {
            const unmaximizeDuration = this._effectiveDuration(this.MAXIMIZE_TOGGLE_DURATION_MS);
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
            const restoredBounds = this._captureWindowBounds(windowData.element);
            if (restoredBounds) windowData.lastNormalBounds = { ...restoredBounds };
            
            setTimeout(() => {
                windowData.element.classList.remove('unmaximizing');
            }, unmaximizeDuration);
            
            windowData.isMaximized = false;
            windowData.snapLayout = null;
            this._setFullscreenUnmaximizeSync(unmaximizeDuration > 0, unmaximizeDuration);
            
            // 应用最大化样式 - Apply maximized styles
            requestAnimationFrame(() => {
                this.updateMaximizedWallpaperEffect();
            });
            this._persistWindowBounds(windowData);
        } else {
            const maximizeDuration = this._effectiveDuration(this.MAXIMIZE_TOGGLE_DURATION_MS);
            const currentBounds = this._captureWindowBounds(windowData.element);
            if (currentBounds && (!windowData.snapLayout || !windowData.lastNormalBounds)) {
                windowData.lastNormalBounds = { ...currentBounds };
            }
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
            }, maximizeDuration);
            
            windowData.isMaximized = true;
            windowData.snapLayout = null;
            
            // 更新壁纸效果 - Update wallpaper effect
            this.updateMaximizedWallpaperEffect();
            this._setActiveWindow(windowId);
            this._syncAllTaskbarAppStates();
        }
    },
    
    /**
     * 同步「前台是否有可见窗口」的 body 状态类。
     * 桌面小组件据此切换为半透明磨砂 + 灰字的退避样式。
     *
     * 可选传入 durationMs / ease：把小组件退避过渡的时长与缓动
     * 写入 CSS 变量，使其与触发它的窗口动画（打开 / 关闭 /
     * 最小化 / 恢复）实时同步。
     */
    _syncWidgetDimState(durationMs, ease) {
        const hasForeground = this.windows.some(w =>
            !w.isMinimized &&
            !w.isMinimizing &&
            w.element &&
            !w.element.classList.contains('closing') &&
            w.element.style.display !== 'none'
        );
        if (typeof durationMs === 'number') {
            document.body.style.setProperty('--widget-dim-duration', `${Math.max(0, durationMs)}ms`);
            document.body.style.setProperty('--widget-dim-ease', ease || 'ease');
        }
        document.body.classList.toggle('has-foreground-window', hasForeground);
    },

    // 更新最大化窗口的壁纸效果 - Update wallpaper effect for maximized windows
    updateMaximizedWallpaperEffect() {
        const hasMaximized = this.windows.some(w =>
            w.isMaximized &&
            !w.isMinimized &&
            !w.isMinimizing &&
            w.element &&
            !w.element.classList.contains('closing') &&
            w.element.style.display !== 'none'
        );
        const taskbar = this._getTaskbarElement();
        this._syncAllTaskbarAppStates();
        this._syncWidgetDimState();
        
        if (hasMaximized) {
            this._setFullscreenUnmaximizeSync(false);
            this._setFullscreenCloseSync(false);
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
        this._syncAllTaskbarAppStates();
    },

    closeWindow(windowId) {
        const windowData = this.windows.find(w => w.id === windowId);
        if (!windowData) return;
        this._hideSnapMenu(windowData.element, true);
        this._hideDragSnapHint(true);
        this._persistWindowBounds(windowData);

        const proceedClose = () => {
            const closeDuration = this._effectiveDuration(this.CLOSE_DURATION_MS);
            const shouldSyncFullscreenClose = windowData.isMaximized === true;
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
            this._setFullscreenCloseSync(shouldSyncFullscreenClose && closeDuration > 0, closeDuration);
            // 小组件恢复正常的过渡与窗口关闭动画（250ms）同步
            this._syncWidgetDimState(closeDuration, 'cubic-bezier(0.4, 0, 1, 1)');
            // Start wallpaper/taskbar transition together with the close motion.
            this.updateMaximizedWallpaperEffect();
            setTimeout(() => {
                windowData.element.remove();
                this.windows = this.windows.filter(w => w.id !== windowId);
                const hasOtherWindows = this.windows.some(w => w.appId === windowData.appId);
                if (!hasOtherWindows) {
                    State.removeRunningApp(windowData.appId);
                }
                if (this.activeWindowId === windowId) {
                    this.activeWindowId = null;
                    const nextWindow = this.windows.slice().reverse().find((w) => w.element && !w.isMinimized && !w.element.classList.contains('closing'));
                    if (nextWindow) {
                        this.focusWindow(nextWindow.id);
                    } else {
                        this._setActiveWindow(null);
                    }
                }
                // 延迟更新壁纸效果 - Update wallpaper effect after animation
                this.updateMaximizedWallpaperEffect();
                this._syncAllTaskbarAppStates();
            }, closeDuration);
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
        const taskbar = this._getTaskbarElement();
        const taskbarBtn = document.querySelector(`.taskbar-app[data-app-id="${appId}"]`);
        if (taskbarBtn) {
            const rect = taskbarBtn.getBoundingClientRect();
            let y = rect.top + rect.height / 2;

            // Compensate auto-hide translation so the trajectory points to the
            // icon's visible resting position even when taskbar is hidden.
            const taskbarHidden = !!(taskbar && (taskbar.classList.contains('hidden') || taskbar.classList.contains('hiding')));
            if (taskbarHidden) {
                const hiddenOffset = Math.max(0, (taskbar.offsetHeight || 0) + 30);
                y -= hiddenOffset;
                this._showTaskbarForAutoHide(taskbar);
            }

            return {
                x: rect.left + rect.width / 2,
                y
            };
        }
        return this._getMinimizeDockPoint();
    }
};
