import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Flame,
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  Utensils,
  X,
  Zap,
} from 'lucide-react';
import { buildApiUrl } from '../../config/api';

const AUTH_TOKEN_KEY = 'calai_token';

const getAuthHeaders = (includeJson = false): Record<string, string> => {
  let token = '';
  try { token = sessionStorage.getItem(AUTH_TOKEN_KEY) || ''; } catch {}
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

interface FoodIngredient {
  name: string;
  amount: string;
  category: string;
  calories: number;
}

interface FoodAnalysis {
  id: string;
  name: string;
  image: string;
  source: 'upload' | 'camera';
  status: 'analyzed' | 'confirmed' | 'saved';
  detectedDish: string;
  detectedItems: string[];
  estimatedPortion: string;
  confidence: number;
  needsReview: boolean;
  totalKcal: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: FoodIngredient[];
  healthScore: number;
  sodium: 'LOW' | 'MEDIUM' | 'HIGH';
  dailyProgress: { current: number; target: number };
  createdAt: string;
}

type Stage = 'idle' | 'camera' | 'preview' | 'analyzing' | 'result' | 'error';
type CameraFacing = 'environment' | 'user';

interface FoodScanProps {
  onSavedToDiet?: () => void;
}

// Stepper labels shown during the 60-120s analysis call. They cycle on a
// timer because the backend does not stream progress — these are purely
// UX feedback so the user knows the request hasn't stalled.
const ANALYSIS_STEPS = [
  { key: 'normalize', label: 'Normalizing image', duration: 1500 },
  { key: 'detect', label: 'Identifying dish', duration: 25000 },
  { key: 'rag', label: 'Looking up nutrition database', duration: 18000 },
  { key: 'compose', label: 'Composing results', duration: 12000 },
];

export function FoodScan({ onSavedToDiet }: FoodScanProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stage, setStage] = useState<Stage>('idle');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraFacing>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const [result, setResult] = useState<FoodAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<'system' | 'no_food'>('system');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const [history, setHistory] = useState<FoodAnalysis[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const stopCameraStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const startCameraStream = useCallback(async (mode: CameraFacing) => {
    setCameraError(null);
    setCameraReady(false);
    stopCameraStream();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser does not support camera access.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraReady(true);
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setCameraError('Camera permission was denied. Enable it in your browser settings to start scanning.');
      } else if (name === 'NotFoundError') {
        setCameraError('No camera was found on this device.');
      } else {
        setCameraError('Could not open the camera. Please try again.');
      }
    }
  }, [stopCameraStream]);

  // Only touch getUserMedia when the user explicitly enters the 'camera'
  // stage. The idle landing should be inert so the camera light doesn't
  // light up the moment they click the sidebar tab.
  useEffect(() => {
    if (stage === 'camera') {
      startCameraStream(facing);
    } else {
      stopCameraStream();
    }
    return () => { stopCameraStream(); };
  }, [stage, facing, startCameraStream, stopCameraStream]);

  const loadHistory = useCallback(async () => {
    setHistoryError(null);
    try {
      const response = await fetch(buildApiUrl('/users/food-analysis/history'), {
        headers: getAuthHeaders(),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.message || 'Failed to load scan history.');
      }
      setHistory(Array.isArray(body.data) ? body.data as FoodAnalysis[] : []);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Failed to load scan history.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleOpenCamera = () => {
    setErrorMessage(null);
    setStage('camera');
  };

  const handleSwitchCamera = () => {
    setFacing(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture: draw the current video frame to a hidden canvas, downscale to
  // ≤1024px (long edge), then export as JPEG data URL. Matches the size the
  // Cal-AI route accepts (≤8MB) and is more than enough for Qwen-VL/CLIP.
  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraReady) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    const maxEdge = 1024;
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const targetW = Math.round(w * scale);
    const targetH = Math.round(h * scale);
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, targetW, targetH);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedImage(dataUrl);
    setStage('preview');
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setErrorMessage(null);
    setStage('camera');
  };

  const handleBackToIdle = () => {
    setCapturedImage(null);
    setResult(null);
    setErrorMessage(null);
    setStage('idle');
  };

  // Drive the cosmetic step indicator while waiting on the long backend call.
  // We rotate through ANALYSIS_STEPS on a timer; the *real* completion signal
  // is whichever finishes first — the fetch or all steps having ticked.
  useEffect(() => {
    if (stage !== 'analyzing') return;
    setAnalysisStepIndex(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cumulative = 0;
    ANALYSIS_STEPS.forEach((step, idx) => {
      cumulative += step.duration;
      timers.push(setTimeout(() => {
        setAnalysisStepIndex(prev => Math.max(prev, idx + 1));
      }, cumulative));
    });
    return () => { timers.forEach(clearTimeout); };
  }, [stage]);

  const handleAnalyze = async () => {
    if (!capturedImage) return;
    setErrorMessage(null);
    setErrorKind('system');
    setStage('analyzing');
    try {
      const response = await fetch(buildApiUrl('/users/food-analysis/analyze'), {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ imageUrl: capturedImage, source: 'camera' }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        // 422 from the backend is reserved for the food-content gate — the
        // image was uploaded fine but CLIP rejected it as a non-food photo.
        // Treat it as a soft, user-correctable case (re-take guidance)
        // rather than the red "Analysis failed" path used for real outages.
        if (response.status === 422) {
          setErrorKind('no_food');
        } else {
          setErrorKind('system');
        }
        throw new Error(body?.message || `Analysis service returned HTTP ${response.status}.`);
      }
      setResult(body.data as FoodAnalysis);
      setStage('result');
      loadHistory();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setErrorMessage(message);
      setStage('error');
    }
  };

  const handleReanalyze = async () => {
    if (!result) return;
    setErrorMessage(null);
    setStage('analyzing');
    try {
      const response = await fetch(buildApiUrl(`/users/food-analysis/${result.id}/reanalyze`), {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.message || 'Re-analysis failed.');
      }
      setResult(body.data as FoodAnalysis);
      setStage('result');
      loadHistory();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not re-analyze.';
      setErrorMessage(message);
      setStage('error');
    }
  };

  const handleSaveToDiet = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      const response = await fetch(buildApiUrl(`/users/food-analysis/${result.id}/save`), {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.message || 'Could not save to diet log.');
      }
      setResult(body.data as FoodAnalysis);
      setSavedFlash(true);
      onSavedToDiet?.();
      loadHistory();
      setTimeout(() => setSavedFlash(false), 2200);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not save to diet log.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectHistoryItem = async (item: FoodAnalysis) => {
    setErrorMessage(null);
    setResult(item);
    setCapturedImage(item.image || null);
    setStage('result');
  };

  const handleDeleteHistoryItem = async (item: FoodAnalysis) => {
    if (!window.confirm(`Delete "${item.detectedDish || item.name || 'this scan'}" from history?`)) return;
    // Optimistic removal — restore on failure so the UI doesn't lie about
    // server state. If the deleted item is currently open in the detail
    // pane, bounce back to idle so we don't leave a stale view.
    const previous = history;
    setHistory(prev => prev.filter(h => h.id !== item.id));
    if (result?.id === item.id) {
      setResult(null);
      setCapturedImage(null);
      setStage('idle');
    }
    try {
      const response = await fetch(buildApiUrl(`/users/food-analysis/${item.id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem(AUTH_TOKEN_KEY) || ''}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      setHistory(previous);
      setHistoryError(err instanceof Error ? err.message : 'Failed to delete scan.');
    }
  };

  return (
    <div className="flex-1 lg:ml-64 min-h-screen pt-20 pb-24 px-4 sm:px-6 lg:px-10 lg:pt-12">
      <canvas ref={canvasRef} className="hidden" />

      <header className="mb-6 sm:mb-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-brand-orange">
          <Sparkles size={14} />
          AI Vision
        </div>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">
          Food Scan
        </h1>
        <p className="mt-2 text-sm text-text-muted max-w-xl">
          Point your camera at a meal. The AI will identify the dish, estimate
          calories and macros, and let you save it straight to your diet log.
        </p>
      </header>

      <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        {/* ─── LEFT: scan workspace ──────────────────────────────────── */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            {stage === 'idle' && (
              <motion.section
                key="idle"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="rounded-[2rem] bg-surface-darker border border-white/10 shadow-2xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={handleOpenCamera}
                  className="group relative w-full aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-bg-dark via-surface-dark to-bg-dark overflow-hidden focus:outline-none"
                  aria-label="Tap to open the camera"
                >
                  {/* Dashed brand frame */}
                  <span className="absolute inset-5 sm:inset-8 rounded-[1.5rem] border-2 border-dashed border-brand-orange/40 group-hover:border-brand-orange transition-colors" />

                  {/* Corner brackets for that scanner feel */}
                  <CornerBracket className="top-8 left-8 sm:top-12 sm:left-12" />
                  <CornerBracket className="top-8 right-8 sm:top-12 sm:right-12 rotate-90" />
                  <CornerBracket className="bottom-8 right-8 sm:bottom-12 sm:right-12 rotate-180" />
                  <CornerBracket className="bottom-8 left-8 sm:bottom-12 sm:left-12 -rotate-90" />

                  <div className="relative flex flex-col items-center text-center px-6 max-w-md">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative w-20 h-20 rounded-3xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center text-brand-orange shadow-lg shadow-brand-orange/10"
                    >
                      <span className="absolute inset-0 rounded-3xl bg-brand-orange/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Camera size={32} className="relative" />
                    </motion.div>
                    <h2 className="mt-5 text-xl sm:text-2xl font-black">Tap to start scanning</h2>
                    <p className="mt-2 text-sm text-text-muted">
                      We&apos;ll ask for camera access only when you tap. Your video stays on this device — only the snapshot you choose is sent to the AI.
                    </p>
                  </div>
                </button>

                <div className="px-6 sm:px-10 py-5 sm:py-6 bg-bg-dark/95 border-t border-white/5">
                  <button
                    onClick={handleOpenCamera}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-brand-orange text-bg-dark text-sm font-black uppercase tracking-widest shadow-lg shadow-brand-orange/30 hover:bg-brand-orange-dark transition-colors"
                  >
                    <Camera size={16} /> Open Camera
                  </button>
                </div>

                {cameraError && (
                  <div className="px-6 sm:px-10 pb-5 -mt-1">
                    <p className="text-xs text-red-300/90 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
                      {cameraError}
                    </p>
                  </div>
                )}
              </motion.section>
            )}

            {stage === 'camera' && (
              <motion.section
                key="camera"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="relative rounded-[2rem] overflow-hidden bg-surface-darker border border-white/10 shadow-2xl"
              >
                <div className="relative aspect-[3/4] sm:aspect-[4/3] bg-black">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity ${cameraReady ? 'opacity-100' : 'opacity-0'} ${facing === 'user' ? 'scale-x-[-1]' : ''}`}
                  />

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="relative w-[78%] aspect-square max-w-md">
                      <CornerBracket className="top-0 left-0" />
                      <CornerBracket className="top-0 right-0 rotate-90" />
                      <CornerBracket className="bottom-0 right-0 rotate-180" />
                      <CornerBracket className="bottom-0 left-0 -rotate-90" />

                      {cameraReady && (
                        <motion.div
                          className="absolute left-2 right-2 scan-line"
                          initial={{ top: '8%' }}
                          animate={{ top: ['8%', '92%', '8%'] }}
                          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      )}
                    </div>
                  </div>

                  {!cameraReady && !cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-text-muted">
                      <Loader2 className="animate-spin" size={28} />
                      <p className="text-xs font-bold uppercase tracking-widest">Starting camera…</p>
                    </div>
                  )}

                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center text-brand-orange">
                        <CameraOff size={20} />
                      </div>
                      <p className="text-sm text-white font-semibold max-w-xs">{cameraError}</p>
                      <div className="flex flex-col sm:flex-row gap-2 mt-2">
                        <button
                          onClick={() => startCameraStream(facing)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-orange text-bg-dark text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-orange/30 hover:bg-brand-orange-dark transition-colors"
                        >
                          <RefreshCw size={14} /> Try again
                        </button>
                        <button
                          onClick={handleBackToIdle}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-dark border border-white/10 text-xs font-bold text-white hover:bg-white/5 transition-colors"
                        >
                          <ChevronLeft size={14} /> Back
                        </button>
                      </div>
                    </div>
                  )}

                  {cameraReady && (
                    <>
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur text-[10px] font-bold uppercase tracking-widest text-white/90 border border-white/10">
                        Frame the meal
                      </div>
                      <button
                        onClick={handleBackToIdle}
                        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/55 backdrop-blur border border-white/15 flex items-center justify-center text-white hover:bg-black/75 transition-colors"
                        aria-label="Close camera"
                      >
                        <X size={18} />
                      </button>
                    </>
                  )}
                </div>

                <div className="px-6 sm:px-10 py-5 sm:py-6 bg-bg-dark/95 border-t border-white/5">
                  <div className="flex items-center justify-center gap-10">
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      disabled={!cameraReady}
                      onClick={handleCapture}
                      className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-opacity ${cameraReady ? 'opacity-100' : 'opacity-40 cursor-not-allowed'}`}
                      aria-label="Capture"
                    >
                      <span className="absolute inset-0 rounded-full border-4 border-brand-orange/60" />
                      <span className="absolute inset-2 rounded-full bg-brand-orange shadow-[0_0_24px_rgba(255,144,96,0.45)]" />
                      <Camera size={26} className="relative text-bg-dark" />
                    </motion.button>

                    <button
                      onClick={handleSwitchCamera}
                      disabled={!cameraReady}
                      className="flex flex-col items-center gap-1 text-text-muted hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label="Switch camera"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-surface-dark border border-white/10 flex items-center justify-center">
                        <RotateCcw size={20} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Flip</span>
                    </button>
                  </div>
                </div>
              </motion.section>
            )}

            {stage === 'preview' && capturedImage && (
              <motion.section
                key="preview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="rounded-[2rem] overflow-hidden bg-surface-darker border border-white/10 shadow-2xl"
              >
                <div className="relative aspect-[3/4] sm:aspect-[4/3] bg-black">
                  <img src={capturedImage} alt="Captured frame" className="absolute inset-0 w-full h-full object-cover" />
                  <button
                    onClick={handleRetake}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/55 backdrop-blur border border-white/15 flex items-center justify-center text-white hover:bg-black/75 transition-colors"
                    aria-label="Discard"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="px-6 sm:px-10 py-6 bg-bg-dark/95 border-t border-white/5 space-y-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-orange">Ready</p>
                    <p className="mt-1 text-base font-semibold">Send this image to the AI?</p>
                    <p className="mt-1 text-xs text-text-muted">Analysis usually takes 60–120 seconds.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleRetake}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-surface-dark border border-white/10 text-sm font-bold text-white hover:bg-white/5 transition-colors"
                    >
                      <RefreshCw size={16} /> Retake
                    </button>
                    <button
                      onClick={handleAnalyze}
                      className="flex-[1.4] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-brand-orange text-bg-dark text-sm font-black uppercase tracking-widest shadow-lg shadow-brand-orange/30 hover:bg-brand-orange-dark transition-colors"
                    >
                      <Sparkles size={16} /> Analyze with AI
                    </button>
                  </div>
                </div>
              </motion.section>
            )}

            {stage === 'analyzing' && capturedImage && (
              <motion.section
                key="analyzing"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="rounded-[2rem] bg-surface-darker border border-white/10 overflow-hidden shadow-2xl"
              >
                <div className="grid lg:grid-cols-[1fr_1.2fr]">
                  <div className="relative aspect-square lg:aspect-auto bg-black overflow-hidden">
                    <img src={capturedImage} alt="Analyzing" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/80 via-transparent to-transparent" />
                    <motion.div
                      className="absolute inset-x-6 scan-line"
                      initial={{ top: '5%' }}
                      animate={{ top: ['5%', '95%', '5%'] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                  <div className="p-6 sm:p-10">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-brand-orange">
                      <Zap size={14} />
                      Analyzing
                    </div>
                    <h2 className="mt-2 text-2xl font-black">AI is identifying your dish</h2>
                    <p className="mt-2 text-sm text-text-muted">
                      The Qwen-VL + CLIP + Qdrant pipeline is running. Keep this tab open — results
                      appear as soon as it&apos;s done.
                    </p>

                    <ul className="mt-6 space-y-3">
                      {ANALYSIS_STEPS.map((step, idx) => {
                        const isDone = idx < analysisStepIndex;
                        const isActive = idx === analysisStepIndex;
                        return (
                          <li
                            key={step.key}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors ${
                              isActive
                                ? 'border-brand-orange/40 bg-brand-orange/10'
                                : isDone
                                  ? 'border-emerald-400/30 bg-emerald-400/5'
                                  : 'border-white/5 bg-surface-dark/50'
                            }`}
                          >
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                              isActive
                                ? 'bg-brand-orange text-bg-dark'
                                : isDone
                                  ? 'bg-emerald-400/20 text-emerald-300'
                                  : 'bg-white/5 text-text-muted'
                            }`}>
                              {isDone ? <CheckCircle2 size={14} /> : isActive ? <Loader2 size={14} className="animate-spin" /> : idx + 1}
                            </span>
                            <span className={`text-sm font-semibold ${isActive ? 'text-white' : isDone ? 'text-emerald-200' : 'text-text-muted'}`}>
                              {step.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    <p className="mt-6 text-[11px] text-text-muted font-bold uppercase tracking-widest">
                      Usually takes 60–120 seconds
                    </p>
                  </div>
                </div>
              </motion.section>
            )}

            {stage === 'result' && result && (
              <motion.section
                key="result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <button
                  onClick={handleBackToIdle}
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors"
                >
                  <ChevronLeft size={14} /> Scan another dish
                </button>

                <div className="rounded-[2rem] overflow-hidden bg-surface-darker border border-white/10 shadow-2xl">
                  <div className="grid lg:grid-cols-[1.1fr_1.4fr]">
                    <div className="relative aspect-square lg:aspect-auto bg-black">
                      {(capturedImage || result.image) && (
                        <img src={capturedImage || result.image} alt={result.detectedDish} className="absolute inset-0 w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-bg-dark via-bg-dark/60 to-transparent">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-brand-orange">
                          <Sparkles size={12} />
                          Identified
                        </div>
                        <h2 className="mt-1 text-2xl font-black text-white">{result.detectedDish || result.name}</h2>
                        <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-bold">
                            {Math.round((result.confidence || 0) * 100)}%
                          </span>
                          <span>•</span>
                          <span>{result.estimatedPortion}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 sm:p-8">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <NutritionCell
                          icon={<Flame size={16} />}
                          value={result.totalKcal}
                          unit="kcal"
                          label="Calories"
                          accent
                        />
                        <NutritionCell value={result.protein} unit="g" label="Protein" />
                        <NutritionCell value={result.carbs} unit="g" label="Carbs" />
                        <NutritionCell value={result.fats} unit="g" label="Fat" />
                      </div>

                      <div className="mt-5 grid sm:grid-cols-2 gap-3">
                        <InfoChip
                          label="Health score"
                          value={`${result.healthScore.toFixed(1)} / 10`}
                          tone="positive"
                        />
                        <InfoChip
                          label="Sodium"
                          value={result.sodium === 'LOW' ? 'Low' : result.sodium === 'MEDIUM' ? 'Medium' : 'High'}
                          tone={result.sodium === 'LOW' ? 'positive' : result.sodium === 'HIGH' ? 'warning' : 'neutral'}
                        />
                      </div>

                      {result.needsReview && (
                        <div className="mt-4 px-4 py-3 rounded-2xl border border-brand-orange/30 bg-brand-orange/10 text-xs text-brand-orange flex items-center gap-2">
                          <Sparkles size={14} /> Low confidence — please double-check before saving.
                        </div>
                      )}

                      <div className="mt-5 px-4 py-3 rounded-2xl bg-bg-dark/60 border border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">
                          Today
                        </p>
                        <DailyProgressBar
                          current={result.dailyProgress.current}
                          target={result.dailyProgress.target}
                        />
                      </div>

                      <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={handleReanalyze}
                          disabled={saving}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-surface-dark border border-white/10 text-sm font-bold text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw size={16} /> Re-analyze
                        </button>
                        <button
                          onClick={handleSaveToDiet}
                          disabled={saving || result.status === 'saved'}
                          className="flex-[1.4] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-brand-orange text-bg-dark text-sm font-black uppercase tracking-widest shadow-lg shadow-brand-orange/30 hover:bg-brand-orange-dark transition-colors disabled:opacity-60"
                        >
                          {saving ? (
                            <><Loader2 size={16} className="animate-spin" /> Saving…</>
                          ) : result.status === 'saved' ? (
                            <><CheckCircle2 size={16} /> Saved to diet log</>
                          ) : (
                            <><Utensils size={16} /> Save to diet log</>
                          )}
                        </button>
                      </div>

                      <AnimatePresence>
                        {savedFlash && (
                          <motion.p
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-3 text-xs font-bold text-emerald-300"
                          >
                            ✓ Added to today&apos;s Diet goals.
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {result.ingredients.length > 0 && (
                  <div className="rounded-[1.5rem] bg-surface-darker border border-white/10 p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-text-muted">
                      Detected ingredients
                    </h3>
                    <ul className="mt-4 grid sm:grid-cols-2 gap-2">
                      {result.ingredients.map((ing, i) => (
                        <li key={i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-bg-dark/60 border border-white/5">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{ing.name}</p>
                            <p className="text-[11px] text-text-muted truncate">{ing.amount} • {ing.category}</p>
                          </div>
                          <span className="ml-3 shrink-0 text-xs font-black text-brand-orange">{ing.calories} kcal</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.section>
            )}

            {stage === 'error' && (
              <motion.section
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={`rounded-[2rem] bg-surface-darker p-8 text-center border ${
                  errorKind === 'no_food' ? 'border-brand-orange/40' : 'border-red-400/30'
                }`}
              >
                <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center border ${
                  errorKind === 'no_food'
                    ? 'bg-brand-orange/15 border-brand-orange/40 text-brand-orange'
                    : 'bg-red-400/15 border-red-400/30 text-red-300'
                }`}>
                  {errorKind === 'no_food' ? <Utensils size={22} /> : <CameraOff size={22} />}
                </div>
                <h2 className="mt-4 text-xl font-black">
                  {errorKind === 'no_food' ? 'No food detected' : 'Analysis failed'}
                </h2>
                <p className="mt-2 text-sm text-text-muted max-w-md mx-auto">
                  {errorMessage || (errorKind === 'no_food'
                    ? "We couldn't find a meal in this image. Try again with a clear photo of food."
                    : 'The AI service returned an error. Please try again.')}
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                  {errorKind === 'no_food' ? (
                    <button
                      onClick={handleRetake}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-brand-orange text-bg-dark text-sm font-black uppercase tracking-widest hover:bg-brand-orange-dark transition-colors"
                    >
                      <Camera size={16} /> Retake photo
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setStage('preview')}
                        disabled={!capturedImage}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-surface-dark border border-white/10 text-sm font-bold hover:bg-white/5 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={16} /> Try again
                      </button>
                      <button
                        onClick={handleBackToIdle}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-brand-orange text-bg-dark text-sm font-black uppercase tracking-widest hover:bg-brand-orange-dark transition-colors"
                      >
                        <Camera size={16} /> Scan another dish
                      </button>
                    </>
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          <p className="mt-6 text-center text-[11px] text-text-muted">
            Tip: shoot in good light, keep the dish centered, and avoid occlusions for the best AI accuracy.
          </p>
        </div>

        {/* ─── RIGHT: scan history ──────────────────────────────────── */}
        <aside className="lg:sticky lg:top-6 self-start rounded-[1.5rem] bg-surface-darker border border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <History size={16} className="text-brand-orange" />
              <h3 className="text-sm font-black uppercase tracking-widest">Scan History</h3>
            </div>
            <button
              onClick={loadHistory}
              className="text-text-muted hover:text-white transition-colors"
              aria-label="Refresh history"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="max-h-[28rem] lg:max-h-[calc(100vh-12rem)] overflow-y-auto custom-scrollbar">
            {historyLoading ? (
              <div className="px-5 py-8 flex flex-col items-center gap-2 text-text-muted">
                <Loader2 size={18} className="animate-spin" />
                <p className="text-xs font-bold uppercase tracking-widest">Loading history…</p>
              </div>
            ) : historyError ? (
              <div className="px-5 py-6 text-center">
                <p className="text-xs text-red-300/90">{historyError}</p>
                <button
                  onClick={loadHistory}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
                >
                  <RefreshCw size={12} /> Retry
                </button>
              </div>
            ) : history.length === 0 ? (
              <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-surface-dark border border-white/10 flex items-center justify-center text-text-muted">
                  <Utensils size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold">No scans yet</p>
                  <p className="mt-1 text-[11px] text-text-muted">
                    Every dish you scan will appear here so you can re-open or compare it later.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {history.map(item => {
                  const isActive = stage === 'result' && result?.id === item.id;
                  return (
                    <li key={item.id} className="group relative">
                      <button
                        onClick={() => handleSelectHistoryItem(item)}
                        className={`w-full text-left flex items-center gap-3 px-4 py-3 pr-12 transition-colors ${
                          isActive ? 'bg-brand-orange/10' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-bg-dark border border-white/10">
                          {item.image ? (
                            <img src={item.image} alt={item.detectedDish || item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-muted">
                              <Utensils size={18} />
                            </div>
                          )}
                          {item.status === 'saved' && (
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-surface-darker flex items-center justify-center">
                              <CheckCircle2 size={10} className="text-bg-dark" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-bold truncate ${isActive ? 'text-brand-orange' : 'text-white'}`}>
                            {item.detectedDish || item.name || 'Unknown dish'}
                          </p>
                          <p className="text-[11px] text-text-muted truncate">
                            {Math.round(item.totalKcal)} kcal • {Math.round((item.confidence || 0) * 100)}%
                          </p>
                          <p className="text-[10px] text-text-muted/80 mt-0.5 flex items-center gap-1">
                            <Clock size={10} />
                            {formatRelativeTime(item.createdAt)}
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistoryItem(item);
                        }}
                        aria-label="Delete scan"
                        className="absolute top-1/2 right-3 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Helpers + subcomponents
// ────────────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CornerBracket({ className = '' }: { className?: string }) {
  return (
    <span
      className={`absolute w-8 h-8 border-t-[3px] border-l-[3px] border-brand-orange rounded-tl-xl ${className}`}
      aria-hidden
    />
  );
}

function NutritionCell({
  icon, value, unit, label, accent = false,
}: {
  icon?: React.ReactNode;
  value: number;
  unit: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className={`px-4 py-3 rounded-2xl border ${accent ? 'border-brand-orange/40 bg-brand-orange/10' : 'border-white/10 bg-bg-dark/60'}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-text-muted">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-xl font-black text-white">
        {Math.round(value || 0)}
        <span className="ml-1 text-xs font-bold text-text-muted">{unit}</span>
      </p>
    </div>
  );
}

function InfoChip({
  label, value, tone,
}: {
  label: string;
  value: string;
  tone: 'positive' | 'neutral' | 'warning';
}) {
  const toneClass =
    tone === 'positive' ? 'border-emerald-400/30 text-emerald-200 bg-emerald-400/10'
    : tone === 'warning' ? 'border-red-400/30 text-red-200 bg-red-400/10'
    : 'border-white/10 text-white/80 bg-white/5';
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${toneClass}`}>
      <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function DailyProgressBar({ current, target }: { current: number; target: number }) {
  const safeTarget = target > 0 ? target : 1;
  const ratio = Math.min(1, current / safeTarget);
  return (
    <>
      <div className="mt-2 flex items-baseline justify-between gap-2 text-xs text-text-muted">
        <span className="text-white font-black text-base">{Math.round(current)} kcal</span>
        <span>/ {Math.round(target)} kcal</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-brand-orange-dark to-brand-orange"
        />
      </div>
    </>
  );
}
