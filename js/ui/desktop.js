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
    contextSelectionIds: [],
    _appShortcutDeleteDialog: null,
    
    // 框选相关
    isSelecting: false,
    justFinishedSelecting: false,
    selectionBox: null,
    selectionStart: { x: 0, y: 0 },

    // 可用的桌面应用
    apps: [
        { id: 'files', nameKey: 'files.title', icon: 'Theme/Icon/App_icon/files.png' },
        { id: 'settings', nameKey: 'settings.title', icon: 'Theme/Icon/App_icon/settings.png' },
        { id: 'process-manager', nameKey: 'processManager.title', icon: 'Theme/Icon/App_icon/Taskmgr.png', isNative: true, isPWA: false },
        { id: 'terminal', nameKey: 'terminal.title', icon: 'Theme/Icon/App_icon/terminal.png', isNative: true, isPWA: false },
        { id: 'tips', nameKey: 'tips.title', icon: 'Theme/Icon/App_icon/tips.png', isNative: true, isPWA: false },
        { id: 'calculator', nameKey: 'calculator.title', icon: 'Theme/Icon/App_icon/calculator.png' },
        { id: 'notes', nameKey: 'notes.title', icon: 'Theme/Icon/App_icon/notes.png' },
        { id: 'browser', nameKey: 'browser.title', icon: 'Theme/Icon/App_icon/browser.png' },
        { id: 'clock', nameKey: 'clock.title', icon: 'Theme/Icon/App_icon/clock.png' },
        { id: 'weather', nameKey: 'weather.title', icon: 'Theme/Icon/App_icon/weather.png' },
        { id: 'appshop', nameKey: 'appshop.title', icon: 'Theme/Icon/App_icon/app_gallery.png' },
        { id: 'camera', nameKey: 'camera.title', icon: 'Theme/Icon/App_icon/camera.png', isNative: true, isPWA: false },
        { id: 'photos', nameKey: 'photos.title', icon: 'Theme/Icon/App_icon/photos.png', isNative: true, isPWA: false },
        { id: 'media', nameKey: 'media.title', icon: 'Theme/Icon/App_icon/media.png', isNative: true, isPWA: false }
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

        State.on('appRepairStart', (appId) => this.updateAppRepairState(appId, true));
        State.on('appRepairEnd', (appId) => this.updateAppRepairState(appId, false));
    },

    updateAppRepairState(appId, isRepairing) {
        if (!this.iconsContainer) return;
        this.iconsContainer.querySelectorAll(`.desktop-icon[data-app-id="${appId}"]`).forEach(icon => {
            icon.classList.toggle('repairing', isRepairing);
            icon.setAttribute('aria-disabled', isRepairing ? 'true' : 'false');
        });
    },

    setFileDragImage(dataTransfer, node, count = 1, sourceImage = null, clientX = 0, clientY = 0) {
        if (!dataTransfer || typeof dataTransfer.setDragImage !== 'function' || !node) return;
        const ghost = document.createElement('div');
        ghost.className = 'taskbar-drag-ghost desktop-native-drag-ghost';
        ghost.style.left = `${Number(clientX) || 0}px`;
        ghost.style.top = `${Number(clientY) || 0}px`;

        const image = sourceImage?.cloneNode(false) || document.createElement('img');
        image.src = sourceImage?.currentSrc || sourceImage?.src || this.getDesktopIcon(node);
        image.alt = '';
        ghost.appendChild(image);

        if (count > 1) {
            const badge = document.createElement('span');
            badge.textContent = String(count);
            ghost.appendChild(badge);
        }

        document.body.appendChild(ghost);
        // Chromium only captures a DOM drag image reliably while it is rendered
        // in the viewport. This mirrors the Start-menu App drag ghost and keeps
        // the actual file/folder/App artwork visible.
        ghost.getBoundingClientRect();
        dataTransfer.setDragImage(ghost, 26, 26);
        setTimeout(() => ghost.remove(), 0);
    },

    getSelectedIconElements() {
        if (!this.iconsContainer) return [];
        const selected = Array.from(this.iconsContainer.querySelectorAll('.desktop-icon.selected'));
        this.selectedIcons = selected;
        this.selectedIcon = selected[selected.length - 1] || null;
        return selected;
    },
    
    bindDragDropEvents() {
        const getTargetEl = (e) => (e && e.target instanceof Element) ? e.target : null;
        const hasFluentPayload = (dataTransfer) => {
            if (!dataTransfer || !dataTransfer.types) return false;
            const types = Array.from(dataTransfer.types).map((v) => String(v || ''));
            return types.includes('application/fluent-file');
        };
        const getExternalFiles = (dataTransfer) => {
            const files = dataTransfer && dataTransfer.files;
            if (files && files.length > 0) return files;
            const items = dataTransfer && dataTransfer.items;
            if (items && items.length > 0) {
                const out = [];
                for (const it of Array.from(items)) {
                    if (it && it.kind === 'file') {
                        const f = it.getAsFile && it.getAsFile();
                        if (f) out.push(f);
                    }
                }
                return out.length ? out : null;
            }
            return null;
        };
        const hasOsFiles = (dataTransfer) => {
            const typeList = Array.from((dataTransfer && dataTransfer.types) || []).map((v) => String(v || ''));
            return typeList.some((tp) => tp.toLowerCase().includes('file')) || !!getExternalFiles(dataTransfer);
        };

        // 桌面接收拖拽
        this.element.addEventListener('dragover', (e) => {
            const targetEl = getTargetEl(e);
            if (targetEl?.closest('.window') ||
                targetEl?.closest('.taskbar') ||
                targetEl?.closest('.start-menu')) {
                return;
            }

            const internal = hasFluentPayload(e.dataTransfer);
            const externalEnabled = !!(window.FileImport && typeof FileImport.enabled === 'function' && FileImport.enabled());
            const hasExternalFiles = externalEnabled && hasOsFiles(e.dataTransfer);
            const treatAsExternalCandidate = externalEnabled && !internal;

            // External drag candidate: allow drop on desktop blank area or folder icons.
            if (hasExternalFiles || treatAsExternalCandidate) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'copy';
                this.element.classList.add('drag-over');
                return;
            }

            // Internal fluent drag: only treat desktop blank area as move target.
            // 正在被拖动的图标自身不算遮挡（允许就近落回）。
            const hoverIcon = targetEl?.closest('.desktop-icon');
            if (hoverIcon && !hoverIcon.classList.contains('dragging')) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        
        this.element.addEventListener('dragleave', (e) => {
            if (!this.element.contains(e.relatedTarget)) {
                this.element.classList.remove('drag-over');
            }
        });

        this.element.addEventListener('drop', (e) => {
            const targetEl = getTargetEl(e);
            if (targetEl?.closest('.window') ||
                targetEl?.closest('.taskbar') ||
                targetEl?.closest('.start-menu')) {
                return;
            }

            // Lab: external file import from OS
            const internal = hasFluentPayload(e.dataTransfer);
            const externalEnabled = !!(window.FileImport && typeof FileImport.enabled === 'function' && FileImport.enabled());
            if (externalEnabled && !internal) {
                const externalFiles = getExternalFiles(e.dataTransfer);
                this.element.classList.remove('drag-over');
                if (!externalFiles || externalFiles.length === 0) return;
                e.preventDefault();
                e.stopPropagation();
                const targetIcon = targetEl?.closest('.desktop-icon');
                const targetNodeId = targetIcon?.dataset?.nodeId || '';
                const targetNode = targetNodeId ? State.findNode(targetNodeId) : null;
                const destFolderId = (targetNode && targetNode.type === 'folder') ? targetNode.id : 'desktop';
                FileImport.importToFolder(destFolderId, externalFiles);
                return;
            }

            // Ignore internal drops onto icon targets (the dragged icon itself doesn't count).
            const dropIcon = targetEl?.closest('.desktop-icon');
            if (dropIcon && !dropIcon.classList.contains('dragging')) return;

            e.preventDefault();
            this.element.classList.remove('drag-over');
            
            const fileData = e.dataTransfer.getData('application/fluent-file');
            if (!fileData) return;
            
            try {
                const data = JSON.parse(fileData);
                this.handleFileDrop(data, e.clientX, e.clientY);
            } catch (err) {
                console.error('[Desktop] 拖拽数据解析失败:', err);
            }
        });
    },
    
    handleFileDrop(data, dropX, dropY) {
        const ids = Array.isArray(data?.ids) ? data.ids : [data?.id];
        const dragIds = [...new Set(ids.filter(id => typeof id === 'string' && id))];
        if (dragIds.length === 0) return;
        
        const desktop = State.findNode('desktop');
        if (!desktop) return;

        let movedCount = 0;
        let firstMovedName = '';
        desktop.children = desktop.children || [];
        const droppedIds = [];

        dragIds.forEach((id) => {
            const node = State.findNode(id);
            if (!node) return;

            const parent = State.findParentNode(id);
            // 已经在桌面：仅按落点重新摆放
            if (parent && parent.id === 'desktop') {
                droppedIds.push(id);
                return;
            }
            if (!parent) return;

            // 从原位置移除
            const idx = parent.children ? parent.children.findIndex(c => c.id === id) : -1;
            if (idx === -1) return;
            parent.children.splice(idx, 1);

            // 添加到桌面
            desktop.children.push(node);
            droppedIds.push(id);
            movedCount++;
            if (!firstMovedName) firstMovedName = node.name;
        });

        // 按拖放落点把图标吸附到共用网格的格子上
        if (typeof dropX === 'number' && typeof dropY === 'number' && droppedIds.length > 0) {
            this._placeIconsAt(droppedIds, dropX, dropY);
        }

        if (movedCount > 0) {
            State.updateFS(State.fs); // 触发 fsChange → renderIcons
            const message = movedCount === 1
                ? `已移动 "${firstMovedName}" 到桌面`
                : `已移动 ${movedCount} 个项目到桌面`;
            FluentUI.Toast({ title: t('files.desktop'), message, type: 'success' });
        } else if (droppedIds.length > 0) {
            this.renderIcons();
        }
    },

    /** 把一组桌面图标放到落点所在的网格格子上（被占用时吸附到最近空格） */
    _placeIconsAt(ids, x, y) {
        const grid = this._desktopGrid();
        const posMap = this._getIconPosMap();
        const occupied = new Set(grid.occupied);
        // 其他图标当前占用的格子（被拖动的除外）
        if (this._iconCells) {
            this._iconCells.forEach((cell, id) => {
                if (!ids.includes(id)) occupied.add(`${cell.col},${cell.row}`);
            });
        }
        const baseCol = Math.min(Math.max(Math.round((x - grid.marginX - grid.cell / 2) / grid.pitch), 0), grid.cols - 1);
        const baseRow = Math.min(Math.max(Math.round((y - grid.marginTop - grid.cell / 2) / grid.pitch), 0), grid.rows - 1);

        ids.forEach((id, i) => {
            let cell;
            if (i === 0 && !occupied.has(`${baseCol},${baseRow}`)) {
                cell = { col: baseCol, row: baseRow };
            } else {
                cell = this._findFreeCell(grid, occupied, baseCol, baseRow);
            }
            posMap[id] = cell;
            occupied.add(`${cell.col},${cell.row}`);
        });
        this._saveIconPosMap(posMap);
    },
    
    createSelectionBox() {
        // 创建框选元素
        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'selection-box';
        this.selectionBox.style.cssText = `
            position: absolute;
            border: 2px solid rgba(var(--accent-rgb, 0, 120, 212), 0.8);
            background: rgba(var(--accent-rgb, 0, 120, 212), 0.1);
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

    async updateWallpaper() {
        const wallpaperSetting = State.settings.wallpaperDesktop;
        const requestId = (this._wallpaperRequestId || 0) + 1;
        this._wallpaperRequestId = requestId;
        const wallpaper = typeof State.resolveWallpaper === 'function'
            ? await State.resolveWallpaper('desktop')
            : wallpaperSetting;
        if (this._wallpaperRequestId !== requestId) return;
        const applyWallpaper = () => {
            if (this._wallpaperRequestId !== requestId) return;
            if (this._currentWallpaper === wallpaper && !this._wallpaperTransitionLayer) return;
            const currentImage = this.wallpaperElement.style.backgroundImage;
            const nextImage = `url("${String(wallpaper).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`;
            const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

            if (!currentImage || currentImage === 'none' || reducedMotion) {
                this.wallpaperElement.style.backgroundImage = nextImage;
                this._currentWallpaper = wallpaper;
                return;
            }

            const previousLayer = this._wallpaperTransitionLayer;
            if (previousLayer) {
                this.wallpaperElement.style.backgroundImage = previousLayer.style.backgroundImage;
                previousLayer.remove();
            }

            const layer = document.createElement('div');
            layer.className = 'desktop-wallpaper desktop-wallpaper-fade-layer';
            layer.style.backgroundImage = nextImage;
            this._wallpaperTransitionLayer = layer;
            this.wallpaperElement.insertAdjacentElement('afterend', layer);

            const finish = () => {
                if (this._wallpaperTransitionLayer !== layer) return;
                this.wallpaperElement.style.backgroundImage = nextImage;
                this._currentWallpaper = wallpaper;
                this._wallpaperTransitionLayer = null;
                layer.remove();
            };
            const fade = layer.animate(
                [{ opacity: 0 }, { opacity: 1 }],
                { duration: 460, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
            );
            fade.finished.catch(() => {}).then(finish);
            setTimeout(finish, 560);
        };

        const image = new Image();
        image.onload = applyWallpaper;
        image.onerror = applyWallpaper;
        image.src = wallpaper;
        if (document.body && State.applyMaterialSetting) {
            State.applyMaterialSetting(wallpaper);
        }
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
        if (node.type === 'app') {
            const app = this.apps.find(a => a.id === node.appId);
            if (app) return app.icon;
            const cfg = (typeof WindowManager !== 'undefined' && WindowManager.appConfigs) ? WindowManager.appConfigs[node.appId] : null;
            return (cfg && cfg.icon) || 'Theme/Icon/App_icon/app_error.png';
        }
        if (node.type === 'folder') {
            return 'Theme/Icon/Symbol_icon/colour/Folder.svg';
        }
        // 根据文件扩展名选择彩色图标（不再依赖已移除的 Word 应用）
        const ext = node.name.split('.').pop().toLowerCase();
        const colourIcons = {
            'txt': 'Theme/Icon/Symbol_icon/colour/txt.svg',
            'xls': 'Theme/Icon/Symbol_icon/colour/excel.svg',
            'xlsx': 'Theme/Icon/Symbol_icon/colour/excel.svg',
            'ppt': 'Theme/Icon/Symbol_icon/colour/ppt.svg',
            'pptx': 'Theme/Icon/Symbol_icon/colour/ppt.svg'
        };
        return colourIcons[ext] || 'Theme/Icon/Symbol_icon/fill/File.svg';
    },

    getDesktopImagePreview(node) {
        if (!node || node.type !== 'file' || typeof FilesApp === 'undefined') return '';
        if (typeof FilesApp.isImageNode !== 'function' || !FilesApp.isImageNode(node)) return '';
        return typeof FilesApp.getImagePreviewSrc === 'function'
            ? FilesApp.getImagePreviewSrc(node)
            : String(node.thumb || '');
    },

    /**
     * 桌面网格：与小组件共用同一套（Widgets.GRID），
     * 并标记出被小组件占用的格子，图标布局时避开。
     */
    _desktopGrid() {
        const occupied = new Set();
        if (typeof Widgets !== 'undefined' && Widgets.layers && Widgets.layers.desktop) {
            const m = Widgets._metrics('desktop');
            Widgets.getLayout().desktop.forEach(inst => {
                const def = Widgets.registry.find(d => d.id === inst.widgetId);
                if (!def) return;
                for (let c = inst.col; c < inst.col + def.w; c++) {
                    for (let r = inst.row; r < inst.row + def.h; r++) {
                        occupied.add(`${c},${r}`);
                    }
                }
            });
            return { cols: m.cols, rows: m.rows, pitch: m.pitch, cell: m.cell, marginX: m.marginX, marginTop: m.marginTop, occupied };
        }
        // Widgets 尚未初始化时的后备网格（参数与 Widgets.GRID 一致）
        const cell = 76, gap = 16, pitch = cell + gap, marginX = 28, marginTop = 28, marginBottom = 110;
        const cols = Math.max(1, Math.floor((window.innerWidth - marginX * 2 + gap) / pitch));
        const rows = Math.max(1, Math.floor((window.innerHeight - marginTop - marginBottom + gap) / pitch));
        return { cols, rows, pitch, cell, marginX, marginTop, occupied };
    },

    /** 用户拖动过的图标位置映射（nodeId → { col, row }），持久化在设置中 */
    _getIconPosMap() {
        const map = State.settings && State.settings.desktopIconPos;
        return (map && typeof map === 'object') ? { ...map } : {};
    },

    _saveIconPosMap(map) {
        State.updateSettings({ desktopIconPos: map });
    },

    /** 在网格中找离 (nearCol, nearRow) 最近的空格；网格已满时溢出到右侧网格外 */
    _findFreeCell(grid, occupied, nearCol, nearRow) {
        let best = null;
        let bestDist = Infinity;
        for (let c = 0; c < grid.cols; c++) {
            for (let r = 0; r < grid.rows; r++) {
                if (occupied.has(`${c},${r}`)) continue;
                const d = (c - nearCol) * (c - nearCol) + (r - nearRow) * (r - nearRow);
                if (d < bestDist) { bestDist = d; best = { col: c, row: r }; }
            }
        }
        if (best) return best;
        let c = grid.cols, r = 0;
        while (occupied.has(`${c},${r}`)) {
            r++;
            if (r >= grid.rows) { r = 0; c++; }
        }
        return { col: c, row: r };
    },

    renderIcons() {
        this.iconsContainer.innerHTML = '';
        const desktop = State.findNode('desktop');
        const children = (desktop && desktop.children) ? desktop.children : [];
        this.iconsContainer.style.display = 'block';
        this.iconsContainer.style.position = 'absolute';
        this.iconsContainer.querySelectorAll('.desktop-icon').forEach(e => e.remove());

        // 与小组件共用桌面网格
        const grid = this._desktopGrid();
        const ICON_SIZE = 90; // .desktop-icon 的固定尺寸，在格子（pitch）内居中
        const iconOffset = (grid.cell - ICON_SIZE) / 2;
        const posMap = this._getIconPosMap();
        const occupied = new Set(grid.occupied);
        const cells = new Map(); // nodeId → { col, row }
        let posChanged = false;

        // 清理已不在桌面上的残留位置记录
        const childIds = new Set(children.map(n => n.id));
        Object.keys(posMap).forEach(id => {
            if (!childIds.has(id)) { delete posMap[id]; posChanged = true; }
        });

        // 第一遍：用户拖动过的图标使用记忆位置；越界或被小组件占用时挪到最近空格
        children.forEach(node => {
            const p = posMap[node.id];
            if (!p) return;
            let { col, row } = p;
            if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows || occupied.has(`${col},${row}`)) {
                const free = this._findFreeCell(grid, occupied, col, row);
                col = free.col; row = free.row;
                posMap[node.id] = { col, row };
                posChanged = true;
            }
            cells.set(node.id, { col, row });
            occupied.add(`${col},${row}`);
        });

        // 第二遍：其余图标按「先列后行」流式填充剩余空格
        let column = 0;
        let row = 0;
        const advance = () => {
            row++;
            if (row >= grid.rows) { row = 0; column++; }
        };
        children.forEach(node => {
            if (cells.has(node.id)) return;
            while (occupied.has(`${column},${row}`)) advance();
            cells.set(node.id, { col: column, row });
            occupied.add(`${column},${row}`);
            advance();
        });

        if (posChanged) this._saveIconPosMap(posMap);
        this._iconCells = cells;

        children.forEach((node, index) => {
            const cell = cells.get(node.id);

            const el = document.createElement('div');
            el.className = 'desktop-icon';
            el.dataset.nodeId = node.id;
            if (node.type === 'app') {
                el.dataset.appId = node.appId;
                const repairing = typeof SettingsApp !== 'undefined' && SettingsApp.isAppRepairing(node.appId);
                el.classList.toggle('repairing', repairing);
                el.setAttribute('aria-disabled', repairing ? 'true' : 'false');
            }
            el.draggable = true;
            const imagePreview = this.getDesktopImagePreview(node);
            const icon = imagePreview || this.getDesktopIcon(node);
            el.innerHTML = `<img${imagePreview ? ' class="desktop-icon-image-preview"' : ''} src="${icon}" alt="${node.name}"><span>${node.name}</span>`;
            // 计算位置：图标居中放在所属格子上
            const x = grid.marginX + cell.col * grid.pitch + iconOffset;
            const y = grid.marginTop + cell.row * grid.pitch + iconOffset;
            el.style.position = 'absolute';
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            
            // 拖拽事件
            let draggingIds = [node.id];
            el.addEventListener('dragstart', (e) => {
                const multiSelectedIds = this.getSelectedIconElements()
                    .map(iconEl => iconEl.dataset.nodeId)
                    .filter(Boolean);
                const useMultiSelection = el.classList.contains('selected') && multiSelectedIds.length > 1;
                draggingIds = useMultiSelection ? [...new Set(multiSelectedIds)] : [node.id];

                e.dataTransfer.setData('text/plain', draggingIds[0]);
                e.dataTransfer.setData('application/fluent-file', JSON.stringify({
                    id: node.id,
                    ids: draggingIds,
                    name: node.name,
                    type: node.type,
                    source: 'desktop'
                }));
                this.setFileDragImage(
                    e.dataTransfer,
                    node,
                    draggingIds.length,
                    el.querySelector('img'),
                    e.clientX,
                    e.clientY
                );
                draggingIds.forEach((id) => {
                    const iconEl = this.iconsContainer.querySelector(`.desktop-icon[data-node-id="${id}"]`);
                    if (iconEl) iconEl.classList.add('dragging');
                });
            });
            
            el.addEventListener('dragend', () => {
                draggingIds.forEach((id) => {
                    const iconEl = this.iconsContainer.querySelector(`.desktop-icon[data-node-id="${id}"]`);
                    if (iconEl) iconEl.classList.remove('dragging');
                });
                draggingIds = [node.id];
            });
            
            this.iconsContainer.appendChild(el);
        });
    },

    bindEvents() {
        // 鼠标按下开始框选
        this.element.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            // 检查是否在UI元素上
            if (e.target.closest('.window') || 
                e.target.closest('.taskbar') || 
                e.target.closest('.start-menu') ||
                e.target.closest('.control-center') ||
                e.target.closest('.notification-center') ||
                e.target.closest('#fingo-panel') ||
                e.target.closest('.widgets-layer') ||
                e.target.closest('.desktop-icon')) {
                return;
            }

            if (!e.ctrlKey) {
                this.deselectAll();
            }
            
            // 开始框选
            this.isSelecting = true;
            this.selectionStart = { x: e.clientX, y: e.clientY };
            this.selectionBox.style.left = e.clientX + 'px';
            this.selectionBox.style.top = e.clientY + 'px';
            this.selectionBox.style.width = '0px';
            this.selectionBox.style.height = '0px';
            this.selectionBox.style.display = 'block';
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
                if (node.type === 'app') {
                    // 应用快捷方式：直接打开对应 App
                    WindowManager.openApp(node.appId);
                    return;
                }
                if (node.type === 'folder') {
                    WindowManager.openApp('files');
                    // 延时导航到该文件夹
                    setTimeout(() => {
                        if (typeof FilesApp !== 'undefined') {
                            FilesApp.navigateToId(nodeId);
                        }
                    }, 0);
                } else if (node.type === 'file') {
                    if (typeof FilesApp !== 'undefined' && typeof FilesApp.openNodeWithDefaultApp === 'function') {
                        const opened = FilesApp.openNodeWithDefaultApp(node);
                        if (opened) return;
                    }
                    WindowManager.openApp('notes', { fileId: node.id });
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
                e.target.closest('.widgets-layer') ||
                e.target.closest('.desktop-icon')) {
                return; // 不阻止默认行为，让其他元素处理
            }
            
            // 只在桌面空白区域显示右键菜单
            e.preventDefault();
            this.contextSelectionIds = [];
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
            // 右键已有多选中的任意一项时保留整组选择；右键未选中的
            // 项目时则将它切换为唯一选择，行为与原生桌面一致。
            if (!icon.classList.contains('selected')) {
                this.deselectAll();
                this.selectIcon(icon);
            } else {
                this.getSelectedIconElements();
                this.selectedIcon = icon;
            }
            const nodeId = icon.dataset.nodeId;
            this.contextTargetId = nodeId;
            this.contextSelectionIds = this.getSelectedIconElements()
                .map((selected) => selected.dataset.nodeId)
                .filter(Boolean);
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

    selectAllIcons() {
        if (!this.iconsContainer) return;
        const icons = Array.from(this.iconsContainer.querySelectorAll('.desktop-icon'));
        if (icons.length === 0) return;
        this.deselectAll();
        icons.forEach((icon) => this.selectIcon(icon));
    },
    
    bindKeyboardEvents() {
        // 监听键盘Delete键
        document.addEventListener('keydown', (e) => {
            const target = e.target;
            const isEditableTarget = target && (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            );
            if (isEditableTarget) return;
            if (State.view !== 'desktop') return;

            // 只在桌面激活且系统当前没有活动窗口时响应。
            if (typeof WindowManager !== 'undefined' && WindowManager.activeWindowId) return;

            let key = String(e.key || '').toLowerCase();
            if ((!key || !/^[a-z]$/.test(key)) && /^Key[A-Z]$/.test(String(e.code || ''))) {
                key = String(e.code).slice(3).toLowerCase();
            }

            if (e.key === 'Delete') {
                if (this.getSelectedIconElements().length > 0) {
                    e.preventDefault();
                    this.deleteSelectedIcons();
                    return;
                }
            }

            if (e.ctrlKey && !e.altKey && !e.metaKey && key === 'a') {
                e.preventDefault();
                this.selectAllIcons();
            }
        });
    },
    
    async deleteSelectedIcons(ids = null) {
        const liveIds = this.getSelectedIconElements()
            .map((icon) => icon.dataset.nodeId)
            .filter(Boolean);
        const selectedIds = [...new Set(Array.isArray(ids) && ids.length ? ids : liveIds)];
        if (selectedIds.length === 0) return;
        if (selectedIds.length === 1) {
            const selectedNode = State.findNode(selectedIds[0]);
            if (selectedNode?.type === 'app') {
                this.confirmDeleteAppShortcut(selectedNode);
                return;
            }
        }
        if (typeof FilesApp !== 'undefined' && typeof FilesApp.ensureNodesCanBeDeleted === 'function') {
            if (!await FilesApp.ensureNodesCanBeDeleted(selectedIds)) return;
        }
        
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
        
        recycle.children = recycle.children || [];
        let count = 0;

        // 先快照全部 ID，再修改文件树，避免桌面重绘后 DOM 引用失效。
        selectedIds.forEach((nodeId) => {
            const idx = desktop.children.findIndex(c => c.id === nodeId);
            if (idx !== -1) {
                const removedNode = desktop.children.splice(idx, 1)[0];
                removedNode._recycle = { originalParentId: desktop.id };
                recycle.children.unshift(removedNode);
                count += 1;
            }
        });

        if (count === 0) return;
        this.selectedIcons = [];
        this.selectedIcon = null;

        // 更新文件系统
        State.updateFS(State.fs);
        
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

    /** 把 App 快捷方式固定到桌面（任务栏图标拖拽到桌面时调用） */
    addAppShortcut(appId) {
        const desktop = State.findNode('desktop');
        if (!desktop) return false;
        desktop.children = desktop.children || [];
        const app = this.apps.find(a => a.id === appId);
        const name = app ? this.getAppName(app) : appId;
        if (desktop.children.some(c => c.type === 'app' && c.appId === appId)) {
            if (window.FluentUI && FluentUI.Toast) {
                FluentUI.Toast({ title: t('desktop.shortcut.title'), message: t('desktop.shortcut.exists'), type: 'info' });
            }
            return false;
        }
        desktop.children.push({
            id: `app-${appId}-${Date.now()}`,
            name,
            type: 'app',
            appId,
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        });
        State.updateFS(State.fs);
        if (window.FluentUI && FluentUI.Toast) {
            FluentUI.Toast({ title: t('desktop.shortcut.title'), message: t('desktop.shortcut.added', { name }), type: 'success' });
        }
        return true;
    },

    /** 把桌面上的单个节点移入回收站 */
    async moveDesktopNodeToRecycle(nodeId) {
        const desktop = State.findNode('desktop');
        if (!desktop || !desktop.children) return false;
        if (typeof FilesApp !== 'undefined' && typeof FilesApp.ensureNodesCanBeDeleted === 'function') {
            if (!await FilesApp.ensureNodesCanBeDeleted([nodeId])) return false;
        }
        const idx = desktop.children.findIndex(c => c.id === nodeId);
        if (idx === -1) return false;
        const node = desktop.children.splice(idx, 1)[0];
        node._recycle = { originalParentId: 'desktop' };
        const recycle = State.findNode('recycle');
        if (!recycle) return false;
        recycle.children = recycle.children || [];
        recycle.children.unshift(node);
        State.updateFS(State.fs);
        return true;
    },

    /** 右键删除 App 快捷方式：系统全局弹窗选择「从桌面删除 / 卸载 / 取消」 */
    confirmDeleteAppShortcut(node) {
        if (!node || this._appShortcutDeleteDialog) return;
        const app = this.apps.find(a => a.id === node.appId);
        const name = app ? this.getAppName(app) : node.name;
        // 系统应用不可卸载（与开始菜单右键菜单的限制保持一致）
        const isSystemApp = (typeof StartMenu !== 'undefined' && Array.isArray(StartMenu.systemApps))
            ? StartMenu.systemApps.includes(node.appId) : false;
        const canUninstall = !isSystemApp && window.AppShop && typeof AppShop.uninstallApp === 'function';

        const buttons = [
            { text: t('cancel'), variant: 'secondary', value: 'cancel' },
            { text: t('desktop.appdel.remove'), variant: 'primary', value: 'remove' }
        ];
        if (canUninstall) {
            buttons.push({ text: t('desktop.appdel.uninstall'), variant: 'danger', value: 'uninstall' });
        }

        this._appShortcutDeleteDialog = FluentUI.Dialog({
            type: 'warning',
            title: t('desktop.appdel.title'),
            content: canUninstall
                ? t('desktop.appdel.content', { name })
                : t('desktop.appdel.content-sys', { name }),
            buttons,
            onClose: (result) => {
                this._appShortcutDeleteDialog = null;
                if (result === 'remove') {
                    // 仅从桌面移除：直接挪到回收站，无二次提示
                    this.moveDesktopNodeToRecycle(node.id);
                    this.deselectAll();
                } else if (result === 'uninstall') {
                    // 走系统既有的卸载弹窗流程（含运行中检测与确认）
                    AppShop.uninstallApp(node.appId);
                }
            }
        });
    },

    /** 卸载应用后清理桌面上对应的快捷方式（AppShop 卸载流程调用） */
    removeAppShortcut(appId) {
        const desktop = State.findNode('desktop');
        if (!desktop || !desktop.children) return;
        const before = desktop.children.length;
        desktop.children = desktop.children.filter(c => !(c.type === 'app' && c.appId === appId));
        if (desktop.children.length !== before) {
            State.updateFS(State.fs);
        }
    },

    /**
     * 根据菜单实际尺寸自适应定位：
     * 默认出现在鼠标右下角；右/下侧空间不足时翻转到左/上侧，避免被屏幕边缘吞掉。
     */
    positionContextMenu(x, y) {
        const menu = this.contextMenu;
        // 先显示出来才能测量真实尺寸
        menu.classList.remove('hidden');
        const margin = 8;
        const w = menu.offsetWidth;
        const h = menu.offsetHeight;
        let left = x;
        let top = y;
        if (x + w > window.innerWidth - margin) left = x - w;
        if (y + h > window.innerHeight - margin) top = y - h;
        left = Math.max(margin, Math.min(left, window.innerWidth - w - margin));
        top = Math.max(margin, Math.min(top, window.innerHeight - h - margin));
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
    },

    showContextMenu(x, y) {
        // 构建菜单：刷新、新建文件夹、新建文本、个性化
        const totalIcons = this.iconsContainer ? this.iconsContainer.querySelectorAll('.desktop-icon').length : 0;
        const allSelected = totalIcons > 0 && this.selectedIcons.length === totalIcons;
        const selectAction = allSelected ? 'deselect-all' : 'select-all';
        const selectLabel = allSelected ? t('desktop.menu.deselect-all') : t('desktop.menu.select-all');
        const externalEnabled = !!(window.FileImport && typeof FileImport.enabled === 'function' && FileImport.enabled());
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
                ${externalEnabled ? `
                <div class="context-menu-item" data-action="upload">
                    <img src="Theme/Icon/Symbol_icon/stroke/Upload.svg" alt="">
                    <span>${t('desktop.menu.upload')}</span>
                </div>` : ''}
                <div class="context-menu-item" data-action="${selectAction}">
                    <img src="Theme/Icon/Symbol_icon/stroke/Select Box.svg" alt="">
                    <span>${selectLabel}</span>
                </div>
                <div class="context-menu-separator"></div>
                <div class="context-menu-item" data-action="add-widget">
                    <img src="Theme/Icon/Symbol_icon/stroke/Dashboard Plus.svg" alt="">
                    <span>${t('desktop.menu.add-widget')}</span>
                </div>
                <div class="context-menu-item" data-action="personalize">
                    <img src="Theme/Icon/Symbol_icon/stroke/Color Picker.svg" alt="">
                    <span>${t('desktop.menu.personalize')}</span>
                </div>`;

        this.positionContextMenu(x, y);
    },

    showDesktopItemMenu(x, y, nodeId) {
        const node = State.findNode(nodeId);
        if (!node) return;

        const selectedCount = this.contextSelectionIds.length || this.getSelectedIconElements().length;
        // 判断是否多选
        const isMultiSelect = selectedCount > 1;
        const disabledClass = isMultiSelect ? ' disabled' : '';
        const totalIcons = this.iconsContainer ? this.iconsContainer.querySelectorAll('.desktop-icon').length : 0;
        const allSelected = totalIcons > 0 && this.selectedIcons.length === totalIcons;
        const selectAction = allSelected ? 'deselect-all' : 'select-all';
        const selectLabel = allSelected ? t('desktop.menu.deselect-all') : t('desktop.menu.select-all');
        
        // 多选时只有删除可用，其他选项禁用
        this.contextMenu.innerHTML = `
            <div class="context-menu-item${disabledClass}" data-action="rename">
                <img src="Theme/Icon/Symbol_icon/stroke/Edit.svg" alt="">
                <span>${t('desktop.menu.rename')}</span>
            </div>
            <div class="context-menu-item" data-action="delete">
                <img src="Theme/Icon/Symbol_icon/stroke/Trash.svg" alt="">
                <span>${t('desktop.menu.delete')}${isMultiSelect ? ` (${selectedCount})` : ''}</span>
            </div>
            <div class="context-menu-item" data-action="${selectAction}">
                <img src="Theme/Icon/Symbol_icon/stroke/Select Box.svg" alt="">
                <span>${selectLabel}</span>
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item${disabledClass}" data-action="properties">
                <img src="Theme/Icon/Symbol_icon/stroke/Information Circle.svg" alt="">
                <span>${t('desktop.menu.properties')}</span>
            </div>`;
        this.positionContextMenu(x, y);
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
            case 'upload': {
                if (window.FileImport && typeof FileImport.pickAndImportTo === 'function' && FileImport.enabled()) {
                    FileImport.pickAndImportTo('desktop');
                }
                break;
            }
            case 'select-all':
                this.selectAllIcons();
                break;
            case 'deselect-all':
                this.deselectAll();
                break;
            case 'personalize':
                WindowManager.openApp('settings', { page: 'personalization' });
                break;
            case 'add-widget':
                if (typeof Widgets !== 'undefined') {
                    Widgets.open();
                }
                break;
            case 'rename': {
                const id = this.contextTargetId;
                const node = id && State.findNode(id);
                if (!node) break;
                FluentUI.InputDialog({
                    title: '重命名',
                    placeholder: '输入新名称',
                    defaultValue: node.type === 'file' && node.name.lastIndexOf('.') > 0
                        ? node.name.slice(0, node.name.lastIndexOf('.'))
                        : node.name,
                    validateFn: (value) => {
                        if (!value) return '名称不能为空';
                        if (value.includes('/') || value.includes('\\')) return '名称不能包含 / 或 \\';
                        return true;
                    },
                    onConfirm: (newName) => {
                        if (node.type === 'file') {
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
                            const extList = (Array.isArray(window.FilesApp?.EXECUTABLE_EXTENSIONS) && window.FilesApp.EXECUTABLE_EXTENSIONS.length > 0)
                                ? window.FilesApp.EXECUTABLE_EXTENSIONS
                                : ['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'html', 'htm', 'xhtml', 'svg', 'xml', 'bat', 'cmd', 'ps1', 'sh', 'vbs', 'wsf', 'exe', 'dll', 'com', 'scr', 'msi', 'jar', 'reg'];
                            const isExecutableExt = (ext) => extList.includes(String(ext || '').toLowerCase());

                            const oldParts = splitFileExt(node.name);
                            if (oldParts.hasExt) {
                                const oldSuffix = `.${oldParts.ext}`;
                                let visibleName = String(newName || '').trim();
                                if (visibleName.toLowerCase().endsWith(oldSuffix.toLowerCase())) {
                                    visibleName = visibleName.slice(0, -oldSuffix.length);
                                }
                                newName = `${visibleName || oldParts.base}${oldSuffix}`;
                            }
                            const newParts = splitFileExt(newName);

                            if (!oldParts.hasExt) {
                                if (newParts.hasExt && isExecutableExt(newParts.ext)) {
                                    FluentUI.Toast({ title: t('files.rename-title'), message: t('files.rename-ext-dangerous'), type: 'warning' });
                                    return;
                                }
                            } else if (!newParts.hasExt) {
                                const base = (newParts.base || oldParts.base || newName).replace(/\.+$/g, '') || oldParts.base || 'untitled';
                                newName = `${base}.${oldParts.ext}`;
                            } else {
                                const oldExt = oldParts.ext.toLowerCase();
                                const nextExt = newParts.ext.toLowerCase();
                                if (isExecutableExt(oldExt) && oldExt !== nextExt) {
                                    FluentUI.Toast({ title: t('files.rename-title'), message: t('files.rename-ext-locked'), type: 'warning' });
                                    return;
                                }
                                if (!isExecutableExt(oldExt) && oldExt !== nextExt && isExecutableExt(nextExt)) {
                                    FluentUI.Toast({ title: t('files.rename-title'), message: t('files.rename-ext-dangerous'), type: 'warning' });
                                    return;
                                }
                            }
                        }

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
                if (this.contextSelectionIds.length > 1) {
                    this.deleteSelectedIcons(this.contextSelectionIds);
                    this.contextSelectionIds = [];
                    break;
                }
                // 单选时删除单个文件
                const id = this.contextTargetId;
                if (!id) break;
                const targetNode = State.findNode(id);
                // App 快捷方式：全局弹窗选择「从桌面删除 / 卸载 / 取消」
                if (targetNode && targetNode.type === 'app') {
                    this.confirmDeleteAppShortcut(targetNode);
                    break;
                }
                this.moveDesktopNodeToRecycle(id);
                this.deselectAll();
                this.contextSelectionIds = [];
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
