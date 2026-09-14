import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { YouTubeLearningTrack, UserProfile, UnofficialLearningRecord } from '../types';
import {
  formatSecondsToTime,
  mergeWatchedInterval,
  calculateTotalVerifiedSeconds,
  createUnofficialRecord,
  downloadNotesAsPDF,
  downloadRecordAsPDF,
} from '../services/youtubeLearningService';

interface YouTubeSkillTrackPlayerProps {
  track: YouTubeLearningTrack;
  user: UserProfile;
  onUpdateTrack: (updated: YouTubeLearningTrack) => void;
  onClose: () => void;
  onAskNebulaAI?: (prompt: string) => void;
  onGenerateCertificate?: (track: YouTubeLearningTrack) => void;
}

export const YouTubeSkillTrackPlayer: React.FC<YouTubeSkillTrackPlayerProps> = ({
  track,
  user,
  onUpdateTrack,
  onClose,
  onAskNebulaAI,
  onGenerateCertificate,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'player' | 'summary' | 'notes' | 'record'>('player');

  // Video playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(track.currentTime || 0);
  const [duration, setDuration] = useState<number>(track.durationSeconds || 1200);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [verifiedSeconds, setVerifiedSeconds] = useState<number>(track.verifiedWatchedSeconds || 0);
  const [watchedRanges, setWatchedRanges] = useState<[number, number][]>(track.watchedRanges || []);
  const [completionPercentage, setCompletionPercentage] = useState<number>(track.completionPercentage || 0);

  // AI Notes & Summary state
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<any>(track.aiSummary || null);
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<number, string>>({});
  const [showQuizResults, setShowQuizResults] = useState<boolean>(false);

  // Personal notes state
  const [studentNotes, setStudentNotes] = useState<string>(track.notes || '');
  const [notesSaveStatus, setNotesSaveStatus] = useState<'saved' | 'saving'>('saved');

  // Record UI state
  const [copiedRecordId, setCopiedRecordId] = useState<boolean>(false);

  // DOM and Tracker references
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const lastCheckedTimeRef = useRef<number>(track.currentTime || 0);
  const intervalTrackerRef = useRef<any>(null);
  const watchedRangesRef = useRef<[number, number][]>(track.watchedRanges || []);
  const trackRef = useRef<YouTubeLearningTrack>(track);
  const onUpdateTrackRef = useRef(onUpdateTrack);
  const userRef = useRef(user);
  const studentNotesRef = useRef(studentNotes);
  const lastPersistTimeRef = useRef<number>(Date.now());
  const isPlayingRef = useRef<boolean>(isPlaying);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hasPlaybackError, setHasPlaybackError] = useState<boolean>(false);

  // Stable Iframe Embed Source: CRITICAL to prevent infinite iframe reload/refresh loop!
  // The iframe src MUST NEVER be modified while playing the video; seeking is handled exclusively via postMessage.
  const initialStartSecondsRef = useRef<number>(Math.max(0, Math.floor(track.currentTime || 0)));
  const initialVideoIdRef = useRef<string>(track.videoId);

  if (initialVideoIdRef.current !== track.videoId) {
    initialVideoIdRef.current = track.videoId;
    initialStartSecondsRef.current = Math.max(0, Math.floor(track.currentTime || 0));
  }

  const originParam = useMemo(() => {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      try {
        return `&origin=${encodeURIComponent(window.location.origin)}`;
      } catch {
        return '';
      }
    }
    return '';
  }, []);

  const embedSrc = useMemo(() => {
    const vid = initialVideoIdRef.current;
    const startSec = initialStartSecondsRef.current;
    const startParam = startSec > 0 ? `&start=${startSec}` : '';
    return `https://www.youtube-nocookie.com/embed/${vid}?enablejsapi=1&autoplay=1${startParam}&rel=0&modestbranding=1&playsinline=1${originParam}`;
  }, [track.videoId, originParam]);

  // Timeline Scrubbing & Mouse Drag state
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [scrubTime, setScrubTime] = useState<number>(track.currentTime || 0);
  const [scrubHoverTime, setScrubHoverTime] = useState<number | null>(null);
  const [scrubHoverPercent, setScrubHoverPercent] = useState<number>(0);
  const isScrubbingRef = useRef<boolean>(false);

  useEffect(() => {
    isScrubbingRef.current = isScrubbing;
  }, [isScrubbing]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    trackRef.current = track;
  }, [track]);

  useEffect(() => {
    onUpdateTrackRef.current = onUpdateTrack;
  }, [onUpdateTrack]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    studentNotesRef.current = studentNotes;
  }, [studentNotes]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Synchronize track updates safely to parent with throttling
  const persistTrackState = useCallback((forceImmediate = false) => {
    const now = Date.now();
    if (!forceImmediate && now - lastPersistTimeRef.current < 3000) {
      return;
    }
    lastPersistTimeRef.current = now;

    const currentTrack = trackRef.current;
    const currentUser = userRef.current;
    const totalSecs = calculateTotalVerifiedSeconds(watchedRangesRef.current);
    const dur = duration > 0 ? duration : (currentTrack.durationSeconds || 1200);
    const rawPercent = dur > 0 ? Math.min(100, Math.round((totalSecs / dur) * 100)) : 0;
    const isCompleted = rawPercent >= 85 || currentTrack.status === 'completed';

    let record = currentTrack.learningRecord;
    if (isCompleted && !record) {
      record = createUnofficialRecord(currentUser.name, currentUser.email, {
        ...currentTrack,
        verifiedWatchedSeconds: totalSecs,
        completionPercentage: rawPercent,
        status: 'completed',
      });
    }

    onUpdateTrackRef.current({
      ...currentTrack,
      currentTime: lastCheckedTimeRef.current,
      verifiedWatchedSeconds: totalSecs,
      durationSeconds: dur,
      durationFormatted: formatSecondsToTime(dur),
      watchedRanges: watchedRangesRef.current,
      completionPercentage: rawPercent,
      status: isCompleted ? 'completed' : 'in_progress',
      lastWatched: new Date().toISOString(),
      learningRecord: record,
      notes: studentNotesRef.current,
      aiSummary: summaryData || currentTrack.aiSummary,
    });
  }, [duration, summaryData]);

  // Send postMessage commands directly to embedded YouTube iframe
  const sendIframeCommand = useCallback((func: string, args: any[] = []) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    try {
      const message = JSON.stringify({
        event: 'command',
        func,
        args,
      });
      iframeRef.current.contentWindow.postMessage(message, '*');
    } catch (e) {
      console.warn('postMessage command error:', e);
    }
  }, []);

  const handleIframeLoad = useCallback(() => {
    // Handshake with YouTube Iframe API
    sendIframeCommand('listening');
    if (isPlayingRef.current) {
      sendIframeCommand('playVideo');
    }
  }, [sendIframeCommand]);

  // Handle incoming postMessage events from YouTube player
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data || typeof data !== 'object') return;

        // Catch YouTube playback errors (e.g. error 101/150 for restricted embeds)
        if (
          data.event === 'onError' ||
          (data.info && typeof data.info === 'number' && [2, 5, 100, 101, 150].includes(data.info))
        ) {
          if (data.info === 101 || data.info === 150 || data.info === 100) {
            setHasPlaybackError(true);
          }
        }

        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number') {
            const time = data.info.currentTime;
            if (!isScrubbingRef.current) {
              setCurrentTime(time);
              lastCheckedTimeRef.current = time;
            }
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            setDuration(data.info.duration);
          }
          if (typeof data.info.playerState === 'number') {
            // 1: playing, 2: paused, 0: ended
            if (data.info.playerState === 1) {
              setIsPlaying(true);
            } else if (data.info.playerState === 2 || data.info.playerState === 0) {
              setIsPlaying(false);
              persistTrackState(true);
            }
          }
        } else if (data.event === 'onStateChange') {
          if (data.info === 1) {
            setIsPlaying(true);
          } else if (data.info === 2 || data.info === 0) {
            setIsPlaying(false);
            persistTrackState(true);
          }
        }
      } catch (e) {
        // Non-JSON message from external frame, ignore safely
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [persistTrackState]);

  // Anti-skip Real watch-time tracking loop
  useEffect(() => {
    if (!isPlaying) {
      if (intervalTrackerRef.current) {
        clearInterval(intervalTrackerRef.current);
        intervalTrackerRef.current = null;
      }
      return;
    }

    intervalTrackerRef.current = setInterval(() => {
      // Do not update currentTime if the learner is actively mouse dragging or scrubbing the slider
      if (isScrubbingRef.current) {
        return;
      }

      const prev = lastCheckedTimeRef.current;
      const current = prev + 0.5 * playbackSpeed;
      const dur = duration > 0 ? duration : 1200;

      if (current <= dur) {
        lastCheckedTimeRef.current = current;
        setCurrentTime(current);
        setScrubTime(current);

        const prevRanges = watchedRangesRef.current;
        const updatedRanges = mergeWatchedInterval(prevRanges, [prev, current]);
        watchedRangesRef.current = updatedRanges;
        const totalSecs = calculateTotalVerifiedSeconds(updatedRanges);
        const rawPercent = dur > 0 ? Math.min(100, Math.round((totalSecs / dur) * 100)) : 0;

        setWatchedRanges(updatedRanges);
        setVerifiedSeconds(totalSecs);
        setCompletionPercentage(rawPercent);

        persistTrackState(false);
      } else {
        setIsPlaying(false);
        persistTrackState(true);
      }
    }, 500);

    return () => {
      if (intervalTrackerRef.current) {
        clearInterval(intervalTrackerRef.current);
        intervalTrackerRef.current = null;
      }
    };
  }, [isPlaying, duration, playbackSpeed, persistTrackState]);

  // Robust Play/Pause controls with instant UI feedback and postMessage dispatch
  const handleTogglePlayPause = useCallback(() => {
    if (isPlaying) {
      sendIframeCommand('pauseVideo');
      setIsPlaying(false);
      persistTrackState(true);
    } else {
      sendIframeCommand('playVideo');
      setIsPlaying(true);
    }
  }, [isPlaying, sendIframeCommand, persistTrackState]);

  // Jump to specific timestamp
  const handleSeekTo = (timeStrOrSeconds: string | number) => {
    let seconds = 0;
    if (typeof timeStrOrSeconds === 'number') {
      seconds = timeStrOrSeconds;
    } else {
      const parts = timeStrOrSeconds.split(':').map(Number);
      if (parts.length === 2) {
        seconds = parts[0] * 60 + parts[1];
      } else if (parts.length === 3) {
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
    }

    const clamped = Math.max(0, Math.min(duration, seconds));
    sendIframeCommand('seekTo', [clamped, true]);
    sendIframeCommand('playVideo');
    lastCheckedTimeRef.current = clamped;
    setCurrentTime(clamped);
    setScrubTime(clamped);
    setIsPlaying(true);
    setActiveTab('player');
  };

  // Timeline Mouse Drag / Scrubbing Handlers
  const handleScrubStart = (val: number) => {
    setIsScrubbing(true);
    setScrubTime(val);
  };

  const handleScrubChange = (val: number) => {
    setScrubTime(val);
  };

  const handleScrubCommit = (val?: number) => {
    const target = val !== undefined ? val : scrubTime;
    setIsScrubbing(false);
    handleSeekTo(target);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const dur = duration > 0 ? duration : 1200;
    setScrubHoverPercent(pos * 100);
    setScrubHoverTime(pos * dur);
  };

  const handleTimelineMouseLeave = () => {
    setScrubHoverTime(null);
  };

  // Jump relative seconds (rewind / skip 10s)
  const handleSeekRelative = (deltaSeconds: number) => {
    const nextTime = Math.max(0, Math.min(duration, currentTime + deltaSeconds));
    sendIframeCommand('seekTo', [nextTime, true]);
    lastCheckedTimeRef.current = nextTime;
    setCurrentTime(nextTime);
    setScrubTime(nextTime);
  };

  // Change playback speed
  const handleSetSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    sendIframeCommand('setPlaybackRate', [speed]);
  };

  // Toggle Mute
  const handleToggleMute = () => {
    if (isMuted) {
      sendIframeCommand('unMute');
      setIsMuted(false);
    } else {
      sendIframeCommand('mute');
      setIsMuted(true);
    }
  };

  // Completely independent AI summary generation
  const handleGenerateSummary = async () => {
    if (isGeneratingSummary) return;
    setIsGeneratingSummary(true);
    try {
      const res = await fetch('/api/youtube/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: track.videoId,
          videoTitle: track.title,
          channel: track.channel,
          userNotes: studentNotes,
        }),
      });
      const data = await res.json();
      if (data.summary) {
        setSummaryData(data.summary);
        onUpdateTrackRef.current({
          ...trackRef.current,
          aiSummary: data.summary,
        });
      }
    } catch (err) {
      console.error('Failed to generate AI summary:', err);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Save student notes with visual indicator
  const handleSaveNotes = (newNotes: string) => {
    setStudentNotes(newNotes);
    setNotesSaveStatus('saving');
    setTimeout(() => {
      setNotesSaveStatus('saved');
    }, 400);
    onUpdateTrackRef.current({
      ...trackRef.current,
      notes: newNotes,
      lastWatched: new Date().toISOString(),
    });
  };

  const isCompleted = completionPercentage >= 85 || track.status === 'completed';
  const learningRecord = track.learningRecord || (isCompleted ? createUnofficialRecord(user.name, user.email, track) : null);

  const handleCopyRecordId = () => {
    if (learningRecord) {
      navigator.clipboard.writeText(learningRecord.recordId);
      setCopiedRecordId(true);
      setTimeout(() => setCopiedRecordId(false), 2000);
    }
  };

  const handleShareLinkedIn = () => {
    if (!learningRecord) return;
    const text = encodeURIComponent(
      `Excited to share that I completed a self-directed verified technical study course on "${learningRecord.videoTitle}" from ${learningRecord.channel} via Brainboost.\n\nVerified Watch Time: ${learningRecord.verifiedWatchFormatted} (${learningRecord.completionPercentage}% verified completion).\nUnofficial Record ID: ${learningRecord.recordId}\n#Engineering #ContinuousLearning #FullStack`
    );
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${text}`, '_blank');
  };

  const handleModalClose = () => {
    persistTrackState(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-5xl w-full overflow-hidden shadow-2xl flex flex-col my-auto max-h-[94vh]">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between gap-4 bg-slate-950/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">smart_display</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                  YouTube Skill Track
                </span>
                <span className="text-xs text-slate-400 truncate">
                  {track.channel}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-xl">
                {track.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://www.youtube.com/watch?v=${track.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Open video on YouTube in a new tab"
            >
              <span className="material-symbols-outlined text-[16px] text-red-400">open_in_new</span>
              YouTube
            </a>

            {isCompleted && (
              <span className="hidden md:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                Verified {completionPercentage}%
              </span>
            )}
            <button
              onClick={handleModalClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Player"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Real-time Watch Verification Progress Ribbon & Global Play/Pause Control */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Direct Play/Pause Button */}
            <button
              onClick={handleTogglePlayPause}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                isPlaying
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              title={isPlaying ? 'Pause Video Playback' : 'Play Video'}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
              <span>{isPlaying ? 'Pause Video' : 'Play Video'}</span>
            </button>

            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="hidden sm:inline">{isPlaying ? 'Verified Real Watch Active' : 'Playback Paused'}</span>
            </div>

            <div className="text-slate-400 hidden sm:block">
              Verified: <strong className="text-blue-400">{formatSecondsToTime(verifiedSeconds)}</strong> / {formatSecondsToTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-24 sm:w-36 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isCompleted ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, completionPercentage)}%` }}
                />
              </div>
              <span className="font-extrabold text-white">{completionPercentage}%</span>
            </div>
            <span className="text-[11px] text-slate-400 hidden md:inline">
              (Anti-skip verified)
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-900/90 px-4 sm:px-6 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('player')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'player'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">play_circle</span>
            Video Player & Lab
          </button>
          <button
            onClick={() => {
              setActiveTab('summary');
              if (!summaryData && !isGeneratingSummary) {
                handleGenerateSummary();
              }
            }}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'summary'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            AI Summary & Key Takeaways
            {isGeneratingSummary && <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />}
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'notes'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            My Notes & PDF Export
          </button>
          <button
            onClick={() => setActiveTab('record')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'record'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">military_tech</span>
            Completion Record {isCompleted ? '✓' : ''}
          </button>
        </div>

        {/* Main Content Area - All panels stay permanently in DOM so video player never goes blank or restarts */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: PLAYER & LIVE METRICS */}
          <div className={activeTab === 'player' ? 'space-y-5 block' : 'hidden'}>
            {/* Embedded YouTube Iframe (Always mounted and connected) */}
            <div
              ref={playerContainerRef}
              className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-800 group"
            >
              <iframe
                ref={iframeRef}
                src={embedSrc}
                title={track.title}
                onLoad={handleIframeLoad}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="w-full h-full border-0"
              />

              {/* Direct Playback Overlay / Fallback if embed is restricted */}
              {hasPlaybackError && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                  <span className="material-symbols-outlined text-4xl text-amber-400">smart_display</span>
                  <h4 className="text-base font-bold text-white">Video Playback on 3rd-Party Embeds</h4>
                  <p className="text-xs text-slate-300 max-w-md">
                    This video creator may have restricted direct iframe embedding. You can watch directly on YouTube while keeping your Brainboost watch tracker, notes, and AI summary synchronized!
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <a
                      href={`https://www.youtube.com/watch?v=${track.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg"
                    >
                      <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                      Watch on YouTube
                    </a>
                    <button
                      onClick={() => setHasPlaybackError(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                    >
                      Retry Player
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Player Interactive Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleSeekRelative(-10)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                  title="Rewind 10 seconds"
                >
                  <span className="material-symbols-outlined text-[16px]">replay_10</span>
                  <span className="hidden sm:inline">-10s</span>
                </button>

                <button
                  onClick={handleTogglePlayPause}
                  className={`px-4 py-2 rounded-xl text-white font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                    isPlaying ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                  {isPlaying ? 'Pause' : 'Play Video'}
                </button>

                <button
                  onClick={() => handleSeekRelative(10)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                  title="Forward 10 seconds"
                >
                  <span className="material-symbols-outlined text-[16px]">forward_10</span>
                  <span className="hidden sm:inline">+10s</span>
                </button>

                {/* Speed Selector */}
                <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Speed:</span>
                  {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => handleSetSpeed(spd)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold transition-colors cursor-pointer ${
                        playbackSpeed === spd
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                {/* Mute Toggle */}
                <button
                  onClick={handleToggleMute}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isMuted ? 'volume_off' : 'volume_up'}
                  </span>
                </button>

                {/* Fullscreen Toggle */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <a
                  href={`https://www.youtube.com/watch?v=${track.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  <span>Direct YouTube</span>
                </a>
                <span>Pos: <strong className="text-white font-mono">{formatSecondsToTime(currentTime)}</strong> / {formatSecondsToTime(duration)}</span>
              </div>
            </div>

            {/* Interactive Time Scrubber with Mouse Drag, Hover Tooltip, & Heatmap */}
            <div
              className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 relative select-none"
              onMouseMove={handleTimelineMouseMove}
              onMouseLeave={handleTimelineMouseLeave}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Timeline Scrubber</span>
                  {isScrubbing && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30 animate-pulse">
                      Seeking...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono text-[11px]">
                    {duration > 0 ? Math.round(((isScrubbing ? scrubTime : currentTime) / duration) * 100) : 0}%
                  </span>
                  <span className="text-blue-400 font-mono font-bold">
                    {formatSecondsToTime(isScrubbing ? scrubTime : currentTime)} / {formatSecondsToTime(duration)}
                  </span>
                </div>
              </div>

              {/* Slider Track with Custom Fill & Watched Segments */}
              <div className="relative w-full h-4 flex items-center group/scrubber cursor-pointer">
                {/* Background Track */}
                <div className="absolute inset-x-0 h-2 bg-slate-800/90 rounded-full overflow-hidden">
                  {/* Watched Verified Ranges Heatmap */}
                  {watchedRanges.map(([start, end], idx) => {
                    const dur = duration > 0 ? duration : 1200;
                    const leftPct = (start / dur) * 100;
                    const widthPct = Math.max(0.5, ((end - start) / dur) * 100);
                    return (
                      <div
                        key={idx}
                        className="absolute top-0 bottom-0 bg-emerald-500/40"
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        title={`Verified Watched: ${formatSecondsToTime(start)} - ${formatSecondsToTime(end)}`}
                      />
                    );
                  })}
                  {/* Current Position Fill */}
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-none"
                    style={{
                      width: `${duration > 0 ? ((isScrubbing ? scrubTime : currentTime) / duration) * 100 : 0}%`,
                    }}
                  />
                </div>

                {/* Range Input for Native & Mouse Drag Interaction */}
                <input
                  type="range"
                  min={0}
                  max={duration || 1200}
                  step={0.5}
                  value={isScrubbing ? scrubTime : currentTime}
                  onPointerDown={(e) => handleScrubStart(Number((e.target as HTMLInputElement).value))}
                  onMouseDown={(e) => handleScrubStart(Number((e.target as HTMLInputElement).value))}
                  onTouchStart={(e) => handleScrubStart(Number((e.target as HTMLInputElement).value))}
                  onInput={(e) => handleScrubChange(Number((e.target as HTMLInputElement).value))}
                  onChange={(e) => handleScrubChange(Number((e.target as HTMLInputElement).value))}
                  onPointerUp={(e) => handleScrubCommit(Number((e.target as HTMLInputElement).value))}
                  onMouseUp={(e) => handleScrubCommit(Number((e.target as HTMLInputElement).value))}
                  onTouchEnd={(e) => handleScrubCommit(Number((e.target as HTMLInputElement).value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />

                {/* Visible Slider Knob / Thumb */}
                <div
                  className={`absolute w-4 h-4 bg-white rounded-full shadow-lg border-2 border-blue-500 pointer-events-none transform -translate-x-1/2 transition-transform duration-75 ${
                    isScrubbing ? 'scale-125 ring-4 ring-blue-500/30' : 'group-hover/scrubber:scale-110'
                  }`}
                  style={{
                    left: `${duration > 0 ? ((isScrubbing ? scrubTime : currentTime) / duration) * 100 : 0}%`,
                  }}
                />

                {/* Hover Tooltip */}
                {scrubHoverTime !== null && !isScrubbing && (
                  <div
                    className="absolute -top-7 transform -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-white shadow-md pointer-events-none whitespace-nowrap z-20"
                    style={{ left: `${scrubHoverPercent}%` }}
                  >
                    {formatSecondsToTime(scrubHoverTime)}
                  </div>
                )}
              </div>
            </div>

            {/* Progress & Quick Stats Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[11px] uppercase font-bold text-slate-400">Current Position</span>
                <div className="text-xl font-black text-white">{formatSecondsToTime(currentTime)}</div>
                <p className="text-[11px] text-slate-400">Resumes automatically without losing progress</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[11px] uppercase font-bold text-slate-400">Verified Real Watch Time</span>
                <div className="text-xl font-black text-blue-400">{formatSecondsToTime(verifiedSeconds)}</div>
                <p className="text-[11px] text-slate-400">Excludes fast-forwarded / skipped intervals</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[11px] uppercase font-bold text-slate-400">Learning Status</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xl font-black ${
                      isCompleted ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {isCompleted ? 'Completed Verified' : `${completionPercentage}% Watched`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isCompleted ? 'Unofficial Record ready' : 'Earn certificate record at 85%'}
                </p>
              </div>
            </div>

            {/* Quick Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveTab('summary');
                    if (!summaryData && !isGeneratingSummary) {
                      handleGenerateSummary();
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  View AI Summary
                </button>
                <button
                  onClick={() => downloadNotesAsPDF(track, user.name)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Download Notes PDF
                </button>
              </div>

              {onAskNebulaAI && (
                <button
                  onClick={() => {
                    onAskNebulaAI(
                      `I am studying the YouTube track "${track.title}" by ${track.channel}. Can you test my understanding and explain the core architectural ideas?`
                    );
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">psychology</span>
                  Ask Nebula AI About This
                </button>
              )}
            </div>
          </div>

          {/* TAB 2: AI SUMMARY & TAKEAWAYS */}
          <div className={activeTab === 'summary' ? 'space-y-6 block' : 'hidden'}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-400">auto_awesome</span>
                  Gemini AI Technical Summary & Video Breakdown
                </h3>
                <p className="text-xs text-slate-400">
                  Extracted insights, timestamp chapters, and key architectural patterns (Video plays in background)
                </p>
              </div>

              <button
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-blue-400 border border-blue-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[16px] ${isGeneratingSummary ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                {isGeneratingSummary ? 'Analyzing Video...' : 'Regenerate'}
              </button>
            </div>

            {isGeneratingSummary && !summaryData ? (
              <div className="p-12 text-center space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800">
                <span className="material-symbols-outlined text-4xl text-blue-400 animate-spin">
                  progress_activity
                </span>
                <p className="text-sm font-bold text-white">Generating In-Depth AI Technical Breakdown...</p>
                <p className="text-xs text-slate-400">Synthesizing core takeaways, timestamps, and quizzes with Gemini</p>
              </div>
            ) : summaryData ? (
              <div className="space-y-6">
                {/* Executive Summary */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <span className="text-[10px] uppercase font-black tracking-wider text-blue-400">
                    Executive Summary
                  </span>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {summaryData.summary}
                  </p>
                </div>

                {/* Key Takeaways */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400">
                    Key Technical Takeaways
                  </span>
                  <ul className="space-y-2">
                    {summaryData.keyPoints?.map((point: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-300">
                        <span className="material-symbols-outlined text-emerald-400 text-[18px] shrink-0 mt-0.5">
                          check_circle
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Timestamp Chapters */}
                {summaryData.timestamps && summaryData.timestamps.length > 0 && (
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <span className="text-[10px] uppercase font-black tracking-wider text-purple-400">
                      Interactive Timestamp Chapters (Click to Seek Video)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {summaryData.timestamps.map((ts: any, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => handleSeekTo(ts.time)}
                          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/40 transition-all cursor-pointer flex items-start gap-3 group"
                        >
                          <span className="px-2 py-1 rounded-lg text-xs font-mono font-bold bg-purple-500/20 text-purple-300 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                            {ts.time}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                              {ts.title}
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                              {ts.note}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Knowledge Check */}
                {summaryData.quiz && summaryData.quiz.length > 0 && (
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-black tracking-wider text-amber-400">
                        Self-Assessment Quick Quiz
                      </span>
                      <button
                        onClick={() => setShowQuizResults(!showQuizResults)}
                        className="text-xs text-amber-300 font-bold hover:underline cursor-pointer"
                      >
                        {showQuizResults ? 'Hide Answers' : 'Reveal Answers'}
                      </button>
                    </div>

                    <div className="space-y-4">
                      {summaryData.quiz.map((q: any, qIdx: number) => (
                        <div key={qIdx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                          <p className="text-xs sm:text-sm font-bold text-white">
                            {qIdx + 1}. {q.question}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {q.options?.map((opt: string, optIdx: number) => {
                              const isSelected = selectedQuizAnswers[qIdx] === opt;
                              const isCorrect = q.correctAnswer === opt;
                              return (
                                <button
                                  key={optIdx}
                                  onClick={() =>
                                    setSelectedQuizAnswers((prev) => ({
                                      ...prev,
                                      [qIdx]: opt,
                                    }))
                                  }
                                  className={`p-2.5 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                                    showQuizResults
                                      ? isCorrect
                                        ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300 font-bold'
                                        : isSelected
                                        ? 'bg-red-500/20 border border-red-500 text-red-300'
                                        : 'bg-slate-950/50 border border-slate-800 text-slate-400'
                                      : isSelected
                                      ? 'bg-blue-600 text-white font-bold'
                                      : 'bg-slate-950/50 hover:bg-slate-800 border border-slate-800 text-slate-300'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                          {showQuizResults && (
                            <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                              <strong>Explanation:</strong> {q.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* TAB 3: NOTES & PDF EXPORT */}
          <div className={activeTab === 'notes' ? 'space-y-5 block' : 'hidden'}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-400">edit_note</span>
                  Personal Learning Notes
                </h3>
                <p className="text-xs text-slate-400">
                  Auto-saved per user session and included in your PDF download package
                </p>
              </div>

              <button
                onClick={() => downloadNotesAsPDF(track, user.name)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Download Notes as PDF
              </button>
            </div>

            <textarea
              value={studentNotes}
              onChange={(e) => handleSaveNotes(e.target.value)}
              placeholder="Write your study notes, code takeaways, implementation thoughts, or questions to ask Nebula AI here..."
              rows={10}
              className="w-full p-4 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed"
            />

            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className={`material-symbols-outlined text-[16px] ${notesSaveStatus === 'saving' ? 'text-blue-400 animate-spin' : 'text-emerald-400'}`}>
                  {notesSaveStatus === 'saving' ? 'sync' : 'cloud_done'}
                </span>
                {notesSaveStatus === 'saving' ? 'Saving notes...' : 'Notes securely saved to user library'}
              </span>
              <span>{studentNotes.length} characters</span>
            </div>
          </div>

          {/* TAB 4: UNOFFICIAL LEARNING COMPLETION RECORD */}
          <div className={activeTab === 'record' ? 'space-y-6 block' : 'hidden'}>
            {learningRecord ? (
              <div className="space-y-6">
                {/* Visual Record Card */}
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border-2 border-indigo-500/30 text-center relative overflow-hidden shadow-2xl">
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">verified</span>
                    VERIFIED WATCH TIME
                  </div>

                  <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[28px]">school</span>
                  </div>

                  <span className="text-[11px] uppercase font-black tracking-widest text-blue-400">
                    BRAINBOOST VERIFIED LAB RECORD
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                    Unofficial Learning Completion Record
                  </h3>

                  <p className="text-xs text-slate-400 mt-4">This record confirms that</p>
                  <div className="text-lg sm:text-xl font-black text-white border-b border-slate-700/80 inline-block px-4 pb-1 mt-1">
                    {user.name}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">has completed verified self-directed study for:</p>

                  <h4 className="text-base sm:text-lg font-bold text-blue-300 mt-1 max-w-xl mx-auto">
                    {learningRecord.videoTitle}
                  </h4>
                  <p className="text-xs text-slate-400">Source: {learningRecord.channel}</p>

                  {/* Key Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6 max-w-2xl mx-auto">
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Verified Watch</span>
                      <span className="text-sm font-black text-white">{learningRecord.verifiedWatchFormatted}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Completion</span>
                      <span className="text-sm font-black text-emerald-400">{learningRecord.completionPercentage}%</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Date</span>
                      <span className="text-sm font-black text-white">{learningRecord.completionDate}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Record ID</span>
                      <span className="text-xs font-mono font-bold text-indigo-300 truncate block">
                        {learningRecord.recordId}
                      </span>
                    </div>
                  </div>

                  {/* Disclaimer Box */}
                  <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/30 text-left text-[11px] text-red-200/90 leading-relaxed max-w-2xl mx-auto">
                    <strong>Disclaimer:</strong> {learningRecord.disclaimer}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      if (onGenerateCertificate) {
                        onGenerateCertificate(track);
                      } else {
                        downloadRecordAsPDF(learningRecord);
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                    Generate & Download Certificate
                  </button>

                  <button
                    onClick={() => downloadRecordAsPDF(learningRecord)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    Download Record PDF
                  </button>

                  <button
                    onClick={handleShareLinkedIn}
                    className="px-5 py-2.5 rounded-xl bg-[#0a66c2] hover:bg-[#004182] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <span className="material-symbols-outlined text-[18px]">share</span>
                    Share on LinkedIn
                  </button>

                  <button
                    onClick={handleCopyRecordId}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {copiedRecordId ? 'check' : 'content_copy'}
                    </span>
                    {copiedRecordId ? 'Copied Record ID!' : 'Copy Record ID'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center space-y-4 bg-slate-950/40 rounded-3xl border border-slate-800">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[32px]">lock_clock</span>
                </div>
                <h4 className="text-base font-bold text-white">Record Unlocks at 85% Verified Watch Time</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  You have verified <strong>{formatSecondsToTime(verifiedSeconds)}</strong> ({completionPercentage}%). Continue watching without skipping to unlock your shareable Brainboost completion certificate!
                </p>
                <button
                  onClick={() => setActiveTab('player')}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                  Resume Watching
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

