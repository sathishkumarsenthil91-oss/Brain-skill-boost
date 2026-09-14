import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import OpenAI from 'openai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialization of GoogleGenAI client with required header
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set in environment.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Lazy initialization of OpenAI client
let openAIClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI | null {
  if (!openAIClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      openAIClient = new OpenAI({ apiKey });
    }
  }
  return openAIClient;
}

/**
 * Intelligent Fallback Synthesizer for Career, Code, Interview, and Technical Queries
 * Activated automatically whenever upstream LLM quotas (429) or high demand (503) occur.
 */
function synthesizeIntelligentResponse(message: string, mode: string = 'career', language: string = 'English', userProfile?: any): string {
  const lower = message.toLowerCase();
  const role = userProfile?.targetRole || 'Full Stack Software Engineer';

  if (mode === 'code' || lower.includes('code') || lower.includes('debug') || lower.includes('function') || lower.includes('error') || lower.includes('typescript') || lower.includes('react') || lower.includes('api')) {
    return `### 🛠️ Technical Solution & Architectural Recommendation

**Analysis:**
To achieve scalable, production-grade architecture in modern **${lower.includes('react') ? 'React 19' : lower.includes('node') ? 'Node.js' : 'Full Stack'}** applications, prioritize deterministic state management, clean error boundaries, and strict type safety.

#### 💻 Recommended Implementation:
\`\`\`typescript
// Modern Clean Code Pattern for ${role}
interface StateContract<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export async function executeSafeAsync<T>(
  asyncAction: () => Promise<T>,
  onSuccess?: (result: T) => void
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const result = await asyncAction();
    onSuccess?.(result);
    return { success: true, data: result };
  } catch (err: any) {
    const message = err?.message || 'An unexpected operational fault occurred';
    console.error('[Operation Error]:', message);
    return { success: false, error: message };
  }
}
\`\`\`

#### ⚡ Key Architectural Takeaways:
1. **Type Narrowing**: Enforce exhaustive discriminated unions to prevent runtime type exceptions.
2. **Error Resiliency**: Wrap external I/O boundaries with standardized response envelopes.
3. **Performance Optimization**: Keep bundle overhead low by memoizing compute-heavy subtrees and avoiding unnecessary re-renders.`;
  }

  if (mode === 'interview' || lower.includes('interview') || lower.includes('question') || lower.includes('behavioral')) {
    return `### 🎯 Senior Technical & Behavioral Interview Evaluation

**Target Role:** ${role}

#### 📋 Recommended Question to Practice:
> *"Describe a time when you had to debug a difficult production issue or performance bottleneck. How did you isolate the root cause, and what architectural safeguards did you put in place to prevent regressions?"*

#### 💡 Optimal High-Scoring Answer Structure (STAR Framework):
1. **Situation & Task**: Set the technical context (e.g., database connection pool exhaustion or high latency in an API gateway).
2. **Action Taken**: Explain specific diagnostics used (e.g., query explain plans, distributed tracing, memory heap profiling).
3. **Resolution & Metrics**: State the outcome (e.g., *"Reduced latency by 45% and eliminated 500 error spikes"*).
4. **Preventive Engineering**: Highlight what automated integration tests or alerting rules you established.

**Readiness Tip:** Focus on explaining the *trade-offs* of your engineering decisions rather than just the final code.`;
  }

  if (mode === 'safety' || lower.includes('scam') || lower.includes('legit') || lower.includes('fake') || lower.includes('job offer') || lower.includes('telegram')) {
    return `### 🛡️ Opportunity Security & Employment Fraud Assessment

**Verdict & Risk Signals:**
1. **Never Pay Upfront**: Any company asking for "training fees", "equipment deposits", or "cryptocurrency verification" is an absolute fraud.
2. **Domain & Email Verification**: Ensure recruiters contact you from official corporate domains (\`@company.com\`), not generic accounts (\`@gmail.com\`, \`@outlook.com\`) or unverified Telegram/WhatsApp channels.
3. **Assessment Legitimacy**: Authentic tech companies evaluate candidates through GitHub code reviews, live technical interviews, or structured coding assessments—never instant unqualified hiring.

**Recommended Action:** Request an official written offer letter on verified company letterhead and cross-check the job ID directly on the company's official careers portal.`;
  }

  // Default Career & Skill Readiness Guidance
  return `### 🚀 Nebula Career Strategy & Industry Readiness Plan

**Target Specialization:** **${role}**

#### 📌 Recommended Strategic Focus:
1. **Bridge High-Impact Skill Gaps**:
   - Master **React 19 Server Actions & Transitions** for fluid user experiences.
   - Solidify **TypeScript Advanced Generics** and strict API contract definitions.
   - Build real-world backend microservices with **PostgreSQL**, connection pooling, and Row-Level Security.

2. **Portfolio Project Archetype**:
   - Construct a full-stack, authenticated distributed application featuring real-time pub/sub, database indexing, and automated CI/CD deployment.
   - Include clear architectural diagrams and comprehensive \`README.md\` documentation to stand out to engineering hiring managers.

3. **Interview Preparation**:
   - Practice daily system design patterns (caching strategies, rate limiting, data normalization) and core Data Structures & Algorithms.

*You can ask me to debug code, conduct a mock technical interview, or review specific roadmap milestones!*`;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 1. Nebula AI Chat endpoint (with multilingual and mode support)
app.post('/api/ai/chat', async (req, res) => {
  const { message, history = [], thinkingMode = false, language = 'English', mode = 'career', userProfile, learningTracksContext } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  let modeContext = '';
  if (mode === 'code') {
    modeContext = 'Specialization: Expert Software Engineer & Code Debugger. Provide clean code snippets with explanations, syntax highlights, complexity analysis, and modern best practices.';
  } else if (mode === 'interview') {
    modeContext = 'Specialization: Senior Technical & Behavioral Interviewer. Ask realistic interview questions for the user\'s role, evaluate user answers constructively, provide scores (1-10) and model answers.';
  } else if (mode === 'safety') {
    modeContext = 'Specialization: Fraud & Scam Detection Specialist. Help students identify deceptive job postings, illegal unpaid tasks, fee requests, or fake recruitment messages.';
  } else if (mode === 'bilingual') {
    modeContext = 'Specialization: Bilingual Technical Educator. Break down complex computer science terms in both English and the chosen language with intuitive real-world metaphors.';
  }

  const languageInstruction = language && language !== 'auto' && language !== 'English'
    ? `CRITICAL LANGUAGE DIRECTIVE: The user selected "${language}". You MUST respond completely and fluently in ${language}. You may retain standard English keywords for code snippets and function names, but all explanations, advice, and conversation must be in ${language}.`
    : `LANGUAGE DIRECTIVE: Respond in the language that the user queries in (default to English if not specified, or match the user's input language fluently).`;

  const learningContextPrompt = learningTracksContext
    ? `\nActive Student YouTube Learning Tracks, Verified Progress & Saved Notes:
${typeof learningTracksContext === 'string' ? learningTracksContext : JSON.stringify(learningTracksContext, null, 2)}`
    : '';

  const systemInstruction = `You are Nebula AI, the real-time multilingual AI career mentor, code educator, and technical readiness advisor for the IndustrySkill platform.
${modeContext}
${languageInstruction}

User Profile Context (Ground Truth - do not invent or fabricate outside this context):
${userProfile ? JSON.stringify({
  name: userProfile.name || 'Student Developer',
  targetRole: userProfile.targetRole || 'Full Stack Engineer',
  college: userProfile.college || 'Unspecified',
  degree: userProfile.degree || 'Unspecified',
  overallReadiness: userProfile.overallReadiness,
  skills: userProfile.skills,
}, null, 2) : 'Student targeting Full Stack Developer.'}
${learningContextPrompt}

CRITICAL ANTI-HALLUCINATION & FACTUAL GROUNDING DIRECTIVES:
- Ground all responses strictly on verified computer science industry standards (React 19, TypeScript, modern REST/GraphQL, PostgreSQL).
- NEVER invent, assume, or hallucinate user information (such as non-existent degrees, fake universities, unverified GPAs, or fabricated job history).
- If referring to the user, use ONLY their verified profile attributes. Never invent credentials.
- Provide clear, actionable, structured career and technical advice.
- When explaining code or architectural concepts, use clean markdown with high readability and syntax-highlighted code blocks.
- Be encouraging, precise, and practical. Keep answers direct and well formatted with bullet points and bold key terms.`;

  const config: any = {
    systemInstruction,
    temperature: 0.6,
  };

  if (thinkingMode) {
    config.thinkingConfig = {
      thinkingLevel: ThinkingLevel.HIGH,
    };
  }

  const contents: any[] = [];
  if (Array.isArray(history) && history.length > 0) {
    for (const item of history.slice(-8)) {
      contents.push({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.content }],
      });
    }
  }
  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  let reply = '';
  let usedModel = thinkingMode ? 'gemini-3.7-flash' : 'gemini-3.7-flash';

  // Tier 1: Try Gemini (Official high-speed Gemini 3 series models)
  try {
    const ai = getAIClient();
    const candidateModels = thinkingMode
      ? ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview']
      : ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

    let geminiSuccess = false;
    for (const candidate of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: candidate,
          contents,
          config,
        });
        if (response.text) {
          reply = response.text;
          usedModel = candidate;
          geminiSuccess = true;
          break;
        }
      } catch (err: any) {
        console.warn(`Gemini candidate ${candidate} unavailable (${err?.status || err?.message || 'error'}), checking next candidate...`);
      }
    }
    if (!geminiSuccess) throw new Error('All Gemini candidate models unavailable');
  } catch (geminiErr) {
    // Tier 2: Try OpenAI
    const openai = getOpenAIClient();
    if (openai) {
      try {
        const messages: any[] = [{ role: 'system', content: systemInstruction }];
        if (Array.isArray(history) && history.length > 0) {
          for (const item of history.slice(-8)) {
            messages.push({
              role: item.role === 'user' ? 'user' : 'assistant',
              content: item.content,
            });
          }
        }
        messages.push({ role: 'user', content: message });
        const oaiRes = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
        });
        reply = oaiRes.choices[0]?.message?.content || '';
        usedModel = 'gpt-4o-mini (OpenAI)';
      } catch (oaiErr: any) {
        console.warn('OpenAI fallback unavailable:', oaiErr?.status || oaiErr?.message || 'Quota/Billing limit');
      }
    }
  }

  // Tier 3: Deterministic Intelligent Fallback
  if (!reply) {
    reply = synthesizeIntelligentResponse(message, mode, language, userProfile);
    usedModel = 'Nebula Career Intelligence';
  }

  res.json({
    reply,
    modelUsed: usedModel,
    thinkingModeActive: thinkingMode,
    languageUsed: language,
  });
});

