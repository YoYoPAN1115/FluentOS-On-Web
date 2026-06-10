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
    coords: { lat: 39.9042, lon: 116.4074 }, // 默认北京
    data: null,
    hourly: [],
    daily: [],
    currentLocKey: 'beijing',
    locations: {
        beijing: { nameKey: 'weather.beijing', widgetId: null, lat: 39.9042, lon: 116.4074 },
        hangzhou: { nameKey: 'weather.hangzhou', widgetId: 'wl3562', lat: 30.2741, lon: 120.1551 },
        shanghai: { nameKey: 'weather.shanghai', widgetId: 'wl4480', lat: 31.2304, lon: 121.4737 },
        xian: { nameKey: 'weather.xian', widgetId: 'wl11434', lat: 34.3416, lon: 108.9398 },
        sichuan: { nameKey: 'weather.sichuan', widgetId: 'wl11585', lat: 30.5728, lon: 104.0668 },
        chengdu: { nameKey: 'weather.chengdu', widgetId: 'wl2815', lat: 30.5728, lon: 104.0668 },
        hainan: { nameKey: 'weather.hainan', widgetId: 'wl11607', lat: 20.0174, lon: 110.3492 },
        yunnan: { nameKey: 'weather.yunnan', widgetId: 'wl11597', lat: 25.0453, lon: 102.7097 },
        xinjiang: { nameKey: 'weather.xinjiang', widgetId: 'wl11599', lat: 43.8256, lon: 87.6168 },
        lanzhou: { nameKey: 'weather.lanzhou', widgetId: 'wl11457', lat: 36.0611, lon: 103.8343 }
    },

    init(windowId) {
        this.windowId = windowId || `window-${Date.now()}`;
        this.container = document.getElementById(`${this.windowId}-content`);
        this.renderSkeleton();
        this.addStyles();
        this.bindEvents();
        this.fetchWeatherByCoords(this.coords.lat, this.coords.lon);
        this.updateSidebarIcons();

        // 监听语言切换
        this._langHandler = () => {
            this.renderSkeleton();
            this.addStyles();
            this.bindEvents();
            if (this.data) this.renderWeather();
            else this.fetchWeatherByCoords(this.coords.lat, this.coords.lon);
            this.updateSidebarIcons();
        };
        State.on('languageChange', this._langHandler);
    },

    renderSkeleton() {
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
                label: t(loc.nameKey),
                icon: 'Earth'
            })),
            activeId: this.currentLocKey,
            onNavigate: (key, pageEl) => {
                pageEl.classList.add('weather-content');
                pageEl.id = 'weather-content';
                this.currentLocKey = key;
                const loc = this.locations[key];
                this.renderWeatherSkeleton(pageEl);
                if (loc) this.fetchWeatherByCoords(loc.lat, loc.lon);
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
        // 注入第三方天气小部件
        this.injectWidget();
    },

    // 深度链接：WindowManager.openApp('weather', { city: 'beijing' })
    openData(data) {
        if (!data || !data.city || !this.locations[data.city]) return;
        if (this.frame && typeof this.frame.navigate === 'function') {
            this.frame.navigate(data.city);
        }
    },

    setLocationByKey(key) {
        if (!this.locations[key]) return;
        this.currentLocKey = key;
        const loc = this.locations[key];
        // 更新标题文本
        const title = document.getElementById('hero-location');
        if (title) title.textContent = t('weather.location', { name: t(loc.nameKey) });
        // 更新坐标并获取数据
        this.coords = { lat: loc.lat, lon: loc.lon };
        this.fetchWeatherByCoords(loc.lat, loc.lon);
        // 重新注入 widget（切换城市）
        this.injectWidget(loc.widgetId);
        // 刷新侧栏激活状态
        this.renderLocations();
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

    async searchCity(query) {
        if (!query) return;
        const lang = (typeof I18n !== 'undefined') ? I18n.currentLang : 'zh';
        const langParam = lang === 'en' ? 'en' : 'zh';
        try {
            const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=${langParam}&format=json`;
            const res = await fetch(url);
            const json = await res.json();
            if (!json.results || json.results.length === 0) {
                State.addNotification(t('weather.city-not-found'), t('weather.try-other'));
                return;
            }
            const city = json.results[0];
            this.currentCity = city;
            this.coords = { lat: city.latitude, lon: city.longitude };
            this.fetchWeatherByCoords(city.latitude, city.longitude);
            this.addSavedCity(city);
        } catch (e) {
            console.error('[Weather] search error', e);
            State.addNotification(t('weather.network-error'), t('weather.search-fail'));
        }
    },

    addSavedCity(city) {
        const saved = document.getElementById('weather-saved');
        const item = document.createElement('div');
        item.className = 'saved-item';
        item.innerHTML = `<span>${city.name}, ${city.country || ''}</span><span>${city.latitude.toFixed(2)},${city.longitude.toFixed(2)}</span>`;
        item.addEventListener('click', () => {
            this.currentCity = city;
            this.coords = { lat: city.latitude, lon: city.longitude };
            this.fetchWeatherByCoords(city.latitude, city.longitude);
        });
        saved.prepend(item);
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

    async fetchWeatherByCoords(lat, lon) {
        try {
            const json = await this.getWeather(lat, lon);
            this.data = json;
            this.prepareData(json);
            this.renderWeather();
        } catch (e) {
            console.error('[Weather] fetch error', e);
            State.addNotification(t('weather.network-error'), t('weather.fetch-fail'));
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
        const locName = locData ? t(locData.nameKey) : t('weather.beijing');
        document.getElementById('hero-location').textContent = t('weather.location', { name: locName });
        document.getElementById('hero-desc').innerHTML =
            `<img class="wx-icon wx-icon-hero" src="${this.codeToIcon(current_weather?.weathercode)}" alt=""> ${this.codeToDesc(current_weather?.weathercode)}`;
        document.getElementById('hero-temp').textContent = `${Math.round(current_weather?.temperature || 0)}°`;
        document.getElementById('hero-feels').textContent = t('weather.feels-like', { temp: Math.round(this.hourly?.[0]?.feels ?? current_weather?.temperature) });
        document.getElementById('hero-wind').textContent = `${Math.round(current_weather?.windspeed || 0)} km/h`;
        document.getElementById('hero-humidity').textContent = `${Math.round(this.hourly?.[0]?.humidity || 0)}%`;
        document.getElementById('hero-visibility').textContent = `${Math.round((this.data?.hourly?.visibility?.[0] || 0) / 1000)} km`;

        const hourlyStrip = document.getElementById('hourly-strip');
        hourlyStrip.innerHTML = this.hourly.map(h => `
            <div class="hour-card">
                <div class="hour-time">${h.time}</div>
                <img class="wx-icon wx-icon-hour" src="${this.codeToIcon(h.code)}" alt="">
                <div class="hour-temp">${Math.round(h.temp)}°</div>
                <div class="hour-desc">${this.codeToDesc(h.code)}</div>
            </div>
        `).join('');

        const dailyList = document.getElementById('daily-list');
        dailyList.innerHTML = this.daily.map(d => `
            <div class="day-row">
                <div class="day-name">${this.formatDay(d.date)}</div>
                <div class="day-temp">${Math.round(d.tmin)}° / ${Math.round(d.tmax)}°</div>
                <div class="day-desc"><span>${this.codeToDesc(d.code)}</span><img class="wx-icon wx-icon-day" src="${this.codeToIcon(d.code)}" alt=""></div>
            </div>
        `).join('');
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
