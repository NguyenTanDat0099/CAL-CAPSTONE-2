'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Incident } from '@/types/incident';

interface FeedbackModalProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: { actual: number | null; note: string }) => void;
}

const FeedbackModal = ({ incident, isOpen, onClose, onSave }: FeedbackModalProps) => {
  const [correction, setCorrection] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (incident) {
      setCorrection(incident.actual ? incident.actual.toString() : "");
      setNote(incident.note || "");
    }
  }, [incident, isOpen]);

  if (!isOpen || !incident) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(incident.id, {
      actual: parseInt(correction) || null,
      note
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-calai-card border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Review Incident</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 text-left">
          <div className="flex items-center gap-4 mb-6">
            <img src={incident.image} alt={incident.foodItem} className="w-16 h-16 rounded-lg object-cover" />
            <div>
              <h4 className="text-white font-medium">{incident.foodItem}</h4>
              <p className="text-sm text-calai-textMuted">Reported by {incident.user}</p>
              <p className="text-xs text-calai-orange mt-1">AI Predicted: {incident.predicted} kcal</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Correct Calories (kcal)</label>
              <input 
                type="number" 
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-calai-orange outline-none"
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                placeholder="Enter verified value"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Admin Note / Feedback</label>
              <textarea 
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-calai-orange outline-none resize-none h-24"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add context for the data team..."
              ></textarea>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-calai-orange text-white font-medium hover:bg-calai-orangeHover transition-colors shadow-lg shadow-orange-900/20">
                Save Correction
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
