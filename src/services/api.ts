import { supabase, reportServiceError } from '../supabaseClient';

/** Hosted APIs always run on Supabase, including in the static Amplify build. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) throw new Error('Please sign in again to continue.');
  const body = typeof init.body === 'string' ? JSON.parse(init.body) : {};
  const chat = path === '/api/ai/chat';
  const { data, error: invocationError } = await supabase.functions.invoke(chat ? 'ai-chat' : 'app-api', {
    body: chat ? body : { path, ...body },
    signal: init.signal ?? undefined,
  });
  if (invocationError) {
    let message = 'The service could not complete this request. Please try again.';
    try {
      const details = await invocationError.context?.json();
      if (typeof details?.error === 'string') message = details.error;
    } catch { /* Transport errors may have no JSON response. */ }
    reportServiceError(message);
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return new Response(JSON.stringify(chat ? { ...data, reply: data.content, modelUsed: data.model } : data), {
    headers: { 'Content-Type': 'application/json' },
  });
}
