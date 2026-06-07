/**
 * Lab feature: import external files into the in-memory FS (persisted via Storage).
 * - Supports file picker ("Upload") and OS drag-drop (DataTransfer.files)
 * - Shows a modern blue (accent) progress modal, adaptive to light/dark
 */
(function () {
    'use strict';

    const LANG = () => (window.I18n && I18n.currentLang) || 'zh';
    const isZh = () => LANG().toLowerCase().startsWith('zh');

    const nowIso = () => new Date().toISOString();
    const rand = () => Math.random().toString(36).slice(2, 10);

    const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB soft limit to avoid blowing up localStorage
    const ALLOWED_IMPORT_EXTENSIONS = new Set(['txt', 'doc', 'docx', 'ppt', 'pptx', 'xlsx', 'xls', 'pdf', 'png', 'jpg', 'jpeg']);
    const ALLOWED_IMPORT_MIME_TYPES = new Set([
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/pdf',
        'image/png',
        'image/jpeg'
    ]);
    const ALLOWED_IMPORT_ACCEPT = '.txt,.doc,.docx,.ppt,.pptx,.xlsx,.xls,.pdf,.png,.jpg,.jpeg';

    function isEnabledFlag(value) {
        if (value === true || value === 1) return true;
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            return normalized === 'true' || normalized === '1';
        }
        return false;
    }

    // 当前外部文件导入是否启用（由设置中的“文件上传”开关驱动）
    let _externalImportEnabled = !!(typeof State !== 'undefined' && State.settings && State.settings.enableExternalFileImport === true);
    let _settingsSubscribed = false;

    function _syncEnabledFromSettings(updates) {
        const source = (updates && Object.prototype.hasOwnProperty.call(updates, 'enableExternalFileImport'))
            ? updates
            : (typeof State !== 'undefined' && State.settings) || null;
        if (!source) return;
        _externalImportEnabled = isEnabledFlag(source.enableExternalFileImport);
    }

    function _ensureSettingsSubscription() {
        if (_settingsSubscribed) return;
        if (typeof State === 'undefined' || typeof State.on !== 'function') return;
        _settingsSubscribed = true;
        // 初始同步一次
        _syncEnabledFromSettings(State.settings);
        // 监听设置变更
        State.on('settingsChange', (updates) => {
            _syncEnabledFromSettings(updates);
        });
    }

    // 尽早尝试订阅；如 State 还未就绪，则在 DOMContentLoaded 后再尝试一次
    _ensureSettingsSubscription();
    if (!_settingsSubscribed && typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            _ensureSettingsSubscription();
        }, { once: true });
    }

    function enabled() {
        if (typeof State === 'undefined' || !State.settings) return false;
        return isEnabledFlag(State.settings.enableExternalFileImport);
    }

    function splitExt(name) {
        const text = String(name || '');
        const dot = text.lastIndexOf('.');
        if (dot <= 0 || dot === text.length - 1) return { base: text, ext: '' };
        return { base: text.slice(0, dot), ext: text.slice(dot) };
    }

    function getFileExt(name) {
        const { ext } = splitExt(name);
        return ext ? ext.slice(1).toLowerCase() : '';
    }

    function normalizeMime(type) {
        return String(type || '').split(';')[0].trim().toLowerCase();
    }

    function isAllowedImportFile(file) {
        const ext = getFileExt(file?.name || '');
        if (ALLOWED_IMPORT_EXTENSIONS.has(ext)) return true;
        const mime = normalizeMime(file?.type);
        if (mime && ALLOWED_IMPORT_MIME_TYPES.has(mime)) return true;
        return false;
    }

    function unsupportedTypeMessage(name) {
        const safeName = String(name || 'file');
        if (isZh()) {
            return `不支持的文件类型，已跳过：${safeName}（仅支持 txt/doc/docx/ppt/pptx/xlsx/xls/pdf/png/jpg/jpeg）`;
        }
        return `Unsupported file type skipped: ${safeName} (allowed: txt, doc, docx, ppt, pptx, xlsx, xls, pdf, png, jpg, jpeg)`;
    }

    function uniqueNameIn(folder, desiredName) {
        const { base, ext } = splitExt(desiredName);
        const exists = (n) => (folder.children || []).some((c) => c && c.name === n);
        if (!exists(desiredName)) return desiredName;
        let i = 2;
        while (exists(`${base} (${i})${ext}`)) i++;
        return `${base} (${i})${ext}`;
    }

    function isProbablyText(file) {
        const type = String(file?.type || '').toLowerCase();
        if (type.startsWith('text/')) return true;
        const name = String(file?.name || '');
        const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
        return ['txt', 'md', 'json', 'js', 'ts', 'css', 'html', 'htm', 'xml', 'csv', 'log', 'yml', 'yaml'].includes(ext);
    }

    function readFile(file, { onProgress, onReader } = {}) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            if (typeof onReader === 'function') onReader(reader);

            reader.onerror = () => reject(reader.error || new Error('read_failed'));
            reader.onabort = () => reject(new Error('aborted'));
            reader.onprogress = (e) => {
                if (e && e.lengthComputable && typeof onProgress === 'function') {
                    onProgress(e.loaded, e.total);
                }
            };
            reader.onload = () => resolve(reader.result);

            if (isProbablyText(file)) {
                reader.readAsText(file);
            } else {
                reader.readAsDataURL(file);
            }
        });
    }

    function ensureStyles() {
        if (document.getElementById('file-import-styles')) return;
        const style = document.createElement('style');
        style.id = 'file-import-styles';
        style.textContent = `
            .file-import-modal .fluent-modal { overflow: hidden; }
            .file-import-modal .fluent-modal-content { padding: 14px 16px 16px; }
            .file-import-wrap { display:flex; flex-direction:column; gap:12px; }
            .file-import-top { display:flex; flex-direction:column; gap:10px; }
            .file-import-dest { display:flex; align-items:center; gap:8px; font-size: 13px; color: var(--text-secondary); }
            .file-import-dest strong { color: var(--text-primary); font-weight: 600; }
            .file-import-list { display:flex; flex-direction:column; gap:10px; max-height: 320px; overflow:auto; padding-right: 4px; }
            .file-import-item { padding: 0; border: 0; background: transparent; border-radius: 0; }
            .file-import-item-head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-bottom: 6px; }
            .file-import-item-name { font-size: 13px; font-weight: 600; color: var(--text-primary); word-break: break-word; }
            .file-import-item-status { font-size: 12px; color: var(--text-secondary); white-space: nowrap; }
            .file-import-item-status.is-error { color: #d13438; }
            .file-import-item-status.is-done { color: var(--text-secondary); }
            .file-import-footer { display:flex; align-items:center; justify-content:flex-end; gap:8px; padding-top: 8px; border-top: 1px solid var(--border-color); }
            .file-import-hint { margin-right:auto; font-size: 12px; color: var(--text-secondary); }
        `;
        document.head.appendChild(style);
    }

    function createSession(initialFolderId) {
        ensureStyles();

        const content = document.createElement('div');
        content.className = 'file-import-wrap';

        const top = document.createElement('div');
        top.className = 'file-import-top';

        const dest = document.createElement('div');
        dest.className = 'file-import-dest';
        const destPrefix = isZh() ? '导入到：' : 'Import to:';
        dest.innerHTML = `<span>${destPrefix}</span><strong></strong>`;
        const destStrong = dest.querySelector('strong');

        top.appendChild(dest);

        const list = document.createElement('div');
        list.className = 'file-import-list';

        const footer = document.createElement('div');
        footer.className = 'file-import-footer';
        const hint = document.createElement('div');
        hint.className = 'file-import-hint';
        hint.textContent = isZh() ? '实验室功能：导入内容会保存在浏览器本地存储中' : 'Lab feature: imported data is stored in browser local storage';

        const cancelBtn = FluentUI.Button
            ? FluentUI.Button({ text: t('files.import-cancel'), variant: 'secondary', onClick: () => session.cancel() })
            : null;
        const closeBtn = FluentUI.Button
            ? FluentUI.Button({ text: t('files.import-close'), variant: 'primary', onClick: () => session.close() })
            : null;

        if (closeBtn) closeBtn.disabled = true;
        if (cancelBtn) footer.appendChild(cancelBtn);
        if (closeBtn) footer.appendChild(closeBtn);
        footer.insertBefore(hint, footer.firstChild);

        content.appendChild(top);
        content.appendChild(list);
        content.appendChild(footer);

        const modal = FluentUI.Modal({
            title: t('files.import-title'),
            content,
            closable: false,
            width: '560px',
            className: 'file-import-modal'
        });
        modal.show();

        const session = {
            modal,
            destStrongEl: destStrong,
            listEl: list,
            cancelBtn,
            closeBtn,
            tasks: [],
            _running: false,
            _cancelled: false,
            _activeReader: null,

            addFiles(fileList, folderId) {
                const files = Array.from(fileList || []).filter(Boolean);
                if (!files.length) return;
                const destId = folderId || initialFolderId || 'downloads';
                files.forEach((file) => this._addTask(file, destId));
                this._refreshDest();
                if (!this._running) this._run();
                this._refreshOverall();
            },

            _addTask(file, destFolderId) {
                const taskId = `import-${Date.now()}-${rand()}`;
                const item = document.createElement('div');
                item.className = 'file-import-item';
                item.dataset.taskId = taskId;

                const head = document.createElement('div');
                head.className = 'file-import-item-head';
                const nameEl = document.createElement('div');
                nameEl.className = 'file-import-item-name';
                nameEl.textContent = file.name || 'file';
                const statusEl = document.createElement('div');
                statusEl.className = 'file-import-item-status';
                statusEl.textContent = isZh() ? '等待' : 'Queued';
                head.appendChild(nameEl);
                head.appendChild(statusEl);

                const progress = FluentUI.Progress({ value: 0, max: 100, showLabel: false, variant: 'default' });
                item.appendChild(head);
                item.appendChild(progress);
                this.listEl.appendChild(item);

                this.tasks.push({
                    id: taskId,
                    file,
                    item,
                    nameEl,
                    statusEl,
                    progressEl: progress,
                    destFolderId,
                    bytesTotal: Number(file.size || 0),
                    bytesLoaded: 0,
                    status: 'queued', // queued|reading|done|error|skipped|cancelled
                    error: null
                });
            },

            _refreshDest() {
                if (!this.destStrongEl) return;
                const ids = [...new Set(this.tasks.map(t => t.destFolderId).filter(Boolean))];
                if (ids.length === 1) {
                    const node = State.findNode(ids[0]);
                    this.destStrongEl.textContent = node?.name || ids[0];
                } else {
                    this.destStrongEl.textContent = isZh() ? '多个位置' : 'Multiple locations';
                }
            },

            _setTaskStatus(task, status, errText = null) {
                task.status = status;
                const zhMap = {
                    queued: '等待',
                    reading: '正在导入…',
                    done: '已完成',
                    error: '失败',
                    skipped: '已跳过',
                    cancelled: '已取消'
                };
                const enMap = {
                    queued: 'Queued',
                    reading: 'Importing…',
                    done: 'Done',
                    error: 'Failed',
                    skipped: 'Skipped',
                    cancelled: 'Canceled'
                };
                task.statusEl.textContent = (isZh() ? zhMap[status] : enMap[status]) || status;
                task.statusEl.classList.toggle('is-error', status === 'error');
                task.statusEl.classList.toggle('is-done', status === 'done' || status === 'skipped' || status === 'cancelled');
                if (errText) {
                    task.statusEl.title = errText;
                }
            },

            _refreshOverall() {
                // 总进度 UI 已移除，保留该方法作为状态刷新调用点。
            },

            async _run() {
                this._running = true;
                this._cancelled = false;
                if (this.closeBtn) this.closeBtn.disabled = true;
                if (this.cancelBtn) this.cancelBtn.disabled = false;

                let importedCount = 0;
                let hasError = false;

                for (const task of this.tasks) {
                    if (task.status !== 'queued') continue;
                    if (this._cancelled) {
                        this._setTaskStatus(task, 'cancelled');
                        task.progressEl.setValue(0);
                        this._refreshOverall();
                        continue;
                    }

                    // Safety: extension whitelist
                    if (!isAllowedImportFile(task.file)) {
                        this._setTaskStatus(task, 'skipped');
                        task.progressEl.setValue(0);
                        task.bytesLoaded = 0;
                        FluentUI.Toast?.({ title: t('files.title'), message: unsupportedTypeMessage(task.file?.name), type: 'warning' });
                        this._refreshOverall();
                        continue;
                    }

                    // Safety: size limit
                    if (Number(task.file.size || 0) > MAX_FILE_BYTES) {
                        this._setTaskStatus(task, 'skipped');
                        task.progressEl.setValue(0);
                        FluentUI.Toast?.({ title: t('files.title'), message: t('files.import-too-large', { name: task.file.name }), type: 'warning' });
                        this._refreshOverall();
                        continue;
                    }

                    try {
                        this._setTaskStatus(task, 'reading');
                        task.bytesLoaded = 0;
                        task.progressEl.setValue(0);
                        this._refreshOverall();

                        const result = await readFile(task.file, {
                            onReader: (reader) => { this._activeReader = reader; },
                            onProgress: (loaded, total) => {
                                task.bytesLoaded = loaded;
                                const pct = total > 0 ? Math.max(0, Math.min(100, (loaded / total) * 100)) : 0;
                                task.progressEl.setValue(pct);
                                this._refreshOverall();
                            }
                        });
                        this._activeReader = null;

                        if (this._cancelled) {
                            this._setTaskStatus(task, 'cancelled');
                            this._refreshOverall();
                            continue;
                        }

                        const folder = State.findNode(task.destFolderId) || State.findNode('downloads') || State.findNode('desktop') || State.fs?.root;
                        if (!folder || folder.type !== 'folder') {
                            throw new Error('invalid_folder');
                        }
                        folder.children = folder.children || [];

                        const desiredName = String(task.file.name || 'file');
                        const finalName = uniqueNameIn(folder, desiredName);

                        const isText = isProbablyText(task.file);
                        const node = {
                            id: `file-${Date.now()}-${rand()}`,
                            name: finalName,
                            type: 'file',
                            content: typeof result === 'string' ? result : '',
                            size: Number(task.file.size || 0),
                            mime: String(task.file.type || (isText ? 'text/plain' : 'application/octet-stream')),
                            encoding: isText ? 'text' : 'dataurl',
                            created: nowIso(),
                            modified: nowIso()
                        };

                        folder.children.push(node);
                        State.updateFS(State.fs);

                        importedCount++;
                        task.bytesLoaded = task.bytesTotal;
                        task.progressEl.setValue(100);
                        this._setTaskStatus(task, 'done');
                        this._refreshOverall();
                    } catch (err) {
                        hasError = true;
                        this._activeReader = null;
                        const msg = (err && err.message) ? String(err.message) : String(err || 'error');
                        this._setTaskStatus(task, this._cancelled ? 'cancelled' : 'error', msg);
                        this._refreshOverall();
                    }
                }

                this._running = false;
                if (this.cancelBtn) this.cancelBtn.disabled = true;
                if (this.closeBtn) this.closeBtn.disabled = false;

                if (importedCount > 0) {
                    FluentUI.Toast?.({ title: t('files.title'), message: t('files.import-success', { count: importedCount }), type: 'success' });
                }
                if (hasError) {
                    FluentUI.Toast?.({ title: t('files.title'), message: t('files.import-failed'), type: 'warning' });
                }
            },

            cancel() {
                this._cancelled = true;
                try {
                    if (this._activeReader && typeof this._activeReader.abort === 'function') {
                        this._activeReader.abort();
                    }
                } catch (_) { /* ignore */ }
                if (this.cancelBtn) this.cancelBtn.disabled = true;
            },

            close() {
                try {
                    this.modal?.close?.();
                } finally {
                    FileImport._session = null;
                }
            }
        };

        return session;
    }

    async function pickAndImportTo(folderId) {
        if (!enabled()) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = ALLOWED_IMPORT_ACCEPT;
        input.multiple = true;
        input.style.display = 'none';
        document.body.appendChild(input);

        const files = await new Promise((resolve) => {
            input.addEventListener('change', () => resolve(input.files), { once: true });
            input.click();
        });

        input.remove();
        if (files && files.length) {
            importToFolder(folderId, files);
        }
    }

    function importToFolder(folderId, fileList) {
        if (!enabled()) return;
        if (!fileList || !fileList.length) return;
        if (!window.FluentUI || typeof State === 'undefined') return;

        if (!FileImport._session) {
            FileImport._session = createSession(folderId);
        }
        FileImport._session.addFiles(fileList, folderId);
    }

    const FileImport = {
        enabled,
        pickAndImportTo,
        importToFolder,
        _session: null
    };

    window.FileImport = FileImport;
})();
