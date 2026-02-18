/**
 * 富文本记事本应用
 */
const NotesApp = {
    windowId: null,
    container: null,
    content: '',
    filename: null,
    // 多标签相关状态
    tabs: [], // { id, title, content, fileId }
    activeTabId: null,
    tabIdCounter: 0,
    isPresenting: false,
    presentationInterval: null,
    hasLoadedFile: false,
    initNewTimer: null,

    init(windowId) {
        this.windowId = windowId || `window-${Date.now()}`;
        this.container = document.getElementById(`${this.windowId}-content`);
        // 每次打开都清空标签与内容状态
        this.tabs = [];
        this.activeTabId = null;
        this.tabIdCounter = 0;
        this.content = '';
        this.filename = t('notes.untitled-file');
        this.render();

        // 监听语言切换 - 只更新 tooltip，不重建 DOM
        this._langHandler = () => { this.updateToolbarLanguage(); };
        State.on('languageChange', this._langHandler);

        this.hasLoadedFile = false;
        clearTimeout(this.initNewTimer);
        this.initNewTimer = setTimeout(() => {
            if (!this.hasLoadedFile && (!this.tabs || this.tabs.length === 0)) {
                this.newTab();
            }
        }, 120);
    },

    // 加载指定文件（以新标签打开；若存在空白未命名标签则复用；若已打开则只激活）
    loadFile(fileId) {
        const node = State.findNode(fileId);
        if (!node || node.type !== 'file') {
            console.error('[NotesApp] 找不到文件或不是文件类型:', fileId);
            return;
        }
        this.hasLoadedFile = true;
        clearTimeout(this.initNewTimer);
        // 若当前仅有一个空白未命名标签，直接复用它
        if ((this.tabs?.length === 1)) {
            const only = this.tabs[0];
            const isUntitled = !only.fileId && (!only.content || only.content === '') && (only.title === '未命名.txt' || only.title === 'Untitled.txt' || only.title === t('notes.untitled-file'));
            if (isUntitled) {
                only.title = node.name;
                only.content = node.content || '';
                only.fileId = fileId;
                this.activeTabId = only.id;
                this.filename = only.title;
                this.content = only.content;
                const editor = this.container.querySelector('#notes-editor');
                if (editor) editor.innerHTML = only.content || `<p>${t('notes.placeholder')}</p>`;
                this.renderTabs();
                this.updateStatus();
                return;
            }
        }
        const existed = (this.tabs || []).find(t => t.fileId === fileId);
        if (existed) {
            this.activateTab(existed.id);
            return;
        }
        this.createTab(node.name, node.content || '', fileId, true);
    },

    updateToolbarLanguage() {
        const map = {
            'notes-new': 'notes.new', 'notes-open': 'notes.open',
            'notes-save': 'notes.save', 'notes-export': 'notes.export',
            'font-size': 'notes.font-size', 'font-color': 'notes.font-color',
            'bg-color': 'notes.highlight-color',
            'format-bold': 'notes.bold', 'format-italic': 'notes.italic',
            'format-underline': 'notes.underline',
            'align-left': 'notes.align-left', 'align-center': 'notes.align-center',
            'align-right': 'notes.align-right', 'presentation-mode': 'notes.presentation'
        };
        for (const [id, key] of Object.entries(map)) {
            const el = this.container.querySelector('#' + id);
            if (el) el.title = t(key);
        }
    },

    render() {
        this.container.innerHTML = `
            <div class="notes-app">
                <div class="notes-tabs-bar">
                    <div class="notes-tabs" id="notes-tabs"></div>
                </div>
                <div class="notes-toolbar">
                    <div class="toolbar-group">
                        <button class="notes-btn" id="notes-new" title="${t('notes.new')}">
                            <img src="Theme/Icon/Symbol_icon/stroke/File Plus.svg" alt="${t('notes.new')}">
                        </button>
                        <button class="notes-btn" id="notes-open" title="${t('notes.open')}">
                            <img src="Theme/Icon/Symbol_icon/stroke/Folder Open.svg" alt="${t('notes.open')}">
                        </button>
                        <button class="notes-btn" id="notes-save" title="${t('notes.save')}">
                            <img src="Theme/Icon/Symbol_icon/stroke/Save Floppy.svg" alt="${t('notes.save')}">
                        </button>
                        <button class="notes-btn" id="notes-export" title="${t('notes.export')}">
                            <img src="Theme/Icon/Symbol_icon/stroke/Download.svg" alt="${t('notes.export')}">
                        </button>
                    </div>
                    <div class="toolbar-separator"></div>
                    <div class="toolbar-group">
                        <select class="notes-select" id="font-size" title="${t('notes.font-size')}">
                            <option value="12">12px</option>
                            <option value="14" selected>14px</option>
                            <option value="16">16px</option>
                            <option value="18">18px</option>
                            <option value="20">20px</option>
                            <option value="24">24px</option>
                            <option value="32">32px</option>
                            <option value="48">48px</option>
                        </select>
                        <input type="color" class="notes-color-picker" id="font-color" value="#000000" title="${t('notes.font-color')}">
                        <input type="color" class="notes-color-picker" id="bg-color" value="#ffff00" title="${t('notes.highlight-color')}">
                    </div>
                    <div class="toolbar-separator"></div>
                    <div class="toolbar-group">
                        <button class="notes-btn" id="format-bold" title="${t('notes.bold')}">
                            <strong>B</strong>
                        </button>
                        <button class="notes-btn" id="format-italic" title="${t('notes.italic')}">
                            <em>I</em>
                        </button>
                        <button class="notes-btn" id="format-underline" title="${t('notes.underline')}">
                            <u>U</u>
                        </button>
                    </div>
                    <div class="toolbar-separator"></div>
                    <div class="toolbar-group">
                        <button class="notes-btn" id="align-left" title="${t('notes.align-left')}">
                            <img src="Theme/Icon/Symbol_icon/stroke/Align Left.svg" alt="">
                        </button>
                        <button class="notes-btn" id="align-center" title="${t('notes.align-center')}">
                            <img src="Theme/Icon/Symbol_icon/stroke/Align Center.svg" alt="">
                        </button>
                        <button class="notes-btn" id="align-right" title="${t('notes.align-right')}">
                            <img src="Theme/Icon/Symbol_icon/stroke/Align Right.svg" alt="">
                        </button>
                    </div>
                    <div class="toolbar-separator"></div>
                    <div class="toolbar-group">
                        <button class="notes-btn" id="presentation-mode" title="${t('notes.presentation')}">
                            <img src="Theme/Icon/Symbol_icon/stroke/Screencast.svg" alt="">
                        </button>
                    </div>
                    
                </div>
                <div class="notes-editor-container">
                    <div class="notes-editor" id="notes-editor" contenteditable="true" spellcheck="false">
                        <p>${this.content || t('notes.placeholder')}</p>
                    </div>
                </div>
                <div class="notes-statusbar">
                    <span id="notes-status">${t('notes.ready')}</span>
                    <span id="notes-chars">${t('notes.chars', {count: 0})}</span>
                </div>
            </div>
            
            <!-- 大字报模式 -->
            <div class="presentation-overlay hidden" id="presentation-overlay">
                <div class="presentation-content" id="presentation-content"></div>
                <button class="presentation-close" id="presentation-close">
                    <img src="Theme/Icon/Symbol_icon/stroke/Cancel.svg" alt="">
                </button>
            </div>
            
            <!-- 隐藏的文件输入 -->
            <input type="file" id="file-input" accept=".txt,.html" style="display: none;">
        `;

        this.addStyles();
        this.bindEvents();
        this.renderTabs();
        this.updateStatus();
    },

    // 对外API：用内容打开（新标签）
    openWithContent(name, content) {
        if (typeof WindowManager !== 'undefined') {
            WindowManager.openApp('notes');
            setTimeout(() => {
                this.createTab(name || t('notes.untitled-file'), content || '', null, true);
            }, 0);
        }
    },

    // 对外API：设置当前文档（作用于激活标签）
    setDocument(name, content) {
        if (!this.container) return;
        if (!this.activeTabId && (!this.tabs || this.tabs.length === 0)) {
            this.newTab();
        }
        const active = this.tabs.find(t => t.id === this.activeTabId);
        const target = active || this.newTab().tab;
        target.title = name || t('notes.untitled-file');
        target.content = content || '';
        this.filename = target.title;
        this.content = target.content;
        const editor = this.container.querySelector('#notes-editor');
        if (editor) editor.innerHTML = this.content || `<p>${t('notes.placeholder')}</p>`;
        this.renderTabs();
        this.updateFilename();
        this.updateStatus();
    },

    // ============ 多标签逻辑 ============
    newTab() {
        // 直接在“文档”目录下创建一个未命名文件，并以其为新标签
        const documentsNode = State.findNode('documents');
        let title = t('notes.untitled-file');
        let fileId = null;
        if (documentsNode) {
            if (!documentsNode.children) documentsNode.children = [];
            const existingNames = new Set(documentsNode.children.map(c => c.name));
            const base = t('notes.untitled');
            let index = 0;
            while (true) {
                const candidate = index === 0 ? `${base}.txt` : `${base} (${index + 1}).txt`;
                if (!existingNames.has(candidate)) { title = candidate; break; }
                index++;
            }
            const id = `file-${Date.now()}-${this.tabIdCounter}`;
            documentsNode.children.push({
                id,
                name: title,
                type: 'file',
                content: '',
                size: 0,
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            });
            State.updateFS(State.fs);
            fileId = id;
        }
        const created = this.createTab(title, '', fileId, true);
        return created;
    },

    createTab(title, content, fileId = null, activate = true) {
        // 防止同一文件多开
        if (fileId) {
            const existed = (this.tabs || []).find(t => t.fileId === fileId);
            if (existed) {
                if (activate) this.activateTab(existed.id);
                return { id: existed.id, tab: existed };
            }
        }
        const id = `tab-${this.tabIdCounter++}`;
        const tab = { id, title: title || t('notes.untitled-file'), content: content || '', fileId: fileId || null, dirty: false };
        if (!this.tabs) this.tabs = [];
        this.tabs.push(tab);
        if (activate) {
            this.activeTabId = id;
            this.filename = tab.title;
            this.content = tab.content;
            const editor = this.container.querySelector('#notes-editor');
            if (editor) editor.innerHTML = tab.content || `<p>${t('notes.placeholder')}</p>`;
        }
        this.renderTabs();
        this.updateFilename();
        this.updateStatus();
        return { id, tab };
    },

    renderTabs() {
        const tabsEl = this.container.querySelector('#notes-tabs');
        if (!tabsEl) return;
        
        // 使用 FluentUI.TabBar 渲染标签
        tabsEl.innerHTML = '';
        const tabBar = FluentUI.TabBar({
            tabs: (this.tabs || []).map(t => ({
                id: t.id,
                label: t.title,
                closable: true
            })),
            activeTab: this.activeTabId,
            onTabChange: (tabId) => this.activateTab(tabId),
            onTabClose: (tabId) => this.closeTab(tabId)
        });
        
        // 取出 tabs 容器并添加
        const tabItems = tabBar.querySelector('.fluent-tabbar-tabs');
        if (tabItems) {
            tabsEl.appendChild(tabItems.cloneNode(true));
            // 重新绑定事件
            tabsEl.querySelectorAll('.fluent-tab').forEach(el => {
                const tabId = el.dataset.tabId;
                el.addEventListener('click', (e) => {
                    if (!e.target.closest('.fluent-tab-close')) {
                        this.activateTab(tabId);
                    }
                });
                const closeBtn = el.querySelector('.fluent-tab-close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.closeTab(tabId);
                    });
                }
            });
        }
    },

    activateTab(id) {
        const target = (this.tabs || []).find(t => t.id === id);
        if (!target) return;
        this.activeTabId = id;
        this.filename = target.title;
        this.content = target.content;
        const editor = this.container.querySelector('#notes-editor');
        if (editor) editor.innerHTML = target.content || `<p>${t('notes.placeholder')}</p>`;
        this.renderTabs();
        this.updateFilename();
        this.updateStatus();
    },

    closeTab(id) {
        if (!this.tabs) return;
        const idx = this.tabs.findIndex(t => t.id === id);
        if (idx === -1) return;
        const wasActive = this.activeTabId === id;
        this.tabs.splice(idx, 1);
        if (wasActive) {
            const next = this.tabs[idx] || this.tabs[idx - 1] || this.tabs[0];
            if (next) {
                this.activateTab(next.id);
            } else {
                // 如果没有标签了，创建一个空白
                this.newTab();
            }
        } else {
            this.renderTabs();
        }
    },

    addStyles() {
        if (document.getElementById('notes-app-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'notes-app-styles';
        style.textContent = `
            .notes-tabs-bar { display: flex; align-items: center; gap: 6px; padding: 6px 8px 0 8px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); }
            .notes-tabs { display: flex; gap: 4px; overflow-x: auto; flex: 1; scrollbar-width: none; }
            .notes-tabs::-webkit-scrollbar { display: none; }
            .notes-tab { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: var(--bg-tertiary); border-radius: 8px 8px 0 0; cursor: pointer; user-select: none; }
            .notes-tab.active { background: var(--bg-primary); box-shadow: inset 0 -1px 0 var(--bg-primary); }
            .notes-tab .tab-title { max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; color: var(--text-primary); }
            .notes-tab .tab-close { width: 20px; height: 20px; border: none; background: transparent; border-radius: 4px; display: flex; align-items: center; justify-content: center; opacity: .7; cursor: pointer; }
            .notes-tab .tab-close:hover { background: rgba(0,0,0,.06); opacity: 1; }
            .notes-tab .tab-close img { width: 12px; height: 12px; }
            /* 删除文件名显示的空间占位 */
            .notes-filename { display: none; }
            /* 对话框样式 */
            .notes-dialog { position: absolute; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 50; }
            .notes-dialog.hidden { display: none; }
            .notes-dialog-content { width: 360px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: var(--shadow-lg); overflow: hidden; }
            .notes-dialog-title { padding: 18px 20px; font-size: 14px; color: var(--text-primary); }
            .notes-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; background: var(--bg-secondary); }
            .notes-dialog-btn { min-width: 64px; height: 32px; padding: 0 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); cursor: pointer; }
            .notes-dialog-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
            .notes-app { display: flex; flex-direction: column; height: 100%; position: relative; user-select: text; -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; }
            .notes-editor { user-select: text !important; -webkit-user-select: text !important; -moz-user-select: text !important; -ms-user-select: text !important; }
            /* 自定义滚动条（与通知中心一致） */
            .notes-app *::-webkit-scrollbar { width: 6px; height: 6px; }
            .notes-app *::-webkit-scrollbar-track { background: transparent; }
            .notes-app *::-webkit-scrollbar-thumb { background: var(--text-tertiary); border-radius: 3px; }
            .notes-app *::-webkit-scrollbar-thumb:hover { background: var(--text-secondary); }
            .notes-app * { scrollbar-width: thin; scrollbar-color: var(--text-tertiary) transparent; }
            .notes-toolbar { display: flex; align-items: center; gap: 4px; padding: 8px 12px; border-bottom: 1px solid var(--border-color); background: rgba(255, 255, 255, 0.5); backdrop-filter: blur(20px) saturate(180%); flex-wrap: wrap; }
            .dark-mode .notes-toolbar { background: rgba(32, 32, 32, 0.5); }
            .toolbar-group { display: flex; align-items: center; gap: 4px; }
            .toolbar-separator { width: 1px; height: 24px; background: var(--border-color); margin: 0 4px; }
            .notes-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0; border-radius: var(--radius-sm); background: transparent; transition: background var(--transition-fast); cursor: pointer; border: 1px solid transparent; }
            .notes-btn:hover { background: rgba(0, 0, 0, 0.05); }
            .notes-btn.active { background: var(--accent); color: white; border-color: var(--accent); }
            .notes-btn img { width: 16px; height: 16px; }
            .notes-btn strong, .notes-btn em, .notes-btn u { font-size: 14px; font-weight: 600; }
            .notes-select { padding: 4px 8px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-secondary); font-size: 12px; cursor: pointer; }
            .notes-color-picker { width: 32px; height: 32px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); cursor: pointer; }
            .notes-filename { flex: 1; text-align: center; font-size: 13px; font-weight: 500; color: var(--text-secondary); min-width: 100px; }
            .notes-editor-container { flex: 1; overflow-y: auto; background: var(--bg-primary); }
            .notes-editor { min-height: 100%; padding: 24px; font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif; font-size: 14px; line-height: 1.8; background: transparent; color: var(--text-primary); outline: none; }
            .notes-editor p { margin: 0 0 12px 0; }
            .notes-editor:empty::before { content: '在此处开始输入...'; color: var(--text-tertiary); }
            .notes-statusbar { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; border-top: 1px solid var(--border-color); font-size: 12px; color: var(--text-secondary); background: var(--bg-tertiary); }
            .dark-mode .notes-btn:hover { background: rgba(255, 255, 255, 0.1); }
            
            /* 大字报模式 */
            .presentation-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; z-index: 10000; display: flex; align-items: center; justify-content: center; }
            .presentation-content { width: 90%; max-width: 1200px; color: #fff; font-size: 48px; line-height: 1.6; text-align: center; padding: 40px; animation: scrollText 20s linear infinite; }
            @keyframes scrollText { 0% { transform: translateY(100%); } 100% { transform: translateY(-100%); } }
            .presentation-close { position: absolute; top: 20px; right: 20px; width: 48px; height: 48px; background: rgba(255, 255, 255, 0.1); border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
            .presentation-close:hover { background: rgba(255, 255, 255, 0.2); }
            .presentation-close img { width: 24px; height: 24px; filter: brightness(0) invert(1); }
            
            /* 窗口内保存对话框 - V2 新版外观 */
            .notes-save-overlay {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.2);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100;
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            .notes-save-overlay.visible { opacity: 1; }
            .notes-save-dialog {
                background: rgba(255, 255, 255, 0.85);
                backdrop-filter: blur(40px) saturate(180%);
                -webkit-backdrop-filter: blur(40px) saturate(180%);
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                border: 1px solid rgba(255, 255, 255, 0.4);
                min-width: 320px;
                max-width: 400px;
                transform: scale(0.95);
                opacity: 0;
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .notes-save-overlay.visible .notes-save-dialog {
                transform: scale(1);
                opacity: 1;
            }
            .dark-mode .notes-save-dialog {
                background: rgba(40, 40, 40, 0.85);
                border-color: rgba(255, 255, 255, 0.08);
            }
            .notes-save-dialog-header {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 20px 24px 12px;
            }
            .notes-save-dialog-icon { width: 22px; height: 22px; opacity: 0.8; }
            .dark-mode .notes-save-dialog-icon { filter: brightness(0) invert(1); }
            .notes-save-dialog-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
            .notes-save-dialog-content {
                padding: 4px 24px 24px;
                font-size: 14px;
                color: var(--text-secondary);
                line-height: 1.5;
            }
            .notes-save-dialog-footer {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                padding: 16px 20px;
                background: rgba(0, 0, 0, 0.02);
                border-radius: 0 0 16px 16px;
                border-top: 1px solid rgba(0, 0, 0, 0.05);
            }
            .dark-mode .notes-save-dialog-footer { 
                background: rgba(255, 255, 255, 0.02); 
                border-top-color: rgba(255, 255, 255, 0.05);
            }
            .notes-save-dialog .fluent-button-secondary {
                background: rgba(0, 0, 0, 0.05);
                border: 1px solid rgba(0, 0, 0, 0.1);
                border-radius: 8px;
                padding: 8px 16px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.15s ease;
            }
            .notes-save-dialog .fluent-button-secondary:hover {
                background: rgba(0, 0, 0, 0.08);
            }
            .dark-mode .notes-save-dialog .fluent-button-secondary {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.1);
                color: #fff;
            }
            .dark-mode .notes-save-dialog .fluent-button-secondary:hover {
                background: rgba(255, 255, 255, 0.12);
            }
            .notes-save-dialog .fluent-button-primary {
                background: var(--accent);
                border: none;
                border-radius: 8px;
                padding: 8px 20px;
                font-size: 14px;
                color: #fff;
                cursor: pointer;
                transition: all 0.15s ease;
            }
            .notes-save-dialog .fluent-button-primary:hover {
                filter: brightness(1.1);
            }
        `;
        document.head.appendChild(style);
    },

    bindEvents() {
        const editor = this.container.querySelector('#notes-editor');
        const newBtn = this.container.querySelector('#notes-new');
        const openBtn = this.container.querySelector('#notes-open');
        const saveBtn = this.container.querySelector('#notes-save');
        const exportBtn = this.container.querySelector('#notes-export');
        const fileInput = this.container.querySelector('#file-input');
        // 已去除 addTab 按钮

        // 编辑器输入
        editor.addEventListener('input', () => {
            this.content = editor.innerHTML;
            const active = this.tabs.find(t => t.id === this.activeTabId);
            if (active) {
                active.content = this.content;
                active.dirty = true;
            }
            this.updateStatus();
        });

        // 新建
        newBtn.addEventListener('click', () => {
            // 恢复“新建文本文档”为新标签：并且默认保存到文档目录
            this.newTab();
            this.updateStatus();
            State.addNotification({ title: t('notes.title'), message: t('notes.new-created'), type: 'info' });
        });

        // 打开文件
        openBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.openFile(file);
            }
        });

        // 保存：写回当前FS节点（如由文件管理器打开）
        saveBtn.addEventListener('click', () => {
            this.persistToFS();
            this.saveFile();
        });

        // 导出
        exportBtn.addEventListener('click', () => {
            this.exportFile();
        });

        // 格式化按钮
        this.container.querySelector('#font-size').addEventListener('change', (e) => {
            document.execCommand('fontSize', false, '7');
            const fontElements = editor.querySelectorAll('font[size="7"]');
            fontElements.forEach(el => {
                el.removeAttribute('size');
                el.style.fontSize = e.target.value + 'px';
            });
        });

        this.container.querySelector('#font-color').addEventListener('change', (e) => {
            document.execCommand('foreColor', false, e.target.value);
        });

        this.container.querySelector('#bg-color').addEventListener('change', (e) => {
            document.execCommand('backColor', false, e.target.value);
        });

        this.container.querySelector('#format-bold').addEventListener('click', () => {
            document.execCommand('bold');
        });

        this.container.querySelector('#format-italic').addEventListener('click', () => {
            document.execCommand('italic');
        });

        this.container.querySelector('#format-underline').addEventListener('click', () => {
            document.execCommand('underline');
        });

        this.container.querySelector('#align-left').addEventListener('click', () => {
            document.execCommand('justifyLeft');
        });

        this.container.querySelector('#align-center').addEventListener('click', () => {
            document.execCommand('justifyCenter');
        });

        this.container.querySelector('#align-right').addEventListener('click', () => {
            document.execCommand('justifyRight');
        });

        // 大字报模式
        const presentationBtn = this.container.querySelector('#presentation-mode');
        const presentationOverlay = this.container.querySelector('#presentation-overlay');
        const presentationClose = this.container.querySelector('#presentation-close');

        presentationBtn.addEventListener('click', () => {
            this.startPresentation();
        });

        presentationClose.addEventListener('click', () => {
            this.stopPresentation();
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (!this.container.closest('.window')) return;
            
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveFile();
            }
            
            if (e.key === 'Escape' && this.isPresenting) {
                this.stopPresentation();
            }
        });
    },

    // 关闭窗口时：保存全部标签并清空
    beforeClose() {
        // 若存在“未命名”标签 或 有修改未保存(dirty) 的任意标签，则询问
        const needConfirm = (this.tabs || []).some(t => (typeof t.title === 'string' && (t.title.startsWith('未命名') || t.title.startsWith('Untitled'))) || t.dirty);
        if (needConfirm) {
            return this.confirmSaveUntitled(); // 返回 Promise，WindowManager 将等待
        }
        this.saveAllTabs();
        this.tabs = [];
        this.activeTabId = null;
        this.tabIdCounter = 0;
        this.content = '';
        this.filename = t('notes.untitled-file');
    },

    saveAllTabs() {
        const documentsNode = State.findNode('documents');
        (this.tabs || []).forEach((t, idx) => {
            if (t.fileId) {
                const node = State.findNode(t.fileId);
                if (node && node.type === 'file') {
                    node.content = t.content || '';
                    node.size = (t.content || '').length;
                    node.modified = new Date().toISOString();
                }
            } else if (documentsNode) {
                if (!documentsNode.children) documentsNode.children = [];
                // 如果系统中已存在同名文件，直接写回那个文件
                const existing = t.title ? this.findFileByName(t.title) : null;
                if (existing && existing.node) {
                    existing.node.content = t.content || '';
                    existing.node.size = (t.content || '').length;
                    existing.node.modified = new Date().toISOString();
                    t.fileId = existing.node.id;
                } else {
                    // 未命名优先使用 .txt 扩展名
                    let name = tab.title && tab.title !== '未命名.txt' && tab.title !== 'Untitled.txt' ? tab.title : `Untitled-${Date.now()}-${idx}.txt`;
                    if (!name.endsWith('.html') && !name.endsWith('.txt')) name += '.txt';
                    const created = {
                        id: `file-${Date.now()}-${idx}`,
                        name,
                        type: 'file',
                        content: t.content || '',
                        size: (t.content || '').length,
                        created: new Date().toISOString(),
                        modified: new Date().toISOString()
                    };
                    documentsNode.children.push(created);
                    t.fileId = created.id;
                }
            }
        });
        State.updateFS(State.fs);
    },

    resetTabs() {
        this.tabs = [];
        this.activeTabId = null;
        this.tabIdCounter = 0;
        this.content = '';
        this.filename = t('notes.untitled-file');
    },

    confirmSaveUntitled() {
        return new Promise((resolve) => {
            FluentUI.Dialog({
                title: t('notes.title'),
                content: t('notes.save-untitled'),
                type: 'warning',
                buttons: [
                    { text: t('cancel'), variant: 'secondary', value: 'cancel' },
                    { text: t('notes.btn-no'), variant: 'secondary', value: 'no' },
                    { text: t('notes.btn-yes'), variant: 'primary', value: 'yes' }
                ],
                closeOnOverlay: false,
                onClose: (result) => {
                    if (result === 'cancel' || result === null) {
                        resolve(false);
                        return;
                    }
                    if (result === 'yes') {
                        this.saveAllTabs();
                        this.resetTabs();
                        resolve(true);
                        return;
                    }
                    if (result === 'no') {
                        (this.tabs || []).forEach(t => {
                            if (t.title && (t.title.startsWith('未命名') || t.title.startsWith('Untitled')) && t.fileId) {
                                const parent = State.findParentNode(t.fileId);
                                if (parent && Array.isArray(parent.children)) {
                                    parent.children = parent.children.filter(c => c.id !== t.fileId);
                                }
                            }
                        });
                        State.updateFS(State.fs);
                        this.resetTabs();
                        resolve(true);
                        return;
                    }
                    resolve(true);
                }
            });
        });
    },

    // 将当前激活标签内容写回到文件系统（如果有关联）
    persistToFS() {
        const active = this.tabs.find(t => t.id === this.activeTabId);
        if (!active) return;
        if (active.fileId) {
            const node = State.findNode(active.fileId);
            if (node && node.type === 'file') {
                node.content = active.content || '';
                node.size = (active.content || '').length;
                node.modified = new Date().toISOString();
                State.updateFS(State.fs);
            }
        } else {
            // 通过标题推断文件名（兼容旧逻辑）
            const titleEl = this.container.closest('.window')?.querySelector('.window-title');
            const currentName = active.title || this.filename || titleEl?.textContent || t('notes.untitled-file');
            const match = this.findFileByName(currentName);
            if (match) {
                match.node.content = active.content || '';
                match.node.size = (active.content || '').length;
                match.node.modified = new Date().toISOString();
                State.updateFS(State.fs);
                active.fileId = match.node.id;
            }
        }
    },

    findFileByName(name, node = State.fs.root) {
        if (!node) return null;
        if (node.type === 'file' && node.name === name) return { node, parent: null };
        if (node.children) {
            for (const child of node.children) {
                if (child.type === 'file' && child.name === name) return { node: child, parent: node };
                const res = this.findFileByName(name, child);
                if (res) return res;
            }
        }
        return null;
    },

    openFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const html = file.name.endsWith('.html')
                ? text
                : text.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('');
            this.createTab(file.name, html, null, true);
            State.addNotification({ title: t('notes.title'), message: t('notes.opened', {name: file.name}), type: 'success' });
        };
        reader.readAsText(file);
    },

    saveFile() {
        const active = this.tabs.find(t => t.id === this.activeTabId);
        const filename = prompt(t('notes.enter-filename'), active?.title || this.filename);
        if (!filename) return;

        this.filename = filename.endsWith('.html') || filename.endsWith('.txt') 
            ? filename 
            : `${filename}.html`;
        
        // 保存到文件系统的文档文件夹
        const documentsNode = State.findNode('documents');
        if (documentsNode) {
            const existingFile = documentsNode.children?.find(c => c.name === this.filename);
            if (existingFile) {
                existingFile.content = active ? (active.content || '') : (this.content || '');
                existingFile.modified = new Date().toISOString();
                existingFile.size = (active ? (active.content || '') : (this.content || '')).length;
                if (active) active.fileId = existingFile.id;
            } else {
                if (!documentsNode.children) {
                    documentsNode.children = [];
                }
                documentsNode.children.push({
                    id: `file-${Date.now()}`,
                    name: this.filename,
                    type: 'file',
                    content: active ? (active.content || '') : (this.content || ''),
                    size: (active ? (active.content || '') : (this.content || '')).length,
                    created: new Date().toISOString(),
                    modified: new Date().toISOString()
                });
                if (active) {
                    const created = documentsNode.children[documentsNode.children.length - 1];
                    active.fileId = created.id;
                }
            }
            State.updateFS(State.fs);
        }

        if (active) {
            active.title = this.filename;
            this.filename = active.title;
        }
        this.renderTabs();
        this.updateFilename();
        State.addNotification({
            title: t('notes.title'),
            message: t('notes.file-saved', {name: this.filename}),
            type: 'success'
        });
    },

    exportFile() {
        const editor = this.container.querySelector('#notes-editor');
        const content = editor.innerHTML;
        
        // 创建完整的HTML文档
        const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.filename}</title>
    <style>
        body {
            font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
            line-height: 1.8;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
        }
    </style>
