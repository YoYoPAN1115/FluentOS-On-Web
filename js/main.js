/**
 * Fluent OS - 主入口文件
 * 负责初始化整个系统
 */

// 等待DOM加载完成
const StrictScriptGuard = {
    enabled: false,
    _patched: false,

    init(enabled = false) {
        if (!this._patched) {
            this._patch();
            this._patched = true;
        }
        this.setEnabled(enabled);
    },

    setEnabled(enabled) {
        this.enabled = enabled === true;
        if (document.body) {
            document.body.classList.toggle('strict-csp-enabled', this.enabled);
        }
    },

    _isBlockedInlineScript(node) {
        if (!node || node.nodeType !== 1 || node.tagName !== 'SCRIPT') return false;
        const src = (node.getAttribute('src') || '').trim();
        const text = (node.textContent || '').trim();
        return !src && text.length > 0;
    },

    _patch() {
        const guard = this;

        const originalEval = window.eval;
        window.eval = function(...args) {
            if (guard.enabled) {
                throw new Error('Inline script execution is blocked by strict mode.');
            }
            return originalEval(...args);
        };

        const OriginalFunction = window.Function;
        const GuardedFunction = function(...args) {
            if (guard.enabled) {
                throw new Error('Function constructor is blocked by strict mode.');
            }
            return OriginalFunction(...args);
        };
        GuardedFunction.prototype = OriginalFunction.prototype;
        window.Function = GuardedFunction;

        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(handler, timeout, ...args) {
            if (guard.enabled && typeof handler === 'string') {
                throw new Error('String-based setTimeout is blocked by strict mode.');
            }
            return originalSetTimeout(handler, timeout, ...args);
        };

        const originalSetInterval = window.setInterval;
        window.setInterval = function(handler, timeout, ...args) {
            if (guard.enabled && typeof handler === 'string') {
                throw new Error('String-based setInterval is blocked by strict mode.');
            }
            return originalSetInterval(handler, timeout, ...args);
        };

        const originalSetAttribute = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name, value) {
            if (guard.enabled && typeof name === 'string' && /^on/i.test(name)) {
                throw new Error('Inline event handlers are blocked by strict mode.');
            }
            return originalSetAttribute.call(this, name, value);
        };

        const originalAppendChild = Node.prototype.appendChild;
        Node.prototype.appendChild = function(child) {
            if (guard.enabled && guard._isBlockedInlineScript(child)) {
                throw new Error('Inline <script> is blocked by strict mode.');
            }
            return originalAppendChild.call(this, child);
        };

        const originalInsertBefore = Node.prototype.insertBefore;
        Node.prototype.insertBefore = function(newNode, referenceNode) {
            if (guard.enabled && guard._isBlockedInlineScript(newNode)) {
                throw new Error('Inline <script> is blocked by strict mode.');
            }
            return originalInsertBefore.call(this, newNode, referenceNode);
        };

        const originalReplaceChild = Node.prototype.replaceChild;
        Node.prototype.replaceChild = function(newChild, oldChild) {
            if (guard.enabled && guard._isBlockedInlineScript(newChild)) {
                throw new Error('Inline <script> is blocked by strict mode.');
            }
            return originalReplaceChild.call(this, newChild, oldChild);
        };
    }
};

if (typeof window !== 'undefined') {
    window.StrictScriptGuard = StrictScriptGuard;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('%c Fluent OS ', 'background: #0078d4; color: white; font-size: 16px; padding: 4px 8px; border-radius: 4px;');
    console.log('正在启动系统...');

    // 初始化存储
    Storage.initDefaults();
    StrictScriptGuard.init(false);

    // 初始化状态
    State.init();
    
    // 初始化多语言
    I18n.init();

    // 监听视图变化（必须在 startSystem 之前注册）
    State.on('viewChange', handleViewChange);

    // 监听电源操作
    State.on('powerAction', handlePowerAction);

    // 初始化所有模块
    initModules();

    // 开始系统流程
    startSystem();
});

/**
 * 初始化所有模块
 */
