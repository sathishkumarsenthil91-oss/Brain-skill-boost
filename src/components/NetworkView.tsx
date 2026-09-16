import React, { useState, useEffect } from 'react';
import {
  ViewType,
  UserProfile,
  NetworkUser,
  NetworkPost,
  NetworkComment,
  NetworkConversation,
  FollowRequest,
  GeneratedCertificate,
  UserProject,
} from '../types';
import {
  loadNetworkPosts,
  saveNetworkPosts,
  loadNetworkUsers,
  saveNetworkUsers,
  loadConversations,
  saveConversations,
  loadFollowRequests,
  saveFollowRequests,
} from '../services/networkService';
import { connectivityService } from '../services/supabaseService';

interface NetworkViewProps {
  user: UserProfile;
  onNavigate: (view: ViewType) => void;
  onUpdateUser?: (updated: Partial<UserProfile>) => void;
  initialSelectedUserId?: string;
}

export const NetworkView: React.FC<NetworkViewProps> = ({
  user,
  onNavigate,
  onUpdateUser,
  initialSelectedUserId,
}) => {
  // Navigation tabs within NetworkView
  const [activeTab, setActiveTab] = useState<'feed' | 'network' | 'messages' | 'discover' | 'my-profile'>('feed');
  const [feedFilter, setFeedFilter] = useState<'all' | 'followed' | 'certificates' | 'hiring' | 'code'>('all');
  const [selectedSkillTag, setSelectedSkillTag] = useState<string>('All');
  
  // Data State
  const [posts, setPosts] = useState<NetworkPost[]>(() => loadNetworkPosts(user));
  const [networkUsers, setNetworkUsers] = useState<NetworkUser[]>(() => loadNetworkUsers());
  const [conversations, setConversations] = useState<NetworkConversation[]>(() => loadConversations());
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>(() => loadFollowRequests());

  // Modals & Active Selections
  const [viewingUser, setViewingUser] = useState<NetworkUser | null>(null);
  const [activeConversation, setActiveConversation] = useState<NetworkConversation | null>(conversations[0] || null);
  const [messageInput, setMessageInput] = useState<string>('');
  const [isTypingReply, setIsTypingReply] = useState<boolean>(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Post Form State
  const [newPostContent, setNewPostContent] = useState<string>('');
  const [newPostTags, setNewPostTags] = useState<string>('#WebDev #SoftwareEngineering');
  const [newPostImageUrl, setNewPostImageUrl] = useState<string>('');
  const [newPostCodeSnippet, setNewPostCodeSnippet] = useState<string>('');
  const [selectedCertificateToAttach, setSelectedCertificateToAttach] = useState<GeneratedCertificate | null>(null);
  const [newPollQuestion, setNewPollQuestion] = useState<string>('');
  const [newPollOptions, setNewPollOptions] = useState<string[]>(['', '']);
  const [showPollInputs, setShowPollInputs] = useState<boolean>(false);
  const [showCodeInput, setShowCodeInput] = useState<boolean>(false);
  const [showImageInput, setShowImageInput] = useState<boolean>(false);
  const [commentInputMap, setCommentInputMap] = useState<Record<string, string>>({});

  // Search & Filter
  const [discoverQuery, setDiscoverQuery] = useState<string>('');
  const [discoverCategory, setDiscoverCategory] = useState<'all' | 'mentors' | 'recruiters' | 'alumni'>('all');

  // Sync to local storage
  useEffect(() => {
    saveNetworkPosts(posts);
  }, [posts]);

  useEffect(() => {
    saveNetworkUsers(networkUsers);
  }, [networkUsers]);

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    saveFollowRequests(followRequests);
  }, [followRequests]);

  // Real-Time Supabase Message & Broadcast Subscription Listener
  useEffect(() => {
    connectivityService.fetchConversations(user).then(setConversations).catch(console.error);
    const unsubscribe = connectivityService.subscribeToRealtimeChat(
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

        // Also update currently active open chat window if relevant
        setActiveConversation((currentActive) => {
          if (currentActive && currentActive.participant.id === participant.id) {
            return {
              ...currentActive,
              lastMessage: newMsg.content,
              lastMessageTime: newMsg.timestamp,
              messages: [...currentActive.messages, newMsg],
            };
          }
          return currentActive;
        });

        showToast(`💬 New message from ${participant.name}: "${newMsg.content.substring(0, 32)}..."`);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Handle initial user view if passed
  useEffect(() => {
    if (initialSelectedUserId) {
      const found = networkUsers.find((u) => u.id === initialSelectedUserId);
      if (found) {
        setViewingUser(found);
      }
    }
  }, [initialSelectedUserId, networkUsers]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Convert current user profile into a NetworkUser representation to ensure NO duplicated data
  const currentUserNetworkProfile: NetworkUser = {
    id: 'current-user',
    name: user.name || (user.email ? user.email.split('@')[0] : 'Student Developer'),
    headline: user.headline || `${user.targetRole || 'Full Stack Engineer'} • ${user.college || 'University Institute of Technology'} • ${user.degree || 'B.Tech CSE'}`,
    avatarUrl: user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    company: user.college || 'University',
    role: user.targetRole || 'Full Stack Developer',
    location: user.location || 'San Francisco Bay Area / Remote',
    bio: user.bio || 'Passionate software engineer building resilient web and AI products.',
    followersCount: user.followersCount ?? 428,
    followingCount: user.followingCount ?? 184,
    isFollowing: false,
    isPrivate: user.isPrivateAccount ?? false,
    skills: ['React 19', 'TypeScript', 'Node.js', 'Tailwind CSS', 'Next.js', 'System Architecture', 'Git & GitHub'],
    certificates: user.earnedCertificates || [],
    projects: user.projects || [
      {
        id: 'p1',
        title: 'Real-time Collaborative Whiteboard & Canvas',
        description: 'Ultra-low latency multiplayer canvas powered by WebSockets, React, and TypeScript with live cursor syncing.',
        tags: ['React', 'TypeScript', 'WebSockets', 'Canvas API'],
        githubUrl: user.githubUrl || 'https://github.com',
        demoUrl: user.portfolioUrl || 'https://portfolio.dev',
        date: '2025',
        stars: 340,
      },
      {
        id: 'p2',
        title: 'AI Scam Guard & Career Verification Engine',
        description: 'Automated vulnerability scanner for career postings analyzing fraud signals with Gemini and heuristic security rules.',
        tags: ['Gemini AI', 'Express', 'TypeScript', 'Zod'],
        githubUrl: user.githubUrl || 'https://github.com',
        date: '2026',
        stars: 180,
      },
    ],
    internships: user.internships || [
      {
        id: 'int-1',
        role: 'Full Stack Engineering Intern',
        company: 'TechNova Labs',
        period: 'May 2025 - Aug 2025',
        location: 'Hybrid',
        description: 'Optimized serverless APIs reducing p99 latency by 32% and built automated test coverage.',
        verified: true,
      },
    ],
    achievements: user.achievements || [
      {
        id: 'ach-1',
        title: '1st Place Winner - Global AI Hackathon 2025',
        issuer: 'Google Developer Student Clubs',
        date: 'Oct 2025',
        badge: '🥇 Global 1st Place',
      },
    ],
    onlineStatus: 'online',
  };

  // Follow / Unfollow Handler with Private Account Support
  const handleToggleFollow = (targetUser: NetworkUser) => {
    if (targetUser.isPrivate && !targetUser.isFollowing) {
      // Send follow request
      const nextUsers = networkUsers.map((u) =>
        u.id === targetUser.id ? { ...u, isFollowRequested: !u.isFollowRequested } : u
      );
      setNetworkUsers(nextUsers);
      if (viewingUser?.id === targetUser.id) {
        setViewingUser({ ...viewingUser, isFollowRequested: !viewingUser.isFollowRequested });
      }
      showToast(targetUser.isFollowRequested ? `Cancelled request to ${targetUser.name}` : `Follow request sent to ${targetUser.name} (Private Account)`);
      return;
    }

    const newFollowingStatus = !targetUser.isFollowing;
    const newFollowerCount = newFollowingStatus
      ? targetUser.followersCount + 1
      : Math.max(0, targetUser.followersCount - 1);

    const nextUsers = networkUsers.map((u) => {
      if (u.id === targetUser.id) {
        return {
          ...u,
          isFollowing: newFollowingStatus,
          followersCount: newFollowerCount,
          isFollowRequested: false,
        };
      }
      return u;
    });

    setNetworkUsers(nextUsers);
    if (viewingUser?.id === targetUser.id) {
      setViewingUser({
        ...viewingUser,
        isFollowing: newFollowingStatus,
        followersCount: newFollowerCount,
        isFollowRequested: false,
      });
    }

    connectivityService.toggleFollow(targetUser.id, user);

    // Update current user following count
    if (onUpdateUser) {
      const delta = newFollowingStatus ? 1 : -1;
      onUpdateUser({
        followingCount: Math.max(0, (user.followingCount ?? 184) + delta),
      });
    }

    showToast(newFollowingStatus ? `You are now following ${targetUser.name}` : `Unfollowed ${targetUser.name}`);
  };

  // Follow Request Approval
  const handleApproveFollowRequest = (reqId: string) => {
    const req = followRequests.find((r) => r.id === reqId);
    if (!req) return;
    setFollowRequests((prev) => prev.filter((r) => r.id !== reqId));
    connectivityService.respondToAccessRequest(reqId, 'approved', user);
    if (onUpdateUser) {
      onUpdateUser({
        followersCount: (user.followersCount ?? 428) + 1,
      });
    }
    showToast(`Approved follow request from ${req.requester.name}`);
  };

  const handleDeclineFollowRequest = (reqId: string) => {
    setFollowRequests((prev) => prev.filter((r) => r.id !== reqId));
    connectivityService.respondToAccessRequest(reqId, 'declined', user);
    showToast('Declined follow request');
  };

  // Like / Celebrate Post
  const handleToggleLikePost = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const nextLiked = !p.isLiked;
          const nextLikes = nextLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1);
          return { ...p, isLiked: nextLiked, likesCount: nextLikes };
        }
        return p;
      })
    );
    connectivityService.toggleLike(postId, user);
  };

  // Repost / Share
  const handleToggleRepost = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const nextRep = !p.isReposted;
          const nextCount = nextRep ? p.repostsCount + 1 : Math.max(0, p.repostsCount - 1);
          showToast(nextRep ? 'Post shared to your network feed!' : 'Removed repost');
          return { ...p, isReposted: nextRep, repostsCount: nextCount };
        }
        return p;
      })
    );
  };

  // Poll Voting
  const handleVotePoll = (postId: string, optionId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId && p.poll) {
          if (p.poll.userVotedOptionId === optionId) return p;
          const updatedOptions = p.poll.options.map((opt) => {
            if (opt.id === optionId) return { ...opt, votes: opt.votes + 1 };
            if (opt.id === p.poll?.userVotedOptionId) return { ...opt, votes: Math.max(0, opt.votes - 1) };
            return opt;
          });
          const totalVotes = updatedOptions.reduce((acc, curr) => acc + curr.votes, 0);
          showToast('Vote recorded!');
          return {
            ...p,
            poll: {
              ...p.poll,
              options: updatedOptions,
              userVotedOptionId: optionId,
              totalVotes,
            },
          };
        }
        return p;
      })
    );
  };

  // Add Comment to Post
  const handleAddComment = (postId: string) => {
    const text = commentInputMap[postId]?.trim();
    if (!text) return;

    const newComment: NetworkComment = {
      id: `comm-${Date.now()}-${Math.random()}`,
      authorId: 'current-user',
      authorName: user.name || currentUserNetworkProfile.name,
      authorAvatar: user.avatarUrl || currentUserNetworkProfile.avatarUrl,
      authorHeadline: currentUserNetworkProfile.headline,
      timestamp: 'Just now',
      content: text,
      likesCount: 0,
    };

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            commentsCount: p.commentsCount + 1,
            comments: [...p.comments, newComment],
          };
        }
        return p;
      })
    );

    setCommentInputMap((prev) => ({ ...prev, [postId]: '' }));
    connectivityService.addComment(postId, text, user);
    showToast('Comment posted!');
  };

  // Create Post
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !selectedCertificateToAttach && !newPostCodeSnippet) {
      showToast('Please add some text or attachments to your post.');
      return;
    }

    const tagsArray = newPostTags
      .split(/[\s,]+/)
      .filter((t) => t.trim().length > 0)
      .map((t) => (t.startsWith('#') ? t : `#${t}`));

    let pollData = undefined;
    if (showPollInputs && newPollQuestion.trim()) {
      const validOptions = newPollOptions.filter((o) => o.trim().length > 0);
      if (validOptions.length >= 2) {
        pollData = {
          question: newPollQuestion.trim(),
          options: validOptions.map((text, i) => ({ id: `opt-${i}`, text, votes: 0 })),
          totalVotes: 0,
        };
      }
    }

    const newPost: NetworkPost = {
      id: `post-${Date.now()}`,
      author: {
        id: 'current-user',
        name: user.name || currentUserNetworkProfile.name,
        avatarUrl: user.avatarUrl || currentUserNetworkProfile.avatarUrl,
        headline: currentUserNetworkProfile.headline,
        company: user.college || 'University',
        isCurrentUser: true,
      },
      timestamp: 'Just now',
      content: newPostContent,
      tags: tagsArray,
      skills: ['Full Stack', 'Software Engineering'],
      likesCount: 1,
      isLiked: true,
      commentsCount: 0,
      repostsCount: 0,
      imageUrl: newPostImageUrl.trim() || undefined,
      codeSnippet: showCodeInput && newPostCodeSnippet.trim() ? { language: 'typescript', code: newPostCodeSnippet } : undefined,
      attachedCertificate: selectedCertificateToAttach || undefined,
      poll: pollData,
      comments: [],
    };

    setPosts([newPost, ...posts]);
    connectivityService.createPost(user, {
      content: newPost.content,
      imageUrl: newPost.imageUrl,
      codeSnippet: newPost.codeSnippet,
      attachedCertificate: newPost.attachedCertificate,
      tags: newPost.tags,
    });
    setShowCreatePostModal(false);
    setNewPostContent('');
    setNewPostTags('#WebDev #SoftwareEngineering');
    setNewPostImageUrl('');
    setNewPostCodeSnippet('');
    setSelectedCertificateToAttach(null);
    setShowPollInputs(false);
    setShowCodeInput(false);
    setShowImageInput(false);
    showToast('🎉 Published to your Professional Network Feed!');
  };

  // Real-Time Direct Messaging
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !activeConversation) return;

    const userMsgContent = messageInput.trim();
    setMessageInput('');

    // Send through connectivityService which broadcasts to Supabase Realtime and updates database
    try {
    const { updatedConversations, newMsg } = await connectivityService.sendMessage(
      activeConversation.participant,
      userMsgContent,
      user
    );

    setConversations(updatedConversations);
    setActiveConversation((prev) =>
      prev ? { ...prev, lastMessage: userMsgContent, lastMessageTime: 'Just now', messages: [...prev.messages, newMsg] } : null
    );
    } catch (error: any) {
      setMessageInput(userMsgContent);
      showToast(error.message || 'Message could not be saved. Please try again.');
    }

  };

  // Filtered Posts for Feed
  const filteredPosts = posts.filter((p) => {
    if (feedFilter === 'followed') {
      const isFollowedAuthor = networkUsers.some((u) => u.id === p.author.id && u.isFollowing) || p.author.isCurrentUser;
      if (!isFollowedAuthor) return false;
    }
    if (feedFilter === 'certificates' && !p.attachedCertificate) return false;
    if (feedFilter === 'hiring' && !p.tags.some((t) => t.toLowerCase().includes('hiring') || t.toLowerCase().includes('job') || t.toLowerCase().includes('intern'))) return false;
    if (feedFilter === 'code' && !p.codeSnippet) return false;

    if (selectedSkillTag !== 'All') {
      const matchTag = p.tags.some((t) => t.toLowerCase().includes(selectedSkillTag.toLowerCase()));
      const matchSkill = p.skills.some((s) => s.toLowerCase().includes(selectedSkillTag.toLowerCase()));
      if (!matchTag && !matchSkill) return false;
    }

    return true;
  });

  // Filtered Network Users for Discover
  const filteredDiscoverUsers = networkUsers.filter((u) => {
    const matchQuery =
      u.name.toLowerCase().includes(discoverQuery.toLowerCase()) ||
      u.headline.toLowerCase().includes(discoverQuery.toLowerCase()) ||
      u.company.toLowerCase().includes(discoverQuery.toLowerCase()) ||
      u.skills.some((s) => s.toLowerCase().includes(discoverQuery.toLowerCase()));

    if (discoverCategory === 'mentors' && !u.isMentor) return false;
    if (discoverCategory === 'recruiters' && !u.isRecruiter) return false;
    if (discoverCategory === 'alumni' && !u.isAlumni) return false;

    return matchQuery;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs sm:text-sm font-bold animate-fade-in border border-slate-700">
          <span className="material-symbols-outlined text-[18px] text-purple-400 dark:text-purple-600">verified</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Network Branded Top Header */}
      <div className="bg-gradient-to-r from-[#0d1527] via-[#161f38] to-[#1e1435] text-white rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden border border-white/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-[11px] font-black bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                SKILLNET CAREER NETWORK
              </span>
              <span className="text-xs text-slate-300 font-semibold">14,280 Verified Engineers Online</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
              Industry Professional Network
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Connect with alumni from Google, Stripe, and DeepMind, share verified technical project milestones, discuss system architecture, and fast-track internship hiring.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowCreatePostModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Create Post
            </button>

            <button
              onClick={() => onNavigate('opportunities')}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs rounded-xl border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">work</span>
              Back to Jobs
            </button>
          </div>
        </div>

        {/* Network Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 mt-6 pt-4 border-t border-white/10 overflow-x-auto scrollbar-none">
          {[
            { id: 'feed', label: 'Network Feed', icon: 'dynamic_feed', badge: posts.length },
            { id: 'network', label: 'My Connections', icon: 'group', badge: networkUsers.filter((u) => u.isFollowing).length },
            { id: 'messages', label: 'Direct Messages', icon: 'chat', badge: conversations.reduce((acc, c) => acc + c.unreadCount, 0) },
            { id: 'discover', label: 'Discover People', icon: 'explore' },
            { id: 'my-profile', label: 'My Public Profile', icon: 'account_circle' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'my-profile') {
                  setViewingUser(currentUserNetworkProfile);
                } else if (viewingUser) {
                  setViewingUser(null);
                }
              }}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">{tab.icon}</span>
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === tab.id ? 'bg-purple-600 text-white' : 'bg-purple-500/30 text-purple-300'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Content Routing */}
      {viewingUser ? (
        // Full User Profile View Modal / Subview
        <div className="space-y-6">
          <button
            onClick={() => setViewingUser(null)}
            className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-purple-600 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to {activeTab === 'feed' ? 'Network Feed' : activeTab === 'discover' ? 'Discover' : 'Network'}
          </button>

          {/* Profile Card Header */}
          <div className="bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-lg">
            <div className="h-36 sm:h-48 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 relative">
              {viewingUser.coverUrl && (
                <img
                  src={viewingUser.coverUrl}
                  alt="Cover"
                  className="w-full h-full object-cover opacity-60"
                />
              )}
              {viewingUser.isPrivate && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-xs font-bold flex items-center gap-1 border border-white/20">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  Private Profile
                </div>
              )}
            </div>

            <div className="px-6 pb-6 relative">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 mb-4 gap-4">
                <div className="relative">
                  <img
                    src={viewingUser.avatarUrl}
                    alt={viewingUser.name}
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-white dark:border-[#151f38] shadow-xl bg-slate-800"
                  />
                  <span className={`absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white ${
                    viewingUser.onlineStatus === 'online' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`} />
                </div>

                <div className="flex items-center gap-2">
                  {viewingUser.id !== 'current-user' ? (
                    <>
                      <button
                        onClick={() => {
                          const existingConv = conversations.find((c) => c.participant.id === viewingUser.id);
                          if (existingConv) {
                            setActiveConversation(existingConv);
                          } else {
                            const newConv: NetworkConversation = {
                              id: `conv-${viewingUser.id}`,
                              participant: viewingUser,
                              lastMessage: 'Started conversation',
                              lastMessageTime: 'Just now',
                              unreadCount: 0,
                              messages: [],
                            };
                            setConversations([newConv, ...conversations]);
                            setActiveConversation(newConv);
                          }
                          setActiveTab('messages');
                          setViewingUser(null);
                        }}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">chat</span>
                        Message
                      </button>

                      <button
                        onClick={() => handleToggleFollow(viewingUser)}
                        className={`px-5 py-2 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                          viewingUser.isFollowing
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-rose-100 hover:text-rose-700'
                            : viewingUser.isFollowRequested
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {viewingUser.isFollowing ? 'check' : viewingUser.isFollowRequested ? 'hourglass_top' : 'person_add'}
                        </span>
                        {viewingUser.isFollowing ? 'Following' : viewingUser.isFollowRequested ? 'Requested' : 'Follow'}
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const nextPrivate = !(user.isPrivateAccount ?? false);
                          if (onUpdateUser) {
                            onUpdateUser({ isPrivateAccount: nextPrivate });
                          }
                          setViewingUser({ ...viewingUser, isPrivate: nextPrivate });
                          showToast(`Profile privacy changed to ${nextPrivate ? 'Private' : 'Public'}`);
                        }}
                        className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {viewingUser.isPrivate ? 'lock' : 'public'}
                        </span>
                        {viewingUser.isPrivate ? 'Account: Private' : 'Account: Public'}
                      </button>

                      <button
                        onClick={() => onNavigate('profile')}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        Edit Core Profile
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                    {viewingUser.name}
                  </h2>
                  {viewingUser.isMentor && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold text-[10px] border border-purple-200 dark:border-purple-800">
                      Verified Mentor
                    </span>
                  )}
                  {viewingUser.isRecruiter && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold text-[10px] border border-blue-200 dark:border-blue-800">
                      Talent Partner
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                  {viewingUser.headline}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">location_on</span>
                    {viewingUser.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">business</span>
                    {viewingUser.company}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {viewingUser.followersCount.toLocaleString()} Followers
                  </span>
                  <span>•</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {viewingUser.followingCount.toLocaleString()} Following
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 pt-2 leading-relaxed max-w-3xl">
                  {viewingUser.bio}
                </p>
              </div>
            </div>
          </div>

          {/* Profile Sections Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Certificates, Projects & Internships */}
            <div className="lg:col-span-2 space-y-6">
              {/* Verified Certificates & Courses Completed */}
              <div className="bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">military_tech</span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Verified Certifications & Educational Records
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                    {viewingUser.certificates.length} Credentials
                  </span>
                </div>

                {viewingUser.certificates.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500 space-y-2">
                    <p>No certificates earned yet.</p>
                    {viewingUser.id === 'current-user' && (
                      <button
                        onClick={() => onNavigate('courses')}
                        className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer"
                      >
                        Explore & Complete Courses
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {viewingUser.certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                              {cert.type.toUpperCase()}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">{cert.serialId}</span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {cert.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Issued {cert.issueDate} • {cert.organization}
                          </p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {cert.skillsValidated.map((s, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.2 rounded bg-white dark:bg-slate-900 text-[10px] text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700"
                              >
                                ✓ {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={cert.verificationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
                          >
                            Verify
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

                {/* Projects & Shipped Repos */}
              <div className="bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">code_blocks</span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Featured Engineering Projects
                    </h3>
                  </div>
                </div>

                <div className="space-y-3">
                  {viewingUser.projects.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {proj.title}
                        </h4>
                        {proj.stars && (
                          <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">star</span>
                            {proj.stars}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {proj.description}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex flex-wrap gap-1">
                          {proj.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        {proj.githubUrl && (
                          <a
                            href={proj.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            View Code
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Internships & Experience */}
              <div className="bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">work</span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Experience & Internships
                    </h3>
                  </div>
                </div>

                <div className="space-y-3">
                  {viewingUser.internships.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {exp.role} • <span className="text-purple-600 dark:text-purple-400">{exp.company}</span>
                        </h4>
                        {exp.verified && (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px]">verified</span>
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {exp.period} • {exp.location}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 leading-relaxed">
                        {exp.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col: Skills & Achievements */}
            <div className="space-y-6">
              {/* Verified Skills */}
              <div className="bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600 text-[20px]">psychology</span>
                  Endorsed Technical Skills
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {viewingUser.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-200 border border-purple-200/80 dark:border-purple-800 text-xs font-bold flex items-center gap-1"
                    >
                      <span>{skill}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Achievements & Honors */}
              <div className="bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-[20px]">emoji_events</span>
                  Honors & Achievements
                </h3>
                <div className="space-y-2">
                  {viewingUser.achievements.map((ach) => (
                    <div
                      key={ach.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-0.5"
                    >
                      <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 block">
                        {ach.badge}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{ach.title}</h4>
                      <p className="text-[10px] text-slate-500">{ach.issuer} • {ach.date}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'feed' ? (
        // Personalized Network Feed View
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Mini Sidebar: User Profile Snapshot */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="text-center space-y-2">
                <div
                  onClick={() => setViewingUser(currentUserNetworkProfile)}
                  className="w-16 h-16 rounded-2xl mx-auto overflow-hidden ring-4 ring-purple-500/20 cursor-pointer hover:scale-105 transition-transform"
                >
                  <img
                    src={currentUserNetworkProfile.avatarUrl}
                    alt={currentUserNetworkProfile.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3
                    onClick={() => setViewingUser(currentUserNetworkProfile)}
                    className="text-sm font-extrabold text-slate-900 dark:text-white hover:text-purple-600 cursor-pointer"
                  >
                    {currentUserNetworkProfile.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {currentUserNetworkProfile.headline}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-around text-center text-xs">
                <div>
                  <span className="font-extrabold text-slate-900 dark:text-white block">
                    {currentUserNetworkProfile.followersCount}
                  </span>
                  <span className="text-[10px] text-slate-500">Followers</span>
                </div>
                <div>
                  <span className="font-extrabold text-slate-900 dark:text-white block">
                    {currentUserNetworkProfile.followingCount}
                  </span>
                  <span className="text-[10px] text-slate-500">Following</span>
                </div>
                <div>
                  <span className="font-extrabold text-purple-600 dark:text-purple-400 block">
                    {currentUserNetworkProfile.certificates.length}
                  </span>
                  <span className="text-[10px] text-slate-500">Certificates</span>
                </div>
              </div>

              <button
                onClick={() => setViewingUser(currentUserNetworkProfile)}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                View Full Profile
              </button>
            </div>

            {/* Quick Follow Suggestions */}
            <div className="bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Suggested Mentors & Peers
              </h4>
              <div className="space-y-3">
                {networkUsers.slice(0, 3).map((usr) => (
                  <div key={usr.id} className="flex items-center justify-between gap-2">
                    <div
                      onClick={() => setViewingUser(usr)}
                      className="flex items-center gap-2 truncate cursor-pointer"
                    >
                      <img src={usr.avatarUrl} alt={usr.name} className="w-8 h-8 rounded-xl object-cover" />
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate hover:underline">
                          {usr.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{usr.company}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleFollow(usr)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                        usr.isFollowing
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      {usr.isFollowing ? 'Following' : '+ Follow'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center 3 Cols: Post Composer & Personalized Feed */}
          <div className="lg:col-span-3 space-y-5">
            {/* Quick Post Prompt Bar */}
            <div className="bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs flex items-center gap-3">
              <img
                src={currentUserNetworkProfile.avatarUrl}
                alt="Avatar"
                className="w-10 h-10 rounded-2xl object-cover"
              />
              <button
                onClick={() => setShowCreatePostModal(true)}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-left text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>Share a project update, code snippet, or verified certificate...</span>
                <span className="material-symbols-outlined text-[18px] text-purple-600">edit_note</span>
              </button>
            </div>

            {/* Feed Filter Tabs & Tag Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'all', label: 'All Feed' },
                  { id: 'followed', label: 'Followed Creators' },
                  { id: 'certificates', label: 'Certificates 🎓' },
                  { id: 'hiring', label: 'Jobs & Hiring 📢' },
                  { id: 'code', label: 'Code & Tech 💻' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFeedFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      feedFilter === f.id
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-white dark:bg-[#151f38] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Tag Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                {['All', 'React', 'TypeScript', 'SystemDesign', 'AI', 'Kubernetes'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedSkillTag(tag)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      selectedSkillTag === tag
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Posts List */}
            {filteredPosts.length === 0 ? (
              <div className="bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3">
                <span className="material-symbols-outlined text-[40px] text-purple-400">dynamic_feed</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {posts.length === 0
                    ? 'No posts yet. Share an update, certificate, or project with your network!'
                    : 'No posts found in this filter.'}
                </p>
                {posts.length === 0 ? (
                  <button
                    onClick={() => setShowCreatePostModal(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-transform active:scale-95"
                  >
                    + Create Your First Post
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setFeedFilter('all');
                      setSelectedSkillTag('All');
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Reset Feed Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4"
                  >
                    {/* Post Author Row */}
                    <div className="flex items-center justify-between">
                      <div
                        onClick={() => {
                          const authorUser = networkUsers.find((u) => u.id === post.author.id);
                          if (authorUser) {
                            setViewingUser(authorUser);
                          } else if (post.author.isCurrentUser) {
                            setViewingUser(currentUserNetworkProfile);
                          }
                        }}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <img
                          src={post.author.avatarUrl}
                          alt={post.author.name}
                          className="w-11 h-11 rounded-2xl object-cover group-hover:scale-105 transition-transform"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
                              {post.author.name}
                            </h4>
                            <span className="text-[10px] text-slate-400">• {post.timestamp}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {post.author.headline}
                          </p>
                        </div>
                      </div>

                      {/* Follow Button if not current user */}
                      {!post.author.isCurrentUser && (
                        <button
                          onClick={() => {
                            const authorUser = networkUsers.find((u) => u.id === post.author.id);
                            if (authorUser) handleToggleFollow(authorUser);
                          }}
                          className="px-3 py-1 rounded-xl text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
                        >
                          {networkUsers.find((u) => u.id === post.author.id)?.isFollowing ? 'Following' : '+ Follow'}
                        </button>
                      )}
                    </div>

                    {/* Post Content */}
                    <div className="space-y-3">
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                        {post.content}
                      </p>

                      {/* Attached Code Snippet */}
                      {post.codeSnippet && (
                        <div className="rounded-2xl bg-slate-950 text-slate-100 p-4 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-400 font-bold uppercase">
                            <span>{post.codeSnippet.language} Code Snippet</span>
                            <span className="material-symbols-outlined text-[14px]">terminal</span>
                          </div>
                          <pre className="leading-relaxed">{post.codeSnippet.code}</pre>
                        </div>
                      )}

                      {/* Attached Poll */}
                      {post.poll && (
                        <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-extrabold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px]">poll</span>
                              {post.poll.question}
                            </h5>
                            <span className="text-[10px] font-bold text-slate-500">
                              {post.poll.totalVotes} Total Votes
                            </span>
                          </div>

                          <div className="space-y-2">
                            {post.poll.options.map((opt) => {
                              const isVoted = post.poll?.userVotedOptionId === opt.id;
                              const pct = post.poll?.totalVotes && post.poll.totalVotes > 0
                                ? Math.round((opt.votes / post.poll.totalVotes) * 100)
                                : 0;

                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => handleVotePoll(post.id, opt.id)}
                                  className={`w-full p-2.5 rounded-xl border text-left text-xs font-bold relative overflow-hidden transition-all cursor-pointer ${
                                    isVoted
                                      ? 'border-purple-600 bg-purple-100/80 dark:bg-purple-900/60 text-purple-950 dark:text-white'
                                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-purple-400'
                                  }`}
                                >
                                  {/* Progress fill */}
                                  <div
                                    className="absolute top-0 left-0 bottom-0 bg-purple-200/50 dark:bg-purple-600/20 transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                  <div className="relative z-10 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                      {isVoted && <span className="text-purple-600">✓</span>}
                                      {opt.text}
                                    </span>
                                    <span className="text-[11px] font-mono text-purple-700 dark:text-purple-300">
                                      {pct}% ({opt.votes})
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Attached Verified Certificate */}
                      {post.attachedCertificate && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 border-2 border-amber-400/40 dark:border-amber-500/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">verified</span>
                              VERIFIED CREDENTIAL EARNED
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {post.attachedCertificate.serialId}
                            </span>
                          </div>

                          <h5 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                            {post.attachedCertificate.title}
                          </h5>

                          <p className="text-[11px] text-slate-600 dark:text-slate-300">
                            Issued to <strong>{post.attachedCertificate.recipientName}</strong> by {post.attachedCertificate.organization}
                          </p>

                          <div className="flex flex-wrap gap-1 pt-1">
                            {post.attachedCertificate.skillsValidated.map((sk, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-[10px] font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                              >
                                ✓ {sk}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Attached Image */}
                      {post.imageUrl && (
                        <div className="rounded-2xl overflow-hidden max-h-96 bg-slate-900">
                          <img
                            src={post.imageUrl}
                            alt="Attachment"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {post.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Post Engagement Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <button
                          onClick={() => handleToggleLikePost(post.id)}
                          className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
                            post.isLiked
                              ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[17px]">
                            {post.isLiked ? 'favorite' : 'favorite_border'}
                          </span>
                          <span>{post.likesCount}</span>
                        </button>

                        <button
                          onClick={() => {
                            setCommentInputMap((prev) => ({
                              ...prev,
                              [post.id]: prev[post.id] || '',
                            }));
                          }}
                          className="px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[17px]">chat_bubble_outline</span>
                          <span>{post.commentsCount}</span>
                        </button>

                        <button
                          onClick={() => handleToggleRepost(post.id)}
                          className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
                            post.isReposted
                              ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[17px]">repeat</span>
                          <span>{post.repostsCount}</span>
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`https://brainboost.ai/posts/${post.id}`);
                          showToast('Post link copied to clipboard!');
                        }}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                        title="Share Link"
                      >
                        <span className="material-symbols-outlined text-[17px]">share</span>
                      </button>
                    </div>

                    {/* Threaded Comments Section */}
                    {post.comments.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {post.comments.map((comm) => (
                          <div
                            key={comm.id}
                            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5 text-xs"
                          >
                            <img
                              src={comm.authorAvatar}
                              alt={comm.authorName}
                              className="w-7 h-7 rounded-xl object-cover shrink-0 mt-0.5"
                            />
                            <div className="space-y-0.5 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-900 dark:text-white">
                                  {comm.authorName}
                                </span>
                                <span className="text-[10px] text-slate-400">{comm.timestamp}</span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                {comm.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Comment Input Box */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={commentInputMap[post.id] || ''}
                        onChange={(e) =>
                          setCommentInputMap((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(post.id);
                        }}
                        placeholder="Write a comment..."
                        className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white outline-none focus:border-purple-500"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                      >
                        Post
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'network' ? (
        // My Network & Connections Tab (Followers, Following, Requests)
        <div className="space-y-6">
          {/* Follow Requests Alert Bar for Private Accounts */}
          {followRequests.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-[20px]">mark_email_unread</span>
                  <h3 className="text-xs sm:text-sm font-extrabold text-amber-900 dark:text-amber-200">
                    Pending Follow Requests ({followRequests.length})
                  </h3>
                </div>
                <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                  Manage incoming connections for your account
                </span>
              </div>

              <div className="space-y-2">
                {followRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200/80 dark:border-amber-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <img src={req.requester.avatarUrl} alt="Req" className="w-9 h-9 rounded-xl object-cover" />
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {req.requester.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{req.requester.headline}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveFollowRequest(req.id)}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleDeclineFollowRequest(req.id)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Following List */}
          <div className="bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Professionals You Follow ({networkUsers.filter((u) => u.isFollowing).length})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {networkUsers
                .filter((u) => u.isFollowing)
                .map((usr) => (
                  <div
                    key={usr.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 flex flex-col justify-between"
                  >
                    <div
                      onClick={() => setViewingUser(usr)}
                      className="flex items-start gap-3 cursor-pointer group"
                    >
                      <img src={usr.avatarUrl} alt={usr.name} className="w-12 h-12 rounded-2xl object-cover" />
                      <div className="truncate flex-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 truncate">
                          {usr.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                          {usr.headline}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <button
                        onClick={() => {
                          const existingConv = conversations.find((c) => c.participant.id === usr.id);
                          if (existingConv) {
                            setActiveConversation(existingConv);
                          } else {
                            const newConv: NetworkConversation = {
                              id: `conv-${usr.id}`,
                              participant: usr,
                              lastMessage: 'Started conversation',
                              lastMessageTime: 'Just now',
                              unreadCount: 0,
                              messages: [],
                            };
                            setConversations([newConv, ...conversations]);
                            setActiveConversation(newConv);
                          }
                          setActiveTab('messages');
                        }}
                        className="flex-1 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        Message
                      </button>

                      <button
                        onClick={() => handleToggleFollow(usr)}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 hover:text-rose-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Unfollow
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'messages' ? (
        // Real-Time Direct Messaging / Messenger Tab
        <div className="bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-lg grid grid-cols-1 md:grid-cols-3 min-h-[550px]">
          {/* Left Chat List */}
          <div className="md:col-span-1 border-r border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                Direct Conversations
              </h3>
              <span className="text-[10px] font-bold text-purple-600">{conversations.length} Active</span>
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-[460px]">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversation(conv)}
                  className={`p-3 rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${
                    activeConversation?.id === conv.id
                      ? 'bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={conv.participant.avatarUrl}
                      alt={conv.participant.name}
                      className="w-10 h-10 rounded-2xl object-cover"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
                  </div>

                  <div className="truncate flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {conv.participant.name}
                      </h4>
                      <span className="text-[10px] text-slate-400">{conv.lastMessageTime}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {conv.lastMessage}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Active Message Thread */}
          <div className="md:col-span-2 flex flex-col justify-between p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/30">
            {activeConversation ? (
              <>
                {/* Active Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div
                    onClick={() => setViewingUser(activeConversation.participant)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <img
                      src={activeConversation.participant.avatarUrl}
                      alt="Avatar"
                      className="w-10 h-10 rounded-2xl object-cover"
                    />
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
                        {activeConversation.participant.name}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {activeConversation.participant.headline}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setViewingUser(activeConversation.participant)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                  >
                    View Profile
                  </button>
                </div>

                {/* Messages Stream */}
                <div className="py-4 space-y-3 overflow-y-auto max-h-[360px] flex-1">
                  {activeConversation.messages.map((msg) => {
                    const isMine = msg.senderId === 'current-user';
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed space-y-1 shadow-xs ${
                            isMine
                              ? 'bg-purple-600 text-white rounded-br-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-xs'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <span
                            className={`text-[9px] block text-right font-mono ${
                              isMine ? 'text-purple-200' : 'text-slate-400'
                            }`}
                          >
                            {msg.timestamp}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {isTypingReply && (
                    <div className="flex justify-start">
                      <div className="px-4 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 flex items-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                        {activeConversation.participant.name} is typing...
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Input Box */}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={`Message ${activeConversation.participant.name}...`}
                    className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-purple-500 shadow-xs"
                  />
                  <button
                    type="submit"
                    className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Send</span>
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-20 text-slate-500 text-xs">
                Select a conversation from the left to start direct messaging.
              </div>
            )}
          </div>
        </div>
      ) : (
        // Discover People & Opportunities Tab
        <div className="space-y-6">
          {/* Search & Category Filter */}
          <div className="bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-3.5 top-3 text-slate-400 text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  value={discoverQuery}
                  onChange={(e) => setDiscoverQuery(e.target.value)}
                  placeholder="Search professionals by role, skill (e.g. Go, React, AI), or company (Google, Stripe)..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'mentors', label: 'Mentors' },
                  { id: 'recruiters', label: 'Recruiters' },
                  { id: 'alumni', label: 'Alumni' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setDiscoverCategory(cat.id as any)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      discoverCategory === cat.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* People Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDiscoverUsers.map((usr) => (
              <div
                key={usr.id}
                className="bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-xl transition-all"
              >
                <div
                  onClick={() => setViewingUser(usr)}
                  className="space-y-3 cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <img src={usr.avatarUrl} alt={usr.name} className="w-14 h-14 rounded-2xl object-cover group-hover:scale-105 transition-transform" />
                    <div className="truncate flex-1">
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 truncate">
                        {usr.name}
                      </h4>
                      <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold truncate">
                        {usr.company}
                      </p>
                      <p className="text-[10px] text-slate-500">{usr.location}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {usr.headline}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {usr.skills.slice(0, 3).map((sk, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setViewingUser(usr)}
                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    View Profile
                  </button>

                  <button
                    onClick={() => handleToggleFollow(usr)}
                    className={`px-4 py-2 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer ${
                      usr.isFollowing
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                        : usr.isFollowRequested
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    {usr.isFollowing ? 'Following' : usr.isFollowRequested ? 'Requested' : '+ Follow'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {showCreatePostModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <img src={currentUserNetworkProfile.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-xl object-cover" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Create a Network Post
                  </h3>
                  <span className="text-[10px] text-slate-500">Posting as {currentUserNetworkProfile.name}</span>
                </div>
              </div>

              <button
                onClick={() => setShowCreatePostModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What technical project, milestone, or architectural learning would you like to share?"
                rows={4}
                className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-slate-900 dark:text-white outline-none focus:border-purple-500"
                autoFocus
              />

              {/* Attachments Picker Row */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowCodeInput(!showCodeInput)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer ${
                    showCodeInput ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">code</span>
                  Code
                </button>

                <button
                  type="button"
                  onClick={() => setShowPollInputs(!showPollInputs)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer ${
                    showPollInputs ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">poll</span>
                  Poll
                </button>

                <button
                  type="button"
                  onClick={() => setShowImageInput(!showImageInput)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer ${
                    showImageInput ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">image</span>
                  Image
                </button>

                {/* Certificate Attachment Select */}
                {user.earnedCertificates && user.earnedCertificates.length > 0 && (
                  <select
                    value={selectedCertificateToAttach?.id || ''}
                    onChange={(e) => {
                      const cert = user.earnedCertificates?.find((c) => c.id === e.target.value) || null;
                      setSelectedCertificateToAttach(cert);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="">+ Attach Earned Certificate</option>
                    {user.earnedCertificates.map((c) => (
                      <option key={c.id} value={c.id}>
                        🎓 {c.title} ({c.serialId})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Code Snippet Box */}
              {showCodeInput && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Paste Code Snippet</span>
                  <textarea
                    value={newPostCodeSnippet}
                    onChange={(e) => setNewPostCodeSnippet(e.target.value)}
                    placeholder="// Paste TypeScript, Go, or Python code here..."
                    rows={3}
                    className="w-full text-xs font-mono bg-slate-950 text-slate-100 border border-slate-800 rounded-xl p-3 outline-none"
                  />
                </div>
              )}

              {/* Image URL Input */}
              {showImageInput && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Image URL</span>
                  <input
                    type="url"
                    value={newPostImageUrl}
                    onChange={(e) => setNewPostImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              )}

              {/* Poll Inputs */}
              {showPollInputs && (
                <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 space-y-2">
                  <span className="text-[10px] font-black text-purple-900 dark:text-purple-300 uppercase">Create a Technical Poll</span>
                  <input
                    type="text"
                    value={newPollQuestion}
                    onChange={(e) => setNewPollQuestion(e.target.value)}
                    placeholder="Poll Question (e.g. Which stack do you prefer for 2026?)"
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-800 rounded-xl px-3 py-2 outline-none"
                  />
                  {newPollOptions.map((opt, i) => (
                    <input
                      key={i}
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...newPollOptions];
                        next[i] = e.target.value;
                        setNewPollOptions(next);
                      }}
                      placeholder={`Option ${i + 1}`}
                      className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 outline-none"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setNewPollOptions([...newPollOptions, ''])}
                    className="text-[11px] font-bold text-purple-600 hover:underline cursor-pointer"
                  >
                    + Add Option
                  </button>
                </div>
              )}

              {/* Tags Input */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Tags & Topics</span>
                <input
                  type="text"
                  value={newPostTags}
                  onChange={(e) => setNewPostTags(e.target.value)}
                  placeholder="#React #DistributedSystems #CareerMilestone"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreatePostModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Publish Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
