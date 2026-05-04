import pool from '../../shared/database/db';

interface UserRow {
  user_id: number;
}

type ThinkingStatus = 'done' | 'skipped' | 'warning';

interface ThinkingStep {
  step: number;
  title: string;
  text: string;
  detail?: string;
  status?: ThinkingStatus;
  evidence?: string[];
}

interface ChatMessageRow {
  message_id: number;
  sender: 'user' | 'ai';
  message_text: string | null;
  image_url: string | null;
  image_name: string | null;
  thinking_steps: string | ThinkingStep[] | null;
  created_at: string;
}

interface ChatSessionRow {
  session_id: number;
  started_at: string;
  last_message: string | null;
}

interface ChatContextMessage {
  sender: 'user' | 'ai';
  message: string;
  imageName: string | null;
}

interface ChatRuntimeContext {
  sessionId: number;
  history: ChatContextMessage[];
  contextText: string;
  isFollowUp: boolean;
}

interface SendMessagePayload {
  message?: string;
  sessionId?: number | null;
  imageUrl?: string | null;
  imageName?: string | null;
  contextImageUrl?: string | null;
  contextImageName?: string | null;
}

interface CalAiQueryResult {
  answer: string;
  intent?: string;
  trace?: ThinkingStep[];
  citations?: Array<Record<string, unknown>>;
}

type CalAiFailureReason = 'unreachable' | 'timeout' | 'http' | 'empty' | 'fetch_error';

interface CalAiFailure {
  ok: false;
  reason: CalAiFailureReason;
  detail?: string;
}

type CalAiOutcome = (CalAiQueryResult & { ok: true }) | CalAiFailure;

const MAX_IMAGE_DATA_URL_LENGTH = Number(process.env.MAX_IMAGE_DATA_URL_LENGTH || 3_500_000);

interface ImageData {
  mime: string;
  base64: string;
  bytes: ArrayBuffer;
}

interface FoodImageInsight {
  answer?: string | null;
  dishName: string | null;
  confidence: number | null;
  description: string | null;
  ingredients: string[];
  portion: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber?: number | null;
  sugar?: number | null;
  sodiumMg?: number | null;
  imageObservations?: string[];
  evidence?: string[];
  dietaryStrengths?: string[];
  dietaryConcerns?: string[];
  riskFlags?: string[];
  recommendations?: string[];
  uncertaintyReasons?: string[];
  followUpQuestions?: string[];
  tableRows?: Array<Record<string, unknown>>;
  imageQuality?: Record<string, unknown>;
  source: 'cal-ai';
}

const resolveUser = async (accountId?: number | null): Promise<UserRow> => {
  if (!accountId) {
    throw new Error('USER_NOT_FOUND');
  }

  const [rows] = await pool.query(
    'SELECT user_id FROM users WHERE account_id = ? LIMIT 1',
    [accountId]
  );

  const user = (rows as UserRow[])[0];
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  return user;
};

const parseThinkingSteps = (value: ChatMessageRow['thinking_steps']) => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const mapMessage = (row: ChatMessageRow) => ({
  messageId: row.message_id,
  sender: row.sender,
  message: row.message_text ?? '',
  imageUrl: row.image_url ?? null,
  imageName: row.image_name ?? null,
  thinkingSteps: parseThinkingSteps(row.thinking_steps),
  createdAt: row.created_at,
});

const verifySessionOwner = async (userId: number, sessionId: number) => {
  const [rows] = await pool.query(
    'SELECT session_id FROM chatsessions WHERE session_id = ? AND user_id = ? LIMIT 1',
    [sessionId, userId]
  );

  return (rows as Array<{ session_id: number }>)[0] ?? null;
};

const createSession = async (userId: number) => {
  const [insertResult] = await pool.query(
    'INSERT INTO chatsessions (user_id) VALUES (?)',
    [userId]
  );

  return (insertResult as { insertId: number }).insertId;
};

const getLatestSessionImage = async (sessionId: number) => {
  const [rows] = await pool.query(
    `
      SELECT image_url, image_name
      FROM chatmessages
      WHERE session_id = ?
        AND image_url IS NOT NULL
      ORDER BY created_at DESC, message_id DESC
      LIMIT 1
    `,
    [sessionId]
  );

  return (rows as Array<{ image_url: string | null; image_name: string | null }>)[0] ?? null;
};

const getRecentChatContext = async (sessionId: number, limit = 10): Promise<ChatContextMessage[]> => {
  const safeLimit = Math.max(2, Math.min(12, limit));
  const [rows] = await pool.query(
    `
      SELECT sender, message_text, image_name
      FROM chatmessages
      WHERE session_id = ?
      ORDER BY created_at DESC, message_id DESC
      LIMIT ?
    `,
    [sessionId, safeLimit]
  );

  return (rows as Array<{ sender: 'user' | 'ai'; message_text: string | null; image_name: string | null }>)
    .reverse()
    .map(row => ({
      sender: row.sender,
      message: (row.message_text ?? '').trim(),
      imageName: row.image_name ?? null,
    }))
    .filter(item => item.message || item.imageName);
};