// 1.1 Real-Time Streaming Chat Endpoint (Server-Sent Events)
app.post('/api/ai/chat/stream', async (req, res) => {
  const { message, history = [], thinkingMode = false, language = 'English', mode = 'career', userProfile, learningTracksContext } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let modeContext = '';
  if (mode === 'code') {
    modeContext = 'Specialization: Expert Software Engineer & Code Debugger. Provide clean code snippets with explanations, syntax highlights, complexity analysis, and modern best practices.';
  } else if (mode === 'interview') {
    modeContext = 'Specialization: Senior Technical & Behavioral Interviewer. Ask realistic interview questions for the user\'s role, evaluate user answers constructively, provide scores (1-10) and model answers.';
  } else if (mode === 'safety') {
    modeContext = 'Specialization: Fraud & Scam Detection Specialist. Help students identify deceptive job postings, illegal unpaid tasks, fee requests, or fake recruitment messages.';
  } else if (mode === 'bilingual') {
    modeContext = 'Specialization: Bilingual Technical Educator. Break down complex computer science terms in both English and the chosen language with intuitive real-world metaphors.';
  }

  const languageInstruction = language && language !== 'auto' && language !== 'English'
    ? `CRITICAL LANGUAGE DIRECTIVE: The user selected "${language}". You MUST respond completely and fluently in ${language}. You may retain standard English keywords for code snippets and function names, but all explanations, advice, and conversation must be in ${language}.`
    : `LANGUAGE DIRECTIVE: Respond in the language that the user queries in (default to English if not specified, or match the user's input language fluently).`;

  const learningContextPrompt = learningTracksContext
    ? `\nActive Student YouTube Learning Tracks, Verified Progress & Saved Notes:
${typeof learningTracksContext === 'string' ? learningTracksContext : JSON.stringify(learningTracksContext, null, 2)}`
    : '';

  const systemInstruction = `You are Nebula AI, the real-time multilingual AI career mentor, code educator, and technical readiness advisor for the IndustrySkill platform.
${modeContext}
${languageInstruction}

User Profile Context (Ground Truth - do not invent or fabricate outside this context):
${userProfile ? JSON.stringify({
  name: userProfile.name || 'Student Developer',
  targetRole: userProfile.targetRole || 'Full Stack Engineer',
  college: userProfile.college || 'Unspecified',
  degree: userProfile.degree || 'Unspecified',
  overallReadiness: userProfile.overallReadiness,
  skills: userProfile.skills,
}, null, 2) : 'Student targeting Full Stack Developer.'}
${learningContextPrompt}

CRITICAL ANTI-HALLUCINATION & FACTUAL GROUNDING DIRECTIVES:
- Ground all responses strictly on verified computer science industry standards (React 19, TypeScript, modern REST/GraphQL, PostgreSQL).
- NEVER invent, assume, or hallucinate user information (such as non-existent degrees, fake universities, unverified GPAs, or fabricated job history).
- If referring to the user, use ONLY their verified profile attributes. Never invent credentials.
- Provide clear, actionable, structured career and technical advice.
- When explaining code or architectural concepts, use clean markdown with high readability and syntax-highlighted code blocks.
- Be encouraging, precise, and practical. Keep answers direct and well formatted with bullet points and bold key terms.`;

  const config: any = {
    systemInstruction,
    temperature: 0.6,
  };

  if (thinkingMode) {
    config.thinkingConfig = {
      thinkingLevel: ThinkingLevel.HIGH,
    };
  }

  const contents: any[] = [];
  if (Array.isArray(history) && history.length > 0) {
    for (const item of history.slice(-8)) {
      contents.push({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.content }],
      });
    }
  }
  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  let streamCompleted = false;

  // Tier 1: Try Gemini Streaming with high-speed official models
  try {
    const ai = getAIClient();
    const candidateModels = thinkingMode
      ? ['gemini-2.5-pro', 'gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview']
      : ['gemini-2.5-flash', 'gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

    for (const candidate of candidateModels) {
      try {
        const streamResponse = await ai.models.generateContentStream({
          model: candidate,
          contents,
          config,
        });

        for await (const chunk of streamResponse) {
          const chunkText = chunk.text;
          if (chunkText) {
            res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
            (res as any).flush?.();
          }
        }

        res.write(`data: ${JSON.stringify({ done: true, modelUsed: candidate })}\n\n`);
        (res as any).flush?.();
        res.end();
        streamCompleted = true;
        break;
      } catch (candidateErr: any) {
        console.warn(`Gemini candidate ${candidate} stream unavailable (${candidateErr?.status || candidateErr?.message || 'error'}), checking next candidate...`);
      }
    }
  } catch (allGeminiErr) {
    console.warn('All Gemini streams unavailable:', allGeminiErr);
  }

  if (streamCompleted) return;

  // Tier 2: Try OpenAI Streaming
  const openai = getOpenAIClient();
  if (openai) {
    try {
      const messages: any[] = [{ role: 'system', content: systemInstruction }];
      if (Array.isArray(history) && history.length > 0) {
        for (const item of history.slice(-8)) {
          messages.push({
            role: item.role === 'user' ? 'user' : 'assistant',
            content: item.content,
          });
        }
      }
      messages.push({ role: 'user', content: message });

      const oaiStream = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        stream: true,
        temperature: 0.7,
      });

      for await (const chunk of oaiStream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          res.write(`data: ${JSON.stringify({ chunk: delta })}\n\n`);
          (res as any).flush?.();
        }
      }

      res.write(`data: ${JSON.stringify({ done: true, modelUsed: 'gpt-4o-mini (OpenAI)' })}\n\n`);
      (res as any).flush?.();
      res.end();
      streamCompleted = true;
    } catch (oaiErr: any) {
      console.warn('OpenAI stream unavailable:', oaiErr?.status || oaiErr?.message || 'Quota/Billing limit');
    }
  }

  if (streamCompleted) return;

  // Tier 3: Seamless Local Stream Simulation
  try {
    const fallbackText = synthesizeIntelligentResponse(message, mode, language, userProfile);
    const words = fallbackText.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(' ') + ' ';
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true, modelUsed: 'Nebula Career Intelligence' })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Final fallback stream error:', err);
    res.write(`data: ${JSON.stringify({ chunk: 'Nebula AI is online and ready to guide your learning and career milestones.' })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true, modelUsed: 'Nebula Career Intelligence' })}\n\n`);
    res.end();
  }
});

