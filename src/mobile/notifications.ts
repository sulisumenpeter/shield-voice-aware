import { LocalNotifications } from '@capacitor/local-notifications';

export async function ensureNotificationPermission() {
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
    // Create default channel on Android
    try {
      await LocalNotifications.createChannel?.({
        id: 'alerts',
        name: 'Alerts',
        description: 'Risk and scam alerts',
        importance: 5,
        visibility: 1,
        sound: undefined,
        vibration: true,
        lights: true,
      } as any);
    } catch {}
  } catch (e) {
    console.warn('Notifications permission error', e);
  }
}

export async function sendLocalNotification(title: string, body: string) {
  try {
    const id = Math.floor(Date.now() % 2147483647);
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          channelId: 'alerts',
          smallIcon: 'ic_stat_name',
        },
      ],
    });
  } catch (e) {
    console.warn('Failed to schedule notification', e);
  }
}
