import { supabase } from '../lib/supabase';

export const storageService = {
  async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { cacheControl: '3600', upsert: false });
    
    if (error) {
      console.error(`Upload error for bucket "${bucket}":`, error);
      throw error;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);
      
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
    const extension = file.name.split('.').pop();
    const path = `results/${matchId}_${userId}_${Date.now()}.${extension}`;
    
    const { data, error } = await supabase.storage
      .from('result-screenshots')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    
    if (error) {
      console.error('Upload error for result-screenshots:', error);
      throw error;
    }
    
    return data.path;
  },

  async getScreenshotUrl(path: string) {
    const { data, error } = await supabase.storage
      .from('result-screenshots')
      .createSignedUrl(path, 60);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  }
};
