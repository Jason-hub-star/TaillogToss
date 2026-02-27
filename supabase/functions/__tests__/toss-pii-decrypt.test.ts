import { webcrypto } from 'node:crypto';
import { decryptTossPiiField, isTossEncryptedField, type TossEncryptedField } from '../_shared/tossPiiDecrypt.ts';

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

async function encryptForTest(plain: string, keyRaw: Uint8Array, aadRaw: Uint8Array): Promise<TossEncryptedField> {
  const ivRaw = webcrypto.getRandomValues(new Uint8Array(12));
  const key = await webcrypto.subtle.importKey('raw', keyRaw, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const cipher = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivRaw, additionalData: aadRaw },
    key,
    encoder.encode(plain),
  );

  return {
    encrypted: toBase64(new Uint8Array(cipher)),
    iv: toBase64(ivRaw),
    aad: toBase64(aadRaw),
  };
}

describe('tossPiiDecrypt', () => {
  test('returns plaintext when field is already plain string', async () => {
    await expect(decryptTossPiiField('plain-email@example.com', null)).resolves.toBe('plain-email@example.com');
  });

  test('decrypts AES-GCM field when key is configured', async () => {
    const keyRaw = encoder.encode('12345678901234567890123456789012');
    const aadRaw = encoder.encode('toss-login-me-name');
    const encrypted = await encryptForTest('홍길동', keyRaw, aadRaw);

    const decrypted = await decryptTossPiiField(encrypted, toBase64(keyRaw));
    expect(decrypted).toBe('홍길동');
  });

  test('returns null for encrypted field when key is missing', async () => {
    const encrypted: TossEncryptedField = {
      encrypted: 'AA==',
      iv: 'AA==',
      aad: 'AA==',
    };
    await expect(decryptTossPiiField(encrypted, null)).resolves.toBeNull();
  });

  test('detects encrypted field shape', () => {
    expect(isTossEncryptedField({ encrypted: 'a', iv: 'b', aad: 'c' })).toBe(true);
    expect(isTossEncryptedField({ encrypted: 'a', iv: 'b' })).toBe(false);
  });
});
