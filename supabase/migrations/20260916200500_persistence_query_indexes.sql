-- Cover common user-owned persistence queries and FK lookups.
create index if not exists project_folders_parent_user_idx on public.project_folders(parent_id, user_id);
create index if not exists project_folder_items_folder_user_idx on public.project_folder_items(folder_id, user_id);
create index if not exists youtube_tracks_user_last_watched_idx on public.youtube_tracks(user_id, last_watched desc);
create index if not exists youtube_notes_user_track_idx on public.youtube_notes(user_id, track_id);
create index if not exists youtube_watched_ranges_user_track_idx on public.youtube_watched_ranges(user_id, track_id);
create index if not exists user_projects_user_id_idx on public.user_projects(user_id);
create index if not exists network_messages_sender_created_idx on public.network_messages(sender_id, created_at desc);
create index if not exists network_conversations_participant_two_idx on public.network_conversations(participant_two_id);
