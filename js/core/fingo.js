/**
 * Fingo AI 助手 - 核心逻辑
 */
const Fingo = {
    element: null,
    input: null,
    messagesEl: null,
    historyEl: null,
    contextMenuEl: null,
    _cardAnimTimer: null,
    isOpen: false,
    conversations: [],
    currentId: null,
    STORAGE_KEY: 'fluentos.fingo_history',
    COPY_ICON_STROKE: 'Theme/Icon/Symbol_icon/stroke/Copy.svg',
    COPY_ICON_FILL: 'Theme/Icon/Symbol_icon/fill/Copy.svg',
    _pendingAction: null, // { type: 'uninstall'|'repair', app, appName }
    _sessionApiKey: '',
    _pendingDecryptPromise: null,
    API_KEY_CRYPTO_VERSION: 1,

    init() {
        this.element = document.getElementById('fingo-panel');
        this.blurLayer = document.getElementById('fingo-blur-layer');
        this.input = document.getElementById('fingo-input');
        this.messagesEl = document.getElementById('fingo-messages');
        this.historyEl = document.getElementById('fingo-history');
        this.contentEl = this.element?.querySelector('.fingo-content');
        this._updateInputPlaceholder();
        State.on('languageChange', () => this._updateInputPlaceholder());
        this._ensureContextMenu();
        this._loadConversations();
        if (!this.currentId) this.newConversation(true);
        this._updateEmptyState();
        this.bindEvents();
    },

    toggle() { this.isOpen ? this.hide() : this.show(); },

    show() {
        this.isOpen = true;
        this._updateInputPlaceholder();
        if (typeof StartMenu !== 'undefined') StartMenu.close();
        if (typeof ControlCenter !== 'undefined') ControlCenter.close();
        if (typeof NotificationCenter !== 'undefined') NotificationCenter.close();

        this.element.classList.remove('hidden', 'fingo-closing');
        if (this.blurLayer) this.blurLayer.classList.add('fingo-visible');
        const btn = document.getElementById('fingo-btn');
        if (btn) btn.classList.add('active');
        setTimeout(() => this.input.focus(), 300);
    },

    hide() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this._hideContextMenu();
        if (this.blurLayer) this.blurLayer.classList.remove('fingo-visible');
        const btn = document.getElementById('fingo-btn');
        if (btn) btn.classList.remove('active');

        if (State.settings.enableAnimation) {
            this.element.classList.add('fingo-closing');
            setTimeout(() => {
                this.element.classList.add('hidden');
                this.element.classList.remove('fingo-closing');
            }, 200);
        } else {
            this.element.classList.add('hidden');
        }
    },

    bindEvents() {
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.input.value.trim()) {
                this.processInput(this.input.value.trim());
                this.input.value = '';
            }
        });
        this.element.addEventListener('contextmenu', (e) => {
            if (!this.isOpen) return;
            e.preventDefault();
            e.stopPropagation();
            this._showContextMenu(e.clientX, e.clientY);
        });
        document.addEventListener('click', (e) => {
            if (this.contextMenuEl && !this.contextMenuEl.classList.contains('hidden') && !this.contextMenuEl.contains(e.target)) {
                this._hideContextMenu();
            }
            if (this.isOpen && !this.element.contains(e.target) && !e.target.closest('#fingo-btn') && !e.target.closest('#fingo-context-menu')) {
                this.hide();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (this.contextMenuEl && !this.contextMenuEl.classList.contains('hidden')) {
                this._hideContextMenu();
                return;
            }
            if (this.isOpen) this.hide();
        });
        // 工具栏按钮
        document.getElementById('fingo-new-chat')?.addEventListener('click', () => this.newConversation());
        document.getElementById('fingo-history-btn')?.addEventListener('click', () => this._toggleHistory());
        document.getElementById('fingo-clear-btn')?.addEventListener('click', () => this.clearAll());
    },

    _ensureContextMenu() {
        if (this.contextMenuEl || !document.body) return;

        const menu = document.createElement('div');
        menu.id = 'fingo-context-menu';
        menu.className = 'context-menu hidden';
        menu.addEventListener('contextmenu', (e) => e.preventDefault());
        menu.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (!item) return;
            if (item.dataset.action === 'open-fingo-settings') {
                e.preventDefault();
                e.stopPropagation();
                this._hideContextMenu();
                this._executeAction('openSettings:fingo');
            }
        });

        document.body.appendChild(menu);
        this.contextMenuEl = menu;
        this._renderContextMenu();
    },

    _renderContextMenu() {
        if (!this.contextMenuEl) return;
        const label = this.lang() === 'zh' ? '打开Fingo AI设置' : 'Open Fingo AI Settings';
        this.contextMenuEl.innerHTML = `
            <div class="context-menu-item" data-action="open-fingo-settings">
                <img src="Theme/Icon/Symbol_icon/stroke/Settings.svg" alt="">
                <span>${label}</span>
            </div>
        `;
    },

    _showContextMenu(x, y) {
        this._ensureContextMenu();
        this._renderContextMenu();
        if (!this.contextMenuEl) return;

        this.contextMenuEl.style.visibility = 'hidden';
        this.contextMenuEl.classList.remove('hidden');

        const rect = this.contextMenuEl.getBoundingClientRect();
        const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
        const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
        const left = Math.min(Math.max(8, x), maxLeft);
        const top = Math.min(Math.max(8, y), maxTop);

        this.contextMenuEl.style.left = `${left}px`;
        this.contextMenuEl.style.top = `${top}px`;
        this.contextMenuEl.style.visibility = '';
    },

    _hideContextMenu() {
        if (!this.contextMenuEl) return;
        this.contextMenuEl.classList.add('hidden');
    },



    _updateEmptyState() {
        if (!this.contentEl) return;
        const conv = this.conversations.find(c => c.id === this.currentId);
        const empty = !conv || !conv.messages.length;
        this._setEmptyState(empty);
    },

    _expandCard() {
        if (!this.contentEl) return;
        this._setEmptyState(false);
    },

    _setEmptyState(empty) {
        if (!this.contentEl) return;
        const wasEmpty = this.contentEl.classList.contains('fingo-empty');
        if (wasEmpty === empty) return;

        clearTimeout(this._cardAnimTimer);
        this.contentEl.classList.remove('fingo-expanding', 'fingo-collapsing');
        this.contentEl.classList.toggle('fingo-empty', empty);

        const animClass = empty ? 'fingo-collapsing' : 'fingo-expanding';
        this.contentEl.classList.add(animClass);
        if (empty) this._setHistoryExpanded(false);

        this._cardAnimTimer = setTimeout(() => {
            this.contentEl?.classList.remove('fingo-expanding', 'fingo-collapsing');
        }, empty ? 360 : 520);
    },

    _setHistoryExpanded(expanded) {
        if (!this.historyEl) return;
        if (expanded) {
            this._renderHistoryList();
            requestAnimationFrame(() => this.historyEl?.classList.add('show'));
            return;
        }
        this.historyEl.classList.remove('show');
    },

    lang() {
        return (I18n && I18n.currentLang === 'en') ? 'en' : 'zh';
    },

    _updateInputPlaceholder() {
        if (!this.input) return;
        this.input.placeholder = this.lang() === 'zh' ? '问你想问' : 'Ask me anything...';
    },

    getSessionApiKey() {
        return this._sessionApiKey || '';
    },

    getApiKeyStorageType() {
        if (State.settings.fingoApiStorageType) return State.settings.fingoApiStorageType;
        if (State.settings.fingoApiEncrypted && State.settings.fingoApiEncrypted.ciphertext) return 'permanent-encrypted';
        if ((State.settings.fingoApiKey || '').trim()) return 'permanent-plain';
        return 'none';
    },

    saveApiKeyTemporary(apiKey) {
        const clean = (apiKey || '').trim();
        if (!clean) {
            this.clearApiKey();
            return false;
        }
        this._sessionApiKey = clean;
        State.updateSettings({
            fingoApiKey: '',
            fingoApiEncrypted: null,
            fingoApiStorageType: 'session'
        });
        State.emit('fingoApiKeyReady', { storageType: 'session', decrypted: true });
        return true;
    },

    saveApiKeyPermanentPlain(apiKey) {
        const clean = (apiKey || '').trim();
        if (!clean) {
            this.clearApiKey();
            return false;
        }
        this._sessionApiKey = clean;
        State.updateSettings({
            fingoApiKey: clean,
            fingoApiEncrypted: null,
            fingoApiStorageType: 'permanent-plain'
        });
        State.emit('fingoApiKeyReady', { storageType: 'permanent-plain', decrypted: true });
        return true;
    },

    clearApiKey() {
        this._sessionApiKey = '';
        State.updateSettings({
            fingoApiKey: '',
            fingoApiEncrypted: null,
            fingoApiStorageType: 'none'
        });
        State.emit('fingoApiKeyReady', { storageType: 'none', decrypted: false });
    },

    _isWebCryptoAvailable() {
        return !!(window.crypto && window.crypto.subtle && window.TextEncoder && window.TextDecoder);
    },

    _bufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
    },

    _base64ToBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
    },

    async _deriveEncryptionKey(passphrase, salt, usage) {
        const material = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(passphrase),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
            material,
            { name: 'AES-GCM', length: 256 },
            false,
            usage
        );
    },

    async _encryptApiKey(apiKey, passphrase) {
        if (!this._isWebCryptoAvailable()) throw new Error(this.lang() === 'zh' ? '当前浏览器不支持 WebCrypto。' : 'WebCrypto is not available.');
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await this._deriveEncryptionKey(passphrase, salt, ['encrypt']);
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            new TextEncoder().encode(apiKey)
        );
        return {
            version: this.API_KEY_CRYPTO_VERSION,
            salt: this._bufferToBase64(salt.buffer),
            iv: this._bufferToBase64(iv.buffer),
            ciphertext: this._bufferToBase64(encrypted)
        };
    },

    async _decryptApiKey(payload, passphrase) {
        if (!payload || !payload.ciphertext || !payload.salt || !payload.iv) {
            throw new Error(this.lang() === 'zh' ? '加密数据无效。' : 'Encrypted payload is invalid.');
        }
        if (!this._isWebCryptoAvailable()) throw new Error(this.lang() === 'zh' ? '当前浏览器不支持 WebCrypto。' : 'WebCrypto is not available.');
        const salt = new Uint8Array(this._base64ToBuffer(payload.salt));
        const iv = new Uint8Array(this._base64ToBuffer(payload.iv));
        const data = this._base64ToBuffer(payload.ciphertext);
        const key = await this._deriveEncryptionKey(passphrase, salt, ['decrypt']);
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );
        return new TextDecoder().decode(decrypted);
    },

    async saveApiKeyPermanentEncrypted(apiKey, passphrase) {
        const clean = (apiKey || '').trim();
        if (!clean) {
            this.clearApiKey();
            return false;
        }
        if (!passphrase || passphrase.length < 6) {
            throw new Error(this.lang() === 'zh' ? '口令至少 6 位。' : 'Passphrase must be at least 6 characters.');
        }
        const encrypted = await this._encryptApiKey(clean, passphrase);
        this._sessionApiKey = clean;
        State.updateSettings({
            fingoApiKey: '',
            fingoApiEncrypted: encrypted,
            fingoApiStorageType: 'permanent-encrypted'
        });
        State.emit('fingoApiKeyReady', { storageType: 'permanent-encrypted', decrypted: true });
        return true;
    },

    _promptDecryptPassphrase() {
        const isZh = this.lang() === 'zh';
        return new Promise((resolve) => {
            FluentUI.InputDialog({
                title: isZh ? '输入解密口令' : 'Enter Passphrase',
                placeholder: isZh ? '请输入用于解密 API Key 的口令' : 'Enter the passphrase for your API Key',
                inputType: 'password',
                minLength: 1,
                confirmText: isZh ? '解密' : 'Decrypt',
                cancelText: isZh ? '取消' : 'Cancel',
                onConfirm: (val) => resolve((val || '').trim()),
                onCancel: () => resolve(null)
            });
        });
    },

    async getApiKeyForRequest() {
        const sessionKey = (this._sessionApiKey || '').trim();
        if (sessionKey) return sessionKey;

        const plainKey = (State.settings.fingoApiKey || '').trim();
        if (plainKey) {
            this._sessionApiKey = plainKey;
            return plainKey;
        }

        const encryptedPayload = State.settings.fingoApiEncrypted;
        if (!encryptedPayload || !encryptedPayload.ciphertext) return null;

        if (this._pendingDecryptPromise) return this._pendingDecryptPromise;

        this._pendingDecryptPromise = (async () => {
            const passphrase = await this._promptDecryptPassphrase();
            if (!passphrase) return null;
            try {
                const decrypted = await this._decryptApiKey(encryptedPayload, passphrase);
                this._sessionApiKey = decrypted.trim();
                State.emit('fingoApiKeyReady', { storageType: 'permanent-encrypted', decrypted: true });
                return this._sessionApiKey;
            } catch (error) {
                if (typeof FluentUI !== 'undefined' && FluentUI.Toast) {
                    FluentUI.Toast({
                        title: 'Fingo AI',
                        message: this.lang() === 'zh' ? 'API Key 解密失败，请检查口令。' : 'Failed to decrypt API Key.',
                        type: 'error'
                    });
                }
                return null;
            }
        })().finally(() => {
            this._pendingDecryptPromise = null;
        });

        return this._pendingDecryptPromise;
    },

    _createMessageElement(text, type) {
        const safeText = typeof text === 'string' ? text : String(text ?? '');
        const div = document.createElement('div');
        div.className = `fingo-msg fingo-msg-${type}`;

        const textEl = document.createElement('div');
        textEl.className = 'fingo-msg-text';
        safeText.split('\n').forEach((line, i) => {
            if (i > 0) textEl.appendChild(document.createElement('br'));
            textEl.appendChild(document.createTextNode(line));
        });
        div.appendChild(textEl);

        if (type === 'bot') {
            div.classList.add('fingo-msg-copyable');
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'fingo-copy-btn';
            const tip = this.lang() === 'zh' ? '复制内容' : 'Copy message';
            copyBtn.title = tip;
            copyBtn.setAttribute('aria-label', tip);

            const icon = document.createElement('img');
            icon.className = 'fingo-copy-icon';
            icon.src = this.COPY_ICON_STROKE;
            icon.alt = 'Copy';
            copyBtn.appendChild(icon);

            copyBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const copied = await this._copyToClipboard(safeText);
                clearTimeout(copyBtn._copyResetTimer);
                copyBtn.classList.remove('copied', 'copy-failed');
                void copyBtn.offsetWidth; // restart click animation
                copyBtn.classList.add(copied ? 'copied' : 'copy-failed');
                icon.src = copied ? this.COPY_ICON_FILL : this.COPY_ICON_STROKE;
                copyBtn._copyResetTimer = setTimeout(() => {
                    icon.src = this.COPY_ICON_STROKE;
                    copyBtn.classList.remove('copied', 'copy-failed');
                }, 750);
            });

            div.appendChild(copyBtn);
        }

        return div;
    },

    async _copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (_) {}
        }

        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        ta.style.pointerEvents = 'none';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        let ok = false;
        try {
            ok = document.execCommand('copy');
        } catch (_) {
            ok = false;
        }
        ta.remove();
        return ok;
    },

    addMessage(text, type) {
        const div = this._createMessageElement(text, type);
        this.messagesEl.appendChild(div);
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        // 保存到当前对话
        const conv = this.conversations.find(c => c.id === this.currentId);
        if (conv) {
            conv.messages.push({ text, type });
            this._saveConversations();
        }
        return div;
    },

    // --- 对话历史管理 ---
    _loadConversations() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                this.conversations = JSON.parse(raw);
                if (this.conversations.length) {
                    this.currentId = this.conversations[0].id;
                    this._renderMessages(this.conversations[0].messages);
                }
            }
        } catch(e) { this.conversations = []; }
    },

    _saveConversations() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.conversations));
    },

    newConversation(silent) {
        const conv = { id: Date.now().toString(), messages: [], ts: Date.now() };
        this.conversations.unshift(conv);
        this.currentId = conv.id;
        if (!silent) {
            this.messagesEl.innerHTML = '';
            this._saveConversations();
            this._renderHistoryList();
            this._setHistoryExpanded(false);
        }
        this._updateEmptyState();
    },

    loadConversation(id) {
        const conv = this.conversations.find(c => c.id === id);
        if (!conv) return;
        this.currentId = id;
        this._renderMessages(conv.messages);
        this._updateEmptyState();
        this._setHistoryExpanded(false);
    },

    clearAll() {
        this.conversations = [];
        this.messagesEl.innerHTML = '';
        this.newConversation(true);
        this._saveConversations();
        this._renderHistoryList();
        this._setHistoryExpanded(false);
        this._updateEmptyState();
    },

    _toggleHistory() {
        if (!this.historyEl) return;
        this._setHistoryExpanded(!this.historyEl.classList.contains('show'));
    },

    _renderHistoryList() {
        if (!this.historyEl) return;
        this.historyEl.innerHTML = '';
        if (!this.conversations.length || (this.conversations.length === 1 && !this.conversations[0].messages.length)) {
            this.historyEl.innerHTML = `<div class="fingo-history-empty">${this.lang() === 'zh' ? '暂无历史记录' : 'No history'}</div>`;
            return;
        }
        this.conversations.forEach(c => {
            if (!c.messages.length) return;
            const item = document.createElement('div');
            item.className = 'fingo-history-item';
            const preview = c.messages[0]?.text || '';
            item.textContent = preview.length > 40 ? preview.slice(0, 40) + '…' : preview;
            item.addEventListener('click', () => this.loadConversation(c.id));
            this.historyEl.appendChild(item);
        });
    },

    _renderMessages(msgs) {
        this.messagesEl.innerHTML = '';
        (msgs || []).forEach(m => {
            const div = this._createMessageElement(m.text, m.type);
            this.messagesEl.appendChild(div);
        });
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    },

    _compactText(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/[\s`~!@#$%^&*()\-_=+\[\]{}\\|;:'",.<>/?，。！？、；：“”‘’（）【】《》]/g, '');
    },

    _normalizeInputText(text) {
        let normalized = String(text || '').toLowerCase();
        normalized = normalized
            .replace(/[’]/g, '\'')
            .replace(/\bi'm\b/g, 'i am')
            .replace(/\bcan't\b/g, 'cant')
            .replace(/\bdon't\b/g, 'do not')
            .replace(/\bwon't\b/g, 'will not')
            .replace(/\bpls\b/g, 'please')
            .replace(/\bthx\b/g, 'thanks');

        // Remove common filler words so intent words are easier to match.
        normalized = normalized
            .replace(/请问|麻烦你|麻烦|帮我|帮忙|一下子?|可以吗|行吗|好吗|可不可以|能不能|呢|吧|呀|啊|嘛/g, ' ')
            .replace(/\bplease\b/g, ' ');

        normalized = normalized.replace(/\s+/g, ' ').trim();
        return normalized;
    },

    _escapeRegex(text) {
        return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    _matchPhraseInText(text, phrase) {
        const kw = String(phrase || '').toLowerCase().trim();
        if (!kw) return false;
        if (/^[a-z0-9 ]+$/.test(kw)) {
            const pattern = this._escapeRegex(kw).replace(/\s+/g, '\\s+');
            return new RegExp(`(^|\\b)${pattern}(\\b|$)`, 'i').test(text);
        }
        return text.includes(kw);
    },

    _getKeywordVariants(keyword) {
        const base = String(keyword || '').toLowerCase().trim();
        if (!base) return [];

        if (!this._keywordVariantCache) this._keywordVariantCache = new Map();
        if (this._keywordVariantCache.has(base)) return this._keywordVariantCache.get(base);

        const variants = new Set([base]);
        const zhGroups = [
            ['开启', '打开', '启用', '开', '启动'],
            ['关闭', '关掉', '禁用', '停用', '关'],
            ['切换', '改成', '换成', '调整为', '设为'],
            ['进入', '打开', '前往', '跳转到'],
            ['模糊', '毛玻璃', '磨砂'],
            ['动画', '动效'],
            ['壁纸', '桌面背景', '背景图', '墙纸'],
            ['重启', '重新启动', '重新开机'],
            ['关机', '关闭电脑', '关电脑'],
            ['锁屏', '锁定', '锁定屏幕'],
            ['卸载', '删除', '移除', '卸掉'],
            ['安装', '下载', '装上'],
            ['修复', '修一下', '修一修', '修好'],
            ['亮度', '屏幕亮度'],
            ['深色', '暗色', '黑暗', '夜间', '调暗'],
            ['浅色', '亮色', '日间', '白天', '调亮'],
            ['设置', '系统设置', '偏好设置']
        ];
        const enGroups = [
            ['turn on', 'enable', 'open', 'start'],
            ['turn off', 'disable', 'close', 'stop'],
            ['switch to', 'change to', 'set to'],
            ['dark mode', 'dark theme'],
            ['light mode', 'light theme'],
            ['wifi', 'wi-fi', 'wireless'],
            ['bluetooth', 'bt'],
            ['wallpaper', 'background'],
            ['settings', 'setting', 'preferences']
        ];

        const applyGroups = (groups, maxRounds = 3) => {
            for (let round = 0; round < maxRounds; round++) {
                let changed = false;
                const snapshot = Array.from(variants);
                for (const phrase of snapshot) {
                    for (const group of groups) {
                        for (const token of group) {
                            if (!phrase.includes(token)) continue;
                            for (const alt of group) {
                                if (alt === token) continue;
                                const next = phrase.split(token).join(alt).trim();
                                if (!next || variants.has(next)) continue;
                                variants.add(next);
                                changed = true;
                            }
                        }
                    }
                }
                if (!changed) break;
            }
        };
        applyGroups(zhGroups, 2);
        applyGroups(enGroups, 2);

        const zhActionVerbs = ['开启', '打开', '启用', '开', '启动', '关闭', '关掉', '禁用', '停用', '关', '切换', '改成', '换成', '设为'];
        const zhSnapshot = Array.from(variants);
        for (const phrase of zhSnapshot) {
            for (const verb of zhActionVerbs) {
                if (phrase.startsWith(verb) && phrase.length > verb.length + 1) {
                    const obj = phrase.slice(verb.length).trim();
                    if (obj) variants.add(`${obj}${verb}`);
                }
            }
        }

        const enSnapshot = Array.from(variants);
        for (const phrase of enSnapshot) {
            const m = phrase.match(/^(turn on|turn off|enable|disable|open|close|start|stop|switch to|change to|set to)\s+(.+)$/);
            if (!m) continue;
            const verb = m[1];
            const obj = m[2].trim();
            if (!obj) continue;
            variants.add(`${obj} ${verb}`);
            if (verb === 'turn on' || verb === 'enable' || verb === 'open' || verb === 'start') variants.add(`${obj} on`);
            if (verb === 'turn off' || verb === 'disable' || verb === 'close' || verb === 'stop') variants.add(`${obj} off`);
        }

        const result = Array.from(variants).filter(Boolean).slice(0, 120);
        this._keywordVariantCache.set(base, result);
        return result;
    },

    _keywordMatched(lowerText, normalizedText, compactText, keyword) {
        const variants = this._getKeywordVariants(keyword);
        if (!variants.length) return false;

        for (const phrase of variants) {
            if (this._matchPhraseInText(lowerText, phrase)) return true;
            if (normalizedText && normalizedText !== lowerText && this._matchPhraseInText(normalizedText, phrase)) return true;
            const compactPhrase = this._compactText(phrase);
            if (compactPhrase && compactText.includes(compactPhrase)) return true;
        }
        return false;
    },

    _pickLocalizedText(payload) {
        if (typeof payload === 'string') return payload;
        if (Array.isArray(payload)) {
            if (!payload.length) return '';
            return payload[Math.floor(Math.random() * payload.length)] || '';
        }
        if (!payload || typeof payload !== 'object') return '';

        const lang = this.lang();
        const localized = payload[lang] ?? payload.zh ?? payload.en ?? '';
        if (Array.isArray(localized)) {
            if (!localized.length) return '';
            return localized[Math.floor(Math.random() * localized.length)] || '';
        }
        return typeof localized === 'string' ? localized : '';
    },

    _formatDynamicText(template) {
        if (typeof template !== 'string') return '';

        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const timeText = `${hh}:${mm}`;

        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const lang = this.lang();
        const dateText = lang === 'zh'
            ? `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
            : `${now.getFullYear()}-${month}-${day}`;

        const weekZh = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const weekdayText = lang === 'zh' ? weekZh[now.getDay()] : weekEn[now.getDay()];

        return template
            .replace(/\{time\}/g, timeText)
            .replace(/\{date\}/g, dateText)
            .replace(/\{weekday\}/g, weekdayText)
            .replace(/\{datetime\}/g, `${dateText} ${timeText}`);
    },

    _resolveResponse(payload) {
        return this._formatDynamicText(this._pickLocalizedText(payload));
    },

    async processInput(text) {
        this._expandCard();
        this.addMessage(text, 'user');

        // 自定义模式：全部走 API
        if (State.settings.fingoCustomMode) {
            if (State.settings.strictCspEnabled !== true) {
                const msg = this.lang() === 'zh'
                    ? '启用自定义 API 前，请先在「设置 → 隐私」中开启「禁用内联脚本」。'
                    : 'Enable "Disable Inline Scripts" in Settings → Privacy before using custom API mode.';
                setTimeout(() => this.addMessage(msg, 'bot'), 400);
                return;
            }
            const apiKey = await this.getApiKeyForRequest();
            if (!apiKey) {
                const msg = this.lang() === 'zh'
                    ? 'API 错误，请检查 API Key 是否正确。\n请前往「设置 → Fingo AI」填入有效的 API Key。'
                    : 'API error, please check your API Key.\nGo to Settings → Fingo AI to enter a valid key.';
                setTimeout(() => this.addMessage(msg, 'bot'), 400);
            }else {
                this._callApi(text, apiKey);
            }
            return;
        }

        // 处理待确认操作
        if (this._pendingAction) {
            this._handleConfirmation(text);
            return;
        }

        // 默认模式：关键词匹配（特殊命令优先）
        const lower = text.toLowerCase();
        const normalized = this._normalizeInputText(lower);
        const compact = this._compactText(normalized);
        const cmds = FingoData.commands;
        const specialKeys = ['uninstall', 'install', 'repair', 'wallpaper', 'openApp'];
        for (const sk of specialKeys) {
            if (!cmds[sk]) continue;
            for (const kw of cmds[sk].keywords) {
                if (this._keywordMatched(lower, normalized, compact, kw)) {
                    this['_handle_' + sk](text, lower);
                    return;
                }
            }
        }
        for (const key of Object.keys(cmds)) {
            if (specialKeys.includes(key)) continue;
            const cmd = cmds[key];
            for (const kw of cmd.keywords) {
                if (this._keywordMatched(lower, normalized, compact, kw)) {
                    this._executeAction(cmd.action);
                    const botReply = this._resolveResponse(cmd.response);
                    if (botReply) {
                        setTimeout(() => this.addMessage(botReply, 'bot'), 400);
                    }
                    return;
                }
            }
        }
        const fallbackText = this._resolveResponse(FingoData.fallback) || (this.lang() === 'zh' ? '抱歉，我暂时没听懂。' : 'Sorry, I did not understand.');
        setTimeout(() => this.addMessage(fallbackText, 'bot'), 400);
    },
    // --- 查找应用（从用户输入中匹配） ---
    _findApp(lower) {
        for (const app of Desktop.apps) {
            const name = (Desktop.getAppName(app) || '').toLowerCase();
            if (name && lower.includes(name)) return app;
            if (lower.includes(app.id)) return app;
        }
        return null;
    },

    _isAppRunning(appId) {
        return typeof WindowManager !== 'undefined' && WindowManager.windows.some(w => w.appId === appId);
    },

    _forceCloseApp(appId) {
        if (typeof WindowManager === 'undefined') return;
        WindowManager.windows.filter(w => w.appId === appId).forEach(w => WindowManager.closeWindow(w.id));
    },

    // --- 确认流程 ---
    _handleConfirmation(text) {
        const lower = text.toLowerCase();
        const pa = this._pendingAction;
        const isYes = FingoData.confirmYes.some(w => lower.includes(w));
        const isNo = FingoData.confirmNo.some(w => lower.includes(w));
        if (!isYes && !isNo) {
            setTimeout(() => this.addMessage(this.lang() === 'zh' ? '请回答「是」或「否」' : 'Please answer "yes" or "no"', 'bot'), 300);
            return;
        }
        this._pendingAction = null;
        if (isNo) {
            setTimeout(() => this.addMessage(this.lang() === 'zh' ? '好的，已取消操作 ✋' : 'OK, operation cancelled ✋', 'bot'), 300);
            return;
        }
        // 用户确认
        if (pa.type === 'installAndOpen') {
            this._doInstallAndOpen(pa.shopApp);
        } else {
            this._forceCloseApp(pa.app.id);
            setTimeout(() => {
                if (pa.type === 'uninstall') this._doUninstall(pa.app, pa.appName);
                else if (pa.type === 'repair') this._doRepair(pa.app, pa.appName);
            }, 350);
        }
    },

    // --- 打开应用 ---
    '_handle_openApp'(_text, lower) {
        const lang = this.lang();
        const cmd = FingoData.commands.openApp;
        // 1. 已安装的应用（Desktop.apps）
        const installed = this._findApp(lower);
        if (installed) {
            const name = Desktop.getAppName(installed);
            this.hide();
            setTimeout(() => WindowManager.openApp(installed.id), 400);
            setTimeout(() => this.addMessage(cmd.response[lang].replace('{app}', name), 'bot'), 400);
            return;
        }
        // 2. AppShop 中未安装的应用
        if (typeof AppShop !== 'undefined') {
            for (const sa of AppShop.apps) {
                if (lower.includes(sa.name.toLowerCase()) || lower.includes(sa.id)) {
                    this._pendingAction = { type: 'installAndOpen', shopApp: sa };
                    setTimeout(() => this.addMessage(cmd.responseAskInstall[lang].replace('{app}', sa.name), 'bot'), 400);
                    return;
                }
            }
        }
        // 3. 找不到
        setTimeout(() => this.addMessage(cmd.responseNotFound[lang], 'bot'), 400);
    },

    _doInstallAndOpen(shopApp) {
        const lang = this.lang();
        Desktop.apps.push({ id: shopApp.id, name: shopApp.name, icon: `Theme/Icon/App_icon/${shopApp.icon}`, isPWA: true, url: shopApp.url });
        const installed = State.settings.installedApps || [];
        installed.push(shopApp.id);
        State.updateSettings({ installedApps: installed });
        Desktop.renderIcons();
        if (typeof StartMenu !== 'undefined') StartMenu.renderApps();
        const script = document.createElement('script');
        script.src = `js/third_parts_apps/${shopApp.id}.js`;
        document.head.appendChild(script);
        this.hide();
        setTimeout(() => WindowManager.openApp(shopApp.id), 600);
        setTimeout(() => this.addMessage(lang === 'zh' ? `${shopApp.name} 已安装并打开 ✅` : `${shopApp.name} installed and opened ✅`, 'bot'), 400);
    },

    // --- 卸载 ---
    '_handle_uninstall'(_text, lower) {
        const lang = this.lang();
        const app = this._findApp(lower);
        if (!app) {
            setTimeout(() => this.addMessage(lang === 'zh' ? '请告诉我你要卸载哪个应用，例如「卸载天气」' : 'Which app? e.g. "uninstall weather"', 'bot'), 400);
            return;
        }
        const appName = Desktop.getAppName(app);
        if (FingoData.systemApps.includes(app.id)) {
            setTimeout(() => this.addMessage(FingoData.commands.uninstall.responseFail[lang].replace('{app}', appName), 'bot'), 400);
            return;
        }
        if (this._isAppRunning(app.id)) {
            this._pendingAction = { type: 'uninstall', app, appName };
            setTimeout(() => this.addMessage(lang === 'zh' ? `${appName} 正在运行中，是否关闭并继续卸载？（是/否）` : `${appName}is running. Close it and uninstall? (yes/no)`, 'bot'), 400);
            return;
        }
        this._doUninstall(app, appName);
    },

    _doUninstall(app, appName) {
        const lang = this.lang();
        // 从 installedApps 移除
        const installed = State.settings.installedApps || [];
        State.updateSettings({ installedApps: installed.filter(id => id !== app.id) });
        Desktop.apps = Desktop.apps.filter(a => a.id !== app.id);
        Desktop.renderIcons();
        if (typeof PWALoader !== 'undefined' && PWALoader.unregister) PWALoader.unregister(app.id);
        if (typeof Taskbar !== 'undefined') {
            const pinned = State.settings.pinnedApps || [];
            if (pinned.includes(app.id)) Taskbar.unpinApp(app.id);
            Taskbar.renderApps();
        }
        if (typeof StartMenu !== 'undefined') StartMenu.renderApps();
        setTimeout(() => this.addMessage(FingoData.commands.uninstall.response[lang].replace('{app}', appName), 'bot'), 400);
    },

    // --- 安装 ---
    '_handle_install'(_text, lower) {
        const lang = this.lang();
        if (typeof AppShop === 'undefined') {
            setTimeout(() => this.addMessage(lang === 'zh' ? 'App Shop 未加载' : 'App Shop not loaded', 'bot'), 400);
            return;
        }
        // 在 AppShop 目录中查找
        let found = null;
        for (const shopApp of AppShop.apps) {
            if (lower.includes(shopApp.name.toLowerCase()) || lower.includes(shopApp.id)) { found = shopApp; break; }
        }
        if (!found) {
            setTimeout(() => this.addMessage(lang === 'zh' ? '⚠️ 该应用还未上架 App Shop，暂时无法安装。\n你可以打开 App Shop 浏览可用应用。' : '⚠️ This app is not available in App Shop yet.\nOpen App Shop to browse available apps.', 'bot'), 400);
            return;
        }
        // 检查是否已安装
        if (Desktop.apps.find(a => a.id === found.id)) {
            setTimeout(() => this.addMessage(lang === 'zh' ? `${found.name}已经安装了 ✅` : `${found.name}is already installed ✅`, 'bot'), 400);
            return;
        }
        // 执行安装
        Desktop.apps.push({ id: found.id, name: found.name, icon: `Theme/Icon/App_icon/${found.icon}`, isPWA: true, url: found.url });
        const installed = State.settings.installedApps || [];
        installed.push(found.id);
        State.updateSettings({ installedApps: installed });
        Desktop.renderIcons();
        if (typeof StartMenu !== 'undefined') StartMenu.renderApps();
        // 加载脚本
        const script = document.createElement('script');
        script.src = `js/third_parts_apps/${found.id}.js`;
        document.head.appendChild(script);
        setTimeout(() => this.addMessage(lang === 'zh' ? `${found.name} 安装成功 ✅` : `${found.name}installed successfully ✅`, 'bot'), 400);
    },

    // --- 修复 ---
    '_handle_repair'(_text, lower) {
        const lang = this.lang();
        const app = this._findApp(lower);
        if (!app) {
            setTimeout(() => this.addMessage(lang === 'zh' ? '请告诉我你要修复哪个应用，例如「修复浏览器」' : 'Which app? e.g. "repair browser"', 'bot'), 400);
            return;
        }
        const appName = Desktop.getAppName(app);
        if (this._isAppRunning(app.id)) {
            this._pendingAction = { type: 'repair', app, appName };
            setTimeout(() => this.addMessage(lang === 'zh' ? `${appName} 正在运行中，是否关闭并继续修复？（是/否）` : `${appName}is running. Close it and repair? (yes/no)`, 'bot'), 400);
            return;
        }
        this._doRepair(app, appName);
    },

    _doRepair(app, appName) {
        const lang = this.lang();
        if (typeof SettingsApp !== 'undefined' && SettingsApp.repairApp) {
            SettingsApp.repairApp({ id: app.id, name: appName });
        }
        setTimeout(() => this.addMessage(FingoData.commands.repair.response[lang].replace('{app}', appName), 'bot'), 400);
    },

    // --- 壁纸 ---
    async '_handle_wallpaper'() {
        const lang = this.lang();
        setTimeout(() => this.addMessage(FingoData.commands.wallpaper.response[lang], 'bot'), 300);
        try {
            const res = await fetch('https://bing.biturl.top/?resolution=1920&format=json&index=0&mkt=zh-CN');
            const data = await res.json();
            if (data && data.url) {
                State.updateSettings({ wallpaperDesktop: data.url });
                if (typeof Desktop !== 'undefined') Desktop.updateWallpaper();
                setTimeout(() => this.addMessage(lang === 'zh' ? '壁纸已更换 🖼️\n想要更多精彩壁纸？试试打开「照片」应用吧！' : 'Wallpaper changed 🖼️\nWant more? Try the Photos app!', 'bot'), 1200);
            } else { throw new Error('No URL'); }
        } catch (e) {
            setTimeout(() => this.addMessage(lang === 'zh' ? '获取壁纸失败，请稍后再试 😥' : 'Failed to fetch wallpaper, try again later 😥', 'bot'), 1200);
        }
    },

    _executeAction(action) {
        if (action === 'none' || action === 'suggestCustom') return;
        const [type, value] = action.split(':');
        switch (type) {
            case 'setTheme': State.updateSettings({ theme: value }); break;
            case 'setBlur': State.updateSettings({ enableBlur: value === 'true' }); break;
            case 'setAnimation': State.updateSettings({ enableAnimation: value === 'true' }); break;
            case 'setWindowBlur': State.updateSettings({ enableWindowBlur: value === 'true' }); break;
            case 'setFluentV2': State.updateSettings({ enableFluentV2: value === 'true' }); break;
            case 'setBluetooth':
                State.updateSettings({ bluetoothEnabled: value === 'true' });
                if (typeof ControlCenter !== 'undefined') ControlCenter.updateTiles();
                break;
            case 'setWifi': {
                const wifiTile = document.getElementById('wifi-tile');
                if (wifiTile) {
                    wifiTile.dataset.active = value;
                    const sub = wifiTile.querySelector('.tile-subtitle');
                    if (sub) sub.textContent = value === 'true' ? t('control.wifi.connected') : t('control.wifi.disconnected');
                }
                break;
            }
            case 'brightness': {
                let b = State.settings.brightness || 100;
                b = value === 'up' ? Math.min(150, b + 15) : Math.max(30, b - 15);
                State.updateSettings({ brightness: b });
                break;
            }
            case 'power':
                this.hide();
                setTimeout(() => {
                    if (value === 'shutdown') State.shutdown();
                    else if (value === 'restart') State.restart();
                    else if (value === 'logout') State.logout();
                    else if (value === 'lock') State.lock();
                }, 600);
                break;
            case 'openApp':
                this.hide();
                setTimeout(() => WindowManager.openApp(value), 400);
                break;
            case 'openSettings':
                this.hide();
                setTimeout(() => {
                    WindowManager.openApp('settings');
                    setTimeout(() => {
                        if (typeof SettingsApp !== 'undefined') {
                            SettingsApp.currentPage = value;
                            SettingsApp.render();
                        }
                    }, 500);
                }, 400);
                break;
        }
    },

    async _callApi(text, apiKey) {
        const provider = State.settings.fingoProvider || 'openai';
        const lang = this.lang();

        // 构建消息历史（最近10条）
        const conv = this.conversations.find(c => c.id === this.currentId);
        const msgs = (conv?.messages || []).slice(-10).map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.text
        }));
        msgs.push({ role: 'user', content: text });

        const sysMsg = { role: 'system', content: 'You are Fingo, a helpful assistant built into FluentOS. Reply concisely.' };

        let url, body, headers;
        if (provider === 'siliconflow') {
            url = 'https://api.siliconflow.cn/v1/chat/completions';
            body = { model: 'deepseek-ai/DeepSeek-V3', messages: [sysMsg, ...msgs], max_tokens: 1024 };
        }else {
            url = 'https://api.openai.com/v1/chat/completions';
            body = { model: 'gpt-4o-mini', messages: [sysMsg, ...msgs], max_tokens: 1024 };
        }
        headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };

        // 显示加载占位
        const loadingMsg = this.addMessage(lang === 'zh' ? '思考中...' : 'Thinking...', 'bot');

        const _updateReply = (txt) => {
            if (loadingMsg) {
                const textEl = loadingMsg.querySelector('.fingo-msg-text');
                if (textEl) {
                    textEl.textContent = '';
                    txt.split('\n').forEach((line, i) => {
                        if (i > 0) textEl.appendChild(document.createElement('br'));
                        textEl.appendChild(document.createTextNode(line));
                    });
                }
            }
            // 更新 localStorage 中保存的最后一条 bot 消息
            const c = this.conversations.find(x => x.id === this.currentId);
            if (c && c.messages.length) { c.messages[c.messages.length - 1].text = txt; this._saveConversations(); }
        };

        try {
            const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
            _updateReply(data.choices?.[0]?.message?.content || (lang === 'zh' ? '未收到回复' : 'No response'));
        } catch (e) {
            _updateReply(lang === 'zh' ? `API 错误，请检查 API Key 是否正确。\n(${e.message})` : `API error, please check your API Key.\n(${e.message})`);
        }
    }
};
