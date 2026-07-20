# FluentOS-On-Web 2.0

[简体中文](README.md) | [English](README_EN.md)

A simulated operating-system interface built with vanilla HTML, CSS, and JavaScript and a custom design language.
An operating-system project independently created by a high-school student.
The project was built with AI-assisted programming and without manual code adjustments. Special thanks to Codex.

## Why Build This System?

Because I wanted to create my “dream OS”: nearly bug-free and extremely fast.

## ✨ Features

- 🚀 Complete system flow: boot → lock screen → login → desktop
- 💾 Local persistence with `localStorage`
- 🎨 Fluent Design-inspired interface with glass, rounded corners, and shadows
- 🌓 Light and dark theme support
- 📱 Responsive design, with the best experience at widths of 1024 px or above
- ⚡ Vanilla implementation with no framework dependencies

Current system version: `2.3.260720C` (see `js/core/resource-manifest.js`).

> FluentOS-On-Web is a web desktop simulation, not an operating system. Files, settings, and “installed apps” are primarily stored in the current browser. It cannot access or manage the host system's real accounts, processes, or complete file system.

## Main Capabilities

- Complete system flow: resource preload, OOBE, lock screen, PIN login, desktop, shutdown, restart, and sign-out.
- Fluent-inspired appearance: light and dark themes, accent colors, wallpaper color extraction, glass materials, blur, animation, and button glow effects.
- Desktop and taskbar: icon selection and drag-and-drop, Start menu, search, quick settings, Notification Center, Task View, and app switching.
- Window management: dragging, eight-way resizing, minimizing, maximizing, z-order management, edge snapping, hover layouts, position memory, and background freezing.
- Desktop and lock-screen widgets: weather, clock, calendar, photos, media, quick notes, search, favorites, news, lunar calendar, parcel tracking, holidays, and more.
- Local persistence for settings, sessions, the virtual file system, desktop layout, notifications, and app usage history.
- Chinese and English interfaces powered by `I18n` and the global `t()` function.
- Fingo assistant with built-in local commands and optional OpenAI or SiliconFlow-compatible APIs.
- Lingyi interaction mode, which loads MediaPipe on demand to support camera-based gesture controls.
- App Shop for managing built-in apps and a catalog of third-party Web/PWA apps displayed in standalone iframe windows.

## Built-in Apps

| App | Main features |
| --- | --- |
| Files | Virtual folders, search, breadcrumb navigation, Recycle Bin, external file import, and cross-app file opening |
| Settings | Accounts, network, personalization, apps, multitasking, time and language, privacy, Fingo, Labs, and developer options |
| Process Manager | Inspect application resource usage and manage running applications |
| Terminal | Work with FluentOS virtual files and system features through a controlled command environment |
| Tips | Browse FluentOS feature introductions and usage tips |
| Calculator | Standard and scientific calculations, history, and keyboard input |
| Notes | Tabbed rich-text editing, virtual file access, external text import, HTML export, and teleprompter mode |
| Browser | Tabs, address/search input, history, and favorite sites; pages are loaded through iframes |
| Clock | Timer, stopwatch, world clock, and calendar |
| Weather | City search, geolocation, current conditions, and forecasts using Open-Meteo and other online services |
| Camera | Camera preview, photos, video recording, and media saving; browser permission is required |
| Photos | Bing, local, and favorite galleries; viewing, zooming, rotating, flipping, adjustments, downloads, and wallpaper controls |
| Media | Local media library, play queue, playlists, Media Session integration, and playback-state restoration |
| App Shop | Built-in app management and a third-party web app catalog |

These are the 14 native apps shown in the desktop app list by default. Developer Center (BETA) is also built in, but hidden by default; turn off “Hide Developer Center” under Settings → Labs to show it.

## Quick Start

The project has no npm runtime dependencies, bundler, or compilation step. Run it through a local HTTP server. Opening `index.html` directly is not recommended because the `file://` protocol restricts `fetch`, resource loading, and several browser permissions.

```powershell
# Run one of these commands from the project root
python -m http.server 8000
npx http-server . -p 8000
```

Then open <http://localhost:8000/>.

The OOBE appears on the first visit. When no first-run data exists, it guides you through language, wallpaper, account avatar, and related options. The default PIN in the initial settings is `1234`; it can be changed later in Settings.

### Browser Support and Permissions

The latest Chromium-based browsers are recommended. Most of the interface also works in Firefox and Safari, but file pickers, Media Session, fullscreen, and camera behavior may differ.

- Camera, clipboard, geolocation, fullscreen, and file-picker access are controlled by the browser. They generally require `localhost` or HTTPS and explicit user permission.
- Weather, Bing wallpapers, widgets, custom Fingo models, and Lingyi depend on the network and third-party services.
- Some sites block iframe embedding through `X-Frame-Options` or CSP. Those pages may not appear in App Shop or Browser, and FluentOS cannot bypass this restriction.
- Fingo API keys are sensitive. Prefer temporary storage. Permanent mode uses browser-side encryption, but keys should still not be configured on untrusted devices.

