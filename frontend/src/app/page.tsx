'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Badge, Button, Card, Col, Container, Form, Row, Table, Alert } from 'react-bootstrap';
import apiClient from '@/lib/api';

// Dynamically import chart components to avoid SSR issues
const DashboardCharts = dynamic(() => import('@/components/Dashboard/DashboardCharts'), {
  ssr: false,
  loading: () => <div className="loading-charts">Loading charts...</div>
});

interface LogData {
  id: number;
  timestamp: string;
  level: string;
  message: string;
  service: string;
}

interface AnomalyData {
  id: number;
  message: string;
  level: string;
  timestamp: string;
  anomaly_score: number;
  anomaly_type: string;
}

export default function HomePage() {
  // State for all dashboard data
  const [logs, setLogs] = useState<LogData[]>([]);
  const [logStats, setLogStats] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<AnomalyData[]>([]);
  const [loading, setLoading] = useState({
    logs: true,
    stats: true,
    anomalies: true,
  });
  const [errors, setErrors] = useState({
    logs: false,
    stats: false,
    anomalies: false,
  });
  const [filter, setFilter] = useState({
    level: '',
    service: '',
    search: '',
  });
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [isQuerying, setIsQuerying] = useState(false);

  // Fetch initial data when component mounts
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    // Fetch logs
    fetchLogs();
    
    // Fetch log statistics
    fetchLogStats();
    
    // Fetch anomalies
    fetchAnomalies();
  };

  // Fetch and update logs
  const fetchLogs = async () => {
    setLoading(prev => ({ ...prev, logs: true }));
    setErrors(prev => ({ ...prev, logs: false }));
    
    try {
      const params = {
        level: filter.level || undefined,
        service: filter.service || undefined,
        search: filter.search || undefined,
      };
      
      const data = await apiClient.getLogs(params);
      setLogs(data);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setErrors(prev => ({ ...prev, logs: true }));
    } finally {
      setLoading(prev => ({ ...prev, logs: false }));
    }
  };

  // Fetch and update log statistics
  const fetchLogStats = async () => {
    setLoading(prev => ({ ...prev, stats: true }));
    setErrors(prev => ({ ...prev, stats: false }));
    
    try {
      const data = await apiClient.getLogStats();
      setLogStats(data);
    } catch (err) {
      console.error('Error fetching log stats:', err);
      setErrors(prev => ({ ...prev, stats: true }));
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  // Fetch and update anomalies
  const fetchAnomalies = async () => {
    setLoading(prev => ({ ...prev, anomalies: true }));
    setErrors(prev => ({ ...prev, anomalies: false }));
    
    try {
      const data = await apiClient.getLogAnomalies();
      setAnomalies(data);
    } catch (err) {
      console.error('Error fetching anomalies:', err);
      setErrors(prev => ({ ...prev, anomalies: true }));
    } finally {
      setLoading(prev => ({ ...prev, anomalies: false }));
    }
  };
  
  // Apply filter changes
  const applyFilters = () => {
    fetchLogs();
  };
  
  // Reset filters
  const resetFilters = () => {
    setFilter({
      level: '',
      service: '',
      search: '',
    });
    
    // Fetch logs without filters
    setTimeout(() => {
      fetchLogs();
    }, 0);
  };
  
  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    setUploadError(null);
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('file', files[i]);
    }
    
    try {
      const response = await apiClient.uploadLogs(formData);
      console.log('Upload successful:', response);
      
      // Refresh dashboard data
      fetchDashboardData();
      setShowUploadForm(false);
    } catch (err) {
      console.error('Error uploading files:', err);
      setUploadError('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Handle query submission
  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isQuerying) return;
    
    setIsQuerying(true);
    
    try {
      const result = await apiClient.analyzeLogs(query);
      setQueryResult(result);
    } catch (err) {
      console.error('Error analyzing logs:', err);
      setQueryResult({ error: 'Failed to analyze logs. Please try again.' });
    } finally {
      setIsQuerying(false);
    }
  };
  
  // Get status badge color
  const getStatusBadgeVariant = (level: string) => {
    switch (level.toUpperCase()) {
      case 'INFO':
        return 'success';
      case 'WARNING':
        return 'warning';
      case 'ERROR':
        return 'danger';
      case 'CRITICAL':
        return 'danger';
      default:
        return 'secondary';
    }
  };
  
  // Get anomaly type badge color
  const getAnomalyBadgeVariant = (type: string) => {
    switch (type) {
      case 'critical':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'structural':
        return 'info';
      default:
        return 'secondary';
    }
  };

  return (
    <Container fluid>
      <h1 className="page-title">Log Analysis Dashboard</h1>
      
      <Row className="mb-4">
        <Col md={8}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Log Volume & Trends</h5>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={() => setShowUploadForm(!showUploadForm)}
              >
                {showUploadForm ? 'Hide Upload' : 'Upload Logs'}
              </Button>
            </Card.Header>
            <Card.Body>
              {showUploadForm && (
                <div className="mb-4">
                  <Form.Group className="mb-3">
                    <Form.Label>Upload Log Files</Form.Label>
                    <Form.Control
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <Form.Text className="text-muted">
                      Supported formats: .log, .txt, .pcap, .json
                    </Form.Text>
                  </Form.Group>
                  
                  {isUploading && (
                    <div className="text-center my-3">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <span>Uploading files...</span>
                    </div>
                  )}
                  
                  {uploadError && (
                    <Alert variant="danger" dismissible onClose={() => setUploadError(null)}>
                      {uploadError}
                    </Alert>
                  )}
                </div>
              )}
              
              {loading.stats ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading statistics...</p>
                </div>
              ) : errors.stats ? (
                <Alert variant="warning">
                  Failed to load log statistics. Please try refreshing the page.
                </Alert>
              ) : (
                <DashboardCharts 
                  logStats={logStats} 
                  anomalies={anomalies}
                  usePlaceholderData={false}
                />
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Detected Anomalies</h5>
            </Card.Header>
            <Card.Body>
              {loading.anomalies ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading anomalies...</p>
                </div>
              ) : errors.anomalies ? (
                <Alert variant="warning">
                  Failed to load anomalies. Please try refreshing the page.
                </Alert>
              ) : anomalies.length === 0 ? (
                <Alert variant="info">
                  No anomalies detected in the current log set.
                </Alert>
              ) : (
                <div className="anomalies-list">
                  {anomalies.slice(0, 5).map(anomaly => (
                    <div key={anomaly.id} className="anomaly-item mb-3 p-2 border-bottom">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <Badge bg={getAnomalyBadgeVariant(anomaly.anomaly_type)}>
                          {anomaly.anomaly_type.charAt(0).toUpperCase() + anomaly.anomaly_type.slice(1)}
                        </Badge>
                        <small className="text-muted">
                          {new Date(anomaly.timestamp).toLocaleString()}
                        </small>
                      </div>
                      <div className="anomaly-message">
                        {anomaly.message}
                      </div>
                      <div className="d-flex justify-content-between align-items-center mt-1">
                        <Badge bg={getStatusBadgeVariant(anomaly.level)}>
                          {anomaly.level}
                        </Badge>
                        <small className="text-muted">
                          Score: {(anomaly.anomaly_score * 100).toFixed(1)}%
                        </small>
                      </div>
                    </div>
                  ))}
                  {anomalies.length > 5 && (
                    <div className="text-center mt-2">
                      <small className="text-muted">
                        Showing 5 of {anomalies.length} anomalies
                      </small>
                    </div>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
          
          <Card>
            <Card.Header>
              <h5 className="mb-0">AI Log Analysis</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleQuerySubmit}>
                <Form.Group className="mb-3">
                  <Form.Control
                    type="text"
                    placeholder="Ask a question about your logs..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={isQuerying}
                  />
                </Form.Group>
                <div className="d-grid">
                  <Button variant="primary" type="submit" disabled={!query.trim() || isQuerying}>
                    {isQuerying ? 'Analyzing...' : 'Analyze'}
                  </Button>
                </div>
              </Form>
              
              {queryResult && (
                <div className="mt-3">
                  <Card.Subtitle className="mb-2">
                    Analysis Result:
                  </Card.Subtitle>
                  {queryResult.error ? (
                    <Alert variant="danger">
                      {queryResult.error}
                    </Alert>
                  ) : (
                    <div className="query-result">
                      <p>{queryResult.suggestion}</p>
                      {queryResult.relevant_logs && queryResult.relevant_logs.length > 0 && (
                        <div className="mt-2">
                          <small className="text-muted">Relevant logs:</small>
                          <ul className="relevant-logs-list">
                            {queryResult.relevant_logs.slice(0, 3).map((log: any, index: number) => (
                              <li key={index} className="small">
                                [{log.level}] {log.timestamp}: {log.message}
                              </li>
                            ))}
                          </ul>
                          {queryResult.relevant_logs.length > 3 && (
                            <small className="text-muted">
                              + {queryResult.relevant_logs.length - 3} more logs...
                            </small>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Log Explorer</h5>
          <div>
            <Button 
              variant="outline-secondary" 
              size="sm" 
              className="me-2"
              onClick={fetchDashboardData}
              title="Refresh"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
              </svg>
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <Row className="mb-4">
            <Col md={12}>
              <Form className="d-flex flex-wrap gap-2">
                <Form.Group className="me-2 mb-2" style={{ minWidth: '150px' }}>
                  <Form.Select
                    value={filter.level}
                    onChange={(e) => setFilter(prev => ({ ...prev, level: e.target.value }))}
                    aria-label="Filter by log level"
                  >
                    <option value="">All Levels</option>
                    <option value="INFO">INFO</option>
                    <option value="WARNING">WARNING</option>
                    <option value="ERROR">ERROR</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="me-2 mb-2" style={{ minWidth: '150px' }}>
                  <Form.Select
                    value={filter.service}
                    onChange={(e) => setFilter(prev => ({ ...prev, service: e.target.value }))}
                    aria-label="Filter by service"
                  >
                    <option value="">All Services</option>
                    {logStats?.logs_by_service && Object.keys(logStats.logs_by_service).map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="me-2 mb-2 flex-grow-1" style={{ minWidth: '200px' }}>
                  <Form.Control
                    type="text"
                    placeholder="Search in logs..."
                    value={filter.search}
                    onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                  />
                </Form.Group>
                
                <div className="mb-2">
                  <Button variant="primary" onClick={applyFilters} className="me-2">
                    Apply Filters
                  </Button>
                  <Button variant="outline-secondary" onClick={resetFilters}>
                    Reset
                  </Button>
                </div>
              </Form>
            </Col>
          </Row>
          
          {loading.logs ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading logs...</p>
            </div>
          ) : errors.logs ? (
            <Alert variant="warning">
              Failed to load logs. Please try refreshing the page.
            </Alert>
          ) : logs.length === 0 ? (
            <Alert variant="info">
              No logs found. Please adjust your filters or upload log files.
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Level</th>
                    <th>Service</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.timestamp).toLocaleString()}</td>
                      <td>
                        <Badge bg={getStatusBadgeVariant(log.level)}>
                          {log.level}
                        </Badge>
                      </td>
                      <td>{log.service}</td>
                      <td>{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {logs.length > 0 && (
                <div className="text-muted small text-end mt-2">
                  Showing {logs.length} logs
                </div>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}