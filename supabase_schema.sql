-- ==============================================================================
-- IndustrySkill Complete Supabase SQL Schema
-- Supports all platform features, relationships, row-level security (RLS), and Realtime.
-- ==============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. PROFILES (Learner & Professional Profiles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    headline TEXT DEFAULT 'Engineering Learner & Developer',
    bio TEXT DEFAULT '',
    role TEXT DEFAULT 'Full Stack Developer',
    college TEXT DEFAULT '',
    target_role TEXT DEFAULT 'Full Stack Developer',
    target_level TEXT DEFAULT 'Mid-Level',
    target_company TEXT DEFAULT 'Top Tech / Fast-Growing Tier-1 Companies',
    industry TEXT DEFAULT 'Software & Enterprise Technology',
    degree TEXT DEFAULT 'B.Tech / Bachelor of Science',
    phone TEXT DEFAULT '',
    location TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    gpa TEXT DEFAULT '',
    github_url TEXT DEFAULT '',
    linkedin_url TEXT DEFAULT '',
    portfolio_url TEXT DEFAULT '',
    readiness_score INTEGER DEFAULT 0,
    weekly_hours_goal INTEGER DEFAULT 15,
    study_streak_days INTEGER DEFAULT 0,
    total_study_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, avatar)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = CASE WHEN profiles.name = '' THEN EXCLUDED.name ELSE profiles.name END,
        avatar = CASE WHEN profiles.avatar = '' THEN EXCLUDED.avatar ELSE profiles.avatar END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 2. SKILLS (Proficiency, Benchmark & Gap Tracking)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('foundation', 'gap', 'target', 'core', 'specialized')),
    proficiency INTEGER NOT NULL DEFAULT 0 CHECK (proficiency BETWEEN 0 AND 100),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    target_score INTEGER DEFAULT 85 CHECK (target_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own skills" 
    ON public.skills FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own skills" 
    ON public.skills FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skills" 
    ON public.skills FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skills" 
    ON public.skills FOR DELETE 
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_skills_user_id ON public.skills(user_id);

-- ==============================================================================
-- 3. COURSES & ENROLLMENTS (Catalog & User Progress)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    provider TEXT NOT NULL,
    rating NUMERIC(3,2) DEFAULT 5.00,
    reviews_count INTEGER DEFAULT 0,
    duration TEXT,
    level TEXT DEFAULT 'Beginner to Intermediate',
    category TEXT,
    cost TEXT DEFAULT 'Free / Sponsored',
    thumbnail TEXT,
    url TEXT,
    syllabus JSONB DEFAULT '[]'::jsonb,
    target_skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_sponsored BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Courses are viewable by everyone" 
    ON public.courses FOR SELECT 
    USING (true);

CREATE TABLE IF NOT EXISTS public.user_enrolled_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'archived')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, course_id)
);

ALTER TABLE public.user_enrolled_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their enrolled courses" 
    ON public.user_enrolled_courses FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll in courses" 
    ON public.user_enrolled_courses FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their course progress" 
    ON public.user_enrolled_courses FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can remove course enrollments" 
    ON public.user_enrolled_courses FOR DELETE 
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 4. YOUTUBE SKILL TRACKS (Active Study & Watch Time Validation)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.youtube_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    video_title TEXT NOT NULL,
    channel_title TEXT NOT NULL,
    video_url TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    verified_watch_seconds INTEGER DEFAULT 0,
    completion_percentage NUMERIC(5,2) DEFAULT 0.00,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    is_verified BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, video_id)
);

ALTER TABLE public.youtube_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own YouTube tracks" 
    ON public.youtube_tracks FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_yt_tracks_user ON public.youtube_tracks(user_id);

-- ==============================================================================
-- 5. UNOFFICIAL LEARNING RECORDS (Verified Self-Directed Certificates)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.learning_records (
    id TEXT PRIMARY KEY, -- e.g. IS-REC-YTL-2026-TS92A
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    video_title TEXT NOT NULL,
    channel TEXT NOT NULL,
    video_id TEXT NOT NULL,
    video_url TEXT NOT NULL,
    verified_watch_seconds INTEGER NOT NULL,
    verified_watch_formatted TEXT NOT NULL,
    completion_percentage NUMERIC(5,2) NOT NULL,
    completion_date TIMESTAMPTZ DEFAULT NOW(),
    disclaimer TEXT NOT NULL,
    skills_validated TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.learning_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learning records are viewable by anyone with the link" 
    ON public.learning_records FOR SELECT 
    USING (true);

CREATE POLICY "Users can create learning records for themselves" 
    ON public.learning_records FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_learning_records_user ON public.learning_records(user_id);

-- ==============================================================================
-- 6. ASSIGNMENTS & TECHNICAL LABS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    course_or_topic TEXT NOT NULL,
    due_date TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded')),
    description TEXT,
    requirements TEXT[] DEFAULT ARRAY[]::TEXT[],
    starter_code TEXT,
    submission_text TEXT,
    submission_repo TEXT,
    grade TEXT,
    feedback TEXT,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own assignments" 
    ON public.assignments FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_assignments_user ON public.assignments(user_id);

-- ==============================================================================
-- 7. CERTIFICATIONS & ACHIEVEMENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    issuer TEXT NOT NULL,
    issue_date TEXT,
    expiry_date TEXT,
    credential_id TEXT,
    credential_url TEXT,
    badge_icon TEXT DEFAULT '🏆',
    skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Certifications are viewable by everyone" 
    ON public.certifications FOR SELECT 
    USING (true);

CREATE POLICY "Users can manage their own certifications" 
    ON public.certifications FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_certifications_user ON public.certifications(user_id);

-- ==============================================================================
-- 8. CAREER ROADMAPS & MILESTONES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.roadmap_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    phase_order INTEGER NOT NULL,
    phase_title TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    duration TEXT,
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('completed', 'in_progress', 'upcoming')),
    skills_to_acquire TEXT[] DEFAULT ARRAY[]::TEXT[],
    resources JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.roadmap_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their roadmap milestones" 
    ON public.roadmap_milestones FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_roadmap_user ON public.roadmap_milestones(user_id);

