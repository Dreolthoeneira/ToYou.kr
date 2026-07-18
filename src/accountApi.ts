import type { Provider, User } from '@supabase/supabase-js'
import type { AuthSession } from './authSession'
import type { CustomerProfile } from './customerProfile'
import { getPublicAppUrl, isSupabaseConfigured, requireSupabase } from './supabaseClient'

export interface AccountData {
  session: AuthSession
  profile: CustomerProfile
}

export type SocialProvider = 'Kakao' | 'Google' | 'Naver'

const SOCIAL_OAUTH_PROVIDERS: Record<SocialProvider, Provider> = {
  Kakao: 'kakao',
  Google: 'google',
  Naver: 'custom:naver',
}

type ProfileRow = {
  email: string | null
  provider: string
  display_name: string
  phone: string
  postal_code: string
  address_line1: string
  address_line2: string
  is_admin: boolean
  created_at: string
}

export class AccountApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function requestAccount(path: string, init?: RequestInit): Promise<AccountData | null> {
  let response: Response

  try {
    response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: {
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new AccountApiError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.', 0)
  }

  const payload = await response.json().catch(() => ({})) as { account?: AccountData | null; error?: string }

  if (!response.ok) {
    throw new AccountApiError(payload.error || '요청을 처리하지 못했습니다.', response.status)
  }

  return payload.account ?? null
}

function normalizeProvider(value: string): AuthSession['provider'] {
  const provider = value.toLowerCase()
  if (provider === 'kakao') return 'Kakao'
  if (provider === 'google') return 'Google'
  if (provider === 'naver') return 'Naver'
  return 'email'
}

async function getSupabaseAccount(user: User, loggedInAt?: string): Promise<AccountData> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('profiles')
    .select('email, provider, display_name, phone, postal_code, address_line1, address_line2, is_admin, created_at')
    .eq('id', user.id)
    .single()

  if (error) {
    throw new AccountApiError('회원정보를 불러오지 못했습니다. Supabase 마이그레이션을 확인해 주세요.', 500)
  }

  const row = data as ProfileRow
  const provider = normalizeProvider(row.provider || String(user.app_metadata.provider ?? 'email'))
  const email = row.email ?? user.email ?? ''

  return {
    session: {
      displayName: row.display_name,
      email,
      provider,
      loggedInAt: loggedInAt ?? row.created_at,
      role: row.is_admin ? 'admin' : 'customer',
    },
    profile: {
      email,
      name: row.display_name,
      phone: row.phone,
      postalCode: row.postal_code,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
    },
  }
}

export async function loadServerAccount() {
  if (!isSupabaseConfigured) return requestAccount('/api/auth/session')

  const client = requireSupabase()
  const { data, error } = await client.auth.getSession()
  if (error) throw new AccountApiError(error.message, 401)
  if (!data.session?.user) return null
  return getSupabaseAccount(data.session.user, new Date(data.session.user.last_sign_in_at ?? Date.now()).toISOString())
}

export async function loginWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured) {
    return requestAccount('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }) as Promise<AccountData>
  }

  const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password })
  if (error || !data.user) throw new AccountApiError(error?.message || '로그인하지 못했습니다.', error?.status ?? 401, error?.code)
  return getSupabaseAccount(data.user, new Date().toISOString())
}

export async function requestPasswordReset(email: string) {
  if (!isSupabaseConfigured) {
    throw new AccountApiError('비밀번호 재설정은 운영 사이트에서 이용해 주세요.', 503)
  }

  const redirectTo = new URL('login?recovery=1', getPublicAppUrl()).toString()
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email, { redirectTo })

  if (error) {
    throw new AccountApiError(error.message || '비밀번호 재설정 메일을 보내지 못했습니다.', error.status ?? 400, error.code)
  }
}

export async function resendSignupConfirmation(email: string) {
  if (!isSupabaseConfigured) {
    throw new AccountApiError('가입 확인 메일 재전송은 운영 사이트에서 이용해 주세요.', 503)
  }

  const { error } = await requireSupabase().auth.resend({
    type: 'signup',
    email,
  })

  if (error) {
    throw new AccountApiError(error.message || '가입 확인 메일을 다시 보내지 못했습니다.', error.status ?? 400, error.code)
  }
}

