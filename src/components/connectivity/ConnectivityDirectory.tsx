import React, { useState, useEffect } from 'react';
import { NetworkUser, UserProfile } from '../../types';
import { connectivityService } from '../../services/supabaseService';

interface ConnectivityDirectoryProps {
  users: NetworkUser[];
  currentUser?: UserProfile;
  onSelectUser: (user: NetworkUser) => void;
  onFollowToggle: (user: NetworkUser) => void;
  onOpenChat: (user: NetworkUser) => void;
}

export const ConnectivityDirectory: React.FC<ConnectivityDirectoryProps> = ({
  users,
  currentUser,
  onSelectUser,
  onFollowToggle,
  onOpenChat,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'friends' | 'followers' | 'following'>('all');
  const [liveSearchResults, setLiveSearchResults] = useState<NetworkUser[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Live Supabase query when searching with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setLiveSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      if (currentUser) {
        try {
          const results = await connectivityService.searchUsers(searchQuery, currentUser);
          setLiveSearchResults(results);
        } catch (e) {
          console.error(e);
        } finally {
          setIsSearching(false);
        }
      } else {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser]);

  const activeUserList = liveSearchResults !== null ? liveSearchResults : users;

  const friendsCount = activeUserList.filter((u) => u.isFriend || (u.isFollowing && u.isFollower)).length;
  const followersCount = activeUserList.filter((u) => u.isFollower).length;
  const followingCount = activeUserList.filter((u) => u.isFollowing).length;

  const filteredUsers = activeUserList.filter((u) => {
    // Tab filter
    if (filterTab === 'friends' && !(u.isFriend || (u.isFollowing && u.isFollower))) return false;
    if (filterTab === 'followers' && !u.isFollower) return false;
    if (filterTab === 'following' && !u.isFollowing) return false;

    // Local filter if liveSearchResults is not used
    if (liveSearchResults === null && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesId = u.userId?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q);
      const matchesName = u.name.toLowerCase().includes(q);
      const matchesCompany = u.company.toLowerCase().includes(q);
      const matchesSkills = u.skills.some((s) => s.toLowerCase().includes(q));
      const matchesInterests = u.interests?.some((i) => i.toLowerCase().includes(q));
      return matchesId || matchesName || matchesCompany || matchesSkills || matchesInterests;
    }

    return true;
  });

  return (
    <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs p-4 sm:p-5 space-y-4">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-600 text-[20px]">group_search</span>
            Network Directory & Peer Discovery
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Search across registered Supabase members by handle, skills, and direct message in real-time.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative sm:w-72">
          <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3 top-2.5">
            {isSearching ? 'sync' : 'search'}
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by @handle, skill, name..."
            className="w-full bg-slate-100 dark:bg-slate-800/70 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none border border-slate-200/60 dark:border-slate-700 focus:border-purple-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-slate-100 dark:border-slate-800">
        {[
          { id: 'all', label: 'All Members', count: activeUserList.length, icon: 'public' },
          { id: 'friends', label: 'Friends & Mutuals', count: friendsCount, icon: 'handshake' },
          { id: 'followers', label: 'Followers', count: followersCount, icon: 'group' },
          { id: 'following', label: 'Following', count: followingCount, icon: 'person_check' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer whitespace-nowrap ${
              filterTab === tab.id
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                filterTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* User Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full text-center py-12 px-4 text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <span className="material-symbols-outlined text-4xl text-purple-400 mb-2">
              person_search
            </span>
            <h4 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
              {searchQuery ? 'No matching registered members found' : 'No peer profiles found yet'}
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'Try searching by a different handle, college, or technical skill.'
                : 'Registered Supabase users who create an account or verify their skills will appear here automatically.'}
            </p>
          </div>
        ) : (
          filteredUsers.map((member) => {
            const isFriend = member.isFriend || (member.isFollowing && member.isFollower);

            return (
              <div
                key={member.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between gap-3 hover:border-purple-300 dark:hover:border-purple-700 transition-all group"
              >
                <div>
                  {/* Member Top Bar: Avatar, Name, Handle & Status */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div
                      onClick={() => onSelectUser(member)}
                      className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={member.avatarUrl}
                          alt={member.name}
                          className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 group-hover:ring-2 group-hover:ring-purple-500 transition-all"
                        />
                        {member.onlineStatus === 'online' && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#131b2e]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors truncate">
                            {member.name}
                          </h4>
                          <span
                            className="material-symbols-outlined text-[15px] text-blue-500 shrink-0"
                            title="Verified Member"
                          >
                            verified
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-purple-600 dark:text-purple-400 font-mono font-bold truncate">
                          <span>{member.userId || `@${member.username}`}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {member.role} {member.company ? `@ ${member.company}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Relationship Badge */}
                    {isFriend && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[9px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">handshake</span>
                        Friend
                      </span>
                    )}
                    {!isFriend && member.isFollower && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-[9px] font-black uppercase tracking-wider shrink-0">
                        Follows You
                      </span>
                    )}
                  </div>

                  {/* Skills / Interests Chips */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {member.skills.slice(0, 3).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300"
                      >
                        {skill}
                      </span>
                    ))}
                    {member.interests && member.interests.length > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-[10px] font-bold text-purple-600 dark:text-purple-300">
                        {member.interests[0]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <button
                    onClick={() => onFollowToggle(member)}
                    className={`flex-1 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      member.isFollowing
                        ? 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-xs'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {member.isFollowing ? 'check' : 'person_add'}
                    </span>
                    <span>{member.isFollowing ? 'Following' : '+ Connect'}</span>
                  </button>

                  <button
                    onClick={() => onOpenChat(member)}
                    className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                    title="Private Chat"
                  >
                    <span className="material-symbols-outlined text-[16px] text-purple-600">chat</span>
                    <span className="hidden sm:inline">Message</span>
                  </button>

                  <button
                    onClick={() => onSelectUser(member)}
                    className="p-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-purple-600 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                    title="View Profile"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
