/**
 * App Shop - 应用商店
 * Fluent OS 系统应用
 */

// 已安装应用的存储 key
const INSTALLED_APPS_KEY = 'fluentos.installedApps';
const UNINSTALLED_DEFAULT_APPS_KEY = 'fluentos.uninstalledDefaultApps';

const AppShop = {
    windowId: null,
    container: null,
    searchQuery: '',
    currentCategory: 'all',
    activePage: 'featured',
    _resizeObserver: null,
    _contentScrollRestoreRaf: null,
    
    // 应用数据（可从应用商店安装）
    apps: [
        // 音乐类
        { 
            id: 'netease-music', 
            name: '网易云音乐', 
            category: 'music', 
            icon: 'wangyiyun_music.png',
            developer: 'NetEase', 
            rating: 4.7, 
            downloads: '5亿+', 
            featured: true,
            banner: true,
            isPWA: true,
            url: 'https://music.163.com/',
            themeColor: '#e60026',
            desc: '网易云音乐是一款专注于发现与分享的音乐产品，依托专业音乐人、DJ、好友推荐及社交功能，为用户打造全新的音乐生活。'
        },
        { 
            id: 'qq-music', 
            name: 'QQ音乐', 
            category: 'music', 
            icon: 'qqmusic.png',
            developer: 'Tencent', 
            rating: 4.6, 
            downloads: '8亿+', 
            featured: true,
            isPWA: true,
            url: 'https://y.qq.com/',
            themeColor: '#31c27c',
            desc: 'QQ音乐是腾讯公司推出的网络音乐服务产品，拥有海量正版音乐资源，支持在线收听、下载等服务。'
        },
        // 视频类
        { 
            id: 'bilibili', 
            name: '哔哩哔哩', 
            category: 'video', 
            icon: 'bilibili.png',
            developer: 'Bilibili', 
            rating: 4.6, 
            downloads: '3亿+', 
            featured: true,
            isPWA: true,
            url: 'https://www.bilibili.com/',
            themeColor: '#fb7299',
            desc: '哔哩哔哩是中国年轻人高度聚集的文化社区和视频平台，提供动画、番剧、游戏、科技等丰富内容。'
        },
        { 
            id: 'douyu', 
            name: '斗鱼直播', 
            category: 'video', 
            icon: 'douyuzhibo.png',
            developer: 'Douyu', 
            rating: 4.3, 
            downloads: '1亿+',
            isPWA: true,
            url: 'https://www.douyu.com/',
            themeColor: '#ff5d23',
            desc: '斗鱼直播是一家弹幕式直播分享网站，提供游戏、娱乐、户外等各类直播内容。'
        },
        // 社交类
        { 
            id: 'weibo', 
            name: '微博', 
            category: 'social', 
            icon: 'WB.png',
            developer: 'Sina', 
            rating: 4.4, 
            downloads: '5亿+',
            isPWA: true,
            url: 'https://weibo.com/',
            themeColor: '#e6162d',
            desc: '微博是一个基于用户关系的社交媒体平台，用户可以发布文字、图片、视频等内容与他人互动。'
        },
        { 
            id: 'qq-mail', 
            name: 'QQ邮箱', 
            category: 'office', 
            icon: 'email.png',
            developer: 'Tencent', 
            rating: 4.5, 
            downloads: '3亿+',
            featured: true,
            isPWA: true,
            url: 'https://mail.qq.com/',
            themeColor: '#1e90ff',
            desc: 'QQ邮箱是腾讯公司推出的免费邮箱服务，提供超大附件、日历、记事本等功能。'
        },
        // 购物类
        { 
            id: 'taobao', 
            name: '淘宝', 
            category: 'shopping', 
            icon: 'taobao.png',
            developer: 'Alibaba', 
            rating: 4.5, 
            downloads: '10亿+',
            isPWA: true,
            url: 'https://www.taobao.com/',
            themeColor: '#ff5000',
            desc: '淘宝网是中国最大的网络零售平台，拥有数亿注册用户和数千万卖家，商品种类齐全。'
        },
        { 
            id: 'jd', 
            name: '京东', 
            category: 'shopping', 
            icon: 'jingdong.png',
            developer: 'JD.com', 
            rating: 4.6, 
            downloads: '5亿+',
            isPWA: true,
            url: 'https://www.jd.com/',
            themeColor: '#e2231a',
            desc: '京东是中国自营式电商企业，提供正品行货、当日达等优质服务。'
        },
        // 工具类
        { 
            id: 'baidu-netdisk', 
            name: '百度网盘', 
            category: 'tools', 
            icon: 'baidudisk.png',
            developer: 'Baidu', 
            rating: 4.2, 
            downloads: '3亿+',
            isPWA: true,
            url: 'https://pan.baidu.com/',
            themeColor: '#06a7ff',
            desc: '百度网盘是百度推出的云存储服务，提供文件存储、同步、分享等功能。'
        },
        { 
            id: 'alipay', 
            name: '支付宝', 
            category: 'tools', 
            icon: 'zhifubao.png',
            developer: 'Ant Group', 
            rating: 4.7, 
            downloads: '10亿+',
            isPWA: true,
            url: 'https://www.alipay.com/',
            themeColor: '#1677ff',
            desc: '支付宝是全球领先的独立第三方支付平台，致力于为用户提供安全快捷的电子支付服务。'
        },
        // 外卖
        { 
            id: 'meituan', 
            name: '美团', 
            category: 'lifestyle', 
            icon: 'meituan.png',
            developer: 'Meituan', 
            rating: 4.5, 
            downloads: '5亿+',
            isPWA: true,
            url: 'https://www.meituan.com/',
            themeColor: '#ffc300',
            desc: '美团是中国领先的生活服务电子商务平台，提供外卖、酒店、电影票等服务。'
        },
        { 
            id: 'ele-me', 
            name: '饿了么', 
            category: 'lifestyle', 
            icon: 'meituan.png',
            developer: 'Alibaba', 
            rating: 4.4, 
            downloads: '3亿+',
            isPWA: true,
            url: 'https://www.ele.me/',
            themeColor: '#0097ff',
            desc: '饿了么是中国专业的本地生活平台，提供外卖、商超、鲜花等即时配送服务。'
        },
        // 地图
        { 
            id: 'amap', 
            name: '高德地图', 
            category: 'tools', 
            icon: 'gaode.png',
            developer: 'Alibaba', 
            rating: 4.6, 
            downloads: '8亿+',
            isPWA: true,
            url: 'https://www.amap.com/',
            themeColor: '#0091ff',
            desc: '高德地图是中国领先的数字地图内容、导航和位置服务提供商。'
        },
        // 阅读
        { 
            id: 'coolapk', 
            name: '酷安', 
            category: 'tools', 
            icon: 'kuan.png',
            developer: 'Coolapk', 
            rating: 4.5, 
            downloads: '5000万+',
            isPWA: true,
            url: 'https://www.coolapk.com/',
            themeColor: '#11b566',
            desc: '酷安是一个以分享优质应用、游戏和数码消费体验为主的社区。'
        }
    ],

    iconRenames: {
        system_clock: 'clock.png',
        gallery: 'photos.png',
        system_music: 'media.png',
        net_ease_music: 'wangyiyun_music.png',
        douyu: 'douyuzhibo.png',
        weibo: 'WB.png',
        jd: 'jingdong.png',
        baidu_netdisk: 'baidudisk.png',
        alipay: 'zhifubao.png',
        ele_me: 'meituan.png',
        amap: 'gaode.png',
        we_com: 'wechat.png',
        coolapk: 'kuan.png'
    },

    getUninstalledDefaultApps() {
        try {
            return JSON.parse(localStorage.getItem(UNINSTALLED_DEFAULT_APPS_KEY)) || [];
        } catch {
            return [];
        }
    },

    saveUninstalledDefaultApps(appIds) {
        localStorage.setItem(UNINSTALLED_DEFAULT_APPS_KEY, JSON.stringify([...new Set(appIds || [])]));
    },

    normalizeIconPath(icon) {
        if (typeof icon !== 'string' || !icon) return icon;
        const fileName = icon.split('/').pop();
        const baseName = fileName?.replace(/\.png$/i, '');
        const renamed = this.iconRenames[baseName];
        return renamed ? `Theme/Icon/App_icon/${renamed}` : icon;
    },

    getIconPath(icon) {
        const normalized = this.normalizeIconPath(icon || 'app_gallery.png');
        return normalized.includes('/') ? normalized : `Theme/Icon/App_icon/${normalized}`;
    },

    getCatalogApps() {
        const catalog = window.FluentPWACatalog;
        if (!Array.isArray(catalog) || catalog.length === 0) return this.apps;
        return catalog.map(app => ({
            rating: 4.5,
            downloads: '10万+',
            featured: false,
            banner: false,
            isPWA: true,
            width: 1100,
            height: 760,
            ...app
        }));
    },

    refreshCatalog() {
        this.apps = this.getCatalogApps();
    },

    ensurePWARegistered(app) {
        if (typeof PWALoader === 'undefined') return false;
        if (PWALoader.isRegistered?.(app.id)) return true;
        if (PWALoader.registerFromCatalog) {
            return PWALoader.registerFromCatalog({
                ...app,
                icon: this.getIconPath(app.icon)
            });
        }
        if (PWALoader.register) {
            PWALoader.register({
                ...app,
                icon: this.getIconPath(app.icon),
                width: app.width || 1100,
                height: app.height || 760
            });
            return true;
        }
        return false;
    },

    isExternalApp(app) {
        return app?.openMode === 'external';
    },

    isNativeApp(app) {
        return app?.isNative === true || app?.appType === 'native';
    },

    getDesktopAppEntry(app) {
        const icon = this.getIconPath(app.icon);
        const entry = {
            id: app.id,
            name: app.name,
            icon,
            isPWA: !this.isNativeApp(app),
            isNative: this.isNativeApp(app) || undefined,
            url: app.url,
            openMode: app.openMode
        };
        if (app.titleKey) entry.nameKey = app.titleKey;
        return entry;
    },

    registerNativeApp(app) {
        if (!this.isNativeApp(app) || typeof WindowManager === 'undefined' || !WindowManager.appConfigs) return false;
        const existing = WindowManager.appConfigs[app.id] || {};
        WindowManager.appConfigs[app.id] = {
            ...existing,
            titleKey: app.titleKey,
            title: app.titleKey ? undefined : app.name,
            icon: this.getIconPath(app.icon),
            width: app.width || existing.width || 900,
            height: app.height || existing.height || 640,
            minWidth: app.minWidth || existing.minWidth,
            minHeight: app.minHeight || existing.minHeight,
            component: app.component || existing.component
        };
        return true;
    },

    ensureAppRegistered(app) {
        return this.isNativeApp(app) ? this.registerNativeApp(app) : this.ensurePWARegistered(app);
    },

    addDesktopApp(app) {
        if (typeof Desktop === 'undefined' || !Array.isArray(Desktop.apps)) return;
        const entry = this.getDesktopAppEntry(app);
        const existing = Desktop.apps.find(a => a.id === app.id);
        if (existing) {
            Object.assign(existing, entry);
            return;
        }
        Desktop.apps.push(entry);
    },

    removeDesktopApp(appId) {
        if (typeof Desktop === 'undefined' || !Array.isArray(Desktop.apps)) return;
        const idx = Desktop.apps.findIndex(a => a.id === appId);
        if (idx !== -1) Desktop.apps.splice(idx, 1);
    },

    createInstalledRecord(app) {
        return {
            id: app.id,
            name: app.name,
            icon: this.getIconPath(app.icon),
            url: app.url,
            openMode: app.openMode,
            appType: this.isNativeApp(app) ? 'native' : 'pwa',
            isNative: this.isNativeApp(app) || undefined,
            scriptLoaded: !this.isNativeApp(app),
            installedAt: new Date().toISOString()
        };
    },

    syncDefaultInstalledApps() {
        let installedApps = this.getInstalledApps();
        const installedIds = new Set(installedApps.map(app => app.id));
        const uninstalledDefaults = new Set(this.getUninstalledDefaultApps());
        let changed = false;

        this.apps
            .filter(app => this.isNativeApp(app) && app.defaultInstalled === true)
            .forEach(app => {
                this.registerNativeApp(app);
                if (!installedIds.has(app.id) && !uninstalledDefaults.has(app.id)) {
                    installedApps.push(this.createInstalledRecord(app));
                    installedIds.add(app.id);
                    changed = true;
                }
                if (installedIds.has(app.id) && !uninstalledDefaults.has(app.id)) {
                    this.addDesktopApp(app);
                } else if (uninstalledDefaults.has(app.id)) {
                    this.removeDesktopApp(app.id);
                }
            });

        if (changed) {
            this.saveInstalledApps(installedApps);
        }
        return installedApps;
    },
    
    getCategories() {
        return [
            { id: 'all', name: t('appshop.cat-all'), icon: 'Layout Grid' },
            { id: 'music', name: t('appshop.cat-music'), icon: 'Music' },
            { id: 'video', name: t('appshop.cat-video'), icon: 'Video' },
            { id: 'social', name: t('appshop.cat-social'), icon: 'Message Dots' },
            { id: 'shopping', name: t('appshop.cat-shopping'), icon: 'Shopping Cart' },
            { id: 'games', name: t('appshop.cat-games'), icon: 'Gameboy' },
            { id: 'office', name: t('appshop.cat-office'), icon: 'Briefcase' },
            { id: 'ai', name: t('appshop.cat-ai'), icon: 'Robot' },
            { id: 'tools', name: t('appshop.cat-tools'), icon: 'Wrench' },
            { id: 'news', name: t('appshop.cat-news'), icon: 'Book Text' },
            { id: 'travel', name: t('appshop.cat-travel'), icon: 'Map Marker' },
            { id: 'lifestyle', name: t('appshop.cat-lifestyle'), icon: 'Home' }
        ];
    },
    
    // 获取已安装的应用
    getInstalledApps() {
        try {
            const installedApps = JSON.parse(localStorage.getItem(INSTALLED_APPS_KEY)) || [];
            let changed = false;
            const normalizedApps = installedApps.map(app => {
                const normalizedIcon = this.normalizeIconPath(app.icon);
                if (normalizedIcon !== app.icon) changed = true;
                return { ...app, icon: normalizedIcon };
            });
            if (changed) {
                this.saveInstalledApps(normalizedApps);
            }
            return normalizedApps;
        } catch {
            return [];
        }
    },
    
    // 保存已安装应用
    saveInstalledApps(apps) {
        localStorage.setItem(INSTALLED_APPS_KEY, JSON.stringify(apps));
    },
    
    // 检查应用是否已安装
    isInstalled(appId) {
        return this.getInstalledApps().some(a => a.id === appId);
    },

    addStyles() {
        if (document.getElementById('appshop-v2-styles')) return;
        const style = document.createElement('style');
        style.id = 'appshop-v2-styles';
        style.textContent = `
            .window[data-app-id="appshop"] .window-content { padding: 0; overflow: hidden; }
            .appshop.appshop-v2 {
                display: grid;
                grid-template-columns: var(--system-sidebar-width, 200px) minmax(0, 1fr);
                width: 100%;
                height: 100%;
                min-height: 0;
                container-type: inline-size;
                --system-sidebar-width: clamp(68px, 24cqw, 232px);
                --system-sidebar-ease: cubic-bezier(0.16, 1, 0.3, 1);
                background: transparent !important;
                color: var(--text-primary);
                overflow: hidden;
            }
            .appshop.appshop-v2 > .fluent-sidebar.appshop-sidebar {
                width: var(--system-sidebar-width, 200px) !important;
                min-width: var(--system-sidebar-width, 200px) !important;
                flex: none !important;
                min-height: 0;
                overflow-x: hidden !important;
                transition:
                    width 430ms var(--system-sidebar-ease),
                    min-width 430ms var(--system-sidebar-ease),
                    flex-basis 430ms var(--system-sidebar-ease),
                    padding 430ms var(--system-sidebar-ease),
                    margin 430ms var(--system-sidebar-ease),
                    border-radius 430ms var(--system-sidebar-ease),
                    background 260ms var(--system-sidebar-ease) !important;
            }
            .appshop.appshop-v2.appshop-compact {
                --system-sidebar-width: 68px;
            }
            .appshop.appshop-v2:not(.appshop-compact) .appshop-nav-btn {
                justify-content: flex-start !important;
                text-align: left !important;
            }
            .appshop.appshop-v2.appshop-compact > .fluent-sidebar.appshop-sidebar {
                width: 68px !important;
                min-width: 68px !important;
                flex-basis: auto !important;
                padding: 10px 6px !important;
                margin: 8px 0 8px 8px !important;
                border-radius: 12px !important;
            }
            .appshop.appshop-v2.appshop-compact .fluent-sidebar-header {
                opacity: 0 !important;
                max-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                pointer-events: none !important;
                transform: translateX(-8px) scale(0.96) !important;
            }
            .appshop.appshop-v2.appshop-compact .fluent-sidebar-item-label {
                opacity: 0 !important;
                max-width: 0 !important;
                margin: 0 !important;
                overflow: hidden !important;
                transform: translateX(-8px) scale(0.96) !important;
                pointer-events: none !important;
            }
            .appshop.appshop-v2.appshop-compact .appshop-nav-btn {
                height: 44px !important;
                min-height: 44px !important;
                justify-content: center !important;
                align-items: center !important;
                gap: 0 !important;
                padding-left: 0 !important;
                padding-right: 0 !important;
                font-size: 0 !important;
            }
            .appshop.appshop-v2.appshop-compact .appshop-nav-btn img {
                margin: 0 !important;
                flex: 0 0 auto !important;
            }
            .appshop.appshop-v2 .fluent-sidebar-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 16px;
            }
            body.dark-mode .appshop.appshop-v2 .fluent-sidebar-header,
            body.dark-mode .appshop.appshop-v2 .fluent-sidebar-header span,
            body.dark-mode .appshop.appshop-v2 .fluent-sidebar-item,
            body.dark-mode .appshop.appshop-v2 .fluent-sidebar-item-label {
                color: #fff !important;
            }
            body.dark-mode .appshop.appshop-v2 .fluent-sidebar-item img {
                filter: brightness(0) invert(1) !important;
            }
            .appshop.appshop-v2 .fluent-sidebar-header img {
                width: 30px;
                height: 30px;
                border-radius: 8px;
            }
            .appshop.appshop-v2 .appshop-nav-btn {
                border: 0;
                appearance: none;
                font-weight: 650;
                width: 100%;
                text-align: left;
                justify-content: flex-start;
                color: var(--text-primary);
            }
            .appshop.appshop-v2 .appshop-nav-btn img {
                width: 16px;
                height: 16px;
            }
            .appshop.appshop-v2 .appshop-nav-btn .fluent-sidebar-item-label {
                flex: 0 1 auto;
                text-align: left;
            }
            .appshop-main {
                min-width: 0;
                min-height: 0;
                overflow: auto;
                padding: 24px 28px 36px;
                background: transparent !important;
                color: #fff;
                position: relative;
                z-index: 1;
            }
            body:not(.dark-mode) .appshop-main {
                background: transparent !important;
                color: #1d1d1f;
            }
            body:not(.dark-mode) .appshop-main h1,
            body:not(.dark-mode) .appshop-main h2,
            body:not(.dark-mode) .appshop-main h3,
            body:not(.dark-mode) .appshop-main h4,
            body:not(.dark-mode) .appshop-list-name,
            body:not(.dark-mode) .appshop-app-name,
            body:not(.dark-mode) .appshop-story-title,
            body:not(.dark-mode) .appshop-editorial-title {
                color: #1d1d1f !important;
            }
            body:not(.dark-mode) .appshop-page-subtitle,
            body:not(.dark-mode) .appshop-list-desc,
            body:not(.dark-mode) .appshop-list-meta,
            body:not(.dark-mode) .appshop-story-subtitle,
            body:not(.dark-mode) .appshop-story-kicker,
            body:not(.dark-mode) .appshop-editorial-kicker {
                color: rgba(29,29,31,0.62) !important;
            }
            body:not(.dark-mode) .appshop-editorial-panel {
                border-top-color: rgba(0,0,0,0.12);
            }
            body:not(.dark-mode) .appshop-list-row:hover {
                background: rgba(0,0,0,0.05);
            }
            body:not(.dark-mode) .appshop-app-card,
            body:not(.dark-mode) .appshop-category-card {
                background: rgba(255,255,255,0.78) !important;
                border-color: rgba(0,0,0,0.08) !important;
                color: #1d1d1f !important;
            }
            body:not(.dark-mode) .appshop-app-card:hover,
            body:not(.dark-mode) .appshop-category-card:hover {
                background: #fff !important;
            }
            body:not(.dark-mode) .appshop-app-developer,
            body:not(.dark-mode) .appshop-app-meta,
            body:not(.dark-mode) .appshop-empty,
            body:not(.dark-mode) .appshop-empty p {
                color: rgba(29,29,31,0.56) !important;
            }
            body:not(.dark-mode) .appshop-category-tab {
                color: #1d1d1f !important;
            }
            body:not(.dark-mode) .appshop-category-tab.active {
                color: #0078d4 !important;
                background: rgba(0,120,212,0.12) !important;
            }
            body:not(.dark-mode) .appshop-discover-chip {
                border-bottom-color: rgba(0,0,0,0.1) !important;
            }
            body.dark-mode .appshop-main,
            body.dark-mode .appshop-main h1,
            body.dark-mode .appshop-main h2,
            body.dark-mode .appshop-main h3,
            body.dark-mode .appshop-main h4,
            body.dark-mode .appshop-main p,
            body.dark-mode .appshop-main span,
            body.dark-mode .appshop-app-name,
            body.dark-mode .appshop-list-name {
                color: #fff !important;
            }
            .appshop-page-title {
                margin: 0 0 22px;
                font-size: 34px;
                line-height: 1.12;
                letter-spacing: 0;
                font-weight: 800;
            }
            .appshop-page-subtitle {
                margin: -12px 0 24px;
                color: rgba(255,255,255,0.58);
                font-size: 15px;
            }
            .appshop-today-grid {
                display: grid;
                grid-template-columns: minmax(0, 1.8fr) minmax(300px, 0.95fr);
                gap: 22px;
                margin-bottom: 34px;
            }
            .appshop-story-card {
                min-height: 360px;
                border-radius: 16px;
                overflow: hidden;
                background: linear-gradient(140deg, var(--story-a), var(--story-b));
                position: relative;
                cursor: pointer;
                box-shadow: 0 20px 50px rgba(0,0,0,0.32);
                border: 1px solid rgba(255,255,255,0.1);
            }
            body:not(.dark-mode) .appshop-story-card {
                background: linear-gradient(
                    140deg,
                    color-mix(in srgb, var(--story-a) 36%, #ffffff 64%),
                    color-mix(in srgb, var(--story-b) 32%, #f4f8ff 68%)
                ) !important;
                border-color: rgba(0,0,0,0.08) !important;
                box-shadow: 0 18px 38px rgba(20,40,70,0.16);
            }
            body.dark-mode .appshop-story-card {
                background: linear-gradient(
                    140deg,
                    color-mix(in srgb, var(--story-a) 72%, #050507 28%),
                    color-mix(in srgb, var(--story-b) 70%, #050507 30%)
                ) !important;
                border-color: rgba(255,255,255,0.1) !important;
                box-shadow: 0 20px 50px rgba(0,0,0,0.42);
            }
            .appshop-story-card.compact { min-height: 360px; }
            .appshop-story-art {
                position: absolute;
                inset: 0;
                display: grid;
                place-items: center;
                overflow: hidden;
            }
            .appshop-story-art::before,
            .appshop-story-art::after {
                content: "";
                position: absolute;
                border-radius: 50%;
                background: rgba(255,255,255,0.18);
                filter: blur(2px);
            }
            .appshop-story-art::before {
                width: 360px;
                height: 360px;
                transform: translate(24%, -12%);
            }
            .appshop-story-art::after {
                width: 220px;
                height: 220px;
                transform: translate(-48%, 26%);
                background: rgba(0,0,0,0.16);
            }
            .appshop-story-art img {
                width: min(220px, 42%);
                height: min(220px, 42%);
                object-fit: contain;
                position: relative;
                z-index: 1;
                filter: drop-shadow(0 24px 50px rgba(0,0,0,0.45));
            }
            .appshop-story-copy {
                position: absolute;
                left: 28px;
                right: 28px;
                bottom: 28px;
                z-index: 2;
            }
            .appshop-story-kicker {
                display: block;
                margin-bottom: 8px;
                color: rgba(255,255,255,0.68);
                font-size: 13px;
                font-weight: 800;
                text-transform: uppercase;
            }
            .appshop-story-title {
                margin: 0;
                font-size: clamp(24px, 2.8vw, 34px);
                line-height: 1.1;
                font-weight: 850;
                letter-spacing: 0;
            }
            .appshop-story-subtitle {
                margin: 10px 0 0;
                color: rgba(255,255,255,0.7);
                font-size: 15px;
                line-height: 1.35;
            }
            .appshop-story-card.compact .appshop-story-title {
                font-size: clamp(23px, 2.2vw, 31px);
            }
            .appshop-story-card.compact .appshop-story-subtitle {
                font-size: 14px;
            }
            .appshop-list-icon {
                width: 58px;
                height: 58px;
                border-radius: 14px;
                object-fit: cover;
            }
            .appshop-list-name {
                margin: 0;
                font-size: 16px;
                font-weight: 750;
                color: #fff;
            }
            .appshop-list-desc {
                margin: 4px 0 0;
                color: rgba(255,255,255,0.62);
                font-size: 13px;
                line-height: 1.25;
            }
            .appshop-action-btn {
                min-width: 78px;
            }
            body.dark-mode .appshop-app-install.fluent-btn,
            body.dark-mode .appshop-app-install.fluent-btn.installed,
            body.dark-mode .appshop-detail-btn.fluent-btn,
            body.dark-mode .appshop-detail-btn.fluent-btn.installed {
                color: #fff !important;
            }
            .appshop-detail-close,
            .appshop-detail-close:hover,
            .appshop-story-detail-close,
            .appshop-story-detail-close:hover {
                position: absolute !important;
                top: 14px !important;
                right: 14px !important;
                left: auto !important;
                bottom: auto !important;
                inset-inline-start: auto !important;
                inset-inline-end: 14px !important;
                transform: none !important;
                translate: none !important;
                width: 40px !important;
                height: 40px !important;
                z-index: 20 !important;
            }
            .appshop-detail-close img {
                width: 20px !important;
                height: 20px !important;
            }
            .appshop-section-title {
                margin: 0 0 18px;
                font-size: 25px;
                line-height: 1.15;
                font-weight: 850;
            }
            .appshop-editorial-grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(220px, 1fr));
                gap: 24px;
            }
            .appshop-editorial-panel {
                min-width: 0;
                border-top: 1px solid rgba(255,255,255,0.12);
                padding-top: 18px;
            }
            .appshop-editorial-kicker {
                color: rgba(255,255,255,0.48);
                font-weight: 800;
                font-size: 13px;
                text-transform: uppercase;
            }
            .appshop-editorial-title {
                margin: 6px 0 14px;
                font-size: 25px;
                line-height: 1.13;
                font-weight: 850;
            }
            .appshop-list-row {
                display: grid;
                grid-template-columns: 54px minmax(0, 1fr) auto;
                gap: 12px;
                align-items: center;
                min-height: 74px;
                border-radius: 10px;
                cursor: pointer;
            }
            .appshop-list-row:hover { background: rgba(255,255,255,0.06); }
            .appshop-list-row .appshop-list-icon { width: 54px; height: 54px; border-radius: 13px; }
            .appshop-list-meta { color: rgba(255,255,255,0.46); font-size: 11px; margin-top: 3px; }
            .appshop-category-strip,
            .appshop-discover-grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 16px 28px;
                margin-bottom: 30px;
            }
            .appshop-discover-chip,
            .appshop-category-card {
                border: 0;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                min-height: 48px;
                padding: 0;
                display: flex;
                align-items: center;
                gap: 12px;
                color: #2da8ff;
                background: transparent;
                cursor: pointer;
                font-size: 16px;
                text-align: left;
            }
            .appshop-category-card {
                min-height: 78px;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                padding: 0 16px;
                color: #fff;
                background: rgba(255,255,255,0.05);
            }
            .appshop-category-card img,
            .appshop-discover-chip img { width: 20px; height: 20px; filter: invert(58%) sepia(73%) saturate(2812%) hue-rotate(181deg) brightness(103%) contrast(101%); }
            .appshop-search-panel {
                position: sticky;
                top: -24px;
                z-index: 4;
                padding: 0 0 22px;
                background: linear-gradient(#151515 82%, rgba(21,21,21,0));
            }
            body:not(.dark-mode) .appshop-search-panel {
                background: linear-gradient(#f7f7f8 82%, rgba(247,247,248,0));
            }
            .appshop-search-large {
                height: 56px;
                border-radius: 14px;
                padding: 0 16px;
                display: grid;
                grid-template-columns: 22px minmax(0, 1fr) 22px;
                align-items: center;
                gap: 12px;
                background: rgba(255,255,255,0.92);
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .appshop-search-large img { width: 22px; height: 22px; opacity: 0.7; }
            .appshop-search-large input {
                border: 0;
                outline: 0;
                background: transparent;
                color: #222;
                font-size: 17px;
            }
            body.dark-mode .appshop-search-large {
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.12);
            }
            body.dark-mode .appshop-search-large input {
                color: #fff !important;
            }
            body.dark-mode .appshop-search-large input::placeholder {
                color: rgba(255,255,255,0.55);
            }
            body.dark-mode .appshop-search-large img {
                filter: brightness(0) invert(1);
            }
            .appshop-apps-grid.clean {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 12px;
            }
            .appshop-story-overlay {
                position: absolute;
                inset: 0;
                z-index: 40;
                display: grid;
                place-items: start center;
                padding: 34px;
                background-color: rgba(0,0,0,0.66) !important;
                opacity: 0;
                transition: opacity 180ms ease;
                overflow: auto;
            }
            .appshop-story-overlay.show { opacity: 1; }
            .appshop-story-modal {
                position: relative;
                width: min(820px, 100%);
                max-height: calc(100vh - 92px);
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 18px;
                background-color: #1d1d1f !important;
                color: #f7f7f7 !important;
                overflow: auto;
                box-shadow: 0 30px 90px rgba(0,0,0,0.58);
                isolation: isolate;
                transform: translateZ(0);
            }
            .appshop-story-detail-hero {
                height: 330px;
                position: relative;
                display: grid;
                place-items: center;
                background: linear-gradient(140deg, var(--story-a), var(--story-b)) !important;
                overflow: hidden;
            }
            .appshop-story-detail-hero img {
                width: 170px;
                height: 170px;
                object-fit: contain;
                filter: drop-shadow(0 24px 56px rgba(0,0,0,0.45));
            }
            .appshop-story-detail-copy {
                position: absolute;
                left: 24px;
                right: 24px;
                bottom: 22px;
                background: transparent !important;
            }
            .appshop-story-detail-copy h2 {
                margin: 6px 0 0;
                font-size: 34px;
                line-height: 1.05;
                color: #fff !important;
            }
            .appshop-story-detail-modal h4,
            .appshop-story-detail-appbar h4,
            .appshop-story-detail-body p,
            .appshop-story-detail-body strong {
                background: transparent !important;
            }
            .appshop-story-detail-appbar {
                min-height: 92px;
                padding: 14px 24px;
                display: grid;
                grid-template-columns: 58px minmax(0, 1fr) auto;
                gap: 14px;
                align-items: center;
                background-color: rgba(11,31,58,0.82) !important;
                border-bottom: 1px solid rgba(255,255,255,0.08);
            }
            .appshop-story-detail-body {
                padding: 26px 42px 56px;
                background-color: #1d1d1f !important;
                color: rgba(255,255,255,0.72) !important;
                font-size: 20px;
                line-height: 1.45;
            }
            .appshop-story-detail-body strong { color: #fff; }
            .appshop-story-close,
            .appshop-story-detail-close {
                position: absolute !important;
                top: 16px !important;
                right: 16px !important;
                left: auto !important;
                bottom: auto !important;
                inset-inline-start: auto !important;
                inset-inline-end: 16px !important;
                transform: none !important;
                translate: none !important;
                z-index: 50;
                width: 48px !important;
                height: 48px !important;
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 50%;
                background: rgba(30,30,32,0.54);
                display: grid;
                place-items: center;
                cursor: pointer;
                backdrop-filter: blur(16px);
            }
            .appshop-story-close img,
            .appshop-story-detail-close img { width: 24px; height: 24px; filter: invert(1); }
            .appshop-story-close:hover,
            .appshop-story-detail-close:hover {
                top: 16px !important;
                right: 16px !important;
                left: auto !important;
                bottom: auto !important;
                inset-inline-start: auto !important;
                inset-inline-end: 16px !important;
                transform: none !important;
                translate: none !important;
            }
            @container (max-width: 760px) {
                .appshop.appshop-v2 {
                    --system-sidebar-width: 68px;
                }
                .appshop.appshop-v2 > .fluent-sidebar.appshop-sidebar {
                    width: 68px !important;
                    min-width: 68px !important;
                    flex-basis: auto !important;
                    padding: 10px 6px !important;
                    margin: 8px 0 8px 8px !important;
                    border-radius: 12px !important;
                }
                .appshop.appshop-v2 .fluent-sidebar-header span,
                .appshop.appshop-v2 .fluent-sidebar-item-label {
                    opacity: 0 !important;
                    max-width: 0 !important;
                    margin: 0 !important;
                    overflow: hidden !important;
                    transform: translateX(-8px) scale(0.96) !important;
                    pointer-events: none !important;
                }
                .appshop.appshop-v2 .fluent-sidebar-header {
                    opacity: 0 !important;
                    max-height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                    pointer-events: none !important;
                    transform: translateX(-8px) scale(0.96) !important;
                }
                .appshop.appshop-v2 .appshop-nav-btn {
                    height: 44px !important;
                    min-height: 44px !important;
                    justify-content: center !important;
                    align-items: center !important;
                    gap: 0 !important;
                    padding-left: 0 !important;
                    padding-right: 0 !important;
                    font-size: 0 !important;
                }
                .appshop.appshop-v2 .appshop-nav-btn img {
                    margin: 0 !important;
                    flex: 0 0 auto !important;
                }
                .appshop-today-grid,
                .appshop-editorial-grid,
                .appshop-category-strip,
                .appshop-discover-grid { grid-template-columns: 1fr; }
                .appshop-main { padding: 20px; min-width: 0; }
            }
            @media (max-width: 760px) {
                .appshop.appshop-v2 > .fluent-sidebar.appshop-sidebar {
                    width: 68px !important;
                    min-width: 68px !important;
                    flex-basis: auto !important;
                }
            }
        `;
        document.head.appendChild(style);
    },

    getNavItems() {
        return [
            { id: 'featured', label: '精选', icon: 'Star' },
            { id: 'search', label: '搜索', icon: 'Search' },
            { id: 'all', label: '全部应用', icon: 'Layout Grid' },
            { id: 'purchased', label: '已购买', icon: 'Check Circle' }
        ];
    },

    getTodayFeatureIndex() {
        const previewIndex = Number(State?.settings?.appShopFeaturePreviewIndex);
        if (Number.isInteger(previewIndex) && previewIndex >= 1 && previewIndex <= 16) {
            return previewIndex - 1;
        }
        const start = new Date(2026, 5, 8);
        const today = new Date();
        const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return Math.abs(Math.floor((localToday - start) / 86400000)) % 16;
    },

    getFeatureTemplates() {
        return [
            { title: '今天值得打开的 App', subtitle: '从学习、创作到娱乐，这些应用让桌面更有生命力。', section: 'The Biggest Apps and Tools', hero: ['office', 'bilibili'], groups: [['essentials', '创意与效率'], ['focus', '学习进行时'], ['fresh', '放松一下']], colors: ['#08213f', '#061129', '#18816f', '#10281d'] },
            { title: '效率爆发日', subtitle: '把文档、计划、翻译和工具箱放在同一个节奏里。', section: 'Work Smarter', hero: ['shimo-office', 'todo'], groups: [['office', '文档协作'], ['tools', '效率工具'], ['ai', 'AI 助手']], colors: ['#1d2b64', '#0f1022', '#3f5efb', '#1a1f71'] },
            { title: '考试和备课专场', subtitle: '题库、组卷、驾考和知识检索，一次配齐。', section: 'Learning Picks', hero: ['zujuan', 'jiazhaoba'], groups: [['learn', '学习工具'], ['office', '备课办公'], ['news', '知识资讯']], colors: ['#093028', '#237a57', '#0f2027', '#2c5364'] },
            { title: '视频娱乐周末', subtitle: '长视频、短视频、直播和剪辑工具都在这里。', section: 'Video Weekend', hero: ['bilibili', 'video-editor'], groups: [['watch', '热门视频'], ['live', '直播现场'], ['create', '视频创作']], colors: ['#200122', '#6f0000', '#0f0c29', '#302b63'] },
            { title: '音乐和声音', subtitle: '播放、发现、收藏，让你的系统有自己的背景音乐。', section: 'Sound On', hero: ['netease-music', 'qq-music'], groups: [['music', '音乐平台'], ['media', '本地播放'], ['life', '有声内容']], colors: ['#240b36', '#c31432', '#141e30', '#243b55'] },
            { title: '本地生活灵感', subtitle: '出行、外卖、支付和地图，照顾一天的动线。', section: 'Life Nearby', hero: ['meituan', 'amap'], groups: [['city', '城市服务'], ['travel', '出行导航'], ['shopping', '购物支付']], colors: ['#42275a', '#734b6d', '#f7971e', '#ffd200'] },
            { title: 'AI 助手轮换', subtitle: '让聊天、推理、写作和资料整理更轻。', section: 'AI Companion', hero: ['chatgpt', 'deepseek'], groups: [['ai', '对话助手'], ['write', '写作办公'], ['tools', '资料处理']], colors: ['#0f2027', '#203a43', '#10a37f', '#07594d'] },
            { title: '图像和设计', subtitle: '图片编辑、设计创作和素材管理的精选组合。', section: 'Create Visuals', hero: ['photopea', 'canva'], groups: [['design', '视觉设计'], ['photos', '照片工具'], ['office', '发布与协作']], colors: ['#1f1c2c', '#928dab', '#00c4cc', '#064e55'] },
            { title: '新闻与阅读', subtitle: '了解世界，也给自己留一点安静阅读时间。', section: 'Read More', hero: ['chinadaily', 'weread'], groups: [['news', '新闻资讯'], ['books', '阅读书架'], ['culture', '人文内容']], colors: ['#141e30', '#243b55', '#8f4f24', '#2b170b'] },
            { title: '工具箱上新', subtitle: '格式转换、PDF、编译器和在线小工具集合。', section: 'Utility Kit', hero: ['metool', 'pdf-tools'], groups: [['tools', '在线工具'], ['dev', '开发学习'], ['convert', '转换处理']], colors: ['#232526', '#414345', '#0f172a', '#334155'] },
            { title: '编程学习日', subtitle: '在线编译器、科技社区和 AI 编程助手。', section: 'Code and Learn', hero: ['techie-delight', 'qwen'], groups: [['code', '代码运行'], ['ai', 'AI 辅助'], ['news', '科技资讯']], colors: ['#000428', '#004e92', '#0f172a', '#1e293b'] },
            { title: '出行和政务', subtitle: '地图、交通、支付和交管服务，适合需要办事的今天。', section: 'Move Around', hero: ['traffic-12123', 'didi'], groups: [['travel', '路线规划'], ['service', '政务生活'], ['pay', '支付购物']], colors: ['#1e3c72', '#2a5298', '#1e63b6', '#0b2d5c'] },
            { title: '购物和灵感', subtitle: '从比价到二手交易，从灵感发现到下单。', section: 'Shop Better', hero: ['taobao', 'jd'], groups: [['shopping', '综合购物'], ['life', '本地服务'], ['discover', '兴趣社区']], colors: ['#3a1c71', '#d76d77', '#ff5000', '#7f1d1d'] },
            { title: '轻松游戏时间', subtitle: '不用安装大型客户端，打开就能玩的网页游戏。', section: 'Play Now', hero: ['solitaire', 'snake-classic'], groups: [['games', '休闲游戏'], ['video', '游戏内容'], ['tools', '玩家工具']], colors: ['#134e5e', '#71b280', '#236b4f', '#064e3b'] },
            { title: '系统原生精选', subtitle: '相机、照片、多媒体，默认预装也能自由卸载。', section: 'Native Essentials', hero: ['camera', 'photos'], groups: [['native', '系统原生'], ['media', '媒体体验'], ['tools', '常用工具']], colors: ['#0f0c29', '#302b63', '#0078d4', '#0f172a'] },
            { title: '每天一点新鲜感', subtitle: '混合推荐今天最适合探索的应用。', section: 'Fresh Rotation', hero: ['kimi', 'whiteboard'], groups: [['fresh', '值得尝试'], ['focus', '工作学习'], ['relax', '娱乐放松']], colors: ['#16222a', '#3a6073', '#111827', '#374151'] }
        ];
    },

    getFeatureGroupPicks() {
        return {
            essentials: ['office', 'todo', 'translator', 'pdf-tools', 'whiteboard', 'didaqingdan'],
            focus: ['zujuan', 'jiazhaoba', 'weread', 'youdaofanyi', 'techie-delight', 'poem'],
            fresh: ['metool', 'kimi', 'coolapk', 'geekfa', 'health', 'audiobook'],
            office: ['office', 'shimo-office', 'qq-mail', 'whiteboard', 'didaqingdan', 'pdf-tools'],
            tools: ['metool', 'pdf-tools', 'translator', 'youdaofanyi', 'baidu-netdisk', 'todo'],
            ai: ['chatgpt', 'deepseek', 'qwen', 'kimi', 'youdaofanyi', 'translator'],
            learn: ['zujuan', 'jiazhaoba', 'techie-delight', 'weread', 'douban-book', 'poem'],
            news: ['chinadaily', 'pengpai', 'itzhijia', 'weibo', 'coolapk', 'geekfa'],
            watch: ['bilibili', 'youku', 'yangshipin', 'douyin', 'douyu', 'audiobook'],
            live: ['douyu', 'bilibili', 'douyin', 'yangshipin', 'youku', 'weibo'],
            create: ['video-editor', 'canva', 'photopea', 'photos', 'media', 'whiteboard'],
            music: ['netease-music', 'qq-music', 'kugou-music', 'audiobook', 'media', 'bilibili'],
            media: ['media', 'photos', 'bilibili', 'youku', 'yangshipin', 'video-editor'],
            life: ['meituan', 'ele-me', 'alipay', 'health', 'audiobook', 'douban-book'],
            city: ['meituan', 'ele-me', 'amap', 'didi', 'alipay', 'baidu-map'],
            travel: ['amap', 'baidu-map', 'didi', 'traffic-12123', 'meituan', 'alipay'],
            shopping: ['taobao', 'jd', 'xianyu', 'taobao-shangou', 'alipay', 'meituan'],
            write: ['office', 'shimo-office', 'whiteboard', 'qq-mail', 'chatgpt', 'kimi'],
            design: ['canva', 'photopea', 'photos', 'whiteboard', 'video-editor', 'media'],
            photos: ['photos', 'camera', 'photopea', 'canva', 'video-editor', 'media'],
            books: ['weread', 'douban-book', 'poem', 'audiobook', 'chinadaily', 'pengpai'],
            culture: ['poem', 'douban-book', 'weread', 'chinadaily', 'pengpai', 'weibo'],
            dev: ['techie-delight', 'geekfa', 'itzhijia', 'qwen', 'deepseek', 'metool'],
            convert: ['pdf-tools', 'metool', 'translator', 'youdaofanyi', 'video-editor', 'photopea'],
            code: ['techie-delight', 'geekfa', 'itzhijia', 'qwen', 'deepseek', 'chatgpt'],
            service: ['traffic-12123', 'jiazhaoba', 'alipay', 'meituan', 'health', 'amap'],
            pay: ['alipay', 'taobao', 'jd', 'meituan', 'ele-me', 'taobao-shangou'],
            discover: ['weibo', 'coolapk', 'douban-book', 'geekfa', 'bilibili', 'douyin'],
            games: ['solitaire', 'snake-classic', 'bilibili', 'douyin', 'coolapk', 'geekfa'],
            video: ['bilibili', 'douyin', 'youku', 'douyu', 'yangshipin', 'video-editor'],
            native: ['camera', 'photos', 'media', 'whiteboard', 'todo', 'translator'],
            relax: ['bilibili', 'douyin', 'qq-music', 'netease-music', 'solitaire', 'snake-classic']
        };
    },

    getAppById(id) {
        return this.apps.find(app => app.id === id) || null;
    },

    getRotatedApps(seed = 0, excludeIds = []) {
        const excludes = new Set(excludeIds);
        const source = this.apps.filter(app => !excludes.has(app.id));
        if (source.length === 0) return [];
        return source.map((_, index) => source[(index + seed) % source.length]);
    },

    pickApps(ids, fallbackSeed = 0, count = 1, excludeIds = []) {
        const picked = [];
        const seen = new Set(excludeIds);
        ids.forEach(id => {
            const app = this.getAppById(id);
            if (app && !seen.has(app.id) && picked.length < count) {
                picked.push(app);
                seen.add(app.id);
            }
        });
        this.getRotatedApps(fallbackSeed, [...seen]).forEach(app => {
            if (picked.length < count && !seen.has(app.id)) {
                picked.push(app);
                seen.add(app.id);
            }
        });
        return picked;
    },

    getTodayFeature() {
        const index = this.getTodayFeatureIndex();
        const template = this.getFeatureTemplates()[index];
        const groupPicks = this.getFeatureGroupPicks();
        const heroApps = this.pickApps(template.hero, index * 5, 2);
        const used = heroApps.map(app => app.id);
        const groups = template.groups.map((group, groupIndex) => {
            const apps = this.pickApps(groupPicks[group[0]] || [], index * 7 + groupIndex * 9, 4, used);
            used.push(...apps.map(app => app.id));
            return { id: group[0], title: group[1], apps };
        });
        return { ...template, index, heroApps, groups };
    },

    getAppsForCurrentCategory() {
        const apps = this.currentCategory === 'all'
            ? this.apps
            : this.apps.filter(app => app.category === this.currentCategory);
        if (!this.searchQuery) return apps;
        const q = this.searchQuery.toLowerCase();
        return apps.filter(app =>
            app.name.toLowerCase().includes(q) ||
            app.developer.toLowerCase().includes(q) ||
            String(app.category || '').toLowerCase().includes(q)
        );
    },

    getSearchResults() {
        const q = this.searchQuery.trim().toLowerCase();
        const scopedApps = this.currentCategory === 'all'
            ? this.apps
            : this.apps.filter(app => app.category === this.currentCategory);
        if (!q) return scopedApps;
        return scopedApps.filter(app =>
            app.name.toLowerCase().includes(q) ||
            app.developer.toLowerCase().includes(q) ||
            String(app.category || '').toLowerCase().includes(q) ||
            String(app.desc || '').toLowerCase().includes(q)
        );
    },

    renderShell(content) {
        const nav = this.getNavItems();
        return `
            <div class="appshop appshop-v2">
                <aside class="fluent-sidebar appshop-sidebar">
                    ${nav.map(item => `
                        <button class="fluent-sidebar-item appshop-nav-btn ${this.activePage === item.id ? 'active' : ''}" data-page="${item.id}" type="button">
                            <img src="Theme/Icon/Symbol_icon/stroke/${item.icon}.svg" class="fluent-sidebar-item-icon" alt="">
                            <span class="fluent-sidebar-item-label">${item.label}</span>
                        </button>
                    `).join('')}
                </aside>
                <main class="appshop-main">${content}</main>
            </div>
        `;
    },

    updateResponsiveState() {
        const shell = this.container?.querySelector('.appshop.appshop-v2');
        if (!shell) return;
        shell.classList.toggle('appshop-compact', shell.clientWidth <= 760);
    },

    bindResizeObserver() {
        if (!this.container || typeof ResizeObserver === 'undefined') {
            this.updateResponsiveState();
            return;
        }
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }
        this._resizeObserver = new ResizeObserver(() => this.updateResponsiveState());
        this._resizeObserver.observe(this.container);
        this.updateResponsiveState();
    },

    getActionLabel(app) {
        return (this.isInstalled(app.id) || app.isSystem === true) ? '打开' : '获取';
    },

    renderActionButton(app) {
        const installed = this.isInstalled(app.id) || app.isSystem === true;
        return `<button class="fluent-btn fluent-btn-medium appshop-app-install appshop-action-btn ${installed ? 'installed' : ''}" data-install-app-id="${app.id}" type="button">${this.getActionLabel(app)}</button>`;
    },

    renderAppListRow(app) {
        return `
            <div class="appshop-list-row" data-app-id="${app.id}">
                <img class="appshop-list-icon" src="${this.getIconPath(app.icon)}" alt="">
                <div class="appshop-list-text">
                    <div class="appshop-list-name">${app.name}</div>
                    <div class="appshop-list-desc">${app.developer}</div>
                    <div class="appshop-list-meta">${app.rating} · ${app.downloads}</div>
                </div>
                ${this.renderActionButton(app)}
            </div>
        `;
    },

    renderAppCard(app) {
        const installed = this.isInstalled(app.id) || app.isSystem === true;
        return `
            <div class="appshop-app-card ${installed ? 'installed' : ''}" data-app-id="${app.id}">
                <div class="appshop-app-icon">
                    <img src="${this.getIconPath(app.icon)}" alt="">
                </div>
                <div class="appshop-app-info">
                    <h4 class="appshop-app-name">${app.name}</h4>
                    <p class="appshop-app-developer">${app.developer}</p>
                    <div class="appshop-app-meta">
                        <span class="appshop-app-rating">
                            <img src="Theme/Icon/Symbol_icon/stroke/Star.svg" alt="">
                            ${app.rating}
                        </span>
                        <span class="appshop-app-downloads">${app.downloads}</span>
                    </div>
                </div>
                <button class="fluent-btn fluent-btn-medium appshop-app-install ${installed ? 'installed' : ''}" data-install-app-id="${app.id}" type="button">${this.getActionLabel(app)}</button>
            </div>
        `;
    },

    renderStoryCard(feature, app, storyIndex, compact = false) {
        const colors = feature.colors || ['#1d2b64', '#0f1022'];
        const a = colors[storyIndex * 2] || colors[0];
        const b = colors[storyIndex * 2 + 1] || colors[1] || colors[0];
        return `
            <article class="appshop-story-card ${compact ? 'compact' : ''}" data-story-index="${storyIndex}" style="--story-a:${a};--story-b:${b};">
                <div class="appshop-story-art">
                    <img src="${this.getIconPath(app.icon)}" alt="">
                </div>
                <div class="appshop-story-copy">
                    <span class="appshop-story-kicker">${storyIndex === 0 ? 'TODAY BEST' : 'SPECIAL FEATURE'}</span>
                    <h2 class="appshop-story-title">${storyIndex === 0 ? feature.title : app.name}</h2>
                    <p class="appshop-story-subtitle">${storyIndex === 0 ? feature.subtitle : (app.desc || app.developer)}</p>
                </div>
            </article>
        `;
    },

    renderFeaturedPage() {
        const feature = this.getTodayFeature();
        return `
            <h1 class="appshop-page-title">精选</h1>
            <p class="appshop-page-subtitle">${feature.subtitle}</p>
            <section class="appshop-today-grid">
                ${this.renderStoryCard(feature, feature.heroApps[0], 0)}
                ${this.renderStoryCard(feature, feature.heroApps[1], 1, true)}
            </section>
            <h2 class="appshop-section-title">${feature.section}</h2>
            <section class="appshop-editorial-grid">
                ${feature.groups.map(group => `
                    <div class="appshop-editorial-panel">
                        <span class="appshop-editorial-kicker">${group.id}</span>
                        <h3 class="appshop-editorial-title">${group.title}</h3>
                        ${group.apps.map(app => this.renderAppListRow(app)).join('')}
                    </div>
                `).join('')}
            </section>
        `;
    },

    renderSearchPage() {
        const displayApps = this.getSearchResults();
        const categories = this.getCategories().filter(cat => cat.id !== 'all');
        const discover = [
            { label: 'AI 助手', query: 'AI' },
            { label: 'PDF 转换', query: 'PDF' },
            { label: '视频编辑', query: '视频' },
            { label: '在线题库', query: '组卷' },
            { label: '地图出行', query: '地图' },
            { label: '音乐播放', query: '音乐' }
        ];
        const selectedCategory = this.getCategories().find(cat => cat.id === this.currentCategory);
        const shouldShowResults = this.searchQuery.trim() || this.currentCategory !== 'all';
        const resultTitle = this.searchQuery.trim()
            ? '搜索结果'
            : `${selectedCategory?.name || '应用'}分类`;
        return `
            <div class="appshop-search-panel">
                <div class="appshop-search-large">
                    <img src="Theme/Icon/Symbol_icon/stroke/Search.svg" alt="">
                    <input class="appshop-search-input" type="text" placeholder="${t('appshop.search')}" value="${this.searchQuery}">
                    <img src="Theme/Icon/Symbol_icon/stroke/Microphone.svg" alt="">
                </div>
            </div>
            ${shouldShowResults ? `
                <h2 class="appshop-section-title">${resultTitle}</h2>
                <div class="appshop-apps-grid clean">
                    ${displayApps.map(app => this.renderAppListRow(app)).join('')}
                </div>
                ${displayApps.length === 0 ? `<div class="appshop-empty"><img src="Theme/Icon/Symbol_icon/stroke/Search.svg" alt=""><p>${t('appshop.no-result')}</p></div>` : ''}
            ` : ''}
            <h1 class="appshop-page-title">Discover</h1>
            <div class="appshop-discover-grid">
                ${discover.map(item => `
                    <button class="appshop-discover-chip" type="button" data-search-term="${item.query}">
                        <img src="Theme/Icon/Symbol_icon/stroke/Search.svg" alt="">
                        <span>${item.label}</span>
                    </button>
                `).join('')}
            </div>
            <h2 class="appshop-section-title">应用分类</h2>
            <div class="appshop-category-strip">
                ${categories.map(cat => `
                    <button class="appshop-category-card" type="button" data-category="${cat.id}">
                        <img src="Theme/Icon/Symbol_icon/stroke/${cat.icon}.svg" alt="">
                        <span>${cat.name}</span>
                    </button>
                `).join('')}
            </div>
        `;
    },

    renderAllAppsPage() {
        const categories = this.getCategories();
        const displayApps = this.getAppsForCurrentCategory();
        return `
            <h1 class="appshop-page-title">全部应用</h1>
            <section class="appshop-categories">
                <div class="appshop-category-tabs">
                    ${categories.map(cat => `
                        <button class="appshop-category-tab ${this.currentCategory === cat.id ? 'active' : ''}" data-category="${cat.id}" type="button">
                            <img src="Theme/Icon/Symbol_icon/stroke/${cat.icon}.svg" alt="">
                            <span>${cat.name}</span>
                        </button>
                    `).join('')}
                </div>
            </section>
            <section class="appshop-apps">
                <div class="appshop-apps-grid clean">
                    ${displayApps.map(app => this.renderAppCard(app)).join('')}
                </div>
                ${displayApps.length === 0 ? `<div class="appshop-empty"><img src="Theme/Icon/Symbol_icon/stroke/Search.svg" alt=""><p>${t('appshop.no-result')}</p></div>` : ''}
            </section>
        `;
    },

    renderPurchasedPage() {
        const installedIds = new Set(this.getInstalledApps().map(app => app.id));
        const installedApps = this.apps.filter(app => installedIds.has(app.id));
        return `
            <h1 class="appshop-page-title">已购买</h1>
            <p class="appshop-page-subtitle">这些应用已经安装到本地，可以直接打开或在详情页卸载。</p>
            <div class="appshop-apps-grid clean">
                ${installedApps.map(app => this.renderAppListRow(app)).join('')}
            </div>
            ${installedApps.length === 0 ? `<div class="appshop-empty"><img src="Theme/Icon/Symbol_icon/stroke/Check Circle.svg" alt=""><p>还没有已安装的 App</p></div>` : ''}
        `;
    },

    init(windowId) {
        this.windowId = windowId;
        this.container = document.getElementById(`${windowId}-content`);
        this.refreshCatalog();
        this.addStyles();
        this.render();
        
        // 监听语言和主题变化
        State.on('languageChange', () => this.render());
        State.on('settingsChange', () => this.render({ preserveScroll: true }));
    },

    render(options = {}) {
        const preserveScroll = options.preserveScroll === true;
        const shouldFocusSearch = options.focusSearch === true;
        const previousScrollTop = preserveScroll
            ? (this.container?.querySelector('.appshop-main')?.scrollTop || 0)
            : 0;

        const pages = {
            featured: () => this.renderFeaturedPage(),
            search: () => this.renderSearchPage(),
            all: () => this.renderAllAppsPage(),
            purchased: () => this.renderPurchasedPage()
        };
        const pageContent = (pages[this.activePage] || pages.featured)();
        this.container.innerHTML = this.renderShell(pageContent);

        this.bindEvents();
        this.bindResizeObserver();

        if (preserveScroll && previousScrollTop > 0) {
            if (this._contentScrollRestoreRaf) {
                cancelAnimationFrame(this._contentScrollRestoreRaf);
            }
            this._contentScrollRestoreRaf = requestAnimationFrame(() => {
                const content = this.container?.querySelector('.appshop-main');
                if (!content) return;
                const maxScroll = Math.max(0, content.scrollHeight - content.clientHeight);
                content.scrollTop = Math.min(previousScrollTop, maxScroll);
                this._contentScrollRestoreRaf = null;
            });
        }
        if (shouldFocusSearch) {
            requestAnimationFrame(() => {
                const input = this.container?.querySelector('.appshop-search-input');
                if (!input) return;
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            });
        }
    },

    // 只更新应用列表（不重新渲染搜索框）
    updateAppsList() {
        this.render({ preserveScroll: true });
    },
    
    // 绑定应用卡片事件
    bindAppCardEvents() {
        this.bindEvents();
    },

    bindEvents() {
        this.container.querySelectorAll('.appshop-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activePage = btn.dataset.page || 'featured';
                if (this.activePage === 'search') {
                    this.currentCategory = 'all';
                }
                this.render();
            });
        });

        const searchInput = this.container.querySelector('.appshop-search-input');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.render({ preserveScroll: true, focusSearch: true });
                }, 120);
            });
        }

        this.container.querySelectorAll('[data-search-term]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.searchQuery = btn.dataset.searchTerm || '';
                this.currentCategory = 'all';
                this.activePage = 'search';
                this.render();
            });
        });

        this.container.querySelectorAll('.appshop-category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.currentCategory = tab.dataset.category;
                this.activePage = 'all';
                this.render({ preserveScroll: true });
            });
        });

        this.container.querySelectorAll('.appshop-category-card').forEach(card => {
            card.addEventListener('click', () => {
                this.currentCategory = card.dataset.category || 'all';
                this.searchQuery = '';
                this.activePage = 'search';
                this.render();
            });
        });

        this.container.querySelectorAll('[data-install-app-id]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.installApp(btn.dataset.installAppId);
            });
        });

        this.container.querySelectorAll('[data-story-index]').forEach(card => {
            card.addEventListener('click', () => {
                this.showFeaturedStory(Number(card.dataset.storyIndex || 0));
            });
        });

        this.container.querySelectorAll('[data-app-id]').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('[data-install-app-id]')) return;
                this.showAppDetail(row.dataset.appId);
            });
        });
    },

    installApp(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;

        // 系统应用直接打开
        if (app.isSystem) {
            WindowManager.openApp(appId);
            return;
        }

        // 如果已安装，则打开应用
        if (this.isInstalled(appId)) {
            this.openApp(app);
            return;
        }
        
        FluentUI.Toast({
            title: t('appshop.installing'),
            message: t('appshop.downloading', { name: app.name }),
            type: 'info',
            duration: 5000
        });

        if (!this.ensureAppRegistered(app)) {
            FluentUI.Toast({
                title: t('appshop.install-fail'),
                message: t('appshop.load-fail', { name: app.name }),
                type: 'error',
                duration: 4000
            });
            return;
        }

        // 5秒安装时间
        const installDelay = 5000;
        const startTime = Date.now();

        setTimeout(() => {
            const installedApps = this.getInstalledApps();
            installedApps.push(this.createInstalledRecord(app));
            this.saveInstalledApps(installedApps);

            if (app.defaultInstalled === true) {
                this.saveUninstalledDefaultApps(this.getUninstalledDefaultApps().filter(id => id !== app.id));
            }

            State.updateSettings({
                installedApps: installedApps.map(a => a.id)
            });

            this.addDesktopApp(app);

            if (typeof StartMenu !== 'undefined' && StartMenu.renderApps) {
                StartMenu.renderApps();
            }

            FluentUI.Toast({
                title: t('appshop.install-success'),
                message: t('appshop.added-to-start', { name: app.name }),
                type: 'success',
                duration: 4000
            });

            this.updateAppsList();
        }, Math.max(0, installDelay - (Date.now() - startTime)));
    },
    
    // 卸载应用（内部执行，不含弹窗）
    _doUninstall(appId) {
        const app = this.apps.find(a => a.id === appId);
        const installedApps = this.getInstalledApps().filter(a => a.id !== appId);
        this.saveInstalledApps(installedApps);

        if (app?.defaultInstalled === true) {
            this.saveUninstalledDefaultApps([...this.getUninstalledDefaultApps(), appId]);
        }

        // 同步到 State.settings.installedApps
        State.updateSettings({
            installedApps: installedApps.map(a => a.id)
        });

        // 从 Desktop.apps 移除
        this.removeDesktopApp(appId);

        // 从 PWALoader 注销
        if (!this.isNativeApp(app) && typeof PWALoader !== 'undefined') {
            PWALoader.unregister(appId);
        }

        // 如果固定在任务栏，自动取消固定
        if (typeof Taskbar !== 'undefined' && Taskbar.unpinApp) {
            const pinnedApps = State.settings.pinnedApps || [];
            if (pinnedApps.includes(appId)) {
                Taskbar.unpinApp(appId);
            }
        }

        // 刷新开始菜单
        const startPinnedApps = State.settings.startPinnedApps || [];
        if (startPinnedApps.includes(appId)) {
            State.updateSettings({ startPinnedApps: startPinnedApps.filter(id => id !== appId) });
        }

        if (typeof StartMenu !== 'undefined' && StartMenu.renderApps) {
            StartMenu.renderApps();
        }

        // 刷新应用列表
        this.updateAppsList();

        FluentUI.Toast({
            title: t('appshop.uninstall-success'),
            message: t('appshop.uninstalled', { name: app?.name || 'App' }),
            type: 'success'
        });
    },

    // 卸载应用（带确认弹窗 + 运行检测）
    uninstallApp(appId, options = {}) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;
        const appName = app.name || appId;
        const { skipConfirm = false, skipRunningCheck = false } = options;

        const doConfirmAndUninstall = () => {
            if (skipConfirm) {
                this._doUninstall(appId);
                return;
            }

            FluentUI.Dialog({
                title: t('appshop.confirm-uninstall'),
                content: t('appshop.confirm-uninstall-desc', { name: appName }),
                type: 'warning',
                buttons: [
                    { text: t('cancel'), variant: 'secondary' },
                    { text: t('appshop.uninstall'), variant: 'danger', value: 'uninstall' }
                ],
                onClose: (result) => {
                    if (result === 'uninstall') {
                        this._doUninstall(appId);
                    }
                }
            });
        };

        // 检查应用是否正在运行
        const isRunning = !skipRunningCheck &&
            typeof WindowManager !== 'undefined' &&
            WindowManager.windows.some(w => w.appId === appId);

        if (isRunning) {
            FluentUI.Dialog({
                title: t('appshop.app-running', { name: appName }),
                content: t('appshop.close-before', { name: appName }),
                type: 'warning',
                buttons: [
                    { text: t('cancel'), variant: 'secondary' },
                    { text: t('appshop.end-process'), variant: 'danger', value: 'confirm' }
                ],
                onClose: (result) => {
                    if (result === 'confirm') {
                        const wins = WindowManager.windows.filter(w => w.appId === appId);
                        wins.forEach(w => WindowManager.closeWindow(w.id));
                        setTimeout(() => doConfirmAndUninstall(), 300);
                    }
                }
            });
        }else {
            doConfirmAndUninstall();
        }
    },
    
    // 打开 PWA 应用
    openApp(app) {
        this.ensureAppRegistered(app);
        if (this.isNativeApp(app)) {
            WindowManager.openApp(app.id);
            return;
        }
        if (this.isExternalApp(app)) {
            window.open(app.url, '_blank', 'noopener,noreferrer');
            return;
        }
        // 直接打开独立的 PWA 窗口
        WindowManager.openApp(app.id);
    },

    showFeaturedStory(storyIndex = 0) {
        const feature = this.getTodayFeature();
        const app = feature.heroApps[storyIndex] || feature.heroApps[0];
        if (!app) return;
        const colors = feature.colors || ['#1d2b64', '#0f1022'];
        const a = colors[storyIndex * 2] || colors[0];
        const b = colors[storyIndex * 2 + 1] || colors[1] || colors[0];
        const title = storyIndex === 0 ? feature.title : `${app.name} 特别精选`;
        const intro = storyIndex === 0
            ? feature.subtitle
            : `${app.name} 是今天精选中最值得打开的应用之一。`;

        const overlay = document.createElement('div');
        overlay.className = 'appshop-story-overlay';
        overlay.innerHTML = `
            <article class="appshop-story-modal" style="--story-a:${a};--story-b:${b};">
                <button class="appshop-story-detail-close" type="button">
                    <img src="Theme/Icon/Symbol_icon/stroke/Cancel.svg" alt="${t('close')}">
                </button>
                <header class="appshop-story-detail-hero">
                    <img src="${this.getIconPath(app.icon)}" alt="">
                    <div class="appshop-story-detail-copy">
                        <span class="appshop-story-kicker">${storyIndex === 0 ? 'TODAY BEST' : 'SPECIAL FEATURE'}</span>
                        <h2>${title}</h2>
                    </div>
                </header>
                <div class="appshop-story-detail-appbar">
                    <img class="appshop-list-icon" src="${this.getIconPath(app.icon)}" alt="">
                    <div>
                        <h4>${app.name}</h4>
                        <p>${app.developer}</p>
                    </div>
                    ${this.renderActionButton(app)}
                </div>
                <div class="appshop-story-detail-body">
                    <p><strong>${intro}</strong></p>
                    <p>${app.desc || t('appshop.no-desc')}</p>
                    <p>这期精选把它放在主推位置，是因为它能和同页推荐的工具形成一条完整的使用路线：先发现内容，再处理任务，最后把结果带回 Fluent OS 的桌面工作流。</p>
                    <p>继续向下浏览本期精选，你会看到 3 组不同方向的应用组合，每组都能和 ${app.name} 形成互补。</p>
                </div>
            </article>
        `;
        this.container.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('show'));
        const close = () => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 180);
        };
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
        overlay.querySelector('.appshop-story-detail-close')?.addEventListener('click', close);
        overlay.querySelector('[data-install-app-id]')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.installApp(app.id);
        });
    },

    showAppDetail(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;
        
        const installed = this.isInstalled(appId);
        const isSystem = app.isSystem === true;
        const themeColor = app.themeColor || '#0078d4';
        const btnAction = (isSystem || installed) ? 'open' : 'install';
        const btnText = this.getActionLabel(app);
        const btnClass = (isSystem || installed) ? 'installed' : '';
        const isExternal = this.isExternalApp(app);

        const overlay = document.createElement('div');
        overlay.className = 'appshop-detail-overlay';
        const categories = this.getCategories();
        overlay.innerHTML = `
            <div class="appshop-detail-modal">
                <button class="appshop-detail-close">
                    <img src="Theme/Icon/Symbol_icon/stroke/Cancel.svg" alt="${t('close')}">
                </button>
                <div class="appshop-detail-header" style="--theme-color: ${themeColor}">
                    <div class="appshop-detail-gradient"></div>
                    <div class="appshop-detail-icon-wrapper">
                        <img src="Theme/Icon/App_icon/${app.icon}" alt="${app.name}" class="appshop-detail-icon">
                    </div>
                </div>
                <div class="appshop-detail-info">
                    <div class="appshop-detail-app-row">
                        <img src="Theme/Icon/App_icon/${app.icon}" alt="" class="appshop-detail-small-icon">
                        <div class="appshop-detail-app-info">
                            <h3>${app.name}</h3>
                            <span>${app.developer}</span>
                        </div>
                        <button class="fluent-btn fluent-btn-medium appshop-detail-btn ${btnClass}" data-action="${btnAction}">
                            ${btnText}
                        </button>
                    </div>
                    <div class="appshop-detail-desc">
                        <p>${app.desc || t('appshop.no-desc')}</p>
                        ${isExternal ? `<div class="appshop-detail-link-note">${t('appshop.external-desc')}</div>` : ''}
                    </div>
                    <div class="appshop-detail-meta">
                        <div class="appshop-detail-meta-item">
                            <span class="meta-value">⭐ ${app.rating}</span>
                            <span class="meta-label">${t('appshop.rating')}</span>
                        </div>
                        <div class="appshop-detail-meta-item">
                            <span class="meta-value">${app.downloads}</span>
                            <span class="meta-label">${t('appshop.downloads')}</span>
                        </div>
                        <div class="appshop-detail-meta-item">
                            <span class="meta-value">${categories.find(c => c.id === app.category)?.name || app.category}</span>
                            <span class="meta-label">${t('appshop.category')}</span>
                        </div>
                        ${isExternal ? `
                        <div class="appshop-detail-meta-item">
                            <span class="meta-value">${t('appshop.external-link')}</span>
                            <span class="meta-label">${t('appshop.open-mode')}</span>
                        </div>
                        ` : ''}
                    </div>
                    ${(!isSystem && installed) ? `
                        <button class="appshop-detail-uninstall" data-action="uninstall">${t('appshop.uninstall-app')}</button>
                    ` : ''}
                </div>
            </div>
        `;
        
        // 添加到 App Shop 窗口内部
        this.container.appendChild(overlay);
        
        // 触发动画
        requestAnimationFrame(() => {
            overlay.classList.add('show');
        });
        
        // 绑定事件
        const closeModal = () => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 300);
        };
        
        overlay.querySelector('.appshop-detail-close').addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
        
        overlay.querySelector('.appshop-detail-btn').addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action === 'install') {
                closeModal();
                this.installApp(appId);
            } else if (action === 'open') {
                closeModal();
                this.openApp(app);
            }
        });
        
        const uninstallBtn = overlay.querySelector('.appshop-detail-uninstall');
        if (uninstallBtn) {
            uninstallBtn.addEventListener('click', () => {
                closeModal();
                this.uninstallApp(appId);
            });
        }
    }
};

