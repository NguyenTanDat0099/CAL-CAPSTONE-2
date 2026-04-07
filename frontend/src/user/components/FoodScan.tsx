import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, Image as ImageIcon, Loader2, RotateCcw, Save, Trash2 } from 'lucide-react';
import { DietItem } from '../types';

const API_BASE_URL = 'http://localhost:3000/api/users';

type AnalysisSource = 'upload' | 'camera';

interface FoodAnalysisResult {
  id: string;
  name: string;
  image: string;
  source: AnalysisSource;
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
  healthScore: number;
  sodium: 'LOW' | 'MEDIUM' | 'HIGH';
  dailyProgress: { current: number; target: number };
  createdAt: string;
}

interface FoodScanProps {
  onAddToMyDiet: (item: Omit<DietItem, 'id' | 'date'>) => void;
}

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const toTimeAgo = (isoDate: string) => {
  const diffHours = Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

export function FoodScan({ onAddToMyDiet }: FoodScanProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [history, setHistory] = useState<FoodAnalysisResult[]>([]);
  const [activeResult, setActiveResult] = useState<FoodAnalysisResult | null>(null);
  const [form, setForm] = useState({ name: '', totalKcal: 0, protein: 0, carbs: 0, fats: 0, estimatedPortion: '' });
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Ready to analyze');
  const [error, setError] = useState('');

  const refreshHistory = async () => {
    const response = await fetch(`${API_BASE_URL}/food-analysis/history`);
    const result = await response.json();
    setHistory(result.data ?? []);
  };

  useEffect(() => {
    refreshHistory().catch(() => setError('Could not load analysis history.'));
  }, []);

  useEffect(() => {
    if (cameraOn && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [cameraOn, stream]);

  useEffect(() => () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
  }, [stream]);

  const setFromAnalysis = (analysis: FoodAnalysisResult) => {
    setActiveResult(analysis);
    setForm({
      name: analysis.name,
      totalKcal: analysis.totalKcal,
      protein: analysis.protein,
      carbs: analysis.carbs,
      fats: analysis.fats,
      estimatedPortion: analysis.estimatedPortion,
    });
  };

  const analyzeImage = async (imageUrl: string, source: AnalysisSource) => {
    setBusy(true);
    setMessage('Analyzing food image...');
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/food-analysis/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, source }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Analyze failed');
      await refreshHistory();
      setFromAnalysis(result.data);
      setMessage('Analysis complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analyze failed');
    } finally {
      setBusy(false);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      setCameraOn(true);
    } catch {
      setError('Camera access failed.');
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    setStream(null);
    setCameraOn(false);
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    stopCamera();
    await analyzeImage(canvas.toDataURL('image/jpeg'), 'camera');
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const imageUrl = await fileToDataUrl(file);
    await analyzeImage(imageUrl, 'upload');
    event.target.value = '';
  };

  const patchActiveResult = (analysis: FoodAnalysisResult) => {
    setFromAnalysis(analysis);
    refreshHistory().catch(() => undefined);
  };

  const confirmResult = async () => {
    if (!activeResult) return;
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE_URL}/food-analysis/${activeResult.id}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Confirm failed');
      patchActiveResult(result.data);
      setMessage('Analysis confirmed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirm failed');
    } finally {
      setBusy(false);
    }
  };

  const saveResult = async () => {
    if (!activeResult) return;
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE_URL}/food-analysis/${activeResult.id}/save`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Save failed');
      patchActiveResult(result.data);
      onAddToMyDiet({
        name: result.data.name,
        calories: result.data.totalKcal,
        protein: result.data.protein,
        carbs: result.data.carbs,
        fats: result.data.fats,
        image: result.data.image,
        description: `${result.data.detectedDish} • ${result.data.estimatedPortion}`,
        about: `Detected items: ${result.data.detectedItems.join(', ')}`,
      });
      setMessage('Saved to meal log');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const reanalyzeResult = async () => {
    if (!activeResult) return;
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE_URL}/food-analysis/${activeResult.id}/reanalyze`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Reanalyze failed');
      patchActiveResult(result.data);
      setMessage('Reanalysis complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reanalyze failed');
    } finally {
      setBusy(false);
    }
  };

  const deleteResult = async () => {
    if (!activeResult) return;
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE_URL}/food-analysis/${activeResult.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Delete failed');
      setActiveResult(null);
      await refreshHistory();
      setMessage('Analysis deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 ml-64 p-10 min-h-screen bg-bg-dark text-white">
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
      <header className="mb-8">
        <h1 className="text-4xl font-black mb-2">Food Scan</h1>
        <p className="text-text-muted">Sprint 2 flow: upload/capture, analyze, review, save, reanalyze, delete, and history.</p>
      </header>

      {error && <div className="mb-6 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 rounded-[2rem] border border-white/5 bg-surface-dark p-8">
          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-brand-orange">{busy ? <><Loader2 className="inline mr-2 animate-spin" size={14} />{message}</> : message}</div>
          {!cameraOn ? (
            <div className="space-y-4">
              <button onClick={() => fileInputRef.current?.click()} className="w-full rounded-2xl bg-brand-orange px-6 py-4 font-black text-bg-dark flex items-center justify-center gap-3">
                <ImageIcon size={20} /> Upload Food Image
              </button>
              <button onClick={startCamera} className="w-full rounded-2xl bg-white/5 px-6 py-4 font-bold flex items-center justify-center gap-3">
                <Camera size={20} /> Capture From Camera
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <video ref={videoRef} autoPlay playsInline className="h-[340px] w-full rounded-2xl object-cover" />
              <div className="flex gap-4">
                <button onClick={captureAndAnalyze} className="flex-1 rounded-2xl bg-brand-orange px-6 py-4 font-black text-bg-dark">Capture & Analyze</button>
                <button onClick={stopCamera} className="flex-1 rounded-2xl bg-white/5 px-6 py-4 font-bold">Cancel</button>
              </div>
            </div>
          )}

          {activeResult && (
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveResult(null)} className="rounded-full bg-white/10 p-2"><ArrowLeft size={16} /></button>
                <h2 className="text-2xl font-bold">Analysis Result</h2>
              </div>

              {activeResult.needsReview && (
                <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100 flex items-center gap-2">
                  <AlertTriangle size={16} /> Low confidence recognition. Review values before saving.
                </div>
              )}

              <img src={activeResult.image} alt={activeResult.name} className="h-56 w-full rounded-2xl object-cover" />

              <div className="grid grid-cols-2 gap-4">
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="rounded-2xl border border-white/10 bg-bg-dark px-4 py-3" />
                <input value={form.estimatedPortion} onChange={e => setForm({ ...form, estimatedPortion: e.target.value })} className="rounded-2xl border border-white/10 bg-bg-dark px-4 py-3" />
                <input type="number" value={form.totalKcal} onChange={e => setForm({ ...form, totalKcal: Number(e.target.value) })} className="rounded-2xl border border-white/10 bg-bg-dark px-4 py-3" />
                <input type="number" value={form.protein} onChange={e => setForm({ ...form, protein: Number(e.target.value) })} className="rounded-2xl border border-white/10 bg-bg-dark px-4 py-3" />
                <input type="number" value={form.carbs} onChange={e => setForm({ ...form, carbs: Number(e.target.value) })} className="rounded-2xl border border-white/10 bg-bg-dark px-4 py-3" />
                <input type="number" value={form.fats} onChange={e => setForm({ ...form, fats: Number(e.target.value) })} className="rounded-2xl border border-white/10 bg-bg-dark px-4 py-3" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={confirmResult} disabled={busy} className="rounded-2xl bg-brand-orange px-5 py-3 font-black text-bg-dark flex items-center justify-center gap-2"><CheckCircle2 size={16} /> Confirm / Edit</button>
                <button onClick={saveResult} disabled={busy} className="rounded-2xl bg-white/5 px-5 py-3 font-bold flex items-center justify-center gap-2"><Save size={16} /> Save to Meal Log</button>
                <button onClick={reanalyzeResult} disabled={busy} className="rounded-2xl bg-white/5 px-5 py-3 font-bold flex items-center justify-center gap-2"><RotateCcw size={16} /> Reanalyze</button>
                <button onClick={deleteResult} disabled={busy} className="rounded-2xl bg-red-500/10 px-5 py-3 font-bold text-red-300 flex items-center justify-center gap-2"><Trash2 size={16} /> Delete</button>
              </div>

              <div className="rounded-2xl bg-bg-dark p-4 text-sm text-text-muted">
                <p>Dish: <span className="text-white">{activeResult.detectedDish}</span></p>
                <p>Items: <span className="text-white">{activeResult.detectedItems.join(', ')}</span></p>
                <p>Confidence: <span className="text-white">{(activeResult.confidence * 100).toFixed(0)}%</span></p>
                <p>Daily Progress: <span className="text-white">{activeResult.dailyProgress.current} / {activeResult.dailyProgress.target} kcal</span></p>
              </div>
            </div>
          )}
        </div>

        <div className="col-span-12 lg:col-span-5 rounded-[2rem] border border-white/5 bg-surface-dark p-8">
          <h2 className="mb-4 text-lg font-bold">Analysis History</h2>
          <div className="space-y-3">
            {history.map(item => (
              <button key={item.id} onClick={() => setFromAnalysis(item)} className="flex w-full items-center gap-3 rounded-2xl bg-white/5 p-3 text-left hover:bg-white/10">
                <img src={item.image} alt={item.name} className="h-14 w-14 rounded-xl object-cover" />
                <div className="flex-1">
                  <p className="font-bold">{item.name}</p>
                  <p className="text-xs text-text-muted">{toTimeAgo(item.createdAt)} • {item.totalKcal} kcal • {item.status}</p>
                </div>
                {item.needsReview && <AlertTriangle size={14} className="text-yellow-400" />}
              </button>
            ))}
            {history.length === 0 && <p className="text-sm text-text-muted">No analysis history yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
