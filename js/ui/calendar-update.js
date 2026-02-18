/**
 * 日历更新 - 添加展开/收起功能和时钟
 */

// 扩展 Calendar 对象
Object.assign(Calendar, {
    isExpanded: false,
    clockInterval: null,
    
    // 重写 init 方法
    _originalInit: Calendar.init,
    init() {
        // 恢复上次状态
        this.isExpanded = localStorage.getItem('calendar-expanded') === 'true';
        
        // 应用状态
        const section = document.getElementById('calendar-section');
        if (section) {
            if (this.isExpanded) {
                section.classList.remove('compact');
            } else {
                section.classList.add('compact');
            }
        }
        
        this._originalInit.call(this);
        this.bindExpandEvents();
        this.startClock();
    },
    
    bindExpandEvents() {
        const expandBtn = document.getElementById('calendar-expand-btn');
        const collapseBtn = document.getElementById('calendar-collapse-btn');
        const compactDisplay = document.getElementById('calendar-compact-display');
        
        if (expandBtn) {
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleExpand();
            });
        }
        
        if (collapseBtn) {
            collapseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleExpand();
            });
        }
        
        if (compactDisplay) {
            compactDisplay.addEventListener('click', () => {
                this.toggleExpand();
            });
        }
    },
    
    toggleExpand() {
        this.isExpanded = !this.isExpanded;
        
        const section = document.getElementById('calendar-section');
        if (!section) return;
        
        // 保存状态到 localStorage
        localStorage.setItem('calendar-expanded', this.isExpanded.toString());
        
        if (this.isExpanded) {
            // 展开：先渲染内容，再移除compact类
            if (typeof Calendar !== 'undefined' && Calendar.render) {
                Calendar.render(); // 先渲染完整日历
            }
            // 使用requestAnimationFrame确保DOM已更新
            requestAnimationFrame(() => {
                section.classList.remove('compact');
            });
        } else {
            // 收起：直接添加compact类
            section.classList.add('compact');
        }
    },
    
    startClock() {
        this.updateClock();
        this.clockInterval = setInterval(() => this.updateClock(), 1000);
    },
    
    stopClock() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
    },
    
    updateClock() {
        const now = new Date();
        
        // 更新日期
        const dateEl = document.getElementById('calendar-current-date');
        if (dateEl) {
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const day = now.getDate();
            const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            const weekday = weekdays[now.getDay()];
            dateEl.textContent = `${year}年${month}月${day}日 ${weekday}`;
        }
        
        // 更新时间
        const clockEl = document.getElementById('calendar-current-clock');
        if (clockEl) {
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            clockEl.textContent = `${hours}:${minutes}:${seconds}`;
        }
    },
    
    // 重写 render 方法，修复月份跳跃问题
    _originalRender: Calendar.render,
    render() {
        this._originalRender.call(this);
        this.updateClock();
    },
    
    // 修复月份切换
    _originalBindEvents: Calendar.bindEvents,
    bindEvents() {
        const prevBtn = document.getElementById('calendar-prev-month');
        const nextBtn = document.getElementById('calendar-next-month');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                // 直接设置月份，避免跳跃
                const newDate = new Date(this.currentDate);
                newDate.setMonth(newDate.getMonth() - 1);
                this.currentDate = newDate;
                this.render();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                // 直接设置月份，避免跳跃
                const newDate = new Date(this.currentDate);
                newDate.setMonth(newDate.getMonth() + 1);
                this.currentDate = newDate;
                this.render();
            });
        }
        
        // 专注按钮
        const focusBtn = document.getElementById('calendar-focus-btn');
        if (focusBtn) {
            focusBtn.addEventListener('click', () => {
                State.addNotification({
                    title: '专注模式',
                    message: '专注功能即将推出',
                    type: 'info'
                });
            });
        }
        
        // 时间按钮
        const timeBtn = document.getElementById('calendar-time-btn');
        if (timeBtn) {
            timeBtn.addEventListener('click', () => {
                State.addNotification({
                    title: '专注时间',
                    message: '时间设置功能即将推出',
                    type: 'info'
                });
            });
        }
    }
});

console.log('[Calendar] 展开/收起功能已加载');

