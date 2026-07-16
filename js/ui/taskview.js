/**
 * Task View - proportional window previews and quick switching.
 */
const TaskView = {
    overlay: null,
    isOpen: false,
    windowStates: new Map(),
    autoTimer: null,
    settleTimer: null,
    cycleToken: 0,
    suspendedActiveWindowId: null,
    foregroundStateSuspended: false,
    ENTER_DURATION_MS: 460,
    EXIT_DURATION_MS: 420,

    init() {
        if (this.overlay) return;

        this.overlay = document.createElement('div');
        this.overlay.id = 'taskview-overlay';
        this.overlay.className = 'taskview hidden';
        document.body.appendChild(this.overlay);

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (this.isOpen && e.key === 'Escape') this.close();
        });

        document.addEventListener('pointerdown', (e) => {
            if (!this.isOpen) return;
            if (typeof e.button === 'number' && e.button !== 0) return;

            const hitWindowId = this._resolveTaskViewHitWindowId(e);
            if (hitWindowId) {
                e.preventDefault();
                e.stopPropagation();
                this.closeWithTarget(hitWindowId);
                return;
            }

            if (e.target.closest('.taskbar')) return;
            this.close();
        }, true);
    },

    _resolveTaskViewHitWindowId(e) {
        const path = typeof e.composedPath === 'function' ? e.composedPath() : null;
        if (Array.isArray(path)) {
            for (let i = 0; i < path.length; i++) {
                const node = path[i];
                if (!node || !node.classList || !node.classList.contains('taskview-window-active')) continue;
                if (node.id) return node.id;
            }
        }

        if (!Number.isFinite(e.clientX) || !Number.isFinite(e.clientY)) return null;
        const x = e.clientX;
        const y = e.clientY;
        const windows = (WindowManager.windows || [])
            .filter((w) => w && w.element && w.element.classList && w.element.classList.contains('taskview-window-active'))
            .map((w) => w.element);
        if (windows.length === 0) return null;

        const domOrder = new Map();
        Array.from(document.querySelectorAll('.window')).forEach((el, idx) => domOrder.set(el, idx));
        const sorted = windows.slice().sort((a, b) => {
            const za = Number.parseInt(a.style.zIndex, 10);
            const zb = Number.parseInt(b.style.zIndex, 10);
            const safeZa = Number.isFinite(za) ? za : 0;
            const safeZb = Number.isFinite(zb) ? zb : 0;
            if (safeZa !== safeZb) return safeZb - safeZa;
            const ia = domOrder.has(a) ? domOrder.get(a) : -1;
            const ib = domOrder.has(b) ? domOrder.get(b) : -1;
            return ib - ia;
        });

        for (let i = 0; i < sorted.length; i++) {
            const el = sorted[i];
            const rect = el.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                return el.id || null;
            }
        }

        return null;
    },

    toggle() {
        if (this.isOpen) this.close(); else this.open();
    },

    _parsePixel(value, fallback = NaN) {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    },

    _isAnimationEnabled() {
        if (typeof State === 'undefined' || !State.settings) return true;
        return State.settings.enableAnimation !== false;
    },

    _shouldDimFrozenWindows() {
        if (typeof WindowManager !== 'undefined' && typeof WindowManager._shouldDimFrozenWindows === 'function') {
            return WindowManager._shouldDimFrozenWindows();
        }
        return !(typeof State !== 'undefined' && State.settings && State.settings.tombstoneDimFrozenAppsEnabled === false);
    },

    _effectiveDuration(duration) {
        if (!this._isAnimationEnabled()) return 0;
        return Math.max(0, Math.round(duration || 0));
    },

    _captureVisualState(el) {
        const computed = getComputedStyle(el);
        const transform = computed.transform && computed.transform !== 'none'
            ? computed.transform
            : (el.style.transform || 'none');
        const opacity = computed.opacity || (el.style.opacity || '1');
        const transformOrigin = computed.transformOrigin || el.style.transformOrigin || '0px 0px';
        return { transform, opacity, transformOrigin };
    },

    _cancelConflictingWindowMotion(windowData) {
        if (!windowData || !windowData.element) return;

        if (windowData._focusMotionTimer) {
            clearTimeout(windowData._focusMotionTimer);
            windowData._focusMotionTimer = null;
        }

        // CSS animations override inline transforms. Let Task View take sole
        // ownership before capturing bounds or applying its preview transform.
        windowData.element.classList.remove('opening', 'window-focus-enter', 'window-focus-leave');
    },

    _suspendForegroundWindowState() {
        if (this.foregroundStateSuspended || typeof WindowManager === 'undefined') return;

        this.suspendedActiveWindowId = WindowManager.activeWindowId || null;
        this.foregroundStateSuspended = true;
        if (typeof WindowManager._setActiveWindow === 'function') {
            WindowManager._setActiveWindow(null);
        } else {
            (WindowManager.windows || []).forEach((windowData) => {
                if (!windowData || !windowData.element || windowData.isMinimized || windowData.isMinimizing) return;
                windowData.element.classList.add('window-inactive');
            });
            WindowManager.activeWindowId = null;
        }
        if (typeof WindowManager._syncAllTaskbarAppStates === 'function') {
            WindowManager._syncAllTaskbarAppStates();
        }
    },

    _restoreForegroundWindowState(preferredWindowId = null) {
        if (!this.foregroundStateSuspended || typeof WindowManager === 'undefined') return;

        const requestedId = preferredWindowId || this.suspendedActiveWindowId;
        const requestedWindow = (WindowManager.windows || []).find((windowData) =>
            windowData &&
            windowData.id === requestedId &&
            windowData.element &&
            !windowData.isMinimized &&
            !windowData.isMinimizing &&
            !windowData.element.classList.contains('closing')
        );
        const activeWindowId = requestedWindow ? requestedWindow.id : null;

        if (typeof WindowManager._setActiveWindow === 'function') {
            WindowManager._setActiveWindow(activeWindowId);
        } else {
            WindowManager.activeWindowId = activeWindowId;
            (WindowManager.windows || []).forEach((windowData) => {
                if (!windowData || !windowData.element) return;
                const isActive = !!activeWindowId && windowData.id === activeWindowId;
                windowData.element.classList.toggle(
                    'window-inactive',
                    !isActive && !windowData.isMinimized && !windowData.isMinimizing
                );
            });
        }
        if (typeof WindowManager._syncAllTaskbarAppStates === 'function') {
            WindowManager._syncAllTaskbarAppStates();
        }

        this.suspendedActiveWindowId = null;
        this.foregroundStateSuspended = false;
    },

    _rebaseTransformToTopLeft(transform, transformOrigin) {
        if (!transform || transform === 'none') return '';

        const originParts = String(transformOrigin || '')
            .trim()
            .split(/\s+/)
            .map((value) => Number.parseFloat(value));
        const ox = Number.isFinite(originParts[0]) ? originParts[0] : 0;
        const oy = Number.isFinite(originParts[1]) ? originParts[1] : 0;
        const oz = Number.isFinite(originParts[2]) ? originParts[2] : 0;
        const format = (value) => Number(Number(value).toFixed(6));

        const matrix2d = String(transform).match(/^matrix\(([^)]+)\)$/);
        if (matrix2d) {
            const values = matrix2d[1].split(',').map((value) => Number.parseFloat(value));
            if (values.length === 6 && values.every(Number.isFinite)) {
                const [a, b, c, d, e, f] = values;
                const rebasedE = e + ox - (a * ox) - (c * oy);
                const rebasedF = f + oy - (b * ox) - (d * oy);
                return `matrix(${[a, b, c, d, rebasedE, rebasedF].map(format).join(', ')})`;
            }
        }

        const matrix3d = String(transform).match(/^matrix3d\(([^)]+)\)$/);
        if (matrix3d) {
            const values = matrix3d[1].split(',').map((value) => Number.parseFloat(value));
            if (values.length === 16 && values.every(Number.isFinite)) {
                values[12] += ox - (values[0] * ox) - (values[4] * oy) - (values[8] * oz);
                values[13] += oy - (values[1] * ox) - (values[5] * oy) - (values[9] * oz);
                values[14] += oz - (values[2] * ox) - (values[6] * oy) - (values[10] * oz);
                return `matrix3d(${values.map(format).join(', ')})`;
            }
        }

        return transform;
    },

    _primeExitAnimation(el, visualState) {
        el.style.transition = 'none';
        el.style.transformOrigin = 'top left';
        el.style.transform = visualState.transform;
        el.style.opacity = visualState.opacity;
        el.offsetHeight;
    },

    _freezeExitVisualStates(stateEntries) {
        const visualStates = new Map();

        // Capture every window before removing the task-view state. Otherwise
        // the foreground window can briefly resolve its normal window styles
        // and jump to full size when Task View is closed during its enter
        // transition.
        (stateEntries || []).forEach(([windowId]) => {
            const windowData = (WindowManager.windows || []).find((w) => w && w.id === windowId);
            if (!windowData || !windowData.element) return;
            visualStates.set(windowId, this._captureVisualState(windowData.element));
        });

        visualStates.forEach((visualState, windowId) => {
            const windowData = (WindowManager.windows || []).find((w) => w && w.id === windowId);
            if (!windowData || !windowData.element) return;
            this._primeExitAnimation(windowData.element, visualState);
        });

        return visualStates;
    },

    _runExitAnimation(el, cycleId, transition, endTransform, endOpacity) {
        el.style.transition = transition;
        requestAnimationFrame(() => {
            if (cycleId !== this.cycleToken) return;
            el.style.transform = endTransform;
            el.style.opacity = endOpacity;
        });
    },

    _syncWindowManagerZCounterWithStateEntries(stateEntries) {
        if (typeof WindowManager === 'undefined') return;
        let maxZ = Number.isFinite(WindowManager.zIndexCounter) ? WindowManager.zIndexCounter : 1000;

        (WindowManager.windows || []).forEach((w) => {
            if (!w || !w.element) return;
            const z = Number.parseInt(w.element.style.zIndex, 10);
            if (Number.isFinite(z)) maxZ = Math.max(maxZ, z);
        });

        (stateEntries || []).forEach((entry) => {
            const state = Array.isArray(entry) ? entry[1] : null;
            if (!state) return;
            const z = Number.parseInt(state.origZ, 10);
            if (Number.isFinite(z)) maxZ = Math.max(maxZ, z);
        });

        WindowManager.zIndexCounter = maxZ;
    },

    _nextCycleToken() {
        this.cycleToken += 1;
        return this.cycleToken;
    },

    _clearRuntimeTimers() {
        clearTimeout(this.autoTimer);
        clearTimeout(this.settleTimer);
        this.autoTimer = null;
        this.settleTimer = null;
    },

    _markTaskViewManaged(el, state) {
        if (!el) return;
        el.dataset.taskviewManaged = '1';
        el.dataset.taskviewOrigDisplay = state.origDisplay || '';
        el.dataset.taskviewOrigZ = state.origZ || '';
        el.dataset.taskviewOrigTransform = state.origTransform || '';
        el.dataset.taskviewOrigTransition = state.origTransition || '';
        el.dataset.taskviewOrigTransformOrigin = state.origTransformOrigin || '';
        el.dataset.taskviewOrigOpacity = state.origOpacity || '';
        el.dataset.taskviewOrigPointerEvents = state.origPointerEvents || '';
    },

    _clearTaskViewManaged(el) {
        if (!el) return;
        el.classList.remove('taskview-window-frozen');
        delete el.dataset.taskviewManaged;
        delete el.dataset.taskviewOrigDisplay;
        delete el.dataset.taskviewOrigZ;
        delete el.dataset.taskviewOrigTransform;
        delete el.dataset.taskviewOrigTransition;
        delete el.dataset.taskviewOrigTransformOrigin;
        delete el.dataset.taskviewOrigOpacity;
        delete el.dataset.taskviewOrigPointerEvents;
    },

    _captureInterruptedVisualStates() {
        const visualStates = new Map();
        (WindowManager.windows || []).forEach((windowData) => {
            const el = windowData && windowData.element;
            if (!el || el.dataset.taskviewManaged !== '1') return;
            visualStates.set(windowData.id, this._captureVisualState(el));
        });
        return visualStates;
    },

    _restoreInterruptedManagedWindows() {
        const windows = (WindowManager.windows || []).filter((w) => w && w.element);
        windows.forEach((windowData) => {
            const el = windowData.element;
            if (!el || el.dataset.taskviewManaged !== '1') return;

            const origDisplay = el.dataset.taskviewOrigDisplay || '';
            const origTransition = el.dataset.taskviewOrigTransition || '';
            el.classList.remove('taskview-window-active', 'taskview-window-frozen');
            el.style.transition = 'none';
            el.style.transform = el.dataset.taskviewOrigTransform || '';
            el.style.transformOrigin = el.dataset.taskviewOrigTransformOrigin || '';
            el.style.opacity = el.dataset.taskviewOrigOpacity || '';
            el.style.pointerEvents = el.dataset.taskviewOrigPointerEvents || '';
            el.style.zIndex = el.dataset.taskviewOrigZ || '';
            if (windowData.isMinimized) {
                el.style.display = origDisplay || 'none';
            } else {
                el.style.display = origDisplay || '';
            }

            el.offsetHeight;
            el.style.transition = origTransition;
            this._clearTaskViewManaged(el);
        });
    },

    _resolveWindowBounds(windowData, element) {
        const rect = element.getBoundingClientRect();
        const styleWidth = this._parsePixel(element.style.width);
        const styleHeight = this._parsePixel(element.style.height);
        const styleLeft = this._parsePixel(element.style.left);
        const styleTop = this._parsePixel(element.style.top);
        let width = Number.isFinite(styleWidth) && styleWidth > 1 ? styleWidth : rect.width;
        let height = Number.isFinite(styleHeight) && styleHeight > 1 ? styleHeight : rect.height;
        let left = Number.isFinite(styleLeft) ? styleLeft : rect.left;
        let top = Number.isFinite(styleTop) ? styleTop : rect.top;

        if (windowData.isMinimized || element.style.display === 'none') {
            const saved = windowData.savedPosition || {};
            if (width <= 1) width = this._parsePixel(saved.width, width);
            if (height <= 1) height = this._parsePixel(saved.height, height);
            if (!Number.isFinite(left)) left = this._parsePixel(saved.left, left);
            if (!Number.isFinite(top)) top = this._parsePixel(saved.top, top);
        }

        if (width <= 1 || height <= 1) {
            width = this._parsePixel(element.style.width, width);
            height = this._parsePixel(element.style.height, height);
        }

        if (windowData.isMaximized) {
            width = Math.max(width || 0, globalThis.innerWidth || 0);
            height = Math.max(height || 0, globalThis.innerHeight || 0);
            left = 0;
            top = 0;
        }

        if (!Number.isFinite(width) || width <= 1) width = 900;
        if (!Number.isFinite(height) || height <= 1) height = 600;
        if (!Number.isFinite(left)) left = Math.max(0, ((globalThis.innerWidth || width) - width) / 2);
        if (!Number.isFinite(top)) top = Math.max(0, ((globalThis.innerHeight || height) - height) / 2 - 40);

        return {
            left,
            top,
            width,
            height
        };
    },

    _captureWindowState(windowData) {
        const el = windowData.element;
        const computed = getComputedStyle(el);
        const normalTransform = computed.transform && computed.transform !== 'none'
            ? computed.transform
            : '';
        const normalTransformOrigin = computed.transformOrigin || el.style.transformOrigin || '0px 0px';
        return {
            origPos: { left: el.style.left, top: el.style.top },
            origSize: { width: el.style.width, height: el.style.height },
            origDisplay: el.style.display || '',
            origZ: el.style.zIndex || '',
            origTransform: el.style.transform || '',
            origTransition: el.style.transition || '',
            origTransformOrigin: el.style.transformOrigin || '',
            origOpacity: el.style.opacity || '',
            origPointerEvents: el.style.pointerEvents || '',
            returnTransform: this._rebaseTransformToTopLeft(normalTransform, normalTransformOrigin),
            wasMinimized: windowData.isMinimized === true,
            wasFrozen: windowData.isFrozen === true,
            bounds: this._resolveWindowBounds(windowData, el),
            clickHandler: null
        };
    },

    _getMinimizeScale() {
        if (typeof WindowManager !== 'undefined' && Number.isFinite(WindowManager.MINIMIZE_DOCK_SCALE)) {
            return WindowManager.MINIMIZE_DOCK_SCALE;
        }
        return 0.08;
    },

    _getDockPoint(windowData) {
        if (typeof WindowManager !== 'undefined' && typeof WindowManager.getTaskbarButtonPosition === 'function') {
            return WindowManager.getTaskbarButtonPosition(windowData.appId);
        }
        return {
            x: (globalThis.innerWidth || 0) / 2,
            y: Math.max(0, (globalThis.innerHeight || 0) - 8)
        };
    },

    _buildDockTransform(bounds, dockPoint, scale) {
        const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 0.08;
        const tx = dockPoint.x - bounds.left - (bounds.width * safeScale / 2);
        const ty = dockPoint.y - bounds.top - (bounds.height * safeScale / 2);
        return `translate(${Math.round(tx)}px, ${Math.round(ty)}px) scale(${Number(safeScale.toFixed(4))})`;
    },

    _buildTaskViewTransform(bounds, target) {
        const tx = target.x - bounds.left;
        const ty = target.y - bounds.top;
        return `translate(${Math.round(tx)}px, ${Math.round(ty)}px) scale(${target.scale})`;
    },

    _buildEnterTransition() {
        const duration = this._effectiveDuration(this.ENTER_DURATION_MS);
        if (duration <= 0) return 'none';
        const opacityDuration = Math.round(duration * 0.52);
        return `transform ${duration}ms cubic-bezier(0.2, 1.12, 0.26, 1), opacity ${opacityDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    },

    _buildReturnTransition(duration = this.EXIT_DURATION_MS) {
        const resolved = this._effectiveDuration(duration);
        if (resolved <= 0) return 'none';
        const opacityDuration = Math.round(resolved * 0.58);
        return `transform ${resolved}ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity ${opacityDuration}ms cubic-bezier(0.4, 0, 1, 1)`;
    },

    open() {
        if (this.isOpen) return;
        this.init();
        const cycleId = this._nextCycleToken();
        this._clearRuntimeTimers();
        const interruptedVisualStates = this._captureInterruptedVisualStates();
        this._restoreInterruptedManagedWindows();
        this._restoreForegroundWindowState();
        this.overlay.style.pointerEvents = 'auto';

        const windows = (WindowManager.windows || []).filter((w) => w && w.element);
        const entryVisualStates = new Map();
        windows.forEach((windowData) => {
            entryVisualStates.set(
                windowData.id,
                interruptedVisualStates.get(windowData.id) || this._captureVisualState(windowData.element)
            );
        });
        windows.forEach((windowData) => this._cancelConflictingWindowMotion(windowData));
        if (windows.length === 0) {
            this.overlay.classList.remove('hidden');
            this.isOpen = true;
            document.body.classList.add('in-taskview');
            if (typeof WindowManager !== 'undefined' && typeof WindowManager.updateMaximizedWallpaperEffect === 'function') {
                WindowManager.updateMaximizedWallpaperEffect();
            }
            const autoTimer = setTimeout(() => {
                if (this.autoTimer !== autoTimer || cycleId !== this.cycleToken || !this.isOpen) return;
                this.autoTimer = null;
                this.close();
            }, 200);
            this.autoTimer = autoTimer;
            return;
        }

        this.windowStates.clear();
        const entries = windows.map((windowData) => {
            const state = this._captureWindowState(windowData);
            this.windowStates.set(windowData.id, state);
            return { windowData, state };
        });

        this._suspendForegroundWindowState();

        const layout = this.calculateLayout(entries);

        entries.forEach((entry, i) => {
            const { windowData, state } = entry;
            const el = windowData.element;
            const target = layout[i];
            if (!target) return;

            const finalTransform = this._buildTaskViewTransform(state.bounds, target);
            const wasMinimized = state.wasMinimized || state.origDisplay === 'none';
            const minimizeScale = this._getMinimizeScale();
            const enterTransition = this._buildEnterTransition();
            const resumesInterruptedTransition = interruptedVisualStates.has(windowData.id);

            this._markTaskViewManaged(el, state);
            el.style.transformOrigin = 'top left';
            el.style.zIndex = '9100';
            el.style.pointerEvents = 'auto';
            el.classList.add('taskview-window-active');
            el.classList.toggle(
                'taskview-window-frozen',
                this._shouldDimFrozenWindows() && (state.wasFrozen === true || windowData.isFrozen === true)
            );

            if (wasMinimized) {
                el.style.display = 'flex';
                if (resumesInterruptedTransition) {
                    const entryVisualState = entryVisualStates.get(windowData.id);
                    el.style.transition = 'none';
                    el.style.transform = entryVisualState
                        ? (this._rebaseTransformToTopLeft(entryVisualState.transform, entryVisualState.transformOrigin) || 'none')
                        : 'none';
                    el.style.opacity = entryVisualState ? entryVisualState.opacity : '0';
                } else {
                    const dockPoint = this._getDockPoint(windowData);
                    el.style.transition = 'none';
                    el.style.transform = this._buildDockTransform(state.bounds, dockPoint, minimizeScale);
                    el.style.opacity = '0';
                }
                el.offsetHeight;
                requestAnimationFrame(() => {
                    if (cycleId !== this.cycleToken || !this.isOpen) return;
                    el.style.transition = enterTransition;
                    el.style.transform = finalTransform;
                    el.style.opacity = '1';
                });
            } else {
                const entryVisualState = entryVisualStates.get(windowData.id);
                const entryTransform = entryVisualState
                    ? this._rebaseTransformToTopLeft(entryVisualState.transform, entryVisualState.transformOrigin)
                    : (state.returnTransform || '');
                el.style.transition = 'none';
                el.style.transform = entryTransform || 'none';
                el.style.opacity = entryVisualState ? entryVisualState.opacity : '1';
                el.offsetHeight;
                requestAnimationFrame(() => {
                    if (cycleId !== this.cycleToken || !this.isOpen) return;
                    el.style.transition = enterTransition;
                    el.style.transform = finalTransform;
                    el.style.opacity = '1';
                });
            }

            state.clickHandler = null;
        });

        this.overlay.classList.remove('hidden');
        this.isOpen = true;
        document.body.classList.add('in-taskview');
        if (typeof WindowManager !== 'undefined' && typeof WindowManager.updateMaximizedWallpaperEffect === 'function') {
            WindowManager.updateMaximizedWallpaperEffect();
        }
    },

    closeWithTarget(targetId) {
        if (!this.isOpen) return;
        const cycleId = this._nextCycleToken();
        this._clearRuntimeTimers();
        const stateEntries = Array.from(this.windowStates.entries());
        this.windowStates.clear();

        this._freezeExitVisualStates(stateEntries);

        this.isOpen = false;
        document.body.classList.remove('in-taskview');
        this.overlay.style.pointerEvents = 'none';

        const restoreDuration = this._effectiveDuration(this.EXIT_DURATION_MS);
        const minimizeScale = this._getMinimizeScale();
        this._syncWindowManagerZCounterWithStateEntries(stateEntries);
        const targetFrontZ = (typeof WindowManager !== 'undefined' && Number.isFinite(WindowManager.zIndexCounter))
            ? (WindowManager.zIndexCounter + 1)
            : 9101;
        const targetWindowNow = (WindowManager.windows || []).find((w) => w && w.id === targetId);
        if (targetWindowNow && targetWindowNow.element) {
            targetWindowNow.element.style.zIndex = String(targetFrontZ);
        }
        if (typeof WindowManager !== 'undefined' && Number.isFinite(targetFrontZ)) {
            WindowManager.zIndexCounter = targetFrontZ;
        }

        stateEntries.forEach(([windowId, state]) => {
            const targetWindow = (WindowManager.windows || []).find((w) => w.id === windowId);
            if (!targetWindow || !targetWindow.element) return;

            const el = targetWindow.element;
            if (state.clickHandler) {
                el.removeEventListener('mousedown', state.clickHandler, true);
            }

            el.classList.remove('taskview-window-active', 'taskview-window-frozen');
            el.style.pointerEvents = 'none';
            if (state.wasMinimized && windowId !== targetId) {
                const dockPoint = this._getDockPoint(targetWindow);
                this._runExitAnimation(
                    el,
                    cycleId,
                    this._buildReturnTransition(360),
                    this._buildDockTransform(state.bounds, dockPoint, minimizeScale),
                    '0'
                );
                const feedbackDelay = Math.round(this._effectiveDuration(360) * 0.62);
                setTimeout(() => {
                    if (cycleId !== this.cycleToken) return;
                    if (typeof WindowManager !== 'undefined' && typeof WindowManager._playTaskbarDockFeedback === 'function') {
                        WindowManager._playTaskbarDockFeedback(targetWindow.appId);
                    }
                }, feedbackDelay);
            } else {
                this._runExitAnimation(
                    el,
                    cycleId,
                    this._buildReturnTransition(restoreDuration),
                    windowId === targetId ? (state.origTransform || 'none') : (state.returnTransform || 'none'),
                    state.origOpacity || ''
                );
            }
            if (windowId !== targetId) {
                el.style.zIndex = state.origZ;
            }
        });

        const settleTimer = setTimeout(() => {
            if (this.settleTimer !== settleTimer || cycleId !== this.cycleToken) return;

            const selectedEntry = stateEntries.find(([windowId]) => windowId === targetId);
            const selectedWindow = (WindowManager.windows || []).find((windowData) => windowData && windowData.id === targetId);
            if (selectedEntry && selectedWindow && selectedWindow.element && selectedEntry[1].wasMinimized) {
                selectedWindow.isMinimized = false;
                selectedWindow.minimizedAt = null;
                if (typeof WindowManager !== 'undefined' && typeof WindowManager._restoreWindowFromTombstone === 'function') {
                    WindowManager._restoreWindowFromTombstone(selectedWindow);
                }
                selectedWindow.element.style.display = 'flex';
            }
            this._restoreForegroundWindowState(targetId);

            stateEntries.forEach(([windowId, state]) => {
                const targetWindow = (WindowManager.windows || []).find((w) => w.id === windowId);
                if (!targetWindow || !targetWindow.element) return;

                const el = targetWindow.element;

                if (state.wasMinimized) {
                    if (windowId === targetId) {
                        el.style.display = 'flex';
                    } else {
                        el.style.display = state.origDisplay || 'none';
                    }
                } else {
                    el.style.display = state.origDisplay || '';
                }

                el.style.transition = state.origTransition || '';
                el.style.transform = state.origTransform || '';
                el.style.transformOrigin = state.origTransformOrigin || '';
                el.style.opacity = state.origOpacity || '';
                el.style.pointerEvents = state.origPointerEvents || '';
                if (windowId !== targetId) {
                    el.style.zIndex = state.origZ;
                }
                this._clearTaskViewManaged(el);
            });

            this._syncWindowManagerZCounterWithStateEntries(stateEntries);
            if (typeof WindowManager !== 'undefined' && typeof WindowManager.focusWindow === 'function') {
                WindowManager.focusWindow(targetId);
                requestAnimationFrame(() => {
                    WindowManager.focusWindow(targetId);
                });
            }

            this.overlay.classList.add('hidden');
            this.overlay.style.pointerEvents = 'none';
            if (this.settleTimer === settleTimer) this.settleTimer = null;
            if (typeof WindowManager !== 'undefined' && typeof WindowManager.updateMaximizedWallpaperEffect === 'function') {
                WindowManager.updateMaximizedWallpaperEffect();
            }
        }, restoreDuration);
        this.settleTimer = settleTimer;
    },

    close(onSettled = null) {
        if (!this.isOpen) return false;
        const cycleId = this._nextCycleToken();
        this._clearRuntimeTimers();
        const stateEntries = Array.from(this.windowStates.entries());
        this.windowStates.clear();

        this._freezeExitVisualStates(stateEntries);

        this.isOpen = false;
        document.body.classList.remove('in-taskview');
        this.overlay.style.pointerEvents = 'none';

        const restoreDuration = this._effectiveDuration(this.EXIT_DURATION_MS);
        const minimizeScale = this._getMinimizeScale();

        stateEntries.forEach(([windowId, state]) => {
            const targetWindow = (WindowManager.windows || []).find((w) => w.id === windowId);
            if (!targetWindow || !targetWindow.element) return;

            const el = targetWindow.element;
            if (state.clickHandler) {
                el.removeEventListener('mousedown', state.clickHandler, true);
            }

            el.classList.remove('taskview-window-active', 'taskview-window-frozen');
            el.style.pointerEvents = 'none';
            if (state.wasMinimized) {
                const dockPoint = this._getDockPoint(targetWindow);
                this._runExitAnimation(
                    el,
                    cycleId,
                    this._buildReturnTransition(360),
                    this._buildDockTransform(state.bounds, dockPoint, minimizeScale),
                    '0'
                );
                const feedbackDelay = Math.round(this._effectiveDuration(360) * 0.62);
                setTimeout(() => {
                    if (cycleId !== this.cycleToken) return;
                    if (typeof WindowManager !== 'undefined' && typeof WindowManager._playTaskbarDockFeedback === 'function') {
                        WindowManager._playTaskbarDockFeedback(targetWindow.appId);
                    }
                }, feedbackDelay);
            } else {
                this._runExitAnimation(
                    el,
                    cycleId,
                    this._buildReturnTransition(restoreDuration),
                    state.returnTransform || 'none',
                    state.origOpacity || ''
                );
            }
            el.style.zIndex = state.origZ;
        });

        const settleTimer = setTimeout(() => {
            if (this.settleTimer !== settleTimer || cycleId !== this.cycleToken) return;

            this._restoreForegroundWindowState();

            stateEntries.forEach(([windowId, state]) => {
                const targetWindow = (WindowManager.windows || []).find((w) => w.id === windowId);
                if (!targetWindow || !targetWindow.element) return;

                const el = targetWindow.element;
                if (state.wasMinimized) {
                    el.style.display = state.origDisplay || 'none';
                } else {
                    el.style.display = state.origDisplay || '';
                }

                el.style.transition = state.origTransition || '';
                el.style.transform = state.origTransform || '';
                el.style.transformOrigin = state.origTransformOrigin || '';
                el.style.opacity = state.origOpacity || '';
                el.style.pointerEvents = state.origPointerEvents || '';
                el.style.zIndex = state.origZ;
                this._clearTaskViewManaged(el);
            });

            this.overlay.classList.add('hidden');
            this.overlay.style.pointerEvents = 'none';
            if (this.settleTimer === settleTimer) this.settleTimer = null;
            if (typeof WindowManager !== 'undefined' && typeof WindowManager.updateMaximizedWallpaperEffect === 'function') {
                WindowManager.updateMaximizedWallpaperEffect();
            }
            if (typeof onSettled === 'function') {
                try {
                    onSettled();
                } catch (error) {
                    console.error('[TaskView] close completion failed:', error);
                }
            }
        }, restoreDuration);
        this.settleTimer = settleTimer;
        return true;
    },

    calculateLayout(entries) {
        const count = entries.length;
        if (count === 0) return [];

        const padding = 32;
        const gap = 24;

        const cols = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(count * 1.2))));
        const rows = Math.ceil(count / cols);

        const availableWidth = Math.max(260, window.innerWidth - padding * 2);
        const availableHeight = Math.max(220, window.innerHeight - 110 - padding * 2);
        const cellWidth = (availableWidth - gap * (cols - 1)) / cols;
        const cellHeight = (availableHeight - gap * (rows - 1)) / rows;

        const maxScale = count === 1 ? 0.88 : 0.8;
        const slots = Array.from({ length: count }, (_, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            return {
                index: i,
                col,
                row,
                baseX: padding + col * (cellWidth + gap),
                baseY: padding + row * (cellHeight + gap)
            };
        });

        const minimizedEntryIndexes = [];
        const normalEntryIndexes = [];
        entries.forEach((entry, entryIndex) => {
            if (entry && entry.state && entry.state.wasMinimized) {
                minimizedEntryIndexes.push(entryIndex);
            } else {
                normalEntryIndexes.push(entryIndex);
            }
        });

        const assignment = new Array(count).fill(-1);
        const shouldPinMinimizedRight = normalEntryIndexes.length > 0 && minimizedEntryIndexes.length > 0;

        if (shouldPinMinimizedRight) {
            const rightPrioritySlotIndexes = slots
                .slice()
                .sort((a, b) => {
                    if (b.col !== a.col) return b.col - a.col;
                    if (a.row !== b.row) return a.row - b.row;
                    return a.index - b.index;
                })
                .map((slot) => slot.index);

            const minimizedSlotIndexes = rightPrioritySlotIndexes.slice(0, minimizedEntryIndexes.length);
            const minimizedSlotSet = new Set(minimizedSlotIndexes);
            const normalSlotIndexes = slots
                .map((slot) => slot.index)
                .filter((slotIndex) => !minimizedSlotSet.has(slotIndex));

            normalEntryIndexes.forEach((entryIndex, i) => {
                assignment[entryIndex] = normalSlotIndexes[i];
            });
            minimizedEntryIndexes.forEach((entryIndex, i) => {
                assignment[entryIndex] = minimizedSlotIndexes[i];
            });
        } else {
            slots.forEach((slot) => {
                assignment[slot.index] = slot.index;
            });
        }

        return entries.map((entry, entryIndex) => {
            const slotIndex = Number.isFinite(assignment[entryIndex]) && assignment[entryIndex] >= 0
                ? assignment[entryIndex]
                : entryIndex;
            const slot = slots[slotIndex] || slots[Math.min(entryIndex, slots.length - 1)];

            const bounds = entry.state.bounds;
            const scaleW = cellWidth / bounds.width;
            const scaleH = cellHeight / bounds.height;
            const scale = Math.max(0.14, Math.min(scaleW, scaleH, maxScale));

            const previewWidth = bounds.width * scale;
            const previewHeight = bounds.height * scale;

            return {
                x: slot.baseX + (cellWidth - previewWidth) / 2,
                y: slot.baseY + (cellHeight - previewHeight) / 2,
                scale: Number(scale.toFixed(4))
            };
        });
    }
};

window.TaskView = TaskView;
