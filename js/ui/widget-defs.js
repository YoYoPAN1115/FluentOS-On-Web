/**
 * Widget definitions (WidgetDefs)
 *
 * This file centralizes widget apps for desktop, lock screen,
 * and other widget surfaces, including each app's variants.
 *
 * Shape: { id, nameKey, descKey, icon, recommend: [variantId...], variants: [...] }
 *
 * Common variant fields:
 *   {
 *     id,                  // Unique variant ID and base for widgetId
 *     w, h,                // Grid width and height
 *     sizeKey,             // i18n key for the size label
 *     theme,               // Theme class on the widget, for example w-xxx
 *     defaultSettings?,    // Default settings
 *     render(body, ctx),   // Render function; ctx: { instance, surface, isPreview, setSettings() }
 *     onClick?(ctx),       // Click handler
 *     getMenu?(ctx)        // Context menu items: [{ label, action }]
 *   }
 *
 * Data sources:
 *   - Weather: Open-Meteo; Weather App provides icon and description mapping
 *   - Bing daily image: Photos App cache or local fallback; click opens Photos App
 *   - Lunar, tracking, holidays, answer book, daily word, and more: uapis.cn
 */

/* ==================== Utilities ==================== */

/** Cache async widget data with TTL and shared in-flight requests. */
const WidgetData = {
    _cache: {},

    async get(key, ttlMs, fetcher) {
        const c = this._cache[key];
        const now = Date.now();
        if (c && c.value !== undefined && now - c.time < ttlMs) return c.value;
        if (c && c.promise) return c.promise;
        const promise = Promise.resolve().then(fetcher);
        this._cache[key] = { promise, time: 0 };
        try {
            const value = await promise;
            this._cache[key] = { value, time: Date.now() };
            return value;
        } catch (err) {
            delete this._cache[key];
            throw err;
        }
    },

    async getJSON(key, ttlMs, url) {
        return this.get(key, ttlMs, async () => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        });
    }
};

const W_UAPIS_ORIGIN = 'https://uapis.cn';

function wUapisUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    return `${W_UAPIS_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

function wProxyUrls(url) {
    return [
        `https://r.jina.ai/http://${url}`
    ];
}

function wJsonFromText(text) {
    const raw = String(text || '').trim();
    if (!raw) throw new Error('Empty response');
    try {
        const wrapped = JSON.parse(raw);
        if (wrapped && typeof wrapped.contents === 'string') {
            return wJsonFromText(wrapped.contents);
        }
        return wrapped;
    } catch (_) {
        let source = raw;
        const marker = 'Markdown Content:';
        const markerIndex = source.indexOf(marker);
        if (markerIndex >= 0) source = source.slice(markerIndex + marker.length).trim();

        const firstObject = source.indexOf('{');
        const firstArray = source.indexOf('[');
        let start = -1;
        if (firstObject >= 0 && firstArray >= 0) start = Math.min(firstObject, firstArray);
        else start = Math.max(firstObject, firstArray);
        if (start < 0) throw new Error('Invalid JSON response');

        const endObject = source.lastIndexOf('}');
        const endArray = source.lastIndexOf(']');
        const end = Math.max(endObject, endArray);
        if (end < start) throw new Error('Invalid JSON response');
        return JSON.parse(source.slice(start, end + 1));
    }
}

async function wFetchText(url) {
    const res = await fetch(url, {
        cache: 'no-store',
        headers: { Accept: 'application/json,text/plain,*/*' }
    });
    const text = await res.text();
    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
            const json = wJsonFromText(text);
            msg = json.message || json.error || msg;
        } catch (_) { /* keep the HTTP status */ }
        throw new Error(msg);
    }
    return text;
}

async function wFetchUapisJSON(path) {
    const url = wUapisUrl(path);
    const urls = [url, ...wProxyUrls(url)];
    let lastErr = null;
    for (const candidate of urls) {
        try {
            return wJsonFromText(await wFetchText(candidate));
        } catch (err) {
            lastErr = err;
        }
    }
    throw lastErr || new Error('Uapis request failed');
}

/** Escape text for HTML output. */
function wEsc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function wUiText(zh, en) {
    return (typeof I18n !== 'undefined' && I18n.currentLang === 'en') ? en : zh;
}

/** Run an interval tied to an element lifecycle; stop when the element leaves the DOM. */
function wTick(el, ms, fn) {
    if (el._wTickId) clearInterval(el._wTickId);
    fn();
    const id = setInterval(() => {
        if (!el.isConnected) {
            clearInterval(id);
            if (el._wTickId === id) el._wTickId = null;
            return;
        }
        fn();
    }, ms);
    el._wTickId = id;
}

/** Async render wrapper: show loading first, then show an error state on failure. */
async function wAsync(body, fn) {
    body.innerHTML = `<div class="w-loading">${t('widgets.loading')}</div>`;
    try {
        await fn();
    } catch (err) {
        console.warn('[Widgets] render failed', err);
        if (body.isConnected) {
            body.innerHTML = `<div class="w-loading">${t('widgets.error')}</div>`;
        }
    }
}

/** Open the browser app on desktop and navigate to the provided input or URL. */
function wOpenInBrowser(input, ctx) {
    if (ctx.isPreview || ctx.surface !== 'desktop') return;
    if (typeof Widgets !== 'undefined' && Widgets.isOpen) return;
    WindowManager.openApp('browser');
    setTimeout(() => {
        if (window.BrowserApp && typeof BrowserApp.navigate === 'function') {
            BrowserApp.navigate(input);
        }
    }, 450);
}

/** Disable widget interaction while previewing or while the widget panel is open. */
function wClickable(ctx) {
    if (ctx.isPreview) return false;
    if (typeof Widgets !== 'undefined' && Widgets.isOpen) return false;
    return true;
}

/** Get the current time for a specific timezone. */
function wTzNow(tz) {
    try {
        return new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
    } catch (_) {
        return new Date();
    }
}

function wPad(n) { return String(n).padStart(2, '0'); }

function wWeekday(d) {
    const keys = ['common.sunday', 'common.monday', 'common.tuesday', 'common.wednesday', 'common.thursday', 'common.friday', 'common.saturday'];
    const fallbackZh = ['\u661f\u671f\u65e5', '\u661f\u671f\u4e00', '\u661f\u671f\u4e8c', '\u661f\u671f\u4e09', '\u661f\u671f\u56db', '\u661f\u671f\u4e94', '\u661f\u671f\u516d'];
    const fallbackEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const v = t(keys[d.getDay()]);
    if (v && v !== keys[d.getDay()]) return v;
    const lang = (typeof I18n !== 'undefined' && I18n.currentLang === 'en') ? fallbackEn : fallbackZh;
    return lang[d.getDay()];
}

/* ==================== Weather ==================== */

/** Convert WMO weather code to an icon path; prefer Weather App mappings. */
function wWeatherIconPath(code) {
    if (window.WeatherApp && typeof WeatherApp.codeToIcon === 'function') {
        return WeatherApp.codeToIcon(code);
    }
    return 'Theme/Icon/Symbol_icon/weather/cloud-64px.svg';
}

function wWeatherIconImg(code, cls = '') {
    return `<img class="w-weather-icon${cls ? ' ' + cls : ''}" src="${wWeatherIconPath(code)}" alt="">`;
}

function wWeatherLocations() {
    if (window.WeatherApp && WeatherApp.locations) return WeatherApp.locations;
    return { beijing: { nameKey: 'weather.beijing', lat: 39.9042, lon: 116.4074 } };
}

function wWeatherDesc(code) {
    if (window.WeatherApp && typeof WeatherApp.codeToDesc === 'function') {
        return WeatherApp.codeToDesc(code);
    }
    return '';
}

/** Cache widget weather data for one hour. */
const W_WEATHER_WIDGET_TTL = 60 * 60 * 1000;

