/**
 * Calculator application
 */
const CalculatorApp = {
    windowId: null,
    container: null,
    currentValue: '0',
    previousValue: '',
    operation: null,
    mode: 'standard',
    resizeObserver: null,
    keydownHandler: null,
    SCIENTIFIC_MIN_WIDTH: 520,
    SCIENTIFIC_MIN_HEIGHT: 620,

    init(windowId) {
        this.windowId = windowId || `window-${Date.now()}`;
        this.container = document.getElementById(`${this.windowId}-content`);
        if (!this.container) return;

        this.reset();
        this.render();
        this.bindWindowResize();
        this.updateModeFromWindowSize();
    },

    reset() {
        this.currentValue = '0';
        this.previousValue = '';
        this.operation = null;
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
            return `<button class="${className}" ${attrs.join(' ')}>${button.label}</button>`;
        }).join('');
    },

    render() {
        this.container.innerHTML = `
            <div class="calculator-app calculator-mode-${this.mode}">
                <div class="calculator-display">
                    <div class="calculator-mode-indicator">${this.mode === 'scientific' ? 'Scientific' : 'Standard'}</div>
                    <div class="calculator-expression" id="calc-expression"></div>
                    <div class="calculator-result" id="calc-result">0</div>
                </div>
                <div class="calculator-scientific-buttons">
                    ${this.renderButtons(this.getScientificButtons())}
                </div>
                <div class="calculator-buttons">
                    ${this.renderButtons(this.getStandardButtons())}
                </div>
            </div>
        `;

        this.addStyles();
        this.bindEvents();
        this.updateDisplay();
        this.syncFluidLayout();
    },

    addStyles() {
        if (document.getElementById('calculator-app-styles')) return;

        const style = document.createElement('style');
        style.id = 'calculator-app-styles';
        style.textContent = `
            .calculator-app {
                --calc-app-padding: 20px;
                --calc-section-gap: 16px;
                --calc-display-height: 156px;
                --calc-display-radius: 28px;
                --calc-display-pad-y: 20px;
                --calc-display-pad-x: 24px;
                --calc-button-gap: 12px;
                --calc-button-height: 56px;
                --calc-scientific-height: 48px;
                --calc-button-radius: 18px;
                --calc-button-font-size: 20px;
                --calc-scientific-font-size: 15px;
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
                background: var(--bg-primary);
                overflow: hidden;
                box-sizing: border-box;
            }

            .calculator-display {
                background: var(--bg-tertiary);
                border-radius: var(--calc-display-radius);
                padding: var(--calc-display-pad-y) var(--calc-display-pad-x);
                min-height: var(--calc-display-height);
                text-align: right;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                box-sizing: border-box;
            }

            .calculator-mode-indicator {
                display: inline-flex;
                align-self: flex-end;
                margin-bottom: 12px;
                padding: var(--calc-mode-pad-y) var(--calc-mode-pad-x);
                border-radius: 999px;
                background: rgba(0, 120, 212, 0.12);
                color: var(--accent);
                font-size: var(--calc-mode-font-size);
                font-weight: 600;
                letter-spacing: 0.02em;
            }

            .calculator-expression {
                font-size: var(--calc-expression-font-size);
                color: var(--text-secondary);
                min-height: 20px;
                margin-bottom: 8px;
            }

            .calculator-result {
                font-size: var(--calc-result-font-size);
                font-weight: 300;
                color: var(--text-primary);
                word-break: break-all;
                line-height: 1;
            }

            .calculator-scientific-buttons {
                display: none;
                grid-template-columns: repeat(6, minmax(0, 1fr));
                gap: var(--calc-button-gap);
                grid-auto-rows: var(--calc-scientific-height);
                flex: 0 0 auto;
            }

            .calculator-mode-scientific .calculator-scientific-buttons {
                display: grid;
            }

            .calculator-buttons {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: var(--calc-button-gap);
                grid-auto-rows: var(--calc-button-height);
                align-content: end;
                flex: 1 1 auto;
                min-height: 0;
            }

            .calc-btn {
                min-height: 0;
                height: 100%;
                border-radius: var(--calc-button-radius);
                background: var(--bg-tertiary);
                font-size: var(--calc-button-font-size);
                font-weight: 400;
                cursor: pointer;
                transition: all var(--transition-fast);
                border: none;
                color: var(--text-primary);
                box-sizing: border-box;
            }

            .calculator-scientific-buttons .calc-btn {
                font-size: var(--calc-scientific-font-size);
                font-weight: 500;
            }

            .calc-btn:hover {
                background: rgba(0, 0, 0, 0.1);
                transform: scale(1.02);
            }

            .calc-btn:active {
                transform: scale(0.98);
            }

            .calc-btn-operator {
                background: rgba(0, 120, 212, 0.15);
                color: var(--accent);
                font-weight: 500;
            }

            .calc-btn-operator:hover {
                background: rgba(0, 120, 212, 0.25);
            }

            .calc-btn-clear {
                background: rgba(211, 52, 56, 0.15);
                color: #d13438;
                font-weight: 500;
            }

            .calc-btn-clear:hover {
                background: rgba(211, 52, 56, 0.25);
            }

            .calc-btn-equals {
                background: var(--accent);
                color: white;
                font-weight: 600;
            }

            .calc-btn-equals:hover {
                background: var(--accent-hover);
            }

            .calc-btn-zero {
                grid-column: span 2;
            }

            .dark-mode .calc-btn:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .dark-mode .calc-btn-operator {
                background: rgba(96, 205, 255, 0.2);
            }

            .dark-mode .calc-btn-operator:hover {
                background: rgba(96, 205, 255, 0.3);
            }
        `;
        document.head.appendChild(style);
    },

    bindEvents() {
        this.container.querySelectorAll('[data-number]').forEach((btn) => {
            btn.addEventListener('click', () => this.inputNumber(btn.dataset.number));
        });

        this.container.querySelectorAll('[data-operation]').forEach((btn) => {
            btn.addEventListener('click', () => this.inputOperation(btn.dataset.operation));
        });

        this.container.querySelectorAll('[data-action]').forEach((btn) => {
            btn.addEventListener('click', () => this.handleAction(btn.dataset.action));
        });

        this.container.querySelectorAll('[data-scientific]').forEach((btn) => {
            btn.addEventListener('click', () => this.handleScientific(btn.dataset.scientific));
        });

        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }

        this.keydownHandler = (event) => {
            if (!this.container?.closest('.window')) return;

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
        this.resizeObserver?.disconnect();

        const target = this.container?.closest('.window');
        if (!target || typeof ResizeObserver === 'undefined') return;

        this.resizeObserver = new ResizeObserver(() => {
            this.updateModeFromWindowSize();
            this.syncFluidLayout();
        });
        this.resizeObserver.observe(target);
    },

    updateModeFromWindowSize() {
        const target = this.container?.closest('.window');
        if (!target) return;

        const nextMode = (target.offsetWidth >= this.SCIENTIFIC_MIN_WIDTH || target.offsetHeight >= this.SCIENTIFIC_MIN_HEIGHT)
            ? 'scientific'
            : 'standard';

        if (nextMode === this.mode) return;
        this.mode = nextMode;
        this.render();
    },

    syncFluidLayout() {
        const app = this.container?.querySelector('.calculator-app');
        if (!app) return;

        const width = app.clientWidth || this.container?.clientWidth || 0;
        const height = app.clientHeight || this.container?.clientHeight || 0;
        if (!width || !height) return;

        const scientificMode = this.mode === 'scientific';
        const baseSize = Math.min(width, height);
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const appPadding = Math.round(clamp(baseSize * 0.04, 12, 22));
        const sectionGap = Math.round(clamp(baseSize * 0.028, 8, 16));
        const displayHeight = Math.round(clamp(height * (scientificMode ? 0.28 : 0.32), scientificMode ? 116 : 128, scientificMode ? 210 : 230));
        const scientificHeight = scientificMode ? Math.round(clamp(height * 0.07, 34, 52)) : 0;

        const reservedHeight = appPadding * 2
            + displayHeight
            + (scientificMode ? (scientificHeight * 2) + sectionGap * 2 + sectionGap : sectionGap);
        const buttonHeight = Math.round(clamp((height - reservedHeight - sectionGap * 4) / 5, scientificMode ? 36 : 40, scientificMode ? 72 : 82));

        const buttonRadius = Math.round(clamp(buttonHeight * 0.34, 14, 24));
        const buttonFontSize = Math.round(clamp(buttonHeight * 0.35, 18, 30));
        const scientificFontSize = Math.round(clamp((scientificHeight || buttonHeight) * 0.32, 12, 17));
        const resultFontSize = Math.round(clamp(Math.min(width * 0.15, height * 0.14), scientificMode ? 38 : 42, scientificMode ? 74 : 88));
        const expressionFontSize = Math.round(clamp(baseSize * 0.032, 12, 16));
        const modeFontSize = Math.round(clamp(baseSize * 0.028, 11, 13));
        const modePadY = Math.round(clamp(buttonHeight * 0.08, 4, 6));
        const modePadX = Math.round(clamp(width * 0.025, 10, 14));
        const displayPadY = Math.round(clamp(displayHeight * 0.16, 16, 24));
        const displayPadX = Math.round(clamp(width * 0.055, 18, 30));
        const displayRadius = Math.round(clamp(buttonRadius * 1.35, 18, 32));

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
                this.applyUnary((value) => value / 100);
                break;
            case 'equals':
                this.calculate();
                break;
        }
    },

    handleScientific(action) {
        switch (action) {
            case 'sin':
                this.applyUnary((value) => Math.sin(this.degToRad(value)));
                break;
            case 'cos':
                this.applyUnary((value) => Math.cos(this.degToRad(value)));
                break;
            case 'tan':
                this.applyUnary((value) => Math.tan(this.degToRad(value)));
                break;
            case 'ln':
                this.applyUnary((value) => value > 0 ? Math.log(value) : NaN);
                break;
            case 'log':
                this.applyUnary((value) => value > 0 ? Math.log10(value) : NaN);
                break;
            case 'sqrt':
                this.applyUnary((value) => value >= 0 ? Math.sqrt(value) : NaN);
                break;
            case 'square':
                this.applyUnary((value) => value * value);
                break;
            case 'reciprocal':
                this.applyUnary((value) => value !== 0 ? 1 / value : NaN);
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

    applyUnary(fn) {
        if (this.currentValue === 'Error') return;
        const value = parseFloat(this.currentValue);
        const nextValue = fn(value);
        this.currentValue = this.formatResult(nextValue);
        this.updateDisplay();
    },

    calculate() {
        if (!this.operation || !this.previousValue || this.currentValue === 'Error') return;

        const prev = parseFloat(this.previousValue);
        const current = parseFloat(this.currentValue);
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

        this.currentValue = this.formatResult(result);
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

    updateDisplay() {
        const resultElement = this.container.querySelector('#calc-result');
        const expressionElement = this.container.querySelector('#calc-expression');
        const modeElement = this.container.querySelector('.calculator-mode-indicator');

        if (resultElement) {
            resultElement.textContent = this.currentValue;
        }

        if (expressionElement) {
            const opSymbol = {
                '+': '+',
                '-': '-',
                '*': '×',
                '/': '÷',
                '^': 'x^y'
            }[this.operation] || this.operation || '';
            expressionElement.textContent = this.previousValue && this.operation
                ? `${this.previousValue} ${opSymbol}`
                : '';
        }

        if (modeElement) {
            modeElement.textContent = this.mode === 'scientific' ? 'Scientific' : 'Standard';
        }
    }
};

if (typeof window !== 'undefined') {
    window.CalculatorApp = CalculatorApp;
}
