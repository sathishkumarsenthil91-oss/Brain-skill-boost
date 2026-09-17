import React, { useRef, useEffect } from 'react';
import { AIMode } from '../NebulaAIChat';

interface ChatInputDockProps {
  inputMessage: string;
  setInputMessage: (msg: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
  onStopGeneration: () => void;
  isListening: boolean;
  onToggleVoice: () => void;
  onOpenCodeModal: () => void;
  activeMode: AIMode;
  onChangeMode: (mode: AIMode) => void;
  isThinkingMode: boolean;
  onToggleThinking: () => void;
  selectedLanguageName: string;
}

export const ChatInputDock: React.FC<ChatInputDockProps> = ({
  inputMessage,
  setInputMessage,
  onSendMessage,
  isLoading,
  onStopGeneration,
  isListening,
  onToggleVoice,
  onOpenCodeModal,
  activeMode,
  onChangeMode,
  isThinkingMode,
  onToggleThinking,
  selectedLanguageName,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 160)}px`;
    }
  }, [inputMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && inputMessage.trim()) {
        onSendMessage();
      }
    }
  };

  const getModeLabel = (mode: AIMode) => {
    switch (mode) {
      case 'career':
        return 'Career & Skills';
      case 'code':
        return 'Live Code';
      case 'interview':
        return 'Mock Interview';
      case 'safety':
        return 'Offer Auditor';
      case 'bilingual':
        return 'Bilingual CS';
    }
  };

  return (
    <div className="w-full max-w-3xl md:max-w-4xl mx-auto px-3 sm:px-6 pb-3 sm:pb-4 pt-1">
      {/* Floating ChatGPT Capsule */}
      <div className="relative rounded-3xl bg-white dark:bg-[#212121] border border-slate-300 dark:border-[#383838] focus-within:border-slate-400 dark:focus-within:border-[#555555] shadow-lg dark:shadow-2xl transition-all p-2.5 sm:p-3 space-y-2">
        {/* Main Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening
              ? `Listening in ${selectedLanguageName}...`
              : `Ask Nebula AI anything (${selectedLanguageName})...`
          }
          className="w-full bg-transparent border-none outline-none resize-none px-2 text-sm sm:text-[15px] leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 max-h-40 min-h-[24px]"
        />

        {/* Bottom Action Row (ChatGPT Style) */}
        <div className="flex items-center justify-between gap-1 pt-1">
          {/* Left Controls: Attach Code, Voice, Mode, Thinking */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            {/* Attach Code Modal Trigger */}
            <button
              type="button"
              onClick={onOpenCodeModal}
              className="p-1.5 sm:p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#2b2b2b] transition-colors cursor-pointer flex items-center gap-1"
              title="Attach Code Snippet for Review"
            >
              <span className="material-symbols-outlined text-[19px]">code_blocks</span>
            </button>

            {/* Voice Input Button */}
            <button
              type="button"
              onClick={onToggleVoice}
              className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2b2b2b]'
              }`}
              title={isListening ? 'Stop Voice Input' : `Voice Input (${selectedLanguageName})`}
            >
              <span className="material-symbols-outlined text-[19px]">
                {isListening ? 'mic' : 'mic_none'}
              </span>
            </button>

            {/* Quick Mode Switcher Dropdown */}
            <div className="relative group">
              <select
                value={activeMode}
                onChange={(e) => onChangeMode(e.target.value as AIMode)}
                className="appearance-none bg-slate-100 dark:bg-[#2b2b2b] hover:bg-slate-200 dark:hover:bg-[#333333] text-slate-700 dark:text-slate-300 text-[11px] font-semibold py-1 pl-2.5 pr-6 rounded-xl border border-slate-200 dark:border-[#383838] outline-none cursor-pointer"
                title="Specialization Mode"
              >
                <option value="career">🎓 Career & Skills</option>
                <option value="code">💻 Live Code</option>
                <option value="interview">🎙️ Mock Interview</option>
                <option value="safety">🛡️ Offer Auditor</option>
                <option value="bilingual">🌐 Bilingual CS</option>
              </select>
              <span className="material-symbols-outlined text-[14px] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                unfold_more
              </span>
            </div>

            {/* Deep Reasoning / Thinking Mode Pill */}
            <button
              type="button"
              onClick={onToggleThinking}
              className={`px-2 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
                isThinkingMode
                  ? 'bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                  : 'bg-transparent text-slate-400 dark:text-slate-500 border-slate-200 dark:border-[#333333] hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Toggle Gemini Thinking Mode"
            >
              <span className="material-symbols-outlined text-[14px]">psychology</span>
              <span className="hidden sm:inline">{isThinkingMode ? 'Reasoning' : 'Fast'}</span>
            </button>
          </div>

          {/* Right Controls: Send / Stop Generation */}
          <div className="flex items-center gap-1 shrink-0">
            {isLoading ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center cursor-pointer shadow-md hover:opacity-90 transition-transform active:scale-95"
                title="Stop Generating"
              >
                <span className="material-symbols-outlined text-[18px]">stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSendMessage()}
                disabled={!inputMessage.trim()}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-all active:scale-95 ${
                  inputMessage.trim()
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'
                    : 'bg-slate-200 dark:bg-[#333333] text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                }`}
                title="Send Message (Enter)"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ChatGPT Disclaimer */}
      <p className="text-center text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 mt-2">
        Nebula AI can make mistakes. Verify important career, technical, and offer details.
      </p>
    </div>
  );
};
