/**
 * 时钟应用 - 使用 FluentUI 组件库
 * 包含：倒计时、秒表、世界时钟、日历事项
 */
const ClockApp = {
    windowId: null,
    container: null,
    frame: null,
    currentTab: 'timer',
    timerNotificationId: null,
    
    // 倒计时状态
    timerRemaining: 0,
    timerTotal: 0,
    timerInterval: null,
    timerEndTime: null,
    
    // 秒表状态
    stopwatchTime: 0,
    stopwatchInterval: null,
    stopwatchStartedAt: null,
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

    openData(data = null) {
        if (data && data.tab) {
            this.currentTab = data.tab;
        }
        this.render();
    },
    
    loadData() {
        const data = Storage.get('clock_data') || {};
        this.calendarEvents = (data.events || []).map(event => ({
            ...event,
            completed: event.completed === true
        }));
        this.worldClocks = data.worldClocks || this.worldClocks;
    },
    
    saveData() {
        Storage.set('clock_data', {
            events: this.calendarEvents,
            worldClocks: this.worldClocks
        });
        if (typeof State !== 'undefined' && typeof State.emit === 'function') {
            State.emit('clockEventsUpdate', { events: this.calendarEvents });
        }
        if (typeof ClockReminderService !== 'undefined') {
            ClockReminderService.checkDueEvents();
        }
    },

    render() {
        this.container.innerHTML = '';

        if (this.frame && typeof this.frame.destroy === 'function') {
            this.frame.destroy();
            this.frame = null;
        }

        if (typeof FluentWindow === 'undefined' || typeof FluentWindow.mount !== 'function') {
            console.error('[ClockApp] FluentWindow framework is not loaded');
            return;
        }

        this.frame = FluentWindow.mount({
            container: this.container,
            items: this.getTabs().map(tab => ({ id: tab.id, label: tab.label, icon: tab.icon })),
            activeId: this.currentTab,
            onNavigate: (tabId, pageEl) => {
                this.currentTab = tabId;
                pageEl.classList.add('clock-content');
                pageEl.id = 'clock-content';
                pageEl.innerHTML = this.renderTab();
                this.addStyles();
                this.bindEvents();
            }
        });
    },

    beforeClose() {
        if (this.frame && typeof this.frame.destroy === 'function') {
            this.frame.destroy();
            this.frame = null;
        }
        return true;
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
            .timer-btn { min-width: 132px; justify-content: center; }
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
            .calendar-day.selected { background: rgba(var(--accent-rgb, 0, 120, 212), 0.08); color: var(--accent); box-shadow: inset 0 0 0 2px var(--accent); }
            .calendar-day.today { border: 2px solid var(--accent); }
            .calendar-day.other-month { opacity: 0.3; }
            .calendar-day.has-event::after { content: ''; position: absolute; bottom: 4px; width: 4px; height: 4px; background: var(--accent); border-radius: 50%; }
            .calendar-day.selected.has-event::after { background: var(--accent); }
            .calendar-events { width: 100%; }
            .calendar-events-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
            .calendar-events-title { font-size: 18px; font-weight: 600; }
            .calendar-add-btn.fluent-btn { min-height: 36px; padding: 0 18px; border: none; border-radius: 999px; cursor: pointer; font-size: 13px; }
            .calendar-events-list { display: flex; flex-direction: column; gap: 8px; }
            .calendar-event { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 16px; background: var(--bg-tertiary); border-radius: var(--radius-md); transition: opacity 260ms cubic-bezier(0.22, 1, 0.36, 1), background var(--transition-fast); }
            .calendar-event-info { flex: 1; min-width: 0; }
            .calendar-event-time { font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
            .calendar-event-title { font-size: 14px; font-weight: 500; overflow-wrap: anywhere; }
            .calendar-event.completed { opacity: 0.58; }
            .calendar-event.completed .calendar-event-time,
            .calendar-event.completed .calendar-event-title { color: var(--text-tertiary); }
            .calendar-event.completed .calendar-event-title { text-decoration: line-through; }
            .calendar-event-actions { display: flex; flex: 0 0 auto; gap: 8px; align-items: center; }
            .calendar-event-action.fluent-btn { min-width: 68px; min-height: 32px; padding: 0 14px; border-radius: 999px; font-size: 12px; cursor: pointer; }
            .calendar-event-action .fluent-btn-text { color: inherit !important; }
            .calendar-event-complete.fluent-btn { color: var(--accent) !important; }
            .calendar-event.completed .calendar-event-complete.fluent-btn { color: var(--text-secondary) !important; }
            .calendar-empty { text-align: center; padding: 32px; color: var(--text-tertiary); }
            .clock-event-modal.fluent-modal-overlay { background: rgba(0, 0, 0, 0.42); backdrop-filter: blur(24px) saturate(125%); -webkit-backdrop-filter: blur(24px) saturate(125%); }
            .clock-event-modal .fluent-modal { overflow: hidden; }
            .clock-event-modal .fluent-modal-header,
            .clock-event-modal .fluent-modal-content { background: var(--bg-primary); }
            .clock-event-modal .fluent-modal-footer { gap: 10px; padding: 16px 24px 22px; background: var(--bg-secondary); border-top-color: var(--border-color); }
            .clock-event-modal .fluent-modal-footer .fluent-btn { min-width: 76px; min-height: 34px; padding: 0 18px; border-radius: 999px; font-size: 13px; }
            body.fluent-v2 .clock-event-modal .fluent-modal-header,
            body.fluent-v2 .clock-event-modal .fluent-modal-content { background: rgba(255, 255, 255, 0.38); }
            body.fluent-v2 .clock-event-modal .fluent-modal-footer { background: rgba(255, 255, 255, 0.52); border-top-color: var(--v2-glass-border); }
            body.dark-mode .clock-event-modal .fluent-modal-header,
            body.dark-mode .clock-event-modal .fluent-modal-content { background: var(--bg-primary); }
            body.dark-mode .clock-event-modal .fluent-modal-footer { background: var(--bg-secondary); }
            body.fluent-v2.dark-mode .clock-event-modal .fluent-modal-header,
            body.fluent-v2.dark-mode .clock-event-modal .fluent-modal-content { background: rgba(32, 32, 36, 0.58); }
            body.fluent-v2.dark-mode .clock-event-modal .fluent-modal-footer { background: rgba(24, 24, 28, 0.72); border-top-color: var(--v2-glass-border-dark); }
            .clock-event-dialog { display: flex; flex-direction: column; gap: 14px; min-width: 320px; }
            .clock-event-field { display: flex; flex-direction: column; gap: 8px; }
            .clock-event-field label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
            .clock-event-field input { width: 100%; height: 38px; padding: 0 12px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-secondary); color: var(--text-primary); outline: none; font: inherit; }
            .clock-event-field input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(var(--accent-rgb, 0, 120, 212), 0.16); }
            .clock-event-error { display: none; min-height: 16px; color: #d13438; font-size: 12px; }
            
            /* 暗色模式 */
            .dark-mode .clock-nav-item:hover { background: rgba(255, 255, 255, 0.1); }
            .dark-mode .calendar-day:hover { background: rgba(255, 255, 255, 0.1); }
            .dark-mode .calendar-nav-btn:hover { background: rgba(255, 255, 255, 0.1); }
            
            body.fluent-v2 .clock-content .timer-btn.fluent-btn { min-width: 148px; }
            body:not(.dark-mode) .clock-content .timer-btn.fluent-btn,
            body:not(.dark-mode) .clock-content .timer-btn.fluent-btn .fluent-btn-text {
                color: #000000 !important;
                -webkit-text-fill-color: #000000 !important;
                background-clip: border-box !important;
                -webkit-background-clip: border-box !important;
                background-image: none !important;
            }
            body.dark-mode .clock-content .timer-btn.fluent-btn,
            body.dark-mode .clock-content .timer-btn.fluent-btn .fluent-btn-text {
                color: #ffffff !important;
                -webkit-text-fill-color: #ffffff !important;
                background-clip: border-box !important;
                -webkit-background-clip: border-box !important;
                background-image: none !important;
            }
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
        const remaining = Math.max(0, Number.isFinite(this.timerRemaining) ? this.timerRemaining : 0);
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = remaining % 60;
        const progress = this.timerTotal > 0 ? Math.min(100, Math.max(0, ((this.timerTotal - remaining) / this.timerTotal) * 100)) : 0;

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
                    <button class="fluent-btn fluent-btn-secondary fluent-btn-large timer-btn" id="timer-pause">${t('clock.pause')}</button>
                    <button class="fluent-btn fluent-btn-secondary fluent-btn-large timer-btn" id="timer-reset">${t('clock.reset')}</button>
                ` : `
                    <button class="fluent-btn fluent-btn-primary fluent-btn-large timer-btn" id="timer-start">${this.timerRemaining > 0 ? t('clock.continue') : t('clock.start')}</button>
                    ${this.timerRemaining > 0 ? `<button class="fluent-btn fluent-btn-secondary fluent-btn-large timer-btn" id="timer-reset">${t('clock.reset')}</button>` : ''}
                `}
            </div>
        `;
    },

    renderStopwatch() {
        const elapsed = Math.max(0, Number.isFinite(this.stopwatchTime) ? this.stopwatchTime : 0);
        const ms = elapsed % 1000;
        const totalSeconds = Math.floor(elapsed / 1000);
        const seconds = totalSeconds % 60;
        const minutes = Math.floor(totalSeconds / 60) % 60;
        const hours = Math.floor(totalSeconds / 3600);

        return `
            <div class="stopwatch-display">${this.formatTime(hours, minutes, seconds)}.${String(Math.floor(ms / 10)).padStart(2, '0')}</div>
            <div class="stopwatch-controls">
                ${this.stopwatchInterval ? `
                    <button class="fluent-btn fluent-btn-secondary fluent-btn-large timer-btn" id="stopwatch-lap">${t('clock.lap')}</button>
                    <button class="fluent-btn fluent-btn-primary fluent-btn-large timer-btn" id="stopwatch-pause">${t('clock.pause')}</button>
                ` : `
                    <button class="fluent-btn fluent-btn-primary fluent-btn-large timer-btn" id="stopwatch-start">${this.stopwatchTime > 0 ? t('clock.continue') : t('clock.start')}</button>
                    ${this.stopwatchTime > 0 ? `<button class="fluent-btn fluent-btn-secondary fluent-btn-large timer-btn" id="stopwatch-reset">${t('clock.reset')}</button>` : ''}
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

    escapeHtml(value = '') {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[char]);
    },

    sortCalendarEventsForDisplay(events) {
        return [...events].sort((a, b) => {
            const completedOrder = Number(a.completed === true) - Number(b.completed === true);
            if (completedOrder !== 0) return completedOrder;
            const timeOrder = String(a.time || '').localeCompare(String(b.time || ''));
            if (timeOrder !== 0) return timeOrder;
            return String(a.title || '').localeCompare(String(b.title || ''));
        });
    },

    isValidCalendarTime(value) {
        return /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(value || '').trim());
    },

    normalizeCalendarTime(value) {
        const [hours, minutes] = String(value || '').trim().split(':');
        return `${String(parseInt(hours, 10)).padStart(2, '0')}:${minutes}`;
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
        const sortedDayEvents = this.sortCalendarEventsForDisplay(dayEvents);

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
                        ${selectedDateStr ? `<button type="button" class="calendar-add-btn fluent-btn fluent-btn-primary fluent-btn-medium" id="calendar-add-event"><span class="fluent-btn-text">${t('clock.add-event')}</span></button>` : ''}
                    </div>
                    ${selectedDateStr ? (sortedDayEvents.length > 0 ? `<div class="calendar-events-list">${sortedDayEvents.map(event => `
                        <div class="calendar-event ${event.completed ? 'completed' : ''}" data-id="${this.escapeHtml(event.id)}">
                            <div class="calendar-event-info">
                                <div class="calendar-event-time">${this.escapeHtml(event.time)}</div>
                                <div class="calendar-event-title">${this.escapeHtml(event.title)}</div>
                            </div>
                            <div class="calendar-event-actions">
                                <button type="button" class="calendar-event-action calendar-event-complete fluent-btn fluent-btn-secondary fluent-btn-small" data-id="${this.escapeHtml(event.id)}"><span class="fluent-btn-text">${event.completed ? t('clock.undo-complete') : t('clock.complete')}</span></button>
                                <button type="button" class="calendar-event-action calendar-event-edit fluent-btn fluent-btn-secondary fluent-btn-small" data-id="${this.escapeHtml(event.id)}"><span class="fluent-btn-text">${t('clock.edit')}</span></button>
                            </div>
                        </div>
                    `).join('')}</div>` : `<div class="calendar-empty">${t('clock.no-events')}</div>`) : `<div class="calendar-empty">${t('clock.select-date')}</div>`}
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
            const actionButton = e.target.closest('#timer-start, #timer-pause, #timer-reset, #stopwatch-start, #stopwatch-pause, #stopwatch-reset, #stopwatch-lap');
            const actionId = actionButton && actionButton.id;
            if (actionId === 'timer-start') {
                this.startTimer();
            } else if (actionId === 'timer-pause') {
                this.pauseTimer();
            } else if (actionId === 'timer-reset') {
                this.resetTimer();
            }
            // 秒表事件
            else if (actionId === 'stopwatch-start') {
                this.startStopwatch();
            } else if (actionId === 'stopwatch-pause') {
                this.pauseStopwatch();
            } else if (actionId === 'stopwatch-reset') {
                this.resetStopwatch();
            } else if (actionId === 'stopwatch-lap') {
                this.addLap();
            }
            // 日历事件
            else if (e.target.classList.contains('calendar-day')) {
                const scrollTop = this.captureClockScrollTop();
                const date = new Date(e.target.dataset.date);
                this.selectedDate = date;
                this.renderKeepingClockScroll(scrollTop);
            } else if (e.target.id === 'calendar-prev') {
                this.changeMonth(-1);
            } else if (e.target.id === 'calendar-next') {
                this.changeMonth(1);
            } else if (e.target.id === 'calendar-today') {
                const scrollTop = this.captureClockScrollTop();
                this.selectedDate = new Date();
                this.renderKeepingClockScroll(scrollTop);
            } else if (e.target.closest('#calendar-add-event')) {
                this.addEvent();
            } else if (e.target.closest('.calendar-event-complete')) {
                const button = e.target.closest('.calendar-event-complete');
                this.toggleEventComplete(button.dataset.id);
            } else if (e.target.closest('.calendar-event-edit')) {
                const button = e.target.closest('.calendar-event-edit');
                this.editEvent(button.dataset.id);
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
        if (this.timerInterval !== null) return;
        this.clearTimerNotification();
        this.timerRemaining = Math.max(0, Number.isFinite(this.timerRemaining) ? this.timerRemaining : 0);
        if (this.timerRemaining <= 0) {
            const getInputValue = (id, max) => {
                const value = Number.parseInt(this.container?.querySelector(`#${id}`)?.value, 10);
                return Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : 0;
            };
            const hours = getInputValue('timer-hours', 23);
            const minutes = getInputValue('timer-minutes', 59);
            const seconds = getInputValue('timer-seconds', 59);
            
            this.timerRemaining = hours * 3600 + minutes * 60 + seconds;
            this.timerTotal = this.timerRemaining;
            
            if (this.timerRemaining <= 0) return;
        }

        this.timerRemaining = Math.max(0, this.timerRemaining);
        this.timerEndTime = Date.now() + this.timerRemaining * 1000;
        this.timerInterval = setInterval(() => {
            this.timerRemaining = Math.max(0, Math.ceil((this.timerEndTime - Date.now()) / 1000));
            this.updateTimerDisplay();

            if (this.timerRemaining === 0) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
                this.timerEndTime = null;
                this.render();
                this.timerCompleted();
            }
        }, 250);
        
        this.render();
    },

    pauseTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        if (this.timerEndTime !== null) {
            this.timerRemaining = Math.max(0, Math.ceil((this.timerEndTime - Date.now()) / 1000));
        }
        this.timerEndTime = null;
        this.render();
    },

    resetTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.timerEndTime = null;
        this.timerRemaining = 0;
        this.timerTotal = 0;
        this.clearTimerNotification();
        this.render();
    },

    updateTimerDisplay() {
        const remaining = Math.max(0, Number.isFinite(this.timerRemaining) ? this.timerRemaining : 0);
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = remaining % 60;
        const progress = this.timerTotal > 0 ? Math.min(100, Math.max(0, ((this.timerTotal - remaining) / this.timerTotal) * 100)) : 0;
        
        const display = this.container?.querySelector('.timer-display');
        const progressBar = this.container?.querySelector('.timer-progress-bar');
        
        if (display) display.textContent = this.formatTime(hours, minutes, seconds);
        if (progressBar) progressBar.style.width = progress + '%';
    },

    timerCompleted() {
        this.clearTimerNotification();
        this.timerNotificationId = State.addNotification({
            title: t('clock.timer-done'),
            message: t('clock.timer-done-msg'),
            type: 'info',
            persistent: true,
            dismissOnClick: true,
            onClickAction: {
                type: 'openApp',
                appId: 'clock',
                data: { tab: 'timer' }
            }
        });
    },

    clearTimerNotification() {
        if (!this.timerNotificationId) return;
        State.removeNotification(this.timerNotificationId);
        this.timerNotificationId = null;
    },

    // 秒表方法
    startStopwatch() {
        if (this.stopwatchInterval !== null) return;
        this.stopwatchTime = Math.max(0, Number.isFinite(this.stopwatchTime) ? this.stopwatchTime : 0);
        this.stopwatchStartedAt = Date.now() - this.stopwatchTime;
        this.stopwatchInterval = setInterval(() => {
            this.stopwatchTime = Math.max(0, Date.now() - this.stopwatchStartedAt);
            this.updateStopwatchDisplay();
        }, 10);
        this.render();
    },

    pauseStopwatch() {
        clearInterval(this.stopwatchInterval);
        this.stopwatchInterval = null;
        if (this.stopwatchStartedAt !== null) {
            this.stopwatchTime = Math.max(0, Date.now() - this.stopwatchStartedAt);
        }
        this.stopwatchStartedAt = null;
        this.render();
    },

    resetStopwatch() {
        clearInterval(this.stopwatchInterval);
        this.stopwatchInterval = null;
        this.stopwatchStartedAt = null;
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
        
        const display = this.container?.querySelector('.stopwatch-display');
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
        const scrollTop = this.captureClockScrollTop();
        if (!this.selectedDate) {
            this.selectedDate = new Date();
        }
        this.selectedDate.setMonth(this.selectedDate.getMonth() + delta);
        this.renderKeepingClockScroll(scrollTop);
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
                            title: title,
                            completed: false,
                            reminderEnabled: true
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
    addEvent() {
        this.openEventDialog();
    },

    getClockScrollElements() {
        const candidates = [
            this.frame && this.frame.cardEl,
            this.container && this.container.querySelector('.fw-card'),
            this.container && this.container.querySelector('#clock-content'),
            document.getElementById('clock-content')
        ].filter(Boolean);

        return [...new Set(candidates)];
    },

    captureClockScrollTop() {
        const elements = this.getClockScrollElements();
        const positions = elements.map((element) => ({
            role: element.classList.contains('fw-card') ? 'card' : (element.id === 'clock-content' ? 'page' : 'other'),
            top: element.scrollTop
        }));
        const primary = positions.find(item => item.top > 0) || positions[0] || { top: 0 };
        return { top: primary.top, positions };
    },

    restoreClockScrollTop(scrollTop) {
        const fallbackTop = Number.isFinite(scrollTop) ? scrollTop : Number(scrollTop && scrollTop.top);
        if (!Number.isFinite(fallbackTop)) return;

        const restore = () => {
            this.getClockScrollElements().forEach((scrollElement) => {
                const role = scrollElement.classList.contains('fw-card') ? 'card' : (scrollElement.id === 'clock-content' ? 'page' : 'other');
                const saved = Array.isArray(scrollTop && scrollTop.positions)
                    ? scrollTop.positions.find(item => item.role === role)
                    : null;
                const target = Number.isFinite(saved && saved.top) ? saved.top : fallbackTop;
                const maxScroll = Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight);
                scrollElement.scrollTop = Math.min(target, maxScroll);
            });
        };

        restore();
        requestAnimationFrame(restore);
        setTimeout(restore, 80);
        setTimeout(restore, 180);
    },

    renderKeepingClockScroll(scrollTop = this.captureClockScrollTop()) {
        this.render();
        this.restoreClockScrollTop(scrollTop);
    },

    editEvent(id) {
        const event = this.calendarEvents.find(item => String(item.id) === String(id));
        if (event) {
            this.openEventDialog(event);
        }
    },

    toggleEventComplete(id) {
        const event = this.calendarEvents.find(item => String(item.id) === String(id));
        if (!event) return;

        const scrollTop = this.captureClockScrollTop();
        const previousRects = this.captureCalendarEventRects();
        event.completed = !event.completed;
        this.saveData();
        this.renderKeepingClockScroll(scrollTop);
        this.animateCalendarEventReorder(previousRects);
    },

    captureCalendarEventRects() {
        const content = (this.container && this.container.querySelector('#clock-content')) || document.getElementById('clock-content');
        if (!content) return new Map();

        return new Map([...content.querySelectorAll('.calendar-event[data-id]')].map(element => [
            element.dataset.id,
            element.getBoundingClientRect()
        ]));
    },

    animateCalendarEventReorder(previousRects) {
        if (!previousRects || previousRects.size === 0) return;

        requestAnimationFrame(() => {
            const content = (this.container && this.container.querySelector('#clock-content')) || document.getElementById('clock-content');
            if (!content) return;

            content.querySelectorAll('.calendar-event[data-id]').forEach(element => {
                const previousRect = previousRects.get(element.dataset.id);
                if (!previousRect || typeof element.animate !== 'function') return;

                const currentRect = element.getBoundingClientRect();
                const deltaY = previousRect.top - currentRect.top;
                if (Math.abs(deltaY) < 1) return;

                element.animate([
                    { transform: `translateY(${deltaY}px)` },
                    { transform: 'translateY(0)' }
                ], {
                    duration: 320,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
                });
            });
        });
    },

    openEventDialog(event = null) {
        if (!event && !this.selectedDate) return;

        const isEdit = Boolean(event);
        const dialogScrollTop = this.captureClockScrollTop();
        const dialogId = `clock-event-dialog-${Date.now()}`;
        const titleValue = this.escapeHtml(isEdit ? event.title : '');
        const rawTimeValue = isEdit ? String(event.time || '') : '09:00';
        const timeValue = this.escapeHtml(this.isValidCalendarTime(rawTimeValue) ? this.normalizeCalendarTime(rawTimeValue) : rawTimeValue);
        const content = `
            <div class="clock-event-dialog" data-dialog-id="${dialogId}">
                <div class="clock-event-field">
                    <label for="${dialogId}-title">${t('clock.event-task-label')}</label>
                    <input id="${dialogId}-title" class="clock-event-title-input" type="text" value="${titleValue}" placeholder="${t('clock.event-placeholder')}" maxlength="120">
                </div>
                <div class="clock-event-field">
                    <label for="${dialogId}-time">${t('clock.event-time-label')}</label>
                    <input id="${dialogId}-time" class="clock-event-time-input" type="time" value="${timeValue}" placeholder="${t('clock.time-placeholder')}">
                </div>
                <div class="clock-event-error" role="alert"></div>
            </div>
        `;

        let modal = null;
        const showError = (message) => {
            const error = modal && modal.querySelector('.clock-event-error');
            if (error) {
                error.textContent = message;
                error.style.display = 'block';
            }
        };
        const clearError = () => {
            const error = modal && modal.querySelector('.clock-event-error');
            if (error) {
                error.textContent = '';
                error.style.display = 'none';
            }
        };
        const saveEvent = () => {
            const titleInput = modal.querySelector('.clock-event-title-input');
            const timeInput = modal.querySelector('.clock-event-time-input');
            const title = titleInput.value.trim();
            const time = timeInput.value.trim();

            if (!title) {
                showError(t('clock.title-required'));
                titleInput.focus();
                return;
            }
            if (!time) {
                showError(t('clock.time-required'));
                timeInput.focus();
                return;
            }
            if (!this.isValidCalendarTime(time)) {
                showError(t('clock.time-format'));
                timeInput.focus();
                return;
            }

            const normalizedTime = this.normalizeCalendarTime(time);
            if (isEdit) {
                event.title = title;
                event.time = normalizedTime;
                event.reminderEnabled = true;
                this.saveData();
                this.renderKeepingClockScroll(dialogScrollTop);
                FluentUI.Toast({ title: t('clock.event-updated'), message: `${title} - ${normalizedTime}`, type: 'success' });
            } else {
                const newEvent = {
                    id: `event-${Date.now()}`,
                    date: this.selectedDate.toISOString(),
                    time: normalizedTime,
                    title,
                    completed: false,
                    reminderEnabled: true
                };

                this.calendarEvents.push(newEvent);
                this.saveData();
                this.renderKeepingClockScroll(dialogScrollTop);
                FluentUI.Toast({ title: t('clock.event-added'), message: `${title} - ${normalizedTime}`, type: 'success' });
            }

            modal.close();
        };

        modal = FluentUI.Modal({
            title: isEdit ? t('clock.edit-event-title') : t('clock.add-event-title'),
            content,
            width: '380px',
            className: 'clock-event-modal',
            onClose: () => this.restoreClockScrollTop(dialogScrollTop),
            buttons: isEdit ? [
                {
                    text: t('clock.delete'),
                    variant: 'danger',
                    closeOnClick: false,
                    onClick: () => {
                        this.deleteEvent(event.id, dialogScrollTop);
                        modal.close();
                    }
                },
                { text: t('cancel'), variant: 'secondary' },
                { text: t('clock.done'), variant: 'primary', closeOnClick: false, onClick: saveEvent }
            ] : [
                { text: t('cancel'), variant: 'secondary' },
                { text: t('clock.done'), variant: 'primary', closeOnClick: false, onClick: saveEvent }
            ]
        });

        modal.show();
        this.restoreClockScrollTop(dialogScrollTop);
        requestAnimationFrame(() => {
            const titleInput = modal.querySelector('.clock-event-title-input');
            const timeInput = modal.querySelector('.clock-event-time-input');
            [titleInput, timeInput].forEach(input => input && input.addEventListener('input', clearError));
            if (titleInput) {
                titleInput.focus();
                titleInput.select();
            }
        });
    },

    deleteEvent(id, scrollTop = this.captureClockScrollTop()) {
        this.calendarEvents = this.calendarEvents.filter(e => String(e.id) !== String(id));
        this.saveData();
        this.renderKeepingClockScroll(scrollTop);
    },

    formatTime(hours, minutes, seconds) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },

    formatStopwatchTime(ms) {
        ms = Math.max(0, Number.isFinite(ms) ? ms : 0);
        const totalSeconds = Math.floor(ms / 1000);
        const seconds = totalSeconds % 60;
        const minutes = Math.floor(totalSeconds / 60) % 60;
        const hours = Math.floor(totalSeconds / 3600);
        const centiseconds = Math.floor((ms % 1000) / 10);
        
        return `${this.formatTime(hours, minutes, seconds)}.${String(centiseconds).padStart(2, '0')}`;
    }
};

