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
    isSearchActive: false,
    _resizeObserver: null,
    _contentScrollRestoreRaf: null,
    _iconColorCache: new Map(),
    _iconColorPending: new Map(),
    
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
                font-weight: 400 !important;
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
                font-weight: 400 !important;
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
            .appshop-category-tabs {
                display: flex;
                align-items: center;
                gap: 10px;
                overflow-x: auto;
                padding-bottom: 10px;
            }
            .appshop-category-tab {
                width: 44px !important;
                min-width: 44px !important;
                height: 40px !important;
                padding: 0 !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 0 !important;
                overflow: hidden !important;
                border-radius: 999px !important;
                transition:
                    width 180ms ease,
                    min-width 180ms ease,
                    padding 180ms ease,
                    background 160ms ease,
                    border-color 160ms ease,
                    color 160ms ease !important;
            }
            .appshop-category-tab img {
                width: 16px !important;
                height: 16px !important;
                flex: 0 0 16px;
            }
            .appshop-category-tab span {
                max-width: 0;
                opacity: 0;
                overflow: hidden;
                white-space: nowrap;
                transform: translateX(-4px);
                transition: max-width 180ms ease, opacity 160ms ease, transform 180ms ease;
            }
            .appshop-category-tab:hover,
            .appshop-category-tab:focus-visible {
                width: 106px !important;
                min-width: 106px !important;
                padding: 0 14px !important;
                gap: 8px !important;
            }
            .appshop-category-tab:hover span,
            .appshop-category-tab:focus-visible span {
                max-width: 58px;
                opacity: 1;
                transform: translateX(0);
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
            .appshop-story-shapes,
            .appshop-story-art {
                position: absolute;
                inset: 0;
                overflow: hidden;
            }
            .appshop-story-shapes {
                z-index: 1;
                pointer-events: none;
            }
            .appshop-story-shape {
                position: absolute;
                width: var(--shape-size, 72px);
                height: var(--shape-size, 72px);
                left: var(--shape-left, 50%);
                top: var(--shape-top, 50%);
                opacity: var(--shape-opacity, 0.24);
                background: color-mix(in srgb, var(--story-b) 42%, #ffffff 58%);
                animation: appshop-story-float var(--shape-duration, 18s) ease-in-out infinite alternate;
                animation-delay: var(--shape-delay, 0s);
                transform: translate3d(0,0,0) rotate(var(--shape-rotate, 0deg));
            }
            .appshop-story-shape.circle { border-radius: 50%; }
            .appshop-story-shape.square { border-radius: 12px; }
            .appshop-story-shape.triangle {
                width: 0;
                height: 0;
                border-left: calc(var(--shape-size, 72px) * 0.55) solid transparent;
                border-right: calc(var(--shape-size, 72px) * 0.55) solid transparent;
                border-bottom: var(--shape-size, 72px) solid color-mix(in srgb, var(--story-a) 36%, #ffffff 64%);
                background: transparent;
            }
            @keyframes appshop-story-float {
                from { translate: -8px 6px; rotate: -2deg; }
                to { translate: 10px -8px; rotate: 4deg; }
            }
            @media (prefers-reduced-motion: reduce) {
                .appshop-story-shape { animation: none; }
            }
            .appshop-story-art {
                display: grid;
                place-items: center;
                z-index: 2;
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
                z-index: 3;
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
                display: -webkit-box;
                -webkit-line-clamp: 1;
                -webkit-box-orient: vertical;
                overflow: hidden;
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
            .appshop-detail-close:hover {
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
                gap: 18px;
                align-items: center;
                min-height: 82px;
                border-radius: 10px;
                cursor: pointer;
                padding: 6px 8px;
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
                padding: 0 0 10px;
                background: transparent;
            }
            body:not(.dark-mode) .appshop-search-panel {
                background: transparent;
            }
            .appshop-search-large {
                height: 56px;
                border-radius: 14px;
                padding: 0 16px;
                display: grid;
                grid-template-columns: 22px minmax(0, 1fr) 22px;
                align-items: center;
                gap: 12px;
                background: rgba(255,255,255,0.74);
                border: 1px solid rgba(255,255,255,0.72);
                backdrop-filter: blur(22px) saturate(1.25);
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
                background: rgba(0,0,0,0.42);
                border: 1px solid rgba(255,255,255,0.14);
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
                gap: 20px 30px;
            }
            .appshop-search-page {
                min-height: 100%;
            }
            .appshop-search-results {
                margin: 6px 0 28px;
            }
            .appshop-search-browse {
                transition: opacity 220ms ease, transform 220ms ease, max-height 260ms ease;
                opacity: 1;
                transform: translateY(0);
                max-height: 720px;
                overflow: hidden;
                padding-top: 24px;
            }
            .appshop-search-browse.hidden {
                opacity: 0;
                transform: translateY(-8px);
                max-height: 0;
                pointer-events: none;
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
            body:not(.dark-mode) .appshop-story-overlay {
                background-color: rgba(30,30,32,0.48) !important;
            }
            body:not(.dark-mode) .appshop-story-modal {
                background-color: #f8f8f9 !important;
                color: #1d1d1f !important;
                border-color: rgba(0,0,0,0.08) !important;
                box-shadow: 0 30px 90px rgba(20,30,45,0.28);
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
                position: relative;
                z-index: 2;
            }
            .appshop-story-detail-copy {
                position: absolute;
                left: 24px;
                right: 24px;
                bottom: 22px;
                background: transparent !important;
                z-index: 3;
            }
            .appshop-story-detail-copy h2 {
                margin: 6px 0 0;
                font-size: 34px;
                line-height: 1.05;
                color: #fff !important;
            }
            .appshop-story-detail-hero .appshop-story-kicker {
                color: rgba(255,255,255,0.72) !important;
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
            body:not(.dark-mode) .appshop-story-detail-appbar {
                background-color: rgba(255,255,255,0.88) !important;
                border-bottom-color: rgba(0,0,0,0.08);
            }
            body:not(.dark-mode) .appshop-story-detail-appbar h4 {
                color: #1d1d1f !important;
            }
            body:not(.dark-mode) .appshop-story-detail-appbar p {
                color: rgba(29,29,31,0.62) !important;
            }
            .appshop-story-detail-body {
                padding: 26px 42px 56px;
                background-color: #1d1d1f !important;
                color: #fff !important;
                font-size: 20px;
                line-height: 1.45;
            }
            body:not(.dark-mode) .appshop-story-detail-body {
                background-color: #f8f8f9 !important;
                color: #1d1d1f !important;
            }
            .appshop-story-detail-body p {
                margin: 0;
                color: #fff !important;
            }
            body:not(.dark-mode) .appshop-story-detail-body p {
                color: #1d1d1f !important;
            }
            .appshop-story-detail-body strong {
                color: #fff;
                font-weight: 760;
            }
            body:not(.dark-mode) .appshop-story-detail-body strong {
                color: #1d1d1f !important;
            }
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
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 50%;
                background: rgba(30,30,32,0.54);
                display: grid;
                place-items: center;
                cursor: pointer;
                backdrop-filter: blur(16px);
                transition: background 160ms ease, border-color 160ms ease !important;
            }
            .appshop-story-close img,
            .appshop-story-detail-close img { width: 24px; height: 24px; filter: invert(1); }
            body:not(.dark-mode) .appshop-story-detail-close {
                background: rgba(255,255,255,0.62);
                border-color: rgba(0,0,0,0.12);
            }
            body:not(.dark-mode) .appshop-story-detail-close img {
                filter: none;
            }
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
                background: rgba(30,30,32,0.72);
                border-color: rgba(255,255,255,0.28);
            }
            body:not(.dark-mode) .appshop-story-detail-close:hover {
                background: rgba(255,255,255,0.88);
                border-color: rgba(0,0,0,0.2);
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
            { id: 'featured', label: t('appshop.nav-featured'), icon: 'Star' },
            { id: 'search', label: t('appshop.nav-search'), icon: 'Search' },
            { id: 'all', label: t('appshop.nav-all'), icon: 'Layout Grid' },
            { id: 'purchased', label: t('appshop.nav-purchased'), icon: 'Check Circle' }
        ];
    },

    getCurrentLanguage() {
        return typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'en' : 'zh';
    },

    getFeatureStoryIntros() {
        return [
            [
                {
                    zh: 'Office 是今天这组推荐的起点：它适合把灵感、资料和待办快速整理成可交付的文档。无论你是在写课程报告、整理会议纪要，还是准备一份给朋友看的计划，它都能和后面的学习、视频、工具类 App 串起来，让桌面从打开应用开始就进入工作状态。',
                    en: 'Office leads today\'s set because it turns notes, sources, and plans into documents quickly. It pairs naturally with the learning, video, and utility apps below, so the desktop can move from an idea to something ready to share.'
                },
                {
                    zh: '哔哩哔哩负责给这期精选加入灵感和休息时间。它不只是娱乐平台，也能找到教程、科技内容、创作经验和许多轻松的兴趣频道。把它放在 Office 旁边，是希望你在完成任务之后，也能顺手打开一个窗口，用内容给下一段学习或创作补一点能量。',
                    en: 'Bilibili adds inspiration and breathing room to this collection. Beyond entertainment, it carries tutorials, technology stories, creator tips, and light channels that help you recharge before the next task.'
                }
            ],
            [
                {
                    zh: '石墨文档适合多人协作的效率日。它把文档、表格和轻量资料整理放在浏览器里完成，适合课堂小组、工作汇报和临时项目。放在主推位，是因为它能减少来回传文件的时间，让编辑、评论、同步更新这些动作都集中在同一个工作空间。',
                    en: 'Shimo Office is built for collaborative workdays. Documents, sheets, comments, and updates stay in one browser workspace, reducing file handoffs and keeping group work moving.'
                },
                {
                    zh: '待办清单是效率爆发日里的节拍器。它不抢走注意力，只帮你把今天要完成的事拆成清楚的下一步。和文档、翻译、AI 工具放在一起时，它能让资料收集、写作和交付形成闭环，避免打开很多 App 后忘记真正要做的事。',
                    en: 'Todo keeps the rhythm of a productive day. It breaks work into clear next steps and ties documents, translation, and AI tools into a simple loop of collect, write, and finish.'
                }
            ],
            [
                {
                    zh: '组卷网面向备课和复习场景，适合需要快速组织题目、查找知识点和搭建练习材料的用户。它在这期里承担“把知识变成训练”的角色：先确定范围，再组合题目，最后配合文档或阅读工具沉淀成一份可重复使用的学习资料。',
                    en: 'Zujuan is for lesson prep and focused review. It helps turn knowledge areas into practice material, then pairs with document and reading tools to make reusable study resources.'
                },
                {
                    zh: '驾照宝典是更具体、更生活化的学习工具。它把考试准备拆成题库、练习和模拟，让碎片时间也能推进进度。放在考试和备课专场中，是因为它代表了 Fluent OS 里的另一种学习方式：目标明确、反馈直接、打开就能继续。',
                    en: 'Jiazhaoba brings a practical kind of studying: question banks, drills, and mock exams that fit into short sessions. It is goal-oriented and easy to resume.'
                }
            ],
            [
                {
                    zh: '哔哩哔哩在视频娱乐周末里负责“看见更多”。长视频、短内容、直播切片和创作教程都能在这里交汇，既能放松，也能找到下一次剪辑或表达的灵感。它适合放在周末第一屏，因为打开后很容易按兴趣继续探索。',
                    en: 'Bilibili anchors video weekend with long-form shows, short clips, live highlights, and creator lessons. It is relaxed, but it can also spark the next edit or idea.'
                },
                {
                    zh: '视频编辑器让这期不只停留在观看。它适合把素材剪成片段、整理节奏、做出可以分享的小作品。和视频平台、直播内容放在一起，形成从观看到创作的路径：看到灵感，收集素材，再用工具把它变成自己的表达。',
                    en: 'Video Editor turns watching into making. It helps trim clips, shape rhythm, and prepare small pieces worth sharing after inspiration comes from the video apps around it.'
                }
            ],
            [
                {
                    zh: '网易云音乐适合给系统铺一层情绪背景。它的歌单、评论和发现机制很适合陪伴写作、整理文件或夜间放松。放在这期第一张卡，是因为音乐能快速改变桌面的节奏，让 Fluent OS 不只是工具集合，也像一个可以进入状态的空间。',
                    en: 'NetEase Cloud Music gives the desktop a mood. Playlists, comments, and discovery make it useful for writing, sorting files, or winding down.'
                },
                {
                    zh: 'QQ 音乐更像一座稳定的大曲库，适合想快速找到熟悉歌曲、热门专辑或常听歌单的用户。它与网易云音乐形成互补：一个偏发现和氛围，一个偏完整和顺手。两者一起，让声音成为今天桌面体验的一部分。',
                    en: 'QQ Music is the dependable large library in this set. It complements NetEase Cloud Music with familiar tracks, albums, and quick access to everyday playlists.'
                }
            ],
            [
                {
                    zh: '美团把附近的餐饮、电影、酒店和生活服务压缩进一个入口，适合安排一天里的现实行动。它在这期里承担“离开桌面也能继续”的角色：先在系统里查找和计划，再把选择落到城市里的具体地点和服务。',
                    en: 'Meituan connects the desktop to nearby food, movies, hotels, and city services. It helps turn a plan made on screen into something to do nearby.'
                },
                {
                    zh: '高德地图负责这期的方向感。无论是通勤、约会、办事还是临时找店，它都能把路线、时间和位置整理清楚。和美团、支付、购物工具放在一起时，它让本地生活不只是“找服务”，也包括怎样更顺地到达那里。',
                    en: 'Amap adds direction to local life. Routes, timing, and places become clearer, especially when paired with food, payment, and shopping apps.'
                }
            ],
            [
                {
                    zh: 'ChatGPT 是 AI 助手轮换中的通用入口，适合头脑风暴、总结资料、写作润色和代码问题。它的价值不在于替你完成所有事，而在于把模糊想法变成可继续推进的步骤。放在首位，是因为它能连接本期几乎所有工作流。',
                    en: 'ChatGPT is the general entry point for brainstorming, summarizing, writing, and coding questions. It turns vague ideas into next steps and connects many workflows in this set.'
                },
                {
                    zh: 'DeepSeek 更偏向推理、分析和中文语境下的长问题处理。它适合拆解复杂需求、对比方案、整理资料脉络，也适合在写作前先把结构想清楚。与 ChatGPT 并列推荐，是为了给 AI 使用保留不同风格的选择。',
                    en: 'DeepSeek is strong for reasoning, analysis, and long Chinese-context tasks. It is useful for breaking down requirements and comparing options before writing or building.'
                }
            ],
            [
                {
                    zh: 'Photopea 是视觉创作里最像专业工具的一环。它适合处理 PSD、修图、做封面和快速改素材，不需要离开浏览器就能完成很多设计动作。把它放在这期，是为了让图片编辑从“临时找工具”变成桌面里的稳定能力。',
                    en: 'Photopea brings a professional editing feel to the browser. PSD files, image fixes, covers, and quick asset changes can happen without leaving the desktop.'
                },
                {
                    zh: 'Canva 更适合从模板和排版开始，把想法快速做成海报、简报、社交图或视觉资料。它和 Photopea 的关系很自然：一个偏精细编辑，一个偏快速成稿。两者并排时，创作可以从修图一路走到发布。',
                    en: 'Canva starts from templates and layout, helping ideas become posters, slides, social graphics, or visual notes quickly. It pairs well with Photopea for a full create-to-publish flow.'
                }
            ],
            [
                {
                    zh: '中国日报适合用来获得更正式、更国际化的新闻视角。它在阅读专场里承担信息入口的角色，适合早晨浏览重点新闻、练习英文阅读，或者为写作收集背景材料。和书籍、社区内容搭配后，信息会更有层次。',
                    en: 'China Daily offers a formal, international news angle. It is useful for morning headlines, English reading practice, and background material for writing.'
                },
                {
                    zh: '微信读书给这期增加安静的长阅读空间。它适合在碎片时间继续一本书，也适合把想法、划线和笔记慢慢积累起来。和新闻 App 放在一起，是希望你既能快速了解外部变化，也能留出沉下来的阅读节奏。',
                    en: 'Weread adds a quieter long-reading space. It helps continue books in short sessions and collect highlights or notes over time.'
                }
            ],
            [
                {
                    zh: 'MeTool 像一个随手打开的小工具抽屉，适合处理编码、格式、转换和各种临时需求。它在工具箱专场中负责快速解决小问题：不用安装复杂软件，也不用到处搜索网页，打开后直接找到对应能力就能继续工作。',
                    en: 'MeTool is a small drawer of quick utilities for encoding, formatting, conversion, and temporary chores. It keeps small problems from interrupting work.'
                },
                {
                    zh: 'PDF 工具适合处理办公里最常见也最容易卡住的文件格式。合并、拆分、转换、压缩这些动作一旦顺手，很多交付流程都会轻松不少。放在这期主推位，是因为它能补上文档工作最后一公里。',
                    en: 'PDF Tools handles the common file tasks that often slow office work: merge, split, convert, and compress. It helps finish the last mile of document delivery.'
                }
            ],
            [
                {
                    zh: 'Techie Delight 适合把编程学习变成可查询、可运行、可复盘的过程。它提供算法、数据结构和示例内容，适合在遇到概念卡点时快速补一段知识。和 AI 编程助手搭配时，它能提供更可靠的基础材料。',
                    en: 'Techie Delight supports programming study with algorithms, data structures, and examples. It is a helpful reference when concepts need a clear refresh.'
                },
                {
                    zh: '通义千问在编程学习日里适合做解释、改写和辅助推理。你可以把问题、代码片段或学习目标交给它，让它帮你拆成更容易理解的步骤。它不是替代练习，而是让练习过程少一点卡顿。',
                    en: 'Qwen helps explain, rewrite, and reason through programming study. It can break a code question or learning goal into steps without replacing practice.'
                }
            ],
            [
                {
                    zh: '交管 12123 面向办事场景，适合处理车辆、驾驶证和交通相关服务。它在出行和政务专场里代表“必须准确完成”的任务：少一些花哨，多一些清楚入口。放在主推位，是为了让日常事务也能在桌面中被快速找到。',
                    en: 'Traffic 12123 is for practical vehicle, license, and traffic services. It represents tasks that need clear entry points and accurate completion.'
                },
                {
                    zh: '滴滴适合解决城市移动里的临时决定。无论是去办事、赶时间还是从一个地点切到另一个地点，它都能补上公共交通之外的选择。和地图、政务、支付 App 组合后，这期推荐从路线规划延伸到真正出发。',
                    en: 'Didi covers the flexible side of city movement, from urgent trips to point-to-point travel. It extends route planning into actually getting there.'
                }
            ],
            [
                {
                    zh: '淘宝适合从明确购买到随意逛逛的多种购物场景。它在这期里提供丰富商品和灵感入口，可以查价格、找替代、收藏想法，也可以快速完成日常采购。和京东并列时，一个偏广度和发现，一个偏效率和稳定。',
                    en: 'Taobao covers both targeted shopping and casual discovery. It is useful for price checks, alternatives, collections, and everyday purchases.'
                },
                {
                    zh: '京东更强调确定性：正品、自营、物流和售后让它适合购买数码、家电和急需用品。放在购物专场的第二张精选卡，是为了和淘宝形成清晰互补，让用户可以根据“想探索”或“要稳妥”快速选择。',
                    en: 'JD emphasizes certainty: reliable goods, logistics, and support. It complements Taobao when the goal is less browsing and more confident purchasing.'
                }
            ],
            [
                {
                    zh: '纸牌游戏适合在轻松游戏时间里做一个低压力入口。它不需要复杂规则，也不要求长时间投入，打开后就能开始一局。放在主推位，是因为它能给桌面留一点放松空间，让短暂休息也有明确边界。',
                    en: 'Solitaire is a low-pressure way to take a short break. It starts quickly, needs no heavy setup, and gives downtime a clear boundary.'
                },
                {
                    zh: '经典贪吃蛇带来更直接的反应和节奏感。它简单、熟悉、容易重开，适合在工作或学习间隙换一下脑子。和纸牌一起推荐，是为了让轻量游戏既有安静思考，也有一点快速操作的乐趣。',
                    en: 'Classic Snake adds quick reaction and rhythm. It is familiar, easy to restart, and works well as a brief reset between tasks.'
                }
            ],
            [
                {
                    zh: '相机是系统原生精选里最直接的创作入口。它适合快速预览摄像头、拍照、保存素材，也适合测试设备状态。作为默认预装 App，它展示了 Fluent OS 原生体验的一面：功能明确、打开迅速、需要时就在那里。',
                    en: 'Camera is the direct native capture tool: preview the webcam, take photos, save material, or test device state quickly.'
                },
                {
                    zh: '照片应用负责把本地图片和每日壁纸整理成可浏览、可编辑的空间。它适合查看素材、做轻量调整，也适合把系统视觉内容重新带回桌面。和相机放在一起，形成从拍摄到浏览再到编辑的原生闭环。',
                    en: 'Photos organizes local images and daily wallpapers into a browse-and-edit space. Together with Camera, it forms a native capture-to-review loop.'
                }
            ],
            [
                {
                    zh: 'Kimi 适合处理长文本、资料阅读和写作前的材料整理。它在新鲜感轮换中承担“把复杂内容读薄”的角色：把一大段信息拆成摘要、提纲和下一步。适合今天想试试新工具，又希望它马上派上用场的用户。',
                    en: 'Kimi is useful for long text, reading material, and pre-writing organization. It helps turn large information blocks into summaries, outlines, and next steps.'
                },
                {
                    zh: '白板应用给这期带来更自由的空间。它适合画流程、列想法、做临时结构，也适合把 AI 或阅读产生的内容重新摆成视觉关系。放在每天一点新鲜感里，是因为它能让桌面从线性任务变成开放思考。',
                    en: 'Whiteboard adds open space for flows, ideas, and rough structures. It helps turn AI or reading output into visible relationships.'
                }
            ]
        ];
    },

    getFallbackStoryColors(feature, app, storyIndex) {
        const colors = feature.colors || ['#1d2b64', '#0f1022'];
        const primary = app?.themeColor || colors[storyIndex * 2] || colors[0] || '#0078d4';
        const secondary = colors[storyIndex * 2 + 1] || colors[1] || this.shiftHexColor(primary, -22);
        return { primary, secondary };
    },

    getStoryColors(feature, app, storyIndex) {
        const cached = this._iconColorCache.get(app.id);
        if (cached) return cached;
        const fallback = this.getFallbackStoryColors(feature, app, storyIndex);
        this.ensureIconColors(app, fallback);
        return fallback;
    },

    ensureIconColors(app, fallback) {
        if (!app?.id || this._iconColorCache.has(app.id) || this._iconColorPending.has(app.id)) return;
        const iconPath = this.getIconPath(app.icon);
        const pending = this.extractIconColors(iconPath, fallback)
            .then(colors => {
                this._iconColorCache.set(app.id, colors);
                this.applyStoryColors(app.id, colors);
            })
            .catch(() => {
                this._iconColorCache.set(app.id, fallback);
                this.applyStoryColors(app.id, fallback);
            })
            .finally(() => this._iconColorPending.delete(app.id));
        this._iconColorPending.set(app.id, pending);
    },

    extractIconColors(iconPath, fallback) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const size = 64;
                    const canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    if (!ctx) {
                        resolve(fallback);
                        return;
                    }
                    ctx.clearRect(0, 0, size, size);
                    ctx.drawImage(img, 0, 0, size, size);
                    const { data } = ctx.getImageData(0, 0, size, size);
                    const buckets = new Map();
                    for (let i = 0; i < data.length; i += 16) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        const a = data[i + 3];
                        if (a < 96) continue;
                        const max = Math.max(r, g, b);
                        const min = Math.min(r, g, b);
                        const brightness = (r + g + b) / 3;
                        const saturation = max === 0 ? 0 : (max - min) / max;
                        if ((brightness > 235 && saturation < 0.22) || brightness < 22) continue;
                        const qr = Math.round(r / 24) * 24;
                        const qg = Math.round(g / 24) * 24;
                        const qb = Math.round(b / 24) * 24;
                        const key = `${qr},${qg},${qb}`;
                        const current = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0, score: 0 };
                        current.r += r;
                        current.g += g;
                        current.b += b;
                        current.count += 1;
                        current.score += 0.55 + saturation + Math.min(0.35, Math.abs(brightness - 128) / 260);
                        buckets.set(key, current);
                    }
                    const colors = [...buckets.values()]
                        .filter(bucket => bucket.count > 1)
                        .map(bucket => {
                            const r = Math.round(bucket.r / bucket.count);
                            const g = Math.round(bucket.g / bucket.count);
                            const b = Math.round(bucket.b / bucket.count);
                            return { r, g, b, score: bucket.score, hex: this.rgbToHex(r, g, b) };
                        })
                        .sort((a, b) => b.score - a.score);
                    if (colors.length === 0) {
                        resolve(fallback);
                        return;
                    }
                    const primary = colors[0].hex;
                    const secondaryMatch = colors.find(color => this.colorDistance(colors[0], color) > 72);
                    const secondary = secondaryMatch?.hex || this.shiftHexColor(primary, -28);
                    resolve({ primary, secondary });
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = reject;
            img.src = iconPath;
        });
    },

    applyStoryColors(appId, colors) {
        const targets = this.container?.querySelectorAll(`[data-story-app-id="${appId}"]`);
        targets?.forEach(target => {
            target.style.setProperty('--story-a', colors.primary);
            target.style.setProperty('--story-b', colors.secondary);
        });
    },

    colorDistance(a, b) {
        return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
    },

    rgbToHex(r, g, b) {
        return `#${[r, g, b].map(value => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')).join('')}`;
    },

    shiftHexColor(hex, lightnessShift = 0) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex || '#0078d4';
        const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
        hsl.l = Math.max(16, Math.min(78, hsl.l + lightnessShift));
        hsl.s = Math.max(34, Math.min(92, hsl.s + 8));
        const shifted = this.hslToRgb(hsl.h, hsl.s, hsl.l);
        return this.rgbToHex(shifted.r, shifted.g, shifted.b);
    },

    hexToRgb(hex) {
        const match = String(hex || '').match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        if (!match) return null;
        return {
            r: parseInt(match[1], 16),
            g: parseInt(match[2], 16),
            b: parseInt(match[3], 16)
        };
    },

    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    },

    hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        if (s === 0) {
            const value = Math.round(l * 255);
            return { r: value, g: value, b: value };
        }
        const hueToRgb = (p, q, tValue) => {
            let t = tValue;
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        return {
            r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
            g: Math.round(hueToRgb(p, q, h) * 255),
            b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255)
        };
    },

    getStoryIntro(feature, app, storyIndex) {
        const lang = this.getCurrentLanguage();
        return feature.storyIntros?.[storyIndex]?.[lang]
            || feature.storyIntros?.[storyIndex]?.zh
            || app?.desc
            || feature.subtitle
            || '';
    },

    getStoryDetailIntro(feature, app, storyIndex) {
        const intro = this.getStoryIntro(feature, app, storyIndex);
        const lang = this.getCurrentLanguage();
        const title = storyIndex === 0 ? feature.title : app.name;
        const section = feature.section || title;
        if (lang === 'en') {
            return `${intro} ${t('appshop.story-detail-extra-en', { name: app.name, title, section })}`;
        }
        return `${intro}${t('appshop.story-detail-extra', { name: app.name, title, section })}`;
    },

    getStoryExcerpt(text, maxLength = 82) {
        if (!text || text.length <= maxLength) return text || '';
        return `${text.slice(0, maxLength).trim()}...`;
    },

    renderStoryShapes(storyIndex = 0) {
        const seeds = storyIndex === 0
            ? [
                ['circle', 132, '68%', '10%', 0.22, '22s', '-3s', '10deg'],
                ['triangle', 76, '12%', '20%', 0.2, '18s', '-8s', '-8deg'],
                ['square', 88, '78%', '70%', 0.18, '24s', '-12s', '18deg'],
                ['circle', 54, '28%', '76%', 0.16, '20s', '-5s', '0deg']
            ]
            : [
                ['square', 112, '12%', '14%', 0.2, '23s', '-7s', '-12deg'],
                ['circle', 82, '72%', '18%', 0.18, '19s', '-4s', '0deg'],
                ['triangle', 70, '76%', '68%', 0.19, '25s', '-11s', '22deg'],
                ['circle', 48, '24%', '74%', 0.14, '21s', '-2s', '0deg']
            ];
        return `<div class="appshop-story-shapes" aria-hidden="true">${seeds.map(shape => `
            <span class="appshop-story-shape ${shape[0]}" style="--shape-size:${shape[1]}px;--shape-left:${shape[2]};--shape-top:${shape[3]};--shape-opacity:${shape[4]};--shape-duration:${shape[5]};--shape-delay:${shape[6]};--shape-rotate:${shape[7]};"></span>
        `).join('')}</div>`;
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
        if (this.getCurrentLanguage() === 'en') {
            return [
                { title: 'Apps Worth Opening Today', subtitle: 'From study and creation to entertainment, these apps make the desktop feel more alive.', section: 'The Biggest Apps and Tools', hero: ['office', 'bilibili'], groups: [['essentials', 'Create and Productivity'], ['focus', 'Study Mode'], ['fresh', 'Take a Break']], colors: ['#08213f', '#061129', '#18816f', '#10281d'] },
                { title: 'Productivity Burst', subtitle: 'Bring documents, planning, translation, and utilities into the same rhythm.', section: 'Work Smarter', hero: ['shimo-office', 'todo'], groups: [['office', 'Document Collaboration'], ['tools', 'Productivity Tools'], ['ai', 'AI Assistants']], colors: ['#1d2b64', '#0f1022', '#3f5efb', '#1a1f71'] },
                { title: 'Exam and Lesson Prep', subtitle: 'Question banks, paper generation, driving tests, and knowledge search in one set.', section: 'Learning Picks', hero: ['zujuan', 'jiazhaoba'], groups: [['learn', 'Learning Tools'], ['office', 'Teaching and Office'], ['news', 'Knowledge Sources']], colors: ['#093028', '#237a57', '#0f2027', '#2c5364'] },
                { title: 'Video Weekend', subtitle: 'Long videos, short clips, live streams, and editing tools for a relaxed weekend.', section: 'Video Weekend', hero: ['bilibili', 'video-editor'], groups: [['watch', 'Popular Video'], ['live', 'Live Now'], ['create', 'Video Creation']], colors: ['#200122', '#6f0000', '#0f0c29', '#302b63'] },
                { title: 'Music and Sound', subtitle: 'Play, discover, and collect music so the system has its own soundtrack.', section: 'Sound On', hero: ['netease-music', 'qq-music'], groups: [['music', 'Music Platforms'], ['media', 'Local Playback'], ['life', 'Audio Content']], colors: ['#240b36', '#c31432', '#141e30', '#243b55'] },
                { title: 'Local Life Ideas', subtitle: 'Travel, food delivery, payment, and maps for the movement of a full day.', section: 'Life Nearby', hero: ['meituan', 'amap'], groups: [['city', 'City Services'], ['travel', 'Navigation'], ['shopping', 'Shopping and Payment']], colors: ['#42275a', '#734b6d', '#f7971e', '#ffd200'] },
                { title: 'AI Assistant Rotation', subtitle: 'Make chatting, reasoning, writing, and source organization lighter.', section: 'AI Companion', hero: ['chatgpt', 'deepseek'], groups: [['ai', 'Chat Assistants'], ['write', 'Writing and Office'], ['tools', 'Material Processing']], colors: ['#0f2027', '#203a43', '#10a37f', '#07594d'] },
                { title: 'Images and Design', subtitle: 'A selected mix for image editing, design creation, and asset management.', section: 'Create Visuals', hero: ['photopea', 'canva'], groups: [['design', 'Visual Design'], ['photos', 'Photo Tools'], ['office', 'Publish and Collaborate']], colors: ['#1f1c2c', '#928dab', '#00c4cc', '#064e55'] },
                { title: 'News and Reading', subtitle: 'Understand the world while keeping quiet time for longer reading.', section: 'Read More', hero: ['chinadaily', 'weread'], groups: [['news', 'News'], ['books', 'Bookshelf'], ['culture', 'Culture']], colors: ['#141e30', '#243b55', '#8f4f24', '#2b170b'] },
                { title: 'Utility Kit Refresh', subtitle: 'Format conversion, PDFs, compilers, and useful online utilities.', section: 'Utility Kit', hero: ['metool', 'pdf-tools'], groups: [['tools', 'Online Utilities'], ['dev', 'Developer Learning'], ['convert', 'Conversion']], colors: ['#232526', '#414345', '#0f172a', '#334155'] },
                { title: 'Coding Study Day', subtitle: 'Online compilers, technology communities, and AI coding assistants.', section: 'Code and Learn', hero: ['techie-delight', 'qwen'], groups: [['code', 'Run Code'], ['ai', 'AI Support'], ['news', 'Tech News']], colors: ['#000428', '#004e92', '#0f172a', '#1e293b'] },
                { title: 'Travel and Services', subtitle: 'Maps, traffic, payment, and public services for practical errands.', section: 'Move Around', hero: ['traffic-12123', 'didi'], groups: [['travel', 'Route Planning'], ['service', 'Public Services'], ['pay', 'Payment and Shopping']], colors: ['#1e3c72', '#2a5298', '#1e63b6', '#0b2d5c'] },
                { title: 'Shopping and Inspiration', subtitle: 'From price checks to second-hand finds, from discovery to checkout.', section: 'Shop Better', hero: ['taobao', 'jd'], groups: [['shopping', 'Shopping'], ['life', 'Local Services'], ['discover', 'Interest Communities']], colors: ['#3a1c71', '#d76d77', '#ff5000', '#7f1d1d'] },
                { title: 'Light Game Time', subtitle: 'Web games you can open and play without installing a large client.', section: 'Play Now', hero: ['solitaire', 'snake-classic'], groups: [['games', 'Casual Games'], ['video', 'Game Content'], ['tools', 'Player Tools']], colors: ['#134e5e', '#71b280', '#236b4f', '#064e3b'] },
                { title: 'Native Essentials', subtitle: 'Camera, Photos, and Media are preinstalled but still removable.', section: 'Native Essentials', hero: ['camera', 'photos'], groups: [['native', 'Native Apps'], ['media', 'Media Experience'], ['tools', 'Common Tools']], colors: ['#0f0c29', '#302b63', '#0078d4', '#0f172a'] },
                { title: 'A Fresh Mix Today', subtitle: 'A mixed rotation of apps worth exploring today.', section: 'Fresh Rotation', hero: ['kimi', 'whiteboard'], groups: [['fresh', 'Worth Trying'], ['focus', 'Work and Study'], ['relax', 'Relax']], colors: ['#16222a', '#3a6073', '#111827', '#374151'] }
            ];
        }
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
        const storyIntros = this.getFeatureStoryIntros()[index] || [];
        const groupPicks = this.getFeatureGroupPicks();
        const heroApps = this.pickApps(template.hero, index * 5, 2);
        const used = heroApps.map(app => app.id);
        const groups = template.groups.map((group, groupIndex) => {
            const apps = this.pickApps(groupPicks[group[0]] || [], index * 7 + groupIndex * 9, 4, used);
            used.push(...apps.map(app => app.id));
            return { id: group[0], title: group[1], apps };
        });
        return { ...template, index, storyIntros, heroApps, groups };
    },

    getAppsForCurrentCategory() {
        return this.currentCategory === 'all'
            ? this.apps
            : this.apps.filter(app => app.category === this.currentCategory);
    },

    getSearchResults() {
        const q = this.searchQuery.trim().toLowerCase();
        const scopedApps = this.currentCategory === 'all'
            ? this.apps
            : this.apps.filter(app => app.category === this.currentCategory);
        if (!q) return scopedApps;
        return scopedApps.filter(app =>
            app.id.toLowerCase().includes(q) ||
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
        const colors = this.getStoryColors(feature, app, storyIndex);
        const title = storyIndex === 0 ? feature.title : app.name;
        const intro = this.getStoryIntro(feature, app, storyIndex);
        return `
            <article class="appshop-story-card ${compact ? 'compact' : ''}" data-story-index="${storyIndex}" data-story-app-id="${app.id}" style="--story-a:${colors.primary};--story-b:${colors.secondary};">
                ${this.renderStoryShapes(storyIndex)}
                <div class="appshop-story-art">
                    <img src="${this.getIconPath(app.icon)}" alt="">
                </div>
                <div class="appshop-story-copy">
                    <span class="appshop-story-kicker">${storyIndex === 0 ? t('appshop.today-best') : t('appshop.special-feature')}</span>
                    <h2 class="appshop-story-title">${title}</h2>
                    <p class="appshop-story-subtitle">${this.getStoryExcerpt(intro)}</p>
                </div>
            </article>
        `;
    },

    renderFeaturedPage() {
        const feature = this.getTodayFeature();
        return `
            <h1 class="appshop-page-title">${t('appshop.featured')}</h1>
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
            { label: t('appshop.discover-ai'), query: 'AI' },
            { label: t('appshop.discover-pdf'), query: 'PDF' },
            { label: t('appshop.discover-video'), query: this.getCurrentLanguage() === 'en' ? 'video' : '视频' },
            { label: t('appshop.discover-study'), query: this.getCurrentLanguage() === 'en' ? 'zujuan' : '组卷' },
            { label: t('appshop.discover-map'), query: this.getCurrentLanguage() === 'en' ? 'map' : '地图' },
            { label: t('appshop.discover-music'), query: this.getCurrentLanguage() === 'en' ? 'music' : '音乐' }
        ];
        const selectedCategory = this.getCategories().find(cat => cat.id === this.currentCategory);
        const query = this.searchQuery.trim();
        const shouldShowResults = Boolean(query || this.currentCategory !== 'all');
        const shouldHideBrowse = this.isSearchActive || Boolean(query);
        const resultTitle = this.searchQuery.trim()
            ? t('appshop.search-results')
            : t('appshop.category-results', { category: selectedCategory?.name || t('appshop.app') });
        return `
            <div class="appshop-search-page">
                <div class="appshop-search-panel">
                    <div class="appshop-search-large">
                        <img src="Theme/Icon/Symbol_icon/stroke/Search.svg" alt="">
                        <input class="appshop-search-input" type="text" placeholder="${t('appshop.search')}" value="${this.searchQuery}">
                        <img src="Theme/Icon/Symbol_icon/stroke/Microphone.svg" alt="">
                    </div>
                </div>
                ${shouldShowResults ? `
                    <section class="appshop-search-results">
                        <h2 class="appshop-section-title">${resultTitle}</h2>
                        <div class="appshop-apps-grid clean">
                            ${displayApps.map(app => this.renderAppListRow(app)).join('')}
                        </div>
                        ${displayApps.length === 0 ? `<div class="appshop-empty"><img src="Theme/Icon/Symbol_icon/stroke/Search.svg" alt=""><p>${t('appshop.no-result')}</p></div>` : ''}
                    </section>
                ` : ''}
                <div class="appshop-search-browse ${shouldHideBrowse ? 'hidden' : ''}">
                    <h1 class="appshop-page-title">${t('appshop.discover')}</h1>
                    <div class="appshop-discover-grid">
                        ${discover.map(item => `
                            <button class="appshop-discover-chip" type="button" data-search-term="${item.query}">
                                <img src="Theme/Icon/Symbol_icon/stroke/Search.svg" alt="">
                                <span>${item.label}</span>
                            </button>
                        `).join('')}
                    </div>
                    <h2 class="appshop-section-title">${t('appshop.categories')}</h2>
                    <div class="appshop-category-strip">
                        ${categories.map(cat => `
                            <button class="appshop-category-card" type="button" data-category="${cat.id}">
                                <img src="Theme/Icon/Symbol_icon/stroke/${cat.icon}.svg" alt="">
                                <span>${cat.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    renderAllAppsPage() {
        const categories = this.getCategories();
        const displayApps = this.getAppsForCurrentCategory();
        return `
            <h1 class="appshop-page-title">${t('appshop.all-apps')}</h1>
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
                    ${displayApps.map(app => this.renderAppListRow(app)).join('')}
                </div>
                ${displayApps.length === 0 ? `<div class="appshop-empty"><img src="Theme/Icon/Symbol_icon/stroke/Search.svg" alt=""><p>${t('appshop.no-result')}</p></div>` : ''}
            </section>
        `;
    },

    renderPurchasedPage() {
        const installedIds = new Set(this.getInstalledApps().map(app => app.id));
        const installedApps = this.apps.filter(app => installedIds.has(app.id));
        return `
            <h1 class="appshop-page-title">${t('appshop.purchased')}</h1>
            <p class="appshop-page-subtitle">${t('appshop.purchased-subtitle')}</p>
            <div class="appshop-apps-grid clean">
                ${installedApps.map(app => this.renderAppListRow(app)).join('')}
            </div>
            ${installedApps.length === 0 ? `<div class="appshop-empty"><img src="Theme/Icon/Symbol_icon/stroke/Check Circle.svg" alt=""><p>${t('appshop.installed-empty')}</p></div>` : ''}
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
                const nextPage = btn.dataset.page || 'featured';
                this.activePage = nextPage;
                this.isSearchActive = false;
                if (nextPage === 'search') {
                    this.currentCategory = 'all';
                } else {
                    this.searchQuery = '';
                }
                this.render();
            });
        });

        const searchInput = this.container.querySelector('.appshop-search-input');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('focus', () => {
                if (this.isSearchActive) return;
                this.isSearchActive = true;
                this.render({ preserveScroll: true, focusSearch: true });
            });
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.isSearchActive = true;
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.render({ preserveScroll: true, focusSearch: true });
                }, 120);
            });
        }

        const searchPage = this.container.querySelector('.appshop-search-page');
        if (searchPage) {
            searchPage.addEventListener('pointerdown', (e) => {
                if (!this.isSearchActive) return;
                if (e.target.closest('.appshop-search-panel, .appshop-search-results, .appshop-search-browse, .appshop-empty')) return;
                this.exitSearchMode();
            });
        }

        this.container.querySelectorAll('[data-search-term]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.searchQuery = btn.dataset.searchTerm || '';
                this.currentCategory = 'all';
                this.activePage = 'search';
                this.isSearchActive = true;
                this.render();
            });
        });

        this.container.querySelectorAll('.appshop-category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.currentCategory = tab.dataset.category;
                this.activePage = 'all';
                this.searchQuery = '';
                this.isSearchActive = false;
                this.render({ preserveScroll: true });
            });
        });

        this.container.querySelectorAll('.appshop-category-card').forEach(card => {
            card.addEventListener('click', () => {
                this.currentCategory = card.dataset.category || 'all';
                this.searchQuery = '';
                this.activePage = 'search';
                this.isSearchActive = true;
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

    exitSearchMode() {
        this.searchQuery = '';
        this.currentCategory = 'all';
        this.isSearchActive = false;
        this.activePage = 'search';
        this.render({ preserveScroll: true });
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
        const colors = this.getStoryColors(feature, app, storyIndex);
        const title = storyIndex === 0 ? feature.title : t('appshop.special-feature-title', { name: app.name });
        const intro = this.getStoryDetailIntro(feature, app, storyIndex);

        const overlay = document.createElement('div');
        overlay.className = 'appshop-story-overlay';
        overlay.innerHTML = `
            <article class="appshop-story-modal" data-story-app-id="${app.id}" style="--story-a:${colors.primary};--story-b:${colors.secondary};">
                <button class="appshop-story-detail-close" type="button">
                    <img src="Theme/Icon/Symbol_icon/stroke/Cancel.svg" alt="${t('close')}">
                </button>
                <header class="appshop-story-detail-hero">
                    ${this.renderStoryShapes(storyIndex)}
                    <img src="${this.getIconPath(app.icon)}" alt="">
                    <div class="appshop-story-detail-copy">
                        <span class="appshop-story-kicker">${storyIndex === 0 ? t('appshop.today-best') : t('appshop.special-feature')}</span>
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
                </div>
            </article>
        `;
        this.container.appendChild(overlay);
        this.ensureIconColors(app, colors);
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
