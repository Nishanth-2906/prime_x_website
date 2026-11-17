(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') el.textContent = attrs[k];
      else if (k === 'class') el.className = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] === true) el.setAttribute(k, '');
      else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k]);
    });
    [].concat(kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function toast(t) {
    var el = $('#toast'); el.textContent = t; el.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }
  function api(method, url, body, isForm) {
    var opts = { method: method, headers: { 'X-Requested-With': 'primex-admin' }, credentials: 'same-origin' };
    if (body !== undefined) {
      if (isForm) opts.body = body; else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    }
    return fetch(url, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 401 && url.indexOf('/login') < 0) { showLogin(); throw new Error('Please sign in.'); }
        if (!r.ok) throw new Error(j.error || 'Something went wrong.');
        return j;
      });
    });
  }

  /* ---- login ---- */
  function showLogin() { $('#app').hidden = true; $('#login').hidden = false; $('#pw').focus(); }
  function showApp() { $('#login').hidden = true; $('#app').hidden = false; loadAll(); }
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault(); $('#loginErr').textContent = '';
    api('POST', '/api/admin/login', { password: $('#pw').value }).then(function () { $('#pw').value = ''; showApp(); })
      .catch(function (err) { $('#loginErr').textContent = err.message; });
  });
  $('#logout').addEventListener('click', function () { api('POST', '/api/admin/logout', {}).then(showLogin).catch(showLogin); });

  /* ---- tabs ---- */
  $$('.a-tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.a-tabs button').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      ['enquiries', 'projects', 'settings'].forEach(function (t) { $('#tab-' + t).hidden = t !== b.getAttribute('data-tab'); });
    });
  });

  /* ---- summary banners ---- */
  var emailOn = false;
  function loadSummary() {
    return api('GET', '/api/admin/summary').then(function (s) {
      emailOn = s.emailConfigured;
      var box = $('#banners'); box.textContent = '';
      var missing = Object.keys(s.placeholders).filter(function (k) { return s.placeholders[k]; });
      if (missing.length) box.appendChild(h('div', { class: 'banner', text: 'Contact details still to fill in: ' + missing.join(', ') + '. Visitors do not see them until you add them under Contact details.' }));
      if (!s.emailConfigured) box.appendChild(h('div', { class: 'banner bad', text: 'Email alerts are off because the server has no mail settings. Quote requests are still saved here, but you will not be emailed.' }));
      else if (s.unsentEmails) box.appendChild(h('div', { class: 'banner bad', text: s.unsentEmails + ' quote request(s) have not been emailed yet. The server retries every few minutes, or open the request and press Resend email.' }));
      var nb = $('#newBadge'); nb.hidden = !s.newEnquiries; nb.textContent = s.newEnquiries;
      var f = s.settings; $('#s-phone').value = f.phone; $('#s-email').value = f.email; $('#s-whatsapp').value = f.whatsapp; $('#s-address').value = f.address;
      return s;
    });
  }

  /* ---- enquiries ---- */
  function fmtDate(iso) { var d = new Date(iso); return isNaN(d) ? iso : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); }
  function row(label, content) { return [h('dt', { text: label }), h('dd', {}, content)]; }
  function enquiryCard(e) {
    var items = e.items.length ? e.items.map(function (i) { return i.name + ' x ' + i.qty + (i.size ? ' (' + i.size + ')' : '') + (i.where ? ' for ' + i.where : ''); }).join('\n') : 'None selected';
    var dl = h('dl', {}, [].concat(
      row('Phone', h('a', { href: 'tel:' + e.phone.replace(/[^\d+]/g, ''), text: e.phone })),
      e.email ? row('Email', h('a', { href: 'mailto:' + e.email, text: e.email })) : [],
      e.company ? row('Company', e.company) : [],
      e.project_name ? row('Project', e.project_name) : [],
      e.city ? row('Location', e.city) : [],
      row('Customer', [e.buyer_type, e.need].filter(Boolean).join(' / ') || '-'),
      e.stage || e.timeline ? row('Stage / needed', [e.stage, e.timeline].filter(Boolean).join(' / ')) : [],
      e.units || e.glazing || e.finish ? row('Specs', [e.units, e.glazing, e.finish].filter(Boolean).join(' / ')) : [],
      e.contact_pref ? row('Contact by', [e.contact_pref, e.contact_time].filter(Boolean).join(', ')) : [],
      row('Products', h('span', { class: 'msg', text: items })),
      e.message ? row('Notes', h('span', { class: 'msg', text: e.message })) : []
    ));
    var sel = h('select', { 'aria-label': 'Status for ' + e.ref, onchange: function () {
      api('PATCH', '/api/admin/enquiries/' + e.id, { status: sel.value }).then(function () { toast('Status saved'); loadSummary(); card.classList.toggle('is-new', sel.value === 'new'); }).catch(function (err) { toast(err.message); });
    } }, ['new', 'contacted', 'quoted', 'won', 'closed'].map(function (s) { return h('option', { value: s, text: s[0].toUpperCase() + s.slice(1), selected: s === e.status }); }));
    var note = h('textarea', { rows: '2', maxlength: '1000', placeholder: 'Private note (only you see this)', 'aria-label': 'Note for ' + e.ref, onblur: function () {
      if (note.value !== e.note) api('PATCH', '/api/admin/enquiries/' + e.id, { note: note.value }).then(function () { e.note = note.value; toast('Note saved'); }).catch(function (err) { toast(err.message); });
    } });
    note.value = e.note || '';
    var actions = h('div', { class: 'enq-actions' }, [
      sel,
      !e.notified && emailOn ? h('span', { class: 'pill-warn', text: 'Email not sent' }) : null,
      !e.notified && emailOn ? h('button', { class: 'btn btn-line btn-sm', type: 'button', text: 'Resend email', onclick: function () {
        api('POST', '/api/admin/enquiries/' + e.id + '/resend', {}).then(function (r) { toast(r.ok ? 'Email sent' : 'Still failing: ' + r.error); loadEnquiries(); loadSummary(); }).catch(function (err) { toast(err.message); });
      } }) : null,
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn btn-line btn-sm', type: 'button', text: 'Delete', onclick: function () {
        if (confirm('Delete ' + e.ref + ' from ' + e.name + '? This cannot be undone.')) api('DELETE', '/api/admin/enquiries/' + e.id).then(function () { loadEnquiries(); loadSummary(); }).catch(function (err) { toast(err.message); });
      } })
    ]);
    var card = h('article', { class: 'enq' + (e.status === 'new' ? ' is-new' : '') }, [
      h('div', { class: 'enq-top' }, [h('h3', { text: e.name }), h('span', { class: 'ref', text: e.ref }), h('span', { class: 'when', text: fmtDate(e.created_at) })]),
      dl, actions, note
    ]);
    return card;
  }
  function loadEnquiries() {
    var q = '?status=' + encodeURIComponent($('#fStatus').value) + '&q=' + encodeURIComponent($('#fSearch').value.trim());
    return api('GET', '/api/admin/enquiries' + q).then(function (rows) {
      var box = $('#enqList'); box.textContent = '';
      if (!rows.length) box.appendChild(h('div', { class: 'empty-state', text: 'No quote requests match. New requests from the website appear here.' }));
      rows.forEach(function (r) { box.appendChild(enquiryCard(r)); });
    });
  }
  $('#fStatus').addEventListener('change', loadEnquiries);
  var st; $('#fSearch').addEventListener('input', function () { clearTimeout(st); st = setTimeout(loadEnquiries, 250); });

  /* ---- projects ---- */
  var editing = null;
  function loadProjects() {
    return api('GET', '/api/admin/projects').then(function (rows) {
      var box = $('#projList'); box.textContent = '';
      if (!rows.length) box.appendChild(h('div', { class: 'empty-state', text: 'No projects yet. Add your first one.' }));
      rows.forEach(function (p) {
        var meta = [p.type, p.status, p.location, p.year, p.flats ? p.flats + ' flats' : ''].filter(Boolean).join(' · ');
        box.appendChild(h('div', { class: 'prow' + (p.visible ? '' : ' hidden-row') }, [
          h('img', { src: p.image, alt: '' }),
          h('div', {}, [h('h3', { text: p.name }), h('p', { class: 'meta', text: meta + (p.visible ? '' : ' · Hidden') })]),
          h('div', { class: 'actions' }, [
            h('button', { class: 'btn btn-line btn-sm', type: 'button', text: 'Edit', onclick: function () { openProjForm(p); } }),
            h('button', { class: 'btn btn-line btn-sm', type: 'button', text: 'Delete', onclick: function () {
              if (confirm('Delete project "' + p.name + '"?')) api('DELETE', '/api/admin/projects/' + p.id).then(function () { toast('Project deleted'); loadProjects(); }).catch(function (err) { toast(err.message); });
            } })
          ])
        ]));
      });
    });
  }
  function openProjForm(p) {
    editing = p || null;
    $('#projForm').hidden = false; $('#projErr').textContent = '';
    $('#projFormTitle').textContent = p ? 'Edit project' : 'Add project';
    $('#p-name').value = p ? p.name : ''; $('#p-type').value = p ? p.type : 'High-rise'; $('#p-status').value = p ? p.status : 'Completed';
    $('#p-location').value = p ? p.location : ''; $('#p-year').value = p ? p.year : ''; $('#p-flats').value = p ? p.flats : '';
    $('#p-scope').value = p ? p.scope : ''; $('#p-sort').value = p ? p.sort : ''; $('#p-visible').checked = p ? !!p.visible : true;
    $('#p-image').value = ''; $('#p-image2').value = ''; $('#p-rm2').checked = false;
    $('#projForm').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('#p-name').focus();
  }
  $('#newProject').addEventListener('click', function () { openProjForm(null); });
  $('#projCancel').addEventListener('click', function () { $('#projForm').hidden = true; });
  $('#projForm').addEventListener('submit', function (e) {
    e.preventDefault(); $('#projErr').textContent = '';
    var fd = new FormData();
    fd.append('name', $('#p-name').value); fd.append('type', $('#p-type').value); fd.append('status', $('#p-status').value);
    fd.append('location', $('#p-location').value); fd.append('year', $('#p-year').value); fd.append('flats', $('#p-flats').value);
    fd.append('scope', $('#p-scope').value); fd.append('sort', $('#p-sort').value); fd.append('visible', $('#p-visible').checked ? '1' : '0');
    if ($('#p-rm2').checked) fd.append('removeImage2', '1');
    if ($('#p-image').files[0]) fd.append('image', $('#p-image').files[0]);
    if ($('#p-image2').files[0]) fd.append('image2', $('#p-image2').files[0]);
    var btn = $('#projSave'); btn.disabled = true;
    api(editing ? 'PUT' : 'POST', '/api/admin/projects' + (editing ? '/' + editing.id : ''), fd, true)
      .then(function () { toast('Project saved'); $('#projForm').hidden = true; loadProjects(); loadSummary(); })
      .catch(function (err) { $('#projErr').textContent = err.message; })
      .then(function () { btn.disabled = false; });
  });

  /* ---- settings ---- */
  $('#setForm').addEventListener('submit', function (e) {
    e.preventDefault(); $('#setErr').textContent = '';
    api('PUT', '/api/admin/settings', { phone: $('#s-phone').value, email: $('#s-email').value, whatsapp: $('#s-whatsapp').value, address: $('#s-address').value })
      .then(function () { toast('Saved. The website updates right away.'); loadSummary(); })
      .catch(function (err) { $('#setErr').textContent = err.message; });
  });
  $('#backupBtn').addEventListener('click', function () {
    api('POST', '/api/admin/backup', {}).then(function () { toast('Backup created'); }).catch(function (err) { toast(err.message); });
  });

  function loadAll() { loadSummary().then(loadEnquiries).then(loadProjects).catch(function () {}); }

  fetch('/api/admin/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); })
    .then(function (j) { if (j.signedIn) showApp(); else showLogin(); }).catch(showLogin);
})();
