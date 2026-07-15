import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams, Stack } from 'expo-router';
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
  const [faceError, setFaceError] = useState<string | null>(null);
  const errorAnim = useRef(new Animated.Value(0)).current;

  // Params extracted from router
  const type = params.type as 'masuk' | 'pulang';
  const id = params.id ? Number(params.id) : undefined;
  const latitude = Number(params.latitude);
  const longitude = Number(params.longitude);
  const accuracy = Number(params.accuracy);
  const keterangan = params.keterangan as string | undefined;
  const fotoKeterangan = params.foto_keterangan as string | undefined;

  // Animate error banner in/out
  useEffect(() => {
    if (faceError) {
      Animated.spring(errorAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        dismissError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [faceError]);

  const dismissError = () => {
    Animated.timing(errorAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setFaceError(null));
  };

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
    setFaceError(null);
    try {
      // Capture the picture with base64 enabled
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.5, // Compress to save bandwidth
      });

      const base64Image = `data:image/jpeg;base64,${photo.base64}`;

      // Prepare payload based on whether it is Masuk or Pulang
      const payload: any = {
        status: 'Hadir',
        latitude: latitude,
        longitude: longitude,
        akurasi: accuracy,
      };

      if (type === 'pulang' && id) {
        payload.id = id;
        payload.absensi_pulang = new Date().toISOString();
        payload.foto_pulang = base64Image;
        payload.latitude_pulang = latitude;
        payload.longitude_pulang = longitude;
        payload.akurasi_pulang = accuracy;
        if (keterangan) {
          payload.keterangan = keterangan;
        }
      } else {
        payload.absensi_masuk = new Date().toISOString();
        payload.foto_masuk = base64Image;
        payload.latitude_masuk = latitude;
        payload.longitude_masuk = longitude;
        payload.akurasi_masuk = accuracy;
        if (keterangan) {
          payload.keterangan = keterangan;
        }
        if (fotoKeterangan) {
          payload.foto_keterangan = fotoKeterangan;
        }
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
          // If API fails
          console.log('API Error:', apiError);
          const errorMessage = apiError.response?.data?.error || 'Koneksi server bermasalah. Silakan coba lagi nanti.';
          
          // Check if it's a face detection error — show inline warning instead of alert
          const isFaceError = errorMessage.toLowerCase().includes('wajah tidak terdeteksi');
          if (isFaceError) {
            setFaceError(errorMessage);
          } else {
            // await savePendingAbsensi(payload); // Offline sync disabled
            Alert.alert('Gagal', errorMessage);
          }
        }
      } else {
        // Device is completely offline
        // await savePendingAbsensi(payload); // Offline sync disabled
        Alert.alert(
          'Mode Offline', 
          `Sinyal internet tidak tersedia. Pastikan Anda terhubung ke internet dan coba lagi.`
        );
      }
      
    } catch (error: any) {
      console.log('Failed to capture or save absensi', error);
      Alert.alert('Gagal', 'Terjadi kesalahan pada kamera atau penyimpanan lokal.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
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
          {/* Face detection error banner */}
          {faceError && (
            <Animated.View style={[
              styles.errorBanner,
              {
                opacity: errorAnim,
                transform: [{ translateY: errorAnim.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] }) }],
              }
            ]}>
              <View style={styles.errorIconContainer}>
                <Ionicons name="warning" size={24} color="#fbbf24" />
              </View>
              <View style={styles.errorTextContainer}>
                <Text style={styles.errorTitle}>Wajah Tidak Terdeteksi</Text>
                <Text style={styles.errorMessage}>Pastikan wajah Anda terlihat jelas di dalam bingkai, lalu foto ulang.</Text>
              </View>
              <TouchableOpacity onPress={dismissError} style={styles.errorDismiss}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          )}

          <View style={[styles.frame, faceError ? styles.frameError : null]}>
            {/* Corner markers for facial frame */}
            <View style={[styles.corner, styles.topLeft, faceError ? styles.cornerError : null]} />
            <View style={[styles.corner, styles.topRight, faceError ? styles.cornerError : null]} />
            <View style={[styles.corner, styles.bottomLeft, faceError ? styles.cornerError : null]} />
            <View style={[styles.corner, styles.bottomRight, faceError ? styles.cornerError : null]} />
          </View>
          <Text style={[styles.instructions, faceError ? styles.instructionsError : null]}>
            {faceError ? 'Arahkan wajah ke kamera, lalu foto ulang' : 'Posisikan wajah Anda di dalam kotak'}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.captureButton, faceError ? styles.captureButtonRetry : null]} 
          onPress={handleCapture}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="large" color="#0ea5e9" />
          ) : faceError ? (
            <Ionicons name="refresh" size={36} color="#f43f5e" />
          ) : (
            <View style={styles.captureInner} />
          )}
        </TouchableOpacity>
        {faceError && (
          <Text style={styles.retryHint}>Ketuk untuk foto ulang</Text>
        )}
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
  // Error banner styles
  errorBanner: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(127, 29, 29, 0.92)',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  errorIconContainer: {
    marginRight: 12,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorTitle: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  errorMessage: {
    color: '#fecaca',
    fontSize: 12,
    lineHeight: 16,
  },
  errorDismiss: {
    padding: 4,
    marginLeft: 8,
  },
  frame: {
    width: 250,
    height: 300,
    borderWidth: 0,
    position: 'relative',
    marginBottom: 20,
  },
  frameError: {
    // Visual indicator when face not detected
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#38bdf8',
  },
  cornerError: {
    borderColor: '#f43f5e',
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
  instructionsError: {
    backgroundColor: 'rgba(244, 63, 94, 0.8)',
    fontWeight: 'bold',
  },
  controls: {
    height: 140,
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
  captureButtonRetry: {
    borderWidth: 3,
    borderColor: '#f43f5e',
  },
  captureInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e2e8f0',
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  retryHint: {
    color: '#f43f5e',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
});
