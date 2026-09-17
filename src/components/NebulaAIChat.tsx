import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { apiFetch } from '../services/api';
import { ViewType, UserProfile, ChatMessage } from '../types';
import { NEBULA_LOGO_URL } from '../data/mockData';
import { ChatSessionMeta, ChatFolder, DEFAULT_CHAT_FOLDERS } from './chat/chatTypes';
import { ChatSidebar } from './chat/ChatSidebar';
import { ChatMessageItem } from './chat/ChatMessageItem';
import { ChatInputDock } from './chat/ChatInputDock';
import { ChatWelcomeScreen } from './chat/ChatWelcomeScreen';

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

const isValidUuid = (val: unknown): val is string => {
  return (
    typeof val === 'string' &&
    val !== 'undefined' &&
    val !== 'null' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val)
  );
};

export const NebulaAIChat: React.FC<NebulaAIChatProps> = ({ user, onNavigate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSessionMeta[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [chatError, setChatError] = useState('');
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
  const [langSearch, setLangSearch] = useState('');

  // ChatGPT-style sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Folders state (persisted locally)
  const [folders, setFolders] = useState<ChatFolder[]>(() => {
    try {
      const stored = localStorage.getItem(`nebula_folders_${user.id || 'guest'}`);
      return stored ? JSON.parse(stored) : DEFAULT_CHAT_FOLDERS;
    } catch {
      return DEFAULT_CHAT_FOLDERS;
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Restore chat messages for a specific session
  const restoreHistory = useCallback(async (id: string) => {
    if (!id) {
      setMessages([]);
      return;
    }

    // If ID is not a valid UUID, don't query Supabase (prevents Postgres "invalid input syntax for type uuid" error)
    if (!isValidUuid(id)) {
      try {
        const localStored = localStorage.getItem(`nebula_messages_${id}`);
        if (localStored) {
          setMessages(JSON.parse(localStored));
          return;
        }
      } catch {}
      return;
    }

    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('id,role,content,model_used,thinking_mode_active,language,created_at')
        .eq('session_id', id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.warn('Supabase restoreHistory error, checking local storage:', error.message);
        const localStored = localStorage.getItem(`nebula_messages_${id}`);
        if (localStored) {
          setMessages(JSON.parse(localStored));
        }
        return;
      }

      if (data && data.length > 0) {
        const parsed = data.reverse().map((row) => ({
          id: row.id,
          role: (row.role === 'user' ? 'user' : 'model') as 'user' | 'model',
          content: row.content,
          timestamp: new Date(row.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          modelUsed: row.model_used,
          thinkingModeActive: row.thinking_mode_active,
          language: row.language,
        }));
        setMessages(parsed);
        try {
          localStorage.setItem(`nebula_messages_${id}`, JSON.stringify(parsed));
        } catch {}
      } else {
        const localStored = localStorage.getItem(`nebula_messages_${id}`);
        if (localStored) {
          setMessages(JSON.parse(localStored));
        } else {
          setMessages([]);
        }
      }
    } catch (err: any) {
      console.warn('Error restoring chat history:', err);
      try {
        const localStored = localStorage.getItem(`nebula_messages_${id}`);
        if (localStored) {
          setMessages(JSON.parse(localStored));
        }
      } catch {}
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Fetch all chat sessions for previous chat list
  const fetchSessions = useCallback(async (autoSelectLatest = false) => {
    try {
      let remoteSessions: ChatSessionMeta[] = [];

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (userId && isValidUuid(userId)) {
          const { data, error } = await supabase
            .from('ai_chat_sessions')
            .select('id, title, mode, created_at, updated_at')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

          if (!error && Array.isArray(data)) {
            const folderMap = JSON.parse(
              localStorage.getItem(`nebula_folder_map_${user.id || 'guest'}`) || '{}'
            );
            const starredMap = JSON.parse(
              localStorage.getItem(`nebula_starred_${user.id || 'guest'}`) || '{}'
            );

            remoteSessions = data.map((d: any) => ({
              id: d.id,
              title: d.title || 'Conversation',
              mode: d.mode,
              created_at: d.created_at,
              updated_at: d.updated_at,
              folderId: folderMap[d.id] || null,
              isStarred: !!starredMap[d.id],
            }));
          }
        }
      } catch (authErr) {
        console.warn('Supabase auth/session fetch skipped:', authErr);
      }

      // Merge with local sessions
      let localSessions: ChatSessionMeta[] = [];
      try {
        const stored = localStorage.getItem(`nebula_sessions_${user.id || 'guest'}`);
        if (stored) {
          localSessions = JSON.parse(stored);
        }
      } catch {}

      const sessionMap = new Map<string, ChatSessionMeta>();
      for (const s of localSessions) {
        if (s.id) sessionMap.set(s.id, s);
      }
      for (const s of remoteSessions) {
        if (s.id) sessionMap.set(s.id, s);
      }

      const allSessions = Array.from(sessionMap.values()).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setSessions(allSessions);

      if (autoSelectLatest && allSessions.length > 0) {
        setSessionId(allSessions[0].id);
        await restoreHistory(allSessions[0].id);
      }
    } catch (err: any) {
      console.warn('Could not load chat sessions:', err);
    }
  }, [user.id, restoreHistory]);

  // Initial load on mount
  useEffect(() => {
    let active = true;
    (async () => {
      if (active) {
        await fetchSessions(true);
      }
    })();
    return () => {
      active = false;
      abortControllerRef.current?.abort();
    };
  }, [fetchSessions]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, isLoading]);

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Web Speech API for voice input
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
      alert('Speech Recognition is not supported in this browser. Please try Chrome or Edge.');
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

  // Send message using backend endpoint
  const handleSendMessage = async (textToSend?: string | unknown) => {
    const rawText = typeof textToSend === 'string' ? textToSend : inputMessage;
    const text = (typeof rawText === 'string' ? rawText : '').trim();
    if (!text || isLoading || historyLoading) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
    }

    setChatError('');
    setIsLoading(true);
    setInputMessage('');

    // Ensure we have a valid UUID for the session
    const currentSessionId =
      sessionId && isValidUuid(sessionId)
        ? sessionId
        : (typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : '10000000-1000-4000-8000-100000000000');

    setSessionId(currentSessionId);

    // Optimistically show user message immediately
    const tempUserMsgId = `temp-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: tempUserMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: activeMode,
      language: selectedLanguage,
    };

    const updatedMessagesWithUser = [...messages, userMsg];
    setMessages(updatedMessagesWithUser);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Check if user is authenticated with a valid UUID in Supabase
    let authUserId: string | null = null;
    try {
      const { data: authData } = await supabase.auth.getSession();
      if (authData?.session?.user?.id && isValidUuid(authData.session.user.id)) {
        authUserId = authData.session.user.id;
      }
    } catch {}

    const sessionTitle = text.length > 55 ? text.slice(0, 52) + '...' : text;

    // Persist user message to Supabase asynchronously if logged in
    if (authUserId) {
      (async () => {
        try {
          await supabase.from('ai_chat_sessions').upsert(
            {
              id: currentSessionId,
              user_id: authUserId,
              title: sessionTitle,
              mode: activeMode,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );

          await supabase.from('ai_chat_messages').insert({
            session_id: currentSessionId,
            user_id: authUserId,
            role: 'user',
            content: text,
            model_used: 'user',
            language: selectedLanguage,
          });
        } catch (dbErr) {
          console.warn('Supabase user message save error:', dbErr);
        }
      })();
    }

    try {
      const response = await apiFetch('/api/ai/chat', {
        method: 'POST',
        signal: controller.signal,
        body: JSON.stringify({
          message: text,
          sessionId: currentSessionId,
          mode: activeMode,
          language: selectedLanguage,
          thinkingMode: isThinkingMode,
          history: messages
            .filter((m) => !m.id.startsWith('msg-init') && !m.id.startsWith('temp-'))
            .slice(-12)
            .map((m) => ({
              role: m.role === 'model' ? 'assistant' : 'user',
              content: m.content,
            })),
        }),
      });

      const data = await response.json();
      const replyContent =
        data.reply || data.content || 'I have analyzed your query and prepared guidance.';
      const modelUsed = data.modelUsed || data.model || 'Nebula AI';

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'model',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        modelUsed,
        thinkingModeActive: isThinkingMode,
        language: selectedLanguage,
        mode: activeMode,
      };

      const finalMessages = [
        ...updatedMessagesWithUser.map((m) =>
          m.id === tempUserMsgId ? { ...m, id: `user-${Date.now()}` } : m
        ),
        assistantMsg,
      ];
      setMessages(finalMessages);

      // Save to local cache
      try {
        localStorage.setItem(`nebula_messages_${currentSessionId}`, JSON.stringify(finalMessages));
        const storedSessions: ChatSessionMeta[] = JSON.parse(
          localStorage.getItem(`nebula_sessions_${user.id || 'guest'}`) || '[]'
        );
        const existingIdx = storedSessions.findIndex((s) => s.id === currentSessionId);
        const metaItem: ChatSessionMeta = {
          id: currentSessionId,
          title: sessionTitle,
          mode: activeMode,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          folderId: null,
          isStarred: false,
        };
        if (existingIdx >= 0) {
          storedSessions[existingIdx].updated_at = new Date().toISOString();
        } else {
          storedSessions.unshift(metaItem);
        }
        localStorage.setItem(
          `nebula_sessions_${user.id || 'guest'}`,
          JSON.stringify(storedSessions.slice(0, 50))
        );
      } catch (storageErr) {
        console.warn('Local session storage save error:', storageErr);
      }

      // Persist assistant message to Supabase asynchronously if logged in
      if (authUserId) {
        (async () => {
          try {
            await supabase.from('ai_chat_messages').insert({
              session_id: currentSessionId,
              user_id: authUserId,
              role: 'assistant',
              content: replyContent,
              model_used: modelUsed,
              language: selectedLanguage,
            });
            await supabase
              .from('ai_chat_sessions')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', currentSessionId);
          } catch (dbErr) {
            console.warn('Supabase assistant message save error:', dbErr);
          }
        })();
      }

      // Refresh sidebar list
      fetchSessions(false);
    } catch (error: any) {
      setInputMessage(text);
      setChatError(
        controller.signal.aborted
          ? 'Request stopped.'
          : error.message || 'Unable to send message. Please try again.'
      );
    } finally {
      setIsLoading(false);
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
  const handleTranslateMessage = async (msgId: string, text: string) => {
    const targetLang = selectedLanguage === 'auto' ? 'English' : selectedLanguage;
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isTranslating: true } : m))
    );

    try {
      const res = await apiFetch('/api/ai/translate', {
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
    const markdownContent =
      `# Nebula AI Chat Session - ${new Date().toLocaleDateString()}\nUser: ${user.name} (${user.targetRole})\n\n` +
      messages
        .map(
          (m) =>
            `### ${m.role === 'user' ? '👤 ' + user.name : '🤖 Nebula AI'} (${m.timestamp})\n${m.content}\n`
        )
        .join('\n---\n\n');

    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nebula-AI-Chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear current active chat
  const handleClearChat = async () => {
    if (isLoading || historyLoading || !confirm('Clear current chat messages?')) return;
    try {
      if (sessionId) {
        if (isValidUuid(sessionId)) {
          await supabase.from('ai_chat_sessions').delete().eq('id', sessionId);
        }
        localStorage.removeItem(`nebula_messages_${sessionId}`);
      }
      setSessionId(null);
      setMessages([]);
      setChatError('');
      fetchSessions(false);
    } catch {
      setSessionId(null);
      setMessages([]);
      setChatError('');
    }
  };

  // Start a new chat
  const handleNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setInputMessage('');
    setChatError('');
  };

  // Select a session from the previous chat list
  const handleSelectSession = async (id: string) => {
    if (id === sessionId) return;
    setSessionId(id);
    setChatError('');
    await restoreHistory(id);
  };

  // Rename a session (persisting via existing Supabase table and local storage)
  const handleRenameSession = async (id: string, newTitle: string) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s)));
    try {
      if (isValidUuid(id)) {
        await supabase.from('ai_chat_sessions').update({ title: newTitle }).eq('id', id);
      }
      const stored = localStorage.getItem(`nebula_sessions_${user.id || 'guest'}`);
      if (stored) {
        const list: ChatSessionMeta[] = JSON.parse(stored);
        const updated = list.map((s) => (s.id === id ? { ...s, title: newTitle } : s));
        localStorage.setItem(`nebula_sessions_${user.id || 'guest'}`, JSON.stringify(updated));
      }
    } catch (err) {
      console.warn('Failed to update title in Supabase:', err);
    }
  };

  // Delete a session
  const handleDeleteSession = async (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    try {
      if (isValidUuid(id)) {
        await supabase.from('ai_chat_sessions').delete().eq('id', id);
      }
      localStorage.removeItem(`nebula_messages_${id}`);
      const stored = localStorage.getItem(`nebula_sessions_${user.id || 'guest'}`);
      if (stored) {
        const list: ChatSessionMeta[] = JSON.parse(stored);
        const updated = list.filter((s) => s.id !== id);
        localStorage.setItem(`nebula_sessions_${user.id || 'guest'}`, JSON.stringify(updated));
      }
    } catch (err) {
      console.warn('Failed to delete session in Supabase:', err);
    }
    if (sessionId === id) {
      handleNewChat();
    }
  };

  // Move a session to a folder (stored in localStorage)
  const handleMoveToFolder = (sId: string, folderId: string | null) => {
    setSessions((prev) => prev.map((s) => (s.id === sId ? { ...s, folderId } : s)));
    try {
      const currentMap = JSON.parse(
        localStorage.getItem(`nebula_folder_map_${user.id || 'guest'}`) || '{}'
      );
      if (folderId) {
        currentMap[sId] = folderId;
      } else {
        delete currentMap[sId];
      }
      localStorage.setItem(`nebula_folder_map_${user.id || 'guest'}`, JSON.stringify(currentMap));
    } catch (err) {
      console.warn('Error saving folder mapping:', err);
    }
  };

  // Star / Pin a session
  const handleToggleStar = (sId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sId ? { ...s, isStarred: !s.isStarred } : s))
    );
    try {
      const currentStarred = JSON.parse(
        localStorage.getItem(`nebula_starred_${user.id || 'guest'}`) || '{}'
      );
      if (currentStarred[sId]) {
        delete currentStarred[sId];
      } else {
        currentStarred[sId] = true;
      }
      localStorage.setItem(`nebula_starred_${user.id || 'guest'}`, JSON.stringify(currentStarred));
    } catch (err) {
      console.warn('Error saving star mapping:', err);
    }
  };

  // Create a custom folder
  const handleCreateFolder = (name: string) => {
    const newFolder: ChatFolder = {
      id: `folder_${Date.now()}`,
      name,
      icon: 'folder',
      color: 'blue',
      isSystem: false,
    };
    const nextFolders = [...folders, newFolder];
    setFolders(nextFolders);
    localStorage.setItem(`nebula_folders_${user.id || 'guest'}`, JSON.stringify(nextFolders));
  };

  // Delete a folder
  const handleDeleteFolder = (folderId: string) => {
    const nextFolders = folders.filter((f) => f.id !== folderId);
    setFolders(nextFolders);
    localStorage.setItem(`nebula_folders_${user.id || 'guest'}`, JSON.stringify(nextFolders));
    setSessions((prev) =>
      prev.map((s) => (s.folderId === folderId ? { ...s, folderId: null } : s))
    );
    try {
      const currentMap = JSON.parse(
        localStorage.getItem(`nebula_folder_map_${user.id || 'guest'}`) || '{}'
      );
      Object.keys(currentMap).forEach((key) => {
        if (currentMap[key] === folderId) delete currentMap[key];
      });
      localStorage.setItem(`nebula_folder_map_${user.id || 'guest'}`, JSON.stringify(currentMap));
    } catch (err) {
      console.warn('Error cleaning up folder mapping:', err);
    }
  };

  // Insert code snippet into chat
  const handleInsertCode = () => {
    if (!codeSnippet.trim()) return;
    const formatted = `Here is my ${codeLanguage} code for review:\n\`\`\`${codeLanguage.toLowerCase()}\n${codeSnippet}\n\`\`\`\nCan you analyze this for bugs, performance optimizations, and best practices?`;
    handleSendMessage(formatted);
    setCodeSnippet('');
    setIsCodeModalOpen(false);
  };

  const selectedLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  const filteredLanguageList = SUPPORTED_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.native.toLowerCase().includes(langSearch.toLowerCase())
  );

  return (
    <main className="pt-16 sm:pt-20 pb-16 md:pb-0 h-[100dvh] w-full flex overflow-hidden bg-slate-50 dark:bg-[#171717] text-slate-900 dark:text-slate-100 select-text">
      {/* 1. Left Sidebar: ChatGPT Style Previous Chats, Folders & New Chat Button */}
      <ChatSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        folders={folders}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
        onMoveToFolder={handleMoveToFolder}
        onToggleStar={handleToggleStar}
        user={user}
      />

      {/* 2. Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white dark:bg-[#212121] relative overflow-hidden">
        {/* Top Minimal Navigation Bar (ChatGPT Style) */}
        <header className="h-12 sm:h-14 px-3 sm:px-4 border-b border-slate-200/80 dark:border-[#2f2f2f] flex items-center justify-between gap-2 shrink-0 bg-white/95 dark:bg-[#212121]/95 backdrop-blur-md z-10">
          {/* Left: Sidebar Toggle & Model Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a2a2a] transition-colors cursor-pointer"
              title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isSidebarOpen ? 'dock_to_left' : 'menu'}
              </span>
            </button>

            {/* Model & Status Badge */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                <span>Nebula AI</span>
                <span className="text-slate-400 font-normal hidden sm:inline">•</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
                  3.7 Flash
                </span>
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Connected" />
            </div>
          </div>

          {/* Right: Actions (Language, Thinking, New Chat, Export, Clear) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Quick New Chat Button (visible on mobile / desktop) */}
            <button
              onClick={handleNewChat}
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a2a2a] transition-colors cursor-pointer"
              title="Start New Chat"
            >
              <span className="material-symbols-outlined text-[18px]">edit_square</span>
            </button>

            {/* Language Selector Dropdown */}
            <div className="relative" ref={langDropdownRef}>
              <button
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="px-2 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#2b2b2b] hover:bg-slate-200 dark:hover:bg-[#333333] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#383838] flex items-center gap-1 transition-all cursor-pointer"
                title="Select Language for Chatbot"
              >
                <span>{selectedLangObj.flag}</span>
                <span className="hidden md:inline max-w-[80px] truncate">{selectedLangObj.name}</span>
                <span className="material-symbols-outlined text-[14px]">
                  {isLangDropdownOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {isLangDropdownOpen && (
                <div className="fixed sm:absolute right-2 sm:right-0 top-14 sm:top-auto sm:mt-1.5 w-[calc(100vw-24px)] sm:w-72 max-w-xs bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#333333] p-2.5 z-50 animate-in fade-in max-h-72 overflow-y-auto">
                  <div className="p-1 pb-2 border-b border-slate-100 dark:border-[#2f2f2f] mb-1.5">
                    <input
                      type="text"
                      value={langSearch}
                      onChange={(e) => setLangSearch(e.target.value)}
                      placeholder="Search 28+ languages..."
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-[#282828] rounded-lg outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-0.5">
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
                            : 'hover:bg-slate-100 dark:hover:bg-[#2b2b2b] text-slate-700 dark:text-slate-300'
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

            {/* Export Chat */}
            <button
              onClick={handleExportChat}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2a2a2a] transition-colors cursor-pointer"
              title="Export Conversation as Markdown"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
            </button>

            {/* Clear Chat */}
            <button
              onClick={handleClearChat}
              className="p-1.5 rounded-xl text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
              title="Clear Active Chat"
            >
              <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
            </button>
          </div>
        </header>

        {/* 3. Central Chat Message Stream */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          <div className="max-w-3xl md:max-w-4xl mx-auto w-full space-y-6">
            {/* Empty State / Welcome Screen when no messages */}
            {messages.length === 0 ? (
              <ChatWelcomeScreen
                user={user}
                onSelectPrompt={(text) => handleSendMessage(text)}
                isLoading={isLoading}
              />
            ) : (
              messages.map((msg) => (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  isSpeaking={isSpeaking === msg.id}
                  onSpeak={handleSpeakText}
                  onTranslate={handleTranslateMessage}
                  onCopy={handleCopy}
                  isCopied={copiedId === msg.id}
                  selectedLanguage={selectedLangObj.name}
                />
              ))
            )}

            {/* Live Streaming Response Card */}
            {isLoading && (
              <div className="flex items-start gap-3 sm:gap-4 w-full animate-in fade-in">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full p-0.5 bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-xs shrink-0 mt-0.5">
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 border border-white/20 flex items-center justify-center">
                    <img
                      src={NEBULA_LOGO_URL}
                      alt="Nebula AI"
                      className="w-full h-full object-cover rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                      Nebula AI
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold animate-pulse">
                      <span className="material-symbols-outlined text-[14px] animate-spin">
                        progress_activity
                      </span>
                      Thinking...
                    </span>
                  </div>

                  {streamingText ? (
                    <div className="whitespace-pre-wrap font-sans text-sm sm:text-[15px] leading-relaxed break-words text-slate-800 dark:text-slate-200">
                      {streamingText}
                      <span className="inline-block w-1.5 h-4 bg-blue-600 ml-1 animate-pulse" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
                      <span className="ml-1">Synthesizing personalized response...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Banner */}
            {chatError && (
              <div
                role="alert"
                className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-center justify-between"
              >
                <span>{chatError}</span>
                <button
                  type="button"
                  onClick={() => setChatError('')}
                  className="font-bold px-2 py-0.5 text-xs hover:underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 4. Bottom Floating Input Dock (ChatGPT Style) */}
        <ChatInputDock
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          onSendMessage={() => handleSendMessage()}
          isLoading={isLoading}
          onStopGeneration={handleStopGeneration}
          isListening={isListening}
          onToggleVoice={toggleSpeechRecognition}
          onOpenCodeModal={() => setIsCodeModalOpen(true)}
          activeMode={activeMode}
          onChangeMode={setActiveMode}
          isThinkingMode={isThinkingMode}
          onToggleThinking={() => setIsThinkingMode(!isThinkingMode)}
          selectedLanguageName={selectedLangObj.name}
        />
      </div>

      {/* 5. Code Snippet Attachment Modal */}
      {isCodeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-3xl max-w-lg w-full p-4 sm:p-6 border border-slate-200 dark:border-[#333333] shadow-2xl space-y-3 sm:space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">
                  code_blocks
                </span>
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
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Programming Language
                </label>
                <select
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] rounded-xl text-xs text-slate-900 dark:text-white outline-none cursor-pointer"
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
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Paste Code / Error Stacktrace
                </label>
                <textarea
                  rows={5}
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  placeholder="Paste code or error stacktrace here..."
                  className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-[#383838] rounded-2xl text-slate-900 dark:text-slate-100 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCodeModalOpen(false)}
                className="px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2b2b2b] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertCode}
                disabled={!codeSnippet.trim()}
                className="px-4 sm:px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 cursor-pointer shadow-md"
              >
                Attach & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
