import axios from 'axios';

const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
export const API_BASE_URL = RAW_API_BASE_URL.endsWith('/api/v1')
  ? RAW_API_BASE_URL
  : `${RAW_API_BASE_URL.replace(/\/+$/, '')}/api/v1`;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchDashboard = async () => {
  const response = await apiClient.get('/analytics/dashboard');
  return response.data;
};

export const fetchForecasts = async (centreId = 1, processingType = 'IN_HOUSE', horizonDays = 7) => {
  const response = await apiClient.get('/forecasts', {
    params: {
      centreId,
      processingType,
      horizonDays,
    },
  });
  return response.data;
};

export const createSample = async (sampleData) => {
  const response = await apiClient.post('/samples', sampleData);
  return response.data;
};

export const updateSampleStatus = async (sampleId, status, remarks = '') => {
  const response = await apiClient.patch(`/samples/${sampleId}/status`, {
    status,
    remarks,
  });
  return response.data;
};

export const fetchSimulation = async (limit = 20) => {
  const response = await apiClient.get('/analytics/simulation', {
    params: { limit },
  });
  return response.data;
};

export const fetchBenchmark = async () => {
  const response = await apiClient.get('/analytics/benchmark');
  return response.data;
};
