import { ApplicationSettings } from '@nativescript/core';

const PROFILE_KEY = 'inventoryProfile';

export interface Profile {
  apiEndpoint: string;
  orderNo: string;
  recordingNo: number;
  locationCode: string;
  bearerToken?: string;
}

export function saveProfile(profile: Profile): void {
  ApplicationSettings.setString(PROFILE_KEY, JSON.stringify(profile));
}

export function loadProfile(): Profile | null {
  const raw = ApplicationSettings.getString(PROFILE_KEY);
  if (!raw) return null;
  
  try {
    const profile = JSON.parse(raw);
    if (!profile.apiEndpoint || !profile.orderNo || 
        profile.recordingNo === undefined || !profile.locationCode) {
      return null;
    }
    return profile;
  } catch (e) {
    console.error('Failed to parse profile:', e);
    return null;
  }
}

export function clearProfile(): void {
  ApplicationSettings.remove(PROFILE_KEY);
}

export function hasProfile(): boolean {
  return ApplicationSettings.hasKey(PROFILE_KEY);
}
