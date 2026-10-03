begin;
insert into auth.users(id,email,raw_user_meta_data) values ('d503c010-0001-4000-8000-000000000001','certificate_test@example.com','{"name":"Certificate Test"}');
insert into public.profiles(id,email,name) values ('d503c010-0001-4000-8000-000000000001','certificate_test@example.com','Certificate Test') on conflict(id) do nothing;
insert into public.youtube_tracks(user_id,video_id,video_url,title,channel,thumbnail,duration_seconds,duration_formatted,verified_watched_seconds,completion_percentage)
values ('d503c010-0001-4000-8000-000000000001','cert-test01','https://www.youtube.com/watch?v=cert-test01','Certificate Test Video','Test','',100,'1m 40s',85,85);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d503c010-0001-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare first_claim jsonb; second_claim jsonb; begin
 begin
   perform public.claim_youtube_certificate('cert-test01');
   raise exception 'Incomplete track wrongly claimed';
 exception when raise_exception then if sqlerrm='Incomplete track wrongly claimed' then raise; end if; end;
 update public.youtube_tracks set verified_watched_seconds=99,completion_percentage=100 where video_id='cert-test01';
 begin
   perform public.claim_youtube_certificate('cert-test01');
   raise exception 'Rounded progress wrongly claimed';
 exception when raise_exception then if sqlerrm='Rounded progress wrongly claimed' then raise; end if; end;
 update public.youtube_tracks set verified_watched_seconds=100,completion_percentage=100 where video_id='cert-test01';
 first_claim:=public.claim_youtube_certificate('cert-test01'); second_claim:=public.claim_youtube_certificate('cert-test01');
 if first_claim->>'id' <> second_claim->>'id' then raise exception 'Claim created duplicate'; end if;
 if first_claim->>'recipient_name' <> 'Certificate Test' then raise exception 'Wrong recipient'; end if;
 if (select count(*) from public.generated_certificates where type='youtube_track' and item_id='cert-test01') <> 1 then raise exception 'Claim not persisted'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"d503c010-0001-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
 begin
   perform public.claim_youtube_certificate('cert-test01');
   raise exception 'Another account claimed a certificate';
 exception when raise_exception then if sqlerrm='Another account claimed a certificate' then raise; end if; end;
end $$;
reset role;
select 'PASS locked until full watch time, persisted claim, duplicate protection and account ownership; all fixtures rolled back' as result;
rollback;
