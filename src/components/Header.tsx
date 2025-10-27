import React from 'react';
import { View, Text } from 'react-native';

export const Header: React.FC = () => {
  return (
    <View className="p-6 items-center">
      <Text className="text-3xl font-bold text-dark-text tracking-wide">
        Inventory Scanner
      </Text>
      <Text className="text-sm text-dark-muted mt-2">
        Offline-ready QR/Barcode scanning app
      </Text>
    </View>
  );
};
