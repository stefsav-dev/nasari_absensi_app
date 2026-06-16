import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { absensiService } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

export default function HistoryScreen() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const response = await absensiService.getAbsensiHistory();
      setHistory(response.data?.absensi || []);
    } catch (error) {
      console.error('Failed to fetch history', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchHistory();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const renderItem = ({ item }: { item: any }) => {
    const hasPulang = !!item.absensi_pulang && new Date(item.absensi_pulang).getFullYear() > 2000;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="calendar-outline" size={16} color="#94a3b8" />
          <Text style={styles.dateText}>{formatDate(item.absensi_masuk)}</Text>
          <View style={[styles.badge, { backgroundColor: hasPulang ? '#10b981' : '#f59e0b' }]}>
            <Text style={styles.badgeText}>{hasPulang ? 'Selesai' : 'Belum Pulang'}</Text>
          </View>
        </View>
        
        <View style={styles.row}>
          <View style={styles.timeBlock}>
            <Text style={styles.label}>Masuk</Text>
            <Text style={styles.time}>{formatTime(item.absensi_masuk)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.timeBlock}>
            <Text style={styles.label}>Pulang</Text>
            <Text style={styles.time}>{hasPulang ? formatTime(item.absensi_pulang) : ''}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Riwayat Absensi</ThemedText>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={64} color="#334155" />
          <ThemedText style={styles.emptyText}>Belum ada data absensi.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#0f172a',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    marginTop: 16,
  },
  listContainer: {
    padding: 24,
    paddingTop: 0,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 12,
  },
  dateText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeBlock: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
  },
  time: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#334155',
  },
});
