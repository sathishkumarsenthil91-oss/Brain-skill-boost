-- Persist the fields collected by Connectivity setup under existing owner RLS.
alter table public.profiles add column if not exists skills text[] not null default '{}';
alter table public.profiles add column if not exists interests text[] not null default '{}';
