/* Photo gallery for gallery.html.
 * Data: window.GALLERY_ALBUMS (assets/js/gallery-data.js, built by tools/build_gallery.py).
 * The banner album (group photos) is a large strip at the top of the page.
 * Each other album is a strip of photos drifting slowly from left to right; hovering, keyboard focus
 * or the pause button stop it, the arrows nudge it, and clicking a photo opens it full size with previous / next.
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

    // one line for the strip: event (or note) and place; falls back to date / place
    function shortCaption(p) {
        var main = p.event || p.note;
        return main ? [main, p.place].filter(Boolean).join(' · ') : [p.place, p.date].filter(Boolean).join(' · ');
    }

    function esc(s) {
        return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
    }

    // The album marked as banner (the group photos) rotates in a large banner at the top;
    // every other album is an event, shown below as a drifting strip.
    var BANNER = ALBUMS.filter(function (a) { return a.banner; })[0];
    var EVENTS = ALBUMS.filter(function (a) { return !a.banner; });
    var strips = [];

    // ---------- pause / play for all strips (moving content needs a way to stop it)
    var motion = { paused: false };
    function stopped() {
        return motion.paused || document.documentElement.classList.contains('a11y-still');
    }
    if (!reduceMotion) {
        var pauseBtn = document.createElement('button');
        pauseBtn.type = 'button';
        pauseBtn.className = 'gal-motion';
        pauseBtn.setAttribute('aria-pressed', 'false');
        pauseBtn.innerHTML = '<span aria-hidden="true">&#10073;&#10073;</span> Pause photos';
        pauseBtn.onclick = function () {
            motion.paused = !motion.paused;
            pauseBtn.setAttribute('aria-pressed', String(motion.paused));
            pauseBtn.innerHTML = motion.paused ? '<span aria-hidden="true">&#9654;</span> Play photos' : '<span aria-hidden="true">&#10073;&#10073;</span> Pause photos';
        };
        root.appendChild(pauseBtn);
    }

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
            var cap = shortCaption(p);
            // the button carries the name, so the image itself is not announced a second time
            b.setAttribute('aria-label', 'View full size: ' + (cap || album.title + ', photo ' + (i + 1)));
            b.innerHTML = '<img src="' + album.folder + p.file + '" alt="" loading="lazy">' +
                (cap ? '<span class="gal-cap" aria-hidden="true">' + esc(cap) + '</span>' : '');
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
                // copies only make the loop seamless: keep them out of the keyboard and screen-reader order
                c.setAttribute('aria-hidden', 'true');
                Array.prototype.forEach.call(c.querySelectorAll('.gal-tile'), function (b, i) {
                    b.tabIndex = -1;
                    b.onclick = function () { openLightbox(album, i % album.photos.length); };
                });
                track.appendChild(c);
            }
            s.setWidth = w * reps;
        }

        viewport.addEventListener('mouseenter', function () { s.hover = true; });
        viewport.addEventListener('mouseleave', function () { s.hover = false; });
        // tabbing to a photo: stop the strip and slide the photo into view
        viewport.addEventListener('focusin', function (e) {
            s.focus = true;
            if (!s.loop) return;
            requestAnimationFrame(function () {
                viewport.scrollLeft = 0;   // the browser may scroll the clipped viewport; move the track instead
                var t = e.target.getBoundingClientRect(), v = viewport.getBoundingClientRect(), pad = 48;
                if (t.left < v.left + pad) s.offset += v.left + pad - t.left;
                else if (t.right > v.right - pad) s.offset -= t.right - (v.right - pad);
                track.style.transform = 'translateX(' + (s.offset - s.setWidth) + 'px)';
            });
        });
        viewport.addEventListener('focusout', function () { s.focus = false; });
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
            if (!s.loop || !s.setWidth || s.focus) return;
            // moving left -> right: offset grows, wraps by one unit width
            var v = (s.hover || s.focus || lightboxOpen || stopped()) ? 0 : SPEED;
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
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML =
        '<button type="button" class="gal-lb-close" aria-label="Close">&times;</button>' +
        '<button type="button" class="gal-lb-prev" aria-label="Previous photo">&#8249;</button>' +
        '<figure><img alt=""><figcaption><span class="gal-lb-cap"></span><span class="gal-lb-count"></span></figcaption></figure>' +
        '<button type="button" class="gal-lb-next" aria-label="Next photo">&#8250;</button>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector('img'), lbCap = lb.querySelector('.gal-lb-cap'), lbCount = lb.querySelector('.gal-lb-count');
    var cur = { album: null, i: 0 }, lightboxOpen = false, opener = null;

    function openLightbox(album, i) {
        cur.album = album;
        show(i);
        lb.classList.add('on');
        lightboxOpen = true;
        document.body.style.overflow = 'hidden';
        opener = document.activeElement;
        lb.querySelector('.gal-lb-close').focus();
    }
    function show(i) {
        var n = cur.album.photos.length;
        cur.i = (i + n) % n;
        var p = cur.album.photos[cur.i];
        lbImg.src = cur.album.folder + p.file;
        lbImg.alt = shortCaption(p);
        var when = [p.date, p.place].filter(Boolean).join(' &middot; ');
        lbCap.innerHTML =
            '<span class="gal-lb-album">' + esc(cur.album.title) + '</span>' +
            (p.event ? '<span class="gal-lb-event">' + esc(p.event) + '</span>' : '') +
            (when ? '<span class="gal-lb-when">' + when.split(' &middot; ').map(esc).join(' &middot; ') + '</span>' : '') +
            (p.people ? '<span class="gal-lb-people">With: ' + esc(p.people) + '</span>' : '') +
            (p.note ? '<span class="gal-lb-note">' + esc(p.note) + '</span>' : '');
        lbCount.textContent = (cur.i + 1) + ' / ' + n;
        lb.classList.toggle('single', n === 1);
    }
    function close() {
        lb.classList.remove('on');
        lightboxOpen = false;
        document.body.style.overflow = '';
        if (opener) opener.focus();
    }
    lb.querySelector('.gal-lb-close').onclick = close;
    lb.querySelector('.gal-lb-prev').onclick = function (e) { e.stopPropagation(); show(cur.i - 1); };
    lb.querySelector('.gal-lb-next').onclick = function (e) { e.stopPropagation(); show(cur.i + 1); };
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
        if (!lightboxOpen) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'Tab') {   // keep focus inside the viewer while it is open
            var f = [].filter.call(lb.querySelectorAll('button'), function (b) { return b.offsetParent; });
            var k = f.indexOf(document.activeElement);
            if (e.shiftKey && k <= 0) { f[f.length - 1].focus(); e.preventDefault(); }
            else if (!e.shiftKey && k === f.length - 1) { f[0].focus(); e.preventDefault(); }
        }
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
