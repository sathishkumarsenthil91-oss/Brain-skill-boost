-- ============================================================================
-- INDUSTRY SKILL - COMPLETE SUPABASE SQL SCHEMA SCRIPT
-- Supports: Profiles, OAuth Sync, Realtime Networking, YouTube Tracks, 
-- Courses, Certifications, Webinars, Jobs, Assignments, RLS & Realtime
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. USER PROFILES & SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Student Developer',
  avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  headline TEXT DEFAULT 'Full Stack Engineer • Tech Institute ''26',
  bio TEXT DEFAULT 'Passionate student developer building verified projects and completing hands-on tracks.',
  phone TEXT,
  college TEXT DEFAULT 'University Institute of Technology',
  degree TEXT DEFAULT 'B.Tech in Computer Science',
  grad_year TEXT DEFAULT '2026',
  gpa TEXT DEFAULT '3.85',
  location TEXT DEFAULT 'San Francisco, CA / Remote',
  target_role TEXT DEFAULT 'Full Stack Engineer',
  github_url TEXT DEFAULT 'https://github.com',
  linkedin_url TEXT DEFAULT 'https://linkedin.com',
  portfolio_url TEXT DEFAULT '',
  resume_file_name TEXT,
  overall_readiness INT DEFAULT 72,
  matched_skills_count INT DEFAULT 18,
  total_target_skills INT DEFAULT 25,
  learning_progress INT DEFAULT 64,
  active_courses_count INT DEFAULT 4,
  opportunities_count INT DEFAULT 18,
  new_matched_count INT DEFAULT 6,
  completed_assignments_count INT DEFAULT 5,
  certifications_count INT DEFAULT 2,
  is_private_account BOOLEAN DEFAULT FALSE,
  followers_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  job_alerts BOOLEAN DEFAULT TRUE,
  weekly_progress_digest BOOLEAN DEFAULT TRUE,
  gemini_thinking_mode BOOLEAN DEFAULT TRUE,
  compact_mode BOOLEAN DEFAULT FALSE,
  auto_ats_analysis BOOLEAN DEFAULT TRUE,
  recruiter_visibility BOOLEAN DEFAULT TRUE,
  fraud_alerts BOOLEAN DEFAULT TRUE,
  auto_sync_github BOOLEAN DEFAULT FALSE,
  preferred_language TEXT DEFAULT 'en',
  profile_visibility TEXT DEFAULT 'Public' CHECK (profile_visibility IN ('Public', 'Recruiters Only', 'Private')),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  proficiency INT DEFAULT 50 CHECK (proficiency >= 0 AND proficiency <= 100),
  category TEXT DEFAULT 'foundation' CHECK (category IN ('foundation', 'gap', 'upcoming')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  experience TEXT DEFAULT '1-2 years',
  last_assessed TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  github_url TEXT,
  demo_url TEXT,
  date TEXT DEFAULT '2026',
  stars INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_internships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  company TEXT NOT NULL,
  period TEXT NOT NULL,
  location TEXT,
  description TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  issuer TEXT NOT NULL,
  date TEXT NOT NULL,
  badge TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================================
-- 3. CERTIFICATES & CREDENTIALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('course', 'webinar', 'youtube_track', 'specialization')),
  item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  instructor_or_speaker TEXT NOT NULL,
  instructor_role TEXT,
  organization TEXT NOT NULL,
  issue_date TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  duration_formatted TEXT NOT NULL,
  completion_percentage INT DEFAULT 100,
  watch_time_seconds INT DEFAULT 0,
  required_watch_time_seconds INT DEFAULT 0,
  skills_validated TEXT[] DEFAULT '{}',
  legal_disclaimer TEXT NOT NULL,
  verification_url TEXT NOT NULL,
  verification_badge TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================================
-- 4. YOUTUBE LEARNING TRACKS (STUDY PROGRESS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.youtube_learning_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  video_id TEXT NOT NULL,
  video_url TEXT NOT NULL,
  title TEXT NOT NULL,
  channel TEXT NOT NULL,
  channel_url TEXT,
  thumbnail TEXT,
  duration_seconds INT NOT NULL DEFAULT 0,
  duration_formatted TEXT NOT NULL,
  verified_watched_seconds INT NOT NULL DEFAULT 0,
  current_time NUMERIC NOT NULL DEFAULT 0,
  completion_percentage NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  watched_ranges JSONB DEFAULT '[]'::jsonb,
  ai_summary JSONB,
  notes TEXT,
  learning_record JSONB,
  last_watched TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, video_id)
);

-- ============================================================================
-- 5. COURSES & ENROLLMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  provider TEXT NOT NULL,
  category TEXT NOT NULL,
  level TEXT DEFAULT 'Beginner' CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),
  duration TEXT NOT NULL,
  modules_count INT DEFAULT 1,
  rating NUMERIC(3,2) DEFAULT 4.80,
  enrolled_count INT DEFAULT 0,
  cover_image TEXT,
  thumbnail TEXT,
  skills_taught TEXT[] DEFAULT '{}',
  description TEXT,
  instructor JSONB NOT NULL,
  modules JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed_lessons TEXT[] DEFAULT '{}',
  is_completed BOOLEAN DEFAULT FALSE,
  enrolled_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

