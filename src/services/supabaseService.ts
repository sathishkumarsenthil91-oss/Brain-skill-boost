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
  YouTubeLearningTrack,
  ChatMessage,
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

/**
 * Resolves user's unique UUID in Supabase database from session or profile email lookup
 */
export async function resolveUserUuid(client: any, user?: UserProfile): Promise<string | null> {
  if (!client) return null;
  try {
    const { data: sessionData } = await client.auth.getSession();
    if (sessionData?.session?.user?.id) {
      return sessionData.session.user.id;
    }
  } catch {}

  const email = user?.email?.trim().toLowerCase();
  if (!email) return null;

  try {
    const { data: profile } = await client
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (profile?.id) {
      return profile.id;
    }

    // Auto-create profile in Supabase if it doesn't exist
    if (user) {
      const { data: newProfile, error } = await client
        .from('profiles')
        .insert({
          email,
          name: user.name || user.email.split('@')[0],
          target_role: user.targetRole || 'Full Stack Engineer',
          degree: user.degree || 'B.Tech Computer Science',
          college: user.college || 'Tech Institute',
          grad_year: user.gradYear || '2026',
          avatar_url: user.avatarUrl,
          overall_readiness: user.overallReadiness || 65,
        })
        .select('id')
        .maybeSingle();

      if (!error && newProfile?.id) {
        return newProfile.id;
      }
    }
  } catch (err) {
    console.warn('resolveUserUuid error:', err);
  }
  return null;
}

/**
 * Resolves any target user ID (UUID, email, or handle) to a Supabase UUID
 */
