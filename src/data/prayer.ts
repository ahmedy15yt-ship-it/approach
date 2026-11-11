// Astronomical Prayer times calculation engine for Egypt's 27 Governorates
// Using Egyptian General Authority of Survey (الهيئة المصرية العامة للمساحة) parameters:
// Fajr angle: 19.5°, Isha angle: 17.5°

export interface Governorate {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const EGYPT_GOVERNORATES: Governorate[] = [
  { id: 'cairo', name: 'القاهرة', lat: 30.0444, lng: 31.2357 },
  { id: 'giza', name: 'الجيزة', lat: 30.0131, lng: 31.2089 },
  { id: 'alexandria', name: 'الإسكندرية', lat: 31.2001, lng: 29.9187 },
  { id: 'dakahlia', name: 'الدقهلية (المنصورة)', lat: 31.0409, lng: 31.3785 },
  { id: 'sharqia', name: 'الشرقية (الزقازيق)', lat: 30.5877, lng: 31.5020 },
  { id: 'gharbia', name: 'الغربية (طنطا)', lat: 30.7865, lng: 31.0004 },
  { id: 'qalyubia', name: 'القليوبية (بنها)', lat: 30.4591, lng: 31.1786 },
  { id: 'menoufia', name: 'المنوفية (شبين الكوم)', lat: 30.5526, lng: 31.0090 },
  { id: 'beheira', name: 'البحيرة (دمنهور)', lat: 31.0379, lng: 30.4725 },
  { id: 'kafr_el_sheikh', name: 'كفر الشيخ', lat: 31.1107, lng: 30.9388 },
  { id: 'damietta', name: 'دمياط', lat: 31.4175, lng: 31.8144 },
  { id: 'port_said', name: 'بورسعيد', lat: 31.2653, lng: 32.3019 },
  { id: 'ismailia', name: 'الإسماعيلية', lat: 30.5965, lng: 32.2715 },
  { id: 'suez', name: 'السويس', lat: 29.9668, lng: 32.5498 },
  { id: 'fayoum', name: 'الفيوم', lat: 29.3084, lng: 30.8428 },
  { id: 'beni_suef', name: 'بني سويف', lat: 29.0661, lng: 31.0994 },
  { id: 'minya', name: 'المنيا', lat: 28.0871, lng: 30.7618 },
  { id: 'asyut', name: 'أسيوط', lat: 27.1783, lng: 31.1859 },
  { id: 'sohag', name: 'سوهاج', lat: 26.5591, lng: 31.6957 },
  { id: 'qena', name: 'قنا', lat: 26.1551, lng: 32.7160 },
  { id: 'luxor', name: 'الأقصر', lat: 25.6872, lng: 32.6396 },
  { id: 'aswan', name: 'أسوان', lat: 24.0889, lng: 32.8998 },
  { id: 'red_sea', name: 'البحر الأحمر (الغردقة)', lat: 27.2579, lng: 33.8116 },
  { id: 'new_valley', name: 'الوادي الجديد (الخارجة)', lat: 25.4514, lng: 30.5471 },
  { id: 'matrouh', name: 'مطروح', lat: 31.3543, lng: 27.2373 },
  { id: 'north_sinai', name: 'شمال سيناء (العريش)', lat: 31.1316, lng: 33.7984 },
  { id: 'south_sinai', name: 'جنوب سيناء (شرم الشيخ)', lat: 27.9158, lng: 34.3299 },
];

export interface PrayerTime {
  name: string;
  key: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  time: string; // HH:mm
  timestamp: Date;
}

// Convert degrees to radians
const degToRad = (deg: number) => (deg * Math.PI) / 180.0;
const radToDeg = (rad: number) => (rad * 180.0) / Math.PI;

// Convert 24-hour time to friendly 12-hour format with Arabic markers (ص / م)
export function formatTo12Hour(hours24: number, minutes: number): string {
  const period = hours24 >= 12 ? 'م' : 'ص';
  let h12 = hours24 % 12;
  if (h12 === 0) h12 = 12;
  const mm = String(minutes).padStart(2, '0');
  return `${h12}:${mm} ${period}`;
}

export function convert24To12(timeStr24: string): string {
  if (!timeStr24 || !timeStr24.includes(':')) return timeStr24;
  const [hStr, mStr] = timeStr24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return timeStr24;
  return formatTo12Hour(h, m);
}

// Astronomical calculation of solar position & prayer times
export function calculatePrayerTimes(date: Date, gov: Governorate): PrayerTime[] {
  const lat = gov.lat;
  const lng = gov.lng;
  // Egypt timezone is standard UTC+2 (or UTC+3 in daylight saving)
  // We compute based on the local system date
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Solar declination (approx)
  const d = (360 / 365) * (dayOfYear - 81);
  const declination = 23.45 * Math.sin(degToRad(d));

  // Equation of time (minutes)
  const b = degToRad((360 / 365) * (dayOfYear - 81));
  const equationOfTime =
    9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);

