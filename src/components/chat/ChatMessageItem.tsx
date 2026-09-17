import React, { useState } from 'react';
import { ChatMessage } from '../../types';
import { NEBULA_LOGO_URL } from '../../data/mockData';

interface ChatMessageItemProps {
  message: ChatMessage;
  isSpeaking: boolean;
  onSpeak: (text: string, id: string) => void;
  onTranslate: (id: string, text: string) => void;
  onCopy: (text: string, id: string) => void;
  isCopied: boolean;
  selectedLanguage: string;
}

function renderInlineFormatting(text: string) {
  const segments = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return segments.map((seg, i) => {
    if (seg.startsWith('`') && seg.endsWith('`') && seg.length > 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-[#2b2b2b] text-blue-600 dark:text-blue-400 font-mono text-[11px] font-semibold border border-slate-300/60 dark:border-slate-700/60"
        >
          {seg.slice(1, -1)}
        </code>
      );
    }
    if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4) {
      return (
        <strong key={i} className="font-semibold text-slate-900 dark:text-white">
          {seg.slice(2, -2)}
        </strong>
      );
    }
    return seg;
  });
}

export const FormattedMessageBody: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  if (isUser) {
    return (
      <div className="whitespace-pre-wrap font-sans text-sm sm:text-[15px] leading-relaxed break-words">
        {content}
      </div>
    );
  }

  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 font-sans text-sm sm:text-[15px] leading-relaxed text-slate-800 dark:text-slate-200 break-words">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
          const lang = match ? match[1] || 'code' : 'code';
          const code = match ? match[2].trim() : part.slice(3, -3).trim();

          const handleCopyCode = () => {
            navigator.clipboard.writeText(code);
            setCopiedCodeIdx(index);
            setTimeout(() => setCopiedCodeIdx(null), 2000);
          };

          return (
            <div
              key={index}
              className="my-3 rounded-xl overflow-hidden border border-slate-700/60 bg-[#0d1117] text-slate-100 font-mono text-xs shadow-lg"
            >
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#161b22] border-b border-slate-800 text-[11px] text-slate-400 font-semibold select-none">
                <span className="uppercase tracking-wider text-blue-400 font-bold">{lang}</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-slate-300"
                  title="Copy Code"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {copiedCodeIdx === index ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedCodeIdx === index ? 'Copied' : 'Copy code'}</span>
                </button>
              </div>
              <pre className="p-3.5 sm:p-4 overflow-x-auto text-[11px] sm:text-xs leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        const lines = part.split('\n');
        return (
          <div key={index} className="space-y-1.5">
            {lines.map((line, lIdx) => {
              if (!line.trim()) return <div key={lIdx} className="h-2" />;

              if (line.startsWith('### ')) {
                return (
                  <h3 key={lIdx} className="text-base font-bold text-slate-900 dark:text-white pt-2 pb-0.5">
                    {line.slice(4)}
                  </h3>
                );
              }
              if (line.startsWith('## ')) {
                return (
                  <h2 key={lIdx} className="text-lg font-bold text-slate-900 dark:text-white pt-3 pb-1 border-b border-slate-100 dark:border-slate-800/80">
                    {line.slice(3)}
                  </h2>
                );
              }
              if (line.startsWith('# ')) {
                return (
                  <h1 key={lIdx} className="text-xl font-extrabold text-slate-900 dark:text-white pt-3 pb-1">
                    {line.slice(2)}
                  </h1>
                );
              }

              if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
                const bulletText = line.replace(/^[•\-*]\s+/, '');
                return (
                  <div key={lIdx} className="flex items-start gap-2.5 pl-1 text-slate-800 dark:text-slate-200">
                    <span className="text-blue-500 dark:text-blue-400 font-bold leading-none mt-1.5 text-xs">•</span>
                    <span className="leading-relaxed">{renderInlineFormatting(bulletText)}</span>
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

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isSpeaking,
  onSpeak,
  onTranslate,
  onCopy,
  isCopied,
  selectedLanguage,
}) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end w-full animate-in fade-in duration-200">
        <div className="max-w-[85%] sm:max-w-[75%] rounded-3xl rounded-br-lg px-4 py-2.5 bg-slate-100 dark:bg-[#2f2f2f] text-slate-900 dark:text-slate-100 border border-slate-200/70 dark:border-white/5 shadow-2xs">
          <FormattedMessageBody content={message.content} isUser={true} />
          <div className="text-[10px] mt-1 text-right text-slate-400 dark:text-slate-500 font-medium">
            {message.timestamp}
          </div>
        </div>
      </div>
    );
  }

  // Assistant message in ChatGPT style
  return (
    <div className="flex items-start gap-3 sm:gap-4 w-full animate-in fade-in duration-200 group">
      {/* Nebula AI Avatar */}
      <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full p-0.5 bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-600 shadow-xs shrink-0 mt-0.5">
        <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 border border-white/20 flex items-center justify-center">
          <img
            src={NEBULA_LOGO_URL}
            alt="Nebula AI"
            className="w-full h-full object-cover rounded-full"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Message Content & Action Toolbar */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header tags */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
            Nebula AI
          </span>
          {message.thinkingModeActive && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
              <span className="material-symbols-outlined text-[11px]">psychology</span>
              Reasoning
            </span>
          )}
          {message.modelUsed && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">
              {message.modelUsed}
            </span>
          )}
        </div>

        {/* Formatted body */}
        <FormattedMessageBody content={message.content} isUser={false} />

        {/* Translated Content (if present) */}
        {message.translatedContent && (
          <div className="mt-3 p-3 rounded-2xl bg-blue-50/60 dark:bg-slate-900/70 border border-blue-200/80 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 mb-1.5">
              <span className="material-symbols-outlined text-[15px]">translate</span>
              <span>Translated ({selectedLanguage})</span>
            </div>
            <FormattedMessageBody content={message.translatedContent} isUser={false} />
          </div>
        )}

        {/* ChatGPT-style bottom icon actions */}
        <div className="flex items-center gap-1 pt-1 text-slate-400 dark:text-slate-500">
          {/* Read Aloud */}
          <button
            type="button"
            onClick={() => onSpeak(message.translatedContent || message.content, message.id)}
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              isSpeaking
                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 font-bold'
                : 'hover:bg-slate-100 dark:hover:bg-[#262626] hover:text-slate-700 dark:hover:text-slate-300'
            }`}
            title={isSpeaking ? 'Stop Read Aloud' : 'Read Aloud'}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isSpeaking ? 'volume_off' : 'volume_up'}
            </span>
          </button>

          {/* Translate */}
          <button
            type="button"
            onClick={() => onTranslate(message.id, message.content)}
            disabled={message.isTranslating}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#262626] hover:text-blue-600 dark:hover:text-blue-400 text-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Translate to selected language"
          >
            <span className={`material-symbols-outlined text-[16px] ${message.isTranslating ? 'animate-spin' : ''}`}>
              {message.isTranslating ? 'sync' : 'translate'}
            </span>
          </button>

          {/* Copy Message */}
          <button
            type="button"
            onClick={() => onCopy(message.translatedContent || message.content, message.id)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#262626] hover:text-slate-800 dark:hover:text-slate-200 text-xs transition-colors cursor-pointer"
            title="Copy message"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isCopied ? 'check' : 'content_copy'}
            </span>
          </button>

          <span className="text-[10px] ml-1 text-slate-400 dark:text-slate-600">
            {message.timestamp}
          </span>
        </div>
      </div>
    </div>
  );
};
