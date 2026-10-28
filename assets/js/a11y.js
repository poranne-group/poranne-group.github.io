/*
 * Accessibility toolbar: a hexagon tab on the left edge that opens a small panel with
 * high contrast, dark mode, text size, stop motion and underline links.
 * Choices are remembered across pages (localStorage). Load in <head> so the saved
 * mode is applied before the page paints.
 */
(function () {
    var KEY = 'a11y-prefs';
    var root = document.documentElement;
    var prefs = {};
    try { prefs = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}

    function save() { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} }

    function applyClasses() {
        root.classList.toggle('a11y-dark', !!prefs.dark);
        root.classList.toggle('a11y-still', !!prefs.still);
        root.classList.toggle('a11y-links', !!prefs.links);
        root.classList.toggle('a11y-contrast', !!prefs.contrast);
    }
    applyClasses();

    // ---------- high contrast: darken any text (or text background) that is below 4.5:1 ----------
    function parse(c) {
        var m = c && c.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        var p = m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat);
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    function lum(c) {
        var v = [c.r, c.g, c.b].map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
        return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    }
    function ratio(a, b) { var l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
    function darker(c, k) { return { r: c.r * k, g: c.g * k, b: c.b * k, a: 1 }; }
    function css(c) { return 'rgb(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ')'; }

    // the element whose solid background sits behind el (null if it is an image or gradient)
    function backdrop(el) {
        for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
            var s = getComputedStyle(n);
            var bg = parse(s.backgroundColor);
            if (bg && bg.a > 0.5) return { el: n, c: bg };
            if (s.backgroundImage !== 'none') return null;
        }
        return { el: document.body, c: { r: 255, g: 255, b: 255, a: 1 } };
    }

    // only recolour small backgrounds (buttons, badges); white text over a whole section sits on a picture or SVG
    function isChip(bg, el) {
        var r = bg.getBoundingClientRect();
        return bg !== document.body && r.width * r.height < 60000 && (bg === el || bg.contains(el));
    }

    var changed = [];
    function fixContrast() {
        var els = document.body.querySelectorAll('*');
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (el.closest('svg, .a11y-panel, .a11y-toggle, script, style')) continue;
            // a link sitting inside running text must not rely on colour alone
            if (el.tagName === 'A' && !el.closest('nav, .navbar') && [].some.call(el.parentNode.childNodes, function (n) { return n.nodeType === 3 && n.nodeValue.trim(); })) {
                changed.push([el, 'text-decoration', el.style.getPropertyValue('text-decoration'), el.style.getPropertyPriority('text-decoration')]);
                el.style.setProperty('text-decoration', 'underline', 'important');
            }
            var hasText = el.matches('input, select, textarea, button');
            for (var t = el.firstChild; t && !hasText; t = t.nextSibling) hasText = t.nodeType === 3 && t.nodeValue.trim();
            if (!hasText || !el.getClientRects().length) continue;
            var fg = parse(getComputedStyle(el).color), bd = backdrop(el);
            if (!fg || !bd || ratio(fg, bd.c) >= 4.5) continue;
            if (lum(bd.c) > lum(fg)) {           // dark-ish text on a light background: darken the text
                var f = fg;
                for (var k = 0; k < 60 && ratio(f, bd.c) < 4.6; k++) f = darker(f, 0.94);
                changed.push([el, 'color', el.style.getPropertyValue('color'), el.style.getPropertyPriority('color')]);
                el.style.setProperty('color', css(f), 'important');
            } else if (isChip(bd.el, el) && !bd.el.hasAttribute('data-a11y-bg')) {   // light text on a coloured chip: darken the chip
                var b = bd.c;
                for (var j = 0; j < 60 && ratio(fg, b) < 4.6; j++) b = darker(b, 0.94);
                bd.el.setAttribute('data-a11y-bg', '');
                changed.push([bd.el, 'background-color', bd.el.style.getPropertyValue('background-color'), bd.el.style.getPropertyPriority('background-color')]);
                bd.el.style.setProperty('background-color', css(b), 'important');
            }
        }
    }
    function undoContrast() {
        changed.forEach(function (c) {
            c[0].style.setProperty(c[1], c[2], c[3]);
            c[0].removeAttribute('data-a11y-bg');
        });
        changed = [];
    }
    // news strip, publication filters etc. redraw content: re-check after they do
    var pending, observer = new MutationObserver(function () {
        clearTimeout(pending);
        pending = setTimeout(function () { observer.disconnect(); if (prefs.contrast) fixContrast(); if (prefs.dark) setDark(true); watch(); }, 150);
    });
    function watch() { observer.observe(document.body, { childList: true, subtree: true }); }
    function setContrast(on) {
        observer.disconnect(); undoContrast();
        if (on) fixContrast();
        if (prefs.contrast || prefs.dark) watch();
    }

    // ---------- dark mode: the page is inverted in CSS; coloured blocks (header, hexagons, buttons) are
    // inverted back so they keep their real colours ----------
    function colourful(s) {
        if (/url\(/.test(s.backgroundImage)) return true;
        var cols = (s.backgroundImage.match(/rgba?\([^)]+\)/g) || []).concat(s.backgroundColor);
        return cols.some(function (x) {
            var c = parse(x);
            return c && c.a >= 0.5 && Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) > 40;
        });
    }
    function setDark(on) {
        document.querySelectorAll('.a11y-keep').forEach(function (e) { e.classList.remove('a11y-keep'); });
        if (!on) return;
        var els = document.body.querySelectorAll('*');
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (el.closest('.a11y-keep, .a11y-panel, .a11y-toggle, svg')) continue;
            if (colourful(getComputedStyle(el))) el.classList.add('a11y-keep');
        }
    }

    function setSize(z) { document.body.style.zoom = z === 1 ? '' : z; }

    // ---------- the panel ----------
    var ICONS = {
        contrast: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
        dark: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
        still: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/></svg>',
        links: '<svg viewBox="0 0 24 24"><path d="M9 15l6-6M10 6l1-1a4 4 0 0 1 6 6l-1 1M14 18l-1 1a4 4 0 0 1-6-6l1-1M5 21h14"/></svg>'
    };
    var OPTS = [['contrast', 'High contrast'], ['dark', 'Dark mode'], ['still', 'Stop motion'], ['links', 'Underline links']];
    var SIZES = [[1, 'A'], [1.15, 'A+'], [1.3, 'A++']];

    function build() {
        var btn = document.createElement('button');
        btn.className = 'a11y-toggle';
        btn.setAttribute('aria-label', 'Accessibility options');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', 'a11y-panel');
        btn.innerHTML = '<span class="hex"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4" r="2"/>' +
            '<path d="M4 7.5l8 1.5 8-1.5.5 2-6 1.5v3.5l2.5 7-2 .8L12 15.5 9 22.3l-2-.8 2.5-7V11l-6-1.5z"/></svg></span>';

        var panel = document.createElement('div');
        panel.className = 'a11y-panel';
        panel.id = 'a11y-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Accessibility options');
        panel.hidden = true;
        panel.innerHTML = '<header><h2>Accessibility</h2><button class="a11y-close" aria-label="Close">&times;</button></header>' +
            '<div class="a11y-body">' +
            OPTS.map(function (o) { return '<button class="a11y-opt" data-opt="' + o[0] + '" aria-pressed="' + !!prefs[o[0]] + '">' + ICONS[o[0]] + o[1] + '</button>'; }).join('') +
            '<div class="a11y-size" role="group" aria-label="Text size"><span>Text size</span><div>' +
            SIZES.map(function (s) { return '<button data-size="' + s[0] + '" aria-pressed="' + ((prefs.size || 1) === s[0]) + '" style="font-size:' + (13 * s[0]) + 'px">' + s[1] + '</button>'; }).join(' ') +
            '</div></div></div>' +
            '<div class="a11y-foot"><a href="/accessibility.html">Accessibility statement</a><button class="a11y-reset">Reset</button></div>';

        document.body.appendChild(btn);
        document.body.appendChild(panel);

        function open(v) {
            panel.hidden = !v;
            btn.setAttribute('aria-expanded', String(v));
            if (v) panel.querySelector('.a11y-opt').focus(); else btn.focus();
        }
        btn.addEventListener('click', function () { open(panel.hidden); });
        panel.querySelector('.a11y-close').addEventListener('click', function () { open(false); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) open(false); });
        document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) open(false); });

        panel.querySelectorAll('.a11y-opt').forEach(function (b) {
            b.addEventListener('click', function () {
                var k = b.getAttribute('data-opt');
                prefs[k] = !prefs[k];
                b.setAttribute('aria-pressed', String(prefs[k]));
                applyClasses();
                if (k === 'contrast') setContrast(prefs.contrast);
                if (k === 'dark') { setDark(prefs.dark); setContrast(prefs.contrast); }
                save();
            });
        });
        panel.querySelectorAll('[data-size]').forEach(function (b) {
            b.addEventListener('click', function () {
                prefs.size = parseFloat(b.getAttribute('data-size'));
                panel.querySelectorAll('[data-size]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
                setSize(prefs.size); save();
            });
        });
        panel.querySelector('.a11y-reset').addEventListener('click', function () {
            prefs = {}; save(); applyClasses(); setContrast(false); setDark(false); setSize(1);
            panel.querySelectorAll('[aria-pressed]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-size') === '1')); });
        });

        if (prefs.size) setSize(prefs.size);
        if (prefs.dark) setDark(true);
        if (prefs.contrast || prefs.dark) setContrast(prefs.contrast);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
