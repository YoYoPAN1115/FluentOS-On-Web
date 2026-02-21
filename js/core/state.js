/**
 * 全局状态管理
 */
const State = {
    // 当前视图
    view: 'boot', // 'boot' | 'lock' | 'login' | 'desktop'
    
    // 设置
    settings: {},
    
    // 会话
    session: {},
    
    // 文件系统
    fs: {},
    
    // 桌面布局
    desktopLayout: {},
    
    // 通知列表
    notifications: [],
    
    // 打开的窗口
    windows: [],
    
    // 运行的应用
    runningApps: new Set(),
    
    // 事件监听器
    listeners: {},

    // 初始化
    init() {
        // 从 localStorage 加载数据
        this.settings = Storage.get(Storage.keys.SETTINGS);
        this.session = Storage.get(Storage.keys.SESSION);
        this.fs = Storage.get(Storage.keys.FS);
        this.desktopLayout = Storage.get(Storage.keys.DESKTOP_LAYOUT);
        this.notifications = Storage.get(Storage.keys.NOTIFICATIONS) || [];
        this.ensureSettingsDefaults();
        this.restoreStrictCspOnStartup();
        
        // 校验并修复文件系统完整性（防止关键目录缺失）
        this.ensureFSIntegrity();
        
        // 重置灵翼交互状态（每次启动时都需要重新授权摄像头）
        if (this.settings.lingyiEnabled) {
            this.settings.lingyiEnabled = false;
            Storage.set(Storage.keys.SETTINGS, this.settings);
        }
        
        // 应用主题
        this.applyTheme();
        
        // 应用动画设置
        this.applyAnimationSetting();
        
        // 应用模糊设置
        this.applyBlurSetting();
        
        // 应用窗口模糊设置
        this.applyWindowBlurSetting();
        
        // 应用新版 UI 设置
        this.applyFluentV2Setting();
        this.applyStrictCspSetting();
        
        // 应用亮度设置
        this.applyBrightness();
    },

    // 确保文件系统关键目录存在
    ensureFSIntegrity() {
        if (!this.fs || !this.fs.root) {
            this.fs = Storage.get(Storage.keys.FS) || { root: { id: 'root', name: '此电脑', type: 'folder', children: [] } };
        }
        const root = this.fs.root;
        root.children = root.children || [];
        const ensureFolder = (id, name) => {
            let node = root.children.find(c => c.id === id);
            if (!node) {
                node = { id, name, type: 'folder', children: [] };
                root.children.push(node);
            } else if (!Array.isArray(node.children)) {
                node.children = [];
            }
        };
        ensureFolder('desktop', '桌面');
        ensureFolder('documents', '文档');
        ensureFolder('downloads', '下载');
        ensureFolder('recycle', '回收站');
        // 保存修复结果
        Storage.set(Storage.keys.FS, this.fs);
    },

    getDefaultUserAvatar() {
        return 'Theme/Profile_img/UserAva.png';
    },

    getBuiltInUserAvatars() {
        return [
            this.getDefaultUserAvatar(),
            ...Array.from({ length: 10 }, (_, i) => `Theme/Profile_img/${i + 1}.jpg`)
        ];
    },

    normalizeUserAvatar(value) {
        const fallback = this.getDefaultUserAvatar();
        if (typeof value !== 'string') return fallback;

        const raw = value.trim();
        if (!raw) return fallback;
        if (/^data:image\//i.test(raw)) return raw;

        let normalized = raw.replace(/\\/g, '/');
        if (/^https?:\/\//i.test(normalized)) {
            try {
                const url = new URL(normalized, window.location.href);
                if (url.origin !== window.location.origin) return fallback;
                normalized = decodeURIComponent(url.pathname.replace(/^\//, ''));
            } catch (_) {
                return fallback;
            }
        }

        normalized = normalized.replace(/^\.\//, '').replace(/^\//, '');
        const lower = normalized.toLowerCase();

        if (
            lower === 'userava.png'
            || lower === 'theme/icon/userava.png'
            || lower === 'icon/userava.png'
            || lower === 'profile_img/userava.png'
            || lower === 'theme/profile_img/userava.png'
        ) {
            return fallback;
        }

        const builtIn = this.getBuiltInUserAvatars();
        const exact = builtIn.find((item) => item.toLowerCase() === lower);
        if (exact) return exact;

        const profileMatch = lower.match(/^(?:theme\/)?profile_img\/(\d+)\.jpg$/);
        if (profileMatch) {
            const index = Number(profileMatch[1]);
            if (index >= 1 && index <= 10) {
                return `Theme/Profile_img/${index}.jpg`;
            }
        }

        const plainMatch = lower.match(/^(\d+)\.jpg$/);
        if (plainMatch) {
            const index = Number(plainMatch[1]);
            if (index >= 1 && index <= 10) {
                return `Theme/Profile_img/${index}.jpg`;
            }
        }

        return fallback;
    },

    ensureSettingsDefaults() {
        this.settings = this.settings || {};
        let changed = false;

        const defaults = {
            strictCspEnabled: false,
            strictCspLastEnabled: false,
            fingoCustomMode: false,
            fingoCustomLastEnabled: false,
            fingoProvider: 'openai',
            fingoApiKey: '',
            fingoApiEncrypted: null,
            fingoApiStorageType: 'none',
            fingoApiSaveMode: 'temporary',
            autoEnterFullscreen: true,
            userName: 'Owner',
            userEmail: 'owner@sample.com',
            userAvatar: this.getDefaultUserAvatar(),
            windowEdgeSnapEnabled: true,
            windowHoverSnapEnabled: true,
            windowBoundsMemory: {}
        };

        Object.keys(defaults).forEach((key) => {
            if (this.settings[key] === undefined) {
                this.settings[key] = defaults[key];
                changed = true;
            }
        });

        // Migration: remember prior "enabled" state for startup auto-restore.
        if (this.settings.strictCspEnabled === true && this.settings.strictCspLastEnabled !== true) {
            this.settings.strictCspLastEnabled = true;
            changed = true;
        }

        // Migration: preserve prior custom mode preference for startup restoration.
        if (this.settings.fingoCustomMode === true && this.settings.fingoCustomLastEnabled !== true) {
            this.settings.fingoCustomLastEnabled = true;
            changed = true;
        }

        if (!this.settings.fingoApiStorageType) {
            if (this.settings.fingoApiEncrypted && this.settings.fingoApiEncrypted.ciphertext) {
                this.settings.fingoApiStorageType = 'permanent-encrypted';
            } else {
                this.settings.fingoApiStorageType = 'none';
            }
            changed = true;
        }

        if ((this.settings.fingoApiKey || '').trim()) {
            // Security hardening: plain-text permanent API key storage is no longer supported.
            this.settings.fingoApiKey = '';
            if (this.settings.fingoApiStorageType === 'permanent-plain') {
                this.settings.fingoApiStorageType = 'none';
            }
            changed = true;
        }

        const normalizedUserAvatar = this.normalizeUserAvatar(this.settings.userAvatar);
        if (normalizedUserAvatar !== this.settings.userAvatar) {
            this.settings.userAvatar = normalizedUserAvatar;
            changed = true;
        }

        if (changed) {
            Storage.set(Storage.keys.SETTINGS, this.settings);
        }
    },

    restoreStrictCspOnStartup() {
        if (!this.settings) return;
        let changed = false;

        if (this.settings.strictCspEnabled !== true && this.settings.strictCspLastEnabled === true) {
            this.settings.strictCspEnabled = true;
            changed = true;
        }

        // If strict CSP is restored, restore last custom-mode preference too.
        if (
            this.settings.strictCspEnabled === true
            && this.settings.fingoCustomMode !== true
            && this.settings.fingoCustomLastEnabled === true
        ) {
            this.settings.fingoCustomMode = true;
            changed = true;
        }

        if (changed) {
            Storage.set(Storage.keys.SETTINGS, this.settings);
        }
    },

    // 订阅状态变化
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    },

    // 触发事件
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    },

    // 切换视图
    setView(newView) {
        const oldView = this.view;
        this.view = newView;
        this.emit('viewChange', { oldView, newView });
    },

    // 更新设置
    updateSettings(updates) {
        const safeUpdates = { ...(updates || {}) };
        const turningOffCustomMode = safeUpdates.fingoCustomMode === false
            && this.settings
            && this.settings.fingoCustomMode === true;
        if (Object.prototype.hasOwnProperty.call(safeUpdates, 'userAvatar')) {
            safeUpdates.userAvatar = this.normalizeUserAvatar(safeUpdates.userAvatar);
        }
        if (safeUpdates.strictCspEnabled === true) {
            safeUpdates.strictCspLastEnabled = true;
        } else if (safeUpdates.strictCspEnabled === false) {
            // User explicitly disabled: keep it permanently off.
            safeUpdates.strictCspLastEnabled = false;
        }
        if (safeUpdates.fingoCustomMode === true) {
            if (!Object.prototype.hasOwnProperty.call(safeUpdates, 'fingoCustomLastEnabled')) {
                safeUpdates.fingoCustomLastEnabled = true;
            }
        } else if (safeUpdates.fingoCustomMode === false) {
            if (!Object.prototype.hasOwnProperty.call(safeUpdates, 'fingoCustomLastEnabled')) {
                safeUpdates.fingoCustomLastEnabled = false;
            }
        }
        if (turningOffCustomMode) {
            // Security hardening: when custom mode is disabled, clear all API key material.
            safeUpdates.fingoApiKey = '';
            safeUpdates.fingoApiEncrypted = null;
            safeUpdates.fingoApiStorageType = 'none';
        }

        this.settings = { ...this.settings, ...safeUpdates };
        Storage.set(Storage.keys.SETTINGS, this.settings);
        this.emit('settingsChange', safeUpdates);
        if (turningOffCustomMode) {
            if (typeof window !== 'undefined' && window.Fingo) {
                window.Fingo._sessionApiKey = '';
                window.Fingo._pendingDecryptPromise = null;
            }
            this.emit('fingoApiKeyReady', { storageType: 'none', decrypted: false });
        }
        
        // 应用相关设置
        if (safeUpdates.theme !== undefined) {
            this.applyTheme();
        }
        if (safeUpdates.enableAnimation !== undefined) {
            this.applyAnimationSetting();
        }
        if (safeUpdates.enableBlur !== undefined) {
            this.applyBlurSetting();
        }
        if (safeUpdates.brightness !== undefined) {
            this.applyBrightness();
        }
        if (safeUpdates.enableWindowBlur !== undefined) {
            this.applyWindowBlurSetting();
        }
        if (safeUpdates.enableFluentV2 !== undefined) {
            this.applyFluentV2Setting();
        }
        if (safeUpdates.strictCspEnabled !== undefined) {
            this.applyStrictCspSetting();
        }
    },

    // 更新会话
    updateSession(updates) {
        this.session = { ...this.session, ...updates };
        Storage.set(Storage.keys.SESSION, this.session);
        this.emit('sessionChange', updates);
    },

    // 应用主题
    applyTheme() {
        const theme = this.settings.theme;
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else if (theme === 'light') {
            document.body.classList.remove('dark-mode');
        } else if (theme === 'auto') {
            // 根据系统时间自动切换
            const hour = new Date().getHours();
            if (hour >= 18 || hour < 6) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        }
    },

    // 应用动画设置
    applyAnimationSetting() {
        if (this.settings.enableAnimation) {
            document.body.classList.remove('animations-disabled');
            document.body.classList.add('animations-enabled');
        } else {
            document.body.classList.remove('animations-enabled');
            document.body.classList.add('animations-disabled');
        }
    },

    // 应用模糊设置
    applyBlurSetting() {
        if (this.settings.enableBlur) {
            document.body.classList.remove('blur-disabled');
            document.body.classList.add('blur-enabled');
        } else {
            document.body.classList.remove('blur-enabled');
            document.body.classList.add('blur-disabled');
        }
    },

    // 应用亮度设置
    applyBrightness() {
        const brightness = this.settings.brightness || 100;
        document.body.style.filter = `brightness(${brightness}%)`;
    },

    // 应用窗口模糊设置
    applyWindowBlurSetting() {
        if (this.settings.enableWindowBlur) {
            document.body.classList.add('window-blur-enabled');
            document.body.classList.remove('window-blur-disabled');
        } else {
            document.body.classList.add('window-blur-disabled');
            document.body.classList.remove('window-blur-enabled');
        }
    },

    // 应用新版 UI 设置
    applyFluentV2Setting() {
        if (this.settings.enableFluentV2) {
            document.body.classList.add('fluent-v2');
        } else {
            document.body.classList.remove('fluent-v2');
        }
    },

    applyStrictCspSetting() {
        const enabled = this.settings.strictCspEnabled === true;
        document.body.classList.toggle('strict-csp-enabled', enabled);
        if (typeof window !== 'undefined' &&
            window.RealCSP &&
            typeof window.RealCSP.apply === 'function') {
            window.RealCSP.apply(enabled);
        }
        if (typeof window !== 'undefined' &&
            window.StrictScriptGuard &&
            typeof window.StrictScriptGuard.setEnabled === 'function') {
            window.StrictScriptGuard.setEnabled(enabled);
        }
    },

    // 添加通知
    addNotification(notification) {
        const newNotification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            time: new Date().toISOString(),
            type: 'info',
            ...notification
        };
        this.notifications.unshift(newNotification);
        
        // 最多保留50条通知
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }
        
        Storage.set(Storage.keys.NOTIFICATIONS, this.notifications);
        this.emit('notificationAdd', newNotification);
        return newNotification.id;
    },

    // 删除通知
    removeNotification(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        Storage.set(Storage.keys.NOTIFICATIONS, this.notifications);
        this.emit('notificationRemove', id);
    },

    // 清空所有通知
    clearNotifications() {
        this.notifications = [];
        Storage.set(Storage.keys.NOTIFICATIONS, []);
        this.emit('notificationsClear');
    },

    // 文件系统操作
    updateFS(newFS) {
        this.fs = newFS;
        Storage.set(Storage.keys.FS, this.fs);
        this.emit('fsChange', newFS);
    },

    // 查找文件/文件夹
    findNode(id, node = this.fs.root) {
        if (node.id === id) return node;
        if (node.children) {
            for (const child of node.children) {
                const result = this.findNode(id, child);
                if (result) return result;
            }
        }
        return null;
    },

    // 查找父节点
    findParentNode(id, node = this.fs.root, parent = null) {
        if (!node) return null;
        if (node.id === id) return parent;
        if (node.children) {
            for (const child of node.children) {
                const result = this.findParentNode(id, child, node);
                if (result) return result;
            }
        }
        return null;
    },

    // 添加应用到运行列表
    addRunningApp(appId) {
        this.runningApps.add(appId);
        this.emit('appStart', appId);
    },

    // 从运行列表移除应用
    removeRunningApp(appId) {
        this.runningApps.delete(appId);
        this.emit('appStop', appId);
    },

    // 重启系统 - 显示重启覆盖层 6s，然后进入开机界面
    restart() {
        this.updateSession({ isLoggedIn: false });
        this.windows = [];
        this.runningApps.clear();
        this.emit('powerAction', { action: 'restart' });
    },

    // 关机 - 显示关机覆盖层 5s，然后关闭网页
    shutdown() {
        this.updateSession({ isLoggedIn: false });
        this.windows = [];
        this.runningApps.clear();
        this.emit('powerAction', { action: 'shutdown' });
    },

    // 注销 - 显示注销覆盖层 3s，然后进入锁屏
    logout() {
        this.updateSession({ isLoggedIn: false });
        this.windows = [];
        this.runningApps.clear();
        this.emit('powerAction', { action: 'logout' });
    },

    // 锁屏 - 直接进入锁屏
    lock() {
        this.setView('lock');
    }
};

