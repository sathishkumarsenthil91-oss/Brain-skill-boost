-- ============================================================================
-- SUPABASE POSTGRESQL PRODUCTION SCHEMA
-- Application: Industry Readiness & Career Development Platform
-- Complete, Executable Script for Supabase SQL Editor
-- ============================================================================

-- 0. EXTENSIONS & PREREQUISITES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. HELPER FUNCTIONS & TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. USER PROFILES & RESUME DATA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  user_id_handle TEXT UNIQUE, -- e.g. '@sathish_dev'
  username TEXT UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  cover_url TEXT,
  phone TEXT,
  headline TEXT DEFAULT 'Full Stack Developer & Student Candidate',
  bio TEXT DEFAULT '',
  college TEXT DEFAULT '',
  degree TEXT DEFAULT '',
  grad_year TEXT DEFAULT '',
  gpa TEXT DEFAULT '',
  location TEXT DEFAULT 'Remote',
  target_role TEXT DEFAULT 'Full Stack Engineer',
  github_url TEXT DEFAULT '',
  linkedin_url TEXT DEFAULT '',
  portfolio_url TEXT DEFAULT '',
  resume_file_name TEXT,
  resume_url TEXT,
  overall_readiness NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  matched_skills_count INTEGER NOT NULL DEFAULT 0,
  total_target_skills INTEGER NOT NULL DEFAULT 25,
  learning_progress NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  active_courses_count INTEGER NOT NULL DEFAULT 0,
  opportunities_count INTEGER NOT NULL DEFAULT 0,
  new_matched_count INTEGER NOT NULL DEFAULT 0,
  completed_assignments_count INTEGER NOT NULL DEFAULT 0,
  certifications_count INTEGER NOT NULL DEFAULT 0,
  followers_count INTEGER NOT NULL DEFAULT 0,
  following_count INTEGER NOT NULL DEFAULT 0,
  is_private_account BOOLEAN NOT NULL DEFAULT FALSE,
  is_library_private BOOLEAN NOT NULL DEFAULT FALSE,
  is_recruiter BOOLEAN NOT NULL DEFAULT FALSE,
  is_mentor BOOLEAN NOT NULL DEFAULT FALSE,
  is_alumni BOOLEAN NOT NULL DEFAULT FALSE,
  online_status TEXT NOT NULL DEFAULT 'online' CHECK (online_status IN ('online', 'idle', 'offline')),
  connectivity_setup_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.user_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  github_url TEXT,
  demo_url TEXT,
  date TEXT,
  stars INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_user_projects_updated_at ON public.user_projects;
CREATE TRIGGER set_user_projects_updated_at
BEFORE UPDATE ON public.user_projects
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.user_internships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  company TEXT NOT NULL,
  period TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_user_internships_updated_at ON public.user_internships;
CREATE TRIGGER set_user_internships_updated_at
BEFORE UPDATE ON public.user_internships
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  issuer TEXT NOT NULL,
  date TEXT NOT NULL,
  badge TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_user_achievements_updated_at ON public.user_achievements;
CREATE TRIGGER set_user_achievements_updated_at
BEFORE UPDATE ON public.user_achievements
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, interest_name)
);

-- ============================================================================
-- 3. SKILLS, GAP METRICS & INDUSTRY TOOLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('foundation', 'gap', 'upcoming', 'advanced', 'tool')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES public.skills(id) ON DELETE SET NULL,
  skill_name TEXT NOT NULL,
  proficiency INTEGER NOT NULL DEFAULT 0 CHECK (proficiency BETWEEN 0 AND 100),
  category TEXT NOT NULL DEFAULT 'foundation' CHECK (category IN ('foundation', 'gap', 'upcoming')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  experience TEXT,
  last_assessed TIMESTAMPTZ,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, skill_name)
);

