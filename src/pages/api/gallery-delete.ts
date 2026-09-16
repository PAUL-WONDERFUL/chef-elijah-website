import type { APIRoute } from 'astro';
import { del } from '@vercel/blob';
import { verifySessionToken, COOKIE_NAME } from '../../lib/auth';
import { getManifest, saveManifest, getBlobToken } from '../../lib/blobStore';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const username = verifySessionToken(cookies.get(COOKIE_NAME)?.value);
  if (!username) {
    return new Response('Unauthorized', { status: 401 });
  }

  const form = await request.formData();
  const pathname = String(form.get('pathname') || '');
  if (!pathname) return redirect('/admin');

  const manifest = await getManifest();
  manifest.galleryImages = manifest.galleryImages.filter((img) => img.pathname !== pathname);
  await saveManifest(manifest);
  await del(pathname, { token: getBlobToken() }).catch(() => {});

  return redirect('/admin?success=1');
};
