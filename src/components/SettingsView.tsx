import { supabase, reportServiceError } from '../supabaseClient';
import React, { useState, useEffect } from 'react';
import { AppSettings, UserProfile, ViewType } from '../types';
import { initialAppSettings } from '../data/mockData';
import { SupabaseDiagnosticsModal } from './SupabaseDiagnosticsModal';
import { BrainboostLogo, LogoStyle } from './BrainboostLogo';

interface SettingsViewProps {
  user: UserProfile;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onNavigate: (view: ViewType) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  darkMode,
  onToggleDarkMode,
  onNavigate,
}) => {
  const columnName = (key: string) => key.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase());
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase.from('app_settings').select('*').eq('user_id', session.user.id).maybeSingle();
      if (error) throw error;
      if (active && data) setSettings(previous => Object.fromEntries(Object.entries(previous).map(([key, value]) => [key, data[columnName(key)] ?? value])) as unknown as AppSettings);
    })().catch(() => reportServiceError('Could not load your saved settings.'));
    return () => { active = false; };
  }, [user.id, user.email]);
  const persistSettings = async (next: AppSettings) => {
    setSavedSuccess(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sign in to save settings.');
      const values = Object.fromEntries(Object.entries(next).map(([key, value]) => [columnName(key), value]));
      const { error } = await supabase.from('app_settings').upsert({ ...values, user_id: session.user.id }, { onConflict: 'user_id' });
      if (error) throw error;
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch { reportServiceError('Could not save your settings. Please try again.'); }
  };
  const [settings, setSettings] = useState<AppSettings>(initialAppSettings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [logoStyle, setLogoStyle] = useState<LogoStyle>(() => {
    try {
      const saved = localStorage.getItem('brainboost_logo_style');
      if (saved === 'surge' || saved === 'helix' || saved === 'prism') return saved;
    } catch {
      // ignore
    }
    return 'surge';
  });

  const handleSelectLogoStyle = (style: LogoStyle) => {
    setLogoStyle(style);
    try {
      localStorage.setItem('brainboost_logo_style', style);
      window.dispatchEvent(new CustomEvent('brainboost:logo-change', { detail: style }));
    } catch {
      // ignore
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleToggle = (key: keyof AppSettings) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    void persistSettings(next);
  };
  const handleSave = () => { void persistSettings(settings); };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset simulation data to initial state?')) {
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Platform Settings & Preferences
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your account security, AI reasoning models, telemetry, and notifications.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          Save Preferences
        </button>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-fade-in">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          Settings updated and persisted!
        </div>
      )}

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Section 0: Supabase Cloud Database & RLS Diagnostic */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-blue-950/40 border border-emerald-300/80 dark:border-emerald-800/80 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-2xl">database</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Supabase Database Connection & RLS Audit
                  </h2>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 font-bold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                    Live Project Connected
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Test and verify that your app can read and write data across all tables: <code className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">profiles</code>, <code className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">posts</code>, <code className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">messages</code>, <code className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">user_skills</code>, and <code className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">certificates</code>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowDiagnostics(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              Test Database Connection
            </button>
          </div>
        </div>

        {/* Section 1: Appearance & Display */}
        <div className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">palette</span>
            Appearance & Visual Theme
          </h2>

          <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Dark Mode Atmosphere</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Switch between high-contrast light theme and eye-safe twilight dark theme.
              </p>
            </div>
            <button
              onClick={onToggleDarkMode}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                darkMode ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <span className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          {/* Brand Logo Design Selector */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Brandmark Emblem Style</p>
                <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  Active Everywhere
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Select your preferred Brainboost animated vector emblem across the navbar, onboarding, and credentials.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Neural Surge */}
              <button
                type="button"
                onClick={() => handleSelectLogoStyle('surge')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center sm:items-start gap-2.5 ${
                  logoStyle === 'surge'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-xs ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <BrainboostLogo size={36} styleVariant="surge" animated={true} />
                  {logoStyle === 'surge' && (
                    <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-lg">
                      check_circle
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Neural Surge</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Kinetic 'B' mark with ascending supersonic jet blade
                  </div>
                </div>
              </button>

              {/* Option 2: Quantum Helix */}
              <button
                type="button"
                onClick={() => handleSelectLogoStyle('helix')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center sm:items-start gap-2.5 ${
                  logoStyle === 'helix'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-xs ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <BrainboostLogo size={36} styleVariant="helix" animated={true} />
                  {logoStyle === 'helix' && (
                    <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-lg">
                      check_circle
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Quantum Helix</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Continuous synaptic infinity ribbon with orbiting photon
                  </div>
                </div>
              </button>

              {/* Option 3: Cortex Prism */}
              <button
                type="button"
                onClick={() => handleSelectLogoStyle('prism')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center sm:items-start gap-2.5 ${
                  logoStyle === 'prism'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-xs ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <BrainboostLogo size={36} styleVariant="prism" animated={true} />
                  {logoStyle === 'prism' && (
                    <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-lg">
                      check_circle
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Cortex Prism</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Faceted geometric neural crystal with apex beam
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Compact Navigation Density</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Display tighter margins and smaller card padding for dense workstation setups.
              </p>
            </div>
            <button
              onClick={() => handleToggle('compactMode')}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                settings.compactMode ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <span className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>
        </div>

        {/* Section 2: AI & Nebula Bot Configuration */}
        <div className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">smart_toy</span>
            Nebula AI & Model Intelligence
          </h2>

          <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Thinking Mode (Reasoning Engine)</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Display step-by-step chain-of-thought analysis in AI Chat and recommendations.
              </p>
            </div>
            <button
              onClick={() => handleToggle('aiThinkingMode')}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                settings.aiThinkingMode ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <span className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Automated ATS Resume Telemetry</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Continuously recalculate your ATS score when adding new skills or completing courses.
              </p>
            </div>
            <button
              onClick={() => handleToggle('autoAtsAnalysis')}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                settings.autoAtsAnalysis ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <span className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>
        </div>

        {/* Section 3: Privacy & Security */}
        <div className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">shield</span>
            Privacy, Recruiter Visibility & Scam Shield
          </h2>

          <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Recruiter Discovery Spotlight</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Allow verified tech recruiters from Google, Microsoft, and startups to message you directly.
              </p>
            </div>
            <button
              onClick={() => handleToggle('recruiterVisibility')}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                settings.recruiterVisibility ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <span className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Real-Time Scam & Fraud Shield</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Automatically verify company domains and job offer authenticity in the background.
              </p>
            </div>
            <button
              onClick={() => handleToggle('fraudAlerts')}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                settings.fraudAlerts ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <span className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>
        </div>

        {/* Section 4: Maintenance & Danger Zone */}
        <div className="bg-white dark:bg-[#151f38] border border-red-200 dark:border-red-900/50 rounded-3xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
            <span className="material-symbols-outlined">warning</span>
            Simulation & Cache Controls
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Reset local simulated mock state, clear cached webinar RSVPs, or test clean user onboarding.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleResetData}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Reset Application Cache
            </button>
            <button
              onClick={() => onNavigate('auth')}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Sign Out to Login Screen
            </button>
          </div>
        </div>
      </div>

      <SupabaseDiagnosticsModal
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
      />
    </div>
  );
};
