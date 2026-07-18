import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import test from 'node:test'

const databasePath = resolve('data/toyou-api-test.sqlite')
process.env.TOYOU_DB_PATH = databasePath
process.env.TOYOU_SEED_DEMO = 'false'
rmSync(databasePath, { force: true })
rmSync(`${databasePath}-shm`, { force: true })
rmSync(`${databasePath}-wal`, { force: true })

const { createAuthApiMiddleware } = await import('./auth-api.js')
const { closeDatabase } = await import('./database.js')

function startTestServer() {
  const middleware = createAuthApiMiddleware()
  const server = createServer((req, res) => {
    middleware(req, res, () => {
      res.statusCode = 404
      res.end('Not found')
    })
  })

  return new Promise((resolveServer) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolveServer({ server, baseUrl: `http://127.0.0.1:${address.port}` })
    })
  })
}

test('TO YOU authentication and profile API', async (t) => {
  const { server, baseUrl } = await startTestServer()
  let cookie = ''

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
        ...options.headers,
      },
    })
    const setCookie = response.headers.get('set-cookie')
    if (setCookie) cookie = setCookie.split(';')[0]
    const payload = await response.json()
    return { response, payload }
  }

  await t.test('health check reports SQLite', async () => {
    const { response, payload } = await request('/api/health')
    assert.equal(response.status, 200)
    assert.deepEqual(payload, { ok: true, database: 'sqlite' })
  })

  await t.test('email signup creates a server session', async () => {
    const { response, payload } = await request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'member@example.com',
        password: 'member1234',
        name: '김승우',
        phone: '010-1234-5678',
        postalCode: '06236',
        addressLine1: '서울시 강남구 테헤란로 1',
        addressLine2: '101호',
      }),
    })
    assert.equal(response.status, 200)
    assert.equal(payload.account.session.displayName, '김승우')
    assert.equal(payload.account.profile.postalCode, '06236')
    assert.match(cookie, /^toyou_session=/)
  })

  await t.test('session and editable email profile are persisted', async () => {
    const sessionResult = await request('/api/auth/session')
    assert.equal(sessionResult.payload.account.session.email, 'member@example.com')

    const updateResult = await request('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        email: 'updated@example.com',
        name: '김승우 수정',
        phone: '010-9999-1111',
        postalCode: '04524',
        addressLine1: '서울시 중구 세종대로 1',
        addressLine2: '2층',
      }),
    })
    assert.equal(updateResult.response.status, 200)
    assert.equal(updateResult.payload.account.session.displayName, '김승우 수정')
    assert.equal(updateResult.payload.account.profile.email, 'updated@example.com')
  })

  await t.test('logout invalidates the cookie session and password login restores it', async () => {
    const logoutResult = await request('/api/auth/logout', { method: 'POST' })
    assert.equal(logoutResult.response.status, 200)
    const anonymousResult = await request('/api/auth/session')
    assert.equal(anonymousResult.payload.account, null)

    const loginResult = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'updated@example.com', password: 'member1234' }),
    })
    assert.equal(loginResult.response.status, 200)
    assert.equal(loginResult.payload.account.session.displayName, '김승우 수정')
  })

  await t.test('social profile name and email are protected by the server', async () => {
    cookie = ''
    const socialResult = await request('/api/auth/social-demo', {
      method: 'POST',
      body: JSON.stringify({ provider: 'Kakao' }),
    })
    assert.equal(socialResult.response.status, 200)
    assert.equal(socialResult.payload.account.session.provider, 'Kakao')

    const blockedResult = await request('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        email: 'changed@example.com',
        name: '변경 시도',
        phone: '',
        postalCode: '',
        addressLine1: '',
        addressLine2: '',
      }),
    })
    assert.equal(blockedResult.response.status, 403)

    const allowedResult = await request('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        email: '',
        name: 'Kakao 회원',
        phone: '010-2222-3333',
        postalCode: '12345',
        addressLine1: '서울시 성동구 테스트로 1',
        addressLine2: '',
      }),
    })
    assert.equal(allowedResult.response.status, 200)
    assert.equal(allowedResult.payload.account.profile.phone, '010-2222-3333')
    assert.equal(allowedResult.payload.account.session.displayName, 'Kakao 회원')
  })

  await new Promise((resolveClose) => server.close(resolveClose))
  closeDatabase()
  rmSync(databasePath, { force: true })
  rmSync(`${databasePath}-shm`, { force: true })
  rmSync(`${databasePath}-wal`, { force: true })
})

