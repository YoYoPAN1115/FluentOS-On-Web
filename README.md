# FluentOS-On-Web 2.0

[简体中文](README.md) | [English](README_EN.md)

一个使用纯 HTML + CSS + JavaScript 实现的仿真操作系统界面，采用自制设计语言。
一个由高中生自主打造的操作系统。
注意，本操作系统仅利用AI编程技术进行制作，无人工干预调整代码，这里特别鸣谢Codex。

## 为啥要做这个系统？
因为本人想打造一个几乎毫无Bug且速度极快的“梦中OS”，

## ✨ 特性

- 🚀 完整的系统流程：开机 → 锁屏 → 登录 → 桌面
- 💾 本地持久化存储（localStorage）
- 🎨 Fluent Design 风格界面（毛玻璃、圆角、阴影）
- 🌓 支持浅色/深色主题切换
- 📱 响应式设计（最佳体验 ≥1024px）
- ⚡ 纯原生实现，无任何框架依赖

当前系统版本：`2.1.0712`（以 `js/core/resource-manifest.js` 为准）。

> FluentOS-On-Web 是 Web 桌面模拟项目，不是真正的操作系统。文件、设置与“安装的应用”主要保存在当前浏览器中，不能访问或管理宿主系统的真实账户、进程和完整文件系统。

## 主要能力

- 完整系统流程：资源预载、OOBE 首次设置、锁屏、PIN 登录、桌面、关机/重启/注销。
- Fluent 风格外观：浅色/深色主题、强调色、壁纸取色、玻璃材质、模糊、动画与按钮光效。
- 桌面与任务栏：图标选择和拖放、开始菜单、搜索、快捷设置、通知中心、任务视图及应用切换。
- 窗口管理：拖动、八方向缩放、最小化、最大化、层级管理、边缘贴靠、悬停布局、位置记忆和后台冻结。
- 桌面与锁屏小组件：天气、时钟、日历、照片、媒体、便笺、搜索、收藏、新闻、农历、快递、节假日等。
- 本地状态：设置、会话、虚拟文件系统、桌面布局、通知与应用使用记录均可持久化。
- 中英文界面：由 `I18n` 和全局 `t()` 函数提供运行时翻译。
- Fingo 助手：内置本地指令，也可配置 OpenAI 或 SiliconFlow 兼容接口。
- 灵翼交互：按需加载 MediaPipe，通过摄像头手势控制部分系统交互。
- App Shop：管理内置应用与第三方 Web/PWA 目录；第三方应用在独立 iframe 窗口中运行。

## 内置应用

| 应用 | 主要功能 |
| --- | --- |
| 文件 | 虚拟目录、搜索、面包屑导航、回收站、外部文件导入与应用间文件打开 |
| 设置 | 账户、网络、个性化、应用、多任务、时间与语言、隐私、Fingo、实验室及开发者选项 |
| 计算器 | 标准/专业计算、历史记录和键盘输入 |
| 记事本 | 多标签富文本编辑、虚拟文件读写、外部文本导入、HTML 导出和大字报模式 |
| 浏览器 | 多标签页、地址搜索、历史记录与收藏站点；页面实际由 iframe 加载 |
| 时钟 | 计时器、秒表、世界时钟和日历 |
| 天气 | 城市搜索、定位、实时天气与预报，数据来自 Open-Meteo 等在线服务 |
| 相机 | 摄像头预览、拍照、录像及媒体保存，需要浏览器授权 |
| 照片 | Bing/本地/收藏图库、查看、缩放、旋转、翻转、调整、下载与设置壁纸 |
| 媒体 | 本地媒体库、播放队列、播放列表、Media Session 与播放状态恢复 |
| App Shop | 内置应用管理及第三方 Web 应用目录 |

## 快速开始

项目没有 npm 依赖、打包器或编译步骤。建议通过本地 HTTP 服务运行；直接双击 `index.html` 会使 `fetch`、模块资源和部分浏览器权限受到 `file://` 限制。

```powershell
# 在项目根目录启动，任选一种
python -m http.server 8000
npx http-server . -p 8000
```

然后访问 <http://localhost:8000/>。

首次打开会进入 OOBE。若首次设置数据不存在，系统会引导选择语言、壁纸、账户头像等；默认设置中的 PIN 为 `1234`，之后可在设置中修改。

### 浏览器与权限

推荐使用最新版 Chromium 系浏览器。Firefox/Safari 可运行大部分界面，但文件选择、媒体会话、全屏和摄像头行为可能不同。

- 摄像头、剪贴板、定位、全屏和文件选择器由浏览器控制；通常要求 `localhost` 或 HTTPS，并需要用户授权。
- 天气、Bing 壁纸、小组件、Fingo 自定义模型和灵翼依赖网络及第三方服务。
- 某些站点通过 `X-Frame-Options` 或 CSP 禁止 iframe 嵌入，因此 App Shop 或浏览器中的对应页面可能无法显示。这不是 FluentOS 能绕过的限制。
- Fingo API Key 属于敏感信息。优先选择临时保存；永久模式使用浏览器端加密，但仍不应在不可信设备上配置。