export async function updatePassword(password: string) {
  if (!isSupabaseConfigured) {
    throw new AccountApiError('비밀번호 재설정은 운영 사이트에서 이용해 주세요.', 503)
  }

  const { data, error } = await requireSupabase().auth.updateUser({ password })
  if (error || !data.user) {
    throw new AccountApiError(error?.message || '비밀번호를 변경하지 못했습니다.', error?.status ?? 400, error?.code)
  }

  return getSupabaseAccount(data.user, new Date().toISOString())
}

export async function signupWithEmail(
  profile: CustomerProfile,
  password: string,
  phoneVerification?: { challengeId: string; verificationToken: string },
) {
  if (!isSupabaseConfigured) {
    return requestAccount('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ ...profile, password }),
    }) as Promise<AccountData>
  }

  const { data, error } = await requireSupabase().auth.signUp({
    email: profile.email,
    password,
    options: {
      data: {
        provider: 'email',
        display_name: profile.name,
        phone: profile.phone,
        postal_code: profile.postalCode,
        address_line1: profile.addressLine1,
        address_line2: profile.addressLine2,
        phone_verification_challenge_id: phoneVerification?.challengeId,
        phone_verification_token: phoneVerification?.verificationToken,
      },
    },
  })

  if (error || !data.user) throw new AccountApiError(error?.message || '회원가입을 처리하지 못했습니다.', 400)
  if (!data.session) {
    throw new AccountApiError('가입 확인 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.', 202)
  }
  return getSupabaseAccount(data.user, new Date().toISOString())
}

async function getSocialAuthError(response: Response, provider: SocialProvider) {
  const payload = await response.json().catch(() => null) as { msg?: string; message?: string } | null
  const message = payload?.msg ?? payload?.message ?? ''

  if (/unsupported provider|provider .* not found|provider is not enabled/i.test(message)) {
    return `${provider} 간편 로그인이 아직 연결되지 않았습니다. 관리자 설정이 완료된 뒤 다시 시도해 주세요.`
  }

  return message || `${provider} 로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.`
}

export async function loginWithSocial(provider: SocialProvider): Promise<AccountData | null> {
  if (!isSupabaseConfigured) {
    return requestAccount('/api/auth/social-demo', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    }) as Promise<AccountData>
  }

  const { data, error } = await requireSupabase().auth.signInWithOAuth({
    provider: SOCIAL_OAUTH_PROVIDERS[provider],
    options: {
      redirectTo: getPublicAppUrl(),
      skipBrowserRedirect: true,
    },
  })
  if (error) throw new AccountApiError(error.message, 400)
  if (!data.url) throw new AccountApiError(`${provider} 로그인 주소를 만들지 못했습니다.`, 500)

  // signInWithOAuth normally redirects before a disabled-provider response can be
  // handled by the app. Probe the authorize endpoint first so users see a useful
  // Korean message instead of Supabase's raw JSON error page.
  try {
    const response = await fetch(data.url, {
      method: 'GET',
      credentials: 'omit',
      redirect: 'manual',
    })

    if (response.status >= 400) {
      throw new AccountApiError(await getSocialAuthError(response, provider), response.status)
    }
  } catch (probeError) {
    if (probeError instanceof AccountApiError) throw probeError
    // Some browsers hide cross-origin manual redirects. In that case the real
    // navigation below is still the correct and safe OAuth flow.
  }

  window.location.assign(data.url)
  return null
}

export async function logoutServerAccount() {
  if (isSupabaseConfigured) {
    const { error } = await requireSupabase().auth.signOut()
    if (error) throw new AccountApiError(error.message, 400)
    return
  }

  await requestAccount('/api/auth/logout', { method: 'POST' })
}

export async function updateServerProfile(profile: CustomerProfile) {
  if (!isSupabaseConfigured) {
    return requestAccount('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(profile),
    }) as Promise<AccountData>
  }

  const client = requireSupabase()
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError || !userData.user) throw new AccountApiError('로그인이 필요합니다.', 401)

  const { data, error } = await client.rpc('update_my_profile', { p_profile: profile })
  if (error) throw new AccountApiError(error.message, 400)

  const result = data as { email_changed?: boolean } | null
  if (result?.email_changed) {
    const { error: emailError } = await client.auth.updateUser({ email: profile.email })
    if (emailError) throw new AccountApiError(emailError.message, 400)
  }

  return getSupabaseAccount(userData.user)
}
