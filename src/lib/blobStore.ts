import { put } from '@vercel/blob';

const MANIFEST_PATHNAME = 'data/manifest.json';

export function getBlobToken(): string {
  const token = import.meta.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN environment variable is not set');
  return token;
}

// Blob's list() API is only eventually consistent, which caused the
// manifest to appear stale right after a write. A direct GET to the known
// public URL is consistent, so we derive the store's URL from the token
// (format: vercel_blob_rw_<storeId>_<secret>) instead of calling list().
function getManifestURL(): string {
  const match = getBlobToken().match(/^vercel_blob_rw_([a-zA-Z0-9]+)_/);
  if (!match) throw new Error('Could not parse Blob store ID from BLOB_READ_WRITE_TOKEN');
  return `https://${match[1].toLowerCase()}.public.blob.vercel-storage.com/${MANIFEST_PATHNAME}`;
}

export interface GalleryImage {
  url: string;
  pathname: string;
  uploadedAt: string;
}

export interface SiteManifest {
  profileImageUrl: string | null;
  profileImagePathname: string | null;
  galleryImages: GalleryImage[];
}

const DEFAULT_MANIFEST: SiteManifest = {
  profileImageUrl: null,
  profileImagePathname: null,
  galleryImages: [],
};

export async function getManifest(): Promise<SiteManifest> {
  try {
    const res = await fetch(getManifestURL(), { cache: 'no-store' });
    if (!res.ok) return { ...DEFAULT_MANIFEST };

    const data = await res.json();
    return {
      ...DEFAULT_MANIFEST,
      ...data,
      galleryImages: Array.isArray(data.galleryImages) ? data.galleryImages : [],
    };
  } catch {
    return { ...DEFAULT_MANIFEST };
  }
}

export async function saveManifest(manifest: SiteManifest): Promise<void> {
  await put(MANIFEST_PATHNAME, JSON.stringify(manifest, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: getBlobToken(),
  });
}
