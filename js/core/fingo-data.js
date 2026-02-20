/**
 * Fingo AI 助手 - 关键词映射与响应文本
 */
const FingoData = {
    // 系统级应用（不可卸载）
    systemApps: ['files', 'settings', 'calculator', 'notes', 'browser', 'clock', 'weather', 'appshop', 'photos'],

    // 用户确认关键词
    confirmYes: [
        '是', '好', '好的', '确认', '确定', '对', '行', '行的', '可以', '可以的', '没问题', '继续', '嗯', '嗯嗯',
        '当然', '要的', '没错', '确定关闭', '确认关闭', '可以关闭', '就这样', '可以执行',
        'yes', 'ok', 'okay', 'confirm', 'sure', 'y', 'yeah', 'yep', 'do it', 'go ahead','Y','Yes','OK','Ok'
    ],
    confirmNo: [
        '否', '不', '不要', '不行', '不了', '取消', '拒绝', '算了', '不用', '别', '不要了', '不用了', '先不要', '暂时不要', '别了',
        'no', 'cancel', 'n', 'nope', 'nah', 'not now', 'stop it','N','NO','No'
    ],

    // 关键词 → 动作映射，每项: { keywords, action, response, responseFail? }
    commands: {
        // ===== 主题切换 =====
        darkMode: {
            keywords: ['深色模式', '深色', '暗色', '暗色模式', '夜间模式', '深色主题', '黑夜模式', 'dark mode', 'dark theme', 'enable dark mode', '开启深色', '切换深色', '黑暗模式'],
            action: 'setTheme:dark',
            response: { zh: '已为你切换到深色模式 🌙', en: 'Switched to dark mode 🌙' }
        },
        lightMode: {
            keywords: ['浅色模式', '浅色', '亮色', '亮色模式', '日间模式', '浅色主题', '白天模式', 'light mode', 'light theme', 'enable light mode', '开启浅色', '切换浅色'],
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
        // ===== 网页全屏 =====
        autoFullscreenOn: {
            keywords: [
                '开启网页自动全屏',
                '开启网页全屏',
                '打开网页全屏',
                '启用网页全屏',
                '打开网页自动全屏',
                '启用网页自动全屏',
                '开启自动网页全屏',
                '打开自动网页全屏',
                '启用自动网页全屏',
                '开启自动全屏',
                '打开自动全屏',
                '启用自动全屏',
                '开启开机自动全屏',
                '打开开机自动全屏',
                'enable auto fullscreen',
                'turn on auto fullscreen',
                'enable web auto fullscreen',
                'turn on web auto fullscreen'
            ],
            action: 'setAutoFullscreen:true',
            response: {
                zh: '已开启“开机自动网页全屏”。',
                en: 'Enabled "Auto Web Fullscreen On Boot".'
            }
        },
        autoFullscreenOff: {
            keywords: [
                '关闭网页自动全屏',
                '关闭自动网页全屏',
                '关闭自动全屏',
                '关掉自动全屏',
                '禁用自动网页全屏',
                '禁用自动全屏',
                '关闭开机自动全屏',
                'disable auto fullscreen',
                'turn off auto fullscreen',
                'disable web auto fullscreen',
                'turn off web auto fullscreen'
            ],
            action: 'setAutoFullscreen:false',
            response: {
                zh: '已关闭“开机自动网页全屏”。',
                en: 'Disabled "Auto Web Fullscreen On Boot".'
            }
        },
        enterWebFullscreen: {
            keywords: [
                '进入网页全屏',
                '进入全屏',
                '打开当前全屏',
                '当前页面全屏',
                '立刻全屏',
                '马上全屏',
                'enter fullscreen',
                'go fullscreen',
                'fullscreen now'
            ],
            action: 'setDocumentFullscreen:true',
            response: {
                zh: '正在进入网页全屏。',
                en: 'Entering web fullscreen.'
            }
        },
        exitWebFullscreen: {
            keywords: [
                '退出网页全屏',
                '退出全屏',
                '关闭当前全屏',
                '取消全屏',
                '恢复窗口模式',
                'exit fullscreen',
                'leave fullscreen',
                'close fullscreen'
            ],
            action: 'setDocumentFullscreen:false',
            response: {
                zh: '已退出网页全屏。',
                en: 'Exited web fullscreen.'
            }
        },
        autoFullscreenBootGuide: {
            keywords: [
                '开机自动网页全屏怎么开',
                '开机自动网页全屏怎么关',
                '自动网页全屏怎么开',
                '自动网页全屏怎么关',
                'how to enable auto web fullscreen on boot',
                'how to disable auto web fullscreen on boot'
            ],
            action: 'openSettings:personalization',
            response: {
                zh: '你可以在「设置 → 个性化」里找到「开机自动网页全屏」开关。\n我已帮你打开对应页面。\n\n你也可以直接对我说：\n-「开启网页自动全屏」\n-「关闭网页自动全屏」',
                en: 'Go to "Settings → Personalization" and find "Auto Web Fullscreen On Boot".\nI opened that page for you.\n\nYou can also tell me directly:\n- "enable auto fullscreen"\n- "disable auto fullscreen"'
            }
        },
        // ===== 全屏相关（默认走关闭确认） =====
        autoFullscreen: {
            keywords: [
                '\u5168\u5c4f',
                '\u81ea\u52a8\u5168\u5c4f',
                '\u7f51\u9875\u5168\u5c4f',
                '\u5f00\u673a\u5168\u5c4f',
                '\u9000\u51fa\u5168\u5c4f',
                'fullscreen',
                'full screen',
                'auto fullscreen'
            ],
            action: 'confirmAutoFullscreen:disable',
            response: {
                zh: '\u68c0\u6d4b\u5230\u4f60\u5728\u95ee\u5168\u5c4f\u3002\u8981\u5173\u95ed\u201c\u5f00\u673a\u81ea\u52a8\u7f51\u9875\u5168\u5c4f\u201d\u5417\uff1f\uff08\u786e\u5b9a/\u4e0d\u8981\uff09',
                en: 'You asked about fullscreen. Disable "Auto Web Fullscreen On Boot"? (yes/no)'
            }
        },
        taskViewOpen: {
            keywords: ['打开任务视图', '打开多任务视图', '进入任务视图', '进入多任务视图', 'open task view', 'open multitask view'],
            action: 'taskView:open',
            response: { zh: '已打开任务视图。', en: 'Task View opened.' }
        },
        taskViewClose: {
            keywords: ['关闭任务视图', '关闭多任务视图', '退出任务视图', '退出多任务视图', 'close task view', 'exit task view'],
            action: 'taskView:close',
            response: { zh: '已关闭任务视图。', en: 'Task View closed.' }
        },
        minimizeAllWindows: {
            keywords: ['最小化全部窗口', '最小化所有窗口', '收起全部窗口', '一键最小化', 'minimize all windows', 'show desktop'],
            action: 'window:minimizeAll',
            response: { zh: '已最小化所有窗口。', en: 'All windows minimized.' }
        },
        minimizeTopWindow: {
            keywords: ['最小化当前窗口', '最小化前台窗口', '收起当前窗口', '收起前台窗口', 'minimize current window', 'minimize top window'],
            action: 'window:minimizeTop',
            response: { zh: '已最小化当前窗口。', en: 'Top window minimized.' }
        },
        snapLayoutGuide: {
            keywords: [
                '怎么分屏',
                '如何分屏',
                '贴边布局怎么用',
                '怎么贴边布局',
                '窗口贴边',
                '分屏布局',
                'how to snap windows',
                'how to use snap layout',
                'window snapping'
            ],
            action: 'openSettings:multitask',
            response: {
                zh: '分屏/贴边布局可以这样用：\n1. 拖动窗口到屏幕左/右边缘，松手即可半屏\n2. 拖动到四角可四分屏\n3. 鼠标悬停窗口「最大化」按钮，也可选择布局\n\n我已为你打开「设置 → 多任务」，你可以检查贴边分屏是否开启。',
                en: 'Use snap layouts like this:\n1. Drag a window to left/right edge and release for half screen\n2. Drag to corners for quarter layouts\n3. Hover the maximize button to pick a layout\n\nI opened "Settings → Multitasking" so you can check snap options.'
            }
        },
        panelGuide: {
            keywords: [
                '怎么打开控制中心',
                '如何打开控制中心',
                '怎么打开通知中心',
                '如何打开通知中心',
                '控制中心怎么开',
                '通知中心怎么开',
                'how to open control center',
                'how to open notification center'
            ],
            action: 'none',
            response: {
                zh: '打开方式如下：\n1. 控制中心：点任务栏右下角快捷区，或按 Alt+A\n2. 通知中心：点任务栏时间区域\n\n如果你愿意，我也可以直接帮你打开控制中心。',
                en: 'Here are quick ways:\n1. Control Center: click the quick-area at bottom-right, or press Alt+A\n2. Notification Center: click the taskbar time area\n\nIf you want, I can also open Control Center for you now.'
            }
        },
        openControlCenter: {
            keywords: ['打开控制中心', '打开快捷设置', 'open control center', 'open quick settings'],
            action: 'panel:control',
            response: { zh: '已为你打开控制中心。', en: 'Control Center opened.' }
        },
        openNotificationCenter: {
            keywords: ['打开通知中心', '查看通知', '打开消息中心', 'open notification center', 'open notifications'],
            action: 'panel:notification',
            response: { zh: '已为你打开通知中心。', en: 'Notification Center opened.' }
        },
        resetThemeEffectsGuide: {
            keywords: [
                '怎么重置主题和动效到默认',
                '如何重置主题和动效',
                '主题和动效怎么恢复默认',
                'how to reset theme and effects to default',
                'how to reset appearance defaults'
            ],
            action: 'none',
            response: {
                zh: '你可以这样恢复默认外观：\n1. 主题设为浅色（Light）\n2. 开启动画\n3. 开启模糊与窗口模糊\n4. 关闭新版外观（V2）\n\n如果你希望我直接执行，回复「重置主题和动效」。',
                en: 'To restore default appearance:\n1. Set theme to Light\n2. Enable animation\n3. Enable blur and window blur\n4. Disable Fluent V2\n\nIf you want me to apply it now, reply "reset theme and effects".'
            }
        },
        resetThemeEffectsNow: {
            keywords: ['重置主题和动效', '恢复默认主题和动效', '重置外观默认', 'reset theme and effects', 'reset appearance defaults'],
            action: 'resetAppearanceDefaults',
            response: { zh: '已将主题与动效恢复为默认设置。', en: 'Theme and effects have been reset to defaults.' }
        },
        taskbarPinGuide: {
            keywords: [
                '任务栏能不能固定app',
                '任务栏能固定app吗',
                '任务栏可以固定应用吗',
                '怎么固定到任务栏',
                '如何固定到任务栏',
                '固定app到任务栏',
                '把应用固定到任务栏',
                'pin app to taskbar',
                'pin to taskbar',
                'can i pin app to taskbar',
                'how to pin app to taskbar'
            ],
            action: 'none',
            response: {
                zh: '可以，操作很简单：\n1. 打开开始菜单（按 Alt 或点任务栏开始按钮）\n2. 找到目标 App，鼠标右键\n3. 在菜单里点「固定到任务栏」\n\n如果 App 已经在运行，也可以直接右键任务栏里的该图标，选择「固定到任务栏」。',
                en: 'Yes, it is easy:\n1. Open Start Menu (press Alt or click Start)\n2. Right-click the target app\n3. Choose "Pin to taskbar"\n\nIf the app is already running, right-click its taskbar icon and choose "Pin to taskbar".'
            }
        },
        taskbarUnpinGuide: {
            keywords: [
                '怎么取消固定任务栏',
                '如何取消固定任务栏',
                '从任务栏取消固定',
                '取消固定到任务栏',
                '解除任务栏固定',
                'unpin from taskbar',
                'how to unpin app from taskbar'
            ],
            action: 'none',
            response: {
                zh: '取消固定也很快：\n1. 在任务栏找到该 App 图标\n2. 右键图标\n3. 选择「从任务栏取消固定」',
                en: 'To unpin:\n1. Find the app icon on taskbar\n2. Right-click it\n3. Choose "Unpin from taskbar"'
            }
        },
        windowRestoreGuide: {
            keywords: [
                '最小化窗口去哪了',
                '窗口最小化后怎么恢复',
                '窗口不见了怎么办',
                '怎么恢复窗口',
                'where is minimized window',
                'how to restore minimized window'
            ],
            action: 'none',
            response: {
                zh: '可以这样恢复窗口：\n1. 点击任务栏中对应 App 图标（最常用）\n2. 或按 Alt+W 打开任务视图，再单击窗口\n3. 若全都收起了，可先按 Alt+D 再点目标 App',
                en: 'You can restore windows by:\n1. Clicking the app icon on taskbar (most common)\n2. Or press Alt+W for Task View, then click the window\n3. If everything is minimized, press Alt+D first, then click the target app'
            }
        },
        quickStartGuide: {
            keywords: [
                '新手怎么用',
                '怎么快速上手',
                '刚开始怎么用',
                '新手教程',
                'quick start',
                'new user guide',
                'how to get started'
            ],
            action: 'none',
            response: {
                zh: '给你一份 30 秒快速上手：\n1. 按 Alt 打开开始菜单\n2. 按 Alt+I 打开设置\n3. 按 Alt+W 打开任务视图\n4. 右键开始菜单中的 App 可「固定到任务栏」\n5. 不会的直接问我：例如「怎么切换语言」「怎么安装应用」',
                en: 'Here is a 30-second quick start:\n1. Press Alt to open Start Menu\n2. Press Alt+I to open Settings\n3. Press Alt+W to open Task View\n4. Right-click apps in Start Menu to "Pin to taskbar"\n5. Ask me directly, e.g. "how to change language" or "how to install apps"'
            }
        },
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
            keywords: ['打开', '启动', '运行', '打开一下', '开一下', '点开', 'open', 'launch', 'run', 'start'],
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
            keywords: ['开启网络', '打开wifi', '打开wi-fi', '打开网络', '开启wifi', '开启wi-fi', '打开无线网', '开启无线网', 'wifi on', 'enable wifi', 'turn on wifi'],
            action: 'setWifi:true',
            response: { zh: 'Wi-Fi 已开启 📡', en: 'Wi-Fi enabled 📡' }
        },
        wifiOff: {
            keywords: ['关闭网络', '关闭wifi', '关闭wi-fi', '禁用网络', '关闭无线网', '断开无线网', 'wifi off', 'disable wifi', 'turn off wifi'],
            action: 'setWifi:false',
            response: { zh: 'Wi-Fi 已关闭', en: 'Wi-Fi disabled' }
        },
        // ===== 语言设置 =====
        languageSupportInfo: {
            keywords: [
                '你会什么语言',
                '你会说什么语言',
                '你支持什么语言',
                '你会哪些语言',
                '你会说啥语言',
                'what languages do you speak',
                'what language do you support',
                'which languages do you support'
            ],
            action: 'none',
            response: {
                zh: '我目前只支持中文和英语，我正在努力学习更多语言，敬请期待。',
                en: 'I currently support only Chinese and English. I am learning more languages, so stay tuned.'
            }
        },
        languageAbilityGuide: {
            keywords: [
                '你会说英文吗',
                '你会说中文吗',
                '你会英语吗',
                '你会中文吗',
                '可以说英文吗',
                '可以说中文吗',
                '能切换英文吗',
                '能切换中文吗',
                'can you speak english',
                'can you speak chinese',
                'do you support english',
                'do you support chinese'
            ],
            action: 'openSettings:time-language',
            response: {
                zh: '我目前支持中文和英语。已为你打开「语言设置」🌍\n你可以在里面切换为中文或 English。',
                en: 'I currently support Chinese and English. I opened Language Settings 🌍\nYou can switch to English or Chinese there.'
            }
        },
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
            keywords: ['fingo设置', 'fingo ai设置', 'fingo ai 设定', 'fingoai设置', '调整fingo', 'ai设置', 'fingo settings', 'ai settings', 'fingo ai settings'],
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
            action: 'offerQuickStart',
            response: {
                zh: [
                    '你好呀，我是 Fingo 👋 你的系统搭子已上线！\n要不要我给你一份 30 秒新手指引？（是/否）',
                    '嗨～Fingo 在这儿 ✨\n想快速熟悉 FluentOS 吗？回复「是」我马上带你上手。'
                ],
                en: [
                    'Hi, I am Fingo 👋 Your system sidekick is ready.\nWant a 30-second quick-start guide? (yes/no)',
                    'Hey there ✨\nWant to learn FluentOS quickly? Reply "yes" and I will guide you.'
                ]
            }
        },
        help: {
            keywords: ['帮助', '帮助一下', '你能做什么', '功能', '你能干啥', '怎么用', 'help', 'what can you do', 'how to use'],
            action: 'none',
            response: {
                zh: '我是 Fingo，你的系统智能助手 🤖 以下是我能帮你做的事：\n\n🎨外观主题\n　「切换深色模式」「浅色模式」「自动主题」\n\n✨ 系统效果\n　「开启/关闭模糊」「开启/关闭动画」「窗口模糊」「新版外观」\n　「进入网页全屏」「退出网页全屏」「开启/关闭开机自动网页全屏」\n　「重置主题和动效」恢复默认外观\n\n🧭 多任务与窗口\n　「打开/关闭任务视图」「最小化所有窗口」「最小化当前窗口」\n　「怎么分屏/贴边布局」「窗口不见了怎么办」\n\n📶 连接与网络\n　「开启/关闭蓝牙」「开启/关闭Wi-Fi」\n\n📱应用管理\n　「安装哔哩哔哩」「卸载xx」「修复浏览器」\n　· 系统应用不可卸载，运行中的应用会先询问确认\n\n🖼️ 个性化\n　「换张壁纸」自动从 Bing 获取精美壁纸\n　「调高/调低亮度」\n　「任务栏能不能固定App」\n\n💬 休闲聊天\n　「我好无聊」「讲个笑话」「来个谜语」「现在几点」\n\n⚙️ 系统设置\n　「语言设置」「改密码」「Fingo AI 设置」\n　「你会说什么语言」「你会说英文吗」\n\n⚡ 电源操作\n　「关机」「重启」「注销」「锁屏」\n\n💡 想了解 FluentOS？说「介绍FluentOS」\n🧠 想让我更聪明？说「自定义模式」了解 API 接入',
                en: 'I\'m Fingo, your system assistant \u{1F916} Here\'s what I can do:\n\n\u{1F3A8} Themes\n\u3000"dark mode" "light mode" "auto theme"\n\n\u2728 Effects\n\u3000"enable/disable blur" "animation" "window blur" "new UI"\n\u3000"enter fullscreen" "exit fullscreen" "enable/disable auto web fullscreen on boot"\n\u3000"reset theme and effects" to defaults\n\n\u{1F9ED} Multitasking\n\u3000"open/close task view" "minimize all windows" "minimize current window"\n\u3000"how to snap windows" "where is minimized window"\n\n\u{1F4F6} Connectivity\n\u3000"enable/disable bluetooth" "enable/disable Wi-Fi"\n\n\u{1F4F1} App Management\n\u3000"install Bilibili" "uninstall xx" "repair browser"\n\u3000\u00B7 System apps can\'t be uninstalled; running apps ask for confirmation\n\n\u{1F5BC}\uFE0F Personalization\n\u3000"change wallpaper" and "brightness up/down"\n\u3000"how to pin app to taskbar"\n\n\u{1F4AC} Casual Chat\n\u3000"i am bored" "tell me a joke" "give me a riddle" "what time is it"\n\n\u2699\uFE0F Settings\n\u3000"language settings" "change password" "Fingo AI settings"\n\u3000"what languages do you speak" "can you speak english/chinese"\n\n\u26A1 Power\n\u3000"shutdown" "restart" "logout" "lock"\n\n\u{1F4A1} Say "about FluentOS" to learn more\n\u{1F9E0} Say "custom mode" to connect your own AI API'
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
