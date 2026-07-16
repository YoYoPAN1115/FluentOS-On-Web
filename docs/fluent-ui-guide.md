# Fluent UI 开发指南

[简体中文](fluent-ui-guide.md) | [English](fluent-ui-guide-en.md)

本文说明 FluentOS-On-Web 2.0 的视觉基础、`FluentUI` 组件工厂与 `FluentWindow` 应用框架。所有接口均来自当前的 `js/core/fluent-ui.js`、`js/core/fluent-window.js` 和对应 CSS。

架构与应用注册流程见[开发者指南](DEVELOPER_GUIDE.md)。

## 设计原则

- 优先复用系统令牌和组件，不在应用内复制一套按钮、输入框或模态框。
- 组件构造函数返回真实 DOM 节点，而不是 HTML 字符串或虚拟 DOM。
- 用户内容使用 `textContent`；只有受信任模板才写入 `innerHTML`。
- 所有交互在浅色、深色、关闭模糊和关闭动画时都应清晰可用。
- 图标从 `Theme/Icon/Symbol_icon/` 读取；常规态用 `stroke`，激活态可用 `fill`。
- 布局要适应窗口缩放，而不是只适配全屏桌面。

## CSS 令牌与主题

基础令牌定义在 `css/main.css` 的 `:root`，深色主题由 `.dark-mode` 覆盖。应用样式应使用变量：

```css
.demo-panel {
    color: var(--text-primary);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    transition: transform var(--transition-normal);
}

.demo-panel:focus-within {
    border-color: var(--accent);
}
```

### 常用令牌

| 分类 | 变量 |
| --- | --- |
| 背景 | `--bg-primary`, `--bg-secondary`, `--bg-tertiary` |
| 文本 | `--text-primary`, `--text-secondary`, `--text-tertiary` |
| 强调色 | `--accent`, `--accent-hover`, `--accent-rgb`, `--accent-soft` |
| 边框/阴影 | `--border-color`, `--shadow-sm/md/lg/xl` |
| 圆角 | `--radius-sm` 8px、`--radius-md` 12px、`--radius-lg` 16px、`--radius-xl` 20px |
| 模糊 | `--blur-sm` 8px、`--blur-md` 12px、`--blur-lg` 16px |
| 动画 | `--transition-fast`, `--transition-normal`, `--transition-slow`, `--transition-spring` |

不要把浅色模式的 `#fff` 或固定蓝色写进业务组件。强调色可由用户或壁纸动态改变，`State.applyAccentColorSetting()` 会更新相关变量。

### 材质开关

系统通过 `body` 类和变量控制模糊、窗口材质、动画及 Fluent V2 外观。应用不应直接更改这些全局类。需要响应设置时监听：

```javascript
this._unsubSettings = State.on('settingsChange', (updates) => {
    if ('enableBlur' in updates || 'materialType' in updates) this.render();
}, { key: 'DemoApp.settings' });
```

动画关闭时 CSS 和窗口管理器会缩短或移除过渡。不要用无法取消的固定 `setTimeout` 作为业务状态的唯一来源。

## 图标

`FluentUI` 的图标名称对应不带扩展名的 SVG 文件：

```javascript
FluentUI.IconButton({
    icon: 'Settings',
    title: t('settings.title'),
    onClick: () => WindowManager.openApp('settings')
});

const path = FluentUI._utils.getIconPath('Home');          // stroke/Home.svg
const active = FluentUI._utils.getIconPath('Home', 'fill');
```

新增图标前先检查 `Theme/Icon/Symbol_icon/stroke` 与 `fill`。文件名区分空格和大小写；引用不存在的 fill 图标时不会自动回退。

## FluentUI 基础

`FluentUI` 是全局 DOM 工厂。大多数组件接受 `id`、`className`，并立即返回一个 `HTMLElement`：

```javascript
const panel = document.createElement('section');
panel.append(
    FluentUI.Button({ text: t('confirm'), variant: 'primary' }),
    FluentUI.Spinner({ size: 'small' })
);
this.container.replaceChildren(panel);
```

组件不会自动挂载，也不会形成响应式数据绑定。状态变化后由调用方更新 DOM 或重新渲染。

## 按钮

### Button

```javascript
const saveButton = FluentUI.Button({
    text: t('save'),
    variant: 'primary',       // primary | secondary | outline | ghost
    size: 'medium',           // small | medium | large
    icon: 'Download',
    iconPosition: 'left',     // left | right
    disabled: false,
    loading: false,
    className: 'demo-save',
    onClick: () => this.save()
});
```

