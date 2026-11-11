/**
 * Notification Service for Nahj Application
 * Handles Web Notifications (Push Notifications) and background reminders
 * for study sessions, Pomodoro focus completions, prayers, and health.
 */

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission => {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    localStorage.setItem('nahj_notifications_enabled', permission === 'granted' ? 'true' : 'false');
    return permission === 'granted';
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
};

export const isNotificationsEnabled = (): boolean => {
  if (!isNotificationSupported()) return false;
  return Notification.permission === 'granted';
};

export const sendNotification = async (
  title: string,
  options?: NotificationOptions
): Promise<boolean> => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const defaultOptions: NotificationOptions = {
      icon: '/ic_launcher_fg_1794117764529.jpg',
      badge: '/ic_launcher_fg_1794117764529.jpg',
      dir: 'rtl',
      lang: 'ar',
      requireInteraction: true,
      ...options,
    };

    const notif = new Notification(title, defaultOptions);

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    return true;
  } catch (err) {
    console.error('Error sending notification:', err);
    return false;
  }
};

/**
 * Trigger notification when Pomodoro session finishes in the background
 */
export const notifyPomodoroCompleted = async (
  sessionTitle: string,
  subjectName: string,
  durationMinutes: number
) => {
  await sendNotification(`🎯 انتهت جلسة التركيز! ما شاء الله`, {
    body: `أتممت ${durationMinutes} دقيقة مذاكرة في: ${sessionTitle} (${subjectName}). حان الآن وقت استراحة 5 دقائق لتجديد نشاطك.`,
    tag: 'pomodoro-finished',
  });
};

/**
 * Trigger notification for next study session scheduled
 */
export const notifyStudySessionReminder = async (
  subjectName: string,
  lessonTitle: string,
  timeStr: string
) => {
  await sendNotification(`📚 موعد جلسة المذاكرة: ${subjectName}`, {
    body: `حان موعد المذاكرة (${timeStr}): ${lessonTitle}. افتح نَهج واستعن بالله!`,
    tag: `session-${subjectName}`,
  });
};

/**
 * Trigger notification for prayer
 */
export const notifyPrayerTime = async (prayerName: string) => {
  await sendNotification(`🕌 حان الآن وقت صلاة ${prayerName}`, {
    body: `«أرحنا بها يا بلال» — قُم وتوضأ وصلّ لتملأ يومك بالبركة والتوفيق والسكينة.`,
    tag: `prayer-${prayerName}`,
  });
};

/**
 * Trigger water hydration reminder
 */
export const notifyWaterReminder = async (currentCups: number, targetCups: number) => {
  await sendNotification(`💧 تذكير رشفة ماء لخلايا المخ`, {
    body: `شربت ${currentCups} من ${targetCups} أكواب. اشرب كوب ماء بارد الآن لحماية تركيزك من الصداع.`,
    tag: 'water-reminder',
  });
};
