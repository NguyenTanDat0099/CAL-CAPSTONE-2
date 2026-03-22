import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ArrowRight, Flag, Zap, User, ChevronLeft, AlertTriangle, RotateCcw, Info, ArrowLeft, PlusCircle, Heart, Droplets, X } from 'lucide-react';
import { DietItem } from '../types';

type Goal = 'lose' | 'maintain' | 'gain';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
type Gender = 'male' | 'female';

interface UserProfile {
  goal: Goal;
  activityLevel: ActivityLevel;
  gender: Gender;
  age: number;
  height: number;
  weight: number;
}

interface DietPlan {
  id: string;
  name: string;
  calories: number;
  description: string;
  image: string;
  macros: {
    protein: number;
    fats: number;
    carbs: number;
  };
  suitableFor: Goal[];
  about: string;
}

const dietPlans: DietPlan[] = [
  {
    id: 'mediterranean',
    name: 'Mediterranean Lifestyle',
    calories: 2100,
    description: 'Heart-healthy fats and fresh produce. High in Omega-3 and antioxidants.',
    image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&h=800&fit=crop',
    macros: { protein: 15, fats: 35, carbs: 50 },
    suitableFor: ['lose', 'maintain'],
    about: 'The Mediterranean diet focuses on plant-based foods, such as vegetables, fruits, whole grains, legumes and nuts. It replaces butter with healthy fats, such as olive oil and canola oil, and uses herbs and spices instead of salt to flavor foods. This approach emphasizes consuming fish and poultry at least twice a week, while limiting red meat to only a few times a month.'
  },
  {
    id: 'keto',
    name: 'Keto Plan',
    calories: 1800,
    description: 'High fat, low carb metabolic state. Perfect for rapid fat loss and energy.',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&h=800&fit=crop',
    macros: { protein: 25, fats: 70, carbs: 5 },
    suitableFor: ['lose'],
    about: 'The Ketogenic diet is a very low-carb, high-fat diet that shares many similarities with the Atkins and low-carb diets. It involves drastically reducing carbohydrate intake and replacing it with fat. This reduction in carbs puts your body into a metabolic state called ketosis. When this happens, your body becomes incredibly efficient at burning fat for energy.'
  },
  {
    id: 'vegan',
    name: 'Vegan Balance',
    calories: 1950,
    description: 'Plant-based nutritional excellence. Balanced nutrients for ethical fitness.',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&h=800&fit=crop',
    macros: { protein: 20, fats: 25, carbs: 55 },
    suitableFor: ['lose', 'maintain'],
    about: 'A vegan diet contains only plants (such as vegetables, grains, nuts and fruits) and foods made from plants. Vegans do not eat foods that come from animals, including dairy products and eggs. This plan ensures you get all necessary nutrients through a variety of plant-based sources, focusing on high-protein legumes and nutrient-dense greens.'
  },
  {
    id: 'lean-gains',
    name: 'Lean Gains (16/8)',
    calories: 2400,
    description: 'Time-restricted feeding window. Focus on metabolic flexibility and growth.',
    image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=1200&h=800&fit=crop',
    macros: { protein: 30, fats: 30, carbs: 40 },
    suitableFor: ['gain', 'maintain'],
    about: 'Lean Gains is a popular form of intermittent fasting that involves an 8-hour eating window followed by a 16-hour fast. This approach is designed to maximize muscle growth while minimizing fat gain. It works by optimizing hormone levels and improving insulin sensitivity, making it an effective strategy for body recomposition.'
  }
];

interface DietGoalsProps {
  myDiets: DietItem[];
  onAddToMyDiet: (item: Omit<DietItem, 'id' | 'date'>) => void;
  onRemoveFromMyDiet: (id: string) => void;
}

