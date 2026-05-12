// Replicates the Cloudinary URL branch in fetchImageBytes(): upload an image
// to Cloudinary, then fetch it back over HTTP and feed it to /api/food/analyze
// just like askCalAiFoodImage does for context-image follow-ups.
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';

const CAL_AI = (process.env.CAL_AI_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
cloudinary.config({ secure: true });

const samplePath = path.resolve(
  '..', 'Cal-AI/data/storage/Food Images/-bloody-mary-tomato-toast-with-celery-and-horseradish-56389813.jpg'
);

const fileBuffer = await fs.readFile(samplePath);
const dataUrl = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;

const uploaded = await cloudinary.uploader.upload(dataUrl, {
  folder: 'calai/_debug',
  public_id: `debug_${Date.now()}`,
  resource_type: 'image',
  overwrite: false,
});

console.log('uploaded:', uploaded.secure_url);
console.log('format:', uploaded.format, 'bytes:', uploaded.bytes);

const r = await fetch(uploaded.secure_url);
console.log('cloudinary fetch status:', r.status, 'ct:', r.headers.get('content-type'));
const ab = await r.arrayBuffer();
const head = [...new Uint8Array(ab).slice(0, 6)].map(b => b.toString(16));
console.log('fetched size:', ab.byteLength, 'magic:', head);

const mime = (r.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
const filename = uploaded.secure_url.split('?')[0].split('/').pop();
console.log('using filename:', filename, 'mime:', mime);

const form = new FormData();
form.append('file', new Blob([ab], { type: mime }), filename);
const resp = await fetch(`${CAL_AI}/api/food/analyze`, { method: 'POST', body: form });
console.log('food/analyze status:', resp.status);
const body = await resp.text();
console.log('body excerpt:', body.slice(0, 400));
