import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Modal, FlatList, Image, Alert } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const LEAVE_TYPES = [
  { id: 'S', title: 'Sakit' },
  { id: 'I', title: 'Ijin' },
  { id: 'A', title: 'Alpha' },
  { id: 'DL', title: 'Dinas Luar' },
  { id: 'CT', title: 'Cuti Tahunan' },
  { id: 'CB', title: 'Cuti Bersalin (Melahirkan)' },
  { id: 'CK', title: 'Cuti Karena Alasan Penting' },
  { id: 'CD', title: 'Cuti Diluar Tanggungan Perusahaan' },
];

export default function IjinScreen() {
  const [selectedType, setSelectedType] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [keterangan, setKeterangan] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Cek apakah tipe ijin saat ini membutuhkan form upload foto
  const needsPhoto = selectedType && ['S', 'DL', 'CK'].includes(selectedType.id);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };
  
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Aplikasi butuh izin kamera untuk mengambil foto bukti.');
      return;
    }
    
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handlePhotoSelection = () => {
    Alert.alert(
      "Upload Bukti",
      "Pilih sumber foto bukti",
      [
        { text: "Batal", style: "cancel" },
        { text: "Kamera", onPress: takePhoto },
        { text: "Galeri", onPress: pickImage }
      ]
    );
  };

  const submitForm = () => {
    if (!selectedType) {
      Alert.alert('Error', 'Pilih jenis ijin/cuti terlebih dahulu.');
      return;
    }
    if (!keterangan.trim()) {
      Alert.alert('Error', 'Keterangan wajib diisi.');
      return;
    }
    if (needsPhoto && !photoUri) {
      Alert.alert('Error', 'Foto bukti wajib diupload untuk jenis ijin ini.');
      return;
    }

    // TODO: Connect to backend API when ready
    Alert.alert('Sukses', 'Pengajuan berhasil disubmit (Mode Dummy).', [
      { text: 'OK', onPress: () => {
        setSelectedType(null);
        setKeterangan('');
        setPhotoUri(null);
      }}
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pengajuan Ijin</Text>
      </View>
      
      <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Dropdown Selection */}
        <Text style={styles.label}>Kategori Pengajuan</Text>
        <TouchableOpacity 
          style={styles.dropdownButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.dropdownText, !selectedType && { color: '#64748b' }]}>
            {selectedType ? `${selectedType.id} - ${selectedType.title}` : 'Pilih kategori (Sakit, Ijin, dll)...'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#94a3b8" />
        </TouchableOpacity>

        {/* Dynamic Fields */}
        {selectedType && (
          <View style={styles.dynamicSection}>
            <Text style={styles.label}>Keterangan</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Jelaskan alasan secara detail..."
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={4}
              value={keterangan}
              onChangeText={setKeterangan}
              textAlignVertical="top"
            />

            {needsPhoto && (
              <View style={styles.uploadSection}>
                <Text style={styles.label}>
                  Upload Bukti 
                  {selectedType.id === 'S' && ' (Surat Dokter)'}
                  {(selectedType.id === 'DL' || selectedType.id === 'CK') && ' (Foto/Dokumen)'}
                </Text>
                
                {photoUri ? (
                  <View style={styles.photoPreviewContainer}>
                    <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                    <TouchableOpacity style={styles.removePhotoButton} onPress={() => setPhotoUri(null)}>
                      <Ionicons name="close-circle" size={32} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.uploadButton} onPress={handlePhotoSelection} activeOpacity={0.7}>
                    <Ionicons name="cloud-upload-outline" size={40} color="#0ea5e9" />
                    <Text style={styles.uploadButtonText}>Pilih dari Galeri atau Kamera</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.submitButton} onPress={submitForm} activeOpacity={0.8}>
              <Text style={styles.submitButtonText}>Kirim Pengajuan</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Custom Modal for Dropdown */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Kategori</Text>
            </View>
            <FlatList
              data={LEAVE_TYPES}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.modalItem, selectedType?.id === item.id && styles.modalItemSelected]}
                  onPress={() => {
                    setSelectedType(item);
                    setModalVisible(false);
                  }}
                >
                  <View style={styles.modalItemBadge}>
                    <Text style={styles.modalItemBadgeText}>{item.id}</Text>
                  </View>
                  <Text style={[styles.modalItemText, selectedType?.id === item.id && { color: '#0ea5e9', fontWeight: 'bold' }]}>
                    {item.title}
                  </Text>
                  {selectedType?.id === item.id && <Ionicons name="checkmark" size={24} color="#0ea5e9" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: '#0f172a' },
  title: { color: "white", fontSize: 24, fontWeight: 'bold' },
  formContainer: { padding: 24 },
  label: { color: '#e2e8f0', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 12, padding: 16, marginBottom: 24 },
  dropdownText: { color: '#fff', fontSize: 16 },
  dynamicSection: { marginTop: 8 },
  textInput: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, minHeight: 120, marginBottom: 24 },
  uploadSection: { marginBottom: 24 },
  uploadButton: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed', borderRadius: 12, padding: 32, alignItems: 'center', justifyContent: 'center' },
  uploadButtonText: { color: '#0ea5e9', marginTop: 16, fontSize: 16, fontWeight: 'bold' },
  photoPreviewContainer: { position: 'relative', width: '100%', height: 250, borderRadius: 12, overflow: 'hidden' },
  photoPreview: { width: '100%', height: '100%', backgroundColor: '#1e293b' },
  removePhotoButton: { position: 'absolute', top: 12, right: 12, backgroundColor: '#1e293b', borderRadius: 16 },
  submitButton: { backgroundColor: '#0ea5e9', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#1e293b', width: '100%', maxHeight: '80%', borderRadius: 16, overflow: 'hidden' },
  modalHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#334155' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#334155' },
  modalItemSelected: { backgroundColor: '#0f172a' },
  modalItemBadge: { backgroundColor: '#334155', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  modalItemBadgeText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  modalItemText: { flex: 1, color: '#cbd5e1', fontSize: 16 },
});
