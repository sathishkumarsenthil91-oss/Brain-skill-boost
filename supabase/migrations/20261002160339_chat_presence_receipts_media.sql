alter table public.profiles add column if not exists last_seen_at timestamptz;
alter table public.profiles add column if not exists online_at timestamptz;
alter table public.network_messages add column if not exists delivered_at timestamptz;
alter table public.network_messages add column if not exists read_at timestamptz;
alter table public.network_messages add column if not exists attachment_path text;

create or replace function public.guard_network_receipts() returns trigger language plpgsql set search_path=public as $$
begin
  if auth.uid() is not null then
    if new.sender_id is distinct from old.sender_id or new.receiver_id is distinct from old.receiver_id or new.content is distinct from old.content or new.conversation_id is distinct from old.conversation_id or new.attachment_path is distinct from old.attachment_path or new.created_at is distinct from old.created_at then
      raise exception 'Only message receipts may be updated';
    end if;
    if old.is_read and not new.is_read then raise exception 'Read receipt cannot be removed'; end if;
    new.delivered_at := coalesce(old.delivered_at, case when new.delivered_at is not null or new.is_read then now() end);
    new.read_at := coalesce(old.read_at, case when new.is_read then now() end);
  end if;
  return new;
end $$;
create trigger guard_network_receipts before update on public.network_messages for each row execute function public.guard_network_receipts();

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('chat-photos','chat-photos',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
create policy "Chat photo owner uploads" on storage.objects for insert to authenticated with check (bucket_id='chat-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Chat participants view photos" on storage.objects for select to authenticated using (bucket_id='chat-photos' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.network_messages m where m.attachment_path=name and (m.sender_id=auth.uid() or m.receiver_id=auth.uid()))));
create policy "Chat photo owner removes" on storage.objects for delete to authenticated using (bucket_id='chat-photos' and (storage.foldername(name))[1]=auth.uid()::text);