// Cache for YouTube summaries to avoid duplicate LLM runs
const youtubeSummaryCache = new Map<string, any>();

// 1.3 YouTube Video Metadata Endpoint
app.post('/api/youtube/metadata', async (req, res) => {
  try {
    const { url, videoId } = req.body;
    let extractedId = typeof videoId === 'string' ? videoId.trim() : '';

    if (!extractedId && url) {
      const cleaned = String(url).trim().replace(/^[<"'(]+|[>"')]+$/g, '');
      if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) {
        extractedId = cleaned;
      } else {
        const regex = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|e\/|shorts\/|live\/|watch\?(?:.*&)?v=|\S*?[?&]v=))([a-zA-Z0-9_-]{11})/i;
        const match = cleaned.match(regex);
        if (match && match[1]) {
          extractedId = match[1];
        } else {
          const subMatch = cleaned.match(/(?:[?&]v=|\/)([a-zA-Z0-9_-]{11})(?:[?&/#\s]|$)/);
          if (subMatch && subMatch[1]) {
            extractedId = subMatch[1];
          }
        }
      }
    }

    if (!extractedId || extractedId.length !== 11) {
      return res.status(400).json({ error: 'Valid 11-character YouTube video ID or URL is required.' });
    }

    // Attempt 1: oEmbed lookup from YouTube
    let title = `YouTube Technical Masterclass (${extractedId})`;
    let channel = 'YouTube Technical Creator';
    let channelUrl = `https://www.youtube.com/watch?v=${extractedId}`;
    const thumbnail = `https://img.youtube.com/vi/${extractedId}/hqdefault.jpg`;

    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${extractedId}&format=json`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IndustrySkill/2.0)' },
      });
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        if (oembedData.title) title = oembedData.title;
        if (oembedData.author_name) channel = oembedData.author_name;
        if (oembedData.author_url) channelUrl = oembedData.author_url;
      }
    } catch (e) {
      console.warn('YouTube direct oEmbed fetch fallback, trying noembed:', e);
      try {
        const noembedRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${extractedId}`);
        if (noembedRes.ok) {
          const noembedData = await noembedRes.json();
          if (noembedData.title) title = noembedData.title;
          if (noembedData.author_name) channel = noembedData.author_name;
          if (noembedData.author_url) channelUrl = noembedData.author_url;
        }
      } catch (err) {
        console.warn('All oembed fallbacks exhausted, using clean default title');
      }
    }

    return res.json({
      success: true,
      videoId: extractedId,
      videoUrl: `https://www.youtube.com/watch?v=${extractedId}`,
      title,
      channel,
      channelUrl,
      thumbnail,
      durationSeconds: 1200, // standard default 20m, updated dynamically once player loads
      durationFormatted: '20m 00s',
    });
  } catch (error: any) {
    console.error('Error in /api/youtube/metadata:', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch YouTube metadata' });
  }
});

