// ==UserScript==
// @name         1TamilMV Anti-Redirect and Adblocker (Master Nullifier)
// @namespace    http://tampermonkey.net/
// @version      5.2
// @description  Completely nullifies low-level ad execution paths on 1TamilMV by hooking prototypes (createElement, setAttribute, addEventListener) and pre-defining bypass global flags.
// @author       Antigravity
// @match        *://*.1tamilmv.li/*
// @match        *://*.1tamilmv.observer/*
// @match        *://*.1tamilmv.promo/*
// @match        *://*.1tamilmv.reisen/*
// @match        *://*.1tamilmv.world/*
// @match        *://*.1tamilmv.lol/*
// @match        *://*.1tamilmv.life/*
// @match        *://*.1tamilmv.win/*
// @match        *://*.1tamilmv.link/*
// @match        *://*.1tamilmv.*/*
// @match        *://*.tamilmv.*/*
// @include      /^https?:\/\/([^\/]+\.)?1?tamilmv\.[a-z0-9]+/
// @updateURL    https://raw.githubusercontent.com/Akash-Sriram/1tamilmv-anti-redirect/main/1tamilmv_adblocker.user.js
// @downloadURL  https://raw.githubusercontent.com/Akash-Sriram/1tamilmv-anti-redirect/main/1tamilmv_adblocker.user.js
// @run-at       document-start
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    // Access the page's real window object
    const rootWindow = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;

    const currentHost = rootWindow.location.hostname;
    const baseDomain = currentHost.replace(/^www\./, '');

    const log = (msg, level = 'info') => {
        const styles = {
            info: 'color: #3b82f6; font-weight: bold;',
            warn: 'color: #f59e0b; font-weight: bold;',
            error: 'color: #ef4444; font-weight: bold;'
        };
        console.log(`%c[Anti-Redirect Master] ${msg}`, styles[level] || styles.info);
    };

    // Trusted whitelist domains
    const allowedDomains = [
        baseDomain,
        'googletagmanager.com',
        'google-analytics.com',
        'jsdelivr.net',
        'fonts.googleapis.com',
        'fonts.gstatic.com',
        'cloudflare.com',
        'recaptcha.net',
        'google.com',
        't.me',
        'telegram.org'
    ];

    function isAllowed(url) {
        if (!url || url.trim() === '' || url.startsWith('javascript:')) return true;
        if (url === 'about:blank') return true;
        try {
            const parsed = new URL(url, rootWindow.location.origin);
            return allowedDomains.some(domain => parsed.hostname.endsWith(domain));
        } catch (e) {
            return false; // Block malformed or suspicious URLs
        }
    }

    // Identifies if code patterns look like typical ad network/popunder mechanisms
    function isSuspiciousCode(code) {
        if (!code) return false;
        const suspiciousPatterns = [
            'popunder',
            'popads',
            'exoclick',
            'propellerads',
            'onclick',
            '_0x', // Obfuscated variables
            'aHR0cD', // Base64 http
            'aHR0cH', // Base64 https
            'window.open',
            'document.createElement(\'script\')'
        ];
        return suspiciousPatterns.some(pattern => code.includes(pattern));
    }

    // Inspects call stack to determine if caller is suspicious
    function isSuspiciousStack(stack) {
        if (!stack) return false;
        const lines = stack.split('\n');
        for (let line of lines) {
            // Check for keywords in stack frame URLs
            if (line.includes('pop') || line.includes('adblock') || line.includes('adshield') || line.includes('layer') || line.includes('punder') || line.includes('redirect')) {
                return true;
            }
            // Parse URL from stack frame if present
            const match = line.match(/(https?:\/\/[^\s)]+)/);
            if (match) {
                try {
                    const parsedUrl = new URL(match[1]);
                    if (!isAllowed(parsedUrl.href)) {
                        return true;
                    }
                } catch(e) {}
            }
        }
        return false;
    }

    log('Injecting master filters...');

    // ==========================================
    // 1. DUMMY GLOBAL VARIABLES (Self-Block)
    // ==========================================
    try {
        const adFlag = "d2fbd55a34c782923531c6e924220ccd";
        rootWindow[adFlag] = [["siteId", 0], ["default", false]];
        rootWindow[adFlag.slice(0, 16) + adFlag.slice(0, 16)] = true;
        log('Pre-defined ad-script termination flags.', 'info');
    } catch (e) {
        log('Failed to pre-define flags: ' + e.message, 'error');
    }

    // ==========================================
    // 2. HOOK ELEMENT.SETATTRIBUTE
    // ==========================================
    try {
        const originalSetAttribute = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name, value) {
            const tag = this.tagName.toLowerCase();
            const attr = name.toLowerCase();

            if (tag === 'script' && attr === 'src') {
                if (!isAllowed(value)) {
                    log(`Blocked setAttribute('src') targeting: ${value}`, 'warn');
                    return;
                }
            }

            if (tag === 'a' && attr === 'href') {
                if (!isAllowed(value)) {
                    log(`Blocked setAttribute('href') targeting: ${value}`, 'warn');
                    return;
                }
            }

            return originalSetAttribute.apply(this, arguments);
        };
        log('Hooked Element.prototype.setAttribute.', 'info');
    } catch (e) {
        log('Failed to hook setAttribute: ' + e.message, 'error');
    }

    // ==========================================
    // 3. HOOK DOCUMENT.CREATEELEMENT
    // ==========================================
    try {
        const originalCreateElement = Document.prototype.createElement;
        Document.prototype.createElement = function(tagName) {
            const el = originalCreateElement.apply(this, arguments);
            const tag = tagName.toLowerCase();

            if (tag === 'script') {
                Object.defineProperty(el, 'src', {
                    set(value) {
                        if (!isAllowed(value)) {
                            log(`Blocked script.src write targeting: ${value}`, 'warn');
                            return;
                        }
                        Element.prototype.setAttribute.call(this, 'src', value);
                    },
                    get() {
                        return this.getAttribute('src');
                    },
                    configurable: true
                });
            }

            if (tag === 'a') {
                const originalClick = el.click;
                el.click = function() {
                    const href = el.href;
                    if (href && !isAllowed(href)) {
                        log(`Blocked synthetic anchor click to: ${href}`, 'warn');
                        return;
                    }
                    return originalClick.apply(this, arguments);
                };
            }

            return el;
        };
        log('Hooked Document.prototype.createElement.', 'info');
    } catch (e) {
        log('Failed to hook Document.prototype.createElement: ' + e.message, 'error');
    }

    // ==========================================
    // 4. HOOK NODE INSERTIONS (Bypasses innerHTML writes/appends of ads)
    // ==========================================
    try {
        const originalAppendChild = Node.prototype.appendChild;
        Node.prototype.appendChild = function(child) {
            if (child && child.tagName && child.tagName.toLowerCase() === 'script') {
                const src = child.src || child.getAttribute('src');
                if (src && !isAllowed(src)) {
                    log(`Blocked appendChild targeting script src: ${src}`, 'warn');
                    return child;
                }
                const content = child.textContent || child.innerHTML || '';
                if (isSuspiciousCode(content)) {
                    log('Blocked inline script appendChild containing suspicious code.', 'warn');
                    return child;
                }
            }
            return originalAppendChild.apply(this, arguments);
        };

        const originalInsertBefore = Node.prototype.insertBefore;
        Node.prototype.insertBefore = function(child, reference) {
            if (child && child.tagName && child.tagName.toLowerCase() === 'script') {
                const src = child.src || child.getAttribute('src');
                if (src && !isAllowed(src)) {
                    log(`Blocked insertBefore targeting script src: ${src}`, 'warn');
                    return child;
                }
                const content = child.textContent || child.innerHTML || '';
                if (isSuspiciousCode(content)) {
                    log('Blocked inline script insertBefore containing suspicious code.', 'warn');
                    return child;
                }
            }
            return originalInsertBefore.apply(this, arguments);
        };
        log('Hooked Node prototype insertions.', 'info');
    } catch (e) {
        log('Failed to hook Node prototype insertions: ' + e.message, 'error');
    }

    // ==========================================
    // 5. HOOK EVENTTARGET.ADDEVENTLISTENER (Block Click Hijackers)
    // ==========================================
    try {
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (type === 'click' || type === 'mousedown' || type === 'mouseup' || type === 'pointerdown' || type === 'touchstart') {
                const stack = new Error().stack || '';
                if (isSuspiciousStack(stack)) {
                    log(`Blocked suspicious ${type} event listener registration.`, 'warn');
                    return;
                }
            }
            return originalAddEventListener.apply(this, arguments);
        };
        log('Hooked EventTarget.prototype.addEventListener.', 'info');
    } catch (e) {
        log('Failed to hook addEventListener: ' + e.message, 'error');
    }

    // ==========================================
    // 6. FUNCTION TO PATCH WINDOW CONTEXTS
    // ==========================================
    function patchWindowContext(win) {
        if (!win || win.__antiRedirectPatched) return;
        win.__antiRedirectPatched = true;

        const originalOpen = win.open;
        win.open = function(url, name, specs) {
            const stack = new Error().stack || '';
            if (url) {
                if (!isAllowed(url)) {
                    log(`Blocked window.open targeting: ${url}`, 'warn');
                    return null;
                }
            } else {
                if (isSuspiciousStack(stack)) {
                    log(`Blocked blank window.open due to suspicious stack trace.`, 'warn');
                    return null;
                }
            }
            const newWin = Function.prototype.apply.call(originalOpen, this, arguments);
            if (newWin) {
                try {
                    patchWindowContext(newWin);
                } catch (e) {}
            }
            return newWin;
        };
    }

    // Patch the root window context
    patchWindowContext(rootWindow);
    log('Hooked window.open.', 'info');

    // ==========================================
    // 7. HOOK IFRAME PROTOTYPES (Prevent contentWindow steal)
    // ==========================================
    try {
        const originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
            get() {
                const win = originalContentWindow.get.call(this);
                if (win) {
                    try {
                        patchWindowContext(win);
                    } catch (e) {}
                }
                return win;
            },
            configurable: true
        });

        const originalContentDocument = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentDocument');
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', {
            get() {
                const doc = originalContentDocument.get.call(this);
                if (doc && doc.defaultView) {
                    try {
                        patchWindowContext(doc.defaultView);
                    } catch (e) {}
                }
                return doc;
            },
            configurable: true
        });
        log('Hooked iframe content contexts.', 'info');
    } catch (e) {
        log('Failed to patch iframe context: ' + e.message, 'error');
    }

    // ==========================================
    // 8. LOCK DOWN ANCHOR HREFS
    // ==========================================
    try {
        const originalHrefProp = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'href');
        Object.defineProperty(HTMLAnchorElement.prototype, 'href', {
            set(value) {
                if (value && !isAllowed(value)) {
                    log(`Blocked dynamic href assignment targeting: ${value}`, 'warn');
                    return;
                }
                originalHrefProp.set.call(this, value);
            },
            get() {
                return originalHrefProp.get.call(this);
            },
            configurable: true
        });
    } catch (e) {}

    // ==========================================
    // 9. INJECT CSP META
    // ==========================================
    try {
        const cspRules = [
            `script-src 'self' 'unsafe-inline' 'unsafe-eval' *://${baseDomain} *://*.${baseDomain} https://*.googletagmanager.com https://*.google-analytics.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://ajax.googleapis.com`,
            `connect-src 'self' *://${baseDomain} *://*.${baseDomain} https://*.googletagmanager.com https://*.google-analytics.com`,
            `frame-src 'self' *://${baseDomain} *://*.${baseDomain}`
        ].join('; ');

        const meta = rootWindow.document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = cspRules;
        (rootWindow.document.head || rootWindow.document.documentElement).appendChild(meta);
    } catch (e) {}

})();
