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

const AUTO_FULLSCREEN_DELAY_MS = 2000;
let autoFullscreenTimer = null;
let autoFullscreenRetryBound = false;

function bindFullscreenRetryOnNextInteraction() {
    if (autoFullscreenRetryBound) return;
    autoFullscreenRetryBound = true;

    const tryOnce = async () => {
        unbind();
        if (!State || !State.settings || State.settings.autoEnterFullscreen === false) return;
        await requestDocumentFullscreen();
    };

    const unbind = () => {
        document.removeEventListener('pointerdown', tryOnce, true);
        document.removeEventListener('keydown', tryOnce, true);
        autoFullscreenRetryBound = false;
    };

    document.addEventListener('pointerdown', tryOnce, true);
    document.addEventListener('keydown', tryOnce, true);
}

function isDocumentFullscreen() {
    return !!(
        document.fullscreenElement
        || document.webkitFullscreenElement
        || document.mozFullScreenElement
        || document.msFullscreenElement
    );
}

async function requestDocumentFullscreen() {
    if (isDocumentFullscreen()) return true;
    const root = document.documentElement;
    if (!root) return false;

    const request =
        root.requestFullscreen
        || root.webkitRequestFullscreen
        || root.mozRequestFullScreen
        || root.msRequestFullscreen;

    if (typeof request !== 'function') return false;

    try {
        const ret = request.call(root);
        if (ret && typeof ret.then === 'function') {
            await ret;
        }
        return true;
    } catch (_) {
        return false;
    }
}

