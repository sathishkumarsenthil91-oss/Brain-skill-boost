import React, { useState } from 'react';
import { CourseItem, CourseLesson, CourseModule, UserProfile } from '../types';
import { downloadFileToFolder } from '../services/youtubeLearningService';
import { YouTubePlayer } from './YouTubePlayer';

interface CoursePlayerModalProps {
  course: CourseItem;
  user: UserProfile;
  onClose: () => void;
  onUpdateCourse: (updated: CourseItem) => void;
  onAskNebulaAI?: (prompt: string) => void;
}

export const CoursePlayerModal: React.FC<CoursePlayerModalProps> = ({
  course,
  user,
  onClose,
  onUpdateCourse,
  onAskNebulaAI,
}) => {
  // Modules setup fallback
  const modules: CourseModule[] = course.modules && course.modules.length > 0
    ? course.modules
    : [
        {
          id: `${course.id}-m1`,
          title: 'Module 1: Core Fundamentals & Architecture',
          duration: '3h 30m',
          lessons: [
            {
              id: `${course.id}-l1`,
              title: '1.1 System Concepts & Production Setup',
              duration: '45m',
              type: 'video',
              completed: true,
              videoId: '8pDqJVdNa44',
              videoUrl: 'https://www.youtube.com/watch?v=8pDqJVdNa44',
              summary: 'Comprehensive overview of architecture, engineering trade-offs, and toolchain configurations.',
            },
            {
              id: `${course.id}-l2`,
              title: '1.2 Hands-On Interactive Implementation',
              duration: '1h 15m',
              type: 'lab',
              completed: false,
              summary: 'Write and test scalable implementations with full type safety.',
            },
          ],
        },
      ];

  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);
  const [activeLesson, setActiveLesson] = useState<CourseLesson>(
    modules[0]?.lessons[0] || {
      id: 'default',
      title: 'Introduction',
      duration: '30m',
      type: 'video',
      completed: false,
    }
  );
  const [activeTab, setActiveTab] = useState<'video' | 'notes' | 'code' | 'quiz'>('video');
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [showCertSuccess, setShowCertSuccess] = useState<boolean>(false);

  // Calculate total lessons and completed count
  const allLessons = modules.flatMap((m) => m.lessons);
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter((l) => l.completed).length;
  const computedProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : course.progress;

  const handleToggleLessonComplete = (lessonId: string) => {
    const updatedModules = modules.map((mod) => ({
      ...mod,
      lessons: mod.lessons.map((l) => {
        if (l.id === lessonId) {
          const nextCompleted = !l.completed;
          if (activeLesson.id === lessonId) {
            setActiveLesson((prev) => ({ ...prev, completed: nextCompleted }));
          }
          return { ...l, completed: nextCompleted };
        }
        return l;
      }),
    }));

    const nextCompletedCount = updatedModules.flatMap((m) => m.lessons).filter((l) => l.completed).length;
    const nextProgress = Math.round((nextCompletedCount / totalLessons) * 100);

    const updatedCourse: CourseItem = {
      ...course,
      modules: updatedModules,
      progress: nextProgress,
      isEnrolled: true,
    };

    onUpdateCourse(updatedCourse);
  };

  const handleClaimCertificate = () => {
    setShowCertSuccess(true);
    setTimeout(() => {
      const certId = `BB-CRS-2026-${course.id.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const sanitizedTitle = (course.title || 'Course_Certificate').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 35);
      const filename = `Brainboost_Certificate_${certId || sanitizedTitle}.html`;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Course Certificate - ${course.title}</title>
            <meta charset="utf-8" />
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=Playfair+Display:wght@700&display=swap');
              body { font-family: 'Plus Jakarta Sans', sans-serif; background: #0f172a; padding: 40px; display: flex; justify-content: center; }
              .cert-container { width: 900px; background: white; border: 12px solid #4338ca; padding: 48px; position: relative; text-align: center; }
              .title { font-family: 'Playfair Display', serif; font-size: 32px; color: #4338ca; margin-top: 10px; }
              .name { font-size: 32px; font-weight: 800; color: #4f46e5; margin: 20px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
              .course { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
              .meta { margin-top: 30px; font-size: 13px; color: #64748b; }
            </style>
          </head>
          <body>
            <div class="cert-container">
              <div style="font-size: 12px; font-weight: 900; color: #4f46e5; letter-spacing: 2px;">BRAINBOOST ACADEMIC PLATFORM</div>
              <h1 class="title">Certificate of Course Completion</h1>
              <p style="margin-top: 20px; font-size: 14px; color: #64748b;">This is to certify that</p>
              <div class="name">${user.name || 'Learner'}</div>
              <p style="font-size: 14px; color: #475569;">has successfully completed all modules, practical laboratories, and final assessments for</p>
              <div class="course">"${course.title}"</div>
              <p style="font-size: 12px; color: #64748b;">Instructor: <strong>${course.instructor?.name || 'Faculty Staff'}</strong> (${course.instructor?.role || 'Staff Engineer'} @ ${course.instructor?.company || 'Industry Partner'})</p>
              <div class="meta">Certificate ID: <strong>${certId}</strong> • Date: <strong>${new Date().toLocaleDateString()}</strong></div>
            </div>
          </body>
        </html>
      `;

      // 1. Download certificate file directly into user's folder
      downloadFileToFolder(html, filename, 'text/html');

      // 2. Open print dialog
      try {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(html);
          printWindow.document.close();
        }
      } catch (e) {
        console.log('Popup blocked, file was saved directly to Downloads folder.');
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-6xl w-full h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Top Navbar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <span className="material-symbols-outlined text-[20px]">school</span>
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-400/20">
                  {course.category}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">{course.level}</span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                {course.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Progress</span>
                <span className="text-xs font-black text-emerald-400">{computedProgress}%</span>
              </div>
              <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${computedProgress}%` }}
                />
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Main Body (Split View) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Left / Center: Interactive Classroom Player & Content */}
          <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Embedded Lesson Video Player */}
            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-lg border border-slate-800 shrink-0">
              {activeLesson.videoId ? (
                <YouTubePlayer
                  videoId={activeLesson.videoId}
                  title={activeLesson.title}
                  autoPlay={true}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 text-center space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <span className="material-symbols-outlined text-[32px]">terminal</span>
                  </div>
                  <h3 className="text-lg font-bold">{activeLesson.title}</h3>
                  <p className="text-xs text-slate-400 max-w-md">
                    {activeLesson.summary || 'Interactive hands-on programming laboratory. Review code snippets and instructions below.'}
                  </p>
                </div>
              )}
            </div>

            {/* Lesson Title & Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {activeLesson.type.toUpperCase()} • {activeLesson.duration}
                  </span>
                  {activeLesson.completed && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">check_circle</span>
                      Completed
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {activeLesson.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleLessonComplete(activeLesson.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeLesson.completed
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {activeLesson.completed ? 'check' : 'done'}
                  </span>
                  {activeLesson.completed ? 'Mark Incomplete' : 'Mark Lesson Complete'}
                </button>

                {onAskNebulaAI && (
                  <button
                    onClick={() => onAskNebulaAI(`Explain the key concepts of the course lesson "${activeLesson.title}" from "${course.title}"`)}
                    className="px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Ask AI Tutor"
                  >
                    <span className="material-symbols-outlined text-[16px]">psychology</span>
                    Ask AI Tutor
                  </button>
                )}
              </div>
            </div>

            {/* Content Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                onClick={() => setActiveTab('video')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'video'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">description</span>
                Overview & Summary
              </button>

              <button
                onClick={() => setActiveTab('code')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'code'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">code</span>
                Code Lab & Sandbox
              </button>

              <button
                onClick={() => setActiveTab('quiz')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'quiz'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">quiz</span>
                Self Check Quiz
              </button>
            </div>

            {/* Tab Panes */}
            {activeTab === 'video' && (
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <p className="leading-relaxed font-medium">
                  {activeLesson.summary || course.description}
                </p>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Skills Covered in this Unit:
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {course.skillsTaught.map((skill, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                  <img
                    src={course.instructor.avatar}
                    alt={course.instructor.name}
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Instructor: {course.instructor.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {course.instructor.role} • <strong className="text-blue-600 dark:text-blue-400">{course.instructor.company || 'Lead Architect'}</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'code' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Interactive Implementation Sandbox:
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">TypeScript / React 19</span>
                </div>
                <div className="bg-[#0a0f1d] text-emerald-400 p-4 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
                  <pre>{activeLesson.codeSnippet || `// Production Unit Implementation\nexport async function handleExecution() {\n  const startTime = performance.now();\n  console.log("Executing unit ${activeLesson.title}...");\n  return { status: "success", latency: performance.now() - startTime };\n}`}</pre>
                </div>
              </div>
            )}

            {activeTab === 'quiz' && (
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Concept Verification: What is the primary architecture principle demonstrated in {activeLesson.title}?
                </h4>
                <div className="space-y-2">
                  {[
                    'Ensuring type safety with strict compile-time inference and zero runtime overhead.',
                    'Direct DOM mutation bypassing state reconcile cycles.',
                    'Synchronous blocking network I/O in main thread execution.',
                  ].map((opt, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setQuizAnswer(index);
                        setQuizSubmitted(true);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        quizAnswer === index
                          ? index === 0
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold'
                            : 'bg-red-50 dark:bg-red-950/50 border-red-500 text-red-900 dark:text-red-200 font-bold'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {String.fromCharCode(65 + index)}. {opt}
                    </button>
                  ))}
                </div>

                {quizSubmitted && (
                  <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    quizAnswer === 0
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                  }`}>
                    <span className="material-symbols-outlined text-[16px]">
                      {quizAnswer === 0 ? 'check_circle' : 'info'}
                    </span>
                    {quizAnswer === 0 ? 'Correct! Excellent mastery of core engineering principles.' : 'Incorrect option. Review the video summary and try again!'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar: Modules & Syllabus Breakdown */}
          <div className="w-full lg:w-80 bg-slate-50 dark:bg-[#11192e] border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 overflow-y-auto">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Course Syllabus ({modules.length} Modules)
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {completedLessons} of {totalLessons} units completed
                </p>
              </div>

              {computedProgress >= 100 && (
                <button
                  onClick={handleClaimCertificate}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">military_tech</span>
                  Claim Cert
                </button>
              )}
            </div>

            {/* Modules List */}
            <div className="p-3 space-y-3 flex-1 overflow-y-auto">
              {modules.map((mod, modIdx) => (
                <div
                  key={mod.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#15203b] overflow-hidden"
                >
                  <div className="p-3 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {mod.title}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 shrink-0">
                      {mod.duration}
                    </span>
                  </div>

                  <div className="p-1 space-y-1">
                    {mod.lessons.map((lesson) => {
                      const isActive = activeLesson.id === lesson.id;
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => {
                            setActiveLesson(lesson);
                            setActiveModuleIndex(modIdx);
                            setQuizSubmitted(false);
                            setQuizAnswer(null);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start gap-2 cursor-pointer ${
                            isActive
                              ? 'bg-blue-600 text-white font-bold shadow-xs'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleLessonComplete(lesson.id);
                            }}
                            className={`material-symbols-outlined text-[16px] mt-0.5 cursor-pointer shrink-0 ${
                              lesson.completed
                                ? isActive
                                  ? 'text-white'
                                  : 'text-emerald-500'
                                : isActive
                                ? 'text-white/60'
                                : 'text-slate-400 hover:text-emerald-500'
                            }`}
                          >
                            {lesson.completed ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          <div className="flex-1 truncate">
                            <p className="truncate text-xs">{lesson.title}</p>
                            <span className={`text-[10px] ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                              {lesson.type.toUpperCase()} • {lesson.duration}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Cert Banner */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131d36]">
              {computedProgress >= 100 ? (
                <button
                  onClick={handleClaimCertificate}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  Download Course Certificate
                </button>
              ) : (
                <div className="text-center space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Complete all lessons to earn Course Certificate
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {totalLessons - completedLessons} lessons remaining
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
