/**
 * 通知中心 + 日历 - 控制中心瓷贴风格
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
        
        console.log('[NotificationCenter] 初始化完成');
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
        
        // 强制紧贴任务栏：面板底部对齐任务栏顶部
        const bottomDistance = window.innerHeight - taskbarRect.top - 2; // 视觉贴合，向下压 2px
        
        console.log('[NotificationCenter] 定位信息:', {
            windowHeight: window.innerHeight,
            taskbarTop: taskbarRect.top,
            bottomDistance: bottomDistance,
            panelHeight: panelRect.height,
            计算公式: `${window.innerHeight} - ${taskbarRect.top} - 2 = ${bottomDistance}`
        });
        
        this.element.style.bottom = `${bottomDistance}px`;
        this.element.style.left = `${btnCenterX - panelRect.width / 2}px`;
        this.element.style.right = 'auto';
        this.element.style.visibility = 'visible';
        
        this.isOpen = true;
        btn.classList.add('active');
        
        // 初始化日历
        if (typeof CalendarWidget !== 'undefined') {
            CalendarWidget.render();
        }
        
        // 关闭其他面板
        if (typeof StartMenu !== 'undefined') StartMenu.close();
        if (typeof ControlCenter !== 'undefined') ControlCenter.close();
    },

    close() {
        if (!this.isOpen) return;
        
        const btn = document.getElementById('notification-btn');
        if (btn) {
            btn.classList.remove('active');
        }
        
        // 关闭时确保日历收起
        if (typeof CalendarWidget !== 'undefined') {
            CalendarWidget.collapse();
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

// 日历组件
const CalendarWidget = {
    currentDate: new Date(),
    selectedDate: null,
    isExpanded: false,
    clockInterval: null,
    
    init() {
        console.log('[Calendar] 初始化日历组件');
        this.render();
        this.bindEvents();
        this.startClock();
    },
    
    bindEvents() {
        // 紧凑视图 - 点击展开
        const compactView = document.getElementById('calendar-compact-view');
        if (compactView) {
            compactView.addEventListener('click', () => {
                this.toggle();
            });
        }
        
        // 月份切换
        const prevBtn = document.getElementById('calendar-prev-month');
        const nextBtn = document.getElementById('calendar-next-month');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.changeMonth(-1);
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.changeMonth(1);
            });
        }
        
        // 今天按钮
        const todayBtn = document.getElementById('calendar-today-btn');
        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                this.goToToday();
            });
        }
    },
    
    toggle() {
        if (this.isExpanded) {
            this.collapse();
        } else {
            this.expand();
        }
    },
    
    expand() {
        console.log('[Calendar] 展开日历');
        this.isExpanded = true;
        
        const tile = document.getElementById('calendar-tile');
        const notificationTile = document.getElementById('notification-tile');
        
        if (tile) {
            tile.classList.remove('compact');
            tile.classList.add('expanded');
        }
        
        // 隐藏通知瓷贴
        if (notificationTile) {
            notificationTile.classList.add('hidden-by-calendar');
        }
        
        this.renderFullCalendar();
    },
    
    collapse() {
        console.log('[Calendar] 收起日历');
        this.isExpanded = false;
        
        const tile = document.getElementById('calendar-tile');
        const notificationTile = document.getElementById('notification-tile');
        
        if (tile) {
            tile.classList.add('compact');
            tile.classList.remove('expanded');
        }
        
        // 显示通知瓷贴
        if (notificationTile) {
            notificationTile.classList.remove('hidden-by-calendar');
        }
    },
    
    changeMonth(delta) {
        const newDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + delta, 1);
        this.currentDate = newDate;
        this.renderFullCalendar();
    },
    
    goToToday() {
        this.currentDate = new Date();
        this.renderFullCalendar();
    },
    
    render() {
        this.updateCompactView();
        if (this.isExpanded) {
            this.renderFullCalendar();
        }
    },
    
    updateCompactView() {
        const now = new Date();
        const dateEl = document.getElementById('calendar-compact-date');
        const timeEl = document.getElementById('calendar-compact-time');
        
        if (dateEl) {
            const month = now.getMonth() + 1;
            const day = now.getDate();
            const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            const weekday = weekdays[now.getDay()];
            dateEl.textContent = `${month}月${day}日 ${weekday}`;
        }
        
        if (timeEl) {
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            timeEl.textContent = `${hours}:${minutes}`;
        }
    },
    
    startClock() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
        }
        
        this.updateCompactView();
        this.clockInterval = setInterval(() => {
            this.updateCompactView();
        }, 1000);
    },
    
    renderFullCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // 更新标题
        const monthYearEl = document.getElementById('calendar-month-year');
        if (monthYearEl) {
            monthYearEl.textContent = `${year}年${month + 1}月`;
        }
        
        const lunarEl = document.getElementById('calendar-lunar');
        if (lunarEl) {
            lunarEl.textContent = this.getLunarMonth(month);
        }
        
        // 渲染日期
        this.renderDays(year, month);
    },
    
    renderDays(year, month) {
        const container = document.getElementById('calendar-days');
        if (!container) return;
        
        container.innerHTML = '';
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        const today = new Date();
        const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
        
        // 周一为第一天
        const startDay = firstDay === 0 ? 6 : firstDay - 1;
        
        // 上个月
        for (let i = startDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const dayEl = this.createDayElement(day, year, month - 1, true);
            container.appendChild(dayEl);
        }
        
        // 当月
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = isCurrentMonth && day === today.getDate();
            const dayEl = this.createDayElement(day, year, month, false, isToday);
            container.appendChild(dayEl);
        }
        
        // 下个月
        const totalCells = container.children.length;
        const remaining = 42 - totalCells;
        for (let day = 1; day <= remaining; day++) {
            const dayEl = this.createDayElement(day, year, month + 1, true);
            container.appendChild(dayEl);
        }
    },
    
    createDayElement(day, year, month, isOtherMonth, isToday = false) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        
        if (isOtherMonth) dayEl.classList.add('other-month');
        if (isToday) dayEl.classList.add('today');
        
        const date = new Date(year, month, day);
        const lunar = this.getLunarDay(date);
        
        dayEl.innerHTML = `
            <div class="calendar-day-number">${day}</div>
            <div class="calendar-day-lunar">${lunar}</div>
        `;
        
        dayEl.addEventListener('click', () => {
            const allDays = document.querySelectorAll('.calendar-day.selected');
            allDays.forEach(el => el.classList.remove('selected'));
            
            if (!isOtherMonth) {
                dayEl.classList.add('selected');
                this.selectedDate = date;
            } else {
                this.currentDate = new Date(year, month, 1);
                this.renderFullCalendar();
            }
        });
        
        return dayEl;
    },
    
    getLunarMonth(month) {
        const lunarMonths = ['正月', '二月', '三月', '四月', '五月', '六月', 
                            '七月', '八月', '九月', '十月', '冬月', '腊月'];
        return lunarMonths[month];
    },
    
    getLunarDay(date) {
        const lunarDays = [
            '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
            '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
            '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
        ];
        const lunarDayIndex = ((date.getDate() + date.getMonth() * 3) % 30);
        return lunarDays[lunarDayIndex];
    }
};

// 全局通知方法
function notify(title, message, type = 'info') {
    State.addNotification({ title, message, type });
}

console.log('[NotificationCenter] 模块已加载');

