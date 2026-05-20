import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { cleanStoragePath } from '../lib/utils';

export function useSignedUrl(bucket: string, path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }

    if (path.startsWith('http')) {
      setUrl(path);
      return;
    }

    let isMounted = true;
    const cleanPath = cleanStoragePath(bucket, path);

    async function fetchUrl() {
      setLoading(true);
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(cleanPath || '', 3600); // 1 hour

        if (error) throw error;
        if (isMounted) setUrl(data.signedUrl);
      } catch (err) {
        console.error(`Error fetching signed URL for ${bucket}/${cleanPath}:`, err);
        // Fallback to public URL as last resort
        const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath || '');
        if (isMounted) setUrl(data.publicUrl);
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchUrl();

    return () => {
      isMounted = false;
    };
  }, [bucket, path]);

  return { url, loading, error };
}
