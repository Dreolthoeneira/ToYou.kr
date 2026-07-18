# TO YOU backend

## 실행 모드

프런트엔드 API 어댑터는 환경에 따라 자동으로 백엔드를 선택합니다.

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`가 있으면 Supabase를 사용합니다.
- 두 값이 없으면 Vite 미들웨어와 `data/toyou.sqlite`를 사용하는 로컬 SQLite 모드로 동작합니다.

브라우저 저장소는 언어 선택과 화면 캐시 같은 기기 로컬 편의 기능에만 남아 있습니다. 회원, 상품, 재고, 주문, 게시글, 리뷰, 장바구니, 찜, 재입고 요청, 구매 요청의 원본 데이터는 백엔드가 관리합니다.

## Supabase

`supabase/migrations/202607180001_initial_store.sql`은 다음을 생성합니다.

- Supabase Auth와 연결되는 `profiles`
- 상품, 재고, 게시글, 주문, 리뷰, 스토어 설정
- 가져온 상품과 구매 요청
- 회원별 장바구니, 찜, 재입고 요청
- 관리자 상품 이미지용 공개 Storage bucket
- 초기 상품, 게시글, 리뷰, 스토어 설정

모든 공개 스키마 테이블에 RLS가 활성화되어 있습니다. 공개 사용자는 판매 상품·공개 게시글·공개 리뷰만 읽을 수 있고, 회원 데이터는 본인 행만 접근할 수 있습니다. 관리자 쓰기는 `profiles.is_admin` 검사를 통과해야 합니다. 이 권한은 사용자가 수정할 수 있는 Auth user metadata에 저장하지 않습니다.

주문 생성, 주문 취소/복구, 장바구니 수량 합산은 Postgres 함수 안에서 실행됩니다. 주문 금액과 배송비는 DB가 상품 가격으로 다시 계산하고, 행 잠금 후 재고를 차감합니다. 취소 시 재고를 복원하며 취소 주문 복구 시 재고를 다시 검사합니다.

간편가입 계정은 DB 함수에서도 이름과 이메일 수정을 거부합니다. 이메일 가입 계정만 해당 필드를 수정할 수 있습니다.

## Edge Function

`supabase/functions/catalog-tools`는 정적 GitHub Pages에서 서버 코드가 필요한 기능을 담당합니다.

- 상품 상세 URL의 JSON-LD/Open Graph 정보 수집
- 번개장터와 네이버 플리마켓 검색
- 도서 검색

외부 판매처가 자동 수집을 차단하거나 HTML/API 형식을 바꾸면 해당 판매처 결과가 제한될 수 있습니다. 함수는 로컬·사설 네트워크 URL 요청을 차단합니다.

## 로컬 SQLite

`npm run dev`만 실행하면 기존 Node API와 SQLite가 켜집니다. 테스트 관리자 계정은 `test@toyou.kr` / `test1234`입니다. `TOYOU_SEED_DEMO=false`로 시드 계정을 끌 수 있고 `TOYOU_DB_PATH`로 DB 경로를 바꿀 수 있습니다.

로컬 세션은 무작위 토큰을 HttpOnly, SameSite=Lax 쿠키에 저장하고 DB에는 SHA-256 해시만 보관합니다. 비밀번호는 salt를 적용한 scrypt 해시로 저장합니다.

## 외부 결제 경계

주문·재고·상태 저장은 실제 백엔드에서 동작하지만 카드, 카카오페이, 네이버페이의 실승인 API는 각 PG 계약과 서버 비밀키가 있어야 연결할 수 있습니다. 현재 결제 수단 선택은 주문 레코드와 테스트 결제 완료 상태를 생성합니다. Naver 간편가입은 Supabase 기본 공급자가 아니므로 사용자 지정 OIDC 공급자 설정이 추가로 필요합니다.
