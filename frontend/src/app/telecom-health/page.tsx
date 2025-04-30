/**
 * Telecom Health Dashboard page for monitoring telecom network components
 */
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Container, Card, Row, Col, Badge, Form, Button, Spinner, Alert } from 'react-bootstrap';
import MainLayout from '@/components/Layout/MainLayout';
import api from '@/lib/api';

// Dynamically import the charts component to avoid SSR issues with Chart.js
const TelecomHealthCharts = dynamic(() => import('@/components/TelecomHealth/TelecomHealthCharts'), {
  ssr: false,
  loading: () => <div className="text-center my-5"><Spinner animation="border" variant="info" /></div>
});

// Define NetworkHealthData interface
interface NetworkComponent {
  component: string;
  status: string;
  message: string;
  metrics: {
    [key: string]: number;
  };
}

/**
 * TelecomHealth page component
 * Displays the health status of telecom infrastructure components
 */
export default function TelecomHealthPage() {
  // State for network health data
  const [networkHealthData, setNetworkHealthData] = useState<NetworkComponent[]>([]);
  
  // State for loading and error handling
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for filters
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Fetch telecom health data
  const fetchTelecomHealthData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the API to get telecom health data
      // In development, we'll use sample data until the API is connected
      // In production, this will be replaced with an actual API call
      
      // Simulated API response for development
      const sampleData = [
        {
          component: '5G Core AMF',
          status: 'healthy',
          message: 'All systems operational',
          metrics: { performance: 92, latency: 12, connections: 2584, throughput: 456 }
        },
        {
          component: '5G Core SMF',
          status: 'warning',
          message: 'High memory usage detected',
          metrics: { performance: 68, latency: 28, connections: 1752, throughput: 287 }
        },
        {
          component: 'RAN DU Controller',
          status: 'critical',
          message: 'Connection failure detected',
          metrics: { performance: 32, latency: 185, connections: 896, throughput: 105 }
        },
        {
          component: 'OpenRAN CU-CP',
          status: 'healthy',
          message: 'Normal operation',
          metrics: { performance: 87, latency: 14, connections: 1965, throughput: 345 }
        },
        {
          component: 'OpenRAN CU-UP',
          status: 'healthy',
          message: 'Normal operation',
          metrics: { performance: 91, latency: 11, connections: 2136, throughput: 412 }
        },
        {
          component: 'UPF Gateway',
          status: 'warning',
          message: 'Increased packet loss detected',
          metrics: { performance: 72, latency: 32, connections: 3254, throughput: 278 }
        },
        {
          component: 'NSSF Service',
          status: 'healthy',
          message: 'Normal operation',
          metrics: { performance: 89, latency: 10, connections: 1247, throughput: 189 }
        }
      ];
      
      // Set the network health data
      setNetworkHealthData(sampleData);
      
      // TODO: Replace with actual API call once API is ready
      // In development, we'll use sample data until the backend is integrated
      try {
        // Use the API client to fetch data from the backend
        const response = await api.getTelecomHealthStatus();
        setNetworkHealthData(response);
      } catch (error) {
        // Fallback to sample data if API call fails during development
        console.log('Using sample data due to API error:', error);
        // Keep the sample data as fallback during development
      }
      
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch telecom health data');
      setLoading(false);
    }
  };
  
  // Filter network health data based on status and search term
  const getFilteredData = () => {
    return networkHealthData.filter(item => {
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
      const matchesSearch = !searchTerm || 
        item.component.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.message.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  };
  
  // Get counts for status types
  const getStatusCounts = () => {
    const counts = {
      all: networkHealthData.length,
      healthy: 0,
      warning: 0,
      critical: 0
    };
    
    networkHealthData.forEach(item => {
      if (item.status === 'healthy') counts.healthy++;
      else if (item.status === 'warning') counts.warning++;
      else if (item.status === 'critical') counts.critical++;
    });
    
    return counts;
  };
  
  // Effect hook to fetch data on component mount
  useEffect(() => {
    fetchTelecomHealthData();
    
    // Poll for updates every 60 seconds
    const interval = setInterval(() => {
      fetchTelecomHealthData();
    }, 60000);
    
    // Clean up the interval when the component unmounts
    return () => clearInterval(interval);
  }, []);
  
  // Get filtered data and status counts
  const filteredData = getFilteredData();
  const statusCounts = getStatusCounts();
  
  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <MainLayout>
      <Container fluid>
        <Row className="mb-4">
          <Col>
            <h1 className="mb-2">Telecom Health Dashboard</h1>
            <p className="text-muted">
              Monitor the health and performance of your telecom network infrastructure components
            </p>
          </Col>
        </Row>
        
        {/* Error alert */}
        {error && (
          <Row className="mb-4">
            <Col>
              <Alert variant="danger">
                <Alert.Heading>Error Loading Data</Alert.Heading>
                <p>{error}</p>
                <Button variant="outline-danger" onClick={fetchTelecomHealthData}>Retry</Button>
              </Alert>
            </Col>
          </Row>
        )}
        
        {/* Status filters and search */}
        <Row className="mb-4">
          <Col md={8}>
            <div className="mb-2 d-flex flex-wrap gap-2">
              <Button
                variant={selectedStatus === 'all' ? 'primary' : 'outline-primary'}
                onClick={() => setSelectedStatus('all')}
                className="d-flex align-items-center"
              >
                <span className="me-1">All</span>
                <Badge bg="primary" pill>{statusCounts.all}</Badge>
              </Button>
              
              <Button
                variant={selectedStatus === 'healthy' ? 'success' : 'outline-success'}
                onClick={() => setSelectedStatus('healthy')}
                className="d-flex align-items-center"
              >
                <span className="me-1">Healthy</span>
                <Badge bg="success" pill>{statusCounts.healthy}</Badge>
              </Button>
              
              <Button
                variant={selectedStatus === 'warning' ? 'warning' : 'outline-warning'}
                onClick={() => setSelectedStatus('warning')}
                className="d-flex align-items-center"
              >
                <span className="me-1">Warning</span>
                <Badge bg="warning" pill>{statusCounts.warning}</Badge>
              </Button>
              
              <Button
                variant={selectedStatus === 'critical' ? 'danger' : 'outline-danger'}
                onClick={() => setSelectedStatus('critical')}
                className="d-flex align-items-center"
              >
                <span className="me-1">Critical</span>
                <Badge bg="danger" pill>{statusCounts.critical}</Badge>
              </Button>
            </div>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Control
                type="text"
                placeholder="Search components..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Form.Group>
          </Col>
        </Row>
        
        {/* Charts */}
        <Row className="mb-4">
          <Col>
            {loading ? (
              <div className="text-center my-5">
                <Spinner animation="border" variant="info" />
                <p className="mt-2">Loading telecom health data...</p>
              </div>
            ) : (
              <TelecomHealthCharts networkHealthData={filteredData} />
            )}
          </Col>
        </Row>
        
        {/* Component List */}
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <h3 className="card-title m-0">Network Components</h3>
              </Card.Header>
              <Card.Body>
                <div className="table-responsive">
                  <table className="table table-hover table-striped border">
                    <thead>
                      <tr>
                        <th>Component</th>
                        <th>Status</th>
                        <th>Message</th>
                        <th>Performance</th>
                        <th>Latency</th>
                        <th>Connections</th>
                        <th>Throughput</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((component, index) => (
                        <tr key={index}>
                          <td className="fw-bold">{component.component}</td>
                          <td>
                            <Badge bg={getStatusBadgeVariant(component.status)} pill>
                              {component.status.charAt(0).toUpperCase() + component.status.slice(1)}
                            </Badge>
                          </td>
                          <td>{component.message}</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div style={{ width: '100px' }} className="me-2">
                                <div className="progress" style={{ height: '8px' }}>
                                  <div
                                    className={`progress-bar bg-${
                                      component.metrics.performance > 80 ? 'success' :
                                      component.metrics.performance > 60 ? 'warning' : 'danger'
                                    }`}
                                    role="progressbar"
                                    style={{ width: `${component.metrics.performance}%` }}
                                    aria-valuenow={component.metrics.performance}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                  ></div>
                                </div>
                              </div>
                              <span>{component.metrics.performance}%</span>
                            </div>
                          </td>
                          <td>{component.metrics.latency} ms</td>
                          <td>{component.metrics.connections.toLocaleString()}</td>
                          <td>{component.metrics.throughput} Mbps</td>
                        </tr>
                      ))}
                      {filteredData.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-4">
                            No components match the selected filters
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        {/* Actions Panel */}
        <Row className="mb-4">
          <Col md={6}>
            <Card>
              <Card.Header>
                <h3 className="card-title m-0">Quick Actions</h3>
              </Card.Header>
              <Card.Body>
                <div className="d-grid gap-2">
                  <Button variant="primary" onClick={fetchTelecomHealthData}>
                    <i className="bi bi-arrow-clockwise me-2"></i> Refresh Data
                  </Button>
                  <Button variant="outline-secondary">
                    <i className="bi bi-file-earmark-text me-2"></i> Export Health Report
                  </Button>
                  <Button variant="outline-info">
                    <i className="bi bi-gear me-2"></i> Configure Monitoring Settings
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card>
              <Card.Header>
                <h3 className="card-title m-0">Recommendations</h3>
              </Card.Header>
              <Card.Body>
                <ul className="list-group list-group-flush">
                  {statusCounts.critical > 0 && (
                    <li className="list-group-item list-group-item-danger">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      Address critical issues with {statusCounts.critical} components immediately
                    </li>
                  )}
                  {statusCounts.warning > 0 && (
                    <li className="list-group-item list-group-item-warning">
                      <i className="bi bi-exclamation-circle me-2"></i>
                      Review {statusCounts.warning} components with warnings
                    </li>
                  )}
                  <li className="list-group-item">
                    <i className="bi bi-check-circle me-2"></i>
                    Run a detailed scan of the OpenRAN services
                  </li>
                  <li className="list-group-item">
                    <i className="bi bi-arrow-repeat me-2"></i>
                    Schedule regular infrastructure checks
                  </li>
                </ul>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </MainLayout>
  );
}