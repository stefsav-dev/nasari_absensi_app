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
  onCaptureComplete: (photoUri: string, photoBase64?: string) => boolean | void | Promise<boolean | void>;
  actionType: 'in' | 'out';
}

export default function FaceCapture({ visible, onClose, onCaptureComplete, actionType }: FaceCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const hasRequestedPermissionRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      hasRequestedPermissionRef.current = false;
      setRequestingPermission(false);
      return;
    }

    if (permission?.granted || hasRequestedPermissionRef.current) {
      return;
    }

    const requestCameraAccess = async () => {
      hasRequestedPermissionRef.current = true;
      setRequestingPermission(true);
      const result = await requestPermission();
      setRequestingPermission(false);

      if (!result.granted) {
        // Tutup modal terlebih dahulu, lalu tampilkan alert native
        // seperti cara Google Maps meminta izin lokasi
        onClose();
        setTimeout(() => {
          Alert.alert(
            'Izinkan Akses Kamera',
            'Aplikasi Absensi memerlukan akses kamera untuk mengambil foto selfie sebagai verifikasi kehadiran.\n\nSilakan izinkan akses kamera melalui Pengaturan.',
            [
              { text: 'Batal', style: 'cancel' },
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
            ]
          );
        }, 300);
      }
    };

    requestCameraAccess();
  }, [visible, permission?.granted, requestPermission, onClose]);

  // Cek apakah kamera tersedia
  const checkCameraAvailability = async () => {
    try {
      const { status } = await CameraView.getCameraPermissionsAsync();
      if (status !== 'granted') {
        return false;
      }
      return true;
    } catch (error) {
      console.error('Camera check error:', error);
      return false;
    }
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



  const takePicture = async () => {
    if (cameraRef.current && cameraReady && !capturing) {
      setCapturing(true);
      try {
        // Cek ketersediaan kamera sebelum mengambil foto
        const isCameraAvailable = await checkCameraAvailability();
        if (!isCameraAvailable) {
          setCapturing(false);
          return;
        }

        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.35,
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
                  setCapturedImageBase64(photo.base64 || null);
                  setPreviewVisible(true);
                }}
              ]
            );
          } else {
            setCapturedImage(photo.uri);
            setCapturedImageBase64(photo.base64 || null);
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
    setCapturedImageBase64(null);
    setPreviewVisible(false);
  };

  const confirmPhoto = async () => {
    if (capturedImage && !submitting) {
      setSubmitting(true);
      try {
        const isSaved = await onCaptureComplete(capturedImage, capturedImageBase64 || undefined);
        if (isSaved === false) {
          setSubmitting(false);
          return;
        }
        setCapturedImage(null);
        setCapturedImageBase64(null);
        setPreviewVisible(false);
        setSubmitting(false);
        onClose();
      } catch (error) {
        console.error('Error saving photo:', error);
        setSubmitting(false);
        Alert.alert('Error', 'Gagal menyimpan foto. Silakan coba lagi.');
      }
    }
  };

  if (!permission || requestingPermission || !permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Meminta izin kamera...</Text>
          <Text style={styles.loadingSubText}>Izinkan akses kamera untuk mengambil selfie</Text>
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
              <TouchableOpacity style={[styles.retakeButton, submitting && { opacity: 0.5 }]} onPress={retakePhoto} disabled={submitting}>
                <Ionicons name="refresh" size={24} color="#4A90E2" />
                <Text style={styles.retakeButtonText}>Foto Ulang</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmButton, submitting && { opacity: 0.7 }]} onPress={confirmPhoto} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="checkmark" size={24} color="#fff" />
                )}
                <Text style={styles.confirmButtonText}>{submitting ? 'Menyimpan...' : 'Konfirmasi'}</Text>
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

});
