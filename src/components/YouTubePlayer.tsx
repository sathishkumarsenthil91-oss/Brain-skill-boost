import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

export interface YouTubePlayerProps {
  videoId: string;
  title?: string;
  autoPlay?: boolean;
  startSeconds?: number;
  className?: string;
  onReady?: () => void;
  onStateChange?: (state: 'playing' | 'paused' | 'ended' | 'unstarted') => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onError?: (errorCode: number | string) => void;
  showFallbackOnError?: boolean;
}

/**
 * Stable, high-performance, reusable YouTube Player component.
 * - Prevents unwanted iframe re-renders, reloads, or flickering on parent state updates
 * - Works consistently in Google Studio preview, localhost, and Vercel production
 * - Uses proper privacy-enhanced youtube-nocookie embed URL with required permissions
 * - Handles iframe permissions: accelerometer, autoplay, clipboard-write, encrypted-media, gyroscope, picture-in-picture, web-share, fullscreen
 * - Strictly enforces referrerPolicy="strict-origin-when-cross-origin" to fix Vercel/custom domain embed errors
 * - Graceful error recovery with retry and direct YouTube fallback option
 */
export const YouTubePlayer: React.FC<YouTubePlayerProps> = React.memo(({
  videoId,
  title = 'YouTube Video Player',
  autoPlay = true,
  startSeconds = 0,
  className = 'w-full h-full',
  onReady,
  onStateChange,
  onTimeUpdate,
  onError,
  showFallbackOnError = true,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retryKey, setRetryKey] = useState<number>(0);

  // Store callbacks in refs to avoid re-attaching listeners on every render
  const onReadyRef = useRef(onReady);
  const onStateChangeRef = useRef(onStateChange);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onReadyRef.current = onReady;
    onStateChangeRef.current = onStateChange;
    onTimeUpdateRef.current = onTimeUpdate;
    onErrorRef.current = onError;
  });

  // Reset error state when videoId changes or manual retry is triggered
  useEffect(() => {
    setHasError(false);
    setErrorMessage('');
  }, [videoId, retryKey]);

  // Generate safe origin parameter for YouTube postMessage & Vercel verification
  const originParam = useMemo(() => {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      try {
        return encodeURIComponent(window.location.origin);
      } catch {
        return '';
      }
    }
    return '';
  }, []);

  // Memoize stable embed URL - will NOT change unless videoId, startSeconds, or retryKey change
  const embedUrl = useMemo(() => {
    if (!videoId) return '';
    const cleanId = videoId.trim();
    const start = Math.max(0, Math.floor(startSeconds));
    const startQuery = start > 0 ? `&start=${start}` : '';
    const originQuery = originParam ? `&origin=${originParam}` : '';
    
    // Use official privacy-enhanced embed with JS API enabled
    return `https://www.youtube-nocookie.com/embed/${cleanId}?enablejsapi=1&autoplay=${autoPlay ? 1 : 0}&playsinline=1&rel=0&modestbranding=1${startQuery}${originQuery}`;
  }, [videoId, startSeconds, autoPlay, originParam, retryKey]);

  // Dispatch postMessage command safely to the iframe
  const sendCommand = useCallback((func: string, args: any[] = []) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    try {
      const payload = JSON.stringify({
        event: 'command',
        func,
        args,
      });
      iframeRef.current.contentWindow.postMessage(payload, '*');
    } catch (e) {
      console.warn('[YouTubePlayer] postMessage dispatch failed:', e);
    }
  }, []);

  // Listen for YouTube Iframe API postMessage notifications
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      // Validate event source when available
      if (iframeRef.current && event.source && event.source !== iframeRef.current.contentWindow) {
        return;
      }

      if (!event.data) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data || typeof data !== 'object') return;

        // Catch YouTube playback errors (100, 101, 150 = restricted embed or unavailable)
        if (
          data.event === 'onError' ||
          (data.info && typeof data.info === 'number' && [2, 5, 100, 101, 150].includes(data.info))
        ) {
          const code = data.info || data.data || 101;
          setHasError(true);
          if (code === 101 || code === 150) {
            setErrorMessage('Playback on external domains has been restricted by the video creator.');
          } else if (code === 100 || code === 2) {
            setErrorMessage('The requested video is unavailable or was removed.');
          } else {
            setErrorMessage('Video playback error occurred.');
          }
          if (onErrorRef.current) onErrorRef.current(code);
        }

        // On initial load / ready
        if (data.event === 'onReady' || data.event === 'initialDelivery') {
          if (onReadyRef.current) onReadyRef.current();
        }

        // Time updates
        if (data.event === 'infoDelivery' && data.info) {
          const { currentTime, duration } = data.info;
          if (typeof currentTime === 'number' && onTimeUpdateRef.current) {
            onTimeUpdateRef.current(currentTime, typeof duration === 'number' ? duration : 0);
          }

          if (typeof data.info.playerState === 'number' && onStateChangeRef.current) {
            // 1: playing, 2: paused, 0: ended, -1: unstarted
            if (data.info.playerState === 1) onStateChangeRef.current('playing');
            else if (data.info.playerState === 2) onStateChangeRef.current('paused');
            else if (data.info.playerState === 0) onStateChangeRef.current('ended');
            else if (data.info.playerState === -1) onStateChangeRef.current('unstarted');
          }
        }

        // State changes
        if (data.event === 'onStateChange' && onStateChangeRef.current) {
          const stateCode = data.info;
          if (stateCode === 1) onStateChangeRef.current('playing');
          else if (stateCode === 2) onStateChangeRef.current('paused');
          else if (stateCode === 0) onStateChangeRef.current('ended');
          else if (stateCode === -1) onStateChangeRef.current('unstarted');
        }
      } catch {
        // Safe catch for non-JSON postMessage payloads from other sources
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, []);

  const handleIframeLoad = () => {
    // Handshake with YouTube Iframe API
    sendCommand('listening');
    if (autoPlay) {
      sendCommand('playVideo');
    }
  };

  const handleRetry = () => {
    setHasError(false);
    setRetryKey((prev) => prev + 1);
  };

  if (!videoId) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center space-y-2">
        <span className="material-symbols-outlined text-3xl text-slate-500">smart_display</span>
        <p className="text-xs text-slate-400">No video selected</p>
      </div>
    );
  }

  return (
    <div className={`relative bg-black overflow-hidden ${className}`}>
      {/* Primary YouTube Embed Iframe */}
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={title}
        onLoad={handleIframeLoad}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="w-full h-full border-0 absolute inset-0 z-10"
      />

      {/* Fallback Overlay if Embed is Restricted (e.g. YouTube Error 101/150) */}
      {hasError && showFallbackOnError && (
        <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-4 z-20 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <span className="material-symbols-outlined text-3xl">smart_display</span>
          </div>

          <div className="space-y-1 max-w-md">
            <h4 className="text-sm sm:text-base font-bold text-white">
              Playback on External Domain
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {errorMessage || 'This video owner has restricted direct embedded playback. You can watch directly on YouTube or retry.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              onClick={handleRetry}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Retry Player
            </button>

            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              Watch on YouTube
            </a>
          </div>
        </div>
      )}
    </div>
  );
});

YouTubePlayer.displayName = 'YouTubePlayer';
