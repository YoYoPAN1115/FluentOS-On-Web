/**
 * 通知中心 - 控制中心瓷贴风格
 */
const NotificationCenter = {
    element: null,
    listElement: null,
    emptyElement: null,
    clearBtn: null,
    notificationTile: null,
    isOpen: false,

    init() {
        this.element = document.getElementById('notification-center');
        this.listElement = document.getElementById('notification-list');
        this.emptyElement = this.element.querySelector('.notification-empty');
        this.clearBtn = document.getElementById('notification-clear');
        this.notificationTile = document.getElementById('notification-tile');

        this.bindEvents();
        this.render();
        this.updateLanguage();

        // 监听通知变化
        State.on('notificationAdd', () => this.render());
        State.on('notificationRemove', () => this.render());
        State.on('notificationsClear', () => this.render());
        
        // 监听语言切换
        State.on('languageChange', () => {
            this.updateLanguage();
        });
        
    },
    
    updateLanguage() {
        // 更新通知标题
        const notificationTitle = document.getElementById('notification-title');
        if (notificationTitle) notificationTitle.textContent = t('notification.title');
        
        // 更新清除按钮
        if (this.clearBtn) this.clearBtn.textContent = t('notification.clear-all');
        
        // 更新空状态文本
        const emptyText = document.getElementById('notification-empty-text');
        if (emptyText) emptyText.textContent = t('notification.empty');
    },

    bindEvents() {
        // 清空按钮
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => {
                State.clearNotifications();
            });
        }

        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target) && 
                !e.target.closest('#notification-btn')) {
                this.close();
            }
        });
    },

    render() {
        if (!this.listElement) return;
        
        this.listElement.innerHTML = '';

        if (State.notifications.length === 0) {
            this.emptyElement.classList.remove('hidden');
            if (this.clearBtn) this.clearBtn.disabled = true;
            return;
        }

        this.emptyElement.classList.add('hidden');
        if (this.clearBtn) {
            this.clearBtn.disabled = !State.notifications.some(notification => notification.manualDismissOnly !== true);
        }

        State.notifications.forEach(notification => {
            const item = this.createNotificationItem(notification);
            this.listElement.appendChild(item);
        });
    },

    createNotificationItem(notification) {
        const item = document.createElement('div');
        item.className = 'notification-item';
        item.dataset.id = notification.id;
        if (notification.onClickAction) item.classList.add('notification-item-actionable');

        const timeStr = this.formatTime(notification.time);

        item.innerHTML = `
            <div class="notification-item-header">
                <div>
                    <div class="notification-item-title"></div>
                    <div class="notification-item-time">${timeStr}</div>
                </div>
                <button class="notification-item-close" ${notification.persistent ? 'style="display:none;"' : ''}>
                    <img src="Theme/Icon/Symbol_icon/stroke/Cancel.svg" alt="关闭">
                </button>
            </div>
            <div class="notification-item-content"></div>
        `;

        item.querySelector('.notification-item-title').textContent = notification.title || '';
        item.querySelector('.notification-item-content').textContent = notification.message || '';

        const closeBtn = item.querySelector('.notification-item-close');
        closeBtn.addEventListener('click', () => {
            State.removeNotification(notification.id);
        });

        if (notification.onClickAction) {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.notification-item-close')) return;
                this.handleNotificationAction(notification);
            });
        }

        return item;
    },

    handleNotificationAction(notification) {
        const action = notification.onClickAction;
        if (!action) return;
        if (action.type === 'openApp' && action.appId && typeof WindowManager !== 'undefined') {
            WindowManager.openApp(action.appId, action.data || null);
        }
        if (notification.dismissOnClick !== false) {
            State.removeNotification(notification.id);
        }
        this.close();
    },

    formatTime(timeStr) {
        const now = new Date();
        const time = new Date(timeStr);
        const diff = now - time;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes} 分钟前`;
        if (hours < 24) return `${hours} 小时前`;
        if (days < 7) return `${days} 天前`;

        return time.toLocaleDateString('zh-CN');
    },

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    open() {
        const btn = document.getElementById('notification-btn');
        const taskbar = document.getElementById('taskbar');
        if (!btn || !taskbar) return;
        
        const btnRect = btn.getBoundingClientRect();
        const taskbarRect = taskbar.getBoundingClientRect();
        
        this.element.classList.remove('hidden');
        this.element.classList.remove('closing');
        this.element.style.visibility = 'hidden';
        this.element.style.display = 'flex';
        // 关键：确保不被全局样式top/right覆盖
        this.element.style.top = 'auto';
        this.element.style.right = 'auto';
        
        const panelRect = this.element.getBoundingClientRect();
        const btnCenterX = btnRect.left + btnRect.width / 2;

        // 强制紧贴任务栏：面板底部对齐任务栏顶部（增加1px间距）
        const bottomDistance = window.innerHeight - taskbarRect.top - 1; // 视觉贴合，向下压 1px

        this.element.style.bottom = `${bottomDistance}px`;
        this.element.style.left = `${btnCenterX - panelRect.width / 2}px`;
        this.element.style.right = 'auto';
        this.element.style.visibility = 'visible';
        
        this.isOpen = true;
        btn.classList.add('active');
        
        // 关闭其他面板（互斥）
        if (typeof StartMenu !== 'undefined') StartMenu.close();
        if (typeof ControlCenter !== 'undefined') ControlCenter.close();
        if (typeof Fingo !== 'undefined' && Fingo && Fingo.isOpen) {
            Fingo.hide('panel-switch');
        }

    },

    close() {
        if (!this.isOpen) return;
        
        const btn = document.getElementById('notification-btn');
        if (btn) {
            btn.classList.remove('active');
        }
        
        if (State.settings.enableAnimation) {
            this.element.classList.add('closing');
            setTimeout(() => {
                this.element.classList.add('hidden');
                this.element.classList.remove('closing');
                this.element.style.display = '';
                this.element.style.visibility = '';
            }, 200);
        } else {
            this.element.classList.add('hidden');
            this.element.style.display = '';
            this.element.style.visibility = '';
        }
        
        this.isOpen = false;
    }
};

// 全局通知方法
function notify(title, message, type = 'info') {
    State.addNotification({ title, message, type });
}
