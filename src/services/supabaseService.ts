import { SupabaseClient } from '@supabase/supabase-js';
import { supabase as existingSupabaseClient, reportServiceError } from '../supabaseClient';
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

async function requireConnectivityUser(): Promise<string> {
  const { data, error } = await existingSupabaseClient.auth.getSession();
  if (error || !data.session?.user.id) throw new Error('Please sign in again to save your changes.');
  return data.session.user.id;
}

function mapNetworkMessage(row: any): NetworkMessage {
  return { id: row.id, senderId: row.sender_id, receiverId: row.receiver_id, content: row.content,
    timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isRead: Boolean(row.is_read), deliveredAt: row.delivered_at, readAt: row.read_at, attachmentPath: row.attachment_path };
}

async function hydrateMessagePhoto(row: any): Promise<NetworkMessage> {
  const message = mapNetworkMessage(row);
  if (message.attachmentPath) {
    const { data } = await existingSupabaseClient.storage.from('chat-photos').createSignedUrl(message.attachmentPath, 3600);
    message.attachmentUrl = data?.signedUrl;
  }
  return message;
}

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

const PROFILE_VERIFICATION_LIKE_THRESHOLD = 10;

const emptyNetworkVerification = (): NonNullable<NetworkUser['verification']> => ({
  isVerified: false,
  verifiedSkills: [],
  certificateCount: 0,
  certificatePostCount: 0,
  totalPostLikes: 0,
  likeThreshold: PROFILE_VERIFICATION_LIKE_THRESHOLD,
  learningEvidenceCount: 0,
});

const mapGeneratedCertificateRow = (row: any): GeneratedCertificate => {
  const allowedTypes = ['course', 'webinar', 'youtube_track', 'specialization'];
  return {
    id: row.id,
    serialId: row.serial_id || row.id,
    type: (allowedTypes.includes(row.type) ? row.type : 'course') as GeneratedCertificate['type'],
    itemId: row.item_id || '',
    title: row.title || 'Verified Learning Certificate',
    recipientName: row.recipient_name || '',
    recipientEmail: row.recipient_email || undefined,
    instructorOrSpeaker: row.instructor_or_speaker || 'Brain Boost Learning',
    instructorRole: row.instructor_role || undefined,
    organization: row.organization || 'Brain Boost',
    issueDate: row.issue_date ? new Date(row.issue_date).toLocaleDateString() : '',
    durationFormatted: row.duration_formatted || '',
    completionPercentage: Number(row.completion_percentage ?? 100),
    watchTimeSeconds: Number(row.watch_time_seconds ?? 0),
    requiredWatchTimeSeconds: Number(row.required_watch_time_seconds ?? 0),
    watchTimeFormatted: row.watch_time_formatted || undefined,
    skillsValidated: Array.isArray(row.skills_validated) ? row.skills_validated : [],
    legalDisclaimer: row.legal_disclaimer || 'Verified completion and skill mastery credential.',
    verificationUrl: row.verification_url || '',
    verificationBadge: row.verification_badge || undefined,
  };
};

