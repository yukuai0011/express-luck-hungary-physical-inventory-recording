import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import {
  Box,
  Button,
  ButtonText,
  Heading,
  HStack,
  Input,
  InputField,
  Text,
  Textarea,
  TextareaInput,
  VStack,
  Badge,
  BadgeText,
} from '@gluestack-ui/themed';
import ScannerModal from '../components/ScannerModal';
import { clearProfile, loadProfile, saveProfile } from '../storage/profile';
import { sanitizeEndpoint } from '../utils/sanitizeEndpoint';
import type { Profile, RecordingInfo } from '../types';

type Props = {
  onGoWork?: () => void;
};

export default function ProfileScreen({ onGoWork }: Props) {
  const [scannerVisible, setScannerVisible] = useState(false);
  const [apiEndpoint, setApiEndpoint] = useState<string | null>(null);
  const [info, setInfo] = useState<RecordingInfo | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [bearer, setBearer] = useState('');
  const [existing, setExisting] = useState<Profile | null>(null);

  useEffect(() => {
    loadProfile().then(setExisting);
  }, []);

  const canSave = Boolean(apiEndpoint && info);

  const profileSummary = useMemo(() => {
    const profile = existing;
    if (!profile) return 'No profile saved.';
    const safe = {
      apiEndpoint: profile.apiEndpoint || '',
      orderNo: profile.orderNo || '',
      recordingNo: profile.recordingNo ?? '',
      locationCode: profile.locationCode || '',
      bearerToken: profile.bearerToken ? '(stored)' : '(none)'
    };
    return JSON.stringify(safe, null, 2);
  }, [existing]);

  const resetScan = useCallback(() => {
    setApiEndpoint(null);
    setInfo(null);
    setPasteText('');
  }, []);

  const tryParseQrJson = useCallback((text: string): Record<string, unknown> | null => {
    try {
      const obj = JSON.parse(text);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj as Record<string, unknown>;
      return null;
    } catch {
      return null;
    }
  }, []);

  const handleQrObject = useCallback((obj: Record<string, unknown>): boolean => {
    if (obj && typeof obj['apiEndpoint'] === 'string') {
      setApiEndpoint(sanitizeEndpoint(obj['apiEndpoint'] as string));
      return true;
    }
    const orderNo = String(obj['orderNo'] ?? '').trim();
    const locationCode = String(obj['locationCode'] ?? '').trim();
    const recordingNo = Number(obj['recordingNo']);
    if (orderNo && locationCode && Number.isFinite(recordingNo)) {
      setInfo({ orderNo, locationCode, recordingNo });
      return true;
    }
    return false;
  }, []);

  const onDecoded = useCallback(
    (data: string) => {
      const obj = tryParseQrJson(data);
      if (!obj) return false;
      const ok = handleQrObject(obj);
      if (ok && apiEndpoint && info) {
        return true; // close when both gathered
      }
      return false;
    },
    [apiEndpoint, info, handleQrObject, tryParseQrJson]
  );

  const onDetectPaste = useCallback(() => {
    if (!pasteText.trim()) return;
    const obj = tryParseQrJson(pasteText.trim());
    if (!obj) {
      Alert.alert('Invalid', 'Not valid JSON');
      return;
    }
    if (!handleQrObject(obj)) {
      Alert.alert('Unrecognized', 'JSON does not match expected structure.');
      return;
    }
  }, [pasteText, tryParseQrJson, handleQrObject]);

  const onSave = useCallback(async () => {
    if (!(apiEndpoint && info)) return;
    const profile: Profile = {
      apiEndpoint,
      orderNo: info.orderNo,
      recordingNo: info.recordingNo,
      locationCode: info.locationCode,
      bearerToken: bearer.trim() || undefined,
    };
    await saveProfile(profile);
    setExisting(profile);
    Alert.alert('Saved', 'Profile saved locally.');
    onGoWork?.();
  }, [apiEndpoint, info, bearer, onGoWork]);

  const onClear = useCallback(async () => {
    await clearProfile();
    setExisting(null);
    resetScan();
    Alert.alert('Cleared', 'Profile cleared.');
  }, [resetScan]);

  return (
    <VStack flex={1} space="md">
      <Heading size="lg" mt={4}>
        1) Recording Profile
      </Heading>
      <Text color="$textLight600">Scan two QR codes in any order: API Endpoint and Recording Info.</Text>

      <HStack space="md" alignItems="center">
        <Text>API Endpoint:</Text>
        <Badge action={apiEndpoint ? 'success' : 'muted'} variant="solid"><BadgeText>{apiEndpoint ? 'ready' : 'missing'}</BadgeText></Badge>
        <Text ml={8}>Recording Info:</Text>
        <Badge action={info ? 'success' : 'muted'} variant="solid"><BadgeText>{info ? 'ready' : 'missing'}</BadgeText></Badge>
      </HStack>

      <HStack space="md" flexWrap="wrap">
        <Button onPress={() => setScannerVisible(true)}>
          <ButtonText>Scan QR</ButtonText>
        </Button>
        <Button variant="outline" action="secondary" onPress={resetScan}>
          <ButtonText>Reset</ButtonText>
        </Button>
      </HStack>

      <Box mt={4}>
        <Heading size="sm">Paste JSON instead</Heading>
        <Textarea mt={8}>
          <TextareaInput
            value={pasteText}
            onChangeText={setPasteText}
            placeholder='{"apiEndpoint":"<https://...>"} OR {"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}'
            multiline
            numberOfLines={4}
          />
        </Textarea>
        <HStack mt={8}>
          <Button variant="outline" action="secondary" onPress={onDetectPaste}>
            <ButtonText>Detect</ButtonText>
          </Button>
        </HStack>
      </Box>

      <Box mt={8}>
        <Heading size="sm">Advanced: Optional Bearer Token</Heading>
        <Input mt={8}>
          <InputField
            value={bearer}
            onChangeText={setBearer}
            placeholder="Bearer token (optional)"
            secureTextEntry
          />
        </Input>
      </Box>

      <HStack mt={12} space="md" flexWrap="wrap">
        <Button isDisabled={!canSave} onPress={onSave}>
          <ButtonText>Save Profile</ButtonText>
        </Button>
        <Button action="negative" onPress={onClear} variant="solid">
          <ButtonText>Clear Profile</ButtonText>
        </Button>
      </HStack>

      <Box mt={12} p={12} borderColor="$borderDark600" borderWidth={1} borderRadius={8} bg="$backgroundDark950">
        <Heading size="sm">Current Profile</Heading>
        <Text mt={8} fontFamily="monospace" color="$textLight500">{profileSummary}</Text>
      </Box>

      <ScannerModal
        visible={scannerVisible}
        title="Scan QR (API endpoint or Recording info)"
        onClose={() => setScannerVisible(false)}
        onDecoded={(data) => onDecoded(data)}
      />
    </VStack>
  );
}