## 常用快捷键

快捷键仅在桌面视图生效，且会避开 `Ctrl`/`Meta` 组合。

| 快捷键 | 操作 |
| --- | --- |
| `Alt` | 打开或关闭开始菜单 |
| `Alt+F` | 打开或关闭 Fingo |
| `Alt+I` | 打开设置 |
| `Alt+L` | 锁屏 |
| `Alt+E` | 打开文件应用 |
| `Alt+A` | 打开或关闭控制中心 |
| `Alt+C` | 打开应用切换器；继续按可循环切换 |
| `Alt+D` | 最小化全部窗口 |
| `Alt+M` | 最小化最上层窗口 |
| `Alt+W` | 打开或关闭任务视图 |
| `Esc` | 关闭当前面板、任务视图或编辑状态（视上下文而定） |
| `Ctrl+A` | 无窗口激活时全选桌面图标 |
| `Delete` | 无窗口激活时删除选中的桌面项目 |
| `Ctrl+S` / `Cmd+S` | 在记事本中保存当前草稿 |

## 项目结构

```text
FluentOS-On-Web 2.0/
├─ index.html                 # 页面骨架与按顺序加载的样式/脚本
├─ css/
│  ├─ main.css               # 系统基础样式、主题令牌与窗口外壳
│  ├─ fluent-ui.css          # FluentUI 组件与材质
│  ├─ fluent-window.css      # 应用内部导航框架
│  ├─ apps-unified.css       # 内置应用共享样式
│  └─ ...                    # OOBE、开始菜单、通知、小组件等样式
├─ js/
│  ├─ core/                  # 存储、状态、国际化、组件、Fingo、灵翼等
│  ├─ ui/                    # 系统屏幕、桌面、任务栏、窗口与小组件
│  ├─ apps/                  # 11 个内置应用
│  ├─ third_parts_apps/      # PWA 加载器与第三方应用目录
│  └─ main.js                # 初始化、全局快捷键、公开 API 与调试工具
├─ Theme/
│  ├─ Icon/                  # 应用图标与 stroke/fill/colour 符号图标
│  ├─ Picture/               # 内置壁纸
│  ├─ Profile_img/           # 用户头像
│  ├─ Preload/               # OOBE 预载资源
│  └─ illustrations/         # 设置/OOBE 插图
└─ docs/
   ├─ DEVELOPER_GUIDE.md     # 架构、数据、扩展与调试
   └─ fluent-ui-guide.md     # 设计令牌和组件 API
```

## 数据与隐私

核心数据保存在当前站点源的 `localStorage` 中：

| 键 | 内容 |
| --- | --- |
| `fluentos.settings` | 主题、用户资料、窗口行为、Fingo 与实验设置 |
| `fluentos.session` | 登录状态与登录尝试 |
| `fluentos.fs` | 虚拟文件系统；大体积内联内容会被主动移除以保护启动性能 |
| `fluentos.desktopLayout` | 桌面图标布局 |
| `fluentos.appUsage` | 应用使用时间 |
| `fluentos.notifications` | 通知列表 |

照片与媒体应用还会使用 IndexedDB 保存较大的 Blob，另有少量模块专用的 `localStorage` 键。清除站点数据将重置系统，也会删除虚拟文件和媒体库；重要内容请先导出。

## 开发与调试

浏览器控制台公开了 `FluentOS`：

```javascript
FluentOS.version;
FluentOS.openApp('files');
FluentOS.setTheme('dark');
FluentOS.toggleTheme();
FluentOS.debug.getState();
FluentOS.debug.getWindows();
FluentOS.debug.resources.start();
FluentOS.debug.resources.summary();
FluentOS.debug.resources.stop();
```

系统控制接口包括 `FluentOS.restart()`、`shutdown()`、`logout()` 和 `closeAllWindows()`。`FluentOS.debug.clearStorage()` 会在确认后清空当前站点的全部本地数据。

进一步开发请阅读：

- [开发者指南](docs/DEVELOPER_GUIDE.md)
- [Fluent UI 指南](docs/fluent-ui-guide.md)

## 参与开发

1. 从功能分支修改代码，不要改变 `index.html` 中脚本的依赖顺序。
2. 新界面优先复用 `FluentUI`、`FluentWindow`、主题变量和现有图标。
3. 用户可见文本同时补充 `js/core/i18n.js` 的中文与英文翻译。
4. 修改资源后同步发布流程中的资源清单；`js/core/resource-manifest.js` 标明为生成文件，不应手工维护哈希。
5. 至少在浅/深主题、窗口缩放、刷新后持久化和无网络状态下检查改动。

## License

[MIT License](LICENSE)