设置 `loading: true` 时按钮自动禁用并显示 spinner。异步操作若要恢复状态，通常应重建按钮或直接同步其属性和内容。

### IconButton

```javascript
FluentUI.IconButton({
    icon: 'Refresh',
    title: t('refresh'),
    size: 'small',
    disabled: false,
    onClick: () => this.refresh()
});
```

纯图标按钮必须提供有意义的 `title`，必要时由调用方补充 `aria-label`。

## 输入与选择

### Input / SearchBox

```javascript
const inputWrap = FluentUI.Input({
    type: 'text',
    value: '',
    placeholder: t('demo.placeholder'),
    icon: 'Edit',
    clearable: true,
    disabled: false,
    onChange: value => this.query = value,
    onEnter: value => this.submit(value)
});

const searchWrap = FluentUI.SearchBox({
    placeholder: t('search'),
    onChange: value => this.search(value),
    onEnter: value => this.search(value)
});
```

返回值是 wrapper；原生输入框位于 `.fluent-input`。如需 `focus()`、selection 或额外 ARIA 属性，先查询内部 input。

### Select

这是自定义下拉菜单，不是原生 `<select>`：

```javascript
FluentUI.Select({
    options: [
        { value: 'light', label: t('settings.light') },
        { value: 'dark', label: t('settings.dark') }
    ],
    value: State.settings.theme,
    placeholder: t('select'),
    disabled: false,
    onChange: value => State.updateSettings({ theme: value })
});
```

### Toggle

```javascript
FluentUI.Toggle({
    checked: State.settings.enableAnimation !== false,
    label: t('settings.animation'),
    disabled: false,
    onChange: checked => State.updateSettings({ enableAnimation: checked })
});
```

Toggle 会维护 `role="switch"` 和 `aria-checked`。

### Slider

```javascript
FluentUI.Slider({
    min: 0,
    max: 100,
    step: 1,
    value: State.settings.volume,
    showValue: true,
    onChange: value => State.updateSettings({ volume: value })
});
```

回调值是数值。高频拖动中避免同步执行昂贵网络或大 DOM 重绘。

### SegmentedControl

```javascript
FluentUI.SegmentedControl({
    segments: [
        { id: 'grid', label: t('grid'), icon: 'Dashboard' },
        { id: 'list', label: t('list'), icon: 'Checklist Note' }
    ],
    activeSegment: 'grid',
    size: 'medium',
    onChange: id => this.setView(id)
});
```

## 导航组件

### NavigationBar

```javascript
FluentUI.NavigationBar({
    showBack: true,
    showForward: true,
    backDisabled: !this.canBack(),
    forwardDisabled: !this.canForward(),
    onBack: () => this.back(),
    onForward: () => this.forward(),
    center: FluentUI.Breadcrumb({ items: this.pathItems() }),
    right: FluentUI.IconButton({ icon: 'Refresh', title: t('refresh') })
});
```

`center` 和 `right` 可传字符串或 DOM 节点。外部/用户字符串不要直接作为 HTML 传入。

### ToolBar

```javascript
FluentUI.ToolBar({
    align: 'left',
    items: [
        { id: 'new', icon: 'Add', title: t('new') },
        { divider: true },
        { id: 'delete', icon: 'Trash', title: t('delete'), disabled: !this.selection }
    ],
    onItemClick: (id, item) => this.handleTool(id)
});
```

### Breadcrumb

```javascript
FluentUI.Breadcrumb({
    items: [
        { id: 'root', label: t('files.this-pc'), icon: 'Home' },
        { id: 'documents', label: t('files.documents') }
    ],
    separator: '›',
    onItemClick: (id, index) => this.navigate(id)
});
```

### TabBar

```javascript
FluentUI.TabBar({
    tabs: [
        { id: 'one', label: 'One', icon: 'Document', closable: false },
        { id: 'two', label: 'Two', icon: 'Document' }
    ],
    activeTab: 'one',
    variant: 'default',
    onTabChange: id => this.activate(id),
    onTabClose: id => this.closeTab(id),
    showAddButton: true,
    onAddTab: () => this.addTab()
});
```

## 内容与反馈

### Card

```javascript
const card = FluentUI.Card({
    title: t('demo.title'),
    content: document.createTextNode(t('demo.description')),
    hoverable: true
});
```

`content` 可传字符串或 DOM 节点；`footer` 当前只接受 HTML 字符串。字符串会作为受信任 HTML 处理，因此动态数据应先转义或改为给 `content` 传节点。需要交互式页脚时，可自行创建卡片结构或在卡片生成后挂载节点。

### List

