import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type OrderEmailEvent = 'order_complete' | 'shipping_started' | 'delivered'

type OrderRow = {
  id: string
  user_id: string | null
  product_id: string
  product_name: string
  option_name: string
  quantity: number
  total: number
  customer_name: string
  phone: string
  address: string
  payment_method: string
  delivery_note: string
  status: string
  created_at: string
}

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

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatWon(value: number) {
  return `${Math.max(0, Number(value) || 0).toLocaleString('ko-KR')}원`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function eventCopy(event: OrderEmailEvent, order: OrderRow) {
  const shortId = order.id.replace(/^ord-/, '').slice(0, 8).toUpperCase()
  if (event === 'shipping_started') {
    return {
      eyebrow: 'YOUR PARCEL IS MOVING · 02',
      marker: '→',
      title: '기다리던 상품이\n출발했어요.',
      description: '주문하신 상품의 배송이 시작됐어요. 설레는 마음으로 조금만 기다려 주세요.',
      status: '배송 시작',
      statusDetail: '상품이 배송지로 이동 중이에요',
      subject: `[TO YOU] 주문하신 상품이 출발했어요 · ${shortId}`,
      action: '배송 현황 확인하기',
    }
  }
  if (event === 'delivered') {
    return {
      eyebrow: 'DELIVERED WITH CARE · 03',
      marker: '✓',
      title: '상품이 안전하게\n도착했어요.',
      description: 'TO YOU의 상품이 배송지에 도착했어요. 마음에 드는 순간이 되길 바랍니다.',
      status: '배송 완료',
      statusDetail: '소중한 주문의 배송을 마쳤어요',
      subject: `[TO YOU] 상품이 안전하게 도착했어요 · ${shortId}`,
      action: '주문 내역 확인하기',
    }
  }
  return {
    eyebrow: 'ORDER NOTE · 01',
    marker: '✓',
    title: '주문이 기분 좋게\n완료됐어요.',
    description: 'TO YOU를 선택해 주셔서 고마워요. 상품을 정성껏 준비해 배송이 시작되면 다시 알려드릴게요.',
    status: '주문 완료',
    statusDetail: '결제가 완료되어 상품을 확인하고 있어요',
    subject: `[TO YOU] 주문이 완료됐어요 · ${shortId}`,
    action: '주문 상세 보기',
  }
}

function orderEmailHtml(event: OrderEmailEvent, order: OrderRow, displayName: string, imageUrl: string | null) {
  const copy = eventCopy(event, order)
  const [firstLine, secondLine] = copy.title.split('\n')
  const paymentLabel = order.payment_method === 'kakao' ? '카카오페이' : order.payment_method === 'naver' ? '네이버페이' : '카드 결제'
  const shortId = order.id.replace(/^ord-/, '').slice(0, 8).toUpperCase()
  const safeImageUrl = imageUrl && /^https:\/\//i.test(imageUrl) ? escapeHtml(imageUrl) : ''

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(copy.subject)}</title></head>
  <body style="margin:0;padding:0;background:#eee9e2;color:#241f1b;font-family:Arial,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(copy.description)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eee9e2;"><tr><td align="center" style="padding:42px 14px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border:1px solid #dcd1c6;border-radius:28px;background:#fffdf9;overflow:hidden;box-shadow:0 20px 60px rgba(48,35,26,.12);">
    <tr><td style="padding:22px 34px;background:#241f1b;color:#fff;"><table role="presentation" width="100%"><tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:28px;letter-spacing:-1.4px;">TO YOU</td><td align="right" style="color:#cbbeb2;font-size:10px;font-weight:700;letter-spacing:2px;">ORDER ${shortId}</td></tr></table></td></tr>
    <tr><td style="padding:44px 42px 38px;">
      <table role="presentation" width="100%"><tr><td valign="top"><p style="margin:0;color:#b9583f;font-size:10px;font-weight:800;letter-spacing:1.5px;">${copy.eyebrow}</p><h1 style="margin:20px 0 14px;color:#241f1b;font-family:Georgia,'Noto Serif KR',serif;font-size:35px;font-weight:500;line-height:1.24;letter-spacing:-1.6px;">${firstLine}<br>${secondLine}</h1></td><td width="58" valign="top" align="right"><div style="width:54px;height:54px;border-radius:18px;background:#f1e2da;color:#bc5940;font-size:25px;line-height:54px;text-align:center;">${copy.marker}</div></td></tr></table>
      <p style="margin:0;color:#716861;font-size:14px;line-height:1.8;"><strong style="color:#312a25;">${escapeHtml(displayName)}님,</strong> ${copy.description}</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;border:1px solid #e5dbd2;border-radius:18px;background:#faf6f1;overflow:hidden;"><tr>${safeImageUrl ? `<td width="120" style="padding:18px 0 18px 18px;"><img src="${safeImageUrl}" width="102" height="126" alt="" style="display:block;width:102px;height:126px;border:0;border-radius:12px;object-fit:cover;background:#eee7df;"></td>` : ''}<td valign="middle" style="padding:20px 20px 20px ${safeImageUrl ? '18px' : '22px'};"><p style="margin:0 0 6px;color:#9b6a58;font-size:9px;font-weight:800;letter-spacing:1.2px;">YOUR SELECTION</p><h2 style="margin:0 0 10px;color:#2a2420;font-size:17px;line-height:1.45;">${escapeHtml(order.product_name)}</h2><p style="margin:0;color:#766c65;font-size:12px;line-height:1.7;">${escapeHtml(order.option_name || '기본 옵션')} · ${order.quantity}개</p><strong style="display:block;margin-top:12px;color:#2a2420;font-size:16px;">${formatWon(order.total)}</strong></td></tr></table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;border-collapse:separate;border-spacing:0 8px;"><tr><td style="color:#9a9088;font-size:11px;">주문 번호</td><td align="right" style="color:#38312c;font-size:11px;font-weight:700;">${shortId}</td></tr><tr><td style="color:#9a9088;font-size:11px;">주문 일시</td><td align="right" style="color:#38312c;font-size:11px;">${escapeHtml(formatDate(order.created_at))}</td></tr><tr><td style="color:#9a9088;font-size:11px;">결제 수단</td><td align="right" style="color:#38312c;font-size:11px;">${paymentLabel}</td></tr></table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;border:1px solid #eadfd5;border-radius:16px;background:#f8f2ec;"><tr><td width="58" align="center" style="color:#c06047;font-size:22px;">${copy.marker}</td><td style="padding:16px 16px 16px 0;color:#716861;font-size:12px;line-height:1.65;"><strong style="display:block;margin-bottom:2px;color:#312a25;">${copy.status}</strong>${copy.statusDetail}</td></tr></table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:25px;"><tr><td align="center" bgcolor="#241f1b" style="border-radius:14px;"><a href="https://toyou.kr/account/orders" style="display:block;padding:16px 22px;color:#fff;font-size:14px;font-weight:800;text-decoration:none;">${copy.action}&nbsp; →</a></td></tr></table>
      <div style="margin-top:28px;padding-top:22px;border-top:1px solid #ece4dd;"><p style="margin:0 0 8px;color:#a16854;font-size:10px;font-weight:800;letter-spacing:1px;">DELIVERY TO</p><p style="margin:0;color:#5f554e;font-size:12px;line-height:1.7;">${escapeHtml(order.customer_name)} · ${escapeHtml(order.phone)}<br>${escapeHtml(order.address)}</p>${order.delivery_note ? `<p style="margin:8px 0 0;color:#958a82;font-size:11px;">배송 메모 · ${escapeHtml(order.delivery_note)}</p>` : ''}</div>
    </td></tr>
    <tr><td style="padding:22px 42px;border-top:1px solid #ebe3dc;background:#faf6f1;color:#9a9088;font-size:10px;line-height:1.7;">주문 관련 문의는 이 메일에 회신하거나 hello@toyou.kr로 알려 주세요.<br><strong style="color:#554b44;">TO YOU</strong> · toyou.kr</td></tr>
  </table></td></tr></table></body></html>`
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) })
  if (request.method !== 'POST') return json(request, { error: 'POST 요청만 지원합니다.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const authorization = request.headers.get('authorization') ?? ''
  const accessToken = authorization.replace(/^Bearer\s+/i, '')

  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json(request, { error: '메일 서버 설정을 확인해 주세요.' }, 500)
  if (!accessToken) return json(request, { error: '로그인이 필요합니다.' }, 401)

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userData, error: userError } = await authClient.auth.getUser(accessToken)
  if (userError || !userData.user) return json(request, { error: '로그인 정보를 확인하지 못했습니다.' }, 401)

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    const body = await request.json()
    const event = String(body.event ?? '') as OrderEmailEvent
    const orderId = String(body.orderId ?? '').trim()
    if (!['order_complete', 'shipping_started', 'delivered'].includes(event) || !/^ord-[a-z0-9-]{8,80}$/i.test(orderId)) {
      return json(request, { error: '메일 요청 정보가 올바르지 않습니다.' }, 400)
    }

    const { data: orderData, error: orderError } = await admin.from('orders').select('*').eq('id', orderId).single()
    if (orderError || !orderData) return json(request, { error: '주문을 찾을 수 없습니다.' }, 404)
    const order = orderData as OrderRow

    const { data: requester } = await admin.from('profiles').select('is_admin').eq('id', userData.user.id).maybeSingle()
    const isOwner = order.user_id === userData.user.id
    const isAdmin = Boolean(requester?.is_admin)
    if (event === 'order_complete' ? !isOwner : !isAdmin) return json(request, { error: '이 메일을 보낼 권한이 없습니다.' }, 403)

    const [{ data: customer }, { data: product }] = await Promise.all([
      admin.from('profiles').select('email, display_name').eq('id', order.user_id).maybeSingle(),
      admin.from('products').select('image_url').eq('id', order.product_id).maybeSingle(),
    ])
    const recipient = String(customer?.email ?? '').trim()
    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) return json(request, { error: '주문자의 이메일 주소를 확인해 주세요.' }, 422)
    if (!resendApiKey) return json(request, { error: '주문 메일 발송 키가 아직 설정되지 않았습니다.' }, 503)

    const copy = eventCopy(event, order)
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${resendApiKey}`,
        'content-type': 'application/json',
        'idempotency-key': `toyou-${event}-${order.id}`,
        'user-agent': 'toyou-supabase-edge/1.0',
      },
      body: JSON.stringify({
        from: Deno.env.get('EMAIL_FROM') || 'TO YOU <no-reply@toyou.kr>',
        reply_to: 'hello@toyou.kr',
        to: [recipient],
        subject: copy.subject,
        html: orderEmailHtml(event, order, String(customer?.display_name || order.customer_name), String(product?.image_url || '')),
        tags: [{ name: 'category', value: event }, { name: 'order_id', value: order.id.slice(0, 60) }],
      }),
    })
    const resendPayload = await resendResponse.json().catch(() => ({}))
    if (!resendResponse.ok) return json(request, { error: '메일 서비스가 발송 요청을 처리하지 못했습니다.', details: resendPayload }, 502)
    return json(request, { ok: true, id: resendPayload.id })
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : '주문 메일을 보내지 못했습니다.' }, 500)
  }
})
