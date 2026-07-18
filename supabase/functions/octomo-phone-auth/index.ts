import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigins = new Set([
  'https://toyou.kr',
  'https://www.toyou.kr',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
])

function corsHeaders(request: Request) {
  const origin = request.headers.get('origin') ?? ''
  return {
    'access-control-allow-origin': allowedOrigins.has(origin) ? origin : 'https://toyou.kr',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    vary: 'Origin',
  }
}

function json(request: Request, payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders(request), 'content-type': 'application/json; charset=utf-8' },
  })
}

function normalizePhone(value: unknown) {
  return String(value ?? '').replace(/\D/g, '')
}

function createCode() {
  const random = new Uint32Array(1)
  crypto.getRandomValues(random)
  return `TY${String(random[0] % 1_000_000).padStart(6, '0')}`
}

function createToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}

async function fingerprint(request: Request) {
  const source = (request.headers.get('x-forwarded-for') ?? request.headers.get('cf-connecting-ip') ?? 'unknown').split(',')[0].trim()
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) })
  if (request.method !== 'POST') return json(request, { error: 'POST 요청만 지원합니다.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const octomoApiKey = Deno.env.get('OCTOMO_API_KEY')
  if (!supabaseUrl || !serviceRoleKey || !octomoApiKey) return json(request, { error: '휴대폰 인증 서버 설정이 완료되지 않았습니다.' }, 500)

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const body = await request.json()
    const action = String(body.action ?? '')

    if (action === 'start') {
      const phone = normalizePhone(body.phone)
      if (!/^010\d{8}$/.test(phone)) return json(request, { error: '010으로 시작하는 휴대폰 번호를 입력해 주세요.' }, 400)

      const requestFingerprint = await fingerprint(request)
      const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()
      const tenMinutesAgo = new Date(Date.now() - 600_000).toISOString()

      const { count: recentPhoneCount } = await admin
        .from('phone_verification_challenges')
        .select('id', { count: 'exact', head: true })
        .eq('phone', phone)
        .gte('created_at', oneMinuteAgo)
      if ((recentPhoneCount ?? 0) > 0) return json(request, { error: '인증 요청은 1분 후 다시 시도해 주세요.' }, 429)

      const { count: recentRequesterCount } = await admin
        .from('phone_verification_challenges')
        .select('id', { count: 'exact', head: true })
        .eq('request_fingerprint', requestFingerprint)
        .gte('created_at', tenMinutesAgo)
      if ((recentRequesterCount ?? 0) >= 10) return json(request, { error: '인증 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, 429)

      const challengeId = crypto.randomUUID()
      const code = createCode()
      const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString()
      const { error: insertError } = await admin.from('phone_verification_challenges').insert({
        id: challengeId,
        phone,
        code,
        request_fingerprint: requestFingerprint,
        expires_at: expiresAt,
      })
      if (insertError) throw new Error('인증 요청을 저장하지 못했습니다.')

      const qrResponse = await fetch('https://api.octoverse.kr/octomo/v1/public/message/qr-code', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Octomo ${octomoApiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ text: code, width: 240, margin: 2, errorCorrectionLevel: 'M' }),
      })
      const qrPayload = await qrResponse.json().catch(() => null)
      if (!qrResponse.ok || !qrPayload?.qrCode) {
        await admin.from('phone_verification_challenges').delete().eq('id', challengeId)
        throw new Error('Octomo QR 인증을 시작하지 못했습니다.')
      }

      return json(request, {
        challengeId,
        code,
        recipient: '1666-3538',
        qrCode: qrPayload.qrCode,
        expiresAt,
      })
    }

    if (action === 'check') {
      const challengeId = String(body.challengeId ?? '')
      const { data: challenge, error: challengeError } = await admin
        .from('phone_verification_challenges')
        .select('id, phone, code, verification_token, attempts, expires_at, verified_at, consumed_at')
        .eq('id', challengeId)
        .maybeSingle()

      if (challengeError || !challenge) return json(request, { error: '휴대폰 인증 요청을 찾을 수 없습니다.' }, 404)
      if (challenge.consumed_at) return json(request, { error: '이미 사용한 휴대폰 인증입니다.' }, 409)
      if (new Date(challenge.expires_at).getTime() <= Date.now()) return json(request, { error: '인증 시간이 만료되었습니다. 다시 요청해 주세요.' }, 410)
      if (challenge.verified_at && challenge.verification_token) {
        return json(request, { verified: true, verificationToken: challenge.verification_token })
      }
      if (challenge.attempts >= 20) return json(request, { error: '확인 횟수를 초과했습니다. 인증을 다시 시작해 주세요.' }, 429)

      const existsResponse = await fetch('https://api.octoverse.kr/octomo/v1/public/message/exists', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Octomo ${octomoApiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ mobileNum: challenge.phone, text: challenge.code, withinMinutes: 5 }),
      })
      const existsPayload = await existsResponse.json().catch(() => null)
      if (!existsResponse.ok) throw new Error('Octomo 문자 수신 여부를 확인하지 못했습니다.')

      if (!existsPayload?.exists) {
        await admin.from('phone_verification_challenges').update({ attempts: challenge.attempts + 1 }).eq('id', challenge.id)
        return json(request, { verified: false })
      }

      const verificationToken = createToken()
      const verifiedAt = new Date().toISOString()
      const { error: updateError } = await admin.from('phone_verification_challenges').update({
        attempts: challenge.attempts + 1,
        verified_at: verifiedAt,
        verification_token: verificationToken,
      }).eq('id', challenge.id)
      if (updateError) throw new Error('휴대폰 인증 결과를 저장하지 못했습니다.')

      return json(request, { verified: true, verificationToken })
    }

    return json(request, { error: '지원하지 않는 인증 요청입니다.' }, 404)
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : '휴대폰 인증을 처리하지 못했습니다.' }, 400)
  }
})

