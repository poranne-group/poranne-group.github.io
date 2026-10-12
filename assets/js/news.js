/* Renders window.NEWS (assets/js/news-data.js, built by tools/build_news.py) as the home page's
 * scrollable news strip:   <div class="news-strip"></div>
 * (any list in the same format works too:  <div class="news-strip" data-source="TEACHING_AWARDS"></div>)
 * Four colour-coded categories; each item's "type" maps onto one of them.
 */
(function () {
    var NEWS = window.NEWS || [];
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'];
    var CATS = {
        award:  { label: 'Awards & honors',  icon: 'fa-trophy',      color: '#C06BA8' },
        paper:  { label: 'Papers',           icon: 'fa-file-text-o', color: '#4E73C4' },
        talk:   { label: 'Talks',            icon: 'fa-microphone',  color: '#29B6D4' },
        people: { label: 'Group milestones', icon: 'fa-users',       color: '#7A54AF' }
    };
    var TYPE_TO_CAT = { award: 'award', editorial: 'award', event: 'award', paper: 'paper', talk: 'talk', people: 'people' };
    var now = new Date(), thisMonth = now.getFullYear() * 12 + now.getMonth();

    function cat(n) { return CATS[TYPE_TO_CAT[n.type] || 'people']; }
    function catKey(n) { return TYPE_TO_CAT[n.type] || 'people'; }
    function esc(s) {
        return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
    }
    function when(d) {
        var p = d.split('-');
        return p[1] ? MONTHS[+p[1] - 1] + ' ' + p[0] : p[0];
    }
    function upcoming(d) {
        var p = d.split('-');
        return p[1] && (+p[0] * 12 + (+p[1] - 1)) > thisMonth;
    }
    // hexagon label: smaller type when the longest word is long (soft hyphens ­ mark break points)
    function hexLabel(n, icon) {
        var t = n.short || n.title;
        var longest = Math.max.apply(null, t.split(/[\s­-]+/).map(function (w) { return w.length; }));
        var cls = longest >= 12 ? ' lw3' : longest >= 10 ? ' lw2' : '';
        return '<span class="htl-label' + cls + '"><i class="fa ' + icon + '"></i><span>' + esc(t) + '</span></span>';
    }
    function more(n) {
        if (!n.link) return '';
        var ext = /^https?:/.test(n.link);
        return '<a class="news-more" href="' + esc(n.link) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>Read more &rarr;</a>';
    }

    // ---- home page: scrollable horizontal strip (oldest left -> newest right), hexagons on stems of varying height
    Array.prototype.forEach.call(document.querySelectorAll('.news-strip'), function (box) {
        var SRC = window[box.getAttribute('data-source') || 'NEWS'] || [];       // e.g. data-source="TEACHING_AWARDS"
        var limit = +box.getAttribute('data-limit') || SRC.length;
        var HEX = '<svg class="htl-shape" viewBox="0 0 100 115" aria-hidden="true"><polygon points="50,2 97,29 97,86 50,113 3,86 3,29"/></svg>';
        var STEMS = [64, 26, 92, 44, 78, 34];          // connector heights, px
        var items = SRC.slice(0, limit).reverse();
        var SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var html = '', year = null, month = null, k = 0;
        items.forEach(function (n, i) {
            var y = n.date.slice(0, 4);
            if (y !== year) { html += '<div class="hz-year"><span class="hz-year-hex">' + HEX + '<b>' + y + '</b></span></div>'; year = y; }
            if (n.date !== month) {                       // month label sits on the line, before that month's items
                var p = n.date.split('-');
                if (p[1]) html += '<div class="hz-mon"><span>' + SHORT[+p[1] - 1] + ' ' + p[0] + '</span></div>';   // year-only: the year hexagon says it
                month = n.date;
            }
            var c = cat(n), up = upcoming(n.date);
            html += '<div class="hz-item' + (up ? ' htl-upcoming' : '') + '" data-i="' + i + '" data-month="' + n.date + '" style="--news-color:' + c.color + ';--stem:' + STEMS[k++ % STEMS.length] + 'px">' +
                '<span class="hz-conn"></span><span class="hz-node"></span>' +
                '<button type="button" class="htl-hex hz-hex" aria-label="' + esc(n.title) + '">' + HEX +
                hexLabel(n, c.icon) + '</button></div>';
        });
        box.innerHTML = '<div class="hz-wrap">' +
            '<button type="button" class="hz-arrow hz-prev" aria-label="Earlier news">&#8249;</button>' +
            '<div class="hz-scroll"><div class="hz">' + html + '</div></div>' +
            '<button type="button" class="hz-arrow hz-next" aria-label="Later news">&#8250;</button>' +
            '<div class="htl-pop hz-card" role="tooltip"></div></div>';

        var wrap = box.querySelector('.hz-wrap'), scroller = box.querySelector('.hz-scroll');

        var card = box.querySelector('.hz-card'), prev = box.querySelector('.hz-prev'), next = box.querySelector('.hz-next');
        var pinned = null, hideTimer = null;

        function fill(n) {
            var c = cat(n), up = upcoming(n.date);
            card.style.setProperty('--news-color', c.color);
            card.innerHTML = '<div class="news-meta"><span class="news-type">' + (up ? 'Upcoming · ' : '') + esc(c.label) + '</span>' +
                '<span class="news-date">' + esc(when(n.date)) + '</span></div>' +
                '<h3 class="news-title">' + esc(n.title) + '</h3>' +
                (n.text ? '<p class="news-text">' + esc(n.text) + '</p>' : '') + more(n);
        }
        function show(it) {
            clearTimeout(hideTimer);
            fill(items[+it.getAttribute('data-i')]);
            var w = wrap.getBoundingClientRect(), r = it.getBoundingClientRect();
            var left = r.left + r.width / 2 - w.left - 150;
            card.style.left = Math.max(0, Math.min(left, w.width - 300)) + 'px';
            Array.prototype.forEach.call(box.querySelectorAll('.hz-item.active'), function (x) { x.classList.remove('active'); });
            it.classList.add('active');
            card.classList.add('show');
        }
        function hide() {
            card.classList.remove('show');
            Array.prototype.forEach.call(box.querySelectorAll('.hz-item.active'), function (x) { x.classList.remove('active'); });
            pinned = null;
        }
        function hideSoon() { if (!pinned) { clearTimeout(hideTimer); hideTimer = setTimeout(hide, 180); } }

        Array.prototype.forEach.call(box.querySelectorAll('.hz-item'), function (it) {
            var hex = it.querySelector('.hz-hex');
            it.addEventListener('mouseenter', function () { if (!pinned) show(it); });
            it.addEventListener('mouseleave', hideSoon);
            hex.addEventListener('focus', function () { show(it); });
            hex.addEventListener('blur', hideSoon);
            hex.addEventListener('click', function (e) {
                e.stopPropagation();
                if (pinned === it) { hide(); return; }
                show(it); pinned = it;
            });
        });
        card.addEventListener('mouseenter', function () { clearTimeout(hideTimer); });
        card.addEventListener('mouseleave', hideSoon);
        document.addEventListener('click', function (e) { if (!card.contains(e.target)) hide(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });

        // arrows + edges
        var anim = null;
        function glideTo(target, ms) {
            cancelAnimationFrame(anim);
            var start = scroller.scrollLeft, dist = target - start, t0 = null;
            ms = ms || 600;
            function frame(t) {
                if (t0 === null) t0 = t;
                var p = Math.min(1, (t - t0) / ms), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
                scroller.scrollLeft = start + dist * e;
                if (p < 1) anim = requestAnimationFrame(frame);
            }
            anim = requestAnimationFrame(frame);
        }
        function step(dir) { glideTo(scroller.scrollLeft + dir * scroller.clientWidth * 0.7); }

        // drag the timeline left / right (mouse or pen; touch screens scroll natively)
        var drag = null, moved = false;
        scroller.addEventListener('pointerdown', function (e) {
            if (e.pointerType === 'touch' || e.button !== 0) return;
            cancelAnimationFrame(anim);
            drag = { x: e.clientX, left: scroller.scrollLeft, lastX: e.clientX, lastT: performance.now(), v: 0 };
            moved = false;
        });
        window.addEventListener('pointermove', function (e) {
            if (!drag) return;
            var dx = e.clientX - drag.x;
            if (!moved && Math.abs(dx) > 5) { moved = true; scroller.classList.add('dragging'); hide(); }
            if (!moved) return;
            scroller.scrollLeft = drag.left - dx;
            var now = performance.now(), dt = now - drag.lastT;
            if (dt > 0) drag.v = (e.clientX - drag.lastX) / dt;
            drag.lastX = e.clientX; drag.lastT = now;
        });
        window.addEventListener('pointerup', function () {
            if (!drag) return;
            var v = drag.v; drag = null;
            scroller.classList.remove('dragging');
            if (moved && Math.abs(v) > 0.2) glideTo(scroller.scrollLeft - v * 260, 700);     // momentum
        });
        // a drag should not also count as a click on a hexagon
        scroller.addEventListener('click', function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
        prev.onclick = function () { hide(); step(-1); };
        next.onclick = function () { hide(); step(1); };
        function edges() {
            var max = scroller.scrollWidth - scroller.clientWidth;
            prev.classList.toggle('off', scroller.scrollLeft <= 2);
            next.classList.toggle('off', scroller.scrollLeft >= max - 2);
        }
        scroller.addEventListener('scroll', function () { edges(); if (!pinned && !settling) hide(); });
        window.addEventListener('resize', edges);
        var settling = true;                              // ignore our own initial scroll
        function toEnd() {
            scroller.style.scrollBehavior = 'auto';                  // jump, don't glide
            scroller.scrollLeft = scroller.scrollWidth - scroller.clientWidth;
            scroller.style.scrollBehavior = '';
            edges();
        }
        toEnd();                                          // start with the newest items in view
        window.addEventListener('load', function () { toEnd(); setTimeout(function () { settling = false; }, 300); });
    });

})();
