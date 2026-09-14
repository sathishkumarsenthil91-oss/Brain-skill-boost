import React, { useState, useRef, useEffect } from 'react';
import { ViewType, UserProfile } from '../types';
import { NEBULA_LOGO_URL } from '../data/mockData';
import { BrainboostLogo } from './BrainboostLogo';

interface HeaderProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  user: UserProfile;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenAuth: (type: 'login' | 'register') => void;
  onSignOut?: () => void;
  onOpenCopilot?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  user,
  isDarkMode,
  onToggleTheme,
  onOpenAuth,
  onSignOut,
  onOpenCopilot,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close launcher on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allSections: { id: ViewType; label: string; icon: string; badge?: string; desc: string; category: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', desc: 'Readiness & KPIs', category: 'Core' },
    { id: 'profile', label: 'My Profile', icon: 'account_circle', desc: 'Target role & ATS resume', category: 'Core' },
    { id: 'skills', label: 'My Skills', icon: 'workspace_premium', desc: 'Proficiency matrix', category: 'Core' },
    { id: 'skill-gap', label: 'Skill Gap Analysis', icon: 'query_stats', badge: 'AI Radar', desc: 'Benchmark vs Tier-1 jobs', category: 'AI Intelligence' },
    { id: 'ai-recommendations', label: 'AI Recommendations', icon: 'auto_awesome', badge: 'High ROI', desc: 'Daily growth actions', category: 'AI Intelligence' },
    { id: 'nebula', label: 'AI Chatbot', icon: 'smart_toy', badge: 'Gemini 3.1', desc: 'Interactive AI mentor', category: 'AI Intelligence' },
    { id: 'courses', label: 'Courses', icon: 'school', desc: 'Interactive labs & videos', category: 'Learning' },
    { id: 'industry-tools', label: 'Industry Tools', icon: 'build', desc: 'Docker, Git, Postman cheat sheets', category: 'Learning' },
    { id: 'certifications', label: 'Certifications', icon: 'military_tech', badge: '50% Off', desc: 'Google Cloud & AWS roadmaps', category: 'Learning' },
    { id: 'assignments', label: 'Assignments', icon: 'task', desc: 'Code repos & AI rubrics', category: 'Learning' },
    { id: 'opportunities', label: 'Internships & Jobs', icon: 'work', badge: '19 New', desc: 'Verified openings', category: 'Career' },
    { id: 'connectivity', label: 'Connectivity', icon: 'hub', badge: 'Network', desc: 'Peer network, feeds, libraries & DMs', category: 'Career' },
    { id: 'network', label: 'Professional Network', icon: 'hub', badge: 'Social', desc: 'Creator feed, DMs & certificates', category: 'Career' },
    { id: 'webinars', label: 'Webinars', icon: 'event', badge: 'Live Talks', desc: 'Tech AMAs & masterclasses', category: 'Career' },
    { id: 'safety', label: 'Fraud Detection', icon: 'security', badge: 'Shield', desc: 'Scam job & fee scanner', category: 'Career' },
    { id: 'settings', label: 'Settings', icon: 'settings', desc: 'Preferences & theme', category: 'System' },
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="flex justify-between items-center px-4 sm:px-6 h-16 w-full max-w-7xl mx-auto">
        {/* Brand Logo & Name with Unique Animation */}
        <div className="flex items-center gap-3">
          <BrainboostLogo
            size="md"
            showText={true}
            animated={true}
            onClick={() => onNavigate('dashboard')}
          />

          {/* Mega Menu / All 14 Sections Launcher */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="Browse all 14 Platform Sections"
            >
              <span className="material-symbols-outlined text-[18px]">apps</span>
              <span className="hidden sm:inline">All Sections</span>
              <span className="material-symbols-outlined text-[14px]">
                {isMenuOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {/* Mega Menu Dropdown */}
            {isMenuOpen && (
              <>
                {/* Mobile Backdrop */}
                <div
                  className="fixed inset-0 bg-black/40 backdrop-blur-xs sm:hidden z-40"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:mt-2 w-auto sm:w-[480px] max-w-[calc(100vw-1.5rem)] bg-white dark:bg-[#11192e] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 z-50 animate-in fade-in max-h-[82vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">
                        grid_view
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        All 14 Platform Sections
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {allSections.map((sec) => (
                      <button
                        key={sec.id}
                        onClick={() => {
                          onNavigate(sec.id);
                          setIsMenuOpen(false);
                        }}
                        className={`flex items-start gap-3 p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                          currentView === sec.id
                            ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            currentView === sec.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {sec.icon}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-bold truncate ${
                                currentView === sec.id
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {sec.label}
                            </span>
                            {sec.badge && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 shrink-0">
                                {sec.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">{sec.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Primary Desktop Nav Links */}
        <nav className="hidden lg:flex gap-5 xl:gap-6 items-center text-xs font-semibold">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`transition-colors cursor-pointer ${
              currentView === 'dashboard'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onNavigate('profile')}
            className={`transition-colors cursor-pointer ${
              currentView === 'profile'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            My Profile
          </button>
          <button
            onClick={() => onNavigate('skill-gap')}
            className={`transition-colors cursor-pointer ${
              currentView === 'skill-gap'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            Skill Gap
          </button>
          <button
            onClick={() => onNavigate('courses')}
            className={`transition-colors cursor-pointer ${
              currentView === 'courses'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            Courses
          </button>
          <button
            onClick={() => onNavigate('opportunities')}
            className={`transition-colors cursor-pointer ${
              currentView === 'opportunities'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            Internships
          </button>
          <button
            onClick={() => onNavigate('connectivity')}
            className={`transition-colors cursor-pointer flex items-center gap-1 ${
              currentView === 'connectivity' || currentView === 'network'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">hub</span>
            Connectivity
          </button>
          <button
            onClick={() => onNavigate('safety')}
            className={`transition-colors cursor-pointer flex items-center gap-1 ${
              currentView === 'safety'
                ? 'text-rose-600 dark:text-rose-400 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">security</span>
            Fraud Detection
          </button>
          <button
            onClick={() => onNavigate('nebula')}
            className={`transition-colors cursor-pointer flex items-center gap-1 ${
              currentView === 'nebula'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">smart_toy</span>
            AI Chatbot
          </button>
        </nav>

        {/* Right Actions: AI Copilot Quick Button, Theme Toggle, User Profile Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Smart Copilot Quick Launcher */}
          {onOpenCopilot && (
            <button
              onClick={onOpenCopilot}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
              <span>AI Job Copilot</span>
            </button>
          )}

          {/* Theme Switcher */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1e293b] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* User Profile Avatar Link */}
          <div
            onClick={() => onNavigate('profile')}
            className="flex items-center gap-2 cursor-pointer p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            title="View My Profile"
          >
            <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-blue-500/30 shadow-xs">
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="hidden xl:inline-block text-xs font-bold text-slate-700 dark:text-slate-200">
              {user.name}
            </span>
          </div>

          <button
            onClick={() => {
              if (onSignOut) {
                onSignOut();
              } else {
                onNavigate('auth');
              }
            }}
            className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
            title="Sign Out"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
