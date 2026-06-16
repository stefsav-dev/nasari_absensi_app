import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const LATE_NOTIF_ID = 'late_notification';
export const PULANG_NOTIF_ID = 'pulang_notification';

export const configureNotifications = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
};

export const requestNotificationPermissions = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#38bdf8',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Permission for notifications not granted');
      return false;
    }
    return true;
  }
  return false;
};

export const scheduleDailyNotifications = async () => {
  // Clear any existing notifications first to prevent duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Schedule late warning at 08:15 AM
  await Notifications.scheduleNotificationAsync({
    identifier: LATE_NOTIF_ID,
    content: {
      title: 'Peringatan Absensi!',
      body: 'Anda sudah terlambat batas toleransi 8.15 menit',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 15,
    },
  });

  // Schedule checkout reminder at 17:00 PM
  await Notifications.scheduleNotificationAsync({
    identifier: PULANG_NOTIF_ID,
    content: {
      title: 'Waktunya Pulang!',
      body: 'Saat nya pulang, Jangan Lupa absen',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 17,
      minute: 0,
    },
  });
};

export const cancelLateNotification = async () => {
  try {
    await Notifications.cancelScheduledNotificationAsync(LATE_NOTIF_ID);
  } catch (e) {
    console.error('Error cancelling late notification', e);
  }
};

export const cancelPulangNotification = async () => {
  try {
    await Notifications.cancelScheduledNotificationAsync(PULANG_NOTIF_ID);
  } catch (e) {
    console.error('Error cancelling pulang notification', e);
  }
};
