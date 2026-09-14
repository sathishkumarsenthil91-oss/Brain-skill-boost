import React, { useState } from 'react';
import { ViewType, UserProfile, SkillItem } from '../types';

interface SkillsViewProps {
  user: UserProfile;
  skills: SkillItem[];
  onNavigate: (view: ViewType) => void;
  onUpdateSkills?: (skills: SkillItem[]) => void;
}

export const SkillsView: React.FC<SkillsViewProps> = ({
  user,
  skills: initialSkills,
  onNavigate,
  onUpdateSkills,
}) => {
  const [skills, setSkills] = useState<SkillItem[]>(initialSkills);
  const [filter, setFilter] = useState<'all' | 'foundation' | 'gap' | 'upcoming'>('all');
  const [selectedSkill, setSelectedSkill] = useState<SkillItem | null>(null);
  const [quizQuestion, setQuizQuestion] = useState<{ question: string; options: string[]; answer: number } | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');

  const filteredSkills = skills.filter((s) => {
    if (filter === 'all') return true;
    return s.category === filter;
  });

  const handleUpdateProficiency = (id: string, newProficiency: number) => {
    const updated = skills.map((s) => (s.id === id ? { ...s, proficiency: newProficiency } : s));
    setSkills(updated);
    if (onUpdateSkills) onUpdateSkills(updated);
  };

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    const newSkill: SkillItem = {
      id: `custom-${Date.now()}`,
      name: newSkillName.trim(),
      proficiency: 50,
      category: 'gap',
      priority: 'medium',
    };
    const updated = [...skills, newSkill];
    setSkills(updated);
    if (onUpdateSkills) onUpdateSkills(updated);
    setNewSkillName('');
  };

  const handleStartSkillQuiz = (skill: SkillItem) => {
    setSelectedSkill(skill);
    setSelectedOption(null);
    setShowQuizResult(false);

    // Dynamic quiz simulation
    if (skill.name === 'React') {
      setQuizQuestion({
        question: 'Which React hook should you use to run side effects after DOM mutation is complete?',
        options: ['useState', 'useLayoutEffect', 'useEffect', 'useMemo'],
        answer: 2,
      });
    } else if (skill.name === 'Node.js') {
      setQuizQuestion({
        question: 'In Node.js, what executes asynchronous I/O operations behind the scenes?',
        options: ['V8 Engine Call Stack', 'libuv Thread Pool', 'Event Loop Thread only', 'DOM Parser'],
        answer: 1,
      });
    } else if (skill.name === 'SQL') {
      setQuizQuestion({
        question: 'Which clause in SQL is used to filter records resulting from a GROUP BY statement?',
        options: ['WHERE', 'HAVING', 'FILTER BY', 'ORDER BY'],
        answer: 1,
      });
    } else {
      setQuizQuestion({
        question: `What is a fundamental best practice when working with ${skill.name} in modern applications?`,
        options: [
          'Modular code separation and clean architectural boundaries',
          'Putting all code in a single global namespace',
          'Avoiding type safety and linting checks',
          'Hardcoding credentials in client-side bundles',
        ],
        answer: 0,
      });
    }
  };

  return (
    <main className="pt-20 md:pt-24 pb-28 px-4 sm:px-6 max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="pt-2 sm:pt-4">
        <h1 className="text-[24px] sm:text-[28px] font-extrabold text-[#121b2e] dark:text-white tracking-tight">
          Skill Gap Matrix
        </h1>
        <p className="text-[15px] text-[#434655] dark:text-[#c3c6d7] mt-1">
          Benchmarked against 5,000+ live {user.targetRole} job postings.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 bg-white dark:bg-[#1e293b] p-1.5 rounded-2xl neu-raised overflow-x-auto">
        {(
          [
            { id: 'all', label: `All (${skills.length})` },
            { id: 'foundation', label: 'Foundations' },
            { id: 'gap', label: 'Critical Gaps' },
            { id: 'upcoming', label: 'Upcoming' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === tab.id
                ? 'bg-[#004ac6] text-white shadow-sm'
                : 'text-[#434655] dark:text-[#c3c6d7] hover:text-[#004ac6]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Skills Grid */}
      <div className="space-y-4">
        {filteredSkills.length === 0 ? (
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-8 text-center neu-raised border border-slate-100 dark:border-slate-800 space-y-3">
            <span className="material-symbols-outlined text-4xl text-slate-400">workspace_premium</span>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Skills Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add your technical skills below or complete learning courses to track your proficiency matrix.
            </p>
          </div>
        ) : (
          filteredSkills.map((skill) => {
            const isFoundation = skill.category === 'foundation';
            const isGap = skill.category === 'gap';

            return (
              <div
                key={skill.id}
                className="bg-white dark:bg-[#1e293b] rounded-2xl p-5 neu-raised flex flex-col gap-3 border border-slate-100 dark:border-slate-800"
              >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isFoundation
                        ? 'bg-green-50 dark:bg-green-950/60 text-green-600'
                        : isGap
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-[#004ac6]'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isFoundation ? 'verified' : isGap ? 'trending_up' : 'lock'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-[#121b2e] dark:text-white">
                      {skill.name}
                    </h3>
                    <span className="text-[11px] font-bold text-[#737686] dark:text-slate-400 uppercase tracking-wider">
                      {skill.category.toUpperCase()} {skill.priority ? `• ${skill.priority.toUpperCase()} PRIORITY` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-bold text-[#004ac6] dark:text-[#60a5fa]">
                    {skill.proficiency}%
                  </span>
                  <button
                    onClick={() => handleStartSkillQuiz(skill)}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-[#004ac6] dark:text-[#60a5fa] hover:bg-blue-50 transition-colors cursor-pointer"
                    title="Test Skill with AI Quiz"
                  >
                    <span className="material-symbols-outlined text-[18px]">quiz</span>
                  </button>
                </div>
              </div>

              {/* Interactive Proficiency Slider */}
              <div className="space-y-1">
                <div className="w-full bg-[#f1f3ff] dark:bg-slate-800 h-2.5 rounded-full neu-inset overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isFoundation
                        ? 'bg-green-600'
                        : 'bg-[#004ac6] dark:bg-[#60a5fa]'
                    }`}
                    style={{ width: `${skill.proficiency}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-[11px] text-[#737686] dark:text-slate-400 pt-1">
                  <span>Beginner</span>
                  <span>Proficiency: {skill.proficiency}%</span>
                  <span>Industry Ready</span>
                </div>
              </div>
            </div>
          );
        }))}
      </div>

      {/* Add Custom Skill */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-5 neu-raised flex gap-3 items-center">
        <input
          type="text"
          value={newSkillName}
          onChange={(e) => setNewSkillName(e.target.value)}
          placeholder="Add custom skill (e.g. Next.js, GraphQL, Redis)..."
          className="flex-1 bg-[#f1f3ff] dark:bg-slate-800 rounded-xl px-4 py-2.5 text-[14px] text-[#121b2e] dark:text-white outline-none neu-inset"
        />
        <button
          onClick={handleAddSkill}
          className="neu-btn-primary px-4 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Skill
        </button>
      </div>

      {/* Skill Quiz Assessment Modal */}
      {selectedSkill && quizQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 max-w-md w-full neu-raised border border-blue-100 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[11px] font-bold text-[#004ac6] dark:text-[#60a5fa] uppercase">
                  AI Skill Assessment
                </span>
                <h3 className="text-[20px] font-bold text-[#121b2e] dark:text-white">
                  {selectedSkill.name} Challenge
                </h3>
              </div>
              <button
                onClick={() => setSelectedSkill(null)}
                className="text-[#737686] hover:text-[#121b2e] dark:hover:text-white text-[20px]"
              >
                ✕
              </button>
            </div>

            <p className="text-[15px] font-semibold text-[#121b2e] dark:text-white mb-5 leading-relaxed">
              {quizQuestion.question}
            </p>

            <div className="space-y-2.5 mb-6">
              {quizQuestion.options.map((option, idx) => {
                const isChosen = selectedOption === idx;
                const isCorrect = idx === quizQuestion.answer;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedOption(idx);
                      setShowQuizResult(true);
                      if (idx === quizQuestion.answer) {
                        handleUpdateProficiency(
                          selectedSkill.id,
                          Math.min(100, selectedSkill.proficiency + 10)
                        );
                      }
                    }}
                    className={`w-full text-left p-3.5 rounded-xl text-[13px] font-medium transition-all cursor-pointer border ${
                      showQuizResult
                        ? isCorrect
                          ? 'bg-green-50 dark:bg-green-950/60 border-green-500 text-green-800 dark:text-green-200 font-bold'
                          : isChosen
                          ? 'bg-red-50 dark:bg-red-950/60 border-red-500 text-red-800 dark:text-red-200'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                        : isChosen
                        ? 'bg-blue-50 dark:bg-blue-950 border-[#004ac6] text-[#004ac6]'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[#121b2e] dark:text-white hover:border-[#004ac6]'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {showQuizResult && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-xl text-[13px] text-[#004ac6] dark:text-[#60a5fa] font-medium">
                {selectedOption === quizQuestion.answer
                  ? '🎉 Correct! +10% added to your verified proficiency score.'
                  : '💡 Keep practicing! Review this topic in your personalized roadmap.'}
              </div>
            )}

            <button
              onClick={() => setSelectedSkill(null)}
              className="neu-btn-primary w-full py-3 rounded-xl text-[14px] font-bold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
