/* Photo gallery for gallery.html.
 * Data: window.GALLERY_ALBUMS (assets/js/gallery-data.js, built by tools/build_gallery.py).
 * The banner album (group photos) is a large strip at the top of the page.
 * Each other album is a strip of photos drifting slowly from left to right; hovering pauses it,
 * the arrows nudge it, and clicking a photo opens it full size with previous / next.
 */
(function () {
    var ALBUMS = window.GALLERY_ALBUMS || [];
    var root = document.getElementById('gallery');
    if (!root) return;

    var SPEED = 28;   // drift speed in px per second
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!ALBUMS.length) {
        root.innerHTML = '<p class="gal-empty">Photos coming soon.</p>';
        return;
    }

    function esc(s) {
        return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
    }

    // The album marked as banner (the group photos) rotates in a large banner at the top;
    // every other album is an event, shown below as a drifting strip.
    var BANNER = ALBUMS.filter(function (a) { return a.banner; })[0];
    var EVENTS = ALBUMS.filter(function (a) { return !a.banner; });
    var strips = [];
    if (BANNER) {
        var hero = document.createElement('section');
        hero.className = 'gal-album gal-hero';
        hero.innerHTML =
            '<div class="gal-head"><h3>' + esc(BANNER.title) + '</h3>' +
            (BANNER.date ? '<span class="gal-meta">' + esc(BANNER.date) + '</span>' : '') + '</div>' +
            stripHTML();
        root.appendChild(hero);
        strips.push(makeStrip(hero, BANNER));
    }

    // ---------- event jump links (only when there is more than one event)
    if (EVENTS.length > 1) {
        var nav = document.createElement('div');
        nav.className = 'gal-albums-nav';
        nav.innerHTML = EVENTS.map(function (a, i) {
            return '<a href="#album-' + i + '">' + esc(a.title) + '</a>';
        }).join('');
        root.appendChild(nav);
    }

    EVENTS.forEach(function (album, ai) {
        var sec = document.createElement('section');
        sec.className = 'gal-album';
        sec.id = 'album-' + ai;
        sec.innerHTML =
            '<div class="gal-head">' +
            '  <h3>' + esc(album.title) + '</h3>' +
            '  <span class="gal-meta">' + (album.date ? esc(album.date) + ' &middot; ' : '') + album.photos.length + ' photo' + (album.photos.length === 1 ? '' : 's') + '</span>' +
            '</div>' +
            (album.description ? '<p class="gal-desc">' + esc(album.description) + '</p>' : '') +
            stripHTML();
        root.appendChild(sec);
        strips.push(makeStrip(sec, album));
    });

    function stripHTML() {
        return '<div class="gal-strip">' +
            '  <button type="button" class="gal-arrow gal-prev" aria-label="Scroll left">&#8249;</button>' +
            '  <div class="gal-viewport"><div class="gal-track"></div></div>' +
            '  <button type="button" class="gal-arrow gal-next" aria-label="Scroll right">&#8250;</button>' +
            '</div>';
    }

    // ---------- one drifting strip
    function makeStrip(sec, album) {
        var viewport = sec.querySelector('.gal-viewport');
        var track = sec.querySelector('.gal-track');
        var s = { offset: 0, setWidth: 0, paused: false, hover: false, nudge: 0 };

        function tile(p, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'gal-tile';
            b.innerHTML = '<img src="' + album.folder + p.file + '" alt="' + esc(p.caption) + '" loading="lazy">' +
                (p.caption ? '<span class="gal-cap">' + esc(p.caption) + '</span>' : '');
            b.onclick = function () { openLightbox(album, i); };
            return b;
        }

        // Build: one "set" of photos, repeated until it is wider than the viewport,
        // then the whole thing twice so the loop is seamless.
        function build() {
            track.innerHTML = '';
            var set = document.createElement('div');
            set.className = 'gal-set';
            album.photos.forEach(function (p, i) { set.appendChild(tile(p, i)); });
            track.appendChild(set);
            s.loop = !reduceMotion;
            if (!s.loop) { sec.classList.add('gal-static'); return; }
            measure();
        }
        function measure() {
            var sets = track.querySelectorAll('.gal-set');
            for (var k = sets.length - 1; k > 0; k--) track.removeChild(sets[k]);
            var first = track.firstChild;
            var w = first.getBoundingClientRect().width;
            if (!w) return;
            var reps = Math.max(1, Math.ceil(viewport.clientWidth / w));
            // the "unit" that repeats seamlessly is reps copies of the album
            for (var r = 1; r < reps * 2; r++) {
                var c = first.cloneNode(true);
                Array.prototype.forEach.call(c.querySelectorAll('.gal-tile'), function (b, i) {
                    b.onclick = function () { openLightbox(album, i % album.photos.length); };
                });
                track.appendChild(c);
            }
            s.setWidth = w * reps;
        }

        viewport.addEventListener('mouseenter', function () { s.hover = true; });
        viewport.addEventListener('mouseleave', function () { s.hover = false; });
        sec.querySelector('.gal-prev').onclick = function () { s.nudge -= 320; if (!s.loop) viewport.scrollBy({ left: -320, behavior: 'smooth' }); };
        sec.querySelector('.gal-next').onclick = function () { s.nudge += 320; if (!s.loop) viewport.scrollBy({ left: 320, behavior: 'smooth' }); };

        // touch: drag to move
        var startX = null, startOff = 0;
        viewport.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; startOff = s.offset; s.hover = true; }, { passive: true });
        viewport.addEventListener('touchmove', function (e) { if (startX !== null) s.offset = startOff + (e.touches[0].clientX - startX); }, { passive: true });
        viewport.addEventListener('touchend', function () { startX = null; s.hover = false; });

        // re-measure once images have loaded (widths depend on them)
        build();
        Array.prototype.forEach.call(track.querySelectorAll('img'), function (img) {
            if (img.complete) return;
            img.addEventListener('load', function () { if (s.loop) measure(); });
        });

        s.step = function (dt) {
            if (!s.loop || !s.setWidth) return;
            // moving left -> right: offset grows, wraps by one unit width
            var v = (s.hover || lightboxOpen) ? 0 : SPEED;
            if (s.nudge) { var d = s.nudge * Math.min(1, dt * 6); s.offset -= d; s.nudge -= d; if (Math.abs(s.nudge) < 0.5) s.nudge = 0; }
            s.offset += v * dt;
            s.offset = ((s.offset % s.setWidth) + s.setWidth) % s.setWidth;
            track.style.transform = 'translateX(' + (s.offset - s.setWidth) + 'px)';
        };
        s.remeasure = function () { if (s.loop) measure(); };
        return s;
    }

    var last = null;
    function frame(ts) {
        var dt = last === null ? 0 : Math.min((ts - last) / 1000, 0.1);
        last = ts;
        strips.forEach(function (s) { s.step(dt); });
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    var rt;
    window.addEventListener('resize', function () {
        clearTimeout(rt);
        rt = setTimeout(function () { strips.forEach(function (s) { s.remeasure(); }); }, 150);
    });

    // ---------- lightbox
    var lb = document.createElement('div');
    lb.className = 'gal-lightbox';
    lb.innerHTML =
        '<button type="button" class="gal-lb-close" aria-label="Close">&times;</button>' +
        '<button type="button" class="gal-lb-prev" aria-label="Previous photo">&#8249;</button>' +
        '<figure><img alt=""><figcaption><span class="gal-lb-cap"></span><span class="gal-lb-count"></span></figcaption></figure>' +
        '<button type="button" class="gal-lb-next" aria-label="Next photo">&#8250;</button>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector('img'), lbCap = lb.querySelector('.gal-lb-cap'), lbCount = lb.querySelector('.gal-lb-count');
    var cur = { album: null, i: 0 }, lightboxOpen = false;

    function openLightbox(album, i) {
        cur.album = album;
        show(i);
        lb.classList.add('on');
        lightboxOpen = true;
        document.body.style.overflow = 'hidden';
    }
    function show(i) {
        var n = cur.album.photos.length;
        cur.i = (i + n) % n;
        var p = cur.album.photos[cur.i];
        lbImg.src = cur.album.folder + p.file;
        lbImg.alt = p.caption || '';
        lbCap.innerHTML = '<b>' + esc(cur.album.title) + '</b>' + (p.caption ? ' &middot; ' + esc(p.caption) : '');
        lbCount.textContent = (cur.i + 1) + ' / ' + n;
        lb.classList.toggle('single', n === 1);
    }
    function close() {
        lb.classList.remove('on');
        lightboxOpen = false;
        document.body.style.overflow = '';
    }
    lb.querySelector('.gal-lb-close').onclick = close;
    lb.querySelector('.gal-lb-prev').onclick = function (e) { e.stopPropagation(); show(cur.i - 1); };
    lb.querySelector('.gal-lb-next').onclick = function (e) { e.stopPropagation(); show(cur.i + 1); };
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
        if (!lightboxOpen) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') show(cur.i - 1);
        else if (e.key === 'ArrowRight') show(cur.i + 1);
    });
    // swipe in the lightbox
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
        if (sx === null) return;
        var dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) > 40) show(cur.i + (dx < 0 ? 1 : -1));
        sx = null;
    });
})();
