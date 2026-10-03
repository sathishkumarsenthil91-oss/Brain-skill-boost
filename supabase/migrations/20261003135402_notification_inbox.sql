create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('message','social','resource','update','ai')),
  title text not null,
  body text not null default '',
  view text not null default 'connectivity',
  peer_id uuid,
  source_key text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (user_id, source_key)
);
create index notifications_user_created on public.notifications(user_id, created_at desc);
create index notifications_user_unread on public.notifications(user_id) where read_at is null;
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy notifications_own_select on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy notifications_own_read on public.notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create schema if not exists notification_internal;
revoke all on schema notification_internal from public, anon, authenticated;
-- Only database triggers may generate notifications for another account.
create function notification_internal.capture_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  recipient uuid; actor uuid; label text; target_view text := 'connectivity'; category text := 'social';
  heading text; details text := ''; source text; row_data jsonb := to_jsonb(new);
begin
  source := tg_table_name || ':' || coalesce(row_data->>'id', row_data->>'user_id') || ':' || coalesce(row_data->>'operation','');
  if tg_table_name = 'network_messages' then
    if tg_op = 'UPDATE' then
      if new.is_read and not old.is_read then
        update public.notifications set read_at = now() where user_id = new.receiver_id and source_key = source;
      end if;
      return new;
    end if;
    recipient := new.receiver_id; actor := new.sender_id; category := 'message'; heading := 'New message'; details := 'Open chat to view the message.';
  elsif tg_table_name = 'network_follows' then
    if tg_op = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
    recipient := new.following_id; actor := new.follower_id;
    heading := case when new.status = 'pending' then 'New follow request' else 'New follower' end;
  elsif tg_table_name in ('network_post_likes','network_post_comments') then
    select author_id into recipient from public.network_posts where id = new.post_id;
    actor := coalesce(row_data->>'user_id', row_data->>'author_id')::uuid;
    heading := case when tg_table_name = 'network_post_likes' then 'Someone liked your post' else 'New comment on your post' end;
  elsif tg_table_name = 'library_access_requests' then
    category := 'resource';
    if tg_op = 'INSERT' then recipient := new.target_user_id; actor := new.requester_id; heading := 'Library access requested';
    elsif new.status is distinct from old.status then recipient := new.requester_id; actor := new.target_user_id; heading := 'Library request ' || new.status; source := source || ':' || new.status;
    else return new; end if;
  elsif tg_table_name = 'ai_chat_messages' then
    if new.role not in ('assistant','model') then return new; end if;
    recipient := new.user_id; category := 'ai'; target_view := 'nebula'; heading := 'Your AI reply is ready'; details := 'Open AI Chatbot to view the reply.';
  elsif tg_table_name = 'user_api_results' then
    recipient := new.user_id; category := 'ai'; heading := 'Your AI result is ready'; target_view := 'ai-recommendations';
    source := source || ':' || new.updated_at::text;
  elsif tg_table_name = 'user_library_items' then
    category := 'resource'; heading := 'New learning resource'; details := new.title;
    insert into public.notifications(user_id,kind,title,body,view,peer_id,source_key)
    select f.follower_id, category, heading, details, target_view, new.user_id, source
    from public.network_follows f join public.profiles p on p.id = new.user_id
    where f.following_id = new.user_id and f.status = 'approved' and f.follower_id <> new.user_id
      and (not (coalesce(p.is_private_account,false) or coalesce(p.is_library_private,false)) or exists (select 1 from public.library_access_requests r where r.requester_id=f.follower_id and r.target_user_id=new.user_id and r.status='approved'))
    on conflict do nothing;
    return new;
  elsif tg_table_name = 'network_posts' then
    insert into public.notifications(user_id,kind,title,body,view,peer_id,source_key)
    select follower_id,'update','New post','Someone you follow shared a new post.','connectivity',new.author_id,source
    from public.network_follows where following_id=new.author_id and status='approved' and follower_id<>new.author_id
    on conflict do nothing;
    return new;
  else
    if tg_op = 'UPDATE' and (row_data - array['updated_at','enrolled_count','attendees_count','likes_count','rating']) = (to_jsonb(old) - array['updated_at','enrolled_count','attendees_count','likes_count','rating']) then return new; end if;
    category := 'update'; heading := case when tg_op='INSERT' then 'New ' else 'Updated ' end || replace(tg_table_name,'_',' ');
    details := coalesce(row_data->>'title',row_data->>'name','');
    target_view := case tg_table_name when 'industry_tools' then 'industry-tools' when 'opportunities' then 'opportunities' else tg_table_name end;
    source := source || ':' || coalesce(row_data->>'updated_at', row_data->>'created_at',now()::text);
    insert into public.notifications(user_id,kind,title,body,view,source_key)
    select id,category,heading,details,target_view,source from public.profiles on conflict do nothing;
    return new;
  end if;
  if recipient is null or recipient = actor then return new; end if;
  if actor is not null then
    select name into label from public.profiles where id = actor;
    details := coalesce(label,'A member') || case category when 'message' then ' sent you a message.' else ' · ' || heading end;
  end if;
  insert into public.notifications(user_id,kind,title,body,view,peer_id,source_key)
  values(recipient,category,heading,details,target_view,actor,source) on conflict do nothing;
  return new;
end $$;
revoke all on function notification_internal.capture_event() from public, anon, authenticated;
create trigger notification_message after insert or update of is_read on public.network_messages for each row execute function notification_internal.capture_event();
create trigger notification_follow after insert or update of status on public.network_follows for each row execute function notification_internal.capture_event();
create trigger notification_like after insert on public.network_post_likes for each row execute function notification_internal.capture_event();
create trigger notification_comment after insert on public.network_post_comments for each row execute function notification_internal.capture_event();
create trigger notification_post after insert on public.network_posts for each row execute function notification_internal.capture_event();
create trigger notification_library_request after insert or update of status on public.library_access_requests for each row execute function notification_internal.capture_event();
create trigger notification_resource after insert on public.user_library_items for each row execute function notification_internal.capture_event();
create trigger notification_ai_reply after insert on public.ai_chat_messages for each row execute function notification_internal.capture_event();
create trigger notification_ai_result after insert or update on public.user_api_results for each row execute function notification_internal.capture_event();
do $$ declare tab text; begin
  foreach tab in array array['courses','industry_tools','webinars','assignments','opportunities'] loop
    execute format('create trigger notification_catalog after insert or update on public.%I for each row execute function notification_internal.capture_event()',tab);
  end loop;
end $$;
alter publication supabase_realtime add table public.notifications;
