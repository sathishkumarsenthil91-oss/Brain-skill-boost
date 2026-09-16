import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { ViewType, UserProfile, SkillItem, RoadmapNode } from './types';
import { initialUserProfile, initialSkills, initialRoadmapNodes } from './data/mockData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AuthView } from './components/AuthView';
import { LandingHero } from './components/LandingHero';
import { DashboardView } from './components/DashboardView';
import { supabase } from './supabaseClient';
import { supabaseService } from './services/supabaseService';

// Lazy load secondary views for instant initial paint and minimal bundle footprint
const ProfileView = lazy(() => import('./components/ProfileView').then((m) => ({ default: m.ProfileView })));
const SkillsView = lazy(() => import('./components/SkillsView').then((m) => ({ default: m.SkillsView })));
const SkillGapView = lazy(() => import('./components/SkillGapView').then((m) => ({ default: m.SkillGapView })));
const AIRecommendationsView = lazy(() => import('./components/AIRecommendationsView').then((m) => ({ default: m.AIRecommendationsView })));
const CoursesView = lazy(() => import('./components/CoursesView').then((m) => ({ default: m.CoursesView })));
const IndustryToolsView = lazy(() => import('./components/IndustryToolsView').then((m) => ({ default: m.IndustryToolsView })));
const CertificationsView = lazy(() => import('./components/CertificationsView').then((m) => ({ default: m.CertificationsView })));
const OpportunitiesView = lazy(() => import('./components/OpportunitiesView').then((m) => ({ default: m.OpportunitiesView })));
const ConnectivitySubsection = lazy(() => import('./components/ConnectivitySubsection').then((m) => ({ default: m.ConnectivitySubsection })));
const WebinarsView = lazy(() => import('./components/WebinarsView').then((m) => ({ default: m.WebinarsView })));
const NebulaAIChat = lazy(() => import('./components/NebulaAIChat').then((m) => ({ default: m.NebulaAIChat })));
const AssignmentsView = lazy(() => import('./components/AssignmentsView').then((m) => ({ default: m.AssignmentsView })));
const SafetyCenterView = lazy(() => import('./components/SafetyCenterView').then((m) => ({ default: m.SafetyCenterView })));
const SettingsView = lazy(() => import('./components/SettingsView').then((m) => ({ default: m.SettingsView })));
const RoadmapView = lazy(() => import('./components/RoadmapView').then((m) => ({ default: m.RoadmapView })));
const OnboardingWizard = lazy(() => import('./components/OnboardingWizard').then((m) => ({ default: m.OnboardingWizard })));
const SmartCopilotDrawer = lazy(() => import('./components/SmartCopilotDrawer').then((m) => ({ default: m.SmartCopilotDrawer })));
const LoginModal = lazy(() => import('./components/LoginModal').then((m) => ({ default: m.LoginModal })));

function ViewLoadingFallback() {
  return (
    <div className="pt-28 pb-24 max-w-7xl mx-auto px-4 flex flex-col items-center justify-center min-h-[350px]">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-3 text-xs font-medium text-slate-400">Loading module...</p>
    </div>
  );
}