const isFollowUpMessage = (message: string) => {
  const normalized = stripAccents(message);
  if (normalized.length <= 28) return true;

  return [
    'mon nay',
    'mon do',
    'cai nay',
    'cai do',
    'no ',
    'nay ',
    'do ',
    'tiep',
    'tinh tiep',
    'vay con',
    'vay ',
    'nhu vay',
    'luong dinh duong',
    'can nang hien tai',
    'tang bao nhieu',
    'giam bao nhieu',
    'con no',
    'so sanh voi',
    'them',
    'bot',
    'doi sang',
    'nhu tren',
    'ban vua noi',
    'that meal',
    'this meal',
    'it ',
    'that ',
    'this ',
  ].some(keyword => normalized.includes(keyword));
};

const buildChatContextText = (history: ChatContextMessage[], currentMessage: string) => {
  const current = currentMessage.trim();
  const previous = history
    .filter((item, index) => {
      const isLast = index === history.length - 1;
      return !(isLast && item.sender === 'user' && item.message.trim() === current);
    })
    .slice(-8);

  if (previous.length === 0) return '';

  return previous
    .map(item => {
      const label = item.sender === 'user' ? 'User' : 'Assistant';
      const imagePart = item.imageName ? ` [ảnh: ${item.imageName}]` : '';
      return `${label}${imagePart}: ${item.message.slice(0, 420)}`;
    })
    .join('\n');
};

const withTimeout = async <T>(promiseFactory: (signal: AbortSignal) => Promise<T>, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await promiseFactory(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
};

const parseImageDataUrl = (imageUrl: string): ImageData => {
  const match = imageUrl.match(/^data:(image\/(?:png|jpe?g|webp));base64,([a-z0-9+/=]+)$/i);
  if (!match) {
    throw new Error('INVALID_IMAGE');
  }

  const buffer = Buffer.from(match[2], 'base64');
  const bytes = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(bytes).set(buffer);

  return {
    mime: match[1].toLowerCase(),
    base64: match[2],
    bytes,
  };
};

const formatCalAiResponse = (data: unknown) => {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;

  if (typeof record.answer === 'string' && record.answer.trim()) return record.answer.trim();
  if (typeof record.content === 'string' && record.content.trim()) return record.content.trim();
  if (typeof record.explanation === 'string' && record.explanation.trim()) return record.explanation.trim();

  if (Array.isArray(record.data) && record.data.length > 0) {
    const preview = record.data
      .slice(0, 3)
      .map((item, index) => `${index + 1}. ${JSON.stringify(item)}`)
      .join('\n');
    return `I found these nutrition records:\n${preview}`;
  }

  return null;
};

const normalizeThinkingStatus = (value: unknown): ThinkingStatus => (
  value === 'skipped' || value === 'warning' ? value : 'done'
);

const normalizeCalAiTrace = (value: unknown): ThinkingStep[] => {
  if (!Array.isArray(value)) return [];

  const steps: ThinkingStep[] = [];

  value.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const record = item as Record<string, unknown>;
    const title = typeof record.title === 'string' && record.title.trim()
      ? record.title.trim()
      : `Cal-AI step ${index + 1}`;
    const text = typeof record.text === 'string' && record.text.trim()
      ? record.text.trim()
      : 'Cal-AI đã xử lý bước này.';
    const evidence = Array.isArray(record.evidence)
      ? record.evidence
          .map(entry => String(entry ?? '').trim())
          .filter(Boolean)
          .slice(0, 6)
      : undefined;

    steps.push({
      step: steps.length + 1,
      title,
      text,
      status: normalizeThinkingStatus(record.status),
      detail: typeof record.detail === 'string' ? record.detail : undefined,
      evidence,
    });
  });

  return steps;
};

const formatCalAiResult = (data: unknown): CalAiQueryResult | null => {
  const answer = formatCalAiResponse(data);
  if (!answer) return null;

  const record = data && typeof data === 'object'
    ? data as Record<string, unknown>
    : {};
  const citations = Array.isArray(record.citations)
    ? record.citations.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : undefined;

  return {
    answer,
    intent: typeof record.intent === 'string' ? record.intent : undefined,
    trace: normalizeCalAiTrace(record.trace),
    citations,
  };
};

const stripAccents = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const wantsChart = (message: string) => {
  const normalized = stripAccents(message);
  return [
    'bieu do',
    'do thi',
    'chart',
    'graph',
    'visualize',
    'visualise',
  ].some(keyword => normalized.includes(keyword));
};

const wantsStructuredTable = (message: string) => {
  const normalized = stripAccents(message);
  return wantsChart(message)
    || [
      'bang',
      'table',
      'so sanh',
      'compare',
      'comparison',
      ' vs ',
      'versus',
      'liet ke',
      'danh sach',
      'list',
      'ke hoach',
      'plan',
      'thuc don',
      'meal plan',
      'so lieu',
      'du lieu',
      'metric',
      'thong ke',
      'rank',
      'xep hang',
      'calo',
      'kcal',
      'calorie',
      'macro',
      'protein',
      'carb',
      'fat',
      'fiber',
      'chat xo',
      'duong',
      'sodium',
      'natri',
      'dinh duong',
      'nutrition',
      'uoc tinh',
      'estimate',
      'kg',
      'tang bao nhieu',
      'giam bao nhieu',
      'tdee',
      'bmr',
      'can nang',
      'surplus',
      'deficit',
    ].some(keyword => normalized.includes(keyword));
};

const escapeMarkdownCell = (value: unknown) =>
  String(value ?? 'Chưa rõ')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '; ')
    .trim();

