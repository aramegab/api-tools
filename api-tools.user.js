// ==UserScript==
// @name         API Tools
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  API Tools - Логирование fetch/XHR, WebSocket, EventSource и sendBeacon: тела, размеры, время, query, инициаторы, правила подмены и mock-ответы.
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
    const IGNORE_RULES_KEY = '__netLogger.ignoreRules';
    const APPLY_KEY = '__netLogger.applyRules';
    const COMPACT_KEY = '__netLogger.compact';
    const BADGES_KEY = '__netLogger.showBadges';
    const AUTOSCROLL_KEY = '__netLogger.autoScroll';
    const PRETTY_KEY = '__netLogger.prettyPrint';
    const SLOW_KEY = '__netLogger.slowThreshold';
    const DEBUG_KEY = '__netLogger.debug';
    const AUTO_OPEN_KEY = '__netLogger.autoOpen';
    const SHOW_ERRORS_KEY = '__netLogger.showErrorsOnly';
    const FAB_POSITION_KEY = '__netLogger.fabPosition';
    const LOG_LIMIT_ENABLED_KEY = '__netLogger.logLimitEnabled';
    const LOG_PERSISTENCE_KEY = '__netLogger.logPersistence';
    const LOG_PERSISTENCE_MB_KEY = '__netLogger.logPersistenceMb';
    const LOG_MAX_AGE_ENABLED_KEY = '__netLogger.logMaxAgeEnabled';
    const LOG_MAX_AGE_MINUTES_KEY = '__netLogger.logMaxAgeMinutes';
    const LOG_MAX_SIZE_ENABLED_KEY = '__netLogger.logMaxSizeEnabled';
    const LOG_MAX_SIZE_MB_KEY = '__netLogger.logMaxSizeMb';
    const LOG_IO_ENABLED_KEY = '__netLogger.logIoEnabled';
    const LOG_IMPORT_MAX_MB_KEY = '__netLogger.logImportMaxMb';
    const SESSION_LOGS_KEY = '__netLogger.sessionLogs';

    const SCRIPT_VERSION = '1.0.2';

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
        return saveLogConfig(MAXLOGS_KEY, n);
    }
    function loadConfiguredNum(key, fallback, min, max) {
        try {
            const value = Number(localStorage.getItem(key));
            return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
        } catch (_) { return fallback; }
    }
    function loadConfiguredNumInput(key, min, max) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null || raw.trim() === '') return '';
            const value = Number(raw);
            return Number.isFinite(value) && value >= min && value <= max ? String(value) : '';
        } catch (_) { return ''; }
    }
    function saveLogConfig(key, value) {
        try {
            localStorage.setItem(key, String(value));
            return true;
        } catch (error) {
            console.warn('[API Tools] Не удалось сохранить настройку логов:', error);
            if (document.body) showToast('Не удалось сохранить настройку: ' + String(error));
            return false;
        }
    }
    function clearPersistedLogs() {
        try {
            sessionStorage.removeItem(SESSION_LOGS_KEY);
            return true;
        } catch (error) {
            console.warn('[API Tools] Не удалось удалить сохранённые логи:', error);
            if (document.body) showToast('Не удалось удалить сохранённые логи: ' + String(error));
            return false;
        }
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
    function loadAutoOpenViewer() { return loadBool(AUTO_OPEN_KEY, false); }
    function saveAutoOpenViewer(v) { saveBool(AUTO_OPEN_KEY, v); }
    function loadShowErrorsOnly() { return loadBool(SHOW_ERRORS_KEY, false); }
    function saveShowErrorsOnly(v) { saveBool(SHOW_ERRORS_KEY, v); }
    function loadFabPosition() {
        try {
            const value = localStorage.getItem(FAB_POSITION_KEY);
            return ['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(value) ? value : 'bottom-right';
        } catch (_) { return 'bottom-right'; }
    }
    function saveFabPosition(value) {
        try { localStorage.setItem(FAB_POSITION_KEY, value); } catch (_) {}
    }

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
    function loadIgnoreRules() {
        try {
            const raw = localStorage.getItem(IGNORE_RULES_KEY);
            const rules = raw ? JSON.parse(raw) : [];
            return Array.isArray(rules) ? rules : [];
        } catch (error) {
            console.warn('[API Tools] Не удалось загрузить правила игнорирования:', error);
            return [];
        }
    }
    function saveIgnoreRules(rules) {
        try {
            localStorage.setItem(IGNORE_RULES_KEY, JSON.stringify(rules));
            return true;
        } catch (error) {
            console.warn('[API Tools] Не удалось сохранить правила игнорирования:', error);
            showToast('Не удалось сохранить правило: ' + String(error));
            return false;
        }
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
    function matchesPattern(value, pattern, matchType) {
        if (matchType === 'regex') {
            try { return new RegExp(pattern).test(value); } catch (_) { return false; }
        }
        if (matchType === 'glob') {
            try {
                const re = new RegExp('^' + pattern
                    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
                    .replace(/\*/g, '.*')
                    .replace(/\?/g, '.') + '$');
                return re.test(value);
            } catch (_) { return false; }
        }
        return value.indexOf(pattern) !== -1;
    }
    function ruleMatches(rule, url, method) {
        if (!rule || !rule.enabled) return false;
        if (rule.method && rule.method !== 'ANY' && rule.method !== method) return false;
        const pattern = rule.match || '';
        if (!pattern) return false;
        return matchesPattern(url, pattern, rule.matchType);
    }
    function ignoreRuleMatches(rule, entry) {
        if (!rule || !rule.enabled) return false;
        const urlPattern = String(rule.urlPattern || '').trim();
        const method = String(rule.method || '').trim().toUpperCase();
        const hostPattern = String(rule.host || '').trim().toLowerCase();
        if (!urlPattern && (!method || method === 'ANY') && !hostPattern) return false;
        if (urlPattern && !matchesPattern(String(entry.url || ''), urlPattern, rule.urlMatchType)) return false;
        if (method && method !== 'ANY' && method !== String(entry.method || '').trim().toUpperCase()) return false;
        if (hostPattern) {
            let hostname = '';
            try { hostname = new URL(String(entry.url || ''), location.href).hostname.toLowerCase(); } catch (_) {}
            const wildcard = hostPattern.startsWith('*.');
            const expected = wildcard ? hostPattern.slice(2) : hostPattern;
            if (!hostname || (wildcard
                ? hostname !== expected && !hostname.endsWith('.' + expected)
                : hostname !== expected)) return false;
        }
        return true;
    }
    function shouldIgnoreLog(entry) {
        return loadIgnoreRules().some(rule => ignoreRuleMatches(rule, entry));
    }
    function addIgnoreEndpointRule(entry) {
        let urlPattern = String(entry.url || '');
        try {
            const url = new URL(urlPattern, location.href);
            urlPattern = url.origin + url.pathname;
        } catch (_) {}
        if (!urlPattern) {
            showToast('У записи нет URL');
            return;
        }
        const method = String(entry.method || 'ANY').trim().toUpperCase() || 'ANY';
        const rules = loadIgnoreRules();
        const existing = rules.find(rule => rule.urlPattern === urlPattern
            && (rule.urlMatchType || 'substring') === 'substring'
            && String(rule.method || 'ANY').toUpperCase() === method
            && !rule.host);
        if (existing) {
            if (!existing.enabled) {
                existing.enabled = true;
                if (!saveIgnoreRules(rules)) return;
            }
            showToast('Правило уже есть: будущие ' + method + ' для этого endpoint не будут логироваться');
            return;
        }
        rules.push({
            id: newRuleId(),
            enabled: true,
            urlPattern,
            urlMatchType: 'substring',
            method,
            host: ''
        });
        if (saveIgnoreRules(rules)) {
            showToast('Будущие запросы ' + method + ' к endpoint исключены из логов');
        }
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
            if (rule.replaceHeaders === true || rule.newHeaders) {
                const parsed = parseHeaderLines(rule.newHeaders);
                const map = new Map((rule.replaceHeaders === true ? [] : headers).map(([n, v]) => [n.toLowerCase(), [n, v]]));
                parsed.forEach(([n, v]) => map.set(n.toLowerCase(), [n, v]));
                headers = [...map.values()];
            }
            if (rule.clearBody === true || (rule.newBody !== '' && rule.newBody !== undefined && rule.newBody !== null)) {
                if (rule.clearBody === true) {
                    body = '';
                } else if (rule.bodyMode === 'json-merge' && hasBody) {
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
            #__netLoggerUI[data-position="bottom-left"],
            #__netLoggerUI[data-position="top-left"] {
                right: auto; left: 16px; align-items: flex-start;
            }
            #__netLoggerUI[data-position="top-right"],
            #__netLoggerUI[data-position="top-left"] {
                top: 16px; bottom: auto; flex-direction: column-reverse;
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
            #__netLoggerUI[data-position="bottom-left"] .nl-actions { transform-origin: bottom left; }
            #__netLoggerUI[data-position="top-right"] .nl-actions {
                transform: translateY(-6px) scale(.96); transform-origin: top right;
            }
            #__netLoggerUI[data-position="top-left"] .nl-actions {
                transform: translateY(-6px) scale(.96); transform-origin: top left;
            }
            .nl-actions.nl-open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
            #__netLoggerUI[data-position="top-right"] .nl-actions.nl-open,
            #__netLoggerUI[data-position="top-left"] .nl-actions.nl-open {
                transform: translateY(0) scale(1);
            }
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
            .nl-btn:disabled { opacity: .5; cursor: not-allowed; }
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
                position: relative; display: flex; align-items: center; gap: 12px;
                padding: 12px 16px; border-bottom: 1px solid var(--nl-border);
                background: var(--nl-bg2);
            }
            .nl-modal-title { font-weight: 700; font-size: 14px; display: inline-flex; align-items: center; gap: 8px; }
            .nl-modal-title span { color: var(--nl-accent); font-weight: 600; }
            .nl-modal-tools { margin-left: auto; padding-right: 40px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
            .nl-input {
                background: var(--nl-bg); border: 1px solid var(--nl-border);
                color: var(--nl-text); padding: 8px 10px; border-radius: 8px;
                font: inherit; outline: none; transition: border-color .15s ease;
            }
            .nl-input:focus { border-color: var(--nl-accent); }
            .nl-input--search {
                padding: 8px 10px 8px 32px; min-width: 180px; max-width: 340px; flex: 1 1 220px;
                background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239aa0a6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='11' cy='11' r='8'/><path d='m21 21-4.3-4.3'/></svg>");
                background-repeat: no-repeat; background-position: 10px center;
            }
            .nl-search-wrap { display: flex; align-items: center; gap: 6px; flex: 1 1 260px; min-width: 220px; }
            .nl-search-wrap .nl-input--search { min-width: 0; width: 100%; }
            .nl-search-regex { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; color: var(--nl-text-dim); font-size: 11px; }
            .nl-search-regex input, .nl-viewer-slow input { accent-color: var(--nl-accent); }
            .nl-viewer-filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 16px; border-bottom: 1px solid var(--nl-border); }
            .nl-filter-select { min-width: 115px; padding: 6px 8px; font-size: 12px; }
            .nl-viewer-slow { display: inline-flex; align-items: center; gap: 5px; color: var(--nl-text-dim); font-size: 12px; white-space: nowrap; }
            .nl-search-error { flex: 1 0 100%; min-height: 0; color: var(--nl-danger); font-size: 12px; }
            .nl-search-error:empty { display: none; }
            .nl-search-match { color: inherit; background: rgba(255,214,10,.4); border-radius: 2px; padding: 0 1px; }
            .nl-close {
                position: absolute; top: 12px; right: 16px; z-index: 1;
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
            .nl-position-preview {
                position: relative; width: min(100%, 340px); height: 180px;
                border: 1px solid var(--nl-border); border-radius: 12px;
                overflow: hidden; background: var(--nl-bg);
                box-shadow: inset 0 0 0 1px rgba(0,0,0,.03);
            }
            .nl-position-preview-bar {
                height: 20px; border-bottom: 1px solid var(--nl-border);
                background: var(--nl-bg2); display: flex; align-items: center;
                gap: 4px; padding: 0 8px;
            }
            .nl-position-preview-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--nl-border); }
            .nl-position-preview-line {
                position: absolute; left: 14px; right: 14px; height: 6px;
                border-radius: 4px; background: var(--nl-bg3);
            }
            .nl-position-preview-line:nth-of-type(2) { top: 42px; right: 30%; }
            .nl-position-preview-line:nth-of-type(3) { top: 60px; right: 14px; }
            .nl-position-preview-line:nth-of-type(4) { top: 78px; right: 22%; }
            .nl-position-option {
                position: absolute; z-index: 1; width: 30px; height: 30px;
                display: inline-flex; align-items: center; justify-content: center;
                padding: 0; border: 1px solid var(--nl-panel-border);
                border-radius: 999px; background: var(--nl-panel); color: var(--nl-accent);
                box-shadow: var(--nl-panel-shadow); cursor: pointer;
                transition: transform .12s ease, border-color .12s ease, background .12s ease;
            }
            .nl-position-option:hover { transform: scale(1.12); border-color: var(--nl-accent); }
            .nl-position-option.active { background: var(--nl-accent); border-color: var(--nl-accent); color: #fff; }
            .nl-position-option .nl-ico { width: 16px; height: 16px; }
            .nl-position-option[data-position="top-left"] { top: 7px; left: 7px; }
            .nl-position-option[data-position="top-right"] { top: 7px; right: 7px; }
            .nl-position-option[data-position="bottom-left"] { bottom: 7px; left: 7px; }
            .nl-position-option[data-position="bottom-right"] { bottom: 7px; right: 7px; }

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
            .nl-row:hover, .nl-row.compare-selected { border-color: var(--nl-accent); }
            .nl-pin-btn {
                flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
                width: 24px; height: 24px; padding: 2px; border: 0; border-radius: 5px;
                color: var(--nl-text-dim); background: transparent; cursor: pointer;
            }
            .nl-pin-btn:hover, .nl-pin-btn.pinned { color: var(--nl-accent); }
            .nl-pin-btn .nl-ico { width: 17px; height: 17px; }
            .nl-compare-select { flex: 0 0 auto; width: 15px; height: 15px; margin: 0; accent-color: var(--nl-accent); cursor: pointer; }
            .nl-group-heading, .nl-pinned-heading {
                margin: 12px 0 7px; color: var(--nl-text-dim); font-size: 12px; font-weight: 700;
            }
            .nl-pinned-heading { color: var(--nl-accent); }
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
            .nl-content-type {
                display: inline-flex; align-items: center; gap: 4px;
                color: var(--nl-text-dim); font-size: 10px;
                padding: 2px 6px; border: 1px solid var(--nl-border); border-radius: 6px;
            }
            .nl-content-type .nl-ico { width: 12px; height: 12px; }
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
            .nl-copy-btn:disabled { opacity: .5; cursor: not-allowed; }
            .nl-copy-btn .nl-ico { width: 12px; height: 12px; }
            .nl-diff-section { margin-bottom: 14px; }
            .nl-diff-title { color: var(--nl-text-dim); font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
            .nl-diff-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
            .nl-diff-side { min-width: 0; padding: 8px; border: 1px solid var(--nl-border); border-radius: 7px; background: var(--nl-bg2); }
            .nl-diff-side.changed { border-color: var(--nl-danger); background: rgba(255,80,80,.12); }
            .nl-diff-side pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
            .nl-diff-table { width: 100%; border-collapse: collapse; font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
            .nl-diff-table th, .nl-diff-table td { padding: 6px; border: 1px solid var(--nl-border); text-align: left; vertical-align: top; overflow-wrap: anywhere; }
            .nl-diff-table tr.changed td { background: rgba(255,80,80,.12); }
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
            .nl-header-sensitive .nl-header-val.masked { color: var(--nl-text-dim); letter-spacing: 1px; }
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
                .nl-diff-grid { grid-template-columns: minmax(0, 1fr); }
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
        pause: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
        play: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
        edit: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>`,
        star: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>`,
        starFilled: `<svg class="nl-ico" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>`,
        code: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/><path d="m14 4-4 16"/></svg>`,
        image: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
        fileText: `<svg class="nl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/></svg>`,
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

    window.__netLogger = { logs: [], disabled: false, paused: false };
    const logs = window.__netLogger.logs;
    const pinnedLogs = new Set();
    let persistTimer = null;
    let storageErrorShown = false;
    let storageWarningShown = false;

    function safeJson(text) {
        try { return JSON.parse(text); } catch (_) { return null; }
    }
    function tryParseJsonValue(text) {
        try { return JSON.parse(text); } catch (_) { return undefined; }
    }
    function isAuthorizationHeader(name) {
        return String(name || '').trim().toLowerCase() === 'authorization';
    }
    function isCookieHeader(name) {
        const normalized = String(name || '').trim().toLowerCase();
        return normalized === 'cookie' || normalized === 'set-cookie' || normalized === 'cookie2' || normalized === 'set-cookie2';
    }
    function isSensitiveHeader(name) {
        return isAuthorizationHeader(name) || isCookieHeader(name);
    }
    function captureInitiator() {
        try {
            const stack = new Error().stack || '';
            return stack.split('\n')
                .filter((line, index) => index > 0
                    && !/captureInitiator|(?:chrome|moz|edge)-extension:\/\/|userscript\.html/i.test(line))
                .join('\n')
                .trim();
        } catch (_) {
            return '';
        }
    }
    function byteLength(value) {
        const text = String(value);
        if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).byteLength;
        if (typeof Blob !== 'undefined') return new Blob([text]).size;
        return unescape(encodeURIComponent(text)).length;
    }
    function measureBodySize(body) {
        if (body === null || body === undefined) return 0;
        if (typeof body === 'string') {
            const binary = body.match(/^\[(?:Blob|Binary):\s*(\d+)\s*bytes/);
            if (binary) return parseInt(binary[1], 10);
            if (body === '[ReadableStream]') return null;
            return byteLength(body);
        }
        if (typeof Blob !== 'undefined' && body instanceof Blob) return body.size;
        if (typeof ArrayBuffer !== 'undefined' && (body instanceof ArrayBuffer || ArrayBuffer.isView(body))) return body.byteLength;
        if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return byteLength(body.toString());
        if (typeof FormData !== 'undefined' && body instanceof FormData) return null;
        if (typeof body === 'object' && (body.__type === 'FormData' || body.__type === 'ReadableStream')) return null;
        if (typeof body === 'object' && body.__type === 'URLSearchParams' && Array.isArray(body.entries)) {
            return byteLength(body.entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&'));
        }
        try { return byteLength(JSON.stringify(body)); } catch (_) { return null; }
    }
    function getHeaderValue(headers, name) {
        if (!Array.isArray(headers)) return '';
        const found = headers.find(([key]) => String(key).toLowerCase() === name.toLowerCase());
        return found ? String(found[1]) : '';
    }
    function getDeclaredSize(headers) {
        const value = getHeaderValue(headers, 'content-length');
        const normalized = value.trim();
        if (!/^\d+$/.test(normalized)) return null;
        const size = Number(normalized);
        return Number.isSafeInteger(size) ? size : null;
    }
    function parseQueryParams(url) {
        try {
            return [...new URL(String(url || ''), location.href).searchParams.entries()];
        } catch (_) {
            return [];
        }
    }
    function formatByteSize(size) {
        if (!Number.isFinite(size) || size < 0) return 'н/д';
        if (size < 1024) return size + ' B';
        if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
        return (size / (1024 * 1024)).toFixed(2) + ' MB';
    }
    function getContentTypeInfo(contentType) {
        const mime = String(contentType || '').split(';')[0].trim().toLowerCase();
        if (!mime) return { label: 'UNKNOWN', icon: ICONS.info };
        if (mime === 'application/json' || mime.endsWith('+json')) return { label: 'JSON', icon: ICONS.code };
        if (mime === 'text/html' || mime === 'application/xhtml+xml') return { label: 'HTML', icon: ICONS.globe };
        if (mime.startsWith('image/')) return { label: 'IMAGE', icon: ICONS.image };
        if (mime.startsWith('text/') || /javascript|xml|form-urlencoded/.test(mime)) return { label: 'TEXT', icon: ICONS.fileText };
        return { label: 'BINARY', icon: ICONS.cpu };
    }
    function serializeMessage(data) {
        if (typeof data === 'string') {
            const parsed = tryParseJsonValue(data);
            return parsed !== undefined ? parsed : data.substring(0, loadMaxBody());
        }
        return serializeBody(data);
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

    function replaceLogs(next) {
        logs.length = 0;
        next.forEach(record => logs.push(record));
    }

    function recordSizeBytes(record) {
        try { return byteLength(JSON.stringify(record)); }
        catch (error) {
            console.warn('[API Tools] Не удалось определить размер записи:', error);
            return 0;
        }
    }

    function forgetLogReferences() {
        const liveLogs = new Set(logs);
        pinnedLogs.forEach(record => { if (!liveLogs.has(record)) pinnedLogs.delete(record); });
    }

    function persistLogsSoon() {
        if (persistTimer !== null) clearTimeout(persistTimer);
        if (!loadBool(LOG_PERSISTENCE_KEY, false)) return;
        persistTimer = setTimeout(() => {
            persistTimer = null;
            try {
                const limitBytes = loadConfiguredNum(LOG_PERSISTENCE_MB_KEY, 2, 1, 50) * 1024 * 1024;
                const entries = logs.map(record => ({ record, pinned: pinnedLogs.has(record) }));
                const envelope = { version: 1, savedAt: Date.now(), entries };
                let serialized = JSON.stringify(envelope);
                while (byteLength(serialized) > limitBytes && entries.length) {
                    entries.shift();
                    serialized = JSON.stringify(envelope);
                }
                while (true) {
                    try {
                        sessionStorage.setItem(SESSION_LOGS_KEY, serialized);
                        storageErrorShown = false;
                        break;
                    } catch (error) {
                        const quotaError = error && (
                            error.name === 'QuotaExceededError'
                            || error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
                            || error.code === 22
                            || error.code === 1014
                        );
                        if (!quotaError || !entries.length) throw error;
                        entries.shift();
                        serialized = JSON.stringify(envelope);
                    }
                }
                if (entries.length < logs.length) {
                    if (!storageWarningShown) {
                        storageWarningShown = true;
                        console.warn('[API Tools] Часть старых логов не помещается в лимит sessionStorage.');
                        if (document.body) showToast('Не все логи поместились в sessionStorage; сохранены последние записи.');
                    }
                } else {
                    storageWarningShown = false;
                }
            } catch (error) {
                if (!storageErrorShown) {
                    storageErrorShown = true;
                    console.warn('[API Tools] Не удалось сохранить логи в sessionStorage:', error);
                    if (document.body) showToast('Не удалось сохранить логи: ' + String(error));
                }
            }
        }, 250);
    }

    function restoreSessionLogs() {
        if (!loadBool(LOG_PERSISTENCE_KEY, false)) return;
        try {
            const raw = sessionStorage.getItem(SESSION_LOGS_KEY);
            if (!raw) return;
            const snapshot = JSON.parse(raw);
            if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.entries)) {
                throw new Error('Неверный формат сохранённых логов');
            }
            snapshot.entries.forEach(item => {
                if (!item || !item.record || typeof item.record !== 'object' || typeof item.record.url !== 'string') return;
                logs.push(item.record);
                if (item.pinned) pinnedLogs.add(item.record);
            });
            trimLogs();
        } catch (error) {
            console.warn('[API Tools] Не удалось восстановить сохранённые логи:', error);
            try { sessionStorage.removeItem(SESSION_LOGS_KEY); } catch (removeError) {
                console.warn('[API Tools] Не удалось удалить повреждённые сохранённые логи:', removeError);
            }
        }
    }

    function cleanupLogs() {
        const previousLength = logs.length;
        let retained = logs.slice();
        if (loadBool(LOG_MAX_AGE_ENABLED_KEY, false)) {
            const maxAgeMs = loadConfiguredNum(LOG_MAX_AGE_MINUTES_KEY, 60, 1, 525600) * 60000;
            const cutoff = Date.now() - maxAgeMs;
            retained = retained.filter(record => {
                const time = Date.parse(record.time || '');
                return !Number.isFinite(time) || time >= cutoff;
            });
        }
        if (loadBool(LOG_MAX_SIZE_ENABLED_KEY, false)) {
            const maxBytes = loadConfiguredNum(LOG_MAX_SIZE_MB_KEY, 25, 1, 500) * 1024 * 1024;
            let totalBytes = retained.reduce((total, record) => total + recordSizeBytes(record), 0);
            while (totalBytes > maxBytes && retained.length) {
                let index = retained.findIndex(record => !pinnedLogs.has(record));
                if (index < 0) index = 0;
                totalBytes -= recordSizeBytes(retained[index]);
                retained.splice(index, 1);
            }
        }
        if (retained.length !== logs.length) replaceLogs(retained);
        forgetLogReferences();
        return logs.length !== previousLength;
    }

    function trimLogs() {
        if (loadBool(LOG_LIMIT_ENABLED_KEY, true)) {
            const max = loadMaxLogs();
            if (logs.length > max) {
                const pinned = logs.filter(entry => pinnedLogs.has(entry));
                const unpinned = logs.filter(entry => !pinnedLogs.has(entry));
                const keepCount = Math.max(0, max - pinned.length);
                const recentUnpinned = keepCount ? new Set(unpinned.slice(-keepCount)) : new Set();
                replaceLogs(logs.filter(entry => pinnedLogs.has(entry) || recentUnpinned.has(entry)));
            }
        }
        cleanupLogs();
        persistLogsSoon();
    }

    function updatePauseButtons() {
        const paused = !!window.__netLogger.paused;
        document.querySelectorAll('[data-netlogger-pause]').forEach(button => {
            button.innerHTML = (paused ? ICONS.play : ICONS.pause) + `<span>${paused ? 'Возобновить' : 'Пауза'}</span>`;
            button.title = paused ? 'Возобновить логирование' : 'Приостановить логирование';
            button.setAttribute('aria-pressed', paused ? 'true' : 'false');
        });
    }

    function setLoggingPaused(paused) {
        window.__netLogger.paused = !!paused;
        updatePauseButtons();
        if (window.__netLoggerUI && window.__netLoggerUI.refresh) window.__netLoggerUI.refresh();
        showToast(window.__netLogger.paused ? 'Логирование приостановлено' : 'Логирование возобновлено');
    }

    function clearLogs(preservePinned) {
        const kept = preservePinned ? logs.filter(record => pinnedLogs.has(record)) : [];
        if (!preservePinned) pinnedLogs.clear();
        replaceLogs(kept);
        forgetLogReferences();
        clearPersistedLogs();
        persistLogsSoon();
        if (window.__netLoggerUI && window.__netLoggerUI.refresh) window.__netLoggerUI.refresh();
        if (window.__netLoggerBar && window.__netLoggerBar.refresh) window.__netLoggerBar.refresh();
    }

    function pushLog(entry) {
        if (window.__netLogger.disabled || window.__netLogger.paused || shouldIgnoreLog(entry)) return;
        const requestHeaders = entry.requestHeaders || [];
        const responseHeaders = entry.responseHeaders || [];
        if (entry.responsePresent === undefined) {
            entry.responsePresent = Object.prototype.hasOwnProperty.call(entry, 'response') && entry.response !== undefined;
        }
        const hasRequestBody = Object.prototype.hasOwnProperty.call(entry, 'requestBody') && entry.requestBody !== undefined;
        const measuredRequestSize = hasRequestBody ? measureBodySize(entry.requestBody) : null;
        const hasResponse = entry.responsePresent;
        const measuredResponseSize = hasResponse ? measureBodySize(entry.response) : null;
        if (entry.requestSize == null) {
            const declaredSize = getDeclaredSize(requestHeaders);
            entry.requestSize = measuredRequestSize != null ? measuredRequestSize : declaredSize;
            entry.requestSizeSource = measuredRequestSize != null ? 'body' : (declaredSize !== null ? 'Content-Length' : '');
        } else if (!entry.requestSizeSource) {
            entry.requestSizeSource = 'body';
        }
        if (entry.responseSize == null) {
            const declaredSize = getDeclaredSize(responseHeaders);
            const explicitSize = Object.prototype.hasOwnProperty.call(entry, 'responseSize');
            entry.responseSize = explicitSize
                ? declaredSize
                : (measuredResponseSize != null ? measuredResponseSize : declaredSize);
            entry.responseSizeSource = explicitSize
                ? (declaredSize !== null ? 'Content-Length' : '')
                : (measuredResponseSize != null ? 'body' : (declaredSize !== null ? 'Content-Length' : ''));
        } else if (!entry.responseSizeSource) {
            entry.responseSizeSource = 'body';
        }
        entry.requestContentType = entry.requestContentType || getHeaderValue(requestHeaders, 'content-type');
        entry.responseContentType = entry.responseContentType || getHeaderValue(responseHeaders, 'content-type');
        entry.contentType = entry.responseContentType || entry.requestContentType;
        if (!Array.isArray(entry.queryParams)) entry.queryParams = parseQueryParams(entry.url);
        logs.push(entry);
        trimLogs();
        if (loadConsoleLogs()) {
            console.groupCollapsed(`[${logs.length}] ${entry.method} ${entry.url}${entry.mocked ? ' [MOCK]' : ''}`);
            if (entry.status) console.log('status:', entry.status);
            if (entry.duration != null) console.log('duration:', entry.duration.toFixed(0) + ' ms');
            if (entry.requestBody !== null && entry.requestBody !== undefined) console.log('body:', entry.requestBody);
            if (entry.responsePresent) console.log('response:', entry.response);
            if (entry.appliedRules) console.log('applied rules:', entry.appliedRules);
            console.groupEnd();
        }
        if (window.__netLoggerUI && window.__netLoggerUI.refresh) window.__netLoggerUI.refresh();
        if (window.__netLoggerBar && window.__netLoggerBar.refresh) window.__netLoggerBar.refresh();
        if (loadAutoOpenViewer() && window.__netLoggerUI && typeof window.__netLoggerUI.open === 'function' && !window.__netLoggerUI.isOpen()) {
            window.__netLoggerUI.open();
        }
    }

    restoreSessionLogs();
    setInterval(() => {
        if (loadBool(LOG_MAX_AGE_ENABLED_KEY, false) && cleanupLogs()) {
            persistLogsSoon();
            if (window.__netLoggerUI && window.__netLoggerUI.refresh) window.__netLoggerUI.refresh();
            if (window.__netLoggerBar && window.__netLoggerBar.refresh) window.__netLoggerBar.refresh();
        }
    }, 60000);

    function computeXhrResponse(responseType, text) {
        if (responseType === 'json') return safeJson(text);
        if (responseType === '' || responseType === 'text') return text;
        return null;
    }

    async function readFetchResponse(response) {
        const contentType = getHeaderValue(normalizeHeaders(response.headers), 'content-type');
        try {
            const buffer = await response.clone().arrayBuffer();
            const size = buffer.byteLength;
            const mime = contentType.split(';')[0].trim().toLowerCase();
            const isText = !mime || mime.startsWith('text/') || mime === 'application/json'
                || mime.endsWith('+json') || mime.endsWith('+xml')
                || /javascript|xml|form-urlencoded/.test(mime);
            if (!isText) return { data: `[Binary: ${size} bytes, ${contentType || 'unknown'}]`, size };
            const text = new TextDecoder().decode(buffer);
            const parsed = tryParseJsonValue(text);
            return { data: parsed !== undefined ? parsed : text.substring(0, loadMaxBody()), size };
        } catch (_) {
            return { data: null, size: null };
        }
    }

    function readXhrResponse(xhr, headers, size) {
        const contentType = getHeaderValue(headers, 'content-type');
        const kind = getContentTypeInfo(contentType).label;
        if (xhr.responseType === 'document') {
            const html = xhr.responseXML && xhr.responseXML.documentElement
                ? xhr.responseXML.documentElement.outerHTML
                : '';
            return html.substring(0, loadMaxBody());
        }
        if (!['', 'text', 'json'].includes(xhr.responseType) || kind === 'IMAGE' || kind === 'BINARY') {
            return `[Binary: ${size == null ? 'unknown' : size + ' bytes'}, ${contentType || xhr.responseType || 'unknown'}]`;
        }
        try {
            if (xhr.responseType === 'json') return xhr.response;
            const text = xhr.responseText;
            const parsed = tryParseJsonValue(text);
            return parsed !== undefined ? parsed : text.substring(0, loadMaxBody());
        } catch (error) {
            return '[error reading: ' + error.message + ']';
        }
    }

    function measureXhrResponseSize(xhr, headers) {
        if (xhr.responseType === '' || xhr.responseType === 'text') {
            const kind = getContentTypeInfo(getHeaderValue(headers, 'content-type')).label;
            if (kind === 'IMAGE' || kind === 'BINARY') {
                const declaredSize = getDeclaredSize(headers);
                if (declaredSize !== null) return { size: declaredSize, source: 'Content-Length' };
            }
            return { size: measureBodySize(xhr.responseText), source: 'body' };
        }
        if (xhr.responseType === 'arraybuffer' || xhr.responseType === 'blob') {
            return { size: measureBodySize(xhr.response), source: 'body' };
        }
        const declaredSize = getDeclaredSize(headers);
        if (declaredSize !== null) return { size: declaredSize, source: 'Content-Length' };
        if (xhr.responseType === 'document') {
            const html = xhr.responseXML && xhr.responseXML.documentElement
                ? xhr.responseXML.documentElement.outerHTML
                : '';
            return { size: measureBodySize(html), source: 'body' };
        }
        if (xhr.responseType === 'json') return { size: measureBodySize(xhr.response), source: 'body' };
        return { size: null, source: '' };
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
        const initiator = captureInitiator();

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
        let origBodySize = null;
        if (isRequest) {
            try {
                const requestBody = input.clone();
                const buffer = await requestBody.arrayBuffer();
                origBodySize = buffer.byteLength;
                const t = new TextDecoder().decode(buffer);
                if (t) {
                    origBodyRaw = t;
                    const parsed = tryParseJsonValue(t);
                    origBodySer = parsed !== undefined ? parsed : t;
                }
            } catch (_) {}
        } else if (init && 'body' in init) {
            origBodyRaw = init.body;
            origBodySer = serializeBody(init.body);
            origBodySize = measureBodySize(init.body);
        }

        const matched = matchRules(origUrl, origMethod);
        const applied = rulesSummary(matched);

        debugLog('fetch', origMethod, origUrl,
            '| applyRules:', loadApplyRules(),
            '| total rules:', loadRules().length,
            '| matched:', matched.length,
            matched.length ? matched.map(r => ({ match: r.match, method: r.method, mockStatus: r.mockStatus })) : '');

        if (matched.length) {
            const ruleStart = performance.now();
            const result = applyRules(matched, origUrl, origHeaders, origBodyRaw);

            if (result.mocked) {
                const duration = performance.now() - ruleStart;
                const headers = new Headers();
                (result.mocked.headers || []).forEach(([n, v]) => {
                    try { headers.set(n, v); } catch (_) {}
                });
                if (result.mocked.body && !headers.has('content-type')) {
                    headers.set('content-type', 'application/json');
                }
                const responseHeaders = [...headers.entries()].map(([n, v]) => [n, v]);
                const parsedMockBody = tryParseJsonValue(result.mocked.body);
                const responseData = parsedMockBody !== undefined ? parsedMockBody : result.mocked.body;

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
                    requestSize: origBodySize,
                    responseHeaders, response: responseData,
                    responseSize: measureBodySize(result.mocked.body), initiator,
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

            let requestStart = 0;
            try {
                requestStart = performance.now();
                const response = await originalFetch.apply(this, fetchArgs);
                const duration = performance.now() - requestStart;
                let resHeaders = [];
                try { resHeaders = normalizeHeaders(response.headers); } catch (_) {}
                const payload = await readFetchResponse(response);
                pushLog({
                    source: 'fetch', time: new Date().toISOString(),
                    method: origMethod, url: origUrl, status: response.status,
                    requestHeaders: origHeaders, requestBody: origBodySer,
                    requestSize: origBodySize,
                    responseHeaders: resHeaders, response: payload.data,
                    responseSize: payload.size, initiator,
                    appliedRules: applied, duration
                });
                return response;
            } catch (err) {
                const duration = requestStart ? performance.now() - requestStart : 0;
                pushLog({
                    source: 'fetch', time: new Date().toISOString(),
                    method: origMethod, url: origUrl,
                    requestHeaders: origHeaders, requestBody: origBodySer,
                    requestSize: origBodySize, initiator,
                    error: String(err), appliedRules: applied, duration
                });
                throw err;
            }
        }

        let requestStart = 0;
        try {
            requestStart = performance.now();
            const response = await originalFetch.apply(this, arguments);
            const duration = performance.now() - requestStart;
            let resHeaders = [];
            try { resHeaders = normalizeHeaders(response.headers); } catch (_) {}
            const payload = await readFetchResponse(response);
            pushLog({
                source: 'fetch', time: new Date().toISOString(),
                method: origMethod, url: origUrl, status: response.status,
                requestHeaders: origHeaders, requestBody: origBodySer,
                requestSize: origBodySize,
                responseHeaders: resHeaders, response: payload.data,
                responseSize: payload.size, initiator, duration
            });
            return response;
        } catch (err) {
            const duration = requestStart ? performance.now() - requestStart : 0;
            pushLog({
                source: 'fetch', time: new Date().toISOString(),
                method: origMethod, url: origUrl,
                requestHeaders: origHeaders, requestBody: origBodySer,
                requestSize: origBodySize, initiator,
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
        let reqInitiator = '';
        let shadows = null;
        let startTime = 0;

        const openOrig = xhr.open;
        xhr.open = function (method, url) {
            reqMethod = (method || 'GET').toUpperCase();
            reqUrl = url || '';
            reqInitiator = captureInitiator();
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
                        requestSize: measureBodySize(body), initiator: reqInitiator,
                        responseHeaders: parseRawHeaders(mockHeaders),
                        response: result.mocked.body, responseSize: measureBodySize(result.mocked.body),
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
                    let responseSizeInfo = { size: null, source: '' };
                    let resHeaders = [];
                    try { resHeaders = parseRawHeaders(xhr.getAllResponseHeaders()); } catch (_) {}
                    try { responseSizeInfo = measureXhrResponseSize(xhr, resHeaders); } catch (_) {}
                    const responseData = readXhrResponse(xhr, resHeaders, responseSizeInfo.size);
                    pushLog({
                        source: 'xhr', time: new Date().toISOString(),
                        method: reqMethod, url: reqUrl, status: xhr.status,
                        requestHeaders: reqHeaders, requestBody: origBodySer,
                        requestSize: measureBodySize(body), initiator: reqInitiator,
                        responseHeaders: resHeaders, response: responseData,
                        responseSize: responseSizeInfo.size, responseSizeSource: responseSizeInfo.source,
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
                let responseSizeInfo = { size: null, source: '' };
                let resHeaders = [];
                try { resHeaders = parseRawHeaders(xhr.getAllResponseHeaders()); } catch (_) {}
                try { responseSizeInfo = measureXhrResponseSize(xhr, resHeaders); } catch (_) {}
                const responseData = readXhrResponse(xhr, resHeaders, responseSizeInfo.size);
                pushLog({
                    source: 'xhr', time: new Date().toISOString(),
                    method: reqMethod, url: reqUrl, status: xhr.status,
                    requestHeaders: reqHeaders, requestBody: origBodySer,
                    requestSize: measureBodySize(body), initiator: reqInitiator,
                    responseHeaders: resHeaders, response: responseData,
                    responseSize: responseSizeInfo.size, responseSizeSource: responseSizeInfo.source, duration
                });
            });
            return sendOrig.apply(xhr, arguments);
        };

        return xhr;
    }
    window.XMLHttpRequest = WrappedXHR;

    function inferMessageContentType(data) {
        if (typeof data === 'string') {
            try { JSON.parse(data); return 'application/json'; } catch (_) { return 'text/plain'; }
        }
        if (typeof Blob !== 'undefined' && data instanceof Blob) return data.type || 'application/octet-stream';
        if (typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams) return 'application/x-www-form-urlencoded';
        if (typeof FormData !== 'undefined' && data instanceof FormData) return 'multipart/form-data';
        return 'application/octet-stream';
    }

    async function inspectSocketMessage(data) {
        const size = measureBodySize(data);
        if (typeof data === 'string') {
            const parsed = tryParseJsonValue(data);
            return {
                body: parsed !== undefined ? parsed : data.substring(0, loadMaxBody()),
                size,
                contentType: parsed !== undefined ? 'application/json' : 'text/plain'
            };
        }
        try {
            let text = null;
            if (typeof Blob !== 'undefined' && data instanceof Blob) {
                text = await data.text();
            } else if (data instanceof ArrayBuffer) {
                text = new TextDecoder().decode(data);
            } else if (ArrayBuffer.isView(data)) {
                text = new TextDecoder().decode(
                    new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
                );
            }
            if (text !== null) {
                const parsed = tryParseJsonValue(text);
                if (parsed !== undefined) return { body: parsed, size, contentType: 'application/json' };
                if (!/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/.test(text)) {
                    const blobType = typeof Blob !== 'undefined' && data instanceof Blob ? data.type : '';
                    const textType = /^(text\/|application\/(?:[^;]+\+)?(?:json|xml))/i.test(blobType)
                        ? blobType
                        : 'text/plain';
                    return { body: text.substring(0, loadMaxBody()), size, contentType: textType };
                }
            }
        } catch (error) {
            console.warn('[NL] Failed to decode WebSocket message:', error);
        }
        return {
            body: serializeMessage(data),
            size,
            contentType: inferMessageContentType(data)
        };
    }

    if (typeof window.WebSocket === 'function') {
        const NativeWebSocket = window.WebSocket;
        class LoggedWebSocket extends NativeWebSocket {
            constructor(...args) {
                super(...args);
                const url = this.url;
                const initiator = captureInitiator();
                this.addEventListener('message', async event => {
                    if (window.__netLogger.disabled) return;
                    const message = await inspectSocketMessage(event.data);
                    pushLog({
                        source: 'websocket', method: 'MESSAGE', url, time: new Date().toISOString(),
                        response: message.body, responseSize: message.size,
                        responseContentType: message.contentType, eventName: event.type,
                        initiator, requestHeaders: [], responseHeaders: []
                    });
                });
            }

            send(data) {
                if (window.__netLogger.disabled) return super.send(data);
                const start = performance.now();
                const initiator = captureInitiator();
                const contentType = inferMessageContentType(data);
                try {
                    const result = super.send(data);
                    pushLog({
                        source: 'websocket', method: 'SEND', url: this.url, time: new Date().toISOString(),
                        requestBody: serializeMessage(data), requestSize: measureBodySize(data),
                        requestContentType: contentType, initiator, dispatchDuration: performance.now() - start,
                        requestHeaders: [], responseHeaders: []
                    });
                    return result;
                } catch (error) {
                    pushLog({
                        source: 'websocket', method: 'SEND', url: this.url, time: new Date().toISOString(),
                        requestBody: serializeMessage(data), requestSize: measureBodySize(data),
                        requestContentType: contentType, initiator, dispatchDuration: performance.now() - start,
                        error: String(error), requestHeaders: [], responseHeaders: []
                    });
                    throw error;
                }
            }
        }
        window.WebSocket = LoggedWebSocket;
    }

    if (typeof window.EventSource === 'function') {
        const NativeEventSource = window.EventSource;
        const eventSourceLoggers = new WeakMap();
        class LoggedEventSource extends NativeEventSource {
            constructor(...args) {
                super(...args);
                const url = this.url;
                const initiator = captureInitiator();
                const logMessage = event => {
                    if (window.__netLogger.disabled) return;
                    pushLog({
                        source: 'eventsource', method: 'MESSAGE', url, time: new Date().toISOString(),
                        response: serializeMessage(event.data), responseSize: measureBodySize(event.data),
                        responseContentType: 'text/event-stream',
                        eventName: event.type, lastEventId: event.lastEventId || '',
                        initiator, requestHeaders: [], responseHeaders: []
                    });
                };
                const loggedTypes = new Set(['message']);
                eventSourceLoggers.set(this, { logMessage, loggedTypes });
                super.addEventListener('message', logMessage);
                super.addEventListener('error', event => {
                    if (window.__netLogger.disabled) return;
                    pushLog({
                        source: 'eventsource', method: 'ERROR', url, time: new Date().toISOString(),
                        error: 'EventSource connection error', eventName: event.type,
                        initiator, requestHeaders: [], responseHeaders: []
                    });
                });
            }

            addEventListener(type, listener, options) {
                const result = super.addEventListener(type, listener, options);
                const state = eventSourceLoggers.get(this);
                const eventType = String(type);
                if (state && eventType !== 'open' && eventType !== 'error' && !state.loggedTypes.has(eventType)) {
                    state.loggedTypes.add(eventType);
                    super.addEventListener(eventType, state.logMessage);
                }
                return result;
            }
        }
        window.EventSource = LoggedEventSource;
    }

    if (typeof navigator.sendBeacon === 'function') {
        const originalSendBeacon = navigator.sendBeacon;
        navigator.sendBeacon = function (url, data) {
            if (window.__netLogger.disabled) return originalSendBeacon.apply(this, arguments);
            const start = performance.now();
            const initiator = captureInitiator();
            const requestBody = serializeMessage(data);
            const requestSize = measureBodySize(data);
            const requestContentType = data == null
                ? ''
                : (typeof Blob !== 'undefined' && data instanceof Blob ? (data.type || 'application/octet-stream') : inferMessageContentType(data));
            try {
                const queued = originalSendBeacon.apply(this, arguments);
                pushLog({
                    source: 'beacon', method: 'POST', url: String(url), time: new Date().toISOString(),
                    requestBody, requestSize, requestContentType, beaconQueued: queued,
                    error: queued ? undefined : 'sendBeacon rejected by browser',
                    initiator, dispatchDuration: performance.now() - start,
                    requestHeaders: [], responseHeaders: []
                });
                return queued;
            } catch (error) {
                pushLog({
                    source: 'beacon', method: 'POST', url: String(url), time: new Date().toISOString(),
                    requestBody, requestSize, requestContentType, initiator,
                    dispatchDuration: performance.now() - start, error: String(error),
                    requestHeaders: [], responseHeaders: []
                });
                throw error;
            }
        };
    }

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
        if (r === undefined) return '';
        if (r === null) return 'null';
        if (typeof r === 'string') return r;
        try {
            if (loadPrettyPrint()) return JSON.stringify(r, null, 2);
            return JSON.stringify(r);
        } catch (_) { return String(r); }
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
            const parsed = tryParseJsonValue(body);
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
        if (r === undefined) return '';
        if (r === null) return '<span class="nl-j-null">null</span>';
        if (typeof r === 'string') {
            const parsed = tryParseJsonValue(r);
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
        const rows = pairs.map(([name, value, state]) => {
            const isSensitive = isSensitiveHeader(name);
            const safeName = escapeHtml(name);
            const safeValue = escapeHtml(value);
            if (isSensitive) {
                const revealed = state === 'revealed';
                return `
                    <div class="nl-header-row nl-header-sensitive" data-revealed="${revealed ? '1' : '0'}">
                        <span class="nl-header-name">${safeName}:</span>
                        <span class="nl-header-val${revealed ? '' : ' masked'}">${revealed ? safeValue : '••••••••'}</span>
                        <button type="button" class="nl-eye" title="Показать/скрыть" data-value="${safeValue}">
                            ${revealed ? ICONS.eyeOff : ICONS.eye}
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
        return pairs.map(([n, v]) => isSensitiveHeader(n) ? `${n}: •••••• (скрыто)` : `${n}: ${v}`).join('\n');
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
            if (r.dispatchDuration != null) out.push('API dispatch duration: ' + r.dispatchDuration.toFixed(2) + ' ms');
            if (r.requestSize != null) out.push('RequestSize: ' + formatByteSize(r.requestSize));
            if (r.responseSize != null) out.push('ResponseSize: ' + formatByteSize(r.responseSize));
            if (r.requestContentType) out.push('RequestContent-Type: ' + r.requestContentType);
            if (r.responseContentType) out.push('ResponseContent-Type: ' + r.responseContentType);
            if (r.queryParams && r.queryParams.length) {
                out.push('Query:');
                r.queryParams.forEach(([key, value]) => out.push(`  ${key}: ${value}`));
            }
            if (r.initiator) out.push('Initiator:\n' + r.initiator);
            if (r.beaconQueued !== undefined) out.push('BeaconQueued: ' + r.beaconQueued);
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
            if (r.responsePresent || (r.response !== null && r.response !== undefined)) {
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
            const val = isSensitiveHeader(n) ? '$TOKEN' : v;
            parts.push(`-H '${shq(`${n}: ${val}`)}'`);
        });
        const body = r.requestBody;
        if (body !== null && body !== undefined) {
            const ct = (r.requestHeaders || []).find(([n]) => n.toLowerCase() === 'content-type');
            const ctVal = ct ? ct[1].toLowerCase() : '';
            if (typeof body === 'object' && body.__type === 'FormData') {
                if (ctVal.includes('multipart/form-data') || ctVal === '') {
                    body.entries.forEach(([k, v]) => {
                        if (typeof v === 'string' && v.startsWith('[File:')) {
                            parts.push(`-F '${shq(`${k}=@/path/to/file`)}'`);
                        } else {
                            parts.push(`-F '${shq(`${k}=${v}`)}'`);
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
        parts.push(`'${shq(getFullUrl(r))}'`);
        return parts.join(' \\\n  ');
    }

    function buildFetch(r) {
        const opts = { method: (r.method || 'GET').toUpperCase() };
        const headers = {};
        (r.requestHeaders || []).forEach(([n, v]) => {
            headers[n] = isSensitiveHeader(n) ? '<TOKEN>' : v;
        });
        if (Object.keys(headers).length) opts.headers = headers;
        const bodyStr = bodyToString(r);
        if (bodyStr && !['GET', 'HEAD'].includes(opts.method)) opts.body = bodyStr;
        return `fetch(${JSON.stringify(getFullUrl(r))}, ${JSON.stringify(opts, null, 2)});`;
    }

    function buildXhr(r) {
        const method = (r.method || 'GET').toUpperCase();
        const lines = [
            'const xhr = new XMLHttpRequest();',
            `xhr.open(${JSON.stringify(method)}, ${JSON.stringify(getFullUrl(r))});`
        ];
        (r.requestHeaders || []).forEach(([name, value]) => {
            const safeValue = isSensitiveHeader(name) ? '<TOKEN>' : value;
            lines.push(`xhr.setRequestHeader(${JSON.stringify(name)}, ${JSON.stringify(safeValue)});`);
        });
        lines.push('xhr.onload = () => console.log(xhr.status, xhr.responseText);');
        lines.push('xhr.onerror = () => console.error(\"Request failed\");');
        const body = bodyToString(r);
        lines.push(`xhr.send(${body && !['GET', 'HEAD'].includes(method) ? JSON.stringify(body) : 'null'});`);
        return lines.join('\n');
    }

    function buildFull(r) {
        const parts = [];
        parts.push(`${r.method} ${getFullUrl(r)}`);
        if (r.status) parts.push(`Status: ${r.status}`);
        if (r.time) parts.push(`Time: ${r.time}`);
        if (r.duration != null) parts.push(`Duration: ${r.duration.toFixed(0)} ms`);
        if (r.dispatchDuration != null) parts.push(`API dispatch duration: ${r.dispatchDuration.toFixed(2)} ms`);
        if (r.requestSize != null) parts.push(`Request size: ${formatByteSize(r.requestSize)}`);
        if (r.responseSize != null) parts.push(`Response size: ${formatByteSize(r.responseSize)}`);
        if (r.requestContentType) parts.push(`Request Content-Type: ${r.requestContentType}`);
        if (r.responseContentType) parts.push(`Response Content-Type: ${r.responseContentType}`);
        if (r.queryParams && r.queryParams.length) {
            parts.push('Query:');
            r.queryParams.forEach(([key, value]) => parts.push(`  ${key}: ${value}`));
        }
        if (r.initiator) parts.push('Initiator:\n' + r.initiator);
        if (r.mocked) parts.push('MOCKED: yes');
        if (r.appliedRules && r.appliedRules.length) {
            parts.push('Applied rules:');
            r.appliedRules.forEach(a => parts.push(`  - ${a.method || 'ANY'} ${a.match}${a.mocked ? ' (mock)' : ''}`));
        }
        parts.push('');
        parts.push('Request headers:');
        (r.requestHeaders || []).forEach(([n, v]) => {
            parts.push(`  ${n}: ${isSensitiveHeader(n) ? '•••••• (скрыто)' : v}`);
        });
        if (r.requestBody !== null && r.requestBody !== undefined) {
            parts.push('');
            parts.push('Request body:');
            parts.push(formatBody(r.requestBody));
        }
        parts.push('');
        parts.push('Response headers:');
        (r.responseHeaders || []).forEach(([n, v]) => parts.push(`  ${n}: ${isSensitiveHeader(n) ? '•••••• (скрыто)' : v}`));
        if (r.responsePresent || (r.response !== null && r.response !== undefined)) {
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

    function downloadJsonFile(filename, value) {
        const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    function exportLogsBundle() {
        return {
            format: 'api-tools-logs',
            version: 1,
            exportedAt: new Date().toISOString(),
            logs: logs.map(recordForJsonExport),
            pinnedIndexes: logs.reduce((indexes, record, index) => {
                if (pinnedLogs.has(record)) indexes.push(index);
                return indexes;
            }, [])
        };
    }

    function normalizeImportedRecord(record) {
        if (!record || typeof record !== 'object' || Array.isArray(record)
            || typeof record.url !== 'string' || typeof record.method !== 'string') return null;
        const allowedSources = new Set(['fetch', 'xhr', 'websocket', 'eventsource', 'beacon']);
        const normalized = {
            source: allowedSources.has(record.source) ? record.source : 'fetch',
            method: record.method.slice(0, 64),
            url: record.url.slice(0, 10000),
            time: typeof record.time === 'string' ? record.time : new Date().toISOString(),
            requestHeaders: Array.isArray(record.requestHeaders)
                ? record.requestHeaders.filter(pair => Array.isArray(pair) && pair.length >= 2).map(([name, value]) => [String(name), String(value)])
                : [],
            responseHeaders: Array.isArray(record.responseHeaders)
                ? record.responseHeaders.filter(pair => Array.isArray(pair) && pair.length >= 2).map(([name, value]) => [String(name), String(value)])
                : [],
            queryParams: Array.isArray(record.queryParams)
                ? record.queryParams.filter(pair => Array.isArray(pair) && pair.length >= 2).map(([name, value]) => [String(name), String(value)])
                : parseQueryParams(record.url)
        };
        [
            'status', 'duration', 'dispatchDuration', 'requestSize', 'responseSize',
            'requestSizeSource', 'responseSizeSource', 'requestContentType', 'responseContentType',
            'contentType', 'initiator', 'error', 'requestBody', 'response', 'responsePresent',
            'eventName', 'lastEventId', 'beaconQueued', 'mocked', 'statusText', 'httpVersion'
        ].forEach(key => {
            if (Object.prototype.hasOwnProperty.call(record, key)) normalized[key] = record[key];
        });
        if (Array.isArray(record.appliedRules)) {
            normalized.appliedRules = record.appliedRules.filter(rule => rule && typeof rule === 'object')
                .map(rule => ({
                    id: String(rule.id || ''),
                    match: String(rule.match || ''),
                    method: String(rule.method || 'ANY'),
                    mocked: !!rule.mocked
                }));
        }
        return normalized;
    }

    async function importLogsFile(file) {
        if (!file) return;
        const maxBytes = loadConfiguredNum(LOG_IMPORT_MAX_MB_KEY, 10, 1, 100) * 1024 * 1024;
        if (file.size > maxBytes) {
            showToast(`Файл больше лимита ${Math.round(maxBytes / 1024 / 1024)} MB`);
            return;
        }
        try {
            const parsed = JSON.parse(await file.text());
            if (!parsed || parsed.format !== 'api-tools-logs' || parsed.version !== 1 || !Array.isArray(parsed.logs)) {
                throw new Error('Ожидается JSON-экспорт API Tools с массивом logs');
            }
            if (parsed.logs.length > 100000) throw new Error('В файле слишком много записей');
            const imported = parsed.logs.map((record, index) => ({
                record: normalizeImportedRecord(record),
                pinned: Array.isArray(parsed.pinnedIndexes) && parsed.pinnedIndexes.includes(index)
            })).filter(item => item.record);
            if (!imported.length) {
                showToast('В файле нет корректных запросов');
                return;
            }
            if (!confirm(`Добавить ${imported.length} запросов к текущим ${logs.length}?`)) return;
            imported.forEach(item => {
                logs.push(item.record);
                if (item.pinned) pinnedLogs.add(item.record);
            });
            trimLogs();
            if (window.__netLoggerUI && window.__netLoggerUI.refresh) window.__netLoggerUI.refresh();
            if (window.__netLoggerBar && window.__netLoggerBar.refresh) window.__netLoggerBar.refresh();
            showToast(`Импортировано: ${imported.length}`);
        } catch (error) {
            console.warn('[API Tools] Не удалось импортировать логи:', error);
            showToast('Ошибка импорта: ' + String(error.message || error));
        }
    }

    function redactHeadersForExport(headers) {
        return (headers || []).map(([name, value]) => [
            name,
            isSensitiveHeader(name) ? '[REDACTED]' : value
        ]);
    }

    function recordForJsonExport(record) {
        return {
            ...record,
            requestHeaders: redactHeadersForExport(record.requestHeaders),
            responseHeaders: redactHeadersForExport(record.responseHeaders)
        };
    }

    function buildHar(list) {
        const entries = list.filter(record => ['fetch', 'xhr', 'beacon'].includes(record.source)).map(record => {
            const durationValue = record.duration != null ? record.duration : record.dispatchDuration;
            const duration = Number.isFinite(Number(durationValue)) ? Number(durationValue) : 0;
            const requestBodyPresent = record.requestBody !== null && record.requestBody !== undefined;
            const responsePresent = record.responsePresent || (record.response !== null && record.response !== undefined);
            const requestSize = record.requestSize != null && Number.isFinite(Number(record.requestSize)) ? Number(record.requestSize) : -1;
            const responseSize = record.responseSize != null && Number.isFinite(Number(record.responseSize)) ? Number(record.responseSize) : -1;
            const request = {
                method: record.method || 'GET',
                url: getFullUrl(record),
                httpVersion: record.httpVersion || 'HTTP/1.1',
                cookies: [],
                headers: redactHeadersForExport(record.requestHeaders).map(([name, value]) => ({ name, value: String(value) })),
                queryString: (record.queryParams || parseQueryParams(record.url)).map(([name, value]) => ({ name, value })),
                headersSize: -1,
                bodySize: requestSize
            };
            if (requestBodyPresent) {
                request.postData = {
                    mimeType: record.requestContentType || 'text/plain',
                    text: bodyToString(record)
                };
            }
            const response = {
                status: Number.isFinite(Number(record.status)) ? Number(record.status) : 0,
                statusText: record.statusText || '',
                httpVersion: record.httpVersion || 'HTTP/1.1',
                cookies: [],
                headers: redactHeadersForExport(record.responseHeaders).map(([name, value]) => ({ name, value: String(value) })),
                content: {
                    size: responseSize,
                    mimeType: record.responseContentType || 'application/octet-stream'
                },
                redirectURL: '',
                headersSize: -1,
                bodySize: responseSize
            };
            if (responsePresent) response.content.text = formatResponse(record.response);
            return {
                startedDateTime: record.time || new Date().toISOString(),
                time: duration,
                request,
                response,
                cache: {},
                timings: { blocked: -1, dns: -1, connect: -1, send: 0, wait: duration, receive: 0, ssl: -1 }
            };
        });
        return {
            log: {
                version: '1.2',
                creator: { name: 'API Tools', version: SCRIPT_VERSION },
                entries
            }
        };
    }

    function downloadHar(list) {
        const filename = (location.hostname.replace(/[^a-z0-9.-]/gi, '_') || 'site')
            + '-netlog-'
            + new Date().toISOString().replace(/[:.]/g, '-')
            + '.har';
        downloadJsonFile(filename, buildHar(list));
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
        header.appendChild(tools);
        header.appendChild(closeBtn);
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

        const positionCard = makeCard('Кнопка действий', 'activity');
        const positionField = makeField({
            label: 'Расположение на экране',
            hint: 'Выберите угол, в котором будет отображаться кнопка открытия панели.'
        });
        const preview = document.createElement('div');
        preview.className = 'nl-position-preview';
        preview.setAttribute('role', 'group');
        preview.setAttribute('aria-label', 'Предпросмотр расположения кнопки');
        const previewBar = document.createElement('div');
        previewBar.className = 'nl-position-preview-bar';
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            dot.className = 'nl-position-preview-dot';
            previewBar.appendChild(dot);
        }
        preview.appendChild(previewBar);
        for (let i = 0; i < 3; i++) {
            const line = document.createElement('div');
            line.className = 'nl-position-preview-line';
            preview.appendChild(line);
        }
        const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        const renderPosition = () => {
            const current = loadFabPosition();
            preview.querySelectorAll('.nl-position-option').forEach(button => {
                const active = button.dataset.position === current;
                button.classList.toggle('active', active);
                button.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
        };
        positions.forEach(position => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'nl-position-option';
            button.dataset.position = position;
            button.title = {
                'top-left': 'Сверху слева',
                'top-right': 'Сверху справа',
                'bottom-left': 'Снизу слева',
                'bottom-right': 'Снизу справа'
            }[position];
            button.setAttribute('aria-label', button.title);
            button.innerHTML = ICONS.activity;
            button.addEventListener('click', () => {
                saveFabPosition(position);
                if (window.__netLoggerUI && typeof window.__netLoggerUI.setPosition === 'function') {
                    window.__netLoggerUI.setPosition(position);
                }
                renderPosition();
                showToast('Положение кнопки обновлено');
            });
            preview.appendChild(button);
        });
        renderPosition();
        positionField.inline.appendChild(preview);
        positionCard.appendChild(positionField);
        root.appendChild(positionCard);
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
            hint: 'Пример: 500. При включённом ring buffer остаются последние записи. От 10 до 100000.'
        });
        const inputLogs = document.createElement('input');
        inputLogs.className = 'nl-input';
        inputLogs.type = 'number';
        inputLogs.min = '10';
        inputLogs.max = '100000';
        inputLogs.step = '10';
        inputLogs.required = true;
        inputLogs.value = String(loadMaxLogs());
        const logLimitSwitch = makeSwitch({
            label: 'Ограничивать количество логов (ring buffer)',
            desc: 'Отключение снимает лимит количества и может увеличить потребление памяти.',
            checked: loadBool(LOG_LIMIT_ENABLED_KEY, true),
            onChange: enabled => {
                if (enabled) {
                    const value = Number(inputLogs.value);
                    if (!inputLogs.value.trim() || !Number.isInteger(value) || value < 10 || value > 100000) {
                        logLimitSwitch.querySelector('input').checked = false;
                        showToast('Заполните лимит: целое число от 10 до 100000');
                        return;
                    }
                    if (!saveMaxLogs(value)) {
                        logLimitSwitch.querySelector('input').checked = false;
                        return;
                    }
                }
                if (!saveLogConfig(LOG_LIMIT_ENABLED_KEY, enabled ? '1' : '0')) {
                    logLimitSwitch.querySelector('input').checked = !enabled;
                    return;
                }
                trimLogs();
                if (window.__netLoggerUI && window.__netLoggerUI.refresh) window.__netLoggerUI.refresh();
                showToast(enabled ? 'Ring buffer включён' : 'Ring buffer выключен');
            }
        });
        limitsCard.appendChild(logLimitSwitch);
        logsField.inline.appendChild(inputLogs);
        logsField.inline.appendChild(makeButton({
            text: 'Сохранить', iconName: 'settings', variant: 'primary', size: 'sm',
            onClick: () => {
                const v = parseInt(inputLogs.value, 10);
                if (!inputLogs.value.trim() || !Number.isInteger(Number(inputLogs.value)) || !Number.isFinite(v) || v < 10 || v > 100000) {
                    showToast('Введите число от 10 до 100000');
                    return;
                }
                if (!saveMaxLogs(v)) return;
                trimLogs();
                if (window.__netLoggerUI && window.__netLoggerUI.refresh) window.__netLoggerUI.refresh();
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

        const retentionCard = makeCard('Хранение логов', 'cpu');
        const persistenceMbInput = document.createElement('input');
        persistenceMbInput.className = 'nl-input';
        persistenceMbInput.type = 'number';
        persistenceMbInput.min = '1';
        persistenceMbInput.max = '50';
        persistenceMbInput.step = '1';
        persistenceMbInput.required = true;
        persistenceMbInput.value = loadConfiguredNumInput(LOG_PERSISTENCE_MB_KEY, 1, 50);
        persistenceMbInput.placeholder = 'Например, 2';
        const persistenceField = makeField({
            label: 'Лимит сохранения в sessionStorage (MB)',
            hint: 'Пример: 2 MB. Логи восстановятся после F5, но sessionStorage очищается при закрытии вкладки. Данные страницы остаются локально и могут содержать секреты.'
        });
        persistenceField.inline.appendChild(persistenceMbInput);
        const persistenceSwitch = makeSwitch({
            label: 'Сохранять логи между перезагрузками',
            desc: 'Восстанавливает записи после F5 в этой же вкладке.',
            checked: loadBool(LOG_PERSISTENCE_KEY, false),
            onChange: enabled => {
                const value = Number(persistenceMbInput.value);
                if (enabled && (!persistenceMbInput.value.trim() || !Number.isInteger(value) || value < 1 || value > 50)) {
                    persistenceSwitch.querySelector('input').checked = false;
                    showToast('Заполните лимит sessionStorage: целое число от 1 до 50 MB');
                    return;
                }
                if (enabled && !saveLogConfig(LOG_PERSISTENCE_MB_KEY, value)) {
                    persistenceSwitch.querySelector('input').checked = false;
                    return;
                }
                if (!saveLogConfig(LOG_PERSISTENCE_KEY, enabled ? '1' : '0')) {
                    persistenceSwitch.querySelector('input').checked = !enabled;
                    return;
                }
                if (!enabled) clearPersistedLogs();
                persistLogsSoon();
                showToast(enabled ? 'Сохранение между перезагрузками включено' : 'Сохранение выключено');
            }
        });
        retentionCard.appendChild(persistenceSwitch);
        retentionCard.appendChild(persistenceField);

        const ageInput = document.createElement('input');
        ageInput.className = 'nl-input';
        ageInput.type = 'number';
        ageInput.min = '1';
        ageInput.max = '525600';
        ageInput.step = '1';
        ageInput.required = true;
        ageInput.value = loadConfiguredNumInput(LOG_MAX_AGE_MINUTES_KEY, 1, 525600);
        ageInput.placeholder = 'Например, 60';
        const ageField = makeField({
            label: 'Хранить не дольше (минуты)',
            hint: 'Пример: 60 минут. Старые записи удаляются при поступлении следующего запроса и после импорта.'
        });
        ageField.inline.appendChild(ageInput);
        ageField.inline.appendChild(makeButton({
            text: 'Сохранить', iconName: 'settings', variant: 'primary', size: 'sm',
            onClick: () => {
                const value = Number(ageInput.value);
                if (!ageInput.value.trim() || !Number.isInteger(value) || value < 1 || value > 525600) {
                    showToast('Введите целое число минут от 1 до 525600');
                    return;
                }
                if (!saveLogConfig(LOG_MAX_AGE_MINUTES_KEY, value)) return;
                cleanupLogs();
                trimLogs();
                showToast('Максимальный срок хранения: ' + value + ' мин');
            }
        }));
        const ageSwitch = makeSwitch({
            label: 'Автоочистка по времени',
            desc: 'Удалять записи, старше заданного срока.',
            checked: loadBool(LOG_MAX_AGE_ENABLED_KEY, false),
            onChange: enabled => {
                const value = Number(ageInput.value);
                if (enabled && (!ageInput.value.trim() || !Number.isInteger(value) || value < 1 || value > 525600)) {
                    ageSwitch.querySelector('input').checked = false;
                    showToast('Заполните срок хранения: целое число минут от 1 до 525600');
                    return;
                }
                if (enabled && !saveLogConfig(LOG_MAX_AGE_MINUTES_KEY, value)) {
                    ageSwitch.querySelector('input').checked = false;
                    return;
                }
                if (!saveLogConfig(LOG_MAX_AGE_ENABLED_KEY, enabled ? '1' : '0')) {
                    ageSwitch.querySelector('input').checked = !enabled;
                    return;
                }
                trimLogs();
                if (window.__netLoggerUI && window.__netLoggerUI.refresh) window.__netLoggerUI.refresh();
            }
        });
        retentionCard.appendChild(ageSwitch);
        retentionCard.appendChild(ageField);

        const sizeInput = document.createElement('input');
        sizeInput.className = 'nl-input';
        sizeInput.type = 'number';
        sizeInput.min = '1';
        sizeInput.max = '500';
        sizeInput.step = '1';
        sizeInput.required = true;
        sizeInput.value = loadConfiguredNumInput(LOG_MAX_SIZE_MB_KEY, 1, 500);
        sizeInput.placeholder = 'Например, 25';
        const sizeField = makeField({
            label: 'Максимальный объём логов (MB)',
            hint: 'Пример: 25 MB. При превышении старые записи удаляются; закреплённые сохраняются, пока это возможно.'
        });
        sizeField.inline.appendChild(sizeInput);
        sizeField.inline.appendChild(makeButton({
            text: 'Сохранить', iconName: 'settings', variant: 'primary', size: 'sm',
            onClick: () => {
                const value = Number(sizeInput.value);
                if (!sizeInput.value.trim() || !Number.isInteger(value) || value < 1 || value > 500) {
                    showToast('Введите целое число от 1 до 500 MB');
                    return;
                }
                if (!saveLogConfig(LOG_MAX_SIZE_MB_KEY, value)) return;
                cleanupLogs();
                trimLogs();
                showToast('Максимальный объём: ' + value + ' MB');
            }
        }));
        const sizeSwitch = makeSwitch({
            label: 'Автоочистка по объёму',
            desc: 'Удалять самые старые записи при достижении лимита.',
            checked: loadBool(LOG_MAX_SIZE_ENABLED_KEY, false),
            onChange: enabled => {
                const value = Number(sizeInput.value);
                if (enabled && (!sizeInput.value.trim() || !Number.isInteger(value) || value < 1 || value > 500)) {
                    sizeSwitch.querySelector('input').checked = false;
                    showToast('Заполните лимит объёма: целое число от 1 до 500 MB');
                    return;
                }
                if (enabled && !saveLogConfig(LOG_MAX_SIZE_MB_KEY, value)) {
                    sizeSwitch.querySelector('input').checked = false;
                    return;
                }
                if (!saveLogConfig(LOG_MAX_SIZE_ENABLED_KEY, enabled ? '1' : '0')) {
                    sizeSwitch.querySelector('input').checked = !enabled;
                    return;
                }
                trimLogs();
                if (window.__netLoggerUI && window.__netLoggerUI.refresh) window.__netLoggerUI.refresh();
            }
        });
        retentionCard.appendChild(sizeSwitch);
        retentionCard.appendChild(sizeField);
        root.appendChild(retentionCard);

        const ioCard = makeCard('Экспорт и импорт логов', 'code');
        const importLimitInput = document.createElement('input');
        importLimitInput.className = 'nl-input';
        importLimitInput.type = 'number';
        importLimitInput.min = '1';
        importLimitInput.max = '100';
        importLimitInput.step = '1';
        importLimitInput.required = true;
        importLimitInput.value = loadConfiguredNumInput(LOG_IMPORT_MAX_MB_KEY, 1, 100);
        importLimitInput.placeholder = 'Например, 10';
        const importLimitField = makeField({
            label: 'Максимальный размер файла импорта (MB)',
            hint: 'Пример: 10 MB. Большие файлы отклоняются до чтения.'
        });
        importLimitField.inline.appendChild(importLimitInput);
        const ioButtons = document.createElement('div');
        ioButtons.className = 'nl-excl-actions';
        const exportLogsButton = makeButton({
            text: 'Экспорт JSON', iconName: 'download', size: 'sm',
            onClick: () => {
                if (!logs.length) { showToast('Пока нет логов для экспорта'); return; }
                downloadJsonFile(
                    'api-tools-logs-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json',
                    exportLogsBundle()
                );
                showToast('Экспортировано: ' + logs.length + ' запросов');
            }
        });
        const importLogsButton = makeButton({
            text: 'Импорт JSON', iconName: 'upload', size: 'sm',
            onClick: () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json,application/json';
                input.addEventListener('change', () => importLogsFile(input.files && input.files[0]));
                input.click();
            }
        });
        ioButtons.appendChild(exportLogsButton);
        ioButtons.appendChild(importLogsButton);
        const ioSwitch = makeSwitch({
            label: 'Включить экспорт и импорт JSON',
            desc: 'Экспорт скрывает Authorization/Cookie в заголовках. Тела могут содержать личные данные — проверьте файл перед отправкой.',
            checked: loadBool(LOG_IO_ENABLED_KEY, false),
            onChange: enabled => {
                const value = Number(importLimitInput.value);
                if (enabled && (!importLimitInput.value.trim() || !Number.isInteger(value) || value < 1 || value > 100)) {
                    ioSwitch.querySelector('input').checked = false;
                    showToast('Заполните размер файла импорта: целое число от 1 до 100 MB');
                    return;
                }
                if (enabled && !saveLogConfig(LOG_IMPORT_MAX_MB_KEY, value)) {
                    ioSwitch.querySelector('input').checked = false;
                    return;
                }
                if (!saveLogConfig(LOG_IO_ENABLED_KEY, enabled ? '1' : '0')) {
                    ioSwitch.querySelector('input').checked = !enabled;
                    return;
                }
                exportLogsButton.disabled = !enabled;
                importLogsButton.disabled = !enabled;
                if (window.__netLoggerUI && window.__netLoggerUI.refresh) window.__netLoggerUI.refresh();
                showToast(enabled ? 'Экспорт и импорт включены' : 'Экспорт и импорт выключены');
            }
        });
        ioCard.appendChild(ioSwitch);
        ioCard.appendChild(importLimitField);
        ioCard.appendChild(ioButtons);
        exportLogsButton.disabled = !loadBool(LOG_IO_ENABLED_KEY, false);
        importLogsButton.disabled = !loadBool(LOG_IO_ENABLED_KEY, false);
        root.appendChild(ioCard);

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
        behaviorCard.appendChild(makeSwitch({
            label: 'Автоматически открывать просмотр',
            desc: 'Когда на странице появляется первый запрос, окно просмотра открывается автоматически.',
            checked: loadAutoOpenViewer(),
            onChange: (v) => {
                saveAutoOpenViewer(v);
                showToast(v ? 'Автооткрытие включено' : 'Автооткрытие выключено');
            }
        }));
        root.appendChild(behaviorCard);

        const examplesCard = makeCard('Примеры', 'info');
        const examples = document.createElement('div');
        examples.className = 'nl-settings-desc';
        examples.style.margin = '0';
        examples.style.whiteSpace = 'pre-wrap';
        examples.textContent = 'Для короткой отладки: ring buffer 500 записей и пауза сразу после нужного вызова.\nДля возврата после F5: включите sessionStorage с лимитом 2 MB.\nДля долгой сессии: автоочистка через 60 минут и/или при достижении 25 MB.\nДля передачи логов: включите JSON-обмен, экспортируйте файл и отправьте его коллеге после проверки тел запросов на личные данные.';
        examplesCard.appendChild(examples);
        const formatHint = document.createElement('div');
        formatHint.className = 'nl-settings-desc';
        formatHint.style.margin = '10px 0 0';
        formatHint.innerHTML = 'Пример структуры JSON: <code>{"format":"api-tools-logs","version":1,"logs":[...],"pinnedIndexes":[]}</code>';
        examplesCard.appendChild(formatHint);
        root.appendChild(examplesCard);

        const extraCard = makeCard('Дополнительно', 'settings');
        extraCard.appendChild(makeSwitch({
            label: 'Показывать только ошибки в просмотре',
            desc: 'По умолчанию отображаются только запросы с HTTP-ошибками и исключения.',
            checked: loadShowErrorsOnly(),
            onChange: (v) => {
                saveShowErrorsOnly(v);
                if (window.__netLoggerUI && typeof window.__netLoggerUI.setShowErrorsOnly === 'function') {
                    window.__netLoggerUI.setShowErrorsOnly(v);
                }
                showToast(v ? 'Режим ошибок включён' : 'Режим ошибок выключен');
            }
        }));
        root.appendChild(extraCard);
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
                replaceHeaders: !!rule.replaceHeaders,
                newBody: rule.newBody || '',
                clearBody: !!rule.clearBody,
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
            if (rule.newHeaders || rule.replaceHeaders) summaryParts.push('HDR');
            if (rule.newBody || rule.clearBody) summaryParts.push('BODY');
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
            secReq.appendChild(makeSwitch({
                label: 'Заменить весь набор заголовков',
                desc: 'Заголовки, которых нет в списке, будут удалены.',
                checked: working.replaceHeaders,
                onChange: (v) => { working.replaceHeaders = v; }
            }));

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
            bodyTa.addEventListener('input', () => {
                working.newBody = bodyTa.value;
                working.clearBody = false;
                clearBodySwitch.querySelector('input').checked = false;
            });
            secReq.appendChild(field('Новое тело', bodyTa));
            const clearBodySwitch = makeSwitch({
                label: 'Отправлять пустое тело',
                checked: working.clearBody,
                onChange: (v) => {
                    working.clearBody = v;
                    if (v) {
                        working.newBody = '';
                        bodyTa.value = '';
                    }
                    bodyTa.disabled = v;
                }
            });
            bodyTa.disabled = working.clearBody;
            secReq.appendChild(clearBodySwitch);
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

    function buildIgnoreRulesPanel(root) {
        buildSettingsHeader(root, {
            title: 'Правила логирования',
            subtitle: 'Совпавшие запросы не сохраняются в списке и не выводятся в Console. Сетевой запрос всё равно выполняется; это не исключение сайта.',
            iconName: 'ban'
        });

        const editorCard = makeCard('Добавить правило', 'plus');
        const urlRow = document.createElement('div');
        urlRow.className = 'nl-field-inline';
        const urlInput = document.createElement('input');
        urlInput.className = 'nl-input';
        urlInput.placeholder = 'Например, /api/private';
        urlInput.style.flex = '1';
        const matchType = document.createElement('select');
        matchType.className = 'nl-input';
        [['substring', 'Вхождение'], ['glob', 'Glob (*, ?)'], ['regex', 'Regex']].forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            matchType.appendChild(option);
        });
        urlRow.appendChild(urlInput);
        urlRow.appendChild(matchType);
        const urlField = makeField({
            label: 'URL-паттерн (необязательно)',
            hint: 'Substring ищет фрагмент URL; glob поддерживает * и ?; regex — регулярное выражение.'
        });
        urlField.inline.appendChild(urlRow);
        editorCard.appendChild(urlField);

        const methodInput = document.createElement('input');
        methodInput.className = 'nl-input';
        methodInput.placeholder = 'ANY или POST';
        const methodField = makeField({
            label: 'Метод (необязательно)',
            hint: 'Пример: POST. ANY или пустое поле не ограничивает метод.'
        });
        methodField.inline.appendChild(methodInput);
        editorCard.appendChild(methodField);

        const hostInput = document.createElement('input');
        hostInput.className = 'nl-input';
        hostInput.placeholder = 'example.com или *.example.com';
        const hostField = makeField({
            label: 'Хост (необязательно)',
            hint: 'Точное имя хоста или *.example.com для домена и поддоменов; без протокола и пути.'
        });
        hostField.inline.appendChild(hostInput);
        editorCard.appendChild(hostField);

        const formHint = document.createElement('div');
        formHint.className = 'nl-settings-desc';
        formHint.style.margin = '0';
        formHint.textContent = 'Заполните хотя бы одно поле. Если заполнено несколько, должны совпасть все условия.';
        editorCard.appendChild(formHint);

        const actions = document.createElement('div');
        actions.className = 'nl-excl-actions';
        editorCard.appendChild(actions);
        const listCard = makeCard('Список правил', 'ban');
        const listWrap = document.createElement('div');
        listWrap.className = 'nl-excl-list';
        listCard.appendChild(listWrap);
        root.appendChild(editorCard);
        root.appendChild(listCard);

        let editingId = null;
        const cancelButton = makeButton({ text: 'Отмена', size: 'sm', onClick: resetForm });
        cancelButton.style.display = 'none';
        const saveButton = makeButton({
            text: 'Добавить правило',
            iconName: 'plus',
            variant: 'primary',
            size: 'sm',
            onClick: saveRule
        });
        actions.appendChild(saveButton);
        actions.appendChild(cancelButton);

        function resetForm() {
            editingId = null;
            urlInput.value = '';
            matchType.value = 'substring';
            methodInput.value = '';
            hostInput.value = '';
            saveButton.querySelector('span').textContent = 'Добавить правило';
            cancelButton.style.display = 'none';
        }

        function saveRule() {
            const urlPattern = urlInput.value.trim();
            const rawMethod = methodInput.value.trim().toUpperCase();
            const method = !rawMethod || rawMethod === 'ANY' ? 'ANY' : rawMethod;
            const host = hostInput.value.trim().toLowerCase();
            if (!urlPattern && method === 'ANY' && !host) {
                showToast('Заполните хотя бы URL-паттерн, метод или хост');
                return;
            }
            if (method !== 'ANY' && !/^[A-Z0-9!#$%&'*+.^_~-]+$/.test(method)) {
                showToast('Некорректный HTTP-метод');
                return;
            }
            if (host) {
                const hostname = host.startsWith('*.') ? host.slice(2) : host;
                const labelPattern = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
                if ((host.includes('*') && !host.startsWith('*.'))
                    || !new RegExp(`^${labelPattern}(?:\\.${labelPattern})*$`, 'i').test(hostname)) {
                    showToast('Укажите хост как example.com или *.example.com');
                    return;
                }
            }
            if (urlPattern && matchType.value === 'regex') {
                try { new RegExp(urlPattern); }
                catch (error) {
                    showToast('Некорректное регулярное выражение: ' + error.message);
                    return;
                }
            }
            const rules = loadIgnoreRules();
            const rule = {
                id: editingId || newRuleId(),
                enabled: true,
                urlPattern,
                urlMatchType: matchType.value,
                method,
                host
            };
            const index = rules.findIndex(item => item.id === editingId);
            if (index >= 0) rules[index] = rule;
            else rules.push(rule);
            if (!saveIgnoreRules(rules)) return;
            resetForm();
            renderRules();
            showToast('Правило сохранено для последующих логов');
        }

        function describeRule(rule) {
            const parts = [];
            if (rule.urlPattern) parts.push(`${rule.urlMatchType || 'substring'}: ${rule.urlPattern}`);
            if (rule.method && rule.method !== 'ANY') parts.push('Метод: ' + rule.method);
            if (rule.host) parts.push('Хост: ' + rule.host);
            return parts.join(' · ') || 'Пустое правило';
        }

        function renderRules() {
            listWrap.innerHTML = '';
            const rules = loadIgnoreRules();
            if (!rules.length) {
                const empty = document.createElement('div');
                empty.className = 'nl-excl-empty';
                empty.textContent = 'Правил игнорирования пока нет.';
                listWrap.appendChild(empty);
                return;
            }
            rules.forEach(rule => {
                const item = document.createElement('div');
                item.className = 'nl-excl-item';
                const enabled = document.createElement('input');
                enabled.type = 'checkbox';
                enabled.className = 'nl-rule-enabled';
                enabled.checked = !!rule.enabled;
                enabled.title = 'Включить или выключить правило';
                enabled.addEventListener('change', () => {
                    const updated = loadIgnoreRules();
                    const target = updated.find(candidate => candidate.id === rule.id);
                    if (!target) return;
                    target.enabled = enabled.checked;
                    if (!saveIgnoreRules(updated)) enabled.checked = !enabled.checked;
                });
                item.appendChild(enabled);
                const summary = document.createElement('span');
                summary.className = 'nl-excl-host';
                summary.textContent = describeRule(rule);
                item.appendChild(summary);
                item.appendChild(makeButton({
                    text: 'Изменить',
                    iconName: 'edit',
                    size: 'sm',
                    onClick: () => {
                        editingId = rule.id;
                        urlInput.value = rule.urlPattern || '';
                        matchType.value = rule.urlMatchType || 'substring';
                        methodInput.value = rule.method || 'ANY';
                        hostInput.value = rule.host || '';
                        saveButton.querySelector('span').textContent = 'Сохранить';
                        cancelButton.style.display = '';
                        urlInput.focus();
                    }
                }));
                item.appendChild(makeButton({
                    text: '',
                    iconName: 'trash',
                    variant: 'danger',
                    size: 'sm',
                    onClick: () => {
                        const updated = loadIgnoreRules().filter(candidate => candidate.id !== rule.id);
                        if (!saveIgnoreRules(updated)) return;
                        if (editingId === rule.id) resetForm();
                        renderRules();
                        showToast('Правило удалено');
                    }
                }));
                listWrap.appendChild(item);
            });
        }

        renderRules();
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
            <div class="nl-about-row"><span class="nl-about-k">Хранилище:</span><span class="nl-about-v">Настройки — localStorage; логи при включённом сохранении — sessionStorage</span></div>
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
                 RULES_KEY, IGNORE_RULES_KEY, APPLY_KEY, COMPACT_KEY, BADGES_KEY, AUTOSCROLL_KEY,
                 PRETTY_KEY, SLOW_KEY, DEBUG_KEY, AUTO_OPEN_KEY, SHOW_ERRORS_KEY,
                 FAB_POSITION_KEY, UPDATE_CACHE_KEY, LOG_LIMIT_ENABLED_KEY,
                 LOG_PERSISTENCE_KEY, LOG_PERSISTENCE_MB_KEY, LOG_MAX_AGE_ENABLED_KEY,
                 LOG_MAX_AGE_MINUTES_KEY, LOG_MAX_SIZE_ENABLED_KEY, LOG_MAX_SIZE_MB_KEY,
                 LOG_IO_ENABLED_KEY, LOG_IMPORT_MAX_MB_KEY].forEach(k => {
                    try { localStorage.removeItem(k); } catch (_) {}
                });
                clearPersistedLogs();
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
                { id: 'rules', label: 'Правила подмены', icon: 'zap', build: (r) => buildRulesPanel(r) },
                { id: 'ignore-rules', label: 'Правила логирования', icon: 'ban', build: (r) => buildIgnoreRulesPanel(r) },
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
        let regexInput = null;
        let body = null;
        let filterBar = null;
        let sourceSelect = null;
        let methodSelect = null;
        let hostSelect = null;
        let sortSelect = null;
        let groupSelect = null;
        let slowInput = null;
        let searchError = null;
        let compareButton = null;
        let currentFilter = '';
        let regexSearch = false;
        let onlySlow = false;
        let sortMode = 'time-desc';
        let groupMode = 'none';
        let showOnlyErrors = loadShowErrorsOnly();
        const openRows = new Set();
        const revealedAuth = new Set();
        const selectedForDiff = new Set();

        function refreshCompareButton() {
            if (!compareButton) return;
            const label = compareButton.querySelector('span');
            if (label) label.textContent = `Сравнить (${selectedForDiff.size}/2)`;
            compareButton.disabled = selectedForDiff.size !== 2;
        }

        function recordHost(record) {
            try { return new URL(String(record.url || ''), location.href).hostname.toLowerCase(); } catch (_) { return ''; }
        }

        function updateOptions(select, options, fallback) {
            if (!select) return;
            const selected = select.value || 'all';
            select.innerHTML = '';
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = fallback;
            select.appendChild(allOption);
            options.forEach(([value, label]) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = label;
                select.appendChild(option);
            });
            if (selected !== 'all' && !options.some(([value]) => value === selected)) {
                const option = document.createElement('option');
                option.value = selected;
                option.textContent = selected;
                select.appendChild(option);
            }
            select.value = selected;
        }

        function matchesSearch(record, matcher, query) {
            if (!query) return true;
            const haystack = [
                record.url, record.method, record.status,
                formatResponse(record.response),
                formatBody(record.requestBody),
                (record.requestHeaders || []).map(([name, value]) => name + ':' + value).join('\n'),
                (record.responseHeaders || []).map(([name, value]) => name + ':' + value).join('\n'),
                (record.appliedRules || []).map(rule => rule.match).join('\n')
            ].join('\n');
            return matcher ? matcher.test(haystack) : haystack.toLowerCase().includes(query.toLowerCase());
        }

        function compareRecords(a, b, mode) {
            const [field, direction] = mode.split('-');
            const multiplier = direction === 'asc' ? 1 : -1;
            const valueFor = record => {
                if (field === 'time') {
                    const value = Date.parse(record.time || '');
                    return Number.isFinite(value) ? value : null;
                }
                if (field === 'status') return Number.isFinite(Number(record.status)) && record.status !== null && record.status !== '' ? Number(record.status) : null;
                if (field === 'duration') return record.duration != null && record.duration !== '' && Number.isFinite(Number(record.duration)) ? Number(record.duration) : null;
                return Number(record.requestSize || 0) + Number(record.responseSize || 0);
            };
            const first = valueFor(a);
            const second = valueFor(b);
            if (first === null) return second === null ? 0 : 1;
            if (second === null) return -1;
            return (first - second) * multiplier;
        }

        function groupLabel(record) {
            if (groupMode === 'host') return recordHost(record) || 'Неизвестный домен';
            if (groupMode === 'method') return String(record.method || 'GET').toUpperCase();
            try {
                const endpoint = new URL(String(record.url || ''), location.href);
                return endpoint.origin + endpoint.pathname;
            } catch (_) {
                return String(record.url || '').split(/[?#]/)[0] || 'Неизвестный endpoint';
            }
        }

        function highlightSearchMatches() {
            const query = currentFilter.trim();
            if (!query || !body) return;
            const source = regexSearch ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            let matcher;
            try { matcher = new RegExp(source, 'gi'); } catch (_) { return; }
            body.querySelectorAll('.nl-search-highlight-target').forEach(element => {
                const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
                const nodes = [];
                while (walker.nextNode()) nodes.push(walker.currentNode);
                nodes.forEach(node => {
                    matcher.lastIndex = 0;
                    const text = node.nodeValue;
                    let match;
                    let lastIndex = 0;
                    let changed = false;
                    const fragment = document.createDocumentFragment();
                    while ((match = matcher.exec(text)) !== null) {
                        changed = true;
                        if (match.index > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                        const mark = document.createElement('mark');
                        mark.className = 'nl-search-match';
                        mark.textContent = match[0];
                        fragment.appendChild(mark);
                        lastIndex = match.index + match[0].length;
                        if (match[0].length === 0) matcher.lastIndex++;
                    }
                    if (changed) {
                        if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
                        node.parentNode.replaceChild(fragment, node);
                    }
                });
            });
        }

        function setShowErrorsOnly(next) {
            const value = !!next;
            showOnlyErrors = value;
            saveShowErrorsOnly(value);
            if (body) render();
        }

        function render() {
            if (!body) return;
            const prevScrollTop = body.scrollTop;
            const wasAtBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 50;
            selectedForDiff.forEach(record => {
                if (!logs.includes(record)) selectedForDiff.delete(record);
            });
            refreshCompareButton();

            const q = currentFilter.trim();
            let matcher = null;
            if (regexSearch && q) {
                try {
                    matcher = new RegExp(q, 'i');
                    if (searchError) searchError.textContent = '';
                } catch (error) {
                    if (searchError) searchError.textContent = 'Некорректное регулярное выражение: ' + error.message;
                }
            } else if (searchError) {
                searchError.textContent = '';
            }
            const method = methodSelect ? methodSelect.value : 'all';
            const host = hostSelect ? hostSelect.value : 'all';
            const source = sourceSelect ? sourceSelect.value : 'all';
            const allHosts = [...new Set(logs.map(recordHost).filter(Boolean))].sort();
            updateOptions(methodSelect, [...new Set(logs.map(record => String(record.method || 'GET').toUpperCase()))].sort().map(value => [value, value]), 'Все методы');
            updateOptions(hostSelect, [
                ['@current', 'Текущий домен (' + location.hostname + ')'],
                ...allHosts.filter(value => value !== location.hostname.toLowerCase()).map(value => [value, value])
            ], 'Все домены');
            if (sourceSelect) sourceSelect.value = source;
            if (methodSelect) methodSelect.value = method;
            if (hostSelect) hostSelect.value = host;
            const isError = record => !!record.error || (typeof record.status === 'number' && record.status >= 400);
            const isSlowRecord = record => record.duration != null && record.duration > loadSlowThreshold();
            const regular = logs.filter(record => !pinnedLogs.has(record)).filter(record => {
                if (showOnlyErrors && !isError(record)) return false;
                if (onlySlow && !isSlowRecord(record)) return false;
                if (source !== 'all' && record.source !== source) return false;
                if (method !== 'all' && String(record.method || 'GET').toUpperCase() !== method) return false;
                const recordDomain = recordHost(record);
                if (host === '@current' && recordDomain !== location.hostname.toLowerCase()) return false;
                if (host !== 'all' && host !== '@current' && recordDomain !== host) return false;
                return matchesSearch(record, matcher, q) && (!regexSearch || !q || matcher !== null);
            });
            const pinned = logs.filter(record => pinnedLogs.has(record));
            const recordIndexes = new Map(logs.map((record, index) => [record, index]));
            const filtered = [...pinned, ...regular].sort((a, b) => {
                if (pinnedLogs.has(a) !== pinnedLogs.has(b)) return pinnedLogs.has(a) ? -1 : 1;
                return compareRecords(a, b, sortMode) || recordIndexes.get(a) - recordIndexes.get(b);
            });

            if (!filtered.length) {
                body.innerHTML = `<div class="nl-empty">${
                    logs.length ? 'Ничего не найдено по фильтру.' : 'Пока пусто. Сделайте действия на странице.'
                }</div>`;
                return;
            }

            const compact = loadCompact();
            const showBadges = loadShowBadges();
            const slowMs = loadSlowThreshold();

            const renderRecord = (r) => {
                const key = getRowKey(r);
                const isOpen = openRows.has(key);
                const idxDisplay = recordIndexes.get(r) + 1;
                const idxParam = idxDisplay - 1;
                const isPinned = pinnedLogs.has(r);
                const statusClass = r.status >= 400 || r.error ? 'err' : (r.status ? 'ok' : '');
                const statusText = r.error ? 'ERR' : (r.status || '-');
                const isSlow = r.duration != null && r.duration > slowMs;

                const applyReveal = (pairs) => {
                    if (!Array.isArray(pairs)) return pairs;
                    return pairs.map(([n, v]) => {
                        if (isSensitiveHeader(n) && revealedAuth.has(key + '::' + n + '::' + v)) {
                            return [n, v, 'revealed'];
                        }
                        return [n, v];
                    });
                };

                const reqHeadersHtml = renderHeaders(applyReveal(r.requestHeaders), 'нет заголовков запроса');
                const resHeadersHtml = renderHeaders(applyReveal(r.responseHeaders), 'нет заголовков ответа');
                const hasBody = r.requestBody !== null && r.requestBody !== undefined;
                const hasRules = r.appliedRules && r.appliedRules.length;
                const isHttpRequest = r.source === 'fetch' || r.source === 'xhr';
                const contentType = r.responseContentType || r.requestContentType || r.contentType;
                const contentTypeInfo = getContentTypeInfo(contentType);
                const requestCookies = (r.requestHeaders || []).filter(([name]) => isCookieHeader(name));
                const responseCookies = (r.responseHeaders || []).filter(([name]) => isCookieHeader(name));

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
                        <button type="button" class="nl-copy-btn" data-ignore="${idxParam}">${ICONS.ban}<span>Не логировать endpoint</span></button>
                        ${isHttpRequest ? `<button type="button" class="nl-copy-btn" data-edit="${idxParam}">${ICONS.edit}<span>Редактировать запрос</span></button>` : ''}
                        ${isHttpRequest ? `<button type="button" class="nl-copy-btn" data-replay="${idxParam}">${ICONS.zap}<span>Повторить</span></button>` : ''}
                        <button type="button" class="nl-copy-btn" data-copy="url" data-idx="${idxParam}">${ICONS.clipboard}<span>URL</span></button>
                        ${hasBody ? `<button type="button" class="nl-copy-btn" data-copy="body" data-idx="${idxParam}">${ICONS.clipboard}<span>Body</span></button>` : ''}
                        ${isHttpRequest ? `<button type="button" class="nl-copy-btn" data-copy="curl" data-idx="${idxParam}">${ICONS.clipboard}<span>cURL</span></button>` : ''}
                        ${isHttpRequest ? `<button type="button" class="nl-copy-btn" data-copy="fetch" data-idx="${idxParam}">${ICONS.clipboard}<span>fetch</span></button>` : ''}
                        ${isHttpRequest ? `<button type="button" class="nl-copy-btn" data-copy="xhr" data-idx="${idxParam}">${ICONS.clipboard}<span>XMLHttpRequest</span></button>` : ''}
                        ${isHttpRequest ? `<button type="button" class="nl-copy-btn" data-copy="headers" data-idx="${idxParam}">${ICONS.clipboard}<span>Headers</span></button>` : ''}
                        ${loadBool(LOG_IO_ENABLED_KEY, false) ? `<button type="button" class="nl-copy-btn" data-export-json="${idxParam}">${ICONS.download}<span>JSON</span></button>` : ''}
                        <button type="button" class="nl-copy-btn" data-copy="all" data-idx="${idxParam}">${ICONS.clipboard}<span>Full</span></button>
                    </div>
                `;

                const details = [];
                details.push(toolbar);
                details.push(`<div class="nl-kv"><div class="nl-k">URL</div><div class="nl-v nl-search-highlight-target">${escapeHtml(r.url || '')}</div></div>`);
                if (r.time) details.push(`<div class="nl-kv"><div class="nl-k">Time</div><div class="nl-v">${escapeHtml(r.time)}${r.duration != null ? ' (' + r.duration.toFixed(0) + ' ms)' : ''}</div></div>`);
                if (r.queryParams && r.queryParams.length) {
                    details.push(`<div class="nl-kv"><div class="nl-k">Query</div>${renderHeaders(r.queryParams, 'нет query-параметров')}</div>`);
                }
                if (r.requestSize != null || r.responseSize != null) {
                    const requestSize = r.requestSize == null
                        ? 'н/д'
                        : formatByteSize(r.requestSize) + (r.requestSizeSource ? ` (${r.requestSizeSource})` : '');
                    const responseSize = r.responseSize == null
                        ? 'н/д'
                        : formatByteSize(r.responseSize) + (r.responseSizeSource ? ` (${r.responseSizeSource})` : '');
                    details.push(`<div class="nl-kv"><div class="nl-k">Размер</div><div class="nl-v">Request: ${escapeHtml(requestSize)} · Response: ${escapeHtml(responseSize)}</div></div>`);
                }
                if (r.dispatchDuration != null) {
                    details.push(`<div class="nl-kv"><div class="nl-k">API dispatch</div><div class="nl-v">${r.dispatchDuration.toFixed(2)} ms</div></div>`);
                }
                if (r.requestContentType || r.responseContentType) {
                    const requestType = r.requestContentType
                        ? `${getContentTypeInfo(r.requestContentType).icon} ${escapeHtml(r.requestContentType)}`
                        : 'нет';
                    const responseType = r.responseContentType
                        ? `${getContentTypeInfo(r.responseContentType).icon} ${escapeHtml(r.responseContentType)}`
                        : 'нет';
                    details.push(`<div class="nl-kv"><div class="nl-k">Content-Type</div><div class="nl-v">Request: ${requestType}\nResponse: ${responseType}</div></div>`);
                }
                if (r.error) details.push(`<div class="nl-kv"><div class="nl-k">Error</div><div class="nl-v">${escapeHtml(r.error)}</div></div>`);
                if (r.eventName || r.lastEventId) {
                    details.push(`<div class="nl-kv"><div class="nl-k">Event</div><div class="nl-v">${escapeHtml(r.eventName || '')}${r.lastEventId ? '\nLast-Event-ID: ' + escapeHtml(r.lastEventId) : ''}</div></div>`);
                }
                if (r.beaconQueued !== undefined) {
                    details.push(`<div class="nl-kv"><div class="nl-k">Beacon</div><div class="nl-v">${r.beaconQueued ? 'Принят браузером в очередь' : 'Отклонён браузером'}</div></div>`);
                }
                if (hasRules) {
                    const ruleList = r.appliedRules.map(a => `${escapeHtml(a.method || 'ANY')} ${escapeHtml(a.match || '?')}${a.mocked ? ' (mock)' : ''}`).join('\n');
                    details.push(`<div class="nl-kv"><div class="nl-k">Applied rules</div><div class="nl-v">${ruleList}</div></div>`);
                }
                details.push(`<div class="nl-kv"><div class="nl-k">Request headers</div>${reqHeadersHtml}</div>`);
                if (requestCookies.length) {
                    details.push(`<div class="nl-kv"><div class="nl-k">Request cookies</div>${renderHeaders(applyReveal(requestCookies), 'нет')}</div>`);
                }
                if (hasBody) details.push(`<div class="nl-kv"><div class="nl-k">Request body</div><div class="nl-v nl-search-highlight-target">${formatBodyHtml(r.requestBody)}</div></div>`);
                details.push(`<div class="nl-kv"><div class="nl-k">Response headers</div>${resHeadersHtml}</div>`);
                if (responseCookies.length) {
                    details.push(`<div class="nl-kv"><div class="nl-k">Response cookies</div>${renderHeaders(applyReveal(responseCookies), 'нет')}</div>`);
                }
                if (r.responsePresent || (r.response !== null && r.response !== undefined)) {
                    details.push(`<div class="nl-kv"><div class="nl-k">Response body</div><div class="nl-v nl-search-highlight-target">${formatResponseHtml(r.response)}</div></div>`);
                }
                if (r.initiator) {
                    details.push(`<div class="nl-kv"><div class="nl-k">Initiator</div><div class="nl-v">${escapeHtml(r.initiator)}</div></div>`);
                }

                return `
                    <div class="nl-row${isOpen ? ' open' : ''}${selectedForDiff.has(r) ? ' compare-selected' : ''}" data-key="${key}" data-idx="${idxParam}">
                        <div class="nl-row-head">
                            <button type="button" class="nl-pin-btn${isPinned ? ' pinned' : ''}" data-pin="${idxParam}" aria-label="${isPinned ? 'Открепить запрос' : 'Закрепить запрос'}" aria-pressed="${isPinned}" title="${isPinned ? 'Открепить запрос' : 'Закрепить запрос'}">${isPinned ? ICONS.starFilled : ICONS.star}</button>
                            <input type="checkbox" class="nl-compare-select" data-compare="${idxParam}" aria-label="Выбрать запрос для сравнения" title="Выбрать для сравнения" ${selectedForDiff.has(r) ? 'checked' : ''}>
                            <span class="nl-method" data-m="${escapeHtml(r.method || 'GET')}">${escapeHtml(r.method || 'GET')}</span>
                            <span class="nl-status ${statusClass}">${escapeHtml(String(statusText))}</span>
                            ${badges.join('')}
                            <span class="nl-url nl-search-highlight-target" title="${escapeHtml(r.url || '')}">${escapeHtml(r.url || '')}</span>
                            <span class="nl-src">${escapeHtml(r.source || '?')}</span>
                            ${contentType ? `<span class="nl-content-type" title="${escapeHtml(contentType)}">${contentTypeInfo.icon}${contentTypeInfo.label}</span>` : ''}
                            <span class="nl-badge-time${isSlow ? ' slow' : ''}">${timeText}</span>
                            <span class="nl-chev">${ICONS.chevronRight}</span>
                        </div>
                        <div class="nl-row-details">
                            ${details.join('')}
                        </div>
                    </div>
                `;
            };

            const renderRecords = records => {
                if (groupMode === 'none') return records.map(renderRecord).join('');
                const groups = new Map();
                records.forEach(record => {
                    const label = groupLabel(record);
                    if (!groups.has(label)) groups.set(label, []);
                    groups.get(label).push(record);
                });
                return [...groups.entries()].map(([label, groupRecords]) =>
                    `<div class="nl-group-heading">${escapeHtml(label)} · ${groupRecords.length}</div>${groupRecords.map(renderRecord).join('')}`
                ).join('');
            };

            const pinnedRows = filtered.filter(record => pinnedLogs.has(record));
            const regularRows = filtered.filter(record => !pinnedLogs.has(record));
            const html = (pinnedRows.length
                ? `<div class="nl-pinned-heading">Закреплённые · ${pinnedRows.length}</div>${renderRecords(pinnedRows)}`
                : '') + renderRecords(regularRows);

            body.innerHTML = html;
            if (compact) body.classList.add('nl-compact');
            else body.classList.remove('nl-compact');
            hydrateAuthEyes(body);
            highlightSearchMatches();

            if (loadAutoScroll() && wasAtBottom) {
                body.scrollTop = body.scrollHeight;
            } else {
                body.scrollTop = prevScrollTop;
            }
        }

        function hydrateAuthEyes(root) {
            if (!root) return;
            root.querySelectorAll('.nl-header-sensitive .nl-eye').forEach(btn => {
                if (btn.dataset.hydrated === '1') return;
                btn.dataset.hydrated = '1';
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const row = btn.closest('.nl-header-sensitive');
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
                else if (action === 'xhr') text = buildXhr(r);
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

        function openEditRule(record) {
            const editorOverlay = buildOverlay();
            const built = buildModal({
                titleIcon: 'settings',
                titleText: 'Редактирование запроса',
                titleAccent: record.method || 'ANY'
            });
            const { modal, closeBtn } = built;
            const editorBody = document.createElement('div');
            editorBody.className = 'nl-modal-body';
            const form = document.createElement('div');
            form.style.display = 'flex';
            form.style.flexDirection = 'column';
            form.style.gap = '12px';
            const target = document.createElement('div');
            target.className = 'nl-settings-desc';
            target.style.margin = '0';
            target.textContent = String(record.url || '');
            form.appendChild(target);

            const requestHeadersSwitch = makeSwitch({
                label: 'Применить заголовки запроса',
                desc: 'Значения существующих заголовков будут обновлены, новые добавлены.',
                checked: true,
                onChange: () => {}
            });
            const requestHeadersInput = document.createElement('textarea');
            requestHeadersInput.className = 'nl-rule-textarea';
            requestHeadersInput.value = (record.requestHeaders || []).map(([name, value]) => `${name}: ${value}`).join('\n');
            const requestHeadersField = makeField({ label: 'Заголовки запроса', hint: 'Один заголовок на строку: Name: value' });
            requestHeadersField.inline.appendChild(requestHeadersInput);
            form.appendChild(requestHeadersSwitch);
            form.appendChild(requestHeadersField);

            const requestBodySwitch = makeSwitch({
                label: 'Применить тело запроса',
                checked: record.requestBody !== null && record.requestBody !== undefined,
                onChange: () => {}
            });
            const requestBodyInput = document.createElement('textarea');
            requestBodyInput.className = 'nl-rule-textarea';
            requestBodyInput.value = formatBody(record.requestBody);
            const requestBodyField = makeField({ label: 'Тело запроса', hint: 'Будет заменять тело в последующих совпадающих запросах.' });
            requestBodyField.inline.appendChild(requestBodyInput);
            form.appendChild(requestBodySwitch);
            form.appendChild(requestBodyField);

            const responseSwitch = makeSwitch({
                label: 'Подменять ответ',
                desc: 'Создаст mock-правило для последующих совпадающих запросов.',
                checked: false,
                onChange: () => {}
            });
            const responseStatusInput = document.createElement('input');
            responseStatusInput.className = 'nl-rule-input';
            responseStatusInput.type = 'number';
            responseStatusInput.min = '200';
            responseStatusInput.max = '599';
            responseStatusInput.value = String(record.status || 200);
            const responseStatusField = makeField({ label: 'Статус ответа' });
            responseStatusField.inline.appendChild(responseStatusInput);

            const responseHeadersInput = document.createElement('textarea');
            responseHeadersInput.className = 'nl-rule-textarea';
            responseHeadersInput.value = (record.responseHeaders || []).map(([name, value]) => `${name}: ${value}`).join('\n');
            const responseHeadersField = makeField({ label: 'Заголовки ответа', hint: 'Один заголовок на строку: Name: value' });
            responseHeadersField.inline.appendChild(responseHeadersInput);

            const responseBodyInput = document.createElement('textarea');
            responseBodyInput.className = 'nl-rule-textarea';
            responseBodyInput.value = formatResponse(record.response);
            const responseBodyField = makeField({ label: 'Тело ответа' });
            responseBodyField.inline.appendChild(responseBodyInput);

            form.appendChild(responseSwitch);
            form.appendChild(responseStatusField);
            form.appendChild(responseHeadersField);
            form.appendChild(responseBodyField);

            const actions = document.createElement('div');
            actions.className = 'nl-rule-actions';
            const closeEditor = () => {
                document.removeEventListener('keydown', onEditorKey, true);
                editorOverlay.remove();
            };
            const onEditorKey = (event) => {
                if (event.key === 'Escape') {
                    event.stopImmediatePropagation();
                    closeEditor();
                }
            };
            const headerInputEnabled = () => requestHeadersSwitch.querySelector('input').checked;
            const bodyInputEnabled = () => requestBodySwitch.querySelector('input').checked;
            const responseInputEnabled = () => responseSwitch.querySelector('input').checked;

            actions.appendChild(makeButton({
                text: 'Сохранить правило', iconName: 'check', variant: 'primary', size: 'sm',
                onClick: () => {
                    const editHeaders = headerInputEnabled();
                    const editBody = bodyInputEnabled();
                    const mockResponse = responseInputEnabled();
                    if (!editHeaders && !editBody && !mockResponse) {
                        showToast('Выберите, что нужно изменить');
                        return;
                    }
                    if (!String(record.url || '').trim()) {
                        showToast('У запроса отсутствует URL');
                        return;
                    }
                    const headerValues = [editHeaders ? requestHeadersInput.value : '', mockResponse ? responseHeadersInput.value : ''];
                    if (headerValues.some(value => value.split(/\r?\n/).some(line => {
                        const colon = line.indexOf(':');
                        return line.trim() && (colon <= 0 || !line.slice(0, colon).trim());
                    }))) {
                        showToast('Проверьте формат заголовков: Name: value');
                        return;
                    }
                    const status = parseInt(responseStatusInput.value, 10);
                    if (mockResponse && (!Number.isFinite(status) || status < 200 || status > 599)) {
                        showToast('Статус ответа должен быть от 200 до 599');
                        return;
                    }
                    const rule = {
                        id: newRuleId(),
                        enabled: true,
                        matchType: 'substring',
                        match: String(record.url || ''),
                        method: String(record.method || 'ANY').toUpperCase(),
                        newUrl: '',
                        newHeaders: editHeaders ? requestHeadersInput.value : '',
                        replaceHeaders: editHeaders,
                        newBody: editBody ? requestBodyInput.value : '',
                        clearBody: editBody && requestBodyInput.value === '',
                        bodyMode: 'raw',
                        mockStatus: mockResponse ? String(status) : '',
                        mockHeaders: mockResponse ? responseHeadersInput.value : '',
                        mockBody: mockResponse ? responseBodyInput.value : ''
                    };
                    const rules = loadRules();
                    rules.push(rule);
                    saveRules(rules);
                    if (!loadApplyRules()) saveApplyRules(true);
                    closeEditor();
                    showToast('Правило сохранено. Оно применяется к следующим совпадающим запросам.');
                }
            }));
            actions.appendChild(makeButton({
                text: 'Отмена', size: 'sm',
                onClick: closeEditor
            }));
            form.appendChild(actions);
            editorBody.appendChild(form);
            modal.appendChild(editorBody);
            editorOverlay.appendChild(modal);
            editorOverlay.addEventListener('click', event => {
                if (event.target === editorOverlay) closeEditor();
            });
            closeBtn.addEventListener('click', closeEditor);
            document.addEventListener('keydown', onEditorKey, true);
            document.body.appendChild(editorOverlay);
        }

        function openReplayRequest(record) {
            const replayOverlay = buildOverlay();
            const built = buildModal({
                titleIcon: 'zap',
                titleText: 'Повтор запроса',
                titleAccent: record.method || 'GET'
            });
            const { modal, closeBtn } = built;
            const replayBody = document.createElement('div');
            replayBody.className = 'nl-modal-body';
            const form = document.createElement('div');
            form.style.display = 'flex';
            form.style.flexDirection = 'column';
            form.style.gap = '12px';
            const warning = document.createElement('div');
            warning.className = 'nl-settings-desc';
            warning.textContent = 'Запрос будет отправлен только на origin текущей страницы. Повтор может повторно выполнить действие на сервере.';
            form.appendChild(warning);

            const urlInput = document.createElement('input');
            urlInput.className = 'nl-rule-input';
            urlInput.value = getFullUrl(record);
            const urlField = makeField({ label: 'URL' });
            urlField.inline.appendChild(urlInput);
            form.appendChild(urlField);

            const headersInput = document.createElement('textarea');
            headersInput.className = 'nl-rule-textarea';
            headersInput.value = (record.requestHeaders || []).map(([name, value]) => `${name}: ${value}`).join('\n');
            const headersField = makeField({ label: 'Заголовки', hint: 'Один заголовок на строку: Name: value' });
            headersField.inline.appendChild(headersInput);
            form.appendChild(headersField);

            const bodyInput = document.createElement('textarea');
            bodyInput.className = 'nl-rule-textarea';
            bodyInput.value = formatBody(record.requestBody);
            const bodyField = makeField({
                label: 'Тело запроса',
                hint: record.requestBody && record.requestBody.__type === 'FormData'
                    ? 'FormData и файлы показаны как текст; при необходимости восстановите их вручную.'
                    : 'Пустое поле отправляется без тела.'
            });
            bodyField.inline.appendChild(bodyInput);
            form.appendChild(bodyField);

            const actions = document.createElement('div');
            actions.className = 'nl-rule-actions';
            const closeReplay = () => {
                document.removeEventListener('keydown', onReplayKey, true);
                replayOverlay.remove();
            };
            const onReplayKey = event => {
                if (event.key === 'Escape') {
                    event.stopImmediatePropagation();
                    closeReplay();
                }
            };
            const replayButton = makeButton({
                text: 'Отправить повторно',
                iconName: 'zap',
                variant: 'primary',
                size: 'sm',
                onClick: async () => {
                    let target;
                    try {
                        target = new URL(urlInput.value, location.href);
                    } catch (_) {
                        showToast('Укажите корректный URL');
                        return;
                    }
                    if (target.origin !== location.origin) {
                        showToast('Повтор разрешён только для текущего origin');
                        return;
                    }
                    const lines = headersInput.value.split(/\r?\n/).filter(line => line.trim());
                    if (lines.some(line => {
                        const colon = line.indexOf(':');
                        return colon <= 0 || !line.slice(0, colon).trim();
                    })) {
                        showToast('Проверьте формат заголовков: Name: value');
                        return;
                    }
                    const headers = new Headers();
                    try {
                        lines.forEach(line => {
                            const colon = line.indexOf(':');
                            headers.append(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
                        });
                    } catch (error) {
                        showToast('Некорректные заголовки: ' + error.message);
                        return;
                    }
                    const method = String(record.method || 'GET').toUpperCase();
                    const body = bodyInput.value;
                    const canSendBody = !['GET', 'HEAD'].includes(method) && body !== '';
                    if (!window.confirm(`Повторно отправить ${method} ${target.href}? Сервер может повторно выполнить это действие.`)) return;
                    replayButton.disabled = true;
                    try {
                        const response = await window.fetch(target.href, {
                            method,
                            headers,
                            body: canSendBody ? body : undefined,
                            credentials: 'same-origin',
                            redirect: 'manual'
                        });
                        showToast(`Повтор выполнен: HTTP ${response.status}`);
                    } catch (error) {
                        showToast('Не удалось повторить запрос: ' + String(error));
                    } finally {
                        replayButton.disabled = false;
                    }
                }
            });
            actions.appendChild(replayButton);
            actions.appendChild(makeButton({ text: 'Отмена', size: 'sm', onClick: closeReplay }));
            form.appendChild(actions);
            replayBody.appendChild(form);
            modal.appendChild(replayBody);
            replayOverlay.appendChild(modal);
            replayOverlay.addEventListener('click', event => {
                if (event.target === replayOverlay) closeReplay();
            });
            closeBtn.addEventListener('click', closeReplay);
            document.addEventListener('keydown', onReplayKey, true);
            document.body.appendChild(replayOverlay);
        }

        function openDiff(first, second) {
            const diffOverlay = buildOverlay();
            const built = buildModal({ titleIcon: 'code', titleText: 'Сравнение запросов', titleAccent: 'diff' });
            const { modal, closeBtn } = built;
            const diffBody = document.createElement('div');
            diffBody.className = 'nl-modal-body';
            const sideBySide = (title, left, right) => {
                const changed = left !== right;
                return `<section class="nl-diff-section"><div class="nl-diff-title">${escapeHtml(title)}</div><div class="nl-diff-grid"><div class="nl-diff-side${changed ? ' changed' : ''}"><pre>${escapeHtml(left || '—')}</pre></div><div class="nl-diff-side${changed ? ' changed' : ''}"><pre>${escapeHtml(right || '—')}</pre></div></div></section>`;
            };
            const headerMap = pairs => {
                const values = new Map();
                (pairs || []).forEach(([name, value]) => {
                    const key = String(name).toLowerCase();
                    const safeValue = isSensitiveHeader(name) ? '[REDACTED]' : String(value);
                    const current = values.get(key);
                    values.set(key, {
                        name: current ? current.name : String(name),
                        value: current ? current.value + ', ' + safeValue : safeValue
                    });
                });
                return values;
            };
            const headerDiff = (title, leftPairs, rightPairs) => {
                const left = headerMap(leftPairs);
                const right = headerMap(rightPairs);
                const names = [...new Set([...left.keys(), ...right.keys()])].sort();
                const rows = names.map(name => {
                    const a = left.get(name);
                    const b = right.get(name);
                    const leftValue = a ? a.value : '—';
                    const rightValue = b ? b.value : '—';
                    return `<tr${leftValue !== rightValue ? ' class="changed"' : ''}><td>${escapeHtml((a || b).name)}</td><td>${escapeHtml(leftValue)}</td><td>${escapeHtml(rightValue)}</td></tr>`;
                }).join('');
                return `<section class="nl-diff-section"><div class="nl-diff-title">${escapeHtml(title)}</div><table class="nl-diff-table"><thead><tr><th>Заголовок</th><th>Запрос 1</th><th>Запрос 2</th></tr></thead><tbody>${rows || '<tr><td colspan="3">Нет заголовков</td></tr>'}</tbody></table></section>`;
            };
            const firstLabel = `${first.method || 'GET'} ${getFullUrl(first)}`;
            const secondLabel = `${second.method || 'GET'} ${getFullUrl(second)}`;
            diffBody.innerHTML = sideBySide('Запросы', firstLabel, secondLabel)
                + sideBySide('Статус', String(first.status || '—'), String(second.status || '—'))
                + headerDiff('Заголовки запроса', first.requestHeaders, second.requestHeaders)
                + sideBySide('Тело запроса', formatBody(first.requestBody), formatBody(second.requestBody))
                + headerDiff('Заголовки ответа', first.responseHeaders, second.responseHeaders)
                + sideBySide('Тело ответа', formatResponse(first.response), formatResponse(second.response));
            const closeDiff = () => {
                document.removeEventListener('keydown', onDiffKey, true);
                diffOverlay.remove();
            };
            const onDiffKey = event => {
                if (event.key === 'Escape') {
                    event.stopImmediatePropagation();
                    closeDiff();
                }
            };
            diffOverlay.addEventListener('click', event => {
                if (event.target === diffOverlay) closeDiff();
            });
            closeBtn.addEventListener('click', closeDiff);
            document.addEventListener('keydown', onDiffKey, true);
            modal.appendChild(diffBody);
            diffOverlay.appendChild(modal);
            document.body.appendChild(diffOverlay);
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

            const searchWrap = document.createElement('div');
            searchWrap.className = 'nl-search-wrap';
            searchInput = document.createElement('input');
            searchInput.className = 'nl-input nl-input--search';
            searchInput.type = 'search';
            searchInput.placeholder = 'Поиск по URL / методу / заголовкам / телу / ответу...';
            searchInput.value = currentFilter;
            searchInput.addEventListener('input', () => {
                currentFilter = searchInput.value;
                render();
            });
            searchWrap.appendChild(searchInput);
            const regexLabel = document.createElement('label');
            regexLabel.className = 'nl-search-regex';
            regexInput = document.createElement('input');
            regexInput.type = 'checkbox';
            regexInput.checked = regexSearch;
            regexInput.addEventListener('change', () => {
                regexSearch = regexInput.checked;
                render();
            });
            regexLabel.appendChild(regexInput);
            regexLabel.appendChild(document.createTextNode('Regex'));
            searchWrap.appendChild(regexLabel);
            tools.appendChild(searchWrap);

            filterBar = document.createElement('div');
            filterBar.className = 'nl-viewer-filters';
            const createFilterSelect = (label, options, onChange) => {
                const select = document.createElement('select');
                select.className = 'nl-input nl-filter-select';
                select.setAttribute('aria-label', label);
                select.title = label;
                options.forEach(([value, text]) => {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = text;
                    select.appendChild(option);
                });
                select.addEventListener('change', onChange);
                filterBar.appendChild(select);
                return select;
            };
            sourceSelect = createFilterSelect('Фильтр по типу запроса', [
                ['all', 'Все типы'],
                ['fetch', 'fetch'],
                ['xhr', 'XHR'],
                ['websocket', 'WebSocket'],
                ['eventsource', 'EventSource'],
                ['beacon', 'Beacon']
            ], render);
            methodSelect = createFilterSelect('Фильтр по методу', [['all', 'Все методы']], render);
            hostSelect = createFilterSelect('Фильтр по домену', [['all', 'Все домены']], render);
            const slowLabel = document.createElement('label');
            slowLabel.className = 'nl-viewer-slow';
            slowInput = document.createElement('input');
            slowInput.type = 'checkbox';
            slowInput.checked = onlySlow;
            slowInput.addEventListener('change', () => {
                onlySlow = slowInput.checked;
                render();
            });
            slowLabel.appendChild(slowInput);
            slowLabel.appendChild(document.createTextNode('Только медленные'));
            filterBar.appendChild(slowLabel);
            sortSelect = createFilterSelect('Сортировка запросов', [
                ['time-desc', 'Время: новые'],
                ['time-asc', 'Время: старые'],
                ['status-asc', 'Статус: по возрастанию'],
                ['status-desc', 'Статус: по убыванию'],
                ['duration-desc', 'Длительность: больше'],
                ['duration-asc', 'Длительность: меньше'],
                ['size-desc', 'Размер: больше'],
                ['size-asc', 'Размер: меньше']
            ], () => {
                sortMode = sortSelect.value;
                render();
            });
            sortSelect.value = sortMode;
            groupSelect = createFilterSelect('Группировка запросов', [
                ['none', 'Без группировки'],
                ['endpoint', 'По endpoint'],
                ['host', 'По домену'],
                ['method', 'По методу']
            ], () => {
                groupMode = groupSelect.value;
                render();
            });
            groupSelect.value = groupMode;
            searchError = document.createElement('div');
            searchError.className = 'nl-search-error';
            searchError.setAttribute('role', 'status');
            filterBar.appendChild(searchError);

            const toggleErrorsBtn = makeButton({
                text: showOnlyErrors ? 'Ошибки: on' : 'Ошибки', iconName: 'info', variant: showOnlyErrors ? 'danger' : '',
                onClick: () => {
                    setShowErrorsOnly(!showOnlyErrors);
                    const label = toggleErrorsBtn.querySelector('span');
                    if (label) label.textContent = showOnlyErrors ? 'Ошибки: on' : 'Ошибки';
                    toggleErrorsBtn.classList.toggle('nl-btn--danger', showOnlyErrors);
                    render();
                }
            });
            tools.appendChild(toggleErrorsBtn);

            const pauseButton = makeButton({
                text: window.__netLogger.paused ? 'Возобновить' : 'Пауза',
                iconName: window.__netLogger.paused ? 'play' : 'pause',
                onClick: () => setLoggingPaused(!window.__netLogger.paused)
            });
            pauseButton.dataset.netloggerPause = '1';
            pauseButton.setAttribute('aria-pressed', window.__netLogger.paused ? 'true' : 'false');
            tools.appendChild(pauseButton);

            tools.appendChild(makeButton({
                text: 'Развернуть все запросы', iconName: 'chevronDown',
                onClick: () => {
                    const all = logs.map((r) => getRowKey(r));
                    all.forEach(k => openRows.add(k));
                    render();
                }
            }));
            tools.appendChild(makeButton({
                text: 'Свернуть все запросы', iconName: 'chevronRight',
                onClick: () => {
                    openRows.clear();
                    render();
                }
            }));
            tools.appendChild(makeButton({
                text: 'Скачать', iconName: 'download', variant: 'primary',
                onClick: () => {
                    if (!logs.length) { alert('Пока пусто.'); return; }
                    downloadReport(logs);
                }
            }));
            tools.appendChild(makeButton({
                text: 'HAR', iconName: 'download',
                onClick: () => {
                    if (!logs.length) { showToast('Пока пусто.'); return; }
                    const harLogs = logs.filter(record => ['fetch', 'xhr', 'beacon'].includes(record.source));
                    if (!harLogs.length) {
                        showToast('В HAR включаются fetch, XHR и Beacon; WebSocket и EventSource не поддерживаются.');
                        return;
                    }
                    downloadHar(harLogs);
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
            compareButton = makeButton({
                text: `Сравнить (${selectedForDiff.size}/2)`,
                iconName: 'code',
                onClick: () => {
                    if (selectedForDiff.size !== 2) {
                        showToast('Выберите ровно два запроса');
                        return;
                    }
                    const [first, second] = selectedForDiff;
                    openDiff(first, second);
                }
            });
            compareButton.disabled = selectedForDiff.size !== 2;
            tools.appendChild(compareButton);
            tools.appendChild(makeButton({
                text: 'Очистить', iconName: 'trash', variant: 'danger',
                onClick: () => {
                    clearLogs(true);
                    openRows.clear();
                    revealedAuth.clear();
                    render();
                }
            }));
            modal.appendChild(filterBar);
            body = document.createElement('div');
            body.className = 'nl-modal-body';
            body.addEventListener('click', async (e) => {
                if (e.target.closest('.nl-eye')) return;
                const pinBtn = e.target.closest('[data-pin]');
                if (pinBtn) {
                    e.stopPropagation();
                    const record = logs[parseInt(pinBtn.dataset.pin, 10)];
                    if (!record) return;
                    if (pinnedLogs.has(record)) pinnedLogs.delete(record);
                    else pinnedLogs.add(record);
                    trimLogs();
                    render();
                    return;
                }
                const compareInput = e.target.closest('[data-compare]');
                if (compareInput) {
                    e.stopPropagation();
                    const record = logs[parseInt(compareInput.dataset.compare, 10)];
                    if (!record) return;
                    if (compareInput.checked) {
                        if (!selectedForDiff.has(record) && selectedForDiff.size >= 2) {
                            compareInput.checked = false;
                            showToast('Для сравнения можно выбрать только два запроса');
                            return;
                        }
                        selectedForDiff.add(record);
                    } else {
                        selectedForDiff.delete(record);
                    }
                    render();
                    return;
                }
                const ignoreBtn = e.target.closest('[data-ignore]');
                if (ignoreBtn) {
                    e.stopPropagation();
                    const record = logs[parseInt(ignoreBtn.dataset.ignore, 10)];
                    if (record) addIgnoreEndpointRule(record);
                    return;
                }
                const replayBtn = e.target.closest('[data-replay]');
                if (replayBtn) {
                    e.stopPropagation();
                    const record = logs[parseInt(replayBtn.dataset.replay, 10)];
                    if (record) openReplayRequest(record);
                    return;
                }
                const exportJsonBtn = e.target.closest('[data-export-json]');
                if (exportJsonBtn) {
                    e.stopPropagation();
                    const index = parseInt(exportJsonBtn.dataset.exportJson, 10);
                    const record = logs[index];
                    if (!record) {
                        showToast('Запись не найдена');
                        return;
                    }
                    const filename = `api-tools-request-${index + 1}.json`;
                    downloadJsonFile(filename, recordForJsonExport(record));
                    return;
                }
                const editBtn = e.target.closest('[data-edit]');
                if (editBtn) {
                    e.stopPropagation();
                    const record = logs[parseInt(editBtn.dataset.edit, 10)];
                    if (record) openEditRule(record);
                    return;
                }
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
            regexInput = null;
            filterBar = null;
            sourceSelect = null;
            methodSelect = null;
            hostSelect = null;
            sortSelect = null;
            groupSelect = null;
            slowInput = null;
            searchError = null;
            compareButton = null;
        }

        return { open, close, refresh: render, setShowErrorsOnly, isOpen: () => !!overlay };
    }

    function createUI() {
        injectStyles();
        const box = document.createElement('div');
        box.id = '__netLoggerUI';
        box.dataset.position = loadFabPosition();
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
        const pauseButton = makeButton({
            text: window.__netLogger.paused ? 'Возобновить' : 'Пауза',
            iconName: window.__netLogger.paused ? 'play' : 'pause',
            onClick: () => setLoggingPaused(!window.__netLogger.paused)
        });
        pauseButton.dataset.netloggerPause = '1';
        pauseButton.setAttribute('aria-pressed', window.__netLogger.paused ? 'true' : 'false');
        actions.appendChild(pauseButton);
        actions.appendChild(makeButton({
            text: 'Очистить', iconName: 'trash', variant: 'danger',
            onClick: () => clearLogs(false)
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
        const setPosition = (position) => {
            const allowed = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
            box.dataset.position = allowed.includes(position) ? position : 'bottom-right';
        };

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
        window.__netLoggerUI.setPosition = setPosition;
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
