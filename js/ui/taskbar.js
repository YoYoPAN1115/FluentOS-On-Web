/**
 * 任务栏模块
 */
const Taskbar = {
    element: null,
    startBtn: null,
    appsContainer: null,
    controlCenterBtn: null,
    notificationBtn: null,
    timeElement: null,
    dateElement: null,
    timeInterval: null,
    contextMenu: null,
    taskViewBtn: null,
    _taskViewIgnoreClickUntil: 0,

    init() {
        this.element = document.getElementById('taskbar');
        this.startBtn = document.getElementById('start-btn');
        this.appsContainer = document.getElementById('taskbar-apps');
        this.controlCenterBtn = document.getElementById('control-center-btn');
        this.notificationBtn = document.getElementById('notification-btn');
        this.timeElement = document.getElementById('taskbar-time');
        this.dateElement = document.getElementById('taskbar-date');
        this.taskViewBtn = document.getElementById('taskview-btn');

        this.createContextMenu();
        this.renderApps();
        this.bindEvents();
        this.updateTime();
        this.timeInterval = setInterval(() => this.updateTime(), 1000);

        // 监听应用状态变化
        State.on('appStart', (appId) => this.onAppStart(appId));
        State.on('appStop', (appId) => this.onAppStop(appId));
        State.on('languageChange', () => this.renderApps());
        
        // 监听应用修复状态变化
        State.on('appRepairStart', (appId) => this.updateAppRepairState(appId, true));
        State.on('appRepairEnd', (appId) => this.updateAppRepairState(appId, false));
    },
    
    // 更新任务栏应用修复状态
    updateAppRepairState(appId, isRepairing) {
        const btn = this.appsContainer.querySelector(`[data-app-id="${appId}"]`);
        if (btn) {
            if (isRepairing) {
                btn.classList.add('repairing');
                btn.style.opacity = '0.4';
                btn.style.filter = 'grayscale(100%)';
                btn.style.pointerEvents = 'none';
            } else {
                btn.classList.remove('repairing');
                btn.style.opacity = '';
                btn.style.filter = '';
                btn.style.pointerEvents = '';
            }
        }
    },

    createContextMenu() {
        // 创建任务栏右键菜单
        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'context-menu hidden';
        this.contextMenu.id = 'taskbar-context-menu';
        document.body.appendChild(this.contextMenu);
    },

    renderApps() {
        this.appsContainer.innerHTML = '';
        
        // 获取固定的应用和运行中的应用
        const pinnedApps = State.settings.pinnedApps || [];
        const runningApps = Array.from(State.runningApps);
        
        // 合并列表：固定的应用 + 未固定但运行中的应用
        const allApps = [...new Set([...pinnedApps, ...runningApps])];
        
        allApps.forEach(appId => {
            this.renderAppButton(appId);
        });
    },

    renderAppButton(appId) {
        const app = Desktop.apps.find(a => a.id === appId);
        if (!app) return;

        // 检查是否已存在
        let btn = this.appsContainer.querySelector(`[data-app-id="${appId}"]`);
        if (btn) return btn;

        btn = document.createElement('button');
        btn.className = 'taskbar-btn taskbar-app';
        btn.dataset.appId = appId;
        const name = Desktop.getAppName(app);
        btn.innerHTML = `<img src="${app.icon}" alt="${name}">`;
        btn.title = name;
        
        // 检查是否运行中
        if (State.runningApps.has(appId)) {
            btn.classList.add('running');
        }
        
        // 添加出现动画
        if (State.settings.enableAnimation) {
            btn.classList.add('taskbar-app-entering');
            setTimeout(() => {
                btn.classList.remove('taskbar-app-entering');
            }, 400);
        }
        
        this.appsContainer.appendChild(btn);
        return btn;
    },

    bindEvents() {
        // 开始按钮
        this.startBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            StartMenu.toggle();
        });

        // 应用图标点击
        this.appsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.taskbar-app');
            if (btn) {
                const appId = btn.dataset.appId;
                if (State.runningApps.has(appId)) {
                    // 如果应用已运行，切换窗口显示
                    WindowManager.toggleWindow(appId);
                } else {
                    // 打开应用
                    WindowManager.openApp(appId);
                }
            }
        });

        // 应用图标右键菜单
        this.appsContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const btn = e.target.closest('.taskbar-app');
            if (btn) {
                const appId = btn.dataset.appId;
                this.showContextMenu(e, appId);
            }
        });

        // 控制中心按钮
        this.controlCenterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ControlCenter.toggle();
        });

        // 通知按钮
        this.notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            NotificationCenter.toggle();
        });

        // 任务视图按钮
        this.taskViewBtn?.addEventListener('pointerdown', (e) => {
            if (typeof e.button === 'number' && e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            const now = globalThis.performance ? performance.now() : Date.now();
            this._taskViewIgnoreClickUntil = now + 220;
            if (typeof TaskView !== 'undefined') TaskView.toggle();
        });

        this.taskViewBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const now = globalThis.performance ? performance.now() : Date.now();
            if (now < this._taskViewIgnoreClickUntil) return;
            if (typeof TaskView !== 'undefined') TaskView.toggle();
        });

        // 点击外部关闭右键菜单
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

        // 全局快捷键在 main.js 统一注册
    },

    showContextMenu(event, appId) {
        const app = Desktop.apps.find(a => a.id === appId);
        if (!app) return;

        const isPinned = (State.settings.pinnedApps || []).includes(appId);
        const isRunning = State.runningApps.has(appId);

        let menuHTML = '';
        
        if (isRunning) {
            menuHTML += `
                <div class="context-menu-item" data-action="close" data-app-id="${appId}">
                    <img src="Theme/Icon/Symbol_icon/stroke/Cancel.svg" alt="">
                    <span>关闭</span>
                </div>
            `;
        }
        
        if (isPinned) {
            menuHTML += `
                <div class="context-menu-item" data-action="unpin" data-app-id="${appId}">
                    <img src="Theme/Icon/Symbol_icon/fill/Pin.svg" alt="">
                    <span>取消固定</span>
                </div>
            `;
        } else {
            menuHTML += `
                <div class="context-menu-item" data-action="pin" data-app-id="${appId}">
                    <img src="Theme/Icon/Symbol_icon/stroke/Pin.svg" alt="">
                    <span>固定到任务栏</span>
                </div>
            `;
        }

        this.contextMenu.innerHTML = menuHTML;
        
        // 先显示菜单以获取尺寸
        this.contextMenu.style.visibility = 'hidden';
        this.contextMenu.classList.remove('hidden');
        const menuWidth = this.contextMenu.offsetWidth;
        const menuHeight = this.contextMenu.offsetHeight;
        
        // 计算菜单位置：在点击位置正上方，水平居中
        const menuLeft = event.clientX - menuWidth / 2;
        const menuBottom = window.innerHeight - event.clientY + 8;
        
        this.contextMenu.style.left = `${menuLeft}px`;
        this.contextMenu.style.bottom = `${menuBottom}px`;
        this.contextMenu.style.top = 'auto';
        this.contextMenu.style.visibility = 'visible';

        // 绑定菜单项点击事件
        this.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.dataset.action;
                const targetAppId = item.dataset.appId;
                this.handleContextMenuAction(action, targetAppId);
            });
        });
    },

    hideContextMenu() {
        this.contextMenu.classList.add('hidden');
    },

    handleContextMenuAction(action, appId) {
        this.hideContextMenu();
        
        switch (action) {
            case 'close':
                // 关闭应用的所有窗口
                const windows = WindowManager.windows.filter(w => w.appId === appId);
                windows.forEach(w => WindowManager.closeWindow(w.id));
                break;
            case 'pin':
                this.pinApp(appId);
                break;
            case 'unpin':
                this.unpinApp(appId);
                break;
        }
    },

    pinApp(appId) {
        const pinnedApps = State.settings.pinnedApps || [];
        if (!pinnedApps.includes(appId)) {
            pinnedApps.push(appId);
            State.updateSettings({ pinnedApps });
            this.renderApps();
            State.addNotification({
                title: '任务栏',
                message: '已固定到任务栏',
                type: 'success'
            });
        }
    },

    unpinApp(appId) {
        const pinnedApps = State.settings.pinnedApps || [];
        const index = pinnedApps.indexOf(appId);
        if (index !== -1) {
            pinnedApps.splice(index, 1);
            State.updateSettings({ pinnedApps });
            
            // 如果应用未运行，从任务栏移除
            if (!State.runningApps.has(appId)) {
                const btn = this.appsContainer.querySelector(`[data-app-id="${appId}"]`);
                if (btn) btn.remove();
            }
            
            State.addNotification({
                title: '任务栏',
                message: '已从任务栏取消固定',
                type: 'success'
            });
        }
    },

    onAppStart(appId) {
        // 应用启动时，确保在任务栏显示
        const btn = this.appsContainer.querySelector(`[data-app-id="${appId}"]`);
        if (btn) {
            btn.classList.add('running');
        } else {
            // 如果任务栏没有这个图标，添加它
            this.renderAppButton(appId);
        }
    },

    onAppStop(appId) {
        // 应用关闭时，更新状态
        const btn = this.appsContainer.querySelector(`[data-app-id="${appId}"]`);
        if (btn) {
            btn.classList.remove('running');
            
            // 如果应用未固定，从任务栏移除（带动画）
            const isPinned = (State.settings.pinnedApps || []).includes(appId);
            if (!isPinned) {
                if (State.settings.enableAnimation) {
                    btn.classList.add('taskbar-app-exiting');
                    setTimeout(() => {
                        btn.remove();
                    }, 300);
                } else {
                    btn.remove();
                }
            }
        }
    },

    updateTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        this.timeElement.textContent = `${hours}:${minutes}`;
        this.dateElement.textContent = `${month}/${day}`;
    }
};
