/**
 * 小组件定义（WidgetDefs）
 *
 * 在这里登记所有真实小组件。每个「小组件应用」包含若干尺寸形态（variants）。
 *
 * 应用结构：
 *   { id, nameKey, descKey, icon, recommend: [variantId...], variants: [...] }
 *
 * 形态（variant）结构：
 *   {
 *     id,                  // 全局唯一，作为实例的 widgetId
 *     w, h,                // 网格单元格数
 *     sizeKey,             // 尺寸名称的 i18n key
 *     theme,               // body 上附加的样式类（w-xxx）
 *     defaultSettings?,    // 实例默认设置
 *     render(body, ctx),   // 渲染内容；ctx: { instance, surface, isPreview, setSettings() }
 *     onClick?(ctx),       // 普通模式下点击整个小组件（仅桌面）
 *     getMenu?(ctx)        // 右键菜单项 [{ label, action }]
 *   }
 *
 * 数据接口：
 *   - 天气：Open-Meteo（与天气 App 相同）
 *   - Bing 壁纸：bing.biturl.top（与照片 App 相同）
 *   - 热榜 / 农历 / 快递 / 节假日 / 票房 / 每日单词：uapis.cn
 */

/* ==================== 工具 ==================== */

/** 带 TTL 的内存数据缓存，避免重复请求 */
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

/** HTML 转义 */
function wEsc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

/** 与元素生命周期绑定的定时器：元素移出 DOM 后自动停止 */
function wTick(el, ms, fn) {
    fn();
    const id = setInterval(() => {
        if (!el.isConnected) { clearInterval(id); return; }
        fn();
    }, ms);
}

/** 异步渲染包装：loading → 内容 / 错误 */
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

/** 在内置浏览器中打开链接（仅桌面普通模式） */
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

/** 普通模式下点击是否应该生效 */
function wClickable(ctx) {
    if (ctx.isPreview) return false;
    if (typeof Widgets !== 'undefined' && Widgets.isOpen) return false;
    return true;
}

/** 指定时区的当前时间 */
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
    const fallbackZh = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const fallbackEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const v = t(keys[d.getDay()]);
    if (v && v !== keys[d.getDay()]) return v;
    const lang = (typeof I18n !== 'undefined' && I18n.currentLang === 'en') ? fallbackEn : fallbackZh;
    return lang[d.getDay()];
}

/* ==================== 天气 ==================== */

/** WMO 天气码 → 新版天气图标路径（与天气 App 共用同一套映射） */
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

/** 小组件天气数据有效期：1 小时 */
const W_WEATHER_WIDGET_TTL = 60 * 60 * 1000;

