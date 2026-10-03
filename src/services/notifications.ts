import { supabase } from '../supabaseClient';
import { ViewType } from '../types';

export interface AppNotification {
  id: string; user_id: string; kind: 'message' | 'social' | 'resource' | 'update' | 'ai';
  title: string; body: string; view: ViewType; peer_id: string | null; source_key: string; created_at: string; read_at: string | null;
}

export async function loadNotifications(userId: string) {
  const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100);
  if (error) throw new Error('Notifications could not load. Please retry.');
  return (data || []) as AppNotification[];
}

export async function markNotificationRead(userId: string, id?: string) {
  let request = supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null);
  if (id) request = request.eq('id', id);
  const { error } = await request;
  if (error) throw new Error('Could not mark notifications as read. Please retry.');
}

export async function showBrowserNotification(title: string, body: string, tag: string, view: ViewType = 'connectivity') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const options = { body, tag, icon: '/brainboost-logo-192.webp', data: { url: `/#${view}` } };
  if ('serviceWorker' in navigator) {
    await navigator.serviceWorker.register('/sw.js');
    const registration = await Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Notification service is taking too long. Please retry.')), 8000))]);
    await registration.showNotification(title, options);
  } else {
    const notification = new Notification(title, options);
    notification.onclick = () => { window.focus(); window.location.hash = view; notification.close(); };
  }
}

export async function enableBrowserNotifications(): Promise<string> {
  if (!window.isSecureContext || !('Notification' in window)) return 'Browser alerts are unavailable here. Your notifications still appear in the bell inbox.';
  if (Notification.permission === 'denied') return 'Notifications are blocked. Open your browser’s site settings, allow notifications for Brain Boost, then try again.';
  // Request directly from the button gesture before awaiting service-worker setup.
  const permission = await Notification.requestPermission();
  if (permission === 'denied') return 'Notifications are blocked. Allow them in your browser’s site settings. The bell inbox still works.';
  if (permission !== 'granted') return 'Permission was not granted. You can try again; the bell inbox still works.';
  await showBrowserNotification('Brain Boost notifications enabled', 'Messages, resources, activity and AI results will appear in your notification inbox.', 'brainboost-notification-test', 'dashboard');
  return 'Notifications enabled. A test alert was sent. If it is hidden, check your device’s notification settings.';
}
