export type ViewType = 
  | 'auth'
  | 'landing'
  | 'dashboard'
  | 'profile'
  | 'skills'
  | 'skill-gap'
  | 'ai-recommendations'
  | 'courses'
  | 'industry-tools'
  | 'certifications'
  | 'opportunities'
  | 'network'
  | 'connectivity'
  | 'webinars'
  | 'nebula'
  | 'assignments'
  | 'safety'
  | 'settings'
  | 'onboarding'
  | 'login'
  | 'register'
  | 'roadmap';

export interface UserProject {
  id: string;
  title: string;
  description: string;
  tags: string[];
  githubUrl?: string;
  demoUrl?: string;
  date: string;
  stars?: number;
}

export interface UserInternship {
  id: string;
  role: string;
  company: string;
  period: string;
  location: string;
  description: string;
  verified: boolean;
}

export interface UserAchievement {
  id: string;
  title: string;
  issuer: string;
  date: string;
  badge: string;
  description?: string;
}

export interface GeneratedCertificate {
  id: string;
  serialId: string;
  type: 'course' | 'webinar' | 'youtube_track' | 'specialization';
  itemId: string;
  title: string;
  recipientName: string;
  recipientEmail?: string;
  instructorOrSpeaker: string;
  instructorRole?: string;
  organization: string;
  issueDate: string;
  durationFormatted: string;
  completionPercentage: number;
  watchTimeSeconds: number;
  requiredWatchTimeSeconds: number;
  watchTimeFormatted?: string;
  skillsValidated: string[];
  legalDisclaimer: string;
  verificationUrl: string;
  verificationBadge?: string;
}

export interface YouTubeLearningTrack {
  id: string;
  userId: string;
  videoId: string;
  videoUrl: string;
  title: string;
  channel: string;
  channelUrl?: string;
  thumbnail: string;
  durationSeconds: number;
  durationFormatted: string;
  verifiedWatchedSeconds: number; // strictly verified real watched seconds without skips
  currentTime: number; // exact saved resume position in seconds
  completionPercentage: number; // (verifiedWatchedSeconds / durationSeconds) * 100
  status: 'in_progress' | 'completed';
  lastWatched: string; // ISO string
  dateAdded: string; // ISO string
  watchedRanges: [number, number][]; // list of verified [startSec, endSec] intervals
  aiSummary?: {
    summary: string;
    keyPoints: string[];
    timestamps?: { time: string; title: string; note: string }[];
    generatedAt: string;
    modelUsed?: string;
    skillsValidated?: string[];
  };
  notes?: string;
  learningRecord?: UnofficialLearningRecord;
}

export interface UnofficialLearningRecord {
  recordId: string; // e.g. "IS-REC-YTL-2026-X7K9P"
  userId: string;
  userName: string;
  videoTitle: string;
  channel: string;
  videoId: string;
  videoUrl: string;
  verifiedWatchSeconds: number;
  verifiedWatchFormatted: string;
  completionPercentage: number;
  completionDate: string;
  disclaimer: string;
  skillsValidated?: string[];
}

export interface UserProfile {
  id?: string;
  name: string;
  avatarUrl: string;
  email: string;
  phone?: string;
  bio?: string;
  headline?: string;
  college: string;
  degree: string;
  gradYear: string;
  gpa?: string;
  location?: string;
  targetRole: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumeFileName?: string;
  overallReadiness: number; // e.g. 72
  matchedSkillsCount: number; // e.g. 18
  totalTargetSkills: number; // e.g. 25
  learningProgress: number; // e.g. 64
  activeCoursesCount: number; // e.g. 4
  opportunitiesCount: number; // e.g. 18
  newMatchedCount: number; // e.g. 6
  completedAssignmentsCount?: number;
  certificationsCount?: number;
  learningRecords?: UnofficialLearningRecord[];
  earnedCertificates?: GeneratedCertificate[];
  projects?: UserProject[];
  internships?: UserInternship[];
  achievements?: UserAchievement[];
  isPrivateAccount?: boolean;
  followersCount?: number;
  followingCount?: number;
  userId?: string;
  username?: string;
  interests?: string[];
  skills?: string[];
  connectivitySetupCompleted?: boolean;
}

