import { supabase } from '../supabaseClient';

export interface ProjectFolder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectFolderItem {
  id: string;
  user_id: string;
  folder_id: string;
  item_type: 'project' | 'link' | 'youtube' | 'document' | 'note' | 'other';
  item_ref: string;
  title: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  user_id: string;
  overall_readiness: number;
  matched_skills_count: number;
  total_target_skills: number;
  learning_progress: number;
  active_courses_count: number;
  opportunities_count: number;
  new_matched_count: number;
  completed_assignments_count: number;
  certifications_count: number;
  metrics: Record<string, unknown>;
  updated_at: string;
}

async function requireCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (error || !userId) throw new Error('Please sign in again to continue.');
  return userId;
}

/**
 * Persistence helpers intentionally include user_id on every mutation.
 * Supabase RLS independently enforces auth.uid() = user_id, so the caller
 * cannot read or write another account even if a request is tampered with.
 */
export const userPersistenceService = {
  async listProjectFolders(): Promise<ProjectFolder[]> {
    const userId = await requireCurrentUserId();
    const { data, error } = await supabase
      .from('project_folders')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []) as ProjectFolder[];
  },

  async createProjectFolder(
    name: string,
    parentId: string | null = null,
    description = '',
  ): Promise<ProjectFolder> {
    const userId = await requireCurrentUserId();
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Folder name is required.');

    const { data, error } = await supabase
      .from('project_folders')
      .insert({
        user_id: userId,
        name: cleanName,
        parent_id: parentId,
        description: description.trim(),
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as ProjectFolder;
  },

  async renameProjectFolder(folderId: string, name: string): Promise<ProjectFolder> {
    const userId = await requireCurrentUserId();
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Folder name is required.');

    const { data, error } = await supabase
      .from('project_folders')
      .update({ name: cleanName })
      .eq('id', folderId)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw error;
    return data as ProjectFolder;
  },

  async deleteProjectFolder(folderId: string): Promise<void> {
    const userId = await requireCurrentUserId();
    const { error } = await supabase
      .from('project_folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async listFolderItems(folderId?: string): Promise<ProjectFolderItem[]> {
    const userId = await requireCurrentUserId();
    let query = supabase
      .from('project_folder_items')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (folderId) query = query.eq('folder_id', folderId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ProjectFolderItem[];
  },

  async saveFolderItem(input: {
    folderId: string;
    itemType: ProjectFolderItem['item_type'];
    itemRef: string;
    title?: string;
    metadata?: Record<string, unknown>;
  }): Promise<ProjectFolderItem> {
    const userId = await requireCurrentUserId();
    const { data, error } = await supabase
      .from('project_folder_items')
      .upsert(
        {
          user_id: userId,
          folder_id: input.folderId,
          item_type: input.itemType,
          item_ref: input.itemRef,
          title: input.title?.trim() || '',
          metadata: input.metadata || {},
        },
        { onConflict: 'user_id,folder_id,item_type,item_ref' },
      )
      .select('*')
      .single();
    if (error) throw error;
    return data as ProjectFolderItem;
  },

  async removeFolderItem(itemId: string): Promise<void> {
    const userId = await requireCurrentUserId();
    const { error } = await supabase
      .from('project_folder_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async getDashboardMetrics(): Promise<DashboardMetrics | null> {
    const userId = await requireCurrentUserId();
    const { data, error } = await supabase
      .from('user_dashboard_metrics')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return (data as DashboardMetrics | null) || null;
  },

  async updatePrivateDashboardMetrics(
    patch: Partial<Omit<DashboardMetrics, 'user_id' | 'updated_at'>>,
  ): Promise<DashboardMetrics> {
    const userId = await requireCurrentUserId();
    const { data, error } = await supabase
      .from('user_dashboard_metrics')
      .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' })
      .select('*')
      .single();
    if (error) throw error;
    return data as DashboardMetrics;
  },
};
