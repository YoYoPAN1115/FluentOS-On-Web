# FluentOS-On-Web 2.0 开发者指南

[简体中文](DEVELOPER_GUIDE.md) | [English](DEVELOPER_GUIDE_EN.md)

本文面向需要理解、调试或扩展 FluentOS-On-Web 的开发者。当前代码是传统浏览器脚本架构：没有 npm 运行时依赖、ES Module、构建产物或前端框架，模块通过 `index.html` 按顺序加载并把对象放到全局作用域。

使用说明见[项目 README](../README.md)，视觉和组件细节见 [Fluent UI 指南](fluent-ui-guide.md)。

## 1. 运行与开发基线

在仓库根目录启动静态服务器：

```powershell
python -m http.server 8000
# 或
npx http-server . -p 8000
```

打开 <http://localhost:8000/>，并使用浏览器开发者工具调试。不要以 `file://` 作为开发基线：资源预载、远程请求、摄像头、剪贴板和文件选择器会表现不同。

项目没有 npm 测试运行器或 lint 配置，但提供统一的静态校验脚本。它检查 HTML 入口、重复 ID、本地资源引用、无入口的 JavaScript/CSS、两份生成清单，以及 Node.js 可用时的 JavaScript 语法：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-project.ps1
```

修改 `index.html`、`js/`、`css/` 或 `Theme/` 下的运行时资源后，先生成包含内容哈希的 resource manifest，再生成会记录前者文件大小的 storage manifest：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\generate-resource-manifest.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\generate-storage-manifest.ps1
```

两个生成脚本都支持 `-Check`，用于只验证现有输出而不写文件；统一校验脚本会自动以该模式检查两份清单。两份清单均为生成文件，不应手工编辑。

## 2. 架构总览

```text
index.html
  ├─ core: CSP → Storage → State → I18n → 通用服务/组件
  ├─ ui: Boot/OOBE → 锁屏/登录 → 桌面/面板 → WindowManager → Widgets
  ├─ apps: 14 个默认桌面原生应用；另含默认隐藏的 Developer Center
  ├─ third_parts_apps: PWALoader 与目录
  ├─ AppShop / Fingo
  └─ main.js: 初始化、视图切换、快捷键、FluentOS API
```

### 目录职责

| 目录 | 职责 |
| --- | --- |
| `js/core/` | 存储、全局状态、国际化、文件导入、收藏、FluentUI/FluentWindow、Fingo、灵翼和资源清单 |
| `js/ui/` | 系统级屏幕与外壳：启动、OOBE、桌面、任务栏、开始菜单、控制/通知中心、任务视图、窗口和小组件 |
| `js/apps/` | 原生应用组件；每个应用由 `WindowManager` 挂载到窗口内容区 |
| `js/third_parts_apps/` | iframe Web/PWA 注册器与应用目录 |
| `css/` | 基础令牌、系统外壳、组件、应用共享样式及各大型界面样式 |
| `Theme/` | 图标、壁纸、头像、预载资源和插图 |

### 脚本加载顺序

全局对象有真实的先后依赖。例如 `State` 依赖 `Storage`，应用依赖 `FluentUI`、`FluentWindow`、`WindowManager` 和 `t()`，`main.js` 则负责把所有对象初始化起来。因此：

- 新核心脚本应放在首个使用它的脚本之前。
- 新原生应用脚本应在 `js/ui/window.js` 之后、`js/main.js` 之前加载。
- `js/core/csp.js` 必须尽可能早加载，才能在其他资源执行前恢复严格 CSP。
- 不要使用 `defer`、`async` 或随意重排脚本，除非同时消除对应的全局依赖。

## 3. 启动与视图生命周期

`State.view` 的主要值为 `boot`、`lock`、`login` 和 `desktop`。`main.js` 监听 `viewChange` 并切换对应屏幕。

首次访问时，OOBE 根据自己的持久化标记决定是否显示；完成后进入系统流程。正常启动由 `BootScreen` 预载资源并进入锁屏。锁屏交互进入登录页，PIN 校验成功后进入桌面。

