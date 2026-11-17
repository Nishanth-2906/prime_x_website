(function () {
  'use strict';

  /* ---------- data ---------- */
  var BOOT = { config: {}, projects: [] };
  try { BOOT = JSON.parse(document.getElementById('boot').textContent); } catch (e) {}
  var CONFIG = BOOT.config || {};
  var USER = BOOT.user || null;
  var PROJECTS = BOOT.projects || [];

  var PRODUCTS = [
    { id: 'sliding-w', name: 'uPVC Sliding Windows', kind: 'Window', img: 't12.jpg', desc: 'Smooth operation, space-saving design and elegant appearance for modern residential and commercial spaces.' },
    { id: 'casement', name: 'uPVC Casement Windows', kind: 'Window', img: 't11.jpg', desc: 'Designed for excellent ventilation, effective sealing and timeless architectural appeal.' },
    { id: 'tilt-turn', name: 'Tilt & Turn Windows', kind: 'Window', img: 't13.jpg', desc: 'Versatile opening functionality combined with contemporary European-inspired design.' },
    { id: 'sliding-d', name: 'uPVC Sliding Doors', kind: 'Door', img: 'sliding-terrace.jpg', desc: 'Create wider openings and connect indoor spaces with balconies, gardens and outdoor environments.' },
    { id: 'french', name: 'French Doors', kind: 'Door', img: 't23.jpg', desc: 'A sophisticated combination of classic styling and modern functionality.' }
  ];

  var INSTALLS = [
    { img: 'sliding-terrace.jpg', cap: 'Four-panel sliding door opening to a terrace' },
    { img: 'tophung-combo.jpg', cap: 'Top-hung and fixed combination window' },
    { img: 'bifold-showroom.jpg', cap: 'Bi-fold door set on display' }
  ];

  var GALLERY = [
    { img: 'hero.jpg', cap: 'Bi-fold and French doors', cat: 'Windows & doors' },
    { img: 'candeur.jpg', cap: 'Candeur Construction', cat: 'Projects' },
    { img: 't11.jpg', cap: 'Casement windows', cat: 'Windows & doors' },
    { img: 'sliding-terrace.jpg', cap: 'Four-panel sliding door', cat: 'Windows & doors' },
    { img: 'mahaveer.jpg', cap: 'Mahaveer', cat: 'Projects' },
    { img: 't12.jpg', cap: 'Sliding windows', cat: 'Windows & doors' },
    { img: 'nikhar.jpg', cap: 'Nikhar', cat: 'Projects' },
    { img: 't13.jpg', cap: 'Tilt and turn windows', cat: 'Windows & doors' },
    { img: 'showcase.jpg', cap: 'The PrimeX range', cat: 'Windows & doors' },
    { img: 'saikrupa.jpg', cap: 'Saikrupa', cat: 'Projects' },
    { img: 't21.jpg', cap: 'Top-hung window', cat: 'Windows & doors' },
    { img: 'tophung-combo.jpg', cap: 'Top-hung and fixed combination window', cat: 'Windows & doors' },
    { img: 'sankalpa.jpg', cap: 'Sankalpa', cat: 'Projects' },
    { img: 't22.jpg', cap: 'Bay window', cat: 'Windows & doors' },
    { img: 'finishes.jpg', cap: 'Colours and finishes', cat: 'Windows & doors' },
    { img: 'saritha.jpg', cap: 'Saritha Developers', cat: 'Projects' },
    { img: 't23.jpg', cap: 'French doors', cat: 'Windows & doors' },
    { img: 'bifold-showroom.jpg', cap: 'Bi-fold door set', cat: 'Windows & doors' },
    { img: 'saritha2.jpg', cap: 'Saritha Developers, second view', cat: 'Projects' },
    { img: 't31.jpg', cap: 'Arched window', cat: 'Windows & doors' },
    { img: 't32.jpg', cap: 'Vertical sliding window', cat: 'Windows & doors' },
    { img: 't33.jpg', cap: 'Large fixed glazing', cat: 'Windows & doors' }
  ];

  var NAME = 'PrimeX International';
  var PAGES = {
    '/': { id: 'home', title: NAME + ' | uPVC Windows and Doors, Bangalore' },
    '/about': { id: 'about', title: 'About Us | ' + NAME },
    '/products': { id: 'products', title: 'uPVC Windows and Doors | ' + NAME },
    '/projects': { id: 'projects', title: 'Projects | ' + NAME },
    '/gallery': { id: 'gallery', title: 'Gallery | ' + NAME },
    '/why-primex': { id: 'why', title: 'Why PrimeX | ' + NAME },
    '/request-pricing': { id: 'quote', title: 'Request Pricing | ' + NAME },
    '/account': { id: 'account', title: 'Sign in | ' + NAME },
    '/reset-password': { id: 'reset', title: 'Reset password | ' + NAME },
    '/contact': { id: 'contact', title: 'Contact Us | ' + NAME }
  };
  var ID_TO_PATH = {};
  Object.keys(PAGES).forEach(function (p) { ID_TO_PATH[PAGES[p].id] = p; });

  /* ---------- helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(t) {
    var el = $('#toast'); el.textContent = t; el.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('show'); }, 2400);
  }
  function telHref(p) { return 'tel:' + String(p).replace(/[^\d+]/g, ''); }
  function waHref(text) { return 'https://wa.me/' + CONFIG.whatsapp + (text ? '?text=' + encodeURIComponent(text) : ''); }
  function projImg(src) { return /^\/(img|uploads)\//.test(src) ? src : ''; }

  /* ---------- contact info (shows only what the owner has filled in) ---------- */
  function renderContact() {
    var items = [];
    if (CONFIG.phoneSet) items.push(['Phone', '<a href="' + telHref(CONFIG.phone) + '">' + esc(CONFIG.phone) + '</a>']);
    if (CONFIG.emailSet) items.push(['Email', '<a href="mailto:' + esc(CONFIG.email) + '">' + esc(CONFIG.email) + '</a>']);
    if (CONFIG.addressSet) items.push(['Address', esc(CONFIG.address)]);
    if (CONFIG.whatsappSet) items.push(['WhatsApp', '<a href="' + waHref('Hello PrimeX, I would like pricing for my project.') + '" target="_blank" rel="noopener">Chat with us</a>']);

    $('#contact-cards').innerHTML = items.length
      ? items.map(function (i) { return '<div><b>' + i[0] + '</b><span>' + i[1] + '</span></div>'; }).join('')
      : '<div><b>Get in touch</b><span>Send a pricing request and our team will call you back.</span></div>';

    $('#contactList').innerHTML = items.map(function (i) { return '<li><b>' + i[0] + '</b> ' + i[1] + '</li>'; }).join('');
    $('#footContact').innerHTML = items.length
      ? items.map(function (i) { return '<div style="padding:3px 0">' + i[1] + '</div>'; }).join('')
      : '<a href="/request-pricing">Request pricing</a>';

    var strip = $('#strip');
    var bits = [];
    if (CONFIG.phoneSet) bits.push(esc(CONFIG.phone));
    if (CONFIG.emailSet) bits.push(esc(CONFIG.email));
    if (bits.length) { $('#stripContact').innerHTML = bits.join('&nbsp;&nbsp;|&nbsp;&nbsp;'); strip.hidden = false; } else { strip.hidden = true; }

    var fa = $('#floatActions'), wa = $('#fabWa'), call = $('#fabCall');
    wa.hidden = !CONFIG.whatsappSet; call.hidden = !CONFIG.phoneSet;
    if (CONFIG.whatsappSet) wa.href = waHref('Hello PrimeX, I would like pricing for my project.');
    if (CONFIG.phoneSet) call.href = telHref(CONFIG.phone);
    fa.hidden = !(CONFIG.whatsappSet || CONFIG.phoneSet);
  }

  /* ---------- products and cart ---------- */
  var cart = {};
  try {
    var saved = JSON.parse(localStorage.getItem('px_cart') || '{}');
    PRODUCTS.forEach(function (p) {
      var v = saved[p.id]; if (v == null) return;
      var o = typeof v === 'object' ? v : { q: v }, q = parseInt(o.q, 10);
      if (q > 0) cart[p.id] = { q: Math.min(q, 999), size: String(o.size || '').slice(0, 40), where: String(o.where || '').slice(0, 60) };
    });
  } catch (e) {}
  function saveCart() { try { localStorage.setItem('px_cart', JSON.stringify(cart)); } catch (e) {} }
  function prod(id) { return PRODUCTS.filter(function (x) { return x.id === id; })[0]; }

  function productCard(p) {
    return '<article class="card"><div class="media"><img src="/img/' + p.img + '" alt="' + esc(p.name) + '" width="500" height="400" loading="lazy" decoding="async"></div>' +
      '<div class="body"><span class="tag">' + p.kind + '</span><h3>' + esc(p.name) + '</h3><p>' + esc(p.desc) + '</p>' +
      '<div class="foot"><span class="price">Price on request</span><button type="button" class="btn btn-line btn-sm" data-add="' + p.id + '">Add to request</button></div></div></article>';
  }
  function renderProducts() {
    $('#products-grid').innerHTML = PRODUCTS.map(productCard).join('');
    $('#home-products').innerHTML = PRODUCTS.map(productCard).join('') +
      '<a class="card see-all" href="/products"><span class="eyebrow" style="color:var(--brass-lt)">Made to size</span><strong>Every opening, made to your measurements</strong><span class="go">See the full range</span></a>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-add]');
    if (!b) return;
    var id = b.getAttribute('data-add'), p = prod(id);
    if (!p) return;
    cart[id] = cart[id] || { q: 0, size: '', where: '' };
    cart[id].q = Math.min(999, cart[id].q + 1);
    saveCart(); renderCart();
    toast(p.name + ' added to your request');
  });

  function renderCart() {
    var total = 0, ids = Object.keys(cart);
    ids.forEach(function (k) { total += cart[k].q; });
    $('#cartCount').textContent = total;
    $('#basket').innerHTML = ids.length ? ids.map(function (id) {
      var p = prod(id), c = cart[id]; if (!p) return '';
      return '<div class="item"><div class="top"><img src="/img/' + p.img + '" alt="" width="56" height="46"><span class="n">' + esc(p.name) + '</span>' +
        '<button type="button" class="rm" data-r="' + id + '">Remove</button></div>' +
        '<div class="ctl"><span class="qty"><button type="button" data-d="' + id + '" aria-label="Fewer ' + esc(p.name) + '">&minus;</button><span>' + c.q + '</span><button type="button" data-u="' + id + '" aria-label="More ' + esc(p.name) + '">+</button></span>' +
        '<input class="mini" data-sz="' + id + '" value="' + esc(c.size) + '" maxlength="40" placeholder="Size, e.g. 4 ft x 4 ft" aria-label="Approximate size of ' + esc(p.name) + '">' +
        '<input class="mini" data-wh="' + id + '" value="' + esc(c.where) + '" maxlength="60" placeholder="Used in, e.g. bedrooms" aria-label="Where ' + esc(p.name) + ' is used"></div></div>';
    }).join('') : '<p class="empty">No products added yet. Add them below, or describe what you need in the form.</p>';
    var missing = PRODUCTS.filter(function (p) { return !cart[p.id]; });
    $('#quickAdd').innerHTML = missing.length ? '<p>' + (ids.length ? 'Add another:' : 'Add a product:') + '</p>' + missing.map(function (p) { return '<button type="button" data-add="' + p.id + '">+ ' + esc(p.name) + '</button>'; }).join('') : '';
  }
  $('#basket').addEventListener('click', function (e) {
    var t = e.target, u = t.getAttribute('data-u'), d = t.getAttribute('data-d'), r = t.getAttribute('data-r');
    if (u && cart[u]) cart[u].q = Math.min(999, cart[u].q + 1);
    else if (d && cart[d]) { cart[d].q -= 1; if (cart[d].q <= 0) delete cart[d]; }
    else if (r) delete cart[r];
    else return;
    saveCart(); renderCart();
  });
  $('#basket').addEventListener('input', function (e) {
    var t = e.target, sz = t.getAttribute('data-sz'), wh = t.getAttribute('data-wh');
    if (sz && cart[sz]) cart[sz].size = t.value.slice(0, 40);
    else if (wh && cart[wh]) cart[wh].where = t.value.slice(0, 60);
    else return;
    saveCart();
  });

  /* ---------- projects ---------- */
  function typeLabel(t) { return t === 'High-rise' || t === 'Mid-rise' ? t + ' apartments' : (t || 'Project'); }
  function projCard(p) {
    var meta = typeLabel(p.type) + ' &middot; ' + (p.location ? esc(p.location) : 'uPVC windows and doors by PrimeX');
    return '<article class="proj"><div class="thumb"><img src="' + projImg(p.image) + '" alt="' + esc(p.name) + '" width="260" height="195" loading="lazy" decoding="async"></div>' +
      '<div class="info"><span class="status ' + (p.status === 'Ongoing' ? 'ongoing' : 'done') + '">' + esc(p.status) + '</span>' +
      '<h3>' + esc(p.name) + '</h3><p class="meta">' + meta + '</p>' +
      '<button type="button" class="btn btn-line btn-sm" data-proj="' + p.id + '">View details</button></div></article>';
  }
  var projFilter = 'all';
  function renderProjects() {
    var types = [];
    PROJECTS.forEach(function (p) { if (p.type && types.indexOf(p.type) < 0) types.push(p.type); });
    var hasOngoing = PROJECTS.some(function (p) { return p.status === 'Ongoing'; });
    var opts = ['all'].concat(types, hasOngoing ? ['Ongoing'] : []);
    if (opts.indexOf(projFilter) < 0) projFilter = 'all';
    $('#proj-filters').innerHTML = opts.length > 2 ? opts.map(function (o) {
      return '<button type="button" data-p="' + esc(o) + '" aria-pressed="' + (o === projFilter) + '">' + (o === 'all' ? 'All' : esc(o)) + '</button>';
    }).join('') : '';
    var list = PROJECTS.filter(function (p) { return projFilter === 'all' || p.type === projFilter || (projFilter === 'Ongoing' && p.status === 'Ongoing'); });
    $('#projCount').textContent = list.length + (list.length === 1 ? ' project shown' : ' projects shown');
    $('#proj-grid').innerHTML = list.map(projCard).join('');
    $('#home-projects').innerHTML = PROJECTS.slice(0, 4).map(projCard).join('');
  }
  $('#proj-filters').addEventListener('click', function (e) {
    var b = e.target.closest('[data-p]'); if (!b) return;
    projFilter = b.getAttribute('data-p'); renderProjects();
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-proj]'); if (!b) return;
    var p = PROJECTS.filter(function (x) { return String(x.id) === b.getAttribute('data-proj'); })[0];
    if (!p) return;
    var rows = [['Project', p.name], ['Building', typeLabel(p.type)], ['Location', p.location], ['Year', p.year], ['Flats', p.flats],
      ['Supplied', p.scope || 'uPVC windows and doors'], ['Status', p.status]].filter(function (r) { return r[1]; });
    var pics = '<img src="' + projImg(p.image) + '" alt="' + esc(p.name) + '">' + (p.image2 ? '<img src="' + projImg(p.image2) + '" alt="' + esc(p.name) + ' second view">' : '');
    openViewer('<div class="pic">' + pics + '</div><div class="txt"><button type="button" class="close" aria-label="Close">&times;</button>' +
      '<span class="status ' + (p.status === 'Ongoing' ? 'ongoing' : 'done') + '">' + esc(p.status) + '</span>' +
      '<h3 style="margin-top:10px;font-size:1.9rem">' + esc(p.name) + '</h3>' +
      '<dl>' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>' +
      '<a class="btn btn-primary btn-sm" href="/request-pricing" data-close>Request pricing for a similar project</a></div>');
  });

  /* ---------- installs, gallery, why ---------- */
  function renderStatic() {
    $('#installs-grid').innerHTML = INSTALLS.map(function (i, n) {
      return '<figure data-img="' + n + '" tabindex="0" role="button" aria-label="Enlarge: ' + esc(i.cap) + '"><img src="/img/' + i.img + '" alt="' + esc(i.cap) + '" loading="lazy" decoding="async"><figcaption>' + esc(i.cap) + '</figcaption></figure>';
    }).join('');
    $('#year').textContent = new Date().getFullYear();
  }
  function lightbox(src, cap) {
    openViewer('<button type="button" class="close" aria-label="Close" style="z-index:2;position:fixed">&times;</button><img src="' + src + '" alt="' + esc(cap) + '">', true);
  }
  $('#installs-grid').addEventListener('click', function (e) {
    var f = e.target.closest('figure'); if (!f) return;
    var i = INSTALLS[f.getAttribute('data-img')]; lightbox('/img/' + i.img, i.cap);
  });
  $('#installs-grid').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var f = e.target.closest('figure'); if (!f) return;
    e.preventDefault(); var i = INSTALLS[f.getAttribute('data-img')]; lightbox('/img/' + i.img, i.cap);
  });
  function renderGallery(f) {
    $('#gallery-grid').innerHTML = GALLERY.map(function (g, i) { return [g, i]; }).filter(function (x) { return f === 'all' || x[0].cat === f; }).map(function (x) {
      return '<figure data-gi="' + x[1] + '" tabindex="0" role="button" aria-label="Enlarge: ' + esc(x[0].cap) + '"><img src="/img/' + x[0].img + '" alt="' + esc(x[0].cap) + '" loading="lazy" decoding="async"><figcaption>' + esc(x[0].cap) + '</figcaption></figure>';
    }).join('');
  }
  $('#gal-filters').addEventListener('click', function (e) {
    var b = e.target.closest('[data-g]'); if (!b) return;
    $$('#gal-filters button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    renderGallery(b.getAttribute('data-g'));
  });
  function galleryOpen(e) {
    var f = e.target.closest('figure'); if (!f) return false;
    var g = GALLERY[f.getAttribute('data-gi')]; lightbox('/img/' + g.img, g.cap); return true;
  }
  $('#gallery-grid').addEventListener('click', galleryOpen);
  $('#gallery-grid').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { if (galleryOpen(e)) e.preventDefault(); }
  });

  /* ---------- viewer (modal) ---------- */
  var viewer = $('#viewer'), vbox = $('#vbox'), lastFocus = null;
  function openViewer(html, solo) {
    lastFocus = document.activeElement;
    vbox.className = 'vbox' + (solo ? ' solo' : '');
    vbox.innerHTML = html;
    viewer.classList.add('open');
    document.body.classList.add('noscroll');
    var c = vbox.querySelector('.close'); if (c) c.focus();
  }
  function closeViewer() {
    if (!viewer.classList.contains('open')) return;
    viewer.classList.remove('open'); vbox.innerHTML = '';
    document.body.classList.remove('noscroll');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  viewer.addEventListener('click', function (e) {
    if (e.target === viewer || e.target.closest('.close') || e.target.closest('[data-close]')) closeViewer();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeViewer(); });

  /* ---------- account ---------- */
  var pendingNotice = '', nextUrl = '';
  function call(method, url, body) {
    var ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, 20000);
    return fetch(url, { method: method, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'primex' }, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin', signal: ctrl.signal })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (x) { clearTimeout(timer); return x; }, function (err) { clearTimeout(timer); throw err; });
  }
  var NETERR = 'Could not reach the server. Check your connection and try again.';
  function setErrors(prefix, fields) {
    Object.keys(fields || {}).forEach(function (k) { var m = $('#' + prefix + k); if (m) m.textContent = fields[k]; });
  }
  function firstName() { return USER ? String(USER.name).split(' ')[0] : ''; }
  function updateAccountUI() {
    $('#acctLabel').textContent = USER ? firstName() : 'Sign in';
    $('#acctLink').classList.toggle('signed', !!USER);
    $('#acctLink').setAttribute('aria-label', USER ? 'Your account, ' + USER.name : 'Sign in');
    $('#signedAs').innerHTML = USER ? 'Signed in as <b>' + esc(USER.name) + '</b> (' + esc(USER.email) + '). <button type="button" class="linkbtn" data-signout>Not you? Sign out</button>' : '';
  }
  function safeNext(u) {
    if (!u || u.charAt(0) !== '/' || u.charAt(1) === '/') return '';
    var p = u.split('?')[0].replace(/\/+$/, '') || '/';
    return PAGES[p] && PAGES[p].id !== 'account' && PAGES[p].id !== 'reset' ? p : '';
  }
  function showAcctForm(which) {
    $('#signinForm').hidden = which !== 'in'; $('#signupForm').hidden = which !== 'up'; $('#forgotForm').hidden = which !== 'forgot';
    $('.tabs').hidden = which === 'forgot';
    $('#tabIn').setAttribute('aria-selected', which === 'in'); $('#tabUp').setAttribute('aria-selected', which === 'up');
    var f = which === 'in' ? '#si-email' : which === 'up' ? '#su-name' : '#fo-email'; var el = $(f); if (el && current !== null) el.focus({ preventScroll: true });
  }
  $('#tabIn').addEventListener('click', function () { showAcctForm('in'); });
  $('#tabUp').addEventListener('click', function () { showAcctForm('up'); });
  $('#toForgot').addEventListener('click', function () { $('#fo-email').value = $('#si-email').value; showAcctForm('forgot'); });
  $('#backToIn').addEventListener('click', function () { showAcctForm('in'); });

  function renderAccountPage() {
    var n = $('#acctNotice');
    n.textContent = pendingNotice; n.hidden = !pendingNotice;
    $('#acctForms').hidden = !!USER; $('#acctHome').hidden = !USER;
    if (!USER) { showAcctForm(location.hash === '#create' ? 'up' : 'in'); return; }
    $('#acctHello').textContent = 'Hello, ' + firstName();
    $('#acctMeta').textContent = USER.email + (USER.company ? ' · ' + USER.company : '');
    var box = $('#myReqs'); box.textContent = 'Loading...';
    call('GET', '/api/my-requests').then(function (r) {
      if (!r.ok) { box.textContent = 'Could not load your requests.'; return; }
      box.innerHTML = r.j.length ? r.j.map(function (q) {
        var d = new Date(q.created_at);
        return '<div class="req"><b>' + esc(q.ref) + '</b><span>' + (isNaN(d) ? '' : d.toLocaleDateString([], { dateStyle: 'medium' })) + '</span><span class="st st-' + esc(q.status) + '">' + esc(q.status === 'new' ? 'received' : q.status) + '</span>' +
          '<p>' + (q.items.length ? q.items.map(function (i) { return esc(i.name) + ' × ' + i.qty; }).join(', ') : 'Described in notes') + '</p></div>';
      }).join('') : '<p class="empty">No requests yet.</p>';
    }, function () { box.textContent = NETERR; });
  }
  function afterAuth(user) {
    USER = user; updateAccountUI(); prefillForm();
    pendingNotice = '';
    var go = nextUrl; nextUrl = '';
    routeTo(go || '/account', true);
    toast('Signed in as ' + user.name);
  }
  function busy(btn, on, text) { btn.disabled = on; if (on) { btn.dataset.t = btn.textContent; btn.textContent = text; } else if (btn.dataset.t) btn.textContent = btn.dataset.t; }

  $('#signinForm').addEventListener('submit', function (e) {
    e.preventDefault(); $('#siError').textContent = '';
    var email = $('#si-email').value.trim(), pw = $('#si-pass').value;
    if (!email || !pw) { $('#siError').textContent = 'Enter your email and password.'; return; }
    var btn = $('#siBtn'); busy(btn, true, 'Signing in...');
    call('POST', '/api/auth/login', { email: email, password: pw }).then(function (r) {
      if (r.ok && r.j.user) { $('#si-pass').value = ''; afterAuth(r.j.user); } else $('#siError').textContent = r.j.error || 'Could not sign in.';
    }, function () { $('#siError').textContent = NETERR; }).then(function () { busy(btn, false); });
  });
  $('#signupForm').addEventListener('submit', function (e) {
    e.preventDefault(); $('#suError').textContent = ''; $$('#signupForm .err').forEach(function (x) { x.textContent = ''; });
    var d = { name: $('#su-name').value, phone: $('#su-phone').value, email: $('#su-email').value, company: $('#su-company').value, password: $('#su-pass').value, website: $('#su-web').value };
    var f = {};
    if (d.name.trim().length < 2) f.name = 'Enter your name.';
    if (!/^\+?[\d\s\-()]{7,20}$/.test(d.phone.trim()) || d.phone.replace(/\D/g, '').length < 7) f.phone = 'Enter a valid phone number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) f.email = 'Enter a valid email address.';
    if (d.password.length < 8) f.password = 'Use at least 8 characters.';
    if (Object.keys(f).length) { setErrors('su-e-', f); $('#suError').textContent = 'Please fix the highlighted fields.'; return; }
    var btn = $('#suBtn'); busy(btn, true, 'Creating account...');
    call('POST', '/api/auth/signup', d).then(function (r) {
      if (r.ok && r.j.user) { $('#su-pass').value = ''; afterAuth(r.j.user); return; }
      setErrors('su-e-', r.j.fields); $('#suError').textContent = r.j.error || 'Could not create the account.';
    }, function () { $('#suError').textContent = NETERR; }).then(function () { busy(btn, false); });
  });
  $('#forgotForm').addEventListener('submit', function (e) {
    e.preventDefault(); $('#foError').textContent = ''; $('#foOk').textContent = '';
    var email = $('#fo-email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $('#foError').textContent = 'Enter a valid email address.'; return; }
    var btn = $('#foBtn'); busy(btn, true, 'Sending...');
    call('POST', '/api/auth/forgot', { email: email }).then(function (r) {
      if (!r.ok) { $('#foError').textContent = r.j.error || 'Could not send the link.'; return; }
      if (r.j.emailed === false) $('#foError').textContent = 'Reset by email is not available right now. Please contact us' + (CONFIG.phoneSet ? ' on ' + CONFIG.phone : '') + ' and we will help.';
      else $('#foOk').textContent = 'If that email has an account, a reset link is on its way. It is valid for one hour.';
    }, function () { $('#foError').textContent = NETERR; }).then(function () { busy(btn, false); });
  });
  $('#resetForm').addEventListener('submit', function (e) {
    e.preventDefault(); $('#rsError').textContent = '';
    var token = new URLSearchParams(location.search).get('token') || '', pw = $('#rs-pass').value;
    if (!token) { $('#rsError').textContent = 'This reset link is incomplete. Please request a new one.'; return; }
    if (pw.length < 8) { $('#rsError').textContent = 'Use at least 8 characters.'; return; }
    var btn = $('#rsBtn'); busy(btn, true, 'Saving...');
    call('POST', '/api/auth/reset', { token: token, password: pw }).then(function (r) {
      if (r.ok && r.j.user) { $('#rs-pass').value = ''; USER = r.j.user; updateAccountUI(); prefillForm(); toast('Password updated'); routeTo('/account', true); }
      else $('#rsError').textContent = r.j.error || 'Could not reset the password.';
    }, function () { $('#rsError').textContent = NETERR; }).then(function () { busy(btn, false); });
  });
  function signOut() {
    call('POST', '/api/auth/logout').then(function () {}, function () {}).then(function () {
      USER = null; updateAccountUI(); pendingNotice = ''; toast('Signed out'); routeTo('/', true);
    });
  }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-signout]')) signOut(); });
  $('#signOutBtn').addEventListener('click', signOut);

  /* ---------- pricing request form ---------- */
  var form = $('#enqForm'), formStart = Date.now();
  var FID = { buyerType: 'type', need: 'scope', projectName: 'project', contactPref: 'pref', contactTime: 'ctime' };
  function clearErrors() {
    $$('#enqForm .err').forEach(function (e) { e.textContent = ''; });
    $$('#enqForm [aria-invalid]').forEach(function (i) { i.removeAttribute('aria-invalid'); });
    $('#formError').textContent = '';
  }
  function showFieldErrors(fields) {
    var first = null;
    Object.keys(fields || {}).forEach(function (k) {
      var el = $('#f-' + (FID[k] || k)), msg = $('#e-' + k);
      if (el) { el.setAttribute('aria-invalid', 'true'); first = first || el; }
      if (msg) msg.textContent = fields[k];
    });
    if (first) first.focus();
  }
  function prefillForm() {
    if (!USER) return;
    [['#f-name', USER.name], ['#f-phone', USER.phone], ['#f-email', USER.email], ['#f-company', USER.company]].forEach(function (x) {
      var el = $(x[0]); if (el && !el.value) el.value = x[1] || '';
    });
  }
  function localValidate(d) {
    var f = {};
    if (d.name.trim().length < 2) f.name = 'Enter your name.';
    if (!/^\+?[\d\s\-()]{7,20}$/.test(d.phone.trim()) || d.phone.replace(/\D/g, '').length < 7) f.phone = 'Enter a valid phone number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) f.email = 'Enter a valid email address.';
    if (d.city.trim().length < 2) f.city = 'Tell us the city or area of the project.';
    if (!d.timeline) f.timeline = 'Choose when you need it.';
    if (!d.items.length && d.message.trim().length < 10) f.message = 'Add products on the left, or describe what you need here.';
    if (!d.consent) f.consent = 'Please tick this so we can contact you.';
    return f;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();
    if (!USER) { goLogin('Please sign in or create an account to send your pricing request.'); return; }
    var data = {
      name: $('#f-name').value, phone: $('#f-phone').value, email: $('#f-email').value, company: $('#f-company').value,
      buyerType: $('#f-type').value, need: $('#f-scope').value, projectName: $('#f-project').value, city: $('#f-city').value,
      stage: $('#f-stage').value, units: $('#f-units').value, timeline: $('#f-timeline').value,
      glazing: $('#f-glazing').value, finish: $('#f-finish').value, message: $('#f-msg').value,
      contactPref: $('#f-pref').value, contactTime: $('#f-ctime').value, consent: $('#f-consent').checked,
      website: $('#f-web').value, elapsed: Date.now() - formStart,
      items: Object.keys(cart).map(function (id) {
        var p = prod(id); return p ? { id: id, name: p.name, qty: cart[id].q, size: cart[id].size, where: cart[id].where } : null;
      }).filter(Boolean)
    };
    var bad = localValidate(data);
    if (Object.keys(bad).length) { showFieldErrors(bad); $('#formError').textContent = 'Please fix the highlighted fields.'; return; }

    var btn = $('#sendBtn'); btn.disabled = true; btn.textContent = 'Sending...';
    call('POST', '/api/enquiries', data).then(function (res) {
      if (res.ok && res.j.ok) {
        cart = {}; saveCart(); renderCart(); form.reset(); formStart = Date.now(); prefillForm();
        $('#refNo').textContent = res.j.ref || '';
        form.hidden = true; var s = $('#success'); s.hidden = false; s.focus(); window.scrollTo(0, 0);
        return;
      }
      if (res.status === 401) { USER = null; updateAccountUI(); goLogin('Your session has ended. Please sign in again. Your request is saved on this page.'); return; }
      if (res.j && res.j.fields) showFieldErrors(res.j.fields);
      $('#formError').textContent = (res.j && res.j.error) || 'We could not send your request. Please try again.';
    }, function () {
      $('#formError').textContent = 'Could not reach the server. Check your connection and try again' + (CONFIG.phoneSet ? ', or call us on ' + CONFIG.phone + '.' : '.');
    }).then(function () { btn.disabled = false; btn.textContent = 'Send pricing request'; });
  });
  $('#againBtn').addEventListener('click', function () { $('#success').hidden = true; form.hidden = false; formStart = Date.now(); $('#f-project').focus(); });
  // Optional WhatsApp route, prefilled with the products.
  function updateWa() {
    var wa = $('#waBtn'); if (!CONFIG.whatsappSet) { wa.hidden = true; return; }
    var lines = Object.keys(cart).map(function (id) { var p = prod(id); return p ? '- ' + p.name + ' x ' + cart[id].q + (cart[id].size ? ' (' + cart[id].size + ')' : '') : ''; }).filter(Boolean);
    wa.href = waHref('Hello PrimeX, I would like pricing for my project.' + (lines.length ? '\n\nProducts:\n' + lines.join('\n') : ''));
    wa.hidden = false;
  }
  var _renderCart = renderCart;
  renderCart = function () { _renderCart(); updateWa(); };

  /* ---------- router (real URLs, no page reloads) ---------- */
  var current = null;
  function goLogin(notice) {
    pendingNotice = notice || '';
    nextUrl = '/request-pricing';
    routeTo('/account', true);
  }
  function routeTo(url, push, replace) {
    var qi = url.indexOf('?'), path = (qi < 0 ? url : url.slice(0, qi)) || '/', search = qi < 0 ? '' : url.slice(qi);
    path = path.replace(/\/+$/, '') || '/';
    var page = PAGES[path], id = page ? page.id : 'notfound';
    if (id === 'quote' && !USER) {
      pendingNotice = pendingNotice || 'Please sign in or create an account to send your pricing request. The products you chose are saved.';
      nextUrl = '/request-pricing';
      return routeTo('/account', push, !push);
    }
    if (id === 'account' && !nextUrl) nextUrl = safeNext(new URLSearchParams(search).get('next'));
    var full = path + search;
    $$('[data-page]').forEach(function (el) { el.hidden = el.getAttribute('data-page') !== id; });
    $$('.links a').forEach(function (a) {
      if (a.getAttribute('data-nav') === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = page ? page.title : 'Page not found | ' + NAME;
    if (full !== location.pathname + location.search) { if (push) history.pushState({}, '', full); else if (replace) history.replaceState({}, '', full); }
    $('#links').classList.remove('open'); $('#menuBtn').setAttribute('aria-expanded', 'false');
    if (id === 'quote') { prefillForm(); if (current !== 'quote') { $('#success').hidden = true; form.hidden = false; formStart = Date.now(); } }
    if (id === 'account') renderAccountPage(); else pendingNotice = '';
    if (id === 'reset' && !new URLSearchParams(search).get('token')) $('#rsError').textContent = 'This reset link is incomplete. Please request a new one from the sign-in page.';
    var was = current; current = id;
    if (was !== null) { window.scrollTo(0, 0); $('#main').focus({ preventScroll: true }); }
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a[href]');
    if (!a || a.target || a.hasAttribute('download')) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (/^\/(admin|api|uploads|img|fonts|css|js)(\/|$)/.test(url.pathname) || /\.(xml|txt|png|jpg)$/.test(url.pathname)) return;
    e.preventDefault();
    if (url.pathname + url.search === location.pathname + location.search) { window.scrollTo(0, 0); $('#links').classList.remove('open'); return; }
    if (url.pathname.replace(/\/+$/, '') === '/account') nextUrl = '';
    routeTo(url.pathname + url.search, true);
  });
  window.addEventListener('popstate', function () { routeTo(location.pathname + location.search, false); });

  /* ---------- header ---------- */
  $('#menuBtn').addEventListener('click', function () {
    var o = $('#links').classList.toggle('open'); this.setAttribute('aria-expanded', o ? 'true' : 'false');
  });
  var navEl = $('#nav');
  function onScroll() { navEl.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- init ---------- */
  renderContact(); renderProducts(); renderProjects(); renderStatic(); renderGallery('all'); renderCart(); updateAccountUI();
  // Old #hash links from the earlier version of the site go to the matching page.
  var HASH = { home: '/', about: '/about', products: '/products', projects: '/projects', gallery: '/gallery', why: '/why-primex', quote: '/request-pricing', contact: '/contact' };
  if (location.pathname === '/' && HASH[location.hash.slice(1)]) { history.replaceState({}, '', HASH[location.hash.slice(1)]); }
  routeTo(location.pathname + location.search, false);
})();
