import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, RefreshControl, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_URL, absensiService } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from 'expo-router';

export default function HistoryScreen() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAbsensi, setSelectedAbsensi] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [fotoMasukUri, setFotoMasukUri] = useState<string | null>(null);
  const [fotoPulangUri, setFotoPulangUri] = useState<string | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    const loadPhotos = async () => {
      if (!selectedAbsensi || !session) return;
      
      setFotoMasukUri(null);
      setFotoPulangUri(null);

      if (selectedAbsensi.has_foto_masuk) {
        const fileUri = `${FileSystem.cacheDirectory}photo_${selectedAbsensi.id}_masuk.jpg`;
        const url = `${API_URL}/protected/absensi/${selectedAbsensi.id}/photo?type=masuk`;
        try {
          const download = await FileSystem.downloadAsync(url, fileUri, {
            headers: { Authorization: `Bearer ${session}` }
          });
          if (download.status === 200) setFotoMasukUri(download.uri);
        } catch (e) {
          console.error('Failed to download foto masuk', e);
        }
      }

      if (selectedAbsensi.has_foto_pulang) {
        const fileUri = `${FileSystem.cacheDirectory}photo_${selectedAbsensi.id}_pulang.jpg`;
        const url = `${API_URL}/protected/absensi/${selectedAbsensi.id}/photo?type=pulang`;
        try {
          const download = await FileSystem.downloadAsync(url, fileUri, {
            headers: { Authorization: `Bearer ${session}` }
          });
          if (download.status === 200) setFotoPulangUri(download.uri);
        } catch (e) {
          console.error('Failed to download foto pulang', e);
        }
      }
    };

    loadPhotos();
  }, [selectedAbsensi, session]);

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
      <TouchableOpacity 
        style={styles.card}
        onPress={() => {
          setSelectedAbsensi(item);
          setModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Ionicons name="calendar-outline" size={16} color="#94a3b8" />
          <Text style={styles.dateText}>{formatDate(item.absensi_masuk)}</Text>
          <View style={[styles.badge, { backgroundColor: item.status === 'Terlambat' ? '#ef4444' : (hasPulang ? '#10b981' : '#f59e0b') }]}>
            <Text style={styles.badgeText}>{item.status === 'Terlambat' ? 'Terlambat' : (hasPulang ? 'Selesai' : 'Belum Pulang')}</Text>
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
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.themesHistory}>Riwayat Absensi</Text>
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

      {/* Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Absensi</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {selectedAbsensi && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tanggal</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedAbsensi.absensi_masuk)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={styles.detailValue}>{selectedAbsensi.status}</Text>
                  </View>
                  
                  <View style={styles.dividerFull} />
                  
                  <Text style={styles.sectionTitle}>Absen Masuk</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Waktu</Text>
                    <Text style={styles.detailValue}>{formatTime(selectedAbsensi.absensi_masuk)}</Text>
                  </View>
                  {selectedAbsensi.has_foto_masuk ? (
                    fotoMasukUri ? (
                      <Image 
                        source={{ uri: fotoMasukUri }}
                        style={styles.photo}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.noPhotoBox}>
                        <ActivityIndicator size="small" color="#0ea5e9" />
                        <Text style={[styles.noPhotoText, {marginTop: 8}]}>Memuat foto...</Text>
                      </View>
                    )
                  ) : (
                    <View style={styles.noPhotoBox}><Text style={styles.noPhotoText}>Tidak ada foto masuk</Text></View>
                  )}
                  
                  <View style={styles.dividerFull} />
                  
                  <Text style={styles.sectionTitle}>Absen Pulang</Text>
                  {selectedAbsensi.absensi_pulang && new Date(selectedAbsensi.absensi_pulang).getFullYear() > 2000 ? (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Waktu</Text>
                        <Text style={styles.detailValue}>{formatTime(selectedAbsensi.absensi_pulang)}</Text>
                      </View>
                      {selectedAbsensi.has_foto_pulang ? (
                        fotoPulangUri ? (
                          <Image 
                            source={{ uri: fotoPulangUri }}
                            style={styles.photo}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.noPhotoBox}>
                            <ActivityIndicator size="small" color="#0ea5e9" />
                            <Text style={[styles.noPhotoText, {marginTop: 8}]}>Memuat foto...</Text>
                          </View>
                        )
                      ) : (
                        <View style={styles.noPhotoBox}><Text style={styles.noPhotoText}>Tidak ada foto pulang</Text></View>
                      )}
                    </>
                  ) : (
                    <Text style={styles.emptyText}>Belum melakukan absen pulang</Text>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  themesHistory: {
    color: "white",
    fontSize: 20
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    flex: 1,
  },
  sectionTitle: {
    color: '#0ea5e9',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dividerFull: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 16,
  },
  photo: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: '#0f172a',
  },
  noPhotoBox: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  noPhotoText: {
    color: '#64748b',
    fontSize: 14,
  }
});
