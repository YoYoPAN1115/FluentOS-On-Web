/**
 * 窗口管理模块
 */
const WindowManager = {
    container: null,
    windows: [],
    zIndexCounter: 1000,
    
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
        const windowElement = this.createWindow(windowId, appId, config);
        
        this.windows.push({
            id: windowId,
            appId: appId,
            element: windowElement,
            isMinimized: false,
            isMaximized: false
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

    createWindow(windowId, appId, config) {
        const windowElement = document.createElement('div');
        windowElement.className = 'window opening';
        windowElement.id = windowId;
        windowElement.dataset.appId = appId;
        
        // 计算居中位置
        const left = (globalThis.innerWidth - config.width) / 2;
        const top = (globalThis.innerHeight - config.height) / 2 - 50;
        
        windowElement.style.width = `${config.width}px`;
        windowElement.style.height = `${config.height}px`;
        windowElement.style.left = `${left}px`;
        windowElement.style.top = `${top}px`;
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
        
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;

        // 拖拽功能
        titlebar.addEventListener('mousedown', (e) => {
            if (e.target.closest('.window-controls')) return;
            
            isDragging = true;
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
            
            windowElement.style.left = `${currentX}px`;
            windowElement.style.top = `${currentY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                // 恢复过渡动画
                windowElement.style.transition = '';
            }
        });

        // 双击标题栏最大化
        titlebar.addEventListener('dblclick', () => {
            this.toggleMaximize(windowElement.id);
        });

        // 最小化
        minimizeBtn.addEventListener('click', () => {
            this.minimizeWindow(windowElement.id);
        });

        // 最大化/还原
        maximizeBtn.addEventListener('click', () => {
            this.toggleMaximize(windowElement.id);
        });

        // 关闭
        closeBtn.addEventListener('click', () => {
            this.closeWindow(windowElement.id);
        });

        // 点击窗口时聚焦
        windowElement.addEventListener('mousedown', () => {
            this.focusWindow(windowElement.id);
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
                e.stopPropagation();
                isResizing = true;
                windowElement.classList.add('resizing');

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
        
        // 保存窗口是否最大化的状态
        const wasMaximized = windowData.isMaximized;

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

