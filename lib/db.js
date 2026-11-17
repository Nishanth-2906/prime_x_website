const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
for (const d of [DATA_DIR, UPLOAD_DIR, BACKUP_DIR]) fs.mkdirSync(d, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'primex.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

const DEFAULT_SETTINGS = {
  phone: '+91 00000 00000',
  email: 'sales@your-domain.com',
  whatsapp: '910000000000',
  address: 'Showroom and factory address, Bangalore, Karnataka',
};
// A setting still holding its default means the owner has not filled it in yet.
const isPlaceholder = (k, v) => v === DEFAULT_SETTINGS[k];

const SEED_PROJECTS = [
  { name: 'Candeur Construction', type: 'High-rise', status: 'Completed', image: '/img/candeur.jpg' },
  { name: 'Mahaveer', type: 'High-rise', status: 'Completed', image: '/img/mahaveer.jpg' },
  { name: 'Nikhar', type: 'High-rise', status: 'Completed', image: '/img/nikhar.jpg' },
  { name: 'Saikrupa', type: 'Mid-rise', status: 'Completed', image: '/img/saikrupa.jpg' },
  { name: 'Sankalpa', type: 'Mid-rise', status: 'Completed', image: '/img/sankalpa.jpg' },
  { name: 'Saritha Developers', type: 'Mid-rise', status: 'Completed', image: '/img/saritha.jpg', image2: '/img/saritha2.jpg' },
];

const MIGRATIONS = [
  `
  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE enquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    buyer_type TEXT NOT NULL DEFAULT '',
    need TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    items TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'new',
    note TEXT NOT NULL DEFAULT '',
    notified INTEGER NOT NULL DEFAULT 0,
    notify_attempts INTEGER NOT NULL DEFAULT 0,
    notify_error TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX idx_enquiries_created ON enquiries(created_at DESC);
  CREATE INDEX idx_enquiries_status ON enquiries(status);
  CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Completed',
    location TEXT NOT NULL DEFAULT '',
    year TEXT NOT NULL DEFAULT '',
    flats TEXT NOT NULL DEFAULT '',
    scope TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    image2 TEXT NOT NULL DEFAULT '',
    sort INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1
  );
  `,
  `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    phone TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    pass_hash TEXT NOT NULL,
    last_login TEXT
  );
  ALTER TABLE enquiries ADD COLUMN user_id INTEGER;
  ALTER TABLE enquiries ADD COLUMN company TEXT NOT NULL DEFAULT '';
  ALTER TABLE enquiries ADD COLUMN project_name TEXT NOT NULL DEFAULT '';
  ALTER TABLE enquiries ADD COLUMN stage TEXT NOT NULL DEFAULT '';
  ALTER TABLE enquiries ADD COLUMN timeline TEXT NOT NULL DEFAULT '';
  ALTER TABLE enquiries ADD COLUMN glazing TEXT NOT NULL DEFAULT '';
  ALTER TABLE enquiries ADD COLUMN finish TEXT NOT NULL DEFAULT '';
  ALTER TABLE enquiries ADD COLUMN units TEXT NOT NULL DEFAULT '';
  ALTER TABLE enquiries ADD COLUMN contact_pref TEXT NOT NULL DEFAULT '';
  ALTER TABLE enquiries ADD COLUMN contact_time TEXT NOT NULL DEFAULT '';
  CREATE INDEX idx_enquiries_user ON enquiries(user_id);
  `,
];

function migrate() {
  let v = db.pragma('user_version', { simple: true });
  while (v < MIGRATIONS.length) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    })();
    v++;
  }
}
migrate();

// Seed once, never overwrite what the owner has edited.
const insSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insSetting.run(k, v);
if (db.prepare('SELECT COUNT(*) c FROM projects').get().c === 0) {
  const ins = db.prepare(
    'INSERT INTO projects (name, type, status, image, image2, sort) VALUES (@name, @type, @status, @image, @image2, @sort)'
  );
  SEED_PROJECTS.forEach((p, i) => ins.run({ image2: '', ...p, sort: i }));
}

function getSettings() {
  const out = {};
  for (const r of db.prepare('SELECT key, value FROM settings').all()) out[r.key] = r.value;
  return { ...DEFAULT_SETTINGS, ...out };
}

function setSettings(obj) {
  const up = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  db.transaction(() => {
    for (const k of Object.keys(DEFAULT_SETTINGS)) if (k in obj) up.run(k, String(obj[k]));
  })();
}

// Daily snapshot of the database, keeping the newest 14.
async function backupNow() {
  const stamp = new Date().toISOString().slice(0, 10);
  const file = path.join(BACKUP_DIR, `primex-${stamp}.db`);
  await db.backup(file);
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => /^primex-.*\.db$/.test(f)).sort();
  for (const old of files.slice(0, Math.max(0, files.length - 14))) fs.unlinkSync(path.join(BACKUP_DIR, old));
  return file;
}

module.exports = { db, DATA_DIR, UPLOAD_DIR, BACKUP_DIR, DEFAULT_SETTINGS, isPlaceholder, getSettings, setSettings, backupNow };
