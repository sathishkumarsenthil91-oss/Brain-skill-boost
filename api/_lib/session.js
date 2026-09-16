import { createHash, randomBytes } from 'node:crypto';

export const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://nzgisrrrbabedlntmcoc.supabase.co';

export const SUPABASE_PUBLIC_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_CZTBEfxJPsy4EjJSMXtydw_yZ0gzyJ0';

const COOKIE_BASE = {
  access: 'bb_access',
  refresh: 'bb_refresh',
  remember: 'bb_remember',
  pkce: 'bb_pkce',
};

function headerValue(req, name) {
  const value = req?.headers?.[name.toLowerCase()] ?? req?.headers?.[name];
  if (Array.isArray(value)) return value[0] || '';
  return typeof value === 'string' ? value : '';
}

export function parseCookies(req) {
  const raw = headerValue(req, 'cookie');
  const out = {};
  for (const part of raw.split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

function isSecureRequest(req) {
  const proto = headerValue(req, 'x-forwarded-proto').split(',')[0]?.trim();
  if (proto) return proto === 'https';
  return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
}

function cookieName(req, base) {
  return isSecureRequest(req) ? `__Host-${base}` : base;
}

function serializeCookie(req, name, value, options = {}) {
  const parts = [`${name}=${options.clear ? '' : encodeURIComponent(value)}`, 'Path=/'];
  if (options.httpOnly !== false) parts.push('HttpOnly');
  if (isSecureRequest(req)) parts.push('Secure');
  parts.push(`SameSite=${options.sameSite || 'Lax'}`);
  parts.push('Priority=High');
  if (options.clear) {
    parts.push('Max-Age=0');
    parts.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  } else if (typeof options.maxAge === 'number') {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }
  return parts.join('; ');
}

function appendSetCookie(res, cookie) {
  const current = res.getHeader?.('Set-Cookie');
  if (!current) res.setHeader('Set-Cookie', [cookie]);
  else if (Array.isArray(current)) res.setHeader('Set-Cookie', [...current, cookie]);
  else res.setHeader('Set-Cookie', [String(current), cookie]);
}

export function setNoStore(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

export function requestOrigin(req) {
  const proto =
    headerValue(req, 'x-forwarded-proto').split(',')[0]?.trim() ||
    (isSecureRequest(req) ? 'https' : 'http');
  const host =
    headerValue(req, 'x-forwarded-host').split(',')[0]?.trim() ||
    headerValue(req, 'host');
  return `${proto}://${host}`;
}

export function requireAppRequest(req, res) {
  if (headerValue(req, 'x-brainboost-request') !== '1') {
    res.status(403).json({ error: 'Request verification failed' });
    return false;
  }
  const origin = headerValue(req, 'origin');
  const expected = requestOrigin(req);
  if (origin && origin !== expected) {
    res.status(403).json({ error: 'Cross-site request blocked' });
    return false;
  }
  return true;
}

function toAuthError(status, payload, fallback) {
  const message =
    payload?.msg ||
    payload?.message ||
    payload?.error_description ||
    (typeof payload?.error === 'string' ? payload.error : '') ||
    fallback;
  return { message: String(message), status, code: payload?.code || payload?.error_code };
}

async function authFetch(path, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('apikey', SUPABASE_PUBLIC_KEY);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${SUPABASE_URL}/auth/v1${path}`, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

function normalizeSession(payload) {
  if (!payload?.access_token || !payload?.refresh_token || !payload?.user) return null;
  const expiresIn = Number(payload.expires_in || 3600);
  return {
    access_token: String(payload.access_token),
    refresh_token: String(payload.refresh_token),
    token_type: payload.token_type || 'bearer',
    expires_in: expiresIn,
    expires_at: Number(payload.expires_at || Math.floor(Date.now() / 1000) + expiresIn),
    user: payload.user,
  };
}

export function createRequestAuthClient() {
  return {
    auth: {
      async signInWithPassword({ email, password }) {
        try {
          const { response, payload } = await authFetch('/token?grant_type=password', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });
          if (!response.ok) return { data: { user: null, session: null }, error: toAuthError(response.status, payload, 'Unable to sign in') };
          const session = normalizeSession(payload);
          return session
            ? { data: { user: session.user, session }, error: null }
            : { data: { user: null, session: null }, error: toAuthError(502, payload, 'Authentication returned an invalid session') };
        } catch (error) {
          return { data: { user: null, session: null }, error: { message: error?.message || 'Authentication service unavailable', status: 503 } };
        }
      },

      async signUp({ email, password, options }) {
        try {
          const body = { email, password, data: options?.data || {} };
          if (options?.emailRedirectTo) body.email_redirect_to = options.emailRedirectTo;
          const { response, payload } = await authFetch('/signup', {
            method: 'POST',
            body: JSON.stringify(body),
          });
          if (!response.ok) return { data: { user: null, session: null }, error: toAuthError(response.status, payload, 'Unable to register') };
          const session = normalizeSession(payload);
          const user = session?.user || payload?.user || (payload?.id ? payload : null);
          return { data: { user, session }, error: null };
        } catch (error) {
          return { data: { user: null, session: null }, error: { message: error?.message || 'Registration service unavailable', status: 503 } };
        }
      },

      async refreshSession({ refresh_token }) {
        try {
          const { response, payload } = await authFetch('/token?grant_type=refresh_token', {
            method: 'POST',
            body: JSON.stringify({ refresh_token }),
          });
          if (!response.ok) return { data: { user: null, session: null }, error: toAuthError(response.status, payload, 'Unable to refresh session') };
          const session = normalizeSession(payload);
          return session
            ? { data: { user: session.user, session }, error: null }
            : { data: { user: null, session: null }, error: toAuthError(502, payload, 'Refresh returned an invalid session') };
        } catch (error) {
          return { data: { user: null, session: null }, error: { message: error?.message || 'Session refresh unavailable', status: 503 } };
        }
      },

      async getUser(accessToken) {
        try {
          const { response, payload } = await authFetch('/user', {
            method: 'GET',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!response.ok) return { data: { user: null }, error: toAuthError(response.status, payload, 'Invalid session') };
          return { data: { user: payload }, error: null };
        } catch (error) {
          return { data: { user: null }, error: { message: error?.message || 'Session validation unavailable', status: 503 } };
        }
      },
    },
  };
}

function jwtExpiry(accessToken) {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return undefined;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    return typeof decoded?.exp === 'number' ? decoded.exp : undefined;
  } catch {
    return undefined;
  }
}

export function setSessionCookies(req, res, session, remember = true) {
  const accessMaxAge = Math.max(60, Number(session.expires_in || 3600));
  const refreshMaxAge = 60 * 60 * 24 * 365;
  appendSetCookie(res, serializeCookie(req, cookieName(req, COOKIE_BASE.access), session.access_token, { maxAge: remember ? accessMaxAge : undefined }));
  appendSetCookie(res, serializeCookie(req, cookieName(req, COOKIE_BASE.refresh), session.refresh_token, { maxAge: remember ? refreshMaxAge : undefined }));
  appendSetCookie(res, serializeCookie(req, cookieName(req, COOKIE_BASE.remember), remember ? '1' : '0', { maxAge: remember ? refreshMaxAge : undefined }));
}

export function clearSessionCookies(req, res) {
  appendSetCookie(res, serializeCookie(req, cookieName(req, COOKIE_BASE.access), '', { clear: true }));
  appendSetCookie(res, serializeCookie(req, cookieName(req, COOKIE_BASE.refresh), '', { clear: true }));
  appendSetCookie(res, serializeCookie(req, cookieName(req, COOKIE_BASE.remember), '', { clear: true }));
}

export function clearPkceCookie(req, res) {
  appendSetCookie(res, serializeCookie(req, cookieName(req, COOKIE_BASE.pkce), '', { clear: true }));
}

function setPkceCookie(req, res, verifier) {
  appendSetCookie(res, serializeCookie(req, cookieName(req, COOKIE_BASE.pkce), verifier, {
    maxAge: 10 * 60,
    httpOnly: true,
    sameSite: 'Lax',
  }));
}

export function getCookieSession(req) {
  const cookies = parseCookies(req);
  return {
    accessToken: cookies[cookieName(req, COOKIE_BASE.access)] || '',
    refreshToken: cookies[cookieName(req, COOKIE_BASE.refresh)] || '',
    remember: cookies[cookieName(req, COOKIE_BASE.remember)] !== '0',
  };
}

export async function refreshCookieSession(req, res) {
  const { refreshToken, remember } = getCookieSession(req);
  if (!refreshToken) return null;
  const supabase = createRequestAuthClient();
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    clearSessionCookies(req, res);
    return null;
  }
  setSessionCookies(req, res, data.session, remember);
  return data.session;
}

export async function getValidatedSession(req, res) {
  let { accessToken } = getCookieSession(req);
  const supabase = createRequestAuthClient();
  if (accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (!error && data.user) return { user: data.user, accessToken, expiresAt: jwtExpiry(accessToken) };
  }
  const refreshed = await refreshCookieSession(req, res);
  if (!refreshed) return null;
  accessToken = refreshed.access_token;
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    clearSessionCookies(req, res);
    return null;
  }
  return { user: data.user, accessToken, expiresAt: refreshed.expires_at || jwtExpiry(accessToken) };
}

export async function getProxyAccessToken(req, res) {
  const { accessToken } = getCookieSession(req);
  if (accessToken) return accessToken;
  const refreshed = await refreshCookieSession(req, res);
  return refreshed?.access_token || null;
}

export async function revokeCurrentSession(req, res) {
  const { accessToken } = getCookieSession(req);
  if (accessToken) {
    try {
      await authFetch('/logout?scope=local', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch {}
  }
  clearSessionCookies(req, res);
}

function makePkceVerifier() {
  return randomBytes(64).toString('base64url');
}

function makePkceChallenge(verifier) {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function createPkceAuthClient(req, res) {
  return {
    auth: {
      async signInWithOAuth({ provider, options }) {
        try {
          const verifier = makePkceVerifier();
          const challenge = makePkceChallenge(verifier);
          setPkceCookie(req, res, verifier);
          const url = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
          url.searchParams.set('provider', String(provider || 'google'));
          url.searchParams.set('redirect_to', String(options?.redirectTo || requestOrigin(req)));
          url.searchParams.set('code_challenge', challenge);
          url.searchParams.set('code_challenge_method', 's256');
          if (options?.scopes) url.searchParams.set('scopes', String(options.scopes));
          if (options?.queryParams && typeof options.queryParams === 'object') {
            for (const [key, value] of Object.entries(options.queryParams)) {
              if (value != null) url.searchParams.set(key, String(value));
            }
          }
          return { data: { provider, url: url.toString() }, error: null };
        } catch (error) {
          clearPkceCookie(req, res);
          return { data: { provider, url: null }, error: { message: error?.message || 'Unable to start OAuth sign in', status: 500 } };
        }
      },

      async exchangeCodeForSession(code) {
        const verifier = parseCookies(req)[cookieName(req, COOKIE_BASE.pkce)] || '';
        if (!code || !verifier) {
          return { data: { user: null, session: null }, error: { message: 'OAuth code verifier is missing or expired', status: 400 } };
        }
        try {
          const { response, payload } = await authFetch('/token?grant_type=pkce', {
            method: 'POST',
            body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
          });
          if (!response.ok) return { data: { user: null, session: null }, error: toAuthError(response.status, payload, 'Unable to exchange OAuth code') };
          const session = normalizeSession(payload);
          return session
            ? { data: { user: session.user, session }, error: null }
            : { data: { user: null, session: null }, error: toAuthError(502, payload, 'OAuth exchange returned an invalid session') };
        } catch (error) {
          return { data: { user: null, session: null }, error: { message: error?.message || 'OAuth exchange service unavailable', status: 503 } };
        }
      },
    },
  };
}
