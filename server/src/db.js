/**
 * CallShip: PostgreSQL o SQLite (sql.js).
 * Si USE_SQLITE=1 o no hay PostgreSQL, usa SQLite con sql.js (sin compilación nativa en Windows).\n * Guarda el archivo callship.db en /server.\n */
const path = require('path');
const fs = require('fs');

const USE_SQLITE = process.env.USE_SQLITE === '1' || process.env.USE_SQLITE === 'true';

const db = { pool: null };
let pool = null;
let sqliteDb = null;

function saveSqlJs(db, dbPath) {
  try {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  } catch (e) {
    console.error('Error guardando SQLite:', e.message);
  }
}

function toSqliteSql(sql) {
  return sql.replace(/\$\d+/g, '?');
}

// --- SQLite con sql.js (sin instalar Visual Studio) ---
async function initSqlite() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'callship.db');

  let sqlDb;
  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(buf);
  } else {
    sqlDb = new SQL.Database();
  }

  sqlDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      balance_usd REAL DEFAULT 0,
      status TEXT DEFAULT 'active'
    );
    CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      customer TEXT NOT NULL,
      phone TEXT,
      status TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS licenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      key TEXT UNIQUE NOT NULL,
      plan TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      category TEXT,
      price_usd REAL DEFAULT 0,
      setup_fee_usd REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      bill_type TEXT DEFAULT 'subscription',
      bill_days INTEGER DEFAULT 30,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prefix TEXT NOT NULL,
      destination TEXT NOT NULL,
      rate_usd REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      amount_usd REAL NOT NULL,
      method TEXT,
      reference TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS oxapay_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      track_id TEXT UNIQUE NOT NULL,
      amount_usd REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      payment_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      paid_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sip_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      sip_username TEXT,
      sip_server TEXT,
      sip_password TEXT,
      caller_name TEXT,
      caller_number TEXT,
      voicemail INTEGER DEFAULT 1,
      status INTEGER DEFAULT 1,
      modified_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      account_number TEXT,
      company TEXT,
      first_name TEXT,
      last_name TEXT,
      telephone1 TEXT,
      telephone2 TEXT,
      email TEXT,
      address1 TEXT,
      address2 TEXT,
      city TEXT,
      province_state TEXT,
      zip_postal_code TEXT,
      country TEXT,
      timezone TEXT,
      fax_number TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_topups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      amount_usd REAL NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pending_manual_deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      amount_usd REAL NOT NULL,
      currency TEXT NOT NULL,
      network TEXT,
      tx_hash TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      confirmed_at TEXT
    );
  `);

  sqliteDb = sqlDb;
  saveSqlJs(sqlDb, dbPath);
  console.log('Tablas base listas (SQLite sql.js: ' + dbPath + ')');

  // Migraciones suaves (SQLite): si la tabla ya existía, añadimos columnas nuevas si faltan.
  try { sqliteDb.exec(`ALTER TABLE users ADD COLUMN balance_usd REAL DEFAULT 0`); } catch {}
  try { sqliteDb.exec(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`); } catch {}
  try { sqliteDb.exec(`ALTER TABLE users ADD COLUMN total_reloaded_usd REAL DEFAULT 0`); } catch {}
  try { sqliteDb.exec(`ALTER TABLE users ADD COLUMN loyalty_bonuses_given INTEGER DEFAULT 0`); } catch {}
  try { sqliteDb.exec(`ALTER TABLE users ADD COLUMN last_loyalty_bonus_at TEXT`); } catch {}
  // (SQLite no soporta ADD COLUMN IF NOT EXISTS)
  try { sqliteDb.exec(`ALTER TABLE sip_devices ADD COLUMN caller_name TEXT`); } catch {}
  try { sqliteDb.exec(`ALTER TABLE sip_devices ADD COLUMN caller_number TEXT`); } catch {}
  try { sqliteDb.exec(`ALTER TABLE sip_devices ADD COLUMN voicemail INTEGER DEFAULT 1`); } catch {}
  try { sqliteDb.exec(`ALTER TABLE sip_devices ADD COLUMN status INTEGER DEFAULT 1`); } catch {}
  try { sqliteDb.exec(`ALTER TABLE sip_devices ADD COLUMN modified_at TEXT`); } catch {}
  try { sqliteDb.exec(`CREATE TABLE IF NOT EXISTS pending_manual_deposits (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id), amount_usd REAL NOT NULL, currency TEXT NOT NULL, network TEXT, tx_hash TEXT, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now')), confirmed_at TEXT)`); } catch {}

  // API tipo \"pg\" para que el resto del código no cambie
  pool = {
    query: async (sql, params) => {
      const p = Array.isArray(params) ? params : (params ? [params] : []);
      const sqliteSql = toSqliteSql(sql);

      // SELECT
      if (/^\s*select/i.test(sqliteSql)) {
        const stmt = sqliteDb.prepare(sqliteSql);
        stmt.bind(p);
        const cols = stmt.getColumnNames();
        const rows = [];
        while (stmt.step()) {
          const vals = stmt.get();
          const o = {};
          cols.forEach((c, i) => (o[c] = vals[i]));
          rows.push(o);
        }
        stmt.free();
        return { rows };
      }

      // INSERT ... RETURNING (casos que usamos)
      if (/^\s*insert/i.test(sqliteSql) && /\breturning\b/i.test(sqliteSql)) {
        const returning = sqliteSql.match(/\breturning\b([\s\S]*)$/i)?.[1]?.trim();
        const withoutReturning = sqliteSql.replace(/\breturning\b[\s\S]*$/i, '').trim();

        const stmt = sqliteDb.prepare(withoutReturning);
        stmt.bind(p);
        stmt.step();
        stmt.free();

        const idRow = sqliteDb.exec('SELECT last_insert_rowid() AS id');
        const newId = idRow?.[0]?.values?.[0]?.[0];

        const cols = (returning || '').split(',').map((s) => s.trim()).filter(Boolean);
        // Si pidieron \"id\" y \"created_at\" lo buscamos en la tabla según el INSERT
        const table = withoutReturning.match(/insert\s+into\s+([a-z_]+)/i)?.[1];
        if (table && cols.length) {
          const selectCols = cols.join(', ');
          const rows = (await pool.query(`SELECT ${selectCols} FROM ${table} WHERE id = ?`, [newId])).rows;
          saveSqlJs(sqliteDb, dbPath);
          return { rows };
        }

        saveSqlJs(sqliteDb, dbPath);
        return { rows: [{ id: newId }] };
      }

      // Otros INSERT/UPDATE/DELETE sin RETURNING
      const stmt = sqliteDb.prepare(sqliteSql);
      stmt.bind(p);
      stmt.step();
      stmt.free();
      saveSqlJs(sqliteDb, dbPath);
      return { rows: [] };
    },
  };

  // IMPORTANTE: esto es el objeto exportado (no el sqlDb)
  db.pool = pool;
  return pool;
}

