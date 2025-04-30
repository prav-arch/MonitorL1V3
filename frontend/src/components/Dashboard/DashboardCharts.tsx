"use client";

import { useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ChartData } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

// Types for our component props
interface DashboardChartsProps {
  logStats: any;
  anomalies: any[];
  usePlaceholderData: boolean;
}

// Sample data for demonstration purposes when API is not available
const sampleLogStats = {
  total_logs: 1250,
  logs_by_level: {
    "INFO": 800,
    "WARNING": 320,
    "ERROR": 110,
    "CRITICAL": 20
  },
  logs_by_service: {
    "AMF": 350,
    "SMF": 280,
    "UPF": 220,
    "AUSF": 175,
    "UDM": 145,
    "PCF": 80
  },
  timestamp_distribution: Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    count: Math.floor(Math.random() * 100) + 10
  }))
};

const sampleAnomalies = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  message: `Sample anomaly detected in telecom service ${i % 3 === 0 ? 'AMF' : i % 3 === 1 ? 'SMF' : 'UPF'}`,
  level: i % 4 === 0 ? "ERROR" : i % 4 === 1 ? "WARNING" : i % 4 === 2 ? "CRITICAL" : "INFO",
  service: i % 3 === 0 ? 'AMF' : i % 3 === 1 ? 'SMF' : 'UPF',
  timestamp: new Date().toISOString(),
  anomaly_score: Math.random() * 0.9 + 0.1,
  anomaly_type: i % 3 === 0 ? 'critical' : i % 3 === 1 ? 'warning' : 'structural'
}));

export default function DashboardCharts({ logStats, anomalies, usePlaceholderData }: DashboardChartsProps) {
  // Use sample data if needed
  const stats = usePlaceholderData ? sampleLogStats : logStats;
  const anomalyData = usePlaceholderData ? sampleAnomalies : anomalies;
  
  // Prepare log volume time series data
  const logVolumeData: ChartData<'line'> = {
    labels: stats?.timestamp_distribution?.map((item: any) => item.hour) || [],
    datasets: [
      {
        label: 'Log Volume',
        data: stats?.timestamp_distribution?.map((item: any) => item.count) || [],
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.3,
      },
    ],
  };

  // Prepare log levels data for the bar chart
  const logLevelData: ChartData<'bar'> = {
    labels: Object.keys(stats?.logs_by_level || {}),
    datasets: [
      {
        label: 'Log Count by Level',
        data: Object.values(stats?.logs_by_level || {}),
        backgroundColor: [
          'rgba(40, 167, 69, 0.7)',   // INFO - green
          'rgba(255, 193, 7, 0.7)',   // WARNING - yellow
          'rgba(220, 53, 69, 0.7)',   // ERROR - red
          'rgba(108, 117, 125, 0.7)', // Other levels - gray
        ],
      },
    ],
  };

  // Prepare log services data for the bar chart
  const logServiceData: ChartData<'bar'> = {
    labels: Object.keys(stats?.logs_by_service || {}),
    datasets: [
      {
        label: 'Log Count by Service',
        data: Object.values(stats?.logs_by_service || {}),
        backgroundColor: 'rgba(13, 110, 253, 0.7)', // Bootstrap primary color
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div>
      <div className="chart-container">
        <h5>Log Volume Over Time</h5>
        <Line options={chartOptions} data={logVolumeData} />
      </div>
      
      <div className="row">
        <div className="col-md-6">
          <div className="chart-container">
            <h5>Logs by Level</h5>
            <Bar options={chartOptions} data={logLevelData} />
          </div>
        </div>
        <div className="col-md-6">
          <div className="chart-container">
            <h5>Logs by Service</h5>
            <Bar options={chartOptions} data={logServiceData} />
          </div>
        </div>
      </div>
    </div>
  );
}