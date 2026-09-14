import { SupabaseClient } from '@supabase/supabase-js';
import { supabase as existingSupabaseClient } from '../supabaseClient';
import {
  NetworkUser,
  NetworkPost,
  NetworkConversation,
  NetworkMessage,
  UserLibraryItem,
  LibraryAccessRequest,
  UserProfile,
  GeneratedCertificate,
  SkillItem,
  RoadmapNode,
  CourseItem,
  OpportunityItem,
  CertificationItem,
  WebinarItem,
  AssignmentItem,
  IndustryTool,
} from '../types';
import {
  initialCourses,
  initialOpportunities,
  initialCertifications,
  initialWebinars,
  initialAssignments,
  initialIndustryTools,
  initialRoadmapNodes,
} from '../data/mockData';

export function getSupabaseClient(): SupabaseClient | null {
  if (existingSupabaseClient) {
    return existingSupabaseClient as unknown as SupabaseClient;
  }
  return null;
}

export const isSupabaseConfigured = (): boolean => {
  return Boolean(existingSupabaseClient);
};

// Local storage persistent keys for backup / fast offline cache
const getStorageKey = (baseKey: string, user?: UserProfile): string => {
  const userIdentifier = user?.email
    ? user.email.toLowerCase().replace(/[^a-z0-9]/g, '_')
    : 'default_account';
  return `${baseKey}_${userIdentifier}`;
};

const BASE_STORAGE_KEYS = {
  USERS: 'industryskill_connectivity_users_v4',
  POSTS: 'industryskill_connectivity_posts_v4',
  MESSAGES: 'industryskill_connectivity_messages_v4',
  LIBRARY_REQUESTS: 'industryskill_library_requests_v4',
  USER_LIBRARIES: 'industryskill_user_libraries_v4',
  SETUP_DONE: 'industryskill_connectivity_setup_done_v4',
};

