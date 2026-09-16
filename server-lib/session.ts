import { createClient, type Session, type User } from '@supabase/supabase-js';

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

function headerValue(req: any, name: string): string {
  const value = req?.headers?.[name.toLowerCase()] ?? req?.headers?.[name];
  if (Array.isArray(value)) return value[0] || '';
  return typeof value === 'string' ? value : '';
}

export function parseCookies(req: any): Record<string, string> {
  const raw = headerValue(req, 'cookie');
  const out: Record<string, string> = {};
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

function isSecureRequest(req: any): boolean {
  const proto = headerValue(req, 'x-forwarded-proto').split(',')[0]?.trim();
  if (proto) return proto === 'https';
  return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
}

function cookieName(req: any, base: string): string {
  return isSecureRequest(req) ? `__Host-${base}` : base;
}

function serializeCookie(
  req: any,
  name: string,
  value: string,
  options: { maxAge?: number; httpOnly?: boolean; sameSite?: 'Lax' | 'Strict'; clear?: boolean } = {},
): string {
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

function appendSetCookie(res: any, cookie: string) {
  const current = res.getHeader?.('Set-Cookie');
  if (!current) {
    res.setHeader('Set-Cookie', [cookie]);
  } else if (Array.isArray(current)) {
    res.setHeader('Set-Cookie', [...current, cookie]);
  } else {
    res.setHeader('Set-Cookie', [String(current), cookie]);
  }
}

export function setNoStore(res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

export function requestOrigin(req: any): string {
  const proto = headerValue(req, 'x-forwarded-proto').split(',')[0]?.trim() || (isSecureRequest(req) ? 'https' : 'http');
  const host = headerValue(req, 'x-forwarded-host').split(',')[0]?.trim() || headerValue(req, 'host');
  return `${proto}://${host}`;
}

export function requireAppRequest(req: any, res: any): boolean {
  const marker = headerValue(req, 'x-brainboost-request');
  if (marker !== '1') {
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

export function createRequestAuthClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function jwtExpiry(accessToken: string): number | undefined {
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

export function setSessionCookies(req: any, res: any, session: Session, remember = true) {
  const accessMaxAge = Math.max(60, Number(session.expires_in || 3600));
  const refreshMaxAge = 60 * 60 * 24 * 365;

  appendSetCookie(
    res,
    serializeCookie(req, cookieName(req, COOKIE_BASE.access), session.access_token, {
      maxAge: remember ? accessMaxAge : undefined,
      httpOnly: true,
      sameSite: 'Lax',
    }),
  );
  appendSetCookie(
    res,
    serializeCookie(req, cookieName(req, COOKIE_BASE.refresh), session.refresh_token, {
      maxAge: remember ? refreshMaxAge : undefined,
      httpOnly: true,
      sameSite: 'Lax',
    }),
  );
  appendSetCookie(
    res,
    serializeCookie(req, cookieName(req, COOKIE_BASE.remember), remember ? '1' : '0', {
      maxAge: remember ? refreshMaxAge : undefined,
      httpOnly: true,
      sameSite: 'Lax',
    }),
  );
}

export function clearSessionCookies(req: any, res: any) {
  appendSetCookie(res, serializeCookie(req, cookieName(req, COOKIE_BASE.access), '', { clear: true }));
  appendSetCookie(res, serializeCookie(req, cookieName(req, COOKIE_BASE.refresh), '', { clear: true }));
  appendSetCookie(res, serializeCookie(req, cookieName(req, COOKIE_BASE.remember), '', { clear: true }));
}

export function clearPkceCookie(req: any, res: any) {
  appendSetCookie(res, serializeCookie(req, cookieName(req, COOKIE_BASE.pkce), '', { clear: true }));
}

export function getCookieSession(req: any) {
  const cookies = parseCookies(req);
  return {
    accessToken: cookies[cookieName(req, COOKIE_BASE.access)] || '',
    refreshToken: cookies[cookieName(req, COOKIE_BASE.refresh)] || '',
    remember: cookies[cookieName(req, COOKIE_BASE.remember)] !== '0',
  };
}

export async function refreshCookieSession(req: any, res: any): Promise<Session | null> {
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

export async function getValidatedSession(
  req: any,
  res: any,
): Promise<{ user: User; accessToken: string; expiresAt?: number } | null> {
  let { accessToken } = getCookieSession(req);
  const supabase = createRequestAuthClient();

  if (accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (!error && data.user) {
      return { user: data.user, accessToken, expiresAt: jwtExpiry(accessToken) };
    }
  }

  const refreshed = await refreshCookieSession(req, res);
  if (!refreshed) return null;
  accessToken = refreshed.access_token;
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    clearSessionCookies(req, res);
    return null;
  }
  return {
    user: data.user,
    accessToken,
    expiresAt: refreshed.expires_at || jwtExpiry(accessToken),
  };
}

export async function getProxyAccessToken(req: any, res: any): Promise<string | null> {
  const { accessToken } = getCookieSession(req);
  if (accessToken) return accessToken;
  const refreshed = await refreshCookieSession(req, res);
  return refreshed?.access_token || null;
}

export async function revokeCurrentSession(req: any, res: any) {
  const { accessToken } = getCookieSession(req);
  if (accessToken) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=local`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_PUBLIC_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch {
      // Cookie removal below is authoritative for the browser session.
    }
  }
  clearSessionCookies(req, res);
}

export function createPkceAuthClient(req: any, res: any) {
  const storage = {
    getItem: async (key: string) => {
      if (!key.includes('code-verifier')) return null;
      return parseCookies(req)[cookieName(req, COOKIE_BASE.pkce)] || null;
    },
    setItem: async (key: string, value: string) => {
      if (!key.includes('code-verifier')) return;
      appendSetCookie(
        res,
        serializeCookie(req, cookieName(req, COOKIE_BASE.pkce), value, {
          maxAge: 10 * 60,
          httpOnly: true,
          sameSite: 'Lax',
        }),
      );
    },
    removeItem: async (key: string) => {
      if (key.includes('code-verifier')) clearPkceCookie(req, res);
    },
  };

  return createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage,
    },
  });
}
