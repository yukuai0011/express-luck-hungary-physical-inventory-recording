import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import HomeScreen from './src/screens/HomeScreen';
import ScanScreen from './src/screens/ScanScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import { InventoryProvider } from './src/components/InventoryContext';

export type RootStackParamList = {
  Home: undefined;
  Scan: undefined;
  Inventory: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GluestackUIProvider config={config}>
      <InventoryProvider>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Scan" component={ScanScreen} />
            <Stack.Screen name="Inventory" component={InventoryScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </InventoryProvider>
    </GluestackUIProvider>
  );
}
