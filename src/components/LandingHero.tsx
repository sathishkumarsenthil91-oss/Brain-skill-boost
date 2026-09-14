import React from 'react';
import { ViewType, UserProfile } from '../types';

interface LandingHeroProps {
  onNavigate: (view: ViewType) => void;
  user: UserProfile;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onNavigate, user }) => {
  return (
    <div className="pt-24 md:pt-32 pb-24 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Hero Content + Interactive Dashboard Preview */}
      <section className="flex flex-col md:flex-row items-center gap-12 lg:gap-20 relative">
        <div className="flex-1 text-center md:text-left z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-primary text-[12px] font-semibold tracking-wide uppercase mb-4 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            AI-Powered Career Readiness Engine
          </div>

          <h1 className="text-[32px] sm:text-[42px] lg:text-[48px] font-extrabold text-[#121b2e] dark:text-white leading-[1.15] mb-5 tracking-tight">
            Build Skills. Become{' '}
            <span className="text-[#004ac6] dark:text-[#60a5fa] relative inline-block">
              Industry Ready.
              <span className="absolute -bottom-1.5 left-0 w-full h-1.5 bg-[#8fa7fe]/60 rounded-full"></span>
            </span>
          </h1>

          <p className="text-[17px] sm:text-[19px] text-[#434655] dark:text-[#c3c6d7] mb-8 max-w-xl mx-auto md:mx-0 leading-relaxed font-normal">
            Discover the skills industries need, identify your skill gaps, and build an AI-personalized roadmap tailored for your dream career.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
            <button
              onClick={() => onNavigate('onboarding')}
              className="neu-btn-primary px-8 py-3.5 rounded-xl text-[15px] font-semibold w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
            >
              Get Started
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className="neu-btn-secondary px-8 py-3.5 rounded-xl text-[15px] font-semibold w-full sm:w-auto cursor-pointer border border-blue-100 dark:border-slate-700"
            >
              Explore Features
            </button>
          </div>

          {/* Quick Feature Pills */}
          <div className="grid grid-cols-3 gap-3 mt-10 pt-8 border-t border-slate-200/80 dark:border-slate-800 text-left">
            <div className="flex flex-col">
              <span className="text-[20px] font-bold text-[#004ac6] dark:text-[#60a5fa]">72%</span>
              <span className="text-[12px] text-[#737686] dark:text-slate-400 font-medium">Avg. Readiness Lift</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[20px] font-bold text-[#004ac6] dark:text-[#60a5fa]">100%</span>
              <span className="text-[12px] text-[#737686] dark:text-slate-400 font-medium">Verified Internships</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[20px] font-bold text-[#004ac6] dark:text-[#60a5fa]">Deep AI</span>
              <span className="text-[12px] text-[#737686] dark:text-slate-400 font-medium">Thinking Mode</span>
            </div>
          </div>
        </div>

        {/* Hero Visual: Student Dashboard Interactive Preview Card */}
        <div className="flex-1 w-full max-w-md mx-auto z-10">
          <div className="neu-raised rounded-2xl p-6 sm:p-7 relative overflow-hidden transition-all duration-300 hover:shadow-2xl">
            {/* Background Halo */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#8fa7fe]/25 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="flex justify-between items-center mb-5">
              <h3 className="text-[20px] font-bold text-[#121b2e] dark:text-white">
                Student Dashboard
              </h3>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-900">
                LIVE PREVIEW
              </span>
            </div>

            {/* Circular Progress Gauge */}
            <div className="flex items-center gap-5 mb-6">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    className="text-[#d9e2fc] dark:text-slate-700 stroke-current"
                    cx="50"
                    cy="50"
                    fill="transparent"
                    r="40"
                    strokeWidth="8"
                  />
                  <circle
                    className="text-[#004ac6] dark:text-[#60a5fa] progress-ring__circle stroke-current"
                    cx="50"
                    cy="50"
                    fill="transparent"
                    r="40"
                    strokeDasharray="251.2"
                    strokeDashoffset="70.33"
                    strokeLinecap="round"
                    strokeWidth="8"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[19px] font-bold text-[#004ac6] dark:text-[#60a5fa]">
                    72%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#121b2e] dark:text-white">
                  Industry Readiness
                </p>
                <p className="text-[13px] text-[#737686] dark:text-[#c3c6d7]">
                  On track for {user.targetRole || 'Full Stack Developer'}
                </p>
              </div>
            </div>

            {/* Metric Rows */}
            <div className="space-y-3">
              <div className="neu-inset rounded-xl p-3 flex justify-between items-center">
                <span className="text-[14px] text-[#121b2e] dark:text-[#edf0ff] font-medium">
                  Skills Matched
                </span>
                <span className="text-[13px] font-bold text-[#004ac6] dark:text-[#b4c5ff] bg-[#d9e2fc] dark:bg-blue-950/80 px-2.5 py-1 rounded-md">
                  18 / 25
                </span>
              </div>

              <div className="neu-inset rounded-xl p-3 flex justify-between items-center">
                <span className="text-[14px] text-[#121b2e] dark:text-[#edf0ff] font-medium">
                  Skill Gap
                </span>
                <span className="text-[13px] font-bold text-[#ba1a1a] dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2.5 py-1 rounded-md border border-red-200/50 dark:border-red-900/50">
                  5 Skills
                </span>
              </div>

              {/* AI Recommendation Highlight Card */}
              <div
                onClick={() => onNavigate('roadmap')}
                className="neu-raised rounded-xl p-3.5 mt-4 border border-blue-200/80 dark:border-blue-800 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 dark:from-slate-800 dark:to-slate-850 flex items-start gap-3 cursor-pointer hover:scale-[1.02] transition-transform"
              >
                <span className="material-symbols-outlined text-[#004ac6] dark:text-[#60a5fa] text-[22px] mt-0.5">
                  smart_toy
                </span>
                <div className="flex-1">
                  <span className="text-[11px] font-bold text-[#004ac6] dark:text-[#60a5fa] block mb-0.5 tracking-wider">
                    AI RECOMMENDATION
                  </span>
                  <span className="text-[14px] font-bold text-[#121b2e] dark:text-white">
                    React + Node.js Pathway
                  </span>
                  <p className="text-[12px] text-[#434655] dark:text-slate-400 mt-1">
                    Closing this gap unlocks 8 new verified internship matches.
                  </p>
                </div>
                <span className="material-symbols-outlined text-[#004ac6] text-[18px]">
                  chevron_right
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Exploration Grid */}
      <section className="mt-24 pt-12 border-t border-slate-200 dark:border-slate-800">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-[28px] sm:text-[34px] font-bold text-[#121b2e] dark:text-white mb-3">
            Everything You Need to Succeed
          </h2>
          <p className="text-[16px] text-[#434655] dark:text-[#c3c6d7]">
            Powered by high-reasoning Gemini models to evaluate gaps, protect against job scams, and accelerate your engineering career.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div
            onClick={() => onNavigate('skills')}
            className="neu-raised rounded-2xl p-6 flex flex-col justify-between hover:scale-[1.02] transition-all cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/80 flex items-center justify-center text-[#004ac6] dark:text-[#60a5fa] mb-4 shadow-inner">
                <span className="material-symbols-outlined text-[26px]">analytics</span>
              </div>
              <h3 className="text-[18px] font-bold text-[#121b2e] dark:text-white mb-2">
                Industry Skill Gap Matrix
              </h3>
              <p className="text-[14px] text-[#434655] dark:text-[#c3c6d7] leading-relaxed">
                Benchmark your technical stack against real market requirements and identify high-priority gaps.
              </p>
            </div>
            <div className="mt-6 flex items-center text-[13px] font-bold text-[#004ac6] dark:text-[#60a5fa]">
              Explore Matrix <span className="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
            </div>
          </div>

          {/* Card 2 */}
          <div
            onClick={() => onNavigate('safety')}
            className="neu-raised rounded-2xl p-6 flex flex-col justify-between hover:scale-[1.02] transition-all cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-900"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/80 flex items-center justify-center text-[#ba1a1a] dark:text-red-400 mb-4 shadow-inner">
                <span className="material-symbols-outlined text-[26px]">gpp_maybe</span>
              </div>
              <h3 className="text-[18px] font-bold text-[#121b2e] dark:text-white mb-2">
                Opportunity Safety Center
              </h3>
              <p className="text-[14px] text-[#434655] dark:text-[#c3c6d7] leading-relaxed">
                Paste any job offer or email. Our AI performs deep fraud detection and checks for fee deposits, fake domains, and red flags.
              </p>
            </div>
            <div className="mt-6 flex items-center text-[13px] font-bold text-[#ba1a1a] dark:text-red-400">
              Scan Opportunity <span className="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
            </div>
          </div>

          {/* Card 3 */}
          <div
            onClick={() => onNavigate('nebula')}
            className="neu-raised rounded-2xl p-6 flex flex-col justify-between hover:scale-[1.02] transition-all cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 flex items-center justify-center text-[#004ac6] dark:text-[#60a5fa] mb-4 shadow-inner">
                <span className="material-symbols-outlined text-[26px]">psychology</span>
              </div>
              <h3 className="text-[18px] font-bold text-[#121b2e] dark:text-white mb-2">
                Nebula High-Thinking AI
              </h3>
              <p className="text-[14px] text-[#434655] dark:text-[#c3c6d7] leading-relaxed">
                Leverage Gemini 3.1 Pro with High Thinking mode for complex career architecture, resume audits, and mock technical coaching.
              </p>
            </div>
            <div className="mt-6 flex items-center text-[13px] font-bold text-[#004ac6] dark:text-[#60a5fa]">
              Launch Nebula AI <span className="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
