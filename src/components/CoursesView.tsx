import React, { useState, useEffect } from 'react';
import { CourseItem, ViewType, YouTubeLearningTrack, UserProfile, UnofficialLearningRecord } from '../types';
import { initialCourses } from '../data/mockData';
import { supabaseService } from '../services/supabaseService';
import {
  extractYouTubeVideoId,
  extractYouTubeTimestamp,
  fetchYouTubeMetadataClient,
  loadUserTracks,
  saveUserTracks,
  formatSecondsToTime,
  downloadNotesAsPDF,
} from '../services/youtubeLearningService';
import { YouTubeSkillTrackPlayer } from './YouTubeSkillTrackPlayer';
import { UnofficialRecordModal } from './UnofficialRecordModal';
import { CoursePlayerModal } from './CoursePlayerModal';
import { CertificateGenerationModal } from './CertificateGenerationModal';
import { GeneratedCertificate } from '../types';

interface CoursesViewProps {
  user?: UserProfile;
  onNavigate: (view: ViewType) => void;
  onUpdateUser?: (updated: Partial<UserProfile>) => void;
  onAskNebulaAI?: (prompt: string) => void;
}

export const CoursesView: React.FC<CoursesViewProps> = ({
  user = {
    name: 'Learner',
    avatarUrl: '',
    email: 'learner@brainboost.ai',
    college: 'University',
    degree: 'B.Tech / BS Computer Science',
    gradYear: '2026',
    targetRole: 'Full Stack Developer',
    overallReadiness: 72,
    matchedSkillsCount: 18,
    totalTargetSkills: 24,
    learningProgress: 65,
    activeCoursesCount: 4,
    opportunitiesCount: 19,
    newMatchedCount: 7,
    learningRecords: [],
    earnedCertificates: [],
  },
  onNavigate,
  onUpdateUser,
  onAskNebulaAI,
}) => {
  // Tabs: 'youtube-tracks' vs 'platform-curriculum'
  const [activeMainTab, setActiveMainTab] = useState<'youtube-tracks' | 'platform-curriculum'>('youtube-tracks');
  
  // YouTube Skill Tracks State
  const [youtubeTracks, setYoutubeTracks] = useState<YouTubeLearningTrack[]>(() =>
    loadUserTracks(user.email || 'default')
  );
  const [pastedUrl, setPastedUrl] = useState<string>('');
  const [urlError, setUrlError] = useState<string>('');
  const [isAddingTrack, setIsAddingTrack] = useState<boolean>(false);
  const [activePlayerTrack, setActivePlayerTrack] = useState<YouTubeLearningTrack | null>(null);
  const [viewingRecord, setViewingRecord] = useState<UnofficialLearningRecord | null>(null);

  // Platform standard courses
  const [courses, setCourses] = useState<CourseItem[]>(initialCourses);

  useEffect(() => {
    supabaseService.fetchCourses().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setCourses(data);
      }
    });
  }, []);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [certModalItem, setCertModalItem] = useState<{ type: 'course' | 'youtube_track'; item: CourseItem | YouTubeLearningTrack } | null>(null);
  const [certToast, setCertToast] = useState<string | null>(null);

  const handleCertificateClaimed = (cert: GeneratedCertificate) => {
    if (onUpdateUser) {
      const existingCerts = user.earnedCertificates || [];
      const updated = [...existingCerts.filter((c) => c.serialId !== cert.serialId), cert];
      onUpdateUser({
        earnedCertificates: updated,
        certificationsCount: updated.length,
      });
    }
    setCertToast(`🎉 Certificate ${cert.serialId} saved to your profile!`);
    setTimeout(() => setCertToast(null), 4000);
  };

  // Recommended Tech Labs for instant one-click testing & learning
  const RECOMMENDED_LABS = [
    { title: 'React 19 & Server Actions', videoId: '8pDqJVdNa44', tag: 'Frontend' },
    { title: 'TypeScript 5 Advanced Generics', videoId: 'ahCwqrYqo9o', tag: 'TypeScript' },
    { title: 'System Design Architecture', videoId: 'tp4_p52aZ_g', tag: 'Distributed' },
    { title: 'Python AI & LLM Agents', videoId: 'Oe421EPjeBE', tag: 'AI & LLM' },
    { title: 'Docker & Kubernetes DevOps', videoId: 'mbsmsi7l3r4', tag: 'DevOps' },
  ];

  // Sync YouTube tracks to localStorage whenever updated
  useEffect(() => {
    saveUserTracks(user.email || 'default', youtubeTracks);
  }, [youtubeTracks, user.email]);

  // Handle URL submission for "Paste YouTube Learning URL"
  const handleAddYouTubeUrl = async (e?: React.FormEvent, directUrl?: string) => {
    if (e) e.preventDefault();
    setUrlError('');

    const targetUrl = (directUrl !== undefined ? directUrl : pastedUrl).trim();

    if (!targetUrl) {
      setUrlError('Please paste a YouTube learning video URL or video ID.');
      return;
    }

    const videoId = extractYouTubeVideoId(targetUrl);
    if (!videoId) {
      setUrlError('Invalid YouTube URL or ID. Please provide a standard link (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)');
      return;
    }

    const startSeconds = extractYouTubeTimestamp(targetUrl);

    // Check if already in list
    const existing = youtubeTracks.find((t) => t.videoId === videoId);
    if (existing) {
      const updatedExisting = startSeconds > 0 ? { ...existing, currentTime: startSeconds } : existing;
      setActivePlayerTrack(updatedExisting);
      setPastedUrl('');
      return;
    }

    setIsAddingTrack(true);
    try {
      // Resilient metadata resolver that NEVER throws error
      const meta = await fetchYouTubeMetadataClient(videoId, targetUrl);

      const newTrack: YouTubeLearningTrack = {
        id: `yt-track-${videoId}-${Date.now()}`,
        userId: user.email || 'default',
        videoId,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        title: meta.title || `YouTube Engineering Track (${videoId})`,
        channel: meta.channel || 'Technical Creator',
        channelUrl: meta.channelUrl || `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: meta.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        durationSeconds: meta.durationSeconds || 1200,
        durationFormatted: meta.durationFormatted || '20m 00s',
        verifiedWatchedSeconds: 0,
        currentTime: startSeconds || 0,
        completionPercentage: 0,
        status: 'in_progress',
        lastWatched: new Date().toISOString(),
        dateAdded: new Date().toISOString(),
        watchedRanges: [],
      };

      const updated = [newTrack, ...youtubeTracks];
      setYoutubeTracks(updated);
      saveUserTracks(user.email || 'default', updated);
      setPastedUrl('');
      setActivePlayerTrack(newTrack);
    } catch (err: any) {
      console.error('Failed to add track:', err);
      const fallbackTrack: YouTubeLearningTrack = {
        id: `yt-track-${videoId}-${Date.now()}`,
        userId: user.email || 'default',
        videoId,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        title: `YouTube Technical Lab (${videoId})`,
        channel: 'Technical Creator',
        channelUrl: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        durationSeconds: 1200,
        durationFormatted: '20m 00s',
        verifiedWatchedSeconds: 0,
        currentTime: startSeconds || 0,
        completionPercentage: 0,
        status: 'in_progress',
        lastWatched: new Date().toISOString(),
        dateAdded: new Date().toISOString(),
        watchedRanges: [],
      };
      const updated = [fallbackTrack, ...youtubeTracks];
      setYoutubeTracks(updated);
      saveUserTracks(user.email || 'default', updated);
      setPastedUrl('');
      setActivePlayerTrack(fallbackTrack);
    } finally {
      setIsAddingTrack(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setPastedUrl(text.trim());
          setUrlError('');
        }
      }
    } catch {
      // Permission fallback
    }
  };

  // Update track progress from player
  const handleUpdateTrack = (updatedTrack: YouTubeLearningTrack) => {
    setYoutubeTracks((prev) => {
      const index = prev.findIndex((t) => t.id === updatedTrack.id || t.videoId === updatedTrack.videoId);
      let nextList: YouTubeLearningTrack[];
      if (index >= 0) {
        nextList = [...prev];
        nextList[index] = updatedTrack;
      } else {
        nextList = [updatedTrack, ...prev];
      }
      saveUserTracks(user.email || 'default', nextList);
      return nextList;
    });

    // Sync learning record to user profile safely outside of setYoutubeTracks updater
    if (updatedTrack.learningRecord && onUpdateUser) {
      const records = user.learningRecords || [];
      if (!records.some((r) => r.recordId === updatedTrack.learningRecord?.recordId)) {
        onUpdateUser({
          learningRecords: [...records, updatedTrack.learningRecord],
        });
      }
    }
  };

  const [selectedCourseForPlayer, setSelectedCourseForPlayer] = useState<CourseItem | null>(null);

  const categories = ['All', 'Frontend', 'Backend', 'DevOps & Cloud', 'AI & Machine Learning', 'Security'];

  const filteredCourses = courses.filter((c) => {
    const matchesCategory = activeCategory === 'All' || c.category === activeCategory;
    const instructorName = typeof c.instructor === 'string' ? c.instructor : (c.instructor?.name || '');
    const instructorCompany = typeof c.instructor === 'object' ? (c.instructor?.company || '') : '';
    const tags = c.tags || c.skillsTaught || [];
    
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      c.title.toLowerCase().includes(query) ||
      instructorName.toLowerCase().includes(query) ||
      instructorCompany.toLowerCase().includes(query) ||
      tags.some((t) => t.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });

  const handleEnrollToggle = (courseId: string) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId) {
          const currentEnrolled = c.isEnrolled ?? c.enrolled;
          const newStatus = !currentEnrolled;
          const updatedCourse = {
            ...c,
            enrolled: newStatus,
            isEnrolled: newStatus,
            progress: newStatus ? (c.progress > 0 ? c.progress : 5) : 0,
          };
          if (newStatus) {
            setSelectedCourseForPlayer(updatedCourse);
          }
          return updatedCourse;
        }
        return c;
      })
    );
  };

  const handleUpdatePlatformCourse = (updatedCourse: CourseItem) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c))
    );
    if (selectedCourseForPlayer && selectedCourseForPlayer.id === updatedCourse.id) {
      setSelectedCourseForPlayer(updatedCourse);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-black bg-red-500/20 text-red-300 border border-red-400/30 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">smart_display</span>
                SKILL TRACKS & YOUTUBE LABS
              </span>
              <span className="text-xs text-slate-400 font-semibold">Real-Watch Time Verification</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Skill Tracks & Interactive Engineering Labs
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Paste any technical YouTube learning video to track real, non-skipped watch progress, generate AI summaries with Gemini, download notes as PDF, and earn verified completion records.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/10">
            <div className="text-center px-2">
              <span className="text-2xl font-black text-white">
                {youtubeTracks.length}
              </span>
              <span className="text-[11px] block text-slate-300 font-semibold">Active Tracks</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center px-2">
              <span className="text-2xl font-black text-emerald-400">
                {youtubeTracks.filter((t) => t.status === 'completed' || t.completionPercentage >= 85).length}
              </span>
              <span className="text-[11px] block text-slate-300 font-semibold">Verified Records</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature 1: "Paste YouTube Learning URL" Input Section */}
      <div className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-red-600 text-[20px]">play_circle</span>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            Paste YouTube Learning URL
          </h2>
          <span className="text-xs text-slate-400 hidden sm:inline">
            — Embeds official player, tracks real watched seconds & unlocks AI notes
          </span>
        </div>

        <form onSubmit={handleAddYouTubeUrl} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              link
            </span>
            <input
              type="text"
              placeholder="Paste YouTube URL, youtu.be, /shorts, or 11-char ID (e.g. https://www.youtube.com/watch?v=...)"
              value={pastedUrl}
              onChange={(e) => {
                setPastedUrl(e.target.value);
                setUrlError('');
              }}
              className="w-full pl-10 pr-24 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {pastedUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setPastedUrl('');
                    setUrlError('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                  title="Clear Input"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                title="Paste from Clipboard"
              >
                <span className="material-symbols-outlined text-[14px]">content_paste</span>
                <span className="hidden md:inline">Paste</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isAddingTrack}
            className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shrink-0"
          >
            {isAddingTrack ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Validating & Loading...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">play_circle</span>
                Load & Start Track
              </>
            )}
          </button>
        </form>

        {urlError && (
          <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5 pt-1">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {urlError}
          </p>
        )}

        {/* Quick Launch Recommended Tech Labs */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
              <span className="material-symbols-outlined text-[14px] text-amber-500">bolt</span>
              Try Popular Labs:
            </span>
            {RECOMMENDED_LABS.map((lab) => (
              <button
                key={lab.videoId}
                type="button"
                onClick={() => handleAddYouTubeUrl(undefined, `https://www.youtube.com/watch?v=${lab.videoId}`)}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-800 hover:border-red-400/40 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>{lab.title}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                  {lab.tag}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveMainTab('youtube-tracks')}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeMainTab === 'youtube-tracks'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#151f38] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">smart_display</span>
            YouTube Skill Tracks ({youtubeTracks.length})
          </button>

          <button
            onClick={() => setActiveMainTab('platform-curriculum')}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeMainTab === 'platform-curriculum'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#151f38] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            Platform Curriculum ({courses.length})
          </button>
        </div>
      </div>

      {/* TAB A: YOUTUBE LEARNING TRACKS CARDS */}
      {activeMainTab === 'youtube-tracks' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>My Saved Learning Cards</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {youtubeTracks.length} Tracks
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Resumes from your exact saved second. Real watch time is automatically verified without skip gaming.
              </p>
            </div>
          </div>

          {youtubeTracks.length === 0 ? (
            <div className="p-12 text-center space-y-4 bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-3xl">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[32px]">smart_display</span>
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">No YouTube Skill Tracks Added Yet</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Paste any YouTube programming video or engineering talk above to start tracking real watch time and generating notes!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {youtubeTracks.map((track) => {
                const isCompleted = track.status === 'completed' || track.completionPercentage >= 85;
                const formattedLastWatched = track.lastWatched
                  ? new Date(track.lastWatched).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recently';

                return (
                  <div
                    key={track.id}
                    className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs hover:shadow-xl transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Thumbnail Header */}
                      <div className="relative h-44 overflow-hidden bg-slate-900 cursor-pointer" onClick={() => setActivePlayerTrack(track)}>
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-600/90 text-white backdrop-blur-xs flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">smart_display</span>
                            YouTube Lab
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold backdrop-blur-xs ${
                              isCompleted
                                ? 'bg-emerald-500/90 text-white'
                                : 'bg-blue-600/90 text-white'
                            }`}
                          >
                            {isCompleted ? 'Verified Completed' : 'In Progress'}
                          </span>
                        </div>

                        {/* Play Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                            <span className="material-symbols-outlined text-[28px]">play_arrow</span>
                          </div>
                        </div>

                        {/* Bottom Stats */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-semibold">
                          <span className="flex items-center gap-1 text-slate-200">
                            <span className="material-symbols-outlined text-[15px] text-red-400">verified</span>
                            {track.channel}
                          </span>
                          <span className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-md font-mono text-[11px]">
                            {track.durationFormatted}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5 space-y-3">
                        <h3
                          onClick={() => setActivePlayerTrack(track)}
                          className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {track.title}
                        </h3>

                        {/* Verified Watch Progress */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-600 dark:text-slate-400">Verified Watch Time:</span>
                            <span className={isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}>
                              {formatSecondsToTime(track.verifiedWatchedSeconds)} ({track.completionPercentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isCompleted ? 'bg-emerald-500' : 'bg-blue-600'
                              }`}
                              style={{ width: `${Math.min(100, track.completionPercentage)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Saved Pos: {formatSecondsToTime(track.currentTime)}</span>
                            <span>Last: {formattedLastWatched}</span>
                          </div>
                        </div>

                        {/* AI Summary Badge preview if available */}
                        {track.aiSummary && (
                          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-700 dark:text-blue-300 flex items-center justify-between">
                            <span className="flex items-center gap-1 font-bold">
                              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                              AI Notes Ready
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {track.aiSummary.keyPoints?.length || 5} takeaways
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                      {/* Card Footer Actions */}
                      <div className="p-5 pt-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setActivePlayerTrack(track)}
                            className={`flex-1 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                              isCompleted
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                            {track.currentTime > 0 ? 'Continue Learning' : 'Start Track'}
                          </button>

                          <button
                            onClick={() => downloadNotesAsPDF(track, user.name)}
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Download Notes as PDF"
                          >
                            <span className="material-symbols-outlined text-[18px]">download</span>
                          </button>

                          <button
                            onClick={() => setCertModalItem({ type: 'youtube_track', item: track })}
                            className="p-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                            title="Generate & Download Certificate"
                          >
                            <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                          </button>
                        </div>

                        {isCompleted && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => setCertModalItem({ type: 'youtube_track', item: track })}
                              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                            >
                              <span className="material-symbols-outlined text-[15px]">workspace_premium</span>
                              Generate & Download Certificate
                            </button>

                            {track.learningRecord && (
                              <button
                                onClick={() => setViewingRecord(track.learningRecord!)}
                                className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                                title="View Verified Record"
                              >
                                <span className="material-symbols-outlined text-[15px]">military_tech</span>
                                Record
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB B: PLATFORM MASTERCLASSES */}
      {activeMainTab === 'platform-curriculum' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search masterclasses, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Categories */}
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
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
          </div>

          {/* Course Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const isEnrolled = course.isEnrolled ?? course.enrolled;
              const instructorName = typeof course.instructor === 'string' ? course.instructor : (course.instructor?.name || 'Staff Instructor');
              const instructorRole = typeof course.instructor === 'object' ? (course.instructor?.role || 'Lead') : '';
              const instructorCompany = typeof course.instructor === 'object' ? (course.instructor?.company || 'Brainboost') : '';
              const instructorAvatar = typeof course.instructor === 'object' ? course.instructor?.avatar : '';
              const thumbnail = course.thumbnail || course.coverImage || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80';
              const modulesCount = course.modules?.length || course.modulesCount || 4;
              const skills = course.skillsTaught || course.tags || [];

              return (
                <div
                  key={course.id}
                  className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs hover:shadow-xl transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Thumbnail Header */}
                    <div className="relative h-44 overflow-hidden bg-slate-900 cursor-pointer" onClick={() => setSelectedCourseForPlayer(course)}>
                      <img
                        src={thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-xs border border-white/10">
                          {course.category}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-blue-600/90 text-white backdrop-blur-xs">
                          {course.level}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-semibold">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-amber-400">star</span>
                          {course.rating} ({course.totalStudents ? course.totalStudents.toLocaleString() : '1,200'} learners)
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          {course.duration}
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-3">
                      <h3
                        onClick={() => setSelectedCourseForPlayer(course)}
                        className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                      >
                        {course.title}
                      </h3>

                      {/* Instructor block */}
                      <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                        {instructorAvatar ? (
                          <img
                            src={instructorAvatar}
                            alt={instructorName}
                            className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <span className="material-symbols-outlined text-[18px] text-slate-400">account_circle</span>
                        )}
                        <span className="truncate">
                          <strong className="text-slate-800 dark:text-slate-200 font-semibold">{instructorName}</strong>
                          {instructorCompany && <span className="text-slate-400"> • {instructorCompany}</span>}
                        </span>
                      </div>

                      {/* Progress bar if enrolled */}
                      {isEnrolled && (
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">auto_stories</span>
                              Progress ({modulesCount} Modules)
                            </span>
                            <span>{course.progress || 0}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${course.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Skills taught */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {skills.slice(0, 4).map((skill, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-5 pt-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedCourseForPlayer(course)}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">menu_book</span>
                        Syllabus
                      </button>

                      <button
                        onClick={() => {
                          if (!isEnrolled) {
                            handleEnrollToggle(course.id);
                          } else {
                            setSelectedCourseForPlayer(course);
                          }
                        }}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                          isEnrolled
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {isEnrolled ? 'play_arrow' : 'school'}
                        </span>
                        {isEnrolled ? 'Resume Class' : 'Enroll Free'}
                      </button>
                    </div>

                    <button
                      onClick={() => setCertModalItem({ type: 'course', item: course })}
                      className="w-full py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">military_tech</span>
                      Verify Watch-Time & Issue Certificate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {certToast && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-fade-in">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          {certToast}
        </div>
      )}

      {/* Certificate Generation & Watch-Time Verification Modal */}
      {certModalItem && (
        <CertificateGenerationModal
          type={certModalItem.type}
          item={certModalItem.item}
          user={user}
          onClose={() => setCertModalItem(null)}
          onCertificateClaimed={handleCertificateClaimed}
          onShareToNetwork={(cert) => {
            setCertModalItem(null);
            onNavigate('network');
          }}
        />
      )}

      {/* Active YouTube Embedded Player & Live Anti-Skip Tracker Modal */}
      {activePlayerTrack && (
        <YouTubeSkillTrackPlayer
          track={activePlayerTrack}
          user={user}
          onUpdateTrack={handleUpdateTrack}
          onClose={() => setActivePlayerTrack(null)}
          onAskNebulaAI={onAskNebulaAI}
          onGenerateCertificate={(track) => setCertModalItem({ type: 'youtube_track', item: track })}
        />
      )}

      {/* Unofficial Learning Record Modal */}
      {viewingRecord && (
        <UnofficialRecordModal
          record={viewingRecord}
          onClose={() => setViewingRecord(null)}
        />
      )}

      {/* Interactive Platform Course Player & Classroom Modal */}
      {selectedCourseForPlayer && (
        <CoursePlayerModal
          course={selectedCourseForPlayer}
          user={user}
          onClose={() => setSelectedCourseForPlayer(null)}
          onUpdateCourse={handleUpdatePlatformCourse}
          onAskNebulaAI={onAskNebulaAI}
        />
      )}
    </div>
  );
};
