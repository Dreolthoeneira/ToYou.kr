export type ArtType = 'case' | 'bag' | 'drop' | 'buds' | 'cap' | 'jar' | 'box' | 'van' | 'globe'

export type ProductSpec = {
  label: string
  value: string
}

export type Product = {
  id: string
  category: string
  name: string
  caption: string
  marketplace: string
  eta: string
  originalPrice: number
  price: number
  discount: number
  art: ArtType
  palette: [string, string]
  accent: string
  tags: string[]
  originalUrl: string
  originShop: string
  imageUrl?: string
  imageUrls?: string[]
  options: string[]
  overview: string
  detailPoints: string[]
  specs: ProductSpec[]
  notices: string[]
}

export type ServiceType = {
  id: string
  title: string
  description: string
  emoji: string
  icon: ArtType
  benefits: string[]
}

export type Review = {
  name: string
  title: string
  body: string
  rating: number
  item: string
}

export const heroStats = [
  { label: '오늘 큐레이션', value: '126+' },
  { label: '평균 도착', value: '6.8일' },
  { label: '재구매 만족도', value: '96%' },
]

export const trendKeywords = [
  '올리브영 단독',
  '무신사 여성',
  '키링',
  '블루투스 이어폰',
  '홈카페',
  'K-POP 굿즈',
  '캠퍼스 백팩',
  '한정 드롭',
]

export const quickBenefits = [
  'URL만 붙여도 예상 결제 금액 자동 계산',
  '원래 판매처 링크와 요청사항을 함께 관리',
  '상세 페이지 안에서 주의사항과 리뷰를 분리 노출',
]

export const editorialNotes = [
  {
    label: '서울 편집장 메모',
    title: '상세 페이지가 구매 결정을 만든다',
    body: '메인보다 중요한 것은 상품 상세에서의 신뢰 설계입니다. 요청사항과 원본 링크 노출이 특히 중요합니다.',
  },
  {
    label: '오늘의 드롭',
    title: '테크, 뷰티, 리빙 소형 굿즈가 강세',
    body: '구매대행형 쇼핑몰에서는 가볍고 감도 높은 상품이 상세 페이지 전환율이 높게 나타납니다.',
  },
]

export const serviceTypes: ServiceType[] = [
  {
    id: 'proxy',
    title: '구매대행',
    description: '한국 스토어 상품을 대신 결제하고 검수 후 국제 배송까지 한 번에 처리합니다.',
    emoji: '🛍',
    icon: 'bag',
    benefits: ['원본 링크 검증', '국내 결제 대행', '검수 후 출고'],
  },
  {
    id: 'forwarding',
    title: '합배송',
    description: '여러 주문 건을 한 박스로 정리해 배송비를 줄이고 파손 위험을 낮춥니다.',
    emoji: '📦',
    icon: 'box',
    benefits: ['복수 주문 묶음', '재포장 최적화', '국제 배송비 절감'],
  },
  {
    id: 'request',
    title: '맞춤 요청',
    description: '가격 협상, 구성품 확인, 추가 사진 요청처럼 세부 지시를 구매 전에 전달할 수 있습니다.',
    emoji: '✍',
    icon: 'van',
    benefits: ['요청사항 메모', '조건부 구매', '검수 포인트 지정'],
  },
]

export const popularBrands = [
  'MUSINSA',
  'OLIVE YOUNG',
  '29CM',
  'KREAM',
  'BUNJANG',
  'W CONCEPT',
  'TAMBURINS',
  'MATIN KIM',
]

export const destinationCountries = [
  { code: 'JP', flagCode: 'jp', name: '일본', rate: 8900 },
  { code: 'US', flagCode: 'us', name: '미국', rate: 12500 },
  { code: 'SG', flagCode: 'sg', name: '싱가포르', rate: 9400 },
  { code: 'VN', flagCode: 'vn', name: '베트남', rate: 7200 },
  { code: 'DE', flagCode: 'de', name: '독일', rate: 14200 },
  { code: 'AU', flagCode: 'au', name: '호주', rate: 13800 },
]

