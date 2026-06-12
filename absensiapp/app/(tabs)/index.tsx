// app/(tabs)/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
  LogBox,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import LocationPicker from '../../components/LocationPicker';
import FaceCapture from '../../components/FaceCapture';
import axiosInstance from '../../utils/axios';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isTablet = width > 768;

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('Ahmad Fauzi');
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  // State untuk LocationPicker dan FaceCapture
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [currentAction, setCurrentAction] = useState<'in' | 'out' | null>(null);
  const [tempLocation, setTempLocation] = useState<any>(null);

  // Data statistik
  const [stats, setStats] = useState({
    totalHadir: 18,
    totalIzin: 2,
    totalSakit: 1,
    totalTerlambat: 1,
  });

  // Data absensi hari ini
  const [todayStatus, setTodayStatus] = useState({
    isCheckedIn: false,
    isCheckedOut: false,
    checkInTime: '',
    checkOutTime: '',
    checkInLocation: null as any,
    checkOutLocation: null as any,
    checkInPhoto: null as string | null,
    checkOutPhoto: null as string | null,
    absensiId: null as number | null,
  });
  const [submittingAbsensi, setSubmittingAbsensi] = useState(false);

  useEffect(() => {
    updateDateTime();
    fetchProfile();
    fetchTodayAbsensi();
    setupNotifications();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axiosInstance.get('/protected/profile');
      if (response.data && response.data.success && response.data.data) {
        setUserName(response.data.data.nama_lengkap);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const formatTimeFromApi = (dateValue?: string) => {
    if (!dateValue || dateValue.startsWith('0001-')) {
      return '';
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

      setTodayStatus({
        isCheckedIn: !!checkInTime,
        isCheckedOut: !!checkOutTime,
        checkInTime,
        checkOutTime,
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

  const setupNotifications = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return;
    }

    // Cancel all previously scheduled notifications to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 1. Notifikasi Terlambat: Jam 08:16 (Senin - Sabtu)
    for (let i = 2; i <= 7; i++) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Peringatan Absensi',
          body: 'Maaf anda terlambat',
          sound: true,
        },
        trigger: { type: 'weekly', weekday: i, hour: 8, minute: 16 } as any,
      });
    }

    // 2. Notifikasi Pulang: Jam 17:00 (Senin - Jumat)
    for (let i = 2; i <= 6; i++) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Waktu Pulang',
          body: 'Saat nya Pulang, saat nya absen pulang',
          sound: true,
        },
        trigger: { type: 'weekly', weekday: i, hour: 17, minute: 0 } as any,
      });
    }

    // 3. Notifikasi Pulang: Jam 12:00 (Sabtu)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Waktu Pulang',
        body: 'Saat nya Pulang, saat nya absen pulang',
        sound: true,
      },
      trigger: { type: 'weekly', weekday: 7, hour: 12, minute: 0 } as any,
    });
  };

  const updateDateTime = () => {
    const now = new Date();
    const time = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const date = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    setCurrentTime(time);
    setCurrentDate(date);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  const handleCheckIn = () => {
    if (todayStatus.isCheckedIn) {
      Alert.alert('Info', 'Anda sudah melakukan check in hari ini');
      return;
    }
    setCurrentAction('in');
    setShowLocationPicker(true);
  };

  const handleCheckOut = () => {
    if (todayStatus.isCheckedOut) {
      Alert.alert('Info', 'Anda sudah melakukan check out hari ini');
      return;
    }
    if (!todayStatus.isCheckedIn) {
      Alert.alert('Info', 'Anda harus check in terlebih dahulu');
      return;
    }
    setCurrentAction('out');
    setShowLocationPicker(true);
  };

  const handleLocationConfirm = async (location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  }) => {
    // Simpan lokasi sementara
    setTempLocation(location);
    // Tutup location picker
    setShowLocationPicker(false);
    // Langsung buka face capture untuk mengambil selfie
    setShowFaceCapture(true);
  };

  const handleFaceCaptureComplete = async (photoUri: string, photoBase64?: string) => {
    if (!tempLocation || !currentAction) {
      Alert.alert('Error', 'Data lokasi atau aksi absensi tidak lengkap. Silakan coba lagi.');
      return false;
    }

    if (!photoBase64) {
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
    if (currentAction === 'in') {
      try {
        const response = await axiosInstance.post('/protected/pegawai/absensi', {
          status: 'Hadir',
          absensi_masuk: now.toISOString(),
          foto_masuk: photoBase64,
          latitude: tempLocation.latitude,
          longitude: tempLocation.longitude,
          akurasi: tempLocation.accuracy,
        });
        const savedAbsensi = response.data?.data;

        setTodayStatus({
          ...todayStatus,
          isCheckedIn: true,
          checkInTime: timeString,
          checkInLocation: tempLocation,
          checkInPhoto: photoUri,
          absensiId: savedAbsensi?.id || null,
        });

        // Update statistik
        setStats(prev => ({
          ...prev,
          totalHadir: prev.totalHadir + 1,
        }));

        Alert.alert(
          'Sukses',
          `✅ Check In berhasil dan tersimpan di database!\n\n📅 Waktu: ${timeString}\n📍 Lokasi: ${tempLocation.latitude.toFixed(6)}, ${tempLocation.longitude.toFixed(6)}\n🎯 Akurasi: ${Math.round(tempLocation.accuracy)} meter\n📸 Foto selfie telah tersimpan`
        );
      } catch (error: any) {
        console.error('Gagal menyimpan check in:', error?.response?.data || error);
        Alert.alert('Error', error?.response?.data?.error || 'Gagal menyimpan check in ke database.');
        return false;
      } finally {
        setSubmittingAbsensi(false);
      }
    } else if (currentAction === 'out') {
      if (!todayStatus.absensiId) {
        setSubmittingAbsensi(false);
        Alert.alert('Error', 'Data check in belum tersedia. Silakan check in ulang atau buka kembali aplikasi.');
        return false;
      }

      try {
        await axiosInstance.put(`/protected/pegawai/absensi/${todayStatus.absensiId}`, {
          status: 'Hadir',
          absensi_pulang: now.toISOString(),
          foto_pulang: photoBase64,
          latitude: tempLocation.latitude,
          longitude: tempLocation.longitude,
          akurasi: tempLocation.accuracy,
        });

        setTodayStatus({
          ...todayStatus,
          isCheckedOut: true,
          checkOutTime: timeString,
          checkOutLocation: tempLocation,
          checkOutPhoto: photoUri,
        });

        Alert.alert(
          'Sukses',
          `✅ Check Out berhasil dan tersimpan di database!\n\n📅 Waktu: ${timeString}\n📍 Lokasi: ${tempLocation.latitude.toFixed(6)}, ${tempLocation.longitude.toFixed(6)}\n🎯 Akurasi: ${Math.round(tempLocation.accuracy)} meter\n📸 Foto selfie telah tersimpan`
        );
      } catch (error: any) {
        console.error('Gagal menyimpan check out:', error?.response?.data || error);
        Alert.alert('Error', error?.response?.data?.error || 'Gagal menyimpan check out ke database.');
        return false;
      } finally {
        setSubmittingAbsensi(false);
      }
    }

    setTempLocation(null);
    setCurrentAction(null);
    return true;
  };

  const handleCloseFaceCapture = () => {
    setShowFaceCapture(false);
    setTempLocation(null);
    setCurrentAction(null);
  };

  const StatCard = ({ icon, title, value, color, bgColor }: any) => (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  return (
    <>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Selamat Datang,</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => Alert.alert('Info', 'Fitur notifikasi akan segera hadir')}
          >
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Date & Time */}
        <View style={styles.dateTimeContainer}>
          <Text style={styles.currentTime}>{currentTime}</Text>
          <Text style={styles.currentDate}>{currentDate}</Text>
        </View>

        {/* Status Absensi Hari Ini */}
        <View style={styles.todayStatusCard}>
          <Text style={styles.sectionTitle}>Status Absensi Hari Ini</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, todayStatus.isCheckedIn ? styles.statusActive : styles.statusInactive]} />
              <Text style={styles.statusLabel}>Check In</Text>
              <Text style={styles.statusTime}>
                {todayStatus.checkInTime || 'Belum'}
              </Text>
              {todayStatus.checkInPhoto && (
                <Text style={styles.statusPhoto}>✓ Selfie terverifikasi</Text>
              )}
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, todayStatus.isCheckedOut ? styles.statusActive : styles.statusInactive]} />
              <Text style={styles.statusLabel}>Check Out</Text>
              <Text style={styles.statusTime}>
                {todayStatus.checkOutTime || 'Belum'}
              </Text>
              {todayStatus.checkOutPhoto && (
                <Text style={styles.statusPhoto}>✓ Selfie terverifikasi</Text>
              )}
            </View>
          </View>

          <View style={styles.buttonContainer}>
            {!todayStatus.isCheckedIn ? (
              <TouchableOpacity
                style={[styles.checkInButton, submittingAbsensi && styles.disabledButton]}
                onPress={handleCheckIn}
                disabled={submittingAbsensi}
              >
                <Ionicons name="log-in-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>
                  {submittingAbsensi ? 'Menyimpan...' : 'Check In (Lokasi + Selfie)'}
                </Text>
              </TouchableOpacity>
            ) : !todayStatus.isCheckedOut ? (
              <TouchableOpacity
                style={[styles.checkOutButton, submittingAbsensi && styles.disabledButton]}
                onPress={handleCheckOut}
                disabled={submittingAbsensi}
              >
                <Ionicons name="log-out-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>
                  {submittingAbsensi ? 'Menyimpan...' : 'Check Out (Lokasi + Selfie)'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.completedStatus}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.completedText}>Absensi selesai hari ini</Text>
              </View>
            )}
          </View>
        </View>

        {/* Statistik */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Statistik Bulan Ini</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="checkmark-circle"
              title="Hadir"
              value={stats.totalHadir}
              color="#4CAF50"
              bgColor="#E8F5E9"
            />
            <StatCard
              icon="medical"
              title="Sakit"
              value={stats.totalSakit}
              color="#FF9800"
              bgColor="#FFF3E0"
            />
            <StatCard
              icon="time"
              title="Terlambat"
              value={stats.totalTerlambat}
              color="#F44336"
              bgColor="#FFEBEE"
            />
            <StatCard
              icon="document-text"
              title="Izin"
              value={stats.totalIzin}
              color="#2196F3"
              bgColor="#E3F2FD"
            />
          </View>
        </View>

        {/* Menu Cepat */}
        <View style={styles.quickMenuSection}>
          <Text style={styles.sectionTitle}>Menu Cepat</Text>
          <View style={styles.quickMenuGrid}>
            <TouchableOpacity style={styles.quickMenuItem} onPress={() => router.push('/(tabs)/absensi')}>
              <View style={[styles.quickMenuIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="calendar" size={28} color="#2196F3" />
              </View>
              <Text style={styles.quickMenuText}>Absensi</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickMenuItem} onPress={() => router.push('/(tabs)/riwayat')}>
              <View style={[styles.quickMenuIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="time" size={28} color="#4CAF50" />
              </View>
              <Text style={styles.quickMenuText}>Riwayat</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickMenuItem}>
              <View style={[styles.quickMenuIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="document-text" size={28} color="#FF9800" />
              </View>
              <Text style={styles.quickMenuText}>Izin</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickMenuItem} onPress={() => router.push('/(tabs)/profil')}>
              <View style={[styles.quickMenuIcon, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="person" size={28} color="#9C27B0" />
              </View>
              <Text style={styles.quickMenuText}>Profil</Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingTop: isSmallDevice ? 16 : 20,
    paddingBottom: isSmallDevice ? 25 : 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: isSmallDevice ? 16 : 20,
    borderBottomRightRadius: isSmallDevice ? 16 : 20,
  },
  welcomeText: {
    fontSize: isSmallDevice ? 12 : 14,
    color: '#fff',
    opacity: 0.9,
  },
  userName: {
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dateTimeContainer: {
    backgroundColor: '#fff',
    marginHorizontal: isSmallDevice ? 16 : 20,
    marginTop: -20,
    padding: isSmallDevice ? 12 : 16,
    borderRadius: isSmallDevice ? 10 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  currentTime: {
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: 'bold',
    color: '#333',
  },
  currentDate: {
    fontSize: isSmallDevice ? 12 : 14,
    color: '#666',
    marginTop: 4,
  },
  todayStatusCard: {
    backgroundColor: '#fff',
    marginHorizontal: isSmallDevice ? 16 : 20,
    marginTop: 20,
    padding: isSmallDevice ? 16 : 20,
    borderRadius: isSmallDevice ? 10 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: isSmallDevice ? 10 : 12,
    height: isSmallDevice ? 10 : 12,
    borderRadius: isSmallDevice ? 5 : 6,
    marginBottom: 8,
  },
  statusActive: {
    backgroundColor: '#4CAF50',
  },
  statusInactive: {
    backgroundColor: '#ccc',
  },
  statusLabel: {
    fontSize: isSmallDevice ? 12 : 14,
    color: '#666',
    marginBottom: 4,
  },
  statusTime: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '600',
    color: '#333',
  },
  statusPhoto: {
    fontSize: isSmallDevice ? 9 : 10,
    color: '#4CAF50',
    marginTop: 4,
  },
  statusDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  buttonContainer: {
    marginTop: 10,
  },
  checkInButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallDevice ? 12 : 14,
    borderRadius: 10,
    gap: 8,
  },
  checkOutButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallDevice ? 12 : 14,
    borderRadius: 10,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: 'bold',
  },
  completedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  completedText: {
    color: '#4CAF50',
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '600',
  },
  statsSection: {
    marginTop: 20,
    marginHorizontal: isSmallDevice ? 16 : 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: isTablet
      ? (width - 56) / 4
      : (width - (isSmallDevice ? 48 : 56)) / 2,
    padding: isSmallDevice ? 12 : 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  statIconContainer: {
    width: isSmallDevice ? 40 : 48,
    height: isSmallDevice ? 40 : 48,
    borderRadius: isSmallDevice ? 20 : 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: isSmallDevice ? 11 : 12,
    color: '#666',
  },
  quickMenuSection: {
    marginTop: 20,
    marginHorizontal: isSmallDevice ? 16 : 20,
    marginBottom: 30,
  },
  quickMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickMenuItem: {
    width: isTablet
      ? (width - 56) / 4
      : (width - (isSmallDevice ? 48 : 56)) / 2,
    alignItems: 'center',
    marginBottom: 16,
  },
  quickMenuIcon: {
    width: isSmallDevice ? 60 : 70,
    height: isSmallDevice ? 60 : 70,
    borderRadius: isSmallDevice ? 30 : 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickMenuText: {
    fontSize: isSmallDevice ? 12 : 14,
    color: '#666',
    textAlign: 'center',
  },
});
