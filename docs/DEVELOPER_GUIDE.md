# Fluent OS 开发指南

> 版本 1.0.0 | 为 App Shop 应用开发准备

---

## 目录

1. [系统架构概览](#系统架构概览)
2. [核心 API](#核心-api)
3. [FluentUI 组件库](#fluentui-组件库)
4. [窗口管理](#窗口管理)
5. [状态管理](#状态管理)
6. [文件系统](#文件系统)
7. [国际化](#国际化)
8. [主题与样式](#主题与样式)
9. [应用开发规范](#应用开发规范)
10. [最佳实践](#最佳实践)

---

## 系统架构概览

```
Fluent OS
├── js/
│   ├── core/           # 核心模块
│   │   ├── state.js    # 状态管理
│   │   ├── fluent-ui.js # UI 组件库
│   │   └── i18n.js     # 国际化
│   ├── ui/             # 系统 UI
│   │   ├── desktop.js  # 桌面
│   │   ├── taskbar.js  # 任务栏
│   │   ├── windowmanager.js # 窗口管理器
│   │   └── controlcenter.js # 控制中心
│   └── apps/           # 系统应用
├── css/
│   ├── main.css        # 主样式
│   └── fluent-ui.css   # 组件样式
└── Theme/              # 主题资源
    ├── Icon/           # 图标
    └── Picture/        # 壁纸
```

---

## 核心 API

### State（状态管理）

全局状态对象，管理系统设置、文件系统和事件。

```javascript
// 读取设置
const theme = State.settings.theme;           // 'light' | 'dark' | 'auto'
const language = State.settings.language;     // 'zh-CN' | 'en-US'
const blur = State.settings.enableBlur;       // boolean
const animation = State.settings.enableAnimation; // boolean
const fluentV2 = State.settings.enableFluentV2;   // boolean

// 更新设置
State.updateSettings({ theme: 'dark' });
State.updateSettings({ enableBlur: true, enableAnimation: true });

// 应用主题
State.applyTheme();

// 事件监听
State.on('settingsChange', (changes) => {
    console.log('设置已更改:', changes);
});

State.on('languageChange', () => {
    // 重新渲染界面
});

State.on('fsChange', () => {
    // 文件系统变更
});
```

### 常用设置项

| 设置项 | 类型 | 说明 |
|--------|------|------|
| `theme` | string | 主题：`light` / `dark` / `auto` |
| `language` | string | 语言：`zh-CN` / `en-US` |
| `enableBlur` | boolean | 启用模糊效果 |
| `enableAnimation` | boolean | 启用动画 |
| `enableFluentV2` | boolean | 启用新版 UI |
| `enableWindowBlur` | boolean | 窗口毛玻璃效果 |
| `wallpaperDesktop` | string | 桌面壁纸路径 |
| `bluetoothEnabled` | boolean | 蓝牙开关 |
| `locationEnabled` | boolean | 位置服务 |
| `pin` | string | 锁屏 PIN |

---

## FluentUI 组件库

### 按钮 (Button)

```javascript
// 基础按钮
FluentUI.Button({
    text: '确定',
    variant: 'primary',    // 'primary' | 'secondary' | 'outline' | 'ghost'
    size: 'medium',        // 'small' | 'medium' | 'large'
    icon: 'Checkmark',     // 图标名称（可选）
    iconPosition: 'left',  // 'left' | 'right'
    disabled: false,
    loading: false,
    onClick: () => { /* 点击回调 */ }
});

// 图标按钮
FluentUI.IconButton({
    icon: 'Settings',
    title: '设置',
    size: 'medium',
    onClick: () => {}
});
```

### 开关 (Toggle)

```javascript
FluentUI.Toggle({
    checked: true,
    disabled: false,
    onChange: (value) => {
        console.log('开关状态:', value); // boolean
    }
});
```

### 下拉选择 (Select)

```javascript
FluentUI.Select({
    options: [
        { value: 'light', label: '浅色' },
        { value: 'dark', label: '深色' },
        { value: 'auto', label: '跟随系统' }
    ],
    value: 'light',
    placeholder: '请选择',
    onChange: (value) => {
        console.log('选中:', value);
    }
});
```

### 滑块 (Slider)

```javascript
FluentUI.Slider({
    min: 0,
    max: 100,
    value: 50,
    step: 1,
    showValue: true,
    onChange: (value) => {
        console.log('当前值:', value);
    }
});
```

### 输入框 (Input)

```javascript
FluentUI.Input({
    value: '',
    placeholder: '请输入...',
    type: 'text',          // 'text' | 'password' | 'number'
    disabled: false,
    onChange: (value) => {},
    onEnter: (value) => {}
});

// 搜索框
FluentUI.SearchBox({
    placeholder: '搜索...',
    onSearch: (query) => {}
});
```

### 设置项 (SettingItem)

```javascript
FluentUI.SettingItem({
    label: '深色模式',
    description: '在夜间使用深色主题保护眼睛',
    control: FluentUI.Toggle({
        checked: State.settings.theme === 'dark',
        onChange: (v) => State.updateSettings({ theme: v ? 'dark' : 'light' })
    })
});
```

### 对话框 (Dialog)

```javascript
// 警告/提示/错误对话框
FluentUI.Dialog({
    type: 'info',          // 'info' | 'warning' | 'error'
    title: '提示',          // 可选，默认根据类型显示
    content: '确定要执行此操作吗？',
    buttons: [
        { text: '取消', variant: 'secondary', value: 'cancel' },
        { text: '确定', variant: 'primary', value: 'ok' }
    ],
    closeOnOverlay: true,  // 点击遮罩关闭
    onClose: (result) => {
        // result 为点击按钮的 value
        if (result === 'ok') {
            // 执行操作
        }
    }
});
```

### 输入对话框 (InputDialog)

```javascript
FluentUI.InputDialog({
    title: '重命名',
    placeholder: '输入新名称',
    defaultValue: 'old-name',
    inputType: 'text',     // 'text' | 'password' | 'number'
    minLength: 1,
    maxLength: 50,
    validateFn: (value) => {
        if (!value) return '名称不能为空';
        if (value.includes('/')) return '名称不能包含 /';
        return true;       // 返回 true 表示验证通过
    },
    confirmText: '确定',
    cancelText: '取消',
    closeOnOverlay: true,
    onConfirm: (value) => {
        console.log('输入值:', value);
    },
    onCancel: () => {
        console.log('已取消');
    }
});
```

### 通知 (Toast)

```javascript
FluentUI.Toast({
    title: '保存成功',
    message: '文件已保存到本地',
    type: 'success',       // 'info' | 'success' | 'warning' | 'error'
    duration: 5000,        // 显示时长（毫秒），0 表示不自动关闭
    onClick: () => {}      // 点击通知回调（可选）
});

// 返回对象可手动关闭
const toast = FluentUI.Toast({ ... });
toast.close();
```

### 进度条 (Progress)

```javascript
const progress = FluentUI.Progress({
    value: 50,
    max: 100,
    variant: 'default',    // 'default' | 'success' | 'warning' | 'error'
    showLabel: true
});

// 更新进度
progress.setValue(75);
```

### 列表 (List)

```javascript
FluentUI.List({
    items: [
        { id: '1', title: '项目1', description: '描述', icon: 'Folder' },
        { id: '2', title: '项目2', description: '描述', icon: 'Document' }
    ],
    onItemClick: (item) => {
        console.log('点击:', item.id);
    }
});
```

### 卡片 (Card)

```javascript
FluentUI.Card({
    title: '卡片标题',
    content: '卡片内容',
    footer: FluentUI.Button({ text: '操作' }),
    onClick: () => {}
});
```

### 标签栏 (TabBar)

```javascript
FluentUI.TabBar({
    tabs: [
        { id: 'tab1', label: '标签1', icon: 'Home' },
        { id: 'tab2', label: '标签2', icon: 'Settings' }
    ],
    activeTab: 'tab1',
    onTabChange: (tabId) => {},
    onTabClose: (tabId) => {},
    showAddButton: true,
    onAddTab: () => {}
});
```

### 侧边栏 (Sidebar)

```javascript
FluentUI.Sidebar({
    items: [
        { id: 'home', label: '首页', icon: 'Home' },
        { id: 'settings', label: '设置', icon: 'Settings' }
    ],
    activeItem: 'home',
    onItemClick: (itemId) => {}
});
```

### 右键菜单 (ContextMenu)

```javascript
FluentUI.ContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
        { id: 'open', label: '打开', icon: 'Folder Open' },
        { type: 'separator' },
        { id: 'delete', label: '删除', icon: 'Trash', danger: true }
    ],
    onItemClick: (itemId) => {}
});
```

### 空状态 (Empty)

```javascript
FluentUI.Empty({
    icon: 'Inbox',
    title: '暂无数据',
    description: '还没有任何内容'
});
```

### 加载指示器 (Spinner)

```javascript
FluentUI.Spinner({
    size: 'medium'         // 'small' | 'medium' | 'large'
});
```

---

## 窗口管理

### WindowManager

```javascript
// 打开应用
WindowManager.openApp('appId', {
    // 传递给应用的参数
    fileId: 'xxx'
});

// 关闭窗口
WindowManager.closeWindow(windowId);

// 最小化窗口
WindowManager.minimizeWindow(windowId);

// 最大化窗口
WindowManager.maximizeWindow(windowId);

// 获取活动窗口
const activeWindow = WindowManager.getActiveWindow();
```

### 系统应用 ID

| 应用 ID | 说明 |
|---------|------|
| `settings` | 设置 |
| `files` | 文件管理器 |
| `browser` | 浏览器 |
| `notes` | 记事本 |
| `calculator` | 计算器 |
| `clock` | 时钟 |
| `photos` | 照片 |
| `music` | 音乐 |
| `weather` | 天气 |
| `camera` | 相机 |

---

## 文件系统

### 文件节点结构

```javascript
{
    id: 'unique-id',
    name: '文件名',
    type: 'file',          // 'file' | 'folder' | 'app'
    icon: 'Document',      // 图标名称
    modified: '2024-01-01T00:00:00.000Z',
    content: '文件内容',   // 仅文件
    children: [],          // 仅文件夹
    appId: 'settings'      // 仅应用快捷方式
}
```

### 文件操作 API

```javascript
// 查找节点
const node = State.findNode('node-id');

// 更新文件系统
State.updateFS(State.fs);

// 特殊文件夹 ID
// 'desktop' - 桌面
// 'documents' - 文档
// 'pictures' - 图片
// 'music' - 音乐
// 'recycle' - 回收站
```

---

## 国际化

### 使用方式

```javascript
// 获取翻译文本
const text = t('settings.theme');

// 带默认值
const text = t('settings.custom-key') || '默认文本';

// 切换语言
State.updateSettings({ language: 'en-US' });
```

### 添加翻译

在 `js/core/i18n.js` 中添加：

```javascript
const translations = {
    'zh-CN': {
        'app.title': '应用标题',
        'app.description': '应用描述'
    },
    'en-US': {
        'app.title': 'App Title',
        'app.description': 'App Description'
    }
};
```

---

## 主题与样式

### CSS 变量

```css
/* 颜色 */
--accent: #0078d4;              /* 主题色 */
--bg-primary: #ffffff;          /* 主背景 */
--bg-secondary: #f5f5f5;        /* 次背景 */
--bg-tertiary: #e5e5e5;         /* 第三背景 */
--text-primary: #1a1a1a;        /* 主文字 */
--text-secondary: #666666;      /* 次文字 */
--text-tertiary: #999999;       /* 第三文字 */
--border-color: rgba(0,0,0,0.1); /* 边框色 */

/* 圆角 */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;

/* 过渡 */
--transition-fast: 0.15s ease;
--transition-normal: 0.25s ease;
--transition-slow: 0.4s ease;

/* V2 模式专用 */
--v2-blur: 40px;
--v2-blur-light: 20px;
--v2-glass-bg: rgba(255, 255, 255, 0.6);
--v2-glass-bg-dark: rgba(30, 30, 30, 0.7);
--v2-glass-border: rgba(255, 255, 255, 0.3);
```

### 深色模式适配

```css
/* 自动适配深色模式 */
.my-element {
    background: var(--bg-primary);
    color: var(--text-primary);
}

/* 深色模式特定样式 */
.dark-mode .my-element {
    /* 深色模式样式 */
}

/* V2 模式适配 */
body.fluent-v2 .my-element {
    backdrop-filter: blur(20px);
}

body.fluent-v2.dark-mode .my-element {
    /* V2 深色模式 */
}
```

### 图标使用

```javascript
// 获取图标路径
const iconPath = FluentUI._utils.getIconPath('Settings');
// 结果: 'Theme/Icon/Symbol_icon/stroke/Settings.svg'

// 在 HTML 中使用
`<img src="Theme/Icon/Symbol_icon/stroke/Settings.svg" alt="设置">`
```

### 常用图标名称

| 图标名称 | 说明 |
|----------|------|
| `Home` | 首页 |
| `Settings` | 设置 |
| `Folder` | 文件夹 |
| `Document` | 文档 |
| `Trash` | 删除 |
| `Edit` | 编辑 |
| `Plus Circle` | 添加 |
| `Cancel` | 关闭/取消 |
| `Checkmark` | 确认 |
| `Information Circle` | 信息 |
| `Exclamation Triangle` | 警告 |
| `Cancel Circle` | 错误 |
| `Search` | 搜索 |
| `Arrow Left/Right/Up/Down` | 箭头 |

---

## 应用开发规范

### 应用结构

```javascript
const MyApp = {
    windowId: null,
    container: null,
    
    // 初始化（必需）
    init(windowId) {
        this.windowId = windowId;
        this.container = document.getElementById(`${windowId}-content`);
        this.render();
        
        // 监听设置变化
        State.on('settingsChange', () => this.onSettingsChange());
        State.on('languageChange', () => this.render());
    },
    
    // 渲染界面（必需）
    render() {
        this.container.innerHTML = `
            <div class="my-app">
                <!-- 应用内容 -->
            </div>
        `;
        this.bindEvents();
    },
    
    // 绑定事件
    bindEvents() {
        // 事件绑定逻辑
    },
    
    // 设置变化回调
    onSettingsChange() {
        // 响应设置变化
    },
    
    // 清理（可选）
    destroy() {
        // 清理资源
    }
};

// 注册到全局
window.MyApp = MyApp;
```

### 注册应用

在 `WindowManager` 中注册：

```javascript
// js/ui/windowmanager.js
const appList = {
    myapp: {
        title: '我的应用',
        icon: 'Theme/Icon/apps/myapp.svg',
        width: 800,
        height: 600,
        minWidth: 400,
        minHeight: 300,
        init: (windowId) => MyApp.init(windowId)
    }
};
```

---

## 最佳实践

### 1. 使用系统组件

```javascript
// ✅ 推荐：使用 FluentUI 组件
FluentUI.Dialog({
    type: 'warning',
    content: '确定删除？',
    buttons: [
        { text: '取消', variant: 'secondary', value: false },
        { text: '删除', variant: 'primary', value: true }
    ],
    onClose: (result) => { if (result) doDelete(); }
});

// ❌ 避免：使用原生 API
if (confirm('确定删除？')) doDelete();
```

### 2. 使用 InputDialog 替代 prompt

```javascript
// ✅ 推荐
FluentUI.InputDialog({
    title: '重命名',
    defaultValue: oldName,
    onConfirm: (newName) => rename(newName)
});

// ❌ 避免
const newName = prompt('重命名', oldName);
```

### 3. 使用 Toast 通知

```javascript
// ✅ 推荐：操作反馈
FluentUI.Toast({
    title: '保存成功',
    message: '文件已保存',
    type: 'success'
});

// ❌ 避免
alert('保存成功');
```

### 4. 响应式设计

```javascript
// 监听设置变化
State.on('settingsChange', (changes) => {
    if (changes.theme) {
        // 响应主题变化
    }
    if (changes.language) {
        // 响应语言变化
    }
});
```

### 5. 使用 CSS 变量

```css
/* ✅ 推荐：使用变量 */
.my-element {
    background: var(--bg-primary);
    color: var(--text-primary);
    border-radius: var(--radius-md);
}

/* ❌ 避免：硬编码 */
.my-element {
    background: #ffffff;
    color: #000000;
}
```

### 6. 国际化

```javascript
// ✅ 推荐：使用翻译函数
const title = t('app.title') || '默认标题';

// ❌ 避免：硬编码文本
const title = '应用标题';
```

---

## 附录：完整组件示例

### 设置页面示例

```javascript
renderSettings(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    
    // 标题
    const title = document.createElement('h3');
    title.textContent = t('settings.appearance');
    section.appendChild(title);
    
    // 主题设置
    section.appendChild(FluentUI.SettingItem({
        label: t('settings.theme'),
        description: t('settings.theme.desc'),
        control: FluentUI.Select({
            options: [
                { value: 'light', label: t('settings.theme.light') },
                { value: 'dark', label: t('settings.theme.dark') },
                { value: 'auto', label: t('settings.theme.auto') }
            ],
            value: State.settings.theme,
            onChange: (v) => {
                State.updateSettings({ theme: v });
                State.applyTheme();
                FluentUI.Toast({
                    title: t('settings.theme'),
                    message: t('settings.theme.changed'),
                    type: 'success'
                });
            }
        })
    }));
    
    container.appendChild(section);
}
```

---

## App Shop 与 PWA 应用

### 添加新的 PWA 应用

在 `js/apps/appshop.js` 的 `apps` 数组中添加：

```javascript
{
    id: 'my-app',           // 唯一标识
    name: '我的应用',        // 显示名称
    category: 'tools',      // 分类 ID
    icon: 'my_app.png',     // Theme/Icon/App_icon/ 下的图标
    developer: 'Developer', // 开发者名称
    rating: 4.5,            // 评分
    downloads: '100万+',    // 下载量
    featured: false,        // 是否精选
    isPWA: true,            // PWA 应用标记
    url: 'https://example.com/'  // 网页 URL
}
```

### 可用分类

| 分类 ID | 名称 |
|---------|------|
| `music` | 音乐 |
| `video` | 视频 |
| `social` | 社交 |
| `shopping` | 购物 |
| `tools` | 工具 |
| `office` | 办公 |
| `lifestyle` | 生活 |

### 已安装应用 API

```javascript
// 获取已安装应用列表
const apps = AppShop.getInstalledApps();

// 检查应用是否已安装
const isInstalled = AppShop.isInstalled('app-id');

// 卸载应用
AppShop.uninstallApp('app-id');
```

---

*文档最后更新: 2025.11.26*
