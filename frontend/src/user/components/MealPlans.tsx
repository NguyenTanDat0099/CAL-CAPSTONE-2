import React, { useState, useMemo, useEffect } from 'react';
import { Search, RotateCcw, Plus, Utensils, ArrowLeft, Info, Flame, Zap, Droplets, Heart, PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Meal, MealCategory, DietItem } from '../types';
import { buildApiUrl } from '../../config/api';

interface FoodCatalogItem {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null;
  servingSize?: string | null;
  imagePath?: string | null;
  category?: string | null;
}

const categoryTabs: Array<MealCategory | 'All'> = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Other'];

const normalizeMealCategory = (category?: string | null): MealCategory => {
  const normalized = (category || '').trim().toLowerCase();
  if (normalized === 'breakfast') return 'Breakfast';
  if (normalized === 'lunch') return 'Lunch';
  if (normalized === 'dinner') return 'Dinner';
  if (normalized === 'snack') return 'Snack';
  return 'Other';
};

const buildDescription = (food: FoodCatalogItem) => {
  const serving = food.servingSize || '1 serving';
  const category = food.category || 'Food';
  return `${Math.round(food.calories)} kcal per ${serving} in ${category}.`;
};

const buildAbout = (food: FoodCatalogItem) => {
  const serving = food.servingSize || 'serving';
  const fiberText = food.fiber != null ? ` Fiber: ${Math.round(food.fiber)}g.` : '';
  const sugarText = food.sugar != null ? ` Sugar: ${Math.round(food.sugar)}g.` : '';
  return `This item comes from the admin-managed Content Manager food library. Nutrition per ${serving}: ${Math.round(food.calories)} kcal, ${Math.round(food.protein)}g protein, ${Math.round(food.carbs)}g carbs, and ${Math.round(food.fats)}g fat.${fiberText}${sugarText}`;
};

const mapFoodToMeal = (food: FoodCatalogItem): Meal => ({
  id: String(food.id),
  sourceFoodId: food.id,
  name: food.name,
  calories: Math.round(food.calories),
  protein: Math.round(food.protein),
  carbs: Math.round(food.carbs),
  fats: Math.round(food.fats),
  fiber: food.fiber ?? null,
  sugar: food.sugar ?? null,
  image: food.imagePath?.trim() || '',
  category: normalizeMealCategory(food.category),
  displayCategory: food.category || 'Food',
  servingSize: food.servingSize ?? null,
  description: buildDescription(food),
  about: buildAbout(food),
});

interface MealPlansProps {
  onAddToMyDiet: (
    item: Omit<DietItem, 'id' | 'date'>,
    options?: { alreadyPersisted?: boolean; mealType?: string; quantity?: number }
  ) => void | Promise<void>;
}

const PORTION_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0.5, label: '½ phần' },
  { value: 1, label: '1 phần' },
  { value: 1.5, label: '1½ phần' },
  { value: 2, label: '2 phần' },
];

// 4 hàng × 4 cột (xl) = 16 / trang. Trên lg=3 cột → ~5 hàng, md=2 cột → 8 hàng,
// mobile=1 cột → 16 hàng. Đủ ngắn để không phải scroll dài.
const MEALS_PER_PAGE = 16;

