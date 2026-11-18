import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { environment } from '../../config/environment.js';

const algorithm = 'aes-256-gcm';
const descriptorLength = 128;

function key(): Buffer {
  const encoded = environment.FACE_TEMPLATE_KEY;
  if (!encoded) throw new Error('FACE_TEMPLATE_KEY is required for face login.');
  const value = Buffer.from(encoded, 'base64');
  if (value.length !== 32) throw new Error('FACE_TEMPLATE_KEY must be a base64-encoded 32-byte key.');
  return value;
}

export function encryptDescriptor(descriptor: number[]): string {
  if (descriptor.length !== descriptorLength || descriptor.some((value) => !Number.isFinite(value))) throw new Error('Invalid face descriptor.');
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(new Float32Array(descriptor).buffer)), cipher.final()]);
  return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptDescriptor(payload: string): number[] {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = payload.split('.');
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error('Invalid encrypted face descriptor.');
  const decipher = createDecipheriv(algorithm, key(), Buffer.from(ivEncoded, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, 'base64url')), decipher.final()]);
  const values = new Float32Array(plaintext.buffer, plaintext.byteOffset, plaintext.byteLength / Float32Array.BYTES_PER_ELEMENT);
  if (values.length !== descriptorLength) throw new Error('Invalid encrypted face descriptor.');
  return [...values];
}

export function hashFaceNonce(nonce: string): string {
  return createHash('sha256').update(nonce).digest('hex');
}

export function descriptorsMatch(left: number[], right: number[]): boolean {
  if (left.length !== descriptorLength || right.length !== descriptorLength) return false;
  const distance = Math.sqrt(left.reduce((sum, value, index) => sum + (value - right[index]) ** 2, 0));
  return distance <= environment.FACE_MATCH_THRESHOLD;
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(`${environment.FACE_TEMPLATE_KEY ?? 'face'}:${ip}`).digest('hex');
}

export function safeEqualNonceHash(expected: string, actual: string): boolean {
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(actual, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