function scheduleAutoEnterFullscreen() {
    clearTimeout(autoFullscreenTimer);
    autoFullscreenTimer = setTimeout(async () => {
        autoFullscreenTimer = null;
        if (!State || !State.settings || State.settings.autoEnterFullscreen === false) return;
        const ok = await requestDocumentFullscreen();
        if (!ok) bindFullscreenRetryOnNextInteraction();
    }, AUTO_FULLSCREEN_DELAY_MS);
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
    if (typeof OOBE !== 'undefined' && typeof OOBE.init === 'function') {
        OOBE.init();
    }
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
    initGlobalShortcuts();
    initGlobalFileDragOverlay();

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
 * 全局：当检测到拖拽外部文件进入浏览器窗口时，显示四周蓝色动态边框提示
 * - 仅在 DataTransfer 中包含 Files 时触发（避免影响应用内部拖拽）
 * - dragover 时 preventDefault，防止浏览器把文件当成“打开/导航”
 */
function initGlobalFileDragOverlay() {
    if (document.getElementById('file-drag-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'file-drag-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    // 纯 CSS 光晕（无任何线条/描边）：在网页四周显示动态蓝色光晕提示
    const glow = document.createElement('div');
    glow.className = 'file-drag-overlay-glow';
    overlay.appendChild(glow);
    document.body.appendChild(overlay);

    let dragDepth = 0;
    let hideTimer = null;

    const clearHideTimer = () => {
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
    };

    const show = () => {
        clearHideTimer();
        if (!overlay.classList.contains('show')) {
            overlay.classList.add('show');
        }
    };

    const hideSoon = () => {
        clearHideTimer();
        hideTimer = setTimeout(() => {
            hideTimer = null;
            overlay.classList.remove('show');
        }, 60);
    };

    const isOsFileDrag = (e) => {
        const dt = e && e.dataTransfer;
        if (!dt) return false;
        const files = dt.files;
        if (files && files.length > 0) return true;
        const types = Array.from(dt.types || []).map((v) => String(v || '').toLowerCase());
        return types.includes('files') || types.includes('application/x-moz-file');
    };

    const onDragEnter = (e) => {
        if (!isOsFileDrag(e)) return;
        dragDepth += 1;
        show();
    };

    const onDragOver = (e) => {
        if (!isOsFileDrag(e)) return;
        // 关键：阻止默认行为，避免把拖入文件当成“打开文件导致离开系统”
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        show();
    };

    const onDragLeave = (e) => {
        // dragleave 在部分浏览器上拿不到 types/files，这里用“当前是否显示”来做降级
        if (!overlay.classList.contains('show')) return;
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0) hideSoon();
    };

    const onDrop = (e) => {
        if (isOsFileDrag(e)) {
            e.preventDefault();
        }
        dragDepth = 0;
        clearHideTimer();
        overlay.classList.remove('show');
    };

    // 捕获阶段：更早拿到事件，且仅对“外部文件拖拽”处理
    document.addEventListener('dragenter', onDragEnter, true);
    document.addEventListener('dragover', onDragOver, true);
    document.addEventListener('dragleave', onDragLeave, true);
    document.addEventListener('drop', onDrop, true);

    window.addEventListener('blur', () => {
        dragDepth = 0;
        clearHideTimer();
        overlay.classList.remove('show');
    });
}

/**
 * 启动系统 - 每次加载网页都进入开机界面
 */
function getDesktopWindowsSortedByZ() {
    if (typeof WindowManager === 'undefined' || !Array.isArray(WindowManager.windows)) return [];
    return WindowManager.windows
        .filter(w => w && !w.isMinimized && w.element && w.element.style.display !== 'none')
        .sort((a, b) => (Number(b.element.style.zIndex) || 0) - (Number(a.element.style.zIndex) || 0));
}

function minimizeAllDesktopWindows() {
    const targets = getDesktopWindowsSortedByZ();
    if (targets.length === 0) return false;
    targets.forEach((w) => {
        if (typeof WindowManager.minimizeWindow === 'function') {
            WindowManager.minimizeWindow(w.id);
        }
    });
    return true;
}

function minimizeTopDesktopWindow() {
    const top = getDesktopWindowsSortedByZ()[0];
    if (!top || typeof WindowManager.minimizeWindow !== 'function') return false;
    WindowManager.minimizeWindow(top.id);
    return true;
}

function initGlobalShortcuts() {
    if (window.__fluentGlobalShortcutsBound) return;
    window.__fluentGlobalShortcutsBound = true;

    document.addEventListener('keydown', (e) => {
        if (!e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.key === 'Alt') return;
        if (State.view !== 'desktop') return;

        let key = String(e.key || '').toLowerCase();
        if ((!key || !/^[a-z]$/.test(key)) && /^Key[A-Z]$/.test(String(e.code || ''))) {
            key = String(e.code).slice(3).toLowerCase();
        }
        if (!key || e.repeat) return;

        let handled = false;
        switch (key) {
            case 'f':
                if (typeof Fingo !== 'undefined' && typeof Fingo.toggle === 'function') {
                    Fingo.toggle();
                    handled = true;
                }
                break;
            case 'i':
                if (typeof WindowManager !== 'undefined') {
                    WindowManager.openApp('settings');
                    handled = true;
                }
                break;
            case 'l':
                if (typeof State !== 'undefined' && typeof State.lock === 'function') {
                    State.lock();
                    handled = true;
                }
                break;
            case 'e':
                if (typeof WindowManager !== 'undefined') {
                    WindowManager.openApp('files');
                    handled = true;
                }
                break;
            case 'a':
                if (typeof ControlCenter !== 'undefined' && typeof ControlCenter.toggle === 'function') {
                    ControlCenter.toggle();
                    handled = true;
                }
                break;
            case 'd':
                handled = minimizeAllDesktopWindows();
                break;
            case 'm':
                handled = minimizeTopDesktopWindow();
                break;
            case 'w':
                if (typeof TaskView !== 'undefined' && typeof TaskView.toggle === 'function') {
                    TaskView.toggle();
                    handled = true;
                }
                break;
            default:
                break;
        }

        if (handled) {
            e.preventDefault();
        }
    });
}

function startSystem() {
    State.setView('boot');
    scheduleAutoEnterFullscreen();
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
        case 'oobe':
            if (typeof OOBE !== 'undefined') OOBE.show();
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
            scheduleAutoEnterFullscreen();
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

function getLoginScreenCard() {
    const loginScreen = document.getElementById('login-screen');
    return loginScreen ? loginScreen.querySelector('.login-card') : null;
}

/**
 * 锁屏 → 登录动画（锁屏元素保持模糊状态，密码卡片在上方弹入）
 */
function handleLockToLogin() {
    const loginScreen = document.getElementById('login-screen');
    const loginCard = getLoginScreenCard();
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
    const loginCard = getLoginScreenCard();
    
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
    const loginCard = getLoginScreenCard();
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
    if (typeof OOBE !== 'undefined' && typeof OOBE.hide === 'function') {
        OOBE.hide();
    }
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
    // Always prevent browser's default "open file" behavior on dragover
    // (drop handling is routed to specific surfaces like Files app / Desktop).
    e.preventDefault();
    const typeList = Array.from((e.dataTransfer && e.dataTransfer.types) || []).map((v) => String(v || ''));
    const isInternalFluentDrag = typeList.includes('application/fluent-file');
    const isFileLikeDrag = typeList.some((tp) => tp.toLowerCase().includes('file'));
    if (!isInternalFluentDrag && isFileLikeDrag && e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
    }
});

document.addEventListener('drop', (e) => {
    // Global fallback: if user drops OS files onto desktop (and nothing else handled it),
    // import them into Desktop when Lab toggle is enabled.
    const targetEl = (e && e.target instanceof Element) ? e.target : null;
    const externalEnabled = !!(window.FileImport && typeof FileImport.enabled === 'function' && FileImport.enabled());
    const isDesktopView = !!(typeof State !== 'undefined' && State.view === 'desktop');
    const inWindow = !!targetEl?.closest('.window');
    const inTaskbar = !!targetEl?.closest('.taskbar');
    const inStartMenu = !!targetEl?.closest('.start-menu');
    const targetDesktopIcon = targetEl?.closest('.desktop-icon');

    const getExternalFiles = (dataTransfer) => {
        const files = dataTransfer && dataTransfer.files;
        if (files && files.length > 0) return files;
        const items = dataTransfer && dataTransfer.items;
        if (items && items.length > 0) {
            const out = [];
            for (const it of Array.from(items)) {
                if (it && it.kind === 'file') {
                    const f = it.getAsFile && it.getAsFile();
                    if (f) out.push(f);
                }
            }
            return out.length ? out : null;
        }
        return null;
    };

    if (externalEnabled && isDesktopView && !inWindow && !inTaskbar && !inStartMenu) {
        const externalFiles = getExternalFiles(e.dataTransfer);
        if (externalFiles && externalFiles.length > 0) {
            e.preventDefault();
            try {
                const targetNodeId = targetDesktopIcon?.dataset?.nodeId || '';
                const targetNode = targetNodeId ? State.findNode(targetNodeId) : null;
                const destFolderId = (targetNode && targetNode.type === 'folder') ? targetNode.id : 'desktop';
                FileImport.importToFolder(destFolderId, externalFiles);
            } catch (err) {
                console.error('[Main] Desktop external import failed:', err);
            }
            return;
        }
    }

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
const ResourceMonitor = {
    _running: false,
    _observer: null,
    _errorHandler: null,
    _records: [],
    _seen: new Set(),
    _nextId: 1,
    _maxRecords: 800,
    _liveConsole: false,

    isRunning() {
        return this._running;
    },

    _roundNumber(value, digits = 1) {
        if (!Number.isFinite(value)) return null;
        const fixed = Number(value.toFixed(digits));
        return Number.isFinite(fixed) ? fixed : null;
    },

    _normalizeResourceMeta(input) {
        if (!input || typeof input !== 'string') {
            return { file: '', scope: 'unknown', origin: '' };
        }

        const raw = input.trim();
        if (!raw) {
            return { file: '', scope: 'unknown', origin: '' };
        }
        if (raw.startsWith('data:')) {
            return { file: '[data-url]', scope: 'inline', origin: 'data:' };
        }

        try {
            const url = new URL(raw, window.location.href);
            const isLocal = url.origin === window.location.origin;
            const file = isLocal
                ? `${decodeURIComponent(url.pathname.replace(/^\//, ''))}${url.search || ''}`
                : url.href;
            return { file, scope: isLocal ? 'local' : 'remote', origin: url.origin };
        } catch (_) {
            const cleaned = raw.replace(/^\.\//, '').replace(/^\//, '');
            return { file: cleaned, scope: 'local', origin: window.location.origin };
        }
    },

    _guessType(path, fallbackType = 'other') {
        const fallback = String(fallbackType || 'other').trim() || 'other';
        const clean = String(path || '').split('?')[0].toLowerCase();
        if (!clean) return fallback;
        if (clean.endsWith('.js') || clean.endsWith('.mjs')) return 'script';
        if (clean.endsWith('.css')) return 'style';
        if (/\.(png|jpg|jpeg|gif|webp|bmp|svg|ico|avif)$/.test(clean)) return 'image';
        if (/\.(woff|woff2|ttf|otf|eot)$/.test(clean)) return 'font';
        if (/\.(mp4|webm|mp3|wav|ogg)$/.test(clean)) return 'media';
        if (/\.(json|xml|txt|csv)$/.test(clean)) return 'data';
        return fallback;
    },

    _pushRecord(entry) {
        const record = {
            id: this._nextId++,
            time: new Date().toISOString(),
            result: entry.result || 'loaded',
            scope: entry.scope || 'unknown',
            type: entry.type || 'other',
            file: entry.file || '',
            durationMs: entry.durationMs ?? null,
            sizeBytes: entry.sizeBytes ?? null,
            source: entry.source || 'unknown'
        };

        this._records.push(record);
        if (this._records.length > this._maxRecords) {
            this._records.splice(0, this._records.length - this._maxRecords);
        }

        if (this._liveConsole) {
            const zhState = record.result === 'failed' ? '\u5931\u8d25' : '\u6210\u529f';
            const enState = record.result === 'failed' ? 'FAILED' : 'LOADED';
            console.log(
                `[ResourceMonitor] ${zhState}/${enState} | ${record.type} | ${record.scope} | ${record.file}`
            );
        }

        return record;
    },

    _ingestPerformanceEntry(entry) {
        if (!entry || entry.entryType !== 'resource') return;

        const meta = this._normalizeResourceMeta(entry.name || '');
        if (!meta.file) return;

        const key = `${this._roundNumber(entry.startTime, 1)}|${entry.initiatorType || ''}|${meta.file}`;
        if (this._seen.has(key)) return;
        this._seen.add(key);

        const initiatorType = String(entry.initiatorType || '').trim();
        const transferSize = Number.isFinite(entry.transferSize) ? entry.transferSize : null;
        const encodedBodySize = Number.isFinite(entry.encodedBodySize) ? entry.encodedBodySize : null;

        this._pushRecord({
            result: 'loaded',
            scope: meta.scope,
            type: this._guessType(meta.file, initiatorType || 'resource'),
            file: meta.file,
            durationMs: this._roundNumber(entry.duration, 1),
            sizeBytes: transferSize ?? encodedBodySize,
            source: 'performance'
        });
    },

    _handleResourceError(event) {
        const target = event && event.target;
        if (!target || target === window || target === document) return;

        const url = target.currentSrc || target.src || target.href;
        if (!url || typeof url !== 'string') return;

        const meta = this._normalizeResourceMeta(url);
        if (!meta.file) return;

        const tagName = String(target.tagName || '').toLowerCase();
        this._pushRecord({
            result: 'failed',
            scope: meta.scope,
            type: this._guessType(meta.file, tagName || 'resource'),
            file: meta.file,
            durationMs: null,
            sizeBytes: null,
            source: `error:${tagName || 'element'}`
        });
    },

    _observePerformanceResources() {
        if (typeof PerformanceObserver === 'undefined') return;
        this._observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => this._ingestPerformanceEntry(entry));
        });

        try {
            this._observer.observe({ type: 'resource', buffered: true });
        } catch (_) {
            try {
                this._observer.observe({ entryTypes: ['resource'] });
            } catch (_) {
                this._observer = null;
            }
        }
    },

    _captureBufferedResources() {
        if (!window.performance || typeof performance.getEntriesByType !== 'function') return;
        performance.getEntriesByType('resource').forEach((entry) => this._ingestPerformanceEntry(entry));
    },

    start(options = {}) {
        const nextMax = Number(options.maxRecords);
        if (Number.isFinite(nextMax) && nextMax > 0) {
            this._maxRecords = Math.floor(nextMax);
        }
        this._liveConsole = options.liveConsole === true;

        if (this._running) return true;
        this._running = true;

        this._captureBufferedResources();
        this._observePerformanceResources();

        this._errorHandler = (event) => this._handleResourceError(event);
        window.addEventListener('error', this._errorHandler, true);
        return true;
    },

    stop() {
        if (!this._running) return false;
        this._running = false;

        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
        if (this._errorHandler) {
            window.removeEventListener('error', this._errorHandler, true);
            this._errorHandler = null;
        }
        return true;
    },

    clear() {
        this._records = [];
        this._seen.clear();
        this._nextId = 1;
    },

    list(options = {}) {
        if (!this._running) {
            this.start({ liveConsole: false });
        }

        const failedOnly = options.failedOnly === true;
        const scope = options.scope ? String(options.scope).toLowerCase() : '';
        const type = options.type ? String(options.type).toLowerCase() : '';
        const limit = Number(options.limit);

        let rows = this._records.slice();
        if (failedOnly) rows = rows.filter((item) => item.result === 'failed');
        if (scope) rows = rows.filter((item) => String(item.scope).toLowerCase() === scope);
        if (type) rows = rows.filter((item) => String(item.type).toLowerCase() === type);

        if (Number.isFinite(limit) && limit > 0) {
            rows = rows.slice(-Math.floor(limit));
        }
        return rows;
    },

    table(options = {}) {
        const rows = this.list(options).map((item) => ({
            id: item.id,
            time: item.time,
            result: item.result,
            scope: item.scope,
            type: item.type,
            file: item.file,
            durationMs: item.durationMs,
            sizeBytes: item.sizeBytes,
            source: item.source
        }));

        if (rows.length) {
            console.table(rows);
        } else {
            console.log('[ResourceMonitor] \u6682\u65e0\u8d44\u6e90\u8bb0\u5f55 / No resource records.');
        }
        return rows;
    },

    summary() {
        if (!this._running) {
            this.start({ liveConsole: false });
        }

        const rows = this._records;
        const loaded = rows.filter((item) => item.result === 'loaded').length;
        const failed = rows.filter((item) => item.result === 'failed').length;
        const local = rows.filter((item) => item.scope === 'local').length;
        const remote = rows.filter((item) => item.scope === 'remote').length;
        const inline = rows.filter((item) => item.scope === 'inline').length;
        const byType = rows.reduce((acc, item) => {
            const key = item.type || 'other';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const summary = {
            total: rows.length,
            loaded,
            failed,
            local,
            remote,
            inline,
            byType
        };
        console.log('[ResourceMonitor] \u8d44\u6e90\u6c47\u603b / Resource summary:', summary);
        return summary;
    }
};

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
        getWindows: () => WindowManager.windows,
        resources: {
            start: (options = {}) => ResourceMonitor.start(options),
            stop: () => ResourceMonitor.stop(),
            clear: () => ResourceMonitor.clear(),
            list: (options = {}) => ResourceMonitor.list(options),
            table: (options = {}) => ResourceMonitor.table(options),
            summary: () => ResourceMonitor.summary(),
            isRunning: () => ResourceMonitor.isRunning()
        }
    }
};

// 欢迎消息
console.log('%c欢迎使用 Fluent OS！', 'color: #0078d4; font-size: 14px; font-weight: bold;');
console.log('💡 提示: 使用 FluentOS.debug 访问调试工具');
console.log('📝 默认 PIN: 1234');
