# Fluent OS Web

一个使用纯 HTML + CSS + JavaScript 实现的仿真操作系统界面，采用自制设计语言。
一个由高中生自主打造的操作系统。
注意，本操作系统仅利用AI编程技术进行制作，无人工干预调整代码，这里特别鸣谢Claude。

## 为啥要做这个系统？
因为本人无聊，哈哈
其实还有一个原因是因为受够了各种主流操作系统的各种Bug和冗余，一气之下利用AI技术打造一个几乎毫无Bug且速度极快的“梦中OS”

## ✨ 特性

- 🚀 完整的系统流程：开机 → 锁屏 → 登录 → 桌面
- 💾 本地持久化存储（localStorage）
- 🎨 Fluent Design 风格界面（毛玻璃、圆角、阴影）
- 🌓 支持浅色/深色主题切换
- 📱 响应式设计（最佳体验 ≥1024px）
- ⚡ 纯原生实现，无任何框架依赖

## 🎯 核心功能

### 系统核心
- ✅ 开机动画
- ✅ 锁屏界面（实时时钟、壁纸）
- ✅ 登录系统（PIN认证，默认：1234）
- ✅ 桌面环境（图标、壁纸、右键菜单）

### 任务栏
- ✅ 居中半透明亚克力设计
- ✅ 固定应用图标
- ✅ 运行状态指示
- ✅ 开始菜单
- ✅ 控制中心
- ✅ 通知中心
- ✅ 系统时间显示

### 开始菜单
- ✅ 搜索功能
- ✅ 固定应用网格
- ✅ 电源菜单（关机/重启/注销）
- ✅ Alt键快捷键支持

### 控制中心
- ✅ Wi-Fi/蓝牙开关
- ✅ 深浅色主题切换
- ✅ 模糊效果开关
- ✅ 动画效果开关
- ✅ 音量调节
- ✅ 亮度调节

### 通知中心
- ✅ 通知列表
- ✅ 单条/批量清除
- ✅ 时间显示
- ✅ 全局 notify() API

### 内置应用

#### 📁 文件管理器
- 树形文件系统
- 快速访问（桌面/文档/下载/回收站）
- 面包屑导航
- 后退/前进功能
- 文件搜索

#### ⚙️ 设置
- **个性化**
  - 桌面壁纸切换
  - 锁屏壁纸切换
  - 主题切换（浅色/深色/自动）
  - 模糊效果开关
  - 动画效果开关
  - 窗口模糊开关（毛玻璃/纯色底）
- **系统**
  - 修改PIN
  - 语言设置
- **关于**
  - 版本信息
  - 技术栈
  - 开源许可证

#### 🔢 计算器
- 基础四则运算
- 百分比计算
- 键盘支持
- 清空/退格功能

#### 📝 记事本（富文本编辑器）
- **文件操作**
  - 打开外部文件（.txt / .html）
  - 保存到文件系统
  - 导出HTML文档
- **富文本编辑**
  - 字体大小调整（12px - 48px）
  - 字体颜色选择
  - 文本高亮
  - 加粗、斜体、下划线
  - 左对齐、居中、右对齐
- **大字报模式**
  - 全屏展示
  - 自动滚动播放
  - 适合演讲展示
- **用户体验**
  - 实时字符统计
  - Ctrl+S 快捷保存
  - ESC 退出大字报

### 窗口管理
- ✅ 可拖拽窗口
- ✅ 最小化（非线性动画到任务栏）
- ✅ 最大化/还原（非线性缩放动画）
- ✅ 关闭（淡出动画）
- ✅ 双击标题栏最大化
- ✅ 窗口层级管理（z-index）
- ✅ 任务栏集成
- ✅ 窗口模糊/纯色底切换

## 🚀 快速开始

### 运行项目

1. 直接打开 `index.html` 文件即可运行
2. 或使用本地服务器：
   ```bash
   # 使用 Python
   python -m http.server 8000
   
   # 使用 Node.js
   npx http-server
   ```

3. 在浏览器中访问

### 默认登录信息

- **PIN**: `1234`

## 📁 项目结构

```
Fluent OS 3.0/
├── index.html              # 主页面
├── css/
│   ├── main.css           # 主样式
│   └── animations.css     # 动画样式
├── js/
│   ├── core/
│   │   ├── storage.js     # localStorage管理
│   │   └── state.js       # 全局状态管理
│   ├── ui/
│   │   ├── boot.js        # 开机屏幕
│   │   ├── lockscreen.js  # 锁屏
│   │   ├── login.js       # 登录
│   │   ├── desktop.js     # 桌面
│   │   ├── taskbar.js     # 任务栏
│   │   ├── startmenu.js   # 开始菜单
│   │   ├── controlcenter.js # 控制中心
│   │   ├── notification.js  # 通知中心
│   │   └── window.js      # 窗口管理
│   ├── apps/
│   │   ├── files.js       # 文件管理器
│   │   ├── settings.js    # 设置
│   │   ├── calculator.js  # 计算器
│   │   └── notes.js       # 记事本
│   └── main.js            # 主入口
└── Theme/
    ├── Icon/              # 图标资源
    │   ├── App_icon/     # 应用图标
    │   ├── Symbol_icon/  # 符号图标
    │   │   ├── stroke/   # 线性图标
    │   │   └── fill/     # 填充图标
    │   ├── Fluent_logo.png
    │   └── UserAva.png
    └── Picture/          # 壁纸资源
        ├── Fluent-1.png
        ├── Fluent-2.png
        └── ...
```

