// Repro the chat.service.ts vision call against Cal-AI /api/food/analyze.
// Replicates fetchImageBytes (data URL path) + Blob/FormData posting so we
// can isolate whether the "UnidentifiedImageError" originates in encoding
// or in the server.
import fs from 'node:fs/promises';
import path from 'node:path';

const CAL_AI = (process.env.CAL_AI_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const samplePath = path.resolve(
  'Cal-AI/data/storage/Food Images/-bloody-mary-tomato-toast-with-celery-and-horseradish-56389813.jpg'
);

const fileBuffer = await fs.readFile(samplePath);
const dataUrl = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;

// Mirror fetchImageBytes() data-URL branch exactly.
const match = dataUrl.match(/^data:(image\/(?:png|jpe?g|webp));base64,([a-z0-9+/=]+)$/i);
if (!match) throw new Error('regex failed');
const buffer = Buffer.from(match[2], 'base64');
const bytes = new ArrayBuffer(buffer.byteLength);
new Uint8Array(bytes).set(buffer);

console.log('source size:', fileBuffer.byteLength, 'decoded size:', buffer.byteLength);
console.log('first 4 bytes of decoded:', [...new Uint8Array(bytes).slice(0, 4)].map(b => b.toString(16)));

const form = new FormData();
form.append('file', new Blob([bytes], { type: 'image/jpeg' }), 'test.jpg');
form.append('question', 'what is this');

const resp = await fetch(`${CAL_AI}/api/food/analyze`, { method: 'POST', body: form });
const text = await resp.text();
console.log('status:', resp.status);
console.log('body excerpt:', text.slice(0, 400));
