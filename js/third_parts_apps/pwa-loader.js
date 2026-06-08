/**
 * PWA 应用加载器
 * 用于创建具有独立窗口的 PWA 应用
 */

const PWALoader = {
    // 存储所有已注册的 PWA 应用配置
    apps: {},

    normalizeIcon(icon) {
        if (!icon) return 'Theme/Icon/App_icon/app_gallery.png';
        return icon.includes('/') ? icon : `Theme/Icon/App_icon/${icon}`;
    },

    getCatalogApp(id) {
        const catalog = window.FluentPWACatalog;
        if (!Array.isArray(catalog)) return null;
        return catalog.find(app => app.id === id) || null;
    },

    registerFromCatalog(appOrId) {
        const catalogApp = typeof appOrId === 'string' ? this.getCatalogApp(appOrId) : appOrId;
        if (!catalogApp) return false;

        this.register({
            width: 1100,
            height: 760,
            ...catalogApp,
            icon: this.normalizeIcon(catalogApp.icon)
        });
        return true;
    },
    
    /**
     * 注册 PWA 应用
     * @param {Object} config 应用配置
     */
    register(config) {
        const { id, name, icon, url, width = 1024, height = 700 } = config;
        const normalizedConfig = {
            ...config,
            icon: this.normalizeIcon(icon),
            width,
            height
        };
        
        this.apps[id] = normalizedConfig;
        
        // 创建应用对象
        window[`PWA_${id.replace(/-/g, '_')}`] = {
            windowId: null,
            container: null,
            config: normalizedConfig,
            
            init(windowId) {
                this.windowId = windowId;
                this.container = document.getElementById(`${windowId}-content`);
                this.render();
            },
            
            render() {
                if (this.config.openMode === 'external') {
                    window.open(this.config.url, '_blank', 'noopener,noreferrer');
                    this.container.innerHTML = `
                        <div class="pwa-app pwa-external-app">
                            <a href="${this.config.url}" target="_blank" rel="noopener noreferrer">
                                ${this.config.name}
                            </a>
                        </div>
                    `;
                    return;
                }

                this.container.innerHTML = `
                    <div class="pwa-app">
                        <iframe 
                            class="pwa-iframe" 
                            src="${this.config.url}"
                            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        ></iframe>
                    </div>
                `;
            }
        };
        
        // 注册到 WindowManager
        if (typeof WindowManager !== 'undefined' && WindowManager.appConfigs) {
            WindowManager.appConfigs[id] = {
                title: name,
                icon: normalizedConfig.icon,
                width: width,
                height: height,
                openMode: normalizedConfig.openMode,
                url: normalizedConfig.url,
                component: `PWA_${id.replace(/-/g, '_')}`
            };
        }
        
        console.log(`[PWA] 已注册应用: ${name}`);
    },
    
    /**
     * 获取所有已注册的 PWA 应用
     */
    getAll() {
        return Object.values(this.apps);
    },
    
    /**
     * 检查应用是否已注册
     */
    isRegistered(id) {
        return !!this.apps[id];
    },
    
    /**
     * 注销 PWA 应用
     */
    unregister(id) {
        if (this.apps[id]) {
            delete this.apps[id];
            delete window[`PWA_${id.replace(/-/g, '_')}`];
            if (typeof WindowManager !== 'undefined' && WindowManager.appConfigs) {
                delete WindowManager.appConfigs[id];
            }
            console.log(`[PWA] 已注销应用: ${id}`);
        }
    }
};

window.PWALoader = PWALoader;
