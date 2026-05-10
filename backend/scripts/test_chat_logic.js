'use strict';

// =============================================================================
//  Chat logic test harness — mirrors pure helpers from
//  backend/src/chat/services/chat.service.ts and
//  backend/src/chat/controllers/chat.controller.ts
//  so we can exercise them without spinning up Express + MySQL.
// =============================================================================

// ---- Helpers copied from chat.service.ts (pure / no DB) ---------------------

const MAX_IMAGE_DATA_URL_LENGTH = Number(process.env.MAX_IMAGE_DATA_URL_LENGTH || 3_500_000);

const stripAccents = (value) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const isFollowUpMessage = (message) => {
  const normalized = stripAccents(message);
  if (normalized.length <= 28) return true;
  return [
    'mon nay', 'mon do', 'cai nay', 'cai do', 'no ', 'nay ', 'do ',
    'trong do', 'trong day', 'trong nay', 'trong anh', 'trong hinh',
    'nguyen lieu', 'thanh phan', 'tiep', 'tinh tiep', 'vay con', 'vay ',
    'nhu vay', 'luong dinh duong', 'can nang hien tai', 'tang bao nhieu',
    'giam bao nhieu', 'con no', 'so sanh voi', 'them', 'bot', 'doi sang',
    'nhu tren', 'ban vua noi', 'ban xac dinh', 'ban nhan dien',
    'that meal', 'this meal', 'it ', 'that ', 'this ',
  ].some((kw) => normalized.includes(kw));
};

const wantsChart = (message) => {
  const n = stripAccents(message);
  return ['bieu do', 'do thi', 'chart', 'graph', 'visualize', 'visualise']
    .some((kw) => n.includes(kw));
};

const wantsStructuredTable = (message) => {
  const n = stripAccents(message);
  return wantsChart(message)
    || ['bang', 'table', 'so sanh', 'compare', 'comparison', ' vs ', 'versus',
        'liet ke', 'danh sach', 'list', 'ke hoach', 'plan', 'thuc don',
        'meal plan', 'so lieu', 'du lieu', 'metric', 'thong ke', 'rank',
        'xep hang', 'calo', 'kcal', 'calorie', 'macro', 'protein', 'carb',
        'fat', 'fiber', 'chat xo', 'duong', 'sodium', 'natri', 'dinh duong',
        'nutrition', 'uoc tinh', 'estimate', 'kg', 'tang bao nhieu',
        'giam bao nhieu', 'tdee', 'bmr', 'can nang', 'surplus', 'deficit']
       .some((kw) => n.includes(kw));
};

const wantsIdentity = (message) => {
  const n = stripAccents(message);
  return n.includes('mon gi') || n.includes('day la gi')
      || n.includes('what is') || n.includes('identify') || n.includes('dish');
};

const wantsCalories = (message) => {
  const n = stripAccents(message);
  return n.includes('calo') || n.includes('calorie') || n.includes('kcal')
      || n.includes('macro') || n.includes('dinh duong') || n.includes('nutrition');
};

const wantsImageContext = (message) => {
  const n = stripAccents(message);
  return wantsIdentity(message) || wantsCalories(message)
      || n.includes('mon nay') || n.includes('mon do')
      || n.includes('anh nay') || n.includes('hinh nay')
      || n.includes('trong anh') || n.includes('trong hinh')
      || n.includes('no la') || n.includes('no co')
      || n.includes('this') || n.includes('that')
      || n.includes('image') || n.includes('photo');
};

const escapeMarkdownCell = (value) =>
  String(value ?? 'Chưa rõ')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '; ')
    .trim();

const markdownTable = (headers, rows) => {
  const headerLine = `| ${headers.map(escapeMarkdownCell).join(' | ')} |`;
  const dividerLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows
    .filter((row) => row.some((cell) => String(cell ?? '').trim().length > 0))
    .map((row) => `| ${row.map(escapeMarkdownCell).join(' | ')} |`);
  return [headerLine, dividerLine, ...body].join('\n');
};

