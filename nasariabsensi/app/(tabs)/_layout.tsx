import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
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
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
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
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