export const products: Product[] = [
  {
    id: 'orb-case',
    category: '테크',
    name: 'Orb Ripple MagSafe Case',
    caption: '투명 실버 프레임과 글로시 웨이브 패턴이 섞인 테크 액세서리',
    marketplace: 'MUSINSA',
    eta: '5-8일',
    originalPrice: 39000,
    price: 32000,
    discount: 18,
    art: 'case',
    palette: ['#ffe8ef', '#f7bfd0'],
    accent: '#ad2347',
    tags: ['아이폰', '선물추천', '트렌드'],
    originalUrl: 'https://global.musinsa.com/app/goods/5605959',
    originShop: 'MUSINSA GLOBAL',
    options: ['iPhone 15 Pro / Silver', 'iPhone 16 / Clear Pink', 'Galaxy S25 / Mirror'],
    overview:
      '웨이브 패턴이 은은하게 반사되는 하드 케이스입니다. 과한 프린트 없이도 테크 무드를 살릴 수 있어 데일리 케이스로 많이 찾는 타입입니다.',
    detailPoints: [
      '후면에 미세한 굴곡이 들어가 있어 빛에 따라 패턴이 선명하게 드러납니다.',
      'MagSafe 자석 링이 숨겨져 있어 무선 충전과 카드 월렛 사용이 편합니다.',
      '실버 엣지 코팅으로 사진 촬영 시도 오브제로 보일 만큼 시각적 존재감이 강합니다.',
    ],
    specs: [
      { label: '소재', value: 'PC + TPU 혼합' },
      { label: '마감', value: '유광 코팅' },
      { label: '포장', value: '개별 종이 슬리브 포함' },
      { label: '원산지', value: 'Korea' },
    ],
    notices: [
      '유광 코팅 특성상 미세 스크래치가 있을 수 있어 검수 요청을 권장합니다.',
      '기종별 카메라 홀 위치가 달라 주문 전 옵션 확인이 필요합니다.',
    ],
  },
  {
    id: 'cloud-bag',
    category: '패션',
    name: 'Cloud Pocket Big Bag',
    caption: '부드러운 나일론 볼륨감과 넉넉한 수납력이 매력적인 빅 백',
    marketplace: '29CM',
    eta: '6-9일',
    originalPrice: 89000,
    price: 74200,
    discount: 17,
    art: 'bag',
    palette: ['#ebf4ff', '#b4d0ff'],
    accent: '#2458c5',
    tags: ['백팩', '캠퍼스룩', '데일리'],
    originalUrl: 'https://shop.29cm.co.kr/catalog/2445107',
    originShop: '29CM',
    options: ['Sky Blue / Free', 'Ivory / Free', 'Graphite / Free'],
    overview:
      '착용했을 때 과하게 커 보이지 않으면서도 수납이 잘 되는 형태의 숄더백입니다. 패딩이 들어간 듯한 볼륨감 덕분에 봄/가을 아우터와 특히 잘 어울립니다.',
    detailPoints: [
      '외부 포켓 2개와 내부 분리 포켓이 있어 태블릿과 소지품을 나눠 담기 좋습니다.',
      '가벼운 나일론 원단이라 데일리 통학용으로도 부담이 적습니다.',
      '흐물거리지 않도록 하단 패널이 보강되어 실루엣이 안정적으로 유지됩니다.',
    ],
    specs: [
      { label: '사이즈', value: 'W 42 x H 31 x D 14 cm' },
      { label: '무게', value: '480g' },
      { label: '소재', value: 'Nylon 100%' },
      { label: '수납', value: '13인치 노트북 가능' },
    ],
    notices: [
      '밝은 컬러는 조명에 따라 실제보다 더 채도 높게 보일 수 있습니다.',
      '접힌 상태로 입고될 수 있어 첫 사용 전 모양 정리가 필요할 수 있습니다.',
    ],
  },
  {
    id: 'dew-drop',
    category: '뷰티',
    name: 'Dew Reset Glow Ampoule',
    caption: '아침 피부 톤을 화사하게 끌어올리는 광채 앰플 세트',
    marketplace: 'OLIVE YOUNG',
    eta: '4-7일',
    originalPrice: 32000,
    price: 24800,
    discount: 22,
    art: 'drop',
    palette: ['#fff6e8', '#f7ddb2'],
    accent: '#9b5c14',
    tags: ['비건', '톤업', '올영세일'],
    originalUrl: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000185555',
    originShop: 'OLIVE YOUNG',
    options: ['30ml 단품', '30ml + 패드 증정', '2개 세트'],
    overview:
      '수분감 위주의 제형에 미세한 윤광이 더해져 메이크업 전 단계에서 피부 표현을 고르게 만드는 타입입니다. 가벼운 사용감을 선호하는 고객에게 특히 반응이 좋습니다.',
    detailPoints: [
      '끈적임이 적고 빠르게 흡수되어 아침 루틴에 사용하기 좋습니다.',
      '단독 사용보다 수분크림과 함께 사용했을 때 광채 표현이 더 안정적입니다.',
      '세트 구성은 시즌별로 변동될 수 있어 실제 증정품 확인이 필요합니다.',
    ],
    specs: [
      { label: '용량', value: '30ml' },
      { label: '사용기한', value: '개봉 후 12개월' },
      { label: '피부 타입', value: '중건성, 복합성 추천' },
      { label: '제형', value: '라이트 세럼' },
    ],
    notices: [
      '뷰티 제품은 항공 규정에 따라 합배송 시 수량 제한이 생길 수 있습니다.',
      '패키지 리뉴얼 시 외형이 일부 달라질 수 있습니다.',
    ],
  },
  {
    id: 'nova-buds',
    category: '테크',
    name: 'Nova Sparkle Earbuds',
    caption: '크리스털 라이팅 포인트가 들어간 컴팩트 블루투스 이어버드',
    marketplace: 'NAVER',
    eta: '5-7일',
    originalPrice: 68000,
    price: 55900,
    discount: 18,
    art: 'buds',
    palette: ['#f2eeff', '#d7c8ff'],
    accent: '#6240c8',
    tags: ['이어폰', '출퇴근', '신학기'],
    originalUrl: 'https://smartstore.naver.com/example/products/9876543210',
    originShop: 'NAVER BRAND STORE',
    options: ['Lavender', 'Silver Blue', 'Pearl White'],
    overview:
      '작은 케이스에 반짝이는 LED 포인트를 넣은 감성형 이어버드입니다. 성능만 보는 제품보다는 선물용, 스타일링용 수요가 높은 편입니다.',
    detailPoints: [
      '케이스 뚜껑을 열면 은은한 라이트가 들어와 오브제처럼 보입니다.',
      '터치 반응이 빠르고, 기본 통화 품질이 안정적입니다.',
      '테크 소품과 같이 선물 세트로 묶었을 때 만족도가 높은 제품입니다.',
    ],
    specs: [
      { label: '배터리', value: '본체 6시간 / 케이스 포함 24시간' },
      { label: '충전', value: 'USB-C' },
      { label: '연결', value: 'Bluetooth 5.3' },
      { label: '구성품', value: '이어팁 3종, 충전 케이블' },
    ],
    notices: [
      '전자제품 특성상 개봉 후 단순 변심 반품이 제한될 수 있습니다.',
      '컬러 LED 표현은 촬영 환경에 따라 실제와 다르게 보일 수 있습니다.',
    ],
  },
  {
    id: 'satin-cap',
    category: '액세서리',
    name: 'Satin Stitch Ball Cap',
    caption: '얇은 챙 라인과 광택 스티치가 포인트인 로우 프로파일 캡',
    marketplace: 'KREAM',
    eta: '7-10일',
    originalPrice: 47000,
    price: 38800,
    discount: 17,
    art: 'cap',
    palette: ['#eef7f0', '#b9e7c7'],
    accent: '#1f7b47',
    tags: ['볼캡', '한정', '셀럽착용'],
    originalUrl: 'https://kream.co.kr/products/327067',
    originShop: 'KREAM',
    options: ['Black', 'Forest', 'Cream'],
    overview:
      '챙이 지나치게 길지 않고 로고 자수가 얇게 들어간 타입이라, 남녀 모두 무난하게 쓰기 좋습니다. 특히 캐주얼 재킷, 니트와 매칭이 잘 됩니다.',
    detailPoints: [
      '사틴 자수 라인이 강한 로고 캡보다 부담이 적습니다.',
      '로우 프로파일 형태라 모자 깊이가 적당해 얼굴이 작아 보이는 편입니다.',
      '리셀 플랫폼 특성상 입고 시점별 가격 변동이 있을 수 있습니다.',
    ],
    specs: [
      { label: '둘레', value: 'Free / 스트랩 조절' },
      { label: '소재', value: 'Cotton 100%' },
      { label: '핏', value: 'Low profile' },
      { label: '세탁', value: '손세탁 권장' },
    ],
    notices: [
      '플랫폼 매물 특성상 택 상태와 부속품 유무를 요청사항에 적어두는 것이 좋습니다.',
      '오프화이트 계열은 미세 오염 여부 검수 요청을 권장합니다.',
    ],
  },
  {
    id: 'jam-candle',
    category: '리빙',
    name: 'Jam Pot Aroma Candle',
    caption: '버터색 왁스와 유리 자 타입 용기로 완성한 홈카페 캔들',
    marketplace: 'BUNJANG',
    eta: '6-8일',
    originalPrice: 41000,
    price: 33400,
    discount: 19,
    art: 'jar',
    palette: ['#fff3eb', '#ffd0b8'],
    accent: '#b14d1f',
    tags: ['캔들', '홈카페', '선물'],
    originalUrl: 'https://m.bunjang.co.kr/products/392751053',
    originShop: 'BUNJANG',
    options: ['Butter Toast', 'White Fig', 'Milk Tea'],
    overview:
      '잼 병 같은 유리 자에 따뜻한 색감의 왁스를 담아두어 인테리어 포인트가 되는 캔들입니다. 향을 즐기기보다 오브제 무드를 찾는 고객에게도 반응이 좋습니다.',
    detailPoints: [
      '짧은 유리 자 형태라 책상, 주방, 선반 어디에 두어도 부피감이 과하지 않습니다.',
      '불을 켜지 않아도 향이 은은하게 올라오는 편입니다.',
      '중고/리셀 플랫폼 상품은 라벨 상태와 사용 흔적을 꼭 검수해야 합니다.',
    ],
    specs: [
      { label: '용량', value: '180g' },
      { label: '연소시간', value: '약 32시간' },
      { label: '재질', value: 'Soy wax / glass jar' },
      { label: '패키지', value: '리본 박스 가능' },
    ],
    notices: [
      '유리 용기 상품은 배송 전 파손 여부 검수 요청이 필수에 가깝습니다.',
      '중고 상품일 경우 사용량과 라벨 상태를 반드시 확인해 주세요.',
    ],
  },
]

