import { getValidatedSession, requireAppRequest, setNoStore } from '../../server-lib/session';

export default async function handler(req: any, res: any) {
  setNoStore(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAppRequest(req, res)) return;

  const session = await getValidatedSession(req, res);
  if (!session) return res.status(401).json({ error: 'Authentication required' });

  return res.status(200).json({
    accessToken: session.accessToken,
    expiresAt: session.expiresAt,
  });
}