function initModules() {
    // UI模块
    BootScreen.init();
    LockScreen.init();
    LoginScreen.init();
    Desktop.init();
    Taskbar.init();
    StartMenu.init();
    ControlCenter.init();
    NotificationCenter.init();
    WindowManager.init();
    if (typeof TaskView !== 'undefined') { TaskView.init(); }
    Fingo.init();

    // Fingo 任务栏按钮
    const fingoBtn = document.getElementById('fingo-btn');
    if (fingoBtn) {
        fingoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            Fingo.toggle();
        });
    }

    // 日历组件在NotificationCenter中初始化
    if (typeof CalendarWidget !== 'undefined') {
        CalendarWidget.init();
    }

    console.log('✓ 所有模块已初始化');
    
    // 调试：检查所有应用组件是否加载
    console.log('📱 应用组件加载状态:');
    console.log('  - FilesApp:', typeof FilesApp !== 'undefined' ? '✓' : '✗');
    console.log('  - SettingsApp:', typeof SettingsApp !== 'undefined' ? '✓' : '✗');
    console.log('  - CalculatorApp:', typeof CalculatorApp !== 'undefined' ? '✓' : '✗');
    console.log('  - NotesApp:', typeof NotesApp !== 'undefined' ? '✓' : '✗');
    console.log('  - BrowserApp:', typeof BrowserApp !== 'undefined' ? '✓' : '✗');
    console.log('  - ClockApp:', typeof ClockApp !== 'undefined' ? '✓' : '✗');
}

/**
 * 启动系统 - 每次加载网页都进入开机界面
 */
function startSystem() {
    // 无论是否已登录，都先显示开机画面
    State.setView('boot');
}

/**
 * 处理视图变化
 */
function handleViewChange({ oldView, newView }) {
    console.log(`视图切换: ${oldView} → ${newView}`);

    // 特殊处理：锁屏 → 登录的动画
    if (oldView === 'lock' && newView === 'login') {
        handleLockToLogin();
        return;
    }

    // 特殊处理：登录 → 桌面的动画
    if (oldView === 'login' && newView === 'desktop') {
        handleLoginToDesktop();
        return;
    }

    // 其他情况：直接切换
    hideAllViews();
    switch (newView) {
        case 'boot':
            BootScreen.show();
            break;
        case 'lock':
            LockScreen.show();
            break;
        case 'login':
            LoginScreen.show();
            break;
        case 'desktop':
            Desktop.show();
            break;
    }
}

/**
 * 处理电源操作（关机/重启/注销）
 */
function handlePowerAction({ action }) {
    const overlay = document.getElementById('power-overlay');
    const titleEl = document.getElementById('power-overlay-title');
    const textEl = document.getElementById('power-overlay-text');

    // 关闭所有打开的窗口
    if (typeof WindowManager !== 'undefined') {
        WindowManager.windows.forEach(w => WindowManager.closeWindow(w.id));
    }

    // 根据操作类型设置文字
    const texts = {
        shutdown: { title: t('power.shutdown.title'), status: t('power.shutdown.status') },
        restart: { title: t('power.restart.title'), status: t('power.restart.status') },
        logout: { title: t('power.logout.title'), status: t('power.logout.status') }
    };

    const info = texts[action];
    titleEl.textContent = info.title;
    textEl.textContent = info.status;

    // 阶段1: 显示覆盖层，背景模糊
    overlay.classList.remove('hidden', 'fade-out', 'phase-blur', 'phase-card');
    overlay.offsetHeight; // force reflow
    requestAnimationFrame(() => {
        overlay.classList.add('phase-blur');
        // 阶段2: 卡片淡入弹出
        setTimeout(() => overlay.classList.add('phase-card'), 200);
    });

    const durations = { shutdown: 5000, restart: 6000, logout: 3000 };

    setTimeout(() => {
        // 先在覆盖层下面准备好目标视图，防止闪现桌面
        if (action === 'restart') {
            hideAllViews();
            BootScreen.show();
            State.view = 'boot';
        } else if (action === 'logout') {
            hideAllViews();
            LockScreen.show();
            State.view = 'lock';
        }

        // 淡出覆盖层
        overlay.classList.add('fade-out');
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('phase-blur', 'phase-card', 'fade-out');
            if (action === 'shutdown') {
                window.close();
                document.body.innerHTML = '';
                document.body.style.background = '#000';
            }
        }, 700);
    }, durations[action]);
}

