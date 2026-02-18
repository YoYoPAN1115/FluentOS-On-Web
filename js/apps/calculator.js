/**
 * 计算器应用
 */
const CalculatorApp = {
    windowId: null,
    container: null,
    display: '',
    currentValue: '0',
    previousValue: '',
    operation: null,

    init(windowId) {
        this.windowId = windowId || `window-${Date.now()}`;
        this.container = document.getElementById(`${this.windowId}-content`);
        this.reset();
        this.render();
    },

    reset() {
        this.currentValue = '0';
        this.previousValue = '';
        this.operation = null;
    },

    render() {
        this.container.innerHTML = `
            <div class="calculator-app">
                <div class="calculator-display">
                    <div class="calculator-expression" id="calc-expression"></div>
                    <div class="calculator-result" id="calc-result">0</div>
                </div>
                <div class="calculator-buttons">
                    <button class="calc-btn calc-btn-clear" data-action="clear">C</button>
                    <button class="calc-btn calc-btn-operator" data-action="backspace">⌫</button>
                    <button class="calc-btn calc-btn-operator" data-action="percent">%</button>
                    <button class="calc-btn calc-btn-operator" data-operation="/">÷</button>
                    
                    <button class="calc-btn" data-number="7">7</button>
                    <button class="calc-btn" data-number="8">8</button>
                    <button class="calc-btn" data-number="9">9</button>
                    <button class="calc-btn calc-btn-operator" data-operation="*">×</button>
                    
                    <button class="calc-btn" data-number="4">4</button>
                    <button class="calc-btn" data-number="5">5</button>
                    <button class="calc-btn" data-number="6">6</button>
                    <button class="calc-btn calc-btn-operator" data-operation="-">−</button>
                    
                    <button class="calc-btn" data-number="1">1</button>
                    <button class="calc-btn" data-number="2">2</button>
                    <button class="calc-btn" data-number="3">3</button>
                    <button class="calc-btn calc-btn-operator" data-operation="+">+</button>
                    
                    <button class="calc-btn calc-btn-zero" data-number="0">0</button>
                    <button class="calc-btn" data-action="decimal">.</button>
                    <button class="calc-btn calc-btn-equals" data-action="equals">=</button>
                </div>
            </div>
        `;

        this.addStyles();
        this.bindEvents();
        this.updateDisplay();
    },

    addStyles() {
        if (document.getElementById('calculator-app-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'calculator-app-styles';
        style.textContent = `
            .calculator-app { display: flex; flex-direction: column; height: 100%; padding: 20px; background: var(--bg-primary); }
            .calculator-display { background: var(--bg-tertiary); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 16px; text-align: right; }
            .calculator-expression { font-size: 14px; color: var(--text-secondary); min-height: 20px; margin-bottom: 8px; }
            .calculator-result { font-size: 42px; font-weight: 300; color: var(--text-primary); word-break: break-all; }
            .calculator-buttons { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; flex: 1; }
            .calc-btn { border-radius: var(--radius-md); background: var(--bg-tertiary); font-size: 20px; font-weight: 400; cursor: pointer; transition: all var(--transition-fast); border: none; color: var(--text-primary); }
            .calc-btn:hover { background: rgba(0, 0, 0, 0.1); transform: scale(1.02); }
            .calc-btn:active { transform: scale(0.98); }
            .calc-btn-operator { background: rgba(0, 120, 212, 0.15); color: var(--accent); font-weight: 500; }
            .calc-btn-operator:hover { background: rgba(0, 120, 212, 0.25); }
            .calc-btn-clear { background: rgba(211, 52, 56, 0.15); color: #d13438; font-weight: 500; }
            .calc-btn-clear:hover { background: rgba(211, 52, 56, 0.25); }
            .calc-btn-equals { background: var(--accent); color: white; font-weight: 600; }
            .calc-btn-equals:hover { background: var(--accent-hover); }
            .calc-btn-zero { grid-column: span 2; }
            .dark-mode .calc-btn:hover { background: rgba(255, 255, 255, 0.1); }
            .dark-mode .calc-btn-operator { background: rgba(96, 205, 255, 0.2); }
            .dark-mode .calc-btn-operator:hover { background: rgba(96, 205, 255, 0.3); }
        `;
        document.head.appendChild(style);
    },

    bindEvents() {
        // 数字按钮
        this.container.querySelectorAll('[data-number]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.inputNumber(btn.dataset.number);
            });
        });

        // 运算符按钮
        this.container.querySelectorAll('[data-operation]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.inputOperation(btn.dataset.operation);
            });
        });

        // 功能按钮
        this.container.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleAction(btn.dataset.action);
            });
        });

        // 键盘支持
        document.addEventListener('keydown', (e) => {
            if (!this.container.closest('.window')) return;
            
            if (e.key >= '0' && e.key <= '9') {
                this.inputNumber(e.key);
            } else if (['+', '-', '*', '/'].includes(e.key)) {
                this.inputOperation(e.key);
            } else if (e.key === 'Enter' || e.key === '=') {
                this.handleAction('equals');
            } else if (e.key === 'Escape' || e.key === 'c') {
                this.handleAction('clear');
            } else if (e.key === 'Backspace') {
                this.handleAction('backspace');
            } else if (e.key === '.') {
                this.handleAction('decimal');
            } else if (e.key === '%') {
                this.handleAction('percent');
            }
        });
    },

    inputNumber(num) {
        if (this.currentValue === '0') {
            this.currentValue = num;
        } else {
            this.currentValue += num;
        }
        this.updateDisplay();
    },

    inputOperation(op) {
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
                if (this.currentValue.length > 1) {
                    this.currentValue = this.currentValue.slice(0, -1);
                } else {
                    this.currentValue = '0';
                }
                this.updateDisplay();
                break;
            case 'decimal':
                if (!this.currentValue.includes('.')) {
                    this.currentValue += '.';
                    this.updateDisplay();
                }
                break;
            case 'percent':
                this.currentValue = String(parseFloat(this.currentValue) / 100);
                this.updateDisplay();
                break;
            case 'equals':
                this.calculate();
                break;
        }
    },

    calculate() {
        if (!this.operation || !this.previousValue) return;

        const prev = parseFloat(this.previousValue);
        const current = parseFloat(this.currentValue);
        let result;

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
                result = current !== 0 ? prev / current : 'Error';
                break;
        }

        this.currentValue = String(result);
        this.previousValue = '';
        this.operation = null;
        this.updateDisplay();
    },

    updateDisplay() {
        const resultElement = this.container.querySelector('#calc-result');
        const expressionElement = this.container.querySelector('#calc-expression');

        if (resultElement) {
            resultElement.textContent = this.currentValue;
        }

        if (expressionElement) {
            let expression = '';
            if (this.previousValue && this.operation) {
                const opSymbol = {
                    '+': '+',
                    '-': '−',
                    '*': '×',
                    '/': '÷'
                }[this.operation] || this.operation;
                expression = `${this.previousValue} ${opSymbol}`;
            }
            expressionElement.textContent = expression;
        }
    }
};

if (typeof window !== 'undefined') {
    window.CalculatorApp = CalculatorApp;
}

