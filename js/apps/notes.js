// Quick Notes app (formerly Notepad)
const NotesApp = {
    windowId: null,
    container: null,
    frame: null,
    activeView: 'home',
    contextMenu: null,
    saveTimer: null,
    widgetRefreshTimer: null,
    quickIntroShownThisSession: false,
    editorState: null,
    _contextGuardContainer: null,
    _contextGuardHandler: null,

    text: {
        zh: {
            appTitle: '快记',
            home: '首页',
            quick: '速记',
            favorites: '收藏',
            settings: '设置',
            recentTitle: '最近新建的 Notes',
            recentSubtitle: '默认按照最新修改时间排序',
            favoritesTitle: '收藏的 Notes',
            favoritesSubtitle: '把重要文件固定在这里',
            emptyRecent: '还没有 Notes',
            emptyRecentHint: '点击右下角的新建按钮开始记录。',
            emptyFavorites: '暂无收藏',
            emptyFavoritesHint: '在文件右键菜单中选择收藏即可加入这里。',
            modified: '修改于',
            rename: '重命名',
            reveal: '打开文件所在位置',
            delete: '删除',
            copy: '复制',
            favorite: '收藏',
            unfavorite: '取消收藏',
            newNote: '新建',
            back: '返回',
            save: '保存',
            autosaved: '已自动保存',
            saved: '已保存',
            unsaved: '未保存',
            noteName: '文件名',
            quickTitle: '速记',
            quickSubtitle: '这里的内容独立于其它 Notes，并始终自动保存到快记。',
            quickPlaceholder: '写下需要马上记住的内容...',
            quickIntroTitle: '速记已准备好',
            quickIntroBody: '速记可以让你快速记下重要信息，并会同步显示在全新的快记小组件中。你也可以直接在小组件里编辑速记内容。',
            gotIt: '知道了',
            settingsTitle: '快记设置',
            defaultLocation: '新建 Notes 默认保存位置',
            autoSave: '开启自动保存',
            autoSaveHint: '开启后，返回和关闭快记时不会再出现保存弹窗。',
            documents: '文档',
            desktop: '桌面',
            renameTitle: '重命名 Note',
            deleteTitle: '删除 Note',
            deleteBody: '这个 Note 会移动到回收站。',
            cancel: '取消',
            confirmDelete: '删除',
            dontSave: '不保存',
            saveChanges: '保存',
            unsavedTitle: '保存更改？',
            unsavedBody: '当前 Note 有未保存的更改。',
            nameExists: '同一位置已存在同名文件。',
            invalidName: '文件名不能为空，也不能包含 / 或 \\。',
            newFileBase: '未命名',
            txtExt: '.txt',
            openError: '无法打开这个 Note。',
            editorPlaceholder: '开始记录...',
            revealError: '无法定位文件所在位置。',
            copiedSuffix: '副本',
            folderMissing: '保存位置不可用，已改用文档。'
        },
        en: {
            appTitle: 'Quick Notes',
            home: 'Home',
            quick: 'Quick Note',
            favorites: 'Favorites',
            settings: 'Settings',
            recentTitle: 'Recent Notes',
            recentSubtitle: 'Sorted by latest modification',
            favoritesTitle: 'Favorite Notes',
            favoritesSubtitle: 'Keep important files close',
            emptyRecent: 'No Notes yet',
            emptyRecentHint: 'Use the new button in the lower-right corner to start.',
            emptyFavorites: 'No favorites',
            emptyFavoritesHint: 'Favorite a file from its context menu to show it here.',
            modified: 'Modified',
            rename: 'Rename',
            reveal: 'Open file location',
            delete: 'Delete',
            copy: 'Duplicate',
            favorite: 'Favorite',
            unfavorite: 'Unfavorite',
            newNote: 'New',
            back: 'Back',
            save: 'Save',
            autosaved: 'Autosaved',
            saved: 'Saved',
            unsaved: 'Unsaved',
            noteName: 'File name',
            quickTitle: 'Quick Note',
            quickSubtitle: 'This content is independent from other Notes and always saves inside Quick Notes.',
            quickPlaceholder: 'Capture something important...',
            quickIntroTitle: 'Quick Note is ready',
            quickIntroBody: 'Quick Note helps you capture important information fast and syncs with the new Quick Notes widget. You can also edit it directly inside the widget.',
            gotIt: 'Got it',
            settingsTitle: 'Quick Notes settings',
            defaultLocation: 'Default save location for new Notes',
            autoSave: 'Enable autosave',
            autoSaveHint: 'When enabled, returning or closing Quick Notes will not show a save prompt.',
            documents: 'Documents',
            desktop: 'Desktop',
            renameTitle: 'Rename Note',
            deleteTitle: 'Delete Note',
            deleteBody: 'This Note will be moved to Recycle Bin.',
            cancel: 'Cancel',
            confirmDelete: 'Delete',
            dontSave: "Don't save",
            saveChanges: 'Save',
            unsavedTitle: 'Save changes?',
            unsavedBody: 'This Note has unsaved changes.',
            nameExists: 'A file with this name already exists here.',
            invalidName: 'The name cannot be empty or include / or \\.',
            newFileBase: 'Untitled',
            txtExt: '.txt',
            openError: 'Unable to open this Note.',
            editorPlaceholder: 'Start writing...',
            revealError: 'Unable to locate this file.',
            copiedSuffix: 'copy',
            folderMissing: 'The save location was unavailable, so Documents was used.'
        }
    },

    init(windowId) {
        this.windowId = windowId;
        this.container = document.getElementById(`${windowId}-content`) || document.getElementById(`window-${windowId}-content`);
        if (!this.container) return;

        this.ensureSettings();
        this.container.classList.add('notes-app');
        this.closeContextMenu();
        this.bindContextMenuGuard();
        this.activeView = 'home';
        this.editorState = null;
        this.renderShell();
    },

    bindContextMenuGuard() {
        if (this._contextGuardContainer && this._contextGuardHandler) {
            this._contextGuardContainer.removeEventListener('contextmenu', this._contextGuardHandler);
        }
        this._contextGuardContainer = this.container;
        this._contextGuardHandler = (e) => {
            if (this.isTextInputContext(e.target)) return;
            e.preventDefault();
        };
        this.container.addEventListener('contextmenu', this._contextGuardHandler);
    },

    isTextInputContext(target) {
        const editable = target && target.closest ? target.closest('textarea, [contenteditable="true"], [contenteditable="plaintext-only"]') : null;
        if (editable) return true;
        const input = target && target.closest ? target.closest('input') : null;
        if (!input) return false;
        const type = String(input.type || 'text').toLowerCase();
        return ['text', 'search', 'email', 'url', 'tel', 'password', 'number'].includes(type);
    },

    ensureSettings() {
        const updates = {};
        if (!State.settings.notesDefaultSaveLocation) updates.notesDefaultSaveLocation = 'documents';
        if (State.settings.notesAutoSave === undefined) updates.notesAutoSave = true;
        if (State.settings.notesQuickContent === undefined) updates.notesQuickContent = '';
        if (State.settings.notesQuickIntroSeen === undefined) updates.notesQuickIntroSeen = false;
        if (Object.keys(updates).length) State.updateSettings(updates);
    },

    tr(key) {
        const lang = (window.I18n && I18n.currentLang === 'en') ? 'en' : 'zh';
        return (this.text[lang] && this.text[lang][key]) || this.text.zh[key] || key;
    },

    icon(name) {
        return `Theme/Icon/Symbol_icon/stroke/${name}.svg`;
    },

    renderShell(view = this.activeView || 'home') {
        if (!this.container) return;
        if (this.frame && this.frame.destroy) this.frame.destroy();
        this.container.classList.add('notes-app');
        this.activeView = view;
        this.editorState = null;
        this.frame = FluentWindow.mount({
            container: this.container,
            title: this.tr('appTitle'),
            items: [
                { id: 'home', label: this.tr('home'), icon: 'Home' },
                { id: 'quick', label: this.tr('quick'), icon: 'Edit Pen' },
                { id: 'favorites', label: this.tr('favorites'), icon: 'Bookmark' },
                { id: 'settings', label: this.tr('settings'), icon: 'Settings' }
            ],
            activeId: view,
            onNavigate: (id, pageEl) => {
                this.activeView = id;
                this.closeContextMenu();
                this.renderView(pageEl, id);
            }
        });
    },

    renderView(pageEl, view) {
        if (view === 'quick') {
            this.renderQuickPage(pageEl);
            return;
        }
        if (view === 'favorites') {
            this.renderNotesListPage(pageEl, true);
            return;
        }
        if (view === 'settings') {
            this.renderSettingsPage(pageEl);
            return;
        }
        this.renderNotesListPage(pageEl, false);
    },

    renderNotesListPage(pageEl, onlyFavorites) {
        const notes = this.getNotes({ favoritesOnly: onlyFavorites });
        pageEl.className = `fw-page notes-page notes-${onlyFavorites ? 'favorites' : 'home'}-page`;
        pageEl.innerHTML = `
            <div class="notes-page-header">
                <div>
                    <h1>${onlyFavorites ? this.tr('favoritesTitle') : this.tr('recentTitle')}</h1>
                    <p>${onlyFavorites ? this.tr('favoritesSubtitle') : this.tr('recentSubtitle')}</p>
                </div>
            </div>
            <div class="notes-list" role="list"></div>
            ${onlyFavorites ? '' : `
                <button class="notes-fab" type="button" title="${this.tr('newNote')}" aria-label="${this.tr('newNote')}">
                    <img src="${this.icon('Add')}" alt="">
                </button>`}
        `;

        const list = pageEl.querySelector('.notes-list');
        if (!notes.length) {
            list.innerHTML = `
                <div class="notes-empty">
                    <img src="${this.icon(onlyFavorites ? 'Bookmark' : 'Note Text')}" alt="">
                    <h2>${onlyFavorites ? this.tr('emptyFavorites') : this.tr('emptyRecent')}</h2>
                    <p>${onlyFavorites ? this.tr('emptyFavoritesHint') : this.tr('emptyRecentHint')}</p>
                </div>`;
        } else {
            list.innerHTML = notes.map(item => this.renderNoteRow(item)).join('');
        }

        pageEl.querySelectorAll('.notes-row').forEach(row => {
            row.addEventListener('click', () => this.openEditor(row.dataset.fileId));
            row.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showNoteMenu(e.clientX, e.clientY, row.dataset.fileId);
            });
        });

        const fab = pageEl.querySelector('.notes-fab');
        if (fab) fab.addEventListener('click', () => this.createNewNote());
    },

    renderNoteRow(item) {
        const node = item.node;
        const name = this.escape(node.name || this.tr('noteName'));
        const path = this.escape(item.path);
        const modified = this.formatDate(node.modified || node.created);
        const favorite = node._notesFavorite ? `<img class="notes-row-star" src="${this.icon('Star')}" alt="">` : '';
        const preview = this.getPreviewText(node.content);
        return `
            <button class="notes-row" type="button" role="listitem" data-file-id="${node.id}">
                <span class="notes-row-icon"><img src="${this.icon('Document')}" alt=""></span>
                <span class="notes-row-main">
                    <span class="notes-row-title">${name}${favorite}</span>
                    <span class="notes-row-meta">${this.tr('modified')} ${this.escape(modified)} · ${path}</span>
                    ${preview ? `<span class="notes-row-preview">${this.escape(preview)}</span>` : ''}
                </span>
                <span class="notes-row-action"><img src="${this.icon('Chevron Right')}" alt=""></span>
            </button>`;
    },

    renderQuickPage(pageEl) {
        pageEl.className = 'fw-page notes-page notes-quick-page';
        pageEl.innerHTML = `
            <div class="notes-page-header">
                <div>
                    <h1>${this.tr('quickTitle')}</h1>
                    <p>${this.tr('quickSubtitle')}</p>
                </div>
            </div>
            <div class="notes-quick-panel">
                <textarea class="notes-quick-textarea" spellcheck="true" placeholder="${this.tr('quickPlaceholder')}">${this.escape(this.getQuickNoteContent())}</textarea>
                <div class="notes-quick-footer">
                    <span>${this.tr('autosaved')}</span>
                    <span class="notes-quick-count">0</span>
                </div>
            </div>`;

        const textarea = pageEl.querySelector('.notes-quick-textarea');
        const count = pageEl.querySelector('.notes-quick-count');
        const updateCount = () => {
            const value = textarea.value || '';
            count.textContent = `${value.length}`;
        };
        updateCount();
        textarea.addEventListener('input', () => {
            this.setQuickNoteContent(textarea.value, { source: 'app' });
            updateCount();
        });

        if (!State.settings.notesQuickIntroSeen && !this.quickIntroShownThisSession) {
            this.quickIntroShownThisSession = true;
            setTimeout(() => {
                if (!this.container || this.activeView !== 'quick') return;
                State.updateSettings({ notesQuickIntroSeen: true });
                this.showMessage(this.tr('quickIntroTitle'), this.tr('quickIntroBody'));
            }, 180);
        }
    },

    renderSettingsPage(pageEl) {
        const currentLocation = State.settings.notesDefaultSaveLocation || 'documents';
        const autosave = State.settings.notesAutoSave !== false;
        const folderOptions = this.getFolderOptions();
        pageEl.className = 'fw-page notes-page notes-settings-page';
        pageEl.innerHTML = `
            <div class="notes-page-header">
                <div>
                    <h1>${this.tr('settingsTitle')}</h1>
                    <p>${this.tr('autoSaveHint')}</p>
                </div>
            </div>
            <div class="notes-settings-list">
                <label class="notes-setting-row">
                    <span class="notes-setting-main">
                        <span>${this.tr('defaultLocation')}</span>
                    </span>
                    <select class="notes-location-select">
                        ${folderOptions.map(folder => `
                            <option value="${this.escape(folder.id)}"${currentLocation === folder.id ? ' selected' : ''}>${this.escape(folder.label)}</option>
                        `).join('')}
                    </select>
                </label>
                <label class="notes-setting-row">
                    <span class="notes-setting-main">
                        <span>${this.tr('autoSave')}</span>
                        <small>${this.tr('autoSaveHint')}</small>
                    </span>
                    <span class="notes-switch">
                        <input class="notes-autosave-toggle" type="checkbox"${autosave ? ' checked' : ''}>
                        <span></span>
                    </span>
                </label>
            </div>`;

        pageEl.querySelector('.notes-location-select').addEventListener('change', (e) => {
            State.updateSettings({ notesDefaultSaveLocation: e.target.value });
        });
        pageEl.querySelector('.notes-autosave-toggle').addEventListener('change', (e) => {
            State.updateSettings({ notesAutoSave: e.target.checked });
            if (e.target.checked && this.editorState && this.editorState.dirty) this.persistEditorDraft();
        });
    },

    renderEditor(fileId, isNew = false) {
        const node = State.findNode(fileId);
        if (!node || node.type !== 'file') {
            this.showMessage(this.tr('openError'));
            this.renderShell('home');
            return;
        }

        node._notesAppFile = true;
        State.updateFS(State.fs);
        if (this.frame && this.frame.destroy) this.frame.destroy();
        this.activeView = 'editor';
        this.editorState = {
            fileId,
            originalContent: node.content || '',
            draftContent: node.content || '',
            isNew,
            dirty: false,
            lastSavedAt: node.modified || node.created || new Date().toISOString()
        };

        this.frame = FluentWindow.mount({
            container: this.container,
            showSidebar: false,
            activeId: 'editor',
            onNavigate: (_, pageEl) => this.renderEditorPage(pageEl)
        });
    },

    renderEditorPage(pageEl) {
        const state = this.editorState;
        const node = State.findNode(state.fileId);
        const autosave = State.settings.notesAutoSave !== false;
        pageEl.className = 'fw-page notes-editor-page';
        pageEl.innerHTML = `
            <div class="notes-editor-topbar">
                <button class="notes-icon-button notes-editor-back" type="button" title="${this.tr('back')}" aria-label="${this.tr('back')}">
                    <img src="${this.icon('Arrow Left')}" alt="">
                </button>
                <div class="notes-editor-title" title="${this.escape(node.name || '')}">${this.escape(node.name || this.tr('noteName'))}</div>
                <button class="notes-primary-button notes-save-button" type="button"${autosave ? ' disabled' : ''}>
                    <img src="${this.icon('Save Floppy')}" alt="">
                    <span>${autosave ? this.tr('autosaved') : this.tr('save')}</span>
                </button>
            </div>
            <div class="notes-editor-toolbar" aria-label="formatting">
                <button type="button" data-command="bold"><strong>B</strong></button>
                <button type="button" data-command="italic"><em>I</em></button>
                <button type="button" data-command="underline"><u>U</u></button>
                <span class="notes-toolbar-divider"></span>
                <button type="button" data-command="insertUnorderedList"><img src="${this.icon('Checklist Note')}" alt=""></button>
                <button type="button" data-command="justifyLeft"><img src="${this.icon('L Arrow Left Down')}" alt=""></button>
                <button type="button" data-command="justifyCenter"><img src="${this.icon('Double Arrow Circle')}" alt=""></button>
                <button type="button" data-command="justifyRight"><img src="${this.icon('L Arrow Right Down')}" alt=""></button>
            </div>
            <div class="notes-editor-surface">
                <div class="notes-rich-editor" contenteditable="true" spellcheck="true" data-placeholder="${this.tr('editorPlaceholder')}"></div>
            </div>
            <div class="notes-editor-status">
                <span class="notes-status-text">${autosave ? this.tr('autosaved') : this.tr('saved')}</span>
                <span>${this.escape(this.formatDate(state.lastSavedAt))}</span>
            </div>`;

        const editor = pageEl.querySelector('.notes-rich-editor');
        editor.innerHTML = state.draftContent || '';
        const status = pageEl.querySelector('.notes-status-text');
        const saveBtn = pageEl.querySelector('.notes-save-button');

        const markDirty = () => {
            state.draftContent = editor.innerHTML;
            state.dirty = state.draftContent !== state.originalContent;
            status.textContent = autosave ? this.tr('autosaved') : (state.dirty ? this.tr('unsaved') : this.tr('saved'));
            if (State.settings.notesAutoSave !== false) this.scheduleAutoSave();
        };

        editor.addEventListener('input', markDirty);
        editor.addEventListener('paste', () => setTimeout(markDirty, 0));
        editor.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                this.persistEditorDraft();
            }
        });
        pageEl.querySelector('.notes-editor-back').addEventListener('click', () => this.returnHomeFromEditor());
        saveBtn.addEventListener('click', () => this.persistEditorDraft());
        pageEl.querySelectorAll('.notes-editor-toolbar button[data-command]').forEach(btn => {
            btn.addEventListener('click', () => {
                editor.focus();
                document.execCommand(btn.dataset.command, false, null);
                markDirty();
            });
        });
    },

    loadFile(fileId) {
        this.ensureSettings();
        this.navigateAfterPendingChanges(() => this.openEditor(fileId));
    },

    openData(data = {}) {
        this.ensureSettings();
        this.navigateAfterPendingChanges(() => this.applyOpenData(data));
    },

    applyOpenData(data = {}) {
        if (data.fileId) {
            this.openEditor(data.fileId);
            return;
        }
        if (data.view === 'quick') {
            this.renderShell('quick');
            return;
        }
        if (data.view === 'favorites') {
            this.renderShell('favorites');
            return;
        }
        this.renderShell('home');
    },

    openEditor(fileId, isNew = false) {
        this.closeContextMenu();
        this.renderEditor(fileId, isNew);
    },

    openWithContent(content = '') {
        this.navigateAfterPendingChanges(() => {
            const file = this.createFileInDefaultFolder(this.uniqueFileName(this.getDefaultFolder(), this.tr('newFileBase') + this.tr('txtExt')), content);
            this.openEditor(file.id, true);
        });
    },

    setDocument(content = '') {
        if (this.editorState) {
            const editor = this.container.querySelector('.notes-rich-editor');
            if (editor) {
                editor.innerHTML = content;
                editor.dispatchEvent(new Event('input', { bubbles: true }));
            }
        } else {
            this.openWithContent(content);
        }
    },

    async returnHomeFromEditor() {
        const ok = await this.handlePendingEditorChanges();
        if (!ok) return;
        this.renderShell('home');
    },

    async handlePendingEditorChanges() {
        if (!this.editorState) return true;
        if (State.settings.notesAutoSave !== false) {
            this.persistEditorDraft();
            return true;
        }
        if (!this.editorState.dirty) return true;
        const action = await this.askUnsavedAction();
        if (action === 'cancel') return false;
        if (action === 'save') {
            this.persistEditorDraft(true);
        } else {
            this.revertEditorDraft();
        }
        return true;
    },

    navigateAfterPendingChanges(action) {
        Promise.resolve(this.handlePendingEditorChanges())
            .then(ok => {
                if (ok !== false) action();
            })
            .catch(err => {
                console.warn('[NotesApp] pending changes check failed', err);
            });
    },

    beforeClose() {
        return this.handlePendingEditorChanges().then(ok => {
            if (ok) this.cleanup();
            return ok;
        });
    },

    cleanup() {
        this.closeContextMenu();
        if (this._contextGuardContainer && this._contextGuardHandler) {
            this._contextGuardContainer.removeEventListener('contextmenu', this._contextGuardHandler);
        }
        this._contextGuardContainer = null;
        this._contextGuardHandler = null;
        clearTimeout(this.saveTimer);
        clearTimeout(this.widgetRefreshTimer);
        this.saveTimer = null;
        this.widgetRefreshTimer = null;
        if (this.frame && this.frame.destroy) this.frame.destroy();
        this.frame = null;
        this.windowId = null;
        this.container = null;
        this.editorState = null;
    },

    scheduleAutoSave() {
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.persistEditorDraft(), 450);
    },

    persistEditorDraft(force = false) {
        if (!this.editorState) return;
        const state = this.editorState;
        if (!force && !state.dirty && State.settings.notesAutoSave === false) return;
        const node = State.findNode(state.fileId);
        if (!node) return;
        node.content = state.draftContent || '';
        node.size = this.getByteSize(node.content);
        node.modified = new Date().toISOString();
        node._notesAppFile = true;
        node._hiddenFromRecent = false;
        State.updateFS(State.fs);
        state.originalContent = node.content;
        state.dirty = false;
        state.isNew = false;
        state.lastSavedAt = node.modified;

        const status = this.container && this.container.querySelector('.notes-status-text');
        if (status) status.textContent = State.settings.notesAutoSave !== false ? this.tr('autosaved') : this.tr('saved');
    },

    revertEditorDraft() {
        const state = this.editorState;
        if (!state) return;
        const node = State.findNode(state.fileId);
        if (!node) return;
        if (state.isNew && !state.originalContent) {
            this.removeNodeFromFS(node.id, false);
            return;
        }
        node.content = state.originalContent;
        node.size = this.getByteSize(node.content);
        State.updateFS(State.fs);
    },

    async askUnsavedAction() {
        if (!window.FluentUI || !FluentUI.Dialog) {
            const save = confirm(this.tr('unsavedBody'));
            return save ? 'save' : 'discard';
        }
        return new Promise(resolve => {
            FluentUI.Dialog({
                title: this.tr('unsavedTitle'),
                content: `<p>${this.tr('unsavedBody')}</p>`,
                buttons: [
                    { text: this.tr('cancel'), variant: 'secondary', value: 'cancel' },
                    { text: this.tr('dontSave'), variant: 'secondary', value: 'discard' },
                    { text: this.tr('saveChanges'), variant: 'primary', value: 'save' }
                ],
                onClose: result => resolve(result || 'cancel')
            });
        });
    },

    createNewNote() {
        const folder = this.getDefaultFolder();
        const name = this.uniqueFileName(folder, this.tr('newFileBase') + this.tr('txtExt'));
        const file = this.createFileInDefaultFolder(name, '');
        this.openEditor(file.id, true);
    },

    createFileInDefaultFolder(name, content = '') {
        const folder = this.getDefaultFolder();
        const now = new Date().toISOString();
        const file = {
            id: 'file_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            name,
            type: 'file',
            content,
            size: this.getByteSize(content),
            created: now,
            modified: now,
            _notesAppFile: true,
            _hiddenFromRecent: false
        };
        folder.children = folder.children || [];
        folder.children.unshift(file);
        State.updateFS(State.fs);
        return file;
    },

    getDefaultFolder() {
        const id = State.settings.notesDefaultSaveLocation || 'documents';
        let folder = State.findNode(id);
        if (!folder || folder.type !== 'folder') {
            folder = State.findNode('documents') || this.getFSRoot();
            if (State.settings.notesDefaultSaveLocation !== 'documents') {
                State.updateSettings({ notesDefaultSaveLocation: 'documents' });
                this.toast(this.tr('folderMissing'));
            }
        }
        return folder;
    },

    getFolderOptions() {
        const options = [];
        const root = this.getFSRoot();
        const walk = (node, parents = []) => {
            if (!node || node.type !== 'folder' || node.id === 'recycle') return;
            const label = this.folderLabel(node, parents);
            options.push({ id: node.id, label });
            (node.children || []).forEach(child => walk(child, parents.concat(node)));
        };
        walk(root);
        return options.filter(option => option.id !== 'root');
    },

    folderLabel(node, parents) {
        if (node.id === 'documents') return this.tr('documents');
        if (node.id === 'desktop') return this.tr('desktop');
        const parts = parents.concat(node)
            .filter(item => item && item.id !== 'root')
            .map(item => item.name)
            .filter(Boolean);
        return parts.join(' / ') || node.name || node.id;
    },

    getNotes({ favoritesOnly = false } = {}) {
        const result = [];
        const walk = (node, parents = []) => {
            if (!node || node._deleted || node.id === 'recycle') return;
            if (node.type === 'file') {
                if (this.isNoteFile(node) && (!favoritesOnly || node._notesFavorite)) {
                    result.push({
                        node,
                        parent: parents[parents.length - 1] || null,
                        path: this.pathForNode(node.id)
                    });
                }
                return;
            }
            if (Array.isArray(node.children)) {
                node.children.forEach(child => walk(child, parents.concat(node)));
            }
        };
        walk(this.getFSRoot());
        return result.sort((a, b) => new Date(b.node.modified || b.node.created || 0) - new Date(a.node.modified || a.node.created || 0));
    },

    isNoteFile(node) {
        if (!node || node.type !== 'file') return false;
        if (node._notesAppFile) return true;
        const name = String(node.name || '').toLowerCase();
        return /\.(txt|md|html|htm|note|rtf)$/.test(name);
    },

    getNoteItem(fileId) {
        return this.getNotes().find(item => item.node.id === fileId) || null;
    },

    showNoteMenu(x, y, fileId) {
        const item = this.getNoteItem(fileId);
        if (!item) return;
        this.closeContextMenu();
        const isFavorite = !!item.node._notesFavorite;
        const existingMenu = document.getElementById('notes-file-context-menu');
        if (existingMenu) existingMenu.remove();

        const runAction = (action) => {
            this.closeContextMenu();
            this.handleNoteAction(action, item.node.id);
        };

        const actions = [
            { id: 'rename', icon: 'Edit Pen', label: this.tr('rename') },
            { id: 'reveal', icon: 'Folder Open', label: this.tr('reveal') },
            { separator: true },
            { id: 'copy', icon: 'Copy', label: this.tr('copy') },
            { id: 'favorite', icon: isFavorite ? 'Bookmark Minus' : 'Bookmark Plus', label: isFavorite ? this.tr('unfavorite') : this.tr('favorite') },
            { separator: true },
            { id: 'delete', icon: 'Trash', label: this.tr('delete') }
        ];
        const menu = document.createElement('div');
        menu.id = 'notes-file-context-menu';
        menu.className = 'context-menu hidden';
        menu.innerHTML = actions.map(action => {
            if (action.separator) return '<div class="context-menu-separator"></div>';
            return `
                <div class="context-menu-item" data-action="${action.id}">
                    <img src="${this.icon(action.icon)}" alt="">
                    <span>${this.escape(action.label)}</span>
                </div>`;
        }).join('');
        menu.addEventListener('contextmenu', (e) => e.preventDefault());
        menu.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.context-menu-item');
            if (!menuItem) return;
            runAction(menuItem.dataset.action);
        });

        document.body.appendChild(menu);
        this.contextMenu = menu;
        this.positionNoteMenu(menu, x, y);

        const outsidePointerHandler = (e) => {
            if (this.contextMenu && !this.contextMenu.contains(e.target)) this.closeContextMenu();
        };
        const blurHandler = () => this.closeContextMenu();
        this._menuPointerHandler = outsidePointerHandler;
        this._menuBlurHandler = blurHandler;

        setTimeout(() => {
            if (this.contextMenu !== menu || this._menuPointerHandler !== outsidePointerHandler) return;
            document.addEventListener('pointerdown', outsidePointerHandler);
            window.addEventListener('blur', blurHandler, { once: true });
        }, 0);
    },

    positionNoteMenu(menu, x, y) {
        menu.classList.remove('hidden');
        const margin = 8;
        const width = menu.offsetWidth;
        const height = menu.offsetHeight;
        let left = x;
        let top = y;
        if (x + width > window.innerWidth - margin) left = x - width;
        if (y + height > window.innerHeight - margin) top = y - height;
        left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
        top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
    },

    closeContextMenu() {
        if (this._menuPointerHandler) {
            document.removeEventListener('pointerdown', this._menuPointerHandler);
            this._menuPointerHandler = null;
        }
        if (this._menuBlurHandler) {
            window.removeEventListener('blur', this._menuBlurHandler);
            this._menuBlurHandler = null;
        }
        if (this.contextMenu) {
            this.contextMenu.remove();
            this.contextMenu = null;
        }
    },

    handleNoteAction(action, fileId) {
        if (action === 'rename') this.renameNote(fileId);
        else if (action === 'reveal') this.revealNote(fileId);
        else if (action === 'copy') this.copyNote(fileId);
        else if (action === 'favorite') this.toggleFavorite(fileId);
        else if (action === 'delete') this.deleteNote(fileId);
    },

    async renameNote(fileId) {
        const item = this.getNoteItem(fileId);
        if (!item) return;
        const nextName = await this.askForText(this.tr('renameTitle'), item.node.name);
        if (nextName === null) return;
        const clean = nextName.trim();
        if (!this.isValidFileName(clean)) {
            this.showMessage(this.tr('invalidName'));
            return;
        }
        const finalName = this.normalizeRenamedFileName(item.node.name, clean);
        if (this.siblingNameExists(item.parent, finalName, fileId)) {
            this.showMessage(this.tr('nameExists'));
            return;
        }
        item.node.name = finalName;
        item.node.modified = new Date().toISOString();
        item.node._notesAppFile = true;
        State.updateFS(State.fs);
        this.refreshCurrentView();
    },

    revealNote(fileId) {
        const item = this.getNoteItem(fileId);
        if (!item || !item.parent) {
            this.showMessage(this.tr('revealError'));
            return;
        }
        WindowManager.openApp('files');
        setTimeout(() => {
            if (window.FilesApp && typeof FilesApp.navigateToId === 'function') {
                FilesApp.navigateToId(item.parent.id, fileId);
            }
        }, 350);
    },

    copyNote(fileId) {
        const item = this.getNoteItem(fileId);
        if (!item || !item.parent) return;
        const copy = this.deepCloneNote(item.node);
        copy.id = this.newFileId();
        copy.name = this.nextDuplicateName(item.parent, item.node.name);
        copy.created = new Date().toISOString();
        copy.modified = copy.created;
        copy._notesAppFile = true;
        copy._hiddenFromRecent = false;
        item.parent.children = item.parent.children || [];
        const index = item.parent.children.findIndex(child => child.id === item.node.id);
        item.parent.children.splice(Math.max(0, index + 1), 0, copy);
        State.updateFS(State.fs);
        this.refreshCurrentView();
    },

    toggleFavorite(fileId) {
        const item = this.getNoteItem(fileId);
        if (!item) return;
        item.node._notesFavorite = !item.node._notesFavorite;
        State.updateFS(State.fs);
        this.refreshCurrentView();
    },

    async deleteNote(fileId) {
        const item = this.getNoteItem(fileId);
        if (!item) return;
        const ok = await this.askDelete();
        if (!ok) return;
        this.removeNodeFromFS(fileId, true);
        if (this.editorState && this.editorState.fileId === fileId) this.renderShell('home');
        else this.refreshCurrentView();
    },

    removeNodeFromFS(fileId, moveToRecycle) {
        const parent = State.findParentNode(fileId);
        if (!parent || !Array.isArray(parent.children)) return false;
        const index = parent.children.findIndex(child => child.id === fileId);
        if (index < 0) return false;
        const [node] = parent.children.splice(index, 1);
        if (moveToRecycle) {
            const recycle = State.findNode('recycle');
            if (recycle) {
                recycle.children = recycle.children || [];
                node._recycle = { originalParentId: parent.id, deletedAt: new Date().toISOString() };
                recycle.children.unshift(node);
            }
        }
        State.updateFS(State.fs);
        return true;
    },

    askDelete() {
        if (!window.FluentUI || !FluentUI.Dialog) return Promise.resolve(confirm(this.tr('deleteBody')));
        return new Promise(resolve => {
            FluentUI.Dialog({
                type: 'warning',
                title: this.tr('deleteTitle'),
                content: `<p>${this.tr('deleteBody')}</p>`,
                buttons: [
                    { text: this.tr('cancel'), variant: 'secondary', value: false },
                    { text: this.tr('confirmDelete'), variant: 'danger', value: true }
                ],
                onClose: result => resolve(result === true)
            });
        });
    },

    askForText(title, value) {
        if (window.FluentUI && FluentUI.InputDialog) {
            return new Promise(resolve => {
                FluentUI.InputDialog({
                    title,
                    defaultValue: value,
                    placeholder: this.tr('noteName'),
                    onConfirm: (nextValue) => resolve(nextValue),
                    onCancel: () => resolve(null)
                });
            });
        }
        const next = prompt(title, value);
        return Promise.resolve(next === null ? null : next);
    },

    showMessage(title, body = '') {
        if (window.FluentUI && FluentUI.Dialog) {
            FluentUI.Dialog({
                title,
                content: body ? `<p>${body}</p>` : '',
                buttons: [{ text: this.tr('gotIt'), variant: 'primary' }]
            });
            return;
        }
        alert(body ? `${title}\n${body}` : title);
    },

    toast(message) {
        if (window.FluentUI && FluentUI.Toast) FluentUI.Toast({ title: this.tr('appTitle'), message, type: 'info' });
        else console.info(message);
    },

    refreshCurrentView() {
        if (!this.frame || !this.frame.pageEl || this.activeView === 'editor') return;
        this.renderView(this.frame.pageEl, this.activeView);
    },

    getQuickNoteContent() {
        return State.settings.notesQuickContent || '';
    },

    setQuickNoteContent(content, options = {}) {
        State.updateSettings({
            notesQuickContent: String(content || ''),
            notesQuickModified: new Date().toISOString()
        });
        window.dispatchEvent(new CustomEvent('quickNotesChange', { detail: { content: String(content || '') } }));
        if (options.source !== 'widget') this.scheduleWidgetRefresh();
    },

    scheduleWidgetRefresh() {
        clearTimeout(this.widgetRefreshTimer);
        this.widgetRefreshTimer = setTimeout(() => {
            if (window.Widgets && typeof Widgets.renderAll === 'function') Widgets.renderAll();
        }, 700);
    },

    deepCloneNote(node) {
        return JSON.parse(JSON.stringify(node));
    },

    newFileId() {
        return 'file_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    },

    nextDuplicateName(parent, name) {
        const split = this.splitFileName(name);
        let n = 2;
        let candidate = `${split.base}${n}${split.ext}`;
        while (this.siblingNameExists(parent, candidate)) {
            n += 1;
            candidate = `${split.base}${n}${split.ext}`;
        }
        return candidate;
    },

    uniqueFileName(parent, preferredName) {
        if (!this.siblingNameExists(parent, preferredName)) return preferredName;
        return this.nextDuplicateName(parent, preferredName);
    },

    siblingNameExists(parent, name, exceptId = null) {
        if (!parent || !Array.isArray(parent.children)) return false;
        return parent.children.some(child => child.id !== exceptId && String(child.name || '').toLowerCase() === name.toLowerCase());
    },

    normalizeRenamedFileName(oldName, nextName) {
        const oldSplit = this.splitFileName(oldName);
        const nextSplit = this.splitFileName(nextName);
        if (!nextSplit.ext && oldSplit.ext) return nextName + oldSplit.ext;
        return nextName;
    },

    splitFileName(name) {
        const clean = String(name || '');
        const dot = clean.lastIndexOf('.');
        if (dot <= 0) return { base: clean || this.tr('newFileBase'), ext: '' };
        return { base: clean.slice(0, dot), ext: clean.slice(dot) };
    },

    isValidFileName(name) {
        return !!String(name || '').trim() && !/[\\/]/.test(name);
    },

    pathForNode(fileId) {
        const path = [];
        const walk = (node, parents = []) => {
            if (!node) return false;
            if (node.id === fileId) {
                path.push(...parents.map(p => p.name).filter(Boolean));
                return true;
            }
            if (Array.isArray(node.children)) {
                return node.children.some(child => walk(child, parents.concat(node)));
            }
            return false;
        };
        walk(this.getFSRoot());
        return path.filter(name => name !== 'root').join(' / ') || this.tr('documents');
    },

    getFSRoot() {
        return (State.fs && State.fs.root) || State.fs;
    },

    getPreviewText(content) {
        const text = String(content || '').replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return text.length > 110 ? text.slice(0, 110) + '...' : text;
    },

    getByteSize(text) {
        try {
            return new Blob([String(text || '')]).size;
        } catch (_) {
            return String(text || '').length;
        }
    },

    formatDate(value) {
        const date = value ? new Date(value) : new Date();
        if (Number.isNaN(date.getTime())) return '';
        const lang = (window.I18n && I18n.currentLang === 'en') ? 'en-US' : 'zh-CN';
        return date.toLocaleString(lang, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    },

    escape(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    }
};

window.NotesApp = NotesApp;