</head>
<body>
    ${content}
</body>
</html>`;

        // 创建下载
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.filename.replace(/\.[^.]+$/, '.html');
        a.click();
        URL.revokeObjectURL(url);

        State.addNotification({
            title: t('notes.title'),
            message: t('notes.file-exported', {name: a.download}),
            type: 'success'
        });
    },

    startPresentation() {
        const editor = this.container.querySelector('#notes-editor');
        const overlay = this.container.querySelector('#presentation-overlay');
        const content = this.container.querySelector('#presentation-content');
        
        // 获取纯文本内容
        const text = editor.innerText || editor.textContent;
        content.textContent = text;
        
        overlay.classList.remove('hidden');
        this.isPresenting = true;
        
        State.addNotification({
            title: t('notes.presentation-title'),
            message: t('notes.presentation-exit'),
            type: 'info'
        });
    },

    stopPresentation() {
        const overlay = this.container.querySelector('#presentation-overlay');
        overlay.classList.add('hidden');
        this.isPresenting = false;
    },

    updateFilename() {
        // 已移除工具栏文件名显示
    },

    updateStatus() {
        const statusElement = this.container.querySelector('#notes-status');
        const charsElement = this.container.querySelector('#notes-chars');
        const editor = this.container.querySelector('#notes-editor');

        if (statusElement) {
            statusElement.textContent = this.content ? t('notes.modified') : t('notes.ready');
        }

        if (charsElement) {
            const text = editor ? (editor.innerText || editor.textContent) : '';
            charsElement.textContent = t('notes.chars', {count: text.length});
        }
    }
};

if (typeof window !== 'undefined') {
    window.NotesApp = NotesApp;
}

