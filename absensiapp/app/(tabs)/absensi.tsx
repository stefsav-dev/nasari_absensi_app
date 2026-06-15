// app/(tabs)/absensi.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LocationPicker from '../../components/LocationPicker';
import FaceCapture from '../../components/FaceCapture';
import axiosInstance from '../../utils/axios';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

export default function AbsensiScreen() {
  const [absensiStatus, setAbsensiStatus] = useState({
    checkIn: null as string | null,
    checkOut: null as string | null,
    checkInLocation: null as any,
    checkOutLocation: null as any,
    checkInPhoto: null as string | null,
    checkOutPhoto: null as string | null,
    absensiId: null as number | null,
  });
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [currentAction, setCurrentAction] = useState<'in' | 'out' | null>(null);
  const [tempLocation, setTempLocation] = useState<any>(null);
  const [submittingAbsensi, setSubmittingAbsensi] = useState(false);

  // Refs to avoid stale closures in callbacks passed to child components
  const tempLocationRef = useRef<any>(null);
  const currentActionRef = useRef<'in' | 'out' | null>(null);
  const absensiStatusRef = useRef(absensiStatus);

  // Keep refs in sync with state
  useEffect(() => { tempLocationRef.current = tempLocation; }, [tempLocation]);
  useEffect(() => { currentActionRef.current = currentAction; }, [currentAction]);
  useEffect(() => { absensiStatusRef.current = absensiStatus; }, [absensiStatus]);

  useEffect(() => {
    fetchTodayAbsensi();
  }, []);

  const formatTimeFromApi = (dateValue?: string) => {
    if (!dateValue || dateValue.startsWith('0001-')) {
      return null;
    }

    return new Date(dateValue).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const fetchTodayAbsensi = async () => {
    try {
      const response = await axiosInstance.get('/protected/pegawai/absensi');
      const todayAbsensi = response.data?.data?.absensi;
      if (!todayAbsensi) {
        return;
      }

      const checkInTime = formatTimeFromApi(todayAbsensi.absensi_masuk);
      const checkOutTime = formatTimeFromApi(todayAbsensi.absensi_pulang);

      setAbsensiStatus({
        checkIn: checkInTime,
        checkOut: checkOutTime,
        checkInLocation: todayAbsensi.latitude_masuk ? {
          latitude: todayAbsensi.latitude_masuk,
          longitude: todayAbsensi.longitude_masuk,
          accuracy: todayAbsensi.akurasi_masuk,
        } : null,
        checkOutLocation: todayAbsensi.latitude_pulang ? {
          latitude: todayAbsensi.latitude_pulang,
          longitude: todayAbsensi.longitude_pulang,
          accuracy: todayAbsensi.akurasi_pulang,
        } : null,
        checkInPhoto: todayAbsensi.has_foto_masuk || todayAbsensi.foto_masuk ? 'saved' : null,
        checkOutPhoto: todayAbsensi.has_foto_pulang || todayAbsensi.foto_pulang ? 'saved' : null,
        absensiId: todayAbsensi.id,
      });
    } catch (error) {
      console.error('Gagal mengambil absensi hari ini:', error);
    }
  };

  const handleAbsensi = (type: 'in' | 'out') => {
    if (type === 'in' && absensiStatus.checkIn) {
      Alert.alert('Info', 'Anda sudah melakukan check in hari ini');
      return;
    }
    
    if (type === 'out' && absensiStatus.checkOut) {
      Alert.alert('Info', 'Anda sudah melakukan check out hari ini');
      return;
    }
    
    if (type === 'out' && !absensiStatus.checkIn) {
      Alert.alert('Info', 'Anda harus check in terlebih dahulu');
      return;
    }
    
    currentActionRef.current = type;
    setCurrentAction(type);
    setShowLocationPicker(true);
  };

  const handleLocationConfirm = async (location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  }) => {
    // Set ref immediately (sync) to avoid stale closure issues
    tempLocationRef.current = location;
    // Also set state for re-render
    setTempLocation(location);
    // Tutup location picker
    setShowLocationPicker(false);
    // Langsung buka face capture untuk mengambil selfie
    setShowFaceCapture(true);
  };

  const handleFaceCaptureComplete = useCallback(async (photoUri: string, photoBase64?: string) => {
    // Use refs to always get the latest values (avoid stale closures)
    const loc = tempLocationRef.current;
    const action = currentActionRef.current;
    const status = absensiStatusRef.current;

    console.log('[Absensi] handleFaceCaptureComplete called:', {
      hasPhotoUri: !!photoUri,
      hasPhotoBase64: !!photoBase64,
      base64Length: photoBase64?.length || 0,
      hasLocation: !!loc,
      action,
      absensiId: status?.absensiId,
    });

    if (!loc || !action) {
      console.error('[Absensi] Missing location or action:', { loc, action });
      Alert.alert('Error', 'Data lokasi atau aksi absensi tidak lengkap. Silakan coba lagi.');
      return false;
    }

    if (!photoBase64) {
      console.error('[Absensi] Missing photoBase64');
      Alert.alert('Error', 'Foto gagal diproses. Silakan ambil ulang foto.');
      return false;
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    setSubmittingAbsensi(true);
    if (action === 'in') {
      try {
        console.log('[Absensi] Sending check-in request...', {
          base64Length: photoBase64.length,
          latitude: loc.latitude,
          longitude: loc.longitude,
        });
        const response = await axiosInstance.post('/protected/pegawai/absensi', {
          status: 'Hadir',
          absensi_masuk: now.toISOString(),
          foto_masuk: photoBase64,
          latitude: loc.latitude,
          longitude: loc.longitude,
          akurasi: loc.accuracy,
        });
        console.log('[Absensi] Check-in response:', response.status, response.data?.message);
        const savedAbsensi = response.data?.data;

        setAbsensiStatus(prev => ({
          ...prev,
          checkIn: timeString,
          checkInLocation: loc,
          checkInPhoto: photoUri,
          absensiId: savedAbsensi?.id || null,
        }));
        Alert.alert(
          'Sukses',
          `Check In berhasil dan tersimpan di database!\n\nWaktu: ${timeString}\nLokasi: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}\nAkurasi: ${Math.round(loc.accuracy)} meter\nFoto selfie telah tersimpan`
        );
      } catch (error: any) {
        console.error('[Absensi] Check-in failed:', {
          status: error?.response?.status,
          data: error?.response?.data,
          message: error?.message,
          code: error?.code,
        });
        const errMsg = error?.response?.data?.error || error?.message || 'Gagal menyimpan check in ke database.';
        Alert.alert('Error Check In', errMsg);
        return false;
      } finally {
        setSubmittingAbsensi(false);
      }
    } else if (action === 'out') {
      if (!status.absensiId) {
        setSubmittingAbsensi(false);
        Alert.alert('Error', 'Data check in belum tersedia. Silakan check in ulang atau buka kembali aplikasi.');
        return false;
      }

      try {
        console.log('[Absensi] Sending check-out request...', {
          absensiId: status.absensiId,
          base64Length: photoBase64.length,
        });
        await axiosInstance.put(`/protected/pegawai/absensi/${status.absensiId}`, {
          status: 'Hadir',
          absensi_pulang: now.toISOString(),
          foto_pulang: photoBase64,
          latitude: loc.latitude,
          longitude: loc.longitude,
          akurasi: loc.accuracy,
        });
        console.log('[Absensi] Check-out success');

        setAbsensiStatus(prev => ({
          ...prev,
          checkOut: timeString,
          checkOutLocation: loc,
          checkOutPhoto: photoUri,
        }));
        Alert.alert(
          'Sukses',
          `Check Out berhasil dan tersimpan di database!\n\nWaktu: ${timeString}\nLokasi: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}\nAkurasi: ${Math.round(loc.accuracy)} meter\nFoto selfie telah tersimpan`
        );
      } catch (error: any) {
        console.error('[Absensi] Check-out failed:', {
          status: error?.response?.status,
          data: error?.response?.data,
          message: error?.message,
          code: error?.code,
        });
        const errMsg = error?.response?.data?.error || error?.message || 'Gagal menyimpan check out ke database.';
        Alert.alert('Error Check Out', errMsg);
        return false;
      } finally {
        setSubmittingAbsensi(false);
      }
    }
    
    setTempLocation(null);
    setCurrentAction(null);
    return true;
  }, []);

  const handleCloseFaceCapture = () => {
    setShowFaceCapture(false);
    setTempLocation(null);
    setCurrentAction(null);
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Form Absensi</Text>
          <Text style={styles.subtitle}>Lakukan absensi dengan verifikasi lokasi + selfie</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={24} color="#4A90E2" />
            <Text style={styles.infoText}>
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location" size={24} color="#4A90E2" />
            <Text style={styles.infoText}>
              Lokasi akan diverifikasi saat absensi
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="camera" size={24} color="#4A90E2" />
            <Text style={styles.infoText}>
              Selfie akan diambil untuk verifikasi wajah
            </Text>
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[
                styles.absensiButton,
                styles.checkInButton,
                (absensiStatus.checkIn || submittingAbsensi) && styles.disabledButton,
              ]}
              onPress={() => handleAbsensi('in')}
              disabled={!!absensiStatus.checkIn || submittingAbsensi}
            >
              <Ionicons name="log-in-outline" size={24} color="#fff" />
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>{submittingAbsensi ? 'Menyimpan...' : 'Check In'}</Text>
                {absensiStatus.checkIn && (
                  <>
                    <Text style={styles.timeText}>{absensiStatus.checkIn}</Text>
                    <Text style={styles.photoText}>✓ Selfie tersimpan</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.absensiButton,
                styles.checkOutButton,
                (!absensiStatus.checkIn || absensiStatus.checkOut || submittingAbsensi) && styles.disabledButton,
              ]}
              onPress={() => handleAbsensi('out')}
              disabled={!absensiStatus.checkIn || !!absensiStatus.checkOut || submittingAbsensi}
            >
              <Ionicons name="log-out-outline" size={24} color="#fff" />
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>{submittingAbsensi ? 'Menyimpan...' : 'Check Out'}</Text>
                {absensiStatus.checkOut && (
                  <>
                    <Text style={styles.timeText}>{absensiStatus.checkOut}</Text>
                    <Text style={styles.photoText}>✓ Selfie tersimpan</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {absensiStatus.checkIn && absensiStatus.checkOut && (
            <View style={styles.completedContainer}>
              <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
              <Text style={styles.completedText}>
                Absensi hari ini selesai
              </Text>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Informasi:</Text>
          <Text style={styles.infoDescription}>
            • Lokasi Anda akan diverifikasi saat melakukan absensi{'\n'}
            • Selfie akan diambil untuk verifikasi wajah{'\n'}
            • Penggunaan fake GPS tidak diizinkan{'\n'}
            • Pastikan wajah terlihat jelas dalam frame{'\n'}
            • Pastikan GPS dan kamera Anda aktif
          </Text>
        </View>
      </ScrollView>

      <LocationPicker
        visible={showLocationPicker}
        onLocationConfirm={handleLocationConfirm}
        onClose={() => setShowLocationPicker(false)}
      />

      <FaceCapture
        visible={showFaceCapture}
        onClose={handleCloseFaceCapture}
        onCaptureComplete={handleFaceCaptureComplete}
        actionType={currentAction || 'in'}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4A90E2',
    padding: isSmallDevice ? 16 : 20,
    paddingTop: isSmallDevice ? 16 : 20,
    paddingBottom: isSmallDevice ? 25 : 30,
  },
  title: {
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: isSmallDevice ? 12 : 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: '#fff',
    margin: isSmallDevice ? 16 : 20,
    padding: isSmallDevice ? 16 : 20,
    borderRadius: isSmallDevice ? 10 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 20,
  },
  infoText: {
    fontSize: isSmallDevice ? 14 : 16,
    color: '#333',
    flex: 1,
  },
  buttonGroup: {
    gap: 16,
  },
  absensiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: isSmallDevice ? 14 : 16,
    paddingHorizontal: isSmallDevice ? 16 : 20,
    borderRadius: 10,
    gap: 12,
  },
  checkInButton: {
    backgroundColor: '#4CAF50',
  },
  checkOutButton: {
    backgroundColor: '#FF9800',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonContent: {
    flex: 1,
  },
  buttonText: {
    color: '#fff',
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: 'bold',
  },
  timeText: {
    color: '#fff',
    fontSize: isSmallDevice ? 12 : 14,
    marginTop: 4,
  },
  photoText: {
    color: '#fff',
    fontSize: isSmallDevice ? 10 : 11,
    marginTop: 2,
    opacity: 0.9,
  },
  completedContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  completedText: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    margin: isSmallDevice ? 16 : 20,
    marginTop: 0,
    padding: isSmallDevice ? 14 : 16,
    borderRadius: isSmallDevice ? 10 : 12,
  },
  infoTitle: {
    fontSize: isSmallDevice ? 13 : 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: isSmallDevice ? 11 : 12,
    color: '#1565C0',
    lineHeight: 18,
  },
});