async function wFetchWeather(cityKey) {
    const locs = wWeatherLocations();
    const loc = locs[cityKey] || locs.beijing;
    // Prefer the Weather App cache so the widget and the app do not fetch duplicate data.
    // Weather App updates can emit weatherDataUpdate, which Widgets may use to refresh.
    if (window.WeatherApp && typeof WeatherApp.getWeather === 'function') {
        return WeatherApp.getWeather(loc.lat, loc.lon, W_WEATHER_WIDGET_TTL);
    }
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current_weather=true&hourly=relativehumidity_2m,windspeed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`;
    return WidgetData.getJSON(`weather-${cityKey}`, W_WEATHER_WIDGET_TTL, url);
}

function wWeatherCity(ctx) {
    return (ctx.instance && ctx.instance.settings && ctx.instance.settings.city) || 'beijing';
}

function wWeatherCityName(cityKey) {
    const loc = wWeatherLocations()[cityKey];
    return loc ? t(loc.nameKey) : t('weather.beijing');
}

function wWeatherNum(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : fallback;
}

function wWeatherIsZh() {
    return !(typeof I18n !== 'undefined' && I18n.currentLang === 'en');
}

function wWeatherText(key) {
    const zh = wWeatherIsZh();
    const map = {
        high: zh ? '\u6700\u9ad8' : 'High',
        low: zh ? '\u6700\u4f4e' : 'Low',
        windSpeed: zh ? '\u98ce\u901f' : 'Wind Speed'
    };
    return map[key] || key;
}

function wWeatherDayName(dateInput, mode = 'full') {
    const d = new Date(dateInput);
    const idx = Number.isNaN(d.getTime()) ? new Date().getDay() : d.getDay();
    const full = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const localized = String(t('weather.weekdays') || '').split(',');
    const local = localized[idx] && localized.length >= 7 ? localized[idx] : full[idx];
    if (wWeatherIsZh()) return local;
    if (mode === 'compact') return full[idx].slice(0, 3);
    if (mode === 'short') return full[idx].slice(0, 3).toUpperCase();
    return full[idx];
}

function wWeatherPlace(cityKey) {
    const loc = wWeatherLocations()[cityKey];
    if (!loc) return wWeatherCityName(cityKey);
    const name = loc.name || t(loc.nameKey);
    const country = String(loc.country || '').trim();
    if (country && name) return `${country},${name}`;
    return name || wWeatherCityName(cityKey);
}

function wWeatherMainVisual(code) {
    return `
        <div class="w-weather-visual" aria-hidden="true">
            ${wWeatherIconImg(code, 'w-weather-main-icon')}
        </div>`;
}

function wWeatherLocationLine(place) {
    return `
        <div class="w-weather-location">
            <span class="w-weather-pin" aria-hidden="true"></span>
            <span>${wEsc(place)}</span>
        </div>`;
}

function wWeatherMetaBlock(wind, humidity) {
    return `
        <div class="w-weather-meta">
            <div class="w-weather-meta-row">
                <img class="w-weather-meta-icon w-weather-icon" src="Theme/Icon/Symbol_icon/weather/wind-64px.svg" alt="">
                <span>${wind} km/h</span>
            </div>
            <div class="w-weather-meta-row">
                <img class="w-weather-meta-icon w-weather-icon" src="Theme/Icon/Symbol_icon/weather/droplets-64px.svg" alt="">
                <span>${humidity}%</span>
            </div>
        </div>`;
}

function wWeatherHighLow(hi, lo) {
    return `
        <div class="w-weather-hi-lo">
            <div><span>H</span><b>${hi}&deg;</b></div>
            <div><span>L</span><b>${lo}&deg;</b></div>
        </div>`;
}

function wWeatherHumidityGauge(humidity) {
    const pct = Math.max(8, Math.min(96, wWeatherNum(humidity, 42)));
    return `
        <div class="w-weather-humidity">
            <svg class="w-weather-humidity-ring" viewBox="0 0 92 92" aria-hidden="true" focusable="false">
                <path class="w-weather-humidity-track" pathLength="100" d="M 21 72 A 38 38 0 1 1 71 72"></path>
                <path class="w-weather-humidity-progress" pathLength="100" d="M 21 72 A 38 38 0 1 1 71 72" style="stroke-dasharray: ${pct} 100"></path>
            </svg>
            <img class="w-weather-humidity-icon w-weather-icon" src="Theme/Icon/Symbol_icon/weather/droplets-64px.svg" alt="">
            <div class="w-weather-humidity-value">${humidity}%</div>
        </div>`;
}

function wRenderWeather(body, ctx, size) {
    const city = wWeatherCity(ctx);
    wAsync(body, async () => {
        const data = await wFetchWeather(city);
        if (!body.isConnected) return;

        const cur = data.current_weather || {};
        const daily = data.daily || {};
        const hourly = data.hourly || {};
        const code = cur.weathercode ?? daily.weathercode?.[0];
        const temp = wWeatherNum(cur.temperature, 26);
        const hi = wWeatherNum(daily.temperature_2m_max?.[0], 30);
        const lo = wWeatherNum(daily.temperature_2m_min?.[0], 20);
        const wind = wWeatherNum(cur.windspeed ?? hourly.windspeed_10m?.[0], 28);
        const humidity = wWeatherNum(hourly.relativehumidity_2m?.[0], 42);
        const currentDate = cur.time || daily.time?.[0] || new Date().toISOString();
        const place = wWeatherPlace(city);

        const days = (daily.time || []).slice(1, 8).map((dateStr, i) => {
            const idx = i + 1;
            return {
                label: wWeatherDayName(dateStr, 'short'),
                code: daily.weathercode?.[idx],
                hi: wWeatherNum(daily.temperature_2m_max?.[idx], hi),
                lo: wWeatherNum(daily.temperature_2m_min?.[idx], lo)
            };
        });

        if (size === 's') {
            body.innerHTML = `
                <div class="w-weather-card w-weather-card-s">
                    <div class="w-weather-day-title">${wWeatherDayName(currentDate, 'compact')}</div>
                    <div class="w-weather-temp">${temp}<span>&deg;</span></div>
                    <div class="w-weather-range">${lo}&deg;/${hi}&deg;</div>
                    ${wWeatherMainVisual(code)}
                </div>`;
            return;
        }

        if (size === 'm') {
            body.innerHTML = `
                <div class="w-weather-card w-weather-card-m">
                    <div class="w-weather-day-title">${wWeatherDayName(currentDate)}</div>
                    <div class="w-weather-temp">${temp}<span>&deg;</span></div>
                    ${wWeatherMetaBlock(wind, humidity)}
                    ${wWeatherHighLow(hi, lo)}
                    ${wWeatherLocationLine(place)}
                    ${wWeatherMainVisual(code)}
                </div>`;
            return;
        }

        body.innerHTML = `
            <div class="w-weather-card w-weather-card-l">
                <div class="w-weather-day-title">${wWeatherDayName(currentDate)}</div>
                <div class="w-weather-temp">${temp}<span>&deg;</span></div>
                ${wWeatherMainVisual(code)}
                <div class="w-weather-extremes">
                    <div><span>${wWeatherText('high')}</span><b>${hi}&deg;</b></div>
                    <div><span>${wWeatherText('low')}</span><b>${lo}&deg;</b></div>
                </div>
                ${wWeatherHumidityGauge(humidity)}
                <div class="w-weather-forecast">
                    ${days.map(d => `
                        <div class="w-weather-forecast-day">
                            <div class="w-weather-forecast-label">${d.label}</div>
                            ${wWeatherIconImg(d.code, 'w-wd-icon')}
                        </div>`).join('')}
                </div>
                <div class="w-weather-footer">
                    ${wWeatherLocationLine(place)}
                    <div class="w-weather-wind-footer">
                        <img class="w-weather-footer-icon w-weather-icon" src="Theme/Icon/Symbol_icon/weather/wind-64px.svg" alt="">
                        <span>${wWeatherText('windSpeed')}&nbsp; ${wind} km/h</span>
                    </div>
                </div>
            </div>`;
    });
}

function wWeatherClick(ctx) {
    const city = wWeatherCity(ctx);
    WindowManager.openApp('weather', { city });
}

function wWeatherMenu(ctx) {
    if (!ctx.instance) return null;
    const cur = wWeatherCity(ctx);
    return Object.entries(wWeatherLocations()).map(([key, loc]) => ({
        label: t(loc.nameKey),
        checked: key === cur,
        action: () => ctx.setSettings({ city: key })
    }));
}

/* ==================== Clock ==================== */

function wRenderWeatherEditor(container, ctx) {
    const cur = wWeatherCity(ctx);
    container.innerHTML = `
        <div class="widget-edit-panel">
            <div class="widget-edit-head">
                <img src="Theme/Icon/Symbol_icon/stroke/Sun.svg" alt="">
                <div>
                    <div class="widget-edit-title">${wUiText('\u5929\u6c14\u5730\u70b9', 'Weather Location')}</div>
                    <div class="widget-edit-subtitle">${wUiText('\u9009\u62e9\u5929\u6c14\u5c0f\u7ec4\u4ef6\u663e\u793a\u7684\u57ce\u5e02\u3002', 'Choose the city shown in the weather widget.')}</div>
                </div>
            </div>
            <div class="widget-edit-options">
                ${Object.entries(wWeatherLocations()).map(([key, loc]) => `
                    <button class="widget-edit-option ${key === cur ? 'selected' : ''}" data-city="${key}" type="button">
                        <span>${wEsc(t(loc.nameKey))}</span>
                        <img src="Theme/Icon/Symbol_icon/stroke/Check.svg" alt="">
                    </button>
                `).join('')}
            </div>
        </div>`;
    container.querySelectorAll('[data-city]').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.widget-edit-option').forEach(item => item.classList.remove('selected'));
            btn.classList.add('selected');
            ctx.setSettings({ city: btn.dataset.city }, { silent: true });
        });
    });
}

function wBuildClockFace(size) {
    let ticks = '';
    for (let i = 0; i < 12; i++) {
        ticks += `<div class="w-clock-tick${i % 3 === 0 ? ' major' : ''}" style="transform: rotate(${i * 30}deg)"></div>`;
    }
    return `
        <div class="w-clock-face ${size}">
            ${ticks}
            <div class="w-clock-hand hour"></div>
            <div class="w-clock-hand min"></div>
            <div class="w-clock-hand sec"></div>
            <div class="w-clock-pin"></div>
        </div>`;
}

function wUpdateClockFace(faceEl, date) {
    if (!faceEl) return;
    const h = date.getHours() % 12;
    const m = date.getMinutes();
    const s = date.getSeconds();
    const hourEl = faceEl.querySelector('.w-clock-hand.hour');
    const minEl = faceEl.querySelector('.w-clock-hand.min');
    const secEl = faceEl.querySelector('.w-clock-hand.sec');
    if (hourEl) hourEl.style.transform = `translateX(-50%) rotate(${h * 30 + m * 0.5}deg)`;
    if (minEl) minEl.style.transform = `translateX(-50%) rotate(${m * 6 + s * 0.1}deg)`;
    if (secEl) secEl.style.transform = `translateX(-50%) rotate(${s * 6}deg)`;
}

function wRenderClockAnalog(body) {
    body.innerHTML = `
        <div class="w-clock-analog">
            ${wBuildClockFace('lg')}
        </div>`;
    const face = body.querySelector('.w-clock-face');
    wTick(body, 1000, () => wUpdateClockFace(face, new Date()));
}

function wRenderClockDigital(body) {
    body.innerHTML = `
        <div class="w-clock-digital">
            <div class="w-clock-time"><span class="hm">--:--</span><span class="ss">--</span></div>
            <div class="w-clock-date">--</div>
        </div>`;
    const hmEl = body.querySelector('.hm');
    const ssEl = body.querySelector('.ss');
    const dateEl = body.querySelector('.w-clock-date');
    wTick(body, 1000, () => {
        const now = new Date();
        hmEl.textContent = `${wPad(now.getHours())}:${wPad(now.getMinutes())}`;
        ssEl.textContent = wPad(now.getSeconds());
        dateEl.textContent = `${now.getMonth() + 1}/${now.getDate()} ${wWeekday(now)}`;
    });
}

const W_WORLD_CITIES = [
    { nameKey: 'clock.city-beijing', tz: 'Asia/Shanghai' },
    { nameKey: 'clock.city-newyork', tz: 'America/New_York' },
    { nameKey: 'clock.city-london', tz: 'Europe/London' }
];

function wRenderClockWorld(body) {
    body.innerHTML = `
        <div class="w-clock-world">
            ${W_WORLD_CITIES.map((c, i) => `
                <div class="w-clock-mini" data-idx="${i}">
                    ${wBuildClockFace('sm')}
                    <div class="w-clock-mini-name">${wEsc(t(c.nameKey))}</div>
                    <div class="w-clock-mini-time">--:--</div>
                </div>`).join('')}
        </div>`;
    const minis = body.querySelectorAll('.w-clock-mini');
    wTick(body, 1000, () => {
        minis.forEach((mini, i) => {
            const d = wTzNow(W_WORLD_CITIES[i].tz);
            wUpdateClockFace(mini.querySelector('.w-clock-face'), d);
            mini.querySelector('.w-clock-mini-time').textContent = `${wPad(d.getHours())}:${wPad(d.getMinutes())}`;
        });
    });
}

/* ==================== Calendar ==================== */

const W_CAL_MONTHS_EN = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
const W_CAL_MONTHS_EN_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
const W_CAL_WEEK_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const W_CAL_WEEK_EN_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const W_CAL_WEEK_ZH = ['\u5468\u65e5', '\u5468\u4e00', '\u5468\u4e8c', '\u5468\u4e09', '\u5468\u56db', '\u5468\u4e94', '\u5468\u516d'];

function wCalendarIsEn() {
    return typeof I18n !== 'undefined' && I18n.currentLang === 'en';
}

function wCalendarMonth(date, mode = 'long') {
    const month = date.getMonth();
    if (wCalendarIsEn()) {
        return mode === 'short' ? W_CAL_MONTHS_EN_SHORT[month] : W_CAL_MONTHS_EN[month];
    }
    return `${month + 1}\u6708`;
}

function wCalendarMonthYearCompact(date) {
    const month = wPad(date.getMonth() + 1);
    const year = date.getFullYear();
    return wCalendarIsEn() ? `${month}.${year}` : `${year}.${month}`;
}

function wCalendarWeekday(date, mode = 'short') {
    const day = date.getDay();
    if (wCalendarIsEn()) {
        const label = W_CAL_WEEK_EN[day];
        if (mode === 'dot') return `${label}.`;
        if (mode === 'split') return `${label} Day`;
        return label;
    }
    return W_CAL_WEEK_ZH[day];
}

function wCalendarDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function wCalendarNextMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function wCalendarSameMonth(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function wCalendarRange(start, end) {
    const days = [];
    for (let day = start; day <= end; day += 1) days.push(day);
    return days;
}

function wCalendarNearbyDays(date) {
    const total = wCalendarDaysInMonth(date);
    const today = date.getDate();
    const count = 15;
    const start = Math.max(1, Math.min(today - 7, Math.max(1, total - count + 1)));
    return wCalendarRange(start, Math.min(total, start + count - 1));
}

function wCalendarDayCell(day, today) {
    const classes = ['w-calendar-day-cell'];
    if (day === today) classes.push('is-today');
    return `<div class="${classes.join(' ')}">${day}</div>`;
}

function wCalendarLocation() {
    const current = t('weather.current-location');
    if (current && current !== 'weather.current-location') return current;
    return wCalendarIsEn() ? 'Current location' : '\u5f53\u524d\u4f4d\u7f6e';
}

function wCalendarLocationMarkup() {
    return `
        <div class="w-calendar-location">
            <span class="w-calendar-pin" aria-hidden="true"></span>
            <span>${wEsc(wCalendarLocation())}</span>
        </div>`;
}

function wCalendarNavButton(direction) {
    const label = direction < 0
        ? (wCalendarIsEn() ? 'Previous month' : '\u4e0a\u4e00\u6708')
        : (wCalendarIsEn() ? 'Next month' : '\u4e0b\u4e00\u6708');
    return `<button class="w-calendar-nav-btn" type="button" data-cal-nav="${direction}" aria-label="${wEsc(label)}">${direction < 0 ? '\u2039' : '\u203a'}</button>`;
}

function wCalendarBindMonthNav(body, onShift) {
    body.querySelectorAll('[data-cal-nav]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            onShift(Number(btn.dataset.calNav) || 0);
        });
    });
}

function wCalendarDateKey(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${wPad(date.getMonth() + 1)}-${wPad(date.getDate())}`;
}

function wCalendarAddDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function wCalendarClockEvents() {
    let data = {};
    try {
        data = (typeof Storage !== 'undefined')
            ? Storage.get('clock_data', {})
            : JSON.parse(localStorage.getItem('clock_data') || '{}');
    } catch (_) {
        data = {};
    }
    return (Array.isArray(data.events) ? data.events : [])
        .map(event => ({ ...event, _date: new Date(event.date) }))
        .filter(event => !Number.isNaN(event._date.getTime()))
        .sort((a, b) => {
            const dateDiff = a._date - b._date;
            if (dateDiff) return dateDiff;
            return String(a.time || '').localeCompare(String(b.time || ''));
        });
}