// 将应用暴露到全局，供 WindowManager 调用
const ClockReminderService = {
    intervalId: null,
    deliveryStorageKey: 'clock_reminder_deliveries',
    toastHandles: new Map(),

    init() {
        if (this.intervalId) return;
        State.on('notificationRemove', notificationId => this.closeReminderPopup(notificationId));
        State.on('viewChange', ({ newView } = {}) => {
            if (newView === 'desktop') this.showPendingReminderPopups();
        });
        this.checkDueEvents();
        this.intervalId = setInterval(() => this.checkDueEvents(), 10000);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this.checkDueEvents();
        });
    },

    getEventDueDate(event) {
        if (!event || !event.date || !ClockApp.isValidCalendarTime(event.time)) return null;
        const eventDate = new Date(event.date);
        if (Number.isNaN(eventDate.getTime())) return null;
        const [hours, minutes] = ClockApp.normalizeCalendarTime(event.time).split(':').map(Number);
        return new Date(
            eventDate.getFullYear(),
            eventDate.getMonth(),
            eventDate.getDate(),
            hours,
            minutes,
            0,
            0
        );
    },

    getEventSignature(event, dueDate) {
        const datePart = [
            dueDate.getFullYear(),
            String(dueDate.getMonth() + 1).padStart(2, '0'),
            String(dueDate.getDate()).padStart(2, '0')
        ].join('-');
        return `${event.id}|${datePart}|${ClockApp.normalizeCalendarTime(event.time)}`;
    },

    showReminderPopup(notificationId, notification) {
        if (State.view !== 'desktop' || typeof FluentUI === 'undefined' || !FluentUI.Toast) return;
        if (this.toastHandles.has(notificationId)) return;

        const toastHandle = FluentUI.Toast({
            title: notification.title,
            message: notification.message,
            type: notification.type,
            duration: 0,
            onClose: () => {
                this.toastHandles.delete(notificationId);
                if (State.notifications.some(item => item.id === notificationId)) {
                    State.removeNotification(notificationId);
                }
            }
        });
        this.toastHandles.set(notificationId, toastHandle);
    },

    showPendingReminderPopups() {
        State.notifications
            .filter(notification =>
                notification.manualDismissOnly === true && Boolean(notification.reminderSignature)
            )
            .forEach(notification => this.showReminderPopup(notification.id, notification));
    },

    closeReminderPopup(notificationId) {
        const toastHandle = this.toastHandles.get(notificationId);
        if (!toastHandle) return;
        this.toastHandles.delete(notificationId);
        toastHandle.close();
    },

    checkDueEvents() {
        if (typeof Storage === 'undefined' || typeof State === 'undefined') return;
        const data = Storage.get('clock_data') || {};
        const events = Array.isArray(data.events) ? data.events : [];
        const deliveries = Storage.get(this.deliveryStorageKey) || {};
        const now = new Date();
        let deliveriesChanged = false;

        events.forEach(event => {
            if (!event || event.reminderEnabled !== true || event.completed === true) return;
            const dueDate = this.getEventDueDate(event);
            if (!dueDate || dueDate > now) return;

            const signature = this.getEventSignature(event, dueDate);
            if (deliveries[event.id] === signature) return;

            const alreadyQueued = State.notifications.some(notification =>
                notification.reminderSignature === signature
            );
            if (!alreadyQueued) {
                const notification = {
                    title: t('clock.reminder-title'),
                    message: t('clock.reminder-message', {
                        title: String(event.title || ''),
                        time: ClockApp.normalizeCalendarTime(event.time)
                    }),
                    type: 'info',
                    manualDismissOnly: true,
                    showOnLockScreen: true,
                    dismissOnClick: false,
                    reminderSignature: signature,
                    onClickAction: {
                        type: 'openApp',
                        appId: 'clock',
                        data: { tab: 'calendar' }
                    }
                };
                const notificationId = State.addNotification(notification);
                this.showReminderPopup(notificationId, notification);
            }

            deliveries[event.id] = signature;
            deliveriesChanged = true;
        });

        if (deliveriesChanged) {
            Storage.set(this.deliveryStorageKey, deliveries);
        }
    }
};

window.ClockApp = ClockApp;
window.ClockReminderService = ClockReminderService;