async function fetchVerificationEvidence(userIds: string[]): Promise<Map<string, {
  verification: NonNullable<NetworkUser['verification']>;
  certificates: GeneratedCertificate[];
}>> {
  const result = new Map<string, {
    verification: NonNullable<NetworkUser['verification']>;
    certificates: GeneratedCertificate[];
  }>();

  const ids = [...new Set(userIds.filter(Boolean))];
  ids.forEach((id) => result.set(id, { verification: emptyNetworkVerification(), certificates: [] }));
  if (!existingSupabaseClient || ids.length === 0) return result;

  try {
    const [certResult, skillResult, postResult] = await Promise.all([
      existingSupabaseClient
        .from('generated_certificates')
        .select('*')
        .in('user_id', ids),
      existingSupabaseClient
        .from('user_skills')
        .select('user_id, skill_name, verified')
        .in('user_id', ids),
      existingSupabaseClient
        .from('network_posts')
        .select('id, author_id, attached_certificate_id, likes_count')
        .in('author_id', ids),
    ]);

    const certificateRows = Array.isArray(certResult.data) ? certResult.data : [];
    const skillRows = Array.isArray(skillResult.data) ? skillResult.data : [];
    const postRows = Array.isArray(postResult.data) ? postResult.data : [];
    const postIds = postRows.map((post: any) => post.id).filter(Boolean);

    let likeRows: any[] = [];
    if (postIds.length > 0) {
      const likeResult = await existingSupabaseClient
        .from('network_post_likes')
        .select('post_id')
        .in('post_id', postIds);
      likeRows = Array.isArray(likeResult.data) ? likeResult.data : [];
    }

    const likeCountByPost = new Map<string, number>();
    likeRows.forEach((like: any) => {
      likeCountByPost.set(like.post_id, (likeCountByPost.get(like.post_id) || 0) + 1);
    });

    ids.forEach((userId) => {
      const completedCertificates = certificateRows
        .filter((row: any) => row.user_id === userId && Number(row.completion_percentage ?? 100) >= 100)
        .map(mapGeneratedCertificateRow);

      const verifiedSkillNames = skillRows
        .filter((row: any) => row.user_id === userId && row.verified === true)
        .map((row: any) => String(row.skill_name || '').trim())
        .filter(Boolean);

      const certificateSkills = completedCertificates.flatMap((cert) => cert.skillsValidated || []);
      const verifiedSkills = [...new Set([...verifiedSkillNames, ...certificateSkills])];

      const userPosts = postRows.filter((post: any) => post.author_id === userId);
      const certificatePostCount = userPosts.filter((post: any) => Boolean(post.attached_certificate_id)).length;
      const totalPostLikes = userPosts.reduce(
        (sum: number, post: any) => sum + (likeCountByPost.get(post.id) || Number(post.likes_count || 0)),
        0
      );
      const learningEvidenceCount = verifiedSkills.length + completedCertificates.length;
      const isVerified =
        completedCertificates.length > 0 &&
        certificatePostCount > 0 &&
        totalPostLikes >= PROFILE_VERIFICATION_LIKE_THRESHOLD;

      result.set(userId, {
        certificates: completedCertificates,
        verification: {
          isVerified,
          verifiedSkills,
          certificateCount: completedCertificates.length,
          certificatePostCount,
          totalPostLikes,
          likeThreshold: PROFILE_VERIFICATION_LIKE_THRESHOLD,
          learningEvidenceCount,
        },
      });
    });
  } catch (error) {
    console.warn('Verification evidence lookup notice:', error);
  }

  return result;
}

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
    name: row.name || (row.email ? row.email.split('@')[0] : 'Member'),
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
    bio: row.bio || 'Developer learning, building projects, and connecting with peers.',
    portfolioUrl: row.portfolio_url || row.portfolioUrl || undefined,
    isVerified: false,
    verification: emptyNetworkVerification(),
    followersCount: Number(row.followers_count ?? row.followersCount ?? 0),
    followingCount: Number(row.following_count ?? row.followingCount ?? 0),
    isFollowing: false,
    isFollower: false,
    isFriend: false,
    isPrivate: Boolean(row.is_private_account ?? row.isPrivate),
    isLibraryPrivate: Boolean(row.is_private_account ?? row.isPrivate),
    hasAccessToLibrary: !Boolean(row.is_private_account ?? row.isPrivate),
    skills: skillsArray,
    interests: interestsArray,
    certificates: [],
    libraryItems: [],
    projects: [],
    internships: [],
    achievements: [],
    onlineStatus: row.online_status === 'online' && Date.now() - new Date(row.last_seen_at || 0).getTime() < 90000 ? 'online' : 'offline',
    lastSeenAt: row.last_seen_at, onlineAt: row.online_at,
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
      `Student developer targeting ${user.targetRole || 'Full Stack Engineering'} and building real projects.`,
    portfolioUrl: user.portfolioUrl || undefined,
    isVerified: false,
    verification: emptyNetworkVerification(),
    followersCount: user.followersCount ?? 0,
    followingCount: user.followingCount ?? 0,
    isFollowing: false,
    isFollower: false,
    isFriend: false,
    isPrivate: Boolean(user.isPrivateAccount),
    isLibraryPrivate: Boolean(user.isPrivateAccount),
    skills: user.skills && user.skills.length > 0 ? user.skills : [],
    interests: user.interests && user.interests.length > 0 ? user.interests : [],
    certificates: user.earnedCertificates || [],
    libraryItems: libraryItems || [],
    projects: user.projects || [],
    internships: user.internships || [],
    achievements: user.achievements || [],
    onlineStatus: 'offline',
  };
}

