import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile } from '../types';

const KEY = 'inventoryProfile';

export async function loadProfile(): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (
      obj &&
      typeof obj.apiEndpoint === 'string' &&
      typeof obj.orderNo === 'string' &&
      typeof obj.locationCode === 'string' &&
      typeof obj.recordingNo === 'number'
    ) {
      return obj as Profile;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(profile));
}

export async function clearProfile(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
