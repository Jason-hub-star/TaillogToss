/**
 * tossPiiDecrypt — Toss login-me 암호화 PII(AES-256-GCM) 복호화 유틸.
 * encrypted/iv/aad 객체와 평문 문자열을 모두 처리한다.
 * Parity: AUTH-001
 */

export interface TossEncryptedField {
  encrypted: string;
  iv: string;
  aad: string;
}

const AES_GCM_IV_LENGTH = 12;
const AES_256_KEY_BYTES = 32;

function toBase64Standard(input: string): string {
  return input.replace(/-/g, '+').replace(/_/g, '/');
}

function decodeBase64(input: string): Uint8Array {
  const normalized = toBase64Standard(input.trim());
  const raw = atob(normalized);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

function tryDecodeBase64(input: string): Uint8Array | null {
  try {
    return decodeBase64(input);
  } catch {
    return null;
  }
}

function decodeKeyMaterial(rawKey: string): Uint8Array {
  const trimmed = rawKey.trim();
  if (!trimmed) {
    throw new Error('Toss PII key is empty');
  }

  const base64Decoded = tryDecodeBase64(trimmed);
  if (base64Decoded?.byteLength === AES_256_KEY_BYTES) {
    return base64Decoded;
  }

  const utf8Bytes = new TextEncoder().encode(trimmed);
  if (utf8Bytes.byteLength === AES_256_KEY_BYTES) {
    return utf8Bytes;
  }

  throw new Error('Toss PII key must be 32-byte raw or base64-encoded 32-byte value');
}

export function isTossEncryptedField(value: unknown): value is TossEncryptedField {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.encrypted === 'string' &&
    typeof row.iv === 'string' &&
    typeof row.aad === 'string'
  );
}

export async function decryptTossPiiField(
  value: unknown,
  rawKey: string | null | undefined
): Promise<string | null> {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (!isTossEncryptedField(value)) return null;
  if (!rawKey) return null;

  const keyBytes = decodeKeyMaterial(rawKey);
  const iv = decodeBase64(value.iv);
  if (iv.byteLength !== AES_GCM_IV_LENGTH) {
    throw new Error('Toss PII iv must be 12 bytes for AES-GCM');
  }

  const aad = decodeBase64(value.aad);
  const encrypted = decodeBase64(value.encrypted);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    cryptoKey,
    encrypted
  );

  return new TextDecoder().decode(plainBuffer);
}
