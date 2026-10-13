// Profile panel on the People pages. Profiles come from people-profiles-data.js (written by
// tools/apply_dashboard_export.py from profiles approved in the group dashboard). A card or
// hexagon with data-profile="<slug>" opens that person's panel; its name, title and photo
// are taken from the card itself.
(function () {
    var DATA = window.PEOPLE_PROFILES || {};
    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function url(u) { return /^https?:\/\//.test(u) ? u : 'https://' + u; }
    var LINKS = [
        ['scholar',  'fa-graduation-cap', 'Google Scholar'],
        ['orcid',    'orcid-icon',        'ORCID'],
        ['linkedin', 'fa-linkedin',       'LinkedIn'],
        ['github',   'fa-github',         'GitHub'],
        ['website',  'fa-globe',          'Website'],
    ];

    var overlay = document.createElement('div');
    overlay.className = 'profile-overlay';
    overlay.innerHTML = '<div class="profile-panel" role="dialog" aria-modal="true" aria-labelledby="profileName">' +
        '<button class="profile-close" aria-label="Close">&times;</button><div class="profile-body"></div></div>';
    document.body.appendChild(overlay);
    var body = overlay.querySelector('.profile-body');
    var lastFocus = null;

    function open(slug, card) {
        var p = DATA[slug];
        if (!p) return;
        var img = card.querySelector('img');
        var name = card.querySelector('h3, .phex-info-name');
        var role = card.querySelector('.role, .phex-info-role');
        var links = LINKS.filter(function (l) { return p[l[0]]; }).map(function (l) {
            var icon = l[1] === 'orcid-icon' ? '<span class="orcid-icon">iD</span>' : '<i class="fa ' + l[1] + '"></i>';
            return '<a href="' + esc(url(p[l[0]])) + '" target="_blank" rel="noopener">' + icon + ' ' + l[2] + '</a>';
        });
        if (p.email) links.unshift('<a href="mailto:' + esc(p.email) + '"><i class="fa fa-envelope"></i> ' + esc(p.email) + '</a>');
        body.innerHTML =
            '<div class="profile-head">' +
            (img ? '<div class="profile-photo"><img src="' + esc(img.getAttribute('src')) + '" alt=""></div>' : '') +
            '<div><h3 id="profileName">' + esc(name ? name.textContent : '') + '</h3>' +
            (role ? '<div class="profile-role">' + role.innerHTML + '</div>' : '') + '</div></div>' +
            (p.bio ? '<p class="profile-bio">' + esc(p.bio) + '</p>' : '') +
            (p.interests ? '<p class="profile-meta"><b>Research interests:</b> ' + esc(p.interests) + '</p>' : '') +
            (p.nowAt ? '<p class="profile-meta"><b>Now:</b> ' + esc(p.nowAt) + '</p>' : '') +
            (links.length ? '<div class="profile-links">' + links.join('') + '</div>' : '');
        lastFocus = document.activeElement;
        overlay.classList.add('open');
        overlay.querySelector('.profile-close').focus();
    }
    function close() {
        overlay.classList.remove('open');
        if (lastFocus) lastFocus.focus();
    }
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    overlay.querySelector('.profile-close').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay.classList.contains('open')) close(); });

    Array.prototype.forEach.call(document.querySelectorAll('[data-profile]'), function (card) {
        var slug = card.getAttribute('data-profile');
        if (!DATA[slug]) return;
        card.classList.add('has-profile');
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        if (card.classList.contains('member-card')) {
            var more = document.createElement('span');
            more.className = 'more';
            more.innerHTML = '<a>Profile &rarr;</a>';
            card.appendChild(more);
        }
        card.addEventListener('click', function () { open(slug, card); });
        card.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(slug, card); }
        });
    });
})();
