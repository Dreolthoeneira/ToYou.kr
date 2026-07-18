create or replace function private.normalize_provider(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case lower(coalesce(value, 'email'))
    when 'kakao' then 'Kakao'
    when 'google' then 'Google'
    when 'naver' then 'Naver'
    when 'custom:naver' then 'Naver'
    else 'email'
  end
$$;