DROP TRIGGER IF EXISTS set_user_skills_updated_at ON public.user_skills;
CREATE TRIGGER set_user_skills_updated_at
BEFORE UPDATE ON public.user_skills
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.skill_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  current_level INTEGER NOT NULL DEFAULT 0 CHECK (current_level BETWEEN 0 AND 100),
  required_level INTEGER NOT NULL DEFAULT 80 CHECK (required_level BETWEEN 0 AND 100),
  gap_percentage INTEGER NOT NULL DEFAULT 0,
  urgency TEXT NOT NULL DEFAULT 'Moderate' CHECK (urgency IN ('Critical', 'Moderate', 'Good')),
  suggested_action TEXT,
  estimated_hours INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, skill_name)
);

DROP TRIGGER IF EXISTS set_skill_gaps_updated_at ON public.skill_gaps;
CREATE TRIGGER set_skill_gaps_updated_at
BEFORE UPDATE ON public.skill_gaps
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.industry_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Frontend', 'Backend', 'DevOps & Cloud', 'Testing & QA', 'Design & Collab')),
  proficiency_required TEXT NOT NULL CHECK (proficiency_required IN ('Essential', 'Recommended', 'Bonus')),
  icon TEXT NOT NULL,
  description TEXT NOT NULL,
  popular_for TEXT[] DEFAULT '{}',
  cheat_sheet_url TEXT,
  quick_tip TEXT NOT NULL,
  market_demand INTEGER NOT NULL DEFAULT 80,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_industry_tool_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.industry_tools(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Mastered', 'In Progress', 'Not Started')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, tool_id)
);

-- ============================================================================
-- 4. COURSES, MODULES, LESSONS & ENROLLMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  provider TEXT NOT NULL,
  category TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),
  duration TEXT NOT NULL,
  modules_count INTEGER NOT NULL DEFAULT 1,
  rating NUMERIC(3,2) NOT NULL DEFAULT 4.8,
  enrolled_count INTEGER NOT NULL DEFAULT 0,
  cover_image TEXT,
  thumbnail TEXT,
  skills_taught TEXT[] DEFAULT '{}',
  description TEXT NOT NULL,
  instructor_name TEXT NOT NULL,
  instructor_role TEXT NOT NULL,
  instructor_avatar TEXT NOT NULL,
  instructor_company TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_courses_updated_at ON public.courses;
CREATE TRIGGER set_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'lab', 'quiz', 'reading')),
  video_url TEXT,
  video_id TEXT,
  summary TEXT,
  code_snippet TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.course_lesson_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

-- ============================================================================
-- 5. YOUTUBE LEARNING TRACKS, TIME VERIFICATION & UNOFFICIAL RECORDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.youtube_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  video_url TEXT NOT NULL,
  title TEXT NOT NULL,
  channel TEXT NOT NULL,
  channel_url TEXT,
  thumbnail TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  duration_formatted TEXT NOT NULL DEFAULT '0:00',
  verified_watched_seconds INTEGER NOT NULL DEFAULT 0,
  current_time NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  completion_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  last_watched TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_added TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ai_summary JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, video_id)
);

DROP TRIGGER IF EXISTS set_youtube_tracks_updated_at ON public.youtube_tracks;
CREATE TRIGGER set_youtube_tracks_updated_at
BEFORE UPDATE ON public.youtube_tracks
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.youtube_watched_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.youtube_tracks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_seconds NUMERIC(10,2) NOT NULL,
  end_seconds NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.youtube_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.youtube_tracks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  timestamp_seconds INTEGER NOT NULL DEFAULT 0,
  timestamp_formatted TEXT NOT NULL DEFAULT '00:00',
  note_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id TEXT UNIQUE NOT NULL, -- e.g. "IS-REC-YTL-2026-X7K9P"
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  video_title TEXT NOT NULL,
  channel TEXT NOT NULL,
  video_id TEXT NOT NULL,
  video_url TEXT NOT NULL,
  verified_watch_seconds INTEGER NOT NULL,
  verified_watch_formatted TEXT NOT NULL,
  completion_percentage NUMERIC(5,2) NOT NULL,
  completion_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disclaimer TEXT NOT NULL DEFAULT 'This unofficial learning record validates self-paced video watch time and is not an accredited university degree or formal license.',
  skills_validated TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. CERTIFICATES & CERTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  issuer TEXT NOT NULL,
  badge_url TEXT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Foundational', 'Associate', 'Professional')),
  market_value TEXT NOT NULL CHECK (market_value IN ('Very High', 'High', 'Medium')),
  exam_code TEXT,
  skills_validated TEXT[] DEFAULT '{}',
  voucher_discount TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  certification_id UUID NOT NULL REFERENCES public.certifications(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Earned', 'In Progress', 'Planned')),
  target_date TEXT,
  prep_progress INTEGER DEFAULT 0 CHECK (prep_progress BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, certification_id)
);

