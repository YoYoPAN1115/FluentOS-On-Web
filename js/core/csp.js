/**
 * Real CSP bootstrap.
 * Applies a meta CSP policy as early as possible based on persisted settings.
 */
(function () {
    const SETTINGS_KEY = 'fluentos.settings';
    const META_ID = 'fluentos-runtime-csp';

    const STRICT_POLICY = [
        "default-src 'self'",
        "script-src 'self' https://cdn.jsdelivr.net https://*.weatherwidget.org",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data: https:",
        "connect-src 'self' https: wss:",
        "media-src 'self' data: blob: https:",
        "frame-src 'self' https: http: data: blob:",
        "worker-src 'self' blob:",
        "child-src 'self' https: http: data: blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
    ].join('; ');

    function readStrictCspEnabled() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            if (!parsed) return false;
            return parsed.strictCspEnabled === true || parsed.strictCspLastEnabled === true;
        } catch (_) {
            return false;
        }
    }

    function getMeta() {
        return document.getElementById(META_ID);
    }

    function ensureMeta() {
        let meta = getMeta();
        if (meta) return meta;

        meta = document.createElement('meta');
        meta.id = META_ID;
        meta.setAttribute('http-equiv', 'Content-Security-Policy');

        const head = document.head || document.getElementsByTagName('head')[0];
        if (!head) return null;

        if (head.firstChild) {
            head.insertBefore(meta, head.firstChild);
        } else {
            head.appendChild(meta);
        }
        return meta;
    }

    function apply(enabled) {
        if (enabled === true) {
            const meta = ensureMeta();
            if (meta) {
                meta.setAttribute('content', STRICT_POLICY);
            }
            return true;
        }

        const meta = getMeta();
        if (meta && meta.parentNode) {
            meta.parentNode.removeChild(meta);
        }
        return false;
    }

    apply(readStrictCspEnabled());

    if (typeof window !== 'undefined') {
        const disableOnPageExit = () => {
            // Real CSP is runtime-only for the current page instance.
            apply(false);
        };
        window.addEventListener('pagehide', disableOnPageExit, { capture: true });
        window.addEventListener('beforeunload', disableOnPageExit, { capture: true });

        window.RealCSP = {
            apply,
            getPolicy() {
                return STRICT_POLICY;
            },
            isEnabled() {
                return !!getMeta();
            }
        };
    }
})();
