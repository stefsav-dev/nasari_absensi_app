// components/LocationPicker.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface LocationPickerProps {
  onLocationConfirm: (location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  }) => void;
  visible: boolean;
  onClose: () => void;
}

export default function LocationPicker({ onLocationConfirm, visible, onClose }: LocationPickerProps) {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFakeGPS, setIsFakeGPS] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // Deteksi fake GPS (dipertahankan)
  const detectFakeGPS = (location: Location.LocationObject) => {
    const { coords } = location;
    if (coords.accuracy === 0 || coords.accuracy < 5) {
      return true;
    }
    if (coords.speed && coords.speed > 100) {
      return true;
    }
    if (coords.altitude && (coords.altitude < -100 || coords.altitude > 9000)) {
      return true;
    }
    return false;
  };

  // Validasi lokasi kantor - DINONAKTIFKAN
  const validateOfficeLocation = (latitude: number, longitude: number) => {
    return {
      isValid: true,
      distance: 0,
      officeLocation: { latitude: 0, longitude: 0 }
    };
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getCurrentLocation = async () => {
    setLoading(true);
    setErrorMsg(null);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setErrorMsg('Izin lokasi diperlukan untuk melakukan absensi');
        Alert.alert('Izin Diperlukan', 'Aplikasi memerlukan akses lokasi untuk melakukan absensi.');
        setLoading(false);
        return;
      }

      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        setErrorMsg('GPS tidak aktif. Harap aktifkan GPS Anda.');
        Alert.alert('GPS Tidak Aktif', 'Harap aktifkan GPS untuk melanjutkan absensi.');
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
      });

      const isFake = detectFakeGPS(currentLocation);
      setIsFakeGPS(isFake);

      if (isFake) {
        setErrorMsg('Terdeteksi penggunaan fake GPS. Harap nonaktifkan fake GPS.');
        Alert.alert('Fake GPS Terdeteksi', 'Anda tidak diperbolehkan menggunakan fake GPS untuk absensi.');
        setLoading(false);
        return;
      }

      const officeValidation = validateOfficeLocation(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude
      );

      if (!officeValidation.isValid) {
        setErrorMsg(`Anda berada di luar radius kantor. Jarak: ${officeValidation.distance} meter dari kantor.`);
        Alert.alert(
          'Di Luar Radius Kantor',
          `Anda harus berada dalam radius 100 meter dari kantor untuk melakukan absensi.\n\nJarak Anda: ${officeValidation.distance} meter dari kantor.`
        );
        setLoading(false);
        return;
      }

      setLocation(currentLocation);
      setErrorMsg(null);
    } catch (error) {
      console.error('Error:', error);
      setErrorMsg('Gagal mendapatkan lokasi. Pastikan GPS aktif dan coba lagi.');
      Alert.alert('Error', 'Gagal mendapatkan lokasi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      getCurrentLocation();
    }
  }, [visible]);

  const handleConfirm = () => {
    if (location && !isFakeGPS) {
      // Kirim lokasi ke parent, parent akan menutup LocationPicker dan membuka FaceCapture
      onLocationConfirm({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });
      // Jangan tutup di sini, biarkan parent yang menutup
      // onClose(); // Hapus ini
    }
  };

  // Generate HTML untuk Leaflet map
  const generateMapHTML = () => {
    const lat = location?.coords.latitude || -6.200000;
    const lng = location?.coords.longitude || 106.816666;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { margin: 0; padding: 0; }
            #map { width: 100vw; height: 100vh; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = L.map('map').setView([${lat}, ${lng}], 18);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
              subdomains: 'abcd',
              maxZoom: 20,
              minZoom: 15
            }).addTo(map);
            var marker = L.marker([${lat}, ${lng}], { draggable: false }).addTo(map);
            marker.bindPopup("<b>Lokasi Anda</b><br>Latitude: ${lat.toFixed(6)}<br>Longitude: ${lng.toFixed(6)}").openPopup();
            var circle = L.circle([${lat}, ${lng}], {
              color: '#4A90E2',
              fillColor: '#4A90E2',
              fillOpacity: 0.2,
              radius: 50
            }).addTo(map);
          </script>
        </body>
      </html>
    `;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Verifikasi Lokasi</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Mendapatkan lokasi...</Text>
            <Text style={styles.loadingSubText}>Pastikan GPS Anda aktif</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={60} color="#F44336" />
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={getCurrentLocation}>
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.mapContainer}>
              <WebView
                ref={webViewRef}
                source={{ html: generateMapHTML() }}
                style={styles.map}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={styles.webViewLoading}>
                    <ActivityIndicator size="large" color="#4A90E2" />
                  </View>
                )}
              />
            </View>
            
            <View style={styles.infoContainer}>
              <View style={styles.locationInfo}>
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={20} color="#4CAF50" />
                  <Text style={styles.infoLabel}>Latitude:</Text>
                  <Text style={styles.infoValue}>{location?.coords.latitude.toFixed(6)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={20} color="#4CAF50" />
                  <Text style={styles.infoLabel}>Longitude:</Text>
                  <Text style={styles.infoValue}>{location?.coords.longitude.toFixed(6)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="speedometer" size={20} color="#FF9800" />
                  <Text style={styles.infoLabel}>Akurasi:</Text>
                  <Text style={styles.infoValue}>{Math.round(location?.coords.accuracy || 0)} meter</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.infoLabel}>Status:</Text>
                  <Text style={[styles.infoValue, { color: '#4CAF50' }]}>Lokasi Valid</Text>
                </View>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.confirmButtonText}>Konfirmasi & Ambil Selfie</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // ... semua styles yang sudah ada (sama seperti sebelumnya)
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 2,
    position: 'relative',
  },
  map: {
    width: width,
    height: height * 0.5,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  infoContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  locationInfo: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 70,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});