CREATE TABLE IF NOT EXISTS public.generated_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_id TEXT UNIQUE NOT NULL, -- e.g. "IS-CERT-2026-CRS-89214"
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('course', 'webinar', 'youtube_track', 'specialization')),
  item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  instructor_or_speaker TEXT NOT NULL,
  instructor_role TEXT,
  organization TEXT NOT NULL,
  issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_formatted TEXT NOT NULL,
  completion_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  watch_time_seconds INTEGER NOT NULL DEFAULT 0,
  required_watch_time_seconds INTEGER NOT NULL DEFAULT 0,
  watch_time_formatted TEXT,
  skills_validated TEXT[] DEFAULT '{}',
  legal_disclaimer TEXT NOT NULL,
  verification_url TEXT NOT NULL,
  verification_badge TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. WEBINARS & ATTENDANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webinars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  speaker_name TEXT NOT NULL,
  speaker_role TEXT NOT NULL,
  speaker_company TEXT NOT NULL,
  speaker_avatar TEXT NOT NULL,
  date_time TIMESTAMPTZ NOT NULL,
  duration TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('Upcoming', 'Live', 'Recorded')),
  attendees_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  youtube_url TEXT,
  youtube_video_id TEXT,
  zoom_meeting_url TEXT,
  zoom_meeting_id TEXT,
  zoom_passcode TEXT,
  key_takeaways TEXT[] DEFAULT '{}',
  category TEXT,
  description TEXT,
  thumbnail TEXT,
  certificate_eligible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_webinars_updated_at ON public.webinars;
CREATE TRIGGER set_webinars_updated_at
BEFORE UPDATE ON public.webinars
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.webinar_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  webinar_id UUID NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  has_attended BOOLEAN NOT NULL DEFAULT FALSE,
  certificate_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_certificate_id UUID REFERENCES public.generated_certificates(id) ON DELETE SET NULL,
  UNIQUE (user_id, webinar_id)
);

CREATE TABLE IF NOT EXISTS public.webinar_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  webinar_id UUID NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, webinar_id)
);

-- ============================================================================
-- 8. ASSIGNMENTS & EVALUATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  course_or_topic TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  due_date TIMESTAMPTZ NOT NULL,
  max_score INTEGER NOT NULL DEFAULT 100,
  skills_tested TEXT[] DEFAULT '{}',
  description TEXT NOT NULL,
  deliverables TEXT[] DEFAULT '{}',
  rubric_criteria TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'In Progress' CHECK (status IN ('Pending', 'In Progress', 'Submitted', 'Graded', 'Overdue')),
  submission_url TEXT,
  github_repo_url TEXT,
  notes TEXT,
  score INTEGER CHECK (score >= 0),
  feedback TEXT,
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, user_id)
);

DROP TRIGGER IF EXISTS set_assignment_submissions_updated_at ON public.assignment_submissions;
CREATE TRIGGER set_assignment_submissions_updated_at
BEFORE UPDATE ON public.assignment_submissions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 9. ROADMAPS & LEARNING PATHS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_title TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  total_nodes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.roadmap_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES public.roadmaps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  subtopics TEXT[] DEFAULT '{}',
  recommended_resources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roadmap_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES public.roadmap_nodes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('completed', 'current', 'upcoming')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, node_id)
);

