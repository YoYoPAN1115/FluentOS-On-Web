/** Shared search history for Browser and the Search widget. */
const SearchHistory = {
    STORAGE_KEY: 'fluentos.searchHistory',
    DISPLAY_LIMIT: 8,
    STORAGE_LIMIT: 50,
    _bindings: new Set(),
    _bindingObserver: null,

    _trackBinding(controller) {
        this._bindings.add(controller);
        if (this._bindingObserver || typeof MutationObserver === 'undefined' || !document.documentElement) return;
        this._bindingObserver = new MutationObserver(() => {
            [...this._bindings].forEach((binding) => {
                if (!binding.input.isConnected) binding.destroy();
            });
        });
        this._bindingObserver.observe(document.documentElement, { childList: true, subtree: true });
    },

    _untrackBinding(controller) {
        this._bindings.delete(controller);
        if (this._bindings.size || !this._bindingObserver) return;
        this._bindingObserver.disconnect();
        this._bindingObserver = null;
    },

    getAll() {
        try {
            const value = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
            if (!Array.isArray(value)) return [];
            return value
                .map(item => typeof item === 'string' ? { query: item, time: 0 } : item)
                .filter(item => item && typeof item.query === 'string' && item.query.trim())
                .map(item => ({ query: item.query.trim(), time: Number(item.time) || 0 }));
        } catch (_) {
            return [];
        }
    },

    getRecent(query = '') {
        const filter = String(query || '').trim().toLocaleLowerCase();
        const entries = this.getAll();
        return (filter
            ? entries.filter(item => item.query.toLocaleLowerCase().includes(filter))
            : entries
        ).slice(0, this.DISPLAY_LIMIT);
    },

    add(query) {
        const clean = String(query || '').trim();
        if (!clean) return;
        const normalized = clean.toLocaleLowerCase();
        const entries = this.getAll().filter(item => item.query.toLocaleLowerCase() !== normalized);
        entries.unshift({ query: clean, time: Date.now() });
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries.slice(0, this.STORAGE_LIMIT)));
        window.dispatchEvent(new CustomEvent('fluent-search-history-change'));
    },

    remove(query) {
        const normalized = String(query || '').trim().toLocaleLowerCase();
        if (!normalized) return;
        const entries = this.getAll().filter(item => item.query.toLocaleLowerCase() !== normalized);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
        window.dispatchEvent(new CustomEvent('fluent-search-history-change'));
    },

    bindPopover(input, options = {}) {
        if (!input) return null;
        const anchor = options.anchor || input;
        let popover = null;
        let closeTimer = null;
        let resizeHandler = null;
        let destroyed = false;

        const close = (immediate = false) => {
            clearTimeout(closeTimer);
            if (!popover) return;
            const target = popover;
            popover = null;
            target.classList.remove('visible');
            if (resizeHandler) {
                window.removeEventListener('resize', resizeHandler);
                window.removeEventListener('scroll', resizeHandler, true);
                resizeHandler = null;
            }
            if (immediate) target.remove();
            else setTimeout(() => target.remove(), 180);
        };

        const position = () => {
            if (!popover || !anchor.isConnected) return close(true);
            const rect = anchor.getBoundingClientRect();
            const configuredGap = Number(options.gap);
            const gap = Number.isFinite(configuredGap) ? Math.max(0, configuredGap) : 10;
            const viewportGap = 10;
            const width = Math.max(rect.width, Number(options.minWidth) || 280);
            popover.style.width = `${Math.min(width, window.innerWidth - viewportGap * 2)}px`;
            const height = popover.offsetHeight;
            const spaceBelow = window.innerHeight - rect.bottom - viewportGap;
            const spaceAbove = rect.top - viewportGap;
            const showAbove = spaceBelow < height + gap && spaceAbove > spaceBelow;
            let left = rect.left;
            left = Math.min(left, window.innerWidth - popover.offsetWidth - viewportGap);
            left = Math.max(viewportGap, left);
            popover.style.left = `${Math.round(left)}px`;
            popover.style.top = `${Math.round(showAbove ? rect.top - height - gap : rect.bottom + gap)}px`;
            popover.classList.toggle('opens-above', showAbove);
        };

        const render = (filterByInput = false) => {
            if (!popover) return;
            const entries = this.getRecent(filterByInput ? input.value : '');
            if (!entries.length) {
                close(true);
                return;
            }
            popover.innerHTML = `
                <div class="search-history-title">搜索历史</div>
                <div class="search-history-list">
                    ${entries.map(item => `
                        <div class="search-history-item">
                            <img class="search-history-clock" src="Theme/Icon/Symbol_icon/stroke/Clock.svg" alt="">
                            <button type="button" class="search-history-select" data-query="${this.escapeHtml(item.query)}">
                                <span>${this.escapeHtml(item.query)}</span>
                            </button>
                            <button type="button" class="search-history-delete" data-query="${this.escapeHtml(item.query)}" title="删除这条历史记录" aria-label="删除 ${this.escapeHtml(item.query)}">
                                <img src="Theme/Icon/Symbol_icon/stroke/Trash.svg" alt="">
                            </button>
                        </div>
                    `).join('')}
                </div>`;
            popover.querySelectorAll('.search-history-item').forEach(item => {
                item.addEventListener('pointerdown', event => event.preventDefault());
            });
            popover.querySelectorAll('.search-history-select').forEach(button => {
                button.addEventListener('click', event => {
                    event.stopPropagation();
                    const query = button.dataset.query || '';
                    input.value = query;
                    close();
                    if (typeof options.onSelect === 'function') options.onSelect(query);
                });
            });
            popover.querySelectorAll('.search-history-delete').forEach(button => {
                button.addEventListener('click', event => {
                    event.stopPropagation();
                    this.remove(button.dataset.query || '');
                    render(Boolean(input.value));
                });
            });
            requestAnimationFrame(position);
        };

        const open = (filterByInput = false) => {
            if (destroyed || !input.isConnected) return;
            clearTimeout(closeTimer);
            if (!this.getRecent(filterByInput ? input.value : '').length) {
                close(true);
                return;
            }
            if (popover) {
                render(filterByInput);
                return;
            }
            popover = document.createElement('div');
            popover.className = `search-history-popover ${options.className || ''}`.trim();
            popover.addEventListener('pointerdown', event => event.stopPropagation());
            document.body.appendChild(popover);
            render(filterByInput);
            resizeHandler = position;
            window.addEventListener('resize', resizeHandler);
            window.addEventListener('scroll', resizeHandler, true);
            requestAnimationFrame(() => popover?.classList.add('visible'));
        };

        const onFocus = () => open(false);
        const onClick = () => open(false);
        const onInput = () => {
            if (!popover) open(true);
            else render(true);
        };
        const onBlur = () => {
            closeTimer = setTimeout(() => close(), 100);
        };
        const onKeydown = event => {
            if (event.key === 'Escape') close();
        };

        input.addEventListener('focus', onFocus);
        input.addEventListener('click', onClick);
        input.addEventListener('input', onInput);
        input.addEventListener('blur', onBlur);
        input.addEventListener('keydown', onKeydown);

        let controller = null;
        const destroy = () => {
            if (destroyed) return;
            destroyed = true;
            clearTimeout(closeTimer);
            close(true);
            input.removeEventListener('focus', onFocus);
            input.removeEventListener('click', onClick);
            input.removeEventListener('input', onInput);
            input.removeEventListener('blur', onBlur);
            input.removeEventListener('keydown', onKeydown);
            this._untrackBinding(controller);
        };

        controller = { input, open, close, destroy };
        this._trackBinding(controller);
        return controller;
    },

    escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[char]));
    }
};

if (typeof window !== 'undefined') window.SearchHistory = SearchHistory;
