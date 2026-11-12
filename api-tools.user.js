// ==UserScript==
// @name         API Tools
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  API Tools - Логирование всех fetch/XHR запросов на сайте: методы, URL, статусы, время, тела запросов/ответов, копирование в cURL/fetch, подмена URL/заголовков/тела, мок-ответы, исключения сайтов.
// @author       Aramegab
// @license      PolyForm-Noncommercial-1.0.0
// @copyright    2026 Aramegab
// @match        *://*/*
// @run-at       document-start
// @icon         data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgaGVpZ2h0PSI0OHB4IiB3aWR0aD0iNDhweCIgZmlsbD0iI2UzZTNlMyI+CiAgPHBhdGggZD0iTTI0LDI5LjI1TDE4Ljc1LDI0TDI0LDE4Ljc1TDI5LjI1LDI0TDI0LDI5LjI1Wm0tNC4yNS0xNC43TDE1LjYsMTAuNEwyNCwybDguNCw4LjRsLTQuMTUsNC4xNUwyNCwxMC4zbC00LjI1LDQuMjVaTTEwLjQsMzIuNEwyLDI0bDguNC04LjRsNC4xNSw0LjE1TDEwLjMsMjRsNC4yNSw0LjI1TDEwLjQsMzIuNFptMjcuMiwwbC00LjE1LTQuMTVMMzcuNywyNGwtNC4yNS00LjI1TDM3LjYsMTUuNkw0NiwyNGwtOC40LDguNFpNMjQsNDZsLTguNC04LjRsNC4xNS00LjE1TDI0LDM3LjdsNC4yNS00LjI1TDMyLjQsMzcuNkwyNCw0NloiPjwvcGF0aD4KPC9zdmc+Cg==
// @grant        none
// ==/UserScript==

