/** FluentOS Terminal - a command interface for local Web OS controls. */
const TerminalApp = {
    windowId: null,
    container: null,
    history: [],
    historyIndex: 0,
    pendingPower: null,
    pendingProfileClear: false,
    profilePinAttempts: 0,
    currentDirectory: '/home/owner',

    init(windowId) {
        this.windowId = windowId;
        this.container = document.getElementById(`${windowId}-content`);
        this.history = Storage.get('terminal_history') || [];
        this.historyIndex = this.history.length;
        this.currentDirectory = '/home/owner';
        this.render();
    },

    render() {
        this.addStyles();
        this.container.innerHTML = `
            <div class="terminal-app" role="application" aria-label="Terminal">
                <div class="terminal-toolbar">
                    <span class="terminal-session-dot"></span><span>FluentOS Shell</span>
                    <button type="button" data-action="clear" title="Clear terminal">Clear</button>
                </div>
                <div class="terminal-output" role="log" aria-live="polite"></div>
                <div class="terminal-input-row">
                    <label for="${this.windowId}-terminal-input"><span class="terminal-user">owner@fluentos</span><span class="terminal-path"> ~</span><span class="terminal-prompt"> ❯</span></label>
                    <input id="${this.windowId}-terminal-input" class="terminal-input" autocomplete="off" spellcheck="false" aria-label="Command input">
                </div>
            </div>`;
        this.output = this.container.querySelector('.terminal-output');
        this.input = this.container.querySelector('.terminal-input');
        this.print('FluentOS Terminal 2.0.0', 'banner');
        this.print('Type help to list commands. Tab completes commands; Up/Down recalls history.', 'muted');
        this.container.querySelector('[data-action="clear"]').addEventListener('click', () => this.clear());
        this.input.addEventListener('keydown', (event) => this.onKeyDown(event));
        this.container.querySelector('.terminal-app').addEventListener('mousedown', () => this.input.focus());
        requestAnimationFrame(() => this.input.focus());
    },

    addStyles() {
        if (document.getElementById('terminal-app-styles')) return;
        const style = document.createElement('style');
        style.id = 'terminal-app-styles';
        style.textContent = `
            .terminal-app{height:100%;display:flex;flex-direction:column;background:#0c0c0c;color:#e7e7e7;font:14px/1.55 "Cascadia Code","SFMono-Regular",Consolas,monospace;overflow:hidden}
            .terminal-toolbar{height:38px;box-sizing:border-box;display:flex;align-items:center;gap:9px;padding:0 14px;background:#171717;border-bottom:1px solid #2a2a2a;color:#bbb;font-size:12px;flex:none}
            .terminal-session-dot{width:8px;height:8px;border-radius:50%;background:#58d68d;box-shadow:0 0 8px #58d68d}
            .terminal-toolbar button{margin-left:auto;border:0;border-radius:5px;padding:4px 9px;background:transparent;color:#aaa;font:inherit;cursor:pointer}.terminal-toolbar button:hover{background:#303030;color:#fff}
            .terminal-output{flex:1;overflow:auto;padding:16px 18px 4px;white-space:pre-wrap;word-break:break-word;user-select:text}
            .terminal-line{min-height:1.55em}.terminal-line.command{color:#fff}.terminal-line.command::before{content:attr(data-prompt);color:#5ee78d}.terminal-line.error{color:#ff6b6b}.terminal-line.success{color:#62d995}.terminal-line.muted{color:#858585}.terminal-line.banner{color:#6cb6ff;font-weight:700}
            .terminal-input-row{display:flex;align-items:flex-start;gap:8px;padding:7px 18px 16px;flex:none}.terminal-input-row label{white-space:nowrap}.terminal-user{color:#5ee78d}.terminal-path{color:#6cb6ff}.terminal-prompt{color:#ddd}
            .terminal-input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#fff;font:inherit;caret-color:#fff;padding:0}
            .terminal-table{color:#d7d7d7}.terminal-accent{color:#6cb6ff}
            .terminal-fetch{display:flex;align-items:flex-start;gap:28px;margin:6px 0 12px;min-width:max-content}
            .terminal-fetch-logo{margin:0;color:#36a3ff;font:700 12px/1.08 "Cascadia Code","SFMono-Regular",Consolas,monospace;white-space:pre;text-shadow:0 0 12px rgba(54,163,255,.22)}
            .terminal-fetch-info{display:flex;flex-direction:column;min-width:310px;line-height:1.55}
            .terminal-fetch-title{color:#62d995;font-weight:700}
            .terminal-fetch-separator{color:#777}
            .terminal-fetch-key{display:inline-block;min-width:92px;color:#6cb6ff;font-weight:700}
            .terminal-fetch-colors{display:flex;gap:0;margin-top:8px}.terminal-fetch-color{width:24px;height:13px}
            body:not(.dark-mode) .terminal-app{color:#202020}
            body:not(.dark-mode) .terminal-toolbar{color:#4f4f4f;border-bottom-color:rgba(0,0,0,.2)}
            body:not(.dark-mode) .terminal-session-dot{background:#16833d;box-shadow:0 0 7px rgba(22,131,61,.45)}
            body:not(.dark-mode) .terminal-toolbar button{color:#555}
            body:not(.dark-mode) .terminal-toolbar button:hover{background:rgba(0,0,0,.08);color:#111}
            body:not(.dark-mode) .terminal-line.command{color:#111}
            body:not(.dark-mode) .terminal-line.command::before{color:#087f5b}
            body:not(.dark-mode) .terminal-line.error{color:#c42b1c}
            body:not(.dark-mode) .terminal-line.success{color:#107c10}
            body:not(.dark-mode) .terminal-line.muted{color:#5f5f5f}
            body:not(.dark-mode) .terminal-line.banner{color:#0067c0}
            body:not(.dark-mode) .terminal-user{color:#087f5b}
            body:not(.dark-mode) .terminal-path{color:#005fb8}
            body:not(.dark-mode) .terminal-prompt{color:#333}
            body:not(.dark-mode) .terminal-input{color:#111;caret-color:#111}
            body:not(.dark-mode) .terminal-table{color:#262626}
            body:not(.dark-mode) .terminal-accent{color:#005fb8}
            body:not(.dark-mode) .terminal-fetch-logo{color:#0067c0;text-shadow:0 0 10px rgba(0,103,192,.18)}
            body:not(.dark-mode) .terminal-fetch-title{color:#087f5b}
            body:not(.dark-mode) .terminal-fetch-separator{color:#666}
            body:not(.dark-mode) .terminal-fetch-key{color:#005fb8}
            @media (max-width:720px){.terminal-fetch{min-width:0;flex-direction:column;gap:12px}.terminal-fetch-logo{font-size:10px}.terminal-fetch-info{min-width:0}}
        `;
        document.head.appendChild(style);
    },

    print(text = '', type = '') {
        const line = document.createElement('div');
        line.className = `terminal-line ${type}`;
        if (type === 'command') line.dataset.prompt = `owner@fluentos ${this.currentDirectory === '/home/owner' ? '~' : this.currentDirectory} ❯ `;
        line.textContent = String(text);
        this.output.appendChild(line);
        this.output.scrollTop = this.output.scrollHeight;
    },

    clear() { this.output.innerHTML = ''; },

    onKeyDown(event) {
        if (this.pendingProfileClear && (event.key === 'Escape' || (event.ctrlKey && event.key.toLowerCase() === 'c'))) {
            event.preventDefault();
            this.cancelProfileClear();
            return;
        }
        if (event.key === 'Enter') {
            const raw = this.input.value.trim();
            this.input.value = '';
            if (!raw) return;
            if (this.pendingProfileClear) {
                if (raw.toLowerCase() === 'cancel') {
                    this.cancelProfileClear();
                    return;
                }
                this.handleProfilePin(raw);
                return;
            }
            this.print(raw, 'command');
            if (this.history[this.history.length - 1] !== raw) this.history.push(raw);
            this.history = this.history.slice(-100);
            Storage.set('terminal_history', this.history);
            this.historyIndex = this.history.length;
            Promise.resolve(this.execute(raw)).catch(error => this.print(error.message || error, 'error'));
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            this.historyIndex = Math.max(0, Math.min(this.history.length, this.historyIndex + (event.key === 'ArrowUp' ? -1 : 1)));
            this.input.value = this.history[this.historyIndex] || '';
            requestAnimationFrame(() => this.input.setSelectionRange(this.input.value.length, this.input.value.length));
        } else if (event.key === 'Tab') {
            event.preventDefault();
            const prefix = this.input.value.trim().toLowerCase();
            const names = this.commandNames().filter(name => name.startsWith(prefix));
            if (names.length === 1) this.input.value = `${names[0]} `;
            else if (names.length > 1) this.print(names.join('  '), 'muted');
        } else if (event.ctrlKey && event.key.toLowerCase() === 'l') {
            event.preventDefault(); this.clear();
        }
    },

    commandNames() { return ['help','man','clear','history','echo','date','whoami','hostname','pwd','cd','ls','uname','neofetch','fluentfetch','ps','kill','xdg-open','fluentctl','systemctl','loginctl','shutdown','reboot','poweroff','exit','sudo','cancel']; },
    args(raw) {
        const result = [];
        let token = '', quote = '', escaped = false;
        for (const char of String(raw || '')) {
            if (escaped) { token += char; escaped = false; continue; }
            if (char === '\\' && quote !== "'") { escaped = true; continue; }
            if (quote) { if (char === quote) quote = ''; else token += char; continue; }
            if (char === '"' || char === "'") { quote = char; continue; }
            if (/\s/.test(char)) { if (token) { result.push(token); token = ''; } continue; }
            token += char;
        }
        if (escaped) token += '\\';
        if (quote) throw new Error(`shell: unmatched ${quote} quote`);
        if (token) result.push(token);
        return result;
    },
    boolArg(value) { return ({ on:true, off:false })[String(value || '').toLowerCase()]; },
    findApp(query) {
        const q = String(query || '').toLowerCase();
        return Desktop.apps.find(app => app.id.toLowerCase() === q || Desktop.getAppName(app).toLowerCase() === q)
            || null;
    },
    appName(app) {
        return app?.nameKey
            ? (I18n.translations?.en?.[app.nameKey] || app.id)
            : (app?.name || app?.id || 'unknown');
    },
    getWindow(query) {
        const app = this.findApp(query);
        return app ? WindowManager.windows.find(w => w.appId === app.id) : null;
    },

    async execute(raw) {
        const argv = this.args(raw);
        const elevated = argv[0]?.toLowerCase() === 'sudo';
        if (elevated) argv.shift();
        const command = (argv.shift() || '').toLowerCase();
        if (this.pendingPower && command !== 'cancel') {
            if (['yes','y'].includes(command)) { const action = this.pendingPower; this.pendingPower = null; this.print(`Confirmed: ${action}`, 'success'); setTimeout(() => State[action](), 250); return; }
            this.print('A power action is awaiting confirmation. Type yes to confirm or cancel to abort.', 'error'); return;
        }
        switch (command) {
            case '': return this.print('sudo: a command is required', 'error');
            case 'help': return this.showHelp(argv[0] || '');
            case 'man': return this.showManual(argv[0] || 'fluentctl');
            case 'clear': if (argv.length) return this.usage('clear'); return this.clear();
            case 'history': return this.print(this.history.map((v,i) => `${String(i + 1).padStart(3)}  ${v}`).join('\n') || 'No command history.', 'muted');
            case 'echo': return this.print(argv.join(' '));
            case 'date': return this.print(new Date().toLocaleString());
            case 'whoami': return this.print(State.settings.userName || 'Owner');
            case 'hostname': return this.print(State.settings.deviceName || 'FLUENTOS-PC');
            case 'pwd': if (argv.length) return this.usage('pwd'); return this.print(this.currentDirectory);
            case 'cd': return this.changeDirectory(argv);
            case 'ls': return this.listPath(argv);
            case 'uname': return this.uname(argv);
            case 'neofetch': case 'fluentfetch':
                if (argv.length === 1 && ['--help','-h'].includes(argv[0])) return this.showManual('neofetch');
                if (argv.length) return this.usage('neofetch');
                return this.printSystemFetch();
            case 'ps': return this.listProcesses(argv);
            case 'kill': return this.killProcess(argv);
            case 'xdg-open': return this.xdgOpen(argv);
            case 'fluentctl': return this.fluentctl(argv, elevated);
            case 'systemctl': return this.systemctl(argv);
            case 'loginctl': return this.loginctl(argv);
            case 'shutdown': return this.shutdownCommand(argv);
            case 'reboot': if (argv.length) return this.usage('reboot'); return this.requestPower('restart');
            case 'poweroff': if (argv.length) return this.usage('poweroff'); return this.requestPower('shutdown');
            case 'exit': return WindowManager.closeWindow(this.windowId);
            case 'cancel': this.pendingPower = null; return this.print('Cancelled.', 'success');
            default: return this.print(`${command}: command not found`, 'error');
        }
    },

    showHelp(topic) {
        if (topic) return this.showManual(topic);
        this.print([
            'FluentOS shell commands:',
            '  help, man, clear, history, echo, date, whoami, hostname',
            '  pwd, cd, ls, uname, neofetch, ps, kill, xdg-open, exit',
            '  systemctl, loginctl, shutdown, reboot, poweroff',
            '',
            'FluentOS system control:',
            '  fluentctl <object> <action> [arguments]',
            '  fluentctl --help',
            '',
            "Run 'man <command>' for detailed usage."
        ].join('\n'));
    },
    showManual(topic) {
        const pages = {
            fluentctl: [
                'FLUENTCTL(1)                 FluentOS Manual', '',
                'NAME', '    fluentctl - control FluentOS services and desktop state', '',
                'SYNOPSIS', '    fluentctl <object> <action> [arguments]', '',
                'OBJECTS',
                '    status',
                '    app list | open <app-id>',
                '    window list | close|minimize|maximize <app-id|--all>',
                '    appearance theme <light|dark|auto>',
                '    appearance blur|animation <on|off>',
                '    appearance wallpaper',
                '    display brightness <20-100|+10|-10>',
                '    sound volume <0-100|+10|-10> | mute',
                '    radio wifi|bluetooth <on|off>',
                '    panel taskview|control|notifications toggle',
                '    media play|pause|next|previous',
                '    locale set <zh|en>',
                '    developer open|hide|status',
                '    user reset    (requires sudo and lock-screen PIN)'
            ],
            ls: ['LS(1)', '', 'SYNOPSIS', '    ls [PATH]', '', 'PATHS', '    /home/owner', '    /usr/share/applications', '    /proc/windows'],
            ps: ['PS(1)', '', 'SYNOPSIS', '    ps [-a]', '', 'Lists FluentOS app windows as processes.'],
            kill: ['KILL(1)', '', 'SYNOPSIS', '    kill [-TERM|-STOP|-CONT|-9] <PID|APP-ID>'],
            'xdg-open': ['XDG-OPEN(1)', '', 'SYNOPSIS', '    xdg-open app://<app-id>', '    xdg-open settings://<page-id>'],
            systemctl: ['SYSTEMCTL(1)', '', 'SYNOPSIS', '    systemctl reboot', '    systemctl poweroff'],
            loginctl: ['LOGINCTL(1)', '', 'SYNOPSIS', '    loginctl lock-session', '    loginctl terminate-user'],
            shutdown: ['SHUTDOWN(8)', '', 'SYNOPSIS', '    shutdown -h now', '    shutdown -r now'],
            uname: ['UNAME(1)', '', 'SYNOPSIS', '    uname [-a|-s|-r|-m]'],
            neofetch: ['NEOFETCH(1)', '', 'NAME', '    neofetch - display FluentOS system information', '', 'SYNOPSIS', '    neofetch', '    fluentfetch']
        };
        const page = pages[String(topic || '').toLowerCase()];
        if (!page) return this.print(`No manual entry for ${topic}`, 'error');
        this.print(page.join('\n'));
    },
    usage(command) {
        const messages = {
            clear: 'Usage: clear', pwd: 'Usage: pwd', reboot: 'Usage: reboot', poweroff: 'Usage: poweroff',
            cd: 'Usage: cd [DIRECTORY]', ls: 'Usage: ls [PATH]', uname: 'Usage: uname [-a|-s|-r|-m]', neofetch: 'Usage: neofetch',
            ps: 'Usage: ps [-a]', kill: 'Usage: kill [-TERM|-STOP|-CONT|-9] <PID|APP-ID>',
            'xdg-open': 'Usage: xdg-open <app://APP-ID|settings://PAGE-ID>',
            systemctl: 'Usage: systemctl <reboot|poweroff>', loginctl: 'Usage: loginctl <lock-session|terminate-user>',
            shutdown: 'Usage: shutdown <-h|-r> now', fluentctl: "Usage: fluentctl <object> <action> [arguments] (try 'fluentctl --help')"
        };
        this.print(messages[command] || `Usage error: ${command}`, 'error');
    },
    resolvePath(target = '.') {
        const source = String(target || '.');
        const parts = (source.startsWith('/') ? source : `${this.currentDirectory}/${source}`).split('/');
        const normalized = [];
        parts.forEach(part => {
            if (!part || part === '.') return;
            if (part === '..') normalized.pop();
            else normalized.push(part);
        });
        return `/${normalized.join('/')}`;
    },
    changeDirectory(argv) {
        if (argv.length > 1) return this.usage('cd');
        const target = argv[0] || '/home/owner';
        const directories = new Set(['/', '/home', '/home/owner', '/usr', '/usr/share', '/usr/share/applications', '/proc', '/proc/windows']);
        const resolved = target === '~' ? '/home/owner' : this.resolvePath(target);
        if (!directories.has(resolved)) return this.print(`cd: ${target}: No such file or directory`, 'error');
        this.currentDirectory = resolved;
        const path = this.container?.querySelector('.terminal-path');
        if (path) path.textContent = ` ${resolved === '/home/owner' ? '~' : resolved}`;
    },
    listPath(argv) {
        if (argv.length > 1 || argv[0]?.startsWith('-')) return this.usage('ls');
        const requestedPath = argv[0] || this.currentDirectory;
        const path = requestedPath === '~' ? '/home/owner' : this.resolvePath(requestedPath);
        const entries = {
            '/': 'home  proc  usr',
            '/home': 'owner',
            '/home/owner': 'Desktop  Documents  Downloads  Music  Pictures  Videos',
            '/usr': 'share',
            '/usr/share': 'applications',
            '/proc': 'windows',
            '/usr/share/applications': Desktop.apps.map(app => `${app.id}.desktop`).join('  '),
            '/proc/windows': WindowManager.windows.map((w, i) => `${1000 + i}-${w.appId}`).join('  ') || ''
        };
        if (!(path in entries)) return this.print(`ls: cannot access '${requestedPath}': No such file or directory`, 'error');
        this.print(entries[path]);
    },
    uname(argv) {
        if (argv.length > 1 || (argv[0] && !['-a','-s','-r','-m'].includes(argv[0]))) return this.usage('uname');
        const flag = argv[0] || '-s';
        const version = this.getSystemVersion();
        const values = { '-s':'FluentOS', '-r':version, '-m':'web', '-a':`FluentOS fluentos ${version} FluentOS-Web web` };
        this.print(values[flag]);
    },
    getSystemVersion() {
        return String(globalThis.FluentOSResourceManifest?.systemVersion || globalThis.FluentOS?.version || 'unknown');
    },
    formatUptime(milliseconds) {
        let seconds = Math.max(0, Math.floor(Number(milliseconds || 0) / 1000));
        const days = Math.floor(seconds / 86400); seconds %= 86400;
        const hours = Math.floor(seconds / 3600); seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        const parts = [];
        if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`);
        if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
        parts.push(`${minutes} min`);
        return parts.join(', ');
    },
    getMemorySummary() {
        const memory = globalThis.performance?.memory;
        if (memory?.usedJSHeapSize && memory?.jsHeapSizeLimit) {
            const toMiB = value => Math.round(value / 1048576);
            return `${toMiB(memory.usedJSHeapSize)} MiB / ${toMiB(memory.jsHeapSizeLimit)} MiB`;
        }
        const deviceMemory = globalThis.navigator?.deviceMemory;
        return deviceMemory ? `${deviceMemory} GiB available to device` : 'Browser managed';
    },
    printSystemFetch() {
        const logo = [
            '             FFFFFFFFFFFFFFF',
            '          FFFF             FFF',
            '        FFFF              FFF ',
            '       FFF          FFFFFFF  ',
            '      FFF       FFFFF        ',
            '     FFF      FFF            ',
            '    FFF       FFFFFFFFFF     ',
            '   FFF                  FFF  ',
            '  FFF        FFFFFFFFFFFF    ',
            '   FFFFF   FFF               ',
            '      FF  FFF                ',
            '      FF FFF                 ',
            '      FFFFF                  ',
            '     FFFF                    ',
            '    FFF                      '
        ].join('\n');
        const owner = String(State.settings.userName || 'Owner').trim() || 'Owner';
        const host = String(State.settings.deviceName || 'fluentos').trim() || 'fluentos';
        const resolution = globalThis.screen
            ? `${globalThis.screen.width}x${globalThis.screen.height} @${globalThis.devicePixelRatio || 1}x`
            : `${globalThis.innerWidth || 0}x${globalThis.innerHeight || 0}`;
        const nativeCount = Desktop.apps.filter(app => app.isPWA !== true).length;
        const pwaCount = Desktop.apps.length - nativeCount;
        const rows = [
            ['OS', `FluentOS Web ${this.getSystemVersion()}`],
            ['Host', host],
            ['Kernel', `FluentOS ${this.getSystemVersion()}`],
            ['Uptime', this.formatUptime(globalThis.performance?.now?.() || 0)],
            ['Packages', `${Desktop.apps.length} (${nativeCount} native, ${pwaCount} web)`],
            ['Shell', 'FluentOS Shell 2.0.0'],
            ['Resolution', resolution],
            ['DE', 'Fluent Desktop'],
            ['WM', 'Fluent Window Manager'],
            ['Theme', State.settings.theme || 'light'],
            ['Terminal', 'fluent-terminal'],
            ['CPU', `Web Runtime (${globalThis.navigator?.hardwareConcurrency || 1} threads)`],
            ['Memory', this.getMemorySummary()]
        ];

        const fetch = document.createElement('div');
        fetch.className = 'terminal-fetch';
        const logoElement = document.createElement('pre');
        logoElement.className = 'terminal-fetch-logo';
        logoElement.textContent = logo;
        const info = document.createElement('div');
        info.className = 'terminal-fetch-info';
        const title = document.createElement('div');
        title.className = 'terminal-fetch-title';
        title.textContent = `${owner.toLowerCase().replace(/\s+/g, '-')}@${host.toLowerCase().replace(/\s+/g, '-')}`;
        const separator = document.createElement('div');
        separator.className = 'terminal-fetch-separator';
        separator.textContent = '─'.repeat(Math.max(18, title.textContent.length));
        info.append(title, separator);
        rows.forEach(([key, value]) => {
            const row = document.createElement('div');
            const keyElement = document.createElement('span');
            keyElement.className = 'terminal-fetch-key';
            keyElement.textContent = `${key}:`;
            row.append(keyElement, document.createTextNode(value));
            info.appendChild(row);
        });
        const palette = document.createElement('div');
        palette.className = 'terminal-fetch-colors';
        ['#111827','#c42b1c','#107c10','#c19c00','#0067c0','#7a3e9d','#008b8b','#d8d8d8'].forEach(color => {
            const swatch = document.createElement('span');
            swatch.className = 'terminal-fetch-color';
            swatch.style.background = color;
            palette.appendChild(swatch);
        });
        info.appendChild(palette);
        fetch.append(logoElement, info);
        this.output.appendChild(fetch);
        this.output.scrollTop = this.output.scrollHeight;
    },
    listProcesses(argv) {
        if (argv.length > 1 || (argv[0] && argv[0] !== '-a')) return this.usage('ps');
        const rows = ['  PID STAT COMMAND'];
        WindowManager.windows.forEach((w, i) => rows.push(`${String(1000 + i).padStart(5)} ${w.isMinimized ? 'S' : 'R'}    ${w.appId}`));
        this.print(rows.join('\n'));
    },
    resolveProcess(target) {
        if (/^\d+$/.test(String(target || ''))) return WindowManager.windows[Number(target) - 1000] || null;
        return this.getWindow(target);
    },
    killProcess(argv) {
        let signal = '-TERM';
        if (argv[0]?.startsWith('-')) signal = argv.shift().toUpperCase();
        if (argv.length !== 1 || !['-TERM','-STOP','-CONT','-9'].includes(signal)) return this.usage('kill');
        const target = argv[0], process = this.resolveProcess(target);
        if (!process) return this.print(`kill: (${target}) - No such process`, 'error');
        if (signal === '-STOP') WindowManager.minimizeWindow(process.id);
        else if (signal === '-CONT') WindowManager.focusWindow(process.id);
        else WindowManager.closeWindow(process.id);
        this.print(`${signal.slice(1)} sent to ${target}.`, 'success');
    },
    xdgOpen(argv) {
        if (argv.length !== 1) return this.usage('xdg-open');
        const uri = argv[0];
        if (uri.startsWith('app://')) {
            const id = uri.slice(6), app = this.findApp(id);
            if (!app) return this.print(`xdg-open: app not found: ${id}`, 'error');
            WindowManager.openApp(app.id); return;
        }
        if (uri.startsWith('settings://')) { WindowManager.openApp('settings', { page: uri.slice(11) || 'overview' }); return; }
        return this.print(`xdg-open: unsupported URI: ${uri}`, 'error');
    },
    fluentctl(argv, elevated = false) {
        if (!argv.length || argv[0] === '--help' || argv[0] === '-h') return this.showManual('fluentctl');
        const object = argv.shift().toLowerCase();
        const action = (argv.shift() || '').toLowerCase();
        if (object === 'status' && !action && !argv.length) return this.showStatus();
        if (object === 'app') {
            if (action === 'list' && !argv.length) return this.print(Desktop.apps.map(a => `${a.id.padEnd(18)} ${this.appName(a)}`).join('\n'), 'terminal-table');
            if (action === 'open' && argv.length === 1) {
                const app = this.findApp(argv[0]);
                if (!app) return this.print(`fluentctl: app not found: ${argv[0]}`, 'error');
                WindowManager.openApp(app.id); return this.print(`Opened ${this.appName(app)}.`, 'success');
            }
            return this.print('Usage: fluentctl app <list|open APP-ID>', 'error');
        }
        if (object === 'window') {
            if (action === 'list' && !argv.length) return this.listProcesses([]);
            if (['close','minimize','maximize'].includes(action) && argv.length === 1) return this.windowAction(argv[0] === '--all' ? 'all' : argv[0], action);
            return this.print('Usage: fluentctl window <list|close|minimize|maximize> [APP-ID|--all]', 'error');
        }
        if (object === 'appearance') {
            if (action === 'theme' && argv.length === 1 && ['light','dark','auto'].includes(argv[0])) { State.updateSettings({ theme: argv[0] }); return this.print(`Theme set to ${argv[0]}.`, 'success'); }
            if (['blur','animation'].includes(action) && argv.length === 1) return this.setToggle(argv[0], action === 'blur' ? 'enableBlur' : 'enableAnimation', action === 'blur' ? 'Blur' : 'Animation');
            if (action === 'wallpaper' && !argv.length) { WindowManager.openApp('settings', { page: 'personalization' }); return this.print('Wallpaper settings opened.', 'success'); }
            return this.print('Usage: fluentctl appearance <theme VALUE|blur STATE|animation STATE|wallpaper>', 'error');
        }
        if (object === 'display') {
            if (action === 'brightness' && argv.length === 1) return this.setNumber(argv[0], 'brightness', 20, 100, 'Brightness');
            return this.print('Usage: fluentctl display brightness <20-100|+N|-N>', 'error');
        }
        if (object === 'sound') {
            if (action === 'volume' && argv.length === 1) return this.setNumber(argv[0], 'volume', 0, 100, 'Volume');
            if (action === 'mute' && !argv.length) { State.updateSettings({ volume: 0 }); return this.print('Audio muted.', 'success'); }
            return this.print('Usage: fluentctl sound <volume VALUE|mute>', 'error');
        }
        if (object === 'radio') {
            if (action === 'wifi' && argv.length === 1) return this.setWifi(argv[0]);
            if (action === 'bluetooth' && argv.length === 1) return this.setToggle(argv[0], 'bluetoothEnabled', 'Bluetooth', () => ControlCenter?.updateTiles?.());
            return this.print('Usage: fluentctl radio <wifi|bluetooth> <on|off>', 'error');
        }
        if (object === 'panel') {
            if (argv.length !== 1 || argv[0] !== 'toggle') return this.print('Usage: fluentctl panel <taskview|control|notifications> toggle', 'error');
            if (action === 'taskview') TaskView?.toggle?.();
            else if (action === 'control') ControlCenter?.toggle?.();
            else if (action === 'notifications') NotificationCenter?.toggle?.();
            else return this.print(`fluentctl: unknown panel: ${action}`, 'error');
            return this.print(`${action} toggled.`, 'success');
        }
        if (object === 'media') {
            if (!['play','pause','next','previous'].includes(action) || argv.length) return this.print('Usage: fluentctl media <play|pause|next|previous>', 'error');
            return this.media(action);
        }
        if (object === 'locale') {
            if (action !== 'set' || argv.length !== 1 || !['zh','en'].includes(argv[0])) return this.print('Usage: fluentctl locale set <zh|en>', 'error');
            I18n.setLanguage(argv[0]); return this.print(`System locale set to ${argv[0]}.`, 'success');
        }
        if (object === 'developer') {
            if (argv.length || !['open','hide','status'].includes(action)) return this.print('Usage: fluentctl developer <open|hide|status>', 'error');
            return this.developer(action);
        }
        if (object === 'user') {
            if (action !== 'reset' || argv.length) return this.print('Usage: sudo fluentctl user reset', 'error');
            if (!elevated) return this.print('fluentctl: permission denied (try sudo fluentctl user reset)', 'error');
            return this.startProfileClear();
        }
        return this.print(`fluentctl: unknown object '${object}'`, 'error');
    },
    requestPower(action) {
        this.pendingPower = action;
        this.print(`Power action '${action}' requested. Type yes to confirm or cancel to abort.`, 'error');
    },
    systemctl(argv) {
        if (argv.length !== 1) return this.usage('systemctl');
        if (argv[0] === 'reboot') return this.requestPower('restart');
        if (argv[0] === 'poweroff') return this.requestPower('shutdown');
        return this.print(`systemctl: unknown command '${argv[0]}'`, 'error');
    },
    loginctl(argv) {
        if (argv.length !== 1) return this.usage('loginctl');
        if (argv[0] === 'lock-session') return State.lock();
        if (argv[0] === 'terminate-user') return this.requestPower('logout');
        return this.print(`loginctl: unknown command '${argv[0]}'`, 'error');
    },
    shutdownCommand(argv) {
        if (argv.length !== 2 || argv[1] !== 'now' || !['-h','-r'].includes(argv[0])) return this.usage('shutdown');
        return this.requestPower(argv[0] === '-r' ? 'restart' : 'shutdown');
    },
    showStatus() {
        const wifi = document.getElementById('wifi-tile')?.dataset.active !== 'false';
        this.print(`User          ${State.settings.userName || 'Owner'}\nTheme         ${State.settings.theme || 'light'}\nBrightness    ${State.settings.brightness ?? 100}%\nVolume        ${State.settings.volume ?? 50}%\nWi-Fi         ${wifi ? 'on' : 'off'}\nBluetooth     ${State.settings.bluetoothEnabled !== false ? 'on' : 'off'}\nDev menu      ${SettingsApp?._developerModeVisible === true ? 'visible' : 'hidden'}\nOpen windows  ${WindowManager.windows.length}`);
    },
    setNumber(arg, key, min, max, label) {
        let value = Number(State.settings[key] ?? (key === 'brightness' ? 100 : 50));
        if (/^[+-]\d+$/.test(String(arg))) value += Number(arg);
        else value = Number(arg);
        if (!Number.isFinite(value)) return this.print(`Usage: ${key} <${min}-${max}|+N|-N>`, 'error');
        value = Math.max(min, Math.min(max, Math.round(value))); State.updateSettings({ [key]: value });
        this.print(`${label} set to ${value}%.`, 'success');
    },
    setToggle(arg, key, label, after) {
        const value = this.boolArg(arg); if (value === undefined) return this.print(`Usage: ${key.replace('enable','').toLowerCase()} <on|off>`, 'error');
        State.updateSettings({ [key]: value }); after?.(); this.print(`${label} ${value ? 'enabled' : 'disabled'}.`, 'success');
    },
    setWifi(arg) {
        const value = this.boolArg(arg); if (value === undefined) return this.print('Usage: wifi <on|off>', 'error');
        const tile = document.getElementById('wifi-tile'); if (tile) { tile.dataset.active = String(value); tile.querySelector('.tile-subtitle')?.replaceChildren(document.createTextNode(value ? t('control.wifi.connected') : t('control.wifi.disconnected'))); }
        this.print(`Wi-Fi ${value ? 'enabled' : 'disabled'}.`, 'success');
    },
    windowAction(arg, action) {
        const targets = arg === 'all' ? [...WindowManager.windows] : [this.getWindow(arg)].filter(Boolean);
        if (!targets.length) return this.print(`Running window not found: ${arg || '(empty)'}`, 'error');
        targets.forEach(w => { if (action === 'close') WindowManager.closeWindow(w.id); else if (action === 'minimize') WindowManager.minimizeWindow(w.id); else if (!w.isMaximized) WindowManager.toggleMaximize(w.id); });
        this.print(`${action} completed: ${arg}`, 'success');
    },
    developer(arg) {
        const action = (arg || 'open').toLowerCase();
        if (action === 'status') {
            return this.print(`Developer menu is ${SettingsApp._developerModeVisible === true ? 'visible' : 'hidden'}.`);
        }
        if (action === 'hide' || action === 'off' || action === 'disable') {
            SettingsApp._developerModeVisible = false;
            if (SettingsApp.currentPage === 'developer') SettingsApp.currentPage = 'overview';
            if (SettingsApp.container?.isConnected) SettingsApp.render();
            return this.print('Developer menu hidden.', 'success');
        }
        if (!['open','on','enable'].includes(action)) {
            return this.print('Usage: developer <open|hide|status>', 'error');
        }
        WindowManager.openApp('settings');
        SettingsApp._developerModeVisible = true;
        SettingsApp._aboutDevTapCount = 0;
        SettingsApp.currentPage = 'developer';
        SettingsApp.render();
        this.print('Developer menu unlocked and opened for this session.', 'success');
    },
    startProfileClear() {
        this.pendingProfileClear = true;
        this.profilePinAttempts = 0;
        this.input.type = 'password';
        this.input.setAttribute('aria-label', 'Lock screen PIN');
        this.input.placeholder = 'Lock screen PIN';
        this.print('WARNING: This permanently deletes all local user data, files, settings, and app data.', 'error');
        this.print('Enter your lock screen PIN to continue. The PIN will not be displayed or saved.', 'muted');
        this.input.focus();
    },
    handleProfilePin(pin) {
        const expectedPin = String(State.settings.pin || '1234');
        if (String(pin).trim() !== expectedPin) {
            this.profilePinAttempts += 1;
            const remaining = 3 - this.profilePinAttempts;
            if (remaining <= 0) {
                this.print('PIN verification failed three times. Profile clear cancelled.', 'error');
                this.cancelProfileClear(false);
            } else {
                this.print(`Incorrect PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`, 'error');
                this.input.focus();
            }
            return;
        }
        this.cancelProfileClear(false);
        this.print('PIN verified. Clearing local user data and restarting FluentOS...', 'success');
        if (typeof SettingsApp.runDataClearAndReboot === 'function') {
            void SettingsApp.runDataClearAndReboot();
        } else {
            void Storage.clearAllUserData()
                .then(() => window.location.reload())
                .catch((error) => this.print(`Profile clear failed: ${error.message}`, 'error'));
        }
    },
    cancelProfileClear(showMessage = true) {
        if (!this.input) return;
        const wasPending = this.pendingProfileClear;
        this.pendingProfileClear = false;
        this.profilePinAttempts = 0;
        this.input.type = 'text';
        this.input.removeAttribute('placeholder');
        this.input.setAttribute('aria-label', 'Command input');
        this.input.value = '';
        if (showMessage && wasPending) this.print('Profile clear cancelled.', 'success');
    },
    media(arg) {
        if (typeof MediaApp === 'undefined') return this.print('Media component is unavailable.', 'error');
        const actions = { play:'togglePlay', pause:'togglePlay', next:'playNext', previous:'playPrevious' };
        const fn = actions[arg]; if (!fn || typeof MediaApp[fn] !== 'function') return this.print('Usage: media <play|pause|next|previous>', 'error');
        MediaApp[fn](); this.print(`Media command completed: ${arg}`, 'success');
    },
    beforeClose() {
        this.pendingPower = null;
        this.cancelProfileClear(false);
        this.input = null;
        this.output = null;
        this.container = null;
        this.windowId = null;
        return true;
    }
};

globalThis.TerminalApp = TerminalApp;
