import React, { useState, useRef, useEffect } from 'react';
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
  Image,
  Linking,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface FaceCaptureProps {
  visible: boolean;
  onClose: () => void;
  onCaptureComplete: (photoUri: string) => void;
  actionType: 'in' | 'out';
}

export default function FaceCapture({ visible, onClose, onCaptureComplete, actionType }: FaceCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (visible && !permission) {
      requestPermission();
    }
  }, [visible]);

  // Cek apakah kamera tersedia
  const checkCameraAvailability = async () => {
    try {
      const { status } = await CameraView.getCameraPermissionsAsync();
      if (status !== 'granted') {
        showCameraPermissionAlert();
        return false;
      }
      return true;
    } catch (error) {
      console.error('Camera check error:', error);
      return false;
    }
  };

  // Tampilkan alert untuk meminta izin kamera
  const showCameraPermissionAlert = () => {
    Alert.alert(
      '⚠️ Akses Kamera Diperlukan',
      'Aplikasi memerlukan akses kamera untuk mengambil foto selfie sebagai verifikasi absensi.\n\nPastikan kamera dalam kondisi baik dan tidak digunakan oleh aplikasi lain.',
      [
        { text: 'Batal', style: 'cancel', onPress: onClose },
        { 
          text: 'Buka Pengaturan', 
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          }
        },
        { text: 'Coba Lagi', onPress: () => requestPermission() }
      ]
    );
  };

  // Tampilkan peringatan kamera tidak siap
  const showCameraNotReadyAlert = () => {
    Alert.alert(
      '📷 Kamera Tidak Siap',
      'Pastikan:\n\n✓ Kamera tidak digunakan oleh aplikasi lain\n✓ Izin kamera sudah diberikan\n✓ Kamera dalam kondisi berfungsi normal\n\nJika masalah berlanjut, coba restart aplikasi.',
      [
        { text: 'Tutup', style: 'cancel', onPress: onClose },
        { text: 'Coba Lagi', onPress: () => setCameraReady(true) }
      ]
    );
  };

  // Tampilkan peringatan pencahayaan kurang
  const showLowLightWarning = () => {
    Alert.alert(
      '💡 Pencahayaan Kurang',
      'Kondisi pencahayaan kurang baik. Pastikan:\n\n✓ Wajah Anda terkena cahaya yang cukup\n✓ Hindari cahaya dari belakang (backlight)\n✓ Gunakan lampu jika diperlukan\n\nFoto dengan pencahayaan kurang mungkin tidak valid.',
      [{ text: 'Mengerti', style: 'default' }]
    );
  };

  const takePicture = async () => {
    if (cameraRef.current && cameraReady && !capturing) {
      setCapturing(true);
      try {
        // Cek ketersediaan kamera sebelum mengambil foto
        const isCameraAvailable = await checkCameraAvailability();
        if (!isCameraAvailable) {
          showCameraPermissionAlert();
          setCapturing(false);
          return;
        }

        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
          exif: true, // Dapatkan info EXIF termasuk kondisi pencahayaan
        });
        
        if (photo && photo.uri) {
          // Cek kualitas foto (sederhana)
          if (photo.base64 && photo.base64.length < 10000) {
            // Jika ukuran foto terlalu kecil, mungkin terlalu gelap
            Alert.alert(
              '⚠️ Peringatan Kualitas Foto',
              'Foto yang diambil terlihat kurang jelas. Pastikan pencahayaan cukup dan wajah terlihat jelas.',
              [
                { text: 'Foto Ulang', onPress: () => setCapturing(false) },
                { text: 'Tetap Gunakan', onPress: () => {
                  setCapturedImage(photo.uri);
                  setPreviewVisible(true);
                }}
              ]
            );
          } else {
            setCapturedImage(photo.uri);
            setPreviewVisible(true);
          }
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert(
          'Error',
          'Gagal mengambil foto.\n\nKemungkinan penyebab:\n• Kamera sedang digunakan aplikasi lain\n• Izin kamera dicabut\n• Kamera bermasalah',
          [
            { text: 'Tutup', style: 'cancel' },
            { text: 'Coba Lagi', onPress: () => setCameraReady(true) }
          ]
        );
      } finally {
        setCapturing(false);
      }
    } else if (!cameraReady) {
      showCameraNotReadyAlert();
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setPreviewVisible(false);
  };

  const confirmPhoto = async () => {
    if (capturedImage) {
      try {
        onCaptureComplete(capturedImage);
        setCapturedImage(null);
        setPreviewVisible(false);
        onClose();
      } catch (error) {
        console.error('Error saving photo:', error);
        Alert.alert('Error', 'Gagal menyimpan foto. Silakan coba lagi.');
      }
    }
  };

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Meminta izin kamera...</Text>
          <Text style={styles.loadingSubText}>Mohon tunggu sebentar</Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={styles.errorContainer}>
          <Ionicons name="camera-off" size={80} color="#F44336" />
          <Text style={styles.errorText}>Akses Kamera Ditutup</Text>
          <Text style={styles.errorSubText}>
            Aplikasi memerlukan akses kamera untuk mengambil foto selfie sebagai verifikasi absensi.
          </Text>
          <View style={styles.errorInstructions}>
            <Text style={styles.instructionTitle}>📱 Cara Mengaktifkan Kamera:</Text>
            <Text style={styles.instructionItem}>1. Buka Pengaturan HP Anda</Text>
            <Text style={styles.instructionItem}>2. Cari "Aplikasi" atau "Apps"</Text>
            <Text style={styles.instructionItem}>3. Cari "absensiapp"</Text>
            <Text style={styles.instructionItem}>4. Pilih "Izin" atau "Permissions"</Text>
            <Text style={styles.instructionItem}>5. Aktifkan izin "Kamera"</Text>
          </View>
          <View style={styles.errorButtonGroup}>
            <TouchableOpacity style={styles.permissionCloseButton} onPress={onClose}>
              <Text style={styles.permissionCloseButtonText}>Tutup</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.permissionSettingsButton} onPress={() => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}>
              <Text style={styles.permissionSettingsButtonText}>Buka Pengaturan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {actionType === 'in' ? 'Verifikasi Wajah - Check In' : 'Verifikasi Wajah - Check Out'}
          </Text>
          <TouchableOpacity 
            onPress={() => Alert.alert(
              'Info Kamera',
              'Pastikan wajah Anda berada di dalam bingkai dan pencahayaan cukup.\n\nTips:\n• Hadapkan wajah ke kamera\n• Pastikan pencahayaan cukup\n• Jangan gunakan topi atau masker\n• Jaga jarak yang sesuai'
            )} 
            style={styles.infoButton}
          >
            <Ionicons name="help-circle" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {!previewVisible ? (
          <>
            <View style={styles.cameraContainer}>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="front"
                onCameraReady={() => setCameraReady(true)}
                onMountError={(error) => {
                  console.error('Camera mount error:', error);
                  Alert.alert('Error Kamera', 'Gagal mengaktifkan kamera. Pastikan tidak ada aplikasi lain yang menggunakan kamera.');
                }}
              />
              <View style={styles.overlay}>
                <View style={styles.faceFrame}>
                  <View style={styles.faceFrameCornerTL} />
                  <View style={styles.faceFrameCornerTR} />
                  <View style={styles.faceFrameCornerBL} />
                  <View style={styles.faceFrameCornerBR} />
                </View>
              </View>
              {!cameraReady && (
                <View style={styles.cameraLoadingOverlay}>
                  <ActivityIndicator size="large" color="#4A90E2" />
                  <Text style={styles.cameraLoadingText}>Mengaktifkan kamera...</Text>
                </View>
              )}
            </View>

            <View style={styles.instructionContainer}>
              <Ionicons name="information-circle" size={24} color="#4A90E2" />
              <Text style={styles.instructionText}>
                Posisikan wajah Anda di dalam bingkai
              </Text>
            </View>

            <View style={styles.tipsContainer}>
              <Ionicons name="bulb-outline" size={16} color="#FFC107" />
              <Text style={styles.tipsText}>Pastikan pencahayaan cukup dan wajah terlihat jelas</Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.captureButton} onPress={takePicture} disabled={!cameraReady || capturing}>
                {capturing ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : (
                  <View style={styles.captureButtonInner} />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.noteText}>
              Pastikan wajah Anda terlihat jelas dan tidak tertutup
            </Text>
          </>
        ) : (
          <>
            <View style={styles.previewContainer}>
              {capturedImage && (
                <>
                  <Image source={{ uri: capturedImage }} style={styles.previewImage} />
                  <View style={styles.previewOverlay}>
                    <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
                    <Text style={styles.previewSuccessText}>Foto Berhasil!</Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.previewButtonContainer}>
              <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
                <Ionicons name="refresh" size={24} color="#4A90E2" />
                <Text style={styles.retakeButtonText}>Foto Ulang</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={confirmPhoto}>
                <Ionicons name="checkmark" size={24} color="#fff" />
                <Text style={styles.confirmButtonText}>Konfirmasi</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 40,
    paddingBottom: 16,
    backgroundColor: '#000',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  infoButton: {
    padding: 8,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#fff',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceFrame: {
    width: width * 0.7,
    height: width * 0.7,
    position: 'relative',
  },
  faceFrameCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#4A90E2',
  },
  faceFrameCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#4A90E2',
  },
  faceFrameCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#4A90E2',
  },
  faceFrameCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#4A90E2',
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#fff',
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,193,7,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 20,
  },
  tipsText: {
    fontSize: 12,
    color: '#FFC107',
  },
  buttonContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  noteText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    paddingBottom: 20,
    backgroundColor: '#000',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    position: 'relative',
  },
  previewImage: {
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  previewOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
    borderRadius: 20,
  },
  previewSuccessText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 8,
  },
  previewButtonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 30,
    gap: 16,
    backgroundColor: '#000',
  },
  retakeButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
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
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F44336',
  },
  errorSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  errorInstructions: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  instructionItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  errorButtonGroup: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  permissionCloseButton: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
  },
  permissionCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  permissionSettingsButton: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    alignItems: 'center',
  },
  permissionSettingsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});