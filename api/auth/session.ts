export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Authentication in this application is handled directly client-side via Supabase SDK.
  // Returning 200 with session: null satisfies any legacy polling or health checks with no 500 error.
  const payload = JSON.stringify({
    session: null,
    user: null,
    authenticated: false,
    authProvider: 'supabase',
    message: 'Authentication is managed directly client-side via Supabase Auth SDK',
  });

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(payload);
}
