import { clearPkceCookie, createPkceAuthClient, requestOrigin, setNoStore, setSessionCookies } from '../_lib/session.js';

export default async function handler(req: any, res: any) {
  setNoStore(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const code = typeof req.query?.code === 'string' ? req.query.code : '';
  const errorDescription = typeof req.query?.error_description === 'string' ? req.query.error_description : '';

  if (!code) {
    clearPkceCookie(req, res);
    const message = encodeURIComponent(errorDescription || 'Google sign in did not return an authorization code');
    res.statusCode = 302;
    res.setHeader('Location', `${requestOrigin(req)}/?auth_error=${message}`);
    return res.end();
  }

  try {
    const supabase = createPkceAuthClient(req, res);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    clearPkceCookie(req, res);

    if (error || !data.session) {
      const message = encodeURIComponent(error?.message || 'Google sign in could not be completed');
      res.statusCode = 302;
      res.setHeader('Location', `${requestOrigin(req)}/?auth_error=${message}`);
      return res.end();
    }

    setSessionCookies(req, res, data.session, true);
    res.statusCode = 302;
    res.setHeader('Location', `${requestOrigin(req)}/?auth=success`);
    return res.end();
  } catch (error: any) {
    clearPkceCookie(req, res);
    const message = encodeURIComponent(error?.message || 'Google sign in failed');
    res.statusCode = 302;
    res.setHeader('Location', `${requestOrigin(req)}/?auth_error=${message}`);
    return res.end();
  }
}
