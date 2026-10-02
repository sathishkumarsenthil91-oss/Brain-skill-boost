import { supabase } from '../supabaseClient';

/** Hosted builds call Supabase directly; failures must never become canned success. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  init.signal?.throwIfAborted();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) throw new Error('Please sign in to use AI features.');
  const chat = path === '/api/ai/chat';
  const body = typeof init.body === 'string' ? JSON.parse(init.body) : {};
  const signal = init.signal
    ? AbortSignal.any([init.signal, AbortSignal.timeout(65000)])
    : AbortSignal.timeout(65000);
  const { data, error: invocationError } = await supabase.functions.invoke(chat ? 'ai-chat' : 'app-api', {
    body: chat ? body : { ...body, path }, signal,
  });
  signal.throwIfAborted();
  if (invocationError) {
    const response = (invocationError as any).context;
    let details: any;
    if (response instanceof Response) {
      try { details = await response.json(); } catch { /* Preserve transport error. */ }
    }
    throw new Error(details?.error || invocationError.message || 'AI service is unavailable. Please retry.');
  }
  if (!data || data.error) throw new Error(data?.error || 'AI service returned an empty response.');
  return new Response(JSON.stringify(chat ? {
    ...data, reply: data.content || data.reply, modelUsed: data.model || data.modelUsed,
  } : data), { headers: { 'Content-Type': 'application/json' } });
}
