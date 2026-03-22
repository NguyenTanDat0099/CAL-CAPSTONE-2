'use client';

import React, { useState } from 'react';
import { 
  Users, 
  LayoutDashboard, 
  Database, 
  AlertTriangle, 
  Settings,
  Menu
} from 'lucide-react';
import Sidebar from '@/components/admin/Sidebar';
import StatCard from '@/components/admin/StatCard';
import AnalyticsChart from '@/components/admin/AnalyticsChart';
import IncidentTable from '@/components/admin/IncidentTable';
import FeedbackModal from '@/components/admin/FeedbackModal';
import { Incident } from '@/types/incident';

// --- Mock Data ---
const INITIAL_INCIDENTS: Incident[] = [
  { id: 1, foodItem: "Avocado Salmon Bowl", user: "Alex Chen", date: "2026-03-22", predicted: 450, actual: null, status: "Pending", image: "https://picsum.photos/seed/food1/100/100" },
  { id: 2, foodItem: "Mediterranean Quinoa", user: "Sarah Jones", date: "2026-03-21", predicted: 320, actual: 340, status: "Verified", image: "https://picsum.photos/seed/food2/100/100" },
  { id: 3, foodItem: "Torakatsu Ramen", user: "Mike Ross", date: "2026-03-21", predicted: 600, actual: 580, status: "Verified", image: "https://picsum.photos/seed/food3/100/100" },
  { id: 4, foodItem: "Cheeseburger", user: "Emma Watson", date: "2026-03-20", predicted: 850, actual: null, status: "Pending", image: "https://picsum.photos/seed/food4/100/100" },
  { id: 5, foodItem: "Chicken Hummus", user: "John Doe", date: "2026-03-20", predicted: 575, actual: 575, status: "Resolved", image: "https://picsum.photos/seed/food5/100/100" },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  const handleVerify = (id: number) => {
    setIncidents(prev => prev.map(inc => 
      inc.id === id ? { ...inc, status: 'Verified', actual: inc.predicted } : inc
    ));
  };

  const handleEditClick = (incident: Incident) => {
    setSelectedIncident(incident);
    setModalOpen(true);
  };

  const handleSaveCorrection = (id: number, data: { actual: number | null; note: string }) => {
    setIncidents(prev => prev.map(inc => 
      inc.id === id ? { ...inc, ...data, status: 'Resolved' } : inc
    ));
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-calai-bg font-sans text-gray-200">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isMobileOpen={isMobileOpen}
        closeMobile={() => setMobileOpen(false)}
      />

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-calai-sidebar border-b border-gray-800 flex items-center justify-between px-4 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-calai-orange rounded-lg flex items-center justify-center font-bold text-white">C</div>
            <span className="text-lg font-bold text-white">CalAI</span>
          </div>
          <button onClick={() => setMobileOpen(true)} className="text-white">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                  <StatCard title="Total Active Users" value="24,592" trend="+12.5%" positive={true} icon={Users} />
                  <StatCard title="Daily Scans" value="8,102" trend="+5.2%" positive={true} icon={LayoutDashboard} />
                  <StatCard title="AI Accuracy Rate" value="94.8%" trend="-0.4%" positive={false} icon={Database} />
                  <StatCard title="Pending Reports" value="142" trend="-12" positive={true} icon={AlertTriangle} />
                </div>
                <div className="bg-calai-card rounded-xl border border-gray-800 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white">Performance Overview</h2>
                  </div>
                  <div className="h-80 w-full">
                    <AnalyticsChart />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'incidents' && (
              <IncidentTable incidents={incidents} onVerify={handleVerify} onEdit={handleEditClick} />
            )}

            {['users', 'database', 'settings'].includes(activeTab) && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <div className="p-6 bg-gray-800/50 rounded-full mb-4">
                  {activeTab === 'users' && <Users className="w-12 h-12 text-gray-500" />}
                  {activeTab === 'database' && <Database className="w-12 h-12 text-gray-500" />}
                  {activeTab === 'settings' && <Settings className="w-12 h-12 text-gray-500" />}
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 capitalize">{activeTab.replace('-', ' ')}</h2>
                <p className="text-calai-textMuted max-w-md">
                  This module is part of the CalAI Enterprise suite. Access configuration is required to view this section.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <FeedbackModal 
        incident={selectedIncident}
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveCorrection}
      />
    </div>
  );
}