-- ============================================================================
-- 10. OPPORTUNITIES & JOB MATCHING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  company_logo_url TEXT,
  location_type TEXT NOT NULL CHECK (location_type IN ('Remote', 'Hybrid', 'Onsite')),
  location TEXT DEFAULT 'Remote',
  duration TEXT NOT NULL,
  stipend TEXT,
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  skills_required TEXT[] DEFAULT '{}',
  verified BOOLEAN NOT NULL DEFAULT TRUE,
  deadline TIMESTAMPTZ,
  apply_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL DEFAULT 70 CHECK (match_score BETWEEN 0 AND 100),
  applied BOOLEAN NOT NULL DEFAULT FALSE,
  saved BOOLEAN NOT NULL DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  saved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'viewed' CHECK (status IN ('viewed', 'saved', 'applied', 'interviewing', 'offered', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, opportunity_id)
);

DROP TRIGGER IF EXISTS set_user_opportunities_updated_at ON public.user_opportunities;
CREATE TRIGGER set_user_opportunities_updated_at
BEFORE UPDATE ON public.user_opportunities
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 11. CONNECTIVITY, COMMUNITY FEED, POSTS & COMMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.network_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  code_snippet JSONB,
  tags TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  reposts_count INTEGER NOT NULL DEFAULT 0,
  poll JSONB,
  attached_certificate_id UUID REFERENCES public.generated_certificates(id) ON DELETE SET NULL,
  attached_project_id UUID REFERENCES public.user_projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_network_posts_updated_at ON public.network_posts;
CREATE TRIGGER set_network_posts_updated_at
BEFORE UPDATE ON public.network_posts
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.network_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.network_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.network_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.network_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_network_post_comments_updated_at ON public.network_post_comments;
CREATE TRIGGER set_network_post_comments_updated_at
BEFORE UPDATE ON public.network_post_comments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.network_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

-- ============================================================================
-- 12. DIRECT MESSAGING & CONVERSATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.network_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_one_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_two_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (participant_one_id, participant_two_id),
  CONSTRAINT distinct_participants CHECK (participant_one_id <> participant_two_id)
);

DROP TRIGGER IF EXISTS set_network_conversations_updated_at ON public.network_conversations;
CREATE TRIGGER set_network_conversations_updated_at
BEFORE UPDATE ON public.network_conversations
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.network_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.network_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.network_conversations
  SET last_message = NEW.content,
      last_message_time = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_network_message ON public.network_messages;
CREATE TRIGGER on_new_network_message
AFTER INSERT ON public.network_messages
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- ============================================================================
-- 13. USER LIBRARIES & ACCESS CONTROL REQUESTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('youtube_track', 'course', 'cert_prep', 'lab')),
  title TEXT NOT NULL,
  provider_or_channel TEXT NOT NULL,
  thumbnail_url TEXT,
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  current_lesson_or_chapter TEXT NOT NULL,
  total_duration_or_modules TEXT NOT NULL,
  skills_covered TEXT[] DEFAULT '{}',
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  notes_count INTEGER NOT NULL DEFAULT 0,
  certificate_serial TEXT,
  last_studied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_user_library_items_updated_at ON public.user_library_items;
CREATE TRIGGER set_user_library_items_updated_at
BEFORE UPDATE ON public.user_library_items
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.library_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE (requester_id, target_user_id),
  CONSTRAINT no_self_library_request CHECK (requester_id <> target_user_id)
);

-- ============================================================================
-- 14. AI RECOMMENDATIONS & NEBULA CHAT SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('Skill Sprint', 'Project', 'Certification', 'Internship Strategy')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact_score INTEGER NOT NULL DEFAULT 90 CHECK (impact_score BETWEEN 0 AND 100),
  estimated_time TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  action_label TEXT NOT NULL,
  action_view TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nebula AI Career Consultation',
  mode TEXT NOT NULL DEFAULT 'mentor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_ai_chat_sessions_updated_at ON public.ai_chat_sessions;
