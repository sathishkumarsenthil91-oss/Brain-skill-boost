import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { ViewType } from '../types';
import { AppNotification, enableBrowserNotifications, loadNotifications, markNotificationRead, showBrowserNotification } from '../services/notifications';

export function NotificationCenter({ userId, onNavigate }: { userId: string; onNavigate: (view: ViewType) => void }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [permissionMessage, setPermissionMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => 'Notification' in window ? Notification.permission : 'unsupported');
  const [notice, setNotice] = useState<AppNotification | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const userRef = useRef(userId); userRef.current = userId;
  const refresh = async () => {
    try { const next = await loadNotifications(userId); if (userRef.current === userId) { setItems(next); setError(''); } }
    catch (e) { if (userRef.current === userId) setError((e as Error).message); }
  };
  useEffect(() => {
    setItems([]); setNotice(null); setOpen(false); let disposed = false;
    void refresh();
    const channel = supabase.channel(`notifications-${userId}-${crypto.randomUUID()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, payload => {
      if (disposed) return;
      void refresh();
      if (payload.eventType === 'INSERT') {
        const item = payload.new as AppNotification;
        setNotice(item);
        if (document.visibilityState !== 'visible') void showBrowserNotification(item.title, item.body, item.id, item.view).catch(() => {});
      }
    }).subscribe();
    const timer = window.setInterval(refresh, 20000);
    const onFocus = () => { void refresh(); setPermission('Notification' in window ? Notification.permission : 'unsupported'); };
    window.addEventListener('focus', onFocus);
    const openInbox = () => setOpen(true);
    window.addEventListener('open-notifications', openInbox);
    return () => { disposed = true; clearInterval(timer); void supabase.removeChannel(channel); window.removeEventListener('focus', onFocus); window.removeEventListener('open-notifications', openInbox); };
  }, [userId]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000); return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
      if (e.key === 'Tab') {
        const focusable = [...document.querySelectorAll<HTMLElement>('[data-notification-dialog] button')].filter(el => !el.hasAttribute('disabled'));
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  }, [open]);
  const enable = async () => {
    setBusy(true); try { setPermissionMessage(await enableBrowserNotifications()); }
    catch (e) { setPermissionMessage((e as Error).message || 'Could not enable browser alerts. The bell inbox still works.'); }
    finally { setBusy(false); setPermission('Notification' in window ? Notification.permission : 'unsupported'); }
  };
  const read = async (id?: string) => { try { await markNotificationRead(userId, id); await refresh(); } catch (e) { setError((e as Error).message); } };
  const select = (item: AppNotification) => {
    void read(item.id); setOpen(false); setNotice(null);
    if (item.kind === 'message' && item.peer_id) sessionStorage.setItem('brainboost_open_chat', item.peer_id);
    if (item.source_key?.startsWith('library_access_requests:')) sessionStorage.setItem('brainboost_open_requests', 'true');
    else if (item.kind === 'resource' && item.peer_id) sessionStorage.setItem('brainboost_open_library', item.peer_id);
    onNavigate(item.view);
    window.dispatchEvent(new Event('open-notification-chat'));
  };
  const unread = items.filter(item => !item.read_at).length;
  return <>
    <button ref={trigger} type="button" onClick={() => { setOpen(true); void refresh(); }} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-haspopup="dialog" className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
      <span className="material-symbols-outlined text-[20px]">notifications</span>
      {unread > 0 && <span className="absolute -top-1 -right-1 rounded-full bg-rose-600 text-white text-[10px] font-bold min-w-4 px-1">{unread > 99 ? '99+' : unread}</span>}
    </button>
    {createPortal(<>{notice && !open && <div role="status" className="fixed top-20 right-3 left-3 sm:left-auto sm:w-80 z-[110] rounded-2xl bg-white dark:bg-slate-900 border border-purple-200 shadow-xl p-3 text-slate-900 dark:text-white"><button onClick={() => select(notice)} className="text-left w-full"><strong className="block text-sm">{notice.title}</strong><span className="text-xs">{notice.body}</span></button><button aria-label="Dismiss notification" onClick={() => setNotice(null)} className="mt-2 text-xs text-purple-600">Dismiss</button></div>}
    {open && <div className="fixed inset-0 z-[120] bg-black/40 flex justify-end" onClick={() => { setOpen(false); trigger.current?.focus(); }}>
      <section data-notification-dialog role="dialog" aria-modal="true" aria-label="Notification inbox" onClick={e => e.stopPropagation()} className="w-full sm:max-w-md h-[100dvh] flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl pb-[env(safe-area-inset-bottom)]">
        <div className="p-4 flex justify-between border-b dark:border-slate-800"><h2 className="font-bold text-lg">Notifications</h2><button ref={close} aria-label="Close notifications" onClick={() => { setOpen(false); trigger.current?.focus(); }}>✕</button></div>
        <div className="p-4 space-y-2 border-b dark:border-slate-800 text-sm">
          <button disabled={busy} onClick={enable} className="bg-purple-600 rounded-xl text-white px-3 py-2 font-semibold disabled:opacity-50">{busy ? 'Enabling…' : permission === 'granted' ? 'Send test notification' : 'Enable notifications'}</button>
          <p>Browser alerts: {permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked in browser settings' : permission === 'unsupported' ? 'Unavailable in this browser' : 'Not enabled'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Your inbox works even without permission. Browser alerts arrive while Brain Boost is open.</p>
          {permissionMessage && <p role="status" className="text-xs">{permissionMessage}</p>}
        </div>
        <div className="p-3 flex gap-2 overflow-x-auto shrink-0">{['all','message','social','resource','update','ai'].map(kind => <button key={kind} aria-pressed={filter === kind} onClick={() => setFilter(kind)} className={`rounded-full px-3 py-1 text-xs whitespace-nowrap capitalize ${filter === kind ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{kind === 'ai' ? 'AI' : kind === 'social' ? 'Activity' : kind === 'all' ? 'All' : `${kind}s`}</button>)}</div>
        <button onClick={() => void read()} className="text-sm text-purple-600 text-right px-4 py-2">Mark all as read</button>
        {error && <div role="alert" className="p-3 text-red-600 text-sm">{error}<button className="ml-2 underline" onClick={() => void refresh()}>Retry</button></div>}
        <div className="flex-1 min-h-0 overflow-y-auto">{items.filter(item => filter === 'all' || item.kind === filter).map(item => <button key={item.id} onClick={() => select(item)} className={`w-full p-4 text-left border-b dark:border-slate-800 flex gap-3 ${!item.read_at ? 'bg-purple-50 dark:bg-purple-950/30' : ''}`}><span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!item.read_at ? 'bg-purple-600' : 'bg-transparent'}`} /><span className="min-w-0"><strong className="block text-sm">{item.title}</strong><span className="block text-xs mt-1 break-words">{item.body}</span><time className="block text-xs text-slate-500 mt-1">{new Date(item.created_at).toLocaleString()}</time></span></button>)}
          {!items.some(item => filter === 'all' || item.kind === filter) && !error && <p className="p-6 text-sm text-slate-500">No notifications yet. New activity will appear here.</p>}
        </div>
      </section>
    </div>}</>, document.body)}
  </>;
}
