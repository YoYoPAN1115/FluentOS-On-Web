/**
 * 锁屏模块
 */
const LockScreen = {
    element: null,
    timeElement: null,
    dateElement: null,
    wallpaperElement: null,
    timeInterval: null,

    init() {
        this.element = document.getElementById('lock-screen');
        this.timeElement = document.getElementById('lock-time');
        this.dateElement = document.getElementById('lock-date');
        this.wallpaperElement = this.element.querySelector('.lock-wallpaper');

        // 绑定事件
        this.element.addEventListener('click', () => this.unlock());
        document.addEventListener('keydown', (e) => {
            if (State.view === 'lock') {
                this.unlock();
            }
        });
    },

    show() {
        this.element.classList.remove('hidden');
        this.element.classList.add('show');
        this.updateTime();
        this.updateWallpaper();
        
        // 启动时间更新
        this.timeInterval = setInterval(() => this.updateTime(), 1000);
    },

    hide() {
        this.element.classList.add('hidden');
        this.element.classList.remove('show');
        
        // 停止时间更新
        if (this.timeInterval) {
            clearInterval(this.timeInterval);
            this.timeInterval = null;
        }
    },

    updateTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        this.timeElement.textContent = `${hours}:${minutes}`;
        this.dateElement.textContent = `${year}/${month}/${day}`;
    },

    updateWallpaper() {
        const wallpaper = State.settings.wallpaperLock;
        this.wallpaperElement.style.backgroundImage = `url('${wallpaper}')`;
    },

    unlock() {
        State.setView('login');
    }
};

