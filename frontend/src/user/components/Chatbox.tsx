import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Send,
  Bot,
  User,
  ChevronDown,
  ChevronRight,
  Brain,
  Image as ImageIcon,
  X,
  CheckCircle2,
  AlertTriangle,
  CircleDashed,
  Sparkles,
  Table2,
  RotateCcw,
  CalendarPlus,
  Pencil,
} from 'lucide-react';
import type { ScheduleItem, MealSchedule, MealType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { buildApiUrl } from '../../config/api';

interface ThinkingStep {
  step: number;
  title?: string;
  text: string;
  detail?: string;
  status?: 'done' | 'skipped' | 'warning';
  evidence?: string[];
}

interface FoodConfidenceItem {
  name: string;
  level: 'high' | 'medium' | 'low';
  macros_present?: number;
  retrieval_score?: number;
  source_collection?: string | null;
  reasons?: string[];
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  imageUrl?: string | null;
  imageName?: string | null;
  thinkingSteps?: ThinkingStep[];
  mealConfidence?: FoodConfidenceItem[];
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messages: Message[];
}

const AUTH_TOKEN_KEY = 'calai_token';
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

interface SelectedImage {
  dataUrl: string;
  name: string;
  size: number;
  type: string;
}

const getAuthHeaders = (includeJson = false) => {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatConversationTime = (value: string) => {
  try {
    const date = new Date(value);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffHours = Math.floor(diff / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  } catch {
    return '';
  }
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const formatFileSize = (size: number) => `${(size / (1024 * 1024)).toFixed(1)} MB`;

const stripAccents = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const wantsImageContext = (message: string) => {
  const normalized = stripAccents(message);
  return normalized.includes('mon gi')
    || normalized.includes('day la gi')
    || normalized.includes('mon nay')
    || normalized.includes('mon do')
    || normalized.includes('anh nay')
    || normalized.includes('hinh nay')
    || normalized.includes('trong anh')
    || normalized.includes('trong hinh')
    || normalized.includes('calo')
    || normalized.includes('kcal')
    || normalized.includes('dinh duong')
    || normalized.includes('what is')
    || normalized.includes('this food')
    || normalized.includes('this dish')
    || normalized.includes('image')
    || normalized.includes('photo');
};

const isTableDivider = (line: string) => {
  const cells = splitTableRow(line);
  return cells.length > 1 && cells.every(cell => /^:?-{3,}:?$/.test(cell.trim()));
};

const numFromCell = (cell?: string): number | null => {
  if (!cell) return null;
  const cleaned = cell.replace(/,/g, '').replace(/\*\*/g, '').trim();
  const expr = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*([*x×])\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (expr) {
    const result = Number(expr[1]) * Number(expr[3]);
    return Number.isFinite(result) ? result : null;
  }
  const sum = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*\+\s*(-?\d+(?:\.\d+)?)$/);
  if (sum) {
    const result = Number(sum[1]) + Number(sum[2]);
    return Number.isFinite(result) ? result : null;
  }
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
};

const detectMealType = (cell?: string): MealType => {
  const norm = stripAccents(cell ?? '');
  if (/sang|breakfast/.test(norm)) return 'breakfast';
  if (/toi|dinner/.test(norm)) return 'dinner';
  if (/snack|phu|nhe/.test(norm)) return 'snack';
  return 'lunch';
};

interface ParsedPlan {
  items: ScheduleItem[];
  totalKcal: number;
  rawTable: string;
}

// LLM sometimes returns the entire markdown table on a single line.
// Detect "Header|...|colN -|---|...|--- row1cells row2cells..." and reinsert newlines.
const splitInlineTables = (raw: string): string => {
  if (!raw || raw.indexOf('|') < 0) return raw;

  const lines = raw.split(/\r?\n/);
  const out: string[] = [];

  for (const line of lines) {
    const dividerRe = /(?:^|\s)(-?\|(?:\s*-{3,}\s*\|)+\s*-{3,}\s*\|?)/;
    const m = line.match(dividerRe);
    if (!m) {
      out.push(line);
      continue;
    }
    const dividerStart = line.indexOf(m[1]);
    const headerSegment = line.slice(0, dividerStart).trim();
    const bodySegment = line.slice(dividerStart + m[1].length).trim();

    if (!headerSegment.includes('|') || !bodySegment) {
      out.push(line);
      continue;
    }

    const cellCount = (m[1].match(/-{3,}/g) || []).length;
    if (cellCount < 2) {
      out.push(line);
      continue;
    }

    // Tokenise body cells, splitting "0 Beverages" into ["0", "Beverages"] when at row boundary.
    const rawCells = bodySegment.split('|').map(c => c.trim());
    const flat: string[] = [];
    for (const cell of rawCells) {
      const positionInRow = flat.length % cellCount;
      if (positionInRow === cellCount - 1) {
        const split = cell.match(/^(.*?)\s+([A-ZĐÀ-Ỹa-z][^\s].*)$/);
        if (split) {
          flat.push(split[1].trim());
          flat.push(split[2].trim());
          continue;
        }
      }
      flat.push(cell);
    }

    const rows: string[] = [];
    for (let i = 0; i < flat.length; i += cellCount) {
      const slice = flat.slice(i, i + cellCount);
      if (slice.length === cellCount && slice.some(s => s)) {
        rows.push(slice.join(' | '));
      }
    }
    if (rows.length === 0) {
      out.push(line);
      continue;
    }
    out.push(headerSegment);
    out.push(m[1].trim());
    out.push(...rows);
  }
  return out.join('\n');
};

const detectDayOffset = (heading: string): number | null => {
  const norm = stripAccents(heading);
  const m = norm.match(/(?:day|ngay)\s*(\d+)/);
  if (m) {
    const n = Number(m[1]);
    return Number.isFinite(n) && n > 0 ? n - 1 : null;
  }
  return null;
};

const detectMealTypeFromHeading = (heading: string): MealType | null => {
  const norm = stripAccents(heading);
  if (/(bua\s*sang|breakfast|morning)/.test(norm)) return 'breakfast';
  if (/(bua\s*trua|lunch)/.test(norm)) return 'lunch';
  if (/(bua\s*toi|dinner|supper|evening)/.test(norm)) return 'dinner';
  if (/(snack|do\s*uong|drink|beverage|nhe)/.test(norm)) return 'snack';
  return null;
};

const parsePlanFromMarkdown = (text: string): ParsedPlan | null => {
  if (!text) return null;
  const lines = splitInlineTables(text).split('\n');

  const allItems: ScheduleItem[] = [];
  let totalKcal = 0;
  const rawTables: string[] = [];

  let currentDayOffset = 0;
  let currentMealType: MealType | null = null;

  for (let i = 0; i < lines.length; i++) {
    const lineRaw = lines[i];
    const line = lineRaw.trim();
    if (!line) continue;

    // Track headings to assign day/meal context
    const headingMatch = line.match(/^(?:#{1,4}\s+|\*\*\s*)?(.+?)(?:\s*\*\*)?[:：]?\s*$/);
    if (headingMatch && !line.includes('|')) {
      const dayOff = detectDayOffset(line);
      if (dayOff != null) currentDayOffset = dayOff;
      const mt = detectMealTypeFromHeading(line);
      if (mt) currentMealType = mt;
      continue;
    }

    if (i + 1 >= lines.length) continue;
    if (!line.includes('|')) continue;
    if (!isTableDivider(lines[i + 1])) continue;

    const headers = splitTableRow(line).map(h => stripAccents(h).replace(/\*\*/g, '').trim());
    const findCol = (...needles: string[]) =>
      headers.findIndex(h => needles.some(n => h.includes(n)));
    const findColExact = (...needles: string[]) =>
      headers.findIndex(h => needles.some(n => h === n));
    const monIdx = findCol('mon', 'meal', 'food', 'dish', 'item');
    const kcalIdx = findCol('kcal', 'calo', 'energy', 'nang luong');
    if (monIdx < 0 || kcalIdx < 0) continue;
    const buaIdx = findCol('bua', 'meal type', 'thoi diem');
    const servingIdx = findCol('khau phan', 'phan an', 'serving', 'portion', 'so luong');
    const proteinIdx = (() => {
      const fuzzy = findCol('protein', 'chat dam', 'dam (g)');
      if (fuzzy >= 0) return fuzzy;
      return findColExact('p(g)', 'p', 'p (g)', 'pro', 'pr');
    })();
    const carbsIdx = (() => {
      const fuzzy = findCol('carbs', 'carb', 'tinh bot', 'duong bot');
      if (fuzzy >= 0) return fuzzy;
      return findColExact('c(g)', 'c', 'c (g)');
    })();
    const fatIdx = (() => {
      const fuzzy = findCol('fat', 'chat beo', 'beo (g)');
      if (fuzzy >= 0) return fuzzy;
      return findColExact('f(g)', 'f', 'f (g)');
    })();

    // Count any signal that indicates this really is a meal table (not a
    // random data table with a kcal column). Macros are the strongest signal,
    // but "Bữa" or "Khẩu phần" columns are also reliable meal-plan markers,
    // and the LLM sometimes drops macros when generating a full-day plan to
    // save tokens.
    const matchedSignals = [proteinIdx, carbsIdx, fatIdx, servingIdx, buaIdx]
      .filter(idx => idx >= 0).length;
    if (matchedSignals < 1) continue;

    const tableLines: string[] = [lineRaw, lines[i + 1]];
    let cursor = i + 2;
    let rowMealType: MealType | null = currentMealType;
    while (cursor < lines.length && lines[cursor].trim().includes('|')) {
      tableLines.push(lines[cursor]);
      const cells = splitTableRow(lines[cursor]);
      const name = cells[monIdx]?.replace(/\*\*/g, '').trim();
      if (name && !/^total|^tong|^tổng/i.test(stripAccents(name))) {
        const kcal = numFromCell(cells[kcalIdx]);
        const buaCell = buaIdx >= 0 ? (cells[buaIdx] ?? '').replace(/\*\*/g, '').trim() : '';
        // "↳" / "—" / empty Bữa cell → continuation row, inherit previous meal.
        const isContinuation = /^[↳\-—–]?$/.test(buaCell);
        const buaMeal = buaIdx >= 0 && !isContinuation
          ? detectMealTypeFromHeading(buaCell) ?? detectMealType(buaCell)
          : null;
        if (buaMeal) rowMealType = buaMeal;
        const inferredFromCell = detectMealTypeFromHeading(cells[monIdx] ?? '');
        allItems.push({
          mealType: rowMealType ?? currentMealType ?? inferredFromCell ?? detectMealType(cells[monIdx]),
          name,
          serving: servingIdx >= 0 ? cells[servingIdx] || null : null,
          calories: kcal,
          protein: proteinIdx >= 0 ? numFromCell(cells[proteinIdx]) : null,
          carbs: carbsIdx >= 0 ? numFromCell(cells[carbsIdx]) : null,
          fat: fatIdx >= 0 ? numFromCell(cells[fatIdx]) : null,
          dayOffset: currentDayOffset,
        });
        if (kcal != null) totalKcal += kcal;
      }
      cursor += 1;
    }
    rawTables.push(tableLines.join('\n'));
    i = cursor - 1;
  }

  if (allItems.length === 0) return null;
  return { items: allItems, totalKcal, rawTable: rawTables.join('\n\n') };
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const addDaysISO = (iso: string, days: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const splitTableRow = (line: string) => {
  const trimmed = line.trim();
  const content = trimmed.startsWith('|') && trimmed.endsWith('|')
    ? trimmed.slice(1, -1)
    : trimmed;
  const cells: string[] = [];
  let current = '';
  let escaped = false;

  for (const char of content) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '|') {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
};

const renderInlineMarkdown = (value: string, keyPrefix: string) => {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(value.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${match.index}`} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      nodes.push(
        <code key={`${keyPrefix}-c-${match.index}`} className="rounded bg-white/10 px-1.5 py-0.5 text-[0.9em] text-brand-orange">
          {token.slice(1, -1)}
        </code>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex));
  }

  return nodes;
};

const sanitizeLatex = (text: string) => {
  if (!text) return text;
  return text
    .replace(/\\\[/g, '')
    .replace(/\\\]/g, '')
    .replace(/\\\(/g, '')
    .replace(/\\\)/g, '')
    .replace(/\$\$/g, '')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\mathrm\{([^}]*)\}/g, '$1')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1) / ($2)')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\approx/g, '≈')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\,/g, ' ')
    .replace(/\\!/g, '')
    .replace(/\\;/g, ' ')
    .replace(/\\\\/g, '\n');
};

const CONFIDENCE_BADGE_STYLES: Record<'high' | 'medium' | 'low', string> = {
  high: 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30',
  medium: 'bg-amber-500/15 text-amber-200 border border-amber-400/30',
  low: 'bg-rose-500/15 text-rose-200 border border-rose-400/30',
};
const CONFIDENCE_BADGE_LABEL: Record<'high' | 'medium' | 'low', string> = {
  high: 'Cao',
  medium: 'Vừa',
  low: 'Thấp',
};

const findConfidenceMatch = (
  cellText: string,
  confidenceMap: FoodConfidenceItem[] | undefined
): FoodConfidenceItem | null => {
  if (!confidenceMap?.length || !cellText) return null;
  const normalized = stripAccents(cellText).trim();
  if (!normalized) return null;
  let best: { item: FoodConfidenceItem; score: number } | null = null;
  for (const item of confidenceMap) {
    const candidate = stripAccents(item.name).trim();
    if (!candidate) continue;
    let score = 0;
    if (normalized === candidate) score = 100;
    else if (normalized.includes(candidate) || candidate.includes(normalized)) score = candidate.length;
    if (score > 0 && (best === null || score > best.score)) {
      best = { item, score };
    }
  }
  return best?.item ?? null;
};

const detectDishColumnIndex = (headers: string[]): number => {
  const lc = headers.map(h => stripAccents(h).trim());
  const dishHeaders = ['mon', 'mon an', 'dish', 'food', 'item', 'name'];
  for (let i = 0; i < lc.length; i += 1) {
    if (dishHeaders.some(d => lc[i].includes(d))) return i;
  }
  return 1; // default: assume column index 1 (after Bữa)
};

const renderRichText = (rawText: string, mealConfidence?: FoodConfidenceItem[]) => {
  const text = splitInlineTables(sanitizeLatex(rawText));
  const lines = text.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.includes('|') && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const headers = splitTableRow(trimmed);
      const rows: string[][] = [];
      index += 2;

      while (index < lines.length && lines[index].trim().includes('|')) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }

      const dishCol = detectDishColumnIndex(headers);

      blocks.push(
        <div key={`table-${blocks.length}`} className="overflow-x-auto rounded-xl border border-white/10 bg-black/15">
          <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.16em] text-text-muted">
              <tr>
                {headers.map((header, headerIndex) => (
                  <th key={headerIndex} className="border-b border-white/10 px-4 py-3 font-black">
                    {renderInlineMarkdown(header, `th-${blocks.length}-${headerIndex}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                const dishCell = row[dishCol] ?? '';
                const match = findConfidenceMatch(dishCell, mealConfidence);
                return (
                  <tr key={rowIndex} className="border-b border-white/5 last:border-0">
                    {headers.map((_, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-3 align-top text-white/88">
                        <span className="inline-flex items-center gap-2 flex-wrap">
                          {renderInlineMarkdown(row[cellIndex] ?? '', `td-${blocks.length}-${rowIndex}-${cellIndex}`)}
                          {cellIndex === dishCol && match && (
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${CONFIDENCE_BADGE_STYLES[match.level]}`}
                              title={match.reasons?.join(' • ') || ''}
                            >
                              {CONFIDENCE_BADGE_LABEL[match.level]}
                            </span>
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^#{1,3}\s+/.test(trimmed)) {
      const level = trimmed.match(/^#+/)?.[0].length ?? 2;
      const content = trimmed.replace(/^#{1,3}\s+/, '');
      const HeadingTag = level === 1 ? 'h3' : 'h4';
      blocks.push(
        <HeadingTag key={`heading-${blocks.length}`} className="pt-1 text-sm font-black tracking-wide text-white">
          {renderInlineMarkdown(content, `h-${blocks.length}`)}
        </HeadingTag>
      );
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ''));
        index += 1;
      }

      blocks.push(
        <ul key={`list-${blocks.length}`} className="space-y-2 pl-4 text-white/88">
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="list-disc leading-relaxed">
              {renderInlineMarkdown(item, `li-${blocks.length}-${itemIndex}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length
      && lines[index].trim()
      && !(lines[index].trim().includes('|') && index + 1 < lines.length && isTableDivider(lines[index + 1]))
      && !/^#{1,3}\s+/.test(lines[index].trim())
      && !/^[-*]\s+/.test(lines[index].trim())
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }

    blocks.push(
      <p key={`p-${blocks.length}`} className="leading-7 text-white/90">
        {renderInlineMarkdown(paragraph.join(' '), `p-${blocks.length}`)}
      </p>
    );
  }

  return blocks;
};

const getThinkingStatusMeta = (status?: ThinkingStep['status']) => {
  if (status === 'warning') {
    return {
      label: 'Needs review',
      icon: AlertTriangle,
      dotClass: 'bg-amber-400/15 text-amber-300 border-amber-300/30',
    };
  }

  if (status === 'skipped') {
    return {
      label: 'Skipped',
      icon: CircleDashed,
      dotClass: 'bg-white/5 text-text-muted border-white/10',
    };
  }

  return {
    label: 'Done',
    icon: CheckCircle2,
    dotClass: 'bg-emerald-400/15 text-emerald-300 border-emerald-300/30',
  };
};

interface SavePlanPayload {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  color?: string;
  targetCalories?: number;
  source: 'manual' | 'chat';
  planPayload?: unknown;
  items?: ScheduleItem[];
}

interface ChatboxProps {
  onSavePlanToSchedule?: (payload: SavePlanPayload) => Promise<MealSchedule>;
  pendingChatId?: string | null;
  onPendingChatResolved?: () => void;
  onConversationsChange?: (summaries: { id: string; title: string; lastMessage: string; timestamp: string }[]) => void;
  onActiveChatChange?: (id: string | null) => void;
  pendingDeleteChatId?: string | null;
  onPendingDeleteChatResolved?: () => void;
  pendingNewChat?: number;
}

interface PendingSave {
  message: string;
  parsed: ParsedPlan;
  defaultName: string;
}

export function Chatbox({ onSavePlanToSchedule, pendingChatId, onPendingChatResolved, onConversationsChange, onActiveChatChange, pendingDeleteChatId, onPendingDeleteChatResolved, pendingNewChat }: ChatboxProps) {
  const storedActiveChatId = (() => {
    try { return sessionStorage.getItem('calai_active_chat'); } catch { return null; }
  })();

  const storedConversations = (() => {
    try {
      const raw = sessionStorage.getItem('calai_conversations');
      if (raw) return JSON.parse(raw) as Conversation[];
    } catch { /* ignore */ }
    return [];
  })();

  const [conversations, setConversations] = useState<Conversation[]>(storedConversations);
  const [activeChatId, setActiveChatId] = useState<string | null>(storedActiveChatId);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [error, setError] = useState('');
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveForm, setSaveForm] = useState({ name: '', startDate: todayISO(), endDate: addDaysISO(todayISO(), 6), color: '#FB923C' });
  // Per-conversation typing state: { [conversationId]: boolean }
  const [isTypingMap, setIsTypingMap] = useState<Record<string, boolean>>({});
  // Tracks which message IDs have expanded thinking steps
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set());
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [thinkingStartMap, setThinkingStartMap] = useState<Record<string, number>>({});
  const [thinkingElapsed, setThinkingElapsed] = useState(0);
  const [showLiveThinking, setShowLiveThinking] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Track if user has scrolled up (away from bottom)
  const isAtBottomRef = useRef(true);

  // Ref to track pending request separately from render cycle
  const pendingRequestIdRef = useRef<string | null>(null);
  // Per-conversation AbortControllers so requests in different chats don't cross-cancel.
  // Switching chats no longer aborts in-flight work — the response will return to the
  // originating conversation. Sending a NEW message in the same chat aborts only that chat.
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const isTyping = isTypingMap[activeChatId ?? ''] ?? false;

  // Browser reloads abort in-flight fetches, so persisted pending state would leave
  // the chat disabled forever. Clear any stale request markers on mount.
  useEffect(() => {
    try {
      sessionStorage.removeItem('calai_pending_request');
      sessionStorage.removeItem('calai_typing_chats');
    } catch { /* ignore */ }
  }, []); // only on mount

  // Persist state across navigations
  useEffect(() => {
    try {
      if (activeChatId) {
        sessionStorage.setItem('calai_active_chat', activeChatId);
      } else {
        sessionStorage.removeItem('calai_active_chat');
      }
    } catch { /* ignore */ }
  }, [activeChatId]);

  // Persist isTypingMap so a tab reload preserves the "is generating" indicator on the chat
  useEffect(() => {
    try {
      const pendingIds = Object.keys(isTypingMap).filter(id => isTypingMap[id]);
      if (pendingIds.length > 0) {
        sessionStorage.setItem('calai_typing_chats', JSON.stringify(pendingIds));
      } else {
        sessionStorage.removeItem('calai_typing_chats');
      }
    } catch { /* ignore */ }
  }, [isTypingMap]);

  useEffect(() => {
    try {
      if (conversations.length > 0) {
        sessionStorage.setItem('calai_conversations', JSON.stringify(conversations));
      }
    } catch { /* ignore */ }
    onConversationsChange?.(conversations.map(c => ({ id: c.id, title: c.title, lastMessage: c.lastMessage, timestamp: c.timestamp })));
  }, [conversations]);

  useEffect(() => {
    if (!pendingChatId) return;
    if (conversations.some(c => c.id === pendingChatId)) {
      setActiveChatId(pendingChatId);
      onPendingChatResolved?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChatId]);

  useEffect(() => {
    onActiveChatChange?.(activeChatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId]);

  useEffect(() => {
    if (!pendingDeleteChatId) return;
    const id = pendingDeleteChatId;
    (async () => {
      try {
        const r = await fetch(buildApiUrl(`/chat/sessions/${id}`), { method: 'DELETE', headers: getAuthHeaders() });
        const result = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(result?.message || 'Failed to delete chat');
        const nextSessions = conversations.filter(c => c.id !== id);
        setConversations(nextSessions);
        if (activeChatId === id) setActiveChatId(nextSessions[0]?.id ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete chat');
      } finally {
        onPendingDeleteChatResolved?.();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDeleteChatId]);

  useEffect(() => {
    if (!pendingNewChat) return;
    createNewChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNewChat]);

  const activeChat = conversations.find(c => c.id === activeChatId);
  const displayMessages = (activeChat?.messages ?? []).filter(Boolean);

  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayMessages, isTyping]);

  // Live thinking timer — ticks while assistant is generating
  useEffect(() => {
    if (!isTyping || !activeChatId) {
      setThinkingElapsed(0);
      return;
    }
    const start = thinkingStartMap[activeChatId] ?? Date.now();
    if (!thinkingStartMap[activeChatId]) {
      setThinkingStartMap(prev => ({ ...prev, [activeChatId]: start }));
    }
    setThinkingElapsed(Math.floor((Date.now() - start) / 1000));
    const interval = setInterval(() => {
      setThinkingElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTyping, activeChatId, thinkingStartMap]);

  // Reset start time once typing ends so next prompt starts at 0
  useEffect(() => {
    if (!isTyping && activeChatId && thinkingStartMap[activeChatId]) {
      setThinkingStartMap(prev => {
        const next = { ...prev };
        delete next[activeChatId];
        return next;
      });
    }
  }, [isTyping, activeChatId]);

  const liveThinkingPhases = [
    { from: 0, label: 'Phân tích câu hỏi và xác định intent…' },
    { from: 4, label: 'Truy xuất dữ liệu từ vector database…' },
    { from: 12, label: 'Lọc context phù hợp và xếp hạng…' },
    { from: 25, label: 'Sinh câu trả lời tự nhiên dựa trên context…' },
    { from: 60, label: 'Đang tổng hợp lượng dữ liệu lớn, vui lòng chờ…' },
  ];

  const currentPhases = liveThinkingPhases.filter(p => thinkingElapsed >= p.from);

  // Attach scroll listener once on mount
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      isAtBottomRef.current = distFromBottom < 80;
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const parseMessageDbId = (id: string | null | undefined): number | null => {
    if (!id) return null;
    const direct = Number(id);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const match = id.match(/^msg-(\d+)-/);
    if (match) {
      const parsed = Number(match[1]);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }
    return null;
  };

  const mapMessages = (rows: Array<{ messageId?: number; message?: string; sender?: string; createdAt?: string; imageUrl?: string | null; imageName?: string | null; thinkingSteps?: ThinkingStep[]; foodInsight?: { mealConfidence?: FoodConfidenceItem[] } | null }>): Message[] => {
    if (!Array.isArray(rows)) return [];
    return rows
      .filter(row => row != null)
      .map((row, index) => ({
        id: `msg-${row.messageId ?? index}-${row.sender ?? 'ai'}`,
        text: String(row.message ?? ''),
        sender: row.sender === 'user' || row.sender === 'ai' ? row.sender : 'ai',
        timestamp: row.createdAt ? formatTime(row.createdAt) : formatTime(new Date().toISOString()),
        imageUrl: row.imageUrl ?? null,
        imageName: row.imageName ?? null,
        thinkingSteps: row.thinkingSteps,
        mealConfidence: row.foodInsight?.mealConfidence,
      }));
  };

  const loadSessions = async () => {
    try {
      const response = await fetch(buildApiUrl('/chat/sessions'), {
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || 'Failed to load chat sessions');
      }

      const sessions = result?.data ?? [];

      // Build server sessions, then merge with stored conversations to preserve messages
      const storedMap = new Map(storedConversations.map(c => [c.id, c.messages]));
      const mappedSessions: Conversation[] = sessions.map((session: { sessionId?: number; lastMessage?: string; firstUserMessage?: string | null; startedAt?: string }) => {
        const sid = String(session.sessionId ?? '');
        const storedMsgs = storedMap.get(sid) ?? [];
        const titleSource = session.firstUserMessage ?? session.lastMessage ?? 'New Conversation';
        return {
          id: sid,
          title: titleSource.slice(0, 40),
          lastMessage: session.lastMessage ?? 'No messages yet',
          timestamp: formatConversationTime(session.startedAt ?? new Date().toISOString()),
          messages: storedMsgs,
        };
      });

      setConversations(mappedSessions);

    if (!activeChatId) {
      setActiveChatId(mappedSessions[0]?.id ?? null);
    }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chats');
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const response = await fetch(buildApiUrl(`/chat/sessions/${sessionId}/messages`), {
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || 'Failed to load chat messages');
      }

      const mapped = mapMessages(result?.data ?? []);

      setConversations(prev =>
        prev.map(conversation => {
          if (conversation.id !== sessionId) return conversation;
          const firstUser = mapped.find(m => m.sender === 'user');
          return {
            ...conversation,
            messages: mapped,
            title: firstUser ? firstUser.text.slice(0, 40) : conversation.title,
            lastMessage: mapped.length > 0 ? (mapped[mapped.length - 1]?.text ?? conversation.lastMessage) : conversation.lastMessage,
          };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const pendingSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeChatId) return;
    setError('');
    if (activeChatId.startsWith('new-')) return;
    // Skip if we just sent a message and are waiting for the server response for this session
    if (pendingSessionIdRef.current === activeChatId) return;
    loadMessages(activeChatId);
  }, [activeChatId]);

  const createNewChat = () => {
    setActiveChatId(null);
    setInputText('');
    setSelectedImage(null);
    setError('');
    try { sessionStorage.removeItem('calai_active_chat'); } catch { /* ignore */ }
  };

  const toggleThinking = (msgId: string) => {
    setExpandedThinking(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Image is too large. Maximum size is ${formatFileSize(MAX_UPLOAD_BYTES)}.`);
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setSelectedImage({
        dataUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      });
      setError('');
    } catch {
      setError('Could not read the selected image.');
    }
  };

  const handleSendMessage = async (override?: { text?: string; image?: SelectedImage | null }) => {
    const trimmed = (override?.text ?? inputText).trim();
    const imageToSend = override?.image !== undefined ? override.image : selectedImage;
    const latestContextImage = !imageToSend && trimmed && activeChat && wantsImageContext(trimmed)
      ? [...activeChat.messages].reverse().find(message => message.imageUrl)
      : null;
    if (!trimmed && !imageToSend) return;

    const displayText = trimmed || (imageToSend ? `Uploaded ${imageToSend.name}` : '');

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      text: displayText,
      sender: 'user',
      timestamp: formatTime(new Date().toISOString()),
      imageUrl: imageToSend?.dataUrl ?? null,
      imageName: imageToSend?.name ?? null,
    };

    setInputText('');
    setSelectedImage(null);
    setError('');

    // Create or update conversation optimistically
    const isNewChat = !activeChatId;
    const tempId = isNewChat ? `new-${Date.now()}` : activeChatId!;

    // Abort previous in-flight request for THIS chat only (new prompt supersedes).
    // Other chats' requests keep running so their answers come back when ready.
    const existingController = abortControllersRef.current.get(tempId);
    if (existingController) {
      existingController.abort();
    }
    const controller = new AbortController();
    abortControllersRef.current.set(tempId, controller);

    // Mark this conversation as typing
    setIsTypingMap(prev => ({ ...prev, [tempId]: true }));

    pendingRequestIdRef.current = tempId;
    try { sessionStorage.setItem('calai_pending_request', tempId); } catch { /* ignore */ }

    setConversations(prev => {
      const existing = prev.find(c => c.id === tempId);
      if (existing) {
        return prev.map(c =>
          c.id === tempId
            ? { ...c, messages: [...c.messages, userMessage], lastMessage: displayText, timestamp: 'Just now' }
            : c
        );
      }
      const newConv: Conversation = {
        id: tempId,
        title: (trimmed || imageToSend?.name || 'Image upload').slice(0, 30),
        lastMessage: displayText,
        timestamp: 'Just now',
        messages: [userMessage],
      };
      return [newConv, ...prev];
    });

    if (!activeChatId) {
      setActiveChatId(tempId);
    }

    try {
      const response = await fetch(buildApiUrl('/chat/message'), {
        method: 'POST',
        headers: getAuthHeaders(true),
        signal: controller.signal,
        body: JSON.stringify({
          message: trimmed,
          imageUrl: imageToSend?.dataUrl,
          imageName: imageToSend?.name,
          contextImageUrl: latestContextImage?.imageUrl,
          contextImageName: latestContextImage?.imageName,
          sessionId: !isNewChat ? Number(activeChatId) : undefined,
        }),
      });

      if (!response.ok) {
        const errResult = await response.json().catch(() => ({}));
        throw new Error(errResult?.message || 'Failed to send message');
      }

      const result = await response.json();
      const data = result?.data;

      if (!data) {
        throw new Error('Invalid server response');
      }

      const sessionId = String(data.sessionId ?? tempId);
      const mapped = mapMessages(data.messages ?? []);

      // Replace temp user message with server version (has real id from DB)
      // This avoids duplicate display if server echoed the user's message back
      const serverUserMsg = [...mapped].reverse().find(m => m.sender === 'user');
      if (serverUserMsg) {
        // Use server's user message id to prevent duplicate rendering
        userMessage.id = serverUserMsg.id;
      }
      const hasUserMsg = mapped.some(m => m.id === userMessage.id);
      const finalMessages = hasUserMsg
        ? mapped.map(m => m.id === userMessage.id ? userMessage : m)
        : [userMessage, ...mapped];

      setConversations(prev => {
        const existing = prev.find(c => c.id === tempId || c.id === sessionId);
        const withoutOld = prev.filter(c => c.id !== tempId && c.id !== sessionId);
        const firstUser = finalMessages.find(m => m.sender === 'user');
        const titleSource = existing?.title && existing.title !== 'New Conversation'
          ? existing.title
          : (firstUser?.text || trimmed || imageToSend?.name || 'Image upload');
        return [
          {
            id: sessionId,
            title: titleSource.slice(0, 40),
            lastMessage: mapped.length > 0 ? (mapped[mapped.length - 1]?.text ?? displayText) : displayText,
            timestamp: 'Just now',
            messages: finalMessages,
          },
          ...withoutOld,
        ];
      });

      // Only update activeChatId if the current active chat matches the tempId we sent from
      if (isNewChat || activeChatId === tempId || activeChatId === sessionId) {
        setActiveChatId(sessionId);
      }
      pendingSessionIdRef.current = null;
      try { sessionStorage.removeItem('calai_pending_request'); } catch { /* ignore */ }
    } catch (err) {
      // Don't treat AbortError as a real error
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      pendingSessionIdRef.current = null;
      setConversations(prev =>
        prev.map(c =>
          c.id === tempId
            ? { ...c, messages: c.messages.filter(m => m.id !== userMessage.id) }
            : c
        ).filter(c => c.messages.length > 0 || c.id !== tempId)
      );
      if (!isNewChat && activeChatId) {
        setActiveChatId(activeChatId);
      }
      setInputText(trimmed);
      setSelectedImage(imageToSend);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      pendingRequestIdRef.current = null;
      pendingSessionIdRef.current = null;
      // Only clear typing for the conversation this request was for
      setIsTypingMap(prev => {
        const next = { ...prev };
        delete next[tempId];
        return next;
      });
      // Drop the per-chat abort controller for this completed/cancelled request
      abortControllersRef.current.delete(tempId);
      try { sessionStorage.removeItem('calai_pending_request'); } catch { /* ignore */ }
    }
  };

  const quickActions = [
    "How many calories in an apple?",
    "Plan my lunch",
    "Recalculate macros"
  ];

  const aiFallbackHints = [
    'model vision chưa xác định đủ chắc',
    'Mình chưa kịp trả lời',
    'Service Cal-AI hiện không khả dụng',
    'Mình không kết nối được Cal-AI',
    'Cal-AI trả về lỗi',
    'Mình chưa tìm thấy dữ liệu phù hợp',
    'Mình chưa tạo được câu trả lời',
  ];
  const isAiFallback = (text?: string) => {
    if (!text) return false;
    return aiFallbackHints.some(hint => text.includes(hint));
  };

  const truncateMessagesAfter = async (sessionId: number, messageId: number, inclusive: boolean) => {
    try {
      const url = buildApiUrl(`/chat/sessions/${sessionId}/messages/after/${messageId}`) +
        (inclusive ? '?inclusive=true' : '');
      await fetch(url, { method: 'DELETE', headers: getAuthHeaders() });
    } catch (err) {
      console.warn('truncate failed:', err);
    }
  };

  const retryAiMessage = async (failedAiId: string) => {
    if (isTyping) return;
    const messages = activeChat?.messages ?? [];
    const failedIndex = messages.findIndex(m => m.id === failedAiId);
    const previousUser = failedIndex > 0
      ? [...messages].slice(0, failedIndex).reverse().find(m => m.sender === 'user')
      : null;
    if (!previousUser) return;

    const sessionIdNum = Number(activeChatId);
    const aiMsgIdNum = parseMessageDbId(failedAiId);
    if (Number.isFinite(sessionIdNum) && sessionIdNum > 0 && aiMsgIdNum != null) {
      await truncateMessagesAfter(sessionIdNum, aiMsgIdNum, true);
      setConversations(prev =>
        prev.map(c =>
          c.id === String(sessionIdNum)
            ? { ...c, messages: c.messages.filter(m => {
                const dbId = parseMessageDbId(m.id);
                return dbId == null || dbId < aiMsgIdNum;
              }) }
            : c
        )
      );
    }

    const overrideImage: SelectedImage | null = previousUser.imageUrl
      ? {
          dataUrl: previousUser.imageUrl,
          name: previousUser.imageName ?? 'Uploaded image',
          size: 0,
          type: previousUser.imageUrl.startsWith('data:image/')
            ? previousUser.imageUrl.slice(5, previousUser.imageUrl.indexOf(';'))
            : 'image/jpeg',
        }
      : null;
    const overrideText = previousUser.text.startsWith('Uploaded ') && previousUser.imageUrl
      ? ''
      : previousUser.text;
    handleSendMessage({ text: overrideText, image: overrideImage });
  };

  const openSaveModal = (msgText: string) => {
    const parsed = parsePlanFromMarkdown(msgText);
    if (!parsed) return;
    const defaultName = `Meal plan · ${new Date().toLocaleDateString()}`;
    setPendingSave({ message: msgText, parsed, defaultName });
    setSaveForm({
      name: defaultName,
      startDate: todayISO(),
      endDate: addDaysISO(todayISO(), 6),
      color: '#FB923C',
    });
    setSaveError('');
  };

  const closeSaveModal = () => {
    setPendingSave(null);
    setSaveError('');
    setSavingPlan(false);
  };

  const handleConfirmSavePlan = async () => {
    if (!pendingSave || !onSavePlanToSchedule) return;
    if (!saveForm.name.trim()) { setSaveError('Please enter a name.'); return; }
    if (saveForm.startDate < todayISO()) { setSaveError('Start date cannot be in the past.'); return; }
    if (saveForm.startDate > saveForm.endDate) { setSaveError('End date must be on or after start date.'); return; }
    const startMs = new Date(`${saveForm.startDate}T00:00:00`).getTime();
    const endMs = new Date(`${saveForm.endDate}T00:00:00`).getTime();
    const days = Math.round((endMs - startMs) / 86400000) + 1;
    if (days > 60) { setSaveError('Schedule cannot exceed 60 days. Pick a shorter range.'); return; }
    setSavingPlan(true);
    setSaveError('');
    try {
      const totalKcal = pendingSave.parsed.items.reduce((sum, item) => sum + (item.calories ?? 0), 0);
      const description = `Saved from CalAI chat — ${pendingSave.parsed.items.length} meal${pendingSave.parsed.items.length === 1 ? '' : 's'}, ~${Math.round(totalKcal)} kcal total.`;
      const result = await onSavePlanToSchedule({
        name: saveForm.name.trim(),
        description,
        startDate: saveForm.startDate,
        endDate: saveForm.endDate,
        color: saveForm.color,
        targetCalories: totalKcal > 0 ? Math.round(totalKcal) : undefined,
        source: 'chat',
        planPayload: { table: pendingSave.parsed.rawTable, items: pendingSave.parsed.items },
        items: pendingSave.parsed.items,
      });
      setSaveSuccess(`Saved "${result.name}" to My schedule.`);
      setPendingSave(null);
      setTimeout(() => setSaveSuccess(null), 3500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save schedule');
    } finally {
      setSavingPlan(false);
    }
  };

  const retryUserMessage = async (msg: Message) => {
    if (isTyping) return;

    const sessionIdNum = Number(activeChatId);
    const userMsgIdNum = parseMessageDbId(msg.id);
    if (Number.isFinite(sessionIdNum) && sessionIdNum > 0 && userMsgIdNum != null) {
      await truncateMessagesAfter(sessionIdNum, userMsgIdNum, true);
      setConversations(prev =>
        prev.map(c =>
          c.id === String(sessionIdNum)
            ? { ...c, messages: c.messages.filter(m => {
                const dbId = parseMessageDbId(m.id);
                return dbId == null || dbId < userMsgIdNum;
              }) }
            : c
        )
      );
    }

    const overrideImage: SelectedImage | null = msg.imageUrl
      ? {
          dataUrl: msg.imageUrl,
          name: msg.imageName ?? 'Uploaded image',
          size: 0,
          type: msg.imageUrl.startsWith('data:image/')
            ? msg.imageUrl.slice(5, msg.imageUrl.indexOf(';'))
            : 'image/jpeg',
        }
      : null;
    const overrideText = msg.text.startsWith('Uploaded ') && msg.imageUrl ? '' : msg.text;
    handleSendMessage({ text: overrideText, image: overrideImage });
  };

  const startEditMessage = (msg: Message) => {
    if (isTyping) return;
    setEditingMessage(msg);
    setInputText(msg.text.startsWith('Uploaded ') && msg.imageUrl ? '' : msg.text);
    if (msg.imageUrl) {
      setSelectedImage({
        dataUrl: msg.imageUrl,
        name: msg.imageName ?? 'Uploaded image',
        size: 0,
        type: msg.imageUrl.startsWith('data:image/')
          ? msg.imageUrl.slice(5, msg.imageUrl.indexOf(';'))
          : 'image/jpeg',
      });
    }
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setInputText('');
    setSelectedImage(null);
  };

  const submitEdit = async () => {
    if (!editingMessage || isTyping) return;
    const newText = inputText.trim();
    if (!newText && !selectedImage) return;

    // Re-resolve the message from active chat in case the id transitioned from temp-* to real DB id
    const messages = activeChat?.messages ?? [];
    const liveMsg = messages.find(m => m.id === editingMessage.id)
      ?? messages.find(m => m.sender === 'user' && m.text === editingMessage.text)
      ?? editingMessage;

    const sessionIdNum = Number(activeChatId);
    const userMsgIdNum = parseMessageDbId(liveMsg.id);
    if (Number.isFinite(sessionIdNum) && sessionIdNum > 0 && userMsgIdNum != null) {
      await truncateMessagesAfter(sessionIdNum, userMsgIdNum, true);
      setConversations(prev =>
        prev.map(c =>
          c.id === String(sessionIdNum)
            ? { ...c, messages: c.messages.filter(m => {
                const dbId = parseMessageDbId(m.id);
                return dbId == null || dbId < userMsgIdNum;
              }) }
            : c
        )
      );
    }

    const overrideImage = selectedImage;
    setEditingMessage(null);
    handleSendMessage({ text: newText, image: overrideImage });
  };

  const retryLastUserMessage = () => {
    if (isTyping) return;
    const messages = activeChat?.messages ?? [];
    const lastUser = [...messages].reverse().find(m => m.sender === 'user');
    if (lastUser) {
      const overrideImage: SelectedImage | null = lastUser.imageUrl
        ? {
            dataUrl: lastUser.imageUrl,
            name: lastUser.imageName ?? 'Uploaded image',
            size: 0,
            type: 'image/jpeg',
          }
        : null;
      const overrideText = lastUser.text.startsWith('Uploaded ') && lastUser.imageUrl ? '' : lastUser.text;
      handleSendMessage({ text: overrideText, image: overrideImage });
      return;
    }
    if (inputText.trim() || selectedImage) handleSendMessage();
  };

  return (
    <div className="fixed inset-0 lg:left-64 flex bg-bg-dark overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 min-w-0 flex flex-col relative">
        {/* Header */}
        <div className="p-4 sm:p-6 pl-16 lg:pl-6 border-b border-white/5 flex items-center gap-3">
          <span className="text-sm font-black uppercase tracking-widest text-brand-orange truncate">
            Nutrition AI
          </span>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8"
        >
          {saveSuccess && (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200 mb-4">
              {saveSuccess}
            </div>
          )}
          {error && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              <span>{error}</span>
              {(activeChat?.messages.some(m => m.sender === 'user') || inputText.trim() || selectedImage) && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setError(''); retryLastUserMessage(); }}
                  disabled={isTyping}
                  className={`inline-flex items-center gap-2 rounded-full border border-red-300/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                    isTyping ? 'text-red-200/40 cursor-not-allowed' : 'text-red-100 hover:bg-red-300/10'
                  }`}
                >
                  <RotateCcw size={12} />
                  Retry
                </motion.button>
              )}
            </div>
          )}
          {!activeChatId && !isTyping ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-20 h-20 rounded-3xl bg-brand-orange/10 flex items-center justify-center text-brand-orange mb-6">
                <Bot size={40} />
              </div>
              <h2 className="text-2xl font-black mb-4">Welcome to CalAI Assistant</h2>
              <p className="text-text-muted mb-8">Start a new conversation to get personalized nutrition advice, meal plans, and calorie tracking help.</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={createNewChat}
                className="px-8 py-4 bg-brand-orange text-bg-dark font-black rounded-2xl shadow-lg shadow-brand-orange/20"
              >
                Start New Chat
              </motion.button>
            </div>
          ) : (
            <>
              {displayMessages.filter(Boolean).map((msg) => {
                const isAi = msg.sender === 'ai';
                const isExpanded = expandedThinking.has(msg.id);

                return (
                  <div key={msg.id} className={`flex gap-4 ${isAi ? '' : 'flex-row-reverse'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isAi ? 'bg-brand-orange/20 text-brand-orange' : 'bg-surface-lighter text-white'
                    }`}>
                      {isAi ? <Bot size={20} /> : <User size={20} />}
                    </div>

                    <div className={`${isAi ? 'max-w-[88%] sm:max-w-[82%]' : 'max-w-[85%] sm:max-w-[70%] text-right'} min-w-0 space-y-3`}>
                      <div className={`flex items-center gap-2 flex-wrap ${isAi ? '' : 'justify-end'}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted truncate min-w-0">
                          {isAi ? 'CalAI Nutrition Assistant' : 'You'}
                        </span>
                        <span className="text-[10px] text-text-muted opacity-50 shrink-0">{msg.timestamp}</span>
                      </div>

                      {isAi && msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
                        <div>
                          <button
                            onClick={() => toggleThinking(msg.id)}
                            className="inline-flex items-center gap-2 rounded-full border border-brand-orange/20 bg-brand-orange/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-brand-orange transition-colors hover:border-brand-orange/40"
                          >
                            <Brain size={13} />
                            <span>Reasoning trace</span>
                            <span className="rounded-full bg-black/20 px-2 py-0.5 text-[9px] text-brand-orange/80">
                              {msg.thinkingSteps.length} steps
                            </span>
                            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className="mt-3 rounded-2xl border border-white/10 bg-[#141414] p-4 text-left">
                                  <div className="mb-4 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/80">
                                      <Brain size={14} className="text-brand-orange" />
                                      Analysis Path
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                                      Runtime trace
                                    </span>
                                  </div>

                                  <div className="space-y-4">
                                    {msg.thinkingSteps.map((step, idx) => {
                                      const meta = getThinkingStatusMeta(step.status);
                                      const StatusIcon = meta.icon;

                                      return (
                                        <div key={idx} className="relative flex gap-3">
                                          {idx < (msg.thinkingSteps?.length ?? 0) - 1 && (
                                            <span className="absolute left-[13px] top-8 h-[calc(100%+0.25rem)] w-px bg-white/10" />
                                          )}
                                          <span className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${meta.dotClass}`}>
                                            <StatusIcon size={14} />
                                          </span>
                                          <div className="min-w-0 flex-1 pb-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="text-sm font-bold text-white">
                                                {step.title || `Step ${step.step}`}
                                              </span>
                                              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-text-muted">
                                                {meta.label}
                                              </span>
                                            </div>
                                            <p className="mt-1 text-xs leading-relaxed text-white/70">
                                              {step.text}
                                            </p>
                                            {step.detail && (
                                              <p className="mt-2 rounded-xl bg-white/[0.04] px-3 py-2 text-[11px] leading-relaxed text-text-muted">
                                                {step.detail}
                                              </p>
                                            )}
                                            {step.evidence && step.evidence.length > 0 && (
                                              <div className="mt-2 flex flex-wrap gap-2">
                                                {step.evidence.slice(0, 6).map((item, evidenceIndex) => (
                                                  <span
                                                    key={evidenceIndex}
                                                    className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/65"
                                                  >
                                                    {item}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {isAi ? (
                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151515] text-left shadow-2xl shadow-black/20">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/80">
                              <Sparkles size={14} className="text-brand-orange" />
                              CalAI Pro Response
                            </div>
                            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                              <Table2 size={12} />
                              Structured
                            </div>
                          </div>
                          <div className="space-y-4 p-5 text-sm">
                            {msg.text ? renderRichText(msg.text, msg.mealConfidence) : null}
                            <div className="flex flex-wrap gap-2">
                              {isAiFallback(msg.text) && (
                                <motion.button
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => retryAiMessage(msg.id)}
                                  disabled={isTyping}
                                  className={`inline-flex items-center gap-2 rounded-full border border-brand-orange/40 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                                    isTyping
                                      ? 'text-text-muted/40 cursor-not-allowed'
                                      : 'text-brand-orange hover:bg-brand-orange/10'
                                  }`}
                                >
                                  <RotateCcw size={14} />
                                  Retry
                                </motion.button>
                              )}
                              {onSavePlanToSchedule && parsePlanFromMarkdown(msg.text) && (
                                <motion.button
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => openSaveModal(msg.text)}
                                  className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-emerald-300 hover:bg-emerald-400/20 transition-colors"
                                >
                                  <CalendarPlus size={14} />
                                  Save to My schedule
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="rounded-3xl rounded-tr-none bg-brand-orange p-5 text-left text-sm font-medium leading-relaxed text-bg-dark [overflow-wrap:anywhere]">
                            {msg.imageUrl && (
                              <img
                                src={msg.imageUrl}
                                alt={msg.imageName || 'Uploaded image'}
                                className={`max-h-64 w-full max-w-sm rounded-2xl object-cover ${msg.text ? 'mb-4' : ''}`}
                              />
                            )}
                            {msg.text && <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{msg.text}</p>}
                          </div>
                          <div className="flex justify-end gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => startEditMessage(msg)}
                              disabled={isTyping}
                              title="Edit this message"
                              className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                                isTyping
                                  ? 'text-text-muted/40 cursor-not-allowed'
                                  : 'text-text-muted hover:text-brand-orange hover:border-brand-orange/30'
                              }`}
                            >
                              <Pencil size={11} />
                              Edit
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => retryUserMessage(msg)}
                              disabled={isTyping}
                              title="Resend this message"
                              className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                                isTyping
                                  ? 'text-text-muted/40 cursor-not-allowed'
                                  : 'text-text-muted hover:text-brand-orange hover:border-brand-orange/30'
                              }`}
                            >
                              <RotateCcw size={11} />
                              Resend
                            </motion.button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-orange/20 text-brand-orange flex items-center justify-center">
                    <Bot size={20} />
                  </div>
                  <div className="w-full max-w-[640px] space-y-3">
                    <button
                      onClick={() => setShowLiveThinking(prev => !prev)}
                      className="inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/10 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-brand-orange transition-colors hover:border-brand-orange/50"
                    >
                      <Brain size={13} className="animate-pulse" />
                      <span>Thinking for {thinkingElapsed}s</span>
                      {showLiveThinking ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>
                    <AnimatePresence>
                      {showLiveThinking && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
                            <div className="space-y-3">
                              {currentPhases.map((phase, idx) => {
                                const isLast = idx === currentPhases.length - 1;
                                return (
                                  <div key={phase.from} className="relative flex gap-3">
                                    {!isLast && (
                                      <span className="absolute left-[13px] top-7 h-[calc(100%-0.25rem)] w-px bg-white/10" />
                                    )}
                                    <span className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                                      isLast
                                        ? 'border-brand-orange/40 bg-brand-orange/10 text-brand-orange'
                                        : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                                    }`}>
                                      {isLast ? (
                                        <CircleDashed size={14} className="animate-spin" />
                                      ) : (
                                        <CheckCircle2 size={14} />
                                      )}
                                    </span>
                                    <p className={`pt-1 text-xs leading-relaxed ${
                                      isLast ? 'text-white/90' : 'text-white/55'
                                    }`}>
                                      {phase.label}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="mt-4 flex items-center gap-2 border-t border-white/5 pt-3 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                              <motion.span
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ repeat: Infinity, duration: 1.2 }}
                                className="h-1.5 w-1.5 rounded-full bg-brand-orange"
                              />
                              Streaming reasoning trace…
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 sm:p-6 lg:p-8 pt-0">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Quick Actions */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {quickActions.map((action, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => !isTyping && setInputText(action)}
                  disabled={isTyping}
                  className={`px-4 py-2 bg-surface-dark border border-white/5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    isTyping
                      ? 'text-text-muted/30 cursor-not-allowed'
                      : 'text-text-muted hover:text-white hover:border-brand-orange/30'
                  }`}
                >
                  {action}
                </motion.button>
              ))}
            </div>

            {/* Input Box */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
            {editingMessage && (
              <div className="flex items-center gap-3 rounded-2xl border border-brand-orange/40 bg-brand-orange/5 px-4 py-3">
                <Pencil size={14} className="shrink-0 text-brand-orange" />
                <div className="min-w-0 flex-1 text-xs">
                  <div className="font-bold uppercase tracking-widest text-brand-orange">Editing message</div>
                  <p className="mt-1 truncate text-text-muted">Press Enter to resend, Esc to cancel.</p>
                </div>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 text-text-muted transition-colors hover:text-white"
                  aria-label="Cancel edit"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {selectedImage && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface-dark p-3">
                <img
                  src={selectedImage.dataUrl}
                  alt={selectedImage.name}
                  className="h-16 w-16 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <ImageIcon size={16} className="shrink-0 text-brand-orange" />
                    <span className="truncate">{selectedImage.name}</span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    {formatFileSize(selectedImage.size)} ready to send
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-text-muted transition-colors hover:text-white"
                  aria-label="Remove selected image"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isTyping}
                  className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center transition-colors ${
                    isTyping ? 'text-text-muted/30 cursor-not-allowed' : 'text-text-muted hover:text-white'
                  }`}
                  aria-label="Upload image"
                >
                  <Plus size={20} />
                </button>
              </div>
              <input
                type="text"
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (editingMessage) submitEdit();
                    else handleSendMessage();
                  } else if (e.key === 'Escape' && editingMessage) {
                    cancelEdit();
                  }
                }}
                placeholder={editingMessage ? 'Edit your message and press Enter to resend...' : (selectedImage ? 'Add a note for this image...' : 'Ask CalAI anything...')}
                disabled={isTyping}
                className={`w-full bg-surface-dark border rounded-2xl py-6 pl-16 pr-16 text-sm transition-colors ${
                  editingMessage ? 'border-brand-orange/60 focus:border-brand-orange' : 'border-white/10 focus:outline-none focus:border-brand-orange/50'
                } ${isTyping ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => editingMessage ? submitEdit() : handleSendMessage()}
                  disabled={(!inputText.trim() && !selectedImage) || isTyping}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    (inputText.trim() || selectedImage) && !isTyping ? 'bg-brand-orange text-bg-dark' : 'bg-white/5 text-text-muted'
                  }`}
                >
                  <Send size={20} />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {pendingSave && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSaveModal}
              className="absolute inset-0 bg-bg-dark/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-surface-dark p-7 rounded-3xl border border-white/10 max-w-lg w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-400/10 text-emerald-300 flex items-center justify-center">
                  <CalendarPlus size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Save to My schedule</h3>
                  <p className="text-xs text-text-muted">{pendingSave.parsed.items.length} meal{pendingSave.parsed.items.length === 1 ? '' : 's'} detected · ~{pendingSave.parsed.totalKcal} kcal</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Schedule name</label>
                  <input
                    type="text"
                    value={saveForm.name}
                    onChange={(e) => setSaveForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-orange transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Start date</label>
                    <input
                      type="date"
                      value={saveForm.startDate}
                      min={todayISO()}
                      onChange={(e) => {
                        const next = e.target.value;
                        const minISO = todayISO();
                        const clamped = next && next < minISO ? minISO : next;
                        setSaveForm(prev => ({
                          ...prev,
                          startDate: clamped,
                          endDate: prev.endDate && prev.endDate < clamped ? clamped : prev.endDate,
                        }));
                      }}
                      className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-orange transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">End date</label>
                    <input
                      type="date"
                      value={saveForm.endDate}
                      min={saveForm.startDate || todayISO()}
                      onChange={(e) => setSaveForm(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-orange transition-colors"
                    />
                  </div>
                </div>
                {(() => {
                  const startMs = new Date(`${saveForm.startDate}T00:00:00`).getTime();
                  const endMs = new Date(`${saveForm.endDate}T00:00:00`).getTime();
                  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
                  const days = Math.round((endMs - startMs) / 86400000) + 1;
                  if (days <= 0) return <p className="text-[11px] text-red-400">End date must be on or after start date.</p>;
                  return (
                    <p className={`text-[11px] ${days > 60 ? 'text-red-400' : 'text-text-muted'}`}>
                      Duration: {days} day{days === 1 ? '' : 's'}{days > 60 ? ' — too long, max 60 days' : days === 7 ? ' (1 week)' : days === 14 ? ' (2 weeks)' : ''}
                    </p>
                  );
                })()}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Color</label>
                  <div className="flex gap-2">
                    {['#FB923C', '#34D399', '#A78BFA', '#F472B6', '#60A5FA', '#FBBF24'].map(c => (
                      <button
                        key={c}
                        onClick={() => setSaveForm(prev => ({ ...prev, color: c }))}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${saveForm.color === c ? 'border-white scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {saveError && (
                <p className="text-red-400 text-xs mt-4">{saveError}</p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeSaveModal}
                  disabled={savingPlan}
                  className="flex-1 py-3 rounded-2xl font-bold bg-white/5 hover:bg-white/10 text-sm transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSavePlan}
                  disabled={savingPlan}
                  className="flex-1 py-3 rounded-2xl font-bold text-sm bg-emerald-400 hover:bg-emerald-300 text-bg-dark transition-colors disabled:opacity-50"
                >
                  {savingPlan ? 'Saving…' : 'Save schedule'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