/**
 * 锁屏 → 登录动画（锁屏元素保持模糊状态，密码卡片在上方弹入）
 */
function handleLockToLogin() {
    const loginScreen = document.getElementById('login-screen');
    const loginCard = document.querySelector('.login-card');
    const pinInput = document.getElementById('login-pin');
    const errorElement = document.getElementById('login-error');
    const securityLink = document.getElementById('security-link');
    
    // 1. 准备登录卡片（设置初始状态）
    if (pinInput) pinInput.value = '';
    if (errorElement) errorElement.classList.add('hidden');
    if (securityLink) securityLink.classList.add('hidden');
    
    // 2. 确保登录卡片初始为隐藏状态
    if (loginCard) {
        loginCard.classList.remove('show', 'exit');
        loginCard.style.opacity = '0';
        loginCard.style.transform = 'translate(-50%, calc(-50% + 40px)) scale(0.92)';
    }
    
    // 3. 显示登录界面（只为了显示密码卡片）
    loginScreen.classList.remove('hidden');
    loginScreen.classList.add('show');
    
    // 4. 同时触发锁屏模糊和密码卡片弹入（0延迟，完全同步）
    document.body.classList.add('lock-to-login');
    
    // 强制浏览器重绘
    if (loginCard) loginCard.offsetHeight;
    
    // 5. 立即触发密码卡片弹入（与壁纸模糊同步）
    requestAnimationFrame(() => {
        if (loginCard) {
            loginCard.style.opacity = '';
            loginCard.style.transform = '';
            loginCard.classList.add('show');
        }
        // 延迟聚焦，避免干扰动画
        if (pinInput) {
            setTimeout(() => pinInput.focus(), 400);
        }
    });
    
    // 6. 不隐藏锁屏！保持锁屏的模糊状态作为密码界面的背景
    // 锁屏界面一直保持显示，只是处于模糊状态
}

/**
 * 登录 → 锁屏动画（反向平滑退回）
 */
window.handleLoginToLock = function() {
    const loginCard = document.querySelector('.login-card');
    
    // 1. 添加返回锁屏的过渡类
    document.body.classList.add('login-to-lock');
    
    // 2. 密码卡片先退出动画（向下淡出）
    if (loginCard) {
        loginCard.classList.remove('show');
        loginCard.classList.add('exit-to-lock');
    }
    
    // 3. 延迟 100ms 后移除模糊类，锁屏元素恢复清晰
    setTimeout(() => {
        document.body.classList.remove('lock-to-login');
    }, 100);
    
    // 4. 动画完成后清理状态
    setTimeout(() => {
        document.body.classList.remove('login-to-lock');
        if (loginCard) {
            loginCard.classList.remove('exit-to-lock');
        }
        LoginScreen.hide();
        State.view = 'lock';
    }, 500);
};

/**
 * 登录 → 桌面动画（加深模糊、淡化切换、变清晰同步进行）
 */
function handleLoginToDesktop() {
    const loginCard = document.querySelector('.login-card');
    const lockScreen = document.getElementById('lock-screen');
    const loginScreen = document.getElementById('login-screen');
    const desktopScreen = document.getElementById('desktop-screen');
    
    // 1. 密码卡片退出 + 全局加深模糊（同步开始）
    if (loginCard) {
        loginCard.classList.add('exit');
    }
    document.body.classList.add('login-to-desktop-blur');
    
    // 2. 立即准备桌面（模糊状态，透明）
    desktopScreen.classList.remove('hidden');
    desktopScreen.style.opacity = '0';
    document.body.classList.add('desktop-blur-in');
    Desktop.show();
    
    // 3. 100ms后开始淡化切换（与加深模糊同时进行）
    setTimeout(() => {
        // 同时淡出锁屏+登录界面，淡入桌面
        if (lockScreen) lockScreen.style.transition = 'opacity 400ms ease-out';
        if (lockScreen) lockScreen.style.opacity = '0';
        if (loginScreen) loginScreen.style.transition = 'opacity 400ms ease-out';
        if (loginScreen) loginScreen.style.opacity = '0';
        
        desktopScreen.style.transition = 'opacity 400ms ease-in';
        desktopScreen.style.opacity = '1';
    }, 100);
    
    // 4. 200ms：桌面开始淡入，同时开始从模糊变清晰（不等待）
    setTimeout(() => {
        document.body.classList.remove('desktop-blur-in');
        document.body.classList.add('desktop-unblur');
    }, 200);
    
    // 5. 500ms：清理锁屏和登录界面
    setTimeout(() => {
        LockScreen.hide();
        LoginScreen.hide();
        document.body.classList.remove('lock-to-login', 'login-to-desktop-blur');
        
        // 重置样式
        if (lockScreen) {
            lockScreen.style.transition = '';
            lockScreen.style.opacity = '';
        }
        if (loginScreen) {
            loginScreen.style.transition = '';
            loginScreen.style.opacity = '';
        }
        desktopScreen.style.transition = '';
        desktopScreen.style.opacity = '';
    }, 500);
    
    // 6. 800ms：清晰过渡完成，清理动画类
    setTimeout(() => {
        document.body.classList.remove('desktop-unblur');
    }, 800);
}