function wCalendarEventsForDate(date, events = wCalendarClockEvents()) {
    const key = wCalendarDateKey(date);
    return events.filter(event => wCalendarDateKey(event._date) === key);
}

function wCalendarReminderWeekday(date) {
    return wCalendarIsEn() ? W_CAL_WEEK_EN_FULL[date.getDay()].toUpperCase() : W_CAL_WEEK_ZH[date.getDay()];
}

function wCalendarReminderDateLabel(date) {
    if (wCalendarIsEn()) {
        return `${W_CAL_WEEK_EN_FULL[date.getDay()].toUpperCase()}, ${W_CAL_MONTHS_EN_SHORT[date.getMonth()].toUpperCase()} ${date.getDate()}`;
    }
    return `${W_CAL_WEEK_ZH[date.getDay()]} ${date.getMonth() + 1}\u6708${date.getDate()}\u65e5`;
}

function wCalendarNoEventsText(date, today) {
    if (wCalendarDateKey(date) === wCalendarDateKey(today)) {
        return wCalendarIsEn() ? 'No Events Today' : '\u4eca\u5929\u6ca1\u6709\u63d0\u9192\u4e8b\u9879';
    }
    return wCalendarIsEn() ? 'No Events' : '\u6682\u65e0\u63d0\u9192\u4e8b\u9879';
}

function wCalendarEventMarkup(events, limit = 3, compact = false) {
    return events.slice(0, limit).map(event => `
        <div class="w-calendar-event-row ${compact ? 'is-compact' : ''}">
            <span class="w-calendar-event-dot"></span>
            ${compact
                ? `<span class="w-calendar-event-title">${wEsc(`${event.time || '--:--'} ${event.title || ''}`)}</span>`
                : `
                    <span class="w-calendar-event-time">${wEsc(event.time || '--:--')}</span>
                    <span class="w-calendar-event-title">${wEsc(event.title || '')}</span>
                `}
        </div>
    `).join('');
}

function wCalendarEventDensityClass(count) {
    if (count > 5) return 'is-packed-events';
    if (count > 2) return 'is-dense-events';
    return '';
}

function wCalendarEventsAtHour(events, hour) {
    return events.filter(event => wCalendarEventHour(event) === hour);
}

function wCalendarPeriodLabel(period) {
    if (period === 'am') return wCalendarIsEn() ? 'AM' : '\u4e0a\u5348';
    return wCalendarIsEn() ? 'PM' : '\u4e0b\u5348';
}

function wCalendarPeriodEmptyText() {
    return wCalendarIsEn() ? 'None' : '\u6682\u65e0';
}

function wCalendarEventsForPeriod(events, period) {
    return events.filter(event => {
        const hour = wCalendarEventHour(event);
        if (hour === null) return period === 'am';
        return period === 'am' ? hour < 12 : hour >= 12;
    });
}

function wCalendarPeriodColumn(events, period) {
    const periodEvents = wCalendarEventsForPeriod(events, period);
    return `
        <div class="w-calendar-event-period">
            <div class="w-calendar-event-period-title">${wEsc(wCalendarPeriodLabel(period))}</div>
            <div class="w-calendar-event-period-list ${periodEvents.length ? '' : 'is-empty'}">
                ${periodEvents.length ? wCalendarEventMarkup(periodEvents, 20, true) : wEsc(wCalendarPeriodEmptyText())}
            </div>
        </div>`;
}

function wCalendarEventHour(event) {
    const match = String(event?.time || '').match(/^(\d{1,2}):/);
    if (!match) return null;
    const hour = Number(match[1]);
    return Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : null;
}

function wCalendarAgendaHoursForDate(events, now, isToday = false) {
    const eventHours = events
        .map(wCalendarEventHour)
        .filter(hour => hour !== null);
    const baseHours = isToday
        ? wCalendarRange(now.getHours(), Math.min(23, now.getHours() + 4))
        : wCalendarRange(9, 16);
    return Array.from(new Set([...baseHours, ...eventHours]))
        .sort((a, b) => a - b);
}

function wCalendarAgendaColumn(date, events, hours, title, isToday = false) {
    const now = new Date();
    return `
        <div class="w-calendar-agenda-column">
            <div class="w-calendar-agenda-title">${wEsc(title)}</div>
            <div class="w-calendar-agenda-rows">
                ${hours.map(hour => {
                    const hourEvents = wCalendarEventsAtHour(events, hour);
                    const showNow = isToday && hour === now.getHours();
                    const nowOffset = showNow ? Math.max(4, Math.min(96, (now.getMinutes() / 60) * 100)) : 0;
                    return `
                        <div class="w-calendar-agenda-row${showNow ? ' is-now' : ''}"${showNow ? ` style="--calendar-now-offset:${nowOffset.toFixed(1)}%;"` : ''}>
                            <span class="w-calendar-agenda-hour">${wPad(hour)}</span>
                            <span class="w-calendar-agenda-line"></span>
                            <div class="w-calendar-agenda-events">
                                ${hourEvents.map(event => {
                                    const titleText = event.time ? `${event.time} ${event.title || ''}` : (event.title || '');
                                    return `<span>${wEsc(titleText)}</span>`;
                                }).join('')}
                            </div>
                        </div>`;
                }).join('')}
            </div>
        </div>`;
}

function wRenderCalendarEvents(body, ctx, size) {
    const update = () => {
        const today = new Date();
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const events = wCalendarClockEvents();
        const todayEvents = wCalendarEventsForDate(todayDate, events);

        if (size === 's') {
            const density = wCalendarEventDensityClass(todayEvents.length);
            body.innerHTML = `
                <div class="w-calendar-event-card w-calendar-event-card-s ${density}">
                    <div class="w-calendar-event-weekday">${wEsc(wCalendarReminderWeekday(todayDate))}</div>
                    <div class="w-calendar-event-day">${todayDate.getDate()}</div>
                    <div class="w-calendar-event-empty ${todayEvents.length ? 'has-events' : ''}">
                        ${todayEvents.length ? wCalendarEventMarkup(todayEvents, 20, true) : wEsc(wCalendarNoEventsText(todayDate, todayDate))}
                    </div>
                </div>`;
            return;
        }

        if (size === 'm') {
            const density = wCalendarEventDensityClass(todayEvents.length);
            body.innerHTML = `
                <div class="w-calendar-event-card w-calendar-event-card-m ${density}">
                    <div class="w-calendar-event-today">
                        <div class="w-calendar-event-weekday">${wEsc(wCalendarReminderWeekday(todayDate))}</div>
                        <div class="w-calendar-event-day">${todayDate.getDate()}</div>
                    </div>
                    <div class="w-calendar-event-next w-calendar-event-content">
                        <div class="w-calendar-event-next-title">${wEsc(wCalendarIsEn() ? 'TODAY' : '\u4eca\u5929')}</div>
                        <div class="w-calendar-event-periods">
                            ${wCalendarPeriodColumn(todayEvents, 'am')}
                            ${wCalendarPeriodColumn(todayEvents, 'pm')}
                        </div>
                    </div>
                </div>`;
            return;
        }

        const tomorrow = wCalendarAddDays(todayDate, 1);
        const tomorrowEvents = wCalendarEventsForDate(tomorrow, events);
        const todayHours = wCalendarAgendaHoursForDate(todayEvents, today, true);
        const tomorrowHours = wCalendarAgendaHoursForDate(tomorrowEvents, today, false);
        const density = wCalendarEventDensityClass(todayEvents.length + tomorrowEvents.length + Math.max(0, todayHours.length - 5) + Math.max(0, tomorrowHours.length - 8));
        body.innerHTML = `
            <div class="w-calendar-event-card w-calendar-event-card-l ${density}">
                <div class="w-calendar-event-large-head">
                    <div>
                        <div class="w-calendar-event-weekday">${wEsc(wCalendarReminderWeekday(todayDate))}</div>
                        <div class="w-calendar-event-day">${todayDate.getDate()}</div>
                    </div>
                    <div class="w-calendar-event-large-count">${wEsc(todayEvents.length ? t('widgets.calendar.count', { n: todayEvents.length }) : wCalendarNoEventsText(todayDate, todayDate))}</div>
                </div>
                <div class="w-calendar-agenda-grid">
                    ${wCalendarAgendaColumn(todayDate, todayEvents, todayHours, wCalendarIsEn() ? 'TODAY' : '\u4eca\u5929', true)}
                    ${wCalendarAgendaColumn(tomorrow, tomorrowEvents, tomorrowHours, wCalendarIsEn() ? 'TOMORROW' : '\u660e\u5929')}
                </div>
            </div>`;
    };
    wTick(body, 60 * 1000, update);
}

function wRenderCalendar(body, ctx, size) {
    let viewDate = null;
    const shiftMonth = (delta) => {
        if (!delta) return;
        const base = viewDate || new Date();
        viewDate = new Date(base.getFullYear(), base.getMonth() + delta, 1);
        update();
    };
    const update = () => {
        const now = new Date();
        if (!viewDate) viewDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const displayDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        const isCurrentMonth = wCalendarSameMonth(displayDate, now);
        const today = isCurrentMonth ? now.getDate() : null;
        const year = displayDate.getFullYear();
        const days = wCalendarRange(1, wCalendarDaysInMonth(displayDate));
        const nextMonth = wCalendarMonth(wCalendarNextMonth(displayDate), 'long');
        const smallHeader = `${wCalendarWeekday(now, 'dot')} ${wCalendarMonth(now, 'short')} ${now.getFullYear()}`;

        if (size === 's') {
            body.innerHTML = `
                <div class="w-calendar-card w-calendar-card-s">
                    <div class="w-calendar-small-nav">
                        <span aria-hidden="true">\u2039</span>
                        <strong>${wEsc(smallHeader)}</strong>
                        <span aria-hidden="true">\u203a</span>
                    </div>
                    <div class="w-calendar-small-grid">
                        ${wCalendarNearbyDays(now).map(day => wCalendarDayCell(day, today)).join('')}
                    </div>
                </div>`;
            return;
        }

        if (size === 'm') {
            body.innerHTML = `
                <div class="w-calendar-card w-calendar-card-m">
                    <div class="w-calendar-medium-main">
                        <div class="w-calendar-medium-nav">
                            ${wCalendarNavButton(-1)}
                            <strong>${wEsc(wCalendarMonthYearCompact(displayDate))}</strong>
                            ${wCalendarNavButton(1)}
                        </div>
                        <div class="w-calendar-medium-week">${wEsc(wCalendarWeekday(now, 'split'))}</div>
                        <div class="w-calendar-medium-date">${now.getDate()}</div>
                    </div>
                    <div class="w-calendar-medium-month">
                        <div class="w-calendar-month-grid w-calendar-month-grid-m">
                            <div class="w-calendar-range-pill" aria-hidden="true"></div>
                            ${days.map(day => wCalendarDayCell(day, today)).join('')}
                            <div class="w-calendar-next-pill">${wEsc(nextMonth)}</div>
                        </div>
                    </div>
                </div>`;
            wCalendarBindMonthNav(body, shiftMonth);
            return;
        }

        body.innerHTML = `
            <div class="w-calendar-card w-calendar-card-l">
                <div class="w-calendar-large-head">
                    <div class="w-calendar-large-date">${today}</div>
                    <div class="w-calendar-large-meta">
                        <strong>${wEsc(wCalendarWeekday(now, 'split'))}</strong>
                        <span>${wEsc(wCalendarMonth(displayDate, 'long'))}</span>
                    </div>
                    <div class="w-calendar-large-year">${year}</div>
                </div>
                <div class="w-calendar-large-body">
                    <div class="w-calendar-month-grid w-calendar-month-grid-l">
                        <div class="w-calendar-month-chip">${wEsc(wCalendarMonth(displayDate, 'long'))}</div>
                        ${days.map(day => wCalendarDayCell(day, today)).join('')}
                        <div class="w-calendar-next-pill">${wEsc(nextMonth)}</div>
                    </div>
                </div>
            </div>`;
    };
    wTick(body, 60 * 1000, update);
}

/* ==================== Photos: Bing Daily Image ==================== */

const W_PHOTO_FALLBACK_IMAGE = 'Theme/Picture/Fluent-2.png';
const W_BING_CACHE_KEY = 'fluentos.photos.bingCache.v1';
const W_BING_REFRESH_TTL = 30 * 60 * 1000;
let wBingRefreshPromise = null;
let wBingLastRefreshAt = 0;

