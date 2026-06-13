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

const W_UAPIS_ORIGIN = 'https://uapis.cn';

function wUapisUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    return `${W_UAPIS_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

function wProxyUrls(url) {
    return [
        `https://r.jina.ai/http://${url}`,
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
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
    const urls = [...wProxyUrls(url), url];
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

function wRenderWeatherEditor(container, ctx) {
    const cur = wWeatherCity(ctx);
    container.innerHTML = `
        <div class="widget-edit-panel">
            <div class="widget-edit-head">
                <img src="Theme/Icon/Symbol_icon/stroke/Sun.svg" alt="">
                <div>
                    <div class="widget-edit-title">天气地点</div>
                    <div class="widget-edit-subtitle">选择天气小组件显示的城市。</div>
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
            <button class="w-search-go">${W_SEARCH_ENGINES[engine].name}</button>
        </div>`;
    if (ctx.isPreview) return;

    const input = body.querySelector('input');
    const go = () => {
        const q = input.value.trim();
        if (!q) return;
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
    body.querySelector('.w-search-go').addEventListener('click', (e) => {
        e.stopPropagation();
        go();
    });
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

/* ==================== 今日新闻（热榜） ==================== */

const W_HOTBOARD_SOURCES = {
    bilibili: '哔哩哔哩',
    acfun: 'A站',
    weibo: '微博热搜',
    'zhihu': '知乎热榜',
    'zhihu-daily': '知乎日报',
    douyin: '抖音',
    xiaohongshu: '小红书',
    kuaishou: '快手',
    'douban-movie': '豆瓣电影',
    'douban-group': '豆瓣小组',
    tieba: '百度贴吧',
    hupu: '虎扑',
    ngabbs: 'NGA论坛',
    v2ex: 'V2EX',
    '52pojie': '吾爱破解',
    hostloc: '全球主机交流',
    coolapk: '酷安',
    baidu: '百度热搜',
    thepaper: '澎湃新闻',
    toutiao: '今日头条',
    'qq-news': '腾讯新闻',
    sina: '新浪热搜',
    'sina-news': '新浪新闻',
    'netease-news': '网易新闻',
    huxiu: '虎嗅',
    ifanr: '爱范儿',
    sspai: '少数派',
    ithome: 'IT之家',
    'ithome-xijiayi': 'IT之家喜加一',
    juejin: '掘金',
    jianshu: '简书',
    guokr: '果壳',
    '36kr': '36氪',
    '51cto': '51CTO',
    csdn: 'CSDN',
    nodeseek: 'NodeSeek',
    hellogithub: 'HelloGitHub',
    lol: '英雄联盟',
    genshin: '原神',
    honkai: '崩坏3',
    starrail: '星穹铁道',
    'netease-music': '网易云音乐热歌榜',
    'qq-music': 'QQ音乐热歌榜',
    weread: '微信读书',
    weatheralarm: '天气预警',
    earthquake: '地震速报',
    history: '历史上的今天'
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
                <span class="w-list-title">📰 ${wEsc(sourceName || t('widgets.news.title'))}</span>
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
                    <div class="widget-edit-title">热榜来源</div>
                    <div class="widget-edit-subtitle">选择今日热榜小组件展示的数据来源。</div>
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
    return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : String(n);
}

/* ==================== 农历 ==================== */

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
        return wFetchUapisJSON(`/api/v1/misc/tracking/query?tracking_number=${encodeURIComponent(no)}`);
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

/* ==================== 答案之书 ==================== */

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
            display.textContent = `「${data.answer || t('widgets.error')}」`;
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

/* ==================== 每日单词 ==================== */

/**
 * 本地词库兜底：uapis 的 /daily/word 接口禁止浏览器跨域免 key 调用
 * （返回 403 CORS_FORBIDDEN），所以接口失败时按日期从本地词库取词，
 * 保证同一天取到的单词一致。
 */
const W_WORD_BANK = [
    { word: 'serene', phonetic: '/səˈriːn/', translation: 'adj. 平静的，安详的', examples: [{ text: 'The lake was serene in the morning light.', translation: '晨光中的湖面一片宁静。' }] },
    { word: 'diligent', phonetic: '/ˈdɪlɪdʒənt/', translation: 'adj. 勤奋的，用功的', examples: [{ text: 'She is a diligent student who never misses a class.', translation: '她是个从不缺课的勤奋学生。' }] },
    { word: 'abundant', phonetic: '/əˈbʌndənt/', translation: 'adj. 丰富的，充裕的', examples: [{ text: 'The region has abundant natural resources.', translation: '这个地区自然资源丰富。' }] },
    { word: 'genuine', phonetic: '/ˈdʒenjuɪn/', translation: 'adj. 真正的，真诚的', examples: [{ text: 'Her smile was warm and genuine.', translation: '她的微笑温暖而真诚。' }] },
    { word: 'persist', phonetic: '/pəˈsɪst/', translation: 'v. 坚持，持续', examples: [{ text: 'If you persist, you will succeed.', translation: '只要坚持，你就会成功。' }] },
    { word: 'crucial', phonetic: '/ˈkruːʃl/', translation: 'adj. 关键的，至关重要的', examples: [{ text: 'Timing is crucial to the success of the plan.', translation: '时机对计划的成功至关重要。' }] },
    { word: 'embrace', phonetic: '/ɪmˈbreɪs/', translation: 'v. 拥抱；欣然接受', examples: [{ text: 'We should embrace new technologies.', translation: '我们应该欣然接受新技术。' }] },
    { word: 'flourish', phonetic: '/ˈflʌrɪʃ/', translation: 'v. 繁荣，茁壮成长', examples: [{ text: 'Plants flourish in this warm climate.', translation: '植物在这种温暖的气候里长势喜人。' }] },
    { word: 'insight', phonetic: '/ˈɪnsaɪt/', translation: 'n. 洞察力，深刻见解', examples: [{ text: 'The book offers great insight into human nature.', translation: '这本书对人性有深刻的洞察。' }] },
    { word: 'modest', phonetic: '/ˈmɒdɪst/', translation: 'adj. 谦虚的；适度的', examples: [{ text: 'He remained modest despite his success.', translation: '尽管成功了，他依然保持谦逊。' }] },
    { word: 'navigate', phonetic: '/ˈnævɪɡeɪt/', translation: 'v. 导航，驾驭；找到方向', examples: [{ text: 'Sailors used the stars to navigate at sea.', translation: '水手们靠星星在海上导航。' }] },
    { word: 'optimistic', phonetic: '/ˌɒptɪˈmɪstɪk/', translation: 'adj. 乐观的', examples: [{ text: 'She is optimistic about the future.', translation: '她对未来很乐观。' }] },
    { word: 'profound', phonetic: '/prəˈfaʊnd/', translation: 'adj. 深刻的，深远的', examples: [{ text: 'The discovery had a profound impact on science.', translation: '这一发现对科学产生了深远影响。' }] },
    { word: 'resilient', phonetic: '/rɪˈzɪliənt/', translation: 'adj. 有韧性的，能快速恢复的', examples: [{ text: 'Children are often remarkably resilient.', translation: '孩子们往往有惊人的恢复力。' }] },
    { word: 'subtle', phonetic: '/ˈsʌtl/', translation: 'adj. 微妙的，不易察觉的', examples: [{ text: 'There is a subtle difference between the two colors.', translation: '这两种颜色之间有细微的差别。' }] },
    { word: 'thrive', phonetic: '/θraɪv/', translation: 'v. 茁壮成长，兴旺', examples: [{ text: 'Small businesses thrive in this city.', translation: '小企业在这座城市蓬勃发展。' }] },
    { word: 'vivid', phonetic: '/ˈvɪvɪd/', translation: 'adj. 生动的，鲜明的', examples: [{ text: 'She gave a vivid description of the trip.', translation: '她对这次旅行做了生动的描述。' }] },
    { word: 'wisdom', phonetic: '/ˈwɪzdəm/', translation: 'n. 智慧，才智', examples: [{ text: 'Age brings wisdom and experience.', translation: '年龄带来智慧和经验。' }] },
    { word: 'curious', phonetic: '/ˈkjʊəriəs/', translation: 'adj. 好奇的，求知欲强的', examples: [{ text: 'Cats are naturally curious animals.', translation: '猫天生就是好奇的动物。' }] },
    { word: 'elegant', phonetic: '/ˈelɪɡənt/', translation: 'adj. 优雅的，简洁巧妙的', examples: [{ text: 'The mathematician found an elegant solution.', translation: '这位数学家找到了一个简洁巧妙的解法。' }] },
    { word: 'harmony', phonetic: '/ˈhɑːməni/', translation: 'n. 和谐，融洽', examples: [{ text: 'They live in harmony with nature.', translation: '他们与自然和谐相处。' }] },
    { word: 'inspire', phonetic: '/ɪnˈspaɪə/', translation: 'v. 鼓舞，激励；赋予灵感', examples: [{ text: 'Her courage inspired everyone around her.', translation: '她的勇气鼓舞了身边的每一个人。' }] },
    { word: 'journey', phonetic: '/ˈdʒɜːni/', translation: 'n. 旅程，历程', examples: [{ text: 'Life is a journey, not a destination.', translation: '人生是一段旅程，而非终点。' }] },
    { word: 'keen', phonetic: '/kiːn/', translation: 'adj. 热衷的；敏锐的', examples: [{ text: 'She has a keen eye for detail.', translation: '她对细节有敏锐的眼光。' }] },
    { word: 'luminous', phonetic: '/ˈluːmɪnəs/', translation: 'adj. 发光的，明亮的', examples: [{ text: 'The clock has a luminous dial.', translation: '这只钟有一个夜光表盘。' }] },
    { word: 'mature', phonetic: '/məˈtʃʊə/', translation: 'adj. 成熟的 v. 成熟', examples: [{ text: 'He is very mature for his age.', translation: '就他的年龄而言，他非常成熟。' }] },
    { word: 'noble', phonetic: '/ˈnəʊbl/', translation: 'adj. 高尚的，崇高的', examples: [{ text: 'Helping others is a noble cause.', translation: '帮助他人是一项高尚的事业。' }] },
    { word: 'overcome', phonetic: '/ˌəʊvəˈkʌm/', translation: 'v. 克服，战胜', examples: [{ text: 'She overcame many difficulties to finish school.', translation: '她克服了重重困难完成了学业。' }] },
    { word: 'patient', phonetic: '/ˈpeɪʃnt/', translation: 'adj. 耐心的 n. 病人', examples: [{ text: 'Be patient; good things take time.', translation: '耐心点，美好的事物需要时间。' }] },
    { word: 'remarkable', phonetic: '/rɪˈmɑːkəbl/', translation: 'adj. 非凡的，值得注意的', examples: [{ text: 'The team made remarkable progress this year.', translation: '团队今年取得了非凡的进步。' }] },
    { word: 'sincere', phonetic: '/sɪnˈsɪə/', translation: 'adj. 真诚的，诚挚的', examples: [{ text: 'Please accept my sincere apologies.', translation: '请接受我诚挚的歉意。' }] },
    { word: 'tranquil', phonetic: '/ˈtræŋkwɪl/', translation: 'adj. 安静的，平静的', examples: [{ text: 'We spent a tranquil evening by the river.', translation: '我们在河边度过了一个宁静的夜晚。' }] }
];

async function wFetchDailyWord() {
    return WidgetData.get('dailyword', 6 * 60 * 60 * 1000, async () => {
        try {
            const data = await wFetchUapisJSON('/api/v1/daily/word');
            if (data && Array.isArray(data.words) && data.words.length) return data;
        } catch (_) { /* 跨域被拒或网络错误，走本地词库 */ }
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

/* ==================== 多媒体 ==================== */

/** 无封面时的渐变占位（与多媒体 App 的渐变风格一致） */
const W_MEDIA_GRADIENTS = [
    'linear-gradient(135deg, #ff6b35 0%, #ffb347 52%, #ffe1c2 100%)',
    'linear-gradient(135deg, #ff2d55 0%, #ff7aa2 50%, #ffd1dc 100%)',
    'linear-gradient(135deg, #5856d6 0%, #8e8cf0 50%, #d6d5ff 100%)',
    'linear-gradient(135deg, #0a84ff 0%, #5ac8fa 55%, #d2f0ff 100%)',
    'linear-gradient(135deg, #34c759 0%, #7be495 55%, #d9f7e2 100%)'
];

/** themeColors 缺失时按 gradientIndex 取的兜底主题色 */
const W_MEDIA_FALLBACK_COLORS = [
    ['hsl(18, 76%, 56%)', 'hsl(28, 84%, 50%)'],
    ['hsl(350, 80%, 55%)', 'hsl(338, 86%, 48%)'],
    ['hsl(242, 64%, 60%)', 'hsl(250, 72%, 52%)'],
    ['hsl(210, 92%, 52%)', 'hsl(200, 96%, 46%)'],
    ['hsl(135, 58%, 48%)', 'hsl(150, 66%, 40%)']
];

/**
 * 取「最近播放」曲目。
 * 优先读运行中的 MediaApp（有封面 blob 与实时播放状态）；
 * App 未打开时退回 localStorage 里的曲库清单（无封面，但有持久化的主题色）。
 */
function wMediaTrack() {
    if (window.MediaApp && Array.isArray(MediaApp.library) && MediaApp.library.length) {
        const lib = MediaApp.library;
        const live = (MediaApp.currentIndex >= 0 && lib[MediaApp.currentIndex])
            ? lib[MediaApp.currentIndex]
            : lib.slice().sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))[0];
        const media = MediaApp.mediaElement;
        const playing = !!(media && !media.paused && media.dataset.itemId === live.id);
        return {
            id: live.id,
            title: live.title,
            artist: live.artist,
            coverUrl: live.coverUrl || '',
            themeColors: live.themeColors,
            gradientIndex: live.gradientIndex || 0,
            playing
        };
    }
    let manifest = [];
    try {
        manifest = JSON.parse(localStorage.getItem('fluentos.media.library.v1') || '[]');
    } catch (_) { manifest = []; }
    if (!Array.isArray(manifest) || !manifest.length) return null;
    const item = manifest.slice().sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))[0];
    return {
        id: item.id,
        title: item.title,
        artist: item.artist,
        coverUrl: '',
        themeColors: item.themeColors,
        gradientIndex: item.gradientIndex || 0,
        playing: false
    };
}

/** 取曲目主题色（两个），用于中尺寸卡片背景 */
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

/** 播放/暂停：App 已打开则直接切换；未打开则先打开 App，待曲库恢复后自动播放 */
function wMediaTogglePlay(ctx) {
    if (!wClickable(ctx) || ctx.surface !== 'desktop') return;
    if (window.MediaApp && MediaApp.container && MediaApp.library.length) {
        MediaApp.togglePlay();
        return;
    }
    WindowManager.openApp('media');
    let tries = 0;
    const timer = setInterval(() => {
        tries += 1;
        if (window.MediaApp && MediaApp.container && MediaApp.library.length) {
            clearInterval(timer);
            MediaApp.togglePlay(true);
        } else if (tries > 24) {
            clearInterval(timer);
        }
    }, 250);
}

function wRenderMedia(body, ctx, size) {
    const draw = (track) => {
        body.classList.toggle('w-media-medium', size === 'm');
        if (!track) {
            body.style.removeProperty('--w-media-c1');
            body.style.removeProperty('--w-media-c2');
            body.innerHTML = `
                <div class="w-media w-media-empty">
                    <img class="w-media-empty-icon" src="Theme/Icon/Symbol_icon/stroke/Music.svg" alt="">
                    <div class="w-media-empty-text">${t('widgets.media.empty')}</div>
                </div>`;
            return;
        }
        const [c1, c2] = wMediaColors(track);
        body.style.setProperty('--w-media-c1', c1);
        body.style.setProperty('--w-media-c2', c2);
        const artist = track.artist || t('widgets.media.unknown');
        const playBtn = `
            <button class="w-media-play" type="button">
                <img src="Theme/Icon/Symbol_icon/stroke/${track.playing ? 'Pause' : 'Play'}.svg" alt="">
                <span>${track.playing ? t('widgets.media.pause') : t('widgets.media.play')}</span>
            </button>`;
        if (size === 's') {
            // 小尺寸：封面铺满整张卡片，底部信息 + 羽化虚化的播放按钮
            body.innerHTML = `
                <div class="w-media w-media-s">
                    ${wMediaCoverHtml(track, 'w-media-cover-full')}
                    <div class="w-media-shade"></div>
                    <span class="w-media-note"></span>
                    <div class="w-media-overlay">
                        <div class="w-media-title">${wEsc(track.title)}</div>
                        <div class="w-media-artist">${wEsc(artist)}</div>
                        ${playBtn}
                    </div>
                </div>`;
        } else {
            // 中尺寸：左侧封面 + 右侧信息，卡片背景使用封面主题色
            body.innerHTML = `
                <div class="w-media w-media-m">
                    ${wMediaCoverHtml(track, 'w-media-cover-box')}
                    <div class="w-media-info">
                        <div class="w-media-tag">${t('widgets.media.recent')}</div>
                        <div class="w-media-title">${wEsc(track.title)}</div>
                        <div class="w-media-artist">${wEsc(artist)}</div>
                        ${playBtn}
                    </div>
                    <span class="w-media-note"></span>
                </div>`;
        }
        const btn = body.querySelector('.w-media-play');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                wMediaTogglePlay(ctx);
                // 播放状态变化后尽快刷新按钮
                setTimeout(refresh, 300);
                setTimeout(refresh, 800);
            });
        }
    };

    const refresh = () => {
        if (body.dataset.mediaSig && !body.isConnected) return;
        const track = wMediaTrack();
        const sig = track ? `${track.id}|${track.playing}|${track.coverUrl}` : 'empty';
        if (body.dataset.mediaSig === sig) return;
        body.dataset.mediaSig = sig;
        draw(track);
    };

    body.dataset.mediaSig = '';
    wTick(body, 2000, refresh);
}

