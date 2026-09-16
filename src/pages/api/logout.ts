import type { APIRoute } from 'astro';
import { COOKIE_NAME } from '../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ redirect, cookies }) => {
  cookies.delete(COOKIE_NAME, { path: '/' });
  return redirect('/admin');
};