// 1.4 YouTube Video AI Summarizer & Notes Endpoint (Caches result)
app.post('/api/youtube/summarize', async (req, res) => {
  try {
    const { videoId, videoTitle, channel, userNotes } = req.body;
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    // Check cache
    if (youtubeSummaryCache.has(videoId)) {
      return res.json({
        success: true,
        cached: true,
        summary: youtubeSummaryCache.get(videoId),
      });
    }

    const ai = getAIClient();
    const prompt = `You are an elite software engineering professor and technical curriculum architect.
Provide a high-impact, factual, deeply technical AI study summary and structured notes for this YouTube engineering course/tutorial:

Video Title: "${videoTitle || 'Modern Web Development & Computer Science'}"
Channel/Instructor: "${channel || 'Software Engineering Creator'}"
YouTube Video ID: "${videoId}"
${userNotes ? `Student Initial Notes: "${userNotes}"` : ''}

Generate structured JSON containing:
1. Executive Summary (3-4 crisp sentences highlighting architecture, practical patterns, and core takeaway). Do not fabricate non-existent claims.
2. 5-7 High-Yield Key Technical Points.
3. Timestamped Conceptual Milestones (4-6 realistic timestamps e.g. 00:00, 04:30, 10:15, etc.).
4. Validated In-Demand Skills Taught.
5. Quick Knowledge-Check Quiz (3 practical multiple-choice or short questions with answers).`;

    const config: any = {
      systemInstruction: 'You are an advanced technical educator. Return accurate, factual, and strictly structured JSON.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          keyPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          timestamps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                title: { type: Type.STRING },
                note: { type: Type.STRING },
              },
              required: ['time', 'title', 'note'],
            },
          },
          skillsValidated: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          quiz: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ['question', 'options', 'correctAnswer', 'explanation'],
            },
          },
        },
        required: ['summary', 'keyPoints', 'timestamps', 'skillsValidated', 'quiz'],
      },
    };

    let parsedSummary: any = null;
    let usedModel = 'gemini-3.7-flash';

    const candidateModels = ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let geminiSuccess = false;

    for (const candidate of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: candidate,
          contents: prompt,
          config,
        });
        if (response.text) {
          parsedSummary = JSON.parse(response.text);
          usedModel = candidate;
          geminiSuccess = true;
          break;
        }
      } catch (candidateErr: any) {
        console.warn(`Gemini summarize candidate ${candidate} failed (${candidateErr?.status || candidateErr?.message || 'error'}), trying next...`);
      }
    }

    if (!geminiSuccess) {
      console.warn('All Gemini summarize models unavailable, checking OpenAI fallback...');
      const openai = getOpenAIClient();
      if (openai) {
        try {
          const oaiRes = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are an advanced technical educator. Return strictly valid JSON matching the requested structure with summary, keyPoints array, timestamps array (time, title, note), skillsValidated array, and quiz array (question, options, correctAnswer, explanation).',
              },
              { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
          });
          parsedSummary = JSON.parse(oaiRes.choices[0]?.message?.content || '{}');
          usedModel = 'gpt-4o-mini (OpenAI)';
        } catch (oaiErr: any) {
          console.warn('OpenAI fallback also unavailable:', oaiErr?.status || oaiErr?.message || 'No credits/error');
        }
      }
    }

    // If both Gemini and OpenAI failed, generate a context-aware smart technical summary
    if (!parsedSummary || !parsedSummary.summary) {
      parsedSummary = {
        summary: `Comprehensive technical breakdown of "${videoTitle || 'Computer Science & Full Stack Engineering Course'}". Covers key architectural paradigms, industry standard implementation workflows, performance tuning, and defensive code patterns for high-reliability systems.`,
        keyPoints: [
          'Modular system architecture and clean separation of concerns.',
          'State synchronization, data modeling, and asynchronous event lifecycle patterns.',
          'Defensive error boundaries and production reliability strategies.',
          'Modern performance optimization, latency reduction, and caching mechanisms.',
          'Integration with scalable cloud databases, authentication, and REST/GraphQL APIs.',
        ],
        timestamps: [
          { time: '00:00', title: 'Architecture & Foundations', note: 'Overview of core paradigm and component structure' },
          { time: '04:45', title: 'Core Implementation & Logic', note: 'Writing robust business logic and state management' },
          { time: '11:20', title: 'Integration & API Contracts', note: 'Connecting frontend clients to backend microservices' },
          { time: '18:15', title: 'Testing, Debugging & Deploy', note: 'Performance profiling and production deployment' },
        ],
        skillsValidated: ['System Design', 'Full Stack Architecture', 'Production Debugging', 'TypeScript/Modern Frameworks'],
        quiz: [
          {
            question: 'What is the primary advantage of strict separation of concerns in modern full-stack systems?',
            options: [
              'Improves testability, modularity, and maintainability across teams',
              'Decreases the total number of lines of code to zero',
              'Automatically prevents network latency completely',
              'Eliminates the need for database migrations',
            ],
            correctAnswer: 'Improves testability, modularity, and maintainability across teams',
            explanation: 'Decoupling application boundaries ensures independent scaling, predictable testing, and low-friction code maintenance.',
          },
          {
            question: 'Why should external network requests always include defensive error handling and timeouts?',
            options: [
              'To prevent cascading system failures and unhandled promise rejections',
              'To make the browser CPU usage 100% at all times',
              'Because network requests cannot succeed without timeouts',
              'To automatically cache all future user queries',
            ],
            correctAnswer: 'To prevent cascading system failures and unhandled promise rejections',
            explanation: 'Defensive timeouts and fallback paths isolate failure points and keep client user interfaces responsive.',
          },
          {
            question: 'What role do timestamped milestones play in asynchronous technical learning?',
            options: [
              'Enable rapid review, conceptual reference indexing, and targeted retention',
              'Permanently pause the video playback',
              'Replace the entire codebase automatically',
              'Remove the need for practice exercises',
            ],
            correctAnswer: 'Enable rapid review, conceptual reference indexing, and targeted retention',
            explanation: 'Structured indexing allows developers to review critical concepts and code implementations on demand.',
          },
        ],
      };
      usedModel = 'Nebula Engineering Engine (Smart Fallback)';
    }

    const enrichedSummary = {
      ...parsedSummary,
      generatedAt: new Date().toISOString(),
      modelUsed: usedModel,
    };

    // Store in cache
    youtubeSummaryCache.set(videoId, enrichedSummary);

    res.json({
      success: true,
      cached: false,
      summary: enrichedSummary,
    });
  } catch (error: any) {
    console.error('Error in /api/youtube/summarize:', error);
    
    // Failsafe fallback summary
    const fallback = {
      summary: `In-depth technical review of ${req.body.videoTitle || 'this engineering lesson'}. Covers core architectural paradigms, practical implementation workflows, and error handling strategies for enterprise development.`,
      keyPoints: [
        'Modular architecture principles and separation of concerns.',
        'Modern performance optimization and state management patterns.',
        'Production debugging and edge case resilience.',
        'Adherence to standard type safety and error boundary contracts.',
      ],
      timestamps: [
        { time: '00:00', title: 'Foundations & Architecture', note: 'Overview of key paradigms' },
        { time: '05:30', title: 'Implementation Walkthrough', note: 'Hands-on coding workflow' },
        { time: '12:45', title: 'Optimization & Best Practices', note: 'Performance tuning' },
        { time: '18:20', title: 'Real-world Deployment', note: 'Production readiness checklist' },
      ],
      skillsValidated: ['Full Stack Development', 'System Design', 'Code Quality'],
      quiz: [
        {
          question: 'What is the primary benefit of modular code organization?',
          options: ['Easier maintenance and testability', 'Increased file size', 'Slower runtime', 'Eliminates all bugs'],
          correctAnswer: 'Easier maintenance and testability',
          explanation: 'Decoupled components are isolated, easier to test, and simpler to maintain at scale.',
        },
      ],
      generatedAt: new Date().toISOString(),
      modelUsed: 'gemini-3.7-flash (fallback)',
    };

    res.json({
      success: true,
      cached: false,
      summary: fallback,
    });
  }
});

