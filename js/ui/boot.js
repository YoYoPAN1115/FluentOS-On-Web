/**
 * 开机屏幕模块
 */
const BootScreen = {
    element: null,
    duration: 2500, // 开机动画持续时间

    init() {
        this.element = document.getElementById('boot-screen');
    },

    show() {
        this.element.classList.remove('hidden');
        
        // 播放开机动画，然后进入锁屏
        setTimeout(() => {
            this.hide();
            State.setView('lock');
        }, this.duration);
    },

    hide() {
        this.element.classList.add('hidden');
    }
};

