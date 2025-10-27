import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Switch } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { Profile, PackagePayload } from '../types';
import { ScannerModal } from './ScannerModal';

interface Props {
  profile: Profile | null;
}

export const WorkSection: React.FC<Props> = ({ profile }) => {
  const [packageNo, setPackageNo] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [packageIntact, setPackageIntact] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [result, setResult] = useState('');

  const handleBarcodeScan = (data: string) => {
    setPackageNo(data.trim());
    setShowScanner(false);
  };

  const handleQuantityChange = (delta: number) => {
    if (packageIntact) return;
    setQuantity(Math.max(0, quantity + delta));
  };

  const handleSubmit = async () => {
    if (!profile) {
      Alert.alert('Error', 'No profile saved. Please create a profile first.');
      return;
    }

    if (!packageNo.trim()) {
      Alert.alert('Error', 'Package number is required.');
      return;
    }

    const payload: PackagePayload = {
      orderNo: profile.orderNo,
      recordingNo: profile.recordingNo,
      locationCode: profile.locationCode,
      packageNo: packageNo.trim(),
      quantity: packageIntact ? 0 : quantity,
      packageIntact,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-ms-client-tracking-id': uuidv4(),
    };

    if (profile.bearerToken) {
      headers['Authorization'] = `Bearer ${profile.bearerToken}`;
    }

    try {
      const response = await fetch(profile.apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get('content-type');
      let responseData;

      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      const resultText = `Status: ${response.status}\n${
        response.ok ? 'Success' : 'Failed'
      }\n\nResponse:\n${JSON.stringify(responseData, null, 2)}`;

      setResult(resultText);
      
      if (response.ok) {
        Alert.alert('Success', 'Package record submitted successfully!');
        // Reset form
        setPackageNo('');
        setQuantity(0);
        setPackageIntact(true);
      } else {
        Alert.alert('Error', `Submission failed with status ${response.status}`);
      }
    } catch (error: any) {
      const errorText = `Request failed: ${error.message || error}\n\nThis may be due to network issues or CORS configuration.`;
      setResult(errorText);
      Alert.alert('Error', 'Failed to submit. Check result for details.');
    }
  };

  return (
    <View className="m-4 bg-dark-card rounded-2xl p-4 border border-gray-700">
      <Text className="text-xl font-bold text-dark-text mb-2">2) Work</Text>
      <Text className="text-sm text-dark-muted mb-4">
        Use your saved profile to submit package records
      </Text>

      <View className="space-y-4">
        {/* Package Number */}
        <View>
          <Text className="text-dark-text mb-2">Package No</Text>
          <View className="flex-row space-x-2">
            <TextInput
              className="flex-1 bg-gray-800 text-dark-text p-3 rounded-lg border border-gray-600"
              placeholder="Scan or type package number"
              placeholderTextColor="#6b7280"
              value={packageNo}
              onChangeText={setPackageNo}
            />
            <TouchableOpacity
              className="bg-blue-600 px-4 rounded-lg items-center justify-center"
              onPress={() => setShowScanner(true)}
            >
              <Text className="text-white font-semibold">Scan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Package Intact */}
        <View className="flex-row items-center justify-between">
          <Text className="text-dark-text">Package intact</Text>
          <Switch
            value={packageIntact}
            onValueChange={(value) => {
              setPackageIntact(value);
              if (value) setQuantity(0);
            }}
            trackColor={{ false: '#374151', true: '#2563eb' }}
            thumbColor={packageIntact ? '#fff' : '#9ca3af'}
          />
        </View>

        {/* Quantity */}
        <View>
          <Text className="text-dark-text mb-2">Quantity</Text>
          <View className="flex-row items-center space-x-2">
            <TouchableOpacity
              className={`w-12 h-12 rounded-lg items-center justify-center ${
                packageIntact ? 'bg-gray-700 opacity-50' : 'bg-gray-600'
              }`}
              onPress={() => handleQuantityChange(-1)}
              disabled={packageIntact}
            >
              <Text className="text-white text-2xl font-bold">−</Text>
            </TouchableOpacity>
            <TextInput
              className={`flex-1 bg-gray-800 text-dark-text p-3 rounded-lg border border-gray-600 text-center ${
                packageIntact ? 'opacity-50' : ''
              }`}
              value={String(quantity)}
              onChangeText={(text) => {
                if (!packageIntact) {
                  const num = parseInt(text) || 0;
                  setQuantity(Math.max(0, num));
                }
              }}
              keyboardType="numeric"
              editable={!packageIntact}
            />
            <TouchableOpacity
              className={`w-12 h-12 rounded-lg items-center justify-center ${
                packageIntact ? 'bg-gray-700 opacity-50' : 'bg-gray-600'
              }`}
              onPress={() => handleQuantityChange(1)}
              disabled={packageIntact}
            >
              <Text className="text-white text-2xl font-bold">+</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-xs text-dark-muted mt-2">
            Disabled when Package intact is checked
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          className="bg-blue-700 py-4 rounded-lg items-center mt-4"
          onPress={handleSubmit}
        >
          <Text className="text-white font-bold text-lg">Submit</Text>
        </TouchableOpacity>

        {/* Result Display */}
        {result !== '' && (
          <View className="mt-4 bg-gray-900 p-3 rounded-lg border border-gray-600">
            <Text className="text-dark-muted text-xs font-mono">{result}</Text>
          </View>
        )}
      </View>

      <ScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
        title="Scan Package Barcode"
      />
    </View>
  );
};
