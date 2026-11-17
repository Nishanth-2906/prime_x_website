const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const auth = require('./lib/auth');
const mail = require('./lib/mail');
const users = require('./lib/users');
const { db, UPLOAD_DIR, isPlaceholder, getSettings, setSettings, backupNow } = require('./lib/db');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC = path.join(__dirname, 'public');
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:'],
        'font-src': ["'self'"],
        'connect-src': ["'self'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(compression());

/* ---------- pages (real URLs, each with its own title and description) ---------- */
const NAME = 'PrimeX International';
const PAGES = {
  '/': { id: 'home', title: `${NAME} | uPVC Windows and Doors, Bangalore`, desc: 'Bangalore-based manufacturer of premium uPVC windows and doors for 14 years, with an excellent record of on-time delivery. Request pricing today.' },
  '/about': { id: 'about', title: `About Us | ${NAME}`, desc: 'Bangalore-based uPVC window and door manufacturer. Our vision, our mission and how we build every frame.' },
  '/products': { id: 'products', title: `uPVC Windows and Doors | ${NAME}`, desc: 'Sliding windows, casement windows, tilt and turn windows, sliding doors and French doors made to your sizes.' },
  '/projects': { id: 'projects', title: `Projects | ${NAME}`, desc: 'Apartment towers and residential projects fitted with PrimeX uPVC windows and doors.' },
  '/gallery': { id: 'gallery', title: `Gallery | ${NAME}`, desc: 'Photos of our uPVC window and door range and completed projects.' },
  '/why-primex': { id: 'why', title: `Why PrimeX | ${NAME}`, desc: 'Fifteen reasons builders, architects and customers choose PrimeX uPVC windows and doors.' },
  '/request-pricing': { id: 'quote', title: `Request Pricing | ${NAME}`, desc: 'Tell us your products, sizes and timeline. Our team replies with a detailed quotation.', noindex: true },
  '/account': { id: 'account', title: `Sign in | ${NAME}`, desc: 'Sign in or create an account to send a pricing request.', noindex: true },
  '/reset-password': { id: 'reset', title: `Reset password | ${NAME}`, desc: 'Choose a new password.', noindex: true },
  '/contact': { id: 'contact', title: `Contact Us | ${NAME}`, desc: 'Call, email or visit PrimeX International in Bangalore.' },
};
const NOT_FOUND = { noindex: true, id: 'notfound', title: `Page not found | ${NAME}`, desc: 'This page does not exist.' };

const template = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
const assetVersion = (() => {
  const h = crypto.createHash('md5');
  for (const f of ['css/site.css', 'js/app.js']) h.update(fs.readFileSync(path.join(PUBLIC, f)));
  return h.digest('hex').slice(0, 8);
})();

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const jsonForHtml = (o) => JSON.stringify(o).replace(/</g, '\\u003c').split('\u2028').join('\\u2028').split('\u2029').join('\\u2029');

function publicConfig() {
  const s = getSettings();
  return {
    phone: s.phone,
    email: s.email,
    whatsapp: s.whatsapp,
    address: s.address,
    phoneSet: !isPlaceholder('phone', s.phone),
    emailSet: !isPlaceholder('email', s.email),
    whatsappSet: !isPlaceholder('whatsapp', s.whatsapp),
    addressSet: !isPlaceholder('address', s.address),
  };
}
const publicProjects = () => db.prepare('SELECT id, name, type, status, location, year, flats, scope, image, image2 FROM projects WHERE visible = 1 ORDER BY sort, id').all();

function renderPage(req, res, page, status = 200) {
  const base = (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const cfg = publicConfig();
  const url = base + (req.path === '/' ? '/' : req.path.replace(/\/$/, ''));
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    name: NAME,
    url: base + '/',
    image: base + '/img/hero.jpg',
    description: PAGES['/'].desc,
    areaServed: 'Bangalore, Karnataka, India',
    ...(cfg.phoneSet && { telephone: cfg.phone }),
    ...(cfg.emailSet && { email: cfg.email }),
    ...(cfg.addressSet && { address: cfg.address }),
  };
  const html = template
    .replace(/\{\{TITLE\}\}/g, escAttr(page.title))
    .replace(/\{\{DESC\}\}/g, escAttr(page.desc))
    .replace(/\{\{URL\}\}/g, escAttr(status === 200 ? url : base + '/'))
    .replace(/\{\{OGIMAGE\}\}/g, escAttr(base + '/img/hero.jpg'))
    .replace(/\{\{PAGE\}\}/g, page.id)
    .replace('{{ROBOTS}}', page.noindex ? '<meta name="robots" content="noindex">' : '')
    .replace(/\{\{V\}\}/g, assetVersion)
    .replace('{{LD}}', jsonForHtml(ld))
    .replace('{{BOOT}}', jsonForHtml({ config: cfg, projects: publicProjects(), user: ((u) => (u ? users.publicUser(u) : null))(users.currentUser(req)) }));
  res.status(status).set('Cache-Control', 'no-cache').type('html').send(html);
}

for (const [route, page] of Object.entries(PAGES)) {
  app.get(route, (req, res) => renderPage(req, res, page));
  if (route !== '/') app.get(route + '/', (req, res) => res.redirect(301, route));
}
app.get('/home', (req, res) => res.redirect(301, '/'));
app.get('/get-quote', (req, res) => res.redirect(301, '/request-pricing'));

/* ---------- static files ---------- */
const longCache = { maxAge: '30d', immutable: true };
app.use('/img', express.static(path.join(PUBLIC, 'img'), { maxAge: '7d' }));
app.use('/fonts', express.static(path.join(PUBLIC, 'fonts'), longCache));
app.use('/css', express.static(path.join(PUBLIC, 'css'), { maxAge: '7d' }));
app.use('/js', express.static(path.join(PUBLIC, 'js'), { maxAge: '7d' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', index: false, dotfiles: 'deny' }));
app.use('/admin', express.static(path.join(PUBLIC, 'admin'), { maxAge: 0, index: 'index.html' }));
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(PUBLIC, 'img', 'favicon.png')));
app.get('/robots.txt', (req, res) => {
  const base = (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nDisallow: /account\nDisallow: /request-pricing\nDisallow: /reset-password\nDisallow: /api\nSitemap: ${base}/sitemap.xml\n`);
});
app.get('/sitemap.xml', (req, res) => {
  const base = (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const urls = Object.keys(PAGES).filter((p) => !PAGES[p].noindex).map((p) => `<url><loc>${base}${p === '/' ? '/' : p}</loc></url>`).join('');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
});
app.get('/healthz', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

/* ---------- public API ---------- */
const api = express.Router();
api.use(express.json({ limit: '60kb' }));
api.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

api.get('/config', (req, res) => res.json(publicConfig()));
api.get('/projects', (req, res) => res.json(publicProjects()));

const BUYER_TYPES = ['Builder / developer', 'Architect / contractor', 'Individual customer', 'Other'];
const NEEDS = ['Supply and installation', 'Supply only', 'Not sure yet'];
const STAGES = ['Planning stage', 'Under construction', 'Ready for fit-out', 'Replacing windows in an existing building'];
const TIMELINES = ['Immediately', 'Within 1 month', '1 to 3 months', '3 to 6 months', 'Just exploring prices'];
const GLAZINGS = ['Single glazed', 'Double glazed', 'Not sure yet'];
const FINISHES = ['White', 'Golden oak', 'Dark walnut', 'Anthracite', 'Black', 'Mix of finishes', 'Not sure yet'];
const CONTACT_PREFS = ['Phone call', 'WhatsApp', 'Email'];
const CONTACT_TIMES = ['Morning (9 to 12)', 'Afternoon (12 to 4)', 'Evening (4 to 7)', 'Any time'];
const clean = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max) : '');
const pick = (v, list) => (list.includes(v) ? v : '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_OK = (p) => /^\+?[\d\s\-()]{7,20}$/.test(p) && p.replace(/\D/g, '').length >= 7;

// Customer-facing POSTs must come from our own pages (custom header + same-site cookie).
const customerOnly = (req, res, next) => {
  if (req.get('X-Requested-With') !== 'primex') return res.status(403).json({ error: 'Blocked request.' });
  next();
};
const requireUser = (req, res, next) => {
  const u = users.currentUser(req);
  if (!u) return res.status(401).json({ error: 'Please sign in to send your request.', signin: true });
  req.user = u;
  next();
};
const limiter = (limit, windowMin, msg) => rateLimit({ windowMs: windowMin * 60 * 1000, limit, standardHeaders: true, legacyHeaders: false, message: { error: msg } });

/* ---------- customer accounts ---------- */
const signupLimiter = limiter(10, 60, 'Too many sign-ups from this connection. Please try again later.');
const signinLimiter = limiter(20, 15, 'Too many sign-in attempts. Please wait 15 minutes.');
const forgotLimiter = limiter(5, 60, 'Too many reset requests. Please try again in an hour.');

api.get('/auth/me', (req, res) => {
  const u = users.currentUser(req);
  res.json({ user: u ? users.publicUser(u) : null });
});
api.post('/auth/signup', customerOnly, signupLimiter, async (req, res) => {
  const b = req.body || {};
  if (clean(b.website, 50)) return res.json({ ok: true, user: null }); // bot trap
  const name = clean(b.name, 80), email = clean(b.email, 120).toLowerCase(), phone = clean(b.phone, 20), company = clean(b.company, 100);
  const password = typeof b.password === 'string' ? b.password : '';
  const f = {};
  if (name.length < 2) f.name = 'Enter your name.';
  if (!EMAIL_RE.test(email)) f.email = 'Enter a valid email address.';
  if (!PHONE_OK(phone)) f.phone = 'Enter a valid phone number.';
  if (password.length < 8 || password.length > 128) f.password = 'Use at least 8 characters.';
  if (Object.keys(f).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: f });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'An account with this email already exists. Please sign in.', fields: { email: 'Already registered. Sign in instead.' } });
  }
  const hash = await users.hashPassword(password);
  let id;
  try {
    id = Number(db.prepare('INSERT INTO users (name, email, phone, company, pass_hash, last_login) VALUES (?,?,?,?,?, strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\'))').run(name, email, phone, company, hash).lastInsertRowid);
  } catch {
    return res.status(409).json({ error: 'An account with this email already exists. Please sign in.', fields: { email: 'Already registered. Sign in instead.' } });
  }
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  users.startSession(req, res, u);
  res.json({ ok: true, user: users.publicUser(u) });
});
api.post('/auth/login', customerOnly, signinLimiter, async (req, res) => {
  const b = req.body || {};
  const email = clean(b.email, 120).toLowerCase();
  const password = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
  const u = email ? db.prepare('SELECT * FROM users WHERE email = ?').get(email) : null;
  const ok = await users.checkPassword(password, u ? u.pass_hash : await users.dummyHash());
  if (!u || !ok) return res.status(401).json({ error: 'Email or password is not correct.' });
  db.prepare("UPDATE users SET last_login = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(u.id);
  users.startSession(req, res, u);
  res.json({ ok: true, user: users.publicUser(u) });
});
api.post('/auth/logout', customerOnly, (req, res) => {
  users.endSession(res);
  res.json({ ok: true });
});
api.post('/auth/forgot', customerOnly, forgotLimiter, async (req, res) => {
  const email = clean((req.body || {}).email, 120).toLowerCase();
  const u = EMAIL_RE.test(email) ? db.prepare('SELECT * FROM users WHERE email = ?').get(email) : null;
  if (!mail.canSend) return res.json({ ok: true, emailed: false }); // frontend tells the person to contact us
  if (u) {
    const base = (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    mail.sendResetMail(u, `${base}/reset-password?token=${encodeURIComponent(users.resetToken(u))}`).catch((e) => console.error('Reset email failed:', e.message));
  }
  res.json({ ok: true, emailed: true }); // same answer whether or not the account exists
});
api.post('/auth/reset', customerOnly, signinLimiter, async (req, res) => {
  const b = req.body || {};
  const u = users.userFromResetToken(typeof b.token === 'string' ? b.token : '');
  const password = typeof b.password === 'string' ? b.password : '';
  if (!u) return res.status(400).json({ error: 'This reset link has expired or was already used. Please request a new one.' });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Use at least 8 characters.', fields: { password: 'Use at least 8 characters.' } });
  db.prepare('UPDATE users SET pass_hash = ? WHERE id = ?').run(await users.hashPassword(password), u.id);
  const fresh = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
  users.startSession(req, res, fresh);
  res.json({ ok: true, user: users.publicUser(fresh) });
});

/* ---------- pricing requests (sign-in required) ---------- */
const enquiryLimiter = limiter(12, 60, 'Too many requests. Please call us instead, or try again in an hour.');

api.post('/enquiries', customerOnly, requireUser, enquiryLimiter, (req, res) => {
  const b = req.body || {};
  // Bots: hidden field filled, or form submitted impossibly fast. Pretend success, store nothing.
  if (clean(b.website, 50) || (Number.isFinite(b.elapsed) && b.elapsed < 2500)) return res.json({ ok: true, ref: 'PX-00000' });

  const name = clean(b.name, 80);
  const phone = clean(b.phone, 20);
  const email = clean(b.email, 120) || req.user.email;
  const company = clean(b.company, 100);
  const city = clean(b.city, 80);
  const projectName = clean(b.projectName, 100);
  const units = clean(b.units, 40);
  const message = clean(b.message, 2000);
  const buyer = pick(b.buyerType, BUYER_TYPES);
  const need = pick(b.need, NEEDS);
  const stage = pick(b.stage, STAGES);
  const timeline = pick(b.timeline, TIMELINES);
  const glazing = pick(b.glazing, GLAZINGS);
  const finish = pick(b.finish, FINISHES);
  const contactPref = pick(b.contactPref, CONTACT_PREFS);
  const contactTime = pick(b.contactTime, CONTACT_TIMES);

  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 30).map((i) => ({
    id: clean(i && i.id, 40),
    name: clean(i && i.name, 80),
    qty: Math.min(999, Math.max(1, parseInt(i && i.qty, 10) || 1)),
    size: clean(i && i.size, 40),
    where: clean(i && i.where, 60),
  })).filter((i) => i.name);

  const errors = {};
  if (name.length < 2) errors.name = 'Enter your name.';
  if (!PHONE_OK(phone)) errors.phone = 'Enter a valid phone number.';
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  if (city.length < 2) errors.city = 'Tell us the city or area of the project.';
  if (!buyer) errors.buyerType = 'Choose one.';
  if (!need) errors.need = 'Choose one.';
  if (!timeline) errors.timeline = 'Choose when you need it.';
  if (!items.length && message.length < 10) errors.message = 'Add products above, or describe what you need here.';
  if (b.consent !== true) errors.consent = 'Please tick this so we can contact you.';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });

  // Double-click / retry guard: same customer, products and message within a minute reuses the first record.
  const itemsJson = JSON.stringify(items);
  const dup = db.prepare(
    `SELECT id FROM enquiries WHERE user_id = ? AND items = ? AND message = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ','now','-60 seconds') ORDER BY id DESC LIMIT 1`
  ).get(req.user.id, itemsJson, message);
  if (dup) return res.json({ ok: true, ref: mail.refOf(dup) });

  const info = db.prepare(
    `INSERT INTO enquiries (user_id, name, phone, email, company, city, project_name, buyer_type, need, stage, timeline, glazing, finish, units, contact_pref, contact_time, message, items)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(req.user.id, name, phone, email, company, city, projectName, buyer, need, stage, timeline, glazing, finish, units, contactPref, contactTime, message, itemsJson);
  const id = Number(info.lastInsertRowid);
  res.json({ ok: true, ref: mail.refOf({ id }) });
  notify(id); // after responding; failures are recorded and retried
  if (mail.canSend) mail.sendConfirmation(db.prepare('SELECT * FROM enquiries WHERE id = ?').get(id)).catch((e) => console.error('Confirmation email failed:', e.message));
});

// A signed-in customer can see their own earlier requests.
api.get('/my-requests', requireUser, (req, res) => {
  const rows = db.prepare('SELECT id, created_at, status, items, city, project_name FROM enquiries WHERE user_id = ? ORDER BY id DESC LIMIT 50').all(req.user.id);
  res.json(rows.map((r) => ({ ref: mail.refOf(r), created_at: r.created_at, status: r.status, city: r.city, projectName: r.project_name, items: JSON.parse(r.items || '[]') })));
});

async function notify(id) {
  const row = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(id);
  if (!row || row.notified) return;
  if (!mail.enabled) {
    db.prepare("UPDATE enquiries SET notify_error = 'Email not configured' WHERE id = ?").run(id);
    return;
  }
  try {
    await mail.sendEnquiryMail(row);
    db.prepare("UPDATE enquiries SET notified = 1, notify_error = '' WHERE id = ?").run(id);
  } catch (err) {
    db.prepare('UPDATE enquiries SET notify_attempts = notify_attempts + 1, notify_error = ? WHERE id = ?').run(String(err.message).slice(0, 300), id);
    console.error('Enquiry email failed:', err.message);
  }
}
// Retry unsent notifications every 5 minutes (up to 8 tries each).
setInterval(() => {
  if (!mail.enabled) return;
  for (const r of db.prepare('SELECT id FROM enquiries WHERE notified = 0 AND notify_attempts < 8 ORDER BY id LIMIT 20').all()) notify(r.id);
}, 5 * 60 * 1000).unref();

/* ---------- admin API ---------- */
const adm = express.Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again in 15 minutes.' } });

adm.post('/login', loginLimiter, (req, res) => {
  const pw = clean((req.body || {}).password, 200);
  if (!pw || !auth.passwordOk(pw)) return res.status(401).json({ error: 'Wrong password.' });
  auth.setSession(req, res);
  res.json({ ok: true });
});
adm.post('/logout', (req, res) => {
  auth.clearSession(res);
  res.json({ ok: true });
});
adm.get('/me', (req, res) => res.json({ signedIn: auth.verifyToken(auth.readCookie(req, auth.COOKIE)) }));

adm.use(auth.requireAdmin);

adm.get('/summary', (req, res) => {
  const c = (sql) => db.prepare(sql).get().c;
  res.json({
    newEnquiries: c("SELECT COUNT(*) c FROM enquiries WHERE status = 'new'"),
    totalEnquiries: c('SELECT COUNT(*) c FROM enquiries'),
    unsentEmails: c('SELECT COUNT(*) c FROM enquiries WHERE notified = 0'),
    emailConfigured: mail.enabled,
    projects: c('SELECT COUNT(*) c FROM projects'),
    settings: getSettings(),
    placeholders: Object.fromEntries(Object.entries(getSettings()).map(([k, v]) => [k, isPlaceholder(k, v)])),
  });
});

const STATUSES = ['new', 'contacted', 'quoted', 'won', 'closed'];
adm.get('/enquiries', (req, res) => {
  const status = STATUSES.includes(req.query.status) ? req.query.status : '';
  const q = clean(req.query.q, 60);
  const where = [];
  const args = [];
  if (status) { where.push('status = ?'); args.push(status); }
  if (q) { where.push('(name LIKE ? OR phone LIKE ? OR email LIKE ? OR city LIKE ? OR message LIKE ?)'); args.push(...Array(5).fill(`%${q.replace(/[%_]/g, '')}%`)); }
  const rows = db.prepare(`SELECT * FROM enquiries ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT 500`).all(...args);
  res.json(rows.map((r) => ({ ...r, ref: mail.refOf(r), items: JSON.parse(r.items || '[]') })));
});
adm.patch('/enquiries/:id', (req, res) => {
  const { status, note } = req.body || {};
  const row = db.prepare('SELECT id FROM enquiries WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found.' });
  if (status !== undefined) {
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Bad status.' });
    db.prepare('UPDATE enquiries SET status = ? WHERE id = ?').run(status, row.id);
  }
  if (note !== undefined) db.prepare('UPDATE enquiries SET note = ? WHERE id = ?').run(clean(note, 1000), row.id);
  res.json({ ok: true });
});
adm.post('/enquiries/:id/resend', async (req, res) => {
  if (!mail.enabled) return res.status(400).json({ error: 'Email is not configured on the server.' });
  db.prepare('UPDATE enquiries SET notified = 0 WHERE id = ?').run(req.params.id);
  await notify(Number(req.params.id));
  const row = db.prepare('SELECT notified, notify_error FROM enquiries WHERE id = ?').get(req.params.id);
  res.json({ ok: Boolean(row && row.notified), error: row ? row.notify_error : 'Not found.' });
});
adm.delete('/enquiries/:id', (req, res) => {
  db.prepare('DELETE FROM enquiries WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
adm.get('/enquiries.csv', (req, res) => {
  const cell = (v, phone) => {
    let s = String(v ?? '');
    // Block spreadsheet formula injection. Phone numbers are already limited to digits and + - ( ) spaces.
    if (!phone && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const rows = db.prepare('SELECT * FROM enquiries ORDER BY id DESC').all();
  const head = ['Ref', 'Received (UTC)', 'Name', 'Phone', 'Email', 'Company', 'Location', 'Project', 'Customer type', 'Need', 'Stage', 'Timeline', 'Glazing', 'Finish', 'Units', 'Preferred contact', 'Best time', 'Products', 'Details', 'Status', 'Note'];
  const lines = [head.map(cell).join(',')].concat(rows.map((r) => [
    mail.refOf(r), r.created_at, r.name, r.phone, r.email, r.company, r.city, r.project_name, r.buyer_type, r.need, r.stage, r.timeline, r.glazing, r.finish, r.units, r.contact_pref, r.contact_time,
    JSON.parse(r.items || '[]').map((i) => [`${i.name} x ${i.qty}`, i.size && `size ${i.size}`, i.where && `for ${i.where}`].filter(Boolean).join(' ')).join('; '), r.message, r.status, r.note,
  ].map((v, i) => cell(v, i === 3)).join(',')));
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="primex-enquiries.csv"' });
  res.send('﻿' + lines.join('\r\n'));
});

adm.get('/settings', (req, res) => res.json(getSettings()));
adm.put('/settings', (req, res) => {
  const b = req.body || {};
  const next = {
    phone: clean(b.phone, 30),
    email: clean(b.email, 120),
    whatsapp: clean(b.whatsapp, 20).replace(/\D/g, ''),
    address: clean(b.address, 300),
  };
  if (next.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (next.whatsapp && next.whatsapp.length < 10) return res.status(400).json({ error: 'WhatsApp number needs the country code, e.g. 919845012345.' });
  for (const k of Object.keys(next)) if (!next[k]) delete next[k];
  setSettings(next);
  res.json({ ok: true, settings: getSettings() });
});

/* projects with image upload */
const MIME_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + (MIME_EXT[file.mimetype] || '.bin')),
  }),
  limits: { fileSize: 6 * 1024 * 1024, files: 2, fields: 20 },
  fileFilter: (req, file, cb) => cb(MIME_EXT[file.mimetype] ? null : new Error('Only JPG, PNG or WebP images are allowed.'), Boolean(MIME_EXT[file.mimetype])),
});
const MAGIC = { '.jpg': [0xff, 0xd8, 0xff], '.png': [0x89, 0x50, 0x4e, 0x47], '.webp': [0x52, 0x49, 0x46, 0x46] };
function looksLikeImage(file) {
  const ext = path.extname(file.filename);
  const buf = Buffer.alloc(4);
  const fd = fs.openSync(file.path, 'r');
  fs.readSync(fd, buf, 0, 4, 0);
  fs.closeSync(fd);
  return (MAGIC[ext] || []).every((b, i) => buf[i] === b);
}
const removeUpload = (url) => {
  if (url && url.startsWith('/uploads/')) fs.rm(path.join(UPLOAD_DIR, path.basename(url)), { force: true }, () => {});
};
const uploadFields = upload.fields([{ name: 'image', maxCount: 1 }, { name: 'image2', maxCount: 1 }]);
function withUpload(handler) {
  return (req, res) =>
    uploadFields(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image is larger than 6 MB.' : err.message });
      for (const f of Object.values(req.files || {}).flat()) {
        if (!looksLikeImage(f)) {
          fs.rmSync(f.path, { force: true });
          return res.status(400).json({ error: 'That file is not a real image.' });
        }
      }
      handler(req, res);
    });
}
const PTYPES = ['High-rise', 'Mid-rise', 'Villas', 'Commercial', 'Other'];
const PSTATUS = ['Completed', 'Ongoing'];
function projectFields(b) {
  return {
    name: clean(b.name, 100),
    type: PTYPES.includes(b.type) ? b.type : 'Other',
    status: PSTATUS.includes(b.status) ? b.status : 'Completed',
    location: clean(b.location, 100),
    year: clean(b.year, 12),
    flats: clean(b.flats, 30),
    scope: clean(b.scope, 300),
    sort: Math.max(0, Math.min(9999, parseInt(b.sort, 10) || 0)),
    visible: b.visible === '0' || b.visible === 0 || b.visible === false || b.visible === 'false' ? 0 : 1,
  };
}

adm.get('/projects', (req, res) => res.json(db.prepare('SELECT * FROM projects ORDER BY sort, id').all()));
adm.post('/projects', withUpload((req, res) => {
  const f = projectFields(req.body);
  if (!f.name) return res.status(400).json({ error: 'Project name is required.' });
  const img = (k) => (req.files && req.files[k] ? '/uploads/' + req.files[k][0].filename : '');
  const max = db.prepare('SELECT COALESCE(MAX(sort), -1) m FROM projects').get().m;
  const info = db.prepare(
    'INSERT INTO projects (name, type, status, location, year, flats, scope, image, image2, sort, visible) VALUES (@name,@type,@status,@location,@year,@flats,@scope,@image,@image2,@sort,@visible)'
  ).run({ ...f, image: img('image'), image2: img('image2'), sort: req.body.sort ? f.sort : max + 1 });
  res.json({ ok: true, id: Number(info.lastInsertRowid) });
}));
adm.put('/projects/:id', withUpload((req, res) => {
  const cur = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'Not found.' });
  const f = projectFields(req.body);
  if (!f.name) return res.status(400).json({ error: 'Project name is required.' });
  let image = cur.image;
  let image2 = cur.image2;
  if (req.files && req.files.image) { removeUpload(cur.image); image = '/uploads/' + req.files.image[0].filename; }
  if (req.files && req.files.image2) { removeUpload(cur.image2); image2 = '/uploads/' + req.files.image2[0].filename; }
  if (req.body.removeImage2 === '1' && !(req.files && req.files.image2)) { removeUpload(cur.image2); image2 = ''; }
  db.prepare(
    'UPDATE projects SET name=@name, type=@type, status=@status, location=@location, year=@year, flats=@flats, scope=@scope, image=@image, image2=@image2, sort=@sort, visible=@visible WHERE id=@id'
  ).run({ ...f, image, image2, id: cur.id });
  res.json({ ok: true });
}));
adm.delete('/projects/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (cur) { removeUpload(cur.image); removeUpload(cur.image2); db.prepare('DELETE FROM projects WHERE id = ?').run(cur.id); }
  res.json({ ok: true });
});
adm.post('/backup', async (req, res) => {
  await backupNow();
  res.json({ ok: true });
});

api.use('/admin', adm);
api.use((req, res) => res.status(404).json({ error: 'Not found.' }));
app.use('/api', api);

/* ---------- 404 and errors ---------- */
app.use((req, res) => renderPage(req, res, NOT_FOUND, 404));
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large.' });
  if (err instanceof SyntaxError && err.status === 400) return res.status(400).json({ error: 'Bad request.' });
  console.error(err);
  if (req.path.startsWith('/api')) return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  res.status(500).type('text').send('Something went wrong.');
});

/* ---------- start, backups, clean shutdown ---------- */
const server = app.listen(PORT, () => console.log(`PrimeX site running on port ${PORT}`));
backupNow().catch((e) => console.error('Backup failed:', e.message));
setInterval(() => backupNow().catch((e) => console.error('Backup failed:', e.message)), 24 * 3600e3).unref();
process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    server.close(() => { try { db.close(); } catch {} process.exit(0); });
    setTimeout(() => process.exit(0), 8000).unref();
  });
}
