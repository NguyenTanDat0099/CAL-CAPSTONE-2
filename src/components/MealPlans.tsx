import React, { useState, useMemo } from 'react';
import { Search, RotateCcw, Plus, Utensils, ArrowLeft, Info, Flame, Zap, Droplets, Heart, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Meal, MealCategory, DietItem } from '../types';

const mockMeals: Meal[] = [
  {
    id: '1',
    name: 'Avocado Salmon Bowl',
    calories: 450,
    protein: 32,
    carbs: 12,
    fats: 28,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop',
    category: 'Lunch',
    description: 'Fresh salmon with creamy avocado and mixed greens.',
    about: 'This nutrient-dense bowl combines high-quality protein from fresh salmon with healthy monounsaturated fats from avocado. It is rich in Omega-3 fatty acids, which support heart health and brain function, while the mixed greens provide essential vitamins and minerals with minimal calories.'
  },
  {
    id: '2',
    name: 'Mediterranean Quinoa',
    calories: 320,
    protein: 14,
    carbs: 45,
    fats: 8,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop',
    category: 'Lunch',
    description: 'Light and refreshing quinoa with Mediterranean herbs.',
    about: 'A complete plant-based protein source, quinoa is the star of this Mediterranean-inspired dish. Combined with fresh herbs, cucumbers, and a light lemon-olive oil dressing, it provides sustained energy through complex carbohydrates and a healthy dose of fiber for digestive health.'
  },
  {
    id: '3',
    name: 'Grilled Chicken & Veggies',
    calories: 380,
    protein: 48,
    carbs: 10,
    fats: 15,
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=600&fit=crop',
    category: 'Dinner',
    description: 'Lean grilled chicken breast with seasonal roasted vegetables.',
    about: 'This classic fitness meal is designed for muscle recovery and growth. The lean chicken breast provides a massive 48g of protein, while the roasted seasonal vegetables offer a spectrum of phytonutrients and fiber to keep you full and satisfied without excess calories.'
  },
  {
    id: '4',
    name: 'Protein Berry Bowl',
    calories: 290,
    protein: 22,
    carbs: 35,
    fats: 6,
    image: 'https://images.unsplash.com/photo-1494390248081-4e521a5940db?w=800&h=600&fit=crop',
    category: 'Breakfast',
    description: 'Greek yogurt topped with fresh berries and protein granola.',
    about: 'Start your day with a powerful combination of probiotics and antioxidants. Greek yogurt provides a creamy, high-protein base, while fresh berries deliver a burst of vitamin C and fiber. The protein granola adds a satisfying crunch and extra amino acids for a balanced morning meal.'
  },
  {
    id: '5',
    name: 'Steak with Sweet Potato',
    calories: 520,
    protein: 45,
    carbs: 38,
    fats: 22,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop',
    category: 'Dinner',
    description: 'Juicy sirloin steak served with roasted sweet potato cubes.',
    about: 'A hearty meal for those with higher energy needs or looking to build strength. Sirloin steak is an excellent source of iron, zinc, and B vitamins. Sweet potatoes provide slow-releasing carbohydrates and beta-carotene, making this an ideal post-workout dinner.'
  },
  {
    id: '6',
    name: 'Tofu Stir Fry',
    calories: 310,
    protein: 18,
    carbs: 42,
    fats: 12,
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdFWhBCSahgQhMF0SHI26DJ9ilAmvxu55Q0A&sw=800&h=600&fit=crop',
    category: 'Lunch',
    description: 'Crispy tofu with broccoli and peppers in a light soy glaze.',
    about: 'This vibrant stir-fry is a testament to how delicious plant-based eating can be. Tofu absorbs the savory soy glaze while providing all essential amino acids. Broccoli and bell peppers add a satisfying crunch and a significant dose of vitamin K and vitamin C.'
  },
  {
    id: '7',
    name: 'Oatmeal with Nuts',
    calories: 340,
    protein: 12,
    carbs: 48,
    fats: 14,
    image: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=800&h=600&fit=crop',
    category: 'Breakfast',
    description: 'Warm rolled oats with walnuts and a hint of cinnamon.',
    about: 'A comforting and heart-healthy breakfast choice. Rolled oats are famous for their beta-glucan fiber, which helps lower cholesterol. Walnuts add a satisfying texture and essential ALA Omega-3 fatty acids, while cinnamon helps regulate blood sugar levels.'
  },
  {
    id: '8',
    name: 'Turkey Wrap',
    calories: 280,
    protein: 24,
    carbs: 32,
    fats: 8,
    image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800&h=600&fit=crop',
    category: 'Snack',
    description: 'Lean turkey breast with lettuce and tomato in a whole wheat wrap.',
    about: 'The perfect high-protein snack or light lunch on the go. Lean turkey breast is one of the lowest-fat protein sources available. Wrapped in a whole wheat tortilla with fresh vegetables, it provides a balanced mix of macros to keep your energy stable between meals.'
  }
];

interface MealPlansProps {
  onAddToMyDiet: (item: Omit<DietItem, 'id' | 'date'>) => void;
}

