// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isLargeDevice = width > 428;

export default function TabsLayout() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Tabs
          screenOptions={{
            headerShown: true,
            headerStyle: {
              backgroundColor: '#4A90E2',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: isSmallDevice ? 18 : 20,
            },
            headerTitleAlign: 'center',
            headerShadowVisible: false,
            tabBarStyle: {
              backgroundColor: '#fff',
              borderTopWidth: 1,
              borderTopColor: '#e0e0e0',
              height: Platform.OS === 'ios' 
                ? (isSmallDevice ? 60 : 65) 
                : (isSmallDevice ? 55 : 60),
              paddingBottom: Platform.OS === 'ios' 
                ? (isSmallDevice ? 6 : 8) 
                : 4,
              paddingTop: isSmallDevice ? 4 : 6,
              marginHorizontal: isSmallDevice ? 12 : 16,
              marginBottom: Platform.OS === 'ios' 
                ? (isLargeDevice ? 20 : 16) 
                : 12,
              borderRadius: isSmallDevice ? 20 : 25,
              position: 'relative',
              bottom: 0,
              left: 0,
              right: 0,
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            },
            tabBarActiveTintColor: '#4A90E2',
            tabBarInactiveTintColor: '#999',
            tabBarLabelStyle: {
              fontSize: isSmallDevice ? 10 : 11,
              fontWeight: '500',
              marginBottom: Platform.OS === 'ios' ? 0 : 2,
            },
            tabBarIconStyle: {
              marginTop: Platform.OS === 'ios' 
                ? (isSmallDevice ? 2 : 4) 
                : 0,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              headerShown: false,
              title: 'Dashboard',
              tabBarLabel: 'Dashboard',
              tabBarIcon: ({ color, size, focused }) => (
                <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                  <Ionicons 
                    name={focused ? 'home' : 'home-outline'} 
                    size={isSmallDevice ? size - 4 : size - 2} 
                    color={color} 
                  />
                </View>
              ),
            }}
          />
          
          <Tabs.Screen
            name="absensi"
            options={{
              title: 'Absensi',
              tabBarLabel: 'Absensi',
              headerShown: true,
              tabBarIcon: ({ color, size, focused }) => (
                <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                  <Ionicons 
                    name={focused ? 'calendar' : 'calendar-outline'} 
                    size={isSmallDevice ? size - 4 : size - 2} 
                    color={color} 
                  />
                </View>
              ),
            }}
          />
          
          <Tabs.Screen
            name="riwayat"
            options={{
              title: 'Riwayat',
              tabBarLabel: 'Riwayat',
              headerShown: true,
              tabBarIcon: ({ color, size, focused }) => (
                <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                  <Ionicons 
                    name={focused ? 'time' : 'time-outline'} 
                    size={isSmallDevice ? size - 4 : size - 2} 
                    color={color} 
                  />
                </View>
              ),
            }}
          />
          
          <Tabs.Screen
            name="profil"
            options={{
              title: 'Profil',
              tabBarLabel: 'Profil',
              headerShown: true,
              tabBarIcon: ({ color, size, focused }) => (
                <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                  <Ionicons 
                    name={focused ? 'person' : 'person-outline'} 
                    size={isSmallDevice ? size - 4 : size - 2} 
                    color={color} 
                  />
                </View>
              ),
            }}
          />
        </Tabs>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
  },
  iconContainerFocused: {
    transform: [{ scale: 1.1 }],
  },
});