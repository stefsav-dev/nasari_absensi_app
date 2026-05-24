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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isTablet = width > 768;

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('User');
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

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
  });

  useEffect(() => {
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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
    // Simulasi refresh data
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  const handleCheckIn = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    
    setTodayStatus({
      isCheckedIn: true,
      isCheckedOut: todayStatus.isCheckedOut,
      checkInTime: timeString,
      checkOutTime: todayStatus.checkOutTime,
    });
    
    // Update statistik
    setStats(prev => ({
      ...prev,
      totalHadir: prev.totalHadir + 1,
    }));
  };

  const handleCheckOut = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    
    setTodayStatus({
      isCheckedIn: todayStatus.isCheckedIn,
      isCheckedOut: true,
      checkInTime: todayStatus.checkInTime,
      checkOutTime: timeString,
    });
  };

  const StatCard = ({ icon, title, value, color, bgColor }) => (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  return (
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
          onPress={() => router.push('/notifikasi')}
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
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, todayStatus.isCheckedOut ? styles.statusActive : styles.statusInactive]} />
            <Text style={styles.statusLabel}>Check Out</Text>
            <Text style={styles.statusTime}>
              {todayStatus.checkOutTime || 'Belum'}
            </Text>
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          {!todayStatus.isCheckedIn ? (
            <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}>
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Check In</Text>
            </TouchableOpacity>
          ) : !todayStatus.isCheckedOut ? (
            <TouchableOpacity style={styles.checkOutButton} onPress={handleCheckOut}>
              <Ionicons name="log-out-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Check Out</Text>
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
          
          <TouchableOpacity style={styles.quickMenuItem}>
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
          
          <TouchableOpacity style={styles.quickMenuItem}>
            <View style={[styles.quickMenuIcon, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="person" size={28} color="#9C27B0" />
            </View>
            <Text style={styles.quickMenuText}>Profil</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
  statusLocation: {
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