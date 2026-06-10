/**
 * 新设置 (预览) - Settings (New)
 * ===================================================================
 * 这是一个基于全新 FluentWindow 框架的「设置」App 复刻预览版。
 * 旧设置 App (SettingsApp) 保持不动。
 *
 * 当前阶段：不接入任何真实设置项，仅用于预览新窗口框架的视觉与动效
 * (侧边栏自适应收起/展开、页面切换淡入淡出、纯白圆角内容卡片)。
 *
 * 整个布局逻辑都委托给 FluentWindow，本文件只负责声明导航项与各页面占位内容。
 */
const SettingsNewApp = {
    windowId: null,
    container: null,
    frame: null,

    pages: [
        { id: 'home', label: '主页', icon: 'Home' },
        { id: 'system', label: '系统', icon: 'Dashboard Check' },
        { id: 'network', label: '网络和 Internet', icon: 'Globe' },
        { id: 'personalization', label: '个性化', icon: 'Color Picker' },
        { id: 'apps', label: '应用', icon: 'Inbox Download' },
        { id: 'accounts', label: '账户', icon: 'User Circle' },
        { id: 'time', label: '时间和语言', icon: 'Clock' },
        { id: 'privacy', label: '隐私和安全性', icon: 'Lock' },
        { id: 'about', label: '关于', icon: 'Information Circle' }
    ],

    init(windowId) {
        this.windowId = windowId || `window-${Date.now()}`;
        this.container = document.getElementById(`${this.windowId}-content`);
        if (!this.container) return;

        if (typeof FluentWindow === 'undefined') {
            this.container.innerHTML = '<div style="padding:24px">FluentWindow 框架未加载</div>';
            return;
        }

        this.frame = FluentWindow.mount({
            container: this.container,
            items: this.pages,
            activeId: 'home',
            onNavigate: (pageId, pageEl) => this.renderPage(pageId, pageEl)
        });
    },

    renderPage(pageId, pageEl) {
        const page = this.pages.find(p => p.id === pageId) || { label: pageId };
        // 预览阶段：仅渲染标题 + 占位说明，不含任何真实选项
        const wrap = document.createElement('div');
        wrap.className = 'settingsnew-page';

        const title = document.createElement('h1');
        title.className = 'settingsnew-title';
        title.textContent = page.label;
        wrap.appendChild(title);

        const subtitle = document.createElement('p');
        subtitle.className = 'settingsnew-subtitle';
        subtitle.textContent = '全新 FluentWindow 框架预览 · 暂未接入任何选项';
        wrap.appendChild(subtitle);

        // 占位卡片，便于直观查看白色卡片 + 页面切换动效
        const grid = document.createElement('div');
        grid.className = 'settingsnew-grid';
        for (let i = 0; i < 3; i++) {
            const ph = document.createElement('div');
            ph.className = 'settingsnew-placeholder';
            grid.appendChild(ph);
        }
        wrap.appendChild(grid);

        pageEl.appendChild(wrap);
        this.ensureStyles();
    },

    ensureStyles() {
        if (document.getElementById('settingsnew-styles')) return;
        const style = document.createElement('style');
        style.id = 'settingsnew-styles';
        style.textContent = `
            .settingsnew-page { max-width: 720px; }
            .settingsnew-title {
                font-size: 26px;
                font-weight: 600;
                margin: 0 0 6px;
                color: var(--text-primary, #1f1f1f);
            }
            .settingsnew-subtitle {
                font-size: 13px;
                margin: 0 0 24px;
                color: var(--text-tertiary, #6b6b6b);
            }
            .settingsnew-grid {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .settingsnew-placeholder {
                height: 64px;
                border-radius: 10px;
                background: rgba(0, 0, 0, 0.035);
            }
            .dark-mode .settingsnew-placeholder {
                background: rgba(255, 255, 255, 0.05);
            }
        `;
        document.head.appendChild(style);
    },

    beforeClose() {
        if (this.frame && typeof this.frame.destroy === 'function') {
            this.frame.destroy();
        }
        this.frame = null;
        this.container = null;
        return true;
    }
};

if (typeof window !== 'undefined') window.SettingsNewApp = SettingsNewApp;