// Map a raw Supabase profile row into a clean NetworkUser object
export function mapRowToNetworkUser(row: any, currentUserId?: string): NetworkUser {
  const rawHandle = row.username || (row.email ? row.email.split('@')[0] : 'developer');
  const cleanUsername = rawHandle.replace(/^@/, '');
  const handleWithAt = `@${cleanUsername}`;

  let skillsArray: string[] = [];
  if (Array.isArray(row.skills)) {
    skillsArray = row.skills;
  } else if (typeof row.skills === 'string') {
    try {
      skillsArray = JSON.parse(row.skills);
    } catch {
      skillsArray = row.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }
  if (!skillsArray.length) {
    skillsArray = ['Software Engineering', 'TypeScript', 'React'];
  }

  let interestsArray: string[] = [];
  if (Array.isArray(row.interests)) {
    interestsArray = row.interests;
  } else if (typeof row.interests === 'string') {
    try {
      interestsArray = JSON.parse(row.interests);
    } catch {
      interestsArray = row.interests.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }

  return {
    id: row.id || (row.email ? `usr-${row.email.replace(/[^a-zA-Z0-9]/g, '_')}` : 'unknown-user'),
    userId: handleWithAt,
    username: cleanUsername,
    name: row.name || (row.email ? row.email.split('@')[0] : 'Verified Member'),
    headline:
      row.headline ||
      `${row.target_role || row.targetRole || 'Full Stack Engineer'} • ${row.college || 'Tech Institute'}`,
    avatarUrl:
      row.avatar_url ||
      row.avatarUrl ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    coverUrl:
      row.cover_url ||
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
    company: row.college || row.company || 'Brainboost Academy',
    role: row.target_role || row.targetRole || 'Developer',
    location: row.location || 'Remote',
    bio: row.bio || 'Passionate developer building verified projects and connecting with peers in real-time.',
    followersCount: Number(row.followers_count ?? row.followersCount ?? 0),
    followingCount: Number(row.following_count ?? row.followingCount ?? 0),
    isFollowing: false,
    isFollower: false,
    isFriend: false,
    isPrivate: Boolean(row.is_private_account ?? row.isPrivate),
    isLibraryPrivate: Boolean(row.is_private_account ?? row.isPrivate),
    hasAccessToLibrary: !Boolean(row.is_private_account ?? row.isPrivate),
    skills: skillsArray,
    interests: interestsArray.length ? interestsArray : ['Web Development', 'Cloud Architecture'],
    certificates: [],
    libraryItems: [],
    projects: [],
    internships: [],
    achievements: [],
    onlineStatus: 'online',
  };
}

// Convert current user profile into a real NetworkUser
export function mapProfileToNetworkUser(user: UserProfile, libraryItems?: UserLibraryItem[]): NetworkUser {
  const generatedHandle =
    user.userId ||
    user.username ||
    (user.email ? `@${user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_')}` : '@developer');
  const cleanUsername = generatedHandle.startsWith('@') ? generatedHandle.substring(1) : generatedHandle;

  return {
    id: user.id || (user.email ? `usr-${user.email.replace(/[^a-zA-Z0-9]/g, '_')}` : 'current-user-real'),
    userId: generatedHandle.startsWith('@') ? generatedHandle : `@${generatedHandle}`,
    username: cleanUsername,
    name: user.name || (user.email ? user.email.split('@')[0] : 'Student Developer'),
    headline:
      user.headline ||
      `${user.targetRole || 'Full Stack Engineer'} • ${user.college || 'Tech Institute'} '${user.gradYear || '2026'}`,
    avatarUrl:
      user.avatarUrl ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
    company: user.college || 'Brainboost Academy',
    role: user.targetRole || 'Full Stack Engineer',
    location: user.location || 'Remote',
    bio:
      user.bio ||
      `Passionate student developer targeting ${user.targetRole || 'Full Stack Engineering'}. Actively building verified projects.`,
    followersCount: user.followersCount ?? 0,
    followingCount: user.followingCount ?? 0,
    isFollowing: false,
    isFollower: false,
    isFriend: false,
    isPrivate: Boolean(user.isPrivateAccount),
    isLibraryPrivate: Boolean(user.isPrivateAccount),
    skills:
      user.skills && user.skills.length > 0
        ? user.skills
        : ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Tailwind CSS'],
    interests:
      user.interests && user.interests.length > 0
        ? user.interests
        : ['Full-Stack Web', 'AI & Machine Learning', 'Cloud Architecture'],
    certificates: user.earnedCertificates || [],
    libraryItems: libraryItems || [],
    projects: user.projects || [],
    internships: user.internships || [],
    achievements: user.achievements || [],
    onlineStatus: 'online',
  };
}

// ============================================================================
// REAL-TIME CONNECTIVITY SERVICE
// ============================================================================
export const connectivityService = {
  // Check if profile setup is completed
  isSetupCompleted(user: UserProfile): boolean {
    if (user.connectivitySetupCompleted) return true;
    try {
      const key = getStorageKey(BASE_STORAGE_KEYS.SETUP_DONE, user);
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  },

  // Auto-sync current user profile to Supabase database so other users can search & chat with them
  async syncUserProfileToSupabase(user: UserProfile): Promise<void> {
    if (!existingSupabaseClient || !user.email) return;
    try {
      const handle =
        user.userId ||
        user.username ||
        (user.email ? `@${user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_')}` : '@developer');
      const cleanUsername = handle.replace(/^@/, '');

      const profilePayload: any = {
        email: user.email.toLowerCase().trim(),
        name: user.name || user.email.split('@')[0],
        avatar_url:
          user.avatarUrl ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
        headline:
          user.headline ||
          `${user.targetRole || 'Full Stack Engineer'} • ${user.college || 'Tech Institute'}`,
        bio: user.bio || 'Building verified projects on Brainboost.',
        college: user.college || 'Tech Institute',
        degree: user.degree || 'B.Tech Computer Science',
        grad_year: user.gradYear || '2026',
        target_role: user.targetRole || 'Full Stack Engineer',
        location: user.location || 'Remote',
        is_private_account: Boolean(user.isPrivateAccount),
        updated_at: new Date().toISOString(),
      };

      // If user has Supabase Auth user ID
      const { data: authSession } = await existingSupabaseClient.auth.getSession();
      if (authSession?.session?.user?.id) {
        profilePayload.id = authSession.session.user.id;
      }

      await existingSupabaseClient.from('profiles').upsert(profilePayload, {
        onConflict: 'email',
      });
    } catch (err) {
      console.warn('Supabase profile sync notice:', err);
    }
  },

  // Mark profile setup completed with new data
  async completeSetup(
    user: UserProfile,
    data: {
      userId: string;
      name: string;
      avatarUrl: string;
      skills: string[];
      interests: string[];
      headline?: string;
      bio?: string;
    }
  ): Promise<void> {
    try {
      const key = getStorageKey(BASE_STORAGE_KEYS.SETUP_DONE, user);
      localStorage.setItem(key, 'true');

      // Sync to Supabase
      if (existingSupabaseClient && user.email) {
        const cleanUsername = data.userId.replace(/^@/, '');
        await existingSupabaseClient.from('profiles').upsert(
          {
            email: user.email.toLowerCase().trim(),
            name: data.name,
            avatar_url: data.avatarUrl,
            headline: data.headline || user.headline,
            bio: data.bio || user.bio,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'email' }
        );
      }
    } catch (e) {
      console.error('Error completing connectivity setup:', e);
    }
  },

  // Search across ALL Supabase registered users in real time
  async searchUsers(query: string, currentUser: UserProfile): Promise<NetworkUser[]> {
    const currentMapped = mapProfileToNetworkUser(currentUser);
    const cleanQuery = query.trim().replace(/^@/, '');

    if (!cleanQuery) {
      return this.getUsers(currentUser);
    }

    if (existingSupabaseClient) {
      try {
        const { data, error } = await existingSupabaseClient
          .from('profiles')
          .select('*')
          .or(
            `name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%,headline.ilike.%${cleanQuery}%,target_role.ilike.%${cleanQuery}%,college.ilike.%${cleanQuery}%`
          )
          .limit(30);

        if (!error && Array.isArray(data)) {
          const currentEmail = currentUser.email?.toLowerCase().trim();
          const mappedUsers = data
            .filter((row: any) => row.email?.toLowerCase().trim() !== currentEmail)
            .map((row: any) => mapRowToNetworkUser(row, currentMapped.id));

          // Enhance with follow state from local cache
          const localUsers = this.getLocalUsers(currentUser);
          const followMap = new Map<string, boolean>(localUsers.map((u) => [u.id, Boolean(u.isFollowing)]));

          return mappedUsers.map((u) => ({
            ...u,
            isFollowing: Boolean(followMap.get(u.id)),
          }));
        }
      } catch (err) {
        console.warn('Supabase search users notice:', err);
      }
    }

    // Fallback to searching local cache
    const allUsers = this.getLocalUsers(currentUser);
    const q = cleanQuery.toLowerCase();
    return allUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.userId?.toLowerCase().includes(q) ||
        u.headline.toLowerCase().includes(q) ||
        u.skills.some((s) => s.toLowerCase().includes(q))
    );
  },

  // Fetch real users from Supabase profiles
  async fetchUsers(currentUser: UserProfile): Promise<NetworkUser[]> {
    const currentMapped = mapProfileToNetworkUser(currentUser);
    const currentEmail = currentUser.email?.toLowerCase().trim();

    if (existingSupabaseClient) {
      try {
        // Sync self first
        await this.syncUserProfileToSupabase(currentUser);

        const { data, error } = await existingSupabaseClient
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && Array.isArray(data)) {
          const peers = data.filter((row: any) => row.email?.toLowerCase().trim() !== currentEmail);
          const mapped = peers.map((row: any) => mapRowToNetworkUser(row, currentMapped.id));

          // Merge with local follow / privacy state
          const localUsers = this.getLocalUsers(currentUser);
          const localMap = new Map<string, NetworkUser>(localUsers.map((u) => [u.id, u]));

          const finalUsers: NetworkUser[] = mapped.map((u) => {
            const local = localMap.get(u.id);
            if (local) {
              return {
                ...u,
                isFollowing: Boolean(local.isFollowing),
                isFriend: Boolean(local.isFriend),
                followersCount: Number(local.followersCount || 0),
              };
            }
            return u;
          });

          this.saveLocalUsers(finalUsers, currentUser);
          return finalUsers;
        }
      } catch (err) {
        console.warn('Supabase fetchUsers notice:', err);
      }
    }

    return this.getLocalUsers(currentUser);
  },

  // Synchronous getter for immediate render from cache
  getUsers(currentUser: UserProfile): NetworkUser[] {
    return this.getLocalUsers(currentUser);
  },

  getLocalUsers(currentUser: UserProfile): NetworkUser[] {
    try {
      const storageKey = getStorageKey(BASE_STORAGE_KEYS.USERS, currentUser);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: NetworkUser[] = JSON.parse(stored);
        // Filter out any legacy dummy mock accounts (Priya, Marcus, Elena, Rahul)
        const clean = parsed.filter(
          (u) =>
            !u.id.startsWith('user-priya-') &&
            !u.id.startsWith('user-marcus-') &&
            !u.id.startsWith('user-elena-') &&
            !u.id.startsWith('user-rahul-') &&
            !u.id.startsWith('user-sophia-') &&
            !u.id.startsWith('user-arjun-') &&
            !u.id.startsWith('user-sarah-')
        );
        return clean;
      }
    } catch (e) {
      console.error('Error fetching connectivity users from cache:', e);
    }
    return [];
  },

  saveLocalUsers(users: NetworkUser[], currentUser?: UserProfile): void {
    try {
      const storageKey = getStorageKey(BASE_STORAGE_KEYS.USERS, currentUser);
      localStorage.setItem(storageKey, JSON.stringify(users));
    } catch (e) {
      console.error('Error saving users:', e);
    }
  },

  // Fetch real posts from Supabase or cache
  async fetchPosts(currentUser: UserProfile): Promise<NetworkPost[]> {
    if (existingSupabaseClient) {
      try {
        const { data, error } = await existingSupabaseClient
          .from('posts')
          .select('*, author:profiles(*)')
          .order('created_at', { ascending: false })
          .limit(30);

        if (!error && Array.isArray(data) && data.length > 0) {
          const currentMapped = mapProfileToNetworkUser(currentUser);
          const mappedPosts: NetworkPost[] = data.map((p: any) => ({
            id: p.id,
            author: {
              id: p.author_id,
              name: p.author?.name || 'Verified Developer',
              avatarUrl:
                p.author?.avatar_url ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
              headline: p.author?.headline || 'Engineer',
              company: p.author?.college || 'Brainboost',
              isCurrentUser: p.author_id === currentMapped.id || p.author?.email === currentUser.email,
            },
            timestamp: new Date(p.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            content: p.content,
            tags: p.tags || ['#SoftwareEngineering'],
            skills: p.skills || ['WebDev'],
            likesCount: Number(p.likes_count || 0),
            isLiked: false,
            commentsCount: Number(p.comments_count || 0),
            repostsCount: Number(p.reposts_count || 0),
            imageUrl: p.image_url,
            codeSnippet: p.code_snippet,
            poll: p.poll,
            comments: [],
          }));

          this.saveLocalPosts(mappedPosts, currentUser);
          return mappedPosts;
        }
      } catch (err) {
        console.warn('Supabase fetchPosts notice:', err);
      }
    }

    return this.getPosts(currentUser);
  },

  getPosts(currentUser: UserProfile): NetworkPost[] {
    try {
      const storageKey = getStorageKey(BASE_STORAGE_KEYS.POSTS, currentUser);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: NetworkPost[] = JSON.parse(stored);
        return parsed.filter(
          (p) =>
            !p.id.startsWith('post-priya-') &&
            !p.id.startsWith('post-elena-') &&
            !p.id.startsWith('post-marcus-') &&
            !p.id.startsWith('post-rahul-')
        );
      }
    } catch (e) {
      console.error('Error fetching posts:', e);
    }
    return [];
  },

  saveLocalPosts(posts: NetworkPost[], currentUser?: UserProfile): void {
    try {
      const storageKey = getStorageKey(BASE_STORAGE_KEYS.POSTS, currentUser);
      localStorage.setItem(storageKey, JSON.stringify(posts));
    } catch (e) {
      console.error('Error saving posts:', e);
    }
  },

  // Create real post
  async createPost(
    currentUser: UserProfile,
    payload: {
      content: string;
      imageUrl?: string;
      codeSnippet?: { language: string; code: string };
      attachedCertificate?: GeneratedCertificate;
      tags?: string[];
    }
  ): Promise<NetworkPost> {
    const currentMapped = mapProfileToNetworkUser(currentUser);
    const newPost: NetworkPost = {
      id: `post-${Date.now()}`,
      author: {
        id: currentMapped.id,
        name: currentMapped.name,
        avatarUrl: currentMapped.avatarUrl,
        headline: currentMapped.headline,
        company: currentMapped.company,
        isCurrentUser: true,
      },
      timestamp: 'Just now',
      content: payload.content,
      tags: payload.tags || ['#Brainboost', '#WebDevelopment'],
      skills: payload.attachedCertificate ? payload.attachedCertificate.skillsValidated : ['Software Engineering'],
      likesCount: 0,
      isLiked: false,
      commentsCount: 0,
      repostsCount: 0,
      imageUrl: payload.imageUrl,
      codeSnippet: payload.codeSnippet,
      attachedCertificate: payload.attachedCertificate,
      comments: [],
    };

    if (existingSupabaseClient) {
      try {
        const { data: authSession } = await existingSupabaseClient.auth.getSession();
        const authorUuid = authSession?.session?.user?.id;
        if (authorUuid) {
          const { data, error } = await existingSupabaseClient
            .from('posts')
            .insert({
              author_id: authorUuid,
              content: payload.content,
              image_url: payload.imageUrl,
              code_snippet: payload.codeSnippet,
              tags: payload.tags || ['#Brainboost'],
              skills: newPost.skills,
            })
            .select()
            .single();

          if (!error && data) {
            newPost.id = data.id;
          }
        }
      } catch (err) {
        console.warn('Supabase createPost insert notice:', err);
      }
    }

    const existingPosts = this.getPosts(currentUser);
    const updated = [newPost, ...existingPosts];
    this.saveLocalPosts(updated, currentUser);
    return newPost;
  },

  // Like & Comment handlers
  toggleLike(postId: string, currentUser: UserProfile): NetworkPost[] {
    const posts = this.getPosts(currentUser);
    const updated = posts.map((p) => {
      if (p.id === postId) {
        const isLiked = !p.isLiked;
        return {
          ...p,
          isLiked,
          likesCount: isLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
        };
      }
      return p;
    });
    this.saveLocalPosts(updated, currentUser);
    return updated;
  },

  addComment(postId: string, content: string, currentUser: UserProfile): NetworkPost[] {
    const currentMapped = mapProfileToNetworkUser(currentUser);
    const posts = this.getPosts(currentUser);
    const updated = posts.map((p) => {
      if (p.id === postId) {
        const newComment = {
          id: `c-${Date.now()}`,
          authorId: currentMapped.id,
          authorName: currentMapped.name,
          authorAvatar: currentMapped.avatarUrl,
          authorHeadline: currentMapped.headline,
          timestamp: 'Just now',
          content,
          likesCount: 0,
          isLiked: false,
        };
        return {
          ...p,
          commentsCount: p.commentsCount + 1,
          comments: [...p.comments, newComment],
        };
      }
      return p;
    });
    this.saveLocalPosts(updated, currentUser);
    return updated;
  },

  // ============================================================================
  // REAL-TIME 1-ON-1 CHAT & MESSAGING
  // ============================================================================
  getConversations(currentUser: UserProfile): NetworkConversation[] {
    try {
      const storageKey = getStorageKey(BASE_STORAGE_KEYS.MESSAGES, currentUser);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: NetworkConversation[] = JSON.parse(stored);
        // Clean out legacy demo conversations
        return parsed.filter((c) => !c.id.startsWith('conv-priya') && !c.id.startsWith('conv-marcus'));
      }
    } catch (e) {
      console.error('Error fetching conversations:', e);
    }
    return [];
  },

  saveConversations(convs: NetworkConversation[], currentUser?: UserProfile): void {
    try {
      const storageKey = getStorageKey(BASE_STORAGE_KEYS.MESSAGES, currentUser);
      localStorage.setItem(storageKey, JSON.stringify(convs));
    } catch (e) {
      console.error('Error saving conversations:', e);
    }
  },

  // Send real-time chat message with broadcast & Supabase sync
  async sendMessage(
    participant: NetworkUser,
    content: string,
    currentUser: UserProfile
  ): Promise<{ updatedConversations: NetworkConversation[]; newMsg: NetworkMessage }> {
    const currentMapped = mapProfileToNetworkUser(currentUser);
    const convs = this.getConversations(currentUser);
    const nowIso = new Date().toISOString();
    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg: NetworkMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderId: currentMapped.id,
      receiverId: participant.id,
      content,
      timestamp: formattedTime,
      isRead: true,
    };

    // 1. Send via Supabase Realtime broadcast and database table insert if configured
    if (existingSupabaseClient) {
      try {
        const globalChannel = existingSupabaseClient.channel('public:global_realtime_chat');
        await globalChannel.send({
          type: 'broadcast',
          event: 'chat_message',
          payload: {
            ...newMsg,
            senderName: currentMapped.name,
            senderAvatar: currentMapped.avatarUrl,
            createdAt: nowIso,
          },
        });

        // Also attempt insert into database messages table if UUIDs match
        const { data: authSession } = await existingSupabaseClient.auth.getSession();
        const senderUuid = authSession?.session?.user?.id;
        if (senderUuid && participant.id.length === 36) {
          await existingSupabaseClient.from('messages').insert({
            sender_id: senderUuid,
            receiver_id: participant.id,
            content,
            is_read: false,
            created_at: nowIso,
          });
        }
      } catch (err) {
        console.warn('Supabase Realtime message dispatch note:', err);
      }
    }

    // 2. Update local conversation store
    let found = false;
    const updated = convs.map((conv) => {
      if (conv.participant.id === participant.id) {
        found = true;
        return {
          ...conv,
          participant,
          lastMessage: content,
          lastMessageTime: 'Just now',
          messages: [...conv.messages, newMsg],
        };
      }
      return conv;
    });

    if (!found) {
      updated.unshift({
        id: `conv-${participant.id}`,
        participant,
        lastMessage: content,
        lastMessageTime: 'Just now',
        unreadCount: 0,
        messages: [newMsg],
      });
    }

    this.saveConversations(updated, currentUser);
    return { updatedConversations: updated, newMsg };
  },

  // Subscribe to real-time incoming messages for current user across Broadcast and DB Postgres Changes
  subscribeToRealtimeChat(
    currentUser: UserProfile,
    onIncomingMessage: (msg: NetworkMessage, participant: NetworkUser) => void
  ): () => void {
    if (!existingSupabaseClient) return () => {};

    const currentMapped = mapProfileToNetworkUser(currentUser);
    const seenMessageIds = new Set<string>();

    const dispatchIncoming = (msg: NetworkMessage, incomingSender: NetworkUser) => {
      if (seenMessageIds.has(msg.id)) return;
      seenMessageIds.add(msg.id);
      onIncomingMessage(msg, incomingSender);
    };

    const realtimeChannel = existingSupabaseClient
      .channel(`realtime_chat_listener_${currentMapped.id.replace(/[^a-zA-Z0-9_]/g, '_')}`)
      // 1. Listen for Realtime Broadcast events
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        if (payload && (payload.receiverId === currentMapped.id || payload.receiverId === currentUser.id || payload.receiverId === currentUser.email)) {
          const incomingSender: NetworkUser = {
            id: payload.senderId,
            name: payload.senderName || 'Member',
            avatarUrl:
              payload.senderAvatar ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
            headline: 'Verified Peer',
            company: 'Brainboost',
            role: 'Developer',
            location: 'Remote',
            bio: '',
            followersCount: 0,
            followingCount: 0,
            isFollowing: false,
            isPrivate: false,
            skills: ['Developer'],
            certificates: [],
            libraryItems: [],
            projects: [],
            internships: [],
            achievements: [],
            onlineStatus: 'online',
          };

          const newMsg: NetworkMessage = {
            id: payload.id || `msg-${Date.now()}`,
            senderId: payload.senderId,
            receiverId: payload.receiverId,
            content: payload.content,
            timestamp: payload.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isRead: false,
          };

          dispatchIncoming(newMsg, incomingSender);
        }
      })
      // 2. Listen for Postgres database table inserts on the shared messages table
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newRow = payload.new as any;
          if (newRow && (newRow.receiver_id === currentMapped.id || newRow.receiver_id === currentUser.id)) {
            // Fetch sender profile details if available
            let senderName = 'Member';
            let senderAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80';
            let senderHeadline = 'Verified Peer';

            try {
              const { data: senderData } = await existingSupabaseClient
                .from('profiles')
                .select('name, avatar_url, headline, college, target_role')
                .eq('id', newRow.sender_id)
                .maybeSingle();

              if (senderData) {
                senderName = senderData.name || senderName;
                senderAvatar = senderData.avatar_url || senderAvatar;
                senderHeadline = senderData.headline || `${senderData.target_role || 'Developer'} • ${senderData.college || 'Brainboost'}`;
              }
            } catch (err) {
              console.warn('Could not fetch message sender profile:', err);
            }

            const incomingSender: NetworkUser = {
              id: newRow.sender_id,
              name: senderName,
              avatarUrl: senderAvatar,
              headline: senderHeadline,
              company: 'Brainboost',
              role: 'Developer',
              location: 'Remote',
              bio: '',
              followersCount: 0,
              followingCount: 0,
              isFollowing: false,
              isPrivate: false,
              skills: ['Developer'],
              certificates: [],
              libraryItems: [],
              projects: [],
              internships: [],
              achievements: [],
              onlineStatus: 'online',
            };

            const newMsg: NetworkMessage = {
              id: newRow.id || `msg-db-${Date.now()}`,
              senderId: newRow.sender_id,
              receiverId: newRow.receiver_id,
              content: newRow.content,
              timestamp: newRow.created_at
                ? new Date(newRow.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isRead: Boolean(newRow.is_read),
            };

            dispatchIncoming(newMsg, incomingSender);
          }
        }
      )
      .subscribe();

    return () => {
      existingSupabaseClient.removeChannel(realtimeChannel);
    };
  },

  // Toggle user follow / connect
  toggleFollow(targetUserId: string, currentUser: UserProfile): NetworkUser[] {
    const users = this.getLocalUsers(currentUser);
    const updated = users.map((u) => {
      if (u.id === targetUserId) {
        const nextState = !u.isFollowing;
        const isFriend = Boolean(nextState && u.isFollower);
        return {
          ...u,
          isFollowing: nextState,
          isFriend,
          followersCount: nextState ? u.followersCount + 1 : Math.max(0, u.followersCount - 1),
        };
      }
      return u;
    });
    this.saveLocalUsers(updated, currentUser);
    return updated;
  },

  // Follow Requests and Library Privacy Access Requests (Clean with no dummy requests)
  getAccessRequests(currentUser?: UserProfile): LibraryAccessRequest[] {
    try {
      const storageKey = getStorageKey(BASE_STORAGE_KEYS.LIBRARY_REQUESTS, currentUser);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: LibraryAccessRequest[] = JSON.parse(stored);
        return parsed.filter((r) => !r.id.startsWith('req-init-'));
      }
    } catch (e) {
      console.error('Error reading access requests:', e);
    }
    return [];
  },

  saveAccessRequests(requests: LibraryAccessRequest[], currentUser?: UserProfile): void {
    try {
      const storageKey = getStorageKey(BASE_STORAGE_KEYS.LIBRARY_REQUESTS, currentUser);
      localStorage.setItem(storageKey, JSON.stringify(requests));
    } catch (e) {
      console.error('Error saving access requests:', e);
    }
  },

  requestLibraryAccess(
    targetUserId: string,
    currentUser: UserProfile
  ): { success: boolean; request: LibraryAccessRequest } {
    const currentMapped = mapProfileToNetworkUser(currentUser);
    const existing = this.getAccessRequests(currentUser);

    const alreadyReq = existing.find(
      (r) => r.requesterId === currentMapped.id && r.targetUserId === targetUserId
    );
    if (alreadyReq) {
      return { success: true, request: alreadyReq };
    }

    const newReq: LibraryAccessRequest = {
      id: `req-${Date.now()}`,
      requesterId: currentMapped.id,
      requesterName: currentMapped.name,
      requesterAvatar: currentMapped.avatarUrl,
      requesterHeadline: currentMapped.headline,
      targetUserId,
      requestedAt: 'Just now',
      status: 'pending',
    };

    const updated = [newReq, ...existing];
    this.saveAccessRequests(updated, currentUser);
    return { success: true, request: newReq };
  },

  respondToAccessRequest(
    requestId: string,
    decision: 'approved' | 'declined',
    currentUser?: UserProfile
  ): LibraryAccessRequest[] {
    const existing = this.getAccessRequests(currentUser);
    const updated = existing.map((r) => {
      if (r.id === requestId) {
        return { ...r, status: decision };
      }
      return r;
    });
    this.saveAccessRequests(updated, currentUser);
    return updated;
  },

  getUserLibraries(currentUser?: UserProfile): Record<string, UserLibraryItem[]> {
    try {
      const storageKey = getStorageKey(BASE_STORAGE_KEYS.USER_LIBRARIES, currentUser);
      const stored = localStorage.getItem(storageKey);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Error fetching user libraries:', e);
    }
    return {};
  },

  saveUserLibrary(userId: string, items: UserLibraryItem[], currentUser?: UserProfile): void {
    try {
      const all = this.getUserLibraries(currentUser);
      all[userId] = items;
      const storageKey = getStorageKey(BASE_STORAGE_KEYS.USER_LIBRARIES, currentUser);
      localStorage.setItem(storageKey, JSON.stringify(all));
    } catch (e) {
      console.error('Error saving user library:', e);
    }
  },

  toggleProfilePrivacy(isPrivate: boolean, currentUser: UserProfile): void {
    const users = this.getLocalUsers(currentUser);
    const currentMapped = mapProfileToNetworkUser(currentUser);
    const updated = users.map((u) => {
      if (u.id === currentMapped.id || u.id === 'current-user-real') {
        return { ...u, isPrivate, isLibraryPrivate: isPrivate };
      }
      return u;
    });
    this.saveLocalUsers(updated, currentUser);
  },
};

