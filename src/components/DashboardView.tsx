import React, { useState } from 'react';
import { ViewType, UserProfile, SkillItem } from '../types';
import { initialWebinars, initialAssignments, initialAIRecommendations, NEBULA_LOGO_URL } from '../data/mockData';

interface DashboardViewProps {
  user: UserProfile;
  skills: SkillItem[];
  onNavigate: (view: ViewType) => void;
  onSelectSkillForLearning?: (skillName: string) => void;
  onOpenCopilot?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  skills,
  onNavigate,
  onSelectSkillForLearning,
  onOpenCopilot,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const strongFoundations = skills.filter((s) => s.category === 'foundation');
  const criticalGaps = skills.filter((s) => s.category === 'gap');

  const filteredFoundations = strongFoundations.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredGaps = criticalGaps.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topRecommendations = initialAIRecommendations.slice(0, 2);
  const upcomingWebinars = initialWebinars.slice(0, 2);
  const pendingAssignments = initialAssignments.slice(0, 2);

  const quickNavGrid: { id: ViewType; label: string; icon: string; badge?: string; color: string }[] = [
    { id: 'profile', label: 'My Profile', icon: 'account_circle', color: 'from-blue-600 to-indigo-600' },
    { id: 'skills', label: 'My Skills', icon: 'workspace_premium', color: 'from-indigo-600 to-violet-600' },
    { id: 'skill-gap', label: 'Skill Gap', icon: 'query_stats', badge: 'AI Radar', color: 'from-purple-600 to-pink-600' },
    { id: 'ai-recommendations', label: 'AI Recs', icon: 'auto_awesome', badge: 'Top ROI', color: 'from-violet-600 to-purple-600' },
    { id: 'courses', label: 'Courses', icon: 'school', color: 'from-cyan-600 to-blue-600' },
    { id: 'industry-tools', label: 'Industry Tools', icon: 'build', color: 'from-teal-600 to-emerald-600' },
    { id: 'certifications', label: 'Certifications', icon: 'military_tech', color: 'from-amber-500 to-orange-600' },
    { id: 'opportunities', label: 'Internships', icon: 'work', badge: 'Active', color: 'from-blue-600 to-teal-600' },
    { id: 'connectivity', label: 'Connectivity', icon: 'hub', badge: 'Network', color: 'from-purple-600 to-indigo-600' },
    { id: 'webinars', label: 'Webinars', icon: 'event', badge: 'Live', color: 'from-purple-600 to-indigo-700' },
    { id: 'assignments', label: 'Assignments', icon: 'task', color: 'from-indigo-600 to-blue-700' },
    { id: 'safety', label: 'Fraud Detection', icon: 'security', badge: 'Shield', color: 'from-rose-600 to-red-700' },
    { id: 'nebula', label: 'AI Chatbot', icon: 'smart_toy', badge: 'Mentor', color: 'from-blue-600 to-indigo-800' },
  ];

  return (
    <main className="pt-20 md:pt-24 pb-24 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-black bg-white/20 text-white backdrop-blur-xs">
                STUDENT CAREER CONTROL TOWER
              </span>
              <span className="text-xs text-blue-100 font-medium">Summer 2026 Cohort</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              Good Morning, {user.name.split(' ')[0]} 👋
            </h1>
            <p className="text-blue-100 text-sm max-w-xl leading-relaxed">
              Targeting <strong className="text-white">{user.targetRole}</strong> with an active industry readiness index of <strong className="text-white">{user.overallReadiness}%</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onOpenCopilot && (
              <button
                onClick={onOpenCopilot}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                Match Resume with Job Post
              </button>
            )}
            <button
              onClick={() => onNavigate('nebula')}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl border border-white/30 backdrop-blur-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
              AI Mentor Chat
            </button>
          </div>
        </div>

