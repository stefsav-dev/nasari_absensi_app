import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// URL Configurations:
// 1. If using Localtunnel (required if your phone and PC are on different networks, or if using Expo --tunnel):
// const API_URL = 'https://nine-bars-dig.loca.lt/api'; 
// (Make sure to run `npx localtunnel --port 4000` in a new terminal if you use this)
// 
// 2. If your phone and PC are on the SAME Wi-Fi network:
// const API_URL = 'http://192.168.0.123:4000/api'; // Replace with your computer's local IP
// const API_URL = 'http://192.168.0.123:4000/api';
const API_URL = 'https://api-nasariabsensi.collabcoop.id/api'

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 seconds timeout (accommodate large photo uploads)
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true', // Needed to bypass localtunnel warning page
  },
});

// Request Interceptor: Attach access token
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error fetching token from SecureStore', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
