import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView, Platform, StatusBar, Text, Image, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
  const { user, signOut, updateProfilePhoto } = useAuth();
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleSelectImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Kami memerlukan izin akses galeri untuk mengganti foto profil.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedAsset = result.assets[0];
        if (selectedAsset.base64) {
          setUpdatingPhoto(true);
          const base64Image = `data:image/jpeg;base64,${selectedAsset.base64}`;
          await updateProfilePhoto(base64Image);
          Alert.alert('Sukses', 'Foto profil berhasil diperbarui.');
        } else {
          Alert.alert('Error', 'Gagal memproses data gambar.');
        }
      }
    } catch (error: any) {
      Alert.alert('Gagal', error.message || 'Gagal mengganti foto profil.');
    } finally {
      setUpdatingPhoto(false);
    }
  };

  const MenuItem = ({ label, actionText, onPress, noBorder = false }: { label: string; actionText?: string; onPress?: () => void; noBorder?: boolean }) => (
    <TouchableOpacity 
      style={[styles.menuItem, !noBorder && styles.menuItemBorder]} 
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.menuLabel}>{label}</Text>
      {actionText && <Text style={styles.menuAction}>{actionText}</Text>}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        
        {/* Top Avatar Section */}
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={() => setIsModalVisible(true)}
            disabled={updatingPhoto}
          >
            {updatingPhoto ? (
              <ActivityIndicator color="#0ea5e9" size="large" />
            ) : user?.foto ? (
              <Image source={{ uri: user.foto }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={48} color="#94a3b8" />
            )}
          </TouchableOpacity>
          <Text style={styles.userName}>{user?.nama_lengkap || 'Pegawai Nasari'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'email@nasari.com'}</Text>
        </View>

        {/* Identitas Diri */}
        <SectionHeader title="Identitas Diri" />
        <View style={styles.sectionContainer}>
          <MenuItem 
            label="Foto profil" 
            actionText="Ganti Foto" 
            onPress={handleSelectImage} 
            noBorder 
          />
        </View>

        {/* Data Kepegawaian (Replaces Akun Collab-Coop) */}
        <SectionHeader title="Data Kepegawaian" />
        <View style={styles.sectionContainer}>
          <MenuItem label="Status Pegawai" actionText="Lihat" />
          <MenuItem label="Jabatan" actionText={user?.role ? user.role.toUpperCase() : 'Pegawai'} />
        </View>

        {/* Pengaturan Keamanan */}
        <SectionHeader title="Pengaturan Keamanan" />
        <View style={styles.sectionContainer}>
          <MenuItem label="Ganti pin" actionText="Ganti" />
          <MenuItem label="Ganti password" actionText="Ganti" noBorder />
        </View>

        {/* Tentang Aplikasi */}
        <SectionHeader title="Tentang Aplikasi" />
        <View style={styles.sectionContainer}>
          <MenuItem label="Versi aplikasi" actionText="1.0.0" />
          <MenuItem label="Keluar Aplikasi" actionText="Logout" onPress={signOut} noBorder />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal to Zoom/Enlarge Profile Picture */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalBackground}
          activeOpacity={1}
          onPress={() => setIsModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {user?.foto ? (
              <Image source={{ uri: user.foto }} style={styles.maximizedImage} resizeMode="contain" />
            ) : (
              <View style={styles.fallbackMaximized}>
                <Ionicons name="person" size={120} color="#94a3b8" />
              </View>
            )}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Ionicons name="close-circle" size={40} color="#fff" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 10,
    marginTop: 20,
    marginLeft: 4,
  },
  sectionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuLabel: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  menuAction: {
    fontSize: 15,
    color: '#ef4444', // Red color as requested by the image reference
    fontWeight: '500',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  maximizedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  fallbackMaximized: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: -50,
    right: 10,
  },
});
