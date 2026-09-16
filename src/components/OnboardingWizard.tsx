import { apiFetch } from '../services/api';
import React, { useState } from 'react';
import { ViewType, UserProfile } from '../types';
import { NEBULA_LOGO_URL } from '../data/mockData';
import { BrainboostLogo } from './BrainboostLogo';

interface OnboardingWizardProps {
  user?: UserProfile;
  onComplete: (profile: Partial<UserProfile>) => void;
  onNavigate: (view: ViewType) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  user,
  onComplete,
  onNavigate,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState(user?.name || '');
  const [college, setCollege] = useState(user?.college || 'University Institute of Technology');
  const [degree, setDegree] = useState(user?.degree || 'B.Tech Computer Science');
  const [gradYear, setGradYear] = useState(user?.gradYear || '2026');
  const [targetRole, setTargetRole] = useState(user?.targetRole || 'Full Stack Developer');
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedinUrl || '');
  const [githubUrl, setGithubUrl] = useState(user?.githubUrl || '');
  const [urlErrors, setUrlErrors] = useState<{ linkedin?: string; github?: string }>({});
  const [selectedSkills, setSelectedSkills] = useState<string[]>([
    'HTML',
    'CSS',
    'JavaScript',
    'Git',
  ]);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const formatAndValidateUrl = (url: string, type: 'linkedin' | 'github'): { isValid: boolean; formatted: string; error?: string } => {
    const trimmed = url.trim();
    if (!trimmed) {
      return { isValid: true, formatted: '' };
    }

    let formatted = trimmed;
    if (!/^https?:\/\//i.test(formatted)) {
      formatted = `https://${formatted}`;
    }

    try {
      const parsed = new URL(formatted);
      if (type === 'linkedin') {
        if (!parsed.hostname.includes('linkedin.com')) {
          return { isValid: false, formatted, error: 'Please enter a valid LinkedIn URL (e.g. linkedin.com/in/username)' };
        }
      } else if (type === 'github') {
        if (!parsed.hostname.includes('github.com')) {
          return { isValid: false, formatted, error: 'Please enter a valid GitHub URL (e.g. github.com/username)' };
        }
      }
      return { isValid: true, formatted };
    } catch {
      return { isValid: false, formatted, error: `Invalid ${type === 'linkedin' ? 'LinkedIn' : 'GitHub'} URL format` };
    }
  };

  const handleStep2Continue = () => {
    const linkedinValidation = formatAndValidateUrl(linkedinUrl, 'linkedin');
    const githubValidation = formatAndValidateUrl(githubUrl, 'github');

    const newErrors: { linkedin?: string; github?: string } = {};
    if (!linkedinValidation.isValid) newErrors.linkedin = linkedinValidation.error;
    if (!githubValidation.isValid) newErrors.github = githubValidation.error;

    if (Object.keys(newErrors).length > 0) {
      setUrlErrors(newErrors);
      return;
    }

    setUrlErrors({});
    if (linkedinValidation.formatted) setLinkedinUrl(linkedinValidation.formatted);
    if (githubValidation.formatted) setGithubUrl(githubValidation.formatted);
    setStep(3);
  };

  const handleStep2Skip = () => {
    setUrlErrors({});
    setStep(3);
  };

  const availableSkills = [
    'HTML',
    'CSS',
    'JavaScript',
    'TypeScript',
    'React',
    'Node.js',
    'Express',
    'SQL',
    'PostgreSQL',
    'MongoDB',
    'Git',
    'Docker',
    'Python',
    'Figma',
    'GraphQL',
    'Next.js',
  ];

  const roleOptions = [
    { title: 'Full Stack Developer', desc: 'React, Node.js, REST APIs, Databases', match: '72% Initial Base' },
    { title: 'Frontend Specialist', desc: 'React, Next.js, Tailwind CSS, Performance', match: '80% Initial Base' },
    { title: 'Backend & Cloud Engineer', desc: 'Node.js, PostgreSQL, Docker, Microservices', match: '65% Initial Base' },
    { title: 'AI Solutions Engineer', desc: 'Python, Gemini API, Vector DBs, TypeScript', match: '58% Initial Base' },
  ];

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleFinishOnboarding = async () => {
    setStep(4);
    setIsSynthesizing(true);

    try {
      // Trigger AI roadmap synthesis
      await apiFetch('/api/ai/generate-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole,
          existingSkills: selectedSkills,
          degree,
          graduationYear: gradYear,
        }),
      });
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => {
      setIsSynthesizing(false);
      onComplete({
        name,
        college,
        degree,
        gradYear,
        targetRole,
        linkedinUrl: linkedinUrl.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
        overallReadiness: 72,
        matchedSkillsCount: selectedSkills.length,
      });
      onNavigate('dashboard');
    }, 2200);
  };

  return (
    <main className="pt-24 pb-28 px-4 sm:px-6 max-w-xl mx-auto flex flex-col items-center">
      {/* Brand Header */}
      <div className="mb-6">
        <BrainboostLogo
          size="md"
          showText={true}
          subtitle="Career & Learning Setup"
          animated={true}
        />
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8 w-full max-w-xs justify-center">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full transition-all ${
              step >= s ? 'bg-[#004ac6] dark:bg-[#60a5fa]' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Tell us about yourself */}
      {step === 1 && (
        <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-6 sm:p-8 w-full neu-raised space-y-5 animate-in fade-in">
          <div>
            <h2 className="text-[22px] font-bold text-[#121b2e] dark:text-white">
              Tell us about yourself
            </h2>
            <p className="text-[14px] text-[#434655] dark:text-[#c3c6d7] mt-0.5">
              Personalize your industry career readiness track.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[12px] font-bold text-[#434655] dark:text-[#c3c6d7] block mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#f9f9ff] dark:bg-slate-800 rounded-xl p-3 text-[14px] text-[#121b2e] dark:text-white neu-inset outline-none"
              />
            </div>

            <div>
              <label className="text-[12px] font-bold text-[#434655] dark:text-[#c3c6d7] block mb-1">
                College / University
              </label>
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="w-full bg-[#f9f9ff] dark:bg-slate-800 rounded-xl p-3 text-[14px] text-[#121b2e] dark:text-white neu-inset outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-bold text-[#434655] dark:text-[#c3c6d7] block mb-1">
                  Degree
                </label>
                <input
                  type="text"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  className="w-full bg-[#f9f9ff] dark:bg-slate-800 rounded-xl p-3 text-[14px] text-[#121b2e] dark:text-white neu-inset outline-none"
                />
              </div>
              <div>
                <label className="text-[12px] font-bold text-[#434655] dark:text-[#c3c6d7] block mb-1">
                  Grad Year
                </label>
                <input
                  type="text"
                  value={gradYear}
                  onChange={(e) => setGradYear(e.target.value)}
                  className="w-full bg-[#f9f9ff] dark:bg-slate-800 rounded-xl p-3 text-[14px] text-[#121b2e] dark:text-white neu-inset outline-none"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="neu-btn-primary w-full py-3.5 rounded-xl text-[14px] font-bold cursor-pointer mt-4"
          >
            Continue to Career Goals →
          </button>
        </div>
      )}

      {/* Step 2: Choose Target Role */}
      {step === 2 && (
        <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-6 sm:p-8 w-full neu-raised space-y-5 animate-in fade-in">
          <div>
            <h2 className="text-[22px] font-bold text-[#121b2e] dark:text-white">
              Choose your Target Role
            </h2>
            <p className="text-[14px] text-[#434655] dark:text-[#c3c6d7] mt-0.5">
              We calibrate your benchmark matrix against industry hiring requirements.
            </p>
          </div>

          <div className="space-y-3">
            {roleOptions.map((r, idx) => (
              <div
                key={idx}
                onClick={() => setTargetRole(r.title)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  targetRole === r.title
                    ? 'border-[#004ac6] bg-blue-50/70 dark:bg-blue-950/60 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:border-blue-300'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-[15px] font-bold text-[#121b2e] dark:text-white">
                    {r.title}
                  </h3>
                  <span className="text-[11px] font-bold text-[#004ac6] dark:text-[#60a5fa] bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-md">
                    {r.match}
                  </span>
                </div>
                <p className="text-[12px] text-[#434655] dark:text-[#c3c6d7]">
                  {r.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Optional Profile Links */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-bold text-[#434655] dark:text-[#c3c6d7] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-blue-600 dark:text-blue-400">link</span>
                Professional Links <span className="text-[11px] font-normal text-slate-400">(Optional)</span>
              </label>
              <span className="text-[11px] text-slate-400">Add now or skip</span>
            </div>

            <div className="space-y-2.5">
              <div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 text-xs font-bold select-none">in/</span>
                  <input
                    type="text"
                    value={linkedinUrl}
                    onChange={(e) => {
                      setLinkedinUrl(e.target.value);
                      if (urlErrors.linkedin) setUrlErrors((prev) => ({ ...prev, linkedin: undefined }));
                    }}
                    placeholder="https://linkedin.com/in/username (Optional)"
                    className={`w-full bg-[#f9f9ff] dark:bg-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-[13px] text-[#121b2e] dark:text-white neu-inset outline-none ${
                      urlErrors.linkedin ? 'border border-red-500' : ''
                    }`}
                  />
                </div>
                {urlErrors.linkedin && (
                  <p className="text-[11px] text-red-500 font-medium mt-1 pl-1">{urlErrors.linkedin}</p>
                )}
              </div>

              <div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 text-xs font-bold select-none">gh/</span>
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => {
                      setGithubUrl(e.target.value);
                      if (urlErrors.github) setUrlErrors((prev) => ({ ...prev, github: undefined }));
                    }}
                    placeholder="https://github.com/username (Optional)"
                    className={`w-full bg-[#f9f9ff] dark:bg-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-[13px] text-[#121b2e] dark:text-white neu-inset outline-none ${
                      urlErrors.github ? 'border border-red-500' : ''
                    }`}
                  />
                </div>
                {urlErrors.github && (
                  <p className="text-[11px] text-red-500 font-medium mt-1 pl-1">{urlErrors.github}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-3">
            <button
              onClick={() => setStep(1)}
              className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-bold text-[#434655] dark:text-[#c3c6d7] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleStep2Skip}
              className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleStep2Continue}
              className="neu-btn-primary flex-1 py-3 rounded-xl text-[14px] font-bold cursor-pointer"
            >
              Select Your Skills →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Select Current Skills */}
      {step === 3 && (
        <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-6 sm:p-8 w-full neu-raised space-y-5 animate-in fade-in">
          <div>
            <h2 className="text-[22px] font-bold text-[#121b2e] dark:text-white">
              What are your existing skills?
            </h2>
            <p className="text-[14px] text-[#434655] dark:text-[#c3c6d7] mt-0.5">
              Select any technologies you've worked with or learned in coursework.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 max-h-60 overflow-y-auto pr-1">
            {availableSkills.map((sk) => {
              const isSelected = selectedSkills.includes(sk);
              return (
                <button
                  key={sk}
                  onClick={() => toggleSkill(sk)}
                  className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#004ac6] text-white border-[#004ac6] shadow-sm'
                      : 'bg-[#f9f9ff] dark:bg-slate-800 text-[#121b2e] dark:text-white border-slate-200 dark:border-slate-700 hover:border-blue-300'
                  }`}
                >
                  {sk} {isSelected ? '✓' : '+'}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 pt-3">
            <button
              onClick={() => setStep(2)}
              className="py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-bold text-[#434655] dark:text-[#c3c6d7] cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleFinishOnboarding}
              className="neu-btn-primary flex-1 py-3 rounded-xl text-[14px] font-bold cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              Synthesize AI Career Path
            </button>
          </div>
        </div>
      )}

      {/* Step 4: AI Synthesis Animation Screen */}
      {step === 4 && (
        <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-8 w-full neu-raised text-center space-y-6 animate-in zoom-in-95">
          <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/80 mx-auto flex items-center justify-center ai-glow border-2 border-blue-200 dark:border-blue-800">
            <img
              src={NEBULA_LOGO_URL}
              alt="Nebula AI"
              className="w-full h-full object-cover rounded-full animate-bounce"
              referrerPolicy="no-referrer"
            />
          </div>

          <div>
            <h3 className="text-[22px] font-extrabold text-[#121b2e] dark:text-white mb-2">
              Gemini 3.1 Pro High Thinking Active
            </h3>
            <p className="text-[14px] text-[#434655] dark:text-[#c3c6d7] max-w-sm mx-auto leading-relaxed">
              Evaluating skill gaps, building your interactive milestone roadmap, and unlocking verified internships for {targetRole}...
            </p>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden neu-inset">
            <div className="bg-[#004ac6] dark:bg-[#60a5fa] h-full rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>
      )}
    </main>
  );
};
