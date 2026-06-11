/**
 * FluentWindow - 全新的 Fluent 窗口设计框架 (核心)
 * ===================================================================
 * 这是一个集中式的窗口内容框架。任何应用只要在 init() 中调用
 * `FluentWindow.mount()`，即可获得统一的「侧边栏 + 白色圆角卡片」布局：
 *
 *   ┌───────────────────────────────────────────┐  窗口 (高斯模糊半透明卡片)
 *   │ [icon] 标题                       ○  ○  ○  │  标题栏 (复用 WindowManager)
 *   │ ┌──┐  ┌──────────────────────────────────┐ │
 *   │ │  │  │                                  │ │
 *   │ │侧│  │        纯白色圆角内容卡片         │ │
 *   │ │栏│  │                                  │ │
 *   │ └──┘  └──────────────────────────────────┘ │
 *   └───────────────────────────────────────────┘
 *
 * 设计要点 (对应需求图一 / 图三)：
 *  1. 整个窗口是一张高斯模糊 + 半透明 (白/黑) 的卡片，作为侧边栏的背景材质。
 *  2. 侧边栏默认展开 (icon + 文字)，窗口变窄时自动收起 (仅 icon)。
 *  3. 收起 / 展开使用「丝滑非线性」动画 (cubic-bezier)。
 *  4. 侧边栏右侧是一张纯白色 (深色模式为深色) 的圆角卡片，承载页面内容。
 *  5. 切换页面时，右侧内容有淡出 / 淡入动画。
 *
 * 关键优势：所有视觉与动效都集中在本文件 + css/fluent-window.css 中，
 * 只需修改这两个核心文件即可让所有使用该框架的 App 全局同时生效。
 *
 * ------------------------------------------------------------------
 * 用法示例:
 *   const frame = FluentWindow.mount({
 *       container: this.container,         // window-content 元素
 *       items: [
 *           { id: 'home', label: '主页', icon: 'Home' },
 *           { id: 'about', label: '关于', icon: 'Info' }
 *       ],
 *       activeId: 'home',
 *       onNavigate: (id, pageEl) => { pageEl.textContent = id; }
 *   });
 *   // 关闭窗口时: frame.destroy();
 * ------------------------------------------------------------------
 */
