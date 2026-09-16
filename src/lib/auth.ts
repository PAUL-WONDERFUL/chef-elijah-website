import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

export const COOKIE_NAME = 'admin_session';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

interface AdminUser {
  username: string;
  passwordHash: string;
  displayName?: string;
}

function getUsers(): AdminUser[] {
  const encoded = import.meta.env.ADMIN_USERS_JSON_B64;
  if (!encoded) return [];
  try {
    const raw = Buffer.from(encoded, 'base64').toString('utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getSecret(): string {
  const secret = import.meta.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET environment variable is not set');
  return secret;
}

export function verifyCredentials(username: string, password: string): AdminUser | null {
  const user = getUsers().find((u) => u.username.toLowerCase() === username.toLowerCase().trim());
  if (!user) return null;
  return bcrypt.compareSync(password, user.passwordHash) ? user : null;
}

export function createSessionToken(username: string): string {
  const payload = `${username}.${Date.now() + SESSION_TTL_MS}`;
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const [encodedPayload, sig] = token.split('.');
  if (!encodedPayload || !sig) return null;

  let payload: string;
  try {
    payload = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
  } catch {
    return null;
  }

  const expectedSig = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  const separatorIndex = payload.lastIndexOf('.');
  const username = payload.slice(0, separatorIndex);
  const expiresAt = Number(payload.slice(separatorIndex + 1));
  if (!username || Number.isNaN(expiresAt) || Date.now() > expiresAt) return null;

  return username;
}
