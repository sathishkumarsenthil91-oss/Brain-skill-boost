export interface ChatSessionMeta {
  id: string;
  title: string;
  mode?: string;
  created_at: string;
  updated_at: string;
  folderId?: string | null;
  isStarred?: boolean;
}

export interface ChatFolder {
  id: string;
  name: string;
  icon: string;
  color?: string;
  isSystem?: boolean;
}

export const DEFAULT_CHAT_FOLDERS: ChatFolder[] = [
  { id: 'starred', name: 'Starred', icon: 'star', color: 'amber', isSystem: true },
  { id: 'career', name: 'Career & Skills', icon: 'school', color: 'blue', isSystem: true },
  { id: 'code', name: 'Code & Reviews', icon: 'code', color: 'emerald', isSystem: true },
  { id: 'interview', name: 'Mock Interviews', icon: 'record_voice_over', color: 'purple', isSystem: true },
];
