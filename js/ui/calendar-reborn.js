/**
 * 日历组件 - 完全重写
 */
const CalendarWidget = {
    currentDate: new Date(),
    selectedDate: null,
    isExpanded: false,
    clockInterval: null,
    
    init() {
        console.log('[Calendar] 初始化日历组件');
        
        // 恢复上次状态
        const savedState = localStorage.getItem('calendar-expanded');
        this.isExpanded = savedState === 'true';
        
        // 应用初始状态
        const section = document.getElementById('calendar-section');
        if (section) {
            if (this.isExpanded) {
                section.classList.remove('compact');
                section.classList.add('expanded');
            } else {
                section.classList.add('compact');
                section.classList.remove('expanded');
            }
        }
        
        this.render();
        this.bindEvents();
        this.startClock();
        
        console.log('[Calendar] 日历组件初始化完成，展开状态:', this.isExpanded);
    },
    
    bindEvents() {
        // 展开/收起按钮
        const compactDisplay = document.getElementById('calendar-compact-display');
        const expandBtnInFooter = document.getElementById('calendar-collapse-btn');
        
        if (compactDisplay) {
            compactDisplay.addEventListener('click', () => {
                console.log('[Calendar] 点击紧凑显示，准备展开');
                this.toggleExpand();
            });
        }
        
        if (expandBtnInFooter) {
            expandBtnInFooter.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('[Calendar] 点击底部按钮，准备收起');
                this.toggleExpand();
            });
        }
        
        // 月份切换
        const prevBtn = document.getElementById('calendar-prev-month');
        const nextBtn = document.getElementById('calendar-next-month');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                console.log('[Calendar] 切换到上个月');
                this.changeMonth(-1);
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                console.log('[Calendar] 切换到下个月');
                this.changeMonth(1);
            });
        }
        
        // 专注功能
        const focusBtn = document.getElementById('calendar-focus-btn');
        const timeBtn = document.getElementById('calendar-time-btn');
        
        if (focusBtn) {
            focusBtn.addEventListener('click', () => {
                State.addNotification({
                    title: '专注模式',
                    message: '专注功能即将推出',
                    type: 'info'
                });
            });
        }
        
        if (timeBtn) {
            timeBtn.addEventListener('click', () => {
                State.addNotification({
                    title: '专注时间',
                    message: '时间设置功能即将推出',
                    type: 'info'
                });
            });
        }
    },
    
    toggleExpand() {
        this.isExpanded = !this.isExpanded;
        
        const section = document.getElementById('calendar-section');
        if (!section) {
            console.error('[Calendar] 找不到日历section');
            return;
        }
        
        console.log('[Calendar] 切换展开状态:', this.isExpanded);
        
        // 保存状态
        localStorage.setItem('calendar-expanded', this.isExpanded.toString());
        
        if (this.isExpanded) {
            // 展开：移除compact，添加expanded
            section.classList.remove('compact');
            section.classList.add('expanded');
            // 渲染完整日历
            this.renderExpandedContent();
        } else {
            // 收起：添加compact，移除expanded
            section.classList.add('compact');
            section.classList.remove('expanded');
        }
    },
    
    changeMonth(delta) {
        // 创建新日期对象，避免直接修改
        const newDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + delta, 1);
        this.currentDate = newDate;
        
        console.log('[Calendar] 切换到:', this.currentDate.getFullYear(), '年', this.currentDate.getMonth() + 1, '月');
        
        this.render();
    },
    
    render() {
        this.updateCompactDisplay();
        if (this.isExpanded) {
            this.renderExpandedContent();
        }
    },
    
    updateCompactDisplay() {
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
        
        // 更新时钟
        this.updateClock();
    },
    
    updateClock() {
        const clockEl = document.getElementById('calendar-current-clock');
        if (clockEl) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            clockEl.textContent = `${hours}:${minutes}:${seconds}`;
        }
    },
    
    startClock() {
        // 清除旧的定时器
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
        }
        
        // 立即更新一次
        this.updateClock();
        
        // 每秒更新
        this.clockInterval = setInterval(() => {
            this.updateClock();
        }, 1000);
    },
    
    renderExpandedContent() {
        const container = document.getElementById('calendar-expanded-content');
        if (!container) {
            console.error('[Calendar] 找不到展开内容容器');
            return;
        }
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // 渲染头部
        this.renderHeader(container, year, month);
        
        // 渲染星期
        this.renderWeekdays(container);
        
        // 渲染日期
        this.renderDays(container, year, month);
        
        // 渲染底部
        this.renderFooter(container);
    },
    
    renderHeader(container, year, month) {
        const monthYearEl = container.querySelector('#calendar-month-year');
        const lunarEl = container.querySelector('#calendar-lunar');
        
        if (monthYearEl) {
            monthYearEl.textContent = `${year} 年 ${month + 1} 月`;
        }
        
        if (lunarEl) {
            const lunar = this.getLunarDate(this.currentDate);
            lunarEl.textContent = lunar;
        }
    },
    
    renderWeekdays(container) {
        // 星期行已经在HTML中，无需重新渲染
    },
    
    renderDays(container, year, month) {
        const daysContainer = container.querySelector('#calendar-days');
        if (!daysContainer) return;
        
        daysContainer.innerHTML = '';
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        const today = new Date();
        const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
        
        // 调整星期一为第一天 (0=周日 -> 6, 1=周一 -> 0, ..., 6=周六 -> 5)
        const startDay = firstDay === 0 ? 6 : firstDay - 1;
        
        // 上个月的日期
        for (let i = startDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const dayEl = this.createDayElement(day, year, month - 1, true);
            daysContainer.appendChild(dayEl);
        }
        
        // 当月的日期
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = isCurrentMonth && day === today.getDate();
            const dayEl = this.createDayElement(day, year, month, false, isToday);
            daysContainer.appendChild(dayEl);
        }
        
        // 下个月的日期（补齐到6行）
        const totalCells = daysContainer.children.length;
        const remaining = 42 - totalCells; // 6行 x 7列 = 42
        for (let day = 1; day <= remaining; day++) {
            const dayEl = this.createDayElement(day, year, month + 1, true);
            daysContainer.appendChild(dayEl);
        }
    },
    
    createDayElement(day, year, month, isOtherMonth, isToday = false) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        
        if (isOtherMonth) {
            dayEl.classList.add('other-month');
        }
        
        if (isToday) {
            dayEl.classList.add('today');
        }
        
        const date = new Date(year, month, day);
        const lunar = this.getLunarDay(date);
        
        dayEl.innerHTML = `
            <div class="calendar-day-number">${day}</div>
            <div class="calendar-day-lunar">${lunar}</div>
        `;
        
        dayEl.addEventListener('click', () => {
            // 移除其他选中
            const allDays = document.querySelectorAll('.calendar-day.selected');
            allDays.forEach(el => el.classList.remove('selected'));
            
            if (!isOtherMonth) {
                dayEl.classList.add('selected');
                this.selectedDate = date;
            }
        });
        
        return dayEl;
    },
    
    renderFooter(container) {
        // 底部已经在HTML中，无需重新渲染
    },
    
    // 简化的农历转换
    getLunarDate(date) {
        const lunarMonths = ['正月', '二月', '三月', '四月', '五月', '六月', 
                            '七月', '八月', '九月', '十月', '冬月', '腊月'];
        const month = lunarMonths[date.getMonth()];
        const day = this.getLunarDay(date);
        return `${month}${day}`;
    },
    
    getLunarDay(date) {
        const lunarDays = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
                          '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
                          '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
        
        // 简化：使用日期模30来模拟农历日期
        const day = ((date.getDate() + date.getMonth() * 3) % 30);
        return lunarDays[day] || '初一';
    }
};

console.log('[Calendar] 日历组件模块已加载');

