# Fluent UI Development Guide

[简体中文](fluent-ui-guide.md) | [English](fluent-ui-guide-en.md)

This guide covers the visual foundations, `FluentUI` DOM factory, and `FluentWindow` application framework in FluentOS-On-Web 2.0. The documented interfaces correspond to `js/core/fluent-ui.js`, `js/core/fluent-window.js`, and their stylesheets.

See the [Developer Guide](DEVELOPER_GUIDE_EN.md) for architecture and app registration.

## Design Principles

- Reuse system tokens and components instead of creating app-specific copies of buttons, fields, or dialogs.
- Component factories return real DOM nodes, not HTML strings or virtual DOM.
- Use `textContent` for user data; only trusted templates may use `innerHTML`.
- Test every interaction in light/dark themes and with blur or animation disabled.
- Use icons from `Theme/Icon/Symbol_icon/`: `stroke` for normal state and `fill` where an active state is needed.
- Design for resizable windows, not only for a full-screen desktop.

## CSS Tokens and Themes

Base tokens are defined under `:root` in `css/main.css`; `.dark-mode` overrides them.

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

| Category | Variables |
| --- | --- |
| Background | `--bg-primary`, `--bg-secondary`, `--bg-tertiary` |
| Text | `--text-primary`, `--text-secondary`, `--text-tertiary` |
| Accent | `--accent`, `--accent-hover`, `--accent-rgb`, `--accent-soft` |
| Border/shadow | `--border-color`, `--shadow-sm/md/lg/xl` |
| Radius | `--radius-sm/md/lg/xl` (8/12/16/20 px) |
| Blur | `--blur-sm/md/lg` (8/12/16 px) |
| Motion | `--transition-fast/normal/slow/spring` |

Do not hard-code white backgrounds or a fixed blue accent. Users and wallpaper extraction can change accent values at runtime. System material, blur, animation, and Fluent V2 classes are managed globally by `State`; applications should not mutate those body classes directly.

## Icons

Icon names match SVG filenames without the extension:

```javascript
FluentUI.IconButton({
    icon: 'Settings',
    title: t('settings.title'),
    onClick: () => WindowManager.openApp('settings')
});

const normal = FluentUI._utils.getIconPath('Home');
const active = FluentUI._utils.getIconPath('Home', 'fill');
```

Check both `stroke` and `fill` directories before using a new icon. Filenames, spaces, and capitalization must match exactly.

## FluentUI Basics

`FluentUI` is a global DOM factory. Most factories accept `id` and `className` and immediately return an `HTMLElement`:

```javascript
const panel = document.createElement('section');
panel.append(
    FluentUI.Button({ text: t('confirm'), variant: 'primary' }),
    FluentUI.Spinner({ size: 'small' })
);
this.container.replaceChildren(panel);
```

Components do not mount themselves or provide reactive binding. The caller updates the returned DOM or renders it again when state changes.

## Buttons

### Button

```javascript
FluentUI.Button({
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

`loading: true` disables the button and displays a spinner.

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

Always give icon-only buttons a meaningful `title` and, when needed, an `aria-label`.

## Input and Selection

### Input / SearchBox

```javascript
const input = FluentUI.Input({
    type: 'text',
    value: '',
    placeholder: t('demo.placeholder'),
    icon: 'Edit',
    clearable: true,
    onChange: value => this.query = value,
    onEnter: value => this.submit(value)
});

const search = FluentUI.SearchBox({
    placeholder: t('search'),
    onChange: value => this.search(value)
});
```

The returned node is a wrapper. Use its `getInput()`, `getValue()`, `setValue()`, and `focus()` helpers when direct input access is required.

### Select

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

This is a custom dropdown rather than a native `<select>`.

### Toggle

```javascript
FluentUI.Toggle({
    checked: State.settings.enableAnimation !== false,
    label: t('settings.animation'),
    onChange: checked => State.updateSettings({ enableAnimation: checked })
});
```

Toggle maintains `role="switch"` and `aria-checked`.

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

The callback receives a number. Avoid expensive work on every high-frequency input event.

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

## Navigation

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

`center` and `right` accept strings or DOM nodes. Do not pass untrusted strings as HTML.

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
    onTabChange: id => this.activate(id),
    onTabClose: id => this.closeTab(id),
    showAddButton: true,
    onAddTab: () => this.addTab()
});
```

## Content and Feedback

### Card and List

```javascript
const card = FluentUI.Card({
    title: t('demo.title'),
    content: document.createTextNode(t('demo.description')),
    hoverable: true
});

const list = FluentUI.List({
    items: [{ id: 'a', title: 'Alpha', description: 'First', icon: 'Folder' }],
    selectable: true,
    activeItem: 'a',
    onItemClick: (id, item) => this.open(id)
});
```

`Card.content` accepts a string or DOM node; `footer` currently accepts an HTML string. Dynamic data should be passed as a node or escaped first.

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

### Empty and SettingItem

