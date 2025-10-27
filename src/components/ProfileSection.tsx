import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Profile, RecordingInfo, ApiEndpoint } from '../types';
import { ScannerModal } from './ScannerModal';

interface Props {
  profile: Profile | null;
  onSaveProfile: (profile: Profile) => void;
  onClearProfile: () => void;
}

export const ProfileSection: React.FC<Props> = ({
  profile,
  onSaveProfile,
  onClearProfile,
}) => {
  const [scannedApi, setScannedApi] = useState<string | null>(null);
  const [scannedInfo, setScannedInfo] = useState<RecordingInfo | null>(null);
  const [bearerToken, setBearerToken] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const sanitizeEndpoint = (urlLike: string): string => {
    let s = urlLike.trim();
    if (s.startsWith('<') && s.endsWith('>')) {
      s = s.slice(1, -1);
    }
    return s;
  };

  const handleQrScan = (data: string) => {
    try {
      const obj = JSON.parse(data);
      
      if (obj.apiEndpoint && typeof obj.apiEndpoint === 'string') {
        setScannedApi(sanitizeEndpoint(obj.apiEndpoint));
        Alert.alert('Success', 'API Endpoint scanned!');
        if (scannedInfo) {
          setShowScanner(false);
        }
        return;
      }

      if (obj.orderNo && obj.locationCode && obj.recordingNo !== undefined) {
        const info: RecordingInfo = {
          orderNo: String(obj.orderNo).trim(),
          locationCode: String(obj.locationCode).trim(),
          recordingNo: Number(obj.recordingNo),
        };
        setScannedInfo(info);
        Alert.alert('Success', 'Recording Info scanned!');
        if (scannedApi) {
          setShowScanner(false);
        }
        return;
      }

      Alert.alert('Error', 'QR code format not recognized');
    } catch (error) {
      Alert.alert('Error', 'Invalid QR code - not valid JSON');
    }
  };

  const handleDetectPaste = () => {
    if (!pasteText.trim()) {
      Alert.alert('Error', 'Please paste JSON text first');
      return;
    }
    handleQrScan(pasteText);
  };

  const handleSaveProfile = () => {
    if (!scannedApi || !scannedInfo) {
      Alert.alert('Error', 'Please scan both QR codes first');
      return;
    }

    const newProfile: Profile = {
      apiEndpoint: scannedApi,
      orderNo: scannedInfo.orderNo,
      recordingNo: scannedInfo.recordingNo,
      locationCode: scannedInfo.locationCode,
      bearerToken: bearerToken.trim() || undefined,
    };

    onSaveProfile(newProfile);
    Alert.alert('Success', 'Profile saved!');
  };

  const handleReset = () => {
    setScannedApi(null);
    setScannedInfo(null);
    setPasteText('');
  };

  const handleClearProfile = () => {
    Alert.alert(
      'Confirm',
      'Are you sure you want to clear the saved profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            onClearProfile();
            handleReset();
          },
        },
      ]
    );
  };

  return (
    <View className="m-4 bg-dark-card rounded-2xl p-4 border border-gray-700">
      <Text className="text-xl font-bold text-dark-text mb-2">
        1) Recording Profile
      </Text>
      <Text className="text-sm text-dark-muted mb-4">
        Scan two QR codes: API Endpoint and Recording Info
      </Text>

      <View className="space-y-4">
        {/* Scan Status */}
        <View className="space-y-2">
          <View className="flex-row items-center">
            <Text className="text-dark-text mr-2">API Endpoint:</Text>
            <View
              className={`px-3 py-1 rounded-full ${
                scannedApi ? 'bg-green-900' : 'bg-gray-700'
              }`}
            >
              <Text className="text-xs text-white">
                {scannedApi ? 'ready' : 'missing'}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <Text className="text-dark-text mr-2">Recording Info:</Text>
            <View
              className={`px-3 py-1 rounded-full ${
                scannedInfo ? 'bg-green-900' : 'bg-gray-700'
              }`}
            >
              <Text className="text-xs text-white">
                {scannedInfo ? 'ready' : 'missing'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row space-x-2">
          <TouchableOpacity
            className="flex-1 bg-blue-600 py-3 rounded-lg items-center"
            onPress={() => setShowScanner(true)}
          >
            <Text className="text-white font-semibold">Scan QR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-gray-600 py-3 rounded-lg items-center"
            onPress={handleReset}
          >
            <Text className="text-white font-semibold">Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Paste JSON */}
        <View className="mt-4">
          <Text className="text-dark-text mb-2">Or paste JSON:</Text>
          <TextInput
            className="bg-gray-800 text-dark-text p-3 rounded-lg border border-gray-600 mb-2"
            placeholder='{"apiEndpoint":"..."} or {"orderNo":"...","recordingNo":1,"locationCode":"..."}'
            placeholderTextColor="#6b7280"
            multiline
            numberOfLines={3}
            value={pasteText}
            onChangeText={setPasteText}
          />
          <TouchableOpacity
            className="bg-gray-600 py-2 rounded-lg items-center"
            onPress={handleDetectPaste}
          >
            <Text className="text-white font-semibold">Detect</Text>
          </TouchableOpacity>
        </View>

        {/* Bearer Token */}
        <View className="mt-4">
          <Text className="text-dark-text mb-2">
            Bearer Token (optional):
          </Text>
          <TextInput
            className="bg-gray-800 text-dark-text p-3 rounded-lg border border-gray-600"
            placeholder="Enter bearer token if required"
            placeholderTextColor="#6b7280"
            secureTextEntry
            value={bearerToken}
            onChangeText={setBearerToken}
          />
        </View>

        {/* Save/Clear Buttons */}
        <View className="flex-row space-x-2 mt-4">
          <TouchableOpacity
            className={`flex-1 py-3 rounded-lg items-center ${
              scannedApi && scannedInfo
                ? 'bg-blue-700'
                : 'bg-gray-700 opacity-50'
            }`}
            onPress={handleSaveProfile}
            disabled={!scannedApi || !scannedInfo}
          >
            <Text className="text-white font-semibold">Save Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-red-600 py-3 rounded-lg items-center"
            onPress={handleClearProfile}
          >
            <Text className="text-white font-semibold">Clear Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Current Profile Display */}
        {profile && (
          <View className="mt-4 bg-gray-900 p-3 rounded-lg border border-dashed border-gray-600">
            <Text className="text-dark-text font-semibold mb-2">
              Current Profile:
            </Text>
            <Text className="text-sm text-dark-muted">
              Order: {profile.orderNo}
            </Text>
            <Text className="text-sm text-dark-muted">
              Recording: {profile.recordingNo}
            </Text>
            <Text className="text-sm text-dark-muted">
              Location: {profile.locationCode}
            </Text>
            <Text className="text-sm text-dark-muted">
              Token: {profile.bearerToken ? '(stored)' : '(none)'}
            </Text>
          </View>
        )}
      </View>

      <ScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQrScan}
        title="Scan QR Code"
      />
    </View>
  );
};
