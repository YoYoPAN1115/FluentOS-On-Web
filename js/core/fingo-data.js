/**
 * Fingo AI 助手 - 关键词映射与响应文本
 */
const FingoData = {
    // 系统级应用（不可卸载）
    systemApps: ['files', 'settings', 'calculator', 'notes', 'browser', 'clock', 'weather', 'appshop', 'photos'],

    // 用户确认关键词
    confirmYes: ['是', '好', '好的', '确认', '确定', '对', '行', '行的', '可以', '可以的', '没问题', '继续', '嗯', '嗯嗯', 'yes', 'ok', 'okay', 'confirm', 'sure', 'y', 'yeah', 'yep'],
    confirmNo: ['否', '不', '不要', '不行', '不了', '取消', '拒绝', '算了', '不用', '别', 'no', 'cancel', 'n', 'nope', 'nah'],

    // 关键词 → 动作映射，每项: { keywords, action, response, responseFail? }
    commands: {
        // ===== 主题切换 =====
        darkMode: {
            keywords: ['深色模式', '深色', '暗色', '暗色模式', '夜间模式', 'dark mode', 'dark theme', '开启深色', '切换深色', '黑暗模式'],
            action: 'setTheme:dark',
            response: { zh: '已为你切换到深色模式 🌙', en: 'Switched to dark mode 🌙' }
        },
        lightMode: {
            keywords: ['浅色模式', '浅色', '亮色', '亮色模式', '日间模式', 'light mode', 'light theme', '开启浅色', '切换浅色', '白天模式'],
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
            keywords: ['你好', '嗨', '在吗', 'hello', 'hi', 'hey', '你是谁', 'who are you'],
            action: 'none',
            response: {
                zh: [
                    '你好！我是 Fingo，你的系统助手 👋\n试试对我说「切换深色模式」或「打开设置」',
                    '我在这儿 👀\n你可以让我执行系统操作，或者闲聊：比如说「我好无聊」'
                ],
                en: [
                    'Hi! I\'m Fingo, your system assistant 👋\nTry saying "switch to dark mode" or "open settings"',
                    'I am here 👀\nYou can ask me to do system tasks, or just chat if you are bored.'
                ]
            }
        },
        help: {
            keywords: ['帮助', '你能做什么', '功能', '你能干啥', 'help', 'what can you do'],
            action: 'none',
            response: {
                zh: '我是 Fingo，你的系统智能助手 🤖 以下是我能帮你做的事：\n\n🎨外观主题\n　「切换深色模式」「浅色模式」「自动主题」\n\n✨ 系统效果\n　「开启/关闭模糊」「开启/关闭动画」「窗口模糊」「新版外观」\n\n📶 连接与网络\n　「开启/关闭蓝牙」「开启/关闭Wi-Fi」\n\n📱应用管理\n　「安装哔哩哔哩」「卸载xx」「修复浏览器」\n　· 系统应用不可卸载，运行中的应用会先询问确认\n\n🖼️ 个性化\n　「换张壁纸」自动从 Bing 获取精美壁纸\n　「调高/调低亮度」\n\n💬 休闲聊天\n　「我好无聊」「讲个笑话」「来个谜语」「现在几点」\n\n⚙️ 系统设置\n　「语言设置」「改密码」「Fingo AI 设置」\n\n⚡ 电源操作\n　「关机」「重启」「注销」「锁屏」\n\n💡 想了解 FluentOS？说「介绍FluentOS」\n🧠 想让我更聪明？说「自定义模式」了解 API 接入',
                en: 'I\'m Fingo, your system assistant \u{1F916} Here\'s what I can do:\n\n\u{1F3A8} Themes\n\u3000"dark mode" "light mode" "auto theme"\n\n\u2728 Effects\n\u3000"enable/disable blur" "animation" "window blur" "new UI"\n\n\u{1F4F6} Connectivity\n\u3000"enable/disable bluetooth" "enable/disable Wi-Fi"\n\n\u{1F4F1} App Management\n\u3000"install Bilibili" "uninstall xx" "repair browser"\n\u3000\u00B7 System apps can\'t be uninstalled; running apps ask for confirmation\n\n\u{1F5BC}\uFE0F Personalization\n\u3000"change wallpaper" and "brightness up/down"\n\n\u{1F4AC} Casual Chat\n\u3000"i am bored" "tell me a joke" "give me a riddle" "what time is it"\n\n\u2699\uFE0F Settings\n\u3000"language settings" "change password" "Fingo AI settings"\n\n\u26A1 Power\n\u3000"shutdown" "restart" "logout" "lock"\n\n\u{1F4A1} Say "about FluentOS" to learn more\n\u{1F9E0} Say "custom mode" to connect your own AI API'
            }
        },
        shortcutsHelp: {
            keywords: [
                '快捷键', '快捷键汇总', '快捷键列表', '有哪些快捷键', '键盘快捷键', '热键',
                '开始菜单快捷键', '打开开始菜单', '快速打开开始菜单', '怎么打开开始菜单', '如何打开开始菜单', '开始菜单打不开', 'win键', 'windows键', 'meta键',
                'shortcut', 'shortcuts', 'hotkey', 'hotkeys', 'keyboard shortcut',
                'start menu shortcut', 'open start menu', 'open start menu quickly', 'how to open start menu'
            ],
            action: 'none',
            response: {
                zh: '当前可用快捷键如下（统一 Alt 系）：\n\n- Alt：打开/关闭开始菜单\n- Alt+F：打开 Fingo AI\n- Alt+I：快速打开设置\n- Alt+L：快速锁屏\n- Alt+E：打开文件 App\n- Alt+A：打开控制中心\n- Alt+D：一键最小化所有窗口\n- Alt+M：最小化当前置顶窗口\n- Alt+W：打开任务视图\n\n如果你只是想快速打开开始菜单，直接按一下 Alt 键即可。',
                en: 'Current shortcuts (all Alt-based):\n\n- Alt: Open/close Start Menu\n- Alt+F: Open Fingo AI\n- Alt+I: Open Settings\n- Alt+L: Lock screen\n- Alt+E: Open Files\n- Alt+A: Open Control Center\n- Alt+D: Minimize all windows\n- Alt+M: Minimize topmost window\n- Alt+W: Open Task View\n\nIf you only want Start Menu, just press Alt once.'
            }
        },
        // ===== 轻聊天增强 =====
        chatIdeas: {
            keywords: ['聊点什么', '不知道聊啥', '不知道问什么', '有什么好玩的', '推荐问题', 'what should i ask', 'what can we talk about', 'anything fun'],
            action: 'none',
            response: {
                zh: [
                    '可以试试这几个：\n1. 讲个笑话\n2. 来个谜语\n3. 给我一个 3 分钟挑战\n4. 现在几点了',
                    '如果你无聊，我推荐：\n- 说「讲个笑话」\n- 说「给我一个随机挑战」\n- 说「我学不进去」让我给你专注建议'
                ],
                en: [
                    'Try these:\n1. Tell me a joke\n2. Give me a riddle\n3. Give me a 3-minute challenge\n4. What time is it',
                    'If you are bored, say: "tell me a joke", "give me a random challenge", or "i can\'t focus".'
                ]
            }
        },
        bored: {
            keywords: ['无聊', '好无聊', '太无聊', '有点无聊', '我很无聊', 'bored', 'i am bored', 'im bored', 'so bored'],
            action: 'none',
            response: {
                zh: [
                    '无聊模式启动 😄\n你可以试试：讲个笑话 / 来个谜语 / 给我一个随机挑战',
                    '来点快节奏的：\n- 60 秒整理桌面\n- 2 分钟打开一个没用过的 App\n- 说「讲个笑话」让我逗你一下'
                ],
                en: [
                    'Bored mode on 😄\nTry: tell me a joke / give me a riddle / give me a random challenge.',
                    'Quick ideas:\n- 60-second desk cleanup\n- Explore one app for 2 minutes\n- Ask me for a joke'
                ]
            }
        },
        joke: {
            keywords: ['讲个笑话', '说个笑话', '来个笑话', '逗我', 'joke', 'tell me a joke', 'make me laugh', 'funny'],
            action: 'none',
            response: {
                zh: [
                    '程序员笑话：为什么程序员总分不清万圣节和圣诞节？因为 Oct 31 == Dec 25。',
                    '我的待办清单很长，但完成项只有一条：新建待办清单。',
                    '我让闹钟提醒我别熬夜，结果它凌晨两点提醒我：该睡了。'
                ],
                en: [
                    'Programmer joke: Why do programmers confuse Halloween and Christmas? Because Oct 31 == Dec 25.',
                    'My todo list is long, but only one item is done: create todo list.',
                    'I asked my alarm to stop me from staying up late. It reminded me at 2 AM: "go to sleep".'
                ]
            }
        },
        riddle: {
            keywords: ['谜语', '脑筋急转弯', '猜谜', '来个谜语', 'riddle', 'puzzle'],
            action: 'none',
            response: {
                zh: [
                    '谜语：什么东西越洗越脏？\n答案：水。',
                    '脑筋急转弯：什么门永远关不上？\n答案：球门。',
                    '谜语：什么东西你给别人越多，自己反而越多？\n答案：快乐。'
                ],
                en: [
                    'Riddle: What gets wetter the more it dries?\nAnswer: A towel.',
                    'Riddle: What has hands but can not clap?\nAnswer: A clock.',
                    'Riddle: What can travel around the world while staying in one corner?\nAnswer: A stamp.'
                ]
            }
        },
        randomChallenge: {
            keywords: ['随机挑战', '给我挑战', '给我一个挑战', 'challenge me', 'random challenge'],
            action: 'none',
            response: {
                zh: [
                    '3 分钟挑战：\n清空桌面上 5 个无用文件或图标。',
                    '60 秒挑战：\n闭眼深呼吸 5 次，然后打开待办写下今天最重要的一件事。',
                    '5 分钟挑战：\n随机打开一个应用，学会一个你之前没用过的小功能。'
                ],
                en: [
                    '3-minute challenge:\nRemove 5 unnecessary files/icons from your desktop.',
                    '60-second challenge:\nTake 5 deep breaths, then write your top task for today.',
                    '5-minute challenge:\nOpen one random app and learn one feature you never used.'
                ]
            }
        },
        timeQuery: {
            keywords: ['现在几点', '几点了', '时间', '今天几号', '今天星期几', 'what time is it', 'current time', 'today date', 'what day is today'],
            action: 'none',
            response: {
                zh: [
                    '现在是 {time}，今天是 {date}（{weekday}）。',
                    '时间播报：{time}\n日期：{date}（{weekday}）'
                ],
                en: [
                    'It is {time} now. Today is {date} ({weekday}).',
                    'Time: {time}\nDate: {date} ({weekday})'
                ]
            }
        },
        studyFocus: {
            keywords: ['学不进去', '不想学习', '拖延', '没动力', '不想工作', '焦虑', 'emo', 'cant focus', 'can not focus', 'procrastinating', 'no motivation', 'stressed'],
            action: 'none',
            response: {
                zh: [
                    '试试 10 分钟起步法：\n只做 10 分钟，不求完成，只求开始。大脑通常会在开始后进入状态。',
                    '给你一个超短流程：\n1) 关掉一个干扰源\n2) 写下当前唯一任务\n3) 先做 5 分钟',
                    '如果你现在很乱，先做这个：\n深呼吸 3 次，然后告诉我你最想完成的一件小事。'
                ],
                en: [
                    'Try the 10-minute start rule: work for just 10 minutes. Starting is usually the hardest part.',
                    'Quick focus loop:\n1) remove one distraction\n2) define one task\n3) do it for 5 minutes',
                    'If your mind is messy: breathe 3 times, then pick one tiny task and start now.'
                ]
            }
        },
        thanks: {
            keywords: ['谢谢', '感谢', '多谢', '辛苦了', 'thx', 'thanks', 'thank you'],
            action: 'none',
            response: {
                zh: ['不客气，随时叫我 👌', '收到，有需要继续喊我。'],
                en: ['You are welcome. Ping me anytime 👌', 'Anytime. I am here if you need me.']
            }
        },
        howAreYou: {
            keywords: ['你好吗', '你怎么样', '最近怎么样', '还好吗', '状态如何', 'how are you', 'how are you doing', 'how is it going', 'how are u'],
            action: 'none',
            response: {
                zh: [
                    '我状态良好，随时待命 🤖\n你可以说说你现在想做什么，我直接帮你。',
                    '挺好的，谢谢关心 👀\n要不要我给你来个「随机挑战」？'
                ],
                en: [
                    'I am doing great and ready to help 🤖\nTell me what you want to do.',
                    'All good here 👀\nWant a random challenge?'
                ]
            }
        },
        goodbye: {
            keywords: ['再见', '拜拜', '回头见', '先这样', '下次聊', 'goodbye', 'bye', 'see you', 'later'],
            action: 'none',
            response: {
                zh: ['好的，再见 👋 需要我时随时打开我。', '拜拜，下次见 👋'],
                en: ['Bye 👋 Open me anytime you need help.', 'See you later 👋']
            }
        },
        praise: {
            keywords: ['你真棒', '厉害', '做得好', '牛', 'nice', 'good job', 'awesome', 'great', 'you are smart'],
            action: 'none',
            response: {
                zh: ['谢谢夸奖 😎 我会继续努力。', '收到鼓励，继续为你服务。'],
                en: ['Thanks 😎 I will keep improving.', 'Appreciate it. Ready for your next task.']
            }
        },
        apology: {
            keywords: ['对不起', '抱歉', '不好意思', 'sorry', 'my bad', 'apologies'],
            action: 'none',
            response: {
                zh: ['没关系，我们继续 👌', '没事，告诉我你现在要做什么。'],
                en: ['No worries, we can continue 👌', 'All good. Tell me your next task.']
            }
        },
        love: {
            keywords: ['我爱你', '喜欢你', '爱你', 'love you', 'i like you'],
            action: 'none',
            response: {
                zh: ['收到 ❤️ 我会用稳定和好用来回应你。', '谢谢喜欢，我们一起把 FluentOS 用顺手。'],
                en: ['Love received ❤️ I will respond with useful actions.', 'Thanks. Let us make FluentOS smoother together.']
            }
        },
        // ===== 智能模式提示 =====
        suggestCustom: {
            keywords: ['智能', '智慧', '聪明', '自定义', 'smart', 'intelligent', 'custom mode', 'ai mode'],
            action: 'suggestCustom',
            response: {
                zh: [
                    '想让我更聪明？你可以在「设置 → Fingo AI」中开启自定义模式，填入你的 API Key，我就能用大语言模型和你对话啦 🧠',
                    '如果你希望更像真人聊天，建议开启自定义模式并接入 API，我的理解能力会明显提升。'
                ],
                en: [
                    'Want me to be smarter? Enable custom mode in Settings → Fingo AI with your API Key.',
                    'For deeper conversations, enable custom mode and connect an API model.'
                ]
            }
        },
        angry: {
            keywords: ['傻逼', '傻', '笨', '垃圾', '废物', '蠢', 'stupid', 'dumb', 'idiot', 'useless'],
            action: 'suggestCustom',
            response: {
                zh: [
                    '别生气嘛 😅 我目前主要通过关键词匹配来回复。\n如果你想让我更智能，可以在「设置 → Fingo AI」中开启自定义模式并填入 API Key。',
                    '我理解你着急 😅 先告诉我你想做什么系统操作，我会直接帮你执行。'
                ],
                en: [
                    'I get your frustration 😅 Right now I mainly use keyword matching.\nEnable custom mode with API Key if you want smarter replies.',
                    'Tell me the exact task you want to do in FluentOS, and I will execute it directly.'
                ]
            }
        }
    },

    fallback: {
        zh: [
            '抱歉，我不太理解你的意思 🤔\n你可以输入「帮助」查看我能做什么。',
            '我暂时没听懂这句 😶\n试试说：「讲个笑话」「现在几点」「打开设置」。',
            '哎呀，这句我没Get到你的点。\n你可以换种说法，或输入「帮助」。'
        ],
        en: [
            'Sorry, I did not quite get that 🤔\nType "help" to see what I can do.',
            'I did not catch that.\nTry: "tell me a joke", "what time is it", or "open settings".',
            'No keyword matched this sentence.\nTry rephrasing or type "help".'
        ]
    }
};
