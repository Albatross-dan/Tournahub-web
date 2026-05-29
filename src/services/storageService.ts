import { supabase, ensureAuthenticated } from '../lib/supabase';
import { cleanStoragePath } from '../lib/utils';

export const storageService = {
  async uploadFile(bucket: string, path: string, file: File) {
    // Force session hydration for RLS propagation in storage
    await supabase.auth.getSession();
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { 
        cacheControl: '3600', 
        upsert: false,
        contentType: file.type 
      });
    
    if (error) {
      console.error(`[Storage] Upload failed for bucket "${bucket}":`, error);
      
      // Handle "database timed out" or "connection timeout"
      if (error.message?.includes('timed out') || error.message?.includes('connection timeout')) {
        throw new Error(`Upload to "${bucket}" timed out. This suggests the database recording metadata for this file is stalling due to slow RLS policies or unindexed checks.`);
      }

      // Handle "invalid or incompatible" error
      if (error.message?.includes('schema is invalid')) {
        throw new Error(`Storage configuration error for bucket "${bucket}". Please verify bucket existence and permissions of the new security model.`);
      }
      throw error;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
      
    return publicUrl;
  },

  async uploadBanner(file: File) {
    // Sanitize filename and use timestamp for uniqueness to avoid RLS conflicts
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `banners/${Date.now()}-${sanitizedName}`;
    try {
      return await this.uploadFile('tournament-banners', path, file);
    } catch (error: any) {
      if (error.message?.includes('row-level security policy') || error.code === '42501') {
        throw new Error('RLS Policy Violation: You do not have permission to upload tournament banners. Please ensure you are an administrator and the bucket policies are correctly configured.');
      }
      throw error;
    }
  },

  async uploadAvatar(_file: File, _userId: string) {
    throw new Error('Avatar uploads are currently disabled due to storage limitations.');
  },

  async uploadScreenshot(file: File, matchId: string, userId: string) {
    // Force session hydration for RLS propagation in storage and fix token race conditions
    await ensureAuthenticated();

    const extension = file.name.split('.').pop();
    const path = `${userId}/${matchId}/screenshot_${Date.now()}.${extension}`;
    
    const { data, error } = await supabase.storage
      .from('result-screenshots')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    
    if (error) {
      console.error('Upload error for result-screenshots:', error);
      throw error;
    }
    
    return path;
  },

  async getScreenshotUrl(path: string) {
    const cleanPath = cleanStoragePath('result-screenshots', path);
    const { data, error } = await supabase.storage
      .from('result-screenshots')
      .createSignedUrl(cleanPath || '', 60);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  }
};
