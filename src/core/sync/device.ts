const DEVICE_KEY = 'zametnik-device-id';

/** Функция `getDeviceId`. */
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return 'browser-device';
  }
}