  // Timezone offset in hours
  const tzOffset = -date.getTimezoneOffset() / 60; // usually +2 or +3 for Egypt
  // Solar noon in hours (local time)
  const solarNoon = 12 + (tzOffset * 15 - lng) / 15 - equationOfTime / 60;

  // Function to calculate hour angle for a specific solar altitude angle (alpha)
  const calcHourAngle = (alpha: number) => {
    const cosHA =
      (Math.sin(degToRad(alpha)) -
        Math.sin(degToRad(lat)) * Math.sin(degToRad(declination))) /
      (Math.cos(degToRad(lat)) * Math.cos(degToRad(declination)));
    if (cosHA > 1 || cosHA < -1) return null;
    return radToDeg(Math.acos(cosHA));
  };

  // Egyptian General Authority of Survey parameters:
  // Fajr: sun is 19.5 deg below horizon (-19.5)
  // Sunrise: sun is 0.833 deg below horizon (-0.833)
  // Asr: shadow = noon shadow + object height (Shafi'i/Hanbali/Maliki standard)
  // Maghrib: sunset (sun is 0.833 deg below horizon)
  // Isha: sun is 17.5 deg below horizon (-17.5)

  const haFajr = calcHourAngle(-19.5) || 105;
  const haSunrise = calcHourAngle(-0.833) || 90;
  const haMaghrib = calcHourAngle(-0.833) || 90;
  const haIsha = calcHourAngle(-17.5) || 103;

  // Asr altitude
  const noonShadow = Math.tan(degToRad(Math.abs(lat - declination)));
  const asrAltitude = radToDeg(Math.atan(1 / (1 + noonShadow)));
  const haAsr = calcHourAngle(asrAltitude) || 45;

  const toTimeString = (hourDecimal: number): { time: string; timestamp: Date } => {
    let normalized = hourDecimal % 24;
    if (normalized < 0) normalized += 24;
    const hours = Math.floor(normalized);
    const mins = Math.floor((normalized - hours) * 60);

    const dt = new Date(date);
    dt.setHours(hours, mins, 0, 0);
    return { time: formatTo12Hour(hours, mins), timestamp: dt };
  };

  const fajr = toTimeString(solarNoon - haFajr / 15);
  const sunrise = toTimeString(solarNoon - haSunrise / 15);
  const dhuhr = toTimeString(solarNoon);
  const asr = toTimeString(solarNoon + haAsr / 15);
  const maghrib = toTimeString(solarNoon + haMaghrib / 15);
  const isha = toTimeString(solarNoon + haIsha / 15);

  return [
    { name: 'الفجر', key: 'fajr', time: fajr.time, timestamp: fajr.timestamp },
    { name: 'الشروق', key: 'sunrise', time: sunrise.time, timestamp: sunrise.timestamp },
    { name: 'الظهر', key: 'dhuhr', time: dhuhr.time, timestamp: dhuhr.timestamp },
    { name: 'العصر', key: 'asr', time: asr.time, timestamp: asr.timestamp },
    { name: 'المغرب', key: 'maghrib', time: maghrib.time, timestamp: maghrib.timestamp },
    { name: 'العشاء', key: 'isha', time: isha.time, timestamp: isha.timestamp },
  ];
}

// Find Next Prayer and Countdown
export function getNextPrayer(prayers: PrayerTime[]): {
  nextPrayer: PrayerTime;
  remainingSeconds: number;
  remainingFormatted: string;
} {
  const now = new Date();
  // Find first prayer in list that is in the future
  for (const prayer of prayers) {
    if (prayer.timestamp.getTime() > now.getTime()) {
      const diffSec = Math.floor((prayer.timestamp.getTime() - now.getTime()) / 1000);
      const hours = Math.floor(diffSec / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      const seconds = diffSec % 60;
      const formatted = `${hours > 0 ? `${hours} س و ` : ''}${minutes} د و ${seconds} ث`;
      return { nextPrayer: prayer, remainingSeconds: diffSec, remainingFormatted: formatted };
    }
  }

  // If all prayers passed today, next is tomorrow's Fajr
  const tomorrowFajr = new Date(prayers[0].timestamp);
  tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
  const diffSec = Math.floor((tomorrowFajr.getTime() - now.getTime()) / 1000);
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;
  const formatted = `${hours > 0 ? `${hours} س و ` : ''}${minutes} د و ${seconds} ث`;

  return {
    nextPrayer: { ...prayers[0], timestamp: tomorrowFajr },
    remainingSeconds: diffSec,
    remainingFormatted: formatted,
  };
}
