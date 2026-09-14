import { NetworkUser, NetworkPost, NetworkConversation, FollowRequest, UserProfile } from '../types';

const NETWORK_POSTS_KEY = 'skillnet_posts_v4';
const NETWORK_USERS_KEY = 'skillnet_users_v4';
const NETWORK_CONVERSATIONS_KEY = 'skillnet_conversations_v4';
const NETWORK_FOLLOW_REQUESTS_KEY = 'skillnet_follow_requests_v4';

// Real empty defaults: All users and data are dynamically fetched and queried from Supabase
export const initialNetworkUsers: NetworkUser[] = [];
export const initialNetworkPosts: NetworkPost[] = [];
export const initialConversations: NetworkConversation[] = [];
export const initialFollowRequests: FollowRequest[] = [];

// Helper functions for persistent LocalStorage management
export function loadNetworkPosts(currentUser: UserProfile): NetworkPost[] {
  try {
    const raw = localStorage.getItem(NETWORK_POSTS_KEY);
    if (raw) {
      const parsed: NetworkPost[] = JSON.parse(raw);
      return parsed.filter(
        (p) =>
          !p.id.startsWith('post-priya-') &&
          !p.id.startsWith('post-elena-') &&
          !p.id.startsWith('post-marcus-') &&
          !p.id.startsWith('post-rahul-') &&
          !p.id.startsWith('demo-')
      );
    }
  } catch (e) {
    console.error('Failed to load posts from storage', e);
  }
  return [];
}

export function saveNetworkPosts(posts: NetworkPost[]): void {
  try {
    localStorage.setItem(NETWORK_POSTS_KEY, JSON.stringify(posts));
  } catch (e) {
    console.error('Failed to save posts', e);
  }
}

export function loadNetworkUsers(): NetworkUser[] {
  try {
    const raw = localStorage.getItem(NETWORK_USERS_KEY);
    if (raw) {
      const parsed: NetworkUser[] = JSON.parse(raw);
      return parsed.filter(
        (u) =>
          !u.id.startsWith('user-priya-') &&
          !u.id.startsWith('user-marcus-') &&
          !u.id.startsWith('user-elena-') &&
          !u.id.startsWith('user-rahul-')
      );
    }
  } catch (e) {
    console.error('Failed to load users from storage', e);
  }
  return [];
}

export function saveNetworkUsers(users: NetworkUser[]): void {
  try {
    localStorage.setItem(NETWORK_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users', e);
  }
}

export function loadConversations(): NetworkConversation[] {
  try {
    const raw = localStorage.getItem(NETWORK_CONVERSATIONS_KEY);
    if (raw) {
      const parsed: NetworkConversation[] = JSON.parse(raw);
      return parsed.filter((c) => !c.id.startsWith('conv-priya') && !c.id.startsWith('conv-marcus'));
    }
  } catch (e) {
    console.error('Failed to load conversations', e);
  }
  return [];
}

export function saveConversations(convs: NetworkConversation[]): void {
  try {
    localStorage.setItem(NETWORK_CONVERSATIONS_KEY, JSON.stringify(convs));
  } catch (e) {
    console.error('Failed to save conversations', e);
  }
}

export function loadFollowRequests(): FollowRequest[] {
  try {
    const raw = localStorage.getItem(NETWORK_FOLLOW_REQUESTS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load follow requests', e);
  }
  return [];
}

export function saveFollowRequests(requests: FollowRequest[]): void {
  try {
    localStorage.setItem(NETWORK_FOLLOW_REQUESTS_KEY, JSON.stringify(requests));
  } catch (e) {
    console.error('Failed to save follow requests', e);
  }
}
