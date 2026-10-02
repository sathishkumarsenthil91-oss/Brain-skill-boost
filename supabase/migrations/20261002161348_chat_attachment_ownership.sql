alter table public.network_messages add constraint chat_photo_sender_ownership check (attachment_path is null or split_part(attachment_path,'/',1)=sender_id::text);
create or replace function public.initialize_chat_receipts() returns trigger language plpgsql set search_path=public as $$ begin new.is_read := false; new.delivered_at := null; new.read_at := null; return new; end $$;
create trigger initialize_chat_receipts before insert on public.network_messages for each row execute function public.initialize_chat_receipts();