-- ============================================================================
-- 6. CERTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.certifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  issuer TEXT NOT NULL,
  badge_url TEXT,
  difficulty TEXT NOT NULL,
  market_value TEXT NOT NULL,
  exam_code TEXT,
  skills_validated TEXT[] DEFAULT '{}',
  voucher_discount TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  certification_id TEXT REFERENCES public.certifications(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'Planned' CHECK (status IN ('Earned', 'In Progress', 'Planned')),
  prep_progress INT DEFAULT 0 CHECK (prep_progress >= 0 AND prep_progress <= 100),
  target_date TEXT,
  earned_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, certification_id)
);

-- ============================================================================
-- 7. WEBINARS & ATTENDANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webinars (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  speaker JSONB NOT NULL,
  date_time TIMESTAMPTZ NOT NULL,
  duration TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Live', 'Recorded')),
  attendees_count INT DEFAULT 0,
  likes_count INT DEFAULT 0,
  youtube_url TEXT,
  youtube_video_id TEXT,
  zoom_meeting_url TEXT,
  zoom_meeting_id TEXT,
  zoom_passcode TEXT,
  key_takeaways TEXT[] DEFAULT '{}',
  category TEXT,
  description TEXT,
  thumbnail TEXT,
  certificate_eligible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.webinar_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  webinar_id TEXT REFERENCES public.webinars(id) ON DELETE CASCADE NOT NULL,
  is_liked BOOLEAN DEFAULT FALSE,
  attended BOOLEAN DEFAULT FALSE,
  has_claimed_certificate BOOLEAN DEFAULT FALSE,
  claimed_certificate_id UUID REFERENCES public.certificates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, webinar_id)
);

-- ============================================================================
-- 8. OPPORTUNITIES & INTERNSHIPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.opportunities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location_type TEXT DEFAULT 'Remote' CHECK (location_type IN ('Remote', 'Hybrid', 'Onsite')),
  match_score INT DEFAULT 85,
  duration TEXT,
  verified BOOLEAN DEFAULT TRUE,
  tags TEXT[] DEFAULT '{}',
  company_logo_url TEXT,
  description TEXT,
  stipend TEXT,
  deadline TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_opportunity_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  opportunity_id TEXT REFERENCES public.opportunities(id) ON DELETE CASCADE NOT NULL,
  saved BOOLEAN DEFAULT FALSE,
  applied BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, opportunity_id)
);

-- ============================================================================
-- 9. ASSIGNMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.assignments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  course_or_topic TEXT NOT NULL,
  difficulty TEXT DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  due_date TEXT,
  max_score INT DEFAULT 100,
  skills_tested TEXT[] DEFAULT '{}',
  description TEXT,
  deliverables TEXT[] DEFAULT '{}',
  rubric_criteria TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assignment_id TEXT REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'In Progress' CHECK (status IN ('Pending', 'In Progress', 'Submitted', 'Graded', 'Overdue')),
  submission_content TEXT,
  github_repo_url TEXT,
  score INT,
  feedback TEXT,
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, assignment_id)
);

-- ============================================================================
-- 10. SOCIAL COMMUNITY (POSTS, COMMENTS, LIKES, REPOSTS, FOLLOWS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  reposts_count INT DEFAULT 0,
  image_url TEXT,
  code_snippet JSONB,
  poll JSONB,
  attached_certificate_id UUID REFERENCES public.certificates(id) ON DELETE SET NULL,
  attached_project_id UUID REFERENCES public.user_projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.post_reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(follower_id, following_id)
);

-- ============================================================================
-- 11. DIRECT MESSAGING & REALTIME CHAT
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_b UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_a, user_b)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================================
-- 12. USER LIBRARIES & PRIVACY REQUESTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_libraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('youtube_track', 'course', 'cert_prep', 'lab')),
  title TEXT NOT NULL,
  provider_or_channel TEXT NOT NULL,
  thumbnail_url TEXT,
  progress_percentage INT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  current_lesson_or_chapter TEXT,
  total_duration_or_modules TEXT,
  skills_covered TEXT[] DEFAULT '{}',
  is_completed BOOLEAN DEFAULT FALSE,
  notes_count INT DEFAULT 0,
  certificate_serial TEXT,
  last_studied_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.library_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(requester_id, target_user_id)
);

-- ============================================================================
-- 13. NEBULA AI COPILOT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'model', 'system')),
  content TEXT NOT NULL,
  model_used TEXT DEFAULT 'gemini-3.7-flash',
  thinking_mode_active BOOLEAN DEFAULT FALSE,
  language TEXT DEFAULT 'en',
  mode TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================================
-- 14. ROADMAP & TOOLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.roadmap_nodes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subtopics TEXT[] DEFAULT '{}',
  recommended_resources JSONB DEFAULT '[]'::jsonb,
  order_index INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.user_roadmap_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  node_id TEXT REFERENCES public.roadmap_nodes(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('completed', 'current', 'upcoming')),
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, node_id)
);