export interface TableDiagnosticResult {
  tableName: string;
  exists: boolean;
  canRead: boolean;
  rowCount: number;
  sampleData: any[];
  error?: string;
  statusCode?: number;
  latencyMs: number;
  advice?: string;
}

export interface SupabaseSystemDiagnostic {
  configured: boolean;
  supabaseUrl: string;
  authSession: {
    authenticated: boolean;
    userId?: string;
    userEmail?: string;
  };
  overallStatus: 'healthy' | 'partial' | 'error';
  tables: TableDiagnosticResult[];
  testedAt: string;
}

export async function runSupabaseTableDiagnostics(): Promise<SupabaseSystemDiagnostic> {
  const client = getSupabaseClient();
  const testedAt = new Date().toLocaleTimeString();

  if (!client) {
    return {
      configured: false,
      supabaseUrl: 'Not Configured',
      authSession: { authenticated: false },
      overallStatus: 'error',
      tables: [],
      testedAt,
    };
  }

  // 1. Check Auth Session
  let authInfo = { authenticated: false, userId: undefined as string | undefined, userEmail: undefined as string | undefined };
  try {
    const { data } = await client.auth.getSession();
    if (data?.session?.user) {
      authInfo = {
        authenticated: true,
        userId: data.session.user.id,
        userEmail: data.session.user.email,
      };
    }
  } catch (e) {
    console.warn('Auth session check error:', e);
  }

  // 2. Tables to test
  const tablesToTest = [
    { name: 'profiles', label: 'User Profiles' },
    { name: 'posts', label: 'Community Feed Posts' },
    { name: 'messages', label: '1-on-1 Messages' },
    { name: 'user_skills', label: 'User Skills Matrix' },
    { name: 'user_roadmap_progress', label: 'Roadmap Milestone Progress' },
    { name: 'user_applications', label: 'Job & Internship Applications' },
    { name: 'user_course_progress', label: 'Course & Video Watch Progress' },
    { name: 'certificates', label: 'Verified Certificates' },
  ];

  const tableResults: TableDiagnosticResult[] = [];

  for (const t of tablesToTest) {
    const startTime = performance.now();
    try {
      const { data, error, count, status } = await client
        .from(t.name)
        .select('*', { count: 'exact' })
        .limit(3);

      const latencyMs = Math.round(performance.now() - startTime);

      if (error) {
        let advice = 'Check table permissions or RLS policies.';
        let exists = true;

        if (error.code === '42P01' || error.message?.includes('does not exist') || status === 404) {
          exists = false;
          advice = `Table '${t.name}' does not exist in your Supabase database. Run the migration SQL script to create it.`;
        } else if (error.code === '42501' || error.message?.includes('row-level security') || status === 403 || status === 401) {
          advice = `RLS is active. If you are not signed in or do not have a policy matching 'SELECT USING (true)' or 'auth.uid() = user_id', access may be restricted.`;
        }

        tableResults.push({
          tableName: t.name,
          exists,
          canRead: false,
          rowCount: 0,
          sampleData: [],
          error: error.message || `Error code ${error.code}`,
          statusCode: status,
          latencyMs,
          advice,
        });
      } else {
        tableResults.push({
          tableName: t.name,
          exists: true,
          canRead: true,
          rowCount: count ?? (data ? data.length : 0),
          sampleData: data || [],
          statusCode: status || 200,
          latencyMs,
        });
      }
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      tableResults.push({
        tableName: t.name,
        exists: false,
        canRead: false,
        rowCount: 0,
        sampleData: [],
        error: err?.message || 'Network exception occurred',
        latencyMs,
        advice: 'Check internet connection and Supabase Project status.',
      });
    }
  }

  const allReadable = tableResults.every((t) => t.canRead);
  const someReadable = tableResults.some((t) => t.canRead);

  return {
    configured: true,
    supabaseUrl: 'https://nzgisrrrbabedlntmcoc.supabase.co',
    authSession: authInfo,
    overallStatus: allReadable ? 'healthy' : someReadable ? 'partial' : 'error',
    tables: tableResults,
    testedAt,
  };
}

