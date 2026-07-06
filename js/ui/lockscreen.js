/**
 * 锁屏模块
 */
const LockScreen = {
    element: null,
    timeElement: null,
    dateElement: null,
    wallpaperElement: null,
    hintElement: null,
    notificationsElement: null,
    timeInterval: null,

    init() {
        this.element = document.getElementById('lock-screen');
        this.timeElement = document.getElementById('lock-time');
        this.dateElement = document.getElementById('lock-date');
        this.wallpaperElement = this.element.querySelector('.lock-wallpaper');
        this.hintElement = this.element.querySelector('.lock-hint');
        this.notificationsElement = document.getElementById('lock-notifications');

        // 绑定事件
        this.element.addEventListener('click', (event) => this.unlock(event));
        document.addEventListener('keydown', (e) => {
            // 在锁屏小组件（如搜索框）内输入时不触发解锁
            if (e.target && e.target.closest && e.target.closest('.fluent-widget')) return;
            if (e.target && e.target.closest && e.target.closest('.lock-notifications')) return;
            if (State.view === 'lock') {
                this.unlock();
            }
        });
        State.on('languageChange', () => this.updateTexts());
        State.on('notificationAdd', () => this.renderNotifications());
        State.on('notificationRemove', () => this.renderNotifications());
        State.on('notificationsClear', () => this.renderNotifications());
        this.updateTexts();
        this.renderNotifications();
    },

    show() {
        this.element.classList.remove('hidden');
        this.element.classList.add('show');
        this.updateTime();
        this.updateWallpaper();
        
        // 启动时间更新
        this.timeInterval = setInterval(() => this.updateTime(), 1000);
    },

    hide() {
        this.element.classList.add('hidden');
        this.element.classList.remove('show');
        
        // 停止时间更新
        if (this.timeInterval) {
            clearInterval(this.timeInterval);
            this.timeInterval = null;
        }
    },

    updateTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        this.timeElement.textContent = `${hours}:${minutes}`;
        this.dateElement.textContent = `${year}/${month}/${day}`;
    },

    updateWallpaper() {
        const wallpaper = State.settings.wallpaperLock;
        this.wallpaperElement.style.backgroundImage = `url('${wallpaper}')`;
    },

    updateTexts() {
        if (!this.hintElement || !I18n || typeof I18n.t !== 'function') return;
        this.hintElement.textContent = I18n.t('lock.hint');
    },

    renderNotifications() {
        if (!this.notificationsElement || typeof State === 'undefined') return;
        this.notificationsElement.innerHTML = '';

        State.notifications
            .filter(notification => notification.showOnLockScreen === true)
            .forEach(notification => {
                const item = document.createElement('div');
                item.className = 'lock-notification-item';
                item.dataset.id = notification.id;

                const header = document.createElement('div');
                header.className = 'lock-notification-header';
                const meta = document.createElement('div');
                const title = document.createElement('div');
                title.className = 'lock-notification-title';
                title.textContent = notification.title || '';
                const time = document.createElement('div');
                time.className = 'lock-notification-time';
                time.textContent = new Date(notification.time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                meta.append(title, time);

                const close = document.createElement('button');
                close.type = 'button';
                close.className = 'lock-notification-close';
                close.setAttribute('aria-label', '关闭');
                const closeIcon = document.createElement('img');
                closeIcon.src = 'Theme/Icon/Symbol_icon/stroke/Cancel.svg';
                closeIcon.alt = '';
                close.appendChild(closeIcon);
                close.addEventListener('click', event => {
                    event.stopPropagation();
                    State.removeNotification(notification.id);
                });

                const message = document.createElement('div');
                message.className = 'lock-notification-message';
                message.textContent = notification.message || '';
                header.append(meta, close);
                item.append(header, message);
                item.addEventListener('click', event => event.stopPropagation());
                this.notificationsElement.appendChild(item);
            });
    },

    unlock(event = null) {
        // 编辑锁屏小组件时，点击锁屏不触发解锁流程
        if (typeof Widgets !== 'undefined') {
            if (typeof Widgets.shouldSuppressLockUnlock === 'function' && Widgets.shouldSuppressLockUnlock(event)) return;
            if (Widgets.lockEditMode) return;
        }
        State.setView('login');
    }
};
