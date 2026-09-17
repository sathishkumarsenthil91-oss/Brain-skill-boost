import React, { useState, useEffect } from 'react';
import {
  runSupabaseTableDiagnostics,
  SupabaseSystemDiagnostic,
  TableDiagnosticResult,
} from '../services/supabaseService';

interface SupabaseDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseDiagnosticsModal: React.FC<SupabaseDiagnosticsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SupabaseSystemDiagnostic | null>(null);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const res = await runSupabaseTableDiagnostics();
      setReport(res);
    } catch (e) {
      console.error('Diagnostics failure:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runTest();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const missingTables = report?.tables.filter((t) => !t.exists) || [];

  const handleCopySql = () => {
    const fullSql = `-- ==============================================================================
-- BRAINBOOST / INDUSTRY SKILL - COMPLETE INSTANT SUPABASE FIX SCRIPT
-- Execute in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. DISABLE ROW LEVEL SECURITY (OR ADD UNRESTRICTED POLICIES)
-- Fixes all 401 Unauthorized / 42501 RLS errors on hosted/preview URLs:
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'profiles', 'network_posts', 'post_likes', 'post_comments',
        'network_follows', 'user_follows', 'network_messages', 'messages',
        'courses', 'course_enrollments', 'certificates', 'learning_records',
        'youtube_tracks', 'assignments', 'roadmaps', 'webinars',
        'webinar_registrations', 'opportunities', 'user_skills', 'skills'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        BEGIN
            -- Ensure table has RLS permissive policy for anon and authenticated
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
            EXECUTE format('DROP POLICY IF EXISTS "Permissive all" ON public.%I;', t);
            EXECUTE format('CREATE POLICY "Permissive all" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

-- 2. ENABLE REALTIME BROADCASTS FOR ALL LIVE TABLES
DO $$
DECLARE
    t text;
    rt_tables text[] := ARRAY[
        'profiles', 'network_posts', 'post_likes', 'post_comments',
        'network_follows', 'network_messages', 'courses', 'course_enrollments'
    ];
BEGIN
    FOREACH t IN ARRAY rt_tables LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', t);
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

-- 3. SEED STARTER COURSES CATALOG (IF EMPTY)
INSERT INTO public.courses (id, title, provider, rating, duration, level, category, thumbnail, skills_taught, description)
VALUES 
('course-1', 'Full-Stack Modern React & TypeScript', 'Brainboost Academy', 4.90, '20 Hours', 'Intermediate', 'Frontend Development', 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format&fit=crop&q=80', ARRAY['React', 'TypeScript', 'Tailwind CSS', 'Vite'], 'Master modern React patterns, state management, component architecture, and TypeScript integration.'),
('course-2', 'Production Node.js & Distributed Systems', 'Brainboost Academy', 4.85, '18 Hours', 'Intermediate to Advanced', 'Backend Development', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80', ARRAY['Node.js', 'Express', 'PostgreSQL', 'Redis'], 'Build resilient server-side architectures, handle real-time WebSockets, and optimize database connections.'),
('course-3', 'Cloud Architecture & DevOps with Docker', 'Brainboost Academy', 4.95, '24 Hours', 'All Levels', 'Cloud & DevOps', 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800&auto=format&fit=crop&q=80', ARRAY['Docker', 'Kubernetes', 'CI/CD', 'Cloud Run'], 'Containerize production applications, orchestrate services, and establish automated deployment pipelines.')
ON CONFLICT (id) DO NOTHING;

-- 4. SEED OPPORTUNITIES
INSERT INTO public.opportunities (id, title, company, location, type, experience, stipend, description, skills, match_percentage)
VALUES 
('opp-1', 'Junior Full Stack Engineer', 'TechNova Solutions', 'Remote', 'Full-Time', '0-2 Years', '$95,000 - $120,000 / yr', 'Join our core platform engineering team building next-generation developer tooling.', ARRAY['React', 'Node.js', 'TypeScript', 'PostgreSQL'], 94),
('opp-2', 'Cloud Platform Intern', 'Starlight Data', 'Remote', 'Internship', 'Fresher / Student', '$45 / hr', 'Hands-on experience deploying containerized microservices and automated cloud infrastructure.', ARRAY['Docker', 'Linux', 'Python', 'AWS/GCP'], 88)
ON CONFLICT (id) DO NOTHING;`;

    navigator.clipboard.writeText(fullSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-2xl">database</span>
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                Supabase Live Database Connection Tester
                {report && (
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                      report.overallStatus === 'healthy'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : report.overallStatus === 'partial'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800'
                    }`}
                  >
                    {report.overallStatus === 'healthy'
                      ? '● All Tables Online'
                      : report.overallStatus === 'partial'
                      ? '● Partial Read Access'
                      : '● Connection Error'}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Project URL: <span className="font-mono text-slate-700 dark:text-slate-300">https://nzgisrrrbabedlntmcoc.supabase.co</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runTest}
              disabled={loading}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              {loading ? 'Testing...' : 'Re-test Now'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Auth State Card */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">
                admin_panel_settings
              </span>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  Client Auth State:{' '}
                  <span className={report?.authSession.authenticated ? 'text-emerald-600' : 'text-slate-500'}>
                    {report?.authSession.authenticated ? 'Authenticated User Active' : 'Public Anon Access'}
                  </span>
                </p>
                {report?.authSession.userEmail && (
                  <p className="text-[11px] text-slate-500 font-mono">
                    {report.authSession.userEmail} ({report.authSession.userId})
                  </p>
                )}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 text-right">
              Last Tested: <span className="font-mono text-slate-700 dark:text-slate-300">{report?.testedAt || 'Just now'}</span>
            </div>
          </div>

          {/* Quick Fix SQL Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-base">code</span>
                Instant Supabase Fix Script (RLS, Realtime & Catalogs)
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Fixes 401 Unauthorized errors, enables real-time messaging broadcasts, and seeds courses/opportunities.
              </p>
            </div>
            <button
              onClick={handleCopySql}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                copiedSql
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {copiedSql ? 'check' : 'content_copy'}
              </span>
              {copiedSql ? 'SQL Script Copied!' : 'Copy Fix SQL'}
            </button>
          </div>

          {/* Table Results List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Live Database Tables Test Results ({report?.tables.length || 0} Tables)
            </h3>

            {loading && !report ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <span className="material-symbols-outlined text-4xl animate-spin text-blue-600">
                  progress_activity
                </span>
                <p className="text-xs font-medium">Running queries against Supabase tables...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {report?.tables.map((tbl: TableDiagnosticResult) => {
                  const isExpanded = expandedTable === tbl.tableName;
                  return (
                    <div
                      key={tbl.tableName}
                      className={`border rounded-2xl p-3.5 transition-all ${
                        tbl.canRead
                          ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10'
                          : 'border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`material-symbols-outlined text-lg ${
                              tbl.canRead ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                            }`}
                          >
                            {tbl.canRead ? 'check_circle' : 'error'}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                                public.{tbl.tableName}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                                  tbl.canRead
                                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300'
                                }`}
                              >
                                {tbl.canRead ? 'READ SUCCESS' : tbl.exists ? 'RLS RESTRICTED' : '404 NOT FOUND'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {tbl.canRead
                                ? `Successfully queried. Found ${tbl.rowCount} record(s).`
                                : tbl.error}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                            {tbl.latencyMs}ms
                          </span>
                          {tbl.sampleData && tbl.sampleData.length > 0 && (
                            <button
                              onClick={() => setExpandedTable(isExpanded ? null : tbl.tableName)}
                              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 bg-blue-50 dark:bg-blue-950/50 rounded-lg cursor-pointer"
                            >
                              {isExpanded ? 'Hide Data' : 'View Sample'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable Sample Data */}
                      {isExpanded && tbl.sampleData && (
                        <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                          <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Live Query Sample (Top {tbl.sampleData.length} records):
                          </p>
                          <pre className="text-[10px] font-mono bg-slate-900 text-emerald-400 p-2.5 rounded-xl overflow-x-auto max-h-40">
                            {JSON.stringify(tbl.sampleData, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Advice box if error */}
                      {!tbl.canRead && tbl.advice && (
                        <div className="mt-2 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200 dark:border-amber-900/40">
                          💡 <strong>Recommendation:</strong> {tbl.advice}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Connected via <code className="font-mono text-slate-700 dark:text-slate-300">@supabase/supabase-js</code>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
