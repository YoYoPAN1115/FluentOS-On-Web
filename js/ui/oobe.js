/**
 * OOBE first-launch onboarding flow.
 * Standalone module: 6 steps (0-5) with live preview.
 */
const OOBE = {
    STORAGE_KEY: 'fluentos.oobe_completed',

    element: null,
    backgroundElement: null,
    lockPreviewElements: [],

    steps: [],
    progressDots: [],
    previewDesktopElements: [],
    previewTextNodes: [],
    previewTimeNodes: [],
    previewDateNodes: [],
    previewSearchInputNodes: [],
    lockPreviewTimeNodes: [],
    lockPreviewDateNodes: [],

    userNameInputEl: null,
    userEmailInputEl: null,
    userInlineStatusEl: null,
    userSettingsHostEl: null,
    userSettingsBodyEl: null,
    userSettingsScrollArea: null,
    userSettingsViewportEl: null,
    userAvatarGridEl: null,
    userAvatarUploadBtnEl: null,
    userAvatarResetBtnEl: null,
    userAvatarFileInputEl: null,

    selectedLang: null,
    selectedTheme: 'light',
    selectedAutoFullscreen: true,
    selectedFingoMode: 'local',
    selectedUserName: '',
    selectedUserEmail: '',
    selectedUserAvatar: 'Theme/Profile_img/UserAva.png',
    avatarThumbCache: null,
    avatarThumbBuildPromise: null,
    avatarThumbStorageKey: 'fluentos.avatarThumbs.v1',
    avatarPlaceholderSrc: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
    currentStep: 0,
    finishing: false,

    preloadingPromise: null,
    preloadCompleted: false,
    preloadFailed: false,

    clockTimer: null,

    fingoMessagesEl: null,
    fingoInputEl: null,
    fingoPreviewContentEl: null,
    fingoHistoryEl: null,
    fingoInputOnlyMode: true,
    fingoSettingsHostEl: null,
    fingoSettingsScrollArea: null,
    fingoSettingsViewportEl: null,
    fingoCustomOptionsWrapEl: null,
    fingoModeAnimating: false,
    pendingFingoCustomEnter: false,
    tempFingoPendingAction: null,
    oobeForceRestarting: false,
    oobeFingoApiListenerBound: false,

    /* Welcome animation state */
    welcomeLogoEl: null,
    welcomeTextEl: null,
    welcomeNextEl: null,
    welcomeAnimTimer: null,
    welcomePhaseTimer: null,
    welcomeLogoTextTimer: null,
    welcomeTextIndex: 0,
    welcomeTexts: ['欢迎', 'Welcome'],
    welcomeAnimStarted: false,
    logoBridgeEl: null,
    logoBridgeTimer: null,
    bridgeBootLogoEl: null,

    /* Language preview */
    langPreviewTextEl: null,

    i18n: {
        zh: {
            welcomeNext: '下一步',

            languageTitle: '欢迎使用 FluentOS',
            languageSubtitle: '选择系统语言后再继续。',
            langZhTitle: '简体中文',
            langZhDesc: '推荐中文用户',
            langEnTitle: 'English',
            langEnDesc: 'For English users',

            themePageTitle: '主题设置',
            themePageSubtitle: '实时预览浅色和深色模式的任务栏与开始菜单。',
            themeTitle: '主题',
            themeLight: '浅色',
            themeDark: '深色',
            autoFullscreenTitle: '\u5f00\u673a\u81ea\u52a8\u7f51\u9875\u5168\u5c4f',
            autoFullscreenDesc: '\u5f00\u673a\u7b2c2\u79d2\u81ea\u52a8\u8fdb\u5165\u7f51\u9875\u5168\u5c4f\uff0c\u5e26\u6765\u66f4\u4e3a\u6c89\u6d78\u7684\u4f53\u9a8c\u3002',
            autoFullscreenOn: '\u5f00\u542f',
            autoFullscreenOff: '\u5173\u95ed',

            fingoPageTitle: 'Fingo AI 模式',
            fingoPageSubtitle: '你可以在上方临时对话，退出 OOBE 后不会保存记录。',
            fingoModeTitle: '对话模式',
            fingoModeLocal: '默认本地模式',
            fingoModeCustom: '自定义 API 模式',
            fingoInputPlaceholder: 'Ask me anything...',

            passwordPageTitle: '设置密码',
            passwordPageSubtitle: '输入 4-10 位 PIN，用于锁屏登录。',
            pinTitle: 'PIN 密码',
            pinPlaceholder: '留空则使用当前 PIN',

            next: '下一步',
            back: '返回',
            finish: '完成并进入锁屏',

            preloadRunning: '正在后台准备离线资源包...',
            preloadDone: '离线资源包已准备完成。',
            preloadFail: '部分资源暂未缓存完成，后续会按需加载。',

            previewSearch: '在此键入以搜索',
            previewPinned: '已固定',
            previewAllApps: '所有应用',
            previewAppFiles: '文件管理器',
            previewAppSettings: '设置',
            previewAppCalc: '计算器',
            previewAppNotes: '记事本',
            previewAppBrowser: '浏览器',
            previewAppClock: '时钟',
            previewRecommended: '推荐的项目',
            previewMore: '更多',
            previewPictures: '图片',
            previewDownloads: '下载',
            previewLogin: '登录',

            fingoWelcome: '你好！我是 Fingo。你可以先在这里随便聊聊。',
            fingoFallback: '我先记下你的问题，进入桌面后我们继续。',
            fingoOobeBlocked: '这个功能需要进入系统才可以使用哦~'
        },
        en: {
            welcomeNext: 'Next',

            languageTitle: 'Welcome to FluentOS',
            languageSubtitle: 'Choose your language first.',
            langZhTitle: 'Chinese',
            langZhDesc: 'Simplified Chinese UI',
            langEnTitle: 'English',
            langEnDesc: 'Recommended for English users',

            themePageTitle: 'Theme',
            themePageSubtitle: 'Preview taskbar and Start menu in real time.',
            themeTitle: 'Theme',
            themeLight: 'Light',
            themeDark: 'Dark',
            autoFullscreenTitle: 'Auto Web Fullscreen On Boot',
            autoFullscreenDesc: 'Automatically enter web fullscreen at second 2 after boot for a more immersive experience.',
            autoFullscreenOn: 'On',
            autoFullscreenOff: 'Off',

            fingoPageTitle: 'Fingo AI Mode',
            fingoPageSubtitle: 'Chat above in temporary mode. Nothing is saved after OOBE.',
            fingoModeTitle: 'Conversation Mode',
            fingoModeLocal: 'Default local mode',
            fingoModeCustom: 'Custom API mode',
            fingoInputPlaceholder: 'Ask me anything...',

            passwordPageTitle: 'Set Password',
            passwordPageSubtitle: 'Enter a 4-10 digit PIN for lock screen login.',
            pinTitle: 'PIN',
            pinPlaceholder: 'Leave empty to keep current PIN',

            next: 'Next',
            back: 'Back',
            finish: 'Finish and enter lock screen',

            preloadRunning: 'Preparing offline resource pack in background...',
            preloadDone: 'Offline resource pack is ready.',
            preloadFail: 'Some assets are not cached yet and will load on demand.',

            previewSearch: 'Type here to search',
            previewPinned: 'Pinned',
            previewAllApps: 'All apps',
            previewAppFiles: 'File Manager',
            previewAppSettings: 'Settings',
            previewAppCalc: 'Calculator',
            previewAppNotes: 'Notepad',
            previewAppBrowser: 'Browser',
            previewAppClock: 'Clock',
            previewRecommended: 'Recommended',
            previewMore: 'More',
            previewPictures: 'Pictures',
            previewDownloads: 'Downloads',
            previewLogin: 'Sign in',

            fingoWelcome: 'Hi, I am Fingo. You can chat with me here first.',
            fingoFallback: 'I got it. We can continue after entering desktop.',
            fingoOobeBlocked: 'This feature requires entering the system first.'
        }
    },

    init() {
        this.element = document.getElementById('oobe-screen');
        if (!this.element) return;

        this.backgroundElement = document.getElementById('oobe-background');
        this.lockPreviewElements = Array.from(this.element.querySelectorAll('.oobe-live-lock-preview'));

        this.steps = Array.from(this.element.querySelectorAll('.oobe-step'));
        this.progressDots = Array.from(this.element.querySelectorAll('.oobe-progress-dot'));
        this.previewDesktopElements = Array.from(this.element.querySelectorAll('.oobe-live-desktop'));
        this.previewTextNodes = Array.from(this.element.querySelectorAll('[data-preview-text]'));
        this.previewTimeNodes = Array.from(this.element.querySelectorAll('.oobe-preview-time'));
        this.previewDateNodes = Array.from(this.element.querySelectorAll('.oobe-preview-date'));
        this.previewSearchInputNodes = Array.from(this.element.querySelectorAll('[data-preview-placeholder="search"]'));
        this.lockPreviewTimeNodes = Array.from(this.element.querySelectorAll('.oobe-lock-preview-time'));
        this.lockPreviewDateNodes = Array.from(this.element.querySelectorAll('.oobe-lock-preview-date'));

        this.fingoMessagesEl = document.getElementById('oobe-fingo-messages');
        this.fingoInputEl = document.getElementById('oobe-fingo-input');
        this.fingoHistoryEl = document.getElementById('oobe-fingo-history');
        this.fingoPreviewContentEl = document.getElementById('oobe-live-fingo-content');
        this.fingoSettingsHostEl = document.getElementById('oobe-fingo-settings-scroll-host');
        this.userSettingsHostEl = document.getElementById('oobe-user-settings-scroll-host');
        this.userSettingsBodyEl = document.getElementById('oobe-user-settings-body');
        this._initUserSettingsPanel();
        this.userNameInputEl = document.getElementById('oobe-user-name-input');
        this.userEmailInputEl = document.getElementById('oobe-user-email-input');
        this.userInlineStatusEl = document.getElementById('oobe-user-inline-status');
        this.userAvatarGridEl = document.getElementById('oobe-user-avatar-grid');
        this.userAvatarUploadBtnEl = document.getElementById('oobe-user-upload-avatar');
        this.userAvatarResetBtnEl = document.getElementById('oobe-user-default-avatar');
        this.userAvatarFileInputEl = document.getElementById('oobe-user-avatar-file');

        /* Welcome elements */
        this.welcomeLogoEl = document.getElementById('oobe-welcome-logo');
        this.welcomeTextEl = document.getElementById('oobe-welcome-text');
        this.welcomeNextEl = document.getElementById('oobe-next-0');

        /* Language preview text */
        this.langPreviewTextEl = document.getElementById('oobe-lang-preview-text');

        this._initFingoSettingsPanel();
        if (!this.oobeFingoApiListenerBound && State && typeof State.on === 'function') {
            this.oobeFingoApiListenerBound = true;
            State.on('fingoApiKeyReady', () => this._renderFingoSettingsPanel());
        }

        this._bindEvents();
        this._refreshTexts();
        this._setStep(0, true);
        this.hide();
    },

    shouldShowOnFirstLaunch() {
        try {
            return !localStorage.getItem(this.STORAGE_KEY);
        } catch (_) {
            return true;
        }
    },

    show(options = {}) {
        if (!this.element) return;

        this.element.classList.remove('hidden');
        this.element.style.opacity = '1';

        this._resetFlow();
        this._syncBackgroundWithLockWallpaper();
        this._syncDesktopPreviewState();
        this._tickPreviewClock();
        this._startPreviewClockTimer();
        this._startPreloadInBackground();

        this._refreshTexts();
        this._setStep(0, true);
        if (options && options.bootLogoEl) {
            this._startWelcomeAnimationFromBootLogo(options.bootLogoEl);
        } else {
            this._startWelcomeAnimation();
        }
    },

    hide() {
        if (!this.element) return;

        this._stopPreviewClockTimer();
        this._stopWelcomeAnimation();
        if (this.welcomeLogoEl) {
            this.welcomeLogoEl.classList.remove('oobe-logo-bridged');
        }
        this.element.classList.add('hidden');
    },

    completeAndEnterLock() {
        if (this.finishing || !this.element) return;
        this.finishing = true;

        const continueToLock = () => {
            this._applySelections();
            this._markCompleted();
            this._enterLockTransition();
        };

        if (!this._shouldWarnDefaultPinBeforeFinish()) {
            continueToLock();
            return;
        }

        this._showDefaultPinWarningDialog().then((confirmed) => {
            if (!confirmed) {
                this.finishing = false;
                return;
            }
            continueToLock();
        }).catch(() => {
            this.finishing = false;
        });
    },

    _shouldWarnDefaultPinBeforeFinish() {
        const pinInput = document.getElementById('oobe-pin-input');
        const inputPin = pinInput ? String(pinInput.value || '').trim() : '';
        const currentPin = String(State?.settings?.pin || '1234').trim() || '1234';
        const hasValidNewPin = inputPin.length >= 4 && inputPin.length <= 10;
        const effectivePin = hasValidNewPin ? inputPin : currentPin;
        const pinChanged = hasValidNewPin && inputPin !== currentPin;

        return !pinChanged && effectivePin === '1234';
    },

    _showDefaultPinWarningDialog() {
        return new Promise((resolve) => {
            if (typeof FluentUI === 'undefined' || !FluentUI || typeof FluentUI.Dialog !== 'function') {
                resolve(true);
                return;
            }

            const isZh = this._langCode() === 'zh';
            const confirmBase = isZh ? '确定' : 'OK';
            const title = isZh ? '默认密码提示' : 'Default Password Notice';
            const content = isZh
                ? '你还没有修改锁屏密码。默认锁屏密码为 1234。'
                : 'You have not changed the lock screen password. The default lock screen password is 1234.';

            let seconds = 3;
            let timer = null;
            const dialogRef = FluentUI.Dialog({
                type: 'warning',
                title,
                content,
                closeOnOverlay: false,
                buttons: [
                    { text: `${confirmBase} (${seconds}s)`, variant: 'primary', value: 'confirm' }
                ],
                onClose: (result) => {
                    if (timer) clearInterval(timer);
                    resolve(result === 'confirm');
                }
            });

            const confirmBtn = dialogRef?.dialog?.querySelector('.fluent-dialog-footer .fluent-btn');
            if (!confirmBtn) return;

            const setConfirmText = (sec) => {
                const textEl = confirmBtn.querySelector('.fluent-btn-text');
                const text = sec > 0 ? `${confirmBase} (${sec}s)` : confirmBase;
                if (textEl) {
                    textEl.textContent = text;
                } else {
                    confirmBtn.textContent = text;
                }
            };

            confirmBtn.disabled = true;
            setConfirmText(seconds);
            timer = setInterval(() => {
                seconds -= 1;
                if (seconds <= 0) {
                    clearInterval(timer);
                    timer = null;
                    confirmBtn.disabled = false;
                    setConfirmText(0);
                    return;
                }
                setConfirmText(seconds);
            }, 1000);
        });
    },

    _enterLockTransition() {
        const lockEl = document.getElementById('lock-screen');
        if (lockEl) {
            LockScreen.show();
            lockEl.style.opacity = '0';
            lockEl.style.transition = 'opacity 0.6s ease';
            lockEl.classList.remove('hidden');
        }

        this.element.style.transition = 'opacity 0.6s ease';
        requestAnimationFrame(() => {
            this.element.style.opacity = '0';
            if (lockEl) lockEl.style.opacity = '1';
        });

        setTimeout(() => {
            this.hide();
            this.element.style.transition = '';
            this.element.style.opacity = '';
            if (lockEl) {
                lockEl.style.transition = '';
                lockEl.style.opacity = '';
            }
            State.view = 'lock';
            this.finishing = false;
        }, 620);
    },

    _getUserAvatarOptions() {
        return [
            'Theme/Profile_img/UserAva.png',
            ...Array.from({ length: 10 }, (_, i) => `Theme/Profile_img/${i + 1}.jpg`)
        ];
    },

    _getProfileFallbacks() {
        const fallbackName = (I18n && typeof I18n.t === 'function') ? I18n.t('login.username') : 'Owner';
        const fallbackEmail = (I18n && typeof I18n.t === 'function') ? I18n.t('login.email') : 'owner@sample.com';
        return { fallbackName, fallbackEmail };
    },

    _getInitialUserProfileDraft() {
        const { fallbackName, fallbackEmail } = this._getProfileFallbacks();
        const avatars = this._getUserAvatarOptions();
        const rawAvatar = String(State?.settings?.userAvatar || '').trim();
        const isCustomAvatar = /^data:image\//i.test(rawAvatar);
        const avatar = (avatars.includes(rawAvatar) || isCustomAvatar) ? rawAvatar : avatars[0];
        const name = String(State?.settings?.userName || '').trim() || fallbackName;
        const email = String(State?.settings?.userEmail || '').trim() || fallbackEmail;
        return { name, email, avatar };
    },

    _isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
    },

    _getAvatarThumbCache() {
        if (this.avatarThumbCache) return this.avatarThumbCache;
        try {
            const raw = localStorage.getItem(this.avatarThumbStorageKey);
            const parsed = raw ? JSON.parse(raw) : {};
            this.avatarThumbCache = parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_) {
            this.avatarThumbCache = {};
        }
        return this.avatarThumbCache;
    },

    _saveAvatarThumbCache() {
        try {
            localStorage.setItem(this.avatarThumbStorageKey, JSON.stringify(this.avatarThumbCache || {}));
        } catch (_) {
            // ignore storage errors
        }
    },

    _getAvatarThumbSrc(src, fallback = '') {
        const cache = this._getAvatarThumbCache();
        return cache[src] || fallback || this.avatarPlaceholderSrc;
    },

    async _buildAvatarThumb(src, size = 80) {
        return new Promise((resolve) => {
            const img = new Image();
            img.decoding = 'async';
            img.onload = () => {
                try {
                    const width = Number(img.naturalWidth) || size;
                    const height = Number(img.naturalHeight) || size;
                    const cropSize = Math.min(width, height);
                    const sx = Math.max(0, (width - cropSize) / 2);
                    const sy = Math.max(0, (height - cropSize) / 2);

                    const canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        resolve(src);
                        return;
                    }

                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, size, size);
                    resolve(canvas.toDataURL('image/jpeg', 0.76));
                } catch (_) {
                    resolve(src);
                }
            };
            img.onerror = () => resolve(src);
            img.src = src;
        });
    },

    async _ensureAvatarThumbs(sources = []) {
        if (!Array.isArray(sources) || sources.length === 0) return;
        if (this.avatarThumbBuildPromise) return this.avatarThumbBuildPromise;

        this.avatarThumbBuildPromise = (async () => {
            const cache = this._getAvatarThumbCache();
            let changed = false;

            for (const src of sources) {
                if (!src || cache[src] || /^data:image\//i.test(src)) continue;

                await new Promise((resolve) => {
                    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
                        window.requestIdleCallback(() => resolve(), { timeout: 120 });
                    } else {
                        setTimeout(resolve, 16);
                    }
                });

                const thumb = await this._buildAvatarThumb(src, 80);
                if (!thumb || thumb === src) continue;

                cache[src] = thumb;
                changed = true;

                if (this.element) {
                    const key = encodeURIComponent(src);
                    const imgs = this.element.querySelectorAll(`img[data-avatar-key="${key}"]`);
                    imgs.forEach((img) => {
                        img.src = thumb;
                    });

                    const selectedAvatar = String(this.selectedUserAvatar || '').trim();
                    if (selectedAvatar === src) {
                        this._syncLockPreviewProfile();
                    }
                }
            }

            if (changed) {
                this.avatarThumbCache = cache;
                this._saveAvatarThumbCache();
            }
        })().finally(() => {
            this.avatarThumbBuildPromise = null;
        });

        return this.avatarThumbBuildPromise;
    },

    _syncUserProfileDraftToInputs() {
        if (this.userNameInputEl) this.userNameInputEl.value = this.selectedUserName;
        if (this.userEmailInputEl) this.userEmailInputEl.value = this.selectedUserEmail;
    },

    _syncLockPreviewProfile() {
        const { fallbackName, fallbackEmail } = this._getProfileFallbacks();
        const avatar = String(this.selectedUserAvatar || '').trim() || 'Theme/Profile_img/UserAva.png';
        const previewAvatarSrc = this._getAvatarThumbSrc(avatar, avatar);
        const name = String(this.selectedUserName || '').trim() || fallbackName;
        const email = String(this.selectedUserEmail || '').trim() || fallbackEmail;

        this.element.querySelectorAll('.oobe-lock-preview-username').forEach((el) => {
            el.textContent = name;
        });
        this.element.querySelectorAll('.oobe-lock-preview-email').forEach((el) => {
            el.textContent = email;
        });
        this.element.querySelectorAll('.oobe-lock-preview-avatar').forEach((img) => {
            img.onerror = () => {
                img.onerror = null;
                img.src = 'Theme/Profile_img/UserAva.png';
            };
            img.src = previewAvatarSrc;
        });
    },

    _renderUserAvatarGrid() {
        if (!this.userAvatarGridEl) return;
        this.userAvatarGridEl.innerHTML = '';

        const avatars = this._getUserAvatarOptions();
        const selected = String(this.selectedUserAvatar || '').trim();
        const isCustomSelected = /^data:image\//i.test(selected) && !avatars.includes(selected);
        const sources = isCustomSelected ? [selected, ...avatars] : avatars;
        const thumbSources = avatars.slice();

        sources.forEach((avatarPath, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `oobe-avatar-item ${avatarPath === selected ? 'active' : ''}`;
            const thumbSrc = this._getAvatarThumbSrc(avatarPath, /^data:image\//i.test(avatarPath) ? avatarPath : this.avatarPlaceholderSrc);
            const avatarKey = encodeURIComponent(avatarPath);
            btn.innerHTML = `<img src="${thumbSrc}" data-avatar-key="${avatarKey}" alt="avatar-${index + 1}" loading="lazy" decoding="async">`;
            btn.addEventListener('click', () => {
                this.selectedUserAvatar = avatarPath;
                this._renderUserAvatarGrid();
                this._syncLockPreviewProfile();
            });
            this.userAvatarGridEl.appendChild(btn);
        });

        requestAnimationFrame(() => {
            this._ensureAvatarThumbs(thumbSources);
        });

        if (this.userSettingsScrollArea && typeof this.userSettingsScrollArea.refresh === 'function') {
            requestAnimationFrame(() => this.userSettingsScrollArea.refresh());
        }
    },

    _syncUserStepState() {
        const d = this._dict();
        const next4 = document.getElementById('oobe-next-4');

        const name = String(this.selectedUserName || '').trim();
        const email = String(this.selectedUserEmail || '').trim();
        let message = '';
        let valid = true;

        if (!name) {
            valid = false;
            message = d.userNameRequired;
        } else if (!this._isValidEmail(email)) {
            valid = false;
            message = d.userEmailInvalid;
        }

        if (this.userInlineStatusEl) {
            this.userInlineStatusEl.textContent = message;
            this.userInlineStatusEl.classList.toggle('error', !valid);
        }

        if (next4) {
            next4.disabled = !valid;
            next4.classList.toggle('is-disabled', !valid);
        }

        return valid;
    },

    async _resizeImageFileToDataUrl(file, size = 192, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('read-failed'));
            reader.onload = () => {
                const src = String(reader.result || '');
                if (!/^data:image\//i.test(src)) {
                    reject(new Error('invalid-image'));
                    return;
                }

                const img = new Image();
                img.decoding = 'async';
                img.onerror = () => reject(new Error('decode-failed'));
                img.onload = () => {
                    try {
                        const width = Number(img.naturalWidth) || size;
                        const height = Number(img.naturalHeight) || size;
                        const cropSize = Math.min(width, height);
                        const sx = Math.max(0, (width - cropSize) / 2);
                        const sy = Math.max(0, (height - cropSize) / 2);

                        const canvas = document.createElement('canvas');
                        canvas.width = size;
                        canvas.height = size;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            resolve(src);
                            return;
                        }

                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, size, size);
                        resolve(canvas.toDataURL('image/jpeg', quality));
                    } catch (error) {
                        reject(error);
                    }
                };
                img.src = src;
            };
            reader.readAsDataURL(file);
        });
    },

    _initUserSettingsPanel() {
        if (!this.userSettingsHostEl || !this.userSettingsBodyEl) return;

        const body = this.userSettingsBodyEl;
        this.userSettingsHostEl.innerHTML = '';

        if (typeof FluentUI !== 'undefined' && FluentUI && typeof FluentUI.ScrollArea === 'function') {
            const scrollArea = FluentUI.ScrollArea({
                className: 'oobe-user-settings-scroll'
            });
            this.userSettingsHostEl.appendChild(scrollArea);
            this.userSettingsScrollArea = scrollArea;
            this.userSettingsViewportEl = typeof scrollArea.getViewport === 'function'
                ? scrollArea.getViewport()
                : scrollArea.querySelector('.fluent-scroll-viewport');
            (this.userSettingsViewportEl || this.userSettingsHostEl).appendChild(body);
            requestAnimationFrame(() => {
                if (this.userSettingsScrollArea && typeof this.userSettingsScrollArea.refresh === 'function') {
                    this.userSettingsScrollArea.refresh();
                }
            });
            return;
        }

        this.userSettingsScrollArea = null;
        this.userSettingsViewportEl = this.userSettingsHostEl;
        this.userSettingsHostEl.appendChild(body);
    },

    _bindEvents() {
        const languageButtons = Array.from(this.element.querySelectorAll('.oobe-option-btn[data-lang]'));
        languageButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                this.selectedLang = btn.dataset.lang || 'zh';
                languageButtons.forEach(item => item.classList.toggle('active', item === btn));
                this._syncNextStep1State();
                this._syncDesktopPreviewState();
                this._syncLangPreviewText();
                this._refreshTexts();
            });
        });

        const themeButtons = Array.from(this.element.querySelectorAll('#oobe-theme-group .oobe-chip'));
        themeButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                this.selectedTheme = btn.dataset.theme || 'light';
                themeButtons.forEach(item => item.classList.toggle('active', item === btn));
                this._syncDesktopPreviewState();
            });
        });

        const autoFullscreenButtons = Array.from(this.element.querySelectorAll('#oobe-auto-fullscreen-group .oobe-chip'));
        autoFullscreenButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                this.selectedAutoFullscreen = btn.dataset.autoFullscreen !== 'false';
                autoFullscreenButtons.forEach(item => item.classList.toggle('active', item === btn));
            });
        });

        /* Welcome step 0 next */
        const next0 = document.getElementById('oobe-next-0');
        if (next0) {
            next0.addEventListener('click', () => {
                this._stopWelcomeAnimation();
                this._setStep(1);
            });
        }

        const next1 = document.getElementById('oobe-next-1');
        const back1 = document.getElementById('oobe-back-1');
        const next2 = document.getElementById('oobe-next-2');
        const next3 = document.getElementById('oobe-next-3');
        const next4 = document.getElementById('oobe-next-4');
        const back2 = document.getElementById('oobe-back-2');
        const back3 = document.getElementById('oobe-back-3');
        const back4 = document.getElementById('oobe-back-4');
        const back5 = document.getElementById('oobe-back-5');
        const finish = document.getElementById('oobe-finish');

        if (next1) {
            next1.addEventListener('click', () => {
                if (!this.selectedLang) return;
                this._setStep(2);
            });
        }
        if (back1) back1.addEventListener('click', () => { this._setStep(0); this._startWelcomeAnimation(); });
        if (next2) next2.addEventListener('click', () => this._setStep(3));
        if (next3) next3.addEventListener('click', () => this._setStep(4));
        if (next4) next4.addEventListener('click', () => {
            if (!this._syncUserStepState()) return;
            this._setStep(5);
        });
        if (back2) back2.addEventListener('click', () => this._setStep(1));
        if (back3) back3.addEventListener('click', () => this._setStep(2));
        if (back4) back4.addEventListener('click', () => this._setStep(3));
        if (back5) back5.addEventListener('click', () => this._setStep(4));
        if (finish) finish.addEventListener('click', () => this.completeAndEnterLock());

        if (this.userNameInputEl) {
            this.userNameInputEl.addEventListener('input', () => {
                this.selectedUserName = String(this.userNameInputEl.value || '');
                this._syncLockPreviewProfile();
                this._syncUserStepState();
            });
        }

        if (this.userEmailInputEl) {
            this.userEmailInputEl.addEventListener('input', () => {
                this.selectedUserEmail = String(this.userEmailInputEl.value || '');
                this._syncLockPreviewProfile();
                this._syncUserStepState();
            });
        }

        if (this.userAvatarUploadBtnEl && this.userAvatarFileInputEl) {
            this.userAvatarUploadBtnEl.addEventListener('click', () => {
                this.userAvatarFileInputEl.click();
            });
        }

        if (this.userAvatarResetBtnEl) {
            this.userAvatarResetBtnEl.addEventListener('click', () => {
                this.selectedUserAvatar = 'Theme/Profile_img/UserAva.png';
                this._renderUserAvatarGrid();
                this._syncLockPreviewProfile();
            });
        }

        if (this.userAvatarFileInputEl) {
            this.userAvatarFileInputEl.addEventListener('change', async (e) => {
                const file = e.target?.files && e.target.files[0];
                if (!file) return;
                if (!file.type || !file.type.startsWith('image/')) {
                    this.userAvatarFileInputEl.value = '';
                    return;
                }

                try {
                    const dataUrl = await this._resizeImageFileToDataUrl(file, 192, 0.8);
                    this.selectedUserAvatar = dataUrl;
                    this._renderUserAvatarGrid();
                    this._syncLockPreviewProfile();
                } catch (_) {
                    // ignore invalid file
                } finally {
                    this.userAvatarFileInputEl.value = '';
                }
            });
        }

        if (this.fingoInputEl) {
            this.fingoInputEl.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter') return;
                const text = String(this.fingoInputEl.value || '').trim();
                if (!text) return;
                this.fingoInputEl.value = '';
                this._enterTempFingoConversation();
                this._appendTempFingoMessage(text, 'user');
                this._buildTempFingoReply(text).then(reply => {
                    this._appendTempFingoMessage(reply, 'bot');
                });
            });
        }
    },

    _setStep(step, immediate = false) {
        this.currentStep = step;
        this.steps.forEach((section) => {
            const sectionStep = Number(section.dataset.step);
            section.classList.toggle('active', sectionStep === step);
            if (immediate) {
                section.style.transition = 'none';
                requestAnimationFrame(() => {
                    section.style.transition = '';
                });
            }
        });

        /* Progress dots map to steps 1-5 */
        this.progressDots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === step - 1);
        });

        /* Hide progress on step 0 */
        const progressEl = document.getElementById('oobe-progress');
        if (progressEl) {
            progressEl.classList.toggle('oobe-progress-hidden', step === 0);
        }

        if (step === 3) {
            if (this.fingoInputEl) {
                setTimeout(() => this.fingoInputEl.focus(), 120);
            }
            this._renderFingoSettingsPanel();
            if (this.fingoSettingsScrollArea && typeof this.fingoSettingsScrollArea.refresh === 'function') {
                requestAnimationFrame(() => this.fingoSettingsScrollArea.refresh());
            }
        }

        if (step === 4) {
            this._syncUserProfileDraftToInputs();
            this._renderUserAvatarGrid();
            this._syncLockPreviewProfile();
            this._syncUserStepState();
            if (this.userSettingsScrollArea && typeof this.userSettingsScrollArea.refresh === 'function') {
                requestAnimationFrame(() => this.userSettingsScrollArea.refresh());
            }
            if (this.userNameInputEl) {
                setTimeout(() => this.userNameInputEl.focus(), 120);
            }
        }

        if (step === 5) {
            this._syncLockPreviewProfile();
        }

        /* Sync language preview text when entering step 1 */
        if (step === 1) {
            this._syncLangPreviewText();
        }
    },

    _resetFlow() {
        this.finishing = false;
        this.selectedLang = null;
        this.selectedTheme = State?.settings?.theme === 'dark' ? 'dark' : 'light';
        this.selectedAutoFullscreen = State?.settings?.autoEnterFullscreen !== false;
        this.selectedFingoMode = State?.settings?.fingoCustomMode ? 'custom' : 'local';
        const draft = this._getInitialUserProfileDraft();
        this.selectedUserName = draft.name;
        this.selectedUserEmail = draft.email;
        this.selectedUserAvatar = draft.avatar;
        this.fingoModeAnimating = false;
        this.pendingFingoCustomEnter = false;

        const pinInput = document.getElementById('oobe-pin-input');
        if (pinInput) pinInput.value = '';

        const languageButtons = Array.from(this.element.querySelectorAll('.oobe-option-btn[data-lang]'));
        languageButtons.forEach(btn => btn.classList.remove('active'));

        this._setChipGroupActive('#oobe-theme-group .oobe-chip', (btn) => (btn.dataset.theme || 'light') === this.selectedTheme);
        this._setChipGroupActive('#oobe-auto-fullscreen-group .oobe-chip', (btn) => (btn.dataset.autoFullscreen !== 'false') === this.selectedAutoFullscreen);
        this._renderFingoSettingsPanel();
        this._syncUserProfileDraftToInputs();
        this._renderUserAvatarGrid();
        this._syncUserStepState();
        this._syncLockPreviewProfile();

        this._syncNextStep1State();
        this._resetTempFingoChat();
        this._updatePreloadStatusText();
    },

    _setChipGroupActive(selector, predicate) {
        const buttons = Array.from(this.element.querySelectorAll(selector));
        buttons.forEach((btn) => {
            btn.classList.toggle('active', predicate(btn));
        });
    },

    _syncNextStep1State() {
        const next = document.getElementById('oobe-next-1');
        if (!next) return;
        const enabled = Boolean(this.selectedLang);
        next.disabled = !enabled;
        next.classList.toggle('is-disabled', !enabled);
    },

    _syncBackgroundWithLockWallpaper() {
        const lockWallpaper = State?.settings?.wallpaperLock || 'Theme/Picture/Fluent-1.png';
        const desktopWallpaper = State?.settings?.wallpaperDesktop || 'Theme/Picture/Fluent-2.png';

        if (this.backgroundElement) {
            this.backgroundElement.style.backgroundImage = `url('${lockWallpaper}')`;
        }

        /* Lock preview wallpaper elements */
        this.lockPreviewElements.forEach((preview) => {
            const lockWpEl = preview.querySelector('.oobe-live-lock-wallpaper');
            if (lockWpEl) {
                lockWpEl.style.backgroundImage = `url('${lockWallpaper}')`;
            }
        });

        this.previewDesktopElements.forEach((preview) => {
            const wallpaper = preview.querySelector('.oobe-live-wallpaper');
            if (wallpaper) {
                wallpaper.style.backgroundImage = `url('${desktopWallpaper}')`;
            }
        });

        const fingoPreview = this.element.querySelector('.oobe-live-fingo');
        if (fingoPreview) {
            fingoPreview.style.setProperty('--oobe-preview-bg', `url('${desktopWallpaper}')`);
            const fingoWallpaper = fingoPreview.querySelector('.oobe-live-wallpaper');
            if (fingoWallpaper) {
                fingoWallpaper.style.backgroundImage = `url('${desktopWallpaper}')`;
            }
        }
    },

    _syncDesktopPreviewState() {
        const dict = this._dict();
        const isDark = this.selectedTheme === 'dark';
        this.element.classList.toggle('dark-mode', isDark);
        this.element.classList.toggle('oobe-theme-light', !isDark);

        this.previewTextNodes.forEach((node) => {
            const key = node.getAttribute('data-preview-text');
            if (!key) return;
            const value = {
                pinned: dict.previewPinned,
                allApps: dict.previewAllApps,
                appFiles: dict.previewAppFiles,
                appSettings: dict.previewAppSettings,
                appCalc: dict.previewAppCalc,
                appNotes: dict.previewAppNotes,
                appBrowser: dict.previewAppBrowser,
                appClock: dict.previewAppClock,
                recommended: dict.previewRecommended,
                more: dict.previewMore,
                pictures: dict.previewPictures,
                downloads: dict.previewDownloads
            }[key];
            if (typeof value === 'string') {
                node.textContent = value;
            }
        });

        this.previewSearchInputNodes.forEach((node) => {
            node.placeholder = dict.previewSearch;
        });
    },

    _tickPreviewClock() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        const timeText = `${hh}:${mm}`;
        const dateText = `${month}/${day}`;

        this.previewTimeNodes.forEach(node => {
            node.textContent = timeText;
        });

        this.previewDateNodes.forEach(node => {
            node.textContent = dateText;
        });

        this.lockPreviewTimeNodes.forEach((node) => {
            node.textContent = timeText;
        });
        this.lockPreviewDateNodes.forEach((node) => {
            node.textContent = dateText;
        });
    },

    _startPreviewClockTimer() {
        this._stopPreviewClockTimer();
        this.clockTimer = setInterval(() => this._tickPreviewClock(), 1000 * 30);
    },

    _stopPreviewClockTimer() {
        if (!this.clockTimer) return;
        clearInterval(this.clockTimer);
        this.clockTimer = null;
    },

    _startPreloadInBackground() {
        if (this.preloadingPromise) {
            this._updatePreloadStatusText();
            return;
        }

        this.preloadingPromise = (async () => {
            try {
                if (State && typeof State.ensureFSIntegrity === 'function') {
                    State.ensureFSIntegrity();
                }
                if (BootScreen && typeof BootScreen._preloadResourcePackByPriority === 'function') {
                    await BootScreen._preloadResourcePackByPriority();
                }
                if (BootScreen && BootScreen.CACHE_KEY) {
                    localStorage.setItem(BootScreen.CACHE_KEY, Date.now().toString());
                }
                this.preloadCompleted = true;
            } catch (_) {
                this.preloadFailed = true;
            } finally {
                this._updatePreloadStatusText();
            }
        })();

        this._updatePreloadStatusText();
    },

    _updatePreloadStatusText() {
        const el = document.getElementById('oobe-preload-status');
        if (!el) return;
        const d = this._dict();
        if (this.preloadCompleted) {
            el.textContent = d.preloadDone;
        } else if (this.preloadFailed) {
            el.textContent = d.preloadFail;
        } else {
            el.textContent = d.preloadRunning;
        }
    },

    _fingoText(key, fallbackZh = '', fallbackEn = '') {
        const lang = this._langCode() === 'en' ? 'en' : 'zh';
        const localized = I18n?.translations?.[lang]?.[key];
        if (typeof localized === 'string' && localized.trim()) return localized;
        if (typeof t === 'function') {
            const val = t(key);
            if (typeof val === 'string' && val !== key && val.trim()) return val;
        }
        return lang === 'en'
            ? (fallbackEn || fallbackZh || key)
            : (fallbackZh || fallbackEn || key);
    },

    _initFingoSettingsPanel() {
        if (!this.fingoSettingsHostEl) return;
        this.fingoSettingsHostEl.innerHTML = '';

        if (typeof FluentUI !== 'undefined' && FluentUI && typeof FluentUI.ScrollArea === 'function') {
            const scrollArea = FluentUI.ScrollArea({
                className: 'oobe-fingo-settings-scroll'
            });
            this.fingoSettingsHostEl.appendChild(scrollArea);
            this.fingoSettingsScrollArea = scrollArea;
            this.fingoSettingsViewportEl = typeof scrollArea.getViewport === 'function'
                ? scrollArea.getViewport()
                : scrollArea.querySelector('.fluent-scroll-viewport');
        } else {
            this.fingoSettingsScrollArea = null;
            this.fingoSettingsViewportEl = document.createElement('div');
            this.fingoSettingsHostEl.appendChild(this.fingoSettingsViewportEl);
        }

        this._renderFingoSettingsPanel();
    },

    _createFingoSettingSection(title) {
        const section = document.createElement('div');
        section.className = 'oobe-fingo-setting-section';

        const heading = document.createElement('div');
        heading.className = 'oobe-fingo-section-title';
        heading.textContent = title;
        section.appendChild(heading);

        return section;
    },

    _renderFingoSettingsPanel() {
        if (!this.fingoSettingsViewportEl || typeof FluentUI === 'undefined' || !FluentUI) return;

        this.fingoSettingsViewportEl.innerHTML = '';
        this.fingoCustomOptionsWrapEl = null;

        const root = document.createElement('div');
        root.className = 'oobe-fingo-settings-body';
        const customEnabled = this.selectedFingoMode === 'custom';

        const modeSection = this._createFingoSettingSection(
            this._fingoText('settings.fingo-mode', 'Conversation Mode', 'Conversation Mode')
        );
        modeSection.appendChild(FluentUI.SettingItem({
            label: this._fingoText('settings.fingo-custom', 'Custom Mode', 'Custom Mode'),
            description: this._fingoText('settings.fingo-custom-desc', 'Use your own API Key for LLM conversation.', 'Use your own API Key for LLM conversation.'),
            control: FluentUI.Toggle({
                checked: customEnabled,
                onChange: (v) => this._handleOobeFingoCustomModeToggle(v)
            })
        }));

        if (customEnabled) {
            const customWrap = this._renderOobeFingoCustomOptions();
            if (customWrap) modeSection.appendChild(customWrap);
        }
        root.appendChild(modeSection);

        const aboutSection = this._createFingoSettingSection(
            this._fingoText('settings.fingo-about', 'About Fingo AI', 'About Fingo AI')
        );
        const aboutCard = document.createElement('div');
        aboutCard.className = 'fluent-setting-item oobe-fingo-about-note';
        const aboutInfo = document.createElement('div');
        aboutInfo.className = 'fluent-setting-item-info';
        const aboutText = document.createElement('div');
        aboutText.className = 'fluent-setting-item-desc';
        aboutText.style.fontSize = '12px';
        aboutText.style.lineHeight = '1.6';
        aboutText.textContent = this._fingoText(
            'settings.fingo-about-text',
            'Fingo can work in keyword mode by default, and in custom mode with your own API Key.',
            'Fingo can work in keyword mode by default, and in custom mode with your own API Key.'
        );
        aboutInfo.appendChild(aboutText);
        aboutCard.appendChild(aboutInfo);
        aboutSection.appendChild(aboutCard);
        root.appendChild(aboutSection);

        this.fingoSettingsViewportEl.appendChild(root);

        if (customEnabled && this.pendingFingoCustomEnter && this.fingoCustomOptionsWrapEl) {
            this.pendingFingoCustomEnter = false;
            requestAnimationFrame(() => {
                this.fingoCustomOptionsWrapEl?.classList.add('anim-in');
                setTimeout(() => this.fingoCustomOptionsWrapEl?.classList.remove('anim-in'), 660);
            });
        }

        if (this.fingoSettingsScrollArea && typeof this.fingoSettingsScrollArea.refresh === 'function') {
            requestAnimationFrame(() => this.fingoSettingsScrollArea.refresh());
        }
    },

    _handleOobeFingoCustomModeToggle(enableCustom) {
        if (this.fingoModeAnimating) return;
        this.tempFingoPendingAction = null;

        if (enableCustom) {
            const zhGuardContent = '\u5f00\u542f\u81ea\u5b9a\u4e49 API \u6a21\u5f0f\u524d\uff0c\u9700\u8981\u5f00\u542f\u300c\u7981\u7528\u5185\u8054\u811a\u672c\u300d\u3002\u70b9\u51fb\u300c\u786e\u5b9a\u300d\u540e\u5c06\u81ea\u52a8\u542f\u7528\u8be5\u5b89\u5168\u9879\u5e76\u5f00\u542f\u81ea\u5b9a\u4e49\u6a21\u5f0f\u3002';
            const enGuardContent = 'Before enabling custom API mode, "Disable Inline Scripts" must be enabled. Click "OK" to enable it and continue.';
            FluentUI.Dialog({
                type: 'warning',
                title: this._fingoText('settings.strict-csp-required-title', 'Enable Custom API Mode', 'Enable Custom API Mode'),
                content: this._langCode() === 'zh' ? zhGuardContent : enGuardContent,
                buttons: [
                    { text: this._fingoText('cancel', 'Cancel', 'Cancel'), variant: 'secondary', value: 'cancel' },
                    { text: this._fingoText('ok', 'OK', 'OK'), variant: 'primary', value: 'confirm' }
                ],
                onClose: (result) => {
                    if (result === 'confirm') {
                        this.selectedFingoMode = 'custom';
                        this.pendingFingoCustomEnter = true;
                        if (State && typeof State.updateSettings === 'function') {
                            State.updateSettings({
                                strictCspEnabled: true,
                                fingoCustomMode: true
                            });
                        }
                    } else {
                        this.selectedFingoMode = State?.settings?.fingoCustomMode ? 'custom' : 'local';
                    }
                    this._renderFingoSettingsPanel();
                }
            });
            return;
        }

        const finishDisable = () => {
            this.selectedFingoMode = 'local';
            if (State && typeof State.updateSettings === 'function') {
                State.updateSettings({ fingoCustomMode: false });
            }
            this._renderFingoSettingsPanel();
            this.fingoModeAnimating = false;
        };

        this.fingoModeAnimating = true;
        if (this.fingoCustomOptionsWrapEl) {
            this.fingoCustomOptionsWrapEl.classList.remove('anim-in');
            this.fingoCustomOptionsWrapEl.classList.add('anim-out');
            setTimeout(finishDisable, 430);
        } else {
            finishDisable();
        }
    },

    _renderOobeFingoCustomOptions() {
        const wrap = document.createElement('div');
        wrap.className = 'oobe-fingo-custom-options';

        const providerItem = FluentUI.SettingItem({
            label: this._fingoText('settings.fingo-provider', 'API Provider', 'API Provider'),
            control: FluentUI.Select({
                options: [
                    { value: 'openai', label: 'OpenAI' },
                    {
                        value: 'siliconflow',
                        label: this._langCode() === 'zh' ? '\u7845\u57fa\u6d41\u52a8 (SiliconFlow)' : 'SiliconFlow'
                    }
                ],
                value: State?.settings?.fingoProvider || 'openai',
                onChange: (v) => {
                    if (State && typeof State.updateSettings === 'function') {
                        State.updateSettings({ fingoProvider: v });
                    }
                }
            })
        });
        providerItem.style.setProperty('--fingo-stagger-index', '0');
        wrap.appendChild(providerItem);

        const saveModeItem = FluentUI.SettingItem({
            label: this._fingoText('settings.fingo-key-save-mode', 'API Key Save Mode', 'API Key Save Mode'),
            description: this._fingoText('settings.fingo-key-save-mode-desc', 'Temporary mode clears key after closing page.', 'Temporary mode clears key after closing page.'),
            control: FluentUI.Select({
                options: [
                    { value: 'temporary', label: this._fingoText('settings.fingo-key-mode-temporary', 'Temporary', 'Temporary') },
                    { value: 'permanent', label: this._fingoText('settings.fingo-key-mode-permanent', 'Permanent', 'Permanent') }
                ],
                value: State?.settings?.fingoApiSaveMode === 'permanent' ? 'permanent' : 'temporary',
                onChange: (v) => {
                    if (State && typeof State.updateSettings === 'function') {
                        State.updateSettings({ fingoApiSaveMode: v });
                    }
                }
            })
        });
        saveModeItem.style.setProperty('--fingo-stagger-index', '1');
        wrap.appendChild(saveModeItem);

        const keyWrapper = document.createElement('div');
        keyWrapper.className = 'fluent-setting-item oobe-fingo-key-item';
        keyWrapper.style.setProperty('--fingo-stagger-index', '2');

        const keyLabel = document.createElement('div');
        keyLabel.className = 'fluent-setting-item-label';
        keyLabel.textContent = this._fingoText('settings.fingo-apikey', 'API Key', 'API Key');

        const keyRow = document.createElement('div');
        keyRow.className = 'oobe-fingo-key-row';

        const currentStorageType = (typeof Fingo !== 'undefined' && typeof Fingo.getApiKeyStorageType === 'function')
            ? Fingo.getApiKeyStorageType()
            : (State?.settings?.fingoApiStorageType || 'none');
        const sessionKey = (typeof Fingo !== 'undefined' && typeof Fingo.getSessionApiKey === 'function')
            ? (Fingo.getSessionApiKey() || '')
            : '';
        const encryptedLocked = currentStorageType === 'permanent-encrypted' && !sessionKey;
        const uiKeyValue = (typeof Fingo !== 'undefined' && typeof Fingo.getSessionApiKey === 'function')
            ? (Fingo.getSessionApiKey() || (State?.settings?.fingoApiStorageType === 'permanent-plain' ? (State?.settings?.fingoApiKey || '') : ''))
            : (State?.settings?.fingoApiStorageType === 'permanent-plain' ? (State?.settings?.fingoApiKey || '') : '');

        const keyInput = FluentUI.Input({
            type: 'password',
            placeholder: encryptedLocked
                ? this._fingoText('settings.fingo-key-encrypted-placeholder', 'API Key is encrypted. Decrypt before use.', 'API Key is encrypted. Decrypt before use.')
                : this._fingoText('settings.fingo-apikey-placeholder', 'Enter your API Key', 'Enter your API Key'),
            value: uiKeyValue
        });

        const saveBtn = FluentUI.Button({
            text: this._fingoText('settings.fingo-save', 'Save', 'Save'),
            variant: 'primary',
            onClick: async () => {
                const val = String(keyInput.getValue ? keyInput.getValue() : '').trim();
                if (!val) {
                    if (encryptedLocked) {
                        FluentUI.Toast({
                            title: this._fingoText('settings.fingo', 'Fingo AI', 'Fingo AI'),
                            message: this._fingoText('settings.fingo-key-encrypted-use-tip', 'API Key is encrypted. Decrypt it or overwrite with a new key.', 'API Key is encrypted. Decrypt it or overwrite with a new key.'),
                            type: 'info'
                        });
                        return;
                    }
                    if (typeof Fingo !== 'undefined' && typeof Fingo.clearApiKey === 'function') {
                        Fingo.clearApiKey();
                    } else if (State && typeof State.updateSettings === 'function') {
                        State.updateSettings({ fingoApiKey: '', fingoApiEncrypted: null, fingoApiStorageType: 'none' });
                    }
                    FluentUI.Toast({
                        title: this._fingoText('settings.fingo', 'Fingo AI', 'Fingo AI'),
                        message: this._fingoText('settings.fingo-key-cleared', 'API Key cleared.', 'API Key cleared.'),
                        type: 'success'
                    });
                    this._renderFingoSettingsPanel();
                    return;
                }

                const saveMode = State?.settings?.fingoApiSaveMode === 'permanent' ? 'permanent' : 'temporary';
                if (saveMode === 'temporary') {
                    if (typeof Fingo !== 'undefined' && typeof Fingo.saveApiKeyTemporary === 'function') {
                        Fingo.saveApiKeyTemporary(val);
                    } else if (State && typeof State.updateSettings === 'function') {
                        State.updateSettings({ fingoApiKey: '', fingoApiEncrypted: null, fingoApiStorageType: 'session' });
                    }
                    FluentUI.Toast({
                        title: this._fingoText('settings.fingo', 'Fingo AI', 'Fingo AI'),
                        message: this._fingoText('settings.fingo-temp-saved', 'API Key saved temporarily.', 'API Key saved temporarily.'),
                        type: 'success'
                    });
                    this._renderFingoSettingsPanel();
                    return;
                }

                this._handleOobeFingoPermanentSave(val);
            }
        });

        const clearBtn = FluentUI.Button({
            text: this._fingoText('settings.fingo-clear-key', 'Clear API Key', 'Clear API Key'),
            variant: 'secondary',
            onClick: () => {
                if (typeof Fingo !== 'undefined' && typeof Fingo.clearApiKey === 'function') {
                    Fingo.clearApiKey();
                } else if (State && typeof State.updateSettings === 'function') {
                    State.updateSettings({ fingoApiKey: '', fingoApiEncrypted: null, fingoApiStorageType: 'none' });
                }
                FluentUI.Toast({
                    title: this._fingoText('settings.fingo', 'Fingo AI', 'Fingo AI'),
                    message: this._fingoText('settings.fingo-key-cleared', 'API Key cleared.', 'API Key cleared.'),
                    type: 'success'
                });
                this._renderFingoSettingsPanel();
            }
        });

        keyRow.appendChild(keyInput);
        keyRow.appendChild(saveBtn);
        keyRow.appendChild(clearBtn);

        const keyStatus = document.createElement('div');
        keyStatus.className = 'fluent-setting-item-desc oobe-fingo-key-status';
        keyStatus.textContent = this._getFingoApiStorageStatusText(
            (typeof Fingo !== 'undefined' && typeof Fingo.getApiKeyStorageType === 'function')
                ? Fingo.getApiKeyStorageType()
                : (State?.settings?.fingoApiStorageType || 'none')
        );

        keyWrapper.appendChild(keyLabel);
        keyWrapper.appendChild(keyRow);
        keyWrapper.appendChild(keyStatus);
        wrap.appendChild(keyWrapper);

        this.fingoCustomOptionsWrapEl = wrap;
        return wrap;
    },

    _getFingoApiStorageStatusText(type) {
        switch (type) {
            case 'session':
                return this._fingoText('settings.fingo-key-status-session', 'Current: temporary session storage.', 'Current: temporary session storage.');
            case 'permanent-plain':
                return this._fingoText('settings.fingo-key-status-plain', 'Current: permanently stored as plain text.', 'Current: permanently stored as plain text.');
            case 'permanent-encrypted':
                return this._fingoText('settings.fingo-key-status-encrypted', 'Current: encrypted via WebCrypto.', 'Current: encrypted via WebCrypto.');
            default:
                return this._fingoText('settings.fingo-key-status-none', 'No API Key stored.', 'No API Key stored.');
        }
    },

    _promptOobeFingoEncryptPassphrase() {
        return new Promise((resolve) => {
            FluentUI.InputDialog({
                title: this._fingoText('settings.fingo-encrypt-passphrase-title', 'Set Encryption Passphrase', 'Set Encryption Passphrase'),
                placeholder: this._fingoText('settings.fingo-encrypt-passphrase-placeholder', 'At least 6 characters', 'At least 6 characters'),
                inputType: 'password',
                minLength: 6,
                validateFn: (value) => value.length >= 6 || this._fingoText('settings.fingo-encrypt-passphrase-error', 'Passphrase must be at least 6 characters.', 'Passphrase must be at least 6 characters.'),
                confirmText: this._fingoText('ok', 'OK', 'OK'),
                cancelText: this._fingoText('cancel', 'Cancel', 'Cancel'),
                onConfirm: (passphrase) => resolve(passphrase),
                onCancel: () => resolve(null)
            });
        });
    },

    _handleOobeFingoPermanentSave(apiKey) {
        FluentUI.Dialog({
            type: 'warning',
            title: this._fingoText('settings.fingo-perm-save-title', 'Save API Key Permanently', 'Save API Key Permanently'),
            content: this._fingoText('settings.fingo-perm-save-content', 'Permanent API Key storage carries risks. Encrypted storage is recommended.', 'Permanent API Key storage carries risks. Encrypted storage is recommended.'),
            buttons: [
                { text: this._fingoText('cancel', 'Cancel', 'Cancel'), variant: 'secondary', value: 'cancel' },
                { text: this._fingoText('settings.fingo-perm-save-plain', 'Save as Plain Text', 'Save as Plain Text'), variant: 'danger', value: 'plain' },
                { text: this._fingoText('settings.fingo-perm-save-encrypted', 'Use WebCrypto Encryption', 'Use WebCrypto Encryption'), variant: 'primary', value: 'encrypted' }
            ],
            onClose: async (result) => {
                if (result === 'plain') {
                    if (typeof Fingo !== 'undefined' && typeof Fingo.saveApiKeyPermanentPlain === 'function') {
                        Fingo.saveApiKeyPermanentPlain(apiKey);
                    } else if (State && typeof State.updateSettings === 'function') {
                        State.updateSettings({ fingoApiKey: apiKey, fingoApiEncrypted: null, fingoApiStorageType: 'permanent-plain' });
                    }
                    FluentUI.Toast({
                        title: this._fingoText('settings.fingo', 'Fingo AI', 'Fingo AI'),
                        message: this._fingoText('settings.fingo-perm-plain-saved', 'API Key saved permanently as plain text.', 'API Key saved permanently as plain text.'),
                        type: 'warning'
                    });
                    this._renderFingoSettingsPanel();
                    return;
                }

                if (result !== 'encrypted') return;

                const passphrase = await this._promptOobeFingoEncryptPassphrase();
                if (!passphrase) return;

                try {
                    if (typeof Fingo !== 'undefined' && typeof Fingo.saveApiKeyPermanentEncrypted === 'function') {
                        await Fingo.saveApiKeyPermanentEncrypted(apiKey, passphrase);
                    } else {
                        throw new Error(this._fingoText('settings.fingo-webcrypto-unavailable', 'WebCrypto is unavailable.', 'WebCrypto is unavailable.'));
                    }
                    FluentUI.Toast({
                        title: this._fingoText('settings.fingo', 'Fingo AI', 'Fingo AI'),
                        message: this._fingoText('settings.fingo-perm-encrypted-saved', 'API Key saved with encryption.', 'API Key saved with encryption.'),
                        type: 'success'
                    });
                    this._renderFingoSettingsPanel();
                } catch (error) {
                    FluentUI.Toast({
                        title: this._fingoText('settings.fingo', 'Fingo AI', 'Fingo AI'),
                        message: error?.message || this._fingoText('settings.fingo-webcrypto-unavailable', 'WebCrypto is unavailable.', 'WebCrypto is unavailable.'),
                        type: 'error'
                    });
                }
            }
        });
    },

    _applySelections() {
        const { fallbackName, fallbackEmail } = this._getProfileFallbacks();
        const name = String(this.selectedUserName || '').trim();
        const email = String(this.selectedUserEmail || '').trim();
        const avatar = String(this.selectedUserAvatar || '').trim() || 'Theme/Profile_img/UserAva.png';

        const updates = {
            theme: this.selectedTheme,
            autoEnterFullscreen: this.selectedAutoFullscreen,
            fingoCustomMode: this.selectedFingoMode === 'custom',
            userName: name || fallbackName,
            userEmail: this._isValidEmail(email) ? email : fallbackEmail,
            userAvatar: avatar
        };

        const pinInput = document.getElementById('oobe-pin-input');
        const pin = pinInput ? String(pinInput.value || '').trim() : '';
        if (pin && pin.length >= 4 && pin.length <= 10) {
            updates.pin = pin;
        }

        if (State && typeof State.updateSettings === 'function') {
            State.updateSettings(updates);
        }

        if (this.selectedLang && I18n && typeof I18n.setLanguage === 'function') {
            I18n.setLanguage(this.selectedLang);
        }
    },

    _resetTempFingoChat() {
        if (this.fingoMessagesEl) {
            this.fingoMessagesEl.innerHTML = '';
        }
        if (this.fingoHistoryEl) {
            this.fingoHistoryEl.innerHTML = '';
        }
        if (this.fingoPreviewContentEl) {
            this.fingoPreviewContentEl.classList.remove('fingo-expanding', 'fingo-collapsing');
            this.fingoPreviewContentEl.classList.add('fingo-empty');
        }
        this.fingoInputOnlyMode = true;
        this.tempFingoPendingAction = null;
        this.oobeForceRestarting = false;
        if (this.fingoInputEl) {
            this.fingoInputEl.value = '';
            this.fingoInputEl.placeholder = this._dict().fingoInputPlaceholder;
        }
    },

    _enterTempFingoConversation() {
        if (!this.fingoPreviewContentEl || !this.fingoInputOnlyMode) return;
        this.fingoInputOnlyMode = false;
        this.fingoPreviewContentEl.classList.remove('fingo-empty');

        if (this.fingoMessagesEl && !this.fingoMessagesEl.children.length) {
            this._appendTempFingoMessage(this._dict().fingoWelcome, 'bot');
        }
    },

    _appendTempFingoMessage(text, type) {
        if (!this.fingoMessagesEl || !text) return;
        const normalizedType = type === 'user' ? 'user' : 'bot';
        let msg = null;

        if (typeof Fingo !== 'undefined' && Fingo && typeof Fingo._createMessageElement === 'function') {
            try {
                msg = Fingo._createMessageElement.call(Fingo, text, normalizedType);
            } catch (_) {
                msg = null;
            }
        }

        if (!msg) {
            msg = document.createElement('div');
            msg.className = `fingo-msg fingo-msg-${normalizedType}`;
            const textEl = document.createElement('div');
            textEl.className = 'fingo-msg-text';
            textEl.textContent = String(text);
            msg.appendChild(textEl);
        }

        this.fingoMessagesEl.appendChild(msg);
        this.fingoMessagesEl.scrollTop = this.fingoMessagesEl.scrollHeight;
    },

    _collectTempFingoHistory(limit = 8) {
        if (!this.fingoMessagesEl) return [];
        const nodes = Array.from(this.fingoMessagesEl.querySelectorAll('.fingo-msg'));
        const messages = [];

        nodes.forEach((node) => {
            const textEl = node.querySelector('.fingo-msg-text');
            const content = String(textEl?.textContent || '').trim();
            if (!content) return;
            const role = node.classList.contains('fingo-msg-user') ? 'user' : 'assistant';
            messages.push({ role, content });
        });

        if (!messages.length) return [];
        return messages.slice(-Math.max(0, limit));
    },

    /** Blocked OOBE command keys — these require the full system. */
    _OOBE_BLOCKED_COMMANDS: ['openApp', 'install', 'uninstall', 'repair'],

    async _buildTempFingoReply(rawText) {
        const text = String(rawText || '').trim();
        if (!text) return this._dict().fingoFallback;

        if (this._isOobeForceRestartIntent(text)) {
            this.tempFingoPendingAction = null;
            this._triggerOobeForceRestart();
            return this._langCode() === 'zh'
                ? '已触发彩蛋：正在强制重启，系统将再次进入 OOBE。'
                : 'Easter egg triggered: forcing restart. The system will enter OOBE again.';
        }

        const pendingReply = this._handleTempFingoPending(text);
        if (typeof pendingReply === 'string' && pendingReply.trim()) {
            return pendingReply;
        }

        const useCustomApi = this.selectedFingoMode === 'custom' || State?.settings?.fingoCustomMode === true;
        if (useCustomApi && typeof Fingo !== 'undefined' && Fingo) {
            if (State?.settings?.strictCspEnabled !== true) {
                return this._langCode() === 'zh'
                    ? '启用自定义 API 前，请先开启「禁用内联脚本」。'
                    : 'Enable "Disable Inline Scripts" before using custom API mode.';
            }

            try {
                const apiKey = typeof Fingo.getApiKeyForRequest === 'function'
                    ? await Fingo.getApiKeyForRequest()
                    : null;
                if (!apiKey) {
                    return this._langCode() === 'zh'
                        ? 'API 错误，请检查 API Key 是否正确。请先在 Fingo AI 设置中填写有效 Key。'
                        : 'API error, please check your API Key. Set a valid key in Fingo AI settings first.';
                }

                if (typeof Fingo.requestCustomApiReply === 'function') {
                    const history = this._collectTempFingoHistory(8);
                    if (history.length > 0) {
                        const last = history[history.length - 1];
                        if (last.role === 'user' && last.content === text) {
                            history.pop();
                        }
                    }
                    const reply = await Fingo.requestCustomApiReply(text, apiKey, {
                        history,
                        lang: this._langCode()
                    });
                    if (typeof reply === 'string' && reply.trim()) {
                        return reply;
                    }
                }
            } catch (error) {
                const fallback = this._langCode() === 'zh'
                    ? 'API 调用失败，请检查网络和 Key 配置。'
                    : 'API request failed, please check your network and API key.';
                return error?.message ? `${fallback}\n(${error.message})` : fallback;
            }
        }

        if (typeof Fingo !== 'undefined' && Fingo && typeof Fingo.buildPreviewReply === 'function') {
            try {
                const fallbackText = this._resolveFingoPayload(typeof FingoData !== 'undefined' ? FingoData.fallback : null)
                    || this._dict().fingoFallback;
                return Fingo.buildPreviewReply(text, {
                    lang: this._langCode(),
                    blockedKeys: this._OOBE_BLOCKED_COMMANDS,
                    blockedText: this._dict().fingoOobeBlocked,
                    fallbackText,
                    onAction: (action) => this._applyPreviewActionFromCommand(action)
                });
            } catch (_) {
                // fallback to local resolver below
            }
        }

        const commands = (typeof FingoData !== 'undefined' && FingoData && FingoData.commands)
            ? FingoData.commands
            : null;
        if (!commands) return this._dict().fingoFallback;

        const lower = text.toLowerCase();
        const normalized = this._normalizeFingoText(lower);
        const compact = this._compactFingoText(normalized);

        const keys = Object.keys(commands);
        for (const key of keys) {
            const cmd = commands[key];
            if (!cmd || !Array.isArray(cmd.keywords)) continue;
            for (const kw of cmd.keywords) {
                if (!this._fingoKeywordMatched(lower, normalized, compact, kw)) continue;

                /* Block certain commands in OOBE */
                if (this._OOBE_BLOCKED_COMMANDS.includes(key)) {
                    return this._dict().fingoOobeBlocked;
                }

                this._applyPreviewActionFromCommand(cmd.action);
                let reply = this._resolveFingoPayload(cmd.response);

                if ((!reply || !reply.trim()) && key === 'openApp') {
                    reply = this._resolveFingoPayload(cmd.responseNotFound) || this._dict().fingoFallback;
                }

                if (reply && reply.includes('{app}')) {
                    const appName = this._extractFingoAppName(text, cmd.keywords);
                    reply = reply.replace(/\{app\}/g, appName || 'App');
                }

                return reply || this._dict().fingoFallback;
            }
        }

        /* Try real Fingo AI if available and API key is set */
        if (typeof Fingo !== 'undefined' && Fingo && typeof Fingo.processInput === 'function') {
            try {
                const hasKey = Fingo.getSessionApiKey && Fingo.getSessionApiKey();
                if (hasKey) {
                    const result = await Fingo.processInput(text);
                    if (result && typeof result === 'string' && result.trim()) {
                        return result;
                    }
                }
            } catch (_) { /* fall through */ }
        }

        return this._resolveFingoPayload(typeof FingoData !== 'undefined' ? FingoData.fallback : null) || this._dict().fingoFallback;
    },

    _matchTempConfirmIntent(text) {
        const lower = String(text || '').toLowerCase();
        const yesWords = Array.isArray(FingoData?.confirmYes) ? FingoData.confirmYes : ['是', 'yes', 'ok', 'confirm'];
        const noWords = Array.isArray(FingoData?.confirmNo) ? FingoData.confirmNo : ['否', '不', 'no', 'cancel'];
        const isYes = yesWords.some((w) => lower.includes(String(w || '').toLowerCase()));
        const isNo = noWords.some((w) => lower.includes(String(w || '').toLowerCase()));
        return { isYes, isNo };
    },

    _handleTempFingoPending(text) {
        const pa = this.tempFingoPendingAction;
        if (!pa || !pa.type) return null;

        const { isYes, isNo } = this._matchTempConfirmIntent(text);
        if (!isYes && !isNo) {
            if (pa.type === 'offerQuickStart') {
                // Greeting suggestion is optional; continue with normal intent parsing.
                this.tempFingoPendingAction = null;
                return null;
            }
            return this._langCode() === 'zh' ? '请回答「是」或「否」。' : 'Please answer "yes" or "no".';
        }

        this.tempFingoPendingAction = null;

        if (isNo) {
            return this._langCode() === 'zh'
                ? '好的，已取消操作。'
                : 'OK, operation cancelled.';
        }

        if (pa.type === 'offerQuickStart') {
            return this._langCode() === 'zh'
                ? '太好了，给你一份超快上手指南：\n1. 按 Alt 打开开始菜单\n2. 按 Alt+I 打开设置\n3. 按 Alt+W 打开任务视图\n4. 想固定应用到任务栏：在开始菜单中右键应用，选「固定到任务栏」\n\n你也可以直接问我：「怎么分屏」「怎么切换语言」「怎么安装应用」。'
                : 'Great. Here is a quick-start guide:\n1. Press Alt to open Start Menu\n2. Press Alt+I to open Settings\n3. Press Alt+W to open Task View\n4. To pin an app: right-click it in Start Menu, then choose "Pin to taskbar"\n\nYou can also ask me directly: "how to snap windows", "how to change language", or "how to install apps".';
        }

        if (pa.type === 'disableAutoFullscreen') {
            this.selectedAutoFullscreen = false;
            this._setChipGroupActive('#oobe-auto-fullscreen-group .oobe-chip', (btn) => (btn.dataset.autoFullscreen !== 'false') === this.selectedAutoFullscreen);
            return this._langCode() === 'zh'
                ? '已关闭开机自动网页全屏。'
                : 'Auto web fullscreen on boot is now disabled.';
        }

        return null;
    },

    _isOobeForceRestartIntent(text) {
        const lower = String(text || '').toLowerCase();
        const normalized = this._normalizeFingoText(lower);
        const compact = this._compactFingoText(normalized);
        const keywords = [
            '强制退出/关闭oobe',
            '强制退出或关闭oobe',
            '强制退出oobe',
            '强制关闭oobe',
            '关闭oobe',
            '退出oobe',
            '强制退出引导',
            '强制关闭引导',
            '关闭新手引导',
            '退出新手引导',
            'force exit oobe',
            'force close oobe',
            'force quit oobe',
            'close oobe',
            'exit oobe',
            'quit oobe',
            'restart oobe'
        ];

        return keywords.some((kw) => this._fingoKeywordMatched(lower, normalized, compact, kw));
    },

    _triggerOobeForceRestart() {
        if (this.oobeForceRestarting) return;
        this.oobeForceRestarting = true;
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (_) {
            // ignore storage errors
        }

        setTimeout(() => {
            if (State && typeof State.restart === 'function') {
                State.restart();
            } else {
                window.location.reload();
            }
        }, 320);
    },

    _applyPreviewActionFromCommand(action) {
        if (typeof action !== 'string') return;

        if (action === 'offerQuickStart') {
            this.tempFingoPendingAction = { type: 'offerQuickStart' };
            return;
        }

        if (action === 'setTheme:dark') {
            this.selectedTheme = 'dark';
            this._setChipGroupActive('#oobe-theme-group .oobe-chip', (btn) => (btn.dataset.theme || 'light') === 'dark');
            this._syncDesktopPreviewState();
            return;
        }

        if (action === 'setTheme:light') {
            this.selectedTheme = 'light';
            this._setChipGroupActive('#oobe-theme-group .oobe-chip', (btn) => (btn.dataset.theme || 'light') === 'light');
            this._syncDesktopPreviewState();
            return;
        }

        if (action === 'setTheme:auto') {
            const hour = new Date().getHours();
            this.selectedTheme = (hour >= 18 || hour < 6) ? 'dark' : 'light';
            this._setChipGroupActive('#oobe-theme-group .oobe-chip', (btn) => (btn.dataset.theme || 'light') === this.selectedTheme);
            this._syncDesktopPreviewState();
            return;
        }

        if (action === 'confirmAutoFullscreen:disable') {
            this.tempFingoPendingAction = { type: 'disableAutoFullscreen' };
            return;
        }

        if (action === 'setAutoFullscreen:false') {
            this.selectedAutoFullscreen = false;
            this._setChipGroupActive('#oobe-auto-fullscreen-group .oobe-chip', (btn) => (btn.dataset.autoFullscreen !== 'false') === this.selectedAutoFullscreen);
            return;
        }

        if (action === 'setAutoFullscreen:true') {
            this.selectedAutoFullscreen = true;
            this._setChipGroupActive('#oobe-auto-fullscreen-group .oobe-chip', (btn) => (btn.dataset.autoFullscreen !== 'false') === this.selectedAutoFullscreen);
            return;
        }

        if (action === 'openSettings:time-language') {
            this._setStep(1);
            return;
        }

        if (action === 'openSettings:fingo') {
            this._setStep(3);
            return;
        }

        if (action === 'openSettings:privacy') {
            this._setStep(4);
        }
    },

    _resolveFingoPayload(payload) {
        if (!payload) return '';

        if (typeof Fingo !== 'undefined' && Fingo && typeof Fingo._resolveResponse === 'function') {
            try {
                const text = Fingo._resolveResponse.call(Fingo, payload);
                if (typeof text === 'string' && text.trim()) {
                    return text;
                }
            } catch (_) {
                // fallback to local resolver
            }
        }

        const lang = this._langCode();
        if (typeof payload === 'string') return payload;
        if (Array.isArray(payload)) {
            if (!payload.length) return '';
            return payload[Math.floor(Math.random() * payload.length)] || '';
        }
        if (typeof payload === 'object') {
            const localized = payload[lang] ?? payload.zh ?? payload.en ?? '';
            if (Array.isArray(localized)) {
                if (!localized.length) return '';
                return localized[Math.floor(Math.random() * localized.length)] || '';
            }
            if (typeof localized === 'string') return localized;
        }
        return '';
    },

    _extractFingoAppName(text, keywords) {
        let content = String(text || '');
        const sortedKeywords = Array.isArray(keywords)
            ? [...keywords].sort((a, b) => String(b).length - String(a).length)
            : [];

        for (const kw of sortedKeywords) {
            const idx = content.toLowerCase().indexOf(String(kw).toLowerCase());
            if (idx >= 0) {
                content = `${content.slice(0, idx)} ${content.slice(idx + String(kw).length)}`;
                break;
            }
        }

        const app = content.replace(/[.,!?，。！？]/g, ' ').trim();
        return app || (this._langCode() === 'zh' ? '应用' : 'app');
    },

    _normalizeFingoText(text) {
        if (typeof Fingo !== 'undefined' && Fingo && typeof Fingo._normalizeInputText === 'function') {
            try {
                return Fingo._normalizeInputText.call(Fingo, text);
            } catch (_) {
                return text;
            }
        }
        return text;
    },

    _compactFingoText(text) {
        const punctRegex = /[\s.,!?，。！？:;；：“”"'`~()\[\]{}<>《》、/\\|_-]+/g;
        if (typeof Fingo !== 'undefined' && Fingo && typeof Fingo._compactText === 'function') {
            try {
                return Fingo._compactText.call(Fingo, text);
            } catch (_) {
                return String(text || '').replace(punctRegex, '');
            }
        }
        return String(text || '').replace(punctRegex, '');
    },

    _fingoKeywordMatched(lower, normalized, compact, keyword) {
        if (typeof Fingo !== 'undefined' && Fingo && typeof Fingo._keywordMatched === 'function') {
            try {
                return Fingo._keywordMatched.call(Fingo, lower, normalized, compact, keyword);
            } catch (_) {
                // fallback below
            }
        }
        const kw = String(keyword || '').toLowerCase().trim();
        if (!kw) return false;
        const compactKw = kw.replace(/[\s.,!?，。！？:;；：“”"'`~()\[\]{}<>《》、/\\|_-]+/g, '');
        return lower.includes(kw) || normalized.includes(kw) || compact.includes(compactKw);
    },

    _refreshTexts() {
        if (!this.element) return;
        const d = this._dict();

        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        setText('oobe-title-language', d.languageTitle);
        setText('oobe-subtitle-language', d.languageSubtitle);
        setText('oobe-title-theme', d.themePageTitle);
        setText('oobe-subtitle-theme', d.themePageSubtitle);
        setText('oobe-theme-title', d.themeTitle);
        setText('oobe-auto-fullscreen-title', d.autoFullscreenTitle);
        setText('oobe-auto-fullscreen-desc', d.autoFullscreenDesc);
        setText('oobe-title-fingo', d.fingoPageTitle);
        setText('oobe-subtitle-fingo', d.fingoPageSubtitle);
        setText('oobe-fingo-title', this._fingoText('settings.fingo-title', 'Fingo AI', 'Fingo AI'));
        setText('oobe-title-user', d.userPageTitle);
        setText('oobe-subtitle-user', d.userPageSubtitle);
        setText('oobe-user-avatar-title', d.userAvatarTitle);
        setText('oobe-user-name-title', d.userNameTitle);
        setText('oobe-user-email-title', d.userEmailTitle);
        setText('oobe-title-password', d.passwordPageTitle);
        setText('oobe-subtitle-password', d.passwordPageSubtitle);
        setText('oobe-pin-title', d.pinTitle);

        const pinInput = document.getElementById('oobe-pin-input');
        if (pinInput) pinInput.placeholder = d.pinPlaceholder;
        if (this.userNameInputEl) this.userNameInputEl.placeholder = d.userNamePlaceholder;
        if (this.userEmailInputEl) this.userEmailInputEl.placeholder = d.userEmailPlaceholder;
        if (this.userAvatarUploadBtnEl) this.userAvatarUploadBtnEl.textContent = d.userUploadAvatar;
        if (this.userAvatarResetBtnEl) this.userAvatarResetBtnEl.textContent = d.userResetAvatar;

        const langZhTitle = this.element.querySelector('[data-lang="zh"] .oobe-option-title');
        const langZhDesc = this.element.querySelector('[data-lang="zh"] .oobe-option-desc');
        const langEnTitle = this.element.querySelector('[data-lang="en"] .oobe-option-title');
        const langEnDesc = this.element.querySelector('[data-lang="en"] .oobe-option-desc');
        if (langZhTitle) langZhTitle.textContent = d.langZhTitle;
        if (langZhDesc) langZhDesc.textContent = d.langZhDesc;
        if (langEnTitle) langEnTitle.textContent = d.langEnTitle;
        if (langEnDesc) langEnDesc.textContent = d.langEnDesc;

        const themeLight = this.element.querySelector('#oobe-theme-group [data-theme="light"]');
        const themeDark = this.element.querySelector('#oobe-theme-group [data-theme="dark"]');
        if (themeLight) themeLight.textContent = d.themeLight;
        if (themeDark) themeDark.textContent = d.themeDark;
        const autoFullscreenOn = this.element.querySelector('#oobe-auto-fullscreen-group [data-auto-fullscreen="true"]');
        const autoFullscreenOff = this.element.querySelector('#oobe-auto-fullscreen-group [data-auto-fullscreen="false"]');
        if (autoFullscreenOn) autoFullscreenOn.textContent = d.autoFullscreenOn;
        if (autoFullscreenOff) autoFullscreenOff.textContent = d.autoFullscreenOff;

        const next0 = document.getElementById('oobe-next-0');
        const next1 = document.getElementById('oobe-next-1');
        const back1 = document.getElementById('oobe-back-1');
        const next2 = document.getElementById('oobe-next-2');
        const next3 = document.getElementById('oobe-next-3');
        const next4 = document.getElementById('oobe-next-4');
        const back2 = document.getElementById('oobe-back-2');
        const back3 = document.getElementById('oobe-back-3');
        const back4 = document.getElementById('oobe-back-4');
        const back5 = document.getElementById('oobe-back-5');
        const finish = document.getElementById('oobe-finish');

        if (next0) next0.textContent = d.welcomeNext;
        if (next1) next1.textContent = d.next;
        if (back1) back1.textContent = d.back;
        if (next2) next2.textContent = d.next;
        if (next3) next3.textContent = d.next;
        if (next4) next4.textContent = d.next;
        if (back2) back2.textContent = d.back;
        if (back3) back3.textContent = d.back;
        if (back4) back4.textContent = d.back;
        if (back5) back5.textContent = d.back;
        if (finish) finish.textContent = d.finish;

        if (this.fingoInputEl) {
            this.fingoInputEl.placeholder = d.fingoInputPlaceholder;
        }

        this.element.querySelectorAll('.oobe-live-login-card .login-submit').forEach((btn) => {
            btn.textContent = d.previewLogin;
        });

        this._renderFingoSettingsPanel();
        this._syncUserStepState();
        this._syncLockPreviewProfile();
        this._syncDesktopPreviewState();
        this._updatePreloadStatusText();
    },

    _markCompleted() {
        try {
            localStorage.setItem(this.STORAGE_KEY, Date.now().toString());
        } catch (_) {
            // ignore
        }
    },

    _langCode() {
        return this.selectedLang || State?.settings?.language || 'zh';
    },

    _dict() {
        const lang = this._langCode();
        const base = lang === 'en'
            ? {
                userPageTitle: 'User',
                userPageSubtitle: 'Set avatar, user name and email. The lock preview above updates in real time.',
                userAvatarTitle: 'Avatar',
                userUploadAvatar: 'Upload Custom Avatar',
                userResetAvatar: 'Restore Default Avatar',
                userNameTitle: 'User Name',
                userNamePlaceholder: 'Enter user name',
                userEmailTitle: 'Email',
                userEmailPlaceholder: 'Enter email',
                userNameRequired: 'User name cannot be empty.',
                userEmailInvalid: 'Invalid email format.'
            }
            : {
                userPageTitle: '\u7528\u6237',
                userPageSubtitle: '\u8bbe\u7f6e\u5934\u50cf\u3001\u7528\u6237\u540d\u548c\u90ae\u7bb1\uff0c\u4e0a\u65b9\u9501\u5c4f\u9884\u89c8\u4f1a\u5b9e\u65f6\u540c\u6b65\u3002',
                userAvatarTitle: '\u5934\u50cf',
                userUploadAvatar: '\u4e0a\u4f20\u81ea\u5b9a\u4e49\u5934\u50cf',
                userResetAvatar: '\u6062\u590d\u9ed8\u8ba4\u5934\u50cf',
                userNameTitle: '\u7528\u6237\u540d',
                userNamePlaceholder: '\u8bf7\u8f93\u5165\u7528\u6237\u540d',
                userEmailTitle: '\u90ae\u7bb1',
                userEmailPlaceholder: '\u8bf7\u8f93\u5165\u90ae\u7bb1',
                userNameRequired: '\u7528\u6237\u540d\u4e0d\u80fd\u4e3a\u7a7a',
                userEmailInvalid: '\u90ae\u7bb1\u683c\u5f0f\u4e0d\u6b63\u786e'
            };
        return { ...base, ...(this.i18n[lang] || this.i18n.zh) };
    },

    /* ===== Welcome animation (Step 0) ===== */

    _startWelcomeAnimationFromBootLogo(bootLogoEl) {
        if (!this.welcomeLogoEl || !bootLogoEl || typeof bootLogoEl.getBoundingClientRect !== 'function') {
            this._startWelcomeAnimation();
            return;
        }

        const startRect = bootLogoEl.getBoundingClientRect();
        if (!startRect.width || !startRect.height) {
            this._startWelcomeAnimation();
            return;
        }

        this.bridgeBootLogoEl = bootLogoEl;
        this.bridgeBootLogoEl.style.opacity = '0';
        this.bridgeBootLogoEl.style.visibility = 'hidden';

        this._clearWelcomeLogoBridge();
        this.welcomeLogoEl.classList.remove('oobe-logo-bridged', 'oobe-welcome-logo-up');
        this.welcomeLogoEl.classList.add('oobe-logo-bridging');
        this.welcomeLogoEl.classList.add('oobe-logo-bridge-target', 'oobe-welcome-logo-up');
        const targetRect = this.welcomeLogoEl.getBoundingClientRect();
        this.welcomeLogoEl.classList.remove('oobe-logo-bridge-target', 'oobe-welcome-logo-up');

        if (!targetRect.width || !targetRect.height) {
            this._startWelcomeAnimation();
            return;
        }

        const bridge = document.createElement('img');
        bridge.className = 'oobe-logo-bridge';
        bridge.src = bootLogoEl.currentSrc || bootLogoEl.src || this.welcomeLogoEl.currentSrc || this.welcomeLogoEl.src;
        bridge.alt = 'Fluent OS';
        bridge.style.left = `${startRect.left}px`;
        bridge.style.top = `${startRect.top}px`;
        bridge.style.width = `${startRect.width}px`;
        bridge.style.height = `${startRect.height}px`;
        document.body.appendChild(bridge);
        this.logoBridgeEl = bridge;

        const animation = bridge.animate([
            {
                left: `${startRect.left}px`,
                top: `${startRect.top}px`,
                width: `${startRect.width}px`,
                height: `${startRect.height}px`,
                opacity: 1
            },
            {
                left: `${targetRect.left}px`,
                top: `${targetRect.top}px`,
                width: `${targetRect.width}px`,
                height: `${targetRect.height}px`,
                opacity: 1
            }
        ], {
            delay: 1100,
            duration: 780,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'forwards'
        });

        const onDone = () => {
            this._clearWelcomeLogoBridge();
            if (this.currentStep !== 0) return;
            if (this.welcomeLogoEl) {
                this.welcomeLogoEl.classList.remove('oobe-logo-bridging');
                this.welcomeLogoEl.classList.add('oobe-logo-bridged', 'oobe-welcome-logo-up');
            }
            this._startWelcomeAnimation(true);
        };

        if (animation && animation.finished && typeof animation.finished.then === 'function') {
            animation.finished.then(onDone).catch(onDone);
        } else {
            this.logoBridgeTimer = setTimeout(onDone, 1910);
        }
    },

    _clearWelcomeLogoBridge() {
        if (this.logoBridgeTimer) {
            clearTimeout(this.logoBridgeTimer);
            this.logoBridgeTimer = null;
        }
        if (this.logoBridgeEl && this.logoBridgeEl.parentNode) {
            this.logoBridgeEl.parentNode.removeChild(this.logoBridgeEl);
        }
        this.logoBridgeEl = null;
        this.bridgeBootLogoEl = null;
        if (this.welcomeLogoEl) {
            this.welcomeLogoEl.classList.remove('oobe-logo-bridge-target', 'oobe-logo-bridging');
        }
    },

    _startWelcomeAnimation(fromBridge = false) {
        this._stopWelcomeAnimation();
        this.welcomeAnimStarted = false;
        this.welcomeTextIndex = 0;

        /* Hide next button initially */
        if (this.welcomeNextEl) {
            this.welcomeNextEl.classList.add('hidden');
        }

        /* Phase 1: logo animates in (CSS handles initial positioning) */
        if (this.welcomeLogoEl) {
            this.welcomeLogoEl.classList.remove('oobe-logo-bridging');
            if (!fromBridge) {
                this.welcomeLogoEl.classList.remove('oobe-welcome-logo-up');
            }
            this.welcomeLogoEl.classList.toggle('oobe-logo-bridged', fromBridge);
        }
        if (this.welcomeTextEl) {
            this.welcomeTextEl.innerHTML = '';
            this.welcomeTextEl.classList.remove('oobe-welcome-text-show');
        }

        const logoDelay = fromBridge ? 0 : 800;
        const textDelay = fromBridge ? 260 : 500;

        /* After logo settle, move logo up and start text cycle */
        this.welcomePhaseTimer = setTimeout(() => {
            if (this.currentStep !== 0) return;
            if (this.welcomeLogoEl && !fromBridge) {
                this.welcomeLogoEl.classList.add('oobe-welcome-logo-up');
            }
            /* After logo transition, show first text */
            this.welcomeLogoTextTimer = setTimeout(() => {
                if (this.currentStep !== 0) return;
                this._cycleWelcomeText();
            }, textDelay);
        }, logoDelay);
    },

    _cycleWelcomeText() {
        if (!this.welcomeTextEl || this.currentStep !== 0) return;

        const text = this.welcomeTexts[this.welcomeTextIndex % this.welcomeTexts.length];

        /* Build letter spans for Q-bounce animation */
        this.welcomeTextEl.innerHTML = '';
        this.welcomeTextEl.classList.add('oobe-welcome-text-show');

        const chars = text.split('');
        chars.forEach((char, i) => {
            const span = document.createElement('span');
            span.className = 'oobe-welcome-letter';
            span.textContent = char;
            span.style.animationDelay = `${i * 60}ms`;
            this.welcomeTextEl.appendChild(span);
        });

        /* Show next button on first text */
        if (!this.welcomeAnimStarted && this.welcomeNextEl) {
            this.welcomeAnimStarted = true;
            setTimeout(() => {
                if (this.welcomeNextEl) this.welcomeNextEl.classList.remove('hidden');
            }, 600);
        }

        /* After 4s, bounce out current text then show next */
        this.welcomeAnimTimer = setTimeout(() => {
            if (this.currentStep !== 0) return;
            /* Bounce out */
            const letters = this.welcomeTextEl.querySelectorAll('.oobe-welcome-letter');
            letters.forEach((l, i) => {
                l.classList.add('oobe-welcome-letter-out');
                l.style.animationDelay = `${i * 40}ms`;
            });

            /* After out animation, cycle to next */
            setTimeout(() => {
                this.welcomeTextIndex++;
                this._cycleWelcomeText();
            }, chars.length * 40 + 300);
        }, 4000);
    },

    _stopWelcomeAnimation() {
        if (this.welcomeAnimTimer) {
            clearTimeout(this.welcomeAnimTimer);
            this.welcomeAnimTimer = null;
        }
        if (this.welcomePhaseTimer) {
            clearTimeout(this.welcomePhaseTimer);
            this.welcomePhaseTimer = null;
        }
        if (this.welcomeLogoTextTimer) {
            clearTimeout(this.welcomeLogoTextTimer);
            this.welcomeLogoTextTimer = null;
        }
        this._clearWelcomeLogoBridge();
    },

    /* ===== Language preview text sync ===== */

    _syncLangPreviewText() {
        if (!this.langPreviewTextEl) return;
        const lang = this.selectedLang || 'zh';
        this.langPreviewTextEl.textContent = lang === 'zh' ? '简体' : 'Aa';
    }
};