```javascript
State.setView('desktop');
State.lock();
State.logout();
State.restart();
State.shutdown();
```

这些 API 操作的是 Web UI 状态，不会控制宿主计算机。

## 4. Storage 与 State

### Storage

`Storage` 是 `localStorage` 的 JSON 包装器：

```javascript
const settings = Storage.get(Storage.keys.SETTINGS, {});
Storage.set(Storage.keys.SETTINGS, settings);
Storage.remove('my.module.key');
```

核心键：

```javascript
Storage.keys.SETTINGS;       // fluentos.settings
Storage.keys.SESSION;        // fluentos.session
Storage.keys.FS;             // fluentos.fs
Storage.keys.DESKTOP_LAYOUT; // fluentos.desktopLayout
Storage.keys.APP_USAGE;      // fluentos.appUsage
Storage.keys.NOTIFICATIONS;  // fluentos.notifications
```

`Storage.clear()` 清空当前源的全部 `localStorage`，不只删除上述核心键。不要在普通业务流程调用它。

虚拟文件系统会过滤过大的 Data URL：图片约超过 128 KiB、其他内联数据约超过 2 MiB 时可能移除内容并标记节点。照片和媒体等大对象应写入 IndexedDB/Blob 存储，而不是继续塞入 `fluentos.fs`。

### State

`State` 是运行时唯一状态源，初始化时从 `Storage` 恢复数据：

```javascript
State.settings;
State.session;
State.fs;
State.desktopLayout;
State.notifications;
State.runningApps;
```

更新设置时必须调用 `updateSettings()`，不要只改对象字段；该方法会保存数据、应用主题/材质等副作用并发出事件。

```javascript
State.updateSettings({
    theme: 'dark',
    accentColor: '#7c3aed',
    enableAnimation: true
});
```

常用设置包括：

| 字段 | 说明 |
| --- | --- |
| `theme` | `light`、`dark` 或现有界面支持的自动策略 |
| `language` | 当前实现使用 `zh` / `en` |
| `wallpaperDesktop`, `wallpaperLock` | 桌面与锁屏壁纸 URL/Data URL |
| `enableBlur`, `enableWindowBlur` | 系统材质与窗口模糊 |
| `materialType`, `blurIntensity` | 材质类型和模糊强度 |
| `enableAnimation`, `enableButtonGlowEffect` | 动效和按钮光效 |
| `accentColor`, `accentColorAuto` | 手动强调色和壁纸自动取色 |
| `quickWindowSwitchEnabled` | `Alt+C` 应用切换器 |
| `windowEdgeSnapEnabled`, `windowHoverSnapEnabled` | 窗口贴靠能力 |
| `tombstoneBackgroundEnabled`, `tombstoneFreezeDelayMs` | 后台窗口冻结策略 |
| `startPinnedApps` | 开始菜单固定应用 ID 列表 |
| `enableExternalFileImport` | 是否允许外部文件导入虚拟文件系统 |
| `strictCspEnabled` | 运行时严格 CSP |

### 事件总线

```javascript
const unsubscribe = State.on('settingsChange', (updates) => {
    if ('accentColor' in updates) render();
}, { key: 'MyApp.settings' });

State.once('languageChange', () => render());
State.emit('myEvent', { value: 1 });
unsubscribe();
```

常见系统事件有 `viewChange`、`settingsChange`、`languageChange`、`fsChange`、`notificationAdd`、`notificationRemove`、`notificationsClear`、`appStart`、`appStop`、`appUsageChange`、`weatherDataUpdate` 和 `clockEventsUpdate`。

为长期存在或会重复初始化的组件提供稳定 `key`，并在关闭时退订，避免监听器叠加。

### 虚拟文件系统

标准根目录包含 `desktop`、`documents`、`pictures`、`downloads` 和 `recycle`。使用状态 API 查找和提交修改：

