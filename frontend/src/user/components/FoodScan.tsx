import React, { useRef, useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, ChevronRight, Loader2, CheckCircle2, X, ArrowLeft, Flame, Zap, Droplets, Utensils, Plus, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DietItem } from '../types';

interface Ingredient {
  name: string;
  amount: string;
  category: string;
  calories: number;
  icon: React.ReactNode;
}

interface ScanData {
  name: string;
  image: string;
  timeAgo: string;
  totalKcal: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: Ingredient[];
  healthScore: number;
  sodium: string;
  dailyProgress: {
    current: number;
    target: number;
  };
}

const initialRecentAnalyses: ScanData[] = [
  {
    name: 'Tonkotsu Ramen',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=100&h=100&fit=crop',
    timeAgo: '2 hours ago',
    totalKcal: 740,
    protein: 25,
    carbs: 85,
    fats: 32,
    ingredients: [],
    healthScore: 6.5,
    sodium: 'HIGH',
    dailyProgress: { current: 1500, target: 2230 }
  },
  {
    name: 'Avocado Salad',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=100&h=100&fit=crop',
    timeAgo: 'Yesterday',
    totalKcal: 320,
    protein: 8,
    carbs: 12,
    fats: 28,
    ingredients: [],
    healthScore: 9.2,
    sodium: 'LOW',
    dailyProgress: { current: 1200, target: 2230 }
  }
];

const mockScanResult: ScanData = {
  name: 'Chicken Hummus Bowl',
  image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=800&fit=crop',
  timeAgo: 'Scanned just now',
  totalKcal: 575,
  protein: 42,
  carbs: 68,
  fats: 14,
  ingredients: [
    { name: 'Grilled Chicken Strips', amount: '150g', category: 'Lean Protein', calories: 220, icon: <Utensils size={18} /> },
    { name: 'Whole Grain Naan', amount: '1 piece', category: 'Complex Carb', calories: 260, icon: <Zap size={18} /> },
    { name: 'Sautéed Bell Peppers', amount: '80g', category: 'Fibrous Veg', calories: 95, icon: <Droplets size={18} /> },
  ],
  healthScore: 8.4,
  sodium: 'LOW',
  dailyProgress: {
    current: 1720,
    target: 2230
  }
};

interface FoodScanProps {
  onAddToMyDiet: (item: Omit<DietItem, 'id' | 'date'>) => void;
}

