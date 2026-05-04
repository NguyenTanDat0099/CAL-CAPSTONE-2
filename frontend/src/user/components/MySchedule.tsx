import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays, Trophy, Trash2, Share2, X, ChevronLeft, ChevronRight,
  ListTree, GanttChart, Sparkles, Flame, Zap, Droplets, Heart, MessageSquareText,
} from 'lucide-react';
import { MealSchedule } from '../types';

interface MyScheduleProps {
  schedules: MealSchedule[];
  onUpdate: (scheduleId: number, patch: Partial<Pick<MealSchedule, 'name' | 'description' | 'startDate' | 'endDate' | 'color' | 'targetCalories' | 'achieved'>>) => Promise<void>;
  onDelete: (scheduleId: number) => Promise<void>;
  onPublish: (scheduleId: number, publish: boolean) => Promise<void>;
}

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

export function MySchedule({ schedules, onUpdate, onDelete, onPublish }: MyScheduleProps) {
  const [view, setView] = useState<'list' | 'timeline'>('timeline');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmPublishId, setConfirmPublishId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const selected = useMemo(
    () => (selectedId == null ? null : schedules.find(s => s.scheduleId === selectedId) ?? null),
    [selectedId, schedules]
  );
  const confirmDelete = useMemo(
    () => (confirmDeleteId == null ? null : schedules.find(s => s.scheduleId === confirmDeleteId) ?? null),
    [confirmDeleteId, schedules]
  );
  const confirmPublish = useMemo(
    () => (confirmPublishId == null ? null : schedules.find(s => s.scheduleId === confirmPublishId) ?? null),
    [confirmPublishId, schedules]
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

  const handlePublish = async (schedule: MealSchedule, publish: boolean) => {
    setBusyId(schedule.scheduleId);
    try {
      await onPublish(schedule.scheduleId, publish);
      setConfirmPublishId(null);
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

  if (schedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted bg-surface-dark/30 rounded-[3rem] border border-dashed border-white/10">
        <CalendarDays size={48} className="mb-4 opacity-20" />
        <p className="font-medium">No meal schedules yet.</p>
        <p className="text-sm opacity-60 max-w-md text-center mt-2">
          Ask CalAI to plan a meal in chat, then tap <span className="text-brand-orange font-bold">Save to My schedule</span> to plan it across a date range.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">My schedule</h2>
          <p className="text-text-muted text-sm">
            Track your meal plans over time. Publish a successful one so the community can try it.
          </p>
        </div>
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

      {view === 'timeline' ? (
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
              onShare={() => setConfirmPublishId(schedule.scheduleId)}
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
            onShare={() => setConfirmPublishId(selected.scheduleId)}
            onDelete={() => setConfirmDeleteId(selected.scheduleId)}
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
        {confirmPublish && (
          <ConfirmModal
            title={confirmPublish.isPublished ? 'Unpublish from Discover?' : 'Share to Discover New Meals?'}
            description={
              confirmPublish.isPublished
                ? 'Other users will no longer see this meal plan in Discover.'
                : 'Other users will see this plan on the Discover page so they can try it themselves.'
            }
            confirmLabel={confirmPublish.isPublished ? 'Unpublish' : 'Publish'}
            confirmStyle={confirmPublish.isPublished ? 'neutral' : 'primary'}
            onCancel={() => setConfirmPublishId(null)}
            onConfirm={() => handlePublish(confirmPublish, !confirmPublish.isPublished)}
            busy={busyId === confirmPublish.scheduleId}
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
  onShare: () => void;
  onDelete: () => void;
  busy: boolean;
}

function ScheduleCard({ schedule, today, onClick, onAchieved, onShare, onDelete, busy }: ScheduleCardProps) {
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
            {schedule.isPublished && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-orange bg-brand-orange/10 border border-brand-orange/30 rounded-full px-2 py-0.5">
                <Sparkles size={10} />
                Published
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
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            disabled={busy || (!schedule.achieved && !schedule.isPublished)}
            title={!schedule.achieved && !schedule.isPublished ? 'Mark as achieved first' : ''}
            className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 rounded-xl bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Share2 size={12} />
            {schedule.isPublished ? 'Unpublish' : 'Share'}
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

function TimelineView({ schedules, today, monthAnchor, setMonthAnchor, onSelect }: TimelineViewProps) {
  const months = useMemo(() => {
    return [0, 1].map(offset => {
      const m = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + offset, 1);
      return {
        start: m,
        end: endOfMonth(m),
      };
    });
  }, [monthAnchor]);

  const rangeStart = months[0].start;
  const rangeEnd = months[months.length - 1].end;
  const totalDays = dayDelta(rangeEnd, rangeStart) + 1;
  const dayWidth = 18;
  const totalWidth = totalDays * dayWidth;

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
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <button
          onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => setMonthAnchor(startOfMonth(today))}
          className="text-xs font-bold text-text-muted hover:text-white transition-colors uppercase tracking-widest"
        >
          Jump to today
        </button>
        <button
          onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="overflow-x-auto">
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
                  className={`flex flex-col items-center justify-center py-1.5 border-r border-white/5 text-[8px] ${
                    isToday ? 'bg-brand-orange/15 text-brand-orange font-black' : isWeekend ? 'text-text-muted/60 bg-bg-dark/40' : 'text-text-muted'
                  }`}
                  style={{ width: dayWidth }}
                >
                  <span className="uppercase tracking-widest">{marker.weekday}</span>
                  <span className={`font-black text-[10px] leading-tight ${isToday ? 'text-brand-orange' : 'text-white/80'}`}>
                    {marker.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Schedule bars */}
          <div className="relative py-4 min-h-[200px]">
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
                const left = offset * dayWidth + 2;
                const width = span * dayWidth - 4;
                return (
                  <button
                    key={schedule.scheduleId}
                    onClick={() => onSelect(schedule)}
                    className="absolute h-7 rounded-full px-2.5 flex items-center gap-1.5 text-[10px] font-bold text-white shadow-md shadow-black/20 hover:scale-[1.02] transition-transform overflow-hidden"
                    style={{
                      left,
                      width,
                      top: 12 + laneIdx * 36,
                      backgroundColor: schedule.color,
                    }}
                  >
                    {schedule.source === 'chat' && <MessageSquareText size={10} className="shrink-0" />}
                    {schedule.achieved && <Trophy size={10} className="shrink-0" />}
                    {schedule.isPublished && <Sparkles size={10} className="shrink-0" />}
                    <span className="truncate text-left flex-1">{schedule.name}</span>
                    <span className="text-[9px] opacity-80 shrink-0">{span}d</span>
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
  onShare: () => void;
  onDelete: () => void;
}

function ScheduleDetailModal({ schedule, today, onClose, onAchieved, onShare, onDelete }: ScheduleDetailProps) {
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
            <button
              onClick={onShare}
              disabled={!schedule.achieved && !schedule.isPublished}
              title={!schedule.achieved && !schedule.isPublished ? 'Mark as achieved first to share' : ''}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Share2 size={14} />
              {schedule.isPublished ? 'Unpublish' : 'Share to Discover'}
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
