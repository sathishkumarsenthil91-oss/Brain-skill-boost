import React, { useState } from 'react';
import { ViewType, UserProfile } from '../types';
import { GoogleLogo } from './GoogleLogo';
import { BrainboostLogo } from './BrainboostLogo';
import { supabase } from '../supabaseClient';

interface AuthViewProps {
  onLoginSuccess: (name: string, email: string, additionalData?: Partial<UserProfile>) => void;
  onNavigate: (view: ViewType) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthView: React.FC<AuthViewProps> = ({
  onLoginSuccess,
  onNavigate,
  isDarkMode,
  onToggleTheme,
  initialMode = 'login',
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  
  // Login State - pre-populate from URL query params if provided
  const [loginEmail, setLoginEmail] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('email') || params.get('registered_email') || '';
    } catch {
      return '';
    }
  });
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCollege, setRegCollege] = useState('');
  const [regRole, setRegRole] = useState('Full Stack Developer');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Notification / error / success state
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('signup') === 'success' || params.get('registered') === 'true') {
        return 'Your account has been created. Please check your email and verify your address before logging in.';
      }
    } catch {
      // ignore
    }
    return '';
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    const email = loginEmail.trim().toLowerCase();
    const password = loginPassword;

    if (!email) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
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

      // Ensure a real session exists
      if (!data?.session) {
        setErrorMessage('Check your email and confirm your account before logging in.');
        setIsLoading(false);
        return;
      }

      // Retrieve stored user profile if available, or generate dynamic profile from metadata/email
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

      // Redirect user to Home page ("/")
      window.history.pushState({}, '', '/');
      onNavigate('dashboard');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    const name = regName.trim();
    const email = regEmail.trim().toLowerCase();
    const password = regPassword;

    if (!name) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email) {
      setErrorMessage('Please enter a valid university or personal email.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== regConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('Please accept the Terms of Service to continue.');
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

      // Do NOT auto-login. Redirect user to the Sign In page/mode, pre-fill email, and display success message.
      setLoginEmail(email);
      setLoginPassword('');
      setRegPassword('');
      setRegConfirmPassword('');
      setAuthMode('login');
      setSuccessMessage('Your account has been created. Please check your email and verify your address before logging in.');
      setErrorMessage('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to sign up. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
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
      setErrorMessage(err?.message || 'Failed to initiate Google sign in. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#f8fafc] dark:bg-[#0b1329] text-[#0f172a] dark:text-[#f8fafc] transition-colors duration-200 relative px-4 py-6 sm:py-10">
      {/* Top Header bar with Theme Toggle */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between pb-4">
        <BrainboostLogo
          size="md"
          showText={true}
          subtitle="AI Career & Learning Acceleration"
          animated={true}
        />

        <div className="flex items-center gap-2">
          {/* Dark / Light Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151f38] text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 shadow-xs transition-colors cursor-pointer"
            title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle Theme"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="max-w-md w-full mx-auto my-auto py-4">
        <div className="bg-white dark:bg-[#151f38] rounded-3xl p-6 sm:p-8 neu-raised border border-slate-200/80 dark:border-slate-800 shadow-xl transition-all">
          
          {/* Brand Header */}
          <div className="text-center mb-6">
            <h1 className="text-[24px] sm:text-[26px] font-black text-slate-900 dark:text-white tracking-tight">
              {authMode === 'login' ? 'Sign In to Your Account' : 'Create Student Account'}
            </h1>
            <p className="text-[13px] sm:text-[14px] text-slate-500 dark:text-slate-400 mt-1">
              {authMode === 'login'
                ? 'Benchmark your industry skills & unlock verified internships.'
                : 'Join top students bridging university coursework to industry jobs.'}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-[#0d1527] rounded-2xl mb-6 neu-inset border border-slate-200/50 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`py-2.5 rounded-xl text-[13px] sm:text-[14px] font-bold transition-all cursor-pointer ${
                authMode === 'login'
                  ? 'bg-white dark:bg-[#1e293b] text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`py-2.5 rounded-xl text-[13px] sm:text-[14px] font-bold transition-all cursor-pointer ${
                authMode === 'register'
                  ? 'bg-white dark:bg-[#1e293b] text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Register
            </button>
          </div>

          {/* Success Message Box */}
          {successMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-[13px] flex items-start gap-2.5 shadow-xs">
              <span className="material-symbols-outlined text-[19px] text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                check_circle
              </span>
              <span className="leading-snug font-medium">{successMessage}</span>
            </div>
          )}

          {/* Error Message Box */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-[13px] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-red-500 shrink-0">
                error
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ================= LOGIN FORM ================= */}
          {authMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
                    mail
                  </span>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="student@university.edu"
                    required
                    className="w-full bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9.5 pr-3 py-2.5 text-[14px] text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all neu-inset"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('Password reset link sent to registered email!')}
                    className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
                    lock
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9.5 pr-10 py-2.5 text-[14px] text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all neu-inset"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 accent-blue-600"
                  />
                  <span className="text-[13px] text-slate-600 dark:text-slate-300">
                    Remember me
                  </span>
                </label>
              </div>

              {/* Primary Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="neu-btn-primary w-full py-3 rounded-xl text-[14px] font-bold cursor-pointer mt-2 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="material-symbols-outlined animate-spin text-[20px]">
                    progress_activity
                  </span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>

              {errorMessage && (
                <p className="text-red-500 dark:text-red-400 text-xs text-center font-medium mt-2">
                  {errorMessage}
                </p>
              )}
            </form>
          ) : (
            /* ================= REGISTER FORM ================= */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  required
                  className="w-full bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2 text-[14px] text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all neu-inset"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@university.edu"
                  required
                  className="w-full bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2 text-[14px] text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all neu-inset"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    College / University
                  </label>
                  <input
                    type="text"
                    value={regCollege}
                    onChange={(e) => setRegCollege(e.target.value)}
                    placeholder="e.g. NIT Trichy"
                    className="w-full bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2 text-[13px] text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all neu-inset"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Target Role
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-[13px] text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                  >
                    <option value="Full Stack Developer">Full Stack Developer</option>
                    <option value="Frontend Specialist">Frontend Specialist</option>
                    <option value="Backend & Cloud Engineer">Backend & Cloud</option>
                    <option value="AI Solutions Engineer">AI Solutions Engineer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    required
                    className="w-full bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2 text-[13px] text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all neu-inset"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    className="w-full bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2 text-[13px] text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all neu-inset"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 accent-blue-600"
                />
                <span className="text-[12px] text-slate-600 dark:text-slate-400 leading-tight">
                  I agree to the Career Matrix Terms & privacy policy.
                </span>
              </label>

              {/* Primary Register Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="neu-btn-primary w-full py-3 rounded-xl text-[14px] font-bold cursor-pointer mt-1 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="material-symbols-outlined animate-spin text-[20px]">
                    progress_activity
                  </span>
                ) : (
                  <>
                    <span>Create Free Account</span>
                    <span className="material-symbols-outlined text-[18px]">
                      check_circle
                    </span>
                  </>
                )}
              </button>

              {errorMessage && (
                <p className="text-red-500 dark:text-red-400 text-xs text-center font-medium mt-2">
                  {errorMessage}
                </p>
              )}
            </form>
          )}

          {/* ================= BOTTOM SECTION: GOOGLE AUTH ================= */}
          <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                {authMode === 'login' ? 'Or continue with' : 'Or sign up with'}
              </span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
            </div>

            {/* Google Authentication Button placed at the bottom */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl py-3 px-4 flex items-center justify-center gap-3 text-[14px] font-bold text-slate-800 dark:text-white shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <GoogleLogo className="w-5 h-5 shrink-0" />
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Footer toggle note */}
          <div className="mt-4 text-center">
            {authMode === 'login' ? (
              <p className="text-[13px] text-slate-500 dark:text-slate-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMessage('');
                  }}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-1"
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p className="text-[13px] text-slate-500 dark:text-slate-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage('');
                  }}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-1"
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>

        </div>
      </main>

      {/* Page Footer */}
      <footer className="text-center text-[12px] text-slate-400 dark:text-slate-600 py-3">
        © 2026 Brainboost AI • Accelerating Learning & High-Growth Tech Careers
      </footer>
    </div>
  );
};
