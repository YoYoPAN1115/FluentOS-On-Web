/**
 * 浏览器应用
 */
console.log('[BrowserApp] 浏览器应用脚本正在加载...');

const BrowserApp = {
    container: null,
    tabs: [],
    activeTabId: null,
    tabIdCounter: 0,

    init(windowId) {
        console.log('[浏览器] 开始初始化, windowId:', windowId);
        
        // 获取窗口内容容器
        const contentContainer = document.querySelector(`#${windowId}-content`);
        console.log('[浏览器] 找到容器:', contentContainer);
        
        if (!contentContainer) {
            console.error('[浏览器] 找不到窗口内容容器:', windowId);
            return;
        }
        
        this.container = contentContainer;
        this.tabs = [];
        this.activeTabId = null;
        this.tabIdCounter = 0;
        
        console.log('[浏览器] 开始渲染...');
        this.render();
        
        console.log('[浏览器] 创建新标签页...');
        this.createNewTab();
        
        console.log('[浏览器] 初始化完成');
    },

    render() {
        console.log('[浏览器] render() 被调用, container:', this.container);
        
        this.container.innerHTML = `
            <div class="browser-app">
                <div class="browser-header">
                    <!-- 标签栏 -->
                    <div class="browser-tabs-bar">
                        <div class="browser-tabs" id="browser-tabs"></div>
                        <button class="browser-new-tab-btn" id="browser-new-tab" title="${t('browser.new-tab')}">
                            <img src="Theme/Icon/Symbol_icon/stroke/Plus Circle.svg" alt="${t('browser.new-tab')}">
                        </button>
                    </div>
                    
                    <!-- 导航栏 -->
                    <div class="browser-navbar">
                        <div class="browser-nav-controls">
                            <button class="browser-nav-btn" id="browser-back" title="${t('browser.back')}" disabled>
                                <img src="Theme/Icon/Symbol_icon/stroke/Arrow Left.svg" alt="${t('browser.back')}">
                            </button>
                            <button class="browser-nav-btn" id="browser-forward" title="${t('browser.forward')}" disabled>
                                <img src="Theme/Icon/Symbol_icon/stroke/Arrow Right.svg" alt="${t('browser.forward')}">
                            </button>
                            <button class="browser-nav-btn" id="browser-refresh" title="${t('browser.refresh')}">
                                <img src="Theme/Icon/Symbol_icon/stroke/Refresh.svg" alt="${t('browser.refresh')}">
                            </button>
                            <button class="browser-nav-btn" id="browser-home" title="${t('browser.home')}">
                                <img src="Theme/Icon/Symbol_icon/stroke/Home.svg" alt="${t('browser.home')}">
                            </button>
                        </div>
                        
                        <div class="browser-address-bar">
                            <img src="Theme/Icon/Symbol_icon/stroke/Search.svg" alt="" class="address-bar-icon">
                            <input type="text" id="browser-address" placeholder="${t('browser.search.placeholder')}" spellcheck="false">
                        </div>
                        
                        <div class="browser-tools">
                            <button class="browser-tool-btn" id="browser-bookmark" title="${t('browser.bookmark')}">
                                <img src="Theme/Icon/Symbol_icon/stroke/Star.svg" alt="${t('browser.bookmark')}">
                            </button>
                            <button class="browser-tool-btn" id="browser-settings" title="${t('browser.settings')}">
                                <img src="Theme/Icon/Symbol_icon/stroke/Settings.svg" alt="${t('browser.settings')}">
                            </button>
                            <button class="browser-tool-btn" id="browser-profile" title="${t('browser.profile')}">
                                <img src="Theme/Icon/Symbol_icon/stroke/User Circle.svg" alt="${t('browser.profile')}">
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- 内容区域 -->
                <div class="browser-content" id="browser-content"></div>
            </div>
        `;

        console.log('[浏览器] 添加样式和绑定事件...');
        this.addStyles();
        this.bindEvents();
        console.log('[浏览器] render() 完成');
    },

    bindEvents() {
        console.log('[浏览器] 绑定事件...');
        
        // 新建标签页
        const newTabBtn = this.container.querySelector('#browser-new-tab');
        if (!newTabBtn) {
            console.error('[浏览器] 找不到新建标签页按钮');
            return;
        }
        newTabBtn.addEventListener('click', () => this.createNewTab());

        // 导航按钮
        const backBtn = this.container.querySelector('#browser-back');
        const forwardBtn = this.container.querySelector('#browser-forward');
        const refreshBtn = this.container.querySelector('#browser-refresh');
        const homeBtn = this.container.querySelector('#browser-home');

        backBtn.addEventListener('click', () => this.goBack());
        forwardBtn.addEventListener('click', () => this.goForward());
        refreshBtn.addEventListener('click', () => this.refresh());
        homeBtn.addEventListener('click', () => this.goHome());

        // 地址栏
        const addressBar = this.container.querySelector('#browser-address');
        addressBar.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.navigate(addressBar.value);
            }
        });

        // 工具按钮
        const bookmarkBtn = this.container.querySelector('#browser-bookmark');
        bookmarkBtn.addEventListener('click', () => {
            State.addNotification({
                title: t('browser.title'),
                message: t('browser.bookmark-coming'),
                type: 'info'
            });
        });
    },

    createNewTab(url = null) {
        console.log('[浏览器] 创建新标签页, url:', url);
        
        const tabId = `tab-${this.tabIdCounter++}`;
        const tab = {
            id: tabId,
            title: t('browser.new-tab'),
            url: url || 'about:blank',
            history: [],
            historyIndex: -1,
            favicon: 'Theme/Icon/Symbol_icon/stroke/Globe.svg'
        };

        this.tabs.push(tab);
        console.log('[浏览器] 标签页数量:', this.tabs.length);
        
        this.renderTabs();
        this.switchTab(tabId);

        if (url) {
            this.navigate(url);
        } else {
            console.log('[浏览器] 显示起始页...');
            this.showStartPage();
        }
    },

    renderTabs() {
        console.log('[浏览器] renderTabs() 被调用');
        
        const tabsContainer = this.container.querySelector('#browser-tabs');
        if (!tabsContainer) {
            console.error('[浏览器] 找不到标签页容器 #browser-tabs');
            return;
        }
        
        // 使用 FluentUI.TabBar 重新渲染标签栏
        tabsContainer.innerHTML = '';
        const tabBar = FluentUI.TabBar({
            tabs: this.tabs.map(tab => ({
                id: tab.id,
                label: tab.title,
                icon: 'Globe',
                closable: true
            })),
            activeTab: this.activeTabId,
            onTabChange: (tabId) => this.switchTab(tabId),
            onTabClose: (tabId) => this.closeTab(tabId)
        });
        // 只取里面的 tabs 容器部分
        const tabItems = tabBar.querySelector('.fluent-tabbar-tabs');
        if (tabItems) {
            tabsContainer.appendChild(tabItems.cloneNode(true));
            // 重新绑定事件
            tabsContainer.querySelectorAll('.fluent-tab').forEach(tabEl => {
                const tabId = tabEl.dataset.tabId;
                tabEl.addEventListener('click', (e) => {
                    if (!e.target.closest('.fluent-tab-close')) {
                        this.switchTab(tabId);
                    }
                });
                const closeBtn = tabEl.querySelector('.fluent-tab-close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.closeTab(tabId);
                    });
                }
            });
        }
    },

    switchTab(tabId) {
        this.activeTabId = tabId;
        this.renderTabs();
        this.renderContent();
        this.updateNavButtons();
        this.updateAddressBar();
    },

    closeTab(tabId) {
        const index = this.tabs.findIndex(t => t.id === tabId);
        if (index === -1) return;

        this.tabs.splice(index, 1);

        // 如果关闭的是当前标签页
        if (tabId === this.activeTabId) {
            if (this.tabs.length > 0) {
                // 切换到前一个或后一个标签页
                const newIndex = Math.max(0, index - 1);
                this.switchTab(this.tabs[newIndex].id);
            } else {
                // 没有标签页了，创建新标签页
                this.createNewTab();
            }
        }

        this.renderTabs();
    },

    getActiveTab() {
        return this.tabs.find(t => t.id === this.activeTabId);
    },

    navigate(input) {
        const tab = this.getActiveTab();
        if (!tab) return;

        let url = input.trim();
        
        // 判断是搜索还是URL
        if (!url) return;

        // 如果是about:blank，显示起始页
        if (url === 'about:blank' || url === '') {
            this.showStartPage();
            return;
        }

        // 简单的URL验证
        if (url.includes('.') && !url.includes(' ') && (url.startsWith('http://') || url.startsWith('https://') || url.match(/^[\w-]+\./))) {
            // 看起来像URL
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
        } else {
            // 作为搜索处理
            url = `https://www.bing.com/search?q=${encodeURIComponent(url)}`;
        }

        // 添加到历史记录
        tab.historyIndex++;
        tab.history = tab.history.slice(0, tab.historyIndex);
        tab.history.push(url);
        tab.url = url;

        // 更新标题（从URL提取域名）
        try {
            const urlObj = new URL(url);
            tab.title = urlObj.hostname.replace('www.', '') || t('browser.new-tab');
        } catch (e) {
            tab.title = t('browser.new-tab');
        }

        this.renderTabs();
        this.renderContent();
        this.updateNavButtons();
        this.updateAddressBar();
    },

    showStartPage() {
        console.log('[浏览器] showStartPage() 被调用');
        
        const tab = this.getActiveTab();
        console.log('[浏览器] 当前标签页:', tab);
        
        if (!tab) {
            console.error('[浏览器] 没有活动标签页');
            return;
        }

        tab.url = 'about:blank';
        tab.title = t('browser.new-tab');
        
        const contentContainer = this.container.querySelector('#browser-content');
        console.log('[浏览器] 内容容器:', contentContainer);
        contentContainer.innerHTML = `
            <div class="browser-start-page">
                <div class="start-page-logo">
                    <img src="Theme/Icon/Symbol_icon/stroke/Globe.svg" alt="" style="width: 60px; height: 60px; opacity: 0.6;">
                    <h1>Fluent Browser</h1>
                </div>
                
                <div class="start-page-search">
                    <img src="Theme/Icon/Symbol_icon/stroke/Search.svg" alt="" class="search-icon">
                    <input type="text" placeholder="${t('browser.search.placeholder')}" id="start-page-search" spellcheck="false">
                </div>
                
                <div class="start-page-shortcuts">
                    <div class="shortcut-item" data-url="https://www.bilibili.com">
                        <div class="shortcut-icon" style="background: #fb7299;">
                            <img src="Theme/Icon/Symbol_icon/stroke/Video.svg" alt="">
                        </div>
                        <span>${t('browser.shortcut-bilibili')}</span>
                    </div>
                    <div class="shortcut-item" data-url="https://www.cnblogs.com/">
                        <div class="shortcut-icon" style="background: #e5e5e5; color: #333; font-weight: 600; font-size: 20px; display: flex; align-items: center; justify-content: center;">
                            博
                        </div>
                        <span>${t('browser.shortcut-cnblogs')}</span>
                    </div>
                    <div class="shortcut-item" data-url="https://baike.baidu.com/">
                        <div class="shortcut-icon" style="background: #4e9ff5; color: #fff; font-weight: 600; font-size: 20px; display: flex; align-items: center; justify-content: center;">
                            科
                        </div>
                        <span>${t('browser.shortcut-baike')}</span>
                    </div>
                    <div class="shortcut-item add-shortcut">
                        <div class="shortcut-icon">
                            <img src="Theme/Icon/Symbol_icon/stroke/Add.svg" alt="">
                        </div>
                        <span>${t('browser.add-shortcut')}</span>
                    </div>
                </div>
            </div>
        `;

        // 绑定起始页事件
        const startSearch = contentContainer.querySelector('#start-page-search');
        if (startSearch) {
            startSearch.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.navigate(startSearch.value);
                }
            });
            startSearch.focus();
        }

        // 绑定快捷方式点击
        const shortcuts = contentContainer.querySelectorAll('.shortcut-item[data-url]');
        shortcuts.forEach(shortcut => {
            shortcut.addEventListener('click', () => {
                const url = shortcut.dataset.url;
                this.navigate(url);
            });
        });

        const addShortcut = contentContainer.querySelector('.add-shortcut');
        if (addShortcut) {
            addShortcut.addEventListener('click', () => {
                State.addNotification({
                    title: t('browser.title'),
                    message: t('browser.shortcut-coming'),
                    type: 'info'
                });
            });
        }

        this.updateAddressBar();
    },

    renderContent() {
        const tab = this.getActiveTab();
        if (!tab) return;

        const contentContainer = this.container.querySelector('#browser-content');

        if (tab.url === 'about:blank') {
            this.showStartPage();
            return;
        }

        // 使用iframe加载网页（禁止打开系统外部，始终内嵌浏览）
        contentContainer.innerHTML = `
            <iframe 
                src="${tab.url}" 
                class="browser-iframe"
                sandbox="allow-same-origin allow-scripts allow-forms allow-top-navigation"
            ></iframe>
        `;

        // 监听iframe加载
        const iframe = contentContainer.querySelector('iframe');
        iframe.addEventListener('load', () => {
            try {
                // 尝试获取页面标题（受同源策略限制）
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (iframeDoc.title) {
                    tab.title = iframeDoc.title;
                    this.renderTabs();
                }
            } catch (e) {
                // 跨域限制，无法访问
            }
        });
    },

    goBack() {
        const tab = this.getActiveTab();
        if (!tab || tab.historyIndex <= 0) return;

        tab.historyIndex--;
        tab.url = tab.history[tab.historyIndex];
        this.renderContent();
        this.updateNavButtons();
        this.updateAddressBar();
    },

    goForward() {
        const tab = this.getActiveTab();
        if (!tab || tab.historyIndex >= tab.history.length - 1) return;

        tab.historyIndex++;
        tab.url = tab.history[tab.historyIndex];
        this.renderContent();
        this.updateNavButtons();
        this.updateAddressBar();
    },

    refresh() {
        const tab = this.getActiveTab();
        if (!tab) return;

        if (tab.url === 'about:blank') {
            this.showStartPage();
        } else {
            this.renderContent();
        }
    },

    goHome() {
        const tab = this.getActiveTab();
        if (!tab) return;

        this.showStartPage();
    },

    updateNavButtons() {
        const tab = this.getActiveTab();
        const backBtn = this.container.querySelector('#browser-back');
        const forwardBtn = this.container.querySelector('#browser-forward');

        if (!tab) {
            backBtn.disabled = true;
            forwardBtn.disabled = true;
            return;
        }

        backBtn.disabled = tab.historyIndex <= 0;
        forwardBtn.disabled = tab.historyIndex >= tab.history.length - 1;
    },

    updateAddressBar() {
        const tab = this.getActiveTab();
        const addressBar = this.container.querySelector('#browser-address');

        if (!tab) {
            addressBar.value = '';
            return;
        }

        if (tab.url === 'about:blank') {
            addressBar.value = '';
        } else {
            addressBar.value = tab.url;
        }
    },

    addStyles() {
        if (document.getElementById('browser-app-styles')) {
            console.log('[浏览器] 样式已存在，跳过');
            return;
        }
        
        console.log('[浏览器] 添加样式...');

        const style = document.createElement('style');
        style.id = 'browser-app-styles';
        style.textContent = `
            /* ============ 浏览器应用样式 ============ */
            .browser-app {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                background: var(--bg-secondary);
            }

            /* 浏览器头部 */
            .browser-header {
                background: var(--bg-secondary);
                border-bottom: 1px solid var(--border-color);
            }

            /* 标签栏 */
            .browser-tabs-bar {
                display: flex;
                align-items: center;
                padding: 8px 8px 0 8px;
                gap: 4px;
            }

            .browser-tabs {
                display: flex;
                gap: 2px;
                flex: 1;
                overflow-x: auto;
                scrollbar-width: none;
            }

            .browser-tabs::-webkit-scrollbar {
                display: none;
            }

            .browser-tab {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.05);
                border-radius: 8px 8px 0 0;
                min-width: 160px;
                max-width: 240px;
                cursor: pointer;
                transition: background var(--transition-fast);
                position: relative;
            }

            .dark-mode .browser-tab {
                background: rgba(255, 255, 255, 0.05);
            }

            .browser-tab:hover {
                background: rgba(0, 0, 0, 0.08);
            }

            .dark-mode .browser-tab:hover {
                background: rgba(255, 255, 255, 0.08);
            }

            .browser-tab.active {
                background: var(--bg-primary);
            }

            .tab-favicon {
                width: 16px;
                height: 16px;
                flex-shrink: 0;
            }

            .tab-title {
                flex: 1;
                font-size: 13px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .tab-close {
                width: 20px;
                height: 20px;
                border-radius: 4px;
                background: transparent;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: all var(--transition-fast);
                flex-shrink: 0;
            }

            .browser-tab:hover .tab-close {
                opacity: 1;
            }

            .tab-close:hover {
                background: rgba(0, 0, 0, 0.1);
            }

            .dark-mode .tab-close:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .tab-close img {
                width: 12px;
                height: 12px;
            }

            .browser-new-tab-btn {
                width: 32px;
                height: 32px;
                border-radius: 6px;
                background: transparent;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background var(--transition-fast);
            }

            .browser-new-tab-btn:hover {
                background: rgba(0, 0, 0, 0.05);
            }

            .dark-mode .browser-new-tab-btn:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .browser-new-tab-btn img {
                width: 16px;
                height: 16px;
            }

            /* 导航栏 */
            .browser-navbar {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
            }

            .browser-nav-controls {
                display: flex;
                gap: 4px;
            }

            .browser-nav-btn {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                background: transparent;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background var(--transition-fast);
            }

            .browser-nav-btn:hover:not(:disabled) {
                background: rgba(0, 0, 0, 0.05);
            }

            .dark-mode .browser-nav-btn:hover:not(:disabled) {
                background: rgba(255, 255, 255, 0.1);
            }

            .browser-nav-btn:disabled {
                opacity: 0.3;
                cursor: not-allowed;
            }

            .browser-nav-btn img {
                width: 18px;
                height: 18px;
            }

            /* 地址栏 */
            .browser-address-bar {
                flex: 1;
                display: flex;
                align-items: center;
                gap: 8px;
                background: var(--bg-tertiary);
                border-radius: 20px;
                padding: 0 16px;
                height: 40px;
            }

            .address-bar-icon {
                width: 16px;
                height: 16px;
                opacity: 0.5;
            }

            #browser-address {
                flex: 1;
                background: transparent;
                border: none;
                outline: none;
                font-size: 14px;
                color: var(--text-primary);
            }

            #browser-address::placeholder {
                color: var(--text-secondary);
            }

            /* 工具栏 */
            .browser-tools {
                display: flex;
                gap: 4px;
            }

            .browser-tool-btn {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                background: transparent;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background var(--transition-fast);
            }

            .browser-tool-btn:hover {
                background: rgba(0, 0, 0, 0.05);
            }

            .dark-mode .browser-tool-btn:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .browser-tool-btn img {
                width: 18px;
                height: 18px;
            }

            /* 内容区域 */
            .browser-content {
                flex: 1;
                background: var(--bg-primary);
                overflow: hidden;
                position: relative;
            }

            .browser-iframe {
                width: 100%;
                height: 100%;
                border: none;
                background: #fff;
            }

            /* 起始页 */
            .browser-start-page {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 80px 20px 20px;
                overflow-y: auto;
            }

            .start-page-logo {
                text-align: center;
                margin-bottom: 40px;
            }

            .start-page-logo h1 {
                font-size: 28px;
                font-weight: 600;
                margin-top: 16px;
                color: var(--text-primary);
            }

            .start-page-search {
                width: 100%;
                max-width: 600px;
                display: flex;
                align-items: center;
                gap: 12px;
                background: var(--bg-tertiary);
                border-radius: 24px;
                padding: 0 24px;
                height: 48px;
                margin-bottom: 60px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .start-page-search .search-icon {
                width: 20px;
                height: 20px;
                opacity: 0.5;
            }

            #start-page-search {
                flex: 1;
                background: transparent;
                border: none;
                outline: none;
                font-size: 16px;
                color: var(--text-primary);
            }

            #start-page-search::placeholder {
                color: var(--text-secondary);
            }

            .start-page-shortcuts {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                gap: 24px;
                max-width: 800px;
                width: 100%;
            }

            .shortcut-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
                cursor: pointer;
                padding: 16px;
                border-radius: 12px;
                transition: background var(--transition-fast);
            }

            .shortcut-item:hover {
                background: rgba(0, 0, 0, 0.03);
            }

            .dark-mode .shortcut-item:hover {
                background: rgba(255, 255, 255, 0.05);
            }

            .shortcut-icon {
                width: 60px;
                height: 60px;
                border-radius: 12px;
                background: var(--bg-tertiary);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .shortcut-icon img {
                width: 28px;
                height: 28px;
            }

            .shortcut-item span {
                font-size: 13px;
                color: var(--text-primary);
                text-align: center;
            }

            .add-shortcut .shortcut-icon {
                background: transparent;
                border: 2px dashed var(--border-color);
            }

            /* 自定义滚动条样式（与通知中心一致） */
            .browser-app *::-webkit-scrollbar {
                width: 6px;
                height: 6px;
            }

            .browser-app *::-webkit-scrollbar-track {
                background: transparent;
            }

            .browser-app *::-webkit-scrollbar-thumb {
                background: var(--text-tertiary);
                border-radius: 3px;
            }

            .browser-app *::-webkit-scrollbar-thumb:hover {
                background: var(--text-secondary);
            }

            /* Firefox 滚动条 */
            .browser-app * {
                scrollbar-width: thin;
                scrollbar-color: var(--text-tertiary) transparent;
            }
        `;
        document.head.appendChild(style);
    }
};

console.log('[BrowserApp] 浏览器应用对象已定义');
console.log('[BrowserApp] 方法检查:', {
    init: typeof BrowserApp.init,
    render: typeof BrowserApp.render,
    createNewTab: typeof BrowserApp.createNewTab
});

// 确保暴露到全局
if (typeof window !== 'undefined') {
    window.BrowserApp = BrowserApp;
    console.log('[BrowserApp] 已暴露到 window.BrowserApp');
}

