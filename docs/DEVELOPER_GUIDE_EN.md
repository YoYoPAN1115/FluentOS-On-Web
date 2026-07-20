# FluentOS-On-Web 2.0 Developer Guide

[简体中文](DEVELOPER_GUIDE.md) | [English](DEVELOPER_GUIDE_EN.md)

This guide is for developers who want to understand, debug, or extend FluentOS-On-Web. The project uses traditional browser scripts: there are no npm runtime dependencies, ES modules, build artifacts, or frontend frameworks. `index.html` loads scripts in dependency order, and modules expose objects in the global scope.

See the [project README](../README_EN.md) for usage and the [Fluent UI Guide](fluent-ui-guide-en.md) for components and visual conventions.

## 1. Development Baseline

Run a static server from the repository root:

```powershell
python -m http.server 8000
# or
npx http-server . -p 8000
```

Open <http://localhost:8000/> and use the browser developer tools. Do not use `file://` as the development baseline because preloading, remote requests, camera, clipboard, and file-picker behavior will differ.

The project has no npm test runner or lint configuration, but it includes a unified static validator. It checks HTML entries, duplicate IDs, local resource references, JavaScript/CSS files without runtime entries, both generated manifests, and JavaScript syntax when Node.js is available:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-project.ps1
```

After changing runtime resources under `index.html`, `js/`, `css/`, or `Theme/`, generate the content-hash resource manifest first, then the storage manifest that records the former's file size:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\generate-resource-manifest.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\generate-storage-manifest.ps1
```

Both generators accept `-Check` to verify existing output without writing files; the unified validator invokes both in that mode. Both manifests are generated files and must not be edited by hand.

## 2. Architecture

```text
index.html
  ├─ core: CSP → Storage → State → I18n → shared services/components
  ├─ ui: Boot/OOBE → lock/login → desktop/panels → WindowManager → Widgets
  ├─ apps: 14 default desktop native apps, plus the hidden-by-default Developer Center
  ├─ third_parts_apps: PWALoader and catalog
  ├─ AppShop / Fingo
  └─ main.js: initialization, view changes, shortcuts, and FluentOS API
```

| Directory | Responsibility |
| --- | --- |
| `js/core/` | Storage, global state, i18n, file import, favorites, FluentUI/FluentWindow, Fingo, Lingyi, and resource metadata |
| `js/ui/` | Boot, OOBE, desktop, taskbar, Start, system panels, Task View, windows, and widgets |
| `js/apps/` | Native application components mounted by `WindowManager` |
| `js/third_parts_apps/` | iframe Web/PWA registration and catalog |
| `css/` | Theme tokens, system shell, shared components, and application styles |
| `Theme/` | Icons, wallpapers, avatars, preload assets, and illustrations |

### Script Order

Global objects have real ordering constraints. `State` depends on `Storage`; apps depend on `FluentUI`, `FluentWindow`, `WindowManager`, and `t()`; `main.js` initializes the complete system.

- Place a core script before its first consumer.
- Load native app scripts after `js/ui/window.js` and before `js/main.js`.
- Keep `js/core/csp.js` as early as possible so strict CSP can be restored before other resources execute.
- Do not add `async`, `defer`, or reorder scripts unless the associated global dependencies are removed as well.

## 3. Startup and View Lifecycle

The main `State.view` values are `boot`, `lock`, `login`, and `desktop`. `main.js` listens for `viewChange` and activates the corresponding screen.

OOBE checks its persistence marker on the first visit. Normal startup preloads resources through `BootScreen`, enters the lock screen, then PIN login, and finally the desktop.

```javascript
State.setView('desktop');
State.lock();
State.logout();
State.restart();
State.shutdown();
```

These APIs only change the web interface; they never control the host computer.

## 4. Storage and State

### Storage

`Storage` is a JSON wrapper around `localStorage`:

```javascript
const settings = Storage.get(Storage.keys.SETTINGS, {});
Storage.set(Storage.keys.SETTINGS, settings);
Storage.remove('my.module.key');
```

Core keys are `SETTINGS`, `SESSION`, `FS`, `DESKTOP_LAYOUT`, `APP_USAGE`, and `NOTIFICATIONS`. `Storage.clear()` clears all `localStorage` values for the current origin, not only FluentOS core keys, so it must not be used in normal business flows.

The virtual file-system serializer strips oversized Data URLs—roughly over 128 KiB for images and 2 MiB for other inline data—to protect startup performance. Store large photos and media as Blob data in IndexedDB instead.

