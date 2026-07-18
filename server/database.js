import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

let database

function createSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT COLLATE NOCASE UNIQUE,
      password_hash TEXT,
      provider TEXT NOT NULL CHECK (provider IN ('email', 'Kakao', 'Google', 'Naver')),
      provider_subject TEXT,
      display_name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      postal_code TEXT NOT NULL DEFAULT '',
      address_line1 TEXT NOT NULL DEFAULT '',
      address_line2 TEXT NOT NULL DEFAULT '',
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (provider, provider_subject)
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  db.exec('CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id)')
  db.exec('CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at)')

  const userColumns = db.prepare('PRAGMA table_info(users)').all()
  if (!userColumns.some((column) => column.name === 'is_admin')) {
    db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0')
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      description TEXT NOT NULL,
      price INTEGER NOT NULL,
      compare_at_price INTEGER NOT NULL,
      stock INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'draft', 'soldout')),
      featured INTEGER NOT NULL DEFAULT 0,
      art TEXT NOT NULL,
      palette_json TEXT NOT NULL,
      accent TEXT NOT NULL,
      image_url TEXT,
      options_json TEXT NOT NULL,
      details_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('notice', 'journal', 'event')),
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
      pinned INTEGER NOT NULL DEFAULT 0,
      cover_image TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      option_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      total INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'kakao', 'naver')),
      delivery_note TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('paid', 'preparing', 'shipping', 'delivered', 'cancelled')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      author TEXT NOT NULL,
      rating INTEGER NOT NULL,
      option_name TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('visible', 'hidden')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS store_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      store_name TEXT NOT NULL,
      announcement TEXT NOT NULL,
      shipping_notice TEXT NOT NULL,
      support_email TEXT NOT NULL,
      support_phone TEXT NOT NULL,
      footer_description TEXT NOT NULL,
      maintenance_mode INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS imported_products (
      id TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      option_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (user_id, product_id, option_name),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS wishlists (
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS restock_requests (
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      imported_product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      option_name TEXT NOT NULL,
      request_note TEXT NOT NULL,
      estimated_total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'reviewing', 'approved', 'rejected')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (imported_product_id) REFERENCES imported_products(id) ON DELETE CASCADE
    )
  `)

  db.exec('CREATE INDEX IF NOT EXISTS products_status_idx ON products (status)')
  db.exec('CREATE INDEX IF NOT EXISTS posts_status_updated_idx ON posts (status, updated_at)')
  db.exec('CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at)')
  db.exec('CREATE INDEX IF NOT EXISTS reviews_product_status_idx ON reviews (product_id, status)')
  db.exec('CREATE INDEX IF NOT EXISTS cart_items_user_idx ON cart_items (user_id)')
  db.exec('CREATE INDEX IF NOT EXISTS purchase_requests_user_idx ON purchase_requests (user_id, created_at)')
}

function seedLocalMember(db) {
  if (process.env.NODE_ENV === 'production' || process.env.TOYOU_SEED_DEMO === 'false') {
    return
  }

  const email = 'test@toyou.kr'
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)

  if (existing) {
    db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(existing.id)
    return
  }

  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO users (
      id, email, password_hash, provider, provider_subject, display_name,
      phone, postal_code, address_line1, address_line2, is_admin, created_at, updated_at
    ) VALUES (?, ?, ?, 'email', NULL, ?, '', '', '', '', 1, ?, ?)
  `).run(randomUUID(), email, hashPassword('test1234'), '김승우', now, now)
}

export function getDatabase() {
  if (database) {
    return database
  }

  const databasePath = resolve(process.env.TOYOU_DB_PATH || 'data/toyou.sqlite')
  mkdirSync(dirname(databasePath), { recursive: true })
  database = new DatabaseSync(databasePath)
  database.exec('PRAGMA foreign_keys = ON')
  database.exec('PRAGMA journal_mode = WAL')
  database.exec('PRAGMA busy_timeout = 5000')
  createSchema(database)
  seedLocalMember(database)
  return database
}

export function closeDatabase() {
  if (!database) return
  database.close()
  database = undefined
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password, encodedHash) {
  if (typeof encodedHash !== 'string') {
    return false
  }

  const [algorithm, salt, savedHash] = encodedHash.split('$')

  if (algorithm !== 'scrypt' || !salt || !savedHash) {
    return false
  }

  const candidate = scryptSync(password, salt, 64)
  const saved = Buffer.from(savedHash, 'hex')
  return saved.length === candidate.length && timingSafeEqual(saved, candidate)
}