/**
 * 隐藏所有视图
 */
function hideAllViews() {
    BootScreen.hide();
    LockScreen.hide();
    LoginScreen.hide();
    Desktop.hide();
}

/**
 * 全局错误处理
 */
window.addEventListener('error', (e) => {
    console.error('系统错误:', e.error);
    
    // 在桌面视图时显示通知
    if (State.view === 'desktop') {
        State.addNotification({
            title: '系统错误',
            message: '发生了一个错误，请查看控制台了解详情',
            type: 'error'
        });
    }
});

/**
 * 全局禁用右键菜单和文字复制（记事本除外）
 */
document.addEventListener('contextmenu', (e) => {
    // 检查是否在记事本应用内
    const notesApp = e.target.closest('.notes-app');
    if (notesApp) {
        // 记事本内允许右键菜单
        return;
    }
    
    // 其他所有地方禁用右键菜单
    e.preventDefault();
});

// 全局禁用文字复制（记事本除外）
document.addEventListener('copy', (e) => {
    const notesApp = e.target.closest('.notes-app');
    if (!notesApp) {
        e.preventDefault();
    }
});

document.addEventListener('cut', (e) => {
    const notesApp = e.target.closest('.notes-app');
    if (!notesApp) {
        e.preventDefault();
    }
});

/**
 * 阻止默认的拖拽行为
 */
document.addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
});

/**
 * 性能监控（可选）
 */
if (window.performance && window.performance.timing) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const timing = window.performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            console.log(`✓ 系统加载完成，耗时: ${loadTime}ms`);
        }, 0);
    });
}

/**
 * 导出全局API（供调试和扩展使用）
 */
window.FluentOS = {
    version: '1.0.0',
    State,
    Storage,
    notify,
    
    // 应用管理
    openApp: (appId) => WindowManager.openApp(appId),
    closeAllWindows: () => {
        WindowManager.windows.forEach(w => WindowManager.closeWindow(w.id));
    },
    
    // 系统控制
    restart: () => State.restart(),
    shutdown: () => State.shutdown(),
    logout: () => State.logout(),
    
    // 主题
    setTheme: (theme) => State.updateSettings({ theme }),
    toggleTheme: () => {
        const newTheme = State.settings.theme === 'dark' ? 'light' : 'dark';
        State.updateSettings({ theme: newTheme });
    },
    
    // 调试工具
    debug: {
        clearStorage: () => {
            if (confirm('确定要清空所有数据吗？这将重置系统到初始状态。')) {
                Storage.clear();
                location.reload();
            }
        },
        exportSettings: () => {
            const data = {
                settings: State.settings,
                session: State.session,
                fs: State.fs
            };
            console.log(JSON.stringify(data, null, 2));
            return data;
        },
        getState: () => State,
        getWindows: () => WindowManager.windows
    }
};

// 欢迎消息
console.log('%c欢迎使用 Fluent OS！', 'color: #0078d4; font-size: 14px; font-weight: bold;');
console.log('💡 提示: 使用 FluentOS.debug 访问调试工具');
console.log('📝 默认 PIN: 1234');
