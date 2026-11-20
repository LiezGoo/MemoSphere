import { v2 as cloudinary } from 'cloudinary';
import { environment } from '../../config/environment.js';
import { InputValidationError, ServiceUnavailableError } from '../../exceptions/index.js';

const MAX_BYTES = 5 * 1024 * 1024;
const allowedFormats = new Set(['jpg', 'jpeg', 'png', 'webp']);

type CloudinaryAsset = { public_id: string; width: number; height: number; bytes: number; format: string; resource_type: string; type: string };
type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };

function config(): CloudinaryConfig {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = environment;
  if (!cloudName || !apiKey || !apiSecret) throw new ServiceUnavailableError('Photo uploads are not configured.');
  return { cloudName, apiKey, apiSecret };
}
function signature(params: Record<string, string | number>, secret: string) {
  return cloudinary.utils.api_sign_request(params, secret);
}
function folder(userId: string) { return `memosphere/diary/${userId}`; }
function assertPublicId(userId: string, publicId: string) {
  if (!publicId.startsWith(`${folder(userId)}/`) || publicId.includes('..')) throw new InputValidationError('The photo does not belong to this account.');
}

export function createPhotoUploadSignature(userId: string, requestedCount: number) {
  if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 5) throw new InputValidationError('Select between 1 and 5 photos.');
  const cloud = config();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder: folder(userId), timestamp, type: 'authenticated', transformation: 'fl_strip_profile' };
  return { cloudName: cloud.cloudName, apiKey: cloud.apiKey, timestamp, folder: params.folder, type: params.type, transformation: params.transformation, signature: signature(params, cloud.apiSecret) };
}

export async function verifyCloudinaryAsset(userId: string, publicId: string): Promise<CloudinaryAsset> {
  assertPublicId(userId, publicId);
  const cloud = config();
  cloudinary.config({ cloud_name: cloud.cloudName, api_key: cloud.apiKey, api_secret: cloud.apiSecret, secure: true });
  let asset: CloudinaryAsset;
  try {
    asset = await cloudinary.api.resource(publicId, { resource_type: 'image', type: 'authenticated' }) as CloudinaryAsset;
  } catch {
    throw new InputValidationError('The uploaded photo could not be verified.');
  }
  const format = asset.format.toLowerCase();
  if (asset.type !== 'authenticated' || asset.resource_type !== 'image' || !allowedFormats.has(format) || asset.bytes > MAX_BYTES || asset.width < 1 || asset.height < 1) throw new InputValidationError('The uploaded photo is not a supported image within the size limit.');
  return asset;
}

export async function deleteCloudinaryAsset(publicId: string) {
  const cloud = config();
  cloudinary.config({ cloud_name: cloud.cloudName, api_key: cloud.apiKey, api_secret: cloud.apiSecret, secure: true });
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image', type: 'authenticated', invalidate: true });
}

export function signedCloudinaryUrl(publicId: string, transformation: string) {
  const cloud = config();
  cloudinary.config({ cloud_name: cloud.cloudName, api_key: cloud.apiKey, api_secret: cloud.apiSecret, secure: true });
  const parsed = transformation === 'c_fill,w_240,h_240,q_auto,f_auto'
    ? { crop: 'fill', width: 240, height: 240, quality: 'auto', fetch_format: 'auto' }
    : transformation === 'c_fill,w_480,h_480,q_auto,f_auto'
      ? { crop: 'fill', width: 480, height: 480, quality: 'auto', fetch_format: 'auto' }
      : { crop: 'limit', width: 2000, height: 2000, quality: 'auto', fetch_format: 'auto' };
  return cloudinary.url(publicId, {
    type: 'authenticated',
    sign_url: true,
    secure: true,
    resource_type: 'image',
    transformation: [parsed],
  });
}

export { MAX_BYTES };
