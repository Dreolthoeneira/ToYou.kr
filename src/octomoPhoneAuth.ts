import { isSupabaseConfigured, requireSupabase } from './supabaseClient'

export type OctomoChallenge = {
  challengeId: string
  code: string
  recipient: string
  qrCode: string
  expiresAt: string
}

export type OctomoVerification = {
  verified: boolean
  verificationToken?: string
}

async function invokeOctomo<T>(body: Record<string, unknown>): Promise<T> {
  if (!isSupabaseConfigured) throw new Error('휴대폰 인증은 운영 사이트에서 이용해 주세요.')

  const { data, error } = await requireSupabase().functions.invoke('octomo-phone-auth', { body })
  if (error) {
    let message = error.message || '휴대폰 인증 서버에 연결하지 못했습니다.'
    const context = (error as { context?: unknown }).context
    if (context instanceof Response) {
      const payload = await context.clone().json().catch(() => null) as { error?: string } | null
      if (payload?.error) message = payload.error
    }
    throw new Error(message)
  }
  if (data?.error) throw new Error(String(data.error))
  return data as T
}

export function startOctomoPhoneVerification(phone: string) {
  return invokeOctomo<OctomoChallenge>({ action: 'start', phone })
}

export function checkOctomoPhoneVerification(challengeId: string) {
  return invokeOctomo<OctomoVerification>({ action: 'check', challengeId })
}

