export type AdminPostCategory = 'notice' | 'journal' | 'event'
export type AdminPostStatus = 'draft' | 'published'

export type AdminPost = {
  id: string
  title: string
  category: AdminPostCategory
  excerpt: string
  content: string
  status: AdminPostStatus
  pinned: boolean
  coverImage?: string
  createdAt: string
  updatedAt: string
}

export type AdminOrderStatus = 'paid' | 'preparing' | 'shipping' | 'delivered' | 'cancelled'

export type AdminOrder = {
  id: string
  productId: string
  productName: string
  option: string
  quantity: number
  total: number
  customerName: string
  phone: string
  address: string
  paymentMethod: 'card' | 'kakao' | 'naver'
  deliveryNote: string
  status: AdminOrderStatus
  createdAt: string
}

export type AdminReviewStatus = 'visible' | 'hidden'

export type AdminReview = {
  id: string
  productId: string
  productName: string
  author: string
  rating: number
  option: string
  body: string
  status: AdminReviewStatus
  createdAt: string
}

export type StoreSettings = {
  storeName: string
  announcement: string
  shippingNotice: string
  supportEmail: string
  supportPhone: string
  footerDescription: string
  maintenanceMode: boolean
}

const STORAGE_KEYS = {
  posts: 'toyou-admin-posts-v1',
  orders: 'toyou-admin-orders-v1',
  reviews: 'toyou-admin-reviews-v2',
  settings: 'toyou-store-settings-v1',
} as const

export const seedPosts: AdminPost[] = [
  {
    id: 'post-summer-delivery',
    title: '여름 시즌 배송 일정 안내',
    category: 'notice',
    excerpt: '주문량 증가에 따른 출고 일정과 고객센터 운영 시간을 안내합니다.',
    content: '평일 오후 2시 이전 결제 완료 주문은 당일 출고됩니다. 일부 주문 제작 상품은 상세 페이지의 출고 일정을 확인해 주세요.',
    status: 'published',
    pinned: true,
    createdAt: '2026-07-14T02:00:00.000Z',
    updatedAt: '2026-07-14T02:00:00.000Z',
  },
  {
    id: 'post-space-journal',
    title: '오래 머물고 싶은 공간을 만드는 법',
    category: 'journal',
    excerpt: '좋아하는 물건을 천천히 고르고 배치하는 작은 방법을 소개합니다.',
    content: '공간의 인상은 물건의 수보다 여백과 반복되는 재료에서 시작합니다. 나무, 패브릭, 금속처럼 세 가지 안쪽의 소재를 골라 보세요.',
    status: 'published',
    pinned: false,
    createdAt: '2026-07-10T06:30:00.000Z',
    updatedAt: '2026-07-12T01:20:00.000Z',
  },
  {
    id: 'post-member-week',
    title: '멤버 위크 사전 안내',
    category: 'event',
    excerpt: '회원 전용 혜택과 선공개 상품을 준비하고 있습니다.',
    content: '이벤트 상세 혜택과 참여 방법은 오픈 당일 공개됩니다.',
    status: 'draft',
    pinned: false,
    createdAt: '2026-07-15T04:00:00.000Z',
    updatedAt: '2026-07-15T04:00:00.000Z',
  },
]

export const seedOrders: AdminOrder[] = []

export const seedReviews: AdminReview[] = [
  {
    id: 'review-seed-1',
    productId: 'orb-case',
    productName: 'Orb Case',
    author: '김**',
    rating: 5,
    option: 'Ivory',
    body: '사진보다 소재가 더 단정하고 수납도 생각보다 넉넉해요.',
    status: 'visible',
    createdAt: '2026-07-12T05:20:00.000Z',
  },
  {
    id: 'review-seed-2',
    productId: 'cloud-bag',
    productName: 'Cloud Bag',
    author: '이**',
    rating: 4,
    option: 'Brown',
    body: '가볍고 매일 들기 좋아요. 포장도 깔끔했습니다.',
    status: 'visible',
    createdAt: '2026-07-09T08:10:00.000Z',
  },
  {
    id: 'review-seed-3',
    productId: 'satin-cap',
    productName: 'Satin Cap',
    author: '박**',
    rating: 3,
    option: 'Black',
    body: '디자인은 마음에 들지만 포장이 조금 눌려서 도착했어요.',
    status: 'hidden',
    createdAt: '2026-07-07T03:40:00.000Z',
  },
]

export const defaultStoreSettings: StoreSettings = {
  storeName: 'TO YOU',
  announcement: '신규 회원 첫 구매 10% 혜택 · 7만원 이상 무료배송',
  shippingNotice: '평일 오후 2시 이전 주문은 당일 출고됩니다.',
  supportEmail: 'hello@toyou-store.kr',
  supportPhone: '02-1234-5678',
  footerDescription: '매일 가까이 두고 싶은 물건을 소개합니다.',
  maintenanceMode: false,
}

function loadValue<T>(key: string, fallback: T, validate: (value: unknown) => value is T): T {
  if (typeof window === 'undefined') return fallback

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as unknown
    return validate(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function saveValue<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Image data can exceed the browser storage quota. Keep the live state usable.
  }
}

const isArray = <T,>(value: unknown): value is T[] => Array.isArray(value)

export const loadAdminPosts = () => loadValue(STORAGE_KEYS.posts, seedPosts, isArray<AdminPost>)
export const loadAdminOrders = () => loadValue(STORAGE_KEYS.orders, seedOrders, isArray<AdminOrder>)
export const loadAdminReviews = () => loadValue(STORAGE_KEYS.reviews, seedReviews, isArray<AdminReview>)
export const loadStoreSettings = () => loadValue(
  STORAGE_KEYS.settings,
  defaultStoreSettings,
  (value): value is StoreSettings => Boolean(value && typeof value === 'object' && typeof (value as StoreSettings).storeName === 'string'),
)

export const saveAdminPosts = (value: AdminPost[]) => saveValue(STORAGE_KEYS.posts, value)
export const saveAdminOrders = (value: AdminOrder[]) => saveValue(STORAGE_KEYS.orders, value)
export const saveAdminReviews = (value: AdminReview[]) => saveValue(STORAGE_KEYS.reviews, value)
export const saveStoreSettings = (value: StoreSettings) => saveValue(STORAGE_KEYS.settings, value)

export function createAdminId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
