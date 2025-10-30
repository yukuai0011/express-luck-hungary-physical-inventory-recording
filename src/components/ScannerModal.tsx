import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Box, Button, ButtonText, Heading, Text, VStack } from '@gluestack-ui/themed';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  // Return true to auto-close, false to keep scanning
  onDecoded: (data: string, type: string) => boolean | void;
};

export default function ScannerModal({ visible, title, onClose, onDecoded }: Props) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<string>('Point the camera at the code…');
  const lastDataRef = useRef<string | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    let mounted = true;
    if (visible) {
      setFeedback('Point the camera at the code…');
      BarCodeScanner.requestPermissionsAsync().then(({ status }) => {
        if (!mounted) return;
        setHasPermission(status === 'granted');
      });
    } else {
      setHasPermission(null);
    }
    return () => {
      mounted = false;
    };
  }, [visible]);

  const handleBarCodeScanned = useCallback(
    ({ data, type }: { data: string; type: string }) => {
      const now = Date.now();
      // Throttle duplicates
      if (lastDataRef.current === data && now - lastTimeRef.current < 1200) {
        return;
      }
      lastDataRef.current = data;
      lastTimeRef.current = now;

      const shouldClose = onDecoded?.(data, type) ?? false;
      if (shouldClose) {
        onClose();
      } else {
        setFeedback('Not recognized yet. Keep scanning…');
      }
    },
    [onClose, onDecoded]
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <Box flex={1} bg={Platform.OS === 'web' ? '$backgroundDark950' : '$backgroundDark950'}>
        <VStack flex={1} p={12} space="md">
          <Heading size="lg" color="$textLight0">{title}</Heading>
          {hasPermission === false ? (
            <Text color="$textLight600">Camera permission not granted.</Text>
          ) : (
            <View style={styles.cameraWrap}>
              {/* Using flexible height camera */}
              <BarCodeScanner onBarCodeScanned={handleBarCodeScanned} style={StyleSheet.absoluteFillObject} />
            </View>
          )}
          <Text color="$textLight500">{feedback}</Text>
          <Button variant="outline" action="secondary" onPress={onClose} mt={8} alignSelf="flex-start">
            <ButtonText>Close</ButtonText>
          </Button>
        </VStack>
      </Box>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cameraWrap: {
    position: 'relative',
    overflow: 'hidden',
    flex: 1,
    borderRadius: 8,
  },
});
