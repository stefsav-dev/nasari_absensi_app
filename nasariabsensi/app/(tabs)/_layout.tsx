import { Tabs, router } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { syncPendingAbsensi } from '@/lib/offline-sync';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Listen for network state changes
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      // Offline sync disabled for now
      /*
      if (state.isConnected) {
        // We are online, try to sync
        const syncedCount = await syncPendingAbsensi();
        if (syncedCount > 0) {
          Alert.alert(
            'Sinkronisasi Sukses',
            `${syncedCount} data absensi yang tertunda telah berhasil diunggah ke server.`
          );
        }
      }
      */
    });

    return () => unsubscribe();
  }, []);
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            backgroundColor: '#0f172a',
            borderTopWidth: 0,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Absensi',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'Riwayat',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="clock.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="ijin"
          options={{
            title: 'Ijin',
            tabBarIcon: ({ color }) => <Ionicons name="document-text" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
          }}
        />
      </Tabs>

      {/* Floating Camera Button */}
      {/* <View style={styles.fabContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => {
            Alert.alert(
              'Pilih Jenis Absen',
              'Silakan pilih jenis absensi yang ingin Anda lakukan:',
              [
                { text: 'Batal', style: 'cancel' },
                {
                  text: 'Absen Masuk',
                  onPress: () => router.push({ pathname: '/maps-location', params: { type: 'masuk' } }),
                },
                {
                  text: 'Absen Pulang',
                  onPress: () => router.push({ pathname: '/maps-location', params: { type: 'pulang' } }),
                },
              ],
              { cancelable: true }
            );
          }}
        >
          <Ionicons name="camera" size={32} color="#fff" />
        </TouchableOpacity>
      </View> */}
    </View>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 45 : 20, // Adjust to float slightly above the tab bar
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#0f172a', // Matches tab bar color to create cutout effect
  },
});