/**
 * Resolves user's unique UUID in Supabase database from session or profile email lookup
 */
export async function resolveUserUuid(client: any, user?: UserProfile): Promise<string | null> {
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  return error ? null : data.session?.user?.id || null;
}

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
        username: cleanUsername, user_id_handle: '@' + cleanUsername,
        skills: user.skills || [], interests: user.interests || [],
        connectivity_setup_completed: Boolean(user.connectivitySetupCompleted),
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
        is_library_private: Boolean(user.isPrivateAccount),
        overall_readiness: user.overallReadiness || 65,
        updated_at: new Date().toISOString(),
      };

      // Never fall back to an email lookup for ownership of a write.
      profilePayload.id = await requireConnectivityUser();

      const { data: upsertedProfile, error: profileError } = await existingSupabaseClient.from('profiles').upsert(profilePayload, {
        onConflict: 'id',
      }).select('id').maybeSingle();
      if (profileError) throw profileError;

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
      reportServiceError('Your profile could not be saved. Please try again.');
      throw err;
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
    const uid = await requireConnectivityUser();
    const username = data.userId.replace(/^@/, '');
    const { error } = await existingSupabaseClient.from('profiles').upsert({
      id: uid, email: user.email.toLowerCase().trim(), username,
      user_id_handle: '@' + username, name: data.name, avatar_url: data.avatarUrl,
      headline: data.headline || '', bio: data.bio || '', skills: data.skills,
      interests: data.interests, connectivity_setup_completed: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (error) throw error;
    try { localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.SETUP_DONE, user), 'true'); } catch {}
  },

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

          const verificationByUser = await fetchVerificationEvidence(peers.map((row: any) => row.id));

          return peers.map((row: any) => {
            const baseUser = mapRowToNetworkUser(row, myUid || 'current-user');
            const targetId = row.id;

            const isFollowing = myUid ? allFollows.some((f) => f.follower_id === myUid && f.following_id === targetId) : false;
            const isFollower = myUid ? allFollows.some((f) => f.follower_id === targetId && f.following_id === myUid) : false;
            const isFriend = Boolean(isFollowing && isFollower);
            const liveFollowers = allFollows.filter((f) => f.following_id === targetId).length;
            const liveFollowing = allFollows.filter((f) => f.follower_id === targetId).length;

            const evidence = verificationByUser.get(targetId);
            return {
              ...baseUser,
              followersCount: liveFollowers,
              followingCount: liveFollowing,
              isFollowing,
              isFollower,
              isFriend,
              certificates: evidence?.certificates || [],
              isVerified: evidence?.verification.isVerified || false,
              verification: evidence?.verification || emptyNetworkVerification(),
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

          const verificationByUser = await fetchVerificationEvidence(peers.map((row: any) => row.id));

          const finalUsers: NetworkUser[] = peers.map((row: any) => {
            const baseUser = mapRowToNetworkUser(row, myUid || currentMapped.id);
            const targetId = row.id;

            const isFollowing = myUid ? allFollows.some((f) => f.follower_id === myUid && f.following_id === targetId) : false;
            const isFollower = myUid ? allFollows.some((f) => f.follower_id === targetId && f.following_id === myUid) : false;
            const isFriend = Boolean(isFollowing && isFollower);
            const liveFollowersCount = allFollows.filter((f) => f.following_id === targetId).length;
            const liveFollowingCount = allFollows.filter((f) => f.follower_id === targetId).length;

            const evidence = verificationByUser.get(targetId);
            return {
              ...baseUser,
              followersCount: liveFollowersCount,
              followingCount: liveFollowingCount,
              isFollowing,
              isFollower,
              isFriend,
              certificates: evidence?.certificates || [],
              isVerified: evidence?.verification.isVerified || false,
              verification: evidence?.verification || emptyNetworkVerification(),
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

  async fetchCurrentNetworkProfile(currentUser: UserProfile): Promise<NetworkUser> {
    const uid = await requireConnectivityUser();
    const { data: row } = await existingSupabaseClient
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    const baseUser = row
      ? mapRowToNetworkUser(row, uid)
      : mapProfileToNetworkUser({ ...currentUser, id: uid });

    const evidence = (await fetchVerificationEvidence([uid])).get(uid);
    const [followers, following] = await Promise.all([
      existingSupabaseClient.from('network_follows').select('*', { count: 'exact', head: true }).eq('following_id', uid),
      existingSupabaseClient.from('network_follows').select('*', { count: 'exact', head: true }).eq('follower_id', uid),
    ]);

    return {
      ...baseUser,
      followersCount: followers.count ?? baseUser.followersCount,
      followingCount: following.count ?? baseUser.followingCount,
      certificates: evidence?.certificates || baseUser.certificates || [],
      isVerified: evidence?.verification.isVerified || false,
      verification: evidence?.verification || emptyNetworkVerification(),
    };
  },

  async fetchCurrentFollowCounts(): Promise<{ followersCount: number; followingCount: number }> {
    const uid = await requireConnectivityUser();
    const [followers, following] = await Promise.all([
      existingSupabaseClient.from('network_follows').select('*', { count: 'exact', head: true }).eq('following_id', uid),
      existingSupabaseClient.from('network_follows').select('*', { count: 'exact', head: true }).eq('follower_id', uid),
    ]);
    if (followers.error) throw followers.error;
    if (following.error) throw following.error;
    return { followersCount: followers.count ?? 0, followingCount: following.count ?? 0 };
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

      const verificationByUser = await fetchVerificationEvidence(profiles.map((profile: any) => profile.id));

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
        const evidence = verificationByUser.get(p.id);
        return {
          ...mapped,
          isFollowing,
          isFollower,
          isFriend: Boolean(isFollowing && isFollower),
          followersCount,
          followingCount,
          certificates: evidence?.certificates || [],
          isVerified: evidence?.verification.isVerified || false,
          verification: evidence?.verification || emptyNetworkVerification(),
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

      const verificationByUser = await fetchVerificationEvidence(profiles.map((profile: any) => profile.id));

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
        const evidence = verificationByUser.get(p.id);
        return {
          ...mapped,
          isFollowing,
          isFollower,
          isFriend: Boolean(isFollowing && isFollower),
          followersCount,
          followingCount,
          certificates: evidence?.certificates || [],
          isVerified: evidence?.verification.isVerified || false,
          verification: evidence?.verification || emptyNetworkVerification(),
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
          .select('*, author:profiles(*), likes:network_post_likes(user_id), comments:network_post_comments(*,author:profiles(*)), certificate:generated_certificates(*)')
          .order('created_at', { ascending: false })
          .limit(30);

        if (!error && Array.isArray(data)) {
          const currentMapped = mapProfileToNetworkUser(currentUser);
          const mappedPosts: NetworkPost[] = data.map((p: any) => ({
            id: p.id,
            author: {
              id: p.author_id,
              name: p.author?.name || 'Member',
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
            isLiked: (p.likes || []).some((like: any) => like.user_id === currentMapped.id),
            commentsCount: Number(p.comments_count || 0),
            repostsCount: Number(p.reposts_count || 0),
            imageUrl: p.image_url,
            codeSnippet: p.code_snippet,
            poll: p.poll,
            attachedCertificate: p.certificate ? { ...p.certificate, serialId: p.certificate.serial_id,
              title: p.certificate.title, skillsValidated: p.certificate.skills_validated || [],
              organization: p.certificate.organization, issueDate: p.certificate.issue_date,
              recipientName: p.certificate.recipient_name, type: p.certificate.type } : undefined,
            comments: (p.comments || []).map((c: any) => ({ id: c.id, authorId: c.author_id,
              authorName: c.author?.name || 'Member', authorAvatar: c.author?.avatar_url || '',
              authorHeadline: c.author?.headline || '', content: c.content,
              timestamp: new Date(c.created_at).toLocaleString(), likesCount: c.likes_count || 0, isLiked: false })),
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
        const authorUuid = await requireConnectivityUser();
        if (authorUuid) {
          const { data, error } = await existingSupabaseClient
            .from('network_posts')
            .insert({
              author_id: authorUuid,
              content: payload.content,
              image_url: payload.imageUrl,
              code_snippet: payload.codeSnippet,
              attached_certificate_id: payload.attachedCertificate?.id,
              tags: payload.tags || ['#Brainboost'],
              skills: newPost.skills,
            })
            .select()
            .single();

          if (!error && data) {
            newPost.id = data.id;
          } else if (error) {
            throw error;
          }
        }
      } catch (err) {
        throw err;
      }
    }

    const existingPosts = this.getPosts(currentUser);
    const updated = [newPost, ...existingPosts];
    this.saveLocalPosts(updated, currentUser);
    return newPost;
  },

  async deletePost(postId: string, currentUser: UserProfile): Promise<NetworkPost[]> {
    const uid = await requireConnectivityUser();
    const { error } = await existingSupabaseClient
      .from('network_posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', uid);

    if (error) throw error;

    const cached = this.getPosts(currentUser).filter((post) => post.id !== postId);
    this.saveLocalPosts(cached, currentUser);
    return this.fetchPosts(currentUser);
  },

  // Like & Comment handlers
  async toggleLike(postId: string, currentUser: UserProfile): Promise<NetworkPost[]> {
    const uid = await requireConnectivityUser();
    const { data: like, error: readError } = await existingSupabaseClient.from('network_post_likes')
      .select('id').eq('post_id', postId).eq('user_id', uid).maybeSingle();
    if (readError) throw readError;
    const { error } = like
      ? await existingSupabaseClient.from('network_post_likes').delete().eq('id', like.id)
      : await existingSupabaseClient.from('network_post_likes').insert({ post_id: postId, user_id: uid });
    if (error) throw error;
    return this.fetchPosts(currentUser);
  },

  async addComment(postId: string, content: string, currentUser: UserProfile): Promise<NetworkPost[]> {
    const uid = await requireConnectivityUser();
    if (!content.trim()) throw new Error('Comment cannot be empty.');
    const { error } = await existingSupabaseClient.from('network_post_comments').insert({
      post_id: postId, author_id: uid, content: content.trim(),
    });
    if (error) throw error;
    return this.fetchPosts(currentUser);
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

  startActivityTracking(): () => void {
    let stopped = false;
    let wasActive = false;
    const heartbeat = async () => {
      try {
        const uid = await requireConnectivityUser();
        if (stopped) return;
        const active = navigator.onLine && document.visibilityState === 'visible';
        const fields: Record<string, string> = { online_status: active ? 'online' : 'offline', last_seen_at: new Date().toISOString() };
        if (active && !wasActive) fields.online_at = fields.last_seen_at;
        wasActive = active;
        await existingSupabaseClient.from('profiles').update(fields).eq('id', uid);
      } catch { /* An expired heartbeat naturally shows offline after 90 seconds. */ }
    };
    heartbeat();
    const timer = window.setInterval(heartbeat, 30000);
    document.addEventListener('visibilitychange', heartbeat);
    window.addEventListener('online', heartbeat);
    window.addEventListener('offline', heartbeat);
    return () => { stopped = true; window.clearInterval(timer); document.removeEventListener('visibilitychange', heartbeat); window.removeEventListener('online', heartbeat); window.removeEventListener('offline', heartbeat); };
  },

  async fetchConversations(currentUser: UserProfile): Promise<NetworkConversation[]> {
    const uid = await requireConnectivityUser();
    const { data, error } = await existingSupabaseClient.from('network_messages')
      .select('*').or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order('created_at', { ascending: false }).limit(500);
    if (error) throw error;
    await existingSupabaseClient.from('network_messages').update({ delivered_at: new Date().toISOString() }).eq('receiver_id', uid).is('delivered_at', null);
    const rows = (data || []).reverse();
    const hydrated = new Map((await Promise.all(rows.map(hydrateMessagePhoto))).map(msg => [msg.id, msg]));
    const peerIds = [...new Set(rows.map(row => row.sender_id === uid ? row.receiver_id : row.sender_id))];
    if (!peerIds.length) { this.saveConversations([], currentUser); return []; }
    const { data: profiles, error: profileError } = await existingSupabaseClient.from('profiles')
      .select('*').in('id', peerIds);
    if (profileError) throw profileError;
    const peers = new Map((profiles || []).map(row => [row.id, mapRowToNetworkUser(row, uid)]));
    const grouped = new Map<string, NetworkConversation>();
    for (const row of rows) {
      const peerId = row.sender_id === uid ? row.receiver_id : row.sender_id;
      const participant = peers.get(peerId);
      if (!participant) continue;
      const msg = hydrated.get(row.id)!;
      const conv = grouped.get(peerId) || { id: row.conversation_id || `conv-${peerId}`,
        participant, lastMessage: '', lastMessageTime: '', unreadCount: 0, messages: [] };
      conv.messages.push(msg);
      conv.lastMessage = msg.content;
      conv.lastMessageTime = msg.timestamp;
      if (row.receiver_id === uid && !row.is_read) conv.unreadCount++;
      grouped.delete(peerId); grouped.set(peerId, conv);
    }
    const conversations = [...grouped.values()].reverse();
    this.saveConversations(conversations, currentUser);
    return conversations;
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
    const uid = await requireConnectivityUser();
    const targetUid = await resolveTargetUuid(existingSupabaseClient, participantId);
    if (!targetUid) throw new Error('This member could not be found.');
    const { data, error } = await existingSupabaseClient.from('network_messages').select('*')
      .or(`and(sender_id.eq.${uid},receiver_id.eq.${targetUid}),and(sender_id.eq.${targetUid},receiver_id.eq.${uid})`)
      .order('created_at', { ascending: false }).limit(150);
    if (error) throw error;
    const messages = await Promise.all((data || []).reverse().map(hydrateMessagePhoto));
    const { error: readError } = await existingSupabaseClient.from('network_messages')
      .update({ is_read: true }).eq('sender_id', targetUid).eq('receiver_id', uid).eq('is_read', false);
    if (readError) console.warn('Could not mark messages as read', readError);
    const convs = this.getConversations(currentUser).map(conv => conv.participant.id === targetUid
      ? { ...conv, messages, unreadCount: 0 } : conv);
    this.saveConversations(convs, currentUser);
    return messages;
  },

  // Send real-time chat message with broadcast & Supabase sync
  async sendMessage(participant: NetworkUser, content: string, currentUser: UserProfile, photo?: File)
    : Promise<{ updatedConversations: NetworkConversation[]; newMsg: NetworkMessage }> {
    const sender = await requireConnectivityUser();
    const receiver = await resolveTargetUuid(existingSupabaseClient, participant.id);
    if (!receiver || sender === receiver) throw new Error('Select another registered member to chat.');
    if (!content.trim() && !photo) throw new Error('Message cannot be empty.');
    if (photo && (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 5 * 1024 * 1024)) throw new Error('Choose a JPG, PNG, or WebP photo under 5 MB.');
    const [one, two] = [sender, receiver].sort();
    // Deterministic ordering prevents duplicate conversations when both peers send together.
    const { data: conversation, error: convError } = await existingSupabaseClient.from('network_conversations')
      .upsert({ participant_one_id: one, participant_two_id: two },
        { onConflict: 'participant_one_id,participant_two_id' }).select('id').single();
    if (convError) throw convError;
    let attachmentPath: string | undefined;
    if (photo) {
      attachmentPath = `${sender}/${crypto.randomUUID()}.${photo.type.split('/')[1]}`;
      const { error: uploadError } = await existingSupabaseClient.storage.from('chat-photos').upload(attachmentPath, photo, { contentType: photo.type });
      if (uploadError) throw uploadError;
    }
    const { data, error } = await existingSupabaseClient.from('network_messages').insert({
      conversation_id: conversation.id, sender_id: sender, receiver_id: receiver,
      content: content.trim() || "Photo", is_read: false, attachment_path: attachmentPath,
    }).select('*').single();
    if (error) {
      if (attachmentPath) await existingSupabaseClient.storage.from('chat-photos').remove([attachmentPath]);
      throw error;
    }
    const newMsg = await hydrateMessagePhoto(data);
    const convs = this.getConversations(currentUser);
    const existing = convs.find(conv => conv.participant.id === receiver);
    const updatedConv = { id: conversation.id, participant: { ...participant, id: receiver },
      lastMessage: newMsg.content, lastMessageTime: newMsg.timestamp, unreadCount: 0,
      messages: [...(existing?.messages || []).filter(msg => msg.id !== newMsg.id), newMsg] };
    const updatedConversations = [updatedConv, ...convs.filter(conv => conv.participant.id !== receiver)];
    this.saveConversations(updatedConversations, currentUser);
    return { updatedConversations, newMsg };
  },

  // Subscribe to real-time incoming messages for current user across DB Postgres Changes.
  // Supabase Realtime automatically reconnects after brief socket/network interruptions, so
  // transient CHANNEL_ERROR/TIMED_OUT states should not be promoted to a persistent UI error.
  subscribeToRealtimeChat(currentUser: UserProfile,
    onIncomingMessage: (msg: NetworkMessage, participant: NetworkUser) => void,
    onReceiptUpdate?: () => void): () => void {
    let channel: any;
    let disposed = false;
    let reconnectWarningTimer: number | undefined;
    let reconnectWarningShown = false;
    const seen = new Set<string>();

    const clearReconnectWarningTimer = () => {
      if (reconnectWarningTimer !== undefined) {
        window.clearTimeout(reconnectWarningTimer);
        reconnectWarningTimer = undefined;
      }
    };

    requireConnectivityUser().then(uid => {
      if (disposed) return;
      channel = existingSupabaseClient.channel(`network-chat-${uid}-${crypto.randomUUID()}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'network_messages',
          filter: `receiver_id=eq.${uid}` }, async ({ new: row }) => {
          if (disposed || seen.has(row.id)) return;
          seen.add(row.id);
          const { data: profile } = await existingSupabaseClient.from('profiles').select('*')
            .eq('id', row.sender_id).maybeSingle();
          if (disposed || !profile) return;
          await existingSupabaseClient.from('network_messages').update({ delivered_at: new Date().toISOString() }).eq('id', row.id).eq('receiver_id', uid).is('delivered_at', null);
          const msg = await hydrateMessagePhoto(row);
          const participant = mapRowToNetworkUser(profile, uid);
          const convs = this.getConversations(currentUser);
          let conv = convs.find(c => c.participant.id === participant.id);
          if (!conv) {
            conv = { id: row.conversation_id || `conv-${participant.id}`, participant,
              lastMessage: '', lastMessageTime: '', unreadCount: 0, messages: [] };
            convs.unshift(conv);
          }
          if (!conv.messages.some(m => m.id === msg.id)) conv.messages.push(msg);
          conv.lastMessage = msg.content; conv.lastMessageTime = msg.timestamp; conv.unreadCount++;
          const ordered = [conv, ...convs.filter(c => c.participant.id !== participant.id)];
          this.saveConversations(ordered, currentUser);
          onIncomingMessage(msg, participant);
        }).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'network_messages', filter: `sender_id=eq.${uid}` }, () => onReceiptUpdate?.()).subscribe((status, error) => {
          if (disposed) return;

          if (status === 'SUBSCRIBED') {
            clearReconnectWarningTimer();
            if (reconnectWarningShown) {
              reconnectWarningShown = false;
              reportServiceError('');
            }
            return;
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn('Realtime chat reconnect notice:', status, error || '');
            clearReconnectWarningTimer();

            // Give the SDK time to reconnect before surfacing anything to the user.
            reconnectWarningTimer = window.setTimeout(() => {
              reconnectWarningTimer = undefined;
              if (disposed || channel?.state === 'joined') return;
              reconnectWarningShown = true;
              reportServiceError('Live chat is reconnecting. Messages are still saved and will sync automatically.');
            }, 12000);
          }
        });
    }).catch(error => {
      if (!disposed) reportServiceError(error.message);
    });

    return () => {
      disposed = true;
      clearReconnectWarningTimer();
      if (channel) existingSupabaseClient.removeChannel(channel);
    };
  },

  // Subscribe to live network events (follow/unfollow, live count changes)
  subscribeToNetworkEvents(currentUser: UserProfile,
    onEvent: (event: { type: string; payload: any }) => void): () => void {
    const channel = existingSupabaseClient.channel(`network-events-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'network_follows' },
        payload => onEvent({ type: 'follow_change', payload }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'library_access_requests' },
        payload => onEvent({ type: 'library_change', payload })).subscribe();
    return () => { existingSupabaseClient.removeChannel(channel); };
  },

  // Toggle user follow / connect with direct Supabase persistence & real-time broadcast
  async toggleFollow(targetUserId: string, currentUser: UserProfile): Promise<NetworkUser[]> {
    const uid = await requireConnectivityUser();
    const target = await resolveTargetUuid(existingSupabaseClient, targetUserId);
    if (!target || target === uid) throw new Error('Select another registered member.');
    const { data: existing, error: readError } = await existingSupabaseClient.from('network_follows')
      .select('id').eq('follower_id', uid).eq('following_id', target).maybeSingle();
    if (readError) throw readError;
    const { error } = existing
      ? await existingSupabaseClient.from('network_follows').delete().eq('id', existing.id)
      : await existingSupabaseClient.from('network_follows').insert({ follower_id: uid, following_id: target, status: 'approved' });
    if (error) throw error;
    return this.fetchUsers(currentUser);
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

  async fetchAccessRequests(currentUser: UserProfile): Promise<LibraryAccessRequest[]> {
    const uid = await requireConnectivityUser();
    const { data, error } = await existingSupabaseClient.from('library_access_requests')
      .select('*,requester:profiles!library_access_requests_requester_id_fkey(name,avatar_url,headline)')
      .or(`requester_id.eq.${uid},target_user_id.eq.${uid}`).order('requested_at', { ascending: false });
    if (error) throw error;
    const requests = (data || []).map(row => ({ id: row.id, requesterId: row.requester_id,
      requesterName: row.requester?.name || 'Member', requesterAvatar: row.requester?.avatar_url || '',
      requesterHeadline: row.requester?.headline || '', targetUserId: row.target_user_id,
      requestedAt: new Date(row.requested_at).toLocaleString(), status: row.status }));
    this.saveAccessRequests(requests, currentUser);
    return requests;
  },

  async requestLibraryAccess(targetUserId: string, currentUser: UserProfile)
    : Promise<{ success: boolean; request: LibraryAccessRequest }> {
    const uid = await requireConnectivityUser();
    const { error } = await existingSupabaseClient.from('library_access_requests').insert({
      requester_id: uid, target_user_id: targetUserId, status: 'pending',
    });
    if (error && error.code !== '23505') throw error;
    const requests = await this.fetchAccessRequests(currentUser);
    const request = requests.find(r => r.targetUserId === targetUserId && r.requesterId === uid);
    if (!request) throw new Error('Could not load your access request.');
    return { success: true, request };
  },

  async respondToAccessRequest(requestId: string, decision: 'approved' | 'declined', currentUser: UserProfile)
    : Promise<LibraryAccessRequest[]> {
    const uid = await requireConnectivityUser();
    const { data, error } = await existingSupabaseClient.from('library_access_requests')
      .update({ status: decision, responded_at: new Date().toISOString() })
      .eq('id', requestId).eq('target_user_id', uid).select('id').single();
    if (error || !data) throw error || new Error('Access request was not found.');
    return this.fetchAccessRequests(currentUser);
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
            .from('youtube_tracks')
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
              currentTime: Number(t.current_time_spent) || 0,
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
      await existingSupabaseClient.from('youtube_tracks').upsert({
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
        current_time_spent: track.currentTime || 0,
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
      await existingSupabaseClient.from('youtube_tracks').delete().eq('user_id', uid).eq('video_id', videoId);
    } catch (e) {
      console.warn('deleteYouTubeTrack error:', e);
    }
  },

  // 3. Fetch Real Opportunities from Supabase `opportunities` table and `user_opportunities`
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
                .from('user_opportunities')
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
      await existingSupabaseClient.from('user_opportunities').upsert({
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
      await existingSupabaseClient.from('user_opportunities').upsert({
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

  async submitAssignment(assignmentId: string, submission: { githubRepoUrl: string; notes?: string }, currentUser: UserProfile): Promise<void> {
    const uid = await requireConnectivityUser();
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(assignmentId)) {
      throw new Error('This is a sample assignment. A published assignment is required to submit for review.');
    }
    const { error } = await existingSupabaseClient.from('assignment_submissions').upsert({
      user_id: uid,
      assignment_id: assignmentId,
      status: 'Submitted',
      github_repo_url: submission.githubRepoUrl,
      notes: submission.notes,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'user_id, assignment_id' });
    if (error) throw error;
  },

  // 7. Fetch Industry Tools from Supabase `industry_tools` and `user_industry_tool_statuses`
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
                .from('user_industry_tool_statuses')
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
      await existingSupabaseClient.from('user_industry_tool_statuses').upsert({
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
          .order('sort_order', { ascending: true });

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
      await existingSupabaseClient.from('generated_certificates').upsert({
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
      await existingSupabaseClient.from('scam_reports').insert({
        user_id: uid,
        analyzed_text: jobOfferText,
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