export function MealPlans({ onAddToMyDiet }: MealPlansProps) {
  const [activeCategory, setActiveCategory] = useState<MealCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [minKcal, setMinKcal] = useState<string>('0');
  const [maxKcal, setMaxKcal] = useState<string>('1200');
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);

  const filteredMeals = useMemo(() => {
    return mockMeals.filter(meal => {
      const matchesCategory = activeCategory === 'All' || meal.category === activeCategory;
      const matchesSearch = meal.name.toLowerCase().includes(searchQuery.toLowerCase());
      const kcal = meal.calories;
      const min = parseInt(minKcal) || 0;
      const max = parseInt(maxKcal) || 1200;
      const matchesKcal = kcal >= min && kcal <= max;
      return matchesCategory && matchesSearch && matchesKcal;
    });
  }, [activeCategory, searchQuery, minKcal, maxKcal]);

  const handleReset = () => {
    setMinKcal('0');
    setMaxKcal('1200');
    setSearchQuery('');
    setActiveCategory('All');
  };

  if (selectedMeal) {
    return (
      <div className="flex-1 ml-64 min-h-screen bg-bg-dark text-white relative overflow-y-auto">
        <div className="h-[450px] relative">
          <img src={selectedMeal.image} alt={selectedMeal.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-b from-bg-dark/40 via-transparent to-bg-dark" />
          
          <button 
            onClick={() => setSelectedMeal(null)}
            className="absolute top-8 left-8 flex items-center gap-2 px-4 py-2 rounded-full bg-bg-dark/40 backdrop-blur-md border border-white/10 hover:bg-bg-dark/60 transition-colors z-10"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-bold">Back</span>
          </button>

          <div className="absolute bottom-12 left-10 right-10">
            <span className="px-3 py-1 rounded-full bg-brand-orange text-bg-dark text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
              {selectedMeal.category}
            </span>
            <h1 className="text-6xl font-black tracking-tight mb-4">{selectedMeal.name}</h1>
            <p className="text-white/80 text-lg max-w-2xl leading-relaxed">
              {selectedMeal.description}
            </p>
          </div>
        </div>

        <div className="p-10 space-y-10 pb-32">
          {/* About Section */}
          <section className="bg-surface-dark/50 rounded-[2.5rem] p-8 border border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                <Info size={20} />
              </div>
              <h2 className="text-xl font-bold">About this Meal</h2>
            </div>
            <p className="text-text-muted leading-relaxed text-lg">
              {selectedMeal.about}
            </p>
          </section>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-6">
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
          <div className="bg-surface-dark rounded-[2.5rem] p-8 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-3xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                <Heart size={28} />
              </div>
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">Goal Focus</p>
                <p className="text-xl font-bold">Heart Health & Weight Maintenance</p>
              </div>
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onAddToMyDiet({
                  name: selectedMeal.name,
                  calories: selectedMeal.calories,
                  protein: selectedMeal.protein,
                  carbs: selectedMeal.carbs,
                  fats: selectedMeal.fats,
                  image: selectedMeal.image,
                  description: selectedMeal.description,
                  about: selectedMeal.about
                });
                setSelectedMeal(null);
              }}
              className="bg-brand-orange text-bg-dark font-black py-4 px-10 rounded-2xl flex items-center gap-3 shadow-xl shadow-brand-orange/20"
            >
              <PlusCircle size={20} />
              Add to My Diet
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 ml-64 p-10 min-h-screen bg-bg-dark text-white relative overflow-y-auto">
      <header className="mb-12">
        <div className="flex items-center gap-3 text-brand-orange mb-4">
          <Utensils size={20} />
          <span className="text-sm font-bold uppercase tracking-widest">Meal plans</span>
        </div>
        <h1 className="text-5xl font-black tracking-tight mb-4">Discover New Meals</h1>
        <p className="text-text-muted text-lg max-w-2xl leading-relaxed">
          Find perfectly balanced meals tailored to your current macro goals and preferences. Filter by nutrient range to stay on track.
        </p>
      </header>

      {/* Navigation & Search */}
      <div className="flex items-center justify-between mb-8 border-b border-white/10">
        <div className="flex gap-8">
          {['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat as any)}
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

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search food items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-surface-dark border border-white/5 rounded-2xl py-3 pl-12 pr-6 w-80 focus:outline-none focus:border-brand-orange transition-colors text-sm"
          />
        </div>
      </div>

      {/* Calorie Filter */}
      <div className="bg-surface-dark/50 rounded-[2rem] p-8 border border-white/5 mb-10 flex items-center gap-8">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Calories (kcal)</span>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={minKcal}
              onChange={(e) => setMinKcal(e.target.value)}
              className="bg-bg-dark border border-white/10 rounded-xl px-4 py-2 w-24 text-center focus:outline-none focus:border-brand-orange text-sm"
            />
            <span className="text-text-muted text-xs">to</span>
            <input
              type="number"
              value={maxKcal}
              onChange={(e) => setMaxKcal(e.target.value)}
              className="bg-bg-dark border border-white/10 rounded-xl px-4 py-2 w-24 text-center focus:outline-none focus:border-brand-orange text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm font-bold text-text-muted hover:text-white"
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </div>

      {/* Meals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-32">
        <AnimatePresence mode="popLayout">
          {filteredMeals.map((meal) => (
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
                <img
                  src={meal.image}
                  alt={meal.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/80 via-transparent to-transparent" />
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToMyDiet({
                      name: meal.name,
                      calories: meal.calories,
                      protein: meal.protein,
                      carbs: meal.carbs,
                      fats: meal.fats,
                      image: meal.image,
                      description: meal.description,
                      about: meal.about
                    });
                  }}
                  className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-brand-orange hover:text-bg-dark transition-all shadow-xl"
                >
                  <Plus size={20} />
                </motion.button>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-bold mb-6 truncate">{meal.name}</h3>
                
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

      {filteredMeals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Utensils size={48} className="mb-4 opacity-20" />
          <p className="font-medium">No meals found matching your criteria.</p>
          <button onClick={handleReset} className="mt-4 text-brand-orange font-bold hover:underline">
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
