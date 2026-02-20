/**
 * 控制中心模块
 */
const ControlCenter = {
    element: null,
    isOpen: false,

    init() {
        this.element = document.getElementById('control-center');
        this.bindEvents();
        this.updateTiles();
        this.updateLanguage();
        
        // 监听语言切换
        State.on('languageChange', () => {
            this.updateLanguage();
            this.updateTiles();
        });
        
        // 监听设置变更，实时同步
        State.on('settingsChange', (updates) => {
            if (updates.bluetoothEnabled !== undefined || 
                updates.enableBlur !== undefined || 
                updates.enableAnimation !== undefined ||
                updates.theme !== undefined) {
                this.updateTiles();
            }
        });
    },
    
    updateLanguage() {
        // 更新 Wi-Fi 标题
        const wifiTitle = document.getElementById('wifi-tile-title');
        if (wifiTitle) wifiTitle.textContent = t('control.wifi');
        
        // 更新蓝牙标题
        const bluetoothTitle = document.getElementById('bluetooth-tile-title');
        if (bluetoothTitle) bluetoothTitle.textContent = t('control.bluetooth');
        
        // 更新模糊标题
        const blurTitle = document.getElementById('blur-tile-title');
        if (blurTitle) blurTitle.textContent = t('control.blur');
        
        // 更新动画标题
        const animationTitle = document.getElementById('animation-tile-title');
        if (animationTitle) animationTitle.textContent = t('control.animation');
    },

    bindEvents() {
        // Wi-Fi 瓷贴
        const wifiTile = document.getElementById('wifi-tile');
        wifiTile.addEventListener('click', () => {
            const isActive = wifiTile.dataset.active === 'true';
            wifiTile.dataset.active = !isActive;
            
            const subtitle = wifiTile.querySelector('.tile-subtitle');
            subtitle.textContent = isActive ? t('control.wifi.disconnected') : t('control.wifi.connected');
            
            State.addNotification({
                title: t('control.wifi'),
                message: isActive ? t('notify.wifi.disconnected') : t('notify.wifi.connected'),
                type: 'info'
            });
        });

        // 蓝牙瓷贴
        const bluetoothTile = document.getElementById('bluetooth-tile');
        bluetoothTile.addEventListener('click', () => {
            const isActive = bluetoothTile.dataset.active === 'true';
            const newState = !isActive;
            bluetoothTile.dataset.active = newState;
            
            // 同步到设置状态
            State.updateSettings({ bluetoothEnabled: newState });
            
            // 更新图标（带动画）
            const iconOff = bluetoothTile.querySelector('.bluetooth-icon-off');
            const iconOn = bluetoothTile.querySelector('.bluetooth-icon-on');
            if (iconOff && iconOn) {
                iconOff.style.opacity = newState ? '0' : '1';
                iconOn.style.opacity = newState ? '1' : '0';
            }
            
            const subtitle = bluetoothTile.querySelector('.tile-subtitle');
            subtitle.textContent = newState ? t('control.bluetooth.on') : t('control.bluetooth.off');
            
            State.addNotification({
                title: t('control.bluetooth'),
                message: newState ? t('notify.bluetooth.on') : t('notify.bluetooth.off'),
                type: 'info'
            });
        });

        // 主题瓷贴
        const themeTile = document.getElementById('theme-tile');
        const themeTileTitle = document.getElementById('theme-tile-title');
        themeTile.addEventListener('click', () => {
            const currentTheme = State.settings.theme;
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            State.updateSettings({ theme: newTheme });
            themeTile.dataset.active = newTheme === 'dark' ? 'true' : 'false';
            
            // 更新按钮文字：显示当前模式
            themeTileTitle.textContent = newTheme === 'dark' ? t('control.theme') : t('control.theme.light');
            
            const modeName = newTheme === 'dark' ? t('control.theme') : t('control.theme.light');
            State.addNotification({
                title: t('settings.theme'),
                message: t('notify.theme.changed', { mode: modeName }),
                type: 'info'
            });
        });

        // 模糊瓷贴
        const blurTile = document.getElementById('blur-tile');
        blurTile.addEventListener('click', () => {
            const isActive = blurTile.dataset.active === 'true';
            State.updateSettings({ enableBlur: !isActive });
            blurTile.dataset.active = !isActive;
            
            State.addNotification({
                title: t('control.blur'),
                message: isActive ? t('notify.blur.off') : t('notify.blur.on'),
                type: 'info'
            });
        });

        // 动画瓷贴
        const animationTile = document.getElementById('animation-tile');
        animationTile.addEventListener('click', () => {
            const isActive = animationTile.dataset.active === 'true';
            State.updateSettings({ enableAnimation: !isActive });
            animationTile.dataset.active = !isActive;
            
            State.addNotification({
                title: t('control.animation'),
                message: isActive ? t('notify.animation.off') : t('notify.animation.on'),
                type: 'info'
            });
        });

        // 音量滑块
        const volumeSlider = document.getElementById('volume-slider');
        const volumeValue = document.getElementById('volume-value');
        volumeSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            volumeValue.textContent = value;
            State.updateSettings({ volume: parseInt(value) });
        });

        // 亮度滑块
        const brightnessSlider = document.getElementById('brightness-slider');
        const brightnessValue = document.getElementById('brightness-value');
        brightnessSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            brightnessValue.textContent = value;
            State.updateSettings({ brightness: parseInt(value) });
        });

        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target) && 
                !e.target.closest('#control-center-btn')) {
                this.close();
            }
        });
    },

    updateTiles() {
        // 更新瓷贴状态
        const themeTile = document.getElementById('theme-tile');
        const themeTileTitle = document.getElementById('theme-tile-title');
        themeTile.dataset.active = State.settings.theme === 'dark' ? 'true' : 'false';
        // 更新主题瓷贴文字：显示当前模式
        themeTileTitle.textContent = State.settings.theme === 'dark' ? t('control.theme') : t('control.theme.light');
        
        // 更新 Wi-Fi 和蓝牙的副标题
        const wifiSubtitle = document.getElementById('wifi-tile-subtitle');
        const wifiTile = document.getElementById('wifi-tile');
        if (wifiSubtitle && wifiTile) {
            const isWifiActive = wifiTile.dataset.active === 'true';
            wifiSubtitle.textContent = isWifiActive ? t('control.wifi.connected') : t('control.wifi.disconnected');
        }
        
        const bluetoothSubtitle = document.getElementById('bluetooth-tile-subtitle');
        const bluetoothTile = document.getElementById('bluetooth-tile');
        if (bluetoothSubtitle && bluetoothTile) {
            // 从设置同步蓝牙状态
            const btEnabled = State.settings.bluetoothEnabled !== false;
            bluetoothTile.dataset.active = btEnabled ? 'true' : 'false';
            bluetoothSubtitle.textContent = btEnabled ? t('control.bluetooth.on') : t('control.bluetooth.off');
            
            // 更新蓝牙图标
            const iconOff = bluetoothTile.querySelector('.bluetooth-icon-off');
            const iconOn = bluetoothTile.querySelector('.bluetooth-icon-on');
            if (iconOff && iconOn) {
                iconOff.style.opacity = btEnabled ? '0' : '1';
                iconOn.style.opacity = btEnabled ? '1' : '0';
            }
        }

        const blurTile = document.getElementById('blur-tile');
        blurTile.dataset.active = State.settings.enableBlur ? 'true' : 'false';

        const animationTile = document.getElementById('animation-tile');
        animationTile.dataset.active = State.settings.enableAnimation ? 'true' : 'false';

        // 更新滑块值
        const volumeSlider = document.getElementById('volume-slider');
        const volumeValue = document.getElementById('volume-value');
        volumeSlider.value = State.settings.volume || 50;
        volumeValue.textContent = State.settings.volume || 50;

        const brightnessSlider = document.getElementById('brightness-slider');
        const brightnessValue = document.getElementById('brightness-value');
        brightnessSlider.value = State.settings.brightness || 100;
        brightnessValue.textContent = State.settings.brightness || 100;
    },

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    open() {
        // 计算控制中心按钮位置
        const btn = document.getElementById('control-center-btn');
        const btnRect = btn.getBoundingClientRect();
        
        // 先显示元素以获取正确的尺寸
        this.element.classList.remove('hidden');
        this.element.classList.remove('closing');
        
        // 先隐藏显示以获取宽度
        this.element.style.visibility = 'hidden';
        this.element.style.display = 'block';
        
        const panelRect = this.element.getBoundingClientRect();
        
        // 计算按钮中心点
        const btnCenterX = btnRect.left + btnRect.width / 2;
        
        // 设置控制中心位置：底部距离任务栏按钮顶部 8px
        const bottomDistance = window.innerHeight - btnRect.top + 8;
        this.element.style.bottom = `${bottomDistance}px`;
        // 使用left定位，让控制中心的中心点对齐按钮的中心点
        this.element.style.left = `${btnCenterX - panelRect.width / 2}px`;
        this.element.style.right = 'auto';
        
        // 显示面板
        this.element.style.visibility = 'visible';
        
        this.isOpen = true;
        
        // 更新按钮状态
        btn.classList.add('active');

        // 关闭其他面板（互斥）
        StartMenu.close();
        NotificationCenter.close();
        if (typeof Fingo !== 'undefined' && Fingo && Fingo.isOpen) {
            Fingo.hide('panel-switch');
        }

    },

    close() {
        if (!this.isOpen) return;
        
        const btn = document.getElementById('control-center-btn');
        btn.classList.remove('active');
        
        // 添加关闭动画
        if (State.settings.enableAnimation) {
            this.element.classList.add('closing');
            setTimeout(() => {
                this.element.classList.add('hidden');
                this.element.classList.remove('closing');
                // 清除inline样式，恢复到默认状态
                this.element.style.display = '';
                this.element.style.visibility = '';
            }, 200);
        } else {
            this.element.classList.add('hidden');
            this.element.style.display = '';
            this.element.style.visibility = '';
        }
        
        this.isOpen = false;
    }
};
