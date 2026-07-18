import type { User } from '@supabase/supabase-js'
import type { AuthSession } from './authSession'
import type { CustomerProfile } from './customerProfile'
import { getPublicAppUrl, isSupabaseConfigured, requireSupabase } from './supabaseClient'

export interface AccountData {
  session: AuthSession
  profile: CustomerProfile
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

  constructor(message: string, status: number) {
    super(message)
    this.status = status
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
  if (error || !data.user) throw new AccountApiError(error?.message || '로그인하지 못했습니다.', 401)
  return getSupabaseAccount(data.user, new Date().toISOString())
}

export async function signupWithEmail(profile: CustomerProfile, password: string) {
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
      },
    },
  })

  if (error || !data.user) throw new AccountApiError(error?.message || '회원가입을 처리하지 못했습니다.', 400)
  if (!data.session) {
    throw new AccountApiError('가입 확인 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.', 202)
  }
  return getSupabaseAccount(data.user, new Date().toISOString())
}

export async function loginWithSocialDemo(provider: 'Kakao' | 'Google' | 'Naver'): Promise<AccountData | null> {
  if (!isSupabaseConfigured) {
    return requestAccount('/api/auth/social-demo', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    }) as Promise<AccountData>
  }

  if (provider === 'Naver') {
    throw new AccountApiError('네이버 로그인은 Supabase의 사용자 지정 OIDC 공급자 설정 후 사용할 수 있습니다.', 501)
  }

  const { error } = await requireSupabase().auth.signInWithOAuth({
    provider: provider === 'Kakao' ? 'kakao' : 'google',
    options: { redirectTo: getPublicAppUrl() },
  })
  if (error) throw new AccountApiError(error.message, 400)
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
