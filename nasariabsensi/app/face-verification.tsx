import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { absensiService } from '@/lib/api';
import { cancelLateNotification, cancelPulangNotification } from '@/lib/notifications';

import NetInfo from '@react-native-community/netinfo';
import { savePendingAbsensi } from '@/lib/offline-sync';

export default function FaceVerificationScreen() {
  const params = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Params extracted from router
  const type = params.type as 'masuk' | 'pulang';
  const id = params.id ? Number(params.id) : undefined;
  const latitude = Number(params.latitude);
  const longitude = Number(params.longitude);
  const accuracy = Number(params.accuracy);

  if (!permission) {
    // Camera permissions are still loading.
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#94a3b8" />
          <Text style={styles.permissionText}>Kami membutuhkan akses kamera untuk melakukan verifikasi wajah.</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Berikan Izin Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;

    setIsProcessing(true);
    try {
      // Capture the picture with base64 enabled
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.5, // Compress to save bandwidth
      });

      const base64Image = `data:image/jpeg;base64,${photo.base64}`;

      // Prepare payload based on whether it is Masuk or Pulang
      const payload: any = {
        status: 'hadir',
        latitude: latitude,
        longitude: longitude,
        akurasi: accuracy,
      };

      if (type === 'pulang' && id) {
        payload.id = id;
        payload.foto_pulang = base64Image;
        payload.latitude_pulang = latitude;
        payload.longitude_pulang = longitude;
        payload.akurasi_pulang = accuracy;
      } else {
        payload.foto_masuk = base64Image;
        payload.latitude_masuk = latitude;
        payload.longitude_masuk = longitude;
        payload.akurasi_masuk = accuracy;
      }

      // Check network status
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.isConnected) {
        try {
          // Submit data to backend
          await absensiService.submitAbsensi(payload);

          // Cancel the respective notification
          if (type === 'masuk') {
            await cancelLateNotification();
          } else if (type === 'pulang') {
            await cancelPulangNotification();
          }

          Alert.alert('Sukses', `Absensi ${type} berhasil dicatat!`, [
            { text: 'OK', onPress: () => router.replace('/(tabs)') }
          ]);
        } catch (apiError: any) {
          // If API fails (timeout/500/offline fallback), save it locally
          console.error('API Error, saving offline:', apiError);
          await savePendingAbsensi(payload);
          Alert.alert(
            'Disimpan Lokal', 
            `Koneksi server bermasalah. Absensi ${type} disimpan di HP Anda dan akan dikirim otomatis nanti.`, 
            [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
          );
        }
      } else {
        // Device is completely offline
        await savePendingAbsensi(payload);
        Alert.alert(
          'Mode Offline', 
          `Sinyal internet tidak tersedia. Absensi ${type} telah disimpan secara lokal dan akan diunggah otomatis saat Anda kembali online.`, 
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
      }
      
    } catch (error: any) {
      console.error('Failed to capture or save absensi', error);
      Alert.alert('Gagal', 'Terjadi kesalahan pada kamera atau penyimpanan lokal.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} disabled={isProcessing}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verifikasi Wajah</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="front"
        />
        <View style={[StyleSheet.absoluteFillObject, styles.overlay]}>
          <View style={styles.frame}>
            {/* Corner markers for facial frame */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.instructions}>
            Posisikan wajah Anda di dalam kotak
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.captureButton} 
          onPress={handleCapture}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="large" color="#0ea5e9" />
          ) : (
            <View style={styles.captureInner} />
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    backgroundColor: '#000',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  permissionText: {
    textAlign: 'center',
    color: '#cbd5e1',
    fontSize: 16,
    marginVertical: 24,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelButton: {
    backgroundColor: '#475569',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    width: 250,
    height: 300,
    borderWidth: 0,
    position: 'relative',
    marginBottom: 20,
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#38bdf8',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructions: {
    color: '#fff',
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  controls: {
    height: 120,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e2e8f0',
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
});