function wMediaOpenApp(ctx) {
    WindowManager.openApp('media');
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
        const sites = service ? await service.getDisplaySites(limit) : [];
        if (!body.isConnected) return;

        if (!sites.length) {
            const emptyText = t('widgets.favorites.empty');
            body.innerHTML = `<div class="w-loading">${emptyText === 'widgets.favorites.empty' ? '暂无收藏网站' : emptyText}</div>`;
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

/* ==================== 注册表 ==================== */

function wRenderFavoriteSitesEditor(container, ctx) {
    const service = window.FavoriteSites;
    if (!service) {
        container.innerHTML = `<div class="widget-edit-panel"><div class="w-loading">收藏服务不可用</div></div>`;
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
                        <div class="widget-edit-title">收藏网站</div>
                        <div class="widget-edit-subtitle">添加或删除会同步到收藏网站小组件。</div>
                    </div>
                </div>
                <div class="widget-edit-add-row">
                    <input class="widget-edit-input" type="url" placeholder="输入网站地址，例如 example.com">
                    <button class="widget-edit-add-btn" type="button">添加</button>
                </div>
                <div class="widget-edit-sites-list">
                    ${sites.map(site => `
                        <div class="widget-edit-site" data-site-id="${wEsc(site.id)}">
                            <span class="widget-edit-site-icon">
                                ${site.icon ? `<img src="${wEsc(site.icon)}" alt="">` : ''}
                            </span>
                            <span class="widget-edit-site-name">${wEsc(site.title || site.url)}</span>
                            <button class="widget-edit-site-remove" type="button" title="删除">
                                <img src="Theme/Icon/Symbol_icon/stroke/Trash.svg" alt="">
                            </button>
                        </div>
                    `).join('')}
                </div>
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
            id: 'media',
            nameKey: 'widgets.app.media',
            descKey: 'widgets.app.media.desc',
            icon: 'Theme/Icon/Symbol_icon/stroke/Music.svg',
            variants: [
                { id: 'media-s', w: 2, h: 2, sizeKey: 'widgets.size.small', theme: 'w-media-theme', render(b, c) { wRenderMedia(b, c, 's'); }, onClick: wMediaOpenApp },
                { id: 'media-m', w: 4, h: 2, sizeKey: 'widgets.size.medium', theme: 'w-media-theme', render(b, c) { wRenderMedia(b, c, 'm'); }, onClick: wMediaOpenApp }
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
            nameKey: '收藏网站',
            descKey: '显示常用收藏网站，自动匹配 App Shop 图标',
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

    /** 首页推荐的小组件形态 */
    recommended: [
        'weather-m', 'clock-analog', 'calendar-s', 'search-capsule',
        'favorites-m', 'media-m', 'photos-m', 'word-s', 'lunar-tall', 'news-m', 'holiday-m', 'answerbook-m'
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
