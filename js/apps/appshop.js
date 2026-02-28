/**
 * App Shop - 应用商店
 * Fluent OS 系统应用
 */

// 已安装应用的存储 key
const INSTALLED_APPS_KEY = 'fluentos.installedApps';

const AppShop = {
    windowId: null,
    container: null,
    searchQuery: '',
    currentCategory: 'all',
    
    // 应用数据（可从应用商店安装）
    apps: [
        // 音乐类
        { 
            id: 'netease-music', 
            name: '网易云音乐', 
            category: 'music', 
            icon: 'net_ease_music.png',
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
            id: 'tencent-video', 
            name: '腾讯视频', 
            category: 'video', 
            icon: 'tencent_video.png',
            developer: 'Tencent', 
            rating: 4.5, 
            downloads: '5亿+',
            isPWA: true,
            url: 'https://v.qq.com/',
            themeColor: '#ff6a00',
            desc: '腾讯视频是中国领先的在线视频媒体平台，拥有丰富的优质流行内容和专业的媒体运营能力。'
        },
        { 
            id: 'douyu', 
            name: '斗鱼直播', 
            category: 'video', 
            icon: 'douyu.png',
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
            icon: 'weibo.png',
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
            icon: 'jd.png',
            developer: 'JD.com', 
            rating: 4.6, 
            downloads: '5亿+',
            isPWA: true,
            url: 'https://www.jd.com/',
            themeColor: '#e2231a',
            desc: '京东是中国自营式电商企业，提供正品行货、当日达等优质服务。'
        },
        { 
            id: 'pdd', 
            name: '拼多多', 
            category: 'shopping', 
            icon: 'pdd.png',
            developer: 'Pinduoduo', 
            rating: 4.3, 
            downloads: '8亿+',
            isPWA: true,
            url: 'https://www.pinduoduo.com/',
            themeColor: '#e02e24',
            desc: '拼多多是一家专注于C2M拼团购物的第三方社交电商平台，汇聚海量优质商品。'
        },
        // 工具类
        { 
            id: 'baidu-netdisk', 
            name: '百度网盘', 
            category: 'tools', 
            icon: 'baidu_netdisk.png',
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
            icon: 'alipay.png',
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
            icon: 'ele_me.png',
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
            icon: 'amap.png',
            developer: 'Alibaba', 
            rating: 4.6, 
            downloads: '8亿+',
            isPWA: true,
            url: 'https://www.amap.com/',
            themeColor: '#0091ff',
            desc: '高德地图是中国领先的数字地图内容、导航和位置服务提供商。'
        },
        // 办公
        { 
            id: 'dingding', 
            name: '钉钉', 
            category: 'office', 
            icon: 'dingding.png',
            developer: 'Alibaba', 
            rating: 4.3, 
            downloads: '5亿+',
            isPWA: true,
            url: 'https://www.dingtalk.com/',
            themeColor: '#3296fa',
            desc: '钉钉是阿里巴巴集团专为企业打造的免费沟通和协同的多端平台。'
        },
        { 
            id: 'wecom', 
            name: '企业微信', 
            category: 'office', 
            icon: 'we_com.png',
            developer: 'Tencent', 
            rating: 4.4, 
            downloads: '3亿+',
            isPWA: true,
            url: 'https://work.weixin.qq.com/',
            themeColor: '#2b7cff',
            desc: '企业微信是腾讯微信团队打造的企业通讯与办公工具，与微信消息互通。'
        },
        // 阅读
        { 
            id: 'coolapk', 
            name: '酷安', 
            category: 'tools', 
            icon: 'coolapk.png',
            developer: 'Coolapk', 
            rating: 4.5, 
            downloads: '5000万+',
            isPWA: true,
            url: 'https://www.coolapk.com/',
            themeColor: '#11b566',
            desc: '酷安是一个以分享优质应用、游戏和数码消费体验为主的社区。'
        }
    ],
    
    getCategories() {
        return [
            { id: 'all', name: t('appshop.cat-all'), icon: 'Layout Grid' },
            { id: 'music', name: t('appshop.cat-music'), icon: 'Music' },
            { id: 'video', name: t('appshop.cat-video'), icon: 'Video' },
            { id: 'social', name: t('appshop.cat-social'), icon: 'Message Dots' },
            { id: 'shopping', name: t('appshop.cat-shopping'), icon: 'Shopping Cart' },
            { id: 'tools', name: t('appshop.cat-tools'), icon: 'Wrench' },
            { id: 'lifestyle', name: t('appshop.cat-lifestyle'), icon: 'Home' }
        ];
    },
    
    // 获取已安装的应用
    getInstalledApps() {
        try {
            return JSON.parse(localStorage.getItem(INSTALLED_APPS_KEY)) || [];
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

    init(windowId) {
        this.windowId = windowId;
        this.container = document.getElementById(`${windowId}-content`);
        this.render();
        
        // 监听语言和主题变化
        State.on('languageChange', () => this.render());
        State.on('settingsChange', () => this.render());
    },

    render() {
        const featuredApps = this.apps.filter(app => app.featured);
        const bannerApp = this.apps.find(app => app.banner);
        const categories = this.getCategories();
        const filteredApps = this.currentCategory === 'all'
            ? this.apps
            : this.apps.filter(app => app.category === this.currentCategory);

        // 搜索过滤
        const displayApps = this.searchQuery
            ? filteredApps.filter(app =>
                app.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                app.developer.toLowerCase().includes(this.searchQuery.toLowerCase())
              )
            : filteredApps;

        this.container.innerHTML = `
            <div class="appshop">
                <div class="appshop-header">
                    <div class="appshop-search">
                        <img src="Theme/Icon/Symbol_icon/stroke/Search.svg" alt="" class="appshop-search-icon">
                        <input type="text" class="appshop-search-input" placeholder="${t('appshop.search')}" value="${this.searchQuery}">
                    </div>
                </div>

                <div class="appshop-content">
                    <section class="appshop-featured">
                        <div class="appshop-featured-grid">
                            <div class="appshop-banner" data-app-id="${bannerApp?.id || ''}">
                                <div class="appshop-banner-content">
                                    <span class="appshop-banner-tag">${t('appshop.featured')}</span>
                                    <h2 class="appshop-banner-title">${bannerApp?.name || t('appshop.hot-apps')}</h2>
                                    <p class="appshop-banner-desc">${bannerApp?.developer || ''}</p>
                                </div>
                                <div class="appshop-banner-icon">
                                    <img src="Theme/Icon/App_icon/${bannerApp?.icon || 'app_gallery.png'}" alt="">
                                </div>
                            </div>

                            <div class="appshop-featured-cards">
                                ${featuredApps.slice(0, 3).map((app, index) => `
                                    <div class="appshop-featured-card ${index === 0 ? 'large' : ''}" data-app-id="${app.id}">
                                        <div class="appshop-featured-card-icon">
                                            <img src="Theme/Icon/App_icon/${app.icon}" alt="">
                                        </div>
                                        <div class="appshop-featured-card-info">
                                            <h4>${app.name}</h4>
                                            <span>${app.developer}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="appshop-carousel-dots">
                            <span class="dot active"></span>
                            <span class="dot"></span>
                            <span class="dot"></span>
                            <span class="dot"></span>
                        </div>
                    </section>

                    <section class="appshop-categories">
                        <div class="appshop-category-tabs">
                            ${categories.map(cat => `
                                <button class="appshop-category-tab ${this.currentCategory === cat.id ? 'active' : ''}" data-category="${cat.id}">
                                    <img src="Theme/Icon/Symbol_icon/stroke/${cat.icon}.svg" alt="">
                                    <span>${cat.name}</span>
                                </button>
                            `).join('')}
                        </div>
                    </section>

                    <section class="appshop-apps">
                        <div class="appshop-apps-grid">
                            ${displayApps.map(app => {
                                const installed = this.isInstalled(app.id);
                                const isSystem = app.isSystem === true;
                                const btnText = (isSystem || installed) ? t('appshop.open') : t('appshop.get');
                                const btnClass = (isSystem || installed) ? 'installed' : '';
                                return `
                                <div class="appshop-app-card ${btnClass}" data-app-id="${app.id}">
                                    <div class="appshop-app-icon">
                                        <img src="Theme/Icon/App_icon/${app.icon}" alt="">
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
                                    <button class="fluent-btn fluent-btn-medium appshop-app-install ${btnClass}">${btnText}</button>
                                </div>
                            `}).join('')}
                        </div>

                        ${displayApps.length === 0 ? `
                            <div class="appshop-empty">
                                <img src="Theme/Icon/Symbol_icon/stroke/Search.svg" alt="">
                                <p>${t('appshop.no-result')}</p>
                            </div>
                        ` : ''}
                    </section>
                </div>
            </div>
        `;

        this.bindEvents();
    },

    // 只更新应用列表（不重新渲染搜索框）
    updateAppsList() {
        const appsGrid = this.container.querySelector('.appshop-apps-grid');
        const emptyState = this.container.querySelector('.appshop-empty');
        if (!appsGrid) return;
        
        const filteredApps = this.currentCategory === 'all' 
            ? this.apps 
            : this.apps.filter(app => app.category === this.currentCategory);
        
        const displayApps = this.searchQuery 
            ? filteredApps.filter(app => 
                app.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                app.developer.toLowerCase().includes(this.searchQuery.toLowerCase())
              )
            : filteredApps;
        
        appsGrid.innerHTML = displayApps.map(app => {
            const installed = this.isInstalled(app.id);
            const isSystem = app.isSystem === true;
            const btnText = (isSystem || installed) ? t('appshop.open') : t('appshop.get');
            const btnClass = (isSystem || installed) ? 'installed' : '';
            return `
                <div class="appshop-app-card ${btnClass}" data-app-id="${app.id}">
                    <div class="appshop-app-icon">
                        <img src="Theme/Icon/App_icon/${app.icon}" alt="">
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
                    <button class="fluent-btn fluent-btn-medium appshop-app-install ${btnClass}">${btnText}</button>
                </div>
            `;
        }).join('');

        // 处理空状态
        const appsSection = this.container.querySelector('.appshop-apps');
        let existingEmpty = appsSection.querySelector('.appshop-empty');
        if (displayApps.length === 0) {
            if (!existingEmpty) {
                appsSection.insertAdjacentHTML('beforeend', `
                    <div class="appshop-empty">
                        <img src="Theme/Icon/Symbol_icon/stroke/Search.svg" alt="">
                        <p>${t('appshop.no-result')}</p>
                    </div>
                `);
            }
        } else if (existingEmpty) {
            existingEmpty.remove();
        }
        
        // 重新绑定应用卡片事件
        this.bindAppCardEvents();
    },
    
    // 绑定应用卡片事件
    bindAppCardEvents() {
        this.container.querySelectorAll('.appshop-apps-grid [data-app-id]').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('appshop-app-install')) {
                    this.installApp(card.dataset.appId);
                } else {
                    this.showAppDetail(card.dataset.appId);
                }
            });
        });
    },

    bindEvents() {
        // 搜索（只更新应用列表，不重新渲染搜索框）
        const searchInput = this.container.querySelector('.appshop-search-input');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.updateAppsList();
                }, 300);
            });
        }
        
        // 分类切换
        this.container.querySelectorAll('.appshop-category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.currentCategory = tab.dataset.category;
                this.render();
            });
        });
        
        // 应用卡片点击
        this.container.querySelectorAll('[data-app-id]').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('appshop-app-install')) {
                    this.installApp(card.dataset.appId);
                } else {
                    this.showAppDetail(card.dataset.appId);
                }
            });
        });
        
        // 安装按钮
        this.container.querySelectorAll('.appshop-app-install').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const appId = btn.closest('[data-app-id]').dataset.appId;
                this.installApp(appId);
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
            this.openPWA(app);
            return;
        }
        
        FluentUI.Toast({
            title: t('appshop.installing'),
            message: t('appshop.downloading', { name: app.name }),
            type: 'info',
            duration: 5000
        });
        
        // 动态加载 PWA 应用脚本
        const script = document.createElement('script');
        script.src = `js/third_parts_apps/${appId}.js`;
        
        // 5秒安装时间
        const installDelay = 5000;
        const startTime = Date.now();
        
        script.onload = () => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, installDelay - elapsed);
            
            // 等待剩余时间完成安装
            setTimeout(() => {
                // 添加到已安装列表
                const installedApps = this.getInstalledApps();
                installedApps.push({
                    id: app.id,
                    name: app.name,
                    icon: `Theme/Icon/App_icon/${app.icon}`,
                    url: app.url,
                    scriptLoaded: true,
                    installedAt: new Date().toISOString()
                });
                this.saveInstalledApps(installedApps);
                
                // 同步到 State.settings.installedApps（用于设置页面显示）
                State.updateSettings({ 
                    installedApps: installedApps.map(a => a.id) 
                });
                
                // 动态添加到 Desktop.apps（用于开始菜单显示）
                if (!Desktop.apps.find(a => a.id === app.id)) {
                    Desktop.apps.push({
                        id: app.id,
                        name: app.name,
                        icon: `Theme/Icon/App_icon/${app.icon}`,
                        isPWA: true,
                        url: app.url
                    });
                }
                
                // 刷新开始菜单
                if (typeof StartMenu !== 'undefined' && StartMenu.renderApps) {
                    StartMenu.renderApps();
                }
                
                FluentUI.Toast({
                    title: t('appshop.install-success'),
                    message: t('appshop.added-to-start', { name: app.name }),
                    type: 'success',
                    duration: 4000
                });
                
                // 刷新当前视图
                this.render();
            }, remaining);
        };
        script.onerror = () => {
            FluentUI.Toast({
                title: t('appshop.install-fail'),
                message: t('appshop.load-fail', { name: app.name }),
                type: 'error',
                duration: 4000
            });
        };
        document.head.appendChild(script);
    },
    
    // 卸载应用（内部执行，不含弹窗）
    _doUninstall(appId) {
        const app = this.apps.find(a => a.id === appId);
        const installedApps = this.getInstalledApps().filter(a => a.id !== appId);
        this.saveInstalledApps(installedApps);

        // 同步到 State.settings.installedApps
        State.updateSettings({
            installedApps: installedApps.map(a => a.id)
        });

        // 从 Desktop.apps 移除
        const idx = Desktop.apps.findIndex(a => a.id === appId);
        if (idx !== -1) {
            Desktop.apps.splice(idx, 1);
        }

        // 从 PWALoader 注销
        if (typeof PWALoader !== 'undefined') {
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
    uninstallApp(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;
        const appName = app.name || appId;

        const doConfirmAndUninstall = () => {
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
        const isRunning = typeof WindowManager !== 'undefined' &&
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
    openPWA(app) {
        // 直接打开独立的 PWA 窗口
        WindowManager.openApp(app.id);
    },

    showAppDetail(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;
        
        const installed = this.isInstalled(appId);
        const isSystem = app.isSystem === true;
        const themeColor = app.themeColor || '#0078d4';
        const btnAction = (isSystem || installed) ? 'open' : 'install';
        const btnText = (isSystem || installed) ? t('appshop.open') : t('appshop.get');
        const btnClass = (isSystem || installed) ? 'installed' : '';

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
                this.openPWA(app);
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

// 初始化时恢复已安装的应用
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const installedApps = AppShop.getInstalledApps();
        
        // 同步到 State.settings.installedApps
        if (installedApps.length > 0) {
            State.updateSettings({ 
                installedApps: installedApps.map(a => a.id) 
            });
        }
        
        // 动态加载已安装应用的脚本
        installedApps.forEach(app => {
            // 加载 PWA 应用脚本
            const script = document.createElement('script');
            script.src = `js/third_parts_apps/${app.id}.js`;
            script.onload = () => {
                console.log(`[AppShop] 已加载: ${app.name}`);
            };
            document.head.appendChild(script);
            
            // 添加到 Desktop.apps
            if (!Desktop.apps.find(a => a.id === app.id)) {
                Desktop.apps.push({
                    id: app.id,
                    name: app.name,
                    icon: app.icon,
                    isPWA: true,
                    url: app.url
                });
            }
        });
        
        // 刷新开始菜单
        if (typeof StartMenu !== 'undefined' && StartMenu.renderApps) {
            StartMenu.renderApps();
        }
    }, 100);
});

// 注册到全局
window.AppShop = AppShop;
