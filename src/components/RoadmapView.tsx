import React, { useState } from 'react';
import { ViewType, UserProfile, RoadmapNode } from '../types';

interface RoadmapViewProps {
  user: UserProfile;
  nodes: RoadmapNode[];
  onNavigate: (view: ViewType) => void;
  onUpdateNodes?: (nodes: RoadmapNode[]) => void;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({
  user,
  nodes: initialNodes,
  onNavigate,
  onUpdateNodes,
}) => {
  const [nodes, setNodes] = useState<RoadmapNode[]>(initialNodes);
  const [activeModalNode, setActiveModalNode] = useState<RoadmapNode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [customRole, setCustomRole] = useState(user.targetRole);
  const [customNote, setCustomNote] = useState('');

  const handleGenerateCustomRoadmap = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole: customRole,
          existingSkills: ['HTML', 'CSS', 'JavaScript', 'Git'],
          degree: user.degree,
          graduationYear: user.gradYear,
          customNote,
        }),
      });
      const data = await response.json();
      if (data?.roadmap?.nodes) {
        setNodes(data.roadmap.nodes);
        if (onUpdateNodes) {
          onUpdateNodes(data.roadmap.nodes);
        }
        setShowGenerator(false);
      }
    } catch (err) {
      console.error('Failed to generate roadmap:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="pt-20 md:pt-24 pb-28 px-4 sm:px-6 max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="pt-2 sm:pt-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-[24px] sm:text-[28px] font-extrabold text-[#004ac6] dark:text-[#60a5fa] tracking-tight">
              Your Personalized Roadmap
            </h1>
            <p className="text-[15px] text-[#434655] dark:text-[#c3c6d7] mt-1">
              AI-Generated Path to {customRole || user.targetRole}
            </p>
          </div>
          <button
            onClick={() => setShowGenerator(!showGenerator)}
            className="neu-btn-secondary px-3.5 py-1.5 rounded-xl text-[13px] font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Customize
          </button>
        </div>
      </div>

      {/* Custom Roadmap AI Generator Box (Collapsible) */}
      {showGenerator && (
        <div className="neu-raised rounded-2xl p-5 border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-slate-800/80 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[#004ac6] dark:text-[#60a5fa]">
              psychology
            </span>
            <h3 className="text-[16px] font-bold text-[#121b2e] dark:text-white">
              AI Career Architect (High Thinking Mode)
            </h3>
          </div>
          <p className="text-[13px] text-[#434655] dark:text-[#c3c6d7] mb-4">
            Leverage Gemini 3.1 Pro with High Thinking to build a step-by-step milestone curriculum for any dream career track.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-[12px] font-bold text-[#737686] dark:text-slate-300 block mb-1">
                Target Role
              </label>
              <input
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="e.g. AI Systems Engineer, Full Stack Developer, DevOps Lead"
                className="w-full bg-white dark:bg-slate-900 rounded-xl p-3 text-[14px] text-[#121b2e] dark:text-white border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#004ac6]"
              />
            </div>
            <div>
              <label className="text-[12px] font-bold text-[#737686] dark:text-slate-300 block mb-1">
                Special Focus or Company Goal (Optional)
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. Focus on Next.js 15, PostgreSQL & Cloud Run deployment"
                className="w-full bg-white dark:bg-slate-900 rounded-xl p-3 text-[14px] text-[#121b2e] dark:text-white border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#004ac6]"
              />
            </div>
            <button
              onClick={handleGenerateCustomRoadmap}
              disabled={isGenerating}
              className="neu-btn-primary w-full py-3 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    progress_activity
                  </span>
                  Synthesizing with High Thinking AI...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  Generate Custom AI Roadmap
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Timeline Container or Empty State */}
      {nodes.length === 0 ? (
        <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-10 text-center space-y-4 neu-raised border border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#004ac6] dark:text-[#60a5fa] flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">route</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              No Roadmap Milestones Generated Yet
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Generate a personalized step-by-step curriculum with milestones tailored for your target role as <strong className="text-slate-800 dark:text-slate-200">{customRole || user.targetRole}</strong>.
            </p>
          </div>
          <button
            onClick={handleGenerateCustomRoadmap}
            disabled={isGenerating}
            className="neu-btn-primary px-5 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all inline-flex items-center gap-2 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${isGenerating ? 'animate-spin' : ''}`}>
              {isGenerating ? 'refresh' : 'auto_awesome'}
            </span>
            {isGenerating ? 'Synthesizing Curriculum...' : 'Generate AI Milestone Roadmap'}
          </button>
        </div>
      ) : (
        <div className="relative pl-6 md:pl-8 before:absolute before:inset-0 before:ml-6 md:before:ml-8 before:-translate-x-px before:w-0.5 before:bg-[#d9e2fc] dark:before:bg-slate-700 before:z-0 space-y-6">
        {nodes.map((node) => {
          if (node.status === 'completed') {
            return (
              <div key={node.id} className="relative z-10 flex flex-col gap-1">
                {/* Completed Indicator Node */}
                <div className="absolute -left-9 md:-left-11 w-6 h-6 bg-[#004ac6] rounded-full flex items-center justify-center neu-raised border-2 border-white dark:border-slate-900">
                  <span className="material-symbols-outlined text-[14px] text-white font-bold">
                    check
                  </span>
                </div>

                <div
                  onClick={() => setActiveModalNode(node)}
                  className="bg-white dark:bg-[#1e293b] rounded-2xl p-5 neu-raised border border-white/60 dark:border-slate-700 ml-4 cursor-pointer hover:scale-[1.01] transition-transform"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-[15px] font-bold text-[#121b2e] dark:text-white">
                        {node.title}
                      </h3>
                      <span className="text-[11px] font-bold text-[#004ac6] dark:text-[#60a5fa] uppercase tracking-wider">
                        COMPLETED
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[20px]">
                      verified
                    </span>
                  </div>

                  <div className="w-full h-2 bg-[#f1f3ff] dark:bg-slate-800 rounded-full neu-inset mt-3 overflow-hidden">
                    <div className="h-full bg-[#004ac6] dark:bg-[#60a5fa] rounded-full w-full"></div>
                  </div>
                </div>
              </div>
            );
          }

          if (node.status === 'current') {
            return (
              <div key={node.id} className="relative z-10 flex flex-col gap-1">
                {/* Current Active Glowing Node */}
                <div className="absolute -left-10 md:-left-12 w-8 h-8 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center ai-glow border-2 border-white dark:border-slate-900 z-20">
                  <div className="w-3.5 h-3.5 bg-[#004ac6] rounded-full animate-pulse"></div>
                </div>

                <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-5 sm:p-6 neu-raised ml-4 relative overflow-hidden border border-blue-200 dark:border-blue-800">
                  {/* Decorative AI Glow blob */}
                  <div className="absolute top-0 right-0 w-36 h-36 bg-blue-100/60 dark:bg-blue-900/30 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <div>
                      <h3 className="text-[19px] font-bold text-[#004ac6] dark:text-[#60a5fa]">
                        {node.title}
                      </h3>
                      <span className="text-[11px] font-bold text-[#2563eb] dark:text-[#8fa7fe] uppercase tracking-wider">
                        CURRENT FOCUS
                      </span>
                    </div>
                    <span className="text-[12px] font-bold bg-blue-50 dark:bg-blue-950 text-[#004ac6] dark:text-[#60a5fa] px-2.5 py-1 rounded-md border border-blue-100 dark:border-blue-900">
                      {node.progress}%
                    </span>
                  </div>

                  <p className="text-[14px] text-[#434655] dark:text-[#c3c6d7] mb-4 relative z-10 leading-relaxed">
                    {node.description}
                  </p>

                  <div className="w-full h-3 bg-[#f1f3ff] dark:bg-slate-800 rounded-full neu-inset mb-4 overflow-hidden relative z-10">
                    <div
                      className="h-full bg-[#004ac6] dark:bg-[#60a5fa] rounded-full shadow-[0_0_10px_rgba(37,99,235,0.8)] relative"
                      style={{ width: `${node.progress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30 rounded-full"></div>
                    </div>
                  </div>

                  {/* Subtopics Checklist */}
                  {node.subtopics && node.subtopics.length > 0 && (
                    <div className="mb-4 space-y-1.5 relative z-10">
                      <p className="text-[11px] font-bold text-[#737686] dark:text-slate-400 uppercase tracking-wider">
                        Curriculum Focus:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {node.subtopics.map((sub, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-[12px] text-[#121b2e] dark:text-white bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg"
                          >
                            <span className="material-symbols-outlined text-[16px] text-[#004ac6] dark:text-[#60a5fa]">
                              check_circle
                            </span>
                            {sub}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 relative z-10 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setActiveModalNode(node)}
                      className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#004ac6] dark:text-[#60a5fa] hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        library_books
                      </span>
                      Recommended Resources
                    </button>
                    <button
                      onClick={() => onNavigate('nebula')}
                      className="inline-flex items-center gap-1.5 text-[13px] font-bold text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition-opacity cursor-pointer ml-auto"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        smart_toy
                      </span>
                      Ask Nebula AI Mentor
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          // Upcoming locked nodes
          return (
            <div key={node.id} className="relative z-10 flex flex-col gap-1 opacity-75 hover:opacity-100 transition-opacity">
              <div className="absolute -left-9 md:-left-11 w-6 h-6 bg-[#f9f9ff] dark:bg-slate-900 rounded-full flex items-center justify-center border-2 border-[#c3c6d7] dark:border-slate-700 z-10">
                <div className="w-2 h-2 bg-[#737686] rounded-full"></div>
              </div>

              <div
                onClick={() => setActiveModalNode(node)}
                className="bg-white dark:bg-[#1e293b] rounded-2xl p-5 ml-4 border border-dashed border-slate-300 dark:border-slate-700 neu-raised cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-[15px] font-bold text-[#434655] dark:text-slate-300">
                      {node.title}
                    </h3>
                    <span className="text-[11px] font-bold text-[#737686] dark:text-slate-400 uppercase tracking-wider">
                      UPCOMING
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[#737686] text-[20px]">
                    lock
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Goal Node: Job Ready */}
        <div className="relative z-10 flex flex-col gap-1 pt-2">
          <div className="absolute -left-10 md:-left-12 w-8 h-8 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center neu-raised border-2 border-[#004ac6] z-10">
            <span className="material-symbols-outlined text-[18px] text-[#004ac6] fill-1">
              flag
            </span>
          </div>

          <div className="bg-gradient-to-br from-[#2563eb] to-[#004ac6] rounded-2xl p-5 ml-4 neu-raised text-white shadow-xl shadow-blue-500/25 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">
                <span className="material-symbols-outlined text-white text-[22px]">
                  work
                </span>
              </div>
              <div>
                <h3 className="text-[18px] font-bold text-white leading-tight">
                  Job Ready
                </h3>
                <p className="text-[12px] text-white/80 font-medium">
                  Estimated Timeline: 3 Months
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('opportunities')}
              className="bg-white text-[#004ac6] px-4 py-2 rounded-xl text-[13px] font-bold hover:bg-blue-50 transition-colors shadow-md cursor-pointer"
            >
              View Opportunities
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Node Details Resource Modal */}
      {activeModalNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 max-w-md w-full neu-raised border border-blue-100 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[11px] font-bold text-[#004ac6] dark:text-[#60a5fa] uppercase">
                  {activeModalNode.status} Module
                </span>
                <h3 className="text-[20px] font-bold text-[#121b2e] dark:text-white">
                  {activeModalNode.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalNode(null)}
                className="text-[#737686] hover:text-[#121b2e] dark:hover:text-white text-[20px]"
              >
                ✕
              </button>
            </div>

            <p className="text-[14px] text-[#434655] dark:text-[#c3c6d7] leading-relaxed mb-5">
              {activeModalNode.description}
            </p>

            <div className="space-y-3 mb-6">
              <h4 className="text-[13px] font-bold text-[#121b2e] dark:text-white">
                Recommended Resources & Labs:
              </h4>
              {activeModalNode.recommendedResources && activeModalNode.recommendedResources.length > 0 ? (
                activeModalNode.recommendedResources.map((res, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#f9f9ff] dark:bg-slate-800 rounded-xl flex items-center justify-between neu-inset"
                  >
                    <div>
                      <p className="text-[13px] font-bold text-[#121b2e] dark:text-white">
                        {res.title}
                      </p>
                      <span className="text-[11px] text-[#737686] dark:text-slate-400">
                        {res.type}
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-[#004ac6] text-[18px]">
                      open_in_new
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[13px] text-[#737686] dark:text-slate-400">
                  Curated exercises and video walkthroughs unlock as you progress.
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setActiveModalNode(null);
                onNavigate('nebula');
              }}
              className="neu-btn-primary w-full py-3 rounded-xl text-[14px] font-bold cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
              Ask Nebula AI to Explain This Topic
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
