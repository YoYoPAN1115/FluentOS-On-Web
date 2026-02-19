/**
 * 桌面模块
 */
const Desktop = {
    element: null,
    iconsContainer: null,
    wallpaperElement: null,
    contextMenu: null,
    selectedIcon: null,
    selectedIcons: [], // 多选图标数组
    
    // 框选相关
    isSelecting: false,
    justFinishedSelecting: false,
    selectionBox: null,
    selectionStart: { x: 0, y: 0 },

    // 可用的桌面应用
    apps: [
        { id: 'files', nameKey: 'files.title', icon: 'Theme/Icon/App_icon/files.png' },
        { id: 'settings', nameKey: 'settings.title', icon: 'Theme/Icon/App_icon/settings.png' },
        { id: 'calculator', nameKey: 'calculator.title', icon: 'Theme/Icon/App_icon/calculator.png' },
        { id: 'notes', nameKey: 'notes.title', icon: 'Theme/Icon/App_icon/notes.png' },
        { id: 'browser', nameKey: 'browser.title', icon: 'Theme/Icon/App_icon/browser.png' },
        { id: 'clock', nameKey: 'clock.title', icon: 'Theme/Icon/App_icon/system_clock.png' },
        { id: 'weather', nameKey: 'weather.title', icon: 'Theme/Icon/App_icon/weather.png' },
        { id: 'appshop', nameKey: 'appshop.title', icon: 'Theme/Icon/App_icon/app_gallery.png' },
        { id: 'photos', nameKey: 'photos.title', icon: 'Theme/Icon/App_icon/gallery.png' }
    ],

    getAppName(app) {
        return app.nameKey ? t(app.nameKey) : (app.name || app.id);
    },

    init() {
        this.element = document.getElementById('desktop-screen');
        this.iconsContainer = document.getElementById('desktop-icons');
        this.wallpaperElement = this.element.querySelector('.desktop-wallpaper');
        this.contextMenu = document.getElementById('desktop-context-menu');

        this.createSelectionBox();
        this.renderIcons();
        this.bindEvents();
        this.bindKeyboardEvents();
        this.bindDragDropEvents();
    },
    
    bindDragDropEvents() {
        // 桌面接收拖拽
        this.element.addEventListener('dragover', (e) => {
            // 忽略桌面图标、窗口等UI元素（只在空白区域接收）
            if (e.target.closest('.desktop-icon') || 
                e.target.closest('.window') ||
                e.target.closest('.taskbar') ||
                e.target.closest('.start-menu')) {
                return;
            }
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        
        this.element.addEventListener('drop', (e) => {
            // 忽略桌面图标、窗口等UI元素
            if (e.target.closest('.desktop-icon') || 
                e.target.closest('.window') ||
                e.target.closest('.taskbar') ||
                e.target.closest('.start-menu')) {
                return;
            }
            e.preventDefault();
            
            const fileData = e.dataTransfer.getData('application/fluent-file');
            if (!fileData) return;
            
            try {
                const data = JSON.parse(fileData);
                this.handleFileDrop(data);
            } catch (err) {
                console.error('[Desktop] 拖拽数据解析失败:', err);
            }
        });
    },
    
    handleFileDrop(data) {
        const { id, source } = data;
        const node = State.findNode(id);
        if (!node) return;
        
        const desktop = State.findNode('desktop');
        if (!desktop) return;
        
        // 如果已经在桌面，不需要移动
        const parent = State.findParentNode(id);
        if (parent && parent.id === 'desktop') return;
        
        // 从原位置移除
        if (parent && parent.children) {
            const idx = parent.children.findIndex(c => c.id === id);
            if (idx !== -1) {
                parent.children.splice(idx, 1);
            }
        }
        
        // 添加到桌面
        desktop.children = desktop.children || [];
        desktop.children.push(node);
        
        State.updateFS(State.fs);
        
        FluentUI.Toast({ title: '桌面', message: `已移动 "${node.name}" 到桌面`, type: 'success' });
    },
    
    createSelectionBox() {
        // 创建框选元素
        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'selection-box';
        this.selectionBox.style.cssText = `
            position: absolute;
            border: 2px solid rgba(0, 120, 212, 0.8);
            background: rgba(0, 120, 212, 0.1);
            pointer-events: none;
            display: none;
            z-index: 1000;
        `;
        this.element.appendChild(this.selectionBox);
    },

    show() {
        this.element.classList.remove('hidden');
        this.updateWallpaper();
    },

    hide() {
        this.element.classList.add('hidden');
    },

    updateWallpaper() {
        const wallpaper = State.settings.wallpaperDesktop;
        this.wallpaperElement.style.backgroundImage = `url('${wallpaper}')`;
        // 检测壁纸亮度并更新图标样式
        this.detectWallpaperBrightness(wallpaper);
    },
    
    // 检测壁纸亮度
    detectWallpaperBrightness(wallpaperUrl) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            // 采样图标区域（左上角）
            const sampleWidth = Math.min(300, img.width);
            const sampleHeight = Math.min(600, img.height);
            canvas.width = sampleWidth;
            canvas.height = sampleHeight;
            ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight, 0, 0, sampleWidth, sampleHeight);
            
            try {
                const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
                const data = imageData.data;
                let totalBrightness = 0;
                const pixelCount = data.length / 4;
                
                for (let i = 0; i < data.length; i += 4) {
                    // 计算亮度 (使用感知亮度公式)
                    const brightness = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
                    totalBrightness += brightness;
                }
                
                const avgBrightness = totalBrightness / pixelCount;
                // 亮度阈值 128 (0-255)
                const isLight = avgBrightness > 128;
                
                if (isLight) {
                    this.iconsContainer.classList.add('light-wallpaper');
                    this.iconsContainer.classList.remove('dark-wallpaper');
                } else {
                    this.iconsContainer.classList.add('dark-wallpaper');
                    this.iconsContainer.classList.remove('light-wallpaper');
                }
            } catch (e) {
                // 跨域图片无法读取像素，默认添加阴影
                this.iconsContainer.classList.add('light-wallpaper');
            }
        };
        img.onerror = () => {
            // 加载失败，默认添加阴影
            this.iconsContainer.classList.add('light-wallpaper');
        };
        img.src = wallpaperUrl;
    },

    // 获取桌面图标（使用彩色图标）
    getDesktopIcon(node) {
        if (node.type === 'folder') {
            return 'Theme/Icon/Symbol_icon/colour/Folder.svg';
        }
        // 根据文件扩展名选择彩色图标
        const ext = node.name.split('.').pop().toLowerCase();
        const colourIcons = {
            'txt': 'Theme/Icon/Symbol_icon/colour/txt.svg',
            'doc': 'Theme/Icon/Symbol_icon/colour/word.svg',
            'docx': 'Theme/Icon/Symbol_icon/colour/word.svg',
            'xls': 'Theme/Icon/Symbol_icon/colour/excel.svg',
            'xlsx': 'Theme/Icon/Symbol_icon/colour/excel.svg',
            'ppt': 'Theme/Icon/Symbol_icon/colour/ppt.svg',
            'pptx': 'Theme/Icon/Symbol_icon/colour/ppt.svg'
        };
        return colourIcons[ext] || 'Theme/Icon/Symbol_icon/fill/File.svg';
    },

    renderIcons() {
        this.iconsContainer.innerHTML = '';
        const desktop = State.findNode('desktop');
        const children = (desktop && desktop.children) ? desktop.children : [];
        // 6 行一列，超出换到下一列
        const maxRows = 6;
        const columnGap = 24;
        const rowGap = 12;
        let column = 0;
        let row = 0;
        this.iconsContainer.style.display = 'block';
        this.iconsContainer.style.position = 'absolute';
        this.iconsContainer.querySelectorAll('.desktop-icon').forEach(e => e.remove());

        children.forEach((node, index) => {
            const el = document.createElement('div');
            el.className = 'desktop-icon';
            el.dataset.nodeId = node.id;
            el.draggable = true;
            const icon = this.getDesktopIcon(node);
            el.innerHTML = `<img src="${icon}" alt="${node.name}"><span>${node.name}</span>`;
            // 计算位置
            const x = 20 + column * (100 + columnGap);
            const y = 20 + row * (100 + rowGap);
            el.style.position = 'absolute';
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            
            // 拖拽事件
            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', node.id);
                e.dataTransfer.setData('application/fluent-file', JSON.stringify({
                    id: node.id,
                    name: node.name,
                    type: node.type,
                    source: 'desktop'
                }));
                el.classList.add('dragging');
            });
            
            el.addEventListener('dragend', () => {
                el.classList.remove('dragging');
            });
            
            this.iconsContainer.appendChild(el);
            row++;
            if (row >= maxRows) { row = 0; column++; }
        });
    },

    bindEvents() {
        // 鼠标按下开始框选
        this.element.addEventListener('mousedown', (e) => {
            // 检查是否在UI元素上
            if (e.target.closest('.window') || 
                e.target.closest('.taskbar') || 
                e.target.closest('.start-menu') ||
                e.target.closest('.control-center') ||
                e.target.closest('.notification-center') ||
                e.target.closest('#fingo-panel') ||
                e.target.closest('.desktop-icon')) {
                return;
            }
            
            // 开始框选
            this.isSelecting = true;
            this.selectionStart = { x: e.clientX, y: e.clientY };
            this.selectionBox.style.left = e.clientX + 'px';
            this.selectionBox.style.top = e.clientY + 'px';
            this.selectionBox.style.width = '0px';
            this.selectionBox.style.height = '0px';
            this.selectionBox.style.display = 'block';
            
            // 不自动取消选择，保持之前的选择状态
            // if (!e.ctrlKey) {
            //     this.deselectAll();
            // }
        });
        
        // 鼠标移动更新框选区域
        this.element.addEventListener('mousemove', (e) => {
            if (!this.isSelecting) return;
            
            const currentX = e.clientX;
            const currentY = e.clientY;
            const startX = this.selectionStart.x;
            const startY = this.selectionStart.y;
            
            const left = Math.min(startX, currentX);
            const top = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);
            
            this.selectionBox.style.left = left + 'px';
            this.selectionBox.style.top = top + 'px';
            this.selectionBox.style.width = width + 'px';
            this.selectionBox.style.height = height + 'px';
            
            // 检测框选范围内的图标
            this.updateSelection();
        });
        
        // 鼠标松开结束框选（绑定到 document 确保总能捕获）
        document.addEventListener('mouseup', () => {
            if (this.isSelecting) {
                // 标记刚完成框选，防止 click 事件取消选择
                this.justFinishedSelecting = true;
                this.isSelecting = false;
                this.selectionBox.style.display = 'none';
                
                // 延迟重置标记（给用户足够时间）
                setTimeout(() => {
                    this.justFinishedSelecting = false;
                }, 100);
            }
        });
        
        // 点击图标
        this.iconsContainer.addEventListener('click', (e) => {
            // 如果刚完成框选，不处理点击事件
            if (this.justFinishedSelecting) {
                return;
            }
            
            const icon = e.target.closest('.desktop-icon');
            if (icon) {
                if (e.ctrlKey) {
                    // Ctrl+点击：切换选择
                    this.toggleIconSelection(icon);
                } else {
                    // 单击：单选
                    this.deselectAll();
                    this.selectIcon(icon);
                }
            } else if (!this.isSelecting && !this.justFinishedSelecting) {
                // 只有在非框选且非刚完成框选时才取消选择
                this.deselectAll();
            }
        });

        // 双击打开应用
        this.iconsContainer.addEventListener('dblclick', (e) => {
            const icon = e.target.closest('.desktop-icon');
            if (icon) {
                const nodeId = icon.dataset.nodeId;
                const node = State.findNode(nodeId);
                if (!node) return;
                if (node.type === 'folder') {
                    WindowManager.openApp('files');
                    // 延时导航到该文件夹
                    setTimeout(() => {
                        if (typeof FilesApp !== 'undefined') {
                            FilesApp.navigateToId(nodeId);
                        }
                    }, 0);
                } else if (node.type === 'file') {
                    if (typeof NotesApp !== 'undefined' && NotesApp.openWithContent) {
                        NotesApp.openWithContent(node.name, node.content || '');
                    } else {
                        WindowManager.openApp('notes');
                        setTimeout(() => {
                            if (typeof NotesApp !== 'undefined' && NotesApp.setDocument) {
                                NotesApp.setDocument(node.name, node.content || '');
                            }
                        }, 0);
                    }
                }
            }
        });

        // 桌面右键菜单（仅在桌面空白区域）
        this.element.addEventListener('contextmenu', (e) => {
            // 检查是否在窗口、任务栏或其他UI元素上右键
            if (e.target.closest('.window') || 
                e.target.closest('.taskbar') || 
                e.target.closest('.start-menu') ||
                e.target.closest('.control-center') ||
                e.target.closest('.notification-center') ||
                e.target.closest('#fingo-panel') ||
                e.target.closest('.desktop-icon')) {
                return; // 不阻止默认行为，让其他元素处理
            }
            
            // 只在桌面空白区域显示右键菜单
            e.preventDefault();
            this.showContextMenu(e.clientX, e.clientY);
        });

        // 关闭右键菜单
        document.addEventListener('click', () => {
            this.contextMenu.classList.add('hidden');
        });

        // 文件系统变化时同步桌面图标
        State.on('fsChange', () => this.renderIcons());

        // 桌面图标右键（与文件App一致）
        this.iconsContainer.addEventListener('contextmenu', (e) => {
            const icon = e.target.closest('.desktop-icon');
            if (!icon) return; // 空白区域用已有菜单
            e.preventDefault();
            const nodeId = icon.dataset.nodeId;
            this.contextTargetId = nodeId;
            this.showDesktopItemMenu(e.clientX, e.clientY, nodeId);
        });

        // 右键菜单项点击
        this.contextMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (item) {
                const action = item.dataset.action;
                this.handleContextMenuAction(action);
            }
        });
    },

    selectIcon(icon) {
        icon.classList.add('selected');
        if (!this.selectedIcons.includes(icon)) {
            this.selectedIcons.push(icon);
        }
        this.selectedIcon = icon;
    },
    
    toggleIconSelection(icon) {
        if (icon.classList.contains('selected')) {
            icon.classList.remove('selected');
            this.selectedIcons = this.selectedIcons.filter(i => i !== icon);
        } else {
            this.selectIcon(icon);
        }
    },
    
    updateSelection() {
        // 获取框选区域
        const boxRect = this.selectionBox.getBoundingClientRect();
        
        // 检查所有图标
        const icons = this.iconsContainer.querySelectorAll('.desktop-icon');
        icons.forEach(icon => {
            const iconRect = icon.getBoundingClientRect();
            
            // 检测碰撞
            const isIntersecting = !(
                iconRect.right < boxRect.left ||
                iconRect.left > boxRect.right ||
                iconRect.bottom < boxRect.top ||
                iconRect.top > boxRect.bottom
            );
            
            if (isIntersecting) {
                if (!icon.classList.contains('selected')) {
                    this.selectIcon(icon);
                }
            }
        });
    },

    deselectAll() {
        this.iconsContainer.querySelectorAll('.desktop-icon').forEach(icon => {
            icon.classList.remove('selected');
        });
        this.selectedIcons = [];
        this.selectedIcon = null;
    },
    
    bindKeyboardEvents() {
        // 监听键盘Delete键
        document.addEventListener('keydown', (e) => {
            // 只在桌面激活且没有窗口焦点时响应
            if (e.key === 'Delete' && this.selectedIcons.length > 0) {
                // 检查是否有窗口打开
                const hasActiveWindow = document.querySelector('.window:not(.minimized)');
                if (hasActiveWindow) return; // 有窗口打开时不响应
                
                e.preventDefault();
                this.deleteSelectedIcons();
            }
        });
    },
    
    deleteSelectedIcons() {
        if (this.selectedIcons.length === 0) return;
        
        const desktop = State.findNode('desktop');
        if (!desktop || !desktop.children) {
            console.error('[Desktop] desktop 节点不存在或无 children');
            return;
        }
        
        const recycle = State.findNode('recycle');
        if (!recycle) {
            console.error('[Desktop] recycle 节点不存在');
            return;
        }
        
        const count = this.selectedIcons.length;
        
        // 移动所有选中的图标到回收站
        this.selectedIcons.forEach(icon => {
            const nodeId = icon.dataset.nodeId;
            const node = State.findNode(nodeId);
            if (!node) return;
            
            // 从桌面移除
            const idx = desktop.children.findIndex(c => c.id === nodeId);
            if (idx !== -1) {
                const removedNode = desktop.children.splice(idx, 1)[0];
                removedNode._recycle = { originalParentId: desktop.id };
                
                // 添加到回收站
                recycle.children = recycle.children || [];
                recycle.children.unshift(removedNode);
            }
        });
        
        // 更新文件系统
        State.updateFS(State.fs);
        
        // 清除选择
        this.deselectAll();
        
        // 显示通知
        State.addNotification({
            title: '桌面',
            message: `已删除 ${count} 个项目`,
            type: 'info'
        });
    },

    openApp(appId) {
        // 通过 WindowManager 打开应用窗口
        WindowManager.openApp(appId);
    },

    showContextMenu(x, y) {
        // 构建菜单：刷新、新建文件夹、新建文本、个性化
        this.contextMenu.innerHTML = `
                <div class="context-menu-item" data-action="refresh">
                    <img src="Theme/Icon/Symbol_icon/stroke/Refresh.svg" alt="">
                    <span>${t('desktop.menu.refresh')}</span>
                </div>
                <div class="context-menu-separator"></div>
                <div class="context-menu-item" data-action="new-folder">
                    <img src="Theme/Icon/Symbol_icon/stroke/Folder.svg" alt="">
                    <span>${t('desktop.menu.new-folder')}</span>
                </div>
                <div class="context-menu-item" data-action="new-text">
                    <img src="Theme/Icon/Symbol_icon/stroke/File.svg" alt="">
                    <span>${t('desktop.menu.new-text')}</span>
                </div>
                <div class="context-menu-separator"></div>
                <div class="context-menu-item" data-action="personalize">
                    <img src="Theme/Icon/Symbol_icon/stroke/Color Picker.svg" alt="">
                    <span>${t('desktop.menu.personalize')}</span>
                </div>`;

        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        this.contextMenu.classList.remove('hidden');
    },

    showDesktopItemMenu(x, y, nodeId) {
        const node = State.findNode(nodeId);
        if (!node) return;
        
        // 判断是否多选
        const isMultiSelect = this.selectedIcons.length > 1;
        const disabledClass = isMultiSelect ? ' disabled' : '';
        
        // 多选时只有删除可用，其他选项禁用
        this.contextMenu.innerHTML = `
            <div class="context-menu-item${disabledClass}" data-action="rename">
                <img src="Theme/Icon/Symbol_icon/stroke/Edit.svg" alt="">
                <span>${t('desktop.menu.rename')}</span>
            </div>
            <div class="context-menu-item" data-action="delete">
                <img src="Theme/Icon/Symbol_icon/stroke/Trash.svg" alt="">
                <span>${t('desktop.menu.delete')}${isMultiSelect ? ` (${this.selectedIcons.length})` : ''}</span>
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item${disabledClass}" data-action="properties">
                <img src="Theme/Icon/Symbol_icon/stroke/Information Circle.svg" alt="">
                <span>${t('desktop.menu.properties')}</span>
            </div>`;
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        this.contextMenu.classList.remove('hidden');
    },

    handleContextMenuAction(action) {
        switch (action) {
            case 'refresh':
                this.renderIcons();
                State.addNotification({
                    title: t('desktop.menu.refresh'),
                    message: t('desktop.refreshed'),
                    type: 'info'
                });
                break;
            case 'new-folder': {
                const desktop = State.findNode('desktop');
                if (!desktop) break;
                const name = this.generateUniqueName(desktop, t('desktop.new-folder-name'));
                desktop.children = desktop.children || [];
                desktop.children.push({ id: `folder-${Date.now()}`, name, type: 'folder', children: [], created: new Date().toISOString(), modified: new Date().toISOString() });
                State.updateFS(State.fs);
                break;
            }
            case 'new-text': {
                const desktop = State.findNode('desktop');
                if (!desktop) break;
                const name = this.generateUniqueName(desktop, t('desktop.new-text-name'), '.txt');
                desktop.children = desktop.children || [];
                desktop.children.push({ id: `file-${Date.now()}`, name, type: 'file', content: '', size: 0, created: new Date().toISOString(), modified: new Date().toISOString() });
                State.updateFS(State.fs);
                break;
            }
            case 'personalize':
                this.openApp('settings');
                break;
            case 'rename': {
                const id = this.contextTargetId;
                const node = id && State.findNode(id);
                if (!node) break;
                FluentUI.InputDialog({
                    title: '重命名',
                    placeholder: '输入新名称',
                    defaultValue: node.name,
                    validateFn: (value) => {
                        if (!value) return '名称不能为空';
                        if (value.includes('/') || value.includes('\\')) return '名称不能包含 / 或 \\';
                        return true;
                    },
                    onConfirm: (newName) => {
                        node.name = newName;
                        node.modified = new Date().toISOString();
                        State.updateFS(State.fs);
                        FluentUI.Toast({ title: '重命名', message: `已重命名为 "${newName}"`, type: 'success' });
                    }
                });
                break;
            }
            case 'delete': {
                // 多选时删除所有选中的文件
                if (this.selectedIcons.length > 1) {
                    this.deleteSelectedIcons();
                    break;
                }
                // 单选时删除单个文件
                const id = this.contextTargetId;
                if (!id) break;
                // 移动到回收站
                const desktop = State.findNode('desktop');
                if (!desktop || !desktop.children) break;
                const idx = desktop.children.findIndex(c => c.id === id);
                if (idx === -1) break;
                const node = desktop.children.splice(idx, 1)[0];
                node._recycle = { originalParentId: 'desktop' };
                const recycle = State.findNode('recycle');
                if (!recycle) break;
                recycle.children = recycle.children || [];
                recycle.children.unshift(node);
                State.updateFS(State.fs);
                this.deselectAll();
                break;
            }
            case 'properties': {
                const id = this.contextTargetId;
                const node = id && State.findNode(id);
                if (!node) break;
                const typeMap = { folder: '文件夹', file: '文件' };
                const sizeStr = node.size ? (node.size > 1024 ? `${(node.size / 1024).toFixed(2)} KB` : `${node.size} B`) : '0 B';
                const content = `
                    <div style="display: flex; flex-direction: column; gap: 12px; font-size: 14px;">
                        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-secondary);">名称</span><span>${node.name}</span></div>
                        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-secondary);">类型</span><span>${typeMap[node.type] || node.type}</span></div>
                        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-secondary);">大小</span><span>${sizeStr}</span></div>
                        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-secondary);">创建时间</span><span>${node.created ? new Date(node.created).toLocaleString() : '-'}</span></div>
                        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-secondary);">修改时间</span><span>${node.modified ? new Date(node.modified).toLocaleString() : '-'}</span></div>
                    </div>
                `;
                FluentUI.Dialog({
                    title: '属性',
                    content: content,
                    type: 'info',
                    buttons: [{ text: '确定', variant: 'primary' }]
                });
                break;
            }
        }
    },

    generateUniqueName(parentNode, base, ext = '') {
        const exists = (name) => (parentNode.children || []).some(n => n.name === name + ext);
        if (!exists(base)) return base + ext;
        let i = 2;
        while (exists(`${base} (${i})`)) i++;
        return `${base} (${i})${ext}`;
    }
};

