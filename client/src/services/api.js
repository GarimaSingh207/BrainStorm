import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) delete config.headers['Content-Type'];
  return config;
});
export default api;
