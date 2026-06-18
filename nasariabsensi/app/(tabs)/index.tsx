import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, ActivityIndicator, ScrollView, Platform, StatusBar, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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

  // Format Date (Kamis, 18 Jun 2026)
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
      <StatusBar barStyle="light-content" backgroundColor="#2c5a7f" />
      
      {/* Top Blue Section */}
      <LinearGradient colors={['#2c5a7f', '#78824f', '#dcb412']} locations={[0, 0.5, 1]} style={styles.topSection}>
        <SafeAreaView>
          <View style={styles.headerTop}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>NASARI Absensi</Text>
              <Text style={styles.headerSubTitle}>Selamat datang, {user?.nama_lengkap || 'Pengguna'}</Text>
            </View>
            <View style={styles.headerRight}>
              {loading && <ActivityIndicator size="small" color="#fff" style={styles.loaderIcon} />}
              <TouchableOpacity style={styles.historyIcon} onPress={() => router.push('/history')}>
                <Ionicons name="time-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.clockContainer}>
            <Text style={styles.timeBig}>{formatTime(currentTime)}</Text>
            <Text style={styles.dateSmall}>{formatDate(currentTime)}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Floating Card */}
      <View style={styles.cardWrapper}>
        <View style={styles.card}>
          <View style={styles.cardTimes}>
            <View style={styles.timeBox}>
              <Text style={styles.timeBoxLabel}>Clock In</Text>
              <Text style={styles.timeBoxValueBlue}>{startTime}</Text>
            </View>
            <View style={styles.dividerVertical} />
            <View style={styles.timeBox}>
              <Text style={styles.timeBoxLabel}>Clock Out</Text>
              <Text style={styles.timeBoxValueBlue}>{endTime}</Text>
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
                {locationLoading ? <ActivityIndicator color="#475569" /> : <Text style={currentTime.getHours() < 17 ? styles.actionButtonTextDisabled : styles.actionButtonText}>Clock out</Text>}
              </TouchableOpacity>
              {currentTime.getHours() < 17 && (
                <Text style={styles.timeWarningText}>
                  Absensi pulang baru dapat dilakukan mulai pukul 17.00
                </Text>
              )}
            </View>
          ) : (
            <View style={[styles.actionButton, styles.actionButtonDisabled]}>
              <Text style={styles.actionButtonTextDisabled}>Selesai untuk hari ini</Text>
            </View>
          )}
        </View>
      </View>

      {/* Recent Attendance List */}
      <ScrollView style={styles.historySection} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Riwayat Absensi</Text>
          <TouchableOpacity onPress={() => router.push('/history')}>
            <Text style={styles.historyLink}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>
        
        {historyData.slice(0, 5).map((item, index) => (
          <View key={index} style={styles.historyItemCard}>
            <Text style={styles.historyItemDate}>{formatDate(new Date(item.absensi_masuk))}</Text>
            
            <View style={styles.historyRow}>
              <Text style={styles.historyLabel}>Clock In</Text>
              <Text style={styles.historyValue}>{formatTime(new Date(item.absensi_masuk))}</Text>
            </View>
            
            <View style={styles.historyRow}>
              <Text style={styles.historyLabel}>Clock Out</Text>
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
    height: 340,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
    paddingHorizontal: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubTitle: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 24,
    marginLeft: 10,
  },
  loaderIcon: {
    marginRight: 10,
  },
  clockContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  timeBig: {
    color: '#fff',
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: -1,
  },
  dateSmall: {
    color: '#fff',
    fontSize: 16,
    marginTop: 4,
    fontWeight: '500',
    opacity: 0.9,
  },
  cardWrapper: {
    paddingHorizontal: 24,
    marginTop: -70, // Overlap blue section
    zIndex: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5, // for Android
  },
  cardTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dividerVertical: {
    width: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 10,
  },
  timeBox: {
    alignItems: 'center',
    flex: 1,
  },
  timeBoxLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  timeBoxValueBlue: {
    fontSize: 28,
    color: '#004b87',
    fontWeight: 'bold',
  },
  actionButton: {
    backgroundColor: '#004b87',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonTextDisabled: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
  historySection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  historyLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#004b87',
  },
  historyItemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  historyItemDate: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#004b87',
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyLabel: {
    fontSize: 14,
    color: '#64748b',
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
