/**
 * 开始菜单模块
 */
const StartMenu = {
    element: null,
    appsGrid: null,
    searchInput: null,
    powerBtn: null,
    powerMenu: null,
    isOpen: false,
    recentContainer: null,

    init() {
        this.element = document.getElementById('start-menu');
        this.appsGrid = document.getElementById('start-apps-grid');
        this.searchInput = document.getElementById('start-search-input');
        this.powerBtn = document.getElementById('power-btn');
        this.powerMenu = document.getElementById('power-menu');
        this.recentContainer = document.getElementById('start-recent-items');

        this.renderApps();
        this.bindEvents();
        this.updateLanguage();
        this.renderRecent();
        
        // 监听语言切换
        State.on('languageChange', () => {
            this.updateLanguage();
        });

        // 监听文件系统变化，实时刷新推荐
        State.on('fsChange', () => this.renderRecent());
        // 记事本保存等会更新 modified 时间
        State.on('notificationAdd', () => this.renderRecent());
        
        // 监听应用修复状态变化
        State.on('appRepairStart', (appId) => {
            this.updateAppRepairState(appId, true);
        });
        State.on('appRepairEnd', (appId) => {
            this.updateAppRepairState(appId, false);
        });
    },
    
    // 更新应用修复状态
    updateAppRepairState(appId, isRepairing) {
        const appEl = this.appsGrid.querySelector(`.start-app[data-app-id="${appId}"]`);
        if (appEl) {
            if (isRepairing) {
                appEl.classList.add('repairing');
                appEl.style.opacity = '0.4';
                appEl.style.filter = 'grayscale(100%)';
                appEl.style.pointerEvents = 'none';
            } else {
                appEl.classList.remove('repairing');
                appEl.style.opacity = '';
                appEl.style.filter = '';
                appEl.style.pointerEvents = '';
            }
        }
    },
    
    updateLanguage() {
        // 更新搜索框占位符
        if (this.searchInput) {
            this.searchInput.placeholder = t('start.search.placeholder');
        }
        
        // 更新开始菜单标题
        const pinnedTitle = document.getElementById('start-pinned-title');
        if (pinnedTitle) pinnedTitle.textContent = t('start.pinned');
        
        const allAppsText = document.getElementById('start-all-apps-text');
        if (allAppsText) allAppsText.textContent = t('start.all-apps');
        
        const recommendedTitle = document.getElementById('start-recommended-title');
        if (recommendedTitle) recommendedTitle.textContent = t('start.recommended');
        
        const moreText = document.getElementById('start-more-text');
        if (moreText) moreText.textContent = t('start.more');
        
        const picturesText = document.getElementById('start-pictures-text');
        if (picturesText) picturesText.textContent = t('start.pictures');
        
        const downloadsText = document.getElementById('start-downloads-text');
        if (downloadsText) downloadsText.textContent = t('start.downloads');
        
        // 更新电源菜单
        const shutdownText = document.getElementById('power-shutdown-text');
        if (shutdownText) shutdownText.textContent = t('start.power.shutdown');
        
        const restartText = document.getElementById('power-restart-text');
        if (restartText) restartText.textContent = t('start.power.restart');
        
        const logoutText = document.getElementById('power-logout-text');
        if (logoutText) logoutText.textContent = t('start.power.logout');

        this.renderApps();
    },

    renderApps() {
        this.appsGrid.innerHTML = '';
        
        // 渲染所有应用
        Desktop.apps.forEach(app => {
            const appElement = document.createElement('div');
            appElement.className = 'start-app';
            appElement.dataset.appId = app.id;
            const name = Desktop.getAppName(app);
            appElement.innerHTML = `
                <img src="${app.icon}" alt="${name}">
                <span>${name}</span>
            `;
            this.appsGrid.appendChild(appElement);
        });
    },

    bindEvents() {
        // 应用点击
        this.appsGrid.addEventListener('click', (e) => {
            const appEl = e.target.closest('.start-app');
            if (appEl) {
                const appId = appEl.dataset.appId;
                
                // 检查应用是否正在修复
                if (typeof SettingsApp !== 'undefined' && SettingsApp.isAppRepairing(appId)) {
                    FluentUI.Toast({
                        title: t('start.ctx.app-repairing'),
                        message: t('start.ctx.app-repairing-msg'),
                        type: 'warning'
                    });
                    return;
                }
                
                // 直接打开应用（PWA 应用已注册到 WindowManager）
                WindowManager.openApp(appId);
                this.close();
            }
        });

        // 应用右键菜单
        this.appsGrid.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const app = e.target.closest('.start-app');
            if (app) {
                const appId = app.dataset.appId;
                this.showAppContextMenu(e, appId);
            }
        });

        // 搜索功能
        this.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            this.filterApps(query);
        });

        // 电源按钮
        this.powerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePowerMenu();
        });

        // 电源菜单项
        this.powerMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.power-menu-item');
            if (item) {
                const action = item.dataset.action;
                this.handlePowerAction(action);
            }
        });

        // Win 键支持
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Meta' || e.key === 'OS') {
                e.preventDefault();
                this.toggle();
            }
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target) && 
                !e.target.closest('#start-btn')) {
                this.close();
            }
            if (!this.powerMenu.contains(e.target) && 
                !e.target.closest('#power-btn')) {
                this.closePowerMenu();
            }
        });

        // 推荐区域右键菜单
        if (this.recentContainer) {
            this.recentContainer.addEventListener('contextmenu', (e) => {
                const item = e.target.closest('.recent-item');
                if (!item) return;
                e.preventDefault();
                const id = item.dataset.id || item.dataset.fileId; // 兼容
                this.showRecentContextMenu(e.clientX, e.clientY, id);
            });

            // 点击打开推荐项
            this.recentContainer.addEventListener('click', (e) => {
                const item = e.target.closest('.recent-item');
                if (!item) return;
                const id = item.dataset.id || item.dataset.fileId; // 兼容
                const node = State.findNode(id);
                if (!node) return;
                if (node.type === 'file') {
                    // 打开文件
                    WindowManager.openApp('notes', { fileId: id });
                    this.close();
                } else if (node.type === 'folder') {
                    // 打开文件夹
                    WindowManager.openApp('files');
                    setTimeout(() => {
                        if (typeof FilesApp !== 'undefined' && FilesApp.navigateToId) {
                            FilesApp.navigateToId(id);
                        }
                    }, 100);
                    this.close();
                }
            });
        }
    },

    renderRecent() {
        if (!this.recentContainer) return;
        const list = RecentFiles.getRecentFiles();
        if (!list || list.length === 0) {
            this.recentContainer.innerHTML = `<div style="color: var(--text-tertiary); padding: 12px 0;">${t('notification.empty')}</div>`;
            return;
        }
        this.recentContainer.innerHTML = list.map(f => `
            <div class="recent-item" data-id="${f.id}" title="${f.path}" style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:12px;cursor:pointer;">
                <img src="${f.icon}" alt="" style="width:18px;height:18px;opacity:0.9;">
                <div style="display:flex;flex-direction:column;gap:2px;">
                    <span style="font-size:13px;">${f.name}</span>
                    <span style="font-size:11px;color:var(--text-tertiary);">${RecentFiles.formatTime(f.modified)}</span>
                </div>
            </div>
        `).join('');
    },

    showRecentContextMenu(x, y, id) {
        let menu = document.getElementById('start-recent-context-menu');
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'start-recent-context-menu';
            menu.className = 'context-menu';
            document.body.appendChild(menu);
        }
        menu.innerHTML = `
            <div class="context-menu-item" data-action="open"><img src="Theme/Icon/Symbol_icon/stroke/Folder Open.svg" alt=""><span>${t('open')}</span></div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="reveal-in-folder"><img src="Theme/Icon/Symbol_icon/stroke/Dashboard Check.svg" alt=""><span>${t('start.ctx.reveal')}</span></div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="remove-recent"><img src="Theme/Icon/Symbol_icon/stroke/Minus Circle.svg" alt=""><span>${t('start.ctx.remove-recent')}</span></div>
            <div class="context-menu-item" data-action="move-to-recycle"><img src="Theme/Icon/Symbol_icon/stroke/Trash.svg" alt=""><span>${t('start.ctx.move-to-recycle')}</span></div>
        `;
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.classList.remove('hidden');

        const closeMenu = () => menu.classList.add('hidden');
        setTimeout(() => {
            document.addEventListener('click', closeMenu, { once: true });
        }, 0);

        menu.onclick = (e) => {
            const item = e.target.closest('.context-menu-item');
            if (!item) return;
            e.stopPropagation();
            closeMenu();
            
            const action = item.dataset.action;
            const node = State.findNode(id);
            if (!node) {
                console.error('[StartMenu] 找不到节点:', id);
                return;
            }
            
            switch (action) {
                case 'open':
                    // 打开文件或文件夹（真正打开目标而不是固定欢迎页）
                    if (node.type === 'file') {
                        // 直接用 Notes 打开文件内容
                        WindowManager.openApp('notes', { fileId: id });
                        this.close();
                    } else if (node.type === 'folder') {
                        WindowManager.openApp('files');
                        setTimeout(() => {
                            if (typeof FilesApp !== 'undefined' && FilesApp.navigateToId) {
                                FilesApp.navigateToId(id);
                            }
                        }, 100);
                        this.close();
                    }
                    break;
                case 'reveal-in-folder':
                    // 在文件资源管理器中定位该文件/文件夹
                    WindowManager.openApp('files');
                    setTimeout(() => {
                        if (typeof FilesApp !== 'undefined' && FilesApp.navigateToId) {
                            // 如果是文件，先定位到父目录
                            let targetId = id;
                            const targetNode = State.findNode(id);
                            if (targetNode && targetNode.type === 'file') {
                                const parent = State.findParentNode(id);
                                if (parent) targetId = parent.id;
                            }
                            FilesApp.navigateToId(targetId, id); // 第二个参数用于高亮选中
                        }
                    }, 120);
                    this.close();
                    break;
                    
                case 'remove-recent':
                    // 从推荐中删除（不删除文件）：仅设置隐藏标记
                    node._hiddenFromRecent = true;
                    State.updateFS(State.fs);
                    this.renderRecent();
                    State.addNotification({
                        title: t('start.ctx.start-menu'),
                        message: t('start.ctx.removed-from-recent'),
                        type: 'success'
                    });
                    break;
                    
                case 'move-to-recycle':
                    // 移动到回收站（移动节点，不删除数据）
                    const parent = State.findParentNode(id);
                    const recycle = State.findNode('recycle');
                    if (!parent || !recycle) {
                        console.error('[StartMenu] 找不到父节点或回收站');
                        return;
                    }
                    if (!parent.children) {
                        console.error('[StartMenu] 父节点没有children');
                        return;
                    }
                    
                    const idx = parent.children.findIndex(c => c.id === id);
                    if (idx === -1) {
                        console.error('[StartMenu] 在父节点中找不到该项');
                        return;
                    }
                    
                    // 移除并添加到回收站
                    const removed = parent.children.splice(idx, 1)[0];
                    removed._recycle = { originalParentId: parent.id };
                    recycle.children = recycle.children || [];
                    recycle.children.unshift(removed);
                    
                    State.updateFS(State.fs);
                    this.renderRecent();
                    State.addNotification({
                        title: t('start.ctx.recycle-bin'),
                        message: t('start.ctx.moved-to-recycle', { name: node.name }),
                        type: 'success'
                    });
                    break;
            }
        };
    },

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    open() {
        this.element.classList.remove('hidden');
        this.element.classList.remove('closing');
        this.isOpen = true;
        this.searchInput.focus();
        
        // 关闭其他面板
        ControlCenter.close();
        NotificationCenter.close();
    },

    close() {
        if (!this.isOpen) return;
        
        // 添加关闭动画
        if (State.settings.enableAnimation) {
            this.element.classList.add('closing');
            setTimeout(() => {
                this.element.classList.add('hidden');
                this.element.classList.remove('closing');
            }, 200);
        } else {
            this.element.classList.add('hidden');
        }
        
        this.isOpen = false;
        this.searchInput.value = '';
        this.filterApps('');
    },

    filterApps(query) {
        const apps = this.appsGrid.querySelectorAll('.start-app');
        apps.forEach(app => {
            const name = app.querySelector('span').textContent.toLowerCase();
            if (name.includes(query)) {
                app.style.display = 'flex';
            } else {
                app.style.display = 'none';
            }
        });
    },

    togglePowerMenu() {
        if (this.powerMenu.classList.contains('hidden')) {
            // 计算电源按钮位置
            const btnRect = this.powerBtn.getBoundingClientRect();
            const menuRect = this.powerMenu.getBoundingClientRect();
            
            // 设置菜单位置：在按钮正上方
            this.powerMenu.style.bottom = `${window.innerHeight - btnRect.top + 8}px`;
            this.powerMenu.style.right = `${window.innerWidth - btnRect.right}px`;
            this.powerMenu.style.left = 'auto';
            
            this.powerMenu.classList.remove('hidden');
            
            // 切换图标
            const strokeIcon = this.powerBtn.querySelector('.icon-stroke');
            const fillIcon = this.powerBtn.querySelector('.icon-fill');
            strokeIcon.classList.add('hidden');
            fillIcon.classList.remove('hidden');
        } else {
            this.closePowerMenu();
        }
    },

    closePowerMenu() {
        this.powerMenu.classList.add('hidden');
        
        const strokeIcon = this.powerBtn.querySelector('.icon-stroke');
        const fillIcon = this.powerBtn.querySelector('.icon-fill');
        strokeIcon.classList.remove('hidden');
        fillIcon.classList.add('hidden');
    },

    handlePowerAction(action) {
        this.closePowerMenu();
        this.close();

        switch (action) {
            case 'shutdown':
                State.shutdown();
                break;
            case 'restart':
                State.restart();
                break;
            case 'logout':
                State.logout();
                break;
        }
    },

    // 系统内置应用列表（不可卸载）
    systemApps: ['files', 'settings', 'calculator', 'notes', 'browser', 'clock', 'weather', 'appshop'],
    
    showAppContextMenu(event, appId) {
        const app = Desktop.apps.find(a => a.id === appId);
        if (!app) return;

        const isPinned = (State.settings.pinnedApps || []).includes(appId);
        const isSystemApp = this.systemApps.includes(appId);
        const isPWA = app.isPWA === true;
        const isRepairing = typeof SettingsApp !== 'undefined' && SettingsApp.isAppRepairing(appId);

        // 创建右键菜单
        let contextMenu = document.getElementById('start-app-context-menu');
        if (!contextMenu) {
            contextMenu = document.createElement('div');
            contextMenu.id = 'start-app-context-menu';
            contextMenu.className = 'context-menu hidden';
            document.body.appendChild(contextMenu);
        }

        // 如果应用正在修复，所有选项都禁用
        const disabledClass = isRepairing ? ' disabled' : '';
        
        let menuHTML = `
            <div class="context-menu-item${disabledClass}" data-action="open" data-app-id="${appId}">
                <img src="Theme/Icon/Symbol_icon/stroke/Folder Open.svg" alt="">
                <span>${isRepairing ? t('start.ctx.repairing') : t('start.ctx.open')}</span>
            </div>
        `;

        if (isPinned) {
            menuHTML += `
                <div class="context-menu-item${disabledClass}" data-action="unpin" data-app-id="${appId}">
                    <img src="Theme/Icon/Symbol_icon/fill/Pin.svg" alt="">
                    <span>${t('start.ctx.unpin')}</span>
                </div>
            `;
        } else {
            menuHTML += `
                <div class="context-menu-item${disabledClass}" data-action="pin" data-app-id="${appId}">
                    <img src="Theme/Icon/Symbol_icon/stroke/Pin.svg" alt="">
                    <span>${t('start.ctx.pin')}</span>
                </div>
            `;
        }
        
        // 分隔线
        menuHTML += `<div class="context-menu-separator"></div>`;
        
        const uninstallDisabled = (isSystemApp || isRepairing) ? ' disabled' : '';
        menuHTML += `
            <div class="context-menu-item${uninstallDisabled}" data-action="uninstall" data-app-id="${appId}">
                <img src="Theme/Icon/Symbol_icon/stroke/Trash.svg" alt="">
                <span>${t('start.ctx.uninstall')}</span>
            </div>
        `;

        contextMenu.innerHTML = menuHTML;
        contextMenu.style.left = `${event.clientX}px`;
        contextMenu.style.top = `${event.clientY}px`;
        contextMenu.classList.remove('hidden');

        // 绑定菜单项点击事件
        contextMenu.querySelectorAll('.context-menu-item:not(.disabled)').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.dataset.action;
                const targetAppId = item.dataset.appId;
                this.handleAppContextMenuAction(action, targetAppId);
                contextMenu.classList.add('hidden');
            });
        });

        // 点击外部关闭菜单
        const closeMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.classList.add('hidden');
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    },

    handleAppContextMenuAction(action, appId) {
        switch (action) {
            case 'open':
                // 检查是否是 PWA 应用
                const appInfo = Desktop.apps.find(a => a.id === appId);
                if (appInfo && appInfo.isPWA && appInfo.url) {
                    WindowManager.openApp(appId);
                } else {
                    WindowManager.openApp(appId);
                }
                this.close();
                break;
            case 'pin':
                Taskbar.pinApp(appId);
                break;
            case 'unpin':
                Taskbar.unpinApp(appId);
                break;
            case 'uninstall': {
                const targetApp = Desktop.apps.find(a => a.id === appId);
                const appName = targetApp ? Desktop.getAppName(targetApp) : appId;

                // 检查应用是否正在运行
                const isRunning = typeof WindowManager !== 'undefined' &&
                    WindowManager.windows.some(w => w.appId === appId);

                const doUninstall = () => {
                    FluentUI.Dialog({
                        title: t('start.ctx.confirm-uninstall'),
                        content: t('start.ctx.confirm-uninstall-msg', { name: appName }),
                        type: 'warning',
                        buttons: [
                            { text: t('start.ctx.cancel'), variant: 'secondary' },
                            { text: t('start.ctx.uninstall'), variant: 'danger', value: 'uninstall' }
                        ],
                        onClose: (result) => {
                            if (result === 'uninstall') {
                                if (typeof AppShop !== 'undefined' && AppShop.uninstallApp) {
                                    AppShop.uninstallApp(appId);
                                }
                            }
                        }
                    });
                };

                if (isRunning) {
                    FluentUI.Dialog({
                        title: t('start.ctx.app-running', { name: appName }),
                        content: t('start.ctx.app-running-msg', { name: appName }),
                        type: 'warning',
                        buttons: [
                            { text: t('start.ctx.cancel'), variant: 'secondary' },
                            { text: t('start.ctx.continue'), variant: 'danger', value: 'confirm' }
                        ],
                        onClose: (result) => {
                            if (result === 'confirm') {
                                // 关闭该应用所有窗口
                                const wins = WindowManager.windows.filter(w => w.appId === appId);
                                wins.forEach(w => WindowManager.closeWindow(w.id));
                                setTimeout(() => doUninstall(), 300);
                            }
                        }
                    });
                } else {
                    doUninstall();
                }
                break;
            }
        }
    }
};