async function wFetchWeather(cityKey) {
    const locs = wWeatherLocations();
    const loc = locs[cityKey] || locs.beijing;
    // 与天气 App 共用同一份缓存：App 内 20 分钟刷新，小组件 1 小时刷新；
    // App 拿到新数据时小组件会通过 weatherDataUpdate 事件同步。
    if (window.WeatherApp && typeof WeatherApp.getWeather === 'function') {
        return WeatherApp.getWeather(loc.lat, loc.lon, W_WEATHER_WIDGET_TTL);
    }
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`;
    return WidgetData.getJSON(`weather-${cityKey}`, W_WEATHER_WIDGET_TTL, url);
}

function wWeatherCity(ctx) {
    return (ctx.instance && ctx.instance.settings && ctx.instance.settings.city) || 'beijing';
}

function wWeatherCityName(cityKey) {
    const loc = wWeatherLocations()[cityKey];
    return loc ? t(loc.nameKey) : t('weather.beijing');
}

function wRenderWeather(body, ctx, size) {
    const city = wWeatherCity(ctx);
    wAsync(body, async () => {
        const data = await wFetchWeather(city);
        if (!body.isConnected) return;
        const cur = data.current_weather || {};
        const daily = data.daily || {};
        const desc = wWeatherDesc(cur.weathercode);
        const hi = Math.round(daily.temperature_2m_max?.[0] ?? 0);
        const lo = Math.round(daily.temperature_2m_min?.[0] ?? 0);

        const days = (daily.time || []).slice(1, size === 'l' ? 6 : 5).map((dateStr, i) => {
            const idx = i + 1;
            const d = new Date(dateStr);
            return {
                label: `${d.getMonth() + 1}/${d.getDate()}`,
                code: daily.weathercode?.[idx],
                hi: Math.round(daily.temperature_2m_max?.[idx] ?? 0),
                lo: Math.round(daily.temperature_2m_min?.[idx] ?? 0)
            };
        });

        const head = `
            <div class="w-weather-head">
                <div class="w-weather-city">${wEsc(wWeatherCityName(city))}</div>
                <div class="w-weather-temp-row">
                    <span class="w-weather-temp">${Math.round(cur.temperature ?? 0)}°</span>
                    ${wWeatherIconImg(cur.weathercode, 'w-weather-cur-icon')}
                </div>
                <div class="w-weather-desc">${wEsc(desc)}</div>
                <div class="w-weather-range">${hi}° / ${lo}°</div>
            </div>`;

        if (size === 's') {
            body.innerHTML = head;
        } else if (size === 'm') {
            body.innerHTML = `
                <div class="w-weather-row">
                    ${head}
                    <div class="w-weather-days">
                        ${days.slice(0, 4).map(d => `
                            <div class="w-weather-day">
                                <div class="w-wd-label">${d.label}</div>
                                ${wWeatherIconImg(d.code, 'w-wd-icon')}
                                <div class="w-wd-temp">${d.hi}°</div>
                                <div class="w-wd-temp lo">${d.lo}°</div>
                            </div>`).join('')}
                    </div>
                </div>`;
        } else {
            body.innerHTML = `
                ${head}
                <div class="w-weather-list">
                    ${days.map(d => `
                        <div class="w-weather-list-row">
                            <span>${d.label}</span>
                            ${wWeatherIconImg(d.code, 'w-wl-icon')}
                            <span class="w-wd-range">${d.lo}° ~ ${d.hi}°</span>
                        </div>`).join('')}
                </div>`;
        }
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

/* ==================== 时钟 ==================== */

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

/* ==================== 日历 ==================== */

function wTodayEvents() {
    const data = Storage.get('clock_data') || {};
    const events = Array.isArray(data.events) ? data.events : [];
    const todayStr = new Date().toDateString();
    return events
        .filter(e => e && e.date && new Date(e.date).toDateString() === todayStr)
        .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
}

function wRenderCalendar(body, ctx, size) {
    const update = () => {
        const now = new Date();
        const events = wTodayEvents();
        const dateBlock = `
            <div class="w-cal-date">
                <div class="w-cal-week">${wWeekday(now)}</div>
                <div class="w-cal-day">${now.getDate()}</div>
                <div class="w-cal-month">${now.getFullYear()}/${wPad(now.getMonth() + 1)}</div>
            </div>`;
        const maxItems = size === 'l' ? 7 : 3;
        const list = events.length === 0
            ? `<div class="w-cal-empty">${t('widgets.calendar.no-todos')}</div>`
            : events.slice(0, maxItems).map(e => `
                <div class="w-cal-item">
                    <span class="w-cal-item-time">${wEsc(e.time || '')}</span>
                    <span class="w-cal-item-title">${wEsc(e.title || '')}</span>
                </div>`).join('') +
              (events.length > maxItems ? `<div class="w-cal-more">+${events.length - maxItems}</div>` : '');

        if (size === 's') {
            body.innerHTML = `
                ${dateBlock}
                <div class="w-cal-count">${events.length > 0 ? t('widgets.calendar.count', { n: events.length }) : t('widgets.calendar.no-todos')}</div>`;
        } else {
            body.innerHTML = `
                <div class="w-cal-split ${size === 'l' ? 'vertical' : ''}">
                    ${dateBlock}
                    <div class="w-cal-list">
                        <div class="w-cal-list-title">${t('widgets.calendar.todos')}</div>
                        ${list}
                    </div>
                </div>`;
        }
    };
    wTick(body, 60 * 1000, update);
}

/* ==================== 照片（Bing 壁纸） ==================== */

async function wFetchBing() {
    return WidgetData.getJSON('bing-today', 60 * 60 * 1000,
        'https://bing.biturl.top/?resolution=1920&format=json&index=0&mkt=zh-CN');
}

function wRenderPhotos(body, ctx, size) {
    wAsync(body, async () => {
        const data = await wFetchBing();
        if (!body.isConnected) return;
        const title = (data.copyright || '').split(/[（(]/)[0].trim();
        body.innerHTML = `
            <div class="w-photo" style="background-image:url('${wEsc(data.url)}')">
                <div class="w-photo-overlay">
                    <div class="w-photo-tag">${t('widgets.photos.bing')}</div>
                    ${size !== 's' ? `<div class="w-photo-title">${wEsc(title)}</div>` : ''}
                </div>
            </div>`;
    });
}

/* ==================== 搜索 ==================== */

function wRenderSearch(body, ctx) {
    body.innerHTML = `
        <div class="w-search-pill">
            <img src="Theme/Icon/Symbol_icon/stroke/Search.svg" alt="">
            <input type="text" placeholder="${t('widgets.search.placeholder')}" ${ctx.isPreview ? 'disabled' : ''}>
            <button class="w-search-go">${t('widgets.search.go')}</button>
        </div>`;
    if (ctx.isPreview) return;

    const input = body.querySelector('input');
    const go = () => {
        const q = input.value.trim();
        if (!q) return;
        if (ctx.surface === 'lock') {
            // 锁屏搜索：跳转外部浏览器
            window.open(`https://www.bing.com/search?q=${encodeURIComponent(q)}`, '_blank');
        } else {
            // 桌面搜索：使用内置浏览器 App
            wOpenInBrowser(q, ctx);
        }
        input.value = '';
        input.blur();
    };

    input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') go();
    });
    input.addEventListener('click', (e) => e.stopPropagation());
    body.querySelector('.w-search-go').addEventListener('click', (e) => {
        e.stopPropagation();
        go();
    });
}

