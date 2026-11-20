import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signedCloudinaryUrl, verifyCloudinaryAsset } from './cloudinary.js';
import { v2 as cloudinary } from 'cloudinary';

vi.mock('cloudinary', () => ({
  v2: {
    config: vi.fn(),
    utils: { api_sign_request: vi.fn((_params, secret) => `signed-${String(secret).length}`) },
    api: { resource: vi.fn() },
    uploader: { destroy: vi.fn() },
    url: vi.fn((publicId, options) => `https://res.cloudinary.com/test/image/authenticated/s--test--/${options.resource_type}/${publicId}`),
  },
}));

describe('Cloudinary diary asset verification', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('rejects assets outside the authenticated user folder', async () => {
    await expect(verifyCloudinaryAsset('user-1', 'memosphere/diary/user-2/photo')).rejects.toThrow('does not belong');
  });

  it('rejects assets over the 5 MB limit', async () => {
    vi.mocked(cloudinary.api.resource).mockResolvedValue({
      public_id: 'memosphere/diary/user-1/photo', width: 2000, height: 1000, bytes: 5 * 1024 * 1024 + 1,
      format: 'jpg', resource_type: 'image', type: 'authenticated',
    });
    await expect(verifyCloudinaryAsset('user-1', 'memosphere/diary/user-1/photo')).rejects.toThrow('size limit');
  });

  it('accepts a supported private image', async () => {
    vi.mocked(cloudinary.api.resource).mockResolvedValue({
      public_id: 'memosphere/diary/user-1/photo', width: 2000, height: 1000, bytes: 1000,
      format: 'webp', resource_type: 'image', type: 'authenticated',
    });
    await expect(verifyCloudinaryAsset('user-1', 'memosphere/diary/user-1/photo')).resolves.toMatchObject({ format: 'webp' });
    expect(cloudinary.api.resource).toHaveBeenCalledWith(
      'memosphere/diary/user-1/photo',
      expect.objectContaining({ resource_type: 'image', type: 'authenticated' }),
    );
  });

  it('creates authenticated signed thumbnail and full URLs', () => {
    const thumbnail = signedCloudinaryUrl('memosphere/diary/user-1/photo', 'c_fill,w_480,h_480,q_auto,f_auto');
    expect(thumbnail).toContain('/authenticated/');
    expect(cloudinary.url).toHaveBeenCalledWith(
      'memosphere/diary/user-1/photo',
      expect.objectContaining({ type: 'authenticated', sign_url: true, secure: true, resource_type: 'image' }),
    );
  });
});