// --- In-Memory High-Speed Cache Engine ---
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const MEMORY_CACHE = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 60_000; // 60-second in-memory TTL to eliminate repeated network calls

function getFromMemoryCache<T>(key: string): T | null {
  const entry = MEMORY_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    MEMORY_CACHE.delete(key);
    return null;
  }
  return entry.data as T;
}

function setToMemoryCache<T>(key: string, data: T): void {
  MEMORY_CACHE.set(key, { data, timestamp: Date.now() });
}

export function clearMemoryCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    MEMORY_CACHE.clear();
    return;
  }
  for (const key of MEMORY_CACHE.keys()) {
    if (key.startsWith(keyPrefix)) {
      MEMORY_CACHE.delete(key);
    }
  }
}

// Generate realistic role-aligned skills based on verified target role
function generateBaselineSkillsForRole(role: string): SkillItem[] {
  const normalized = (role || '').toLowerCase();
  
  if (normalized.includes('front') || normalized.includes('ui') || normalized.includes('react')) {
    return [
      { id: 'skill-react-19', name: 'React 19 & Next.js', category: 'foundation', proficiency: 88, priority: 'high', verified: true },
      { id: 'skill-typescript', name: 'TypeScript', category: 'foundation', proficiency: 85, priority: 'high', verified: true },
      { id: 'skill-tailwind', name: 'Tailwind CSS & UI Systems', category: 'foundation', proficiency: 92, priority: 'medium', verified: true },
      { id: 'skill-web-perf', name: 'Web Performance & Vitals', category: 'foundation', proficiency: 78, priority: 'high', verified: false },
      { id: 'skill-state-mgmt', name: 'State Architecture (Zustand/Context)', category: 'foundation', proficiency: 82, priority: 'high', verified: true },
      { id: 'skill-rest-graphql', name: 'REST & GraphQL Integration', category: 'foundation', proficiency: 80, priority: 'high', verified: false },
      { id: 'skill-testing', name: 'Component Testing (Vitest/Playwright)', category: 'gap', proficiency: 58, priority: 'high', verified: false },
      { id: 'skill-micro-frontends', name: 'Module Federation & Micro-Frontends', category: 'gap', proficiency: 42, priority: 'medium', verified: false },
      { id: 'skill-wasm', name: 'WebAssembly & Canvas Graphics', category: 'upcoming', proficiency: 30, priority: 'medium', verified: false },
    ];
  }

  if (normalized.includes('back') || normalized.includes('node') || normalized.includes('api') || normalized.includes('python')) {
    return [
      { id: 'skill-node', name: 'Node.js & Express / NestJS', category: 'foundation', proficiency: 86, priority: 'high', verified: true },
      { id: 'skill-postgres', name: 'PostgreSQL & SQL Query Optimization', category: 'foundation', proficiency: 82, priority: 'high', verified: true },
      { id: 'skill-typescript-be', name: 'TypeScript', category: 'foundation', proficiency: 84, priority: 'high', verified: true },
      { id: 'skill-docker', name: 'Docker & Containerization', category: 'foundation', proficiency: 75, priority: 'high', verified: false },
      { id: 'skill-redis', name: 'Redis Caching & Pub/Sub', category: 'foundation', proficiency: 72, priority: 'high', verified: false },
      { id: 'skill-k8s', name: 'Kubernetes & CI/CD Pipelines', category: 'gap', proficiency: 52, priority: 'high', verified: false },
      { id: 'skill-microservices', name: 'Event-Driven Microservices (Kafka)', category: 'gap', proficiency: 48, priority: 'high', verified: false },
      { id: 'skill-grpc', name: 'gRPC & Protocol Buffers', category: 'upcoming', proficiency: 35, priority: 'medium', verified: false },
    ];
  }

  // Default Full Stack Engineer baseline
  return [
    { id: 'skill-react-19', name: 'React 19 & Next.js', category: 'foundation', proficiency: 85, priority: 'high', verified: true },
    { id: 'skill-typescript', name: 'TypeScript', category: 'foundation', proficiency: 82, priority: 'high', verified: true },
    { id: 'skill-node-be', name: 'Node.js & REST APIs', category: 'foundation', proficiency: 78, priority: 'high', verified: true },
    { id: 'skill-postgres-sql', name: 'PostgreSQL & Database Design', category: 'foundation', proficiency: 74, priority: 'high', verified: false },
    { id: 'skill-tailwind-ui', name: 'Tailwind CSS & Responsive UI', category: 'foundation', proficiency: 88, priority: 'medium', verified: true },
    { id: 'skill-cloud-deploy', name: 'Cloud Deployment (Docker/CI-CD)', category: 'gap', proficiency: 56, priority: 'high', verified: false },
    { id: 'skill-sys-design', name: 'System Design & Scalability', category: 'gap', proficiency: 50, priority: 'high', verified: false },
    { id: 'skill-ai-sdk', name: 'AI SDKs & Vector Search', category: 'upcoming', proficiency: 38, priority: 'high', verified: false },
  ];
}

