import { requireAppRequest, revokeCurrentSession, setNoStore } from '../../server-lib/session';

export default async function handler(req: any, res: any) {
  setNoStore(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAppRequest(req, res)) return;

  await revokeCurrentSession(req, res);
  return res.status(200).json({ ok: true });
}
