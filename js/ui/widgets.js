/**
 * 小组件系统（Widgets）
 *
 * 包含：
 *  - 桌面 / 锁屏小组件图层（隐藏网格 + 吸附定位）
 *  - 小组件抽屉：左侧应用侧边栏 + 首页推荐 + 单应用多形态横向选择页
 *  - 编辑锁屏模式（抽屉保持前台，完成后免密码回到桌面）
 *
 * 小组件本体的定义（数据 + 渲染）在 js/ui/widget-defs.js 中维护。
 *
 * 对外接口：
 *  - Widgets.init()        在 main.js 中初始化
 *  - Widgets.open()        打开小组件抽屉（桌面右键菜单调用）
 *  - Widgets.isOpen        抽屉是否打开（= 编辑模式）
 *  - Widgets.lockEditMode  是否正在编辑锁屏（lockscreen.js 用于阻止解锁）
 */
const Widgets = {
    /* ===== 网格配置（隐藏网格） ===== */
    GRID: {
        cell: 76,           // 单元格边长
        gap: 16,            // 单元格间距
        marginX: 28,        // 左右留白
        marginTop: 28,      // 顶部留白
        marginBottom: 110   // 底部留白（避开任务栏）
    },
    DRAG_THRESHOLD: 6,

    /* ===== 运行时状态 ===== */
    registry: [],
    drawer: null,
    layers: { desktop: null, lock: null },
    isOpen: false,
    lockEditMode: false,
    drawerPage: 'home',
    _currentVariantIdx: 0,
    _minimizedIds: [],
    _pendingDrag: null,
    _drag: null,
    _suppressNavClick: false,
    _reopenTimer: null,
    _resizeTimer: null,
    _listenersBound: false,
    _menuEl: null,

    /* ==================== 初始化 ==================== */

    init() {
        this.registry = (typeof WidgetDefs !== 'undefined') ? WidgetDefs.getAllVariants() : [];
        this._createLayers();
        this._createDrawer();
        this._createMenu();
        this.renderAll();

        State.on('languageChange', () => {
            this.updateTexts();
            this._renderSidebar();
            if (this.isOpen) this._renderPage();
            this.renderAll();
        });

        window.addEventListener('resize', () => {
            clearTimeout(this._resizeTimer);
            this._resizeTimer = setTimeout(() => this.renderAll(), 150);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen && !this._drag) {
                this.done();
            }
        });

        // 系统视图真正切换（如 Alt+L 锁屏）时，结束编辑会话
        State.on('viewChange', ({ newView }) => {
            if (this.isOpen && newView !== 'desktop') {
                // 视图已切换，锁屏不再由小组件编辑接管
                this.lockEditMode = false;
                this.done();
            }
        });

        // 天气 App 拿到新数据时，同步刷新所有天气小组件（保持数据一致）
        State.on('weatherDataUpdate', () => this.refreshWeatherWidgets());
    },

    /** 仅重新渲染天气小组件的内容（不重建其他小组件，避免打断时钟等） */
    refreshWeatherWidgets() {
        ['desktop', 'lock'].forEach(surface => {
            const layer = this.layers[surface];
            if (!layer) return;
            this.getLayout()[surface].forEach(inst => {
                if (!String(inst.widgetId).startsWith('weather-')) return;
                const def = this.registry.find(d => d.id === inst.widgetId);
                const el = layer.querySelector(`.fluent-widget[data-instance-id="${inst.id}"]`);
                if (!def || !el) return;
                const body = el.querySelector('.fluent-widget-body');
                if (body) this._renderContent(body, def, inst, surface);
            });
        });
    },

    _createLayers() {
        const desktopScreen = document.getElementById('desktop-screen');
        const iconsContainer = document.getElementById('desktop-icons');
        const lockScreen = document.getElementById('lock-screen');

        const desktopLayer = document.createElement('div');
        desktopLayer.className = 'widgets-layer';
        desktopLayer.id = 'desktop-widgets-layer';
        // 插入到图标层之前：位于壁纸之上、图标与窗口之下
        desktopScreen.insertBefore(desktopLayer, iconsContainer);
        this.layers.desktop = desktopLayer;

        const lockLayer = document.createElement('div');
        lockLayer.className = 'widgets-layer';
        lockLayer.id = 'lock-widgets-layer';
        lockScreen.appendChild(lockLayer);
        this.layers.lock = lockLayer;
    },

    /* ==================== 抽屉 DOM ==================== */

    _createDrawer() {
        const wrap = document.createElement('div');
        wrap.id = 'widgets-drawer';
        wrap.innerHTML = `
            <div class="widgets-drawer-content">
                <div class="widgets-drawer-header">
                    <div class="widgets-drawer-title">
                        <img src="Theme/Icon/Symbol_icon/stroke/Dashboard.svg" alt="">
                        <span class="widgets-drawer-title-text"></span>
                        <span class="widgets-drawer-tag hidden"></span>
                    </div>
                    <div class="widgets-drawer-actions">
                        <button class="widgets-btn" id="widgets-lock-btn"></button>
                        <button class="widgets-btn widgets-btn-primary" id="widgets-done-btn"></button>
                    </div>
                </div>
                <div class="widgets-drawer-main">
                    <div class="widgets-sidebar"></div>
                    <div class="widgets-page"></div>
                </div>
                <div class="widgets-drawer-hint"></div>
            </div>`;
        document.body.appendChild(wrap);
        this.drawer = wrap;

        wrap.querySelector('#widgets-lock-btn').addEventListener('click', () => {
            if (this.lockEditMode) {
                this._exitLockEdit();
            } else {
                this._enterLockEdit();
            }
        });
        wrap.querySelector('#widgets-done-btn').addEventListener('click', () => this.done());

        this._renderSidebar();
        this.updateTexts();
    },

    _renderSidebar() {
        if (!this.drawer || typeof WidgetDefs === 'undefined') return;
        const sidebar = this.drawer.querySelector('.widgets-sidebar');
        sidebar.innerHTML = '';

        const makeItem = (pageId, icon, label) => {
            const item = document.createElement('div');
            item.className = 'widgets-sidebar-item';
            item.dataset.page = pageId;
            item.innerHTML = `<img src="${icon}" alt=""><span>${label}</span>`;
            item.addEventListener('click', () => this._navigate(pageId));
            sidebar.appendChild(item);
        };

        makeItem('home', 'Theme/Icon/Symbol_icon/stroke/Stars B.svg', t('widgets.drawer.recommended'));
        WidgetDefs.apps.forEach(app => makeItem(app.id, app.icon, t(app.nameKey)));
        this._syncSidebarActive();
    },

    _syncSidebarActive() {
        if (!this.drawer) return;
        this.drawer.querySelectorAll('.widgets-sidebar-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === this.drawerPage);
        });
    },

    _navigate(pageId) {
        this.drawerPage = pageId;
        this._currentVariantIdx = 0;
        this._syncSidebarActive();
        this._renderPage();
    },

    /* ==================== 抽屉页面 ==================== */

    _renderPage() {
        if (!this.drawer || typeof WidgetDefs === 'undefined') return;
        const page = this.drawer.querySelector('.widgets-page');
        page.innerHTML = '';
        if (this.drawerPage === 'home') {
            this._renderHomePage(page);
        } else {
            this._renderAppPage(page, WidgetDefs.getApp(this.drawerPage));
        }
    },

    /** 首页：常用推荐 */
    _renderHomePage(page) {
        const grid = document.createElement('div');
        grid.className = 'widgets-home';
        WidgetDefs.recommended.forEach(variantId => {
            const variant = WidgetDefs.getVariant(variantId);
            if (!variant) return;
            const card = document.createElement('div');
            card.className = 'widgets-home-card';
            card.appendChild(this._buildPreview(variant, 0.56));
            const label = document.createElement('div');
            label.className = 'widgets-home-label';
            label.textContent = t(variant.appNameKey);
            card.appendChild(label);
            // 点击（非拖动）跳转到对应应用页
            card.addEventListener('click', () => {
                if (this._suppressNavClick) return;
                this._navigate(variant.appId);
            });
            grid.appendChild(card);
        });
        page.appendChild(grid);
    },

    /** 应用页：单个小组件多形态横向选择 */
    _renderAppPage(page, app) {
        if (!app) return;
        page.innerHTML = `
            <div class="widgets-app-head">
                <div class="widgets-app-name">${t(app.nameKey)}</div>
                <div class="widgets-app-desc">${t(app.descKey)}</div>
            </div>
            <div class="widgets-variant-scroller"></div>
            <div class="widgets-app-footer">
                <div class="widgets-dots"></div>
                <button class="widgets-add-btn">＋ ${t('widgets.drawer.add')}</button>
            </div>`;

        const scroller = page.querySelector('.widgets-variant-scroller');
        const dotsEl = page.querySelector('.widgets-dots');

        app.variants.forEach((variant, idx) => {
            const slide = document.createElement('div');
            slide.className = 'widgets-variant-slide';
            slide.dataset.idx = idx;
            const pitch = this.GRID.cell + this.GRID.gap;
            const wpx = variant.w * pitch - this.GRID.gap;
            const hpx = variant.h * pitch - this.GRID.gap;
            const scale = Math.min(1, 210 / hpx, 330 / wpx);
            slide.appendChild(this._buildPreview(variant, scale));
            const cap = document.createElement('div');
            cap.className = 'widgets-variant-caption';
            cap.innerHTML = `<span>${t(variant.sizeKey)}</span><span class="dim">${variant.w} × ${variant.h}</span>`;
            slide.appendChild(cap);
            scroller.appendChild(slide);

            const dot = document.createElement('div');
            dot.className = 'widgets-dot';
            dot.addEventListener('click', () => {
                slide.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            });
            dotsEl.appendChild(dot);
        });

        // 鼠标滚轮纵向滚动 → 横向滚动选择不同尺寸
        scroller.addEventListener('wheel', (e) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                scroller.scrollLeft += e.deltaY;
            }
        }, { passive: false });

        // 滚动时更新当前形态指示
        const syncDots = () => {
            const center = scroller.scrollLeft + scroller.clientWidth / 2;
            let best = 0;
            let bestDist = Infinity;
            scroller.querySelectorAll('.widgets-variant-slide').forEach((slide, idx) => {
                const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
                const dist = Math.abs(slideCenter - center);
                if (dist < bestDist) { bestDist = dist; best = idx; }
            });
            this._currentVariantIdx = best;
            dotsEl.querySelectorAll('.widgets-dot').forEach((d, i) => {
                d.classList.toggle('active', i === best);
            });
        };
        let rafPending = false;
        scroller.addEventListener('scroll', () => {
            if (rafPending) return;
            rafPending = true;
            requestAnimationFrame(() => { rafPending = false; syncDots(); });
        });
        requestAnimationFrame(syncDots);

        page.querySelector('.widgets-add-btn').addEventListener('click', () => {
            const variant = app.variants[this._currentVariantIdx];
            if (variant) this._addToFirstFreeSlot(variant);
        });
    },

    /** 构建一个可拖动的实时预览 */
    _buildPreview(variant, scale) {
        const pitch = this.GRID.cell + this.GRID.gap;
        const wpx = variant.w * pitch - this.GRID.gap;
        const hpx = variant.h * pitch - this.GRID.gap;

        const wrap = document.createElement('div');
        wrap.className = 'widgets-preview-wrap';
        wrap.style.width = `${Math.round(wpx * scale)}px`;
        wrap.style.height = `${Math.round(hpx * scale)}px`;

        const inner = document.createElement('div');
        inner.className = 'fluent-widget widget-preview-inner';
        inner.classList.add(this._sizeClass(variant));
        if (variant.h === 1) inner.classList.add('capsule');
        inner.style.width = `${wpx}px`;
        inner.style.height = `${hpx}px`;
        inner.style.transform = `scale(${scale})`;
        wrap.appendChild(inner);

        const body = document.createElement('div');
        body.className = `fluent-widget-body ${variant.theme || ''}`;
        inner.appendChild(body);
        this._renderContent(body, variant, null, 'preview');

        // 从抽屉拖出添加
        wrap.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            this._pendingDrag = {
                type: 'add',
                def: variant,
                startX: e.clientX,
                startY: e.clientY
            };
            this._bindDragListeners();
        });

        return wrap;
    },

    /** 「添加」按钮：放到当前编辑表面的第一个空位 */
    _addToFirstFreeSlot(variant) {
        const surface = this.lockEditMode ? 'lock' : 'desktop';
        const m = this._metrics(surface);
        for (let row = 0; row <= m.rows - variant.h; row++) {
            for (let col = 0; col <= m.cols - variant.w; col++) {
                if (!this._collides(surface, col, row, variant.w, variant.h, null)) {
                    this.addWidget(surface, variant.id, col, row);
                    // 短暂收起抽屉展示添加效果，再自动滑入
                    this._hideDrawerTemp();
                    this._showDrawerAgain(700);
                    return;
                }
            }
        }
        if (window.FluentUI && FluentUI.Toast) {
            FluentUI.Toast({ title: t('widgets.drawer.title'), message: t('widgets.drawer.no-space'), type: 'warning' });
        }
    },

    updateTexts() {
        if (!this.drawer) return;
        this.drawer.querySelector('.widgets-drawer-title-text').textContent = t('widgets.drawer.title');

        const tag = this.drawer.querySelector('.widgets-drawer-tag');
        tag.textContent = t('widgets.drawer.editing-lock');
        tag.classList.toggle('hidden', !this.lockEditMode);

        this.drawer.querySelector('#widgets-lock-btn').textContent =
            this.lockEditMode ? t('widgets.drawer.back-desktop') : t('widgets.drawer.edit-lock');
        this.drawer.querySelector('#widgets-done-btn').textContent = t('widgets.drawer.done');
        this.drawer.querySelector('.widgets-drawer-hint').textContent =
            this.lockEditMode ? t('widgets.drawer.hint-lock') : t('widgets.drawer.hint-desktop');
    },

    /* ==================== 布局数据（持久化） ==================== */

    getLayout() {
        const data = State.settings && State.settings.widgetsLayout;
        return {
            desktop: (data && Array.isArray(data.desktop)) ? data.desktop : [],
            lock: (data && Array.isArray(data.lock)) ? data.lock : []
        };
    },

    saveLayout(layout) {
        State.updateSettings({ widgetsLayout: layout });
    },

    /* ==================== 网格计算 ==================== */

    _metrics(surface) {
        const layer = this.layers[surface];
        const rect = layer.getBoundingClientRect();
        // 锁屏隐藏时 rect 为 0，回退到视口尺寸（.screen 均为全屏）
        const width = rect.width || window.innerWidth;
        const height = rect.height || window.innerHeight;
        const { cell, gap, marginX, marginTop, marginBottom } = this.GRID;
        const pitch = cell + gap;
        const cols = Math.max(1, Math.floor((width - marginX * 2 + gap) / pitch));
        const rows = Math.max(1, Math.floor((height - marginTop - marginBottom + gap) / pitch));
        return { rect, width, height, pitch, cols, rows, cell, gap, marginX, marginTop };
    },

    /** 根据占用格数返回尺寸样式类（用于按尺寸调整字号） */
    _sizeClass(def) {
        if (def.h === 1) return 'w-size-capsule';
        const cells = def.w * def.h;
        if (cells >= 16) return 'w-size-l';
        if (cells >= 8) return 'w-size-m';
        return 'w-size-s';
    },

    _cellToPx(m, col, row, w, h) {
        return {
            x: m.marginX + col * m.pitch,
            y: m.marginTop + row * m.pitch,
            w: w * m.pitch - m.gap,
            h: h * m.pitch - m.gap
        };
    },

    _collides(surface, col, row, w, h, excludeId) {
        return this.getLayout()[surface].some(inst => {
            if (inst.id === excludeId) return false;
            const def = this.registry.find(d => d.id === inst.widgetId);
            if (!def) return false;
            return col < inst.col + def.w && inst.col < col + w &&
                   row < inst.row + def.h && inst.row < row + h;
        });
    },

    /* ==================== 渲染已放置的小组件 ==================== */

    renderAll() {
        this.renderSurface('desktop');
        this.renderSurface('lock');
    },

    renderSurface(surface) {
        const layer = this.layers[surface];
        if (!layer) return;
        layer.querySelectorAll('.fluent-widget').forEach(el => el.remove());
        const m = this._metrics(surface);
        this.getLayout()[surface].forEach(inst => {
            const def = this.registry.find(d => d.id === inst.widgetId);
            if (!def) return;
            layer.appendChild(this._makeWidgetEl(inst, def, m, surface));
        });
    },

    /** 渲染小组件内容（统一入口，real / preview 共用） */
    _renderContent(body, def, instance, surface) {
        const ctx = {
            instance,
            surface,
            isPreview: surface === 'preview',
            setSettings: (patch, opts = {}) => {
                if (!instance) return;
                instance.settings = Object.assign({}, instance.settings, patch);
                this.saveLayout(this.getLayout());
                if (!opts.silent) this.renderSurface(surface);
            }
        };
        try {
            def.render(body, ctx);
        } catch (err) {
            console.warn('[Widgets] render error:', def.id, err);
            body.innerHTML = `<div class="w-loading">${t('widgets.error')}</div>`;
        }
        return ctx;
    },

    _makeWidgetEl(inst, def, m, surface) {
        const px = this._cellToPx(m, inst.col, inst.row, def.w, def.h);
        const el = document.createElement('div');
        el.className = 'fluent-widget';
        el.classList.add(this._sizeClass(def));
        if (def.h === 1) el.classList.add('capsule');
        el.dataset.instanceId = inst.id;
        el.style.left = `${px.x}px`;
        el.style.top = `${px.y}px`;
        el.style.width = `${px.w}px`;
        el.style.height = `${px.h}px`;

        const body = document.createElement('div');
        body.className = `fluent-widget-body ${def.theme || ''}`;
        el.appendChild(body);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'fluent-widget-remove';
        removeBtn.title = t('widgets.remove');
        removeBtn.innerHTML = `<img src="Theme/Icon/Symbol_icon/stroke/Minus.svg" alt="-">`;
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeWidget(surface, inst.id);
        });
        el.appendChild(removeBtn);

        const ctx = this._renderContent(body, def, inst, surface);

        if (def.onClick && surface === 'desktop') {
            el.classList.add('clickable');
        }

        // 普通模式：点击跳转对应 App（仅桌面；锁屏上点击不触发解锁）
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.isOpen) return;
            if (surface !== 'desktop') return;
            if (e.target.closest('input, button, a')) return;
            if (def.onClick) def.onClick(ctx);
        });

        // 右键菜单（如天气选择城市）
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const items = def.getMenu ? def.getMenu(ctx) : null;
            if (items && items.length > 0) {
                this._showWidgetMenu(e.clientX, e.clientY, items);
            }
        });

        // 编辑模式下可拖动调整位置
        el.addEventListener('pointerdown', (e) => {
            if (!this.isOpen || e.button !== 0) return;
            if (e.target.closest('.fluent-widget-remove')) return;
            e.preventDefault();
            e.stopPropagation();
            this._pendingDrag = {
                type: 'move',
                def,
                instance: inst,
                surface,
                el,
                startX: e.clientX,
                startY: e.clientY
            };
            this._bindDragListeners();
        });

        return el;
    },

    addWidget(surface, widgetId, col, row) {
        const def = this.registry.find(d => d.id === widgetId);
        const layout = this.getLayout();
        layout[surface] = layout[surface].concat([{
            id: `wi-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            widgetId, col, row,
            settings: (def && def.defaultSettings) ? { ...def.defaultSettings } : {}
        }]);
        this.saveLayout(layout);
        this.renderSurface(surface);
    },

    moveWidget(surface, instanceId, col, row) {
        const layout = this.getLayout();
        layout[surface] = layout[surface].map(inst =>
            inst.id === instanceId ? { ...inst, col, row } : inst);
        this.saveLayout(layout);
        this.renderSurface(surface);
    },

    removeWidget(surface, instanceId) {
        const layout = this.getLayout();
        layout[surface] = layout[surface].filter(inst => inst.id !== instanceId);
        this.saveLayout(layout);
        this.renderSurface(surface);
    },

    /* ==================== 小组件右键菜单 ==================== */

    _createMenu() {
        const menu = document.createElement('div');
        menu.className = 'context-menu hidden';
        menu.id = 'widget-context-menu';
        document.body.appendChild(menu);
        this._menuEl = menu;
        document.addEventListener('click', () => menu.classList.add('hidden'));
    },

    _showWidgetMenu(x, y, items) {
        const menu = this._menuEl;
        menu.innerHTML = '';
        items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'context-menu-item';
            row.innerHTML = `<span class="widget-menu-check">${item.checked ? '✓' : ''}</span><span>${item.label}</span>`;
            row.addEventListener('click', () => {
                menu.classList.add('hidden');
                if (item.action) item.action();
            });
            menu.appendChild(row);
        });
        menu.classList.remove('hidden');
        // 防止超出视口
        const rect = menu.getBoundingClientRect();
        menu.style.left = `${Math.min(x, window.innerWidth - rect.width - 8)}px`;
        menu.style.top = `${Math.min(y, window.innerHeight - rect.height - 8)}px`;
    },

    /* ==================== 抽屉开关 ==================== */

    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        this._minimizeOpenWindows();
        document.body.classList.add('widgets-edit-mode');
        this.drawerPage = 'home';
        this._syncSidebarActive();
        this._renderPage();
        this.renderAll();
        this.updateTexts();
        // 下一帧再加 open，确保初始 transform 生效后产生滑入过渡
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (this.isOpen) this.drawer.classList.add('open');
            });
        });
    },

    /** 「完成」：退出编辑、收起抽屉、恢复之前最小化的窗口 */
    done() {
        if (!this.isOpen) return;
        this.isOpen = false;
        clearTimeout(this._reopenTimer);
        if (this.lockEditMode) {
            this._exitLockEdit();
        }
        this.drawer.classList.remove('open');
        document.body.classList.remove('widgets-edit-mode');
        // 清空页面内容，停止预览中的定时器
        const page = this.drawer.querySelector('.widgets-page');
        if (page) page.innerHTML = '';
        this._restoreMinimizedWindows();
    },

    /** 拖动期间临时收起抽屉 */
    _hideDrawerTemp() {
        clearTimeout(this._reopenTimer);
        this.drawer.classList.remove('open');
    },

    /** 拖动结束后重新滑入 */
    _showDrawerAgain(delay = 220) {
        clearTimeout(this._reopenTimer);
        this._reopenTimer = setTimeout(() => {
            if (this.isOpen) this.drawer.classList.add('open');
        }, delay);
    },

    /* ==================== 窗口最小化 / 恢复 ==================== */

    _minimizeOpenWindows() {
        this._minimizedIds = [];
        if (typeof WindowManager === 'undefined' || !Array.isArray(WindowManager.windows)) return;
        const visible = WindowManager.windows
            .filter(w => !w.isMinimized && !w.isMinimizing)
            .sort((a, b) => {
                const za = (a.element && parseInt(a.element.style.zIndex, 10)) || 0;
                const zb = (b.element && parseInt(b.element.style.zIndex, 10)) || 0;
                return za - zb;
            });
        visible.forEach(w => {
            this._minimizedIds.push(w.id);
            WindowManager.minimizeWindow(w.id);
        });
    },

    _restoreMinimizedWindows() {
        const ids = this._minimizedIds.slice();
        this._minimizedIds = [];
        if (typeof WindowManager === 'undefined') return;
        // 按原 z 序从底到顶依次恢复，保持层叠顺序
        ids.forEach((id, i) => {
            setTimeout(() => {
                const w = WindowManager.windows.find(x => x.id === id);
                if (w && w.isMinimized) {
                    WindowManager.focusWindow(id);
                }
            }, i * 100);
        });
    },

    /* ==================== 编辑锁屏模式 ==================== */

    _enterLockEdit() {
        if (this.lockEditMode) return;
        this.lockEditMode = true;
        // 仅显示锁屏元素，不改变 State.view，
        // 因此「完成」后回到桌面无需密码
        LockScreen.show();
        this.renderSurface('lock');
        this.updateTexts();
    },

    _exitLockEdit() {
        if (!this.lockEditMode) return;
        this.lockEditMode = false;
        LockScreen.hide();
        this.updateTexts();
    },

    /* ==================== 拖拽（添加 / 移动） ==================== */

    _bindDragListeners() {
        if (this._listenersBound) return;
        this._listenersBound = true;
        this._onMove = (e) => this._handlePointerMove(e);
        this._onUp = (e) => this._handlePointerUp(e);
        window.addEventListener('pointermove', this._onMove);
        window.addEventListener('pointerup', this._onUp);
        window.addEventListener('pointercancel', this._onUp);
    },

    _unbindDragListeners() {
        if (!this._listenersBound) return;
        this._listenersBound = false;
        window.removeEventListener('pointermove', this._onMove);
        window.removeEventListener('pointerup', this._onUp);
        window.removeEventListener('pointercancel', this._onUp);
    },

    _handlePointerMove(e) {
        if (this._drag) {
            this._onDragMove(e);
            return;
        }
        const p = this._pendingDrag;
        if (!p) return;
        if (Math.abs(e.clientX - p.startX) + Math.abs(e.clientY - p.startY) < this.DRAG_THRESHOLD) return;
        this._startDrag(e, p);
    },

    _handlePointerUp(e) {
        if (this._drag) {
            this._onDragEnd(e);
        }
        this._pendingDrag = null;
        this._unbindDragListeners();
    },

    _startDrag(e, pending) {
        const surface = pending.type === 'move' ? pending.surface : (this.lockEditMode ? 'lock' : 'desktop');
        const def = pending.def;
        const m = this._metrics(surface);
        const wpx = def.w * m.pitch - m.gap;
        const hpx = def.h * m.pitch - m.gap;

        // 拖动开始：抽屉自动收起；抑制首页卡片点击导航
        this._hideDrawerTemp();
        this._suppressNavClick = true;

        // 拖动跟随的幽灵元素（实时内容预览）
        const ghost = document.createElement('div');
        ghost.className = 'widget-ghost';
        ghost.classList.add(this._sizeClass(def));
        if (def.h === 1) ghost.classList.add('capsule');
        ghost.style.width = `${wpx}px`;
        ghost.style.height = `${hpx}px`;
        const ghostBody = document.createElement('div');
        ghostBody.className = `fluent-widget-body ${def.theme || ''}`;
        ghost.appendChild(ghostBody);
        this._renderContent(ghostBody, def, pending.instance || null, 'preview');
        document.body.appendChild(ghost);

        // 指针相对幽灵左上角的偏移
        let offsetX, offsetY;
        if (pending.type === 'move' && pending.el) {
            const r = pending.el.getBoundingClientRect();
            offsetX = Math.min(Math.max(e.clientX - r.left, 0), wpx);
            offsetY = Math.min(Math.max(e.clientY - r.top, 0), hpx);
            pending.el.classList.add('dragging-source');
        } else {
            offsetX = wpx / 2;
            offsetY = hpx / 2;
        }

        // 网格提示 + 吸附指示器
        const layer = this.layers[surface];
        this._showGridOverlay(layer, m);
        const indicator = document.createElement('div');
        indicator.className = 'widget-drop-indicator';
        if (def.h === 1) indicator.classList.add('capsule');
        indicator.style.width = `${wpx}px`;
        indicator.style.height = `${hpx}px`;
        layer.appendChild(indicator);

        this._drag = {
            type: pending.type,
            def,
            instance: pending.instance || null,
            sourceEl: pending.el || null,
            surface, m, wpx, hpx,
            ghost, indicator,
            offsetX, offsetY,
            col: 0, row: 0, valid: false
        };
        this._pendingDrag = null;
        this._onDragMove(e);
    },

    _onDragMove(e) {
        const d = this._drag;
        const gx = e.clientX - d.offsetX;
        const gy = e.clientY - d.offsetY;
        d.ghost.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;

        // 吸附到最近的网格单元
        const m = d.m;
        const relX = gx - m.rect.left - m.marginX;
        const relY = gy - m.rect.top - m.marginTop;
        let col = Math.round(relX / m.pitch);
        let row = Math.round(relY / m.pitch);
        col = Math.min(Math.max(col, 0), Math.max(m.cols - d.def.w, 0));
        row = Math.min(Math.max(row, 0), Math.max(m.rows - d.def.h, 0));

        const excludeId = d.instance ? d.instance.id : null;
        const fits = d.def.w <= m.cols && d.def.h <= m.rows;
        const valid = fits && !this._collides(d.surface, col, row, d.def.w, d.def.h, excludeId);

        const px = this._cellToPx(m, col, row, d.def.w, d.def.h);
        d.indicator.style.left = `${px.x}px`;
        d.indicator.style.top = `${px.y}px`;
        d.indicator.classList.toggle('invalid', !valid);

        d.col = col;
        d.row = row;
        d.valid = valid;
    },

    _onDragEnd() {
        const d = this._drag;
        this._drag = null;
        setTimeout(() => { this._suppressNavClick = false; }, 80);

        this._hideGridOverlay(d.surface);
        d.indicator.remove();

        if (d.valid) {
            // 幽灵元素吸附飞向最终位置，再落地渲染
            const px = this._cellToPx(d.m, d.col, d.row, d.def.w, d.def.h);
            const fx = d.m.rect.left + px.x;
            const fy = d.m.rect.top + px.y;
            d.ghost.classList.add('snapping');
            d.ghost.style.transform = `translate3d(${fx}px, ${fy}px, 0)`;
            setTimeout(() => {
                d.ghost.remove();
                if (d.type === 'add') {
                    this.addWidget(d.surface, d.def.id, d.col, d.row);
                } else {
                    this.moveWidget(d.surface, d.instance.id, d.col, d.row);
                }
            }, 200);
        } else {
            // 取消：幽灵淡出，移动操作还原原位
            d.ghost.classList.add('cancelled');
            setTimeout(() => {
                d.ghost.remove();
                this.renderSurface(d.surface);
            }, 200);
        }

        // 添加完成后，抽屉再次自动滑入
        this._showDrawerAgain();
    },

    /* ==================== 网格可视化 ==================== */

    _showGridOverlay(layer, m) {
        this._hideGridOverlayEl(layer);
        const overlay = document.createElement('div');
        overlay.className = 'widgets-grid-overlay';
        const frag = document.createDocumentFragment();
        for (let r = 0; r < m.rows; r++) {
            for (let c = 0; c < m.cols; c++) {
                const cellEl = document.createElement('div');
                cellEl.className = 'widgets-grid-cell';
                cellEl.style.left = `${m.marginX + c * m.pitch}px`;
                cellEl.style.top = `${m.marginTop + r * m.pitch}px`;
                cellEl.style.width = `${m.cell}px`;
                cellEl.style.height = `${m.cell}px`;
                frag.appendChild(cellEl);
            }
        }
        overlay.appendChild(frag);
        layer.appendChild(overlay);
    },

    _hideGridOverlay(surface) {
        this._hideGridOverlayEl(this.layers[surface]);
    },

    _hideGridOverlayEl(layer) {
        if (!layer) return;
        layer.querySelectorAll('.widgets-grid-overlay').forEach(el => el.remove());
    }
};