const markdownTable = (headers: string[], rows: Array<Array<unknown>>) => {
  const headerLine = `| ${headers.map(escapeMarkdownCell).join(' | ')} |`;
  const dividerLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows
    .filter(row => row.some(cell => String(cell ?? '').trim().length > 0))
    .map(row => `| ${row.map(escapeMarkdownCell).join(' | ')} |`);
  return [headerLine, dividerLine, ...body].join('\n');
};

const formatMetric = (value: number | null | undefined, unit: string) => {
  if (value == null || !Number.isFinite(value)) return 'Chưa đủ dữ liệu';
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${unit}`;
};

const formatConfidence = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return null;
  const normalized = value > 1 ? value / 100 : value;
  return `${Math.round(normalized * 100)}%`;
};

const addThinkingStep = (
  steps: ThinkingStep[],
  title: string,
  text: string,
  options: Omit<Partial<ThinkingStep>, 'step' | 'title' | 'text'> = {}
) => {
  steps.push({
    step: steps.length + 1,
    title,
    text,
    status: options.status ?? 'done',
    detail: options.detail,
    evidence: options.evidence,
  });
};

interface UserProfile {
  gender?: string | null;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  dailyCalories?: number | null;
  targetWeight?: number | null;
  goal?: string | null;
  activityLevel?: string | null;
}

const fetchUserProfile = async (accountId?: number | null): Promise<UserProfile | null> => {
  if (!accountId) return null;

  try {
    const [userRows] = await pool.query(
      'SELECT gender, age, height, weight FROM users WHERE account_id = ? AND has_completed_setup = 1 LIMIT 1',
      [accountId]
    );
    const user = (userRows as Array<Record<string, unknown>>)[0];
    if (!user) return null;

    const [goalRows] = await pool.query(
      `SELECT target_calories, target_weight, goal_type, activity_level
       FROM usergoals WHERE user_id = (SELECT user_id FROM users WHERE account_id = ? LIMIT 1) LIMIT 1`,
      [accountId]
    );
    const goal = (goalRows as Array<Record<string, unknown>>)[0];

    return {
      gender: user.gender as string | null,
      age: user.age as number | null,
      height: user.height as number | null,
      weight: user.weight as number | null,
      dailyCalories: goal?.target_calories as number | null ?? null,
      targetWeight: goal?.target_weight as number | null ?? null,
      goal: goal?.goal_type as string | null ?? null,
      activityLevel: goal?.activity_level as string | null ?? null,
    };
  } catch {
    return null;
  }
};

const hasProfileData = (profile: UserProfile | null | undefined): boolean => {
  if (!profile) return false;
  return [profile.gender, profile.age, profile.height, profile.weight]
    .some(value => value != null && value !== '');
};

const askCalAi = async (
  message: string,
  runtimeContext?: ChatRuntimeContext | null,
  userProfile?: UserProfile | null
): Promise<CalAiOutcome> => {
  const baseUrl = (process.env.CAL_AI_BASE_URL || '').replace(/\/+$/, '');
  if (!baseUrl) return { ok: false, reason: 'unreachable', detail: 'CAL_AI_BASE_URL chưa được cấu hình.' };
  const timeoutMs = Number(process.env.CAL_AI_QUERY_TIMEOUT_MS || 180000);

  try {
    return await withTimeout<CalAiOutcome>(async signal => {
      const response = await fetch(`${baseUrl}/api/agent/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          question: message,
          top_k: 6,
          session_id: runtimeContext ? String(runtimeContext.sessionId) : undefined,
          conversation_context: runtimeContext?.contextText || undefined,
          is_follow_up: runtimeContext?.isFollowUp || undefined,
          user_profile: hasProfileData(userProfile) ? userProfile : undefined,
        }),
      });
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        console.warn(`[ChatText] Cal-AI query failed with HTTP ${response.status}: ${errorBody.slice(0, 500)}`);
        return { ok: false, reason: 'http', detail: `HTTP ${response.status}` };
      }
      const parsed = formatCalAiResult(await response.json());
      if (!parsed) return { ok: false, reason: 'empty' };
      return { ok: true, ...parsed };
    }, timeoutMs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isTimeout = error instanceof Error && (error.name === 'AbortError' || message.includes('aborted'));
    if (isTimeout) {
      console.warn(`[ChatText] Cal-AI query timed out after ${timeoutMs}ms`);
      return { ok: false, reason: 'timeout', detail: `Quá ${Math.round(timeoutMs / 1000)}s` };
    }
    console.warn('[ChatText] Cal-AI query unavailable:', message);
    return { ok: false, reason: 'fetch_error', detail: message };
  }
};

const normalizeImageUrl = (imageUrl?: string | null) => {
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

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const match = value.match(/-?\d+(?:\.\d+)?/);
    if (match) return Number(match[0]);
  }
  return null;
};

const toRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
);

const toStringArray = (value: unknown) => (
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
);

const toRecordArray = (value: unknown) => (
  Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => item != null && typeof item === 'object' && !Array.isArray(item))
    : []
);

const riskFlagsToText = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value
    .map(item => {
      if (typeof item === 'string') return item.trim();
      if (!item || typeof item !== 'object' || Array.isArray(item)) return '';

      const record = item as Record<string, unknown>;
      const risk = typeof record.risk === 'string' ? record.risk.trim() : '';
      const severity = typeof record.severity === 'string' ? record.severity.trim() : '';
      const reason = typeof record.reason === 'string' ? record.reason.trim() : '';

      return [
        risk,
        severity ? `mức ${severity}` : '',
        reason,
      ].filter(Boolean).join(': ');
    })
    .filter(Boolean);
};

