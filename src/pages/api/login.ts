import type { APIRoute } from 'astro';
import { verifyCredentials, createSessionToken, COOKIE_NAME } from '../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const form = await request.formData();
  const username = String(form.get('username') || '');
  const password = String(form.get('password') || '');

  const user = verifyCredentials(username, password);
  if (!user) {
    return redirect('/admin?error=1');
  }

  const token = createSessionToken(user.username);
  cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  });

  return redirect('/admin');
};
