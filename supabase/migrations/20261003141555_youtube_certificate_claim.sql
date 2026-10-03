-- Claims are checked against the signed-in learner's saved track and serialized per track.
create function public.claim_youtube_certificate(p_video_id text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare t public.youtube_tracks; c public.generated_certificates; p public.profiles;
begin
  if auth.uid() is null then raise exception 'Please sign in to claim a certificate'; end if;
  select * into t from public.youtube_tracks where user_id=auth.uid() and video_id=p_video_id for update;
  if not found then raise exception 'Learning track not found'; end if;
  if t.duration_seconds <= 0 or t.verified_watched_seconds < t.duration_seconds then
    raise exception 'Finish 100%% of the saved watch time before claiming';
  end if;
  select * into c from public.generated_certificates where user_id=auth.uid() and type='youtube_track' and item_id in (t.video_id,t.id::text) order by created_at limit 1;
  if found then return to_jsonb(c); end if;
  select * into p from public.profiles where id=auth.uid();
  insert into public.generated_certificates(serial_id,user_id,type,item_id,title,recipient_name,recipient_email,instructor_or_speaker,organization,duration_formatted,completion_percentage,watch_time_seconds,required_watch_time_seconds,skills_validated,legal_disclaimer,verification_url)
  values('BB-YT-'||t.id,auth.uid(),'youtube_track',t.video_id,t.title,p.name,p.email,t.channel,'Brain Boost',t.duration_formatted,100,t.duration_seconds,t.duration_seconds,'{}',
    'Self-directed learning completion record issued by Brain Boost. Not issued or endorsed by YouTube, Google, or the video creator.',t.video_url)
  returning * into c;
  return to_jsonb(c);
end $$;
revoke all on function public.claim_youtube_certificate(text) from public,anon;
grant execute on function public.claim_youtube_certificate(text) to authenticated;

create function notification_internal.guard_youtube_certificate() returns trigger
language plpgsql security invoker set search_path='' as $$
declare t public.youtube_tracks;
begin
  if new.type <> 'youtube_track' then return new; end if;
  select * into t from public.youtube_tracks where user_id=new.user_id and (video_id=new.item_id or id::text=new.item_id) limit 1;
  if not found or t.duration_seconds <= 0 or t.verified_watched_seconds < t.duration_seconds then
    raise exception 'YouTube certificate remains locked until full saved watch completion';
  end if;
  new.completion_percentage:=100; new.watch_time_seconds:=t.duration_seconds; new.required_watch_time_seconds:=t.duration_seconds;
  new.title:=t.title; new.instructor_or_speaker:=t.channel;
  return new;
end $$;
revoke all on function notification_internal.guard_youtube_certificate() from public,anon,authenticated;
create trigger guard_youtube_certificate before insert or update on public.generated_certificates for each row execute function notification_internal.guard_youtube_certificate();
