import {
  SUPABASE_PUBLIC_KEY,
  SUPABASE_URL,
  getProxyAccessToken,
  refreshCookieSession,
  requireAppRequest,
  setNoStore,
} from './_lib/session.js';

const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'accept-profile',
  'content-profile',
  'content-type',
  'prefer',
  'range',
  'range-unit',
  'x-client-info',
  'x-upsert',
];

const FORWARDED_RESPONSE_HEADERS = [
  'content-type',
  'content-range',
  'range-unit',
  'preference-applied',
  'location',
  'x-supabase-api-version',
];

function first(value: unknown): string {
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

async function requestBody(req: any): Promise<any> {
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return undefined;

  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);

  if (!req.readable) return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

function allowedTarget(rawTarget: string): URL | null {
  try {
    const target = new URL(rawTarget);
    const base = new URL(SUPABASE_URL);
    if (target.origin !== base.origin) return null;
    const allowed = ['/rest/v1/', '/functions/v1/', '/storage/v1/'];
    if (!allowed.some((prefix) => target.pathname.startsWith(prefix))) return null;
    return target;
  } catch {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  setNoStore(res);
  if (!requireAppRequest(req, res)) return;

  const target = allowedTarget(first(req.query?.target));
  if (!target) return res.status(400).json({ error: 'Invalid Supabase target' });

  let accessToken = await getProxyAccessToken(req, res);
  if (!accessToken) return res.status(401).json({ error: 'Authentication required' });

  const body = await requestBody(req);
  const method = String(req.method || 'GET').toUpperCase();

  const forward = async (token: string) => {
    const headers = new Headers();
    for (const name of FORWARDED_REQUEST_HEADERS) {
      const value = req.headers?.[name];
      if (typeof value === 'string' && value) headers.set(name, value);
    }
    headers.set('apikey', SUPABASE_PUBLIC_KEY);
    headers.set('authorization', `Bearer ${token}`);

    return fetch(target.toString(), {
      method,
      headers,
      body,
      redirect: 'manual',
    });
  };

  let upstream = await forward(accessToken);
  if (upstream.status === 401) {
    const refreshed = await refreshCookieSession(req, res);
    if (refreshed?.access_token) {
      accessToken = refreshed.access_token;
      upstream = await forward(accessToken);
    }
  }

  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) res.setHeader(name, value);
  }

  const payload = Buffer.from(await upstream.arrayBuffer());
  res.statusCode = upstream.status;
  return res.end(payload);
}