### State

`State` is the runtime source of truth:

```javascript
State.settings;
State.session;
State.fs;
State.desktopLayout;
State.notifications;
State.runningApps;
```

Always update settings through `updateSettings()` so persistence, side effects, and events run correctly:

```javascript
State.updateSettings({
    theme: 'dark',
    accentColor: '#7c3aed',
    enableAnimation: true
});
```

Important settings include `theme`, `language`, wallpapers, blur and material options, accent colors, animation, quick switching, window snapping, tombstone freezing, `startPinnedApps`, external file import, and strict CSP.

### Event Bus

```javascript
const unsubscribe = State.on('settingsChange', updates => {
    if ('accentColor' in updates) render();
}, { key: 'MyApp.settings' });

State.once('languageChange', () => render());
State.emit('myEvent', { value: 1 });
unsubscribe();
```

Common events include `viewChange`, `settingsChange`, `languageChange`, `fsChange`, notification events, `appStart`, `appStop`, `appUsageChange`, `weatherDataUpdate`, and `clockEventsUpdate`. Use stable listener keys for repeated initialization and unsubscribe during cleanup.

### Virtual File System

The standard root contains `desktop`, `documents`, `pictures`, `downloads`, and `recycle`.

```javascript
const documents = State.findNode('documents');
const parent = State.findParentNode('some-node-id');
const nextFS = structuredClone(State.fs);
// Modify nextFS...
State.updateFS(nextFS);
```

File IDs must be globally unique. Items moved to the Recycle Bin should retain `_recycle.originalParentId` so they can be restored.

## 5. Internationalization

Translations live in `js/core/i18n.js`; current language keys are `zh` and `en`:

```javascript
const title = t('settings.title');
const message = t('settings.wallpaper-changed', { type: 'desktop' });
I18n.setLanguage('en');
```

Add matching keys to both tables, avoid caching translated strings, listen for `languageChange`, and use `titleKey` in app configurations. Missing English text falls back to Chinese, then to the key itself.

## 6. Window Management

`WindowManager` creates, focuses, resizes, snaps, minimizes, maximizes, freezes, and restores windows. By default, each app ID has one window.

```javascript
WindowManager.openApp('notes');
WindowManager.openApp('notes', { fileId: 'file-123' });
WindowManager.toggleWindow('notes');
WindowManager.closeWindow(windowId);
```

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

Supported component hooks are `init(windowId)`, `loadFile(fileId)`, `openData(data)`, `beforeClose()`, `onTombstoneFreeze(windowData)`, and `onTombstoneRestore(windowData)`. `beforeClose()` may return `false` or a Promise resolving to `false` to cancel closing. Only perform irreversible cleanup after close confirmation.

## 7. Adding a Native App

```javascript
const DemoApp = {
    container: null,
    frame: null,

    init(windowId) {
        this.container = document.getElementById(`${windowId}-content`);
        this.render();
    },

    render() {
        this.container.replaceChildren(
            FluentUI.Card({ title: t('demo.title'), content: t('demo.welcome') })
        );
    },

    openData(data = {}) {},

    beforeClose() {
        this.frame?.destroy();
        this.frame = null;
        return true;
    }
};

window.DemoApp = DemoApp;
```

App components are singletons. Register the app in `WindowManager.appConfigs`, add metadata to `Desktop.apps`, optionally add it to `startPinnedApps`, include its script in `index.html`, and provide an icon, translations, and styles.

Complex apps should use `FluentWindow.mount()` for internal navigation:

```javascript
this.frame = FluentWindow.mount({
    container: this.container,
    items: [{ id: 'home', label: t('demo.home'), icon: 'Home' }],
    footerItems: [{ id: 'settings', label: t('settings.title'), icon: 'Settings' }],
    activeId: 'home',
    preserveScrollPositions: true,
    onNavigate: (id, pageEl) => this.renderPage(id, pageEl)
});
```

## 8. Widgets

Definitions live in `js/ui/widget-defs.js`; layout and interaction are handled by `js/ui/widgets.js`. A variant defines grid size, theme, defaults, rendering, and optional interaction:

```javascript
{
    id: 'demo-small',
    w: 2,
    h: 2,
    sizeKey: 'widgets.size.small',
    theme: 'w-demo',
    defaultSettings: { mode: 'compact' },
    render(body, ctx) { body.textContent = ctx.instance.settings.mode; },
    onClick() { WindowManager.openApp('demo'); }
}
```

Use `WidgetData` for cached asynchronous data and stop timers, observers, and listeners when widget DOM is removed.

