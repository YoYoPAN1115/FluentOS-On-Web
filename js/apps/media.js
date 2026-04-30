/**
 * Built-in multimedia player.
 * Supports local audio/video files and folder imports.
 */
const MediaApp = {
    windowId: null,
    container: null,
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
    volume: 0.72,
    muted: false,
    playerExpanded: false,
    expandTransitionTimer: null,
    collapseShrinkTimer: null,
    mediaStorageKey: 'fluentos.media.library.v1',
    mediaDbName: 'FluentOSMediaLibrary',
    mediaDbStore: 'files',
    restoreStarted: false,
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
        this.render();
        this.startProgressLoop();
        this.restoreLibraryFromStorage();
    },

    destroy() {
        const media = this.mediaElement;
        if (media) media.pause();
        this.stopProgressLoop();
        this.revokeObjectUrls();
    },

    beforeClose() {
        this.destroy();
        this.library = [];
        this.currentIndex = -1;
        this.restoreStarted = false;
        return true;
    },

    get activeItem() {
        return this.library[this.currentIndex] || null;
    },

    get mediaElement() {
        return this.container?.querySelector('#media-player-element') || null;
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

    localText(key) {
        const zh = (document.documentElement.lang || '').toLowerCase().startsWith('zh');
        const text = {
            app: zh ? '多媒体' : 'Multimedia',
            search: zh ? '搜索' : 'Search',
            library: zh ? '我的媒体' : 'Library',
            recent: zh ? '最近播放的内容' : 'Recently played',
            now: zh ? '正在播放' : 'Now playing',
            playlist: zh ? '播放列表' : 'Playlist',
            openFiles: zh ? '打开文件' : 'Open files',
            openFolder: zh ? '导入文件夹' : 'Import folder',
            emptyTitle: zh ? '打开本地音乐或视频' : 'Open local music or video',
            emptyDesc: zh ? '支持单个文件和文件夹导入，音乐会自动读取可用的封面与歌手信息。' : 'Import files or a folder. Music artwork and artist tags are read when available.',
            unsupportedFolder: zh ? '当前浏览器不支持直接选择文件夹，请使用文件夹导入兼容模式。' : 'This browser cannot open folders directly. Use the compatible folder picker.',
            noMatch: zh ? '没有匹配的媒体' : 'No matching media',
            unknownArtist: zh ? '未知艺术家' : 'Unknown artist',
            unknownAlbum: zh ? '未知专辑' : 'Unknown album',
            unknownTitle: zh ? '未命名媒体' : 'Untitled media',
            audio: zh ? '音乐' : 'Music',
            video: zh ? '视频' : 'Video',
            all: zh ? '全部' : 'All',
            speed: zh ? '倍速' : 'Speed',
            volume: zh ? '音量' : 'Volume',
            fullscreen: zh ? '全屏' : 'Fullscreen',
            frequent: zh ? '\u9ad8\u9891\u64ad\u653e' : 'Frequent plays',
            forYou: zh ? '\u731c\u4f60\u559c\u6b22' : 'For You',
            settings: zh ? '\u8bbe\u7f6e' : 'Settings',
            importSong: zh ? '\u5bfc\u5165\u65b0\u7684\u6b4c\u66f2' : 'Import new songs',
            importFolder: zh ? '\u5bfc\u5165\u65b0\u7684\u6587\u4ef6\u5939' : 'Import new folder',
            clearLibrary: zh ? '\u6e05\u7a7a\u5df2\u5bfc\u5165\u7684\u6b4c\u66f2' : 'Clear imported songs',
            clearLibraryDesc: zh ? '\u79fb\u9664\u5f53\u524d\u5a92\u4f53\u5e93\u91cc\u4fdd\u5b58\u7684\u6240\u6709\u672c\u5730\u6b4c\u66f2\u548c\u89c6\u9891\u8bb0\u5f55\u3002' : 'Remove all imported local songs and videos from the media library.'
        };
        return text[key] || key;
    },

    render() {
        const playbackState = this.capturePlaybackState();
        const current = this.activeItem;
        const filteredItems = this.getFilteredItems();
        const preservedAudio = this.detachReusableAudio(current);
        this.container.innerHTML = `
            <div class="media-app ${this.playerExpanded ? 'player-expanded' : ''}">
                <aside class="media-sidebar">
                    <label class="media-search">
                        <input id="media-search-input" type="search" value="${this.escapeAttr(this.searchQuery)}" placeholder="${this.localText('search')}">
                        <span>${this.symbolIcon('Search.svg')}</span>
                    </label>
                    <nav class="media-nav">
                        ${this.renderNavItem('library', 'Music.svg', this.localText('library'))}
                        ${this.renderNavItem('recent', 'Clock.svg', this.localText('recent'))}
                        ${this.renderNavItem('now', 'Media Reel V.svg', this.localText('now'))}
                        ${this.renderNavItem('playlist', 'Playlist.svg', this.localText('playlist'))}
                    </nav>
                    <div class="media-sidebar-bottom">
                        ${this.renderNavItem('settings', 'Settings.svg', this.localText('settings'))}
                    </div>
                </aside>

                <main class="media-main">
                    ${this.renderMainContent(filteredItems, current)}
                </main>

                ${this.renderExpandedPlayer(current)}

                <footer class="media-player-bar ${this.library.length ? '' : 'is-hidden'}">
                    <div class="media-now-card" data-action="expand-player">
                        ${this.renderSmallArt(current)}
                        <div>
                            <strong>${this.escapeHtml(current?.title || this.localText('emptyTitle'))}</strong>
                            <span>${this.escapeHtml(current?.artist || current?.typeLabel || this.localText('unknownArtist'))}</span>
                        </div>
                    </div>
                    <div class="media-controls">
                        <div class="media-button-row">
                            <button data-action="previous" title="Previous">${this.symbolIcon('Previous.svg')}</button>
                            <button class="media-play-btn" data-action="play-toggle" title="Play">${this.symbolIcon('Play.svg')}</button>
                            <button data-action="next" title="Next">${this.symbolIcon('Next.svg')}</button>
                        </div>
                    </div>
                    <div class="media-options">
                        <button data-action="shuffle" class="${this.isShuffle ? 'active' : ''}" title="Shuffle">${this.symbolIcon('Exchange A.svg')}</button>
                        <button data-action="expand-player" title="Expand">${this.symbolIcon('Playlist.svg')}</button>
                    </div>

                    <input class="media-hidden-input" id="media-file-input" type="file" multiple accept="audio/*,video/*">
                    <input class="media-hidden-input" id="media-folder-input" type="file" webkitdirectory multiple accept="audio/*,video/*">
                </footer>
            </div>
        `;
        this.applyFluentScrollAreas();
        this.attachReusableAudio(preservedAudio);
        this.bindEvents();
        this.loadCurrentMedia(false);
        if (!preservedAudio) {
            this.restorePlaybackState(playbackState);
        }
        this.updateProgressUi();
        if (this.playerExpanded) {
            requestAnimationFrame(() => this.updateExpandedAnimationOrigin());
        }
    },

    detachReusableAudio(current) {
        const media = this.mediaElement;
        if (!media || media.tagName !== 'AUDIO' || current?.type !== 'audio' || media.dataset.itemId !== current.id) {
            return null;
        }
        media.remove();
        return media;
    },

    attachReusableAudio(media) {
        if (!media || !this.container) return;
        media.className = 'media-audio-hidden';
        const host = this.container.querySelector('.media-page-shell') || this.container.querySelector('.media-app') || this.container;
        host.appendChild(media);
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
                    <div class="media-filter-group">
                        ${this.renderFilterButton('library', this.localText('all'))}
                        ${this.renderFilterButton('music', this.localText('audio'))}
                        ${this.renderFilterButton('video', this.localText('video'))}
                    </div>
                </div>
                ${current?.type === 'video' ? `<div class="media-video-shell">${this.renderVideoStage(current)}</div>` : ''}
                <div class="media-section-title">\u63a8\u8350\u64ad\u653e</div>
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
                        <button class="media-action-primary" data-action="open-files">${this.localText('openFiles')}</button>
                        <button class="media-action-secondary" data-action="open-folder">${this.localText('openFolder')}</button>
                    </div>
                </div>
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
                ` : this.renderEmptyState('\u6682\u65e0\u64ad\u653e\u8bb0\u5f55', '\u64ad\u653e\u8fc7\u7684\u97f3\u4e50\u548c\u89c6\u9891\u4f1a\u51fa\u73b0\u5728\u8fd9\u91cc\u3002')}
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
                            <p>${this.escapeHtml(current.typeLabel || '')}</p>
                            <h2>${this.escapeHtml(current.title)}</h2>
                            <span>${this.escapeHtml(current.artist || current.album || this.localText('unknownArtist'))}</span>
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
            const coverStyle = hasCover ? `background-image:url('${item.coverUrl}')` : `background:${this.getItemGradient(item)}`;
            return `
                <button class="media-home-card ${featured ? 'is-featured' : ''} ${active ? 'active' : ''} ${hasCover ? '' : 'no-cover'}" data-id="${item.id}" style="${hasCover ? '' : `--media-card-gradient:${this.getItemGradient(item)}`}">
                    <span class="media-card-art" style="${coverStyle}">
                        ${hasCover ? '' : this.symbolIcon(item.type === 'video' ? 'Video Player.svg' : 'Music.svg', 'media-card-placeholder-icon')}
                    </span>
                    <span class="media-card-shade"></span>
                    <span class="media-card-label">${featured ? (index === 0 ? 'Made for You' : item.typeLabel) : item.typeLabel}</span>
                    <strong>${this.escapeHtml(item.title)}</strong>
                    <small>${this.escapeHtml(item.artist || item.album || item.typeLabel)}</small>
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

    getArtBackgroundValue(item) {
        if (item?.coverUrl) {
            return `url("${String(item.coverUrl).replace(/"/g, '\\"')}")`;
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
        }).catch(() => {});
    },

    async readStoredMedia(id) {
        return this.withMediaStore('readonly', (store) => new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        }));
    },

    async restoreLibraryFromStorage() {
        if (this.restoreStarted) return;
        this.restoreStarted = true;
        const manifest = this.getLibraryManifest();
        if (!manifest.length) return;

        const restored = [];
        for (const saved of manifest) {
            try {
                const record = await this.readStoredMedia(saved.id);
                if (!record?.file) continue;
                const item = await this.createMediaItemFromStored({ ...saved, ...record });
                restored.push(item);
                this.loadDuration(item);
            } catch (_) {
                // Ignore stale manifest entries whose blobs are no longer available.
            }
        }

        if (!restored.length) {
            try { localStorage.removeItem(this.mediaStorageKey); } catch (_) {}
            return;
        }
        this.library = restored;
        this.currentIndex = 0;
        this.saveLibraryManifest();
        this.render();
    },

    renderExpandedPlayer(item) {
        const coverStyle = `background:${this.getArtBackgroundValue(item)}`;
        return `
            <section class="media-expanded ${this.playerExpanded ? 'active' : ''}" style="${this.getExpandedThemeStyle(item)}">
                <div class="media-expanded-bg" style="${coverStyle}"></div>
                <button class="media-collapse-btn" data-action="collapse-player" title="Collapse">${this.symbolIcon('Chevron Down.svg')}</button>
                <div class="media-expanded-art" style="${coverStyle}">
                    ${item?.coverUrl ? '' : this.symbolIcon(item?.type === 'video' ? 'Video Player.svg' : 'Music.svg', 'media-expanded-placeholder-icon')}
                </div>
                <div class="media-expanded-info">
                    <div>
                        <h2>${this.escapeHtml(item?.title || this.localText('emptyTitle'))}</h2>
                        <p>${this.escapeHtml(item?.artist || item?.album || this.localText('unknownArtist'))}</p>
                    </div>
                    <div class="media-expanded-meta">
                        <button data-action="shuffle" class="${this.isShuffle ? 'active' : ''}" title="Shuffle">${this.symbolIcon('Exchange A.svg')}</button>
                        <button data-action="repeat" class="${this.repeatMode !== 'none' ? 'active' : ''}" title="Repeat">${this.symbolIcon(this.repeatMode === 'one' ? 'Reload Reverse.svg' : 'Reload.svg')}</button>
                        <button data-action="fullscreen" title="${this.localText('fullscreen')}">${this.symbolIcon('Maximize.svg')}</button>
                    </div>
                </div>
                <div class="media-expanded-progress-row">
                    <input class="media-expanded-progress media-seek" id="media-expanded-progress" type="range" min="0" max="1000" value="0">
                    <div class="media-time-row">
                        <span class="media-current-time">0:00</span>
                        <span class="media-duration">0:00</span>
                    </div>
                </div>
                <div class="media-expanded-controls">
                    <button data-action="skip-back" title="-10s">${this.symbolIcon('Fast Forward Back.svg')}</button>
                    <button data-action="previous" title="Previous">${this.symbolIcon('Previous.svg')}</button>
                    <button class="media-play-btn media-expanded-play" data-action="play-toggle" title="Play">${this.symbolIcon('Play.svg')}</button>
                    <button data-action="next" title="Next">${this.symbolIcon('Next.svg')}</button>
                    <button data-action="skip-forward" title="+10s">${this.symbolIcon('Fast Forward.svg')}</button>
                </div>
                <div class="media-expanded-aux">
                    <label class="media-volume">
                        <button data-action="mute" title="${this.localText('volume')}">${this.symbolIcon(this.muted ? 'Volume Mute.svg' : 'Volume Up.svg')}</button>
                        <input id="media-volume" type="range" min="0" max="1" step="0.01" value="${this.volume}">
                    </label>
                    <label class="media-rate-control">
                        <span>${this.localText('speed')}</span>
                        <select id="media-rate">
                            ${[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => `<option value="${rate}" ${rate === this.playbackRate ? 'selected' : ''}>${rate}x</option>`).join('')}
                        </select>
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
                    <p>${this.escapeHtml(item?.artist || this.localText('unknownArtist'))}${item?.album ? ` - ${this.escapeHtml(item.album)}` : ''}</p>
                </div>
            </div>
        `;
    },

    renderVideoStage(item) {
        return `
            <video id="media-player-element" class="media-video" playsinline preload="metadata"></video>
            <div class="media-video-title">
                <strong>${this.escapeHtml(item.title)}</strong>
                <span>${this.escapeHtml(item.artist || item.typeLabel)}</span>
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
                    <em>${this.escapeHtml(item.artist || item.typeLabel)}</em>
                </span>
                <span class="media-track-type">${item.typeLabel}</span>
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

    applyFluentScrollAreas() {
        if (!this.container || typeof FluentUI === 'undefined' || !FluentUI.ScrollArea) return;
        const main = this.container.querySelector('.media-main');
        if (!main || main.querySelector(':scope > .fluent-scroll-area')) return;

        const content = document.createDocumentFragment();
        while (main.firstChild) content.appendChild(main.firstChild);
        const scrollArea = FluentUI.ScrollArea({
            content,
            className: 'media-main-scroll'
        });
        main.appendChild(scrollArea);
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
            button.addEventListener('click', () => this.handleAction(button.dataset.action));
        });

        this.bindTrackListEvents();

        const searchInput = this.container.querySelector('#media-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.searchQuery = searchInput.value || '';
                this.refreshTrackListOnly();
            });
        }

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
            progress.addEventListener('pointerdown', () => { this.isSeeking = true; });
            progress.addEventListener('input', () => this.previewSeek(Number(progress.value || 0)));
            progress.addEventListener('change', () => this.commitSeek(Number(progress.value || 0)));
            progress.addEventListener('pointerup', () => this.commitSeek(Number(progress.value || 0)));
        });

        const volume = this.container.querySelector('#media-volume');
        if (volume) {
            volume.addEventListener('input', () => {
                this.volume = Number(volume.value || 0);
                this.muted = this.volume === 0;
                this.applyMediaSettings();
            });
        }

        const rate = this.container.querySelector('#media-rate');
        if (rate) {
            rate.addEventListener('change', () => {
                this.playbackRate = Number(rate.value || 1);
                this.applyMediaSettings();
            });
        }

        const media = this.mediaElement;
        if (media) {
            this.bindMediaElementEvents(media);
        }
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

    async handleAction(action) {
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
                this.isShuffle = !this.isShuffle;
                this.render();
                break;
            case 'repeat':
                this.repeatMode = this.repeatMode === 'none' ? 'all' : this.repeatMode === 'all' ? 'one' : 'none';
                this.render();
                break;
            case 'mute':
                this.muted = !this.muted;
                this.applyMediaSettings();
                this.render();
                break;
            case 'fullscreen':
                this.enterFullscreen();
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

        this.collapseShrinkTimer = setTimeout(() => {
            expanded.classList.remove('active');
        }, 300);
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
        this.revokeObjectUrls();
        this.library = [];
        this.currentIndex = -1;
        this.playerExpanded = false;
        try { localStorage.removeItem(this.mediaStorageKey); } catch (_) {}
        try {
            await this.withMediaStore('readwrite', (store) => {
                if (typeof store.clear === 'function') store.clear();
            });
        } catch (_) {}
        this.render();
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
            typeLabel: type === 'video' ? this.localText('video') : this.localText('audio'),
            name: file.name,
            title: metadata.title || base || this.localText('unknownTitle'),
            artist: metadata.artist || (type === 'audio' ? this.localText('unknownArtist') : ''),
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
            typeLabel: item.type === 'video' ? this.localText('video') : this.localText('audio'),
            gradientIndex: Number.isInteger(record.gradientIndex) ? record.gradientIndex : item.gradientIndex,
            recommendRank: Math.random(),
            duration: Number(record.duration || item.duration || 0),
            lastPlayed: Number(record.lastPlayed || 0),
            playCount: Number(record.playCount || 0)
        };
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
        const list = this.container.querySelector('.media-track-list');
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
        this.render();
    },

    async playItemById(id) {
        const index = this.library.findIndex((item) => item.id === id);
        if (index < 0) return;
        this.currentIndex = index;
        this.render();
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
            (this.container.querySelector('.media-home') || this.container).appendChild(media);
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
            }
        } catch (_) {
            this.updatePlayButton();
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
        const seconds = media.duration * (value / 1000);
        this.container.querySelectorAll('#media-current-time, .media-current-time').forEach((currentTime) => {
            currentTime.textContent = this.formatTime(seconds);
        });
    },

    commitSeek(value) {
        const media = this.mediaElement;
        if (!media || !Number.isFinite(media.duration)) return;
        media.currentTime = media.duration * (value / 1000);
        this.isSeeking = false;
        this.updateProgressUi();
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
                progress.value = dur ? String(Math.round((cur / dur) * 1000)) : '0';
            });
        }
        this.container.querySelectorAll('#media-current-time, .media-current-time').forEach((currentTime) => {
            currentTime.textContent = this.formatTime(cur);
        });
        this.container.querySelectorAll('#media-duration, .media-duration').forEach((duration) => {
            duration.textContent = dur ? this.formatTime(dur) : '0:00';
        });
        this.updatePlayButton();
    },

    updatePlayButton() {
        const media = this.mediaElement;
        this.container?.querySelectorAll('.media-play-btn').forEach((button) => {
            button.innerHTML = this.symbolIcon(media && !media.paused ? 'Pause.svg' : 'Play.svg');
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
            artist: item.artist || this.localText('unknownArtist'),
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
            .media-app {
                --media-ease: cubic-bezier(0.16, 1, 0.3, 1);
                display: grid;
                grid-template-columns: 252px minmax(0, 1fr);
                grid-template-rows: minmax(0, 1fr) 132px;
                height: 100%;
                min-height: 0;
                overflow: hidden;
                background: linear-gradient(145deg, rgba(250,252,252,0.94), rgba(225,235,238,0.9));
                color: #25333a;
            }
            .dark-mode .media-app {
                background: linear-gradient(145deg, rgba(25,28,30,0.98), rgba(13,15,17,0.96));
                color: #f6f7f8;
            }
            .media-sidebar {
                grid-row: 1 / 3;
                display: flex;
                flex-direction: column;
                gap: 18px;
                padding: 18px 12px;
                background: rgba(18, 24, 27, 0.92);
                color: white;
                border-right: 1px solid rgba(255,255,255,0.08);
            }
            .media-brand { font-size: 14px; opacity: 0.92; padding: 0 4px 14px; }
            .media-menu-btn {
                width: 42px;
                height: 42px;
                border-radius: 14px;
                color: inherit;
                font-size: 24px;
                transition: background 240ms var(--media-ease), transform 240ms var(--media-ease);
            }
            .media-menu-btn:hover { background: rgba(255,255,255,0.12); transform: translateY(-1px); }
            .media-search {
                display: flex;
                align-items: center;
                gap: 10px;
                height: 48px;
                padding: 0 14px;
                background: rgba(0,0,0,0.38);
                border-radius: 4px;
            }
            .media-search input {
                flex: 1;
                min-width: 0;
                border: 0;
                background: transparent;
                color: white;
                font: inherit;
            }
            .media-search input::placeholder { color: rgba(255,255,255,0.62); }
            .media-search span { font-size: 26px; transform: rotate(-20deg); opacity: 0.9; }
            .media-nav { display: flex; flex-direction: column; gap: 6px; }
            .media-nav-item {
                display: flex;
                align-items: center;
                gap: 16px;
                height: 52px;
                padding: 0 16px;
                border-radius: 4px;
                color: rgba(255,255,255,0.9);
                font-size: 16px;
                text-align: left;
                transition: background 260ms var(--media-ease), color 260ms var(--media-ease), transform 260ms var(--media-ease);
            }
            .media-nav-icon { width: 20px; text-align: center; font-size: 21px; }
            .media-nav-item:hover { background: rgba(255,255,255,0.1); transform: translateX(2px); }
            .media-nav-item.active {
                background: linear-gradient(90deg, rgba(80,190,255,0.24), rgba(80,190,255,0.02));
                box-shadow: inset 4px 0 #55c8ff;
                color: #ffffff;
            }
            .media-app.sidebar-collapsed {
                grid-template-columns: 88px minmax(0, 1fr);
            }
            .media-app.sidebar-collapsed .media-brand,
            .media-app.sidebar-collapsed .media-search,
            .media-app.sidebar-collapsed .media-actions,
            .media-app.sidebar-collapsed .media-nav-item:not(.active) {
                display: none;
            }
            .media-app.sidebar-collapsed .media-nav-item {
                justify-content: center;
                padding: 0;
            }
            .media-app.sidebar-collapsed .media-nav-icon {
                width: auto;
            }
            .media-actions { margin-top: auto; display: grid; gap: 10px; }
            .media-action-primary,
            .media-action-secondary {
                height: 42px;
                border-radius: 999px;
                color: white;
                transition: transform 220ms var(--media-ease), box-shadow 220ms var(--media-ease), background 220ms var(--media-ease);
            }
            .media-action-primary { background: #2f8cff; box-shadow: 0 14px 32px rgba(47,140,255,0.28); }
            .media-action-secondary { background: rgba(255,255,255,0.12); }
            .media-action-primary:hover,
            .media-action-secondary:hover { transform: translateY(-2px); }
            .media-main {
                min-width: 0;
                min-height: 0;
                display: grid;
                grid-template-columns: minmax(360px, 1fr) minmax(300px, 420px);
                gap: 18px;
                padding: 20px;
                overflow: hidden;
            }
            .media-stage,
            .media-library-panel {
                position: relative;
                min-width: 0;
                min-height: 0;
                overflow: hidden;
                border-radius: 26px;
                background: rgba(255,255,255,0.72);
                border: 1px solid rgba(255,255,255,0.56);
                box-shadow: 0 24px 70px rgba(24,40,48,0.15);
            }
            .dark-mode .media-stage,
            .dark-mode .media-library-panel {
                background: rgba(255,255,255,0.08);
                border-color: rgba(255,255,255,0.1);
                box-shadow: 0 24px 70px rgba(0,0,0,0.42);
            }
            body.fluent-v2 .media-stage,
            body.fluent-v2 .media-library-panel,
            body.fluent-v2 .media-player-bar {
                backdrop-filter: blur(34px) saturate(170%);
                -webkit-backdrop-filter: blur(34px) saturate(170%);
            }
            .media-art-backdrop {
                position: absolute;
                inset: -32px;
                background-size: cover;
                background-position: center;
                opacity: 0.25;
                filter: blur(38px) saturate(1.2);
                transform: scale(1.1);
            }
            .media-audio-hero {
                position: relative;
                height: 100%;
                display: grid;
                place-items: center;
                align-content: center;
                gap: 28px;
                padding: 36px;
                text-align: center;
            }
            .media-large-art {
                width: min(58vh, 430px);
                max-width: 86%;
                aspect-ratio: 1;
                object-fit: cover;
                border-radius: 30px;
                box-shadow: 0 32px 80px rgba(0,0,0,0.26);
                animation: mediaArtIn 700ms var(--media-ease);
            }
            .media-art-placeholder {
                display: grid;
                place-items: center;
                background:
                    linear-gradient(145deg, rgba(87,132,147,0.84), rgba(225,238,238,0.8)),
                    radial-gradient(circle at 30% 20%, rgba(255,255,255,0.7), transparent 40%);
            }
            .media-art-placeholder span { font-size: 56px; opacity: 0.85; }
            .media-title-block h1 {
                margin: 0;
                font-size: 34px;
                line-height: 1.15;
                font-weight: 700;
            }
            .media-title-block p {
                margin: 10px 0 0;
                color: rgba(37,51,58,0.7);
                font-size: 17px;
            }
            .dark-mode .media-title-block p { color: rgba(255,255,255,0.68); }
            .media-video {
                position: relative;
                width: 100%;
                height: 100%;
                object-fit: contain;
                background: #050607;
            }
            .media-video-title {
                position: absolute;
                left: 24px;
                right: 24px;
                bottom: 22px;
                display: flex;
                justify-content: space-between;
                gap: 16px;
                padding: 12px 16px;
                border-radius: 18px;
                background: rgba(0,0,0,0.42);
                color: white;
                backdrop-filter: blur(14px);
            }
            .media-library-panel {
                display: flex;
                flex-direction: column;
                padding: 20px;
            }
            .media-panel-head {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 14px;
                margin-bottom: 16px;
            }
            .media-panel-kicker {
                font-size: 12px;
                color: #3487c8;
                font-weight: 700;
            }
            .media-panel-head h2 {
                margin: 4px 0 0;
                font-size: 24px;
            }
            .media-filter-group {
                display: flex;
                gap: 6px;
                padding: 4px;
                border-radius: 999px;
                background: rgba(0,0,0,0.06);
            }
            .dark-mode .media-filter-group { background: rgba(255,255,255,0.08); }
            .media-filter-group button {
                min-width: 54px;
                height: 30px;
                padding: 0 12px;
                border-radius: 999px;
                color: inherit;
                transition: background 220ms var(--media-ease), transform 220ms var(--media-ease);
            }
            .media-filter-group button.active {
                background: rgba(47,140,255,0.22);
                color: #1671c8;
            }
            .dark-mode .media-filter-group button.active { color: #7ccaff; }
            .media-track-list {
                flex: 1;
                min-height: 0;
                overflow: auto;
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding-right: 2px;
            }
            .media-track {
                display: grid;
                grid-template-columns: 44px 28px minmax(0, 1fr) 52px 56px;
                align-items: center;
                gap: 10px;
                min-height: 62px;
                padding: 9px 10px;
                border-radius: 18px;
                color: inherit;
                text-align: left;
                transition: background 240ms var(--media-ease), transform 240ms var(--media-ease), box-shadow 240ms var(--media-ease);
            }
            .media-track:hover {
                background: rgba(47,140,255,0.1);
                transform: translateY(-1px);
            }
            .media-track.active {
                background: rgba(47,140,255,0.18);
                box-shadow: inset 3px 0 #2f8cff;
            }
            .media-small-art {
                width: 44px;
                height: 44px;
                object-fit: cover;
                border-radius: 12px;
                flex: 0 0 auto;
            }
            .media-small-art.media-art-placeholder span { font-size: 18px; }
            .media-track-index,
            .media-track-type,
            .media-track-duration {
                font-size: 12px;
                color: rgba(37,51,58,0.55);
            }
            .dark-mode .media-track-index,
            .dark-mode .media-track-type,
            .dark-mode .media-track-duration { color: rgba(255,255,255,0.52); }
            .media-track-main { min-width: 0; }
            .media-track-main strong,
            .media-track-main em {
                display: block;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .media-track-main strong { font-size: 14px; font-style: normal; }
            .media-track-main em {
                margin-top: 3px;
                font-size: 12px;
                font-style: normal;
                opacity: 0.65;
            }
            .media-empty {
                margin: auto;
                max-width: 260px;
                text-align: center;
                opacity: 0.68;
            }
            .media-empty div { font-size: 44px; }
            .media-empty h3 { margin: 10px 0 8px; }
            .media-empty p { margin: 0; line-height: 1.5; }
            .media-player-bar {
                grid-column: 2;
                display: grid;
                grid-template-columns: minmax(210px, 280px) minmax(280px, 1fr) minmax(230px, 300px);
                gap: 18px;
                align-items: center;
                margin: 0 20px 20px 0;
                padding: 14px 18px;
                border-radius: 30px;
                background: rgba(255,255,255,0.82);
                border: 1px solid rgba(255,255,255,0.66);
                box-shadow: 0 18px 46px rgba(20,35,45,0.16);
            }
            .dark-mode .media-player-bar {
                background: rgba(30,34,37,0.9);
                border-color: rgba(255,255,255,0.1);
            }
            .media-now-card {
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 0;
            }
            .media-now-card strong,
            .media-now-card span {
                display: block;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .media-now-card span { margin-top: 4px; opacity: 0.62; }
            .media-controls { min-width: 0; }
            .media-progress,
            .media-volume input {
                width: 100%;
                accent-color: #2f8cff;
            }
            .media-time-row {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                opacity: 0.62;
            }
            .media-button-row {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                margin-top: 8px;
            }
            .media-button-row button,
            .media-options button {
                min-width: 34px;
                height: 34px;
                padding: 0 8px;
                border-radius: 999px;
                color: inherit;
                background: rgba(0,0,0,0.06);
                transition: background 220ms var(--media-ease), transform 220ms var(--media-ease);
            }
            .dark-mode .media-button-row button,
            .dark-mode .media-options button { background: rgba(255,255,255,0.09); }
            .media-button-row button:hover,
            .media-options button:hover { transform: translateY(-1px); background: rgba(47,140,255,0.2); }
            .media-button-row button.active,
            .media-options button.active { color: #2f8cff; }
            .media-play-btn {
                width: 52px;
                height: 52px !important;
                background: #2f8cff !important;
                color: white !important;
                box-shadow: 0 12px 28px rgba(47,140,255,0.32);
                font-size: 20px;
            }
            .media-options {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 12px;
            }
            .media-options label {
                display: grid;
                gap: 4px;
                font-size: 11px;
                opacity: 0.78;
            }
            .media-options select {
                height: 32px;
                border: 0;
                border-radius: 999px;
                padding: 0 12px;
                background: rgba(0,0,0,0.06);
                color: inherit;
            }
            .dark-mode .media-options select { background: rgba(255,255,255,0.09); }
            .media-volume {
                min-width: 112px;
                grid-template-columns: 34px 1fr;
                align-items: center;
            }
            .media-volume span { grid-column: 1 / 3; }
            .media-hidden-input,
            .media-audio-hidden { display: none; }
            @keyframes mediaArtIn {
                from { opacity: 0; transform: translateY(18px) scale(0.96); filter: blur(10px); }
                to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
            }
            @media (max-width: 920px) {
                .media-app {
                    grid-template-columns: 88px minmax(0, 1fr);
                    grid-template-rows: minmax(0, 1fr) 164px;
                }
                .media-sidebar { padding: 14px 8px; }
                .media-brand,
                .media-search,
                .media-actions,
                .media-nav-item:not(.active) { display: none; }
                .media-nav-item {
                    justify-content: center;
                    padding: 0;
                }
                .media-nav-icon { font-size: 24px; }
                .media-main {
                    grid-template-columns: 1fr;
                    grid-template-rows: minmax(260px, 1fr) 280px;
                    padding: 14px;
                }
                .media-player-bar {
                    grid-column: 2;
                    grid-template-columns: 1fr;
                    margin: 0 14px 14px 0;
                    gap: 10px;
                }
                .media-options { justify-content: space-between; }
            }
            .media-app {
                position: relative;
                grid-template-columns: 286px minmax(0, 1fr);
                grid-template-rows: minmax(0, 1fr);
                background:
                    radial-gradient(circle at 18% 12%, rgba(255,45,85,0.18), transparent 32%),
                    radial-gradient(circle at 84% 8%, rgba(255,149,0,0.12), transparent 28%),
                    linear-gradient(145deg, #050505, #111);
                color: #f7f7f8;
            }
            .dark-mode .media-app {
                background:
                    radial-gradient(circle at 18% 12%, rgba(255,45,85,0.2), transparent 32%),
                    radial-gradient(circle at 84% 8%, rgba(255,149,0,0.13), transparent 28%),
                    linear-gradient(145deg, #030303, #111);
            }
            .media-sidebar {
                grid-row: 1;
                margin: 14px;
                padding: 18px 16px;
                border-radius: 30px;
                border: 1px solid rgba(255,255,255,0.1);
                background: rgba(20,14,12,0.72);
                box-shadow: 0 26px 80px rgba(0,0,0,0.48);
                backdrop-filter: blur(34px) saturate(150%);
                -webkit-backdrop-filter: blur(34px) saturate(150%);
            }
            .media-brand {
                font-size: 22px;
                font-weight: 760;
                padding: 0 8px 8px;
            }
            .media-search {
                height: 48px;
                border-radius: 20px;
                background: rgba(255,255,255,0.08);
            }
            .media-nav-item {
                height: 48px;
                border-radius: 18px;
                font-size: 15px;
            }
            .media-nav-item.active {
                background: rgba(255,255,255,0.12);
                box-shadow: inset 4px 0 #ff2d55;
                color: #ff4d6d;
            }
            .media-action-primary {
                background: linear-gradient(135deg, #ff2d55, #ff7a1a);
                box-shadow: 0 18px 44px rgba(255,45,85,0.26);
            }
            .media-main {
                display: block;
                overflow: auto;
                padding: 28px 30px 154px 14px;
            }
            .media-home {
                min-width: 0;
                animation: mediaArtIn 620ms var(--media-ease);
            }
            .media-home-head {
                display: flex;
                align-items: flex-end;
                justify-content: space-between;
                gap: 20px;
                margin-bottom: 28px;
            }
            .media-home-head p {
                margin: 0 0 4px;
                color: rgba(255,255,255,0.56);
                font-weight: 700;
            }
            .media-home-head h1 {
                margin: 0;
                font-size: clamp(34px, 5vw, 54px);
                letter-spacing: -0.06em;
                line-height: 0.95;
            }
            .media-section-title {
                margin: 28px 0 14px;
                font-size: 22px;
                font-weight: 800;
                letter-spacing: -0.03em;
            }
            .media-feature-row,
            .media-album-row {
                display: grid;
                grid-auto-flow: column;
                grid-auto-columns: minmax(230px, 28vw);
                gap: 20px;
                overflow-x: auto;
                overscroll-behavior-x: contain;
                padding: 2px 2px 10px;
                scroll-snap-type: x proximity;
            }
            .media-album-row { grid-auto-columns: 180px; }
            .media-home-card {
                position: relative;
                isolation: isolate;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                align-items: flex-start;
                min-height: 170px;
                overflow: hidden;
                border-radius: 22px;
                padding: 18px;
                color: white;
                text-align: left;
                scroll-snap-align: start;
                background: linear-gradient(135deg, #ff5f1f, #ff2d55);
                box-shadow: 0 20px 46px rgba(0,0,0,0.34);
                transform: translateZ(0);
                transition: transform 360ms var(--media-ease), box-shadow 360ms var(--media-ease), filter 360ms var(--media-ease);
            }
            .media-home-card:nth-child(2n) { background: linear-gradient(135deg, #d9f1ec, #6f8992); }
            .media-home-card:nth-child(3n) { background: linear-gradient(135deg, #252a30, #818891); }
            .media-home-card:nth-child(4n) { background: linear-gradient(135deg, #ffc400, #ff7a00); }
            .media-home-card:hover {
                transform: translateY(-8px) scale(1.015);
                box-shadow: 0 30px 70px rgba(0,0,0,0.42);
            }
            .media-home-card.active { outline: 2px solid rgba(255,45,85,0.9); }
            .media-home-card.is-featured { min-height: clamp(230px, 30vw, 330px); }
            .media-card-art {
                position: absolute;
                inset: 0;
                z-index: -2;
                display: grid;
                place-items: center;
                background-size: cover;
                background-position: center;
                transform: scale(1.02);
                transition: transform 520ms var(--media-ease), filter 520ms var(--media-ease);
            }
            .media-home-card:hover .media-card-art { transform: scale(1.08); filter: saturate(1.08); }
            .media-card-art em {
                font-size: 64px;
                font-style: normal;
                opacity: 0.72;
            }
            .media-card-shade {
                position: absolute;
                inset: 0;
                z-index: -1;
                background: linear-gradient(180deg, transparent 38%, rgba(0,0,0,0.78));
            }
            .media-card-label {
                margin-bottom: 4px;
                color: rgba(255,255,255,0.82);
                font-size: 13px;
                font-weight: 700;
            }
            .media-home-card strong,
            .media-home-card small {
                display: block;
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .media-home-card strong {
                font-size: 18px;
                letter-spacing: -0.02em;
            }
            .media-home-card small {
                margin-top: 3px;
                color: rgba(255,255,255,0.72);
                font-size: 14px;
            }
            .media-home-card.is-empty {
                justify-content: center;
                background: linear-gradient(135deg, rgba(255,45,85,0.42), rgba(255,255,255,0.08));
                border: 1px dashed rgba(255,255,255,0.22);
            }
            .media-video-shell {
                overflow: hidden;
                margin-bottom: 28px;
                border-radius: 28px;
                background: #000;
                box-shadow: 0 28px 80px rgba(0,0,0,0.38);
            }
            .media-video { min-height: 320px; }
            .media-library-panel {
                margin-top: 22px;
                padding: 18px;
                border-radius: 28px;
                background: rgba(255,255,255,0.07);
                border-color: rgba(255,255,255,0.1);
                box-shadow: none;
            }
            .media-panel-head { margin-bottom: 12px; }
            .media-track {
                background: rgba(255,255,255,0.05);
                color: white;
            }
            .media-track:hover,
            .media-track.active { background: rgba(255,255,255,0.12); }
            .media-player-bar {
                position: absolute;
                left: calc(286px + (100% - 286px) / 2);
                bottom: 24px;
                z-index: 12;
                width: min(760px, calc(100% - 346px));
                grid-template-columns: minmax(190px, 260px) minmax(260px, 1fr) minmax(150px, 220px);
                margin: 0;
                padding: 12px 18px;
                border-radius: 999px;
                background: rgba(24,24,24,0.82);
                border: 1px solid rgba(255,255,255,0.12);
                color: white;
                box-shadow: 0 24px 80px rgba(0,0,0,0.5);
                backdrop-filter: blur(30px) saturate(160%);
                -webkit-backdrop-filter: blur(30px) saturate(160%);
                transform: translateX(-50%);
            }
            .dark-mode .media-player-bar { background: rgba(24,24,24,0.82); }
            .media-player-bar .media-small-art {
                width: 48px;
                height: 48px;
                border-radius: 12px;
            }
            .media-progress {
                height: 4px;
                accent-color: #ff2d55;
            }
            .media-time-row { display: none; }
            .media-button-row {
                gap: 8px;
                margin-top: 0;
            }
            .media-button-row button,
            .media-options button {
                background: transparent;
                color: rgba(255,255,255,0.9);
            }
            .media-button-row button:hover,
            .media-options button:hover {
                background: rgba(255,255,255,0.1);
            }
            .media-button-row button.active,
            .media-options button.active { color: #ff2d55; }
            .media-play-btn {
                width: 54px;
                height: 54px !important;
                background: white !important;
                color: #050505 !important;
                box-shadow: 0 14px 34px rgba(0,0,0,0.32);
            }
            .media-options label:first-child { display: none; }
            .media-options { gap: 8px; }
            .media-volume { min-width: 96px; }
            .media-app.sidebar-collapsed .media-player-bar {
                left: calc(88px + (100% - 88px) / 2);
                width: min(760px, calc(100% - 148px));
            }
            @media (max-width: 920px) {
                .media-app { grid-template-columns: 88px minmax(0, 1fr); }
                .media-main { padding: 18px 14px 190px; }
                .media-feature-row { grid-auto-columns: minmax(210px, 72vw); }
                .media-player-bar {
                    left: calc(88px + (100% - 88px) / 2);
                    bottom: 14px;
                    width: calc(100% - 116px);
                    grid-template-columns: 1fr;
                    border-radius: 28px;
                }
                .media-options { display: none; }
            }
            .media-app {
                container-type: size;
                --media-accent: #ff2d55;
                --media-bg: rgba(247, 249, 251, 0.82);
                --media-fg: #101318;
                --media-muted: rgba(16,19,24,0.58);
                --media-panel: rgba(255,255,255,0.62);
                --media-panel-strong: rgba(255,255,255,0.82);
                --media-line: rgba(20,25,30,0.1);
                --media-shadow: rgba(50,65,75,0.18);
                background:
                    radial-gradient(circle at 16% 8%, rgba(255,45,85,0.16), transparent 30%),
                    radial-gradient(circle at 86% 4%, rgba(40,160,255,0.14), transparent 28%),
                    linear-gradient(145deg, rgba(250,252,255,0.94), rgba(229,236,242,0.88));
                color: var(--media-fg);
            }
            .dark-mode .media-app,
            body.dark-mode .media-app {
                --media-bg: rgba(8, 9, 11, 0.82);
                --media-fg: #f7f8fb;
                --media-muted: rgba(247,248,251,0.58);
                --media-panel: rgba(18,18,20,0.66);
                --media-panel-strong: rgba(28,28,31,0.82);
                --media-line: rgba(255,255,255,0.12);
                --media-shadow: rgba(0,0,0,0.45);
                background:
                    radial-gradient(circle at 16% 8%, rgba(255,45,85,0.2), transparent 30%),
                    radial-gradient(circle at 86% 4%, rgba(255,149,0,0.12), transparent 28%),
                    linear-gradient(145deg, rgba(3,3,4,0.96), rgba(17,18,20,0.93));
                color: var(--media-fg);
            }
            body.fluent-v2 .window:has(.media-app),
            body.fluent-v2 .window-content:has(.media-app),
            body.fluent-v2 .media-app {
                background-color: transparent;
                backdrop-filter: blur(38px) saturate(170%);
                -webkit-backdrop-filter: blur(38px) saturate(170%);
            }
            .media-sidebar {
                color: var(--media-fg);
                background: var(--media-panel);
                border-color: var(--media-line);
            }
            .dark-mode .media-sidebar,
            body.dark-mode .media-sidebar { color: #fff; }
            .media-search,
            .media-library-panel {
                background: var(--media-panel);
                border-color: var(--media-line);
                color: var(--media-fg);
            }
            .media-search input { color: var(--media-fg); }
            .media-search input::placeholder,
            .media-title-block p,
            .media-home-head p,
            .media-now-card span { color: var(--media-muted); }
            .media-nav-item { color: var(--media-fg); }
            .media-nav-item.active {
                color: var(--media-accent);
                background: color-mix(in srgb, var(--media-accent) 12%, transparent);
                box-shadow: inset 4px 0 var(--media-accent);
            }
            .media-main { padding-bottom: 122px; }
            .media-player-bar {
                left: calc(286px + (100% - 286px) / 2);
                bottom: 22px;
                width: min(620px, calc(100% - 348px));
                grid-template-columns: minmax(0, 1fr) auto auto;
                gap: 14px;
                min-height: 64px;
                padding: 10px 14px;
                border-radius: 999px;
                background: rgba(255,255,255,0.74);
                color: #14161a;
                border: 1px solid rgba(255,255,255,0.42);
                box-shadow: 0 22px 70px var(--media-shadow);
                backdrop-filter: blur(28px) saturate(170%);
                -webkit-backdrop-filter: blur(28px) saturate(170%);
            }
            .dark-mode .media-player-bar,
            body.dark-mode .media-player-bar {
                background: rgba(23,23,25,0.78);
                color: #fff;
                border-color: rgba(255,255,255,0.12);
            }
            .media-now-card { cursor: default; }
            .media-now-card .media-small-art {
                width: 44px;
                height: 44px;
                border-radius: 12px;
            }
            .media-controls {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .media-controls .media-progress {
                position: absolute;
                left: 22px;
                right: 22px;
                bottom: 5px;
                width: auto;
                height: 3px;
                opacity: 0.72;
                accent-color: var(--media-accent);
            }
            .media-button-row {
                margin: 0;
                gap: 6px;
            }
            .media-button-row button,
            .media-options button {
                width: 36px;
                min-width: 36px;
                height: 36px;
                background: transparent;
                color: inherit;
            }
            .media-button-row button:hover,
            .media-options button:hover {
                background: rgba(128,128,128,0.16);
                transform: scale(1.06);
            }
            .media-play-btn {
                width: 48px;
                height: 48px !important;
                background: var(--media-accent) !important;
                color: white !important;
                box-shadow: 0 14px 32px color-mix(in srgb, var(--media-accent) 34%, transparent);
            }
            .media-options {
                display: flex;
                justify-content: flex-end;
                gap: 6px;
            }
            .media-options button.active { color: var(--media-accent); }
            .media-expanded {
                position: absolute;
                inset: 0;
                z-index: 30;
                display: grid;
                grid-template-columns: minmax(260px, 0.78fr) minmax(320px, 1fr);
                grid-template-rows: auto auto auto 1fr;
                gap: clamp(18px, 3vw, 34px);
                overflow: hidden;
                padding: clamp(26px, 5vw, 58px);
                color: var(--media-fg);
                opacity: 0;
                pointer-events: none;
                transform: translateY(24px) scale(0.985);
                transition: opacity 520ms var(--media-ease), transform 620ms var(--media-ease);
            }
            .media-expanded.active {
                opacity: 1;
                pointer-events: auto;
                transform: translateY(0) scale(1);
            }
            .media-expanded-bg {
                position: absolute;
                inset: -40px;
                z-index: -2;
                background: var(--media-bg);
                background-size: cover;
                background-position: center;
                filter: blur(34px) saturate(125%);
                transform: scale(1.08);
            }
            .media-expanded-bg::after {
                content: "";
                position: absolute;
                inset: 0;
                background:
                    linear-gradient(180deg, rgba(255,255,255,0.64), rgba(255,255,255,0.86)),
                    radial-gradient(circle at 50% 0%, rgba(255,255,255,0.25), transparent 42%);
            }
            .dark-mode .media-expanded-bg::after,
            body.dark-mode .media-expanded-bg::after {
                background:
                    linear-gradient(180deg, rgba(18,20,28,0.68), rgba(12,13,18,0.9)),
                    radial-gradient(circle at 50% 0%, rgba(255,255,255,0.08), transparent 42%);
            }
            .media-collapse-btn {
                position: absolute;
                top: 24px;
                left: 24px;
                z-index: 2;
                width: 54px;
                height: 54px;
                border-radius: 999px;
                background: rgba(255,255,255,0.4);
                color: var(--media-fg);
                font-size: 34px;
                line-height: 1;
                box-shadow: 0 14px 34px var(--media-shadow);
                backdrop-filter: blur(22px);
                -webkit-backdrop-filter: blur(22px);
            }
            .dark-mode .media-collapse-btn,
            body.dark-mode .media-collapse-btn { background: rgba(0,0,0,0.28); color: white; }
            .media-expanded-art {
                grid-row: 1 / 5;
                align-self: center;
                justify-self: center;
                width: min(42vw, 420px);
                aspect-ratio: 1;
                display: grid;
                place-items: center;
                overflow: hidden;
                border-radius: 30px;
                background: linear-gradient(135deg, rgba(255,255,255,0.28), rgba(255,255,255,0.06));
                background-size: cover;
                background-position: center;
                box-shadow: 0 34px 100px rgba(0,0,0,0.26);
                transition: width 620ms var(--media-ease), border-radius 620ms var(--media-ease), transform 620ms var(--media-ease);
            }
            .media-expanded-art span {
                font-size: 82px;
                opacity: 0.64;
            }
            .media-expanded-info {
                align-self: end;
                display: flex;
                align-items: end;
                justify-content: space-between;
                gap: 20px;
            }
            .media-expanded-info h2 {
                margin: 0;
                font-size: clamp(28px, 4vw, 52px);
                letter-spacing: -0.06em;
            }
            .media-expanded-info p {
                margin: 8px 0 0;
                color: var(--media-muted);
                font-size: clamp(16px, 2vw, 24px);
            }
            .media-expanded-meta,
            .media-expanded-controls,
            .media-expanded-aux {
                display: flex;
                align-items: center;
                gap: 14px;
            }
            .media-expanded-meta button,
            .media-expanded-controls button {
                width: 48px;
                height: 48px;
                border-radius: 999px;
                color: var(--media-fg);
                background: rgba(255,255,255,0.32);
                backdrop-filter: blur(18px);
                -webkit-backdrop-filter: blur(18px);
            }
            .dark-mode .media-expanded-meta button,
            .dark-mode .media-expanded-controls button,
            body.dark-mode .media-expanded-meta button,
            body.dark-mode .media-expanded-controls button {
                color: white;
                background: rgba(255,255,255,0.08);
            }
            .media-expanded-meta button.active { color: var(--media-accent); }
            .media-expanded-progress-row {
                display: grid;
                gap: 8px;
            }
            .media-expanded-progress {
                width: 100%;
                accent-color: var(--media-accent);
            }
            .media-expanded .media-time-row {
                display: flex;
                justify-content: space-between;
                color: var(--media-muted);
                font-size: 13px;
            }
            .media-expanded-controls {
                justify-content: center;
            }
            .media-expanded-play {
                width: 68px !important;
                height: 68px !important;
                font-size: 26px;
            }
            .media-expanded-aux {
                justify-content: space-between;
            }
            .media-expanded-aux .media-volume {
                display: grid;
                grid-template-columns: 42px minmax(140px, 1fr);
                align-items: center;
                flex: 1;
                min-width: 0;
            }
            .media-expanded-aux input { accent-color: var(--media-accent); }
            .media-rate-control {
                display: flex;
                align-items: center;
                gap: 10px;
                color: var(--media-muted);
            }
            .media-rate-control select {
                height: 38px;
                border: 0;
                border-radius: 999px;
                padding: 0 14px;
                color: var(--media-fg);
                background: rgba(255,255,255,0.34);
            }
            .dark-mode .media-rate-control select,
            body.dark-mode .media-rate-control select { background: rgba(255,255,255,0.08); color: white; }
            @container (max-aspect-ratio: 0.9) {
                .media-expanded {
                    grid-template-columns: 1fr;
                    grid-template-rows: auto auto auto auto 1fr;
                    padding: clamp(28px, 7vw, 48px);
                    text-align: center;
                }
                .media-expanded-art {
                    grid-row: auto;
                    width: min(82vw, 520px);
                    border-radius: 0 0 28px 28px;
                    align-self: start;
                }
                .media-expanded-info {
                    display: grid;
                    justify-content: center;
                    text-align: center;
                }
                .media-expanded-meta,
                .media-expanded-aux { justify-content: center; }
            }
            @container (min-aspect-ratio: 1.25) {
                .media-expanded {
                    grid-template-columns: 1fr;
                    grid-template-rows: auto auto auto auto;
                    place-content: center;
                    text-align: center;
                }
                .media-expanded-art {
                    grid-row: auto;
                    width: min(29vw, 360px);
                }
                .media-expanded-info {
                    width: min(560px, 56vw);
                    justify-self: center;
                }
                .media-expanded-progress-row,
                .media-expanded-aux {
                    width: min(560px, 56vw);
                    justify-self: center;
                }
            }
            @media (max-width: 920px) {
                .media-player-bar {
                    width: calc(100% - 116px);
                    grid-template-columns: minmax(0, 1fr) auto;
                }
                .media-player-bar .media-options { display: flex; }
                .media-player-bar .media-options button:first-child { display: none; }
                .media-player-bar .media-now-card span { display: none; }
            }

            /* Final Fluent alignment: keep Media visually consistent with Settings. */
            .window[data-app-id="media"] {
                background: rgba(238, 242, 248, 0.92) !important;
            }
            .window[data-app-id="media"] .window-titlebar {
                background: rgba(238, 242, 248, 0.92) !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                border-bottom: 0 !important;
            }
            .window[data-app-id="media"] .window-content {
                background: rgba(238, 242, 248, 0.92) !important;
            }
            body.dark-mode .window[data-app-id="media"] {
                background: rgba(32, 34, 38, 0.94) !important;
            }
            body.dark-mode .window[data-app-id="media"] .window-titlebar,
            body.dark-mode .window[data-app-id="media"] .window-content {
                background: rgba(32, 34, 38, 0.94) !important;
            }
            body.fluent-v2 .window[data-app-id="media"],
            body.fluent-v2 .window[data-app-id="media"] .window-titlebar,
            body.fluent-v2 .window[data-app-id="media"] .window-content {
                background: rgba(235, 239, 247, 0.58) !important;
                backdrop-filter: blur(28px) saturate(145%) !important;
                -webkit-backdrop-filter: blur(28px) saturate(145%) !important;
            }
            body.fluent-v2.dark-mode .window[data-app-id="media"],
            body.fluent-v2.dark-mode .window[data-app-id="media"] .window-titlebar,
            body.fluent-v2.dark-mode .window[data-app-id="media"] .window-content {
                background: rgba(26, 28, 32, 0.62) !important;
            }
            body.fluent-v2 .window[data-app-id="media"] .window-titlebar {
                backdrop-filter: blur(20px) saturate(130%) !important;
                -webkit-backdrop-filter: blur(20px) saturate(130%) !important;
            }
            .media-app,
            body.dark-mode .media-app {
                --media-accent: #0078d4;
                --media-ease: cubic-bezier(0.16, 1, 0.3, 1);
                background: transparent !important;
                color: var(--text-primary, #202020);
            }
            body.dark-mode .media-app {
                color: var(--text-primary, #f5f5f5);
            }
            .media-sidebar {
                margin: 18px 0 18px 18px !important;
                padding: 18px 12px !important;
                border-radius: 16px !important;
                color: var(--text-primary, #202020) !important;
                background: rgba(255, 255, 255, 0.46) !important;
                border: 1px solid rgba(255, 255, 255, 0.38) !important;
                box-shadow: none !important;
            }
            body.dark-mode .media-sidebar {
                color: var(--text-primary, #f5f5f5) !important;
                background: rgba(255, 255, 255, 0.08) !important;
                border-color: rgba(255, 255, 255, 0.1) !important;
            }
            body.fluent-v2 .media-sidebar,
            body.fluent-v2 .media-library-panel,
            body.fluent-v2 .media-player-bar,
            body.fluent-v2 .media-expanded-meta button,
            body.fluent-v2 .media-expanded-controls button,
            body.fluent-v2 .media-collapse-btn {
                backdrop-filter: blur(20px) saturate(150%) !important;
                -webkit-backdrop-filter: blur(20px) saturate(150%) !important;
            }
            .media-brand {
                font-size: 20px !important;
                font-weight: 650 !important;
                padding: 4px 12px 14px !important;
            }
            .media-search {
                height: 44px !important;
                border-radius: 12px !important;
                background: rgba(255, 255, 255, 0.42) !important;
                color: var(--text-primary, #202020) !important;
            }
            body.dark-mode .media-search {
                background: rgba(255, 255, 255, 0.08) !important;
            }
            .media-nav-item {
                height: 46px !important;
                border-radius: 12px !important;
                color: var(--text-primary, #202020) !important;
                font-size: 14px !important;
            }
            body.dark-mode .media-nav-item {
                color: var(--text-primary, #f5f5f5) !important;
            }
            .media-nav-item.active {
                color: var(--media-accent) !important;
                background: rgba(0, 120, 212, 0.12) !important;
                box-shadow: 0 0 0 1px rgba(0, 120, 212, 0.3) inset !important;
            }
            .media-action-primary,
            .media-action-secondary {
                height: 40px !important;
                border-radius: 999px !important;
                box-shadow: none !important;
            }
            .media-action-primary {
                background: var(--media-accent) !important;
            }
            .media-action-secondary {
                color: var(--text-primary, #202020) !important;
                background: rgba(255, 255, 255, 0.32) !important;
            }
            body.dark-mode .media-action-secondary {
                color: var(--text-primary, #f5f5f5) !important;
                background: rgba(255, 255, 255, 0.08) !important;
            }
            .media-main {
                padding: 30px 34px 120px 28px !important;
            }
            .media-home-head {
                margin-bottom: 22px !important;
            }
            .media-home-head h1 {
                font-size: 34px !important;
                letter-spacing: -0.03em !important;
            }
            .media-home-head p,
            .media-section-title {
                color: var(--text-primary, #202020) !important;
            }
            .media-section-title {
                margin: 26px 0 14px !important;
                font-size: 20px !important;
                font-weight: 650 !important;
                letter-spacing: 0 !important;
            }
            .media-filter-group {
                background: transparent !important;
            }
            .media-filter-group button {
                color: var(--text-secondary, #606060) !important;
                background: transparent !important;
            }
            .media-filter-group button.active {
                color: var(--media-accent) !important;
            }
            .media-feature-row {
                grid-auto-columns: minmax(260px, 420px) !important;
                gap: 14px !important;
            }
            .media-album-row {
                grid-auto-columns: 160px !important;
                gap: 14px !important;
            }
            .media-home-card {
                min-height: 150px !important;
                border-radius: 12px !important;
                padding: 16px !important;
                background: rgba(255, 255, 255, 0.5) !important;
                border: 1px solid rgba(255, 255, 255, 0.34) !important;
                color: var(--text-primary, #202020) !important;
                box-shadow: none !important;
            }
            body.dark-mode .media-home-card {
                background: rgba(255, 255, 255, 0.1) !important;
                border-color: rgba(255, 255, 255, 0.1) !important;
                color: var(--text-primary, #f5f5f5) !important;
            }
            body.fluent-v2 .media-home-card {
                background: rgba(255, 255, 255, 0.55) !important;
                backdrop-filter: blur(20px) saturate(150%) !important;
                -webkit-backdrop-filter: blur(20px) saturate(150%) !important;
                border-color: rgba(255, 255, 255, 0.3) !important;
                box-shadow: none !important;
            }
            body.fluent-v2.dark-mode .media-home-card {
                background: rgba(255, 255, 255, 0.12) !important;
                border-color: rgba(255, 255, 255, 0.1) !important;
            }
            .media-home-card.is-featured {
                min-height: 190px !important;
            }
            .media-home-card:hover {
                transform: translateY(-2px) !important;
                box-shadow: none !important;
                background: rgba(255, 255, 255, 0.68) !important;
            }
            body.dark-mode .media-home-card:hover {
                background: rgba(255, 255, 255, 0.16) !important;
            }
            .media-home-card.is-empty {
                background:
                    linear-gradient(135deg, rgba(0, 120, 212, 0.13), rgba(255, 255, 255, 0.32)) !important;
                border: 1px dashed rgba(0, 120, 212, 0.32) !important;
            }
            body.dark-mode .media-home-card.is-empty {
                background: rgba(255, 255, 255, 0.08) !important;
            }
            .media-card-shade {
                background: linear-gradient(180deg, transparent 42%, rgba(0, 0, 0, 0.34)) !important;
            }
            .media-home-card.is-empty .media-card-shade,
            .media-home-card:not(:has(.media-card-art[style*="url"])) .media-card-shade {
                display: none !important;
            }
            .media-home-card.is-empty strong,
            .media-home-card.is-empty small,
            .media-home-card.is-empty .media-card-label {
                color: var(--text-primary, #202020) !important;
            }
            body.dark-mode .media-home-card.is-empty strong,
            body.dark-mode .media-home-card.is-empty small,
            body.dark-mode .media-home-card.is-empty .media-card-label {
                color: var(--text-primary, #f5f5f5) !important;
            }
            .media-library-panel {
                border-radius: 16px !important;
                background: rgba(255, 255, 255, 0.42) !important;
                border: 1px solid rgba(255, 255, 255, 0.3) !important;
                box-shadow: none !important;
            }
            body.dark-mode .media-library-panel {
                background: rgba(255, 255, 255, 0.08) !important;
                border-color: rgba(255, 255, 255, 0.1) !important;
            }
            .media-track {
                color: var(--text-primary, #202020) !important;
                background: transparent !important;
            }
            body.dark-mode .media-track {
                color: var(--text-primary, #f5f5f5) !important;
            }
            .media-track:hover,
            .media-track.active {
                background: rgba(0, 120, 212, 0.1) !important;
            }
            .media-player-bar {
                background: rgba(255, 255, 255, 0.72) !important;
                color: var(--text-primary, #202020) !important;
                border: 1px solid rgba(255, 255, 255, 0.4) !important;
                box-shadow: 0 10px 24px rgba(45, 55, 70, 0.12) !important;
            }
            body:not(.dark-mode) .media-player-bar {
                box-shadow: 0 10px 24px rgba(45, 55, 70, 0.1) !important;
            }
            body.dark-mode .media-player-bar {
                background: rgba(30, 32, 36, 0.76) !important;
                color: var(--text-primary, #f5f5f5) !important;
                border-color: rgba(255, 255, 255, 0.1) !important;
                box-shadow: 0 18px 44px rgba(0, 0, 0, 0.34) !important;
            }
            .media-play-btn {
                background: var(--media-accent) !important;
                color: #fff !important;
                box-shadow: none !important;
            }
            .media-expanded {
                color: var(--text-primary, #202020) !important;
                background: rgba(238, 242, 248, 0.86) !important;
            }
            body.dark-mode .media-expanded {
                color: var(--text-primary, #f5f5f5) !important;
                background: rgba(28, 30, 34, 0.9) !important;
            }
            .media-expanded-bg {
                opacity: 0.18 !important;
            }
            .media-expanded-bg::after {
                background: rgba(238, 242, 248, 0.72) !important;
            }
            body.dark-mode .media-expanded-bg::after {
                background: rgba(28, 30, 34, 0.76) !important;
            }
            .media-expanded-art {
                border-radius: 18px !important;
                box-shadow: none !important;
                border: 1px solid rgba(255, 255, 255, 0.24) !important;
            }
            .media-symbol {
                width: 18px;
                height: 18px;
                display: block;
                object-fit: contain;
                pointer-events: none;
            }
            .media-menu-btn .media-symbol,
            .media-search .media-symbol,
            .media-nav-item .media-symbol {
                width: 18px;
                height: 18px;
            }
            .media-play-btn .media-symbol {
                width: 22px;
                height: 22px;
                filter: brightness(0) invert(1);
            }
            .media-small-art .media-symbol {
                width: 22px;
                height: 22px;
                opacity: 0.58;
            }
            .media-large-art .media-symbol,
            .media-card-placeholder-icon,
            .media-empty-icon,
            .media-expanded-placeholder-icon {
                width: 58px;
                height: 58px;
                opacity: 0.56;
            }
            .media-expanded-placeholder-icon {
                width: 88px;
                height: 88px;
            }
            body.dark-mode .media-symbol {
                filter: brightness(0) invert(1);
            }
            body.dark-mode .media-play-btn .media-symbol {
                filter: brightness(0) invert(1);
            }
            body.fluent-v2 .media-app {
                background: rgba(255, 255, 255, 0.38) !important;
                backdrop-filter: blur(30px) saturate(160%) !important;
                -webkit-backdrop-filter: blur(30px) saturate(160%) !important;
            }
            body.fluent-v2.dark-mode .media-app {
                background: rgba(32, 32, 32, 0.38) !important;
            }
            body.fluent-v2 .window[data-app-id="media"] .window-content {
                background: transparent !important;
            }
            body.fluent-v2 .window[data-app-id="media"] {
                background: rgba(255, 255, 255, 0.36) !important;
                backdrop-filter: blur(30px) saturate(160%) !important;
                -webkit-backdrop-filter: blur(30px) saturate(160%) !important;
            }
            body.fluent-v2.dark-mode .window[data-app-id="media"] {
                background: rgba(32, 32, 32, 0.42) !important;
            }
            .window[data-app-id="media"] .window-content {
                overflow: hidden !important;
            }
            .media-player-bar {
                left: calc(286px + ((100% - 286px) / 2)) !important;
                right: auto !important;
                bottom: 22px !important;
                width: min(760px, calc(100% - 286px - 56px)) !important;
                max-width: none !important;
                min-width: 0 !important;
                transform: translateX(-50%) !important;
                grid-template-columns: minmax(190px, 1fr) auto minmax(72px, auto) !important;
                justify-self: stretch !important;
            }
            .media-now-card {
                min-width: 0 !important;
                max-width: none !important;
            }
            .media-now-card > div {
                min-width: 0 !important;
            }
            .media-controls {
                min-width: 148px !important;
                justify-content: center !important;
            }
            .media-options {
                min-width: 72px !important;
            }
            .media-app.sidebar-collapsed .media-player-bar {
                left: calc(88px + ((100% - 88px) / 2)) !important;
                right: auto !important;
                width: min(760px, calc(100% - 88px - 56px)) !important;
                transform: translateX(-50%) !important;
            }
            @media (max-width: 920px) {
                .media-player-bar {
                    left: calc(88px + ((100% - 88px) / 2)) !important;
                    right: auto !important;
                    width: min(620px, calc(100% - 88px - 32px)) !important;
                    transform: translateX(-50%) !important;
                    grid-template-columns: minmax(0, 1fr) auto auto !important;
                }
                .media-controls { min-width: 132px !important; }
            }
            @container (max-width: 620px) {
                .media-player-bar {
                    left: 50% !important;
                    right: auto !important;
                    width: calc(100% - 32px) !important;
                    grid-template-columns: minmax(0, 1fr) auto !important;
                    transform: translateX(-50%) !important;
                }
                .media-player-bar .media-options button:first-child {
                    display: none !important;
                }
                .media-now-card span {
                    display: none !important;
                }
            }
            .media-main {
                overflow: hidden !important;
            }
            .media-main-scroll {
                height: 100%;
                min-height: 0;
            }
            .media-main-scroll .fluent-scroll-viewport {
                height: 100%;
                max-height: none !important;
                padding: 0;
            }
            .media-main-scroll .fluent-scroll-viewport::after {
                content: "";
                display: block;
                height: 120px;
                background: transparent !important;
                pointer-events: none;
            }
            .media-main-scroll .fluent-scroll-rail {
                right: 5px;
            }
            .media-main .media-library-panel:last-child {
                margin-bottom: 0 !important;
            }
            .media-main .media-library-panel:last-child::after {
                content: none !important;
            }
            .media-track-list {
                padding-bottom: 0 !important;
                background: transparent !important;
            }
            .media-feature-row,
            .media-album-row {
                scrollbar-width: none !important;
            }
            .media-feature-row::-webkit-scrollbar,
            .media-album-row::-webkit-scrollbar {
                display: none !important;
            }
            .media-home-card.no-cover {
                background: var(--media-card-gradient) !important;
                color: #fff !important;
                border-color: rgba(255,255,255,0.24) !important;
            }
            .media-home-card.no-cover:hover {
                background: var(--media-card-gradient) !important;
                filter: saturate(1.06) brightness(1.03);
            }
            .media-home-card.no-cover .media-card-label,
            .media-home-card.no-cover strong,
            .media-home-card.no-cover small {
                color: rgba(255,255,255,0.96) !important;
                text-shadow: 0 1px 12px rgba(0,0,0,0.18);
            }
            .media-home-card.no-cover .media-card-art {
                background: transparent !important;
            }
            .media-home-card.no-cover .media-card-shade {
                display: block !important;
                background: linear-gradient(180deg, rgba(0,0,0,0.03), rgba(0,0,0,0.28)) !important;
            }
            .media-home-card.no-cover .media-card-placeholder-icon,
            .media-art-placeholder .media-symbol,
            .media-expanded-placeholder-icon {
                filter: brightness(0) invert(1);
                opacity: 0.78;
            }
            .media-app {
                grid-template-rows: minmax(0, 1fr) 0 !important;
            }
            .media-main {
                padding-bottom: 20px !important;
            }
            .media-main-scroll .fluent-scroll-viewport::after {
                height: 0 !important;
            }
            .media-player-bar.is-hidden {
                display: none !important;
            }
            .media-page-shell {
                animation: mediaPageBlurIn 420ms cubic-bezier(0.16, 1, 0.3, 1) both !important;
            }
            @keyframes mediaPageBlurIn {
                from {
                    opacity: 0;
                    filter: blur(18px) saturate(0.86);
                    transform: translateY(16px) scale(0.992);
                }
                to {
                    opacity: 1;
                    filter: blur(0) saturate(1);
                    transform: translateY(0) scale(1);
                }
            }
            .media-import-empty {
                height: 100%;
                display: grid;
                place-items: center;
                padding: 28px;
            }
            .media-import-empty-card {
                width: min(520px, 100%);
                display: grid;
                justify-items: center;
                gap: 16px;
                padding: 42px;
                text-align: center;
                border-radius: 28px;
                background: rgba(255, 255, 255, 0.42);
                border: 1px solid rgba(255, 255, 255, 0.3);
                backdrop-filter: blur(24px) saturate(150%);
                -webkit-backdrop-filter: blur(24px) saturate(150%);
            }
            body.dark-mode .media-import-empty-card {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.1);
            }
            .media-import-empty-card h1 {
                margin: 0;
                font-size: clamp(26px, 4vw, 42px);
                letter-spacing: -0.04em;
            }
            .media-import-empty-card p {
                max-width: 420px;
                margin: 0;
                color: var(--text-secondary, rgba(30, 30, 30, 0.62));
                line-height: 1.65;
            }
            body.dark-mode .media-import-empty-card p {
                color: rgba(255, 255, 255, 0.62);
            }
            .media-import-actions {
                width: min(360px, 100%);
                display: grid;
                gap: 12px;
                margin-top: 8px;
            }
            .media-home-card {
                overflow: hidden !important;
            }
            .media-home-card .media-card-art {
                z-index: 0 !important;
                opacity: 1 !important;
            }
            .media-home-card .media-card-shade {
                z-index: 1 !important;
            }
            .media-home-card .media-card-label,
            .media-home-card strong,
            .media-home-card small {
                position: relative !important;
                z-index: 2 !important;
            }
            .media-home-card:not(.no-cover):not(.is-empty) {
                background: transparent !important;
                color: #fff !important;
                border-color: rgba(255, 255, 255, 0.24) !important;
            }
            .media-home-card:not(.no-cover):not(.is-empty) .media-card-shade {
                display: block !important;
                background: linear-gradient(180deg, rgba(0, 0, 0, 0.02) 28%, rgba(0, 0, 0, 0.62) 100%) !important;
            }
            .media-home-card:not(.no-cover):not(.is-empty) .media-card-label,
            .media-home-card:not(.no-cover):not(.is-empty) strong,
            .media-home-card:not(.no-cover):not(.is-empty) small {
                color: rgba(255, 255, 255, 0.96) !important;
                text-shadow: 0 2px 16px rgba(0, 0, 0, 0.34);
            }
            .media-home-card:not(.no-cover):not(.is-empty):hover {
                background: transparent !important;
            }
            .media-home-card.active {
                outline: none !important;
                border-color: rgba(255, 255, 255, 0.34) !important;
            }
            .media-home-card.no-cover,
            body.fluent-v2 .media-home-card.no-cover,
            body.dark-mode .media-home-card.no-cover,
            body.fluent-v2.dark-mode .media-home-card.no-cover {
                background: var(--media-card-gradient) !important;
                color: #fff !important;
                border-color: rgba(255, 255, 255, 0.24) !important;
            }
            .media-home-card.no-cover:hover,
            body.fluent-v2 .media-home-card.no-cover:hover {
                background: var(--media-card-gradient) !important;
                transform: translateY(-2px) !important;
                box-shadow: none !important;
            }
            .media-home-card.no-cover.active {
                border-color: rgba(255, 255, 255, 0.34) !important;
            }
            .media-home-card.no-cover .media-card-art {
                background: transparent !important;
            }
            .media-home-card.no-cover .media-card-shade {
                display: block !important;
                background: linear-gradient(180deg, rgba(0, 0, 0, 0.02) 24%, rgba(0, 0, 0, 0.26) 100%) !important;
            }
            .media-nav-item {
                border-radius: var(--radius-sm, 8px) !important;
                transition: background var(--transition-fast, 160ms ease), color var(--transition-fast, 160ms ease) !important;
            }
            .media-nav-item:hover {
                transform: none !important;
                background: rgba(0, 0, 0, 0.05) !important;
            }
            body.dark-mode .media-nav-item:hover,
            .dark-mode .media-nav-item:hover {
                background: rgba(255, 255, 255, 0.1) !important;
            }
            .window[data-app-id="media"] {
                min-width: 1100px !important;
                min-height: 700px !important;
            }
            .window[data-app-id="media"] .window-content {
                min-height: 640px !important;
            }
            .media-app:has(.media-expanded.active) .media-player-bar {
                opacity: 0 !important;
                pointer-events: none !important;
                transform: translateX(-50%) translateY(18px) scale(0.96) !important;
            }
            .media-expanded {
                position: absolute !important;
                inset: 0 !important;
                z-index: 80 !important;
                display: grid !important;
                grid-template-columns: minmax(0, min(620px, calc(100% - 64px))) !important;
                grid-template-rows: auto minmax(160px, 34vh) auto auto auto minmax(0, 1fr) !important;
                justify-content: center !important;
                align-content: center !important;
                justify-items: stretch !important;
                gap: clamp(14px, 2.2vh, 24px) !important;
                min-width: 0 !important;
                min-height: 0 !important;
                overflow: hidden !important;
                padding: clamp(24px, 4vw, 56px) !important;
                color: var(--media-fg, #101318) !important;
                background:
                    radial-gradient(circle at 50% 14%, rgba(255, 255, 255, 0.38), transparent 34%),
                    rgba(236, 238, 247, 0.72) !important;
                backdrop-filter: blur(34px) saturate(150%) !important;
                -webkit-backdrop-filter: blur(34px) saturate(150%) !important;
            }
            body.dark-mode .media-expanded {
                color: #fff !important;
                background:
                    radial-gradient(circle at 50% 14%, rgba(255, 255, 255, 0.12), transparent 34%),
                    rgba(28, 30, 38, 0.74) !important;
            }
            .media-expanded.active {
                opacity: 1 !important;
                pointer-events: auto !important;
                transform: none !important;
            }
            .media-expanded-bg {
                position: absolute !important;
                inset: -80px !important;
                z-index: -2 !important;
                opacity: 0.34 !important;
                background-size: cover !important;
                background-position: center !important;
                filter: blur(52px) saturate(120%) !important;
                transform: scale(1.18) !important;
            }
            .media-expanded-bg::after {
                content: "" !important;
                position: absolute !important;
                inset: 0 !important;
                background:
                    linear-gradient(180deg, rgba(238, 241, 250, 0.5), rgba(238, 241, 250, 0.84)),
                    radial-gradient(circle at 50% 50%, transparent 0%, rgba(238, 241, 250, 0.42) 72%) !important;
            }
            body.dark-mode .media-expanded-bg::after {
                background:
                    linear-gradient(180deg, rgba(28, 30, 38, 0.52), rgba(28, 30, 38, 0.86)),
                    radial-gradient(circle at 50% 50%, transparent 0%, rgba(28, 30, 38, 0.5) 72%) !important;
            }
            .media-collapse-btn {
                position: absolute !important;
                top: clamp(18px, 3vw, 30px) !important;
                left: clamp(18px, 3vw, 30px) !important;
                z-index: 3 !important;
                width: 48px !important;
                height: 48px !important;
                border-radius: 999px !important;
                display: grid !important;
                place-items: center !important;
                padding: 0 !important;
                line-height: 1 !important;
                background: rgba(255, 255, 255, 0.54) !important;
                color: var(--media-fg, #101318) !important;
                box-shadow: none !important;
                backdrop-filter: blur(20px) saturate(150%) !important;
                -webkit-backdrop-filter: blur(20px) saturate(150%) !important;
            }
            body.dark-mode .media-collapse-btn {
                background: rgba(255, 255, 255, 0.12) !important;
                color: #fff !important;
            }
            .media-expanded-art {
                grid-row: 2 !important;
                grid-column: 1 !important;
                align-self: center !important;
                justify-self: center !important;
                width: min(34vh, 32vw, 360px) !important;
                min-width: 160px !important;
                max-width: 100% !important;
                aspect-ratio: 1 !important;
                border-radius: clamp(18px, 3vw, 28px) !important;
                overflow: hidden !important;
                display: grid !important;
                place-items: center !important;
                background-size: cover !important;
                background-position: center !important;
                box-shadow: 0 28px 80px rgba(30, 36, 52, 0.18) !important;
                transform: none !important;
            }
            body.dark-mode .media-expanded-art {
                box-shadow: 0 30px 90px rgba(0, 0, 0, 0.34) !important;
            }
            .media-expanded-info {
                grid-row: 3 !important;
                grid-column: 1 !important;
                width: 100% !important;
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) auto !important;
                align-items: end !important;
                gap: 18px !important;
                text-align: left !important;
            }
            .media-expanded-info h2 {
                margin: 0 !important;
                font-size: clamp(28px, 4vw, 48px) !important;
                line-height: 0.98 !important;
                letter-spacing: -0.055em !important;
                white-space: normal !important;
                overflow-wrap: anywhere !important;
            }
            .media-expanded-info p {
                margin: 8px 0 0 !important;
                color: var(--media-muted, rgba(16,19,24,0.58)) !important;
                font-size: clamp(15px, 2vw, 22px) !important;
            }
            body.dark-mode .media-expanded-info p {
                color: rgba(255, 255, 255, 0.66) !important;
            }
            .media-expanded-meta {
                justify-content: end !important;
                gap: 10px !important;
            }
            .media-expanded-meta button,
            .media-expanded-controls button {
                width: 44px !important;
                height: 44px !important;
                min-width: 44px !important;
                border-radius: 999px !important;
                display: inline-grid !important;
                place-items: center !important;
                padding: 0 !important;
                line-height: 1 !important;
                color: inherit !important;
                background: rgba(255, 255, 255, 0.34) !important;
                box-shadow: none !important;
                backdrop-filter: blur(18px) saturate(150%) !important;
                -webkit-backdrop-filter: blur(18px) saturate(150%) !important;
            }
            .media-expanded-meta button .media-symbol,
            .media-expanded-controls button .media-symbol,
            .media-collapse-btn .media-symbol {
                width: 18px !important;
                height: 18px !important;
                display: block !important;
                margin: 0 !important;
                object-fit: contain !important;
                transform: none !important;
            }
            .media-expanded-controls .media-play-btn .media-symbol {
                width: 24px !important;
                height: 24px !important;
            }
            body.dark-mode .media-expanded-meta button,
            body.dark-mode .media-expanded-controls button {
                background: rgba(255, 255, 255, 0.1) !important;
            }
            .media-expanded-progress-row {
                grid-row: 4 !important;
                grid-column: 1 !important;
                width: 100% !important;
                display: grid !important;
                gap: 8px !important;
            }
            .media-expanded-progress {
                width: 100% !important;
                accent-color: var(--media-accent, #0078d4) !important;
            }
            .media-expanded .media-time-row {
                display: flex !important;
                justify-content: space-between !important;
                color: var(--media-muted, rgba(16,19,24,0.58)) !important;
                font-size: 12px !important;
            }
            body.dark-mode .media-expanded .media-time-row {
                color: rgba(255, 255, 255, 0.54) !important;
            }
            .media-expanded-controls {
                grid-row: 5 !important;
                grid-column: 1 !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                gap: clamp(10px, 2vw, 18px) !important;
            }
            .media-expanded-play {
                width: 66px !important;
                min-width: 66px !important;
                height: 66px !important;
                display: inline-grid !important;
                place-items: center !important;
                padding: 0 !important;
                background: var(--media-accent, #0078d4) !important;
                color: #fff !important;
            }
            .media-expanded-aux {
                grid-row: 6 !important;
                grid-column: 1 !important;
                width: 100% !important;
                display: grid !important;
                grid-template-columns: minmax(160px, 1fr) auto !important;
                align-items: center !important;
                gap: 18px !important;
                align-self: start !important;
            }
            .media-expanded-aux .media-volume {
                min-width: 0 !important;
                display: grid !important;
                grid-template-columns: 28px minmax(0, 1fr) !important;
                align-items: center !important;
                gap: 10px !important;
            }
            .media-expanded-aux input {
                width: 100% !important;
                accent-color: var(--media-accent, #0078d4) !important;
            }
            .media-rate-control {
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
                white-space: nowrap !important;
            }
            .media-rate-control select {
                height: 36px !important;
                border-radius: 999px !important;
                border: 0 !important;
                padding: 0 12px !important;
                color: inherit !important;
                background: rgba(255, 255, 255, 0.34) !important;
            }
            body.dark-mode .media-rate-control select {
                background: rgba(255, 255, 255, 0.1) !important;
            }
            @container (max-height: 560px) {
                .media-expanded {
                    grid-template-columns: minmax(160px, min(30vw, 300px)) minmax(0, 560px) !important;
                    grid-template-rows: auto auto auto auto !important;
                    align-content: center !important;
                    column-gap: clamp(22px, 4vw, 54px) !important;
                    row-gap: 14px !important;
                    padding: clamp(20px, 3vw, 36px) !important;
                }
                .media-expanded-art {
                    grid-row: 1 / 5 !important;
                    grid-column: 1 !important;
                    width: min(32vw, 46vh, 300px) !important;
                }
                .media-expanded-info {
                    grid-row: 1 !important;
                    grid-column: 2 !important;
                }
                .media-expanded-progress-row {
                    grid-row: 2 !important;
                    grid-column: 2 !important;
                }
                .media-expanded-controls {
                    grid-row: 3 !important;
                    grid-column: 2 !important;
                }
                .media-expanded-aux {
                    grid-row: 4 !important;
                    grid-column: 2 !important;
                }
            }
            @container (max-width: 760px) {
                .media-expanded {
                    grid-template-columns: minmax(0, calc(100% - 32px)) !important;
                    grid-template-rows: auto minmax(180px, 36vh) auto auto auto auto !important;
                    align-content: center !important;
                    padding: 22px !important;
                    text-align: center !important;
                }
                .media-expanded-art {
                    width: min(70vw, 36vh, 360px) !important;
                }
                .media-expanded-info {
                    grid-template-columns: 1fr !important;
                    justify-items: center !important;
                    text-align: center !important;
                }
                .media-expanded-meta {
                    justify-content: center !important;
                }
                .media-expanded-aux {
                    grid-template-columns: 1fr !important;
                    justify-items: stretch !important;
                }
                .media-rate-control {
                    justify-content: center !important;
                }
            }

            /* Native Fluent refresh: align Media with Files/Settings and keep quarter-snap usable. */
            .window[data-app-id="media"] {
                min-width: 640px !important;
                min-height: 360px !important;
            }
            .window[data-app-id="media"] .window-content {
                min-height: 300px !important;
                background: transparent !important;
            }
            .media-app {
                --media-native-bg: rgba(245, 247, 252, 0.78);
                --media-native-pane: rgba(255, 255, 255, 0.54);
                --media-native-pane-strong: rgba(255, 255, 255, 0.72);
                --media-native-line: rgba(31, 41, 55, 0.1);
                --media-native-text: var(--text-primary, #202020);
                --media-native-muted: var(--text-secondary, rgba(32, 32, 32, 0.62));
                --media-native-hover: rgba(0, 0, 0, 0.05);
                --media-native-active: rgba(0, 120, 212, 0.13);
                --media-native-radius: 16px;
                grid-template-columns: 240px minmax(0, 1fr) !important;
                grid-template-rows: minmax(0, 1fr) 0 !important;
                gap: 0 !important;
                height: 100% !important;
                min-height: 0 !important;
                container-type: size !important;
                overflow: hidden !important;
                color: var(--media-native-text) !important;
                background: var(--media-native-bg) !important;
            }
            body.dark-mode .media-app {
                --media-native-bg: rgba(30, 34, 38, 0.82);
                --media-native-pane: rgba(255, 255, 255, 0.08);
                --media-native-pane-strong: rgba(255, 255, 255, 0.12);
                --media-native-line: rgba(255, 255, 255, 0.12);
                --media-native-text: var(--text-primary, #f5f5f5);
                --media-native-muted: rgba(255, 255, 255, 0.62);
                --media-native-hover: rgba(255, 255, 255, 0.1);
                --media-native-active: rgba(0, 120, 212, 0.22);
            }
            body.fluent-v2 .window[data-app-id="media"],
            body.fluent-v2 .media-app {
                background: rgba(238, 243, 250, 0.48) !important;
                backdrop-filter: blur(30px) saturate(160%) !important;
                -webkit-backdrop-filter: blur(30px) saturate(160%) !important;
            }
            body.fluent-v2.dark-mode .window[data-app-id="media"],
            body.fluent-v2.dark-mode .media-app {
                background: rgba(24, 28, 32, 0.48) !important;
            }
            body:not(.fluent-v2) .media-app {
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }
            .media-sidebar {
                grid-row: 1 / 3 !important;
                width: auto !important;
                min-width: 0 !important;
                gap: 12px !important;
                padding: 18px 12px !important;
                color: var(--media-native-text) !important;
                background: var(--media-native-pane) !important;
                border-right: 1px solid var(--media-native-line) !important;
                box-shadow: none !important;
                backdrop-filter: blur(22px) saturate(145%) !important;
                -webkit-backdrop-filter: blur(22px) saturate(145%) !important;
            }
            body:not(.fluent-v2) .media-sidebar {
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }
            .media-brand {
                padding: 4px 10px 12px !important;
                color: var(--media-native-text) !important;
                font-size: 20px !important;
                font-weight: 700 !important;
                opacity: 1 !important;
            }
            .media-menu-btn {
                width: 36px !important;
                height: 36px !important;
                border-radius: 10px !important;
                color: var(--media-native-text) !important;
                background: transparent !important;
                box-shadow: none !important;
            }
            .media-menu-btn:hover,
            .media-nav-item:hover {
                background: var(--media-native-hover) !important;
                transform: none !important;
            }
            .media-search {
                height: 42px !important;
                padding: 0 12px !important;
                border-radius: 12px !important;
                background: var(--media-native-pane-strong) !important;
                border: 1px solid transparent !important;
                color: var(--media-native-text) !important;
                box-shadow: none !important;
            }
            .media-search input {
                color: var(--media-native-text) !important;
            }
            .media-search input::placeholder {
                color: var(--media-native-muted) !important;
            }
            .media-nav {
                gap: 6px !important;
            }
            .media-nav-item {
                height: 44px !important;
                padding: 0 12px !important;
                border-radius: 10px !important;
                gap: 12px !important;
                color: var(--media-native-text) !important;
                background: transparent !important;
                box-shadow: none !important;
                font-size: 14px !important;
                transition: background var(--transition-fast, 160ms ease), color var(--transition-fast, 160ms ease) !important;
            }
            .media-nav-item.active {
                color: var(--accent, #0078d4) !important;
                background: var(--media-native-active) !important;
                box-shadow: 0 0 0 1px rgba(0, 120, 212, 0.26) inset !important;
            }
            .media-actions {
                gap: 8px !important;
            }
            .media-action-primary,
            .media-action-secondary {
                height: 38px !important;
                border-radius: 999px !important;
                box-shadow: none !important;
                font-weight: 600 !important;
            }
            .media-action-primary {
                background: var(--accent, #0078d4) !important;
                color: #fff !important;
            }
            .media-action-secondary {
                background: var(--media-native-pane-strong) !important;
                color: var(--media-native-text) !important;
            }
            .media-main {
                display: block !important;
                min-width: 0 !important;
                min-height: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                background: transparent !important;
            }
            .media-main-scroll,
            .media-main-scroll .fluent-scroll-viewport {
                height: 100% !important;
                min-height: 0 !important;
            }
            .media-main-scroll .fluent-scroll-viewport {
                padding: 24px 28px 88px !important;
            }
            .media-home,
            .media-page-recent,
            .media-now-page,
            .media-playlist-page,
            .media-import-empty {
                width: 100% !important;
                max-width: none !important;
                color: var(--media-native-text) !important;
            }
            .media-home-head {
                display: flex !important;
                align-items: flex-start !important;
                justify-content: space-between !important;
                gap: 18px !important;
                margin: 0 0 22px !important;
            }
            .media-home-head p {
                margin: 0 0 4px !important;
                color: var(--media-native-muted) !important;
                font-weight: 650 !important;
            }
            .media-home-head h1 {
                margin: 0 !important;
                color: var(--media-native-text) !important;
                font-size: clamp(26px, 4vw, 42px) !important;
                letter-spacing: -0.04em !important;
                line-height: 1.06 !important;
            }
            .media-filter-group {
                display: flex !important;
                gap: 8px !important;
                background: transparent !important;
            }
            .media-filter-group button {
                height: 32px !important;
                padding: 0 12px !important;
                border-radius: 999px !important;
                color: var(--media-native-muted) !important;
                background: transparent !important;
            }
            .media-filter-group button.active {
                color: var(--accent, #0078d4) !important;
                background: var(--media-native-active) !important;
            }
            .media-section-title {
                margin: 18px 0 12px !important;
                color: var(--media-native-text) !important;
                font-size: 19px !important;
                font-weight: 700 !important;
                letter-spacing: -0.01em !important;
            }
            .media-feature-row,
            .media-album-row {
                display: grid !important;
                grid-auto-flow: column !important;
                grid-auto-columns: minmax(180px, 250px) !important;
                gap: 14px !important;
                overflow-x: auto !important;
                padding: 2px 2px 10px !important;
                scroll-snap-type: x proximity !important;
            }
            .media-home-card {
                min-height: 150px !important;
                border-radius: var(--media-native-radius) !important;
                padding: 16px !important;
                border: 1px solid var(--media-native-line) !important;
                box-shadow: none !important;
                transform: none !important;
                transition: background var(--transition-fast, 160ms ease), transform 180ms ease !important;
            }
            .media-home-card:hover {
                transform: translateY(-2px) !important;
                box-shadow: none !important;
            }
            .media-home-card.active {
                outline: none !important;
                border-color: var(--media-native-line) !important;
            }
            .media-home-card.no-cover {
                background: var(--media-card-gradient) !important;
            }
            .media-library-panel {
                margin-top: 0 !important;
                padding: 14px !important;
                border-radius: var(--media-native-radius) !important;
                background: var(--media-native-pane) !important;
                border: 1px solid var(--media-native-line) !important;
                box-shadow: none !important;
            }
            .media-panel-head {
                margin-bottom: 10px !important;
            }
            .media-panel-kicker {
                color: var(--accent, #0078d4) !important;
            }
            .media-panel-head h2 {
                margin: 2px 0 0 !important;
                color: var(--media-native-text) !important;
                font-size: 22px !important;
            }
            .media-track-list {
                display: grid !important;
                gap: 6px !important;
                padding: 0 !important;
                background: transparent !important;
            }
            .media-track {
                min-height: 52px !important;
                border-radius: 12px !important;
                padding: 8px 10px !important;
                color: var(--media-native-text) !important;
                background: transparent !important;
            }
            .media-track:hover,
            .media-track.active {
                background: var(--media-native-hover) !important;
            }
            .media-small-art {
                width: 38px !important;
                height: 38px !important;
                border-radius: 10px !important;
            }
            .media-player-bar {
                left: calc(240px + ((100% - 240px) / 2)) !important;
                bottom: 16px !important;
                width: min(620px, calc(100% - 240px - 32px)) !important;
                min-height: 58px !important;
                padding: 8px 12px !important;
                grid-template-columns: minmax(0, 1fr) auto auto !important;
                gap: 10px !important;
                border-radius: 999px !important;
                color: var(--media-native-text) !important;
                background: var(--media-native-pane-strong) !important;
                border: 1px solid var(--media-native-line) !important;
                box-shadow: none !important;
            }
            body.fluent-v2 .media-player-bar {
                backdrop-filter: blur(24px) saturate(150%) !important;
                -webkit-backdrop-filter: blur(24px) saturate(150%) !important;
            }
            .media-button-row button,
            .media-options button {
                width: 34px !important;
                height: 34px !important;
                min-width: 34px !important;
                display: inline-grid !important;
                place-items: center !important;
                color: var(--media-native-text) !important;
                background: transparent !important;
                border-radius: 999px !important;
                padding: 0 !important;
            }
            .media-button-row button:hover,
            .media-options button:hover {
                background: var(--media-native-hover) !important;
                transform: none !important;
            }
            .media-play-btn {
                width: 44px !important;
                min-width: 44px !important;
                height: 44px !important;
                background: var(--accent, #0078d4) !important;
                color: #fff !important;
                box-shadow: none !important;
            }
            .media-app:has(.media-expanded.active) .media-sidebar,
            .media-app:has(.media-expanded.active) .media-main {
                opacity: 0.28 !important;
                filter: blur(5px) !important;
            }
            .media-expanded {
                inset: 0 !important;
                z-index: 90 !important;
                display: grid !important;
                grid-template-columns: minmax(180px, min(38%, 360px)) minmax(0, 560px) !important;
                grid-template-rows: auto auto auto auto !important;
                align-content: center !important;
                justify-content: center !important;
                align-items: center !important;
                column-gap: clamp(24px, 5vw, 68px) !important;
                row-gap: 14px !important;
                padding: clamp(22px, 4vw, 54px) !important;
                overflow: hidden !important;
                color: var(--media-native-text) !important;
                background: rgba(245, 247, 252, 0.82) !important;
                backdrop-filter: blur(28px) saturate(150%) !important;
                -webkit-backdrop-filter: blur(28px) saturate(150%) !important;
            }
            body.dark-mode .media-expanded {
                color: #fff !important;
                background: rgba(22, 26, 30, 0.82) !important;
            }
            body.fluent-v2 .media-expanded {
                background: rgba(238, 243, 250, 0.58) !important;
            }
            body.fluent-v2.dark-mode .media-expanded {
                background: rgba(22, 26, 30, 0.58) !important;
            }
            .media-expanded-bg {
                inset: -80px !important;
                z-index: -2 !important;
                opacity: 0.2 !important;
                filter: blur(48px) saturate(120%) !important;
                transform: scale(1.18) !important;
            }
            .media-expanded-bg::after {
                background: rgba(245, 247, 252, 0.72) !important;
            }
            body.dark-mode .media-expanded-bg::after {
                background: rgba(22, 26, 30, 0.74) !important;
            }
            .media-collapse-btn {
                top: 18px !important;
                left: 18px !important;
                width: 42px !important;
                height: 42px !important;
                background: var(--media-native-pane-strong) !important;
                color: var(--media-native-text) !important;
                box-shadow: none !important;
            }
            .media-expanded-art {
                grid-column: 1 !important;
                grid-row: 1 / 5 !important;
                width: min(100%, 44vh, 360px) !important;
                min-width: 0 !important;
                justify-self: end !important;
                align-self: center !important;
                border-radius: 22px !important;
                box-shadow: none !important;
                border: 1px solid var(--media-native-line) !important;
            }
            .media-expanded-info {
                grid-column: 2 !important;
                grid-row: 1 !important;
                width: 100% !important;
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) auto !important;
                align-items: end !important;
                gap: 14px !important;
                text-align: left !important;
            }
            .media-expanded-info h2 {
                font-size: clamp(26px, 4vw, 46px) !important;
                line-height: 1.02 !important;
                color: inherit !important;
            }
            .media-expanded-info p,
            .media-expanded .media-time-row,
            .media-rate-control {
                color: var(--media-native-muted) !important;
            }
            .media-expanded-meta {
                justify-content: end !important;
                gap: 8px !important;
            }
            .media-expanded-meta button,
            .media-expanded-controls button,
            .media-rate-control select {
                background: var(--media-native-pane-strong) !important;
                color: var(--media-native-text) !important;
                border: 1px solid var(--media-native-line) !important;
                box-shadow: none !important;
            }
            .media-expanded-progress-row {
                grid-column: 2 !important;
                grid-row: 2 !important;
            }
            .media-expanded-controls {
                grid-column: 2 !important;
                grid-row: 3 !important;
                justify-content: flex-start !important;
                gap: 10px !important;
            }
            .media-expanded-play {
                background: var(--accent, #0078d4) !important;
                color: #fff !important;
                border-color: transparent !important;
            }
            .media-expanded-aux {
                grid-column: 2 !important;
                grid-row: 4 !important;
                display: grid !important;
                grid-template-columns: minmax(140px, 1fr) auto !important;
                gap: 14px !important;
                align-items: center !important;
            }
            .media-expanded-aux .media-volume {
                grid-template-columns: 26px minmax(0, 1fr) !important;
            }
            @container (max-width: 760px) {
                .media-app {
                    grid-template-columns: 84px minmax(0, 1fr) !important;
                }
                .media-sidebar {
                    padding: 14px 8px !important;
                }
                .media-brand,
                .media-search,
                .media-actions,
                .media-nav-item:not(.active) {
                    display: none !important;
                }
                .media-nav-item {
                    justify-content: center !important;
                    padding: 0 !important;
                }
                .media-nav-icon {
                    width: auto !important;
                }
                .media-main-scroll .fluent-scroll-viewport {
                    padding: 18px 18px 78px !important;
                }
                .media-home-head {
                    display: grid !important;
                }
                .media-feature-row {
                    grid-auto-columns: minmax(168px, 220px) !important;
                }
                .media-player-bar {
                    left: calc(84px + ((100% - 84px) / 2)) !important;
                    width: min(520px, calc(100% - 84px - 24px)) !important;
                    bottom: 10px !important;
                }
                .media-now-card span,
                .media-player-bar .media-options button:first-child {
                    display: none !important;
                }
            }
            @container (max-width: 700px) {
                .media-expanded {
                    grid-template-columns: minmax(120px, 34%) minmax(0, 1fr) !important;
                    column-gap: 18px !important;
                    padding: 18px !important;
                }
                .media-expanded-art {
                    width: min(100%, 34vh, 220px) !important;
                    border-radius: 16px !important;
                }
                .media-expanded-info {
                    grid-template-columns: 1fr !important;
                }
                .media-expanded-meta {
                    justify-content: flex-start !important;
                }
                .media-expanded-info h2 {
                    font-size: clamp(22px, 5vw, 34px) !important;
                }
                .media-expanded-controls button {
                    width: 38px !important;
                    height: 38px !important;
                    min-width: 38px !important;
                }
                .media-expanded-play {
                    width: 52px !important;
                    min-width: 52px !important;
                    height: 52px !important;
                }
                .media-expanded-aux {
                    grid-template-columns: 1fr !important;
                }
            }
            @container (max-height: 470px) {
                .media-expanded {
                    row-gap: 8px !important;
                    padding-top: 14px !important;
                    padding-bottom: 14px !important;
                }
                .media-expanded-art {
                    width: min(100%, 38vh, 220px) !important;
                }
                .media-expanded-info h2 {
                    font-size: clamp(22px, 4vw, 34px) !important;
                }
                .media-expanded-info p {
                    margin-top: 4px !important;
                    font-size: 14px !important;
                }
                .media-expanded-controls button {
                    width: 36px !important;
                    height: 36px !important;
                    min-width: 36px !important;
                }
                .media-expanded-play {
                    width: 50px !important;
                    min-width: 50px !important;
                    height: 50px !important;
                }
            }

            /* Fluent v1: match File Manager's simpler native sidebar language. */
            body:not(.fluent-v2) .media-app {
                grid-template-columns: 200px minmax(0, 1fr) !important;
                background: var(--bg-primary, #ffffff) !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }
            body:not(.fluent-v2).dark-mode .media-app {
                background: #1f1f1f !important;
            }
            body:not(.fluent-v2) .media-sidebar {
                width: 200px !important;
                padding: 12px 8px !important;
                gap: 12px !important;
                border-radius: 0 !important;
                border: 0 !important;
                border-right: 1px solid var(--border-color) !important;
                background: rgba(255, 255, 255, 0.5) !important;
                color: var(--text-primary) !important;
                box-shadow: none !important;
                backdrop-filter: blur(20px) saturate(180%) !important;
                -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
            }
            body:not(.fluent-v2).dark-mode .media-sidebar {
                background: rgba(32, 32, 32, 0.5) !important;
                color: var(--text-primary, #f5f5f5) !important;
            }
            body:not(.fluent-v2).blur-disabled .media-sidebar {
                background: rgba(255, 255, 255, 0.95) !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }
            body:not(.fluent-v2).dark-mode.blur-disabled .media-sidebar {
                background: rgba(32, 32, 32, 0.95) !important;
            }
            .media-brand,
            .media-menu-btn {
                display: none !important;
            }
            body:not(.fluent-v2) .media-search {
                height: 38px !important;
                margin: 0 0 4px !important;
                padding: 6px 12px !important;
                border-radius: var(--radius-sm) !important;
                background: var(--bg-secondary) !important;
                border: 0 !important;
                color: var(--text-primary) !important;
                box-shadow: none !important;
            }
            body:not(.fluent-v2) .media-search:focus-within {
                box-shadow: 0 0 0 2px var(--accent) !important;
                background: var(--bg-tertiary) !important;
            }
            body:not(.fluent-v2) .media-search input {
                font-size: 13px !important;
                color: var(--text-primary) !important;
            }
            body:not(.fluent-v2) .media-nav {
                gap: 4px !important;
            }
            body:not(.fluent-v2) .media-nav-item {
                height: 38px !important;
                padding: 8px 12px !important;
                border-radius: var(--radius-sm) !important;
                gap: 12px !important;
                color: var(--text-primary) !important;
                background: transparent !important;
                border: 0 !important;
                box-shadow: none !important;
                font-size: 13px !important;
                font-weight: 500 !important;
            }
            body:not(.fluent-v2) .media-nav-item:hover {
                background: rgba(0, 0, 0, 0.05) !important;
            }
            body:not(.fluent-v2).dark-mode .media-nav-item:hover {
                background: rgba(255, 255, 255, 0.1) !important;
            }
            body:not(.fluent-v2) .media-nav-item.active {
                color: var(--text-primary) !important;
                background: rgba(0, 0, 0, 0.06) !important;
                box-shadow: none !important;
            }
            body:not(.fluent-v2).dark-mode .media-nav-item.active {
                background: rgba(255, 255, 255, 0.12) !important;
            }
            body:not(.fluent-v2) .media-nav-item .media-symbol,
            body:not(.fluent-v2) .media-search .media-symbol {
                width: 16px !important;
                height: 16px !important;
            }
            body:not(.fluent-v2) .media-actions {
                gap: 8px !important;
            }
            body:not(.fluent-v2) .media-action-primary,
            body:not(.fluent-v2) .media-action-secondary {
                height: 36px !important;
                border-radius: var(--radius-sm) !important;
                box-shadow: none !important;
            }
            body:not(.fluent-v2) .media-action-secondary {
                background: var(--bg-secondary) !important;
                color: var(--text-primary) !important;
            }
            body:not(.fluent-v2) .media-main-scroll .fluent-scroll-viewport {
                padding: 16px 16px 78px !important;
            }
            body:not(.fluent-v2) .media-player-bar {
                left: calc(200px + ((100% - 200px) / 2)) !important;
                width: min(620px, calc(100% - 200px - 32px)) !important;
                background: var(--bg-tertiary) !important;
                border-color: var(--border-color) !important;
                color: var(--text-primary) !important;
            }
            body:not(.fluent-v2).dark-mode .media-player-bar {
                background: rgba(32, 32, 32, 0.88) !important;
            }
            body:not(.fluent-v2) .media-sidebar {
                width: 188px !important;
                padding-left: 6px !important;
                padding-right: 10px !important;
            }
            body:not(.fluent-v2) .media-search,
            body:not(.fluent-v2) .media-nav-item,
            body:not(.fluent-v2) .media-actions {
                margin-left: 0 !important;
                margin-right: 4px !important;
            }
            body:not(.fluent-v2) .media-nav-item {
                padding-left: 10px !important;
            }
            body:not(.fluent-v2) .media-main-scroll .fluent-scroll-viewport {
                padding-left: 34px !important;
                padding-right: 18px !important;
            }
            body:not(.fluent-v2) .media-player-bar {
                left: calc(188px + ((100% - 188px) / 2) + 12px) !important;
                width: min(620px, calc(100% - 188px - 56px)) !important;
            }

            /* Final shell normalization: v1 follows native windows, v2 follows Settings/Files glass language. */
            body:not(.fluent-v2) .window[data-app-id="media"] {
                background: var(--bg-secondary) !important;
                backdrop-filter: blur(var(--blur-lg)) saturate(150%) !important;
                -webkit-backdrop-filter: blur(var(--blur-lg)) saturate(150%) !important;
            }
            body:not(.fluent-v2) .window[data-app-id="media"] .window-titlebar {
                background: var(--bg-tertiary) !important;
                border-bottom: 1px solid var(--border-color) !important;
                backdrop-filter: inherit !important;
                -webkit-backdrop-filter: inherit !important;
            }
            body:not(.fluent-v2) .window[data-app-id="media"] .window-content {
                background: transparent !important;
            }
            body.fluent-v2 .window[data-app-id="media"] {
                background:
                    radial-gradient(circle at 18% 18%, rgba(255,255,255,0.24), transparent 34%),
                    rgba(226, 234, 244, 0.42) !important;
                border: 1px solid rgba(255,255,255,0.28) !important;
                box-shadow: 0 28px 80px rgba(24, 34, 48, 0.24) !important;
                backdrop-filter: blur(34px) saturate(165%) !important;
                -webkit-backdrop-filter: blur(34px) saturate(165%) !important;
            }
            body.fluent-v2.dark-mode .window[data-app-id="media"] {
                background:
                    radial-gradient(circle at 18% 18%, rgba(255,255,255,0.08), transparent 34%),
                    rgba(24, 28, 34, 0.46) !important;
                border-color: rgba(255,255,255,0.12) !important;
                box-shadow: 0 30px 86px rgba(0,0,0,0.38) !important;
            }
            body.fluent-v2 .window[data-app-id="media"] .window-titlebar {
                background: rgba(238, 243, 250, 0.32) !important;
                border-bottom: 1px solid rgba(255,255,255,0.16) !important;
                backdrop-filter: blur(24px) saturate(150%) !important;
                -webkit-backdrop-filter: blur(24px) saturate(150%) !important;
            }
            body.fluent-v2.dark-mode .window[data-app-id="media"] .window-titlebar {
                background: rgba(22, 26, 32, 0.34) !important;
                border-bottom-color: rgba(255,255,255,0.08) !important;
            }
            body.fluent-v2 .window[data-app-id="media"] .window-content {
                background: transparent !important;
            }
            body.fluent-v2 .media-app {
                --media-native-bg: transparent;
                --media-native-pane: rgba(255,255,255,0.28);
                --media-native-pane-strong: rgba(255,255,255,0.44);
                --media-native-line: rgba(255,255,255,0.24);
                --media-native-hover: rgba(255,255,255,0.24);
                --media-native-active: rgba(0,120,212,0.18);
                background:
                    linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)),
                    transparent !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }
            body.fluent-v2.dark-mode .media-app {
                --media-native-pane: rgba(12, 16, 20, 0.36);
                --media-native-pane-strong: rgba(255,255,255,0.1);
                --media-native-line: rgba(255,255,255,0.12);
                --media-native-hover: rgba(255,255,255,0.1);
                --media-native-active: rgba(0,120,212,0.24);
            }
            body.fluent-v2 .media-sidebar {
                margin: 18px 0 18px 18px !important;
                padding: 18px 12px !important;
                border-radius: 18px !important;
                border: 1px solid var(--media-native-line) !important;
                background: var(--media-native-pane) !important;
                box-shadow: none !important;
                backdrop-filter: blur(26px) saturate(155%) !important;
                -webkit-backdrop-filter: blur(26px) saturate(155%) !important;
            }
            body.fluent-v2 .media-search {
                height: 44px !important;
                border-radius: 14px !important;
                background: var(--media-native-pane-strong) !important;
                border: 1px solid rgba(255,255,255,0.18) !important;
            }
            body.fluent-v2 .media-nav-item {
                height: 44px !important;
                border-radius: 12px !important;
                color: var(--media-native-text) !important;
                background: transparent !important;
                box-shadow: none !important;
            }
            body.fluent-v2 .media-nav-item:hover {
                background: var(--media-native-hover) !important;
            }
            body.fluent-v2 .media-nav-item.active {
                color: var(--accent, #0078d4) !important;
                background: var(--media-native-active) !important;
                box-shadow: 0 0 0 1px rgba(0,120,212,0.32) inset !important;
            }
            body.fluent-v2 .media-main-scroll .fluent-scroll-viewport {
                padding: 24px 30px 92px 34px !important;
            }
            body.fluent-v2 .media-library-panel,
            body.fluent-v2 .media-import-empty-card {
                background: var(--media-native-pane) !important;
                border: 1px solid var(--media-native-line) !important;
                box-shadow: none !important;
                backdrop-filter: blur(24px) saturate(145%) !important;
                -webkit-backdrop-filter: blur(24px) saturate(145%) !important;
            }
            body.fluent-v2 .media-action-primary,
            body.fluent-v2 .media-play-btn,
            body.fluent-v2 .media-expanded-play {
                background: var(--accent, #0078d4) !important;
                color: #fff !important;
                border: 0 !important;
                box-shadow:
                    inset 0 1px 0 rgba(255,255,255,0.28),
                    0 8px 20px rgba(0,120,212,0.22) !important;
            }
            body.fluent-v2 .media-action-secondary,
            body.fluent-v2 .media-button-row button,
            body.fluent-v2 .media-options button,
            body.fluent-v2 .media-expanded-meta button,
            body.fluent-v2 .media-expanded-controls button,
            body.fluent-v2 .media-rate-control select {
                background: var(--media-native-pane-strong) !important;
                color: var(--media-native-text) !important;
                border: 1px solid var(--media-native-line) !important;
                box-shadow: none !important;
                backdrop-filter: blur(18px) saturate(145%) !important;
                -webkit-backdrop-filter: blur(18px) saturate(145%) !important;
            }
            body.fluent-v2 .media-action-primary:hover,
            body.fluent-v2 .media-action-secondary:hover,
            body.fluent-v2 .media-button-row button:hover,
            body.fluent-v2 .media-options button:hover,
            body.fluent-v2 .media-expanded-meta button:hover,
            body.fluent-v2 .media-expanded-controls button:hover {
                transform: translateY(-1px) !important;
                filter: brightness(1.04) !important;
            }
            body.fluent-v2 .media-player-bar {
                background: rgba(255,255,255,0.42) !important;
                border: 1px solid rgba(255,255,255,0.26) !important;
                box-shadow: none !important;
                backdrop-filter: blur(28px) saturate(155%) !important;
                -webkit-backdrop-filter: blur(28px) saturate(155%) !important;
            }
            body.fluent-v2.dark-mode .media-player-bar {
                background: rgba(16, 20, 24, 0.44) !important;
                border-color: rgba(255,255,255,0.12) !important;
            }
            body.fluent-v2 .media-expanded {
                background: rgba(238, 243, 250, 0.52) !important;
                backdrop-filter: blur(34px) saturate(160%) !important;
                -webkit-backdrop-filter: blur(34px) saturate(160%) !important;
            }
            body.fluent-v2.dark-mode .media-expanded {
                background: rgba(16, 20, 24, 0.56) !important;
            }

            body.fluent-v2 .media-sidebar {
                margin: 10px 0 10px 10px !important;
                border-radius: 12px !important;
            }
            body.fluent-v2 .media-app {
                grid-template-columns: 232px minmax(0, 1fr) !important;
            }
            body.fluent-v2 .media-player-bar {
                left: calc(242px + ((100% - 242px) / 2)) !important;
                width: min(620px, calc(100% - 242px - 34px)) !important;
            }
            body:not(.dark-mode) .media-player-bar .media-play-btn,
            body:not(.dark-mode) .media-expanded-play {
                background: rgba(255,255,255,0.76) !important;
                color: #111 !important;
                border: 1px solid rgba(0,0,0,0.08) !important;
                box-shadow: none !important;
            }
            body:not(.dark-mode) .media-player-bar .media-play-btn .media-symbol,
            body:not(.dark-mode) .media-expanded-play .media-symbol {
                filter: brightness(0) !important;
            }
            .media-player-bar,
            .media-sidebar,
            .media-main {
                transition:
                    opacity 360ms cubic-bezier(0.16, 1, 0.3, 1),
                    filter 520ms cubic-bezier(0.16, 1, 0.3, 1),
                    transform 520ms cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .media-app.player-expanded .media-player-bar,
            .media-app:has(.media-expanded.active) .media-player-bar {
                opacity: 0 !important;
                pointer-events: none !important;
                filter: blur(12px) saturate(0.92) !important;
                transform: translateX(-50%) translateY(22px) scale(0.86) !important;
                transition:
                    opacity 360ms cubic-bezier(0.16, 1, 0.3, 1),
                    filter 520ms cubic-bezier(0.16, 1, 0.3, 1),
                    transform 520ms cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .media-expanded {
                opacity: 0 !important;
                pointer-events: none !important;
                transform-origin: 50% calc(100% - 38px) !important;
                transform: translateY(34%) scale(0.42) !important;
                border-radius: 999px !important;
                clip-path: inset(72% 24% 7% 24% round 999px) !important;
                transition:
                    opacity 280ms cubic-bezier(0.16, 1, 0.3, 1),
                    transform 620ms cubic-bezier(0.16, 1, 0.3, 1),
                    border-radius 620ms cubic-bezier(0.16, 1, 0.3, 1),
                    clip-path 620ms cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .media-expanded.active {
                opacity: 1 !important;
                pointer-events: auto !important;
                transform: translateY(0) scale(1) !important;
                border-radius: 0 !important;
                clip-path: inset(0 0 0 0 round 0) !important;
            }
            .media-expanded-art,
            .media-expanded-info,
            .media-expanded-progress-row,
            .media-expanded-controls,
            .media-expanded-aux,
            .media-expanded-meta button,
            .media-expanded-controls button {
                transition:
                    opacity 520ms cubic-bezier(0.16, 1, 0.3, 1),
                    transform 620ms cubic-bezier(0.16, 1, 0.3, 1),
                    width 620ms cubic-bezier(0.16, 1, 0.3, 1),
                    height 620ms cubic-bezier(0.16, 1, 0.3, 1),
                    border-radius 620ms cubic-bezier(0.16, 1, 0.3, 1),
                    background 360ms cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .media-expanded:not(.active) .media-expanded-art {
                transform: translate(-26%, 48%) scale(0.32) !important;
                opacity: 0 !important;
            }
            .media-expanded:not(.active) .media-expanded-info,
            .media-expanded:not(.active) .media-expanded-progress-row,
            .media-expanded:not(.active) .media-expanded-controls,
            .media-expanded:not(.active) .media-expanded-aux {
                transform: translateY(28px) scale(0.96) !important;
                opacity: 0 !important;
            }
            .media-expanded::before {
                content: "" !important;
                position: absolute !important;
                inset: -42% !important;
                z-index: -1 !important;
                opacity: 0.62 !important;
                pointer-events: none !important;
                background:
                    radial-gradient(circle at 22% 34%, color-mix(in srgb, var(--media-theme-a, #5ac8fa) 78%, transparent), transparent 30%),
                    radial-gradient(circle at 78% 26%, color-mix(in srgb, var(--media-theme-b, #0078d4) 68%, transparent), transparent 34%),
                    radial-gradient(circle at 52% 82%, color-mix(in srgb, var(--media-theme-c, #d8f3ff) 72%, transparent), transparent 36%),
                    linear-gradient(135deg, var(--media-theme-a, #5ac8fa), var(--media-theme-b, #0078d4), var(--media-theme-c, #d8f3ff)) !important;
                filter: blur(34px) saturate(1.18) !important;
                transform: translate3d(-3%, -2%, 0) scale(1.08) !important;
                animation: mediaThemeDrift 24s cubic-bezier(0.45, 0, 0.2, 1) infinite alternate !important;
            }
            .media-expanded-art,
            .media-expanded-bg {
                background: var(--media-expanded-art-bg, var(--media-theme-a, #5ac8fa)) !important;
                background-size: cover !important;
                background-position: center !important;
            }
            body.dark-mode .media-expanded::before {
                opacity: 0.44 !important;
                filter: blur(42px) saturate(1.12) brightness(0.74) !important;
            }
            .media-app,
            body.fluent-v2 .media-app {
                --media-sidebar-width: clamp(68px, 23%, 232px);
                grid-template-columns: var(--media-sidebar-width) minmax(0, 1fr) !important;
                transition:
                    grid-template-columns 430ms cubic-bezier(0.16, 1, 0.3, 1),
                    background 260ms cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .media-player-bar,
            body.fluent-v2 .media-player-bar,
            body:not(.fluent-v2) .media-player-bar,
            .media-app.sidebar-collapsed .media-player-bar {
                left: calc(var(--media-sidebar-width) + ((100% - var(--media-sidebar-width)) / 2)) !important;
                width: min(760px, calc(100% - var(--media-sidebar-width) - 36px)) !important;
                transform: translateX(-50%) !important;
                transition:
                    left 430ms cubic-bezier(0.16, 1, 0.3, 1),
                    width 430ms cubic-bezier(0.16, 1, 0.3, 1),
                    opacity 360ms cubic-bezier(0.16, 1, 0.3, 1),
                    filter 520ms cubic-bezier(0.16, 1, 0.3, 1),
                    transform 520ms cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .media-frequency-row {
                display: grid !important;
                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                gap: 14px !important;
                padding: 2px 2px 10px !important;
            }
            .media-frequency-row .media-home-card {
                min-height: 132px !important;
                width: 100% !important;
            }
            .media-home-card,
            .media-home-card.active,
            .media-home-card.no-cover,
            .media-home-card:not(.no-cover):not(.is-empty),
            body.fluent-v2 .media-home-card,
            body.fluent-v2 .media-home-card.no-cover,
            body.dark-mode .media-home-card,
            body.fluent-v2.dark-mode .media-home-card {
                border: 0 !important;
                outline: 0 !important;
            }
            .media-sidebar,
            .media-nav-item,
            .media-nav-icon,
            .media-nav-label,
            .media-nav-item .media-symbol,
            .media-search,
            .media-actions,
            .media-sidebar-bottom {
                transition:
                    width 420ms cubic-bezier(0.16, 1, 0.3, 1),
                    min-width 420ms cubic-bezier(0.16, 1, 0.3, 1),
                    max-width 420ms cubic-bezier(0.16, 1, 0.3, 1),
                    opacity 260ms cubic-bezier(0.16, 1, 0.3, 1),
                    transform 420ms cubic-bezier(0.16, 1, 0.3, 1),
                    padding 420ms cubic-bezier(0.16, 1, 0.3, 1),
                    margin 420ms cubic-bezier(0.16, 1, 0.3, 1),
                    border-radius 420ms cubic-bezier(0.16, 1, 0.3, 1),
                    background 260ms cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .media-sidebar-bottom {
                margin-top: auto !important;
                display: grid !important;
                gap: 8px !important;
            }
            .media-sidebar-bottom .media-nav-item {
                margin-bottom: 0 !important;
            }
            .media-main-scroll .fluent-scroll-viewport {
                transition: padding 430ms cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .media-settings-panel {
                width: min(620px, 100%) !important;
                display: grid !important;
                gap: 12px !important;
                padding: 18px !important;
                border-radius: 18px !important;
                background: var(--media-native-pane, rgba(255,255,255,0.42)) !important;
                color: var(--media-native-text, var(--text-primary)) !important;
            }
            .media-settings-option {
                min-height: 68px !important;
                display: grid !important;
                grid-template-columns: 40px minmax(0, 1fr) !important;
                align-items: center !important;
                gap: 14px !important;
                padding: 14px 16px !important;
                border-radius: 14px !important;
                text-align: left !important;
                color: inherit !important;
                background: rgba(255, 255, 255, 0.36) !important;
                transition: background 180ms cubic-bezier(0.16, 1, 0.3, 1), transform 180ms cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .media-settings-option:hover {
                transform: translateY(-1px) !important;
                background: rgba(255, 255, 255, 0.52) !important;
            }
            .media-settings-option > span {
                width: 40px !important;
                height: 40px !important;
                display: grid !important;
                place-items: center !important;
                border-radius: 12px !important;
                background: rgba(0, 120, 212, 0.12) !important;
            }
            .media-settings-option strong {
                min-width: 0 !important;
                font-size: 15px !important;
            }
            .media-settings-option small {
                grid-column: 2 !important;
                color: var(--media-native-muted, var(--text-secondary)) !important;
                line-height: 1.45 !important;
            }
            .media-settings-danger > span {
                background: rgba(220, 38, 38, 0.12) !important;
            }
            body.dark-mode .media-settings-panel,
            body.dark-mode .media-settings-option {
                background: rgba(255, 255, 255, 0.08) !important;
            }
            .media-expanded {
                transform-origin: var(--media-origin-x, 50%) var(--media-origin-y, calc(100% - 54px)) !important;
                transform: scale(0.18) !important;
                clip-path: inset(
                    var(--media-collapse-top, calc(100% - 90px))
                    var(--media-collapse-right, 24%)
                    var(--media-collapse-bottom, 18px)
                    var(--media-collapse-left, 24%)
                    round 999px
                ) !important;
                opacity: 0 !important;
                border-radius: 999px !important;
                overflow: hidden !important;
                background:
                    radial-gradient(circle at 22% 14%, color-mix(in srgb, var(--media-theme-c, #d8f3ff) 54%, transparent), transparent 36%),
                    color-mix(in srgb, var(--media-theme-a, #5ac8fa) 16%, rgba(248, 249, 255, 0.48)) !important;
                transition:
                    opacity 260ms cubic-bezier(0.16, 1, 0.3, 1),
                    transform 660ms cubic-bezier(0.16, 1, 0.3, 1),
                    border-radius 660ms cubic-bezier(0.16, 1, 0.3, 1),
                    clip-path 660ms cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .media-expanded.active {
                transform: scale(1) !important;
                clip-path: inset(0 0 0 0 round 0) !important;
                opacity: 1 !important;
                border-radius: 0 !important;
            }
            .media-expanded::before {
                z-index: 0 !important;
                inset: -46% !important;
                opacity: 0.86 !important;
                background:
                    radial-gradient(circle at 18% 24%, color-mix(in srgb, var(--media-theme-a, #5ac8fa) 86%, transparent), transparent 31%),
                    radial-gradient(circle at 78% 18%, color-mix(in srgb, var(--media-theme-b, #0078d4) 76%, transparent), transparent 34%),
                    radial-gradient(circle at 62% 78%, color-mix(in srgb, var(--media-theme-c, #d8f3ff) 82%, transparent), transparent 36%),
                    radial-gradient(circle at 30% 90%, color-mix(in srgb, var(--media-theme-b, #0078d4) 38%, transparent), transparent 32%),
                    linear-gradient(145deg, var(--media-theme-a, #5ac8fa), var(--media-theme-b, #0078d4) 54%, var(--media-theme-c, #d8f3ff)) !important;
                filter: blur(54px) saturate(1.36) brightness(1.04) !important;
                animation: mediaThemeDrift 18s cubic-bezier(0.45, 0, 0.2, 1) infinite alternate !important;
            }
            .media-expanded::after {
                content: "" !important;
                position: absolute !important;
                inset: 0 !important;
                z-index: 1 !important;
                pointer-events: none !important;
                background:
                    linear-gradient(180deg, rgba(255,255,255,0.36), rgba(255,255,255,0.12) 42%, rgba(255,255,255,0.28)),
                    radial-gradient(circle at 50% 8%, rgba(255,255,255,0.46), transparent 38%) !important;
            }
            body.dark-mode .media-expanded::before {
                opacity: 0.64 !important;
                filter: blur(58px) saturate(1.24) brightness(0.82) !important;
            }
            body.dark-mode .media-expanded::after {
                background:
                    linear-gradient(180deg, rgba(10,12,18,0.28), rgba(10,12,18,0.46)),
                    radial-gradient(circle at 50% 8%, rgba(255,255,255,0.12), transparent 38%) !important;
            }
            .media-expanded-bg {
                z-index: 0 !important;
                opacity: 0.28 !important;
                filter: blur(62px) saturate(1.28) !important;
                transform: scale(1.22) !important;
            }
            .media-expanded-bg::after {
                background: transparent !important;
            }
            .media-collapse-btn,
            .media-expanded-art,
            .media-expanded-info,
            .media-expanded-progress-row,
            .media-expanded-controls,
            .media-expanded-aux {
                position: relative !important;
                z-index: 2 !important;
            }
            .media-expanded-info h2 {
                letter-spacing: 0 !important;
            }
            .media-app.player-expanded .media-player-bar,
            .media-app.player-collapsing .media-player-bar,
            .media-app:has(.media-expanded.active) .media-player-bar {
                opacity: 0 !important;
                pointer-events: none !important;
                filter: blur(12px) saturate(0.92) !important;
                transform: translateX(-50%) scale(0.94) !important;
            }
            .media-app.player-collapsing:has(.media-expanded.active) .media-player-bar,
            .media-app.player-collapsing .media-player-bar {
                opacity: 1 !important;
                pointer-events: auto !important;
                filter: blur(0) saturate(1) !important;
                transform: translateX(-50%) !important;
                z-index: 120 !important;
            }
            .media-app.player-collapsing .media-expanded {
                pointer-events: none !important;
                z-index: 10 !important;
            }
            .media-app.player-collapsing:has(.media-expanded.active) .media-expanded {
                opacity: 0.92 !important;
            }
            .media-app.player-collapsing .media-expanded:not(.active) {
                opacity: 0 !important;
                transition:
                    opacity 300ms cubic-bezier(0.5, 0, 0.2, 1),
                    transform 660ms cubic-bezier(0.16, 1, 0.3, 1),
                    border-radius 660ms cubic-bezier(0.16, 1, 0.3, 1),
                    clip-path 660ms cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            @container (max-width: 760px) {
                .media-app,
                body.fluent-v2 .media-app {
                    --media-sidebar-width: 68px;
                }
                .media-sidebar {
                    width: 68px !important;
                    min-width: 68px !important;
                    margin: 8px 0 8px 8px !important;
                    padding: 10px 6px !important;
                    border-radius: 12px !important;
                }
                .media-search,
                .media-actions {
                    opacity: 0 !important;
                    max-height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                    pointer-events: none !important;
                    transform: translateX(-8px) scale(0.96) !important;
                }
                .media-nav-item {
                    display: flex !important;
                    width: 46px !important;
                    min-width: 46px !important;
                    height: 46px !important;
                    min-height: 46px !important;
                    justify-content: center !important;
                    padding: 0 !important;
                    gap: 0 !important;
                    color: transparent !important;
                    overflow: hidden !important;
                }
                .media-nav-icon,
                .media-nav-item span.media-nav-icon {
                    width: 18px !important;
                    min-width: 18px !important;
                    height: 18px !important;
                    display: grid !important;
                    place-items: center !important;
                    color: var(--media-native-text, var(--text-primary)) !important;
                    opacity: 1 !important;
                    transform: none !important;
                }
                .media-nav-item .media-nav-label,
                .media-nav-item span.media-nav-label {
                    width: 0 !important;
                    min-width: 0 !important;
                    max-width: 0 !important;
                    height: auto !important;
                    opacity: 0 !important;
                    overflow: hidden !important;
                    transform: translateX(-8px) scale(0.96) !important;
                    pointer-events: none !important;
                }
                .media-nav-item .media-symbol {
                    width: 18px !important;
                    height: 18px !important;
                    display: block !important;
                    opacity: 1 !important;
                    filter: none !important;
                }
                body.dark-mode .media-nav-item .media-symbol {
                    filter: brightness(0) invert(1) !important;
                }
                .media-sidebar-bottom {
                    margin-top: auto !important;
                    justify-items: center !important;
                }
                .media-main-scroll .fluent-scroll-viewport {
                    padding: 18px 16px 88px !important;
                }
                .media-home-head {
                    flex-direction: column !important;
                    gap: 12px !important;
                }
                .media-home-head h1 {
                    font-size: 30px !important;
                    letter-spacing: 0 !important;
                }
                .media-filter-group {
                    width: 100% !important;
                    overflow-x: auto !important;
                    padding-bottom: 2px !important;
                }
                .media-feature-row {
                    grid-auto-columns: minmax(172px, 72%) !important;
                }
                .media-home-card.is-featured {
                    min-height: 164px !important;
                }
                .media-frequency-row {
                    grid-template-columns: 1fr !important;
                }
                .media-player-bar {
                    left: 50% !important;
                    width: calc(100% - 24px) !important;
                    bottom: 12px !important;
                    grid-template-columns: minmax(0, 1fr) auto !important;
                    padding: 8px 10px !important;
                }
                .media-options {
                    display: none !important;
                }
                .media-controls {
                    min-width: 132px !important;
                }
            }
            @container (max-width: 680px) {
                .media-expanded {
                    grid-template-columns: minmax(0, 1fr) !important;
                    grid-template-rows: auto auto auto auto auto !important;
                    align-content: center !important;
                    gap: 10px !important;
                    padding: 16px !important;
                    overflow: auto !important;
                    text-align: center !important;
                }
                .media-collapse-btn {
                    top: 12px !important;
                    left: 12px !important;
                    width: 42px !important;
                    height: 42px !important;
                }
                .media-expanded-art {
                    width: min(58cqw, 32cqh, 240px) !important;
                    min-width: 112px !important;
                    justify-self: center !important;
                    grid-row: 2 !important;
                    grid-column: 1 !important;
                }
                .media-expanded-info {
                    grid-template-columns: 1fr !important;
                    justify-items: center !important;
                    gap: 10px !important;
                }
                .media-expanded-info h2 {
                    font-size: clamp(20px, 7cqw, 30px) !important;
                    line-height: 1.08 !important;
                }
                .media-expanded-info p {
                    font-size: 14px !important;
                    margin-top: 4px !important;
                }
                .media-expanded-meta {
                    justify-content: center !important;
                }
                .media-expanded-controls {
                    gap: 8px !important;
                }
                .media-expanded-controls button {
                    width: 38px !important;
                    min-width: 38px !important;
                    height: 38px !important;
                }
                .media-expanded-play {
                    width: 54px !important;
                    min-width: 54px !important;
                    height: 54px !important;
                }
                .media-expanded-aux {
                    grid-template-columns: 1fr !important;
                    gap: 10px !important;
                }
            }
            @container (max-height: 520px) {
                .media-expanded {
                    grid-template-columns: minmax(112px, 30cqw) minmax(0, 1fr) !important;
                    grid-template-rows: auto auto auto auto !important;
                    align-content: center !important;
                    column-gap: 18px !important;
                    row-gap: 10px !important;
                    padding: 16px 18px !important;
                }
                .media-expanded-art {
                    grid-row: 1 / 5 !important;
                    grid-column: 1 !important;
                    width: min(28cqw, 48cqh, 210px) !important;
                    min-width: 108px !important;
                }
                .media-expanded-info {
                    grid-row: 1 !important;
                    grid-column: 2 !important;
                }
                .media-expanded-progress-row {
                    grid-row: 2 !important;
                    grid-column: 2 !important;
                }
                .media-expanded-controls {
                    grid-row: 3 !important;
                    grid-column: 2 !important;
                }
                .media-expanded-aux {
                    grid-row: 4 !important;
                    grid-column: 2 !important;
                }
                .media-expanded-info h2 {
                    font-size: clamp(20px, 7cqh, 30px) !important;
                    line-height: 1.06 !important;
                }
                .media-expanded-info p {
                    font-size: 14px !important;
                    margin-top: 4px !important;
                }
                .media-expanded-meta button,
                .media-expanded-controls button {
                    width: 38px !important;
                    min-width: 38px !important;
                    height: 38px !important;
                }
                .media-expanded-play {
                    width: 54px !important;
                    min-width: 54px !important;
                    height: 54px !important;
                }
            }
            @container (max-height: 410px) {
                .media-expanded {
                    row-gap: 8px !important;
                }
                .media-expanded-meta,
                .media-expanded-aux {
                    display: none !important;
                }
                .media-expanded-art {
                    width: min(26cqw, 42cqh, 160px) !important;
                }
                .media-expanded-controls button {
                    width: 34px !important;
                    min-width: 34px !important;
                    height: 34px !important;
                }
                .media-expanded-play {
                    width: 48px !important;
                    min-width: 48px !important;
                    height: 48px !important;
                }
            }
            .media-nav-icon {
                flex: 0 0 auto !important;
                display: grid !important;
                place-items: center !important;
                width: 18px !important;
                height: 18px !important;
            }
            .media-nav-label {
                flex: 1 1 auto !important;
                width: auto !important;
                max-width: 156px !important;
                min-width: 0 !important;
                opacity: 1 !important;
                overflow: hidden !important;
                white-space: nowrap !important;
                text-overflow: ellipsis !important;
                transition:
                    opacity 240ms cubic-bezier(0.16, 1, 0.3, 1),
                    max-width 420ms cubic-bezier(0.16, 1, 0.3, 1),
                    transform 420ms cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            body:not(.fluent-v2) .media-sidebar {
                background: rgba(244, 246, 250, 0.72) !important;
                border-right: 1px solid rgba(0, 0, 0, 0.08) !important;
                box-shadow: none !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }
            body:not(.fluent-v2).dark-mode .media-sidebar {
                background: rgba(36, 38, 42, 0.78) !important;
                border-right-color: rgba(255, 255, 255, 0.08) !important;
            }
            @container (max-width: 900px) {
                .media-app,
                body.fluent-v2 .media-app,
                body:not(.fluent-v2) .media-app {
                    --media-sidebar-width: 68px !important;
                    grid-template-columns: var(--media-sidebar-width) minmax(0, 1fr) !important;
                }
                .media-sidebar,
                body.fluent-v2 .media-sidebar,
                body:not(.fluent-v2) .media-sidebar {
                    width: 68px !important;
                    min-width: 68px !important;
                    max-width: 68px !important;
                    margin: 8px 0 8px 8px !important;
                    padding: 10px 6px !important;
                    border-radius: 12px !important;
                    overflow: hidden !important;
                }
                body:not(.fluent-v2) .media-sidebar {
                    background: rgba(244, 246, 250, 0.72) !important;
                    border-right: 1px solid rgba(0, 0, 0, 0.08) !important;
                }
                body:not(.fluent-v2).dark-mode .media-sidebar {
                    background: rgba(36, 38, 42, 0.78) !important;
                    border-right-color: rgba(255, 255, 255, 0.08) !important;
                }
                .media-nav {
                    align-items: center !important;
                    gap: 6px !important;
                }
                .media-nav-item,
                .media-nav-item:not(.active),
                body.fluent-v2 .media-nav-item,
                body.fluent-v2 .media-nav-item:not(.active),
                body:not(.fluent-v2) .media-nav-item,
                body:not(.fluent-v2) .media-nav-item:not(.active) {
                    display: flex !important;
                    width: 46px !important;
                    min-width: 46px !important;
                    max-width: 46px !important;
                    height: 46px !important;
                    min-height: 46px !important;
                    margin: 0 auto !important;
                    padding: 0 !important;
                    justify-content: center !important;
                    align-items: center !important;
                    gap: 0 !important;
                    overflow: hidden !important;
                    font-size: 0 !important;
                    line-height: 1 !important;
                    color: transparent !important;
                }
                .media-nav-item.active {
                    color: transparent !important;
                }
                .media-nav-icon,
                .media-nav-item span.media-nav-icon {
                    display: grid !important;
                    place-items: center !important;
                    width: 18px !important;
                    min-width: 18px !important;
                    height: 18px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    opacity: 1 !important;
                    transform: none !important;
                    color: var(--media-native-text, var(--text-primary, #202020)) !important;
                }
                .media-nav-item .media-nav-label,
                .media-nav-item span.media-nav-label {
                    width: 0 !important;
                    min-width: 0 !important;
                    max-width: 0 !important;
                    height: auto !important;
                    opacity: 0 !important;
                    overflow: hidden !important;
                    transform: translateX(-8px) scale(0.96) !important;
                    pointer-events: none !important;
                }
                .media-nav-item .media-symbol,
                .media-nav-icon .media-symbol {
                    display: block !important;
                    width: 18px !important;
                    height: 18px !important;
                    min-width: 18px !important;
                    opacity: 1 !important;
                    margin: 0 !important;
                    filter: none !important;
                }
                body.dark-mode .media-nav-item .media-symbol,
                body.dark-mode .media-nav-icon .media-symbol {
                    filter: brightness(0) invert(1) !important;
                }
                .media-search,
                .media-actions {
                    display: grid !important;
                    opacity: 0 !important;
                    max-height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                    pointer-events: none !important;
                    transform: translateX(-8px) scale(0.96) !important;
                }
                .media-sidebar-bottom {
                    display: grid !important;
                    margin-top: auto !important;
                    justify-items: center !important;
                }
                .media-sidebar-bottom .media-nav-item {
                    display: flex !important;
                }
                .media-player-bar,
                body.fluent-v2 .media-player-bar,
                body:not(.fluent-v2) .media-player-bar {
                    left: calc(68px + ((100% - 68px) / 2)) !important;
                    width: min(760px, calc(100% - 68px - 36px)) !important;
                    transform: translateX(-50%) !important;
                }
            }
            @keyframes mediaThemeDrift {
                0% {
                    transform: translate3d(-5%, -3%, 0) scale(1.08) rotate(0deg);
                    background-position: 0% 42%;
                }
                35% {
                    transform: translate3d(4%, -6%, 0) scale(1.12) rotate(4deg);
                    background-position: 42% 18%;
                }
                70% {
                    transform: translate3d(6%, 5%, 0) scale(1.1) rotate(-3deg);
                    background-position: 78% 70%;
                }
                100% {
                    transform: translate3d(-3%, 7%, 0) scale(1.14) rotate(2deg);
                    background-position: 100% 48%;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

if (typeof window !== 'undefined') {
    window.MediaApp = MediaApp;
}
