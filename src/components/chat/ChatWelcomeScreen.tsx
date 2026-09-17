import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { NEBULA_LOGO_URL } from '../../data/mockData';

interface ChatWelcomeScreenProps {
  user: UserProfile;
  onSelectPrompt: (promptText: string) => void;
  isLoading: boolean;
}

interface PromptItem {
  category: 'career' | 'code' | 'interview' | 'safety';
  icon: string;
  title: string;
  subtitle: string;
  text: string;
}

const PROMPT_SUGGESTIONS: PromptItem[] = [
  {
    category: 'career',
    icon: 'school',
    title: '30-Day Study Plan',
    subtitle: 'Tailored to boost readiness to 90%',
    text: 'Create a tailored 30-day study plan to increase my readiness to 90%',
  },
  {
    category: 'code',
    icon: 'code',
    title: 'Node.js Event Loop',
    subtitle: 'Explain microtasks & macrotasks',
    text: 'Explain how Node.js Event Loop works with microtasks and macrotasks with code examples',
  },
  {
    category: 'interview',
    icon: 'record_voice_over',
    title: 'Mock Interview Drill',
    subtitle: 'Technical & behavioral questions',
    text: 'Start a mock technical interview for a Full-Stack Developer intern role with scoring',
  },
  {
    category: 'safety',
    icon: 'verified_user',
    title: 'Audit Recruiter Offer',
    subtitle: 'Detect Telegram & upfront fee scams',
    text: 'How do I identify fake job postings that ask for training fees or equipment checks?',
  },
  {
    category: 'code',
    icon: 'terminal',
    title: 'TypeScript Debounce',
    subtitle: 'Write generic debounce with cleanup',
    text: 'Write a TypeScript debounce function with generic types and clear comments',
  },
  {
    category: 'career',
    icon: 'psychology',
    title: 'React Hooks Mastery',
    subtitle: 'Master Custom Hooks & Context in 2 weeks',
    text: 'How do I master React Hooks, Custom Hooks & Context API in 2 weeks?',
  },
  {
    category: 'interview',
    icon: 'database',
    title: 'PostgreSQL ACID Quiz',
    subtitle: 'Indexing, locks & EXPLAIN ANALYZE',
    text: 'Quiz me on PostgreSQL ACID properties, indexing, and EXPLAIN ANALYZE',
  },
  {
    category: 'safety',
    icon: 'security',
    title: 'Job Scam Auditor',
    subtitle: 'Check suspicious recruitment messages',
    text: 'Audit this recruiter message: "Earn $80/hr remote data entry via Telegram with check deposit"',
  },
];

export const ChatWelcomeScreen: React.FC<ChatWelcomeScreenProps> = ({
  user,
  onSelectPrompt,
  isLoading,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'career' | 'code' | 'interview' | 'safety'>('all');

  const filteredPrompts = activeCategory === 'all'
    ? PROMPT_SUGGESTIONS
    : PROMPT_SUGGESTIONS.filter((p) => p.category === activeCategory);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-3xl mx-auto px-4 py-8 text-center animate-in fade-in duration-300">
      {/* ChatGPT-style Icon */}
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-3xl p-1 bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-xl mb-4">
        <div className="w-full h-full rounded-[22px] overflow-hidden bg-slate-900 border border-white/20 flex items-center justify-center">
          <img
            src={NEBULA_LOGO_URL}
            alt="Nebula AI Logo"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#18181b] animate-pulse" />
      </div>

      {/* Main Heading */}
      <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
        What can I help with today?
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
        Personalized for <strong className="text-slate-700 dark:text-slate-200">{user.targetRole}</strong> with an active readiness index of <span className="text-blue-600 dark:text-blue-400 font-bold">{user.overallReadiness}%</span>. Supporting 28+ languages.
      </p>

      {/* Prompt Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-2 mb-4 scrollbar-none">
        {(['all', 'career', 'code', 'interview', 'safety'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeCategory === cat
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-[#262626] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 2x2 or Responsive Prompt Suggestion Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full text-left">
        {filteredPrompts.slice(0, 4).map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(prompt.text)}
            disabled={isLoading}
            className="group p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#212121] hover:bg-slate-50 dark:hover:bg-[#2a2a2a] border border-slate-200/90 dark:border-[#333333] hover:border-slate-300 dark:hover:border-[#444444] transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs flex items-start gap-3 disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#2b2b2b] text-slate-700 dark:text-slate-300 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/60 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-center shrink-0 transition-colors">
              <span className="material-symbols-outlined text-[18px]">
                {prompt.icon}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {prompt.title}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {prompt.subtitle}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
