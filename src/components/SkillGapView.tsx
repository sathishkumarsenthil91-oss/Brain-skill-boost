import React, { useState } from 'react';
import { UserProfile, ViewType, SkillGapMetric, SkillItem } from '../types';
import { initialSkillGapMetrics } from '../data/mockData';

interface SkillGapViewProps {
  user: UserProfile;
  skills: SkillItem[];
  onNavigate: (view: ViewType) => void;
}

export const SkillGapView: React.FC<SkillGapViewProps> = ({
  user,
  skills,
  onNavigate,
}) => {
  const [selectedRole, setSelectedRole] = useState(user.targetRole || 'Full Stack Developer');
  const [filterUrgency, setFilterUrgency] = useState<'all' | 'Critical' | 'Moderate' | 'Good'>('all');
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);

  // Dynamically compute real gap metrics based on user's actual tracked skills
  const dynamicMetrics: SkillGapMetric[] = React.useMemo(() => {
    if (skills.length === 0) return [];

    return skills.map((s) => {
      const required = 85;
      const current = s.proficiency;
      const delta = Math.max(0, required - current);
      let urgency: 'Critical' | 'Moderate' | 'Good' = 'Good';
      if (delta > 30) urgency = 'Critical';
      else if (delta > 10) urgency = 'Moderate';

      return {
        skill: s.name,
        currentLevel: current,
        requiredLevel: required,
        gapPercentage: delta,
        urgency,
        suggestedAction: delta > 20
          ? `Complete hands-on projects and quizzes in ${s.name} to close the ${delta}% gap.`
          : `Maintain competency with weekly real-world practice.`,
        estimatedHours: Math.max(4, Math.round(delta * 0.4)),
      };
    });
  }, [skills]);

  const gapMetrics = dynamicMetrics;

  const currentMatchPct = skills.length > 0
    ? Math.round(skills.reduce((acc, s) => acc + s.proficiency, 0) / skills.length)
    : 0;

  const criticalGapsCount = gapMetrics.filter((g) => g.urgency === 'Critical').length;

  const filteredMetrics = gapMetrics.filter(
    (m) => filterUrgency === 'all' || m.urgency === filterUrgency
  );

  const handleGenerateAISprint = () => {
    setGeneratingPlan(true);
    setTimeout(() => {
      setGeneratingPlan(false);
      setGeneratedPlan(
        `Generated 14-Day Accelerated Gap Closure Sprint for ${selectedRole}:\n` +
          `• Days 1-4: Master Docker containerization & Docker Compose multi-tier setups (Targeting +53% proficiency).\n` +
          `• Days 5-8: Build Node.js REST API with JWT Auth, rate-limiting, and error-handling middleware.\n` +
          `• Days 9-11: Integrate PostgreSQL complex queries, indexing plans, and transactions.\n` +
          `• Days 12-14: Automate CI/CD pipeline using GitHub Actions with preview branches.\n\n` +
          `Estimated Readiness Boost: From 78% → 94% Top-Tier Competitiveness.`
      );
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-900/50 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                INDUSTRY BENCHMARK RADAR
              </span>
              <span className="text-xs text-slate-400 font-semibold">Tier-1 Market Standards</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Skill Gap & Readiness Analysis
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Real-time delta comparison between your current proficiency and verified job requisitions at Google, Microsoft, and high-growth unicorns for <span className="text-white font-bold">{selectedRole}</span>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-slate-800/90 text-white text-xs font-bold border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Full Stack Developer">Target: Full Stack Developer</option>
              <option value="Frontend Specialist (React/Next.js)">Target: Frontend Specialist</option>
              <option value="Backend & Cloud Engineer">Target: Backend & Cloud Engineer</option>
              <option value="Generative AI & LLM Engineer">Target: Generative AI Engineer</option>
            </select>

            <button
              onClick={handleGenerateAISprint}
              disabled={generatingPlan}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                {generatingPlan ? 'hourglass_top' : 'auto_fix_high'}
              </span>
              {generatingPlan ? 'Analyzing Gaps...' : 'Generate AI Sprint Plan'}
            </button>
          </div>
        </div>

        {/* Aggregate Gap Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 backdrop-blur-xs p-4 rounded-2xl border border-slate-700/50">
            <span className="text-xs text-slate-400 font-bold uppercase">Current Skill Match</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white">{currentMatchPct}%</span>
              <span className="text-xs text-emerald-400 font-semibold">{skills.length} tracked skills</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 mt-3 overflow-hidden">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${currentMatchPct}%` }} />
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xs p-4 rounded-2xl border border-slate-700/50">
            <span className="text-xs text-slate-400 font-bold uppercase">Critical Gaps Remaining</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-amber-400">{criticalGapsCount} Skills</span>
              <span className="text-xs text-slate-400 font-semibold">{criticalGapsCount > 0 ? 'Requires attention' : 'Optimal'}</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-2">
              {criticalGapsCount > 0
                ? `${criticalGapsCount * 12} estimated hours of project practice to bridge`
                : 'All tracked skills meet or exceed target threshold'}
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xs p-4 rounded-2xl border border-slate-700/50">
            <span className="text-xs text-slate-400 font-bold uppercase">Target Readiness Horizon</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-indigo-300">
                {currentMatchPct >= 80 ? '95%+' : `${Math.min(95, currentMatchPct + 25)}%`}
              </span>
              <span className="text-xs text-indigo-200 font-semibold">Tier-1 Target</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-2">Benchmarked against live {selectedRole} industry criteria</p>
          </div>
        </div>
      </div>

      {/* Generated AI Plan Modal / Card */}
      {generatedPlan && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-3xl p-6 shadow-md space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-blue-950 dark:text-blue-200 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">psychology</span>
              Nebula AI Personalized Gap Closure Roadmap
            </h3>
            <button
              onClick={() => setGeneratedPlan(null)}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <pre className="text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60">
            {generatedPlan}
          </pre>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => onNavigate('courses')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
            >
              Start Recommended Learning Sprints
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Filter Urgency:</span>
          {(['all', 'Critical', 'Moderate', 'Good'] as const).map((urgency) => (
            <button
              key={urgency}
              onClick={() => setFilterUrgency(urgency)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterUrgency === urgency
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {urgency === 'all' ? 'All Skills' : urgency}
            </button>
          ))}
        </div>

        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Showing {filteredMetrics.length} analyzed competencies
        </span>
      </div>

      {/* Gap Metrics Cards Grid or Empty State */}
      {filteredMetrics.length === 0 ? (
        <div className="bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">insights</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {skills.length === 0 ? 'No Skills Tracked Yet' : 'No Gaps in this Filter'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {skills.length === 0
                ? `Add your technical skills in My Skills to calculate your personalized readiness delta against ${selectedRole} requirements.`
                : 'All your tracked competencies meet the requirements for this category filter.'}
            </p>
          </div>
          {skills.length === 0 && (
            <button
              onClick={() => onNavigate('skills')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Add Skills in My Skills
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredMetrics.map((metric, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase mb-1 ${
                    metric.urgency === 'Critical'
                      ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                      : metric.urgency === 'Moderate'
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  {metric.urgency} Gap ({metric.gapPercentage}% delta)
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {metric.skill}
                </h3>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold text-slate-400 block">Est. Time</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{metric.estimatedHours} Hours</span>
              </div>
            </div>

            {/* Visual Delta Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400">
                  Current: <strong className="text-blue-600 dark:text-blue-400">{metric.currentLevel}%</strong>
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Target: <strong className="text-slate-900 dark:text-white">{metric.requiredLevel}%</strong>
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden relative">
                {/* Target Marker Background */}
                <div
                  className="absolute top-0 bottom-0 bg-slate-300/40 dark:bg-slate-700 rounded-full"
                  style={{ width: `${metric.requiredLevel}%` }}
                />
                {/* Current Fill */}
                <div
                  className={`h-full rounded-full transition-all duration-500 relative z-10 ${
                    metric.urgency === 'Critical'
                      ? 'bg-gradient-to-r from-red-500 to-amber-500'
                      : metric.urgency === 'Moderate'
                      ? 'bg-gradient-to-r from-amber-500 to-blue-500'
                      : 'bg-gradient-to-r from-blue-500 to-emerald-500'
                  }`}
                  style={{ width: `${metric.currentLevel}%` }}
                />
              </div>
            </div>

            {/* Suggested Action */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-400 font-bold block uppercase text-[10px] mb-0.5">High-ROI Action Plan</span>
              <p className="text-slate-700 dark:text-slate-300 font-medium">{metric.suggestedAction}</p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => onNavigate('courses')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Browse Matched Courses
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
              <button
                onClick={() => onNavigate('assignments')}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Practice Lab
              </button>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};
