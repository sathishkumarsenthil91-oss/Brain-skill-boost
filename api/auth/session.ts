import { getValidatedSession, setNoStore } from '../../server-lib/session';

export default async function handler(req: any, res: any) {
  setNoStore(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const session = await getValidatedSession(req, res);
    if (!session) return res.status(401).json({ authenticated: false, user: null });
    return res.status(200).json({
      authenticated: true,
      user: session.user,
      expiresAt: session.expiresAt,
    });
  } catch {
    return res.status(401).json({ authenticated: false, user: null });
  }
}