```javascript
FluentUI.List({
    items: [
        { id: 'a', title: 'Alpha', description: 'First', icon: 'Folder', extra: '3' },
        { id: 'b', title: 'Beta', description: 'Second', icon: 'Document' }
    ],
    selectable: true,
    activeItem: 'a',
    onItemClick: (id, item) => this.open(id)
});
```

### Progress / Spinner

```javascript
const progress = FluentUI.Progress({
    value: 30,
    max: 100,
    showLabel: true,
    variant: 'default' // default | success | warning | error
});

progress.setValue(75);
const spinner = FluentUI.Spinner({ size: 'medium' });
```

### Empty

```javascript
FluentUI.Empty({
    icon: 'Folder Open',
    title: t('empty'),
    description: t('demo.empty-hint')
});
```

### SettingItem

```javascript
FluentUI.SettingItem({
    label: t('settings.animation'),
    description: t('settings.animation-desc'),
    control: FluentUI.Toggle({
        checked: State.settings.enableAnimation,
        onChange: value => State.updateSettings({ enableAnimation: value })
    })
});
```

### ScrollArea

```javascript
const scroll = FluentUI.ScrollArea({
    content: longContentElement,
    maxHeight: '420px',
    minThumbSize: 24,
    alwaysVisible: false
});
```

它提供自定义滚动条。普通应用页面若已放入 `FluentWindow` 的 `.fw-card`，通常不需要再嵌套 ScrollArea。

## 菜单和对话框

### ContextMenu

```javascript
const menu = FluentUI.ContextMenu({
    items: [
        { id: 'open', label: t('open'), icon: 'Folder Open', onClick: () => this.open() },
        { separator: true },
        { action: 'delete', label: t('delete'), icon: 'Trash', disabled: false, onClick: () => this.remove() }
    ]
});

document.body.appendChild(menu);
menu.show(pointerEvent.clientX, pointerEvent.clientY);
```

菜单项通过各自的 `onClick(item)` 执行动作。组件提供 `show(x, y)` 与 `hide()`；挂载、点击外部关闭和生命周期仍由调用方处理。

### Dialog

用于系统提示、警告和错误：

```javascript
const dialog = FluentUI.Dialog({
    type: 'warning',             // info | warning | error
    title: t('confirm'),
    content: t('demo.delete-confirm'),
    buttons: [
        { text: t('cancel'), variant: 'secondary', value: 'cancel' },
        { text: t('delete'), variant: 'primary', value: 'delete' }
    ],
    closeOnOverlay: true,
    onClose: result => {
        if (result === 'delete') this.remove();
    }
});

dialog.close('cancel');
```

按钮最多取前三个。

### InputDialog

```javascript
FluentUI.InputDialog({
    title: t('rename'),
    placeholder: t('name'),
    defaultValue: this.name,
    inputType: 'text',
    minLength: 1,
    maxLength: 80,
    validateFn: value => value.includes('/') ? t('invalid-name') : true,
    confirmText: t('confirm'),
    cancelText: t('cancel'),
    onConfirm: value => this.rename(value),
    onCancel: () => {}
});
```

`validateFn` 返回 `true` 表示通过，返回字符串会显示为错误消息。

### Modal

`Modal` 适合自定义标题、内容与按钮的通用覆盖层：

```javascript
const modal = FluentUI.Modal({
    title: t('demo.details'),
    content: detailsNode,
    width: '520px',
    closable: true,
    buttons: [{ text: t('close'), variant: 'primary' }],
    onClose: () => {}
});

modal.show();
```

### Toast 与通知中心

```javascript
const toast = FluentUI.Toast({
    title: t('saved'),
    message: t('demo.saved-message'),
    type: 'success',             // info | success | warning | error
    duration: 5000,
    icon: 'Check Circle',
    onClick: () => this.showResult()
});

toast.close();
```

Toast 是瞬时 UI，不持久化。需要出现在通知中心时使用：

```javascript
State.addNotification({
    title: t('demo.finished'),
    message: t('demo.finished-message'),
    type: 'success',
    onClickAction: { type: 'openApp', appId: 'demo', data: { page: 'result' } },
    dismissOnClick: true
});
```

## FluentWindow 应用框架

`FluentWindow` 不是系统窗口管理器。它负责“窗口内部”的侧栏、导航、高亮、页面区域、响应式折叠、侧栏搜索和滚动位置；外层窗口仍由 `WindowManager` 创建。

