import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  positive: boolean;
  icon: LucideIcon;
}

const StatCard = ({ title, value, trend, positive, icon: Icon }: StatCardProps) => (
  <div className="bg-calai-card rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-colors">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-gray-800 rounded-lg text-calai-orange">
        <Icon className="w-6 h-6" />
      </div>
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${positive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
        {trend}
      </span>
    </div>
    <h3 className="text-calai-textMuted text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-white mt-1">{value}</p>
  </div>
);

export default StatCard;
