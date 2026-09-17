let appInstance: any = null;

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const url = req.url || '';

  if (url.includes('/auth/session')) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ session: null, user: null, authenticated: false, message: 'Supabase auth is client-side' }));
    return;
  }

  if (url.includes('/auth/google')) {
    res.statusCode = 302;
    res.setHeader('Location', '/?auth=google');
    res.end('Redirecting to Google sign-in...');
    return;
  }

  try {
    if (!appInstance) {
      const serverModule = await import('../server.js');
      appInstance = serverModule.default || serverModule.app;
    }
    if (appInstance) {
      return appInstance(req, res);
    }
  } catch (err: any) {
    console.warn('API handler dynamic dispatch notice:', err?.message || err);
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ status: 'ok', service: 'Brainboost API', timestamp: new Date().toISOString() }));
}
