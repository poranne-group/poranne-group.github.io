/* Milestones chart for rgp.html (vertical: newest at the top).
 * Data: window.RGP_MILESTONES (assets/js/rgp-milestones-data.js, built by tools/build_milestones.py).
 * Career stages are drawn as horizontal bands behind the chart, labelled in a slim strip on the left.
 * Every other kind of event gets a column; dots sit on the column line and are nudged sideways
 * (mostly to the left) when crowded, so the right side stays free for the highlight labels.
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
    var CAREER = { id: 'career', full: 'Career stages', color: '#4AB7D4' };
    var LANES = [
        // axis: where the column's line sits (fraction of column width); the rest is room for labels
        { id: 'talks',   label: 'Talks',     full: 'Talks',                 color: '#4E73C4', axis: 0.45 },
        { id: 'funding', label: 'Funding',   full: 'Funding & Fellowships', color: '#7A54AF', axis: 0.3 },
        { id: 'awards',  label: 'Honors',    full: 'Awards & Honors',       color: '#C06BA8', axis: 0.3 },
        { id: 'service', label: 'Editorial', full: 'Editorial & Community', color: '#D896C0', axis: 0.25 }
    ];
    var LANE = { career: CAREER };
    LANES.forEach(function (l) { LANE[l.id] = l; });
    DATA = DATA.filter(function (d) { return LANE[d.lane]; });

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
            // current year: spread only up to today, so nothing past is drawn as 'upcoming'
            var w = g[0].start[0] === now.getFullYear() ? Math.max(NOW - g[0].start[0], 0.1) : 1;
            g.forEach(function (d, i) { POS.set(d, d.start[0] + w * (i + 0.5) / g.length); });
        });
    })();
    function pos(d) { return POS.has(d) ? POS.get(d) : t(d.start); }
    function isFuture(d) { return d.start[2] ? t(d.start) > NOW : d.start[0] > now.getFullYear(); }

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
    [CAREER].concat(LANES).forEach(function (l) {
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

    // Nudge dots sideways until they (almost) don't overlap. Labelled dots are placed first so they
    // stay on the line; others go left before right, and never further right than maxRight.
    function dodge(items, pad, maxLeft, maxRight) {
        items.sort(function (a, b) { return (b.d.short ? 1 : 0) - (a.d.short ? 1 : 0) || a.y - b.y; });
        var placed = [];
        items.forEach(function (it) {
            var near = placed.filter(function (p) { return Math.abs(p.y - it.y) < p.r + it.r + pad; });
            it.dx = 0;
            for (var k = 0; k < 160; k++) {
                var dx = k === 0 ? 0 : (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 2;
                if (dx - it.r < -maxLeft || dx + it.r > maxRight) continue;
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

        var showCareer = !state.hidden.career;
        var lanes = LANES.filter(function (l) { return !state.hidden[l.id]; });
        var W = chartBox.clientWidth || 500;
        var STRIP = showCareer ? 26 : 0;               // career-stage strip on the far left
        var AX = STRIP + 46;                           // + year labels
        var colW = (W - AX - 4) / Math.max(lanes.length, 1);
        var y0 = state.from, y1 = END, span = y1 - y0;

        // Height: match the bio column when side by side, but keep a sensible minimum per year.
        var left = document.getElementById('rgp-left');
        var sideBySide = left && left.getBoundingClientRect().top === root.parentNode.getBoundingClientRect().top;
        var target = 0;
        if (sideBySide) {
            // leave room for whatever sits under the chart (filters, size note)
            var below = root.parentNode.getBoundingClientRect().bottom - chartBox.getBoundingClientRect().bottom;
            target = left.getBoundingClientRect().bottom - chartBox.getBoundingClientRect().top - below - 4;
        }
        var minPerYear = state.from >= 2021 ? 120 : state.from >= 2015 ? 70 : 44;
        var M = { t: 14, b: 14 };
        var plotH = Math.max(target - M.t - M.b, span * minPerYear);
        var H = plotH + M.t + M.b;
        var sy = function (v) { return M.t + (y1 - Math.min(Math.max(v, y0), y1)) / span * plotH; };

        // column headers (HTML, so they stay sticky), roughly centred over each column's line
        head.innerHTML = '<div style="flex:0 0 ' + AX + 'px"></div>' + lanes.map(function (l) {
            return '<div style="flex:0 0 ' + colW + 'px;color:' + l.color + ';text-align:left;padding-left:' +
                Math.max(colW * l.axis - 24, 2) + 'px">' + l.label + '</div>';
        }).join('');

        chartBox.innerHTML = '';
        var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, class: 'ms-svg' }, chartBox);

        // career bands (behind everything) + strip labels
        if (showCareer) {
            DATA.filter(function (d) { return d.lane === 'career' && (d.end ? t(d.end) : y1) > y0; })
                .forEach(function (d, i) {
                    var ya = sy(d.end ? t(d.end) : NOW), yb = sy(t(d.start));
                    var current = !d.end;
                    el('rect', { x: AX - 4, y: ya, width: W - AX + 4, height: yb - ya,
                        class: current ? 'ms-stage ms-stage-current' : i % 2 ? 'ms-stage ms-stage-alt' : 'ms-stage' }, svg);
                    el('line', { x1: 0, x2: W, y1: yb, y2: yb, class: 'ms-stage-edge' }, svg);
                    var g = el('g', { class: 'ms-item', tabindex: 0 }, svg);
                    el('rect', { x: 3, y: ya + 1, width: STRIP - 6, height: Math.max(yb - ya - 2, 2), rx: 5,
                        class: current ? 'ms-strip ms-strip-current' : 'ms-strip' }, g);
                    var mid = (ya + yb) / 2, cx = STRIP / 2;
                    var short = d.title.replace(', Summa cum Laude', '').replace(' (Group Leader)', '')
                        .replace('Postdoctoral Researcher', 'Postdoc').replace(' Professor', ' Prof.');
                    var shorter = short.replace('Associate', 'Assoc.').replace('Assistant', 'Asst.').replace('Senior Scientist', 'Sr. Scientist');
                    var lbl = el('text', { x: cx, y: mid, 'text-anchor': 'middle', 'dominant-baseline': 'central',
                        transform: 'rotate(-90 ' + cx + ' ' + mid + ')',
                        class: current ? 'ms-strip-label ms-strip-label-current' : 'ms-strip-label' }, g);
                    lbl.textContent = short;
                    if (lbl.getComputedTextLength() > yb - ya - 10) lbl.textContent = shorter;
                    if (lbl.getComputedTextLength() > yb - ya - 10) lbl.textContent = '';
                    bind(g, d);
                });
        }

        // year grid + labels
        var every = plotH / span < 30 ? 2 : 1;
        for (var yr = Math.ceil(y0); yr <= y1; yr++) {
            var gy = sy(yr);
            el('line', { x1: AX - 4, x2: W, y1: gy, y2: gy, class: 'ms-grid' }, svg);
            if (yr % every === 0) {
                var tx = el('text', { x: AX - 8, y: gy + 4.5, class: 'ms-year' }, svg);
                tx.textContent = yr;
            }
        }
        // today
        var ny = sy(NOW);
        el('line', { x1: AX - 4, x2: W, y1: ny, y2: ny, class: 'ms-now' }, svg);
        var nt = el('text', { x: AX - 8, y: ny + 13, class: 'ms-now-label' }, svg);
        nt.textContent = 'today';

        var labelLayer = [];
        lanes.forEach(function (l, i) {
            var colX = AX + i * colW, ax = colX + colW * l.axis;
            el('line', { x1: ax, x2: ax, y1: M.t - 6, y2: H - M.b + 6, class: 'ms-col-line', stroke: l.color }, svg);

            var items = DATA.filter(function (d) {
                return d.lane === l.id && (d.end ? t(d.end) : pos(d)) >= y0;
            });
            var dots = items.map(function (d) { return { d: d, y: sy(pos(d)), r: radius(d) }; });
            dodge(dots, -1.5, colW * l.axis - 3, 3);
            dots.sort(function (a, b) { return b.r - a.r; });      // big dots first, small ones on top
            dots.forEach(function (it) {
                var d = it.d, c = l.color, x = ax + it.dx;
                var g = el('g', { class: 'ms-item', tabindex: 0 }, svg);
                var endT = d.ongoing ? NOW : d.end ? t(d.end) : 0;
                if (endT > t(d.start)) {
                    el('line', { x1: x, x2: x, y1: it.y, y2: sy(endT), stroke: c, 'stroke-width': Math.min(it.r, 6),
                        'stroke-opacity': 0.28, 'stroke-linecap': 'round' }, g);
                }
                var future = isFuture(d);           // upcoming: light fill, dashed outline
                if (d.short && !future) {           // highlights get a halo ring
                    el('circle', { cx: x, cy: it.y, r: it.r + 3.5, fill: 'none', stroke: c, 'stroke-width': 1.5, 'stroke-opacity': 0.55 }, g);
                }
                el('circle', { cx: x, cy: it.y, r: it.r,
                    fill: c, 'fill-opacity': future ? 0.25 : 0.95,
                    stroke: future ? c : '#fff', 'stroke-width': future ? 2 : 1,
                    'stroke-dasharray': future ? '3 2' : 'none' }, g);
                bind(g, d);
                if (d.short) labelLayer.push({ d: d, color: c, x: x + it.r + 7, y: it.y, maxW: colX + colW - (x + it.r + 5) - 2,
                    leftX: x - it.r - 7, leftW: x - it.r - 7 - colX - 2 });
            });
        });

        // highlight labels: wrap to two lines if needed, push down when they would collide
        var byCol = {};
        labelLayer.forEach(function (L) { (byCol[L.d.lane] = byCol[L.d.lane] || []).push(L); });
        Object.keys(byCol).forEach(function (k) {
            var prevBottom = -1e9;
            byCol[k].sort(function (a, b) { return a.y - b.y; }).forEach(function (L) {
                var txt = el('text', { x: L.x, y: 0, class: 'ms-hl', fill: shade(L.color) }, svg);
                var lines = [L.d.short];
                txt.textContent = L.d.short;
                if (txt.getComputedTextLength() > L.maxW && L.d.short.indexOf(' ') > 0) {
                    var words = L.d.short.split(' '), best = 1, bestDiff = 1e9;
                    for (var s = 1; s < words.length; s++) {
                        var diff = Math.abs(words.slice(0, s).join(' ').length - words.slice(s).join(' ').length);
                        if (diff < bestDiff) { bestDiff = diff; best = s; }
                    }
                    lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
                }
                txt.textContent = '';
                var widest = 0;
                lines.forEach(function (line) { txt.textContent = line; widest = Math.max(widest, txt.getComputedTextLength()); });
                txt.textContent = '';
                var lx = L.x;
                if (widest > L.maxW && L.leftW > L.maxW) { lx = L.leftX; txt.setAttribute('text-anchor', 'end'); }
                var lh = 14, h = lines.length * lh;
                var top = Math.max(L.y - h / 2, prevBottom + 2);
                lines.forEach(function (line, n) {
                    var ts = el('tspan', { x: lx, y: top + lh * (n + 0.5), 'dominant-baseline': 'central' }, txt);
                    ts.textContent = line;
                });
                if (top + h / 2 - L.y > 4) {   // moved: draw a short leader back to the dot
                    var side = lx === L.x ? -1 : 1;
                    el('line', { x1: lx + 4 * side, y1: L.y, x2: lx + side, y2: top + h / 2, class: 'ms-leader' }, svg);
                }
                prevBottom = top + h;
                txt.addEventListener('mouseenter', function (e) { show(L.d, e); });
                txt.addEventListener('mousemove', move);
                txt.addEventListener('mouseleave', hide);
            });
        });
    }

    // darker version of a lane colour, for readable label text
    function shade(hex) {
        var n = parseInt(hex.slice(1), 16), f = 0.62;
        var r = Math.round((n >> 16) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
        return 'rgb(' + r + ',' + g + ',' + b + ')';
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
            : LANE[d.lane].full;
        if (isFuture(d)) kind = 'Upcoming · ' + kind;
        tip.innerHTML =
            '<div class="ms-tip-kind" style="color:' + LANE[d.lane].color + '">' + esc(kind) + '</div>' +
            '<div class="ms-tip-title">' + esc(d.title) + '</div>' +
            (d.detail ? '<div class="ms-tip-detail">' + esc(d.detail) + '</div>' : '') +
            '<div class="ms-tip-when">' + when(d) + '</div>' +
            (d.url ? '<a class="ms-tip-link" href="' + d.url + '" target="_blank" rel="noopener">Open &rarr;</a>' : '');
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