// --- PostgreSQL ---
async function initPg() {
  const { Pool } = require('pg');
  // Railway: DATABASE_URL puede ser la URL interna (postgres.railway.internal) que a veces no resuelve.
  // DATABASE_PUBLIC_URL es la URL pública; úsala si existe para evitar ENOTFOUND.
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  const p = connectionString
    ? new Pool({ connectionString, ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false } })
    : new Pool({
        host: process.env.PG_HOST || 'localhost',
        port: parseInt(process.env.PG_PORT || '5432', 10),
        user: process.env.PG_USER || 'callship',
        password: process.env.PG_PASSWORD || 'callship123',
        database: process.env.PG_DATABASE || 'callship_db',
      });

  // Evitar que errores del pool (conexión perdida, etc.) tiren el proceso
  p.on('error', (err) => {
    console.error('Pool PostgreSQL error (no se cierra el servidor):', err.message);
  });

  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      balance_usd NUMERIC(12,4) DEFAULT 0,
      status VARCHAR(30) DEFAULT 'active'
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS calls (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      customer VARCHAR(100) NOT NULL,
      phone VARCHAR(30),
      status VARCHAR(30),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS licenses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key VARCHAR(50) UNIQUE NOT NULL,
      plan VARCHAR(30) NOT NULL,
      active SMALLINT DEFAULT 1,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(120) NOT NULL,
      category VARCHAR(60),
      price_usd NUMERIC(12,4) DEFAULT 0,
      setup_fee_usd NUMERIC(12,4) DEFAULT 0,
      status VARCHAR(30) DEFAULT 'active',
      bill_type VARCHAR(30) DEFAULT 'subscription',
      bill_days INTEGER DEFAULT 30,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS rates (
      id SERIAL PRIMARY KEY,
      prefix VARCHAR(32) NOT NULL,
      destination VARCHAR(120) NOT NULL,
      rate_usd NUMERIC(12,6) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_usd NUMERIC(12,4) NOT NULL,
      method VARCHAR(40),
      reference VARCHAR(120),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS oxapay_invoices (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      track_id VARCHAR(120) UNIQUE NOT NULL,
      amount_usd NUMERIC(12,4) NOT NULL,
      status VARCHAR(30) DEFAULT 'pending',
      payment_url TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      paid_at TIMESTAMP
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS sip_devices (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(120) NOT NULL,
      sip_username VARCHAR(120),
      sip_server VARCHAR(255),
      sip_password VARCHAR(120),
      caller_name VARCHAR(120),
      caller_number VARCHAR(60),
      voicemail SMALLINT DEFAULT 1,
      status SMALLINT DEFAULT 1,
      modified_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Migraciones suaves (PostgreSQL) si la tabla ya existía
  await p.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS balance_usd NUMERIC(12,4) DEFAULT 0;`);
  await p.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active';`);
  // Lealtad: recargas acumuladas X/100 → +10 USD en balance
  await p.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS total_reloaded_usd NUMERIC(12,4) DEFAULT 0;`);
  await p.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS loyalty_bonuses_given INTEGER DEFAULT 0;`);
  await p.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_loyalty_bonus_at TIMESTAMP;`);
  await p.query(`ALTER TABLE sip_devices ADD COLUMN IF NOT EXISTS caller_name VARCHAR(120);`);
  await p.query(`ALTER TABLE sip_devices ADD COLUMN IF NOT EXISTS caller_number VARCHAR(60);`);
  await p.query(`ALTER TABLE sip_devices ADD COLUMN IF NOT EXISTS voicemail SMALLINT DEFAULT 1;`);
  await p.query(`ALTER TABLE sip_devices ADD COLUMN IF NOT EXISTS status SMALLINT DEFAULT 1;`);
  await p.query(`ALTER TABLE sip_devices ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP;`);

  await p.query(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      account_number VARCHAR(40),
      company VARCHAR(120),
      first_name VARCHAR(80),
      last_name VARCHAR(80),
      telephone1 VARCHAR(40),
      telephone2 VARCHAR(40),
      email VARCHAR(120),
      address1 VARCHAR(200),
      address2 VARCHAR(200),
      city VARCHAR(80),
      province_state VARCHAR(80),
      zip_postal_code VARCHAR(20),
      country VARCHAR(80),
      timezone VARCHAR(80),
      fax_number VARCHAR(40),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS user_topups (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_usd NUMERIC(12,4) NOT NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS pending_manual_deposits (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_usd NUMERIC(12,4) NOT NULL,
      currency VARCHAR(20) NOT NULL,
      network VARCHAR(60),
      tx_hash VARCHAR(255),
      status VARCHAR(30) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      confirmed_at TIMESTAMP
    );
  `);

  console.log('Tablas base listas (PostgreSQL)');
  pool = p;
  db.pool = pool;
  return pool;
}

async function init() {
  const hasPg = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
  if (USE_SQLITE && !hasPg) {
    return await initSqlite();
  }
  if (hasPg) {
    return await initPg();
  }
  try {
    return await initPg();
  } catch (err) {
    console.warn('PostgreSQL no disponible (' + err.message + '). Usando SQLite.');
    return await initSqlite();
  }
}

db.init = init;
module.exports = db;
