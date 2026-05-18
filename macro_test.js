const fs = require('fs');
const path = require('path');
const BASE = 'http://localhost:3000';

// Use 3 fresh images (uncached) with unique questions to bypass cache
const CASES = [
  { f: 'edamame-succotash-salad-243129.jpg',                                                   q: 'Phân tích đầy đủ dinh dưỡng món này cho tôi.' },
  { f: 'fried-chicken-and-waffle-sandwich-with-potato-salad-and-collard-slaw-51234680.jpg',     q: 'Cho tôi số liệu calo và macro chi tiết.' },
  { f: 'greek-lamb-burgers-with-spinach-and-red-onion-salad-241609.jpg',                       q: 'Tôi cần biết protein carb fat của món này.' },
  { f: 'dukkah-crusted-salmon-with-cucumber-and-chilli-salad.jpg',                              q: 'Mô tả nhanh và đưa số dinh dưỡng đầy đủ.' },
];

(async () => {
  const lr = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'toanpld2004@gmail.com', password: '123' }) });
  const token = (await lr.json()).data.token;
  const summary = [];
  for (const { f, q } of CASES) {
    const buf = fs.readFileSync(path.join('Cal-AI/data/storage/images', f));
    const t0 = Date.now();
    const r = await fetch(`${BASE}/api/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: q, sessionId: null, imageUrl: `data:image/jpeg;base64,${buf.toString('base64')}`, imageName: f }),
    });
    const j = await r.json();
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    const ai = j.data?.messages?.filter(m => m.sender === 'ai').slice(-1)[0];
    const fi = ai?.foodInsight || {};
    const filled = ['calories', 'protein', 'carbs', 'fat'].filter(k => fi[k] != null).length;
    summary.push({ file: f.slice(0, 35), dt, kcal: fi.calories, p: fi.protein, c: fi.carbs, fat: fi.fat, filled });
    console.log(`\n${dt}s | ${f.slice(0, 40)}`);
    console.log(`  dish=${fi.dishName} | kcal=${fi.calories ?? '?'} | P=${fi.protein ?? '?'} | C=${fi.carbs ?? '?'} | F=${fi.fat ?? '?'} | filled ${filled}/4`);
    // Show last 200 chars of answer to confirm the summary line exists
    const ans = ai?.message || '';
    const tail = ans.slice(-300).replace(/\n/g, ' ');
    console.log(`  tail: ...${tail}`);
  }
  const totalFilled = summary.reduce((a, b) => a + b.filled, 0);
  console.log(`\n=== TOTAL: ${totalFilled}/16 macro slots filled (${(totalFilled / 16 * 100).toFixed(0)}%) ===`);
})();
