import React, { useState } from 'react';
import { ViewType, UserProfile } from '../types';
import { GoogleLogo } from './GoogleLogo';
import { BrainboostLogo } from './BrainboostLogo';
import { supabase } from '../supabaseClient';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewType) => void;
  onLoginSuccess: (name: string, email: string, additionalData?: Partial<UserProfile>) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onLoginSuccess,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCollege, setRegCollege] = useState('');
  const [regRole, setRegRole] = useState('Full Stack Developer');
  const [regPassword, setRegPassword] = useState('');

  // Error & loading state
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    const email = loginEmail.trim().toLowerCase();
    const password = loginPassword;
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      let savedProfile: any = null;
      try {
        const raw = localStorage.getItem(`industryskill_profile_${email}`);
        if (raw) savedProfile = JSON.parse(raw);
      } catch (err) {
        console.error(err);
      }

      const userMeta = data?.user?.user_metadata || {};
      const inferredName =
        userMeta.full_name ||
        userMeta.name ||
        savedProfile?.name ||
        email
          .split('@')[0]
          .split(/[._-]/)
          .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(' ');

      onLoginSuccess(inferredName, email, {
        ...savedProfile,
        name: inferredName,
        email: email,
        college: userMeta.college || savedProfile?.college,
        targetRole: userMeta.target_role || savedProfile?.targetRole,
      });

      onClose();
      // Redirect user to Home page ("/")
      window.history.pushState({}, '', '/');
      onNavigate('dashboard');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const name = regName.trim();
    const email = regEmail.trim().toLowerCase();
    const password = regPassword;

    if (!name || !email || !password) {
      setErrorMessage('Please fill out all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            college: regCollege.trim() || 'University Institute of Technology',
            target_role: regRole,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      const newProfileData: Partial<UserProfile> = {
        name,
        email,
        college: regCollege.trim() || 'University Institute of Technology',
        targetRole: regRole,
        degree: 'B.Tech / Bachelor of Science',
        gradYear: '2026',
      };

      try {
        localStorage.setItem(`industryskill_profile_${email}`, JSON.stringify(newProfileData));
      } catch (err) {
        console.error(err);
      }

      // Do NOT auto-login. Redirect user to Sign In tab, pre-fill email, and show success message.
      setLoginEmail(email);
      setLoginPassword('');
      setRegPassword('');
      setTab('login');
      setSuccessMessage('Your account has been created. Please check your email and verify your address before logging in.');
      setErrorMessage('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to register.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to initiate Google sign in.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#151f38] rounded-3xl p-6 sm:p-8 max-w-md w-full neu-raised border border-slate-200 dark:border-slate-800 relative animate-in zoom-in-95 duration-200 my-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer"
        >
          ✕
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="mb-2.5">
            <BrainboostLogo size="xl" animated={true} />
          </div>
          <h2 className="text-[22px] font-black text-slate-900 dark:text-white">
            {tab === 'login' ? 'Sign In to Brainboost' : 'Create Brainboost Account'}
          </h2>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
            {tab === 'login'
              ? 'Access your skill gap analysis and accelerated career path.'
              : 'Start learning industry skills and exploring verified internships.'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-[#0d1527] rounded-2xl mb-5 neu-inset border border-slate-200/50 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMessage('');
            }}
            className={`py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-white dark:bg-[#1e293b] text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
              tab === 'register'
                ? 'bg-white dark:bg-[#1e293b] text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Register
          </button>
        </div>

        {/* Success Message Banner */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-[13px] flex items-start gap-2 shadow-xs">
            <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              check_circle
            </span>
            <span className="leading-snug font-medium">{successMessage}</span>
          </div>
        )}

        {/* Error Message Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-[13px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-red-500 shrink-0">
              error
            </span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        {tab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 text-[14px] text-slate-900 dark:text-white neu-inset outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <a href="#forgot" className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 text-[14px] text-slate-900 dark:text-white neu-inset outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="neu-btn-primary w-full py-3 rounded-xl text-[14px] font-bold cursor-pointer mt-1 flex items-center justify-center gap-2"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>

            {errorMessage && (
              <p className="text-red-500 dark:text-red-400 text-xs text-center font-medium mt-2">
                {errorMessage}
              </p>
            )}
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Alex Morgan"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-[14px] text-slate-900 dark:text-white neu-inset outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="student@university.edu"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-[14px] text-slate-900 dark:text-white neu-inset outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  College
                </label>
                <input
                  type="text"
                  placeholder="e.g. NIT"
                  value={regCollege}
                  onChange={(e) => setRegCollege(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-[13px] text-slate-900 dark:text-white neu-inset outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Target Role
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-700/80 rounded-xl px-2 py-2 text-[12px] text-slate-900 dark:text-white outline-none focus:border-blue-500"
                >
                  <option value="Full Stack Developer">Full Stack</option>
                  <option value="Frontend Specialist">Frontend</option>
                  <option value="Backend Engineer">Backend</option>
                  <option value="AI Engineer">AI Engineer</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="Min 6 characters"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-[13px] text-slate-900 dark:text-white neu-inset outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="neu-btn-primary w-full py-3 rounded-xl text-[14px] font-bold cursor-pointer mt-1 flex items-center justify-center gap-2"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>

            {errorMessage && (
              <p className="text-red-500 dark:text-red-400 text-xs text-center font-medium mt-2">
                {errorMessage}
              </p>
            )}
          </form>
        )}

        {/* BOTTOM SECTION: GOOGLE AUTH BUTTON */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              OR
            </span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 hover:border-blue-400 rounded-xl py-2.5 px-4 flex items-center justify-center gap-3 text-[14px] font-bold text-slate-800 dark:text-white neu-raised hover:scale-[0.99] transition-all cursor-pointer shadow-xs"
          >
            <GoogleLogo className="w-5 h-5 shrink-0" />
            <span>Continue with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
};

