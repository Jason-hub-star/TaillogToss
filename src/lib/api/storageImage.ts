/**
 * Storage image upload helpers.
 * Parity: APP-001, B2B-001
 */
import { supabase } from './supabase';

type PublicImageBucket = 'dog-profiles' | 'org-logos';

const ALLOWED_PUBLIC_IMAGE_BUCKETS = new Set<PublicImageBucket>(['dog-profiles', 'org-logos']);
const ALLOWED_IMAGE_CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

function normalizeImageExtension(rawExtension: string): string {
  const extension = rawExtension.toLowerCase();
  if (extension === 'jpeg') return 'jpg';
  return extension;
}

function assertAllowedBucket(bucket: string): asserts bucket is PublicImageBucket {
  if (!ALLOWED_PUBLIC_IMAGE_BUCKETS.has(bucket as PublicImageBucket)) {
    throw new Error('IMAGE_UPLOAD_BUCKET_NOT_ALLOWED');
  }
}

function assertAllowedStoragePath(filePathWithoutExtension: string): void {
  const segments = filePathWithoutExtension.split('/');
  const hasUnsafeSegment = segments.some(
    (segment) => segment.length === 0 || segment === '.' || segment === '..',
  );
  if (
    filePathWithoutExtension.startsWith('/')
    || filePathWithoutExtension.includes('\\')
    || hasUnsafeSegment
    || !/^[A-Za-z0-9/_-]+$/.test(filePathWithoutExtension)
  ) {
    throw new Error('IMAGE_UPLOAD_PATH_NOT_ALLOWED');
  }
}

function assertAllowedImageType(extension: string, contentType: string): void {
  if (ALLOWED_IMAGE_CONTENT_TYPES[extension] !== contentType) {
    throw new Error('IMAGE_UPLOAD_UNSUPPORTED_TYPE');
  }
}

function getImageUploadMeta(fileUri: string): { extension: string; contentType: string } {
  const dataUriMatch = /^data:(image\/([a-zA-Z0-9.+-]+));base64,/.exec(fileUri);
  if (dataUriMatch) {
    const contentType = dataUriMatch[1] ?? 'image/png';
    const extension = normalizeImageExtension((dataUriMatch[2] ?? 'png').replace('+xml', ''));
    assertAllowedImageType(extension, contentType);
    return { extension, contentType };
  }

  const uriWithoutQuery = fileUri.split('?')[0] ?? fileUri;
  const cleanUri = uriWithoutQuery.split('#')[0] ?? uriWithoutQuery;
  const lastSegment = cleanUri.split('/').pop() ?? '';
  const extension = lastSegment.includes('.') ? lastSegment.split('.').pop()?.toLowerCase() || 'jpg' : 'jpg';
  const normalizedExtension = normalizeImageExtension(extension);
  const contentType = ALLOWED_IMAGE_CONTENT_TYPES[normalizedExtension] ?? `image/${normalizedExtension}`;
  assertAllowedImageType(normalizedExtension, contentType);

  return { extension: normalizedExtension, contentType };
}

function dataUriToArrayBuffer(fileUri: string): ArrayBuffer {
  const base64 = fileUri.replace(/^data:[^;]+;base64,/, '');
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

function requestUriAsBlob(fileUri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as Blob);
      } else {
        reject(new Error(`Image request failed with status ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Image request failed'));
    xhr.responseType = 'blob';
    xhr.open('GET', fileUri);
    xhr.send();
  });
}

async function readImageBody(fileUri: string): Promise<Blob | ArrayBuffer> {
  if (fileUri.startsWith('data:')) {
    return dataUriToArrayBuffer(fileUri);
  }

  try {
    const response = await fetch(fileUri);
    return await response.blob();
  } catch (fetchError) {
    if (/^(content|file):\/\//.test(fileUri)) {
      return requestUriAsBlob(fileUri);
    }
    throw fetchError;
  }
}

export async function uploadImageToPublicStorage(
  bucket: PublicImageBucket,
  filePathWithoutExtension: string,
  fileUri: string,
): Promise<string> {
  assertAllowedBucket(bucket);
  assertAllowedStoragePath(filePathWithoutExtension);
  const { extension, contentType } = getImageUploadMeta(fileUri);
  const imageBody = await readImageBody(fileUri);
  const filePath = `${filePathWithoutExtension}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, imageBody, {
      contentType,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}
