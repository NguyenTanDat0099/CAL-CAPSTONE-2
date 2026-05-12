import { v2 as cloudinary } from 'cloudinary';

let configured = false;

const ensureConfigured = () => {
  if (configured) return;
  // The SDK auto-reads CLOUDINARY_URL env. We still call config() so it picks
  // up explicit values too, and so secure URLs are emitted by default.
  if (process.env.CLOUDINARY_URL?.trim()) {
    cloudinary.config({ secure: true });
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
  configured = true;
};

export const isCloudinaryConfigured = (): boolean => {
  if (process.env.CLOUDINARY_URL?.trim()) return true;
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

interface UploadOptions {
  folder?: string;
  publicIdPrefix?: string;
}

const DATA_URL_RE = /^data:image\/(png|jpe?g|webp);base64,/i;

const looksLikeDataUrl = (value: string) => DATA_URL_RE.test(value);

export const isCloudinaryUrl = (value: string | null | undefined): boolean => {
  if (!value) return false;
  return /^https?:\/\/res\.cloudinary\.com\//i.test(value);
};

const buildPublicId = (prefix?: string) => {
  const random = Math.random().toString(36).slice(2, 10);
  const ts = Date.now();
  return prefix ? `${prefix}_${ts}_${random}` : `${ts}_${random}`;
};

export const uploadImageDataUrl = async (
  dataUrl: string,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult> => {
  if (!isCloudinaryConfigured()) {
    throw new Error('CLOUDINARY_NOT_CONFIGURED');
  }
  if (!looksLikeDataUrl(dataUrl)) {
    throw new Error('INVALID_IMAGE');
  }
  ensureConfigured();

  const folder = options.folder?.trim() || 'calai';
  const publicId = buildPublicId(options.publicIdPrefix);

  const result = await cloudinary.uploader.upload(dataUrl, {
    folder,
    public_id: publicId,
    resource_type: 'image',
    overwrite: false,
  });

  return {
    url: result.secure_url || result.url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    format: result.format,
  };
};

/**
 * Fetch raw bytes for any image URL we accept — either a base64 data URL
 * (used during the same request before/while uploading to Cloudinary) or
 * an http(s) URL (used when the image was already persisted to Cloudinary
 * and we need to feed it to the Cal-AI vision pipeline).
 */
export const fetchImageBytes = async (
  imageUrl: string,
  signal?: AbortSignal
): Promise<{ mime: string; bytes: ArrayBuffer; filename: string }> => {
  if (looksLikeDataUrl(imageUrl)) {
    const match = imageUrl.match(/^data:(image\/(?:png|jpe?g|webp));base64,([a-z0-9+/=]+)$/i);
    if (!match) throw new Error('INVALID_IMAGE');
    const buffer = Buffer.from(match[2], 'base64');
    const bytes = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(bytes).set(buffer);
    const mime = match[1].toLowerCase();
    return { mime, bytes, filename: `image.${mime.split('/')[1] || 'jpg'}` };
  }

  if (!/^https?:\/\//i.test(imageUrl)) {
    throw new Error('INVALID_IMAGE');
  }

  const response = await fetch(imageUrl, { signal });
  if (!response.ok) {
    throw new Error(`IMAGE_FETCH_FAILED:${response.status}`);
  }
  const bytes = await response.arrayBuffer();
  const mime = (response.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  const filename = imageUrl.split('?')[0].split('/').pop() || `image.${mime.split('/')[1] || 'jpg'}`;
  return { mime, bytes, filename };
};

export { looksLikeDataUrl };
