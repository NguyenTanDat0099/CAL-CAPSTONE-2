'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { v2: cloudinary } = require('cloudinary');

const url = (process.env.CLOUDINARY_URL || '').trim();
console.log('--- Cloudinary credential diagnostic ---');
console.log('CLOUDINARY_URL set?         ', url ? 'YES' : 'NO');
console.log('CLOUDINARY_CLOUD_NAME set?  ', !!process.env.CLOUDINARY_CLOUD_NAME);
console.log('CLOUDINARY_API_KEY set?     ', !!process.env.CLOUDINARY_API_KEY);
console.log('CLOUDINARY_API_SECRET set?  ', !!process.env.CLOUDINARY_API_SECRET);

if (url) {
  // cloudinary://<key>:<secret>@<cloud>
  const m = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!m) {
    console.log('CLOUDINARY_URL format       : INVALID (must be cloudinary://<key>:<secret>@<cloud_name>)');
  } else {
    const [, key, secret, cloud] = m;
    console.log('Parsed cloud_name           :', cloud);
    console.log('Parsed api_key length       :', key.length, '(typical: 15)');
    console.log('Parsed api_secret length    :', secret.length, '(typical: 27)');
    console.log('api_secret leading char     :', secret[0]);
    console.log('api_secret trailing char    :', secret[secret.length - 1]);
    console.log('api_secret has whitespace?  :', /\s/.test(secret));
  }
}

cloudinary.config({ secure: true });

(async () => {
  try {
    console.log('\nCalling cloudinary.api.ping()…');
    const pong = await cloudinary.api.ping();
    console.log('PING OK:', pong);
  } catch (err) {
    console.log('PING FAILED:', err.message);
    if (err.error) console.log('             ', JSON.stringify(err.error));
    if (err.http_code) console.log('  http_code :', err.http_code);
  }
})();
