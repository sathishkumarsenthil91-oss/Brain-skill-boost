import React, { useState, useEffect, useRef } from 'react';
import {
  UserProfile,
  NetworkUser,
  NetworkPost,
  NetworkConversation,
  UserLibraryItem,
  LibraryAccessRequest,
  GeneratedCertificate,
  ViewType,
} from '../types';
import { connectivityService, mapProfileToNetworkUser, isSupabaseConfigured } from '../services/supabaseService';
import { CertificateGenerationModal } from './CertificateGenerationModal';
import { ConnectivityProfileSetupModal } from './connectivity/ConnectivityProfileSetupModal';
import { ConnectivityDirectory } from './connectivity/ConnectivityDirectory';

interface ConnectivitySubsectionProps {
  user: UserProfile;
  onNavigate: (view: ViewType) => void;
  onUpdateUser?: (updated: Partial<UserProfile>) => void;
}

type ConnectivityTab = 'home' | 'chat' | 'profile';

export const ConnectivitySubsection: React.FC<ConnectivitySubsectionProps> = ({
  user,
  onNavigate,
  onUpdateUser,
}) => {
  // Navigation inside Connectivity: Home | Chat | Profile
  const [activeTab, setActiveTab] = useState<ConnectivityTab>('home');

  // Real data state
  const [users, setUsers] = useState<NetworkUser[]>([]);
  const [posts, setPosts] = useState<NetworkPost[]>([]);
  const [conversations, setConversations] = useState<NetworkConversation[]>([]);
  const [accessRequests, setAccessRequests] = useState<LibraryAccessRequest[]>([]);
  const [userLibraries, setUserLibraries] = useState<Record<string, UserLibraryItem[]>>({});

  // View state for profile (either current user or a selected connected user)
  const [viewingUser, setViewingUser] = useState<NetworkUser | null>(null);
  const [profileTab, setProfileTab] = useState<'info' | 'certificates' | 'library'>('info');

  // Active chat conversation
  const [activeChatUser, setActiveChatUser] = useState<NetworkUser | null>(null);
  const [chatMessageText, setChatMessageText] = useState('');

  // Modals
  const [showProfileSetupModal, setShowProfileSetupModal] = useState(false);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showAccessRequestsModal, setShowAccessRequestsModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [activeStoryUser, setActiveStoryUser] = useState<NetworkUser | null>(null);
  const [selectedCertificatePreview, setSelectedCertificatePreview] = useState<GeneratedCertificate | null>(null);

  // New post form state & gallery image upload
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const [newPostCodeLang, setNewPostCodeLang] = useState('typescript');
  const [newPostCode, setNewPostCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [selectedCertForPost, setSelectedCertForPost] = useState<GeneratedCertificate | null>(null);

  // Edit profile form state
  const [editBio, setEditBio] = useState(user.headline || '');
  const [editHeadline, setEditHeadline] = useState(user.targetRole || '');
  const [isPrivateAccount, setIsPrivateAccount] = useState(Boolean(user.isPrivateAccount));

  // Search and filter
  const [feedFilter, setFeedFilter] = useState<'all' | 'following' | 'certs' | 'code'>('all');
  const [chatSearch, setChatSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Gallery image file processor
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP, GIF)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setNewPostImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    e.target.value = '';
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImage(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Load real data on mount & whenever user updates
  const reloadData = async () => {
    // 1. Instant cache load
    const fetchedUsers = connectivityService.getUsers(user);
    const fetchedPosts = connectivityService.getPosts(user);
    const fetchedConvs = connectivityService.getConversations(user);
    const fetchedReqs = connectivityService.getAccessRequests(user);
    const fetchedLibs = connectivityService.getUserLibraries(user);

    setUsers(fetchedUsers);
    setPosts(fetchedPosts);
    setConversations(fetchedConvs);
    setAccessRequests(fetchedReqs);
    setUserLibraries(fetchedLibs);

    // 2. Fetch live data asynchronously from Supabase
    try {
      const [liveUsers, livePosts] = await Promise.all([
        connectivityService.fetchUsers(user),
        connectivityService.fetchPosts(user),
      ]);
      if (Array.isArray(liveUsers)) {
        setUsers(liveUsers);
      }
      if (Array.isArray(livePosts)) {
        setPosts(livePosts);
      }
    } catch (err) {
      console.warn('Supabase data refresh notice:', err);
    }
  };

  useEffect(() => {
    reloadData();
    if (!connectivityService.isSetupCompleted(user)) {
      setIsFirstTimeSetup(true);
      setShowProfileSetupModal(true);
    }

    // Subscribe to real-time incoming chat messages across the network
    const unsubscribeChat = connectivityService.subscribeToRealtimeChat(
      user,
      (newMsg, participant) => {
        setConversations((prevConvs) => {
          const exists = prevConvs.find((c) => c.participant.id === participant.id);
          if (exists) {
            return prevConvs.map((c) =>
              c.participant.id === participant.id
                ? {
                    ...c,
                    participant,
                    lastMessage: newMsg.content,
                    lastMessageTime: newMsg.timestamp,
                    unreadCount: (c.unreadCount || 0) + 1,
                    messages: [...c.messages, newMsg],
                  }
                : c
            );
          } else {
            return [
              {
                id: `conv-${participant.id}`,
                participant,
                lastMessage: newMsg.content,
                lastMessageTime: newMsg.timestamp,
                unreadCount: 1,
                messages: [newMsg],
              },
              ...prevConvs,
            ];
          }
        });

        showToast(`💬 New message from ${participant.name}: "${newMsg.content.substring(0, 30)}..."`);
      }
    );

    return () => {
      unsubscribeChat();
    };
  }, [user]);

  const handleCompleteProfileSetup = (data: {
    userId: string;
    name: string;
    avatarUrl: string;
    skills: string[];
    interests: string[];
    headline?: string;
    bio?: string;
  }) => {
    connectivityService.completeSetup(user, data);
    if (onUpdateUser) {
      onUpdateUser({
        userId: data.userId,
        username: data.userId.replace(/^@/, ''),
        name: data.name,
        avatarUrl: data.avatarUrl,
        skills: data.skills,
        interests: data.interests,
        targetRole: data.headline,
        headline: data.headline,
        bio: data.bio,
        connectivitySetupCompleted: true,
      });
    }
    setShowProfileSetupModal(false);
    setIsFirstTimeSetup(false);
    reloadData();
    showToast('✨ Connectivity profile successfully updated!');
  };

  // Current mapped user
  const currentUserMapped = mapProfileToNetworkUser(user, userLibraries[user.email ? `usr-${user.email.replace(/[^a-zA-Z0-9]/g, '_')}` : 'current-user-real']);

  // Active target for profile tab
  const activeProfile = viewingUser || currentUserMapped;
  const isViewingSelf = activeProfile.id === currentUserMapped.id || activeProfile.id === 'current-user-real';

  // Handle Post Creation
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    await connectivityService.createPost(user, {
      content: newPostContent.trim(),
      imageUrl: newPostImage.trim() || undefined,
      codeSnippet: showCodeInput && newPostCode.trim() ? { language: newPostCodeLang, code: newPostCode.trim() } : undefined,
      attachedCertificate: selectedCertForPost || undefined,
      tags: ['#Brainboost', '#WebDevelopment', '#CareerReady'],
    });

    setNewPostContent('');
    setNewPostImage('');
    setNewPostCode('');
    setShowCodeInput(false);
    setSelectedCertForPost(null);
    setShowCreatePostModal(false);
    reloadData();
    showToast('✨ Post published to your professional network!');
  };

  // Handle Like
  const handleLike = (postId: string) => {
    const updated = connectivityService.toggleLike(postId, user);
    setPosts(updated);
  };

  // Handle Add Comment
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const handleCommentSubmit = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    const updated = connectivityService.addComment(postId, text, user);
    setPosts(updated);
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    showToast('Comment added!');
  };

  // Handle Follow Toggle
  const handleFollowToggle = (targetUser: NetworkUser) => {
    const updated = connectivityService.toggleFollow(targetUser.id, user);
    setUsers(updated);
    if (viewingUser && viewingUser.id === targetUser.id) {
      const refreshed = updated.find((u) => u.id === targetUser.id);
      if (refreshed) setViewingUser(refreshed);
    }
    showToast(targetUser.isFollowing ? `Unfollowed ${targetUser.name}` : `Following ${targetUser.name}!`);
  };

  // Handle Request Library Access
  const handleRequestLibraryAccess = (targetUserId: string) => {
    const result = connectivityService.requestLibraryAccess(targetUserId, user);
    if (result.success) {
      reloadData();
      if (viewingUser && viewingUser.id === targetUserId) {
        setViewingUser({
          ...viewingUser,
          isAccessRequested: true,
        });
      }
      showToast('🔒 Access request sent to the owner! You will receive access once approved.');
    }
  };

  // Handle Respond to Access Request
  const handleRespondToRequest = (requestId: string, decision: 'approved' | 'declined') => {
    const updated = connectivityService.respondToAccessRequest(requestId, decision);
    setAccessRequests(updated);
    reloadData();
    showToast(decision === 'approved' ? '✓ Access granted to learning library!' : 'Access request declined.');
  };

  // Handle Send Chat Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessageText.trim() || !activeChatUser) return;

    const messageText = chatMessageText.trim();
    setChatMessageText('');

    const { updatedConversations } = await connectivityService.sendMessage(
      activeChatUser,
      messageText,
      user
    );
    setConversations(updatedConversations);
  };

  // Open chat with a specific user from profile or story
  const openChatWithUser = (targetUser: NetworkUser) => {
    setActiveChatUser(targetUser);
    setActiveTab('chat');
  };

  // Save profile privacy / settings
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    connectivityService.toggleProfilePrivacy(isPrivateAccount, user);
    if (onUpdateUser) {
      onUpdateUser({
        headline: editHeadline,
        targetRole: editHeadline,
        isPrivateAccount,
      });
    }
    setShowEditProfileModal(false);
    reloadData();
    showToast('Profile updated successfully!');
  };

  // Filtered posts for feed
  const filteredPosts = posts.filter((post) => {
    if (feedFilter === 'following') {
      const authorUser = users.find((u) => u.id === post.author.id);
      return post.author.isCurrentUser || authorUser?.isFollowing;
    }
    if (feedFilter === 'certs') return Boolean(post.attachedCertificate);
    if (feedFilter === 'code') return Boolean(post.codeSnippet);
    return true;
  });

  // Pending access requests count for current user
  const pendingRequestsForMe = accessRequests.filter(
    (r) => (r.targetUserId === 'current-user-real' || r.targetUserId === currentUserMapped.id) && r.status === 'pending'
  );

  // Active conversation object for chat tab
  const activeConversation = activeChatUser
    ? conversations.find((c) => c.participant.id === activeChatUser.id) || {
        id: `temp-${activeChatUser.id}`,
        participant: activeChatUser,
        lastMessage: '',
        lastMessageTime: 'Now',
        unreadCount: 0,
        messages: [],
      }
    : null;

  return (
    <div className="w-full max-w-full min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-[#0d1322] text-slate-900 dark:text-slate-100 flex flex-col relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-[calc(100vw-2rem)] bg-indigo-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200">
          <span className="material-symbols-outlined text-[18px] shrink-0">verified</span>
          <span className="break-words">{toastMessage}</span>
        </div>
      )}

      {/* Top Professional Header Bar */}
      <header className="sticky top-16 z-30 bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20 shrink-0">
            <span className="material-symbols-outlined text-[18px] sm:text-[20px]">hub</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h2 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                Connectivity
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 whitespace-nowrap">
                  {isSupabaseConfigured() ? 'Supabase Live' : 'Real-User Sync'}
                </span>
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-0.5 hidden sm:block truncate">
              Professional peer network, live learning libraries & direct messaging
            </p>
          </div>
        </div>

        {/* Center / Navigation Tabs for Desktop & Mobile */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 order-3 sm:order-2 w-full sm:w-auto justify-center">
          <button
            onClick={() => {
              setActiveTab('home');
              setViewingUser(null);
            }}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'home'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">home</span>
            <span>Feed</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer relative whitespace-nowrap ${
              activeTab === 'chat'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">chat</span>
            <span>Chat</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('profile');
              setViewingUser(null);
            }}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'profile' && isViewingSelf
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">person</span>
            <span>My Profile</span>
          </button>
        </div>

        {/* Right Header Action Icons */}
        <div className="flex items-center gap-1.5 sm:gap-2 order-2 sm:order-3">
          <button
            onClick={() => setShowCreatePostModal(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/20 transition-all cursor-pointer whitespace-nowrap"
            title="Create Professional Post"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span className="hidden sm:inline">Create Post</span>
          </button>

          {/* Access Requests & Notifications Trigger */}
          <button
            onClick={() => setShowAccessRequestsModal(true)}
            className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0"
            title="Library Access Requests"
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
            {pendingRequestsForMe.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                {pendingRequestsForMe.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 1. HOME TAB: Post Feed */}
      {/* ========================================================================= */}
      {activeTab === 'home' && (
        <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-5 pb-28 min-w-0 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
            {/* Main Feed Column (Cols 1-2 on desktop, full width on mobile) */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
          {/* Quick Post Prompt Bar */}
          <div
            onClick={() => setShowCreatePostModal(true)}
            className="bg-white dark:bg-[#131b2e] rounded-2xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center gap-2.5 sm:gap-3 cursor-pointer hover:border-purple-400 dark:hover:border-purple-600 transition-all min-w-0"
          >
            <img
              src={currentUserMapped.avatarUrl}
              alt={currentUserMapped.name}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            />
            <div className="flex-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium truncate min-w-0">
              Share a verified certificate, learning update, or code insight...
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 text-slate-500 shrink-0">
              <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-purple-500">military_tech</span>
              <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-indigo-500">code</span>
              <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-emerald-500">image</span>
            </div>
          </div>

          {/* Network Directory & Peer Discovery */}
          <ConnectivityDirectory
            users={users}
            currentUser={user}
            onSelectUser={(targetUser) => {
              setViewingUser(targetUser);
              setActiveTab('profile');
            }}
            onFollowToggle={handleFollowToggle}
            onOpenChat={openChatWithUser}
          />


          {/* Feed Filter Chips */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
            {[
              { id: 'all', label: 'All Posts', icon: 'dynamic_feed' },
              { id: 'following', label: 'Following', icon: 'person_check' },
              { id: 'certs', label: 'Verified Certificates', icon: 'military_tech' },
              { id: 'code', label: 'Code & Architecture', icon: 'code' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFeedFilter(f.id as any)}
                className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                  feedFilter === f.id
                    ? 'bg-purple-600 text-white shadow-xs shadow-purple-500/20'
                    : 'bg-white dark:bg-[#131b2e] text-slate-600 dark:text-slate-400 hover:text-purple-600 border border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>

          {/* Posts Feed */}
          <div className="space-y-4 sm:space-y-6">
            {filteredPosts.map((post) => {
              const isCurrentUserPost = post.author.isCurrentUser || post.author.id === currentUserMapped.id;
              const authorUser = users.find((u) => u.id === post.author.id);

              return (
                <article
                  key={post.id}
                  className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden min-w-0"
                >
                  {/* Post Header */}
                  <div className="p-3.5 sm:p-5 flex items-center justify-between gap-2">
                    <div
                      onClick={() => {
                        if (authorUser) {
                          setViewingUser(authorUser);
                          setActiveTab('profile');
                        } else {
                          setViewingUser(null);
                          setActiveTab('profile');
                        }
                      }}
                      className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0 flex-1"
                    >
                      <img
                        src={post.author.avatarUrl}
                        alt={post.author.name}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 group-hover:ring-2 group-hover:ring-purple-500 transition-all shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-500 transition-colors truncate">
                            {post.author.name}
                          </h4>
                          <span className="material-symbols-outlined text-[15px] text-blue-500 shrink-0" title="Verified Member">
                            verified
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 max-w-[140px] xs:max-w-[200px] sm:max-w-md truncate">
                          {post.author.headline} • {post.timestamp}
                        </p>
                      </div>
                    </div>

                    {/* Follow/Message action if other user */}
                    {!isCurrentUserPost && authorUser && (
                      <button
                        onClick={() => handleFollowToggle(authorUser)}
                        className={`px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                          authorUser.isFollowing
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                            : 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800'
                        }`}
                      >
                        {authorUser.isFollowing ? 'Following' : '+ Follow'}
                      </button>
                    )}
                  </div>

                  {/* Post Content */}
                  <div className="px-3.5 sm:px-5 pb-3 break-words min-w-0">
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                      {post.content}
                    </p>

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {post.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Attached Media / Image */}
                  {post.imageUrl && (
                    <div className="w-full bg-black max-h-96 overflow-hidden">
                      <img
                        src={post.imageUrl}
                        alt="Post media"
                        className="w-full h-auto object-cover max-h-96 hover:scale-[1.01] transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* Attached Code Snippet */}
                  {post.codeSnippet && (
                    <div className="mx-3 sm:mx-5 mb-3 sm:mb-4 bg-slate-900 text-slate-200 rounded-xl p-3 sm:p-4 font-mono text-xs overflow-x-auto border border-slate-800 relative group max-w-full">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                        <span>{post.codeSnippet.language}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(post.codeSnippet?.code || '');
                            showToast('Code copied to clipboard!');
                          }}
                          className="hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[13px]">content_copy</span>
                          Copy
                        </button>
                      </div>
                      <pre className="text-xs leading-relaxed text-emerald-400 overflow-x-auto whitespace-pre">{post.codeSnippet.code}</pre>
                    </div>
                  )}

                  {/* Attached Verified Certificate Card */}
                  {post.attachedCertificate && (
                    <div
                      onClick={() => setSelectedCertificatePreview(post.attachedCertificate || null)}
                      className="mx-3 sm:mx-5 mb-3 sm:mb-4 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/40 rounded-xl p-3 sm:p-4 text-white flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 cursor-pointer hover:border-amber-400 transition-all shadow-md group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 group-hover:scale-105 transition-transform">
                          <span className="material-symbols-outlined text-[22px] sm:text-[26px]">military_tech</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/30 text-amber-200 border border-amber-400/30 whitespace-nowrap">
                              Verified Credential
                            </span>
                            <span className="text-[10px] text-slate-400 break-all">{post.attachedCertificate.serialId}</span>
                          </div>
                          <h5 className="text-xs sm:text-sm font-bold text-white mt-0.5 group-hover:text-amber-300 transition-colors break-words">
                            {post.attachedCertificate.title}
                          </h5>
                          <p className="text-[11px] text-slate-300 break-words">
                            Issued by {post.attachedCertificate.organization} • {post.attachedCertificate.issueDate}
                          </p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-amber-300 text-[20px] shrink-0 self-end xs:self-center">
                        visibility
                      </span>
                    </div>
                  )}

                  {/* Attached Poll */}
                  {post.poll && (
                    <div className="mx-3 sm:mx-5 mb-3 sm:mb-4 bg-slate-100 dark:bg-slate-800/60 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 break-words">
                        <span className="material-symbols-outlined text-[16px] text-purple-500 shrink-0">poll</span>
                        <span>{post.poll.question}</span>
                      </p>
                      <div className="space-y-2">
                        {post.poll.options.map((opt) => {
                          const pct = Math.round((opt.votes / Math.max(1, post.poll!.totalVotes)) * 100);
                          return (
                            <button
                              key={opt.id}
                              onClick={() => {
                                showToast(`Voted for "${opt.text}"!`);
                              }}
                              className="w-full text-left p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 relative overflow-hidden flex items-center justify-between text-xs font-semibold cursor-pointer group hover:border-purple-400 gap-2"
                            >
                              <div
                                className="absolute top-0 left-0 bottom-0 bg-purple-500/15 dark:bg-purple-500/25 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                              <span className="relative z-10 text-slate-800 dark:text-slate-200 group-hover:text-purple-500 break-words min-w-0 flex-1">
                                {opt.text}
                              </span>
                              <span className="relative z-10 text-[11px] text-slate-500 dark:text-slate-400 font-bold shrink-0">
                                {pct}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-[10px] text-slate-500 font-semibold block text-right">
                        {post.poll.totalVotes} total community votes
                      </span>
                    </div>
                  )}

                  {/* Post Action Buttons (Instagram/LinkedIn Style) */}
                  <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-3 sm:gap-6">
                      {/* Like Button */}
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-1 sm:gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                          post.isLiked ? 'text-rose-500' : 'hover:text-rose-500'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-[19px] sm:text-[20px] ${
                            post.isLiked ? 'fill-1 scale-110 text-rose-500' : ''
                          }`}
                        >
                          favorite
                        </span>
                        <span>{post.likesCount}</span>
                      </button>

                      {/* Comment Trigger */}
                      <button
                        className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold hover:text-purple-600 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[19px] sm:text-[20px]">chat_bubble</span>
                        <span>{post.commentsCount}</span>
                      </button>

                      {/* Share */}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          showToast('Post link copied to clipboard!');
                        }}
                        className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[19px] sm:text-[20px]">send</span>
                      </button>
                    </div>

                    {/* Bookmark */}
                    <button
                      onClick={() => showToast('Post saved to your bookmarks!')}
                      className="text-slate-500 hover:text-purple-600 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[19px] sm:text-[20px]">bookmark</span>
                    </button>
                  </div>

                  {/* Comments Thread */}
                  <div className="px-3.5 sm:px-5 pb-3.5 sm:pb-4 pt-1 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/50 space-y-3">
                    {post.comments && post.comments.length > 0 && (
                      <div className="space-y-2 pt-2">
                        {post.comments.slice(-3).map((comment) => (
                          <div key={comment.id} className="flex items-start gap-2 sm:gap-2.5 text-xs min-w-0">
                            <img
                              src={comment.authorAvatar}
                              alt={comment.authorName}
                              className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                            />
                            <div className="flex-1 bg-white dark:bg-[#131b2e] p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                  {comment.authorName}
                                </span>
                                <span className="text-[10px] text-slate-500 shrink-0">{comment.timestamp}</span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 mt-0.5 break-words">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Comment Input */}
                    <div className="flex items-center gap-2 pt-1 min-w-0">
                      <img
                        src={currentUserMapped.avatarUrl}
                        alt={currentUserMapped.name}
                        className="w-7 h-7 rounded-full object-cover shrink-0"
                      />
                      <div className="flex-1 flex items-center bg-white dark:bg-slate-900 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-700 min-w-0">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCommentSubmit(post.id);
                          }}
                          placeholder="Add a reply..."
                          className="w-full bg-transparent border-none outline-none text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 p-0 min-w-0"
                        />
                        <button
                          onClick={() => handleCommentSubmit(post.id)}
                          disabled={!commentInputs[post.id]?.trim()}
                          className="text-xs font-bold text-purple-600 disabled:opacity-40 hover:text-purple-700 cursor-pointer shrink-0 ml-1"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Right Desktop Sidebar (Visible on lg screens) */}
        <aside className="hidden lg:block lg:col-span-1 space-y-5 sticky top-36">
          {/* User Mini Profile Card */}
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={currentUserMapped.avatarUrl}
                  alt={currentUserMapped.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-purple-500"
                />
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#131b2e]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {currentUserMapped.name}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {user.targetRole || 'Full Stack Engineer'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <div>
                <span className="block text-base font-black text-purple-600 dark:text-purple-400">
                  {user.earnedCertificates?.length || 2}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Certs</span>
              </div>
              <div>
                <span className="block text-base font-black text-indigo-600 dark:text-indigo-400">
                  {currentUserMapped.followersCount}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Followers</span>
              </div>
              <div>
                <span className="block text-base font-black text-emerald-600 dark:text-emerald-400">
                  {user.learningProgress || 68}%
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Progress</span>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveTab('profile');
                setViewingUser(null);
              }}
              className="w-full mt-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs transition-colors cursor-pointer text-center"
            >
              View My Learning Library
            </button>
          </div>

          {/* Suggested Peers to Connect */}
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Suggested Peers
              </h4>
              <span className="text-[10px] text-purple-600 font-bold">Verified</span>
            </div>

            <div className="space-y-3">
              {users.slice(0, 4).map((peer) => (
                <div key={peer.id} className="flex items-center justify-between gap-2">
                  <div
                    onClick={() => {
                      setViewingUser(peer);
                      setActiveTab('profile');
                    }}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
                  >
                    <img
                      src={peer.avatarUrl}
                      alt={peer.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors truncate">
                        {peer.name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {peer.company}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleFollowToggle(peer)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                      peer.isFollowing
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        : 'bg-purple-600 text-white hover:bg-purple-500'
                    }`}
                  >
                    {peer.isFollowing ? '✓' : '+ Follow'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Tech Discussions */}
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Trending Topics
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {['#SystemDesign', '#FullStackReady', '#DockerK8s', '#GoogleCloud', '#React19', '#NextJS', '#Supabase'].map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950/60 dark:hover:text-purple-300 transition-colors cursor-pointer"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )}

      {/* ========================================================================= */}
      {/* 2. CHAT TAB: Real User 1-on-1 Direct Messaging (Full Responsive Viewport) */}
      {/* ========================================================================= */}
      {activeTab === 'chat' && (
        <div className="w-full h-[calc(100vh-11rem)] md:h-[calc(100vh-8.5rem)] px-2 sm:px-4 md:px-6 py-2 sm:py-3 flex flex-col min-h-0 flex-1">
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0">
            {/* Conversations Sidebar (Col 1-5) */}
            <div
              className={`md:col-span-5 lg:col-span-4 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full min-h-0 ${
                activeChatUser ? 'hidden md:flex' : 'flex'
              }`}
            >
              {/* Search Header */}
              <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 space-y-2.5 sm:space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-purple-600">forum</span>
                    Direct Messages
                  </h3>
                  <span className="text-[10px] sm:text-[11px] font-bold text-emerald-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Sync
                  </span>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3 top-2.5">
                    search
                  </span>
                  <input
                    type="text"
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                    placeholder="Search connected engineers & mentors..."
                    className="w-full bg-slate-100 dark:bg-slate-800/60 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none border border-transparent focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 min-h-0">
                {users
                  .filter((u) => u.name.toLowerCase().includes(chatSearch.toLowerCase()) || u.company.toLowerCase().includes(chatSearch.toLowerCase()))
                  .map((peerUser) => {
                    const conv = conversations.find((c) => c.participant.id === peerUser.id);
                    const isSelected = activeChatUser?.id === peerUser.id;

                    return (
                      <div
                        key={peerUser.id}
                        onClick={() => setActiveChatUser(peerUser)}
                        className={`p-3 sm:p-3.5 flex items-center gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-50 dark:bg-purple-950/40 border-l-4 border-purple-600'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={peerUser.avatarUrl}
                            alt={peerUser.name}
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                          {peerUser.onlineStatus === 'online' && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#131b2e]" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {peerUser.name}
                            </h4>
                            <span className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                              {conv?.lastMessageTime || 'Online'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                            {conv?.lastMessage || `${peerUser.role} @ ${peerUser.company}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Active Chat Conversation Area (Col 6-12) */}
            <div
              className={`md:col-span-7 lg:col-span-8 flex flex-col h-full min-h-0 bg-slate-50/50 dark:bg-[#0f172a]/50 ${
                !activeChatUser ? 'hidden md:flex items-center justify-center' : 'flex'
              }`}
            >
              {activeChatUser && activeConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 sm:p-4 bg-white dark:bg-[#131b2e] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <button
                        onClick={() => setActiveChatUser(null)}
                        className="md:hidden p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white shrink-0"
                      >
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                      </button>
                      <div
                        onClick={() => {
                          setViewingUser(activeChatUser);
                          setActiveTab('profile');
                        }}
                        className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group min-w-0"
                      >
                        <div className="relative shrink-0">
                          <img
                            src={activeChatUser.avatarUrl}
                            alt={activeChatUser.name}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors truncate">
                            {activeChatUser.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {activeChatUser.role} @ {activeChatUser.company}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* View Profile Action */}
                    <button
                      onClick={() => {
                        setViewingUser(activeChatUser);
                        setActiveTab('profile');
                      }}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-purple-600 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span className="material-symbols-outlined text-[14px]">account_circle</span>
                      <span className="hidden xs:inline">View Profile</span>
                    </button>
                  </div>

                  {/* Messages Bubble Area */}
                  <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 min-h-0">
                    {activeConversation.messages.length === 0 ? (
                      <div className="text-center py-10 sm:py-12 text-slate-400">
                        <span className="material-symbols-outlined text-4xl text-purple-400 mb-2">
                          waving_hand
                        </span>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Start a direct conversation with {activeChatUser.name}!
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                          Ask for career advice, discuss system design challenges, or explore team openings.
                        </p>
                      </div>
                    ) : (
                      activeConversation.messages.map((msg) => {
                        const isMe = msg.senderId === currentUserMapped.id || msg.senderId === 'current-user-real' || msg.senderId === 'current-user';

                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[85%] sm:max-w-md px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words ${
                                isMe
                                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-none shadow-xs'
                                  : 'bg-white dark:bg-[#1a233a] text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200/80 dark:border-slate-800 shadow-xs'
                              }`}
                            >
                              {msg.content}
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Message Input Box */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-2.5 sm:p-3 bg-white dark:bg-[#131b2e] border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0"
                  >
                    <input
                      type="text"
                      value={chatMessageText}
                      onChange={(e) => setChatMessageText(e.target.value)}
                      placeholder={`Message ${activeChatUser.name.split(' ')[0]}...`}
                      className="flex-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none border border-transparent focus:border-purple-500 min-w-0"
                    />
                    <button
                      type="submit"
                      disabled={!chatMessageText.trim()}
                      className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white disabled:opacity-40 hover:from-purple-500 hover:to-indigo-500 transition-all cursor-pointer shrink-0 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[18px]">send</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-16 sm:py-20 text-slate-400 px-4">
                  <span className="material-symbols-outlined text-4xl sm:text-5xl text-purple-400 mb-2">
                    chat
                  </span>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Select a Peer or Mentor to Chat
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Connect directly with engineers at Google, Stripe, and student builders.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PROFILE TAB: Professional Info, Skills, Certificates, Library */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="max-w-5xl mx-auto w-full px-3 sm:px-6 py-5 pb-28 space-y-4 sm:space-y-6 flex-1 min-w-0">
          {/* Top Banner & Profile Header */}
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
            {/* Cover Image */}
            <div className="h-28 sm:h-40 w-full relative bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900">
              {activeProfile.coverUrl && (
                <img
                  src={activeProfile.coverUrl}
                  alt="Profile Cover"
                  className="w-full h-full object-cover opacity-80"
                />
              )}
              {isViewingSelf && (
                <button
                  onClick={() => setShowEditProfileModal(true)}
                  className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 px-2.5 sm:px-3 py-1 rounded-xl bg-black/40 hover:bg-black/60 text-white text-[11px] sm:text-xs font-bold backdrop-blur-xs flex items-center gap-1 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                  <span className="hidden xs:inline">Edit Cover & Info</span>
                  <span className="xs:hidden">Edit</span>
                </button>
              )}
            </div>

            {/* Avatar & Main Info */}
            <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-0 relative">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 -mt-10 sm:-mt-14 mb-3 sm:mb-4">
                <div className="relative inline-block self-start">
                  <img
                    src={activeProfile.avatarUrl}
                    alt={activeProfile.name}
                    className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white dark:border-[#131b2e] shadow-lg"
                  />
                  {activeProfile.onlineStatus === 'online' && (
                    <span className="absolute bottom-1 right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[#131b2e]" />
                  )}
                </div>

                {/* Profile Controls */}
                <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                  {isViewingSelf ? (
                    <>
                      <button
                        onClick={() => {
                          setIsFirstTimeSetup(false);
                          setShowProfileSetupModal(true);
                        }}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                        Edit Profile & Handle
                      </button>
                      <button
                        onClick={() => setShowAccessRequestsModal(true)}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-purple-200 dark:border-purple-800"
                      >
                        <span className="material-symbols-outlined text-[16px]">lock_open</span>
                        Access Requests ({pendingRequestsForMe.length})
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Follow Button */}
                      <button
                        onClick={() => handleFollowToggle(activeProfile)}
                        className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                          activeProfile.isFollowing
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {activeProfile.isFollowing ? 'check' : 'person_add'}
                        </span>
                        {activeProfile.isFollowing ? 'Following' : '+ Follow'}
                      </button>

                      {/* Message Button */}
                      <button
                        onClick={() => openChatWithUser(activeProfile)}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                      >
                        <span className="material-symbols-outlined text-[16px]">chat</span>
                        Message
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Name, Handle, Headline & Bio */}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                    {activeProfile.name}
                  </h3>
                  <span className="material-symbols-outlined text-blue-500 text-[18px] sm:text-[20px]" title="Verified Profile">
                    verified
                  </span>
                  
                  {/* Relationship Badges */}
                  {!isViewingSelf && (activeProfile.isFriend || (activeProfile.isFollowing && activeProfile.isFollower)) && (
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-black uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">handshake</span>
                      Friend / Connected
                    </span>
                  )}
                  {!isViewingSelf && !(activeProfile.isFriend || (activeProfile.isFollowing && activeProfile.isFollower)) && activeProfile.isFollower && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-[10px] font-black uppercase">
                      Follows You
                    </span>
                  )}

                  {activeProfile.isPrivate && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">lock</span>
                      Private Profile
                    </span>
                  )}
                </div>

                {/* Unique User ID Handle with Copy */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2.5 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">alternate_email</span>
                    {activeProfile.userId || `@${activeProfile.username || 'developer'}`}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeProfile.userId || `@${activeProfile.username || 'developer'}`);
                      showToast('User ID copied to clipboard!');
                    }}
                    className="text-slate-400 hover:text-purple-600 p-1 cursor-pointer transition-colors"
                    title="Copy User ID Handle"
                  >
                    <span className="material-symbols-outlined text-[15px]">content_copy</span>
                  </button>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400 mt-1 break-words">
                  {activeProfile.headline}
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                  <span>{activeProfile.company}</span> • <span>{activeProfile.location}</span>
                </p>

                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-2.5 sm:mt-3 leading-relaxed break-words">
                  {activeProfile.bio}
                </p>
              </div>


              {/* Stats Bar */}
              <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6 mt-4 pt-3.5 sm:pt-4 border-t border-slate-100 dark:border-slate-800 text-xs overflow-x-auto">
                <div>
                  <span className="font-extrabold text-slate-900 dark:text-white mr-1">
                    {posts.filter((p) => p.author.id === activeProfile.id || (isViewingSelf && p.author.isCurrentUser)).length}
                  </span>
                  <span className="text-slate-500">Posts</span>
                </div>
                <div>
                  <span className="font-extrabold text-slate-900 dark:text-white mr-1">
                    {activeProfile.followersCount}
                  </span>
                  <span className="text-slate-500">Followers</span>
                </div>
                <div>
                  <span className="font-extrabold text-slate-900 dark:text-white mr-1">
                    {activeProfile.followingCount}
                  </span>
                  <span className="text-slate-500">Following</span>
                </div>
                <div>
                  <span className="font-extrabold text-purple-600 dark:text-purple-400 mr-1">
                    {activeProfile.certificates?.length || 0}
                  </span>
                  <span className="text-slate-500">Certificates</span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Navigation Tabs: Info & Skills | Certificates | Library */}
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] rounded-xl p-1 shadow-xs gap-1">
            {[
              { id: 'info', label: 'Info & Skills', icon: 'psychology' },
              { id: 'certificates', label: `Certificates (${activeProfile.certificates?.length || 0})`, icon: 'military_tech' },
              { id: 'library', label: 'Learning Library', icon: 'local_library', badge: activeProfile.isPrivate && !isViewingSelf ? 'Locked' : 'Active' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setProfileTab(tab.id as any)}
                className={`flex-1 py-2 sm:py-2.5 px-1 sm:px-2 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                  profileTab === tab.id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
                }`}
              >
                <span className="material-symbols-outlined text-[15px] sm:text-[16px] shrink-0">{tab.icon}</span>
                <span className="truncate">{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded shrink-0 hidden xs:inline ${
                      profileTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab 1: Info & Skills */}
          {profileTab === 'info' && (
            <div className="space-y-6">
              {/* Verified Skills */}
              <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-purple-600">verified</span>
                  Verified Technical Skills & Endorsements
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeProfile.skills.map((skill, idx) => (
                    <div
                      key={idx}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <span>{skill}</span>
                      <span className="text-[10px] text-purple-500 font-semibold">✓ Verified</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interests & Focus Areas */}
              {activeProfile.interests && activeProfile.interests.length > 0 && (
                <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">interests</span>
                    Interests & Focus Areas
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {activeProfile.interests.map((interest, idx) => (
                      <span
                        key={idx}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[13px]">tag</span>
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}


              {/* Shipped Projects */}
              {activeProfile.projects && activeProfile.projects.length > 0 && (
                <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-indigo-600">code_blocks</span>
                    Key Projects & Repositories
                  </h4>
                  <div className="space-y-3">
                    {activeProfile.projects.map((proj) => (
                      <div
                        key={proj.id}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {proj.title}
                            {proj.stars && (
                              <span className="text-[10px] text-amber-500 font-bold flex items-center">
                                ★ {proj.stars}
                              </span>
                            )}
                          </h5>
                          {proj.githubUrl && (
                            <a
                              href={proj.githubUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-purple-600 hover:underline flex items-center gap-0.5"
                            >
                              <span className="material-symbols-outlined text-[14px]">link</span>
                              GitHub
                            </a>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">{proj.description}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {proj.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[10px] font-medium rounded-md border border-slate-200 dark:border-slate-700"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Certificates */}
          {profileTab === 'certificates' && (
            <div className="space-y-4">
              {activeProfile.certificates && activeProfile.certificates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeProfile.certificates.map((cert) => (
                    <div
                      key={cert.serialId}
                      onClick={() => setSelectedCertificatePreview(cert)}
                      className="bg-white dark:bg-[#131b2e] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-purple-400 transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-400/30 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">verified</span>
                            Official Record
                          </span>
                          <span className="text-[10px] text-slate-400">{cert.issueDate}</span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
                          {cert.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Issuer: {cert.organization} • Serial: {cert.serialId}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-purple-600">
                        <span>View Verified Credential</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-10 text-center border border-slate-200/80 dark:border-slate-800/80 text-slate-400">
                  <span className="material-symbols-outlined text-4xl text-amber-500 mb-2">
                    military_tech
                  </span>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    No verified certificates earned yet
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Complete YouTube learning tracks or courses to issue verifiable credentials.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Library (Currently Learning) with Privacy Enforcement */}
          {profileTab === 'library' && (
            <div className="space-y-4">
              {/* Privacy Enforcement Check */}
              {activeProfile.isPrivate && !isViewingSelf && !activeProfile.hasAccessToLibrary ? (
                /* Locked Private State */
                <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-8 text-center border border-purple-300/60 dark:border-purple-800/60 shadow-lg relative overflow-hidden">
                  <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-4 border border-purple-300 dark:border-purple-700">
                    <span className="material-symbols-outlined text-[32px]">lock</span>
                  </div>

                  <h4 className="text-lg font-black text-slate-900 dark:text-white">
                    Private Learning Library
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                    {activeProfile.name} has restricted their active learning tracks, enrolled courses, and watch progress to approved connections.
                  </p>

                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                    {activeProfile.isAccessRequested ? (
                      <div className="px-5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] animate-spin">
                          hourglass_top
                        </span>
                        Access Requested — Pending Approval from {activeProfile.name.split(' ')[0]}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRequestLibraryAccess(activeProfile.id)}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">key</span>
                        Request Access to Learning Library
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Unlocked / Public Library Items */
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-purple-600">
                          local_library
                        </span>
                        Currently Learning & Active Curriculum
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Real-time watch progress, chapter tracking & study notes
                      </p>
                    </div>

                    {isViewingSelf && (
                      <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {activeProfile.isPrivate ? 'Private to Connections' : 'Public to Network'}
                      </span>
                    )}
                  </div>

                  {/* Library Items List */}
                  {activeProfile.libraryItems && activeProfile.libraryItems.length > 0 ? (
                    <div className="space-y-3">
                      {activeProfile.libraryItems.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white dark:bg-[#131b2e] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 shrink-0">
                              <span className="material-symbols-outlined text-[22px]">
                                {item.type === 'youtube_track' ? 'play_lesson' : 'menu_book'}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.2 rounded text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {item.providerOrChannel}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Last active: {item.lastStudiedAt}
                                </span>
                              </div>
                              <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                                {item.title}
                              </h5>
                              <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                                {item.currentLessonOrChapter}
                              </p>
                            </div>
                          </div>

                          {/* Progress Gauge & Stats */}
                          <div className="sm:w-48 shrink-0 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-slate-500">Progress</span>
                              <span className="text-purple-600">{item.progressPercentage}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-600"
                                style={{ width: `${item.progressPercentage}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 block text-right">
                              {item.totalDurationOrModules}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-8 text-center border border-slate-200/80 dark:border-slate-800/80 text-slate-400">
                      <span className="material-symbols-outlined text-4xl text-purple-400 mb-2">
                        school
                      </span>
                      <h5 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        No active courses in library
                      </h5>
                      <p className="text-xs text-slate-500 mt-1">
                        Enroll in Courses or launch a YouTube Skill Track to populate your live library!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* BOTTOM NAVIGATION ONLY: Home | Chat | Profile */}
      {/* ========================================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 py-2.5 px-6 shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {/* Home Tab */}
          <button
            onClick={() => {
              setActiveTab('home');
              setViewingUser(null);
            }}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors relative ${
              activeTab === 'home'
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[24px] ${
                activeTab === 'home' ? 'fill-1 font-black scale-110' : ''
              }`}
            >
              home
            </span>
            <span className="text-[10px] font-extrabold tracking-tight">Home</span>
          </button>

          {/* Chat Tab */}
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors relative ${
              activeTab === 'chat'
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[24px] ${
                activeTab === 'chat' ? 'fill-1 font-black scale-110' : ''
              }`}
            >
              chat_bubble
            </span>
            <span className="text-[10px] font-extrabold tracking-tight">Chat</span>
          </button>

          {/* Profile Tab */}
          <button
            onClick={() => {
              setActiveTab('profile');
              setViewingUser(null);
            }}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors relative ${
              activeTab === 'profile' && isViewingSelf
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full overflow-hidden border-2 transition-all ${
                activeTab === 'profile' && isViewingSelf
                  ? 'border-purple-600 scale-110'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              <img
                src={currentUserMapped.avatarUrl}
                alt={currentUserMapped.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-[10px] font-extrabold tracking-tight">Profile</span>
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* MODALS & DRAWERS */}
      {/* ========================================================================= */}

      {/* 1. Create Post Modal */}
      {showCreatePostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-4 sm:p-6 max-w-lg w-full max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600">post_add</span>
                Create Professional Post
              </h3>
              <button
                onClick={() => setShowCreatePostModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src={currentUserMapped.avatarUrl}
                  alt={currentUserMapped.name}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {currentUserMapped.name}
                  </h4>
                  <p className="text-[10px] text-slate-500">Publishing to Professional Network</p>
                </div>
              </div>

              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What project, architecture insight, or learning milestone are you sharing today?"
                rows={4}
                required
                className="w-full bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none border border-slate-200 dark:border-slate-700 focus:border-purple-500 resize-none"
              />

              {/* Direct Gallery Image Attachment with Preview */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Image Attachment (Gallery Upload)
                </label>
                
                {/* Hidden File Input */}
                <input
                  type="file"
                  accept="image/*"
                  ref={galleryFileInputRef}
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                {!newPostImage ? (
                  <div
                    onClick={() => galleryFileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingImage(true);
                    }}
                    onDragLeave={() => setIsDraggingImage(false)}
                    onDrop={handleImageDrop}
                    className={`w-full border-2 border-dashed rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                      isDraggingImage
                        ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20'
                        : 'border-slate-300 dark:border-slate-700 hover:border-purple-400 bg-slate-50/50 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">add_photo_alternate</span>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Click to upload from gallery or drag & drop
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Supports PNG, JPG, WebP, GIF (direct local upload)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 group">
                    <img
                      src={newPostImage}
                      alt="Post upload preview"
                      className="w-full max-h-56 object-cover"
                    />
                    {/* Overlay Action Buttons */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                      <button
                        type="button"
                        onClick={() => galleryFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-900 text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer transition-transform hover:scale-105"
                      >
                        <span className="material-symbols-outlined text-[16px]">refresh</span>
                        Change Image
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewPostImage('')}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer transition-transform hover:scale-105"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        Remove
                      </button>
                    </div>
                    {/* Permanent small top-right delete button */}
                    <button
                      type="button"
                      onClick={() => setNewPostImage('')}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md"
                      title="Remove image"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Code Snippet Option */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowCodeInput(!showCodeInput)}
                  className="text-xs font-bold text-purple-600 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">code</span>
                  {showCodeInput ? 'Remove Code Snippet' : '+ Attach Code Snippet'}
                </button>

                {showCodeInput && (
                  <div className="mt-2 space-y-2">
                    <select
                      value={newPostCodeLang}
                      onChange={(e) => setNewPostCodeLang(e.target.value)}
                      className="bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white rounded-lg px-2 py-1 outline-none border border-slate-200 dark:border-slate-700"
                    >
                      <option value="typescript">TypeScript / JavaScript</option>
                      <option value="python">Python</option>
                      <option value="go">Go (Golang)</option>
                      <option value="sql">SQL / Postgres</option>
                      <option value="rust">Rust</option>
                    </select>
                    <textarea
                      value={newPostCode}
                      onChange={(e) => setNewPostCode(e.target.value)}
                      placeholder="// Paste code snippet here..."
                      rows={3}
                      className="w-full font-mono bg-slate-900 text-emerald-400 rounded-xl p-3 text-xs outline-none border border-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Attach Verified Certificate */}
              {user.earnedCertificates && user.earnedCertificates.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Attach Verified Certificate
                  </label>
                  <select
                    value={selectedCertForPost?.serialId || ''}
                    onChange={(e) => {
                      const found = user.earnedCertificates?.find((c) => c.serialId === e.target.value);
                      setSelectedCertForPost(found || null);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none border border-slate-200 dark:border-slate-700"
                  >
                    <option value="">-- None --</option>
                    {user.earnedCertificates.map((cert) => (
                      <option key={cert.serialId} value={cert.serialId}>
                        🏆 {cert.title} ({cert.serialId})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreatePostModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPostContent.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-500/20 disabled:opacity-50 cursor-pointer"
                >
                  Publish Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Access Requests Modal / Notification Drawer */}
      {showAccessRequestsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600">lock_open</span>
                Library Access Requests
              </h3>
              <button
                onClick={() => setShowAccessRequestsModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {pendingRequestsForMe.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <span className="material-symbols-outlined text-3xl mb-1">done_all</span>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No pending library access requests
                  </p>
                  <p className="text-[11px] text-slate-500">
                    When connections request access to your private library, they will appear here for approval.
                  </p>
                </div>
              ) : (
                pendingRequestsForMe.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={req.requesterAvatar}
                        alt={req.requesterName}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {req.requesterName}
                        </h5>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{req.requesterHeadline}</p>
                        <span className="text-[9px] text-purple-500 font-semibold">
                          Requested {req.requestedAt}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleRespondToRequest(req.id, 'approved')}
                        className="flex-1 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors cursor-pointer text-center"
                      >
                        Approve Access
                      </button>
                      <button
                        onClick={() => handleRespondToRequest(req.id, 'declined')}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Edit Profile Modal */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Edit Professional Profile
              </h3>
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Target Role / Headline
                </label>
                <input
                  type="text"
                  value={editHeadline}
                  onChange={(e) => setEditHeadline(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none border border-slate-200 dark:border-slate-700"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Professional Bio
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-xs text-slate-900 dark:text-white outline-none border border-slate-200 dark:border-slate-700 resize-none"
                />
              </div>

              {/* Privacy Setting Toggle */}
              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-purple-600 shrink-0">lock</span>
                    <span>Private Learning Library</span>
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                    Require other members to request access before viewing your learning activity.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isPrivateAccount}
                  onChange={(e) => setIsPrivateAccount(e.target.checked)}
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer shrink-0"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Active Story Viewer Modal */}
      {activeStoryUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in">
          <div className="bg-[#131b2e] rounded-3xl p-5 sm:p-6 max-w-sm w-full border border-purple-500/40 text-white shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveStoryUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {/* Story Top Info */}
            <div className="flex items-center gap-3">
              <img
                src={activeStoryUser.avatarUrl}
                alt={activeStoryUser.name}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-purple-400 shrink-0"
              />
              <div className="min-w-0">
                <h4 className="text-sm font-bold truncate">{activeStoryUser.name}</h4>
                <p className="text-[11px] text-purple-300 truncate">{activeStoryUser.company}</p>
              </div>
            </div>

            {/* Active Learning Status */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-purple-950/80 to-slate-900 border border-purple-400/30 space-y-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Currently Studying Live
              </span>
              <h5 className="text-sm sm:text-base font-extrabold text-white break-words">
                {activeStoryUser.currentlyStudyingStory?.courseTitle || 'Advanced Systems Architecture'}
              </h5>
              <p className="text-xs text-slate-300 break-words">
                Topic: {activeStoryUser.currentlyStudyingStory?.topic || 'Distributed Schedulers & Go'}
              </p>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-2">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{ width: `${activeStoryUser.currentlyStudyingStory?.progress || 85}%` }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setViewingUser(activeStoryUser);
                  setActiveStoryUser(null);
                  setActiveTab('profile');
                }}
                className="flex-1 py-2 sm:py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors cursor-pointer text-center"
              >
                View Full Profile
              </button>
              <button
                onClick={() => {
                  openChatWithUser(activeStoryUser);
                  setActiveStoryUser(null);
                }}
                className="px-4 py-2 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Certificate Full Preview Modal */}
      {selectedCertificatePreview && (
        <CertificateGenerationModal
          type={selectedCertificatePreview.type}
          item={{
            id: selectedCertificatePreview.itemId || selectedCertificatePreview.serialId,
            title: selectedCertificatePreview.title,
            skillsTaught: selectedCertificatePreview.skillsValidated,
            provider: selectedCertificatePreview.organization,
            instructor: {
              name: selectedCertificatePreview.instructorOrSpeaker,
              role: selectedCertificatePreview.instructorRole || 'Technical Architect',
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
            },
          } as any}
          user={user}
          onClose={() => setSelectedCertificatePreview(null)}
          onCertificateClaimed={() => {}}
        />
      )}

      {/* 6. First-Time & Edit Connectivity Profile Setup Modal */}
      {showProfileSetupModal && (
        <ConnectivityProfileSetupModal
          user={user}
          existingUsers={users}
          isFirstTime={isFirstTimeSetup}
          onComplete={handleCompleteProfileSetup}
          onClose={() => {
            if (!isFirstTimeSetup) {
              setShowProfileSetupModal(false);
            }
          }}
        />
      )}
    </div>
  );
};

