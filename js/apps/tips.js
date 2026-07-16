/**
 * Tips - minimal FluentWindow guidance experience.
 */
const TipsApp = {
    windowId: null,
    container: null,
    frame: null,
    activeSection: 'getting-started',
    activeStep: 0,
    activeFeature: 0,
    _unsubscribeLanguage: null,

    copy: {
        zh: {
            gettingStarted: '入门',
            newFeatures: '新增功能',
            openSettings: '跳转到设置',
            previous: '上一个',
            next: '下一个',
            features: [
                { id: 'widgets', title: '全新小组件', body: '把天气、时钟、日历、照片、快记、多媒体等常用信息放到桌面上。全新的组件抽屉让添加、整理和编辑都更加直观，重要信息始终一眼可见。', image: 'Theme/Preload/Tips/new_features/widgets.png' },
                { id: 'time-icons', title: '全新图标《Time时序》', body: '全新设计，日复一日，周而复始，久而不腻。原创作者Isongren，现已上架HyperOS、ColorOS、OriginOS主题商店，可供下载。', note: '本图标使用已经过原作者同意，商业使用请与原作者Isongren取得联系，否则将构成侵权行为。', image: 'Theme/Preload/Tips/new_features/new_icons.png' },
                { id: 'design', title: '统一而焕新的外观', body: '引入 Fluent Windows 统一原生 App 开发框架，致力于让每一个原生 App 获得极为统一的视觉体验。全新的侧边栏设计语言，减少了对主体内容的视觉占用。', image: 'Theme/Preload/Tips/new_features/design.png' },
                { id: 'app-shop', title: '全新 App Shop', body: 'App Shop 经过彻底重新设计，并上架了 60+ 高频常用 PWA App。更清晰的精选、搜索和分类页面，让发现与安装应用变得轻松直接。', image: 'Theme/Preload/Tips/new_features/app_shop.png' },
                { id: 'productivity', title: '更强大的生产力', body: '重磅支持全新 Office，可快速在线编辑 Word、PPT、Excel，并提供精美免费模板。极客坊、Techie Delight、视频编辑器、Photopea 等进阶免费 PWA App 也可下载使用。', image: 'Theme/Preload/Tips/new_features/productivity.png' },
                { id: 'weather', title: '天气，尽在掌握', body: '全新的天气 App 支持搜索和固定城市，并集中展示当前体感、风速、湿度、逐小时天气与未来七天预报。', image: 'Theme/Preload/Tips/new_features/weather.png' },
                { id: 'quick-note', title: '想到什么，随手快记', body: '快记为转瞬即逝的灵感准备了一块干净的空间。内容会自动保存，也可以作为桌面组件常驻，随时写下、随时回来。', image: 'Theme/Preload/Tips/new_features/quick_note.png' },
                { id: 'notes', title: '认真记录，也很轻松', body: '全新的文档编辑体验提供丰富的排版工具，支持 TXT 与 Markdown，并会自动保存你的更改。从一行备忘到完整文章，都能专注完成。', image: 'Theme/Preload/Tips/new_features/notes_example.png' },
                { id: 'camera', title: '全新相机', body: '用简洁直观的取景界面拍摄照片或视频，网格、镜像等常用控制触手可及，拍摄结果还可以在“已存储”中快速查看。', image: 'Theme/Preload/Tips/new_features/camera.png' },
                { id: 'photos', title: '照片焕然一新', body: '统一浏览本机照片与 Bing 壁纸，按时间整理图片、搜索内容并收藏喜欢的瞬间。导入进度也会通过通知及时呈现。', image: 'Theme/Preload/Tips/new_features/photo.png' },
                { id: 'music', title: '你的多媒体中心', body: '全新的多媒体 App 汇集媒体资料库、最近播放、正在播放和播放列表。推荐内容与常听曲目整齐呈现，底部播放条让控制始终顺手。', image: 'Theme/Preload/Tips/new_features/music.png' },
                { id: 'now-playing', title: '沉浸于正在播放', body: '专辑封面与主题色共同铺满播放空间，进度、音量和播放控制清晰集中，让每一次聆听都更沉浸。', image: 'Theme/Preload/Tips/new_features/playing_music.png' }
            ],
            tutorials: [
                { id: 'wallpaper', title: '更换壁纸', body: '在“设置 > 个性化”中选择一张壁纸，让桌面第一眼就像你。', image: 'Theme/Preload/Tips/wallpaper.png', settingsPage: 'personalization' },
                { id: 'theme', title: '切换深浅颜色', body: '选择浅色或深色模式，Fluent 的窗口、菜单和文字会一起变化。', image: 'Theme/Preload/Tips/theme.png', settingsPage: 'personalization' },
                { id: 'accent', title: '个性化主题色', body: '挑选你喜欢的颜色，它会出现在按钮、高亮和焦点中。', image: 'Theme/Preload/Tips/accent.png', settingsPage: 'personalization' },
                { id: 'profile', title: '更改用户信息', body: '在用户设置中更换头像，并修改你的用户名和邮箱。', image: 'Theme/Preload/Tips/profile.png', settingsPage: 'user' },
                { id: 'password', title: '修改密码', body: '更新用于锁屏登录的 PIN，保护你的 Fluent 会话。', image: 'Theme/Preload/Tips/password.png', settingsPage: 'privacy' },
                { id: 'snap', title: '快速分屏', body: '将指针悬停在最大化按钮上，选择布局，快速排列多个窗口。', image: 'Theme/Preload/Tips/snap.png', settingsPage: 'multitask' }
            ]
        },
        en: {
            gettingStarted: 'Get started',
            newFeatures: "What's new",
            openSettings: 'Go to Settings',
            previous: 'Previous',
            next: 'Next',
            features: [
                { id: 'widgets', title: 'All-new widgets', body: 'Keep weather, clocks, calendars, photos, quick notes, media, and more right on your desktop. The redesigned widget drawer makes adding, arranging, and editing them beautifully straightforward.', image: 'Theme/Preload/Tips/new_features/widgets.png' },
                { id: 'time-icons', title: 'The new "Time" icon set', body: 'A fresh design made to feel timeless, day after day. Created by Isongren, the Time icon set is now available to download from the HyperOS, ColorOS, and OriginOS theme stores.', note: 'Use of this icon set has been authorized by its original creator. For commercial use, contact Isongren first; unauthorized commercial use constitutes infringement.', image: 'Theme/Preload/Tips/new_features/new_icons.png' },
                { id: 'design', title: 'A beautifully unified look', body: 'The Fluent Windows framework now gives every native app an exceptionally consistent visual experience. A new sidebar language also leaves more room for the content that matters.', image: 'Theme/Preload/Tips/new_features/design.png' },
                { id: 'app-shop', title: 'The new App Shop', body: 'App Shop has been rebuilt from the ground up and now offers more than 60 popular PWA apps. Redesigned collections, search, and categories make discovery and installation effortless.', image: 'Theme/Preload/Tips/new_features/app_shop.png' },
                { id: 'productivity', title: 'A major productivity upgrade', body: 'The new Office lets you quickly edit Word documents, presentations, and spreadsheets online with polished free templates. Advanced free PWAs including Geek Workshop, Techie Delight, Video Editor, and Photopea are ready to install too.', image: 'Theme/Preload/Tips/new_features/productivity.png' },
                { id: 'weather', title: 'Weather at a glance', body: 'Search and pin cities, then see current conditions, feels-like temperature, wind, humidity, hourly details, and the seven-day forecast in one focused view.', image: 'Theme/Preload/Tips/new_features/weather.png' },
                { id: 'quick-note', title: 'Capture ideas instantly', body: 'Quick Note gives passing ideas a clean place to land. Everything saves automatically and can stay close at hand as a desktop widget.', image: 'Theme/Preload/Tips/new_features/quick_note.png' },
                { id: 'notes', title: 'A richer way to write', body: 'The new editor combines focused writing with rich formatting, TXT and Markdown support, and automatic saving—ready for anything from a short reminder to a complete article.', image: 'Theme/Preload/Tips/new_features/notes_example.png' },
                { id: 'camera', title: 'The new Camera', body: 'Capture photos and videos through a clean viewfinder with grid and mirror controls close at hand, then quickly revisit every shot in Saved.', image: 'Theme/Preload/Tips/new_features/camera.png' },
                { id: 'photos', title: 'Photos, refreshed', body: 'Browse local photos and Bing wallpapers together, find images, organize moments by date, and keep favorites close. Import progress appears in a helpful notification.', image: 'Theme/Preload/Tips/new_features/photo.png' },
                { id: 'music', title: 'Your media, together', body: 'The redesigned Media app brings your library, recent items, Now Playing, and playlists together. Recommendations are easy to browse and playback controls stay within reach.', image: 'Theme/Preload/Tips/new_features/music.png' },
                { id: 'now-playing', title: 'Made for the music', body: 'Album art and adaptive color fill the Now Playing view, while focused progress, volume, and transport controls make every listening session more immersive.', image: 'Theme/Preload/Tips/new_features/playing_music.png' }
            ],
            tutorials: [
                { id: 'wallpaper', title: 'Change your wallpaper', body: 'Choose a wallpaper in Settings > Personalization and make the desktop feel like yours.', image: 'Theme/Preload/Tips/wallpaper.png', settingsPage: 'personalization' },
                { id: 'theme', title: 'Switch light and dark', body: 'Choose Light or Dark and Fluent windows, menus, and text will change together.', image: 'Theme/Preload/Tips/theme.png', settingsPage: 'personalization' },
                { id: 'accent', title: 'Choose an accent color', body: 'Pick a color you like and see it across buttons, highlights, and focus indicators.', image: 'Theme/Preload/Tips/accent.png', settingsPage: 'personalization' },
                { id: 'profile', title: 'Update your profile', body: 'Change your picture, user name, and email from User settings.', image: 'Theme/Preload/Tips/profile.png', settingsPage: 'user' },
                { id: 'password', title: 'Change your password', body: 'Update the PIN used on the lock screen to protect your Fluent session.', image: 'Theme/Preload/Tips/password.png', settingsPage: 'privacy' },
                { id: 'snap', title: 'Snap windows quickly', body: 'Hover over Maximize, choose a layout, and arrange several windows in seconds.', image: 'Theme/Preload/Tips/snap.png', settingsPage: 'multitask' }
            ]
        }
    },

    text() {
        return this.copy[I18n?.currentLang === 'en' ? 'en' : 'zh'];
    },

    getGettingStartedImageSources() {
        return [...new Set(Object.values(this.copy)
            .flatMap((locale) => Array.isArray(locale?.tutorials) ? locale.tutorials : [])
            .map((item) => item?.image)
            .filter(Boolean))];
    },

    init(windowId) {
        this.windowId = windowId;
        this.container = document.getElementById(`${windowId}-content`);
        this.activeSection = 'getting-started';
        this.activeStep = 0;
        this.activeFeature = 0;
        this.mount();
        this._unsubscribeLanguage?.();
        this._unsubscribeLanguage = State.on('languageChange', () => {
            if (this.container?.isConnected) this.mount();
        }, { key: 'TipsApp.languageChange' });
    },

    mount() {
        if (!this.container || typeof FluentWindow === 'undefined') return;
        if (this.frame) this.frame.destroy();
        const c = this.text();
        this.container.classList.add('tips-window-content');
        this.frame = FluentWindow.mount({
            container: this.container,
            items: [
                { id: 'getting-started', label: c.gettingStarted, icon: 'Book Text' },
                { id: 'new-features', label: c.newFeatures, icon: 'Stars A' }
            ],
            activeId: this.activeSection,
            preserveScrollPositions: false,
            onNavigate: (id, pageEl) => {
                this.activeSection = id;
                pageEl.className = 'fw-page tips-page';
                if (id === 'new-features') {
                    this.renderFeature(pageEl);
                    return;
                }
                this.renderLesson(pageEl);
            }
        });
    },

    renderLesson(pageEl) {
        const c = this.text();
        const item = c.tutorials[this.activeStep];
        pageEl.innerHTML = `
            <section class="tips-stage" data-step="${item.id}">
                <div class="tips-shot"><img src="${item.image}" alt=""></div>
                <article class="tips-message">
                    <h1>${item.title}</h1>
                    <p>${item.body}</p>
                    <button class="tips-settings-button" type="button">${c.openSettings}</button>
                </article>
                <div class="tips-arrows">
                    <button type="button" data-move="-1" aria-label="Previous" ${this.activeStep === 0 ? 'disabled' : ''}><img src="Theme/Icon/Symbol_icon/stroke/Arrow Left.svg" alt=""></button>
                    <button type="button" data-move="1" aria-label="Next" ${this.activeStep === c.tutorials.length - 1 ? 'disabled' : ''}><img src="Theme/Icon/Symbol_icon/stroke/Arrow Right.svg" alt=""></button>
                </div>
            </section>`;
        pageEl.querySelector('.tips-settings-button')?.addEventListener('click', () => {
            WindowManager.openApp('settings', { page: item.settingsPage });
        });
        pageEl.querySelectorAll('[data-move]').forEach(button => button.addEventListener('click', () => {
            this.activeStep = Math.max(0, Math.min(c.tutorials.length - 1, this.activeStep + Number(button.dataset.move)));
            this.renderLesson(pageEl);
        }));
    },

    renderFeature(pageEl) {
        const c = this.text();
        const item = c.features[this.activeFeature];
        const note = item.note ? `<small class="tips-feature-note"><em>${item.note}</em></small>` : '';
        pageEl.innerHTML = `
            <section class="tips-stage tips-stage--feature" data-feature="${item.id}">
                <div class="tips-shot tips-feature-shot"><img src="${item.image}" alt="${item.title}"></div>
                <article class="tips-message tips-feature-message">
                    <h1>${item.title}</h1>
                    <p>${item.body}</p>
                    ${note}
                </article>
                <div class="tips-arrows">
                    <button type="button" data-feature-move="-1" aria-label="${c.previous}" title="${c.previous}" ${this.activeFeature === 0 ? 'disabled' : ''}><img src="Theme/Icon/Symbol_icon/stroke/Arrow Left.svg" alt=""></button>
                    <button type="button" data-feature-move="1" aria-label="${c.next}" title="${c.next}" ${this.activeFeature === c.features.length - 1 ? 'disabled' : ''}><img src="Theme/Icon/Symbol_icon/stroke/Arrow Right.svg" alt=""></button>
                </div>
            </section>`;
        pageEl.querySelectorAll('[data-feature-move]').forEach(button => button.addEventListener('click', () => {
            this.activeFeature = Math.max(0, Math.min(c.features.length - 1, this.activeFeature + Number(button.dataset.featureMove)));
            this.renderFeature(pageEl);
        }));
    },

    openData(data) {
        if (data?.section === 'new-features') this.activeSection = 'new-features';
        if (Number.isInteger(data?.step)) this.activeStep = Math.max(0, Math.min(5, data.step));
        if (Number.isInteger(data?.feature)) this.activeFeature = Math.max(0, Math.min(this.text().features.length - 1, data.feature));
        if (this.container?.isConnected) this.mount();
    },

    beforeClose() {
        this._unsubscribeLanguage?.();
        this._unsubscribeLanguage = null;
        if (this.frame) this.frame.destroy();
        this.frame = null;
        this.container?.classList.remove('tips-window-content');
        this.container = null;
        this.windowId = null;
        return true;
    }
};

if (typeof window !== 'undefined') window.TipsApp = TipsApp;
