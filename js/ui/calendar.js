/**
 * 日历模块
 */
const Calendar = {
    currentDate: new Date(),
    selectedDate: null,
    
    // 农历数据（简化版，实际应用需要完整农历库）
    lunarInfo: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
                0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
                0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970],
    
    init() {
        this.render();
        this.bindEvents();
    },
    
    bindEvents() {
        const prevBtn = document.getElementById('calendar-prev-month');
        const nextBtn = document.getElementById('calendar-next-month');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.render();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
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
    },
    
    render() {
        this.renderHeader();
        this.renderDays();
    },
    
    renderHeader() {
        const monthYearEl = document.getElementById('calendar-month-year');
        const lunarEl = document.getElementById('calendar-lunar');
        
        if (monthYearEl) {
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth() + 1;
            monthYearEl.textContent = `${year} 年 ${month} 月`;
        }
        
        if (lunarEl) {
            const lunar = this.getLunarDate(this.currentDate);
            lunarEl.textContent = lunar;
        }
    },
    
    renderDays() {
        const daysContainer = document.getElementById('calendar-days');
        if (!daysContainer) return;
        
        daysContainer.innerHTML = '';
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        const today = new Date();
        const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
        
        // 调整星期一为第一天
        const startDay = firstDay === 0 ? 6 : firstDay - 1;
        
        // 上个月的日期
        for (let i = startDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const dayEl = this.createDayElement(day, month - 1, year, true);
            daysContainer.appendChild(dayEl);
        }
        
        // 当月的日期
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = isCurrentMonth && day === today.getDate();
            const dayEl = this.createDayElement(day, month, year, false, isToday);
            daysContainer.appendChild(dayEl);
        }
        
        // 下个月的日期
        const totalCells = daysContainer.children.length;
        const remaining = 42 - totalCells; // 6行 x 7列
        for (let day = 1; day <= remaining; day++) {
            const dayEl = this.createDayElement(day, month + 1, year, true);
            daysContainer.appendChild(dayEl);
        }
    },
    
    createDayElement(day, month, year, isOtherMonth, isToday = false) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        
        if (isOtherMonth) {
            dayEl.classList.add('other-month');
        }
        
        if (isToday) {
            dayEl.classList.add('today');
        }
        
        const lunar = this.getLunarDay(new Date(year, month, day));
        
        dayEl.innerHTML = `
            <div class="calendar-day-number">${day}</div>
            <div class="calendar-day-lunar">${lunar}</div>
        `;
        
        dayEl.addEventListener('click', () => {
            document.querySelectorAll('.calendar-day.selected').forEach(el => {
                el.classList.remove('selected');
            });
            if (!isOtherMonth) {
                dayEl.classList.add('selected');
                this.selectedDate = new Date(year, month, day);
            }
        });
        
        return dayEl;
    },
    
    // 简化的农历转换（仅作展示）
    getLunarDate(date) {
        const lunarMonths = ['正月', '二月', '三月', '四月', '五月', '六月', 
                            '七月', '八月', '九月', '十月', '冬月', '腊月'];
        // 简化处理：使用月份和日期模拟
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
    },
    
    // 获取节气（简化版）
    getSolarTerm(date) {
        const terms = {
            '1': ['小寒', '大寒'],
            '2': ['立春', '雨水'],
            '3': ['惊蛰', '春分'],
            '4': ['清明', '谷雨'],
            '5': ['立夏', '小满'],
            '6': ['芒种', '夏至'],
            '7': ['小暑', '大暑'],
            '8': ['立秋', '处暑'],
            '9': ['白露', '秋分'],
            '10': ['寒露', '霜降'],
            '11': ['立冬', '小雪'],
            '12': ['大雪', '冬至']
        };
        
        const month = (date.getMonth() + 1).toString();
        const day = date.getDate();
        
        if (terms[month] && day >= 20 && day <= 23) {
            return terms[month][day % 2];
        }
        
        return null;
    }
};

console.log('[Calendar] 日历模块已加载');