## Keyboard Shortcuts

These shortcuts apply in the desktop view and do not intercept `Ctrl` or `Meta` combinations.

| Shortcut | Action |
| --- | --- |
| `Alt` | Open or close the Start menu |
| `Alt+F` | Open or close Fingo |
| `Alt+I` | Open Settings |
| `Alt+L` | Lock the desktop |
| `Alt+E` | Open Files |
| `Alt+A` | Open or close Control Center |
| `Alt+C` | Open the app switcher; press again to cycle |
| `Alt+D` | Minimize all windows |
| `Alt+M` | Minimize the topmost window |
| `Alt+W` | Open or close Task View |
| `Esc` | Close the current panel, Task View, or editing state, depending on context |
| `Ctrl+A` | Select all desktop icons when no window is active |
| `Delete` | Delete selected desktop items when no window is active |
| `Ctrl+S` / `Cmd+S` | Save the current draft in Notes |

## Project Structure

```text
FluentOS-On-Web 2.0/
├─ index.html                 # Page shell and ordered stylesheet/script loading
├─ css/
│  ├─ main.css               # Base system styles, theme tokens, and window shell
│  ├─ fluent-ui.css          # FluentUI components and materials
│  ├─ fluent-window.css      # In-app navigation framework
│  ├─ apps-unified.css       # Shared built-in app styles
│  └─ ...                    # OOBE, Start, notifications, widgets, and other styles
├─ js/
│  ├─ core/                  # Storage, state, i18n, components, Fingo, Lingyi, and more
│  ├─ ui/                    # System screens, desktop, taskbar, windows, and widgets
│  ├─ apps/                  # 14 default desktop native apps, plus the hidden-by-default Developer Center
│  ├─ third_parts_apps/      # PWA loader and third-party app catalog
│  └─ main.js                # Initialization, global shortcuts, public API, and debug tools
├─ Theme/
│  ├─ Icon/                  # App icons and stroke/fill/colour symbol icons
│  ├─ Picture/               # Built-in wallpapers
│  ├─ Profile_img/           # User avatars
│  ├─ Preload/               # OOBE preload assets
│  └─ illustrations/         # Settings and OOBE illustrations
└─ docs/
   ├─ DEVELOPER_GUIDE.md     # Architecture, data, extension, and debugging guide
   └─ fluent-ui-guide.md     # Design tokens and component APIs
```

## Data and Privacy

Core data is stored in `localStorage` for the current site origin:

| Key | Contents |
| --- | --- |
| `fluentos.settings` | Theme, user profile, window behavior, Fingo, and experimental settings |
| `fluentos.session` | Login state and login attempts |
| `fluentos.fs` | Virtual file system; large inline payloads are removed to protect startup performance |
| `fluentos.desktopLayout` | Desktop icon layout |
| `fluentos.appUsage` | App usage timestamps |
| `fluentos.notifications` | Notification list |

Photos and Media also use IndexedDB for larger Blob data, while several modules use their own `localStorage` keys. Clearing site data resets the system and deletes virtual files and media libraries. Export important content first.

## Development and Debugging

The browser console exposes the global `FluentOS` API:

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

System controls include `FluentOS.restart()`, `shutdown()`, `logout()`, and `closeAllWindows()`. `FluentOS.debug.clearStorage()` asks for confirmation before clearing all local data for the current site.

### Resource Manifests and Unified Validation

After changing runtime resources under `index.html`, `js/`, `css/`, or `Theme/`, generate the content-hash resource manifest first, then the storage manifest that records the former's file size. Do not edit either generated file by hand:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\generate-resource-manifest.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\generate-storage-manifest.ps1
```

Pass `-Check` to either generator when you only want to verify that its output is current. Before committing, run the unified validator; it invokes both manifest checks with `-Check` and also validates entries, resource references, and JavaScript syntax when Node.js is available:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-project.ps1
```

Further documentation:

- [Developer Guide](docs/DEVELOPER_GUIDE_EN.md)
- [Fluent UI Guide](docs/fluent-ui-guide-en.md)

## Contributing

1. Make changes on a feature branch and preserve the dependency order of scripts in `index.html`.
2. Reuse `FluentUI`, `FluentWindow`, theme variables, and existing icons for new interfaces.
3. Add both Chinese and English entries to `js/core/i18n.js` for user-facing text.
4. After changing runtime resources, generate manifests in resource → storage order and run the unified project validation.
5. Test at least light/dark themes, window resizing, persistence after refresh, and offline behavior.

## License

[MIT License](LICENSE)