function wNormalizeBingImage(data) {
    const item = data && Array.isArray(data.images) ? data.images[0] : data;
    if (!item) throw new Error('Missing Bing image');
    const rawUrl = item.url || item.fullstartdate || item.urlbase;
    const url = item.url
        ? (/^https?:\/\//i.test(item.url) ? item.url : (String(item.url).startsWith('/') ? `https://www.bing.com${item.url}` : item.url))
        : (item.urlbase ? `https://www.bing.com${item.urlbase}_1920x1080.jpg` : rawUrl);
    if (!url) throw new Error('Missing Bing image URL');
    const urlHD = item.urlbase ? `https://www.bing.com${item.urlbase}_UHD.jpg` : String(url).replace(/1920x1080/g, 'UHD');
    return {
        ...item,
        url,
        urlHD,
        copyright: item.copyright || item.title || '',
        copyright_link: item.copyrightlink || item.copyright_link || '',
        start_date: item.startdate || item.start_date || item.enddate || ''
    };
}

function wReadBingCache() {
    if (window.PhotosDataStore && typeof PhotosDataStore.readBingCache === 'function') {
        return PhotosDataStore.readBingCache();
    }
    try {
        const data = JSON.parse(localStorage.getItem(W_BING_CACHE_KEY) || '{}');
        return Array.isArray(data.images) ? data.images : [];
    } catch (_) {
        return [];
    }
}

function wWriteBingCache(images) {
    if (window.PhotosDataStore && typeof PhotosDataStore.writeBingCache === 'function') {
        PhotosDataStore.writeBingCache(images);
        return;
    }
    try {
        localStorage.setItem(W_BING_CACHE_KEY, JSON.stringify({ images, time: Date.now() }));
    } catch (_) {}
}

function wBingFallbackImage() {
    const dateKey = new Date().toISOString().slice(0, 10);
    return wNormalizeBingImage({
        url: W_PHOTO_FALLBACK_IMAGE,
        copyright: wUiText('Fluent OS \u58c1\u7eb8', 'Fluent OS wallpaper'),
        title: wUiText('Fluent OS \u58c1\u7eb8', 'Fluent OS wallpaper'),
        startdate: dateKey.replace(/-/g, '')
    });
}

function wGetCachedBingImage() {
    const cached = wReadBingCache();
    if (!Array.isArray(cached) || !cached.length) return null;
    try {
        return wNormalizeBingImage(cached[0]);
    } catch (_) {
        return null;
    }
}

function wGetBingDisplayImage() {
    return wGetCachedBingImage() || wBingFallbackImage();
}

function wSameBingImage(a, b) {
    if (!a || !b) return false;
    return Boolean(
        (a.start_date && b.start_date && a.start_date === b.start_date) ||
        (a.startdate && b.startdate && a.startdate === b.startdate) ||
        (a.url && b.url && a.url === b.url) ||
        (a.urlHD && b.urlHD && a.urlHD === b.urlHD)
    );
}

async function wFetchLatestBingImage() {
    const url = 'https://bing.biturl.top/?resolution=1920&format=json&index=0&mkt=zh-CN';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return wNormalizeBingImage(await res.json());
}

function wRefreshBingLatestInBackground() {
    const now = Date.now();
    if (wBingRefreshPromise || now - wBingLastRefreshAt < W_BING_REFRESH_TTL) return;
    wBingLastRefreshAt = now;
    wBingRefreshPromise = (async () => {
        const previous = wGetCachedBingImage();
        const latest = await wFetchLatestBingImage();
        const cached = wReadBingCache();
        const merged = [
            latest,
            ...cached.filter((item) => {
                try {
                    return !wSameBingImage(latest, wNormalizeBingImage(item));
                } catch (_) {
                    return false;
                }
            })
        ].slice(0, 10);
        wWriteBingCache(merged);
        if (!wSameBingImage(previous, latest) && typeof Widgets !== 'undefined' && Widgets.renderAll) {
            Widgets.renderAll();
        }
    })().catch(() => {
        // Network refresh is optional; keep the cached wallpaper visible.
    }).finally(() => {
        wBingRefreshPromise = null;
    });
}

function wRenderBingPhoto(body, size, data) {
    const title = (data.copyright || '').split(/[\uFF08(]/)[0].trim();
    body.innerHTML = `
        <div class="w-photo" style="background-image:url('${wEsc(data.url)}')">
            <div class="w-photo-overlay">
                <div class="w-photo-tag">${t('widgets.photos.bing')}</div>
                ${size !== 's' ? `<div class="w-photo-title">${wEsc(title)}</div>` : ''}
            </div>
        </div>`;
}

function wRenderPhotos(body, ctx, size) {
    const source = wPhotoWidgetSource(ctx);
    if (source === 'bing') {
        wRenderBingPhoto(body, size, wGetBingDisplayImage());
        if (!ctx.isPreview) wRefreshBingLatestInBackground();
        return;
    }

    wAsync(body, async () => {
        if (source !== 'bing' && window.PhotosDataStore && typeof PhotosDataStore.getWidgetImage === 'function') {
            const data = PhotosDataStore.getWidgetImage(source);
            if (!body.isConnected) return;
            if (data && data.pending) {
                body.innerHTML = `<div class="w-loading">${t('widgets.loading')}</div>`;
                return;
            }
            if (!data || !data.url) {
                const empty = source === 'favorites'
                    ? wUiText('\u6682\u65e0\u6536\u85cf\u7167\u7247', 'No favorite photos')
                    : wUiText('\u6682\u65e0\u672c\u673a\u7167\u7247', 'No local photos');
                body.innerHTML = `<div class="w-loading">${empty}</div>`;
                return;
            }
            body.innerHTML = `
                <div class="w-photo" style="background-image:url('${wEsc(data.url)}')">
                    <div class="w-photo-overlay">
                        <div class="w-photo-tag">${wEsc(data.tag || wPhotoSourceLabel(source))}</div>
                        ${size !== 's' ? `<div class="w-photo-title">${wEsc(data.title || '')}</div>` : ''}
                    </div>
                </div>`;
            return;
        }
    });
}

function wPhotoWidgetSource(ctx) {
    const valid = new Set(['bing', 'local', 'favorites']);
    const inst = ctx.instance?.settings?.source;
    const globalSource = window.PhotosDataStore && typeof PhotosDataStore.getSettings === 'function'
        ? PhotosDataStore.getSettings().widgetSource
        : '';
    const source = valid.has(globalSource) ? globalSource : (valid.has(inst) ? inst : 'bing');
    return source;
}

function wPhotoSourceLabel(source) {
    if (source === 'local') return wUiText('\u672c\u673a\u7167\u7247', 'Local Photos');
    if (source === 'favorites') return wUiText('\u6536\u85cf', 'Favorites');
    return wUiText('Bing \u6bcf\u65e5\u58c1\u7eb8', 'Bing Daily');
}

function wRenderPhotosEditor(container, ctx) {
    const current = wPhotoWidgetSource(ctx);
    const sources = [
        ['bing', wUiText('Bing \u6bcf\u65e5\u58c1\u7eb8', 'Bing daily wallpaper')],
        ['local', wUiText('\u968f\u673a\u672c\u673a\u7167\u7247', 'Random local photo')],
        ['favorites', wUiText('\u6536\u85cf', 'Favorites')]
    ];
    container.innerHTML = `
        <div class="widget-edit-panel">
            <div class="widget-edit-head">
                <img src="Theme/Icon/Symbol_icon/stroke/Image.svg" alt="">
                <div>
                    <div class="widget-edit-title">${wUiText('\u7167\u7247\u6765\u6e90', 'Photo Source')}</div>
                    <div class="widget-edit-subtitle">${wUiText('\u9009\u62e9\u7167\u7247\u5c0f\u7ec4\u4ef6\u663e\u793a\u7684\u5185\u5bb9\uff0c\u4f1a\u4e0e\u7167\u7247 App \u8bbe\u7f6e\u540c\u6b65\u3002', 'Choose what the Photos widget displays. This stays synced with Photos settings.')}</div>
                </div>
            </div>
            <div class="widget-edit-options">
                ${sources.map(([key, label]) => `
                    <button class="widget-edit-option ${key === current ? 'selected' : ''}" data-photo-source="${key}" type="button">
                        <span>${wEsc(label)}</span>
                        <img src="Theme/Icon/Symbol_icon/stroke/Check.svg" alt="">
                    </button>
                `).join('')}
            </div>
        </div>`;
    container.querySelectorAll('[data-photo-source]').forEach(btn => {
        btn.addEventListener('click', () => {
            const source = btn.dataset.photoSource || 'bing';
            container.querySelectorAll('.widget-edit-option').forEach(item => item.classList.remove('selected'));
            btn.classList.add('selected');
            ctx.setSettings({ source }, { silent: true });
            if (window.PhotosDataStore && typeof PhotosDataStore.saveSettings === 'function') {
                PhotosDataStore.saveSettings({ widgetSource: source }, { syncWidgets: true });
            }
        });
    });
}

/* ==================== Search ==================== */

const W_SEARCH_ENGINES = {
    bing: { name: 'Bing', url: q => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
    baidu: { name: '\u767e\u5ea6', url: q => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}` },
    google: { name: 'Google', url: q => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
    duckduckgo: { name: 'DuckDuckGo', url: q => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
    yandex: { name: 'Yandex', url: q => `https://yandex.com/search/?text=${encodeURIComponent(q)}` }
};

function wSearchEngine(ctx) {
    const engine = ctx.instance?.settings?.engine || 'bing';
    return W_SEARCH_ENGINES[engine] ? engine : 'bing';
}

function wSearchUrl(query, ctx) {
    return W_SEARCH_ENGINES[wSearchEngine(ctx)].url(query);
}

function wRenderSearch(body, ctx) {
    const engine = wSearchEngine(ctx);
    body.innerHTML = `
        <div class="w-search-pill">
            <img src="Theme/Icon/Symbol_icon/stroke/Search.svg" alt="">
            <input type="text" placeholder="${W_SEARCH_ENGINES[engine].name} ${t('widgets.search.placeholder')}" ${ctx.isPreview ? 'disabled' : ''}>
        </div>`;
    if (ctx.isPreview) return;

    const input = body.querySelector('input');
    const go = (query = input.value) => {
        const q = String(query || '').trim();
        if (!q) return;
        if (window.SearchHistory) SearchHistory.add(q);
        const searchUrl = wSearchUrl(q, ctx);
        if (ctx.surface === 'lock') {
            window.open(searchUrl, '_blank');
        } else {
            wOpenInBrowser(searchUrl, ctx);
        }
        input.value = '';
        input.blur();
    };

    input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') go();
    });
    input.addEventListener('click', (e) => e.stopPropagation());
    body.querySelector('.w-search-pill').addEventListener('click', (e) => {
        e.stopPropagation();
        input.focus();
    });
    if (window.SearchHistory) {
        SearchHistory.bindPopover(input, {
            anchor: body,
            className: 'widget-search-history',
            minWidth: 300,
            gap: 16,
            onSelect: query => go(query)
        });
    }
}

function wRenderSearchEditor(container, ctx) {
    const current = wSearchEngine(ctx);
    container.innerHTML = `
        <div class="widget-edit-panel">
            <div class="widget-edit-head">
                <img src="Theme/Icon/Symbol_icon/stroke/Search.svg" alt="">
                <div>
                    <div class="widget-edit-title">\u641c\u7d22\u5f15\u64ce</div>
                    <div class="widget-edit-subtitle">\u9009\u62e9\u641c\u7d22\u5c0f\u7ec4\u4ef6\u9ed8\u8ba4\u4f7f\u7528\u7684\u641c\u7d22\u670d\u52a1\u3002</div>
                </div>
            </div>
            <div class="widget-edit-options">
                ${Object.entries(W_SEARCH_ENGINES).map(([key, engine]) => `
                    <button class="widget-edit-option ${key === current ? 'selected' : ''}" data-engine="${key}" type="button">
                        <span>${wEsc(engine.name)}</span>
                        <img src="Theme/Icon/Symbol_icon/stroke/Check.svg" alt="">
                    </button>
                `).join('')}
            </div>
        </div>`;
    container.querySelectorAll('[data-engine]').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.widget-edit-option').forEach(item => item.classList.remove('selected'));
            btn.classList.add('selected');
            ctx.setSettings({ engine: btn.dataset.engine }, { silent: true });
        });
    });
}

/* ==================== Hot Board / News Sources ==================== */

