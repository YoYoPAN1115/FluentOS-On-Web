/**
 * PWA 应用加载器
 * 用于创建具有独立窗口的 PWA 应用
 */

const PWALoader = {
    // 存储所有已注册的 PWA 应用配置
    apps: {},
    
    /**
     * 注册 PWA 应用
     * @param {Object} config 应用配置
     */
    register(config) {
        const { id, name, icon, url, width = 1024, height = 700 } = config;
        
        this.apps[id] = config;
        
        // 创建应用对象
        window[`PWA_${id.replace(/-/g, '_')}`] = {
            windowId: null,
            container: null,
            config: config,
            
            init(windowId) {
                this.windowId = windowId;
                this.container = document.getElementById(`${windowId}-content`);
                this.render();
            },
            
            render() {
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
                icon: icon,
                width: width,
                height: height,
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
