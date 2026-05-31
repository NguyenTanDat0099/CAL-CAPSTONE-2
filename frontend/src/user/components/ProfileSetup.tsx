import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ArrowRight, Flag, Zap, User, AlertTriangle, LogOut } from 'lucide-react';
import { UserProfile, Goal, ActivityLevel, Gender, WeightHistoryEntry } from '../App';

interface FormErrors {
  targetWeight?: string;
  targetDate?: string;
  age?: string;
  height?: string;
  weight?: string;
  goalMismatch?: string;
}

interface ProfileSetupProps {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  onLogout: () => void;
}

function validateProfile(p: UserProfile): FormErrors {
  const errors: FormErrors = {};

  if (!p.targetWeight || p.targetWeight <= 0) {
    errors.targetWeight = 'Target weight is required. Please enter your goal weight in kg.';
  } else if (p.targetWeight < 20 || p.targetWeight > 300) {
    errors.targetWeight = 'Target weight must be between 20 and 300 kg.';
  }

  if (p.goal !== 'maintain') {
    if (!p.targetDate) {
      errors.targetDate = 'Target date is required. Choose when you want to reach your goal weight.';
    } else {
      const date = new Date(`${p.targetDate}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(date.getTime()) || date <= today) {
        errors.targetDate = 'Target date must be in the future.';
      }
    }
  }

  if (!p.age || p.age <= 0) {
    errors.age = 'Age is required. Please enter your age.';
  } else if (p.age < 10 || p.age > 120) {
    errors.age = 'Age must be between 10 and 120 years.';
  }

  if (!p.height || p.height <= 0) {
    errors.height = 'Height is required. Please enter your height in cm.';
  } else if (p.height < 50 || p.height > 300) {
    errors.height = 'Height must be between 50 and 300 cm.';
  }

  if (!p.weight || p.weight <= 0) {
    errors.weight = 'Current weight is required. Please enter your current weight in kg.';
  } else if (p.weight < 20 || p.weight > 600) {
    errors.weight = 'Current weight must be between 20 and 600 kg.';
  }

  if (p.weight > 0 && p.targetWeight > 0) {
    const diff = p.weight - p.targetWeight;
    if (diff > 0.05 && p.goal !== 'lose') {
      errors.goalMismatch = `Your current weight (${p.weight} kg) is greater than your target (${p.targetWeight} kg) — select "Lose Weight" to align with your goal.`;
    } else if (Math.abs(diff) <= 0.05 && p.goal !== 'maintain') {
      errors.goalMismatch = `Your current weight equals your target weight (${p.weight} kg) — select "Maintain Weight" to align with your goal.`;
    } else if (diff < -0.05 && p.goal !== 'gain') {
      errors.goalMismatch = `Your current weight (${p.weight} kg) is less than your target (${p.targetWeight} kg) — select "Gain Weight" to align with your goal.`;
    }
  }

  return errors;
}

function getSuggestedGoal(weight: number, targetWeight: number): Goal | null {
  if (weight <= 0 || targetWeight <= 0) return null;
  const diff = weight - targetWeight;
  if (diff > 0.05) return 'lose';
  if (Math.abs(diff) <= 0.05) return 'maintain';
  return 'gain';
}

export function ProfileSetup({ profile, setProfile, onLogout }: ProfileSetupProps) {
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (hasAttemptedSubmit) {
      setErrors(validateProfile(profile));
    }
  }, [profile, hasAttemptedSubmit]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setHasAttemptedSubmit(true);
    const validationErrors = validateProfile(profile);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      setProfile(prev => {
        const currentWeight = Number(prev.weight || 0);
        const hasWeightHistory = (prev.weightHistory || []).length > 0;
        const initialEntry: WeightHistoryEntry | null =
          currentWeight > 0 && !hasWeightHistory
            ? {
                id: Date.now(),
                weight: currentWeight,
                recordedAt: new Date().toISOString(),
                source: 'onboarding',
                note: 'Initial onboarding weight',
              }
            : null;

        return {
          ...prev,
          hasCompletedSetup: true,
          startingWeight: prev.startingWeight || currentWeight,
          weightHistory: initialEntry ? [initialEntry] : prev.weightHistory,
        };
      });
    }
  };

  const errorCount = Object.keys(errors).length;
  const suggested = getSuggestedGoal(profile.weight, profile.targetWeight);

  const goals: { id: Goal; title: string; desc: string }[] = [
    { id: 'lose', title: 'Lose Weight', desc: 'Burn fat and get leaner' },
    { id: 'maintain', title: 'Maintain Weight', desc: 'Keep your current physique' },
    { id: 'gain', title: 'Gain Weight', desc: 'Build strength and size' },
  ];

  const activityLevels: { id: ActivityLevel; title: string; desc: string }[] = [
    { id: 'sedentary', title: 'Sedentary', desc: 'Little to no exercise, desk job' },
    { id: 'light', title: 'Lightly Active', desc: 'Light exercise 1–3 days/week' },
    { id: 'moderate', title: 'Moderately Active', desc: 'Moderate exercise 3–5 days/week' },
    { id: 'active', title: 'Very Active', desc: 'Hard exercise 6–7 days/week' },
  ];

  return (
    <div className="min-h-screen bg-bg-dark text-white overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 sm:pt-10 pb-20">

        {/* Header */}
        <header className="mb-8 sm:mb-12">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="text-brand-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Welcome to CalAI</p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">Profile Setup</h1>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors text-sm font-bold shrink-0"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
          <p className="text-text-muted text-sm sm:text-base mb-6">
            Tell us about yourself so we can personalize your daily nutrition plan.
          </p>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '65%' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full bg-brand-orange"
            />
          </div>
        </header>

        {/* Error Summary Banner */}
        <AnimatePresence>
          {hasAttemptedSubmit && errorCount > 0 && (
            <motion.div
              key="error-banner"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              className="mb-8 p-5 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-4"
            >
              <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="font-black text-sm text-red-300 mb-2">
                  Please fix {errorCount} issue{errorCount > 1 ? 's' : ''} before continuing
                </p>
                <ul className="space-y-1.5">
                  {errors.weight && (
                    <li className="text-xs text-red-400/80 flex items-start gap-2">
                      <span className="text-red-400 shrink-0 mt-0.5">•</span>
                      {errors.weight}
                    </li>
                  )}
                  {errors.targetWeight && (
                    <li className="text-xs text-red-400/80 flex items-start gap-2">
                      <span className="text-red-400 shrink-0 mt-0.5">•</span>
                      {errors.targetWeight}
                    </li>
                  )}
                  {errors.targetDate && (
                    <li className="text-xs text-red-400/80 flex items-start gap-2">
                      <span className="text-red-400 shrink-0 mt-0.5">â€¢</span>
                      {errors.targetDate}
                    </li>
                  )}
                  {errors.age && (
                    <li className="text-xs text-red-400/80 flex items-start gap-2">
                      <span className="text-red-400 shrink-0 mt-0.5">•</span>
                      {errors.age}
                    </li>
                  )}
                  {errors.height && (
                    <li className="text-xs text-red-400/80 flex items-start gap-2">
                      <span className="text-red-400 shrink-0 mt-0.5">•</span>
                      {errors.height}
                    </li>
                  )}
                  {errors.goalMismatch && (
                    <li className="text-xs text-red-400/80 flex items-start gap-2">
                      <span className="text-red-400 shrink-0 mt-0.5">•</span>
                      {errors.goalMismatch}
                    </li>
                  )}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-10 sm:space-y-16">

            {/* Section 1: Primary Goal */}
            <section>
              <div className="flex items-center gap-3 mb-2">
                <Flag className="text-brand-orange" size={20} />
                <h2 className="text-2xl font-bold">What is your primary goal?</h2>
              </div>
              <p className="text-text-muted mb-6">
                This must match your current weight vs. target weight relationship.
              </p>

              <AnimatePresence>
                {errors.goalMismatch && (
                  <motion.div
                    key="goal-error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                      <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-amber-300 text-sm font-medium">{errors.goalMismatch}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {goals.map((goal) => {
                  const isSelected = profile.goal === goal.id;
                  const isSuggested = suggested === goal.id && !!errors.goalMismatch;
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => setProfile(prev => ({ ...prev, goal: goal.id }))}
                      className={`relative p-6 rounded-3xl border text-left transition-all duration-300 ${
                        isSelected
                          ? 'bg-brand-orange/5 border-brand-orange ring-1 ring-brand-orange'
                          : isSuggested
                            ? 'bg-amber-500/5 border-amber-500/40 ring-1 ring-amber-500/40 hover:border-amber-500/70'
                            : errors.goalMismatch
                              ? 'bg-surface-dark border-red-500/20 hover:border-white/20'
                              : 'bg-surface-dark border-white/5 hover:border-white/20'
                      }`}
                    >
                      {isSuggested && !isSelected && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-wider">
                          Suggested
                        </span>
                      )}
                      <h3 className="font-bold text-lg mb-1">{goal.title}</h3>
                      <p className="text-text-muted text-xs leading-relaxed">{goal.desc}</p>
                      {isSelected && (
                        <div className="absolute top-6 right-6 w-6 h-6 rounded-full border border-brand-orange flex items-center justify-center">
                          <Check size={14} className="text-brand-orange" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Section 2: Target Weight */}
            <section>
              <div className="flex items-center gap-3 mb-2">
                <Flag className="text-brand-orange" size={20} />
                <h2 className="text-2xl font-bold">Target Weight</h2>
              </div>
              <p className="text-text-muted mb-6">
                Your goal weight — used to determine your primary goal direction.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-5 sm:gap-y-6 max-w-2xl">
                <div>
                  <label className="block text-sm font-bold mb-3">
                    Target Weight (kg) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={profile.targetWeight || ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setProfile(prev => ({ ...prev, targetWeight: 0 }));
                      } else {
                        const parsed = parseFloat(raw);
                        if (!isNaN(parsed)) setProfile(prev => ({ ...prev, targetWeight: parsed }));
                      }
                    }}
                    className={`w-full bg-surface-dark border rounded-2xl p-4 text-white focus:outline-none transition-colors ${
                      errors.targetWeight
                        ? 'border-red-500 focus:border-red-400'
                        : 'border-white/5 focus:border-brand-orange'
                    }`}
                    placeholder="e.g. 65"
                  />
                  <AnimatePresence>
                    {errors.targetWeight && (
                      <motion.p
                        key="targetWeight-error"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-red-400 text-xs mt-2 flex items-center gap-1.5 font-medium"
                      >
                        <AlertTriangle size={12} className="shrink-0" />
                        {errors.targetWeight}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-3">
                    Goal Deadline {profile.goal !== 'maintain' && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="date"
                    value={profile.targetDate || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, targetDate: e.target.value }))}
                    disabled={profile.goal === 'maintain'}
                    className={`w-full bg-surface-dark border rounded-2xl p-4 text-white focus:outline-none transition-colors disabled:opacity-50 ${
                      errors.targetDate
                        ? 'border-red-500 focus:border-red-400'
                        : 'border-white/5 focus:border-brand-orange'
                    }`}
                  />
                  <AnimatePresence>
                    {errors.targetDate && (
                      <motion.p
                        key="targetDate-error"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-red-400 text-xs mt-2 flex items-center gap-1.5 font-medium"
                      >
                        <AlertTriangle size={12} className="shrink-0" />
                        {errors.targetDate}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <p className="mt-2 text-xs text-text-muted">
                    CalAI uses this timeline to adjust your calorie target and meal plan recommendations.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3: Activity Level */}
            <section>
              <div className="flex items-center gap-3 mb-2">
                <Zap className="text-brand-orange" size={20} />
                <h2 className="text-2xl font-bold">Activity Level</h2>
              </div>
              <p className="text-text-muted mb-6">How active is your daily lifestyle?</p>

              <div className="space-y-3">
                {activityLevels.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setProfile(prev => ({ ...prev, activityLevel: level.id }))}
                    className={`w-full flex items-center gap-6 p-6 rounded-3xl border text-left transition-all duration-300 ${
                      profile.activityLevel === level.id
                        ? 'bg-brand-orange/5 border-brand-orange ring-1 ring-brand-orange'
                        : 'bg-surface-dark border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        profile.activityLevel === level.id ? 'border-brand-orange' : 'border-white/20'
                      }`}
                    >
                      {profile.activityLevel === level.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-brand-orange" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{level.title}</h3>
                      <p className="text-text-muted text-xs">{level.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Section 4: Personal Details */}
            <section>
              <div className="flex items-center gap-3 mb-2">
                <User className="text-brand-orange" size={20} />
                <h2 className="text-2xl font-bold">Personal Details</h2>
              </div>
              <p className="text-text-muted mb-6">
                Used to calculate your Basal Metabolic Rate (BMR) and daily calorie target.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-5 sm:gap-y-6">

                {/* Gender */}
                <div className="col-span-1">
                  <label className="block text-sm font-bold mb-3">
                    Gender <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-4">
                    {(['male', 'female'] as Gender[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setProfile(prev => ({ ...prev, gender: g }))}
                        className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all duration-300 border ${
                          profile.gender === g
                            ? 'bg-brand-orange text-bg-dark border-brand-orange'
                            : 'bg-surface-dark text-white border-white/5 hover:border-white/20'
                        }`}
                      >
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Age */}
                <div className="col-span-1">
                  <label className="block text-sm font-bold mb-3">
                    Age <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={profile.age || ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setProfile(prev => ({ ...prev, age: 0 }));
                      } else {
                        const parsed = parseInt(raw);
                        if (!isNaN(parsed)) setProfile(prev => ({ ...prev, age: parsed }));
                      }
                    }}
                    className={`w-full bg-surface-dark border rounded-2xl p-4 text-white focus:outline-none transition-colors ${
                      errors.age ? 'border-red-500 focus:border-red-400' : 'border-white/5 focus:border-brand-orange'
                    }`}
                    placeholder="e.g. 25"
                  />
                  <AnimatePresence>
                    {errors.age && (
                      <motion.p
                        key="age-error"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-red-400 text-xs mt-2 flex items-center gap-1.5 font-medium"
                      >
                        <AlertTriangle size={12} className="shrink-0" />
                        {errors.age}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Height */}
                <div className="col-span-1">
                  <label className="block text-sm font-bold mb-3">
                    Height (cm) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={profile.height || ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setProfile(prev => ({ ...prev, height: 0 }));
                      } else {
                        const parsed = parseInt(raw);
                        if (!isNaN(parsed)) setProfile(prev => ({ ...prev, height: parsed }));
                      }
                    }}
                    className={`w-full bg-surface-dark border rounded-2xl p-4 text-white focus:outline-none transition-colors ${
                      errors.height
                        ? 'border-red-500 focus:border-red-400'
                        : 'border-white/5 focus:border-brand-orange'
                    }`}
                    placeholder="e.g. 170"
                  />
                  <AnimatePresence>
                    {errors.height && (
                      <motion.p
                        key="height-error"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-red-400 text-xs mt-2 flex items-center gap-1.5 font-medium"
                      >
                        <AlertTriangle size={12} className="shrink-0" />
                        {errors.height}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Current Weight */}
                <div className="col-span-1">
                  <label className="block text-sm font-bold mb-3">
                    Current Weight (kg) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={profile.weight || ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setProfile(prev => ({ ...prev, weight: 0, startingWeight: 0, weightHistory: [] }));
                      } else {
                        const parsed = parseFloat(raw);
                        if (!isNaN(parsed)) setProfile(prev => ({ ...prev, weight: parsed, startingWeight: parsed }));
                      }
                    }}
                    className={`w-full bg-surface-dark border rounded-2xl p-4 text-white focus:outline-none transition-colors ${
                      errors.weight
                        ? 'border-red-500 focus:border-red-400'
                        : 'border-white/5 focus:border-brand-orange'
                    }`}
                    placeholder="e.g. 70"
                  />
                  <AnimatePresence>
                    {errors.weight && (
                      <motion.p
                        key="weight-error"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-red-400 text-xs mt-2 flex items-center gap-1.5 font-medium"
                      >
                        <AlertTriangle size={12} className="shrink-0" />
                        {errors.weight}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </section>

            {/* Submit */}
            <div className="pt-10 flex items-center justify-end border-t border-white/5">
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-brand-orange hover:bg-brand-orange-dark text-bg-dark font-black py-4 px-10 rounded-2xl flex items-center gap-3 shadow-xl shadow-brand-orange/20 transition-colors"
              >
                Complete Setup
                <ArrowRight size={20} />
              </motion.button>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
