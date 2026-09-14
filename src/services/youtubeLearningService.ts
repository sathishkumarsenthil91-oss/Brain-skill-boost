import { YouTubeLearningTrack, UnofficialLearningRecord, UserProfile } from '../types';

// Curated starter learning tracks for software engineering students
export const STARTER_YOUTUBE_TRACKS: YouTubeLearningTrack[] = [];

/**
 * Robustly extracts video ID from ANY YouTube URL variation, raw ID, markdown link, or embed string
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;

  // 1. Clean input: trim, remove surrounding quotes, angle brackets, parentheses
  let cleaned = input.trim();
  cleaned = cleaned.replace(/^[<"'(]+|[>"')]+$/g, '');

  // Handle markdown links e.g. [title](https://youtube.com/...)
  const mdMatch = cleaned.match(/\]\((https?:\/\/[^\s)]+)\)/i);
  if (mdMatch) cleaned = mdMatch[1];

  // 2. Direct 11-character video ID check (e.g. 8pDqJVdNa44)
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) {
    return cleaned;
  }

  // 3. Structured URL parsing
  try {
    const urlString = cleaned.startsWith('http://') || cleaned.startsWith('https://')
      ? cleaned
      : `https://${cleaned}`;
    const parsed = new URL(urlString);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    // youtu.be/VIDEO_ID
    if (host === 'youtu.be') {
      const segs = parsed.pathname.split('/').filter(Boolean);
      if (segs[0] && /^[a-zA-Z0-9_-]{11}$/.test(segs[0])) {
        return segs[0];
      }
    }

    // youtube.com, m.youtube.com, music.youtube.com, youtube-nocookie.com
    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
      // Check ?v=VIDEO_ID in search params
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
        return v;
      }

      // Check path prefixes: /shorts/ID, /embed/ID, /v/ID, /e/ID, /live/ID, /videos/ID, /clip/ID
      const segments = parsed.pathname.split('/').filter(Boolean);
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i].toLowerCase();
        if (['shorts', 'embed', 'v', 'e', 'live', 'videos', 'clip'].includes(seg)) {
          const nextSeg = segments[i + 1];
          if (nextSeg && /^[a-zA-Z0-9_-]{11}$/.test(nextSeg)) {
            return nextSeg;
          }
        }
      }
    }
  } catch {
    // If standard URL constructor fails on unconventional strings, continue to regex fallback
  }

  // 4. Comprehensive regex fallback matching all YouTube URL structures
  const regex = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|e\/|shorts\/|live\/|watch\?(?:.*&)?v=|\S*?[?&]v=))([a-zA-Z0-9_-]{11})/i;
  const match = cleaned.match(regex);
  if (match && match[1] && match[1].length === 11) {
    return match[1];
  }

  // 5. Fallback substring match for 11-char pattern after standard delimiters
  const subMatch = cleaned.match(/(?:[?&]v=|\/)([a-zA-Z0-9_-]{11})(?:[?&/#\s]|$)/);
  if (subMatch && subMatch[1]) {
    return subMatch[1];
  }

  return null;
}

/**
 * Extracts optional starting timestamp in seconds from URL (e.g. &t=120 or ?t=2m30s)
 */
