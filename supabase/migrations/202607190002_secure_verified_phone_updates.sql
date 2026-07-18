create or replace function private.update_my_profile(requesting_user uuid, profile_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.profiles%rowtype;
  requested_email text := lower(trim(coalesce(profile_data ->> 'email', '')));
  requested_name text := trim(coalesce(profile_data ->> 'name', ''));
  requested_phone text := regexp_replace(coalesce(profile_data ->> 'phone', ''), '[^0-9]', '', 'g');
  email_changed boolean := false;
begin
  if requesting_user is null then raise exception '로그인이 필요합니다.'; end if;
  select * into current_profile from public.profiles where id = requesting_user for update;
  if not found then raise exception '회원정보를 찾을 수 없습니다.'; end if;

  if current_profile.provider <> 'email' then
    if requested_name <> current_profile.display_name or requested_email <> coalesce(current_profile.email, '') then
      raise exception '간편가입 계정의 이름과 이메일은 가입한 서비스에서 변경해 주세요.';
    end if;
  else
    if length(requested_name) < 2 then raise exception '이름을 2자 이상 입력해 주세요.'; end if;
    if requested_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception '올바른 이메일 주소를 입력해 주세요.'; end if;
    email_changed := requested_email <> coalesce(current_profile.email, '');
  end if;

  update public.profiles set
    email = case when provider = 'email' then requested_email else email end,
    display_name = case when provider = 'email' then requested_name else display_name end,
    phone = left(requested_phone, 40),
    phone_verified_at = case
      when requested_phone = regexp_replace(coalesce(current_profile.phone, ''), '[^0-9]', '', 'g') then current_profile.phone_verified_at
      else null
    end,
    postal_code = left(trim(coalesce(profile_data ->> 'postalCode', '')), 20),
    address_line1 = left(trim(coalesce(profile_data ->> 'addressLine1', '')), 300),
    address_line2 = left(trim(coalesce(profile_data ->> 'addressLine2', '')), 300),
    updated_at = now()
  where id = requesting_user;

  return jsonb_build_object('email_changed', email_changed);
end;
$$;

