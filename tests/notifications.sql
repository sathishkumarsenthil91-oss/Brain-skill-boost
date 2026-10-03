begin;
insert into auth.users(id,email,raw_user_meta_data) values
('d503a010-0001-4000-8000-000000000001','notification_test_a@example.com','{"name":"Notification A"}'),
('d503a010-0001-4000-8000-000000000002','notification_test_b@example.com','{"name":"Notification B"}');
insert into public.profiles(id,email,name) values
('d503a010-0001-4000-8000-000000000001','notification_test_a@example.com','Notification A'),
('d503a010-0001-4000-8000-000000000002','notification_test_b@example.com','Notification B') on conflict(id) do update set name=excluded.name;
insert into public.network_conversations(id,participant_one_id,participant_two_id) values ('d503a010-0001-4000-8000-000000000003','d503a010-0001-4000-8000-000000000001','d503a010-0001-4000-8000-000000000002');
insert into public.network_messages(id,conversation_id,sender_id,receiver_id,content) values ('d503a010-0001-4000-8000-000000000004','d503a010-0001-4000-8000-000000000003','d503a010-0001-4000-8000-000000000001','d503a010-0001-4000-8000-000000000002','Notification integration test');
insert into public.network_follows(follower_id,following_id,status) values ('d503a010-0001-4000-8000-000000000002','d503a010-0001-4000-8000-000000000001','approved');
insert into public.user_library_items(user_id,type,title,provider_or_channel,current_lesson_or_chapter,total_duration_or_modules) values ('d503a010-0001-4000-8000-000000000001','lab','Notification test resource','Test','Chapter 1','1 module');
insert into public.ai_chat_sessions(id,user_id) values ('d503a010-0001-4000-8000-000000000005','d503a010-0001-4000-8000-000000000002');
insert into public.ai_chat_messages(session_id,user_id,role,content) values ('d503a010-0001-4000-8000-000000000005','d503a010-0001-4000-8000-000000000002','model','Notification test reply');
do $$ begin
 if (select count(*) from public.notifications where user_id='d503a010-0001-4000-8000-000000000002' and kind in ('message','resource','ai')) <> 3 then raise exception 'Notification sources failed'; end if;
end $$;
insert into public.network_posts(id,author_id,content) values ('d503a010-0001-4000-8000-000000000006','d503a010-0001-4000-8000-000000000001','Notification test post');
insert into public.network_post_likes(post_id,user_id) values ('d503a010-0001-4000-8000-000000000006','d503a010-0001-4000-8000-000000000002');
insert into public.network_post_comments(post_id,author_id,content) values ('d503a010-0001-4000-8000-000000000006','d503a010-0001-4000-8000-000000000002','Test comment');
update public.profiles set is_library_private=true where id='d503a010-0001-4000-8000-000000000001';
insert into public.user_library_items(user_id,type,title,provider_or_channel,current_lesson_or_chapter,total_duration_or_modules) values ('d503a010-0001-4000-8000-000000000001','lab','Private resource','Test','Chapter 1','1 module');
insert into public.courses(title,provider,category,level,duration,description,instructor_name,instructor_role,instructor_avatar) values ('Notification test course','Test','Frontend','Beginner','1 hour','Test','Test','Instructor','');
do $$ begin
 if (select count(*) from public.notifications where user_id='d503a010-0001-4000-8000-000000000001' and kind='social') <> 3 then raise exception 'Social sources failed'; end if;
 if (select count(*) from public.notifications where user_id='d503a010-0001-4000-8000-000000000002' and kind='resource') <> 1 then raise exception 'Private resource leaked'; end if;
 if not exists (select 1 from public.notifications where user_id='d503a010-0001-4000-8000-000000000002' and kind='update') then raise exception 'Catalog update failed'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d503a010-0001-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.notifications where user_id <> 'd503a010-0001-4000-8000-000000000002') then raise exception 'Inbox privacy failed'; end if;
 update public.network_messages set is_read=true where id='d503a010-0001-4000-8000-000000000004';
 if exists(select 1 from public.notifications where kind='message' and read_at is null) then raise exception 'Chat read did not clear notification'; end if;
 update public.notifications set read_at=now() where user_id='d503a010-0001-4000-8000-000000000002';
 if exists(select 1 from public.notifications where read_at is null) then raise exception 'Read persistence failed'; end if;
 begin
  update public.notifications set title='tampered';
  raise exception 'Content update unexpectedly allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
select 'PASS message, resource, AI, ownership RLS and read persistence; fixture data rolled back' as result;
rollback;
