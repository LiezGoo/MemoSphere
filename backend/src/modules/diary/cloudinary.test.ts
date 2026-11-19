import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyCloudinaryAsset } from './cloudinary.js';

describe('Cloudinary diary asset verification', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('rejects assets outside the authenticated user folder', async () => {
    await expect(verifyCloudinaryAsset('user-1', 'memosphere/diary/user-2/photo')).rejects.toThrow('does not belong');
  });

  it('rejects assets over the 5 MB limit', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      public_id: 'memosphere/diary/user-1/photo', width: 2000, height: 1000, bytes: 5 * 1024 * 1024 + 1,
      format: 'jpg', resource_type: 'image', type: 'authenticated',
    }), { status: 200 }));
    await expect(verifyCloudinaryAsset('user-1', 'memosphere/diary/user-1/photo')).rejects.toThrow('size limit');
  });

  it('accepts a supported private image', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      public_id: 'memosphere/diary/user-1/photo', width: 2000, height: 1000, bytes: 1000,
      format: 'webp', resource_type: 'image', type: 'authenticated',
    }), { status: 200 }));
    await expect(verifyCloudinaryAsset('user-1', 'memosphere/diary/user-1/photo')).resolves.toMatchObject({ format: 'webp' });
  });
});
