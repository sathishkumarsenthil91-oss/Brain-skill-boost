import React, { useState, useEffect } from 'react';
import { ViewType, UserProfile, OpportunityItem } from '../types';
import { initialOpportunities } from '../data/mockData';
import { supabaseService } from '../services/supabaseService';
import { GoogleLogo } from './GoogleLogo';

interface OpportunitiesViewProps {
  user: UserProfile;
  onNavigate: (view: ViewType) => void;
  onUpdateUser?: (updated: Partial<UserProfile>) => void;
  onScanOpportunityInSafetyCenter?: (url: string, content: string) => void;
}

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({
  user,
  onNavigate,
  onUpdateUser,
  onScanOpportunityInSafetyCenter,
}) => {
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>(initialOpportunities);

  useEffect(() => {
    supabaseService.fetchOpportunities().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setOpportunities(data);
      }
    });
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Remote' | 'Hybrid' | 'Onsite'>('All');
  const [selectedOpp, setSelectedOpp] = useState<OpportunityItem | null>(null);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  const toggleSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpportunities((prev) =>
      prev.map((item) => (item.id === id ? { ...item, saved: !item.saved } : item))
    );
  };

  const handleApply = (opp: OpportunityItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOpportunities((prev) =>
      prev.map((item) => (item.id === opp.id ? { ...item, applied: true } : item))
    );
    setAppliedNotification(`Application submitted to ${opp.company}!`);
    setTimeout(() => setAppliedNotification(null), 4000);
    if (selectedOpp?.id === opp.id) {
      setSelectedOpp({ ...selectedOpp, applied: true });
    }
  };

  const handleCheckSafety = (opp: OpportunityItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onScanOpportunityInSafetyCenter) {
      onScanOpportunityInSafetyCenter(
        `https://${opp.company.toLowerCase().replace(/\s+/g, '')}.com/careers/${opp.id}`,
        `${opp.title} at ${opp.company} (${opp.locationType}). Stipend: ${opp.stipend || 'Competitive'}. ${opp.description}`
      );
    }
    onNavigate('safety');
  };

  const filteredOpps = opportunities.filter((opp) => {
    const matchesSearch =
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterType === 'All' || opp.locationType === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <main className="px-4 sm:px-6 mx-auto flex flex-col gap-6 transition-all max-w-3xl">
      {/* Toast Notification */}
      {appliedNotification && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 bg-green-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top-4 duration-200">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span className="text-[14px] font-bold">{appliedNotification}</span>
        </div>
      )}

      {/* Subsection Navigation Header */}
      <div className="pt-2 sm:pt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] sm:text-[28px] font-extrabold text-[#121b2e] dark:text-white tracking-tight">
              Opportunities & Network
            </h1>
            <p className="text-[14px] text-[#434655] dark:text-[#c3c6d7] mt-0.5">
              Verified career openings, peer connectivity & active learning curriculum.
            </p>
          </div>
        </div>

        {/* Navigation & Section Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl">
          <div className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 bg-white dark:bg-[#121b2e] text-[#004ac6] dark:text-blue-400 shadow-sm">
            <span className="material-symbols-outlined text-[18px]">work</span>
            <span>Matched Internships</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
              {opportunities.length}
            </span>
          </div>

          <button
            onClick={() => onNavigate('connectivity')}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-white/60 dark:hover:bg-[#121b2e]/60"
          >
            <span className="material-symbols-outlined text-[18px]">hub</span>
            <span>Connectivity</span>
            <span className="text-[10px] uppercase font-black px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded">Full Page ↗</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1 h-12 bg-white dark:bg-[#1e293b] rounded-xl neu-inset flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-[#004ac6]">
              <span className="material-symbols-outlined text-[#737686] mr-3">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search roles, companies, tech..."
                className="bg-transparent w-full outline-none text-[15px] text-[#121b2e] dark:text-white placeholder:text-[#737686] dark:placeholder:text-slate-400 border-none p-0 h-full"
              />
            </div>

            {/* Filter Dropdown/Pill */}
            <div className="flex gap-1 bg-white dark:bg-[#1e293b] p-1 rounded-xl neu-raised items-center">
              {(['All', 'Remote', 'Hybrid'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                    filterType === type
                      ? 'bg-[#004ac6] text-white shadow-sm'
                      : 'text-[#434655] dark:text-[#c3c6d7] hover:text-[#004ac6]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Featured Connectivity Subsection Banner Entry */}
          <div
            onClick={() => onNavigate('connectivity')}
            className="bg-gradient-to-r from-[#0d1527] via-[#1a1c38] to-[#25153f] border border-purple-500/30 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden cursor-pointer hover:border-purple-400/60 hover:shadow-xl transition-all group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[26px]">hub</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/30">
                      FULL-PAGE NETWORK
                    </span>
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Connectivity & Real User Network
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-white mt-0.5 group-hover:text-purple-300 transition-colors">
                    Professional Network & Learning Libraries
                  </h3>
                  <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                    Explore live active learners, chat with peers at Stripe & Google, and request access to private curriculum libraries.
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate('connectivity');
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>Enter Connectivity</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>

      {/* Opportunities List Container */}
      <div className="space-y-6">
        {filteredOpps.map((opp, index) => {
          const isHighMatch = opp.matchScore >= 80;
          return (
            <div
              key={opp.id}
              onClick={() => setSelectedOpp(opp)}
              className={`bg-white dark:bg-[#1e293b] rounded-2xl p-5 sm:p-6 neu-raised flex flex-col gap-4 relative overflow-hidden transition-all duration-200 hover:scale-[1.01] cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-blue-800 ${
                !isHighMatch ? 'opacity-95' : ''
              }`}
            >
              {/* Highlight Left Accent Border for top match */}
              {isHighMatch && (
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#004ac6] shadow-[0_0_10px_rgba(0,74,198,0.5)]"></div>
              )}

              {/* Title & Company Row */}
              <div className="flex justify-between items-start">
                <div className="flex gap-3.5 items-center">
                  <div className="w-12 h-12 rounded-xl bg-[#f1f3ff] dark:bg-slate-800 neu-inset flex items-center justify-center p-2 flex-shrink-0">
                    {opp.company === 'Google' ? (
                      <GoogleLogo className="w-7 h-7" />
                    ) : opp.companyLogoUrl ? (
                      <img
                        src={opp.companyLogoUrl}
                        alt={opp.company}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-[#737686] text-[24px]">
                        business
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-[17px] sm:text-[18px] font-bold text-[#121b2e] dark:text-white leading-tight">
                      {opp.title}
                    </h3>
                    <p className="text-[13px] text-[#434655] dark:text-[#c3c6d7] mt-0.5">
                      {opp.company} • {opp.locationType}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => toggleSave(opp.id, e)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center neu-raised transition-colors cursor-pointer ${
                    opp.saved
                      ? 'text-[#004ac6] bg-blue-50 dark:bg-blue-950'
                      : 'text-[#737686] hover:text-[#004ac6]'
                  }`}
                  title={opp.saved ? 'Saved' : 'Bookmark'}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      opp.saved ? 'fill-1' : ''
                    }`}
                  >
                    bookmark
                  </span>
                </button>
              </div>

              {/* Skill Match Progress Bar */}
              <div className="bg-[#f1f3ff] dark:bg-slate-800/80 rounded-xl p-3.5 flex items-center justify-between border border-white/60 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      isHighMatch ? 'text-[#004ac6] dark:text-[#60a5fa]' : 'text-[#4059aa] dark:text-[#8fa7fe]'
                    }`}
                  >
                    psychology
                  </span>
                  <span className="text-[13px] font-bold text-[#121b2e] dark:text-white">
                    Skill Match
                  </span>
                </div>
                <div className="flex items-center gap-3 w-1/2 justify-end">
                  <div className="w-full h-2 bg-white dark:bg-slate-900 neu-inset rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isHighMatch
                          ? 'bg-[#004ac6] dark:bg-[#60a5fa] shadow-[0_0_8px_rgba(0,74,198,0.6)]'
                          : 'bg-[#4059aa] dark:bg-[#8fa7fe]'
                      }`}
                      style={{ width: `${opp.matchScore}%` }}
                    ></div>
                  </div>
                  <span
                    className={`text-[13px] font-bold ${
                      isHighMatch ? 'text-[#004ac6] dark:text-[#60a5fa]' : 'text-[#4059aa] dark:text-[#8fa7fe]'
                    }`}
                  >
                    {opp.matchScore}%
                  </span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {opp.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-white dark:bg-slate-800 rounded-lg text-[12px] font-medium text-[#434655] dark:text-[#c3c6d7] shadow-sm border border-slate-100 dark:border-slate-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Footer Metadata */}
              <div className="flex justify-between items-center text-[13px] text-[#434655] dark:text-[#c3c6d7]">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  {opp.duration}
                </div>
                <div className="flex items-center gap-3">
                  {opp.verified && (
                    <div className="flex items-center gap-1 text-[#004ac6] dark:text-[#60a5fa] font-bold text-[12px]">
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      Verified
                    </div>
                  )}
                  <button
                    onClick={(e) => handleCheckSafety(opp, e)}
                    className="text-[11px] text-[#ba1a1a] dark:text-red-400 font-semibold hover:underline flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">security</span>
                    Scan Safety
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-1 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedOpp(opp);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 text-[#004ac6] dark:text-[#60a5fa] text-[13px] font-bold neu-raised hover:scale-[0.98] transition-all cursor-pointer border border-blue-100 dark:border-slate-700"
                >
                  View Details
                </button>
                <button
                  onClick={(e) => handleApply(opp, e)}
                  disabled={opp.applied}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-[13px] font-bold neu-btn-primary hover:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    opp.applied ? 'bg-green-600' : ''
                  }`}
                >
                  {opp.applied ? 'Applied ✓' : 'Apply'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Opportunity Details & Safety Modal */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 max-w-lg w-full neu-raised border border-blue-100 dark:border-slate-700 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 p-2 flex items-center justify-center">
                  {selectedOpp.company === 'Google' ? (
                    <GoogleLogo className="w-7 h-7" />
                  ) : selectedOpp.companyLogoUrl ? (
                    <img
                      src={selectedOpp.companyLogoUrl}
                      alt={selectedOpp.company}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-[#004ac6]">business</span>
                  )}
                </div>
                <div>
                  <h3 className="text-[19px] font-bold text-[#121b2e] dark:text-white">
                    {selectedOpp.title}
                  </h3>
                  <p className="text-[13px] text-[#434655] dark:text-[#c3c6d7]">
                    {selectedOpp.company} • {selectedOpp.locationType}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOpp(null)}
                className="text-[#737686] hover:text-[#121b2e] dark:hover:text-white text-[20px]"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-xl flex items-center justify-between mb-4 border border-blue-100 dark:border-blue-900">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#004ac6] dark:text-[#60a5fa]">
                  psychology
                </span>
                <span className="text-[13px] font-bold text-[#004ac6] dark:text-[#60a5fa]">
                  Skill Compatibility: {selectedOpp.matchScore}%
                </span>
              </div>
              <span className="text-[12px] font-semibold text-[#121b2e] dark:text-white">
                Stipend: {selectedOpp.stipend || '$1,800/mo'}
              </span>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <h4 className="text-[13px] font-bold text-[#121b2e] dark:text-white mb-1">
                  Role Description:
                </h4>
                <p className="text-[14px] text-[#434655] dark:text-[#c3c6d7] leading-relaxed">
                  {selectedOpp.description}
                </p>
              </div>

              <div>
                <h4 className="text-[13px] font-bold text-[#121b2e] dark:text-white mb-2">
                  Key Skills & Stack:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedOpp.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-[#121b2e] dark:text-white text-[12px] rounded-lg font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={(e) => handleCheckSafety(selectedOpp, e)}
                className="flex-1 py-3 px-4 rounded-xl border border-red-200 dark:border-red-900 text-[#ba1a1a] dark:text-red-400 text-[13px] font-bold hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">security</span>
                Safety Scan
              </button>
              <button
                onClick={() => handleApply(selectedOpp)}
                disabled={selectedOpp.applied}
                className={`flex-1 py-3 px-4 rounded-xl text-white text-[13px] font-bold neu-btn-primary cursor-pointer ${
                  selectedOpp.applied ? 'bg-green-600' : ''
                }`}
              >
                {selectedOpp.applied ? 'Applied Successfully ✓' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
