import React from 'react';
import { SafeAreaView } from 'react-native';
import {
  GluestackUIProvider,
  Box,
  Button,
  Text,
  Input,
  InputField,
  VStack,
  HStack,
} from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';

export default function App() {
  return (
    <GluestackUIProvider config={config}>
      <SafeAreaView style={{ flex: 1 }}>
        <Box flex={1} p="$4" bg="$backgroundLight0" justifyContent="center" alignItems="center">
          <VStack space="md" w="100%" style={{ maxWidth: 480 }}>
            <Text size="2xl" bold textAlign="center">
              Express Luck Inventory
            </Text>
            <Input variant="outline" size="md">
              <InputField placeholder="Scan or enter SKU" />
            </Input>
            <HStack space="sm" justifyContent="center">
              <Button action="primary">
                <Text color="$textLight0">Add Item</Text>
              </Button>
              <Button action="secondary" variant="outline">
                <Text>Add Location</Text>
              </Button>
            </HStack>
          </VStack>
        </Box>
      </SafeAreaView>
    </GluestackUIProvider>
  );
}
