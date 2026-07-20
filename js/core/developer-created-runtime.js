/** Runtime registration and the capability bridge for user-created apps. */
const DeveloperCreatedRuntime = {
    apps: new Map(),
    frames: new Map(),
    MAX_BRIDGE_IN_FLIGHT: 32,
    MAX_DIALOGS_PER_FRAME: 3,
    MAX_STORAGE_KEYS: 128,
    MAX_STORAGE_BYTES: 512 * 1024,
    MAX_STORAGE_VALUE_BYTES: 100 * 1024,
    PERMISSION_STORAGE_KEY: 'fluentos.appPermissions.v1',
    READONLY_METHODS: Object.freeze([
        'system.theme', 'system.themeMode', 'system.accentColor', 'system.state',
        'system.language', 'system.windowBlurEnabled', 'storage.get', 'window.info'
    ]),
    _bound: false,
    _permissionState: null,
    _permissionLaunches: new Map(),

    init() {
        if (this._bound) return;
        this._bound = true;
        window.addEventListener('message', (event) => this._onMessage(event));
        window.addEventListener('systemThemeChanged', () => this.broadcastHostState());
        if (typeof State !== 'undefined') State.on?.('languageChange', () => this.broadcastHostState());
        if (typeof State !== 'undefined') State.on?.('settingsChange', (updates) => {
            if (!updates) return;
            const keys = ['theme', 'accentColor', 'enableFluentV2', 'materialType', 'enableBlur', 'enableWindowBlur', 'enableButtonGlowEffect', 'blurIntensity'];
            // State emits before all theme CSS variables/classes are applied.
            // Broadcast on the next microtask so created Apps receive the final state.
            if (keys.some((key) => Object.prototype.hasOwnProperty.call(updates, key))) queueMicrotask(() => this.broadcastHostState());
        });
    },

    async restore() {
        this.init();
        await DeveloperCenterStore.init();
        const apps = await DeveloperCenterStore.getAll('apps');
        apps.forEach((app) => this.register(app));
        this.refreshShell();
        return apps;
    },

    register(app) {
        if (!app?.id) return false;
        this.init();
        this.unregister(app.id, { keepShell: true, closeWindows: false });
        this.apps.set(app.id, app);

        if (app.type === 'pwa') {
            if (typeof PWALoader === 'undefined') return false;
            PWALoader.register({
                id: app.id, name: app.name, icon: app.icon,
                url: app.url, width: 1024, height: 700
            });
        } else {
            const componentName = `CreatedApp_${String(app.id).replace(/[^A-Za-z0-9_]/g, '_')}`;
            globalThis[componentName] = this._createComponent(app.id);
            WindowManager.appConfigs[app.id] = {
                title: app.title || app.name,
                icon: app.icon || 'Theme/Icon/App_icon/created_app.png',
                width: 940, height: 650, minWidth: 420, minHeight: 300,
                component: componentName
            };
        }
        this._addShellApp(app);
        return true;
    },

    _createComponent(appId) {
        const runtime = this;
        return {
            windowId: null,
            frame: null,
            init(windowId) {
                this.windowId = windowId;
                const container = document.getElementById(windowId)?.querySelector('.window-content');
                if (!container) return false;
                const app = runtime.apps.get(appId);
                if (!app) return false;
                this.frame = runtime.mountAppFrame(container, app, appId, windowId);
                return true;
            },
            beforeClose() {
                if (this.frame?.contentWindow) runtime._releaseFrame(this.frame.contentWindow);
                this.frame = null;
                return true;
            }
        };
    },

    _createHandshakeToken() {
        if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
        if (!globalThis.crypto?.getRandomValues) throw new Error('Secure randomness is unavailable');
        const bytes = new Uint8Array(24);
        globalThis.crypto.getRandomValues(bytes);
        return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
    },

    _createCapabilityProfile(app, appId, options = {}) {
        const readOnly = options.readOnly === true;
        let network = { connect: [], image: [] };
        if (!readOnly) {
            try { network = DeveloperCenterStore.normalizeNetworkConfig(app?.network); }
            catch (_) { network = { connect: [], image: [] }; }
        }
        const declaredPermissions = readOnly ? [] : this._declaredPermissions(app);
        const permissions = readOnly ? [] : this._grantedPermissions(app, declaredPermissions);
        return Object.freeze({
            id: String(appId || app?.id || ''),
            name: String(app?.name || 'Created App'),
            title: String(app?.title || app?.name || 'Created App'),
            readOnly,
            declaredPermissions: Object.freeze(declaredPermissions),
            permissions: Object.freeze(permissions),
            network: Object.freeze({
                connect: Object.freeze([...network.connect]),
                image: Object.freeze([...network.image])
            })
        });
    },

    _declaredPermissions(app) {
        return [...new Set(Array.isArray(app?.permissions) ? app.permissions.map(String) : [])]
            .filter((permission) => DeveloperCenterStore.SUPPORTED_PERMISSIONS.includes(permission));
    },

    _requiresPermissionConsent(app) {
        return app?.permissionConsentRequired === true || app?.importedFromFap === true || !!String(app?.sourcePackageId || '').trim();
    },

    _readPermissionState() {
        if (this._permissionState) return this._permissionState;
        let value = {};
        try {
            const parsed = JSON.parse(localStorage.getItem(this.PERMISSION_STORAGE_KEY) || '{}');
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) value = parsed;
        } catch (_) {}
        this._permissionState = value;
        return value;
    },

    _writePermissionState() {
        try { localStorage.setItem(this.PERMISSION_STORAGE_KEY, JSON.stringify(this._readPermissionState())); }
        catch (error) { console.warn('[CreatedApp] Permission choices could not be persisted', error); }
    },

    getPermissionDecision(appId, permission) {
        const value = this._readPermissionState()?.[String(appId || '')]?.[String(permission || '')];
        return value === 'granted' || value === 'denied' ? value : null;
    },

    setPermissionDecision(appId, permission, decision) {
        if (!['granted', 'denied'].includes(decision)) return false;
        const id = String(appId || '');
        if (!id || !DeveloperCenterStore.SUPPORTED_PERMISSIONS.includes(permission)) return false;
        const state = this._readPermissionState();
        if (!state[id] || typeof state[id] !== 'object' || Array.isArray(state[id])) state[id] = {};
        state[id][permission] = decision;
        this._writePermissionState();
        return true;
    },

    clearPermissionDecisions(appId) {
        const id = String(appId || '');
        const state = this._readPermissionState();
        if (!id || !Object.prototype.hasOwnProperty.call(state, id)) return false;
        delete state[id];
        this._writePermissionState();
        return true;
    },

    _grantedPermissions(app, declaredPermissions = this._declaredPermissions(app)) {
        if (!this._requiresPermissionConsent(app)) return [...declaredPermissions];
        return declaredPermissions.filter((permission) => this.getPermissionDecision(app.id, permission) === 'granted');
    },

    _pendingPermissions(app) {
        if (!this._requiresPermissionConsent(app)) return [];
        return this._declaredPermissions(app).filter((permission) => !this.getPermissionDecision(app.id, permission));
    },

    interceptLaunch(appId, data = null) {
        const app = this.apps.get(appId);
        const pending = app ? this._pendingPermissions(app) : [];
        if (!app || pending.length === 0) return false;
        if (this._permissionLaunches.has(appId)) return true;
        const launch = this._requestPermissionsSequentially(app, pending)
            .catch((error) => {
                console.warn('[CreatedApp] Permission request failed; unresolved permissions were denied', error);
                pending.forEach((permission) => {
                    if (!this.getPermissionDecision(app.id, permission)) this.setPermissionDecision(app.id, permission, 'denied');
                });
            })
            .finally(() => this._permissionLaunches.delete(appId));
        this._permissionLaunches.set(appId, launch);
        launch.then(() => {
            if (this.apps.has(appId) && typeof WindowManager !== 'undefined') WindowManager.openApp(appId, data);
        });
        return true;
    },

    async _requestPermissionsSequentially(app, permissions) {
        for (let index = 0; index < permissions.length; index += 1) {
            const permission = permissions[index];
            const decision = await this._showPermissionDialog(app, permission, index + 1, permissions.length);
            this.setPermissionDecision(app.id, permission, decision);
        }
    },

    _showPermissionDialog(app, permission, position, total) {
        const english = typeof I18n !== 'undefined' && I18n.currentLang === 'en';
        const info = DeveloperCenterStore.permissionInfo(permission, english ? 'en' : 'zh');
        const network = (() => {
            try { return DeveloperCenterStore.normalizeNetworkConfig(app.network); }
            catch (_) { return { connect: [], image: [] }; }
        })();
        const domains = permission === 'network.request' ? network.connect : (permission === 'network.image' ? network.image : []);
        const domainHtml = domains.length
            ? `<div class="app-permission-domains"><strong>${english ? 'Allowed sites' : '允许访问的网站'}</strong><span>${domains.map((domain) => this.escapeHtml(domain)).join('<br>')}</span></div>`
            : '';
        const appName = String(app.name || app.title || 'App');
        const content = `<div class="app-permission-dialog"><p>${this.escapeHtml(info.description)}</p>${domainHtml}<small>${english ? `Permission ${position} of ${total}. You can still use the App if you deny it; only this feature will be unavailable.` : `权限 ${position}/${total}。拒绝后仍可使用此 App，但此项功能将不可用。`}</small></div>`;
        if (typeof FluentUI === 'undefined' || typeof FluentUI.Dialog !== 'function') return Promise.resolve('denied');
        return new Promise((resolve) => FluentUI.Dialog({
            type: 'info',
            title: english ? `“${this.escapeHtml(appName)}” requests: ${this.escapeHtml(info.name)}` : `“${this.escapeHtml(appName)}”请求${this.escapeHtml(info.name)}`,
            content,
            closeOnOverlay: false,
            buttons: [
                { text: english ? 'Deny' : '拒绝', variant: 'secondary', value: 'denied' },
                { text: english ? 'Allow' : '允许', variant: 'primary', value: 'granted' }
            ],
            onClose: (decision) => resolve(decision === 'granted' ? 'granted' : 'denied')
        }));
    },

    _releaseFrame(targetOrRegistration) {
        const registration = this.frames.get(targetOrRegistration) ||
            ([...this.frames.values()].includes(targetOrRegistration) ? targetOrRegistration : null);
        if (!registration || registration.active === false) return false;
        registration.active = false;
        registration.dialogs?.forEach((dialog) => {
            try { dialog.close(null); } catch (_) {}
        });
        registration.dialogs?.clear();
        if (registration.port) {
            try { registration.port.postMessage({ type: 'fluentos:bridge-closed' }); } catch (_) {}
            registration.port.onmessage = null;
            registration.port.onmessageerror = null;
            try { registration.port.close(); } catch (_) {}
            registration.port = null;
        }
        if (this.frames.get(registration.target) === registration) this.frames.delete(registration.target);
        return true;
    },

    mountAppFrame(container, app, appId, windowId, options = {}) {
        container.style.padding = '0';
        container.style.overflow = 'hidden';
        container.classList.add('created-app-window-content');
        const frame = document.createElement('iframe');
        const handshakeToken = this._createHandshakeToken();
        const profile = this._createCapabilityProfile(app, appId, options);
        frame.className = 'created-app-frame';
        frame.sandbox = 'allow-scripts allow-forms allow-modals allow-downloads';
        frame.setAttribute('referrerpolicy', 'no-referrer');
        frame.setAttribute('title', app.title || app.name || 'Created App');
        frame.srcdoc = this.buildDocument(app, { capabilityProfile: profile, handshakeToken });
        container.replaceChildren(frame);
        WindowManager.bindEmbeddedFrameFocus?.(frame, windowId);

        // Appending an iframe does not run its document until the current task
        // returns, so registration still precedes any bridge message while also
        // avoiding an observable, separately loading about:blank document.
        const target = frame.contentWindow;
        const registration = {
            active: true, handshakeComplete: false, loadSeen: false,
            port: null, inFlight: 0, pendingIds: new Set(),
            dialogs: new Set(),
            onRuntimeError: typeof options.onRuntimeError === 'function' ? options.onRuntimeError : null
        };
        Object.defineProperties(registration, {
            frame: { value: frame, enumerable: true },
            target: { value: target, enumerable: true },
            appId: { value: appId, enumerable: true },
            windowId: { value: windowId, enumerable: true },
            profile: { value: profile, enumerable: true },
            handshakeToken: { value: handshakeToken }
        });
        this.frames.set(target, registration);
        frame.addEventListener('load', () => {
            if (this.frames.get(target) !== registration) return;
            if (registration.loadSeen) {
                // A navigated document never receives another capability port.
                this._releaseFrame(registration);
                return;
            }
            registration.loadSeen = true;
            this._sendPort(registration, { type: 'fluentos:host-state', payload: this.getHostState(windowId) });
        });
        return frame;
    },

    _getFluentUiCss() {
        const sheet = [...document.styleSheets].find((item) => String(item.href || '').replace(/\\/g, '/').endsWith('/css/fluent-ui.css'));
        if (!sheet) return '';
        try { return [...sheet.cssRules].map((rule) => rule.cssText).join('\n'); }
        catch (_) { return ''; }
    },

    buildDocument(app, options = {}) {
        const capabilityProfile = options.capabilityProfile || this._createCapabilityProfile(app, app?.id, options);
        const handshakeToken = String(options.handshakeToken || this._createHandshakeToken());
        const baseCss = `
            :root{
                color-scheme:light;--fluent-accent:#0078d4;--fluent-bg:#f3f3f3;--fluent-control:#fff;--fluent-control-hover:#f9f9f9;
                --fluent-text:#1b1b1b;--fluent-subtle:#5d5d5d;--fluent-border:rgba(0,0,0,.16);
                --accent:#0078d4;--accent-hover:#106ebe;--accent-rgb:0,120,212;--accent-contrast:#fff;
                --bg-primary:#f3f3f3;--bg-secondary:rgba(255,255,255,.72);--bg-tertiary:rgba(255,255,255,.5);
                --text-primary:#1b1b1b;--text-secondary:#5d5d5d;--text-tertiary:#767676;--border-color:rgba(0,0,0,.12);
            }
            :root[data-fluent-theme="dark"]{
                color-scheme:dark;--fluent-bg:#202020;--fluent-control:#2d2d2d;--fluent-control-hover:#353535;
                --fluent-text:#fff;--fluent-subtle:#c8c8c8;--fluent-border:rgba(255,255,255,.14);
                --bg-primary:#202020;--bg-secondary:rgba(32,32,32,.72);--bg-tertiary:rgba(32,32,32,.5);
                --text-primary:#fff;--text-secondary:#c8c8c8;--text-tertiary:#9d9d9d;--border-color:rgba(255,255,255,.12);
            }
            html,body{color:var(--text-primary);background:var(--bg-primary)}
        `;
        const forceCss = app.forceFluentUI ? `
            :root{
                font-family:'Segoe UI Variable','Segoe UI',system-ui,sans-serif;
                --fluent-shadow:0 1px 2px rgba(0,0,0,.08);
                --radius-sm:8px;--radius-md:12px;--radius-lg:16px;--transition-fast:.15s ease-out;--transition-normal:.25s ease-out;
                --shadow-sm:0 1px 2px rgba(0,0,0,.08);--shadow-md:0 4px 12px rgba(0,0,0,.12);--shadow-lg:0 12px 30px rgba(0,0,0,.18);
                --v2-blur:40px;--v2-blur-light:20px;
            }
            :root[data-fluent-theme="dark"]{
                --fluent-shadow:0 1px 2px rgba(0,0,0,.3);
            }
            *,*::before,*::after{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--fluent-text) 38%,transparent) transparent}
            *::-webkit-scrollbar{width:6px;height:6px}
            *::-webkit-scrollbar-track{background:transparent}
            *::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--fluent-text) 38%,transparent);border-radius:999px}
            *::-webkit-scrollbar-thumb:hover{background:color-mix(in srgb,var(--fluent-text) 55%,transparent)}
            html,body{margin:0;color:var(--fluent-text);background:var(--fluent-bg);font-family:inherit}
            body.fluent-v2 button.fluent-btn{
                color:var(--accent)!important;-webkit-text-fill-color:var(--accent)!important;
                background-clip:border-box!important;-webkit-background-clip:border-box!important;background-image:none!important;
            }
            body.fluent-v2 button.fluent-btn:hover,body.fluent-v2 button.fluent-btn:focus-visible{
                color:var(--accent-hover)!important;-webkit-text-fill-color:var(--accent-hover)!important;
            }
            body.fluent-v2 button.fluent-btn-secondary{
                background-color:var(--fluent-control)!important;border-color:var(--fluent-border)!important;
            }
            body.fluent-v2 button.fluent-btn-secondary:hover,body.fluent-v2 button.fluent-btn-secondary:focus-visible{
                background-color:var(--fluent-control-hover)!important;
            }
            body.fluent-v2 button.fluent-btn-primary{
                color:var(--accent-contrast)!important;-webkit-text-fill-color:var(--accent-contrast)!important;background:var(--accent)!important;
            }
            body.fluent-v2 button.fluent-btn-primary:hover,body.fluent-v2 button.fluent-btn-primary:focus-visible{
                color:var(--accent-contrast)!important;-webkit-text-fill-color:var(--accent-contrast)!important;background:var(--accent-hover)!important;
            }
            body.fluent-v2 .fluent-runtime-input-wrapper{
                min-height:40px!important;border-radius:10px!important;padding:0 12px!important;
                background:var(--fluent-control)!important;border:1px solid var(--fluent-border)!important;
            }
            body.fluent-v2 .fluent-runtime-input-wrapper::before{border-radius:10px!important}
            body.fluent-v2 .fluent-runtime-input-wrapper:focus-within{
                border-color:var(--accent)!important;box-shadow:0 0 0 2px rgba(var(--accent-rgb,0,120,212),.2)!important;
            }
            body.fluent-v2 .fluent-runtime-textarea-wrapper{border-radius:10px!important;padding:10px 12px!important}
            body.fluent-v2 .fluent-runtime-input-wrapper .fluent-input{min-height:0!important;padding:9px 0!important;border-radius:0!important}
            .fluent-runtime-input-wrapper{width:100%;min-width:0}
            .fluent-runtime-textarea-wrapper{align-items:stretch;padding:8px 12px}
            .fluent-runtime-textarea-wrapper textarea.fluent-input{width:100%;min-height:90px;padding:0;resize:vertical}
            select.fluent-runtime-select{
                appearance:none!important;-webkit-appearance:none!important;min-height:36px!important;padding:7px 34px 7px 12px!important;cursor:pointer!important;font:400 14px/20px 'Segoe UI Variable','Segoe UI',system-ui,sans-serif!important;
                color:var(--text-primary)!important;border:1px solid var(--border-color)!important;border-radius:var(--radius-sm)!important;outline:0!important;background-color:var(--bg-tertiary)!important;
                background-image:linear-gradient(45deg,transparent 50%,var(--fluent-text) 50%),linear-gradient(135deg,var(--fluent-text) 50%,transparent 50%)!important;
                background-position:calc(100% - 15px) 14px,calc(100% - 10px) 14px!important;background-size:5px 5px,5px 5px!important;background-repeat:no-repeat!important;
            }
            input.fluent-runtime-check[type="checkbox"],input.fluent-runtime-check[type="radio"]{
                appearance:none!important;-webkit-appearance:none!important;width:18px!important;height:18px!important;margin:0 6px 0 0!important;
                vertical-align:-3px;border:1px solid color-mix(in srgb,var(--fluent-text) 62%,transparent)!important;background:var(--fluent-control)!important;cursor:pointer!important;
            }
            input.fluent-runtime-check[type="checkbox"]{border-radius:4px!important}
            input.fluent-runtime-check[type="radio"]{border-radius:50%!important}
            input.fluent-runtime-check:checked{border-color:var(--fluent-accent)!important;background:var(--fluent-accent)!important;box-shadow:inset 0 0 0 4px var(--fluent-accent)!important}
            input.fluent-runtime-check[type="checkbox"]:checked{background:var(--fluent-accent) center/12px 12px no-repeat!important;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='white' stroke-width='2' d='m3 8 3 3 7-7'/%3E%3C/svg%3E")!important}
            input.fluent-runtime-check[type="radio"]:checked{box-shadow:inset 0 0 0 4px var(--fluent-accent),inset 0 0 0 7px #fff!important}
        ` : '';
        const fluentRuntime = app.forceFluentUI ? `
            (()=>{const decorate=node=>{if(!(node instanceof Element)||node.dataset.fluentRuntimeReady==='true')return;
            if(node.matches('button')){node.classList.add('fluent-btn','fluent-btn-medium');const primary=node.matches('[data-accent],[data-fluent-variant="primary"],.primary,.fluent-btn-primary');node.classList.add(primary?'fluent-btn-primary':'fluent-btn-secondary');node.dataset.fluentRuntimeReady='true';return}
            if(node.matches('input[type="checkbox"],input[type="radio"]')){node.classList.add('fluent-runtime-check');node.dataset.fluentRuntimeReady='true';return}
            if(node.matches('input[type="range"]')){node.classList.add('fluent-slider');const sync=()=>{const min=Number(node.min)||0,max=Number(node.max)||100,value=Number(node.value)||0;node.style.setProperty('--fluent-slider-progress',Math.max(0,Math.min(100,(value-min)*100/Math.max(1,max-min)))+'%')};node.addEventListener('input',sync);sync();node.dataset.fluentRuntimeReady='true';return}
            if(node.matches('select')){node.classList.add('fluent-runtime-select');node.dataset.fluentRuntimeReady='true';return}
            if(node.matches('input,textarea')){node.classList.add('fluent-input');if(!node.parentElement?.classList.contains('fluent-runtime-input-wrapper')){const wrapper=document.createElement('div');wrapper.className='fluent-input-wrapper fluent-runtime-input-wrapper'+(node.matches('textarea')?' fluent-runtime-textarea-wrapper':'');node.before(wrapper);wrapper.appendChild(node)}node.dataset.fluentRuntimeReady='true'}};
            const apply=root=>{if(root.nodeType===1)decorate(root);root.querySelectorAll?.('button,input,select,textarea').forEach(decorate)};apply(document);new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(apply))).observe(document.documentElement,{childList:true,subtree:true})})();
        ` : '';
        const bridge = `
            (()=>{
            let seq=0,port=null;
            const pending=new Map(),queuedSignals=[],maxPending=64,handshakeToken=${JSON.stringify(handshakeToken)},forceUI=${app.forceFluentUI === true};
            let hostState={theme:'light',isDark:false,accentColor:'#0078d4',language:'zh',windowBlurEnabled:false,buttonGlowEnabled:true};
            const resolveTargets=target=>typeof target==='string'?[...document.querySelectorAll(target)]:(target instanceof Element?[target]:(target&&typeof target.length==='number'?[...target].filter(item=>item instanceof Element):[]));
            const highlightButton=(target,enabled=true)=>{const items=resolveTargets(target).filter(item=>item.matches('button,[role="button"]'));items.forEach(item=>{item.classList.add('fluent-btn','fluent-btn-medium');item.classList.toggle('fluent-btn-primary',enabled);item.classList.toggle('fluent-btn-secondary',!enabled)});return items.length};
            const enableButtonGlow=(target,enabled=true)=>{const items=resolveTargets(target).filter(item=>item.matches('button,[role="button"],a[href]'));items.forEach(item=>{item.classList.toggle('button-glow-disabled',!enabled);if(!enabled||item.dataset.fluentGlowReady==='true')return;item.dataset.fluentGlowReady='true';item.classList.add('button-glow-target');const edge=document.createElement('span');edge.className='button-edge-glow';edge.setAttribute('aria-hidden','true');item.appendChild(edge);item.addEventListener('pointermove',event=>{const rect=item.getBoundingClientRect();item.style.setProperty('--button-glow-x',event.clientX-rect.left+'px');item.style.setProperty('--button-glow-y',event.clientY-rect.top+'px');item.classList.add('button-glow-hover')});item.addEventListener('pointerleave',()=>item.classList.remove('button-glow-hover'));item.addEventListener('pointerdown',event=>{if(event.button!==0)return;const rect=item.getBoundingClientRect(),size=Math.max(rect.width,rect.height)*2.25,ripple=document.createElement('span');ripple.className='button-glow-ripple';ripple.style.cssText='width:'+size+'px;height:'+size+'px;left:'+(event.clientX-rect.left)+'px;top:'+(event.clientY-rect.top)+'px';item.appendChild(ripple);ripple.addEventListener('animationend',()=>ripple.remove(),{once:true})})});return items.length};
            const settle=(id,ok,value)=>{const item=pending.get(id);if(!item)return;pending.delete(id);clearTimeout(item.timer);ok?item.resolve(value):item.reject(value instanceof Error?value:new Error(String(value||'API failed')))};
            const rejectPending=message=>[...pending.keys()].forEach(id=>settle(id,false,new Error(message)));
            const send=message=>{if(!port)return false;port.postMessage(message);return true};
            const emit=message=>{if(port){try{return send(message)}catch(_){return false}}if(queuedSignals.length<8)queuedSignals.push(message);return false};
            const applyHostState=payload=>{hostState={...hostState,...payload};const root=document.documentElement,body=document.body,dark=hostState.isDark===true,blur=Math.max(10,Math.min(70,Number(hostState.blurIntensity)||40)),accent=hostState.accentColor||'#0078d4';root.dataset.fluentTheme=hostState.theme||'light';root.style.setProperty('--fluent-accent',accent);root.style.setProperty('--accent',accent);root.style.setProperty('--accent-hover',hostState.accentHover||accent);root.style.setProperty('--accent-rgb',(hostState.accentRgb||[0,120,212]).join(','));root.style.setProperty('--accent-contrast',hostState.accentContrast||'#fff');root.style.setProperty('--fluent-bg',dark?'#202020':'#f3f3f3');root.style.setProperty('--fluent-control',dark?'#2d2d2d':'#fff');root.style.setProperty('--fluent-control-hover',dark?'#353535':'#f9f9f9');root.style.setProperty('--fluent-text',dark?'#fff':'#1b1b1b');root.style.setProperty('--fluent-subtle',dark?'#c8c8c8':'#5d5d5d');root.style.setProperty('--bg-primary',dark?'#202020':'#f3f3f3');root.style.setProperty('--bg-secondary',dark?'rgba(32,32,32,.72)':'rgba(255,255,255,.72)');root.style.setProperty('--bg-tertiary',dark?'rgba(32,32,32,.5)':'rgba(255,255,255,.5)');root.style.setProperty('--text-primary',dark?'#fff':'#1b1b1b');root.style.setProperty('--text-secondary',dark?'#c8c8c8':'#5d5d5d');root.style.setProperty('--text-tertiary',dark?'#9d9d9d':'#767676');root.style.setProperty('--border-color',dark?'rgba(255,255,255,.12)':'rgba(0,0,0,.12)');root.style.setProperty('--radius-sm','8px');root.style.setProperty('--transition-fast','.15s ease-out');root.style.setProperty('--v2-blur',blur+'px');root.style.setProperty('--v2-blur-light',Math.max(8,Math.round(blur*.5))+'px');root.lang=hostState.language||'zh';body.classList.toggle('dark-mode',dark);body.classList.toggle('fluent-v2',forceUI&&hostState.fluentV2!==false);body.classList.toggle('blur-disabled',hostState.blurEnabled===false);body.classList.toggle('window-blur-enabled',hostState.windowBlurEnabled===true);body.classList.toggle('window-blur-disabled',hostState.windowBlurEnabled!==true);body.classList.toggle('button-glow-enabled',hostState.buttonGlowEnabled!==false);body.classList.toggle('material-mica',hostState.material==='mica');body.classList.toggle('material-gaussian',hostState.material!=='mica');dispatchEvent(new CustomEvent('fluentosstatechange',{detail:{...hostState}}))};
            const onPortMessage=event=>{const message=event.data||{};if(message.type==='fluentos:api-result')settle(message.id,message.ok===true,message.ok===true?message.value:(message.error||'API failed'));else if(message.type==='fluentos:host-state')applyHostState(message.payload||{});else if(message.type==='fluentos:bridge-closed'){rejectPending('FluentOS bridge closed');try{port&&port.close()}catch(_){}port=null}};
            const onConnect=event=>{const message=event.data||{},nextPort=event.ports&&event.ports[0];if(event.source!==parent||message.type!=='fluentos:connect'||message.token!==handshakeToken||!nextPort||port)return;removeEventListener('message',onConnect);port=nextPort;port.onmessage=onPortMessage;port.onmessageerror=()=>rejectPending('FluentOS bridge message failed');port.start&&port.start();pending.forEach((item,id)=>{if(item.sent)return;try{item.sent=send(item.packet)}catch(error){settle(id,false,error)}});queuedSignals.splice(0).forEach(emit)};
            addEventListener('message',onConnect);
            window.FluentOS={call(method,args={}){return new Promise((resolve,reject)=>{if(pending.size>=maxPending){reject(new Error('Too many pending API requests'));return}const methodName=String(method||''),id='api-'+(++seq),timeout=methodName.startsWith('network.')?20000:(methodName==='dialog.show'?300000:5000),packet={type:'fluentos:api',id,method:methodName,args};const item={resolve,reject,packet,sent:false,timer:null};item.timer=setTimeout(()=>settle(id,false,new Error('API request timed out')),timeout);pending.set(id,item);if(port){try{item.sent=send(packet)}catch(error){settle(id,false,error)}}})},
            notify(title,message,type='info'){const args=title&&typeof title==='object'?title:{title,message,type};return this.call('notification.show',args)},
            dialog(options={},message='',type='info'){const args=options&&typeof options==='object'?{...options}:{title:options,message,type};return this.call('dialog.show',args)},
            alert(title,message='',type='info'){const args=title&&typeof title==='object'?{...title}:{title,message,type};args.mode='alert';return this.call('dialog.show',args)},
            confirm(title,message='',options={}){const args=title&&typeof title==='object'?{...title}:{...(options&&typeof options==='object'?options:{}),title,message};args.mode='confirm';return this.call('dialog.show',args)},
            get state(){return {...hostState}},getTheme(){return this.call('system.theme')},getThemeMode(){return this.call('system.themeMode')},getAccentColor(){return this.call('system.accentColor')},getSystemState(){return this.call('system.state')},getLanguage(){return this.call('system.language')},isWindowBlurEnabled(){return this.call('system.windowBlurEnabled')},
            storage:{get:key=>FluentOS.call('storage.get',{key}),set:(key,value)=>FluentOS.call('storage.set',{key,value}),remove:key=>FluentOS.call('storage.remove',{key})},
            openApp:id=>FluentOS.call('shell.openApp',{id}),openExternal:url=>FluentOS.call('shell.openExternal',{url}),
            clipboard:{read:()=>FluentOS.call('clipboard.read'),write:text=>FluentOS.call('clipboard.write',{text})},
            getWindowInfo(){return this.call('window.info')},
            system:{setTheme:mode=>FluentOS.call('system.setTheme',{mode}),toggleTheme:()=>FluentOS.call('system.toggleTheme'),isWindowBlurEnabled:()=>FluentOS.call('system.windowBlurEnabled')},
            window:{setTitle:title=>FluentOS.call('window.setTitle',{title}),setSize:(width,height)=>FluentOS.call('window.setSize',{width,height})},
            files:{listText:(folder='documents')=>FluentOS.call('files.listText',{folder}),readText:id=>FluentOS.call('files.readText',{id}),writeText:(id,content)=>FluentOS.call('files.writeText',{id,content}),createText:(name,content='')=>FluentOS.call('files.createText',{name,content})},
            desktop:{addShortcut:()=>FluentOS.call('desktop.addShortcut'),removeShortcut:()=>FluentOS.call('desktop.removeShortcut')},
            network:{request:(url,options={})=>FluentOS.call('network.request',{url,options}),loadImage:url=>FluentOS.call('network.loadImage',{url})},
            ui:{highlightButton,enableButtonGlow,dialog:(...args)=>FluentOS.dialog(...args),alert:(...args)=>FluentOS.alert(...args),confirm:(...args)=>FluentOS.confirm(...args)}};
            addEventListener('error',event=>emit({type:'fluentos:runtime-error',message:event.message,filename:event.filename||'app.js',line:Math.max(0,(Number(event.lineno)||0)-__APP_LINE_OFFSET__),column:Number(event.colno)||0}));
            addEventListener('unhandledrejection',event=>emit({type:'fluentos:runtime-error',message:String(event.reason||'Unhandled promise rejection')}));
            addEventListener('pointerdown',()=>emit({type:'fluentos:focus-request'}),true);
            addEventListener('pagehide',()=>{emit({type:'fluentos:disconnect'});try{port&&port.close()}catch(_){}port=null;rejectPending('FluentOS bridge closed')},{once:true,capture:true});
            parent.postMessage({type:'fluentos:ready',token:handshakeToken},'*');
            })();
        `;
        const fluentStylesheet = app.forceFluentUI ? `<style>${this._getFluentUiCss().replace(/<\/style/gi, '<\\/style')}</style>` : '';
        let allowedImageSources = '';
        try {
            allowedImageSources = capabilityProfile.network.image
                .map((hostname) => ` https://${hostname}`)
                .join('');
        } catch (_) {}
        const csp = `default-src 'none'; script-src 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:${allowedImageSources}; font-src 'self' data:; connect-src 'none'; frame-src 'none'; media-src 'none'; object-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'; navigate-to 'none'`;
        const safeJs = String(app.js || '').replace(/<\/script/gi, '<\\/script');
        const safeCss = String(app.css || '').replace(/<\/style/gi, '<\\/style');
        const html = String(app.html || '<main><h1>Hello, FluentOS!</h1></main>');
        let documentPrefix = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${baseCss}</style><style>${safeCss}</style>${fluentStylesheet}<style>${forceCss}</style></head><body>${html}<script>${bridge}<\/script><script>${fluentRuntime}<\/script><script>`;
        const appLineOffset = documentPrefix.split('\n').length - 1;
        documentPrefix = documentPrefix.replace('__APP_LINE_OFFSET__', String(appLineOffset));
        return `${documentPrefix}${safeJs}<\/script></body></html>`;
    },

    escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
    },

    getHostState(windowId = null) {
        const isDark = document.body.classList.contains('dark-mode');
        const rootStyle = getComputedStyle(document.documentElement);
        const accentColor = rootStyle.getPropertyValue('--accent').trim() || State.settings.accentColor || '#0078d4';
        const accentHover = rootStyle.getPropertyValue('--accent-hover').trim() || accentColor;
        const accentContrast = rootStyle.getPropertyValue('--accent-contrast').trim() || '#ffffff';
        const hex = String(accentColor).replace('#', '');
        const normalizedHex = hex.length === 3 ? hex.split('').map((part) => part + part).join('') : hex;
        const accentRgb = /^[0-9a-f]{6}$/i.test(normalizedHex)
            ? [0, 2, 4].map((index) => parseInt(normalizedHex.slice(index, index + 2), 16))
            : [0, 120, 212];
        return {
            theme: isDark ? 'dark' : 'light',
            mode: isDark ? 'dark' : 'light',
            isDark,
            language: typeof I18n !== 'undefined' ? I18n.currentLang : 'zh',
            accentColor,
            accentHover,
            accentContrast,
            accentRgb,
            fluentV2: State.settings.enableFluentV2 !== false,
            material: State.settings.materialType || 'gaussian',
            blurEnabled: State.settings.enableBlur !== false,
            windowBlurEnabled: State.settings.enableBlur !== false && State.settings.enableWindowBlur === true,
            buttonGlowEnabled: State.settings.enableButtonGlowEffect !== false,
            blurIntensity: Math.max(10, Math.min(70, Number(State.settings.blurIntensity) || 40)),
            windowId
        };
    },

    _sendWindow(target, message, transfer = []) {
        try {
            target?.postMessage(message, '*', transfer);
            return true;
        } catch (_) { return false; }
    },

    _sendPort(registration, message) {
        if (!registration?.active || !registration.port) return false;
        try {
            registration.port.postMessage(message);
            return true;
        } catch (_) { return false; }
    },

    broadcastHostState() {
        this.frames.forEach((registration) => this._sendPort(registration, { type: 'fluentos:host-state', payload: this.getHostState(registration.windowId) }));
    },

    _onMessage(event) {
        const registration = this.frames.get(event.source);
        if (!registration?.active || registration.frame.contentWindow !== event.source) return;
        const message = event.data || {};
        // The ambient window channel is deliberately single-use. Every message
        // after this bootstrap travels over the transferred, unforgeable port.
        if (message.type !== 'fluentos:ready' || registration.handshakeComplete || message.token !== registration.handshakeToken) return;
        registration.handshakeComplete = true;
        const channel = new MessageChannel();
        registration.port = channel.port1;
        channel.port1.onmessage = (portEvent) => this._onPortMessage(registration, portEvent.data || {});
        channel.port1.onmessageerror = () => this._releaseFrame(registration);
        channel.port1.start?.();
        if (!this._sendWindow(event.source, { type: 'fluentos:connect', token: registration.handshakeToken }, [channel.port2])) {
            try { channel.port2.close(); } catch (_) {}
            this._releaseFrame(registration);
            return;
        }
        this._sendPort(registration, { type: 'fluentos:host-state', payload: this.getHostState(registration.windowId) });
    },

    async _onPortMessage(registration, message) {
        if (!registration?.active || this.frames.get(registration.target) !== registration) return;
        if (message.type === 'fluentos:focus-request') {
            WindowManager.focusWindow?.(registration.windowId);
            return;
        }
        if (message.type === 'fluentos:runtime-error') {
            console.warn(`[CreatedApp:${registration.appId}]`, message.message);
            try { registration.onRuntimeError?.(String(message.message || 'Severe runtime error'), message); }
            catch (error) { console.warn('[CreatedApp] Runtime error observer failed', error); }
            return;
        }
        if (message.type === 'fluentos:disconnect') {
            this._releaseFrame(registration);
            return;
        }
        if (message.type !== 'fluentos:api' || typeof message.id !== 'string' || !/^api-\d{1,16}$/.test(message.id)) return;
        if (registration.pendingIds.has(message.id)) {
            this._sendPort(registration, { type: 'fluentos:api-result', id: message.id, ok: false, error: 'Duplicate API request ID' });
            return;
        }
        if (registration.inFlight >= this.MAX_BRIDGE_IN_FLIGHT) {
            this._sendPort(registration, { type: 'fluentos:api-result', id: message.id, ok: false, error: 'Too many in-flight API requests' });
            return;
        }
        const method = typeof message.method === 'string' && message.method.length <= 80 ? message.method : '';
        const args = message.args && typeof message.args === 'object' && !Array.isArray(message.args) ? message.args : {};
        registration.inFlight += 1;
        registration.pendingIds.add(message.id);
        let ok = true;
        let value = null;
        let error = '';
        try { value = await this._invokeApi(registration, method, args); }
        catch (reason) { ok = false; error = reason?.message || String(reason); }
        finally {
            registration.inFlight = Math.max(0, registration.inFlight - 1);
            registration.pendingIds.delete(message.id);
        }
        this._sendPort(registration, { type: 'fluentos:api-result', id: message.id, ok, value, error });
    },

    _networkUrl(profile, group, value) {
        let url;
        try { url = new URL(String(value || '')); }
        catch (_) { throw new Error('A valid HTTPS URL is required'); }
        if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) {
            throw new Error('Only credential-free HTTPS URLs on the default port are allowed');
        }
        const allowed = group === 'image' ? profile.network.image : profile.network.connect;
        if (!allowed.includes(url.hostname.toLowerCase().replace(/\.$/, ''))) {
            throw new Error(`Domain is not in this App's ${group} allowlist`);
        }
        return url;
    },

    async _readLimitedResponse(response, maxBytes) {
        const declared = Number(response.headers.get('content-length'));
        if (Number.isFinite(declared) && declared > maxBytes) throw new Error('Network response is too large');
        if (!response.body?.getReader) {
            const bytes = new Uint8Array(await response.arrayBuffer());
            if (bytes.byteLength > maxBytes) throw new Error('Network response is too large');
            return bytes;
        }
        const reader = response.body.getReader();
        const chunks = [];
        let length = 0;
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                length += value.byteLength;
                if (length > maxBytes) throw new Error('Network response is too large');
                chunks.push(value);
            }
        } catch (error) {
            try { await reader.cancel(); } catch (_) {}
            throw error;
        }
        const output = new Uint8Array(length);
        let offset = 0;
        chunks.forEach((chunk) => { output.set(chunk, offset); offset += chunk.byteLength; });
        return output;
    },

    _bytesToDataUrl(bytes, mime) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('Could not decode the image response'));
            reader.readAsDataURL(new Blob([bytes], { type: mime }));
        });
    },

    async _networkRequest(profile, args) {
        const url = this._networkUrl(profile, 'connect', args.url);
        const input = args.options && typeof args.options === 'object' ? args.options : {};
        const method = String(input.method || 'GET').toUpperCase();
        if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) throw new Error('Unsupported network method');
        const headers = new Headers();
        const blockedHeader = /^(?:cookie|host|origin|referer|connection|content-length|proxy-|sec-)/i;
        Object.entries(input.headers && typeof input.headers === 'object' ? input.headers : {}).forEach(([name, value]) => {
            if (blockedHeader.test(name)) throw new Error(`Request header is not allowed: ${name}`);
            const text = String(value);
            if (name.length > 80 || text.length > 4096) throw new Error('Request header is too large');
            headers.set(name, text);
        });
        let body;
        if (input.body !== undefined && input.body !== null) {
            if (method === 'GET' || method === 'HEAD') throw new Error(`${method} requests cannot contain a body`);
            body = typeof input.body === 'string' ? input.body : JSON.stringify(input.body);
            if (new TextEncoder().encode(body).byteLength > 512 * 1024) throw new Error('Network request body is too large');
            if (typeof input.body !== 'string' && !headers.has('content-type')) headers.set('content-type', 'application/json');
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch(url.href, {
                method, headers, body, mode: 'cors', credentials: 'omit', cache: 'no-store',
                redirect: 'error', referrerPolicy: 'no-referrer', signal: controller.signal
            });
            // Redirects are disabled; this is a second invariant check for browser differences.
            this._networkUrl(profile, 'connect', response.url || url.href);
            const bytes = method === 'HEAD' ? new Uint8Array() : await this._readLimitedResponse(response, 2 * 1024 * 1024);
            return {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                url: response.url || url.href,
                headers: Object.fromEntries(response.headers.entries()),
                body: new TextDecoder().decode(bytes)
            };
        } finally { clearTimeout(timeout); }
    },

    async _networkImage(profile, args) {
        const url = this._networkUrl(profile, 'image', args.url);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        let response;
        try {
            response = await fetch(url.href, {
                method: 'GET', headers: { Accept: 'image/png,image/jpeg,image/gif,image/webp,image/avif,image/bmp,image/x-icon' },
                mode: 'cors', credentials: 'omit', cache: 'no-store', redirect: 'error',
                referrerPolicy: 'no-referrer', signal: controller.signal
            });
        } catch (error) {
            if (controller.signal.aborted) throw new Error('Image request timed out');
            // CORS opt-in is not required by <img>. Return only the already
            // validated URL and let the iframe's exact-host CSP enforce it;
            // the privileged host must not probe a cross-origin resource.
            return url.href;
        } finally { clearTimeout(timeout); }
        this._networkUrl(profile, 'image', response.url || url.href);
        if (!response.ok) throw new Error(`Image request failed with status ${response.status}`);
        const mime = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (!/^image\/(?:png|jpeg|gif|webp|avif|bmp|x-icon)$/.test(mime)) throw new Error('The response is not a supported raster image');
        return this._bytesToDataUrl(await this._readLimitedResponse(response, 5 * 1024 * 1024), mime);
    },

    async _invokeApi(registration, method, args) {
        if (!registration?.active) throw new Error('App frame is no longer active');
        const profile = registration.profile;
        if (!profile) throw new Error('App capability profile is unavailable');
        if (profile.readOnly && !this.READONLY_METHODS.includes(method)) {
            throw new Error('This validation session permits read-only FluentOS APIs only');
        }
        const requirePermission = (permission) => {
            const info = DeveloperCenterStore.permissionInfo(permission, 'en');
            if (!profile.declaredPermissions.includes(permission)) throw new Error(`Permission is not declared: ${info.name}`);
            if (!profile.permissions.includes(permission)) throw new Error(`Permission was denied: ${info.name}`);
        };
        const key = (value) => {
            const output = String(value ?? '').trim();
            if (!output || output.length > 80 || !/^[\w.-]+$/.test(output)) throw new Error('Invalid storage key');
            return output;
        };
        const storagePrefix = `fluentos.created.${profile.id}.`;
        const storageEntries = () => Object.keys(localStorage)
            .filter((itemKey) => itemKey.startsWith(storagePrefix))
            .map((itemKey) => ({ key: itemKey, value: localStorage.getItem(itemKey) ?? '' }));
        const utf8Bytes = (value) => new TextEncoder().encode(String(value)).byteLength;
        const displayText = (value, fallback = '', maxLength = 300) => {
            let output;
            if (value === undefined || value === null || value === '') output = fallback;
            else if (typeof value === 'string') output = value;
            else if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') output = String(value);
            else {
                try { output = JSON.stringify(value, null, 2); }
                catch (_) { output = String(value); }
            }
            return String(output ?? fallback).replace(/\u0000/g, '').slice(0, maxLength);
        };
        const entryBytes = (itemKey, value) => utf8Bytes(itemKey.slice(storagePrefix.length)) + utf8Bytes(value);
        const isInUserTextFolder = (node) => {
            const allowedRoots = new Set(['documents', 'downloads', 'desktop']);
            let current = node;
            for (let depth = 0; current && depth < 32; depth += 1) {
                const parent = State.findParentNode?.(current.id);
                if (!parent) return false;
                if (allowedRoots.has(parent.id)) return true;
                if (parent.id === 'recycle') return false;
                current = parent;
            }
            return false;
        };
        switch (method) {
            case 'notification.show': {
                const typeValue = String(args.type || 'info').toLowerCase();
                const type = ['info', 'success', 'warning', 'error'].includes(typeValue) ? typeValue : 'info';
                const title = displayText(args.title, profile.name, 80);
                const message = displayText(args.message ?? args.content, '', 300);
                State.addNotification({ title, message, type, sourceAppId: profile.id });
                if (typeof FluentUI !== 'undefined' && typeof FluentUI.Toast === 'function') {
                    const toast = FluentUI.Toast({ title, message, type, duration: 5000 });
                    const messageElement = toast?.element?.querySelector?.('.fluent-toast-message');
                    if (messageElement) messageElement.style.whiteSpace = 'pre-wrap';
                }
                return true;
            }
            case 'dialog.show': {
                if (typeof FluentUI === 'undefined' || typeof FluentUI.Dialog !== 'function') throw new Error('System dialogs are unavailable');
                if (registration.dialogs.size >= this.MAX_DIALOGS_PER_FRAME) throw new Error('Too many open dialogs');
                const mode = ['alert', 'confirm'].includes(String(args.mode || '').toLowerCase())
                    ? String(args.mode).toLowerCase()
                    : 'dialog';
                const typeValue = String(args.type || 'info').toLowerCase();
                const type = ['info', 'warning', 'error'].includes(typeValue) ? typeValue : 'info';
                const title = displayText(args.title, profile.name, 80);
                const content = displayText(args.message ?? args.content, '', 1000);
                const language = typeof I18n !== 'undefined' ? I18n.currentLang : 'zh';
                const confirmText = displayText(args.confirmText, language === 'en' ? 'OK' : '确定', 30);
                const cancelText = displayText(args.cancelText, language === 'en' ? 'Cancel' : '取消', 30);
                const variants = new Set(['primary', 'secondary', 'danger']);
                let buttons = Array.isArray(args.buttons) ? args.buttons.slice(0, 3).map((button, index) => ({
                    text: this.escapeHtml(displayText(button?.text ?? button?.label, index === 0 ? confirmText : `${language === 'en' ? 'Option' : '选项'} ${index + 1}`, 30)),
                    variant: variants.has(String(button?.variant || '')) ? String(button.variant) : (index === 0 ? 'primary' : 'secondary'),
                    value: button && Object.prototype.hasOwnProperty.call(button, 'value') ? button.value : index
                })) : [];
                if (!buttons.length && mode === 'confirm') {
                    buttons = [
                        { text: this.escapeHtml(cancelText), variant: 'secondary', value: false },
                        { text: this.escapeHtml(confirmText), variant: 'primary', value: true }
                    ];
                } else if (!buttons.length) {
                    buttons = [{ text: this.escapeHtml(confirmText), variant: 'primary', value: true }];
                }
                WindowManager.focusWindow?.(registration.windowId);
                return new Promise((resolve) => {
                    let dialogRef = null;
                    let settled = false;
                    const finish = (value) => {
                        if (settled) return;
                        settled = true;
                        if (dialogRef) registration.dialogs.delete(dialogRef);
                        resolve(value ?? null);
                    };
                    dialogRef = FluentUI.Dialog({
                        type,
                        title: this.escapeHtml(title),
                        content: this.escapeHtml(content).replace(/\r?\n/g, '<br>'),
                        buttons,
                        closeOnOverlay: args.closeOnOverlay !== false,
                        onClose: finish
                    });
                    registration.dialogs.add(dialogRef);
                });
            }
            case 'system.theme': return this.getHostState(registration.windowId);
            case 'system.themeMode': return this.getHostState(registration.windowId).theme;
            case 'system.accentColor': return this.getHostState(registration.windowId).accentColor;
            case 'system.state': return this.getHostState(registration.windowId);
            case 'system.language': return this.getHostState().language;
            case 'system.windowBlurEnabled': return this.getHostState(registration.windowId).windowBlurEnabled;
            case 'storage.get': return JSON.parse(localStorage.getItem(`${storagePrefix}${key(args.key)}`) || 'null');
            case 'storage.set': {
                if (args.value === undefined) throw new Error('Storage value cannot be undefined');
                const serialized = JSON.stringify(args.value);
                if (serialized === undefined) throw new Error('Storage value is not JSON-serializable');
                const serializedBytes = utf8Bytes(serialized);
                if (serializedBytes > this.MAX_STORAGE_VALUE_BYTES) throw new Error('Storage value is too large');
                const itemKey = `${storagePrefix}${key(args.key)}`;
                const entries = storageEntries();
                const existing = entries.find((entry) => entry.key === itemKey);
                if (!existing && entries.length >= this.MAX_STORAGE_KEYS) throw new Error(`Storage is limited to ${this.MAX_STORAGE_KEYS} keys per App`);
                const usedBytes = entries.reduce((total, entry) => total + entryBytes(entry.key, entry.value), 0);
                const nextBytes = usedBytes - (existing ? entryBytes(existing.key, existing.value) : 0) + entryBytes(itemKey, serialized);
                if (nextBytes > this.MAX_STORAGE_BYTES) throw new Error('App storage quota exceeded');
                localStorage.setItem(itemKey, serialized);
                return true;
            }
            case 'storage.remove': localStorage.removeItem(`${storagePrefix}${key(args.key)}`); return true;
            case 'shell.openApp': {
                const id = String(args.id || '');
                const target = Desktop.apps.find((item) => item.id === id);
                if (!WindowManager.appConfigs[id] || !target || target.developerCreated === true) throw new Error('App is not available to this API');
                WindowManager.openApp(id); return true;
            }
            case 'shell.openExternal': {
                const url = new URL(String(args.url || ''));
                if (url.protocol !== 'https:') throw new Error('Only HTTPS links are allowed');
                window.open(url.href, '_blank', 'noopener,noreferrer'); return true;
            }
            case 'clipboard.read':
                requirePermission('clipboard.read');
                return navigator.clipboard?.readText ? navigator.clipboard.readText() : Promise.reject(new Error('Clipboard is unavailable'));
            case 'clipboard.write':
                requirePermission('clipboard.write');
                return navigator.clipboard?.writeText ? navigator.clipboard.writeText(String(args.text ?? '').slice(0, 100000)).then(() => true) : Promise.reject(new Error('Clipboard is unavailable'));
            case 'window.info': {
                const win = WindowManager.windows.find((item) => item.id === registration.windowId);
                return { appId: profile.id, title: profile.title, maximized: win?.isMaximized === true, width: win?.element?.offsetWidth || 0, height: win?.element?.offsetHeight || 0 };
            }
            case 'system.setTheme': {
                requirePermission('system.theme.write');
                const mode = String(args.mode || '');
                if (!['light', 'dark', 'auto'].includes(mode)) throw new Error('Theme must be light, dark, or auto');
                State.updateSettings({ theme: mode });
                return this.getHostState(registration.windowId);
            }
            case 'system.toggleTheme': {
                requirePermission('system.theme.write');
                State.updateSettings({ theme: document.body.classList.contains('dark-mode') ? 'light' : 'dark' });
                return this.getHostState(registration.windowId);
            }
            case 'window.setTitle': {
                requirePermission('window.manage');
                const title = String(args.title || '').trim().slice(0, 80);
                if (!title) throw new Error('Window title cannot be empty');
                const win = WindowManager.windows.find((item) => item.id === registration.windowId);
                const titleElement = win?.element?.querySelector('.window-title');
                if (!win || !titleElement) throw new Error('App window is unavailable');
                titleElement.textContent = title;
                return true;
            }
            case 'window.setSize': {
                requirePermission('window.manage');
                const win = WindowManager.windows.find((item) => item.id === registration.windowId);
                if (!win?.element || win.isMaximized) throw new Error('The window cannot be resized while maximized');
                const width = Math.max(420, Math.min(Number(args.width) || 0, Math.max(420, window.innerWidth - 24)));
                const height = Math.max(300, Math.min(Number(args.height) || 0, Math.max(300, window.innerHeight - 72)));
                win.element.style.width = `${Math.round(width)}px`;
                win.element.style.height = `${Math.round(height)}px`;
                win.snapLayout = null;
                WindowManager._persistWindowBounds?.(win);
                return { width: Math.round(width), height: Math.round(height) };
            }
            case 'files.readText': {
                requirePermission('files.readText');
                const node = State.findNode(String(args.id || ''));
                if (!node || node.type !== 'file' || typeof node.content !== 'string') throw new Error('Text file was not found');
                if (!isInUserTextFolder(node)) throw new Error('The file is outside the allowed user folders');
                if (new TextEncoder().encode(node.content).length > 512 * 1024) throw new Error('Text file is larger than 512 KB');
                if (String(node.mime || '').match(/^(?:image|audio|video)\//)) throw new Error('Only text files can be read');
                return { id: node.id, name: node.name, content: node.content, modified: node.modified || null };
            }
            case 'files.listText': {
                requirePermission('files.readText');
                const folderId = String(args.folder || 'documents');
                if (!['documents', 'downloads', 'desktop'].includes(folderId)) throw new Error('Only Documents, Downloads, and Desktop can be listed');
                const folder = State.findNode(folderId);
                if (!folder || folder.type !== 'folder') throw new Error('Folder is unavailable');
                return (folder.children || [])
                    .filter((node) => node.type === 'file' && typeof node.content === 'string' && !String(node.mime || '').match(/^(?:image|audio|video)\//))
                    .slice(0, 200)
                    .map((node) => ({ id: node.id, name: node.name, size: Number(node.size) || new TextEncoder().encode(node.content).length, modified: node.modified || null }));
            }
            case 'files.writeText': {
                requirePermission('files.writeText');
                const node = State.findNode(String(args.id || ''));
                if (!node || node.type !== 'file' || typeof node.content !== 'string') throw new Error('Text file was not found');
                if (!isInUserTextFolder(node)) throw new Error('The file is outside the allowed user folders');
                if (String(node.mime || '').match(/^(?:image|audio|video)\//)) throw new Error('Only text files can be written');
                const content = String(args.content ?? '');
                const size = new TextEncoder().encode(content).length;
                if (size > 512 * 1024) throw new Error('Text content is larger than 512 KB');
                node.content = content;
                node.size = size;
                node.modified = new Date().toISOString();
                State.updateFS(State.fs);
                return true;
            }
            case 'files.createText': {
                requirePermission('files.writeText');
                const name = String(args.name || '').trim();
                if (!name || name.length > 120 || !/\.(?:txt|md|json|html|css|js)$/i.test(name) || /[\\/:*?"<>|\x00-\x1f]/.test(name)) {
                    throw new Error('Use a safe text filename with a supported extension');
                }
                const content = String(args.content ?? '');
                const size = new TextEncoder().encode(content).length;
                if (size > 512 * 1024) throw new Error('Text content is larger than 512 KB');
                const folder = State.findNode('documents');
                if (!folder || folder.type !== 'folder') throw new Error('Documents folder is unavailable');
                folder.children = folder.children || [];
                if (folder.children.some((item) => String(item.name || '').toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('A file with this name already exists');
                const now = new Date().toISOString();
                const node = { id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, type: 'file', content, size, mime: 'text/plain', created: now, modified: now };
                folder.children.push(node);
                State.updateFS(State.fs);
                return { id: node.id, name: node.name };
            }
            case 'desktop.addShortcut':
                requirePermission('desktop.manage');
                return Desktop.addAppShortcut(profile.id);
            case 'desktop.removeShortcut':
                requirePermission('desktop.manage');
                Desktop.removeAppShortcut(profile.id);
                return true;
            case 'network.request':
                requirePermission('network.request');
                return this._networkRequest(profile, args);
            case 'network.loadImage':
                requirePermission('network.image');
                return this._networkImage(profile, args);
            default: throw new Error('API is not permitted');
        }
    },

    _addShellApp(app) {
        if (typeof Desktop === 'undefined') return;
        const entry = {
            id: app.id,
            name: app.name,
            icon: app.icon || 'Theme/Icon/App_icon/created_app.png',
            isNative: app.type !== 'pwa',
            isPWA: app.type === 'pwa',
            isSystem: false,
            developerCreated: true
        };
        const index = Desktop.apps.findIndex((item) => item.id === app.id);
        if (index >= 0) Desktop.apps[index] = entry;
        else Desktop.apps.push(entry);
        // Imported and developer-created Apps are user Apps. Remove stale IDs
        // added by older builds so the system uninstall entry stays available.
        if (typeof StartMenu !== 'undefined' && Array.isArray(StartMenu.systemApps)) {
            StartMenu.systemApps = StartMenu.systemApps.filter((id) => id !== app.id);
        }
    },

    async unregister(appId, options = {}) {
        const app = this.apps.get(appId);
        if (options.closeWindows !== false && typeof WindowManager !== 'undefined') {
            WindowManager.windows.filter((win) => win.appId === appId).forEach((win) => WindowManager.closeWindow(win.id));
        }
        [...this.frames.values()]
            .filter((registration) => registration.appId === appId)
            .forEach((registration) => this._releaseFrame(registration));
        if (app?.type === 'pwa' && typeof PWALoader !== 'undefined') PWALoader.unregister(appId);
        const config = typeof WindowManager !== 'undefined' ? WindowManager.appConfigs[appId] : null;
        if (config?.component && String(config.component).startsWith('CreatedApp_')) delete globalThis[config.component];
        if (typeof WindowManager !== 'undefined') delete WindowManager.appConfigs[appId];
        this.apps.delete(appId);
        if (options.keepShell !== true && typeof Desktop !== 'undefined') {
            Desktop.apps = Desktop.apps.filter((item) => item.id !== appId);
            Desktop.removeAppShortcut?.(appId);
            if (typeof StartMenu !== 'undefined' && Array.isArray(StartMenu.systemApps)) {
                StartMenu.systemApps = StartMenu.systemApps.filter((id) => id !== appId);
            }
            const prefix = `fluentos.created.${appId}.`;
            Object.keys(localStorage).filter((key) => key.startsWith(prefix)).forEach((key) => localStorage.removeItem(key));
            this.clearPermissionDecisions(appId);
        }
        this.refreshShell();
    },

    openPreview(app) {
        const previewId = 'developer-center-preview';
        const previewApp = { ...app, id: previewId, name: app.name || 'Preview', title: app.title || app.name || 'Preview' };
        this.apps.set(previewId, previewApp);
        WindowManager.appConfigs[previewId] = {
            title: `${previewApp.title} — Preview`,
            icon: previewApp.icon || 'Theme/Icon/App_icon/created_app.png',
            width: 1000, height: 700, minWidth: 520, minHeight: 360,
            component: 'DeveloperCenterPreviewApp'
        };
        const existingWindow = WindowManager.windows.find((item) => item.appId === previewId);
        if (existingWindow?.element) {
            const title = existingWindow.element.querySelector('.window-title');
            const icon = existingWindow.element.querySelector('.window-icon');
            if (title) title.textContent = `${previewApp.title} — Preview`;
            if (icon) icon.src = previewApp.icon || 'Theme/Icon/App_icon/created_app.png';
        }
        DeveloperCenterPreviewApp.setApp(previewApp);
        WindowManager.openApp(previewId);
    },

    refreshShell() {
        if (typeof Desktop !== 'undefined' && Desktop.iconsContainer) Desktop.renderIcons?.();
        if (typeof StartMenu !== 'undefined' && StartMenu.appsGrid) StartMenu.renderApps?.();
    }
};

const DeveloperCenterPreviewApp = {
    app: null,
    windowId: null,
    container: null,
    frame: null,

    setApp(app) {
        this.app = app;
        if (this.container?.isConnected) this.render();
    },

    init(windowId) {
        this.windowId = windowId;
        this.container = document.getElementById(windowId)?.querySelector('.window-content') || null;
        if (!this.container || !this.app) return false;
        this.render();
        return true;
    },

    render() {
        if (!this.container || !this.app) return;
        if (this.frame?.contentWindow) DeveloperCreatedRuntime._releaseFrame(this.frame.contentWindow);
        DeveloperCreatedRuntime.apps.set(this.app.id, this.app);
        this.frame = DeveloperCreatedRuntime.mountAppFrame(this.container, this.app, this.app.id, this.windowId, { preview: true });
    },

    beforeClose() {
        if (this.frame?.contentWindow) DeveloperCreatedRuntime._releaseFrame(this.frame.contentWindow);
        DeveloperCreatedRuntime.apps.delete('developer-center-preview');
        this.frame = null;
        this.container = null;
        this.windowId = null;
        return true;
    }
};

window.DeveloperCreatedRuntime = DeveloperCreatedRuntime;
window.DeveloperCenterPreviewApp = DeveloperCenterPreviewApp;
