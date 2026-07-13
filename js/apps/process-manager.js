/**
 * FluentOS Process Manager
 * Shows open apps alongside protected FluentOS core services.
 */
const ProcessManagerApp = {
    windowId: null,
    container: null,
    frame: null,
    activePage: 'apps',
    selectedProcessId: null,
    pendingHighlightProcessId: null,
    heapTooltip: null,
    refreshTimer: null,
    unsubscribers: [],

    CORE_PROCESSES: [
        { id: 'shell-host', name: 'FluentOS Shell Host', icon: 'Home', pid: 104 },
        { id: 'notification-broker', name: 'Notification Broker Service', icon: 'Notification Bell', pid: 216 },
        { id: 'window-composition', name: 'Window Composition Service', icon: 'Layout Grid', pid: 328 },
        { id: 'state-persistence', name: 'State Persistence Service', icon: 'Database 2', pid: 412 },
        { id: 'fluent-ui-runtime', name: 'FluentUI Runtime', icon: 'Dashboard', pid: 524 },
        { id: 'search-index', name: 'Search Index Service', icon: 'Search', pid: 608 },
        { id: 'virtual-file-system', name: 'Virtual File System Service', icon: 'Folder', pid: 736 }
    ],

    init(windowId) {
        this.beforeClose();
        this.windowId = windowId;
        this.container = document.getElementById(windowId)?.querySelector('.window-content') || null;
        this.activePage = 'apps';
        this.selectedProcessId = null;
        this.pendingHighlightProcessId = null;
        if (!this.container) return false;

        this.addStyles();
        this.mountFrame();
        this.bindStateEvents();
        this.resetRefreshTimer();
        return true;
    },

    mountFrame() {
        if (!this.container || typeof FluentWindow === 'undefined') return;
        this.frame?.destroy?.();
        this.frame = FluentWindow.mount({
            container: this.container,
            items: [
                { id: 'apps', label: t('processManager.currentApps'), icon: 'Layout Grid' },
                { id: 'all', label: t('processManager.allProcesses'), icon: 'Checklist Note' }
            ],
            footerItems: [
                { id: 'settings', label: t('processManager.settings'), icon: 'Settings' }
            ],
            activeId: this.activePage,
            sidebarSearch: {
                enabled: true,
                placeholder: t('processManager.searchPlaceholder'),
                resultsTitle: t('processManager.searchResults'),
                emptyText: t('processManager.noResults'),
                minQueryLength: 1,
                debounceMs: 80,
                search: (query) => this.searchProcesses(query),
                onResultClick: (result) => this.openSearchResult(result)
            },
            onNavigate: (id, pageEl) => {
                this.activePage = id;
                if (!this.pendingHighlightProcessId) this.selectedProcessId = null;
                pageEl.className = 'fw-page process-manager-page';
                pageEl.dataset.fwScroll = '';
                pageEl.parentElement?.classList.add('process-manager-card');
                pageEl.parentElement?.querySelector(':scope > .process-task-footer')?.remove();
                if (id === 'settings') this.renderSettings(pageEl);
                else this.renderProcessPage(pageEl, id);
            }
        });
    },

    bindStateEvents() {
        const refresh = () => this.refreshVisiblePage();
        this.unsubscribers.push(State.on('appStart', refresh));
        this.unsubscribers.push(State.on('appStop', refresh));
        this.unsubscribers.push(State.on('languageChange', () => {
            const page = this.activePage;
            this.mountFrame();
            if (page !== this.frame?.activeId) this.frame?.navigate?.(page, { preserveScroll: false });
        }));
        this.unsubscribers.push(State.on('settingsChange', (updates) => {
            if (updates && Object.prototype.hasOwnProperty.call(updates, 'processManagerRefreshInterval')) {
                this.resetRefreshTimer();
            }
        }));
    },

    getRefreshInterval() {
        const allowed = [1000, 3000, 5000, 10000];
        const value = Number(State.settings.processManagerRefreshInterval);
        return allowed.includes(value) ? value : 3000;
    },

    resetRefreshTimer() {
        clearInterval(this.refreshTimer);
        this.refreshTimer = setInterval(() => this.refreshVisiblePage(), this.getRefreshInterval());
    },

    refreshVisiblePage() {
        if (!this.frame || !this.container?.isConnected || this.activePage === 'settings') return;
        this.updateMemorySummary();
        this.renderRows();
    },

    renderProcessPage(pageEl, mode) {
        pageEl.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'process-manager-header';
        header.innerHTML = `
            <div>
                <h1>${t(mode === 'apps' ? 'processManager.currentApps' : 'processManager.allProcesses')}</h1>
                <p>${t(mode === 'apps' ? 'processManager.currentAppsDesc' : 'processManager.allProcessesDesc')}</p>
            </div>
            <div class="process-manager-count" aria-live="polite"></div>
        `;
        pageEl.appendChild(header);

        const memory = document.createElement('section');
        memory.className = 'process-memory-card';
        memory.innerHTML = `
            <div class="process-memory-title">
                <span>${t('processManager.browserHeap')}</span>
                <button type="button" class="process-memory-help" title="${t('processManager.heapHelp')}" aria-label="${t('processManager.heapHelp')}">?</button>
            </div>
            <div class="process-memory-metrics">
                <div><span>${t('processManager.heapUsed')}</span><strong data-memory="used">--</strong></div>
                <div><span>${t('processManager.heapTotal')}</span><strong data-memory="total">--</strong></div>
                <div><span>${t('processManager.heapLimit')}</span><strong data-memory="limit">--</strong></div>
            </div>
        `;
        pageEl.appendChild(memory);

        const table = document.createElement('div');
        table.className = 'process-table';
        table.innerHTML = `
            <div class="process-table-head" role="row">
                <span>${t('processManager.task')}</span>
                <span>${t('processManager.type')}</span>
                <span>${t('processManager.status')}</span>
                <span>PID</span>
                <span>${t('processManager.memory')}</span>
            </div>
            <div class="process-table-body"></div>
        `;
        pageEl.appendChild(table);

        const taskFooter = document.createElement('div');
        taskFooter.className = 'process-task-footer';
        const endTaskButton = FluentUI.Button({
            text: t('processManager.endTask'),
            variant: 'secondary',
            disabled: true,
            className: 'process-end-task-button',
            onClick: () => this.endSelectedProcess()
        });
        endTaskButton.title = t('processManager.selectProcessHint');
        taskFooter.appendChild(endTaskButton);
        pageEl.parentElement?.appendChild(taskFooter);

        pageEl.addEventListener('click', (event) => {
            if (event.target.closest('.process-row, button, input, select, textarea, a, [role="button"]')) return;
            this.clearProcessSelection();
        });

        this.updateMemorySummary();
        this.renderRows();
    },

    renderSettings(pageEl) {
        pageEl.innerHTML = `
            <div class="process-manager-header">
                <div><h1>${t('processManager.settings')}</h1><p>${t('processManager.settingsDesc')}</p></div>
            </div>
            <section class="process-settings-section"><h2>${t('processManager.refreshSection')}</h2></section>
        `;
        const section = pageEl.querySelector('.process-settings-section');
        const select = FluentUI.Select({
            value: String(this.getRefreshInterval()),
            options: [
                { value: '1000', label: '1s' },
                { value: '3000', label: '3s' },
                { value: '5000', label: '5s' },
                { value: '10000', label: '10s' }
            ],
            onChange: (value) => State.updateSettings({ processManagerRefreshInterval: Number(value) })
        });
        section.appendChild(FluentUI.SettingItem({
            label: t('processManager.refreshFrequency'),
            description: t('processManager.refreshFrequencyDesc'),
            control: select
        }));
    },

    getAppProcesses() {
        const byApp = new Map();
        const windows = Array.isArray(WindowManager.windows) ? WindowManager.windows : [];
        windows.forEach((windowData) => {
            if (!windowData || !windowData.appId || windowData.element?.classList.contains('closing')) return;
            if (!byApp.has(windowData.appId)) byApp.set(windowData.appId, windowData);
        });

        Array.from(State.runningApps || []).forEach((appId) => {
            if (!byApp.has(appId)) byApp.set(appId, null);
        });

        return Array.from(byApp.entries()).map(([appId, windowData]) => {
            const config = WindowManager.getAppConfig?.(appId) || {};
            const desktopApp = Desktop.apps?.find((app) => app.id === appId);
            const minimized = Boolean(windowData && (windowData.isMinimized || windowData.element?.style.display === 'none'));
            const frozen = Boolean(windowData?.isFrozen);
            return {
                id: appId,
                appId,
                windowId: windowData?.id || null,
                name: config.title || (desktopApp ? Desktop.getAppName(desktopApp) : appId),
                iconSrc: config.icon || desktopApp?.icon || 'Theme/Icon/App_icon/App_package.png',
                typeLabel: t('processManager.appType'),
                statusLabel: t(frozen ? 'processManager.suspended' : (minimized ? 'processManager.minimized' : 'processManager.running')),
                pid: this.makePid(appId),
                core: false
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
    },

    getVisibleProcesses() {
        let rows = this.getAppProcesses();
        if (this.activePage === 'all') {
            rows = rows.concat(this.getCoreProcesses());
        }
        return rows;
    },

    getCoreProcesses() {
        return this.CORE_PROCESSES.map((process) => ({
            ...process,
            iconSrc: FluentWindow._iconPath(process.icon, 'stroke'),
            typeLabel: t('processManager.coreType'),
            statusLabel: t('processManager.running'),
            core: true
        }));
    },

    searchProcesses(query) {
        const normalized = String(query || '').trim().toLocaleLowerCase();
        if (!normalized) return [];
        return this.getAppProcesses().concat(this.getCoreProcesses())
            .filter((row) => `${row.name} ${row.typeLabel} ${row.statusLabel}`.toLocaleLowerCase().includes(normalized))
            .map((row) => ({
                id: `${row.core ? 'core' : 'app'}:${row.id}`,
                title: row.name,
                subtitle: `${row.typeLabel} · ${row.statusLabel}`,
                iconSrc: row.iconSrc,
                data: { processId: row.id, pageId: row.core ? 'all' : 'apps' }
            }));
    },

    openSearchResult(result) {
        const processId = result?.data?.processId;
        const pageId = result?.data?.pageId;
        if (!processId || !pageId || !this.frame) return;
        this.frame.clearSidebarSearch?.();
        this.selectedProcessId = processId;
        if (this.activePage !== pageId) {
            this.pendingHighlightProcessId = processId;
            this.frame.navigate(pageId, { preserveScroll: false });
            return;
        }
        this.selectProcess(processId, { animate: true, scroll: true });
    },

    renderRows() {
        const page = this.frame?.pageEl;
        const body = page?.querySelector('.process-table-body');
        if (!body) return;
        const rows = this.getVisibleProcesses();
        const count = page.querySelector('.process-manager-count');
        if (count) count.textContent = t('processManager.processCount', { count: rows.length });
        body.innerHTML = '';

        if (!rows.length) {
            this.selectedProcessId = null;
            this.updateEndTaskButton([]);
            body.appendChild(FluentUI.Empty({
                icon: 'Search',
                title: t('processManager.noResults'),
                description: t('processManager.noApps')
            }));
            return;
        }

        if (!rows.some((row) => row.id === this.selectedProcessId)) this.selectedProcessId = null;

        rows.forEach((row) => {
            const element = document.createElement('div');
            element.className = `process-row${row.core ? ' core-process' : ''}${row.id === this.selectedProcessId ? ' selected' : ''}`;
            element.dataset.processId = row.id;
            element.setAttribute('role', 'button');
            element.tabIndex = 0;
            element.setAttribute('aria-selected', row.id === this.selectedProcessId ? 'true' : 'false');
            element.addEventListener('click', () => this.selectProcess(row.id));
            element.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                this.selectProcess(row.id);
            });

            const identity = document.createElement('div');
            identity.className = 'process-identity';
            const icon = document.createElement('img');
            icon.src = row.iconSrc;
            icon.alt = '';
            const name = document.createElement('span');
            name.textContent = row.name;
            identity.append(icon, name);

            const type = document.createElement('span');
            type.textContent = row.typeLabel;
            const status = document.createElement('span');
            status.className = 'process-status';
            status.textContent = row.statusLabel;
            const pid = document.createElement('span');
            pid.className = 'process-pid';
            pid.textContent = String(row.pid);
            const memory = document.createElement('span');
            memory.className = 'process-shared-memory';
            memory.textContent = t('processManager.sharedHeap');
            memory.tabIndex = 0;
            memory.setAttribute('aria-label', `${t('processManager.sharedHeap')}: ${t('processManager.heapSharedNote')}`);
            memory.addEventListener('mouseenter', () => this.showHeapTooltip(memory));
            memory.addEventListener('mouseleave', () => this.hideHeapTooltip());
            memory.addEventListener('focus', () => this.showHeapTooltip(memory));
            memory.addEventListener('blur', () => this.hideHeapTooltip());

            element.append(identity, type, status, pid, memory);
            body.appendChild(element);
        });
        this.updateEndTaskButton(rows);
        this.playPendingHighlight();
    },

    selectProcess(processId, options = {}) {
        const page = this.frame?.pageEl;
        const row = Array.from(page?.querySelectorAll('.process-row') || [])
            .find((element) => element.dataset.processId === String(processId));
        if (!row) return;
        this.selectedProcessId = processId;
        page.querySelectorAll('.process-row.selected').forEach((element) => {
            element.classList.remove('selected');
            element.setAttribute('aria-selected', 'false');
        });
        row.classList.add('selected');
        row.setAttribute('aria-selected', 'true');
        this.updateEndTaskButton(this.getVisibleProcesses());
        if (options.scroll) this.scrollProcessRowIntoView(row);
        if (options.animate && State.settings.enableAnimation !== false) {
            row.classList.remove('search-highlight');
            void row.offsetWidth;
            row.classList.add('search-highlight');
            setTimeout(() => row.classList.remove('search-highlight'), 1300);
        }
    },

    clearProcessSelection() {
        const page = this.frame?.pageEl;
        this.selectedProcessId = null;
        page?.querySelectorAll('.process-row.selected, .process-row.search-highlight').forEach((element) => {
            element.classList.remove('selected', 'search-highlight');
            element.setAttribute('aria-selected', 'false');
        });
        this.updateEndTaskButton(this.getVisibleProcesses());
    },

    scrollProcessRowIntoView(row) {
        const scrollHost = this.frame?.pageEl;
        if (!scrollHost || !row?.isConnected) return;
        const hostRect = scrollHost.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        const footer = this.frame?.cardEl?.querySelector(':scope > .process-task-footer');
        const footerHeight = footer?.offsetHeight || 0;
        const visibleTop = hostRect.top + 10;
        const visibleBottom = hostRect.bottom - footerHeight - 10;
        if (rowRect.top >= visibleTop && rowRect.bottom <= visibleBottom) return;

        const centeredOffset = (scrollHost.clientHeight - footerHeight - rowRect.height) / 2;
        const targetTop = Math.max(0, scrollHost.scrollTop + rowRect.top - hostRect.top - centeredOffset);
        scrollHost.scrollTo({
            top: targetTop,
            behavior: State.settings.enableAnimation === false ? 'auto' : 'smooth'
        });
    },

    playPendingHighlight() {
        if (!this.pendingHighlightProcessId) return;
        const processId = this.pendingHighlightProcessId;
        this.pendingHighlightProcessId = null;
        requestAnimationFrame(() => this.selectProcess(processId, { animate: true, scroll: true }));
    },

    updateEndTaskButton(rows = this.getVisibleProcesses()) {
        const button = this.frame?.cardEl?.querySelector(':scope > .process-task-footer .process-end-task-button');
        if (!button) return;
        const selected = rows.find((row) => row.id === this.selectedProcessId) || null;
        const canEnd = Boolean(selected && !selected.core);
        button.disabled = !canEnd;
        button.classList.toggle('can-end', canEnd);
        button.title = selected?.core
            ? t('processManager.coreProtected')
            : (canEnd ? `${t('processManager.endTask')}: ${selected.name}` : t('processManager.selectProcessHint'));
    },

    endSelectedProcess() {
        const selected = this.getVisibleProcesses().find((row) => row.id === this.selectedProcessId);
        if (!selected || selected.core) return;
        this.endApp(selected);
        this.selectedProcessId = null;
        this.updateEndTaskButton([]);
    },

    endApp(row) {
        if (!row || row.core) return;
        const targets = (WindowManager.windows || []).filter((windowData) => windowData.appId === row.appId);
        targets.forEach((windowData) => WindowManager.closeWindow(windowData.id));
        if (!targets.length) State.removeRunningApp(row.appId);
    },

    showHeapTooltip(anchor) {
        if (!anchor?.isConnected) return;
        this.hideHeapTooltip();
        const tooltip = document.createElement('div');
        tooltip.className = 'process-heap-tooltip';
        tooltip.setAttribute('role', 'tooltip');
        tooltip.textContent = t('processManager.heapSharedNote');
        document.body.appendChild(tooltip);
        const anchorRect = anchor.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const margin = 10;
        let left = anchorRect.left + (anchorRect.width - tooltipRect.width) / 2;
        left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin));
        let top = anchorRect.top - tooltipRect.height - 9;
        if (top < margin) top = anchorRect.bottom + 9;
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        requestAnimationFrame(() => tooltip.classList.add('show'));
        this.heapTooltip = tooltip;
    },

    hideHeapTooltip() {
        this.heapTooltip?.remove();
        this.heapTooltip = null;
    },

    getMemorySnapshot() {
        const memory = globalThis.performance?.memory;
        if (!memory || !Number.isFinite(memory.usedJSHeapSize)) return null;
        return {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit
        };
    },

    updateMemorySummary() {
        const page = this.frame?.pageEl;
        if (!page) return;
        const snapshot = this.getMemorySnapshot();
        ['used', 'total', 'limit'].forEach((key) => {
            const element = page.querySelector(`[data-memory="${key}"]`);
            if (element) element.textContent = snapshot ? this.formatBytes(snapshot[key]) : t('processManager.notSupported');
        });
    },

    formatBytes(bytes) {
        if (!Number.isFinite(bytes)) return t('processManager.notSupported');
        const mb = bytes / (1024 * 1024);
        return `${mb.toLocaleString(undefined, { maximumFractionDigits: 1 })} MB`;
    },

    makePid(value) {
        let hash = 0;
        String(value).split('').forEach((character) => { hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0; });
        return 1000 + (Math.abs(hash) % 8000);
    },

    beforeClose() {
        this.hideHeapTooltip();
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
        this.unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe?.());
        this.frame?.destroy?.();
        this.frame = null;
        this.container = null;
        this.windowId = null;
        return true;
    },

    addStyles() {
        if (document.getElementById('process-manager-styles')) return;
        const style = document.createElement('style');
        style.id = 'process-manager-styles';
        style.textContent = `
            .process-manager-card { overflow: hidden; }
            .process-manager-page { height: 100%; min-height: 0; overflow: auto; padding: 28px 28px 152px; box-sizing: border-box; }
            .process-manager-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
            .process-manager-header h1 { margin: 0 0 6px; font-size: 27px; font-weight: 600; color: var(--text-primary); }
            .process-manager-header p { margin: 0; color: var(--text-secondary); font-size: 13px; }
            .process-manager-count { flex: none; padding: 6px 10px; border-radius: 999px; background: var(--bg-tertiary); color: var(--text-secondary); font-size: 12px; }
            .process-memory-card { padding: 18px; border: 1px solid var(--border-color); background: var(--bg-secondary); border-radius: var(--radius-lg); margin-bottom: 16px; }
            .process-memory-title { display: flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 600; }
            .process-memory-help { width: 18px; height: 18px; padding: 0; border: 0; border-radius: 50%; color: #fff; background: var(--text-primary); font-size: 11px; cursor: help; }
            .process-memory-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 14px; }
            .process-memory-metrics > div { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border-radius: var(--radius-md); background: var(--bg-tertiary); }
            .process-memory-metrics span { color: var(--text-secondary); font-size: 12px; }
            .process-memory-metrics strong { font-size: 18px; font-variant-numeric: tabular-nums; }
            .process-table { border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; }
            .process-table-head, .process-row { display: grid; grid-template-columns: minmax(190px, 2fr) minmax(90px, .8fr) minmax(90px, .8fr) 68px minmax(96px, .9fr); align-items: center; gap: 12px; }
            .process-table-head { padding: 10px 14px; background: var(--bg-tertiary); color: var(--text-secondary); font-size: 12px; font-weight: 600; }
            .process-row { min-height: 58px; padding: 7px 14px; border-top: 1px solid var(--border-color); cursor: pointer; outline: 0; transform: scale(1); transition: background var(--transition-fast), box-shadow var(--transition-fast), transform 120ms cubic-bezier(.2, .9, .25, 1); }
            .process-row:hover { background: color-mix(in srgb, var(--accent) 7%, transparent); }
            .process-row:active { transform: scale(.995); }
            .process-row:focus-visible { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent) 70%, transparent); }
            .process-table-body .process-row.selected,
            .process-table-body .process-row.selected:hover,
            .process-table-body .process-row.selected:active {
                background: rgba(var(--accent-rgb, 0, 120, 212), .22) !important;
                background-color: rgba(var(--accent-rgb, 0, 120, 212), .22) !important;
                background-image: none !important;
                color: var(--text-primary);
                box-shadow: inset 0 0 0 1px rgba(var(--accent-rgb, 0, 120, 212), .48), 0 5px 16px rgba(var(--accent-rgb, 0, 120, 212), .16);
            }
            .process-row.selected > span, .process-row.selected .process-identity { color: var(--text-primary); }
            .process-row.selected .process-shared-memory { color: var(--accent); text-decoration-color: currentColor; }
            .process-row.button-glow-target > :not(.button-edge-glow):not(.button-glow-ripple) { position: relative; z-index: 5; }
            .process-row.search-highlight { animation: processSearchHighlight 1.3s cubic-bezier(.2, .9, .25, 1); }
            @keyframes processSearchHighlight {
                0% { box-shadow: inset 0 0 0 0 rgba(255, 255, 255, .9), 0 0 0 0 color-mix(in srgb, var(--accent) 55%, transparent); }
                32% { box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .9), 0 0 0 6px color-mix(in srgb, var(--accent) 28%, transparent); }
                100% { box-shadow: inset 0 0 0 1px rgba(var(--accent-rgb, 0, 120, 212), .48), 0 5px 16px rgba(var(--accent-rgb, 0, 120, 212), .16); }
            }
            .process-identity { display: flex; align-items: center; gap: 11px; min-width: 0; font-size: 13px; font-weight: 500; }
            .process-identity img { width: 28px; height: 28px; object-fit: contain; flex: none; }
            .process-identity span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .core-process .process-identity img { width: 22px; height: 22px; padding: 3px; }
            .dark-mode .core-process .process-identity img { filter: invert(1); }
            .process-row > span { font-size: 12px; color: var(--text-secondary); }
            .process-status::before { content: ''; display: inline-block; width: 7px; height: 7px; margin-right: 6px; border-radius: 50%; background: #20a464; }
            .process-pid { font-variant-numeric: tabular-nums; }
            .process-shared-memory { white-space: nowrap; cursor: help; text-decoration: underline dotted; text-underline-offset: 3px; }
            .process-table-body > .fluent-empty { padding: 54px 20px; }
            .process-task-footer { position: absolute; inset: auto 0 0; z-index: 8; display: flex; justify-content: flex-end; align-items: flex-end; width: 100%; height: 136px; max-width: none; margin: 0; box-sizing: border-box; padding: 0 28px 14px; overflow: hidden; pointer-events: none; background: linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, .45) 24%, rgba(255, 255, 255, .9) 48%, #fff 66%, #fff 100%); }
            .process-task-footer::after { content: ''; position: absolute; inset: auto 0 0; height: 64px; z-index: 0; background: #fff; pointer-events: none; }
            .dark-mode .process-task-footer { background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, .45) 24%, rgba(0, 0, 0, .9) 48%, #000 66%, #000 100%); }
            .dark-mode .process-task-footer::after { background: #000; }
            .process-task-footer > * { position: relative; z-index: 1; pointer-events: auto; }
            .process-end-task-button { min-width: 116px; color: var(--text-secondary); }
            .process-end-task-button.can-end:not(:disabled) { color: #fff; background: var(--accent); border-color: var(--accent); }
            .process-end-task-button.can-end:not(:disabled):hover { filter: brightness(1.08); }
            .process-heap-tooltip { position: fixed; z-index: 12000; width: max-content; max-width: min(380px, calc(100vw - 20px)); padding: 10px 12px; border-radius: var(--radius-md); background: #202020; color: #fff; box-shadow: var(--shadow-lg); font-size: 12px; line-height: 1.55; opacity: 0; transform: translateY(5px) scale(.98); pointer-events: none; transition: opacity 140ms ease, transform 180ms cubic-bezier(.2, .9, .25, 1); }
            .process-heap-tooltip.show { opacity: 1; transform: translateY(0) scale(1); }
            .process-settings-section h2 { margin: 0 0 12px; font-size: 17px; }
            .process-settings-section .fluent-setting-item { border: 1px solid var(--border-color); border-radius: var(--radius-lg); background: var(--bg-secondary); }
            .process-settings-section .fluent-select-wrapper { min-width: 130px; }
            @media (max-width: 820px) {
                .process-manager-page { padding: 20px 20px 152px; }
                .process-table { overflow-x: auto; }
                .process-table-head, .process-row { min-width: 620px; }
                .process-memory-metrics { grid-template-columns: 1fr; }
                .process-task-footer { padding: 0 20px 14px; }
            }
        `;
        document.head.appendChild(style);
    }
};

globalThis.ProcessManagerApp = ProcessManagerApp;