AppShop.refreshCatalog();
AppShop.syncDefaultInstalledApps();

// 初始化时恢复已安装的应用
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        AppShop.syncDefaultInstalledApps();
        let installedApps = AppShop.getInstalledApps();
        const catalogIds = new Set(AppShop.apps.map(app => app.id));
        const listedInstalledApps = installedApps.filter(app => catalogIds.has(app.id));
        if (listedInstalledApps.length !== installedApps.length) {
            installedApps = listedInstalledApps;
            AppShop.saveInstalledApps(installedApps);
        }
        
        // 同步到 State.settings.installedApps
        State.updateSettings({
            installedApps: installedApps.map(a => a.id)
        });
        
        let installedChanged = false;

        // 从目录恢复已安装应用
        installedApps.forEach(app => {
            const catalogApp = AppShop.apps.find(a => a.id === app.id) || app;
            AppShop.ensureAppRegistered(catalogApp);

            const iconPath = AppShop.getIconPath(catalogApp.icon || app.icon);
            if (app.name !== catalogApp.name || app.url !== catalogApp.url || app.icon !== iconPath || app.openMode !== catalogApp.openMode) {
                app.name = catalogApp.name || app.name;
                app.url = catalogApp.url || app.url;
                app.icon = iconPath;
                app.openMode = catalogApp.openMode;
                installedChanged = true;
            }

            // 添加到 Desktop.apps
            if (!Desktop.apps.find(a => a.id === app.id)) {
                AppShop.addDesktopApp(catalogApp);
            }
        });

        if (installedChanged) {
            AppShop.saveInstalledApps(installedApps);
        }
        
        // 刷新开始菜单
        if (typeof StartMenu !== 'undefined' && StartMenu.renderApps) {
            StartMenu.renderApps();
        }
    }, 100);
});

// 注册到全局
window.AppShop = AppShop;
