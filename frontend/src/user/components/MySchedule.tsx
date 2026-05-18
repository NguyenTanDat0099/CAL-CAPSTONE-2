import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays, Trophy, Trash2, X, ChevronLeft, ChevronRight,
  ListTree, GanttChart, Flame, Zap, Droplets, Heart, MessageSquareText,
  ZoomIn, ZoomOut, Plus, Bell, Pencil,
} from 'lucide-react';
import { MealSchedule, ScheduleItem, MealType } from '../types';
import { buildApiUrl } from '../../config/api';

interface CatalogFood {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string | null;
}

const SCHED_AUTH_TOKEN_KEY = 'calai_token';
const schedGetAuthHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem(SCHED_AUTH_TOKEN_KEY) || localStorage.getItem(SCHED_AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

interface MyScheduleProps {
  schedules: MealSchedule[];
  onUpdate: (scheduleId: number, patch: Partial<Pick<MealSchedule, 'name' | 'description' | 'startDate' | 'endDate' | 'color' | 'targetCalories' | 'achieved'>> & { items?: ScheduleItem[] }) => Promise<void>;
  onDelete: (scheduleId: number) => Promise<void>;
  onCreate: (payload: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    color?: string;
    targetCalories?: number;
    source: 'manual' | 'chat';
    items?: ScheduleItem[];
  }) => Promise<MealSchedule>;
}

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const DEFAULT_TIME_BY_MEAL: Record<MealType, string> = {
  breakfast: '07:30',
  lunch: '12:00',
  dinner: '19:00',
  snack: '15:30',
};

const SCHEDULE_PALETTE = ['#FB923C', '#34D399', '#A78BFA', '#F472B6', '#60A5FA', '#FBBF24'];

const DAY_MS = 24 * 60 * 60 * 1000;

const parseDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date : new Date();
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const monthLabel = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const dayDelta = (a: Date, b: Date) =>
  Math.round((a.getTime() - b.getTime()) / DAY_MS);

const SOURCE_LABEL: Record<MealSchedule['source'], string> = {
  manual: 'Manual',
  chat: 'From CalAI chat',
  shared: 'Shared',
};