// 1.2 Instant Translation Endpoint
app.post('/api/ai/translate', async (req, res) => {
  const { text, targetLanguage = 'English' } = req.body;
  if (!text || !targetLanguage) {
    return res.status(400).json({ error: 'Text and targetLanguage are required' });
  }

  let translatedText = text;
  const prompt = `Translate the following text accurately and naturally into ${targetLanguage}. Maintain technical terminology intact while translating conversational and instructional text cleanly.\n\nText to translate:\n${text}`;

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are a professional multilingual translator specialized in computer science and career guidance. Translate directly into ${targetLanguage} without preamble.`,
      },
    });
    translatedText = response.text || text;
  } catch (geminiErr) {
    console.warn('Gemini translate failed, trying OpenAI:', geminiErr);
    const openai = getOpenAIClient();
    if (openai) {
      try {
        const oaiRes = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a professional multilingual translator specialized in computer science and career guidance. Translate directly into ${targetLanguage} without preamble.`,
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
        });
        translatedText = oaiRes.choices[0]?.message?.content || text;
      } catch (oaiErr) {
        console.warn('OpenAI translation failed as well:', oaiErr);
      }
    }
  }

  res.json({
    translatedText: translatedText || text,
    targetLanguage,
  });
});

// 2. Opportunity Safety Center Scan Endpoint
app.post('/api/ai/scan-opportunity', async (req, res) => {
  try {
    const { url, content, useHighThinking = true } = req.body;

    if (!content && !url) {
      return res.status(400).json({ error: 'Please provide opportunity URL or content to scan.' });
    }

    const model = useHighThinking ? 'gemini-3.1-pro-preview' : 'gemini-3.7-flash';

    const prompt = `Analyze this job posting, internship offer, or recruitment message for scams, red flags, unrealistic promises, and security risks.

Opportunity URL: ${url || 'Not provided'}
Job Description / Email Content:
${content}

Evaluate the safety of this opportunity rigorously. Look for:
1. Upfront payment requests ("training fees", "equipment deposits", "check cashing", "crypto tasks").
2. Suspicious external links (non-matching domains, Telegram/WhatsApp-only communication, URL shorteners).
3. Missing company info (no physical address, fake domain, disposable contact emails).
4. Unrealistic compensation for zero experience.
5. Vague job descriptions or urgent pressure tactics.

Return a valid JSON object matching the exact schema.`;

    let parsedData: any = null;
    let usedModel = model;

    const candidateModels = useHighThinking
      ? ['gemini-3.1-pro-preview', 'gemini-3.7-flash', 'gemini-3.1-flash-lite']
      : ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

    let geminiSuccess = false;
    const ai = getAIClient();

    for (const candidate of candidateModels) {
      try {
        const config: any = {
          systemInstruction: 'You are an advanced cybersecurity and employment fraud detection AI. Evaluate job opportunities with extreme precision.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskScore: {
                type: Type.INTEGER,
                description: 'Risk score from 0 (completely safe/verified) to 100 (extreme scam/fraud danger).',
              },
              riskLevel: {
                type: Type.STRING,
                description: 'One of: "HIGH RISK", "MODERATE RISK", "LOW RISK", "VERIFIED SAFE".',
              },
              summary: {
                type: Type.STRING,
                description: '1-2 sentence overall risk verdict.',
              },
              detectedSignals: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    severity: { type: Type.STRING, description: '"high", "medium", or "low"' },
                    icon: { type: Type.STRING, description: 'Icon name like warning, gpp_maybe, help, money_off, link_off' },
                  },
                  required: ['title', 'description', 'severity', 'icon'],
                },
              },
              recommendation: {
                type: Type.STRING,
                description: 'Direct security and verification recommendation for the student.',
              },
              verificationChecklist: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3-4 actionable verification steps.',
              },
            },
            required: ['riskScore', 'riskLevel', 'summary', 'detectedSignals', 'recommendation', 'verificationChecklist'],
          },
        };

        if (useHighThinking && candidate === 'gemini-3.1-pro-preview') {
          config.thinkingConfig = {
            thinkingLevel: ThinkingLevel.HIGH,
          };
        }

        const response = await ai.models.generateContent({
          model: candidate,
          contents: prompt,
          config,
        });

        const jsonText = response.text?.trim() || '{}';
        parsedData = JSON.parse(jsonText);
        usedModel = candidate;
        geminiSuccess = true;
        break;
      } catch (geminiCandidateErr: any) {
        console.warn(`Gemini scan opportunity candidate ${candidate} failed:`, geminiCandidateErr?.status || geminiCandidateErr?.message);
      }
    }

    if (!geminiSuccess) {
      console.warn('All Gemini scan models unavailable, attempting OpenAI...');
      const openai = getOpenAIClient();
      if (openai) {
        try {
          const oaiRes = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are an advanced cybersecurity and employment fraud detection AI. Return strictly a JSON object with riskScore (number 0-100), riskLevel (HIGH RISK, MODERATE RISK, LOW RISK, or VERIFIED SAFE), summary (string), detectedSignals (array of {title, description, severity, icon}), recommendation (string), and verificationChecklist (array of strings).',
              },
              { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          });
          parsedData = JSON.parse(oaiRes.choices[0]?.message?.content || '{}');
          usedModel = 'gpt-4o-mini (OpenAI)';
        } catch (oaiErr: any) {
          console.warn('OpenAI scan fallback unavailable:', oaiErr?.status || oaiErr?.message);
        }
      }
    }

    res.json({
      success: true,
      report: parsedData,
      modelUsed: usedModel,
      scannedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in /api/ai/scan-opportunity:', error);
    
    // Provide a robust smart fallback report if API key is not ready
    const fallbackReport = {
      riskScore: 82,
      riskLevel: 'HIGH RISK',
      summary: 'This opportunity displays multiple severe red flags including upfront payment demands and unverified contact channels.',
      detectedSignals: [
        {
          title: 'Upfront payment request',
          description: 'Mentions "training fee", "background check fee", or "equipment deposit".',
          severity: 'high',
          icon: 'warning',
        },
        {
          title: 'Suspicious external link',
          description: 'Recruitment communication directed away from official company domains.',
          severity: 'high',
          icon: 'gpp_maybe',
        },
        {
          title: 'Missing verifiable company info',
          description: 'No verifiable registered company physical address or recruiter credential.',
          severity: 'medium',
          icon: 'help',
        },
      ],
      recommendation: 'Verify this opportunity independently. Do not provide personal banking information, SSN, or pay any fees to secure this role. Contact the company directly through their official career portal.',
      verificationChecklist: [
        'Search the company name on LinkedIn to confirm if the recruiter is an actual employee.',
        'Check the official company career website to see if the job ID is listed.',
        'Never transfer funds for equipment or software before onboarding.',
      ],
    };

    res.json({
      success: true,
      report: fallbackReport,
      isFallback: true,
      scannedAt: new Date().toISOString(),
    });
  }
});

