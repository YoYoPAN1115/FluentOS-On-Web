/**
 * 天气应用 - WeatherApp
 * 数据源：Open-Meteo (无需密钥)
 * 设计：参考给定图片，结合 SettingsApp 的统一 UI（左侧导航 + 右侧内容）
 */
const WeatherApp = {
    windowId: null,
    container: null,
    frame: null,
    currentCity: null,
    coords: { lat: 39.9042, lon: 116.4074 }, // 当前位置失败时回退到北京
    currentCoords: { lat: 39.9042, lon: 116.4074 },
    data: null,
    hourly: [],
    daily: [],
    searchResults: [],
    currentLocKey: 'current',
    contextMenu: null,
    _weatherRequestToken: 0,
    _currentLocationToken: 0,
    defaultLocations: {
        beijing: { nameKey: 'weather.beijing', widgetId: null, lat: 39.9042, lon: 116.4074, isDefault: true },
        shanghai: { nameKey: 'weather.shanghai', widgetId: 'wl4480', lat: 31.2304, lon: 121.4737, isDefault: true },
        hangzhou: { nameKey: 'weather.hangzhou', widgetId: 'wl3562', lat: 30.2741, lon: 120.1551, isDefault: true },
        xian: { nameKey: 'weather.xian', widgetId: 'wl11434', lat: 34.3416, lon: 108.9398, isDefault: true },
        hainan: { nameKey: 'weather.hainan', widgetId: 'wl11607', lat: 20.0174, lon: 110.3492, isDefault: true },
        lanzhou: { nameKey: 'weather.lanzhou', widgetId: 'wl11457', lat: 36.0611, lon: 103.8343, isDefault: true }
    },
    locations: {
        current: { nameKey: 'weather.current-location', widgetId: null, lat: 39.9042, lon: 116.4074, isDefault: true, isCurrent: true },
        beijing: { nameKey: 'weather.beijing', widgetId: null, lat: 39.9042, lon: 116.4074, isDefault: true },
        shanghai: { nameKey: 'weather.shanghai', widgetId: 'wl4480', lat: 31.2304, lon: 121.4737, isDefault: true },
        hangzhou: { nameKey: 'weather.hangzhou', widgetId: 'wl3562', lat: 30.2741, lon: 120.1551, isDefault: true },
        xian: { nameKey: 'weather.xian', widgetId: 'wl11434', lat: 34.3416, lon: 108.9398, isDefault: true },
        hainan: { nameKey: 'weather.hainan', widgetId: 'wl11607', lat: 20.0174, lon: 110.3492, isDefault: true },
        lanzhou: { nameKey: 'weather.lanzhou', widgetId: 'wl11457', lat: 36.0611, lon: 103.8343, isDefault: true }
    },

    init(windowId) {
        this.windowId = windowId || `window-${Date.now()}`;
        this.container = document.getElementById(`${this.windowId}-content`);
        this.currentLocKey = 'current';
        this.searchResults = [];
        this.rebuildLocations();
        this.renderSkeleton();
        this.addStyles();
        this.bindEvents();
        this.updateSidebarIcons();

        // 监听语言切换
        this._langHandler = () => {
            this.rebuildLocations();
            if (!this.locations[this.currentLocKey]) this.currentLocKey = 'current';
            this.renderSkeleton();
            this.addStyles();
            this.bindEvents();
            this.updateSidebarIcons();
        };
        State.on('languageChange', this._langHandler, { key: 'WeatherApp.languageChange' });
    },

    rebuildLocations() {
        const currentCoords = this.currentCoords || { lat: 39.9042, lon: 116.4074 };
        const next = {
            current: {
                nameKey: 'weather.current-location',
                widgetId: null,
                lat: currentCoords.lat,
                lon: currentCoords.lon,
                isDefault: true,
                isCurrent: true
            },
            ...this.defaultLocations
        };
        this.getPinnedCities().forEach(city => {
            next[city.id] = {
                id: city.id,
                name: city.name,
                nameKey: city.name,
                admin1: city.admin1,
                country: city.country,
                widgetId: null,
                lat: city.lat,
                lon: city.lon,
                isPinned: true
            };
        });
        this.locations = next;
    },

    getPinnedCities() {
        const settings = typeof State !== 'undefined' ? State.settings : null;
        const saved = settings && Array.isArray(settings.weatherPinnedCities)
            ? settings.weatherPinnedCities
            : [];
        const seen = new Set();
        return saved
            .map(city => this.normalizePinnedCity(city))
            .filter(Boolean)
            .filter(city => {
                if (seen.has(city.id) || this.isDefaultCityLike(city)) return false;
                seen.add(city.id);
                return true;
            });
    },

    normalizePinnedCity(city) {
        if (!city || typeof city !== 'object') return null;
        const lat = Number(city.lat ?? city.latitude);
        const lon = Number(city.lon ?? city.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        const name = String(city.name || '').trim();
        if (!name) return null;
        return {
            id: this.makeCityKey(city),
            name,
            admin1: String(city.admin1 || '').trim(),
            country: String(city.country || '').trim(),
            lat,
            lon
        };
    },

    makeCityKey(city) {
        if (city && typeof city.id === 'string' && city.id.startsWith('custom-')) return city.id;
        const lat = Number(city.lat ?? city.latitude);
        const lon = Number(city.lon ?? city.longitude);
        const raw = `${String(city.name || 'city').trim()}-${lat.toFixed(4)}-${lon.toFixed(4)}`;
        return `custom-${raw.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5_-]+/gi, '-')}`;
    },

    renderSkeleton() {
        if (!this.container) return;
        this.container.innerHTML = '';

        if (this.frame && typeof this.frame.destroy === 'function') {
            this.frame.destroy();
            this.frame = null;
        }

        if (typeof FluentWindow === 'undefined' || typeof FluentWindow.mount !== 'function') {
            console.error('[WeatherApp] FluentWindow framework is not loaded');
            return;
        }

        this.frame = FluentWindow.mount({
            container: this.container,
            items: Object.entries(this.locations).map(([key, loc]) => ({
                id: key,
                label: this.getLocationName(loc),
                icon: 'Earth'
            })),
            activeId: this.currentLocKey,
            sidebarSearch: {
                enabled: true,
                placeholder: t('weather.search-placeholder'),
                resultsTitle: t('weather.search-results'),
                emptyText: t('weather.try-other'),
                loadingText: t('weather.searching'),
                minQueryLength: 1,
                debounceMs: 250,
                search: (query) => this.searchCity(query),
                onResultClick: (result) => {
                    const city = result && result.data;
                    if (!city) return;
                    if (this.frame && typeof this.frame.clearSidebarSearch === 'function') {
                        this.frame.clearSidebarSearch();
                    }
                    const existingKey = this.findExistingLocationKey(city);
                    if (existingKey) {
                        this.navigateToLocationKey(existingKey);
                    } else {
                        this.selectSearchCity(city);
                    }
                },
                onResultAction: (action, result) => {
                    if (!action || action.id !== 'pin' || !result || !result.data) return;
                    if (this.frame && typeof this.frame.clearSidebarSearch === 'function') {
                        this.frame.clearSidebarSearch();
                    }
                    this.pinCity(result.data);
                }
            },
            onNavigate: (key, pageEl) => {
                pageEl.classList.add('weather-content');
                pageEl.id = 'weather-content';
                this.currentLocKey = key;
                const loc = this.locations[key];
                this.renderWeatherSkeleton(pageEl);
                this.injectWidget(loc?.widgetId);
                if (key === 'current') {
                    this.fetchCurrentLocationWeather();
                } else if (loc) {
                    this.currentCity = null;
                    this.coords = { lat: loc.lat, lon: loc.lon };
                    this.fetchWeatherByCoords(loc.lat, loc.lon, key);
                }
            }
        });
    },

    renderWeatherSkeleton(content) {
        content.innerHTML = `
            <div class="weather-widget" id="weather-widget"></div>
            <div class="weather-hero" id="weather-hero">
                <div class="hero-left">
                    <div class="hero-location" id="hero-location">--</div>
                    <div class="hero-desc" id="hero-desc">--</div>
                    <div class="hero-meta">
                        <div><span>${t('weather.wind')}</span><b id="hero-wind">--</b></div>
                        <div><span>${t('weather.humidity')}</span><b id="hero-humidity">--</b></div>
                        <div><span>${t('weather.visibility')}</span><b id="hero-visibility">--</b></div>
                    </div>
                </div>
                <div class="hero-right">
                    <div class="hero-temp" id="hero-temp">--°</div>
                    <div class="hero-feels" id="hero-feels">${t('weather.feels-like', { temp: '--' })}</div>
                </div>
            </div>
            <div class="weather-section">
                <div class="section-title">${t('weather.today')}</div>
                <div class="hourly-strip" id="hourly-strip"></div>
            </div>
            <div class="weather-section">
                <div class="section-title">${t('weather.next7')}</div>
                <div class="daily-list" id="daily-list"></div>
            </div>
        `;
    },

    beforeClose() {
        if (this.frame && typeof this.frame.destroy === 'function') {
            this.frame.destroy();
            this.frame = null;
        }
        if (this.contextMenu && this.contextMenu.parentElement) {
            this.contextMenu.remove();
        }
        this.contextMenu = null;
        if (this._sidebarContextHandler && this.container) {
            this.container.removeEventListener('contextmenu', this._sidebarContextHandler);
            this._sidebarContextHandler = null;
        }
        if (this._hideContextMenuHandler) {
            document.removeEventListener('click', this._hideContextMenuHandler);
            this._hideContextMenuHandler = null;
        }
        if (typeof State !== 'undefined' && typeof State.off === 'function') {
            State.off('languageChange', 'WeatherApp.languageChange');
        }
        this.container = null;
        this.windowId = null;
        return true;
    },

    addStyles() {
        if (document.getElementById('weather-app-styles')) return;
        const style = document.createElement('style');
        style.id = 'weather-app-styles';
        style.textContent = `
            .weather-app { display: flex; height: 100%; min-height: 0; overflow: hidden; }
            .saved-item:hover { background: rgba(0,0,0,0.05); }

            .weather-content { min-width: 0; min-height: 100%; padding: 24px 32px; }
            .weather-widget { margin-bottom: 16px; }
            .weather-hero { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(180deg, #4b7cff 0%, #6790ff 100%); border-radius: 24px; padding: 20px 24px; color: white; box-shadow: 0 10px 30px rgba(75,124,255,0.25); }
            .dark-mode .weather-hero { background: linear-gradient(180deg, #2a2f3a 0%, #3c4252 100%); box-shadow: 0 10px 30px rgba(0,0,0,0.35); }
            .hero-location { font-weight: 600; font-size: 18px; margin-bottom: 6px; }
            .hero-desc { opacity: .95; margin-bottom: 12px; }
            .hero-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
            .hero-meta span { font-size: 12px; opacity: .9; }
            .hero-meta b { display: block; font-size: 14px; }
            .hero-temp { font-size: 68px; font-weight: 600; line-height: 1; text-align: right; }
            .hero-feels { text-align: right; opacity: .95; }

            .weather-section { margin-top: 24px; }
            .section-title { font-size: 14px; color: var(--text-secondary); margin-bottom: 12px; }
            .hourly-strip { display: grid; grid-auto-flow: column; grid-auto-columns: 110px; gap: 12px; overflow-x: auto; padding-bottom: 6px; }
            .hour-card { padding: 12px; border-radius: 16px; background: var(--bg-tertiary); text-align: center; min-height: 92px; }
            .hour-time { font-size: 12px; color: var(--text-secondary); }
            .hour-temp { font-size: 20px; font-weight: 600; margin: 4px 0; }
            .hour-desc { font-size: 12px; opacity: .85; }

            .daily-list { display: grid; gap: 10px; }
            .day-row { display: grid; grid-template-columns: 1fr 60px 1fr; align-items: center; padding: 12px 16px; border-radius: 16px; background: var(--bg-tertiary); }
            .day-name { font-weight: 500; }
            .day-temp { text-align: center; font-weight: 600; }
            .day-desc { text-align: right; opacity: .85; display: flex; align-items: center; justify-content: flex-end; gap: 8px; }

            /* 天气图标（黑色描边 SVG，按场景反色） */
            .wx-icon { vertical-align: middle; }
            .wx-icon-hero { width: 22px; height: 22px; margin-right: 6px; filter: invert(1); }
            #hero-desc { display: flex; align-items: center; }
            .wx-icon-hour { width: 28px; height: 28px; margin-top: 6px; }
            .wx-icon-day { width: 22px; height: 22px; }
            .dark-mode .wx-icon-hour, .dark-mode .wx-icon-day { filter: invert(1); }

        `;
        document.head.appendChild(style);
    },

    bindEvents() {
        this.ensureContextMenu();
        if (!this.container) return;
        if (this._sidebarContextHandler) {
            this.container.removeEventListener('contextmenu', this._sidebarContextHandler);
        }
        this._sidebarContextHandler = (e) => {
            const item = e.target.closest('.fw-nav-item');
            if (!item || !this.container.contains(item)) return;
            const key = item.dataset.id;
            const loc = this.locations[key];
            if (!loc || !loc.isPinned) return;
            e.preventDefault();
            e.stopPropagation();
            this.showLocationContextMenu(key, e.clientX, e.clientY);
        };
        this.container.addEventListener('contextmenu', this._sidebarContextHandler);
    },

    // 深度链接：WindowManager.openApp('weather', { city: 'beijing' })
    openData(data) {
        if (!data || !data.city || !this.locations[data.city]) return;
        this.navigateToLocationKey(data.city);
    },

    setLocationByKey(key) {
        if (!this.locations[key]) return;
        this.navigateToLocationKey(key);
    },

    navigateToLocationKey(key) {
        if (!this.locations[key]) return;
        this.currentLocKey = key;
        if (this.frame && typeof this.frame.navigate === 'function') {
            const wasActive = this.frame.activeId === key;
            this.frame.navigate(key, { preserveScroll: false });
            if (wasActive) {
                const loc = this.locations[key];
                if (key === 'current') this.fetchCurrentLocationWeather();
                else if (loc) this.fetchWeatherByCoords(loc.lat, loc.lon, key);
            }
            return;
        }
        this.renderSkeleton();
        this.updateSidebarIcons();
    },

    injectWidget(widgetId) {
        const host = document.getElementById('weather-widget');
        if (!host) return;
        const wid = `ww_${this.windowId.replace(/[^a-zA-Z0-9_]/g, '')}` + (widgetId ? `_${widgetId}` : '');
        const aObj = { t: 'horizontal', lang: 'zh', sl_lpl: 1, ids: widgetId ? [widgetId] : [], font: 'Arial', sl_ics: 'one_a', sl_sot: 'celsius', cl_bkg: '#FFFFFF00', cl_font: '#000000', cl_cloud: '#d4d4d4', cl_persp: '#2196F3', cl_sun: '#FFC107', cl_moon: '#FFC107', cl_thund: '#FF5722' };
        const aStr = JSON.stringify(aObj).replace(/\"/g, '"').replace(/"/g, '&quot;');
        host.innerHTML = `
            <div id="${wid}" v="1.3" loc="id" a="${aStr}"><a href="https://weatherwidget.org/" id="${wid}_u" target="_blank">Free weather widget for website</a></div>
        `;
        const s = document.createElement('script');
        s.async = true;
        s.src = `https://app3.weatherwidget.org/js/?id=${wid}`;
        host.appendChild(s);
    },

    ensureContextMenu() {
        if (this.contextMenu && this.contextMenu.isConnected) return;
        const menu = document.createElement('div');
        menu.className = 'context-menu hidden weather-context-menu';
        menu.id = `${this.windowId}-weather-context-menu`;
        menu.addEventListener('contextmenu', (e) => e.preventDefault());
        menu.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (!item || item.classList.contains('disabled')) return;
            const key = menu.dataset.locationKey;
            if (item.dataset.action === 'delete' && key) {
                this.removePinnedCity(key);
            }
            this.hideLocationContextMenu();
        });
        document.body.appendChild(menu);
        this.contextMenu = menu;

        if (!this._hideContextMenuHandler) {
            this._hideContextMenuHandler = (e) => {
                if (this.contextMenu && !this.contextMenu.contains(e.target)) {
                    this.hideLocationContextMenu();
                }
            };
            document.addEventListener('click', this._hideContextMenuHandler);
        }
    },

    showLocationContextMenu(key, x, y) {
        this.ensureContextMenu();
        const loc = this.locations[key];
        if (!this.contextMenu || !loc || !loc.isPinned) return;
        this.contextMenu.dataset.locationKey = key;
        this.contextMenu.innerHTML = `
            <div class="context-menu-item" data-action="delete">
                <img src="Theme/Icon/Symbol_icon/stroke/Trash.svg" alt="">
                <span>${t('weather.delete-city')}</span>
            </div>
        `;
        this.contextMenu.classList.remove('hidden');
        const rect = this.contextMenu.getBoundingClientRect();
        this.contextMenu.style.left = `${Math.min(x, window.innerWidth - rect.width - 8)}px`;
        this.contextMenu.style.top = `${Math.min(y, window.innerHeight - rect.height - 8)}px`;
    },

    hideLocationContextMenu() {
        if (this.contextMenu) this.contextMenu.classList.add('hidden');
    },

    async searchCity(query) {
        if (!query) {
            this.searchResults = [];
            return [];
        }
        const lang = (typeof I18n !== 'undefined') ? I18n.currentLang : 'zh';
        const langParam = lang === 'en' ? 'en' : 'zh';
        try {
            const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=${langParam}&format=json`;
            const res = await fetch(url);
            const json = await res.json();
            if (!json.results || json.results.length === 0) {
                this.searchResults = [];
                return [];
            }
            this.searchResults = json.results
                .map(city => this.normalizeSearchCity(city))
                .filter(Boolean);
            return this.searchResults.map(city => this.buildSidebarSearchResult(city));
        } catch (e) {
            console.error('[Weather] search error', e);
            this.searchResults = [];
            if (typeof State !== 'undefined' && State.addNotification) {
                State.addNotification({ title: t('weather.network-error'), message: t('weather.search-fail'), type: 'error' });
            }
            return [];
        }
    },

    normalizeSearchCity(city) {
        if (!city) return null;
        const lat = Number(city.latitude);
        const lon = Number(city.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        return {
            id: this.makeCityKey(city),
            name: String(city.name || '').trim(),
            admin1: String(city.admin1 || '').trim(),
            country: String(city.country || '').trim(),
            lat,
            lon
        };
    },

    buildSidebarSearchResult(city) {
        const existingKey = this.findExistingLocationKey(city);
        const isPinned = !!existingKey;
        return {
            id: city.id,
            title: this.formatCityName(city),
            subtitle: `${city.lat.toFixed(2)}, ${city.lon.toFixed(2)}`,
            icon: 'Earth',
            data: city,
            actions: [{
                id: 'pin',
                iconSrc: 'Theme/Icon/Symbol_icon/stroke/Pin.svg',
                disabled: isPinned,
                title: isPinned ? t('weather.pinned') : t('weather.pin')
            }]
        };
    },

    selectSearchCity(city) {
        this.currentCity = city;
        this.currentLocKey = 'search';
        this.coords = { lat: city.lat, lon: city.lon };
        if (this.frame) this.frame.activeId = 'search';
        if (this.container) {
            this.container.querySelectorAll('.fw-nav-item.active').forEach(item => item.classList.remove('active'));
        }
        this.injectWidget(null);
        this.fetchWeatherByCoords(city.lat, city.lon, 'search');
    },

    pinCity(city) {
        const normalized = this.normalizePinnedCity(city);
        if (!normalized) return null;
        const existingKey = this.findExistingLocationKey(normalized);
        if (existingKey) {
            State.addNotification({ title: t('weather.title'), message: t('weather.city-already-pinned'), type: 'info' });
            this.navigateToLocationKey(existingKey);
            return existingKey;
        }
        const pinned = this.getPinnedCities();
        const next = [...pinned, normalized];
        State.updateSettings({ weatherPinnedCities: next });
        this.rebuildLocations();
        this._sidebarCodes = null;
        State.addNotification({ title: t('weather.title'), message: t('weather.city-pinned', { name: normalized.name }), type: 'success' });
        this.currentLocKey = normalized.id;
        this.renderSkeleton();
        this.bindEvents();
        this.updateSidebarIcons();
        return normalized.id;
    },

    removePinnedCity(key) {
        const loc = this.locations[key];
        if (!loc || !loc.isPinned) return;
        const next = this.getPinnedCities().filter(city => city.id !== key);
        State.updateSettings({ weatherPinnedCities: next });
        this.rebuildLocations();
        this._sidebarCodes = null;
        State.addNotification({ title: t('weather.title'), message: t('weather.city-removed', { name: this.getLocationName(loc) }), type: 'success' });
        if (this.currentLocKey === key || !this.locations[this.currentLocKey]) {
            this.currentLocKey = 'current';
        }
        this.renderSkeleton();
        this.bindEvents();
        this.updateSidebarIcons();
    },

    findExistingLocationKey(city) {
        const normalizedName = String(city.name || '').trim().toLowerCase();
        return Object.entries(this.locations).find(([, loc]) => {
            if (loc.isCurrent) return false;
            const sameCoords = Math.abs(Number(loc.lat) - Number(city.lat)) < 0.05
                && Math.abs(Number(loc.lon) - Number(city.lon)) < 0.05;
            const locName = this.getLocationName(loc).trim().toLowerCase();
            return sameCoords || (normalizedName && locName === normalizedName);
        })?.[0] || null;
    },

    isDefaultCityLike(city) {
        return Object.values(this.defaultLocations).some(loc => (
            Math.abs(Number(loc.lat) - Number(city.lat)) < 0.05 &&
            Math.abs(Number(loc.lon) - Number(city.lon)) < 0.05
        ));
    },

    getLocationName(loc) {
        if (!loc) return '';
        if (loc.name) return this.formatCityName(loc);
        if (loc.nameKey) return t(loc.nameKey);
        return loc.id || '';
    },

    formatCityName(city) {
        const parts = [city.name, city.admin1, city.country]
            .map(part => String(part || '').trim())
            .filter(Boolean);
        return [...new Set(parts)].join(', ');
    },

    async fetchCurrentLocationWeather() {
        const token = ++this._currentLocationToken;
        const fallback = { ...this.currentCoords };
        const applyCoords = (coords, isFallback = false) => {
            if (token !== this._currentLocationToken || this.currentLocKey !== 'current') return;
            this.currentCoords = coords;
            this.coords = coords;
            if (this.locations.current) {
                this.locations.current.lat = coords.lat;
                this.locations.current.lon = coords.lon;
            }
            this._sidebarCodes = null;
            this.fetchWeatherByCoords(coords.lat, coords.lon, 'current');
            if (isFallback) {
                State.addNotification({
                    title: t('weather.current-location'),
                    message: t('weather.current-location-fail'),
                    type: 'warning'
                });
            }
        };

        if (!navigator.geolocation) {
            applyCoords(fallback, true);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                applyCoords(coords, false);
            },
            () => applyCoords(fallback, true),
            { enableHighAccuracy: false, timeout: 7000, maximumAge: 30 * 60 * 1000 }
        );
    },

    /* ===== 天气数据缓存（App 与小组件共用） =====
     * - App 内同一城市 20 分钟内不重复调用 API（切换城市 / 重开 App 均复用缓存）
     * - 小组件以 1 小时为默认有效期读取同一份缓存
     * - 真正发生网络请求拿到新数据时，通过 State 事件通知小组件同步刷新
     */
    CACHE_TTL: 20 * 60 * 1000,
    _weatherCache: {},   // key → { data, time }
    _inflight: {},       // key → Promise

    _cacheKey(lat, lon) {
        return `${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`;
    },

    /**
     * 获取指定坐标的天气数据（带缓存与并发去重）。
     * @param {number} lat
     * @param {number} lon
     * @param {number} [maxAgeMs] 缓存有效期，默认 20 分钟（小组件传 1 小时）
     */
    async getWeather(lat, lon, maxAgeMs = this.CACHE_TTL) {
        const key = this._cacheKey(lat, lon);
        const cached = this._weatherCache[key];
        if (cached && Date.now() - cached.time < maxAgeMs) {
            return cached.data;
        }
        if (this._inflight[key]) {
            return this._inflight[key];
        }
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,apparent_temperature,weathercode,windspeed_10m,visibility&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`;
        this._inflight[key] = (async () => {
            try {
                const res = await fetch(url);
                const json = await res.json();
                this._weatherCache[key] = { data: json, time: Date.now() };
                // 通知小组件等订阅方：该坐标有了新数据
                State.emit('weatherDataUpdate', { key, lat, lon });
                return json;
            } finally {
                delete this._inflight[key];
            }
        })();
        return this._inflight[key];
    },

    async fetchWeatherByCoords(lat, lon, locKey = this.currentLocKey) {
        const token = ++this._weatherRequestToken;
        try {
            const json = await this.getWeather(lat, lon);
            if (token !== this._weatherRequestToken || locKey !== this.currentLocKey) return;
            this.data = json;
            this.prepareData(json);
            this.renderWeather();
            const code = json?.current_weather?.weathercode;
            if (code !== undefined && code !== null) {
                this._setNavWeatherIcon(locKey, this.codeToIconName(code));
            }
        } catch (e) {
            console.error('[Weather] fetch error', e);
            State.addNotification({ title: t('weather.network-error'), message: t('weather.fetch-fail'), type: 'error' });
        }
    },

    prepareData(json) {
        const hourly = [];
        const hours = json.hourly.time;
        for (let i = 0; i < Math.min(24, hours.length); i++) {
            hourly.push({
                time: hours[i].slice(11, 16),
                temp: json.hourly.temperature_2m[i],
                feels: json.hourly.apparent_temperature?.[i],
                humidity: json.hourly.relativehumidity_2m?.[i],
                code: json.hourly.weathercode?.[i]
            });
        }
        this.hourly = hourly;
        const daily = [];
        const days = json.daily.time;
        for (let i = 0; i < days.length; i++) {
            daily.push({
                date: days[i],
                tmax: json.daily.temperature_2m_max[i],
                tmin: json.daily.temperature_2m_min[i],
                code: json.daily.weathercode?.[i]
            });
        }
        this.daily = daily;
    },

    renderWeather() {
        const { current_weather } = this.data || {};
        const locData = this.locations[this.currentLocKey];
        const locName = this.currentLocKey === 'search' && this.currentCity
            ? this.formatCityName(this.currentCity)
            : (locData ? this.getLocationName(locData) : t('weather.beijing'));
        const heroLocation = document.getElementById('hero-location');
        const heroDesc = document.getElementById('hero-desc');
        const heroTemp = document.getElementById('hero-temp');
        const heroFeels = document.getElementById('hero-feels');
        const heroWind = document.getElementById('hero-wind');
        const heroHumidity = document.getElementById('hero-humidity');
        const heroVisibility = document.getElementById('hero-visibility');
        const hourlyStrip = document.getElementById('hourly-strip');
        const dailyList = document.getElementById('daily-list');
        if (!heroLocation || !heroDesc || !heroTemp || !heroFeels || !heroWind || !heroHumidity || !heroVisibility || !hourlyStrip || !dailyList) return;

        heroLocation.textContent = t('weather.location', { name: locName });
        heroDesc.innerHTML =
            `<img class="wx-icon wx-icon-hero" src="${this.codeToIcon(current_weather?.weathercode)}" alt=""> ${this.codeToDesc(current_weather?.weathercode)}`;
        heroTemp.textContent = `${Math.round(current_weather?.temperature || 0)}°`;
        heroFeels.textContent = t('weather.feels-like', { temp: Math.round(this.hourly?.[0]?.feels ?? current_weather?.temperature) });
        heroWind.textContent = `${Math.round(current_weather?.windspeed || 0)} km/h`;
        heroHumidity.textContent = `${Math.round(this.hourly?.[0]?.humidity || 0)}%`;
        heroVisibility.textContent = `${Math.round((this.data?.hourly?.visibility?.[0] || 0) / 1000)} km`;

        hourlyStrip.innerHTML = this.hourly.map(h => `
            <div class="hour-card">
                <div class="hour-time">${h.time}</div>
                <img class="wx-icon wx-icon-hour" src="${this.codeToIcon(h.code)}" alt="">
                <div class="hour-temp">${Math.round(h.temp)}°</div>
                <div class="hour-desc">${this.codeToDesc(h.code)}</div>
            </div>
        `).join('');

        this.bindHourlyWheelScroll(hourlyStrip);

        dailyList.innerHTML = this.daily.map(d => `
            <div class="day-row">
                <div class="day-name">${this.formatDay(d.date)}</div>
                <div class="day-temp">${Math.round(d.tmin)}° / ${Math.round(d.tmax)}°</div>
                <div class="day-desc"><span>${this.codeToDesc(d.code)}</span><img class="wx-icon wx-icon-day" src="${this.codeToIcon(d.code)}" alt=""></div>
            </div>
        `).join('');
    },

    bindHourlyWheelScroll(strip) {
        if (!strip || strip._weatherWheelBound) return;
        strip._weatherWheelBound = true;
        strip.addEventListener('wheel', (event) => {
            const verticalDelta = event.deltaY || 0;
            if (!verticalDelta || Math.abs(event.deltaX || 0) > Math.abs(verticalDelta)) return;

            const maxScroll = Math.max(0, strip.scrollWidth - strip.clientWidth);
            if (maxScroll <= 0) return;

            const atStart = strip.scrollLeft <= 0;
            const atEnd = strip.scrollLeft >= maxScroll - 1;
            if ((verticalDelta < 0 && atStart) || (verticalDelta > 0 && atEnd)) return;

            event.preventDefault();
            strip.scrollLeft = Math.max(0, Math.min(maxScroll, strip.scrollLeft + verticalDelta));
        }, { passive: false });
    },

    codeToDesc(code) {
        const map = {
            0: t('weather.clear'), 1: t('weather.partly-cloudy'), 2: t('weather.partly-cloudy'), 3: t('weather.cloudy'),
            45: t('weather.fog'), 48: t('weather.fog'), 51: t('weather.drizzle'), 53: t('weather.light-rain'), 55: t('weather.rain'),
            61: t('weather.light-rain'), 63: t('weather.rain'), 65: t('weather.heavy-rain'), 71: t('weather.light-snow'), 73: t('weather.snow'), 75: t('weather.heavy-snow'),
            95: t('weather.thunderstorm'), 96: t('weather.thunderstorm'), 99: t('weather.heavy-thunderstorm')
        };
        return map[code] || '—';
    },

    /** WMO 天气码 → 图标名（Theme/Icon/Symbol_icon/weather/<name>-64px.svg） */
    codeToIconName(code) {
        const map = {
            0: 'sun', 1: 'sun-dim', 2: 'cloud-sun', 3: 'cloudy',
            45: 'cloud-fog', 48: 'cloud-fog',
            51: 'cloud-drizzle', 53: 'cloud-drizzle', 55: 'cloud-rain',
            56: 'cloud-hail', 57: 'cloud-hail',
            61: 'cloud-rain', 63: 'cloud-rain', 65: 'cloud-rain-wind',
            66: 'cloud-hail', 67: 'cloud-hail',
            71: 'cloud-snow', 73: 'cloud-snow', 75: 'snowflake', 77: 'snowflake',
            80: 'cloud-sun-rain', 81: 'cloud-rain', 82: 'cloud-rain-wind',
            85: 'cloud-snow', 86: 'snowflake',
            95: 'cloud-lightning', 96: 'cloud-lightning', 99: 'cloud-lightning'
        };
        return map[code] || 'cloud';
    },

    /** WMO 天气码 → 图标完整路径 */
    codeToIcon(code) {
        return `Theme/Icon/Symbol_icon/weather/${this.codeToIconName(code)}-64px.svg`;
    },

    /**
     * 根据各城市当前天气更新侧边栏图标。
     * 利用 Open-Meteo 批量坐标查询，一次请求获取全部城市的天气码。
     */
    _sidebarCodes: null,       // { cityKey: weathercode }
    _sidebarCodesTime: 0,

    async updateSidebarIcons() {
        if (!this.container) return;
        try {
            // 20 分钟内复用上次的批量查询结果，避免频繁调用 API
            if (!this._sidebarCodes || Date.now() - this._sidebarCodesTime >= this.CACHE_TTL) {
                const entries = Object.entries(this.locations);
                const lats = entries.map(([, l]) => l.lat).join(',');
                const lons = entries.map(([, l]) => l.lon).join(',');
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current_weather=true&timezone=auto`;
                const res = await fetch(url);
                const json = await res.json();
                const arr = Array.isArray(json) ? json : [json];
                const codes = {};
                entries.forEach(([key], i) => {
                    const code = arr[i]?.current_weather?.weathercode;
                    if (code !== undefined && code !== null) codes[key] = code;
                });
                this._sidebarCodes = codes;
                this._sidebarCodesTime = Date.now();
            }
            Object.entries(this._sidebarCodes).forEach(([key, code]) => {
                this._setNavWeatherIcon(key, this.codeToIconName(code));
            });
        } catch (e) {
            console.warn('[Weather] 更新侧边栏天气图标失败', e);
        }
    },

    /**
     * 替换 FluentWindow 侧边栏某一项的图标为天气图标。
     * 通过 "../weather/<name>-64px" 形式的图标名兼容框架的
     * stroke/fill 路径模板，切换激活态时不会被还原成默认图标。
     */
    _setNavWeatherIcon(key, iconName) {
        if (!this.container) return;
        const btn = this.container.querySelector(`.fw-nav-item[data-id="${key}"]`);
        if (!btn) return;
        const navIconName = `../weather/${iconName}-64px`;
        const path = `Theme/Icon/Symbol_icon/weather/${iconName}-64px.svg`;
        const img = btn.querySelector('.fw-nav-icon-img');
        const sym = btn.querySelector('.fw-nav-icon-symbol');
        if (img) {
            img.dataset.iconName = navIconName;
            img.src = path;
        }
        if (sym) {
            sym.dataset.iconName = navIconName;
            sym.style.setProperty('--fw-icon-url', `url("${path}")`);
        }
    },

    formatDay(dateStr) {
        const d = new Date(dateStr);
        const w = t('weather.weekdays').split(',');
        return `${w[d.getDay()]} ${d.getMonth()+1}/${d.getDate()}`;
    }
};

// 导出为全局
window.WeatherApp = WeatherApp;