const AUTH_TOKEN_KEY = 'calai_token';
const getAuthHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export function MealPlans({ onAddToMyDiet }: MealPlansProps) {
  const [activeCategory, setActiveCategory] = useState<MealCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [minKcal, setMinKcal] = useState<string>('0');
  const [maxKcal, setMaxKcal] = useState<string>('1200');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealsLoading, setMealsLoading] = useState(true);
  const [mealsError, setMealsError] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [portionMultiplier, setPortionMultiplier] = useState<number>(1);
  const [page, setPage] = useState(1);

  // Reset portion picker each time the user opens a different meal detail.
  useEffect(() => {
    if (selectedMeal) setPortionMultiplier(1);
  }, [selectedMeal?.id]);

  const loadMeals = async () => {
    setMealsLoading(true);
    setMealsError('');
    try {
      const response = await fetch(buildApiUrl('/users/foods/search?limit=20000'), {
        headers: getAuthHeaders(),
      });
      const result = await response.json().catch(() => ({ message: 'Failed to load foods' }));
      if (!response.ok) {
        throw new Error(result.message || 'Failed to load foods');
      }
      setMeals(((result.data ?? []) as FoodCatalogItem[]).map(mapFoodToMeal));
    } catch (error) {
      setMealsError(error instanceof Error ? error.message : 'Failed to load foods');
    } finally {
      setMealsLoading(false);
    }
  };

  useEffect(() => {
    loadMeals();
  }, []);

  const filteredMeals = useMemo(() => {
    return meals.filter(meal => {
      const matchesCategory = activeCategory === 'All' || meal.category === activeCategory;
      const normalizedSearch = searchQuery.trim().toLowerCase();
      const matchesSearch = !normalizedSearch || [meal.name, meal.displayCategory, meal.description]
        .filter(Boolean)
        .some(value => value!.toLowerCase().includes(normalizedSearch));
      const kcal = meal.calories;
      const min = parseInt(minKcal) || 0;
      const max = parseInt(maxKcal) || 1200;
      const matchesKcal = kcal >= min && kcal <= max;
      return matchesCategory && matchesSearch && matchesKcal;
    });
  }, [meals, activeCategory, searchQuery, minKcal, maxKcal]);

  const totalPages = Math.max(1, Math.ceil(filteredMeals.length / MEALS_PER_PAGE));
  // Reset về trang 1 mỗi khi filter đổi để user không bị mắc kẹt ở trang trống.
  useEffect(() => {
    setPage(1);
  }, [activeCategory, searchQuery, minKcal, maxKcal]);
  // Nếu sau filter mới page hiện tại vượt totalPages (vd vừa search ra ít kết
  // quả), kéo về trang cuối hợp lệ.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visibleMeals = useMemo(
    () => filteredMeals.slice((page - 1) * MEALS_PER_PAGE, page * MEALS_PER_PAGE),
    [filteredMeals, page]
  );

  const handleReset = () => {
    setMinKcal('0');
    setMaxKcal('1200');
    setSearchQuery('');
    setActiveCategory('All');
    setPage(1);
  };

  if (selectedMeal) {
    return (
      <div className="flex-1 lg:ml-64 min-h-screen bg-bg-dark text-white relative overflow-y-auto">
        <div className="h-[280px] sm:h-[360px] lg:h-[450px] relative">
          {selectedMeal.image ? (
            <img src={selectedMeal.image} alt={selectedMeal.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-surface-dark flex items-center justify-center text-brand-orange">
              <Utensils size={72} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-bg-dark/40 via-transparent to-bg-dark" />

          <button
            onClick={() => setSelectedMeal(null)}
            className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-full bg-bg-dark/40 backdrop-blur-md border border-white/10 hover:bg-bg-dark/60 transition-colors z-10"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-bold">Back</span>
          </button>

          <div className="absolute bottom-8 left-4 right-4 sm:bottom-12 sm:left-10 sm:right-10">
            <span className="px-3 py-1 rounded-full bg-brand-orange text-bg-dark text-[10px] font-black uppercase tracking-widest mb-3 inline-block">
              {selectedMeal.displayCategory ?? selectedMeal.category}
            </span>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-3 sm:mb-4">{selectedMeal.name}</h1>
            <p className="text-white/80 text-sm sm:text-lg max-w-2xl leading-relaxed">
              {selectedMeal.description}
            </p>
          </div>
        </div>

        <div className="px-4 py-8 sm:px-6 sm:py-10 lg:p-10 space-y-8 sm:space-y-10 pb-24 sm:pb-32">
          {/* About Section */}
          <section className="bg-surface-dark/50 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                <Info size={20} />
              </div>
              <h2 className="text-xl font-bold">About this Meal</h2>
            </div>
            <p className="text-text-muted leading-relaxed text-base sm:text-lg">
              {selectedMeal.about}
            </p>
          </section>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { label: 'Energy', value: `${selectedMeal.calories.toLocaleString()} kcal`, sub: 'Daily Target', color: 'bg-brand-orange', icon: <Flame size={20} /> },
              { label: 'Protein', value: `${selectedMeal.protein}g`, sub: 'Building Blocks', color: 'bg-green-500', icon: <Zap size={20} /> },
              { label: 'Carbs', value: `${selectedMeal.carbs}g`, sub: 'Sustained Energy', color: 'bg-yellow-500', icon: <Droplets size={20} /> },
              { label: 'Fats', value: `${selectedMeal.fats}g`, sub: 'Healthy Lipids', color: 'bg-orange-400', icon: <RotateCcw size={20} /> },
            ].map((stat, idx) => (
              <div key={idx} className="bg-surface-dark rounded-[2rem] p-6 border border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-10 h-10 rounded-2xl ${stat.color}/10 flex items-center justify-center text-white`}>
                    {stat.icon}
                  </div>
                  <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">{stat.label}</span>
                </div>
                <p className="text-2xl font-black mb-1">{stat.value}</p>
                <p className="text-[10px] text-text-muted mb-4">{stat.sub}</p>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${stat.color} w-[70%]`} />
                </div>
              </div>
            ))}
          </div>

          {/* Action Bar */}
          <div className="bg-surface-dark rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border border-white/5 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-3xl bg-brand-orange/10 flex items-center justify-center text-brand-orange shrink-0">
                <Heart size={28} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">Goal Focus</p>
                <p className="text-lg sm:text-xl font-bold">Heart Health & Weight Maintenance</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              {/* Portion selector — multiplies stored serving size. Backend
                  persists this in mealitems.quantity so daily totals scale. */}
              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <label
                  htmlFor="portion-select"
                  className="text-[10px] uppercase tracking-widest text-text-muted font-bold"
                >
                  Khẩu phần
                </label>
                <select
                  id="portion-select"
                  value={portionMultiplier}
                  onChange={(e) => setPortionMultiplier(Number(e.target.value))}
                  className="bg-bg-dark border border-white/10 rounded-2xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-brand-orange transition-colors"
                >
                  {PORTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} · {Math.round(selectedMeal.calories * opt.value)} kcal
                    </option>
                  ))}
                </select>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onAddToMyDiet({
                    name: selectedMeal.name,
                    foodId: selectedMeal.sourceFoodId,
                    calories: selectedMeal.calories,
                    protein: selectedMeal.protein,
                    carbs: selectedMeal.carbs,
                    fats: selectedMeal.fats,
                    image: selectedMeal.image,
                    description: selectedMeal.description,
                    about: selectedMeal.about
                  }, {
                    mealType: selectedMeal.category === 'Other' ? undefined : selectedMeal.category,
                    quantity: portionMultiplier,
                  });
                  setSelectedMeal(null);
                }}
                className="bg-brand-orange text-bg-dark font-black py-3 sm:py-4 px-6 sm:px-10 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-brand-orange/20 w-full sm:w-auto self-end"
              >
                <PlusCircle size={20} />
                Add to My Diet
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 lg:ml-64 px-4 pt-20 pb-10 sm:px-6 sm:pt-24 lg:p-10 min-h-screen bg-bg-dark text-white relative overflow-y-auto">
      <header className="mb-10 sm:mb-12 lg:pr-44">
        <div className="flex items-center gap-3 text-brand-orange mb-4">
          <Utensils size={20} />
          <span className="text-sm font-bold uppercase tracking-widest">Meal plans</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4">Discover New Meals</h1>
        <p className="text-text-muted text-sm sm:text-base lg:text-lg max-w-2xl leading-relaxed">
          Browse foods curated by admins in Content Manager. Filter by meal type and calories before adding an item to your diet log.
        </p>
      </header>

      {/* Navigation & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 border-b border-white/10">
        <div className="flex gap-5 sm:gap-8 overflow-x-auto -mx-1 px-1 pb-1">
          {categoryTabs.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`pb-4 text-sm font-bold transition-all relative ${
                activeCategory === cat ? 'text-brand-orange' : 'text-text-muted hover:text-white'
              }`}
            >
              {cat}
              {activeCategory === cat && (
                <motion.div layoutId="meal-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-orange" />
              )}
            </button>
          ))}
        </div>

        <div className="relative mb-4 sm:mb-0 w-full sm:w-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search food items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-surface-dark border border-white/5 rounded-2xl py-3 pl-12 pr-6 w-full sm:w-80 focus:outline-none focus:border-brand-orange transition-colors text-sm"
          />
        </div>
      </div>

      {/* Calorie Filter */}
      <div className="bg-surface-dark/50 rounded-[2rem] p-5 sm:p-8 border border-white/5 mb-10 flex flex-wrap items-center gap-5 sm:gap-8">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Calories (kcal)</span>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={minKcal}
              onChange={(e) => setMinKcal(e.target.value)}
              className="bg-bg-dark border border-white/10 rounded-xl px-3 sm:px-4 py-2 w-20 sm:w-24 text-center focus:outline-none focus:border-brand-orange text-sm"
            />
            <span className="text-text-muted text-xs">to</span>
            <input
              type="number"
              value={maxKcal}
              onChange={(e) => setMaxKcal(e.target.value)}
              className="bg-bg-dark border border-white/10 rounded-xl px-3 sm:px-4 py-2 w-20 sm:w-24 text-center focus:outline-none focus:border-brand-orange text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 sm:px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm font-bold text-text-muted hover:text-white"
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </div>

      {mealsLoading && (
        <div className="flex items-center justify-center py-20 text-text-muted">
          <div className="text-sm font-bold uppercase tracking-widest">Loading food library...</div>
        </div>
      )}

      {mealsError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-10 flex items-center justify-between gap-4">
          <p className="text-sm text-red-100">{mealsError}</p>
          <button onClick={loadMeals} className="px-4 py-2 rounded-xl border border-red-300/40 text-xs font-black uppercase tracking-widest text-red-100 hover:bg-red-500/20 transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* Meals Grid */}
      {!mealsLoading && !mealsError && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {visibleMeals.map((meal) => (
              <motion.div
                key={meal.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setSelectedMeal(meal)}
                className="bg-surface-dark rounded-[2.5rem] overflow-hidden border border-white/5 group relative cursor-pointer"
              >
                <div className="h-56 relative overflow-hidden">
                  {meal.image ? (
                    <img
                      src={meal.image}
                      alt={meal.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-bg-dark/80 flex items-center justify-center text-brand-orange/70">
                      <Utensils size={44} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/80 via-transparent to-transparent" />
                  <span className="absolute left-5 top-5 px-2.5 py-1 rounded-full bg-bg-dark/60 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/80 backdrop-blur-md">
                    {meal.displayCategory ?? meal.category}
                  </span>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToMyDiet({
                        name: meal.name,
                        foodId: meal.sourceFoodId,
                        calories: meal.calories,
                        protein: meal.protein,
                        carbs: meal.carbs,
                        fats: meal.fats,
                        image: meal.image,
                        description: meal.description,
                        about: meal.about
                      }, { mealType: meal.category === 'Other' ? undefined : meal.category });
                    }}
                    className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-brand-orange hover:text-bg-dark transition-all shadow-xl"
                  >
                    <Plus size={20} />
                  </motion.button>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-bold mb-2 truncate">{meal.name}</h3>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted mb-5 truncate">
                    {meal.servingSize || '1 serving'}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#A594F9]/10 rounded-2xl p-3 border border-[#A594F9]/20">
                      <p className="text-[8px] text-[#A594F9] uppercase tracking-widest font-black mb-1">Calories</p>
                      <p className="text-sm font-black text-white">{meal.calories} <span className="text-[10px] font-normal opacity-60">kcal</span></p>
                    </div>
                    <div className="bg-[#2DD4BF]/10 rounded-2xl p-3 border border-[#2DD4BF]/20">
                      <p className="text-[8px] text-[#2DD4BF] uppercase tracking-widest font-black mb-1">Protein</p>
                      <p className="text-sm font-black text-white">{meal.protein} <span className="text-[10px] font-normal opacity-60">g</span></p>
                    </div>
                    <div className="bg-[#FCD34D]/10 rounded-2xl p-3 border border-[#FCD34D]/20">
                      <p className="text-[8px] text-[#FCD34D] uppercase tracking-widest font-black mb-1">Carbs</p>
                      <p className="text-sm font-black text-white">{meal.carbs} <span className="text-[10px] font-normal opacity-60">g</span></p>
                    </div>
                    <div className="bg-[#FB7185]/10 rounded-2xl p-3 border border-[#FB7185]/20">
                      <p className="text-[8px] text-[#FB7185] uppercase tracking-widest font-black mb-1">Fat</p>
                      <p className="text-sm font-black text-white">{meal.fats} <span className="text-[10px] font-normal opacity-60">g</span></p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {!mealsLoading && !mealsError && filteredMeals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Utensils size={48} className="mb-4 opacity-20" />
          <p className="font-medium">No meals found matching your criteria.</p>
          <button onClick={handleReset} className="mt-4 text-brand-orange font-bold hover:underline">
            Clear all filters
          </button>
        </div>
      )}

      {!mealsLoading && !mealsError && filteredMeals.length > 0 && (
        <div className="flex flex-col items-center gap-3 mt-10 pb-32">
          <p className="text-xs text-text-muted">
            Hiển thị <span className="text-white font-bold">{(page - 1) * MEALS_PER_PAGE + 1}</span>
            {' – '}
            <span className="text-white font-bold">
              {Math.min(page * MEALS_PER_PAGE, filteredMeals.length)}
            </span>
            {' / '}
            <span className="text-white font-bold">{filteredMeals.length}</span> món
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed enabled:cursor-pointer transition-colors text-white"
                aria-label="Trang trước"
              >
                <ChevronLeft size={18} />
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<Array<number | 'gap'>>((acc, p, idx, arr) => {
                  if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('gap');
                  acc.push(p);
                  return acc;
                }, [])
                .map((entry, idx) =>
                  entry === 'gap' ? (
                    <span key={`gap-${idx}`} className="text-text-muted px-1">…</span>
                  ) : (
                    <button
                      key={entry}
                      onClick={() => setPage(entry as number)}
                      className={`min-w-10 h-10 px-3 rounded-xl font-bold text-sm cursor-pointer transition-colors ${
                        page === entry
                          ? 'bg-brand-orange text-bg-dark'
                          : 'bg-white/5 text-white hover:bg-white/10'
                      }`}
                    >
                      {entry}
                    </button>
                  )
                )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed enabled:cursor-pointer transition-colors text-white"
                aria-label="Trang sau"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

