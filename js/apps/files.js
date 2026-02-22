/**
 * 文件管理器应用
 */
const FilesApp = {
    windowId: null,
    container: null,
    currentPath: ['root'],
    currentNode: null,
    history: [],
    historyIndex: -1,
    selectedItems: [], // 多选项数组
    
    // 框选相关
    isSelecting: false,
    justFinishedSelecting: false,
    selectionBox: null,
    selectionStart: { x: 0, y: 0 },
    
    // 搜索相关
    isSearching: false,
    searchTimer: null,
    
    // 剪贴板相关
    clipboard: {
        items: [],      // 剪贴板中的文件节点ID
        action: null    // 'copy' 或 'cut'
    },

    init(windowId, data = {}) {
        this.windowId = windowId || `window-${Date.now()}`;
        this.container = document.getElementById(`${this.windowId}-content`);
        
        // 确保容器存在
        if (!this.container) {
            console.error('[FilesApp] 找不到容器元素:', `${this.windowId}-content`);
            return;
        }
        
        // 确保文件系统已初始化
        if (!State.fs || !State.fs.root) {
            console.error('[FilesApp] 文件系统未初始化');
            return;
        }
        
        this.currentNode = State.fs.root;
        this.currentPath = ['root'];
        this.history = [['root']];
        this.historyIndex = 0;
        
        this.render();
        this.addStylesOnce();

        // 监听语言切换
        this._langHandler = () => { this.render(); this.bindEvents(); };
        State.on('languageChange', this._langHandler);

        // 如果有传入文件ID，导航到该位置
        if (data.fileId) {
            setTimeout(() => this.navigateToId(data.fileId), 100);
        }
    },

    render() {
        if (!this.container) {
            console.error('[FilesApp] render: 容器不存在');
            return;
        }
        
        this.container.innerHTML = '';
        
        const app = document.createElement('div');
        app.className = 'files-app';
        
        // 使用 FluentUI.NavigationBar 创建工具栏
        const searchBox = FluentUI.SearchBox({
            placeholder: t('files.search'),
            id: 'files-search-input',
            onEnter: (query) => this.handleSearch(query.trim())
        });
        
        const toolbar = FluentUI.NavigationBar({
            showBack: true,
            showForward: true,
            backDisabled: this.historyIndex <= 0,
            forwardDisabled: this.historyIndex >= this.history.length - 1,
            onBack: () => this.goBack(),
            onForward: () => this.goForward(),
            center: '<div class="files-breadcrumb" id="files-breadcrumb"></div>',
            right: searchBox
        });
        toolbar.className = 'files-toolbar fluent-navbar';
        app.appendChild(toolbar);
        
        // 主区域
        const main = document.createElement('div');
        main.className = 'files-main';
        
        // 使用 FluentUI.Sidebar 创建侧边栏
        const sidebar = FluentUI.Sidebar({
            sections: [{
                title: t('files.quick-access'),
                items: [
                    { id: 'desktop', label: t('files.desktop'), icon: 'Folder' },
                    { id: 'documents', label: t('files.documents'), icon: 'File' },
                    { id: 'downloads', label: t('files.downloads'), icon: 'Download' },
                    { id: 'recycle', label: t('files.recycle'), icon: 'Trash' }
                ]
            }],
            activeItem: this.currentPath[this.currentPath.length - 1],
            onItemClick: (id) => this.navigateToId(id)
        });
        sidebar.style.position = 'relative';
        
        // V2模式下在侧边栏底部添加项目计数
        const sidebarCount = document.createElement('div');
        sidebarCount.className = 'files-sidebar-count';
        sidebarCount.id = 'files-sidebar-count';
        sidebar.appendChild(sidebarCount);
        
        main.appendChild(sidebar);
        
        // 内容区域
        const content = document.createElement('div');
        content.className = 'files-content';
        content.id = 'files-content';
        content.innerHTML = '<div class="files-list" id="files-list"></div>';
        main.appendChild(content);
        
        app.appendChild(main);
        
        // 状态栏
        const statusbar = document.createElement('div');
        statusbar.className = 'files-statusbar';
        statusbar.innerHTML = '<span id="files-status"></span>';
        app.appendChild(statusbar);
        
        // 右键菜单容器
        const ctxMenu = document.createElement('div');
        ctxMenu.className = 'context-menu hidden';
        ctxMenu.id = `${this.windowId}-files-context-menu`;
        app.appendChild(ctxMenu);
        
        this.container.appendChild(app);

        this.addStyles();
        this.createSelectionBox();
        this.updateBreadcrumb();
        this.updateSidebarActive();
        this.renderFileList();
        this.bindEvents();
    },
    
    createSelectionBox() {
        // 如果已存在，先移除
        if (this.selectionBox && this.selectionBox.parentElement) {
            this.selectionBox.remove();
        }
        
        // 创建框选元素
        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'files-selection-box';
        this.selectionBox.style.cssText = `
            position: absolute;
            border: 2px solid rgba(0, 120, 212, 0.8);
            background: rgba(0, 120, 212, 0.1);
            pointer-events: none;
            display: none;
            z-index: 1000;
        `;
        
        // 添加到 files-content 内部，便于坐标对齐
        const filesContent = this.container.querySelector('#files-content');
        if (filesContent) {
            filesContent.appendChild(this.selectionBox);
        }
    },

    addStyles() {
        if (document.getElementById('files-app-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'files-app-styles';
        style.textContent = `
            .files-app { display: flex; flex-direction: column; height: 100%; }
            .files-toolbar { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border-color); background: var(--bg-tertiary); }
            .files-nav-buttons { display: flex; gap: 4px; }
            .toolbar-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); transition: background var(--transition-fast); }
            .toolbar-btn:hover:not(:disabled) { background: rgba(0, 0, 0, 0.05); }
            .toolbar-btn:disabled { opacity: 0.4; cursor: not-allowed; }
            .toolbar-btn img { width: 16px; height: 16px; }
            .files-breadcrumb { flex: 1; display: flex; align-items: center; gap: 8px; }
            .breadcrumb-item { display: flex; align-items: center; gap: 8px; padding: 4px 8px; border-radius: var(--radius-sm); cursor: pointer; transition: background var(--transition-fast); }
            .breadcrumb-item:hover { background: rgba(0, 0, 0, 0.05); }
            .breadcrumb-separator { color: var(--text-tertiary); }
            .files-search { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: var(--bg-secondary); border-radius: var(--radius-sm); min-width: 200px; }
            .files-search img { width: 16px; height: 16px; }
            .files-search input { flex: 1; border: none; background: none; font-size: 13px; outline: none; }
            .files-search:focus-within { box-shadow: 0 0 0 2px var(--accent); background: var(--bg-tertiary); }
            .files-main { flex: 1; display: flex; overflow: hidden; }
            .files-sidebar { width: 200px; border-right: 1px solid var(--border-color); padding: 12px 8px; overflow-y: auto; background: rgba(255, 255, 255, 0.5); backdrop-filter: blur(20px) saturate(180%); }
            .dark-mode .files-sidebar { background: rgba(32, 32, 32, 0.5); }
            .blur-disabled .files-sidebar { backdrop-filter: none; background: rgba(255, 255, 255, 0.95); }
            .dark-mode.blur-disabled .files-sidebar { background: rgba(32, 32, 32, 0.95); }
            .sidebar-section { margin-bottom: 16px; }
            .sidebar-title { font-size: 12px; font-weight: 600; color: var(--text-secondary); padding: 8px 12px; }
            .sidebar-item { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: var(--radius-sm); cursor: pointer; transition: background var(--transition-fast); }
            .sidebar-item:hover { background: rgba(0, 0, 0, 0.05); }
            .sidebar-item img { width: 16px; height: 16px; }
            .sidebar-item span { font-size: 13px; }
            .files-sidebar-count { display: none; }
            body.fluent-v2 .files-sidebar-count { display: block; }
            .files-content { flex: 1; overflow-y: auto; padding: 16px; position: relative; }
            .files-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 16px; }
            .file-item { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px 8px; border-radius: var(--radius-md); cursor: pointer; transition: background var(--transition-fast); }
            .file-item:hover { background: rgba(0, 0, 0, 0.05); }
            .file-item.selected { background: var(--accent); color: white; }
            .file-item img { width: 48px; height: 48px; }
            .file-item span { font-size: 13px; text-align: center; word-break: break-word; }
            .files-statusbar { padding: 8px 16px; border-top: 1px solid var(--border-color); font-size: 12px; color: var(--text-secondary); background: var(--bg-tertiary); }
            .dark-mode .toolbar-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.1); }
            .dark-mode .breadcrumb-item:hover { background: rgba(255, 255, 255, 0.1); }
            .dark-mode .sidebar-item:hover { background: rgba(255, 255, 255, 0.1); }
            .dark-mode .file-item:hover { background: rgba(255, 255, 255, 0.1); }
            
            /* V2 新版外观选中样式 - 圆角浅蓝高亮 */
            body.fluent-v2 .file-item.selected { 
                background: rgba(0, 120, 212, 0.25) !important; 
                color: inherit !important;
                border-radius: 12px !important;
            }
            body.fluent-v2 .file-item.selected:hover { 
                background: rgba(0, 120, 212, 0.35) !important; 
            }
            body.fluent-v2.dark-mode .file-item.selected { 
                background: rgba(100, 180, 255, 0.3) !important; 
                color: inherit !important;
            }
            body.fluent-v2.dark-mode .file-item.selected:hover { 
                background: rgba(100, 180, 255, 0.4) !important; 
            }
            
            /* 拖拽放置区域样式 */
            .files-content.drag-over {
                background: rgba(0, 120, 212, 0.1);
                border: 2px dashed var(--accent);
                border-radius: 8px;
            }
            
            /* 拖拽中的图标样式 */
            .desktop-icon.dragging {
                opacity: 0.5;
            }
            .file-item.dragging {
                opacity: 0.5;
            }
        `;
        document.head.appendChild(style);
    },

    bindEvents() {
        // 后退/前进
        document.getElementById('files-back')?.addEventListener('click', () => this.goBack());
        document.getElementById('files-forward')?.addEventListener('click', () => this.goForward());

        // 侧边栏项目
        this.container.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                this.navigateToId(id);
            });
        });

        // 将右键菜单移到 body，避免在窗口 transform/overflow 下错位或被裁剪
        const externalMenu = document.getElementById(`${this.windowId}-files-context-menu`);
        if (externalMenu && externalMenu.parentElement !== document.body) {
            document.body.appendChild(externalMenu);
        }

        // 文件列表
        const filesList = this.container.querySelector('#files-list');
        const filesContent = this.container.querySelector('#files-content');
        const filesApp = this.container.querySelector('.files-app');
        if (!filesList || !filesContent || !filesApp) {
            console.error('[FilesApp] bindEvents: core elements not found');
            return;
        }
        
        // 框选功能
        filesContent.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (e.target.closest('.file-item')) return; // 点击文件项时不启动框选
            if (!e.ctrlKey) {
                this.deselectAllItems();
            }
            
            this.isSelecting = true;
            const rect = filesContent.getBoundingClientRect();
            this.selectionStart = { 
                x: e.clientX - rect.left + filesContent.scrollLeft, 
                y: e.clientY - rect.top + filesContent.scrollTop 
            };
            this.selectionBox.style.left = this.selectionStart.x + 'px';
            this.selectionBox.style.top = this.selectionStart.y + 'px';
            this.selectionBox.style.width = '0px';
            this.selectionBox.style.height = '0px';
            this.selectionBox.style.display = 'block';
        });
        
        filesContent.addEventListener('mousemove', (e) => {
            if (!this.isSelecting) return;
            
            const rect = filesContent.getBoundingClientRect();
            const currentX = e.clientX - rect.left + filesContent.scrollLeft;
            const currentY = e.clientY - rect.top + filesContent.scrollTop;
            
            const left = Math.min(this.selectionStart.x, currentX);
            const top = Math.min(this.selectionStart.y, currentY);
            const width = Math.abs(currentX - this.selectionStart.x);
            const height = Math.abs(currentY - this.selectionStart.y);
            
            this.selectionBox.style.left = left + 'px';
            this.selectionBox.style.top = top + 'px';
            this.selectionBox.style.width = width + 'px';
            this.selectionBox.style.height = height + 'px';
            
            this.updateFileSelection();
        });
        
        // 绑定到 document 确保总能捕获 mouseup
        document.addEventListener('mouseup', () => {
            if (this.isSelecting) {
                this.justFinishedSelecting = true;
                this.isSelecting = false;
                this.selectionBox.style.display = 'none';
                
                // 延迟重置标记（给用户足够时间）
                setTimeout(() => {
                    this.justFinishedSelecting = false;
                }, 100);
            }
        });
        
        // 文件项点击
        filesList.addEventListener('click', (e) => {
            // 如果刚完成框选，不处理点击事件
            if (this.justFinishedSelecting) {
                return;
            }
            
            const item = e.target.closest('.file-item');
            if (item) {
                if (e.ctrlKey) {
                    this.toggleItemSelection(item);
                } else {
                    this.deselectAllItems();
                    this.selectItem(item);
                }
            }
        });
        
        filesList.addEventListener('dblclick', (e) => {
            const item = e.target.closest('.file-item');
            if (item) {
                const id = item.dataset.id;
                const node = State.findNode(id);
                if (node && node.type === 'folder') {
                    this.navigateTo(node);
                } else if (node && node.type === 'file') {
                    this.openFile(node);
                }
            }
        });
        
        // 键盘Delete键
        this.bindKeyboardEvents();
        
        // 拖拽接收
        this.bindDragDropEvents(filesApp, filesContent);

        // 文件列表右键（单个项）
        filesList.addEventListener('contextmenu', (e) => {
            const item = e.target.closest('.file-item');
            if (!item) return; // 由下方的空白区域处理
            e.preventDefault();
            this.contextTargetId = item.dataset.id;
            this.showContextMenu(e.clientX, e.clientY, true);
        });

        // 内容区域空白处右键（目录级）
        filesContent.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.file-item')) return; // 上面的处理
            e.preventDefault();
            this.contextTargetId = null;
            this.showContextMenu(e.clientX, e.clientY, false);
        });

        // 右键菜单动作
        const menu = document.getElementById(`${this.windowId}-files-context-menu`);
        document.addEventListener('click', () => menu.classList.add('hidden'));
        menu.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (!item) return;
            const action = item.dataset.action;
            this.handleContextAction(action);
            menu.classList.add('hidden');
        });

        // 搜索
        const searchInput = document.getElementById('files-search-input');
        searchInput?.addEventListener('input', (e) => {
            const query = e.target.value || '';
            clearTimeout(this.searchTimer);
            // 简单防抖，保证实时但不抖动
            this.searchTimer = setTimeout(() => {
                this.handleSearch(query.trim());
            }, 120);
        });

        // 订阅文件系统变化，保持视图同步
        State.on('fsChange', () => {
            const currentId = this.currentPath[this.currentPath.length - 1];
            const node = State.findNode(currentId);
            if (node) {
                this.currentNode = node;
                this.renderFileList();
                this.updateBreadcrumb();
            }
        });
    },

    showContextMenu(x, y, hasTarget) {
        const menu = document.getElementById(`${this.windowId}-files-context-menu`);
        if (!menu) return;
        const filesList = this.container ? this.container.querySelector('#files-list') : null;
        const totalItems = filesList ? filesList.querySelectorAll('.file-item').length : 0;
        const allSelected = totalItems > 0 && this.selectedItems.length === totalItems;
        const selectAction = allSelected ? 'deselect-all' : 'select-all';
        const selectLabel = allSelected ? t('files.deselect-all') : t('files.select-all');
        // 根据当前目录与是否选中项，动态构建菜单
        const inRecycle = this.currentNode && this.currentNode.id === 'recycle';
        if (inRecycle) {
            if (hasTarget) {
                // 判断是否多选
                const isMultiSelect = this.selectedItems.length > 1;
                const disabledClass = isMultiSelect ? ' disabled' : '';
                
                menu.innerHTML = `
                    <div class="context-menu-item${disabledClass}" data-action="restore"><img src="Theme/Icon/Symbol_icon/stroke/Reload.svg" alt=""><span>${t('files.restore')}</span></div>
                    <div class="context-menu-item" data-action="delete-permanent"><img src="Theme/Icon/Symbol_icon/stroke/Trash.svg" alt=""><span>${t('files.delete-permanent')}${isMultiSelect ? ` (${this.selectedItems.length}${t('files.items-count', {count: ''})})` : ''}</span></div>
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item" data-action="${selectAction}"><img src="Theme/Icon/Symbol_icon/stroke/Select Box.svg" alt=""><span>${selectLabel}</span></div>
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item${disabledClass}" data-action="properties"><img src="Theme/Icon/Symbol_icon/stroke/Information Circle.svg" alt=""><span>${t('files.properties')}</span></div>`;
            } else {
                menu.innerHTML = `
                    <div class="context-menu-item" data-action="refresh"><img src="Theme/Icon/Symbol_icon/stroke/Refresh.svg" alt=""><span>${t('files.refresh')}</span></div>
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item" data-action="${selectAction}"><img src="Theme/Icon/Symbol_icon/stroke/Select Box.svg" alt=""><span>${selectLabel}</span></div>
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item" data-action="restore-all"><img src="Theme/Icon/Symbol_icon/stroke/Reload.svg" alt=""><span>${t('files.restore-all')}</span></div>
                    <div class="context-menu-item" data-action="empty-recycle"><img src="Theme/Icon/Symbol_icon/stroke/Trash.svg" alt=""><span>${t('files.empty-recycle')}</span></div>`;
            }
        } else {
            if (hasTarget) {
                // 判断是否多选
                const isMultiSelect = this.selectedItems.length > 1;
                const disabledClass = isMultiSelect ? ' disabled' : '';
                
                menu.innerHTML = `
                    <div class="context-menu-item${disabledClass}" data-action="open"><img src="Theme/Icon/Symbol_icon/stroke/Folder Open.svg" alt=""><span>${t('files.open')}</span></div>
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item" data-action="copy"><img src="Theme/Icon/Symbol_icon/stroke/Copy.svg" alt=""><span>${t('files.copy')}</span></div>
                    <div class="context-menu-item" data-action="cut"><img src="Theme/Icon/Symbol_icon/stroke/Scissors.svg" alt=""><span>${t('files.cut')}</span></div>
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item${disabledClass}" data-action="rename"><img src="Theme/Icon/Symbol_icon/stroke/Edit.svg" alt=""><span>${t('files.rename')}</span></div>
                    <div class="context-menu-item" data-action="delete"><img src="Theme/Icon/Symbol_icon/stroke/Trash.svg" alt=""><span>${t('files.delete')}${isMultiSelect ? ` (${this.selectedItems.length})` : ''}</span></div>
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item" data-action="${selectAction}"><img src="Theme/Icon/Symbol_icon/stroke/Select Box.svg" alt=""><span>${selectLabel}</span></div>
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item${disabledClass}" data-action="properties"><img src="Theme/Icon/Symbol_icon/stroke/Information Circle.svg" alt=""><span>${t('files.properties')}</span></div>`;
            } else {
                const hasSelection = this.selectedItems.length > 0;
                const hasPaste = this.clipboard.items.length > 0;
                const pasteDisabled = !hasPaste ? ' disabled' : '';
                menu.innerHTML = `
                    <div class="context-menu-item" data-action="refresh"><img src="Theme/Icon/Symbol_icon/stroke/Refresh.svg" alt=""><span>${t('files.refresh')}</span></div>
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item${pasteDisabled}" data-action="paste"><img src="Theme/Icon/Symbol_icon/stroke/Clipboard.svg" alt=""><span>${t('files.paste')}${hasPaste ? ` (${this.clipboard.items.length})` : ''}</span></div>
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item" data-action="new-folder"><img src="Theme/Icon/Symbol_icon/stroke/Folder.svg" alt=""><span>${t('files.new-folder')}</span></div>
                    <div class="context-menu-item" data-action="new-text"><img src="Theme/Icon/Symbol_icon/stroke/File.svg" alt=""><span>${t('files.new-text')}</span></div>
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item" data-action="${selectAction}"><img src="Theme/Icon/Symbol_icon/stroke/Select Box.svg" alt=""><span>${selectLabel}</span></div>
                    ${hasSelection ? '<div class="context-menu-separator"></div><div class="context-menu-item" data-action="delete-selected"><img src="Theme/Icon/Symbol_icon/stroke/Trash.svg" alt=""><span>' + t('files.delete-selected') + ' (' + this.selectedItems.length + ')</span></div>' : ''}`;
            }
        }
        // 预显示计算尺寸，避免越界
        menu.classList.remove('hidden');
        const prevVis = menu.style.visibility;
        menu.style.visibility = 'hidden';
        menu.style.left = `0px`;
        menu.style.top = `0px`;
        const rect = menu.getBoundingClientRect();
        let left = x;
        let top = y;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (left + rect.width > vw) left = Math.max(0, vw - rect.width - 4);
        if (top + rect.height > vh) top = Math.max(0, vh - rect.height - 4);
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.style.visibility = prevVis || '';
    },

    handleContextAction(action) {
        switch (action) {
            case 'refresh':
                this.renderFileList();
                break;
            case 'open':
                if (this.contextTargetId) {
                    const node = State.findNode(this.contextTargetId);
                    if (node) {
                        if (node.type === 'folder') {
                            this.navigateTo(node);
                        } else if (node.type === 'file') {
                            this.openFile(node);
                        }
                    }
                }
                break;
            case 'new-folder':
                this.createFolder();
                break;
            case 'new-text':
                this.createTextFile();
                break;
            case 'select-all':
                this.selectAllItems();
                break;
            case 'deselect-all':
                this.deselectAllItems();
                break;
            case 'rename':
                if (this.contextTargetId) this.renameNode(this.contextTargetId);
                break;
            case 'delete':
                // 多选时删除所有选中的文件
                if (this.selectedItems.length > 1) {
                    this.deleteSelectedItems();
                } else if (this.contextTargetId) {
                    this.moveToRecycle(this.contextTargetId);
                }
                break;
            case 'delete-selected':
                this.deleteSelectedItems();
                break;
            case 'properties':
                if (this.contextTargetId) this.showProperties(this.contextTargetId);
                break;
            case 'restore':
                if (this.contextTargetId) this.restoreNode(this.contextTargetId);
                break;
            case 'delete-permanent':
                // 多选时永久删除所有选中的文件
                if (this.selectedItems.length > 1) {
                    this.deleteSelectedPermanent();
                } else if (this.contextTargetId) {
                    this.deleteNodePermanent(this.contextTargetId);
                }
                break;
            case 'restore-all':
                this.restoreAllFromRecycle();
                break;
            case 'empty-recycle':
                this.emptyRecycle();
                break;
            case 'copy':
                this.copyToClipboard();
                break;
            case 'cut':
                this.cutToClipboard();
                break;
            case 'paste':
                this.pasteFromClipboard();
                break;
        }
    },
    
    // 复制到剪贴板
    copyToClipboard() {
        const items = this.selectedItems.length > 0 
            ? this.selectedItems.map(el => el.dataset.id)
            : (this.contextTargetId ? [this.contextTargetId] : []);
        
        if (items.length === 0) return;
        
        this.clipboard = {
            items: items,
            action: 'copy'
        };
        
        FluentUI.Toast({ title: t('files.title'), message: t('files.copied', {count: items.length}), type: 'info' });
    },
    
    // 剪切到剪贴板
    cutToClipboard() {
        const items = this.selectedItems.length > 0 
            ? this.selectedItems.map(el => el.dataset.id)
            : (this.contextTargetId ? [this.contextTargetId] : []);
        
        if (items.length === 0) return;
        
        this.clipboard = {
            items: items,
            action: 'cut'
        };
        
        // 添加剪切样式
        this.renderFileList();
        FluentUI.Toast({ title: t('files.title'), message: t('files.cut-done', {count: items.length}), type: 'info' });
    },
    
    // 从剪贴板粘贴
    pasteFromClipboard() {
        if (this.clipboard.items.length === 0) return;
        
        const targetFolder = this.currentNode;
        if (!targetFolder || targetFolder.type !== 'folder') return;
        
        let pastedCount = 0;
        
        this.clipboard.items.forEach(id => {
            const node = State.findNode(id);
            if (!node) return;
            
            if (this.clipboard.action === 'copy') {
                // 复制：创建副本
                const copy = this.deepCloneNode(node);
                // 正确处理文件扩展名，使副本数字在扩展名前面
                if (node.type === 'file') {
                    const dotIndex = node.name.lastIndexOf('.');
                    if (dotIndex > 0) {
                        const baseName = node.name.substring(0, dotIndex);
                        const ext = node.name.substring(dotIndex);
                        copy.name = this.generateUniqueName(baseName, ext);
                    } else {
                        copy.name = this.generateUniqueName(node.name, '');
                    }
                } else {
                    copy.name = this.generateUniqueName(node.name, '');
                }
                targetFolder.children = targetFolder.children || [];
                targetFolder.children.push(copy);
                pastedCount++;
            } else if (this.clipboard.action === 'cut') {
                // 剪切：移动节点
                const parent = State.findParentNode(id);
                if (parent && parent.id !== targetFolder.id) {
                    const idx = parent.children.findIndex(c => c.id === id);
                    if (idx !== -1) {
                        parent.children.splice(idx, 1);
                        targetFolder.children = targetFolder.children || [];
                        targetFolder.children.push(node);
                        pastedCount++;
                    }
                }
            }
        });
        
        // 剪切后清空剪贴板
        if (this.clipboard.action === 'cut') {
            this.clipboard = { items: [], action: null };
        }
        
        State.updateFS(State.fs);
        
        // 重新获取当前节点
        const currentId = this.currentPath[this.currentPath.length - 1];
        this.currentNode = State.findNode(currentId);
        
        this.renderFileList();
        
        if (pastedCount > 0) {
            FluentUI.Toast({ title: t('files.title'), message: t('files.pasted', {count: pastedCount}), type: 'success' });
        }
    },
    
    // 深度克隆节点
    deepCloneNode(node) {
        const clone = { ...node, id: `${node.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
        if (node.children) {
            clone.children = node.children.map(child => this.deepCloneNode(child));
        }
        clone.created = new Date().toISOString();
        clone.modified = new Date().toISOString();
        return clone;
    },

    createFolder() {
        const name = this.generateUniqueName(t('files.new-folder-name'));
        const newNode = { id: `folder-${Date.now()}`, name, type: 'folder', children: [], created: new Date().toISOString(), modified: new Date().toISOString() };
        this.currentNode.children = this.currentNode.children || [];
        this.currentNode.children.push(newNode);
        State.updateFS(State.fs);
        
        // 重新获取当前节点
        const currentId = this.currentPath[this.currentPath.length - 1];
        this.currentNode = State.findNode(currentId);
        
        this.renderFileList();
    },

    createTextFile() {
        const name = this.generateUniqueName(t('files.new-text-name'), '.txt');
        const newNode = { id: `file-${Date.now()}`, name, type: 'file', content: '', size: 0, created: new Date().toISOString(), modified: new Date().toISOString() };
        this.currentNode.children = this.currentNode.children || [];
        this.currentNode.children.push(newNode);
        State.updateFS(State.fs);
        
        // 重新获取当前节点
        const currentId = this.currentPath[this.currentPath.length - 1];
        this.currentNode = State.findNode(currentId);
        
        this.renderFileList();
        
        // 使用记事本打开
        WindowManager.openApp('notes', { fileId: newNode.id });
    },

    renameNode(id) {
        const node = State.findNode(id);
        if (!node) return;

        const splitFileExt = (name) => {
            const text = String(name || '');
            const dotIndex = text.lastIndexOf('.');
            if (dotIndex <= 0 || dotIndex === text.length - 1) {
                return {
                    hasExt: false,
                    base: dotIndex === text.length - 1 ? text.slice(0, -1) : text,
                    ext: ''
                };
            }
            return {
                hasExt: true,
                base: text.slice(0, dotIndex),
                ext: text.slice(dotIndex + 1)
            };
        };

        const applyRename = (nextName) => {
            node.name = nextName;
            node.modified = new Date().toISOString();
            State.updateFS(State.fs);
            
            // 重新获取当前节点
            const currentId = this.currentPath[this.currentPath.length - 1];
            this.currentNode = State.findNode(currentId);
            
            this.renderFileList();
            FluentUI.Toast({ title: t('files.rename-title'), message: t('files.renamed', {name: nextName}), type: 'success' });
        };
        
        FluentUI.InputDialog({
            title: t('files.rename-title'),
            placeholder: t('files.rename-placeholder'),
            defaultValue: node.name,
            validateFn: (value) => {
                if (!value) return t('files.rename-empty');
                if (value.includes('/') || value.includes('\\')) return t('files.rename-invalid');
                return true;
            },
            onConfirm: (newName) => {
                if (node.type !== 'file') {
                    applyRename(newName);
                    return;
                }

                const oldParts = splitFileExt(node.name);
                const newParts = splitFileExt(newName);

                // 原文件没有扩展名，不做扩展名策略限制
                if (!oldParts.hasExt) {
                    applyRename(newName);
                    return;
                }

                // 用户把扩展名删掉：自动补回原扩展名
                if (!newParts.hasExt) {
                    const base = (newParts.base || oldParts.base || newName).replace(/\.+$/g, '') || oldParts.base || 'untitled';
                    applyRename(`${base}.${oldParts.ext}`);
                    return;
                }

                const oldExt = oldParts.ext.toLowerCase();
                const nextExt = newParts.ext.toLowerCase();
                if (oldExt !== nextExt) {
                    FluentUI.Dialog({
                        type: 'warning',
                        title: t('files.rename-ext-confirm-title'),
                        content: t('files.rename-ext-confirm-content'),
                        buttons: [
                            { text: t('cancel'), variant: 'secondary', value: false },
                            { text: t('ok'), variant: 'primary', value: true }
                        ],
                        onClose: (confirmed) => {
                            if (confirmed === true) {
                                applyRename(newName);
                            }
                        }
                    });
                    return;
                }

                applyRename(newName);
            }
        });
    },

    moveToRecycle(id) {
        const parent = this.currentNode;
        if (!parent || !parent.children) return;
        const idx = parent.children.findIndex(c => c.id === id);
        if (idx === -1) return;
        const node = parent.children.splice(idx, 1)[0];
        node._recycle = { originalParentId: parent.id };
        const recycle = State.findNode('recycle');
        if (!recycle) {
            console.error('[FilesApp] 回收站不存在');
            return;
        }
        recycle.children = recycle.children || [];
        recycle.children.unshift(node);
        State.updateFS(State.fs);
        
        // 重新获取当前节点，确保引用是最新的
        const currentId = this.currentPath[this.currentPath.length - 1];
        this.currentNode = State.findNode(currentId);
        
        this.renderFileList();
    },

    restoreNode(id) {
        const recycle = State.findNode('recycle');
        if (!recycle || !recycle.children) return;
        const idx = recycle.children.findIndex(c => c.id === id);
        if (idx === -1) return;
        const node = recycle.children.splice(idx, 1)[0];
        const targetParent = State.findNode(node._recycle?.originalParentId) || State.findNode('desktop') || State.fs.root;
        delete node._recycle;
        targetParent.children = targetParent.children || [];
        // 冲突名处理 — 基于目标目录检测
        const exists = targetParent.children.some(n => n.name === node.name);
        if (exists) {
            node.name = this._uniqueNameIn(targetParent, node.name, node.type === 'file' ? '.txt' : '');
        }
        targetParent.children.push(node);
        State.updateFS(State.fs);

        const currentId = this.currentPath[this.currentPath.length - 1];
        this.currentNode = State.findNode(currentId);

        this.renderFileList();
    },

    deleteNodePermanent(id) {
        const recycle = State.findNode('recycle');
        if (!recycle || !recycle.children) return;
        const idx = recycle.children.findIndex(c => c.id === id);
        if (idx === -1) return;
        recycle.children.splice(idx, 1);
        State.updateFS(State.fs);
        
        // 重新获取当前节点
        const currentId = this.currentPath[this.currentPath.length - 1];
        this.currentNode = State.findNode(currentId);
        
        this.renderFileList();
    },

    deleteSelectedPermanent() {
        if (this.selectedItems.length === 0) return;
        
        const recycle = State.findNode('recycle');
        if (!recycle || !recycle.children) return;
        
        const count = this.selectedItems.length;
        const selectedSet = new Set(this.selectedItems);
        
        // 使用 filter 删除所有选中的文件
        recycle.children = recycle.children.filter(c => !selectedSet.has(c.id));
        
        State.updateFS(State.fs);
        
        // 清除选择
        this.selectedItems = [];
        
        // 重新获取当前节点
        const currentId = this.currentPath[this.currentPath.length - 1];
        this.currentNode = State.findNode(currentId);
        
        this.renderFileList();
        
        FluentUI.Toast({ title: t('files.recycle'), message: t('files.deleted-permanent', {count: count}), type: 'info' });
    },

    restoreAllFromRecycle() {
        const recycle = State.findNode('recycle');
        if (!recycle || !recycle.children) return;
        const items = [...recycle.children];
        recycle.children = [];
        items.forEach(node => {
            const parent = State.findNode(node._recycle?.originalParentId) || State.findNode('desktop') || State.fs.root;
            delete node._recycle;
            parent.children = parent.children || [];
            const exists = parent.children.some(n => n.name === node.name);
            if (exists) {
                node.name = this._uniqueNameIn(parent, node.name, node.type === 'file' ? '.txt' : '');
            }
            parent.children.push(node);
        });
        State.updateFS(State.fs);
        
        // 重新获取当前节点
        const currentId = this.currentPath[this.currentPath.length - 1];
        this.currentNode = State.findNode(currentId);
        
        this.renderFileList();
    },

    emptyRecycle() {
        const recycle = State.findNode('recycle');
        if (!recycle) return;
        recycle.children = [];
        State.updateFS(State.fs);
        
        // 重新获取当前节点
        const currentId = this.currentPath[this.currentPath.length - 1];
        this.currentNode = State.findNode(currentId);
        
        this.renderFileList();
    },

    showProperties(id) {
        const node = State.findNode(id);
        if (!node) return;
        const typeMap = { folder: t('files.type-folder'), file: t('files.type-file') };
        const sizeStr = node.size ? (node.size > 1024 ? `${(node.size / 1024).toFixed(2)} KB` : `${node.size}B`) : '0 B';
        const content = `
            <div style="display: flex; flex-direction: column; gap: 12px; font-size: 14px;">
                <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-secondary);">${t('files.prop-name')}</span><span>${node.name}</span></div>
                <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-secondary);">${t('files.prop-type')}</span><span>${typeMap[node.type] || node.type}</span></div>
                <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-secondary);">${t('files.prop-size')}</span><span>${sizeStr}</span></div>
                <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-secondary);">${t('files.prop-created')}</span><span>${node.created ? new Date(node.created).toLocaleString() : '-'}</span></div>
                <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-secondary);">${t('files.prop-modified')}</span><span>${node.modified ? new Date(node.modified).toLocaleString() : '-'}</span></div>
            </div>
        `;
        FluentUI.Dialog({
            title: t('files.properties'),
            content: content,
            type: 'info',
            buttons: [{ text: t('ok'), variant: 'primary' }]
        });
    },

    // 在指定目录中生成不重名的文件名
    _uniqueNameIn(folder, fullName, ext) {
        const base = ext ? fullName.replace(new RegExp(ext.replace('.', '\\.') + '$', 'i'), '') : fullName;
        const check = (n) => (folder.children || []).some(c => c.name === n);
        if (!check(base + ext)) return base + ext;
        let i = 2;
        while (check(`${base}(${i})${ext}`)) i++;
        return `${base} (${i})${ext}`;
    },

    generateUniqueName(base, ext = '') {
        const exists = (name) => (this.currentNode.children || []).some(n => n.name === name + ext);
        if (!exists(base)) return base + ext;
        let i = 2;
        while (exists(`${base} (${i})`)) i++;
        return `${base} (${i})${ext}`;
    },

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('files-breadcrumb');
        if (!breadcrumb) return;

        breadcrumb.innerHTML = '';
        
        let path = [];
        this.currentPath.forEach((id, index) => {
            const node = State.findNode(id);
            if (!node) return;

            if (index > 0) {
                const separator = document.createElement('span');
                separator.className = 'breadcrumb-separator';
                separator.textContent = '›';
                breadcrumb.appendChild(separator);
            }

            const item = document.createElement('div');
            item.className = 'breadcrumb-item';
            item.textContent = node.name;
            item.addEventListener('click', () => {
                this.currentPath = this.currentPath.slice(0, index + 1);
                this.currentNode = node;
                this.renderFileList();
                this.updateBreadcrumb();
                this.updateSidebarActive();
            });
            breadcrumb.appendChild(item);
        });
    },

    updateSidebarActive() {
        // 更新侧边栏选中状态
        const sidebar = this.container.querySelector('.fluent-sidebar');
        if (!sidebar) return;
        
        // 获取当前路径中的快速访问项目ID
        const quickAccessIds = ['desktop', 'documents', 'downloads', 'recycle'];
        const currentId = this.currentPath.find(id => quickAccessIds.includes(id));
        
        // 移除所有 active 状态
        sidebar.querySelectorAll('.fluent-sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // 添加当前项目的 active 状态
        if (currentId) {
            const activeItem = sidebar.querySelector(`.fluent-sidebar-item[data-id="${currentId}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
            }
        }
    },

    renderFileList() {
        const filesList = document.getElementById('files-list');
        if (!filesList) {
            console.error('[FilesApp] files-list 元素不存在');
            return;
        }

        filesList.innerHTML = '';

        if (!this.currentNode) {
            console.error('[FilesApp] currentNode 未初始化');
            filesList.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-tertiary); padding: 48px;">${t('files.load-error')}</div>`;
            return;
        }

        if (!this.currentNode.children || this.currentNode.children.length === 0) {
            filesList.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-tertiary); padding: 48px;">${t('files.empty-folder')}</div>`;
            this.updateStatus(0);
            return;
        }

        this.currentNode.children.forEach(node => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.dataset.id = node.id;
            item.draggable = true;
            
            const icon = node.type === 'folder' 
                ? 'Theme/Icon/Symbol_icon/stroke/Folder.svg'
                : 'Theme/Icon/Symbol_icon/stroke/File.svg';

            item.innerHTML = `
                <img src="${icon}" alt="${node.name}">
                <span>${node.name}</span>
            `;
            
            // 拖拽事件
            let draggingIds = [node.id];
            item.addEventListener('dragstart', (e) => {
                const selectedIds = this.selectedItems
                    .map(el => el.dataset.id)
                    .filter(Boolean);
                const useMultiSelection = item.classList.contains('selected') && selectedIds.length > 1;
                draggingIds = useMultiSelection ? [...new Set(selectedIds)] : [node.id];

                e.dataTransfer.setData('text/plain', draggingIds[0]);
                e.dataTransfer.setData('application/fluent-file', JSON.stringify({
                    id: node.id,
                    ids: draggingIds,
                    name: node.name,
                    type: node.type,
                    source: 'files'
                }));
                draggingIds.forEach((id) => {
                    const itemEl = filesList.querySelector(`.file-item[data-id="${id}"]`);
                    if (itemEl) itemEl.classList.add('dragging');
                });
            });
            
            item.addEventListener('dragend', () => {
                draggingIds.forEach((id) => {
                    const itemEl = filesList.querySelector(`.file-item[data-id="${id}"]`);
                    if (itemEl) itemEl.classList.remove('dragging');
                });
                draggingIds = [node.id];
            });

            filesList.appendChild(item);
        });

        this.updateStatus(this.currentNode.children.length);
    },

    updateStatus(count) {
        const status = document.getElementById('files-status');
        if (status) {
            status.textContent = t('files.items', {count});
        }
        // V2模式下更新侧边栏计数
        const sidebarCount = document.getElementById('files-sidebar-count');
        if (sidebarCount) {
            sidebarCount.textContent = t('files.items', {count});
        }
    },
    
    addStylesOnce() {
        if (document.getElementById('files-extra-styles')) return;
        const style = document.createElement('style');
        style.id = 'files-extra-styles';
        style.textContent = `
            .pulse-highlight { animation: pulseHighlight 1.2s ease-out 1; }
            @keyframes pulseHighlight { 0% { box-shadow: 0 0 0 0 rgba(0,123,255,0.5);} 70% { box-shadow: 0 0 0 8px rgba(0,123,255,0);} 100% { box-shadow: none; } }
        `;
        document.head.appendChild(style);
    },

    navigateTo(node) {
        this.currentNode = node;
        this.currentPath.push(node.id);
        this.renderFileList();
        this.updateBreadcrumb();
        
        // 更新历史
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push([...this.currentPath]);
        this.historyIndex++;
    },

    navigateToId(id, highlightChildId = null) {
        const node = State.findNode(id);
        if (!node || node.type !== 'folder') {
            console.error('[FilesApp] navigateToId: 无效节点或非文件夹', id);
            return;
        }
        
        // 特殊处理：root 的直接子节点（desktop, documents, downloads, recycle）
        const isRootChild = State.fs.root.children && State.fs.root.children.some(c => c.id === id);
        if (isRootChild) {
            this.currentPath = ['root', id];
        } else {
            const path = this.getPathToNode(id);
            if (!path) {
                console.error('[FilesApp] navigateToId: 无法找到路径', id);
                return;
            }
            this.currentPath = path;
        }
        
            this.currentNode = node;
        
        // 更新历史
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push([...this.currentPath]);
        this.historyIndex++;
        
            this.renderFileList();
            this.updateBreadcrumb();
            this.updateSidebarActive();
            // 若需要高亮某个子项
            if (highlightChildId) {
                setTimeout(() => {
                    const el = this.container.querySelector(`.file-item[data-id="${highlightChildId}"]`);
                    if (el) {
                        el.classList.add('pulse-highlight');
                        el.scrollIntoView({ block: 'center' });
                        setTimeout(() => el.classList.remove('pulse-highlight'), 1200);
                    }
                }, 50);
        }
    },

    getPathToNode(id, node = State.fs.root, path = []) {
        if (node.id === id) return [...path, id];
        if (node.children) {
            for (const child of node.children) {
                const result = this.getPathToNode(id, child, [...path, node.id]);
                if (result) return result;
            }
        }
        return null;
    },

    goBack() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.currentPath = [...this.history[this.historyIndex]];
            this.currentNode = State.findNode(this.currentPath[this.currentPath.length - 1]);
            this.renderFileList();
            this.updateBreadcrumb();
            this.updateSidebarActive();
            this.render();
        }
    },

    goForward() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.currentPath = [...this.history[this.historyIndex]];
            this.currentNode = State.findNode(this.currentPath[this.currentPath.length - 1]);
            this.renderFileList();
            this.updateBreadcrumb();
            this.updateSidebarActive();
            this.render();
        }
    },

    filterFiles(query) {
        const items = this.container.querySelectorAll('.file-item');
        items.forEach(item => {
            const name = item.querySelector('span').textContent.toLowerCase();
            if (name.includes(query.toLowerCase())) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    },

    openFile(node) {
        if (node.type === 'file') {
            if (typeof NotesApp !== 'undefined' && NotesApp.openWithContent) {
                NotesApp.openWithContent(node.name, node.content || '');
            } else if (typeof WindowManager !== 'undefined') {
                WindowManager.openApp('notes');
                setTimeout(() => {
                    if (typeof NotesApp !== 'undefined' && NotesApp.setDocument) {
                        NotesApp.setDocument(node.name, node.content || '');
                    }
                }, 0);
            }
        }
    },
    
    // 选择相关方法
    selectItem(item) {
        item.classList.add('selected');
        if (!this.selectedItems.includes(item)) {
            this.selectedItems.push(item);
        }
    },
    
    toggleItemSelection(item) {
        if (item.classList.contains('selected')) {
            item.classList.remove('selected');
            this.selectedItems = this.selectedItems.filter(i => i !== item);
        } else {
            this.selectItem(item);
        }
    },
    
    deselectAllItems() {
        const filesList = document.getElementById('files-list');
        if (filesList) {
            filesList.querySelectorAll('.file-item').forEach(item => {
                item.classList.remove('selected');
            });
        }
        this.selectedItems = [];
    },

    selectAllItems() {
        const filesList = document.getElementById('files-list');
        if (!filesList) return;
        const items = Array.from(filesList.querySelectorAll('.file-item'));
        if (items.length === 0) return;
        this.deselectAllItems();
        items.forEach((item) => this.selectItem(item));
    },
    
    updateFileSelection() {
        const boxRect = this.selectionBox.getBoundingClientRect();
        const filesContent = document.getElementById('files-content');
        const contentRect = filesContent.getBoundingClientRect();
        
        const filesList = document.getElementById('files-list');
        const items = filesList.querySelectorAll('.file-item');
        
        items.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            
            // 调整为相对于content的坐标
            const adjustedBoxRect = {
                left: boxRect.left - contentRect.left + filesContent.scrollLeft,
                right: boxRect.right - contentRect.left + filesContent.scrollLeft,
                top: boxRect.top - contentRect.top + filesContent.scrollTop,
                bottom: boxRect.bottom - contentRect.top + filesContent.scrollTop
            };
            
            const adjustedItemRect = {
                left: itemRect.left - contentRect.left + filesContent.scrollLeft,
                right: itemRect.right - contentRect.left + filesContent.scrollLeft,
                top: itemRect.top - contentRect.top + filesContent.scrollTop,
                bottom: itemRect.bottom - contentRect.top + filesContent.scrollTop
            };
            
            const isIntersecting = !(
                adjustedItemRect.right < adjustedBoxRect.left ||
                adjustedItemRect.left > adjustedBoxRect.right ||
                adjustedItemRect.bottom < adjustedBoxRect.top ||
                adjustedItemRect.top > adjustedBoxRect.bottom
            );
            
            if (isIntersecting && !item.classList.contains('selected')) {
                this.selectItem(item);
            }
        });
    },
    
    bindDragDropEvents(dropZone, highlightTarget = dropZone) {
        const highlightEl = highlightTarget || dropZone;
        const hasFluentPayload = (dataTransfer) => {
            if (!dataTransfer || !dataTransfer.types) return false;
            const types = Array.from(dataTransfer.types);
            return types.includes('application/fluent-file') || types.includes('text/plain');
        };
        const parseDropData = (dataTransfer) => {
            const fileData = dataTransfer?.getData('application/fluent-file');
            if (fileData) {
                try {
                    return JSON.parse(fileData);
                } catch (err) {
                    console.error('[FilesApp] 拖拽数据解析失败:', err);
                    return null;
                }
            }

            const fallbackId = (dataTransfer?.getData('text/plain') || '').trim();
            if (!fallbackId) return null;
            const node = State.findNode(fallbackId);
            if (!node) return null;
            return {
                id: node.id,
                name: node.name,
                type: node.type,
                source: 'fallback'
            };
        };

        // 允许放置
        dropZone.addEventListener('dragover', (e) => {
            if (!hasFluentPayload(e.dataTransfer)) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            highlightEl.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            if (!dropZone.contains(e.relatedTarget)) {
                highlightEl.classList.remove('drag-over');
            }
        });
        
        dropZone.addEventListener('drop', (e) => {
            if (!hasFluentPayload(e.dataTransfer)) return;
            e.preventDefault();
            e.stopPropagation();
            highlightEl.classList.remove('drag-over');
            
            const data = parseDropData(e.dataTransfer);
            if (!data || (!data.id && !(Array.isArray(data.ids) && data.ids.length > 0))) return;
            this.handleFileDrop(data);
        });

        dropZone.addEventListener('dragend', () => {
            highlightEl.classList.remove('drag-over');
        });
    },
    
    handleFileDrop(data) {
        const ids = Array.isArray(data?.ids) ? data.ids : [data?.id];
        const dragIds = [...new Set(ids.filter(id => typeof id === 'string' && id))];
        if (dragIds.length === 0) return;

        let movedCount = 0;
        let firstMovedName = '';
        let hasMoveError = false;
        this.currentNode.children = this.currentNode.children || [];

        dragIds.forEach((id) => {
            const node = State.findNode(id);
            if (!node) return;
            
            // 不能移动到当前目录自身
            if (this.currentNode.id === id) return;
            
            // 不能移动到自己的子目录
            if (node.type === 'folder' && this.isDescendant(node, this.currentNode)) {
                hasMoveError = true;
                return;
            }
            
            // 找到原父节点
            const parent = State.findParentNode(id);
            if (!parent) return;
            
            // 如果已经在当前目录，不需要移动
            if (parent.id === this.currentNode.id) return;
            
            // 从原位置移除
            const idx = parent.children ? parent.children.findIndex(c => c.id === id) : -1;
            if (idx === -1) return;
            parent.children.splice(idx, 1);
            
            // 添加到当前目录
            this.currentNode.children.push(node);
            movedCount++;
            if (!firstMovedName) firstMovedName = node.name;
        });

        if (movedCount === 0) {
            if (hasMoveError) {
                FluentUI.Toast({ title: t('files.title'), message: t('files.move-error'), type: 'error' });
            }
            return;
        }

        State.updateFS(State.fs);
        
        // 刷新显示
        this.renderFileList();
        
        if (movedCount === 1) {
            FluentUI.Toast({ title: t('files.title'), message: t('files.moved', {name: firstMovedName}), type: 'success' });
        } else {
            FluentUI.Toast({ title: t('files.title'), message: t('files.items', {count: movedCount}), type: 'success' });
        }
    },
    
    isDescendant(parent, child) {
        if (!parent.children) return false;
        for (const c of parent.children) {
            if (c.id === child.id) return true;
            if (c.type === 'folder' && this.isDescendant(c, child)) return true;
        }
        return false;
    },
    
    bindKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // 检查当前窗口是否是文件App
            const activeWindow = document.querySelector('.window:not(.minimized)');
            if (!activeWindow || !activeWindow.id.includes(this.windowId)) return;

            const target = e.target;
            const isEditableTarget = target && (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            );
            if (isEditableTarget) return;

            let key = String(e.key || '').toLowerCase();
            if ((!key || !/^[a-z]$/.test(key)) && /^Key[A-Z]$/.test(String(e.code || ''))) {
                key = String(e.code).slice(3).toLowerCase();
            }
            
            // Delete键删除
            if (e.key === 'Delete' && this.selectedItems.length > 0) {
                e.preventDefault();
                this.deleteSelectedItems();
                return;
            }

            // Ctrl+A 全选
            if (e.ctrlKey && !e.altKey && !e.metaKey && key === 'a') {
                e.preventDefault();
                this.selectAllItems();
                return;
            }
            
            // Ctrl+C 复制
            if (e.ctrlKey && !e.altKey && !e.metaKey && key === 'c' && this.selectedItems.length > 0) {
                e.preventDefault();
                this.copyToClipboard();
                return;
            }
            
            // Ctrl+X 剪切
            if (e.ctrlKey && !e.altKey && !e.metaKey && key === 'x' && this.selectedItems.length > 0) {
                e.preventDefault();
                this.cutToClipboard();
                return;
            }
            
            // Ctrl+V 粘贴
            if (e.ctrlKey && !e.altKey && !e.metaKey && key === 'v' && this.clipboard.items.length > 0) {
                e.preventDefault();
                this.pasteFromClipboard();
            }
        });
    },
    
    deleteSelectedItems() {
        if (this.selectedItems.length === 0) return;
        
        const recycle = State.findNode('recycle');
        if (!recycle) {
            console.error('[FilesApp] 回收站不存在');
            return;
        }
        
        const count = this.selectedItems.length;
        
        // 移动所有选中的项到回收站
        this.selectedItems.forEach(item => {
            const nodeId = item.dataset.id;
            const node = State.findNode(nodeId);
            if (!node) return;
            
            // 从当前目录移除
            const idx = this.currentNode.children.findIndex(c => c.id === nodeId);
            if (idx !== -1) {
                const removedNode = this.currentNode.children.splice(idx, 1)[0];
                removedNode._recycle = { originalParentId: this.currentNode.id };
                
                // 添加到回收站
                recycle.children = recycle.children || [];
                recycle.children.unshift(removedNode);
            }
        });
        
        // 更新文件系统
        State.updateFS(State.fs);
        
        // 重新获取当前节点，确保引用是最新的
        const currentId = this.currentPath[this.currentPath.length - 1];
        this.currentNode = State.findNode(currentId);
        
        // 清除选择并重新渲染
        this.deselectAllItems();
        this.renderFileList();
        
        // 显示通知
            State.addNotification({
            title: t('files.title'),
            message: t('files.deleted', {count}),
                type: 'info'
            });
    },

    // 实时搜索处理（全局搜索，排除回收站）
    handleSearch(query) {
        if (!query) {
            this.isSearching = false;
            this.renderFileList();
            this.updateBreadcrumb();
            return;
        }
        // 若当前在回收站，搜索结果固定为空（不可检索）
        if (this.currentNode && this.currentNode.id === 'recycle') {
            this.isSearching = true;
            this.renderSearchResults([]);
            return;
        }
        this.isSearching = true;
        const results = this.performSearch(query);
        this.renderSearchResults(results);
    },

    // 执行搜索：遍历整个文件系统，但跳过回收站分支
    performSearch(query) {
        const q = query.toLowerCase();
        const results = [];
        const root = State.fs.root;
        const traverse = (node, path) => {
            if (!node) return;
            if (node.id === 'recycle') return; // 跳过回收站
            const currentPath = [...path, node.id];
            if (node.name && node.name.toLowerCase().includes(q)) {
                results.push({ nodeId: node.id, nodeType: node.type, path: currentPath });
            }
            if (node.children && node.children.length) {
                node.children.forEach(child => traverse(child, currentPath));
            }
        };
        traverse(root, []);
        return results.slice(0, 500); // 保护性上限
    },

    // 渲染搜索结果（平铺列表，展示路径）
    renderSearchResults(results) {
        const filesList = document.getElementById('files-list');
        if (!filesList) return;
        filesList.innerHTML = '';

        if (!results.length) {
            filesList.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-tertiary); padding: 48px;">${t('files.no-match')}</div>`;
            this.updateStatus(0);
            return;
        }

        const pathToText = (pathIds) => {
            const names = [];
            for (let i = 0; i < pathIds.length; i++) {
                const node = State.findNode(pathIds[i]);
                if (!node) continue;
                // 跳过 root 自身
                if (node.id !== 'root') names.push(node.name);
            }
            return names.join(' / ');
        };

        results.forEach(({ nodeId, nodeType, path }) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.dataset.id = nodeId;
            
            const icon = nodeType === 'folder' 
                ? 'Theme/Icon/Symbol_icon/stroke/Folder.svg'
                : 'Theme/Icon/Symbol_icon/stroke/File.svg';
            const nameNode = State.findNode(nodeId);
            const displayName = nameNode ? nameNode.name : nodeId;
            const location = pathToText(path.slice(0, -1));

            item.innerHTML = `
                <img src="${icon}" alt="${displayName}">
                <span>${displayName}</span>
                <small style="opacity:.7; font-size:11px; margin-top:-4px;">${location}</small>
            `;
            filesList.appendChild(item);
        });

        this.updateStatus(results.length);
    }
};

// 将FilesApp挂载到window对象，使其可从窗口访问
if (typeof window !== 'undefined') {
    window.FilesApp = FilesApp;
}