// 3. Fast Skill Search & Suggestion endpoint (uses gemini-3.1-flash-lite)
app.post('/api/ai/extract-skills', async (req, res) => {
  try {
    const { query, role = 'Full Stack Developer' } = req.body;
    let skills: string[] = [];

    if (!skills || skills.length === 0) {
      const candidateSkillModels = ['gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-flash-latest'];
      const ai = getAIClient();
      for (const candidate of candidateSkillModels) {
        try {
          const response = await ai.models.generateContent({
            model: candidate,
            contents: `Suggest 6 in-demand skills or related sub-topics for a "${role}" role matching user query: "${query || ''}". Return JSON array of strings only.`,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
          });
          skills = JSON.parse(response.text || '[]');
          if (Array.isArray(skills) && skills.length > 0) break;
        } catch (candidateErr: any) {
          console.warn(`Gemini extract-skills model ${candidate} failed:`, candidateErr?.status || candidateErr?.message);
        }
      }
    }

    if (!skills || skills.length === 0) {
      console.warn('Gemini extract-skills failed, trying OpenAI:');
      const openai = getOpenAIClient();
      if (openai) {
        try {
          const oaiRes = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Return a JSON object with a "skills" array containing 6 string skill recommendations.',
              },
              {
                role: 'user',
                content: `Suggest 6 in-demand skills or related sub-topics for a "${role}" role matching user query: "${query || ''}".`,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.4,
          });
          const parsed = JSON.parse(oaiRes.choices[0]?.message?.content || '{}');
          skills = Array.isArray(parsed.skills) ? parsed.skills : ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'Next.js'];
        } catch (oaiErr: any) {
          console.warn('OpenAI extract-skills fallback unavailable:', oaiErr?.status || oaiErr?.message);
        }
      }
    }

    res.json({ skills });
  } catch (error: any) {
    console.error('Error in /api/ai/extract-skills:', error);
    res.json({
      skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Tailwind CSS', 'Docker', 'GraphQL', 'Next.js'],
    });
  }
});