const W_HOTBOARD_SOURCES = {
    bilibili: 'Bilibili',
    acfun: 'AcFun',
    weibo: 'Weibo',
    zhihu: 'Zhihu Hot',
    'zhihu-daily': 'Zhihu Daily',
    douyin: 'Douyin',
    xiaohongshu: 'Xiaohongshu',
    kuaishou: 'Kuaishou',
    'douban-movie': 'Douban Movie',
    'douban-group': 'Douban Group',
    tieba: 'Baidu Tieba',
    hupu: 'Hupu',
    ngabbs: 'NGA',
    v2ex: 'V2EX',
    '52pojie': '52pojie',
    hostloc: 'Hostloc',
    coolapk: 'Coolapk',
    baidu: 'Baidu Hot',
    thepaper: 'The Paper',
    toutiao: 'Toutiao',
    'qq-news': 'QQ News',
    sina: 'Sina Hot',
    'sina-news': 'Sina News',
    'netease-news': 'NetEase News',
    huxiu: 'Huxiu',
    ifanr: 'ifanr',
    sspai: 'sspai',
    ithome: 'IT Home',
    'ithome-xijiayi': 'IT Home Xijiayi',
    juejin: 'Juejin',
    jianshu: 'Jianshu',
    guokr: 'Guokr',
    '36kr': '36Kr',
    '51cto': '51CTO',
    csdn: 'CSDN',
    nodeseek: 'NodeSeek',
    hellogithub: 'HelloGitHub',
    lol: 'League of Legends',
    genshin: 'Genshin Impact',
    honkai: 'Honkai Impact',
    starrail: 'Honkai Star Rail',
    'netease-music': 'NetEase Music',
    'qq-music': 'QQ Music',
    weread: 'WeRead',
    weatheralarm: 'Weather Alarm',
    earthquake: 'Earthquake',
    history: 'Today in History'
};

function wHotboardSource(ctx) {
    const source = ctx.instance?.settings?.source || 'weibo';
    return W_HOTBOARD_SOURCES[source] ? source : 'weibo';
}

async function wFetchHotboard(source = 'weibo') {
    const type = W_HOTBOARD_SOURCES[source] ? source : 'weibo';
    return WidgetData.get(`hotboard-${type}`, 10 * 60 * 1000, () =>
        wFetchUapisJSON(`/api/v1/misc/hotboard?type=${encodeURIComponent(type)}`));
}

function wRenderNews(body, ctx, size) {
    wAsync(body, async () => {
        const source = wHotboardSource(ctx);
        const data = await wFetchHotboard(source);
        if (!body.isConnected) return;
        const list = (data.list || []).slice(0, size === 'l' ? 9 : 4);
        const sourceName = W_HOTBOARD_SOURCES[source];
        body.innerHTML = `
            <div class="w-list-head">
                <span class="w-list-title">${wUiText('\u70ed\u70b9', 'Hot')} ${wEsc(sourceName || t('widgets.news.title'))}</span>
                <span class="w-list-sub">${wEsc((data.update_time || '').slice(11, 16))}</span>
            </div>
            <div class="w-list-body">
                ${list.map(item => `
                    <div class="w-news-row" data-url="${wEsc(item.url || '')}">
                        <span class="w-news-rank r${item.index}">${item.index}</span>
                        <span class="w-news-title">${wEsc(item.title)}</span>
                        ${size === 'l' ? `<span class="w-news-hot">${wEsc(wFormatHot(item.hot_value))}</span>` : ''}
                    </div>`).join('')}
            </div>`;
        body.querySelectorAll('.w-news-row').forEach(row => {
            row.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!wClickable(ctx)) return;
                const url = row.dataset.url;
                if (url) wOpenInBrowser(url, ctx);
            });
        });
    });
}

function wRenderNewsEditor(container, ctx) {
    const current = wHotboardSource(ctx);
    container.innerHTML = `
        <div class="widget-edit-panel">
            <div class="widget-edit-head">
                <img src="Theme/Icon/Symbol_icon/stroke/Broadcast.svg" alt="">
                <div>
                    <div class="widget-edit-title">${wUiText('\u65b0\u95fb\u6765\u6e90', 'News Source')}</div>
                    <div class="widget-edit-subtitle">${wUiText('\u9009\u62e9\u65b0\u95fb\u5c0f\u7ec4\u4ef6\u9ed8\u8ba4\u663e\u793a\u7684\u70ed\u70b9\u6765\u6e90\u3002', 'Choose the default hot-news source for this widget.')}</div>
                </div>
            </div>
            <div class="widget-edit-options widget-edit-hotboard-options">
                ${Object.entries(W_HOTBOARD_SOURCES).map(([key, name]) => `
                    <button class="widget-edit-option ${key === current ? 'selected' : ''}" data-source="${key}" type="button">
                        <span>${wEsc(name)}</span>
                        <img src="Theme/Icon/Symbol_icon/stroke/Check.svg" alt="">
                    </button>
                `).join('')}
            </div>
        </div>`;
    container.querySelectorAll('[data-source]').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.widget-edit-option').forEach(item => item.classList.remove('selected'));
            btn.classList.add('selected');
            ctx.setSettings({ source: btn.dataset.source }, { silent: true });
        });
    });
}

function wFormatHot(v) {
    const n = parseInt(v, 10);
    if (!isFinite(n)) return '';
    return n >= 10000 ? `${(n / 10000).toFixed(1)}\u4e07` : String(n);
}

/* ==================== Lunar Calendar ==================== */

async function wFetchLunar() {
    return WidgetData.get('lunartime', 30 * 60 * 1000, () =>
        wFetchUapisJSON('/api/v1/misc/lunartime'));
}

function wRenderLunar(body, ctx, size) {
    wAsync(body, async () => {
        const data = await wFetchLunar();
        if (!body.isConnected) return;
        const now = new Date();
        const extra = [data.solar_term, data.lunar_festival, data.festival]
            .filter(Boolean).map(wEsc).join(' / ');
        body.innerHTML = `
            <div class="w-lunar ${size === 'l' ? 'large' : ''}">
                <div class="w-lunar-tag">${t('widgets.lunar.title')}</div>
                <div class="w-lunar-day">${wEsc(data.lunar_day_cn || '--')}</div>
                <div class="w-lunar-month">${wEsc(data.lunar_month_cn || '')}</div>
                <div class="w-lunar-ganzhi">${wEsc(data.ganzhi_year || '')}${data.zodiac ? ` ${wEsc(data.zodiac)}` : ''}</div>
                ${size === 'l' ? `
                    <div class="w-lunar-detail">
                        <span>${t('widgets.lunar.month-gz')} ${wEsc(data.ganzhi_month || '--')}</span>
                        <span>${t('widgets.lunar.day-gz')} ${wEsc(data.ganzhi_day || '--')}</span>
                    </div>` : ''}
                ${extra ? `<div class="w-lunar-festival">${extra}</div>` : ''}
                <div class="w-lunar-greg">${now.getFullYear()}/${wPad(now.getMonth() + 1)}/${wPad(now.getDate())} ${wEsc(data.weekday_cn || wWeekday(now))}</div>
            </div>`;
    });
}

/* ==================== Package Tracking ==================== */

async function wFetchTracking(no) {
    return WidgetData.get(`tracking-${no}`, 5 * 60 * 1000, async () => {
        return wFetchUapisJSON(`/api/v1/misc/tracking/query?tracking_number=${encodeURIComponent(no)}`);
    });
}

/** Extract tracking traces from the different response shapes returned by APIs. */
function wExtractTraces(json) {
    const candidates = [json.traces, json.data, json.list, json.items, json.tracks,
        json.result && json.result.traces, json.result && json.result.list];
    for (const arr of candidates) {
        if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object') return arr;
    }
    return [];
}

function wTraceText(item) {
    return item.context || item.description || item.desc || item.status_description || item.content || item.status || '';
}

function wTraceTime(item) {
    return item.time || item.datetime || item.ftime || item.date || '';
}

function wRenderTracking(body, ctx, size) {
    const saved = (ctx.instance && ctx.instance.settings && ctx.instance.settings.trackingNo) || '';
    const maxItems = size === 'l' ? 5 : 2;

    const renderShell = () => {
        body.innerHTML = `
            <div class="w-track">
                <div class="w-track-bar">
                    <input type="text" placeholder="${t('widgets.tracking.placeholder')}" value="${wEsc(saved)}" ${ctx.isPreview ? 'disabled' : ''}>
                    <button>${t('widgets.tracking.query')}</button>
                </div>
                <div class="w-track-result">
                    <div class="w-cal-empty">${t('widgets.tracking.empty')}</div>
                </div>
            </div>`;
    };
    renderShell();
    if (ctx.isPreview) return;

    const input = body.querySelector('input');
    const resultEl = body.querySelector('.w-track-result');

    const query = async () => {
        const no = input.value.trim();
        if (!no) return;
        if (ctx.instance && ctx.setSettings) {
            ctx.setSettings({ trackingNo: no }, { silent: true });
        }
        resultEl.innerHTML = `<div class="w-loading">${t('widgets.loading')}</div>`;
        try {
            const json = await wFetchTracking(no);
            if (!body.isConnected) return;
            const traces = wExtractTraces(json);
            const carrier = json.carrier_name || json.carrier || json.company || '';
            if (traces.length === 0) {
                resultEl.innerHTML = `<div class="w-cal-empty">${t('widgets.empty')}</div>`;
                return;
            }
            resultEl.innerHTML = `
                ${carrier ? `<div class="w-track-carrier">${wEsc(carrier)}</div>` : ''}
                ${traces.slice(0, maxItems).map((tr, i) => `
                    <div class="w-track-item ${i === 0 ? 'latest' : ''}">
                        <div class="w-track-time">${wEsc(wTraceTime(tr))}</div>
                        <div class="w-track-text">${wEsc(wTraceText(tr))}</div>
                    </div>`).join('')}`;
        } catch (err) {
            if (body.isConnected) {
                resultEl.innerHTML = `<div class="w-cal-empty">${t('widgets.error')}</div>`;
            }
        }
    };

    input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') query();
    });
    input.addEventListener('click', (e) => e.stopPropagation());
    body.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        query();
    });

    if (saved) query();
}

/* ==================== Holidays ==================== */