export function DietGoals({ myDiets, onAddToMyDiet, onRemoveFromMyDiet }: DietGoalsProps) {
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => {
    const saved = localStorage.getItem('calai_onboarded');
    return saved === 'true';
  });

  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DietPlan | DietItem | null>(null);

  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('calai_profile');
    return saved ? JSON.parse(saved) : {
      goal: 'lose',
      activityLevel: 'sedentary',
      gender: 'male',
      age: 25,
      height: 175,
      weight: 70,
    };
  });

  const [errors, setErrors] = useState<{ age?: string; height?: string; weight?: string }>({});

  const validate = () => {
    const newErrors: { age?: string; height?: string; weight?: string } = {};
    if (profile.age <= 0 || profile.age > 200) newErrors.age = 'Age must be between 1 and 200';
    if (profile.height <= 0 || profile.height > 300) newErrors.height = 'Height must be between 1 and 300cm';
    if (profile.weight <= 0 || profile.weight > 600) newErrors.weight = 'Weight must be between 1 and 600kg';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCompleteOnboarding = () => {
    if (validate()) {
      localStorage.setItem('calai_onboarded', 'true');
      localStorage.setItem('calai_profile', JSON.stringify(profile));
      setIsOnboarded(true);
    }
  };

  const handleReset = () => {
    localStorage.removeItem('calai_onboarded');
    localStorage.removeItem('calai_profile');
    setIsOnboarded(false);
    setShowResetWarning(false);
    setProfile({
      goal: 'lose',
      activityLevel: 'sedentary',
      gender: 'male',
      age: 25,
      height: 175,
      weight: 70,
    });
  };

  if (isOnboarded) {
    if (selectedPlan) {
      const isMyDietItem = 'date' in selectedPlan;
      const macros = isMyDietItem 
        ? { protein: (selectedPlan as DietItem).protein, fats: (selectedPlan as DietItem).fats, carbs: (selectedPlan as DietItem).carbs }
        : (selectedPlan as DietPlan).macros;
      
      const description = isMyDietItem 
        ? (selectedPlan as DietItem).description || 'A personalized meal added to your diet log.'
        : (selectedPlan as DietPlan).description;

      const about = isMyDietItem
        ? (selectedPlan as DietItem).about || 'This item was added to your diet log to help you track your nutritional intake. It contributes to your daily energy and macronutrient goals.'
        : (selectedPlan as DietPlan).about;

      return (
        <div className="flex-1 ml-64 min-h-screen bg-bg-dark text-white relative overflow-y-auto">
          <div className="h-[450px] relative">
            <img src={selectedPlan.image} alt={selectedPlan.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-b from-bg-dark/40 via-transparent to-bg-dark" />
            
            <button 
              onClick={() => setSelectedPlan(null)}
              className="absolute top-8 left-8 flex items-center gap-2 px-4 py-2 rounded-full bg-bg-dark/40 backdrop-blur-md border border-white/10 hover:bg-bg-dark/60 transition-colors z-10"
            >
              <ArrowLeft size={18} />
              <span className="text-sm font-bold">Back</span>
            </button>

            <div className="absolute bottom-12 left-10 right-10">
              <span className="px-3 py-1 rounded-full bg-brand-orange text-bg-dark text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
                {isMyDietItem ? 'Logged Item' : 'Healthy Choice'}
              </span>
              <h1 className="text-6xl font-black tracking-tight mb-4">{selectedPlan.name}</h1>
              <p className="text-white/80 text-lg max-w-2xl leading-relaxed">
                {description}
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
                <h2 className="text-xl font-bold">About this {isMyDietItem ? 'Meal' : 'Diet'}</h2>
              </div>
              <p className="text-text-muted leading-relaxed text-lg">
                {about}
              </p>
            </section>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: 'Energy', value: `${selectedPlan.calories.toLocaleString()} kcal`, sub: 'Daily Target', color: 'bg-brand-orange', icon: <Flame size={20} /> },
                { label: 'Protein', value: `${macros.protein}%`, sub: 'Building Blocks', color: 'bg-green-500', icon: <Zap size={20} /> },
                { label: 'Carbs', value: `${macros.carbs}%`, sub: 'Sustained Energy', color: 'bg-yellow-500', icon: <Droplets size={20} /> },
                { label: 'Fats', value: `${macros.fats}%`, sub: 'Healthy Lipids', color: 'bg-orange-400', icon: <RotateCcw size={20} /> },
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
              {isMyDietItem ? (
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onRemoveFromMyDiet((selectedPlan as DietItem).id);
                    setSelectedPlan(null);
                  }}
                  className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-black py-4 px-10 rounded-2xl flex items-center gap-3 transition-all border border-red-500/20"
                >
                  <X size={20} />
                  Remove from My Diet
                </motion.button>
              ) : (
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onAddToMyDiet({
                      name: selectedPlan.name,
                      calories: selectedPlan.calories,
                      protein: macros.protein,
                      carbs: macros.carbs,
                      fats: macros.fats,
                      image: selectedPlan.image,
                      description: (selectedPlan as DietPlan).description,
                      about: (selectedPlan as DietPlan).about
                    });
                    setSelectedPlan(null);
                    setActiveTab('my');
                  }}
                  className="bg-brand-orange text-bg-dark font-black py-4 px-10 rounded-2xl flex items-center gap-3 shadow-xl shadow-brand-orange/20"
                >
                  <PlusCircle size={20} />
                  Add to My Diet
                </motion.button>
              )}
            </div>
          </div>
        </div>
      );
    }

    const filteredPlans = dietPlans.filter(plan => plan.suitableFor.includes(profile.goal));
    const totalCalories = myDiets.reduce((sum, item) => sum + item.calories, 0);
    
    // Calculate Daily Target
    const calculateDailyTarget = () => {
      let bmr = 0;
      if (profile.gender === 'male') {
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
      } else {
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
      }

      const activityFactors = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725
      };

      const tdee = bmr * activityFactors[profile.activityLevel];
      
      if (profile.goal === 'lose') return Math.round(tdee - 500);
      if (profile.goal === 'gain') return Math.round(tdee + 500);
      return Math.round(tdee);
    };

    const dailyTarget = calculateDailyTarget();
    const progressPercentage = Math.min((totalCalories / dailyTarget) * 100, 100);

    return (
      <div className="flex-1 ml-64 p-10 min-h-screen bg-bg-dark text-white relative overflow-y-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-black tracking-tight">Diet goals</h1>
          </div>
          
          <div className="flex gap-8 border-b border-white/10">
            <button 
              onClick={() => setActiveTab('all')}
              className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'all' ? 'text-brand-orange' : 'text-text-muted hover:text-white'}`}
            >
              All Diets
              {activeTab === 'all' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-orange" />}
            </button>
            <button 
              onClick={() => setActiveTab('my')}
              className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'my' ? 'text-brand-orange' : 'text-text-muted hover:text-white'}`}
            >
              My Diets
              {activeTab === 'my' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-orange" />}
            </button>
          </div>
        </header>

        {activeTab === 'all' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-32">
            {filteredPlans.map((plan) => (
              <motion.div 
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedPlan(plan)}
                className="bg-surface-dark rounded-3xl overflow-hidden border border-white/5 group cursor-pointer"
              >
                <div className="h-48 overflow-hidden relative">
                  <img src={plan.image} alt={plan.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/80 to-transparent" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="inline-block px-3 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-bold mb-4">
                    {plan.calories} kcal
                  </div>
                  <p className="text-text-muted text-sm leading-relaxed mb-6 h-12 overflow-hidden">
                    {plan.description}
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/5">
                    <div className="text-center">
                      <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Protein</p>
                      <p className="font-bold">{plan.macros.protein}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Fats</p>
                      <p className="font-bold">{plan.macros.fats}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Carbs</p>
                      <p className="font-bold">{plan.macros.carbs}%</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="pb-32">
            {myDiets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {myDiets.map((item) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedPlan(item)}
                    className="bg-surface-dark rounded-3xl overflow-hidden border border-white/5 group cursor-pointer"
                  >
                    <div className="h-48 overflow-hidden relative">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/80 to-transparent" />
                      <div className="absolute top-4 right-4 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-bold">
                        {new Date(item.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                      <div className="inline-block px-3 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-bold mb-4">
                        {item.calories} kcal
                      </div>
                      <p className="text-text-muted text-sm leading-relaxed mb-6 h-12 overflow-hidden">
                        {item.description || 'A personalized meal added to your diet log.'}
                      </p>
                      
                      <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/5">
                        <div className="text-center">
                          <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Protein</p>
                          <p className="font-bold">{item.protein}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Fats</p>
                          <p className="font-bold">{item.fats}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Carbs</p>
                          <p className="font-bold">{item.carbs}%</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-text-muted bg-surface-dark/30 rounded-[3rem] border border-dashed border-white/10">
                <Utensils size={48} className="mb-4 opacity-20" />
                <p className="font-medium">No diets logged yet.</p>
                <p className="text-sm opacity-60">Start scanning your meals or add from All Diets!</p>
              </div>
            )}
          </div>
        )}

        {/* Quick View & Reset Goal */}
        <div className="fixed bottom-10 right-10 z-40">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-lighter/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl w-80"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-sm">Goal Overview</h4>
              <button 
                onClick={() => setShowResetWarning(true)}
                className="p-2 rounded-full bg-white/5 hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
                title="Reset Goal"
              >
                <RotateCcw size={16} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                  <Flag size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-widest">Current Goal</p>
                  <p className="font-bold text-sm capitalize">{profile.goal === 'lose' ? 'Lose Weight' : profile.goal === 'maintain' ? 'Maintain' : 'Gain Muscle'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                  <Zap size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-widest">Activity</p>
                  <p className="font-bold text-sm capitalize">{profile.activityLevel}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/5">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-text-muted">Daily Target</span>
                <span className="font-bold">{totalCalories.toLocaleString()} / {dailyTarget.toLocaleString()} kcal</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  className="h-full bg-brand-orange" 
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Reset Warning Modal */}
        <AnimatePresence>
          {showResetWarning && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowResetWarning(false)}
                className="absolute inset-0 bg-bg-dark/90 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-surface-dark p-8 rounded-[2.5rem] border border-white/10 max-w-md w-full shadow-2xl"
              >
                <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-4">Reset your goals?</h3>
                <p className="text-text-muted leading-relaxed mb-8">
                  This will clear your current profile and <span className="text-white font-bold">restart all progress tracking</span>. You will need to complete the onboarding process again.
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowResetWarning(false)}
                    className="flex-1 py-4 rounded-2xl font-bold bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleReset}
                    className="flex-1 py-4 rounded-2xl font-bold bg-red-500 hover:bg-red-600 text-white transition-colors"
                  >
                    Reset Now
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex-1 ml-64 p-10 min-h-screen bg-bg-dark text-white overflow-y-auto">
      <div className="max-w-4xl mx-auto pt-10 pb-20">
        <header className="mb-12">
          <p className="text-brand-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Onboarding</p>
          <h1 className="text-5xl font-black tracking-tight mb-6">Profile Setup</h1>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '65%' }}
              className="h-full bg-brand-orange"
            />
          </div>
        </header>

        <div className="space-y-16">
          {/* Section 1: Primary Goal */}
          <section>
            <div className="flex items-center gap-3 mb-2">
              <Flag className="text-brand-orange" size={20} />
              <h2 className="text-2xl font-bold">What is your primary goal?</h2>
            </div>
            <p className="text-text-muted mb-8">This helps us calculate your daily calorie and macro needs.</p>
            
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'lose', title: 'Lose Weight', desc: 'Burn fat and get leaner' },
                { id: 'maintain', title: 'Maintain', desc: 'Keep current physique' },
                { id: 'gain', title: 'Gain Muscle', desc: 'Build strength and size' },
              ].map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => setProfile({ ...profile, goal: goal.id as Goal })}
                  className={`relative p-6 rounded-3xl border text-left transition-all duration-300 ${
                    profile.goal === goal.id 
                    ? 'bg-brand-orange/5 border-brand-orange ring-1 ring-brand-orange' 
                    : 'bg-surface-dark border-white/5 hover:border-white/20'
                  }`}
                >
                  <h3 className="font-bold text-lg mb-1">{goal.title}</h3>
                  <p className="text-text-muted text-xs leading-relaxed">{goal.desc}</p>
                  {profile.goal === goal.id && (
                    <div className="absolute top-6 right-6 w-6 h-6 rounded-full border border-brand-orange flex items-center justify-center">
                      <Check size={14} className="text-brand-orange" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Section 2: Activity Level */}
          <section>
            <div className="flex items-center gap-3 mb-2">
              <Zap className="text-brand-orange" size={20} />
              <h2 className="text-2xl font-bold">Activity Level</h2>
            </div>
            <p className="text-text-muted mb-8">How active is your daily lifestyle?</p>
            
            <div className="space-y-3">
              {[
                { id: 'sedentary', title: 'Sedentary', desc: 'Little to no exercise, desk job' },
                { id: 'light', title: 'Lightly Active', desc: 'Light exercise 1-3 days/week' },
                { id: 'moderate', title: 'Moderately Active', desc: 'Moderate exercise 3-5 days/week' },
                { id: 'active', title: 'Very Active', desc: 'Hard exercise 6-7 days/week' },
              ].map((level) => (
                <button
                  key={level.id}
                  onClick={() => setProfile({ ...profile, activityLevel: level.id as ActivityLevel })}
                  className={`w-full flex items-center gap-6 p-6 rounded-3xl border text-left transition-all duration-300 ${
                    profile.activityLevel === level.id 
                    ? 'bg-brand-orange/5 border-brand-orange ring-1 ring-brand-orange' 
                    : 'bg-surface-dark border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    profile.activityLevel === level.id ? 'border-brand-orange' : 'border-white/20'
                  }`}>
                    {profile.activityLevel === level.id && <div className="w-2.5 h-2.5 rounded-full bg-brand-orange" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{level.title}</h3>
                    <p className="text-text-muted text-xs">{level.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Section 3: Personal Details */}
          <section>
            <div className="flex items-center gap-3 mb-2">
              <User className="text-brand-orange" size={20} />
              <h2 className="text-2xl font-bold">Personal Details</h2>
            </div>
            <p className="text-text-muted mb-8">We use these to calculate your Basal Metabolic Rate (BMR).</p>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <div className="col-span-1">
                <label className="block text-sm font-bold mb-3">Gender</label>
                <div className="flex gap-4">
                  {(['male', 'female'] as Gender[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setProfile({ ...profile, gender: g })}
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

              <div className="col-span-1">
                <label className="block text-sm font-bold mb-3">Age</label>
                <input 
                  type="number" 
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || 0 })}
                  className={`w-full bg-surface-dark border rounded-2xl p-4 text-white focus:outline-none transition-colors ${errors.age ? 'border-red-500' : 'border-white/5 focus:border-brand-orange'}`}
                  placeholder="25"
                />
                {errors.age && <p className="text-red-500 text-xs mt-2 flex items-center gap-1"><Info size={12} /> {errors.age}</p>}
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-bold mb-3">Height (cm)</label>
                <input 
                  type="number" 
                  value={profile.height}
                  onChange={(e) => setProfile({ ...profile, height: parseInt(e.target.value) || 0 })}
                  className={`w-full bg-surface-dark border rounded-2xl p-4 text-white focus:outline-none transition-colors ${errors.height ? 'border-red-500' : 'border-white/5 focus:border-brand-orange'}`}
                  placeholder="175"
                />
                {errors.height && <p className="text-red-500 text-xs mt-2 flex items-center gap-1"><Info size={12} /> {errors.height}</p>}
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-bold mb-3">Current Weight (kg)</label>
                <input 
                  type="number" 
                  value={profile.weight}
                  onChange={(e) => setProfile({ ...profile, weight: parseInt(e.target.value) || 0 })}
                  className={`w-full bg-surface-dark border rounded-2xl p-4 text-white focus:outline-none transition-colors ${errors.weight ? 'border-red-500' : 'border-white/5 focus:border-brand-orange'}`}
                  placeholder="70"
                />
                {errors.weight && <p className="text-red-500 text-xs mt-2 flex items-center gap-1"><Info size={12} /> {errors.weight}</p>}
              </div>
            </div>
          </section>

          <div className="pt-10 flex items-center justify-between border-t border-white/5">
            <button className="text-text-muted font-bold hover:text-white transition-colors">Back</button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCompleteOnboarding}
              className="bg-brand-orange hover:bg-brand-orange-dark text-bg-dark font-black py-4 px-10 rounded-2xl flex items-center gap-3 shadow-xl shadow-brand-orange/20 transition-colors"
            >
              Continue
              <ArrowRight size={20} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Utensils({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  );
}

function Flame({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.5 4 6.5 2 2 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}
