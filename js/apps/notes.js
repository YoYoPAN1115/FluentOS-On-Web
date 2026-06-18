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
    newNoteRevealRunning: false,
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
            folderMissing: '保存位置不可用，已改用文档。',
            importMarkdown: '导入文本',
            exportTxt: '导出 TXT',
            exportMd: '导出 MD',
            fontFamily: '字体',
            fontSize: '字号',
            paragraphStyle: '段落样式',
            normalText: '正文',
            heading1: '标题 1',
            heading2: '标题 2',
            heading3: '标题 3',
            quote: '引用',
            increaseFont: '增大字号',
            decreaseFont: '减小字号',
            textColor: '文字颜色',
            highlightColor: '高亮颜色',
            bold: '加粗',
            italic: '斜体',
            underline: '下划线',
            strike: '删除线',
            subscript: '下标',
            superscript: '上标',
            bulletList: '项目符号',
            numberedList: '编号列表',
            outdent: '减少缩进',
            indent: '增加缩进',
            alignLeft: '左对齐',
            alignCenter: '居中',
            alignRight: '右对齐',
            alignJustify: '两端对齐',
            lineHeight: '行距',
            clearFormat: '清除格式',
            exported: '已导出',
            importSuccess: '已导入文本文件',
            importMarkdownError: '只能导入 .txt 或 .md 文件。',
            characters: '字符'
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
            folderMissing: 'The save location was unavailable, so Documents was used.',
            importMarkdown: 'Import text',
            exportTxt: 'Export TXT',
            exportMd: 'Export MD',
            fontFamily: 'Font',
            fontSize: 'Size',
            paragraphStyle: 'Paragraph style',
            normalText: 'Body',
            heading1: 'Heading 1',
            heading2: 'Heading 2',
            heading3: 'Heading 3',
            quote: 'Quote',
            increaseFont: 'Increase font size',
            decreaseFont: 'Decrease font size',
            textColor: 'Text color',
            highlightColor: 'Highlight color',
            bold: 'Bold',
            italic: 'Italic',
            underline: 'Underline',
            strike: 'Strikethrough',
            subscript: 'Subscript',
            superscript: 'Superscript',
            bulletList: 'Bullets',
            numberedList: 'Numbered list',
            outdent: 'Decrease indent',
            indent: 'Increase indent',
            alignLeft: 'Align left',
            alignCenter: 'Center',
            alignRight: 'Align right',
            alignJustify: 'Justify',
            lineHeight: 'Line spacing',
            clearFormat: 'Clear formatting',
            exported: 'Exported',
            importSuccess: 'Text file imported',
            importMarkdownError: 'Only .txt or .md files can be imported.',
            characters: 'characters'
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
                ${onlyFavorites ? '' : `
                    <div class="notes-header-actions">
                        <button class="notes-secondary-button notes-import-text-button" type="button">
                            <img src="${this.icon('Upload')}" alt="">
                            <span>${this.tr('importMarkdown')}</span>
                        </button>
                    </div>`}
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
        if (fab) fab.addEventListener('click', () => this.createNewNoteFromButton(fab));
        const importButton = pageEl.querySelector('.notes-import-text-button');
        if (importButton) importButton.addEventListener('click', () => this.importTextFile());
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
                <section class="notes-setting-row">
                    <span class="notes-setting-main">
                        <span>${this.tr('defaultLocation')}</span>
                    </span>
                    <span class="notes-setting-control notes-location-select-host"></span>
                </section>
                <section class="notes-setting-row">
                    <span class="notes-setting-main">
                        <span>${this.tr('autoSave')}</span>
                        <small>${this.tr('autoSaveHint')}</small>
                    </span>
                    <span class="notes-setting-control notes-autosave-toggle-host"></span>
                </section>
            </div>`;

        const locationHost = pageEl.querySelector('.notes-location-select-host');
        if (locationHost && window.FluentUI && typeof FluentUI.Select === 'function') {
            locationHost.appendChild(FluentUI.Select({
                value: currentLocation,
                className: 'notes-settings-select',
                options: folderOptions.map(folder => ({ value: folder.id, label: folder.label })),
                onChange: (value) => State.updateSettings({ notesDefaultSaveLocation: value })
            }));
        }

        const autosaveHost = pageEl.querySelector('.notes-autosave-toggle-host');
        if (autosaveHost && window.FluentUI && typeof FluentUI.Toggle === 'function') {
            autosaveHost.appendChild(FluentUI.Toggle({
                checked: autosave,
                className: 'notes-settings-toggle',
                onChange: (checked) => {
                    State.updateSettings({ notesAutoSave: checked });
                    if (checked && this.editorState && this.editorState.dirty) this.persistEditorDraft();
                }
            }));
        }
    },

    renderEditor(fileId, isNew = false, options = {}) {
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
        const fileFormat = this.getNodeFormat(node);
        const editorHtml = this.contentToEditorHtml(node.content || '', fileFormat);
        this.editorState = {
            fileId,
            originalContent: node.content || '',
            draftContent: node.content || '',
            draftHtml: editorHtml,
            fileFormat,
            revealFromNewButton: !!options.revealFromNewButton,
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
        pageEl.className = `fw-page notes-editor-page notes-page-elements-enter${state.revealFromNewButton ? ' notes-editor-page-reveal' : ''}`;
        pageEl.innerHTML = `
            <div class="notes-editor-topbar">
                <button class="notes-icon-button notes-editor-back" type="button" title="${this.tr('back')}" aria-label="${this.tr('back')}">
                    <img src="${this.icon('Arrow Left')}" alt="">
                </button>
                <div class="notes-editor-title" title="${this.escape(node.name || '')}">${this.escape(node.name || this.tr('noteName'))}</div>
                <div class="notes-editor-actions">
                    <button class="notes-icon-button notes-import-text-button" type="button" title="${this.tr('importMarkdown')}" aria-label="${this.tr('importMarkdown')}">
                        <img src="${this.icon('Upload')}" alt="">
                    </button>
                    <button class="notes-icon-button notes-export-txt-button notes-format-export" type="button" title="${this.tr('exportTxt')}" aria-label="${this.tr('exportTxt')}">TXT</button>
                    <button class="notes-icon-button notes-export-md-button notes-format-export" type="button" title="${this.tr('exportMd')}" aria-label="${this.tr('exportMd')}">MD</button>
                    <button class="notes-primary-button notes-save-button" type="button"${autosave ? ' disabled' : ''}>
                        <img src="${this.icon('Save Floppy')}" alt="">
                        <span>${autosave ? this.tr('autosaved') : this.tr('save')}</span>
                    </button>
                </div>
            </div>
            <div class="notes-editor-toolbar" aria-label="formatting">
                <div class="notes-toolbar-group">
                    <span class="notes-select-host notes-font-family-host"></span>
                    <span class="notes-select-host notes-font-size-host"></span>
                    <button type="button" data-action="decreaseFontSize" title="${this.tr('decreaseFont')}" aria-label="${this.tr('decreaseFont')}">A-</button>
                    <button type="button" data-action="increaseFontSize" title="${this.tr('increaseFont')}" aria-label="${this.tr('increaseFont')}">A+</button>
                </div>
                <span class="notes-toolbar-divider"></span>
                <div class="notes-toolbar-group">
                    <span class="notes-select-host notes-format-block-host"></span>
                </div>
                <span class="notes-toolbar-divider"></span>
                <div class="notes-toolbar-group">
                    <button type="button" data-command="bold" title="${this.tr('bold')}" aria-label="${this.tr('bold')}"><strong>B</strong></button>
                    <button type="button" data-command="italic" title="${this.tr('italic')}" aria-label="${this.tr('italic')}"><em>I</em></button>
                    <button type="button" data-command="underline" title="${this.tr('underline')}" aria-label="${this.tr('underline')}"><u>U</u></button>
                    <button type="button" data-command="strikeThrough" title="${this.tr('strike')}" aria-label="${this.tr('strike')}"><s>abc</s></button>
                    <button type="button" data-command="subscript" title="${this.tr('subscript')}" aria-label="${this.tr('subscript')}">X<sub>2</sub></button>
                    <button type="button" data-command="superscript" title="${this.tr('superscript')}" aria-label="${this.tr('superscript')}">X<sup>2</sup></button>
                </div>
                <span class="notes-toolbar-divider"></span>
                <div class="notes-toolbar-group">
                    <label class="notes-color-tool" title="${this.tr('textColor')}" aria-label="${this.tr('textColor')}">
                        <span class="notes-color-symbol notes-text-color-symbol">A</span>
                        <input class="notes-color-input notes-text-color-input" type="color" value="#1f1f1f">
                    </label>
                    <label class="notes-color-tool" title="${this.tr('highlightColor')}" aria-label="${this.tr('highlightColor')}">
                        <img src="${this.icon('Color Picker')}" alt="">
                        <input class="notes-color-input notes-highlight-color-input" type="color" value="#fff2ab">
                    </label>
                </div>
                <span class="notes-toolbar-divider"></span>
                <div class="notes-toolbar-group">
                    <button type="button" data-command="insertUnorderedList" title="${this.tr('bulletList')}" aria-label="${this.tr('bulletList')}"><img src="${this.icon('Checklist Note')}" alt=""></button>
                    <button type="button" data-command="insertOrderedList" title="${this.tr('numberedList')}" aria-label="${this.tr('numberedList')}">1.</button>
                    <button type="button" data-command="outdent" title="${this.tr('outdent')}" aria-label="${this.tr('outdent')}"><img src="${this.icon('Arrow Left')}" alt=""></button>
                    <button type="button" data-command="indent" title="${this.tr('indent')}" aria-label="${this.tr('indent')}"><img src="${this.icon('Arrow Right')}" alt=""></button>
                </div>
                <span class="notes-toolbar-divider"></span>
                <div class="notes-toolbar-group">
                    <button type="button" data-command="justifyLeft" title="${this.tr('alignLeft')}" aria-label="${this.tr('alignLeft')}"><img src="${this.icon('Align Left')}" alt=""></button>
                    <button type="button" data-command="justifyCenter" title="${this.tr('alignCenter')}" aria-label="${this.tr('alignCenter')}"><img src="${this.icon('Align Center')}" alt=""></button>
                    <button type="button" data-command="justifyRight" title="${this.tr('alignRight')}" aria-label="${this.tr('alignRight')}"><img src="${this.icon('Align Right')}" alt=""></button>
                    <button type="button" data-command="justifyFull" title="${this.tr('alignJustify')}" aria-label="${this.tr('alignJustify')}">J</button>
                    <span class="notes-select-host notes-line-height-host"></span>
                    <button type="button" data-command="removeFormat" title="${this.tr('clearFormat')}" aria-label="${this.tr('clearFormat')}">Tx</button>
                </div>
            </div>
            <div class="notes-editor-surface">
                <div class="notes-rich-editor" contenteditable="true" spellcheck="true" data-placeholder="${this.tr('editorPlaceholder')}"></div>
            </div>
            <div class="notes-editor-status">
                <span class="notes-status-text">${autosave ? this.tr('autosaved') : this.tr('saved')}</span>
                <span class="notes-editor-count">0 ${this.tr('characters')}</span>
                <span class="notes-editor-time">${this.escape(this.formatDate(state.lastSavedAt))}</span>
            </div>`;

        const editor = pageEl.querySelector('.notes-rich-editor');
        editor.innerHTML = state.draftHtml || '';
        const status = pageEl.querySelector('.notes-status-text');
        const saveBtn = pageEl.querySelector('.notes-save-button');
        const count = pageEl.querySelector('.notes-editor-count');
        const updateCount = () => {
            count.textContent = `${this.getEditorPlainText(editor).length} ${this.tr('characters')}`;
        };

        const markDirty = () => {
            state.draftHtml = editor.innerHTML;
            state.draftContent = this.editorHtmlToStoredContent(state.draftHtml, state.fileFormat);
            state.dirty = state.draftContent !== state.originalContent;
            status.textContent = autosave ? this.tr('autosaved') : (state.dirty ? this.tr('unsaved') : this.tr('saved'));
            updateCount();
            if (State.settings.notesAutoSave !== false) this.scheduleAutoSave();
        };

        updateCount();
        this.setupEditorToolbar(pageEl, editor, markDirty);
        editor.addEventListener('input', markDirty);
        editor.addEventListener('paste', () => setTimeout(markDirty, 0));
        editor.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                this.persistEditorDraft();
            }
        });
        pageEl.querySelector('.notes-editor-back').addEventListener('click', () => this.returnHomeFromEditor());
        pageEl.querySelector('.notes-import-text-button').addEventListener('click', () => this.importTextFile());
        pageEl.querySelector('.notes-export-txt-button').addEventListener('click', () => this.exportCurrentEditor('txt'));
        pageEl.querySelector('.notes-export-md-button').addEventListener('click', () => this.exportCurrentEditor('md'));
        saveBtn.addEventListener('click', () => this.persistEditorDraft());
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

    openEditor(fileId, isNew = false, options = {}) {
        this.closeContextMenu();
        this.renderEditor(fileId, isNew, options);
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
                editor.innerHTML = this.contentToEditorHtml(content, this.editorState.fileFormat);
                editor.dispatchEvent(new Event('input', { bubbles: true }));
            }
        } else {
            this.openWithContent(content);
        }
    },

    setupEditorToolbar(pageEl, editor, markDirty) {
        const toolbar = pageEl.querySelector('.notes-editor-toolbar');
        if (!toolbar || !editor) return;

        let lastRange = null;
        const rememberSelection = () => {
            const selection = window.getSelection && window.getSelection();
            if (!selection || !selection.rangeCount) return;
            const range = selection.getRangeAt(0);
            if (this.isRangeInsideEditor(editor, range)) {
                lastRange = range.cloneRange();
            }
        };
        const restoreSelection = () => {
            editor.focus({ preventScroll: true });
            if (!lastRange) return;
            const selection = window.getSelection && window.getSelection();
            if (!selection) return;
            selection.removeAllRanges();
            selection.addRange(lastRange);
        };
        const afterCommand = () => {
            this.normalizeEditorMarkup(editor);
            markDirty();
            rememberSelection();
            this.updateToolbarButtonStates(pageEl);
        };

        editor.addEventListener('keyup', () => {
            rememberSelection();
            this.updateToolbarButtonStates(pageEl);
        });
        editor.addEventListener('mouseup', () => {
            rememberSelection();
            this.updateToolbarButtonStates(pageEl);
        });
        editor.addEventListener('focus', rememberSelection);

        toolbar.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) e.preventDefault();
            rememberSelection();
        });

        toolbar.querySelectorAll('button[data-command]').forEach((button) => {
            button.addEventListener('click', () => {
                restoreSelection();
                document.execCommand(button.dataset.command, false, null);
                afterCommand();
            });
        });

        this.mountToolbarSelect(toolbar.querySelector('.notes-font-family-host'), {
            options: this.getToolbarFontFamilyOptions(),
            value: '"Segoe UI", system-ui, sans-serif',
            className: 'notes-toolbar-select notes-font-family',
            title: this.tr('fontFamily'),
            onChange: (value) => {
                restoreSelection();
                document.execCommand('fontName', false, value);
                afterCommand();
            }
        });

        const fontSizeOptions = this.getToolbarFontSizeOptions();
        const fontSizeSelect = this.mountToolbarSelect(toolbar.querySelector('.notes-font-size-host'), {
            options: fontSizeOptions,
            value: '16',
            className: 'notes-toolbar-select notes-font-size',
            title: this.tr('fontSize'),
            onChange: (value) => {
                restoreSelection();
                this.applyEditorFontSize(editor, Number(value));
                afterCommand();
            }
        });

        this.mountToolbarSelect(toolbar.querySelector('.notes-format-block-host'), {
            options: this.getToolbarFormatBlockOptions(),
            value: 'P',
            className: 'notes-toolbar-select notes-format-block',
            title: this.tr('paragraphStyle') || this.tr('normalText'),
            onChange: (value) => {
                restoreSelection();
                document.execCommand('formatBlock', false, value);
                afterCommand();
            }
        });

        this.mountToolbarSelect(toolbar.querySelector('.notes-line-height-host'), {
            options: this.getToolbarLineHeightOptions(),
            value: '1.5',
            className: 'notes-toolbar-select notes-line-height',
            title: this.tr('lineHeight'),
            onChange: (value) => {
                restoreSelection();
                this.applyEditorLineHeight(editor, value);
                afterCommand();
            }
        });

        toolbar.querySelectorAll('button[data-action]').forEach((button) => {
            button.addEventListener('click', () => {
                restoreSelection();
                const sizes = fontSizeOptions.map(option => Number(option.value));
                let index = Math.max(0, sizes.indexOf(Number(fontSizeSelect.getValue())));
                index += button.dataset.action === 'increaseFontSize' ? 1 : -1;
                index = Math.max(0, Math.min(sizes.length - 1, index));
                fontSizeSelect.setValue(String(sizes[index]));
                this.applyEditorFontSize(editor, sizes[index]);
                afterCommand();
            });
        });

        const textColor = toolbar.querySelector('.notes-text-color-input');
        const textColorSymbol = toolbar.querySelector('.notes-text-color-symbol');
        textColor.addEventListener('input', () => {
            textColorSymbol.style.color = textColor.value;
            restoreSelection();
            document.execCommand('foreColor', false, textColor.value);
            afterCommand();
        });

        const highlightColor = toolbar.querySelector('.notes-highlight-color-input');
        highlightColor.addEventListener('input', () => {
            restoreSelection();
            const ok = document.execCommand('hiliteColor', false, highlightColor.value);
            if (!ok) document.execCommand('backColor', false, highlightColor.value);
            afterCommand();
        });

        this.updateToolbarButtonStates(pageEl);
    },

    mountToolbarSelect(host, config = {}) {
        if (!host || !window.FluentUI || typeof FluentUI.Select !== 'function') return null;
        const select = FluentUI.Select({
            options: config.options || [],
            value: config.value || '',
            placeholder: config.placeholder || '',
            className: config.className || '',
            onChange: config.onChange || null
        });
        if (config.title) {
            select.title = config.title;
            select.setAttribute('aria-label', config.title);
            const trigger = select.querySelector('.fluent-select-trigger');
            if (trigger) {
                trigger.title = config.title;
                trigger.setAttribute('aria-label', config.title);
            }
        }
        host.replaceChildren(select);
        return select;
    },

    getToolbarFontFamilyOptions() {
        return [
            { value: '"Segoe UI", system-ui, sans-serif', label: 'Segoe UI' },
            { value: 'Arial, sans-serif', label: 'Arial' },
            { value: '"Times New Roman", serif', label: 'Times New Roman' },
            { value: '宋体, SimSun, serif', label: '宋体' },
            { value: '微软雅黑, "Microsoft YaHei", sans-serif', label: '微软雅黑' },
            { value: '黑体, SimHei, sans-serif', label: '黑体' },
            { value: '楷体, KaiTi, serif', label: '楷体' }
        ];
    },

    getToolbarFontSizeOptions() {
        return [10, 11, 12, 14, 16, 18, 20, 24, 28, 32]
            .map(size => ({ value: String(size), label: String(size) }));
    },

    getToolbarFormatBlockOptions() {
        return [
            { value: 'P', label: this.tr('normalText') },
            { value: 'H1', label: this.tr('heading1') },
            { value: 'H2', label: this.tr('heading2') },
            { value: 'H3', label: this.tr('heading3') },
            { value: 'BLOCKQUOTE', label: this.tr('quote') }
        ];
    },

    getToolbarLineHeightOptions() {
        return ['1', '1.3', '1.5', '1.75', '2']
            .map(value => ({ value, label: value }));
    },

    isRangeInsideEditor(editor, range) {
        if (!editor || !range) return false;
        const start = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentNode;
        const end = range.endContainer.nodeType === Node.ELEMENT_NODE ? range.endContainer : range.endContainer.parentNode;
        return !!(start && end && editor.contains(start) && editor.contains(end));
    },

    updateToolbarButtonStates(pageEl) {
        const commands = ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'insertUnorderedList', 'insertOrderedList', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'];
        commands.forEach((command) => {
            const button = pageEl.querySelector(`.notes-editor-toolbar button[data-command="${command}"]`);
            if (!button) return;
            let active = false;
            try {
                active = document.queryCommandState(command);
            } catch (_) {
                active = false;
            }
            button.classList.toggle('is-active', active);
        });
    },

    applyEditorFontSize(editor, size) {
        const safeSize = Math.max(8, Math.min(72, Number(size) || 16));
        document.execCommand('fontSize', false, '7');
        editor.querySelectorAll('font[size="7"]').forEach((font) => {
            const span = document.createElement('span');
            span.style.fontSize = `${safeSize}px`;
            while (font.firstChild) span.appendChild(font.firstChild);
            font.replaceWith(span);
        });
    },

    applyEditorLineHeight(editor, lineHeight) {
        const blocks = this.getSelectedEditorBlocks(editor);
        blocks.forEach((block) => {
            block.style.lineHeight = lineHeight;
        });
    },

    getSelectedEditorBlocks(editor) {
        const selection = window.getSelection && window.getSelection();
        const fallback = this.closestEditorBlock(editor, selection && selection.focusNode) || editor;
        if (!selection || !selection.rangeCount) return [fallback];
        const range = selection.getRangeAt(0);
        if (!this.isRangeInsideEditor(editor, range)) return [fallback];
        const blocks = [];
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT, {
            acceptNode: (node) => this.isEditorBlock(node) && range.intersectsNode(node)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_SKIP
        });
        let node = walker.nextNode();
        while (node) {
            blocks.push(node);
            node = walker.nextNode();
        }
        return blocks.length ? blocks : [fallback];
    },

    closestEditorBlock(editor, node) {
        let el = node && (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement);
        while (el && el !== editor) {
            if (this.isEditorBlock(el)) return el;
            el = el.parentElement;
        }
        return null;
    },

    isEditorBlock(node) {
        return !!node && /^(P|DIV|LI|H1|H2|H3|H4|H5|H6|BLOCKQUOTE|PRE)$/i.test(node.tagName || '');
    },

    normalizeEditorMarkup(editor) {
        editor.querySelectorAll('b').forEach((node) => this.renameElement(node, 'strong'));
        editor.querySelectorAll('i').forEach((node) => this.renameElement(node, 'em'));
    },

    renameElement(node, tagName) {
        const replacement = document.createElement(tagName);
        Array.from(node.attributes || []).forEach(attr => replacement.setAttribute(attr.name, attr.value));
        while (node.firstChild) replacement.appendChild(node.firstChild);
        node.replaceWith(replacement);
    },

    async returnHomeFromEditor() {
        const ok = await this.handlePendingEditorChanges();
        if (!ok) return;
        this.renderShell('home');
        this.playCurrentPageEnterAnimation();
    },

    playCurrentPageEnterAnimation() {
        const page = this.frame && this.frame.pageEl;
        if (!page || !document.body.classList.contains('animations-enabled')) return;
        const elementEnterMs = 460;
        page.classList.remove('fw-page-enter');
        page.classList.remove('notes-page-elements-enter');
        void page.offsetHeight;
        page.classList.add('fw-page-enter');
        page.classList.add('notes-page-elements-enter');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                page.classList.remove('fw-page-enter');
                setTimeout(() => page.classList.remove('notes-page-elements-enter'), elementEnterMs);
            });
        });
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
        this.newNoteRevealRunning = false;
    },

    scheduleAutoSave() {
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.persistEditorDraft(), 450);
    },

    persistEditorDraft(force = false) {
        if (!this.editorState) return;
        const state = this.editorState;
        const editor = this.container && this.container.querySelector('.notes-rich-editor');
        if (editor && (force || state.dirty)) {
            state.draftHtml = editor.innerHTML;
            state.draftContent = this.editorHtmlToStoredContent(state.draftHtml, state.fileFormat);
            state.dirty = state.draftContent !== state.originalContent;
        }
        if (!force && !state.dirty) return;
        const node = State.findNode(state.fileId);
        if (!node) return;
        node.content = state.draftContent || '';
        node.size = this.getByteSize(node.content);
        node.modified = new Date().toISOString();
        if (state.fileFormat === 'markdown') {
            node.mime = 'text/markdown';
            node.encoding = 'text';
        }
        node._notesAppFile = true;
        node._hiddenFromRecent = false;
        State.updateFS(State.fs);
        state.originalContent = node.content;
        state.dirty = false;
        state.isNew = false;
        state.lastSavedAt = node.modified;

        const status = this.container && this.container.querySelector('.notes-status-text');
        if (status) status.textContent = State.settings.notesAutoSave !== false ? this.tr('autosaved') : this.tr('saved');
        const time = this.container && this.container.querySelector('.notes-editor-time');
        if (time) time.textContent = this.formatDate(state.lastSavedAt);
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

    createNewNoteFromButton(button) {
        if (this.newNoteRevealRunning) return;
        const folder = this.getDefaultFolder();
        const name = this.uniqueFileName(folder, this.tr('newFileBase') + this.tr('txtExt'));
        const file = this.createFileInDefaultFolder(name, '');
        const openEditor = () => this.openEditor(file.id, true, { revealFromNewButton: true });
        if (!this.canPlayNewNoteReveal(button)) {
            openEditor();
            return;
        }
        this.newNoteRevealRunning = true;
        this.playNewNoteReveal(button, openEditor);
    },

    canPlayNewNoteReveal(button) {
        return !!(
            button
            && button.isConnected
            && this.container
            && document.body.classList.contains('animations-enabled')
            && typeof button.getBoundingClientRect === 'function'
            && typeof document.createElement('div').animate === 'function'
        );
    },

    playNewNoteReveal(button, onReady) {
        const windowHost = (this.container && this.container.closest('.window')) || this.container || document.body;
        const contentHost = (this.container && this.container.closest('.window-content')) || this.container || windowHost;
        const buttonStyle = getComputedStyle(button);
        const accentRgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '0, 120, 212';
        const startColor = buttonStyle.backgroundColor || `rgb(${accentRgb})`;
        const targetColor = document.body.classList.contains('dark-mode') ? '#202020' : '#ffffff';
        const buttonRect = button.getBoundingClientRect();
        const windowRect = windowHost.getBoundingClientRect();
        const contentRect = contentHost.getBoundingClientRect();
        const centerX = buttonRect.left + buttonRect.width / 2;
        const centerY = buttonRect.top + buttonRect.height / 2;
        const maxX = Math.max(centerX - contentRect.left, contentRect.right - centerX);
        const maxY = Math.max(centerY - contentRect.top, contentRect.bottom - centerY);
        const diameter = Math.max(buttonRect.width, buttonRect.height, 1);
        const targetScale = Math.ceil((Math.hypot(maxX, maxY) * 2.1) / diameter);
        const localX = centerX - contentRect.left;
        const localY = centerY - contentRect.top;
        const clip = document.createElement('div');
        const reveal = document.createElement('div');
        clip.className = 'notes-new-note-reveal-clip';
        reveal.className = 'notes-new-note-reveal';
        Object.assign(clip.style, {
            left: `${contentRect.left - windowRect.left}px`,
            top: `${contentRect.top - windowRect.top}px`,
            width: `${contentRect.width}px`,
            height: `${contentRect.height}px`
        });
        Object.assign(reveal.style, {
            left: `${localX}px`,
            top: `${localY}px`,
            width: `${diameter}px`,
            height: `${diameter}px`,
            backgroundColor: startColor
        });
        clip.appendChild(reveal);
        windowHost.appendChild(clip);
        button.classList.add('notes-fab-launching');

        let editorShown = false;
        const showEditor = () => {
            if (editorShown) return;
            editorShown = true;
            onReady();
        };

        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            showEditor();
            requestAnimationFrame(() => {
                reveal.classList.add('notes-new-note-reveal-hide');
                button.classList.remove('notes-fab-launching');
                setTimeout(() => {
                    clip.remove();
                    this.newNoteRevealRunning = false;
                }, 260);
            });
        };

        const revealDuration = 430;
        const animation = reveal.animate([
            {
                transform: 'translate(-50%, -50%) scale(1)',
                borderRadius: '999px',
                backgroundColor: startColor,
                opacity: 1
            },
            {
                transform: `translate(-50%, -50%) scale(${targetScale})`,
                borderRadius: '22px',
                backgroundColor: targetColor,
                opacity: 1
            }
        ], {
            duration: revealDuration,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'forwards'
        });

        setTimeout(showEditor, this.getFluentEasedDelay(revealDuration, 0.6));
        animation.finished.then(finish).catch(finish);
    },

    getFluentEasedDelay(duration, progress) {
        const target = Math.max(0, Math.min(1, progress));
        const sample = (p1, p2, t) => {
            const inv = 1 - t;
            return 3 * inv * inv * t * p1 + 3 * inv * t * t * p2 + t * t * t;
        };
        let low = 0;
        let high = 1;
        for (let i = 0; i < 18; i += 1) {
            const mid = (low + high) / 2;
            if (sample(1, 1, mid) < target) low = mid;
            else high = mid;
        }
        return Math.round(duration * sample(0.16, 0.3, high));
    },

    createFileInDefaultFolder(name, content = '') {
        return this.createFileInFolder(this.getDefaultFolder(), name, content);
    },

    createFileInFolder(folder, name, content = '', extra = {}) {
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
            _hiddenFromRecent: false,
            ...extra
        };
        folder.children = folder.children || [];
        folder.children.unshift(file);
        State.updateFS(State.fs);
        return file;
    },

    importTextFile() {
        this.navigateAfterPendingChanges(async () => {
            const file = await this.pickTextFile();
            if (!file) return;
            const ext = this.splitFileName(file.name || '').ext.toLowerCase();
            if (ext !== '.txt' && ext !== '.md') {
                this.showMessage(this.tr('importMarkdownError'));
                return;
            }
            const content = await this.readExternalTextFile(file);
            const folder = this.getDefaultFolder();
            const name = this.uniqueFileName(folder, this.ensureFileExtension(file.name || this.tr('newFileBase'), ext));
            const note = this.createFileInFolder(folder, name, content, {
                mime: file.type || (ext === '.md' ? 'text/markdown' : 'text/plain'),
                encoding: 'text'
            });
            this.toast(this.tr('importSuccess'));
            this.openEditor(note.id, false);
        });
    },

    pickTextFile() {
        return new Promise(resolve => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.txt,.md,text/plain,text/markdown';
            input.style.display = 'none';
            document.body.appendChild(input);
            input.addEventListener('change', () => {
                const file = input.files && input.files[0] ? input.files[0] : null;
                input.remove();
                resolve(file);
            }, { once: true });
            input.click();
        });
    },

    readExternalTextFile(file) {
        if (file && typeof file.text === 'function') return file.text();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('read_failed'));
            reader.readAsText(file);
        });
    },

    exportCurrentEditor(format) {
        const state = this.editorState;
        const editor = this.container && this.container.querySelector('.notes-rich-editor');
        if (!state || !editor) return;
        const html = editor.innerHTML || '';
        const node = State.findNode(state.fileId);
        const ext = format === 'md' ? 'md' : 'txt';
        const content = ext === 'md' ? this.htmlToMarkdown(html) : this.htmlToPlainText(html);
        const name = this.exportFileName(node && node.name, ext);
        this.downloadTextFile(name, content, ext === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8');
        this.toast(`${this.tr('exported')}: ${name}`);
    },

    exportFileName(name, ext) {
        const split = this.splitFileName(name || this.tr('newFileBase'));
        const base = (split.base || this.tr('newFileBase')).replace(/[\\/:*?"<>|]/g, '_');
        return `${base}.${ext}`;
    },

    downloadTextFile(name, content, type) {
        const blob = new Blob([String(content || '')], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 500);
    },

    ensureFileExtension(name, ext) {
        const cleanExt = ext.startsWith('.') ? ext : `.${ext}`;
        return String(name || this.tr('newFileBase')).toLowerCase().endsWith(cleanExt.toLowerCase())
            ? String(name || this.tr('newFileBase'))
            : `${name}${cleanExt}`;
    },

    getNodeFormat(node) {
        const ext = this.splitFileName(node && node.name).ext.toLowerCase();
        if (ext === '.md') return 'markdown';
        if (ext === '.txt') return 'text';
        return 'html';
    },

    contentToEditorHtml(content, format) {
        const text = String(content || '');
        if (!text) return '';
        if (format === 'markdown') return this.markdownToHtml(text);
        if (this.looksLikeHtml(text)) return text;
        return this.plainTextToEditorHtml(text);
    },

    editorHtmlToStoredContent(html, format) {
        if (format === 'markdown') return this.htmlToMarkdown(html);
        return String(html || '');
    },

    looksLikeHtml(text) {
        return /<\/?[a-z][\s\S]*>/i.test(String(text || ''));
    },

    plainTextToEditorHtml(text) {
        return String(text || '')
            .replace(/\r\n?/g, '\n')
            .split('\n')
            .map(line => `<div>${line ? this.escape(line) : '<br>'}</div>`)
            .join('');
    },

    markdownToHtml(markdown) {
        const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
        const html = [];
        let listType = null;

        const closeList = () => {
            if (!listType) return;
            html.push(`</${listType}>`);
            listType = null;
        };
        const openList = (type) => {
            if (listType === type) return;
            closeList();
            listType = type;
            html.push(`<${type}>`);
        };

        lines.forEach((line) => {
            if (!line.trim()) {
                closeList();
                return;
            }
            const heading = line.match(/^(#{1,3})\s+(.+)$/);
            if (heading) {
                closeList();
                html.push(`<h${heading[1].length}>${this.markdownInlineToHtml(heading[2])}</h${heading[1].length}>`);
                return;
            }
            const quote = line.match(/^>\s?(.*)$/);
            if (quote) {
                closeList();
                html.push(`<blockquote>${this.markdownInlineToHtml(quote[1])}</blockquote>`);
                return;
            }
            const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
            if (unordered) {
                openList('ul');
                html.push(`<li>${this.markdownInlineToHtml(unordered[1])}</li>`);
                return;
            }
            const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
            if (ordered) {
                openList('ol');
                html.push(`<li>${this.markdownInlineToHtml(ordered[1])}</li>`);
                return;
            }
            closeList();
            html.push(`<p>${this.markdownInlineToHtml(line)}</p>`);
        });
        closeList();
        return html.join('');
    },

    markdownInlineToHtml(value) {
        let text = this.escape(value);
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
        text = text.replace(/~~([^~]+)~~/g, '<s>$1</s>');
        text = text.replace(/(^|[\s(])\*([^*]+)\*/g, '$1<em>$2</em>');
        text = text.replace(/(^|[\s(])_([^_]+)_/g, '$1<em>$2</em>');
        text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_match, label, href) => {
            return `<a href="${this.escape(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
        });
        return text;
    },

    htmlToMarkdown(html) {
        const container = document.createElement('div');
        container.innerHTML = html || '';
        const chunks = Array.from(container.childNodes)
            .map(node => this.markdownFromBlockNode(node))
            .filter(Boolean);
        return chunks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
    },

    markdownFromBlockNode(node) {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim();
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        const tag = node.tagName.toLowerCase();
        if (/^h[1-6]$/.test(tag)) {
            const level = Math.min(6, Number(tag.slice(1)));
            return `${'#'.repeat(level)} ${this.markdownFromInlineChildren(node).trim()}`;
        }
        if (tag === 'blockquote') {
            const text = this.markdownFromInlineChildren(node).trim();
            return text.split('\n').map(line => `> ${line}`).join('\n');
        }
        if (tag === 'ul' || tag === 'ol') {
            return Array.from(node.children)
                .filter(child => child.tagName && child.tagName.toLowerCase() === 'li')
                .map((child, index) => {
                    const prefix = tag === 'ol' ? `${index + 1}. ` : '- ';
                    return `${prefix}${this.markdownFromInlineChildren(child).trim()}`;
                })
                .join('\n');
        }
        if (tag === 'br') return '';
        return this.markdownFromInlineChildren(node).trim();
    },

    markdownFromInlineChildren(node) {
        return Array.from(node.childNodes).map(child => this.markdownFromInlineNode(child)).join('');
    },

    markdownFromInlineNode(node) {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        const tag = node.tagName.toLowerCase();
        if (tag === 'br') return '\n';
        const content = this.markdownFromInlineChildren(node);
        if (tag === 'strong' || tag === 'b') return `**${content}**`;
        if (tag === 'em' || tag === 'i') return `*${content}*`;
        if (tag === 's' || tag === 'strike' || tag === 'del') return `~~${content}~~`;
        if (tag === 'code') return `\`${content.replace(/`/g, '\\`')}\``;
        if (tag === 'a') {
            const href = node.getAttribute('href') || '';
            return href ? `[${content}](${href})` : content;
        }
        if (tag === 'sub') return `~${content}~`;
        if (tag === 'sup') return `^${content}^`;
        return content;
    },

    htmlToPlainText(html) {
        const container = document.createElement('div');
        container.innerHTML = html || '';
        return (container.innerText || container.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
    },

    getEditorPlainText(editor) {
        return editor ? (editor.innerText || editor.textContent || '') : '';
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
