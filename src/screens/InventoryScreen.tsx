import React, { useState } from 'react';
import { Box, VStack, HStack, Input, InputField, Button, ButtonText, Text, Badge, BadgeText, Divider } from '@gluestack-ui/themed';
import { useInventory, type InventoryItem } from '@/components/InventoryContext';

export default function InventoryScreen() {
  const { items, addItem, clear } = useInventory();
  const [manualId, setManualId] = useState('');

  const onAdd = () => {
    if (!manualId.trim()) return;
    addItem(manualId.trim());
    setManualId('');
  };

  return (
    <Box flex={1} p="$6" bg="$backgroundLight100">
      <VStack space="md">
        <HStack space="md" alignItems="center">
          <Input flex={1}>
            <InputField
              placeholder="Add item ID manually"
              value={manualId}
              onChangeText={setManualId}
              onSubmitEditing={onAdd}
              returnKeyType="done"
            />
          </Input>
          <Button onPress={onAdd}><ButtonText>Add</ButtonText></Button>
          <Button variant="outline" action="negative" onPress={clear}><ButtonText>Clear</ButtonText></Button>
        </HStack>

        <Divider />

        <VStack space="sm">
          {items.length === 0 && <Text color="$textLight500">No items added yet.</Text>}
          {items.map((item: InventoryItem) => (
            <HStack key={item.id} justifyContent="space-between" alignItems="center" py="$2">
              <Text size="md">{item.id}</Text>
              <Badge action="muted" variant="solid"><BadgeText>x{item.quantity}</BadgeText></Badge>
            </HStack>
          ))}
        </VStack>
      </VStack>
    </Box>
  );
}
