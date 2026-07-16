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
        const catalogId = typeof appOrId === 'string' ? appOrId : appOrId?.id;
        const catalogApp = this.getCatalogApp(catalogId);
        if (!catalogApp) return false;

        this.register({
            width: 1100,
            height: 760,
            ...catalogApp,
            trustedCatalog: true,
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
        const catalogApp = this.getCatalogApp(id);
        const isExactCatalogUrl = (() => {
            if (!catalogApp || config.trustedCatalog !== true) return false;
            try { return new URL(catalogApp.url, location.href).href === new URL(url, location.href).href; }
            catch (_) { return false; }
        })();
        const normalizedConfig = {
            ...config,
            icon: this.normalizeIcon(icon),
            width,
            height,
            // Only the source-controlled catalog may keep its real origin.
            // Developer-created PWAs stay on an opaque sandbox origin so a
            // same-origin URL or redirect cannot reach the FluentOS parent.
            trustedCatalog: isExactCatalogUrl
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
                this._tombstonePausedMedia = [];
                this.render();
            },

            getFrame() {
                return this.container ? this.container.querySelector('.pwa-iframe') : null;
            },

            postTombstoneMessage(frame, action) {
                if (!frame || !frame.contentWindow) return;
                try {
                    frame.contentWindow.postMessage({
                        source: 'FluentOS',
                        type: 'fluentos:tombstone',
                        action,
                        appId: this.config.id,
                        appName: this.config.name
                    }, '*');
                } catch (_) {
                    // Cross-origin frames may reject access; the iframe remains frozen by the shell.
                }
            },

            pauseSameOriginMedia(frame) {
                this._tombstonePausedMedia = [];
                try {
                    const mediaNodes = Array.from(frame.contentDocument?.querySelectorAll('audio, video') || []);
                    mediaNodes.forEach((node, index) => {
                        if (!node.paused && !node.ended) {
                            this._tombstonePausedMedia.push(index);
                            node.pause();
                        }
                    });
                } catch (_) {
                    // Third-party PWAs are usually cross-origin; cooperative pages can use postMessage instead.
                }
            },

            resumeSameOriginMedia(frame) {
                if (!Array.isArray(this._tombstonePausedMedia) || this._tombstonePausedMedia.length === 0) return;
                try {
                    const mediaNodes = Array.from(frame.contentDocument?.querySelectorAll('audio, video') || []);
                    this._tombstonePausedMedia.forEach((index) => {
                        const node = mediaNodes[index];
                        if (node && typeof node.play === 'function') {
                            const playResult = node.play();
                            if (playResult && typeof playResult.catch === 'function') {
                                playResult.catch(() => {});
                            }
                        }
                    });
                } catch (_) {
                    // Ignore cross-origin restore failures; the frame itself was never reloaded.
                } finally {
                    this._tombstonePausedMedia = [];
                }
            },

            onTombstoneFreeze() {
                if (!this.container) return;
                this.container.classList.add('pwa-content-frozen');
                const frame = this.getFrame();
                if (frame) {
                    this.pauseSameOriginMedia(frame);
                    this.postTombstoneMessage(frame, 'freeze');
                    frame.dataset.fluentFrozen = 'true';
                    frame.dataset.fluentDisplayBeforeFreeze = frame.style.display || '';
                    frame.setAttribute('aria-hidden', 'true');
                    frame.style.pointerEvents = 'none';
                    try {
                        if (frame.contentWindow && typeof frame.contentWindow.stop === 'function') {
                            frame.contentWindow.stop();
                        }
                    } catch (_) {
                        // stop() is best-effort and not available for every cross-origin frame.
                    }
                }
            },

            onTombstoneRestore() {
                if (!this.container) return;
                this.container.classList.remove('pwa-content-frozen');
                const frame = this.getFrame();
                if (frame) {
                    delete frame.dataset.fluentFrozen;
                    delete frame.dataset.fluentDisplayBeforeFreeze;
                    frame.removeAttribute('aria-hidden');
                    frame.style.pointerEvents = '';
                    this.postTombstoneMessage(frame, 'restore');
                    this.resumeSameOriginMedia(frame);
                }
            },

            beforeClose() {
                const frame = this.getFrame();
                if (frame) {
                    try { frame.src = 'about:blank'; } catch (_) {}
                    frame.remove();
                }
                this._tombstonePausedMedia = [];
                this.container = null;
                this.windowId = null;
                return true;
            },
            
            render() {
                if (this.config.openMode === 'external') {
                    window.open(this.config.url, '_blank', 'noopener,noreferrer');
                    const external = document.createElement('div');
                    external.className = 'pwa-app pwa-external-app';
                    const link = document.createElement('a');
                    link.href = this.config.url;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.textContent = this.config.name;
                    external.appendChild(link);
                    this.container.replaceChildren(external);
                    return;
                }

                const app = document.createElement('div');
                app.className = 'pwa-app';
                const frozenSurface = document.createElement('div');
                frozenSurface.className = 'pwa-frozen-surface';
                frozenSurface.setAttribute('aria-hidden', 'true');
                const icon = document.createElement('img');
                icon.src = this.config.icon;
                icon.alt = '';
                const label = document.createElement('span');
                label.textContent = this.config.name;
                frozenSurface.append(icon, label);

                const frame = document.createElement('iframe');
                frame.className = 'pwa-iframe';
                frame.src = this.config.url;
                const sandbox = ['allow-scripts', 'allow-popups', 'allow-forms', 'allow-modals'];
                if (this.config.trustedCatalog) sandbox.unshift('allow-same-origin');
                frame.setAttribute('sandbox', sandbox.join(' '));
                frame.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
                app.append(frozenSurface, frame);
                this.container.replaceChildren(app);
                WindowManager.bindEmbeddedFrameFocus?.(frame, this.windowId);
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
        
        console.debug(`[PWA] 已注册应用: ${name}`);
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
            console.debug(`[PWA] 已注销应用: ${id}`);
        }
    }
};

window.PWALoader = PWALoader;