## 9. Third-party Web/PWA Apps

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

Catalog entries are stored in `js/third_parts_apps/pwa-catalog.js`. Cross-origin iframe DOM cannot be read, and sites may reject embedding, cookies, popups, downloads, autoplay, or permissions. Cooperative apps can listen for `fluentos:tombstone` messages with `freeze` and `restore` actions.

Only entries whose ID and URL exactly match the source-controlled catalog, and Developer Center PWAs with a declared and approved `storage.local` permission, receive `allow-same-origin` in the iframe sandbox. This lets the PWA use `localStorage`, sign-in state, and other same-origin data belonging to its own site origin. Other PWAs remain on an opaque origin; direct calls to `PWALoader.register()` cannot expand that authority.

## 10. Apps Created in Developer Center

Apps packaged by Developer Center run in sandboxed iframes and can request host capabilities only through the injected asynchronous `FluentOS` bridge. They cannot directly access the host document or ordinary browser storage. A project must declare `storage.local` before using `FluentOS.storage`; clipboard access requires `clipboard.read`, `clipboard.write`, or both. Calls remain subject to the authorization snapshot and browser security policies.

Preview windows always receive a read-only capability profile. They inherit none of the project's declared permissions or network allowlists and may only read system theme/state/language and window information. Notifications, local storage, window or theme mutation, files, desktop, clipboard, and network calls are rejected. Test those capabilities only after the App passes safety validation, receives user approval, and runs in a normal window.

After `storage.local` is granted, each created App has a separate namespace for `FluentOS.storage`, with these UTF-8 quotas:

- 512 KiB total data.
- At most 128 keys.
- At most 100 KiB for one JSON-serialized value.

The bridge uses a one-time, token-bound window handshake to establish a dedicated `MessageChannel`; subsequent API requests and host-state updates travel only over the port transferred to that iframe. When a window is mounted, the runtime creates an immutable authorization snapshot containing the App identity, name, read-only state, approved permissions, and network-domain allowlists. Editing or re-registering the project cannot expand the authority of an already-open iframe; close and reopen it to apply a newly approved configuration.

## 11. Network, Permissions, and Security

- Provide loading, failure, timeout, and offline fallback states for remote data.
- Prefer `textContent`; escape third-party text before writing it to `innerHTML`.
- Validate URL protocols and use `noopener,noreferrer` for external windows.
- Stop every camera track when closing a stream.
- Never place API keys in source code, logs, the virtual file system, or plain persistent fields.
- Keep strict CSP sources minimal and provide a no-network fallback.
- Client storage and browser-side encryption are not trusted secret stores.

## 12. Debugging

```javascript
FluentOS.version;
FluentOS.openApp('settings');
FluentOS.closeAllWindows();
FluentOS.debug.getState();
FluentOS.debug.getWindows();
FluentOS.debug.resources.start();
FluentOS.debug.resources.table();
FluentOS.debug.resources.summary();
FluentOS.debug.resources.stop();
```

Developer-created professional Apps can call notifications and host-rendered system dialogs through the asynchronous bridge:

```javascript
await FluentOS.notify('Task complete', 'The file was saved.', 'success');
await FluentOS.alert('Notice', 'This dialog is rendered by the host system.');
const confirmed = await FluentOS.confirm('Delete project', 'This action cannot be undone.');
const result = await FluentOS.dialog({
    title: 'Choose an action',
    message: 'Select what to do next.',
    buttons: [
        { text: 'Cancel', value: 'cancel', variant: 'secondary' },
        { text: 'Continue', value: 'continue', variant: 'primary' }
    ]
});
```

`notify()` writes to Notification Center and shows an immediate Toast. `alert()`, `confirm()`, and `dialog()` are rendered by the host, with titles, messages, and button labels treated as plain text.

## 13. Pre-commit Checklist

- `scripts/validate-project.ps1` passes; if runtime resources changed, manifests were regenerated in resource → storage order.
- OOBE, lock, login, and desktop work from cleared site data.
- Light/dark themes, accent colors, disabled animation, and disabled blur remain usable.
- Apps open, resize, snap, minimize, maximize, close, and reopen correctly.
- Minimum window sizes do not hide critical controls.
- Chinese/English changes update titles, navigation, and dynamic content.
- Settings, files, window bounds, and app data survive refreshes.
- Offline mode and denied camera/geolocation permissions fail gracefully.
- No new unhandled errors, duplicated listeners, or orphaned timers appear.
