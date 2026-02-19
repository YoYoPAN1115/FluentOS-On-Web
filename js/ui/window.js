/**
 * 窗口管理模块
 */
const WindowManager = {
    container: null,
    windows: [],
    zIndexCounter: 1000,
    WINDOW_BOUNDS_KEY: 'windowBoundsMemory',
    SNAP_MENU_HIDE_DELAY: 130,
    EDGE_SNAP_TRIGGER: 42,
    CORNER_SNAP_TRIGGER: 110,
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
    
    // 应用配置
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

    // 获取应用配置（动态解析标题）
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
    },

    _isEdgeSnapEnabled() {
        return State.settings.windowEdgeSnapEnabled !== false;
    },

    _isHoverSnapEnabled() {
        return State.settings.windowHoverSnapEnabled !== false;
    },

    _getTaskbarReservedHeight() {
        const taskbar = document.querySelector('.taskbar');
        if (!taskbar) return 0;
        return Math.max(0, (taskbar.offsetHeight || 48) + 8);
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
        console.log(`尝试打开应用: ${appId}`, data);

        const config = this.getAppConfig(appId);
        if (!config) {
            console.warn(`应用 ${appId} 未配置`);
            State.addNotification({
                title: t('close'),
                message: `Cannot open app: ${appId}`,
                type: 'error'
            });
            return;
        }
        
        // 检查应用是否已打开
        const existingWindow = this.windows.find(w => w.appId === appId);
        if (existingWindow) {
            console.log(`应用 ${appId} 已打开，聚焦窗口`);
            this.focusWindow(existingWindow.id);
            
            // 如果有数据参数，传递给已打开的应用
            if (data && config.component && globalThis[config.component]) {
                if (data.fileId && globalThis[config.component].loadFile) {
                    globalThis[config.component].loadFile(data.fileId);
                }
            }
            return;
        }
        
        console.log(`创建窗口: ${config.title}`);

        // 创建窗口
        const windowId = `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const initialBounds = this._readWindowBounds(appId, config);
        const windowElement = this.createWindow(windowId, appId, config, initialBounds);
        
        this.windows.push({
            id: windowId,
            appId: appId,
            element: windowElement,
            isMinimized: false,
            isMaximized: false,
            snapLayout: initialBounds.snapLayout || null
        });

        this.container.appendChild(windowElement);
        
        // 标记应用为运行状态
        State.addRunningApp(appId);

        // 初始化应用内容
        console.log(`[WindowManager] 检查组件: ${config.component}`);
        console.log(`[WindowManager] 组件是否存在: ${config.component && globalThis[config.component]}`);
        console.log(`[WindowManager] globalThis 上的应用对象:`, Object.keys(globalThis).filter(k => k.includes('App')));
        
        if (config.component && globalThis[config.component]) {
            console.log(`[WindowManager] 初始化应用组件: ${config.component}`);
            console.log(`[WindowManager] windowId: ${windowId}`);
            globalThis[config.component].init(windowId);
            
            // 如果有数据参数，在初始化后传递
            if (data && data.fileId && globalThis[config.component].loadFile) {
                setTimeout(() => {
                    globalThis[config.component].loadFile(data.fileId);
                }, 0);
            }
        } else {
            console.error(`[WindowManager] 组件未找到: ${config.component}`);
        }

        // 聚焦窗口
        this.focusWindow(windowId);
    },

    createWindow(windowId, appId, config, initialBounds = null) {
        const windowElement = document.createElement('div');
        windowElement.className = 'window opening';
        windowElement.id = windowId;
        windowElement.dataset.appId = appId;
        
        const bounds = initialBounds || this._readWindowBounds(appId, config);
        this._applyBoundsToWindow(windowElement, bounds);
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
                        <img src="Theme/Icon/Symbol_icon/stroke/Minimize.svg" alt="最小化">
                    </button>
                    <button class="window-control-btn maximize">
                        <img src="Theme/Icon/Symbol_icon/stroke/Maximize.svg" alt="最大化">
                    </button>
                    <button class="window-control-btn close">
                        <img src="Theme/Icon/Symbol_icon/stroke/Cancel.svg" alt="关闭">
                    </button>
                </div>
            </div>
            <div class="window-snap-layout-menu"></div>
            <div class="window-content" id="${windowId}-content"></div>
        `;

        // 绑定窗口事件
        this.bindWindowEvents(windowElement);

        // 移除开场动画类
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
        
        let isDragging = false;
        let dragMoved = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let dragSnapLayout = null;

        // 拖拽功能
        titlebar.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (e.target.closest('.window-controls')) return;

            const windowData = this._getWindowData(windowElement.id);
            if (windowData && windowData.isMaximized) return;
            this._hideAllSnapMenus(windowElement.id);
            this._hideDragSnapHint(true);
            dragSnapLayout = null;
            
            isDragging = true;
            dragMoved = false;
            initialX = e.clientX - windowElement.offsetLeft;
            initialY = e.clientY - windowElement.offsetTop;
            
            // 拖动时禁用过渡动画，防止延迟
            windowElement.style.transition = 'none';
            
            this.focusWindow(windowElement.id);
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
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

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                // 恢复过渡动画
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
        });

        // 双击标题栏最大化
        titlebar.addEventListener('dblclick', () => {
            this._hideSnapMenu(windowElement, true);
            this.toggleMaximize(windowElement.id);
        });

        // 最小化
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
            snapMenu.addEventListener('mousedown', (e) => e.stopPropagation());
        }

        // 最大化/还原
        maximizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._hideSnapMenu(windowElement, true);
            this.toggleMaximize(windowElement.id);
        });

        // 关闭
        closeBtn.addEventListener('click', () => {
            this._hideSnapMenu(windowElement, true);
            this.closeWindow(windowElement.id);
        });

        // 点击窗口时聚焦
        windowElement.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.window-snap-layout-menu')) {
                this._hideAllSnapMenus(windowElement.id);
            }
            this.focusWindow(windowElement.id);
        });
        windowElement.addEventListener('mouseleave', () => {
            this._scheduleSnapMenuHide(windowElement, 90);
        });

        // 窗口调整大小
        this.bindResizeEvents(windowElement);
    },

    bindResizeEvents(windowElement) {
        const handles = windowElement.querySelectorAll('.window-resize-handle');
        let isResizing = false;
        let resizeDirection = '';
        let startX, startY, startWidth, startHeight, startLeft, startTop;

        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                const windowData = this._getWindowData(windowElement.id);
                if (windowData && windowData.isMaximized) return;

                e.stopPropagation();
                isResizing = true;
                windowElement.classList.add('resizing');
                this._hideSnapMenu(windowElement, true);

                // 获取调整方向
                if (handle.classList.contains('resize-top')) resizeDirection = 'n';
                else if (handle.classList.contains('resize-bottom')) resizeDirection = 's';
                else if (handle.classList.contains('resize-left')) resizeDirection = 'w';
                else if (handle.classList.contains('resize-right')) resizeDirection = 'e';
                else if (handle.classList.contains('resize-top-left')) resizeDirection = 'nw';
                else if (handle.classList.contains('resize-top-right')) resizeDirection = 'ne';
                else if (handle.classList.contains('resize-bottom-left')) resizeDirection = 'sw';
                else if (handle.classList.contains('resize-bottom-right')) resizeDirection = 'se';

                // 记录初始状态
                startX = e.clientX;
                startY = e.clientY;
                startWidth = windowElement.offsetWidth;
                startHeight = windowElement.offsetHeight;
                startLeft = windowElement.offsetLeft;
                startTop = windowElement.offsetTop;

                // 防止文本选择
                e.preventDefault();
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            // 根据方向计算新尺寸
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

            // 边界限制仅保留顶部：窗口顶部不能越过屏幕顶部
            if (newTop < 0) {
                if (resizeDirection.includes('n')) {
                    const bottom = newTop + newHeight;
                    newTop = 0;
                    newHeight = Math.max(300, bottom);
                } else {
                    newTop = 0;
                }
            }

            // 应用新尺寸
            windowElement.style.width = `${newWidth}px`;
            windowElement.style.height = `${newHeight}px`;
            windowElement.style.left = `${newLeft}px`;
            windowElement.style.top = `${newTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                windowElement.classList.remove('resizing');
                resizeDirection = '';

                const windowData = this._getWindowData(windowElement.id);
                if (windowData && !windowData.isMaximized) {
                    windowData.snapLayout = null;
                    this._persistWindowBounds(windowData);
                }
            }
        });
    },

    focusWindow(windowId) {
        const windowData = this.windows.find(w => w.id === windowId);
        if (!windowData) return;

        // 如果窗口已最小化，则恢复它
        if (windowData.isMinimized) {
            this.toggleWindow(windowData.appId);
        }

        windowData.element.style.zIndex = ++this.zIndexCounter;
    },

    minimizeWindow(windowId) {
        const windowData = this.windows.find(w => w.id === windowId);
        if (!windowData) return;

        // 获取窗口当前位置和大小
        const windowRect = windowData.element.getBoundingClientRect();
        
        // 获取任务栏对应应用图标的位置
        const taskbarBtn = document.querySelector(`[data-app-id="${windowData.appId}"]`);
        let targetX = globalThis.innerWidth / 2;
        let targetY = globalThis.innerHeight - 36;
        
        if (taskbarBtn) {
            const btnRect = taskbarBtn.getBoundingClientRect();
            targetX = btnRect.left + btnRect.width / 2;
            targetY = btnRect.top + btnRect.height / 2;
        }

        // 计算从窗口中心到任务栏图标的位移
        const windowCenterX = windowRect.left + windowRect.width / 2;
        const windowCenterY = windowRect.top + windowRect.height / 2;
        const translateX = targetX - windowCenterX;
        const translateY = targetY - windowCenterY;

        // 保存位置信息用于还原动画
        windowData.savedPosition = {
            left: windowData.element.style.left,
            top: windowData.element.style.top,
            width: windowData.element.style.width,
            height: windowData.element.style.height,
            windowCenterX: windowCenterX,
            windowCenterY: windowCenterY,
            targetX: targetX,
            targetY: targetY
        };

        // 添加最小化动画类并应用变换
        windowData.element.classList.add('minimizing');
        windowData.element.style.transform = `translate(${translateX}px, ${translateY}px) scale(0.05)`;
        windowData.element.style.opacity = '0';

        setTimeout(() => {
            windowData.element.style.display = 'none';
            windowData.element.classList.remove('minimizing');
            windowData.element.style.transform = '';
            windowData.element.style.opacity = '';
            windowData.isMinimized = true;
        }, 400);
    },

    toggleWindow(appId) {
        const windowData = this.windows.find(w => w.appId === appId);
        if (!windowData) return;

        if (windowData.isMinimized) {
            // 从最小化状态恢复
            windowData.isMinimized = false;
            
            // 先恢复窗口的位置和大小（不可见状态）
            if (windowData.savedPosition) {
                windowData.element.style.left = windowData.savedPosition.left;
                windowData.element.style.top = windowData.savedPosition.top;
                windowData.element.style.width = windowData.savedPosition.width;
                windowData.element.style.height = windowData.savedPosition.height;
            }
            
            // 显示窗口（但仍然不可见，因为我们会设置初始 transform）
            windowData.element.style.display = 'flex';
            
            // 获取任务栏图标位置
            const taskbarBtn = document.querySelector(`[data-app-id="${appId}"]`);
            let targetX = globalThis.innerWidth / 2;
            let targetY = globalThis.innerHeight - 36;
            
            if (taskbarBtn) {
                const btnRect = taskbarBtn.getBoundingClientRect();
                targetX = btnRect.left + btnRect.width / 2;
                targetY = btnRect.top + btnRect.height / 2;
            }
            
            // 使用保存的窗口中心位置计算偏移
            let windowCenterX, windowCenterY;
            if (windowData.savedPosition) {
                windowCenterX = windowData.savedPosition.windowCenterX;
                windowCenterY = windowData.savedPosition.windowCenterY;
            } else {
                const windowRect = windowData.element.getBoundingClientRect();
                windowCenterX = windowRect.left + windowRect.width / 2;
                windowCenterY = windowRect.top + windowRect.height / 2;
            }
            
            // 计算从任务栏图标到窗口中心的位移
            const translateX = targetX - windowCenterX;
            const translateY = targetY - windowCenterY;
            
            // 1. 设置初始状态：在任务栏位置，缩小，透明
            windowData.element.style.transition = 'none';
            windowData.element.style.transform = `translate(${translateX}px, ${translateY}px) scale(0.05)`;
            windowData.element.style.opacity = '0';
            
            // 强制浏览器应用初始状态
            windowData.element.offsetHeight;
            
            // 2. 添加动画类并移除 transform 和 opacity 以触发动画
            windowData.element.classList.add('restoring');
            windowData.element.style.transition = ''; // 使用 class 中定义的 transition
            windowData.element.style.transform = '';
            windowData.element.style.opacity = '1';
            
            this.focusWindow(windowData.id);

            setTimeout(() => {
                windowData.element.classList.remove('restoring');
            }, 400); // 匹配 CSS 动画时长
            
        } else {
            this.minimizeWindow(windowData.id);
        }
    },

    toggleMaximize(windowId) {
        const windowData = this.windows.find(w => w.id === windowId);
        if (!windowData) return;
        this._hideSnapMenu(windowData.element, true);
        this._hideDragSnapHint(true);

        const taskbar = document.querySelector('.taskbar');

        if (windowData.isMaximized) {
            // 还原窗口
            windowData.element.classList.add('unmaximizing');
            windowData.element.classList.remove('maximized');
            
            // 显示任务栏（带弹簧动画）
            if (taskbar) {
                taskbar.classList.remove('hiding');
                taskbar.classList.remove('hidden');
            }
            
            // 恢复原始位置和大小
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
            
            // 使用 requestAnimationFrame 确保过渡动画正确触发
            requestAnimationFrame(() => {
                this.updateMaximizedWallpaperEffect();
            });
            this._persistWindowBounds(windowData);
        } else {
            // 保存当前位置和大小
            windowData.savedBounds = {
                left: windowData.element.style.left,
                top: windowData.element.style.top,
                width: windowData.element.style.width,
                height: windowData.element.style.height
            };
            
            // 最大化
            windowData.element.classList.add('maximizing');
            windowData.element.classList.add('maximized');
            
            // 隐藏任务栏（带弹簧动画）
            if (taskbar) {
                taskbar.classList.add('hiding');
                setTimeout(() => {
                    taskbar.classList.remove('hiding');
                    taskbar.classList.add('hidden');
                }, 400);
            }
            
            setTimeout(() => {
                windowData.element.classList.remove('maximizing');
            }, 550);
            
            windowData.isMaximized = true;
            
            // 添加壁纸景深效果
            this.updateMaximizedWallpaperEffect();
        }
    },
    
    // 更新壁纸最大化效果和任务栏显示
    updateMaximizedWallpaperEffect() {
        const hasMaximized = this.windows.some(w => w.isMaximized);
        const taskbar = document.querySelector('.taskbar');
        
        if (hasMaximized) {
            document.body.classList.add('has-maximized-window');
        } else {
            document.body.classList.remove('has-maximized-window');
            // 没有最大化窗口时，显示任务栏
            if (taskbar && taskbar.classList.contains('hidden')) {
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
            // 添加关闭动画
            windowData.element.classList.add('closing');
            setTimeout(() => {
                windowData.element.remove();
                this.windows = this.windows.filter(w => w.id !== windowId);
                const hasOtherWindows = this.windows.some(w => w.appId === windowData.appId);
                if (!hasOtherWindows) {
                    State.removeRunningApp(windowData.appId);
                }
                // 更新壁纸效果和任务栏
                this.updateMaximizedWallpaperEffect();
            }, 250);
        };

        // 通知应用进行 beforeClose 钩子（可异步；返回 false 可中止关闭）
        try {
            const appId = windowData.appId;
            const config = this.appConfigs[appId]; // raw config ok here, only need component
            const component = config && globalThis[config.component];
            if (component && typeof component.beforeClose === 'function') {
                const result = component.beforeClose();
                if (result && typeof result.then === 'function') {
                    result.then((ok) => { if (ok === false) return; proceedClose(); })
                          .catch(() => proceedClose());
                    return; // 等待异步确认
                }
                if (result === false) return; // 同步阻止
            }
        } catch (e) { console.warn('beforeClose 调用失败:', e); }

        proceedClose();
    },
    
    // 获取任务栏图标位置（用于最小化动画）
    getTaskbarButtonPosition(appId) {
        const taskbarBtn = document.querySelector(`[data-app-id="${appId}"]`);
        if (taskbarBtn) {
            const rect = taskbarBtn.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        }
        return {
            x: globalThis.innerWidth / 2,
            y: globalThis.innerHeight - 36
        };
    }
};
