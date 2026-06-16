import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Dynamic API URL detection for development environments
const getApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Detect Metro bundler IP to connect to backend on local network
  const debuggerHost = Constants.expoConfig?.hostUri;
  const ip = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
  return `http://${ip}:4000/api`;
};

export const API_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorized = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

// Request interceptor to attach JWT token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Error fetching access token from SecureStore:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Flag to track token refreshing state
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor to handle auto token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized and request has not been retried yet
    // Do not intercept 401 errors for login or refresh-token requests
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      !originalRequest.url?.includes('/login') && 
      !originalRequest.url?.includes('/refresh-token')
    ) {
      if (isRefreshing) {
        // Queue this request while token is being refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call backend refresh token endpoint
        // Backend returns: { success: true, data: { access_token, refresh_token, expires_in } }
        const response = await axios.post(`${API_URL}/refresh-token`, {
          refresh_token: refreshToken,
        });

        const data = response.data;
        if (data && data.success && data.data) {
          const { access_token, refresh_token } = data.data;

          // Save new tokens
          await SecureStore.setItemAsync('access_token', access_token);
          await SecureStore.setItemAsync('refresh_token', refresh_token);

          // Update axios default header
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          originalRequest.headers.Authorization = `Bearer ${access_token}`;

          processQueue(null, access_token);
          isRefreshing = false;

          // Retry the original request
          return api(originalRequest);
        } else {
          throw new Error('Refresh token response structure was invalid');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Clear tokens from SecureStore on total auth failure
        try {
          await SecureStore.deleteItemAsync('access_token');
          await SecureStore.deleteItemAsync('refresh_token');
        } catch (e) {
          console.error('Error clearing tokens:', e);
        }

        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// --- Absensi Service ---

export const absensiService = {
  getTodayAbsensi: async () => {
    const response = await api.get('/protected/pegawai/absensi');
    return response.data;
  },
  getAbsensiHistory: async () => {
    const response = await api.get('/protected/pegawai/absensi/history');
    return response.data;
  },
  submitAbsensi: async (data: any) => {
    // Determine if it's Masuk (POST) or Pulang (PUT)
    if (data.id) {
      const response = await api.put(`/protected/pegawai/absensi/${data.id}`, data);
      return response.data;
    } else {
      const response = await api.post('/protected/pegawai/absensi', data);
      return response.data;
    }
  }
};

export default api;
