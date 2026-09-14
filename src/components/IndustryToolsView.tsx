import React, { useState, useEffect } from 'react';
import { IndustryTool, ViewType } from '../types';
import { initialIndustryTools } from '../data/mockData';
import { supabaseService } from '../services/supabaseService';

interface IndustryToolsViewProps {
  onNavigate: (view: ViewType) => void;
}

export const IndustryToolsView: React.FC<IndustryToolsViewProps> = ({ onNavigate }) => {
  const [tools, setTools] = useState<IndustryTool[]>(initialIndustryTools);

  useEffect(() => {
    supabaseService.fetchIndustryTools().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setTools(data);
      }
    });
  }, []);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedTool, setSelectedTool] = useState<IndustryTool | null>(null);

  const categories = ['All', 'DevOps & Containers', 'Version Control', 'API & Testing', 'Databases', 'Cloud & Orchestration', 'Design & Prototyping'];

  const filteredTools = tools.filter(
    (t) => activeCategory === 'All' || t.category === activeCategory
  );

  const handleToggleStatus = (toolId: string) => {
    setTools((prev) =>
      prev.map((tool) => {
        if (tool.id === toolId) {
          const nextStatus: 'Not Started' | 'In Progress' | 'Mastered' =
            tool.status === 'Not Started'
              ? 'In Progress'
              : tool.status === 'In Progress'
              ? 'Mastered'
              : 'Not Started';
          return {
            ...tool,
            status: nextStatus,
            proficiency: nextStatus === 'Mastered' ? 95 : nextStatus === 'In Progress' ? 60 : 15,
          };
        }
        return tool;
      })
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                PRODUCTION TOOLSTACK MATRIX
              </span>
              <span className="text-xs text-slate-400 font-semibold">Tier-1 Tooling Radar</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Essential Industry Developer Tools
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Track mastery of industry-standard tools required by high-growth startups and tech giants. Interactive cheat sheets, terminal tips, and benchmark demand indices.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/10">
            <div className="text-center px-3">
              <span className="text-2xl font-black text-emerald-400">
                {tools.filter((t) => t.status === 'Mastered').length}
              </span>
              <span className="text-[11px] block text-slate-300 font-semibold">Mastered</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center px-3">
              <span className="text-2xl font-black text-amber-400">
                {tools.filter((t) => t.status === 'In Progress').length}
              </span>
              <span className="text-[11px] block text-slate-300 font-semibold">Learning</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeCategory === cat
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#151f38] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool) => (
          <div
            key={tool.id}
            className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl shrink-0">
                  {tool.icon}
                </div>
                <div className="flex flex-col items-end">
                  <span
                    onClick={() => handleToggleStatus(tool.id)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold cursor-pointer transition-all hover:scale-105 ${
                      tool.status === 'Mastered'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                        : tool.status === 'In Progress'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                    }`}
                    title="Click to toggle status"
                  >
                    {tool.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold mt-1">
                    {tool.marketDemand}% Market Demand
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {tool.name}
                </h3>
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                  {tool.category}
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {tool.description}
                </p>
              </div>

              {/* Proficiency Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span>Proficiency</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{tool.proficiency}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      tool.proficiency >= 80
                        ? 'bg-emerald-500'
                        : tool.proficiency >= 40
                        ? 'bg-blue-500'
                        : 'bg-slate-400'
                    }`}
                    style={{ width: `${tool.proficiency}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={() => setSelectedTool(tool)}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">menu_book</span>
                Cheat Sheet
              </button>
              <button
                onClick={() => handleToggleStatus(tool.id)}
                className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs transition-colors cursor-pointer"
                title="Change Status"
              >
                <span className="material-symbols-outlined text-[16px]">autorenew</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Tool Cheat Sheet Modal */}
      {selectedTool && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedTool.icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedTool.name} Cheat Sheet & Pro Tips
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">{selectedTool.category}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTool(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Essential terminal commands and production snippets for {selectedTool.name}:
              </p>
              <div className="space-y-2">
                {selectedTool.cheatSheetSnippet?.map((snippet, idx) => (
                  <div key={idx} className="bg-slate-950 text-emerald-400 p-3 rounded-xl font-mono text-xs overflow-x-auto">
                    $ {snippet}
                  </div>
                )) || (
                  <div className="bg-slate-950 text-emerald-400 p-3 rounded-xl font-mono text-xs">
                    $ {selectedTool.name.toLowerCase()} --version
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                <strong>Interview Tip:</strong> Be prepared to explain how {selectedTool.name} fits into continuous integration and cloud staging workflows.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedTool(null)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
