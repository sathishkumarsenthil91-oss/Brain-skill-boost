import React, { useRef } from 'react';
import { NetworkUser } from '../../types';

interface SuggestedPeersProps {
  users: NetworkUser[];
  onSelect: (peer: NetworkUser) => void;
  onFollow: (peer: NetworkUser) => void;
}

export const SuggestedPeers: React.FC<SuggestedPeersProps> = ({ users, onSelect, onFollow }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: number) => listRef.current?.scrollBy({ left: direction * 176, behavior: 'smooth' });
  return (
    <section aria-label="Suggested peers" className="min-w-0 bg-white dark:bg-[#131b2e] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Suggested Peers</h4>
        <div className="flex gap-1 shrink-0">
          <button type="button" aria-label="Previous suggested peers" onClick={() => scroll(-1)} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400">‹</button>
          <button type="button" aria-label="Next suggested peers" onClick={() => scroll(1)} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400">›</button>
        </div>
      </div>
      <div ref={listRef} tabIndex={0} aria-label="Scroll suggested peers" className="flex gap-3 overflow-x-auto overscroll-x-contain snap-x snap-mandatory pb-2 focus-visible:outline-purple-500">
        {users.slice(0, 4).map(peer => (
          <article key={peer.id} className="w-40 shrink-0 snap-start rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-3 space-y-3">
            <button type="button" onClick={() => onSelect(peer)} className="w-full flex flex-col items-center gap-2 text-center min-w-0 group">
              <img src={peer.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
              <span className="w-full truncate text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600">{peer.name}</span>
              <span className="w-full truncate text-[10px] text-slate-500 dark:text-slate-400">{peer.company}</span>
            </button>
            <button type="button" onClick={() => onFollow(peer)} className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${peer.isFollowing ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' : 'bg-purple-600 text-white hover:bg-purple-500'}`}>{peer.isFollowing ? 'Following' : '+ Follow'}</button>
          </article>
        ))}
        {users.length === 0 && <p className="text-xs text-slate-500 py-4">No suggested peers yet.</p>}
      </div>
    </section>
  );
};
