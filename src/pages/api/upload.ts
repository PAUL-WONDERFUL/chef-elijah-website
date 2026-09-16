import type { APIRoute } from 'astro';
import { put, del } from '@vercel/blob';
import crypto from 'node:crypto';
import { verifySessionToken, COOKIE_NAME } from '../../lib/auth';
import { getManifest, saveManifest, getBlobToken } from '../../lib/blobStore';

export const prerender = false;

const MAX_SIZE = 4 * 1024 * 1024; // 4MB — Vercel serverless functions cap request bodies around 4.5MB
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const username = verifySessionToken(cookies.get(COOKIE_NAME)?.value);
  if (!username) {
    return new Response('Unauthorized', { status: 401 });
  }

  const form = await request.formData();
  const kind = String(form.get('kind') || '') === 'profile' ? 'profile' : 'gallery';
  const file = form.get('file');

  if (!(file instanceof File) || file.size === 0) {
    return redirect('/admin?error=nofile');
  }
  if (file.size > MAX_SIZE) {
    return redirect('/admin?error=toolarge');
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return redirect('/admin?error=badtype');
  }

  const pathname = `${kind}/${crypto.randomUUID()}.${ext}`;

  const blob = await put(pathname, file, {
    access: 'public',
    addRandomSuffix: false,
    contentType: file.type,
    token: getBlobToken(),
  });

  const manifest = await getManifest();

  if (kind === 'profile') {
    const previousPathname = manifest.profileImagePathname;
    manifest.profileImageUrl = blob.url;
    manifest.profileImagePathname = blob.pathname;
    if (previousPathname) {
      await del(previousPathname, { token: getBlobToken() }).catch(() => {});
    }
  } else {
    manifest.galleryImages.unshift({
      url: blob.url,
      pathname: blob.pathname,
      uploadedAt: new Date().toISOString(),
    });
  }

  await saveManifest(manifest);

  return redirect('/admin?success=1');
};
