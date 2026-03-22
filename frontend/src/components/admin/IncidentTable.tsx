'use client';

import React, { useState } from 'react';
import { Search, Eye, Check } from 'lucide-react';
import { Incident } from '@/types/incident';

interface IncidentTableProps {
  incidents: Incident[];
  onVerify: (id: number) => void;
  onEdit: (incident: Incident) => void;
}

const IncidentTable = ({ incidents, onVerify, onEdit }: IncidentTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const filteredData = incidents.filter(item => {
    const matchesSearch = item.foodItem.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.user.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "All" || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Pending': return 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50';
      case 'Verified': return 'bg-blue-900/30 text-blue-400 border-blue-900/50';
      case 'Resolved': return 'bg-green-900/30 text-green-400 border-green-900/50';
      default: return 'bg-gray-800 text-gray-400';
    }
  };

  return (
    <div className="bg-calai-card rounded-xl border border-gray-800 overflow-hidden">
      <div className="p-6 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">Food Recognition Incidents</h2>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search food or user..." 
              className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-calai-orange focus:border-transparent outline-none w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-calai-orange outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Verified">Verified</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="bg-gray-900/50 text-gray-200 uppercase text-xs font-medium">
            <tr>
              <th className="px-6 py-4">Food Item</th>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Predicted (kcal)</th>
              <th className="px-6 py-4">Actual (kcal)</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredData.map((incident) => (
              <tr key={incident.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={incident.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    <span className="font-medium text-white">{incident.foodItem}</span>
                  </div>
                </td>
                <td className="px-6 py-4">{incident.user}</td>
                <td className="px-6 py-4">{incident.date}</td>
                <td className="px-6 py-4 text-white">{incident.predicted}</td>
                <td className="px-6 py-4">
                  {incident.actual ? (
                    <span className="text-white">{incident.actual}</span>
                  ) : (
                    <span className="text-gray-600 italic">--</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(incident.status)}`}>
                    {incident.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => onEdit(incident)}
                      className="p-2 text-gray-400 hover:text-calai-orange hover:bg-gray-700 rounded-lg transition-colors"
                      title="Edit/Feedback"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {incident.status === 'Pending' && (
                      <button 
                        onClick={() => onVerify(incident.id)}
                        className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Verify Prediction"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No incidents found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IncidentTable;
