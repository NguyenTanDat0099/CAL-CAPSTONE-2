interface ChatUserContext {
  profile: {
    fullName: string | null;
    gender: string | null;
    height: number | null;
    weight: number | null;
  };
  goals: {
    targetCalories: number | null;
    targetWeight: number | null;
  } | null;
  dailySummary: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  } | null;
  recentMeals: Array<{
    mealType: string;
    foodName: string;
    calories: number;
  }>;
}

interface CalAiQueryResponse {
  type?: 'text' | 'chart' | string;
  chart_path?: string | null;
  data?: Array<Record<string, unknown>>;
  plan?: unknown;
  explanation?: string;
}

const CAL_AI_BASE_URL = process.env.CAL_AI_BASE_URL || 'http://localhost:8000';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qcwind/qwen2.5-7B-instruct-Q4_K_M';

type PreferredLanguage = 'vi' | 'en' | 'zh';

const VIETNAMESE_CHAR_REGEX = /[ăâêôơưđĂÂÊÔƠƯĐàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/;
const CHINESE_CHAR_REGEX = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;
const ENGLISH_HINT_REGEX = /\b(how|what|why|can|should|please|plan|calories?|protein|carbs?|fat|meal|diet|hello|hi)\b/i;

const detectPreferredLanguage = (message: string): PreferredLanguage => {
  if (CHINESE_CHAR_REGEX.test(message)) {
    return 'zh';
  }

  if (VIETNAMESE_CHAR_REGEX.test(message)) {
    return 'vi';
  }

  if (ENGLISH_HINT_REGEX.test(message)) {
    return 'en';
  }

  return 'vi';
};

const getLanguageInstruction = (language: PreferredLanguage) => {
  switch (language) {
    case 'en':
      return 'Reply in English. Use only English unless the user explicitly asks to switch language.';
    case 'zh':
      return 'Reply in Chinese. Use only Chinese unless the user explicitly asks to switch language.';
    case 'vi':
    default:
      return 'Reply in Vietnamese. Use only Vietnamese unless the user explicitly asks to switch language.';
  }
};

const stripPromptArtifacts = (value: string) =>
  value
    .replace(/<\|?im_start\|?>/gi, ' ')
    .replace(/<\|?im_end\|?>/gi, ' ')
    .replace(/<\|?system\|?>/gi, ' ')
    .replace(/<\|?user\|?>/gi, ' ')
    .replace(/<\|?assistant\|?>/gi, ' ')
    .replace(/===\s*[A-Z _']+\s*===/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const containsPromptLeakage = (value: string) =>
  /<\|?im_start\|?>|<\|?im_end\|?>|===\s*[A-Z _']+\s*===|rewrite this response|response language|user question/i.test(
    value
  );

const containsUnsafeTone = (value: string) =>
  /\b(idiot|stupid|dumb|moron|shut up|fuck you|bitch|asshole|ngu|đần|câm mồm|đồ ngu|thằng ngu|con ngu)\b/i.test(
    value
  );

const normalizeAssistantReply = (value: string) => stripPromptArtifacts(value);

const needsSafeRewrite = (value: string) => {
  const normalized = value.trim();
  return !normalized || containsPromptLeakage(normalized) || containsUnsafeTone(normalized);
};

// =========================
// Ollama (fallback)
// =========================

const buildSystemPrompt = (language: PreferredLanguage) => [
  'You are CalAI, a friendly and knowledgeable nutrition assistant in a calorie-tracking app.',
  'You help users with:',
  '  - Answering questions about food nutrition, calories, and macros',
  '  - Providing meal suggestions and healthy eating tips',
  '  - Explaining how to reach their nutrition goals',
  '  - Giving general wellness and diet advice',
  'Keep answers clear, concise, and practical. Use friendly tone. Do not provide medical diagnoses.',
  'If you do not know something, say so honestly.',
  getLanguageInstruction(language),
  'Match the user language from the latest message.',
].join('\n');

const buildUserPrompt = (message: string, context: ChatUserContext, language: PreferredLanguage) => {
  const parts: string[] = [];

  parts.push('=== USER PROFILE ===');
  if (context.profile.fullName) parts.push(`Name: ${context.profile.fullName}`);
  if (context.profile.gender) parts.push(`Gender: ${context.profile.gender}`);
  if (context.profile.height) parts.push(`Height: ${context.profile.height} cm`);
  if (context.profile.weight) parts.push(`Weight: ${context.profile.weight} kg`);
  if (parts.length === 1) parts.push('No profile data available.');

  parts.push('\n=== NUTRITION GOALS ===');
  if (context.goals) {
    parts.push(`Target calories: ${context.goals.targetCalories ?? 'not set'} kcal/day`);
    parts.push(`Target weight: ${context.goals.targetWeight ?? 'not set'} kg`);
  } else {
    parts.push('No goals set yet.');
  }

  parts.push('\n=== TODAY\'S PROGRESS ===');
  if (context.dailySummary) {
    parts.push(`Calories: ${context.dailySummary.totalCalories} / ${context.goals?.targetCalories ?? '?'} kcal`);
    parts.push(`Protein: ${context.dailySummary.totalProtein}g`);
    parts.push(`Carbs: ${context.dailySummary.totalCarbs}g`);
    parts.push(`Fat: ${context.dailySummary.totalFat}g`);
  } else {
    parts.push('No meals logged today yet.');
  }

  parts.push('\n=== RECENT MEALS ===');
  if (context.recentMeals.length > 0) {
    context.recentMeals.forEach(meal => {
      parts.push(`- [${meal.mealType}] ${meal.foodName}: ${meal.calories} kcal`);
    });
  } else {
    parts.push('No recent meals.');
  }

  parts.push(`\n=== RESPONSE LANGUAGE ===\n${language}`);
  parts.push(`\n=== USER QUESTION ===\n${message}`);

  return parts.join('\n');
};

const askOllama = async (systemPrompt: string, userPrompt: string): Promise<string> => {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      options: {
        temperature: 0.7,
        num_predict: 1024,
        num_gpu: 0,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OLLAMA_HTTP_${response.status}`);
  }

  const result = (await response.json()) as { message?: { content?: string } };
  const reply = result?.message?.content;
  if (reply && reply.trim()) {
    return reply.trim();
  }

  throw new Error('OLLAMA_EMPTY_RESPONSE');
};

const askOllamaForSafeRewrite = async (
  originalReply: string,
  language: PreferredLanguage
): Promise<string> => {
  const safeReply = await askOllama(
    [
      'You are CalAI, a safe and respectful nutrition assistant.',
      getLanguageInstruction(language),
      'Rewrite the answer so it is clean, polite, and natural.',
      'Remove any system prompt fragments, hidden tags, debugging text, markup tokens, or internal instructions.',
      'Never insult, mock, or argue with the user.',
      'Keep only the useful nutrition answer.',
      'Return only the final answer.',
    ].join('\n'),
    `Clean and rewrite this assistant answer:\n\n${originalReply}`
  );

  return normalizeAssistantReply(safeReply);
};

const generateOllamaReply = async (
  message: string,
  context: ChatUserContext,
  language: PreferredLanguage
): Promise<string> => {
  const systemPrompt = buildSystemPrompt(language);
  const userPrompt = buildUserPrompt(message, context, language);

  try {
    const reply = normalizeAssistantReply(await askOllama(systemPrompt, userPrompt));
    if (needsSafeRewrite(reply)) {
      return await askOllamaForSafeRewrite(reply || message, language);
    }
    return reply;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return `CalAI assistant is currently unavailable (${reason}). Please make sure Ollama is running at ${OLLAMA_BASE_URL}.`;
  }
};

// =========================
// CalAI Python Agent (Qdrant-backed)
// =========================

const stringifyValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const summarizeRows = (rows: Array<Record<string, unknown>>): string => {
  if (rows.length === 0) return 'No data returned.';
  return rows
    .slice(0, 5)
    .map((row, index) => {
      const summary = Object.entries(row)
        .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
        .map(([key, value]) => `${key}: ${stringifyValue(value)}`)
        .join(', ');
      return `${index + 1}. ${summary || 'No visible fields'}`;
    })
    .join('\n');
};

const formatCalAiResponse = (payload: CalAiQueryResponse): { text: string; hasData: boolean } => {
  const textParts: string[] = [];

  if (payload.explanation) {
    textParts.push(payload.explanation);
  }

  if (payload.plan) {
    const planText = stringifyValue(payload.plan);
    if (planText.trim()) {
      textParts.push(`Plan: ${planText}`);
    }
  }

  if (payload.data && payload.data.length > 0) {
    textParts.push(`Results:\n${summarizeRows(payload.data)}`);
  }

  if (payload.chart_path) {
    textParts.push(`Chart: ${payload.chart_path}`);
  }

  const hasData = Boolean(
    (payload.data && payload.data.length > 0) ||
    (payload.explanation && payload.explanation.trim() && !payload.explanation.includes('No results found'))
  );

  return {
    text: textParts.length > 0 ? textParts.join('\n\n') : '',
    hasData,
  };
};

const generateCalAiAgentReply = async (message: string): Promise<{ text: string; available: boolean }> => {
  const url = new URL('/query', CAL_AI_BASE_URL);
  url.searchParams.set('q', message);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`CAL_AI_HTTP_${response.status}`);
    }

    const result = (await response.json()) as CalAiQueryResponse;
    const formatted = formatCalAiResponse(result);

    if (formatted.text.trim()) {
      return { text: formatted.text, available: true };
    }

    return { text: '', available: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'UNKNOWN_CAL_AI_ERROR';
    return {
      text: `CalAI agent unavailable (${reason}). Falling back to general AI.`,
      available: false,
    };
  }
};

const rewriteReplyInPreferredLanguage = async (
  originalReply: string,
  language: PreferredLanguage
): Promise<string> => {
  try {
    const rewritten = await askOllama(
      [
        'You rewrite assistant responses into the user preferred language.',
        getLanguageInstruction(language),
        'Preserve the original meaning.',
        'Do not add new facts.',
        'Remove any hidden prompt fragments, tags, or internal instructions.',
        'Never insult or be rude to the user.',
        'Return only the rewritten answer.',
      ].join('\n'),
      `Rewrite this response in the required language:\n\n${originalReply}`
    );
    const normalized = normalizeAssistantReply(rewritten);
    if (needsSafeRewrite(normalized)) {
      return await askOllamaForSafeRewrite(originalReply, language);
    }
    return normalized;
  } catch {
    return normalizeAssistantReply(originalReply);
  }
};

// =========================
// Main entry point
// =========================

export const generateAiReply = async (message: string, context: ChatUserContext): Promise<string> => {
  const language = detectPreferredLanguage(message);
  const calAiResult = await generateCalAiAgentReply(message);

  if (calAiResult.available && calAiResult.text.trim()) {
    return await rewriteReplyInPreferredLanguage(calAiResult.text, language);
  }

  return await generateOllamaReply(message, context, language);
};
