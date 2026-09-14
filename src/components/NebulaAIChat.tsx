import React, { useState, useRef, useEffect } from 'react';
import { ViewType, UserProfile, ChatMessage } from '../types';
import { NEBULA_LOGO_URL } from '../data/mockData';
import { loadUserTracks } from '../services/youtubeLearningService';

interface NebulaAIChatProps {
  user: UserProfile;
  onNavigate: (view: ViewType) => void;
}

export type AIMode = 'career' | 'code' | 'interview' | 'safety' | 'bilingual';

export interface LanguageOption {
  code: string;
  name: string;
  native: string;
  flag: string;
  speechCode: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'auto', name: 'Auto-Detect', native: 'Automatic', flag: '🌐', speechCode: 'en-US' },
  { code: 'English', name: 'English', native: 'English', flag: '🇺🇸', speechCode: 'en-US' },
  { code: 'Spanish', name: 'Spanish', native: 'Español', flag: '🇪🇸', speechCode: 'es-ES' },
  { code: 'Hindi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳', speechCode: 'hi-IN' },
  { code: 'Tamil', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳', speechCode: 'ta-IN' },
  { code: 'Telugu', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳', speechCode: 'te-IN' },
  { code: 'Bengali', name: 'Bengali', native: 'বাংলা', flag: '🇮🇳', speechCode: 'bn-IN' },
  { code: 'Marathi', name: 'Marathi', native: 'मराठी', flag: '🇮🇳', speechCode: 'mr-IN' },
  { code: 'Gujarati', name: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳', speechCode: 'gu-IN' },
  { code: 'Kannada', name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳', speechCode: 'kn-IN' },
  { code: 'Malayalam', name: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳', speechCode: 'ml-IN' },
  { code: 'French', name: 'French', native: 'Français', flag: '🇫🇷', speechCode: 'fr-FR' },
  { code: 'German', name: 'German', native: 'Deutsch', flag: '🇩🇪', speechCode: 'de-DE' },
  { code: 'Chinese (Simplified)', name: 'Chinese', native: '简体中文', flag: '🇨🇳', speechCode: 'zh-CN' },
  { code: 'Japanese', name: 'Japanese', native: '日本語', flag: '🇯🇵', speechCode: 'ja-JP' },
  { code: 'Korean', name: 'Korean', native: '한국어', flag: '🇰🇷', speechCode: 'ko-KR' },
  { code: 'Arabic', name: 'Arabic', native: 'العربية', flag: '🇸🇦', speechCode: 'ar-SA' },
  { code: 'Portuguese', name: 'Portuguese', native: 'Português', flag: '🇧🇷', speechCode: 'pt-BR' },
  { code: 'Russian', name: 'Russian', native: 'Русский', flag: '🇷🇺', speechCode: 'ru-RU' },
  { code: 'Italian', name: 'Italian', native: 'Italiano', flag: '🇮🇹', speechCode: 'it-IT' },
  { code: 'Vietnamese', name: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳', speechCode: 'vi-VN' },
  { code: 'Indonesian', name: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩', speechCode: 'id-ID' },
  { code: 'Turkish', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷', speechCode: 'tr-TR' },
  { code: 'Urdu', name: 'Urdu', native: 'اردو', flag: '🇵🇰', speechCode: 'ur-PK' },
  { code: 'Thai', name: 'Thai', native: 'ไทย', flag: '🇹🇭', speechCode: 'th-TH' },
  { code: 'Dutch', name: 'Dutch', native: 'Nederlands', flag: '🇳🇱', speechCode: 'nl-NL' },
  { code: 'Polish', name: 'Polish', native: 'Polski', flag: '🇵🇱', speechCode: 'pl-PL' },
];

function renderInlineFormatting(text: string) {
  const segments = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return segments.map((seg, i) => {
    if (seg.startsWith('`') && seg.endsWith('`') && seg.length > 2) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono text-[11px] font-semibold border border-slate-200 dark:border-slate-700">
          {seg.slice(1, -1)}
        </code>
      );
    }
    if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4) {
      return (
        <strong key={i} className="font-bold text-slate-900 dark:text-white">
          {seg.slice(2, -2)}
        </strong>
      );
    }
    return seg;
  });
}

const FormattedMessage: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  if (isUser) {
    return <div className="whitespace-pre-wrap font-sans leading-relaxed text-xs sm:text-sm break-words">{content}</div>;
  }

  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-xs sm:text-sm font-sans leading-relaxed text-slate-800 dark:text-slate-200 break-words">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
          const lang = match ? match[1] || 'code' : 'code';
          const code = match ? match[2].trim() : part.slice(3, -3).trim();
          return (
            <div key={index} className="my-2 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-950 text-slate-100 text-xs font-mono shadow-md">
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 font-semibold">
                <span className="uppercase tracking-wider text-blue-400">{lang}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                  }}
                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                  title="Copy Code"
                >
                  <span className="material-symbols-outlined text-[13px]">content_copy</span>
                  <span>Copy Code</span>
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-[11px] sm:text-xs leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        const lines = part.split('\n');
        return (
          <div key={index} className="space-y-1">
            {lines.map((line, lIdx) => {
              if (!line.trim()) return <div key={lIdx} className="h-1.5" />;

              if (line.startsWith('### ')) {
                return (
                  <h3 key={lIdx} className="text-sm font-bold text-slate-900 dark:text-white pt-1">
                    {line.slice(4)}
                  </h3>
                );
              }
              if (line.startsWith('## ')) {
                return (
                  <h2 key={lIdx} className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white pt-1.5">
                    {line.slice(3)}
                  </h2>
                );
              }
              if (line.startsWith('# ')) {
                return (
                  <h1 key={lIdx} className="text-base font-black text-slate-900 dark:text-white pt-2">
                    {line.slice(2)}
                  </h1>
                );
              }

              if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
                const bulletText = line.replace(/^[•\-*]\s+/, '');
                return (
                  <div key={lIdx} className="flex items-start gap-1.5 pl-1 text-slate-800 dark:text-slate-200">
                    <span className="text-blue-500 font-bold leading-none mt-1 text-[10px]">•</span>
                    <span>{renderInlineFormatting(bulletText)}</span>
                  </div>
                );
              }

              return (
                <p key={lIdx} className="leading-relaxed">
                  {renderInlineFormatting(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export const NebulaAIChat: React.FC<NebulaAIChatProps> = ({ user, onNavigate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      role: 'model',
      content: `👋 **Welcome to Nebula AI**, your real-time multilingual career mentor & technical intelligence advisor!

I have loaded your profile for **${user.targetRole}** with an active readiness index of **${user.overallReadiness}%**.

✨ **What I can do for you in 28+ languages:**
• **Real-Time Career Guidance**: Analyze skill gaps, build 30-day roadmaps, and recommend high-impact projects.
• **Live Code & Debugging**: Write, review, and debug clean code with explanations in your native language.
• **Interactive Mock Interviews**: Drill real technical & behavioral questions with instant scoring.
• **Job Offer & Scam Auditor**: Audit suspicious emails and recruitment messages.
• **Voice Conversations**: Click the 🎙️ **Mic button** to speak in any language or 🔊 **Speaker** to listen!

How can I help you today? Type below or pick a quick starter prompt!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.7-flash',
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  const [activeMode, setActiveMode] = useState<AIMode>('career');
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('TypeScript');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activePromptCategory, setActivePromptCategory] = useState<'all' | 'career' | 'code' | 'interview' | 'safety'>('all');
  const [langSearch, setLangSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, isLoading]);

  // Click outside to close language dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize Web Speech API for voice input
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);
      recognition.lang = currentLangObj?.speechCode || 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInputMessage(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
    }
  }, [selectedLanguage]);

  const toggleSpeechRecognition = () => {
    if (!speechRecognitionRef.current) {
      alert('Speech Recognition is not supported in this browser. Please try Google Chrome or Edge.');
      return;
    }

    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);
        speechRecognitionRef.current.lang = currentLangObj?.speechCode || 'en-US';
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Speech recognition start failed:', err);
      }
    }
  };

  // Text to Speech playback
  const handleSpeakText = (text: string, msgId: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.');
      return;
    }

    if (isSpeaking === msgId) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean markdown symbols for clearer speech
    const cleanText = text
      .replace(/[#*`_~]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/```[\s\S]*?```/g, 'Code block omitted.');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);
    if (currentLangObj && currentLangObj.code !== 'auto') {
      utterance.lang = currentLangObj.speechCode;
    }

    utterance.onend = () => setIsSpeaking(null);
    utterance.onerror = () => setIsSpeaking(null);

    setIsSpeaking(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Real-Time Streaming Message Sender
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    // Stop ongoing speech
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: selectedLanguage,
      mode: activeMode,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);
    setStreamingText('');

    abortControllerRef.current = new AbortController();

    try {
      const savedLearningTracks = loadUserTracks(user.email || 'default');
      // Attempt Server-Sent Events (SSE) streaming
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.slice(-8),
          thinkingMode: isThinkingMode,
          language: selectedLanguage,
          mode: activeMode,
          userProfile: user,
          learningTracksContext: savedLearningTracks,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Streaming failed or not supported, falling back to standard JSON API');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let sseBuffer = '';
      let detectedModel = isThinkingMode ? 'gemini-3.1-pro-preview' : 'gemini-3.7-flash';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.chunk) {
                accumulatedText += data.chunk;
                setStreamingText(accumulatedText);
              }
              if (data.modelUsed) {
                detectedModel = data.modelUsed;
              }
            } catch (e) {
              // Ignore partial JSON
            }
          }
        }
      }

      // Process any remaining bytes in buffer
      if (sseBuffer.trim().startsWith('data: ')) {
        try {
          const data = JSON.parse(sseBuffer.trim().slice(6));
          if (data.chunk) {
            accumulatedText += data.chunk;
          }
          if (data.modelUsed) {
            detectedModel = data.modelUsed;
          }
        } catch (e) {
          // Ignore
        }
      }

      if (!accumulatedText.trim()) {
        throw new Error('Streaming yielded empty text, falling back to standard JSON API');
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'model',
        content: accumulatedText.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: detectedModel,
        thinkingModeActive: isThinkingMode,
        language: selectedLanguage,
        mode: activeMode,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setStreamingText('');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted by user');
        if (streamingText) {
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-aborted-${Date.now()}`,
              role: 'model',
              content: streamingText + '\n\n*(Response stopped by user)*',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      } else {
        console.warn('Falling back to standard chat API:', err);
        // Fallback to standard POST
        try {
          const fallbackRes = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: text.trim(),
              history: messages.slice(-6),
              thinkingMode: isThinkingMode,
              language: selectedLanguage,
              mode: activeMode,
              userProfile: user,
            }),
          });
          const data = await fallbackRes.json();
          const reply = data?.reply || data?.fallback || 'Nebula AI is ready to help you level up your technical career.';

          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              role: 'model',
              content: reply,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              modelUsed: data?.modelUsed || 'gemini-3.7-flash',
              thinkingModeActive: isThinkingMode,
            },
          ]);
        } catch (innerErr) {
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-err-${Date.now()}`,
              role: 'model',
              content: 'Nebula AI is operating smoothly. For your target role, focusing on closing your top skill gap with practical projects will give you the highest immediate ROI.',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      }
    } finally {
      setIsLoading(false);
      setStreamingText('');
      abortControllerRef.current = null;
    }
  };

  // Stop response generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Translate a specific message
  const handleTranslateMessage = async (msgId: string, text: string, targetLang: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isTranslating: true } : m))
    );

    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetLanguage: targetLang,
        }),
      });
      const data = await res.json();
      if (data.translatedText) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, translatedContent: data.translatedText, isTranslating: false }
              : m
          )
        );
      }
    } catch (err) {
      console.error('Translation error:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, isTranslating: false } : m))
      );
    }
  };

  // Copy message to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export full chat as Markdown
  const handleExportChat = () => {
    const markdownContent = `# Nebula AI Chat Session - ${new Date().toLocaleDateString()}\nUser: ${user.name} (${user.targetRole})\n\n` +
      messages.map((m) => `### ${m.role === 'user' ? '👤 ' + user.name : '🤖 Nebula AI'} (${m.timestamp})\n${m.content}\n`).join('\n---\n\n');

    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nebula-AI-Chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear chat history
  const handleClearChat = () => {
    if (confirm('Clear entire chat history and start a fresh session?')) {
      setMessages([
        {
          id: 'msg-init-reset',
          role: 'model',
          content: `Chat session refreshed! Ready for new questions for your **${user.targetRole}** journey.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  // Insert code snippet into message
  const handleInsertCode = () => {
    if (!codeSnippet.trim()) return;
    const formatted = `Here is my ${codeLanguage} code for review:\n\`\`\`${codeLanguage.toLowerCase()}\n${codeSnippet}\n\`\`\`\nCan you analyze this for bugs, performance optimizations, and best practices?`;
    handleSendMessage(formatted);
    setCodeSnippet('');
    setIsCodeModalOpen(false);
  };

  // Categorized Prompt Library
  const allPrompts = [
    { category: 'career', text: 'How do I master React Hooks, Custom Hooks & Context API in 2 weeks?' },
    { category: 'career', text: 'Create a tailored 30-day study plan to increase my readiness to 90%' },
    { category: 'code', text: 'Explain how Node.js Event Loop works with microtasks and macrotasks' },
    { category: 'code', text: 'Write a TypeScript debounce function with generic types and clear comments' },
    { category: 'interview', text: 'Start a mock technical interview for a Full-Stack Developer intern role' },
    { category: 'interview', text: 'Quiz me on PostgreSQL ACID properties, indexing, and EXPLAIN ANALYZE' },
    { category: 'safety', text: 'How do I identify fake job postings that ask for training fees or equipment checks?' },
    { category: 'safety', text: 'Audit this recruiter message: "Earn $80/hr remote data entry via Telegram"' },
  ];

  const filteredPrompts = activePromptCategory === 'all'
    ? allPrompts
    : allPrompts.filter((p) => p.category === activePromptCategory);

  const selectedLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  const filteredLanguageList = SUPPORTED_LANGUAGES.filter((l) =>
    l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.native.toLowerCase().includes(langSearch.toLowerCase())
  );

  return (
    <main className="pt-16 sm:pt-20 md:pt-24 pb-20 md:pb-6 px-2 sm:px-4 md:px-6 max-w-5xl mx-auto flex flex-col h-[100dvh] md:h-[calc(100vh-20px)] w-full overflow-hidden">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#151f38] rounded-2xl sm:rounded-3xl p-2 sm:p-4 md:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs sm:shadow-md mb-1.5 sm:mb-3 flex items-center justify-between gap-2 shrink-0">
        {/* Left: Avatar & Model Info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="relative w-8 h-8 sm:w-11 sm:h-11 rounded-full p-0.5 bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 shadow-xs shrink-0">
            <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 border border-white/20">
              <img
                src={NEBULA_LOGO_URL}
                alt="Nebula AI Logo"
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-base md:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                Nebula AI Chat
              </h1>
              <span className="px-1.5 py-0.2 sm:py-0.5 rounded-full text-[8px] sm:text-[10px] font-black bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                28+ Langs
              </span>
            </div>
            <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
              <span className="hidden sm:inline">Gemini 3.7 Flash •</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping" />
                Live
              </span>
            </p>
          </div>
        </div>

        {/* Right: Controls (Language Selector, Thinking Mode, Actions) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Language Selector Dropdown */}
          <div className="relative" ref={langDropdownRef}>
            <button
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-all cursor-pointer shadow-xs"
              title="Select Language for Chatbot"
            >
              <span className="text-xs sm:text-sm">{selectedLangObj.flag}</span>
              <span className="hidden xs:inline max-w-[50px] sm:max-w-[100px] truncate">{selectedLangObj.name}</span>
              <span className="material-symbols-outlined text-[13px] sm:text-[14px]">
                {isLangDropdownOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {isLangDropdownOpen && (
              <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-auto sm:mt-2 w-[calc(100vw-24px)] sm:w-72 max-w-xs bg-white dark:bg-[#11192e] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2.5 z-50 animate-in fade-in max-h-72 overflow-y-auto">
                <div className="p-1.5 pb-2 border-b border-slate-100 dark:border-slate-800 mb-1.5">
                  <input
                    type="text"
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    placeholder="Search 28+ languages..."
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  {filteredLanguageList.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setSelectedLanguage(lang.code);
                        setIsLangDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
                        selectedLanguage === lang.code
                          ? 'bg-blue-600 text-white font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </span>
                      <span className="text-[11px] opacity-70">{lang.native}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Deep Reasoning Thinking Mode Toggle */}
          <button
            onClick={() => setIsThinkingMode(!isThinkingMode)}
            className={`px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs border ${
              isThinkingMode
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500 shadow-purple-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
            title="Toggle Gemini Thinking Mode"
          >
            <span className="material-symbols-outlined text-[13px] sm:text-[16px]">psychology</span>
            <span className="hidden xs:inline">{isThinkingMode ? 'Thinking' : 'Fast'}</span>
          </button>

          {/* Export Chat */}
          <button
            onClick={handleExportChat}
            className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-xs"
            title="Export Chat as Markdown"
          >
            <span className="material-symbols-outlined text-[13px] sm:text-[16px]">download</span>
          </button>

          {/* Clear Chat */}
          <button
            onClick={handleClearChat}
            className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-xs"
            title="Clear Chat History"
          >
            <span className="material-symbols-outlined text-[13px] sm:text-[16px]">delete_sweep</span>
          </button>
        </div>
      </div>

      {/* Mode Specialization Switcher Bar */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 mb-1.5 sm:mb-2 scrollbar-none shrink-0">
        <button
          onClick={() => setActiveMode('career')}
          className={`px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeMode === 'career'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-[#151f38] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">school</span>
          Career & Skills
        </button>
        <button
          onClick={() => setActiveMode('code')}
          className={`px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeMode === 'code'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-[#151f38] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">code</span>
          Live Code
        </button>
        <button
          onClick={() => setActiveMode('interview')}
          className={`px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeMode === 'interview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-[#151f38] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">record_voice_over</span>
          Mock Interview
        </button>
        <button
          onClick={() => setActiveMode('safety')}
          className={`px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeMode === 'safety'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white dark:bg-[#151f38] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-rose-400'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">security</span>
          Offer Auditor
        </button>
        <button
          onClick={() => setActiveMode('bilingual')}
          className={`px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeMode === 'bilingual'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white dark:bg-[#151f38] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-purple-400'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">translate</span>
          Bilingual CS
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 sm:space-y-4 pr-1 mb-2 sm:mb-3 scroll-smooth touch-pan-y">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
            >
              <div
                className={`max-w-[94%] sm:max-w-[85%] md:max-w-[80%] rounded-2xl sm:rounded-3xl p-3 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-white dark:bg-[#151f38] text-slate-900 dark:text-slate-100 rounded-bl-xs border border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {/* AI Header with Badges and Audio Button */}
                {!isUser && (
                  <div className="flex items-center justify-between gap-1.5 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-xs shrink-0">
                        <img
                          src={NEBULA_LOGO_URL}
                          alt="Nebula"
                          className="w-full h-full object-cover rounded-full"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400">
                        Nebula
                      </span>
                      {msg.thinkingModeActive && (
                        <span className="text-[9px] sm:text-[10px] bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded-full font-bold border border-purple-200 dark:border-purple-800 shrink-0">
                          🧠 Reasoning
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                      {/* Audio Speak Aloud */}
                      <button
                        onClick={() => handleSpeakText(msg.translatedContent || msg.content, msg.id)}
                        className={`p-1 sm:p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          isSpeaking === msg.id
                            ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 animate-pulse'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                        title={isSpeaking === msg.id ? 'Stop Speaking' : 'Read Aloud'}
                      >
                        <span className="material-symbols-outlined text-[15px] sm:text-[16px]">
                          {isSpeaking === msg.id ? 'volume_off' : 'volume_up'}
                        </span>
                      </button>

                      {/* Quick Translate Button */}
                      <button
                        onClick={() => handleTranslateMessage(msg.id, msg.content, selectedLanguage === 'auto' ? 'English' : selectedLanguage)}
                        disabled={msg.isTranslating}
                        className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-xs transition-colors cursor-pointer"
                        title="Translate"
                      >
                        <span className="material-symbols-outlined text-[15px] sm:text-[16px]">
                          {msg.isTranslating ? 'sync' : 'translate'}
                        </span>
                      </button>

                      {/* Copy Message */}
                      <button
                        onClick={() => handleCopy(msg.translatedContent || msg.content, msg.id)}
                        className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-xs transition-colors cursor-pointer"
                        title="Copy message"
                      >
                        <span className="material-symbols-outlined text-[15px] sm:text-[16px]">
                          {copiedId === msg.id ? 'check' : 'content_copy'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Primary Content formatted */}
                <FormattedMessage content={msg.content} isUser={isUser} />

                {/* Optional Translated View */}
                {msg.translatedContent && (
                  <div className="mt-2.5 pt-2 border-t border-blue-200 dark:border-slate-700 bg-blue-50/50 dark:bg-slate-900/60 p-2 sm:p-3 rounded-xl sm:rounded-2xl">
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] sm:text-[14px]">translate</span>
                        Translated ({selectedLanguage})
                      </span>
                    </div>
                    <FormattedMessage content={msg.translatedContent} isUser={false} />
                  </div>
                )}

                {/* Timestamp */}
                <div
                  className={`text-[9px] sm:text-[10px] mt-1.5 flex items-center justify-end gap-1 ${
                    isUser ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {isUser && <span className="material-symbols-outlined text-[11px] sm:text-[12px]">done_all</span>}
                </div>
              </div>
            </div>
          );
        })}

        {/* Live Streaming Response Card */}
        {isLoading && (
          <div className="flex justify-start animate-in fade-in">
            <div className="max-w-[94%] sm:max-w-[85%] md:max-w-[80%] bg-white dark:bg-[#151f38] text-slate-900 dark:text-slate-100 rounded-2xl sm:rounded-3xl rounded-bl-xs p-3 sm:p-4 border border-blue-200 dark:border-blue-900/60 shadow-md space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 animate-spin text-[16px] shrink-0">
                    progress_activity
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 truncate">
                    Streaming...
                  </span>
                </div>
                <button
                  onClick={handleStopGeneration}
                  className="px-2 py-0.5 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-300 hover:bg-red-100 text-[11px] font-bold rounded-lg border border-red-200 dark:border-red-900 flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[13px]">stop_circle</span>
                  Stop
                </button>
              </div>

              {streamingText ? (
                <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed break-words">
                  {streamingText}
                  <span className="inline-block w-1.5 h-3.5 bg-blue-600 dark:bg-blue-400 ml-1 animate-pulse" />
                </div>
              ) : (
                <div className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1.5">
                  <span>Synthesizing response for {user.targetRole}...</span>
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Category Tabs & Chips */}
      <div className="space-y-1 sm:space-y-1.5 mb-1.5 sm:mb-2 shrink-0">
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {(['all', 'career', 'code', 'interview', 'safety'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActivePromptCategory(cat)}
              className={`px-2 sm:px-2.5 py-0.5 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-bold uppercase cursor-pointer transition-colors shrink-0 ${
                activePromptCategory === cat
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {filteredPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt.text)}
              disabled={isLoading}
              className="text-[11px] sm:text-xs whitespace-nowrap bg-white dark:bg-[#151f38] text-blue-600 dark:text-blue-400 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all cursor-pointer font-medium disabled:opacity-50 shadow-2xs shrink-0"
            >
              {prompt.text}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box & Action Toolbar */}
      <div className="relative bg-white dark:bg-[#151f38] rounded-2xl sm:rounded-3xl p-1.5 sm:p-2.5 border border-slate-200/90 dark:border-slate-800 shadow-md sm:shadow-lg flex flex-col gap-1 sm:gap-2 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Code Insert Button */}
          <button
            onClick={() => setIsCodeModalOpen(true)}
            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer shrink-0"
            title="Attach Code Snippet"
          >
            <span className="material-symbols-outlined text-[18px] sm:text-[20px]">code_blocks</span>
          </button>

          {/* Voice Input Button */}
          <button
            onClick={toggleSpeechRecognition}
            className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all cursor-pointer shrink-0 ${
              isListening
                ? 'bg-red-500 text-white animate-bounce shadow-md shadow-red-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600'
            }`}
            title={isListening ? 'Listening (Click to Stop)' : `Voice Input (${selectedLangObj.name})`}
          >
            <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
              {isListening ? 'mic' : 'mic_none'}
            </span>
          </button>

          {/* Text Input Area */}
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder={
              isListening
                ? `Listening in ${selectedLangObj.name}...`
                : `Ask Nebula AI (${selectedLangObj.name})...`
            }
            className="w-full bg-transparent border-none outline-none px-1.5 sm:px-2 py-1 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 min-w-0"
          />

          {/* Send Button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-md transition-transform active:scale-95"
            title="Send Message"
          >
            <span className="material-symbols-outlined text-[17px] sm:text-[20px]">send</span>
          </button>
        </div>
      </div>

      {/* Code Snippet Attachment Modal */}
      {isCodeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-[#11192e] rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3 sm:space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">code_blocks</span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Attach Code for Review
                </h3>
              </div>
              <button
                onClick={() => setIsCodeModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Programming Language
                </label>
                <select
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value)}
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                >
                  <option value="TypeScript">TypeScript</option>
                  <option value="JavaScript">JavaScript</option>
                  <option value="Python">Python</option>
                  <option value="SQL">PostgreSQL / SQL</option>
                  <option value="Java">Java</option>
                  <option value="CPP">C++</option>
                  <option value="Go">Go</option>
                  <option value="Rust">Rust</option>
                  <option value="HTML">HTML / CSS</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Paste Code / Error Stacktrace
                </label>
                <textarea
                  rows={5}
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  placeholder="Paste your code snippet or error trace here..."
                  className="w-full p-2.5 sm:p-3 font-mono text-xs bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl text-slate-900 dark:text-slate-100 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1 sm:pt-2">
              <button
                onClick={() => setIsCodeModalOpen(false)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleInsertCode}
                disabled={!codeSnippet.trim()}
                className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 cursor-pointer shadow-md"
              >
                Send Code to Nebula AI
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
