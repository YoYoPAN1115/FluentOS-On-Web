/**
 * LocalStorage 持久化管理
 */
const Storage = {
    keys: {
        SETTINGS: 'fluentos.settings',
        SESSION: 'fluentos.session',
        FS: 'fluentos.fs',
        DESKTOP_LAYOUT: 'fluentos.desktopLayout',
        NOTIFICATIONS: 'fluentos.notifications'
    },

    // 获取数据
    get(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Storage get error:', error);
            return defaultValue;
        }
    },

    // 保存数据
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    },

    // 删除数据
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    },

    // 清空所有数据
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    },

    // 初始化默认设置
    initDefaults() {
        // 默认设置
        if (!this.get(this.keys.SETTINGS)) {
            this.set(this.keys.SETTINGS, {
                theme: 'light',
                wallpaperDesktop: 'Theme/Picture/Fluent-2.png',
                wallpaperLock: 'Theme/Picture/Fluent-1.png',
                enableBlur: true,
                enableAnimation: true,
                autoEnterFullscreen: true,
                enableExternalFileImport: false,
                enableWindowBlur: true,  // 窗口模糊效果
                enableFluentV2: false,   // 新版实验性 UI
                pin: '1234',
                userName: 'Owner',
                userEmail: 'owner@sample.com',
                userAvatar: 'Theme/Profile_img/UserAva.png',
                language: 'zh',
                volume: 50,
                brightness: 100,
                strictCspEnabled: false,
                strictCspLastEnabled: false,
                fingoCustomMode: false,
                fingoCustomLastEnabled: false,
                fingoProvider: 'openai',
                fingoApiKey: '',
                fingoApiEncrypted: null,
                fingoApiStorageType: 'none',
                fingoApiSaveMode: 'temporary',
                windowEdgeSnapEnabled: true,
                windowHoverSnapEnabled: true,
                windowBoundsMemory: {}
            });
        }

        // 默认会话
        if (!this.get(this.keys.SESSION)) {
            this.set(this.keys.SESSION, {
                isLoggedIn: false,
                lastLogin: null,
                loginAttempts: 0
            });
        }

        // 默认文件系统
        if (!this.get(this.keys.FS)) {
            this.set(this.keys.FS, {
                root: {
                    id: 'root',
                    name: '此电脑',
                    type: 'folder',
                    children: [
                        {
                            id: 'desktop',
                            name: '桌面',
                            type: 'folder',
                            children: []
                        },
                        {
                            id: 'documents',
                            name: '文档',
                            type: 'folder',
                            children: [
                                {
                                    id: 'welcome',
                                    name: '欢迎.txt',
                                    type: 'file',
                                    content: '欢迎使用 Fluent OS！\n\n这是一个基于 Web 技术构建的仿真操作系统。\n\n功能特性：\n- 完整的开机、锁屏、登录流程\n- 文件管理系统\n- 系统设置\n- 通知中心\n- 控制中心\n\n默认 PIN：1234\n\n享受探索！',
                                    size: 256,
                                    created: new Date().toISOString(),
                                    modified: new Date().toISOString()
                                }
                            ]
                        },
                        {
                            id: 'pictures',
                            name: '图片',
                            type: 'folder',
                            children: []
                        },
                        {
                            id: 'downloads',
                            name: '下载',
                            type: 'folder',
                            children: []
                        },
                        {
                            id: 'recycle',
                            name: '回收站',
                            type: 'folder',
                            children: []
                        }
                    ]
                }
            });
        }

        // 默认桌面布局
        if (!this.get(this.keys.DESKTOP_LAYOUT)) {
            this.set(this.keys.DESKTOP_LAYOUT, {
                icons: [
                    { id: 'files', x: 0, y: 0 },
                    { id: 'settings', x: 0, y: 1 },
                    { id: 'calculator', x: 0, y: 2 },
                    { id: 'notes', x: 0, y: 3 },
                    { id: 'appshop', x: 0, y: 4 }
                ]
            });
        }

        // 默认通知
        if (!this.get(this.keys.NOTIFICATIONS)) {
            this.set(this.keys.NOTIFICATIONS, [
                {
                    id: 'welcome',
                    title: '欢迎',
                    message: '欢迎使用 Fluent OS！',
                    type: 'info',
                    time: new Date().toISOString()
                }
            ]);
        }
    }
};
