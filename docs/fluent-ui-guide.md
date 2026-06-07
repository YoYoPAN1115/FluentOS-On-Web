# Fluent UI 组件库使用指南

Fluent UI 是 Fluent OS 的统一 UI 组件库，提供一致的系统级交互组件。

## 快速开始

所有组件通过全局 `FluentUI` 对象调用：

```javascript
// 创建一个主要按钮
const btn = FluentUI.Button({
    text: '确定',
    variant: 'primary',
    onClick: () => console.log('clicked')
});
container.appendChild(btn);
```

---

## 组件列表

### 1. Button 按钮

```javascript
FluentUI.Button({
    text: '按钮文字',
    variant: 'primary',    // 'primary' | 'secondary' | 'outline' | 'text' | 'danger'
    size: 'medium',        // 'small' | 'medium' | 'large'
    icon: 'Save',          // 图标名称（可选）
    iconPosition: 'left',  // 'left' | 'right'
    disabled: false,
    loading: false,
    onClick: () => {},
    id: 'my-btn',
    className: 'custom-class'
});
```

### 2. IconButton 图标按钮

```javascript
FluentUI.IconButton({
    icon: 'Settings',
    title: '设置',
    size: 'medium',        // 'small' | 'medium' | 'large'
    disabled: false,
    onClick: () => {}
});
```

### 3. TabBar 标签栏

```javascript
FluentUI.TabBar({
    tabs: [
        { id: 'tab1', label: '标签1', icon: 'Home', closable: true },
        { id: 'tab2', label: '标签2', closable: true }
    ],
    activeTab: 'tab1',
    variant: 'default',    // 'default' | 'pills' | 'underline'
    showAddButton: true,
    onTabChange: (tabId) => console.log('切换到', tabId),
    onTabClose: (tabId) => console.log('关闭', tabId),
    onAddTab: () => console.log('添加新标签')
});
```

### 4. Sidebar 侧边栏

```javascript
FluentUI.Sidebar({
    header: '导航',
    sections: [
        {
            title: '快速访问',
            items: [
                { id: 'home', label: '首页', icon: 'Home' },
                { id: 'docs', label: '文档', icon: 'File' }
            ]
        },
        {
            title: '设置',
            items: [
                { id: 'settings', label: '设置', icon: 'Settings' }
            ]
        }
    ],
    activeItem: 'home',
    width: '200px',
    onItemClick: (itemId, item) => console.log('点击', itemId)
});

// 或使用扁平结构
FluentUI.Sidebar({
    items: [
        { id: 'home', label: '首页', icon: 'Home' },
        { id: 'settings', label: '设置', icon: 'Settings' }
    ],
    activeItem: 'home',
    onItemClick: (itemId) => {}
});
```

### 5. NavigationBar 导航栏

```javascript
FluentUI.NavigationBar({
    showBack: true,
    showForward: true,
    backDisabled: false,
    forwardDisabled: true,
    onBack: () => console.log('后退'),
    onForward: () => console.log('前进'),
    center: FluentUI.Breadcrumb({ items: [...] }),  // 中间内容
    right: FluentUI.SearchBox({ placeholder: '搜索...' })  // 右侧内容
});
```

### 6. ToolBar 工具栏

```javascript
FluentUI.ToolBar({
    items: [
        { id: 'save', icon: 'Save', title: '保存' },
        { id: 'copy', icon: 'Copy', title: '复制' },
        { divider: true },  // 分隔符
        { id: 'delete', icon: 'Trash', title: '删除', disabled: true }
    ],
    align: 'left',         // 'left' | 'center' | 'right' | 'space-between'
    onItemClick: (itemId) => console.log('点击工具', itemId)
});
```

### 7. Breadcrumb 面包屑导航

```javascript
FluentUI.Breadcrumb({
    items: [
        { id: 'root', label: '根目录', icon: 'Folder' },
        { id: 'documents', label: '文档' },
        { id: 'work', label: '工作' }
    ],
    separator: '›',
    onItemClick: (itemId, index) => console.log('跳转到', itemId)
});
```

### 8. SegmentedControl 分段控制

```javascript
FluentUI.SegmentedControl({
    segments: [
        { id: 'day', label: '日' },
        { id: 'week', label: '周' },
        { id: 'month', label: '月' }
    ],
    activeSegment: 'day',
    size: 'medium',        // 'small' | 'medium' | 'large'
    onChange: (segmentId) => console.log('切换到', segmentId)
});
```

### 9. Input 输入框

```javascript
const input = FluentUI.Input({
    type: 'text',          // 'text' | 'password' | 'number' | 'email' | 'search'
    placeholder: '请输入...',
    value: '',
    icon: 'Search',        // 前置图标（可选）
    clearable: true,       // 显示清除按钮
    disabled: false,
    onChange: (value) => console.log('值变化', value),
    onEnter: (value) => console.log('回车', value)
});

// 方法
input.getValue();          // 获取值
input.setValue('新值');    // 设置值
input.focus();             // 聚焦
```

### 10. SearchBox 搜索框

```javascript
FluentUI.SearchBox({
    placeholder: '搜索文件...',
    onChange: (value) => {},
    onEnter: (value) => {}
});
```

### 11. Select 下拉选择

```javascript
const select = FluentUI.Select({
    options: [
        { value: 'zh', label: '简体中文' },
        { value: 'en', label: 'English' },
        { value: 'ja', label: '日本語', disabled: true }
    ],
    value: 'zh',
    placeholder: '请选择语言',
    disabled: false,
    onChange: (value) => console.log('选择', value)
});

// 方法
select.getValue();
select.setValue('en');
```

### 12. Toggle 开关

