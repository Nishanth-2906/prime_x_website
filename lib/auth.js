const crypto = require('crypto');

const PROD = process.env.NODE_ENV === 'production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (PROD ? '' : 'change-me-now');
const SESSION_SECRET = process.env.SESSION_SECRET || (PROD ? '' : crypto.randomBytes(32).toString('hex'));
const SESSION_HOURS = 12;
const COOKIE = 'px_admin';

if (PROD && (ADMIN_PASSWORD.length < 10 || SESSION_SECRET.length < 24)) {
  console.error('Refusing to start: set ADMIN_PASSWORD (10+ chars) and SESSION_SECRET (24+ chars) in the environment.');
  process.exit(1);
}
if (!PROD) console.warn('[dev] Admin password is "change-me-now". Set ADMIN_PASSWORD before going live.');

const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();
const passwordOk = (given) => crypto.timingSafeEqual(digest(given), digest(ADMIN_PASSWORD));

const hmac = (payload) => crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');

function makeToken() {
  const payload = Buffer.from(JSON.stringify({ k: 'admin', exp: Date.now() + SESSION_HOURS * 3600e3 })).toString('base64url');
  return `${payload}.${hmac(payload)}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expect = hmac(payload);
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return false;
  try {
    const d = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return d.k === 'admin' && d.exp > Date.now();
  } catch {
    return false;
  }
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return '';
}

function setSession(req, res) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    maxAge: SESSION_HOURS * 3600e3,
    path: '/',
  });
}
const clearSession = (res) => res.clearCookie(COOKIE, { path: '/' });

// Cookie is SameSite=Strict; the custom header adds a second CSRF barrier for changes.
function requireAdmin(req, res, next) {
  if (!verifyToken(readCookie(req, COOKIE))) return res.status(401).json({ error: 'Please sign in.' });
  if (!['GET', 'HEAD'].includes(req.method) && req.get('X-Requested-With') !== 'primex-admin') {
    return res.status(403).json({ error: 'Blocked request.' });
  }
  next();
}

// Signed, expiring tokens for customer sessions and password resets (kind-tagged so they can never be swapped).
function signObj(obj, hours) {
  const payload = Buffer.from(JSON.stringify({ ...obj, exp: Date.now() + hours * 3600e3 })).toString('base64url');
  return `${payload}.${hmac(payload)}`;
}
function verifyObj(token, kind) {
  if (!token || typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expect = hmac(payload);
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return d.k === kind && d.exp > Date.now() ? d : null;
  } catch {
    return null;
  }
}

module.exports = { signObj, verifyObj, PROD, passwordOk, setSession, clearSession, requireAdmin, verifyToken, readCookie, COOKIE };
