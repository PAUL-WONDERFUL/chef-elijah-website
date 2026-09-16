import { put, list } from '@vercel/blob';

const MANIFEST_PATHNAME = 'data/manifest.json';

export function getBlobToken(): string {
  const token = import.meta.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN environment variable is not set');
  return token;
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
    const { blobs } = await list({ prefix: MANIFEST_PATHNAME, limit: 1, token: getBlobToken() });
    const found = blobs.find((b) => b.pathname === MANIFEST_PATHNAME);
    if (!found) return { ...DEFAULT_MANIFEST };

    const res = await fetch(found.url, { cache: 'no-store' });
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