## 🎨 设计规范

### 视觉风格
- **圆角**: 16-20px
- **阴影**: md/2xl 多层次阴影
- **模糊**: backdrop-blur 8-12px
- **字体**: 系统默认 (-apple-system, Segoe UI, Roboto, Noto Sans SC)
- **字重**: 400/600

### 动画
- **过渡时间**: 180-220ms
- **缓动**: ease-out, cubic-bezier
- **开机动画**: 2-3s
- **窗口动画**:
  - 打开: 250ms cubic-bezier(0.4, 0, 0.2, 1)
  - 关闭: 250ms cubic-bezier(0.4, 0, 1, 1)
  - 最大化/还原: 300ms cubic-bezier(0.4, 0, 0.2, 1)
  - 最小化: 400ms cubic-bezier(0.4, 0, 0.6, 1)

### 颜色系统
- **浅色模式**: #f3f3f3 背景，#1f1f1f 文字
- **深色模式**: #202020 背景，#ffffff 文字
- **强调色**: #0078d4 (浅色) / #60cdff (深色)

## ⌨️ 快捷键

- `Alt` / `Meta`: 打开/关闭开始菜单
- `Esc`: 关闭当前弹窗
- `Enter`: 提交登录
- `Ctrl+S`: 保存记事本（在记事本应用中）
- `ESC`: 退出大字报模式（在记事本大字报模式中）
- Alt+F：打开 Fingo AI
- Alt+I：快速打开设置
- Alt+L：快速锁屏
- Alt+E：打开文件 App
- Alt+A：打开控制中心
- Alt+D：一键最小化所有窗口
- Alt+M：最小化当前置顶窗口
- Alt+W：打开任务视图
- 双击窗口标题栏：最大化/还原窗口

## 🔧 API 接口

### 全局通知
```javascript
notify('标题', '消息内容', 'info|success|error');
```

### FluentOS API
```javascript
// 打开应用
FluentOS.openApp('files');

// 主题切换
FluentOS.setTheme('dark');
FluentOS.toggleTheme();

// 系统控制
FluentOS.restart();
FluentOS.shutdown();
FluentOS.logout();

// 调试工具
FluentOS.debug.clearStorage();     // 清空所有数据
FluentOS.debug.exportSettings();   // 导出设置
FluentOS.debug.getState();         // 获取状态
```

## 📦 数据持久化

所有数据存储在 localStorage 中：

- `fluentos.settings`: 系统设置
- `fluentos.session`: 会话信息
- `fluentos.fs`: 文件系统
- `fluentos.desktopLayout`: 桌面布局
- `fluentos.notifications`: 通知列表

## 🔌 扩展开发

### 添加新应用

1. 在 `js/apps/` 创建新的应用文件
2. 实现应用对象：
```javascript
const YourApp = {
    init(windowId) {
        this.container = document.getElementById(`${windowId}-content`);
        this.render();
    },
    render() {
        // 渲染应用界面
    }
};
window.YourApp = YourApp;
```

3. 在 `WindowManager.appConfigs` 中注册：
```javascript
yourapp: {
    title: '应用名称',
    icon: 'Theme/Icon/App_icon/yourapp.png',
    width: 800,
    height: 600,
    component: 'YourApp'
}
```

4. 在 `Desktop.apps` 中添加桌面图标

5. 在 `index.html` 中引入应用脚本

## 🌟 MVP验收清单

- ✅ 完成 开机→锁屏→登录(1234)→桌面 全链路
- ✅ 任务栏样式与Fluent Design一致
- ✅ 开始菜单可开/关
- ✅ 控制中心、通知中心可打开
- ✅ 通知可新增/关闭/清空
- ✅ 文件系统可新建/重命名/删除/回收站/还原，并持久化
- ✅ 设置可更换桌面/锁屏壁纸、切换深浅色、开关模糊与动画
- ✅ 关机/重启/注销生效并进入对应状态
- ✅ 刷新后状态与设置保留

## 📝 开发备注

- 代码采用模块化设计，便于后续扩展
- 所有Symbol图标支持stroke/fill两种状态
- 图标交互动画：hover时从stroke切换到fill
- 窗口系统支持拖拽、最小化、最大化
- 完整的状态管理和事件系统

## 📄 许可证

MIT License

---

**Fluent OS** - 一个优雅的Web操作系统界面 | Made with ❤️