export async function resolveTargetUuid(client: any, targetId: string): Promise<string | null> {
  if (!client || !targetId) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)) {
    return targetId;
  }
  try {
    const clean = targetId.replace(/^@/, '').toLowerCase().trim();
    const { data: profile } = await client
      .from('profiles')
      .select('id')
      .or(`email.eq.${clean},username.eq.${clean},user_id_handle.eq.@${clean}`)
      .maybeSingle();
    if (profile?.id) return profile.id;
  } catch (e) {
    console.warn('resolveTargetUuid notice:', e);
  }
  return null;
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
        overall_readiness: user.overallReadiness || 65,
        updated_at: new Date().toISOString(),
      };

      // If user has Supabase Auth user ID
      const { data: authSession } = await existingSupabaseClient.auth.getSession();
      if (authSession?.session?.user?.id) {
        profilePayload.id = authSession.session.user.id;
      }

      const { data: upsertedProfile } = await existingSupabaseClient.from('profiles').upsert(profilePayload, {
        onConflict: 'email',
      }).select('id').maybeSingle();

      const profileId = profilePayload.id || upsertedProfile?.id;
      if (profileId) {
        // Sync user projects if present
        if (Array.isArray(user.projects) && user.projects.length > 0) {
          const projectRows = user.projects.map((p) => ({
            user_id: profileId,
            title: p.title,
            description: p.description,
            tags: p.tags || [],
            github_url: p.githubUrl,
            demo_url: p.demoUrl,
            date: p.date || new Date().toISOString().split('T')[0],
            stars: p.stars || 0,
          }));
          await existingSupabaseClient.from('user_projects').delete().eq('user_id', profileId);
          await existingSupabaseClient.from('user_projects').insert(projectRows);
        }

        // Sync user internships if present
        if (Array.isArray(user.internships) && user.internships.length > 0) {
          const internshipRows = user.internships.map((i) => ({
            user_id: profileId,
            role: i.role,
            company: i.company,
            period: i.period,
            location: i.location,
            description: i.description,
            verified: Boolean(i.verified),
          }));
          await existingSupabaseClient.from('user_internships').delete().eq('user_id', profileId);
          await existingSupabaseClient.from('user_internships').insert(internshipRows);
        }

        // Sync user achievements if present
        if (Array.isArray(user.achievements) && user.achievements.length > 0) {
          const achievementRows = user.achievements.map((a) => ({
            user_id: profileId,
            title: a.title,
            issuer: a.issuer,
            date: a.date,
            badge: a.badge,
            description: a.description,
          }));
          await existingSupabaseClient.from('user_achievements').delete().eq('user_id', profileId);
          await existingSupabaseClient.from('user_achievements').insert(achievementRows);
        }
      }
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
    const cleanQuery = query.trim().replace(/^@/, '');

    if (!cleanQuery) {
      return this.fetchUsers(currentUser);
    }

    if (existingSupabaseClient) {
      try {
        const myUid = await resolveUserUuid(existingSupabaseClient, currentUser);
        const currentEmail = currentUser.email?.toLowerCase().trim();

        const { data, error } = await existingSupabaseClient
          .from('profiles')
          .select('*')
          .or(
            `name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%,headline.ilike.%${cleanQuery}%,target_role.ilike.%${cleanQuery}%,college.ilike.%${cleanQuery}%,username.ilike.%${cleanQuery}%,user_id_handle.ilike.%${cleanQuery}%`
          )
          .limit(30);

        if (!error && Array.isArray(data)) {
          const peers = data.filter((row: any) => {
            if (myUid && row.id === myUid) return false;
            if (currentEmail && row.email?.toLowerCase().trim() === currentEmail) return false;
            return true;
          });

          // Fetch real follows for relational state
          let allFollows: { follower_id: string; following_id: string }[] = [];
          try {
            const { data: followsData } = await existingSupabaseClient
              .from('network_follows')
              .select('follower_id, following_id');
            if (Array.isArray(followsData)) {
              allFollows = followsData;
            } else {
              const { data: ufData } = await existingSupabaseClient
                .from('user_follows')
                .select('follower_id, following_id');
              if (Array.isArray(ufData)) allFollows = ufData;
            }
          } catch {}

          return peers.map((row: any) => {
            const baseUser = mapRowToNetworkUser(row, myUid || 'current-user');
            const targetId = row.id;

            const isFollowing = myUid ? allFollows.some((f) => f.follower_id === myUid && f.following_id === targetId) : false;
            const isFollower = myUid ? allFollows.some((f) => f.follower_id === targetId && f.following_id === myUid) : false;
            const isFriend = Boolean(isFollowing && isFollower);
            const liveFollowers = allFollows.filter((f) => f.following_id === targetId).length;
            const liveFollowing = allFollows.filter((f) => f.follower_id === targetId).length;

            return {
              ...baseUser,
              followersCount: liveFollowers,
              followingCount: liveFollowing,
              isFollowing,
              isFollower,
              isFriend,
            };
          });
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

  // Fetch real users from Supabase profiles with real-time relational follow counts
  async fetchUsers(currentUser: UserProfile): Promise<NetworkUser[]> {
    const currentMapped = mapProfileToNetworkUser(currentUser);
    const currentEmail = currentUser.email?.toLowerCase().trim();

    if (existingSupabaseClient) {
      try {
        // Sync self first
        await this.syncUserProfileToSupabase(currentUser);
        const myUid = await resolveUserUuid(existingSupabaseClient, currentUser);

        const { data, error } = await existingSupabaseClient
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && Array.isArray(data)) {
          // Fetch live follows from database
          let allFollows: { follower_id: string; following_id: string }[] = [];
          try {
            const { data: followsData } = await existingSupabaseClient
              .from('network_follows')
              .select('follower_id, following_id');
            if (Array.isArray(followsData)) {
              allFollows = followsData;
            } else {
              const { data: ufData } = await existingSupabaseClient
                .from('user_follows')
                .select('follower_id, following_id');
              if (Array.isArray(ufData)) allFollows = ufData;
            }
          } catch (fErr) {
            console.warn('Follows query note:', fErr);
          }

          const peers = data.filter((row: any) => {
            if (myUid && row.id === myUid) return false;
            if (currentEmail && row.email?.toLowerCase().trim() === currentEmail) return false;
            return true;
          });

          const finalUsers: NetworkUser[] = peers.map((row: any) => {
            const baseUser = mapRowToNetworkUser(row, myUid || currentMapped.id);
            const targetId = row.id;

            const isFollowing = myUid ? allFollows.some((f) => f.follower_id === myUid && f.following_id === targetId) : false;
            const isFollower = myUid ? allFollows.some((f) => f.follower_id === targetId && f.following_id === myUid) : false;
            const isFriend = Boolean(isFollowing && isFollower);
            const liveFollowersCount = allFollows.filter((f) => f.following_id === targetId).length;
            const liveFollowingCount = allFollows.filter((f) => f.follower_id === targetId).length;

            return {
              ...baseUser,
              followersCount: liveFollowersCount,
              followingCount: liveFollowingCount,
              isFollowing,
              isFollower,
              isFriend,
            };
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

  // Get live list of followers for any user from the database
  async getFollowersList(userId: string, currentUser: UserProfile): Promise<NetworkUser[]> {
    if (!existingSupabaseClient) return [];
    try {
      const myUid = await resolveUserUuid(existingSupabaseClient, currentUser);
      const targetUid = (await resolveTargetUuid(existingSupabaseClient, userId)) || userId;

      let followerIds: string[] = [];
      const { data: nfData } = await existingSupabaseClient
        .from('network_follows')
        .select('follower_id')
        .eq('following_id', targetUid);

      if (Array.isArray(nfData)) {
        followerIds = nfData.map((r: any) => r.follower_id);
      } else {
        const { data: ufData } = await existingSupabaseClient
          .from('user_follows')
          .select('follower_id')
          .eq('following_id', targetUid);
        if (Array.isArray(ufData)) followerIds = ufData.map((r: any) => r.follower_id);
      }

      if (followerIds.length === 0) return [];

      const { data: profiles, error } = await existingSupabaseClient
        .from('profiles')
        .select('*')
        .in('id', followerIds);

      if (error || !Array.isArray(profiles)) return [];

      let allFollows: { follower_id: string; following_id: string }[] = [];
      const { data: afData } = await existingSupabaseClient
        .from('network_follows')
        .select('follower_id, following_id');
      if (Array.isArray(afData)) allFollows = afData;

      return profiles.map((p: any) => {
        const mapped = mapRowToNetworkUser(p, myUid || 'current-user');
        const isFollowing = myUid ? allFollows.some((f) => f.follower_id === myUid && f.following_id === p.id) : false;
        const isFollower = myUid ? allFollows.some((f) => f.follower_id === p.id && f.following_id === myUid) : false;
        const followersCount = allFollows.filter((f) => f.following_id === p.id).length;
        const followingCount = allFollows.filter((f) => f.follower_id === p.id).length;
        return {
          ...mapped,
          isFollowing,
          isFollower,
          isFriend: Boolean(isFollowing && isFollower),
          followersCount,
          followingCount,
        };
      });
    } catch (err) {
      console.warn('getFollowersList error:', err);
      return [];
    }
  },

  // Get live list of following for any user from the database
  async getFollowingList(userId: string, currentUser: UserProfile): Promise<NetworkUser[]> {
    if (!existingSupabaseClient) return [];
    try {
      const myUid = await resolveUserUuid(existingSupabaseClient, currentUser);
      const targetUid = (await resolveTargetUuid(existingSupabaseClient, userId)) || userId;

      let followingIds: string[] = [];
      const { data: nfData } = await existingSupabaseClient
        .from('network_follows')
        .select('following_id')
        .eq('follower_id', targetUid);

      if (Array.isArray(nfData)) {
        followingIds = nfData.map((r: any) => r.following_id);
      } else {
        const { data: ufData } = await existingSupabaseClient
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', targetUid);
        if (Array.isArray(ufData)) followingIds = ufData.map((r: any) => r.following_id);
      }

      if (followingIds.length === 0) return [];

      const { data: profiles, error } = await existingSupabaseClient
        .from('profiles')
        .select('*')
        .in('id', followingIds);

      if (error || !Array.isArray(profiles)) return [];

      let allFollows: { follower_id: string; following_id: string }[] = [];
      const { data: afData } = await existingSupabaseClient
        .from('network_follows')
        .select('follower_id, following_id');
      if (Array.isArray(afData)) allFollows = afData;

      return profiles.map((p: any) => {
        const mapped = mapRowToNetworkUser(p, myUid || 'current-user');
        const isFollowing = myUid ? allFollows.some((f) => f.follower_id === myUid && f.following_id === p.id) : false;
        const isFollower = myUid ? allFollows.some((f) => f.follower_id === p.id && f.following_id === myUid) : false;
        const followersCount = allFollows.filter((f) => f.following_id === p.id).length;
        const followingCount = allFollows.filter((f) => f.follower_id === p.id).length;
        return {
          ...mapped,
          isFollowing,
          isFollower,
          isFriend: Boolean(isFollowing && isFollower),
          followersCount,
          followingCount,
        };
      });
    } catch (err) {
      console.warn('getFollowingList error:', err);
      return [];
    }
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
          .from('network_posts')
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
        const authorUuid = (await resolveUserUuid(existingSupabaseClient, currentUser));
        if (authorUuid) {
          const { data, error } = await existingSupabaseClient
            .from('network_posts')
            .insert({
              author_id: authorUuid,
              content: payload.content,
              image_url: payload.imageUrl,
              tags: payload.tags || ['#Brainboost'],
              skills: newPost.skills,
            })
            .select()
            .single();

          if (!error && data) {
            newPost.id = data.id;
          } else if (error) {
            console.warn('network_posts insert warning:', error);
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
    let targetPost: NetworkPost | undefined;
    const updated = posts.map((p) => {
      if (p.id === postId) {
        const isLiked = !p.isLiked;
        targetPost = {
          ...p,
          isLiked,
          likesCount: isLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
        };
        return targetPost;
      }
      return p;
    });
    this.saveLocalPosts(updated, currentUser);

    if (existingSupabaseClient) {
      resolveUserUuid(existingSupabaseClient, currentUser).then((uid) => {
        if (!uid) return;
        if (targetPost?.isLiked) {
          existingSupabaseClient.from('post_likes').upsert({ post_id: postId, user_id: uid }, { onConflict: 'user_id, post_id' }).then(() => {});
        } else {
          existingSupabaseClient.from('post_likes').delete().eq('post_id', postId).eq('user_id', uid).then(() => {});
        }
      }).catch((err) => console.warn('Supabase toggleLike notice:', err));
    }

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

    if (existingSupabaseClient) {
      resolveUserUuid(existingSupabaseClient, currentUser).then((uid) => {
        if (!uid) return;
        existingSupabaseClient.from('post_comments').insert({
          post_id: postId,
          author_id: uid,
          content,
        }).then(() => {});
      }).catch((err) => console.warn('Supabase addComment notice:', err));
    }

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

  async fetchConversations(currentUser: UserProfile): Promise<NetworkConversation[]> {
    return this.getConversations(currentUser);
  },

  saveConversations(convs: NetworkConversation[], currentUser?: UserProfile): void {
    try {
      const storageKey = getStorageKey(BASE_STORAGE_KEYS.MESSAGES, currentUser);
      localStorage.setItem(storageKey, JSON.stringify(convs));
    } catch (e) {
      console.error('Error saving conversations:', e);
    }
  },

  // Fetch remote chat messages between current user and target user from Supabase
  async fetchMessagesForUser(participantId: string, currentUser: UserProfile): Promise<NetworkMessage[]> {
    if (!existingSupabaseClient) return [];
    try {
      const myUid = await resolveUserUuid(existingSupabaseClient, currentUser);
      const targetUid = (await resolveTargetUuid(existingSupabaseClient, participantId)) || participantId;
      if (!myUid || !targetUid) return [];

      let dbMessages: any[] = [];
      const { data: nmData } = await existingSupabaseClient
        .from('network_messages')
        .select('*')
        .or(`and(sender_id.eq.${myUid},receiver_id.eq.${targetUid}),and(sender_id.eq.${targetUid},receiver_id.eq.${myUid})`)
        .order('created_at', { ascending: true })
        .limit(150);

      if (Array.isArray(nmData) && nmData.length > 0) {
        dbMessages = nmData;
      } else {
        const { data: mData } = await existingSupabaseClient
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${myUid},receiver_id.eq.${targetUid}),and(sender_id.eq.${targetUid},receiver_id.eq.${myUid})`)
          .order('created_at', { ascending: true })
          .limit(150);
        if (Array.isArray(mData)) dbMessages = mData;
      }

      if (dbMessages.length > 0) {
        const mapped: NetworkMessage[] = dbMessages.map((row: any) => ({
          id: row.id || `msg-${row.created_at}`,
          senderId: row.sender_id === myUid ? 'current-user-real' : row.sender_id,
          receiverId: row.receiver_id,
          content: row.content,
          timestamp: row.created_at
            ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Recently',
          isRead: Boolean(row.is_read),
        }));

        // Merge with local storage
        const convs = this.getConversations(currentUser);
        const existingConv = convs.find((c) => c.participant.id === participantId);
        if (existingConv) {
          existingConv.messages = mapped;
          if (mapped.length > 0) {
            existingConv.lastMessage = mapped[mapped.length - 1].content;
            existingConv.lastMessageTime = mapped[mapped.length - 1].timestamp;
          }
        }
        this.saveConversations(convs, currentUser);
        return mapped;
      }
    } catch (err) {
      console.warn('fetchMessagesForUser error:', err);
    }
    return [];
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

    // 1. Send via Supabase Realtime broadcast and database table insert
    if (existingSupabaseClient) {
      try {
        const senderUuid = await resolveUserUuid(existingSupabaseClient, currentUser);
        const targetUuid = (await resolveTargetUuid(existingSupabaseClient, participant.id)) || participant.id;

        const globalChannel = existingSupabaseClient.channel('public:global_realtime_chat');
        await globalChannel.send({
          type: 'broadcast',
          event: 'chat_message',
          payload: {
            ...newMsg,
            senderUuid,
            targetUuid,
            senderName: currentMapped.name,
            senderAvatar: currentMapped.avatarUrl,
            createdAt: nowIso,
          },
        });

        // Insert into network_messages and messages tables
        if (senderUuid && targetUuid) {
          try {
            await existingSupabaseClient.from('network_messages').insert({
              sender_id: senderUuid,
              receiver_id: targetUuid,
              content,
              is_read: false,
              created_at: nowIso,
            });
          } catch (nmErr) {
            console.warn('Insert to network_messages notice:', nmErr);
          }

          try {
            await existingSupabaseClient.from('messages').insert({
              sender_id: senderUuid,
              receiver_id: targetUuid,
              content,
              is_read: false,
              created_at: nowIso,
            });
          } catch (mErr) {
            console.warn('Insert to messages notice:', mErr);
          }
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
    let cachedUserUuid: string | null = null;
    resolveUserUuid(existingSupabaseClient, currentUser).then((uid) => {
      cachedUserUuid = uid;
    });

    const dispatchIncoming = (msg: NetworkMessage, incomingSender: NetworkUser) => {
      if (seenMessageIds.has(msg.id)) return;
      seenMessageIds.add(msg.id);
      onIncomingMessage(msg, incomingSender);
    };

    // Use shared global channel for broadcast and table changes so all connected clients communicate
    const channelName = 'public:global_realtime_chat';
    const realtimeChannel = existingSupabaseClient
      .channel(channelName)
      // 1. Listen for Realtime Broadcast events
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        if (!payload) return;
        const isForMe =
          (cachedUserUuid && (payload.targetUuid === cachedUserUuid || payload.receiverId === cachedUserUuid)) ||
          payload.receiverId === currentMapped.id ||
          payload.receiverId === currentUser.id ||
          payload.receiverId === currentUser.email ||
          payload.targetUuid === currentMapped.id ||
          payload.targetUuid === currentUser.id;

        if (isForMe) {
          const incomingSender: NetworkUser = {
            id: payload.senderUuid || payload.senderId,
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
            senderId: payload.senderUuid || payload.senderId,
            receiverId: payload.receiverId,
            content: payload.content,
            timestamp: payload.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isRead: false,
          };

          dispatchIncoming(newMsg, incomingSender);
        }
      })
      // 2. Listen for Postgres changes on network_messages table
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'network_messages',
        },
        async (payload) => {
          const newRow = payload.new as any;
          if (!newRow) return;
          const isForMe =
            (cachedUserUuid && newRow.receiver_id === cachedUserUuid) ||
            newRow.receiver_id === currentMapped.id ||
            newRow.receiver_id === currentUser.id;

          if (isForMe) {
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
            } catch {}

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
      // 3. Listen for Postgres changes on messages table
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
            } catch {}

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

  // Subscribe to live network events (follow/unfollow, live count changes)
  subscribeToNetworkEvents(
    currentUser: UserProfile,
    onEvent: (event: { type: string; payload: any }) => void
  ): () => void {
    if (!existingSupabaseClient) return () => {};

    const channelName = `network_events_global_${Date.now()}`;
    const channel = existingSupabaseClient
      .channel(channelName)
      .on('broadcast', { event: 'network_event' }, ({ payload }) => {
        if (payload) {
          onEvent(payload);
        }
      })
      .subscribe();

    return () => {
      existingSupabaseClient.removeChannel(channel);
    };
  },

  // Toggle user follow / connect with direct Supabase persistence & real-time broadcast
  async toggleFollow(targetUserId: string, currentUser: UserProfile): Promise<NetworkUser[]> {
    const users = this.getLocalUsers(currentUser);
    let nextState = false;
    const updated = users.map((u) => {
      if (u.id === targetUserId) {
        nextState = !u.isFollowing;
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

    if (existingSupabaseClient) {
      try {
        const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
        const targetUid = (await resolveTargetUuid(existingSupabaseClient, targetUserId)) || targetUserId;

        if (uid && targetUid) {
          if (nextState) {
            // Upsert into network_follows
            try {
              await existingSupabaseClient.from('network_follows').upsert(
                { follower_id: uid, following_id: targetUid, status: 'approved' },
                { onConflict: 'follower_id, following_id' }
              );
            } catch (nfErr) {
              console.warn('network_follows upsert notice:', nfErr);
            }
            // Also upsert into user_follows
            try {
              await existingSupabaseClient.from('user_follows').upsert(
                { follower_id: uid, following_id: targetUid, status: 'approved' },
                { onConflict: 'follower_id, following_id' }
              );
            } catch (ufErr) {
              console.warn('user_follows upsert notice:', ufErr);
            }
          } else {
            // Delete from network_follows
            try {
              await existingSupabaseClient
                .from('network_follows')
                .delete()
                .eq('follower_id', uid)
                .eq('following_id', targetUid);
            } catch (nfErr) {
              console.warn('network_follows delete notice:', nfErr);
            }
            // Also delete from user_follows
            try {
              await existingSupabaseClient
                .from('user_follows')
                .delete()
                .eq('follower_id', uid)
                .eq('following_id', targetUid);
            } catch (ufErr) {
              console.warn('user_follows delete notice:', ufErr);
            }
          }

          // Broadcast follow event to all clients
          try {
            const broadcastChannel = existingSupabaseClient.channel('network_events_global');
            await broadcastChannel.send({
              type: 'broadcast',
              event: 'network_event',
              payload: {
                type: 'follow_change',
                payload: {
                  followerId: uid,
                  followingId: targetUid,
                  isFollowing: nextState,
                },
              },
            });
          } catch (bErr) {
            console.warn('broadcast follow event notice:', bErr);
          }
        }
      } catch (err) {
        console.warn('Supabase toggleFollow notice:', err);
      }
    }

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

    if (existingSupabaseClient) {
      resolveUserUuid(existingSupabaseClient, currentUser).then((uid) => {
        if (!uid) return;
        existingSupabaseClient.from('library_access_requests').upsert({
          requester_id: uid,
          target_user_id: targetUserId,
          status: 'pending',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'requester_id, target_user_id' }).then(() => {});
      }).catch((err) => console.warn('Supabase requestLibraryAccess notice:', err));
    }

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

    if (existingSupabaseClient) {
      const matched = existing.find((r) => r.id === requestId);
      if (matched) {
        existingSupabaseClient
          .from('library_access_requests')
          .update({ status: decision, updated_at: new Date().toISOString() })
          .eq('requester_id', matched.requesterId)
          .then(() => {});
      }
    }

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
    { name: 'network_posts', label: 'Community Feed Posts' },
    { name: 'network_messages', label: '1-on-1 Messages' },
    { name: 'network_follows', label: 'Followers & Connections' },
    { name: 'courses', label: 'Interactive Courses Catalog' },
    { name: 'course_enrollments', label: 'Course Progress & Enrollments' },
    { name: 'certificates', label: 'Verified Certificates' },
    { name: 'webinars', label: 'Tech Webinars' },
    { name: 'opportunities', label: 'Job & Internship Opportunities' },
    { name: 'roadmaps', label: 'Career Roadmaps' },
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

  // 2. Fetch Verified Courses from Supabase `courses` table and user `course_enrollments`
  async fetchCourses(currentUser?: UserProfile): Promise<CourseItem[]> {
    const cacheKey = `catalog_courses_${currentUser?.email || 'all'}`;
    const cached = getFromMemoryCache<CourseItem[]>(cacheKey);
    if (cached) return cached;

    if (existingSupabaseClient) {
      try {
        const { data, error } = await existingSupabaseClient.from('courses').select('*').limit(50);
        if (!error && Array.isArray(data) && data.length > 0) {
          const enrolledMap = new Map<string, { progress: number; completedLessons: string[]; isCompleted: boolean }>();
          if (currentUser) {
            const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
            if (uid) {
              const { data: enrollments } = await existingSupabaseClient
                .from('course_enrollments')
                .select('*')
                .eq('user_id', uid);
              if (Array.isArray(enrollments)) {
                for (const enr of enrollments) {
                  enrolledMap.set(enr.course_id, {
                    progress: enr.progress || 0,
                    completedLessons: enr.completed_lessons || [],
                    isCompleted: Boolean(enr.is_completed),
                  });
                }
              }
            }
          }

          const mapped: CourseItem[] = data.map((c: any) => {
            const enr = enrolledMap.get(c.id);
            return {
              id: c.id,
              title: c.title,
              provider: c.provider,
              category: c.category,
              level: c.level || 'Intermediate',
              duration: c.duration || '15 Hours',
              modulesCount: c.modules_count || (c.modules?.length || 4),
              rating: Number(c.rating) || 4.8,
              enrolledCount: c.enrolled_count || 1200,
              progress: enr ? enr.progress : 0,
              isEnrolled: Boolean(enr),
              enrolled: Boolean(enr),
              coverImage: c.cover_image || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
              thumbnail: c.thumbnail || c.cover_image,
              skillsTaught: c.skills_taught || [],
              description: c.description || '',
              instructor: c.instructor || { name: 'Staff Engineer', role: 'Architect', company: 'Brainboost' },
              modules: c.modules || [],
            };
          });
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

  async enrollInCourse(courseId: string, isEnrolled: boolean, currentUser: UserProfile): Promise<void> {
    if (!existingSupabaseClient) return;
    try {
      const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
      if (!uid) return;
      if (isEnrolled) {
        await existingSupabaseClient.from('course_enrollments').upsert({
          user_id: uid,
          course_id: courseId,
          progress: 5,
          is_completed: false,
          enrolled_at: new Date().toISOString(),
        }, { onConflict: 'user_id, course_id' });
      } else {
        await existingSupabaseClient.from('course_enrollments').delete().eq('user_id', uid).eq('course_id', courseId);
      }
    } catch (e) {
      console.warn('enrollInCourse error:', e);
    }
  },

  async updateCourseProgress(courseId: string, progress: number, completedLessons: string[], currentUser: UserProfile): Promise<void> {
    if (!existingSupabaseClient) return;
    try {
      const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
      if (!uid) return;
      await existingSupabaseClient.from('course_enrollments').upsert({
        user_id: uid,
        course_id: courseId,
        progress,
        completed_lessons: completedLessons,
        is_completed: progress >= 100,
        completed_at: progress >= 100 ? new Date().toISOString() : null,
      }, { onConflict: 'user_id, course_id' });
    } catch (e) {
      console.warn('updateCourseProgress error:', e);
    }
  },

  // Real YouTube learning tracks from Supabase
  async fetchYouTubeTracks(currentUser: UserProfile): Promise<YouTubeLearningTrack[]> {
    if (existingSupabaseClient) {
      try {
        const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
        if (uid) {
          const { data, error } = await existingSupabaseClient
            .from('youtube_learning_tracks')
            .select('*')
            .eq('user_id', uid)
            .order('last_watched', { ascending: false });

          if (!error && Array.isArray(data) && data.length > 0) {
            return data.map((t: any) => ({
              id: t.id,
              userId: currentUser.email || 'default',
              videoId: t.video_id,
              videoUrl: t.video_url,
              title: t.title,
              channel: t.channel,
              channelUrl: t.channel_url,
              thumbnail: t.thumbnail,
              durationSeconds: t.duration_seconds || 0,
              durationFormatted: t.duration_formatted || '0m',
              verifiedWatchedSeconds: t.verified_watched_seconds || 0,
              currentTime: Number(t.current_time) || 0,
              completionPercentage: Number(t.completion_percentage) || 0,
              status: t.status || 'in_progress',
              watchedRanges: t.watched_ranges || [],
              aiSummary: t.ai_summary,
              notes: t.notes,
              learningRecord: t.learning_record,
              lastWatched: t.last_watched,
              dateAdded: t.created_at,
            }));
          }
        }
      } catch (err) {
        console.warn('fetchYouTubeTracks error:', err);
      }
    }
    return [];
  },

  async saveYouTubeTrack(track: YouTubeLearningTrack, currentUser: UserProfile): Promise<void> {
    if (!existingSupabaseClient) return;
    try {
      const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
      if (!uid) return;
      await existingSupabaseClient.from('youtube_learning_tracks').upsert({
        user_id: uid,
        video_id: track.videoId,
        video_url: track.videoUrl,
        title: track.title,
        channel: track.channel,
        channel_url: track.channelUrl,
        thumbnail: track.thumbnail,
        duration_seconds: track.durationSeconds || 0,
        duration_formatted: track.durationFormatted || '0m',
        verified_watched_seconds: track.verifiedWatchedSeconds || 0,
        current_time: track.currentTime || 0,
        completion_percentage: track.completionPercentage || 0,
        status: track.status || 'in_progress',
        watched_ranges: track.watchedRanges || [],
        ai_summary: track.aiSummary,
        notes: track.notes,
        learning_record: track.learningRecord,
        last_watched: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id, video_id' });
    } catch (e) {
      console.warn('saveYouTubeTrack error:', e);
    }
  },

  async deleteYouTubeTrack(videoId: string, currentUser: UserProfile): Promise<void> {
    if (!existingSupabaseClient) return;
    try {
      const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
      if (!uid) return;
      await existingSupabaseClient.from('youtube_learning_tracks').delete().eq('user_id', uid).eq('video_id', videoId);
    } catch (e) {
      console.warn('deleteYouTubeTrack error:', e);
    }
  },

  // 3. Fetch Real Opportunities from Supabase `opportunities` table and `user_opportunity_interactions`
  async fetchOpportunities(currentUser?: UserProfile): Promise<OpportunityItem[]> {
    const cacheKey = `catalog_opportunities_${currentUser?.email || 'all'}`;
    const cached = getFromMemoryCache<OpportunityItem[]>(cacheKey);
    if (cached) return cached;

    if (existingSupabaseClient) {
      try {
        const { data, error } = await existingSupabaseClient.from('opportunities').select('*').limit(50);
        if (!error && Array.isArray(data) && data.length > 0) {
          const userInteractions = new Map<string, { saved: boolean; applied: boolean }>();
          if (currentUser) {
            const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
            if (uid) {
              const { data: interactions } = await existingSupabaseClient
                .from('user_opportunity_interactions')
                .select('*')
                .eq('user_id', uid);
              if (Array.isArray(interactions)) {
                for (const inter of interactions) {
                  userInteractions.set(inter.opportunity_id, {
                    saved: Boolean(inter.saved),
                    applied: Boolean(inter.applied),
                  });
                }
              }
            }
          }

          const mapped: OpportunityItem[] = data.map((o: any) => {
            const userState = userInteractions.get(o.id);
            return {
              id: o.id,
              title: o.title,
              company: o.company,
              locationType: (o.location_type || o.mode === 'Remote' || o.mode === 'Hybrid' || o.mode === 'Onsite') ? (o.location_type || o.mode) : 'Remote',
              matchScore: Number(o.match_score) || 85,
              duration: o.duration || '3 Months',
              verified: Boolean(o.verified),
              tags: Array.isArray(o.tags) ? o.tags : Array.isArray(o.skills) ? o.skills : ['Full Stack', 'Engineering'],
              companyLogoUrl: o.company_logo_url || o.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
              description: o.description || '',
              stipend: o.stipend || 'Competitive',
              deadline: o.deadline || 'Rolling basis',
              applied: userState ? userState.applied : false,
              saved: userState ? userState.saved : false,
            };
          });
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

  async toggleOpportunitySave(opportunityId: string, isSaved: boolean, currentUser: UserProfile): Promise<void> {
    if (!existingSupabaseClient) return;
    try {
      const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
      if (!uid) return;
      await existingSupabaseClient.from('user_opportunity_interactions').upsert({
        user_id: uid,
        opportunity_id: opportunityId,
        saved: isSaved,
      }, { onConflict: 'user_id, opportunity_id' });
    } catch (e) {
      console.warn('toggleOpportunitySave error:', e);
    }
  },

  async applyToOpportunity(opportunityId: string, currentUser: UserProfile): Promise<void> {
    if (!existingSupabaseClient) return;
    try {
      const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
      if (!uid) return;
      await existingSupabaseClient.from('user_opportunity_interactions').upsert({
        user_id: uid,
        opportunity_id: opportunityId,
        applied: true,
        applied_at: new Date().toISOString(),
      }, { onConflict: 'user_id, opportunity_id' });
    } catch (e) {
      console.warn('applyToOpportunity error:', e);
    }
  },

  // 4. Fetch Certifications from Supabase `certifications` and `user_certifications`
  async fetchCertifications(currentUser?: UserProfile): Promise<CertificationItem[]> {
    const cacheKey = `catalog_certifications_${currentUser?.email || 'all'}`;
    const cached = getFromMemoryCache<CertificationItem[]>(cacheKey);
    if (cached) return cached;

    if (existingSupabaseClient) {
      try {
        const { data, error } = await existingSupabaseClient.from('certifications').select('*').limit(50);
        if (!error && Array.isArray(data) && data.length > 0) {
          const userStatusMap = new Map<string, { status: 'Earned' | 'In Progress' | 'Planned'; prepProgress: number }>();
          if (currentUser) {
            const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
            if (uid) {
              const { data: userCerts } = await existingSupabaseClient
                .from('user_certifications')
                .select('*')
                .eq('user_id', uid);
              if (Array.isArray(userCerts)) {
                for (const uc of userCerts) {
                  userStatusMap.set(uc.certification_id, {
                    status: uc.status,
                    prepProgress: uc.prep_progress || 0,
                  });
                }
              }
            }
          }

          const mapped: CertificationItem[] = data.map((c: any) => {
            const userState = userStatusMap.get(c.id);
            return {
              id: c.id,
              title: c.title,
              issuer: c.issuer,
              badgeUrl: c.badge_url,
              difficulty: c.difficulty || 'Associate',
              marketValue: c.market_value || 'High',
              status: userState?.status || c.status || 'Planned',
              prepProgress: userState?.prepProgress ?? (c.prep_progress || 0),
              examCode: c.exam_code,
              targetDate: c.target_date,
              skillsValidated: c.skills_validated || [],
              voucherDiscount: c.voucher_discount,
            };
          });
          setToMemoryCache(cacheKey, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Certifications query fallback:', err);
      }
    }

    setToMemoryCache(cacheKey, initialCertifications);
    return initialCertifications;
  },

  async updateUserCertification(certificationId: string, status: 'Earned' | 'In Progress' | 'Planned', currentUser: UserProfile): Promise<void> {
    if (!existingSupabaseClient) return;
    try {
      const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
      if (!uid) return;
      await existingSupabaseClient.from('user_certifications').upsert({
        user_id: uid,
        certification_id: certificationId,
        status,
        prep_progress: status === 'Earned' ? 100 : status === 'In Progress' ? 50 : 0,
        earned_date: status === 'Earned' ? new Date().toISOString() : null,
      }, { onConflict: 'user_id, certification_id' });
    } catch (e) {
      console.warn('updateUserCertification error:', e);
    }
  },

  // 5. Fetch Webinars from Supabase `webinars` and `webinar_registrations`
  async fetchWebinars(currentUser?: UserProfile): Promise<WebinarItem[]> {
    const cacheKey = `catalog_webinars_${currentUser?.email || 'all'}`;
    const cached = getFromMemoryCache<WebinarItem[]>(cacheKey);
    if (cached) return cached;

    if (existingSupabaseClient) {
      try {
        const { data, error } = await existingSupabaseClient.from('webinars').select('*').limit(50);
        if (!error && Array.isArray(data) && data.length > 0) {
          const userRegs = new Map<string, { isRegistered: boolean; isLiked: boolean; hasClaimedCertificate: boolean }>();
          if (currentUser) {
            const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
            if (uid) {
              const { data: regs } = await existingSupabaseClient
                .from('webinar_registrations')
                .select('*')
                .eq('user_id', uid);
              if (Array.isArray(regs)) {
                for (const r of regs) {
                  userRegs.set(r.webinar_id, {
                    isRegistered: true,
                    isLiked: Boolean(r.is_liked),
                    hasClaimedCertificate: Boolean(r.has_claimed_certificate),
                  });
                }
              }
            }
          }

          const mapped: WebinarItem[] = data.map((w: any) => {
            const userState = userRegs.get(w.id);
            return {
              id: w.id,
              title: w.title,
              speaker: w.speaker || { name: 'Principal Mentor', title: 'Tech Lead', company: 'Brainboost', avatar: '' },
              dateTime: w.date_time || new Date().toISOString(),
              duration: w.duration || '60m',
              tags: w.tags || [],
              status: w.status || 'Upcoming',
              registered: Boolean(userState?.isRegistered),
              isRegistered: Boolean(userState?.isRegistered),
              attendeesCount: w.attendees_count || 0,
              likesCount: w.likes_count || 0,
              isLiked: Boolean(userState?.isLiked),
              youtubeUrl: w.youtube_url,
              youtubeVideoId: w.youtube_video_id,
              zoomMeetingUrl: w.zoom_meeting_url,
              zoomMeetingId: w.zoom_meeting_id,
              zoomPasscode: w.zoom_passcode,
              keyTakeaways: w.key_takeaways || [],
              category: w.category,
              description: w.description,
              thumbnail: w.thumbnail,
              certificateEligible: w.certificate_eligible !== false,
              hasClaimedCertificate: Boolean(userState?.hasClaimedCertificate),
            };
          });
          setToMemoryCache(cacheKey, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Webinars query fallback:', err);
      }
    }

    setToMemoryCache(cacheKey, initialWebinars);
    return initialWebinars;
  },

  async toggleWebinarRsvp(webinarId: string, isRegistering: boolean, currentUser: UserProfile): Promise<void> {
    if (!existingSupabaseClient) return;
    try {
      const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
      if (!uid) return;
      if (isRegistering) {
        await existingSupabaseClient.from('webinar_registrations').upsert({
          user_id: uid,
          webinar_id: webinarId,
        }, { onConflict: 'user_id, webinar_id' });
      } else {
        await existingSupabaseClient.from('webinar_registrations').delete().eq('user_id', uid).eq('webinar_id', webinarId);
      }
    } catch (e) {
      console.warn('toggleWebinarRsvp error:', e);
    }
  },

  async toggleWebinarLike(webinarId: string, isLiked: boolean, currentUser: UserProfile): Promise<void> {
    if (!existingSupabaseClient) return;
    try {
      const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
      if (!uid) return;
      await existingSupabaseClient.from('webinar_registrations').upsert({
        user_id: uid,
        webinar_id: webinarId,
        is_liked: isLiked,
      }, { onConflict: 'user_id, webinar_id' });
    } catch (e) {
      console.warn('toggleWebinarLike error:', e);
    }
  },

  async createWebinar(webinar: Partial<WebinarItem>, currentUser: UserProfile): Promise<void> {
    if (!existingSupabaseClient) return;
    try {
      await existingSupabaseClient.from('webinars').insert({
        id: webinar.id || `webinar-${Date.now()}`,
        title: webinar.title,
        speaker: webinar.speaker,
        date_time: webinar.dateTime || new Date().toISOString(),
        duration: webinar.duration || '60m',
        tags: webinar.tags || [],
        status: webinar.status || 'Upcoming',
        attendees_count: 1,
        likes_count: 0,
        youtube_url: webinar.youtubeUrl,
        youtube_video_id: webinar.youtubeVideoId,
        zoom_meeting_url: webinar.zoomMeetingUrl,
        zoom_meeting_id: webinar.zoomMeetingId,
        zoom_passcode: webinar.zoomPasscode,
        key_takeaways: webinar.keyTakeaways || [],
        category: webinar.category,
        description: webinar.description,
        thumbnail: webinar.thumbnail,
        certificate_eligible: webinar.certificateEligible !== false,
      });
    } catch (e) {
      console.warn('createWebinar error:', e);
    }
  },

  // 6. Fetch Assignments from Supabase `assignments` and `assignment_submissions`
  async fetchAssignments(currentUser?: UserProfile): Promise<AssignmentItem[]> {
    const cacheKey = `catalog_assignments_${currentUser?.email || 'all'}`;
    const cached = getFromMemoryCache<AssignmentItem[]>(cacheKey);
    if (cached) return cached;

    if (existingSupabaseClient) {
      try {
        const { data, error } = await existingSupabaseClient.from('assignments').select('*').limit(50);
        if (!error && Array.isArray(data) && data.length > 0) {
          const submissionsMap = new Map<string, any>();
          if (currentUser) {
            const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
            if (uid) {
              const { data: subs } = await existingSupabaseClient
                .from('assignment_submissions')
                .select('*')
                .eq('user_id', uid);
              if (Array.isArray(subs)) {
                for (const s of subs) {
                  submissionsMap.set(s.assignment_id, s);
                }
              }
            }
          }

          const mapped: AssignmentItem[] = data.map((a: any) => {
            const sub = submissionsMap.get(a.id);
            return {
              id: a.id,
              title: a.title,
              courseOrTopic: a.course_or_topic || a.courseOrTopic || 'Engineering Foundations',
              difficulty: a.difficulty || 'Medium',
              dueDate: a.due_date || 'In 4 days',
              status: sub ? sub.status : 'Pending',
              score: sub?.score,
              maxScore: a.max_score || 100,
              skillsTested: a.skills_tested || [],
              description: a.description || '',
              deliverables: a.deliverables || [],
              rubricCriteria: a.rubric_criteria || [],
              feedback: sub?.feedback,
            };
          });
          setToMemoryCache(cacheKey, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Assignments query fallback:', err);
      }
    }

    setToMemoryCache(cacheKey, initialAssignments);
    return initialAssignments;
  },

  async submitAssignment(assignmentId: string, submission: { githubRepoUrl: string; notes?: string; score?: number; feedback?: string }, currentUser: UserProfile): Promise<void> {
    if (!existingSupabaseClient) return;
    try {
      const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
      if (!uid) return;
      await existingSupabaseClient.from('assignment_submissions').upsert({
        user_id: uid,
        assignment_id: assignmentId,
        status: 'Graded',
        github_repo_url: submission.githubRepoUrl,
        submission_content: submission.notes,
        score: submission.score || 96,
        feedback: submission.feedback,
        submitted_at: new Date().toISOString(),
        graded_at: new Date().toISOString(),
      }, { onConflict: 'user_id, assignment_id' });
    } catch (e) {
      console.warn('submitAssignment error:', e);
    }
  },

  // 7. Fetch Industry Tools from Supabase `industry_tools` and `user_tool_progress`
  async fetchIndustryTools(currentUser?: UserProfile): Promise<IndustryTool[]> {
    const cacheKey = `catalog_tools_${currentUser?.email || 'all'}`;
    const cached = getFromMemoryCache<IndustryTool[]>(cacheKey);
    if (cached) return cached;

    if (existingSupabaseClient) {
      try {
        const { data, error } = await existingSupabaseClient.from('industry_tools').select('*').limit(50);
        if (!error && Array.isArray(data) && data.length > 0) {
          const userToolMap = new Map<string, string>();
          if (currentUser) {
            const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
            if (uid) {
              const { data: progressList } = await existingSupabaseClient
                .from('user_tool_progress')
                .select('*')
                .eq('user_id', uid);
              if (Array.isArray(progressList)) {
                for (const p of progressList) {
                  userToolMap.set(p.tool_id, p.status);
                }
              }
            }
          }

          const mapped: IndustryTool[] = data.map((t: any) => ({
            id: t.id,
            name: t.name,
            category: t.category,
            proficiencyRequired: t.proficiency_required || 'Essential',
            icon: t.icon,
            description: t.description || '',
            status: (userToolMap.get(t.id) as any) || 'Not Started',
            popularFor: t.popular_for || [],
            cheatSheetUrl: t.cheat_sheet_url,
            quickTip: t.quick_tip || '',
            marketDemand: t.market_demand || 90,
          }));
          setToMemoryCache(cacheKey, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Industry tools query fallback:', err);
      }
    }

    setToMemoryCache(cacheKey, initialIndustryTools);
    return initialIndustryTools;
  },

  async updateUserToolProgress(toolId: string, status: 'Not Started' | 'In Progress' | 'Mastered', currentUser: UserProfile): Promise<void> {
    if (!existingSupabaseClient) return;
    try {
      const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
      if (!uid) return;
      await existingSupabaseClient.from('user_tool_progress').upsert({
        user_id: uid,
        tool_id: toolId,
        status,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id, tool_id' });
    } catch (e) {
      console.warn('updateUserToolProgress error:', e);
    }
  },

  // 8. User Roadmap from Supabase `roadmap_nodes` & `user_roadmap_progress`
  async getUserRoadmap(currentUser: UserProfile): Promise<RoadmapNode[]> {
    const cacheKey = `user_roadmap_${currentUser.email || 'anon'}`;
    const cached = getFromMemoryCache<RoadmapNode[]>(cacheKey);
    if (cached) return cached;

    if (existingSupabaseClient) {
      try {
        const { data, error } = await existingSupabaseClient
          .from('roadmap_nodes')
          .select('*')
          .order('order_index', { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          const userProgressMap = new Map<string, { status: 'completed' | 'current' | 'upcoming'; progress: number }>();
          const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
          if (uid) {
            const { data: progressRows } = await existingSupabaseClient
              .from('user_roadmap_progress')
              .select('*')
              .eq('user_id', uid);
            if (Array.isArray(progressRows)) {
              for (const pr of progressRows) {
                userProgressMap.set(pr.node_id, {
                  status: pr.status,
                  progress: pr.progress || 0,
                });
              }
            }
          }

          const mapped: RoadmapNode[] = data.map((n: any) => {
            const up = userProgressMap.get(n.id);
            return {
              id: n.id,
              title: n.title,
              description: n.description || '',
              status: up?.status || 'upcoming',
              progress: up ? up.progress : 0,
              subtopics: n.subtopics || [],
              recommendedResources: n.recommended_resources || [],
            };
          });
          setToMemoryCache(cacheKey, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Supabase roadmap fetch error:', err);
      }
    }

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

  async saveUserRoadmap(nodes: RoadmapNode[], currentUser: UserProfile): Promise<void> {
    const cacheKey = `user_roadmap_${currentUser.email || 'anon'}`;
    setToMemoryCache(cacheKey, nodes);
    try {
      localStorage.setItem(getStorageKey('user_roadmap', currentUser), JSON.stringify(nodes));
    } catch (e) {}

    if (!existingSupabaseClient) return;
    try {
      const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
      if (!uid) return;
      for (const node of nodes) {
        await existingSupabaseClient.from('user_roadmap_progress').upsert({
          user_id: uid,
          node_id: node.id,
          status: node.status,
          progress: node.progress,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id, node_id' });
      }
    } catch (e) {
      console.warn('saveUserRoadmap error:', e);
    }
  },

  async saveUserRoadmapProgress(nodeId: string, status: string, progress: number, currentUser: UserProfile): Promise<void> {
    if (!existingSupabaseClient) return;
    try {
      const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
      if (!uid) return;
      await existingSupabaseClient.from('user_roadmap_progress').upsert({
        user_id: uid,
        node_id: nodeId,
        status,
        progress,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id, node_id' });
    } catch (e) {
      console.warn('saveUserRoadmapProgress error:', e);
    }
  },

  // 9. Certificates Persistence in Supabase `certificates` table
  async saveCertificate(cert: GeneratedCertificate, currentUser: UserProfile): Promise<void> {
    if (!existingSupabaseClient) return;
    try {
      const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
      if (!uid) return;
      await existingSupabaseClient.from('certificates').upsert({
        serial_id: cert.serialId,
        user_id: uid,
        type: cert.type,
        item_id: cert.itemId,
        title: cert.title,
        recipient_name: cert.recipientName,
        recipient_email: cert.recipientEmail || currentUser.email,
        instructor_or_speaker: cert.instructorOrSpeaker,
        instructor_role: cert.instructorRole,
        organization: cert.organization,
        issue_date: cert.issueDate || new Date().toISOString(),
        duration_formatted: cert.durationFormatted || '60m',
        completion_percentage: cert.completionPercentage || 100,
        watch_time_seconds: cert.watchTimeSeconds || 0,
        required_watch_time_seconds: cert.requiredWatchTimeSeconds || 0,
        skills_validated: cert.skillsValidated || [],
        legal_disclaimer: cert.legalDisclaimer || 'Unofficial completion record.',
        verification_url: cert.verificationUrl || `https://brainboost.ai/verify/${cert.serialId}`,
        verification_badge: cert.verificationBadge,
      }, { onConflict: 'serial_id' });
    } catch (e) {
      console.warn('saveCertificate error:', e);
    }
  },

  // 10. Safety Scan Report in Supabase `safety_reports` table
  async saveSafetyReport(report: any, jobOfferText: string, currentUser: UserProfile): Promise<void> {
    if (!existingSupabaseClient) return;
    try {
      const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
      if (!uid) return;
      await existingSupabaseClient.from('safety_reports').insert({
        user_id: uid,
        job_offer_text: jobOfferText,
        risk_score: report.riskScore ?? 0,
        risk_level: report.riskLevel || 'LOW RISK',
        summary: report.summary || 'Safety analysis completed.',
        detected_signals: report.detectedSignals || [],
        recommendation: report.recommendation || '',
        verification_checklist: report.verificationChecklist || [],
      });
    } catch (e) {
      console.warn('saveSafetyReport error:', e);
    }
  },

  // 11. Nebula AI Copilot Message in Supabase `ai_chat_messages` table
  async saveNebulaMessage(message: ChatMessage, currentUser: UserProfile): Promise<void> {
    if (!existingSupabaseClient) return;
    try {
      const uid = await resolveUserUuid(existingSupabaseClient, currentUser);
      if (!uid) return;
      await existingSupabaseClient.from('ai_chat_messages').insert({
        user_id: uid,
        role: message.role === 'model' ? 'model' : 'user',
        content: message.content,
        model_used: message.modelUsed || 'gemini-3.7-flash',
        thinking_mode_active: Boolean(message.thinkingModeActive),
        language: message.language || 'English',
        mode: message.mode || 'career',
      });
    } catch (e) {
      console.warn('saveNebulaMessage error:', e);
    }
  },
};

