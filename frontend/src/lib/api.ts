import axios from 'axios';

// Create a base API client instance
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interfaces for API responses
interface LogEntry {
  id: number;
  timestamp: string;
  level: string;
  message: string;
  service: string;
  additional_fields?: Record<string, any>;
}

interface LogStats {
  total_logs: number;
  logs_by_level: Record<string, number>;
  logs_by_service: Record<string, number>;
  timestamp_distribution: Array<{
    time_bucket: string;
    count: number;
  }>;
}

interface AnomalyData {
  id: number;
  timestamp: string;
  level: string;
  message: string;
  service: string;
  anomaly_score: number;
  anomaly_type: string; // 'critical', 'warning', 'structural'
}

interface AnalysisResult {
  suggestion: string;
  relevant_logs: LogEntry[];
  confidence_score: number;
}

interface NetworkHealthStatus {
  component: string;
  status: string;
  message: string;
  metrics: {
    [key: string]: number;
  };
}

interface DocumentMetadata {
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
  status: string;
  training_files: string[];
  parameters: Record<string, any>;
  created_at: string;
  updated_at: string;
  error_message: string | null;
}

// API functions
export default {
  // Log related endpoints
  getLogs: async (params?: { level?: string; service?: string; search?: string }): Promise<LogEntry[]> => {
    const response = await apiClient.get('/api/logs', { params });
    return response.data;
  },

  getLogStats: async (): Promise<LogStats> => {
    const response = await apiClient.get('/api/logs/stats');
    return response.data;
  },

  getLogAnomalies: async (): Promise<AnomalyData[]> => {
    const response = await apiClient.get('/api/logs/anomalies');
    return response.data;
  },

  uploadLogs: async (formData: FormData): Promise<any> => {
    const response = await apiClient.post('/api/logs/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  analyzeLogs: async (query: string): Promise<AnalysisResult> => {
    const response = await apiClient.post('/api/logs/analyze', { query });
    return response.data;
  },

  // Telecom health related endpoints
  getTelecomHealthStatus: async (): Promise<NetworkHealthStatus[]> => {
    const response = await apiClient.get('/api/telecom/health');
    return response.data;
  },

  analyzeTelecomLogs: async (query: string): Promise<AnalysisResult> => {
    const response = await apiClient.post('/api/telecom/analyze', { query });
    return response.data;
  },

  uploadTelecomLogs: async (formData: FormData): Promise<any> => {
    const response = await apiClient.post('/api/telecom/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getTelecomAnomalies: async (): Promise<AnomalyData[]> => {
    const response = await apiClient.get('/api/telecom/anomalies');
    return response.data;
  },

  // AI Assistant related endpoints
  queryAssistant: async (messages: { role: string; content: string }[]): Promise<{ response: string }> => {
    const response = await apiClient.post('/api/assistant/query', { messages });
    return response.data;
  },

  // Fine-tuning related endpoints
  getTrainingDocuments: async (): Promise<DocumentMetadata[]> => {
    const response = await apiClient.get('/api/fine-tuning/documents');
    return response.data;
  },

  getTrainingDocument: async (documentId: number): Promise<DocumentMetadata> => {
    const response = await apiClient.get(`/api/fine-tuning/documents/${documentId}`);
    return response.data;
  },

  processTrainingDocument: async (documentId: number): Promise<DocumentMetadata> => {
    const response = await apiClient.post(`/api/fine-tuning/documents/${documentId}/process`);
    return response.data;
  },

  getFineTuningJobs: async (): Promise<FineTuningJob[]> => {
    const response = await apiClient.get('/api/fine-tuning/jobs');
    return response.data;
  },

  createFineTuningJob: async (jobData: {
    job_name: string;
    model_name: string;
    training_files: number[];
    parameters?: Record<string, any>;
  }): Promise<FineTuningJob> => {
    const response = await apiClient.post('/api/fine-tuning/jobs', jobData);
    return response.data;
  },

  getJobStatus: async (jobId: number): Promise<FineTuningJob> => {
    const response = await apiClient.get(`/api/fine-tuning/jobs/${jobId}`);
    return response.data;
  },

  getAvailableModels: async (): Promise<string[]> => {
    const response = await apiClient.get('/api/fine-tuning/models');
    return response.data;
  },
};