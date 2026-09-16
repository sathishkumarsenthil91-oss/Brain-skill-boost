-- Secure user-owned persistence for Brainboost.
-- Durable authentication is handled by Vercel HttpOnly cookie endpoints; these
-- database policies enforce per-user isolation using auth.uid().

create table if not exists public.project_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  parent_id uuid null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, parent_id, name),
  constraint project_folders_parent_same_user
    foreign key (parent_id, user_id)
    references public.project_folders(id, user_id)
    on delete cascade
);

create table if not exists public.project_folder_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  folder_id uuid not null,
  item_type text not null check (item_type in ('project','link','youtube','document','note','other')),
  item_ref text not null,
  title text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_folder_items_folder_same_user
    foreign key (folder_id, user_id)
    references public.project_folders(id, user_id)
    on delete cascade,
  unique (user_id, folder_id, item_type, item_ref)
);

create table if not exists public.user_dashboard_metrics (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  overall_readiness numeric not null default 0,
  matched_skills_count integer not null default 0,
  total_target_skills integer not null default 0,
  learning_progress numeric not null default 0,
  active_courses_count integer not null default 0,
  opportunities_count integer not null default 0,
  new_matched_count integer not null default 0,
  completed_assignments_count integer not null default 0,
  certifications_count integer not null default 0,
  metrics jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists project_folders_user_id_idx on public.project_folders(user_id);
create index if not exists project_folder_items_user_folder_idx on public.project_folder_items(user_id, folder_id);
create index if not exists project_folder_items_item_ref_idx on public.project_folder_items(user_id, item_ref);

alter table public.project_folders enable row level security;
alter table public.project_folder_items enable row level security;
alter table public.user_dashboard_metrics enable row level security;

alter table public.project_folders force row level security;
alter table public.project_folder_items force row level security;
alter table public.user_dashboard_metrics force row level security;

drop policy if exists project_folders_owner_only on public.project_folders;
create policy project_folders_owner_only on public.project_folders
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists project_folder_items_owner_only on public.project_folder_items;
create policy project_folder_items_owner_only on public.project_folder_items
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists dashboard_metrics_owner_only on public.user_dashboard_metrics;
create policy dashboard_metrics_owner_only on public.user_dashboard_metrics
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.project_folders to authenticated;
grant select, insert, update, delete on public.project_folder_items to authenticated;
grant select, insert, update, delete on public.user_dashboard_metrics to authenticated;
revoke all on public.project_folders from anon;
revoke all on public.project_folder_items from anon;
revoke all on public.user_dashboard_metrics from anon;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists project_folders_touch_updated_at on public.project_folders;
create trigger project_folders_touch_updated_at
before update on public.project_folders
for each row execute function public.touch_updated_at();

drop trigger if exists project_folder_items_touch_updated_at on public.project_folder_items;
create trigger project_folder_items_touch_updated_at
before update on public.project_folder_items
for each row execute function public.touch_updated_at();

drop trigger if exists user_dashboard_metrics_touch_updated_at on public.user_dashboard_metrics;
create trigger user_dashboard_metrics_touch_updated_at
before update on public.user_dashboard_metrics
for each row execute function public.touch_updated_at();

insert into public.user_dashboard_metrics (
  user_id, overall_readiness, matched_skills_count, total_target_skills,
  learning_progress, active_courses_count, opportunities_count,
  new_matched_count, completed_assignments_count, certifications_count
)
select id, overall_readiness, matched_skills_count, total_target_skills,
       learning_progress, active_courses_count, opportunities_count,
       new_matched_count, completed_assignments_count, certifications_count
from public.profiles
on conflict (user_id) do update set
  overall_readiness = excluded.overall_readiness,
  matched_skills_count = excluded.matched_skills_count,
  total_target_skills = excluded.total_target_skills,
  learning_progress = excluded.learning_progress,
  active_courses_count = excluded.active_courses_count,
  opportunities_count = excluded.opportunities_count,
  new_matched_count = excluded.new_matched_count,
  completed_assignments_count = excluded.completed_assignments_count,
  certifications_count = excluded.certifications_count,
  updated_at = now();

create or replace function public.sync_profile_dashboard_metrics()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_dashboard_metrics (
    user_id, overall_readiness, matched_skills_count, total_target_skills,
    learning_progress, active_courses_count, opportunities_count,
    new_matched_count, completed_assignments_count, certifications_count
  ) values (
    new.id, new.overall_readiness, new.matched_skills_count, new.total_target_skills,
    new.learning_progress, new.active_courses_count, new.opportunities_count,
    new.new_matched_count, new.completed_assignments_count, new.certifications_count
  )
  on conflict (user_id) do update set
    overall_readiness = excluded.overall_readiness,
    matched_skills_count = excluded.matched_skills_count,
    total_target_skills = excluded.total_target_skills,
    learning_progress = excluded.learning_progress,
    active_courses_count = excluded.active_courses_count,
    opportunities_count = excluded.opportunities_count,
    new_matched_count = excluded.new_matched_count,
    completed_assignments_count = excluded.completed_assignments_count,
    certifications_count = excluded.certifications_count,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_sync_dashboard_metrics on public.profiles;
create trigger profiles_sync_dashboard_metrics
after insert or update of overall_readiness, matched_skills_count, total_target_skills,
  learning_progress, active_courses_count, opportunities_count,
  new_matched_count, completed_assignments_count, certifications_count
on public.profiles
for each row execute function public.sync_profile_dashboard_metrics();

-- Tighten private learning/user state policies.
drop policy if exists "Users can manage own youtube tracks" on public.youtube_tracks;
create policy "Users can manage own youtube tracks" on public.youtube_tracks
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own video notes" on public.youtube_notes;
create policy "Users can manage own video notes" on public.youtube_notes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own watched ranges" on public.youtube_watched_ranges;
create policy "Users can manage own watched ranges" on public.youtube_watched_ranges
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own app settings" on public.app_settings;
create policy "Users can manage own app settings" on public.app_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Realtime publication for private workspace state.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='project_folders'
  ) then
    alter publication supabase_realtime add table public.project_folders;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='project_folder_items'
  ) then
    alter publication supabase_realtime add table public.project_folder_items;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='user_dashboard_metrics'
  ) then
    alter publication supabase_realtime add table public.user_dashboard_metrics;
  end if;
end $$;
