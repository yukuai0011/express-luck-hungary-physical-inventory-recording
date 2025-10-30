import React, { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Box, VStack, Input, InputField, Button, ButtonText, Text } from '@gluestack-ui/themed';

export type ScanScreenProps = NativeStackScreenProps<RootStackParamList, 'Scan'>;

export default function ScanScreen({ navigation }: ScanScreenProps) {
  const [code, setCode] = useState('');
  const [last, setLast] = useState<string | null>(null);

  const onSubmit = () => {
    if (code.trim().length === 0) return;
    setLast(code.trim());
    setCode('');
  };

  return (
    <Box flex={1} p="$6" bg="$backgroundLight100">
      <VStack space="md">
        <Text>Enter or scan a barcode/QR code:</Text>
        <Input>
          <InputField
            placeholder="Type code and press Add"
            value={code}
            onChangeText={setCode}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
          />
        </Input>
        <Button onPress={onSubmit}><ButtonText>Add</ButtonText></Button>
        {last && (
          <Text color="$textLight500">Last scanned: {last}</Text>
        )}
        <Button variant="outline" onPress={() => navigation.navigate('Inventory')}>
          <ButtonText>Go to Inventory List</ButtonText>
        </Button>
      </VStack>
    </Box>
  );
}
