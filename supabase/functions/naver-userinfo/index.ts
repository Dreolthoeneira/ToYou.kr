type NaverProfile = {
  id?: string
  email?: string
  name?: string
  nickname?: string
  profile_image?: string
  mobile?: string
  mobile_e164?: string
  gender?: string
  birthyear?: string
  birthday?: string
}

type NaverUserInfoResponse = {
  resultcode?: string
  message?: string
  response?: NaverProfile
}

const responseHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: responseHeaders })
}

Deno.serve(async (request) => {
  if (request.method !== 'GET') {
    return json({ error: 'method_not_allowed' }, 405)
  }

  const authorization = request.headers.get('authorization')?.trim() ?? ''
  if (!/^Bearer\s+\S+$/i.test(authorization)) {
    return json({ error: 'missing_bearer_token' }, 401)
  }

  let upstream: Response

  try {
    upstream = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        accept: 'application/json',
        authorization,
      },
    })
  } catch {
    return json({ error: 'naver_unavailable' }, 502)
  }

  const payload = await upstream.json().catch(() => null) as NaverUserInfoResponse | null
  const profile = payload?.response

  if (!upstream.ok || payload?.resultcode !== '00' || !profile?.id) {
    return json({
      error: 'invalid_naver_profile',
      message: payload?.message ?? '네이버 회원정보를 확인하지 못했습니다.',
    }, upstream.status >= 400 ? upstream.status : 502)
  }

  const displayName = profile.name?.trim() || profile.nickname?.trim() || '네이버 회원'
  const phone = profile.mobile_e164?.trim() || profile.mobile?.trim() || ''
  const birthdate = profile.birthyear && profile.birthday
    ? `${profile.birthyear}-${profile.birthday}`
    : undefined

  return json({
    sub: profile.id,
    provider_id: profile.id,
    email: profile.email?.trim() || undefined,
    email_verified: Boolean(profile.email),
    name: displayName,
    full_name: displayName,
    nickname: profile.nickname?.trim() || displayName,
    picture: profile.profile_image?.trim() || undefined,
    avatar_url: profile.profile_image?.trim() || undefined,
    phone: phone || undefined,
    phone_verified: Boolean(phone),
    gender: profile.gender?.trim() || undefined,
    birthdate,
  })
})
