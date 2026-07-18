# TO YOU storefront

React + Vite로 만든 TO YOU 스토어입니다. 로컬에서는 SQLite API를 바로 사용할 수 있고, 배포 환경에서는 Supabase Auth/Postgres/Storage/Edge Functions와 GitHub Pages를 사용합니다.

## 로컬 실행

```bash
npm install
npm run dev
```

Supabase 환경변수가 없으면 `data/toyou.sqlite`가 자동 생성됩니다. 로컬 관리자 테스트 계정은 `test@toyou.kr` / `test1234`입니다.

Supabase에 연결해서 테스트하려면 `.env.example`을 `.env.local`로 복사한 후 Project URL과 publishable/anon key를 입력합니다.

## Supabase 준비

1. Supabase에서 새 프로젝트를 만듭니다.
2. Supabase CLI로 이 저장소를 연결하고 마이그레이션과 Edge Function을 배포합니다.

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase functions deploy catalog-tools --no-verify-jwt
```

3. Authentication의 URL Configuration에 실제 GitHub Pages 주소를 Site URL과 Redirect URL로 등록합니다.
4. Google/Kakao 간편가입을 사용할 경우 Supabase Authentication > Providers에 각 공급자의 Client ID/Secret을 등록합니다.
5. 첫 관리자 회원 가입 후 SQL Editor에서 아래 쿼리를 한 번 실행합니다.

```sql
update public.profiles
set is_admin = true
where email = '관리자이메일@example.com';
```

`service_role` 키는 프런트엔드 환경변수나 GitHub 저장소에 넣지 않습니다.

## GitHub Pages 배포

저장소 Settings > Secrets and variables > Actions에 다음 Repository secret을 등록합니다.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Settings > Pages > Build and deployment의 Source를 **GitHub Actions**로 선택한 후 `main` 브랜치에 push하면 `.github/workflows/deploy-pages.yml`이 빌드와 배포를 수행합니다. 저장소 하위 경로와 SPA 새로고침용 `404.html`은 빌드 과정에서 자동 처리됩니다.

## 검증

```bash
npm test
npm run build
```

백엔드 구조와 보안 정책의 상세 설명은 [docs/backend.md](docs/backend.md)를 참고하세요.
