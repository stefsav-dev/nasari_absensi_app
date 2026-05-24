// app/(tabs)/riwayat.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function RiwayatScreen() {
  const [selectedMonth, setSelectedMonth] = useState('Januari 2026');
  
  // Data riwayat absensi
  const riwayatData = [
    { id: '1', date: '23 Jan 2026', checkIn: '08:00', checkOut: '17:00', status: 'Hadir' },
    { id: '2', date: '22 Jan 2026', checkIn: '08:15', checkOut: '17:00', status: 'Terlambat' },
    { id: '3', date: '21 Jan 2026', checkIn: '08:00', checkOut: '17:00', status: 'Hadir' },
    { id: '4', date: '20 Jan 2026', checkIn: '-', checkOut: '-', status: 'Izin' },
    { id: '5', date: '19 Jan 2026', checkIn: '08:00', checkOut: '16:30', status: 'Hadir' },
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'Hadir': return '#4CAF50';
      case 'Terlambat': return '#FF9800';
      case 'Izin': return '#2196F3';
      case 'Sakit': return '#F44336';
      default: return '#999';
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyDate}>{item.date}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <View style={styles.historyDetail}>
        <View style={styles.detailItem}>
          <Ionicons name="log-in-outline" size={20} color="#4CAF50" />
          <Text style={styles.detailText}>Check In: {item.checkIn}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="log-out-outline" size={20} color="#FF9800" />
          <Text style={styles.detailText}>Check Out: {item.checkOut}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Riwayat Absensi</Text>
        <Text style={styles.subtitle}>Lihat riwayat absensi Anda</Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="calendar-outline" size={20} color="#4A90E2" />
          <Text style={styles.filterText}>{selectedMonth}</Text>
          <Ionicons name="chevron-down" size={20} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={riwayatData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4A90E2',
    padding: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  filterText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  listContainer: {
    padding: 20,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
});