import React, { useMemo, useState } from 'react';
import { SafeAreaView, View } from 'react-native';
import { GluestackUIProvider, Box, Button, ButtonText, HStack, Heading, Text } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import ProfileScreen from './src/screens/ProfileScreen';
import WorkScreen from './src/screens/WorkScreen';

type TabKey = 'profile' | 'work';

export default function App() {
  const [tab, setTab] = useState<TabKey>('profile');

  const content = useMemo(() => {
    switch (tab) {
      case 'profile':
        return <ProfileScreen onGoWork={() => setTab('work')} />;
      case 'work':
        return <WorkScreen onGoProfile={() => setTab('profile')} />;
      default:
        return null;
    }
  }, [tab]);

  return (
    <GluestackUIProvider config={config}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
        <Box flex={1} px={12} py={8}>
          <Heading size="xl" color="$textLight0">
            Inventory Scanner
          </Heading>
          <Text color="$textLight600" mt={4}>
            React Native + Expo + Gluestack UI
          </Text>

          <HStack mt={16} space="md">
            <Button action={tab === 'profile' ? 'primary' : 'secondary'} onPress={() => setTab('profile')}>
              <ButtonText>1) Profile</ButtonText>
            </Button>
            <Button action={tab === 'work' ? 'primary' : 'secondary'} onPress={() => setTab('work')}>
              <ButtonText>2) Work</ButtonText>
            </Button>
          </HStack>

          <View style={{ flex: 1, marginTop: 16 }}>{content}</View>
        </Box>
      </SafeAreaView>
    </GluestackUIProvider>
  );
}
