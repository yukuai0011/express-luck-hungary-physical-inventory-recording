import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileSection } from './src/components/ProfileSection';
import { WorkSection } from './src/components/WorkSection';
import { Header } from './src/components/Header';
import { Profile } from './src/types';
import './global.css';

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem('inventoryProfile');
      if (stored) {
        setProfile(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const saveProfile = async (newProfile: Profile) => {
    try {
      await AsyncStorage.setItem('inventoryProfile', JSON.stringify(newProfile));
      setProfile(newProfile);
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const clearProfile = async () => {
    try {
      await AsyncStorage.removeItem('inventoryProfile');
      setProfile(null);
    } catch (error) {
      console.error('Failed to clear profile:', error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView className="flex-1">
        <Header />
        <ProfileSection
          profile={profile}
          onSaveProfile={saveProfile}
          onClearProfile={clearProfile}
        />
        <WorkSection profile={profile} />
      </ScrollView>
    </SafeAreaView>
  );
}
