/**
 * TelecomHealthCharts component for telecom-specific network health visualization
 */
import React from 'react';
import { registerables, Chart } from 'chart.js';
import { Pie, Doughnut, Bar, Line } from 'react-chartjs-2';
import { Container, Row, Col, Card } from 'react-bootstrap';

// Register Chart.js components
Chart.register(...registerables);

// Define NetworkComponent interface
interface NetworkComponent {
  component: string;
  status: string;
  message: string;
  metrics: {
    [key: string]: number;
  };
}

interface TelecomHealthChartsProps {
  networkHealthData: NetworkComponent[];
}

/**
 * TelecomHealthCharts component for displaying telecom network health metrics
 * 
 * @param props Component properties with network health data
 * @returns The TelecomHealthCharts component
 */
export default function TelecomHealthCharts({ networkHealthData }: TelecomHealthChartsProps) {
  // Chart color constants
  const chartColors = {
    healthy: 'rgba(40, 167, 69, 0.8)',
    warning: 'rgba(255, 193, 7, 0.8)',
    critical: 'rgba(220, 53, 69, 0.8)',
    border: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 2,
    hoverBorderColor: 'rgba(255, 255, 255, 1)',
    neutral: 'rgba(73, 80, 87, 0.7)',
    neutralHover: 'rgba(73, 80, 87, 0.9)',
    backgroundOpacity: 0.1,
    grid: 'rgba(255, 255, 255, 0.1)',
  };

  // Calculate status distribution
  const statusCounts = {
    healthy: 0,
    warning: 0,
    critical: 0
  };

  networkHealthData.forEach(item => {
    statusCounts[item.status as keyof typeof statusCounts]++;
  });

  // Calculate average metrics across all components
  const averageMetrics = {
    performance: 0,
    latency: 0,
    connections: 0,
    throughput: 0
  };

  if (networkHealthData.length > 0) {
    let totalComponents = networkHealthData.length;
    
    networkHealthData.forEach(item => {
      averageMetrics.performance += item.metrics.performance / totalComponents;
      averageMetrics.latency += item.metrics.latency / totalComponents;
      averageMetrics.connections += item.metrics.connections / totalComponents;
      averageMetrics.throughput += item.metrics.throughput / totalComponents;
    });
  }

  // Extract component names for bar chart
  const componentNames = networkHealthData.map(item => item.component);
  
  // Extract performance values for bar chart
  const performanceValues = networkHealthData.map(item => item.metrics.performance);
  const performanceColors = networkHealthData.map(item => {
    if (item.metrics.performance > 80) return chartColors.healthy;
    else if (item.metrics.performance > 60) return chartColors.warning;
    else return chartColors.critical;
  });

  // Extract latency values
  const latencyValues = networkHealthData.map(item => item.metrics.latency);
  const latencyColors = networkHealthData.map(item => {
    // For latency, lower is better (inverse of performance)
    if (item.metrics.latency < 20) return chartColors.healthy;
    else if (item.metrics.latency < 50) return chartColors.warning;
    else return chartColors.critical;
  });

  // Create throughput data
  const throughputValues = networkHealthData.map(item => item.metrics.throughput);
  
  // Create mock historical data for line chart
  const generateHistoricalData = (current: number, points: number = 24) => {
    const result = [];
    let value = current * 0.8;
    
    for (let i = 0; i < points; i++) {
      // Add some random variation
      const randomFactor = 0.9 + Math.random() * 0.2;
      value = value * randomFactor;
      
      // Constrain values to reasonable range
      if (value < current * 0.5) value = current * 0.5;
      if (value > current * 1.2) value = current * 1.2;
      
      result.push(value);
    }
    
    // End with the current value
    result.push(current);
    return result;
  };

  // Generate time labels for the past 24 hours
  const timeLabels = Array.from({ length: 25 }, (_, i) => {
    const hours = (new Date().getHours() - 24 + i + 24) % 24;
    return `${hours}:00`;
  });

  // Configuration for status distribution pie chart
  const statusDistributionData = {
    labels: ['Healthy', 'Warning', 'Critical'],
    datasets: [
      {
        data: [statusCounts.healthy, statusCounts.warning, statusCounts.critical],
        backgroundColor: [
          chartColors.healthy,
          chartColors.warning,
          chartColors.critical
        ],
        borderColor: chartColors.border,
        borderWidth: chartColors.borderWidth,
        hoverBorderColor: chartColors.hoverBorderColor,
      },
    ],
  };

  // Configuration for performance bar chart
  const performanceData = {
    labels: componentNames,
    datasets: [
      {
        label: 'Performance (%)',
        data: performanceValues,
        backgroundColor: performanceColors,
        borderColor: performanceColors.map(color => color),
        borderWidth: 1,
      },
    ],
  };

  // Configuration for latency bar chart
  const latencyData = {
    labels: componentNames,
    datasets: [
      {
        label: 'Latency (ms)',
        data: latencyValues,
        backgroundColor: latencyColors,
        borderColor: latencyColors.map(color => color),
        borderWidth: 1,
      },
    ],
  };

  // Configuration for throughput line chart
  const throughputHistoryData = {
    labels: timeLabels,
    datasets: [
      {
        label: 'Network Throughput (Mbps)',
        data: generateHistoricalData(averageMetrics.throughput),
        fill: true,
        backgroundColor: `rgba(0, 123, 255, ${chartColors.backgroundOpacity})`,
        borderColor: 'rgba(0, 123, 255, 0.8)',
        tension: 0.3,
      },
    ],
  };

  // Common chart options
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          color: 'white',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          color: chartColors.grid,
        },
        ticks: {
          color: 'white',
        },
      },
      y: {
        grid: {
          color: chartColors.grid,
        },
        ticks: {
          color: 'white',
        },
      },
    },
  };

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col lg={4} md={6} className="mb-4">
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Components Status</h5>
              <span className="badge bg-secondary">{networkHealthData.length} Components</span>
            </Card.Header>
            <Card.Body className="d-flex align-items-center justify-content-center">
              <div style={{ height: '240px', width: '100%' }}>
                <Pie data={statusDistributionData} options={commonOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={8} md={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Performance Metrics</h5>
            </Card.Header>
            <Card.Body>
              <div style={{ height: '240px', width: '100%' }}>
                <Bar data={performanceData} options={commonOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mb-4">
        <Col lg={6} md={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Network Latency</h5>
            </Card.Header>
            <Card.Body>
              <div style={{ height: '240px', width: '100%' }}>
                <Bar data={latencyData} options={commonOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={6} md={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Network Throughput History (24h)</h5>
            </Card.Header>
            <Card.Body>
              <div style={{ height: '240px', width: '100%' }}>
                <Line data={throughputHistoryData} options={commonOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}