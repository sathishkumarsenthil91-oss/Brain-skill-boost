import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../../types';
import { ChatSessionMeta, ChatFolder } from './chatTypes';
import { NEBULA_LOGO_URL } from '../../data/mockData';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSessionMeta[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onDeleteSession: (id: string) => void;
  folders: ChatFolder[];
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveToFolder: (sessionId: string, folderId: string | null) => void;
  onToggleStar: (sessionId: string) => void;
  user: UserProfile;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onRenameSession,
  onDeleteSession,
  folders,
  onCreateFolder,
  onDeleteFolder,
  onMoveToFolder,
  onToggleStar,
  user,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null);
  const [isFolderSubmenuOpen, setIsFolderSubmenuOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    starred: true,
    career: false,
    code: false,
    interview: false,
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Close three-dot menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuSessionId(null);
        setIsFolderSubmenuOpen(false);
      }
    };
    if (activeMenuSessionId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuSessionId]);

  useEffect(() => {
    if (renamingSessionId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingSessionId]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleStartRename = (session: ChatSessionMeta) => {
    setRenamingSessionId(session.id);
    setRenameText(session.title);
    setActiveMenuSessionId(null);
  };

  const handleFinishRename = () => {
    if (renamingSessionId && renameText.trim()) {
      onRenameSession(renamingSessionId, renameText.trim());
    }
    setRenamingSessionId(null);
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  // Filter sessions by search
  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate categorized vs unassigned
  const getSessionsForFolder = (folderId: string) => {
    if (folderId === 'starred') {
      return filteredSessions.filter((s) => s.isStarred || s.folderId === 'starred');
    }
    return filteredSessions.filter((s) => s.folderId === folderId);
  };

  // Group unassigned sessions by date
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const last7DaysStart = todayStart - 7 * 86400000;

  const unassignedSessions = filteredSessions.filter(
    (s) => !s.folderId || s.folderId === 'none'
  );

  const groups: { label: string; items: ChatSessionMeta[] }[] = [
    {
      label: 'Today',
      items: unassignedSessions.filter((s) => {
        const t = new Date(s.updated_at || s.created_at).getTime();
        return t >= todayStart;
      }),
    },
    {
      label: 'Yesterday',
      items: unassignedSessions.filter((s) => {
        const t = new Date(s.updated_at || s.created_at).getTime();
        return t >= yesterdayStart && t < todayStart;
      }),
    },
    {
      label: 'Previous 7 Days',
      items: unassignedSessions.filter((s) => {
        const t = new Date(s.updated_at || s.created_at).getTime();
        return t >= last7DaysStart && t < yesterdayStart;
      }),
    },
    {
      label: 'Older',
      items: unassignedSessions.filter((s) => {
        const t = new Date(s.updated_at || s.created_at).getTime();
        return t < last7DaysStart;
      }),
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:relative top-0 bottom-0 left-0 z-50 md:z-10 w-72 sm:w-80 h-full flex flex-col bg-[#f9f9f9] dark:bg-[#171717] border-r border-slate-200 dark:border-[#2f2f2f] transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:-translate-x-full'
        } ${!isOpen ? 'md:hidden' : 'md:flex'}`}
      >
        {/* Top Header: App Brand & Close on mobile */}
        <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg overflow-hidden bg-slate-900 border border-white/20 p-0.5">
              <img
                src={NEBULA_LOGO_URL}
                alt="Nebula Logo"
                className="w-full h-full object-cover rounded-md"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 tracking-tight">
              Nebula AI
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-[#252525] cursor-pointer"
              title="Close Sidebar"
            >
              <span className="material-symbols-outlined text-[18px]">dock_to_left</span>
            </button>
          </div>
        </div>

        {/* Action: + New Chat Button (ChatGPT Style) */}
        <div className="px-3 pt-1 pb-2">
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white dark:bg-[#212121] hover:bg-slate-100 dark:hover:bg-[#2b2b2b] text-slate-900 dark:text-white border border-slate-200 dark:border-[#383838] shadow-2xs font-semibold text-xs sm:text-sm transition-all cursor-pointer group"
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                add
              </span>
              <span>New chat</span>
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
              Ctrl+K
            </span>
          </button>
        </div>

        {/* Search Chats Input */}
        <div className="px-3 pb-2">
          <div className="relative">
            <span className="material-symbols-outlined text-[15px] absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg text-xs bg-slate-200/60 dark:bg-[#202020] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none border border-transparent focus:border-slate-300 dark:focus:border-[#3a3a3a] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Center Section: Folders & Previous Chats */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 pb-4">
          {/* Folders Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">folder_open</span>
                <span>Folders & Projects</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingFolder(true)}
                className="hover:text-blue-600 dark:hover:text-blue-400 p-0.5 rounded cursor-pointer"
                title="Create New Folder"
              >
                <span className="material-symbols-outlined text-[15px]">create_new_folder</span>
              </button>
            </div>

            {/* Inline Folder Creation Form */}
            {isCreatingFolder && (
              <form onSubmit={handleCreateFolderSubmit} className="p-2 bg-white dark:bg-[#212121] rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name..."
                  autoFocus
                  className="w-full text-xs px-2 py-1 bg-slate-100 dark:bg-[#2b2b2b] rounded-lg outline-none text-slate-800 dark:text-white"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingFolder(false);
                      setNewFolderName('');
                    }}
                    className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newFolderName.trim()}
                    className="px-2.5 py-0.5 text-[11px] bg-blue-600 text-white font-semibold rounded-md disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </form>
            )}

            {/* Folders Accordion List */}
            {folders.map((folder) => {
              const folderSessions = getSessionsForFolder(folder.id);
              const isExpanded = !!expandedFolders[folder.id];

              return (
                <div key={folder.id} className="space-y-0.5">
                  <div
                    onClick={() => toggleFolder(folder.id)}
                    className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-[#212121] text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined text-[14px] text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform">
                        {isExpanded ? 'expand_more' : 'chevron_right'}
                      </span>
                      <span className="material-symbols-outlined text-[16px] text-blue-500 dark:text-blue-400">
                        {folder.icon}
                      </span>
                      <span className="truncate">{folder.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 px-1.5 py-0.2 rounded-full bg-slate-200/60 dark:bg-[#2b2b2b]">
                        {folderSessions.length}
                      </span>
                      {!folder.isSystem && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete folder "${folder.name}"? Chats will be unassigned.`)) {
                              onDeleteFolder(folder.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-0.5"
                          title="Delete folder"
                        >
                          <span className="material-symbols-outlined text-[13px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sessions inside this folder */}
                  {isExpanded && (
                    <div className="pl-6 space-y-0.5 border-l border-slate-200 dark:border-[#2f2f2f] ml-3.5 my-0.5">
                      {folderSessions.length === 0 ? (
                        <div className="py-1 px-2 text-[11px] text-slate-400 italic">
                          No chats in this folder
                        </div>
                      ) : (
                        folderSessions.map((session) => renderChatItem(session))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Timeline Grouped Previous Chats */}
          <div className="space-y-3 pt-2">
            <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">history</span>
              <span>Recent Chats</span>
            </div>

            {unassignedSessions.length === 0 && filteredSessions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400 italic">
                {searchQuery ? 'No conversations found' : 'No previous chats yet'}
              </div>
            ) : (
              groups.map((group) => {
                if (group.items.length === 0) return null;
                return (
                  <div key={group.label} className="space-y-0.5">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {group.label}
                    </div>
                    {group.items.map((session) => renderChatItem(session))}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* User Footer (ChatGPT Style) */}
        <div className="p-3 border-t border-slate-200 dark:border-[#2a2a2a] bg-[#f4f4f4] dark:bg-[#141414] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-300 dark:border-slate-700 shrink-0"
            />
            <div className="min-w-0">
              <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                {user.name || 'User Profile'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {user.targetRole || 'Candidate'}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Three-Dot Context Menu Popover */}
        {activeMenuSessionId && (
          <div
            ref={menuRef}
            className="absolute z-50 w-52 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-xl border border-slate-200 dark:border-[#333333] py-1.5 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in"
            style={{
              left: '14rem',
              top: '40%',
            }}
          >
            {(() => {
              const targetSession = sessions.find((s) => s.id === activeMenuSessionId);
              if (!targetSession) return null;

              return (
                <>
                  {/* Rename */}
                  <button
                    type="button"
                    onClick={() => handleStartRename(targetSession)}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#2a2a2a] text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-400">edit</span>
                    <span>Rename chat</span>
                  </button>

                  {/* Move to folder submenu toggle */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsFolderSubmenuOpen(!isFolderSubmenuOpen)}
                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#2a2a2a] text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">folder</span>
                        <span>Move to folder</span>
                      </span>
                      <span className="material-symbols-outlined text-[14px]">
                        {isFolderSubmenuOpen ? 'expand_less' : 'chevron_right'}
                      </span>
                    </button>

                    {isFolderSubmenuOpen && (
                      <div className="py-1 bg-slate-50 dark:bg-[#252525] border-y border-slate-100 dark:border-[#333333] space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            onMoveToFolder(targetSession.id, null);
                            setActiveMenuSessionId(null);
                            setIsFolderSubmenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-1 text-[11px] hover:bg-slate-200 dark:hover:bg-[#303030] ${
                            !targetSession.folderId ? 'font-bold text-blue-600 dark:text-blue-400' : ''
                          }`}
                        >
                          <span>None (Unassigned)</span>
                          {!targetSession.folderId && <span>✓</span>}
                        </button>
                        {folders.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              onMoveToFolder(targetSession.id, f.id);
                              setActiveMenuSessionId(null);
                              setIsFolderSubmenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-1 text-[11px] hover:bg-slate-200 dark:hover:bg-[#303030] ${
                              targetSession.folderId === f.id ? 'font-bold text-blue-600 dark:text-blue-400' : ''
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[13px]">{f.icon}</span>
                              <span className="truncate">{f.name}</span>
                            </span>
                            {targetSession.folderId === f.id && <span>✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pin / Star */}
                  <button
                    type="button"
                    onClick={() => {
                      onToggleStar(targetSession.id);
                      setActiveMenuSessionId(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#2a2a2a] text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-amber-500">
                      {targetSession.isStarred ? 'star' : 'star_border'}
                    </span>
                    <span>{targetSession.isStarred ? 'Unstar chat' : 'Star chat'}</span>
                  </button>

                  <div className="h-px bg-slate-100 dark:bg-[#2d2d2d] my-1" />

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete conversation "${targetSession.title}"?`)) {
                        onDeleteSession(targetSession.id);
                        setActiveMenuSessionId(null);
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-left cursor-pointer font-medium"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Delete chat</span>
                  </button>
                </>
              );
            })()}
          </div>
        )}
      </aside>
    </>
  );

  // Helper renderer for a single chat item in sidebar
  function renderChatItem(session: ChatSessionMeta) {
    const isSelected = currentSessionId === session.id;
    const isRenaming = renamingSessionId === session.id;

    if (isRenaming) {
      return (
        <div key={session.id} className="px-2 py-1">
          <input
            ref={renameInputRef}
            type="text"
            value={renameText}
            onChange={(e) => setRenameText(e.target.value)}
            onBlur={handleFinishRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFinishRename();
              if (e.key === 'Escape') setRenamingSessionId(null);
            }}
            className="w-full px-2 py-1 text-xs rounded-lg bg-white dark:bg-[#202020] text-slate-900 dark:text-white border border-blue-500 outline-none"
          />
        </div>
      );
    }

    return (
      <div
        key={session.id}
        onClick={() => {
          onSelectSession(session.id);
          if (window.innerWidth < 768) onClose();
        }}
        className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
          isSelected
            ? 'bg-slate-200/90 dark:bg-[#262626] text-slate-900 dark:text-white font-semibold shadow-2xs'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-[#1f1f1f]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
          {session.isStarred ? (
            <span className="material-symbols-outlined text-[15px] text-amber-500 shrink-0">star</span>
          ) : (
            <span className="material-symbols-outlined text-[15px] text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0">
              chat_bubble_outline
            </span>
          )}
          <span className="truncate">{session.title}</span>
        </div>

        {/* Three-Dot Menu Button (ChatGPT Style) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveMenuSessionId(activeMenuSessionId === session.id ? null : session.id);
            setIsFolderSubmenuOpen(false);
          }}
          className={`p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-300/60 dark:hover:bg-[#333333] transition-opacity shrink-0 cursor-pointer ${
            isSelected || activeMenuSessionId === session.id
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          }`}
          title="Chat Options"
        >
          <span className="material-symbols-outlined text-[16px]">more_horiz</span>
        </button>
      </div>
    );
  }
};