const collectRecommendations = (value: unknown) => {
  const record = toRecord(value);
  return [
    ...toStringArray(record.healthier_adjustments),
    ...toStringArray(record.for_weight_loss),
    ...toStringArray(record.for_muscle_gain),
    ...toStringArray(record.for_blood_sugar),
    ...toStringArray(record.for_heart_health),
  ].slice(0, 8);
};

const cleanDishName = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === 'unknown') return null;
  return trimmed;
};

const extractNutrition = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return { calories: null, protein: null, carbs: null, fat: null };
  }

  const record = value as Record<string, unknown>;
  return {
    calories: toNumber(record.calories ?? record.kcal ?? record.energy_kcal),
    protein: toNumber(record.protein ?? record.proteins),
    carbs: toNumber(record.carbs ?? record.carbohydrates ?? record.carbohydrate),
    fat: toNumber(record.fat ?? record.fats ?? record.total_fat),
  };
};

const parseCalAiFoodInsight = (data: unknown): FoodImageInsight | null => {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const summary = record.nutrition_summary && typeof record.nutrition_summary === 'object'
    ? record.nutrition_summary as Record<string, unknown>
    : {};
  const estimateRecord = toRecord(summary.estimated_visible_portion ?? record.estimated_nutrition);
  const estimated = extractNutrition(estimateRecord);
  const visionDetail = record.vision_detail && typeof record.vision_detail === 'object'
    ? record.vision_detail as Record<string, unknown>
    : {};
  const vitCnn = toRecord(visionDetail.vit_cnn_analysis);
  const vitPredictions = Array.isArray(vitCnn.top_predictions) ? vitCnn.top_predictions : [];
  const dietaryAssessment = toRecord(visionDetail.dietary_assessment);
  const uncertainty = toRecord(visionDetail.uncertainty);

  const dishName = cleanDishName(record.dish_name as string | null)
    ?? (vitPredictions.length > 0 ? cleanDishName(String((vitPredictions[0] as Record<string, unknown>)?.name ?? '')) : null);

  const hasAnswer = typeof record.answer === 'string' && record.answer.trim();
  if (!dishName && !hasAnswer) return null;

  return {
    answer: hasAnswer ? (record.answer as string).trim() : null,
    dishName: dishName ?? 'Unidentified food',
    confidence: toNumber(record.confidence),
    description: typeof visionDetail.description === 'string' ? visionDetail.description : null,
    ingredients: toStringArray(visionDetail.ingredients),
    portion: typeof visionDetail.portion_description === 'string'
      ? visionDetail.portion_description
      : (typeof (summary.estimated_visible_portion as Record<string, unknown> | undefined)?.serving_size === 'string'
          ? (summary.estimated_visible_portion as Record<string, unknown>).serving_size as string
          : null),
    fiber: toNumber(estimateRecord.fiber),
    sugar: toNumber(estimateRecord.sugar),
    sodiumMg: toNumber(estimateRecord.sodium_mg ?? estimateRecord.sodiumMg),
    imageObservations: toStringArray(visionDetail.image_observations),
    evidence: toStringArray(visionDetail.identification_evidence),
    dietaryStrengths: toStringArray(dietaryAssessment.strengths),
    dietaryConcerns: toStringArray(dietaryAssessment.concerns),
    riskFlags: riskFlagsToText(visionDetail.risk_flags),
    recommendations: collectRecommendations(visionDetail.recommendations),
    uncertaintyReasons: toStringArray(uncertainty.reasons),
    followUpQuestions: toStringArray(uncertainty.needs_user_input),
    tableRows: toRecordArray(visionDetail.table_rows),
    imageQuality: toRecord(visionDetail.image_quality),
    ...estimated,
    source: 'cal-ai',
  };
};

