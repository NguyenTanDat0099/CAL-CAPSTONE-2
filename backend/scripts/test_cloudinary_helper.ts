/* eslint-disable no-console */
import {
  fetchImageBytes,
  isCloudinaryConfigured,
  isCloudinaryUrl,
  looksLikeDataUrl,
} from '../src/shared/storage/cloudinary';

let passed = 0;
let failed = 0;
const failures: Array<{ name: string; msg: string }> = [];

function describe(name: string, fn: () => void) { console.log(`\n— ${name}`); fn(); }
function it(name: string, fn: () => void | Promise<void>) {
  const run = async () => {
    try { await fn(); passed++; console.log(`  PASS  ${name}`); }
    catch (e: unknown) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      failures.push({ name, msg });
      console.log(`  FAIL  ${name}\n        ${msg}`);
    }
  };
  // sync tests run inline; async tests are awaited via the queue
  pending.push(run());
}
function eq<T>(actual: T, expected: T, label = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`);
  }
}
function truthy(v: unknown, label = '') { if (!v) throw new Error(`${label}: expected truthy, got ${JSON.stringify(v)}`); }
function falsy(v: unknown, label = '') { if (v) throw new Error(`${label}: expected falsy, got ${JSON.stringify(v)}`); }
async function throwsAsync(fn: () => Promise<unknown>, expectedMsg: string | RegExp) {
  try { await fn(); }
  catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (expectedMsg instanceof RegExp ? !expectedMsg.test(msg) : msg !== expectedMsg) {
      throw new Error(`expected throw matching ${expectedMsg}, got "${msg}"`);
    }
    return;
  }
  throw new Error(`expected throw matching ${expectedMsg}, but did not throw`);
}

const pending: Array<Promise<void>> = [];

const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=';

describe('looksLikeDataUrl', () => {
  it('accepts png/jpg/jpeg/webp data URLs', () => {
    truthy(looksLikeDataUrl(tinyPng));
    truthy(looksLikeDataUrl('data:image/jpg;base64,abc'));
    truthy(looksLikeDataUrl('data:image/jpeg;base64,abc'));
    truthy(looksLikeDataUrl('data:image/webp;base64,abc'));
  });
  it('rejects unsupported MIME', () => {
    falsy(looksLikeDataUrl('data:image/gif;base64,abc'));
    falsy(looksLikeDataUrl('data:application/pdf;base64,abc'));
  });
  it('rejects http(s) URLs', () => {
    falsy(looksLikeDataUrl('https://res.cloudinary.com/dzlyu159m/image/upload/abc.jpg'));
    falsy(looksLikeDataUrl('http://example.com/img.png'));
  });
});

describe('isCloudinaryUrl', () => {
  it('detects res.cloudinary.com URLs', () => {
    truthy(isCloudinaryUrl('https://res.cloudinary.com/dzlyu159m/image/upload/abc.jpg'));
    truthy(isCloudinaryUrl('http://res.cloudinary.com/dzlyu159m/image/upload/abc.jpg'));
  });
  it('rejects other URLs', () => {
    falsy(isCloudinaryUrl('https://example.com/abc.jpg'));
    falsy(isCloudinaryUrl(tinyPng));
    falsy(isCloudinaryUrl(null));
    falsy(isCloudinaryUrl(undefined));
    falsy(isCloudinaryUrl(''));
  });
});

describe('isCloudinaryConfigured', () => {
  const savedUrl = process.env.CLOUDINARY_URL;
  const savedName = process.env.CLOUDINARY_CLOUD_NAME;
  const savedKey = process.env.CLOUDINARY_API_KEY;
  const savedSecret = process.env.CLOUDINARY_API_SECRET;
  const restore = () => {
    process.env.CLOUDINARY_URL = savedUrl;
    process.env.CLOUDINARY_CLOUD_NAME = savedName;
    process.env.CLOUDINARY_API_KEY = savedKey;
    process.env.CLOUDINARY_API_SECRET = savedSecret;
  };

  it('false when nothing configured', () => {
    delete process.env.CLOUDINARY_URL;
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    falsy(isCloudinaryConfigured());
    restore();
  });
  it('true when CLOUDINARY_URL set', () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    process.env.CLOUDINARY_URL = 'cloudinary://k:s@cloud';
    truthy(isCloudinaryConfigured());
    restore();
  });
  it('true when individual vars set', () => {
    delete process.env.CLOUDINARY_URL;
    process.env.CLOUDINARY_CLOUD_NAME = 'cloud';
    process.env.CLOUDINARY_API_KEY = 'k';
    process.env.CLOUDINARY_API_SECRET = 's';
    truthy(isCloudinaryConfigured());
    restore();
  });
  it('false when only one of the three individual vars set', () => {
    delete process.env.CLOUDINARY_URL;
    process.env.CLOUDINARY_CLOUD_NAME = 'cloud';
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    falsy(isCloudinaryConfigured());
    restore();
  });
});

describe('fetchImageBytes (data URL path — no network)', () => {
  it('parses a valid PNG data URL', async () => {
    const r = await fetchImageBytes(tinyPng);
    eq(r.mime, 'image/png');
    truthy(r.bytes.byteLength > 0);
    truthy(r.filename.endsWith('.png'));
  });
  it('parses jpg/jpeg/webp data URLs', async () => {
    const j = await fetchImageBytes('data:image/jpeg;base64,/9j/4AAQ');
    eq(j.mime, 'image/jpeg');
    const w = await fetchImageBytes('data:image/webp;base64,UklGRg==');
    eq(w.mime, 'image/webp');
  });
  it('rejects unsupported MIME', () =>
    throwsAsync(() => fetchImageBytes('data:image/gif;base64,abc'), 'INVALID_IMAGE')
  );
  it('rejects malformed string', () =>
    throwsAsync(() => fetchImageBytes('not-a-url'), 'INVALID_IMAGE')
  );
});

(async () => {
  // Wait for queued async tests
  await Promise.all(pending);
  console.log('\n==============================');
  console.log(`PASS: ${passed}    FAIL: ${failed}`);
  if (failed > 0) {
    console.log('\nFailures:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.name}\n     ${f.msg}`));
    process.exitCode = 1;
  } else {
    console.log('All scenarios passed.');
  }
})();