```javascript
const documents = State.findNode('documents');
const parent = State.findParentNode('some-node-id');

const nextFS = structuredClone(State.fs);
// 修改 nextFS...
State.updateFS(nextFS); // 保存并触发 fsChange
```

如果直接修改 `State.fs`，仍应调用 `State.updateFS(State.fs)` 完成持久化和通知。文件 ID 必须全局唯一；删除到回收站时保留 `_recycle.originalParentId`，以便恢复。

## 5. 国际化

翻译表位于 `js/core/i18n.js`，当前语言键为 `zh` 和 `en`：

```javascript
const title = t('settings.title');
const message = t('settings.wallpaper-changed', { type: 'desktop' });
I18n.setLanguage('en');
```

新增用户可见文本时：

1. 在中英文翻译表加入相同键。
2. 渲染时调用 `t(key, params)`，不要缓存语言相关字符串。
3. 应用监听 `languageChange` 并重新渲染或更新文本。
4. `WindowManager.appConfigs` 优先使用 `titleKey`，窗口标题会自动更新。

缺失翻译会回退到中文，仍缺失时直接显示键名。

## 6. 窗口管理

`WindowManager` 负责窗口创建、聚焦、最小化、最大化、调整尺寸、贴靠、任务栏同步、位置记忆及后台冻结。一个应用 ID 默认只保留一个窗口。

```javascript
WindowManager.openApp('notes');
WindowManager.openApp('notes', { fileId: 'file-123' });
WindowManager.toggleWindow('notes');
WindowManager.closeWindow(windowId);
```

应用配置位于 `WindowManager.appConfigs`：

```javascript
WindowManager.appConfigs.demo = {
    titleKey: 'demo.title',
    icon: 'Theme/Icon/App_icon/demo.png',
    width: 860,
    height: 600,
    minWidth: 520,
    minHeight: 360,
    component: 'DemoApp'
};
```

原生组件可实现以下生命周期钩子：

| 方法 | 调用时机 |
| --- | --- |
| `init(windowId)` | 首次创建窗口后；内容容器 ID 为 `${windowId}-content` |
| `loadFile(fileId)` | `openApp(id, { fileId })` 时优先调用 |
| `openData(data)` | 传入其他打开参数时调用 |
| `beforeClose()` | 关闭前调用；返回 `false` 取消，或返回解析为布尔值的 Promise |
| `onTombstoneFreeze(windowData)` | 后台冻结时暂停计时器、媒体或网络工作 |
| `onTombstoneRestore(windowData)` | 窗口恢复时继续工作并刷新过期内容 |

不会取消关闭的应用可在 `beforeClose()` 中解绑全局事件、断开 `ResizeObserver`、停止媒体流并销毁 `FluentWindow` 实例。若应用可能返回 `false`，则应先完成确认，只在确定关闭后执行这些清理。

## 7. 新增原生应用

### 7.1 创建组件

在 `js/apps/demo.js` 中定义全局组件：

```javascript
const DemoApp = {
    windowId: null,
    container: null,
    frame: null,

    init(windowId) {
        this.windowId = windowId;
        this.container = document.getElementById(`${windowId}-content`);
        this.render();
    },

    render() {
        this.container.replaceChildren(
            FluentUI.Card({ title: t('demo.title'), content: t('demo.welcome') })
        );
    },

    openData(data = {}) {
        // 已打开时接收新的启动参数
    },

    beforeClose() {
        this.frame?.destroy();
        this.frame = null;
        return true;
    }
};

window.DemoApp = DemoApp;
```

应用对象是单例；不要假设同一组件存在多个并行实例。

### 7.2 注册与加载

1. 在 `WindowManager.appConfigs` 添加配置。
2. 在 `Desktop.apps` 添加可用应用元数据。
3. 需要默认固定时，将 ID 加入设置默认值 `startPinnedApps`，并按需要更新任务栏/应用商店逻辑。
4. 在 `index.html` 的应用脚本区域引入 `js/apps/demo.js`。
5. 添加应用图标、翻译键及必要样式。

