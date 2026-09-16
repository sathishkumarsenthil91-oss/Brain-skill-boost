import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://nzgisrrrbabedlntmcoc.supabase.co';

const SUPABASE_PUBLIC_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_CZTBEfxJPsy4EjJSMXtydw_yZ0gzyJ0';

const APP_REQUEST_HEADER = { 'x-brainboost-request': '1' };
const PROXY_PREFIXES = ['/rest/v1/', '/functions/v1/', '/storage/v1/'];

function forwardOAuthCodeToServer() {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth_callback') !== '1') return;

    const target = new URL('/api/auth/google-callback', window.location.origin);
    const code = params.get('code');
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    if (code) target.searchParams.set('code', code);
    if (error) target.searchParams.set('error', error);
    if (errorDescription) target.searchParams.set('error_description', errorDescription);

    window.location.replace(target.pathname + target.search);
  } catch {
    // If callback parsing fails, normal auth UI will handle the unauthenticated state.
  }
}

// One-time cleanup from the old browser-persisted Supabase Auth model.
// User profile/UI caches are intentionally kept; only auth token material is removed.
function purgeLegacyBrowserAuthTokens() {
  if (typeof window === 'undefined') return;
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const keys = [];
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (key) keys.push(key);
      }
      for (const key of keys) {
        if (key.startsWith('sb-') && (key.includes('auth-token') || key.includes('code-verifier'))) {
          store.removeItem(key);
        }
      }
    } catch {
      // Storage may be blocked by the browser; cookie auth still works.
    }
  }
}

forwardOAuthCodeToServer();
purgeLegacyBrowserAuthTokens();

export function reportServiceError(message) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('service-error', { detail: message }));
  }
}

async function proxyAwareFetch(input, init = {}) {
  const sourceRequest = input instanceof Request ? input : null;
  const url = String(sourceRequest ? sourceRequest.url : input);
  const method = String(init.method || sourceRequest?.method || 'GET').toUpperCase();
  const isSupabaseRequest =
    url.startsWith(SUPABASE_URL) &&
    PROXY_PREFIXES.some((prefix) => new URL(url).pathname.startsWith(prefix));

  if (!isSupabaseRequest) {
    return fetch(input, init);
  }

  const headers = new Headers(sourceRequest?.headers || undefined);
  if (init.headers) {
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  }

  // The server proxy injects the authenticated user's JWT from an HttpOnly cookie.
  headers.delete('authorization');
  headers.delete('apikey');
  headers.set('x-brainboost-request', '1');

  let body = init.body;
  if (body === undefined && sourceRequest && !['GET', 'HEAD'].includes(method)) {
    body = await sourceRequest.clone().arrayBuffer();
  }

  try {
    const response = await fetch(`/api/supabase-proxy?target=${encodeURIComponent(url)}`, {
      method,
      headers,
      body: ['GET', 'HEAD'].includes(method) ? undefined : body,
      signal: init.signal || sourceRequest?.signal,
      credentials: 'include',
      cache: 'no-store',
    });

    const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    if (mutation && !response.ok) {
      reportServiceError('Your changes could not be saved. Check your connection and sign in again if needed.');
    }
    return response;
  } catch (error) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      reportServiceError('Your changes could not be saved because the database could not be reached.');
    }
    throw error;
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  global: { fetch: proxyAwareFetch },
  auth: {
    // Persistent auth is owned by the server in HttpOnly cookies, never localStorage.
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

let cachedSession = null;
let cachedSessionUntil = 0;
let realtimeToken = '';
let realtimeTokenExpiry = 0;
const authListeners = new Set();

function authError(message, status = 400) {
  return { name: 'AuthApiError', message, status };
}

function pseudoSession(user, expiresAt) {
  if (!user) return null;
  return {
    access_token: '',
    refresh_token: '',
    token_type: 'bearer',
    expires_in: expiresAt ? Math.max(0, expiresAt - Math.floor(Date.now() / 1000)) : 0,
    expires_at: expiresAt || undefined,
    user,
  };
}

async function fetchServerSession(force = false) {
  if (!force && cachedSession && Date.now() < cachedSessionUntil) return cachedSession;

  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: APP_REQUEST_HEADER,
    });
    if (!response.ok) {
      cachedSession = null;
      cachedSessionUntil = Date.now() + 3000;
      return null;
    }
    const payload = await response.json();
    cachedSession = payload?.authenticated ? pseudoSession(payload.user, payload.expiresAt) : null;
    cachedSessionUntil = Date.now() + 15000;
    return cachedSession;
  } catch {
    return null;
  }
}

