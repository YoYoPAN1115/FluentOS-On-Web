/**
 * 登录屏幕模块
 */
const LoginScreen = {
    element: null,
    cardElement: null,
    pinInput: null,
    pinToggle: null,
    submitBtn: null,
    errorElement: null,
    securityLink: null,
    wallpaperElement: null,
    attempts: 0,

    init() {
        this.element = document.getElementById('login-screen');
        this.cardElement = this.element.querySelector('.login-card');
        this.pinInput = document.getElementById('login-pin');
        this.pinToggle = document.getElementById('pin-toggle');
        this.submitBtn = document.getElementById('login-submit');
        this.errorElement = document.getElementById('login-error');
        this.securityLink = document.getElementById('security-link');
        this.wallpaperElement = this.element.querySelector('.login-wallpaper');

        // 绑定事件
        this.submitBtn.addEventListener('click', () => this.handleLogin());
        this.pinInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });
        
        this.pinToggle.addEventListener('click', () => this.togglePinVisibility());
        
        // 点击模糊区域（非密码卡片）退回锁屏
        this.element.addEventListener('click', (e) => {
            // 如果点击的不是密码卡片内部，则返回锁屏
            if (State.view === 'login' && !this.cardElement.contains(e.target)) {
                this.backToLock();
            }
        });
    },
    
    backToLock() {
        // 触发返回锁屏的动画
        if (window.handleLoginToLock) {
            window.handleLoginToLock();
        }
    },

    show() {
        this.element.classList.remove('hidden');
        this.element.classList.add('show');
        this.cardElement.classList.add('show');
        this.updateWallpaper();
        this.pinInput.value = '';
        this.pinInput.focus();
        this.errorElement.classList.add('hidden');
        this.securityLink.classList.add('hidden');
        this.attempts = State.session.loginAttempts || 0;
    },

    hide() {
        this.element.classList.add('hidden');
        this.element.classList.remove('show');
        this.cardElement.classList.remove('show');
    },

    updateWallpaper() {
        // 登录界面不设置自己的壁纸，而是同步更新锁屏壁纸
        // 因为登录界面的 .login-wallpaper 是透明的，让锁屏的模糊壁纸透过来
        // 确保 .login-wallpaper 始终保持 background-image: none
        this.wallpaperElement.style.backgroundImage = 'none';
        // 同步更新锁屏壁纸（锁屏壁纸是登录界面的实际背景）
        if (typeof LockScreen !== 'undefined' && LockScreen.updateWallpaper) {
            LockScreen.updateWallpaper();
        }
    },

    togglePinVisibility() {
        const isPassword = this.pinInput.type === 'password';
        this.pinInput.type = isPassword ? 'text' : 'password';
        
        // 切换图标
        const strokeIcon = this.pinToggle.querySelector('.icon-stroke');
        const fillIcon = this.pinToggle.querySelector('.icon-fill');
        if (isPassword) {
            strokeIcon.classList.add('hidden');
            fillIcon.classList.remove('hidden');
        } else {
            strokeIcon.classList.remove('hidden');
            fillIcon.classList.add('hidden');
        }
    },

    handleLogin() {
        const pin = this.pinInput.value;
        const correctPin = State.settings.pin || '1234';

        if (pin === correctPin) {
            // 登录成功
            this.attempts = 0;
            State.updateSession({ 
                isLoggedIn: true, 
                lastLogin: new Date().toISOString(),
                loginAttempts: 0
            });
            State.setView('desktop');
            
            // 发送欢迎通知
            State.addNotification({
                title: '登录成功',
                message: '欢迎回来，Owner！',
                type: 'success'
            });
        } else {
            // 登录失败
            this.attempts++;
            State.updateSession({ loginAttempts: this.attempts });
            
            this.pinInput.classList.add('error');
            this.errorElement.classList.remove('hidden');
            
            // 显示抖动动画
            setTimeout(() => {
                this.pinInput.classList.remove('error');
            }, 400);

            // 3次失败后显示安全问题链接
            if (this.attempts >= 3) {
                this.securityLink.classList.remove('hidden');
            }

            this.pinInput.value = '';
            this.pinInput.focus();
        }
    }
};

