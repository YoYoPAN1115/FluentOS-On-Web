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
    Button(opts = {}) {
        const { text = '', variant = 'secondary', size = 'medium', icon = null, iconPosition = 'left',
                disabled = false, loading = false, onClick = null, id = null, className = '' } = opts;
        const btn = this._utils.createElement('button', {
            className: this._utils.classNames('fluent-btn', `fluent-btn-${variant}`, `fluent-btn-${size}`, loading && 'fluent-btn-loading', className),
            id
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
            id, attrs: { title }
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
            if (tab.closable !== false) content += `<button class="fluent-tab-close" data-tab-id="${tab.id}"><img src="${this._utils.getIconPath('Cancel')}" alt="关闭"></button>`;
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
            const clearBtn = this._utils.createElement('button', { className: 'fluent-input-clear', html: `<img src="${this._utils.getIconPath('Cancel')}" alt="清除">`, styles: { display: value ? 'flex' : 'none' } });
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
        if (closable) html += `<button class="fluent-modal-close"><img src="${this._utils.getIconPath('Cancel')}" alt="关闭"></button>`;
        html += '</div>';
        html += `<div class="fluent-modal-content">${typeof content === 'string' ? content : ''}</div>`;
        if (buttons.length > 0) {
            html += '<div class="fluent-modal-footer">';
            buttons.forEach((btn, i) => { html += `<button class="fluent-btn fluent-btn-${btn.variant || (i === buttons.length - 1 ? 'primary' : 'secondary')}" data-btn-idx="${i}">${btn.text}</button>`; });
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
            <button class="fluent-toast-close">
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
if (typeof window !== 'undefined') window.FluentUI = FluentUI;
