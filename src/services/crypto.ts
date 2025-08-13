import crypto from 'crypto';

export function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function sha256Hex(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function hmacSha256Hex(key: string, text: string): string {
  return crypto.createHmac('sha256', key).update(text).digest('hex');
}

export type KeySet = {
  currentKid: string;
  currentKey: string;
  prevKid?: string;
  prevKey?: string;
};

export function loadKeySetFromEnv(): KeySet {
  const currentKid = process.env.SIGNING_KID_CURRENT || 'dev-current';
  const currentKey = process.env.SIGNING_KEY_CURRENT || 'dev-secret-current';
  const prevKid = process.env.SIGNING_KID_PREV || undefined;
  const prevKey = process.env.SIGNING_KEY_PREV || undefined;
  return { currentKid, currentKey, prevKid, prevKey };
}

export function verifySignature(keySet: KeySet, kid: string, payload: string, sigHex: string): boolean {
  if (kid === keySet.currentKid) {
    return hmacSha256Hex(keySet.currentKey, payload) === sigHex;
  }
  if (keySet.prevKid && keySet.prevKey && kid === keySet.prevKid) {
    return hmacSha256Hex(keySet.prevKey, payload) === sigHex;
  }
  return false;
}