```javascript
FluentUI.Empty({
    icon: 'Folder Open',
    title: t('empty'),
    description: t('demo.empty-hint')
});

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
FluentUI.ScrollArea({
    content: longContentElement,
    maxHeight: '420px',
    minThumbSize: 24,
    alwaysVisible: false
});
```

Do not nest it inside a `FluentWindow` `.fw-card` unless a second independent scrolling region is truly required.

## Menus and Dialogs

### ContextMenu

```javascript
const menu = FluentUI.ContextMenu({
    items: [
        { id: 'open', label: t('open'), icon: 'Folder Open', onClick: () => this.open() },
        { separator: true },
        { id: 'delete', label: t('delete'), icon: 'Trash', onClick: () => this.remove() }
    ]
});
document.body.appendChild(menu);
menu.show(event.clientX, event.clientY);
```

The caller remains responsible for mounting, outside-click handling, and cleanup.

### Dialog and InputDialog

```javascript
FluentUI.Dialog({
    type: 'warning', // info | warning | error
    title: t('confirm'),
    content: t('demo.delete-confirm'),
    buttons: [
        { text: t('cancel'), variant: 'secondary', value: 'cancel' },
        { text: t('delete'), variant: 'primary', value: 'delete' }
    ],
    onClose: result => {
        if (result === 'delete') this.remove();
    }
});

FluentUI.InputDialog({
    title: t('rename'),
    defaultValue: this.name,
    minLength: 1,
    maxLength: 80,
    validateFn: value => value.includes('/') ? t('invalid-name') : true,
    onConfirm: value => this.rename(value)
});
```

`validateFn` returns `true` on success or an error string on failure.

### Modal

```javascript
const modal = FluentUI.Modal({
    title: t('demo.details'),
    content: detailsNode,
    width: '520px',
    closable: true,
    buttons: [{ text: t('close'), variant: 'primary' }]
});
modal.show();
```

### Toast and Notification Center

```javascript
const toast = FluentUI.Toast({
    title: t('saved'),
    message: t('demo.saved-message'),
    type: 'success',
    duration: 5000
});
toast.close();

State.addNotification({
    title: t('demo.finished'),
    message: t('demo.finished-message'),
    type: 'success',
    onClickAction: { type: 'openApp', appId: 'demo', data: { page: 'result' } }
});
```

Toast is transient. `State.addNotification()` persists an entry in Notification Center.

## FluentWindow Application Framework

`FluentWindow` manages navigation inside a window. The outer system window is still created by `WindowManager`.

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

Render only into the supplied `pageEl`. Sidebar search supports `enabled`, placeholder/status strings, minimum query length, debounce, asynchronous `search`, and result callbacks.

| API | Purpose |
| --- | --- |
| `navigate(id, options)` / `setActive(id)` | Change pages |
| `refresh()` | Render the active page again |
| `destroy()` | Disconnect observers/listeners and host styles |
| `saveScrollPosition()` / `restoreScrollPosition()` | Manage per-page scroll |
| `setSidebarSearchEnabled(bool)` | Enable or hide sidebar search |
| `setSidebarSearchResults(results, options)` | Supply results manually |
| `clearSidebarSearch()` / `focusSidebarSearch()` | Control the search field |
| `getSidebarSearchQuery()` | Read the current query |

Always call `frame.destroy()` from the confirmed close path.

## Accessibility and Keyboard

- Prefer `<button>` for clickable controls.
- Decorative icons may use empty `alt`; meaningful icons need text, `title`, or `aria-label`.
- Move focus into modals and restore it to the trigger on close.
- Custom keyboard controls should support Enter/Space and expose the correct roles and states.
- Do not override system-level Alt shortcuts or unrelated editing keys.
- Critical text and borders must retain contrast without translucent materials.

## Responsive Design and Performance

- Declare and test minimum app dimensions in `WindowManager.appConfigs`.
- Prefer grid/flex, `minmax()`, overflow, and container width over screen coordinates.
- Provide remote-image loading/error states and release object URLs.
- Remove document/window listeners, intervals, observers, streams, and pending requests before reinitialization.
- Throttle high-frequency settings, slider, and resize work.
- Pause animation, media, and polling in tombstone freeze hooks.

## Component Selection

| Need | Preferred component |
| --- | --- |
| Standard or primary action | `Button` |
| Icon-only tool action | `IconButton` / `ToolBar` |
| Boolean setting | `Toggle` + `SettingItem` |
| Small mutually exclusive view set | `SegmentedControl` |
| Multi-document navigation | `TabBar` |
| App section navigation | `FluentWindow` |
| Transient feedback | `Toast` |
| Persistent system message | `State.addNotification()` |
| Destructive confirmation | `Dialog` |
| Single short text value | `InputDialog` |
| Empty collection | `Empty` |
| Indeterminate/determinate progress | `Spinner` / `Progress` |

Search existing apps before adding a component. Consistency in this project comes primarily from reuse rather than additional near-duplicate controls.
