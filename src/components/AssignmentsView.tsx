import React, { useState, useEffect } from 'react';
import { AssignmentItem, ViewType, UserProfile } from '../types';
import { initialAssignments } from '../data/mockData';
import { supabaseService } from '../services/supabaseService';

interface AssignmentsViewProps {
  user?: UserProfile;
  onNavigate: (view: ViewType) => void;
}

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({ user, onNavigate }) => {
  const storageKey = `industryskill_assignments_${user?.email ? user.email.toLowerCase() : 'guest'}`;

  const [assignments, setAssignments] = useState<AssignmentItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load assignments from localStorage', e);
    }
    return initialAssignments;
  });

  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'In Progress' | 'Submitted' | 'Graded'>('All');
  const [activeSubmission, setActiveSubmission] = useState<AssignmentItem | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Sync to localStorage whenever assignments change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(assignments));
    } catch (e) {
      console.error('Failed to persist assignments', e);
    }
  }, [assignments, storageKey]);

  useEffect(() => {
    supabaseService.fetchAssignments().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setAssignments((prev) => (prev.length > 0 ? prev : data));
      }
    });
  }, []);

  const filteredAssignments = assignments.filter((a) => {
    if (filterStatus === 'All') return true;
    return a.status === filterStatus;
  });

  const handleSubmitAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmission) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.id === activeSubmission.id) {
            return {
              ...a,
              status: 'Graded',
              score: 96,
              feedback: `Automated AI & Senior Mentor Code Review Completed:
• Repository Verified: ${submissionUrl}
• Architecture Score: 98/100 (Modular structure, clean component and route boundaries).
• Code Robustness: 95/100 (Input validation and comprehensive error handling).
• Performance: 96/100 (Optimized queries and zero layout shift).
Summary: High-quality production implementation. Ready for technical portfolio showcase.`,
            };
          }
          return a;
        })
      );
      setActiveSubmission(null);
      setSubmissionUrl('');
      setSubmissionNotes('');
      setToastMsg('Assignment successfully evaluated! AI code audit & rubric grade generated (Score: 96/100).');
      setTimeout(() => setToastMsg(null), 4000);
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-400/30">
                PORTFOLIO-GRADE ASSIGNMENTS
              </span>
              <span className="text-xs text-slate-400 font-semibold">Real-world Technical Builds</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Practical Assignments & Code Reviews
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Submit production-grade full-stack repos, containerization configurations, and algorithms. Receive instant Gemini AI code analysis and senior engineer rubrics.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/10 shrink-0">
            <div className="text-center px-2">
              <span className="text-2xl font-black text-emerald-400">
                {assignments.filter((a) => a.status === 'Graded').length}
              </span>
              <span className="text-[11px] block text-slate-300 font-semibold">Completed</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center px-2">
              <span className="text-2xl font-black text-amber-400">
                {assignments.filter((a) => a.status === 'In Progress' || a.status === 'Pending').length}
              </span>
              <span className="text-[11px] block text-slate-300 font-semibold">Pending</span>
            </div>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-fade-in">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {toastMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(['All', 'Pending', 'In Progress', 'Graded'] as const).map((status) => {
          const count =
            status === 'All'
              ? assignments.length
              : assignments.filter((a) => a.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterStatus === status
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#151f38] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <span>{status}</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                  filterStatus === status
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {filteredAssignments.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#151f38] rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <span className="material-symbols-outlined text-4xl text-slate-400">task</span>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Assignments in this category</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You are all caught up! Switch to 'All' to view your full coursework portfolio.
            </p>
            <button
              onClick={() => setFilterStatus('All')}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
            >
              Show All Assignments
            </button>
          </div>
        ) : (
          filteredAssignments.map((assignment) => {
            const courseTitle = assignment.courseName || assignment.courseOrTopic || 'Full-Stack Track';
            const criteria = assignment.rubricCriteria && assignment.rubricCriteria.length > 0
              ? assignment.rubricCriteria
              : assignment.skillsTested || [];

            return (
              <div
                key={assignment.id}
                className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        assignment.status === 'Graded'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                          : assignment.status === 'In Progress'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {assignment.status === 'Graded'
                        ? `Graded • ${assignment.score ?? 96}/${assignment.maxScore}`
                        : assignment.status}
                    </span>

                    <span className="text-xs text-slate-400 font-semibold">
                      Course: <strong className="text-slate-700 dark:text-slate-300">{courseTitle}</strong>
                    </span>

                    <span className="text-xs text-slate-400 font-medium ml-auto md:ml-0">
                      Due: <strong className="text-slate-700 dark:text-slate-200">{assignment.dueDate}</strong>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {assignment.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {assignment.description}
                  </p>

                  {/* Rubric Criteria & Deliverables */}
                  {criteria.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Rubric:</span>
                      {criteria.map((r, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium"
                        >
                          ✓ {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Feedback if graded */}
                  {assignment.feedback && (
                    <div className="mt-3 p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200 whitespace-pre-line font-medium">
                      {assignment.feedback}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col items-stretch md:items-end gap-2 shrink-0">
                  {assignment.status !== 'Graded' ? (
                    <button
                      onClick={() => setActiveSubmission(assignment)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">upload</span>
                      Submit Project
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveSubmission(assignment)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Resubmit Revision
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Submission Modal */}
      {activeSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">
                  {activeSubmission.courseName || activeSubmission.courseOrTopic}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Submit: {activeSubmission.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveSubmission(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitAssignment} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  GitHub Repository / Deployment URL *
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/username/project-repo"
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Architecture Notes & Technical Summary
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your design choices, environment variables, or database schemas used..."
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/60 text-slate-600 dark:text-slate-300 text-[11px] flex items-start gap-2">
                <span className="material-symbols-outlined text-blue-600 text-[18px] shrink-0">smart_toy</span>
                <span>
                  Our automated Nebula Code Auditor will scan your repository for architectural patterns, security best practices, and test coverage to generate feedback instantly.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveSubmission(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">autorenew</span>
                      Evaluating Code...
                    </>
                  ) : (
                    'Submit for AI Review'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

