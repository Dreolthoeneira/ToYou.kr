# TO YOU 소셜 로그인 운영 설정

프런트엔드는 Google, Kakao, Naver 모두 Supabase Auth 세션을 사용합니다. 비밀키는 저장소나 `VITE_` 환경 변수에 넣지 않고 각 공급자 콘솔과 Supabase Dashboard에만 저장합니다.

## 공통 주소

- 서비스 URL: `https://toyou.kr`
- 로컬 URL: `http://localhost:5173`
- Supabase OAuth callback: `https://oyrqdoanvdvjtqzpemeg.supabase.co/auth/v1/callback`

## Google

1. Google Auth Platform에서 웹 애플리케이션 OAuth 클라이언트를 만듭니다.
2. Authorized JavaScript origins에 `https://toyou.kr`과 `http://localhost:5173`을 등록합니다.
3. Authorized redirect URIs에 공통 Supabase OAuth callback을 등록합니다.
4. Supabase Dashboard > Authentication > Providers > Google에서 Enabled를 켜고 Client ID/Secret을 저장합니다.
5. Google Data Access에는 `openid`, `userinfo.email`, `userinfo.profile`만 요청합니다.

## Kakao

1. Kakao Developers에서 `TO YOU` 앱과 Web 플랫폼 `https://toyou.kr`을 등록합니다.
2. 카카오 로그인 사용 설정을 켜고 Redirect URI에 공통 Supabase OAuth callback을 등록합니다.
3. 동의 항목에서 닉네임과 프로필 사진을 설정하고, 이메일을 사용할 수 있다면 `account_email`도 설정합니다.
4. REST API 키와 활성화한 Client Secret을 Supabase Dashboard > Authentication > Providers > Kakao에 저장합니다.
5. 이메일 제공 권한을 받지 못한 앱만 Supabase의 `Allow users without an email`을 켭니다.

## Naver

1. Naver Developers에서 애플리케이션을 만들고 사용 API로 `네이버 로그인`을 선택합니다.
2. 서비스 URL에 `https://toyou.kr`, Callback URL에 공통 Supabase OAuth callback을 등록합니다.
3. 회원이름, 별명, 프로필 이미지, 이메일, 휴대전화번호 중 실제로 사용할 항목만 선택합니다. 이 스토어는 이메일을 회원 식별에 사용하므로 이메일을 필수 제공 항목으로 설정합니다.
4. 먼저 `naver-userinfo` Edge Function을 배포합니다.
5. Supabase Dashboard > Authentication > Providers > New Provider > Manual configuration에서 아래처럼 만듭니다.

| 항목 | 값 |
| --- | --- |
| Type | OAuth2 |
| Identifier | `custom:naver` |
| Name | `Naver` |
| Client ID / Secret | Naver Developers에서 발급한 값 |
| Authorization URL | `https://nid.naver.com/oauth2.0/authorize` |
| Token URL | `https://nid.naver.com/oauth2.0/token` |
| UserInfo URL | `https://oyrqdoanvdvjtqzpemeg.supabase.co/functions/v1/naver-userinfo` |
| PKCE | Off (Naver Login API가 PKCE를 지원하지 않음) |
| Email optional | Off |

네이버 응답은 프로필이 `response` 안에 중첩되어 있으므로 `naver-userinfo`가 이를 Supabase 표준 프로필 형식으로 변환합니다.

## 완료 확인

각 버튼을 눌러 공급자 동의 화면이 열리는지, 돌아온 뒤 회원 이름이 표시되는지, 프로필의 이름/이메일이 잠겨 있는지, 장바구니가 로그인한 계정에 저장되는지 확인합니다.
