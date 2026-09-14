import React, { useState } from 'react';
import { UserProfile, SkillItem, ViewType } from '../types';
import { NEBULA_LOGO_URL } from '../data/mockData';

interface SmartCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  skills: SkillItem[];
  onNavigate: (view: ViewType) => void;
}

export const SmartCopilotDrawer: React.FC<SmartCopilotDrawerProps> = ({
  isOpen,
  onClose,
  user,
  skills,
  onNavigate,
}) => {
  const [jobDescription, setJobDescription] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<{
    matchScore: number;
    matchSummary: string;
    matchedKeywords: string[];
    missingKeywords: string[];
    actionRoadmap: string[];
    coverLetterSnippet: string;
  } | null>(null);

  if (!isOpen) return null;

  const sampleJDs = [
    {
      title: 'Google - Software Engineering Intern (Frontend/Full Stack)',
      text: `Requirements:
• Experience with modern JavaScript/TypeScript and React 19.
• Solid grasp of data structures, algorithms, and RESTful web architectures.
• Hands-on familiarity with Docker containers, CI/CD pipelines, and cloud hosting.
• Understanding of web performance, accessibility (WCAG), and responsive layouts.`,
    },
    {
      title: 'Stripe - Backend & Distributed Infrastructure Intern',
      text: `Requirements:
• Strong foundation in Node.js, Express, and asynchronous event loops.
• Experience designing relational database schemas with PostgreSQL or MySQL.
• Knowledge of Redis caching, rate limiting, and secure authentication (OAuth/JWT).
• Experience writing modular unit and integration tests.`,
    },
  ];

  const handleRunAnalysis = (textToAnalyze?: string) => {
    const text = textToAnalyze || jobDescription;
    if (!text.trim()) return;

    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);

      // Dynamic keyword matching based on actual user skills
      const userSkillNames = skills.map((s) => s.name.toLowerCase());
      const lower = text.toLowerCase();

      const matched: string[] = [];
      const missing: string[] = [];

      ['react', 'typescript', 'javascript', 'node.js', 'postgresql', 'tailwind css', 'git', 'rest apis'].forEach((kw) => {
        if (lower.includes(kw.toLowerCase())) {
          if (userSkillNames.some((sn) => sn.includes(kw) || kw.includes(sn))) {
            matched.push(kw.toUpperCase());
          } else {
            missing.push(kw.toUpperCase());
          }
        }
      });

      ['docker', 'kubernetes', 'ci/cd', 'redis', 'graphql', 'vitest', 'unit testing'].forEach((kw) => {
        if (lower.includes(kw)) {
          missing.push(kw.toUpperCase());
        }
      });

      const calculatedScore = Math.min(
        96,
        Math.max(68, Math.round(75 + (matched.length - missing.length) * 4))
      );

      setAnalysisResult({
        matchScore: calculatedScore,
        matchSummary: `Your profile matches ${calculatedScore}% of the core technical requirements for this role. You are a strong candidate in Frontend & Core Web Stack, but closing Docker & CI/CD gaps will place you in the top 3% percentile.`,
        matchedKeywords: matched.length ? matched : ['REACT', 'TYPESCRIPT', 'REST APIS'],
        missingKeywords: missing.length ? missing : ['DOCKER COMPOSE', 'CI/CD PIPELINES'],
        actionRoadmap: [
          'Day 1-2: Complete the "Docker Containerization for Modern Apps" interactive module.',
          'Day 3-4: Containerize your full-stack portfolio app and push images to GitHub Registry.',
          'Day 5-6: Setup a GitHub Actions workflow with automated linter and build tests.',
          'Day 7: Re-export your ATS resume with the newly verified project links.',
        ],
        coverLetterSnippet: `Dear Hiring Team,\n\nI am thrilled to submit my application for this role. As a ${user.degree} student at ${user.college} with an active ${user.overallReadiness}% industry readiness score, I specialize in building responsive TypeScript and React applications with clean architecture and performant API layers. My hands-on projects showcase scalable full-stack features, and I look forward to contributing to your engineering culture.\n\nWarm regards,\n${user.name}`,
      });
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-[#11192e] h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 overflow-y-auto">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center overflow-hidden border border-white/30 shadow-xs">
              <img
                src={NEBULA_LOGO_URL}
                alt="AI Copilot"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                AI Career Copilot & Job Matcher
              </h2>
              <p className="text-xs text-blue-100 font-medium">
                Real-Time ATS Resume Scanner & 7-Day Sprint Generator
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 text-xs">
          {/* Quick Presets */}
          <div className="space-y-2">
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
              Try a Real-World Job Description Preset:
            </span>
            <div className="flex flex-wrap gap-2">
              {sampleJDs.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setJobDescription(sample.text);
                    handleRunAnalysis(sample.text);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors cursor-pointer text-left truncate max-w-full"
                >
                  📄 {sample.title}
                </button>
              ))}
            </div>
          </div>

          {/* Job Description Textarea */}
          <div className="space-y-2">
            <label className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Paste Job Description to Analyze:</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Matches against your active resume & verified skills
              </span>
            </label>
            <textarea
              rows={4}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste job posting requirements here..."
              className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Action Button */}
          <button
            onClick={() => handleRunAnalysis()}
            disabled={isAnalyzing || !jobDescription.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">autorenew</span>
                Parsing Job Specs & Simulating ATS Engine...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">query_stats</span>
                Analyze Match & Generate 7-Day Sprint Plan
              </>
            )}
          </button>

          {/* Results Display */}
          {analysisResult && (
            <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800 animate-fade-in">
              {/* ATS Score Card */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-3xl space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-300">
                      Real-Time ATS Match Score
                    </span>
                    <h4 className="text-2xl font-black">{analysisResult.matchScore}% Match</h4>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 font-black text-lg">
                    {analysisResult.matchScore}%
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {analysisResult.matchSummary}
                </p>
              </div>

              {/* Keywords Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">
                    ✓ Verified In Your Profile
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {analysisResult.matchedKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase block">
                    ⚠️ Missing Requisite Keywords
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {analysisResult.missingKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[10px] font-bold"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Sprint */}
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-blue-600 text-[18px]">bolt</span>
                  Custom 7-Day Qualification Sprint
                </h4>
                <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                  {analysisResult.actionRoadmap.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs">
                      <span className="text-blue-600 font-bold">→</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* AI Tailored Pitch */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    AI-Tailored Cover Letter Intro:
                  </h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(analysisResult.coverLetterSnippet);
                      alert('Cover letter copied to clipboard!');
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    Copy Text
                  </button>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono whitespace-pre-line leading-relaxed">
                  {analysisResult.coverLetterSnippet}
                </div>
              </div>

              {/* Navigation Action */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onNavigate('courses');
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Start Closing Gaps Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
