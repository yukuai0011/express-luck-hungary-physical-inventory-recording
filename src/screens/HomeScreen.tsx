import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Box, VStack, Button, ButtonText, Heading, Text } from '@gluestack-ui/themed';

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <Box flex={1} p="$6" bg="$backgroundLight100">
      <VStack space="lg" mt="$10">
        <Heading size="xl">Inventory Recording</Heading>
        <Text color="$textLight500">Express Luck Hungary</Text>

        <Button onPress={() => navigation.navigate('Scan')}>
          <ButtonText>Start Scanning</ButtonText>
        </Button>

        <Button variant="outline" onPress={() => navigation.navigate('Inventory')}>
          <ButtonText>View Inventory List</ButtonText>
        </Button>
      </VStack>
    </Box>
  );
}
