/**
 * 通知中心模块
 */
const NotificationCenter = {
    element: null,
    listElement: null,
    emptyElement: null,
    clearBtn: null,
    isOpen: false,

    init() {
        this.element = document.getElementById('notification-center');
        this.listElement = document.getElementById('notification-list');
        this.emptyElement = this.element.querySelector('.notification-empty');
        this.clearBtn = document.getElementById('notification-clear');

        this.bindEvents();
        this.bindResizeEvent(); // 添加窗口大小变化监听
        this.render();

        // 监听通知变化
        State.on('notificationAdd', () => this.render());
        State.on('notificationRemove', () => this.render());
        State.on('notificationsClear', () => this.render());
    },

    bindEvents() {
        // 清空按钮
        this.clearBtn.addEventListener('click', () => {
            State.clearNotifications();
        });

        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target) && 
                !e.target.closest('#notification-btn')) {
                this.close();
            }
        });
    },

    bindResizeEvent() {
        // 监听窗口大小变化，重新对齐位置
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.isOpen) {
                    this.alignToTaskbarTime();
                }
            }, 100); // 防抖，避免频繁计算
        });
    },

    render() {
        this.listElement.innerHTML = '';

        if (State.notifications.length === 0) {
            this.emptyElement.classList.remove('hidden');
            this.clearBtn.disabled = true;
            return;
        }

        this.emptyElement.classList.add('hidden');
        this.clearBtn.disabled = false;

        State.notifications.forEach(notification => {
            const item = this.createNotificationItem(notification);
            this.listElement.appendChild(item);
        });
    },

    createNotificationItem(notification) {
        const item = document.createElement('div');
        item.className = 'notification-item';
        item.dataset.id = notification.id;

        const timeStr = this.formatTime(notification.time);

        item.innerHTML = `
            <div class="notification-item-header">
                <div>
                    <div class="notification-item-title">${notification.title}</div>
                    <div class="notification-item-time">${timeStr}</div>
                </div>
                <button class="notification-item-close">
                    <img src="Theme/Icon/Symbol_icon/stroke/Cancel.svg" alt="关闭">
                </button>
            </div>
            <div class="notification-item-content">${notification.message}</div>
        `;

        // 绑定关闭按钮
        const closeBtn = item.querySelector('.notification-item-close');
        closeBtn.addEventListener('click', () => {
            State.removeNotification(notification.id);
        });

        return item;
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
        if (!btn) return;
        const btnRect = btn.getBoundingClientRect();
        
        this.element.classList.remove('hidden');
        this.element.classList.remove('closing');
        
        // 先显示以获取宽度
        this.element.style.visibility = 'hidden';
        this.element.style.display = 'flex';
        
        const panelRect = this.element.getBoundingClientRect();
        const btnCenterX = btnRect.left + btnRect.width / 2;
        
        // 与控制中心完全一致的定位逻辑
        // 底部距离任务栏按钮顶部 8px
        const bottomDistance = window.innerHeight - btnRect.top + 8;
        this.element.style.bottom = `${bottomDistance}px`;
        this.element.style.left = `${btnCenterX - panelRect.width / 2}px`;
        this.element.style.right = 'auto';
        
        // 显示面板
        this.element.style.visibility = 'visible';
        
        this.isOpen = true;
        btn.classList.add('active');
        
        if (typeof Calendar !== 'undefined' && Calendar.init) {
            Calendar.init();
        }
        
        StartMenu.close();
        ControlCenter.close();
    },
    
    // 已移除，现在在 open() 方法中直接计算位置

    close() {
        if (!this.isOpen) return;
        
        const btn = document.getElementById('notification-btn');
        btn.classList.remove('active');
        
        // 添加关闭动画（与控制中心完全相同）
        if (State.settings.enableAnimation) {
            this.element.classList.add('closing');
            setTimeout(() => {
                this.element.classList.add('hidden');
                this.element.classList.remove('closing');
                // 清除inline样式，恢复到默认状态
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