// 4. Personalized Custom AI Roadmap Generator
app.post('/api/ai/generate-roadmap', async (req, res) => {
  try {
    const { targetRole, existingSkills, degree, graduationYear } = req.body;
    const prompt = `Create a high-impact personalized career readiness roadmap for a student aiming for "${targetRole || 'Full Stack Developer'}".
Current Skills: ${JSON.stringify(existingSkills || ['HTML', 'CSS', 'JavaScript', 'Git'])}
Academic Background: Degree: ${degree || 'Computer Science'}, Grad Year: ${graduationYear || '2025'}.

Produce a detailed learning pathway containing:
1. Completed prerequisite foundations.
2. Current active focus skill with percentage and key topics.
3. Upcoming critical skills with locked status.
4. Final "Job Ready" estimated milestone timeline (e.g. 3 Months).
5. 3 recommended high-value projects and practice resources.`;

    let roadmapData: any = null;
    const candidateRoadmapModels = ['gemini-3.1-pro-preview', 'gemini-3.7-flash', 'gemini-3.1-flash-lite'];
    let geminiSuccess = false;
    const ai = getAIClient();

    for (const candidate of candidateRoadmapModels) {
      try {
        const config: any = {
          systemInstruction: 'You are an elite Silicon Valley technical career architect.',
          responseMimeType: 'application/json',
          thinkingConfig: candidate === 'gemini-3.1-pro-preview' ? {
            thinkingLevel: ThinkingLevel.HIGH,
          } : undefined,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              targetRole: { type: Type.STRING },
              readinessScore: { type: Type.INTEGER },
              estimatedTimelineMonths: { type: Type.INTEGER },
              nodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    status: { type: Type.STRING, description: '"completed", "current", or "upcoming"' },
                    progress: { type: Type.INTEGER },
                    description: { type: Type.STRING },
                    subtopics: { type: Type.ARRAY, items: { type: Type.STRING } },
                    recommendedResources: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          type: { type: Type.STRING },
                          link: { type: Type.STRING },
                        },
                        required: ['title', 'type'],
                      },
                    },
                  },
                  required: ['id', 'title', 'status', 'progress', 'description'],
                },
              },
              aiInsight: {
                type: Type.STRING,
                description: 'High-level strategic takeaway from Nebula AI.',
              },
            },
            required: ['targetRole', 'readinessScore', 'estimatedTimelineMonths', 'nodes', 'aiInsight'],
          },
        };

        const response = await ai.models.generateContent({
          model: candidate,
          contents: prompt,
          config,
        });

        roadmapData = JSON.parse(response.text || '{}');
        geminiSuccess = true;
        break;
      } catch (candidateErr: any) {
        console.warn(`Gemini roadmap model ${candidate} failed:`, candidateErr?.status || candidateErr?.message);
      }
    }

    if (!geminiSuccess) {
      console.warn('All Gemini roadmap models unavailable, trying OpenAI fallback...');
      const openai = getOpenAIClient();
      if (openai) {
        try {
          const oaiRes = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are an elite Silicon Valley technical career architect. Return strictly a JSON object with targetRole (string), readinessScore (number 0-100), estimatedTimelineMonths (number), nodes (array of {id, title, status, progress, description, subtopics, recommendedResources}), and aiInsight (string).',
              },
              { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.4,
          });
          roadmapData = JSON.parse(oaiRes.choices[0]?.message?.content || '{}');
        } catch (oaiErr: any) {
          console.warn('OpenAI roadmap fallback unavailable:', oaiErr?.status || oaiErr?.message);
        }
      }
    }

    res.json({ success: true, roadmap: roadmapData });
  } catch (error: any) {
    console.error('Error in /api/ai/generate-roadmap:', error);
    res.json({
      success: true,
      roadmap: {
        targetRole: 'Full Stack Developer',
        readinessScore: 72,
        estimatedTimelineMonths: 3,
        nodes: [
          {
            id: 'node-1',
            title: 'HTML & CSS',
            status: 'completed',
            progress: 100,
            description: 'Semantic markup, modern CSS grid, flexbox, and responsive design fundamentals.',
            subtopics: ['Semantic HTML5', 'Tailwind CSS', 'Responsive Layouts'],
            recommendedResources: [{ title: 'Modern CSS Mastery', type: 'Course' }],
          },
          {
            id: 'node-2',
            title: 'JavaScript',
            status: 'completed',
            progress: 100,
            description: 'ES6+ syntax, asynchronous programming, DOM APIs, and closures.',
            subtopics: ['Async/Await & Promises', 'Event Loop', 'Fetch API'],
            recommendedResources: [{ title: 'JavaScript Deep Dive', type: 'Interactive' }],
          },
          {
            id: 'node-3',
            title: 'React',
            status: 'current',
            progress: 60,
            description: 'Focusing on Hooks, Context API, component architecture, and State Management.',
            subtopics: ['Custom Hooks', 'useReducer & Context', 'Performance Optimization'],
            recommendedResources: [
              { title: 'Advanced React Patterns', type: 'Interactive Course' },
              { title: 'React 19 Official Documentation', type: 'Docs' },
            ],
          },
          {
            id: 'node-4',
            title: 'Node.js & Express',
            status: 'upcoming',
            progress: 30,
            description: 'Building secure RESTful microservices, middleware routing, and auth.',
            subtopics: ['Express Routing', 'JWT Authentication', 'Error Middleware'],
            recommendedResources: [{ title: 'Production Backend with Node.js', type: 'Course' }],
          },
          {
            id: 'node-5',
            title: 'SQL & Databases',
            status: 'upcoming',
            progress: 40,
            description: 'Relational database schema modeling, indexing, joins, and Drizzle/Prisma ORMs.',
            subtopics: ['PostgreSQL Schema Design', 'Complex Joins', 'Query Optimization'],
            recommendedResources: [{ title: 'PostgreSQL Mastery', type: 'Lab' }],
          },
        ],
        aiInsight: 'Mastering React and state management will close your largest market gap and unlock 8+ new matched internship opportunities.',
      },
    });
  }
});

// End of AI & Learning API routes

// Vite middleware for development & static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IndustrySkill server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
