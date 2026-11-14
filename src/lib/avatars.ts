import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Image types accepted for profile photos and banners. */
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** 5 MB cap shared by profile photo and banner uploads. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/**
 * Shared validation for avatar/banner picks. Returns an error sentence to
 * show the member, or null when the file is acceptable. Signup and the
 * profile editor must reject the same files, so both call this.
 */
export function avatarFileError(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Please choose a JPG, PNG or WebP image.";
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return "Image must be smaller than 5 MB.";
  }
  return null;
}

const cache = new Map<string, { url: string; expires: number }>();

/**
 * Signed URL for any object in a bucket, cached for just under an hour.
 * Profile banners reuse the `avatars` bucket (<uid>/banner.<ext>) so their
 * folder-scoped RLS already applies — no second bucket, no public URLs.
 */
export async function getStorageUrl(
  bucket: string,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  // Allow external URLs to pass through
  if (path.startsWith("http")) return path;
  const cacheKey = `${bucket}/${path}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.url;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60);
  if (error || !data) return null;
  cache.set(cacheKey, {
    url: data.signedUrl,
    expires: Date.now() + 55 * 60 * 1000,
  });
  return data.signedUrl;
}

export function getAvatarUrl(
  path: string | null | undefined,
): Promise<string | null> {
  return getStorageUrl("avatars", path);
}

export function avatarInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Resolve a storage path (or external URL) to a signed URL for rendering.
 * Returns null while loading and when the path is empty.
 */
export function useSignedUrl(
  path: string | null | undefined,
  bucket = "avatars",
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!path) {
      setUrl(null);
      return;
    }
    void getStorageUrl(bucket, path).then((next) => {
      if (alive) setUrl(next);
    });
    return () => {
      alive = false;
    };
  }, [path, bucket]);

  return url;
}