function emitAuthEvent(event, session) {
  for (const callback of authListeners) {
    try {
      callback(event, session);
    } catch (error) {
      console.warn('Auth listener error:', error);
    }
  }
}

async function getRealtimeAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (realtimeToken && realtimeTokenExpiry > now + 60) return realtimeToken;

  const response = await fetch('/api/auth/realtime-token', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: APP_REQUEST_HEADER,
  });
  if (!response.ok) throw new Error('Realtime authentication unavailable');
  const payload = await response.json();
  realtimeToken = String(payload?.accessToken || '');
  realtimeTokenExpiry = Number(payload?.expiresAt || 0);
  return realtimeToken;
}

// Compatibility facade: existing UI code can keep using supabase.auth.* while
// the durable session itself lives only in server-issued HttpOnly cookies.
supabase.auth.getSession = async () => {
  const session = await fetchServerSession();
  return { data: { session }, error: null };
};

supabase.auth.getUser = async () => {
  const session = await fetchServerSession(true);
  return session
    ? { data: { user: session.user }, error: null }
    : { data: { user: null }, error: authError('Authentication required', 401) };
};

supabase.auth.signInWithPassword = async (credentials) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...APP_REQUEST_HEADER },
      body: JSON.stringify({
        email: credentials?.email,
        password: credentials?.password,
        remember: true,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.user) {
      return { data: { user: null, session: null }, error: authError(payload?.error || 'Unable to sign in', response.status) };
    }

    cachedSession = pseudoSession(payload.user, payload.expiresAt);
    cachedSessionUntil = Date.now() + 15000;
    realtimeToken = '';
    realtimeTokenExpiry = 0;
    emitAuthEvent('SIGNED_IN', cachedSession);
    return { data: { user: payload.user, session: cachedSession }, error: null };
  } catch (error) {
    return { data: { user: null, session: null }, error: authError(error?.message || 'Unable to sign in', 500) };
  }
};

supabase.auth.signUp = async (credentials) => {
  try {
    const metadata = credentials?.options?.data || {};
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...APP_REQUEST_HEADER },
      body: JSON.stringify({
        email: credentials?.email,
        password: credentials?.password,
        metadata,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { data: { user: null, session: null }, error: authError(payload?.error || 'Unable to register', response.status) };
    }
    return { data: { user: payload?.user || null, session: null }, error: null };
  } catch (error) {
    return { data: { user: null, session: null }, error: authError(error?.message || 'Unable to register', 500) };
  }
};

supabase.auth.signInWithOAuth = async ({ provider }) => {
  if (provider !== 'google') {
    return { data: { provider, url: null }, error: authError('Only Google OAuth is configured', 400) };
  }
  const url = '/api/auth/google';
  if (typeof window !== 'undefined') window.location.assign(url);
  return { data: { provider, url }, error: null };
};

supabase.auth.signOut = async () => {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: APP_REQUEST_HEADER,
    });
  } finally {
    cachedSession = null;
    cachedSessionUntil = 0;
    realtimeToken = '';
    realtimeTokenExpiry = 0;
    emitAuthEvent('SIGNED_OUT', null);
  }
  return { error: null };
};

supabase.auth.refreshSession = async () => {
  const session = await fetchServerSession(true);
  if (!session) return { data: { user: null, session: null }, error: authError('Session expired', 401) };
  emitAuthEvent('TOKEN_REFRESHED', session);
  return { data: { user: session.user, session }, error: null };
};

supabase.auth.onAuthStateChange = (callback) => {
  authListeners.add(callback);
  queueMicrotask(async () => {
    const session = await fetchServerSession();
    callback('INITIAL_SESSION', session);
  });
  return {
    data: {
      subscription: {
        unsubscribe() {
          authListeners.delete(callback);
        },
      },
    },
  };
};

// Supabase Realtime needs a bearer JWT in the browser WebSocket handshake.
// The durable tokens remain HttpOnly; this short-lived access token is fetched
// only when subscribing and is kept in memory, never localStorage/sessionStorage.
const originalChannel = supabase.channel.bind(supabase);
supabase.channel = (...args) => {
  const channel = originalChannel(...args);
  const originalSubscribe = channel.subscribe.bind(channel);
  channel.subscribe = (callback, timeout) => {
    getRealtimeAccessToken()
      .then((token) => supabase.realtime.setAuth(token))
      .then(() => originalSubscribe(callback, timeout))
      .catch((error) => {
        console.warn('Realtime auth setup failed:', error);
        originalSubscribe(callback, timeout);
      });
    return channel;
  };
  return channel;
};
