/**
 * 日历组件 - 完全模仿图片样式
 */
const CalendarWidget = {
    currentDate: new Date(),
    selectedDate: null,
    focusMinutes: 30,
    
    init() {
        console.log('[Calendar] 初始化日历组件');
        
        this.render();
        this.bindEvents();
        
        console.log('[Calendar] 日历组件初始化完成');
    },
    
    bindEvents() {
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
        
        // 专注时间控制
        const decreaseBtn = document.getElementById('focus-decrease');
        const increaseBtn = document.getElementById('focus-increase');
        const startBtn = document.getElementById('focus-start');
        
        if (decreaseBtn) {
            decreaseBtn.addEventListener('click', () => {
                this.changeFocusTime(-5);
            });
        }
        
        if (increaseBtn) {
            increaseBtn.addEventListener('click', () => {
                this.changeFocusTime(5);
            });
        }
        
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.startFocus();
            });
        }
    },
    
    changeMonth(delta) {
        const newDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + delta, 1);
        this.currentDate = newDate;
        this.render();
    },
    
    changeFocusTime(delta) {
        this.focusMinutes = Math.max(5, Math.min(120, this.focusMinutes + delta));
        this.updateFocusDisplay();
    },
    
    updateFocusDisplay() {
        const display = document.getElementById('focus-time-display');
        if (display) {
            display.textContent = `${this.focusMinutes} 分钟`;
        }
    },
    
    startFocus() {
        notify('专注模式', `开始 ${this.focusMinutes} 分钟的专注时间`, 'info');
    },
    
    render() {
        this.renderYearNav();
        this.renderCurrentInfo();
        this.renderDays();
        this.updateFocusDisplay();
    },
    
    renderYearNav() {
        const yearEl = document.getElementById('calendar-year');
        if (yearEl) {
            yearEl.textContent = `${this.currentDate.getFullYear()} 年`;
        }
    },
    
    renderCurrentInfo() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const weekday = weekdays[now.getDay()];
        
        const dateFullEl = document.getElementById('calendar-current-date-full');
        if (dateFullEl) {
            dateFullEl.textContent = `${month} 月 ${day} 日，${weekday}`;
        }
        
        const lunarEl = document.getElementById('calendar-current-lunar');
        if (lunarEl) {
            const lunar = this.getLunarDate(now);
            lunarEl.textContent = lunar;
        }
    },
    
    renderDays() {
        const container = document.getElementById('calendar-days');
        if (!container) return;
        
        container.innerHTML = '';
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        const today = new Date();
        const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
        
        // 调整：周一为第一天
        const startDay = firstDay === 0 ? 6 : firstDay - 1;
        
        // 上个月的日期
        for (let i = startDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const dayEl = this.createDayElement(day, year, month - 1, true);
            container.appendChild(dayEl);
        }
        
        // 当月的日期
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = isCurrentMonth && day === today.getDate();
            const dayEl = this.createDayElement(day, year, month, false, isToday);
            container.appendChild(dayEl);
        }
        
        // 下个月的日期（补齐到6行）
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
            } else {
                // 切换到对应月份
                this.currentDate = new Date(year, month, 1);
                this.render();
            }
        });
        
        return dayEl;
    },
    
    // 农历转换（简化版本）
    getLunarDate(date) {
        const lunarMonths = ['正月', '二月', '三月', '四月', '五月', '六月', 
                            '七月', '八月', '九月', '十月', '冬月', '腊月'];
        
        // 这里使用简化的农历算法，实际项目中应该使用专业的农历库
        // 使用偏移量模拟农历月份
        const monthOffset = Math.floor((date.getDate() + date.getMonth() * 30) / 30) % 12;
        return lunarMonths[monthOffset];
    },
    
    getLunarDay(date) {
        const lunarDays = [
            '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
            '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
            '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
        ];
        
        // 简化：使用日期模30来模拟农历日期
        const lunarDayIndex = ((date.getDate() + date.getMonth() * 3) % 30);
        return lunarDays[lunarDayIndex];
    },
    
    // 获取节气（简化版本）
    getSolarTerm(date) {
        const solarTerms = {
            '3-20': '春分',
            '6-21': '夏至',
            '9-23': '秋分',
            '12-22': '冬至',
            '8-23': '处暑'
        };
        
        const key = `${date.getMonth() + 1}-${date.getDate()}`;
        return solarTerms[key] || '';
    }
};

console.log('[Calendar] 日历组件模块已加载');