const askCalAiFoodImage = async (imageUrl: string, imageName?: string | null, question?: string) => {
  const baseUrl = (process.env.CAL_AI_BASE_URL || '').replace(/\/+$/, '');
  if (!baseUrl) return null;
  const timeoutMs = Number(process.env.CAL_AI_VISION_TIMEOUT_MS || 150000);

  try {
    const image = parseImageDataUrl(imageUrl);
    return await withTimeout(async signal => {
      const form = new FormData();
      const filename = imageName?.trim() || `chat-upload.${image.mime.split('/')[1] || 'jpg'}`;
      form.append('file', new Blob([image.bytes], { type: image.mime }), filename);
      if (question?.trim()) {
        form.append('question', question.trim());
      }

      const response = await fetch(`${baseUrl}/api/food/analyze`, {
        method: 'POST',
        body: form,
        signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        console.warn(`[ChatVision] Cal-AI image analyze failed with HTTP ${response.status}: ${errorBody.slice(0, 500)}`);
        return null;
      }
      return parseCalAiFoodInsight(await response.json());
    }, timeoutMs);
  } catch (error) {
    const isTimeout = error instanceof Error && (
      error.name === 'AbortError' || error.message.includes('aborted')
    );
    if (isTimeout) {
      console.warn(`[ChatVision] Cal-AI image analyze timed out after ${timeoutMs}ms. Consider increasing CAL_AI_VISION_TIMEOUT_MS.`);
    } else {
      console.warn('[ChatVision] Cal-AI image analyze unavailable:', error instanceof Error ? error.message : error);
    }
    return null;
  }
};

const wantsIdentity = (message: string) => {
  const normalized = stripAccents(message);
  return normalized.includes('mon gi')
    || normalized.includes('day la gi')
    || normalized.includes('what is')
    || normalized.includes('identify')
    || normalized.includes('dish');
};

const wantsCalories = (message: string) => {
  const normalized = stripAccents(message);
  return normalized.includes('calo')
    || normalized.includes('calorie')
    || normalized.includes('kcal')
    || normalized.includes('macro')
    || normalized.includes('dinh duong')
    || normalized.includes('nutrition');
};

const wantsImageContext = (message: string) => {
  const normalized = stripAccents(message);
  return wantsIdentity(message)
    || wantsCalories(message)
    || normalized.includes('mon nay')
    || normalized.includes('mon do')
    || normalized.includes('anh nay')
    || normalized.includes('hinh nay')
    || normalized.includes('trong anh')
    || normalized.includes('trong hinh')
    || normalized.includes('no la')
    || normalized.includes('no co')
    || normalized.includes('this')
    || normalized.includes('that')
    || normalized.includes('image')
    || normalized.includes('photo');
};

const formatImageQuestionReply = (insight: FoodImageInsight | null, message: string) => {
  if (!insight?.dishName) {
    return 'Mình đã nhận được ảnh, nhưng model vision chưa xác định đủ chắc món trong ảnh. Bạn có thể gửi ảnh rõ hơn hoặc chụp gần phần món ăn chính để mình ước tính dinh dưỡng chính xác hơn.';
  }

  const confidence = formatConfidence(insight.confidence);
  const compact = (items?: string[], limit = 3) =>
    items?.map(item => item.trim()).filter(Boolean).slice(0, limit).join('; ') || 'Chưa đủ dữ liệu từ ảnh';
  const shouldUseTable = wantsStructuredTable(message)
    || wantsCalories(message)
    || insight.calories != null
    || Boolean(insight.tableRows?.length);

  if (shouldUseTable) {
    const summaryRows: Array<Array<unknown>> = [
      ['Món nhận diện', insight.dishName, confidence ? `Độ tin cậy khoảng ${confidence}` : 'Độ tin cậy chưa rõ'],
      ['Mô tả', insight.description ?? 'Chưa có mô tả chi tiết', 'Dựa trên ảnh đã gửi'],
      ['Khẩu phần', insight.portion ?? 'Chưa đủ dữ liệu', 'Ước tính theo phần nhìn thấy'],
      ['Calories', formatMetric(insight.calories, 'kcal'), 'Tổng năng lượng ước tính'],
      ['Protein', formatMetric(insight.protein, 'g'), 'Có thể lệch theo lượng thịt/cá/trứng/đậu'],
      ['Carb', formatMetric(insight.carbs, 'g'), 'Có thể lệch theo lượng cơm/bún/mì/bánh'],
      ['Fat', formatMetric(insight.fat, 'g'), 'Có thể lệch theo dầu, mỡ, sốt'],
      ['Chất xơ', formatMetric(insight.fiber, 'g'), 'Ước tính từ rau/củ/ngũ cốc'],
      ['Đường', formatMetric(insight.sugar, 'g'), 'Không tính chính xác nếu có sốt/ngọt ẩn'],
      ['Natri', formatMetric(insight.sodiumMg, 'mg'), 'Có thể cao nếu có nước dùng/nước chấm'],
    ];

    const assessmentRows: Array<Array<unknown>> = [
      ['Quan sát từ ảnh', compact(insight.imageObservations, 4)],
      ['Lý do nhận diện', compact(insight.evidence, 4)],
      ['Thành phần thấy/khả năng có', insight.ingredients.length ? insight.ingredients.slice(0, 8).join(', ') : 'Chưa đủ dữ liệu'],
      ['Điểm tốt', compact(insight.dietaryStrengths, 3)],
      ['Cần lưu ý', compact([...(insight.dietaryConcerns ?? []), ...(insight.riskFlags ?? [])], 4)],
      ['Gợi ý cải thiện', compact(insight.recommendations, 4)],
      ['Độ bất định', compact(insight.uncertaintyReasons, 3)],
    ];

    const sections = [
      `Mình nhận diện món trong ảnh có vẻ là **${insight.dishName}**.`,
      markdownTable(['Hạng mục', 'Kết quả', 'Ghi chú'], summaryRows),
      markdownTable(['Phân tích', 'Nhận xét'], assessmentRows),
    ];

    if (wantsChart(message)) {
      sections.push('Dữ liệu phù hợp nhất để vẽ biểu đồ là calories và 3 macro chính: protein, carb, fat. Nếu cần biểu đồ phần trăm macro, mình sẽ dùng ba dòng protein/carb/fat ở bảng trên.');
    }

    if (insight.followUpQuestions?.length) {
      sections.push(`Để chính xác hơn: ${insight.followUpQuestions.slice(0, 2).join('; ')}.`);
    }

    return sections.join('\n\n');
  }

  const lines: string[] = [];
  if (wantsIdentity(message)) {
    lines.push(`Món trong ảnh có vẻ là ${insight.dishName}.`);
  } else {
    lines.push(`Mình nhận diện món này là ${insight.dishName}.`);
  }

  if (insight.description) lines.push(insight.description);
  if (insight.imageObservations?.length) {
    lines.push(`Quan sát từ ảnh: ${insight.imageObservations.slice(0, 3).join('; ')}.`);
  }
  if (insight.evidence?.length) {
    lines.push(`Lý do nhận diện: ${insight.evidence.slice(0, 3).join('; ')}.`);
  }
  if (insight.ingredients.length > 0) lines.push(`Thành phần thấy được: ${insight.ingredients.slice(0, 6).join(', ')}.`);
  if (insight.portion) lines.push(`Khẩu phần ước tính: ${insight.portion}.`);

  if (wantsCalories(message) || insight.calories != null) {
    const nutritionParts = [
      insight.calories != null ? `${Math.round(insight.calories)} kcal` : null,
      insight.protein != null ? `${Math.round(insight.protein)}g protein` : null,
      insight.carbs != null ? `${Math.round(insight.carbs)}g carb` : null,
      insight.fat != null ? `${Math.round(insight.fat)}g fat` : null,
      insight.fiber != null ? `${Math.round(insight.fiber)}g fiber` : null,
      insight.sodiumMg != null ? `${Math.round(insight.sodiumMg)}mg sodium` : null,
    ].filter(Boolean);

    if (nutritionParts.length > 0) {
      lines.push(`Ước tính dinh dưỡng: ${nutritionParts.join(', ')}.`);
    }
  }

  if (insight.dietaryStrengths?.length) {
    lines.push(`Điểm tốt: ${insight.dietaryStrengths.slice(0, 3).join('; ')}.`);
  }
  if (insight.dietaryConcerns?.length) {
    lines.push(`Cần lưu ý: ${insight.dietaryConcerns.slice(0, 3).join('; ')}.`);
  }
  if (insight.riskFlags?.length) {
    lines.push(`Rủi ro dinh dưỡng: ${insight.riskFlags.slice(0, 3).join('; ')}.`);
  }
  if (insight.recommendations?.length) {
    lines.push(`Gợi ý: ${insight.recommendations.slice(0, 4).join('; ')}.`);
  }
  if (insight.uncertaintyReasons?.length) {
    lines.push(`Độ bất định: ${insight.uncertaintyReasons.slice(0, 2).join('; ')}.`);
  }
  if (insight.followUpQuestions?.length) {
    lines.push(`Để chính xác hơn: ${insight.followUpQuestions.slice(0, 2).join('; ')}.`);
  }
  if (confidence != null) lines.push(`Độ tin cậy khoảng ${confidence}.`);

  return lines.join('\n');
};

const summarizeNutritionEvidence = (insight: FoodImageInsight | null) => {
  if (!insight) return [];

  return [
    insight.dishName ? `Món: ${insight.dishName}` : null,
    insight.portion ? `Khẩu phần: ${insight.portion}` : null,
    insight.calories != null ? `Calories: ${formatMetric(insight.calories, 'kcal')}` : null,
    insight.protein != null ? `Protein: ${formatMetric(insight.protein, 'g')}` : null,
    insight.carbs != null ? `Carb: ${formatMetric(insight.carbs, 'g')}` : null,
    insight.fat != null ? `Fat: ${formatMetric(insight.fat, 'g')}` : null,
    insight.confidence != null ? `Độ tin cậy: ${formatConfidence(insight.confidence)}` : null,
  ].filter((item): item is string => Boolean(item));
};

const generateAssistantReply = async (
  accountId: number | null | undefined,
  message: string,
  imageUrl: string | null,
  imageName?: string | null,
  runtimeContext?: ChatRuntimeContext | null
) => {
  const trace: ThinkingStep[] = [];
  const tableMode = wantsStructuredTable(message);
  const hasConversationContext = Boolean(runtimeContext?.contextText);

  const userProfile = await fetchUserProfile(accountId);

  if (hasProfileData(userProfile)) {
    addThinkingStep(trace, 'Tải hồ sơ user', 'Đã lấy thông tin cá nhân từ database để cá nhân hóa câu trả lời.', {
      evidence: [
        userProfile!.gender ? `Giới tính: ${userProfile!.gender}` : '',
        userProfile!.age ? `Tuổi: ${userProfile!.age}` : '',
        userProfile!.weight ? `Cân nặng: ${userProfile!.weight} kg` : '',
        userProfile!.goal ? `Mục tiêu: ${userProfile!.goal}` : '',
      ].filter(Boolean),
    });
  }

  if (hasConversationContext) {
    addThinkingStep(trace, 'Đọc ngữ cảnh hội thoại', runtimeContext?.isFollowUp
      ? 'Câu hỏi hiện tại có dấu hiệu nối tiếp, backend đã lấy các tin nhắn trước trong cùng đoạn chat.'
      : 'Backend đã lấy ngữ cảnh gần đây để kiểm tra mức liên quan trước khi trả lời.', {
        detail: `Session ${runtimeContext?.sessionId}; ${runtimeContext?.history.length ?? 0} tin nhắn gần nhất.`,
        evidence: runtimeContext?.contextText.split('\n').slice(-4),
      });
  }

  if (imageUrl) {
    addThinkingStep(trace, 'Tiếp nhận ảnh', 'Đã nhận ảnh món ăn và câu hỏi của user.', {
      detail: imageName ? `Tên file: ${imageName}` : 'Ảnh được gửi từ khung chat hoặc ảnh gần nhất trong hội thoại.',
      evidence: [message || 'Không có ghi chú kèm ảnh'],
    });

    const calAiInsight = await askCalAiFoodImage(imageUrl, imageName, message);
    let insight = calAiInsight;

    if (calAiInsight) {
      addThinkingStep(trace, 'Chạy Cal-AI vision pipeline', 'Cal-AI đã trả về món ăn, khẩu phần và nutrition estimate.', {
        detail: 'Nguồn gồm vision model, RAG/nutrition estimate và metadata phân tích ảnh.',
        evidence: summarizeNutritionEvidence(calAiInsight).slice(0, 6),
      });
    } else {
      addThinkingStep(trace, 'Chạy Cal-AI vision pipeline', 'Cal-AI chưa trả về kết quả vision đủ dùng trong thời gian chờ.', {
        status: 'warning',
        detail: 'Không gọi model vision khác ngoài Cal-AI để giữ một nguồn xử lý thống nhất.',
      });
    }

    addThinkingStep(trace, 'Chuẩn hóa dữ liệu dinh dưỡng', insight
      ? 'Đã gom phần nhận diện món, khẩu phần, macro, rủi ro và khuyến nghị thành một insight dùng cho UI.'
      : 'Không có đủ dữ liệu để chuẩn hóa nutrition estimate.', {
        status: insight ? 'done' : 'warning',
        evidence: summarizeNutritionEvidence(insight).slice(0, 6),
      });

    addThinkingStep(trace, 'Sinh câu trả lời từ Cal-AI', insight?.answer
      ? 'Cal-AI đã trả về câu trả lời tự nhiên từ prompt vision + Agentic RAG thống nhất.'
      : 'Cal-AI chưa trả về câu trả lời tự nhiên, backend chỉ render dữ liệu cấu trúc đã có.', {
        status: insight?.answer ? 'done' : 'warning',
      });

    addThinkingStep(trace, 'Định dạng câu trả lời', tableMode || insight?.calories != null
      ? 'UI sẽ render Markdown table/rich text cho dữ liệu dinh dưỡng và đánh giá.'
      : 'UI sẽ render dạng mô tả ngắn vì câu hỏi không cần bảng.', {
        detail: insight?.source ? `Nguồn cuối cùng: ${insight.source}` : 'Không có nguồn vision đủ chắc.',
    });

    return {
      text: insight?.answer ?? formatImageQuestionReply(insight, message),
      thinkingSteps: trace,
    };
  }

  addThinkingStep(trace, 'Phân loại yêu cầu', tableMode
    ? 'Câu hỏi có dấu hiệu cần bảng, so sánh, kế hoạch, macro/calories hoặc dữ liệu dạng biểu đồ.'
    : 'Câu hỏi là tư vấn dinh dưỡng dạng hội thoại thông thường.', {
      evidence: [message],
    });

  const calAiResult = await askCalAi(message, runtimeContext, userProfile);
  if (calAiResult.ok) {
    addThinkingStep(trace, 'Truy vấn Cal-AI context', 'Cal-AI /query đã trả về câu trả lời hoặc dữ liệu liên quan.', {
      detail: 'Cal-AI là nguồn model duy nhất cho câu trả lời text.',
      evidence: [
        calAiResult.intent ? `Intent: ${calAiResult.intent}` : '',
        calAiResult.citations?.length ? `Citations: ${calAiResult.citations.length}` : '',
      ].filter(Boolean),
    });

    for (const step of (calAiResult.trace ?? []).slice(0, 8)) {
      addThinkingStep(trace, `Cal-AI: ${step.title}`, step.text, {
        status: step.status,
        detail: step.detail,
        evidence: step.evidence,
      });
    }

    addThinkingStep(trace, 'Định dạng câu trả lời', tableMode
      ? 'Cal-AI chịu trách nhiệm tạo bảng Markdown khi cần.'
      : 'UI sẽ render nội dung tư vấn dạng rich text.');

    return {
      text: calAiResult.answer,
      thinkingSteps: trace,
    };
  }

  const failureMessages: Record<CalAiFailureReason, { trace: string; user: string }> = {
    timeout: {
      trace: 'Cal-AI không trả lời kịp trong thời gian chờ (LLM chạy quá lâu). Dữ liệu Qdrant có thể vẫn đầy đủ, vấn đề là tốc độ sinh câu trả lời.',
      user: 'Mình chưa kịp trả lời vì model đang sinh câu trả lời quá lâu. Bạn hãy gửi lại câu hỏi (ngắn gọn hơn nếu có thể), hoặc tăng `CAL_AI_QUERY_TIMEOUT_MS` ở backend.',
    },
    unreachable: {
      trace: 'Backend không gọi được Cal-AI vì chưa cấu hình URL hoặc service không chạy.',
      user: 'Service Cal-AI hiện không khả dụng. Vui lòng kiểm tra Cal-AI Python server đã chạy ở đúng `CAL_AI_BASE_URL`.',
    },
    fetch_error: {
      trace: 'Backend gọi Cal-AI nhưng gặp lỗi mạng/kết nối.',
      user: 'Mình không kết nối được Cal-AI service. Hãy kiểm tra Cal-AI đang chạy và cùng máy với backend.',
    },
    http: {
      trace: 'Cal-AI trả về HTTP lỗi, không có dữ liệu để render.',
      user: 'Cal-AI trả về lỗi khi xử lý request. Hãy kiểm tra log của Cal-AI Python server.',
    },
    empty: {
      trace: 'Cal-AI trả về 200 nhưng không có nội dung answer; có thể Qdrant không có dữ liệu phù hợp với câu hỏi này.',
      user: 'Mình chưa tìm thấy dữ liệu phù hợp cho câu hỏi này. Bạn thử mô tả cụ thể tên món hoặc loại thực phẩm muốn tra cứu.',
    },
  };
  const failure = failureMessages[calAiResult.reason];

  addThinkingStep(trace, 'Truy vấn Cal-AI context', failure.trace, {
    status: 'warning',
    detail: calAiResult.detail ?? 'Không gọi model thay thế ở backend.',
  });

  addThinkingStep(trace, 'Không thể tạo câu trả lời', 'Không có câu trả lời đáng tin cậy từ pipeline Agentic RAG.', {
    status: 'warning',
  });

  return {
    text: failure.user,
    thinkingSteps: trace,
  };
};

export const getChatSessionsService = async (accountId?: number | null) => {
  const user = await resolveUser(accountId);
  const [rows] = await pool.query(
    `
      SELECT
        cs.session_id,
        cs.started_at,
        (
          SELECT cm.message_text
          FROM chatmessages cm
          WHERE cm.session_id = cs.session_id
          ORDER BY cm.created_at DESC, cm.message_id DESC
          LIMIT 1
        ) AS last_message
      FROM chatsessions cs
      WHERE cs.user_id = ?
      ORDER BY cs.started_at DESC, cs.session_id DESC
    `,
    [user.user_id]
  );

  return (rows as ChatSessionRow[]).map(row => ({
    sessionId: row.session_id,
    lastMessage: row.last_message ?? 'No messages yet',
    startedAt: row.started_at,
  }));
};

export const getChatMessagesService = async (accountId: number | null | undefined, sessionId: number) => {
  const user = await resolveUser(accountId);
  const session = await verifySessionOwner(user.user_id, sessionId);
  if (!session) {
    throw new Error('CHAT_SESSION_NOT_FOUND');
  }

  const [rows] = await pool.query(
    `
      SELECT message_id, sender, message_text, image_url, image_name, thinking_steps, created_at
      FROM chatmessages
      WHERE session_id = ?
      ORDER BY created_at ASC, message_id ASC
    `,
    [sessionId]
  );

  return (rows as ChatMessageRow[]).map(mapMessage);
};

export const deleteChatSessionService = async (accountId: number | null | undefined, sessionId: number) => {
  const user = await resolveUser(accountId);
  const session = await verifySessionOwner(user.user_id, sessionId);
  if (!session) {
    throw new Error('CHAT_SESSION_NOT_FOUND');
  }

  await pool.query('DELETE FROM chatsessions WHERE session_id = ? AND user_id = ?', [sessionId, user.user_id]);
  return { deleted: true, sessionId };
};

export const sendChatMessageService = async (
  accountId: number | null | undefined,
  { message, sessionId, imageUrl, imageName, contextImageUrl, contextImageName }: SendMessagePayload
) => {
  const user = await resolveUser(accountId);
  const trimmed = (message ?? '').trim();
  const normalizedImageUrl = normalizeImageUrl(imageUrl);
  const normalizedImageName = normalizedImageUrl ? (imageName?.trim() || 'Uploaded image') : null;
  const normalizedContextImageUrl = !normalizedImageUrl && wantsImageContext(trimmed)
    ? normalizeImageUrl(contextImageUrl)
    : null;
  const normalizedContextImageName = normalizedContextImageUrl
    ? (contextImageName?.trim() || 'Previous image')
    : null;
  const messageText = trimmed || (normalizedImageName ? `Uploaded ${normalizedImageName}` : '');

  if (!messageText) {
    throw new Error('EMPTY_MESSAGE');
  }

  let targetSessionId = sessionId ?? null;
  if (targetSessionId) {
    const session = await verifySessionOwner(user.user_id, targetSessionId);
    if (!session) {
      throw new Error('CHAT_SESSION_NOT_FOUND');
    }
  } else {
    targetSessionId = await createSession(user.user_id);
  }

  await pool.query(
    'INSERT INTO chatmessages (session_id, sender, message_text, image_url, image_name) VALUES (?, ?, ?, ?, ?)',
    [targetSessionId, 'user', messageText, normalizedImageUrl, normalizedImageName]
  );

  let replyImageUrl = normalizedImageUrl;
  let replyImageName = normalizedImageName;

  if (!replyImageUrl && normalizedContextImageUrl) {
    replyImageUrl = normalizedContextImageUrl;
    replyImageName = normalizedContextImageName;
  }

  if (!replyImageUrl && wantsImageContext(trimmed)) {
    const latestImage = await getLatestSessionImage(targetSessionId);
    replyImageUrl = latestImage?.image_url ?? null;
    replyImageName = latestImage?.image_name ?? null;
  }

  const chatHistory = await getRecentChatContext(targetSessionId, 10);
  const runtimeContext: ChatRuntimeContext = {
    sessionId: targetSessionId,
    history: chatHistory,
    contextText: buildChatContextText(chatHistory, trimmed),
    isFollowUp: isFollowUpMessage(trimmed),
  };

  const assistantReply = await generateAssistantReply(
    accountId,
    trimmed,
    replyImageUrl,
    replyImageName,
    runtimeContext
  );
  await pool.query(
    'INSERT INTO chatmessages (session_id, sender, message_text, thinking_steps) VALUES (?, ?, ?, ?)',
    [targetSessionId, 'ai', assistantReply.text, JSON.stringify(assistantReply.thinkingSteps)]
  );

  const messages = await getChatMessagesService(accountId, targetSessionId);
  return {
    sessionId: targetSessionId,
    messages,
  };
};
