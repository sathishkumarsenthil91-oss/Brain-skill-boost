-- Additive integration changes for the existing hosted schema.
CREATE TABLE IF NOT EXISTS public.user_api_results (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  operation text NOT NULL,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, operation)
);
ALTER TABLE public.user_api_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_api_results FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_api_results TO authenticated;
DROP POLICY IF EXISTS api_results_select_own ON public.user_api_results;
CREATE POLICY api_results_select_own ON public.user_api_results FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS api_results_insert_own ON public.user_api_results;
CREATE POLICY api_results_insert_own ON public.user_api_results FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS api_results_update_own ON public.user_api_results;
CREATE POLICY api_results_update_own ON public.user_api_results FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS api_results_delete_own ON public.user_api_results;
CREATE POLICY api_results_delete_own ON public.user_api_results FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

ALTER TABLE public.youtube_tracks ADD COLUMN IF NOT EXISTS watched_ranges jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.youtube_tracks ADD COLUMN IF NOT EXISTS learning_record jsonb;
ALTER TABLE public.course_enrollments ADD COLUMN IF NOT EXISTS completed_lessons jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.ai_chat_messages DROP CONSTRAINT IF EXISTS ai_chat_messages_role_check;
ALTER TABLE public.ai_chat_messages ADD CONSTRAINT ai_chat_messages_role_check CHECK (role IN ('user','model','assistant','system'));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'network_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.network_messages;
  END IF;
END $$;
