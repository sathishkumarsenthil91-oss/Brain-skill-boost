import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const openAiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey) return json({ error: "Supabase runtime is not configured" }, 503);
    if (!openAiKey) return json({ error: "AI service is not configured" }, 503);

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

    const { error: userInsertError } = await db.from("ai_chat_messages").insert({
      session_id: sessionId,
      user_id: user.id,
      role: "user",
      content: message,
      model_used: "user",
      language,
    });
    if (userInsertError) throw new Error("Could not save user message: " + userInsertError.message);

    const instructions = [
      "You are Nebula AI, BrainBoost's accurate and practical career and technical mentor.",
      "Answer the latest user message directly; do not repeat a previous answer unless asked.",
      "Use the supplied conversation history for continuity.",
      "Never invent personal facts. Keep code secure and production-ready.",
      language !== "English" && language !== "auto" ? "Respond in " + language + "." : "Respond in the user's language.",
      "Mode: " + mode + ".",
    ].join(" ");

    const input = [
      ...history
        .filter((item: any) => item && typeof item.content === "string")
        .map((item: any) => ({
          role: item.role === "assistant" ? "assistant" : "user",
          content: [{ type: "input_text", text: String(item.content) }],
        })),
      { role: "user", content: [{ type: "input_text", text: message }] },
    ];

    const configuredModel = String(Deno.env.get("OPENAI_MODEL") || "").trim();
    const allowedModels = new Set(["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol", "gpt-5.6", "gpt-6-astra"]);
    const model = allowedModels.has(configuredModel) ? configuredModel : "gpt-5.6-luna";

    const requestOpenAI = async () => {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        signal: AbortSignal.timeout(60000),
        headers: {
          Authorization: "Bearer " + openAiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          instructions,
          input,
          reasoning: { effort: "none" },
          max_output_tokens: 1800,
        }),
      });

      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      return { response, payload };
    };

    let { response: aiResponse, payload: aiPayload } = await requestOpenAI();

    const firstErrorCode = String(aiPayload?.error?.code || aiPayload?.error?.type || "");
    const shouldRetry =
      aiResponse.status >= 500 ||
      (aiResponse.status === 429 && firstErrorCode !== "insufficient_quota");

    if (!aiResponse.ok && shouldRetry) {
      await sleep(900);
      const retried = await requestOpenAI();
      aiResponse = retried.response;
      aiPayload = retried.payload;
    }

    if (!aiResponse.ok) {
      const providerStatus = aiResponse.status;
      const providerCode = String(aiPayload?.error?.code || aiPayload?.error?.type || "unknown_error");
      const providerRequestId = aiResponse.headers.get("x-request-id") || undefined;

      console.error("OpenAI request failed", {
        providerStatus,
        providerCode,
        providerRequestId,
      });

      let error = "AI provider request failed";
      if (providerStatus === 401) error = "OpenAI API key is invalid or has been revoked";
      else if (providerStatus === 403) error = "OpenAI API key or project does not have permission to use this model";
      else if (providerStatus === 404) error = "The configured OpenAI model is not available";
      else if (providerStatus === 429 && providerCode === "insufficient_quota") error = "OpenAI API quota or billing limit has been reached";
      else if (providerStatus === 429) error = "OpenAI API rate limit was reached. Please retry shortly";
      else if (providerStatus >= 500) error = "OpenAI is temporarily unavailable. Please retry shortly";
      else if (providerStatus === 400) error = "OpenAI rejected the AI request configuration";

      return json({ error, providerStatus, providerCode, providerRequestId }, 502);
    }

    const content = String(aiPayload?.output_text || "").trim();
    if (!content) {
      console.error("OpenAI returned no output_text", {
        status: aiPayload?.status,
        id: aiPayload?.id,
      });
      return json({ error: "AI provider returned an empty response" }, 502);
    }

    const modelUsed = String(aiPayload?.model || model);

    const { error: assistantInsertError } = await db.from("ai_chat_messages").insert({
      session_id: sessionId,
      user_id: user.id,
      role: "assistant",
      content,
      model_used: modelUsed,
      language,
    });
    if (assistantInsertError) throw new Error("Could not save assistant message: " + assistantInsertError.message);

    const { error: sessionUpdateError } = await db
      .from("ai_chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (sessionUpdateError) throw new Error("Could not update chat session: " + sessionUpdateError.message);

    return json({ content, response: content, sessionId, model: modelUsed });
  } catch (error) {
    console.error("ai-chat failure", error instanceof Error ? error.message : "unknown");
    return json({ error: "Unable to process the chat request" }, 500);
  }
});
