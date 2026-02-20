/**
 * 通知中心 + 日历 - 完全模仿图片样式
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
        this.render();

        // 监听通知变化
        State.on('notificationAdd', () => this.render());
        State.on('notificationRemove', () => this.render());
        State.on('notificationsClear', () => this.render());
        
        console.log('[NotificationCenter] 初始化完成');
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
        if (this.clearBtn) this.clearBtn.disabled = false;

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
        console.log('[NotificationCenter] 打开通知中心');
        
        const btn = document.getElementById('notification-btn');
        if (!btn) {
            console.error('[NotificationCenter] 找不到通知按钮');
            return;
        }
        
        const btnRect = btn.getBoundingClientRect();
        
        // 移除hidden类
        this.element.classList.remove('hidden');
        this.element.classList.remove('closing');
        this.element.style.visibility = 'hidden';
        this.element.style.display = 'block';
        
        // 获取面板尺寸
        const panelRect = this.element.getBoundingClientRect();
        const btnCenterX = btnRect.left + btnRect.width / 2;
        
        // 计算位置：底部距离任务栏按钮顶部8px
        const bottomDistance = window.innerHeight - btnRect.top + 8;
        
        // 设置位置
        this.element.style.bottom = `${bottomDistance}px`;
        this.element.style.left = `${btnCenterX - panelRect.width / 2}px`;
        this.element.style.right = 'auto';
        
        // 显示面板
        this.element.style.visibility = 'visible';
        
        this.isOpen = true;
        btn.classList.add('active');
        
        // 初始化日历
        if (typeof CalendarWidget !== 'undefined' && CalendarWidget.init) {
            CalendarWidget.render();
        }
        
        // 关闭其他面板
        if (typeof StartMenu !== 'undefined') StartMenu.close();
        if (typeof ControlCenter !== 'undefined') ControlCenter.close();
        if (typeof Fingo !== 'undefined' && Fingo && Fingo.isOpen && typeof Fingo._ensurePanelForeground === 'function') {
            Fingo._ensurePanelForeground();
        }

        console.log('[NotificationCenter] 通知中心已打开');
    },

    close() {
        if (!this.isOpen) return;
        
        console.log('[NotificationCenter] 关闭通知中心');
        
        const btn = document.getElementById('notification-btn');
        if (btn) {
            btn.classList.remove('active');
        }
        
        // 添加关闭动画
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

console.log('[NotificationCenter] 模块已加载');

