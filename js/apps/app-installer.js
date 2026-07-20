/** Unified, non-executing installer for Fluent .fap packages. */
const AppInstallerApp = {
    handlesInitialOpenData: true,
    windowId: null,
    container: null,
    packageFile: null,
    importedApp: null,
    existingApp: null,
    installedApp: null,
    _runToken: 0,

    _english() {
        return typeof I18n !== 'undefined' && I18n.currentLang === 'en';
    },

    _text(zh, en) {
        return this._english() ? en : zh;
    },

    _esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    },

    _delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    },

    init(windowId, data = null) {
        this.windowId = windowId;
        this.container = document.getElementById(windowId)?.querySelector('.window-content') || null;
        if (!this.container) return false;
        this.container.classList.add('app-installer-window-content');
        const title = document.getElementById(windowId)?.querySelector('.window-title');
        if (title) title.textContent = this._text('Fluent App安装工具', 'Fluent App Installer');
        this.openData(data || {});
        return true;
    },

    beforeClose() {
        this._runToken += 1;
        this.packageFile = null;
        this.importedApp = null;
        this.existingApp = null;
        this.installedApp = null;
        if (this.container) this.container.classList.remove('app-installer-window-content');
        this.container = null;
        this.windowId = null;
        return true;
    },

    async openData(data = {}) {
        const token = ++this._runToken;
        this.packageFile = null;
        this.importedApp = null;
        this.existingApp = null;
        this.installedApp = null;
        this._renderLoading(this._text('正在读取安装包…', 'Reading package…'));
        try {
            const file = await this._resolveFile(data);
            if (token !== this._runToken) return;
            this.packageFile = file;
            const imported = await DeveloperCenterStore.importApp(file);
            if (token !== this._runToken) return;
            if (!this._validName(imported.name, 60) || !this._validName(imported.title || imported.name, 80) || !this._safeIcon(imported.icon)) {
                throw new Error('unsafe_display_metadata');
            }
            const installedApps = await DeveloperCenterStore.getAll('apps');
            if (token !== this._runToken) return;
            const sourcePackageId = String(imported.sourcePackageId || '');
            this.existingApp = installedApps.find((app) => String(app.id || '') === sourcePackageId) ||
                installedApps
                    .filter((app) => sourcePackageId && String(app.sourcePackageId || '') === sourcePackageId)
                    .sort((left, right) => String(right.modifiedAt || '').localeCompare(String(left.modifiedAt || '')))[0] ||
                null;
            this.importedApp = imported;
            this._renderIntro();
        } catch (error) {
            if (token !== this._runToken) return;
            console.warn('[AppInstaller] Package could not be opened:', error);
            this._renderBlocked(this._packageErrorReason(error));
        }
    },

    _validName(value, maxLength) {
        const name = String(value || '').trim();
        return name.length > 0 && name.length <= maxLength && !/[<>&"'\x00-\x1f]/.test(name);
    },

    _safeIcon(value) {
        const icon = String(value || '');
        return /^Theme\/Icon\/[A-Za-z0-9 _./-]+$/.test(icon) || /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/i.test(icon);
    },

    async _resolveFile(data) {
        if (data?.packageFile) {
            const file = data.packageFile;
            if (!String(file.name || '').toLowerCase().endsWith('.fap')) throw new Error('unsupported_extension');
            return file;
        }
        const state = typeof State !== 'undefined' ? State : globalThis.State;
        const node = data?.fileId && state?.findNode?.(data.fileId);
        if (!node || node.type !== 'file' || !String(node.name || '').toLowerCase().endsWith('.fap')) {
            throw new Error('package_file_missing');
        }
        if (node.encoding === 'fap-package-cache') {
            const file = await DeveloperCenterStore.loadPackageFile(node.packageCacheId || node.content, node.name);
            if (!file) throw new Error('package_payload_missing');
            return file;
        }
        const value = String(node.content || '');
        const match = value.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/s);
        if (!match) throw new Error('package_payload_missing');
        const isBase64 = /^data:[^,]*;base64,/i.test(value);
        const raw = isBase64 ? atob(match[2]) : decodeURIComponent(match[2]);
        const bytes = new Uint8Array(raw.length);
        for (let index = 0; index < raw.length; index++) bytes[index] = raw.charCodeAt(index) & 255;
        try { return new File([bytes], node.name, { type: DeveloperCenterStore.PACKAGE_MIME }); }
        catch (_) {
            const blob = new Blob([bytes], { type: DeveloperCenterStore.PACKAGE_MIME });
            blob.name = node.name;
            return blob;
        }
    },

    _shell(content, footer = '') {
        if (!this.container) return;
        this.container.innerHTML = `<main class="app-installer"><div class="app-installer-body">${content}</div>${footer ? `<footer class="app-installer-footer">${footer}</footer>` : ''}</main>`;
    },

    _button(label, variant, action, disabled = false) {
        return `<button type="button" class="fluent-btn fluent-btn-${variant} fluent-btn-medium" data-installer-action="${action}"${disabled ? ' disabled' : ''}><span class="fluent-btn-text">${this._esc(label)}</span></button>`;
    },

    _bindActions(actions) {
        Object.entries(actions).forEach(([name, handler]) => {
            this.container?.querySelector(`[data-installer-action="${name}"]`)?.addEventListener('click', handler);
        });
    },

    _renderLoading(label) {
        this._shell(`<div class="app-installer-state"><span class="app-installer-spinner" aria-hidden="true"></span><h2>${this._esc(label)}</h2></div>`);
    },

    _renderIntro() {
        const app = this.importedApp;
        if (!app) return;
        const replacing = !!this.existingApp;
        const permissions = Array.isArray(app.permissions) ? app.permissions : [];
        const permissionHtml = permissions.length
            ? `<div class="app-installer-permissions"><strong>${this._text('此 App 请求的权限', 'Permissions requested')}</strong><div>${permissions.map((permission) => {
                const info = DeveloperCenterStore.permissionInfo(permission, this._english() ? 'en' : 'zh');
                return `<span class="app-installer-permission-name">${this._esc(info.name)}</span>`;
            }).join('')}</div></div>`
            : '';
        this._shell(`
            <div class="app-installer-summary">
                <img class="app-installer-app-icon" src="${this._esc(app.icon || 'Theme/Icon/App_icon/created_app.png')}" alt="">
                <h1>${this._esc(app.name)}</h1>
                <dl><div><dt>${this._text('开发者：', 'Developer:')}</dt><dd>${this._esc(app.developer)}</dd></div><div><dt>${this._text('App简介：', 'Description:')}</dt><dd>${this._esc(app.description)}</dd></div></dl>
                ${permissionHtml}
            </div>`,
            `${this._button(this._text('取消', 'Cancel'), 'secondary', 'cancel')}${this._button(replacing ? this._text('覆盖安装', 'Replace') : this._text('下一步', 'Next'), 'primary', 'next')}`
        );
        this._bindActions({ cancel: () => this._close(), next: () => this._runSafetyCheck() });
    },

    async _runSafetyCheck() {
        const token = ++this._runToken;
        this._shell(`<div class="app-installer-state"><span class="app-installer-spinner" aria-hidden="true"></span><h2>${this._text('正在进行安全检查', 'Running safety inspection')}</h2><p>${this._text('Fluent 正在静态检查安装包，不会运行其中的任何代码。', 'Fluent is inspecting the package statically. No App code will run.')}</p></div>`);
        const started = performance.now();
        const report = DeveloperCenterStore.inspectAppSafety(this.importedApp);
        await this._delay(Math.max(0, 1500 - (performance.now() - started)));
        if (token !== this._runToken) return;
        if (!report.ok) {
            this._renderBlocked(report.reason);
            return;
        }
        await this._installToLocalStorage(token);
    },

    async _installToLocalStorage(token) {
        this._shell(`<div class="app-installer-state"><span class="app-installer-spinner" aria-hidden="true"></span><h2>${this._text('正在安装 App', 'Installing App')}</h2><p>${this._text('正在将通过检查的程序保存到浏览器本地存储。', 'Saving the inspected App to browser local storage.')}</p></div>`);
        const started = performance.now();
        try {
            const app = await this._saveImportedApp(this.importedApp);
            await this._delay(Math.max(0, 1000 - (performance.now() - started)));
            if (token !== this._runToken) return;
            this.installedApp = app;
            this._renderComplete();
        } catch (_) {
            if (token !== this._runToken) return;
            this._renderBlocked('storage');
        }
    },

    async _saveImportedApp(imported) {
        const next = { ...imported };
        const existing = this.existingApp;
        if (existing) {
            next.id = existing.id;
            next.projectId = existing.projectId;
        }
        const originalName = next.name;
        let name = originalName;
        let suffix = 2;
        while (await DeveloperCenterStore.nameExists(name, existing?.projectId || null)) name = `${originalName} (${suffix++})`;
        if (next.title === originalName) next.title = name;
        next.name = name;
        next.permissions = Array.isArray(next.permissions) ? next.permissions : [];
        next.network = DeveloperCenterStore.normalizeNetworkConfig(next.network);
        next.importedFromFap = true;
        next.permissionConsentRequired = true;
        const project = await DeveloperCenterStore.saveProject({
            id: next.projectId,
            name: next.name,
            type: next.type,
            title: next.title,
            description: next.description,
            developer: next.developer,
            developerHash: next.developerHash,
            icon: next.icon,
            url: next.url,
            html: next.html,
            css: next.css,
            js: next.js,
            forceFluentUI: next.forceFluentUI === true,
            permissions: next.permissions,
            network: next.network,
            importedFromFap: true,
            permissionConsentRequired: true,
            sourcePackageId: next.sourcePackageId
        });
        next.projectId = project.id;
        const app = await DeveloperCenterStore.saveApp(next);
        DeveloperCreatedRuntime.register(app);
        DeveloperCreatedRuntime.refreshShell();
        return app;
    },

    _renderComplete() {
        const app = this.installedApp;
        const replacing = !!this.existingApp;
        this._shell(`
            <div class="app-installer-complete">
                <span class="app-installer-success" aria-hidden="true">✓</span>
                <h1>${replacing ? this._text('覆盖安装完成', 'Replacement complete') : this._text('安装完成', 'Installation complete')}</h1>
                <p>${replacing ? this._text(`${app.name} 已成功更新。`, `${app.name} was updated successfully.`) : this._text(`${app.name} 已成功安装到 Fluent。`, `${app.name} was installed successfully.`)}</p>
                <label><input type="checkbox" data-installer-option="open"> <span>${this._text('完成后打开', 'Open when finished')}</span></label>
                <label><input type="checkbox" data-installer-option="desktop"> <span>${this._text('将快捷方式固定到桌面上', 'Pin a shortcut to the desktop')}</span></label>
            </div>`,
            this._button(this._text('完成', 'Finish'), 'primary', 'finish')
        );
        this._bindActions({ finish: () => this._finish() });
    },

    _renderBlocked(reason) {
        const messages = this._english() ? {
            code: 'The program code contains errors, so this App cannot be installed.',
            malicious: 'Potentially malicious code was detected. Fluent refused to install this App.',
            api: 'Potentially high-risk API requests were detected. Fluent refused to install this App.',
            version: 'This package was created for an unsupported Fluent App package version.',
            metadata: 'The package can be read, but required Fluent App information is missing or invalid.',
            storage: 'Browser local storage is unavailable or does not have enough space for this App.',
            package: 'The App package is damaged, incomplete, or has an invalid structure.'
        } : {
            code: '程序代码出现错误，无法正常安装该 App。',
            malicious: '疑似含有潜在恶意代码，Fluent 已拒绝安装该 App。',
            api: '疑似包含高危 API 请求，Fluent 已拒绝安装该 App。',
            version: '该安装包使用了当前 Fluent 不支持的 App 安装包版本。',
            metadata: '安装包可以正常读取，但缺少必要的 Fluent App 信息或信息无效。',
            storage: '浏览器本地存储不可用或空间不足，无法安装该 App。',
            package: 'App 安装包结构已损坏、内容不完整或格式无效。'
        };
        const message = messages[reason] || messages.package;
        this._shell(`
            <div class="app-installer-blocked">
                <span class="app-installer-error" aria-hidden="true">!</span>
                <h1>${this._text('无法安装此 App', 'This App could not be installed')}</h1>
                <p>${this._esc(message)}</p>
                <p>${this._text('请与提供该 App 的开发者联系并报告该问题。', 'Contact the developer who provided this App and report the problem.')}</p>
            </div>`,
            this._button(this._text('关闭', 'Close'), 'primary', 'close')
        );
        this._bindActions({ close: () => this._close() });
    },

    _packageErrorReason(error) {
        const message = String(error?.message || error || '').toLowerCase().replace(/[_-]+/g, ' ');
        if (message.includes('unsupported fluent app package') || message.includes('version')) return 'version';
        if (message.includes('manifest') || message.includes('app information') || message.includes('display metadata') || message.includes('unknown permission') || message.includes('network.')) return 'metadata';
        return 'package';
    },

    _finish() {
        const app = this.installedApp;
        if (!app) return this._close();
        const open = !!this.container?.querySelector('[data-installer-option="open"]:checked');
        const desktop = !!this.container?.querySelector('[data-installer-option="desktop"]:checked');
        const desktopApi = typeof Desktop !== 'undefined' ? Desktop : globalThis.Desktop;
        if (desktop && desktopApi?.addAppShortcut) desktopApi.addAppShortcut(app.id);
        DeveloperCreatedRuntime.refreshShell();
        this._close();
        if (open) setTimeout(() => WindowManager.openApp(app.id), 300);
    },

    _close() {
        if (this.windowId) WindowManager.closeWindow(this.windowId);
    }
};

window.AppInstallerApp = AppInstallerApp;
