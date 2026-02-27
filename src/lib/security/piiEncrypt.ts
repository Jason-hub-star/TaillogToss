/**
 * PII 암호화 유틸 — 보호자 전화번호/이메일 AES-GCM 암호화
 * 프론트엔드에서 암호화 → DB에는 base64 인코딩된 ciphertext 저장
 * 복호화는 서버 RPC(get_parent_contact)에서만 수행
 * Parity: B2B-001
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

/** Web Crypto CryptoKey (RN 환경에서 타입 보완) */
type AnyKey = Parameters<typeof crypto.subtle.encrypt>[1];

/** 암호화 키 생성 (최초 1회, 서버에서 관리) */
export async function generateEncryptionKey(): Promise<AnyKey> {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt'],
  ) as Promise<AnyKey>;
}

/** 문자열 → AES-GCM 암호화 → base64 (IV + ciphertext) */
export async function encryptPii(plaintext: string, key: AnyKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext),
  );
  // IV(12B) + ciphertext → base64
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

/** 전화번호 마스킹 (010-****-5678 형태) */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  const last4 = digits.slice(-4);
  const prefix = digits.slice(0, Math.max(0, digits.length - 4));
  return `${prefix.slice(0, 3)}-****-${last4}`;
}

/** 이메일 마스킹 (a***@example.com) */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

/** 전화번호 유효성 검사 (한국 휴대폰) */
export function isValidKoreanPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return /^01[016789]\d{7,8}$/.test(digits);
}
