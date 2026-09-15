import React, { useState, useEffect } from 'react';
import { NetworkUser, UserProfile } from '../../types';
import { connectivityService } from '../../services/supabaseService';

interface FollowersFollowingModalProps {
  isOpen: boolean;
  initialType: 'followers' | 'following';
  targetUser: NetworkUser;
  currentUser: UserProfile;
  onClose: () => void;
  onSelectUser: (user: NetworkUser) => void;
  onOpenChat: (user: NetworkUser) => void;
  onFollowToggle: (user: NetworkUser) => void;
}

export const FollowersFollowingModal: React.FC<FollowersFollowingModalProps> = ({
  isOpen,
  initialType,
  targetUser,
  currentUser,
  onClose,
  onSelectUser,
  onOpenChat,
  onFollowToggle,
}) => {
  const [activeType, setActiveType] = useState<'followers' | 'following'>(initialType);
  const [listUsers, setListUsers] = useState<NetworkUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setActiveType(initialType);
  }, [initialType]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    const loadList = async () => {
      try {
        const data =
          activeType === 'followers'
            ? await connectivityService.getFollowersList(targetUser.id, currentUser)
            : await connectivityService.getFollowingList(targetUser.id, currentUser);

        if (isMounted) {
          setListUsers(data);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Error loading follow list:', err);
        if (isMounted) {
          setListUsers([]);
          setIsLoading(false);
        }
      }
    };

    loadList();

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeType, targetUser.id, currentUser]);

  if (!isOpen) return null;

  const filteredUsers = listUsers.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.userId && u.userId.toLowerCase().includes(q)) ||
      u.headline.toLowerCase().includes(q) ||
      u.company.toLowerCase().includes(q)
    );
  });

  const handleToggle = (userItem: NetworkUser, e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic toggle in local list
    setListUsers((prev) =>
      prev.map((item) =>
        item.id === userItem.id
          ? {
              ...item,
              isFollowing: !item.isFollowing,
              followersCount: item.isFollowing ? Math.max(0, item.followersCount - 1) : item.followersCount + 1,
            }
          : item
      )
    );
    onFollowToggle(userItem);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#131b2e] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
              {targetUser.name}
            </h3>
            <p className="text-xs text-slate-500 truncate">
              {targetUser.userId || `@${targetUser.username || 'member'}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-3 bg-slate-50/50 dark:bg-slate-900/30">
          <button
            onClick={() => setActiveType('followers')}
            className={`flex-1 py-3 text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 cursor-pointer ${
              activeType === 'followers'
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <span>Followers</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 dark:bg-slate-800">
              {activeType === 'followers' && !isLoading ? listUsers.length : targetUser.followersCount}
            </span>
            {activeType === 'followers' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveType('following')}
            className={`flex-1 py-3 text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 cursor-pointer ${
              activeType === 'following'
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <span>Following</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 dark:bg-slate-800">
              {activeType === 'following' && !isLoading ? listUsers.length : targetUser.followingCount}
            </span>
            {activeType === 'following' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Search Filter Box */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#131b2e]">
          <div className="relative">
            <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3 top-2.5">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${activeType}...`}
              className="w-full bg-slate-100 dark:bg-slate-800/60 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none border border-transparent focus:border-purple-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Users List Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 min-h-[260px] p-2">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs font-medium">Loading {activeType} from database...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-400 px-4">
              <span className="material-symbols-outlined text-4xl text-purple-400 mb-2">
                group_off
              </span>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {searchQuery ? 'No matching peers found' : `No ${activeType} to display yet`}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                {activeType === 'followers'
                  ? 'When peers follow this profile, they will appear right here.'
                  : 'Start following engineers and peers to connect and build network.'}
              </p>
            </div>
          ) : (
            filteredUsers.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectUser(item);
                  onClose();
                }}
                className="p-2.5 sm:p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between gap-3 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={item.avatarUrl}
                      alt={item.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    {item.onlineStatus === 'online' && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#131b2e]" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:text-purple-600 transition-colors truncate">
                        {item.name}
                      </p>
                      <span className="material-symbols-outlined text-blue-500 text-[14px]">
                        verified
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {item.userId || `@${item.username || 'member'}`} • {item.company}
                    </p>
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 truncate font-medium">
                      {item.headline}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      onOpenChat(item);
                      onClose();
                    }}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Direct Message"
                  >
                    <span className="material-symbols-outlined text-[15px]">chat</span>
                    <span className="hidden sm:inline">Chat</span>
                  </button>

                  <button
                    onClick={(e) => handleToggle(item, e)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                      item.isFollowing
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600'
                        : 'bg-purple-600 hover:bg-purple-500 text-white'
                    }`}
                  >
                    {item.isFollowing ? 'Following' : '+ Follow'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
