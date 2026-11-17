const crypto = require('crypto');
const { promisify } = require('util');
const auth = require('./auth');
const { db } = require('./db');

const scrypt = promisify(crypto.scrypt);
const COOKIE = 'px_user';
const SESSION_DAYS = 30;

async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = await scrypt(pw, salt, 64);
  return `s1$${salt.toString('base64')}$${h.toString('base64')}`;
}
async function checkPassword(pw, stored) {
  const [v, salt, hash] = String(stored).split('$');
  if (v !== 's1' || !salt || !hash) return false;
  const want = Buffer.from(hash, 'base64');
  const got = await scrypt(pw, Buffer.from(salt, 'base64'), want.length);
  return crypto.timingSafeEqual(got, want);
}
let dummy = null; // used so unknown emails take as long as wrong passwords
const dummyHash = async () => dummy || (dummy = await hashPassword('not-a-real-password'));

const stamp = (u) => u.pass_hash.slice(-12);
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, company: u.company });

function startSession(req, res, u) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(COOKIE, auth.signObj({ k: 'user', uid: u.id, v: stamp(u) }, SESSION_DAYS * 24), {
    httpOnly: true, sameSite: 'lax', secure, maxAge: SESSION_DAYS * 86400e3, path: '/',
  });
}
const endSession = (res) => res.clearCookie(COOKIE, { path: '/' });

function currentUser(req) {
  const d = auth.verifyObj(auth.readCookie(req, COOKIE), 'user');
  if (!d) return null;
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(d.uid);
  return u && stamp(u) === d.v ? u : null; // changing the password signs out old sessions
}

const resetToken = (u) => auth.signObj({ k: 'reset', uid: u.id, v: stamp(u) }, 1);
function userFromResetToken(token) {
  const d = auth.verifyObj(token, 'reset');
  if (!d) return null;
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(d.uid);
  return u && stamp(u) === d.v ? u : null;
}

module.exports = { hashPassword, checkPassword, dummyHash, startSession, endSession, currentUser, publicUser, resetToken, userFromResetToken };
