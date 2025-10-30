import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = 'inventoryProfile';

export async function saveProfile(profile) {
  try {
    const json = JSON.stringify(profile);
    await AsyncStorage.setItem(PROFILE_KEY, json);
    return true;
  } catch (e) {
    return false;
  }
}

export async function loadProfile() {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.apiEndpoint || !obj.orderNo || obj.recordingNo === undefined || !obj.locationCode) {
      return null;
    }
    return obj;
  } catch (e) {
    return null;
  }
}

export async function clearProfile() {
  try {
    await AsyncStorage.removeItem(PROFILE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}
