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

  // Google OAuth is initiated client-side using Supabase (supabase.auth.signInWithOAuth({ provider: 'google' })).
  // Safely redirect to root app so that no 500 or missing-module error is thrown.
  res.statusCode = 302;
  res.setHeader('Location', '/?auth=google');
  res.end('Redirecting to Google sign-in...');
}
