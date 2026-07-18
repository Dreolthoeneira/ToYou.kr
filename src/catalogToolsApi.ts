import { isSupabaseConfigured, requireSupabase } from './supabaseClient'

export async function requestCatalogTool<T extends Record<string, unknown>>(path: string, body: Record<string, unknown>): Promise<T> {
  if (isSupabaseConfigured) {
    const action = path.replace(/^\/api\//, '')
    const { data, error } = await requireSupabase().functions.invoke('catalog-tools', {
      body: { action, ...body },
    })
    if (error) throw new Error(error.message || '상품 도구를 실행하지 못했습니다.')
    if (data?.error) throw new Error(String(data.error))
    return data as T
  }

  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(payload.error || '상품 도구를 실행하지 못했습니다.')
  return payload
}
