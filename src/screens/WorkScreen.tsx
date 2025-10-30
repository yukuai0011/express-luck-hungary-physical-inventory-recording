import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
  Box,
  Button,
  ButtonText,
  Checkbox,
  CheckboxIndicator,
  CheckboxIcon,
  CheckboxLabel,
  CheckboxGroup,
  HStack,
  Input,
  InputField,
  Text,
  VStack,
  Heading,
} from '@gluestack-ui/themed';
import { loadProfile } from '../storage/profile';
import type { Profile, SubmissionPayload } from '../types';
import ScannerModal from '../components/ScannerModal';
import { sanitizeEndpoint } from '../utils/sanitizeEndpoint';
import { generateUUIDv4 } from '../utils/uuid';

type Props = {
  onGoProfile?: () => void;
};

export default function WorkScreen({ onGoProfile }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pkg, setPkg] = useState('');
  const [intact, setIntact] = useState(true);
  const [qty, setQty] = useState(0);
  const [result, setResult] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    loadProfile().then((p) => setProfile(p));
  }, []);

  const qtyDisabled = intact;

  const decreaseQty = useCallback(() => {
    if (qtyDisabled) return;
    setQty((v) => Math.max(0, v - 1));
  }, [qtyDisabled]);
  const increaseQty = useCallback(() => {
    if (qtyDisabled) return;
    setQty((v) => Math.max(0, v + 1));
  }, [qtyDisabled]);

  useEffect(() => {
    if (intact) setQty(0);
  }, [intact]);

  const validate = useCallback(() => {
    if (!profile) throw new Error('No profile saved. Please create and save a profile first.');
    if (!profile.apiEndpoint || !/^https?:\/\//i.test(profile.apiEndpoint)) {
      throw new Error('Profile API endpoint is invalid.');
    }
    const packageNo = pkg.trim();
    if (!packageNo) throw new Error('Package number is required.');
    let q = qtyDisabled ? 0 : qty;
    if (!Number.isFinite(q) || q < 0) q = 0;
    return {
      profile,
      payload: {
        orderNo: profile.orderNo,
        recordingNo: Number(profile.recordingNo),
        locationCode: profile.locationCode,
        packageNo,
        quantity: Number(q),
        packageIntact: Boolean(intact),
      } as SubmissionPayload,
    };
  }, [profile, pkg, qty, qtyDisabled, intact]);

  const onSubmit = useCallback(async () => {
    setResult('');
    let pre;
    try {
      pre = validate();
    } catch (e: any) {
      Alert.alert('Error', e?.message || String(e));
      return;
    }

    const { profile: p, payload } = pre;
    const url = sanitizeEndpoint(p.apiEndpoint);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-ms-client-tracking-id': generateUUIDv4(),
    };
    if (p.bearerToken) headers['Authorization'] = `Bearer ${p.bearerToken}`;

    let respText = '';
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await resp.json();
        respText = JSON.stringify({ status: resp.status, ok: resp.ok, json: data }, null, 2);
      } else {
        const txt = await resp.text();
        respText = JSON.stringify({ status: resp.status, ok: resp.ok, text: txt }, null, 2);
      }
    } catch (e: any) {
      respText = `Request failed. This may be due to CORS or network issues.\n${e?.message || String(e)}`;
    }

    setResult(`POST ${url}\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nResponse:\n${respText}`);
  }, [validate]);

  return (
    <VStack flex={1} space="md">
      <Heading size="lg" mt={4}>2) Work</Heading>
      {!profile ? (
        <Box p={12} borderWidth={1} borderColor="$borderDark600" borderRadius={8}>
          <Text color="$textLight500">No profile saved. Go to Profile to set up.</Text>
          <Button mt={8} onPress={onGoProfile}><ButtonText>Go to Profile</ButtonText></Button>
        </Box>
      ) : null}

      <Box>
        <Text mb={6}>Use your saved profile to submit package records.</Text>
        <Text>Package No</Text>
        <HStack mt={6} space="md" alignItems="center" flexWrap="wrap">
          <Input flex={1} minWidth={220}>
            <InputField value={pkg} onChangeText={setPkg} placeholder="Scan or type package number" />
          </Input>
          <Button onPress={() => setScannerVisible(true)}><ButtonText>Scan Barcode</ButtonText></Button>
        </HStack>
      </Box>

      <Box>
        <CheckboxGroup>
          <Checkbox value="intact" isChecked={intact} onChange={setIntact}>
            <CheckboxIndicator><CheckboxIcon /></CheckboxIndicator>
            <CheckboxLabel ml={8}>Package intact</CheckboxLabel>
          </Checkbox>
        </CheckboxGroup>
      </Box>

      <Box>
        <Text>Quantity</Text>
        <HStack mt={6} space="md" alignItems="center">
          <Button variant="outline" action="secondary" onPress={decreaseQty} isDisabled={qtyDisabled}>
            <ButtonText>−</ButtonText>
          </Button>
          <Input width={120} isDisabled={qtyDisabled}>
            <InputField
              inputMode="numeric"
              value={String(qty)}
              onChangeText={(t) => setQty(Math.max(0, Number(t || '0') || 0))}
            />
          </Input>
          <Button variant="outline" action="secondary" onPress={increaseQty} isDisabled={qtyDisabled}>
            <ButtonText>+</ButtonText>
          </Button>
        </HStack>
        <Text color="$textLight500" mt={4}>Disabled when Package intact is checked. In that case, your cloud default will be used.</Text>
      </Box>

      <HStack mt={12}>
        <Button onPress={onSubmit}><ButtonText>Submit</ButtonText></Button>
      </HStack>

      <Box mt={12} p={12} borderColor="$borderDark600" borderWidth={1} borderRadius={8} bg="$backgroundDark950">
        <Text fontFamily="monospace" color="$textLight500">{result}</Text>
      </Box>

      <ScannerModal
        visible={scannerVisible}
        title="Scan Package Barcode"
        onClose={() => setScannerVisible(false)}
        onDecoded={(data) => {
          setPkg(data.trim());
          return true; // close after first scan
        }}
      />
    </VStack>
  );
}
