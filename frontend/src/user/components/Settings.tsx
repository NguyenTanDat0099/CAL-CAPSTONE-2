import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Edit3, 
  Save, 
  X, 
  User, 
  Calendar, 
  Ruler, 
  Venus, 
  Mars, 
  Weight,
  Zap,
  Target,
  Quote
} from 'lucide-react';
import { UserProfile, Gender } from '../App';

interface SettingsProps {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
}

export function Settings({ profile, setProfile }: SettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UserProfile>(profile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    setProfile(editForm);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm(profile);
    setIsEditing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const progressPercentage = 68; // Mocked as per image

  return (
    <div className="flex-1 ml-64 p-10 min-h-screen bg-bg-dark text-white relative overflow-y-auto">
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-muted text-sm font-bold uppercase tracking-widest">
          <span>Setting</span>
          <span className="opacity-30">/</span>
          <span className="text-white">User Profile</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto space-y-12">
        {/* Profile Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[2rem] overflow-hidden border-2 border-brand-orange/20 p-1">
                <img 
                  src={profile.avatar} 
                  alt={profile.name} 
                  className="w-full h-full object-cover rounded-[1.8rem]"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-brand-orange text-bg-dark flex items-center justify-center shadow-lg border-4 border-bg-dark">
                <Camera size={18} />
              </div>
            </div>
            <div>
              <h1 className="text-6xl font-black tracking-tighter mb-2">{profile.name}</h1>
              <span className="px-3 py-1 rounded-full bg-surface-lighter text-brand-orange text-[10px] font-black uppercase tracking-widest">
                Member
              </span>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-surface-lighter border border-white/5 text-sm font-bold hover:bg-white/5 transition-colors"
          >
            <Edit3 size={18} className="text-brand-orange" />
            <span>Edit Profile</span>
          </motion.button>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Left Column */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            {/* Personal Narrative */}
            <section className="bg-surface-dark/30 rounded-[2.5rem] p-10 border border-white/5 relative overflow-hidden">
              <Quote className="absolute top-8 right-8 text-white/5 w-24 h-24" />
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-6">Personal Narrative</p>
                <p className="text-2xl font-medium leading-relaxed italic text-white/90">
                  "Pushing for high-performance nutrition while maintaining a sustainable lifestyle. Focused on lean muscle growth and kinetic energy."
                </p>
              </div>
            </section>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* Age */}
              <div className="bg-surface-dark/30 rounded-[2.5rem] p-8 border border-white/5 relative group">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Age</p>
                  <Calendar size={18} className="text-text-muted opacity-30" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black">{profile.age}</span>
                  <span className="text-sm font-bold text-text-muted">years</span>
                </div>
              </div>

              {/* Height */}
              <div className="bg-surface-dark/30 rounded-[2.5rem] p-8 border border-white/5 relative group">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Height</p>
                  <Ruler size={18} className="text-text-muted opacity-30" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black">{profile.height}</span>
                  <span className="text-sm font-bold text-text-muted">cm</span>
                </div>
              </div>

              {/* Gender */}
              <div className="bg-surface-dark/30 rounded-[2.5rem] p-8 border border-white/5 relative group">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Gender</p>
                  {profile.gender === 'male' ? <Mars size={18} className="text-text-muted opacity-30" /> : <Venus size={18} className="text-text-muted opacity-30" />}
                </div>
                <span className="text-4xl font-black capitalize">{profile.gender}</span>
              </div>

              {/* Weight */}
              <div className="bg-surface-dark/30 rounded-[2.5rem] p-8 border border-white/5 relative group">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Weight</p>
                  <Weight size={18} className="text-text-muted opacity-30" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black">{profile.weight}</span>
                  <span className="text-sm font-bold text-text-muted">kg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-12 lg:col-span-4 space-y-8">
            {/* Current Objective */}
            <section className="bg-brand-orange rounded-[2.5rem] p-10 text-bg-dark relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-4">Current Objective</p>
                <h3 className="text-4xl font-black mb-12">
                  {profile.goal === 'lose' ? 'Weight Loss' : profile.goal === 'gain' ? 'Muscle Gain' : profile.goal === 'maintain' ? 'Maintenance' : 'Health'}
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Progress</span>
                    <span className="text-3xl font-black">{progressPercentage}%</span>
                  </div>
                  <div className="h-4 w-full bg-bg-dark/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      className="h-full bg-bg-dark"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Activity Level */}
            <section className="bg-surface-dark/30 rounded-[2.5rem] p-10 border border-white/5 relative overflow-hidden">
              <Zap className="absolute -bottom-4 -right-4 text-white/5 w-32 h-32" />
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-4">Activity Level</p>
                <h3 className="text-3xl font-black mb-4 capitalize">
                  {profile.activityLevel === 'sedentary' ? 'Sedentary' : 
                   profile.activityLevel === 'light' ? 'Lightly Active' :
                   profile.activityLevel === 'moderate' ? 'Moderately Active' : 'Very Active'}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  {profile.activityLevel === 'active' ? '6+ workouts per week with high intensity focus.' : 'Regular activity and consistent movement.'}
                </p>

                <div className="flex gap-2 mt-12">
                  {[1, 2, 3, 4].map((step) => (
                    <div 
                      key={step}
                      className={`h-1.5 flex-1 rounded-full ${
                        (profile.activityLevel === 'sedentary' && step === 1) ||
                        (profile.activityLevel === 'light' && step <= 2) ||
                        (profile.activityLevel === 'moderate' && step <= 3) ||
                        (profile.activityLevel === 'active' && step <= 4)
                        ? 'bg-brand-orange' : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="absolute inset-0 bg-bg-dark/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-surface-dark border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-3xl font-black">Edit Profile</h2>
                  <button onClick={handleCancel} className="text-text-muted hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-8">
                  {/* Avatar & Name */}
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-[1.5rem] overflow-hidden border border-white/10">
                        <img src={editForm.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <button 
                        onClick={triggerFileInput}
                        className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-brand-orange text-bg-dark flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                      >
                        <Camera size={14} />
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 block">Full Name</label>
                      <input 
                        type="text" 
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-brand-orange transition-colors font-bold"
                      />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 block">Age</label>
                      <input 
                        type="number" 
                        value={editForm.age}
                        onChange={(e) => setEditForm({ ...editForm, age: parseInt(e.target.value) || 0 })}
                        className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-brand-orange transition-colors font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 block">Gender</label>
                      <div className="flex bg-bg-dark border border-white/10 rounded-2xl p-1">
                        {(['male', 'female'] as const).map((g) => (
                          <button
                            key={g}
                            onClick={() => setEditForm({ ...editForm, gender: g })}
                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                              editForm.gender === g ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white/60'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 block">Height (cm)</label>
                      <input 
                        type="number" 
                        value={editForm.height}
                        onChange={(e) => setEditForm({ ...editForm, height: parseInt(e.target.value) || 0 })}
                        className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-brand-orange transition-colors font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 block">Weight (kg)</label>
                      <input 
                        type="number" 
                        value={editForm.weight}
                        onChange={(e) => setEditForm({ ...editForm, weight: parseInt(e.target.value) || 0 })}
                        className="w-full bg-bg-dark border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-brand-orange transition-colors font-bold"
                      />
                    </div>
                  </div>

                  <div className="pt-6 flex gap-4">
                    <button 
                      onClick={handleCancel}
                      className="flex-1 py-4 rounded-2xl bg-white/5 text-sm font-bold hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSave}
                      className="flex-1 py-4 rounded-2xl bg-brand-orange text-bg-dark font-black shadow-lg shadow-brand-orange/20"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