/* ==================== 今日新闻（热榜） ==================== */

async function wFetchHotboard() {
    return WidgetData.getJSON('hotboard-weibo', 10 * 60 * 1000,
        'https://uapis.cn/api/v1/misc/hotboard?type=weibo');
}

function wRenderNews(body, ctx, size) {
    wAsync(body, async () => {
        const data = await wFetchHotboard();
        if (!body.isConnected) return;
        const list = (data.list || []).slice(0, size === 'l' ? 9 : 4);
        body.innerHTML = `
            <div class="w-list-head">
                <span class="w-list-title">📰 ${t('widgets.news.title')}</span>
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

function wFormatHot(v) {
    const n = parseInt(v, 10);
    if (!isFinite(n)) return '';
    return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : String(n);
}

/* ==================== 农历 ==================== */

async function wFetchLunar() {
    return WidgetData.getJSON('lunartime', 30 * 60 * 1000,
        'https://uapis.cn/api/v1/misc/lunartime');
}

function wRenderLunar(body, ctx, size) {
    wAsync(body, async () => {
        const data = await wFetchLunar();
        if (!body.isConnected) return;
        const now = new Date();
        const extra = [data.solar_term, data.lunar_festival, data.festival]
            .filter(Boolean).map(wEsc).join(' · ');
        body.innerHTML = `
            <div class="w-lunar ${size === 'l' ? 'large' : ''}">
                <div class="w-lunar-tag">${t('widgets.lunar.title')}</div>
                <div class="w-lunar-day">${wEsc(data.lunar_day_cn || '--')}</div>
                <div class="w-lunar-month">${wEsc(data.lunar_month_cn || '')}</div>
                <div class="w-lunar-ganzhi">${wEsc(data.ganzhi_year || '')}${data.zodiac ? `（${wEsc(data.zodiac)}）` : ''}</div>
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

/* ==================== 快递查询 ==================== */

async function wFetchTracking(no) {
    return WidgetData.get(`tracking-${no}`, 5 * 60 * 1000, async () => {
        const res = await fetch(`https://uapis.cn/api/v1/misc/tracking/query?tracking_number=${encodeURIComponent(no)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
        return json;
    });
}

/** 在未知结构的响应中提取物流轨迹数组 */
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

/* ==================== 节假日 ==================== */

async function wFetchHoliday() {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${wPad(now.getMonth() + 1)}-${wPad(now.getDate())}`;
    return WidgetData.getJSON(`holiday-${dateStr}`, 6 * 60 * 60 * 1000,
        `https://uapis.cn/api/v1/misc/holiday-calendar?date=${dateStr}&include_nearby=true&nearby_limit=8&exclude_past=true`);
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

/* ==================== 电影票房 ==================== */

async function wFetchBoxOffice() {
    return WidgetData.getJSON('boxoffice', 10 * 60 * 1000,
        'https://uapis.cn/api/v1/misc/movie-box-office');
}

function wRenderBoxOffice(body, ctx, size) {
    wAsync(body, async () => {
        const data = await wFetchBoxOffice();
        if (!body.isConnected) return;
        const list = (data.list || []).slice(0, size === 'l' ? 7 : 3);
        const market = data.market || {};
        body.innerHTML = `
            <div class="w-list-head">
                <span class="w-list-title">🎬 ${t('widgets.boxoffice.title')}</span>
                <span class="w-list-sub">${t('widgets.boxoffice.total')} ${wEsc(market.box_office || '--')}</span>
            </div>
            <div class="w-list-body">
                ${list.map(mv => `
                    <div class="w-movie-row" data-url="${wEsc(mv.detail_url || '')}">
                        <span class="w-news-rank r${mv.rank}">${mv.rank}</span>
                        <span class="w-movie-name">${wEsc(mv.movie_name)}</span>
                        <span class="w-movie-box">${wEsc(mv.box_office || '')}</span>
                        ${size === 'l' ? `<span class="w-movie-rate">${wEsc(mv.box_office_rate || '')}</span>` : ''}
                    </div>`).join('')}
            </div>`;
        body.querySelectorAll('.w-movie-row').forEach(row => {
            row.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!wClickable(ctx)) return;
                const url = row.dataset.url;
                if (url) wOpenInBrowser(url, ctx);
            });
        });
    });
}

/* ==================== 每日单词 ==================== */

async function wFetchDailyWord() {
    return WidgetData.getJSON('dailyword', 6 * 60 * 60 * 1000,
        'https://uapis.cn/api/v1/daily/word');
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

/* ==================== 注册表 ==================== */

const WidgetDefs = {
    apps: [
        {
            id: 'weather',
            nameKey: 'widgets.app.weather',
            descKey: 'widgets.app.weather.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Sun.svg',
            variants: [
                { id: 'weather-s', w: 2, h: 2, sizeKey: 'widgets.size.small', theme: 'w-weather', defaultSettings: { city: 'beijing' }, render(b, c) { wRenderWeather(b, c, 's'); }, onClick: wWeatherClick, getMenu: wWeatherMenu },
                { id: 'weather-m', w: 4, h: 2, sizeKey: 'widgets.size.medium', theme: 'w-weather', defaultSettings: { city: 'beijing' }, render(b, c) { wRenderWeather(b, c, 'm'); }, onClick: wWeatherClick, getMenu: wWeatherMenu },
                { id: 'weather-l', w: 4, h: 4, sizeKey: 'widgets.size.large', theme: 'w-weather', defaultSettings: { city: 'beijing' }, render(b, c) { wRenderWeather(b, c, 'l'); }, onClick: wWeatherClick, getMenu: wWeatherMenu }
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
                { id: 'calendar-l', w: 4, h: 4, sizeKey: 'widgets.size.large', theme: 'w-calendar', render(b, c) { wRenderCalendar(b, c, 'l'); }, onClick() { WindowManager.openApp('clock', { tab: 'calendar' }); } }
            ]
        },
        {
            id: 'photos',
            nameKey: 'widgets.app.photos',
            descKey: 'widgets.app.photos.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Image.svg',
            variants: [
                { id: 'photos-s', w: 2, h: 2, sizeKey: 'widgets.size.small', theme: 'w-photos', render(b, c) { wRenderPhotos(b, c, 's'); }, onClick() { WindowManager.openApp('photos'); } },
                { id: 'photos-m', w: 4, h: 2, sizeKey: 'widgets.size.medium', theme: 'w-photos', render(b, c) { wRenderPhotos(b, c, 'm'); }, onClick() { WindowManager.openApp('photos'); } },
                { id: 'photos-l', w: 4, h: 4, sizeKey: 'widgets.size.large', theme: 'w-photos', render(b, c) { wRenderPhotos(b, c, 'l'); }, onClick() { WindowManager.openApp('photos'); } }
            ]
        },
        {
            id: 'search',
            nameKey: 'widgets.app.search',
            descKey: 'widgets.app.search.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Search.svg',
            variants: [
                { id: 'search-capsule', w: 4, h: 1, sizeKey: 'widgets.size.capsule', theme: 'w-search', render(b, c) { wRenderSearch(b, c); } }
            ]
        },
        {
            id: 'news',
            nameKey: 'widgets.app.news',
            descKey: 'widgets.app.news.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Broadcast.svg',
            variants: [
                { id: 'news-m', w: 4, h: 2, sizeKey: 'widgets.size.medium', theme: 'w-news', render(b, c) { wRenderNews(b, c, 'm'); } },
                { id: 'news-l', w: 4, h: 4, sizeKey: 'widgets.size.large', theme: 'w-news', render(b, c) { wRenderNews(b, c, 'l'); } }
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
            id: 'boxoffice',
            nameKey: 'widgets.app.boxoffice',
            descKey: 'widgets.app.boxoffice.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Video Player.svg',
            variants: [
                { id: 'boxoffice-m', w: 4, h: 2, sizeKey: 'widgets.size.medium', theme: 'w-boxoffice', render(b, c) { wRenderBoxOffice(b, c, 'm'); } },
                { id: 'boxoffice-l', w: 4, h: 4, sizeKey: 'widgets.size.large', theme: 'w-boxoffice', render(b, c) { wRenderBoxOffice(b, c, 'l'); } }
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

    /** 首页推荐的小组件形态 */
    recommended: [
        'weather-m', 'clock-analog', 'calendar-s', 'search-capsule',
        'photos-m', 'word-s', 'lunar-tall', 'news-m', 'holiday-m', 'boxoffice-m'
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