export const reviews: Review[] = [
  {
    name: '이서윤',
    title: '상세 페이지에서 필요한 정보가 한 번에 보여서 결정이 빨랐어요.',
    body:
      '옵션, 배송 예상일, 원래 판매처 링크, 검수 요청까지 한 화면에서 확인할 수 있어서 구매대행 서비스인데도 흐름이 훨씬 명확하게 느껴졌어요.',
    rating: 5,
    item: 'Orb Ripple MagSafe Case',
  },
  {
    name: '김다온',
    title: '요청사항 박스가 있어서 리셀 상품 주문할 때 특히 좋았어요.',
    body:
      '택 유무랑 오염 체크를 미리 적을 수 있으니 중고 플랫폼 상품도 덜 불안했습니다. 단순 장바구니 화면보다 훨씬 설득력이 있었어요.',
    rating: 5,
    item: 'Jam Pot Aroma Candle',
  },
  {
    name: '박하은',
    title: '상품정보와 주의사항이 분리돼 있어서 읽기 편했어요.',
    body:
      '뷰티 제품은 배송 제한이나 구성 변경이 중요한데, 상세 페이지 안에서 따로 구분돼 있어서 실제 주문 전에 체크하기 편했습니다.',
    rating: 4,
    item: 'Dew Reset Glow Ampoule',
  },
]