CREATE TABLE IF NOT EXISTS public.industry_tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Frontend', 'Backend', 'DevOps & Cloud', 'Testing & QA', 'Design & Collab')),
  proficiency_required TEXT NOT NULL CHECK (proficiency_required IN ('Essential', 'Recommended', 'Bonus')),
  icon TEXT NOT NULL,
  description TEXT,
  popular_for TEXT[] DEFAULT '{}',
  cheat_sheet_url TEXT,
  quick_tip TEXT,
  market_demand INT DEFAULT 90
);

CREATE TABLE IF NOT EXISTS public.user_tool_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tool_id TEXT REFERENCES public.industry_tools(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'Not Started' CHECK (status IN ('Mastered', 'In Progress', 'Not Started')),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, tool_id)
);

CREATE TABLE IF NOT EXISTS public.safety_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  job_offer_text TEXT NOT NULL,
  risk_score INT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT NOT NULL,
  summary TEXT NOT NULL,
  detected_signals JSONB DEFAULT '[]'::jsonb,
  recommendation TEXT,
  verification_checklist TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================================
-- 15. AUTOMATED USER REGISTRATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    name,
    avatar_url,
    college,
    target_role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'),
    COALESCE(NEW.raw_user_meta_data->>'college', 'University Institute of Technology'),
    COALESCE(NEW.raw_user_meta_data->>'target_role', 'Full Stack Engineer')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================================
-- 16. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_learning_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinar_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_opportunity_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roadmap_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tool_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_reports ENABLE ROW LEVEL SECURITY;

-- 16.1 Public Catalogs (Read-only for all users)
CREATE POLICY "Public catalog view courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Public catalog view certifications" ON public.certifications FOR SELECT USING (true);
CREATE POLICY "Public catalog view webinars" ON public.webinars FOR SELECT USING (true);
CREATE POLICY "Public catalog view opportunities" ON public.opportunities FOR SELECT USING (true);
CREATE POLICY "Public catalog view assignments" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "Public catalog view roadmap" ON public.roadmap_nodes FOR SELECT USING (true);
CREATE POLICY "Public catalog view tools" ON public.industry_tools FOR SELECT USING (true);

-- 16.2 User Profiles & Settings
CREATE POLICY "Profiles are viewable by all users" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users manage own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own skills" ON public.user_skills FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own projects" ON public.user_projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own internships" ON public.user_internships FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own achievements" ON public.user_achievements FOR ALL USING (auth.uid() = user_id);

-- 16.3 Certificates & Learning Records
CREATE POLICY "Certificates are publicly verifiable" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "Users can insert own certificate" ON public.certificates FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 16.4 Study Tracks & Enrollments
CREATE POLICY "Users manage own YouTube tracks" ON public.youtube_learning_tracks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own course enrollments" ON public.course_enrollments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own cert prep" ON public.user_certifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own webinar registrations" ON public.webinar_registrations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own job interactions" ON public.user_opportunity_interactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own assignments" ON public.assignment_submissions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own roadmap progress" ON public.user_roadmap_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own tool progress" ON public.user_tool_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own safety reports" ON public.safety_reports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own AI chat history" ON public.ai_chat_messages FOR ALL USING (auth.uid() = user_id);

-- 16.5 Social Community & Posts
CREATE POLICY "Posts are viewable by all users" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "Post likes viewable by all" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users manage own post likes" ON public.post_likes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Comments viewable by all" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete own comments" ON public.post_comments FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "Reposts viewable by all" ON public.post_reposts FOR SELECT USING (true);
CREATE POLICY "Users manage own reposts" ON public.post_reposts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Follows viewable by all" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "Users manage own follow relations" ON public.user_follows FOR ALL USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- 16.6 Realtime Direct Messaging
CREATE POLICY "Users access own conversations" ON public.conversations FOR ALL USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "Users access own messages" ON public.messages FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 16.7 User Learning Libraries & Privacy Requests
CREATE POLICY "Public can view public libraries" ON public.user_libraries FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_libraries.user_id AND p.is_private_account = FALSE)
  OR auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.library_access_requests r 
    WHERE r.target_user_id = user_libraries.user_id 
      AND r.requester_id = auth.uid() 
      AND r.status = 'approved'
  )
);
CREATE POLICY "Users manage own library items" ON public.user_libraries FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users view relevant access requests" ON public.library_access_requests FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = target_user_id);
CREATE POLICY "Users create access requests" ON public.library_access_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Targets update access requests" ON public.library_access_requests FOR UPDATE USING (auth.uid() = target_user_id);

-- ============================================================================
-- 17. SUPABASE REALTIME CONFIGURATION
-- ============================================================================

DO $$
BEGIN
  -- Enable Realtime replication on high-concurrency tables
  PERFORM pg_catalog.pg_stat_statements_reset() WHERE FALSE;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.library_access_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.youtube_learning_tracks;