export function extractYouTubeTimestamp(url: string): number {
  if (!url || typeof url !== 'string') return 0;
  try {
    const match = url.match(/[?&#](?:t|start)=([0-9hms]+)/i);
    if (!match) return 0;
    const raw = match[1];
    if (/^\d+$/.test(raw)) return parseInt(raw, 10);
    let seconds = 0;
    const hours = raw.match(/(\d+)h/i);
    const mins = raw.match(/(\d+)m/i);
    const secs = raw.match(/(\d+)s/i);
    if (hours) seconds += parseInt(hours[1], 10) * 3600;
    if (mins) seconds += parseInt(mins[1], 10) * 60;
    if (secs) seconds += parseInt(secs[1], 10);
    return seconds;
  } catch {
    return 0;
  }
}

/**
 * High-res YouTube thumbnail with fallback
 */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Fetch video metadata with multi-tier client-side resilience so adding a track NEVER fails
 */
export async function fetchYouTubeMetadataClient(videoId: string, originalUrl?: string): Promise<{
  title: string;
  channel: string;
  channelUrl: string;
  thumbnail: string;
  durationSeconds: number;
  durationFormatted: string;
}> {
  const fallback = {
    title: `YouTube Technical Lab (${videoId})`,
    channel: 'YouTube Creator',
    channelUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    durationSeconds: 1200,
    durationFormatted: '20m 00s',
  };

  // Tier 1: Try application backend endpoint
  try {
    const res = await fetch('/api/youtube/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, url: originalUrl || `https://www.youtube.com/watch?v=${videoId}` }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.title) {
        return {
          title: data.title || fallback.title,
          channel: data.channel || fallback.channel,
          channelUrl: data.channelUrl || fallback.channelUrl,
          thumbnail: data.thumbnail || fallback.thumbnail,
          durationSeconds: data.durationSeconds || fallback.durationSeconds,
          durationFormatted: data.durationFormatted || fallback.durationFormatted,
        };
      }
    }
  } catch (e) {
    console.warn('Backend YouTube metadata fetch failed, using client fallback:', e);
  }

  // Tier 2: Public noembed client fallback
  try {
    const noembedRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    if (noembedRes.ok) {
      const noembedData = await noembedRes.json();
      if (noembedData && noembedData.title) {
        return {
          title: noembedData.title,
          channel: noembedData.author_name || 'YouTube Creator',
          channelUrl: noembedData.author_url || `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail: noembedData.thumbnail_url || fallback.thumbnail,
          durationSeconds: 1200,
          durationFormatted: '20m 00s',
        };
      }
    }
  } catch (e) {
    // Silent catch
  }

  return fallback;
}

/**
 * Formats seconds into MM:SS or HH:MM:SS
 */
export function formatSecondsToTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

/**
 * Merges a new interval [start, end] into an existing list of intervals
 * Example: [[0, 10], [20, 30]] + [5, 25] => [[0, 30]]
 */
export function mergeWatchedInterval(
  existingRanges: [number, number][],
  newRange: [number, number]
): [number, number][] {
  if (!newRange || newRange[0] >= newRange[1]) return existingRanges;
  
  const all = [...existingRanges, newRange].map(([s, e]) => [Math.floor(s), Math.floor(e)] as [number, number]);
  all.sort((a, b) => a[0] - b[0]);

  const merged: [number, number][] = [];
  let current = all[0];

  for (let i = 1; i < all.length; i++) {
    const next = all[i];
    if (next[0] <= current[1] + 1) { // 1 second overlap or adjacent
      current[1] = Math.max(current[1], next[1]);
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);
  return merged;
}

/**
 * Calculates total unique verified seconds watched across intervals
 */
export function calculateTotalVerifiedSeconds(ranges: [number, number][]): number {
  if (!ranges || ranges.length === 0) return 0;
  return ranges.reduce((acc, [start, end]) => acc + Math.max(0, end - start), 0);
}

/**
 * Local Storage Persistence Layer per user
 */
const TRACKS_STORAGE_PREFIX = 'industryskill_yt_tracks_';

export function loadUserTracks(userId: string = 'default'): YouTubeLearningTrack[] {
  try {
    const raw = localStorage.getItem(`${TRACKS_STORAGE_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load user tracks from localStorage:', err);
  }
  return STARTER_YOUTUBE_TRACKS;
}

export function saveUserTracks(userId: string = 'default', tracks: YouTubeLearningTrack[]): void {
  try {
    localStorage.setItem(`${TRACKS_STORAGE_PREFIX}${userId}`, JSON.stringify(tracks));
  } catch (err) {
    console.error('Failed to save user tracks to localStorage:', err);
  }
}

/**
 * Generates unique Record ID for learning completion
 */
export function generateRecordId(videoId: string): string {
  const cleanId = (videoId || 'GEN').substring(0, 4).toUpperCase();
  const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `IS-REC-YTL-${new Date().getFullYear()}-${cleanId}-${randomHex}`;
}

/**
 * Generates an Unofficial Learning Completion Record
 */
export function createUnofficialRecord(
  userName: string,
  userEmail: string,
  track: YouTubeLearningTrack
): UnofficialLearningRecord {
  return {
    recordId: track.learningRecord?.recordId || generateRecordId(track.videoId),
    userId: userEmail || 'user-active',
    userName: userName || 'Student Learner',
    videoTitle: track.title,
    channel: track.channel,
    videoId: track.videoId,
    videoUrl: track.videoUrl,
    verifiedWatchSeconds: track.verifiedWatchedSeconds,
    verifiedWatchFormatted: formatSecondsToTime(track.verifiedWatchedSeconds),
    completionPercentage: track.completionPercentage,
    completionDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    disclaimer: 'This is an unofficial self-directed learning completion record generated by Brainboost to verify authentic watch progress. It is not issued, certified, or endorsed by YouTube, Google LLC, or the video creator.',
    skillsValidated: track.aiSummary?.skillsValidated || ['Full Stack Engineering', 'Independent Study']
  };
}

/**
 * Helper to download content directly into the user's Downloads folder
 */
export function downloadFileToFolder(content: string, filename: string, mimeType: string = 'text/html') {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  } catch (err) {
    console.error('Failed to download file to folder:', err);
  }
}

/**
 * Triggers clean PDF / Print download of learning notes and saves to folder
 */
export function downloadNotesAsPDF(track: YouTubeLearningTrack, userName: string) {
  const sanitizedTitle = (track.title || 'Learning_Notes').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
  const filename = `${sanitizedTitle}_Notes.html`;

  const keyPointsHtml = track.aiSummary?.keyPoints
    ?.map((kp) => `<li style="margin-bottom: 8px; font-size: 13px; color: #334155; line-height: 1.5;">${kp}</li>`)
    .join('') || '<p style="color: #64748b;">No AI takeaways saved yet.</p>';

  const timestampsHtml = track.aiSummary?.timestamps
    ?.map(
      (t) => `
      <div style="display: flex; gap: 12px; margin-bottom: 8px; font-size: 12px;">
        <span style="font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 6px; height: fit-content;">${t.time}</span>
        <div>
          <strong style="color: #0f172a;">${t.title}</strong>
          <p style="margin: 2px 0 0 0; color: #64748b;">${t.note}</p>
        </div>
      </div>
    `
    )
    .join('') || '';

  const studentNotesHtml = track.notes
    ? `<div style="margin-top: 16px; padding: 14px; background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 8px;">
        <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #1e293b;">Personal Student Notes</h4>
        <p style="margin: 0; font-size: 13px; color: #334155; white-space: pre-wrap;">${track.notes}</p>
       </div>`
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${track.title} - Brainboost Verified Learning Notes</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; max-width: 800px; margin: 0 auto; }
          .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
          .badge { display: inline-block; background: #dbeafe; color: #1d4ed8; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; }
          .verified-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 16px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .disclaimer { margin-top: 36px; padding-top: 16px; border-top: 1px dashed #cbd5e1; font-size: 11px; color: #64748b; line-height: 1.4; text-align: center; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end; gap: 10px;">
          <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 8px; cursor: pointer;">
            Print / Save as PDF
          </button>
        </div>

        <div class="header">
          <div>
            <span class="badge">Brainboost Verified Learning Note</span>
            <h1 style="margin: 8px 0 4px 0; font-size: 22px; color: #0f172a;">${track.title}</h1>
            <p style="margin: 0; font-size: 13px; color: #64748b;">Instructor/Channel: <strong>${track.channel}</strong> • Source: ${track.videoUrl}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 12px; font-weight: bold; color: #0f172a;">Student: ${userName}</p>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Date: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div class="verified-box">
          <div>
            <strong style="color: #166534; font-size: 13px;">✓ Verified Watch Progress</strong>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #15803d;">
              ${formatSecondsToTime(track.verifiedWatchedSeconds)} verified / ${track.durationFormatted} (${track.completionPercentage}% completion)
            </p>
          </div>
          <span style="font-size: 12px; font-weight: 800; color: #166534; background: #dcfce7; padding: 4px 10px; border-radius: 8px;">
            ${track.status === 'completed' ? 'COMPLETED' : 'IN PROGRESS'}
          </span>
        </div>

        <h3 style="font-size: 16px; color: #0f172a; margin-top: 20px; margin-bottom: 8px;">Executive Summary</h3>
        <p style="font-size: 13px; color: #334155; line-height: 1.6; background: #f8fafc; padding: 14px; border-radius: 8px;">
          ${track.aiSummary?.summary || 'Summary in progress.'}
        </p>

        <h3 style="font-size: 16px; color: #0f172a; margin-top: 24px; margin-bottom: 8px;">Key Technical Takeaways</h3>
        <ul style="padding-left: 20px; margin-top: 0;">
          ${keyPointsHtml}
        </ul>

        ${timestampsHtml ? `<h3 style="font-size: 16px; color: #0f172a; margin-top: 24px; margin-bottom: 12px;">Timestamped Chapters</h3>${timestampsHtml}` : ''}

        ${studentNotesHtml}

        <div class="disclaimer">
          <p><strong>Disclaimer:</strong> This verified learning record and study sheet is independently generated by Brainboost. It is not affiliated with, sponsored, or certified by YouTube, Google LLC, or the creator. Record ID: ${track.learningRecord?.recordId || generateRecordId(track.videoId)}</p>
        </div>
      </body>
    </html>
  `;

  // 1. Download file directly into user's folder
  downloadFileToFolder(html, filename, 'text/html');

  // 2. Open print dialog for instant PDF print
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
}

/**
 * Triggers clean PDF / Print download of the Unofficial Learning Completion Record
 */
export function downloadRecordAsPDF(record: UnofficialLearningRecord) {
  const sanitizedTitle = (record.videoTitle || 'Learning_Record').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
  const filename = `Certificate_${record.recordId || sanitizedTitle}.html`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Unofficial Learning Record - ${record.videoTitle}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; max-width: 850px; margin: 0 auto; background: #f8fafc; }
          .certificate {
            background: #ffffff;
            border: 8px double #1e3a8a;
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.05);
            position: relative;
          }
          .title { font-size: 26px; font-weight: 900; color: #1e3a8a; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
          .subtitle { font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; }
          .recipient { font-size: 32px; font-weight: 800; color: #0f172a; margin: 24px 0 8px 0; border-bottom: 2px solid #e2e8f0; display: inline-block; padding-bottom: 4px; min-width: 320px; }
          .course-title { font-size: 20px; font-weight: 700; color: #2563eb; margin: 12px 0 4px 0; }
          .channel { font-size: 14px; color: #475569; font-weight: 600; }
          .metrics { display: flex; justify-content: center; gap: 40px; margin: 28px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; padding: 16px 0; }
          .metric-item { text-align: center; }
          .metric-value { font-size: 18px; font-weight: 800; color: #0f172a; }
          .metric-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-top: 2px; }
          .disclaimer-box { background: #fef2f2; border: 1px solid #fecaca; padding: 12px 18px; border-radius: 10px; font-size: 11px; color: #991b1b; line-height: 1.4; margin-top: 24px; text-align: left; }
          @media print {
            body { padding: 0; background: white; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end; gap: 10px;">
          <button onclick="window.print()" style="background: #1e3a8a; color: white; border: none; padding: 12px 24px; font-weight: bold; border-radius: 10px; cursor: pointer;">
            Print / Save Certificate PDF
          </button>
        </div>

        <div class="certificate">
          <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 28px;">🎓</span>
            <span style="font-size: 16px; font-weight: 900; color: #2563eb; letter-spacing: 0.5px;">BRAINBOOST VERIFIED LAB</span>
          </div>

          <div class="title">Unofficial Learning Completion Record</div>
          <div class="subtitle">Self-Directed Engineering Study Verification</div>

          <p style="margin-top: 24px; font-size: 14px; color: #64748b;">This document verifies that</p>
          <div class="recipient">${record.userName}</div>
          <p style="font-size: 14px; color: #64748b; margin-top: 6px;">has successfully completed self-directed study and verified real watch time for:</p>

          <div class="course-title">${record.videoTitle}</div>
          <div class="channel">Curated from: ${record.channel}</div>

          <div class="metrics">
            <div class="metric-item">
              <div class="metric-value">${record.verifiedWatchFormatted}</div>
              <div class="metric-label">Verified Watch Time</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${record.completionPercentage}%</div>
              <div class="metric-label">Actual Completion</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${record.completionDate}</div>
              <div class="metric-label">Completion Date</div>
            </div>
            <div class="metric-item">
              <div class="metric-value" style="font-family: monospace;">${record.recordId}</div>
              <div class="metric-label">Verification ID</div>
            </div>
          </div>

          <div class="disclaimer-box">
            <strong>Mandatory Verification Disclaimer:</strong> ${record.disclaimer}
          </div>
        </div>
      </body>
    </html>
  `;

  // 1. Download file directly into user's folder
  downloadFileToFolder(html, filename, 'text/html');

  // 2. Open print dialog for PDF saving
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
}
