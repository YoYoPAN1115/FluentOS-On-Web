/**
 * 开机屏幕模块
 */
const BootScreen = {
    element: null,
    CACHE_KEY: 'fluentos.assets_cached',
    FAST_DURATION: 4000,
    FIRST_DURATION: 15000,

    // 需要预加载的关键资源
    criticalAssets: [
        // 壁纸
        'Theme/Picture/Fluent-1.png',
        'Theme/Picture/Fluent-2.png',
        'Theme/Picture/Fluent-3.jpg',
        'Theme/Picture/Fluent-4.jpg',
        'Theme/Picture/Fluent-5.png',
        'Theme/Picture/Fluent-6.jpg',
        'Theme/Picture/Fluent-7.png',
        'Theme/Picture/Fluent-8.png',
        // Logo & 头像
        'Theme/Icon/Fluent_logo.png',
        'Theme/Icon/Fluent_logo_dark.png',
        'Theme/Icon/UserAva.png',
        // 应用图标
        'Theme/Icon/App_icon/files.png',
        'Theme/Icon/App_icon/settings.png',
        'Theme/Icon/App_icon/calculator.png',
        'Theme/Icon/App_icon/notes.png',
        'Theme/Icon/App_icon/browser.png',
        'Theme/Icon/App_icon/system_clock.png',
        'Theme/Icon/App_icon/weather.png',
        'Theme/Icon/App_icon/app_gallery.png',
        'Theme/Icon/App_icon/gallery.png',
        // 常用符号图标
        'Theme/Icon/Symbol_icon/stroke/Search.svg',
        'Theme/Icon/Symbol_icon/stroke/Settings.svg',
        'Theme/Icon/Symbol_icon/stroke/Home.svg',
        'Theme/Icon/Symbol_icon/stroke/Shut Down.svg',
        'Theme/Icon/Symbol_icon/stroke/Lock.svg',
        'Theme/Icon/Symbol_icon/stroke/Logout.svg',
        'Theme/Icon/Symbol_icon/stroke/Moon.svg',
        'Theme/Icon/Symbol_icon/stroke/Sun.svg',
        'Theme/Icon/Symbol_icon/stroke/Volume Up.svg',
        'Theme/Icon/Symbol_icon/stroke/Notification Bell.svg',
        'Theme/Icon/Symbol_icon/stroke/Bluetooth_close.svg',
        'Theme/Icon/Symbol_icon/stroke/Bluetooth_open.svg',
        'Theme/Icon/Symbol_icon/stroke/Broadcast.svg',
        'Theme/Icon/Symbol_icon/stroke/Arrow Right.svg',
        'Theme/Icon/Symbol_icon/stroke/Refresh.svg',
        'Theme/Icon/Symbol_icon/fill/Moon.svg',
        'Theme/Icon/Symbol_icon/fill/Settings.svg',
        'Theme/Icon/Symbol_icon/fill/Shut Down.svg',
        'Theme/Icon/Symbol_icon/fill/Broadcast.svg',
        'Theme/Icon/Symbol_icon/fill/Stars A.svg',
        'Theme/Icon/Symbol_icon/colour/Folder.svg',
    ],

    init() {
        this.element = document.getElementById('boot-screen');
    },

    isFirstBoot() {
        return !localStorage.getItem(this.CACHE_KEY);
    },

    show() {
        // 根据深色/浅色模式切换 logo
        const logo = this.element.querySelector('.boot-logo');
        if (logo) {
            logo.src = document.body.classList.contains('dark-mode')
                ? 'Theme/Icon/Fluent_logo_dark.png'
                : 'Theme/Icon/Fluent_logo.png';
        }
        this.element.classList.remove('hidden');
        this.element.style.opacity = '1';
        this.element.style.transition = '';

        if (this.isFirstBoot()) {
            this._firstBoot();
        } else {
            setTimeout(() => this.fadeToLock(), this.FAST_DURATION);
        }
    },

    _firstBoot() {
        // 预加载所有关键资源，最长等 FIRST_DURATION
        let loaded = 0;
        const total = this.criticalAssets.length;
        const start = Date.now();

        const onDone = () => {
            localStorage.setItem(this.CACHE_KEY, Date.now().toString());
            const elapsed = Date.now() - start;
            const remaining = Math.max(0, this.FIRST_DURATION - elapsed);
            setTimeout(() => this.fadeToLock(), remaining);
        };

        const check = () => {
            loaded++;
            if (loaded >= total) onDone();
        };

        this.criticalAssets.forEach(src => {
            if (src.endsWith('.svg')) {
                fetch(src).then(() => check()).catch(() => check());
            } else {
                const img = new Image();
                img.onload = check;
                img.onerror = check;
                img.src = src;
            }
        });

        // 安全兜底：即使加载未完成也在 FIRST_DURATION 后继续
        setTimeout(() => {
            if (loaded < total) onDone();
        }, this.FIRST_DURATION);
    },

    fadeToLock() {
        LockScreen.show();
        const lockEl = document.getElementById('lock-screen');
        lockEl.style.opacity = '0';
        lockEl.classList.remove('hidden');

        this.element.style.transition = 'opacity 0.8s ease';
        this.element.style.opacity = '0';
        lockEl.style.transition = 'opacity 0.8s ease';
        lockEl.style.opacity = '1';

        setTimeout(() => {
            this.element.classList.add('hidden');
            this.element.style.transition = '';
            this.element.style.opacity = '';
            lockEl.style.transition = '';
            lockEl.style.opacity = '';
            State.view = 'lock';
        }, 800);
    },

    hide() {
        this.element.classList.add('hidden');
    }
};