export interface UserLibraryItem {
  id: string;
  type: 'youtube_track' | 'course' | 'cert_prep' | 'lab';
  title: string;
  providerOrChannel: string;
  thumbnailUrl?: string;
  progressPercentage: number;
  currentLessonOrChapter: string;
  totalDurationOrModules: string;
  skillsCovered: string[];
  lastStudiedAt: string;
  isCompleted?: boolean;
  notesCount?: number;
  certificateSerial?: string;
}

export interface LibraryAccessRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar: string;
  requesterHeadline: string;
  targetUserId: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'declined';
}

export interface NetworkUser {
  id: string;
  userId?: string;
  username?: string;
  name: string;
  headline: string;
  avatarUrl: string;
  coverUrl?: string;
  company: string;
  role: string;
  location: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isFollower?: boolean;
  isFriend?: boolean;
  isFollowRequested?: boolean;
  isPrivate: boolean;
  isLibraryPrivate?: boolean;
  hasAccessToLibrary?: boolean;
  isAccessRequested?: boolean;
  isAlumni?: boolean;
  isRecruiter?: boolean;
  isMentor?: boolean;
  mutualCount?: number;
  skills: string[];
  interests?: string[];
  certificates: GeneratedCertificate[];
  libraryItems?: UserLibraryItem[];
  projects: UserProject[];
  internships: UserInternship[];
  achievements: UserAchievement[];
  onlineStatus: 'online' | 'idle' | 'offline';
  currentlyStudyingStory?: {
    topic: string;
    courseTitle: string;
    progress: number;
    updatedAt: string;
  };
}

export interface NetworkComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorHeadline: string;
  timestamp: string;
  content: string;
  likesCount: number;
  isLiked?: boolean;
}

export interface NetworkPost {
  id: string;
  author: {
    id: string;
    name: string;
    avatarUrl: string;
    headline: string;
    company: string;
    isCurrentUser?: boolean;
  };
  timestamp: string;
  content: string;
  tags: string[];
  skills: string[];
  likesCount: number;
  isLiked?: boolean;
  commentsCount: number;
  repostsCount: number;
  isReposted?: boolean;
  imageUrl?: string;
  codeSnippet?: { language: string; code: string };
  poll?: {
    question: string;
    options: { id: string; text: string; votes: number }[];
    userVotedOptionId?: string;
    totalVotes: number;
  };
  attachedCertificate?: GeneratedCertificate;
  attachedProject?: UserProject;
  comments: NetworkComment[];
}

export interface NetworkMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface NetworkConversation {
  id: string;
  participant: NetworkUser;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: NetworkMessage[];
}

