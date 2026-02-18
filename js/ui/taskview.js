/**
 * 任务视图 - 智能布局，避免窗口重叠，仅虚化背景
 */
const TaskView = {
    overlay: null,
    isOpen: false,
    windowStates: new Map(), // windowId -> { origPos, origSize, origZ, clickHandler }
    autoTimer: null,

    init() {
        if (this.overlay) return;
        // 遮罩层仅用于拦截点击和虚化背景（不包含窗口）
        this.overlay = document.createElement('div');
        this.overlay.id = 'taskview-overlay';
        this.overlay.className = 'taskview hidden';
        document.body.appendChild(this.overlay);

        // 点击遮罩层（空白处）退出任务视图
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (this.isOpen && e.key === 'Escape') this.close();
        });

        // 点击任务栏也退出任务视图
        document.addEventListener('click', (e) => {
            if (this.isOpen && e.target.closest('.taskbar')) {
                this.close();
            }
        }, true);
    },

    toggle() {
        if (this.isOpen) this.close(); else this.open();
    },

    open() {
        if (this.isOpen) return;
        this.init();

        const windows = WindowManager.windows || [];
        if (windows.length === 0) {
            // 无窗口：仅显示虚化背景，1秒后自动关闭
            this.overlay.classList.remove('hidden');
            this.isOpen = true;
            document.body.classList.add('in-taskview');
            clearTimeout(this.autoTimer);
            this.autoTimer = setTimeout(() => this.close(), 200);
            return;
        }

        // 计算智能布局（避免重叠）
        const layout = this.calculateLayout(windows);

        windows.forEach((w, i) => {
            const el = w.element;
            if (!el) return;

            // 保存原始状态
            const rect = el.getBoundingClientRect();
            this.windowStates.set(w.id, {
                origPos: { left: el.style.left, top: el.style.top },
                origSize: { width: el.style.width, height: el.style.height },
                origZ: el.style.zIndex,
                origTransform: el.style.transform
            });

            const pos = layout[i];
            // 设置新位置和缩放
            el.style.transition = 'all 420ms cubic-bezier(0.22, 0.61, 0.36, 1)';
            el.style.left = pos.x + 'px';
            el.style.top = pos.y + 'px';
            el.style.width = pos.width + 'px';
            el.style.height = pos.height + 'px';
            el.style.zIndex = '9100'; // 高于背景遮罩
            el.classList.add('taskview-window-active');

            // 点击窗口聚焦并退出
            const onClick = (evt) => {
                evt.stopPropagation();
                const targetId = w.id;

                // 关键修复：只让被点击的窗口动画回位，其他窗口保持在任务视图位置不动
                this.closeWithTarget(targetId);
            };
            el.addEventListener('click', onClick, { once: true });
            const state = this.windowStates.get(w.id);
            state.clickHandler = onClick;
        });

        this.overlay.classList.remove('hidden');
        this.isOpen = true;
        document.body.classList.add('in-taskview');
    },

    // 点击窗口后：目标窗口平滑回位并置顶，其他窗口瞬时回到原位（无动画）
    closeWithTarget(targetId) {
        if (!this.isOpen) return;

        // 1. 先关闭遮罩和虚化效果
        this.overlay.classList.add('hidden');
        this.isOpen = false;
        document.body.classList.remove('in-taskview');
        clearTimeout(this.autoTimer);

        // 2. 其他窗口：立即无动画恢复到原位
        this.windowStates.forEach((state, windowId) => {
            if (windowId === targetId) return; // 跳过目标窗口
            
            const w = WindowManager.windows.find(win => win.id === windowId);
            if (!w || !w.element) return;
            const el = w.element;

            // 移除点击事件
            if (state.clickHandler) {
                el.removeEventListener('click', state.clickHandler);
            }

            // 关键：先移除 transition，然后恢复位置（无动画）
            el.style.transition = 'none';
            el.classList.remove('taskview-window-active');
            el.style.left = state.origPos.left;
            el.style.top = state.origPos.top;
            el.style.width = state.origSize.width;
            el.style.height = state.origSize.height;
            el.style.zIndex = state.origZ;
            el.style.transform = state.origTransform || '';
            
            // 强制浏览器重绘，确保无动画生效
            void el.offsetHeight;
            
            // 清理 transition（不恢复，避免后续误触发动画）
            setTimeout(() => {
                el.style.transition = '';
            }, 50);
        });

        // 3. 目标窗口：保持 transition，平滑回位并置顶
        const targetState = this.windowStates.get(targetId);
        const targetWindow = WindowManager.windows.find(w => w.id === targetId);
        
        if (targetState && targetWindow && targetWindow.element) {
            const el = targetWindow.element;
            
            // 移除点击事件
            if (targetState.clickHandler) {
                el.removeEventListener('click', targetState.clickHandler);
            }
            
            // 保持 transition 以实现平滑动画
            el.style.transition = 'all 420ms cubic-bezier(0.22, 0.61, 0.36, 1)';
            el.classList.remove('taskview-window-active');
            
            // 恢复原始位置和大小（带动画）
            el.style.left = targetState.origPos.left;
            el.style.top = targetState.origPos.top;
            el.style.width = targetState.origSize.width;
            el.style.height = targetState.origSize.height;
            el.style.transform = targetState.origTransform || '';
            
            // 动画完成后提升到最前并清理
            setTimeout(() => {
                WindowManager.focusWindow(targetId);
                el.style.transition = '';
            }, 420);
        }

        // 4. 清理所有状态
        this.windowStates.clear();
    },

    close() {
        if (!this.isOpen) return;

        // 所有窗口都平滑恢复原位（用于 ESC 或点击背景）
        this.windowStates.forEach((state, windowId) => {
            const w = WindowManager.windows.find(win => win.id === windowId);
            if (!w || !w.element) return;
            const el = w.element;

            el.classList.remove('taskview-window-active');
            el.style.left = state.origPos.left;
            el.style.top = state.origPos.top;
            el.style.width = state.origSize.width;
            el.style.height = state.origSize.height;
            el.style.zIndex = state.origZ;
            el.style.transform = state.origTransform || '';

            if (state.clickHandler) {
                el.removeEventListener('click', state.clickHandler);
            }

            // 移除 transition 避免其他操作被动画影响
            setTimeout(() => { el.style.transition = ''; }, 450);
        });
        this.windowStates.clear();

        this.overlay.classList.add('hidden');
        this.isOpen = false;
        document.body.classList.remove('in-taskview');
        clearTimeout(this.autoTimer);
    },

    calculateLayout(windows) {
        // 简单网格布局：3列，根据窗口数量自动行数
        const padding = 32;
        const gap = 24;
        const cols = 3;
        const rows = Math.ceil(windows.length / cols);

        const availableWidth = window.innerWidth - padding * 2;
        const availableHeight = window.innerHeight - 100 - padding * 2; // 底部留给任务栏

        const cellWidth = (availableWidth - gap * (cols - 1)) / cols;
        const cellHeight = (availableHeight - gap * (rows - 1)) / rows;

        return windows.map((w, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);

            // 计算目标位置（居中网格）
            const x = padding + col * (cellWidth + gap);
            const y = padding + row * (cellHeight + gap);

            // 计算缩放比例（保持窗口比例）
            const el = w.element;
            const rect = el.getBoundingClientRect();
            const scaleW = cellWidth / rect.width;
            const scaleH = cellHeight / rect.height;
            const scale = Math.min(scaleW, scaleH, 0.75); // 最大缩小到75%

            const targetWidth = rect.width * scale;
            const targetHeight = rect.height * scale;

            // 在单元格内居中
            const finalX = x + (cellWidth - targetWidth) / 2;
            const finalY = y + (cellHeight - targetHeight) / 2;

            return {
                x: finalX,
                y: finalY,
                width: targetWidth,
                height: targetHeight
            };
        });
    }
};

window.TaskView = TaskView;