-- ==============================================================================
-- 9. OPPORTUNITIES & APPLICATIONS (Jobs, Internships, Fellowships)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('job', 'internship', 'hackathon', 'fellowship')),
    location TEXT NOT NULL,
    location_type TEXT DEFAULT 'Remote' CHECK (location_type IN ('Remote', 'Hybrid', 'On-site')),
    stipend_or_salary TEXT,
    apply_url TEXT,
    description TEXT,
    skills_required TEXT[] DEFAULT ARRAY[]::TEXT[],
    verified_badge BOOLEAN DEFAULT true,
    scam_risk_score INTEGER DEFAULT 0,
    is_scam_verified BOOLEAN DEFAULT true,
    deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Opportunities are viewable by authenticated users" 
    ON public.opportunities FOR SELECT 
    USING (true);

CREATE TABLE IF NOT EXISTS public.user_opportunity_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'applied', 'interviewing', 'offered', 'rejected')),
    notes TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, opportunity_id)
);

ALTER TABLE public.user_opportunity_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their opportunity applications" 
    ON public.user_opportunity_applications FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 10. WEBINARS & LIVE SESSIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.webinars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    speaker_name TEXT NOT NULL,
    speaker_title TEXT,
    speaker_company TEXT,
    speaker_avatar TEXT,
    date_time TEXT NOT NULL,
    date_time_iso TIMESTAMPTZ,
    duration_minutes INTEGER DEFAULT 60,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    registration_url TEXT,
    recording_url TEXT,
    max_attendees INTEGER DEFAULT 500,
    current_attendees INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.webinars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Webinars are viewable by all users" 
    ON public.webinars FOR SELECT 
    USING (true);

CREATE TABLE IF NOT EXISTS public.webinar_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webinar_id UUID NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(webinar_id, user_id)
);

ALTER TABLE public.webinar_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their webinar registrations" 
    ON public.webinar_registrations FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 11. PROFESSIONAL NETWORK & DIRECT MESSAGING (Real-Time Ready)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.network_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'following' CHECK (status IN ('following', 'mutual_connected', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, target_user_id)
);

ALTER TABLE public.network_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their connections" 
    ON public.network_connections FOR SELECT 
    USING (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can manage their connections" 
    ON public.network_connections FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.network_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.network_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read messages they sent or received" 
    ON public.network_messages FOR SELECT 
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" 
    ON public.network_messages FOR INSERT 
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receivers can update message read status" 
    ON public.network_messages FOR UPDATE 
    USING (auth.uid() = receiver_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.network_messages(sender_id, receiver_id, created_at);

-- ==============================================================================
-- 12. SCAM DETECTION REPORTS & FRAUD AUDITS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.scam_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    job_title TEXT NOT NULL,
    company_name TEXT NOT NULL,
    job_url TEXT,
    raw_job_description TEXT,
    risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    risk_tier TEXT NOT NULL CHECK (risk_tier IN ('safe', 'low_risk', 'suspicious', 'critical_scam')),
    detected_red_flags TEXT[] DEFAULT ARRAY[]::TEXT[],
    ai_reasoning TEXT,
    status TEXT DEFAULT 'analyzed' CHECK (status IN ('analyzed', 'confirmed_fraud', 'cleared', 'under_review')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scam_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scam reports are viewable by all users for community safety" 
    ON public.scam_reports FOR SELECT 
    USING (true);

CREATE POLICY "Users can submit scam reports" 
    ON public.scam_reports FOR INSERT 
    WITH CHECK (auth.uid() = reporter_id OR reporter_id IS NULL);

-- ==============================================================================
-- 13. NEBULA MULTILINGUAL AI SESSIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.nebula_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.nebula_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own Nebula AI chats" 
    ON public.nebula_chat_messages FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_nebula_user ON public.nebula_chat_messages(user_id, created_at);

-- ==============================================================================
-- 14. AI RECOMMENDATIONS & GROWTH ENGINE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    impact_score INTEGER DEFAULT 0,
    action_label TEXT NOT NULL,
    action_view TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and complete their AI recommendations" 
    ON public.ai_recommendations FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 15. ENABLE SUPABASE REALTIME REPLICATION
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.network_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.network_connections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.youtube_tracks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.skills;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ==============================================================================
-- 16. HELPER FUNCTIONS & TRIGGERS (Auto-Updating Timestamps)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_youtube_tracks_updated_at BEFORE UPDATE ON public.youtube_tracks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