async function wFetchHoliday() {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${wPad(now.getMonth() + 1)}-${wPad(now.getDate())}`;
    return WidgetData.get(`holiday-${dateStr}`, 6 * 60 * 60 * 1000, () =>
        wFetchUapisJSON(`/api/v1/misc/holiday-calendar?date=${dateStr}&include_nearby=true&nearby_limit=8&exclude_past=true`));
}

const W_HOLIDAY_TYPE_KEYS = {
    legal_rest: 'widgets.holiday.type.legal',
    legal_work: 'widgets.holiday.type.work',
    solar_term: 'widgets.holiday.type.term',
    lunar_festival: 'widgets.holiday.type.festival',
    solar_festival: 'widgets.holiday.type.festival'
};

function wHolidayUpcoming(data) {
    const next = (data.nearby && data.nearby.next) || [];
    const seen = new Set();
    const items = [];
    next.forEach(day => {
        (day.events || []).forEach(ev => {
            const k = `${ev.name}-${day.date}`;
            if (seen.has(k)) return;
            seen.add(k);
            const diff = Math.round((new Date(day.date) - new Date(new Date().toDateString())) / 86400000);
            items.push({ name: ev.name, date: day.date, type: ev.type, days: diff });
        });
    });
    return items;
}

function wRenderHoliday(body, ctx, size) {
    wAsync(body, async () => {
        const data = await wFetchHoliday();
        if (!body.isConnected) return;
        const items = wHolidayUpcoming(data);
        if (items.length === 0) {
            body.innerHTML = `<div class="w-loading">${t('widgets.empty')}</div>`;
            return;
        }
        const first = items[0];
        const rest = items.slice(1, size === 'l' ? 6 : 3);
        body.innerHTML = `
            <div class="w-holiday">
                <div class="w-holiday-hero">
                    <div class="w-holiday-label">${t('widgets.holiday.next')}</div>
                    <div class="w-holiday-name">${wEsc(first.name)}</div>
                    <div class="w-holiday-days">${first.days <= 0 ? t('widgets.holiday.today') : t('widgets.holiday.days', { n: first.days })}</div>
                    <div class="w-holiday-date">${wEsc(first.date)}</div>
                </div>
                <div class="w-holiday-list">
                    ${rest.map(it => `
                        <div class="w-holiday-row">
                            <span class="w-holiday-row-name">${wEsc(it.name)}</span>
                            <span class="w-holiday-row-type">${t(W_HOLIDAY_TYPE_KEYS[it.type] || 'widgets.holiday.type.festival')}</span>
                            <span class="w-holiday-row-days">${it.days <= 0 ? t('widgets.holiday.today') : t('widgets.holiday.days', { n: it.days })}</span>
                        </div>`).join('')}
                </div>
            </div>`;
    });
}

/* ==================== Answer Book ==================== */

function wRenderAnswerBook(body, ctx) {
    body.innerHTML = `
        <div class="w-answer">
            <div class="w-answer-tag">
                <img src="Theme/Icon/Symbol_icon/stroke/Stars B.svg" alt="">
                <span>${t('widgets.app.answerbook')}</span>
            </div>
            <div class="w-answer-display">${t('widgets.answer.hint')}</div>
            <div class="w-answer-bar">
                <input type="text" placeholder="${t('widgets.answer.placeholder')}" maxlength="60" ${ctx.isPreview ? 'disabled' : ''}>
                <button type="button">${t('widgets.answer.ask')}</button>
            </div>
        </div>`;
    if (ctx.isPreview) return;

    const input = body.querySelector('input');
    const btn = body.querySelector('.w-answer-bar button');
    const display = body.querySelector('.w-answer-display');
    let asking = false;

    const ask = async () => {
        const q = input.value.trim();
        if (!q || asking) return;
        asking = true;
        display.classList.remove('w-answer-reveal');
        display.textContent = t('widgets.answer.thinking');
        try {
            const data = await wFetchUapisJSON(`/api/v1/answerbook/ask?question=${encodeURIComponent(q)}`);
            if (!display.isConnected) return;
            display.textContent = '"' + (data.answer || t('widgets.error')) + '"';
            display.classList.add('w-answer-reveal');
        } catch (_) {
            if (display.isConnected) display.textContent = t('widgets.error');
        } finally {
            asking = false;
        }
    };

    input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') ask();
    });
    input.addEventListener('click', (e) => e.stopPropagation());
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        ask();
    });
}

/* ==================== Daily Word ==================== */

/**
 * Daily Word uses uapis.cn when available.
 * Some environments can return 403 CORS_FORBIDDEN, so a local word bank is kept as fallback.
 * The fallback keeps the widget useful offline or when the remote API fails.
 */
const W_WORD_BANK = [
    { word: 'serene', phonetic: '/s\u0259\u02c8ri\u02d0n/', translation: 'adj. calm; peaceful', examples: [{ text: 'The lake was serene in the morning light.', translation: 'The scene was calm and peaceful.' }] },
    { word: 'diligent', phonetic: '/\u02c8d\u026al\u026ad\u0292\u0259nt/', translation: 'adj. hardworking and careful', examples: [{ text: 'She is a diligent student who never misses a class.', translation: 'She studies carefully and consistently.' }] },
    { word: 'abundant', phonetic: '/\u0259\u02c8b\u028cnd\u0259nt/', translation: 'adj. more than enough', examples: [{ text: 'The region has abundant natural resources.', translation: 'There are many resources in the area.' }] },
    { word: 'genuine', phonetic: '/\u02c8d\u0292enju\u026an/', translation: 'adj. real; sincere', examples: [{ text: 'Her smile was warm and genuine.', translation: 'Her smile felt sincere.' }] },
    { word: 'persist', phonetic: '/p\u0259r\u02c8s\u026ast/', translation: 'v. continue firmly', examples: [{ text: 'If you persist, you will succeed.', translation: 'Keep going and you can succeed.' }] },
    { word: 'crucial', phonetic: '/\u02c8kru\u02d0\u0283l/', translation: 'adj. extremely important', examples: [{ text: 'Timing is crucial to the success of the plan.', translation: 'Timing is very important.' }] },
    { word: 'embrace', phonetic: '/\u026am\u02c8bre\u026as/', translation: 'v. accept willingly', examples: [{ text: 'We should embrace new technologies.', translation: 'We should welcome new technologies.' }] },
    { word: 'flourish', phonetic: '/\u02c8fl\u028cr\u026a\u0283/', translation: 'v. grow well', examples: [{ text: 'Plants flourish in this warm climate.', translation: 'Plants grow well here.' }] }
];

async function wFetchDailyWord() {
    return WidgetData.get('dailyword', 6 * 60 * 60 * 1000, async () => {
        try {
            const data = await wFetchUapisJSON('/api/v1/daily/word');
            if (data && Array.isArray(data.words) && data.words.length) return data;
        } catch (_) { /* Use the local word bank if the remote API fails. */ }
        const idx = Math.floor(Date.now() / 86400000) % W_WORD_BANK.length;
        return { words: [W_WORD_BANK[idx]] };
    });
}

function wRenderWord(body, ctx, size) {
    wAsync(body, async () => {
        const data = await wFetchDailyWord();
        if (!body.isConnected) return;
        const word = (data.words || [])[0];
        if (!word) {
            body.innerHTML = `<div class="w-loading">${t('widgets.empty')}</div>`;
            return;
        }
        const translation = String(word.translation || '').split(';')[0].trim();
        const example = (word.examples || [])[0];
        body.innerHTML = `
            <div class="w-word">
                <div class="w-word-tag">${t('widgets.word.title')}</div>
                <div class="w-word-text">${wEsc(word.word)}</div>
                <div class="w-word-phonetic">${wEsc(word.phonetic || '')}</div>
                <div class="w-word-trans">${wEsc(translation)}</div>
                ${size === 'm' && example ? `
                    <div class="w-word-example">
                        <div>${wEsc(example.text)}</div>
                        <div class="w-word-example-cn">${wEsc(example.translation || '')}</div>
                    </div>` : ''}
            </div>`;
    });
}

/* ==================== Media Playback ==================== */

/** Fallback cover gradients for the media widget, visually aligned with Media App. */
const W_MEDIA_GRADIENTS = [
    'linear-gradient(135deg, #ff6b35 0%, #ffb347 52%, #ffe1c2 100%)',
    'linear-gradient(135deg, #ff2d55 0%, #ff7aa2 50%, #ffd1dc 100%)',
    'linear-gradient(135deg, #5856d6 0%, #8e8cf0 50%, #d6d5ff 100%)',
    'linear-gradient(135deg, #0a84ff 0%, #5ac8fa 55%, #d2f0ff 100%)',
    'linear-gradient(135deg, #34c759 0%, #7be495 55%, #d9f7e2 100%)'
];

/** Fallback colors used when track themeColors are unavailable. */
const W_MEDIA_FALLBACK_COLORS = [
    ['hsl(18, 76%, 56%)', 'hsl(28, 84%, 50%)'],
    ['hsl(350, 80%, 55%)', 'hsl(338, 86%, 48%)'],
    ['hsl(242, 64%, 60%)', 'hsl(250, 72%, 52%)'],
    ['hsl(210, 92%, 52%)', 'hsl(200, 96%, 46%)'],
    ['hsl(135, 58%, 48%)', 'hsl(150, 66%, 40%)']
];

/**
 * Normalize a media playback snapshot.
 * Prefer the live MediaApp queue, cover blob, and theme colors when available.
 * If MediaApp is not initialized, restore displayable data from localStorage.
 */
function wMediaNormalizeTrack(item, index, activeId, playing, progress) {
    return {
        id: item.id,
        title: item.title || item.name || t('widgets.media.unknown'),
        artist: item.artist || t('widgets.media.unknown'),
        coverUrl: item.coverUrl || '',
        themeColors: item.themeColors,
        gradientIndex: item.gradientIndex || index || 0,
        playing: item.id === activeId ? playing : false,
        progress: item.id === activeId ? progress : 0,
        index
    };
}

function wMediaSnapshot() {
    if (window.MediaApp && Array.isArray(MediaApp.library) && MediaApp.library.length) {
        const lib = MediaApp.library;
        const fallbackIndex = lib
            .map((item, index) => ({ item, index }))
            .sort((a, b) => (b.item.lastPlayed || 0) - (a.item.lastPlayed || 0))[0]?.index ?? 0;
        const currentIndex = MediaApp.currentIndex >= 0 && lib[MediaApp.currentIndex] ? MediaApp.currentIndex : fallbackIndex;
        const live = lib[currentIndex] || lib[0];
        const media = MediaApp.mediaElement;
        const playing = !!(media && !media.paused && media.dataset.itemId === live.id);
        const progress = media && Number.isFinite(media.duration) && media.duration > 0
            ? Math.max(0, Math.min(100, (media.currentTime / media.duration) * 100))
            : 68;
        return {
            tracks: lib.map((item, index) => wMediaNormalizeTrack(item, index, live.id, playing, progress)),
            currentIndex
        };
    }

    let manifest = [];
    try {
        manifest = JSON.parse(localStorage.getItem('fluentos.media.library.v1') || '[]');
    } catch (_) { manifest = []; }
    if (!Array.isArray(manifest) || !manifest.length) return { tracks: [], currentIndex: -1 };
    const sorted = manifest
        .map((item, index) => ({ item, index }))
        .sort((a, b) => (b.item.lastPlayed || 0) - (a.item.lastPlayed || 0));
    const currentIndex = sorted[0]?.index ?? 0;
    const activeId = manifest[currentIndex]?.id;
    return {
        tracks: manifest.map((item, index) => wMediaNormalizeTrack(item, index, activeId, false, 68)),
        currentIndex
    };
}

function wMediaState() {
    const snapshot = wMediaSnapshot();
    const tracks = snapshot.tracks || [];
    if (!tracks.length) return { track: null, queue: [] };
    const currentIndex = snapshot.currentIndex >= 0 ? snapshot.currentIndex : 0;
    const track = tracks[currentIndex] || tracks[0];
    const queue = [];
    for (let step = 1; step < tracks.length && queue.length < 4; step += 1) {
        queue.push(tracks[(currentIndex + step) % tracks.length]);
    }
    if (!queue.length && track) queue.push(track);
    return { track, queue };
}

function wMediaTrack() {
    return wMediaState().track;
}

/** Prefer cover theme colors; fall back to the preset gradient palette. */
function wMediaColors(track) {
    if (track && Array.isArray(track.themeColors) && track.themeColors.length >= 2) {
        return [track.themeColors[0], track.themeColors[1]];
    }
    const idx = Math.abs(track?.gradientIndex || 0) % W_MEDIA_FALLBACK_COLORS.length;
    return W_MEDIA_FALLBACK_COLORS[idx];
}

function wMediaCoverHtml(track, cls) {
    if (track && track.coverUrl) {
        return `<div class="${cls}" style="background-image:url('${track.coverUrl}')"></div>`;
    }
    const g = W_MEDIA_GRADIENTS[Math.abs(track?.gradientIndex || 0) % W_MEDIA_GRADIENTS.length];
    return `
        <div class="${cls} w-media-cover-fallback" style="background:${g}">
            <img src="Theme/Icon/Symbol_icon/stroke/Music.svg" alt="">
        </div>`;
}

/** Localized fallback text for the media widget when i18n keys are not available. */
function wMediaText(key) {
    const zh = !(typeof I18n !== 'undefined' && I18n.currentLang === 'en');
    const map = {
        upNext: zh ? '\u63a5\u4e0b\u6765' : 'Up Next',
        afternoon: zh ? '\u4f60\u7684\u5348\u540e\u97f3\u4e50' : 'Your afternoon musics',
        previous: zh ? '\u4e0a\u4e00\u9996' : 'Previous',
        next: zh ? '\u4e0b\u4e00\u9996' : 'Next'
    };
    return map[key] || key;
}

function wMediaInvoke(action) {
    if (!(window.MediaApp && MediaApp.container && MediaApp.library.length)) return false;
    if (action === 'previous') MediaApp.playPrevious();
    else if (action === 'next') MediaApp.playNext();
    else MediaApp.togglePlay(action === 'start');
    return true;
}

function wMediaControl(ctx, action) {
    if (!wClickable(ctx) || ctx.surface !== 'desktop') return;
    if (wMediaInvoke(action)) return;
    WindowManager.openApp('media');
    const pendingAction = action === 'play' ? 'start' : action;
    let tries = 0;
    const timer = setInterval(() => {
        tries += 1;
        if (wMediaInvoke(pendingAction)) {
            clearInterval(timer);
        } else if (tries > 24) {
            clearInterval(timer);
        }
    }, 250);
}

function wMediaControlButton(action, track) {
    const isPlay = action === 'play';
    const icon = action === 'previous'
        ? 'Previous.svg'
        : action === 'next'
            ? 'Next.svg'
            : `${track.playing ? 'Pause' : 'Play'}.svg`;
    const label = action === 'play'
        ? (track.playing ? t('widgets.media.pause') : t('widgets.media.play'))
        : wMediaText(action);
    const progress = Math.max(8, Math.min(100, Math.round(track.progress || 68)));
    const style = isPlay ? ` style="--w-media-progress:${progress}%;"` : '';
    return `
        <button class="w-media-control ${isPlay ? 'w-media-control-play' : ''}" type="button" data-media-action="${action}" aria-label="${wEsc(label)}"${style}>
            <img src="Theme/Icon/Symbol_icon/stroke/${icon}" alt="">
        </button>`;
}

function wMediaControls(track) {
    return `
        <div class="w-media-controls">
            ${wMediaControlButton('previous', track)}
            ${wMediaControlButton('play', track)}
            ${wMediaControlButton('next', track)}
        </div>`;
}

function wMediaQueueMarkup(queue) {
    return `
        <div class="w-media-upnext-title">${wMediaText('upNext')}</div>
        <div class="w-media-queue">
            ${queue.slice(0, 4).map(item => `
                <div class="w-media-queue-item">
                    ${wMediaCoverHtml(item, 'w-media-queue-art')}
                    <div class="w-media-queue-title">${wEsc(item.title)}</div>
                    <div class="w-media-queue-artist">${wEsc(item.artist || t('widgets.media.unknown'))}</div>
                </div>`).join('')}
        </div>
        <div class="w-media-footer-text">${wMediaText('afternoon')}</div>`;
}

function wRenderMedia(body, ctx, size) {
    const draw = (state) => {
        const track = state.track;
        body.classList.toggle('w-media-medium', size === 'm');
        body.classList.toggle('w-media-large', size === 'l');
        body.classList.toggle('w-media-empty-state', !track);
        if (!track) {
            body.style.removeProperty('--w-media-c1');
            body.style.removeProperty('--w-media-c2');
            body.innerHTML = `
                <div class="w-media w-media-player-card w-media-empty">
                    <img class="w-media-empty-icon" src="Theme/Icon/Symbol_icon/stroke/Music.svg" alt="">
                    <div class="w-media-empty-text">请先导入音乐</div>
                </div>`;
            return;
        }

        const [c1, c2] = wMediaColors(track);
        body.style.setProperty('--w-media-c1', c1);
        body.style.setProperty('--w-media-c2', c2);
        const artist = track.artist || t('widgets.media.unknown');

        if (size === 's') {
            body.innerHTML = `
                <div class="w-media w-media-player-card w-media-card-s">
                    ${wMediaCoverHtml(track, 'w-media-art')}
                    <div class="w-media-copy">
                        <div class="w-media-title">${wEsc(track.title)}</div>
                        <div class="w-media-artist">${wEsc(artist)}</div>
                    </div>
                    ${wMediaControls(track)}
                </div>`;
        } else if (size === 'm') {
            body.innerHTML = `
                <div class="w-media w-media-player-card w-media-card-m">
                    ${wMediaCoverHtml(track, 'w-media-art')}
                    <div class="w-media-copy">
                        <div class="w-media-title">${wEsc(track.title)}</div>
                        <div class="w-media-artist">${wEsc(artist)}</div>
                        ${wMediaControls(track)}
                    </div>
                </div>`;
        } else {
            body.innerHTML = `
                <div class="w-media w-media-player-card w-media-card-l">
                    <div class="w-media-now-row">
                        ${wMediaCoverHtml(track, 'w-media-art')}
                        <div class="w-media-copy">
                            <div class="w-media-title">${wEsc(track.title)}</div>
                            <div class="w-media-artist">${wEsc(artist)}</div>
                            ${wMediaControls(track)}
                        </div>
                    </div>
                    ${wMediaQueueMarkup(state.queue)}
                </div>`;
        }

        body.querySelectorAll('[data-media-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                wMediaControl(ctx, btn.dataset.mediaAction || 'play');
                setTimeout(refresh, 300);
                setTimeout(refresh, 800);
            });
        });
    };

    const refresh = () => {
        if (body.dataset.mediaSig && !body.isConnected) return;
        const state = wMediaState();
        const track = state.track;
        const sig = track
            ? `${track.id}|${track.playing}|${Math.round(track.progress || 0)}|${track.coverUrl}|${state.queue.map(item => item.id).join(',')}`
            : 'empty';
        if (body.dataset.mediaSig === sig) return;
        body.dataset.mediaSig = sig;
        draw(state);
    };

    body.dataset.mediaSig = '';
    wTick(body, 2000, refresh);
}

function wMediaOpenApp(ctx) {
    WindowManager.openApp('media');
}

function wQuickNotesText() {
    if (window.NotesApp && typeof NotesApp.getQuickNoteContent === 'function') {
        return NotesApp.getQuickNoteContent();
    }
    return (State && State.settings && State.settings.notesQuickContent) || '';
}

function wSetQuickNotesText(value) {
    const text = String(value || '');
    if (window.NotesApp && typeof NotesApp.setQuickNoteContent === 'function') {
        NotesApp.setQuickNoteContent(text, { source: 'widget' });
        return;
    }
    if (State && typeof State.updateSettings === 'function') {
        State.updateSettings({
            notesQuickContent: text,
            notesQuickModified: new Date().toISOString()
        });
    }
}

function wQuickNotesOpenApp(ctx) {
    if (!wClickable(ctx) || ctx.surface !== 'desktop') return;
    WindowManager.openApp('notes', { view: 'quick' });
}

function wRenderQuickNotes(body, ctx, size) {
    const isSmall = size === 's';
    body.classList.toggle('w-quicknotes-small', isSmall);
    body.classList.toggle('w-quicknotes-medium', size === 'm');
    body.classList.toggle('w-quicknotes-tall', size === 'tall');
    body.classList.toggle('w-quicknotes-large', size === 'l');
    body.innerHTML = `
        <div class="w-quicknotes-shell">
            <div class="w-quicknotes-head">
                <img src="Theme/Icon/Symbol_icon/stroke/Edit Pen.svg" alt="">
                <span>${t('widgets.app.quicknotes')}</span>
            </div>
            <textarea class="w-quicknotes-text" spellcheck="true" ${ctx.isPreview ? 'readonly' : ''} placeholder="${wEsc(t('notes.placeholder'))}">${wEsc(wQuickNotesText())}</textarea>
        </div>`;

    const textarea = body.querySelector('.w-quicknotes-text');
    if (!ctx.isPreview) {
        textarea.addEventListener('pointerdown', e => e.stopPropagation());
        textarea.addEventListener('click', e => e.stopPropagation());
        textarea.addEventListener('input', () => wSetQuickNotesText(textarea.value));
    }

    wTick(body, 1500, () => {
        if (!textarea || document.activeElement === textarea) return;
        const latest = wQuickNotesText();
        if (textarea.value !== latest) textarea.value = latest;
    });
}

function wFavoriteLimit(size) {
    if (size === 's') return 4;
    if (size === 'l') return 16;
    return 8;
}

function wFavoriteGridClass(size) {
    if (size === 's') return 'small';
    if (size === 'tall') return 'tall';
    if (size === 'l') return 'large';
    return 'medium';
}

function wRenderFavoriteSites(body, ctx, size) {
    body.classList.toggle('w-favorites-small', size === 's');
    body.classList.toggle('w-favorites-tall', size === 'tall');
    body.classList.toggle('w-favorites-large', size === 'l');
    wAsync(body, async () => {
        const service = window.FavoriteSites;
        const limit = wFavoriteLimit(size);
        const sites = service ? await service.getWidgetDisplaySites(limit) : [];
        if (!body.isConnected) return;

        if (!sites.length) {
            const emptyText = t('widgets.favorites.empty');
            body.innerHTML = `<div class="w-loading">${emptyText === 'widgets.favorites.empty' ? 'No favorite sites' : emptyText}</div>`;
            return;
        }

        const gridClass = wFavoriteGridClass(size);
        body.innerHTML = `
            <div class="w-favorites-grid ${gridClass}">
                ${sites.map((site, index) => `
                    <button class="w-favorite-site" type="button" data-site-index="${index}">
                        <span class="w-favorite-icon">
                            <span class="w-favorite-letter">${wEsc((site.title || site.url || '?').trim().slice(0, 1).toUpperCase())}</span>
                            ${site.icon ? `<img src="${wEsc(site.icon)}" alt="">` : ''}
                        </span>
                        <span class="w-favorite-name">${wEsc(site.title || site.url)}</span>
                    </button>
                `).join('')}
            </div>`;

        body.querySelectorAll('.w-favorite-icon img').forEach(img => {
            img.addEventListener('error', () => {
                img.remove();
            }, { once: true });
        });

        body.querySelectorAll('.w-favorite-site').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (ctx.isPreview || (typeof Widgets !== 'undefined' && Widgets.isOpen)) return;
                const site = sites[Number(btn.dataset.siteIndex)];
                if (site && service) service.openSite(site, { surface: ctx.surface });
            });
        });
    });
}

/* ==================== Favorite Sites ==================== */

function wRenderFavoriteSitesEditor(container, ctx) {
    const service = window.FavoriteSites;
    if (!service) {
        container.innerHTML = `<div class="widget-edit-panel"><div class="w-loading">${wUiText('\u6536\u85cf\u670d\u52a1\u6682\u4e0d\u53ef\u7528', 'Favorites service is unavailable')}</div></div>`;
        return;
    }

    const draw = async () => {
        const sites = await service.getDisplaySites(64);
        if (!container.isConnected) return;
        container.innerHTML = `
            <div class="widget-edit-panel widget-edit-favorites">
                <div class="widget-edit-head">
                    <img src="Theme/Icon/Symbol_icon/stroke/Bookmark.svg" alt="">
                    <div>
                        <div class="widget-edit-title">${wUiText('\u6536\u85cf\u7f51\u7ad9', 'Favorite Sites')}</div>
                        <div class="widget-edit-subtitle">${wUiText('\u6dfb\u52a0\u6216\u79fb\u9664\u663e\u793a\u5728\u6536\u85cf\u5c0f\u7ec4\u4ef6\u4e2d\u7684\u5feb\u6377\u7f51\u7ad9\u3002', 'Add or remove quick links shown in the favorites widget.')}</div>
                    </div>
                </div>
                <div class="widget-edit-add-row">
                    <input class="widget-edit-input" type="url" placeholder="${wUiText('\u8f93\u5165\u7f51\u5740\uff0c\u4f8b\u5982 example.com', 'Enter a URL, for example example.com')}">
                    <button class="widget-edit-add-btn" type="button">${wUiText('\u6dfb\u52a0', 'Add')}</button>
                </div>
                <div class="widget-edit-sites-list">
                    ${sites.map(site => `
                        <div class="widget-edit-site" data-site-id="${wEsc(site.id)}">
                            <span class="widget-edit-site-icon">
                                ${site.icon ? `<img src="${wEsc(site.icon)}" alt="">` : ''}
                            </span>
                            <span class="widget-edit-site-name">${wEsc(site.title || site.url)}</span>
                            <button class="widget-edit-site-remove" type="button" title="${wUiText('\u5220\u9664', 'Remove')}">
                                <img src="Theme/Icon/Symbol_icon/stroke/Trash.svg" alt="">
                            </button>
                        </div>
                    `).join('')}
                </div>
                <button class="widget-edit-import-button" type="button">
                    <img src="Theme/Icon/Symbol_icon/stroke/Bookmark Download.svg" alt="">
                    <span>${wUiText('\u4ece\u5f53\u524d\u6d4f\u89c8\u5668\u5bfc\u5165\u6536\u85cf', 'Import favorites...')}</span>
                </button>
            </div>`;

        const input = container.querySelector('.widget-edit-input');
        const addBtn = container.querySelector('.widget-edit-add-btn');
        const addSite = async () => {
            const url = input.value.trim();
            if (!url) return;
            addBtn.disabled = true;
            await service.addFromUrl(url);
            input.value = '';
            if (typeof Widgets !== 'undefined' && Widgets.renderAll) Widgets.renderAll();
            await draw();
        };
        addBtn.addEventListener('click', addSite);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addSite();
        });
        container.querySelector('.widget-edit-import-button')?.addEventListener('click', () => {
            service.selectBookmarksFile({ onComplete: () => draw() });
        });
        container.querySelectorAll('.widget-edit-site-remove').forEach(btn => {
            btn.addEventListener('click', async () => {
                const row = btn.closest('.widget-edit-site');
                if (!row) return;
                service.removeSite(row.dataset.siteId);
                if (typeof Widgets !== 'undefined' && Widgets.renderAll) Widgets.renderAll();
                await draw();
            });
        });
    };

    draw();
}

const WidgetDefs = {
    apps: [
        {
            id: 'weather',
            nameKey: 'widgets.app.weather',
            descKey: 'widgets.app.weather.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Sun.svg',
            variants: [
                { id: 'weather-s', w: 2, h: 2, sizeKey: 'widgets.size.small', theme: 'w-weather', defaultSettings: { city: 'beijing' }, render(b, c) { wRenderWeather(b, c, 's'); }, renderEditor: wRenderWeatherEditor, onClick: wWeatherClick, getMenu: wWeatherMenu },
                { id: 'weather-m', w: 4, h: 2, sizeKey: 'widgets.size.medium', theme: 'w-weather', defaultSettings: { city: 'beijing' }, render(b, c) { wRenderWeather(b, c, 'm'); }, renderEditor: wRenderWeatherEditor, onClick: wWeatherClick, getMenu: wWeatherMenu },
                { id: 'weather-l', w: 4, h: 4, sizeKey: 'widgets.size.large', theme: 'w-weather', defaultSettings: { city: 'beijing' }, render(b, c) { wRenderWeather(b, c, 'l'); }, renderEditor: wRenderWeatherEditor, onClick: wWeatherClick, getMenu: wWeatherMenu }
            ]
        },
        {
            id: 'clock',
            nameKey: 'widgets.app.clock',
            descKey: 'widgets.app.clock.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Clock.svg',
            variants: [
                { id: 'clock-analog', w: 2, h: 2, sizeKey: 'widgets.variant.analog', theme: 'w-clock', render(b) { wRenderClockAnalog(b); }, onClick() { WindowManager.openApp('clock'); } },
                { id: 'clock-digital', w: 2, h: 2, sizeKey: 'widgets.variant.digital', theme: 'w-clock', render(b) { wRenderClockDigital(b); }, onClick() { WindowManager.openApp('clock'); } },
                { id: 'clock-world', w: 4, h: 2, sizeKey: 'widgets.clock.world', theme: 'w-clock', render(b) { wRenderClockWorld(b); }, onClick() { WindowManager.openApp('clock', { tab: 'worldclock' }); } }
            ]
        },
        {
            id: 'calendar',
            nameKey: 'widgets.app.calendar',
            descKey: 'widgets.app.calendar.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Calendar.svg',
            variants: [
                { id: 'calendar-s', w: 2, h: 2, sizeKey: 'widgets.size.small', theme: 'w-calendar', render(b, c) { wRenderCalendar(b, c, 's'); }, onClick() { WindowManager.openApp('clock', { tab: 'calendar' }); } },
                { id: 'calendar-m', w: 4, h: 2, sizeKey: 'widgets.size.medium', theme: 'w-calendar', render(b, c) { wRenderCalendar(b, c, 'm'); }, onClick() { WindowManager.openApp('clock', { tab: 'calendar' }); } },
                { id: 'calendar-l', w: 4, h: 4, sizeKey: 'widgets.size.large', theme: 'w-calendar', render(b, c) { wRenderCalendar(b, c, 'l'); }, onClick() { WindowManager.openApp('clock', { tab: 'calendar' }); } },
                { id: 'calendar-events-s', w: 2, h: 2, sizeKey: 'widgets.size.small', theme: 'w-calendar-events', render(b, c) { wRenderCalendarEvents(b, c, 's'); }, onClick() { WindowManager.openApp('clock', { tab: 'calendar' }); } },
                { id: 'calendar-events-m', w: 4, h: 2, sizeKey: 'widgets.size.medium', theme: 'w-calendar-events', render(b, c) { wRenderCalendarEvents(b, c, 'm'); }, onClick() { WindowManager.openApp('clock', { tab: 'calendar' }); } },
                { id: 'calendar-events-l', w: 4, h: 4, sizeKey: 'widgets.size.large', theme: 'w-calendar-events', render(b, c) { wRenderCalendarEvents(b, c, 'l'); }, onClick() { WindowManager.openApp('clock', { tab: 'calendar' }); } }
            ]
        },
        {
            id: 'photos',
            nameKey: 'widgets.app.photos',
            descKey: 'widgets.app.photos.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Image.svg',
            variants: [
                { id: 'photos-s', w: 2, h: 2, sizeKey: 'widgets.size.small', theme: 'w-photos', defaultSettings: { source: 'bing' }, render(b, c) { wRenderPhotos(b, c, 's'); }, renderEditor: wRenderPhotosEditor, onClick() { WindowManager.openApp('photos'); } },
                { id: 'photos-m', w: 4, h: 2, sizeKey: 'widgets.size.medium', theme: 'w-photos', defaultSettings: { source: 'bing' }, render(b, c) { wRenderPhotos(b, c, 'm'); }, renderEditor: wRenderPhotosEditor, onClick() { WindowManager.openApp('photos'); } },
                { id: 'photos-l', w: 4, h: 4, sizeKey: 'widgets.size.large', theme: 'w-photos', defaultSettings: { source: 'bing' }, render(b, c) { wRenderPhotos(b, c, 'l'); }, renderEditor: wRenderPhotosEditor, onClick() { WindowManager.openApp('photos'); } }
            ]
        },
        {
            id: 'media',
            nameKey: 'widgets.app.media',
            descKey: 'widgets.app.media.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Music.svg',
            variants: [
                { id: 'media-s', w: 2, h: 2, sizeKey: 'widgets.size.small', theme: 'w-media-theme', render(b, c) { wRenderMedia(b, c, 's'); }, onClick: wMediaOpenApp },
                { id: 'media-m', w: 4, h: 2, sizeKey: 'widgets.size.medium', theme: 'w-media-theme', render(b, c) { wRenderMedia(b, c, 'm'); }, onClick: wMediaOpenApp },
                { id: 'media-l', w: 4, h: 4, sizeKey: 'widgets.size.large', theme: 'w-media-theme', render(b, c) { wRenderMedia(b, c, 'l'); }, onClick: wMediaOpenApp }
            ]
        },
        {
            id: 'quicknotes',
            nameKey: 'widgets.app.quicknotes',
            descKey: 'widgets.app.quicknotes.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Edit Pen.svg',
            variants: [
                { id: 'quicknotes-s', w: 2, h: 2, sizeKey: 'widgets.size.small', theme: 'w-quicknotes', render(b, c) { wRenderQuickNotes(b, c, 's'); }, onClick: wQuickNotesOpenApp },
                { id: 'quicknotes-m', w: 4, h: 2, sizeKey: 'widgets.size.medium', theme: 'w-quicknotes', render(b, c) { wRenderQuickNotes(b, c, 'm'); }, onClick: wQuickNotesOpenApp },
                { id: 'quicknotes-tall', w: 2, h: 4, sizeKey: 'widgets.size.tall', theme: 'w-quicknotes', render(b, c) { wRenderQuickNotes(b, c, 'tall'); }, onClick: wQuickNotesOpenApp },
                { id: 'quicknotes-l', w: 4, h: 4, sizeKey: 'widgets.size.large', theme: 'w-quicknotes', render(b, c) { wRenderQuickNotes(b, c, 'l'); }, onClick: wQuickNotesOpenApp }
            ]
        },
        {
            id: 'search',
            nameKey: 'widgets.app.search',
            descKey: 'widgets.app.search.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Search.svg',
            variants: [
                { id: 'search-capsule', w: 4, h: 1, sizeKey: 'widgets.size.capsule', theme: 'w-search', defaultSettings: { engine: 'bing' }, render(b, c) { wRenderSearch(b, c); }, renderEditor: wRenderSearchEditor }
            ]
        },
        {
            id: 'favorites',
            nameKey: 'widgets.app.favorites',
            descKey: 'widgets.app.favorites.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Bookmark.svg',
            variants: [
                { id: 'favorites-s', w: 2, h: 2, sizeKey: 'widgets.size.small', theme: 'w-favorites', render(b, c) { wRenderFavoriteSites(b, c, 's'); }, renderEditor: wRenderFavoriteSitesEditor },
                { id: 'favorites-m', w: 4, h: 2, sizeKey: 'widgets.size.medium', theme: 'w-favorites', render(b, c) { wRenderFavoriteSites(b, c, 'm'); }, renderEditor: wRenderFavoriteSitesEditor },
                { id: 'favorites-tall', w: 2, h: 4, sizeKey: 'widgets.size.tall', theme: 'w-favorites', render(b, c) { wRenderFavoriteSites(b, c, 'tall'); }, renderEditor: wRenderFavoriteSitesEditor },
                { id: 'favorites-l', w: 4, h: 4, sizeKey: 'widgets.size.large', theme: 'w-favorites', render(b, c) { wRenderFavoriteSites(b, c, 'l'); }, renderEditor: wRenderFavoriteSitesEditor }
            ]
        },
        {
            id: 'news',
            nameKey: 'widgets.app.news',
            descKey: 'widgets.app.news.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Broadcast.svg',
            variants: [
                { id: 'news-m', w: 4, h: 2, sizeKey: 'widgets.size.medium', theme: 'w-news', defaultSettings: { source: 'weibo' }, render(b, c) { wRenderNews(b, c, 'm'); }, renderEditor: wRenderNewsEditor },
                { id: 'news-l', w: 4, h: 4, sizeKey: 'widgets.size.large', theme: 'w-news', defaultSettings: { source: 'weibo' }, render(b, c) { wRenderNews(b, c, 'l'); }, renderEditor: wRenderNewsEditor }
            ]
        },
        {
            id: 'lunar',
            nameKey: 'widgets.app.lunar',
            descKey: 'widgets.app.lunar.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Moon.svg',
            variants: [
                { id: 'lunar-tall', w: 2, h: 4, sizeKey: 'widgets.size.tall', theme: 'w-lunar', render(b, c) { wRenderLunar(b, c, 'tall'); } },
                { id: 'lunar-l', w: 4, h: 4, sizeKey: 'widgets.size.large', theme: 'w-lunar', render(b, c) { wRenderLunar(b, c, 'l'); } }
            ]
        },
        {
            id: 'tracking',
            nameKey: 'widgets.app.tracking',
            descKey: 'widgets.app.tracking.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Delivery Truck.svg',
            variants: [
                { id: 'tracking-m', w: 4, h: 2, sizeKey: 'widgets.size.medium', theme: 'w-tracking', render(b, c) { wRenderTracking(b, c, 'm'); } },
                { id: 'tracking-l', w: 4, h: 4, sizeKey: 'widgets.size.large', theme: 'w-tracking', render(b, c) { wRenderTracking(b, c, 'l'); } }
            ]
        },
        {
            id: 'holiday',
            nameKey: 'widgets.app.holiday',
            descKey: 'widgets.app.holiday.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Gift.svg',
            variants: [
                { id: 'holiday-m', w: 4, h: 2, sizeKey: 'widgets.size.medium', theme: 'w-holiday', render(b, c) { wRenderHoliday(b, c, 'm'); } },
                { id: 'holiday-l', w: 4, h: 4, sizeKey: 'widgets.size.large', theme: 'w-holiday', render(b, c) { wRenderHoliday(b, c, 'l'); } }
            ]
        },
        {
            id: 'answerbook',
            nameKey: 'widgets.app.answerbook',
            descKey: 'widgets.app.answerbook.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Stars B.svg',
            variants: [
                { id: 'answerbook-m', w: 4, h: 2, sizeKey: 'widgets.size.medium', theme: 'w-answer-theme', render(b, c) { wRenderAnswerBook(b, c); } }
            ]
        },
        {
            id: 'word',
            nameKey: 'widgets.app.word',
            descKey: 'widgets.app.word.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Book Text.svg',
            variants: [
                { id: 'word-s', w: 2, h: 2, sizeKey: 'widgets.size.small', theme: 'w-word-theme', render(b, c) { wRenderWord(b, c, 's'); } },
                { id: 'word-m', w: 4, h: 2, sizeKey: 'widgets.size.medium', theme: 'w-word-theme', render(b, c) { wRenderWord(b, c, 'm'); } }
            ]
        }
    ],

    /** Common widgets recommended in the add-widget panel. */
    recommended: [
        'weather-m', 'clock-analog', 'calendar-s', 'search-capsule',
        'quicknotes-m', 'favorites-m', 'media-m', 'photos-m', 'word-s', 'lunar-tall', 'news-m', 'holiday-m', 'answerbook-m'
    ],

    getApp(appId) {
        return this.apps.find(a => a.id === appId) || null;
    },

    getAllVariants() {
        const out = [];
        this.apps.forEach(app => {
            app.variants.forEach(v => {
                out.push(Object.assign(v, { appId: app.id, appNameKey: app.nameKey }));
            });
        });
        return out;
    },

    getVariant(variantId) {
        for (const app of this.apps) {
            const v = app.variants.find(x => x.id === variantId);
            if (v) return v;
        }
        return null;
    }
};
