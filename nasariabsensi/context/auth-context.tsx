import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api, { setOnUnauthorized } from '../lib/api';

interface User {
  id: number;
  email: string;
  nama_lengkap: string;
  role: string;
  foto?: string;
}

interface AuthContextType {
  session: string | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfilePhoto: (base64Photo: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and load tokens from SecureStore
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await SecureStore.getItemAsync('access_token');
        if (token) {
          setSession(token);
          // Try fetching user profile
          const response = await api.get('/protected/profile');
          // Backend wraps responses using utils.SuccessResponse, so they are in response.data.data
          if (response.data && response.data.success && response.data.data) {
            setUser(response.data.data);
          }
        }
      } catch (e) {
        console.warn('Failed to load session or user profile:', e);
        // If there's an error, we don't necessarily clear session because it could be network-related.
        // The axios interceptor will handle actual 401s.
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  // Handle signOut
  const signOut = async () => {
    setIsLoading(true);
    try {
      // Notify backend if possible (ignore failure if already unauthorized)
      await api.post('/protected/logout').catch((err) => {
        console.log('Backend logout ignored or user already logged out locally:', err.message);
      });
    } catch (e) {
      console.warn('Sign out request failed:', e);
    } finally {
      // Always clear local session and credentials
      await SecureStore.deleteItemAsync('access_token').catch(() => {});
      await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
      setSession(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  // Register unauthorized handler to auto-logout on token refresh failure
  useEffect(() => {
    setOnUnauthorized(() => {
      setSession(null);
      setUser(null);
    });
  }, []);

  // Handle signIn
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Backend /login returns TokenResponse directly: { access_token, refresh_token, expires_in }
      const response = await api.post('/login', { email, password });
      
      const { access_token, refresh_token } = response.data;
      
      if (!access_token || !refresh_token) {
        throw new Error('Invalid credentials or token response format');
      }

      await SecureStore.setItemAsync('access_token', access_token);
      await SecureStore.setItemAsync('refresh_token', refresh_token);
      
      setSession(access_token);

      // Fetch user profile immediately
      const profileResponse = await api.get('/protected/profile');
      if (profileResponse.data && profileResponse.data.success && profileResponse.data.data) {
        setUser(profileResponse.data.data);
      }
    } catch (error: any) {
      // Make sure we clean up if something failed
      await SecureStore.deleteItemAsync('access_token').catch(() => {});
      await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
      setSession(null);
      setUser(null);
      
      // Extract error message
      const errMsg = error.response?.data?.error || error.message || 'Login failed';
      throw new Error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfilePhoto = async (base64Photo: string) => {
    try {
      const response = await api.put('/protected/profile', { foto: base64Photo });
      if (response.data && response.data.success && response.data.data?.user) {
        setUser(response.data.data.user);
      } else if (response.data && response.data.success && response.data.data) {
        setUser(response.data.data);
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.message || 'Gagal memperbarui foto profil';
      throw new Error(errMsg);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, signIn, signOut, updateProfilePhoto }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
