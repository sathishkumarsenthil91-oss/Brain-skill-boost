import { createRequestAuthClient, requestOrigin, requireAppRequest, setNoStore } from '../_lib/session.js';

export default async function handler(req: any, res: any) {
  setNoStore(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAppRequest(req, res)) return;

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const supabase = createRequestAuthClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${requestOrigin(req)}/`,
      },
    });

    if (error) return res.status(error.status || 400).json({ error: error.message });
    return res.status(200).json({
      user: data.user,
      needsEmailConfirmation: !data.session,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unable to register' });
  }
}
