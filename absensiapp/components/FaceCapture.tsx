// components/FaceCapture.tsx
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
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';

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

  const takePicture = async () => {
    if (cameraRef.current && cameraReady && !capturing) {
      setCapturing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
        });
        
        if (photo && photo.uri) {
          setCapturedImage(photo.uri);
          setPreviewVisible(true);
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Gagal mengambil foto. Silakan coba lagi.');
      } finally {
        setCapturing(false);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setPreviewVisible(false);
  };

  const confirmPhoto = async () => {
    if (capturedImage) {
      try {
        const fileName = `selfie_${Date.now()}.jpg`;
        const newPath = `${FileSystem.documentDirectory}${fileName}`;
        
        // Menggunakan API baru untuk copy file
        await FileSystem.copyAsync({
          from: capturedImage,
          to: newPath,
        });
        
        onCaptureComplete(newPath);
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
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={styles.errorContainer}>
          <Ionicons name="camera-off" size={60} color="#F44336" />
          <Text style={styles.errorText}>Akses kamera ditolak</Text>
          <Text style={styles.errorSubText}>Harap berikan izin kamera di pengaturan untuk melanjutkan</Text>
          <TouchableOpacity style={styles.permissionCloseButton} onPress={onClose}>
            <Text style={styles.permissionCloseButtonText}>Tutup</Text>
          </TouchableOpacity>
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
          <View style={{ width: 40 }} />
        </View>

        {!previewVisible ? (
          <>
            <View style={styles.cameraContainer}>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="front"
                onCameraReady={() => setCameraReady(true)}
              />
              <View style={styles.overlay}>
                <View style={styles.faceFrame}>
                  <View style={styles.faceFrameCornerTL} />
                  <View style={styles.faceFrameCornerTR} />
                  <View style={styles.faceFrameCornerBL} />
                  <View style={styles.faceFrameCornerBR} />
                </View>
              </View>
            </View>

            <View style={styles.instructionContainer}>
              <Ionicons name="information-circle" size={24} color="#4A90E2" />
              <Text style={styles.instructionText}>
                Posisikan wajah Anda di dalam bingkai
              </Text>
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
              Pastikan wajah Anda terlihat jelas dan pencahayaan cukup
            </Text>
          </>
        ) : (
          <>
            <View style={styles.previewContainer}>
              <View style={styles.previewPlaceholder}>
                <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
                <Text style={styles.previewText}>Foto berhasil diambil</Text>
                <Text style={styles.previewSubText}>Silakan konfirmasi untuk melanjutkan</Text>
              </View>
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
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
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
  },
  previewPlaceholder: {
    alignItems: 'center',
    gap: 16,
  },
  previewText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  previewSubText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.7,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
  },
  errorSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionCloseButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
  },
  permissionCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});