import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { FoodScan } from './components/FoodScan';
import { DietGoals } from './components/DietGoals';
import { DietItem } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState('scan');
  const [myDiets, setMyDiets] = useState<DietItem[]>(() => {
    const saved = localStorage.getItem('calai_my_diets');
    return saved ? JSON.parse(saved) : [];
  });

  React.useEffect(() => {
    localStorage.setItem('calai_my_diets', JSON.stringify(myDiets));
  }, [myDiets]);

  const handleAddToMyDiet = (item: Omit<DietItem, 'id' | 'date'>) => {
    const newItem: DietItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
    };
    setMyDiets(prev => [newItem, ...prev]);
  };

  const handleRemoveFromMyDiet = (id: string) => {
    setMyDiets(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="flex min-h-screen bg-bg-dark">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Global Header with Avatar */}
      <div className="fixed top-0 right-0 p-8 z-40">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center text-brand-orange font-bold shadow-lg shadow-brand-orange/10">
            H
          </div>
        </div>
      </div>

      <main className="flex-1">
        {activeTab === 'scan' && <FoodScan onAddToMyDiet={handleAddToMyDiet} />}
        {activeTab === 'goals' && (
          <DietGoals 
            myDiets={myDiets} 
            onAddToMyDiet={handleAddToMyDiet} 
            onRemoveFromMyDiet={handleRemoveFromMyDiet}
          />
        )}
        {activeTab !== 'scan' && activeTab !== 'goals' && (
          <div className="flex-1 ml-64 p-10 flex items-center justify-center text-text-muted">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Section "{activeTab}"</h2>
              <p>This feature is currently under development.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
