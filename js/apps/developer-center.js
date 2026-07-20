/** FluentOS Developer Center (BETA). */
const DeveloperCenterApp = {
    VERSION: '0.9.2 BETA',
    windowId: null,
    container: null,
    frame: null,
    activePage: 'home',
    activeProjectId: null,
    activeToolId: null,
    _dataListener: null,
    _contextMenu: null,
    _validationRun: 0,
    _renderSequence: 0,
    _pendingPackageProjectId: null,
    _secondaryNavigationTimer: null,
    _editorAppearance: { fontFamily: 'Cascadia Code, Consolas, monospace', fontSize: 13 },

    TEXT: {
        zh: {
            title: '开发者中心 (BETA)', home: '主页', build: '构建 App', apps: '我的 Apps', tools: '工具', settings: '设置',
            commonTools: '常用工具', recent: '最近的项目', buildMine: '构建我的 App',
            buildMineDesc: '尝试构建自己的第一个 App，完成后可添加到桌面、导出并分享。', startBuilding: '开始构建',
            buildTitle: '构建 App', buildDesc: '从网站或代码创建属于你的 FluentOS App。', pwa: '构建 PWA App',
            pwaDesc: '将安全、支持嵌入的 HTTPS 网站封装为独立 App。', professional: '构建专业 App',
            professionalDesc: '使用 HTML、CSS、JavaScript 和安全系统 API 构建 App。', allProjects: '我的全部项目', noProjects: '还没有项目',
            noProjectsDesc: '选择上方的一种类型开始创建。', projectName: '项目名称', newPwa: '新建 PWA 项目', newProfessional: '新建专业 App 项目',
            namePlaceholder: '输入唯一的项目名称', invalidName: '名称不能为空，且不得与已有项目或 App 重复',
            appName: '应用名称', url: '链接地址 (URL)', icon: '图标', upload: '上传图标', windowTitle: '窗口标题',
            html: 'HTML 内容', css: 'CSS 样式（可选）', js: 'JavaScript 代码（可选）', preview: '预览',
            forceFluent: '强制使用 FluentUI 组件库', forceFluentDesc: '用 FluentOS 内置样式接管按钮、输入框、选择框、勾选框、滑块和滚动条。',
            saveDraft: '暂存项目', package: '一键封装', apiDocs: 'API 参考文档', saved: '项目已暂存',
            validating: '正在验证 App', validationDesc: '检测在浏览器能力范围内进行，至少需要 1.5 秒。',
            retry: '重试', backEdit: '返回编辑', finishDesktop: '完成并添加到桌面', finish: '完成封装',
            myAppsTitle: '我的 Apps', myAppsDesc: '管理、运行、导入和分享你已封装的 App。', import: '导入安装包',
            noApps: '还没有已封装的 App', noAppsDesc: '完成一次安全检查后，App 会显示在这里。',
            open: '打开', edit: '编辑', export: '导出', addDesktop: '添加到桌面', removeDesktop: '从桌面移除', delete: '删除',
            toolsTitle: '开发工具', toolsDesc: '常用的本地转换、编码和校验工具。', searchTools: '搜索项目、Apps 和工具…', searchResults: '搜索结果', noSearchResults: '没有匹配的项目、App 或工具', addHome: '添加到主页', removeHome: '从主页移除',
            input: '输入', output: '输出', run: '运行', clear: '清空', copy: '复制结果', encode: '编码', decode: '解码', generate: '生成',
            settingsTitle: '开发者中心设置', settingsDesc: '查看存储占用并管理开发者中心数据。', projects: '项目', packagedApps: '已封装 App', storage: '占用空间',
            resetTools: '恢复默认常用工具', clearProjects: '清空草稿项目', clearApps: '删除全部已封装 App',
            browserLimit: '证书和 iframe 检测受浏览器跨域策略限制，结果仅表示当前浏览器能够验证的连接与加载状态。',
            confirmDelete: '确认删除', confirmDeleteText: '此操作将删除该 App、关闭其窗口并移除桌面快捷方式。', cancel: '取消', confirm: '确认',
            importSuccess: '安装包已导入', importFailed: '无法导入安装包', exportSuccess: '安装包已导出',
            json: 'JSON 格式化', base64: 'Base64 编解码', urlTool: 'URL 编解码', timestamp: '时间戳转换', hash: '哈希/校验和', qrcode: '二维码生成',
            regex: '正则表达式测试', jwt: 'JWT 解码', uuid: 'UUID 生成器', color: '颜色转换', htmlEntities: 'HTML 实体编解码', lines: '文本行处理'
        },
        en: {
            title: 'Developer Center (BETA)', home: 'Home', build: 'Build App', apps: 'My Apps', tools: 'Tools', settings: 'Settings',
            commonTools: 'Common tools', recent: 'Recent projects', buildMine: 'Build my App',
            buildMineDesc: 'Build your first App, add it to the desktop, export it, and share it.', startBuilding: 'Start building',
            buildTitle: 'Build App', buildDesc: 'Create your own FluentOS App from a website or code.', pwa: 'Build PWA App',
            pwaDesc: 'Package a secure, embeddable HTTPS website as an independent App.', professional: 'Build professional App',
            professionalDesc: 'Build with HTML, CSS, JavaScript, and safe system APIs.', allProjects: 'All my projects', noProjects: 'No projects yet',
            noProjectsDesc: 'Choose a project type above to get started.', projectName: 'Project name', newPwa: 'New PWA project', newProfessional: 'New professional App project',
            namePlaceholder: 'Enter a unique project name', invalidName: 'The name cannot be empty or duplicate an existing project or App',
            appName: 'App name', url: 'Link address (URL)', icon: 'Icon', upload: 'Upload icon', windowTitle: 'Window title',
            html: 'HTML content', css: 'CSS styles (optional)', js: 'JavaScript code (optional)', preview: 'Preview',
            forceFluent: 'Force FluentUI components', forceFluentDesc: 'Use FluentOS controls for buttons, inputs, selects, checks, sliders, and scrollbars.',
            saveDraft: 'Save draft', package: 'Package now', apiDocs: 'API reference', saved: 'Project saved',
            validating: 'Validating App', validationDesc: 'Checks run within browser capabilities and take at least 1.5 seconds.',
            retry: 'Retry', backEdit: 'Back to editor', finishDesktop: 'Finish and add to desktop', finish: 'Finish packaging',
            myAppsTitle: 'My Apps', myAppsDesc: 'Manage, run, import, and share packaged Apps.', import: 'Import package',
            noApps: 'No packaged Apps yet', noAppsDesc: 'Apps appear here after passing validation.',
            open: 'Open', edit: 'Edit', export: 'Export', addDesktop: 'Add to desktop', removeDesktop: 'Remove from desktop', delete: 'Delete',
            toolsTitle: 'Developer tools', toolsDesc: 'Local conversion, encoding, and verification tools.', searchTools: 'Search projects, Apps, and tools…', searchResults: 'Search results', noSearchResults: 'No matching project, App, or tool', addHome: 'Add to Home', removeHome: 'Remove from Home',
            input: 'Input', output: 'Output', run: 'Run', clear: 'Clear', copy: 'Copy result', encode: 'Encode', decode: 'Decode', generate: 'Generate',
            settingsTitle: 'Developer Center settings', settingsDesc: 'View storage usage and manage Developer Center data.', projects: 'Projects', packagedApps: 'Packaged Apps', storage: 'Storage used',
            resetTools: 'Restore default common tools', clearProjects: 'Clear draft projects', clearApps: 'Delete all packaged Apps',
            browserLimit: 'Certificate and iframe checks are constrained by browser cross-origin policy. Results only represent connection and loading states the current browser can verify.',
            confirmDelete: 'Confirm deletion', confirmDeleteText: 'This removes the App, closes its windows, and removes its desktop shortcut.', cancel: 'Cancel', confirm: 'Confirm',
            importSuccess: 'Package imported', importFailed: 'Could not import package', exportSuccess: 'Package exported',
            json: 'JSON formatter', base64: 'Base64 encoder/decoder', urlTool: 'URL encoder/decoder', timestamp: 'Timestamp converter', hash: 'Hash/checksum', qrcode: 'QR code generator',
            regex: 'Regular expression tester', jwt: 'JWT decoder', uuid: 'UUID generator', color: 'Color converter', htmlEntities: 'HTML entity codec', lines: 'Text line tools'
        }
    },

    TOOLS: [
        { id: 'json', title: 'json', icon: 'Terminal', descZh: '格式化、压缩并验证 JSON', descEn: 'Format, minify, and validate JSON' },
        { id: 'base64', title: 'base64', icon: 'Key', descZh: 'UTF-8 文本与 Base64 互转', descEn: 'Convert UTF-8 text and Base64' },
        { id: 'url', title: 'urlTool', icon: 'Globe', descZh: '编码或解码 URL 内容', descEn: 'Encode or decode URL content' },
        { id: 'timestamp', title: 'timestamp', icon: 'Clock', descZh: '时间戳与本地时间互转', descEn: 'Convert timestamps and local time' },
        { id: 'hash', title: 'hash', icon: 'Hash', descZh: '计算 SHA-256 和 CRC32', descEn: 'Calculate SHA-256 and CRC32' },
        { id: 'qrcode', title: 'qrcode', icon: 'Scan', descZh: '生成可扫描的短文本二维码', descEn: 'Generate scannable QR codes for short text' },
        { id: 'regex', title: 'regex', icon: 'Search', descZh: '测试正则表达式并列出匹配结果', descEn: 'Test regular expressions and list matches' },
        { id: 'jwt', title: 'jwt', icon: 'Lock', descZh: '本地解码 JWT Header 和 Payload', descEn: 'Decode JWT headers and payloads locally' },
        { id: 'uuid', title: 'uuid', icon: 'Key', descZh: '批量生成随机 UUID v4', descEn: 'Generate random UUID v4 values in batches' },
        { id: 'color', title: 'color', icon: 'Color Picker', descZh: '在 HEX、RGB 和 HSL 之间转换', descEn: 'Convert between HEX, RGB, and HSL' },
        { id: 'html-entities', title: 'htmlEntities', icon: 'External Link', descZh: '编码或解码 HTML 特殊字符', descEn: 'Encode or decode HTML special characters' },
        { id: 'lines', title: 'lines', icon: 'Note Text', descZh: '排序、去重和清理多行文本', descEn: 'Sort, deduplicate, and clean multiline text' }
    ],

    PERMISSIONS: [
        { id: 'storage.local', titleZh: '读写浏览器本地存储', titleEn: 'Read and write browser local storage', descZh: '允许持久保存和读取此 App 自己的本地数据。', descEn: 'Persist and read browser-local data owned by this App.' },
        { id: 'system.theme.write', titleZh: '修改系统主题', titleEn: 'Change system theme', descZh: '允许切换浅色、深色或自动主题。', descEn: 'Switch FluentOS between light, dark, and automatic themes.' },
        { id: 'window.manage', titleZh: '管理当前窗口', titleEn: 'Manage this window', descZh: '允许修改此 App 的窗口标题和尺寸。', descEn: 'Change this App window title and size.' },
        { id: 'files.readText', titleZh: '读取文本文件', titleEn: 'Read text files', descZh: '按文件 ID 读取不超过 512 KB 的本地文本文件。', descEn: 'Read local text files up to 512 KB by file ID.' },
        { id: 'files.writeText', titleZh: '写入文本文件', titleEn: 'Write text files', descZh: '修改文本文件，或在“文档”中创建安全的文本文件。', descEn: 'Update text files or create safe text files in Documents.' },
        { id: 'desktop.manage', titleZh: '管理桌面快捷方式', titleEn: 'Manage desktop shortcut', descZh: '仅允许添加或移除此 App 自己的桌面快捷方式。', descEn: 'Add or remove only this App\'s own desktop shortcut.' },
        { id: 'clipboard.read', titleZh: '读取剪贴板', titleEn: 'Read clipboard', descZh: '在浏览器允许时读取当前剪贴板文本。', descEn: 'Read clipboard text when the browser allows it.' },
        { id: 'clipboard.write', titleZh: '写入剪贴板', titleEn: 'Write clipboard', descZh: '在浏览器允许时替换当前剪贴板文本。', descEn: 'Replace clipboard text when the browser allows it.' },
        { id: 'network.request', titleZh: '请求网络 API', titleEn: 'Request network APIs', descZh: '仅允许经 FluentOS.network.request 访问 App 声明的 API 域名。', descEn: 'Access only declared API domains through FluentOS.network.request.' },
        { id: 'network.image', titleZh: '加载网络图片', titleEn: 'Load network images', descZh: '仅允许经 FluentOS.network.loadImage 加载 App 声明域名上的图片。', descEn: 'Load images only from declared domains through FluentOS.network.loadImage.' }
    ],

    text(key) {
        const lang = typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'en' : 'zh';
        return this.TEXT[lang][key] || this.TEXT.zh[key] || key;
    },

    permissionInfo(permission) {
        const item = this.PERMISSIONS.find((entry) => entry.id === permission);
        const english = typeof I18n !== 'undefined' && I18n.currentLang === 'en';
        return item ? { title: english ? item.titleEn : item.titleZh, description: english ? item.descEn : item.descZh } : { title: permission, description: permission };
    },

    icon(name, type = 'stroke') {
        return `Theme/Icon/Symbol_icon/${type}/${name}.svg`;
    },

    esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
    },

    isValidName(value, maxLength = 80) {
        const name = String(value || '').trim();
        return name.length > 0 && name.length <= maxLength && !/[<>&"'\x00-\x1f]/.test(name);
    },

    isSafeIcon(value) {
        const icon = String(value || '');
        return /^Theme\/Icon\/[A-Za-z0-9 _./-]+$/.test(icon) || /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/i.test(icon);
    },

    async init(windowId) {
        this.beforeClose();
        this.windowId = windowId;
        this.container = document.getElementById(windowId)?.querySelector('.window-content') || null;
        this.activePage = 'home';
        this.activeProjectId = null;
        this._pendingPackageProjectId = null;
        if (!this.container) return false;
        await DeveloperCenterStore.init();
        this._editorAppearance = await DeveloperCenterStore.getEditorAppearance();
        this.applyEditorAppearance();
        this.mountFrame();
        this._dataListener = () => this.renderCurrentPage();
        window.addEventListener('developer-center-data-change', this._dataListener);
        return true;
    },

    beforeClose() {
        this._validationRun += 1;
        if (this._secondaryNavigationTimer) clearTimeout(this._secondaryNavigationTimer);
        this._secondaryNavigationTimer = null;
        if (this._dataListener) window.removeEventListener('developer-center-data-change', this._dataListener);
        this._dataListener = null;
        this.closeContextMenu();
        this.frame?.destroy?.();
        this.frame = null;
        return true;
    },

    mountFrame() {
        this.frame?.destroy?.();
        this.frame = FluentWindow.mount({
            container: this.container,
            className: 'developer-center-frame',
            items: [
                { id: 'home', label: this.text('home'), icon: 'Home' },
                { id: 'build', label: this.text('build'), icon: 'Dashboard Plus' },
                { id: 'apps', label: this.text('apps'), icon: 'Layout Grid' },
                { id: 'tools', label: this.text('tools'), icon: 'Wrench' }
            ],
            footerItems: [{ id: 'settings', label: this.text('settings'), icon: 'Settings' }],
            activeId: this.activePage,
            sidebarSearch: {
                enabled: true,
                placeholder: this.text('searchTools'),
                resultsTitle: this.text('searchResults'),
                emptyText: this.text('noSearchResults'),
                minQueryLength: 1,
                debounceMs: 80,
                search: (query) => this.searchAll(query),
                onResultClick: (result) => this.openSearchResult(result)
            },
            onNavigate: (id, pageEl) => {
                this.activePage = id;
                pageEl.className = 'fw-page dc-page';
                pageEl.dataset.fwScroll = '';
                pageEl.parentElement?.querySelector(':scope > .dc-action-footer')?.remove();
                if (id === 'build' && this.activeProjectId) {
                    const projectId = this.activeProjectId;
                    DeveloperCenterStore.get('projects', projectId).then((project) => {
                        if (!project || this.activeProjectId !== projectId) return;
                        if (this._pendingPackageProjectId === projectId) {
                            this._pendingPackageProjectId = null;
                            this.renderPackageInfo(pageEl, project);
                        } else if (project.type === 'pwa') this.renderPwaEditor(pageEl, project);
                        else this.renderProfessionalEditor(pageEl, project);
                    });
                } else if (id === 'tools' && this.activeToolId) {
                    this.renderToolDetail(pageEl, this.activeToolId);
                } else {
                    this.activeProjectId = null;
                    this.activeToolId = null;
                    this.renderPage(pageEl, id);
                }
            }
        });
    },

    applyEditorAppearance(root = this.container) {
        if (!root) return;
        const appearance = DeveloperCenterStore.normalizeEditorAppearance(this._editorAppearance);
        root.style.setProperty('--dc-code-font', appearance.fontFamily);
        root.style.setProperty('--dc-code-size', `${appearance.fontSize}px`);
    },

    renderCurrentPage() {
        const page = this.frame?.pageEl;
        if (page && !this.activeProjectId && !this.activeToolId) this.renderPage(page, this.activePage);
    },

    _secondaryTransitionDuration() {
        if (typeof State !== 'undefined' && State.settings?.enableAnimation === false) return 0;
        if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 0;
        return 240;
    },

    _afterSecondaryExit(callback) {
        if (typeof callback !== 'function') return;
        if (this._secondaryNavigationTimer) {
            clearTimeout(this._secondaryNavigationTimer);
            this._secondaryNavigationTimer = null;
        }
        const page = this.frame?.pageEl;
        if (!page?.classList.contains('dc-secondary-page')) {
            callback();
            return;
        }
        page.classList.add('dc-secondary-page-exit');
        page.parentElement?.querySelector(':scope > .dc-action-footer')?.classList.add('dc-secondary-page-exit');
        this._secondaryNavigationTimer = setTimeout(() => {
            this._secondaryNavigationTimer = null;
            callback();
        }, this._secondaryTransitionDuration());
    },

    _markSecondaryPage(page) {
        page?.classList.add('dc-secondary-page');
    },

    renderPage(page, id) {
        page.innerHTML = '';
        page.dataset.dcRenderToken = String(++this._renderSequence);
        if (id === 'home') this.renderHome(page);
        else if (id === 'build') this.renderBuild(page);
        else if (id === 'apps') this.renderMyApps(page);
        else if (id === 'tools') this.renderTools(page);
        else this.renderSettings(page);
    },

    isCurrentRender(page, pageId, token) {
        return !!page?.isConnected && this.activePage === pageId && page.dataset.dcRenderToken === token;
    },

    heading(title, description, action = null) {
        const root = document.createElement('header');
        root.className = 'dc-heading';
        root.innerHTML = `<div><h1>${this.esc(title)}</h1><p>${this.esc(description || '')}</p></div>`;
        if (action) root.appendChild(action);
        return root;
    },

    button(text, variant, onClick, icon = null) {
        return FluentUI.Button({ text, variant: variant || 'secondary', icon, onClick });
    },

    toast(message, type = 'success') {
        FluentUI.Toast({ title: this.text('title'), message, type });
    },

    formatDate(value) {
        try { return new Date(value).toLocaleString(typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'en-US' : 'zh-CN', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }); }
        catch (_) { return ''; }
    },

    formatBytes(bytes) {
        const value = Number(bytes) || 0;
        if (value < 1024) return `${value} B`;
        if (value < 1048576) return `${(value / 1024).toFixed(1)} KB`;
        return `${(value / 1048576).toFixed(1)} MB`;
    },

    async renderHome(page) {
        const renderToken = page.dataset.dcRenderToken;
        page.className = 'fw-page dc-page';
        page.appendChild(this.heading(this.text('title'), this.text('buildDesc')));
        const [projects, favorites] = await Promise.all([DeveloperCenterStore.getAll('projects'), DeveloperCenterStore.getFavorites()]);
        if (!this.isCurrentRender(page, 'home', renderToken)) return;
        const tools = this.TOOLS.filter((tool) => favorites.includes(tool.id));
        const common = document.createElement('section');
        common.className = 'dc-section';
        common.innerHTML = `<div class="dc-section-title"><h2>${this.text('commonTools')}</h2></div><div class="dc-grid"></div>`;
        tools.forEach((tool) => common.querySelector('.dc-grid').appendChild(this.createToolCard(tool, true)));
        page.appendChild(common);
        if (projects.length) {
            const recent = document.createElement('section');
            recent.className = 'dc-section';
            recent.innerHTML = `<div class="dc-section-title"><h2>${this.text('recent')}</h2></div><div class="dc-grid"></div>`;
            projects.sort((a,b) => String(b.modifiedAt).localeCompare(String(a.modifiedAt))).slice(0,3)
                .forEach((project) => recent.querySelector('.dc-grid').appendChild(this.createProjectCard(project)));
            page.appendChild(recent);
        } else {
            const guide = document.createElement('section');
            guide.className = 'dc-section dc-empty';
            guide.innerHTML = `<img src="${this.icon('Dashboard Plus')}" alt=""><h3>${this.text('buildMine')}</h3><p>${this.text('buildMineDesc')}</p>`;
            guide.appendChild(this.button(this.text('startBuilding'), 'primary', () => this.navigate('build'), 'Dashboard Plus'));
            page.appendChild(guide);
        }
    },

    navigate(id) {
        this._afterSecondaryExit(() => {
            this.activePage = id;
            this.activeProjectId = null;
            this.activeToolId = null;
            this.frame?.navigate?.(id, { preserveScroll: false, force: this.frame?.activeId === id });
        });
    },

    createToolCard(tool, onHome = false) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dc-card dc-tool-card';
        const desc = typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? tool.descEn : tool.descZh;
        button.innerHTML = `<span class="dc-card-icon"><img src="${this.icon(tool.icon)}" alt=""></span><span class="dc-card-copy"><strong>${this.text(tool.title)}</strong><span>${this.esc(desc)}</span></span>`;
        button.addEventListener('click', () => this.openTool(tool.id));
        button.addEventListener('contextmenu', (event) => this.showToolContextMenu(event, tool, onHome));
        return button;
    },

    createProjectCard(project) {
        const card = document.createElement('article');
        card.className = 'dc-card dc-project-card';
        card.tabIndex = 0;
        card.innerHTML = `<div class="dc-project-top"><img src="${this.esc(project.icon || 'Theme/Icon/App_icon/created_app.png')}" alt=""><strong>${this.esc(project.name)}</strong></div><div class="dc-project-meta"><span class="dc-badge">${project.type === 'pwa' ? 'PWA' : 'HTML / JS'}</span><span>${this.formatDate(project.modifiedAt)}</span></div>`;
        const open = () => this.openProject(project.id);
        card.addEventListener('click', open);
        card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
        card.addEventListener('contextmenu', (event) => this.showProjectContextMenu(event, project));
        return card;
    },

    async renderBuild(page) {
        const renderToken = page.dataset.dcRenderToken;
        page.appendChild(this.heading(this.text('buildTitle'), this.text('buildDesc')));
        const choices = document.createElement('div');
        choices.className = 'dc-grid dc-grid-two';
        choices.innerHTML = `
            <button type="button" class="dc-card dc-build-card" data-type="pwa"><span class="dc-card-icon"><img src="${this.icon('Earth', 'fill')}" alt=""></span><span class="dc-card-copy"><strong>${this.text('pwa')}</strong><span>${this.text('pwaDesc')}</span></span></button>
            <button type="button" class="dc-card dc-build-card" data-type="professional"><span class="dc-card-icon"><img src="${this.icon('Dashboard 2')}" alt=""></span><span class="dc-card-copy"><strong>${this.text('professional')}</strong><span>${this.text('professionalDesc')}</span></span></button>`;
        choices.querySelectorAll('[data-type]').forEach((button) => button.addEventListener('click', () => this.createProject(button.dataset.type)));
        page.appendChild(choices);
        const section = document.createElement('section');
        section.className = 'dc-section';
        section.innerHTML = `<div class="dc-section-title"><h2>${this.text('allProjects')}</h2></div>`;
        const projects = await DeveloperCenterStore.getAll('projects');
        if (!this.isCurrentRender(page, 'build', renderToken) || this.activeProjectId) return;
        if (!projects.length) {
            const empty = document.createElement('div');
            empty.className = 'dc-empty';
            empty.innerHTML = `<img src="${this.icon('Folder Open')}" alt=""><h3>${this.text('noProjects')}</h3><p>${this.text('noProjectsDesc')}</p>`;
            section.appendChild(empty);
        } else {
            const grid = document.createElement('div');
            grid.className = 'dc-grid';
            projects.sort((a,b) => String(b.modifiedAt).localeCompare(String(a.modifiedAt))).forEach((project) => grid.appendChild(this.createProjectCard(project)));
            section.appendChild(grid);
        }
        page.appendChild(section);
    },

    async createProject(type) {
        const [projects, apps] = await Promise.all([DeveloperCenterStore.getAll('projects'), DeveloperCenterStore.getAll('apps')]);
        const takenNames = new Set([...projects, ...apps].map((item) => String(item.name || '').trim().toLocaleLowerCase()));
        FluentUI.InputDialog({
            title: type === 'pwa' ? this.text('newPwa') : this.text('newProfessional'),
            placeholder: this.text('namePlaceholder'), maxLength: 60,
            validateFn: (value) => this.isValidName(value, 60) && !takenNames.has(String(value || '').trim().toLocaleLowerCase()),
            errorMessage: this.text('invalidName'), confirmText: this.text('confirm'), cancelText: this.text('cancel'),
            onConfirm: async (value) => {
                const name = String(value || '').trim();
                if (await DeveloperCenterStore.nameExists(name)) { this.toast(this.text('invalidName'), 'error'); return; }
                const project = await DeveloperCenterStore.saveProject({
                    name, type, title: name, url: type === 'pwa' ? 'https://' : '',
                    icon: 'Theme/Icon/App_icon/created_app.png',
                    html: type === 'professional' ? '<main>\n  <h1>Hello, FluentOS!</h1>\n  <button id="hello">Try FluentOS API</button>\n</main>' : '',
                    css: type === 'professional' ? 'main { padding: 32px; }' : '',
                    js: type === 'professional' ? "document.querySelector('#hello')?.addEventListener('click', () => {\n  FluentOS.notify('Hello', 'Your App is running!', 'success');\n});" : '',
                    forceFluentUI: type === 'professional',
                    permissions: [],
                    network: { connect: [], image: [] }
                });
                this.openProject(project.id);
            }
        });
    },

    async openProject(projectId) {
        const project = await DeveloperCenterStore.get('projects', projectId);
        if (!project || !this.frame?.pageEl) return;
        this._afterSecondaryExit(() => {
            this.activePage = 'build';
            this.activeProjectId = project.id;
            this.frame.navigate('build', { preserveScroll: false, force: this.frame.activeId === 'build' });
        });
    },

    packageProject(project) {
        if (!project || !this.frame?.pageEl) return;
        this.closeContextMenu();
        this._afterSecondaryExit(() => {
            this.activePage = 'build';
            this.activeProjectId = project.id;
            this._pendingPackageProjectId = project.id;
            this.frame.navigate('build', { preserveScroll: false, force: this.frame.activeId === 'build' });
        });
    },

    confirmDeleteProject(project) {
        FluentUI.Dialog({
            type: 'warning',
            title: this.text('confirmDelete'),
            content: `${typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'The project source will be permanently deleted. Packaged Apps created from it are kept.' : '项目源码将被彻底删除；由它封装好的 App 会被保留。'}<br><strong>${this.esc(project.name)}</strong>`,
            buttons: [
                { text: this.text('cancel'), variant: 'secondary', value: false },
                { text: this.text('delete'), variant: 'danger', value: true }
            ],
            onClose: async (confirmed) => {
                if (!confirmed) return;
                if (this.activeProjectId === project.id) this.activeProjectId = null;
                await DeveloperCenterStore.remove('projects', project.id);
            }
        });
    },

    appendFooter(page, buttons) {
        page.parentElement?.querySelector(':scope > .dc-action-footer')?.remove();
        const footer = document.createElement('div');
        footer.className = 'dc-action-footer';
        if (page.classList.contains('dc-secondary-page')) footer.classList.add('dc-secondary-page');
        buttons.forEach((button) => footer.appendChild(button));
        page.parentElement?.appendChild(footer);
    },

    renderPwaEditor(page, project) {
        page.innerHTML = '';
        page.className = 'fw-page dc-page';
        this._markSecondaryPage(page);
        const back = this.button(this.text('build'), 'secondary', () => this.navigate('build'), 'Arrow Left');
        page.appendChild(this.heading(this.text('pwa'), project.name, back));
        const form = document.createElement('div');
        form.className = 'dc-form';
        form.innerHTML = `
            <div class="dc-field"><label>${this.text('appName')}</label><input class="dc-input" data-field="name" maxlength="60" value="${this.esc(project.name)}"></div>
            <div class="dc-field"><label>${this.text('url')}</label><input class="dc-input" data-field="url" type="url" value="${this.esc(project.url || 'https://')}" placeholder="https://"></div>
            <div class="dc-field"><span class="dc-field-label">${this.text('icon')}</span><div class="dc-icon-picker"><img class="dc-icon-preview" src="${this.esc(project.icon || 'Theme/Icon/App_icon/created_app.png')}" alt=""><button type="button" class="fluent-btn fluent-btn-secondary fluent-btn-medium" data-action="upload-icon"><span class="fluent-btn-text">${this.text('upload')}</span></button><input class="dc-hidden-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></div></div>
            <div class="dc-permission-picker" data-permission-picker></div>`;
        page.appendChild(form);
        this.bindIconPicker(form, project);
        this.renderPermissionPicker(form.querySelector('[data-permission-picker]'), project.permissions || [], DeveloperCenterStore.PWA_PERMISSIONS);
        this.appendFooter(page, [
            this.button(this.text('saveDraft'), 'secondary', () => this.saveEditorProject(page, project, false), 'Save Floppy'),
            this.button(typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Next' : '下一步', 'primary', () => this.saveEditorProject(page, project, true), 'Arrow Right')
        ]);
    },

    renderProfessionalEditor(page, project) {
        page.innerHTML = '';
        page.className = 'fw-page dc-page';
        this._markSecondaryPage(page);
        const back = this.button(this.text('build'), 'secondary', () => this.navigate('build'), 'Arrow Left');
        page.appendChild(this.heading(this.text('professional'), project.name, back));
        const layout = document.createElement('div');
        layout.className = 'dc-editor-layout';
        layout.innerHTML = `
            <div class="dc-editor-meta">
                <div class="dc-field"><label>${this.text('appName')}</label><input class="dc-input" data-field="name" maxlength="60" value="${this.esc(project.name)}"></div>
                <div class="dc-field"><label>${this.text('windowTitle')}</label><input class="dc-input" data-field="title" maxlength="80" value="${this.esc(project.title || project.name)}"></div>
                <div class="dc-field"><span class="dc-field-label">${this.text('icon')}</span><div class="dc-icon-picker"><img class="dc-icon-preview" src="${this.esc(project.icon || 'Theme/Icon/App_icon/created_app.png')}" alt=""><button type="button" class="fluent-btn fluent-btn-secondary fluent-btn-medium" data-action="upload-icon"><span class="fluent-btn-text">${this.text('upload')}</span></button><input class="dc-hidden-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></div></div>
                <div class="dc-toggle-host" data-toggle="force"></div>
                <div class="dc-permission-picker" data-permission-picker></div>
                <div class="dc-field"><label>${typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Allowed API domains' : '允许请求的 API 域名'}</label><input class="dc-input" data-network="connect" placeholder="api.example.com, api2.example.com" value="${this.esc((project.network?.connect || []).join(', '))}"><span class="dc-note">${typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Used only by network.request; exact HTTPS hostnames, separated by commas.' : '仅供 network.request 使用；填写精确 HTTPS 主机名，用逗号分隔。'}</span></div>
                <div class="dc-field"><label>${typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Allowed image domains' : '允许加载图片的域名'}</label><input class="dc-input" data-network="image" placeholder="cdn.example.com" value="${this.esc((project.network?.image || []).join(', '))}"><span class="dc-note">${typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Used only by network.loadImage; exact HTTPS hostnames, separated by commas.' : '仅供 network.loadImage 使用；填写精确 HTTPS 主机名，用逗号分隔。'}</span></div>
            </div>
            <div class="dc-code-stack">
                <div class="dc-code-field"><div class="dc-code-head"><label>${this.text('html')}</label></div><textarea class="dc-textarea dc-code-html" data-field="html" data-language="html" spellcheck="false"></textarea></div>
                <div class="dc-code-field"><div class="dc-code-head"><label>${this.text('css')}</label></div><textarea class="dc-textarea" data-field="css" data-language="css" spellcheck="false"></textarea></div>
                <div class="dc-code-field"><div class="dc-code-head"><label>${this.text('js')}</label></div><textarea class="dc-textarea" data-field="js" data-language="js" spellcheck="false"></textarea></div>
            </div>`;
        layout.querySelector('[data-field="html"]').value = project.html || '';
        layout.querySelector('[data-field="css"]').value = project.css || '';
        layout.querySelector('[data-field="js"]').value = project.js || '';
        layout.querySelectorAll('.dc-textarea[data-language]').forEach((textarea) => this.enhanceCodeEditor(textarea));
        page.appendChild(layout);
        this.bindIconPicker(layout, project);
        this.mountToggle(layout.querySelector('[data-toggle="force"]'), this.text('forceFluent'), this.text('forceFluentDesc'), project.forceFluentUI === true, (value) => { project.forceFluentUI = value; });
        this.renderPermissionPicker(layout.querySelector('[data-permission-picker]'), project.permissions || []);
        this.appendFooter(page, [
            this.button(this.text('apiDocs'), 'secondary', () => this.showApiDocs(), 'Book Text'),
            this.button(this.text('preview'), 'secondary', () => this.previewProfessional(page, project), 'Eye'),
            this.button(this.text('saveDraft'), 'secondary', () => this.saveEditorProject(page, project, false), 'Save Floppy'),
            this.button(typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Next' : '下一步', 'primary', () => this.saveEditorProject(page, project, true), 'Arrow Right')
        ]);
    },

    highlightCode(source, language) {
        const value = String(source || '');
        const patterns = {
            html: /<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\/?[A-Za-z][^>]*>|&(?:#\d+|#x[\da-f]+|[A-Za-z][\w-]*);/gi,
            css: /\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[\da-f]{3,8}\b|@[\w-]+|--[\w-]+|[-\w]+(?=\s*:)|(?:\d*\.)?\d+(?:px|rem|em|vh|vw|%|s|ms|deg)?\b|[.#]?[A-Za-z_-][\w-]*(?=\s*\{)/gi,
            js: /\/\*[\s\S]*?\*\/|\/\/[^\n]*|`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|from|function|get|if|import|in|instanceof|let|new|of|return|set|static|super|switch|this|throw|try|typeof|var|void|while|with|yield)\b|\b(?:true|false|null|undefined|NaN|Infinity)\b|\b(?:\d*\.)?\d+(?:e[+-]?\d+)?\b|\b[A-Za-z_$][\w$]*(?=\s*\()/g
        };
        const pattern = patterns[language] || patterns.js;
        let output = '';
        let cursor = 0;
        let match;
        while ((match = pattern.exec(value))) {
            output += this.esc(value.slice(cursor, match.index));
            const token = match[0];
            let type = 'keyword';
            if (/^(?:\/\*|\/\/|<!--)/.test(token)) type = 'comment';
            else if (/^["'`]/.test(token)) type = 'string';
            else if (language === 'html' && /^</.test(token)) type = /^<!/.test(token) ? 'comment' : 'tag';
            else if (language === 'html' && /^&/.test(token)) type = 'entity';
            else if (language === 'css' && /^#/.test(token)) type = 'color';
            else if (language === 'css' && /^@/.test(token)) type = 'at-rule';
            else if (language === 'css' && /^(?:--|[-\w]+$)/.test(token) && value.slice(pattern.lastIndex).match(/^\s*:/)) type = 'property';
            else if (/^(?:\d|\.\d)/.test(token)) type = 'number';
            else if (language === 'js' && /^[A-Za-z_$]/.test(token) && value.slice(pattern.lastIndex).match(/^\s*\(/)) type = 'function';
            output += `<span class="dc-token-${type}">${this.esc(token)}</span>`;
            cursor = pattern.lastIndex;
        }
        return output + this.esc(value.slice(cursor));
    },

    enhanceCodeEditor(textarea) {
        if (!(textarea instanceof HTMLTextAreaElement) || textarea.dataset.codeEditorReady === 'true') return;
        textarea.dataset.codeEditorReady = 'true';
        textarea.dataset.fwWheelScope = 'self';
        textarea.wrap = 'off';
        const language = textarea.dataset.language || 'js';
        const editor = document.createElement('div');
        editor.className = `dc-code-editor dc-code-editor-${language}`;
        editor.dataset.fwScrollBounce = 'off';
        const highlight = document.createElement('pre');
        highlight.className = 'dc-code-highlight';
        highlight.setAttribute('aria-hidden', 'true');
        const code = document.createElement('code');
        highlight.appendChild(code);
        const gutter = document.createElement('pre');
        gutter.className = 'dc-code-gutter';
        gutter.setAttribute('aria-hidden', 'true');
        const lineNumbers = document.createElement('span');
        gutter.appendChild(lineNumbers);
        textarea.before(editor);
        editor.append(highlight, gutter, textarea);

        const render = () => {
            code.innerHTML = `${this.highlightCode(textarea.value, language)}\n`;
            const count = Math.max(1, textarea.value.split('\n').length);
            lineNumbers.textContent = Array.from({ length: count }, (_, index) => index + 1).join('\n');
        };
        const syncScroll = () => {
            code.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
            lineNumbers.style.transform = `translateY(${-textarea.scrollTop}px)`;
        };
        let scrollSyncFrame = 0;
        const scheduleScrollSync = () => {
            if (scrollSyncFrame) return;
            scrollSyncFrame = requestAnimationFrame(() => {
                scrollSyncFrame = 0;
                syncScroll();
            });
        };
        textarea.addEventListener('input', render);
        textarea.addEventListener('scroll', scheduleScrollSync, { passive: true });
        textarea.addEventListener('keydown', (event) => {
            if (event.key !== 'Tab') return;
            event.preventDefault();
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            textarea.setRangeText('  ', start, end, 'end');
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        });
        render();
        syncScroll();
    },

    mountToggle(host, title, description, checked, onChange) {
        host.className = 'dc-toggle-row';
        host.innerHTML = `<span class="dc-toggle-copy"><strong>${this.esc(title)}</strong><span>${this.esc(description)}</span></span>`;
        host.appendChild(FluentUI.Toggle({ checked, onChange }));
    },

    renderPermissionPicker(host, selectedPermissions, allowedPermissions = DeveloperCenterStore.SUPPORTED_PERMISSIONS) {
        const selected = new Set(Array.isArray(selectedPermissions) ? selectedPermissions : []);
        const allowed = new Set(Array.isArray(allowedPermissions) ? allowedPermissions : []);
        const english = typeof I18n !== 'undefined' && I18n.currentLang === 'en';
        host.innerHTML = `<strong class="dc-permission-heading">${english ? 'Optional permissions' : '可选权限'}</strong><span class="dc-permission-help">${english ? 'Only select capabilities this App actually needs. The user must approve them after safety validation.' : '只选择 App 实际需要的能力；安全检查通过后仍需由用户确认授权。'}</span>`;
        this.PERMISSIONS.filter((permission) => allowed.has(permission.id)).forEach((permission) => {
            const info = this.permissionInfo(permission.id);
            const label = document.createElement('label');
            label.className = 'dc-permission-row';
            label.innerHTML = `<input type="checkbox" data-permission="${this.esc(permission.id)}" ${selected.has(permission.id) ? 'checked' : ''}><span><strong>${this.esc(info.title)}</strong><small>${this.esc(info.description)}</small><code>${this.esc(permission.id)}</code></span>`;
            host.appendChild(label);
        });
    },

    bindIconPicker(root, project) {
        const button = root.querySelector('[data-action="upload-icon"]');
        const input = root.querySelector('input[type="file"]');
        const preview = root.querySelector('.dc-icon-preview');
        button?.addEventListener('click', () => input.click());
        input?.addEventListener('change', () => {
            const file = input.files?.[0];
            if (!file || file.size > 2 * 1024 * 1024) { if (file) this.toast('Icon must be smaller than 2 MB', 'error'); return; }
            const reader = new FileReader();
            reader.onload = () => { project.icon = String(reader.result); preview.src = project.icon; };
            reader.readAsDataURL(file);
        });
    },

    collectEditor(page, project) {
        const next = { ...project, icon: project.icon || 'Theme/Icon/App_icon/created_app.png' };
        page.querySelectorAll('[data-field]').forEach((input) => { next[input.dataset.field] = input.value; });
        next.name = String(next.name || '').trim();
        next.title = String(next.title || next.name).trim();
        next.forceFluentUI = project.forceFluentUI === true;
        next.permissions = [...page.querySelectorAll('[data-permission]:checked')]
            .map((input) => input.dataset.permission)
            .filter((permission) => DeveloperCenterStore.SUPPORTED_PERMISSIONS.includes(permission));
        next.network = DeveloperCenterStore.normalizeNetworkConfig({
            connect: page.querySelector('[data-network="connect"]')?.value || '',
            image: page.querySelector('[data-network="image"]')?.value || ''
        });
        delete next.fluentWindows;
        return next;
    },

    async saveEditorProject(page, project, packageAfter) {
        let next;
        try { next = this.collectEditor(page, project); }
        catch (error) { this.toast(error.message || 'Invalid network allowlist', 'error'); return; }
        if (!this.isValidName(next.name, 60) || !this.isValidName(next.title || next.name, 80) || await DeveloperCenterStore.nameExists(next.name, project.id)) { this.toast(this.text('invalidName'), 'error'); return; }
        if (next.type === 'pwa') {
            try { next.url = new URL(next.url).href; } catch (_) { this.toast('Please enter a valid URL', 'error'); return; }
        }
        const saved = await DeveloperCenterStore.saveProject(next);
        Object.assign(project, saved);
        if (packageAfter) this.packageProject(saved);
        else { this.toast(this.text('saved')); this.activeProjectId = null; this.navigate('build'); }
    },

    async renderPackageInfo(page, project) {
        const english = typeof I18n !== 'undefined' && I18n.currentLang === 'en';
        page.innerHTML = '';
        page.className = 'fw-page dc-page';
        this._markSecondaryPage(page);
        page.appendChild(this.heading(
            english ? 'App information' : '填写 App 信息',
            english ? 'Confirm the information shown to people before packaging.' : '确认安装前向用户展示的应用信息。'
        ));
        const identity = await DeveloperCenterStore.accountIdentity();
        if (!page.isConnected || this.activeProjectId !== project.id) return;
        const form = document.createElement('div');
        form.className = 'dc-form dc-package-info-form';
        form.innerHTML = `
            <div class="dc-field"><label>${english ? 'App name' : 'App 名称'}</label><input class="dc-input" data-package-field="name" maxlength="60" value="${this.esc(project.name)}"></div>
            <div class="dc-field"><label>${english ? 'App description' : 'App 简介'}</label><textarea class="dc-textarea dc-package-description" data-package-field="description" maxlength="600" placeholder="${english ? 'Describe what this App does' : '简要说明该 App 的用途'}">${this.esc(project.description || '')}</textarea><span class="dc-note">${english ? '1–600 characters; this text is displayed by the installer.' : '1–600 个字符；安装工具会向用户显示此内容。'}</span></div>
            <div class="dc-field"><label>${english ? 'Developer' : '开发者'}</label><input class="dc-input" value="${this.esc(identity.displayName)}" readonly aria-readonly="true"><span class="dc-note">${english ? 'Generated from the current account and the last six characters of this device account hash.' : '由当前账户名称与本机账户 Hash 的最后 6 位自动生成。'}</span></div>`;
        page.appendChild(form);
        this.appendFooter(page, [
            this.button(english ? 'Back' : '上一步', 'secondary', () => this.openProject(project.id), 'Arrow Left'),
            this.button(this.text('package'), 'primary', () => this.savePackageInfo(page, project, identity), 'Dashboard Check')
        ]);
    },

    async savePackageInfo(page, project, identity) {
        const english = typeof I18n !== 'undefined' && I18n.currentLang === 'en';
        const name = String(page.querySelector('[data-package-field="name"]')?.value || '').trim();
        const description = String(page.querySelector('[data-package-field="description"]')?.value || '').trim();
        if (!this.isValidName(name, 60) || await DeveloperCenterStore.nameExists(name, project.id)) {
            this.toast(this.text('invalidName'), 'error');
            return;
        }
        if (!description || description.length > 600) {
            this.toast(english ? 'Enter an App description of no more than 600 characters.' : '请填写不超过 600 个字符的 App 简介。', 'error');
            return;
        }
        const previousName = project.name;
        const saved = await DeveloperCenterStore.saveProject({
            ...project,
            name,
            title: project.title === previousName ? name : (project.title || name),
            description,
            developer: identity.displayName,
            developerHash: identity.hash
        });
        Object.assign(project, saved);
        this.startValidation(page, saved);
    },

    previewProfessional(page, project) {
        let app;
        try { app = this.collectEditor(page, project); }
        catch (error) { this.toast(error.message || 'Invalid network allowlist', 'error'); return; }
        DeveloperCreatedRuntime.openPreview(app);
    },

    apiDocsContent() {
        const content = `<div class="dc-api-docs">
            <div class="dc-api-row"><code>await FluentOS.notify(title, message, type)</code><span>Show an info, success, warning, or error notification.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row"><code>await FluentOS.alert(title, message) / confirm(title, message)</code><span>Show a host-rendered system dialog. confirm() resolves to true or false.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row"><code>await FluentOS.dialog({ title, message, type, buttons })</code><span>Show a custom dialog with up to three text-only buttons and resolve to the selected button value.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row"><code>await FluentOS.getTheme()</code><span>Read mode, isDark, accentColor, accentRgb, FluentUI version mode, material, language, and window ID.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row"><code>await FluentOS.getThemeMode() / getAccentColor() / getLanguage()</code><span>Read individual theme values. FluentOS.state contains the latest synchronously cached system state.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row"><code>await FluentOS.isWindowBlurEnabled()</code><span>Read whether window blur is currently effective. The same value is available as FluentOS.state.windowBlurEnabled.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row dc-api-privileged"><code>await FluentOS.storage.get(key) / set(key, value) / remove(key)</code><span>Permission: storage.local. Use private browser-local storage for this App: 100 KiB per JSON value, 128 keys, and 512 KiB total UTF-8 data.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row"><code>await FluentOS.openApp(id) / openExternal(httpsUrl)</code><span>Open an allowed system App or a secure external link.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row dc-api-privileged"><code>await FluentOS.clipboard.read() / write(text)</code><span>Permissions: clipboard.read / clipboard.write. Read or write text when browser permission also allows it.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row"><code>await FluentOS.getWindowInfo()</code><span>Read this App window's title, size, and maximized state.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row"><code>FluentOS.ui.highlightButton('#save', true) / enableButtonGlow('#save', true)</code><span>Apply the Fluent primary-button appearance or system pointer highlight feedback to matching controls.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row dc-api-privileged"><code>await FluentOS.system.setTheme('dark') / toggleTheme()</code><span>Permission: system.theme.write. Change the global FluentOS theme.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row dc-api-privileged"><code>await FluentOS.window.setTitle(title) / setSize(width, height)</code><span>Permission: window.manage. Manage only this App's window.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row dc-api-privileged"><code>await FluentOS.files.listText('documents') / readText(id) / writeText(id, content) / createText(name, content)</code><span>Permissions: files.readText / files.writeText. List only Documents, Downloads, or Desktop; text content is limited to 512 KB and new files go to Documents.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row dc-api-privileged"><code>await FluentOS.desktop.addShortcut() / removeShortcut()</code><span>Permission: desktop.manage. Manage only this App's own desktop shortcut.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row dc-api-privileged"><code>await FluentOS.network.request(url, options)</code><span>Permission: network.request. Request only an exact HTTPS hostname declared in manifest.network.connect. Returns status, headers, and a size-limited text body.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row dc-api-privileged"><code>const src = await FluentOS.network.loadImage(url)</code><span>Permission: network.image. Loads a size-limited raster image from manifest.network.image; if CORS blocks fetch, it returns the allowlisted URL for CSP-restricted img.src without a host-side probe.</span><button type="button" data-copy-api>Copy</button></div></div>`;
        return content;
    },

    bindApiDocs(root) {
        root.querySelectorAll('[data-copy-api]').forEach((button) => {
            const copyLabel = typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Copy API' : '复制 API';
            button.innerHTML = `<img src="${this.icon('Copy')}" alt="">`;
            button.title = copyLabel;
            button.setAttribute('aria-label', copyLabel);
            button.addEventListener('click', async () => {
            const value = button.closest('.dc-api-row')?.querySelector('code')?.textContent || '';
            try {
                await navigator.clipboard.writeText(value);
            } catch (_) {
                const range = document.createRange();
                range.selectNodeContents(button.closest('.dc-api-row').querySelector('code'));
                const selection = getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                document.execCommand?.('copy');
            }
            button.classList.add('is-copied');
            button.title = typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Copied' : '已复制';
            setTimeout(() => { button.classList.remove('is-copied'); button.title = copyLabel; }, 900);
            });
        });
    },

    showApiDocs() {
        const english = typeof I18n !== 'undefined' && I18n.currentLang === 'en';
        WindowManager.appConfigs['developer-center-api-docs'] = {
            title: english ? 'API Reference' : 'API 参考文档',
            icon: 'Theme/Icon/App_icon/developer_center.png',
            width: 860, height: 700, minWidth: 560, minHeight: 420,
            component: 'DeveloperCenterApiDocsApp'
        };
        WindowManager.openApp('developer-center-api-docs');
    },

    async startValidation(page, project, options = {}) {
        const importMode = options.importMode === true;
        const runId = ++this._validationRun;
        page.innerHTML = '';
        page.className = 'fw-page dc-page';
        this._markSecondaryPage(page);
        page.appendChild(this.heading(this.text('validating'), this.text('validationDesc')));
        const checks = project.type === 'pwa'
            ? [
                { id: 'https', label: 'HTTPS', desc: 'URL uses encrypted HTTPS transport' },
                { id: 'safe-url', label: 'URL safety', desc: 'No credentials, local host, or unsafe protocol' },
                { id: 'metadata', label: 'App information', desc: 'Required package metadata is complete' },
                { id: 'apis', label: 'PWA permissions', desc: 'Only supported PWA capabilities are requested' }
            ]
            : [
                { id: 'syntax', label: 'HTML / CSS / JavaScript syntax', desc: 'Source can be parsed and compiled' },
                { id: 'malicious', label: 'Dangerous code patterns', desc: 'No host escape or dynamic-code patterns' },
                { id: 'apis', label: 'Permitted APIs', desc: 'Only the provided FluentOS bridge is used' },
                { id: 'runtime', label: 'Static package integrity', desc: 'Package remains valid without running App code' }
            ];
        const list = document.createElement('div');
        list.className = 'dc-validation-list';
        checks.forEach((check) => {
            const item = document.createElement('div');
            const row = document.createElement('button');
            const panelId = `dc-validation-${runId}-${check.id}-details`;
            item.className = 'dc-validation-item';
            item.dataset.check = check.id;
            row.type = 'button';
            row.className = 'dc-validation-row';
            row.tabIndex = -1;
            row.setAttribute('aria-disabled', 'true');
            row.setAttribute('aria-expanded', 'false');
            row.setAttribute('aria-controls', panelId);
            row.innerHTML = `<span class="dc-validation-dot" aria-hidden="true"></span><span class="dc-validation-copy"><strong>${this.esc(check.label)}</strong><span>${this.esc(check.desc)}</span></span><img class="dc-validation-arrow" src="${this.icon('Arrow Right')}" alt="" aria-hidden="true">`;
            const panel = document.createElement('div');
            panel.id = panelId;
            panel.className = 'dc-validation-details';
            panel.hidden = true;
            panel.setAttribute('aria-hidden', 'true');
            row.addEventListener('click', () => this.toggleValidationDetails(item));
            item.append(row, panel);
            list.appendChild(item);
        });
        page.appendChild(list);
        this.appendFooter(page, []);

        const started = performance.now();
        const results = project.type === 'pwa'
            ? await this.validatePwa(project, (id, status, detail, diagnostics) => this.setCheck(list, id, status, detail, diagnostics), runId)
            : await this.validateProfessional(project, (id, status, detail, diagnostics) => this.setCheck(list, id, status, detail, diagnostics), runId);
        const rest = Math.max(0, 1500 - (performance.now() - started));
        await new Promise((resolve) => setTimeout(resolve, rest));
        if (runId !== this._validationRun || !page.isConnected) return;
        const passed = results.every(Boolean);
        const buttons = passed
            ? [this.button(importMode
                ? (typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Finish import' : '完成导入')
                : (project.type === 'pwa' ? this.text('finishDesktop') : this.text('finish')), 'primary', () => importMode
                    ? this.finishImportedApp(project)
                    : this.finishPackaging(project, project.type === 'pwa'), 'Check Circle')]
            : [
                this.button(importMode
                    ? (typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Back to My Apps' : '返回我的 Apps')
                    : this.text('backEdit'), 'secondary', () => importMode ? this.navigate('apps') : this.openProject(project.id), 'Arrow Left'),
                this.button(this.text('retry'), 'primary', () => this.startValidation(page, project, options), 'Refresh')
            ];
        this.appendFooter(page, buttons);
    },

    setCheck(list, id, status, detail = '', diagnostics = []) {
        const item = list.querySelector(`[data-check="${id}"]`);
        if (!item) return;
        const row = item.querySelector('.dc-validation-row');
        const panel = item.querySelector('.dc-validation-details');
        item.classList.remove('is-running', 'is-pass', 'is-fail');
        if (status) item.classList.add(`is-${status}`);
        if (detail) item.querySelector('.dc-validation-copy span').textContent = detail;

        const entries = Array.isArray(diagnostics) ? diagnostics.filter(Boolean) : [];
        item.classList.toggle('has-details', entries.length > 0);
        row.tabIndex = entries.length ? 0 : -1;
        row.setAttribute('aria-disabled', entries.length ? 'false' : 'true');
        if (!entries.length) {
            item.classList.remove('is-expanded');
            row.setAttribute('aria-expanded', 'false');
            panel.hidden = true;
            panel.setAttribute('aria-hidden', 'true');
            panel.replaceChildren();
            return;
        }

        const english = typeof I18n !== 'undefined' && I18n.currentLang === 'en';
        const content = document.createElement('div');
        content.className = 'dc-validation-details-content';
        const heading = document.createElement('strong');
        heading.className = 'dc-validation-details-heading';
        heading.textContent = english ? 'Rejection details' : '拒绝详细信息';
        content.appendChild(heading);
        entries.forEach((diagnostic) => content.appendChild(this.renderValidationDiagnostic(diagnostic)));
        panel.replaceChildren(content);
    },

    toggleValidationDetails(item) {
        if (!item?.classList.contains('has-details')) return;
        const row = item.querySelector('.dc-validation-row');
        const panel = item.querySelector('.dc-validation-details');
        const expanded = !item.classList.contains('is-expanded');
        if (expanded) panel.hidden = false;
        requestAnimationFrame(() => {
            item.classList.toggle('is-expanded', expanded);
            row.setAttribute('aria-expanded', String(expanded));
            panel.setAttribute('aria-hidden', String(!expanded));
        });
        if (!expanded) {
            setTimeout(() => {
                if (!item.classList.contains('is-expanded')) panel.hidden = true;
            }, 240);
        }
    },

    renderValidationDiagnostic(diagnostic) {
        const english = typeof I18n !== 'undefined' && I18n.currentLang === 'en';
        const entry = document.createElement('div');
        entry.className = 'dc-validation-diagnostic';
        const head = document.createElement('div');
        head.className = 'dc-validation-diagnostic-head';
        const title = document.createElement('strong');
        title.textContent = diagnostic.title || (english ? 'Blocked item' : '被拒绝的项目');
        head.appendChild(title);
        if (diagnostic.file) {
            const location = document.createElement('span');
            location.className = 'dc-validation-location';
            location.textContent = diagnostic.line
                ? `${diagnostic.file} · ${english ? 'Line' : '第'} ${diagnostic.line}${english ? '' : ' 行'}${diagnostic.column ? `:${diagnostic.column}` : ''}`
                : diagnostic.file;
            head.appendChild(location);
        }
        entry.appendChild(head);
        if (diagnostic.message) {
            const message = document.createElement('p');
            message.textContent = diagnostic.message;
            entry.appendChild(message);
        }
        if (diagnostic.api) {
            const api = document.createElement('div');
            api.className = 'dc-validation-api';
            const label = document.createElement('span');
            label.textContent = 'API';
            const value = document.createElement('code');
            value.textContent = diagnostic.api;
            api.append(label, value);
            entry.appendChild(api);
        }
        if (diagnostic.code) {
            const code = document.createElement('pre');
            const value = document.createElement('code');
            value.textContent = diagnostic.line ? `${diagnostic.line}  ${diagnostic.code}` : diagnostic.code;
            code.appendChild(value);
            entry.appendChild(code);
        }
        return entry;
    },

    validationSources(project) {
        return [
            { file: 'index.html', code: String(project.html || '') },
            { file: 'styles.css', code: String(project.css || '') },
            { file: 'app.js', code: String(project.js || '') }
        ];
    },

    findValidationMatches(sources, rules, limit = 20) {
        const results = [];
        for (const rule of rules) {
            for (const source of sources) {
                const flags = rule.regex.flags.replace(/y/g, '').includes('g')
                    ? rule.regex.flags.replace(/y/g, '')
                    : `${rule.regex.flags.replace(/y/g, '')}g`;
                const regex = new RegExp(rule.regex.source, flags);
                let match;
                while ((match = regex.exec(source.code)) && results.length < limit) {
                    const before = source.code.slice(0, match.index);
                    const line = before.split(/\r?\n/).length;
                    const lastBreak = Math.max(before.lastIndexOf('\n'), before.lastIndexOf('\r'));
                    const column = match.index - lastBreak;
                    const code = source.code.split(/\r?\n/)[line - 1]?.trim() || match[0];
                    results.push({ ...rule, file: source.file, line, column, code, match: match[0] });
                    if (!match[0]) regex.lastIndex += 1;
                }
                if (results.length >= limit) return results;
            }
        }
        return results;
    },

    validationErrorLocation(error, source, generatedOffset = 0) {
        let line = Number(error?.lineNumber) || 0;
        let column = Number(error?.columnNumber) || 0;
        const stackLocation = String(error?.stack || '').match(/<anonymous>:(\d+):(\d+)/);
        if (!line && stackLocation) {
            line = Math.max(1, Number(stackLocation[1]) - generatedOffset);
            column = Number(stackLocation[2]) || 0;
        }
        return {
            file: source?.file || '',
            line,
            column,
            code: line ? source?.code.split(/\r?\n/)[line - 1]?.trim() || '' : ''
        };
    },

    validationDiagnostic(match, title, message, api = '') {
        return {
            title,
            message,
            api,
            file: match?.file || '',
            line: match?.line || 0,
            column: match?.column || 0,
            code: match?.code || ''
        };
    },

    async validatePwa(project, update, runId) {
        let url = null;
        const urlCode = String(project.url || '');
        const detailFor = (title, message) => [{ title, message, file: 'App URL', code: urlCode }];
        update('https', 'running');
        try { url = new URL(project.url); } catch (_) {}
        const https = url?.protocol === 'https:';
        update('https', https ? 'pass' : 'fail', https ? 'HTTPS transport enabled' : 'Only HTTPS websites can be packaged', https ? [] : detailFor('HTTPS is required', 'Change the App URL to a valid https:// address.'));

        update('safe-url', 'running');
        const hostname = String(url?.hostname || '').toLowerCase();
        const privateHost = /^(?:0\.|10\.|127\.|169\.254\.|192\.168\.)/.test(hostname) ||
            /^172\.(?:1[6-9]|2\d|3[01])\./.test(hostname) ||
            ['localhost', '::1', '[::1]', '0.0.0.0'].includes(hostname) || hostname.endsWith('.local');
        const safe = !!url && !url.username && !url.password && !privateHost;
        update('safe-url', safe ? 'pass' : 'fail', safe ? 'URL passed local safety rules' : 'Local, credential-bearing, or unsafe URLs are blocked', safe ? [] : detailFor('URL was rejected', 'Remove credentials and use a public, non-local HTTPS host.'));

        update('metadata', 'running');
        const metadata = !!String(project.description || '').trim() && !!String(project.developer || '').trim();
        update('metadata', metadata ? 'pass' : 'fail', metadata ? 'Required App information is complete' : 'App description or developer information is missing', metadata ? [] : [{ title: 'Incomplete App information', message: 'Return to App information and complete every required field.', file: 'App manifest' }]);

        update('apis', 'running');
        const permissions = Array.isArray(project.permissions) ? project.permissions : [];
        const network = DeveloperCenterStore.normalizeNetworkConfig(project.network);
        const invalidPermissions = permissions.filter((permission) => !DeveloperCenterStore.PWA_PERMISSIONS.includes(permission));
        const apis = invalidPermissions.length === 0 && network.connect.length === 0 && network.image.length === 0;
        const permissionSummary = permissions.includes('storage.local')
            ? 'PWA requests browser local storage access'
            : 'PWA requests no optional capability';
        update('apis', apis ? 'pass' : 'fail', apis ? permissionSummary : 'PWA requests an unsupported permission or network allowlist', apis ? [] : [{ title: 'PWA permission rejected', message: 'PWAs may only request storage.local and cannot use FluentOS network allowlists.', file: 'App manifest' }]);
        return [https, safe, metadata, apis];
    },

    probeIframe(url, runId) {
        return new Promise((resolve) => {
            const frame = document.createElement('iframe');
            frame.sandbox = 'allow-scripts allow-forms';
            frame.referrerPolicy = 'no-referrer';
            frame.style.cssText = 'position:fixed;width:2px;height:2px;opacity:0;pointer-events:none;left:-10px;top:-10px';
            let done = false;
            const finish = (value) => {
                if (done) return;
                done = true;
                clearTimeout(timer);
                frame.remove();
                resolve(runId === this._validationRun && value);
            };
            frame.addEventListener('load', () => setTimeout(() => finish(true), 250), { once: true });
            frame.addEventListener('error', () => finish(false), { once: true });
            const timer = setTimeout(() => finish(false), 5000);
            document.body.appendChild(frame);
            frame.src = url;
        });
    },

    async validateProfessional(project, update, runId) {
        const english = typeof I18n !== 'undefined' && I18n.currentLang === 'en';
        const sources = this.validationSources(project);
        update('syntax', 'running');
        let syntax = true;
        let syntaxDetail = 'HTML, CSS, and JavaScript parsed successfully';
        let syntaxSource = sources[2];
        let syntaxDiagnostic = [];
        try {
            new Function(`"use strict";\n${project.js || ''}`);
            syntaxSource = sources[1];
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(project.css || '');
            syntaxSource = sources[0];
            const template = document.createElement('template');
            template.innerHTML = project.html || '';
        } catch (error) {
            syntax = false;
            syntaxDetail = error.message || 'Source contains a syntax error';
            const location = this.validationErrorLocation(error, syntaxSource, syntaxSource.file === 'app.js' ? 2 : 0);
            syntaxDiagnostic = [this.validationDiagnostic(location, english ? 'Syntax error' : '语法错误', syntaxDetail)];
        }
        update('syntax', syntax ? 'pass' : 'fail', syntaxDetail, syntaxDiagnostic);

        update('malicious', 'running');
        const dangerousRules = [
            { regex: /\beval\s*\(/, name: 'eval()' }, { regex: /\bFunction\s*\(/, name: 'Function()' },
            { regex: /document\s*\.\s*cookie/i, name: 'document.cookie' },
            { regex: /(?:\bwindow\s*\.\s*(?:parent|top|opener)\b|\b(?:parent|top|opener)\s*\.\s*(?:document|location|frames|window|parent|top|opener|postMessage)\b)/i, name: 'host-window access' },
            { regex: /<script[^>]+src\s*=\s*["']?https?:/i, name: 'remote script' },
            { regex: /javascript\s*:/i, name: 'javascript URL' }
        ];
        const dangerousMatches = this.findValidationMatches(sources, dangerousRules);
        const dangerous = dangerousMatches[0];
        const dangerousDiagnostics = dangerousMatches.map((match) => this.validationDiagnostic(
            match,
            english ? 'Blocked code pattern' : '被阻止的代码模式',
            english ? `${match.name} is not allowed in the App sandbox.` : `App 沙盒不允许使用 ${match.name}。`,
            match.name
        ));
        update('malicious', dangerous ? 'fail' : 'pass', dangerous ? `Blocked pattern: ${dangerous.name}` : 'No blocked code pattern was found', dangerousDiagnostics);

        update('apis', 'running');
        const apiRules = [
            { regex: /\bfetch\s*\(/, name: 'fetch' }, { regex: /\bXMLHttpRequest\b/, name: 'XMLHttpRequest' },
            { regex: /\bWebSocket\b/, name: 'WebSocket' }, { regex: /\bEventSource\b/, name: 'EventSource' },
            { regex: /navigator\s*\.\s*sendBeacon\s*\(/, name: 'navigator.sendBeacon' },
            { regex: /<\s*img\b[^>]*\bsrc\s*=\s*["']?\s*https?:\/\//i, name: 'remote img src' },
            { regex: /<\s*iframe\b[^>]*\bsrc\s*=\s*["']?\s*https?:\/\//i, name: 'remote iframe src' },
            { regex: /<\s*script\b[^>]*\bsrc\s*=\s*["']?\s*https?:\/\//i, name: 'remote script src' },
            { regex: /<\s*link\b[^>]*\bhref\s*=\s*["']?\s*https?:\/\//i, name: 'remote link href' },
            { regex: /(?:url\s*\(\s*|@import\s+)["']?\s*https?:\/\//i, name: 'remote CSS URL' },
            { regex: /\bindexedDB\b/, name: 'indexedDB' },
            { regex: /\blocalStorage\b|\bsessionStorage\b/, name: 'direct browser storage' },
            { regex: /navigator\s*\.\s*(?:clipboard|geolocation|mediaDevices|usb|serial|bluetooth)/, name: 'privileged navigator API' }
        ];
        const declaredPermissions = new Set(Array.isArray(project.permissions) ? project.permissions : []);
        const invalidPermission = [...declaredPermissions].find((permission) => !DeveloperCenterStore.SUPPORTED_PERMISSIONS.includes(permission));
        const permissionRules = [
            { regex: /FluentOS\s*\.\s*storage\s*\.\s*(?:get|set|remove)\s*\(/, permission: 'storage.local' },
            { regex: /FluentOS\s*\.\s*call\s*\(\s*['"]storage\.(?:get|set|remove)['"]/, permission: 'storage.local' },
            { regex: /FluentOS\s*\.\s*system\s*\.\s*(?:setTheme|toggleTheme)\s*\(/, permission: 'system.theme.write' },
            { regex: /FluentOS\s*\.\s*window\s*\.\s*(?:setTitle|setSize)\s*\(/, permission: 'window.manage' },
            { regex: /FluentOS\s*\.\s*files\s*\.\s*(?:listText|readText)\s*\(/, permission: 'files.readText' },
            { regex: /FluentOS\s*\.\s*files\s*\.\s*(?:writeText|createText)\s*\(/, permission: 'files.writeText' },
            { regex: /FluentOS\s*\.\s*desktop\s*\.\s*(?:addShortcut|removeShortcut)\s*\(/, permission: 'desktop.manage' },
            { regex: /FluentOS\s*\.\s*clipboard\s*\.\s*read\s*\(/, permission: 'clipboard.read' },
            { regex: /FluentOS\s*\.\s*call\s*\(\s*['"]clipboard\.read['"]/, permission: 'clipboard.read' },
            { regex: /FluentOS\s*\.\s*clipboard\s*\.\s*write\s*\(/, permission: 'clipboard.write' },
            { regex: /FluentOS\s*\.\s*call\s*\(\s*['"]clipboard\.write['"]/, permission: 'clipboard.write' },
            { regex: /FluentOS\s*\.\s*network\s*\.\s*request\s*\(/, permission: 'network.request' },
            { regex: /FluentOS\s*\.\s*network\s*\.\s*loadImage\s*\(/, permission: 'network.image' }
        ];
        const missingPermissionMatches = this.findValidationMatches(
            sources,
            permissionRules.filter((rule) => !declaredPermissions.has(rule.permission))
        );
        const unsupportedMatches = this.findValidationMatches(sources, apiRules);
        let networkProblem = '';
        try {
            const network = DeveloperCenterStore.normalizeNetworkConfig(project.network);
            project.network = network;
            if (network.connect.length > 0 && !declaredPermissions.has('network.request')) networkProblem = 'Declare network.request for network.connect domains';
            else if (network.image.length > 0 && !declaredPermissions.has('network.image')) networkProblem = 'Declare network.image for network.image domains';
            else if (declaredPermissions.has('network.request') && network.connect.length === 0) networkProblem = 'network.request requires at least one network.connect domain';
            else if (declaredPermissions.has('network.image') && network.image.length === 0) networkProblem = 'network.image requires at least one network.image domain';
        } catch (error) { networkProblem = error.message || 'Invalid network allowlist'; }
        const apiProblems = [];
        const apiDiagnostics = [];
        if (invalidPermission) {
            const message = `Unknown requested permission: ${invalidPermission}`;
            apiProblems.push(message);
            apiDiagnostics.push({
                title: english ? 'Unknown permission' : '未知权限', message,
                file: english ? 'App manifest' : 'App 清单', api: invalidPermission
            });
        }
        if (networkProblem) {
            apiProblems.push(networkProblem);
            apiDiagnostics.push({
                title: english ? 'Network permission configuration' : '网络权限配置',
                message: networkProblem,
                file: english ? 'App manifest' : 'App 清单',
                api: networkProblem.includes('network.image') ? 'network.image' : 'network.request'
            });
        }
        missingPermissionMatches.forEach((match) => {
            const message = `Declare permission before using this API: ${match.permission}`;
            apiProblems.push(message);
            apiDiagnostics.push(this.validationDiagnostic(
                match,
                english ? 'Permission required' : '需要声明权限',
                message,
                match.permission
            ));
        });
        unsupportedMatches.forEach((match) => {
            const message = `Use the FluentOS API instead of ${match.name}`;
            apiProblems.push(message);
            apiDiagnostics.push(this.validationDiagnostic(
                match,
                english ? 'Browser API rejected' : '浏览器 API 被拒绝',
                message,
                match.name
            ));
        });
        const apiProblem = apiProblems[0] || '';
        const apiSummary = apiProblem && apiProblems.length > 1 ? `${apiProblem} (+${apiProblems.length - 1} more)` : apiProblem;
        update('apis', apiProblem ? 'fail' : 'pass', apiSummary || 'Only declared sandbox and FluentOS APIs are referenced', apiDiagnostics);

        update('runtime', 'running');
        const staticReport = syntax && !dangerous && !apiProblem
            ? DeveloperCenterStore.inspectAppSafety(project)
            : { ok: false, detail: 'Static package inspection skipped until source issues are fixed' };
        const integrityDiagnostics = staticReport.ok ? [] : [{
            title: english ? 'Static package inspection was rejected' : '静态安装包检查未通过',
            message: staticReport.detail,
            file: english ? 'App package' : 'App 安装包'
        }];
        update('runtime', staticReport.ok ? 'pass' : 'fail', staticReport.ok ? 'Static inspection passed without running App code' : staticReport.detail, integrityDiagnostics);
        return [syntax, !dangerous, !apiProblem, staticReport.ok];
    },

    probeProfessional(project, runId) {
        return new Promise((resolve) => {
            const container = document.createElement('div');
            container.style.cssText = 'position:fixed;width:2px;height:2px;opacity:0;pointer-events:none;left:-10px;top:-10px;overflow:hidden';
            let frame = null;
            let timer = null;
            let done = false;
            const finish = (ok, detail, diagnostic = {}) => {
                if (done) return;
                done = true;
                clearTimeout(timer);
                if (frame?.contentWindow) DeveloperCreatedRuntime._releaseFrame(frame.contentWindow);
                container.remove();
                resolve({ ok: runId === this._validationRun && ok, detail, ...diagnostic });
            };
            document.body.appendChild(container);
            try {
                frame = DeveloperCreatedRuntime.mountAppFrame(
                    container,
                    project,
                    `developer-center-validation-${runId}`,
                    this.windowId,
                    {
                        readOnly: true,
                        onRuntimeError: (message, metadata = {}) => {
                            if (!String(message).includes('This validation session permits read-only FluentOS APIs only')) {
                                const line = Math.max(0, Number(metadata.line) || 0);
                                finish(false, message, {
                                    file: line ? 'app.js' : '',
                                    line,
                                    column: Math.max(0, Number(metadata.column) || 0),
                                    code: line ? String(project.js || '').split(/\r?\n/)[line - 1]?.trim() || '' : ''
                                });
                            }
                        }
                    }
                );
                frame.addEventListener('load', () => setTimeout(() => finish(true, 'App started in the isolated read-only sandbox'), 700), { once: true });
            } catch (error) {
                finish(false, error.message || 'Sandbox startup failed');
                return;
            }
            timer = setTimeout(() => finish(false, 'Sandbox startup timed out'), 3500);
        });
    },

    async finishPackaging(project, addDesktop) {
        const existingApps = await DeveloperCenterStore.getAll('apps');
        const existing = existingApps.find((app) => app.projectId === project.id);
        const app = await DeveloperCenterStore.saveApp({
            ...existing,
            ...project,
            id: existing?.id || DeveloperCenterStore.createId('created-app'),
            projectId: project.id,
            importedFromFap: project.importedFromFap === true,
            permissionConsentRequired: project.importedFromFap === true || project.permissionConsentRequired === true
        });
        DeveloperCreatedRuntime.register(app);
        if (addDesktop) Desktop.addAppShortcut(app.id);
        DeveloperCreatedRuntime.refreshShell();
        this.toast(`${app.name} ${this.text('saved')}`);
        this.activeProjectId = null;
        this.navigate('apps');
    },

    async finishImportedApp(imported) {
        imported.importedFromFap = true;
        imported.permissionConsentRequired = true;
        const project = await DeveloperCenterStore.saveProject({
            id: imported.projectId,
            name: imported.name,
            type: imported.type,
            title: imported.title,
            icon: imported.icon,
            url: imported.url,
            html: imported.html,
            css: imported.css,
            js: imported.js,
            forceFluentUI: imported.forceFluentUI === true,
            permissions: imported.permissions || [],
            network: DeveloperCenterStore.normalizeNetworkConfig(imported.network),
            importedFromFap: true,
            permissionConsentRequired: true,
            sourcePackageId: imported.sourcePackageId
        });
        imported.projectId = project.id;
        const app = await DeveloperCenterStore.saveApp(imported);
        DeveloperCreatedRuntime.register(app);
        DeveloperCreatedRuntime.refreshShell();
        this.toast(this.text('importSuccess'));
        this.activeProjectId = null;
        this.navigate('apps');
    },

    async renderMyApps(page) {
        const renderToken = page.dataset.dcRenderToken;
        const importButton = this.button(this.text('import'), 'primary', () => page.querySelector('.dc-import-input')?.click(), 'Download');
        page.appendChild(this.heading(this.text('myAppsTitle'), this.text('myAppsDesc'), importButton));
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.fap,application/vnd.fluent.app-package';
        input.className = 'dc-hidden-input dc-import-input';
        input.addEventListener('change', () => this.importPackage(input.files?.[0]));
        page.appendChild(input);
        const apps = await DeveloperCenterStore.getAll('apps');
        if (!this.isCurrentRender(page, 'apps', renderToken)) return;
        if (!apps.length) {
            const empty = document.createElement('div');
            empty.className = 'dc-empty';
            empty.innerHTML = `<img src="${this.icon('Dashboard')}" alt=""><h3>${this.text('noApps')}</h3><p>${this.text('noAppsDesc')}</p>`;
            page.appendChild(empty);
            return;
        }
        const grid = document.createElement('div');
        grid.className = 'dc-grid';
        apps.sort((a,b) => String(b.modifiedAt).localeCompare(String(a.modifiedAt))).forEach((app) => grid.appendChild(this.createAppCard(app)));
        page.appendChild(grid);
    },

    createAppCard(app) {
        const card = document.createElement('article');
        card.className = 'dc-card dc-project-card';
        const onDesktop = this.isOnDesktop(app.id);
        card.innerHTML = `<div class="dc-project-top"><img src="${this.esc(app.icon || 'Theme/Icon/App_icon/created_app.png')}" alt=""><strong>${this.esc(app.name)}</strong></div><div class="dc-project-meta"><span class="dc-badge">${app.type === 'pwa' ? 'PWA' : 'HTML / JS'}</span><span>${this.formatDate(app.modifiedAt)}</span></div><div class="dc-app-actions"></div>`;
        const actions = card.querySelector('.dc-app-actions');
        actions.appendChild(this.button(this.text('open'), 'primary', () => WindowManager.openApp(app.id)));
        actions.appendChild(this.button(this.text('export'), 'secondary', () => this.exportPackage(app)));
        actions.appendChild(this.button(onDesktop ? this.text('removeDesktop') : this.text('addDesktop'), 'secondary', async () => {
            if (onDesktop) Desktop.removeAppShortcut(app.id); else Desktop.addAppShortcut(app.id);
            Desktop.renderIcons(); this.renderCurrentPage();
        }));
        actions.appendChild(this.button(this.text('delete'), 'secondary', () => this.confirmDeleteApp(app)));
        card.addEventListener('contextmenu', (event) => this.showAppContextMenu(event, app));
        return card;
    },

    isOnDesktop(appId) {
        const desktop = State.findNode('desktop');
        return !!desktop?.children?.some((node) => node.type === 'app' && node.appId === appId);
    },

    async exportPackage(app) {
        try {
            const zipBlob = await DeveloperCenterStore.exportApp(app);
            const blob = new Blob([zipBlob], { type: DeveloperCenterStore.PACKAGE_MIME });
            const safe = String(app.name || 'app').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80) || 'app';
            const filename = `${safe}.fap`;
            let packageFile;
            try { packageFile = new File([blob], filename, { type: DeveloperCenterStore.PACKAGE_MIME }); }
            catch (_) {
                packageFile = blob;
                packageFile.name = filename;
            }

            // Never offer a package that the installer itself cannot read. This
            // checks the exact bytes that will be downloaded without running App code.
            const verified = await DeveloperCenterStore.importApp(packageFile);
            if (verified.sourcePackageId !== String(app.id || '') || verified.name !== String(app.name || '').trim() || verified.type !== app.type) {
                throw new Error('Exported package self-check failed');
            }
            DeveloperCenterStore.download(packageFile, filename);
            this.toast(this.text('exportSuccess'));
        } catch (error) {
            console.warn('[DeveloperCenter] Package export failed self-check:', error);
            this.toast(error.message || this.text('importFailed'), 'error');
        }
    },

    async importPackage(file) {
        if (!file) return;
        try {
            if (!String(file.name || '').toLowerCase().endsWith('.fap')) throw new Error('Only .fap packages are supported');
            WindowManager.openApp('app-installer', { packageFile: file, source: 'developer-center' });
        } catch (error) { this.toast(`${this.text('importFailed')}: ${error.message}`, 'error'); }
    },

    confirmDeleteApp(app) {
        FluentUI.Dialog({
            type: 'warning', title: this.text('confirmDelete'), content: `${this.text('confirmDeleteText')}<br><strong>${this.esc(app.name)}</strong>`,
            buttons: [
                { text: this.text('cancel'), variant: 'secondary', value: false },
                { text: this.text('delete'), variant: 'danger', value: true }
            ],
            onClose: async (confirmed) => {
                if (!confirmed) return;
                await DeveloperCreatedRuntime.unregister(app.id);
                await DeveloperCenterStore.remove('apps', app.id);
            }
        });
    },

    async renderTools(page) {
        page.appendChild(this.heading(this.text('toolsTitle'), this.text('toolsDesc')));
        const grid = document.createElement('div');
        grid.className = 'dc-grid';
        page.appendChild(grid);
        this.TOOLS.forEach((tool) => grid.appendChild(this.createToolCard(tool, false)));
    },

    async searchAll(query) {
        const normalized = String(query || '').trim().toLocaleLowerCase();
        if (!normalized) return [];
        const [projects, apps] = await Promise.all([
            DeveloperCenterStore.getAll('projects'),
            DeveloperCenterStore.getAll('apps')
        ]);
        const includes = (value) => String(value || '').toLocaleLowerCase().includes(normalized);
        const projectResults = projects.filter((project) => includes(`${project.name} ${project.type}`)).map((project) => ({
            id: `project:${project.id}`,
            title: project.name,
            subtitle: typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Project' : '项目',
            iconSrc: project.icon || 'Theme/Icon/App_icon/created_app.png',
            data: { kind: 'project', id: project.id }
        }));
        const appResults = apps.filter((app) => includes(`${app.name} ${app.type}`)).map((app) => ({
            id: `app:${app.id}`,
            title: app.name,
            subtitle: typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Packaged App' : '已封装 App',
            iconSrc: app.icon || 'Theme/Icon/App_icon/created_app.png',
            data: { kind: 'app', id: app.id }
        }));
        const toolResults = this.TOOLS.filter((tool) => includes(`${tool.id} ${tool.title} ${this.TEXT.zh[tool.title] || ''} ${this.TEXT.en[tool.title] || ''} ${tool.descZh} ${tool.descEn}`)).map((tool) => ({
            id: `tool:${tool.id}`,
            title: this.text(tool.title),
            subtitle: typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Tool' : '工具',
            icon: tool.icon,
            data: { kind: 'tool', id: tool.id }
        }));
        return [...projectResults, ...appResults, ...toolResults].slice(0, 30);
    },

    openSearchResult(result) {
        const target = result?.data;
        if (!target?.id) return;
        this.frame?.clearSidebarSearch?.();
        if (target.kind === 'project') this.openProject(target.id);
        else if (target.kind === 'app') WindowManager.openApp(target.id);
        else if (target.kind === 'tool') this.openTool(target.id);
    },

    showContextMenu(event, items) {
        event.preventDefault();
        event.stopPropagation();
        this.closeContextMenu();
        const menu = document.createElement('div');
        menu.className = 'dc-context-menu';
        items.forEach((item) => {
            const button = document.createElement('button');
            button.type = 'button';
            if (item.danger) button.classList.add('is-danger');
            button.innerHTML = `<img src="${this.icon(item.icon)}" alt=""><span>${this.esc(item.label)}</span>`;
            button.addEventListener('click', () => {
                this.closeContextMenu();
                item.action();
            });
            menu.appendChild(button);
        });
        document.body.appendChild(menu);
        const width = 200;
        const height = items.length * 42 + 10;
        menu.style.left = `${Math.max(8, Math.min(event.clientX, innerWidth - width - 8))}px`;
        menu.style.top = `${Math.max(8, Math.min(event.clientY, innerHeight - height - 8))}px`;
        this._contextMenu = menu;
        setTimeout(() => document.addEventListener('pointerdown', this._closeContextBound = (pointerEvent) => {
            if (!menu.contains(pointerEvent.target)) this.closeContextMenu();
        }, { once: true }), 0);
    },

    showProjectContextMenu(event, project) {
        this.showContextMenu(event, [
            { label: this.text('open'), icon: 'Folder Open', action: () => this.openProject(project.id) },
            { label: this.text('package'), icon: 'Dashboard Check', action: () => this.packageProject(project) },
            { label: this.text('delete'), icon: 'Trash', danger: true, action: () => this.confirmDeleteProject(project) }
        ]);
    },

    showAppContextMenu(event, app) {
        this.showContextMenu(event, [
            { label: this.text('open'), icon: 'Dashboard', action: () => WindowManager.openApp(app.id) },
            { label: this.text('export'), icon: 'Download', action: () => this.exportPackage(app) },
            { label: this.text('delete'), icon: 'Trash', danger: true, action: () => this.confirmDeleteApp(app) }
        ]);
    },

    async showToolContextMenu(event, tool, onHome) {
        event.preventDefault();
        event.stopPropagation();
        const favorites = await DeveloperCenterStore.getFavorites();
        const isFavorite = favorites.includes(tool.id);
        const remove = onHome || isFavorite;
        this.showContextMenu(event, [{
            label: remove ? this.text('removeHome') : this.text('addHome'),
            icon: remove ? 'Minus Circle' : 'Plus Circle',
            action: async () => {
                const next = remove ? favorites.filter((id) => id !== tool.id) : [...favorites, tool.id];
                await DeveloperCenterStore.setFavorites(next);
            }
        }]);
    },

    closeContextMenu() {
        this._contextMenu?.remove();
        this._contextMenu = null;
        if (this._closeContextBound) document.removeEventListener('pointerdown', this._closeContextBound);
        this._closeContextBound = null;
    },

    openTool(toolId) {
        this._afterSecondaryExit(() => {
            this.activePage = 'tools';
            this.activeToolId = toolId;
            this.frame?.navigate?.('tools', { preserveScroll: false, force: this.frame?.activeId === 'tools' });
        });
    },

    renderToolDetail(page, toolId) {
        if (!page) return;
        page.innerHTML = '';
        page.className = 'fw-page dc-page dc-page-simple';
        this._markSecondaryPage(page);
        const tool = this.TOOLS.find((item) => item.id === toolId);
        const back = this.button(this.text('tools'), 'secondary', () => this.navigate('tools'), 'Arrow Left');
        page.appendChild(this.heading(this.text(tool?.title || toolId), typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? tool?.descEn : tool?.descZh, back));
        this.renderToolWorkspace(page, toolId);
    },

    renderToolWorkspace(page, toolId) {
        const workspace = document.createElement('div');
        workspace.className = 'dc-tool-workspace';
        const outputClass = toolId === 'qrcode' ? 'dc-qr-output' : '';
        workspace.innerHTML = `<section class="dc-tool-panel"><h3>${this.text('input')}</h3><textarea class="dc-textarea dc-tool-input" spellcheck="false"></textarea><div class="dc-tool-actions"></div></section><section class="dc-tool-panel"><h3>${this.text('output')}</h3><textarea class="dc-textarea dc-tool-output ${outputClass}" readonly spellcheck="false"></textarea></section>`;
        if (toolId === 'qrcode') {
            const old = workspace.querySelector('.dc-tool-output');
            const output = document.createElement('div');
            output.className = 'dc-tool-output dc-qr-output';
            old.replaceWith(output);
        }
        page.appendChild(workspace);
        const input = workspace.querySelector('.dc-tool-input');
        const output = workspace.querySelector('.dc-tool-output');
        const actions = workspace.querySelector('.dc-tool-actions');
        const add = (text, fn, variant = 'secondary') => actions.appendChild(this.button(text, variant, fn));
        const set = (value) => { if ('value' in output) output.value = value; else output.textContent = value; };
        const get = () => input.value;
        if (toolId === 'json') {
            add(this.text('run'), () => { try { set(JSON.stringify(JSON.parse(get()), null, 2)); } catch (e) { set(e.message); } }, 'primary');
            add(typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Minify' : '压缩', () => { try { set(JSON.stringify(JSON.parse(get()))); } catch (e) { set(e.message); } });
        } else if (toolId === 'base64') {
            add(this.text('encode'), () => { try { set(btoa(String.fromCharCode(...new TextEncoder().encode(get())))); } catch (e) { set(e.message); } }, 'primary');
            add(this.text('decode'), () => { try { set(new TextDecoder().decode(Uint8Array.from(atob(get().trim()), (c) => c.charCodeAt(0)))); } catch (e) { set(e.message); } });
        } else if (toolId === 'url') {
            add(this.text('encode'), () => set(encodeURIComponent(get())), 'primary');
            add(this.text('decode'), () => { try { set(decodeURIComponent(get())); } catch (e) { set(e.message); } });
        } else if (toolId === 'timestamp') {
            input.placeholder = '2026-07-14 12:00:00 / 1784001600';
            add(this.text('run'), () => {
                const raw = get().trim();
                const numeric = /^\d{10,13}$/.test(raw);
                const date = numeric ? new Date(Number(raw) * (raw.length === 10 ? 1000 : 1)) : new Date(raw || Date.now());
                set(Number.isNaN(date.getTime()) ? 'Invalid date' : `${date.toLocaleString()}\nISO: ${date.toISOString()}\nUnix: ${Math.floor(date.getTime()/1000)}\nMilliseconds: ${date.getTime()}`);
            }, 'primary');
        } else if (toolId === 'hash') {
            add(this.text('run'), async () => {
                const bytes = new TextEncoder().encode(get());
                const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
                const sha = Array.from(digest, (b) => b.toString(16).padStart(2,'0')).join('');
                set(`SHA-256\n${sha}\n\nCRC32\n${DeveloperCenterStore.crc32(bytes).toString(16).padStart(8,'0')}`);
            }, 'primary');
        } else if (toolId === 'qrcode') {
            input.placeholder = typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Up to 17 UTF-8 bytes' : '最多 17 个 UTF-8 字节';
            add(this.text('generate'), () => { try { this.renderQr(output, get()); } catch (e) { output.textContent = e.message; } }, 'primary');
        } else if (toolId === 'regex') {
            input.placeholder = typeof I18n !== 'undefined' && I18n.currentLang === 'en'
                ? '/pattern/flags\nText to test'
                : '/表达式/标志\n需要测试的文本';
            add(this.text('run'), () => {
                try {
                    const [expression = '', ...textLines] = get().split(/\r?\n/);
                    const literal = expression.match(/^\/(.*)\/([a-z]*)$/i);
                    const regex = literal ? new RegExp(literal[1], literal[2]) : new RegExp(expression, 'g');
                    const source = textLines.join('\n');
                    const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
                    const matches = [...source.matchAll(new RegExp(regex.source, flags))];
                    set(matches.length ? matches.map((match, index) => `#${index + 1} [${match.index}] ${match[0]}${match.length > 1 ? `\n  groups: ${JSON.stringify(match.slice(1))}` : ''}`).join('\n') : 'No matches');
                } catch (error) { set(error.message); }
            }, 'primary');
        } else if (toolId === 'jwt') {
            input.placeholder = 'eyJhbGciOi...';
            add(this.text('decode'), () => {
                try {
                    const parts = get().trim().split('.');
                    if (parts.length < 2) throw new Error('Invalid JWT');
                    const decodePart = (part) => {
                        const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
                        return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))));
                    };
                    set(`Header\n${JSON.stringify(decodePart(parts[0]), null, 2)}\n\nPayload\n${JSON.stringify(decodePart(parts[1]), null, 2)}\n\nSignature is not verified.`);
                } catch (error) { set(error.message); }
            }, 'primary');
        } else if (toolId === 'uuid') {
            input.placeholder = typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Count (1–100), default 1' : '生成数量（1–100），默认 1';
            add(this.text('generate'), () => {
                const count = Math.max(1, Math.min(100, Number.parseInt(get(), 10) || 1));
                const fallback = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
                    const random = Math.random() * 16 | 0;
                    return (char === 'x' ? random : (random & 3 | 8)).toString(16);
                });
                set(Array.from({ length: count }, () => crypto.randomUUID?.() || fallback()).join('\n'));
            }, 'primary');
        } else if (toolId === 'color') {
            input.placeholder = '#0078d4 / rgb(0, 120, 212) / hsl(206, 100%, 42%)';
            add(this.text('run'), () => { try { set(this.convertColorValue(get())); } catch (error) { set(error.message); } }, 'primary');
        } else if (toolId === 'html-entities') {
            add(this.text('encode'), () => {
                const encoder = document.createElement('textarea');
                encoder.textContent = get();
                set(encoder.innerHTML);
            }, 'primary');
            add(this.text('decode'), () => {
                const decoder = document.createElement('textarea');
                decoder.innerHTML = get();
                set(decoder.value);
            });
        } else if (toolId === 'lines') {
            add(typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Sort' : '排序', () => set(get().split(/\r?\n/).sort((a, b) => a.localeCompare(b)).join('\n')), 'primary');
            add(typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Deduplicate' : '去重', () => set([...new Set(get().split(/\r?\n/))].join('\n')));
            add(typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Remove blanks' : '移除空行', () => set(get().split(/\r?\n/).filter((line) => line.trim()).join('\n')));
        }
        if (toolId !== 'qrcode') add(this.text('copy'), () => navigator.clipboard?.writeText(output.value || '').then(() => this.toast(this.text('copy'))));
        add(this.text('clear'), () => { input.value = ''; set(''); });
    },

    convertColorValue(value) {
        const source = String(value || '').trim();
        let red, green, blue;
        const hex = source.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
        const rgb = source.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
        const hsl = source.match(/^hsla?\(\s*([\d.]+)(?:deg)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/i);
        if (hex) {
            const normalized = hex[1].length === 3 ? [...hex[1]].map((char) => char + char).join('') : hex[1];
            red = parseInt(normalized.slice(0, 2), 16);
            green = parseInt(normalized.slice(2, 4), 16);
            blue = parseInt(normalized.slice(4, 6), 16);
        } else if (rgb) {
            [red, green, blue] = rgb.slice(1, 4).map(Number);
        } else if (hsl) {
            const hue = ((Number(hsl[1]) % 360) + 360) % 360;
            const saturation = Math.max(0, Math.min(100, Number(hsl[2]))) / 100;
            const lightness = Math.max(0, Math.min(100, Number(hsl[3]))) / 100;
            const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
            const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
            const offset = lightness - chroma / 2;
            const parts = hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
            [red, green, blue] = parts.map((part) => Math.round((part + offset) * 255));
        } else throw new Error(typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Unsupported color format' : '不支持的颜色格式');
        [red, green, blue] = [red, green, blue].map((channel) => Math.max(0, Math.min(255, Math.round(channel))));
        const channels = [red, green, blue].map((channel) => channel / 255);
        const max = Math.max(...channels), min = Math.min(...channels), delta = max - min;
        const lightness = (max + min) / 2;
        const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
        let hue = 0;
        if (delta) {
            if (max === channels[0]) hue = 60 * (((channels[1] - channels[2]) / delta) % 6);
            else if (max === channels[1]) hue = 60 * ((channels[2] - channels[0]) / delta + 2);
            else hue = 60 * ((channels[0] - channels[1]) / delta + 4);
        }
        if (hue < 0) hue += 360;
        const hexValue = `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
        return `HEX  ${hexValue}\nRGB  rgb(${red}, ${green}, ${blue})\nHSL  hsl(${Math.round(hue)}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%)`;
    },

    renderQr(output, value) {
        const bytes = new TextEncoder().encode(String(value || ''));
        if (!bytes.length) throw new Error(typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Enter text first' : '请先输入内容');
        if (bytes.length > 17) throw new Error(typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Version 1-L supports up to 17 UTF-8 bytes' : '当前二维码支持最多 17 个 UTF-8 字节');
        const bits = [0,1,0,0];
        for (let i = 7; i >= 0; i--) bits.push((bytes.length >>> i) & 1);
        bytes.forEach((byte) => { for (let i = 7; i >= 0; i--) bits.push((byte >>> i) & 1); });
        for (let i = 0; i < Math.min(4, 152 - bits.length); i++) bits.push(0);
        while (bits.length % 8) bits.push(0);
        const data = [];
        for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((sum, bit) => (sum << 1) | bit, 0));
        for (let pad = 0; data.length < 19; pad++) data.push(pad % 2 ? 0x11 : 0xec);
        const codewords = [...data, ...this.qrErrorCorrection(data, 7)];
        const size = 21;
        const matrix = Array.from({ length: size }, () => Array(size).fill(false));
        const reserved = Array.from({ length: size }, () => Array(size).fill(false));
        const set = (row, col, value) => {
            if (row < 0 || col < 0 || row >= size || col >= size) return;
            matrix[row][col] = !!value; reserved[row][col] = true;
        };
        const finder = (top, left) => {
            for (let row = -1; row <= 7; row++) for (let col = -1; col <= 7; col++) {
                const inside = row >= 0 && row <= 6 && col >= 0 && col <= 6;
                const dark = inside && (row === 0 || row === 6 || col === 0 || col === 6 || (row >= 2 && row <= 4 && col >= 2 && col <= 4));
                set(top + row, left + col, dark);
            }
        };
        finder(0,0); finder(0,14); finder(14,0);
        for (let index = 8; index < size - 8; index++) {
            if (!reserved[6][index]) set(6, index, index % 2 === 0);
            if (!reserved[index][6]) set(index, 6, index % 2 === 0);
        }
        const format = 0x77c4; // Error correction L, mask pattern 0.
        for (let i = 0; i < 15; i++) {
            const bit = ((format >>> i) & 1) === 1;
            const verticalRow = i < 6 ? i : (i < 8 ? i + 1 : size - 15 + i);
            set(verticalRow, 8, bit);
            const horizontalCol = i < 8 ? size - i - 1 : (i === 8 ? 7 : 15 - i - 1);
            set(8, horizontalCol, bit);
        }
        set(size - 8, 8, true);
        const dataBits = [];
        codewords.forEach((byte) => { for (let i = 7; i >= 0; i--) dataBits.push((byte >>> i) & 1); });
        let bitIndex = 0;
        let upward = true;
        for (let right = size - 1; right > 0; right -= 2) {
            if (right === 6) right--;
            for (let step = 0; step < size; step++) {
                const row = upward ? size - 1 - step : step;
                for (let offset = 0; offset < 2; offset++) {
                    const col = right - offset;
                    if (reserved[row][col]) continue;
                    const raw = dataBits[bitIndex++] || 0;
                    matrix[row][col] = !!(raw ^ (((row + col) % 2 === 0) ? 1 : 0));
                }
            }
            upward = !upward;
        }
        const canvas = document.createElement('canvas');
        const scale = 8, quiet = 4;
        canvas.width = canvas.height = (size + quiet * 2) * scale;
        const context = canvas.getContext('2d');
        context.fillStyle = '#fff'; context.fillRect(0,0,canvas.width,canvas.height);
        context.fillStyle = '#000';
        matrix.forEach((row, y) => row.forEach((dark, x) => { if (dark) context.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale); }));
        output.replaceChildren(canvas);
    },

    qrErrorCorrection(data, degree) {
        const exp = new Uint8Array(512);
        const log = new Uint8Array(256);
        let value = 1;
        for (let i = 0; i < 255; i++) {
            exp[i] = value; log[value] = i;
            value <<= 1;
            if (value & 0x100) value ^= 0x11d;
        }
        for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];
        const multiply = (a, b) => (!a || !b) ? 0 : exp[log[a] + log[b]];
        let generator = [1];
        for (let i = 0; i < degree; i++) {
            const next = Array(generator.length + 1).fill(0);
            generator.forEach((coefficient, index) => {
                next[index] ^= coefficient;
                next[index + 1] ^= multiply(coefficient, exp[i]);
            });
            generator = next;
        }
        const message = [...data, ...Array(degree).fill(0)];
        for (let i = 0; i < data.length; i++) {
            const factor = message[i];
            if (!factor) continue;
            generator.forEach((coefficient, index) => { message[i + index] ^= multiply(coefficient, factor); });
        }
        return message.slice(-degree);
    },

    getEditorFontOptions() {
        return [
            { value: 'Cascadia Code, Consolas, monospace', label: 'Cascadia Code' },
            { value: 'Consolas, monospace', label: 'Consolas' },
            { value: '"Courier New", monospace', label: 'Courier New' },
            { value: '"Segoe UI", system-ui, sans-serif', label: 'Segoe UI' },
            { value: 'Arial, sans-serif', label: 'Arial' },
            { value: '"Microsoft YaHei", "微软雅黑", sans-serif', label: '微软雅黑' },
            { value: 'SimSun, "宋体", serif', label: '宋体' },
            { value: 'KaiTi, "楷体", serif', label: '楷体' }
        ];
    },

    async renderSettings(page) {
        const renderToken = page.dataset.dcRenderToken;
        page.className = 'fw-page dc-page';
        const [projects, apps, bytes] = await Promise.all([
            DeveloperCenterStore.getAll('projects'), DeveloperCenterStore.getAll('apps'), DeveloperCenterStore.estimateBytes()
        ]);
        if (!this.isCurrentRender(page, 'settings', renderToken)) return;
        page.appendChild(this.heading(this.text('settingsTitle'), this.text('settingsDesc')));
        const stats = document.createElement('div');
        stats.className = 'dc-settings-stats';
        stats.innerHTML = `<div class="dc-card dc-stat"><strong>${projects.length}</strong><span>${this.text('projects')}</span></div><div class="dc-card dc-stat"><strong>${apps.length}</strong><span>${this.text('packagedApps')}</span></div><div class="dc-card dc-stat"><strong>${this.formatBytes(bytes)}</strong><span>${this.text('storage')}</span></div>`;
        page.appendChild(stats);
        const english = typeof I18n !== 'undefined' && I18n.currentLang === 'en';
        const editorSettings = document.createElement('section');
        editorSettings.className = 'dc-card dc-editor-settings';
        editorSettings.innerHTML = `
            <div class="dc-editor-settings-copy"><strong>${english ? 'Code editor appearance' : '代码编辑器外观'}</strong><span>${english ? 'Customize the font used by HTML, CSS, and JavaScript editors.' : '自定义 HTML、CSS 和 JavaScript 编辑器使用的字体。'}</span></div>
            <label class="dc-field"><span class="dc-field-label">${english ? 'System font' : '系统字体'}</span><span class="dc-editor-font-host" data-editor-font-host></span></label>
            <label class="dc-field"><span class="dc-field-label">${english ? 'Font size' : '字体大小'}</span><input class="dc-input" data-editor-size type="number" min="11" max="24" step="1" value="${this._editorAppearance.fontSize}"></label>
            <pre class="dc-editor-settings-preview"><code>const FluentOS = { theme: 'accent' };</code></pre>`;
        page.appendChild(editorSettings);
        const fontHost = editorSettings.querySelector('[data-editor-font-host]');
        const sizeInput = editorSettings.querySelector('[data-editor-size]');
        const updateAppearance = (changes = {}) => {
            this._editorAppearance = DeveloperCenterStore.normalizeEditorAppearance({
                ...this._editorAppearance,
                fontSize: sizeInput.value,
                ...changes
            });
            this.applyEditorAppearance();
        };
        const persistAppearance = async (changes = {}) => {
            updateAppearance(changes);
            this._editorAppearance = await DeveloperCenterStore.setEditorAppearance(this._editorAppearance);
            this.applyEditorAppearance();
        };
        fontHost.appendChild(FluentUI.Select({
            options: this.getEditorFontOptions(),
            value: this._editorAppearance.fontFamily,
            className: 'dc-editor-font-select',
            onChange: (fontFamily) => persistAppearance({ fontFamily })
        }));
        sizeInput.addEventListener('input', () => updateAppearance());
        sizeInput.addEventListener('change', () => persistAppearance());
        const actions = document.createElement('div');
        actions.className = 'dc-form';
        const action = (title, description, buttonText, danger, callback) => {
            const row = document.createElement('div');
            row.className = 'dc-toggle-row';
            row.innerHTML = `<span class="dc-toggle-copy"><strong>${this.esc(title)}</strong><span>${this.esc(description)}</span></span>`;
            row.appendChild(this.button(buttonText, danger ? 'danger' : 'secondary', callback));
            actions.appendChild(row);
        };
        action(this.text('resetTools'), 'JSON, Base64, URL, timestamp, hash, and QR code', this.text('resetTools'), false, async () => { await DeveloperCenterStore.resetFavorites(); this.toast(this.text('resetTools')); });
        action(this.text('clearProjects'), typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Only projects without a packaged App are removed.' : '只删除尚未封装为 App 的草稿项目。', this.text('clearProjects'), true, () => this.confirmAction(this.text('clearProjects'), async () => {
            const appProjectIds = new Set((await DeveloperCenterStore.getAll('apps')).map((app) => app.projectId));
            const all = await DeveloperCenterStore.getAll('projects');
            await Promise.all(all.filter((project) => !appProjectIds.has(project.id)).map((project) => DeveloperCenterStore.remove('projects', project.id)));
        }));
        action(this.text('clearApps'), typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'Closes and unregisters every created App. Projects are kept.' : '关闭并注销所有自建 App，但保留项目源码。', this.text('clearApps'), true, () => this.confirmAction(this.text('clearApps'), async () => {
            const all = await DeveloperCenterStore.getAll('apps');
            for (const app of all) await DeveloperCreatedRuntime.unregister(app.id);
            await DeveloperCenterStore.clear('apps');
        }));
        page.appendChild(actions);
        const note = document.createElement('p');
        note.className = 'dc-note';
        note.textContent = `Developer Center ${this.VERSION} · IndexedDB: ${DeveloperCenterStore.DB_NAME}`;
        page.appendChild(note);
    },

    confirmAction(title, callback) {
        FluentUI.Dialog({
            type: 'warning', title, content: typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'This action cannot be undone.' : '此操作无法撤销。',
            buttons: [{ text: this.text('cancel'), variant: 'secondary', value: false }, { text: this.text('confirm'), variant: 'danger', value: true }],
            onClose: (value) => { if (value) callback(); }
        });
    }
};

const DeveloperCenterApiDocsApp = {
    windowId: null,
    container: null,
    _selectionKeyHandler: null,

    init(windowId) {
        this.windowId = windowId;
        this.container = document.getElementById(windowId)?.querySelector('.window-content') || null;
        if (!this.container) return false;
        this.container.classList.add('dc-api-window-content');
        this._selectionKeyHandler = (event) => {
            const selectAll = (event.ctrlKey || event.metaKey) && !event.altKey && String(event.key || '').toLowerCase() === 'a';
            if (!selectAll || WindowManager.activeWindowId !== this.windowId) return;
            const page = this.container?.querySelector('.dc-api-window-page');
            const selection = window.getSelection?.();
            if (!page || !selection) return;
            event.preventDefault();
            const range = document.createRange();
            range.selectNodeContents(page);
            selection.removeAllRanges();
            selection.addRange(range);
        };
        document.addEventListener('keydown', this._selectionKeyHandler);
        this.render();
        State.on('languageChange', () => this.render(), { key: 'DeveloperCenterApiDocsApp.language' });
        return true;
    },

    render() {
        if (!this.container) return;
        const english = typeof I18n !== 'undefined' && I18n.currentLang === 'en';
        const title = english ? 'API Reference' : 'API 参考文档';
        const subtitle = english ? 'FluentOS APIs available to sandboxed professional Apps.' : '专业 App 在沙箱中可使用的 FluentOS API。';
        const titleElement = document.getElementById(this.windowId)?.querySelector('.window-title');
        if (titleElement) titleElement.textContent = title;
        this.container.innerHTML = `<main class="dc-api-window-page"><header class="dc-heading"><div><h1>${DeveloperCenterApp.esc(title)}</h1><p>${DeveloperCenterApp.esc(subtitle)}</p></div></header>${DeveloperCenterApp.apiDocsContent()}</main>`;
        DeveloperCenterApp.bindApiDocs(this.container);
    },

    beforeClose() {
        State.off?.('languageChange', 'DeveloperCenterApiDocsApp.language');
        if (this._selectionKeyHandler) document.removeEventListener('keydown', this._selectionKeyHandler);
        this._selectionKeyHandler = null;
        this.container?.classList.remove('dc-api-window-content');
        this.container = null;
        this.windowId = null;
        return true;
    }
};

/** Keeps the hidden system App entry and restored user-created Apps in sync. */
const DeveloperCenterController = {
    appEntry: {
        id: 'developer-center', nameKey: 'developerCenter.title',
        icon: 'Theme/Icon/App_icon/developer_center.png', isNative: true, isPWA: false
    },
    initialized: false,

    init() {
        if (this.initialized) return;
        this.initialized = true;
        this.applyVisibility(State.settings.hideDeveloperCenter !== false, { addDesktop: State.settings.hideDeveloperCenter === false });
        DeveloperCreatedRuntime.restore().catch((error) => console.warn('[DeveloperCenter] Restore failed', error));
        State.on('settingsChange', (updates) => {
            if (updates && Object.prototype.hasOwnProperty.call(updates, 'hideDeveloperCenter')) {
                this.applyVisibility(updates.hideDeveloperCenter !== false, { addDesktop: updates.hideDeveloperCenter === false });
            }
        });
        State.on('languageChange', () => {
            if (DeveloperCenterApp.frame) DeveloperCenterApp.mountFrame();
            const desktop = State.findNode('desktop');
            desktop?.children?.filter((node) => node.appId === 'developer-center').forEach((node) => { node.name = t('developerCenter.title'); });
            if (desktop) State.updateFS(State.fs);
        });
    },

    applyVisibility(hidden, options = {}) {
        if (typeof Desktop === 'undefined') return;
        const exists = Desktop.apps.some((app) => app.id === this.appEntry.id);
        if (hidden) {
            Desktop.apps = Desktop.apps.filter((app) => app.id !== this.appEntry.id);
            Desktop.removeAppShortcut?.(this.appEntry.id);
            if (typeof WindowManager !== 'undefined') {
                WindowManager.windows.filter((win) => win.appId === this.appEntry.id).forEach((win) => WindowManager.closeWindow(win.id));
            }
        } else {
            if (!exists) Desktop.apps.push({ ...this.appEntry });
            if (options.addDesktop && !DeveloperCenterApp.isOnDesktop(this.appEntry.id)) Desktop.addAppShortcut?.(this.appEntry.id);
        }
        if (typeof StartMenu !== 'undefined' && Array.isArray(StartMenu.systemApps) && !StartMenu.systemApps.includes(this.appEntry.id)) StartMenu.systemApps.push(this.appEntry.id);
        DeveloperCreatedRuntime.refreshShell();
    }
};

window.DeveloperCenterApp = DeveloperCenterApp;
window.DeveloperCenterApiDocsApp = DeveloperCenterApiDocsApp;
window.DeveloperCenterController = DeveloperCenterController;
