/**
 * 灵翼交互系统 - LingYi Gesture Interaction
 * 基于 MediaPipe Hands 的手势识别和交互系统
 * 
 * 功能：
 * - 食指追踪移动光标
 * - 捏合食指和拇指 = 鼠标左键单击（触发按钮、开关等）
 * - 三指闭合 = 鼠标右键单击（打开右键菜单）
 * - 窗口边缘检测和大小调节（需要捏合拖动）
 * - 实时手势代码显示（调试模式）
 */

const LingYi = {
    // 状态
    enabled: false,
    initialized: false,
    
    // MediaPipe Hands 实例
    hands: null,
    camera: null,
    
    // DOM 元素
    videoElement: null,
    canvasElement: null,
    cursorElement: null,
    rippleElement: null,
    codePanel: null,
    cameraPreview: null,
    
    // 配置选项
    options: {
        showCamera: false,       // 显示摄像头画面
        showCodePanel: false,    // 显示代码面板
        cursorSize: 16,          // 光标大小
        smoothFactor: 0.3,       // 平滑系数
        pinchThreshold: 0.25,    // 捏合阈值（拇指+食指）
        threeFingerThreshold: 0.3, // 三指闭合阈值
        edgeThreshold: 20,       // 边缘检测阈值
        cornerThreshold: 30      // 角落检测阈值
    },
    
    // 手势状态
    gesture: {
        state: 'IDLE',              // IDLE, POINTING, HOVERING, PINCHING, RESIZING, THREE_FINGER, FIST_DRAG
        indexTip: { x: 0, y: 0 },   // 食指尖位置 (归一化)
        thumbTip: { x: 0, y: 0 },   // 拇指尖位置 (归一化)
        middleTip: { x: 0, y: 0 },  // 中指尖位置 (归一化)
        palmCenter: { x: 0, y: 0 }, // 手掌中心位置
        cursorPos: { x: 0, y: 0 },  // 当前光标位置 (屏幕坐标)
        smoothPos: { x: 0, y: 0 },  // 平滑后的光标位置
        isPinching: false,          // 是否捏合（拇指+食指）= 左键
        isThreeFingerClose: false,  // 是否三指闭合 = 右键
        isOpenPalm: false,          // 是否张开手掌 = 滚动模式
        isFistClosed: false,        // 是否握拳 = 拖动窗口
        pinchDist: 0,               // 捏合距离
        threeFingerDist: 0,         // 三指距离
        openPalmScore: 0,           // 张开手掌程度 (0-1)
        fistScore: 0,               // 握拳程度 (0-1)
        wasPinching: false,         // 上一帧是否捏合
        wasThreeFingerClose: false, // 上一帧是否三指闭合
        wasOpenPalm: false,         // 上一帧是否张开手掌
        wasFistClosed: false,       // 上一帧是否握拳
        handSize: 0,                // 手掌大小 (用于归一化)
        landmarks: null,            // 完整的手部关键点
        confidence: 0               // 检测置信度
    },
    
    // 滚动状态（五指并拢挥手）
    scrollState: {
        isScrolling: false,
        startPalmPos: null,
        lastPalmPos: null,
        scrollDirection: null,     // 'up', 'down', 'left', 'right'
        scrollSpeed: 0,
        scrollThreshold: 0.03,     // 移动阈值
        scrollMultiplier: 800      // 滚动速度倍数
    },
    
    // 代码面板状态（黑客帝国效果）
    matrixState: {
        logs: [],                  // 日志历史
        maxLogs: 50,               // 最大日志数
        frameCount: 0,             // 帧计数
        lastUpdateTime: 0          // 上次更新时间
    },
    
    // 窗口调节状态
    resizeState: {
        isNearEdge: false,
        isNearCorner: false,
        edge: null,              // 'top', 'bottom', 'left', 'right'
        corner: null,            // 'tl', 'tr', 'bl', 'br'
        targetWindow: null,
        isResizing: false,
        startPos: null,
        startBounds: null
    },
    
    // 悬停状态
    hoverState: {
        isHovering: false,
        targetElement: null,
        hoverStartTime: 0
    },

    // 握拳拖动窗口状态
    fistDragState: {
        isDragging: false,
        targetWindow: null,
        startPos: null,           // 开始拖动时的光标位置
        startWindowPos: null,     // 开始拖动时的窗口位置
        fistThreshold: 0.35       // 握拳检测阈值
    },
    
    /**
     * 初始化灵翼交互系统
     */
    async init() {
        if (this.initialized) return;
        
        console.log('[LingYi] 初始化灵翼交互系统...');
        
        // 创建必要的 DOM 元素
        this.createElements();
        
        // 加载 MediaPipe Hands
        try {
            await this.loadMediaPipe();
            this.initialized = true;
            console.log('[LingYi] 初始化完成');
        } catch (error) {
            console.error('[LingYi] 初始化失败:', error);
            throw error;
        }
    },
    
    /**
     * 创建 DOM 元素
     */
    createElements() {
        // 创建视频元素（隐藏）
        this.videoElement = document.createElement('video');
        this.videoElement.id = 'lingyi-video';
        this.videoElement.autoplay = true;
        this.videoElement.playsInline = true;
        this.videoElement.style.cssText = 'position: fixed; top: 0; left: 0; width: 1px; height: 1px; opacity: 0; pointer-events: none; z-index: -1;';
        document.body.appendChild(this.videoElement);
        
        // 创建画布元素（用于手势可视化）
        this.canvasElement = document.createElement('canvas');
        this.canvasElement.id = 'lingyi-canvas';
        this.canvasElement.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 99999;';
        document.body.appendChild(this.canvasElement);
        
        // 创建光标元素
        this.cursorElement = document.createElement('div');
        this.cursorElement.id = 'lingyi-cursor';
        this.cursorElement.className = 'lingyi-cursor';
        this.cursorElement.innerHTML = `
            <div class="lingyi-cursor-dot"></div>
            <div class="lingyi-cursor-ring"></div>
        `;
        document.body.appendChild(this.cursorElement);
        
        // 创建波纹元素
        this.rippleElement = document.createElement('div');
        this.rippleElement.id = 'lingyi-ripple';
        this.rippleElement.className = 'lingyi-ripple';
        document.body.appendChild(this.rippleElement);
        
        // 创建代码面板
        this.codePanel = document.createElement('div');
        this.codePanel.id = 'lingyi-code-panel';
        this.codePanel.className = 'lingyi-code-panel';
        this.codePanel.innerHTML = `
            <div class="lingyi-code-header">
                <span>灵翼交互 - 实时数据</span>
                <button class="lingyi-code-close">&times;</button>
            </div>
            <div class="lingyi-code-content">
                <pre id="lingyi-code-data"></pre>
            </div>
        `;
        document.body.appendChild(this.codePanel);
        
        // 创建摄像头预览窗口
        this.cameraPreview = document.createElement('div');
        this.cameraPreview.id = 'lingyi-camera-preview';
        this.cameraPreview.className = 'lingyi-camera-preview';
        this.cameraPreview.innerHTML = `
            <div class="lingyi-preview-header">
                <span>摄像头预览</span>
                <button class="lingyi-preview-close">&times;</button>
            </div>
            <div class="lingyi-preview-content">
                <canvas id="lingyi-preview-canvas"></canvas>
            </div>
        `;
        document.body.appendChild(this.cameraPreview);
        
        // 绑定关闭按钮事件
        this.codePanel.querySelector('.lingyi-code-close').addEventListener('click', () => {
            this.setOption('showCodePanel', false);
        });
        
        this.cameraPreview.querySelector('.lingyi-preview-close').addEventListener('click', () => {
            this.setOption('showCamera', false);
        });
    },
    
    /**
     * 加载 MediaPipe Hands
     */
    async loadMediaPipe() {
        return new Promise((resolve, reject) => {
            // 检查 MediaPipe 是否已加载
            if (typeof Hands !== 'undefined') {
                this.setupHands();
                resolve();
                return;
            }
            
            // 动态加载脚本
            const scripts = [
                'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
                'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
                'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'
            ];
            
            let loadedCount = 0;
            const totalScripts = scripts.length;
            
            scripts.forEach(src => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => {
                    loadedCount++;
                    if (loadedCount === totalScripts) {
                        // 给一点时间让脚本初始化
                        setTimeout(() => {
                            try {
                                this.setupHands();
                                resolve();
                            } catch (e) {
                                reject(e);
                            }
                        }, 100);
                    }
                };
                script.onerror = () => reject(new Error(`Failed to load ${src}`));
                document.head.appendChild(script);
            });
        });
    },
    
    /**
     * 设置 MediaPipe Hands
     */
    setupHands() {
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });
        
        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5
        });
        
        this.hands.onResults(this.onHandResults.bind(this));
    },
    
    /**
     * 启动灵翼交互
     */
    async start() {
        if (!this.initialized) {
            await this.init();
        }
        
        if (this.enabled) return;
        
        console.log('[LingYi] 启动手势识别...');
        
        try {
            // 启动摄像头
            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    if (this.enabled && this.hands) {
                        await this.hands.send({ image: this.videoElement });
                    }
                },
                width: 640,
                height: 480
            });
            
            await this.camera.start();
            
            this.enabled = true;
            
            // 隐藏系统鼠标
            document.body.classList.add('lingyi-active');
            
            // 显示光标
            this.cursorElement.classList.add('active');
            
            // 触发状态更新
            State.updateSettings({ lingyiEnabled: true });
            
            console.log('[LingYi] 手势识别已启动');
            
        } catch (error) {
            console.error('[LingYi] 启动失败:', error);
            State.addNotification({
                title: '灵翼交互',
                message: '无法启动摄像头，请检查权限设置',
                type: 'error'
            });
            throw error;
        }
    },
    
    /**
     * 停止灵翼交互
     */
    stop() {
        if (!this.enabled) return;
        
        console.log('[LingYi] 停止手势识别...');
        
        // 停止摄像头
        if (this.camera) {
            this.camera.stop();
            this.camera = null;
        }
        
        this.enabled = false;
        
        // 恢复系统鼠标
        document.body.classList.remove('lingyi-active');
        
        // 隐藏光标
        this.cursorElement.classList.remove('active');
        
        // 隐藏调试面板
        this.codePanel.classList.remove('visible');
        this.cameraPreview.classList.remove('visible');
        
        // 触发状态更新
        State.updateSettings({ lingyiEnabled: false });
        
        console.log('[LingYi] 手势识别已停止');
    },
    
    /**
     * 设置选项
     */
    setOption(key, value) {
        this.options[key] = value;
        
        switch (key) {
            case 'showCamera':
                if (value) {
                    this.cameraPreview.classList.add('visible');
                } else {
                    this.cameraPreview.classList.remove('visible');
                }
                break;
                
            case 'showCodePanel':
                if (value) {
                    this.codePanel.classList.add('visible');
                } else {
                    this.codePanel.classList.remove('visible');
                }
                break;
        }
    },
    
    /**
     * 手势识别结果处理
     */
    onHandResults(results) {
        if (!this.enabled) return;
        
        // 更新摄像头预览
        if (this.options.showCamera) {
            this.updateCameraPreview(results);
        }
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            this.processHandLandmarks(landmarks);
        } else {
            // 没有检测到手
            this.gesture.state = 'IDLE';
            this.gesture.landmarks = null;
            this.gesture.confidence = 0;
            
            // 淡出光标
            this.cursorElement.classList.remove('pointing', 'hovering', 'resizing');
        }
        
        // 更新代码面板
        if (this.options.showCodePanel) {
            this.updateCodePanel();
        }
    },
    
    /**
     * 处理手部关键点
     */
    processHandLandmarks(landmarks) {
        this.gesture.landmarks = landmarks;
        this.gesture.confidence = 1;
        
        // 获取关键点
        // MediaPipe Hand Landmarks:
        // 0: wrist, 4: thumb_tip, 8: index_tip, 12: middle_tip, 16: ring_tip, 20: pinky_tip
        // MCP joints: 5 (index), 9 (middle), 13 (ring), 17 (pinky)
        const wrist = landmarks[0];
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        const indexMcp = landmarks[5];
        const middleMcp = landmarks[9];
        const ringMcp = landmarks[13];
        const pinkyMcp = landmarks[17];
        
        // 计算手掌大小（用于归一化）
        this.gesture.handSize = this.distance(wrist, indexMcp);
        
        // 计算手掌中心
        this.gesture.palmCenter = {
            x: (wrist.x + indexMcp.x + middleMcp.x + ringMcp.x + pinkyMcp.x) / 5,
            y: (wrist.y + indexMcp.y + middleMcp.y + ringMcp.y + pinkyMcp.y) / 5
        };
        
        // 保存关键点位置
        this.gesture.thumbTip = { x: thumbTip.x, y: thumbTip.y };
        this.gesture.indexTip = { x: indexTip.x, y: indexTip.y };
        this.gesture.middleTip = { x: middleTip.x, y: middleTip.y };
        
        // ===== 捏合检测（拇指 + 食指）= 左键单击 =====
        const rawPinchDist = this.distance(thumbTip, indexTip);
        this.gesture.pinchDist = rawPinchDist / this.gesture.handSize;
        
        this.gesture.wasPinching = this.gesture.isPinching;
        this.gesture.isPinching = this.gesture.pinchDist < this.options.pinchThreshold;
        
        // ===== 三指闭合检测（拇指 + 食指 + 中指）= 右键单击 =====
        const thumbIndexDist = this.distance(thumbTip, indexTip) / this.gesture.handSize;
        const thumbMiddleDist = this.distance(thumbTip, middleTip) / this.gesture.handSize;
        const indexMiddleDist = this.distance(indexTip, middleTip) / this.gesture.handSize;
        
        this.gesture.threeFingerDist = (thumbIndexDist + thumbMiddleDist + indexMiddleDist) / 3;
        
        this.gesture.wasThreeFingerClose = this.gesture.isThreeFingerClose;
        this.gesture.isThreeFingerClose = 
            thumbIndexDist < this.options.threeFingerThreshold &&
            thumbMiddleDist < this.options.threeFingerThreshold &&
            indexMiddleDist < this.options.threeFingerThreshold;
        
        // ===== 张开手掌检测 = 滚动模式 =====
        // 检测所有手指是否都伸展开（手指尖远离手腕）
        const indexExtended = this.distance(indexTip, wrist) / this.gesture.handSize;
        const middleExtended = this.distance(middleTip, wrist) / this.gesture.handSize;
        const ringExtended = this.distance(ringTip, wrist) / this.gesture.handSize;
        const pinkyExtended = this.distance(pinkyTip, wrist) / this.gesture.handSize;
        
        // 检测手指是否都伸展（距离手腕较远）
        const extendThreshold = 1.8; // 伸展阈值
        const allFingersExtended = 
            indexExtended > extendThreshold &&
            middleExtended > extendThreshold &&
            ringExtended > extendThreshold &&
            pinkyExtended > extendThreshold * 0.8; // 小指稍短
        
        // 同时确保不是捏合或三指闭合状态
        const notPinching = this.gesture.pinchDist > this.options.pinchThreshold * 1.5;
        const notThreeFinger = this.gesture.threeFingerDist > this.options.threeFingerThreshold * 1.5;

        // 计算张开手掌程度
        const avgExtension = (indexExtended + middleExtended + ringExtended + pinkyExtended) / 4;
        this.gesture.openPalmScore = Math.min(1, avgExtension / 2.5);

        this.gesture.wasOpenPalm = this.gesture.isOpenPalm;
        this.gesture.isOpenPalm = allFingersExtended && notPinching && notThreeFinger;

        // ===== 握拳检测 = 拖动置顶窗口 =====
        // 握拳时所有手指尖都靠近手掌中心
        const thumbToPalm = this.distance(thumbTip, this.gesture.palmCenter) / this.gesture.handSize;
        const indexToPalm = this.distance(indexTip, this.gesture.palmCenter) / this.gesture.handSize;
        const middleToPalm = this.distance(middleTip, this.gesture.palmCenter) / this.gesture.handSize;
        const ringToPalm = this.distance(ringTip, this.gesture.palmCenter) / this.gesture.handSize;
        const pinkyToPalm = this.distance(pinkyTip, this.gesture.palmCenter) / this.gesture.handSize;

        // 计算握拳程度（所有手指尖到手掌中心的平均距离）
        const avgFingerToPalm = (thumbToPalm + indexToPalm + middleToPalm + ringToPalm + pinkyToPalm) / 5;
        this.gesture.fistScore = Math.max(0, 1 - avgFingerToPalm / 1.2);

        // 握拳检测：所有手指都弯曲靠近手掌
        const fistThreshold = this.fistDragState.fistThreshold;
        const allFingersCurled =
            indexToPalm < fistThreshold * 1.5 &&
            middleToPalm < fistThreshold * 1.5 &&
            ringToPalm < fistThreshold * 1.5 &&
            pinkyToPalm < fistThreshold * 1.8; // 小指稍微宽松

        this.gesture.wasFistClosed = this.gesture.isFistClosed;
        this.gesture.isFistClosed = allFingersCurled && this.gesture.fistScore > 0.5;

        // 计算屏幕坐标（镜像翻转 X 轴）- 握拳时使用手掌中心
        let screenX, screenY;
        if (this.gesture.isFistClosed) {
            // 握拳时使用手掌中心位置
            screenX = (1 - this.gesture.palmCenter.x) * window.innerWidth;
            screenY = this.gesture.palmCenter.y * window.innerHeight;
        } else {
            // 正常时使用食指尖位置
            screenX = (1 - indexTip.x) * window.innerWidth;
            screenY = indexTip.y * window.innerHeight;
        }
        
        // 平滑处理
        this.gesture.cursorPos = { x: screenX, y: screenY };
        this.gesture.smoothPos.x += (screenX - this.gesture.smoothPos.x) * this.options.smoothFactor;
        this.gesture.smoothPos.y += (screenY - this.gesture.smoothPos.y) * this.options.smoothFactor;
        
        // 更新光标位置
        this.updateCursor();
        
        // 检测窗口边缘
        this.checkWindowEdge();
        
        // 处理交互
        this.processInteraction();
        
        // 处理滚动
        this.processScrollGesture();
    },
    
    /**
     * 更新光标位置和状态
     */
    updateCursor() {
        const { smoothPos } = this.gesture;
        
        // 更新光标位置
        this.cursorElement.style.transform = `translate(${smoothPos.x}px, ${smoothPos.y}px)`;
        
        // 检测悬停目标
        const elementsAtPoint = document.elementsFromPoint(smoothPos.x, smoothPos.y);
        const interactiveElement = elementsAtPoint.find(el => {
            return el.matches('button, a, [role="button"], .clickable, .window-control-btn, .window-resize-handle, .start-app-item, .taskbar-btn');
        });
        
        // 更新悬停状态
        if (interactiveElement && !this.resizeState.isNearEdge) {
            if (!this.hoverState.isHovering || this.hoverState.targetElement !== interactiveElement) {
                this.hoverState.isHovering = true;
                this.hoverState.targetElement = interactiveElement;
                this.hoverState.hoverStartTime = Date.now();
                
                this.cursorElement.classList.add('hovering');
                this.gesture.state = 'HOVERING';
            }
        } else if (!this.resizeState.isNearEdge) {
            this.hoverState.isHovering = false;
            this.hoverState.targetElement = null;
            
            this.cursorElement.classList.remove('hovering');
            this.gesture.state = 'POINTING';
        }
        
        // 更新调节箭头状态
        this.updateResizeCursor();
    },
    
    /**
     * 检测窗口边缘
     */
    checkWindowEdge() {
        const { smoothPos } = this.gesture;
        const threshold = this.options.edgeThreshold;
        const cornerThreshold = this.options.cornerThreshold;
        
        // 获取所有窗口
        const windows = document.querySelectorAll('.window:not(.minimized)');
        let nearestWindow = null;
        let nearestEdge = null;
        let nearestCorner = null;
        
        windows.forEach(win => {
            const rect = win.getBoundingClientRect();
            const x = smoothPos.x;
            const y = smoothPos.y;
            
            // 检查是否在窗口附近
            const isNearWindow = 
                x >= rect.left - threshold && 
                x <= rect.right + threshold &&
                y >= rect.top - threshold && 
                y <= rect.bottom + threshold;
            
            if (!isNearWindow) return;
            
            // 检测角落（优先级更高）
            const isNearTop = Math.abs(y - rect.top) < cornerThreshold;
            const isNearBottom = Math.abs(y - rect.bottom) < cornerThreshold;
            const isNearLeft = Math.abs(x - rect.left) < cornerThreshold;
            const isNearRight = Math.abs(x - rect.right) < cornerThreshold;
            
            if (isNearTop && isNearLeft) {
                nearestWindow = win;
                nearestCorner = 'tl';
            } else if (isNearTop && isNearRight) {
                nearestWindow = win;
                nearestCorner = 'tr';
            } else if (isNearBottom && isNearLeft) {
                nearestWindow = win;
                nearestCorner = 'bl';
            } else if (isNearBottom && isNearRight) {
                nearestWindow = win;
                nearestCorner = 'br';
            } else if (Math.abs(y - rect.top) < threshold && x > rect.left && x < rect.right) {
                nearestWindow = win;
                nearestEdge = 'top';
            } else if (Math.abs(y - rect.bottom) < threshold && x > rect.left && x < rect.right) {
                nearestWindow = win;
                nearestEdge = 'bottom';
            } else if (Math.abs(x - rect.left) < threshold && y > rect.top && y < rect.bottom) {
                nearestWindow = win;
                nearestEdge = 'left';
            } else if (Math.abs(x - rect.right) < threshold && y > rect.top && y < rect.bottom) {
                nearestWindow = win;
                nearestEdge = 'right';
            }
        });
        
        // 更新状态
        this.resizeState.targetWindow = nearestWindow;
        this.resizeState.edge = nearestEdge;
        this.resizeState.corner = nearestCorner;
        this.resizeState.isNearEdge = !!(nearestEdge || nearestCorner);
        this.resizeState.isNearCorner = !!nearestCorner;
        
        if (this.resizeState.isNearEdge) {
            this.gesture.state = 'RESIZING';
            this.cursorElement.classList.add('resizing');
        } else if (!this.resizeState.isResizing) {
            this.cursorElement.classList.remove('resizing');
        }
    },
    
    /**
     * 更新调节光标样式
     */
    updateResizeCursor() {
        const { edge, corner, isNearEdge } = this.resizeState;
        
        // 移除所有方向类
        this.cursorElement.classList.remove('resize-n', 'resize-s', 'resize-e', 'resize-w', 'resize-nw', 'resize-ne', 'resize-sw', 'resize-se');
        
        if (!isNearEdge) return;
        
        // 添加对应方向类
        if (corner) {
            const cornerClasses = {
                'tl': 'resize-nw',
                'tr': 'resize-ne',
                'bl': 'resize-sw',
                'br': 'resize-se'
            };
            this.cursorElement.classList.add(cornerClasses[corner]);
        } else if (edge) {
            const edgeClasses = {
                'top': 'resize-n',
                'bottom': 'resize-s',
                'left': 'resize-w',
                'right': 'resize-e'
            };
            this.cursorElement.classList.add(edgeClasses[edge]);
        }
    },
    
    /**
     * 处理交互
     */
    processInteraction() {
        const { isPinching, wasPinching, isThreeFingerClose, wasThreeFingerClose, isFistClosed, wasFistClosed }= this.gesture;

        // ===== 握拳拖动窗口 =====
        // 检测握拳开始
        if (isFistClosed && !wasFistClosed) {
            this.onFistStart();
        }

        // 检测握拳持续（拖动中）
        if (isFistClosed && wasFistClosed) {
            this.onFistHold();
        }

        // 检测握拳结束
        if (!isFistClosed && wasFistClosed) {
            this.onFistEnd();
        }

        // 如果正在握拳拖动，跳过其他交互
        if (this.fistDragState.isDragging) {
            return;
        }

        // ===== 捏合（拇指+食指）= 左键单击 =====
        // 检测捏合开始
        if (isPinching && !wasPinching) {
            this.onPinchStart();
        }

        // 检测捏合持续
        if (isPinching && wasPinching) {
            this.onPinchHold();
        }

        // 检测捏合结束
        if (!isPinching && wasPinching) {
            this.onPinchEnd();
        }

        // ===== 三指闭合 = 右键单击 =====
        // 检测三指闭合开始
        if (isThreeFingerClose && !wasThreeFingerClose) {
            this.onThreeFingerStart();
        }
    },

    /**
     * 握拳开始 - 开始拖动置顶窗口
     */
    onFistStart() {
        console.log('[LingYi] 握拳开始 - 准备拖动窗口');

        // 找到当前置顶的窗口（z-index 最高的非最小化窗口）
        const windows = document.querySelectorAll('.window:not(.minimized):not(.closing)');
        if (windows.length === 0) return;

        let topWindow = null;
        let maxZIndex = -1;

        windows.forEach(win => {
            const zIndex = parseInt(win.style.zIndex) || 0;
            if (zIndex > maxZIndex) {
                maxZIndex = zIndex;
                topWindow = win;
            }
        });

        if (!topWindow) return;

        // 开始拖动
        this.fistDragState.isDragging = true;
        this.fistDragState.targetWindow = topWindow;
        this.fistDragState.startPos = { ...this.gesture.smoothPos };
        this.fistDragState.startWindowPos = {
            left: parseFloat(topWindow.style.left) || topWindow.offsetLeft,
            top: parseFloat(topWindow.style.top) || topWindow.offsetTop
        };

        // 添加拖动样式
        topWindow.classList.add('fist-dragging');
        topWindow.style.transition = 'none'; // 禁用过渡动画
        this.cursorElement.classList.add('fist-drag');
        this.gesture.state = 'FIST_DRAG';

        // 显示拖动波纹
        this.showRipple('fist');

        this.addMatrixLog('FIST_DRAG', `Started dragging window: ${topWindow.id}`);
    },

    /**
     * 握拳持续 - 拖动窗口
     */
    onFistHold() {
        if (!this.fistDragState.isDragging || !this.fistDragState.targetWindow) return;

        const { smoothPos } = this.gesture;
        const { startPos, startWindowPos, targetWindow } = this.fistDragState;

        // 计算位移
        const deltaX = smoothPos.x - startPos.x;
        const deltaY = smoothPos.y - startPos.y;

        // 更新窗口位置
        const newLeft = startWindowPos.left + deltaX;
        const newTop = startWindowPos.top + deltaY;

        // 限制窗口不要完全移出屏幕
        const minVisible = 100;
        const maxLeft = window.innerWidth - minVisible;
        const maxTop = window.innerHeight - minVisible;

        targetWindow.style.left = `${Math.max(-targetWindow.offsetWidth + minVisible, Math.min(maxLeft, newLeft))}px`;
        targetWindow.style.top = `${Math.max(0, Math.min(maxTop, newTop))}px`;
    },

    /**
     * 握拳结束 - 停止拖动窗口
     */
    onFistEnd() {
        console.log('[LingYi] 握拳结束 - 停止拖动窗口');

        if (this.fistDragState.targetWindow) {
            this.fistDragState.targetWindow.classList.remove('fist-dragging');
            this.fistDragState.targetWindow.style.transition = ''; // 恢复过渡动画
        }

        this.fistDragState.isDragging = false;
        this.fistDragState.targetWindow = null;
        this.fistDragState.startPos = null;
        this.fistDragState.startWindowPos = null;

        this.cursorElement.classList.remove('fist-drag');
        this.gesture.state = 'POINTING';

        this.addMatrixLog('FIST_DRAG', 'Window drag ended');
    },
    
    /**
     * 捏合开始（左键单击）
     */
    onPinchStart() {
        console.log('[LingYi] 捏合开始 (左键)');
        
        // 触发波纹效果
        this.showRipple();
        
        // 如果在窗口边缘，开始调节
        if (this.resizeState.isNearEdge && this.resizeState.targetWindow) {
            this.startWindowResize();
            return;
        }
        
        // 如果悬停在交互元素上，触发左键点击
        if (this.hoverState.isHovering && this.hoverState.targetElement) {
            this.triggerClick(this.hoverState.targetElement, 'left');
        } else {
            // 在空白处也触发点击（比如关闭菜单等）
            this.triggerClickAtPosition('left');
        }
    },
    
    /**
     * 捏合持续
     */
    onPinchHold() {
        // 如果正在调节窗口大小
        if (this.resizeState.isResizing) {
            this.updateWindowResize();
        }
    },
    
    /**
     * 捏合结束
     */
    onPinchEnd() {
        console.log('[LingYi] 捏合结束');
        
        // 结束窗口调节
        if (this.resizeState.isResizing) {
            this.endWindowResize();
        }
    },
    
    /**
     * 三指闭合开始（右键单击）
     */
    onThreeFingerStart() {
        console.log('[LingYi] 三指闭合 (右键)');
        
        // 触发不同颜色的波纹效果
        this.showRipple('right');
        
        // 触发右键点击
        this.triggerClickAtPosition('right');
    },
    
    /**
     * 显示波纹效果
     * @param {string} type - 'left', 'right' 或 'fist'
     */
    showRipple(type = 'left') {
        const { smoothPos } = this.gesture;

        this.rippleElement.style.left = `${smoothPos.x}px`;
        this.rippleElement.style.top = `${smoothPos.y}px`;
        this.rippleElement.classList.remove('active', 'right-click', 'fist-drag');

        // 强制重绘
        this.rippleElement.offsetHeight;

        if (type === 'right') {
            this.rippleElement.classList.add('right-click');
        } else if (type === 'fist') {
            this.rippleElement.classList.add('fist-drag');
        }
        this.rippleElement.classList.add('active');

        // 动画结束后移除类
        setTimeout(() => {
            this.rippleElement.classList.remove('active', 'right-click', 'fist-drag');
        }, 600);
    },
    
    /**
     * 在当前位置触发点击事件
     * @param {string} button - 'left' 或 'right'
     */
    triggerClickAtPosition(button = 'left') {
        const { smoothPos } = this.gesture;
        
        // 获取该位置的元素
        const element = document.elementFromPoint(smoothPos.x, smoothPos.y);
        if (!element) return;
        
        if (button === 'left') {
            // 左键点击
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
                button: 0,
                clientX: smoothPos.x,
                clientY: smoothPos.y
            });
            element.dispatchEvent(clickEvent);
        } else {
            // 右键点击 - 触发 contextmenu 事件
            const contextMenuEvent = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                view: window,
                button: 2,
                clientX: smoothPos.x,
                clientY: smoothPos.y
            });
            element.dispatchEvent(contextMenuEvent);
        }
        
        // 触发反馈
        this.cursorElement.classList.add('clicked');
        setTimeout(() => {
            this.cursorElement.classList.remove('clicked');
        }, 200);
    },
    
    /**
     * 触发元素点击
     * @param {HTMLElement} element - 目标元素
     * @param {string} button - 'left' 或 'right'
     */
    triggerClick(element, button = 'left') {
        console.log('[LingYi] 触发点击:', element, button);
        
        if (button === 'left') {
            // 创建并分发左键点击事件
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
                button: 0,
                clientX: this.gesture.smoothPos.x,
                clientY: this.gesture.smoothPos.y
            });
            element.dispatchEvent(clickEvent);
        } else {
            // 创建并分发右键点击事件
            const contextMenuEvent = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                view: window,
                button: 2,
                clientX: this.gesture.smoothPos.x,
                clientY: this.gesture.smoothPos.y
            });
            element.dispatchEvent(contextMenuEvent);
        }
        
        // 触发反馈
        this.cursorElement.classList.add('clicked');
        setTimeout(() => {
            this.cursorElement.classList.remove('clicked');
        }, 200);
    },
    
    /**
     * 开始窗口调节
     */
    startWindowResize() {
        const win = this.resizeState.targetWindow;
        if (!win) return;
        
        console.log('[LingYi] 开始调节窗口大小');
        
        this.resizeState.isResizing = true;
        this.resizeState.startPos = { ...this.gesture.smoothPos };
        this.resizeState.startBounds = {
            left: parseFloat(win.style.left) || win.offsetLeft,
            top: parseFloat(win.style.top) || win.offsetTop,
            width: win.offsetWidth,
            height: win.offsetHeight
        };
        
        win.classList.add('resizing');
        this.cursorElement.classList.add('active-resize');
    },
    
    /**
     * 更新窗口调节
     */
    updateWindowResize() {
        const { targetWindow, startPos, startBounds, edge, corner } = this.resizeState;
        if (!targetWindow || !startBounds) return;
        
        const { smoothPos } = this.gesture;
        const deltaX = smoothPos.x - startPos.x;
        const deltaY = smoothPos.y - startPos.y;
        
        let newLeft = startBounds.left;
        let newTop = startBounds.top;
        let newWidth = startBounds.width;
        let newHeight = startBounds.height;
        
        const minWidth = 400;
        const minHeight = 300;
        
        // 根据边缘或角落调整
        if (corner === 'tl') {
            newWidth = Math.max(minWidth, startBounds.width - deltaX);
            newHeight = Math.max(minHeight, startBounds.height - deltaY);
            newLeft = startBounds.left + (startBounds.width - newWidth);
            newTop = startBounds.top + (startBounds.height - newHeight);
        } else if (corner === 'tr') {
            newWidth = Math.max(minWidth, startBounds.width + deltaX);
            newHeight = Math.max(minHeight, startBounds.height - deltaY);
            newTop = startBounds.top + (startBounds.height - newHeight);
        } else if (corner === 'bl') {
            newWidth = Math.max(minWidth, startBounds.width - deltaX);
            newHeight = Math.max(minHeight, startBounds.height + deltaY);
            newLeft = startBounds.left + (startBounds.width - newWidth);
        } else if (corner === 'br') {
            newWidth = Math.max(minWidth, startBounds.width + deltaX);
            newHeight = Math.max(minHeight, startBounds.height + deltaY);
        } else if (edge === 'top') {
            newHeight = Math.max(minHeight, startBounds.height - deltaY);
            newTop = startBounds.top + (startBounds.height - newHeight);
        } else if (edge === 'bottom') {
            newHeight = Math.max(minHeight, startBounds.height + deltaY);
        } else if (edge === 'left') {
            newWidth = Math.max(minWidth, startBounds.width - deltaX);
            newLeft = startBounds.left + (startBounds.width - newWidth);
        } else if (edge === 'right') {
            newWidth = Math.max(minWidth, startBounds.width + deltaX);
        }
        
        // 应用新尺寸
        targetWindow.style.left = `${newLeft}px`;
        targetWindow.style.top = `${newTop}px`;
        targetWindow.style.width = `${newWidth}px`;
        targetWindow.style.height = `${newHeight}px`;
    },
    
    /**
     * 结束窗口调节
     */
    endWindowResize() {
        const { targetWindow } = this.resizeState;
        if (targetWindow) {
            targetWindow.classList.remove('resizing');
        }
        
        this.resizeState.isResizing = false;
        this.resizeState.startPos = null;
        this.resizeState.startBounds = null;
        
        this.cursorElement.classList.remove('active-resize');
        
        console.log('[LingYi] 窗口调节结束');
    },
    
    /**
     * 更新摄像头预览
     */
    updateCameraPreview(results) {
        const canvas = document.getElementById('lingyi-preview-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = this.videoElement.videoWidth || 320;
        canvas.height = this.videoElement.videoHeight || 240;
        
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制视频（镜像）
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);
        ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        // 绘制手部关键点
        if (results.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
                // 绘制连接线
                if (typeof drawConnectors !== 'undefined') {
                    ctx.save();
                    ctx.scale(-1, 1);
                    ctx.translate(-canvas.width, 0);
                    drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#ffffff', lineWidth: 2 });
                    ctx.restore();
                }
                
                // 绘制关键点
                let color = '#00f3ff'; // 默认青色
                if (this.gesture.isPinching) color = '#ff4444'; // 捏合时红色
                else if (this.resizeState.isNearEdge) color = '#44ff44'; // 边缘时绿色
                
                if (typeof drawLandmarks !== 'undefined') {
                    ctx.save();
                    ctx.scale(-1, 1);
                    ctx.translate(-canvas.width, 0);
                    drawLandmarks(ctx, landmarks, { color: color, lineWidth: 1, radius: 3 });
                    ctx.restore();
                }
            }
        }
    },
    
    /**
     * 处理滚动手势（张开手掌挥手）
     */
    processScrollGesture() {
        const { isOpenPalm, wasOpenPalm, palmCenter } = this.gesture;
        
        // 开始张开手掌滚动
        if (isOpenPalm && !wasOpenPalm) {
            this.scrollState.isScrolling = true;
            this.scrollState.startPalmPos = { ...palmCenter };
            this.scrollState.lastPalmPos = { ...palmCenter };
            this.addMatrixLog('SCROLL_MODE', 'Open palm detected - scroll mode activated');
            this.cursorElement.classList.add('scroll-mode');
        }
        
        // 张开手掌持续中 - 检测移动方向并滚动
        if (isOpenPalm && this.scrollState.isScrolling && this.scrollState.lastPalmPos) {
            const deltaX = palmCenter.x - this.scrollState.lastPalmPos.x;
            const deltaY = palmCenter.y - this.scrollState.lastPalmPos.y;
            
            const threshold = this.scrollState.scrollThreshold;
            
            // 检测主要移动方向
            if (Math.abs(deltaY) > threshold || Math.abs(deltaX) > threshold) {
                let direction = null;
                let scrollAmount = 0;
                
                if (Math.abs(deltaY) > Math.abs(deltaX)) {
                    // 垂直滚动
                    if (deltaY > threshold) {
                        direction = 'down';
                        scrollAmount = deltaY * this.scrollState.scrollMultiplier;
                    } else if (deltaY < -threshold) {
                        direction = 'up';
                        scrollAmount = deltaY * this.scrollState.scrollMultiplier;
                    }
                } else {
                    // 水平滚动
                    if (deltaX > threshold) {
                        direction = 'right';
                        scrollAmount = deltaX * this.scrollState.scrollMultiplier;
                    } else if (deltaX < -threshold) {
                        direction = 'left';
                        scrollAmount = deltaX * this.scrollState.scrollMultiplier;
                    }
                }
                
                if (direction) {
                    this.scrollState.scrollDirection = direction;
                    this.performScroll(direction, scrollAmount);
                    this.addMatrixLog('SCROLL', `Direction: ${direction}, Delta: ${scrollAmount.toFixed(1)}`);
                }
                
                this.scrollState.lastPalmPos = { ...palmCenter };
            }
        }
        
        // 结束张开手掌滚动
        if (!isOpenPalm && wasOpenPalm) {
            this.scrollState.isScrolling = false;
            this.scrollState.startPalmPos = null;
            this.scrollState.lastPalmPos = null;
            this.scrollState.scrollDirection = null;
            this.addMatrixLog('SCROLL_END', 'Scroll mode deactivated');
            this.cursorElement.classList.remove('scroll-mode');
        }
    },
    
    /**
     * 执行滚动
     */
    performScroll(direction, amount) {
        const { smoothPos } = this.gesture;
        
        // 获取光标下的可滚动元素
        const elementsAtPoint = document.elementsFromPoint(smoothPos.x, smoothPos.y);
        let scrollTarget = null;
        
        // 找到第一个可滚动的元素
        for (const el of elementsAtPoint) {
            if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
                scrollTarget = el;
                break;
            }
        }
        
        // 如果没有找到，使用 window
        if (!scrollTarget) {
            scrollTarget = window;
        }
        
        // 执行滚动
        const scrollOptions = { behavior: 'auto' };
        
        if (direction === 'up' || direction === 'down') {
            const scrollY = direction === 'down' ? amount : amount; // amount 已经包含符号
            if (scrollTarget === window) {
                window.scrollBy(0, scrollY);
            } else {
                scrollTarget.scrollTop += scrollY;
            }
        } else {
            const scrollX = direction === 'right' ? amount : amount;
            if (scrollTarget === window) {
                window.scrollBy(scrollX, 0);
            } else {
                scrollTarget.scrollLeft += scrollX;
            }
        }
    },
    
    /**
     * 添加 Matrix 风格日志
     */
    addMatrixLog(type, message) {
        const timestamp = Date.now();
        const frameId = this.matrixState.frameCount++;
        
        const log = {
            id: frameId,
            time: timestamp,
            type: type,
            message: message,
            data: {
                cursor: `[${Math.round(this.gesture.smoothPos.x)}, ${Math.round(this.gesture.smoothPos.y)}]`,
                pinch: this.gesture.isPinching ? 'ACTIVE' : 'IDLE',
                palm: this.gesture.isOpenPalm ? 'OPEN' : 'CLOSED',
                scroll: this.scrollState.scrollDirection || 'NONE'
            }
        };
        
        this.matrixState.logs.unshift(log);
        
        // 限制日志数量
        if (this.matrixState.logs.length > this.matrixState.maxLogs) {
            this.matrixState.logs.pop();
        }
    },
    
    /**
     * 更新代码面板（黑客帝国风格）
     */
    updateCodePanel() {
        const dataEl = document.getElementById('lingyi-code-data');
        if (!dataEl) return;
        
        const now = Date.now();
        this.matrixState.frameCount++;
        
        // 每帧都添加一条实时数据日志
        if (now - this.matrixState.lastUpdateTime > 50) { // 约 20fps 更新日志
            this.matrixState.lastUpdateTime = now;
            
            // 生成实时状态码
            const stateCode = this.generateMatrixCode();
            this.matrixState.logs.unshift(stateCode);
            
            if (this.matrixState.logs.length > this.matrixState.maxLogs) {
                this.matrixState.logs.pop();
            }
        }
        
        // 渲染 Matrix 风格输出
        const output = this.renderMatrixOutput();
        dataEl.innerHTML = output;
        
        // 自动滚动到顶部
        dataEl.scrollTop = 0;
    },
    
    /**
     * 生成 Matrix 风格代码
     */
    generateMatrixCode() {
        const frame = this.matrixState.frameCount;
        const ts = Date.now().toString(16).toUpperCase();
        
        // 随机选择不同类型的输出
        const types = ['TRACK', 'GESTURE', 'COORD', 'STATE', 'SENSOR', 'NEURAL'];
        const type = types[frame % types.length];
        
        let code = '';
        
        switch (type) {
            case 'TRACK':
                code = `[${ts}] HAND_TRACK :: pos(${this.gesture.indexTip.x.toFixed(4)}, ${this.gesture.indexTip.y.toFixed(4)}) :: conf=${this.gesture.confidence.toFixed(2)}`;
                break;
            case 'GESTURE':
                const gestureState = this.gesture.isPinching ? 'PINCH' : 
                                    this.gesture.isThreeFingerClose ? 'THREE_FINGER' :
                                    this.gesture.isOpenPalm ? 'OPEN_PALM' : 'POINT';
                code = `[${ts}] GESTURE_${gestureState} :: dist=${this.gesture.pinchDist.toFixed(3)} :: palm=${this.gesture.openPalmScore.toFixed(2)}`;
                break;
            case 'COORD':
                code = `[${ts}] CURSOR_POS :: screen(${Math.round(this.gesture.smoothPos.x)}, ${Math.round(this.gesture.smoothPos.y)}) :: raw(${Math.round(this.gesture.cursorPos.x)}, ${Math.round(this.gesture.cursorPos.y)})`;
                break;
            case 'STATE':
                code = `[${ts}] SYS_STATE :: mode=${this.gesture.state} :: hover=${this.hoverState.isHovering} :: resize=${this.resizeState.isNearEdge}`;
                break;
            case 'SENSOR':
                code = `[${ts}] PALM_DATA :: center(${this.gesture.palmCenter.x.toFixed(3)}, ${this.gesture.palmCenter.y.toFixed(3)}) :: size=${this.gesture.handSize.toFixed(3)}`;
                break;
            case 'NEURAL':
                const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
                code = `[${ts}] NEURAL_NET :: weights=[${hex()},${hex()},${hex()},${hex()}] :: bias=${(Math.random() * 2 - 1).toFixed(4)}`;
                break;
        }
        
        return {
            frame: frame,
            type: type,
            code: code,
            highlight: this.gesture.isPinching || this.gesture.isFistClosed
        };
    },
    
    /**
     * 渲染 Matrix 风格输出
     */
    renderMatrixOutput() {
        let html = '';
        
        // 添加头部状态行
        html += `<div class="matrix-header">`;
        html += `<span class="matrix-status ${this.gesture.confidence > 0 ? 'active' : ''}">● TRACKING</span>`;
        html += `<span class="matrix-frame">FRAME: ${this.matrixState.frameCount.toString().padStart(6, '0')}</span>`;
        html += `</div>`;
        
        // 添加分隔线
        html += `<div class="matrix-divider">════════════════════════════════════════</div>`;
        
        // 渲染日志
        for (let i = 0; i < this.matrixState.logs.length; i++) {
            const log = this.matrixState.logs[i];
            const opacity = 1 - (i / this.matrixState.logs.length) * 0.7;
            const highlight = log.highlight ? 'matrix-highlight' : '';
            
            if (typeof log === 'object' && log.code) {
                html += `<div class="matrix-line ${highlight}" style="opacity: ${opacity}">`;
                html += `<span class="matrix-type">${log.type}</span> `;
                html += `<span class="matrix-code">${log.code}</span>`;
                html += `</div>`;
            } else if (typeof log === 'object') {
                html += `<div class="matrix-line matrix-event" style="opacity: ${opacity}">`;
                html += `<span class="matrix-event-type">[${log.type}]</span> ${log.message}`;
                html += `</div>`;
            }
        }
        
        return html;
    },
    
    /**
     * 计算两点之间的距离
     */
    distance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }
};

// 导出到全局
if (typeof window !== 'undefined') {
    window.LingYi = LingYi;
}