const formatMetric = (value, unit) => {
  if (value == null || !Number.isFinite(value)) return 'Chưa đủ dữ liệu';
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${unit}`;
};

const formatConfidence = (value) => {
  if (value == null || !Number.isFinite(value)) return null;
  const normalized = value > 1 ? value / 100 : value;
  return `${Math.round(normalized * 100)}%`;
};

const toNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const m = value.match(/-?\d+(?:\.\d+)?/);
    if (m) return Number(m[0]);
  }
  return null;
};

const cleanDishName = (value) => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === 'unknown') return null;
  return trimmed;
};

const parseImageDataUrl = (imageUrl) => {
  const m = imageUrl.match(/^data:(image\/(?:png|jpe?g|webp));base64,([a-z0-9+/=]+)$/i);
  if (!m) throw new Error('INVALID_IMAGE');
  const buffer = Buffer.from(m[2], 'base64');
  const bytes = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(bytes).set(buffer);
  return { mime: m[1].toLowerCase(), base64: m[2], bytes };
};

const normalizeImageUrl = (imageUrl) => {
  const value = imageUrl?.trim();
  if (!value) return null;
  if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(value)) {
    throw new Error('INVALID_IMAGE');
  }
  if (value.length > MAX_IMAGE_DATA_URL_LENGTH) {
    throw new Error('IMAGE_TOO_LARGE');
  }
  parseImageDataUrl(value);
  return value;
};

const parseThinkingSteps = (value) => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const parseFoodInsight = (value) => {
  if (!value) return undefined;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const formatCalAiResponse = (data) => {
  if (!data || typeof data !== 'object') return null;
  const r = data;
  if (typeof r.answer === 'string' && r.answer.trim()) return r.answer.trim();
  if (typeof r.content === 'string' && r.content.trim()) return r.content.trim();
  if (typeof r.explanation === 'string' && r.explanation.trim()) return r.explanation.trim();
  if (Array.isArray(r.data) && r.data.length > 0) {
    const preview = r.data.slice(0, 3)
      .map((item, i) => `${i + 1}. ${JSON.stringify(item)}`).join('\n');
    return `I found these nutrition records:\n${preview}`;
  }
  return null;
};

const buildChatContextText = (history, currentMessage) => {
  const current = currentMessage.trim();
  const previous = history
    .filter((item, i) => {
      const isLast = i === history.length - 1;
      return !(isLast && item.sender === 'user' && item.message.trim() === current);
    })
    .slice(-8);
  if (previous.length === 0) return '';
  return previous.map((item) => {
    const label = item.sender === 'user' ? 'User' : 'Assistant';
    const imagePart = item.imageName ? ` [ảnh: ${item.imageName}]` : '';
    return `${label}${imagePart}: ${item.message.slice(0, 420)}`;
  }).join('\n');
};

const riskFlagsToText = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === 'string') return item.trim();
    if (!item || typeof item !== 'object' || Array.isArray(item)) return '';
    const r = item;
    const risk = typeof r.risk === 'string' ? r.risk.trim() : '';
    const severity = typeof r.severity === 'string' ? r.severity.trim() : '';
    const reason = typeof r.reason === 'string' ? r.reason.trim() : '';
    return [risk, severity ? `mức ${severity}` : '', reason].filter(Boolean).join(': ');
  }).filter(Boolean);
};

// ---- Helper from chat.controller.ts -----------------------------------------

const parseSessionId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const statusByError = {
  USER_NOT_FOUND: 404,
  CHAT_SESSION_NOT_FOUND: 404,
  CHAT_MESSAGE_NOT_FOUND: 404,
  EMPTY_MESSAGE: 400,
  INVALID_IMAGE: 400,
  IMAGE_TOO_LARGE: 413,
};
const handleChatErrorStatus = (errMsg) => statusByError[errMsg] ?? 500;

// =============================================================================
//  Tiny test runner
// =============================================================================

let passed = 0, failed = 0;
const failures = [];

const isNaNStrict = (v) => typeof v === 'number' && v !== v;

function deepEqual(a, b) {
  if (a === b) return true;
  if (isNaNStrict(a) && isNaNStrict(b)) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ak = Object.keys(a), bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => deepEqual(a[k], b[k]));
}

function describe(group, fn) {
  console.log(`\n— ${group}`);
  fn();
}
function it(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, msg: e.message });
    console.log(`  FAIL  ${name}\n        ${e.message.replace(/\n/g, '\n        ')}`);
  }
}
function eq(actual, expected, label = '') {
  if (!deepEqual(actual, expected)) {
    throw new Error(`${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`);
  }
}
function truthy(v, label = '') {
  if (!v) throw new Error(`${label}: expected truthy, got ${JSON.stringify(v)}`);
}
function falsy(v, label = '') {
  if (v) throw new Error(`${label}: expected falsy, got ${JSON.stringify(v)}`);
}
function throws(fn, expectedMsg) {
  try { fn(); }
  catch (e) {
    if (e.message !== expectedMsg) {
      throw new Error(`expected throw "${expectedMsg}", got "${e.message}"`);
    }
    return;
  }
  throw new Error(`expected throw "${expectedMsg}", but did not throw`);
}

// =============================================================================
//  Tests
// =============================================================================

describe('stripAccents', () => {
  it('removes Vietnamese diacritics', () => {
    eq(stripAccents('Bún chả'), 'bun cha');
    eq(stripAccents('Phở bò'), 'pho bo');
    eq(stripAccents('Đường'), 'duong');
    eq(stripAccents('ĐẦY'), 'day');
  });
  it('lowercases ASCII', () => eq(stripAccents('CALORIES'), 'calories'));
  it('handles empty string', () => eq(stripAccents(''), ''));
});

describe('isFollowUpMessage', () => {
  it('short messages always treated as follow-up', () => {
    truthy(isFollowUpMessage('OK'));
    truthy(isFollowUpMessage('Tiếp đi'));
    truthy(isFollowUpMessage('Còn nó thì sao?'));
  });
  it('detects "món này" reference in long message', () => {
    truthy(isFollowUpMessage('Cho tôi biết món này có bao nhiêu chất xơ và protein nhé'));
  });
  it('detects "bạn vừa nói"', () => {
    truthy(isFollowUpMessage('Bạn vừa nói gì về thực phẩm chứa nhiều protein nhỉ?'));
  });
  it('long unrelated question is NOT follow-up', () => {
    // Pure standalone question — no deictic keyword should fire.
    falsy(isFollowUpMessage('Tôi cần lời khuyên dinh dưỡng phù hợp với người ăn chay trường thuần thực vật'));
  });
  it('long message with "this " word is follow-up (English)', () => {
    truthy(isFollowUpMessage('Can you analyse this dish for me please right now?'));
  });
  it('FALSE-POSITIVE: "hôm nay" treated as follow-up because "nay " is deictic kw', () => {
    // Documents an imprecise heuristic: 'nay ' (this/today) matches inside 'hom nay '.
    truthy(isFollowUpMessage('Hôm nay tôi muốn lập kế hoạch ăn uống lành mạnh cho cả tuần được không?'));
  });
  it('FALSE-POSITIVE: "thêm gia vị" triggers via "them" substring', () => {
    truthy(isFollowUpMessage('Tôi nên thêm gia vị nào vào món gà nướng để bớt mặn hơn nhỉ?'));
  });
});

describe('wantsChart', () => {
  it('detects Vietnamese "biểu đồ"', () => truthy(wantsChart('Vẽ biểu đồ macro cho tôi')));
  it('detects English "chart"', () => truthy(wantsChart('I need a chart please')));
  it('detects "graph" and "visualize"', () => {
    truthy(wantsChart('Show me a graph'));
    truthy(wantsChart('Visualize my calories'));
  });
  it('returns false for unrelated', () => falsy(wantsChart('Cho tôi list ngắn')));
});

describe('wantsStructuredTable', () => {
  it('detects table/compare keywords', () => {
    truthy(wantsStructuredTable('So sánh táo và lê'));
    truthy(wantsStructuredTable('I need a table'));
    truthy(wantsStructuredTable('apple vs orange'));
  });
  it('detects nutrition keywords (protein/macro/calo)', () => {
    truthy(wantsStructuredTable('Bao nhiêu protein trong cá hồi?'));
    truthy(wantsStructuredTable('Tôi cần macro split'));
    truthy(wantsStructuredTable('Calo trong khoai lang là gì?'));
  });
  it('detects planning/list keywords', () => {
    truthy(wantsStructuredTable('Lập meal plan giúp tôi'));
    truthy(wantsStructuredTable('Liệt kê thực đơn cho tuần'));
  });
  it('detects TDEE/BMR/cân nặng', () => {
    truthy(wantsStructuredTable('TDEE của tôi là bao nhiêu?'));
    truthy(wantsStructuredTable('BMR cho nam 30 tuổi'));
    truthy(wantsStructuredTable('Tôi muốn tăng bao nhiêu cân?'));
  });
  it('returns false for casual chat', () => {
    falsy(wantsStructuredTable('Bạn có khỏe không?'));
    falsy(wantsStructuredTable('Hôm nay trời đẹp'));
  });
});

describe('wantsIdentity / wantsCalories / wantsImageContext', () => {
  it('identity', () => {
    truthy(wantsIdentity('Đây là gì?'));
    truthy(wantsIdentity('what is this dish'));
    truthy(wantsIdentity('Món gì vậy?'));
    falsy(wantsIdentity('Ăn ngon không?'));
  });
  it('calories', () => {
    truthy(wantsCalories('bao nhiêu calo'));
    truthy(wantsCalories('500 kcal có nhiều không?'));
    truthy(wantsCalories('Macro của món này'));
    truthy(wantsCalories('What is the nutrition?'));
    falsy(wantsCalories('thời tiết hôm nay'));
  });
  it('image context (combines identity, calories, deictic)', () => {
    truthy(wantsImageContext('Món này có gì?'));
    truthy(wantsImageContext('Trong ảnh là gì?'));
    truthy(wantsImageContext('this looks tasty'));
    truthy(wantsImageContext('Cho biết calo trong hình'));
    falsy(wantsImageContext('Kế hoạch ngày mai làm gì?'));
  });
});

describe('escapeMarkdownCell', () => {
  it('escapes pipes', () => eq(escapeMarkdownCell('protein|fat'), 'protein\\|fat'));
  it('replaces newlines with semicolons', () => eq(escapeMarkdownCell('line1\nline2'), 'line1; line2'));
  it('replaces CRLF newlines', () => eq(escapeMarkdownCell('a\r\nb'), 'a; b'));
  it('null becomes "Chưa rõ"', () => eq(escapeMarkdownCell(null), 'Chưa rõ'));
  it('undefined becomes "Chưa rõ"', () => eq(escapeMarkdownCell(undefined), 'Chưa rõ'));
  it('trims surrounding whitespace', () => eq(escapeMarkdownCell('  trim me  '), 'trim me'));
  it('handles numbers', () => eq(escapeMarkdownCell(42), '42'));
});

describe('markdownTable', () => {
  it('builds a 2-column table', () => {
    const md = markdownTable(['A', 'B'], [['1', '2'], ['x', 'y']]);
    eq(md, '| A | B |\n| --- | --- |\n| 1 | 2 |\n| x | y |');
  });
  it('filters fully-empty rows', () => {
    const md = markdownTable(['A', 'B'], [['', ''], ['1', '2']]);
    eq(md, '| A | B |\n| --- | --- |\n| 1 | 2 |');
  });
  it('keeps rows where at least one cell is non-empty (empty cells stay blank)', () => {
    // Note: escapeMarkdownCell only substitutes 'Chưa rõ' for null/undefined,
    // not for empty strings — so a partially-empty row renders with a blank cell.
    const md = markdownTable(['A', 'B'], [['', '2']]);
    eq(md, '| A | B |\n| --- | --- |\n|  | 2 |');
  });
  it('null cells render as "Chưa rõ"', () => {
    const md = markdownTable(['A', 'B'], [[null, '2']]);
    eq(md, '| A | B |\n| --- | --- |\n| Chưa rõ | 2 |');
  });
});

describe('formatMetric', () => {
  it('rounds large values to integer', () => eq(formatMetric(123.456, 'kcal'), '123 kcal'));
  it('keeps 1 decimal for small values', () => eq(formatMetric(5.66, 'g'), '5.7 g'));
  it('keeps 1 decimal for negative small values', () => eq(formatMetric(-50.5, 'kg'), '-50.5 kg'));
  it('handles zero', () => eq(formatMetric(0, 'g'), '0 g'));
  it('null gives placeholder', () => eq(formatMetric(null, 'g'), 'Chưa đủ dữ liệu'));
  it('NaN gives placeholder', () => eq(formatMetric(NaN, 'g'), 'Chưa đủ dữ liệu'));
  it('undefined gives placeholder', () => eq(formatMetric(undefined, 'g'), 'Chưa đủ dữ liệu'));
});

describe('formatConfidence', () => {
  it('keeps 0..1 fractional unchanged', () => eq(formatConfidence(0.85), '85%'));
  it('treats > 1 as percent and rescales', () => eq(formatConfidence(85), '85%'));
  it('rounds to integer percent', () => eq(formatConfidence(0.823), '82%'));
  it('null returns null', () => eq(formatConfidence(null), null));
  it('NaN returns null', () => eq(formatConfidence(NaN), null));
});

describe('toNumber', () => {
  it('passes through finite numbers', () => eq(toNumber(5), 5));
  it('rejects NaN', () => eq(toNumber(NaN), null));
  it('parses numeric strings', () => eq(toNumber('5.5'), 5.5));
  it('extracts the first number from a sentence', () => eq(toNumber('about 200 kcal'), 200));
  it('extracts negative numbers', () => eq(toNumber('lost -2.5 kg'), -2.5));
  it('returns null for non-numeric strings', () => eq(toNumber('no number'), null));
  it('returns null for null/undefined', () => {
    eq(toNumber(null), null);
    eq(toNumber(undefined), null);
  });
});

describe('cleanDishName', () => {
  it('trims and returns valid name', () => eq(cleanDishName('  Phở bò  '), 'Phở bò'));
  it('null returns null', () => eq(cleanDishName(null), null));
  it('whitespace-only returns null', () => eq(cleanDishName('   '), null));
  it('"unknown" (any case) returns null', () => {
    eq(cleanDishName('unknown'), null);
    eq(cleanDishName('UNKNOWN'), null);
    eq(cleanDishName('  Unknown  '), null);
  });
});

describe('parseImageDataUrl', () => {
  // 1x1 transparent PNG (lazily known base64)
  const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=';
  it('parses a valid PNG data URL', () => {
    const r = parseImageDataUrl(tinyPng);
    eq(r.mime, 'image/png');
    truthy(r.bytes.byteLength > 0);
  });
  it('parses jpg + jpeg + webp', () => {
    eq(parseImageDataUrl('data:image/jpg;base64,/9j/4AAQ').mime, 'image/jpg');
    eq(parseImageDataUrl('data:image/jpeg;base64,/9j/4AAQ').mime, 'image/jpeg');
    eq(parseImageDataUrl('data:image/webp;base64,UklGRg==').mime, 'image/webp');
  });
  it('rejects unsupported MIME (gif)', () => {
    throws(() => parseImageDataUrl('data:image/gif;base64,R0lGODlh'), 'INVALID_IMAGE');
  });
  it('rejects http URL', () => {
    throws(() => parseImageDataUrl('http://example.com/img.png'), 'INVALID_IMAGE');
  });
  it('rejects malformed base64 chars', () => {
    throws(() => parseImageDataUrl('data:image/png;base64,###not-base64###'), 'INVALID_IMAGE');
  });
});

describe('normalizeImageUrl', () => {
  const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=';
  it('returns null for empty / undefined', () => {
    eq(normalizeImageUrl(undefined), null);
    eq(normalizeImageUrl(null), null);
    eq(normalizeImageUrl(''), null);
    eq(normalizeImageUrl('   '), null);
  });
  it('returns the URL string for valid PNG', () => {
    eq(normalizeImageUrl(tinyPng), tinyPng);
  });
  it('rejects unsupported MIME', () => {
    throws(() => normalizeImageUrl('data:image/gif;base64,abc'), 'INVALID_IMAGE');
  });
  it('rejects oversized URL', () => {
    const longB64 = 'A'.repeat(MAX_IMAGE_DATA_URL_LENGTH + 10);
    throws(() => normalizeImageUrl(`data:image/png;base64,${longB64}`), 'IMAGE_TOO_LARGE');
  });
});

describe('parseThinkingSteps', () => {
  it('null/undefined/"" → undefined', () => {
    eq(parseThinkingSteps(null), undefined);
    eq(parseThinkingSteps(undefined), undefined);
    eq(parseThinkingSteps(''), undefined);
  });
  it('passes through arrays unchanged', () => {
    const arr = [{ step: 1, title: 't', text: 'x' }];
    eq(parseThinkingSteps(arr), arr);
  });
  it('parses JSON array string', () => {
    eq(parseThinkingSteps('[{"step":1}]'), [{ step: 1 }]);
  });
  it('returns undefined for JSON object (not array)', () => {
    eq(parseThinkingSteps('{"x":1}'), undefined);
  });
  it('returns undefined for invalid JSON', () => {
    eq(parseThinkingSteps('not json'), undefined);
  });
});

describe('parseFoodInsight', () => {
  it('null → undefined', () => eq(parseFoodInsight(null), undefined));
  it('object passthrough', () => {
    const v = { dishName: 'phở', calories: 500 };
    eq(parseFoodInsight(v), v);
  });
  it('JSON string parsed', () => {
    eq(parseFoodInsight('{"dishName":"phở","calories":500}'), { dishName: 'phở', calories: 500 });
  });
  it('invalid JSON → undefined', () => {
    eq(parseFoodInsight('not json'), undefined);
  });
});

describe('formatCalAiResponse', () => {
  it('null/non-object → null', () => {
    eq(formatCalAiResponse(null), null);
    eq(formatCalAiResponse('hello'), null);
    eq(formatCalAiResponse(42), null);
  });
  it('answer field wins over content/explanation', () => {
    eq(formatCalAiResponse({ answer: 'A', content: 'B', explanation: 'C' }), 'A');
  });
  it('falls back to content', () => {
    eq(formatCalAiResponse({ content: 'B', explanation: 'C' }), 'B');
  });
  it('falls back to explanation', () => {
    eq(formatCalAiResponse({ explanation: 'C' }), 'C');
  });
  it('whitespace-only answer is ignored', () => {
    eq(formatCalAiResponse({ answer: '   ', content: 'B' }), 'B');
  });
  it('renders preview from data array', () => {
    const out = formatCalAiResponse({ data: [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }] });
    truthy(out && out.startsWith('I found these nutrition records:'));
    truthy(out && out.includes('1. {"a":1}'));
    truthy(out && out.includes('3. {"a":3}'));
    falsy(out && out.includes('4. {"a":4}'));   // sliced to 3
  });
  it('empty object → null', () => eq(formatCalAiResponse({}), null));
});

describe('buildChatContextText', () => {
  it('empty history → ""', () => eq(buildChatContextText([], 'hello'), ''));
  it('formats each line with role label', () => {
    const out = buildChatContextText([
      { sender: 'user', message: 'Xin chào', imageName: null },
      { sender: 'ai',   message: 'Chào bạn!', imageName: null },
    ], 'tiếp');
    eq(out, 'User: Xin chào\nAssistant: Chào bạn!');
  });
  it('includes image label when imageName present', () => {
    const out = buildChatContextText([
      { sender: 'user', message: 'Đây là gì?', imageName: 'pho.jpg' },
    ], 'next');
    eq(out, 'User [ảnh: pho.jpg]: Đây là gì?');
  });
  it('drops trailing user message that equals current message (echo guard)', () => {
    const out = buildChatContextText([
      { sender: 'ai', message: 'Trước đó', imageName: null },
      { sender: 'user', message: 'tóm lại đi', imageName: null },
    ], 'tóm lại đi');
    eq(out, 'Assistant: Trước đó');
  });
  it('keeps last 8 entries only', () => {
    const history = [];
    for (let i = 0; i < 12; i++) {
      history.push({ sender: 'user', message: `m${i}`, imageName: null });
    }
    const out = buildChatContextText(history, 'current');
    const lines = out.split('\n');
    eq(lines.length, 8);
    eq(lines[0], 'User: m4');
    eq(lines[7], 'User: m11');
  });
  it('clips message body at 420 chars', () => {
    const long = 'x'.repeat(500);
    const out = buildChatContextText([
      { sender: 'ai', message: long, imageName: null },
    ], 'next');
    // Format: "Assistant: " + first 420 chars
    eq(out.length, 'Assistant: '.length + 420);
  });
});

describe('riskFlagsToText', () => {
  it('non-array returns []', () => eq(riskFlagsToText(null), []));
  it('passes string entries through (trimmed)', () => {
    eq(riskFlagsToText(['  high sodium  ', 'too oily']), ['high sodium', 'too oily']);
  });
  it('builds "risk: mức severity: reason" for object entries', () => {
    eq(
      riskFlagsToText([{ risk: 'sodium', severity: 'high', reason: 'too salty' }]),
      ['sodium: mức high: too salty']
    );
  });
  it('omits empty parts', () => {
    eq(riskFlagsToText([{ risk: 'sodium', severity: '', reason: '' }]), ['sodium']);
  });
  it('drops null/empty entries', () => {
    eq(riskFlagsToText([null, '', 'ok', { risk: '', severity: '', reason: '' }]), ['ok']);
  });
});

describe('parseSessionId (controller)', () => {
  it('positive integer string → number', () => eq(parseSessionId('5'), 5));
  it('positive integer → number', () => eq(parseSessionId(5), 5));
  it('zero → null', () => eq(parseSessionId('0'), null));
  it('negative → null', () => eq(parseSessionId('-3'), null));
  it('non-integer → null', () => eq(parseSessionId('5.5'), null));
  it('non-numeric → null', () => eq(parseSessionId('abc'), null));
  it('null/undefined → null', () => {
    eq(parseSessionId(null), null);
    eq(parseSessionId(undefined), null);
  });
});

describe('handleChatErrorStatus mapping', () => {
  it('maps known errors', () => {
    eq(handleChatErrorStatus('USER_NOT_FOUND'), 404);
    eq(handleChatErrorStatus('CHAT_SESSION_NOT_FOUND'), 404);
    eq(handleChatErrorStatus('CHAT_MESSAGE_NOT_FOUND'), 404);
    eq(handleChatErrorStatus('EMPTY_MESSAGE'), 400);
    eq(handleChatErrorStatus('INVALID_IMAGE'), 400);
    eq(handleChatErrorStatus('IMAGE_TOO_LARGE'), 413);
  });
  it('maps unknown error to 500', () => {
    eq(handleChatErrorStatus('SOMETHING_WEIRD'), 500);
    eq(handleChatErrorStatus(''), 500);
  });
});

// =============================================================================
//  Integrated controller-style scenarios — body validation in sendChatMessage
// =============================================================================

const validateSendChatMessageBody = (body) => {
  const { message, sessionId, imageUrl } = body;
  const hasMessage = typeof message === 'string' && message.trim().length > 0;
  const hasImage = typeof imageUrl === 'string' && imageUrl.trim().length > 0;
  if (!hasMessage && !hasImage) return { ok: false, status: 400, message: 'EMPTY_MESSAGE' };

  const parsedSessionId = sessionId === undefined || sessionId === null ? null : parseSessionId(sessionId);
  if (sessionId !== undefined && sessionId !== null && !parsedSessionId) {
    return { ok: false, status: 400, message: 'INVALID_SESSION_ID' };
  }
  return { ok: true, parsedSessionId };
};

describe('sendChatMessage body validation', () => {
  it('rejects when both message and image missing', () => {
    eq(validateSendChatMessageBody({}).message, 'EMPTY_MESSAGE');
    eq(validateSendChatMessageBody({ message: '' }).message, 'EMPTY_MESSAGE');
    eq(validateSendChatMessageBody({ message: '   ' }).message, 'EMPTY_MESSAGE');
    eq(validateSendChatMessageBody({ imageUrl: '' }).message, 'EMPTY_MESSAGE');
  });
  it('accepts message only', () => {
    const r = validateSendChatMessageBody({ message: 'hi' });
    truthy(r.ok);
    eq(r.parsedSessionId, null);
  });
  it('accepts image only', () => {
    const r = validateSendChatMessageBody({ imageUrl: 'data:image/png;base64,abc' });
    truthy(r.ok);
  });
  it('accepts existing session id', () => {
    const r = validateSendChatMessageBody({ message: 'hi', sessionId: 7 });
    truthy(r.ok);
    eq(r.parsedSessionId, 7);
  });
  it('rejects invalid session id (negative)', () => {
    eq(validateSendChatMessageBody({ message: 'hi', sessionId: -1 }).message, 'INVALID_SESSION_ID');
  });
  it('rejects invalid session id (non-numeric)', () => {
    eq(validateSendChatMessageBody({ message: 'hi', sessionId: 'abc' }).message, 'INVALID_SESSION_ID');
  });
  it('treats sessionId === null as new session', () => {
    const r = validateSendChatMessageBody({ message: 'hi', sessionId: null });
    truthy(r.ok);
    eq(r.parsedSessionId, null);
  });
});

// =============================================================================
//  Summary
// =============================================================================

console.log('\n==============================');
console.log(`PASS: ${passed}    FAIL: ${failed}`);
if (failed > 0) {
  console.log('\nFailures:');
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.name}\n     ${f.msg.replace(/\n/g, '\n     ')}`));
  process.exitCode = 1;
} else {
  console.log('All scenarios passed.');
}
