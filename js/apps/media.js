/**
 * Built-in multimedia player.
 * Supports local audio/video files and folder imports.
 */
const MediaApp = {
    windowId: null,
    container: null,
    frame: null,
    audioTypes: new Set(['mp3', 'm4a', 'aac', 'ogg', 'oga', 'wav', 'flac', 'opus', 'webm']),
    videoTypes: new Set(['mp4', 'webm', 'ogv', 'mov', 'm4v', 'mkv']),
    library: [],
    currentIndex: -1,
    activeView: 'library',
    searchQuery: '',
    objectUrls: new Set(),
    progressTimer: null,
    isSeeking: false,
    isShuffle: false,
    repeatMode: 'none',
    playbackRate: 1,
    volume: 0.5,
    lastNonZeroVolume: 0.5,
    muted: false,
    playerExpanded: false,
    expandTransitionTimer: null,
    collapseShrinkTimer: null,
    responsiveResizeObserver: null,
    _optionsClickAwayHandler: null,
    _langHandler: null,
    _unsubscribeLanguage: null,
    mediaStorageKey: 'fluentos.media.library.v1',
    playbackStorageKey: 'fluentos.media.playback.v1',
    mediaDbName: 'FluentOSMediaLibrary',
    mediaDbStore: 'files',
    restoreStarted: false,
    restorePromise: null,
    isRestoring: false,
    audioElement: null,
    audioHost: null,
    pendingPlaybackState: null,
    suppressNextPageAnimation: false,
    _lastPlaybackSaveAt: 0,
    gradients: [
        'linear-gradient(135deg, #ff6b35 0%, #ffb347 52%, #ffe1c2 100%)',
        'linear-gradient(135deg, #ff2d55 0%, #ff7aa2 50%, #ffd1dc 100%)',
        'linear-gradient(135deg, #007aff 0%, #5ac8fa 54%, #d8f3ff 100%)',
        'linear-gradient(135deg, #5856d6 0%, #af52de 55%, #ead8ff 100%)',
        'linear-gradient(135deg, #34c759 0%, #9be15d 52%, #e2ffd6 100%)',
        'linear-gradient(135deg, #ffcc00 0%, #ff9500 52%, #fff0b8 100%)',
        'linear-gradient(135deg, #00c7be 0%, #30d5c8 52%, #d7fffb 100%)',
        'linear-gradient(135deg, #5e5ce6 0%, #64d2ff 52%, #e0e7ff 100%)',
        'linear-gradient(135deg, #bf5af2 0%, #ff9f0a 54%, #ffe2b8 100%)',
        'linear-gradient(135deg, #ff375f 0%, #ff453a 52%, #ffd1cc 100%)',
        'linear-gradient(135deg, #30b0c7 0%, #66d4cf 52%, #d8f8f5 100%)',
        'linear-gradient(135deg, #8e8e93 0%, #c7c7cc 54%, #f2f2f7 100%)',
        'linear-gradient(135deg, #0a84ff 0%, #64d2ff 45%, #b7f0ff 100%)',
        'linear-gradient(135deg, #ff9f0a 0%, #ffd60a 45%, #fff7c2 100%)',
        'linear-gradient(135deg, #32d74b 0%, #00c7be 52%, #d7fff2 100%)'
    ],

    init(windowId) {
        this.windowId = windowId || `window-${Date.now()}`;
        this.container = document.getElementById(`${this.windowId}-content`);
        if (!this.container) return;

        this.addStyles();
        this.syncVolumeFromState();
        this.loadPlaybackPreferences();
        this.isRestoring = !this.library.length && this.getLibraryManifest().length > 0;
        this.render();
        this.startProgressLoop();
        void this.restoreLibraryFromStorage();

        if (!this._unsubscribeLanguage && typeof State !== 'undefined' && typeof State.on === 'function') {
            this._langHandler = () => {
                if (!this.container || !this.container.isConnected) return;
                this.refreshLocalizedLibrary();
                this.render();
                if (this.activeItem) this.updateMediaSession(this.activeItem);
            };
            this._unsubscribeLanguage = State.on('languageChange', this._langHandler);
        }
    },

    destroy() {
        const media = this.mediaElement;
        // Audio belongs to the system playback engine and must survive closing
        // the Media window. Video remains window-scoped and stops on close.
        if (media?.tagName === 'VIDEO') media.pause();
        this.stopProgressLoop();
        if (this.responsiveResizeObserver) {
            this.responsiveResizeObserver.disconnect();
            this.responsiveResizeObserver = null;
        }
    },

    beforeClose() {
        this.savePlaybackSnapshot(true);
        this.destroy();
        this._unsubscribeLanguage?.();
        this._unsubscribeLanguage = null;
        this._langHandler = null;
        if (this.frame && typeof this.frame.destroy === 'function') {
            this.frame.destroy();
            this.frame = null;
        }
        this.container = null;
        this.windowId = null;
        return true;
    },

    get activeItem() {
        return this.library[this.currentIndex] || null;
    },

    get mediaElement() {
        const current = this.activeItem;
        if (current?.type === 'audio') {
            return this.audioElement || null;
        }
        if (current?.type === 'video') {
            return this.container?.querySelector('video#media-player-element') || null;
        }

        return this.audioElement || this.container?.querySelector('#media-player-element') || null;
    },

    ensureAudioHost() {
        let host = this.audioHost;
        if (host?.isConnected) return host;
        host = document.getElementById('media-system-audio-host');
        if (!host) {
            host = document.createElement('div');
            host.className = 'media-audio-host';
            host.id = 'media-system-audio-host';
            host.setAttribute('aria-hidden', 'true');
            document.body.appendChild(host);
        }
        this.audioHost = host;
        return host;
    },

    isAudioFile(file) {
        const ext = this.getExt(file.name);
        return (file.type || '').startsWith('audio/') || this.audioTypes.has(ext);
    },

    isVideoFile(file) {
        const ext = this.getExt(file.name);
        return (file.type || '').startsWith('video/') || this.videoTypes.has(ext);
    },

    getExt(name = '') {
        const dot = String(name).lastIndexOf('.');
        return dot >= 0 ? String(name).slice(dot + 1).toLowerCase() : '';
    },

    async fileFromFsNode(node) {
        if (!node || node.type !== 'file') return null;
        if (node.encoding === 'media-local-cache') {
            try {
                const stored = await this.readStoredMedia(node.mediaRecordId || `fs-${node.id}`);
                if (stored?.file instanceof File && stored.file.type) return stored.file;
                if (stored?.file instanceof File) {
                    return new File([stored.file], stored.file.name || node.name || 'audio.mp3', {
                        type: stored.mimeType || node.mime || 'audio/mpeg',
                        lastModified: stored.lastModified || stored.file.lastModified || Date.now()
                    });
                }
                if (stored?.file instanceof Blob) {
                    return new File([stored.file], node.name || 'audio.mp3', {
                        type: stored.mimeType || node.mime || 'audio/mpeg',
                        lastModified: stored.lastModified || Date.now()
                    });
                }
            } catch (_) {}
        }
        const content = String(node.content || '');
        if (!content.startsWith('data:')) return null;
        const comma = content.indexOf(',');
        if (comma < 0) return null;

        const header = content.slice(5, comma);
        const payload = content.slice(comma + 1);
        const mime = (header.split(';')[0] || node.mime || 'audio/mpeg').trim();
        const isBase64 = /;base64(?:;|$)/i.test(`;${header}`);
        let bytes;
        if (isBase64) {
            const binary = atob(payload);
            bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        } else {
            bytes = new TextEncoder().encode(decodeURIComponent(payload));
        }
        return new File([bytes], node.name || 'audio.mp3', {
            type: mime || 'audio/mpeg',
            lastModified: node.modified ? Date.parse(node.modified) || Date.now() : Date.now()
        });
    },

    async loadFile(fileId) {
        const node = typeof State !== 'undefined' && State.findNode ? State.findNode(fileId) : null;
        if (!node || node.type !== 'file' || this.getExt(node.name) !== 'mp3') return false;

        await this.ensureLibraryReady();
        const stableId = `fs-${node.id}`;
        const existing = this.library.find((item) => item.id === stableId || item.sourceNodeId === node.id);
        if (existing) {
            await this.playItemById(existing.id);
            return true;
        }

        const file = await this.fileFromFsNode(node);
        if (!file) return false;
        const item = await this.createMediaItem(file);
        item.id = stableId;
        item.sourceNodeId = node.id;
        this.library.push(item);
        this.currentIndex = this.library.length - 1;
        this.activeView = 'now';
        this.persistMediaItem(item);
        this.saveLibraryManifest();
        this.render();
        await this.playItemById(item.id);
        return true;
    },

    isFileOpen(fileId) {
        const item = this.activeItem;
        return !!fileId && !!item && (item.sourceNodeId === fileId || item.id === `fs-${fileId}`);
    },

    releaseFiles(fileIds) {
        const ids = new Set(Array.from(fileIds || []));
        if (!ids.size) return;
        const shouldRemove = (item) => ids.has(item?.sourceNodeId) || ids.has(String(item?.id || '').replace(/^fs-/, ''));
        const active = this.activeItem;
        if (active && shouldRemove(active)) {
            const media = this.mediaElement;
            if (media) {
                media.pause();
                media.removeAttribute('src');
                media.load();
            }
            if (this.audioElement === media) this.audioElement = null;
        }
        this.library.filter(shouldRemove).forEach((item) => {
            if (!item?.url) return;
            try { URL.revokeObjectURL(item.url); } catch (_) {}
            this.objectUrls.delete(item.url);
        });
        this.library = this.library.filter((item) => !shouldRemove(item));
        this.currentIndex = this.library.length ? Math.min(this.currentIndex, this.library.length - 1) : -1;
        this.saveLibraryManifest();
        this.savePlaybackSnapshot(true);
    },

    getLanguage() {
        const lang = String(
            (typeof I18n !== 'undefined' && I18n.currentLang) ||
            (typeof State !== 'undefined' && State.settings && State.settings.language) ||
            document.documentElement.lang ||
            'zh'
        ).toLowerCase();
        return lang.startsWith('en') ? 'en' : 'zh';
    },

    localText(key) {
        const i18nKey = key === 'app' ? 'media.title' : `media.${key}`;
        if (typeof t === 'function') {
            const translated = t(i18nKey);
            if (translated && translated !== i18nKey) return translated;
        }

        const text = {
            zh: {
                app: '多媒体',
                search: '搜索',
                library: '我的媒体',
                recent: '最近播放的内容',
                now: '正在播放',
                playlist: '播放列表',
                openFiles: '打开文件',
                openFolder: '导入文件夹',
                emptyTitle: '打开本地音乐或视频',
                emptyDesc: '支持单个文件和文件夹导入，音乐会自动读取可用的封面与歌手信息。',
                unsupportedFolder: '当前浏览器不支持直接选择文件夹，请使用文件夹导入兼容模式。',
                noMatch: '没有匹配的媒体',
                unknownArtist: '未知艺术家',
                unknownAlbum: '未知专辑',
                unknownTitle: '未命名媒体',
                audio: '音乐',
                video: '视频',
                all: '全部',
                speed: '倍速',
                volume: '音量',
                fullscreen: '全屏',
                frequent: '高频播放',
                forYou: '猜你喜欢',
                settings: '设置',
                importSong: '导入新的歌曲',
                importFolder: '导入新的文件夹',
                clearLibrary: '清空已导入的歌曲',
                clearLibraryDesc: '移除当前媒体库里保存的所有本地歌曲和视频记录。',
                recommended: '推荐播放',
                recentEmptyTitle: '暂无播放记录',
                recentEmptyDesc: '播放过的音乐和视频会出现在这里。',
                madeForYou: '为你推荐',
                previous: '上一首',
                next: '下一首',
                play: '播放',
                shuffle: '随机播放',
                repeat: '循环播放',
                expand: '展开播放界面',
                collapse: '收起播放界面',
                skipBack: '后退 10 秒',
                skipForward: '前进 10 秒'
            },
            en: {
                app: 'Multimedia',
                search: 'Search',
                library: 'Library',
                recent: 'Recently played',
                now: 'Now playing',
                playlist: 'Playlist',
                openFiles: 'Open files',
                openFolder: 'Import folder',
                emptyTitle: 'Open local music or video',
                emptyDesc: 'Import files or a folder. Music artwork and artist tags are read when available.',
                unsupportedFolder: 'This browser cannot open folders directly. Use the compatible folder picker.',
                noMatch: 'No matching media',
                unknownArtist: 'Unknown artist',
                unknownAlbum: 'Unknown album',
                unknownTitle: 'Untitled media',
                audio: 'Music',
                video: 'Video',
                all: 'All',
                speed: 'Speed',
                volume: 'Volume',
                fullscreen: 'Fullscreen',
                frequent: 'Frequent plays',
                forYou: 'For You',
                settings: 'Settings',
                importSong: 'Import new songs',
                importFolder: 'Import new folder',
                clearLibrary: 'Clear imported songs',
                clearLibraryDesc: 'Remove all imported local songs and videos from the media library.',
                recommended: 'Recommended',
                recentEmptyTitle: 'No playback history yet',
                recentEmptyDesc: 'Music and videos you play will appear here.',
                madeForYou: 'Made for You',
                previous: 'Previous',
                next: 'Next',
                play: 'Play',
                shuffle: 'Shuffle',
                repeat: 'Repeat',
                expand: 'Expand player',
                collapse: 'Collapse player',
                skipBack: 'Back 10 seconds',
                skipForward: 'Forward 10 seconds'
            }
        };
        const lang = this.getLanguage();
        return text[lang]?.[key] || text.zh[key] || key;
    },

    isUnknownArtistLabel(value) {
        const text = String(value || '').trim();
        return text === '未知艺术家' || text === 'Unknown artist';
    },

    getTypeLabel(itemOrType) {
        const type = typeof itemOrType === 'string' ? itemOrType : itemOrType?.type;
        return type === 'video' ? this.localText('video') : this.localText('audio');
    },

    getItemSubtitle(item, fallbackToType = false) {
        if (!item) return fallbackToType ? this.getTypeLabel('audio') : this.localText('unknownArtist');
        const artist = String(item.artist || '').trim();
        if (artist && !this.isUnknownArtistLabel(artist)) return artist;
        if (item.album) return item.album;
        return fallbackToType ? this.getTypeLabel(item) : this.localText('unknownArtist');
    },

    refreshLocalizedLibrary() {
        this.library.forEach((item) => {
            item.typeLabel = this.getTypeLabel(item);
            if (this.isUnknownArtistLabel(item.artist)) item.artist = this.localText('unknownArtist');
        });
    },

    getFrameNavItems() {
        return [
            { id: 'library', label: this.localText('library'), icon: 'Music' },
            { id: 'recent', label: this.localText('recent'), icon: 'Clock' },
            { id: 'now', label: this.localText('now'), icon: 'Media Reel V' },
            { id: 'playlist', label: this.localText('playlist'), icon: 'Playlist' }
        ];
    },

    getFrameFooterItems() {
        return [
            { id: 'settings', label: this.localText('settings'), icon: 'Settings' }
        ];
    },

    getFrameActiveView() {
        return ['recent', 'now', 'playlist', 'settings'].includes(this.activeView) ? this.activeView : 'library';
    },

    render() {
        if (!this.container || !this.container.isConnected) return;
        const initialPlaybackState = this.capturePlaybackState() || this.getPendingPlaybackStateForActiveItem();
        const initialCurrent = this.activeItem;
        const initialPreservedAudio = this.detachReusableAudio(initialCurrent, true);
        let isInitialFrameRender = true;
        this.container.innerHTML = '';
        if (this.frame && typeof this.frame.destroy === 'function') {
            this.frame.destroy();
            this.frame = null;
        }

        if (typeof FluentWindow === 'undefined' || typeof FluentWindow.mount !== 'function') {
            console.error('[MediaApp] FluentWindow framework is not loaded');
            return;
        }

        const renderMediaPage = (view, pageEl) => {
            const pagePlaybackState = isInitialFrameRender ? initialPlaybackState : this.capturePlaybackState();
            const pageCurrentBeforeRender = this.activeItem;
            const pagePreservedAudio = isInitialFrameRender
                ? initialPreservedAudio
                : this.detachReusableAudio(pageCurrentBeforeRender);
            const suppressPageMotion = Boolean(this.suppressNextPageAnimation);
            this.suppressNextPageAnimation = false;

            if (view && view !== this.getFrameActiveView()) {
                if (view === 'now') {
                    if (!this.activeItem && this.library.length) this.currentIndex = 0;
                    this.activeView = 'now';
                    this.playerExpanded = true;
                } else {
                    this.activeView = view;
                }
            }

            const current = this.activeItem;
            const filteredItems = this.getFilteredItems();
            pageEl.classList.add('media-fw-page', 'media-content');
            pageEl.innerHTML = `
                <div class="media-app media-fw-app ${this.playerExpanded ? 'player-expanded' : ''} ${suppressPageMotion ? 'media-suppress-page-motion' : ''}">
                    <main class="media-main media-fw-main">
                        ${this.renderMainContent(filteredItems, current)}
                    </main>

                    ${this.renderExpandedPlayer(current)}

                    <footer class="media-player-bar ${this.library.length ? '' : 'is-hidden'}">
                        <div class="media-now-card" data-action="expand-player">
                            ${this.renderSmallArt(current)}
                            <div>
                                <strong>${this.escapeHtml(current?.title || this.localText('emptyTitle'))}</strong>
                                <span>${this.escapeHtml(this.getItemSubtitle(current, true))}</span>
                            </div>
                        </div>
                        <div class="media-controls">
                            <div class="media-button-row">
                                <button data-action="previous" title="${this.localText('previous')}">${this.symbolIcon('Previous.svg')}</button>
                                <button class="media-play-btn" data-action="play-toggle" title="${this.localText('play')}">${this.symbolIcon('Play.svg')}</button>
                                <button data-action="next" title="${this.localText('next')}">${this.symbolIcon('Next.svg')}</button>
                            </div>
                        </div>
                        <div class="media-options">
                            <button data-action="shuffle" class="${this.isShuffle ? 'active' : ''}" title="${this.localText('shuffle')}">${this.symbolIcon('Exchange A.svg')}</button>
                            <button data-action="expand-player" title="${this.localText('expand')}">${this.symbolIcon('Playlist.svg')}</button>
                        </div>

                        <input class="media-hidden-input" id="media-file-input" type="file" multiple accept="audio/*,video/*">
                        <input class="media-hidden-input" id="media-folder-input" type="file" webkitdirectory multiple accept="audio/*,video/*">
                    </footer>
                </div>
            `;

            this.observeResponsiveShell();
            this.attachReusableAudio(pagePreservedAudio);
            this.bindEvents();
            this.loadCurrentMedia(false);
            if (!pagePreservedAudio) {
                this.restorePlaybackState(pagePlaybackState);
            }
            this.updateProgressUi();
            if (this.playerExpanded) {
                requestAnimationFrame(() => this.updateExpandedAnimationOrigin());
            }
            if (suppressPageMotion) {
                requestAnimationFrame(() => {
                    this.container?.querySelector('.media-app')?.classList.remove('media-suppress-page-motion');
                });
            }
            isInitialFrameRender = false;
        };

        this.frame = FluentWindow.mount({
            container: this.container,
            items: this.getFrameNavItems(),
            footerItems: this.getFrameFooterItems(),
            activeId: this.getFrameActiveView(),
            sidebarSearch: this.getSidebarSearchOptions(),
            onNavigate: renderMediaPage
        });
    },

    getSidebarSearchOptions() {
        return {
            placeholder: this.localText('search'),
            emptyText: this.localText('noMatch'),
            debounceMs: 80,
            search: (query) => {
                const normalizedQuery = String(query || '').trim().toLowerCase();
                if (!normalizedQuery) return [];
                return this.library
                    .filter((item) => [item.title, item.artist, item.album, item.name]
                        .some((value) => String(value || '').toLowerCase().includes(normalizedQuery)))
                    .slice(0, 12)
                    .map((item) => ({
                        id: item.id,
                        title: item.title,
                        subtitle: this.getItemSubtitle(item, true),
                        icon: item.type === 'video' ? 'Media Reel V' : 'Music',
                        iconSrc: item.coverUrl || '',
                        data: item
                    }));
            },
            onResultClick: (result) => {
                if (result?.id) this.playItemById(result.id);
            }
        };
    },

    detachReusableAudio(current, forceDetach = false) {
        const media = this.mediaElement;
        if (!media || media.tagName !== 'AUDIO' || current?.type !== 'audio' || media.dataset.itemId !== current.id) {
            return null;
        }

        const stableHost = this.ensureAudioHost();
        if (!forceDetach && stableHost && stableHost.contains(media)) {
            return media;
        }

        media.remove();
        return media;
    },

    attachReusableAudio(media) {
        if (!media) return;
        this.audioElement = media;
        media.className = 'media-audio-hidden';
        const host = this.ensureAudioHost();
        if (host && media.parentElement !== host) {
            host.appendChild(media);
        }
        this.bindMediaElementEvents(media);
    },

    capturePlaybackState() {
        const media = this.mediaElement;
        if (!media || !media.dataset.itemId) return null;
        return {
            itemId: media.dataset.itemId,
            currentTime: Number.isFinite(media.currentTime) ? media.currentTime : 0,
            wasPlaying: !media.paused && !media.ended
        };
    },

    getStoredPlaybackState() {
        try {
            const state = JSON.parse(localStorage.getItem(this.playbackStorageKey) || '{}');
            return state && typeof state === 'object' ? state : {};
        } catch (_) {
            return {};
        }
    },

    loadPlaybackPreferences() {
        const state = this.getStoredPlaybackState();
        this.pendingPlaybackState = state.currentItemId ? {
            itemId: state.currentItemId,
            currentTime: Number(state.currentTime || 0),
            wasPlaying: Boolean(state.wasPlaying)
        } : null;

        this.isShuffle = Boolean(state.isShuffle);
        this.repeatMode = ['none', 'all', 'one'].includes(state.repeatMode) ? state.repeatMode : 'none';
        const rate = Number(state.playbackRate || 1);
        this.playbackRate = [0.5, 0.75, 1, 1.25, 1.5, 2].includes(rate) ? rate : 1;
    },

    getPendingPlaybackStateForActiveItem() {
        const current = this.activeItem;
        if (!current || !this.pendingPlaybackState || this.pendingPlaybackState.itemId !== current.id) return null;
        return this.pendingPlaybackState;
    },

    savePlaybackSnapshot(force = false) {
        const now = Date.now();
        if (!force && now - this._lastPlaybackSaveAt < 1500) return;
        this._lastPlaybackSaveAt = now;

        const media = this.mediaElement;
        const current = this.activeItem;
        const currentTime = media && media.dataset.itemId === current?.id && Number.isFinite(media.currentTime)
            ? media.currentTime
            : 0;
        const wasPlaying = Boolean(media && media.dataset.itemId === current?.id && !media.paused && !media.ended);

        try {
            localStorage.setItem(this.playbackStorageKey, JSON.stringify({
                currentItemId: current?.id || null,
                currentTime,
                wasPlaying,
                isShuffle: this.isShuffle,
                repeatMode: this.repeatMode,
                playbackRate: this.playbackRate
            }));
        } catch (_) {
            // Storage can be unavailable; keep playback working in memory.
        }
    },

    restorePlaybackState(state) {
        const media = this.mediaElement;
        const current = this.activeItem;
        if (!state || !media || !current || state.itemId !== current.id) return;

        const restore = () => {
            if (Number.isFinite(state.currentTime) && Number.isFinite(media.duration)) {
                media.currentTime = Math.min(Math.max(0, state.currentTime), media.duration || state.currentTime);
            }
            if (state.wasPlaying) this.playMedia(media, false);
            this.updateProgressUi();
            this.pendingPlaybackState = null;
        };

        if (media.readyState >= 1) {
            restore();
        } else {
            media.addEventListener('loadedmetadata', restore, { once: true });
        }
    },

    symbolIcon(file, className = '') {
        const src = `Theme/Icon/Symbol_icon/stroke/${encodeURIComponent(file)}`;
        return `<img class="media-symbol ${className}" src="${src}" alt="">`;
    },

    renderNavItem(view, icon, label) {
        return `<button class="media-nav-item ${this.activeView === view ? 'active' : ''}" data-view="${view}"><span class="media-nav-icon">${this.symbolIcon(icon)}</span><span class="media-nav-label">${this.escapeHtml(label)}</span></button>`;
    },

    renderFilterButton(view, label) {
        const active = (this.activeView === view) || (view === 'library' && !['music', 'video'].includes(this.activeView));
        return `<button class="${active ? 'active' : ''}" data-view="${view}">${label}</button>`;
    },

    renderMainContent(filteredItems, current) {
        if (this.isRestoring && !this.library.length) return this.renderLoadingPage();
        if (this.activeView === 'settings') return this.renderSettingsPage();
        if (!this.library.length) return this.renderImportEmptyPage();
        if (this.activeView === 'recent') return this.renderRecentPage(current);
        if (this.activeView === 'playlist') return this.renderPlaylistPage(filteredItems, current);
        return this.renderLibraryPage(filteredItems, current);
    },

    renderLibraryPage(filteredItems, current) {
        const recommended = this.getRecommendedItems(filteredItems, 10);
        const playInsight = this.getPlayInsightItems(filteredItems, 3);
        return `
            <section class="media-home media-page-shell">
                <div class="media-home-head">
                    <div>
                        <p>${this.localText('library')}</p>
                        <h1>${this.localText('library')}</h1>
                    </div>
                </div>
                ${current?.type === 'video' ? `<div class="media-video-shell">${this.renderVideoStage(current)}</div>` : ''}
                <div class="media-section-title">${this.localText('recommended')}</div>
                <div class="media-feature-row">
                    ${this.renderHomeCards(recommended, current, true)}
                </div>
                ${playInsight.items.length ? `
                    <div class="media-section-title">${this.localText(playInsight.hasHistory ? 'frequent' : 'forYou')}</div>
                    <div class="media-frequency-row">
                        ${this.renderHomeCards(playInsight.items, current, false)}
                    </div>
                ` : ''}
            </section>
        `;
    },

    renderImportEmptyPage() {
        return `
            <section class="media-import-empty media-page-shell">
                <div class="media-import-empty-card">
                    <div>${this.symbolIcon('Music.svg', 'media-empty-icon')}</div>
                    <h1>${this.localText('emptyTitle')}</h1>
                    <p>${this.localText('emptyDesc')}</p>
                    <div class="media-import-actions">
                        <button class="fluent-btn fluent-btn-primary fluent-btn-medium" type="button" data-action="open-files"><span class="fluent-btn-text">${this.localText('openFiles')}</span></button>
                        <button class="fluent-btn fluent-btn-secondary fluent-btn-medium" type="button" data-action="open-folder"><span class="fluent-btn-text">${this.localText('openFolder')}</span></button>
                    </div>
                </div>
            </section>
        `;
    },

    renderLoadingPage() {
        const label = this.getLanguage() === 'en'
            ? 'Loading imported songs…'
            : '\u6b63\u5728\u52a0\u8f7d\u5df2\u5bfc\u5165\u7684\u6b4c\u66f2\u2026';
        return `
            <section class="media-library-loading media-page-shell" role="status" aria-live="polite">
                <div class="fluent-spinner fluent-spinner-large" aria-hidden="true"></div>
                <strong>${label}</strong>
            </section>
        `;
    },

    renderSettingsPage() {
        return `
            <section class="media-settings-page media-page-shell">
                <div class="media-home-head">
                    <div>
                        <p>${this.localText('app')}</p>
                        <h1>${this.localText('settings')}</h1>
                    </div>
                </div>
                <div class="media-settings-panel">
                    <button class="media-settings-option" data-action="open-files">
                        <span>${this.symbolIcon('Music.svg')}</span>
                        <strong>${this.localText('importSong')}</strong>
                    </button>
                    <button class="media-settings-option" data-action="open-folder">
                        <span>${this.symbolIcon('Folder.svg')}</span>
                        <strong>${this.localText('importFolder')}</strong>
                    </button>
                    <button class="media-settings-option media-settings-danger" data-action="clear-library">
                        <span>${this.symbolIcon('Trash.svg')}</span>
                        <strong>${this.localText('clearLibrary')}</strong>
                        <small>${this.localText('clearLibraryDesc')}</small>
                    </button>
                </div>
            </section>
        `;
    },

    renderRecentPage(current) {
        const recent = this.getRecentItems(this.library, true);
        return `
            <section class="media-home media-page-recent media-page-shell">
                <div class="media-home-head">
                    <div>
                        <p>${this.localText('recent')}</p>
                        <h1>${this.localText('recent')}</h1>
                    </div>
                </div>
                ${recent.length ? `
                    <div class="media-feature-row">
                        ${this.renderHomeCards(recent, current, true)}
                    </div>
                    ${this.renderListPanel(recent, current, this.localText('recent'))}
                ` : this.renderEmptyState(this.localText('recentEmptyTitle'), this.localText('recentEmptyDesc'))}
            </section>
        `;
    },

    renderNowPage(current) {
        return `
            <section class="media-now-page media-page-shell">
                <div class="media-home-head">
                    <div>
                        <p>${this.localText('now')}</p>
                        <h1>${current ? this.escapeHtml(current.title) : this.localText('now')}</h1>
                    </div>
                </div>
                ${current ? `
                    <div class="media-now-hero">
                        ${this.renderLargeArt(current)}
                        <div>
                            <p>${this.escapeHtml(this.getTypeLabel(current))}</p>
                            <h2>${this.escapeHtml(current.title)}</h2>
                            <span>${this.escapeHtml(this.getItemSubtitle(current))}</span>
                        </div>
                    </div>
                    ${this.renderListPanel([current], current, this.localText('now'))}
                ` : this.renderEmptyState(this.localText('emptyTitle'), this.localText('emptyDesc'))}
            </section>
        `;
    },

    renderPlaylistPage(filteredItems, current) {
        return `
            <section class="media-playlist-page media-page-shell">
                <div class="media-home-head">
                    <div>
                        <p>${this.localText('playlist')}</p>
                        <h1>${this.localText('playlist')}</h1>
                    </div>
                </div>
                ${this.renderListPanel(filteredItems, current, this.localText('playlist'))}
            </section>
        `;
    },

    renderListPanel(items, current, title) {
        return `
            <section class="media-library-panel">
                <div class="media-panel-head">
                    <div>
                        <div class="media-panel-kicker">${this.localText('playlist')}</div>
                        <h2>${this.escapeHtml(title || this.localText('library'))}</h2>
                    </div>
                </div>
                <div class="media-track-list">
                    ${items.length
                        ? items.map((item) => this.renderTrackItem(item)).join('')
                        : this.renderEmptyState()}
                </div>
            </section>
        `;
    },

    renderHomeCards(items, current, featured = false) {
        const source = items.length ? items : (current ? [current] : []);
        if (!source.length) {
            return `
                <button class="media-home-card is-empty ${featured ? 'is-featured' : ''}" data-action="open-files">
                    <span>${this.localText('openFiles')}</span>
                    <strong>${this.localText('emptyTitle')}</strong>
                </button>
            `;
        }

        return source.slice(0, featured ? 10 : 8).map((item, index) => {
            const active = current?.id === item.id;
            const hasCover = Boolean(item.coverUrl);
            const coverStyle = hasCover ? `background-image:${this.getArtBackgroundValue(item)}` : `background:${this.getItemGradient(item)}`;
            return `
                <button class="media-home-card ${featured ? 'is-featured' : ''} ${active ? 'active' : ''} ${hasCover ? '' : 'no-cover'}" data-id="${item.id}" style="${hasCover ? '' : `--media-card-gradient:${this.getItemGradient(item)}`}">
                    <span class="media-card-art" style="${coverStyle}">
                        ${hasCover ? '' : this.symbolIcon(item.type === 'video' ? 'Video Player.svg' : 'Music.svg', 'media-card-placeholder-icon')}
                    </span>
                    <span class="media-card-shade"></span>
                    <span class="media-card-label">${featured ? (index === 0 ? this.localText('madeForYou') : this.getTypeLabel(item)) : this.getTypeLabel(item)}</span>
                    <strong>${this.escapeHtml(item.title)}</strong>
                    <small>${this.escapeHtml(this.getItemSubtitle(item, true))}</small>
                </button>
            `;
        }).join('');
    },

    getRecentItems(items, strict = false) {
        const recent = this.library
            .filter((item) => item.lastPlayed)
            .sort((a, b) => b.lastPlayed - a.lastPlayed);
        return recent.length || strict ? recent : items;
    },

    getRecommendedItems(items, limit = 10) {
        return [...items]
            .sort((a, b) => {
                const coverWeight = Number(Boolean(b.coverUrl)) - Number(Boolean(a.coverUrl));
                if (coverWeight) return coverWeight;
                return (b.recommendRank || 0) - (a.recommendRank || 0);
            })
            .slice(0, Math.min(limit, items.length));
    },

    getPlayInsightItems(items, limit = 3) {
        const source = (items.length ? items : this.library).filter((item) => item.type === 'audio');
        if (!source.length) return { hasHistory: false, items: [] };

        const frequent = source
            .filter((item) => Number(item.playCount || 0) > 0)
            .sort((a, b) => {
                const plays = Number(b.playCount || 0) - Number(a.playCount || 0);
                if (plays) return plays;
                return Number(b.lastPlayed || 0) - Number(a.lastPlayed || 0);
            })
            .slice(0, limit);

        if (frequent.length) return { hasHistory: true, items: frequent };

        const fallback = [...source]
            .sort((a, b) => (b.recommendRank || 0) - (a.recommendRank || 0))
            .slice(0, limit);
        return { hasHistory: false, items: fallback };
    },

    getItemGradient(item) {
        const index = Number.isInteger(item?.gradientIndex) ? item.gradientIndex : 0;
        return this.gradients[Math.abs(index) % this.gradients.length];
    },

    getThemeColors(item) {
        if (item?.coverUrl && Array.isArray(item?.themeColors) && item.themeColors.length >= 3) {
            return item.themeColors;
        }
        const seeds = [
            [255, 107, 53], [255, 45, 85], [0, 122, 255], [88, 86, 214], [52, 199, 89],
            [255, 204, 0], [0, 199, 190], [94, 92, 230], [191, 90, 242], [255, 69, 58],
            [48, 176, 199], [142, 142, 147], [10, 132, 255], [255, 159, 10], [50, 215, 75]
        ];
        const index = Number.isInteger(item?.gradientIndex) ? Math.abs(item.gradientIndex) % seeds.length : 2;
        return this.buildThemeColors(...seeds[index]);
    },

    getExpandedThemeStyle(item) {
        const [a, b, c] = this.getThemeColors(item);
        return `--media-theme-a:${a};--media-theme-b:${b};--media-theme-c:${c};--media-expanded-art-bg:${this.getArtBackgroundValue(item)};`;
    },

    renderRangeControl({ id, className = '', inputClass = '', min = 0, max = 100, step = null, value = 0, label = '' }) {
        const stepAttr = step === null || step === undefined ? '' : ` step="${this.escapeAttr(String(step))}"`;
        const idAttr = id ? ` id="${this.escapeAttr(id)}"` : '';
        const labelAttr = label ? ` aria-label="${this.escapeAttr(label)}"` : '';
        return `<input${idAttr} class="media-native-range ${className} ${inputClass}" type="range" min="${this.escapeAttr(String(min))}" max="${this.escapeAttr(String(max))}"${stepAttr} value="${this.escapeAttr(String(value))}"${labelAttr}>`;
    },

    getPlaybackRates() {
        return [0.5, 0.75, 1, 1.25, 1.5, 2];
    },

    getSwitchStateLabel(active) {
        if (this.getLanguage() === 'en') return active ? 'On' : 'Off';
        return active ? '开启' : '关闭';
    },

    renderExpandedOptionsMenu() {
        const rates = this.getPlaybackRates();
        const currentRate = Number(this.playbackRate || 1);
        const rateOptions = rates.map((rate) => `
            <button class="media-expanded-speed-option ${rate === currentRate ? 'active' : ''}" type="button" data-rate="${rate}" role="menuitemradio" aria-checked="${rate === currentRate ? 'true' : 'false'}">
                <span>${rate}x</span>
            </button>
        `).join('');

        return `
            <div class="media-expanded-options">
                <button class="media-more-button ${this.isShuffle || this.repeatMode !== 'none' ? 'active' : ''}" data-action="expanded-options" type="button" aria-haspopup="menu" aria-expanded="false" title="${this.localText('settings')}">
                    ${this.symbolIcon('Dots Horizontal.svg')}
                </button>
                <div class="media-expanded-options-menu" role="menu">
                    <button class="media-expanded-option ${this.isShuffle ? 'active' : ''}" type="button" data-action="shuffle" data-option="shuffle" role="menuitemcheckbox" aria-checked="${this.isShuffle ? 'true' : 'false'}">
                        <span>${this.localText('shuffle')}</span>
                        <em>${this.getSwitchStateLabel(this.isShuffle)}</em>
                    </button>
                    <button class="media-expanded-option ${this.repeatMode !== 'none' ? 'active' : ''}" type="button" data-action="repeat" data-option="repeat" role="menuitemcheckbox" aria-checked="${this.repeatMode !== 'none' ? 'true' : 'false'}">
                        <span>${this.localText('repeat')}</span>
                        <em>${this.getSwitchStateLabel(this.repeatMode !== 'none')}</em>
                    </button>
                    <div class="media-expanded-speed-entry">
                        <button class="media-expanded-option media-options-speed-trigger" type="button" role="menuitem" aria-haspopup="menu" aria-expanded="false">
                            <span>${this.localText('speed')}</span>
                            <em class="media-expanded-rate-value">${currentRate}x</em>
                        </button>
                        <div class="media-expanded-speed-menu" role="menu" aria-label="${this.escapeAttr(this.localText('speed'))}">
                            ${rateOptions}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    getArtBackgroundValue(item) {
        if (item?.coverUrl) {
            const safeUrl = String(item.coverUrl)
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/[\r\n\f]/g, '');
            return `url('${safeUrl}')`;
        }
        return this.getItemGradient(item);
    },

    async applyThemeColors(item) {
        if (!item) return item;
        if (item.coverUrl) {
            const color = await this.extractDominantColor(item.coverUrl).catch(() => null);
            item.themeColors = color ? this.buildThemeColors(color.r, color.g, color.b) : this.getThemeColors(item);
        } else {
            item.themeColors = this.getThemeColors(item);
        }
        return item;
    },

    extractDominantColor(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const size = 36;
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    ctx.drawImage(img, 0, 0, size, size);
                    const data = ctx.getImageData(0, 0, size, size).data;
                    let r = 0;
                    let g = 0;
                    let b = 0;
                    let weightTotal = 0;
                    for (let i = 0; i < data.length; i += 4) {
                        const alpha = data[i + 3];
                        if (alpha < 120) continue;
                        const pr = data[i];
                        const pg = data[i + 1];
                        const pb = data[i + 2];
                        const max = Math.max(pr, pg, pb);
                        const min = Math.min(pr, pg, pb);
                        const lightness = (max + min) / 2;
                        if (lightness > 242 || lightness < 18) continue;
                        const saturationWeight = 1 + ((max - min) / 255) * 2.4;
                        r += pr * saturationWeight;
                        g += pg * saturationWeight;
                        b += pb * saturationWeight;
                        weightTotal += saturationWeight;
                    }
                    if (!weightTotal) {
                        resolve(null);
                        return;
                    }
                    resolve({
                        r: Math.round(r / weightTotal),
                        g: Math.round(g / weightTotal),
                        b: Math.round(b / weightTotal)
                    });
                } catch (err) {
                    reject(err);
                }
            };
            img.onerror = reject;
            img.src = src;
        });
    },

    buildThemeColors(r, g, b) {
        const hsl = this.rgbToHsl(r, g, b);
        const hue = hsl.h;
        const sat = Math.min(82, Math.max(42, hsl.s + 12));
        const baseLight = Math.min(68, Math.max(42, hsl.l));
        return [
            this.hslToCss(hue - 7, sat, Math.min(74, baseLight + 10)),
            this.hslToCss(hue + 5, Math.min(88, sat + 8), Math.max(34, baseLight - 6)),
            this.hslToCss(hue + 13, Math.max(34, sat - 12), Math.min(84, baseLight + 22))
        ];
    },

    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h /= 6;
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    },

    hslToCss(h, s, l) {
        const hue = ((Math.round(h) % 360) + 360) % 360;
        return `hsl(${hue} ${Math.round(s)}% ${Math.round(l)}%)`;
    },

    getLibraryManifest() {
        try {
            const manifest = JSON.parse(localStorage.getItem(this.mediaStorageKey) || '[]');
            return Array.isArray(manifest) ? manifest : [];
        } catch (_) {
            return [];
        }
    },

    saveLibraryManifest() {
        try {
            const manifest = this.library.map((item) => ({
                id: item.id,
                name: item.name,
                type: item.type,
                title: item.title,
                artist: item.artist,
                album: item.album,
                themeColors: item.themeColors || null,
                size: item.size || item.file?.size || 0,
                mimeType: item.mimeType || item.file?.type || '',
                lastModified: item.lastModified || item.file?.lastModified || Date.now(),
                gradientIndex: item.gradientIndex,
                duration: item.duration || 0,
                lastPlayed: item.lastPlayed || 0,
                playCount: item.playCount || 0
            }));
            localStorage.setItem(this.mediaStorageKey, JSON.stringify(manifest));
        } catch (_) {
            // Storage can be full or disabled; playback should still work in-memory.
        }
    },

    openMediaDb() {
        return new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) {
                reject(new Error('IndexedDB unavailable'));
                return;
            }
            const request = indexedDB.open(this.mediaDbName, 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(this.mediaDbStore)) {
                    db.createObjectStore(this.mediaDbStore, { keyPath: 'id' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async withMediaStore(mode, callback) {
        const db = await this.openMediaDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.mediaDbStore, mode);
            const store = tx.objectStore(this.mediaDbStore);
            let result;
            try {
                result = callback(store);
            } catch (err) {
                db.close();
                reject(err);
                return;
            }
            tx.oncomplete = () => {
                db.close();
                resolve(result);
            };
            tx.onerror = () => {
                db.close();
                reject(tx.error);
            };
        });
    },

    persistMediaItem(item) {
        if (!item?.file) return;
        this.withMediaStore('readwrite', (store) => {
            store.put({
                id: item.id,
                file: item.file,
                name: item.name,
                mimeType: item.mimeType || item.file.type || '',
                lastModified: item.lastModified || item.file.lastModified || Date.now()
            });
        }).then(() => {
            if (globalThis.FluentOSStorage) FluentOSStorage.invalidate();
        }).catch(() => {});
    },

    async readStoredMedia(id) {
        return this.withMediaStore('readonly', (store) => new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        }));
    },

    async deleteStoredMedia(id) {
        if (!id) return true;
        try {
            await this.withMediaStore('readwrite', (store) => store.delete(id));
            if (globalThis.FluentOSStorage) FluentOSStorage.invalidate();
            return true;
        } catch (error) {
            console.warn('[MediaApp] Failed to delete stored media payload', error);
            return false;
        }
    },

    async readAllStoredMedia() {
        return this.withMediaStore('readonly', (store) => new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
            request.onerror = () => reject(request.error);
        }));
    },

    async restoreLibraryFromStorage() {
        if (this.library.length) {
            this.isRestoring = false;
            return this.library;
        }
        if (this.restorePromise) return this.restorePromise;
        this.restoreStarted = true;
        const manifest = this.getLibraryManifest();
        if (!manifest.length) {
            this.isRestoring = false;
            return [];
        }

        this.isRestoring = true;
        this.restorePromise = (async () => {
            let records = [];
            try {
                records = await this.readAllStoredMedia();
            } catch (_) {
                // IndexedDB may be unavailable; leave the import page usable.
            }
            const recordsById = new Map(records.map((record) => [record.id, record]));
            const restored = manifest
                .map((saved) => {
                    const record = recordsById.get(saved.id);
                    if (!record?.file) return null;
                    try {
                        return this.createMediaItemFromStoredFast({ ...saved, ...record });
                    } catch (_) {
                        return null;
                    }
                })
                .filter(Boolean);

            if (!restored.length) {
                try { localStorage.removeItem(this.mediaStorageKey); } catch (_) {}
                return [];
            }
            this.library = restored;
            const storedState = this.getStoredPlaybackState();
            const storedIndex = storedState.currentItemId
                ? restored.findIndex((item) => item.id === storedState.currentItemId)
                : -1;
            const recentIndex = restored.reduce((best, item, index) => {
                if (best < 0) return Number(item.lastPlayed || 0) > 0 ? index : best;
                return Number(item.lastPlayed || 0) > Number(restored[best].lastPlayed || 0) ? index : best;
            }, -1);
            this.currentIndex = storedIndex >= 0 ? storedIndex : (recentIndex >= 0 ? recentIndex : 0);
            this.loadPlaybackPreferences();
            if (typeof State !== 'undefined') this.syncVolumeFromState();
            this.saveLibraryManifest();
            this.loadCurrentMedia(false);
            const media = this.mediaElement;
            const restorePosition = () => {
                const savedTime = Number(storedState.currentTime || 0);
                if (media && Number.isFinite(savedTime) && savedTime > 0 && Number.isFinite(media.duration)) {
                    media.currentTime = Math.min(savedTime, media.duration || savedTime);
                }
            };
            if (media?.readyState >= 1) restorePosition();
            else media?.addEventListener('loadedmetadata', restorePosition, { once: true });
            this.hydrateRestoredMetadata(restored);
            return restored;
        })().finally(() => {
            this.isRestoring = false;
            this.restorePromise = null;
            this.render();
        });
        return this.restorePromise;
    },

    async ensureLibraryReady() {
        if (this.library.length) return this.library;
        return this.restoreLibraryFromStorage();
    },

    renderExpandedPlayer(item) {
        const coverStyle = `background:${this.getArtBackgroundValue(item)}`;
        return `
            <section class="media-expanded ${this.playerExpanded ? 'active' : ''}" style="${this.getExpandedThemeStyle(item)}">
                <div class="media-expanded-bg" style="${coverStyle}"></div>
                <button class="media-collapse-btn" data-action="collapse-player" title="${this.localText('collapse')}">${this.symbolIcon('Chevron Down.svg')}</button>
                <div class="media-expanded-art" style="${coverStyle}">
                    ${item?.coverUrl ? '' : this.symbolIcon(item?.type === 'video' ? 'Video Player.svg' : 'Music.svg', 'media-expanded-placeholder-icon')}
                </div>
                <div class="media-expanded-info">
                    <div>
                        <h2>${this.escapeHtml(item?.title || this.localText('emptyTitle'))}</h2>
                        <p>${this.escapeHtml(this.getItemSubtitle(item))}</p>
                    </div>
                    <div class="media-expanded-meta">
                        ${this.renderExpandedOptionsMenu()}
                    </div>
                </div>
                <div class="media-expanded-progress-row">
                    ${this.renderRangeControl({
                        id: 'media-expanded-progress',
                        className: 'media-expanded-progress fluent-slider',
                        inputClass: 'media-seek',
                        min: 0,
                        max: 1000,
                        value: 0,
                        label: 'Playback progress'
                    })}
                    <div class="media-time-row">
                        <span class="media-current-time">0:00</span>
                        <span class="media-duration">0:00</span>
                    </div>
                </div>
                <div class="media-expanded-controls">
                    <button data-action="skip-back" title="${this.localText('skipBack')}">${this.symbolIcon('Fast Forward Back.svg')}</button>
                    <button data-action="previous" title="${this.localText('previous')}">${this.symbolIcon('Previous.svg')}</button>
                    <button class="media-play-btn media-expanded-play" data-action="play-toggle" title="${this.localText('play')}">${this.symbolIcon('Play.svg')}</button>
                    <button data-action="next" title="${this.localText('next')}">${this.symbolIcon('Next.svg')}</button>
                    <button data-action="skip-forward" title="${this.localText('skipForward')}">${this.symbolIcon('Fast Forward.svg')}</button>
                </div>
                <div class="media-expanded-aux">
                    <label class="media-volume">
                        <span class="media-volume-icon media-volume-icon-low" aria-hidden="true">${this.symbolIcon('Volume Down.svg')}</span>
                        ${this.renderRangeControl({
                            id: 'media-volume',
                            className: 'media-volume-slider fluent-slider',
                            min: 0,
                            max: 1,
                            step: 0.01,
                            value: this.volume,
                            label: this.localText('volume')
                        })}
                        <span class="media-volume-icon media-volume-icon-high" aria-hidden="true">${this.symbolIcon('Volume Up.svg')}</span>
                    </label>
                </div>
            </section>
        `;
    },

    renderAudioStage(item) {
        return `
            <div class="media-audio-hero">
                ${this.renderLargeArt(item)}
                <div class="media-title-block">
                    <h1>${this.escapeHtml(item?.title || this.localText('emptyTitle'))}</h1>
                    <p>${this.escapeHtml(this.getItemSubtitle(item))}</p>
                </div>
            </div>
        `;
    },

    renderVideoStage(item) {
        return `
            <video id="media-player-element" class="media-video" playsinline preload="metadata"></video>
            <div class="media-video-title">
                <strong>${this.escapeHtml(item.title)}</strong>
                <span>${this.escapeHtml(this.getItemSubtitle(item, true))}</span>
            </div>
        `;
    },

    renderLargeArt(item) {
        if (item?.coverUrl) {
            return `<img class="media-large-art" src="${item.coverUrl}" alt="">`;
        }
        return `<div class="media-large-art media-art-placeholder" style="background:${this.getItemGradient(item)}">${this.symbolIcon(item?.type === 'video' ? 'Video Player.svg' : 'Music.svg')}</div>`;
    },

    renderSmallArt(item) {
        if (item?.coverUrl) {
            return `<img class="media-small-art" src="${item.coverUrl}" alt="">`;
        }
        return `<div class="media-small-art media-art-placeholder" style="background:${this.getItemGradient(item)}">${this.symbolIcon(item?.type === 'video' ? 'Video Player.svg' : 'Music.svg')}</div>`;
    },

    renderTrackItem(item) {
        const active = this.activeItem?.id === item.id;
        return `
            <button class="media-track ${active ? 'active' : ''}" data-id="${item.id}">
                ${this.renderSmallArt(item)}
                <span class="media-track-index">${this.library.indexOf(item) + 1}</span>
                <span class="media-track-main">
                    <strong>${this.escapeHtml(item.title)}</strong>
                    <em>${this.escapeHtml(this.getItemSubtitle(item, true))}</em>
                </span>
                <span class="media-track-type">${this.getTypeLabel(item)}</span>
                <span class="media-track-duration">${this.formatTime(item.duration || 0)}</span>
            </button>
        `;
    },

    renderEmptyState(title = null, description = null) {
        return `
            <div class="media-empty">
                <div>${this.symbolIcon('Music.svg', 'media-empty-icon')}</div>
                <h3>${title || this.localText(this.library.length ? 'noMatch' : 'emptyTitle')}</h3>
                <p>${description !== null ? description : (this.library.length ? '' : this.localText('emptyDesc'))}</p>
            </div>
        `;
    },

    observeResponsiveShell() {
        if (this.responsiveResizeObserver) {
            this.responsiveResizeObserver.disconnect();
            this.responsiveResizeObserver = null;
        }
        const app = this.container?.querySelector('.media-app');
        if (!app) return;
        const update = () => this.updateResponsiveShellClass(app);
        update();
        if (typeof ResizeObserver !== 'undefined') {
            this.responsiveResizeObserver = new ResizeObserver(update);
            this.responsiveResizeObserver.observe(app);
        } else {
            window.requestAnimationFrame(update);
        }
    },

    updateResponsiveShellClass(app = this.container?.querySelector('.media-app')) {
        if (!app) return;
        const width = app.getBoundingClientRect().width || app.clientWidth || 0;
        app.classList.toggle('media-compact-width', width > 0 && width <= 900);
    },

    bindEvents() {
        if (!this.container) return;

        this.container.querySelectorAll('[data-view]').forEach((button) => {
            button.addEventListener('click', () => {
                if (button.dataset.view === 'now') {
                    if (!this.activeItem && this.library.length) {
                        this.currentIndex = 0;
                        this.render();
                    }
                    this.setExpandedPlayer(true);
                    return;
                }
                this.activeView = button.dataset.view;
                this.render();
            });
        });

        this.container.querySelectorAll('[data-action]').forEach((button) => {
            button.addEventListener('click', (event) => this.handleAction(button.dataset.action, event));
        });

        const playerBar = this.container.querySelector('.media-player-bar:not(.is-hidden)');
        if (playerBar) {
            playerBar.addEventListener('click', (event) => {
                const target = event.target instanceof Element ? event.target : null;
                if (target?.closest('button, input, label, [data-action]')) return;
                this.setExpandedPlayer(true);
            });
        }

        this.bindTrackListEvents();

        const fileInput = this.container.querySelector('#media-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', () => {
                this.importFiles(Array.from(fileInput.files || []));
                fileInput.value = '';
            });
        }

        const folderInput = this.container.querySelector('#media-folder-input');
        if (folderInput) {
            folderInput.addEventListener('change', () => {
                this.importFiles(Array.from(folderInput.files || []));
                folderInput.value = '';
            });
        }

        this.container.querySelectorAll('.media-seek').forEach((progress) => {
            progress.addEventListener('pointerdown', () => {
                this.isSeeking = true;
                this.syncRangeControl(progress);
            });
            progress.addEventListener('input', () => {
                this.syncRangeControl(progress);
                this.previewSeek(Number(progress.value || 0));
            });
            progress.addEventListener('change', () => this.commitSeek(Number(progress.value || 0)));
            progress.addEventListener('pointerup', () => this.commitSeek(Number(progress.value || 0)));
            progress.addEventListener('pointercancel', () => {
                this.isSeeking = false;
                this.updateProgressUi();
            });
        });

        const volume = this.container.querySelector('#media-volume');
        if (volume) {
            this.syncRangeControl(volume);
            volume.addEventListener('input', () => {
                const value = Math.round(Number(volume.value || 0) * 100);
                State.updateSettings({ volume: Math.min(100, Math.max(0, value)) });
                this.syncRangeControl(volume);
            });
        }

        this.bindExpandedOptionsMenu();

        const media = this.mediaElement;
        if (media) {
            this.bindMediaElementEvents(media);
        }
    },

    bindExpandedOptionsMenu() {
        const menuHost = this.container?.querySelector('.media-expanded-options');
        if (!menuHost) return;

        const menu = menuHost.querySelector('.media-expanded-options-menu');
        const button = menuHost.querySelector('.media-more-button');
        const speedTrigger = menuHost.querySelector('.media-options-speed-trigger');
        const close = () => {
            menuHost.classList.remove('is-open', 'speed-open');
            button?.setAttribute('aria-expanded', 'false');
            speedTrigger?.setAttribute('aria-expanded', 'false');
        };

        speedTrigger?.addEventListener('click', (event) => {
            event.stopPropagation();
            menuHost.classList.toggle('speed-open');
            speedTrigger.setAttribute('aria-expanded', menuHost.classList.contains('speed-open') ? 'true' : 'false');
        });

        menuHost.querySelectorAll('.media-expanded-speed-option').forEach((option) => {
            option.addEventListener('click', (event) => {
                event.stopPropagation();
                const rate = Number(option.dataset.rate || 1);
                this.setPlaybackRate(rate);
                close();
            });
        });

        menu?.addEventListener('click', (event) => event.stopPropagation());

        if (this._optionsClickAwayHandler) {
            this.container.removeEventListener('click', this._optionsClickAwayHandler);
        }
        this._optionsClickAwayHandler = (event) => {
            if (!menuHost.contains(event.target)) close();
        };
        this.container?.addEventListener('click', this._optionsClickAwayHandler);
    },

    bindMediaElementEvents(media) {
        if (!media || media.dataset.mediaEventsBound === '1') return;
        media.dataset.mediaEventsBound = '1';
        media.addEventListener('loadedmetadata', () => this.handleLoadedMetadata());
        media.addEventListener('timeupdate', () => this.updateProgressUi());
        media.addEventListener('play', () => this.updatePlayButton());
        media.addEventListener('pause', () => this.updatePlayButton());
        media.addEventListener('ended', () => this.handleEnded());
        media.addEventListener('error', () => this.markCurrentError());
    },

    toggleExpandedOptionsMenu() {
        const menuHost = this.container?.querySelector('.media-expanded-options');
        const button = menuHost?.querySelector('.media-more-button');
        if (!menuHost || !button) return;
        const isOpen = !menuHost.classList.contains('is-open');
        menuHost.classList.toggle('is-open', isOpen);
        if (!isOpen) menuHost.classList.remove('speed-open');
        button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        menuHost.querySelector('.media-options-speed-trigger')?.setAttribute('aria-expanded', 'false');
    },

    setShuffleEnabled(enabled) {
        this.isShuffle = Boolean(enabled);
        this.refreshPlaybackOptionUi();
        this.savePlaybackSnapshot(true);
    },

    setRepeatMode(mode) {
        this.repeatMode = ['none', 'all', 'one'].includes(mode) ? mode : 'none';
        this.refreshPlaybackOptionUi();
        this.savePlaybackSnapshot(true);
    },

    setPlaybackRate(rate) {
        const nextRate = Number(rate || 1);
        if (!this.getPlaybackRates().includes(nextRate)) return;
        this.playbackRate = nextRate;
        this.applyMediaSettings();
        this.refreshPlaybackOptionUi();
        this.savePlaybackSnapshot(true);
    },

    refreshPlaybackOptionUi() {
        const shuffleActive = this.isShuffle;
        const repeatActive = this.repeatMode !== 'none';
        const moreActive = shuffleActive || repeatActive;

        this.container?.querySelectorAll('[data-action="shuffle"]').forEach((button) => {
            button.classList.toggle('active', shuffleActive);
            button.setAttribute('aria-checked', shuffleActive ? 'true' : 'false');
            const label = button.querySelector('em');
            if (label) label.textContent = this.getSwitchStateLabel(shuffleActive);
        });
        this.container?.querySelectorAll('[data-action="repeat"]').forEach((button) => {
            button.classList.toggle('active', repeatActive);
            button.setAttribute('aria-checked', repeatActive ? 'true' : 'false');
            const label = button.querySelector('em');
            if (label) label.textContent = this.getSwitchStateLabel(repeatActive);
        });
        this.container?.querySelectorAll('.media-more-button').forEach((button) => {
            button.classList.toggle('active', moreActive);
        });
        this.container?.querySelectorAll('.media-expanded-rate-value').forEach((label) => {
            label.textContent = `${this.playbackRate}x`;
        });
        this.container?.querySelectorAll('.media-expanded-speed-option').forEach((option) => {
            const active = Number(option.dataset.rate || 0) === Number(this.playbackRate || 1);
            option.classList.toggle('active', active);
            option.setAttribute('aria-checked', active ? 'true' : 'false');
        });
    },

    async handleAction(action, event = null) {
        switch (action) {
            case 'open-files':
                await this.openFiles();
                break;
            case 'open-folder':
                await this.openFolder();
                break;
            case 'clear-library':
                await this.clearLibrary();
                break;
            case 'play-toggle':
                await this.togglePlay();
                break;
            case 'previous':
                this.playPrevious();
                break;
            case 'next':
                this.playNext();
                break;
            case 'skip-back':
                this.skipBy(-10);
                break;
            case 'skip-forward':
                this.skipBy(10);
                break;
            case 'shuffle':
                event?.stopPropagation();
                this.setShuffleEnabled(!this.isShuffle);
                break;
            case 'repeat':
                event?.stopPropagation();
                this.setRepeatMode(this.repeatMode === 'none' ? 'all' : 'none');
                break;
            case 'expanded-options':
                event?.stopPropagation();
                this.toggleExpandedOptionsMenu();
                break;
            case 'expand-player':
                this.setExpandedPlayer(true);
                break;
            case 'collapse-player':
                this.setExpandedPlayer(false);
                break;
            case 'toggle-sidebar':
                this.container?.querySelector('.media-app')?.classList.toggle('sidebar-collapsed');
                break;
        }
    },

    setExpandedPlayer(active) {
        const expanded = this.container?.querySelector('.media-expanded');
        const app = this.container?.querySelector('.media-app');
        if (!expanded || !app) {
            this.playerExpanded = Boolean(active);
            this.render();
            return;
        }

        clearTimeout(this.expandTransitionTimer);
        clearTimeout(this.collapseShrinkTimer);
        this.updateExpandedAnimationOrigin();

        if (active) {
            this.playerExpanded = true;
            app.classList.remove('player-collapsing');
            app.classList.add('player-expanded');
            requestAnimationFrame(() => {
                expanded.classList.add('active');
            });
            return;
        }

        this.playerExpanded = false;
        app.classList.remove('player-expanded');
        app.classList.add('player-collapsing');
        expanded.classList.remove('active');
        this.expandTransitionTimer = setTimeout(() => {
            app.classList.remove('player-collapsing');
        }, 800);
    },

    updateExpandedAnimationOrigin() {
        const expanded = this.container?.querySelector('.media-expanded');
        const app = this.container?.querySelector('.media-app');
        const bar = this.container?.querySelector('.media-player-bar:not(.is-hidden)');
        if (!expanded || !app || !bar) return;

        const appRect = app.getBoundingClientRect();
        const barRect = bar.getBoundingClientRect();
        if (!appRect.width || !appRect.height || !barRect.width || !barRect.height) return;

        const left = Math.max(0, Math.min(appRect.width, barRect.left - appRect.left));
        const top = Math.max(0, Math.min(appRect.height, barRect.top - appRect.top));
        const right = Math.max(0, Math.min(appRect.width, appRect.right - barRect.right));
        const bottom = Math.max(0, Math.min(appRect.height, appRect.bottom - barRect.bottom));
        const centerX = left + (barRect.width / 2);
        const centerY = top + (barRect.height / 2);

        expanded.style.setProperty('--media-origin-x', `${centerX}px`);
        expanded.style.setProperty('--media-origin-y', `${centerY}px`);
        expanded.style.setProperty('--media-collapse-top', `${top}px`);
        expanded.style.setProperty('--media-collapse-right', `${right}px`);
        expanded.style.setProperty('--media-collapse-bottom', `${bottom}px`);
        expanded.style.setProperty('--media-collapse-left', `${left}px`);
    },

    async openFiles() {
        if (window.showOpenFilePicker) {
            try {
                const handles = await window.showOpenFilePicker({
                    multiple: true,
                    types: [{ description: 'Media', accept: { 'audio/*': ['.mp3', '.m4a', '.aac', '.ogg', '.wav', '.flac', '.opus'], 'video/*': ['.mp4', '.webm', '.ogv', '.mov', '.m4v', '.mkv'] } }]
                });
                const files = [];
                for (const handle of handles) {
                    const file = await handle.getFile();
                    files.push(file);
                }
                await this.importFiles(files);
                return;
            } catch (err) {
                if (err && err.name === 'AbortError') return;
            }
        }
        this.container.querySelector('#media-file-input')?.click();
    },

    async openFolder() {
        if (window.showDirectoryPicker) {
            try {
                const directory = await window.showDirectoryPicker();
                const files = await this.collectDirectoryFiles(directory);
                await this.importFiles(files);
                return;
            } catch (err) {
                if (err && err.name === 'AbortError') return;
            }
        }
        this.container.querySelector('#media-folder-input')?.click();
    },

    async clearLibrary() {
        const media = this.mediaElement;
        if (media) {
            media.pause();
            media.removeAttribute('src');
            media.load();
        }
        let ownedRecordIds = [];
        try {
            const records = await this.readAllStoredMedia();
            ownedRecordIds = records
                .map(record => String(record?.id || ''))
                .filter(id => id && !id.startsWith('fs-'));
            const deleted = await Promise.all(ownedRecordIds.map(id => this.deleteStoredMedia(id)));
            if (deleted.some(result => result === false)) throw new Error('media_payload_delete_failed');
        } catch (error) {
            console.error('[MediaApp] Failed to clear media library payloads', error);
            return false;
        }
        this.revokeObjectUrls();
        this.library = [];
        this.currentIndex = -1;
        this.playerExpanded = false;
        try { localStorage.removeItem(this.mediaStorageKey); } catch (_) {}
        try { localStorage.removeItem(this.playbackStorageKey); } catch (_) {}
        if (globalThis.FluentOSStorage) FluentOSStorage.invalidate();
        this.render();
        return true;
    },

    async collectDirectoryFiles(directoryHandle) {
        const files = [];
        const walk = async (handle) => {
            for await (const entry of handle.values()) {
                if (entry.kind === 'file') {
                    const file = await entry.getFile();
                    if (this.isAudioFile(file) || this.isVideoFile(file)) files.push(file);
                } else if (entry.kind === 'directory') {
                    await walk(entry);
                }
            }
        };
        await walk(directoryHandle);
        return files;
    },

    async importFiles(files) {
        const mediaFiles = files.filter((file) => this.isAudioFile(file) || this.isVideoFile(file));
        if (!mediaFiles.length) return;

        const startEmpty = this.library.length === 0;
        const imported = [];
        for (const file of mediaFiles) {
            const item = await this.createMediaItem(file);
            this.library.push(item);
            imported.push(item);
            this.loadDuration(item);
            this.persistMediaItem(item);
        }

        if (startEmpty && imported.length) {
            this.currentIndex = this.library.indexOf(imported[0]);
        }
        this.saveLibraryManifest();
        this.render();
    },

    async createMediaItem(file) {
        const type = this.isVideoFile(file) ? 'video' : 'audio';
        const url = URL.createObjectURL(file);
        this.objectUrls.add(url);

        const base = this.stripExt(file.name);
        let metadata = {};
        if (type === 'audio' && this.getExt(file.name) === 'mp3') {
            metadata = await this.readMp3Metadata(file);
        }

        const item = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            file,
            url,
            type,
            typeLabel: this.getTypeLabel(type),
            name: file.name,
            title: metadata.title || base || this.localText('unknownTitle'),
            artist: metadata.artist || '',
            album: metadata.album || '',
            coverUrl: metadata.coverUrl || '',
            gradientIndex: Math.floor(Math.random() * this.gradients.length),
            recommendRank: Math.random(),
            size: file.size || 0,
            mimeType: file.type || '',
            lastModified: file.lastModified || Date.now(),
            duration: 0,
            lastPlayed: 0,
            playCount: 0,
            error: false
        };
        await this.applyThemeColors(item);
        return item;
    },

    async createMediaItemFromStored(record) {
        const file = record.file instanceof File
            ? record.file
            : new File([record.file], record.name || this.localText('unknownTitle'), {
                type: record.mimeType || record.file?.type || '',
                lastModified: record.lastModified || Date.now()
            });
        const item = await this.createMediaItem(file);
        return {
            ...item,
            id: record.id || item.id,
            title: record.title || item.title,
            artist: record.artist || item.artist,
            album: record.album || item.album,
            themeColors: Array.isArray(record.themeColors) ? record.themeColors : item.themeColors,
            typeLabel: this.getTypeLabel(item),
            gradientIndex: Number.isInteger(record.gradientIndex) ? record.gradientIndex : item.gradientIndex,
            recommendRank: Math.random(),
            duration: Number(record.duration || item.duration || 0),
            lastPlayed: Number(record.lastPlayed || 0),
            playCount: Number(record.playCount || 0)
        };
    },

    createMediaItemFromStoredFast(record) {
        const file = record.file instanceof File
            ? record.file
            : new File([record.file], record.name || this.localText('unknownTitle'), {
                type: record.mimeType || record.file?.type || '',
                lastModified: record.lastModified || Date.now()
            });
        const type = this.isVideoFile(file) ? 'video' : 'audio';
        const url = URL.createObjectURL(file);
        this.objectUrls.add(url);
        return {
            id: record.id,
            file,
            url,
            type,
            typeLabel: this.getTypeLabel(type),
            name: record.name || file.name,
            title: record.title || this.stripExt(file.name) || this.localText('unknownTitle'),
            artist: record.artist || '',
            album: record.album || '',
            coverUrl: '',
            themeColors: Array.isArray(record.themeColors) ? record.themeColors : null,
            gradientIndex: Number.isInteger(record.gradientIndex) ? record.gradientIndex : 0,
            recommendRank: Math.random(),
            size: Number(record.size || file.size || 0),
            mimeType: record.mimeType || file.type || '',
            lastModified: record.lastModified || file.lastModified || Date.now(),
            duration: Number(record.duration || 0),
            lastPlayed: Number(record.lastPlayed || 0),
            playCount: Number(record.playCount || 0),
            error: false
        };
    },

    hydrateRestoredMetadata(items) {
        const queue = items.filter((item) => item.type === 'audio' && this.getExt(item.name) === 'mp3');
        if (!queue.length) return;
        const run = async () => {
            // Metadata artwork is intentionally hydrated after the usable queue
            // appears, keeping startup independent of MP3 tag parsing time.
            for (const item of queue) {
                try {
                    const metadata = await this.readMp3Metadata(item.file);
                    if (metadata.coverUrl) item.coverUrl = metadata.coverUrl;
                    if (!item.artist && metadata.artist) item.artist = metadata.artist;
                    if (!item.album && metadata.album) item.album = metadata.album;
                    if (metadata.coverUrl) await this.applyThemeColors(item);
                } catch (_) {}
            }
            this.saveLibraryManifest();
            this.render();
        };
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => { void run(); }, { timeout: 1200 });
        } else {
            setTimeout(() => { void run(); }, 0);
        }
    },

    async readMp3Metadata(file) {
        const buffer = await file.slice(0, Math.min(file.size, 1024 * 1024)).arrayBuffer();
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);
        if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return {};

        const version = bytes[3];
        const tagSize = this.readSyncSafe(bytes, 6);
        let offset = 10;
        const end = Math.min(bytes.length, 10 + tagSize);
        const result = {};

        while (offset + 10 <= end) {
            const frameId = this.ascii(bytes.slice(offset, offset + 4));
            if (!frameId.trim() || /^\0+$/.test(frameId)) break;

            const frameSize = version === 4
                ? this.readSyncSafe(bytes, offset + 4)
                : view.getUint32(offset + 4);
            const frameStart = offset + 10;
            const frameEnd = Math.min(frameStart + frameSize, end);
            if (frameSize <= 0 || frameEnd <= frameStart) break;

            const payload = bytes.slice(frameStart, frameEnd);
            if (['TIT2', 'TPE1', 'TPE2', 'TALB'].includes(frameId)) {
                const value = this.decodeId3Text(payload);
                if (frameId === 'TIT2') result.title = value;
                if (frameId === 'TPE1' || (!result.artist && frameId === 'TPE2')) result.artist = value;
                if (frameId === 'TALB') result.album = value;
            } else if (frameId === 'APIC') {
                const cover = this.decodeApic(payload);
                if (cover) {
                    result.coverUrl = URL.createObjectURL(cover);
                    this.objectUrls.add(result.coverUrl);
                }
            }
            offset = frameEnd;
        }
        return result;
    },

    decodeId3Text(bytes) {
        if (!bytes || bytes.length <= 1) return '';
        const encoding = bytes[0];
        const data = bytes.slice(1);
        try {
            if (encoding === 1 || encoding === 2) {
                const littleEndian = encoding === 1 && data[0] === 0xff && data[1] === 0xfe;
                const start = encoding === 1 && (data[0] === 0xff || data[0] === 0xfe) ? 2 : 0;
                const decoder = new TextDecoder(littleEndian ? 'utf-16le' : 'utf-16be');
                return decoder.decode(data.slice(start)).replace(/\0/g, '').trim();
            }
            if (encoding === 3) return new TextDecoder('utf-8').decode(data).replace(/\0/g, '').trim();
            return new TextDecoder('iso-8859-1').decode(data).replace(/\0/g, '').trim();
        } catch (_) {
            return this.ascii(data).replace(/\0/g, '').trim();
        }
    },

    decodeApic(bytes) {
        if (!bytes || bytes.length < 8) return null;
        const encoding = bytes[0];
        let offset = 1;
        let mimeEnd = offset;
        while (mimeEnd < bytes.length && bytes[mimeEnd] !== 0) mimeEnd += 1;
        const mime = this.ascii(bytes.slice(offset, mimeEnd)) || 'image/jpeg';
        offset = mimeEnd + 2;

        if (encoding === 1 || encoding === 2) {
            while (offset + 1 < bytes.length) {
                if (bytes[offset] === 0 && bytes[offset + 1] === 0) {
                    offset += 2;
                    break;
                }
                offset += 2;
            }
        } else {
            while (offset < bytes.length && bytes[offset] !== 0) offset += 1;
            offset += 1;
        }
        if (offset >= bytes.length) return null;
        return new Blob([bytes.slice(offset)], { type: mime });
    },

    readSyncSafe(bytes, offset) {
        return ((bytes[offset] & 0x7f) << 21)
            | ((bytes[offset + 1] & 0x7f) << 14)
            | ((bytes[offset + 2] & 0x7f) << 7)
            | (bytes[offset + 3] & 0x7f);
    },

    ascii(bytes) {
        return Array.from(bytes).map((b) => String.fromCharCode(b)).join('');
    },

    stripExt(name) {
        return String(name || '').replace(/\.[^.]+$/, '');
    },

    getFilteredItems() {
        const q = this.searchQuery.trim().toLowerCase();
        return this.library.filter((item) => {
            if (this.activeView === 'music' && item.type !== 'audio') return false;
            if (this.activeView === 'video' && item.type !== 'video') return false;
            if (this.activeView === 'recent' && !item.lastPlayed) return false;
            if (!q) return true;
            return [item.title, item.artist, item.album, item.name].some((value) => String(value || '').toLowerCase().includes(q));
        }).sort((a, b) => this.activeView === 'recent' ? b.lastPlayed - a.lastPlayed : 0);
    },

    refreshTrackListOnly() {
        const list = this.container?.querySelector('.media-track-list');
        if (!list) return;
        const filteredItems = this.getFilteredItems();
        list.innerHTML = filteredItems.length
            ? filteredItems.map((item) => this.renderTrackItem(item)).join('')
            : this.renderEmptyState();
        this.bindTrackListEvents();
    },

    bindTrackListEvents() {
        if (!this.container) return;
        this.container.querySelectorAll('.media-track').forEach((button) => {
            button.addEventListener('dblclick', () => this.playItemById(button.dataset.id));
            button.addEventListener('click', () => this.playItemById(button.dataset.id));
        });
        this.container.querySelectorAll('.media-home-card[data-id]').forEach((button) => {
            button.addEventListener('dblclick', () => this.playItemById(button.dataset.id));
            button.addEventListener('click', () => this.playItemById(button.dataset.id));
        });
    },

    selectItemById(id) {
        const index = this.library.findIndex((item) => item.id === id);
        if (index < 0) return;
        this.currentIndex = index;
        this.savePlaybackSnapshot(true);
        this.render();
    },

    async playItemById(id) {
        const index = this.library.findIndex((item) => item.id === id);
        if (index < 0) return;
        const changed = this.currentIndex !== index;
        this.currentIndex = index;
        this.savePlaybackSnapshot(true);
        if (changed) {
            this.suppressNextPageAnimation = true;
            this.render();
        }
        await this.togglePlay(true);
    },

    loadCurrentMedia(autoplay = false) {
        const current = this.activeItem;
        if (!current) return;

        let media = this.mediaElement;
        if (!media && current.type === 'audio') {
            media = document.createElement('audio');
            media.id = 'media-player-element';
            media.preload = 'metadata';
            media.className = 'media-audio-hidden';
            const host = this.ensureAudioHost();
            host?.appendChild(media);
            this.audioElement = media;
            this.bindMediaElementEvents(media);
        }
        if (!media) return;

        if (media.dataset.itemId !== current.id) {
            media.src = current.url;
            media.dataset.itemId = current.id;
            media.load();
        }
        this.applyMediaSettings();
        if (autoplay) this.playMedia(media);
    },

    async togglePlay(forcePlay = false) {
        if (!this.activeItem && this.library.length) {
            this.currentIndex = 0;
            this.savePlaybackSnapshot(true);
            this.render();
        }
        this.loadCurrentMedia(forcePlay);
        const media = this.mediaElement;
        if (!media) return;

        if (forcePlay || media.paused) {
            await this.playMedia(media);
        } else {
            media.pause();
        }
    },

    async playMedia(media, countPlay = true) {
        try {
            await media.play();
            const current = this.activeItem;
            if (current) {
                current.lastPlayed = Date.now();
                if (countPlay) {
                    current.playCount = Number(current.playCount || 0) + 1;
                }
                this.updateMediaSession(current);
                this.saveLibraryManifest();
                this.savePlaybackSnapshot(true);
            }
        } catch (_) {
            this.updatePlayButton();
        }
    },

    syncVolumeFromState() {
        const rawVolume = typeof State !== 'undefined' ? Number(State.settings.volume ?? 50) : 50;
        const percent = Math.min(100, Math.max(0, Number.isFinite(rawVolume) ? rawVolume : 50));
        this.volume = percent / 100;
        this.muted = percent <= 0;
        if (this.volume > 0) this.lastNonZeroVolume = this.volume;
        this.applyMediaSettings();
        if (this.container) {
            this.container.querySelectorAll('#media-volume').forEach((volume) => this.syncRangeControl(volume, String(this.volume)));
        }
    },

    applyMediaSettings() {
        const media = this.mediaElement;
        if (!media) return;
        media.volume = this.volume;
        media.muted = this.muted;
        media.playbackRate = this.playbackRate;
    },

    playPrevious() {
        if (!this.library.length) return;
        this.currentIndex = (this.currentIndex - 1 + this.library.length) % this.library.length;
        this.suppressNextPageAnimation = true;
        this.savePlaybackSnapshot(true);
        this.render();
        this.togglePlay(true);
    },

    playNext() {
        if (!this.library.length) return;
        if (this.isShuffle && this.library.length > 1) {
            let next = this.currentIndex;
            while (next === this.currentIndex) next = Math.floor(Math.random() * this.library.length);
            this.currentIndex = next;
        } else {
            this.currentIndex = (this.currentIndex + 1) % this.library.length;
        }
        this.suppressNextPageAnimation = true;
        this.savePlaybackSnapshot(true);
        this.render();
        this.togglePlay(true);
    },

    skipBy(seconds) {
        const media = this.mediaElement;
        if (!media || !Number.isFinite(media.duration)) return;
        media.currentTime = Math.max(0, Math.min(media.duration, media.currentTime + seconds));
        this.updateProgressUi();
    },

    previewSeek(value) {
        const media = this.mediaElement;
        if (!media || !Number.isFinite(media.duration)) return;
        this.container.querySelectorAll('.media-seek').forEach((progress) => {
            progress.value = String(value);
            this.syncRangeControl(progress);
        });
        const seconds = media.duration * (value / 1000);
        this.container.querySelectorAll('#media-current-time, .media-current-time').forEach((currentTime) => {
            currentTime.textContent = this.formatTime(seconds);
        });
    },

    commitSeek(value) {
        const media = this.mediaElement;
        this.isSeeking = false;
        if (!media || !Number.isFinite(media.duration)) {
            this.updateProgressUi();
            return;
        }
        media.currentTime = media.duration * (value / 1000);
        this.updateProgressUi();
    },

    syncRangeControl(input, value = input?.value) {
        if (!input) return;
        if (value !== undefined && value !== null) input.value = String(value);
        const min = Number(input.min || 0);
        const max = Number(input.max || 100);
        const current = Number(input.value || 0);
        const range = max - min;
        const percent = range > 0 && Number.isFinite(current)
            ? Math.min(100, Math.max(0, ((current - min) / range) * 100))
            : 0;
        input.style.setProperty('--fluent-slider-progress', `${percent}%`);
    },

    handleLoadedMetadata() {
        const current = this.activeItem;
        const media = this.mediaElement;
        if (current && media && Number.isFinite(media.duration)) {
            current.duration = media.duration;
            this.saveLibraryManifest();
        }
        this.updateProgressUi();
        this.refreshTrackListOnly();
    },

    loadDuration(item) {
        const media = document.createElement(item.type === 'video' ? 'video' : 'audio');
        media.preload = 'metadata';
        media.src = item.url;
        media.addEventListener('loadedmetadata', () => {
            if (Number.isFinite(media.duration)) item.duration = media.duration;
            this.refreshTrackListOnly();
            this.saveLibraryManifest();
            media.src = '';
        }, { once: true });
    },

    handleEnded() {
        if (this.repeatMode === 'one') {
            const media = this.mediaElement;
            if (media) {
                media.currentTime = 0;
                this.playMedia(media);
            }
            return;
        }
        if (this.repeatMode === 'all' || this.currentIndex < this.library.length - 1 || this.isShuffle) {
            this.playNext();
        }
    },

    markCurrentError() {
        if (this.activeItem) this.activeItem.error = true;
    },

    updateProgressUi() {
        const media = this.mediaElement;
        if (!this.container) return;

        const cur = media && Number.isFinite(media.currentTime) ? media.currentTime : 0;
        const dur = media && Number.isFinite(media.duration) ? media.duration : (this.activeItem?.duration || 0);
        if (!this.isSeeking) {
            this.container.querySelectorAll('.media-seek').forEach((progress) => {
                this.syncRangeControl(progress, dur ? String(Math.round((cur / dur) * 1000)) : '0');
            });
        }
        this.container.querySelectorAll('#media-volume').forEach((volume) => this.syncRangeControl(volume));
        this.container.querySelectorAll('#media-current-time, .media-current-time').forEach((currentTime) => {
            currentTime.textContent = this.formatTime(cur);
        });
        this.container.querySelectorAll('#media-duration, .media-duration').forEach((duration) => {
            duration.textContent = dur ? this.formatTime(dur) : '0:00';
        });
        this.updatePlayButton();
        this.savePlaybackSnapshot();
    },

    updatePlayButton() {
        const media = this.mediaElement;
        const isPlaying = Boolean(media && !media.paused);
        this.container?.querySelectorAll('.media-play-btn').forEach((button) => {
            button.innerHTML = this.symbolIcon(isPlaying ? 'Pause.svg' : 'Play.svg');
        });
        this.updatePlaybackVisualState(isPlaying);
    },

    updatePlaybackVisualState(isPlaying = false) {
        const app = this.container?.querySelector('.media-app');
        const expanded = this.container?.querySelector('.media-expanded');
        [app, expanded].forEach((element) => {
            if (!element) return;
            element.classList.toggle('is-playing', isPlaying);
            element.classList.toggle('is-paused', !isPlaying);
        });
    },

    startProgressLoop() {
        this.stopProgressLoop();
        this.progressTimer = setInterval(() => this.updateProgressUi(), 250);
    },

    stopProgressLoop() {
        if (this.progressTimer) clearInterval(this.progressTimer);
        this.progressTimer = null;
    },

    enterFullscreen() {
        const target = this.activeItem?.type === 'video'
            ? this.mediaElement
            : this.container?.querySelector('.media-stage');
        if (target && target.requestFullscreen) target.requestFullscreen();
    },

    updateMediaSession(item) {
        if (!('mediaSession' in navigator) || !item) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: item.title,
            artist: this.getItemSubtitle(item),
            album: item.album || this.localText('unknownAlbum'),
            artwork: item.coverUrl ? [{ src: item.coverUrl, sizes: '512x512', type: 'image/jpeg' }] : []
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrevious());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
        navigator.mediaSession.setActionHandler('seekbackward', () => this.skipBy(-10));
        navigator.mediaSession.setActionHandler('seekforward', () => this.skipBy(10));
    },

    revokeObjectUrls() {
        this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
        this.objectUrls.clear();
    },

    formatTime(value) {
        if (!Number.isFinite(value) || value < 0) return '0:00';
        const total = Math.floor(value);
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const seconds = total % 60;
        return hours > 0
            ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
            : `${minutes}:${String(seconds).padStart(2, '0')}`;
    },

    escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    },

    escapeAttr(value) {
        return this.escapeHtml(value).replace(/`/g, '&#96;');
    },

    addStyles() {
        if (document.getElementById('media-app-styles')) return;
        const style = document.createElement('style');
        style.id = 'media-app-styles';
        style.textContent = `
            /* Media uses FluentWindow for the complete shell. These rules only
               style content inside the framework-owned .fw-card. */
            .media-content.media-fw-page {
                height: 100%;
                min-height: 0;
                padding: 0 !important;
                overflow: hidden;
                color: var(--text-primary);
            }
            .media-fw-app {
                --media-accent: var(--accent, #0078d4);
                --media-pill-scroll-tail: 132px;
                position: relative;
                display: block !important;
                width: 100%;
                height: 100%;
                min-height: 0;
                padding: 24px 32px 0;
                box-sizing: border-box;
                overflow: hidden;
                container-type: size;
                container-name: media-player;
                background: transparent !important;
                color: var(--text-primary);
            }
            .media-fw-main {
                width: 100%;
                height: 100%;
                min-width: 0;
                min-height: 0;
                overflow: auto;
                padding: 0 !important;
                scroll-padding-bottom: var(--media-pill-scroll-tail);
                scrollbar-width: none;
            }
            .media-fw-main::-webkit-scrollbar { display: none; }
            .media-fw-app:has(.media-player-bar:not(.is-hidden)) .media-fw-main::after {
                content: '';
                display: block;
                width: 100%;
                height: var(--media-pill-scroll-tail);
                background: transparent;
                pointer-events: none;
            }
            .media-page-shell { width: 100%; min-height: 100%; box-sizing: border-box; }

            .media-home-head { margin: 0 0 24px; }
            .media-home-head p {
                margin: 0 0 4px;
                color: var(--text-secondary);
                font-size: 13px;
                font-weight: 600;
            }
            .media-home-head h1 {
                margin: 0;
                font-size: clamp(28px, 4vw, 40px);
                line-height: 1.1;
                letter-spacing: -0.035em;
            }
            .media-section-title {
                margin: 24px 0 12px;
                color: var(--text-secondary);
                font-size: 14px;
                font-weight: 600;
            }

            .media-feature-row {
                display: grid;
                grid-auto-flow: column;
                grid-auto-columns: minmax(168px, 22%);
                gap: 14px;
                overflow-x: auto;
                padding: 2px 0 6px;
                scroll-snap-type: x proximity;
            }
            .media-frequency-row {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 14px;
            }
            .media-home-card {
                position: relative;
                min-width: 0;
                min-height: 164px;
                padding: 0;
                overflow: hidden;
                border: 1px solid var(--border-color);
                border-radius: 18px;
                background: var(--bg-tertiary);
                color: #fff;
                text-align: left;
                cursor: pointer;
                scroll-snap-align: start;
                transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
            }
            .media-home-card.is-featured { min-height: 210px; }
            .media-home-card:hover {
                transform: translateY(-2px);
                border-color: rgba(var(--accent-rgb, 0, 120, 212), .36);
                box-shadow: 0 10px 24px rgba(0, 0, 0, .12);
            }
            .media-home-card.active {
                box-shadow: inset 0 0 0 2px var(--media-accent), 0 8px 20px rgba(0, 0, 0, .12);
            }
            .media-card-art,
            .media-card-shade {
                position: absolute;
                inset: 0;
                display: grid;
                place-items: center;
                background-position: center;
                background-size: cover;
            }
            .media-card-shade { background: linear-gradient(180deg, transparent 30%, rgba(0,0,0,.76)); }
            .media-card-placeholder-icon { width: 42px; height: 42px; filter: invert(1); opacity: .86; }
            .media-home-card .media-card-label,
            .media-home-card > strong,
            .media-home-card > small {
                position: absolute;
                z-index: 2;
                left: 16px;
                right: 14px;
            }
            .media-card-label { bottom: 54px; font-size: 12px; opacity: .86; }
            .media-home-card > strong {
                bottom: 31px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-size: 17px;
            }
            .media-home-card > small {
                bottom: 13px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                opacity: .82;
                font-size: 12px;
            }
            .media-home-card.is-empty { padding: 18px; color: var(--text-primary); }

            .media-library-panel,
            .media-settings-panel,
            .media-now-hero,
            .media-video-shell {
                margin-top: 20px;
                border: 1px solid var(--border-color);
                border-radius: 18px;
                background: var(--bg-tertiary);
            }
            .media-library-panel { padding: 18px; }
            .media-panel-head { display: flex; justify-content: space-between; margin-bottom: 12px; }
            .media-panel-kicker { color: var(--text-secondary); font-size: 12px; }
            .media-panel-head h2 { margin: 3px 0 0; font-size: 20px; }
            .media-track-list { display: grid; gap: 4px; }
            .media-track {
                display: grid;
                grid-template-columns: 42px 28px minmax(0, 1fr) 72px 58px;
                align-items: center;
                gap: 10px;
                width: 100%;
                min-height: 54px;
                padding: 6px 10px;
                border: 0;
                border-radius: 10px;
                background: transparent;
                color: var(--text-primary);
                text-align: left;
                cursor: pointer;
            }
            .media-track:hover { background: var(--bg-hover); }
            .media-track.active { background: rgba(var(--accent-rgb, 0, 120, 212), .14); }
            .media-track-index,
            .media-track-type,
            .media-track-duration { color: var(--text-secondary); font-size: 12px; }
            .media-track-main { min-width: 0; display: grid; gap: 2px; }
            .media-track-main strong,
            .media-track-main em { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .media-track-main strong { font-size: 14px; }
            .media-track-main em { color: var(--text-secondary); font-size: 12px; font-style: normal; }

            .media-small-art,
            .media-large-art {
                display: block;
                object-fit: cover;
                background-position: center;
                background-size: cover;
            }
            .media-small-art { width: 42px; height: 42px; border-radius: 9px; }
            .media-large-art { width: 148px; height: 148px; border-radius: 20px; }
            .media-art-placeholder { display: grid; place-items: center; }
            .media-art-placeholder .media-symbol { width: 42%; height: 42%; filter: invert(1); opacity: .86; }

            .media-settings-panel { display: grid; overflow: hidden; }
            .media-settings-option {
                display: grid;
                grid-template-columns: 40px minmax(0, 1fr);
                align-items: center;
                gap: 12px;
                min-height: 64px;
                padding: 10px 16px;
                border: 0;
                border-bottom: 1px solid var(--border-color);
                background: transparent;
                color: var(--text-primary);
                text-align: left;
                cursor: pointer;
            }
            .media-settings-option:last-child { border-bottom: 0; }
            .media-settings-option:hover { background: var(--bg-hover); }
            .media-settings-option > span { grid-row: 1 / span 2; display: grid; place-items: center; }
            .media-settings-option .media-symbol { width: 22px; height: 22px; }
            .media-settings-option small { color: var(--text-secondary); }
            .media-settings-danger { color: var(--error, #c42b1c); }

            .media-import-empty,
            .media-library-loading,
            .media-empty {
                min-height: 100%;
                display: grid;
                place-content: center;
                justify-items: center;
                text-align: center;
            }
            .media-import-empty-card {
                width: min(480px, 100%);
                display: grid;
                justify-items: center;
            }
            .media-empty-icon.media-symbol { width: 52px; height: 52px; opacity: .72; }
            .media-import-empty h1,
            .media-empty h3 { margin: 14px 0 6px; }
            .media-import-empty p,
            .media-empty p { margin: 0; color: var(--text-secondary); line-height: 1.6; }
            .media-import-actions {
                width: min(360px, 100%);
                display: grid;
                gap: 10px;
                margin-top: 20px;
            }
            .media-import-actions .fluent-btn { width: 100%; }
            .media-library-loading { gap: 14px; color: var(--text-secondary); }

            .media-now-hero { display: flex; align-items: center; gap: 22px; padding: 20px; }
            .media-now-hero p { margin: 0; color: var(--text-secondary); }
            .media-now-hero h2 { margin: 5px 0; font-size: 28px; }
            .media-now-hero span { color: var(--text-secondary); }
            .media-video-shell { padding: 12px; overflow: hidden; }
            .media-video { display: block; width: 100%; max-height: 420px; border-radius: 12px; background: #000; }
            .media-video-title { display: flex; justify-content: space-between; gap: 12px; padding: 10px 4px 0; }
            .media-video-title span { color: var(--text-secondary); }

            .media-player-bar {
                position: absolute;
                z-index: 20;
                left: 32px;
                right: 32px;
                bottom: 18px;
                min-height: 68px;
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
                align-items: center;
                gap: 16px;
                padding: 8px 12px;
                border: 1px solid var(--border-color);
                border-radius: 16px;
                background: var(--bg-tertiary);
                box-shadow: 0 8px 24px rgba(0,0,0,.12);
                box-sizing: border-box;
            }
            .media-player-bar.is-hidden { display: none; }
            .media-now-card { min-width: 0; display: flex; align-items: center; gap: 10px; cursor: pointer; }
            .media-now-card > div:last-child { min-width: 0; display: grid; gap: 2px; }
            .media-now-card strong,
            .media-now-card span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .media-now-card span { color: var(--text-secondary); font-size: 12px; }
            .media-button-row,
            .media-options { display: flex; align-items: center; justify-content: center; gap: 6px; }
            .media-options { justify-content: flex-end; }
            .media-button-row button,
            .media-options button,
            .media-expanded button {
                width: 36px;
                height: 36px;
                display: grid;
                place-items: center;
                padding: 0;
                border: 0;
                border-radius: 50%;
                background: transparent;
                color: var(--text-primary);
                cursor: pointer;
            }
            .media-button-row button:hover,
            .media-options button:hover,
            .media-expanded button:hover { background: var(--bg-hover); }
            .media-play-btn { background: var(--media-accent) !important; }
            .media-play-btn .media-symbol { filter: brightness(0) invert(1) !important; }
            .media-options button.active { color: var(--media-accent); }
            .media-symbol { width: 20px; height: 20px; pointer-events: none; }
            .dark-mode .media-symbol { filter: invert(1); }
            .media-hidden-input,
            #media-system-audio-host { position: fixed; width: 1px; height: 1px; opacity: 0; pointer-events: none; overflow: hidden; }

            .media-native-range {
                width: 100%;
                height: 18px;
                margin: 0;
                accent-color: var(--media-accent);
                cursor: pointer;
            }
            .media-expanded {
                position: absolute;
                z-index: 40;
                inset: 0;
                display: grid;
                grid-template-columns: minmax(220px, .8fr) minmax(300px, 1.2fr);
                grid-template-areas: 'art info' 'art progress' 'art controls' 'art aux';
                align-content: center;
                align-items: center;
                gap: 18px 38px;
                padding: 56px clamp(32px, 6vw, 76px);
                box-sizing: border-box;
                overflow: hidden;
                background: var(--bg-primary);
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
                transition: opacity .2s ease, visibility .2s ease;
            }
            .media-expanded.active { opacity: 1; visibility: visible; pointer-events: auto; }
            .media-expanded-bg { position: absolute; inset: -12%; background-position: center !important; background-size: cover !important; filter: blur(70px); opacity: .2; transform: scale(1.1); }
            .media-expanded::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, color-mix(in srgb, var(--bg-primary) 88%, transparent), color-mix(in srgb, var(--bg-primary) 74%, transparent)); }
            .media-expanded > *:not(.media-expanded-bg) { position: relative; z-index: 2; }
            .media-collapse-btn { position: absolute !important; top: 18px; left: 22px; }
            .media-expanded-art { grid-area: art; justify-self: end; width: min(34vw, 330px); aspect-ratio: 1; border-radius: 24px; background-position: center !important; background-size: cover !important; box-shadow: 0 18px 50px rgba(0,0,0,.25); display: grid; place-items: center; }
            .media-expanded-placeholder-icon { width: 72px; height: 72px; filter: invert(1); opacity: .8; }
            .media-expanded-info { grid-area: info; min-width: 0; display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; }
            .media-expanded-info h2 { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: clamp(28px, 4vw, 46px); }
            .media-expanded-info p { margin: 7px 0 0; color: var(--text-secondary); font-size: 17px; }
            .media-expanded-progress-row { grid-area: progress; display: grid; gap: 5px; }
            .media-time-row { display: flex; justify-content: space-between; color: var(--text-secondary); font-size: 12px; }
            .media-expanded-controls { grid-area: controls; display: flex; align-items: center; justify-content: center; gap: 10px; }
            .media-expanded-controls button { width: 44px; height: 44px; background: var(--bg-tertiary); }
            .media-expanded-controls .media-expanded-play { width: 54px; height: 54px; }
            .media-expanded-aux { grid-area: aux; }
            .media-volume { display: grid; grid-template-columns: 36px minmax(0, 220px); align-items: center; gap: 10px; }
            .media-expanded-options { position: relative; }
            .media-expanded-options-menu,
            .media-expanded-speed-menu {
                position: absolute;
                z-index: 60;
                right: 0;
                top: calc(100% + 8px);
                display: grid;
                gap: 4px;
                min-width: 190px;
                padding: 6px;
                border: 1px solid var(--border-color);
                border-radius: 12px;
                background: var(--bg-secondary);
                box-shadow: var(--shadow-lg);
                opacity: 0;
                visibility: hidden;
                transform: translateY(-4px);
                transition: opacity .15s ease, transform .15s ease, visibility .15s ease;
            }
            .media-expanded-speed-menu { right: calc(100% + 8px); top: 0; }
            .media-expanded-options.is-open .media-expanded-options-menu,
            .media-expanded-options.speed-open .media-expanded-speed-menu { opacity: 1; visibility: visible; transform: none; }
            .media-expanded-option,
            .media-expanded-speed-option {
                width: 100% !important;
                min-height: 36px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                gap: 12px;
                padding: 0 10px !important;
                border-radius: 8px !important;
                background: transparent !important;
                text-align: left;
            }
            .media-expanded-option:hover,
            .media-expanded-speed-option:hover,
            .media-expanded-option.active,
            .media-expanded-speed-option.active { background: var(--bg-hover) !important; color: var(--media-accent); }
            .media-expanded-option em { color: var(--text-secondary); font-size: 12px; font-style: normal; }

            @media (max-width: 900px) {
                .media-fw-app { padding: 20px 22px 0; }
                .media-player-bar { left: 22px; right: 22px; }
                .media-feature-row { grid-auto-columns: minmax(160px, 38%); }
                .media-frequency-row { grid-template-columns: 1fr 1fr; }
                .media-track { grid-template-columns: 42px minmax(0,1fr) 54px; }
                .media-track-index, .media-track-type { display: none; }
                .media-expanded { grid-template-columns: 1fr; grid-template-areas: 'art' 'info' 'progress' 'controls' 'aux'; gap: 12px; padding: 48px 26px 24px; overflow: auto; }
                .media-expanded-art { justify-self: center; width: min(38vh, 260px); }
            }
            @media (max-width: 680px) {
                .media-frequency-row { grid-template-columns: 1fr; }
                .media-player-bar { grid-template-columns: minmax(0,1fr) auto; }
                .media-options { display: none; }
                .media-now-card span { display: none; }
                .media-feature-row { grid-auto-columns: 72%; }
            }

            /* Restore the original floating pill and cinematic second-level
               player while retaining the FluentWindow application shell. */
            .media-player-bar {
                left: 50% !important;
                right: auto !important;
                bottom: 18px !important;
                width: min(760px, calc(100% - 64px)) !important;
                min-height: 68px !important;
                padding: 8px 14px !important;
                border: 1px solid rgba(255,255,255,.48) !important;
                border-radius: 999px !important;
                background: rgba(252,252,252,.76) !important;
                box-shadow: 0 14px 38px rgba(0,0,0,.16) !important;
                backdrop-filter: blur(24px) saturate(160%) !important;
                -webkit-backdrop-filter: blur(24px) saturate(160%) !important;
                cursor: pointer;
                transform: translateX(-50%) !important;
                transform-origin: center bottom !important;
                transition:
                    opacity 360ms cubic-bezier(.16,1,.3,1),
                    filter 520ms cubic-bezier(.16,1,.3,1),
                    transform 520ms cubic-bezier(.16,1,.3,1) !important;
            }
            body.dark-mode .media-player-bar {
                border-color: rgba(255,255,255,.12) !important;
                background: rgba(32,32,32,.76) !important;
                box-shadow: 0 16px 42px rgba(0,0,0,.36) !important;
            }
            .media-player-bar .media-small-art { width: 46px; height: 46px; border-radius: 13px; }
            .media-player-bar .media-play-btn {
                width: 42px !important;
                height: 42px !important;
                border: 1px solid rgba(0,0,0,.08) !important;
                background: rgba(255,255,255,.86) !important;
                box-shadow: 0 4px 14px rgba(0,0,0,.1) !important;
            }
            .media-player-bar .media-play-btn .media-symbol { filter: brightness(0) !important; }
            body.dark-mode .media-player-bar .media-play-btn {
                border-color: rgba(255,255,255,.14) !important;
                background: rgba(255,255,255,.16) !important;
            }
            body.dark-mode .media-player-bar .media-play-btn .media-symbol { filter: brightness(0) invert(1) !important; }
            .media-app.player-expanded .media-player-bar,
            .media-app:has(.media-expanded.active) .media-player-bar {
                opacity: 0 !important;
                pointer-events: none !important;
                filter: blur(12px) saturate(.92) !important;
                transform: translateX(-50%) translateY(22px) scale(.86) !important;
            }

            .media-expanded {
                --media-art-size: clamp(180px, min(35cqw, 62cqh), 380px);
                --media-control-width: clamp(250px, 43cqw, 520px);
                --media-title-size: clamp(30px, 4.5cqw, 56px);
                --media-subtitle-size: clamp(14px, 1.55cqw, 19px);
                --media-control-size: clamp(38px, 3.8cqw, 48px);
                --media-play-size: clamp(52px, 5cqw, 60px);
                --media-layout-shift: clamp(30px, 5.5cqw, 54px);
                visibility: visible !important;
                display: grid !important;
                grid-template-columns: var(--media-art-size) minmax(0,1fr) !important;
                grid-template-areas: 'art info' 'art progress' 'art controls' 'art aux' !important;
                row-gap: clamp(10px, 1.8cqh, 18px) !important;
                column-gap: clamp(24px, 4cqw, 52px) !important;
                padding:
                    clamp(22px, 5cqh, 56px)
                    clamp(18px, 3cqw, 38px)
                    clamp(22px, 5cqh, 56px)
                    clamp(42px, 8cqw, 92px) !important;
                overflow: hidden !important;
                pointer-events: none !important;
                opacity: 0 !important;
                border-radius: 999px !important;
                transform-origin: var(--media-origin-x, 50%) var(--media-origin-y, calc(100% - 54px)) !important;
                transform: scale(.18) !important;
                clip-path: inset(
                    var(--media-collapse-top, calc(100% - 90px))
                    var(--media-collapse-right, 24%)
                    var(--media-collapse-bottom, 18px)
                    var(--media-collapse-left, 24%)
                    round 999px
                ) !important;
                background:
                    radial-gradient(circle at 22% 14%, color-mix(in srgb, var(--media-theme-c,#d8f3ff) 54%, transparent), transparent 36%),
                    color-mix(in srgb, var(--media-theme-a,#5ac8fa) 16%, rgba(248,249,255,.5)) !important;
                backdrop-filter: blur(34px) saturate(160%) !important;
                -webkit-backdrop-filter: blur(34px) saturate(160%) !important;
                transition:
                    opacity 260ms cubic-bezier(.16,1,.3,1),
                    transform 660ms cubic-bezier(.16,1,.3,1),
                    border-radius 660ms cubic-bezier(.16,1,.3,1),
                    clip-path 660ms cubic-bezier(.16,1,.3,1),
                    grid-template-columns 480ms cubic-bezier(.16,1,.3,1),
                    column-gap 480ms cubic-bezier(.16,1,.3,1),
                    row-gap 480ms cubic-bezier(.16,1,.3,1),
                    padding 480ms cubic-bezier(.16,1,.3,1) !important;
            }
            .media-expanded.active {
                visibility: visible !important;
                pointer-events: auto !important;
                opacity: 1 !important;
                border-radius: 0 !important;
                transform: scale(1) !important;
                clip-path: inset(0 0 0 0 round 0) !important;
            }
            .media-expanded::before {
                content: '';
                position: absolute;
                z-index: 0;
                inset: -46%;
                pointer-events: none;
                opacity: .96;
                background:
                    radial-gradient(circle at 12% 20%, color-mix(in srgb, var(--media-theme-a,#5ac8fa) 96%, transparent), transparent 28%),
                    radial-gradient(circle at 86% 14%, color-mix(in srgb, var(--media-theme-b,#0078d4) 90%, transparent), transparent 32%),
                    radial-gradient(circle at 66% 84%, color-mix(in srgb, var(--media-theme-c,#d8f3ff) 94%, transparent), transparent 35%),
                    linear-gradient(145deg, var(--media-theme-a,#5ac8fa), var(--media-theme-b,#0078d4) 48%, var(--media-theme-c,#d8f3ff));
                background-size: 180% 180%;
                filter: blur(50px) saturate(1.62) brightness(1.1);
                animation: mediaFluentThemeDrift 14s cubic-bezier(.45,0,.2,1) infinite alternate;
                transition: opacity 2.6s cubic-bezier(.16,1,.3,1), filter 2.6s cubic-bezier(.16,1,.3,1);
            }
            .media-expanded::after {
                content: '';
                position: absolute;
                z-index: 1;
                inset: 0;
                pointer-events: none;
                background:
                    linear-gradient(180deg, rgba(255,255,255,.36), rgba(255,255,255,.12) 42%, rgba(255,255,255,.28)),
                    radial-gradient(circle at 50% 8%, rgba(255,255,255,.46), transparent 38%) !important;
                transition: opacity 1.1s cubic-bezier(.16,1,.3,1), background 1.1s cubic-bezier(.16,1,.3,1) !important;
            }
            body.dark-mode .media-expanded {
                background: color-mix(in srgb, var(--media-theme-b,#12263d) 20%, rgba(16,20,24,.64)) !important;
            }
            body.dark-mode .media-expanded::before { opacity: .78; filter: blur(58px) saturate(1.46) brightness(.9); }
            body.dark-mode .media-expanded::after {
                background: linear-gradient(180deg, rgba(10,12,18,.28), rgba(10,12,18,.46)), radial-gradient(circle at 50% 8%, rgba(255,255,255,.12), transparent 38%) !important;
            }
            .media-expanded-bg {
                z-index: 0 !important;
                opacity: .28 !important;
                filter: blur(62px) saturate(1.28) !important;
                transform: scale(1.22);
                animation: mediaCoverDrift 18s cubic-bezier(.45,0,.2,1) infinite alternate;
                transition: opacity 1.2s cubic-bezier(.16,1,.3,1), filter 1.2s cubic-bezier(.16,1,.3,1) !important;
            }
            .media-expanded.is-paused::before {
                opacity: .54 !important;
                filter: blur(58px) saturate(1.08) brightness(1.12) !important;
                animation-play-state: paused !important;
            }
            .media-expanded.is-playing::before {
                opacity: .98 !important;
                filter: blur(48px) saturate(1.76) brightness(.96) !important;
                animation-play-state: running !important;
            }
            .media-expanded.is-paused::after { opacity: .92; }
            .media-expanded.is-playing::after { opacity: .58; }
            .media-expanded.is-paused .media-expanded-bg {
                opacity: .14 !important;
                filter: blur(68px) saturate(.92) brightness(1.12) !important;
                animation-play-state: paused !important;
            }
            .media-expanded.is-playing .media-expanded-bg {
                opacity: .36 !important;
                filter: blur(56px) saturate(1.52) brightness(.94) !important;
                animation-play-state: running !important;
            }
            .media-expanded:not(.active)::before,
            .media-expanded:not(.active) .media-expanded-bg { animation-play-state: paused !important; }
            body.dark-mode .media-expanded.is-paused::before { opacity: .38 !important; filter: blur(64px) saturate(.92) brightness(.72) !important; }
            body.dark-mode .media-expanded.is-playing::before { opacity: .82 !important; filter: blur(54px) saturate(1.56) brightness(.86) !important; }
            body.dark-mode .media-expanded.is-paused::after { opacity: .86; }
            body.dark-mode .media-expanded.is-playing::after { opacity: .62; }
            .media-collapse-btn,
            .media-expanded-art,
            .media-expanded-info,
            .media-expanded-progress-row,
            .media-expanded-controls,
            .media-expanded-aux { position: relative !important; z-index: 2 !important; }
            .media-expanded-art,
            .media-expanded-info,
            .media-expanded-progress-row,
            .media-expanded-controls,
            .media-expanded-aux {
                transition:
                    opacity 520ms cubic-bezier(.16,1,.3,1),
                    transform 620ms cubic-bezier(.16,1,.3,1),
                    width 480ms cubic-bezier(.16,1,.3,1),
                    height 480ms cubic-bezier(.16,1,.3,1),
                    border-radius 480ms cubic-bezier(.16,1,.3,1) !important;
            }
            .media-expanded:not(.active) .media-expanded-art { transform: translate(-26%,48%) scale(.32) !important; opacity: 0 !important; }
            .media-expanded:not(.active) .media-expanded-info,
            .media-expanded:not(.active) .media-expanded-progress-row,
            .media-expanded:not(.active) .media-expanded-controls,
            .media-expanded:not(.active) .media-expanded-aux { transform: translateY(28px) scale(.96) !important; opacity: 0 !important; }
            .media-expanded.active .media-expanded-art,
            .media-expanded.active .media-expanded-info,
            .media-expanded.active .media-expanded-progress-row,
            .media-expanded.active .media-expanded-controls,
            .media-expanded.active .media-expanded-aux {
                transform: translateX(var(--media-layout-shift)) !important;
            }
            .media-expanded-art,
            .media-expanded-bg {
                background: var(--media-expanded-art-bg, var(--media-theme-a,#5ac8fa)) !important;
                background-position: center !important;
                background-size: cover !important;
            }
            .media-expanded-art {
                width: var(--media-art-size) !important;
                height: var(--media-art-size) !important;
                max-width: none !important;
                border-radius: clamp(18px, 2.2cqw, 26px) !important;
                justify-self: end !important;
                align-self: center !important;
            }
            .media-expanded-info {
                width: min(100%, calc(var(--media-control-width) + 56px));
                align-self: end;
            }
            .media-expanded-info h2 {
                font-size: var(--media-title-size) !important;
                line-height: 1.04 !important;
                transition: font-size 480ms cubic-bezier(.16,1,.3,1), line-height 480ms cubic-bezier(.16,1,.3,1) !important;
            }
            .media-expanded-info p {
                font-size: var(--media-subtitle-size) !important;
                transition: font-size 480ms cubic-bezier(.16,1,.3,1), margin 480ms cubic-bezier(.16,1,.3,1) !important;
            }
            .media-expanded-progress-row,
            .media-expanded-controls,
            .media-expanded-aux {
                width: min(100%, var(--media-control-width)) !important;
                justify-self: start !important;
                box-sizing: border-box;
            }
            .media-expanded-progress,
            .media-expanded-progress.fluent-slider,
            .media-expanded-aux .media-volume-slider,
            .media-expanded-aux .media-volume-slider.fluent-slider {
                width: 100% !important;
                min-width: 0 !important;
                max-width: none !important;
                box-sizing: border-box !important;
            }
            .media-expanded-aux .media-volume {
                display: grid !important;
                grid-template-columns: clamp(24px, 2.7cqw, 30px) minmax(0, 1fr) clamp(24px, 2.7cqw, 30px) !important;
                align-items: center !important;
                gap: clamp(8px, 1cqw, 12px) !important;
                width: 100% !important;
                min-width: 0 !important;
                margin: 0 !important;
            }
            .media-expanded-aux .media-volume-icon {
                display: grid;
                place-items: center;
                width: 100%;
                height: 30px;
                color: var(--text-primary);
            }
            .media-expanded-aux .media-volume-icon .media-symbol {
                width: clamp(17px, 1.8cqw, 20px) !important;
                height: clamp(17px, 1.8cqw, 20px) !important;
            }
            .media-expanded-controls button {
                width: var(--media-control-size) !important;
                min-width: var(--media-control-size) !important;
                height: var(--media-control-size) !important;
                transition: width 480ms cubic-bezier(.16,1,.3,1), min-width 480ms cubic-bezier(.16,1,.3,1), height 480ms cubic-bezier(.16,1,.3,1), transform 220ms cubic-bezier(.16,1,.3,1) !important;
            }
            .media-expanded-meta button,
            .media-expanded-controls button,
            .media-collapse-btn {
                border: 1px solid rgba(255,255,255,.28) !important;
                background: rgba(255,255,255,.28) !important;
                backdrop-filter: blur(18px) saturate(145%) !important;
                -webkit-backdrop-filter: blur(18px) saturate(145%) !important;
            }
            body.dark-mode .media-expanded-meta button,
            body.dark-mode .media-expanded-controls button,
            body.dark-mode .media-collapse-btn { border-color: rgba(255,255,255,.12) !important; background: rgba(255,255,255,.1) !important; }
            .media-expanded-controls .media-expanded-play {
                width: var(--media-play-size) !important;
                min-width: var(--media-play-size) !important;
                height: var(--media-play-size) !important;
                background: rgba(255,255,255,.76) !important;
            }
            .media-expanded-play .media-symbol { filter: brightness(0) !important; }
            .media-app.player-collapsing .media-expanded { pointer-events: none !important; }
            .media-app.player-collapsing .media-expanded:not(.active) {
                opacity: 0 !important;
                transition: opacity 300ms cubic-bezier(.5,0,.2,1), transform 660ms cubic-bezier(.16,1,.3,1), border-radius 660ms cubic-bezier(.16,1,.3,1), clip-path 660ms cubic-bezier(.16,1,.3,1) !important;
            }
            @keyframes mediaFluentThemeDrift {
                0% { transform: translate3d(-9%,-6%,0) scale(1.12) rotate(-2deg); background-position: 0% 34%; }
                50% { transform: translate3d(8%,-8%,0) scale(1.18) rotate(6deg); background-position: 62% 14%; }
                100% { transform: translate3d(-7%,11%,0) scale(1.2) rotate(4deg); background-position: 18% 100%; }
            }
            @keyframes mediaCoverDrift {
                0% { transform: translate3d(-3%,-2%,0) scale(1.2) rotate(-1deg); }
                50% { transform: translate3d(3%,-4%,0) scale(1.27) rotate(2deg); }
                100% { transform: translate3d(2%,4%,0) scale(1.24) rotate(-2deg); }
            }
            @container media-player (max-width: 780px) and (min-width: 601px) {
                .media-expanded {
                    --media-art-size: clamp(170px, min(34cqw, 58cqh), 280px);
                    --media-control-width: clamp(235px, 43cqw, 360px);
                    --media-title-size: clamp(28px, 5cqw, 40px);
                    column-gap: clamp(20px, 3.5cqw, 32px) !important;
                    padding-left: clamp(30px, 5cqw, 42px) !important;
                    padding-right: clamp(16px, 2.5cqw, 24px) !important;
                }
            }
            @container media-player (max-height: 480px) and (min-width: 601px) {
                .media-expanded {
                    --media-art-size: clamp(150px, min(30cqw, 58cqh), 250px);
                    --media-control-width: clamp(230px, 42cqw, 440px);
                    --media-title-size: clamp(25px, 4cqw, 38px);
                    row-gap: 8px !important;
                    padding-top: 16px !important;
                    padding-bottom: 16px !important;
                }
                .media-expanded-info p { margin-top: 3px !important; }
            }
            @container media-player (max-width: 600px) or (max-aspect-ratio: 4 / 5) {
                .media-player-bar { width: calc(100% - 24px) !important; bottom: 12px !important; }
                .media-expanded {
                    --media-art-size: clamp(180px, min(68cqw, 34cqh), 300px);
                    --media-control-width: min(78cqw, 420px);
                    --media-title-size: clamp(25px, 8cqw, 36px);
                    --media-subtitle-size: clamp(14px, 4cqw, 18px);
                    --media-layout-shift: 0px;
                    grid-template-columns: 1fr !important;
                    grid-template-areas: 'art' 'info' 'progress' 'controls' 'aux' !important;
                    align-content: center !important;
                    row-gap: clamp(9px, 1.5cqh, 14px) !important;
                    padding: 48px 18px 22px !important;
                    overflow: auto !important;
                    text-align: center;
                }
                .media-expanded-art { justify-self: center !important; }
                .media-expanded-info,
                .media-expanded-progress-row,
                .media-expanded-controls,
                .media-expanded-aux { justify-self: center !important; }
                .media-expanded-info { justify-content: center !important; align-items: center !important; }
                .media-expanded-meta { position: absolute; right: 0; top: 0; }
                .media-expanded-aux .media-volume { margin: 0 auto !important; }
            }
        `;
        document.head.appendChild(style);
    },

};

if (typeof window !== 'undefined') {
    window.MediaApp = MediaApp;
    // Warm the persisted queue independently of the window. Reopening Media is
    // then immediate, and the desktop widget can play without launching it.
    setTimeout(() => { void MediaApp.ensureLibraryReady(); }, 0);
}
