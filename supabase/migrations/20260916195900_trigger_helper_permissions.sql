-- Trigger maintenance helpers should execute through their triggers, not direct API calls.
revoke execute on function public.refresh_network_follow_counts() from public, anon, authenticated;
revoke execute on function public.refresh_network_post_comment_count() from public, anon, authenticated;
revoke execute on function public.refresh_network_post_like_count() from public, anon, authenticated;
revoke execute on function public.sync_profile_dashboard_metrics() from public, anon, authenticated;