export function FoodScan({ onAddToMyDiet }: FoodScanProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [scanResult, setScanResult] = useState<ScanData | null>(null);
  const [history, setHistory] = useState<ScanData[]>(initialRecentAnalyses);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (isCameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraActive, stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please ensure you have given permission.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const handleScanSuccess = (imageUrl?: string) => {
    const newResult: ScanData = {
      ...mockScanResult,
      image: imageUrl || mockScanResult.image,
      timeAgo: 'Scanned just now'
    };
    setScanResult(newResult);
    setHistory(prev => [newResult, ...prev]);
    setShowResult(true);
    stopCamera();
  };

  const viewHistoryItem = (item: ScanData) => {
    setScanResult(item);
    setShowResult(true);
  };

  const captureAndScan = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageUrl = canvas.toDataURL('image/jpeg');
        handleScanSuccess(imageUrl);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setIsUploading(true);
      setUploadSuccess(false);
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadSuccess(true);
        
        setTimeout(() => {
          setUploadSuccess(false);
          handleScanSuccess(imageUrl);
        }, 1500);
      }, 2000);
    }
  };

  if (showResult && scanResult) {
    return (
      <div className="flex-1 ml-64 p-10 min-h-screen bg-bg-dark text-white">
        <header className="mb-8 flex items-center gap-4">
          <button 
            onClick={() => setShowResult(false)}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Scan Result</h1>
        </header>

        <div className="grid grid-cols-12 gap-8 max-w-7xl">
          {/* Left Column */}
          <div className="col-span-12 lg:col-span-7 space-y-8">
            {/* Hero Image Card */}
            <div className="relative rounded-[2.5rem] overflow-hidden h-[400px] group shadow-2xl">
              <img 
                src={scanResult.image} 
                alt={scanResult.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-10 left-10">
                <div className="inline-block px-3 py-1 rounded-full bg-brand-orange/20 backdrop-blur-md border border-brand-orange/30 text-[10px] font-bold text-brand-orange uppercase tracking-widest mb-4">
                  Verified Scan
                </div>
                <h2 className="text-5xl font-black mb-2">{scanResult.name}</h2>
                <p className="text-white/60 text-sm">{scanResult.timeAgo}</p>
              </div>
            </div>

            {/* Ingredients Breakdown */}
            <div className="bg-surface-dark/50 rounded-[2.5rem] p-10 border border-white/5">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold">Ingredients Breakdown</h3>
                <span className="text-xs text-text-muted font-medium">{scanResult.ingredients.length} items detected</span>
              </div>
              <div className="space-y-4">
                {scanResult.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="w-14 h-14 rounded-2xl bg-bg-dark flex items-center justify-center text-brand-orange">
                      {ing.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg">{ing.name}</h4>
                      <p className="text-sm text-text-muted">{ing.amount} • {ing.category}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold">{ing.calories}</span>
                      <span className="text-xs text-text-muted ml-1">kcal</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <h3 className="text-xl font-bold mb-4">Nutritional Impact</h3>
            
            {/* Macro Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#A594F9] rounded-[2rem] p-6 text-bg-dark relative overflow-hidden">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Flame size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Target</span>
                </div>
                <div className="mt-auto">
                  <div className="text-4xl font-black">{scanResult.totalKcal}</div>
                  <div className="text-xs font-bold opacity-60">Total kcal</div>
                </div>
              </div>

              <div className="bg-[#2DD4BF] rounded-[2rem] p-6 text-bg-dark relative overflow-hidden">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Utensils size={20} />
                  </div>
                  <span className="text-[10px] font-bold bg-black/10 px-2 py-1 rounded-full">83%</span>
                </div>
                <div className="mt-auto">
                  <div className="text-4xl font-black">{scanResult.protein}g</div>
                  <div className="text-xs font-bold opacity-60">Protein</div>
                </div>
              </div>

              <div className="bg-[#FCD34D] rounded-[2rem] p-6 text-bg-dark relative overflow-hidden">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Zap size={20} />
                  </div>
                  <span className="text-[10px] font-bold bg-black/10 px-2 py-1 rounded-full">24%</span>
                </div>
                <div className="mt-auto">
                  <div className="text-4xl font-black">{scanResult.carbs}g</div>
                  <div className="text-xs font-bold opacity-60">Carbohydrates</div>
                </div>
              </div>

              <div className="bg-[#FB7185] rounded-[2rem] p-6 text-bg-dark relative overflow-hidden">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Droplets size={20} />
                  </div>
                  <span className="text-[10px] font-bold bg-black/10 px-2 py-1 rounded-full">12%</span>
                </div>
                <div className="mt-auto">
                  <div className="text-4xl font-black">{scanResult.fats}g</div>
                  <div className="text-xs font-bold opacity-60">Healthy Fats</div>
                </div>
              </div>
            </div>

            {/* Daily Allotment Card */}
            <div className="bg-surface-dark/50 rounded-[2.5rem] p-8 border border-white/5 space-y-8">
              <div className="flex items-center gap-3 text-brand-orange">
                <Zap size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Daily Allotment</span>
              </div>
              
              <div>
                <div className="flex justify-between items-end mb-3">
                  <span className="text-sm font-bold">Daily Calorie Progress</span>
                  <span className="text-sm font-bold text-brand-orange">
                    {scanResult.dailyProgress.current.toLocaleString()} / {scanResult.dailyProgress.target.toLocaleString()} kcal
                  </span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(scanResult.dailyProgress.current / scanResult.dailyProgress.target) * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-brand-orange to-brand-orange-dark"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg-dark rounded-3xl p-6 text-center border border-white/5">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Health Score</div>
                  <div className="text-3xl font-black text-[#2DD4BF]">{scanResult.healthScore}</div>
                </div>
                <div className="bg-bg-dark rounded-3xl p-6 text-center border border-white/5">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Sodium</div>
                  <div className="text-3xl font-black text-white">{scanResult.sodium}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4 pt-4">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onAddToMyDiet({
                  name: scanResult.name,
                  calories: scanResult.totalKcal,
                  protein: scanResult.protein,
                  carbs: scanResult.carbs,
                  fats: scanResult.fats,
                  image: scanResult.image
                })}
                className="w-full bg-brand-orange hover:bg-brand-orange-dark text-bg-dark font-black py-6 rounded-3xl flex items-center justify-center gap-3 text-lg shadow-xl shadow-brand-orange/20 transition-colors"
              >
                Add to My Diet
                <Plus size={24} />
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowResult(false)}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-6 rounded-3xl flex items-center justify-center gap-3 transition-colors"
              >
                Re-scan Item
                <RotateCcw size={20} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 ml-64 p-10 min-h-screen relative bg-bg-dark text-white">
      <canvas ref={canvasRef} className="hidden" />
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*"
      />
      <header className="mb-12">
        <h1 className="text-5xl font-black tracking-tight mb-2">Food Scan</h1>
        <p className="text-text-muted text-lg max-w-2xl">
          Harness AI to instantly identify nutrients and log your performance fuel.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-6 max-w-6xl">
        {/* AI Camera Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-12 lg:col-span-8 relative group overflow-hidden rounded-3xl bg-surface-dark border border-white/5 h-[500px]"
        >
          <div className="absolute inset-0 z-0">
            {isCameraActive ? (
              <video 
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img 
                src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=800&fit=crop" 
                alt="Food background"
                className="w-full h-full object-cover opacity-20 grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-transparent to-transparent" />
          </div>

          {/* Viewfinder UI */}
          <div className="absolute inset-10 border-2 border-brand-orange/20 rounded-2xl pointer-events-none z-10">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-orange -translate-x-1 -translate-y-1" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-orange translate-x-1 -translate-y-1" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-orange -translate-x-1 translate-y-1" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-orange translate-x-1 translate-y-1" />
            
            {/* Animated Scan Line */}
            <motion.div 
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-x-0 scan-line opacity-50"
            />
          </div>

          <div className="relative z-10 h-full flex flex-col justify-between p-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-red-500 animate-pulse' : 'bg-brand-orange animate-pulse'}`} />
                <span className={`text-xs font-bold tracking-widest uppercase ${isCameraActive ? 'text-red-500' : 'text-brand-orange'}`}>
                  {isCameraActive ? 'System is recording' : 'System Ready'}
                </span>
              </div>
              {!isCameraActive && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <h2 className="text-4xl font-bold mb-4">AI Camera</h2>
                  <p className="text-text-muted max-w-sm">
                    Point your lens at any meal. Our neural engine identifies ingredients and calculates macros in real-time.
                  </p>
                </motion.div>
              )}
            </div>

            <div className="flex justify-center gap-4">
              {isCameraActive ? (
                <div className="flex gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={captureAndScan}
                    className="flex items-center gap-4 bg-brand-orange px-10 py-5 rounded-2xl shadow-2xl shadow-brand-orange/20"
                  >
                    <CheckCircle2 size={28} className="text-bg-dark" />
                    <span className="text-xl font-bold text-bg-dark">Capture & Scan</span>
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={stopCamera}
                    className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/20 px-10 py-5 rounded-2xl"
                  >
                    <X size={28} className="text-white" />
                    <span className="text-xl font-bold text-white">Cancel</span>
                  </motion.button>
                </div>
              ) : (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startCamera}
                  className="flex items-center gap-4 bg-gradient-to-r from-brand-orange to-brand-orange-dark px-10 py-5 rounded-2xl shadow-2xl shadow-brand-orange/20"
                >
                  <Camera size={28} />
                  <span className="text-xl font-bold">Launch Live Scanner</span>
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Sidebar Actions */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          {/* Gallery Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={handleUploadClick}
            className="flex-1 bg-surface-lighter rounded-3xl p-8 flex flex-col items-center justify-center text-center border border-white/5 hover:bg-white/5 transition-colors cursor-pointer group relative overflow-hidden"
          >
            <AnimatePresence>
              {isUploading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-bg-dark/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6"
                >
                  <Loader2 className="text-brand-orange animate-spin mb-4" size={40} />
                  <p className="text-white font-bold">AI Analyzing...</p>
                  <p className="text-text-muted text-xs mt-2">Identifying nutrients & macros</p>
                </motion.div>
              )}

              {uploadSuccess && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 bg-green-500/10 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6"
                >
                  <CheckCircle2 className="text-green-500 mb-4" size={40} />
                  <p className="text-white font-bold">Analysis Complete!</p>
                  <p className="text-text-muted text-xs mt-2">Logged to your dashboard</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-16 h-16 rounded-full bg-bg-dark flex items-center justify-center mb-6 group-hover:bg-brand-orange/10 transition-colors">
              <ImageIcon size={32} className="text-brand-orange" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Gallery</h3>
            <p className="text-text-muted text-sm mb-6">
              Upload a saved photo from your library to analyze.
            </p>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleUploadClick();
              }}
              className="text-brand-orange font-bold hover:underline"
            >
              Select from Device
            </button>
          </motion.div>

          {/* Recent Analyses */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface-dark rounded-3xl p-6 border border-white/5"
          >
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Recent Analyses</h4>
            <div className="space-y-4">
              {history.map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => viewHistoryItem(item)}
                  className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-sm">{item.name}</p>
                    <p className="text-[10px] text-text-muted">{item.timeAgo} • {item.totalKcal} kcal</p>
                  </div>
                  <ChevronRight size={16} className="text-text-muted group-hover:text-brand-orange transition-colors" />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