        {/* Aggregate KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/20">
          <div
            onClick={() => onNavigate('skill-gap')}
            className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl cursor-pointer hover:bg-white/15 transition-all"
          >
            <span className="text-[11px] font-bold text-blue-100 uppercase">Role Readiness</span>
            <p className="text-2xl font-black mt-0.5">{user.overallReadiness}%</p>
            <p className="text-[10px] text-emerald-300 font-semibold mt-0.5">↑ +8% this month</p>
          </div>
          <div
            onClick={() => onNavigate('opportunities')}
            className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl cursor-pointer hover:bg-white/15 transition-all"
          >
            <span className="text-[11px] font-bold text-blue-100 uppercase">Matched Openings</span>
            <p className="text-2xl font-black mt-0.5">{user.opportunitiesCount} Jobs</p>
            <p className="text-[10px] text-blue-200 mt-0.5">{user.newMatchedCount} top verified</p>
          </div>
          <div
            onClick={() => onNavigate('courses')}
            className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl cursor-pointer hover:bg-white/15 transition-all"
          >
            <span className="text-[11px] font-bold text-blue-100 uppercase">Courses & Labs</span>
            <p className="text-2xl font-black mt-0.5">{user.learningProgress}%</p>
            <p className="text-[10px] text-blue-200 mt-0.5">{user.activeCoursesCount} in progress</p>
          </div>
          <div
            onClick={() => onNavigate('certifications')}
            className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl cursor-pointer hover:bg-white/15 transition-all"
          >
            <span className="text-[11px] font-bold text-blue-100 uppercase">Certifications</span>
            <p className="text-2xl font-black mt-0.5">{user.certificationsCount ?? 0}</p>
            <p className="text-[10px] text-amber-200 font-semibold mt-0.5">Verified Credentials</p>
          </div>
        </div>
      </div>

      {/* 14 Sections Quick Launch Hub */}
      <div className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">grid_view</span>
            Explore All 14 Platform Modules
          </h2>
          <span className="text-xs text-slate-400 font-semibold">Quick Switch</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {quickNavGrid.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-800 transition-all flex flex-col items-center text-center group cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center text-xl shadow-xs group-hover:scale-110 transition-transform mb-2 relative`}>
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {item.badge && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[9px] font-black rounded-full shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Skill Gap + AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Skill Gap Summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">query_stats</span>
                  Skill Delta & Foundations vs {user.targetRole}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live delta breakdown against Tier-1 requirements</p>
              </div>
              <button
                onClick={() => onNavigate('skill-gap')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Full Gap Radar →
              </button>
            </div>

            {/* Critical Gaps */}
            <div className="space-y-3">
              {criticalGaps.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">No critical skill gaps identified. Add skills to run benchmark analysis.</p>
                </div>
              ) : (
                criticalGaps.slice(0, 3).map((skill) => (
                  <div key={skill.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-900 dark:text-white">{skill.name}</span>
                        <span className="text-amber-600 dark:text-amber-400">{skill.proficiency}% (Delta: -{100 - skill.proficiency}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${skill.proficiency}%` }} />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (onSelectSkillForLearning) onSelectSkillForLearning(skill.name);
                        onNavigate('courses');
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer shrink-0"
                    >
                      Close Gap
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Strong Foundations Pill list */}
            <div className="pt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Verified Mastery Foundations ({strongFoundations.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {strongFoundations.length === 0 ? (
                  <span className="text-xs text-slate-400">No verified foundations recorded yet.</span>
                ) : (
                  strongFoundations.map((skill) => (
                    <span
                      key={skill.id}
                      className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">check</span>
                      {skill.name} ({skill.proficiency}%)
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* AI Recommendations Card */}
          <div className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">auto_awesome</span>
                Top AI Career Growth Actions
              </h3>
              <button
                onClick={() => onNavigate('ai-recommendations')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                View All Recommendations →
              </button>
            </div>

            {topRecommendations.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">No custom growth actions generated yet.</p>
                <button
                  onClick={() => onNavigate('ai-recommendations')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Generate AI Recommendations
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {topRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-extrabold uppercase text-blue-700 dark:text-blue-300">
                          {rec.category}
                        </span>
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                          +{rec.impactScore}% Impact
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                        {rec.title}
                      </h4>
                    </div>
                    <button
                      onClick={() => onNavigate(rec.actionView)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer text-center"
                    >
                      {rec.actionLabel}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Live Webinars & Pending Assignments */}
        <div className="space-y-6">
          {/* Nebula AI Mentor Spotlight Card */}
          <div
            onClick={() => onNavigate('nebula')}
            className="group bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 border border-blue-500/30 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden cursor-pointer hover:border-blue-400 transition-all"
          >
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="relative w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-blue-400 via-indigo-400 to-purple-400 shadow-md shadow-blue-500/30 shrink-0 group-hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 border-2 border-white/20">
                  <img
                    src={NEBULA_LOGO_URL}
                    alt="Nebula AI Circular Logo"
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-white tracking-tight">Nebula AI Realtime</h3>
                  <span className="px-1.5 py-0.5 text-[9px] font-black bg-blue-500/30 text-blue-300 rounded-md border border-blue-400/30">
                    28+ LANG
                  </span>
                </div>
                <p className="text-xs text-blue-200/80 line-clamp-1 mt-0.5">
                  Ask career gaps, code reviews, or interview mock in any language.
                </p>
                <div className="mt-2 flex items-center gap-1 text-xs font-bold text-blue-300 group-hover:text-white transition-colors">
                  <span>Open Realtime Chat</span>
                  <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Live Webinars */}
          <div className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">event</span>
                Upcoming Webinars
              </h3>
              <button
                onClick={() => onNavigate('webinars')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                All Talks →
              </button>
            </div>

            <div className="space-y-3">
              {upcomingWebinars.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">No live webinars scheduled currently.</p>
                </div>
              ) : (
                upcomingWebinars.map((webinar) => (
                  <div
                    key={webinar.id}
                    onClick={() => onNavigate('webinars')}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-purple-600 dark:text-purple-400 uppercase">
                        {webinar.tags[0] || 'TECH TALK'}
                      </span>
                      <span className="text-slate-400">{webinar.dateTime}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {webinar.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Host: {webinar.speaker.name} ({webinar.speaker.company})
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Practical Assignments & Code Reviews */}
          <div className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">task</span>
                Active Assignments
              </h3>
              <button
                onClick={() => onNavigate('assignments')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Submit →
              </button>
            </div>

            <div className="space-y-3">
              {pendingAssignments.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">No pending assignments at this time.</p>
                </div>
              ) : (
                pendingAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    onClick={() => onNavigate('assignments')}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {assignment.courseOrTopic}
                      </span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        Due: {assignment.dueDate}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {assignment.title}
                    </h4>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Safety Banner */}
          <div
            onClick={() => onNavigate('safety')}
            className="p-4 rounded-3xl bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md cursor-pointer hover:opacity-95 transition-all space-y-1"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">security</span>
              <span className="text-xs font-bold uppercase tracking-wide">Scam Shield Active</span>
            </div>
            <p className="text-xs text-red-100">
              Received a suspicious job offer? Run it through our Scam & Red Flag Detector.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};