const FluentWindow = {
    version: '1.0.0',
    _globalScrollbarsInitialized: false,
    _globalScrollbars: new Map(),
    _globalScrollbarScanTimer: null,
    _globalScrollbarObserver: null,
    _globalScrollUseTranslate: null,

    // ============ 全局可调参数 ============
    defaults: {
        expandedWidth: 220,     // 侧边栏展开宽度 (px)
        minExpandedWidth: 176,  // 侧边栏拖拽最小宽度 (px)
        maxExpandedWidth: 320,  // 侧边栏拖拽最大宽度 (px)
        collapsedWidth: 60,     // 侧边栏收起宽度 (px)
        collapseAtWidth: 720,   // 窗口宽度小于该值时自动收起侧边栏 (px)
        pageFadeMs: 170,        // 页面切换淡出/淡入时长 (ms)
        iconType: 'stroke',     // 普通图标类型
        activeIconType: 'fill'  // 激活图标类型
    },

    _seq: 0,

    initGlobalScrollbars() {
        if (this._globalScrollbarsInitialized || typeof document === 'undefined') return;
        this._globalScrollbarsInitialized = true;

        const HIDE_DELAY = 950;
        const HOVER_LOCK_DELAY = 180;
        const MIN_THUMB = 30;
        const BOUNCE_MAX_OFFSET = 22;
        const BOUNCE_MAX_VELOCITY = 10;
        const BOUNCE_IMPULSE_FACTOR = 0.022;
        const BOUNCE_IMPULSE_MAX = 4.8;
        const BOUNCE_SPRING = 0.17;
        const BOUNCE_DAMPING = 0.8;
        const BOUNCE_REST_OFFSET = 0.08;
        const BOUNCE_REST_VELOCITY = 0.08;
        const SKIP_SELECTOR = [
            'html',
            'body',
            'iframe',
            'textarea',
            'select',
            'input',
            'canvas',
            'svg',
            'video',
            'audio',
            '.fw-scrollbar-rail',
            '.fw-scrollbar-thumb',
            '.fw-nav',
            '.widgets-sidebar',
            '.fluent-scroll-area',
            '.fluent-scroll-area *',
            '.pwa-app',
            '.pwa-app *',
            '.pwa-iframe'
        ].join(',');
        const SCAN_SELECTOR = [
            '.fw-card',
            '.fw-sidebar',
            '.window-content',
            '.files-content',
            '.appshop-main',
            '.media-main',
            '.settings-content',
            '.start-menu',
            '.fluent-select-dropdown',
            '.fluent-modal-content',
            '[data-fw-scroll]'
        ].join(',');
        this._globalScrollUseTranslate = this._globalScrollUseTranslate === null
            ? ('translate' in document.documentElement.style)
            : this._globalScrollUseTranslate;
        const useTranslate = this._globalScrollUseTranslate === true;
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const isElementScrollable = (el) => {
            if (!(el instanceof HTMLElement)) return false;
            if (!el.isConnected) return false;
            if (el.matches(SKIP_SELECTOR)) return false;
            const rect = el.getBoundingClientRect();
            if (rect.width < 24 || rect.height < 24) return false;
            if (rect.bottom <= 0 || rect.top >= window.innerHeight) return false;
            if (rect.right <= 0 || rect.left >= window.innerWidth) return false;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            const overflowY = style.overflowY;
            const allowsScroll = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
            return allowsScroll && el.scrollHeight > el.clientHeight + 1;
        };

        const findScrollable = (start) => {
            let current = start instanceof Element ? start : null;
            while (current && current !== document.body) {
                if (isElementScrollable(current)) return current;
                current = current.parentElement;
            }
            return null;
        };

        const collectTopLevelTargets = (scrollable) => {
            if (!(scrollable instanceof Element)) return [];
            return Array.from(scrollable.children)
                .filter((el) => el instanceof HTMLElement)
                .filter((el) => !el.classList.contains('fw-scrollbar-rail'))
                .filter((el) => !el.classList.contains('window-edge-snap-hint'))
                .filter((el) => !el.classList.contains('window-snap-layout-menu'));
        };

        const normalizeTargets = (targets, scrollable) => {
            const unique = [];
            const seen = new Set();
            (Array.isArray(targets) ? targets : []).forEach((el) => {
                if (!(el instanceof Element) || !el.isConnected || seen.has(el)) return;
                seen.add(el);
                unique.push(el);
            });
            return unique.length ? unique : [scrollable];
        };

        const getBounceTargets = (scrollable) => {
            if (!(scrollable instanceof Element)) return [scrollable];

            if (scrollable.classList.contains('fw-card')) {
                const page = scrollable.querySelector(':scope > .fw-page');
                return normalizeTargets(page ? [page] : collectTopLevelTargets(scrollable), scrollable);
            }

            if (scrollable.classList.contains('fw-sidebar')) {
                return normalizeTargets(Array.from(scrollable.querySelectorAll([
                    '.fw-nav-item',
                    '.fw-nav-footer'
                ].join(', '))), scrollable);
            }

            if (scrollable.classList.contains('settings-content')) {
                const settingsTargets = collectTopLevelTargets(scrollable);
                if (settingsTargets.length) return normalizeTargets(settingsTargets, scrollable);
                return normalizeTargets(Array.from(scrollable.querySelectorAll([
                    '.fluent-setting-item',
                    '.settings-recommend-item',
                    '.settings-recent-item',
                    '.network-hero-card',
                    '.network-option-item',
                    '.network-expand-panel',
                    '.app-list-item',
                    '.wallpaper-item'
                ].join(', '))), scrollable);
            }

            return normalizeTargets(collectTopLevelTargets(scrollable), scrollable);
        };

        const applyBounceOffset = (state) => {
            if (!state || !state.bounceTargets || state.bounceTargets.length === 0) return;
            if (Math.abs(state.bounceOffset) < 0.01) {
                state.bounceTargets.forEach((el) => {
                    if (useTranslate) {
                        el.style.translate = '';
                    } else {
                        el.style.transform = '';
                    }
                    el.style.willChange = '';
                });
                return;
            }

            const y = state.bounceOffset.toFixed(3);
            state.bounceTargets.forEach((el) => {
                el.style.willChange = 'transform';
                if (useTranslate) {
                    el.style.translate = `0 ${y}px`;
                } else {
                    el.style.transform = `translate3d(0, ${y}px, 0)`;
                }
            });
        };

        const stopBounce = (state) => {
            if (!state) return;
            if (state.bounceRafId) {
                cancelAnimationFrame(state.bounceRafId);
                state.bounceRafId = 0;
            }
            state.bounceOffset = 0;
            state.bounceVelocity = 0;
            applyBounceOffset(state);
        };

        const refreshBounceTargets = (state) => {
            const now = performance.now();
            const stale = !state.bounceTargets ||
                state.bounceTargets.length === 0 ||
                state.bounceTargets.some((el) => !el.isConnected) ||
                (now - state.lastBounceTargetSyncAt) > 140;
            if (stale) {
                state.bounceTargets = getBounceTargets(state.scrollable);
                state.lastBounceTargetSyncAt = now;
            }
        };

        const startBounceLoop = (state) => {
            if (!state || state.bounceRafId) return;
            const tick = () => {
                const host = state.scrollable;
                if (!(host instanceof Element) || !host.isConnected) {
                    stopBounce(state);
                    return;
                }

                const prevOffset = state.bounceOffset;
                state.bounceVelocity += (-state.bounceOffset) * BOUNCE_SPRING;
                state.bounceVelocity *= BOUNCE_DAMPING;
                const nextOffset = clamp(
                    state.bounceOffset + state.bounceVelocity,
                    -BOUNCE_MAX_OFFSET,
                    BOUNCE_MAX_OFFSET
                );
                const crossedZero = (prevOffset > 0 && nextOffset < 0) || (prevOffset < 0 && nextOffset > 0);
                if (crossedZero) {
                    stopBounce(state);
                    return;
                }

                state.bounceOffset = nextOffset;
                applyBounceOffset(state);

                if (Math.abs(state.bounceOffset) <= BOUNCE_REST_OFFSET &&
                    Math.abs(state.bounceVelocity) <= BOUNCE_REST_VELOCITY) {
                    stopBounce(state);
                    return;
                }

                state.bounceRafId = requestAnimationFrame(tick);
            };
            state.bounceRafId = requestAnimationFrame(tick);
        };

        const pushBounceImpulse = (el, deltaY) => {
            const state = this._ensureGlobalScrollbar(el);
            if (!state) return;
            refreshBounceTargets(state);
            const impulse = clamp(-deltaY * BOUNCE_IMPULSE_FACTOR, -BOUNCE_IMPULSE_MAX, BOUNCE_IMPULSE_MAX);
            state.bounceVelocity = clamp(
                state.bounceVelocity + impulse,
                -BOUNCE_MAX_VELOCITY,
                BOUNCE_MAX_VELOCITY
            );
            state.bounceOffset = clamp(
                state.bounceOffset + impulse * 0.55,
                -BOUNCE_MAX_OFFSET,
                BOUNCE_MAX_OFFSET
            );
            applyBounceOffset(state);
            startBounceLoop(state);
        };

        const markScrollableActive = (el) => {
            const state = this._ensureGlobalScrollbar(el);
            if (!state) return null;
            el.classList.add('fw-scrollbar-active', 'fluent-scrollbar-active');

            if (state.hoverLockTimer) clearTimeout(state.hoverLockTimer);
            refreshBounceTargets(state);
            const lockTargets = normalizeTargets([el, ...state.bounceTargets], el);
            lockTargets.forEach((target) => target.classList.add('fluent-scroll-hover-locked'));
            state.hoverLockTimer = setTimeout(() => {
                lockTargets.forEach((target) => target.classList.remove('fluent-scroll-hover-locked'));
                state.hoverLockTimer = null;
            }, HOVER_LOCK_DELAY);

            return state;
        };

        const updateScrollbar = (el) => {
            const state = this._globalScrollbars.get(el);
            if (!state) return;
            if (!isElementScrollable(el)) {
                this._removeGlobalScrollbar(el);
                return;
            }

            const rect = el.getBoundingClientRect();
            const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
            const thumbHeight = Math.max(MIN_THUMB, Math.round((el.clientHeight / el.scrollHeight) * rect.height));
            const travel = Math.max(0, rect.height - thumbHeight - 8);
            const thumbTop = 4 + (el.scrollTop / maxScroll) * travel;

            if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) {
                state.rail.classList.remove('visible');
                return;
            }

            Object.assign(state.rail.style, {
                left: `${Math.round(rect.right - 8)}px`,
                top: `${Math.round(rect.top)}px`,
                height: `${Math.round(rect.height)}px`
            });
            Object.assign(state.thumb.style, {
                height: `${Math.round(thumbHeight)}px`,
                transform: `translateY(${Math.round(thumbTop)}px)`
            });
        };

        const showScrollbar = (el) => {
            const state = markScrollableActive(el);
            if (!state) return;
            updateScrollbar(el);
            state.rail.classList.add('visible');
            if (state.hideTimer) clearTimeout(state.hideTimer);
            state.hideTimer = setTimeout(() => {
                if (!state.dragging) state.rail.classList.remove('visible');
            }, HIDE_DELAY);
        };

        this._ensureGlobalScrollbar = (el) => {
            if (!isElementScrollable(el)) return null;
            let state = this._globalScrollbars.get(el);
            if (state) return state;

            const rail = document.createElement('div');
            rail.className = 'fw-scrollbar-rail';
            const thumb = document.createElement('div');
            thumb.className = 'fw-scrollbar-thumb';
            rail.appendChild(thumb);
            document.body.appendChild(rail);
            el.classList.add('fw-scroll-host');

            state = {
                scrollable: el,
                rail,
                thumb,
                hideTimer: null,
                hoverLockTimer: null,
                dragging: false,
                dragStartY: 0,
                dragStartScroll: 0,
                bounceTargets: getBounceTargets(el),
                bounceOffset: 0,
                bounceVelocity: 0,
                bounceRafId: 0,
                lastBounceTargetSyncAt: 0
            };
            this._globalScrollbars.set(el, state);

            rail.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = rail.getBoundingClientRect();
                const thumbRect = thumb.getBoundingClientRect();
                if (e.clientY < thumbRect.top || e.clientY > thumbRect.bottom) {
                    const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
                    const ratio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                    el.scrollTop = ratio * maxScroll;
                    showScrollbar(el);
                    return;
                }
                state.dragging = true;
                state.dragStartY = e.clientY;
                state.dragStartScroll = el.scrollTop;
                rail.classList.add('dragging', 'visible');
                try { rail.setPointerCapture(e.pointerId); } catch (err) {}
            });

            rail.addEventListener('pointermove', (e) => {
                if (!state.dragging) return;
                e.preventDefault();
                const rect = rail.getBoundingClientRect();
                const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
                const thumbHeight = Math.max(MIN_THUMB, Math.round((el.clientHeight / el.scrollHeight) * rect.height));
                const travel = Math.max(1, rect.height - thumbHeight - 8);
                const delta = e.clientY - state.dragStartY;
                el.scrollTop = state.dragStartScroll + (delta / travel) * maxScroll;
                updateScrollbar(el);
            });

            const finishDrag = (e) => {
                if (!state.dragging) return;
                state.dragging = false;
                rail.classList.remove('dragging');
                try { rail.releasePointerCapture(e.pointerId); } catch (err) {}
                showScrollbar(el);
            };
            rail.addEventListener('pointerup', finishDrag);
            rail.addEventListener('pointercancel', finishDrag);
            rail.addEventListener('mouseenter', () => showScrollbar(el));

            updateScrollbar(el);
            return state;
        };

        this._removeGlobalScrollbar = (el) => {
            const state = this._globalScrollbars.get(el);
            if (!state) return;
            if (state.hideTimer) clearTimeout(state.hideTimer);
            if (state.hoverLockTimer) clearTimeout(state.hoverLockTimer);
            stopBounce(state);
            state.rail.remove();
            el.classList.remove('fw-scroll-host', 'fw-scrollbar-active', 'fluent-scrollbar-active', 'fluent-scroll-hover-locked');
            this._globalScrollbars.delete(el);
        };

        const scan = () => {
            this._globalScrollbarScanTimer = null;
            document.querySelectorAll(SCAN_SELECTOR).forEach((el) => {
                if (isElementScrollable(el)) this._ensureGlobalScrollbar(el);
            });
            Array.from(this._globalScrollbars.keys()).forEach((el) => {
                if (!isElementScrollable(el)) this._removeGlobalScrollbar(el);
                else updateScrollbar(el);
            });
        };

        const scheduleScan = () => {
            if (this._globalScrollbarScanTimer) return;
            this._globalScrollbarScanTimer = setTimeout(scan, 140);
        };

        document.addEventListener('scroll', (e) => {
            const el = e.target;
            if (isElementScrollable(el)) showScrollbar(el);
        }, true);

        document.addEventListener('wheel', (e) => {
            if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
            const el = findScrollable(e.target);
            if (!el) return;
            showScrollbar(el);

            const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
            if (maxScroll <= 0) return;
            const atTop = el.scrollTop <= 0;
            const atBottom = el.scrollTop >= maxScroll - 1;
            if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
                e.preventDefault();
                pushBounceImpulse(el, e.deltaY);
            }
        }, { capture: true, passive: false });

        window.addEventListener('resize', scheduleScan, { passive: true });
        this._globalScrollbarObserver = new MutationObserver(scheduleScan);
        this._globalScrollbarObserver.observe(document.body, { childList: true, subtree: true });

        scheduleScan();
    },

    /**
     * 挂载框架到指定容器。
     * @param {Object} options
     * @param {HTMLElement} options.container   - 目标容器 (通常是 window-content)
     * @param {Array}  options.items            - 导航项 [{ id, label, icon, badge? }]
     * @param {string} options.activeId         - 初始激活项 id
     * @param {Function} options.onNavigate     - (id, pageEl) => void 渲染页面回调
     * @param {Array}  [options.footerItems]    - 底部固定导航项 (如设置/账户)
     * @param {boolean} [options.preserveScrollPositions] - 是否按页面保留右侧卡片滚动位置
     * @param {Function} [options.getScrollKey] - (id, instance) => string 自定义滚动位置 key
     * @param {number} [options.expandedWidth]
     * @param {number} [options.collapsedWidth]
     * @param {number} [options.collapseAtWidth]
     * @returns {Object} 实例 API
     */
    mount(options = {}) {
        const opts = { ...this.defaults, ...options };
        const container = opts.container;
        if (!container) {
            console.error('[FluentWindow] mount: container is required');
            return null;
        }

        const sidebarSearchSource = opts.sidebarSearch === true ? {} : opts.sidebarSearch;
        const sidebarSearchConfig = sidebarSearchSource && typeof sidebarSearchSource === 'object'
            ? {
                enabled: sidebarSearchSource.enabled !== false,
                placeholder: sidebarSearchSource.placeholder || 'Search',
                resultsTitle: sidebarSearchSource.resultsTitle || '',
                emptyText: sidebarSearchSource.emptyText || '',
                loadingText: sidebarSearchSource.loadingText || '',
                minQueryLength: Number.isFinite(Number(sidebarSearchSource.minQueryLength))
                    ? Math.max(0, Number(sidebarSearchSource.minQueryLength))
                    : 1,
                debounceMs: Number.isFinite(Number(sidebarSearchSource.debounceMs))
                    ? Math.max(0, Number(sidebarSearchSource.debounceMs))
                    : 180,
                search: typeof sidebarSearchSource.search === 'function' ? sidebarSearchSource.search : null,
                onResultClick: typeof sidebarSearchSource.onResultClick === 'function' ? sidebarSearchSource.onResultClick : null,
                onResultAction: typeof sidebarSearchSource.onResultAction === 'function' ? sidebarSearchSource.onResultAction : null
            }
            : null;
        const sidebarSearchConfigured = !!sidebarSearchConfig;

        const instanceId = `fw-${Date.now()}-${++this._seq}`;
        const hostWindow = container.closest('.window');

        // 标记宿主窗口，启用框架专属的窗口材质 (透明标题栏 + 模糊卡片)
        if (hostWindow) hostWindow.classList.add('fw-host');
        container.classList.add('fw-content-host');

        // ---------- 构建 DOM ----------
        const frame = document.createElement('div');
        const showSidebar = opts.showSidebar !== false && (
            sidebarSearchConfigured ||
            (Array.isArray(opts.items) && opts.items.length > 0) ||
            (Array.isArray(opts.footerItems) && opts.footerItems.length > 0)
        );
        frame.className = `fw-frame${showSidebar ? '' : ' fw-no-sidebar'}`;
        frame.id = instanceId;
        frame.style.setProperty('--fw-expanded-w', `${opts.expandedWidth}px`);
        frame.style.setProperty('--fw-collapsed-w', `${opts.collapsedWidth}px`);
        frame.style.setProperty('--fw-fade-ms', `${opts.pageFadeMs}ms`);

        const sidebar = document.createElement('nav');
        sidebar.className = 'fw-sidebar';

        let sidebarSearchRoot = null;
        let sidebarSearchInput = null;
        let sidebarSearchResults = null;
        let sidebarSearchTitle = null;
        let sidebarSearchList = null;
        if (sidebarSearchConfigured) {
            sidebarSearchRoot = document.createElement('div');
            sidebarSearchRoot.className = 'fw-sidebar-search';
            sidebarSearchRoot.hidden = !sidebarSearchConfig.enabled;

            const sidebarSearchBox = document.createElement('div');
            sidebarSearchBox.className = 'fw-sidebar-search-box';

            const sidebarSearchIcon = document.createElement('img');
            sidebarSearchIcon.className = 'fw-sidebar-search-icon';
            sidebarSearchIcon.src = FluentWindow._iconPath('Search', 'stroke');
            sidebarSearchIcon.alt = '';
            sidebarSearchIcon.draggable = false;
            sidebarSearchBox.appendChild(sidebarSearchIcon);

            sidebarSearchInput = document.createElement('input');
            sidebarSearchInput.className = 'fw-sidebar-search-input';
            sidebarSearchInput.type = 'search';
            sidebarSearchInput.autocomplete = 'off';
            sidebarSearchInput.spellcheck = false;
            sidebarSearchInput.placeholder = sidebarSearchConfig.placeholder;
            sidebarSearchInput.setAttribute('aria-label', sidebarSearchConfig.placeholder);
            sidebarSearchBox.appendChild(sidebarSearchInput);

            sidebarSearchResults = document.createElement('div');
            sidebarSearchResults.className = 'fw-sidebar-search-results hidden';

            sidebarSearchTitle = document.createElement('div');
            sidebarSearchTitle.className = 'fw-sidebar-search-title';
            sidebarSearchResults.appendChild(sidebarSearchTitle);

            sidebarSearchList = document.createElement('div');
            sidebarSearchList.className = 'fw-sidebar-search-list';
            sidebarSearchResults.appendChild(sidebarSearchList);

            sidebarSearchRoot.appendChild(sidebarSearchBox);
            sidebarSearchRoot.appendChild(sidebarSearchResults);
            sidebar.appendChild(sidebarSearchRoot);
        }

        const navList = document.createElement('div');
        navList.className = 'fw-nav';
        sidebar.appendChild(navList);

        let footerList = null;
        if (Array.isArray(opts.footerItems) && opts.footerItems.length) {
            footerList = document.createElement('div');
            footerList.className = 'fw-nav fw-nav-footer';
            sidebar.appendChild(footerList);
        }

        const content = document.createElement('section');
        content.className = 'fw-content';
        const sidebarResizer = document.createElement('div');
        sidebarResizer.className = 'fw-sidebar-resizer';
        sidebarResizer.dataset.noWindowDrag = 'true';
        sidebarResizer.title = '调整侧边栏宽度';
        const card = document.createElement('div');
        card.className = 'fw-card';
        const page = document.createElement('div');
        page.className = 'fw-page';
        card.appendChild(page);
        content.appendChild(card);

        if (showSidebar) {
            frame.appendChild(sidebar);
            frame.appendChild(sidebarResizer);
        }
        frame.appendChild(content);

        container.innerHTML = '';
        container.appendChild(frame);

        // ---------- 实例状态 ----------
        const instance = {
            id: instanceId,
            element: frame,
            sidebarEl: sidebar,
            sidebarResizerEl: sidebarResizer,
            cardEl: card,
            pageEl: page,
            items: [...(opts.items || [])],
            footerItems: [...(opts.footerItems || [])],
            activeId: opts.activeId || (opts.items && opts.items[0] && opts.items[0].id) || null,
            onNavigate: typeof opts.onNavigate === 'function' ? opts.onNavigate : () => {},
            sidebarSearchEl: sidebarSearchRoot,
            sidebarSearchInputEl: sidebarSearchInput,
            sidebarSearchResultsEl: sidebarSearchResults,
            _collapsed: false,
            _switching: false,
            _expandedWidth: opts.expandedWidth,
            _sidebarResizeMove: null,
            _sidebarResizeUp: null,
            _ro: null,
            _hostWindow: hostWindow,
            _container: container,
            _scrollPositions: new Map(),
            _scrollRestoreRaf: null,
            _scrollRestoreTimer: null,
            _suppressScrollSave: false,
            _sidebarSearchConfigured: sidebarSearchConfigured,
            _sidebarSearchEnabled: !!(sidebarSearchConfig && sidebarSearchConfig.enabled),
            _sidebarSearchResults: [],
            _sidebarSearchTimer: null,
            _sidebarSearchSeq: 0
        };

        const setSidebarSearchPanelVisible = (visible) => {
            if (!sidebarSearchResults) return;
            sidebarSearchResults.classList.toggle('hidden', !visible);
        };

        const normalizeSidebarSearchResults = (results) => {
            if (!Array.isArray(results)) return [];
            return results.filter(Boolean).map((result, index) => ({
                id: result.id != null ? String(result.id) : `result-${index}`,
                title: result.title != null ? String(result.title) : '',
                subtitle: result.subtitle != null ? String(result.subtitle) : '',
                icon: result.icon || '',
                iconSrc: result.iconSrc || '',
                data: result.data,
                disabled: !!result.disabled,
                actions: Array.isArray(result.actions) ? result.actions.filter(Boolean) : [],
                onClick: typeof result.onClick === 'function' ? result.onClick : null
            }));
        };

        const renderSidebarSearchMessage = (message, className = '') => {
            if (!sidebarSearchList || !sidebarSearchTitle) return;
            sidebarSearchTitle.textContent = sidebarSearchConfig.resultsTitle || '';
            sidebarSearchTitle.hidden = !sidebarSearchTitle.textContent;
            sidebarSearchList.innerHTML = '';
            const row = document.createElement('div');
            row.className = `fw-sidebar-search-message${className ? ` ${className}` : ''}`;
            row.textContent = message || '';
            sidebarSearchList.appendChild(row);
            setSidebarSearchPanelVisible(!!message);
        };

        const renderSidebarSearchResults = (results, renderOptions = {}) => {
            if (!sidebarSearchList || !sidebarSearchTitle) return;
            const normalized = normalizeSidebarSearchResults(results);
            instance._sidebarSearchResults = normalized;
            sidebarSearchTitle.textContent = sidebarSearchConfig.resultsTitle || '';
            sidebarSearchTitle.hidden = !sidebarSearchTitle.textContent;
            sidebarSearchList.innerHTML = '';

            if (!normalized.length) {
                const message = renderOptions.message || '';
                if (message) {
                    renderSidebarSearchMessage(message, renderOptions.className || '');
                } else {
                    setSidebarSearchPanelVisible(false);
                }
                return;
            }

            normalized.forEach(result => {
                const row = document.createElement('div');
                row.className = 'fw-sidebar-search-result';
                row.dataset.id = result.id;
                row.tabIndex = result.disabled ? -1 : 0;
                row.setAttribute('role', 'button');
                row.setAttribute('aria-disabled', result.disabled ? 'true' : 'false');
                if (result.disabled) row.classList.add('disabled');

                const iconWrap = document.createElement('span');
                iconWrap.className = 'fw-sidebar-search-result-icon';
                if (result.iconSrc) {
                    iconWrap.classList.add('fw-sidebar-search-result-image');
                    const iconImg = document.createElement('img');
                    iconImg.src = result.iconSrc;
                    iconImg.alt = '';
                    iconImg.draggable = false;
                    iconWrap.appendChild(iconImg);
                } else if (result.icon) {
                    iconWrap.style.setProperty('--fw-icon-url', `url("${FluentWindow._iconPath(result.icon, 'stroke')}")`);
                } else {
                    iconWrap.textContent = (result.title || '?').charAt(0);
                    iconWrap.classList.add('fw-sidebar-search-result-initial');
                }
                row.appendChild(iconWrap);

                const textWrap = document.createElement('span');
                textWrap.className = 'fw-sidebar-search-result-text';
                const title = document.createElement('span');
                title.className = 'fw-sidebar-search-result-title';
                title.textContent = result.title;
                textWrap.appendChild(title);
                if (result.subtitle) {
                    const subtitle = document.createElement('span');
                    subtitle.className = 'fw-sidebar-search-result-subtitle';
                    subtitle.textContent = result.subtitle;
                    textWrap.appendChild(subtitle);
                }
                row.appendChild(textWrap);

                if (result.actions.length) {
                    const actionsWrap = document.createElement('span');
                    actionsWrap.className = 'fw-sidebar-search-result-actions';
                    result.actions.forEach(action => {
                        const actionButton = document.createElement('button');
                        actionButton.type = 'button';
                        actionButton.className = 'fw-sidebar-search-action';
                        actionButton.dataset.actionId = action.id || '';
                        actionButton.disabled = !!action.disabled;
                        actionButton.title = action.title || action.label || '';
                        if (!action.label) actionButton.classList.add('icon-only');
                        if (action.iconSrc) {
                            const actionIconImg = document.createElement('img');
                            actionIconImg.className = 'fw-sidebar-search-action-icon-img';
                            actionIconImg.src = action.iconSrc;
                            actionIconImg.alt = '';
                            actionIconImg.draggable = false;
                            actionButton.appendChild(actionIconImg);
                        } else if (action.icon) {
                            const actionIcon = document.createElement('span');
                            actionIcon.className = 'fw-sidebar-search-action-icon';
                            actionIcon.style.setProperty('--fw-icon-url', `url("${FluentWindow._iconPath(action.icon, 'stroke')}")`);
                            actionIcon.setAttribute('aria-hidden', 'true');
                            actionButton.appendChild(actionIcon);
                        }
                        if (action.label) {
                            const actionLabel = document.createElement('span');
                            actionLabel.className = 'fw-sidebar-search-action-label';
                            actionLabel.textContent = action.label;
                            actionButton.appendChild(actionLabel);
                        }
                        actionButton.addEventListener('click', (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (actionButton.disabled) return;
                            if (typeof action.onClick === 'function') {
                                action.onClick(result, instance, event);
                                return;
                            }
                            if (sidebarSearchConfig.onResultAction) {
                                sidebarSearchConfig.onResultAction(action, result, instance, event);
                            }
                        });
                        actionsWrap.appendChild(actionButton);
                    });
                    row.appendChild(actionsWrap);
                }

                const activate = (event) => {
                    if (result.disabled) return;
                    if (result.onClick) {
                        result.onClick(result, instance, event);
                    } else if (sidebarSearchConfig.onResultClick) {
                        sidebarSearchConfig.onResultClick(result, instance, event);
                    }
                };
                row.addEventListener('click', activate);
                row.addEventListener('keydown', (event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    activate(event);
                });

                sidebarSearchList.appendChild(row);
            });

            setSidebarSearchPanelVisible(true);
        };

        const runSidebarSearch = async (query) => {
            if (!sidebarSearchConfig || !sidebarSearchConfig.search || !instance._sidebarSearchEnabled) return;
            const cleanQuery = String(query || '').trim();
            if (cleanQuery.length < sidebarSearchConfig.minQueryLength) {
                renderSidebarSearchResults([]);
                return;
            }
            const seq = ++instance._sidebarSearchSeq;
            if (sidebarSearchConfig.loadingText) {
                renderSidebarSearchMessage(sidebarSearchConfig.loadingText, 'loading');
            }
            try {
                const results = await sidebarSearchConfig.search(cleanQuery, instance);
                if (seq !== instance._sidebarSearchSeq) return;
                const normalized = normalizeSidebarSearchResults(results);
                renderSidebarSearchResults(normalized, {
                    message: normalized.length ? '' : sidebarSearchConfig.emptyText
                });
            } catch (err) {
                if (seq !== instance._sidebarSearchSeq) return;
                console.error('[FluentWindow] sidebarSearch error:', err);
                renderSidebarSearchResults([], { message: sidebarSearchConfig.emptyText });
            }
        };

        const scheduleSidebarSearch = () => {
            if (!sidebarSearchInput) return;
            if (instance._sidebarSearchTimer) {
                clearTimeout(instance._sidebarSearchTimer);
                instance._sidebarSearchTimer = null;
            }
            instance._sidebarSearchTimer = setTimeout(() => {
                instance._sidebarSearchTimer = null;
                runSidebarSearch(sidebarSearchInput.value);
            }, sidebarSearchConfig.debounceMs);
        };

        const setSidebarSearchEnabled = (enabled) => {
            if (!sidebarSearchRoot || !sidebarSearchInput) return false;
            instance._sidebarSearchEnabled = !!enabled;
            sidebarSearchRoot.hidden = !instance._sidebarSearchEnabled;
            sidebarSearchInput.disabled = !instance._sidebarSearchEnabled;
            if (!instance._sidebarSearchEnabled) {
                if (instance._sidebarSearchTimer) {
                    clearTimeout(instance._sidebarSearchTimer);
                    instance._sidebarSearchTimer = null;
                }
                instance._sidebarSearchSeq += 1;
                sidebarSearchInput.value = '';
                renderSidebarSearchResults([]);
            }
            return instance._sidebarSearchEnabled;
        };

        if (sidebarSearchConfigured && sidebarSearchInput) {
            sidebarSearchInput.addEventListener('input', scheduleSidebarSearch);
            sidebarSearchInput.addEventListener('focus', () => {
                if (sidebarSearchRoot) sidebarSearchRoot.classList.add('is-active');
            });
            sidebarSearchInput.addEventListener('blur', () => {
                if (sidebarSearchRoot) sidebarSearchRoot.classList.remove('is-active');
            });
            sidebarSearchInput.addEventListener('keydown', (event) => {
                if (event.key !== 'Escape') return;
                sidebarSearchInput.value = '';
                renderSidebarSearchResults([]);
                sidebarSearchInput.blur();
            });
            setSidebarSearchEnabled(sidebarSearchConfig.enabled);
        }

        // ---------- 渲染导航项 ----------
        const renderNavItems = () => {
            navList.innerHTML = '';
            if (footerList) footerList.innerHTML = '';
            const buildItem = (item, target) => {
                const btn = document.createElement('button');
                btn.className = 'fw-nav-item';
                btn.type = 'button';
                btn.dataset.id = item.id;
                btn.title = item.label || '';
                const isActive = item.id === instance.activeId;
                if (isActive) btn.classList.add('active');

                const iconWrap = document.createElement('span');
                iconWrap.className = 'fw-nav-icon';
                if (item.icon) {
                    const type = isActive ? opts.activeIconType : opts.iconType;
                    const iconPath = FluentWindow._iconPath(item.icon, type);

                    const fallbackImg = document.createElement('img');
                    fallbackImg.className = 'fw-nav-icon-img';
                    fallbackImg.src = iconPath;
                    fallbackImg.dataset.iconName = item.icon;
                    fallbackImg.alt = '';
                    fallbackImg.draggable = false;
                    iconWrap.appendChild(fallbackImg);

                    const icon = document.createElement('span');
                    icon.className = 'fw-nav-icon-symbol';
                    icon.dataset.iconName = item.icon;
                    icon.style.setProperty('--fw-icon-url', `url("${iconPath}")`);
                    icon.setAttribute('aria-hidden', 'true');
                    iconWrap.appendChild(icon);
                } else {
                    iconWrap.textContent = (item.label || '?').charAt(0);
                }
                btn.appendChild(iconWrap);

                const label = document.createElement('span');
                label.className = 'fw-nav-label';
                label.textContent = item.label || item.id;
                btn.appendChild(label);

                if (item.badge != null) {
                    const badge = document.createElement('span');
                    badge.className = 'fw-nav-badge';
                    badge.textContent = item.badge;
                    btn.appendChild(badge);
                }

                btn.addEventListener('click', () => instance.navigate(item.id));
                target.appendChild(btn);
            };
            instance.items.forEach(it => buildItem(it, navList));
            if (footerList) instance.footerItems.forEach(it => buildItem(it, footerList));
        };

        // ---------- 高亮同步 ----------
        const syncActiveStyles = () => {
            frame.querySelectorAll('.fw-nav-item').forEach(btn => {
                const isActive = btn.dataset.id === instance.activeId;
                btn.classList.toggle('active', isActive);
                const icon = btn.querySelector('.fw-nav-icon-symbol');
                if (icon && icon.dataset.iconName) {
                    const iconPath = FluentWindow._iconPath(
                        icon.dataset.iconName,
                        isActive ? opts.activeIconType : opts.iconType
                    );
                    icon.style.setProperty(
                        '--fw-icon-url',
                        `url("${iconPath}")`
                    );
                    const fallbackImg = btn.querySelector('.fw-nav-icon-img');
                    if (fallbackImg) fallbackImg.src = iconPath;
                }
            });
        };

        // ---------- 页面渲染 (带淡出/淡入动效) ----------
        const renderPage = () => {
            instance.pageEl.innerHTML = '';
            try {
                instance.onNavigate(instance.activeId, instance.pageEl);
            } catch (err) {
                console.error('[FluentWindow] onNavigate error:', err);
            }
        };

        const getScrollKey = () => {
            if (typeof opts.getScrollKey === 'function') {
                return String(opts.getScrollKey(instance.activeId, instance) || instance.activeId || 'default');
            }
            const pageId = instance.cardEl.dataset.pageId || instance.pageEl.dataset.pageId || instance.activeId || 'default';
            const detailId = instance.cardEl.dataset.detailAppId || instance.pageEl.dataset.detailAppId || '';
            return detailId ? `${pageId}:${detailId}` : String(pageId);
        };

        const cancelScrollRestore = () => {
            if (instance._scrollRestoreRaf) {
                cancelAnimationFrame(instance._scrollRestoreRaf);
                instance._scrollRestoreRaf = null;
            }
            if (instance._scrollRestoreTimer) {
                clearTimeout(instance._scrollRestoreTimer);
                instance._scrollRestoreTimer = null;
            }
        };

        const saveScrollPosition = () => {
            if (!opts.preserveScrollPositions) return;
            if (instance._suppressScrollSave) return;
            instance._scrollPositions.set(getScrollKey(), instance.cardEl.scrollTop);
        };

        const restoreScrollPosition = () => {
            if (!opts.preserveScrollPositions) {
                instance.cardEl.scrollTop = 0;
                return;
            }

            const scrollKey = getScrollKey();
            const savedTop = instance._scrollPositions.get(scrollKey);
            if (!Number.isFinite(savedTop)) {
                instance.cardEl.scrollTop = 0;
                return;
            }

            cancelScrollRestore();
            let frameCount = 0;
            const maxFrames = 8;
            const applyRestore = () => {
                if (!instance.cardEl.isConnected) {
                    instance._scrollRestoreRaf = null;
                    return;
                }
                const maxScroll = Math.max(0, instance.cardEl.scrollHeight - instance.cardEl.clientHeight);
                const targetTop = Math.min(savedTop, maxScroll);
                if (Math.abs(instance.cardEl.scrollTop - targetTop) > 1) {
                    instance.cardEl.scrollTop = targetTop;
                }

                frameCount += 1;
                if (savedTop > maxScroll + 1 && frameCount < maxFrames) {
                    instance._scrollRestoreRaf = requestAnimationFrame(applyRestore);
                    return;
                }
                instance._scrollRestoreRaf = null;
            };

            instance._scrollRestoreRaf = requestAnimationFrame(applyRestore);
            instance._scrollRestoreTimer = setTimeout(() => {
                if (!instance.cardEl.isConnected) return;
                const maxScroll = Math.max(0, instance.cardEl.scrollHeight - instance.cardEl.clientHeight);
                instance.cardEl.scrollTop = Math.min(savedTop, maxScroll);
                instance._scrollRestoreTimer = null;
            }, 140);
        };

        instance.navigate = (id, navOptions = {}) => {
            if (id == null || id === instance.activeId || instance._switching) {
                if (id === instance.activeId) return;
            }
            saveScrollPosition();
            instance._suppressScrollSave = true;
            instance.activeId = id;
            syncActiveStyles();

            instance._switching = true;
            instance.pageEl.classList.add('fw-page-leave');
            const fadeMs = opts.pageFadeMs;
            setTimeout(() => {
                renderPage();
                if (navOptions.preserveScroll === false) {
                    instance.cardEl.scrollTop = 0;
                } else {
                    restoreScrollPosition();
                }
                instance.pageEl.classList.remove('fw-page-leave');
                instance.pageEl.classList.add('fw-page-enter');
                void instance.pageEl.offsetHeight;
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        instance.pageEl.classList.remove('fw-page-enter');
                        setTimeout(() => {
                            instance._switching = false;
                            instance._suppressScrollSave = false;
                        }, fadeMs + 90);
                    });
                });
            }, fadeMs);
        };

        instance.setActive = (id) => { instance.navigate(id); };

        instance.refresh = () => { renderPage(); };

        instance.saveScrollPosition = saveScrollPosition;

        instance.restoreScrollPosition = restoreScrollPosition;

        instance.setSidebarSearchEnabled = setSidebarSearchEnabled;

        instance.setSidebarSearchResults = (results, renderOptions = {}) => {
            if (!sidebarSearchConfigured) return;
            renderSidebarSearchResults(results, renderOptions);
        };

        instance.clearSidebarSearch = () => {
            if (sidebarSearchInput) sidebarSearchInput.value = '';
            if (instance._sidebarSearchTimer) {
                clearTimeout(instance._sidebarSearchTimer);
                instance._sidebarSearchTimer = null;
            }
            instance._sidebarSearchSeq += 1;
            renderSidebarSearchResults([]);
        };

        instance.focusSidebarSearch = () => {
            if (!sidebarSearchInput || !instance._sidebarSearchEnabled) return false;
            sidebarSearchInput.focus();
            return true;
        };

        instance.getSidebarSearchQuery = () => sidebarSearchInput ? sidebarSearchInput.value : '';

        instance.cardEl.addEventListener('scroll', saveScrollPosition, { passive: true });

        // ---------- 侧边栏宽度拖拽 ----------
        const clampSidebarWidth = (value) => {
            const availableMax = frame.clientWidth
                ? Math.max(opts.minExpandedWidth, frame.clientWidth - 320)
                : opts.maxExpandedWidth;
            const max = Math.min(opts.maxExpandedWidth, availableMax);
            return Math.round(Math.min(max, Math.max(opts.minExpandedWidth, value)));
        };

        sidebarResizer.addEventListener('pointerdown', (e) => {
            if (!showSidebar) return;
            if (instance._collapsed) return;
            if (typeof e.button === 'number' && e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();

            const startX = e.clientX;
            const startWidth = sidebar.getBoundingClientRect().width || instance._expandedWidth;
            frame.classList.add('fw-sidebar-resizing');

            if (typeof sidebarResizer.setPointerCapture === 'function') {
                try { sidebarResizer.setPointerCapture(e.pointerId); } catch (err) {}
            }

            instance._sidebarResizeMove = (moveEvent) => {
                const nextWidth = clampSidebarWidth(startWidth + (moveEvent.clientX - startX));
                instance._expandedWidth = nextWidth;
                frame.style.setProperty('--fw-expanded-w', `${nextWidth}px`);
            };

            instance._sidebarResizeUp = (upEvent) => {
                frame.classList.remove('fw-sidebar-resizing');
                document.removeEventListener('pointermove', instance._sidebarResizeMove);
                document.removeEventListener('pointerup', instance._sidebarResizeUp);
                document.removeEventListener('pointercancel', instance._sidebarResizeUp);
                if (typeof sidebarResizer.releasePointerCapture === 'function' && upEvent) {
                    try { sidebarResizer.releasePointerCapture(upEvent.pointerId); } catch (err) {}
                }
                instance._sidebarResizeMove = null;
                instance._sidebarResizeUp = null;
            };

            document.addEventListener('pointermove', instance._sidebarResizeMove);
            document.addEventListener('pointerup', instance._sidebarResizeUp, { once: true });
            document.addEventListener('pointercancel', instance._sidebarResizeUp, { once: true });
        });

        // ---------- 自适应收起 / 展开 ----------
        const applyCollapsed = (collapsed) => {
            if (collapsed === instance._collapsed) return;
            instance._collapsed = collapsed;
            frame.classList.toggle('fw-collapsed', collapsed);
        };

        const measure = () => {
            const w = frame.clientWidth || (hostWindow ? hostWindow.clientWidth : 0);
            if (!w) return;
            applyCollapsed(showSidebar && w < opts.collapseAtWidth);
        };

        if (typeof ResizeObserver !== 'undefined') {
            instance._ro = new ResizeObserver(() => measure());
            instance._ro.observe(frame);
        } else {
            instance._resizeHandler = () => measure();
            window.addEventListener('resize', instance._resizeHandler);
        }

        // ---------- 销毁 ----------
        instance.destroy = () => {
            if (instance._ro) {
                try { instance._ro.disconnect(); } catch (e) {}
                instance._ro = null;
            }
            if (instance._resizeHandler) {
                window.removeEventListener('resize', instance._resizeHandler);
                instance._resizeHandler = null;
            }
            if (instance._sidebarSearchTimer) {
                clearTimeout(instance._sidebarSearchTimer);
                instance._sidebarSearchTimer = null;
            }
            cancelScrollRestore();
            if (instance._sidebarResizeMove) {
                document.removeEventListener('pointermove', instance._sidebarResizeMove);
                instance._sidebarResizeMove = null;
            }
            if (instance._sidebarResizeUp) {
                document.removeEventListener('pointerup', instance._sidebarResizeUp);
                document.removeEventListener('pointercancel', instance._sidebarResizeUp);
                instance._sidebarResizeUp = null;
            }
            if (hostWindow) hostWindow.classList.remove('fw-host');
            container.classList.remove('fw-content-host');
        };

        // ---------- 初始渲染 ----------
        renderNavItems();
        renderPage();
        measure();

        return instance;
    },

    _iconPath(name, type = 'stroke') {
        if (!name) return '';
        // 复用 FluentUI 的图标路径规则，保持系统一致
        if (typeof FluentUI !== 'undefined' && FluentUI._utils && FluentUI._utils.getIconPath) {
            return FluentUI._utils.getIconPath(name, type);
        }
        return `Theme/Icon/Symbol_icon/${type}/${name}.svg`;
    }
};

if (typeof window !== 'undefined') {
    window.FluentWindow = FluentWindow;
    const initScrollbars = () => FluentWindow.initGlobalScrollbars();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScrollbars, { once: true });
    } else {
        initScrollbars();
    }
}
