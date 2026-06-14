/**
 * 开始菜单更新 - 添加最近文件功能
 */

// 扩展 StartMenu 对象
Object.assign(StartMenu, {
    recentItemsContainer: null,
    
    // 重写 init 方法（保留原有逻辑并添加新功能）
    _originalInit: StartMenu.init,
    init() {
        this._originalInit.call(this);
        this.recentItemsContainer = document.getElementById('start-recent-items');
        this.bindNewEvents();
        this.renderRecentFiles();
    },
    
    // 新增事件绑定
    bindNewEvents() {
        // 图片文件夹
        const picturesBtn = document.getElementById('pictures-folder-btn');
        if (picturesBtn) {
            picturesBtn.addEventListener('click', () => {
                this.openFolder('pictures');
                this.close();
            });
        }
        
        // 下载文件夹
        const downloadsBtn = document.getElementById('downloads-folder-btn');
        if (downloadsBtn) {
            downloadsBtn.addEventListener('click', () => {
                this.openFolder('downloads');
                this.close();
            });
        }
        
        // 所有应用按钮
        const allAppsBtn = document.getElementById('all-apps-btn');
        if (allAppsBtn) {
            allAppsBtn.addEventListener('click', () => {
                this.showAllAppsView();
                return;
                State.addNotification({
                    title: '开始菜单',
                    message: '所有应用视图即将推出',
                    type: 'info'
                });
            });
        }
        
        // 更多最近项目按钮
        const moreRecentBtn = document.getElementById('more-recent-btn');
        if (moreRecentBtn) {
            moreRecentBtn.addEventListener('click', () => {
                this.showAllRecentFiles();
            });
        }
        
        // 搜索输入 - 结合文件搜索
        this.searchInput.addEventListener('input', (e) => {
            if (!this.isSearchMode) return;
            const query = e.target.value.toLowerCase();
            if (query) {
                this.searchFiles(query);
            }
        });
    },
    
    // 渲染最近文件
    renderRecentFiles() {
        if (!this.recentItemsContainer) return;
        
        const recentFiles = RecentFiles.getRecentFiles().slice(0, 4);
        
        if (recentFiles.length === 0) {
            this.recentItemsContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-secondary); font-size: 14px;">
                    暂无最近项目
                </div>
            `;
            return;
        }
        
        this.recentItemsContainer.innerHTML = recentFiles.map(file => `
            <div class="recent-item" data-file-id="${file.id}" data-file-path="${file.path}">
                <img src="${file.icon}" alt="" class="recent-item-icon">
                <div class="recent-item-info">
                    <div class="recent-item-name">${file.name}</div>
                    <div class="recent-item-time">${RecentFiles.formatTime(file.modified)}</div>
                </div>
            </div>
        `).join('');
        
        // 绑定点击事件
        this.recentItemsContainer.querySelectorAll('.recent-item').forEach(item => {
            item.addEventListener('click', () => {
                this.openRecentFile(item.dataset.fileId, item.dataset.filePath);
                this.close();
            });
        });
    },
    
    // 搜索文件
    searchFiles(query) {
        if (!this.recentItemsContainer) return;
        
        const results = RecentFiles.searchFiles(query).slice(0, 6);
        
        if (results.length === 0) {
            this.recentItemsContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-secondary); font-size: 14px;">
                    未找到 "${query}"
                </div>
            `;
            return;
        }
        
        this.recentItemsContainer.innerHTML = results.map(file => `
            <div class="recent-item" data-file-id="${file.id}" data-file-path="${file.path}">
                <img src="${file.icon}" alt="" class="recent-item-icon">
                <div class="recent-item-info">
                    <div class="recent-item-name">${file.name}</div>
                    <div class="recent-item-time">${file.path}</div>
                </div>
            </div>
        `).join('');
        
        // 绑定点击事件
        this.recentItemsContainer.querySelectorAll('.recent-item').forEach(item => {
            item.addEventListener('click', () => {
                this.openRecentFile(item.dataset.fileId, item.dataset.filePath);
                this.close();
            });
        });
    },
    
    // 打开文件夹（通过 FilesApp 导航到真正的文件系统目录）
    openFolder(folderId) {
        // 先打开文件管理器窗口
        WindowManager.openApp('files');
        
        // 稍作延迟，等待 FilesApp 完成初始化后再导航
        setTimeout(() => {
            if (typeof FilesApp !== 'undefined' && typeof FilesApp.navigateToId === 'function') {
                const node = State && typeof State.findNode === 'function'
                    ? State.findNode(folderId)
                    : null;
                if (node && node.type === 'folder') {
                    FilesApp.navigateToId(folderId);
                    return;
                }
            }
            
            // 兜底：若导航失败，仅给出轻通知，避免点击无响应
            if (typeof State !== 'undefined' && typeof State.addNotification === 'function') {
                State.addNotification({
                    title: '文件管理器',
                    message: `正在打开 ${folderId} 文件夹`,
                    type: 'info'
                });
            }
        }, 120);
    },
    
    // 打开最近文件
    openRecentFile(fileId, filePath) {
        State.addNotification({
            title: '打开文件',
            message: filePath,
            type: 'info'
        });
        
        const node = fileId && State.findNode ? State.findNode(fileId) : null;
        if (node && node.type === 'file') {
            if (typeof FilesApp !== 'undefined' && typeof FilesApp.openNodeWithDefaultApp === 'function') {
                const opened = FilesApp.openNodeWithDefaultApp(node);
                if (opened) return;
            }
            WindowManager.openApp('notes', { fileId });
            return;
        }

        if (node && node.type === 'folder') {
            this.openFolder(fileId);
            return;
        }

        // 根据文件类型打开对应应用
        if ((filePath || '').endsWith('.txt') || (filePath || '').endsWith('.html') || (filePath || '').endsWith('.md')) {
            WindowManager.openApp('notes', { fileId });
        } else {
            WindowManager.openApp('files');
        }
    },
    
    // 显示所有最近文件
    showAllRecentFiles() {
        State.addNotification({
            title: '最近文件',
            message: '查看所有最近文件功能即将推出',
            type: 'info'
        });
    },
    
    // 重写 open 方法，添加刷新最近文件
    _originalOpen: StartMenu.open,
    open() {
        this._originalOpen.call(this);
        this.renderRecentFiles();
    }
});