export const processSteps = [
  {
    step: '01',
    title: '상품 선택 또는 URL 입력',
    description: '국내 스토어 URL을 붙여 넣거나 큐레이션 상품을 바로 선택합니다.',
  },
  {
    step: '02',
    title: '요청사항 작성',
    description: '옵션, 가격 조건, 검수 포인트를 주문 전에 남겨 정확도를 높입니다.',
  },
  {
    step: '03',
    title: '현지 구매 및 검수',
    description: '서울 현지에서 구매 후 박스 상태, 구성품, 외관을 확인합니다.',
  },
  {
    step: '04',
    title: '국제 배송 및 수령',
    description: '합배송과 재포장 후 출고하며, 도착 전까지 단계별로 추적할 수 있습니다.',
  },
]

export const ranking = {
  daily: [
    { rank: 1, name: 'Nova Sparkle Earbuds', tag: '테크', delta: '+14' },
    { rank: 2, name: 'Dew Reset Glow Ampoule', tag: '뷰티', delta: '+9' },
    { rank: 3, name: 'Orb Ripple MagSafe Case', tag: '테크', delta: '+7' },
    { rank: 4, name: 'Jam Pot Aroma Candle', tag: '리빙', delta: '+5' },
  ],
  weekly: [
    { rank: 1, name: 'Cloud Pocket Big Bag', tag: '패션', delta: '+20' },
    { rank: 2, name: 'Satin Stitch Ball Cap', tag: '액세서리', delta: '+12' },
    { rank: 3, name: 'Dew Reset Glow Ampoule', tag: '뷰티', delta: '+10' },
    { rank: 4, name: 'Jam Pot Aroma Candle', tag: '리빙', delta: '+8' },
  ],
  monthly: [
    { rank: 1, name: 'Cloud Pocket Big Bag', tag: '패션', delta: '+61' },
    { rank: 2, name: 'Nova Sparkle Earbuds', tag: '테크', delta: '+54' },
    { rank: 3, name: 'Orb Ripple MagSafe Case', tag: '테크', delta: '+41' },
    { rank: 4, name: 'Jam Pot Aroma Candle', tag: '리빙', delta: '+29' },
  ],
} as const

