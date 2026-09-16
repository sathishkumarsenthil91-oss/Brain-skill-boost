import { createRequestAuthClient, requireAppRequest, setNoStore, setSessionCookies } from '../_lib/session.js';

export default async function handler(req: any, res: any) {
  setNoStore(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAppRequest(req, res)) return;

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const remember = body.remember !== false;

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const supabase = createRequestAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) {
      return res.status(error?.status || 401).json({ error: error?.message || 'Unable to sign in' });
    }

    setSessionCookies(req, res, data.session, remember);
    return res.status(200).json({
      user: data.user,
      expiresAt: data.session.expires_at,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unable to sign in' });
  }
}
