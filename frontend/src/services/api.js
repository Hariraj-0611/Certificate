import axios from 'axios';

export const getApiBaseUrl = () => {
  const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // When running locally on dev server (localhost:5173 / 127.0.0.1:5173), use local Django backend:
  if (isLocal) {
    return 'http://127.0.0.1:8000';
  }

  // When running on hosted production website:
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  return 'https://certificate-jgbq.onrender.com';
};

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  config.baseURL = `${baseUrl}/api/certificates`;
  return config;
});

// Auto-retry interceptor for 502/503/504 server wake-up states
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (config && error.response && [502, 503, 504].includes(error.response.status)) {
      config._retryCount = (config._retryCount || 0) + 1;
      if (config._retryCount <= 3) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return api(config);
      }
    }
    return Promise.reject(error);
  }
);

export const generateCertificate = async (payload) => {
  const response = await api.post('/generate/', payload);
  return response.data;
};

export const verifyCertificate = async (certId) => {
  const response = await api.get(`/verify/${certId}/`);
  return response.data;
};

export const getDashboardStats = async (filters = {}) => {
  const response = await api.get('/dashboard/stats/', { params: filters });
  return response.data;
};

export const getCertificateHistory = async (params = {}) => {
  const response = await api.get('/history/', { params });
  return response.data;
};

export const getAuditLogs = async (limit = 50) => {
  const response = await api.get('/audit-logs/', { params: { limit } });
  return response.data;
};

export const getEmailTemplates = async () => {
  const response = await api.get('/email-templates/');
  return response.data;
};

export const saveEmailTemplate = async (certType, subject, body) => {
  const response = await api.post('/email-templates/save/', { cert_type: certType, subject, body });
  return response.data;
};

export const sendCertificateEmail = async (certId, email = '') => {
  const response = await api.post('/send-email/', { cert_id: certId, email });
  return response.data;
};

export const uploadBulkCertificates = async (file, certType) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('cert_type', certType);
  const response = await api.post('/bulk/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return response.data;
};

export default api;


