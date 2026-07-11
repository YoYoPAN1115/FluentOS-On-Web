/**
 * Calculator application
 */
const CalculatorApp = {
    windowId: null,
    container: null,
    frame: null,
    currentValue: '0',
    previousValue: '',
    operation: null,
    mode: 'standard',
    currentPage: 'standard',
    resizeObserver: null,
    keydownHandler: null,
    history: [],
    MAX_HISTORY: 100,

    text: {
        zh: {
            standard: '标准',
            professional: '专业',
            history: '历史记录',
            settings: '设置',
            defaultMode: '默认模式',
            defaultModeHint: '打开计算器时默认显示的模式。',
            keepHistory: '保留历史记录',
            keepHistoryHint: '开启后会自动保存计算结果，并显示清除按钮。',
            clearHistory: '清除所有历史记录',
            historyEmpty: '还没有历史记录',
            historyOff: '历史记录保留已关闭',
            historyOffHint: '在设置中开启后，新的计算会显示在这里。',
            copied: '已复制结果',
            noHistory: '暂无历史记录',
            displayMode: '当前模式'
        },
        en: {
            standard: 'Standard',
            professional: 'Professional',
            history: 'History',
            settings: 'Settings',
            defaultMode: 'Default mode',
            defaultModeHint: 'Choose which mode opens by default.',
            keepHistory: 'Keep history',
            keepHistoryHint: 'When enabled, calculations are saved and a clear button is shown.',
            clearHistory: 'Clear all history',
            historyEmpty: 'No history yet',
            historyOff: 'History is turned off',
            historyOffHint: 'Enable it in Settings to show new calculations here.',
            copied: 'Result copied',
            noHistory: 'No history',
            displayMode: 'Current mode'
        }
    },

    init(windowId) {
        this.windowId = windowId || `window-${Date.now()}`;
        this.container = document.getElementById(`${this.windowId}-content`) || document.getElementById(`window-${this.windowId}-content`);
        if (!this.container) return;

        this.ensureSettings();
        this.addStyles();
        this.history = this.getStoredHistory();
        this.mode = this.getDefaultMode();
        this.currentPage = this.mode;
        this.reset();
        this.render();
        this.bindKeyboard();
        this.bindWindowResize();
    },

    beforeClose() {
        this.cleanup(false);
        return true;
    },

    cleanup(destroyFrame = true) {
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (destroyFrame && this.frame && this.frame.destroy) {
            this.frame.destroy();
            this.frame = null;
        }
    },

    ensureSettings() {
        if (typeof State === 'undefined') return;
        const updates = {};
        if (!['standard', 'professional'].includes(State.settings.calculatorDefaultMode)) {
            updates.calculatorDefaultMode = 'standard';
        }
        if (State.settings.calculatorKeepHistory === undefined) {
            updates.calculatorKeepHistory = true;
        }
        if (!Array.isArray(State.settings.calculatorHistory)) {
            updates.calculatorHistory = [];
        }
        if (Object.keys(updates).length) State.updateSettings(updates);
    },

    tr(key) {
        const lang = (window.I18n && I18n.currentLang === 'en') ? 'en' : 'zh';
        return (this.text[lang] && this.text[lang][key]) || this.text.zh[key] || key;
    },

    icon(name) {
        return `Theme/Icon/Symbol_icon/stroke/${name}.svg`;
    },

    getDefaultMode() {
        const mode = (typeof State !== 'undefined' && State.settings) ? State.settings.calculatorDefaultMode : null;
        return mode === 'professional' ? 'professional' : 'standard';
    },

    keepHistoryEnabled() {
        return !(typeof State !== 'undefined' && State.settings && State.settings.calculatorKeepHistory === false);
    },

    getStoredHistory() {
        const saved = (typeof State !== 'undefined' && State.settings) ? State.settings.calculatorHistory : null;
        return Array.isArray(saved) ? saved.slice(0, this.MAX_HISTORY) : [];
    },

    saveHistory() {
        if (typeof State === 'undefined') return;
        State.updateSettings({ calculatorHistory: this.history.slice(0, this.MAX_HISTORY) });
    },

    render() {
        if (this.frame && this.frame.destroy) this.frame.destroy();
        this.container.classList.add('calculator-window-content');
        this.frame = FluentWindow.mount({
            container: this.container,
            title: 'Calculator',
            expandedWidth: 196,
            collapsedWidth: 58,
            items: [
                { id: 'standard', label: this.tr('standard'), icon: 'Calculator' },
                { id: 'professional', label: this.tr('professional'), icon: 'Tube' },
                { id: 'history', label: this.tr('history'), icon: 'Clock' }
            ],
            footerItems: [
                { id: 'settings', label: this.tr('settings'), icon: 'Settings' }
            ],
            activeId: this.currentPage,
            onNavigate: (id, pageEl) => {
                this.currentPage = id;
                if (id === 'standard' || id === 'professional') this.mode = id;
                this.renderPage(pageEl, id);
            }
        });
        this.syncFluidLayout();
    },

    renderPage(pageEl, id) {
        if (id === 'history') {
            this.renderHistoryPage(pageEl);
            return;
        }
        if (id === 'settings') {
            this.renderSettingsPage(pageEl);
            return;
        }
        this.renderCalculatorPage(pageEl, id === 'professional' ? 'professional' : 'standard');
    },

    renderCalculatorPage(pageEl, mode) {
        this.mode = mode;
        pageEl.className = `fw-page calculator-page calculator-page-${mode}`;
        const scientificButtons = mode === 'professional' ? `
                    <div class="calculator-scientific-buttons">
                        ${this.renderButtons(this.getScientificButtons())}
                    </div>` : '';
        pageEl.innerHTML = `
            <div class="calculator-app calculator-mode-${mode}">
                <div class="calculator-display">
                    <div class="calculator-mode-indicator">${this.tr(mode)}</div>
                    <div class="calculator-expression" id="calc-expression"></div>
                    <div class="calculator-result" id="calc-result">0</div>
                </div>
                <div class="calculator-keypad-area">
                    ${scientificButtons}
                    <div class="calculator-buttons">
                        ${this.renderButtons(this.getStandardButtons())}
                    </div>
                </div>
            </div>`;

        this.bindButtonEvents(pageEl);
        this.updateDisplay();
        this.syncFluidLayout();
    },

    renderHistoryPage(pageEl) {
        pageEl.className = 'fw-page calculator-page calculator-history-page';
        const enabled = this.keepHistoryEnabled();
        const items = this.history;
        pageEl.innerHTML = `
            <div class="calculator-page-header">
                <div>
                    <h1>${this.tr('history')}</h1>
                    <p>${enabled ? this.tr('keepHistoryHint') : this.tr('historyOffHint')}</p>
                </div>
            </div>
            <div class="calculator-history-list">
                ${!enabled ? this.renderHistoryEmpty('historyOff', 'historyOffHint') : ''}
                ${enabled && !items.length ? this.renderHistoryEmpty('historyEmpty', 'keepHistoryHint') : ''}
                ${enabled && items.length ? items.map(item => this.renderHistoryItem(item)).join('') : ''}
            </div>`;

        pageEl.querySelectorAll('.calculator-history-item').forEach(item => {
            item.addEventListener('click', () => {
                const value = item.dataset.result;
                if (!value) return;
                this.currentValue = value;
                this.previousValue = '';
                this.operation = null;
                if (this.frame && typeof this.frame.navigate === 'function') this.frame.navigate(this.mode);
            });
        });
    },

    renderHistoryEmpty(titleKey, hintKey) {
        return `
            <div class="calculator-empty-state">
                <img src="${this.icon('Clock')}" alt="">
                <h2>${this.tr(titleKey)}</h2>
                <p>${this.tr(hintKey)}</p>
            </div>`;
    },

    renderHistoryItem(item) {
        return `
            <button class="calculator-history-item" type="button" data-result="${this.escape(item.result)}">
                <span class="calculator-history-expression">${this.escape(item.expression)}</span>
                <strong>${this.escape(item.result)}</strong>
                <span>${this.escape(this.formatHistoryTime(item.time))}</span>
            </button>`;
    },

    renderSettingsPage(pageEl) {
        const defaultMode = this.getDefaultMode();
        const keepHistory = this.keepHistoryEnabled();
        pageEl.className = 'fw-page calculator-page calculator-settings-page';
        pageEl.innerHTML = `
            <div class="calculator-page-header">
                <div>
                    <h1>${this.tr('settings')}</h1>
                    <p>${this.tr('defaultModeHint')}</p>
                </div>
            </div>
            <div class="calculator-settings-list">
                <section class="calculator-setting-row">
                    <div class="calculator-setting-main">
                        <span>${this.tr('defaultMode')}</span>
                        <small>${this.tr('defaultModeHint')}</small>
                    </div>
                    <span class="calculator-setting-control calculator-default-mode-host"></span>
                </section>
                <section class="calculator-setting-row">
                    <span class="calculator-setting-main">
                        <span>${this.tr('keepHistory')}</span>
                        <small>${this.tr('keepHistoryHint')}</small>
                    </span>
                    <span class="calculator-setting-control calculator-history-toggle-host"></span>
                </section>
                ${keepHistory ? `
                    <div class="calculator-clear-history-host"></div>` : ''}
            </div>`;

        const modeHost = pageEl.querySelector('.calculator-default-mode-host');
        if (modeHost && window.FluentUI && typeof FluentUI.Select === 'function') {
            modeHost.appendChild(FluentUI.Select({
                value: defaultMode,
                className: 'calculator-settings-select',
                options: [
                    { value: 'standard', label: this.tr('standard') },
                    { value: 'professional', label: this.tr('professional') }
                ],
                onChange: (value) => {
                    const mode = value === 'professional' ? 'professional' : 'standard';
                    State.updateSettings({ calculatorDefaultMode: mode });
                }
            }));
        }

        const toggleHost = pageEl.querySelector('.calculator-history-toggle-host');
        if (toggleHost && window.FluentUI && typeof FluentUI.Toggle === 'function') {
            toggleHost.appendChild(FluentUI.Toggle({
                checked: keepHistory,
                className: 'calculator-settings-toggle',
                onChange: (enabled) => {
                    const updates = { calculatorKeepHistory: enabled };
                    if (!enabled) {
                        this.history = [];
                        updates.calculatorHistory = [];
                    }
                    State.updateSettings(updates);
                    this.renderSettingsPage(pageEl);
                }
            }));
        }

        const clearHost = pageEl.querySelector('.calculator-clear-history-host');
        if (clearHost && window.FluentUI && typeof FluentUI.Button === 'function') {
            clearHost.appendChild(FluentUI.Button({
                text: this.tr('clearHistory'),
                icon: 'Trash',
                variant: 'danger',
                size: 'medium',
                className: 'calculator-clear-history-button',
                onClick: () => this.clearHistory()
            }));
        }
    },

    getScientificButtons() {
        return [
            { label: 'sin', type: 'scientific', value: 'sin' },
            { label: 'cos', type: 'scientific', value: 'cos' },
            { label: 'tan', type: 'scientific', value: 'tan' },
            { label: 'ln', type: 'scientific', value: 'ln' },
            { label: 'log', type: 'scientific', value: 'log' },
            { label: 'sqrt', type: 'scientific', value: 'sqrt' },
            { label: 'x^2', type: 'scientific', value: 'square' },
            { label: 'x^y', type: 'operation', value: '^' },
            { label: '1/x', type: 'scientific', value: 'reciprocal' },
            { label: 'pi', type: 'scientific', value: 'pi' },
            { label: 'e', type: 'scientific', value: 'e' },
            { label: '+/-', type: 'scientific', value: 'negate' }
        ];
    },

    getStandardButtons() {
        return [
            { label: 'C', type: 'action', value: 'clear', className: 'calc-btn-clear' },
            { label: 'DEL', type: 'action', value: 'backspace', className: 'calc-btn-operator' },
            { label: '%', type: 'action', value: 'percent', className: 'calc-btn-operator' },
            { label: '/', type: 'operation', value: '/', className: 'calc-btn-operator' },

            { label: '7', type: 'number', value: '7' },
            { label: '8', type: 'number', value: '8' },
            { label: '9', type: 'number', value: '9' },
            { label: '*', type: 'operation', value: '*', className: 'calc-btn-operator' },

            { label: '4', type: 'number', value: '4' },
            { label: '5', type: 'number', value: '5' },
            { label: '6', type: 'number', value: '6' },
            { label: '-', type: 'operation', value: '-', className: 'calc-btn-operator' },

            { label: '1', type: 'number', value: '1' },
            { label: '2', type: 'number', value: '2' },
            { label: '3', type: 'number', value: '3' },
            { label: '+', type: 'operation', value: '+', className: 'calc-btn-operator' },

            { label: '0', type: 'number', value: '0', className: 'calc-btn-zero', span: 2 },
            { label: '.', type: 'action', value: 'decimal' },
            { label: '=', type: 'action', value: 'equals', className: 'calc-btn-equals' }
        ];
    },

    renderButtons(buttons) {
        return buttons.map((button) => {
            const attrs = [];
            if (button.type === 'number') attrs.push(`data-number="${button.value}"`);
            if (button.type === 'operation') attrs.push(`data-operation="${button.value}"`);
            if (button.type === 'action') attrs.push(`data-action="${button.value}"`);
            if (button.type === 'scientific') attrs.push(`data-scientific="${button.value}"`);
            if (button.span) attrs.push(`style="grid-column: span ${button.span};"`);

            const className = ['calc-btn', button.className].filter(Boolean).join(' ');
            return `<button class="${className}" ${attrs.join(' ')} type="button">${button.label}</button>`;
        }).join('');
    },

    bindButtonEvents(root = this.container) {
        root.querySelectorAll('[data-number]').forEach((btn) => {
            btn.addEventListener('click', () => this.inputNumber(btn.dataset.number));
        });

        root.querySelectorAll('[data-operation]').forEach((btn) => {
            btn.addEventListener('click', () => this.inputOperation(btn.dataset.operation));
        });

        root.querySelectorAll('[data-action]').forEach((btn) => {
            btn.addEventListener('click', () => this.handleAction(btn.dataset.action));
        });

        root.querySelectorAll('[data-scientific]').forEach((btn) => {
            btn.addEventListener('click', () => this.handleScientific(btn.dataset.scientific));
        });
    },

    bindKeyboard() {
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }

        this.keydownHandler = (event) => {
            if (!this.container || !this.container.closest('.window')) return;
            if (this.currentPage !== 'standard' && this.currentPage !== 'professional') return;
            if (event.target && event.target.closest && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;

            if (event.key >= '0' && event.key <= '9') {
                this.inputNumber(event.key);
                return;
            }

            if (['+', '-', '*', '/', '^'].includes(event.key)) {
                this.inputOperation(event.key);
                return;
            }

            if (event.key === 'Enter' || event.key === '=') {
                this.handleAction('equals');
                return;
            }

            if (event.key === 'Escape' || event.key.toLowerCase() === 'c') {
                this.handleAction('clear');
                return;
            }

            if (event.key === 'Backspace') {
                this.handleAction('backspace');
                return;
            }

            if (event.key === '.') {
                this.handleAction('decimal');
                return;
            }

            if (event.key === '%') {
                this.handleAction('percent');
            }
        };

        document.addEventListener('keydown', this.keydownHandler);
    },

    bindWindowResize() {
        if (this.resizeObserver) this.resizeObserver.disconnect();

        const target = this.container && this.container.closest('.window');
        if (!target || typeof ResizeObserver === 'undefined') return;

        this.resizeObserver = new ResizeObserver(() => {
            this.syncFluidLayout();
        });
        this.resizeObserver.observe(target);
        if (this.container && this.container !== target) this.resizeObserver.observe(this.container);
        if (this.frame && this.frame.cardEl) this.resizeObserver.observe(this.frame.cardEl);
    },

    reset() {
        this.currentValue = '0';
        this.previousValue = '';
        this.operation = null;
    },

    inputNumber(num) {
        if (this.currentValue === '0' || this.currentValue === 'Error') {
            this.currentValue = num;
        } else {
            this.currentValue += num;
        }
        this.updateDisplay();
    },

    inputOperation(op) {
        if (this.currentValue === 'Error') return;

        if (this.operation && this.previousValue) {
            this.calculate();
        }

        this.previousValue = this.currentValue;
        this.currentValue = '0';
        this.operation = op;
        this.updateDisplay();
    },

    handleAction(action) {
        switch (action) {
            case 'clear':
                this.reset();
                this.updateDisplay();
                break;
            case 'backspace':
                if (this.currentValue === 'Error') {
                    this.currentValue = '0';
                } else if (this.currentValue.length > 1) {
                    this.currentValue = this.currentValue.slice(0, -1);
                } else {
                    this.currentValue = '0';
                }
                this.updateDisplay();
                break;
            case 'decimal':
                if (this.currentValue === 'Error') {
                    this.currentValue = '0.';
                } else if (!this.currentValue.includes('.')) {
                    this.currentValue += '.';
                }
                this.updateDisplay();
                break;
            case 'percent':
                this.applyUnary((value) => value / 100, `${this.currentValue}%`);
                break;
            case 'equals':
                this.calculate();
                break;
        }
    },

    handleScientific(action) {
        switch (action) {
            case 'sin':
                this.applyUnary((value) => Math.sin(this.degToRad(value)), `sin(${this.currentValue})`);
                break;
            case 'cos':
                this.applyUnary((value) => Math.cos(this.degToRad(value)), `cos(${this.currentValue})`);
                break;
            case 'tan':
                this.applyUnary((value) => Math.tan(this.degToRad(value)), `tan(${this.currentValue})`);
                break;
            case 'ln':
                this.applyUnary((value) => value > 0 ? Math.log(value) : NaN, `ln(${this.currentValue})`);
                break;
            case 'log':
                this.applyUnary((value) => value > 0 ? Math.log10(value) : NaN, `log(${this.currentValue})`);
                break;
            case 'sqrt':
                this.applyUnary((value) => value >= 0 ? Math.sqrt(value) : NaN, `sqrt(${this.currentValue})`);
                break;
            case 'square':
                this.applyUnary((value) => value * value, `sqr(${this.currentValue})`);
                break;
            case 'reciprocal':
                this.applyUnary((value) => value !== 0 ? 1 / value : NaN, `1/(${this.currentValue})`);
                break;
            case 'pi':
                this.currentValue = this.formatResult(Math.PI);
                this.updateDisplay();
                break;
            case 'e':
                this.currentValue = this.formatResult(Math.E);
                this.updateDisplay();
                break;
            case 'negate':
                if (this.currentValue !== 'Error') {
                    this.currentValue = this.formatResult(-parseFloat(this.currentValue || '0'));
                    this.updateDisplay();
                }
                break;
        }
    },

    applyUnary(fn, expression = '') {
        if (this.currentValue === 'Error') return;
        const value = parseFloat(this.currentValue);
        const nextValue = fn(value);
        const result = this.formatResult(nextValue);
        this.currentValue = result;
        this.previousValue = '';
        this.operation = null;
        if (expression) this.addHistory(expression, result);
        this.updateDisplay();
    },

    calculate() {
        if (!this.operation || !this.previousValue || this.currentValue === 'Error') return;

        const prevText = this.previousValue;
        const currentText = this.currentValue;
        const prev = parseFloat(prevText);
        const current = parseFloat(currentText);
        let result = NaN;

        switch (this.operation) {
            case '+':
                result = prev + current;
                break;
            case '-':
                result = prev - current;
                break;
            case '*':
                result = prev * current;
                break;
            case '/':
                result = current !== 0 ? prev / current : NaN;
                break;
            case '^':
                result = Math.pow(prev, current);
                break;
        }

        const resultText = this.formatResult(result);
        this.addHistory(`${prevText} ${this.operationSymbol(this.operation)} ${currentText}`, resultText);
        this.currentValue = resultText;
        this.previousValue = '';
        this.operation = null;
        this.updateDisplay();
    },

    degToRad(value) {
        return value * (Math.PI / 180);
    },

    formatResult(value) {
        if (typeof value !== 'number' || !Number.isFinite(value)) return 'Error';
        const normalized = Math.abs(value) < 1e-12 ? 0 : value;
        return Number.parseFloat(normalized.toPrecision(12)).toString();
    },

    operationSymbol(op) {
        return {
            '+': '+',
            '-': '-',
            '*': 'x',
            '/': '/',
            '^': 'x^y'
        }[op] || op || '';
    },

    addHistory(expression, result) {
        if (!this.keepHistoryEnabled()) return;
        this.history.unshift({
            id: `calc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            expression,
            result,
            mode: this.mode,
            time: new Date().toISOString()
        });
        this.history = this.history.slice(0, this.MAX_HISTORY);
        this.saveHistory();
    },

    clearHistory() {
        this.history = [];
        this.saveHistory();
        if (this.currentPage === 'history' && this.frame) {
            this.frame.refresh();
        } else if (this.currentPage === 'settings' && this.frame) {
            this.frame.refresh();
        }
    },

    formatHistoryTime(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleString(window.I18n && I18n.currentLang === 'en' ? 'en-US' : 'zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    updateDisplay() {
        const resultElement = this.container.querySelector('#calc-result');
        const expressionElement = this.container.querySelector('#calc-expression');
        const modeElement = this.container.querySelector('.calculator-mode-indicator');

        if (resultElement) {
            resultElement.textContent = this.currentValue;
            this.fitResultFont(resultElement);
        }

        if (expressionElement) {
            expressionElement.textContent = this.previousValue && this.operation
                ? `${this.previousValue} ${this.operationSymbol(this.operation)}`
                : '';
        }

        if (modeElement) {
            modeElement.textContent = this.tr(this.mode);
        }
    },

    syncFluidLayout() {
        const app = this.container && this.container.querySelector('.calculator-app');
        if (!app) return;

        const width = app.clientWidth || (this.container && this.container.clientWidth) || 0;
        const height = app.clientHeight || (this.container && this.container.clientHeight) || 0;
        if (!width || !height) return;

        const professionalMode = this.mode === 'professional';
        const baseSize = Math.min(width, height);
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const appPadding = Math.round(clamp(baseSize * 0.032, 8, 22));
        const sectionGap = Math.round(clamp(baseSize * 0.022, 4, 15));
        let sideLayout = professionalMode && app.classList.contains('calculator-layout-side');

        if (!professionalMode && app.classList.contains('calculator-layout-side')) {
            this.setProfessionalKeypadLayout(app, false, false);
            sideLayout = false;
        }

        for (let pass = 0; pass < 2; pass += 1) {
            const layoutMetrics = this.computeCalculatorLayoutMetrics({
                appPadding,
                baseSize,
                clamp,
                height,
                professionalMode,
                sectionGap,
                sideLayout,
                width
            });
            const {
                buttonHeight,
                displayHeight,
                scientificHeight
            } = layoutMetrics;

            const buttonRadius = Math.round(clamp(buttonHeight * 0.28, 10, 18));
            const buttonFontSize = Math.round(clamp(buttonHeight * 0.34, 14, 28));
            const scientificFontSize = Math.round(clamp((scientificHeight || buttonHeight) * 0.32, 10, 16));
            const resultFontSize = Math.round(clamp(Math.min(width * 0.14, displayHeight * 0.48, height * 0.13), 24, professionalMode ? 70 : 84));
            const expressionFontSize = Math.round(clamp(baseSize * 0.032, 11, 16));
            const modeFontSize = Math.round(clamp(baseSize * 0.026, 10, 13));
            const modePadY = Math.round(clamp(displayHeight * 0.035, 3, 6));
            const modePadX = Math.round(clamp(width * 0.022, 8, 14));
            const displayPadY = Math.round(clamp(displayHeight * 0.14, 10, 23));
            const displayPadX = Math.round(clamp(width * 0.048, 14, 28));
            const displayRadius = Math.round(clamp(buttonRadius * 1.2, 14, 24));

            app.style.setProperty('--calc-app-padding', `${appPadding}px`);
            app.style.setProperty('--calc-section-gap', `${sectionGap}px`);
            app.style.setProperty('--calc-display-height', `${displayHeight}px`);
            app.style.setProperty('--calc-display-radius', `${displayRadius}px`);
            app.style.setProperty('--calc-display-pad-y', `${displayPadY}px`);
            app.style.setProperty('--calc-display-pad-x', `${displayPadX}px`);
            app.style.setProperty('--calc-button-gap', `${sectionGap}px`);
            app.style.setProperty('--calc-button-height', `${buttonHeight}px`);
            app.style.setProperty('--calc-scientific-height', `${scientificHeight || Math.round(buttonHeight * 0.82)}px`);
            app.style.setProperty('--calc-button-radius', `${buttonRadius}px`);
            app.style.setProperty('--calc-button-font-size', `${buttonFontSize}px`);
            app.style.setProperty('--calc-scientific-font-size', `${scientificFontSize}px`);
            app.style.setProperty('--calc-result-font-size', `${resultFontSize}px`);
            app.style.setProperty('--calc-expression-font-size', `${expressionFontSize}px`);
            app.style.setProperty('--calc-mode-font-size', `${modeFontSize}px`);
            app.style.setProperty('--calc-mode-pad-y', `${modePadY}px`);
            app.style.setProperty('--calc-mode-pad-x', `${modePadX}px`);

            const nextSideLayout = this.resolveProfessionalKeypadLayout(app, layoutMetrics);
            if (nextSideLayout === sideLayout) break;
            this.setProfessionalKeypadLayout(app, nextSideLayout, pass === 0);
            sideLayout = nextSideLayout;
        }

        this.fitResultFont();
    },

    computeCalculatorLayoutMetrics(options) {
        const {
            appPadding,
            baseSize,
            clamp,
            height,
            professionalMode,
            sectionGap,
            sideLayout,
            width
        } = options;
        const usableHeight = Math.max(1, height - appPadding * 2);
        const maxButtonHeight = professionalMode ? 70 : 82;
        const comfortableButtonHeight = Math.round(clamp(
            height * (professionalMode ? 0.092 : 0.105),
            professionalMode ? 32 : 38,
            maxButtonHeight
        ));
        const minButtonHeight = professionalMode ? 24 : 26;
        const minScientificHeight = professionalMode ? 18 : 0;
        const preferredScientificHeight = professionalMode
            ? Math.round(clamp(height * 0.06, 24, 48))
            : 0;
        const minDisplayHeight = Math.round(clamp(
            height * (professionalMode ? 0.15 : 0.17),
            professionalMode ? 74 : 82,
            professionalMode ? 118 : 132
        ));
        const preferredDisplayHeight = Math.round(clamp(
            height * (professionalMode ? 0.27 : 0.31),
            minDisplayHeight,
            professionalMode ? 190 : 220
        ));
        const preferredStackKeypadHeight = professionalMode
            ? preferredScientificHeight * 2 + comfortableButtonHeight * 5 + sectionGap * 6
            : comfortableButtonHeight * 5 + sectionGap * 4;
        const projectedStackGap = usableHeight - preferredDisplayHeight - sectionGap - preferredStackKeypadHeight;
        const layoutKeypadHeight = professionalMode && sideLayout
            ? comfortableButtonHeight * 5 + sectionGap * 4
            : preferredStackKeypadHeight;
        let displayHeight = Math.round(clamp(
            Math.min(preferredDisplayHeight, usableHeight - sectionGap - layoutKeypadHeight),
            minDisplayHeight,
            preferredDisplayHeight
        ));
        if (!Number.isFinite(displayHeight)) displayHeight = minDisplayHeight;

        const keypadHeight = Math.max(1, usableHeight - displayHeight - sectionGap);
        let buttonHeight = comfortableButtonHeight;
        let scientificHeight = preferredScientificHeight;

        if (professionalMode && !sideLayout) {
            scientificHeight = Math.round(Math.min(
                preferredScientificHeight,
                Math.max(minScientificHeight, (keypadHeight - minButtonHeight * 5 - sectionGap * 6) / 2)
            ));
            buttonHeight = Math.round(Math.min(
                comfortableButtonHeight,
                Math.max(minButtonHeight, (keypadHeight - scientificHeight * 2 - sectionGap * 6) / 5)
            ));
            if (scientificHeight * 2 + buttonHeight * 5 + sectionGap * 6 > keypadHeight) {
                buttonHeight = Math.max(18, Math.floor((keypadHeight - scientificHeight * 2 - sectionGap * 6) / 5));
            }
        } else {
            buttonHeight = Math.round(Math.min(
                comfortableButtonHeight,
                Math.max(minButtonHeight, (keypadHeight - sectionGap * 4) / 5)
            ));
            if (buttonHeight * 5 + sectionGap * 4 > keypadHeight) {
                buttonHeight = Math.max(18, Math.floor((keypadHeight - sectionGap * 4) / 5));
            }
        }

        return {
            appPadding,
            baseSize,
            buttonHeight,
            displayHeight,
            height,
            keypadHeight,
            projectedStackGap,
            scientificHeight,
            sectionGap,
            sideLayout,
            stackedButtonHeight: buttonHeight,
            width
        };
    },

    resolveProfessionalKeypadLayout(app, metrics) {
        if (!app || !metrics || this.mode !== 'professional') return false;

        const scientific = app.querySelector('.calculator-scientific-buttons');
        const numeric = app.querySelector('.calculator-buttons');
        if (!scientific || !numeric) return false;

        const enoughWidthForSideLayout = metrics.width >= 500;
        if (!enoughWidthForSideLayout) return false;

        const threshold = Math.max(10, Math.round(metrics.sectionGap * 1.15));
        const projectedStackGap = Number.isFinite(metrics.projectedStackGap)
            ? metrics.projectedStackGap
            : 0;

        if (metrics.sideLayout) {
            return projectedStackGap < threshold + 28;
        }

        const scientificRect = scientific.getBoundingClientRect();
        const numericRect = numeric.getBoundingClientRect();
        const visualGap = numericRect.top - scientificRect.bottom;
        return visualGap < threshold || projectedStackGap < threshold;
    },

    setProfessionalKeypadLayout(app, useSideLayout, animate = true) {
        if (!app) return;
        const alreadySide = app.classList.contains('calculator-layout-side');
        if (alreadySide === useSideLayout) return;

        const targets = Array.from(app.querySelectorAll('.calculator-scientific-buttons, .calculator-buttons'));
        const canAnimate = animate
            && document.body.classList.contains('animations-enabled')
            && typeof Element !== 'undefined'
            && Element.prototype
            && typeof Element.prototype.animate === 'function'
            && targets.length;
        const beforeRects = canAnimate ? targets.map(element => ({
            element,
            rect: element.getBoundingClientRect()
        })) : [];

        app.classList.toggle('calculator-layout-side', useSideLayout);
        app.dataset.keypadLayout = useSideLayout ? 'side' : 'stack';

        if (!canAnimate) return;

        void app.offsetHeight;
        beforeRects.forEach(({ element, rect }) => {
            const nextRect = element.getBoundingClientRect();
            if (!nextRect.width || !nextRect.height) return;
            const deltaX = rect.left - nextRect.left;
            const deltaY = rect.top - nextRect.top;
            const scaleX = rect.width / nextRect.width;
            const scaleY = rect.height / nextRect.height;
            element.animate([
                {
                    transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`,
                    transformOrigin: 'top left'
                },
                {
                    transform: 'translate(0, 0) scale(1, 1)',
                    transformOrigin: 'top left'
                }
            ], {
                duration: 420,
                easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                fill: 'both'
            });
        });
    },

    fitResultFont(resultElement = this.container && this.container.querySelector('#calc-result')) {
        if (!resultElement) return;

        const displayElement = resultElement.closest('.calculator-display');
        const appElement = resultElement.closest('.calculator-app');
        if (!displayElement || !appElement) return;

        resultElement.style.fontSize = '';

        const appStyle = getComputedStyle(appElement);
        const resultStyle = getComputedStyle(resultElement);
        const maxFontSize = Number.parseFloat(appStyle.getPropertyValue('--calc-result-font-size'))
            || Number.parseFloat(resultStyle.fontSize)
            || 42;
        const minFontSize = Math.min(maxFontSize, 24);

        resultElement.style.fontSize = `${maxFontSize}px`;

        const availableWidth = Math.max(1, resultElement.clientWidth || displayElement.clientWidth);
        const overflowWidth = Math.max(1, resultElement.scrollWidth);

        const expressionElement = displayElement.querySelector('.calculator-expression');
        const reservedHeight = [expressionElement].reduce((total, element) => {
            if (!element) return total;
            const style = getComputedStyle(element);
            return total
                + element.offsetHeight
                + Number.parseFloat(style.marginTop || '0')
                + Number.parseFloat(style.marginBottom || '0');
        }, 0);
        const availableHeight = Math.max(1, displayElement.clientHeight - reservedHeight - 8);
        const overflowHeight = Math.max(1, resultElement.scrollHeight);

        const widthScale = availableWidth < overflowWidth ? availableWidth / overflowWidth : 1;
        const heightScale = availableHeight < overflowHeight ? availableHeight / overflowHeight : 1;
        const nextFontSize = Math.max(
            minFontSize,
            Math.floor(maxFontSize * Math.min(widthScale, heightScale))
        );

        resultElement.style.fontSize = `${nextFontSize}px`;
    },

    escape(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    },

    addStyles() {
        if (document.getElementById('calculator-app-styles')) return;

        const style = document.createElement('style');
        style.id = 'calculator-app-styles';
        style.textContent = `
            .calculator-window-content {
                min-height: 0;
            }

            .calculator-page {
                height: 100%;
                min-height: 0;
                box-sizing: border-box;
            }

            .calculator-app {
                --calc-app-padding: 18px;
                --calc-section-gap: 12px;
                --calc-display-height: 144px;
                --calc-display-radius: 18px;
                --calc-display-pad-y: 18px;
                --calc-display-pad-x: 22px;
                --calc-button-gap: 12px;
                --calc-button-height: 54px;
                --calc-scientific-height: 44px;
                --calc-button-radius: 14px;
                --calc-button-font-size: 20px;
                --calc-scientific-font-size: 14px;
                --calc-result-font-size: 42px;
                --calc-expression-font-size: 14px;
                --calc-mode-font-size: 12px;
                --calc-mode-pad-y: 4px;
                --calc-mode-pad-x: 10px;
                display: flex;
                flex-direction: column;
                height: 100%;
                min-height: 0;
                padding: var(--calc-app-padding);
                gap: var(--calc-section-gap);
                background: transparent !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                overflow: hidden;
                box-sizing: border-box;
                transition: padding 360ms cubic-bezier(0.16, 1, 0.3, 1), gap 360ms cubic-bezier(0.16, 1, 0.3, 1);
            }

            .calculator-display {
                position: relative;
                flex: 0 0 var(--calc-display-height);
                height: var(--calc-display-height);
                min-height: 0;
                background: rgba(255, 255, 255, 0.56) !important;
                border: 1px solid rgba(0, 0, 0, 0.06);
                border-radius: var(--calc-display-radius);
                padding: calc(var(--calc-display-pad-y) + var(--calc-mode-font-size) + var(--calc-mode-pad-y) + var(--calc-mode-pad-y) + 4px) var(--calc-display-pad-x) var(--calc-display-pad-y);
                text-align: right;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                box-sizing: border-box;
                overflow: hidden;
                transition: flex-basis 360ms cubic-bezier(0.16, 1, 0.3, 1), height 360ms cubic-bezier(0.16, 1, 0.3, 1), padding 360ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 360ms cubic-bezier(0.16, 1, 0.3, 1);
            }

            .dark-mode .calculator-display {
                background: rgba(255, 255, 255, 0.07) !important;
                border-color: rgba(255, 255, 255, 0.08);
            }

            .calculator-mode-indicator {
                position: absolute;
                top: var(--calc-display-pad-y);
                right: var(--calc-display-pad-x);
                display: inline-flex;
                margin: 0;
                padding: var(--calc-mode-pad-y) var(--calc-mode-pad-x);
                border-radius: 999px;
                background: rgba(var(--accent-rgb, 0, 120, 212), 0.12);
                color: var(--accent);
                font-size: var(--calc-mode-font-size);
                font-weight: 600;
                letter-spacing: 0;
                line-height: 1.2;
                pointer-events: none;
                transition: top 360ms cubic-bezier(0.16, 1, 0.3, 1), right 360ms cubic-bezier(0.16, 1, 0.3, 1), font-size 360ms cubic-bezier(0.16, 1, 0.3, 1), padding 360ms cubic-bezier(0.16, 1, 0.3, 1);
            }

            .calculator-expression {
                font-size: var(--calc-expression-font-size);
                color: var(--text-secondary);
                min-height: 20px;
                margin-bottom: 8px;
                transition: font-size 360ms cubic-bezier(0.16, 1, 0.3, 1), margin 360ms cubic-bezier(0.16, 1, 0.3, 1);
            }

            .calculator-result {
                font-size: var(--calc-result-font-size);
                font-weight: 300;
                color: var(--text-primary);
                align-self: stretch;
                line-height: 1;
                max-width: 100%;
                min-height: 1em;
                overflow: hidden;
                text-align: right;
                text-overflow: clip;
                white-space: nowrap;
                word-break: normal;
                transition: font-size 360ms cubic-bezier(0.16, 1, 0.3, 1);
            }

            .calculator-keypad-area {
                flex: 1 1 auto;
                min-width: 0;
                min-height: 0;
                display: flex;
                flex-direction: column;
                gap: var(--calc-button-gap);
                transition: gap 360ms cubic-bezier(0.16, 1, 0.3, 1);
            }

            .calculator-layout-side .calculator-keypad-area {
                display: grid;
                grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.28fr);
                align-items: stretch;
            }

            .calculator-scientific-buttons {
                display: grid;
                grid-template-columns: repeat(6, minmax(0, 1fr));
                gap: var(--calc-button-gap);
                grid-auto-rows: var(--calc-scientific-height);
                flex: 0 0 auto;
                min-width: 0;
                min-height: 0;
                will-change: transform;
                transition: gap 360ms cubic-bezier(0.16, 1, 0.3, 1), grid-auto-rows 360ms cubic-bezier(0.16, 1, 0.3, 1);
            }

            .calculator-buttons {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: var(--calc-button-gap);
                grid-auto-rows: var(--calc-button-height);
                align-content: start;
                flex: 1 1 auto;
                min-width: 0;
                min-height: 0;
                will-change: transform;
                transition: gap 360ms cubic-bezier(0.16, 1, 0.3, 1), grid-auto-rows 360ms cubic-bezier(0.16, 1, 0.3, 1);
            }

            .calculator-layout-side .calculator-scientific-buttons {
                grid-template-columns: repeat(3, minmax(0, 1fr));
                grid-auto-rows: minmax(0, 1fr);
                height: 100%;
                align-content: stretch;
            }

            .calculator-layout-side .calculator-buttons {
                grid-auto-rows: minmax(0, 1fr);
                height: 100%;
                align-content: stretch;
            }

            .calc-btn {
                min-height: 0;
                height: 100%;
                border-radius: var(--calc-button-radius);
                background: rgba(255, 255, 255, 0.52) !important;
                font-size: var(--calc-button-font-size);
                font-weight: 400;
                cursor: pointer;
                transition: background var(--transition-fast), transform var(--transition-fast), border-color var(--transition-fast), border-radius 360ms cubic-bezier(0.16, 1, 0.3, 1), font-size 360ms cubic-bezier(0.16, 1, 0.3, 1);
                border: 1px solid rgba(0, 0, 0, 0.06);
                color: var(--text-primary);
                box-sizing: border-box;
            }

            .dark-mode .calc-btn {
                background: rgba(255, 255, 255, 0.075) !important;
                border-color: rgba(255, 255, 255, 0.08);
            }

            .calculator-scientific-buttons .calc-btn {
                font-size: var(--calc-scientific-font-size);
                font-weight: 500;
            }

            .calc-btn:hover {
                background: rgba(var(--accent-rgb, 0, 120, 212), 0.12) !important;
                transform: scale(1.015);
            }

            .calc-btn:active {
                transform: scale(0.985);
            }

            .calc-btn-operator {
                background: rgba(var(--accent-rgb, 0, 120, 212), 0.13) !important;
                color: var(--accent);
                font-weight: 600;
            }

            .calc-btn-clear {
                background: rgba(211, 52, 56, 0.13) !important;
                color: #d13438;
                font-weight: 600;
            }

            .calc-btn-equals {
                background: var(--accent) !important;
                border-color: rgba(var(--accent-rgb, 0, 120, 212), 0.4);
                color: #fff;
                font-weight: 700;
            }

            .calc-btn-equals:hover {
                background: var(--accent-hover) !important;
            }

            .calculator-page-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 16px;
                padding: 24px 24px 14px;
            }

            .calculator-page-header h1 {
                margin: 0 0 6px;
                font-size: 24px;
                font-weight: 600;
                color: var(--text-primary);
            }

            .calculator-page-header p {
                margin: 0;
                color: var(--text-secondary);
                font-size: 13px;
            }

            .calculator-history-list,
            .calculator-settings-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
                padding: 0 24px 24px;
                box-sizing: border-box;
            }

            .calculator-history-item,
            .calculator-setting-row,
            .calc-secondary-button {
                border: 1px solid rgba(0, 0, 0, 0.07);
                background: rgba(255, 255, 255, 0.52);
                color: var(--text-primary);
                border-radius: 8px;
                box-sizing: border-box;
            }

            .dark-mode .calculator-history-item,
            .dark-mode .calculator-setting-row,
            .dark-mode .calc-secondary-button {
                border-color: rgba(255, 255, 255, 0.08);
                background: rgba(255, 255, 255, 0.07);
            }

            .calculator-history-item {
                width: 100%;
                padding: 14px 16px;
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                gap: 4px 12px;
                text-align: left;
                cursor: pointer;
            }

            .calculator-history-item:hover,
            .calc-secondary-button:hover {
                background: rgba(var(--accent-rgb, 0, 120, 212), 0.12);
            }

            .calculator-history-item strong {
                grid-row: 1 / 3;
                grid-column: 2;
                align-self: center;
                font-size: 20px;
                font-weight: 500;
            }

            .calculator-history-expression,
            .calculator-history-item span:last-child {
                color: var(--text-secondary);
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .calculator-empty-state {
                min-height: 260px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                color: var(--text-secondary);
                gap: 8px;
            }

            .calculator-empty-state img {
                width: 42px;
                height: 42px;
                opacity: 0.58;
            }

            .calculator-empty-state h2 {
                margin: 4px 0 0;
                font-size: 18px;
                color: var(--text-primary);
            }

            .calculator-empty-state p {
                margin: 0;
                max-width: 340px;
                font-size: 13px;
            }

            .calculator-setting-row {
                min-height: 72px;
                padding: 14px 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 14px;
            }

            .calculator-setting-main {
                display: flex;
                flex-direction: column;
                gap: 4px;
                min-width: 0;
            }

            .calculator-setting-main > span {
                font-size: 14px;
                font-weight: 600;
            }

            .calculator-setting-main small {
                color: var(--text-secondary);
                font-size: 12px;
                line-height: 1.35;
            }

            .calculator-setting-control {
                flex: 0 0 auto;
                display: flex;
                align-items: center;
                justify-content: flex-end;
                min-width: 0;
            }

            .calculator-settings-select.fluent-select-wrapper {
                width: 174px;
                min-width: 174px;
                z-index: 12;
            }

            .calculator-settings-toggle.fluent-toggle-wrapper {
                flex: 0 0 auto;
            }

            .calculator-clear-history-host {
                display: flex;
                align-items: center;
                justify-content: flex-start;
            }

            .calculator-clear-history-button.fluent-btn {
                min-height: 36px;
            }

            .calc-secondary-button {
                min-height: 36px;
                padding: 0 12px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                cursor: pointer;
                font-size: 13px;
            }

            .calc-secondary-button img {
                width: 16px;
                height: 16px;
            }

            @media (max-width: 760px) {
                .calculator-page-header,
                .calculator-history-list,
                .calculator-settings-list {
                    padding-left: 16px;
                    padding-right: 16px;
                }

                .calculator-setting-row {
                    align-items: stretch;
                    flex-direction: column;
                }

                .calculator-setting-control,
                .calculator-clear-history-host {
                    align-self: flex-start;
                    justify-content: flex-start;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

if (typeof window !== 'undefined') {
    window.CalculatorApp = CalculatorApp;
}
