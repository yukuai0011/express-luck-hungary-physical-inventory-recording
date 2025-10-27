import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Camera, CameraView, BarcodeScanningResult } from 'expo-camera';

interface Props {
  visible: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  title: string;
}

export const ScannerModal: React.FC<Props> = ({
  visible,
  onClose,
  onScan,
  title,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) {
      requestCameraPermission();
      setScanned(false);
    }
  }, [visible]);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera permission to scan codes.'
      );
    }
  };

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scanned) return;
    
    setScanned(true);
    onScan(data);
  };

  if (hasPermission === null) {
    return null;
  }

  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View className="flex-1 bg-black bg-opacity-80 justify-center items-center">
          <View className="bg-dark-card p-6 rounded-2xl m-4 w-11/12 max-w-md">
            <Text className="text-dark-text text-lg font-bold mb-4">
              Camera Access Required
            </Text>
            <Text className="text-dark-muted mb-6">
              This app needs camera access to scan QR codes and barcodes.
              Please enable camera permission in your device settings.
            </Text>
            <TouchableOpacity
              className="bg-blue-600 py-3 rounded-lg items-center"
              onPress={onClose}
            >
              <Text className="text-white font-semibold">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black">
        <View className="flex-1">
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: [
                'qr',
                'ean13',
                'ean8',
                'code128',
                'code39',
                'code93',
                'upc_a',
                'upc_e',
              ],
            }}
          />
          
          {/* Scanner UI Overlay */}
          <View className="flex-1 justify-between p-6">
            {/* Header */}
            <View className="bg-black bg-opacity-70 p-4 rounded-2xl">
              <View className="flex-row justify-between items-center">
                <Text className="text-white text-lg font-bold">{title}</Text>
                <TouchableOpacity
                  className="bg-gray-700 w-10 h-10 rounded-full items-center justify-center"
                  onPress={onClose}
                >
                  <Text className="text-white text-xl font-bold">✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Center scanning guide */}
            <View className="items-center">
              <View className="w-64 h-64 border-4 border-white border-dashed rounded-3xl" />
              <Text className="text-white text-center mt-4 bg-black bg-opacity-70 px-4 py-2 rounded-lg">
                {scanned
                  ? 'Code scanned! Processing...'
                  : 'Point camera at the code'}
              </Text>
            </View>

            {/* Bottom hint */}
            <View className="bg-black bg-opacity-70 p-4 rounded-2xl">
              <Text className="text-gray-300 text-sm text-center">
                Align the code within the frame
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
