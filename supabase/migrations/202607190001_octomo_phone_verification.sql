create table if not exists public.phone_verification_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null check (phone ~ '^010[0-9]{8}$'),
  code text not null,
  verification_token text,
  request_fingerprint text not null default '',
  attempts integer not null default 0 check (attempts between 0 and 30),
  expires_at timestamptz not null,
  verified_at timestamptz,
  consumed_at timestamptz,
  consumed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists phone_verification_phone_created_idx
  on public.phone_verification_challenges (phone, created_at desc);
create index if not exists phone_verification_fingerprint_created_idx
  on public.phone_verification_challenges (request_fingerprint, created_at desc);

alter table public.phone_verification_challenges enable row level security;
revoke all on public.phone_verification_challenges from anon, authenticated;
grant select, insert, update, delete on public.phone_verification_challenges to service_role;

alter table public.profiles
  add column if not exists phone_verified_at timestamptz;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  provider_name text;
  auth_provider text;
  challenge_id uuid;
  challenge_token text;
  verified_challenge public.phone_verification_challenges%rowtype;
  profile_phone text;
  profile_phone_verified_at timestamptz;
begin
  auth_provider := lower(coalesce(new.raw_app_meta_data ->> 'provider', 'email'));
  provider_name := private.normalize_provider(coalesce(new.raw_app_meta_data ->> 'provider', new.raw_user_meta_data ->> 'provider'));
  profile_phone := regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[^0-9]', '', 'g');

  if auth_provider = 'email' then
    begin
      challenge_id := (new.raw_user_meta_data ->> 'phone_verification_challenge_id')::uuid;
    exception when others then
      raise exception '휴대폰 인증 정보가 올바르지 않습니다.';
    end;

    challenge_token := coalesce(new.raw_user_meta_data ->> 'phone_verification_token', '');

    select * into verified_challenge
    from public.phone_verification_challenges
    where id = challenge_id
      and phone = profile_phone
      and verification_token = challenge_token
      and verified_at is not null
      and consumed_at is null
      and expires_at > now()
    for update;

    if not found then
      raise exception '휴대폰 인증이 만료되었거나 완료되지 않았습니다.';
    end if;

    profile_phone := verified_challenge.phone;
    profile_phone_verified_at := verified_challenge.verified_at;

    update public.phone_verification_challenges
    set consumed_at = now(), consumed_by = new.id
    where id = verified_challenge.id;
  end if;

  insert into public.profiles (
    id, email, provider, provider_subject, display_name, phone, phone_verified_at,
    postal_code, address_line1, address_line2, created_at, updated_at
  ) values (
    new.id,
    new.email,
    provider_name,
    new.raw_app_meta_data ->> 'provider_id',
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email, 'TO YOU 회원'), '@', 1)),
    profile_phone,
    profile_phone_verified_at,
    coalesce(new.raw_user_meta_data ->> 'postal_code', ''),
    coalesce(new.raw_user_meta_data ->> 'address_line1', ''),
    coalesce(new.raw_user_meta_data ->> 'address_line2', ''),
    now(),
    now()
  ) on conflict (id) do nothing;

  return new;
end;
$$;

