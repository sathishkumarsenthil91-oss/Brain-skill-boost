import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-retry-count, traceparent",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const extractGeminiText = (payload: any): string => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("")
    .trim();
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey) return json({ error: "Supabase runtime is not configured" }, 503);
    if (!geminiKey) return json({ error: "Gemini API key is not configured. Add GEMINI_API_KEY to Supabase Edge Function secrets." }, 503);

    const db = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await db.auth.getUser(authHeader.slice(7));
    const user = userData?.user;
    if (userError || !user) return json({ error: "Invalid or expired session" }, 401);

    const raw = await req.text();
    if (raw.length > 60000) return json({ error: "Request is too large" }, 413);

    let body: any;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: "Invalid JSON request" }, 400);
    }

    const message = String(body?.message || "").trim();
    const mode = String(body?.mode || "career").slice(0, 40);
    const language = String(body?.language || "English").slice(0, 40);
    const history = Array.isArray(body?.history) ? body.history.slice(-12) : [];

    if (!message) return json({ error: "Message is required" }, 400);
    if (message.length > 12000) return json({ error: "Message is too long" }, 413);

    let sessionId = body?.sessionId ? String(body.sessionId) : null;

    if (sessionId) {
      const { data: ownedSession } = await db
        .from("ai_chat_sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!ownedSession) return json({ error: "Chat session was not found" }, 404);
    }

    const system = [
      "You are Nebula AI, BrainBoost's accurate and practical career and technical mentor.",
      "Answer the latest user message directly; do not repeat a previous answer unless asked.",
      "Use the supplied conversation history for continuity. Be concise unless the user asks for detail.",
      "Never invent personal facts. Keep code secure and production-ready.",
      language !== "English" && language !== "auto" ? "Respond in " + language + "." : "Respond in the user's language.",
      "Mode: " + mode + ".",
    ].join(" ");

    const contents = [
      ...history
        .filter((item: any) => item && typeof item.content === "string")
        .map((item: any) => ({
          role: item.role === "assistant" ? "model" : "user",
          parts: [{ text: String(item.content) }],
        })),
      { role: "user", parts: [{ text: message }] },
    ];

    const configuredModel = String(Deno.env.get("GEMINI_MODEL") || "").trim();
    const model = configuredModel || "gemini-3.5-flash-lite";
    const endpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) +
      ":generateContent";

    const aiResponse = await fetch(endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: {
        "x-goog-api-key": geminiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: {
          maxOutputTokens: 1600,
          candidateCount: 1,
        },
      }),
    });

    let aiPayload: any = null;
    try {
      aiPayload = await aiResponse.json();
    } catch {
      aiPayload = null;
    }

    if (!aiResponse.ok) {
      const providerStatus = aiResponse.status;
      const providerCode = String(aiPayload?.error?.status || aiPayload?.error?.code || "unknown_error");
      const providerMessage = String(aiPayload?.error?.message || "");

      console.error("Gemini request failed", {
        providerStatus,
        providerCode,
        providerMessage: providerMessage.slice(0, 300),
        model,
      });

      let error = "Gemini request failed";
      if (providerStatus === 400) error = "Gemini rejected the AI request configuration";
      else if (providerStatus === 401) error = "Gemini API key authentication failed";
      else if (providerStatus === 403) error = "Gemini API key does not have permission to use this model";
      else if (providerStatus === 404) error = "The configured Gemini model is not available for this API key";
      else if (providerStatus === 429) error = "Gemini quota or rate limit was reached. Please retry later";
      else if (providerStatus >= 500) error = "Gemini is temporarily unavailable. Please retry shortly";

      return json({ error, providerStatus, providerCode }, 502);
    }

    const content = extractGeminiText(aiPayload);
    if (!content) {
      const finishReason = String(aiPayload?.candidates?.[0]?.finishReason || "unknown");
      const blockReason = String(aiPayload?.promptFeedback?.blockReason || "");
      console.error("Gemini returned no text", { finishReason, blockReason, model });
      return json({ error: "Gemini returned an empty response", finishReason, blockReason }, 502);
    }

    if (!sessionId) {
      const title = message.length > 72 ? message.slice(0, 69) + "..." : message;
      const { data: session, error } = await db
        .from("ai_chat_sessions")
        .insert({ user_id: user.id, title, mode })
        .select("id")
        .single();
      if (error) throw new Error("Could not create chat session: " + error.message);
      sessionId = session.id;
    }

    const { error: messagesInsertError } = await db.from("ai_chat_messages").insert([
      { session_id: sessionId, user_id: user.id, role: "user", content: message, model_used: "user", language },
      { session_id: sessionId, user_id: user.id, role: "assistant", content, model_used: model, language },
    ]);
    if (messagesInsertError) throw new Error("Could not save chat messages: " + messagesInsertError.message);

    const { error: sessionUpdateError } = await db
      .from("ai_chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (sessionUpdateError) throw new Error("Could not update chat session: " + sessionUpdateError.message);

    return json({ content, response: content, sessionId, model, provider: "gemini" });
  } catch (error) {
    console.error("ai-chat failure", error instanceof Error ? error.message : "unknown");
    return json({ error: "Unable to process the chat request" }, 500);
  }
});
