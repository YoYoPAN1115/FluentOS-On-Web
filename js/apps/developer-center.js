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
        { id: 'system.theme.write', titleZh: '修改系统主题', titleEn: 'Change system theme', descZh: '允许切换浅色、深色或自动主题。', descEn: 'Switch FluentOS between light, dark, and automatic themes.' },
        { id: 'window.manage', titleZh: '管理当前窗口', titleEn: 'Manage this window', descZh: '允许修改此 App 的窗口标题和尺寸。', descEn: 'Change this App window title and size.' },
        { id: 'files.readText', titleZh: '读取文本文件', titleEn: 'Read text files', descZh: '按文件 ID 读取不超过 512 KB 的本地文本文件。', descEn: 'Read local text files up to 512 KB by file ID.' },
        { id: 'files.writeText', titleZh: '写入文本文件', titleEn: 'Write text files', descZh: '修改文本文件，或在“文档”中创建安全的文本文件。', descEn: 'Update text files or create safe text files in Documents.' },
        { id: 'desktop.manage', titleZh: '管理桌面快捷方式', titleEn: 'Manage desktop shortcut', descZh: '仅允许添加或移除此 App 自己的桌面快捷方式。', descEn: 'Add or remove only this App\'s own desktop shortcut.' },
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
                            this.startValidation(pageEl, project);
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
        if (page && !this.activeProjectId) this.renderPage(page, this.activePage);
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
        this.activePage = id;
        this.activeProjectId = null;
        this.activeToolId = null;
        if (this.frame?.activeId === id) this.frame.refresh?.();
        else this.frame?.navigate?.(id, { preserveScroll: false });
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
        this.activePage = 'build';
        this.activeProjectId = project.id;
        if (this.frame.activeId !== 'build') {
            this.frame.navigate('build', { preserveScroll: false });
        } else if (project.type === 'pwa') this.renderPwaEditor(this.frame.pageEl, project);
        else this.renderProfessionalEditor(this.frame.pageEl, project);
    },

    packageProject(project) {
        if (!project || !this.frame?.pageEl) return;
        this.closeContextMenu();
        this.activePage = 'build';
        this.activeProjectId = project.id;
        if (this.frame.activeId !== 'build') {
            this._pendingPackageProjectId = project.id;
            this.frame.navigate('build', { preserveScroll: false });
        } else {
            this.startValidation(this.frame.pageEl, project);
        }
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
        buttons.forEach((button) => footer.appendChild(button));
        page.parentElement?.appendChild(footer);
    },

    renderPwaEditor(page, project) {
        page.innerHTML = '';
        page.className = 'fw-page dc-page';
        page.appendChild(this.heading(this.text('pwa'), project.name));
        const form = document.createElement('div');
        form.className = 'dc-form';
        form.innerHTML = `
            <div class="dc-field"><label>${this.text('appName')}</label><input class="dc-input" data-field="name" maxlength="60" value="${this.esc(project.name)}"></div>
            <div class="dc-field"><label>${this.text('url')}</label><input class="dc-input" data-field="url" type="url" value="${this.esc(project.url || 'https://')}" placeholder="https://"></div>
            <div class="dc-field"><span class="dc-field-label">${this.text('icon')}</span><div class="dc-icon-picker"><img class="dc-icon-preview" src="${this.esc(project.icon || 'Theme/Icon/App_icon/created_app.png')}" alt=""><button type="button" class="fluent-btn fluent-btn-secondary" data-action="upload-icon">${this.text('upload')}</button><input class="dc-hidden-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></div></div>`;
        page.appendChild(form);
        this.bindIconPicker(form, project);
        this.appendFooter(page, [
            this.button(this.text('saveDraft'), 'secondary', () => this.saveEditorProject(page, project, false), 'Save Floppy'),
            this.button(this.text('package'), 'primary', () => this.saveEditorProject(page, project, true), 'Dashboard Check')
        ]);
    },

    renderProfessionalEditor(page, project) {
        page.innerHTML = '';
        page.className = 'fw-page dc-page';
        page.appendChild(this.heading(this.text('professional'), project.name));
        const layout = document.createElement('div');
        layout.className = 'dc-editor-layout';
        layout.innerHTML = `
            <div class="dc-editor-meta">
                <div class="dc-field"><label>${this.text('appName')}</label><input class="dc-input" data-field="name" maxlength="60" value="${this.esc(project.name)}"></div>
                <div class="dc-field"><label>${this.text('windowTitle')}</label><input class="dc-input" data-field="title" maxlength="80" value="${this.esc(project.title || project.name)}"></div>
                <div class="dc-field"><span class="dc-field-label">${this.text('icon')}</span><div class="dc-icon-picker"><img class="dc-icon-preview" src="${this.esc(project.icon || 'Theme/Icon/App_icon/created_app.png')}" alt=""><button type="button" class="fluent-btn fluent-btn-secondary" data-action="upload-icon">${this.text('upload')}</button><input class="dc-hidden-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></div></div>
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
            this.button(this.text('package'), 'primary', () => this.saveEditorProject(page, project, true), 'Dashboard Check')
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

    renderPermissionPicker(host, selectedPermissions) {
        const selected = new Set(Array.isArray(selectedPermissions) ? selectedPermissions : []);
        const english = typeof I18n !== 'undefined' && I18n.currentLang === 'en';
        host.innerHTML = `<strong class="dc-permission-heading">${english ? 'Optional permissions' : '可选权限'}</strong><span class="dc-permission-help">${english ? 'Only select capabilities this App actually needs. The user must approve them after safety validation.' : '只选择 App 实际需要的能力；安全检查通过后仍需由用户确认授权。'}</span>`;
        this.PERMISSIONS.forEach((permission) => {
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
        if (packageAfter) this.startValidation(page, saved);
        else { this.toast(this.text('saved')); this.activeProjectId = null; this.navigate('build'); }
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
            <div class="dc-api-row"><code>await FluentOS.getTheme()</code><span>Read mode, isDark, accentColor, accentRgb, FluentUI version mode, material, language, and window ID.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row"><code>await FluentOS.getThemeMode() / getAccentColor() / getLanguage()</code><span>Read individual theme values. FluentOS.state contains the latest synchronously cached system state.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row"><code>await FluentOS.isWindowBlurEnabled()</code><span>Read whether window blur is currently effective. The same value is available as FluentOS.state.windowBlurEnabled.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row"><code>await FluentOS.storage.get(key) / set(key, value) / remove(key)</code><span>Use private, size-limited storage for this App.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row"><code>await FluentOS.openApp(id) / openExternal(httpsUrl)</code><span>Open an allowed system App or a secure external link.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row"><code>await FluentOS.clipboard.read() / write(text)</code><span>Read or write the clipboard when browser permission allows it.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row"><code>await FluentOS.getWindowInfo()</code><span>Read this App window's title, size, and maximized state.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row"><code>FluentOS.ui.highlightButton('#save', true) / enableButtonGlow('#save', true)</code><span>Apply the Fluent primary-button appearance or system pointer highlight feedback to matching controls.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row dc-api-privileged"><code>await FluentOS.system.setTheme('dark') / toggleTheme()</code><span>Permission: system.theme.write. Change the global FluentOS theme.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row dc-api-privileged"><code>await FluentOS.window.setTitle(title) / setSize(width, height)</code><span>Permission: window.manage. Manage only this App's window.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row dc-api-privileged"><code>await FluentOS.files.listText('documents') / readText(id) / writeText(id, content) / createText(name, content)</code><span>Permissions: files.readText / files.writeText. List only Documents, Downloads, or Desktop; text content is limited to 512 KB and new files go to Documents.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row dc-api-privileged"><code>await FluentOS.desktop.addShortcut() / removeShortcut()</code><span>Permission: desktop.manage. Manage only this App's own desktop shortcut.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row dc-api-privileged"><code>await FluentOS.network.request(url, options)</code><span>Permission: network.request. Request only an exact HTTPS hostname declared in manifest.network.connect. Returns status, headers, and a size-limited text body.</span><button type="button" data-copy-api>Copy</button></div>
            <div class="dc-api-row dc-api-privileged"><code>const src = await FluentOS.network.loadImage(url)</code><span>Permission: network.image. Loads a supported raster image only from manifest.network.image and returns a safe data URL for img.src.</span><button type="button" data-copy-api>Copy</button></div></div>`;
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
        page.appendChild(this.heading(this.text('validating'), this.text('validationDesc')));
        const checks = project.type === 'pwa'
            ? [
                { id: 'https', label: 'HTTPS', desc: 'URL uses encrypted HTTPS transport' },
                { id: 'safe-url', label: 'URL safety', desc: 'No credentials, local host, or unsafe protocol' },
                { id: 'tls', label: 'TLS connection', desc: 'The browser can initiate a secure connection' },
                { id: 'iframe', label: 'iframe availability', desc: 'The page starts loading in an isolated frame' }
            ]
            : [
                { id: 'syntax', label: 'HTML / CSS / JavaScript syntax', desc: 'Source can be parsed and compiled' },
                { id: 'malicious', label: 'Dangerous code patterns', desc: 'No host escape or dynamic-code patterns' },
                { id: 'apis', label: 'Permitted APIs', desc: 'Only the provided FluentOS bridge is used' },
                { id: 'runtime', label: 'Sandbox startup', desc: 'App starts without a severe runtime error' }
            ];
        const list = document.createElement('div');
        list.className = 'dc-validation-list';
        checks.forEach((check) => {
            const row = document.createElement('div');
            row.className = 'dc-validation-row';
            row.dataset.check = check.id;
            row.innerHTML = `<span class="dc-validation-dot"></span><span class="dc-validation-copy"><strong>${this.esc(check.label)}</strong><span>${this.esc(check.desc)}</span></span>`;
            list.appendChild(row);
        });
        page.appendChild(list);
        if (project.type === 'pwa') {
            const note = document.createElement('p');
            note.className = 'dc-note';
            note.textContent = this.text('browserLimit');
            page.appendChild(note);
        }
        this.appendFooter(page, []);

        const started = performance.now();
        const results = project.type === 'pwa'
            ? await this.validatePwa(project, (id, status, detail) => this.setCheck(list, id, status, detail), runId)
            : await this.validateProfessional(project, (id, status, detail) => this.setCheck(list, id, status, detail), runId);
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

    setCheck(list, id, status, detail = '') {
        const row = list.querySelector(`[data-check="${id}"]`);
        if (!row) return;
        row.classList.remove('is-running', 'is-pass', 'is-fail');
        if (status) row.classList.add(`is-${status}`);
        if (detail) row.querySelector('.dc-validation-copy span').textContent = detail;
    },

    async validatePwa(project, update, runId) {
        let url = null;
        update('https', 'running');
        try { url = new URL(project.url); } catch (_) {}
        const https = url?.protocol === 'https:';
        update('https', https ? 'pass' : 'fail', https ? 'HTTPS transport enabled' : 'Only HTTPS websites can be packaged');

        update('safe-url', 'running');
        const hostname = String(url?.hostname || '').toLowerCase();
        const privateHost = /^(?:0\.|10\.|127\.|169\.254\.|192\.168\.)/.test(hostname) ||
            /^172\.(?:1[6-9]|2\d|3[01])\./.test(hostname) ||
            ['localhost', '::1', '[::1]', '0.0.0.0'].includes(hostname) || hostname.endsWith('.local');
        const safe = !!url && !url.username && !url.password && !privateHost;
        update('safe-url', safe ? 'pass' : 'fail', safe ? 'URL passed local safety rules' : 'Local, credential-bearing, or unsafe URLs are blocked');

        update('tls', 'running');
        let tls = false;
        if (https && safe) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4500);
            try {
                await fetch(url.href, { mode: 'no-cors', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal });
                tls = true;
            } catch (_) {
                // Cross-origin no-cors fetch still rejects on TLS and network failures.
                tls = false;
            } finally { clearTimeout(timeout); }
        }
        update('tls', tls ? 'pass' : 'fail', tls ? 'Secure connection initiated successfully' : 'The browser could not establish the secure connection');

        update('iframe', 'running');
        const iframe = https && safe ? await this.probeIframe(url.href, runId) : false;
        update('iframe', iframe ? 'pass' : 'fail', iframe ? 'The isolated frame reported a load event' : 'The page did not load before the validation timeout');
        return [https, safe, tls, iframe];
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
        update('syntax', 'running');
        let syntax = true;
        let syntaxDetail = 'HTML, CSS, and JavaScript parsed successfully';
        try {
            new Function(`"use strict";\n${project.js || ''}`);
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(project.css || '');
            const template = document.createElement('template');
            template.innerHTML = project.html || '';
        } catch (error) { syntax = false; syntaxDetail = error.message || 'Source contains a syntax error'; }
        update('syntax', syntax ? 'pass' : 'fail', syntaxDetail);

        update('malicious', 'running');
        const source = `${project.html || ''}\n${project.css || ''}\n${project.js || ''}`;
        const dangerousRules = [
            { regex: /\beval\s*\(/, name: 'eval()' }, { regex: /\bFunction\s*\(/, name: 'Function()' },
            { regex: /document\s*\.\s*cookie/i, name: 'document.cookie' },
            { regex: /\b(?:parent|top|opener)\s*\./, name: 'host-window access' },
            { regex: /<script[^>]+src\s*=\s*["']?https?:/i, name: 'remote script' },
            { regex: /javascript\s*:/i, name: 'javascript URL' }
        ];
        const dangerous = dangerousRules.find((rule) => rule.regex.test(source));
        update('malicious', dangerous ? 'fail' : 'pass', dangerous ? `Blocked pattern: ${dangerous.name}` : 'No blocked code pattern was found');

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
            { regex: /navigator\s*\.\s*(?:geolocation|mediaDevices|usb|serial|bluetooth)/, name: 'privileged navigator API' }
        ];
        const declaredPermissions = new Set(Array.isArray(project.permissions) ? project.permissions : []);
        const invalidPermission = [...declaredPermissions].find((permission) => !DeveloperCenterStore.SUPPORTED_PERMISSIONS.includes(permission));
        const permissionRules = [
            { regex: /FluentOS\s*\.\s*system\s*\.\s*(?:setTheme|toggleTheme)\s*\(/, permission: 'system.theme.write' },
            { regex: /FluentOS\s*\.\s*window\s*\.\s*(?:setTitle|setSize)\s*\(/, permission: 'window.manage' },
            { regex: /FluentOS\s*\.\s*files\s*\.\s*(?:listText|readText)\s*\(/, permission: 'files.readText' },
            { regex: /FluentOS\s*\.\s*files\s*\.\s*(?:writeText|createText)\s*\(/, permission: 'files.writeText' },
            { regex: /FluentOS\s*\.\s*desktop\s*\.\s*(?:addShortcut|removeShortcut)\s*\(/, permission: 'desktop.manage' },
            { regex: /FluentOS\s*\.\s*network\s*\.\s*request\s*\(/, permission: 'network.request' },
            { regex: /FluentOS\s*\.\s*network\s*\.\s*loadImage\s*\(/, permission: 'network.image' }
        ];
        const missingPermission = permissionRules.find((rule) => rule.regex.test(source) && !declaredPermissions.has(rule.permission));
        const unsupported = apiRules.find((rule) => rule.regex.test(source));
        let networkProblem = '';
        try {
            const network = DeveloperCenterStore.normalizeNetworkConfig(project.network);
            project.network = network;
            if (network.connect.length > 0 && !declaredPermissions.has('network.request')) networkProblem = 'Declare network.request for network.connect domains';
            else if (network.image.length > 0 && !declaredPermissions.has('network.image')) networkProblem = 'Declare network.image for network.image domains';
            else if (declaredPermissions.has('network.request') && network.connect.length === 0) networkProblem = 'network.request requires at least one network.connect domain';
            else if (declaredPermissions.has('network.image') && network.image.length === 0) networkProblem = 'network.image requires at least one network.image domain';
        } catch (error) { networkProblem = error.message || 'Invalid network allowlist'; }
        const apiProblem = invalidPermission
            ? `Unknown requested permission: ${invalidPermission}`
            : networkProblem
                ? networkProblem
                : missingPermission
                ? `Declare permission before using this API: ${missingPermission.permission}`
                : unsupported
                    ? `Use the FluentOS API instead of ${unsupported.name}`
                    : '';
        update('apis', apiProblem ? 'fail' : 'pass', apiProblem || 'Only declared sandbox and FluentOS APIs are referenced');

        update('runtime', 'running');
        const runtime = syntax && !dangerous && !apiProblem ? await this.probeProfessional(project, runId) : { ok: false, detail: 'Runtime check skipped until source issues are fixed' };
        update('runtime', runtime.ok ? 'pass' : 'fail', runtime.detail);
        return [syntax, !dangerous, !apiProblem, runtime.ok];
    },

    probeProfessional(project, runId) {
        return new Promise((resolve) => {
            const frame = document.createElement('iframe');
            frame.sandbox = 'allow-scripts';
            frame.style.cssText = 'position:fixed;width:2px;height:2px;opacity:0;pointer-events:none;left:-10px;top:-10px';
            let done = false;
            const finish = (ok, detail) => {
                if (done) return;
                done = true;
                window.removeEventListener('message', onMessage);
                clearTimeout(timer);
                frame.remove();
                resolve({ ok: runId === this._validationRun && ok, detail });
            };
            const onMessage = (event) => {
                if (event.source !== frame.contentWindow || event.data?.type !== 'fluentos:runtime-error') return;
                finish(false, String(event.data.message || 'Severe runtime error'));
            };
            window.addEventListener('message', onMessage);
            frame.addEventListener('load', () => setTimeout(() => finish(true, 'App started in the isolated sandbox'), 700), { once: true });
            const timer = setTimeout(() => finish(false, 'Sandbox startup timed out'), 3500);
            document.body.appendChild(frame);
            frame.srcdoc = DeveloperCreatedRuntime.buildDocument(project);
        });
    },

    async finishPackaging(project, addDesktop) {
        if (!await this.requestPermissions(project)) return;
        const existingApps = await DeveloperCenterStore.getAll('apps');
        const existing = existingApps.find((app) => app.projectId === project.id);
        const app = await DeveloperCenterStore.saveApp({
            ...existing,
            ...project,
            id: existing?.id || DeveloperCenterStore.createId('created-app'),
            projectId: project.id
        });
        DeveloperCreatedRuntime.register(app);
        if (addDesktop) Desktop.addAppShortcut(app.id);
        DeveloperCreatedRuntime.refreshShell();
        this.toast(`${app.name} ${this.text('saved')}`);
        this.activeProjectId = null;
        this.navigate('apps');
    },

    requestPermissions(app) {
        const permissions = [...new Set(Array.isArray(app.permissions) ? app.permissions : [])]
            .filter((permission) => DeveloperCenterStore.SUPPORTED_PERMISSIONS.includes(permission));
        app.permissions = permissions;
        const network = DeveloperCenterStore.normalizeNetworkConfig(app.network);
        app.network = network;
        if (!permissions.length) return Promise.resolve(true);
        const english = typeof I18n !== 'undefined' && I18n.currentLang === 'en';
        const content = `<div class="dc-permission-request"><p>${english ? 'This App passed its safety checks and requests the following additional permissions:' : '此 App 已通过安全检查，并请求以下附加权限：'}</p>${permissions.map((permission) => {
            const info = this.permissionInfo(permission);
            return `<div class="dc-permission-request-row"><strong>${this.esc(info.title)}</strong><span>${this.esc(info.description)}</span><code>${this.esc(permission)}</code></div>`;
        }).join('')}${network.connect.length ? `<div class="dc-permission-request-row"><strong>${english ? 'Allowed API request domains' : '允许请求 API'}</strong><code>${network.connect.map((domain) => this.esc(domain)).join('<br>')}</code></div>` : ''}${network.image.length ? `<div class="dc-permission-request-row"><strong>${english ? 'Allowed image domains' : '允许加载图片'}</strong><code>${network.image.map((domain) => this.esc(domain)).join('<br>')}</code></div>` : ''}${network.connect.length || network.image.length ? `<p class="dc-note">${english ? 'This App cannot access any other domain. Direct browser networking is blocked.' : '此 App 无法访问其他域名，且浏览器直接联网方式已被阻止。'}</p>` : ''}<p class="dc-note">${english ? 'Permissions are enforced again for every API call at runtime.' : '运行时会对每一次 API 调用再次校验权限。'}</p></div>`;
        return new Promise((resolve) => FluentUI.Dialog({
            type: 'warning',
            title: english ? 'App permission request' : 'App 权限请求',
            content,
            closeOnOverlay: false,
            buttons: [
                { text: this.text('cancel'), variant: 'secondary', value: false },
                { text: english ? 'Allow and continue' : '允许并继续', variant: 'primary', value: true }
            ],
            onClose: (allowed) => resolve(allowed === true)
        }));
    },

    async finishImportedApp(imported) {
        if (!await this.requestPermissions(imported)) return;
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
            network: DeveloperCenterStore.normalizeNetworkConfig(imported.network)
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
        input.accept = '.zip,.fluentapp.zip,application/zip';
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
            const blob = await DeveloperCenterStore.exportApp(app);
            const safe = String(app.name || 'app').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);
            DeveloperCenterStore.download(blob, `${safe}.fluentapp.zip`);
            this.toast(this.text('exportSuccess'));
        } catch (error) { this.toast(error.message || this.text('importFailed'), 'error'); }
    },

    async importPackage(file) {
        if (!file) return;
        try {
            const imported = await DeveloperCenterStore.importApp(file);
            if (!this.isValidName(imported.name, 60) || !this.isValidName(imported.title || imported.name, 80) || !this.isSafeIcon(imported.icon)) {
                throw new Error('The package contains unsafe display metadata');
            }
            if (imported.type === 'pwa') imported.url = new URL(imported.url).href;
            const originalName = imported.name;
            let name = originalName;
            let suffix = 2;
            while (await DeveloperCenterStore.nameExists(name)) name = `${originalName} (${suffix++})`;
            if (imported.title === originalName) imported.title = name;
            imported.name = name;
            imported.permissions = imported.permissions || [];
            const page = this.frame?.pageEl;
            if (!page) throw new Error('Developer Center page is unavailable');
            this.activePage = 'apps';
            await this.startValidation(page, imported, { importMode: true });
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
        this.activePage = 'tools';
        this.activeToolId = toolId;
        if (this.frame?.activeId !== 'tools') {
            this.frame?.navigate?.('tools', { preserveScroll: false });
            return;
        }
        this.renderToolDetail(this.frame?.pageEl, toolId);
    },

    renderToolDetail(page, toolId) {
        if (!page) return;
        page.innerHTML = '';
        page.className = 'fw-page dc-page dc-page-simple';
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

    init(windowId) {
        this.windowId = windowId;
        this.container = document.getElementById(windowId)?.querySelector('.window-content') || null;
        if (!this.container) return false;
        this.container.classList.add('dc-api-window-content');
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
