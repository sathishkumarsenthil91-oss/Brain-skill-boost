import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { connectivityService, mapGeneratedCertificateRow, supabaseService } from '../../services/supabaseService';
import { GeneratedCertificate, UserProfile, ViewType, YouTubeLearningTrack } from '../../types';
import { formatSecondsToTime } from '../../services/youtubeLearningService';

export function learningPercent(track: YouTubeLearningTrack) {
  return track.durationSeconds > 0 ? Math.min(100, Math.floor(track.verifiedWatchedSeconds / track.durationSeconds * 100)) : 0;
}

export function LearningCertificates({ user, onNavigate, onUpdateUser }: { user: UserProfile; onNavigate: (view: ViewType) => void; onUpdateUser?: (changes: Partial<UserProfile>) => void }) {
  const [tracks, setTracks] = useState<YouTubeLearningTrack[]>([]);
  const [certificates, setCertificates] = useState<GeneratedCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [selected, setSelected] = useState<GeneratedCertificate | null>(null);
  const [notice, setNotice] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selected) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
      if (event.key !== 'Tab') return;
      const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || []);
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [selected]);
  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Please sign in to load your learning records.');
        const [nextTracks, result] = await Promise.all([supabaseService.fetchYouTubeTracks(user,true), supabase.from('generated_certificates').select('*').eq('user_id',session.user.id).order('created_at',{ascending:false})]);
        if (result.error) throw new Error('Could not load certificates. Please retry.');
        if (!disposed) { setTracks(nextTracks); setCertificates((result.data || []).map(mapGeneratedCertificateRow)); setError(''); }
      } catch (e) { if (!disposed) setError((e as Error).message); }
      finally { if (!disposed) setLoading(false); }
    };
    void load(); const timer=setInterval(load,15000); window.addEventListener('focus',load);
    return () => { disposed=true; clearInterval(timer); window.removeEventListener('focus',load); };
  }, [user.id,user.email]);
  const claim = async (track: YouTubeLearningTrack) => {
    setBusy(track.videoId); setError('');
    try {
      const {data,error}=await supabase.rpc('claim_youtube_certificate',{p_video_id:track.videoId});
      if(error) throw new Error(error.message);
      const cert=mapGeneratedCertificateRow(data);
      const next=[cert,...certificates.filter(item=>item.serialId!==cert.serialId)];
      setCertificates(next); onUpdateUser?.({earnedCertificates:next,certificationsCount:next.length});
      setNotice('Certificate claimed and saved. You can now download or share it.');
    } catch(e) { setError((e as Error).message); } finally { setBusy(''); }
  };
  const shareText = (cert:GeneratedCertificate) => `I completed ${cert.title} with Brain Boost. Certificate: ${cert.serialId}. ${cert.legalDisclaimer}`;
  const share = async (cert:GeneratedCertificate, destination:string) => {
    const text=shareText(cert); setError('');
    try {
      if(destination==='copy'){await navigator.clipboard.writeText(text);setNotice('Certificate details copied.');}
      else if(destination==='device'){
        if(!navigator.share){await navigator.clipboard.writeText(text);setNotice('Sharing is unavailable here. Certificate details copied instead.');}
        else await navigator.share({title:cert.title,text});
      } else if(destination==='network'){
        await connectivityService.createPost(user,{content:text,attachedCertificate:cert});setNotice('Certificate shared to your Brain Boost feed.');
      } else if(destination==='linkedin') {
        window.open('https://www.linkedin.com/feed/','_blank','noopener,noreferrer');
        await navigator.clipboard.writeText(text); setNotice('Certificate details copied. Paste them into your LinkedIn post.');
      } else {
        const url=destination==='whatsapp'?`https://wa.me/?text=${encodeURIComponent(text)}`:`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(url,'_blank','noopener,noreferrer');
      }
    } catch(e) { if((e as Error).name!=='AbortError') setError('Sharing failed. Please retry or use Copy details.'); }
  };
  const download = (cert:GeneratedCertificate) => {
    const escape=(s:string)=>s.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
    const html=`<!doctype html><html><meta charset="utf-8"><title>${escape(cert.title)}</title><style>body{font-family:Arial;padding:48px;color:#172554}article{border:4px solid #7c3aed;padding:40px}h1{color:#7c3aed}small{display:block;margin-top:32px}</style><article><h1>Learning Completion Certificate</h1><h2>${escape(cert.recipientName)}</h2><p>Completed self-directed learning:</p><h2>${escape(cert.title)}</h2><p>${escape(cert.instructorOrSpeaker)} · ${escape(cert.durationFormatted)} · ${cert.completionPercentage}%</p><p>Claimed: ${escape(cert.issueDate)}</p><p>Certificate: ${escape(cert.serialId)}</p><small>${escape(cert.legalDisclaimer)}</small></article><p>Use your browser’s Print option to save as PDF.</p></html>`;
    const url=URL.createObjectURL(new Blob([html],{type:'text/html'}));const link=document.createElement('a');link.href=url;link.download=`Brain-Boost-${cert.serialId}.html`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('Certificate downloaded. Open it and choose Print → Save as PDF.');
  };
  const claimedFor=(track:YouTubeLearningTrack)=>certificates.find(cert=>cert.type==='youtube_track'&&(cert.itemId===track.videoId||cert.itemId===track.id));
  return <section className="space-y-4" aria-label="Learning and certificates">
    <div className="rounded-2xl bg-purple-50 dark:bg-purple-950/30 p-5"><h3 className="font-bold text-lg">My Learning &amp; Certificates</h3><p className="text-sm text-slate-600 dark:text-slate-300">Watch progress → Locked → Ready to claim → Claimed &amp; shareable</p><p className="mt-2 text-xs">These are Brain Boost learning records, not certificates issued by YouTube.</p></div>
    {error&&<p role="alert" className="text-red-600">{error}</p>}{notice&&<p role="status" className="text-purple-600">{notice}</p>}
    {loading?<p>Loading saved learning progress…</p>:<>
      <h4 className="font-bold">YouTube learning progress ({tracks.length})</h4>
      {!tracks.length&&<p className="text-sm text-slate-500">No saved tracks yet. Add a YouTube learning video in Courses to get started.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{tracks.map(track=>{
        const percent=learningPercent(track), cert=claimedFor(track), ready=percent===100;
        return <article key={track.videoId} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 space-y-3">
          <h5 className="font-bold">{track.title}</h5><p className="text-xs text-slate-500">{track.channel}</p>
          <div className="flex justify-between text-sm"><span>{formatSecondsToTime(track.verifiedWatchedSeconds)} / {track.durationFormatted}</span><strong>{percent}% learned</strong></div>
          <div role="progressbar" aria-label={`${track.title} learning progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-purple-600" style={{width:`${percent}%`}} /></div>
          <p className={`text-sm font-bold ${cert?'text-emerald-600':ready?'text-purple-600':'text-slate-500'}`}>{cert?'✓ Claimed':ready?'Ready to claim':'🔒 Certificate locked'}</p>
          {cert?<button onClick={()=>setSelected(cert)} className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm">View, download &amp; share</button>:<button disabled={!ready||!!busy} onClick={()=>void claim(track)} className="rounded-xl bg-purple-600 text-white px-4 py-2 text-sm disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-800">{busy===track.videoId?'Claiming…':ready?'Claim certificate':'Complete learning to unlock'}</button>}
          {!ready&&<button onClick={()=>onNavigate('courses')} className="ml-2 text-sm text-purple-600">Continue learning</button>}
        </article>;
      })}</div>
      <h4 className="font-bold">All claimed certificates ({certificates.length})</h4>
      {!certificates.length&&<p className="text-sm text-slate-500">Your claimed certificates will appear here and stay saved to your account.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{certificates.map(cert=><article key={cert.serialId} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900"><span className="text-emerald-600 text-xs font-bold">✓ Claimed</span><h5 className="font-bold mt-2">{cert.title}</h5><p className="text-xs text-slate-500 mt-1">{cert.organization} · {cert.issueDate}</p><button onClick={()=>setSelected(cert)} className="text-purple-600 text-sm mt-3">View, download &amp; share</button></article>)}</div>
    </>}
    {selected&&<div ref={dialogRef} className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="Claimed certificate"><div className="bg-white dark:bg-slate-900 rounded-2xl p-5 w-full max-w-lg max-h-[90dvh] overflow-y-auto space-y-4"><div className="flex justify-between"><h4 className="font-bold">Claimed certificate</h4><button aria-label="Close certificate" onClick={()=>setSelected(null)}>✕</button></div><h3 className="text-xl font-bold">{selected.title}</h3><p>{selected.recipientName} · {selected.completionPercentage}%</p><p className="text-xs break-all">{selected.serialId}</p><p className="text-xs text-slate-500">{selected.legalDisclaimer}</p><button onClick={()=>download(selected)} className="px-4 py-2 bg-purple-600 text-white rounded-xl">Download certificate</button><div className="flex flex-wrap gap-2">{[['device','Share to apps'],['network','Brain Boost'],['whatsapp','WhatsApp'],['linkedin','LinkedIn'],['x','X'],['copy','Copy details']].map(([destination,label])=><button key={destination} onClick={()=>void share(selected,destination)} className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700">{label}</button>)}</div><p className="text-xs text-slate-500">Use Share to apps for installed apps, including Instagram when your device supports it.</p>{notice&&<p role="status" className="text-sm text-purple-600">{notice}</p>}{error&&<p role="alert" className="text-sm text-red-600">{error}</p>}</div></div>}
  </section>;
}