```javascript
this.frame = FluentWindow.mount({
    container: this.container,
    items: [
        { id: 'home', label: t('demo.home'), icon: 'Home', badge: '2' },
        { id: 'library', label: t('demo.library'), icon: 'Folder' }
    ],
    footerItems: [
        { id: 'settings', label: t('settings.title'), icon: 'Settings' }
    ],
    activeId: 'home',
    expandedWidth: 220,
    collapsedWidth: 60,
    collapseAtWidth: 720,
    preserveScrollPositions: true,
    onNavigate: (id, pageEl) => this.renderPage(id, pageEl)
});
```

`onNavigate` 在初次挂载和后续切页时调用。渲染应只操作给定 `pageEl`：

```javascript
renderPage(id, pageEl) {
    pageEl.replaceChildren();
    if (id === 'home') {
        pageEl.appendChild(this.renderHome());
    } else if (id === 'settings') {
        pageEl.appendChild(this.renderSettings());
    }
}
```

### 侧栏搜索

```javascript
this.frame = FluentWindow.mount({
    container: this.container,
    items: this.navItems,
    activeId: 'home',
    sidebarSearch: {
        enabled: true,
        placeholder: t('search'),
        resultsTitle: t('results'),
        emptyText: t('no-results'),
        loadingText: t('loading'),
        minQueryLength: 1,
        debounceMs: 180,
        search: async query => this.search(query),
        onResultClick: result => this.openResult(result),
        onResultAction: (action, result) => this.handleResultAction(action, result)
    },
    onNavigate: (id, pageEl) => this.renderPage(id, pageEl)
});
```

### 实例 API

| 方法/属性 | 用途 |
| --- | --- |
| `navigate(id, options)` | 切换页面；`preserveScroll: false` 可重置滚动 |
| `setActive(id)` | `navigate()` 的简写 |
| `refresh()` | 重新调用当前页渲染器 |
| `destroy()` | 断开 observer、监听和宿主样式；关闭应用时必须调用 |
| `saveScrollPosition()` / `restoreScrollPosition()` | 手动管理当前页滚动位置 |
| `setSidebarSearchEnabled(bool)` | 启用或隐藏侧栏搜索 |
| `setSidebarSearchResults(results, options)` | 手动设置搜索结果 |
| `clearSidebarSearch()` / `focusSidebarSearch()` | 清空或聚焦搜索框 |
| `getSidebarSearchQuery()` | 获取当前查询文本 |
| `activeId`, `pageEl`, `cardEl`, `element` | 当前状态和关键 DOM 节点 |

应用关闭时：

```javascript
beforeClose() {
    this._unsubSettings?.();
    this._unsubSettings = null;
    this.frame?.destroy();
    this.frame = null;
    return true;
}
```

## 可访问性与键盘

- 可点击元素优先使用 `<button>`，不要只给 `<div>` 绑定 click。
- 图标装饰可用空 `alt`；传达含义的图标必须有文本、`title` 或 `aria-label`。
- 模态框打开后应把焦点移入，关闭后恢复触发元素焦点。
- 自定义组件若扩展键盘行为，应支持 `Enter`/`Space`，并正确设置 role 和状态属性。
- 不覆盖系统级 `Alt` 快捷键；文本编辑区也不要拦截无关按键。
- 文本和关键边界不能只依靠半透明材质，在纯色/高亮背景上也要保持对比度。

## 响应式与性能

- 应用的最小尺寸在 `WindowManager.appConfigs` 中声明，并在该尺寸实测。
- 使用 grid/flex、`minmax()`、`overflow` 和容器宽度，不依赖屏幕绝对坐标。
- 远程图片提供加载与失败状态；大图和媒体使用 Blob/IndexedDB，及时释放 `URL.createObjectURL()`。
- 重复初始化前清理 document/window 监听、interval、observer、媒体流和未完成请求。
- `settingsChange`、slider、resize 等高频事件中进行节流，避免反复整体渲染。
- 背景窗口实现 `onTombstoneFreeze()`/`onTombstoneRestore()`，暂停动画、媒体和轮询。

## 组件选择速查

| 需求 | 首选 |
| --- | --- |
| 普通操作/主操作 | `Button` |
| 无文本工具操作 | `IconButton` / `ToolBar` |
| 布尔设置 | `Toggle` + `SettingItem` |
| 少量互斥视图 | `SegmentedControl` |
| 多文档切换 | `TabBar` |
| 应用分区导航 | `FluentWindow` |
| 短暂操作反馈 | `Toast` |
| 可追溯系统消息 | `State.addNotification()` |
| 危险操作确认 | `Dialog` |
| 获取单个短文本 | `InputDialog` |
| 空列表提示 | `Empty` |
| 非确定等待 | `Spinner` |
| 确定进度 | `Progress` |

新增组件前先搜索现有应用。这个项目的视觉一致性主要来自复用，而不是继续增加近似但不兼容的控件。
