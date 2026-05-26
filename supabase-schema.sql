-- Run this entire file in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- Profiles table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  face_image_url text,
  face_descriptor float8[],
  liveness_verified boolean default false,
  webauthn_credential_id text,
  webauthn_public_key text,
  webauthn_counter integer default 0,
  webauthn_transports text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Documents table
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  content text not null,
  status text default 'pending' check (status in ('pending', 'signed')),
  signed_at timestamptz,
  signature_face_url text,
  signature_method text check (signature_method in ('face', 'fingerprint', 'both')),
  created_at timestamptz default now()
);

alter table public.documents enable row level security;

create policy "Users can view own documents"
  on public.documents for select
  using (auth.uid() = user_id);

create policy "Users can insert own documents"
  on public.documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own documents"
  on public.documents for update
  using (auth.uid() = user_id);

-- WebAuthn challenges table (short-lived)
create table if not exists public.webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  challenge text not null,
  type text not null check (type in ('registration', 'authentication')),
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '5 minutes')
);

alter table public.webauthn_challenges enable row level security;

-- Service role manages challenges (no user RLS needed)
create policy "Service role manages challenges"
  on public.webauthn_challenges
  using (true)
  with check (true);

-- Storage bucket for face images (private)
insert into storage.buckets (id, name, public)
values ('faces', 'faces', false)
on conflict (id) do nothing;

create policy "Users upload own face images"
  on storage.objects for insert
  with check (bucket_id = 'faces' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users view own face images"
  on storage.objects for select
  using (bucket_id = 'faces' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete own face images"
  on storage.objects for delete
  using (bucket_id = 'faces' and auth.uid()::text = (storage.foldername(name))[1]);