export function MySchedule({ schedules, onUpdate, onDelete, onCreate }: MyScheduleProps) {
  const [view, setView] = useState<'list' | 'timeline'>('timeline');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const selected = useMemo(
    () => (selectedId == null ? null : schedules.find(s => s.scheduleId === selectedId) ?? null),
    [selectedId, schedules]
  );
  const confirmDelete = useMemo(
    () => (confirmDeleteId == null ? null : schedules.find(s => s.scheduleId === confirmDeleteId) ?? null),
    [confirmDeleteId, schedules]
  );
  const editing = useMemo(
    () => (editingId == null ? null : schedules.find(s => s.scheduleId === editingId) ?? null),
    [editingId, schedules]
  );

  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const [timelineMonth, setTimelineMonth] = useState<Date>(() => startOfMonth(today));

  const sorted = useMemo(
    () =>
      [...schedules].sort((a, b) =>
        parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime()
      ),
    [schedules]
  );

  const handleDelete = async (schedule: MealSchedule) => {
    setBusyId(schedule.scheduleId);
    try {
      await onDelete(schedule.scheduleId);
      setConfirmDeleteId(null);
      if (selectedId === schedule.scheduleId) setSelectedId(null);
    } finally {
      setBusyId(null);
    }
  };

  const handleAchieved = async (schedule: MealSchedule) => {
    setBusyId(schedule.scheduleId);
    try {
      await onUpdate(schedule.scheduleId, { achieved: !schedule.achieved });
    } finally {
      setBusyId(null);
    }
  };

  const isEmpty = schedules.length === 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold mb-1">My schedule</h2>
          <p className="text-text-muted text-sm">
            Track your meal plans over time. Plan it from chat or create one manually.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold bg-brand-orange text-bg-dark hover:bg-brand-orange-dark transition-colors"
          >
            <Plus size={14} />
            Create schedule
          </button>
          <div className="flex items-center gap-2 bg-surface-dark border border-white/5 rounded-2xl p-1">
            <button
              onClick={() => setView('timeline')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
                view === 'timeline' ? 'bg-brand-orange text-bg-dark' : 'text-text-muted hover:text-white'
              }`}
            >
              <GanttChart size={14} />
              Timeline
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
                view === 'list' ? 'bg-brand-orange text-bg-dark' : 'text-text-muted hover:text-white'
              }`}
            >
              <ListTree size={14} />
              List
            </button>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted bg-surface-dark/30 rounded-[3rem] border border-dashed border-white/10">
          <CalendarDays size={48} className="mb-4 opacity-20" />
          <p className="font-medium">No meal schedules yet.</p>
          <p className="text-sm opacity-60 max-w-md text-center mt-2">
            Tap <span className="text-brand-orange font-bold">Create schedule</span> to plan your own, or ask CalAI to plan one in chat and save it from there.
          </p>
        </div>
      ) : view === 'timeline' ? (
        <TimelineView
          schedules={sorted}
          today={today}
          monthAnchor={timelineMonth}
          setMonthAnchor={setTimelineMonth}
          onSelect={(s) => setSelectedId(s.scheduleId)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sorted.map(schedule => (
            <ScheduleCard
              key={schedule.scheduleId}
              schedule={schedule}
              today={today}
              onClick={() => setSelectedId(schedule.scheduleId)}
              onAchieved={() => handleAchieved(schedule)}
              onDelete={() => setConfirmDeleteId(schedule.scheduleId)}
              busy={busyId === schedule.scheduleId}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <ScheduleDetailModal
            schedule={selected}
            today={today}
            onClose={() => setSelectedId(null)}
            onAchieved={() => handleAchieved(selected)}
            onDelete={() => setConfirmDeleteId(selected.scheduleId)}
            onEdit={() => { setEditingId(selected.scheduleId); setSelectedId(null); }}
          />
        )}
        {editing && (
          <CreateScheduleModal
            editingSchedule={editing}
            onClose={() => setEditingId(null)}
            onCreate={onCreate}
            onUpdate={async (id, patch) => {
              setBusyId(id);
              try {
                await onUpdate(id, patch);
                setEditingId(null);
              } finally {
                setBusyId(null);
              }
            }}
          />
        )}
        {confirmDelete && (
          <ConfirmModal
            title="Delete this schedule?"
            description={`"${confirmDelete.name}" will be removed permanently. This cannot be undone.`}
            confirmLabel="Delete"
            confirmStyle="danger"
            onCancel={() => setConfirmDeleteId(null)}
            onConfirm={() => handleDelete(confirmDelete)}
            busy={busyId === confirmDelete.scheduleId}
          />
        )}
        {createOpen && (
          <CreateScheduleModal
            onClose={() => setCreateOpen(false)}
            onCreate={onCreate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface ScheduleCardProps {
  schedule: MealSchedule;
  today: Date;
  onClick: () => void;
  onAchieved: () => void;
  onDelete: () => void;
  busy: boolean;
}

function ScheduleCard({ schedule, today, onClick, onAchieved, onDelete, busy }: ScheduleCardProps) {
  const start = parseDate(schedule.startDate);
  const end = parseDate(schedule.endDate);
  const totalDays = Math.max(1, dayDelta(end, start) + 1);
  const elapsed = Math.min(totalDays, Math.max(0, dayDelta(today, start) + 1));
  const percent = Math.round((elapsed / totalDays) * 100);
  const totalKcal = schedule.items.reduce((sum, item) => sum + (item.calories ?? 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="bg-surface-dark rounded-3xl overflow-hidden border border-white/5 group cursor-pointer hover:border-white/15 transition-colors"
    >
      <div className="h-2" style={{ backgroundColor: schedule.color }} />
      <div className="p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold truncate">{schedule.name}</h3>
            <p className="text-[10px] uppercase tracking-widest text-text-muted mt-1">
              {SOURCE_LABEL[schedule.source]} · {totalDays} day{totalDays === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {schedule.achieved && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 rounded-full px-2 py-0.5">
                <Trophy size={10} />
                Achieved
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-text-muted mb-4">
          {formatDate(start)} → {formatDate(end)}
        </p>

        {schedule.description && (
          <p className="text-sm text-text-muted mb-4 h-10 overflow-hidden">
            {schedule.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-bg-dark rounded-2xl p-3 border border-white/5">
            <p className="text-[9px] text-text-muted uppercase tracking-widest font-black">Total kcal</p>
            <p className="text-sm font-black mt-1">
              {totalKcal > 0 ? totalKcal.toLocaleString() : '—'}
            </p>
          </div>
          <div className="bg-bg-dark rounded-2xl p-3 border border-white/5">
            <p className="text-[9px] text-text-muted uppercase tracking-widest font-black">Items</p>
            <p className="text-sm font-black mt-1">{schedule.items.length}</p>
          </div>
        </div>

        <div className="mb-5">
          <div className="flex justify-between text-[10px] text-text-muted mb-1">
            <span>Progress</span>
            <span>{percent}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full" style={{ width: `${percent}%`, backgroundColor: schedule.color }} />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-4 border-t border-white/5">
          <button
            onClick={(e) => { e.stopPropagation(); onAchieved(); }}
            disabled={busy}
            className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 rounded-xl transition-colors disabled:opacity-50 ${
              schedule.achieved
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-white/5 hover:bg-white/10 text-white'
            }`}
          >
            <Trophy size={12} />
            {schedule.achieved ? 'Unmark' : 'Achieved'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            disabled={busy}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface TimelineViewProps {
  schedules: MealSchedule[];
  today: Date;
  monthAnchor: Date;
  setMonthAnchor: (date: Date) => void;
  onSelect: (schedule: MealSchedule) => void;
}

const ZOOM_PRESETS = [
  { label: 'Compact', dayWidth: 14, monthSpan: 3 },
  { label: 'Default', dayWidth: 26, monthSpan: 2 },
  { label: 'Wide', dayWidth: 40, monthSpan: 1 },
  { label: 'Detailed', dayWidth: 60, monthSpan: 1 },
];

function TimelineView({ schedules, today, monthAnchor, setMonthAnchor, onSelect }: TimelineViewProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const preset = ZOOM_PRESETS[zoomLevel];
  const baseDayWidth = preset.dayWidth;
  const monthSpan = preset.monthSpan;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const months = useMemo(() => {
    return Array.from({ length: monthSpan }, (_, offset) => {
      const m = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + offset, 1);
      return {
        start: m,
        end: endOfMonth(m),
      };
    });
  }, [monthAnchor, monthSpan]);

  const rangeStart = months[0].start;
  const rangeEnd = months[months.length - 1].end;
  const totalDays = dayDelta(rangeEnd, rangeStart) + 1;
  const laneHeight = 44;
  const lanePadTop = 18;
  const naturalWidth = totalDays * baseDayWidth;
  // Stretch day cells to fill container when zoomed-out content is narrower than viewport
  const dayWidth = containerWidth > naturalWidth && containerWidth > 0
    ? containerWidth / totalDays
    : baseDayWidth;
  const totalWidth = totalDays * dayWidth;

  // Mouse-wheel zoom (Ctrl/Cmd + wheel changes zoom; plain wheel scrolls normally)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (e.deltaY < 0) {
        setZoomLevel(prev => Math.min(ZOOM_PRESETS.length - 1, prev + 1));
      } else if (e.deltaY > 0) {
        setZoomLevel(prev => Math.max(0, prev - 1));
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const dayMarkers = useMemo(() => {
    const markers: Array<{ date: Date; label: string; weekday: string }> = [];
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(rangeStart.getTime() + i * DAY_MS);
      markers.push({
        date,
        label: String(date.getDate()),
        weekday: date.toLocaleDateString('en-US', { weekday: 'narrow' }),
      });
    }
    return markers;
  }, [rangeStart, totalDays]);

  const todayOffset = dayDelta(today, rangeStart);
  const visible = schedules.filter(s => {
    const start = parseDate(s.startDate);
    const end = parseDate(s.endDate);
    return end >= rangeStart && start <= rangeEnd;
  });

  return (
    <div className="bg-surface-dark/60 rounded-[2.5rem] border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            title="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            title="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          onClick={() => setMonthAnchor(startOfMonth(today))}
          className="text-xs font-bold text-text-muted hover:text-white transition-colors uppercase tracking-widest"
        >
          Jump to today
        </button>
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
          <button
            onClick={() => setZoomLevel(prev => Math.max(0, prev - 1))}
            disabled={zoomLevel === 0}
            className={`p-1.5 rounded-full transition-colors ${zoomLevel === 0 ? 'text-text-muted/30 cursor-not-allowed' : 'text-text-muted hover:text-brand-orange hover:bg-white/5'}`}
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="px-2 text-[10px] font-black uppercase tracking-widest text-text-muted">
            {preset.label}
          </span>
          <button
            onClick={() => setZoomLevel(prev => Math.min(ZOOM_PRESETS.length - 1, prev + 1))}
            disabled={zoomLevel === ZOOM_PRESETS.length - 1}
            className={`p-1.5 rounded-full transition-colors ${zoomLevel === ZOOM_PRESETS.length - 1 ? 'text-text-muted/30 cursor-not-allowed' : 'text-text-muted hover:text-brand-orange hover:bg-white/5'}`}
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="overflow-x-auto overflow-y-auto max-h-[65vh]">
        <div style={{ width: totalWidth, minWidth: '100%' }} className="relative">
          {/* Month headers */}
          <div className="flex border-b border-white/10 bg-bg-dark/60 sticky top-0 z-10">
            {months.map(month => {
              const days = dayDelta(month.end, month.start) + 1;
              return (
                <div
                  key={month.start.toISOString()}
                  className="flex items-center gap-2 px-3 py-2.5 border-r border-white/5"
                  style={{ width: days * dayWidth }}
                >
                  <CalendarDays size={12} className="text-brand-orange" />
                  <span className="text-xs font-black uppercase tracking-widest">
                    {monthLabel(month.start)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Day grid */}
          <div className="flex border-b border-white/5">
            {dayMarkers.map((marker, idx) => {
              const isToday = dayDelta(marker.date, today) === 0;
              const isWeekend = marker.date.getDay() === 0 || marker.date.getDay() === 6;
              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center justify-center py-2 border-r border-white/5 text-[9px] ${
                    isToday ? 'bg-brand-orange/15 text-brand-orange font-black' : isWeekend ? 'text-text-muted/60 bg-bg-dark/40' : 'text-text-muted'
                  }`}
                  style={{ width: dayWidth }}
                >
                  <span className="uppercase tracking-widest">{marker.weekday}</span>
                  <span className={`font-black text-[12px] leading-tight ${isToday ? 'text-brand-orange' : 'text-white/80'}`}>
                    {marker.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Schedule bars */}
          <div
            className="relative"
            style={{
              minHeight: Math.max(360, lanePadTop * 2 + Math.max(visible.length, 4) * laneHeight),
            }}
          >
            {/* Lane background guides */}
            <div className="absolute inset-0 flex flex-col">
              {Array.from({ length: Math.max(visible.length, 4) }).map((_, idx) => (
                <div
                  key={idx}
                  className={`border-b border-white/5 ${idx % 2 === 0 ? 'bg-bg-dark/20' : ''}`}
                  style={{ height: laneHeight, marginTop: idx === 0 ? lanePadTop : 0 }}
                />
              ))}
            </div>

            {/* Weekend column shading */}
            <div className="absolute inset-0 flex pointer-events-none">
              {dayMarkers.map((marker, idx) => {
                const isWeekend = marker.date.getDay() === 0 || marker.date.getDay() === 6;
                return (
                  <div
                    key={idx}
                    className={isWeekend ? 'bg-bg-dark/30' : ''}
                    style={{ width: dayWidth }}
                  />
                );
              })}
            </div>

            {todayOffset >= 0 && todayOffset < totalDays && (
              <div
                className="absolute top-0 bottom-0 w-px bg-brand-orange/60 z-10 pointer-events-none"
                style={{ left: todayOffset * dayWidth + dayWidth / 2 }}
              />
            )}

            {visible.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">
                No schedules in this date range. Use ◀ ▶ to navigate.
              </div>
            ) : (
              visible.map((schedule, laneIdx) => {
                const start = parseDate(schedule.startDate);
                const end = parseDate(schedule.endDate);
                const offset = Math.max(0, dayDelta(start, rangeStart));
                const span = Math.min(totalDays - offset, dayDelta(end, start) + 1);
                if (span <= 0) return null;
                const left = offset * dayWidth + 3;
                const width = span * dayWidth - 6;
                return (
                  <button
                    key={schedule.scheduleId}
                    onClick={() => onSelect(schedule)}
                    className="absolute h-9 rounded-full px-3.5 flex items-center gap-2 text-[11px] font-bold text-white shadow-lg shadow-black/30 hover:scale-[1.02] transition-transform overflow-hidden"
                    style={{
                      left,
                      width,
                      top: lanePadTop + laneIdx * laneHeight + (laneHeight - 36) / 2,
                      backgroundColor: schedule.color,
                    }}
                  >
                    {schedule.source === 'chat' && <MessageSquareText size={12} className="shrink-0" />}
                    {schedule.achieved && <Trophy size={12} className="shrink-0" />}
                    <span className="truncate text-left flex-1">{schedule.name}</span>
                    <span className="text-[10px] opacity-80 shrink-0">{span}d</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ScheduleDetailProps {
  schedule: MealSchedule;
  today: Date;
  onClose: () => void;
  onAchieved: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function ScheduleDetailModal({ schedule, today, onClose, onAchieved, onDelete, onEdit }: ScheduleDetailProps) {
  const start = parseDate(schedule.startDate);
  const end = parseDate(schedule.endDate);
  const totalDays = Math.max(1, dayDelta(end, start) + 1);
  const elapsed = Math.min(totalDays, Math.max(0, dayDelta(today, start) + 1));
  const totals = schedule.items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + (item.calories ?? 0),
      protein: acc.protein + (item.protein ?? 0),
      carbs: acc.carbs + (item.carbs ?? 0),
      fat: acc.fat + (item.fat ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const grouped = schedule.items.reduce<Record<number, typeof schedule.items>>((acc, item) => {
    const day = item.dayOffset ?? 0;
    if (!acc[day]) acc[day] = [];
    acc[day].push(item);
    return acc;
  }, {});
  const dayKeys = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-bg-dark/90 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-surface-dark rounded-[2rem] border border-white/10 max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="h-2" style={{ backgroundColor: schedule.color }} />
        <div className="px-8 py-6 border-b border-white/5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">
              {SOURCE_LABEL[schedule.source]}
            </p>
            <h2 className="text-2xl font-black truncate">{schedule.name}</h2>
            <p className="text-text-muted text-sm mt-1">
              {formatDate(start)} → {formatDate(end)} · {totalDays} day{totalDays === 1 ? '' : 's'} · day {Math.max(1, elapsed)} of {totalDays}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-8 space-y-6">
          {schedule.description && (
            <p className="text-text-muted leading-relaxed">{schedule.description}</p>
          )}

          <div className="grid grid-cols-4 gap-3">
            <StatTile icon={<Flame size={16} />} label="kcal" value={totals.kcal > 0 ? totals.kcal.toLocaleString() : '—'} accent="text-brand-orange" />
            <StatTile icon={<Zap size={16} />} label="Protein" value={totals.protein > 0 ? `${Math.round(totals.protein)}g` : '—'} accent="text-emerald-400" />
            <StatTile icon={<Droplets size={16} />} label="Carbs" value={totals.carbs > 0 ? `${Math.round(totals.carbs)}g` : '—'} accent="text-yellow-400" />
            <StatTile icon={<Heart size={16} />} label="Fat" value={totals.fat > 0 ? `${Math.round(totals.fat)}g` : '—'} accent="text-rose-400" />
          </div>

          {schedule.items.length === 0 ? (
            <div className="py-10 text-center text-text-muted text-sm">
              This schedule has no detailed meals yet.
            </div>
          ) : (
            <div className="space-y-4">
              {dayKeys.map(day => (
                <div key={day} className="bg-bg-dark/60 rounded-2xl border border-white/5 p-5">
                  <p className="text-[10px] uppercase tracking-widest text-text-muted font-black mb-3">
                    Day {day + 1}
                  </p>
                  <div className="space-y-2">
                    {grouped[day].map((item, idx) => (
                      <div key={item.itemId ?? idx} className="flex items-center justify-between text-sm">
                        <div className="min-w-0">
                          <p className="font-bold truncate">{item.name}</p>
                          <p className="text-[10px] uppercase tracking-widest text-text-muted">
                            {item.mealType}{item.serving ? ` · ${item.serving}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-text-muted shrink-0 ml-4">
                          {item.calories != null && <span><span className="text-white font-bold">{Math.round(item.calories)}</span> kcal</span>}
                          {item.protein != null && <span>P {Math.round(item.protein)}g</span>}
                          {item.carbs != null && <span>C {Math.round(item.carbs)}g</span>}
                          {item.fat != null && <span>F {Math.round(item.fat)}g</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-white/5 flex items-center justify-between gap-3 bg-bg-dark/40">
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
          >
            <Trash2 size={14} />
            Delete
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 text-white transition-colors"
            >
              <Pencil size={14} />
              Edit
            </button>
            <button
              onClick={onAchieved}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                schedule.achieved
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-white'
              }`}
            >
              <Trophy size={14} />
              {schedule.achieved ? 'Unmark achieved' : 'Mark achieved'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function StatTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="bg-bg-dark/60 rounded-2xl p-4 border border-white/5">
      <div className={`flex items-center gap-2 ${accent} mb-2`}>
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}

interface ConfirmModalProps {
  title: string;
  description: string;
  confirmLabel: string;
  confirmStyle: 'danger' | 'primary' | 'neutral';
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}

function ConfirmModal({ title, description, confirmLabel, confirmStyle, onCancel, onConfirm, busy }: ConfirmModalProps) {
  const confirmClass =
    confirmStyle === 'danger'
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : confirmStyle === 'primary'
      ? 'bg-brand-orange hover:bg-brand-orange-dark text-bg-dark'
      : 'bg-white/10 hover:bg-white/20 text-white';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-bg-dark/90 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-surface-dark p-7 rounded-3xl border border-white/10 max-w-md w-full shadow-2xl"
      >
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <p className="text-text-muted leading-relaxed mb-7 text-sm">{description}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-3 rounded-2xl font-bold bg-white/5 hover:bg-white/10 text-sm transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-colors disabled:opacity-50 ${confirmClass}`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface CreateScheduleModalProps {
  onClose: () => void;
  onCreate: MyScheduleProps['onCreate'];
  // Khi truyền → modal hoạt động ở chế độ Edit, prefill từ schedule này.
  editingSchedule?: MealSchedule;
  onUpdate?: MyScheduleProps['onUpdate'];
}

interface DraftItem {
  key: string;
  dayOffset: number;
  mealType: MealType;
  scheduledTime: string;
  name: string;
  serving: string;
  calories: string;
  // Macros được lưu dạng string để dùng <input type="number"> như calories.
  // Catalog autocomplete fill số → chuyển sang String khi set state.
  // Empty string = không có giá trị (gửi null lên backend).
  protein: string;
  carbs: string;
  fat: string;
}

const newDraftItem = (dayOffset = 0, mealType: MealType = 'breakfast'): DraftItem => ({
  key: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  dayOffset,
  mealType,
  scheduledTime: DEFAULT_TIME_BY_MEAL[mealType],
  name: '',
  serving: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
});

function CreateScheduleModal({ onClose, onCreate, editingSchedule, onUpdate }: CreateScheduleModalProps) {
  const isEdit = Boolean(editingSchedule);
  // Trong edit mode cho phép giữ ngày cũ kể cả khi đã qua. Trong create mode
  // mới chặn không cho chọn quá khứ.
  const minDate = isEdit ? '' : todayISO();
  const [name, setName] = useState(editingSchedule?.name ?? '');
  const [description, setDescription] = useState(editingSchedule?.description ?? '');
  const [startDate, setStartDate] = useState(editingSchedule?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(editingSchedule?.endDate ?? todayISO());
  const [color, setColor] = useState(editingSchedule?.color ?? SCHEDULE_PALETTE[0]);
  const [items, setItems] = useState<DraftItem[]>(() => {
    if (!editingSchedule || editingSchedule.items.length === 0) return [newDraftItem()];
    return editingSchedule.items.map((it, i) => ({
      key: `existing-${it.itemId ?? i}-${i}`,
      dayOffset: it.dayOffset ?? 0,
      mealType: it.mealType,
      scheduledTime: (it.scheduledTime ?? '').slice(0, 5) || DEFAULT_TIME_BY_MEAL[it.mealType],
      name: it.name,
      serving: it.serving ?? '',
      calories: it.calories != null ? String(it.calories) : '',
      protein: it.protein != null ? String(it.protein) : '',
      carbs: it.carbs != null ? String(it.carbs) : '',
      fat: it.fat != null ? String(it.fat) : '',
    }));
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Food catalog cho autocomplete Dish Name. Load 1 lần khi modal mở.
  const [catalog, setCatalog] = useState<CatalogFood[]>([]);
  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(buildApiUrl('/users/foods/search?limit=20000'), {
          headers: schedGetAuthHeaders(),
        });
        if (!res.ok) return;
        const result = await res.json();
        if (cancelled) return;
        const rows = (result.data ?? []) as Array<{
          id: number; name: string;
          calories?: number; protein?: number; carbs?: number; fats?: number;
          servingSize?: string | null;
        }>;
        setCatalog(rows.map((r) => ({
          id: r.id,
          name: r.name,
          calories: Math.round(Number(r.calories ?? 0)),
          protein: Math.round(Number(r.protein ?? 0)),
          carbs: Math.round(Number(r.carbs ?? 0)),
          fat: Math.round(Number(r.fats ?? 0)),  // API trả 'fats' plural, ScheduleItem dùng 'fat'
          servingSize: r.servingSize ?? null,
        })));
      } catch {
        // autocomplete là optional, lỗi thì user vẫn gõ tay được
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const totalDays = useMemo(() => {
    const startMs = new Date(`${startDate}T00:00:00`).getTime();
    const endMs = new Date(`${endDate}T00:00:00`).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
    return Math.round((endMs - startMs) / 86400000) + 1;
  }, [startDate, endDate]);

  const totalKcal = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.calories) || 0), 0),
    [items]
  );

  const updateItem = (key: string, patch: Partial<DraftItem>) => {
    setItems(prev => prev.map(it => (it.key === key ? { ...it, ...patch } : it)));
  };

  const removeItem = (key: string) => {
    setItems(prev => (prev.length <= 1 ? prev : prev.filter(it => it.key !== key)));
  };

  const addItem = () => {
    setItems(prev => [...prev, newDraftItem()]);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Please enter a schedule name.'); return; }
    if (!isEdit && startDate < minDate) { setError('Start date cannot be in the past.'); return; }
    if (startDate > endDate) { setError('End date must be on or after start date.'); return; }
    if (totalDays > 60) { setError('Schedule cannot exceed 60 days.'); return; }
    const cleaned = items
      .map(it => ({ ...it, name: it.name.trim() }))
      .filter(it => it.name.length > 0);
    if (cleaned.length === 0) { setError('Add at least one meal item.'); return; }
    const outOfRange = cleaned.find(it => it.dayOffset < 0 || it.dayOffset >= totalDays);
    if (outOfRange) { setError(`Item "${outOfRange.name}" is on day ${outOfRange.dayOffset + 1}, which is outside the schedule's ${totalDays} day(s).`); return; }

    const parseMacro = (raw: string): number | null => {
      const trimmed = raw.trim();
      if (!trimmed) return null;
      const num = Number(trimmed);
      return Number.isFinite(num) ? num : null;
    };

    const itemsPayload = cleaned.map((it, idx) => ({
      dayOffset: it.dayOffset,
      mealType: it.mealType,
      scheduledTime: it.scheduledTime || null,
      name: it.name,
      serving: it.serving.trim() || null,
      calories: parseMacro(it.calories),
      protein: parseMacro(it.protein),
      carbs: parseMacro(it.carbs),
      fat: parseMacro(it.fat),
      sortOrder: idx,
    }));

    setSaving(true);
    setError('');
    try {
      if (isEdit && editingSchedule && onUpdate) {
        await onUpdate(editingSchedule.scheduleId, {
          name: name.trim(),
          description: description.trim() || null,
          startDate,
          endDate,
          color,
          targetCalories: totalKcal > 0 ? Math.round(totalKcal) : null,
          items: itemsPayload as unknown as ScheduleItem[],
        });
      } else {
        await onCreate({
          name: name.trim(),
          description: description.trim() || undefined,
          startDate,
          endDate,
          color,
          targetCalories: totalKcal > 0 ? Math.round(totalKcal) : undefined,
          source: 'manual',
          items: itemsPayload,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : (isEdit ? 'Failed to save changes.' : 'Failed to create schedule.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-bg-dark/90 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-surface-dark rounded-[2rem] border border-white/10 max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="h-2" style={{ backgroundColor: color }} />
        <div className="px-8 py-6 border-b border-white/5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">{isEdit ? 'Edit' : 'Manual'}</p>
            <h2 className="text-2xl font-black">{isEdit ? 'Edit schedule' : 'Create schedule'}</h2>
            <p className="text-text-muted text-sm mt-1">
              {isEdit
                ? 'Sửa thông tin và các món. Save sẽ ghi đè danh sách món hiện tại.'
                : "Pick your meals, days and times. We'll remind you when each one is up."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-8 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. High-protein week"
                className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-orange transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Start date</label>
              <input
                type="date"
                value={startDate}
                min={minDate}
                onChange={(e) => {
                  const next = e.target.value;
                  const clamped = next && next < minDate ? minDate : next;
                  setStartDate(clamped);
                  if (endDate < clamped) setEndDate(clamped);
                }}
                className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-orange transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">End date</label>
              <input
                type="date"
                value={endDate}
                min={startDate || minDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-orange transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Notes (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this plan for?"
                className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-orange transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {SCHEDULE_PALETTE.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold">Meals</p>
                <p className="text-[11px] text-text-muted">
                  {totalDays > 0 ? `${totalDays} day${totalDays === 1 ? '' : 's'} · ` : ''}
                  {items.length} item{items.length === 1 ? '' : 's'}
                  {totalKcal > 0 ? ` · ~${Math.round(totalKcal)} kcal` : ''}
                </p>
              </div>
              <button
                onClick={addItem}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Plus size={12} /> Add meal
              </button>
            </div>
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={it.key} className="bg-bg-dark/60 border border-white/5 rounded-2xl p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <div className="md:col-span-5 relative">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-text-muted mb-1">Dish name</label>
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) => {
                          updateItem(it.key, { name: e.target.value });
                          setOpenDropdownKey(it.key);
                        }}
                        onFocus={() => setOpenDropdownKey(it.key)}
                        onBlur={() => {
                          // Delay đóng để click vào suggestion kịp fire.
                          setTimeout(() => setOpenDropdownKey((prev) => (prev === it.key ? null : prev)), 150);
                        }}
                        placeholder={idx === 0 ? 'e.g. Cơm gà, Phở bò...' : 'Dish name'}
                        className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-orange transition-colors"
                        autoComplete="off"
                      />
                      {openDropdownKey === it.key && it.name.trim().length > 0 && (() => {
                        const q = it.name.trim().toLowerCase();
                        // Xếp hạng theo độ liên quan để "Cơm gà" lên trên
                        // "Bánh Bông Lan Bằng Nồi Cơm Điện" khi user gõ "cơm".
                        //   exact match     → 1000
                        //   starts với q    → 100   (vd "Cơm gà")
                        //   1 từ bắt đầu q  → 50    (vd "Phở Cơm tấm")
                        //   chứa q          → 10    (vd "...Nồi Cơm...")
                        const scoreOf = (name: string): number => {
                          const n = name.toLowerCase();
                          if (n === q) return 1000;
                          if (n.startsWith(q)) return 100;
                          const words = n.split(/[\s,()\/\-]+/).filter(Boolean);
                          if (words.some((w) => w.startsWith(q))) return 50;
                          if (n.includes(q)) return 10;
                          return 0;
                        };
                        const matches = catalog
                          .map((f) => ({ food: f, score: scoreOf(f.name) }))
                          .filter((x) => x.score > 0)
                          .sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name))
                          .slice(0, 8)
                          .map((x) => x.food);
                        if (matches.length === 0) return null;
                        return (
                          <div className="absolute z-30 left-0 right-0 mt-1 bg-surface-dark border border-white/10 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                            {matches.map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); }}
                                onClick={() => {
                                  updateItem(it.key, {
                                    name: f.name,
                                    serving: f.servingSize || '',
                                    calories: f.calories > 0 ? String(f.calories) : '',
                                    protein: f.protein > 0 ? String(f.protein) : '',
                                    carbs: f.carbs > 0 ? String(f.carbs) : '',
                                    fat: f.fat > 0 ? String(f.fat) : '',
                                  });
                                  setOpenDropdownKey(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 cursor-pointer"
                              >
                                <p className="text-sm font-bold text-white truncate">{f.name}</p>
                                <p className="text-[10px] text-text-muted">
                                  {f.servingSize || '—'}
                                  {f.calories > 0 && <span className="text-brand-orange ml-2">{f.calories} kcal</span>}
                                </p>
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-text-muted mb-1">Slot</label>
                      <select
                        value={it.mealType}
                        onChange={(e) => {
                          const next = e.target.value as MealType;
                          updateItem(it.key, {
                            mealType: next,
                            scheduledTime: it.scheduledTime || DEFAULT_TIME_BY_MEAL[next],
                          });
                        }}
                        className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-orange transition-colors"
                      >
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner">Dinner</option>
                        <option value="snack">Snack</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-text-muted mb-1">Time</label>
                      <input
                        type="time"
                        value={it.scheduledTime}
                        onChange={(e) => updateItem(it.key, { scheduledTime: e.target.value })}
                        className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-orange transition-colors"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-text-muted mb-1">Day</label>
                      <input
                        type="number"
                        min={1}
                        max={Math.max(1, totalDays)}
                        value={it.dayOffset + 1}
                        onChange={(e) => {
                          const num = Math.max(1, Number(e.target.value) || 1);
                          updateItem(it.key, { dayOffset: num - 1 });
                        }}
                        className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-orange transition-colors"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-12 gap-2">
                    <div className="col-span-2 md:col-span-4">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-text-muted mb-1">Serving (optional)</label>
                      <input
                        type="text"
                        value={it.serving}
                        onChange={(e) => updateItem(it.key, { serving: e.target.value })}
                        placeholder="e.g. 1 bowl, 200g"
                        className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-orange transition-colors"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-text-muted mb-1">Calories</label>
                      <input
                        type="number"
                        min={0}
                        value={it.calories}
                        onChange={(e) => updateItem(it.key, { calories: e.target.value })}
                        placeholder="kcal"
                        className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-orange transition-colors"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-text-muted mb-1">Protein (g)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        value={it.protein}
                        onChange={(e) => updateItem(it.key, { protein: e.target.value })}
                        placeholder="g"
                        className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-orange transition-colors"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-text-muted mb-1">Carbs (g)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        value={it.carbs}
                        onChange={(e) => updateItem(it.key, { carbs: e.target.value })}
                        placeholder="g"
                        className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-orange transition-colors"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-text-muted mb-1">Fat (g)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        value={it.fat}
                        onChange={(e) => updateItem(it.key, { fat: e.target.value })}
                        placeholder="g"
                        className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-orange transition-colors"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => removeItem(it.key)}
                      disabled={items.length <= 1}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="px-8 py-5 border-t border-white/5 flex items-center justify-between gap-3 bg-bg-dark/40">
          <div className="text-[11px] text-text-muted flex items-center gap-2">
            <Bell size={12} />
            We'll show an in-app reminder at each meal's time on its day.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-brand-orange hover:bg-brand-orange-dark text-bg-dark transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Create schedule')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

