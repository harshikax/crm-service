import * as crypto from 'crypto';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(
  password: string,
  storedPasswordHash: string,
): boolean {
  try {
    if (!storedPasswordHash || !storedPasswordHash.includes(':')) {
      return false;
    }
    const [salt, storedHash] = storedPasswordHash.split(':');
    if (!salt || !storedHash) {
      return false;
    }
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