(function () {
    if (window.__netLogger) {
        console.warn('Уже установлен');
        return;
    }

    const EXCLUDE_KEY = '__netLogger.excludedHosts';
    const THEME_KEY = '__netLogger.themeMode';
    const MAXBODY_KEY = '__netLogger.maxBody';
    const MAXLOGS_KEY = '__netLogger.maxLogs';
    const CONSOLE_KEY = '__netLogger.consoleLogs';
    const RULES_KEY = '__netLogger.rules';
    const APPLY_KEY = '__netLogger.applyRules';
    const COMPACT_KEY = '__netLogger.compact';
    const BADGES_KEY = '__netLogger.showBadges';
    const AUTOSCROLL_KEY = '__netLogger.autoScroll';
    const PRETTY_KEY = '__netLogger.prettyPrint';
    const SLOW_KEY = '__netLogger.slowThreshold';
    const DEBUG_KEY = '__netLogger.debug';

    const SCRIPT_VERSION = '1.0.0';

    const UPDATE_REPO = {
        user: 'Aramegab',
        repo: 'api-tools',
        branch: 'main',
        scriptPath: 'api-tools.user.js'
    };
    const UPDATE_CACHE_KEY = '__netLogger.updateCache';
    const UPDATE_CACHE_TTL = 60 * 60 * 1000;

    function loadExcluded() {
        try {
            const raw = localStorage.getItem(EXCLUDE_KEY);
            if (!raw) return [];
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr.map(String) : [];
        } catch (_) { return []; }
    }
    function saveExcluded(list) {
        try { localStorage.setItem(EXCLUDE_KEY, JSON.stringify(list)); } catch (_) {}
    }
    function isHostExcluded(hostname, list) {
        const host = String(hostname || '').toLowerCase();
        if (!host) return false;
        return list.some(ruleRaw => {
            const rule = String(ruleRaw || '').trim().toLowerCase();
            if (!rule) return false;
            if (rule === host) return true;
            if (rule.startsWith('*.')) {
                const base = rule.slice(2);
                return host === base || host.endsWith('.' + base);
            }
            if (rule.startsWith('.')) {
                const base = rule.slice(1);
                return host === base || host.endsWith('.' + base);
            }
            return false;
        });
    }
    function currentHostExcludedExact() {
        const host = location.hostname.toLowerCase();
        return loadExcluded().some(rule => {
            const r = String(rule || '').trim().toLowerCase();
            if (!r) return false;
            if (r === host) return true;
            if (r.startsWith('*.')) return host === r.slice(2);
            if (r.startsWith('.')) return host === r.slice(1);
            return false;
        });
    }
    function removeCurrentHostFromExcluded() {
        const host = location.hostname.toLowerCase();
        const cur = loadExcluded();
        const next = cur.filter(rule => {
            const r = String(rule || '').trim().toLowerCase();
            if (!r) return true;
            if (r === host) return false;
            if (r.startsWith('*.')) return r.slice(2) !== host;
            if (r.startsWith('.')) return r.slice(1) !== host;
            return true;
        });
        saveExcluded(next);
    }

    function loadThemeMode() {
        try {
            const v = localStorage.getItem(THEME_KEY);
            return v === 'light' || v === 'dark' ? v : 'auto';
        } catch (_) { return 'auto'; }
    }
    function saveThemeMode(m) {
        try { localStorage.setItem(THEME_KEY, m); } catch (_) {}
    }
    function loadMaxBody() {
        try {
            const v = parseInt(localStorage.getItem(MAXBODY_KEY), 10);
            return Number.isFinite(v) && v >= 1000 ? v : 200000;
        } catch (_) { return 200000; }
    }
    function saveMaxBody(n) {
        try { localStorage.setItem(MAXBODY_KEY, String(n)); } catch (_) {}
    }
    function loadMaxLogs() {
        try {
            const v = parseInt(localStorage.getItem(MAXLOGS_KEY), 10);
            return Number.isFinite(v) && v >= 10 ? v : 1000;
        } catch (_) { return 1000; }
    }
    function saveMaxLogs(n) {
        try { localStorage.setItem(MAXLOGS_KEY, String(n)); } catch (_) {}
    }
    function loadConsoleLogs() {
        try {
            const v = localStorage.getItem(CONSOLE_KEY);
            return v === null ? true : v === '1';
        } catch (_) { return true; }
    }
    function saveConsoleLogs(v) {
        try { localStorage.setItem(CONSOLE_KEY, v ? '1' : '0'); } catch (_) {}
    }
    function loadBool(key, def) {
        try {
            const v = localStorage.getItem(key);
            return v === null ? def : v === '1';
        } catch (_) { return def; }
    }
    function saveBool(key, v) {
        try { localStorage.setItem(key, v ? '1' : '0'); } catch (_) {}
    }
    function loadNum(key, def, min, max) {
        try {
            const v = parseInt(localStorage.getItem(key), 10);
            if (!Number.isFinite(v)) return def;
            return Math.max(min, Math.min(max, v));
        } catch (_) { return def; }
    }
    function saveNum(key, n) {
        try { localStorage.setItem(key, String(n)); } catch (_) {}
    }
    function loadCompact() { return loadBool(COMPACT_KEY, false); }
    function saveCompact(v) { saveBool(COMPACT_KEY, v); }
    function loadShowBadges() { return loadBool(BADGES_KEY, true); }
    function saveShowBadges(v) { saveBool(BADGES_KEY, v); }
    function loadAutoScroll() { return loadBool(AUTOSCROLL_KEY, true); }
    function saveAutoScroll(v) { saveBool(AUTOSCROLL_KEY, v); }
    function loadPrettyPrint() { return loadBool(PRETTY_KEY, true); }
    function savePrettyPrint(v) { saveBool(PRETTY_KEY, v); }
    function loadSlowThreshold() { return loadNum(SLOW_KEY, 1000, 100, 60000); }
    function saveSlowThreshold(n) { saveNum(SLOW_KEY, n); }
    function loadDebug() { return loadBool(DEBUG_KEY, false); }
    function saveDebug(v) { saveBool(DEBUG_KEY, v); }

    function parseVersion(str) {
        return String(str || '0').replace(/^v/i, '').trim()
            .split('.').map(n => parseInt(n, 10) || 0);
    }
    function isNewerVersion(a, b) {
        const va = parseVersion(a), vb = parseVersion(b);
        const len = Math.max(va.length, vb.length);
        for (let i = 0; i < len; i++) {
            const x = va[i] || 0, y = vb[i] || 0;
            if (x > y) return true;
            if (x < y) return false;
        }
        return false;
    }
    function loadUpdateCache() {
        try {
            const raw = localStorage.getItem(UPDATE_CACHE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (_) { return null; }
    }
    function saveUpdateCache(data) {
        try { localStorage.setItem(UPDATE_CACHE_KEY, JSON.stringify(data)); } catch (_) {}
    }

    function loadApplyRules() {
        try { return localStorage.getItem(APPLY_KEY) === '1'; } catch (_) { return false; }
    }
    function saveApplyRules(v) {
        try { localStorage.setItem(APPLY_KEY, v ? '1' : '0'); } catch (_) {}
    }

    let _rulesCache = null;
    function loadRules() {
        if (_rulesCache) return _rulesCache;
        try {
            const raw = localStorage.getItem(RULES_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            _rulesCache = Array.isArray(arr) ? arr : [];
        } catch (_) {
            _rulesCache = [];
        }
        return _rulesCache;
    }
    function saveRules(list) {
        _rulesCache = Array.isArray(list) ? list : [];
        try { localStorage.setItem(RULES_KEY, JSON.stringify(_rulesCache)); } catch (_) {}
    }
    function newRuleId() {
        return 'r_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    }
    function parseHeaderLines(text) {
        const pairs = [];
        if (!text) return pairs;
        String(text).split(/\r?\n/).forEach(line => {
            const i = line.indexOf(':');
            if (i > 0) pairs.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
        });
        return pairs;
    }
    function headersToObj(pairs) {
        const obj = {};
        pairs.forEach(([n, v]) => { obj[n] = v; });
        return obj;
    }
    function ruleMatches(rule, url, method) {
        if (!rule || !rule.enabled) return false;
        if (rule.method && rule.method !== 'ANY' && rule.method !== method) return false;
        const pattern = rule.match || '';
        if (!pattern) return false;
        if (rule.matchType === 'regex') {
            try { return new RegExp(pattern).test(url); } catch (_) { return false; }
        }
        if (rule.matchType === 'glob') {
            try {
                const re = new RegExp('^' + pattern
                    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
                    .replace(/\*/g, '.*')
                    .replace(/\?/g, '.') + '$');
                return re.test(url);
            } catch (_) { return false; }
        }
        return url.indexOf(pattern) !== -1;
    }
    function matchRules(url, method) {
        if (!loadApplyRules()) return [];
        return loadRules().filter(r => ruleMatches(r, url, method));
    }
    function applyRules(matched, origUrl, origHeaders, origBodyRaw) {
        let url = origUrl;
        let headers = origHeaders.slice();
        let body = origBodyRaw;
        let hasBody = origBodyRaw !== null && origBodyRaw !== undefined;
        let mocked = null;
        for (const rule of matched) {
            if (rule.newUrl) url = rule.newUrl;
            if (rule.newHeaders) {
                const parsed = parseHeaderLines(rule.newHeaders);
                const map = new Map(headers.map(([n, v]) => [n.toLowerCase(), [n, v]]));
                parsed.forEach(([n, v]) => map.set(n.toLowerCase(), [n, v]));
                headers = [...map.values()];
            }
            if (rule.newBody !== '' && rule.newBody !== undefined && rule.newBody !== null) {
                if (rule.bodyMode === 'json-merge' && hasBody) {
                    try {
                        const orig = typeof body === 'string' ? JSON.parse(body) : body;
                        const add = JSON.parse(rule.newBody);
                        if (orig && typeof orig === 'object' && !Array.isArray(orig)) {
                            body = JSON.stringify({ ...orig, ...add });
                        } else {
                            body = rule.newBody;
                        }
                    } catch (_) {
                        body = rule.newBody;
                    }
                } else {
                    body = rule.newBody;
                }
                hasBody = true;
            }
            if (rule.mockStatus !== '' && rule.mockStatus !== undefined && rule.mockStatus !== null) {
                const st = parseInt(rule.mockStatus, 10);
                mocked = {
                    status: (Number.isFinite(st) && st >= 200 && st <= 599) ? st : 200,
                    headers: rule.mockHeaders ? parseHeaderLines(rule.mockHeaders) : null,
                    body: rule.mockBody || ''
                };
            }
        }
        return { url, headers, body, hasBody, mocked };
    }

    const STYLE_ID = '__netLoggerStyles';
    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            :root {
                --nl-bg: #ffffff; --nl-bg2: #f4f6f8; --nl-bg3: #e9edf1;
                --nl-text: #1c1f24; --nl-text-dim: #5f6368;
                --nl-border: #d7dce1;
                --nl-accent: #0d6efd; --nl-accent-hover: #3d8bfd;
                --nl-danger: #d9363e; --nl-success: #198754; --nl-muted: #6c757d;
                --nl-shadow: 0 10px 30px rgba(0,0,0,.15);
                --nl-overlay: rgba(20,22,26,.35);
                --nl-panel: #eaf0f7; --nl-panel-hover: #dde5ef;
                --nl-panel-border: #c5d0dc;
                --nl-panel-shadow: 0 14px 34px rgba(30,40,60,.18);
                --nl-json-key: #0b7285;
                --nl-json-str: #2b8a3e;
                --nl-json-num: #e67700;
                --nl-json-bool: #9c36b5;
                --nl-json-null: #868e96;
            }
            .nl-ico {
                width: 16px; height: 16px; flex-shrink: 0;
                display: inline-block; vertical-align: middle;
            }
            .nl-j-key { color: var(--nl-json-key); }
            .nl-j-str { color: var(--nl-json-str); }
            .nl-j-num { color: var(--nl-json-num); }
            .nl-j-bool { color: var(--nl-json-bool); font-weight: 600; }
            .nl-j-null { color: var(--nl-json-null); font-style: italic; }
            #__netLoggerUI {
                position: fixed; bottom: 16px; right: 16px; z-index: 999999;
                display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
                font: 13px/1.3 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
                color: var(--nl-text);
            }
            .nl-fab {
                display: inline-flex; align-items: center; gap: 8px;
                padding: 10px 14px; border-radius: 999px;
                border: 1px solid var(--nl-panel-border);
                background: var(--nl-panel); color: var(--nl-text);
                cursor: pointer; font: inherit; font-weight: 700;
                box-shadow: var(--nl-panel-shadow);
                backdrop-filter: blur(8px);
                transition: transform .1s ease, background .15s ease, border-color .15s ease;
                user-select: none;
            }
            .nl-fab:hover { background: var(--nl-panel-hover); border-color: var(--nl-accent); }
            .nl-fab:active { transform: scale(.97); }
            .nl-fab .nl-ico { width: 18px; height: 18px; color: var(--nl-accent); transition: transform .2s ease; }
            .nl-fab[data-open="1"] .nl-fab-icon { transform: rotate(90deg); }
            .nl-fab-count { font-variant-numeric: tabular-nums; color: var(--nl-accent); }
            .nl-actions {
                display: flex; flex-direction: column; gap: 6px; align-items: stretch;
                opacity: 0; transform: translateY(6px) scale(.96); pointer-events: none;
                transition: opacity .16s ease, transform .16s ease; transform-origin: bottom right;
            }
            .nl-actions.nl-open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
            .nl-btn {
                display: inline-flex; align-items: center; gap: 8px;
                border: 1px solid var(--nl-panel-border);
                background: var(--nl-panel); color: var(--nl-text);
                padding: 9px 14px; border-radius: 10px; cursor: pointer;
                font: inherit; font-weight: 600;
                box-shadow: var(--nl-panel-shadow); backdrop-filter: blur(8px);
                transition: transform .08s ease, background .15s ease, border-color .15s ease, color .15s ease;
                user-select: none; white-space: nowrap;
            }
            .nl-btn:hover { background: var(--nl-panel-hover); border-color: var(--nl-accent); }
            .nl-btn:active { transform: translateY(1px) scale(.99); }
            .nl-btn .nl-ico { width: 16px; height: 16px; }
            .nl-btn--primary { border-color: var(--nl-accent); }
            .nl-btn--primary .nl-ico { color: var(--nl-accent); }
            .nl-btn--primary:hover { background: var(--nl-accent); color: #fff; }
            .nl-btn--primary:hover .nl-ico { color: #fff; }
            .nl-btn--success .nl-ico { color: var(--nl-success); }
            .nl-btn--success:hover { background: var(--nl-success); color: #fff; }
            .nl-btn--success:hover .nl-ico { color: #fff; }
            .nl-btn--danger .nl-ico { color: var(--nl-danger); }
            .nl-btn--danger:hover { background: var(--nl-danger); color: #fff; }
            .nl-btn--danger:hover .nl-ico { color: #fff; }
            .nl-modal-overlay {
                position: fixed; inset: 0; z-index: 1000000;
                background: var(--nl-overlay);
                display: flex; align-items: center; justify-content: center;
                padding: 20px; animation: nlFade .15s ease;
            }
            @keyframes nlFade { from { opacity: 0 } to { opacity: 1 } }
            .nl-modal {
                width: min(1100px, 100%); height: min(85vh, 900px);
                background: var(--nl-bg); color: var(--nl-text);
                border: 1px solid var(--nl-border); border-radius: 16px;
                box-shadow: var(--nl-shadow);
                display: flex; flex-direction: column; overflow: hidden;
                font: 13px/1.45 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
            }
            .nl-modal--sm { width: min(760px, 100%); height: auto; max-height: min(85vh, 800px); }
            .nl-modal-header {
                display: flex; align-items: center; gap: 12px;
                padding: 12px 16px; border-bottom: 1px solid var(--nl-border);
                background: var(--nl-bg2);
            }
            .nl-modal-title { font-weight: 700; font-size: 14px; display: inline-flex; align-items: center; gap: 8px; }
            .nl-modal-title span { color: var(--nl-accent); font-weight: 600; }
            .nl-modal-tools { margin-left: auto; display: flex; gap: 8px; align-items: center; }
            .nl-input {
                background: var(--nl-bg); border: 1px solid var(--nl-border);
                color: var(--nl-text); padding: 8px 10px; border-radius: 8px;
                font: inherit; outline: none; transition: border-color .15s ease;
            }
            .nl-input:focus { border-color: var(--nl-accent); }
            .nl-input--search {
                padding: 8px 10px 8px 32px; min-width: 240px;
                background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239aa0a6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='11' cy='11' r='8'/><path d='m21 21-4.3-4.3'/></svg>");
                background-repeat: no-repeat; background-position: 10px center;
            }
            .nl-close {
                width: 32px; height: 32px; border-radius: 8px;
                border: 1px solid var(--nl-border); background: var(--nl-bg);
                color: var(--nl-text); cursor: pointer;
                display: inline-flex; align-items: center; justify-content: center;
                transition: background .15s ease, color .15s ease, border-color .15s ease;
            }
            .nl-close:hover { background: var(--nl-danger); color: #fff; border-color: transparent; }
            .nl-modal-body { flex: 1; overflow: auto; padding: 12px 16px; }
            .nl-modal-body::-webkit-scrollbar { width: 10px; height: 10px; }
            .nl-modal-body::-webkit-scrollbar-thumb { background: var(--nl-border); border-radius: 8px; }
            .nl-modal-body::-webkit-scrollbar-track { background: transparent; }

            .nl-settings-wrap { display: flex; flex: 1; overflow: hidden; min-height: 0; }
            .nl-settings-tabs {
                width: 200px; flex-shrink: 0;
                border-right: 1px solid var(--nl-border);
                background: var(--nl-bg2); padding: 10px 8px; overflow-y: auto;
            }
            .nl-settings-tab {
                display: flex; align-items: center; gap: 10px;
                padding: 10px 12px; border-radius: 8px; cursor: pointer;
                font-weight: 500; font-size: 13px; color: var(--nl-text-dim);
                margin-bottom: 4px; border: 1px solid transparent;
                transition: background .15s ease, color .15s ease, border-color .15s ease;
                user-select: none;
            }
            .nl-settings-tab:hover { background: var(--nl-panel-hover); color: var(--nl-text); }
            .nl-settings-tab.active {
                background: var(--nl-bg); color: var(--nl-accent);
                border-color: var(--nl-border); font-weight: 700;
            }
            .nl-settings-tab .nl-ico { width: 16px; height: 16px; }
            .nl-settings-panels { flex: 1; overflow-y: auto; padding: 18px 22px; min-width: 0; }

            .nl-settings-title {
                font-size: 17px; font-weight: 700; color: var(--nl-text);
                margin-bottom: 4px;
                display: flex; align-items: center; gap: 10px;
            }
            .nl-settings-title .nl-ico { width: 20px; height: 20px; color: var(--nl-accent); }
            .nl-settings-subtitle {
                color: var(--nl-text-dim); font-size: 12.5px;
                margin-bottom: 16px; line-height: 1.5;
            }
            .nl-settings-card {
                border: 1px solid var(--nl-border);
                border-radius: 12px;
                background: var(--nl-bg2);
                padding: 14px 16px;
                margin-bottom: 14px;
            }
            .nl-settings-card:last-child { margin-bottom: 0; }
            .nl-settings-card-title {
                font-size: 12px; font-weight: 700; text-transform: uppercase;
                letter-spacing: .5px; color: var(--nl-text-dim);
                margin-bottom: 10px;
                display: flex; align-items: center; gap: 8px;
            }
            .nl-settings-card-title .nl-ico { width: 14px; height: 14px; }
            .nl-settings-desc {
                color: var(--nl-text-dim); font-size: 12px;
                margin-top: -4px; margin-bottom: 10px; line-height: 1.5;
            }
            .nl-settings-desc code {
                background: var(--nl-bg); border: 1px solid var(--nl-border);
                border-radius: 4px; padding: 1px 5px;
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px;
            }

            .nl-field-row {
                display: flex; flex-direction: column; gap: 6px;
                margin-bottom: 14px;
            }
            .nl-field-row:last-child { margin-bottom: 0; }
            .nl-field-label {
                font-size: 12.5px; font-weight: 600; color: var(--nl-text);
            }
            .nl-field-hint {
                color: var(--nl-text-dim); font-size: 11.5px; line-height: 1.4;
            }
            .nl-field-inline {
                display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
            }
            .nl-field-inline .nl-input { flex: 1; min-width: 180px; }

            .nl-switch {
                display: flex; align-items: center; justify-content: space-between;
                gap: 12px; padding: 10px 0; cursor: pointer; user-select: none;
                border-bottom: 1px dashed var(--nl-border);
            }
            .nl-switch:last-child { border-bottom: none; padding-bottom: 0; }
            .nl-switch:first-child { padding-top: 0; }
            .nl-switch-text { flex: 1; min-width: 0; }
            .nl-switch-label { font-size: 13px; font-weight: 500; color: var(--nl-text); }
            .nl-switch-desc { font-size: 11.5px; color: var(--nl-text-dim); margin-top: 2px; line-height: 1.4; }
            .nl-switch-input {
                appearance: none; -webkit-appearance: none;
                width: 38px; height: 22px; border-radius: 999px;
                background: var(--nl-bg3); position: relative;
                cursor: pointer; flex-shrink: 0;
                transition: background .15s ease;
                border: 1px solid var(--nl-border);
            }
            .nl-switch-input::after {
                content: ''; position: absolute; top: 2px; left: 2px;
                width: 16px; height: 16px; border-radius: 50%;
                background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25);
                transition: transform .15s ease;
            }
            .nl-switch-input:checked {
                background: var(--nl-accent); border-color: var(--nl-accent);
            }
            .nl-switch-input:checked::after {
                transform: translateX(16px);
            }
            .nl-switch-input:focus-visible {
                outline: 2px solid var(--nl-accent-hover);
                outline-offset: 2px;
            }

            .nl-theme-options { display: flex; gap: 8px; flex-wrap: wrap; }
            .nl-theme-option {
                flex: 1; min-width: 110px;
                display: flex; flex-direction: column; align-items: center; gap: 8px;
                padding: 14px 10px; border: 2px solid var(--nl-border);
                border-radius: 10px; background: var(--nl-bg); cursor: pointer;
                transition: border-color .15s ease, background .15s ease, color .15s ease;
                color: var(--nl-text); font-weight: 600; user-select: none;
            }
            .nl-theme-option:hover { border-color: var(--nl-accent); }
            .nl-theme-option.active { border-color: var(--nl-accent); background: var(--nl-bg2); color: var(--nl-accent); }
            .nl-theme-option .nl-ico { width: 22px; height: 22px; }
            .nl-theme-option-label { font-size: 12px; }

            .nl-excl-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
            .nl-excl-item {
                display: flex; align-items: center; gap: 8px;
                padding: 8px 10px; border: 1px solid var(--nl-border);
                background: var(--nl-bg); border-radius: 8px;
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px;
            }
            .nl-excl-item .nl-excl-host { flex: 1; min-width: 0; word-break: break-all; }
            .nl-excl-empty { color: var(--nl-text-dim); font-style: italic; padding: 8px 0; }
            .nl-excl-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }

            .nl-about-list { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
            .nl-about-row { display: flex; gap: 8px; }
            .nl-about-row .nl-about-k { color: var(--nl-text-dim); min-width: 110px; font-weight: 600; }
            .nl-about-row .nl-about-v { color: var(--nl-text); word-break: break-word; }
            .nl-about-row .nl-about-v code {
                background: var(--nl-bg); border: 1px solid var(--nl-border);
                border-radius: 4px; padding: 1px 5px;
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px;
            }

            .nl-btn--sm { padding: 6px 10px; font-size: 12px; border-radius: 8px; }
            .nl-btn--sm .nl-ico { width: 14px; height: 14px; }

            .nl-row {
                border: 1px solid var(--nl-border); border-radius: 10px;
                margin-bottom: 8px; background: var(--nl-bg2); overflow: hidden;
                transition: border-color .15s ease;
            }
            .nl-row:hover { border-color: var(--nl-accent); }
            .nl-row-head {
                display: flex; align-items: center; gap: 10px;
                padding: 10px 12px; cursor: pointer; user-select: none;
            }
            .nl-compact .nl-row-head { padding: 6px 10px; gap: 6px; }
            .nl-compact .nl-row { margin-bottom: 4px; }
            .nl-compact .nl-row-details { padding: 8px 10px; }
            .nl-method {
                font-weight: 700; font-size: 11px;
                padding: 3px 8px; border-radius: 6px;
                background: var(--nl-bg3); color: var(--nl-text); letter-spacing: .3px;
            }
            .nl-method[data-m="GET"] { color: #2f9e44; }
            .nl-method[data-m="POST"] { color: #f08c00; }
            .nl-method[data-m="PUT"], .nl-method[data-m="PATCH"] { color: #1c7ed6; }
            .nl-method[data-m="DELETE"] { color: #e03131; }
            .nl-status {
                font-weight: 700; font-size: 11px;
                padding: 3px 8px; border-radius: 6px; background: var(--nl-bg3);
            }
            .nl-status.ok { color: var(--nl-success); }
            .nl-status.err { color: var(--nl-danger); }
            .nl-url {
                flex: 1; min-width: 0; white-space: nowrap;
                overflow: hidden; text-overflow: ellipsis;
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px;
            }
            .nl-src {
                font-size: 11px; color: var(--nl-text-dim);
                padding: 2px 6px; border-radius: 6px; border: 1px solid var(--nl-border);
            }
            .nl-chev {
                color: var(--nl-text-dim);
                display: inline-flex; align-items: center; justify-content: center;
                transition: transform .15s ease;
            }
            .nl-chev .nl-ico { width: 14px; height: 14px; }
            .nl-row.open .nl-chev { transform: rotate(90deg); }
            .nl-row-details {
                display: none; border-top: 1px solid var(--nl-border);
                padding: 10px 12px; background: var(--nl-bg);
            }
            .nl-row.open .nl-row-details { display: block; }
            .nl-row-toolbar {
                display: flex; gap: 6px; flex-wrap: wrap;
                padding: 0 0 10px; border-bottom: 1px solid var(--nl-border);
                margin-bottom: 10px;
            }
            .nl-copy-btn {
                display: inline-flex; align-items: center; gap: 4px;
                padding: 5px 10px; font-size: 11px; font-weight: 600;
                border: 1px solid var(--nl-border); background: var(--nl-bg2);
                color: var(--nl-text); border-radius: 6px; cursor: pointer;
                transition: background .15s, border-color .15s, color .15s;
                user-select: none; font-family: inherit;
            }
            .nl-copy-btn:hover { background: var(--nl-bg3); border-color: var(--nl-accent); color: var(--nl-accent); }
            .nl-copy-btn.copied { background: var(--nl-success); color: #fff; border-color: transparent; }
            .nl-copy-btn .nl-ico { width: 12px; height: 12px; }
            .nl-kv { margin-bottom: 10px; }
            .nl-kv:last-child { margin-bottom: 0; }
            .nl-k {
                font-size: 11px; font-weight: 700; text-transform: uppercase;
                letter-spacing: .5px; color: var(--nl-text-dim); margin-bottom: 4px;
                display: flex; align-items: center; gap: 6px;
            }
            .nl-v {
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px;
                white-space: pre-wrap; word-break: break-word;
                background: var(--nl-bg2); border: 1px solid var(--nl-border);
                border-radius: 8px; padding: 8px 10px; max-height: 320px; overflow: auto;
            }
            .nl-empty {
                text-align: center; color: var(--nl-text-dim);
                padding: 40px 10px; font-size: 13px;
                display: flex; flex-direction: column; align-items: center; gap: 8px;
            }
            .nl-badge-time {
                font-size: 11px; color: var(--nl-text-dim); margin-left: auto;
                display: inline-flex; align-items: center; gap: 4px;
            }
            .nl-badge-time.slow { color: var(--nl-danger); font-weight: 700; }
            .nl-headers { display: flex; flex-direction: column; gap: 4px; }
            .nl-header-row {
                display: flex; gap: 8px; align-items: flex-start;
                padding: 4px 6px; border-radius: 6px;
                background: var(--nl-bg2); border: 1px solid var(--nl-border);
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px;
            }
            .nl-header-name { color: var(--nl-accent); flex: 0 0 auto; }
            .nl-header-val { flex: 1; min-width: 0; word-break: break-all; }
            .nl-header-auth .nl-header-val.masked { color: var(--nl-text-dim); letter-spacing: 1px; }
            .nl-eye {
                flex: 0 0 auto; background: transparent; border: none; color: var(--nl-text-dim);
                cursor: pointer; padding: 0 2px; display: inline-flex; align-items: center;
            }
            .nl-eye:hover { color: var(--nl-accent); }
            .nl-eye .nl-ico { width: 14px; height: 14px; }
            .nl-headers-empty { color: var(--nl-text-dim); font-style: italic; }
            .nl-toast {
                position: fixed; bottom: 80px; right: 16px; z-index: 1000002;
                background: var(--nl-bg2); color: var(--nl-text);
                border: 1px solid var(--nl-border); border-radius: 10px;
                padding: 10px 14px; box-shadow: var(--nl-shadow);
                font: 13px/1.3 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
                max-width: 320px; animation: nlFade .15s ease;
            }
            .nl-reenable {
                position: fixed; bottom: 16px; right: 16px; z-index: 999999;
                display: inline-flex; align-items: center; gap: 8px;
                padding: 8px 12px; border-radius: 999px;
                border: 1px solid var(--nl-panel-border);
                background: var(--nl-panel); color: var(--nl-text);
                cursor: pointer;
                font: 12px/1.3 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
                font-weight: 600; box-shadow: var(--nl-panel-shadow);
                backdrop-filter: blur(8px); opacity: .85;
                transition: opacity .15s ease, background .15s ease, border-color .15s ease;
                user-select: none;
            }
            .nl-reenable:hover { opacity: 1; background: var(--nl-panel-hover); border-color: var(--nl-accent); }
            .nl-reenable .nl-ico { width: 16px; height: 16px; color: var(--nl-danger); }
            .nl-badge-mock {
                display: inline-flex; align-items: center;
                font-size: 10px; font-weight: 700;
                padding: 1px 5px; border-radius: 4px;
                background: var(--nl-success); color: #fff;
            }
            .nl-badge-rule {
                display: inline-flex; align-items: center;
                font-size: 10px; font-weight: 700;
                padding: 1px 5px; border-radius: 4px;
                background: var(--nl-accent); color: #fff;
                margin-left: 2px;
            }
            .nl-rule-item {
                border: 1px solid var(--nl-border); border-radius: 10px;
                margin-bottom: 10px; background: var(--nl-bg); overflow: hidden;
            }
            .nl-rule-head {
                display: flex; align-items: center; gap: 10px;
                padding: 10px 12px; cursor: pointer; user-select: none;
            }
            .nl-rule-head:hover { background: var(--nl-bg2); }
            .nl-rule-enabled {
                flex: 0 0 auto; width: 16px; height: 16px;
                cursor: pointer; accent-color: var(--nl-accent);
            }
            .nl-rule-match {
                flex: 1; min-width: 0;
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                font-size: 12px; overflow: hidden;
                text-overflow: ellipsis; white-space: nowrap;
            }
            .nl-rule-summary {
                font-size: 11px; color: var(--nl-text-dim);
                padding: 2px 8px; border-radius: 4px;
                border: 1px solid var(--nl-border);
                white-space: nowrap;
            }
            .nl-rule-chev {
                color: var(--nl-text-dim);
                display: inline-flex; align-items: center;
                transition: transform .15s ease;
            }
            .nl-rule-chev .nl-ico { width: 14px; height: 14px; }
            .nl-rule-item.open .nl-rule-chev { transform: rotate(90deg); }
            .nl-rule-editor {
                display: none;
                padding: 12px; border-top: 1px solid var(--nl-border);
                background: var(--nl-bg2);
            }
            .nl-rule-item.open .nl-rule-editor { display: block; }
            .nl-rule-section {
                margin-bottom: 12px; padding: 10px 12px;
                border: 1px solid var(--nl-border); border-radius: 8px;
                background: var(--nl-bg);
            }
            .nl-rule-section:last-of-type { margin-bottom: 0; }
            .nl-rule-section-title {
                font-size: 11px; font-weight: 700;
                text-transform: uppercase; letter-spacing: .5px;
                color: var(--nl-text-dim); margin-bottom: 8px;
            }
            .nl-rule-field { margin-bottom: 10px; }
            .nl-rule-field:last-child { margin-bottom: 0; }
            .nl-rule-label {
                display: block; font-size: 11.5px; font-weight: 600;
                color: var(--nl-text-dim); margin-bottom: 4px;
            }
            .nl-rule-input, .nl-rule-textarea, .nl-rule-select {
                width: 100%; box-sizing: border-box;
                background: var(--nl-bg); border: 1px solid var(--nl-border);
                color: var(--nl-text); padding: 6px 9px; border-radius: 6px;
                font: inherit; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                font-size: 12px; outline: none;
            }
            .nl-rule-input:focus, .nl-rule-textarea:focus, .nl-rule-select:focus {
                border-color: var(--nl-accent);
            }
            .nl-rule-textarea { min-height: 60px; resize: vertical; }
            .nl-rule-select { font-family: inherit; }
            .nl-rule-row { display: flex; gap: 10px; margin-bottom: 10px; }
            .nl-rule-row > * { flex: 1; min-width: 0; }
            .nl-rule-row .nl-rule-field { margin-bottom: 0; }
            .nl-rule-actions {
                display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;
            }
            .nl-rule-empty {
                padding: 20px 10px; text-align: center;
                color: var(--nl-text-dim); font-style: italic;
            }
            .nl-rule-warn {
                color: var(--nl-danger); font-size: 11.5px;
                margin-top: 6px; font-weight: 600;
            }
            .nl-update-block {
                border: 2px solid var(--nl-danger);
                border-radius: 12px;
                background: linear-gradient(135deg, var(--nl-bg) 0%, var(--nl-bg2) 100%);
                padding: 14px 16px;
                margin-top: 12px;
                box-shadow: 0 4px 16px rgba(217, 54, 62, .18);
            }
            .nl-update-block-title {
                font-size: 14.5px;
                font-weight: 700;
                color: var(--nl-danger);
                margin-bottom: 6px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .nl-update-meta {
                font-size: 11.5px;
                color: var(--nl-text-dim);
                margin-bottom: 10px;
            }
            .nl-update-block-desc {
                font-size: 12.5px;
                color: var(--nl-text);
                line-height: 1.5;
                white-space: pre-wrap;
                word-break: break-word;
                margin-bottom: 12px;
                max-height: 220px;
                overflow-y: auto;
                padding: 10px 12px;
                background: var(--nl-bg);
                border: 1px solid var(--nl-border);
                border-radius: 8px;
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            }
            .nl-update-block-actions { display: flex; gap: 8px; flex-wrap: wrap; }
            .nl-update-status {
                font-size: 12.5px;
                color: var(--nl-text-dim);
                margin-bottom: 4px;
                min-height: 1.5em;
            }
            @media (max-width: 640px) {
                .nl-input--search { min-width: 120px; }
                .nl-modal { height: 92vh; }
                .nl-badge-time span { display: none; }
                .nl-settings-wrap { flex-direction: column; }
                .nl-settings-tabs {
                    width: 100%; display: flex; overflow-x: auto;
                    border-right: none; border-bottom: 1px solid var(--nl-border); padding: 6px;
                }
                .nl-settings-tab { margin-bottom: 0; white-space: nowrap; }
                .nl-rule-row { flex-direction: column; }
            }
        `;
        document.head.appendChild(style);
    }

    const THEME = {
        dark: {
            bg: '#1c1f24', bg2: '#24282f', bg3: '#2d323a',
            text: '#e8eaed', textDim: '#9aa0a6', border: '#3a3f47',
            accent: '#4c8dff', accentHover: '#6aa1ff',
            danger: '#e5484d', success: '#30a46c', muted: '#6c757d',
            shadow: '0 10px 30px rgba(0,0,0,.45)',
            overlay: 'rgba(0,0,0,.55)',
            panel: '#2a2f37', panelHover: '#333a44',
            panelBorder: '#444b55', panelShadow: '0 14px 34px rgba(0,0,0,.5)',
            jsonKey: '#74c0fc',
            jsonStr: '#69db7c',
            jsonNum: '#ffc078',
            jsonBool: '#da77f2',
            jsonNull: '#868e96'
        },
        light: {
            bg: '#ffffff', bg2: '#f4f6f8', bg3: '#e9edf1',
            text: '#1c1f24', textDim: '#5f6368', border: '#d7dce1',
            accent: '#0d6efd', accentHover: '#3d8bfd',
            danger: '#d9363e', success: '#198754', muted: '#6c757d',
            shadow: '0 10px 30px rgba(0,0,0,.15)',
            overlay: 'rgba(20,22,26,.35)',
            panel: '#eaf0f7', panelHover: '#dde5ef',
            panelBorder: '#c5d0dc', panelShadow: '0 14px 34px rgba(30,40,60,.18)',
            jsonKey: '#0b7285',
            jsonStr: '#2b8a3e',
            jsonNum: '#e67700',
            jsonBool: '#9c36b5',
            jsonNull: '#868e96'
        }
    };

    const media = window.matchMedia('(prefers-color-scheme: dark)');

    function currentTheme() {
        const mode = loadThemeMode();
        if (mode === 'light') return THEME.light;
        if (mode === 'dark') return THEME.dark;
        return media.matches ? THEME.dark : THEME.light;
    }
    function isDarkActive() {
        const mode = loadThemeMode();
        return mode === 'dark' || (mode === 'auto' && media.matches);
    }
    function applyTheme(root) {
        const t = currentTheme();
        root.style.setProperty('--nl-bg', t.bg);
        root.style.setProperty('--nl-bg2', t.bg2);
        root.style.setProperty('--nl-bg3', t.bg3);
        root.style.setProperty('--nl-text', t.text);
        root.style.setProperty('--nl-text-dim', t.textDim);
        root.style.setProperty('--nl-border', t.border);
        root.style.setProperty('--nl-accent', t.accent);
        root.style.setProperty('--nl-accent-hover', t.accentHover);
        root.style.setProperty('--nl-danger', t.danger);
        root.style.setProperty('--nl-success', t.success);
        root.style.setProperty('--nl-muted', t.muted);
        root.style.setProperty('--nl-shadow', t.shadow);
        root.style.setProperty('--nl-overlay', t.overlay);
        root.style.setProperty('--nl-panel', t.panel);
        root.style.setProperty('--nl-panel-hover', t.panelHover);
        root.style.setProperty('--nl-panel-border', t.panelBorder);
        root.style.setProperty('--nl-panel-shadow', t.panelShadow);
        root.style.setProperty('--nl-json-key', t.jsonKey);
        root.style.setProperty('--nl-json-str', t.jsonStr);
        root.style.setProperty('--nl-json-num', t.jsonNum);
        root.style.setProperty('--nl-json-bool', t.jsonBool);
        root.style.setProperty('--nl-json-null', t.jsonNull);
        root.setAttribute('data-nl-theme', isDarkActive() ? 'dark' : 'light');
    }
    function refreshAllThemes() {
        ['#__netLoggerUI', '.nl-modal-overlay', '.nl-reenable', '.nl-toast'].forEach(sel => {
            document.querySelectorAll(sel).forEach(el => applyTheme(el));
        });
    }

    const ICONS = {
        globe: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
        eye: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`,
        eyeOff: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>`,
        download: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
        upload: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>`,
        clipboard: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`,
        trash: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
        x: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
        chevronRight: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
        chevronDown: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
        activity: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>`,
        settings: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
        plus: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
        ban: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>`,
        power: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>`,
        info: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
        check: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
        edit: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>`,
        palette: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
        eye2: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`,
        zap: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
        cpu: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>`
    };

    function renderReenableButton() {
        injectStyles();
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nl-reenable';
        btn.title = 'API Tools отключён для этого сайта. Нажмите, чтобы включить обратно.';
        btn.innerHTML = ICONS.ban + '<span>Включить</span>';
        applyTheme(btn);
        btn.addEventListener('click', () => {
            removeCurrentHostFromExcluded();
            location.reload();
        });
        const append = () => {
            if (document.body) document.body.appendChild(btn);
            else setTimeout(append, 50);
        };
        append();
        const onThemeChange = () => applyTheme(btn);
        if (media.addEventListener) media.addEventListener('change', onThemeChange);
        else if (media.addListener) media.addListener(onThemeChange);
        console.log('[API Tools] Сайт в исключениях: ' + location.hostname + '. Кнопка "Включить API Tools" добавлена в правый нижний угол.');
    }

    if (isHostExcluded(location.hostname, loadExcluded())) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', renderReenableButton, { once: true });
        } else {
            renderReenableButton();
        }
        return;
    }

    window.__netLogger = { logs: [], disabled: false };
    const logs = window.__netLogger.logs;

    function safeJson(text) {
        try { return JSON.parse(text); } catch (_) { return null; }
    }
    function isAuthorizationHeader(name) {
        return String(name || '').trim().toLowerCase() === 'authorization';
    }

    function serializeBody(body) {
        if (body === null || body === undefined) return null;
        try {
            if (typeof FormData !== 'undefined' && body instanceof FormData) {
                const entries = [];
                for (const [k, v] of body.entries()) {
                    if (typeof v === 'string') {
                        entries.push([k, v]);
                    } else {
                        const fname = v.name || '(blob)';
                        const fsize = v.size != null ? v.size + ' bytes' : '?';
                        const ftype = v.type || 'unknown';
                        entries.push([k, `[File: ${fname}, ${fsize}, ${ftype}]`]);
                    }
                }
                return { __type: 'FormData', entries };
            }
            if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
                return { __type: 'URLSearchParams', entries: [...body.entries()] };
            }
            if (typeof Blob !== 'undefined' && body instanceof Blob) {
                return `[Blob: ${body.size} bytes, ${body.type || 'unknown'}]`;
            }
            if (typeof ArrayBuffer !== 'undefined' && (body instanceof ArrayBuffer || ArrayBuffer.isView(body))) {
                const len = body.byteLength != null ? body.byteLength : (body.length || 0);
                return `[Binary: ${len} bytes]`;
            }
            if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) {
                return '[ReadableStream]';
            }
            if (typeof body === 'string') return body;
            if (typeof body === 'object') {
                try { return JSON.parse(JSON.stringify(body)); } catch (_) { return String(body); }
            }
            return String(body);
        } catch (e) {
            return '[error serializing: ' + e.message + ']';
        }
    }

    function formatBody(body) {
        if (body === null || body === undefined) return '';
        if (typeof body === 'string') return body;
        if (typeof body === 'object' && body.__type === 'FormData') {
            if (!body.entries.length) return 'FormData (пусто)';
            return 'FormData:\n' + body.entries.map(([k, v]) => `  ${k}: ${v}`).join('\n');
        }
        if (typeof body === 'object' && body.__type === 'URLSearchParams') {
            if (!body.entries.length) return 'URLSearchParams (пусто)';
            return 'URLSearchParams:\n' + body.entries.map(([k, v]) => `  ${k}: ${v}`).join('\n');
        }
        try { return JSON.stringify(body, null, 2); } catch (_) { return String(body); }
    }

    function bodyToString(r) {
        const body = r.requestBody;
        if (body === null || body === undefined) return '';
        if (typeof body === 'string') return body;
        if (typeof body === 'object' && body.__type === 'FormData') {
            return body.entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
        }
        if (typeof body === 'object' && body.__type === 'URLSearchParams') {
            return body.entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
        }
        try { return JSON.stringify(body); } catch (_) { return String(body); }
    }

    function normalizeHeaders(input) {
        const pairs = [];
        if (!input) return pairs;
        try {
            if (typeof Headers !== 'undefined' && input instanceof Headers) {
                input.forEach((v, k) => pairs.push([k, v]));
            } else if (Array.isArray(input)) {
                input.forEach(pair => {
                    if (Array.isArray(pair) && pair.length >= 2) {
                        pairs.push([String(pair[0]), String(pair[1])]);
                    }
                });
            } else if (typeof input === 'object') {
                Object.keys(input).forEach(k => {
                    const v = input[k];
                    if (Array.isArray(v)) pairs.push([k, v.join(', ')]);
                    else pairs.push([k, String(v)]);
                });
            }
        } catch (_) {}
        return pairs;
    }

    function parseRawHeaders(raw) {
        const pairs = [];
        if (!raw || typeof raw !== 'string') return pairs;
        raw.trim().split(/[\r\n]+/).forEach(line => {
            const idx = line.indexOf(':');
            if (idx > 0) pairs.push([line.slice(0, idx).trim(), line.slice(idx + 1).trim()]);
        });
        return pairs;
    }

    function rulesSummary(matched) {
        if (!matched || !matched.length) return null;
        return matched.map(r => ({ id: r.id, match: r.match, method: r.method, mocked: !!r.mockStatus }));
    }

    function trimLogs() {
        const max = loadMaxLogs();
        if (logs.length > max) logs.splice(0, logs.length - max);
    }

    function pushLog(entry) {
        if (window.__netLogger.disabled) return;
        logs.push(entry);
        trimLogs();
        if (loadConsoleLogs()) {
            console.groupCollapsed(`[${logs.length}] ${entry.method} ${entry.url}${entry.mocked ? ' [MOCK]' : ''}`);
            if (entry.status) console.log('status:', entry.status);
            if (entry.duration != null) console.log('duration:', entry.duration.toFixed(0) + ' ms');
            if (entry.requestBody !== null && entry.requestBody !== undefined) console.log('body:', entry.requestBody);
            if (entry.response) console.log('response:', entry.response);
            if (entry.appliedRules) console.log('applied rules:', entry.appliedRules);
            console.groupEnd();
        }
        if (window.__netLoggerUI && window.__netLoggerUI.refresh) window.__netLoggerUI.refresh();
        if (window.__netLoggerBar && window.__netLoggerBar.refresh) window.__netLoggerBar.refresh();
    }

    function computeXhrResponse(responseType, text) {
        if (responseType === 'json') return safeJson(text);
        if (responseType === '' || responseType === 'text') return text;
        return null;
    }

    function debugLog(...args) {
        if (loadDebug()) console.log('[NL]', ...args);
    }

    const originalFetch = window.fetch;

    async function fetchGitHubRelease() {
        const apiUrl = `https://api.github.com/repos/${encodeURIComponent(UPDATE_REPO.user)}/${encodeURIComponent(UPDATE_REPO.repo)}/releases/latest`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        try {
            const res = await originalFetch(apiUrl, {
                headers: { 'Accept': 'application/vnd.github+json' },
                signal: controller.signal,
                cache: 'no-cache'
            });
            if (!res.ok) {
                if (res.status === 404) throw new Error('Релизы не найдены в репозитории');
                if (res.status === 403) throw new Error('Превышен лимит GitHub API');
                throw new Error('GitHub API: HTTP ' + res.status);
            }
            return await res.json();
        } catch (e) {
            if (e.name === 'AbortError') throw new Error('Таймаут проверки обновлений');
            throw e;
        } finally {
            clearTimeout(timer);
        }
    }

    window.fetch = async function (input, init) {
        if (window.__netLogger.disabled) return originalFetch.apply(this, arguments);

        const isRequest = typeof Request !== 'undefined' && input instanceof Request;

        let origUrl, origMethod, origHeaders;
        if (isRequest) {
            origUrl = input.url;
            origMethod = (input.method || 'GET').toUpperCase();
            origHeaders = normalizeHeaders(input.headers);
        } else {
            origUrl = typeof input === 'string' ? input : (input instanceof URL ? input.href : (input && input.url) || '');
            origMethod = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
            origHeaders = [];
            try { if (init && init.headers) origHeaders = normalizeHeaders(init.headers); } catch (_) {}
        }

        let origBodyRaw = null;
        let origBodySer = null;
        if (isRequest) {
            try {
                const t = await input.clone().text();
                if (t) { origBodyRaw = t; origBodySer = safeJson(t) || t; }
            } catch (_) {}
        } else if (init && 'body' in init) {
            origBodyRaw = init.body;
            origBodySer = serializeBody(init.body);
        }

        const matched = matchRules(origUrl, origMethod);
        const applied = rulesSummary(matched);
        const __start = performance.now();

        debugLog('fetch', origMethod, origUrl,
            '| applyRules:', loadApplyRules(),
            '| total rules:', loadRules().length,
            '| matched:', matched.length,
            matched.length ? matched.map(r => ({ match: r.match, method: r.method, mockStatus: r.mockStatus })) : '');

        if (matched.length) {
            const result = applyRules(matched, origUrl, origHeaders, origBodyRaw);

            if (result.mocked) {
                const duration = performance.now() - __start;
                const headers = new Headers();
                (result.mocked.headers || []).forEach(([n, v]) => {
                    try { headers.set(n, v); } catch (_) {}
                });
                if (result.mocked.body && !headers.has('content-type')) {
                    headers.set('content-type', 'application/json');
                }
                const responseHeaders = [...headers.entries()].map(([n, v]) => [n, v]);
                const responseData = safeJson(result.mocked.body) || result.mocked.body;

                debugLog('MOCK fired (fetch)', {
                    url: origUrl, status: result.mocked.status,
                    bodyLen: result.mocked.body.length,
                    bodyPreview: result.mocked.body.substring(0, 100),
                    headers: responseHeaders
                });

                if (!result.mocked.body) {
                    console.warn('[NL] Mock body пустой, но mockStatus задан. Заполните поле "Mock body" в правиле.');
                }

                pushLog({
                    source: 'fetch', time: new Date().toISOString(),
                    method: origMethod, url: origUrl, status: result.mocked.status,
                    requestHeaders: origHeaders, requestBody: origBodySer,
                    responseHeaders, response: responseData,
                    appliedRules: applied, mocked: true, duration
                });

                try {
                    return new Response(result.mocked.body, {
                        status: result.mocked.status,
                        headers
                    });
                } catch (e) {
                    console.error('[NL] Failed to build mock Response:', e);
                    return originalFetch.apply(this, arguments);
                }
            }

            let fetchArgs;
            try {
                const newInit = isRequest
                    ? {
                        method: origMethod,
                        mode: input.mode, credentials: input.credentials, cache: input.cache,
                        redirect: input.redirect, referrer: input.referrer,
                        referrerPolicy: input.referrerPolicy, integrity: input.integrity,
                        keepalive: input.keepalive, signal: input.signal
                    }
                    : { ...(init || {}) };
                newInit.headers = headersToObj(result.headers);
                if (result.hasBody) {
                    newInit.body = typeof result.body === 'string' ? result.body : bodyToString({ requestBody: result.body });
                } else if ('body' in newInit) {
                    delete newInit.body;
                }
                if (isRequest) {
                    try {
                        fetchArgs = [new Request(result.url, newInit)];
                    } catch (_) {
                        fetchArgs = [result.url, newInit];
                    }
                } else {
                    fetchArgs = [result.url, newInit];
                }
            } catch (_) {
                fetchArgs = Array.from(arguments);
            }

            try {
                const response = await originalFetch.apply(this, fetchArgs);
                const duration = performance.now() - __start;
                const clone = response.clone();
                let resHeaders = [];
                try { resHeaders = normalizeHeaders(response.headers); } catch (_) {}
                let responseData = null;
                try {
                    const text = await clone.text();
                    responseData = safeJson(text) || text.substring(0, loadMaxBody());
                } catch (_) {}
                pushLog({
                    source: 'fetch', time: new Date().toISOString(),
                    method: origMethod, url: origUrl, status: response.status,
                    requestHeaders: origHeaders, requestBody: origBodySer,
                    responseHeaders: resHeaders, response: responseData,
                    appliedRules: applied, duration
                });
                return response;
            } catch (err) {
                const duration = performance.now() - __start;
                pushLog({
                    source: 'fetch', time: new Date().toISOString(),
                    method: origMethod, url: origUrl,
                    requestHeaders: origHeaders, requestBody: origBodySer,
                    error: String(err), appliedRules: applied, duration
                });
                throw err;
            }
        }

        try {
            const response = await originalFetch.apply(this, arguments);
            const duration = performance.now() - __start;
            const clone = response.clone();
            let resHeaders = [];
            try { resHeaders = normalizeHeaders(response.headers); } catch (_) {}
            let responseData = null;
            try {
                const text = await clone.text();
                responseData = safeJson(text) || text.substring(0, loadMaxBody());
            } catch (_) {}
            pushLog({
                source: 'fetch', time: new Date().toISOString(),
                method: origMethod, url: origUrl, status: response.status,
                requestHeaders: origHeaders, requestBody: origBodySer,
                responseHeaders: resHeaders, response: responseData, duration
            });
            return response;
        } catch (err) {
            const duration = performance.now() - __start;
            pushLog({
                source: 'fetch', time: new Date().toISOString(),
                method: origMethod, url: origUrl,
                requestHeaders: origHeaders, requestBody: origBodySer,
                error: String(err), duration
            });
            throw err;
        }
    };

    const XHR = window.XMLHttpRequest;

    function findDescriptor(obj, name) {
        let cur = obj;
        while (cur) {
            const d = Object.getOwnPropertyDescriptor(cur, name);
            if (d) return d;
            cur = Object.getPrototypeOf(cur);
        }
        return null;
    }

    function installXhrShadows(xhr) {
        const props = ['responseText', 'response', 'status', 'statusText', 'readyState', 'responseURL'];
        const orig = {};
        props.forEach(p => { orig[p] = findDescriptor(xhr, p); });
        let mock = null;

        props.forEach(p => {
            const d = orig[p];
            Object.defineProperty(xhr, p, {
                configurable: true,
                get() {
                    if (mock) return mock[p];
                    if (d && d.get) return d.get.call(xhr);
                    if (d && 'value' in d) return d.value;
                    return undefined;
                }
            });
        });

        const origAll = XHR.prototype.getAllResponseHeaders;
        const origOne = XHR.prototype.getResponseHeader;
        Object.defineProperty(xhr, 'getAllResponseHeaders', {
            configurable: true,
            value: function () {
                if (mock) return mock.headers || '';
                return origAll.call(xhr);
            }
        });
        Object.defineProperty(xhr, 'getResponseHeader', {
            configurable: true,
            value: function (name) {
                if (mock) {
                    const lname = String(name).toLowerCase();
                    const lines = (mock.headers || '').split(/\r?\n/);
                    for (const line of lines) {
                        const i = line.indexOf(':');
                        if (i > 0 && line.slice(0, i).trim().toLowerCase() === lname) {
                            return line.slice(i + 1).trim();
                        }
                    }
                    return null;
                }
                return origOne.call(xhr, name);
            }
        });

        return {
            setMock(m) { mock = m; },
            updateMock(patch) { if (mock) Object.assign(mock, patch); }
        };
    }

    function WrappedXHR() {
        const xhr = new XHR();
        let reqMethod = 'GET';
        let reqUrl = '';
        let reqHeaders = [];
        let matchedRules = [];
        let origBodySer = null;
        let shadows = null;
        let startTime = 0;

        const openOrig = xhr.open;
        xhr.open = function (method, url) {
            reqMethod = (method || 'GET').toUpperCase();
            reqUrl = url || '';
            reqHeaders = [];
            origBodySer = null;
            if (shadows) shadows.setMock(null);
            matchedRules = window.__netLogger.disabled ? [] : matchRules(reqUrl, reqMethod);

            debugLog('xhr.open', reqMethod, reqUrl,
                '| matched:', matchedRules.length,
                matchedRules.length ? matchedRules.map(r => ({ match: r.match, mockStatus: r.mockStatus })) : '');

            let finalUrl = reqUrl;
            for (const rule of matchedRules) {
                if (rule.newUrl) finalUrl = rule.newUrl;
            }

            const args = Array.prototype.slice.call(arguments);
            if (finalUrl !== reqUrl) args[1] = finalUrl;
            return openOrig.apply(xhr, args);
        };

        const setHeaderOrig = xhr.setRequestHeader;
        xhr.setRequestHeader = function (name, value) {
            try { reqHeaders.push([String(name), String(value)]); } catch (_) {}
            return setHeaderOrig.apply(xhr, arguments);
        };

        const sendOrig = xhr.send;
        xhr.send = function (body) {
            if (window.__netLogger.disabled) return sendOrig.apply(xhr, arguments);

            startTime = performance.now();
            origBodySer = body !== undefined && body !== null ? serializeBody(body) : null;
            const applied = rulesSummary(matchedRules);

            if (matchedRules.length) {
                const result = applyRules(matchedRules, reqUrl, reqHeaders, body);

                if (result.mocked) {
                    if (!shadows) shadows = installXhrShadows(xhr);
                    const mockHeaderPairs = (result.mocked.headers || [])
                        .map(([n, v]) => n + ': ' + v)
                        .join('\r\n');
                    const mockHeaders = mockHeaderPairs
                        ? mockHeaderPairs + '\r\n'
                        : (result.mocked.body ? 'content-type: application/json\r\n' : '');

                    const mockObj = {
                        readyState: 2,
                        responseText: '',
                        response: null,
                        status: result.mocked.status,
                        statusText: 'OK',
                        headers: mockHeaders,
                        responseURL: reqUrl
                    };
                    shadows.setMock(mockObj);

                    const duration = performance.now() - startTime;

                    debugLog('MOCK fired (xhr)', {
                        url: reqUrl, status: result.mocked.status,
                        bodyLen: result.mocked.body.length,
                        bodyPreview: result.mocked.body.substring(0, 100),
                        headers: mockHeaders
                    });

                    if (!result.mocked.body) {
                        console.warn('[NL] Mock body пустой, но mockStatus задан. Заполните поле "Mock body" в правиле.');
                    }

                    pushLog({
                        source: 'xhr', time: new Date().toISOString(),
                        method: reqMethod, url: reqUrl, status: result.mocked.status,
                        requestHeaders: reqHeaders, requestBody: origBodySer,
                        responseHeaders: parseRawHeaders(mockHeaders),
                        response: result.mocked.body,
                        appliedRules: applied, mocked: true, duration
                    });

                    setTimeout(() => {
                        try {
                            xhr.dispatchEvent(new Event('readystatechange'));
                            mockObj.readyState = 3;
                            mockObj.responseText = result.mocked.body;
                            mockObj.response = computeXhrResponse(xhr.responseType, result.mocked.body);
                            xhr.dispatchEvent(new Event('readystatechange'));
                            mockObj.readyState = 4;
                            xhr.dispatchEvent(new Event('readystatechange'));
                            xhr.dispatchEvent(new Event('load'));
                            xhr.dispatchEvent(new ProgressEvent('loadend'));
                        } catch (e) {
                            console.error('[NL] Failed to dispatch mock events:', e);
                        }
                    }, 0);
                    return;
                }

                result.headers.forEach(([n, v]) => {
                    try { setHeaderOrig.call(xhr, n, v); } catch (_) {}
                });
                reqHeaders = result.headers;

                xhr.addEventListener('loadend', function () {
                    const duration = performance.now() - startTime;
                    let responseData = null;
                    let resHeaders = [];
                    try { resHeaders = parseRawHeaders(xhr.getAllResponseHeaders()); } catch (_) {}
                    try {
                        if (xhr.responseType === '' || xhr.responseType === 'text') {
                            responseData = safeJson(xhr.responseText) || xhr.responseText.substring(0, loadMaxBody());
                        } else if (xhr.responseType === 'json') {
                            responseData = xhr.response;
                        } else {
                            responseData = '[binary/other responseType: ' + xhr.responseType + ']';
                        }
                    } catch (e) {
                        responseData = '[error reading: ' + e.message + ']';
                    }
                    pushLog({
                        source: 'xhr', time: new Date().toISOString(),
                        method: reqMethod, url: reqUrl, status: xhr.status,
                        requestHeaders: reqHeaders, requestBody: origBodySer,
                        responseHeaders: resHeaders, response: responseData,
                        appliedRules: applied, duration
                    });
                });

                if (result.hasBody && result.body !== body) {
                    return sendOrig.call(xhr, result.body);
                }
                return sendOrig.apply(xhr, arguments);
            }

            xhr.addEventListener('loadend', function () {
                const duration = performance.now() - startTime;
                let responseData = null;
                let resHeaders = [];
                try { resHeaders = parseRawHeaders(xhr.getAllResponseHeaders()); } catch (_) {}
                try {
                    if (xhr.responseType === '' || xhr.responseType === 'text') {
                        responseData = safeJson(xhr.responseText) || xhr.responseText.substring(0, loadMaxBody());
                    } else if (xhr.responseType === 'json') {
                        responseData = xhr.response;
                    } else {
                        responseData = '[binary/other responseType: ' + xhr.responseType + ']';
                    }
                } catch (e) {
                    responseData = '[error reading: ' + e.message + ']';
                }
                pushLog({
                    source: 'xhr', time: new Date().toISOString(),
                    method: reqMethod, url: reqUrl, status: xhr.status,
                    requestHeaders: reqHeaders, requestBody: origBodySer,
                    responseHeaders: resHeaders, response: responseData, duration
                });
            });
            return sendOrig.apply(xhr, arguments);
        };

        return xhr;
    }
    window.XMLHttpRequest = WrappedXHR;

    function makeButton({ text, iconName, variant, size, onClick }) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'nl-btn'
            + (variant ? ' nl-btn--' + variant : '')
            + (size === 'sm' ? ' nl-btn--sm' : '');
        if (iconName && ICONS[iconName]) b.insertAdjacentHTML('beforeend', ICONS[iconName]);
        const label = document.createElement('span');
        label.textContent = text;
        b.appendChild(label);
        b.addEventListener('click', onClick);
        return b;
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function formatResponse(r) {
        if (r === null || r === undefined) return '';
        if (typeof r === 'string') return r;
        try {
            if (loadPrettyPrint()) return JSON.stringify(r, null, 2);
            return JSON.stringify(r);
        } catch (_) { return String(r); }
    }

    function tryParseJsonObj(str) {
        try {
            const v = JSON.parse(str);
            if (v !== null && typeof v === 'object') return v;
            return undefined;
        } catch (_) { return undefined; }
    }

    function highlightJson(jsonStr) {
        let result = '';
        let lastIndex = 0;
        const regex = /("(?:\\.|[^"\\])*")(\s*:)?|(\btrue\b|\bfalse\b)|(\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/g;
        let m;
        while ((m = regex.exec(jsonStr)) !== null) {
            result += escapeHtml(jsonStr.slice(lastIndex, m.index));
            if (m[1] !== undefined) {
                const isKey = m[2] !== undefined;
                const cls = isKey ? 'nl-j-key' : 'nl-j-str';
                result += '<span class="' + cls + '">' + escapeHtml(m[1]) + '</span>';
                if (isKey) result += escapeHtml(m[2]);
            } else if (m[3] !== undefined) {
                result += '<span class="nl-j-bool">' + escapeHtml(m[3]) + '</span>';
            } else if (m[4] !== undefined) {
                result += '<span class="nl-j-null">' + escapeHtml(m[4]) + '</span>';
            } else if (m[5] !== undefined) {
                result += '<span class="nl-j-num">' + escapeHtml(m[5]) + '</span>';
            }
            lastIndex = regex.lastIndex;
        }
        result += escapeHtml(jsonStr.slice(lastIndex));
        return result;
    }

    function formatJsonHtml(obj) {
        try {
            const str = JSON.stringify(obj, null, loadPrettyPrint() ? 2 : 0);
            return highlightJson(str);
        } catch (_) {
            return escapeHtml(String(obj));
        }
    }

    function formatBodyHtml(body) {
        if (body === null || body === undefined) return '';
        if (typeof body === 'string') {
            const parsed = tryParseJsonObj(body);
            if (parsed !== undefined) return formatJsonHtml(parsed);
            return escapeHtml(body);
        }
        if (typeof body === 'object' && body.__type === 'FormData') {
            if (!body.entries.length) return escapeHtml('FormData (пусто)');
            return '<span class="nl-j-key">FormData:</span>\n'
                + body.entries.map(([k, v]) => `  ${escapeHtml(k)}: ${escapeHtml(v)}`).join('\n');
        }
        if (typeof body === 'object' && body.__type === 'URLSearchParams') {
            if (!body.entries.length) return escapeHtml('URLSearchParams (пусто)');
            return '<span class="nl-j-key">URLSearchParams:</span>\n'
                + body.entries.map(([k, v]) => `  ${escapeHtml(k)}: ${escapeHtml(v)}`).join('\n');
        }
        return formatJsonHtml(body);
    }

    function formatResponseHtml(r) {
        if (r === null || r === undefined) return '';
        if (typeof r === 'string') {
            const parsed = tryParseJsonObj(r);
            if (parsed !== undefined) return formatJsonHtml(parsed);
            return escapeHtml(r);
        }
        return formatJsonHtml(r);
    }

    const rowKeyMap = new WeakMap();
    let rowKeySeq = 0;
    function getRowKey(record) {
        let k = rowKeyMap.get(record);
        if (!k) { k = 'r' + (++rowKeySeq); rowKeyMap.set(record, k); }
        return k;
    }

    function renderHeaders(pairs, emptyText) {
        if (!Array.isArray(pairs) || pairs.length === 0) {
            return `<div class="nl-headers-empty">${escapeHtml(emptyText || 'нет')}</div>`;
        }
        const rows = pairs.map(([name, value]) => {
            const isAuth = isAuthorizationHeader(name);
            const safeName = escapeHtml(name);
            const safeValue = escapeHtml(value);
            if (isAuth) {
                return `
                    <div class="nl-header-row nl-header-auth" data-revealed="0">
                        <span class="nl-header-name">${safeName}:</span>
                        <span class="nl-header-val masked">••••••••</span>
                        <button type="button" class="nl-eye" title="Показать/скрыть" data-value="${safeValue}">
                            ${ICONS.eye}
                        </button>
                    </div>
                `;
            }
            return `
                <div class="nl-header-row">
                    <span class="nl-header-name">${safeName}:</span>
                    <span class="nl-header-val">${safeValue}</span>
                </div>
            `;
        }).join('');
        return `<div class="nl-headers">${rows}</div>`;
    }

    function headersToReport(pairs) {
        if (!Array.isArray(pairs) || !pairs.length) return '(нет)';
        return pairs.map(([n, v]) => isAuthorizationHeader(n) ? `${n}: •••••• (скрыто)` : `${n}: ${v}`).join('\n');
    }

    function formatReport(list) {
        const out = [];
        out.push('ОТЧЁТ О ЗАПРОСАХ');
        out.push('Дата: ' + new Date().toLocaleString('ru-RU'));
        out.push('Всего запросов: ' + list.length);
        out.push('='.repeat(80));
        for (let i = 0; i < list.length; i++) {
            const r = list[i];
            out.push(`\n### [${i + 1}] ${r.method} ${r.url}${r.mocked ? ' [MOCK]' : ''}`);
            out.push('Source: ' + (r.source || '?'));
            if (r.time) out.push('Time: ' + r.time);
            if (r.duration != null) out.push('Duration: ' + r.duration.toFixed(0) + ' ms');
            if (r.status) out.push('Status: ' + r.status);
            if (r.error) out.push('ERROR: ' + r.error);
            if (r.appliedRules && r.appliedRules.length) {
                out.push('AppliedRules:');
                r.appliedRules.forEach(a => out.push(`  - ${a.method || 'ANY'} ${a.match}${a.mocked ? ' (mock)' : ''}`));
            }
            if (r.requestHeaders && r.requestHeaders.length) {
                out.push('RequestHeaders:');
                out.push(headersToReport(r.requestHeaders));
            }
            if (r.requestBody !== null && r.requestBody !== undefined) {
                out.push('RequestBody: ' + formatBody(r.requestBody));
            }
            if (r.responseHeaders && r.responseHeaders.length) {
                out.push('ResponseHeaders:');
                out.push(headersToReport(r.responseHeaders));
            }
            if (r.response !== null && r.response !== undefined) {
                out.push('Response:');
                out.push(formatResponse(r.response));
            }
            out.push('-'.repeat(80));
        }
        return out.join('\n');
    }

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (_) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;inset:10vh 10vw;z-index:1000001;font:12px monospace;';
            document.body.appendChild(ta);
            ta.select();
            let ok = false;
            try { ok = document.execCommand('copy'); } catch (_) {}
            ta.remove();
            return ok;
        }
    }

    function getFullUrl(r) {
        try { return new URL(r.url, location.href).href; }
        catch (_) { return r.url; }
    }
    function shq(s) { return String(s).replace(/'/g, "'\\''"); }

    function buildCurl(r) {
        const parts = ['curl'];
        if (r.method && r.method.toUpperCase() !== 'GET') {
            parts.push(`-X ${r.method.toUpperCase()}`);
        }
        (r.requestHeaders || []).forEach(([n, v]) => {
            const val = isAuthorizationHeader(n) ? '$TOKEN' : v;
            parts.push(`-H '${n}: ${shq(val)}'`);
        });
        const body = r.requestBody;
        if (body !== null && body !== undefined) {
            const ct = (r.requestHeaders || []).find(([n]) => n.toLowerCase() === 'content-type');
            const ctVal = ct ? ct[1].toLowerCase() : '';
            if (typeof body === 'object' && body.__type === 'FormData') {
                if (ctVal.includes('multipart/form-data') || ctVal === '') {
                    body.entries.forEach(([k, v]) => {
                        if (typeof v === 'string' && v.startsWith('[File:')) {
                            parts.push(`-F '${k}=@/path/to/file'`);
                        } else {
                            parts.push(`-F '${k}=${shq(v)}'`);
                        }
                    });
                } else {
                    const s = body.entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
                    parts.push(`--data-raw '${shq(s)}'`);
                }
            } else if (typeof body === 'object' && body.__type === 'URLSearchParams') {
                const s = body.entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
                parts.push(`--data-raw '${shq(s)}'`);
            } else if (typeof body === 'object') {
                parts.push(`--data-raw '${shq(JSON.stringify(body))}'`);
            } else {
                parts.push(`--data-raw '${shq(String(body))}'`);
            }
        }
        parts.push(`'${getFullUrl(r)}'`);
        return parts.join(' \\\n  ');
    }

    function buildFetch(r) {
        const opts = { method: (r.method || 'GET').toUpperCase() };
        const headers = {};
        (r.requestHeaders || []).forEach(([n, v]) => {
            headers[n] = isAuthorizationHeader(n) ? '<TOKEN>' : v;
        });
        if (Object.keys(headers).length) opts.headers = headers;
        const bodyStr = bodyToString(r);
        if (bodyStr) opts.body = bodyStr;
        return `fetch(${JSON.stringify(getFullUrl(r))}, ${JSON.stringify(opts, null, 2)});`;
    }

    function buildFull(r) {
        const parts = [];
        parts.push(`${r.method} ${getFullUrl(r)}`);
        if (r.status) parts.push(`Status: ${r.status}`);
        if (r.time) parts.push(`Time: ${r.time}`);
        if (r.duration != null) parts.push(`Duration: ${r.duration.toFixed(0)} ms`);
        if (r.mocked) parts.push('MOCKED: yes');
        if (r.appliedRules && r.appliedRules.length) {
            parts.push('Applied rules:');
            r.appliedRules.forEach(a => parts.push(`  - ${a.method || 'ANY'} ${a.match}${a.mocked ? ' (mock)' : ''}`));
        }
        parts.push('');
        parts.push('Request headers:');
        (r.requestHeaders || []).forEach(([n, v]) => {
            parts.push(`  ${n}: ${isAuthorizationHeader(n) ? '•••••• (скрыто)' : v}`);
        });
        if (r.requestBody !== null && r.requestBody !== undefined) {
            parts.push('');
            parts.push('Request body:');
            parts.push(formatBody(r.requestBody));
        }
        parts.push('');
        parts.push('Response headers:');
        (r.responseHeaders || []).forEach(([n, v]) => parts.push(`  ${n}: ${v}`));
        if (r.response !== null && r.response !== undefined) {
            parts.push('');
            parts.push('Response:');
            parts.push(formatResponse(r.response));
        }
        return parts.join('\n');
    }

    function downloadReport(list) {
        const text = formatReport(list);
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (location.hostname.replace(/[^a-z0-9.-]/gi, '_') || 'site')
            + '-netlog-'
            + new Date().toISOString().replace(/[:.]/g, '-')
            + '.txt';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    function buildOverlay() {
        injectStyles();
        const overlay = document.createElement('div');
        overlay.className = 'nl-modal-overlay';
        applyTheme(overlay);
        return overlay;
    }

    function buildModal({ titleIcon, titleText, titleAccent, small }) {
        const modal = document.createElement('div');
        modal.className = 'nl-modal' + (small ? ' nl-modal--sm' : '');
        applyTheme(modal);
        const header = document.createElement('div');
        header.className = 'nl-modal-header';
        const title = document.createElement('div');
        title.className = 'nl-modal-title';
        title.innerHTML = (titleIcon ? ICONS[titleIcon] : '')
            + '<span>' + escapeHtml(titleText) + (titleAccent ? ' <em style="color:var(--nl-accent);font-style:normal;">' + escapeHtml(titleAccent) + '</em>' : '') + '</span>';
        header.appendChild(title);
        const tools = document.createElement('div');
        tools.className = 'nl-modal-tools';
        header.appendChild(tools);
        const closeBtn = document.createElement('button');
        closeBtn.className = 'nl-close';
        closeBtn.type = 'button';
        closeBtn.title = 'Закрыть (Esc)';
        closeBtn.innerHTML = ICONS.x;
        tools.appendChild(closeBtn);
        modal.appendChild(header);
        return { modal, header, tools, closeBtn };
    }

    function showToast(text, timeout) {
        const toast = document.createElement('div');
        toast.className = 'nl-toast';
        applyTheme(toast);
        toast.textContent = text;
        document.body.appendChild(toast);
        setTimeout(() => { try { toast.remove(); } catch (_) {} }, timeout || 3500);
    }

    function makeCard(title, iconName) {
        const card = document.createElement('div');
        card.className = 'nl-settings-card';
        if (title) {
            const t = document.createElement('div');
            t.className = 'nl-settings-card-title';
            t.innerHTML = (iconName ? ICONS[iconName] : '') + '<span>' + escapeHtml(title) + '</span>';
            card.appendChild(t);
        }
        return card;
    }

    function makeSwitch({ label, desc, checked, onChange }) {
        const row = document.createElement('label');
        row.className = 'nl-switch';
        const text = document.createElement('div');
        text.className = 'nl-switch-text';
        const l = document.createElement('div');
        l.className = 'nl-switch-label';
        l.textContent = label;
        text.appendChild(l);
        if (desc) {
            const d = document.createElement('div');
            d.className = 'nl-switch-desc';
            d.textContent = desc;
            text.appendChild(d);
        }
        row.appendChild(text);
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'nl-switch-input';
        input.checked = !!checked;
        input.addEventListener('change', () => onChange(input.checked));
        row.appendChild(input);
        return row;
    }

    function makeField({ label, hint }) {
        const wrap = document.createElement('div');
        wrap.className = 'nl-field-row';
        if (label) {
            const l = document.createElement('div');
            l.className = 'nl-field-label';
            l.textContent = label;
            wrap.appendChild(l);
        }
        if (hint) {
            const h = document.createElement('div');
            h.className = 'nl-field-hint';
            h.textContent = hint;
            wrap.appendChild(h);
        }
        const inline = document.createElement('div');
        inline.className = 'nl-field-inline';
        wrap.appendChild(inline);
        wrap.inline = inline;
        return wrap;
    }

    function buildSettingsHeader(root, { title, subtitle, iconName }) {
        const t = document.createElement('div');
        t.className = 'nl-settings-title';
        t.innerHTML = (iconName ? ICONS[iconName] : '') + '<span>' + escapeHtml(title) + '</span>';
        root.appendChild(t);
        if (subtitle) {
            const s = document.createElement('div');
            s.className = 'nl-settings-subtitle';
            s.textContent = subtitle;
            root.appendChild(s);
        }
    }

    function buildExclusionsPanel(root) {
        buildSettingsHeader(root, {
            title: 'Исключённые сайты',
            subtitle: 'На этих сайтах скрипт не запускается и не перехватывает запросы.',
            iconName: 'ban'
        });

        const listCard = makeCard('Список исключений', 'ban');
        const listWrap = document.createElement('div');
        listWrap.className = 'nl-excl-list';
        listCard.appendChild(listWrap);

        const addRow = document.createElement('div');
        addRow.className = 'nl-field-inline';
        const input = document.createElement('input');
        input.className = 'nl-input';
        input.type = 'text';
        input.placeholder = 'example.com или .example.com';
        addRow.appendChild(input);
        addRow.appendChild(makeButton({
            text: 'Добавить', iconName: 'plus', variant: 'primary', size: 'sm',
            onClick: () => {
                const v = input.value.trim();
                if (!v) return;
                if (!/^(\*?\.)?[a-z0-9.-]+$/i.test(v)) { showToast('Некорректный hostname: ' + v); return; }
                const list = loadExcluded();
                const normalized = v.toLowerCase();
                if (!list.includes(normalized)) {
                    list.push(normalized);
                    saveExcluded(list);
                    input.value = '';
                    renderList();
                    showToast('Добавлено: ' + normalized);
                } else {
                    showToast('Уже в списке: ' + normalized);
                }
            }
        }));
        listCard.appendChild(addRow);

        const actionsRow = document.createElement('div');
        actionsRow.className = 'nl-excl-actions';
        actionsRow.appendChild(makeButton({
            text: 'Исключить текущий сайт', iconName: 'ban', variant: 'danger', size: 'sm',
            onClick: () => {
                const host = location.hostname.toLowerCase();
                const list = loadExcluded();
                if (!list.includes(host)) {
                    list.push(host);
                    saveExcluded(list);
                    renderList();
                    showToast('Текущий сайт исключён. Перезагрузите страницу, чтобы применить.');
                } else {
                    showToast('Текущий сайт уже в исключениях: ' + host);
                }
                window.__netLogger.disabled = currentHostExcludedExact();
            }
        }));
        actionsRow.appendChild(makeButton({
            text: 'Включить обратно на этом сайте', iconName: 'power', variant: 'success', size: 'sm',
            onClick: () => {
                removeCurrentHostFromExcluded();
                renderList();
                showToast('Сайт снова активен. Перезагружаем...');
                setTimeout(() => location.reload(), 600);
            }
        }));
        listCard.appendChild(actionsRow);
        root.appendChild(listCard);

        const hintCard = makeCard('Синтаксис', 'info');
        const hint = document.createElement('div');
        hint.className = 'nl-settings-desc';
        hint.style.margin = '0';
        hint.innerHTML = '<code>example.com</code>: точный хост, '
            + '<code>.example.com</code> или <code>*.example.com</code>: все поддомены. '
            + 'Указывайте только hostname, без <code>https://</code> и без пути.';
        hintCard.appendChild(hint);
        root.appendChild(hintCard);

        function renderList() {
            const list = loadExcluded();
            listWrap.innerHTML = '';
            if (!list.length) {
                const empty = document.createElement('div');
                empty.className = 'nl-excl-empty';
                empty.textContent = 'Пока никого нет.';
                listWrap.appendChild(empty);
                return;
            }
            list.forEach(host => {
                const item = document.createElement('div');
                item.className = 'nl-excl-item';
                const text = document.createElement('span');
                text.className = 'nl-excl-host';
                text.textContent = host;
                item.appendChild(text);
                item.appendChild(makeButton({
                    text: '', iconName: 'trash', variant: 'danger', size: 'sm',
                    onClick: () => {
                        const cur = loadExcluded().filter(h => h !== host);
                        saveExcluded(cur);
                        renderList();
                        showToast('Удалено: ' + host);
                        if (host === location.hostname.toLowerCase()) {
                            window.__netLogger.disabled = currentHostExcludedExact();
                            showToast('Сайт снова активен (перезагрузка не требуется).');
                        }
                    }
                }));
                listWrap.appendChild(item);
            });
        }
        renderList();
    }

    function buildAppearancePanel(root) {
        buildSettingsHeader(root, {
            title: 'Внешний вид',
            subtitle: 'Тема и плотность интерфейса просмотрщика запросов.',
            iconName: 'palette'
        });

        const themeCard = makeCard('Тема оформления', 'eye');
        const themeOpts = document.createElement('div');
        themeOpts.className = 'nl-theme-options';
        const modes = [
            { id: 'auto', label: 'Автоматически', icon: 'settings' },
            { id: 'light', label: 'Светлый', icon: 'eye' },
            { id: 'dark', label: 'Темный', icon: 'eyeOff' }
        ];
        function renderOpts() {
            const cur = loadThemeMode();
            themeOpts.querySelectorAll('.nl-theme-option').forEach(el => {
                el.classList.toggle('active', el.dataset.mode === cur);
            });
        }
        modes.forEach(m => {
            const el = document.createElement('div');
            el.className = 'nl-theme-option';
            el.dataset.mode = m.id;
            el.innerHTML = (ICONS[m.icon] || '') + '<span class="nl-theme-option-label">' + escapeHtml(m.label) + '</span>';
            el.addEventListener('click', () => {
                saveThemeMode(m.id);
                refreshAllThemes();
                renderOpts();
                showToast('Тема: ' + m.label);
            });
            themeOpts.appendChild(el);
        });
        themeCard.appendChild(themeOpts);
        root.appendChild(themeCard);

        const layoutCard = makeCard('Отображение', 'eye');
        layoutCard.appendChild(makeSwitch({
            label: 'Компактные строки',
            desc: 'Уменьшенные отступы в списке запросов - больше влезает на экран.',
            checked: loadCompact(),
            onChange: (v) => {
                saveCompact(v);
                if (window.__netLoggerUI && window.__netLoggerUI.refresh) window.__netLoggerUI.refresh();
            }
        }));
        layoutCard.appendChild(makeSwitch({
            label: 'Показывать бейджи MOCK / RULE',
            desc: 'Зелёный MOCK - ответ синтезирован, синий RULE - сработало правило.',
            checked: loadShowBadges(),
            onChange: (v) => {
                saveShowBadges(v);
                if (window.__netLoggerUI && window.__netLoggerUI.refresh) window.__netLoggerUI.refresh();
            }
        }));
        root.appendChild(layoutCard);
    }

    function buildCapturePanel(root) {
        buildSettingsHeader(root, {
            title: 'Захват запросов',
            subtitle: 'Лимиты, поведение и формат вывода.',
            iconName: 'activity'
        });

        const limitsCard = makeCard('Лимиты', 'cpu');
        const bodyField = makeField({
            label: 'Максимальный размер тела',
            hint: 'Символов на тело запроса/ответа. От 1000 до 5000000.'
        });
        const inputBody = document.createElement('input');
        inputBody.className = 'nl-input';
        inputBody.type = 'number';
        inputBody.min = '1000';
        inputBody.max = '5000000';
        inputBody.step = '1000';
        inputBody.value = String(loadMaxBody());
        bodyField.inline.appendChild(inputBody);
        bodyField.inline.appendChild(makeButton({
            text: 'Сохранить', iconName: 'settings', variant: 'primary', size: 'sm',
            onClick: () => {
                const v = parseInt(inputBody.value, 10);
                if (!Number.isFinite(v) || v < 1000 || v > 5000000) {
                    showToast('Введите число от 1000 до 5000000');
                    return;
                }
                saveMaxBody(v);
                showToast('Сохранено: ' + v);
            }
        }));
        limitsCard.appendChild(bodyField);

        const logsField = makeField({
            label: 'Максимальное число записей',
            hint: 'Старые записи автоматически удаляются. От 10 до 100000.'
        });
        const inputLogs = document.createElement('input');
        inputLogs.className = 'nl-input';
        inputLogs.type = 'number';
        inputLogs.min = '10';
        inputLogs.max = '100000';
        inputLogs.step = '10';
        inputLogs.value = String(loadMaxLogs());
        logsField.inline.appendChild(inputLogs);
        logsField.inline.appendChild(makeButton({
            text: 'Сохранить', iconName: 'settings', variant: 'primary', size: 'sm',
            onClick: () => {
                const v = parseInt(inputLogs.value, 10);
                if (!Number.isFinite(v) || v < 10 || v > 100000) {
                    showToast('Введите число от 10 до 100000');
                    return;
                }
                saveMaxLogs(v);
                showToast('Сохранено: ' + v);
            }
        }));
        limitsCard.appendChild(logsField);

        const slowField = makeField({
            label: 'Порог медленных запросов (мс)',
            hint: 'Запросы дольше этого значения подсвечиваются красным. От 100 до 60000.'
        });
        const inputSlow = document.createElement('input');
        inputSlow.className = 'nl-input';
        inputSlow.type = 'number';
        inputSlow.min = '100';
        inputSlow.max = '60000';
        inputSlow.step = '100';
        inputSlow.value = String(loadSlowThreshold());
        slowField.inline.appendChild(inputSlow);
        slowField.inline.appendChild(makeButton({
            text: 'Сохранить', iconName: 'settings', variant: 'primary', size: 'sm',
            onClick: () => {
                const v = parseInt(inputSlow.value, 10);
                if (!Number.isFinite(v) || v < 100 || v > 60000) {
                    showToast('Введите число от 100 до 60000');
                    return;
                }
                saveSlowThreshold(v);
                showToast('Сохранено: ' + v);
            }
        }));
        limitsCard.appendChild(slowField);
        root.appendChild(limitsCard);

        const behaviorCard = makeCard('Поведение', 'activity');
        behaviorCard.appendChild(makeSwitch({
            label: 'Автоскролл к новым запросам',
            desc: 'Если список был прокручен вниз, новые записи не сбивают позицию.',
            checked: loadAutoScroll(),
            onChange: (v) => saveAutoScroll(v)
        }));
        behaviorCard.appendChild(makeSwitch({
            label: 'Дублировать в DevTools Console',
            desc: 'Каждый перехваченный запрос выводится в консоль.',
            checked: loadConsoleLogs(),
            onChange: (v) => saveConsoleLogs(v)
        }));
        behaviorCard.appendChild(makeSwitch({
            label: 'Pretty-print JSON',
            desc: 'Форматировать JSON-ответы с отступами в просмотрщике.',
            checked: loadPrettyPrint(),
            onChange: (v) => savePrettyPrint(v)
        }));
        behaviorCard.appendChild(makeSwitch({
            label: 'Debug в консоль',
            desc: 'Показывает, какие правила проверяются и почему mock не срабатывает.',
            checked: loadDebug(),
            onChange: (v) => saveDebug(v)
        }));
        root.appendChild(behaviorCard);
    }

    function buildRulesPanel(root) {
        buildSettingsHeader(root, {
            title: 'Правила подмены',
            subtitle: 'Меняют URL, заголовки, тело запроса или подменяют ответ. Работают для fetch и XHR.',
            iconName: 'zap'
        });

        const globalCard = makeCard('Глобальные', 'power');
        globalCard.appendChild(makeSwitch({
            label: 'Применять правила',
            desc: 'Если выключено, скрипт только логирует запросы.',
            checked: loadApplyRules(),
            onChange: (v) => {
                saveApplyRules(v);
                showToast(v ? 'Правила применяются' : 'Только логирование');
            }
        }));

        const ioRow = document.createElement('div');
        ioRow.className = 'nl-field-inline';
        ioRow.style.marginTop = '10px';

        ioRow.appendChild(makeButton({
            text: 'Добавить правило', iconName: 'plus', variant: 'primary', size: 'sm',
            onClick: () => {
                const list = loadRules();
                const nr = {
                    id: newRuleId(),
                    enabled: true,
                    matchType: 'substring',
                    match: '',
                    method: 'ANY',
                    newUrl: '',
                    newHeaders: '',
                    newBody: '',
                    bodyMode: 'raw',
                    mockStatus: '',
                    mockHeaders: '',
                    mockBody: ''
                };
                list.push(nr);
                saveRules(list);
                renderRules(nr.id);
            }
        }));

        ioRow.appendChild(makeButton({
            text: 'Экспорт', iconName: 'download', size: 'sm',
            onClick: () => {
                const data = JSON.stringify(loadRules(), null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'api-tools-rules-' + new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-') + '.json';
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(a.href), 1000);
                showToast('Экспортировано: ' + loadRules().length + ' правил');
            }
        }));

        ioRow.appendChild(makeButton({
            text: 'Импорт', iconName: 'upload', size: 'sm',
            onClick: () => {
                const inp = document.createElement('input');
                inp.type = 'file';
                inp.accept = '.json,application/json';
                inp.addEventListener('change', async () => {
                    const f = inp.files && inp.files[0];
                    if (!f) return;
                    try {
                        const text = await f.text();
                        const arr = JSON.parse(text);
                        if (!Array.isArray(arr)) { showToast('Файл должен содержать массив правил'); return; }
                        const merged = loadRules();
                        const existingIds = new Set(merged.map(r => r.id));
                        let added = 0;
                        arr.forEach(r => {
                            if (!r || typeof r !== 'object' || !r.match) return;
                            const nr = { ...r, id: existingIds.has(r.id) ? newRuleId() : (r.id || newRuleId()) };
                            merged.push(nr);
                            existingIds.add(nr.id);
                            added++;
                        });
                        saveRules(merged);
                        renderRules();
                        showToast('Импортировано: ' + added);
                    } catch (e) {
                        showToast('Ошибка импорта: ' + e.message);
                    }
                });
                inp.click();
            }
        }));

        globalCard.appendChild(ioRow);
        root.appendChild(globalCard);

        const listWrap = document.createElement('div');
        root.appendChild(listWrap);

        function renderRules(expandId) {
            listWrap.innerHTML = '';
            const list = loadRules();
            if (!list.length) {
                const empty = document.createElement('div');
                empty.className = 'nl-rule-empty';
                empty.textContent = 'Правил пока нет.';
                listWrap.appendChild(empty);
                return;
            }
            list.forEach(rule => {
                listWrap.appendChild(buildRuleItem(rule, expandId === rule.id,
                    () => renderRules(rule.id),
                    () => renderRules()
                ));
            });
        }

        function buildRuleItem(rule, expanded, onSave, onCancel) {
            const item = document.createElement('div');
            item.className = 'nl-rule-item' + (expanded ? ' open' : '');

            const head = document.createElement('div');
            head.className = 'nl-rule-head';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'nl-rule-enabled';
            cb.checked = !!rule.enabled;
            cb.addEventListener('click', (e) => e.stopPropagation());

            const working = {
                enabled: !!rule.enabled,
                matchType: rule.matchType || 'substring',
                match: rule.match || '',
                method: rule.method || 'ANY',
                newUrl: rule.newUrl || '',
                newHeaders: rule.newHeaders || '',
                newBody: rule.newBody || '',
                bodyMode: rule.bodyMode || 'raw',
                mockStatus: rule.mockStatus || '',
                mockHeaders: rule.mockHeaders || '',
                mockBody: rule.mockBody || ''
            };

            cb.addEventListener('change', () => {
                working.enabled = cb.checked;
                const list = loadRules();
                const r = list.find(x => x.id === rule.id);
                if (r) { r.enabled = cb.checked; saveRules(list); }
            });
            head.appendChild(cb);

            const matchEl = document.createElement('span');
            matchEl.className = 'nl-rule-match';
            const methodLabel = rule.method && rule.method !== 'ANY' ? rule.method + ' ' : '';
            const matchLabel = rule.match ? rule.match : '(пусто)';
            matchEl.textContent = methodLabel + matchLabel;
            head.appendChild(matchEl);

            const summaryParts = [];
            if (rule.newUrl) summaryParts.push('URL');
            if (rule.newHeaders) summaryParts.push('HDR');
            if (rule.newBody) summaryParts.push('BODY');
            if (rule.mockStatus) summaryParts.push('MOCK ' + rule.mockStatus);
            if (summaryParts.length) {
                const sum = document.createElement('span');
                sum.className = 'nl-rule-summary';
                sum.textContent = summaryParts.join(' · ');
                head.appendChild(sum);
            }

            const chev = document.createElement('span');
            chev.className = 'nl-rule-chev';
            chev.innerHTML = ICONS.chevronRight;
            head.appendChild(chev);

            item.appendChild(head);

            const editor = document.createElement('div');
            editor.className = 'nl-rule-editor';
            item.appendChild(editor);

            function field(label, input) {
                const wrap = document.createElement('div');
                wrap.className = 'nl-rule-field';
                const l = document.createElement('label');
                l.className = 'nl-rule-label';
                l.textContent = label;
                wrap.appendChild(l);
                wrap.appendChild(input);
                return wrap;
            }
            function inputEl(type, value, placeholder) {
                const el = document.createElement('input');
                el.className = 'nl-rule-input';
                el.type = type || 'text';
                if (value) el.value = value;
                if (placeholder) el.placeholder = placeholder;
                return el;
            }
            function textareaEl(value, placeholder) {
                const el = document.createElement('textarea');
                el.className = 'nl-rule-textarea';
                if (value) el.value = value;
                if (placeholder) el.placeholder = placeholder;
                return el;
            }
            function selectEl(options, value) {
                const el = document.createElement('select');
                el.className = 'nl-rule-select';
                options.forEach(([v, label]) => {
                    const opt = document.createElement('option');
                    opt.value = v;
                    opt.textContent = label;
                    if (v === value) opt.selected = true;
                    el.appendChild(opt);
                });
                return el;
            }

            const secMain = document.createElement('div');
            secMain.className = 'nl-rule-section';
            const secMainTitle = document.createElement('div');
            secMainTitle.className = 'nl-rule-section-title';
            secMainTitle.textContent = 'Совпадение';
            secMain.appendChild(secMainTitle);

            const mainRow1 = document.createElement('div');
            mainRow1.className = 'nl-rule-row';
            const matchTypeSel = selectEl([
                ['substring', 'substring (вхождение)'],
                ['glob', 'glob (*, ?)'],
                ['regex', 'regex']
            ], working.matchType);
            matchTypeSel.addEventListener('change', () => { working.matchType = matchTypeSel.value; });
            mainRow1.appendChild(field('Тип match', matchTypeSel));

            const methodSel = selectEl([
                ['ANY', 'ANY'], ['GET', 'GET'], ['POST', 'POST'],
                ['PUT', 'PUT'], ['PATCH', 'PATCH'], ['DELETE', 'DELETE'],
                ['HEAD', 'HEAD'], ['OPTIONS', 'OPTIONS']
            ], working.method);
            methodSel.addEventListener('change', () => { working.method = methodSel.value; });
            mainRow1.appendChild(field('Метод', methodSel));
            secMain.appendChild(mainRow1);

            const matchInput = inputEl('text', working.match, '/api/v1/users');
            matchInput.addEventListener('input', () => { working.match = matchInput.value; });
            secMain.appendChild(field('Match (URL)', matchInput));
            editor.appendChild(secMain);

            const secReq = document.createElement('div');
            secReq.className = 'nl-rule-section';
            const secReqTitle = document.createElement('div');
            secReqTitle.className = 'nl-rule-section-title';
            secReqTitle.textContent = 'Запрос (что изменить)';
            secReq.appendChild(secReqTitle);

            const urlInput = inputEl('text', working.newUrl, 'оставьте пустым, чтобы не менять');
            urlInput.addEventListener('input', () => { working.newUrl = urlInput.value; });
            secReq.appendChild(field('Новый URL', urlInput));

            const headersTa = textareaEl(working.newHeaders, 'Authorization: Bearer xxx\nX-Custom: value');
            headersTa.addEventListener('input', () => { working.newHeaders = headersTa.value; });
            secReq.appendChild(field('Новые заголовки (Name: value, по одному в строке)', headersTa));

            const bodyRow = document.createElement('div');
            bodyRow.className = 'nl-rule-row';
            const bodyModeSel = selectEl([
                ['raw', 'raw (заменить целиком)'],
                ['json-merge', 'json-merge (слить с оригиналом)']
            ], working.bodyMode);
            bodyModeSel.addEventListener('change', () => { working.bodyMode = bodyModeSel.value; });
            bodyRow.appendChild(field('Режим тела', bodyModeSel));
            secReq.appendChild(bodyRow);

            const bodyTa = textareaEl(working.newBody, '{"key":"value"} или произвольная строка');
            bodyTa.addEventListener('input', () => { working.newBody = bodyTa.value; });
            secReq.appendChild(field('Новое тело', bodyTa));
            editor.appendChild(secReq);

            const secRes = document.createElement('div');
            secRes.className = 'nl-rule-section';
            const secResTitle = document.createElement('div');
            secResTitle.className = 'nl-rule-section-title';
            secResTitle.textContent = 'Ответ (мок)';
            secRes.appendChild(secResTitle);

            const mockStatusInput = inputEl('text', working.mockStatus, 'например 200 (пусто = не мокать)');
            mockStatusInput.addEventListener('input', () => { working.mockStatus = mockStatusInput.value; });
            secRes.appendChild(field('Mock status', mockStatusInput));

            const mockHeadersTa = textareaEl(working.mockHeaders, 'Content-Type: application/json');
            mockHeadersTa.addEventListener('input', () => { working.mockHeaders = mockHeadersTa.value; });
            secRes.appendChild(field('Mock headers', mockHeadersTa));

            const mockBodyTa = textareaEl(working.mockBody, '{"ok":true}');
            mockBodyTa.addEventListener('input', () => {
                working.mockBody = mockBodyTa.value;
                updateWarn();
            });
            secRes.appendChild(field('Mock body', mockBodyTa));

            const warnEl = document.createElement('div');
            warnEl.className = 'nl-rule-warn';
            secRes.appendChild(warnEl);

            function updateWarn() {
                if (working.mockStatus && !working.mockBody) {
                    warnEl.textContent = 'Mock status задан, но Mock body пуст - вернётся пустой ответ.';
                } else {
                    warnEl.textContent = '';
                }
            }
            updateWarn();

            editor.appendChild(secRes);

            const actions = document.createElement('div');
            actions.className = 'nl-rule-actions';

            actions.appendChild(makeButton({
                text: 'Сохранить', iconName: 'check', variant: 'primary', size: 'sm',
                onClick: () => {
                    const list = loadRules();
                    const idx = list.findIndex(x => x.id === rule.id);
                    if (idx >= 0) {
                        list[idx] = { ...list[idx], ...working };
                        saveRules(list);
                        showToast('Правило сохранено');
                        onSave();
                    }
                }
            }));

            actions.appendChild(makeButton({
                text: 'Удалить', iconName: 'trash', variant: 'danger', size: 'sm',
                onClick: () => {
                    const list = loadRules().filter(x => x.id !== rule.id);
                    saveRules(list);
                    showToast('Правило удалено');
                    onCancel();
                }
            }));

            if (expanded) {
                actions.appendChild(makeButton({
                    text: 'Отмена', size: 'sm',
                    onClick: () => onCancel()
                }));
            }
            editor.appendChild(actions);

            head.addEventListener('click', (e) => {
                if (e.target === cb) return;
                const isOpen = item.classList.contains('open');
                if (isOpen) onCancel();
                else onSave();
            });

            return item;
        }

        renderRules();
    }

    function buildUpdateSection(root) {
        const card = makeCard('Обновления', 'download');

        const statusEl = document.createElement('div');
        statusEl.className = 'nl-update-status';
        statusEl.textContent = 'Проверка обновлений...';
        card.appendChild(statusEl);

        const updateBlock = document.createElement('div');
        updateBlock.className = 'nl-update-block';
        updateBlock.style.display = 'none';
        card.appendChild(updateBlock);

        const actionsEl = document.createElement('div');
        actionsEl.className = 'nl-field-inline';
        actionsEl.style.marginTop = '10px';
        const checkBtn = makeButton({
            text: 'Проверить обновления', iconName: 'download', variant: 'primary', size: 'sm',
            onClick: () => doCheck(true)
        });
        actionsEl.appendChild(checkBtn);
        card.appendChild(actionsEl);
        root.appendChild(card);

        let checking = false;

        async function doCheck(force) {
            if (checking) return;
            checking = true;
            checkBtn.disabled = true;
            statusEl.style.color = '';
            statusEl.textContent = 'Проверка обновлений...';
            updateBlock.style.display = 'none';
            updateBlock.innerHTML = '';
            try {
                const cache = loadUpdateCache();
                let release;
                let cached = false;
                if (!force && cache && cache.checkedAt && (Date.now() - cache.checkedAt < UPDATE_CACHE_TTL)) {
                    release = cache.data;
                    cached = true;
                } else {
                    release = await fetchGitHubRelease();
                    saveUpdateCache({ checkedAt: Date.now(), data: release });
                }
                renderInfo(release, cached ? cache : null);
            } catch (e) {
                statusEl.style.color = 'var(--nl-danger)';
                statusEl.textContent = 'Не удалось проверить обновления: ' + e.message;
            } finally {
                checking = false;
                checkBtn.disabled = false;
            }
        }

        function renderInfo(release, cached) {
            if (!release) {
                statusEl.textContent = 'Нет данных об обновлениях.';
                return;
            }
            const latest = String(release.tag_name || release.name || '').replace(/^v/i, '').trim();
            if (!latest) {
                statusEl.textContent = 'Не удалось определить версию в релизе.';
                return;
            }
            let cacheNote = '';
            if (cached && cached.checkedAt) {
                const ageMin = Math.floor((Date.now() - cached.checkedAt) / 60000);
                cacheNote = ageMin < 1 ? ' (только что)' : ` (${ageMin} мин назад)`;
            }

            if (isNewerVersion(latest, SCRIPT_VERSION)) {
                statusEl.style.color = 'var(--nl-danger)';
                statusEl.innerHTML = 'Установлена версия <b>' + escapeHtml(SCRIPT_VERSION) + '</b>.' + escapeHtml(cacheNote);
                renderUpdateBlock(latest, release);
            } else {
                statusEl.style.color = 'var(--nl-success)';
                statusEl.innerHTML = 'Установлена последняя версия: <b>' + escapeHtml(SCRIPT_VERSION) + '</b>.' + escapeHtml(cacheNote);
            }
        }

        function renderUpdateBlock(latest, release) {
            const desc = String(release.body || release.description || 'Без описания.').trim();
            const published = release.published_at
                ? new Date(release.published_at).toLocaleString('ru-RU')
                : '';

            let installUrl = `https://raw.githubusercontent.com/${UPDATE_REPO.user}/${UPDATE_REPO.repo}/${UPDATE_REPO.branch}/${UPDATE_REPO.scriptPath}`;
            if (Array.isArray(release.assets)) {
                const asset = release.assets.find(a => /\.user\.js$/i.test(a.name || ''));
                if (asset && asset.browser_download_url) installUrl = asset.browser_download_url;
            }

            updateBlock.innerHTML = `
                <div class="nl-update-block-title">
                    ${ICONS.zap}
                    <span>Доступно обновление: Версия ${escapeHtml(latest)}</span>
                </div>
                ${published ? `<div class="nl-update-meta">Опубликовано: ${escapeHtml(published)}</div>` : ''}
                <div class="nl-update-block-desc">${escapeHtml(desc)}</div>
                <div class="nl-update-block-actions"></div>
            `;

            const actions = updateBlock.querySelector('.nl-update-block-actions');
            actions.appendChild(makeButton({
                text: 'Обновить до ' + latest,
                iconName: 'download',
                variant: 'primary',
                size: 'sm',
                onClick: () => {
                    window.open(installUrl, '_blank', 'noopener');
                    showToast('Открыто окно установки. Подтвердите в Tampermonkey.');
                }
            }));
            actions.appendChild(makeButton({
                text: 'Скопировать ссылку',
                iconName: 'clipboard',
                size: 'sm',
                onClick: async () => {
                    const ok = await copyText(installUrl);
                    showToast(ok ? 'Ссылка скопирована' : 'Не удалось скопировать');
                }
            }));
            updateBlock.style.display = '';
        }

        doCheck(false);
    }

    function buildAboutPanel(root) {
        buildSettingsHeader(root, {
            title: 'Об инструменте',
            subtitle: 'Метаданные, обновления, горячие клавиши и сброс настроек.',
            iconName: 'info'
        });

        const infoCard = makeCard('Метаданные', 'info');
        const info = document.createElement('div');
        info.className = 'nl-about-list';
        info.innerHTML = `
            <div class="nl-about-row"><span class="nl-about-k">Название:</span><span class="nl-about-v">API Tools</span></div>
            <div class="nl-about-row"><span class="nl-about-k">Версия:</span><span class="nl-about-v">${escapeHtml(SCRIPT_VERSION)}</span></div>
            <div class="nl-about-row"><span class="nl-about-k">Автор:</span><span class="nl-about-v">Arame</span></div>
            <div class="nl-about-row"><span class="nl-about-k">Описание:</span><span class="nl-about-v">Перехват, просмотр и подмена fetch/XHR</span></div>
            <div class="nl-about-row"><span class="nl-about-k">Хранилище:</span><span class="nl-about-v">localStorage</span></div>
            <div class="nl-about-row"><span class="nl-about-k">Репозиторий:</span><span class="nl-about-v"><a href="https://github.com/${escapeHtml(UPDATE_REPO.user)}/${escapeHtml(UPDATE_REPO.repo)}" target="_blank" rel="noopener" style="color:var(--nl-accent);">${escapeHtml(UPDATE_REPO.user)}/${escapeHtml(UPDATE_REPO.repo)}</a></span></div>
        `;
        infoCard.appendChild(info);
        root.appendChild(infoCard);

        buildUpdateSection(root);

        const hotkeysCard = makeCard('Горячие клавиши', 'settings');
        const hotkeys = document.createElement('div');
        hotkeys.className = 'nl-about-list';
        hotkeys.innerHTML = `<div class="nl-about-row"><span class="nl-about-k">Esc:</span><span class="nl-about-v">Закрыть модальное окно</span></div>`;
        hotkeysCard.appendChild(hotkeys);
        root.appendChild(hotkeysCard);

        const resetCard = makeCard('Сброс', 'power');
        const resetHint = document.createElement('div');
        resetHint.className = 'nl-settings-desc';
        resetHint.style.margin = '0 0 10px';
        resetHint.textContent = 'Удаляет все сохранённые настройки, правила и исключения. Действие необратимо.';
        resetCard.appendChild(resetHint);
        resetCard.appendChild(makeButton({
            text: 'Сбросить все настройки', iconName: 'trash', variant: 'danger', size: 'sm',
            onClick: () => {
                if (!confirm('Сбросить все настройки API Tools?')) return;
                [EXCLUDE_KEY, THEME_KEY, MAXBODY_KEY, MAXLOGS_KEY, CONSOLE_KEY,
                 RULES_KEY, APPLY_KEY, COMPACT_KEY, BADGES_KEY, AUTOSCROLL_KEY,
                 PRETTY_KEY, SLOW_KEY, DEBUG_KEY, UPDATE_CACHE_KEY].forEach(k => {
                    try { localStorage.removeItem(k); } catch (_) {}
                });
                _rulesCache = null;
                location.reload();
            }
        }));
        root.appendChild(resetCard);
    }

    function createSettings() {
        let overlay = null;
        let onCloseCb = null;

        function open(opts) {
            if (overlay) return;
            opts = opts || {};
            onCloseCb = opts.onClose || null;
            overlay = buildOverlay();
            const built = buildModal({ titleIcon: 'settings', titleText: 'Настройки' });
            const { modal, closeBtn } = built;
            closeBtn.addEventListener('click', close);
            const wrap = document.createElement('div');
            wrap.className = 'nl-settings-wrap';
            const tabs = document.createElement('div');
            tabs.className = 'nl-settings-tabs';
            wrap.appendChild(tabs);
            const panels = document.createElement('div');
            panels.className = 'nl-settings-panels';
            wrap.appendChild(panels);
            modal.appendChild(wrap);

            let activeId = null;

            const tabsList = [
                { id: 'rules', label: 'Правила', icon: 'zap', build: (r) => buildRulesPanel(r) },
                { id: 'exclusions', label: 'Исключения', icon: 'ban', build: (r) => buildExclusionsPanel(r) },
                { id: 'appearance', label: 'Внешний вид', icon: 'palette', build: (r) => buildAppearancePanel(r) },
                { id: 'capture', label: 'Захват', icon: 'activity', build: (r) => buildCapturePanel(r) },
                { id: 'about', label: 'Об инструменте', icon: 'info', build: (r) => buildAboutPanel(r) }
            ];

            function selectTab(id) {
                activeId = id;
                tabs.querySelectorAll('.nl-settings-tab').forEach(el => {
                    el.classList.toggle('active', el.dataset.id === id);
                });
                panels.innerHTML = '';
                const tab = tabsList.find(t => t.id === id);
                if (tab) tab.build(panels);
            }

            tabsList.forEach(t => {
                const tab = document.createElement('div');
                tab.className = 'nl-settings-tab';
                tab.dataset.id = t.id;
                tab.innerHTML = (ICONS[t.icon] || '') + '<span>' + escapeHtml(t.label) + '</span>';
                tab.addEventListener('click', () => selectTab(t.id));
                tabs.appendChild(tab);
            });

            const footer = document.createElement('div');
            footer.className = 'nl-modal-header';
            footer.style.borderTop = '1px solid var(--nl-border)';
            footer.style.borderBottom = 'none';
            const footerTools = document.createElement('div');
            footerTools.className = 'nl-modal-tools';
            footerTools.style.marginLeft = 'auto';
            footerTools.appendChild(makeButton({
                text: 'Готово', iconName: 'check',
                onClick: () => close()
            }));
            footer.appendChild(footerTools);
            modal.appendChild(footer);
            overlay.appendChild(modal);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close();
            });
            document.addEventListener('keydown', onKey);
            document.body.appendChild(overlay);
            selectTab('rules');
        }

        function onKey(e) {
            if (e.key === 'Escape') close();
        }

        function close() {
            if (!overlay) return;
            document.removeEventListener('keydown', onKey);
            overlay.remove();
            overlay = null;
            if (typeof onCloseCb === 'function') {
                try { onCloseCb(); } catch (_) {}
            }
            onCloseCb = null;
        }

        return { open, close, isOpen: () => !!overlay };
    }

    function createViewer() {
        let overlay = null;
        let searchInput = null;
        let body = null;
        let currentFilter = '';
        const openRows = new Set();
        const revealedAuth = new Set();

        function render() {
            if (!body) return;
            const prevScrollTop = body.scrollTop;
            const wasAtBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 50;

            const q = currentFilter.trim().toLowerCase();
            const filtered = q
                ? logs.filter(r => {
                    const hay = [
                        r.url, r.method, r.status,
                        formatResponse(r.response),
                        formatBody(r.requestBody),
                        (r.requestHeaders || []).map(([n, v]) => n + ':' + v).join('\n'),
                        (r.responseHeaders || []).map(([n, v]) => n + ':' + v).join('\n'),
                        (r.appliedRules || []).map(a => a.match).join('\n')
                    ].join('\n').toLowerCase();
                    return hay.includes(q);
                })
                : logs;

            if (!filtered.length) {
                body.innerHTML = `<div class="nl-empty">${
                    logs.length ? 'Ничего не найдено по фильтру.' : 'Пока пусто. Сделайте действия на странице.'
                }</div>`;
                return;
            }

            const compact = loadCompact();
            const showBadges = loadShowBadges();
            const slowMs = loadSlowThreshold();

            const html = filtered.map((r) => {
                const key = getRowKey(r);
                const isOpen = openRows.has(key);
                const idxDisplay = logs.indexOf(r) + 1;
                const idxParam = idxDisplay - 1;
                const statusClass = r.status >= 400 || r.error ? 'err' : (r.status ? 'ok' : '');
                const statusText = r.error ? 'ERR' : (r.status || '-');
                const isSlow = r.duration != null && r.duration > slowMs;

                const applyReveal = (pairs) => {
                    if (!Array.isArray(pairs)) return pairs;
                    return pairs.map(([n, v]) => {
                        if (isAuthorizationHeader(n) && revealedAuth.has(key + '::' + n + '::' + v)) {
                            return [n, v, 'revealed'];
                        }
                        return [n, v];
                    });
                };

                const reqHeadersHtml = renderHeaders(applyReveal(r.requestHeaders), 'нет заголовков запроса');
                const resHeadersHtml = renderHeaders(applyReveal(r.responseHeaders), 'нет заголовков ответа');
                const hasBody = r.requestBody !== null && r.requestBody !== undefined;
                const hasRules = r.appliedRules && r.appliedRules.length;

                const badges = [];
                if (showBadges) {
                    if (r.mocked) badges.push('<span class="nl-badge-mock">MOCK</span>');
                    if (hasRules) badges.push('<span class="nl-badge-rule">RULE</span>');
                }

                const timeText = r.time
                    ? escapeHtml(new Date(r.time).toLocaleTimeString('ru-RU'))
                    + (r.duration != null ? ' · ' + r.duration.toFixed(0) + ' ms' : '')
                    : (r.duration != null ? r.duration.toFixed(0) + ' ms' : '');

                const toolbar = `
                    <div class="nl-row-toolbar">
                        <button type="button" class="nl-copy-btn" data-copy="url" data-idx="${idxParam}">${ICONS.clipboard}<span>URL</span></button>
                        ${hasBody ? `<button type="button" class="nl-copy-btn" data-copy="body" data-idx="${idxParam}">${ICONS.clipboard}<span>Body</span></button>` : ''}
                        <button type="button" class="nl-copy-btn" data-copy="curl" data-idx="${idxParam}">${ICONS.clipboard}<span>cURL</span></button>
                        <button type="button" class="nl-copy-btn" data-copy="fetch" data-idx="${idxParam}">${ICONS.clipboard}<span>fetch</span></button>
                        <button type="button" class="nl-copy-btn" data-copy="headers" data-idx="${idxParam}">${ICONS.clipboard}<span>Headers</span></button>
                        <button type="button" class="nl-copy-btn" data-copy="all" data-idx="${idxParam}">${ICONS.clipboard}<span>Full</span></button>
                    </div>
                `;

                const details = [];
                details.push(toolbar);
                details.push(`<div class="nl-kv"><div class="nl-k">URL</div><div class="nl-v">${escapeHtml(r.url || '')}</div></div>`);
                if (r.time) details.push(`<div class="nl-kv"><div class="nl-k">Time</div><div class="nl-v">${escapeHtml(r.time)}${r.duration != null ? ' (' + r.duration.toFixed(0) + ' ms)' : ''}</div></div>`);
                if (r.error) details.push(`<div class="nl-kv"><div class="nl-k">Error</div><div class="nl-v">${escapeHtml(r.error)}</div></div>`);
                if (hasRules) {
                    const ruleList = r.appliedRules.map(a => `${escapeHtml(a.method || 'ANY')} ${escapeHtml(a.match || '?')}${a.mocked ? ' (mock)' : ''}`).join('\n');
                    details.push(`<div class="nl-kv"><div class="nl-k">Applied rules</div><div class="nl-v">${ruleList}</div></div>`);
                }
                details.push(`<div class="nl-kv"><div class="nl-k">Request headers</div>${reqHeadersHtml}</div>`);
                if (hasBody) details.push(`<div class="nl-kv"><div class="nl-k">Request body</div><div class="nl-v">${formatBodyHtml(r.requestBody)}</div></div>`);
                details.push(`<div class="nl-kv"><div class="nl-k">Response headers</div>${resHeadersHtml}</div>`);
                if (r.response !== null && r.response !== undefined) {
                    details.push(`<div class="nl-kv"><div class="nl-k">Response body</div><div class="nl-v">${formatResponseHtml(r.response)}</div></div>`);
                }

                return `
                    <div class="nl-row${isOpen ? ' open' : ''}" data-key="${key}" data-idx="${idxParam}">
                        <div class="nl-row-head">
                            <span class="nl-method" data-m="${escapeHtml(r.method || 'GET')}">${escapeHtml(r.method || 'GET')}</span>
                            <span class="nl-status ${statusClass}">${escapeHtml(String(statusText))}</span>
                            ${badges.join('')}
                            <span class="nl-url" title="${escapeHtml(r.url || '')}">${escapeHtml(r.url || '')}</span>
                            <span class="nl-src">${escapeHtml(r.source || '?')}</span>
                            <span class="nl-badge-time${isSlow ? ' slow' : ''}">${timeText}</span>
                            <span class="nl-chev">${ICONS.chevronRight}</span>
                        </div>
                        <div class="nl-row-details">
                            ${details.join('')}
                        </div>
                    </div>
                `;
            }).join('');

            body.innerHTML = html;
            if (compact) body.classList.add('nl-compact');
            else body.classList.remove('nl-compact');
            hydrateAuthEyes(body);

            if (loadAutoScroll() && wasAtBottom) {
                body.scrollTop = body.scrollHeight;
            } else {
                body.scrollTop = prevScrollTop;
            }
        }

        function hydrateAuthEyes(root) {
            if (!root) return;
            root.querySelectorAll('.nl-header-auth .nl-eye').forEach(btn => {
                if (btn.dataset.hydrated === '1') return;
                btn.dataset.hydrated = '1';
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const row = btn.closest('.nl-header-auth');
                    if (!row) return;
                    const outer = btn.closest('.nl-row');
                    const key = outer ? outer.dataset.key : null;
                    const valEl = row.querySelector('.nl-header-val');
                    const headerNameEl = row.querySelector('.nl-header-name');
                    const headerName = headerNameEl ? headerNameEl.textContent.replace(/:$/, '') : '';
                    const original = btn.dataset.value || '';
                    const revealed = row.dataset.revealed === '1';
                    if (revealed) {
                        valEl.textContent = '••••••••';
                        valEl.classList.add('masked');
                        row.dataset.revealed = '0';
                        btn.innerHTML = ICONS.eye;
                        if (key) revealedAuth.delete(key + '::' + headerName + '::' + original);
                    } else {
                        valEl.textContent = original;
                        valEl.classList.remove('masked');
                        row.dataset.revealed = '1';
                        btn.innerHTML = ICONS.eyeOff;
                        if (key) revealedAuth.add(key + '::' + headerName + '::' + original);
                    }
                });
            });
        }

        async function handleCopyClick(btn) {
            const idx = parseInt(btn.dataset.idx, 10);
            const r = logs[idx];
            if (!r) { showToast('Запись не найдена'); return; }
            const action = btn.dataset.copy;
            let text = '';
            try {
                if (action === 'url') text = getFullUrl(r);
                else if (action === 'body') text = bodyToString(r);
                else if (action === 'curl') text = buildCurl(r);
                else if (action === 'fetch') text = buildFetch(r);
                else if (action === 'headers') text = headersToReport(r.requestHeaders);
                else if (action === 'all') text = buildFull(r);
            } catch (err) {
                text = 'Error: ' + err.message;
            }
            if (!text) { showToast('Нечего копировать'); return; }
            const ok = await copyText(text);
            if (ok) {
                const orig = btn.innerHTML;
                btn.classList.add('copied');
                btn.innerHTML = ICONS.check + '<span>OK</span>';
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.innerHTML = orig;
                }, 1200);
            } else {
                showToast('Не удалось скопировать');
            }
        }

        function open() {
            if (overlay) return;
            injectStyles();
            overlay = buildOverlay();
            const built = buildModal({
                titleIcon: 'globe',
                titleText: 'API Tools',
                titleAccent: '- запросы'
            });
            const { modal, tools, closeBtn } = built;
            closeBtn.addEventListener('click', close);

            searchInput = document.createElement('input');
            searchInput.className = 'nl-input nl-input--search';
            searchInput.type = 'search';
            searchInput.placeholder = 'Поиск по URL / методу / заголовкам / телу / ответу...';
            searchInput.value = currentFilter;
            searchInput.addEventListener('input', () => {
                currentFilter = searchInput.value;
                render();
            });
            tools.appendChild(searchInput);
            tools.appendChild(makeButton({
                text: 'Скачать', iconName: 'download', variant: 'primary',
                onClick: () => {
                    if (!logs.length) { alert('Пока пусто.'); return; }
                    downloadReport(logs);
                }
            }));
            tools.appendChild(makeButton({
                text: 'Копировать', iconName: 'clipboard', variant: 'success',
                onClick: async () => {
                    if (!logs.length) { alert('Пока пусто.'); return; }
                    const ok = await copyText(formatReport(logs));
                    alert(ok ? ('Скопировано (' + logs.length + ' запросов).') : 'Не удалось скопировать автоматически.');
                }
            }));
            tools.appendChild(makeButton({
                text: 'Очистить', iconName: 'trash', variant: 'danger',
                onClick: () => {
                    logs.length = 0;
                    openRows.clear();
                    revealedAuth.clear();
                    render();
                }
            }));

            body = document.createElement('div');
            body.className = 'nl-modal-body';
            body.addEventListener('click', async (e) => {
                if (e.target.closest('.nl-eye')) return;
                const copyBtn = e.target.closest('.nl-copy-btn');
                if (copyBtn) {
                    e.stopPropagation();
                    await handleCopyClick(copyBtn);
                    return;
                }
                const head = e.target.closest('.nl-row-head');
                if (!head) return;
                const row = head.parentElement;
                const key = row.dataset.key;
                if (!key) return;
                if (openRows.has(key)) {
                    openRows.delete(key);
                    row.classList.remove('open');
                } else {
                    openRows.add(key);
                    row.classList.add('open');
                }
            });
            modal.appendChild(body);
            overlay.appendChild(modal);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close();
            });
            document.addEventListener('keydown', onKey);
            document.body.appendChild(overlay);
            render();
            setTimeout(() => searchInput && searchInput.focus(), 30);
        }

        function onKey(e) {
            if (e.key === 'Escape') close();
        }

        function close() {
            if (!overlay) return;
            document.removeEventListener('keydown', onKey);
            overlay.remove();
            overlay = null;
            body = null;
            searchInput = null;
        }

        return { open, close, refresh: render, isOpen: () => !!overlay };
    }

    function createUI() {
        injectStyles();
        const box = document.createElement('div');
        box.id = '__netLoggerUI';
        applyTheme(box);
        const actions = document.createElement('div');
        actions.className = 'nl-actions';
        const viewer = createViewer();
        window.__netLoggerUI = viewer;
        const settings = createSettings();
        window.__netLoggerSettings = settings;

        actions.appendChild(makeButton({
            text: 'Просмотр', iconName: 'eye', variant: 'primary',
            onClick: () => viewer.open()
        }));
        actions.appendChild(makeButton({
            text: 'Скачать', iconName: 'download',
            onClick: () => {
                if (!logs.length) { alert('Пока пусто. Сделайте действия на странице.'); return; }
                downloadReport(logs);
            }
        }));
        actions.appendChild(makeButton({
            text: 'Копировать', iconName: 'clipboard', variant: 'success',
            onClick: async () => {
                if (!logs.length) { alert('Пока пусто.'); return; }
                const ok = await copyText(formatReport(logs));
                alert(ok ? ('Скопировано в буфер (' + logs.length + ' запросов).') : 'Не удалось скопировать автоматически.');
            }
        }));
        actions.appendChild(makeButton({
            text: 'Настройки', iconName: 'settings',
            onClick: () => settings.open()
        }));
        actions.appendChild(makeButton({
            text: 'Очистить', iconName: 'trash', variant: 'danger',
            onClick: () => { logs.length = 0; }
        }));
        box.appendChild(actions);

        const fab = document.createElement('button');
        fab.type = 'button';
        fab.className = 'nl-fab';
        fab.dataset.open = '0';
        fab.title = 'API Tools - открыть/закрыть панель';
        const fabIcon = document.createElement('span');
        fabIcon.className = 'nl-fab-icon';
        fabIcon.innerHTML = ICONS.activity;
        fab.appendChild(fabIcon);
        const fabCount = document.createElement('span');
        fabCount.className = 'nl-fab-count';
        fabCount.textContent = String(logs.length);
        fab.appendChild(fabCount);
        const fabChev = document.createElement('span');
        fabChev.className = 'nl-fab-chev';
        fabChev.innerHTML = ICONS.chevronDown;
        fab.appendChild(fabChev);
        box.appendChild(fab);

        let open = false;
        function setOpen(v) {
            open = v;
            fab.dataset.open = v ? '1' : '0';
            actions.classList.toggle('nl-open', v);
            const chev = fab.querySelector('.nl-fab-chev');
            if (chev) chev.style.transform = v ? 'rotate(180deg)' : '';
        }
        fab.addEventListener('click', (e) => {
            e.stopPropagation();
            setOpen(!open);
        });
        document.addEventListener('click', (e) => {
            if (!box.contains(e.target)) setOpen(false);
        });
        const refreshCounter = () => { fabCount.textContent = String(logs.length); };
        setInterval(refreshCounter, 500);
        refreshCounter();
        window.__netLoggerBar = { refresh: refreshCounter };
        document.body.appendChild(box);

        const onThemeChange = () => refreshAllThemes();
        if (media.addEventListener) media.addEventListener('change', onThemeChange);
        else if (media.addListener) media.addListener(onThemeChange);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createUI, { once: true });
    } else {
        createUI();
    }

    console.log('%cAPI Tools: установлен', 'color:green;font-weight:bold;font-size:14px');
})();
