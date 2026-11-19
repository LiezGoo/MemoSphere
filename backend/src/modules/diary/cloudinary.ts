import { createHash } from 'node:crypto';
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
  const value = Object.entries(params).filter(([, item]) => item !== '').sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${key}=${item}`).join('&');
  return createHash('sha1').update(`${value}${secret}`).digest('hex');
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
  const auth = Buffer.from(`${cloud.apiKey}:${cloud.apiSecret}`).toString('base64');
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud.cloudName}/resources/authenticated/image/${encodeURIComponent(publicId)}`, { headers: { Authorization: `Basic ${auth}` } });
  if (!response.ok) throw new InputValidationError('The uploaded photo could not be verified.');
  const asset = await response.json() as CloudinaryAsset;
  const format = asset.format.toLowerCase();
  if (asset.type !== 'authenticated' || asset.resource_type !== 'image' || !allowedFormats.has(format) || asset.bytes > MAX_BYTES || asset.width < 1 || asset.height < 1) throw new InputValidationError('The uploaded photo is not a supported image within the size limit.');
  return asset;
}

export async function deleteCloudinaryAsset(publicId: string) {
  const cloud = config();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { public_id: publicId, timestamp, type: 'authenticated' };
  const body = new URLSearchParams(Object.entries({ ...params, api_key: cloud.apiKey, signature: signature(params, cloud.apiSecret) }).map(([key, value]) => [key, String(value)]));
  await fetch(`https://api.cloudinary.com/v1_1/${cloud.cloudName}/destroy`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
}

export function signedCloudinaryUrl(publicId: string, transformation: string) {
  const cloud = config();
  const path = `${transformation}/${publicId}`;
  const signatureValue = createHash('sha1').update(`${path}${cloud.apiSecret}`).digest('hex').slice(0, 8);
  return `https://res.cloudinary.com/${cloud.cloudName}/image/authenticated/s--${signatureValue}--/${path}`;
}

export { MAX_BYTES };
