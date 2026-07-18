import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { getDatabase, hashPassword, verifyPassword } from './database.js'

const SESSION_COOKIE = 'toyou_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30
const SOCIAL_PROVIDERS = new Set(['Kakao', 'Google', 'Naver'])

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''

    req.on('data', (chunk) => {
      raw += chunk

      if (raw.length > 64 * 1024) {
        reject(new Error('요청 내용이 너무 큽니다.'))
        req.destroy()
      }
    })

    req.on('end', () => {
      if (!raw) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('올바른 JSON 요청이 아닙니다.'))
      }
    })

    req.on('error', reject)
  })
}

function normalizeText(value, maxLength = 255) {
  return String(value ?? '').trim().slice(0, maxLength)
}

function normalizeEmail(value) {
  return normalizeText(value, 320).toLowerCase()
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function parseCookies(req) {
  const result = {}
  const raw = req.headers.cookie ?? ''

  for (const pair of raw.split(';')) {
    const separator = pair.indexOf('=')
    if (separator < 0) continue
    const key = pair.slice(0, separator).trim()
    const value = pair.slice(separator + 1).trim()
    if (key) result[key] = decodeURIComponent(value)
  }

  return result
}

function isSecureRequest(req) {
  return req.socket?.encrypted || String(req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim() === 'https'
}

function setSessionCookie(req, res, token) {
  const attributes = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ]

  if (isSecureRequest(req)) {
    attributes.push('Secure')
  }

  res.setHeader('set-cookie', attributes.join('; '))
}

function clearSessionCookie(req, res) {
  const attributes = [`${SESSION_COOKIE}=`, 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0']
  if (isSecureRequest(req)) attributes.push('Secure')
  res.setHeader('set-cookie', attributes.join('; '))
}

function createSession(userId) {
  const db = getDatabase()
  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  const sessionId = randomUUID()
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)

  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now.toISOString())
  db.prepare('INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
    .run(sessionId, userId, hashSessionToken(token), now.toISOString(), expiresAt.toISOString())

  return { token, createdAt: now.toISOString() }
}

export function getAccountByRequest(req) {
  const token = parseCookies(req)[SESSION_COOKIE]
  if (!token) return null

  const db = getDatabase()
  return db.prepare(`
    SELECT
      users.id,
      users.email,
      users.provider,
      users.display_name,
      users.phone,
      users.postal_code,
      users.address_line1,
      users.address_line2,
      users.is_admin,
      sessions.created_at AS logged_in_at,
      sessions.id AS session_id
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(hashSessionToken(token), new Date().toISOString()) ?? null
}

function getAccountByUserId(userId, loggedInAt) {
  const db = getDatabase()
  const user = db.prepare(`
    SELECT id, email, provider, display_name, phone, postal_code, address_line1, address_line2, is_admin
    FROM users WHERE id = ?
  `).get(userId)

  return user ? { ...user, logged_in_at: loggedInAt } : null
}

function serializeAccount(row) {
  return {
    session: {
      displayName: row.display_name,
      email: row.email ?? '',
      provider: row.provider,
      loggedInAt: row.logged_in_at,
      role: row.is_admin ? 'admin' : 'customer',
    },
    profile: {
      email: row.email ?? '',
      name: row.display_name,
      phone: row.phone,
      postalCode: row.postal_code,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
    },
  }
}

function issueAccount(req, res, userId) {
  const session = createSession(userId)
  const account = getAccountByUserId(userId, session.createdAt)
  setSessionCookie(req, res, session.token)
  sendJson(res, 200, { account: serializeAccount(account) })
}

function requireAccount(req, res) {
  const account = getAccountByRequest(req)

  if (!account) {
    sendJson(res, 401, { error: '로그인이 필요합니다.' })
    return null
  }

  return account
}

function isUniqueConstraintError(error) {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message)
}

async function handleSignup(req, res) {
  const body = await readJsonBody(req)
  const email = normalizeEmail(body.email)
  const password = String(body.password ?? '')
  const displayName = normalizeText(body.name, 80)
  const phone = normalizeText(body.phone, 40)
  const postalCode = normalizeText(body.postalCode, 20)
  const addressLine1 = normalizeText(body.addressLine1, 300)
  const addressLine2 = normalizeText(body.addressLine2, 300)

  if (!isValidEmail(email)) throw new ApiError(400, '올바른 이메일 주소를 입력해 주세요.')
  if (displayName.length < 2) throw new ApiError(400, '이름을 2자 이상 입력해 주세요.')
  if (phone.replace(/\D/g, '').length < 9) throw new ApiError(400, '연락 가능한 휴대폰 번호를 입력해 주세요.')
  if (postalCode.length < 3 || addressLine1.length < 5) throw new ApiError(400, '우편번호와 기본 주소를 입력해 주세요.')
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new ApiError(400, '영문과 숫자를 포함해 8자 이상 입력해 주세요.')
  }

  const db = getDatabase()
  const id = randomUUID()
  const now = new Date().toISOString()

  try {
    db.prepare(`
      INSERT INTO users (
        id, email, password_hash, provider, provider_subject, display_name,
        phone, postal_code, address_line1, address_line2, is_admin, created_at, updated_at
      ) VALUES (?, ?, ?, 'email', NULL, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(id, email, hashPassword(password), displayName, phone, postalCode, addressLine1, addressLine2, now, now)
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new ApiError(409, '이미 가입된 이메일입니다.')
    throw error
  }

  issueAccount(req, res, id)
}

async function handleLogin(req, res) {
  const body = await readJsonBody(req)
  const email = normalizeEmail(body.email)
  const password = String(body.password ?? '')
  const user = getDatabase().prepare(`
    SELECT id, password_hash FROM users WHERE email = ? AND provider = 'email'
  `).get(email)

  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new ApiError(401, '이메일 또는 비밀번호가 올바르지 않습니다.')
  }

  issueAccount(req, res, user.id)
}

async function handleSocialDemo(req, res) {
  const body = await readJsonBody(req)
  const provider = normalizeText(body.provider, 20)

  if (!SOCIAL_PROVIDERS.has(provider)) {
    throw new ApiError(400, '지원하지 않는 간편가입 서비스입니다.')
  }

  const db = getDatabase()
  const providerSubject = 'local-demo-account'
  let user = db.prepare('SELECT id FROM users WHERE provider = ? AND provider_subject = ?').get(provider, providerSubject)

  if (!user) {
    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO users (
        id, email, password_hash, provider, provider_subject, display_name,
        phone, postal_code, address_line1, address_line2, is_admin, created_at, updated_at
      ) VALUES (?, NULL, NULL, ?, ?, ?, '', '', '', '', 0, ?, ?)
    `).run(id, provider, providerSubject, `${provider} 회원`, now, now)
    user = { id }
  }

  issueAccount(req, res, user.id)
}

async function handleProfileUpdate(req, res) {
  const account = requireAccount(req, res)
  if (!account) return
  const body = await readJsonBody(req)
  const requestedName = normalizeText(body.name, 80)
  const requestedEmail = normalizeEmail(body.email)

  if (account.provider !== 'email') {
    if (requestedName !== account.display_name || requestedEmail !== (account.email ?? '')) {
      throw new ApiError(403, '간편가입 계정의 이름과 이메일은 가입한 서비스에서 변경해 주세요.')
    }
  } else {
    if (requestedName.length < 2) throw new ApiError(400, '이름을 2자 이상 입력해 주세요.')
    if (!isValidEmail(requestedEmail)) throw new ApiError(400, '올바른 이메일 주소를 입력해 주세요.')
  }

  const phone = normalizeText(body.phone, 40)
  const postalCode = normalizeText(body.postalCode, 20)
  const addressLine1 = normalizeText(body.addressLine1, 300)
  const addressLine2 = normalizeText(body.addressLine2, 300)

  if (phone && phone.replace(/\D/g, '').length < 9) {
    throw new ApiError(400, '연락 가능한 휴대폰 번호를 입력해 주세요.')
  }

  const nextName = account.provider === 'email' ? requestedName : account.display_name
  const nextEmail = account.provider === 'email' ? requestedEmail : account.email

  try {
    getDatabase().prepare(`
      UPDATE users
      SET email = ?, display_name = ?, phone = ?, postal_code = ?, address_line1 = ?, address_line2 = ?, updated_at = ?
      WHERE id = ?
    `).run(nextEmail || null, nextName, phone, postalCode, addressLine1, addressLine2, new Date().toISOString(), account.id)
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new ApiError(409, '이미 사용 중인 이메일입니다.')
    throw error
  }

  const updated = getAccountByRequest(req)
  sendJson(res, 200, { account: serializeAccount(updated) })
}

async function handleLogout(req, res) {
  const account = getAccountByRequest(req)
  if (account?.session_id) {
    getDatabase().prepare('DELETE FROM sessions WHERE id = ?').run(account.session_id)
  }
  clearSessionCookie(req, res)
  sendJson(res, 200, { ok: true })
}

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
  }
}

export function createAuthApiMiddleware() {
  return async (req, res, next) => {
    const requestUrl = new URL(req.url ?? '/', 'http://localhost')
    const { pathname } = requestUrl

    if (!pathname.startsWith('/api/auth') && pathname !== '/api/profile' && pathname !== '/api/health') {
      next()
      return
    }

    try {
      if (pathname === '/api/health' && req.method === 'GET') {
        getDatabase()
        sendJson(res, 200, { ok: true, database: 'sqlite' })
        return
      }

      if (pathname === '/api/auth/session' && req.method === 'GET') {
        const account = getAccountByRequest(req)
        sendJson(res, 200, { account: account ? serializeAccount(account) : null })
        return
      }

      if (pathname === '/api/auth/signup' && req.method === 'POST') {
        await handleSignup(req, res)
        return
      }

      if (pathname === '/api/auth/login' && req.method === 'POST') {
        await handleLogin(req, res)
        return
      }

      if (pathname === '/api/auth/social-demo' && req.method === 'POST') {
        await handleSocialDemo(req, res)
        return
      }

      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        await handleLogout(req, res)
        return
      }

      if (pathname === '/api/profile' && req.method === 'GET') {
        const account = requireAccount(req, res)
        if (account) sendJson(res, 200, { account: serializeAccount(account) })
        return
      }

      if (pathname === '/api/profile' && req.method === 'PATCH') {
        await handleProfileUpdate(req, res)
        return
      }

      sendJson(res, 405, { error: '지원하지 않는 요청입니다.' })
    } catch (error) {
      const statusCode = error instanceof ApiError ? error.statusCode : 500
      const message = error instanceof ApiError ? error.message : '서버에서 요청을 처리하지 못했습니다.'
      if (statusCode === 500) console.error(error)
      if (!res.headersSent) sendJson(res, statusCode, { error: message })
    }
  }
}
