"use client";

import { useState, useEffect } from 'react';
import { Button, Card, Container, Form, Table, Alert, ProgressBar, Modal, Row, Col, Badge } from 'react-bootstrap';
import apiClient from '@/lib/api';

interface TrainingDocument {
  id: number;
  document_path: string;
  document_type: string;
  content_type: string;
  is_processed: boolean;
  created_at: string;
}

interface FineTuningJob {
  id: number;
  job_name: string;
  model_name: string;
  fine_tuned_model_name: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  training_files: string;
  parameters: string;
  created_at: string;
  updated_at: string;
  error_message: string | null;
}

interface AvailableModel {
  id: string;
  name: string;
  parameters: number;
  description: string;
}

export default function FineTuningPage() {
  const [documents, setDocuments] = useState<TrainingDocument[]>([]);
  const [jobs, setJobs] = useState<FineTuningJob[]>([]);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [loading, setLoading] = useState({
    documents: true,
    jobs: true,
    models: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Job creation modal
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobFormData, setJobFormData] = useState({
    jobName: '',
    modelName: '',
    selectedDocuments: [] as number[],
    epochs: 3,
    learningRate: 0.0001,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading({ documents: true, jobs: true, models: true });
    setError(null);
    
    try {
      // Fetch training documents
      const documentsData = await apiClient.getTrainingDocuments();
      setDocuments(documentsData);
    } catch (err) {
      console.error('Error fetching training documents:', err);
      setError('Failed to load training documents.');
    } finally {
      setLoading(prev => ({ ...prev, documents: false }));
    }
    
    try {
      // Fetch fine-tuning jobs
      const jobsData = await apiClient.getFineTuningJobs();
      setJobs(jobsData);
    } catch (err) {
      console.error('Error fetching fine-tuning jobs:', err);
      setError('Failed to load fine-tuning jobs.');
    } finally {
      setLoading(prev => ({ ...prev, jobs: false }));
    }
    
    try {
      // Fetch available models
      const modelsData = await apiClient.getAvailableModels();
      setAvailableModels(modelsData);
    } catch (err) {
      console.error('Error fetching available models:', err);
      setError('Failed to load available models.');
    } finally {
      setLoading(prev => ({ ...prev, models: false }));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('file', files[i]);
    }
    
    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);
      
      // Upload files
      const response = await apiClient.uploadLogs(formData);
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Refresh document list
      const documentsData = await apiClient.getTrainingDocuments();
      setDocuments(documentsData);
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);
    } catch (err) {
      console.error('Error uploading documents:', err);
      setUploadError('Failed to upload documents. Please try again.');
      setIsUploading(false);
    }
  };

  const handleProcessDocument = async (documentId: number) => {
    try {
      await apiClient.processTrainingDocument(documentId);
      // Refresh document list
      const documentsData = await apiClient.getTrainingDocuments();
      setDocuments(documentsData);
    } catch (err) {
      console.error('Error processing document:', err);
      setError('Failed to process document.');
    }
  };

  const handleCreateJob = async () => {
    try {
      if (!jobFormData.jobName || !jobFormData.modelName || jobFormData.selectedDocuments.length === 0) {
        setError('Please fill in all required fields.');
        return;
      }
      
      const jobData = {
        job_name: jobFormData.jobName,
        model_name: jobFormData.modelName,
        training_files: jobFormData.selectedDocuments,
        parameters: {
          epochs: jobFormData.epochs,
          learning_rate: jobFormData.learningRate
        }
      };
      
      await apiClient.createFineTuningJob(jobData);
      
      // Reset form and close modal
      setJobFormData({
        jobName: '',
        modelName: '',
        selectedDocuments: [],
        epochs: 3,
        learningRate: 0.0001,
      });
      setShowJobModal(false);
      
      // Refresh jobs list
      const jobsData = await apiClient.getFineTuningJobs();
      setJobs(jobsData);
    } catch (err) {
      console.error('Error creating fine-tuning job:', err);
      setError('Failed to create fine-tuning job.');
    }
  };

  const handleDocumentSelection = (documentId: number) => {
    setJobFormData(prev => {
      const selectedDocuments = [...prev.selectedDocuments];
      
      if (selectedDocuments.includes(documentId)) {
        // Remove if already selected
        const index = selectedDocuments.indexOf(documentId);
        selectedDocuments.splice(index, 1);
      } else {
        // Add if not selected
        selectedDocuments.push(documentId);
      }
      
      return {
        ...prev,
        selectedDocuments
      };
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge bg="secondary">Pending</Badge>;
      case 'running':
        return <Badge bg="primary">Running</Badge>;
      case 'completed':
        return <Badge bg="success">Completed</Badge>;
      case 'failed':
        return <Badge bg="danger">Failed</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  return (
    <Container fluid>
      <h1 className="page-title">Fine-Tuning Dashboard</h1>
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Row className="mb-4">
        <Col lg={6}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Training Documents</h5>
              <div>
                <Form.Group>
                  <Form.Label className="mb-0 me-2 btn btn-primary btn-sm">
                    Upload Documents
                    <Form.Control
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      style={{ display: 'none' }}
                    />
                  </Form.Label>
                </Form.Group>
              </div>
            </Card.Header>
            
            <Card.Body>
              {isUploading && (
                <div className="mb-3">
                  <ProgressBar animated now={uploadProgress} label={`${uploadProgress}%`} />
                  <small className="text-muted mt-1">Uploading document(s)...</small>
                </div>
              )}
              
              {uploadError && (
                <Alert variant="danger" dismissible onClose={() => setUploadError(null)}>
                  {uploadError}
                </Alert>
              )}
              
              {loading.documents ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading documents...</p>
                </div>
              ) : documents.length === 0 ? (
                <Alert variant="info">
                  No training documents available. Upload documents to get started.
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Document</th>
                        <th>Type</th>
                        <th>Content</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map(doc => (
                        <tr key={doc.id}>
                          <td>{doc.id}</td>
                          <td>{doc.document_path.split('/').pop()}</td>
                          <td>{doc.document_type}</td>
                          <td>{doc.content_type}</td>
                          <td>
                            {doc.is_processed ? (
                              <Badge bg="success">Processed</Badge>
                            ) : (
                              <Badge bg="warning">Unprocessed</Badge>
                            )}
                          </td>
                          <td>
                            {!doc.is_processed && (
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleProcessDocument(doc.id)}
                              >
                                Process
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={6}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Fine-Tuning Jobs</h5>
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => setShowJobModal(true)}
                disabled={loading.documents || documents.filter(d => d.is_processed).length === 0}
              >
                Create New Job
              </Button>
            </Card.Header>
            <Card.Body>
              {loading.jobs ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading jobs...</p>
                </div>
              ) : jobs.length === 0 ? (
                <Alert variant="info">
                  No fine-tuning jobs available. Create a new job to get started.
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th>Job Name</th>
                        <th>Base Model</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Fine-Tuned Model</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map(job => (
                        <tr key={job.id}>
                          <td>{job.job_name}</td>
                          <td>{job.model_name}</td>
                          <td>{getStatusBadge(job.status)}</td>
                          <td>{new Date(job.created_at).toLocaleString()}</td>
                          <td>
                            {job.fine_tuned_model_name ? (
                              job.fine_tuned_model_name
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Create Job Modal */}
      <Modal show={showJobModal} onHide={() => setShowJobModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create Fine-Tuning Job</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Job Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter a name for the fine-tuning job"
                value={jobFormData.jobName}
                onChange={(e) => setJobFormData(prev => ({ ...prev, jobName: e.target.value }))}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Base Model</Form.Label>
              <Form.Select
                value={jobFormData.modelName}
                onChange={(e) => setJobFormData(prev => ({ ...prev, modelName: e.target.value }))}
              >
                <option value="">Select a model</option>
                {availableModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({(model.parameters / 1000000000).toFixed(1)}B parameters)
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Select the base model to fine-tune
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Training Documents</Form.Label>
              <div className="document-selection">
                {documents
                  .filter(doc => doc.is_processed)
                  .map(doc => (
                    <Form.Check
                      key={doc.id}
                      type="checkbox"
                      id={`doc-${doc.id}`}
                      label={`${doc.document_path.split('/').pop()} (${doc.content_type})`}
                      checked={jobFormData.selectedDocuments.includes(doc.id)}
                      onChange={() => handleDocumentSelection(doc.id)}
                    />
                  ))}
                {documents.filter(doc => doc.is_processed).length === 0 && (
                  <p className="text-muted">No processed documents available. Process documents first.</p>
                )}
              </div>
            </Form.Group>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Epochs</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max="10"
                    value={jobFormData.epochs}
                    onChange={(e) => setJobFormData(prev => ({ ...prev, epochs: parseInt(e.target.value) || 1 }))}
                  />
                  <Form.Text className="text-muted">
                    Number of training epochs (1-10)
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Learning Rate</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.00001"
                    min="0.00001"
                    max="0.001"
                    value={jobFormData.learningRate}
                    onChange={(e) => setJobFormData(prev => ({ ...prev, learningRate: parseFloat(e.target.value) || 0.0001 }))}
                  />
                  <Form.Text className="text-muted">
                    Model learning rate (0.00001 - 0.001)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowJobModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreateJob}
            disabled={!jobFormData.jobName || !jobFormData.modelName || jobFormData.selectedDocuments.length === 0}
          >
            Create Fine-Tuning Job
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}