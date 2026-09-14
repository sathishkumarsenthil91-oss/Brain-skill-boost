import React from 'react';
import { ViewType } from '../types';

interface BottomNavProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate }) => {
  // Hide bottom navigation during auth/onboarding screens
  if (currentView === 'auth' || currentView === 'onboarding' || currentView === 'login' || currentView === 'register') {
    return null;
  }

  const navButtons: { id: ViewType; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Home', icon: 'home' },
    { id: 'skill-gap', label: 'Skill Gap', icon: 'query_stats' },
    { id: 'courses', label: 'Courses', icon: 'school' },
    { id: 'opportunities', label: 'Jobs', icon: 'work' },
    { id: 'nebula', label: 'AI Chat', icon: 'smart_toy' },
    { id: 'profile', label: 'Profile', icon: 'person' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-2 py-1.5 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 rounded-t-2xl z-50 md:hidden pb-[max(0.625rem,env(safe-area-inset-bottom))] transition-colors duration-200 shadow-lg">
      {navButtons.map((btn) => {
        const isActive = currentView === btn.id;
        return (
          <button
            key={btn.id}
            onClick={() => onNavigate(btn.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'bg-blue-600 text-white shadow-xs scale-95'
                : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {btn.icon}
            </span>
            <span className="text-[10px] font-bold mt-0.5">{btn.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