export interface FollowRequest {
  id: string;
  requester: NetworkUser;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface SkillItem {
  id: string;
  name: string;
  proficiency: number; // 0 - 100
  category: 'foundation' | 'gap' | 'upcoming';
  priority?: 'high' | 'medium' | 'low';
  experience?: string;
  lastAssessed?: string;
  verified?: boolean;
}

export interface SkillGapMetric {
  skill: string;
  currentLevel: number;
  requiredLevel: number;
  gapPercentage: number;
  urgency: 'Critical' | 'Moderate' | 'Good';
  suggestedAction: string;
  estimatedHours: number;
}

export interface AIRecommendation {
  id: string;
  category: 'Skill Sprint' | 'Project' | 'Certification' | 'Internship Strategy';
  title: string;
  description: string;
  impactScore: number; // e.g. 96
  estimatedTime: string;
  tags: string[];
  actionLabel: string;
  actionView: ViewType;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface CourseLesson {
  id: string;
  title: string;
  duration: string;
  type: 'video' | 'lab' | 'quiz' | 'reading';
  completed: boolean;
  videoUrl?: string;
  videoId?: string;
  summary?: string;
  codeSnippet?: string;
}

export interface CourseModule {
  id: string;
  title: string;
  duration: string;
  lessons: CourseLesson[];
}

export interface CourseItem {
  id: string;
  title: string;
  provider: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  modulesCount: number;
  rating: number;
  enrolledCount: number;
  progress: number; // 0 - 100
  isEnrolled: boolean;
  coverImage?: string;
  thumbnail?: string;
  skillsTaught: string[];
  description: string;
  instructor: {
    name: string;
    role: string;
    avatar: string;
    company?: string;
  };
  modules?: CourseModule[];
}

export interface IndustryTool {
  id: string;
  name: string;
  category: 'Frontend' | 'Backend' | 'DevOps & Cloud' | 'Testing & QA' | 'Design & Collab';
  proficiencyRequired: 'Essential' | 'Recommended' | 'Bonus';
  icon: string;
  description: string;
  status: 'Mastered' | 'In Progress' | 'Not Started';
  popularFor: string[];
  cheatSheetUrl?: string;
  quickTip: string;
  marketDemand: number; // e.g. 92%
}

export interface CertificationItem {
  id: string;
  title: string;
  issuer: string;
  badgeUrl?: string;
  difficulty: 'Foundational' | 'Associate' | 'Professional';
  marketValue: 'Very High' | 'High' | 'Medium';
  status: 'Earned' | 'In Progress' | 'Planned';
  examCode?: string;
  targetDate?: string;
  skillsValidated: string[];
  voucherDiscount?: string;
  prepProgress?: number;
}

export interface WebinarCertificate {
  certificateId: string;
  webinarId: string;
  webinarTitle: string;
  recipientName: string;
  recipientEmail?: string;
  speakerName: string;
  speakerRole: string;
  speakerCompany: string;
  issueDate: string;
  duration: string;
  tags: string[];
  issuer: string;
  verificationUrl: string;
}

export interface WebinarItem {
  id: string;
  title: string;
  speaker: {
    name: string;
    title: string;
    company: string;
    avatar: string;
  };
  dateTime: string;
  duration: string;
  tags: string[];
  status: 'Upcoming' | 'Live' | 'Recorded';
  registered: boolean;
  isRegistered?: boolean;
  attendeesCount: number;
  likesCount?: number;
  isLiked?: boolean;
  youtubeUrl?: string;
  youtubeVideoId?: string;
  zoomMeetingUrl?: string;
  zoomMeetingId?: string;
  zoomPasscode?: string;
  keyTakeaways: string[];
  category?: string;
  description?: string;
  thumbnail?: string;
  date?: string;
  time?: string;
  speakerName?: string;
  speakerRole?: string;
  speakerCompany?: string;
  speakerAvatar?: string;
  certificateEligible?: boolean;
  hasClaimedCertificate?: boolean;
  claimedCertificate?: WebinarCertificate;
}

export interface AssignmentItem {
  id: string;
  title: string;
  courseOrTopic: string;
  courseName?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  dueDate: string;
  status: 'Pending' | 'In Progress' | 'Submitted' | 'Graded' | 'Overdue';
  score?: number;
  maxScore: number;
  skillsTested: string[];
  description: string;
  deliverables: string[];
  rubricCriteria?: string[];
  feedback?: string;
}

export interface RoadmapNode {
  id: string;
  title: string;
  status: 'completed' | 'current' | 'upcoming';
  progress: number;
  description: string;
  subtopics?: string[];
  recommendedResources?: {
    title: string;
    type: string;
    link?: string;
  }[];
}

export interface OpportunityItem {
  id: string;
  title: string;
  company: string;
  locationType: 'Remote' | 'Hybrid' | 'Onsite';
  matchScore: number;
  duration: string;
  verified: boolean;
  tags: string[];
  companyLogoUrl?: string;
  description: string;
  stipend?: string;
  applied?: boolean;
  saved?: boolean;
  deadline?: string;
}

export interface SafetySignal {
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  icon: string;
}

export interface SafetyReport {
  riskScore: number; // 0 - 100
  riskLevel: 'HIGH RISK' | 'MODERATE RISK' | 'LOW RISK' | 'VERIFIED SAFE';
  summary: string;
  detectedSignals: SafetySignal[];
  recommendation: string;
  verificationChecklist: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
  thinkingModeActive?: boolean;
  language?: string;
  translatedContent?: string;
  isTranslating?: boolean;
  mode?: string;
}

export interface AppSettings {
  emailNotifications: boolean;
  jobAlerts: boolean;
  weeklyProgressDigest: boolean;
  geminiThinkingMode: boolean;
  aiThinkingMode?: boolean;
  compactMode?: boolean;
  autoAtsAnalysis?: boolean;
  recruiterVisibility?: boolean;
  fraudAlerts: boolean;
  autoSyncGithub: boolean;
  preferredLanguage: string;
  profileVisibility: 'Public' | 'Recruiters Only' | 'Private';
}