export const supabaseService = {
  ...connectivityService,
  syncUserProfile: (user: UserProfile) => connectivityService.syncUserProfileToSupabase(user),
  runDiagnostics: runSupabaseTableDiagnostics,

  // --- Real Database Fetchers with Caching ---

  // 1. User Skills from Supabase `user_skills` table
  async getUserSkills(currentUser: UserProfile): Promise<SkillItem[]> {
    const cacheKey = `user_skills_${currentUser.email || 'anon'}`;
    const cached = getFromMemoryCache<SkillItem[]>(cacheKey);
    if (cached) return cached;

    // Check local storage for quick fallback
    try {
      const stored = localStorage.getItem(getStorageKey('user_skills', currentUser));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setToMemoryCache(cacheKey, parsed);
          // If we have existing client, asynchronously refresh in background
        }
      }
    } catch (e) {}

    if (existingSupabaseClient && currentUser.email) {
      try {
        const { data: profile } = await existingSupabaseClient
          .from('profiles')
          .select('id')
          .eq('email', currentUser.email.trim().toLowerCase())
          .maybeSingle();

        if (profile?.id) {
          const { data: dbSkills, error } = await existingSupabaseClient
            .from('user_skills')
            .select('*')
            .eq('user_id', profile.id);

          if (!error && Array.isArray(dbSkills) && dbSkills.length > 0) {
            const mapped: SkillItem[] = dbSkills.map((s: any) => ({
              id: s.id || `skill-${s.skill_name}`,
              name: s.skill_name || s.name,
              category: (s.category === 'gap' || s.category === 'upcoming') ? s.category : 'foundation',
              level: s.proficiency >= 85 ? 'Expert' : s.proficiency >= 75 ? 'Advanced' : s.proficiency >= 60 ? 'Proficient' : 'Intermediate',
              proficiency: typeof s.proficiency === 'number' ? s.proficiency : 70,
              verified: Boolean(s.verified),
              source: s.verified ? 'Verified Database' : 'Supabase Database',
              demand: s.priority === 'high' ? 'High' : 'Medium',
            }));
            setToMemoryCache(cacheKey, mapped);
            return mapped;
          }
        }
      } catch (err) {
        console.warn('Supabase user_skills read exception:', err);
      }
    }

    // Baseline skills tailored to user's real target role
    const baseline = generateBaselineSkillsForRole(currentUser.targetRole);
    setToMemoryCache(cacheKey, baseline);
    return baseline;
  },

  // Save User Skills to Supabase and Cache
  async saveUserSkills(skills: SkillItem[], currentUser: UserProfile): Promise<void> {
    const cacheKey = `user_skills_${currentUser.email || 'anon'}`;
    setToMemoryCache(cacheKey, skills);

    try {
      localStorage.setItem(getStorageKey('user_skills', currentUser), JSON.stringify(skills));
    } catch (e) {}

    if (!existingSupabaseClient || !currentUser.email) return;

    try {
      const { data: profile } = await existingSupabaseClient
        .from('profiles')
        .select('id')
        .eq('email', currentUser.email.trim().toLowerCase())
        .maybeSingle();

      if (profile?.id) {
        const rows = skills.map((s) => ({
          user_id: profile.id,
          skill_name: s.name,
          proficiency: s.proficiency,
          category: s.category === 'gap' ? 'gap' : s.category === 'upcoming' ? 'upcoming' : 'foundation',
          priority: s.priority === 'high' ? 'high' : 'medium',
          experience: '1-2 years',
          verified: Boolean(s.verified),
        }));

        await existingSupabaseClient.from('user_skills').delete().eq('user_id', profile.id);
        await existingSupabaseClient.from('user_skills').insert(rows);
      }
    } catch (e) {
      console.warn('Could not persist skills to Supabase:', e);
    }
  },

  // 2. Fetch Verified Courses from Supabase `courses` table
  async fetchCourses(): Promise<CourseItem[]> {
    const cacheKey = 'catalog_courses_v1';
    const cached = getFromMemoryCache<CourseItem[]>(cacheKey);
    if (cached) return cached;

    if (existingSupabaseClient) {
      try {
        const { data, error } = await existingSupabaseClient.from('courses').select('*').limit(50);
        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped: CourseItem[] = data.map((c: any) => ({
            id: c.id,
            title: c.title,
            provider: c.provider,
            category: c.category,
            level: c.level || 'Intermediate',
            duration: c.duration || '15 Hours',
            modulesCount: c.modules_count || 4,
            rating: Number(c.rating) || 4.8,
            enrolledCount: c.enrolled_count || 1200,
            progress: 0,
            isEnrolled: false,
            coverImage: c.cover_image || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
            thumbnail: c.thumbnail || c.cover_image,
            skillsTaught: c.skills_taught || [],
            description: c.description || '',
            instructor: c.instructor || { name: 'Staff Engineer', role: 'Architect', company: 'Brainboost' },
            modules: c.modules || [],
          }));
          setToMemoryCache(cacheKey, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Courses query fallback:', err);
      }
    }

    setToMemoryCache(cacheKey, initialCourses);
    return initialCourses;
  },

  // 3. Fetch Real Opportunities from Supabase `opportunities` table
  async fetchOpportunities(): Promise<OpportunityItem[]> {
    const cacheKey = 'catalog_opportunities_v1';
    const cached = getFromMemoryCache<OpportunityItem[]>(cacheKey);
    if (cached) return cached;

    if (existingSupabaseClient) {
      try {
        const { data, error } = await existingSupabaseClient.from('opportunities').select('*').limit(50);
        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped: OpportunityItem[] = data.map((o: any) => ({
            id: o.id,
            title: o.title,
            company: o.company,
            locationType: (o.mode === 'Remote' || o.mode === 'Hybrid' || o.mode === 'Onsite') ? o.mode : 'Remote',
            matchScore: Number(o.match_score) || 85,
            duration: o.duration || '3 Months',
            verified: Boolean(o.verified),
            tags: Array.isArray(o.skills) ? o.skills : ['Full Stack', 'Engineering'],
            companyLogoUrl: o.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
            description: o.description || '',
            stipend: o.stipend || 'Competitive',
            deadline: o.deadline || 'Rolling basis',
            applied: false,
            saved: false,
          }));
          setToMemoryCache(cacheKey, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Opportunities query fallback:', err);
      }
    }

    setToMemoryCache(cacheKey, initialOpportunities);
    return initialOpportunities;
  },

  // 4. Fetch Certifications
  async fetchCertifications(): Promise<CertificationItem[]> {
    const cacheKey = 'catalog_certifications_v1';
    const cached = getFromMemoryCache<CertificationItem[]>(cacheKey);
    if (cached) return cached;

    setToMemoryCache(cacheKey, initialCertifications);
    return initialCertifications;
  },

  // 5. Fetch Webinars
  async fetchWebinars(): Promise<WebinarItem[]> {
    const cacheKey = 'catalog_webinars_v1';
    const cached = getFromMemoryCache<WebinarItem[]>(cacheKey);
    if (cached) return cached;

    setToMemoryCache(cacheKey, initialWebinars);
    return initialWebinars;
  },

  // 6. Fetch Assignments
  async fetchAssignments(): Promise<AssignmentItem[]> {
    const cacheKey = 'catalog_assignments_v1';
    const cached = getFromMemoryCache<AssignmentItem[]>(cacheKey);
    if (cached) return cached;

    setToMemoryCache(cacheKey, initialAssignments);
    return initialAssignments;
  },

  // 7. Fetch Industry Tools
  async fetchIndustryTools(): Promise<IndustryTool[]> {
    const cacheKey = 'catalog_tools_v1';
    const cached = getFromMemoryCache<IndustryTool[]>(cacheKey);
    if (cached) return cached;

    setToMemoryCache(cacheKey, initialIndustryTools);
    return initialIndustryTools;
  },

  // 8. Fetch User Roadmap Nodes
  async getUserRoadmap(currentUser: UserProfile): Promise<RoadmapNode[]> {
    const cacheKey = `user_roadmap_${currentUser.email || 'anon'}`;
    const cached = getFromMemoryCache<RoadmapNode[]>(cacheKey);
    if (cached) return cached;

    try {
      const stored = localStorage.getItem(getStorageKey('user_roadmap', currentUser));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setToMemoryCache(cacheKey, parsed);
          return parsed;
        }
      }
    } catch (e) {}

    setToMemoryCache(cacheKey, initialRoadmapNodes);
    return initialRoadmapNodes;
  },

  // Save User Roadmap Nodes
  async saveUserRoadmap(nodes: RoadmapNode[], currentUser: UserProfile): Promise<void> {
    const cacheKey = `user_roadmap_${currentUser.email || 'anon'}`;
    setToMemoryCache(cacheKey, nodes);
    try {
      localStorage.setItem(getStorageKey('user_roadmap', currentUser), JSON.stringify(nodes));
    } catch (e) {}
  },
};

