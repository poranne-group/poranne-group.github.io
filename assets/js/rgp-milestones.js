/* Milestones chart for rgp.html (vertical: newest at the top).
 * Data: window.RGP_MILESTONES (assets/js/rgp-milestones-data.js, built by tools/build_milestones.py).
 * Each column is one kind of event; dots are nudged sideways so they never overlap.
 * The chart stretches to the height of the bio column (#rgp-left) when they sit side by side.
 */
(function () {
    var DATA = window.RGP_MILESTONES || [];
    var root = document.getElementById('rgp-milestones');
    if (!root || !DATA.length) return;

    var SVGNS = 'http://www.w3.org/2000/svg';
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'];

    // Colors follow the site's header gradient.
    var LANES = [
        { id: 'career',  label: 'Career',    full: 'Career',                color: '#4AB7D4' },
        { id: 'papers',  label: 'Papers',    full: 'Papers',                color: '#0097A7' },
        { id: 'talks',   label: 'Talks',     full: 'Talks',                 color: '#4E73C4' },
        { id: 'funding', label: 'Funding',   full: 'Funding & Fellowships', color: '#7A54AF' },
        { id: 'awards',  label: 'Awards',    full: 'Awards & Honors',       color: '#C06BA8' },
        { id: 'service', label: 'Editorial', full: 'Editorial & Community', color: '#D896C0' }
    ];
    var LANE = {};
    LANES.forEach(function (l) { LANE[l.id] = l; });
    var RANGES = [
        { label: 'Full career', from: 2004 },
        { label: 'Since 2015', from: 2015 },
        { label: 'Since 2021', from: 2021 }
    ];

    var now = new Date();
    var NOW = now.getFullYear() + now.getMonth() / 12;
    var state = { from: 2004, hidden: {} };

    function t(ym) { return ym[0] + (ym[1] - 1) / 12; }          // [y, m, exact] -> fractional year
    var END = Math.max(NOW, Math.max.apply(null, DATA.map(function (d) { return t(d.start); }))) + 0.4;
    function fmt(ym) { return ym[2] ? MONTHS[ym[1] - 1] + ' ' + ym[0] : String(ym[0]); }
    function when(d) {
        if (d.lane === 'career') return fmt(d.start) + ' – ' + (d.end ? fmt(d.end) : 'present');
        if (d.ongoing) return d.start[0] + ' – present';
        if (d.end) return d.start[0] + ' – ' + d.end[0];
        return fmt(d.start);
    }
    function el(name, attrs, parent) {
        var e = document.createElementNS(SVGNS, name);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(e);
        return e;
    }
    function radius(d) {
        switch (d.lane) {
            case 'papers': return 5.5;
            case 'talks': return { Plenary: 8, Award: 8, Invited: 6, Seminar: 4.5, Contributed: 4.5 }[d.kind] || 5;
            case 'funding': return d.usd ? 5.5 + 5.5 * Math.sqrt(d.usd / 560000) : 5.5;
            case 'awards': return d.major ? 8.5 : 5;
            case 'service': return d.major ? 8.5 : 5;
            default: return 5.5;
        }
    }

    // Events known only to the year are spread evenly across that year (per lane).
    var POS = new Map();
    (function () {
        var groups = {};
        DATA.forEach(function (d) {
            if (d.start[2] || d.lane === 'career') return;
            var k = d.lane + d.start[0];
            (groups[k] = groups[k] || []).push(d);
        });
        Object.keys(groups).forEach(function (k) {
            var g = groups[k];
            g.forEach(function (d, i) { POS.set(d, d.start[0] + (i + 0.5) / g.length); });
        });
    })();
    function pos(d) { return POS.has(d) ? POS.get(d) : t(d.start); }

    // ---------- DOM scaffold
    root.innerHTML =
        '<div class="ms-controls"><div class="ms-ranges"></div></div>' +
        '<div class="ms-frame"><div class="ms-head"></div><div class="ms-chart"></div></div>' +
        '<div class="ms-legend"></div>' +
        '<div class="ms-tip" role="tooltip"></div>';
    var head = root.querySelector('.ms-head');
    var chartBox = root.querySelector('.ms-chart');
    var tip = root.querySelector('.ms-tip');

    RANGES.forEach(function (r) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = r.label;
        b.dataset.from = r.from;
        b.onclick = function () { state.from = r.from; render(); };
        root.querySelector('.ms-ranges').appendChild(b);
    });
    LANES.forEach(function (l) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ms-lane-btn';
        b.dataset.lane = l.id;
        b.title = 'Show / hide';
        var n = DATA.filter(function (d) { return d.lane === l.id; }).length;
        b.innerHTML = '<span class="ms-swatch" style="background:' + l.color + '"></span>' + l.full +
            (l.id === 'career' ? '' : ' <span class="ms-count">' + n + '</span>');
        b.onclick = function () { state.hidden[l.id] = !state.hidden[l.id]; render(); };
        root.querySelector('.ms-legend').appendChild(b);
    });

    // Nudge dots sideways (alternating right/left) until they no longer overlap; clamp to the column.
    function dodge(items, pad, half) {
        items.sort(function (a, b) { return a.y - b.y; });
        var placed = [];
        items.forEach(function (it) {
            var near = placed.filter(function (p) { return Math.abs(p.y - it.y) < p.r + it.r + pad; });
            it.dx = 0;
            for (var k = 0; k < 120; k++) {
                var dx = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 2;
                if (Math.abs(dx) + it.r > half) continue;
                var ok = true;
                for (var j = 0; j < near.length; j++) {
                    var ddx = near[j].dx - dx, ddy = near[j].y - it.y, min = near[j].r + it.r + pad;
                    if (ddx * ddx + ddy * ddy < min * min) { ok = false; break; }
                }
                if (ok) { it.dx = dx; break; }
            }
            placed.push(it);
        });
    }

    // ---------- render
    function render() {
        Array.prototype.forEach.call(root.querySelectorAll('.ms-ranges button'), function (b) {
            b.classList.toggle('active', +b.dataset.from === state.from);
        });
        Array.prototype.forEach.call(root.querySelectorAll('.ms-lane-btn'), function (b) {
            b.classList.toggle('off', !!state.hidden[b.dataset.lane]);
        });

        var lanes = LANES.filter(function (l) { return !state.hidden[l.id]; });
        var W = chartBox.clientWidth || 500;
        var AX = 46;                                   // year-axis gutter on the left
        var colW = (W - AX - 6) / Math.max(lanes.length, 1);
        var y0 = state.from, y1 = END, span = y1 - y0;

        // Height: match the bio column when side by side, but keep at least ~44px per year.
        var left = document.getElementById('rgp-left');
        var sideBySide = left && left.getBoundingClientRect().top === root.parentNode.getBoundingClientRect().top;
        var target = 0;
        if (sideBySide) {
            var leftBottom = left.getBoundingClientRect().bottom;
            // leave room for whatever sits under the chart (filters, size note)
            var below = root.parentNode.getBoundingClientRect().bottom - chartBox.getBoundingClientRect().bottom;
            target = leftBottom - chartBox.getBoundingClientRect().top - below - 4;
        }
        var minPerYear = state.from >= 2021 ? 120 : state.from >= 2015 ? 70 : 44;
        var M = { t: 14, b: 14 };
        var plotH = Math.max(target - M.t - M.b, span * minPerYear);
        var H = plotH + M.t + M.b;
        var sy = function (v) { return M.t + (y1 - Math.min(Math.max(v, y0), y1)) / span * plotH; };

        // column headers (HTML, so they wrap and stay sticky)
        head.innerHTML = '<div style="flex:0 0 ' + AX + 'px"></div>' + lanes.map(function (l) {
            return '<div style="flex:0 0 ' + colW + 'px;color:' + l.color + '">' + l.label + '</div>';
        }).join('');

        chartBox.innerHTML = '';
        var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, class: 'ms-svg' }, chartBox);

        // alternating column bands
        lanes.forEach(function (l, i) {
            if (i % 2 === 0) el('rect', { x: AX + i * colW, y: 0, width: colW, height: H, class: 'ms-band' }, svg);
        });
        // year grid + labels
        var every = plotH / span < 30 ? 2 : 1;
        for (var yr = Math.ceil(y0); yr <= y1; yr++) {
            var gy = sy(yr);
            el('line', { x1: AX - 4, x2: W, y1: gy, y2: gy, class: 'ms-grid' + (yr % 5 === 0 ? ' ms-grid-major' : '') }, svg);
            if (yr % every === 0) {
                var tx = el('text', { x: AX - 8, y: gy + 4.5, class: 'ms-year' }, svg);
                tx.textContent = yr;
            }
        }
        // today
        var ny = sy(NOW);
        el('line', { x1: AX - 4, x2: W, y1: ny, y2: ny, class: 'ms-now' }, svg);
        var nt = el('text', { x: W - 6, y: ny - 5, class: 'ms-now-label' }, svg);
        nt.textContent = 'today';

        lanes.forEach(function (l, i) {
            var cx = AX + i * colW + colW / 2;
            var items = DATA.filter(function (d) {
                return d.lane === l.id && (d.end ? t(d.end) : (d.lane === 'career' ? y1 : pos(d))) >= y0;
            });

            if (l.id === 'career') {
                var bw = Math.min(36, colW - 10);
                items.forEach(function (d) {
                    var ya = sy(d.end ? t(d.end) : y1), yb = sy(t(d.start));
                    var g = el('g', { class: 'ms-item', tabindex: 0 }, svg);
                    el('rect', { x: cx - bw / 2, y: ya + 1, width: bw, height: Math.max(yb - ya - 2, 2), rx: 7,
                        fill: d.end ? '#d4eef6' : '#2e9ab5', stroke: d.end ? '#9fd6e7' : 'none' }, g);
                    var short = d.title.replace(', Summa cum Laude', '').replace(' (Group Leader)', '')
                        .replace('Postdoctoral Researcher', 'Postdoc').replace(' Professor', ' Prof.');
                    var mid = (ya + yb) / 2;
                    var lbl = el('text', { x: cx, y: mid, class: 'ms-bar-label' + (d.end ? '' : ' ms-bar-current'), 'text-anchor': 'middle',
                        'dominant-baseline': 'central', transform: 'rotate(-90 ' + cx + ' ' + mid + ')' }, g);
                    lbl.textContent = short;
                    if (lbl.getComputedTextLength && lbl.getComputedTextLength() > yb - ya - 12) lbl.textContent = '';
                    bind(g, d);
                });
                return;
            }

            var dots = items.map(function (d) { return { d: d, y: sy(pos(d)), r: radius(d) }; });
            dodge(dots, 1.2, colW / 2 - 3);
            dots.forEach(function (it) {
                var d = it.d, c = l.color, x = cx + it.dx;
                var g = el('g', { class: 'ms-item', tabindex: 0 }, svg);
                var endT = d.ongoing ? NOW : d.end ? t(d.end) : 0;
                if (endT > t(d.start)) {
                    el('line', { x1: x, x2: x, y1: it.y, y2: sy(endT), stroke: c, 'stroke-width': 2.5,
                        'stroke-opacity': 0.3, 'stroke-linecap': 'round' }, g);
                }
                el('circle', { cx: x, cy: it.y, r: it.r,
                    fill: d.preprint ? '#fff' : c, 'fill-opacity': d.preprint ? 1 : 0.88,
                    stroke: c, 'stroke-width': d.preprint ? 2 : 1 }, g);
                bind(g, d);
            });
        });
    }

    function bind(g, d) {
        g.addEventListener('mouseenter', function (e) { show(d, e); });
        g.addEventListener('mousemove', function (e) { move(e); });
        g.addEventListener('mouseleave', hide);
        g.addEventListener('focus', function () {
            var b = g.getBoundingClientRect();
            show(d, { clientX: b.left + b.width / 2, clientY: b.top });
        });
        g.addEventListener('blur', hide);
        g.addEventListener('click', function (e) {
            if (d.url && !('ontouchstart' in window)) { window.open(d.url, '_blank'); return; }
            e.stopPropagation();
            show(d, e);
        });
    }

    // ---------- tooltip
    function show(d, e) {
        var kind = d.lane === 'talks' ? (d.kind === 'Seminar' ? 'Invited seminar' : d.kind === 'Contributed' ? 'Talk' : d.kind + ' talk')
            : d.lane === 'papers' ? (d.preprint ? 'Preprint' : d.kind === 'review' ? 'Review' : d.kind === 'chapter' ? 'Book chapter' : 'Paper') + ' · ' + d.cat
            : LANE[d.lane].full;
        tip.innerHTML =
            '<div class="ms-tip-kind" style="color:' + LANE[d.lane].color + '">' + esc(kind) + '</div>' +
            '<div class="ms-tip-title">' + esc(d.title) + '</div>' +
            (d.detail ? '<div class="ms-tip-detail">' + esc(d.detail) + '</div>' : '') +
            '<div class="ms-tip-when">' + when(d) + '</div>' +
            (d.url ? '<a class="ms-tip-link" href="' + d.url + '" target="_blank" rel="noopener">Open paper &rarr;</a>' : '');
        tip.classList.add('on');
        move(e);
    }
    function move(e) {
        var box = root.getBoundingClientRect();
        var x = e.clientX - box.left, y = e.clientY - box.top;
        var w = tip.offsetWidth, h = tip.offsetHeight;
        tip.style.left = Math.min(Math.max(x - w / 2, 0), box.width - w) + 'px';
        tip.style.top = (y - h - 14 < 0 ? y + 18 : y - h - 14) + 'px';
    }
    function hide() { tip.classList.remove('on'); }
    function esc(s) {
        return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
    }
    document.addEventListener('click', function (e) { if (!tip.contains(e.target)) hide(); });

    var rt;
    function later() { clearTimeout(rt); rt = setTimeout(render, 120); }
    window.addEventListener('resize', later);
    window.addEventListener('load', later);      // fonts/photo change the bio height
    render();
})();