export const whyOnda = [
  {
    title: '원래 판매처 링크 확인',
    body: '대행 페이지 안에서도 원래 상품 페이지로 바로 이동해 상세 정보를 재확인할 수 있습니다.',
  },
  {
    title: '요청사항 기반 구매',
    body: '가격 협상 여부, 택 보존, 구성품 확인처럼 디테일한 요청을 주문 전에 남길 수 있습니다.',
  },
  {
    title: '주문 전 주의사항 분리',
    body: '배송 불가 품목, 검수 기준, 환불 대응 조건을 별도 블록으로 분리해 오해를 줄입니다.',
  },
]

export const currencyFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
})

export function detectMarketplace(input: string) {
  const lowered = input.toLowerCase()

  if (lowered.includes('oliveyoung')) return 'OLIVE YOUNG'
  if (lowered.includes('musinsa')) return 'MUSINSA'
  if (lowered.includes('kream')) return 'KREAM'
  if (lowered.includes('yes24')) return 'YES24'
  if (lowered.includes('aladin')) return 'ALADIN'
  if (lowered.includes('alpha')) return 'ALPHA'
  if (lowered.includes('bunjang')) return 'BUNJANG'
  if (lowered.includes('joongna')) return 'JOONGNA'
  if (lowered.includes('fleamarket.naver.com')) return 'NAVER FLEAMARKET'
  if (lowered.includes('29cm')) return '29CM'
  if (lowered.includes('smartstore') || lowered.includes('naver')) return 'NAVER'

  return '직접 셀렉트'
}