CREATE TRIGGER set_ai_chat_sessions_updated_at
BEFORE UPDATE ON public.ai_chat_sessions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'model', 'system')),
  content TEXT NOT NULL,
  model_used TEXT DEFAULT 'gemini-2.5-flash',
  thinking_mode_active BOOLEAN NOT NULL DEFAULT FALSE,
  language TEXT DEFAULT 'en',
  translated_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 15. FRAUD/SCAM SAFETY DETECTOR & REPORTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.scam_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  analyzed_text TEXT NOT NULL,
  risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('HIGH RISK', 'MODERATE RISK', 'LOW RISK', 'VERIFIED SAFE')),
  summary TEXT NOT NULL,
  detected_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendation TEXT NOT NULL,
  verification_checklist TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 16. APP SETTINGS & NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  job_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  weekly_progress_digest BOOLEAN NOT NULL DEFAULT TRUE,
  gemini_thinking_mode BOOLEAN NOT NULL DEFAULT TRUE,
  ai_thinking_mode BOOLEAN NOT NULL DEFAULT TRUE,
  compact_mode BOOLEAN NOT NULL DEFAULT FALSE,
  auto_ats_analysis BOOLEAN NOT NULL DEFAULT TRUE,
  recruiter_visibility BOOLEAN NOT NULL DEFAULT TRUE,
  fraud_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  auto_sync_github BOOLEAN NOT NULL DEFAULT FALSE,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  profile_visibility TEXT NOT NULL DEFAULT 'Public' CHECK (profile_visibility IN ('Public', 'Recruiters Only', 'Private')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER set_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 17. AUTOMATIC USER CREATION TRIGGER (AUTH.USERS -> PROFILES & APP_SETTINGS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  clean_name TEXT;
  clean_handle TEXT;
  base_prefix TEXT;
BEGIN
  clean_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  base_prefix := LOWER(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g'));
  clean_handle := '@' || base_prefix;

  INSERT INTO public.profiles (
    id,
    email,
    name,
    username,
    user_id_handle,
    avatar_url,
    overall_readiness,
    learning_progress
  ) VALUES (
    NEW.id,
    NEW.email,
    clean_name,
    base_prefix,
    clean_handle,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'),
    72.00,
    64.00
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;

  INSERT INTO public.app_settings (
    user_id,
    email_notifications,
    job_alerts,
    weekly_progress_digest,
    gemini_thinking_mode,
    ai_thinking_mode
  ) VALUES (
    NEW.id,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 18. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id_handle ON public.profiles (user_id_handle);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_target_role ON public.profiles (target_role);

CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON public.user_skills (user_id);
CREATE INDEX IF NOT EXISTS idx_skill_gaps_user_id ON public.skill_gaps (user_id);

CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON public.course_lessons (course_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_module_id ON public.course_lessons (module_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id ON public.course_enrollments (user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON public.course_enrollments (course_id);

CREATE INDEX IF NOT EXISTS idx_youtube_tracks_user_id ON public.youtube_tracks (user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_tracks_video_id ON public.youtube_tracks (video_id);
CREATE INDEX IF NOT EXISTS idx_youtube_watched_ranges_track ON public.youtube_watched_ranges (track_id);
CREATE INDEX IF NOT EXISTS idx_youtube_notes_track ON public.youtube_notes (track_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_user_id ON public.learning_records (user_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_record_id ON public.learning_records (record_id);

CREATE INDEX IF NOT EXISTS idx_generated_certs_user_id ON public.generated_certificates (user_id);
CREATE INDEX IF NOT EXISTS idx_generated_certs_serial_id ON public.generated_certificates (serial_id);

CREATE INDEX IF NOT EXISTS idx_network_posts_author_id ON public.network_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_network_posts_created_at ON public.network_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_post_likes_post_user ON public.network_post_likes (post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_network_post_comments_post ON public.network_post_comments (post_id);
CREATE INDEX IF NOT EXISTS idx_network_follows_follower ON public.network_follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_network_follows_following ON public.network_follows (following_id);
CREATE INDEX IF NOT EXISTS idx_network_conversations_participants ON public.network_conversations (participant_one_id, participant_two_id);
CREATE INDEX IF NOT EXISTS idx_network_messages_conversation ON public.network_messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_network_messages_receiver ON public.network_messages (receiver_id, is_read);

CREATE INDEX IF NOT EXISTS idx_user_opportunities_user_id ON public.user_opportunities (user_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_nodes_roadmap_id ON public.roadmap_nodes (roadmap_id, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_user_roadmap_progress_user ON public.user_roadmap_progress (user_id);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON public.ai_recommendations (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON public.ai_chat_messages (session_id, created_at ASC);

-- ============================================================================
-- 19. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_industry_tool_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_watched_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinar_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinar_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roadmap_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scam_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User Projects Policies
CREATE POLICY "Projects viewable by everyone" ON public.user_projects FOR SELECT USING (true);
CREATE POLICY "Users can manage own projects" ON public.user_projects FOR ALL USING (auth.uid() = user_id);

-- User Internships Policies
CREATE POLICY "Internships viewable by everyone" ON public.user_internships FOR SELECT USING (true);
CREATE POLICY "Users can manage own internships" ON public.user_internships FOR ALL USING (auth.uid() = user_id);

-- User Achievements Policies
CREATE POLICY "Achievements viewable by everyone" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "Users can manage own achievements" ON public.user_achievements FOR ALL USING (auth.uid() = user_id);

-- User Interests Policies
CREATE POLICY "Interests viewable by everyone" ON public.user_interests FOR SELECT USING (true);
CREATE POLICY "Users can manage own interests" ON public.user_interests FOR ALL USING (auth.uid() = user_id);

-- Skills & Industry Tools Policies
CREATE POLICY "Catalog skills are viewable by everyone" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Industry tools are viewable by everyone" ON public.industry_tools FOR SELECT USING (true);
CREATE POLICY "Users can view own and public user skills" ON public.user_skills FOR SELECT USING (true);
CREATE POLICY "Users can manage own skills" ON public.user_skills FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own skill gaps" ON public.skill_gaps FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own tool statuses" ON public.user_industry_tool_statuses FOR ALL USING (auth.uid() = user_id);

-- Courses Policies
CREATE POLICY "Courses viewable by everyone" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Course modules viewable by everyone" ON public.course_modules FOR SELECT USING (true);
CREATE POLICY "Course lessons viewable by everyone" ON public.course_lessons FOR SELECT USING (true);
CREATE POLICY "Users can manage own enrollments" ON public.course_enrollments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own lesson completions" ON public.course_lesson_completions FOR ALL USING (auth.uid() = user_id);

-- YouTube Tracks & Verification Policies
CREATE POLICY "Users can manage own youtube tracks" ON public.youtube_tracks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own watched ranges" ON public.youtube_watched_ranges FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own video notes" ON public.youtube_notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Learning records viewable by everyone" ON public.learning_records FOR SELECT USING (true);
CREATE POLICY "Users can insert own learning records" ON public.learning_records FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Certifications & Generated Certificates Policies
CREATE POLICY "Certifications catalog viewable by everyone" ON public.certifications FOR SELECT USING (true);
CREATE POLICY "Users can manage own user certifications" ON public.user_certifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Certificates are verifiable by anyone" ON public.generated_certificates FOR SELECT USING (true);
CREATE POLICY "Users can insert and claim own certificates" ON public.generated_certificates FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Webinars Policies
CREATE POLICY "Webinars viewable by everyone" ON public.webinars FOR SELECT USING (true);
CREATE POLICY "Users can manage own webinar registrations" ON public.webinar_registrations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own webinar likes" ON public.webinar_likes FOR ALL USING (auth.uid() = user_id);

-- Assignments Policies
CREATE POLICY "Assignments viewable by authenticated users" ON public.assignments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can manage own assignment submissions" ON public.assignment_submissions FOR ALL USING (auth.uid() = user_id);

-- Roadmaps Policies
CREATE POLICY "Roadmaps viewable by everyone" ON public.roadmaps FOR SELECT USING (true);
CREATE POLICY "Roadmap nodes viewable by everyone" ON public.roadmap_nodes FOR SELECT USING (true);
CREATE POLICY "Users can manage own roadmap progress" ON public.user_roadmap_progress FOR ALL USING (auth.uid() = user_id);

-- Opportunities Policies
CREATE POLICY "Opportunities viewable by everyone" ON public.opportunities FOR SELECT USING (true);
CREATE POLICY "Users can manage own opportunity matches" ON public.user_opportunities FOR ALL USING (auth.uid() = user_id);

-- Connectivity & Community Feed Policies
CREATE POLICY "Posts viewable by everyone" ON public.network_posts FOR SELECT USING (true);
CREATE POLICY "Users can manage own posts" ON public.network_posts FOR ALL USING (auth.uid() = author_id);

CREATE POLICY "Post likes viewable by everyone" ON public.network_post_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own post likes" ON public.network_post_likes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Post comments viewable by everyone" ON public.network_post_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert and manage own comments" ON public.network_post_comments FOR ALL USING (auth.uid() = author_id);

CREATE POLICY "Follows viewable by everyone" ON public.network_follows FOR SELECT USING (true);
CREATE POLICY "Users can manage own follow actions" ON public.network_follows FOR ALL USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Direct Messaging Policies
CREATE POLICY "Users can view conversations they participate in" ON public.network_conversations 
  FOR SELECT USING (auth.uid() = participant_one_id OR auth.uid() = participant_two_id);
CREATE POLICY "Users can create conversations they participate in" ON public.network_conversations 
  FOR INSERT WITH CHECK (auth.uid() = participant_one_id OR auth.uid() = participant_two_id);
CREATE POLICY "Users can update conversations they participate in" ON public.network_conversations 
  FOR UPDATE USING (auth.uid() = participant_one_id OR auth.uid() = participant_two_id);

CREATE POLICY "Users can view messages in their conversations" ON public.network_messages 
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.network_messages 
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receivers can update message read status" ON public.network_messages 
  FOR UPDATE USING (auth.uid() = receiver_id);

-- User Libraries & Access Request Policies
CREATE POLICY "Public library items viewable by everyone or owners" ON public.user_library_items 
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = public.user_library_items.user_id AND p.is_library_private = FALSE
    ) OR
    EXISTS (
      SELECT 1 FROM public.library_access_requests r 
      WHERE r.requester_id = auth.uid() 
        AND r.target_user_id = public.user_library_items.user_id 
        AND r.status = 'approved'
    )
  );
CREATE POLICY "Users can manage own library items" ON public.user_library_items FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view library requests involving them" ON public.library_access_requests 
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = target_user_id);
CREATE POLICY "Users can create library access requests" ON public.library_access_requests 
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Target users can approve/decline library access requests" ON public.library_access_requests 
  FOR UPDATE USING (auth.uid() = target_user_id);

-- AI Recommendations & Nebula Chat Policies
CREATE POLICY "Users can manage own AI recommendations" ON public.ai_recommendations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own chat sessions" ON public.ai_chat_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own chat messages" ON public.ai_chat_messages FOR ALL USING (auth.uid() = user_id);

-- Scam Reports Policies
CREATE POLICY "Users can manage own scam reports" ON public.scam_reports FOR ALL USING (auth.uid() = user_id);

-- App Settings Policies
CREATE POLICY "Users can manage own app settings" ON public.app_settings FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 20. SUPABASE REALTIME REPLICATION CONFIGURATION
-- ============================================================================

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.network_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.network_conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.network_posts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.network_post_likes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.network_post_comments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.network_follows;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.library_access_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