```javascript
const toggle = FluentUI.Toggle({
    checked: true,
    disabled: false,
    label: '开启通知',
    onChange: (checked) => console.log('开关状态', checked)
});

// 方法
toggle.isChecked();        // 获取状态
toggle.setChecked(false);  // 设置状态
```

### 13. Slider 滑块

```javascript
const slider = FluentUI.Slider({
    min: 0,
    max: 100,
    value: 50,
    step: 1,
    showValue: true,       // 显示数值
    disabled: false,
    onChange: (value) => console.log('滑块值', value)
});

// 方法
slider.getValue();
slider.setValue(75);
```

### 14. ContextMenu 右键菜单

```javascript
const menu = FluentUI.ContextMenu({
    items: [
        { id: 'open', label: '打开', icon: 'Folder Open', onClick: () => {} },
        { separator: true },
        { id: 'rename', label: '重命名', icon: 'Edit', onClick: () => {} },
        { id: 'delete', label: '删除', icon: 'Trash', onClick: () => {}, disabled: true }
    ]
});

document.body.appendChild(menu);

// 显示菜单
element.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    menu.show(e.clientX, e.clientY);
});

// 点击其他区域隐藏
document.addEventListener('click', () => menu.hide());
```

### 15. Modal 模态对话框

```javascript
const modal = FluentUI.Modal({
    title: '确认删除',
    content: '确定要删除这个文件吗？此操作不可撤销。',
    width: '400px',
    closable: true,
    buttons: [
        { text: '取消', variant: 'secondary', onClick: () => {} },
        { text: '删除', variant: 'danger', onClick: () => console.log('删除') }
    ],
    onClose: () => console.log('对话框关闭')
});

// 显示对话框
modal.show();

// 关闭对话框
modal.close();
```

### 16. Card 卡片

```javascript
FluentUI.Card({
    title: '卡片标题',
    content: '卡片内容...',
    footer: '卡片底部',
    hoverable: true        // 鼠标悬停效果
});
```

### 17. List 列表

```javascript
FluentUI.List({
    items: [
        { id: '1', title: '项目1', description: '描述文字', icon: 'File', extra: '10KB' },
        { id: '2', title: '项目2', description: '描述文字', icon: 'Folder' }
    ],
    selectable: true,
    activeItem: '1',
    onItemClick: (itemId, item) => console.log('点击', itemId)
});
```

### 18. Progress 进度条

```javascript
const progress = FluentUI.Progress({
    value: 60,
    max: 100,
    showLabel: true,
    variant: 'default'     // 'default' | 'success' | 'warning' | 'error'
});

// 更新进度
progress.setValue(80);
```

### 19. Spinner 加载指示器

```javascript
FluentUI.Spinner({
    size: 'medium'         // 'small' | 'medium' | 'large'
});
```

### 20. SettingItem 设置项

```javascript
FluentUI.SettingItem({
    label: '深色模式',
    description: '切换系统主题为深色',
    control: FluentUI.Toggle({ checked: false, onChange: () => {} })
});
```

### 21. Empty 空状态

```javascript
FluentUI.Empty({
    icon: 'Inbox',
    title: '暂无数据',
    description: '当前没有任何内容'
});
```

---

## 在应用中使用示例

### 设置应用侧边栏

```javascript
render() {
    const sidebar = FluentUI.Sidebar({
        sections: [
            {
                title: '设置',
                items: [
                    { id: 'personalization', label: t('settings.personalization'), icon: 'Color Picker' },
                    { id: 'system', label: t('settings.system'), icon: 'Settings' },
                    { id: 'about', label: t('settings.about'), icon: 'Information Circle' }
                ]
            }
        ],
        activeItem: this.currentPage,
        onItemClick: (pageId) => {
            this.currentPage = pageId;
            this.render();
        }
    });
    
    this.container.innerHTML = '';
    this.container.appendChild(sidebar);
}
```

### 文件管理器工具栏

```javascript
const toolbar = FluentUI.NavigationBar({
    onBack: () => this.goBack(),
    onForward: () => this.goForward(),
    backDisabled: this.historyIndex <= 0,
    forwardDisabled: this.historyIndex >= this.history.length - 1,
    center: FluentUI.Breadcrumb({
        items: this.currentPath.map(id => ({
            id,
            label: State.findNode(id)?.name || id
        })),
        onItemClick: (id, index) => this.navigateToPathIndex(index)
    }),
    right: FluentUI.SearchBox({
        placeholder: '搜索文件...',
        onEnter: (query) => this.search(query)
    })
});
```

### 浏览器标签栏

```javascript
const tabBar = FluentUI.TabBar({
    tabs: this.tabs.map(tab => ({
        id: tab.id,
        label: tab.title,
        icon: 'Globe'
    })),
    activeTab: this.activeTabId,
    showAddButton: true,
    onTabChange: (tabId) => this.switchTab(tabId),
    onTabClose: (tabId) => this.closeTab(tabId),
    onAddTab: () => this.createNewTab()
});
```

---

## 图标列表

所有图标位于 `Theme/Icon/Symbol_icon/stroke/` 目录：

- **导航**: Arrow Left, Arrow Right, Arrow Down, Arrow Up, Home, Refresh
- **文件**: File, Folder, Folder Open, Download, Upload, Save, Trash
- **操作**: Edit, Copy, Cut, Search, Cancel, Add, Plus Circle, Minus
- **媒体**: Image, Video, Music, Volume Up, Play, Pause
- **状态**: Information Circle, Check, Warning, Error
- **其他**: Settings, User Circle, Star, Heart, Eye, Moon, Sun

---

## 版本

当前版本: `FluentUI.version` = `1.0.0`
