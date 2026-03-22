'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AnalyticsChart = () => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        labels: { color: '#a1a1aa' }
      }
    },
    scales: {
      x: {
        grid: { color: '#333' },
        ticks: { color: '#a1a1aa' }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: { color: '#333' },
        ticks: { color: '#a1a1aa' }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        ticks: { color: '#a1a1aa' }
      }
    }
  };

  const data = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Daily Active Users',
        data: [1200, 1350, 1250, 1480, 1600, 1900, 2100],
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.2)',
        tension: 0.4,
        fill: true,
        yAxisID: 'y',
      },
      {
        label: 'Recognition Accuracy (%)',
        data: [88, 89, 92, 91, 94, 95, 96],
        borderColor: '#10b981',
        borderDash: [5, 5],
        tension: 0.4,
        fill: false,
        yAxisID: 'y1',
      }
    ]
  };

  return <Line options={options} data={data} />;
};

export default AnalyticsChart;