// Helper to parse view from URL hash/state
function getViewFromLocation(): ViewType | null {
  try {
    const hash = window.location.hash.replace('#', '').trim();
    if (hash) {
      const normalized = hash === 'network' ? 'connectivity' : hash;
      return normalized as ViewType;
    }
    if (window.history.state?.view) {
      const stateView = window.history.state.view;
      return (stateView === 'network' ? 'connectivity' : stateView) as ViewType;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export default function App() {
  const [serviceError, setServiceError] = useState('');
  useEffect(() => {
    const handleError = (event: Event) => setServiceError((event as CustomEvent<string>).detail);
    window.addEventListener('service-error', handleError);
    return () => window.removeEventListener('service-error', handleError);
  }, []);

  // Check for existing saved session
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('industryskill_auth_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error(err);
    }
    return initialUserProfile;
  });

  // Starting page is Auth view with Login and Register forms if no session exists, else dashboard or deep-linked view
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    try {
      const locationView = getViewFromLocation();
      const saved = localStorage.getItem('industryskill_auth_user');
      if (saved) {
        if (locationView) return locationView;
        const lastView = localStorage.getItem('industryskill_last_view');
        if (lastView) return (lastView === 'network' ? 'connectivity' : lastView) as ViewType;
        return 'dashboard';
      } else if (locationView) {
        return locationView;
      }
    } catch (err) {
      console.error(err);
    }
    return 'auth';
  });

  const [skills, setSkills] = useState<SkillItem[]>(initialSkills);
  const [roadmapNodes, setRoadmapNodes] = useState<RoadmapNode[]>(initialRoadmapNodes);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('brainboost_theme') || localStorage.getItem('industryskill_theme');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark') ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch {
      return false;
    }
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [safetyInitialData, setSafetyInitialData] = useState<{ url: string; content: string }>({
    url: '',
    content: '',
  });

  // Sync dark mode class with root html element and localStorage
  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('brainboost_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('brainboost_theme', 'light');
      }
    } catch (e) {
      // ignore
    }
  }, [isDarkMode]);

  // Load real user skills & roadmap whenever user profile changes
  useEffect(() => {
    if (user && user.email) {
      supabaseService.getUserSkills(user).then((loadedSkills) => {
        if (Array.isArray(loadedSkills) && loadedSkills.length > 0) {
          setSkills(loadedSkills);
        }
      }).catch(console.error);
      supabaseService.getUserRoadmap(user).then((loadedNodes) => {
        if (Array.isArray(loadedNodes) && loadedNodes.length > 0) {
          setRoadmapNodes(loadedNodes);
        }
      }).catch(console.error);
    }
  }, [user.email, user.targetRole]);

  // Sync Supabase Auth session (handles Google OAuth callback redirects and persisted sessions)
  useEffect(() => {
    // Check initial active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { localStorage.removeItem('industryskill_auth_user'); setUser(initialUserProfile); setCurrentView('auth'); }
      if (session?.user) {
        const email = session.user.email || '';
        const meta = session.user.user_metadata || {};
        const name = meta.full_name || meta.name || email.split('@')[0] || 'Verified Student';
        handleLoginSuccess(name, email, {
          avatarUrl: meta.avatar_url || meta.picture,
          college: meta.college,
          targetRole: meta.target_role,
        });
        const dest = getViewFromLocation() || 'dashboard';
        setCurrentView((prev) => (prev === 'auth' || prev === 'login' || prev === 'register' ? dest : prev));
      }
    });

    // Listen to Supabase auth events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { localStorage.removeItem('industryskill_auth_user'); setUser(initialUserProfile); setSkills([]); setRoadmapNodes([]); setCurrentView('auth'); }
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        const email = session.user.email || '';
        const meta = session.user.user_metadata || {};
        const name = meta.full_name || meta.name || email.split('@')[0] || 'Verified Student';
        handleLoginSuccess(name, email, {
          avatarUrl: meta.avatar_url || meta.picture,
          college: meta.college,
          targetRole: meta.target_role,
        });
        const dest = getViewFromLocation() || 'dashboard';
        setCurrentView((prev) => (prev === 'auth' || prev === 'login' || prev === 'register' ? dest : prev));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Listen to browser Back/Forward navigation and URL hash changes
  useEffect(() => {
    const handleLocationPop = (e: PopStateEvent) => {
      const locView = getViewFromLocation();
      if (locView) {
        setCurrentView(locView);
      } else if (e.state?.view) {
        const target = (e.state.view === 'network' ? 'connectivity' : e.state.view) as ViewType;
        setCurrentView(target);
      } else {
        const saved = localStorage.getItem('industryskill_auth_user');
        setCurrentView(saved ? 'dashboard' : 'auth');
      }
    };

    window.addEventListener('popstate', handleLocationPop);
    window.addEventListener('hashchange', handleLocationPop);
    return () => {
      window.removeEventListener('popstate', handleLocationPop);
      window.removeEventListener('hashchange', handleLocationPop);
    };
  }, []);

  const handleToggleTheme = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  const handleNavigate = useCallback((view: ViewType) => {
    const target = (view === 'network' ? 'connectivity' : view) as ViewType;
    setCurrentView(target);
    try {
      localStorage.setItem('industryskill_last_view', target);
      const targetHash = target === 'dashboard' ? '' : `#${target}`;
      if (window.location.hash !== targetHash) {
        window.history.pushState({ view: target }, '', targetHash || window.location.pathname);
      }
    } catch (e) {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleScanOpportunityInSafetyCenter = useCallback((url: string, content: string) => {
    setSafetyInitialData({ url, content });
    setCurrentView('safety');
  }, []);

  const handleUpdateProfile = useCallback((updated: Partial<UserProfile>) => {
    setUser((prev) => {
      const nextUser = { ...prev, ...updated };
      try {
        localStorage.setItem('industryskill_auth_user', JSON.stringify(nextUser));
        if (nextUser.email) {
          localStorage.setItem(`industryskill_profile_${nextUser.email.toLowerCase()}`, JSON.stringify(nextUser));
        }
      } catch (err) {
        console.error(err);
      }
      // Async sync to Supabase database profiles table
      supabaseService.syncUserProfile(nextUser).catch((e) => console.warn('Supabase profile sync error:', e));
      return nextUser;
    });
  }, []);

  const handleUpdateSkills = useCallback((newSkills: SkillItem[]) => {
    setSkills(newSkills);
    supabaseService.saveUserSkills(newSkills, user);
  }, [user]);

  const handleUpdateRoadmap = useCallback((newNodes: RoadmapNode[]) => {
    setRoadmapNodes(newNodes);
    supabaseService.saveUserRoadmap(newNodes, user);
  }, [user]);

  const handleLoginSuccess = async (name: string, email: string, additionalData?: Partial<UserProfile>) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    let existingProfile: Partial<UserProfile> = {};
    try {
      const raw = localStorage.getItem(`industryskill_profile_${cleanEmail}`);
      if (raw) existingProfile = JSON.parse(raw);
    } catch (err) {
      console.error(err);
    }

    const nextUser: UserProfile = {
      ...initialUserProfile,
      ...existingProfile,
      name: name || existingProfile.name || (cleanEmail ? cleanEmail.split('@')[0] : 'Student Developer'),
      email: cleanEmail || '',
      ...(additionalData || {}),
    };

    try {
      localStorage.setItem('industryskill_auth_user', JSON.stringify(nextUser));
      if (cleanEmail) {
        localStorage.setItem(`industryskill_profile_${cleanEmail}`, JSON.stringify(nextUser));
      }
    } catch (err) {
      console.error(err);
    }

    setUser(nextUser);

    // Fetch and sync with Supabase public.profiles table
    try {
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (dbProfile) {
        const merged: UserProfile = {
          ...nextUser,
          id: dbProfile.id,
          username: dbProfile.username,
          userId: dbProfile.user_id_handle,
          connectivitySetupCompleted: dbProfile.connectivity_setup_completed,
          name: dbProfile.name || nextUser.name,
          avatarUrl: dbProfile.avatar_url || nextUser.avatarUrl,
          college: dbProfile.college || nextUser.college,
          degree: dbProfile.degree || nextUser.degree,
          gradYear: dbProfile.grad_year || nextUser.gradYear,
          targetRole: dbProfile.target_role || nextUser.targetRole,
          headline: dbProfile.headline || nextUser.headline,
          bio: dbProfile.bio || nextUser.bio,
        };
        try {
          localStorage.setItem('industryskill_auth_user', JSON.stringify(merged));
          localStorage.setItem(`industryskill_profile_${cleanEmail}`, JSON.stringify(merged));
        } catch (e) {
          // ignore
        }
        setUser(merged);
        const realSkills = await supabaseService.getUserSkills(merged);
        if (Array.isArray(realSkills) && realSkills.length > 0) {
          setSkills(realSkills);
        }
      } else {
        // Upsert initial profile into Supabase
        await supabaseService.syncUserProfile(nextUser);
      }
    } catch (err) {
      console.warn('Notice loading Supabase profile:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error(err);
    }
    try {
      localStorage.removeItem('industryskill_auth_user');
    } catch (err) {
      console.error(err);
    }
    setUser(initialUserProfile);
    setCurrentView('auth');
  };

  // If on Auth starting view, render AuthView cleanly
  if (currentView === 'auth' || currentView === 'login' || currentView === 'register') {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1329] text-[#0f172a] dark:text-[#f8fafc] transition-colors duration-200">
        <AuthView
          initialMode={currentView === 'register' ? 'register' : 'login'}
          onLoginSuccess={handleLoginSuccess}
          onNavigate={handleNavigate}
          isDarkMode={isDarkMode}
          onToggleTheme={handleToggleTheme}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1329] text-[#0f172a] dark:text-[#f8fafc] transition-colors duration-200">
      {serviceError && <div role="alert" className="fixed bottom-20 left-4 right-4 z-[100] rounded-xl bg-red-50 p-4 text-red-800 shadow-lg">
        {serviceError}<button className="ml-4 underline" onClick={() => setServiceError('')}>Dismiss</button>
      </div>}
      {/* Top Header Bar with Mega Menu */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        user={user}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={handleSignOut}
        onOpenCopilot={() => setIsCopilotOpen(true)}
      />

      {/* Main View Router for all 14 sections */}
      <div className="w-full">
        {currentView === 'landing' && (
          <LandingHero onNavigate={handleNavigate} user={user} />
        )}

        {/* 1. Dashboard (Instant Paint) */}
        {currentView === 'dashboard' && (
          <DashboardView
            user={user}
            skills={skills}
            onNavigate={handleNavigate}
            onSelectSkillForLearning={() => setCurrentView('courses')}
            onOpenCopilot={() => setIsCopilotOpen(true)}
          />
        )}

        {/* Suspense Container for Lazy Views */}
        <Suspense fallback={<ViewLoadingFallback />}>
          {/* 2. My Profile */}
          {currentView === 'profile' && (
            <div className="pt-20 md:pt-24 pb-24">
              <ProfileView
                user={user}
                skills={skills}
                onUpdateProfile={handleUpdateProfile}
                onNavigate={handleNavigate}
              />
            </div>
          )}

          {/* 3. My Skills */}
          {currentView === 'skills' && (
            <div className="pt-20 md:pt-24 pb-24">
              <SkillsView
                user={user}
                skills={skills}
                onNavigate={handleNavigate}
                onUpdateSkills={handleUpdateSkills}
              />
            </div>
          )}

          {/* 4. Skill Gap Analysis */}
          {currentView === 'skill-gap' && (
            <div className="pt-20 md:pt-24 pb-24">
              <SkillGapView
                user={user}
                skills={skills}
                onNavigate={handleNavigate}
              />
            </div>
          )}

          {/* 5. AI Recommendations */}
          {currentView === 'ai-recommendations' && (
            <div className="pt-20 md:pt-24 pb-24">
              <AIRecommendationsView
                user={user}
                onNavigate={handleNavigate}
              />
            </div>
          )}

          {/* 6. Courses & YouTube Skill Tracks */}
          {currentView === 'courses' && (
            <div className="pt-20 md:pt-24 pb-24">
              <CoursesView
                user={user}
                onNavigate={handleNavigate}
                onUpdateUser={handleUpdateProfile}
                onAskNebulaAI={(prompt) => {
                  handleNavigate('nebula');
                }}
              />
            </div>
          )}

          {/* 7. Industry Tools */}
          {currentView === 'industry-tools' && (
            <div className="pt-20 md:pt-24 pb-24">
              <IndustryToolsView onNavigate={handleNavigate} />
            </div>
          )}

          {/* 8. Certifications */}
          {currentView === 'certifications' && (
            <div className="pt-20 md:pt-24 pb-24">
              <CertificationsView onNavigate={handleNavigate} />
            </div>
          )}

          {/* 9. Internships & Jobs */}
          {currentView === 'opportunities' && (
            <div className="pt-20 md:pt-24 pb-24">
              <OpportunitiesView
                user={user}
                onNavigate={handleNavigate}
                onUpdateUser={handleUpdateProfile}
                onScanOpportunityInSafetyCenter={handleScanOpportunityInSafetyCenter}
              />
            </div>
          )}

          {/* 9b. Professional Career Network & Connectivity - Full-Page View */}
          {(currentView === 'network' || currentView === 'connectivity') && (
            <main className="w-full min-h-screen pt-16">
              <ConnectivitySubsection
                user={user}
                onNavigate={handleNavigate}
                onUpdateUser={handleUpdateProfile}
              />
            </main>
          )}

          {/* 10. Webinars */}
          {currentView === 'webinars' && (
            <div className="pt-20 md:pt-24 pb-24">
              <WebinarsView
                user={user}
                onNavigate={handleNavigate}
                onUpdateUser={handleUpdateProfile}
              />
            </div>
          )}

          {/* 11. AI Chatbot (Nebula) */}
          {currentView === 'nebula' && (
            <NebulaAIChat user={user} onNavigate={handleNavigate} />
          )}

          {/* 12. Assignments */}
          {currentView === 'assignments' && (
            <div className="pt-20 md:pt-24 pb-24">
              <AssignmentsView user={user} onNavigate={handleNavigate} />
            </div>
          )}

          {/* 13. Fraud Detection (Safety Center) */}
          {currentView === 'safety' && (
            <div className="pt-20 md:pt-24 pb-24">
              <SafetyCenterView
                initialUrl={safetyInitialData.url}
                initialContent={safetyInitialData.content}
                onNavigate={handleNavigate}
              />
            </div>
          )}

          {/* 14. Settings */}
          {currentView === 'settings' && (
            <div className="pt-20 md:pt-24 pb-24">
              <SettingsView
                user={user}
                darkMode={isDarkMode}
                onToggleDarkMode={handleToggleTheme}
                onNavigate={handleNavigate}
              />
            </div>
          )}

          {/* Roadmap Secondary View */}
          {currentView === 'roadmap' && (
            <div className="pt-20 md:pt-24 pb-24">
              <RoadmapView
                user={user}
                nodes={roadmapNodes}
                onNavigate={handleNavigate}
                onUpdateNodes={handleUpdateRoadmap}
              />
            </div>
          )}

          {/* Onboarding Wizard */}
          {currentView === 'onboarding' && (
            <OnboardingWizard
              user={user}
              onComplete={handleUpdateProfile}
              onNavigate={handleNavigate}
            />
          )}

          {/* Smart Copilot Drawer (Best Feature) */}
          <SmartCopilotDrawer
            isOpen={isCopilotOpen}
            onClose={() => setIsCopilotOpen(false)}
            user={user}
            skills={skills}
            onNavigate={handleNavigate}
          />

          {/* Authentication Login Modal */}
          <LoginModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
            onNavigate={handleNavigate}
            onLoginSuccess={handleLoginSuccess}
          />
        </Suspense>
      </div>

      {/* Floating Action Buttons */}
      {currentView !== 'nebula' && (
        <div className="fixed bottom-20 md:bottom-8 right-5 z-40 flex flex-col gap-3">
          {/* Floating Copilot Button */}
          <button
            onClick={() => setIsCopilotOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-3.5 rounded-full shadow-2xl hover:scale-110 transition-transform cursor-pointer flex items-center justify-center border-2 border-white dark:border-slate-800"
            title="Open AI Job Copilot & Resume ATS Scanner"
          >
            <span className="material-symbols-outlined text-[22px]">auto_fix_high</span>
          </button>
        </div>
      )}

      {/* Bottom Navigation Bar for Mobile */}
      <BottomNav currentView={currentView} onNavigate={handleNavigate} />
    </div>
  );
}
