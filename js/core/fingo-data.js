/**
 * Fingo AI 助手 - 关键词映射与响应文本
 */
const FingoData = {
    // 系统级应用（不可卸载）
    systemApps: ['files', 'settings', 'calculator', 'notes', 'browser', 'clock', 'weather', 'appshop', 'photos'],

    // 用户确认关键词
    confirmYes: ['是', '好', '确认', '确定', '对', '行', '可以', '没问题', '继续', 'yes', 'ok', 'confirm', 'sure', 'y'],
    confirmNo: ['否', '不', '取消', '不要', '拒绝', '算了', '不用', '别', 'no', 'cancel', 'n', 'nope'],

    // 关键词 → 动作映射，每项: { keywords, action, response, responseFail? }
    commands: {
        // ===== 主题切换 =====
        darkMode: {
            keywords: ['深色模式', '暗色模式', '夜间模式', 'dark mode', 'dark theme', '开启深色', '切换深色', '黑暗模式'],
            action: 'setTheme:dark',
            response: { zh: '已为你切换到深色模式 🌙', en: 'Switched to dark mode 🌙' }
        },
        lightMode: {
            keywords: ['浅色模式', '亮色模式', '日间模式', 'light mode', 'light theme', '开启浅色', '切换浅色', '白天模式'],
            action: 'setTheme:light',
            response: { zh: '已为你切换到浅色模式 ☀️', en: 'Switched to light mode ☀️' }
        },
        autoTheme: {
            keywords: ['自动主题', '自动模式', 'auto theme', 'auto mode'],
            action: 'setTheme:auto',
            response: { zh: '已设为自动主题，将根据时间自动切换 🔄', en: 'Set to auto theme 🔄' }
        },
        // ===== 模糊效果 =====
        blurOn: {
            keywords: ['开启模糊', '打开模糊', '启用模糊', 'enable blur', 'blur on'],
            action: 'setBlur:true',
            response: { zh: '模糊效果已开启 ✨', en: 'Blur effect enabled ✨' }
        },
        blurOff: {
            keywords: ['关闭模糊', '禁用模糊', 'disable blur', 'blur off'],
            action: 'setBlur:false',
            response: { zh: '模糊效果已关闭', en: 'Blur effect disabled' }
        },
        // ===== 动画效果 =====
        animOn: {
            keywords: ['开启动画', '打开动画', '启用动画', 'enable animation', 'animation on'],
            action: 'setAnimation:true',
            response: { zh: '动画效果已开启 🎬', en: 'Animation enabled 🎬' }
        },
        animOff: {
            keywords: ['关闭动画', '禁用动画', 'disable animation', 'animation off'],
            action: 'setAnimation:false',
            response: { zh: '动画效果已关闭', en: 'Animation disabled' }
        },
        // ===== 窗口模糊 =====
        windowBlurOn: {
            keywords: ['开启窗口模糊', '窗口毛玻璃', 'window blur on', 'enable window blur'],
            action: 'setWindowBlur:true',
            response: { zh: '窗口模糊效果已开启 🪟', en: 'Window blur enabled 🪟' }
        },
        windowBlurOff: {
            keywords: ['关闭窗口模糊', 'window blur off', 'disable window blur'],
            action: 'setWindowBlur:false',
            response: { zh: '窗口模糊效果已关闭', en: 'Window blur disabled' }
        },
        // ===== 电源操作 =====
        shutdown: {
            keywords: ['关机', '关闭电脑', 'shutdown', 'power off', 'shut down'],
            action: 'power:shutdown',
            response: { zh: '正在为你关机...', en: 'Shutting down...' }
        },
        restart: {
            keywords: ['重启', '重新启动', 'restart', 'reboot'],
            action: 'power:restart',
            response: { zh: '正在为你重启系统...', en: 'Restarting...' }
        },
        logout: {
            keywords: ['注销', '登出', 'logout', 'sign out', 'log out'],
            action: 'power:logout',
            response: { zh: '正在注销...', en: 'Logging out...' }
        },
        lock: {
            keywords: ['锁屏', '锁定', 'lock', 'lock screen'],
            action: 'power:lock',
            response: { zh: '正在锁定屏幕 🔒', en: 'Locking screen 🔒' }
        },
        // ===== 打开应用（通用） =====
        openApp: {
            keywords: ['打开', '启动', '运行', 'open', 'launch', 'run', 'start'],
            action: 'openApp',
            response: { zh: '正在打开 {app} ...', en: 'Opening {app} ...' },
            responseNotFound: { zh: '找不到该应用，你可以打开 App Shop 浏览可用应用 🛒', en: 'App not found. Open App Shop to browse available apps 🛒' },
            responseAskInstall: { zh: '{app}还未安装，是否要安装？（是/否）', en: '{app} is not installed. Install it? (yes/no)' }
        },
        // ===== 卸载应用 =====
        uninstall: {
            keywords: ['卸载', '删除应用', 'uninstall', 'remove app'],
            action: 'uninstall',
            response: { zh: '已卸载 {app}✅', en: 'Uninstalled {app} ✅' },
            responseFail: { zh: '⚠️ {app} 是系统核心应用，无法卸载。', en: '⚠️ {app} is a system app and cannot be uninstalled.' }
        },
        // ===== 安装应用 =====
        install: {
            keywords: ['安装', '下载应用', 'install', 'download app'],
            action: 'install',
            response: { zh: '正在安装 {app}...', en: 'Installing {app}...' },
            responseFail: { zh: '⚠️ {app} 还未上架 App Shop，暂时无法安装。', en: '⚠️ {app}is not available in App Shop yet.' }
        },
        // ===== 修复应用 =====
        repair: {
            keywords: ['修复', '修复应用', 'repair', 'fix app', '修复一下'],
            action: 'repair',
            response: { zh: '正在修复 {app}，请稍候... 🔧', en: 'Repairing {app}, please wait... 🔧' },
        },
        // ===== 壁纸 =====
        wallpaper: {
            keywords: ['换壁纸', '换张壁纸', '更换壁纸', '切换壁纸', '新壁纸', 'change wallpaper', 'wallpaper', '换个壁纸'],
            action: 'wallpaper',
            response: { zh: '正在从 Bing 获取精美壁纸... 🖼️', en: 'Fetching wallpaper from Bing... 🖼️' }
        },
        // ===== 蓝牙 =====
        bluetoothOn: {
            keywords: ['开启蓝牙', '打开蓝牙', '启用蓝牙', 'bluetooth on', 'enable bluetooth', 'turn on bluetooth'],
            action: 'setBluetooth:true',
            response: { zh: '蓝牙已开启 📶', en: 'Bluetooth enabled 📶' }
        },
        bluetoothOff: {
            keywords: ['关闭蓝牙', '禁用蓝牙', 'bluetooth off', 'disable bluetooth', 'turn off bluetooth'],
            action: 'setBluetooth:false',
            response: { zh: '蓝牙已关闭', en: 'Bluetooth disabled' }
        },
        // ===== 网络 =====
        wifiOn: {
            keywords: ['开启网络', '打开wifi', '打开网络', '开启wifi', 'wifi on', 'enable wifi', 'turn on wifi'],
            action: 'setWifi:true',
            response: { zh: 'Wi-Fi 已开启 📡', en: 'Wi-Fi enabled 📡' }
        },
        wifiOff: {
            keywords: ['关闭网络', '关闭wifi', '禁用网络', 'wifi off', 'disable wifi', 'turn off wifi'],
            action: 'setWifi:false',
            response: { zh: 'Wi-Fi 已关闭', en: 'Wi-Fi disabled' }
        },
        // ===== 语言设置 =====
        langSettings: {
            keywords: ['语言设置', '切换语言', '更改语言', 'language settings', 'change language'],
            action: 'openSettings:time-language',
            response: { zh: '正在打开语言设置... 🌍', en: 'Opening language settings... 🌍' }
        },
        // ===== 更改密码 =====
        changePassword: {
            keywords: ['更改密码', '修改密码', '改密码', 'change password', 'change pin'],
            action: 'openSettings:privacy',
            response: { zh: '正在跳转到隐私设置，你可以在那里更改密码 🔑', en: 'Opening privacy settings to change your password 🔑' }
        },
        // ===== Fingo AI 设置 =====
        fingoSettings: {
            keywords: ['fingo设置', 'fingo ai设置', '调整fingo', 'ai设置', 'fingo settings', 'ai settings'],
            action: 'openSettings:fingo',
            response: { zh: '正在打开 Fingo AI 设置... 🤖', en: 'Opening Fingo AI settings... 🤖' }
        },
        // ===== 介绍 FluentOS =====
        aboutFluentOS: {
            keywords: ['介绍fluentos', '什么是fluentos', 'fluentos是什么', 'about fluentos', 'what is fluentos', '介绍系统', '关于系统'],
            action: 'none',
            response: { zh: 'FluentOS 是一个基于 Web 技术构建的模拟操作系统 💻\n\n✨ 采用 Fluent Design 设计语言\n🛠️ 纯 HTML5 + CSS3 + JavaScript 实现\n📱 内置文件管理、浏览器、天气、时钟等系统应用\n🛒 支持通过 App Shop 安装第三方应用\n🤖 集成 Fingo AI 智能助手\n\n这是一个开源项目，欢迎体验和贡献！', en: 'FluentOS is a web-based simulated operating system 💻\n\n✨ Fluent Design language\n🛠️ Pure HTML5 + CSS3 + JavaScript\n📱 Built-in apps: Files, Browser, Weather, Clock, etc.\n🛒 App Shop for third-party apps\n🤖 Fingo AI assistant\n\nIt\'s open source - feel free to explore and contribute!' }
        },
        // ===== 亮度 =====
        brightnessUp: {
            keywords: ['调高亮度', '亮度调高', '增加亮度', 'brightness up', 'brighter'],
            action: 'brightness:up',
            response: { zh: '亮度已调高 🔆', en: 'Brightness increased 🔆' }
        },
        brightnessDown: {
            keywords: ['调低亮度', '亮度调低', '降低亮度', 'brightness down', 'dimmer'],
            action: 'brightness:down',
            response: { zh: '亮度已调低 🔅', en: 'Brightness decreased 🔅' }
        },
        // ===== Fluent V2 =====
        v2On: {
            keywords: ['新版外观', '启用v2', 'fluent v2', 'new ui', 'enable v2'],
            action: 'setFluentV2:true',
            response: { zh: '已切换到新版外观 ✨', en: 'Switched to new UI ✨' }
        },
        v2Off: {
            keywords: ['经典外观', '关闭v2', 'classic ui', 'disable v2', '旧版外观'],
            action: 'setFluentV2:false',
            response: { zh: '已恢复经典外观', en: 'Switched to classic UI' }
        },
        // ===== 问候/帮助 =====
        greet: {
            keywords: ['你好', '嗨', 'hello', 'hi', 'hey', '你是谁', 'who are you'],
            action: 'none',
            response: { zh: '你好！我是 Fingo，你的系统助手 👋\n试试对我说「切换深色模式」或「打开设置」', en: 'Hi! I\'m Fingo, your system assistant 👋\nTry saying "switch to dark mode" or "open settings"' }
        },
        help: {
            keywords: ['帮助', '你能做什么', '功能', '你能干啥', 'help', 'what can you do'],
            action: 'none',
            response: {
                zh: '我是 Fingo，你的系统智能助手 🤖 以下是我能帮你做的事：\n\n🎨外观主题\n　「切换深色模式」「浅色模式」「自动主题」\n\n✨ 系统效果\n　「开启/关闭模糊」「开启/关闭动画」「窗口模糊」「新版外观」\n\n📶 连接与网络\n　「开启/关闭蓝牙」「开启/关闭Wi-Fi」\n\n📱应用管理\n　「安装哔哩哔哩」「卸载xx」「修复浏览器」\n　· 系统应用不可卸载，运行中的应用会先询问确认\n\n🖼️ 个性化\n　「换张壁纸」自动从 Bing 获取精美壁纸\n　「调高/调低亮度」\n\n⚙️ 系统设置\n　「语言设置」「改密码」「Fingo AI 设置」\n\n⚡ 电源操作\n　「关机」「重启」「注销」「锁屏」\n\n💡 想了解 FluentOS？说「介绍FluentOS」\n🧠 想让我更聪明？说「自定义模式」了解 API 接入',
                en: 'I\'m Fingo, your system assistant \u{1F916} Here\'s what I can do:\n\n\u{1F3A8}Themes\n\u3000"dark mode" "light mode" "auto theme"\n\n\u2728 Effects\n\u3000"enable/disable blur" "animation" "window blur" "new UI"\n\n\u{1F4F6} Connectivity\n\u3000"enable/disable bluetooth" "enable/disable Wi-Fi"\n\n\u{1F4F1}App Management\n\u3000"install Bilibili" "uninstall xx" "repair browser"\n\u3000\u00B7 System apps can\'t be uninstalled; running apps ask for confirmation\n\n\u{1F5BC}\uFE0F Personalization\n\u3000"change wallpaper" \u2014 fetches from Bing\n\u3000"brightness up/down"\n\n\u2699\uFE0F Settings\n\u3000"language settings" "change password" "Fingo AI settings"\n\n\u26A1 Power\n\u3000"shutdown" "restart" "logout" "lock"\n\n\u{1F4A1} Say "about FluentOS" to learn more\n\u{1F9E0} Say "custom mode" to connect your own AI API'
            }
        },
        // ===== 智能模式提示 =====
        suggestCustom: {
            keywords: ['智能', '智慧', '聪明', '自定义', 'smart', 'intelligent', 'custom mode', 'ai mode'],
            action: 'suggestCustom',
            response: { zh: '想让我更聪明？你可以在「设置 → Fingo AI」中开启自定义模式，填入你的 API Key，我就能用大语言模型和你对话啦 🧠', en: 'Want me to be smarter? Enable custom mode in Settings → Fingo AI with your API Key, and I can chat using a large language model 🧠' }
        },
        angry: {
            keywords: ['傻逼', '傻', '笨', '垃圾', '废物','蠢', 'stupid', 'dumb', 'idiot', 'useless'],
            action: 'suggestCustom',
            response: { zh: '别生气嘛 😅 我目前只能通过关键词匹配来回复。\n\n如果你想让我更智能，可以在「设置 → Fingo AI」中开启自定义模式，填入 OpenAI 或硅基流动的 API Key，这样我就能真正理解你说的话了！\n\n💡 Fingo 默认通过关键词匹配执行系统操作，自定义模式下会调用大语言模型进行智能对话。', en: 'Don\'t be upset 😅 I can only respond via keyword matching right now.\n\nTo make me smarter, enable custom mode in Settings → Fingo AI with an OpenAI or SiliconFlow API Key.\n\n💡 Fingo uses keyword matching by default. Custom mode calls a large language model for intelligent conversations.' }
        }
    },

    fallback: { zh: '抱歉，我不太理解你的意思 🤔\n输入「帮助」查看我能做什么\n你也可以使用自定义模式让我接入大预言模型变得更聪明！', en: 'Sorry, I didn\'t understand 🤔\nType "help" to see what I can do' }
};

