/**
 * 时钟应用 - 使用 FluentUI 组件库
 * 包含：倒计时、秒表、世界时钟、日历事项
 */
const ClockApp = {
    windowId: null,
    container: null,
    currentTab: 'timer',
    
    // 倒计时状态
    timerRemaining: 0,
    timerTotal: 0,
    timerInterval: null,
    
    // 秒表状态
    stopwatchTime: 0,
    stopwatchInterval: null,
    stopwatchLaps: [],
    
    // 世界时钟城市列表
    worldClocks: [
        { nameKey: 'clock.city-beijing', timezone: 'Asia/Shanghai', offset: 8 },
        { nameKey: 'clock.city-newyork', timezone: 'America/New_York', offset: -5 },
        { nameKey: 'clock.city-london', timezone: 'Europe/London', offset: 0 },
        { nameKey: 'clock.city-tokyo', timezone: 'Asia/Tokyo', offset: 9 },
        { nameKey: 'clock.city-paris', timezone: 'Europe/Paris', offset: 1 },
        { nameKey: 'clock.city-sydney', timezone: 'Australia/Sydney', offset: 10 }
    ],

    // 日历事项
    calendarEvents: [],
    selectedDate: null,

    getTabs() {
        return [
            { id: 'timer', label: t('clock.timer'), icon: 'Clock' },
            { id: 'stopwatch', label: t('clock.stopwatch'), icon: 'Timer' },
            { id: 'worldclock', label: t('clock.worldclock'), icon: 'Globe' },
            { id: 'calendar', label: t('clock.calendar'), icon: 'Calendar' }
        ];
    },

    init(windowId) {
        this.windowId = windowId || `window-${Date.now()}`;
        this.container = document.getElementById(`${this.windowId}-content`);
        this.loadData();
        this.render();

        // 监听语言切换
        this._langHandler = () => { this.render(); };
        State.on('languageChange', this._langHandler);
    },
    
    loadData() {
        const data = Storage.get('clock_data') || {};
        this.calendarEvents = data.events || [];
        this.worldClocks = data.worldClocks || this.worldClocks;
    },
    
    saveData() {
        Storage.set('clock_data', {
            events: this.calendarEvents,
            worldClocks: this.worldClocks
        });
    },

    render() {
        this.container.innerHTML = '';
        
        const app = document.createElement('div');
        app.className = 'clock-app';
        
        // 使用 FluentUI.Sidebar 创建侧边栏
        const sidebar = FluentUI.Sidebar({
            items: this.getTabs().map(tab => ({ id: tab.id, label: tab.label, icon: tab.icon })),
            activeItem: this.currentTab,
            onItemClick: (tabId) => {
                this.currentTab = tabId;
                this.render();
            }
        });
        
        // 内容区域
        const content = document.createElement('div');
        content.className = 'clock-content';
        content.id = 'clock-content';
        content.innerHTML = this.renderTab();
        
        app.appendChild(sidebar);
        app.appendChild(content);
        this.container.appendChild(app);

        this.addStyles();
        this.bindEvents();
    },

    addStyles() {
        if (document.getElementById('clock-app-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'clock-app-styles';
        style.textContent = `
            .clock-app { display: flex; height: 100%; }
            .clock-content { flex: 1; overflow-y: auto; padding: 32px; display: flex; flex-direction: column; align-items: center; }
            
            /* 倒计时样式 */
            .timer-display { font-size: 72px; font-weight: 300; margin: 48px 0; font-variant-numeric: tabular-nums; }
            .timer-inputs { display: flex; gap: 16px; margin-bottom: 32px; }
            .timer-input-group { display: flex; flex-direction: column; align-items: center; gap: 8px; }
            .timer-input-group label { font-size: 12px; color: var(--text-secondary); }
            .timer-input-group input { width: 80px; padding: 12px; text-align: center; font-size: 24px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-tertiary); color: var(--text-primary); padding-right: 40px; }
            /* 隐藏浏览器原生 number 微调按钮 */
            .timer-input-group input[type=number]::-webkit-outer-spin-button,
            .timer-input-group input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            .timer-input-group input[type=number] { -moz-appearance: textfield; appearance: textfield; }
            /* 自定义 stepper */
            .number-input { position: relative; display: inline-flex; align-items: center; }
            .number-stepper { position: absolute; right: 8px; top: 8px; display: flex; flex-direction: column; gap: 6px; }
            .stepper-btn { width: 18px; height: 16px; border-radius: 4px; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: inset 0 0 0 1px var(--border-color); transition: background var(--transition-fast); }
            .stepper-btn:hover { background: rgba(0,0,0,0.08); }
            .dark-mode .stepper-btn:hover { background: rgba(255,255,255,0.12); }
            .arrow { width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; }
            .arrow.up { border-bottom: 7px solid var(--text-secondary); }
            .arrow.down { border-top: 7px solid var(--text-secondary); }
            .timer-controls { display: flex; gap: 12px; }
            .timer-btn { padding: 12px 32px; border-radius: var(--radius-md); font-size: 14px; font-weight: 500; cursor: pointer; transition: all var(--transition-fast); }
            .timer-btn.primary { background: var(--accent); color: white; }
            .timer-btn.primary:hover { background: var(--accent-hover); }
            .timer-btn.secondary { background: var(--bg-tertiary); color: var(--text-primary); }
            .timer-btn.secondary:hover { background: rgba(0, 0, 0, 0.1); }
            .timer-progress { width: 300px; height: 8px; background: var(--bg-tertiary); border-radius: 4px; margin: 24px 0; overflow: hidden; }
            .timer-progress-bar { height: 100%; background: var(--accent); transition: width 0.3s ease; }
            
            /* 秒表样式 */
            .stopwatch-display { font-size: 72px; font-weight: 300; margin: 48px 0; font-variant-numeric: tabular-nums; }
            .stopwatch-controls { display: flex; gap: 12px; margin-bottom: 32px; }
            .stopwatch-laps { width: 100%; max-width: 400px; }
            .stopwatch-lap { display: flex; justify-content: space-between; padding: 12px 16px; background: var(--bg-tertiary); border-radius: var(--radius-md); margin-bottom: 8px; }
            .stopwatch-lap-index { font-weight: 500; }
            .stopwatch-lap-time { font-variant-numeric: tabular-nums; }
            
            /* 世界时钟样式 */
            .worldclock-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; width: 100%; }
            .worldclock-card { padding: 24px; background: var(--bg-tertiary); border-radius: var(--radius-lg); text-align: center; }
            .worldclock-city { font-size: 18px; font-weight: 500; margin-bottom: 8px; }
            .worldclock-time { font-size: 48px; font-weight: 300; margin: 16px 0; font-variant-numeric: tabular-nums; }
            .worldclock-date { font-size: 14px; color: var(--text-secondary); }
            
            /* 日历样式 */
            .calendar-container { width: 100%; max-width: 900px; }
            .calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
            .calendar-month { font-size: 24px; font-weight: 600; }
            .calendar-nav { display: flex; gap: 8px; }
            .calendar-nav-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); background: var(--bg-tertiary); cursor: pointer; transition: background var(--transition-fast); }
            .calendar-nav-btn:hover { background: rgba(0, 0, 0, 0.1); }
            .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 24px; }
            .calendar-day-header { text-align: center; padding: 12px; font-size: 12px; font-weight: 600; color: var(--text-secondary); }
            .calendar-day { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px; background: var(--bg-tertiary); border-radius: var(--radius-md); cursor: pointer; transition: all var(--transition-fast); position: relative; }
            .calendar-day:hover { background: rgba(0, 0, 0, 0.05); }
            .calendar-day.selected { background: var(--accent); color: white; }
            .calendar-day.today { border: 2px solid var(--accent); }
            .calendar-day.other-month { opacity: 0.3; }
            .calendar-day.has-event::after { content: ''; position: absolute; bottom: 4px; width: 4px; height: 4px; background: var(--accent); border-radius: 50%; }
            .calendar-day.selected.has-event::after { background: white; }
            .calendar-events { width: 100%; }
            .calendar-events-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
            .calendar-events-title { font-size: 18px; font-weight: 600; }
            .calendar-add-btn { padding: 8px 16px; background: var(--accent); color: white; border-radius: var(--radius-md); font-size: 13px; cursor: pointer; }
            .calendar-add-btn:hover { background: var(--accent-hover); }
            .calendar-event { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg-tertiary); border-radius: var(--radius-md); margin-bottom: 8px; }
            .calendar-event-info { flex: 1; }
            .calendar-event-time { font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
            .calendar-event-title { font-size: 14px; font-weight: 500; }
            .calendar-event-delete { padding: 6px 12px; font-size: 12px; color: var(--text-secondary); cursor: pointer; border-radius: var(--radius-sm); }
            .calendar-event-delete:hover { background: rgba(255, 0, 0, 0.1); color: #ff4444; }
            .calendar-empty { text-align: center; padding: 32px; color: var(--text-tertiary); }
            
            /* 暗色模式 */
            .dark-mode .clock-nav-item:hover { background: rgba(255, 255, 255, 0.1); }
            .dark-mode .timer-btn.secondary:hover { background: rgba(255, 255, 255, 0.1); }
            .dark-mode .calendar-day:hover { background: rgba(255, 255, 255, 0.1); }
            .dark-mode .calendar-nav-btn:hover { background: rgba(255, 255, 255, 0.1); }
            
            /* 自定义滚动条 - 与通知中心一致 */
            .clock-app *::-webkit-scrollbar { width: 6px; height: 6px; }
            .clock-app *::-webkit-scrollbar-track { background: transparent; }
            .clock-app *::-webkit-scrollbar-thumb { background: var(--text-tertiary); border-radius: 3px; }
            .clock-app *::-webkit-scrollbar-thumb:hover { background: var(--text-secondary); }
            /* Firefox */
            .clock-app * { scrollbar-width: thin; scrollbar-color: var(--text-tertiary) transparent; }
        `;
        document.head.appendChild(style);
    },

    renderTab() {
        switch (this.currentTab) {
            case 'timer':
                return this.renderTimer();
            case 'stopwatch':
                return this.renderStopwatch();
            case 'worldclock':
                return this.renderWorldClock();
            case 'calendar':
                return this.renderCalendar();
            default:
                return '';
        }
    },

    renderTimer() {
        const hours = Math.floor(this.timerRemaining / 3600);
        const minutes = Math.floor((this.timerRemaining % 3600) / 60);
        const seconds = this.timerRemaining % 60;
        const progress = this.timerTotal > 0 ? ((this.timerTotal - this.timerRemaining) / this.timerTotal) * 100 : 0;

        return `
            <div class="timer-display">${this.formatTime(hours, minutes, seconds)}</div>
            ${this.timerInterval ? `
                <div class="timer-progress">
                    <div class="timer-progress-bar" style="width: ${progress}%"></div>
                </div>
            ` : `
                <div class="timer-inputs">
                    <div class="timer-input-group">
                        <label>${t('clock.hours')}</label>
                        <div class="number-input">
                            <input type="number" id="timer-hours" min="0" max="23" value="0">
                            <div class="number-stepper" data-target="timer-hours">
                                <div class="stepper-btn step-up"><span class="arrow up"></span></div>
                                <div class="stepper-btn step-down"><span class="arrow down"></span></div>
                            </div>
                        </div>
                    </div>
                    <div class="timer-input-group">
                        <label>${t('clock.minutes')}</label>
                        <div class="number-input">
                            <input type="number" id="timer-minutes" min="0" max="59" value="1">
                            <div class="number-stepper" data-target="timer-minutes">
                                <div class="stepper-btn step-up"><span class="arrow up"></span></div>
                                <div class="stepper-btn step-down"><span class="arrow down"></span></div>
                            </div>
                        </div>
                    </div>
                    <div class="timer-input-group">
                        <label>${t('clock.seconds')}</label>
                        <div class="number-input">
                            <input type="number" id="timer-seconds" min="0" max="59" value="0">
                            <div class="number-stepper" data-target="timer-seconds">
                                <div class="stepper-btn step-up"><span class="arrow up"></span></div>
                                <div class="stepper-btn step-down"><span class="arrow down"></span></div>
                            </div>
                        </div>
                    </div>
                </div>
            `}
            <div class="timer-controls">
                ${this.timerInterval ? `
                    <button class="timer-btn secondary" id="timer-pause">${t('clock.pause')}</button>
                    <button class="timer-btn secondary" id="timer-reset">${t('clock.reset')}</button>
                ` : `
                    <button class="timer-btn primary" id="timer-start">${this.timerRemaining > 0 ? t('clock.continue') : t('clock.start')}</button>
                    ${this.timerRemaining > 0 ? `<button class="timer-btn secondary" id="timer-reset">${t('clock.reset')}</button>` : ''}
                `}
            </div>
        `;
    },

    renderStopwatch() {
        const ms = this.stopwatchTime % 1000;
        const totalSeconds = Math.floor(this.stopwatchTime / 1000);
        const seconds = totalSeconds % 60;
        const minutes = Math.floor(totalSeconds / 60) % 60;
        const hours = Math.floor(totalSeconds / 3600);

        return `
            <div class="stopwatch-display">${this.formatTime(hours, minutes, seconds)}.${String(Math.floor(ms / 10)).padStart(2, '0')}</div>
            <div class="stopwatch-controls">
                ${this.stopwatchInterval ? `
                    <button class="timer-btn secondary" id="stopwatch-lap">${t('clock.lap')}</button>
                    <button class="timer-btn primary" id="stopwatch-pause">${t('clock.pause')}</button>
                ` : `
                    <button class="timer-btn primary" id="stopwatch-start">${this.stopwatchTime > 0 ? t('clock.continue') : t('clock.start')}</button>
                    ${this.stopwatchTime > 0 ? `<button class="timer-btn secondary" id="stopwatch-reset">${t('clock.reset')}</button>` : ''}
                `}
            </div>
            ${this.stopwatchLaps.length > 0 ? `
                <div class="stopwatch-laps">
                    ${this.stopwatchLaps.map((lap, index) => `
                        <div class="stopwatch-lap">
                            <span class="stopwatch-lap-index">${t('clock.lap-n', { n: this.stopwatchLaps.length - index })}</span>
                            <span class="stopwatch-lap-time">${this.formatStopwatchTime(lap)}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    },

    renderWorldClock() {
        const now = new Date();
        const lang = (typeof I18n !== 'undefined') ? I18n.currentLang : 'zh';
        const dateLoc = lang === 'en' ? 'en-US' : 'zh-CN';

        return `
            <div class="worldclock-grid">
                ${this.worldClocks.map(city => {
                    const cityTime = new Date(now.toLocaleString('en-US', { timeZone: city.timezone }));
                    const hours = cityTime.getHours();
                    const minutes = cityTime.getMinutes();
                    const seconds = cityTime.getSeconds();
                    const date = cityTime.toLocaleDateString(dateLoc, { month: 'long', day: 'numeric' });

                    return `
                        <div class="worldclock-card">
                            <div class="worldclock-city">${t(city.nameKey)}</div>
                            <div class="worldclock-time">${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</div>
                            <div class="worldclock-date">${date}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    renderCalendar() {
        const now = new Date();
        const currentYear = this.selectedDate ? this.selectedDate.getFullYear() : now.getFullYear();
        const currentMonth = this.selectedDate ? this.selectedDate.getMonth() : now.getMonth();
        
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const firstDayWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        
        const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
        
        let days = [];
        
        // 上个月的天数
        for (let i = firstDayWeek - 1; i >= 0; i--) {
            days.push({
                day: prevMonthLastDay - i,
                isCurrentMonth: false,
                date: new Date(currentYear, currentMonth - 1, prevMonthLastDay - i)
            });
        }
        
        // 当前月的天数
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                day: i,
                isCurrentMonth: true,
                date: new Date(currentYear, currentMonth, i)
            });
        }
        
        // 下个月的天数
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                day: i,
                isCurrentMonth: false,
                date: new Date(currentYear, currentMonth + 1, i)
            });
        }
        
        const selectedDateStr = this.selectedDate ? this.selectedDate.toDateString() : null;
        const todayStr = now.toDateString();
        
        const dayEvents = this.calendarEvents.filter(e => {
            if (!selectedDateStr) return false;
            const eventDate = new Date(e.date);
            return eventDate.toDateString() === selectedDateStr;
        });

        return `
            <div class="calendar-container">
                <div class="calendar-header">
                    <div class="calendar-month">${t('clock.year-month', { year: currentYear, month: currentMonth + 1 })}</div>
                    <div class="calendar-nav">
                        <div class="calendar-nav-btn" id="calendar-prev">‹</div>
                        <div class="calendar-nav-btn" id="calendar-today">${t('clock.today')}</div>
                        <div class="calendar-nav-btn" id="calendar-next">›</div>
                    </div>
                </div>
                <div class="calendar-grid">
                    ${t('clock.weekdays').split(',').map(d =>
                        `<div class="calendar-day-header">${d}</div>`
                    ).join('')}
                    ${days.map(d => {
                        const dateStr = d.date.toDateString();
                        const isSelected = dateStr === selectedDateStr;
                        const isToday = dateStr === todayStr;
                        const hasEvent = this.calendarEvents.some(e => new Date(e.date).toDateString() === dateStr);

                        return `
                            <div class="calendar-day ${d.isCurrentMonth ? '' : 'other-month'} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}"
                                 data-date="${d.date.toISOString()}">
                                ${d.day}
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="calendar-events">
                    <div class="calendar-events-header">
                        <div class="calendar-events-title">${selectedDateStr ? t('clock.event-title', { month: this.selectedDate.getMonth() + 1, day: this.selectedDate.getDate() }) : t('clock.select-date')}</div>
                        ${selectedDateStr ? `<div class="calendar-add-btn" id="calendar-add-event">${t('clock.add-event')}</div>` : ''}
                    </div>
                    ${selectedDateStr ? (dayEvents.length > 0 ? dayEvents.map(event => `
                        <div class="calendar-event">
                            <div class="calendar-event-info">
                                <div class="calendar-event-time">${event.time}</div>
                                <div class="calendar-event-title">${event.title}</div>
                            </div>
                            <div class="calendar-event-delete" data-id="${event.id}">${t('clock.delete')}</div>
                        </div>
                    `).join('') : `<div class="calendar-empty">${t('clock.no-events')}</div>`) : `<div class="calendar-empty">${t('clock.select-date')}</div>`}
                </div>
            </div>
        `;
    },

    bindEvents() {
        const content = document.getElementById('clock-content');
        
        // 倒计时事件
        content.addEventListener('click', (e) => {
            // 自定义数字 stepper
            const stepBtn = e.target.closest('.stepper-btn');
            if (stepBtn) {
                const stepper = stepBtn.closest('.number-stepper');
                const targetId = stepper && stepper.dataset.target;
                const input = targetId && document.getElementById(targetId);
                if (input) {
                    const min = Number.isFinite(parseInt(input.min)) ? parseInt(input.min) : 0;
                    const maxRaw = parseInt(input.max);
                    const max = Number.isFinite(maxRaw) ? maxRaw : Infinity;
                    let value = parseInt(input.value) || 0;
                    value += stepBtn.classList.contains('step-up') ? 1 : -1;
                    if (value < min) value = min;
                    if (value > max) value = max;
                    input.value = String(value);
                }
                return; // 阻止继续匹配到下面的按钮逻辑
            }
            if (e.target.id === 'timer-start') {
                this.startTimer();
            } else if (e.target.id === 'timer-pause') {
                this.pauseTimer();
            } else if (e.target.id === 'timer-reset') {
                this.resetTimer();
            }
            // 秒表事件
            else if (e.target.id === 'stopwatch-start') {
                this.startStopwatch();
            } else if (e.target.id === 'stopwatch-pause') {
                this.pauseStopwatch();
            } else if (e.target.id === 'stopwatch-reset') {
                this.resetStopwatch();
            } else if (e.target.id === 'stopwatch-lap') {
                this.addLap();
            }
            // 日历事件
            else if (e.target.classList.contains('calendar-day')) {
                const date = new Date(e.target.dataset.date);
                this.selectedDate = date;
                this.render();
            } else if (e.target.id === 'calendar-prev') {
                this.changeMonth(-1);
            } else if (e.target.id === 'calendar-next') {
                this.changeMonth(1);
            } else if (e.target.id === 'calendar-today') {
                this.selectedDate = new Date();
                this.render();
            } else if (e.target.id === 'calendar-add-event') {
                this.addEvent();
            } else if (e.target.classList.contains('calendar-event-delete')) {
                this.deleteEvent(e.target.dataset.id);
            }
        });
        
        // 世界时钟自动更新
        if (this.currentTab === 'worldclock') {
            this.worldClockInterval = setInterval(() => {
                if (this.currentTab === 'worldclock') {
                    this.updateWorldClock();
                } else {
                    clearInterval(this.worldClockInterval);
                }
            }, 1000);
        }
    },

    // 倒计时方法
    startTimer() {
        if (this.timerRemaining === 0) {
            const hours = parseInt(document.getElementById('timer-hours').value) || 0;
            const minutes = parseInt(document.getElementById('timer-minutes').value) || 0;
            const seconds = parseInt(document.getElementById('timer-seconds').value) || 0;
            
            this.timerRemaining = hours * 3600 + minutes * 60 + seconds;
            this.timerTotal = this.timerRemaining;
            
            if (this.timerRemaining === 0) return;
        }
        
        this.timerInterval = setInterval(() => {
            this.timerRemaining--;
            this.updateTimerDisplay();
            
            if (this.timerRemaining <= 0) {
                this.pauseTimer();
                this.timerCompleted();
            }
        }, 1000);
        
        this.render();
    },

    pauseTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.render();
    },

    resetTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.timerRemaining = 0;
        this.timerTotal = 0;
        this.render();
    },

    updateTimerDisplay() {
        const hours = Math.floor(this.timerRemaining / 3600);
        const minutes = Math.floor((this.timerRemaining % 3600) / 60);
        const seconds = this.timerRemaining % 60;
        const progress = this.timerTotal > 0 ? ((this.timerTotal - this.timerRemaining) / this.timerTotal) * 100 : 0;
        
        const display = document.querySelector('.timer-display');
        const progressBar = document.querySelector('.timer-progress-bar');
        
        if (display) display.textContent = this.formatTime(hours, minutes, seconds);
        if (progressBar) progressBar.style.width = progress + '%';
    },

    timerCompleted() {
        State.addNotification(t('clock.timer-done'), t('clock.timer-done-msg'));
    },

    // 秒表方法
    startStopwatch() {
        this.stopwatchInterval = setInterval(() => {
            this.stopwatchTime += 10;
            this.updateStopwatchDisplay();
        }, 10);
        this.render();
    },

    pauseStopwatch() {
        clearInterval(this.stopwatchInterval);
        this.stopwatchInterval = null;
        this.render();
    },

    resetStopwatch() {
        clearInterval(this.stopwatchInterval);
        this.stopwatchInterval = null;
        this.stopwatchTime = 0;
        this.stopwatchLaps = [];
        this.render();
    },

    addLap() {
        this.stopwatchLaps.unshift(this.stopwatchTime);
        this.render();
    },

    updateStopwatchDisplay() {
        const ms = this.stopwatchTime % 1000;
        const totalSeconds = Math.floor(this.stopwatchTime / 1000);
        const seconds = totalSeconds % 60;
        const minutes = Math.floor(totalSeconds / 60) % 60;
        const hours = Math.floor(totalSeconds / 3600);
        
        const display = document.querySelector('.stopwatch-display');
        if (display) {
            display.textContent = `${this.formatTime(hours, minutes, seconds)}.${String(Math.floor(ms / 10)).padStart(2, '0')}`;
        }
    },

    // 世界时钟方法
    updateWorldClock() {
        const cards = document.querySelectorAll('.worldclock-card');
        const now = new Date();
        
        cards.forEach((card, index) => {
            const city = this.worldClocks[index];
            const cityTime = new Date(now.toLocaleString('en-US', { timeZone: city.timezone }));
            const timeDisplay = card.querySelector('.worldclock-time');
            if (timeDisplay) {
                const hours = cityTime.getHours();
                const minutes = cityTime.getMinutes();
                const seconds = cityTime.getSeconds();
                timeDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
        });
    },

    // 日历方法
    changeMonth(delta) {
        if (!this.selectedDate) {
            this.selectedDate = new Date();
        }
        this.selectedDate.setMonth(this.selectedDate.getMonth() + delta);
        this.render();
    },

    addEvent() {
        FluentUI.InputDialog({
            title: t('clock.add-event-title'),
            placeholder: t('clock.event-placeholder'),
            validateFn: (value) => value ? true : t('clock.title-required'),
            onConfirm: (title) => {
                // 获取时间
                FluentUI.InputDialog({
                    title: t('clock.set-time'),
                    placeholder: t('clock.time-placeholder'),
                    defaultValue: '09:00',
                    validateFn: (value) => {
                        if (!value) return t('clock.time-required');
                        if (!/^\d{1,2}:\d{2}$/.test(value)) return t('clock.time-format');
                        return true;
                    },
                    onConfirm: (time) => {
                        const event = {
                            id: `event-${Date.now()}`,
                            date: this.selectedDate.toISOString(),
                            time: time,
                            title: title
                        };

                        this.calendarEvents.push(event);
                        this.saveData();
                        this.render();

                        FluentUI.Toast({
                            title: t('clock.event-added'),
                            message: `${title}- ${time}`,
                            type: 'success'
                        });
                    }
                });
            }
        });
    },

    deleteEvent(id) {
        this.calendarEvents = this.calendarEvents.filter(e => e.id !== id);
        this.saveData();
        this.render();
    },

    // 工具方法
    formatTime(hours, minutes, seconds) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },

    formatStopwatchTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const seconds = totalSeconds % 60;
        const minutes = Math.floor(totalSeconds / 60) % 60;
        const hours = Math.floor(totalSeconds / 3600);
        const centiseconds = Math.floor((ms % 1000) / 10);
        
        return `${this.formatTime(hours, minutes, seconds)}.${String(centiseconds).padStart(2, '0')}`;
    }
};

// 调试：确认 ClockApp 已加载
console.log('[ClockApp] 时钟应用模块已加载', ClockApp);

// 将应用暴露到全局，供 WindowManager 调用
window.ClockApp = ClockApp;

