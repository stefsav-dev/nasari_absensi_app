import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/auth-context';

const getLeafletHTML = (
  latitude: number, 
  longitude: number, 
  accuracy: number,
  officeLat?: number,
  officeLon?: number,
  officeRadius?: number
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([${latitude}, ${longitude}], 17);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // User location marker
    L.marker([${latitude}, ${longitude}]).addTo(map)
      .bindPopup('<b>Lokasi Anda</b><br>Titik koordinat absensi')
      .openPopup();

    // Accuracy circle
    L.circle([${latitude}, ${longitude}], {
      radius: ${accuracy},
      color: '#0ea5e9',
      fillColor: '#0ea5e930',
      fillOpacity: 0.3,
      weight: 2,
    }).addTo(map);

    ${officeLat && officeLon && officeRadius ? `
    // Office radius circle
    L.circle([${officeLat}, ${officeLon}], {
      radius: ${officeRadius},
      color: '#f43f5e',
      fillColor: '#f43f5e30',
      fillOpacity: 0.3,
      weight: 2,
      dashArray: '5, 5'
    }).addTo(map).bindPopup('<b>Radius Kantor</b><br>Batas absensi');
    
    // Fit bounds to show both
    var group = new L.featureGroup([
      L.circle([${latitude}, ${longitude}], {radius: ${accuracy}}),
      L.circle([${officeLat}, ${officeLon}], {radius: ${officeRadius}})
    ]);
    map.fitBounds(group.getBounds().pad(0.2));
    ` : ''}
  </script>
</body>
</html>
`;

export default function MapsLocationScreen() {
  const { user } = useAuth();
  const officeLokasi = user?.lokasi;

  const params = useLocalSearchParams();
  const type = params.type as 'masuk' | 'pulang';
  const id = params.id as string;
  const keterangan = params.keterangan as string | undefined;
  const fotoKeterangan = params.foto_keterangan as string | undefined;

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses lokasi untuk melakukan absensi.');
        setLoading(false);
        return;
      }

      try {
        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(currentLocation);
      } catch (error) {
        Alert.alert('Error', 'Gagal mendapatkan lokasi. Pastikan GPS Anda aktif.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleContinue = () => {
    if (!location) {
      Alert.alert('Tunggu', 'Lokasi Anda belum ditemukan.');
      return;
    }

    if (officeLokasi && officeLokasi.latitude && officeLokasi.longitude && officeLokasi.radius > 0) {
      const distance = getDistance(
        location.coords.latitude, 
        location.coords.longitude, 
        officeLokasi.latitude, 
        officeLokasi.longitude
      );
      
      if (distance > officeLokasi.radius) {
         Alert.alert('Gagal Absen', `Lokasi Anda berada di luar radius kantor (${Math.round(distance)}m / ${officeLokasi.radius}m).`);
         return;
      }
    }

    router.replace({
      pathname: '/face-verification',
      params: {
        type,
        id,
        keterangan: keterangan || '',
        foto_keterangan: fotoKeterangan || '',
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Mencari lokasi Anda...</Text>
      </SafeAreaView>
    );
  }

  if (!location) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="location-outline" size={64} color="#94a3b8" />
        <Text style={styles.errorText}>Lokasi tidak dapat ditemukan.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verifikasi Lokasi</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.mapContainer}>
        <WebView
          style={styles.map}
          originWhitelist={['*']}
          source={{ html: getLeafletHTML(
            location.coords.latitude,
            location.coords.longitude,
            location.coords.accuracy || 10,
            officeLokasi?.latitude,
            officeLokasi?.longitude,
            officeLokasi?.radius
          )}}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scrollEnabled={false}
          bounces={false}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.infoText}>
          Pastikan lokasi pada peta sudah sesuai dengan keberadaan Anda saat ini.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Lanjut ke Verifikasi Wajah</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#cbd5e1',
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#f87171',
    marginTop: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    backgroundColor: '#000',
  },
  headerBack: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  footer: {
    backgroundColor: '#0f172a',
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  infoText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#0ea5e9',
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    backgroundColor: '#475569',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: 8,
  },
});
