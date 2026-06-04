import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import axiosInstance from '../utils/axios';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/login', credentials);
      
      const { access_token, refresh_token } = response.data;
      
      // Store tokens securely
      if (access_token) {
        await SecureStore.setItemAsync('access_token', access_token);
      }
      if (refresh_token) {
        await SecureStore.setItemAsync('refresh_token', refresh_token);
      }

      // Fetch user profile to check role
      const profileResponse = await axiosInstance.get('/protected/profile', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const userData = profileResponse.data.data;

      // Check if role is pegawai
      if (userData.role !== 'pegawai') {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        return rejectWithValue('Akses ditolak. Aplikasi ini khusus untuk Pegawai.');
      }

      return userData;
    } catch (error: any) {
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data.error || 'Login gagal. Periksa kembali kredensial Anda.');
      }
      return rejectWithValue('Terjadi kesalahan jaringan atau server.');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      // Panggil API logout di backend terlebih dahulu
      await axiosInstance.post('/protected/logout');
      
      // Hapus token di local storage setelah berhasil
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      return true;
    } catch (error) {
      // Tetap hapus token di HP meskipun backend gagal/timeout
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      return rejectWithValue('Sesi berakhir atau gagal menghubungi server saat logout');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        // Depending on backend response structure, you might need to adjust this
        state.user = action.payload || null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const { clearError } = authSlice.actions;

export default authSlice.reducer;
