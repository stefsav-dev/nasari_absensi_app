import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, ActivityIndicator, ScrollView, Platform, StatusBar, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { absensiService } from '@/lib/api';
import { configureNotifications, requestNotificationPermissions, scheduleDailyNotifications } from '@/lib/notifications';
import { useAuth } from '@/context/auth-context';

configureNotifications();

export default function HomeScreen() {
  const { user } = useAuth();
  const [absensiData, setAbsensiData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live Clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
      setupNotifications();
    }, [])
  );

  const setupNotifications = async () => {
    const granted = await requestNotificationPermissions();
    if (granted) {
      await scheduleDailyNotifications();
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [todayRes, historyRes] = await Promise.all([
        absensiService.getTodayAbsensi(),
        absensiService.getAbsensiHistory()
      ]);
      setAbsensiData(todayRes?.data?.absensi || null);
      setHistoryData(historyRes?.data?.absensi || []);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAbsensiPress = async (type: 'masuk' | 'pulang', id?: number) => {
    setLocationLoading(true);
    router.push({
      pathname: '/maps-location',
      params: { type, id: id || '' }
    });
    setLocationLoading(false);
  };

  // Format Time (HH.mm)
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
  };

  // Format Date (Monday, 08 Nov 2021)
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
  };

  // Extract times for today
  const hasCheckedIn = !!absensiData?.absensi_masuk;
  const hasCheckedOut = !!absensiData?.absensi_pulang && new Date(absensiData.absensi_pulang).getFullYear() > 2000;
  
  let startTime = '-';
  let endTime = '-';
  if (hasCheckedIn) startTime = formatTime(new Date(absensiData.absensi_masuk));
  if (hasCheckedOut) endTime = formatTime(new Date(absensiData.absensi_pulang));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0284c7" />
      
      {/* Top Blue Section */}
      <View style={styles.topSection}>
        <SafeAreaView>
          <View style={styles.headerTop}>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.headerTitle}>NASARI Absensi</Text>
              <Text style={styles.headerSubTitle}>Selamat datang, {user?.nama_lengkap || 'Pengguna'}</Text>
            </View>
            {loading && <ActivityIndicator size="small" color="#fff" style={styles.loaderIcon} />}
            <TouchableOpacity style={styles.historyIcon} onPress={() => router.push('/history')}>
              <Ionicons name="time-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.clockContainer}>
            <Text style={styles.timeBig}>{formatTime(currentTime)}</Text>
            <Text style={styles.dateSmall}>{formatDate(currentTime)}</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* Floating Card */}
      <View style={styles.cardWrapper}>
        <View style={styles.card}>
          <View style={styles.cardTimes}>
            <View style={styles.timeBox}>
              <Text style={styles.timeBoxLabel}>Absen Masuk</Text>
              <Text style={styles.timeBoxValue}>{startTime}</Text>
            </View>
            <View style={styles.timeBox}>
              <Text style={styles.timeBoxLabel}>Absen Pulang</Text>
              <Text style={styles.timeBoxValue}>{endTime}</Text>
            </View>
          </View>

          {!hasCheckedIn ? (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleAbsensiPress('masuk')}
              disabled={locationLoading || loading}
            >
              {locationLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Clock in</Text>}
            </TouchableOpacity>
          ) : !hasCheckedOut ? (
            <View>
              <TouchableOpacity 
                style={currentTime.getHours() < 17 ? [styles.actionButton, styles.actionButtonDisabled] : styles.actionButton}
                onPress={() => handleAbsensiPress('pulang', absensiData.id)}
                disabled={locationLoading || loading || currentTime.getHours() < 17}
              >
                {locationLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Clock out</Text>}
              </TouchableOpacity>
              {currentTime.getHours() < 17 && (
                <Text style={styles.timeWarningText}>
                  Absensi pulang baru dapat dilakukan mulai pukul 17.00
                </Text>
              )}
            </View>
          ) : (
            <View style={[styles.actionButton, styles.actionButtonDisabled]}>
              <Text style={styles.actionButtonText}>Selesai untuk hari ini</Text>
            </View>
          )}
        </View>
      </View>

      {/* Recent Attendance List */}
      <ScrollView style={styles.historySection} contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={styles.historyTitle}>Riwayat Absensi</Text>
        
        {historyData.slice(0, 5).map((item, index) => (
          <View key={index} style={styles.historyItem}>
            <Text style={styles.historyItemDate}>{formatDate(new Date(item.absensi_masuk))}</Text>
            
            <View style={styles.historyRow}>
              <Text style={styles.historyLabel}>Jam Absen Masuk</Text>
              <Text style={styles.historyValue}>{formatTime(new Date(item.absensi_masuk))}</Text>
            </View>
            
            <View style={styles.historyRow}>
              <Text style={styles.historyLabel}>Jam Absen Pulang</Text>
              <Text style={styles.historyValue}>
                {item.absensi_pulang && new Date(item.absensi_pulang).getFullYear() > 2000 
                  ? formatTime(new Date(item.absensi_pulang)) 
                  : ''}
              </Text>
            </View>
          </View>
        ))}

        {historyData.length === 0 && !loading && (
          <Text style={styles.emptyText}>Belum ada data absensi.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topSection: {
    backgroundColor: '#0284c7', // vibrant blue
    height: 320,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
    position: 'relative',
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  headerSubTitle: {
    color: '#fff',
    fontSize: 16,
    marginTop: 5,
    opacity: 0.9,
  },
  historyIcon: {
    position: 'absolute',
    right: 20,
    marginTop: 30,
  },
  loaderIcon: {
    position: 'absolute',
    left: 20,
  },
  clockContainer: {
    alignItems: 'center',
    marginTop: 0,
  },
  timeBig: {
    color: '#fff',
    fontSize: 50,
    fontWeight: 'bold',
  },
  dateSmall: {
    color: '#fff',
    fontSize: 18,
    marginTop: 0,
    opacity: 0.9,
  },
  cardWrapper: {
    paddingHorizontal: 20,
    marginTop: -80, // Overlap blue section
    zIndex: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8, // for Android
  },
  cardTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  timeBox: {
    alignItems: 'center',
    flex: 1,
  },
  timeBoxLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 8,
  },
  timeBoxValue: {
    fontSize: 18,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  actionButton: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  historySection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 16,
  },
  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 16,
  },
  historyItemDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0284c7',
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  historyValue: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 20,
    fontStyle: 'italic',
  },
  timeWarningText: {
    textAlign: 'center',
    color: '#f43f5e',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
});
