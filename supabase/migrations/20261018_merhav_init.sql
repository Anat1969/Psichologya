-- MERHAV (מרחב פנימי) — case readings through three lenses + synthesis,
-- each translated into a living space with a Midjourney prompt and an uploaded image.
-- Shared Supabase project cultura-GH: every object of this app carries the merhav prefix
-- (tables merhav_*, bucket merhav-media, functions merhav-*). Nothing else is touched.
-- No login: the public may READ. All writes go through the merhav-* edge functions
-- with the service role, which also enforce hourly limits.

create table if not exists public.merhav_cases (
  id            uuid primary key default gen_random_uuid(),
  code          text not null,
  title         text,
  body          text not null,
  answers       text,
  intake        jsonb not null default '{}'::jsonb,   -- reflection, questions, sufficient, risk, beyond_scope, facts/assessments/assumptions
  risk_level    text not null default 'none' check (risk_level in ('none','concern','acute')),
  parent_id     uuid references public.merhav_cases(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.merhav_cases is 'MERHAV-GH (מרחב פנימי): cases. Writes via merhav-analyze only.';

create table if not exists public.merhav_readings (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.merhav_cases(id) on delete cascade,
  lens          text not null check (lens in ('biographical','tzimtzum','buddhist','synthesis')),
  content       jsonb not null default '{}'::jsonb,
  distill       text,
  prompt_he     text,
  images        jsonb not null default '[]'::jsonb,    -- [{url, at}] newest last
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (case_id, lens)
);
comment on table public.merhav_readings is 'MERHAV-GH (מרחב פנימי): one reading per lens per case. Writes via merhav-analyze / merhav-upload only.';

create index if not exists merhav_cases_created_idx on public.merhav_cases (created_at desc);
create index if not exists merhav_readings_case_idx on public.merhav_readings (case_id);
create index if not exists merhav_readings_updated_idx on public.merhav_readings (updated_at desc);

alter table public.merhav_cases enable row level security;
alter table public.merhav_readings enable row level security;

create policy merhav_cases_public_read on public.merhav_cases
  for select to anon, authenticated using (true);

create policy merhav_readings_public_read on public.merhav_readings
  for select to anon, authenticated using (true);

-- Public bucket for the space images (read by direct URL; uploads via merhav-upload).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('merhav-media', 'merhav-media', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
