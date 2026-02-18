/**
 * 最近文件监控模块
 */
const RecentFiles = {
    maxItems: 12,
    
    // 获取最近文件列表
    getRecentFiles() {
        const files = [];
        this.traverseFS(State.fs.root, files);
        // 按修改时间排序
        files.sort((a, b) => (b.modified || 0) - (a.modified || 0));
        return files.slice(0, this.maxItems);
    },
    
    // 遍历文件系统（跳过回收站与被隐藏的推荐项）
    traverseFS(node, files, path = []) {
        if (!node) return;
        // 跳过回收站
        if (node.id === 'recycle') return;
        
        if (node.type === 'file') {
            // 若标记了隐藏于推荐，则跳过
            if (node._hiddenFromRecent) return;
            files.push({
                id: node.id,
                name: node.name,
                path: [...path, node.name].join('/'),
                type: node.type,
                modified: node.modified || Date.now(),
                icon: this.getFileIcon(node.name)
            });
        } else if (node.type === 'folder' && node.children) {
            node.children.forEach(child => {
                this.traverseFS(child, files, [...path, node.name]);
            });
        }
    },
    
    // 获取文件图标
    getFileIcon(filename) {
        // 推荐项目统一使用文本文件图标
        return 'Theme/Icon/Symbol_icon/stroke/Document.svg';
    },
    
    // 格式化时间
    formatTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes} 分钟前`;
        if (hours < 24) return `${hours} 小时前`;
        if (days < 7) return `${days} 天前`;
        
        const date = new Date(timestamp);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    },
    
    // 搜索文件
    searchFiles(query) {
        const files = [];
        this.traverseFS(State.fs.root, files);
        
        if (!query) return files.slice(0, this.maxItems);
        
        const lowerQuery = query.toLowerCase();
        return files
            .filter(file => file.name.toLowerCase().includes(lowerQuery))
            .slice(0, this.maxItems);
    }
};