不要只修改桌面图标列表：窗口配置缺失时 `openApp()` 会拒绝启动。

### 7.3 使用应用内部导航框架

复杂应用优先使用 `FluentWindow.mount()`：

```javascript
this.frame = FluentWindow.mount({
    container: this.container,
    items: [
        { id: 'home', label: t('demo.home'), icon: 'Home' },
        { id: 'history', label: t('demo.history'), icon: 'Clock' }
    ],
    footerItems: [
        { id: 'settings', label: t('settings.title'), icon: 'Settings' }
    ],
    activeId: 'home',
    preserveScrollPositions: true,
    onNavigate: (id, pageEl) => this.renderPage(id, pageEl)
});
```

实例公开 `navigate()`、`setActive()`、`refresh()`、`destroy()`、滚动位置方法和侧栏搜索方法。完整示例见 [Fluent UI 指南](fluent-ui-guide.md#fluentwindow-应用框架)。

## 8. 小组件

定义集中在 `js/ui/widget-defs.js`，布局和交互由 `js/ui/widgets.js` 管理。`WidgetDefs` 按应用分组，每个 variant 描述尺寸、主题和渲染器：

```javascript
{
    id: 'demo-small',
    w: 2,
    h: 2,
    sizeKey: 'widgets.size.small',
    theme: 'w-demo',
    defaultSettings: { mode: 'compact' },
    render(body, ctx) {
        body.textContent = ctx.instance.settings.mode;
    },
    onClick(ctx) {
        WindowManager.openApp('demo');
    },
    getMenu(ctx) {
        return [{ label: t('refresh'), action: () => ctx.setSettings({ updatedAt: Date.now() }) }];
    }
}
```

异步数据使用已有 `WidgetData.get()`/`getJSON()` 做 TTL 缓存，并通过 `wAsync()` 提供加载与失败状态。渲染器创建的 interval、observer 或监听器必须随 DOM 移除而停止。

## 9. 第三方 Web/PWA 应用

`PWALoader.register()` 把 URL 包装成窗口组件：

```javascript
PWALoader.register({
    id: 'example',
    name: 'Example',
    icon: 'example.png',
    url: 'https://example.com/',
    width: 1100,
    height: 760
});
```

目录项维护在 `js/third_parts_apps/pwa-catalog.js`。注册后还需通过 App Shop 安装流程加入窗口、桌面和固定列表。

只有与源码目录中的 ID 和 URL 精确匹配的目录条目，以及在 Developer Center 中声明并获批 `storage.local` 权限的 PWA，才会在 iframe sandbox 中获得 `allow-same-origin`。这让 PWA 能使用其网站来源自己的 `localStorage`、登录态等同源数据。其他 PWA 使用不含 `allow-same-origin` 的不透明来源；直接调用 `PWALoader.register()` 不能扩大该权限。

限制必须在产品设计中明确：跨域 iframe 的 DOM 不可读取；站点可能拒绝嵌入；登录 Cookie、弹窗、下载、媒体自动播放和权限均受浏览器策略控制。后台冻结会向 iframe 发送：

```javascript
{
    source: 'FluentOS',
    type: 'fluentos:tombstone',
    action: 'freeze' // 或 restore
}
```

可控的 Web 应用可监听该消息暂停/恢复耗时任务。

## 10. Developer Center 创建的 App

Developer Center 封装的 App 在 sandbox iframe 中运行，只能通过注入的异步 `FluentOS` bridge 请求宿主能力，不能直接读取宿主页面或普通浏览器存储。使用 `FluentOS.storage` 前必须声明 `storage.local`；需要剪贴板能力时，必须显式声明 `clipboard.read`、`clipboard.write` 或两者。调用仍受授权快照以及浏览器安全策略约束。

预览窗口始终使用只读能力配置：不会继承项目声明的任何权限或网络白名单，只允许读取系统主题/状态/语言和窗口信息。通知、本地存储、修改窗口或主题、文件、桌面、剪贴板及网络调用都会被拒绝。要测试这些能力，应先通过安全检查和用户授权封装 App，再在正式窗口中运行。

获得 `storage.local` 权限后，每个自建 App 的私有 `FluentOS.storage` 使用独立命名空间，并按 UTF-8 大小执行以下配额：

- 总数据最多 512 KiB。
- 最多 128 个键。
- 单个 JSON 序列化值最多 100 KiB。

bridge 使用一次性带令牌的窗口握手建立专用 `MessageChannel`，后续 API 请求和宿主状态都只经过传递给该 iframe 的端口。挂载窗口时，运行时会创建不可变的授权快照，其中固定 App 标识、名称、只读状态、已批准权限和网络域名白名单。之后修改项目或重新注册 App 不会扩大已打开 iframe 的权限；关闭并重新打开后才会应用新的已批准配置。

## 11. 网络、权限与安全

- 所有远程数据都应有加载、失败、超时或本地回退状态。
- 将第三方返回文本写入 `innerHTML` 前必须转义；优先用 `textContent`。
- URL 必须验证协议，外部窗口使用 `noopener,noreferrer`。
- 摄像头流关闭时逐轨调用 `track.stop()`；定位和剪贴板失败时给出可理解提示。
- 不把 API Key 写入代码、日志、虚拟文件系统或普通 `localStorage` 字段。
- 严格 CSP 在 `js/core/csp.js` 中定义。新增远程源时先判断是否必要，再同步策略和无网络回退。
- `localStorage` 和客户端加密不能抵御同源恶意脚本；它们只是持久化手段，不是可信密钥库。

## 12. 调试接口

```javascript
FluentOS.version;
FluentOS.openApp('settings');
FluentOS.closeAllWindows();
FluentOS.setTheme('light');
FluentOS.toggleTheme();

FluentOS.debug.getState();
FluentOS.debug.getWindows();
FluentOS.debug.exportSettings();
FluentOS.debug.resources.start();
FluentOS.debug.resources.table();
FluentOS.debug.resources.summary();
FluentOS.debug.resources.stop();
```

全局通知有两套用途：

```javascript
// 写入系统通知中心并持久化
State.addNotification({ title: '完成', message: '任务已结束', type: 'success' });

// 轻量右下角 Toast，不进入通知中心
FluentUI.Toast({ title: '已保存', message: '设置已更新', type: 'success' });
```

自建专业 App 可通过异步桥接调用通知与系统弹窗：

```javascript
await FluentOS.notify('任务完成', '文件已经保存。', 'success');
await FluentOS.alert('提示', '这是由系统渲染的弹窗。');
const confirmed = await FluentOS.confirm('删除项目', '此操作无法撤销。');
const result = await FluentOS.dialog({
    title: '选择操作',
    message: '请选择下一步操作。',
    buttons: [
        { text: '取消', value: 'cancel', variant: 'secondary' },
        { text: '继续', value: 'continue', variant: 'primary' }
    ]
});
```

`notify()` 会同时写入通知中心并显示即时 Toast；`alert()`、`confirm()` 和 `dialog()` 由宿主系统渲染，标题、正文与按钮均按纯文本处理。

## 13. 提交前检查

- `scripts/validate-project.ps1` 通过；若修改了运行时资源，清单已按 resource → storage 的顺序重新生成。
- 从清空站点数据开始完成 OOBE、锁屏、登录和桌面流程。
- 浅色/深色主题、不同强调色和关闭动画/模糊时均可用。
- 应用可打开、最小化、最大化、贴靠、关闭并再次打开。
- 窗口缩到最小尺寸时没有关键控件溢出。
- 中文和英文切换后，窗口标题、导航和动态内容同步更新。
- 刷新后设置、文件、窗口位置和应用数据按预期恢复。
- 无网络、拒绝摄像头/定位权限和 iframe 被拦截时不崩溃。
- 控制台没有新增的未处理异常、重复监听或持续计时器。
