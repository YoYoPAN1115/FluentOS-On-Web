/**
 * 最近文件监控模块
 */
const RecentFiles = {
    maxItems: 12,

    toMillis(value) {
        if (typeof value === 'number') return value;
        const time = Date.parse(value);
        return Number.isFinite(time) ? time : 0;
    },
    
    // 获取最近文件列表
    getRecentFiles() {
        const files = [];
        this.traverseFS(State.fs.root, files);
        // 按修改时间排序
        files.sort((a, b) => this.toMillis(b.modified) - this.toMillis(a.modified));
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
                icon: this.getFileIcon(node.name),
                isImage: this.isImageNode(node),
                preview: this.getFilePreview(node)
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

    isImageNode(node) {
        if (typeof PhotosDataStore !== 'undefined' && PhotosDataStore && typeof PhotosDataStore.isImageNode === 'function') {
            return PhotosDataStore.isImageNode(node);
        }
        if (!node || node.type !== 'file') return false;
        const mime = String(node.mime || '').toLowerCase();
        if (mime.startsWith('image/')) return true;
        if (node.encoding === 'url' || node.encoding === 'photos-local-cache' || node.encoding === 'photos-ref') return true;
        return node.encoding === 'dataurl' && /^data:image\//i.test(String(node.content || ''));
    },

    getFilePreview(node) {
        if (!this.isImageNode(node)) return '';
        if (typeof PhotosDataStore !== 'undefined' && PhotosDataStore && typeof PhotosDataStore.peekImageSrc === 'function') {
            return PhotosDataStore.peekImageSrc(node, { loadThumb: false }) || '';
        }
        if (typeof PhotosDataStore !== 'undefined' && PhotosDataStore && typeof PhotosDataStore.resolveImageSrc === 'function') {
            return PhotosDataStore.resolveImageSrc(node, new Set(), { load: false }) || '';
        }
        if (/^data:image\//i.test(String(node.content || ''))) return node.content;
        if (/^https?:\/\//i.test(String(node.url || node.content || ''))) return node.url || node.content;
        return '';
    },
    
    // 格式化时间
    formatTime(timestamp) {
        const now = Date.now();
        const time = this.toMillis(timestamp);
        const diff = time > 0 ? now - time : 0;
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

