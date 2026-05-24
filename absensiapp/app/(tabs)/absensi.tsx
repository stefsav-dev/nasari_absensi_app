// app/(tabs)/absensi.tsx
import React, { useState } from 'react';
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
  });
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [currentAction, setCurrentAction] = useState<'in' | 'out' | null>(null);
  const [tempLocation, setTempLocation] = useState<any>(null);

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
    
    setCurrentAction(type);
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

  const handleFaceCaptureComplete = async (photoUri: string) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    if (currentAction === 'in') {
      setAbsensiStatus({
        ...absensiStatus,
        checkIn: timeString,
        checkInLocation: tempLocation,
        checkInPhoto: photoUri,
      });
      Alert.alert(
        'Sukses',
        `Check In berhasil!\n\nWaktu: ${timeString}\nLokasi: ${tempLocation.latitude.toFixed(6)}, ${tempLocation.longitude.toFixed(6)}\nAkurasi: ${Math.round(tempLocation.accuracy)} meter\nFoto selfie telah tersimpan`
      );
    } else if (currentAction === 'out') {
      setAbsensiStatus({
        ...absensiStatus,
        checkOut: timeString,
        checkOutLocation: tempLocation,
        checkOutPhoto: photoUri,
      });
      Alert.alert(
        'Sukses',
        `Check Out berhasil!\n\nWaktu: ${timeString}\nLokasi: ${tempLocation.latitude.toFixed(6)}, ${tempLocation.longitude.toFixed(6)}\nAkurasi: ${Math.round(tempLocation.accuracy)} meter\nFoto selfie telah tersimpan`
      );
    }
    
    setTempLocation(null);
    setCurrentAction(null);
  };

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
                absensiStatus.checkIn && styles.disabledButton,
              ]}
              onPress={() => handleAbsensi('in')}
              disabled={!!absensiStatus.checkIn}
            >
              <Ionicons name="log-in-outline" size={24} color="#fff" />
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Check In</Text>
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
                (!absensiStatus.checkIn || absensiStatus.checkOut) && styles.disabledButton,
              ]}
              onPress={() => handleAbsensi('out')}
              disabled={!absensiStatus.checkIn || !!absensiStatus.checkOut}
            >
              <Ionicons name="log-out-outline" size={24} color="#fff" />
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Check Out</Text>
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