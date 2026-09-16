import { corsHeaders as sdkCors } from "npm:@supabase/supabase-js@2.116.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': sdkCors["Access-Control-Allow-Headers"] + ", x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json', 'Cache-Control': 'no-store',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (!['GET', 'POST'].includes(req.method)) return json({ error: 'Method not allowed' }, 405);
  try {
    const authorization = req.headers.get('Authorization') || '';
    if (!authorization.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401);
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await db.auth.getUser(authorization.slice(7));
    if (authError || !user) return json({ error: 'Invalid or expired session' }, 401);
    const { data, error } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) return json({ error: 'Could not load your profile' }, 500);
    return json({ data });
  } catch { return json({ error: 'Could not connect to the database' }, 503); }
});
