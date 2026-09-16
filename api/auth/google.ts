import { createPkceAuthClient, requestOrigin, setNoStore } from '../../server-lib/session';

export default async function handler(req: any, res: any) {
  setNoStore(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createPkceAuthClient(req, res);
    // Use the app root because it is already the normal Supabase redirect target.
    // The browser immediately forwards the one-time PKCE code to our server callback.
    const redirectTo = `${requestOrigin(req)}/?auth_callback=1`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      return res.status(error?.status || 400).json({ error: error?.message || 'Unable to start Google sign in' });
    }

    res.statusCode = 302;
    res.setHeader('Location', data.url);
    return res.end();
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unable to start Google sign in' });
  }
}
