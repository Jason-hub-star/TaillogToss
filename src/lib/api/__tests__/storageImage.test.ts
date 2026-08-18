/**
 * storageImage.test.ts — public Storage image upload hardening
 * Parity: APP-001, B2B-001
 */

const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();

jest.mock('../supabase', () => ({
  supabase: {
    storage: {
      from: (bucket: string) => ({
        upload: (...args: unknown[]) => mockUpload(bucket, ...args),
        getPublicUrl: (...args: unknown[]) => mockGetPublicUrl(bucket, ...args),
      }),
    },
  },
}));

import { uploadImageToPublicStorage } from '../storageImage';

beforeEach(() => {
  jest.clearAllMocks();
  global.atob = (value: string) => Buffer.from(value, 'base64').toString('binary');
  mockUpload.mockResolvedValue({ error: null });
  mockGetPublicUrl.mockImplementation((bucket: string, filePath: string) => ({
    data: { publicUrl: `https://storage.example/${bucket}/${filePath}` },
  }));
});

describe('uploadImageToPublicStorage', () => {
  it('허용된 public 이미지 버킷에는 raster 이미지만 업로드한다', async () => {
    await expect(
      uploadImageToPublicStorage('dog-profiles', 'user-1/dog-1-123', 'data:image/png;base64,aGVsbG8='),
    ).resolves.toBe('https://storage.example/dog-profiles/user-1/dog-1-123.png');

    expect(mockUpload).toHaveBeenCalledWith(
      'dog-profiles',
      'user-1/dog-1-123.png',
      expect.any(ArrayBuffer),
      expect.objectContaining({
        contentType: 'image/png',
        upsert: true,
      }),
    );
  });

  it('SVG data URI는 public bucket에 업로드하지 않는다', async () => {
    await expect(
      uploadImageToPublicStorage(
        'dog-profiles',
        'user-1/dog-1-123',
        'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIi8+',
      ),
    ).rejects.toThrow('IMAGE_UPLOAD_UNSUPPORTED_TYPE');

    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('허용되지 않은 버킷과 경로 조작을 차단한다', async () => {
    await expect(
      uploadImageToPublicStorage(
        'private-secrets' as 'dog-profiles',
        'user-1/file-1',
        'data:image/jpeg;base64,aGVsbG8=',
      ),
    ).rejects.toThrow('IMAGE_UPLOAD_BUCKET_NOT_ALLOWED');
    await expect(
      uploadImageToPublicStorage('org-logos', '../org-1/logo', 'data:image/jpeg;base64,aGVsbG8='),
    ).rejects.toThrow('IMAGE_UPLOAD_PATH_NOT_ALLOWED');

    expect(mockUpload).not.toHaveBeenCalled();
  });
});
