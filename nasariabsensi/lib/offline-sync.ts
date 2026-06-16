import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { absensiService } from './api';

const PENDING_ABSENSI_KEY = 'pending_absensi_queue';

export interface PendingAbsensi {
  id: string; // Unique ID for the offline queue
  data: any; // The payload normally sent to submitAbsensi
  timestamp: number; // When it was saved locally
  fotoFileUri?: string; // URI of the base64 photo saved as a file
  fotoKey?: string; // The key (either 'foto_masuk' or 'foto_pulang') so we know where to put it back
}

/**
 * Simpan data absensi ke antrean lokal (karena offline/gagal kirim)
 */
export const savePendingAbsensi = async (data: any) => {
  try {
    let fotoUri = undefined;
    let payloadToSave = { ...data };

    let fotoKeyToRestore = undefined;

    // Jika payload mengandung base64 image (foto), kita simpan base64 tersebut sebagai file terpisah.
    if (data.foto_masuk || data.foto_pulang) {
      const filename = `offline_foto_${Date.now()}.txt`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      const fotoKey = data.foto_masuk ? 'foto_masuk' : 'foto_pulang';
      const base64Data = data[fotoKey];

      // Simpan teks base64 ke file system lokal
      await FileSystem.writeAsStringAsync(fileUri, base64Data);
      
      // Hapus data base64 dari payload AsyncStorage agar ukurannya sangat kecil
      delete payloadToSave[fotoKey];
      fotoUri = fileUri;
      fotoKeyToRestore = fotoKey;
    }

    const currentQueue = await getPendingAbsensi();
    const newEntry: PendingAbsensi = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      data: payloadToSave,
      timestamp: Date.now(),
      fotoFileUri: fotoUri,
      fotoKey: fotoKeyToRestore,
    };
    
    const updatedQueue = [...currentQueue, newEntry];
    await AsyncStorage.setItem(PENDING_ABSENSI_KEY, JSON.stringify(updatedQueue));
    return newEntry.id;
  } catch (error) {
    console.error('Failed to save pending absensi:', error);
    throw error;
  }
};

/**
 * Ambil semua data absensi yang sedang menunggu disinkronisasi
 */
export const getPendingAbsensi = async (): Promise<PendingAbsensi[]> => {
  try {
    const queueStr = await AsyncStorage.getItem(PENDING_ABSENSI_KEY);
    if (queueStr) {
      return JSON.parse(queueStr) as PendingAbsensi[];
    }
    return [];
  } catch (error) {
    console.error('Failed to get pending absensi (Corrupted data due to CursorWindow limits, clearing queue):', error);
    // Auto-recovery: Jika terjadi error CursorWindow 2MB, bersihkan queue yang korup tersebut
    await AsyncStorage.removeItem(PENDING_ABSENSI_KEY).catch(() => {});
    return [];
  }
};

/**
 * Hapus absensi dari antrean (biasanya dipanggil setelah sukses sinkronisasi)
 */
export const removePendingAbsensi = async (id: string, fileUri?: string) => {
  try {
    const currentQueue = await getPendingAbsensi();
    const updatedQueue = currentQueue.filter(item => item.id !== id);
    await AsyncStorage.setItem(PENDING_ABSENSI_KEY, JSON.stringify(updatedQueue));

    // Bersihkan file foto dari storage lokal jika ada
    if (fileUri) {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(fileUri);
      }
    }
  } catch (error) {
    console.error('Failed to remove pending absensi:', error);
  }
};

/**
 * Sinkronisasi semua data antrean lokal ke Server
 * Mengembalikan jumlah data yang berhasil disinkronkan.
 */
export const syncPendingAbsensi = async (): Promise<number> => {
  const queue = await getPendingAbsensi();
  if (queue.length === 0) return 0;

  let successCount = 0;

  for (const item of queue) {
    try {
      let payloadToSync = { ...item.data };
      
      // Jika foto disimpan sebagai file terpisah, baca isi file-nya (base64) dan masukkan kembali ke payload
      if (item.fotoFileUri && item.fotoKey) {
        const fileInfo = await FileSystem.getInfoAsync(item.fotoFileUri);
        if (fileInfo.exists) {
          const base64Foto = await FileSystem.readAsStringAsync(item.fotoFileUri);
          payloadToSync[item.fotoKey] = base64Foto;
        }
      }

      // Coba kirim data ke backend
      await absensiService.submitAbsensi(payloadToSync);
      
      // Jika berhasil tanpa error, hapus dari antrean dan bersihkan cache file
      await removePendingAbsensi(item.id, item.fotoFileUri);
      successCount++;
    } catch (error) {
      console.error(`Failed to sync absensi ${item.id}:`, error);
      // Jika error, biarkan di antrean untuk dicoba lagi nanti
    }
  }

  return successCount;
};
