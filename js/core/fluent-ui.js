/**
 * Fluent UI 组件库
 * 统一的系统级 UI 组件，供所有应用调用
 * 
 * 组件列表：
 * - FluentUI.Button / IconButton  按钮
 * - FluentUI.TabBar              标签栏
 * - FluentUI.Sidebar             侧边栏
 * - FluentUI.NavigationBar       导航栏
 * - FluentUI.ToolBar             工具栏
 * - FluentUI.Breadcrumb          面包屑导航
 * - FluentUI.SegmentedControl    分段控制
 * - FluentUI.Input / SearchBox   输入框
 * - FluentUI.Select              下拉选择
 * - FluentUI.Toggle              开关
 * - FluentUI.Slider              滑块
 * - FluentUI.ContextMenu         右键菜单
 * - FluentUI.Modal               模态对话框
 * - FluentUI.Card                卡片
 * - FluentUI.List                列表
 * - FluentUI.Progress            进度条
 * - FluentUI.Dialog              警告框/对话框 (提示/警告/错误)
 * - FluentUI.InputDialog         输入对话框 (支持文本/密码输入)
 * - FluentUI.Toast               通知 (右下角弹出)
 */

const FluentUI = {
    version: '1.0.0',
    
    // ============ 工具函数 ============
    _utils: {
        generateId: (prefix = 'fluent') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        classNames: (...classes) => classes.filter(Boolean).join(' '),
        getIconPath: (name, type = 'stroke') => `Theme/Icon/Symbol_icon/${type}/${name}.svg`,
        createElement(tag, opts = {}) {
            const el = document.createElement(tag);
            if (opts.className) el.className = opts.className;
            if (opts.id) el.id = opts.id;
            if (opts.html) el.innerHTML = opts.html;
            if (opts.text) el.textContent = opts.text;
            if (opts.attrs) Object.entries(opts.attrs).forEach(([k, v]) => v !== null && el.setAttribute(k, v));
            if (opts.data) Object.entries(opts.data).forEach(([k, v]) => el.dataset[k] = v);
            if (opts.styles) Object.assign(el.style, opts.styles);
            return el;
        }
    },

    // ============ 按钮 ============
    _nativeScrollFxInitialized: false,
    _nativeScrollHideTimers: new WeakMap(),
    _nativeScrollBounceStates: new WeakMap(),
    _nativeScrollUseTranslate: null,

    initNativeScrollEffects() {
        if (this._nativeScrollFxInitialized || typeof document === 'undefined') return;
        this._nativeScrollFxInitialized = true;

        const HOST_SELECTOR = '.window-content, .settings-app, .files-app, .appshop, .fluent-sidebar, .fluent-select-dropdown, .fluent-modal-content';
        const HIDE_DELAY = 4000;
        const BOUNCE_MAX_OFFSET = 22;
        const BOUNCE_MAX_VELOCITY = 10;
        const BOUNCE_IMPULSE_FACTOR = 0.022;
        const BOUNCE_IMPULSE_MAX = 4.8;
        const BOUNCE_SPRING = 0.17;
        const BOUNCE_DAMPING = 0.8;
        const BOUNCE_REST_OFFSET = 0.08;
        const BOUNCE_REST_VELOCITY = 0.08;
        this._nativeScrollUseTranslate = this._nativeScrollUseTranslate === null
            ? ('translate' in document.documentElement.style)
            : this._nativeScrollUseTranslate;
        const useTranslate = this._nativeScrollUseTranslate === true;

        const isScrollableElement = (el) => {
            if (!(el instanceof HTMLElement)) return false;
            const style = window.getComputedStyle(el);
            const overflowY = style.overflowY;
            const canScroll = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
            return canScroll && el.scrollHeight > el.clientHeight + 1;
        };

        const isInScope = (el) => {
            if (!(el instanceof Element)) return false;
            return el.matches(HOST_SELECTOR) || !!el.closest(HOST_SELECTOR);
        };

        const findScrollable = (start) => {
            let current = start instanceof Element ? start : null;
            while (current && current !== document.body) {
                if (current.classList.contains('fluent-scroll-viewport')) return null;
                if (isScrollableElement(current) && isInScope(current)) return current;
                current = current.parentElement;
            }
            return null;
        };

        const markScrollableActive = (scrollable) => {
            if (!scrollable || !isInScope(scrollable)) return;
            const prevTimer = this._nativeScrollHideTimers.get(scrollable);
            if (prevTimer) clearTimeout(prevTimer);
            scrollable.classList.add('fluent-scrollbar-active');
            const timer = setTimeout(() => {
                scrollable.classList.remove('fluent-scrollbar-active');
                this._nativeScrollHideTimers.delete(scrollable);
            }, HIDE_DELAY);
            this._nativeScrollHideTimers.set(scrollable, timer);
        };

        const collectTopLevelTargets = (scrollable) => {
            if (!(scrollable instanceof Element)) return [];
            const blocks = Array.from(scrollable.children)
                .filter((el) => el instanceof HTMLElement)
                .filter((el) => !el.classList.contains('window-edge-snap-hint'))
                .filter((el) => !el.classList.contains('window-snap-layout-menu'));
            return blocks;
        };

        const normalizeTargets = (targets, scrollable) => {
            const targetList = Array.isArray(targets) ? targets : [];
            if (targetList.length === 0) return [scrollable];
            const unique = [];
            const seen = new Set();
            targetList.forEach((el) => {
                if (!(el instanceof Element)) return;
                if (!el.isConnected) return;
                if (seen.has(el)) return;
                seen.add(el);
                unique.push(el);
            });
            if (unique.length === 0) return [scrollable];
            return unique;
        };

        const getBounceTargets = (scrollable) => {
            if (!(scrollable instanceof Element)) return [scrollable];
            const isSettingsContent = scrollable.classList.contains('settings-content');
            const isSidebar = scrollable.classList.contains('fluent-sidebar');
            const isFilesContent = scrollable.classList.contains('files-content');
            const isAppShopContent = scrollable.classList.contains('appshop-content');
            const isWindowContent = scrollable.classList.contains('window-content');
            const isModalContent = scrollable.classList.contains('fluent-modal-content');
            const isSelectDropdown = scrollable.classList.contains('fluent-select-dropdown');

            if (isSidebar) {
                const sidebarTargets = Array.from(scrollable.querySelectorAll([
                    '.fluent-sidebar-item',
                    '.fluent-sidebar-section-title',
                    '.fluent-sidebar-header > *'
                ].join(', '))).filter((el) => el instanceof Element);
                return normalizeTargets(sidebarTargets, scrollable);
            }

            if (isSettingsContent) {
                const sections = collectTopLevelTargets(scrollable);
                if (sections.length > 0) return normalizeTargets(sections, scrollable);
                const settingsFallback = Array.from(scrollable.querySelectorAll([
                    '.fluent-setting-item',
                    '.settings-recommend-item',
                    '.settings-recent-item',
                    '.network-hero-card',
                    '.network-option-item',
                    '.network-expand-panel',
                    '.app-list-item',
                    '.wallpaper-item'
                ].join(', '))).filter((el) => el instanceof Element);
                return normalizeTargets(settingsFallback, scrollable);
            }

            if (isFilesContent || isAppShopContent || isModalContent || isSelectDropdown || isWindowContent) {
                const topLevel = collectTopLevelTargets(scrollable);
                return normalizeTargets(topLevel, scrollable);
            }

            const fallback = collectTopLevelTargets(scrollable);
            return normalizeTargets(fallback, scrollable);
        };

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const applyBounceOffset = (state) => {
            if (!state || !state.targets || state.targets.length === 0) return;
            if (Math.abs(state.offset) < 0.01) {
                state.targets.forEach((el) => {
                    if (useTranslate) {
                        el.style.translate = '';
                    } else {
                        el.style.transform = '';
                    }
                    el.style.willChange = '';
                });
                return;
            }
            const translateValue = `0 ${state.offset.toFixed(3)}px`;
            const transformValue = `translate3d(0, ${state.offset.toFixed(3)}px, 0)`;
            state.targets.forEach((el) => {
                el.style.willChange = 'transform';
                if (useTranslate) {
                    el.style.translate = translateValue;
                } else {
                    el.style.transform = transformValue;
                }
            });
        };

        const stopBounce = (state) => {
            if (!state) return;
            if (state.rafId) {
                cancelAnimationFrame(state.rafId);
                state.rafId = 0;
            }
            state.offset = 0;
            state.velocity = 0;
            applyBounceOffset(state);
        };

        const ensureBounceState = (scrollable) => {
            let state = this._nativeScrollBounceStates.get(scrollable);
            if (!state) {
                state = {
                    scrollable,
                    targets: getBounceTargets(scrollable),
                    offset: 0,
                    velocity: 0,
                    rafId: 0,
                    lastTargetSyncAt: 0
                };
                this._nativeScrollBounceStates.set(scrollable, state);
            }
            const now = performance.now();
            const needsRefresh = (now - state.lastTargetSyncAt) > 140 ||
                !state.targets ||
                state.targets.length === 0 ||
                state.targets.some((el) => !el.isConnected);
            if (needsRefresh) {
                state.targets = getBounceTargets(scrollable);
                state.lastTargetSyncAt = now;
            }
            return state;
        };

        const startBounceLoop = (state) => {
            if (!state || state.rafId) return;
            const tick = () => {
                const host = state.scrollable;
                if (!(host instanceof Element) || !host.isConnected) {
                    stopBounce(state);
                    return;
                }

                const prevOffset = state.offset;
                state.velocity += (-state.offset) * BOUNCE_SPRING;
                state.velocity *= BOUNCE_DAMPING;
                const nextOffset = clamp(state.offset + state.velocity, -BOUNCE_MAX_OFFSET, BOUNCE_MAX_OFFSET);
                const crossedZero = (prevOffset > 0 && nextOffset < 0) || (prevOffset < 0 && nextOffset > 0);
                if (crossedZero) {
                    stopBounce(state);
                    return;
                }
                state.offset = nextOffset;
                applyBounceOffset(state);

                if (Math.abs(state.offset) <= BOUNCE_REST_OFFSET && Math.abs(state.velocity) <= BOUNCE_REST_VELOCITY) {
                    stopBounce(state);
                    return;
                }

                state.rafId = requestAnimationFrame(tick);
            };
            state.rafId = requestAnimationFrame(tick);
        };

        const pushBounceImpulse = (scrollable, deltaY) => {
            if (!scrollable || !isInScope(scrollable)) return;
            const state = ensureBounceState(scrollable);
            const impulse = clamp(-deltaY * BOUNCE_IMPULSE_FACTOR, -BOUNCE_IMPULSE_MAX, BOUNCE_IMPULSE_MAX);
            state.velocity = clamp(state.velocity + impulse, -BOUNCE_MAX_VELOCITY, BOUNCE_MAX_VELOCITY);
            state.offset = clamp(state.offset + impulse * 0.55, -BOUNCE_MAX_OFFSET, BOUNCE_MAX_OFFSET);
            applyBounceOffset(state);
            startBounceLoop(state);
        };

        document.addEventListener('wheel', (e) => {
            if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
            const scrollable = findScrollable(e.target);
            if (!scrollable) return;

            markScrollableActive(scrollable);
            const maxScroll = Math.max(0, scrollable.scrollHeight - scrollable.clientHeight);
            if (maxScroll <= 0) return;

            const atTop = scrollable.scrollTop <= 0;
            const atBottom = scrollable.scrollTop >= maxScroll - 1;
            if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
                e.preventDefault();
                pushBounceImpulse(scrollable, e.deltaY);
            }
        }, { capture: true, passive: false });

        document.addEventListener('scroll', (e) => {
            const target = e.target;
            if (!(target instanceof Element)) return;
            if (!isScrollableElement(target) || !isInScope(target)) return;
            if (target.classList.contains('fluent-scroll-viewport')) return;
            markScrollableActive(target);
        }, true);
    },

    Button(opts = {}) {
        const { text = '', variant = 'secondary', size = 'medium', icon = null, iconPosition = 'left',
                disabled = false, loading = false, onClick = null, id = null, className = '' } = opts;
        const btn = this._utils.createElement('button', {
            className: this._utils.classNames('fluent-btn', `fluent-btn-${variant}`, `fluent-btn-${size}`, loading && 'fluent-btn-loading', className),
            id,
            attrs: { type: 'button' }
        });
        btn.disabled = disabled || loading;
        let html = loading ? '<span class="fluent-btn-spinner"></span>' : '';
        if (icon && iconPosition === 'left' && !loading) html += `<img src="${this._utils.getIconPath(icon)}" class="fluent-btn-icon" alt="">`;
        if (text) html += `<span class="fluent-btn-text">${text}</span>`;
        if (icon && iconPosition === 'right' && !loading) html += `<img src="${this._utils.getIconPath(icon)}" class="fluent-btn-icon" alt="">`;
        btn.innerHTML = html;
        if (onClick) btn.addEventListener('click', onClick);
        return btn;
    },

    IconButton(opts = {}) {
        const { icon, title = '', size = 'medium', disabled = false, onClick = null, id = null, className = '' } = opts;
        const btn = this._utils.createElement('button', {
            className: this._utils.classNames('fluent-icon-btn', `fluent-icon-btn-${size}`, className),
            id, attrs: { title, type: 'button' }
        });
        btn.disabled = disabled;
        btn.innerHTML = `<img src="${this._utils.getIconPath(icon)}" alt="${title}">`;
        if (onClick) btn.addEventListener('click', onClick);
        return btn;
    },

    // ============ 标签栏 ============
    TabBar(opts = {}) {
        const { tabs = [], activeTab = null, onTabChange = null, onTabClose = null,
                showAddButton = false, onAddTab = null, variant = 'default', id = null, className = '' } = opts;
        const container = this._utils.createElement('div', {
            className: this._utils.classNames('fluent-tabbar', `fluent-tabbar-${variant}`, className), id
        });
        const tabsWrapper = this._utils.createElement('div', { className: 'fluent-tabbar-tabs' });
        
        tabs.forEach(tab => {
            const tabEl = this._utils.createElement('div', {
                className: this._utils.classNames('fluent-tab', tab.id === activeTab && 'active'),
                data: { tabId: tab.id }
            });
            let content = tab.icon ? `<img src="${this._utils.getIconPath(tab.icon)}" class="fluent-tab-icon" alt="">` : '';
            content += `<span class="fluent-tab-label">${tab.label}</span>`;
            if (tab.closable !== false) content += `<button type="button" class="fluent-tab-close" data-tab-id="${tab.id}"><img src="${this._utils.getIconPath('Cancel')}" alt="关闭"></button>`;
            tabEl.innerHTML = content;
            tabEl.addEventListener('click', e => { if (!e.target.closest('.fluent-tab-close') && onTabChange) onTabChange(tab.id); });
            const closeBtn = tabEl.querySelector('.fluent-tab-close');
            if (closeBtn && onTabClose) closeBtn.addEventListener('click', e => { e.stopPropagation(); onTabClose(tab.id); });
            tabsWrapper.appendChild(tabEl);
        });
        container.appendChild(tabsWrapper);
        if (showAddButton) container.appendChild(this.IconButton({ icon: 'Plus Circle', title: '新建标签页', size: 'small', className: 'fluent-tabbar-add', onClick: onAddTab }));
        return container;
    },

    // ============ 侧边栏 ============
    Sidebar(opts = {}) {
        const { items = [], sections = [], activeItem = null, onItemClick = null, header = null, width = '200px', id = null, className = '' } = opts;
        const sidebar = this._utils.createElement('div', { className: this._utils.classNames('fluent-sidebar', className), id, styles: { width } });
        
        if (header) sidebar.appendChild(this._utils.createElement('div', { className: 'fluent-sidebar-header', html: `<span>${header}</span>` }));
        
        const renderItems = (list, parent) => {
            list.forEach(item => {
                const el = this._utils.createElement('div', {
                    className: this._utils.classNames('fluent-sidebar-item', item.id === activeItem && 'active'),
                    data: { id: item.id }
                });
                el.innerHTML = (item.icon ? `<img src="${this._utils.getIconPath(item.icon)}" class="fluent-sidebar-item-icon" alt="">` : '') + `<span class="fluent-sidebar-item-label">${item.label}</span>`;
                el.addEventListener('click', () => onItemClick && onItemClick(item.id, item));
                parent.appendChild(el);
            });
        };
        
        if (sections.length > 0) {
            sections.forEach(sec => {
                const secEl = this._utils.createElement('div', { className: 'fluent-sidebar-section' });
                if (sec.title) secEl.appendChild(this._utils.createElement('div', { className: 'fluent-sidebar-section-title', text: sec.title }));
                renderItems(sec.items || [], secEl);
                sidebar.appendChild(secEl);
            });
        } else renderItems(items, sidebar);
        return sidebar;
    },

    // ============ 导航栏 ============
    NavigationBar(opts = {}) {
        const { showBack = true, showForward = true, onBack = null, onForward = null, backDisabled = false, forwardDisabled = false, center = null, right = null, id = null, className = '' } = opts;
        const navbar = this._utils.createElement('div', { className: this._utils.classNames('fluent-navbar', className), id });
        const left = this._utils.createElement('div', { className: 'fluent-navbar-left' });
        if (showBack) left.appendChild(this.IconButton({ icon: 'Arrow Left', title: '后退', disabled: backDisabled, onClick: onBack }));
        if (showForward) left.appendChild(this.IconButton({ icon: 'Arrow Right', title: '前进', disabled: forwardDisabled, onClick: onForward }));
        navbar.appendChild(left);
        
        const centerEl = this._utils.createElement('div', { className: 'fluent-navbar-center' });
        if (center) typeof center === 'string' ? centerEl.innerHTML = center : centerEl.appendChild(center);
        navbar.appendChild(centerEl);
        
        const rightEl = this._utils.createElement('div', { className: 'fluent-navbar-right' });
        if (right) typeof right === 'string' ? rightEl.innerHTML = right : rightEl.appendChild(right);
        navbar.appendChild(rightEl);
        return navbar;
    },

    // ============ 工具栏 ============
    ToolBar(opts = {}) {
        const { items = [], onItemClick = null, align = 'left', id = null, className = '' } = opts;
        const toolbar = this._utils.createElement('div', { className: this._utils.classNames('fluent-toolbar', `fluent-toolbar-${align}`, className), id });
        items.forEach(item => {
            if (item.divider) { toolbar.appendChild(this._utils.createElement('div', { className: 'fluent-toolbar-divider' })); return; }
            const btn = this.IconButton({ icon: item.icon, title: item.title || item.label || '', disabled: item.disabled, onClick: () => onItemClick && onItemClick(item.id, item) });
            btn.dataset.toolId = item.id;
            if (item.label) { btn.innerHTML += `<span class="fluent-toolbar-label">${item.label}</span>`; btn.classList.add('fluent-toolbar-btn-labeled'); }
            toolbar.appendChild(btn);
        });
        return toolbar;
    },

    // ============ 面包屑 ============
    Breadcrumb(opts = {}) {
        const { items = [], onItemClick = null, separator = '›', id = null, className = '' } = opts;
        const bc = this._utils.createElement('div', { className: this._utils.classNames('fluent-breadcrumb', className), id });
        items.forEach((item, i) => {
            if (i > 0) bc.appendChild(this._utils.createElement('span', { className: 'fluent-breadcrumb-separator', text: separator }));
            const el = this._utils.createElement('div', { className: 'fluent-breadcrumb-item', data: { id: item.id } });
            el.innerHTML = (item.icon ? `<img src="${this._utils.getIconPath(item.icon)}" class="fluent-breadcrumb-icon" alt="">` : '') + `<span>${item.label}</span>`;
            el.addEventListener('click', () => onItemClick && onItemClick(item.id, i));
            bc.appendChild(el);
        });
        return bc;
    },

    // ============ 分段控制 ============
    SegmentedControl(opts = {}) {
        const { segments = [], activeSegment = null, onChange = null, size = 'medium', id = null, className = '' } = opts;
        const ctrl = this._utils.createElement('div', { className: this._utils.classNames('fluent-segmented', `fluent-segmented-${size}`, className), id });
        const slider = this._utils.createElement('div', { className: 'fluent-segmented-slider' });
        ctrl.appendChild(slider);
        
        segments.forEach((seg, i) => {
            const el = this._utils.createElement('div', { className: this._utils.classNames('fluent-segmented-item', seg.id === activeSegment && 'active'), data: { segmentId: seg.id } });
            el.innerHTML = (seg.icon ? `<img src="${this._utils.getIconPath(seg.icon)}" class="fluent-segmented-icon" alt="">` : '') + `<span>${seg.label}</span>`;
            el.addEventListener('click', () => {
                ctrl.querySelectorAll('.fluent-segmented-item').forEach(e => e.classList.remove('active'));
                el.classList.add('active');
                slider.style.transform = `translateX(${i * 100}%)`;
                slider.style.width = `${100 / segments.length}%`;
                onChange && onChange(seg.id);
            });
            ctrl.appendChild(el);
        });
        const activeIdx = segments.findIndex(s => s.id === activeSegment);
        if (activeIdx >= 0) { slider.style.transform = `translateX(${activeIdx * 100}%)`; slider.style.width = `${100 / segments.length}%`; }
        return ctrl;
    },

    // ============ 输入框 ============
    Input(opts = {}) {
        const { type = 'text', placeholder = '', value = '', icon = null, clearable = false, disabled = false, onChange = null, onEnter = null, id = null, className = '' } = opts;
        const wrapper = this._utils.createElement('div', { className: this._utils.classNames('fluent-input-wrapper', icon && 'fluent-input-with-icon', disabled && 'fluent-input-disabled', className), id });
        if (icon) wrapper.innerHTML = `<img src="${this._utils.getIconPath(icon)}" class="fluent-input-icon" alt="">`;
        const input = this._utils.createElement('input', { className: 'fluent-input', attrs: { type, placeholder, value } });
        input.disabled = disabled;
        input.addEventListener('input', e => {
            onChange && onChange(e.target.value);
            const clearBtn = wrapper.querySelector('.fluent-input-clear');
            if (clearBtn) clearBtn.style.display = e.target.value ? 'flex' : 'none';
        });
        input.addEventListener('keydown', e => { if (e.key === 'Enter' && onEnter) onEnter(input.value); });
        wrapper.appendChild(input);
        if (clearable) {
            const clearBtn = this._utils.createElement('button', { className: 'fluent-input-clear', attrs: { type: 'button' }, html: `<img src="${this._utils.getIconPath('Cancel')}" alt="清除">`, styles: { display: value ? 'flex' : 'none' } });
            clearBtn.addEventListener('click', () => { input.value = ''; clearBtn.style.display = 'none'; onChange && onChange(''); input.focus(); });
            wrapper.appendChild(clearBtn);
        }
        wrapper.getInput = () => input; wrapper.getValue = () => input.value; wrapper.setValue = v => input.value = v; wrapper.focus = () => input.focus();
        return wrapper;
    },

    SearchBox(opts = {}) {
        return this.Input({ ...opts, type: 'search', icon: 'Search', clearable: true, className: this._utils.classNames('fluent-searchbox', opts.className) });
    },

    // ============ 下拉选择 (自定义实现) ============
    Select(opts = {}) {
        const { options: selectOpts = [], value = '', placeholder = '请选择', disabled = false, onChange = null, id = null, className = '' } = opts;
        const wrapper = this._utils.createElement('div', { className: this._utils.classNames('fluent-select-wrapper', disabled && 'fluent-select-disabled', className), id });
        
        // 查找当前选中的标签
        let selectedLabel = placeholder;
        const selectedOption = selectOpts.find(o => o.value === value);
        if (selectedOption) selectedLabel = selectedOption.label;

        // 触发器（显示当前值的部分）
        const trigger = this._utils.createElement('div', { className: 'fluent-select-trigger', attrs: { tabindex: '0' } });
        trigger.innerHTML = `
            <span class="fluent-select-value">${selectedLabel}</span>
            <img src="${this._utils.getIconPath('Arrow Down')}" class="fluent-select-arrow" alt="">
        `;
        
        // 下拉菜单 (将挂载到 body)
        const dropdown = this._utils.createElement('div', { className: 'fluent-select-dropdown' });
        
        // 渲染选项
        selectOpts.forEach(opt => {
            const optEl = this._utils.createElement('div', { 
                className: this._utils.classNames('fluent-select-option', opt.value === value && 'selected', opt.disabled && 'disabled'),
                data: { value: opt.value },
                text: opt.label
            });
            
            optEl.addEventListener('click', (e) => {
                if (opt.disabled) return;
                e.stopPropagation();
                
                // 更新值
                trigger.querySelector('.fluent-select-value').textContent = opt.label;
                dropdown.querySelectorAll('.fluent-select-option').forEach(el => el.classList.remove('selected'));
                optEl.classList.add('selected');
                
                // 关闭菜单
                closeDropdown();
                
                // 触发回调
                if (currValue !== opt.value) {
                    currValue = opt.value;
                    onChange && onChange(currValue);
                }
            });
            
            dropdown.appendChild(optEl);
        });

        let currValue = value;
        let isOpen = false;

        const positionDropdown = () => {
            const rect = trigger.getBoundingClientRect();
            dropdown.style.position = 'fixed';
            dropdown.style.top = `${rect.bottom + 4}px`;
            dropdown.style.left = `${rect.left}px`;
            dropdown.style.width = `${rect.width}px`;
        };

        const openDropdown = () => {
            if (disabled) return;
            // 关闭其他可能打开的下拉菜单
            document.querySelectorAll('.fluent-select-dropdown.open').forEach(el => {
                el.classList.remove('open');
            });
            document.querySelectorAll('.fluent-select-wrapper.active').forEach(el => {
                el.classList.remove('active');
            });

            isOpen = true;
            wrapper.classList.add('active');
            
            // 将 dropdown 挂载到 body
            if (!dropdown.parentElement || dropdown.parentElement !== document.body) {
                document.body.appendChild(dropdown);
            }
            
            positionDropdown();
            dropdown.classList.add('open');
            
            // 点击外部关闭
            setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
        };

        const closeDropdown = () => {
            isOpen = false;
            wrapper.classList.remove('active');
            dropdown.classList.remove('open');
            document.removeEventListener('click', handleClickOutside);
        };
        
        const toggleDropdown = (e) => {
            e.stopPropagation();
            if (isOpen) closeDropdown();
            else openDropdown();
        };

        const handleClickOutside = (e) => {
            if (!wrapper.contains(e.target) && !dropdown.contains(e.target)) {
                closeDropdown();
            }
        };

        trigger.addEventListener('click', toggleDropdown);
        
        wrapper.appendChild(trigger);
        // 不再将 dropdown 放入 wrapper，而是动态挂载到 body
        
        // 公开方法
        wrapper.getValue = () => currValue;
        wrapper.setValue = (v) => {
            currValue = v;
            const opt = selectOpts.find(o => o.value === v);
            if (opt) {
                trigger.querySelector('.fluent-select-value').textContent = opt.label;
                dropdown.querySelectorAll('.fluent-select-option').forEach(el => el.classList.remove('selected'));
                const newOptEl = Array.from(dropdown.children).find(el => el.dataset.value === v);
                if (newOptEl) newOptEl.classList.add('selected');
            }
        };
        
        // 清理：当 wrapper 从 DOM 移除时，也移除 dropdown
        const observer = new MutationObserver(() => {
            if (!document.body.contains(wrapper) && dropdown.parentElement) {
                dropdown.remove();
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        
        return wrapper;
    },

    // ============ 开关 ============
    Toggle(opts = {}) {
        const { checked = false, disabled = false, label = '', onChange = null, id = null, className = '' } = opts;
        const wrapper = this._utils.createElement('label', { className: this._utils.classNames('fluent-toggle-wrapper', disabled && 'fluent-toggle-disabled', className), id });
        const toggle = this._utils.createElement('div', { className: this._utils.classNames('fluent-toggle', checked && 'active') });
        toggle.innerHTML = '<div class="fluent-toggle-track"><div class="fluent-toggle-thumb"></div></div>';
        if (!disabled) toggle.addEventListener('click', () => { toggle.classList.toggle('active'); onChange && onChange(toggle.classList.contains('active')); });
        wrapper.appendChild(toggle);
        if (label) wrapper.appendChild(this._utils.createElement('span', { className: 'fluent-toggle-label', text: label }));
        wrapper.isChecked = () => toggle.classList.contains('active'); wrapper.setChecked = v => toggle.classList.toggle('active', v);
        return wrapper;
    },

    // ============ 滑块 ============
    Slider(opts = {}) {
        const { min = 0, max = 100, value = 50, step = 1, disabled = false, showValue = false, onChange = null, id = null, className = '' } = opts;
        const wrapper = this._utils.createElement('div', { className: this._utils.classNames('fluent-slider-wrapper', disabled && 'fluent-slider-disabled', className), id });
        const slider = this._utils.createElement('input', { className: 'fluent-slider', attrs: { type: 'range', min, max, value, step } });
        slider.disabled = disabled;
        slider.addEventListener('input', e => { onChange && onChange(Number(e.target.value)); if (showValue) valueEl.textContent = e.target.value; });
        wrapper.appendChild(slider);
        let valueEl = null;
        if (showValue) { valueEl = this._utils.createElement('span', { className: 'fluent-slider-value', text: value }); wrapper.appendChild(valueEl); }
        wrapper.getValue = () => Number(slider.value); wrapper.setValue = v => { slider.value = v; if (valueEl) valueEl.textContent = v; };
        return wrapper;
    },

    // ============ Custom Scroll Area ============
    ScrollArea(opts = {}) {
        const {
            content = null,
            maxHeight = null,
            minThumbSize = 24,
            alwaysVisible = false,
            id = null,
            className = ''
        } = opts;

        const area = this._utils.createElement('div', {
            className: this._utils.classNames('fluent-scroll-area', alwaysVisible && 'fluent-scroll-always-visible', className),
            id
        });
        const viewport = this._utils.createElement('div', { className: 'fluent-scroll-viewport' });
        const rail = this._utils.createElement('div', { className: 'fluent-scroll-rail' });
        const thumb = this._utils.createElement('div', { className: 'fluent-scroll-thumb' });
        rail.appendChild(thumb);
        area.appendChild(viewport);
        area.appendChild(rail);

        if (maxHeight !== null && maxHeight !== undefined) {
            viewport.style.maxHeight = typeof maxHeight === 'number' ? `${maxHeight}px` : String(maxHeight);
        }

        const appendContent = (value) => {
            viewport.innerHTML = '';
            if (value === null || value === undefined) return;
            if (typeof value === 'string') {
                viewport.innerHTML = value;
                return;
            }
            viewport.appendChild(value);
        };
        appendContent(content);

        const SCROLLBAR_HIDE_DELAY = 4000;
        const BOUNCE_MAX_OFFSET = 22;
        const BOUNCE_MAX_VELOCITY = 10;
        const BOUNCE_IMPULSE_FACTOR = 0.022;
        const BOUNCE_IMPULSE_MAX = 4.8;
        const BOUNCE_SPRING = 0.17;
        const BOUNCE_DAMPING = 0.8;
        const BOUNCE_REST_OFFSET = 0.08;
        const BOUNCE_REST_VELOCITY = 0.08;
        const useTranslate = ('translate' in viewport.style);

        let hideTimer = null;
        let dragging = false;
        let dragStartY = 0;
        let dragStartScroll = 0;
        let bounceOffset = 0;
        let bounceVelocity = 0;
        let bounceRafId = 0;

        const getMetrics = () => {
            const viewportHeight = viewport.clientHeight;
            const scrollHeight = viewport.scrollHeight;
            const maxScroll = Math.max(0, scrollHeight - viewportHeight);
            return { viewportHeight, scrollHeight, maxScroll };
        };

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const applyBounceOffset = () => {
            if (Math.abs(bounceOffset) < 0.01) {
                if (useTranslate) {
                    viewport.style.translate = '';
                } else {
                    viewport.style.transform = '';
                }
                viewport.style.willChange = '';
                return;
            }
            viewport.style.willChange = 'transform';
            if (useTranslate) {
                viewport.style.translate = `0 ${bounceOffset.toFixed(3)}px`;
            } else {
                viewport.style.transform = `translate3d(0, ${bounceOffset.toFixed(3)}px, 0)`;
            }
        };

        const stopBounce = () => {
            if (bounceRafId) {
                cancelAnimationFrame(bounceRafId);
                bounceRafId = 0;
            }
            bounceOffset = 0;
            bounceVelocity = 0;
            applyBounceOffset();
        };

        const startBounceLoop = () => {
            if (bounceRafId) return;
            const tick = () => {
                if (!viewport.isConnected) {
                    stopBounce();
                    return;
                }
                const prevOffset = bounceOffset;
                bounceVelocity += (-bounceOffset) * BOUNCE_SPRING;
                bounceVelocity *= BOUNCE_DAMPING;
                const nextOffset = clamp(bounceOffset + bounceVelocity, -BOUNCE_MAX_OFFSET, BOUNCE_MAX_OFFSET);
                const crossedZero = (prevOffset > 0 && nextOffset < 0) || (prevOffset < 0 && nextOffset > 0);
                if (crossedZero) {
                    stopBounce();
                    return;
                }
                bounceOffset = nextOffset;
                applyBounceOffset();

                if (Math.abs(bounceOffset) <= BOUNCE_REST_OFFSET && Math.abs(bounceVelocity) <= BOUNCE_REST_VELOCITY) {
                    stopBounce();
                    return;
                }
                bounceRafId = requestAnimationFrame(tick);
            };
            bounceRafId = requestAnimationFrame(tick);
        };

        const pushBounceImpulse = (deltaY) => {
            const impulse = clamp(-deltaY * BOUNCE_IMPULSE_FACTOR, -BOUNCE_IMPULSE_MAX, BOUNCE_IMPULSE_MAX);
            bounceVelocity = clamp(bounceVelocity + impulse, -BOUNCE_MAX_VELOCITY, BOUNCE_MAX_VELOCITY);
            bounceOffset = clamp(bounceOffset + impulse * 0.55, -BOUNCE_MAX_OFFSET, BOUNCE_MAX_OFFSET);
            applyBounceOffset();
            startBounceLoop();
        };

        const refresh = () => {
            const { viewportHeight, scrollHeight, maxScroll } = getMetrics();
            if (scrollHeight <= viewportHeight + 1 || viewportHeight <= 0) {
                area.classList.add('no-scroll');
                thumb.style.height = '0px';
                thumb.style.transform = 'translateY(0)';
                return;
            }

            area.classList.remove('no-scroll');
            const thumbHeight = Math.max(minThumbSize, Math.round((viewportHeight / scrollHeight) * viewportHeight));
            thumb.style.height = `${Math.min(viewportHeight, thumbHeight)}px`;

            const trackRange = Math.max(1, viewportHeight - thumb.offsetHeight);
            const thumbTop = (viewport.scrollTop / maxScroll) * trackRange;
            thumb.style.transform = `translateY(${thumbTop}px)`;
        };

        const markScrolling = () => {
            area.classList.add('scrolling');
            clearTimeout(hideTimer);
            if (alwaysVisible) return;
            hideTimer = setTimeout(() => area.classList.remove('scrolling'), SCROLLBAR_HIDE_DELAY);
        };

        const setScrollByThumbTop = (top) => {
            const { viewportHeight, maxScroll } = getMetrics();
            if (maxScroll <= 0) return;
            const trackRange = Math.max(1, viewportHeight - thumb.offsetHeight);
            const clampedTop = Math.min(trackRange, Math.max(0, top));
            viewport.scrollTop = (clampedTop / trackRange) * maxScroll;
        };

        const onPointerMove = (e) => {
            if (!dragging) return;
            const delta = e.clientY - dragStartY;
            const { viewportHeight, maxScroll } = getMetrics();
            if (maxScroll <= 0) return;
            const trackRange = Math.max(1, viewportHeight - thumb.offsetHeight);
            const nextScroll = dragStartScroll + (delta / trackRange) * maxScroll;
            viewport.scrollTop = Math.min(maxScroll, Math.max(0, nextScroll));
        };

        const stopDrag = () => {
            if (!dragging) return;
            dragging = false;
            area.classList.remove('dragging');
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', stopDrag);
        };

        thumb.addEventListener('pointerdown', (e) => {
            if (area.classList.contains('no-scroll')) return;
            e.preventDefault();
            dragging = true;
            dragStartY = e.clientY;
            dragStartScroll = viewport.scrollTop;
            area.classList.add('dragging');
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', stopDrag, { once: true });
        });

        rail.addEventListener('mousedown', (e) => {
            if (e.target === thumb || area.classList.contains('no-scroll')) return;
            const railRect = rail.getBoundingClientRect();
            const targetTop = e.clientY - railRect.top - thumb.offsetHeight / 2;
            setScrollByThumbTop(targetTop);
        });

        const onWheel = (e) => {
            if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
            const { maxScroll } = getMetrics();
            if (maxScroll <= 0) return;

            const atTop = viewport.scrollTop <= 0;
            const atBottom = viewport.scrollTop >= maxScroll - 1;
            if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
                e.preventDefault();
                pushBounceImpulse(e.deltaY);
                markScrolling();
                return;
            }

            markScrolling();
        };

        viewport.addEventListener('wheel', onWheel, { passive: false });

        viewport.addEventListener('scroll', () => {
            refresh();
            markScrolling();
        });

        const onResize = () => refresh();
        window.addEventListener('resize', onResize);

        let resizeObserver = null;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => refresh());
            resizeObserver.observe(viewport);
        }

        let mutationObserver = null;
        if (typeof MutationObserver !== 'undefined') {
            mutationObserver = new MutationObserver(() => refresh());
            mutationObserver.observe(viewport, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }

        area.getViewport = () => viewport;
        area.setContent = (nextContent) => {
            appendContent(nextContent);
            refresh();
        };
        area.refresh = refresh;
        area.destroy = () => {
            stopDrag();
            clearTimeout(hideTimer);
            stopBounce();
            viewport.removeEventListener('wheel', onWheel);
            window.removeEventListener('resize', onResize);
            if (resizeObserver) resizeObserver.disconnect();
            if (mutationObserver) mutationObserver.disconnect();
        };

        requestAnimationFrame(refresh);
        return area;
    },

    // ============ 右键菜单 ============
    ContextMenu(opts = {}) {
        const { items = [], id = null, className = '' } = opts;
        const menu = this._utils.createElement('div', { className: this._utils.classNames('fluent-context-menu', className), id: id || this._utils.generateId('ctx-menu') });
        items.forEach(item => {
            if (item.separator) { menu.appendChild(this._utils.createElement('div', { className: 'fluent-context-menu-separator' })); return; }
            const el = this._utils.createElement('div', { className: this._utils.classNames('fluent-context-menu-item', item.disabled && 'disabled'), data: { action: item.action || item.id } });
            el.innerHTML = (item.icon ? `<img src="${this._utils.getIconPath(item.icon)}" alt="">` : '') + `<span>${item.label}</span>`;
            if (!item.disabled && item.onClick) el.addEventListener('click', () => { item.onClick(item); menu.hide(); });
            menu.appendChild(el);
        });
        menu.hide = () => menu.classList.add('hidden');
        menu.show = (x, y) => { menu.classList.remove('hidden'); const rect = menu.getBoundingClientRect(); menu.style.left = `${Math.min(x, window.innerWidth - rect.width - 4)}px`; menu.style.top = `${Math.min(y, window.innerHeight - rect.height - 4)}px`; };
        menu.classList.add('hidden');
        return menu;
    },

    // ============ 模态对话框 ============
    Modal(opts = {}) {
        const { title = '', content = '', buttons = [], closable = true, width = '400px', onClose = null, id = null, className = '' } = opts;
        const overlay = this._utils.createElement('div', { className: this._utils.classNames('fluent-modal-overlay', className), id });
        const modal = this._utils.createElement('div', { className: 'fluent-modal', styles: { width } });
        
        let html = '<div class="fluent-modal-header">';
        html += `<span class="fluent-modal-title">${title}</span>`;
        if (closable) html += `<button type="button" class="fluent-modal-close"><img src="${this._utils.getIconPath('Cancel')}" alt="关闭"></button>`;
        html += '</div>';
        html += `<div class="fluent-modal-content">${typeof content === 'string' ? content : ''}</div>`;
        if (buttons.length > 0) {
            html += '<div class="fluent-modal-footer">';
            buttons.forEach((btn, i) => { html += `<button type="button" class="fluent-btn fluent-btn-${btn.variant || (i === buttons.length - 1 ? 'primary' : 'secondary')}" data-btn-idx="${i}">${btn.text}</button>`; });
            html += '</div>';
        }
        modal.innerHTML = html;
        
        if (typeof content !== 'string') modal.querySelector('.fluent-modal-content').appendChild(content);
        
        const close = () => { overlay.classList.add('closing'); setTimeout(() => overlay.remove(), 200); onClose && onClose(); };
        if (closable) { modal.querySelector('.fluent-modal-close').addEventListener('click', close); overlay.addEventListener('click', e => { if (e.target === overlay) close(); }); }
        buttons.forEach((btn, i) => { modal.querySelector(`[data-btn-idx="${i}"]`).addEventListener('click', () => { btn.onClick && btn.onClick(); if (btn.closeOnClick !== false) close(); }); });
        
        overlay.appendChild(modal);
        overlay.close = close;
        overlay.show = () => document.body.appendChild(overlay);
        return overlay;
    },

    // ============ 卡片 ============
    Card(opts = {}) {
        const { title = '', content = '', footer = '', hoverable = false, id = null, className = '' } = opts;
        const card = this._utils.createElement('div', { className: this._utils.classNames('fluent-card', hoverable && 'fluent-card-hoverable', className), id });
        let html = '';
        if (title) html += `<div class="fluent-card-header"><span class="fluent-card-title">${title}</span></div>`;
        html += `<div class="fluent-card-body">${typeof content === 'string' ? content : ''}</div>`;
        if (footer) html += `<div class="fluent-card-footer">${footer}</div>`;
        card.innerHTML = html;
        if (typeof content !== 'string') card.querySelector('.fluent-card-body').appendChild(content);
        return card;
    },

    // ============ 列表 ============
    List(opts = {}) {
        const { items = [], onItemClick = null, selectable = false, activeItem = null, id = null, className = '' } = opts;
        const list = this._utils.createElement('div', { className: this._utils.classNames('fluent-list', selectable && 'fluent-list-selectable', className), id });
        items.forEach(item => {
            const el = this._utils.createElement('div', { className: this._utils.classNames('fluent-list-item', item.id === activeItem && 'active'), data: { id: item.id } });
            let html = '';
            if (item.icon) html += `<img src="${this._utils.getIconPath(item.icon)}" class="fluent-list-item-icon" alt="">`;
            html += '<div class="fluent-list-item-content">';
            html += `<div class="fluent-list-item-title">${item.title || item.label}</div>`;
            if (item.description) html += `<div class="fluent-list-item-desc">${item.description}</div>`;
            html += '</div>';
            if (item.extra) html += `<div class="fluent-list-item-extra">${item.extra}</div>`;
            el.innerHTML = html;
            el.addEventListener('click', () => onItemClick && onItemClick(item.id, item));
            list.appendChild(el);
        });
        return list;
    },

    // ============ 进度条 ============
    Progress(opts = {}) {
        const { value = 0, max = 100, showLabel = false, variant = 'default', id = null, className = '' } = opts;
        const wrapper = this._utils.createElement('div', { className: this._utils.classNames('fluent-progress', `fluent-progress-${variant}`, className), id });
        const track = this._utils.createElement('div', { className: 'fluent-progress-track' });
        const bar = this._utils.createElement('div', { className: 'fluent-progress-bar', styles: { width: `${(value / max) * 100}%` } });
        track.appendChild(bar);
        wrapper.appendChild(track);
        if (showLabel) wrapper.appendChild(this._utils.createElement('span', { className: 'fluent-progress-label', text: `${Math.round((value / max) * 100)}%` }));
        wrapper.setValue = v => { bar.style.width = `${(v / max) * 100}%`; const label = wrapper.querySelector('.fluent-progress-label'); if (label) label.textContent = `${Math.round((v / max) * 100)}%`; };
        return wrapper;
    },

    // ============ 加载指示器 ============
    Spinner(opts = {}) {
        const { size = 'medium', id = null, className = '' } = opts;
        return this._utils.createElement('div', { className: this._utils.classNames('fluent-spinner', `fluent-spinner-${size}`, className), id });
    },

    // ============ 设置项组件 ============
    SettingItem(opts = {}) {
        const { label = '', description = '', control = null, id = null, className = '' } = opts;
        const item = this._utils.createElement('div', { className: this._utils.classNames('fluent-setting-item', className), id });
        item.innerHTML = `<div class="fluent-setting-item-info"><div class="fluent-setting-item-label">${label}</div>${description ? `<div class="fluent-setting-item-desc">${description}</div>` : ''}</div><div class="fluent-setting-item-control"></div>`;
        if (control) item.querySelector('.fluent-setting-item-control').appendChild(control);
        return item;
    },

    // ============ 空状态 ============
    Empty(opts = {}) {
        const { icon = 'Information Circle', title = '暂无数据', description = '', id = null, className = '' } = opts;
        const empty = this._utils.createElement('div', { className: this._utils.classNames('fluent-empty', className), id });
        empty.innerHTML = `<img src="${this._utils.getIconPath(icon)}" class="fluent-empty-icon" alt=""><div class="fluent-empty-title">${title}</div>${description ? `<div class="fluent-empty-desc">${description}</div>` : ''}`;
        return empty;
    },

    // ============ 警告框/对话框 ============
    Dialog(opts = {}) {
        const { 
            type = 'info',  // 'info' | 'warning' | 'error'
            title = '',
            content = '',
            buttons = [{ text: '确定', variant: 'primary' }],  // 支持1-3个按钮
            onClose = null,
            closeOnOverlay = true
        } = opts;
        
        // 类型对应的图标和标题
        const typeConfig = {
            info: { icon: 'Information Circle', defaultTitle: '提示' },
            warning: { icon: 'Exclamation Triangle', defaultTitle: '警告' },
            error: { icon: 'Cancel Circle', defaultTitle: '错误' }
        };
        const config = typeConfig[type] || typeConfig.info;
        const dialogTitle = title || config.defaultTitle;
        
        // 创建遮罩层
        const overlay = this._utils.createElement('div', { className: 'fluent-dialog-overlay' });
        
        // 创建对话框
        const dialog = this._utils.createElement('div', { 
            className: this._utils.classNames('fluent-dialog', `fluent-dialog-${type}`)
        });
        
        // 对话框内容
        dialog.innerHTML = `
            <div class="fluent-dialog-header">
                <img src="${this._utils.getIconPath(config.icon)}" class="fluent-dialog-icon" alt="">
                <span class="fluent-dialog-title">${dialogTitle}</span>
            </div>
            <div class="fluent-dialog-content">${content}</div>
            <div class="fluent-dialog-footer"></div>
        `;
        
        const footer = dialog.querySelector('.fluent-dialog-footer');
        
        // 关闭对话框的方法
        const close = (result) => {
            overlay.classList.add('fluent-dialog-closing');
            dialog.classList.add('fluent-dialog-closing');
            setTimeout(() => {
                overlay.remove();
                if (onClose) onClose(result);
            }, 200);
        };
        
        // 添加按钮
        buttons.slice(0, 3).forEach((btn, index) => {
            const button = this.Button({
                text: btn.text || '按钮',
                variant: btn.variant || (index === 0 ? 'primary' : 'secondary'),
                onClick: () => close(btn.value !== undefined ? btn.value : index)
            });
            footer.appendChild(button);
        });
        
        // 点击遮罩关闭
        if (closeOnOverlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close(null);
            });
        }
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // 触发动画
        requestAnimationFrame(() => {
            overlay.classList.add('fluent-dialog-visible');
            dialog.classList.add('fluent-dialog-visible');
        });
        
        return { close, overlay, dialog };
    },

    // ============ 输入对话框 ============
    InputDialog(opts = {}) {
        const {
            title = '输入',
            placeholder = '',
            defaultValue = '',
            inputType = 'text',  // 'text' | 'password' | 'number'
            maxLength = null,
            minLength = null,
            validateFn = null,  // 自定义验证函数
            errorMessage = '输入无效',
            confirmText = '确定',
            cancelText = '取消',
            onConfirm = null,
            onCancel = null,
            closeOnOverlay = true
        } = opts;
        
        // 创建遮罩层
        const overlay = this._utils.createElement('div', { className: 'fluent-dialog-overlay' });
        
        // 创建对话框
        const dialog = this._utils.createElement('div', { 
            className: 'fluent-dialog fluent-input-dialog'
        });
        
        // 对话框内容
        dialog.innerHTML = `
            <div class="fluent-dialog-header">
                <span class="fluent-dialog-title">${title}</span>
            </div>
            <div class="fluent-dialog-content">
                <div class="fluent-input-wrapper">
                    <input type="${inputType}" 
                           class="fluent-input-dialog-input" 
                           placeholder="${placeholder}"
                           value="${defaultValue}"
                           ${maxLength ? `maxlength="${maxLength}"` : ''}
                           ${minLength ? `minlength="${minLength}"` : ''}>
                    <div class="fluent-input-error" style="display: none;">${errorMessage}</div>
                </div>
            </div>
            <div class="fluent-dialog-footer"></div>
        `;
        
        const input = dialog.querySelector('.fluent-input-dialog-input');
        const errorEl = dialog.querySelector('.fluent-input-error');
        const footer = dialog.querySelector('.fluent-dialog-footer');
        
        // 关闭对话框的方法
        const close = (confirmed, value) => {
            overlay.classList.add('fluent-dialog-closing');
            dialog.classList.add('fluent-dialog-closing');
            setTimeout(() => {
                overlay.remove();
                if (confirmed && onConfirm) {
                    onConfirm(value);
                } else if (!confirmed && onCancel) {
                    onCancel();
                }
            }, 200);
        };
        
        // 验证输入
        const validate = () => {
            const value = input.value.trim();
            
            // 检查最小长度
            if (minLength && value.length < minLength) {
                errorEl.textContent = `最少需要 ${minLength} 个字符`;
                errorEl.style.display = 'block';
                input.classList.add('error');
                return false;
            }
            
            // 自定义验证
            if (validateFn) {
                const result = validateFn(value);
                if (result !== true) {
                    errorEl.textContent = typeof result === 'string' ? result : errorMessage;
                    errorEl.style.display = 'block';
                    input.classList.add('error');
                    return false;
                }
            }
            
            errorEl.style.display = 'none';
            input.classList.remove('error');
            return true;
        };
        
        // 添加取消按钮
        footer.appendChild(this.Button({
            text: cancelText,
            variant: 'secondary',
            onClick: () => close(false)
        }));
        
        // 添加确定按钮
        footer.appendChild(this.Button({
            text: confirmText,
            variant: 'primary',
            onClick: () => {
                if (validate()) {
                    close(true, input.value.trim());
                }
            }
        }));
        
        // 输入时清除错误状态
        input.addEventListener('input', () => {
            errorEl.style.display = 'none';
            input.classList.remove('error');
        });
        
        // 回车确认
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (validate()) {
                    close(true, input.value.trim());
                }
            } else if (e.key === 'Escape') {
                close(false);
            }
        });
        
        // 点击遮罩关闭
        if (closeOnOverlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close(false);
            });
        }
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // 触发动画并聚焦输入框
        requestAnimationFrame(() => {
            overlay.classList.add('fluent-dialog-visible');
            dialog.classList.add('fluent-dialog-visible');
            input.focus();
            input.select();
        });
        
        return { close, overlay, dialog, input };
    },

    // ============ 通知组件 ============
    _toastContainer: null,
    
    Toast(opts = {}) {
        const {
            title = '',
            message = '',
            type = 'info',  // 'info' | 'success' | 'warning' | 'error'
            duration = 5000,  // 显示时间，毫秒
            icon = null,
            onClick = null
        } = opts;
        
        // 类型对应的图标
        const typeIcons = {
            info: 'Information Circle',
            success: 'Checkmark Circle',
            warning: 'Exclamation Triangle',
            error: 'Cancel Circle'
        };
        const toastIcon = icon || typeIcons[type] || typeIcons.info;
        
        // 创建或获取通知容器
        if (!this._toastContainer) {
            this._toastContainer = this._utils.createElement('div', { className: 'fluent-toast-container' });
            document.body.appendChild(this._toastContainer);
        }
        
        // 创建通知元素
        const toast = this._utils.createElement('div', {
            className: this._utils.classNames('fluent-toast', `fluent-toast-${type}`)
        });
        
        toast.innerHTML = `
            <div class="fluent-toast-icon">
                <img src="${this._utils.getIconPath(toastIcon)}" alt="">
            </div>
            <div class="fluent-toast-body">
                ${title ? `<div class="fluent-toast-title">${title}</div>` : ''}
                ${message ? `<div class="fluent-toast-message">${message}</div>` : ''}
            </div>
            <button type="button" class="fluent-toast-close">
                <img src="${this._utils.getIconPath('Cancel')}" alt="关闭">
            </button>
        `;
        
        // 关闭通知的方法
        const close = () => {
            toast.classList.add('fluent-toast-exit');
            setTimeout(() => {
                toast.remove();
                // 如果没有通知了，移除容器
                if (this._toastContainer && this._toastContainer.children.length === 0) {
                    this._toastContainer.remove();
                    this._toastContainer = null;
                }
            }, 300);
        };
        
        // 绑定关闭按钮
        toast.querySelector('.fluent-toast-close').addEventListener('click', (e) => {
            e.stopPropagation();
            close();
        });
        
        // 点击通知
        if (onClick) {
            toast.style.cursor = 'pointer';
            toast.addEventListener('click', () => {
                onClick();
                close();
            });
        }
        
        // 添加到容器
        this._toastContainer.appendChild(toast);
        
        // 触发入场动画
        requestAnimationFrame(() => {
            toast.classList.add('fluent-toast-enter');
        });
        
        // 自动关闭
        if (duration > 0) {
            setTimeout(close, duration);
        }
        
        return { close, element: toast };
    }
};

// 导出到全局
if (typeof window !== 'undefined') {
    window.FluentUI = FluentUI;
    FluentUI.initNativeScrollEffects();
}
