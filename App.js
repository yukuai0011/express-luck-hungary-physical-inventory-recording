import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, Modal, View, ScrollView, KeyboardAvoidingView, Platform, TextInput, Switch } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { GluestackUIProvider, Box, Text, VStack, HStack, Button } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { loadProfile, saveProfile, clearProfile } from './src/lib/storage';
import { isObject, sanitizeEndpoint, uuidv4 } from './src/lib/utils';

export default function App() {
  return (
    <GluestackUIProvider config={config}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 12 }}>
            <MainScreen />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GluestackUIProvider>
  );
}

function Pill({ ok, label }) {
  return (
    <Box
      px={8}
      py={2}
      borderRadius={999}
      bg={ok ? '#065f46' : '#374151'}
      alignItems="center"
      justifyContent="center"
    >
      <Text size="xs" color="#fff">{label}: {ok ? 'ready' : 'missing'}</Text>
    </Box>
  );
}

function SectionCard({ children }) {
  return (
    <Box
      bg="#111827"
      borderWidth={1}
      borderColor="rgba(255,255,255,0.08)"
      borderRadius={14}
      p={12}
      mt={12}
      style={{ shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 3 }}
    >
      {children}
    </Box>
  );
}

function MainScreen() {
  const [scannedApi, setScannedApi] = useState(null);
  const [scannedInfo, setScannedInfo] = useState(null);
  const [bearerToken, setBearerToken] = useState('');
  const [profile, setProfile] = useState(null);

  const [packageNo, setPackageNo] = useState('');
  const [pkgIntact, setPkgIntact] = useState(true);
  const [quantity, setQuantity] = useState('0');

  const [scanVisible, setScanVisible] = useState(false);
  const [scanMode, setScanMode] = useState('qr'); // 'qr' | 'barcode'
  const [hasPermission, setHasPermission] = useState(null);
  const [resultText, setResultText] = useState('');

  useEffect(() => {
    (async () => {
      const loaded = await loadProfile();
      if (loaded) setProfile(loaded);
    })();
  }, []);

  const canSaveProfile = !!(scannedApi && scannedInfo);

  function resetScanState() {
    setScannedApi(null);
    setScannedInfo(null);
  }

  function tryParseQrJson(text) {
    try {
      const obj = JSON.parse(text);
      if (!isObject(obj)) return null;
      return obj;
    } catch {
      return null;
    }
  }

  function handleQrObject(obj) {
    if (obj && typeof obj.apiEndpoint === 'string') {
      setScannedApi(sanitizeEndpoint(obj.apiEndpoint));
      return true;
    }
    if (obj && (obj.orderNo || obj.locationCode || obj.recordingNo !== undefined)) {
      const orderNo = String(obj.orderNo || '').trim();
      const locationCode = String(obj.locationCode || '').trim();
      const recordingNo = Number(obj.recordingNo);
      if (orderNo && locationCode && Number.isFinite(recordingNo)) {
        setScannedInfo({ orderNo, locationCode, recordingNo });
        return true;
      }
    }
    return false;
  }

  async function openScanner(mode) {
    setScanMode(mode);
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === 'granted');
    setScanVisible(true);
  }

  function closeScanner() {
    setScanVisible(false);
  }

  const onBarCodeScanned = ({ type, data }) => {
    if (!scanVisible) return;
    if (scanMode === 'qr') {
      const obj = tryParseQrJson(data);
      if (!obj) return; // keep scanning until JSON
      const ok = handleQrObject(obj);
      if (!ok) return; // keep scanning until structure recognized
      if (scannedApi && scannedInfo) {
        setScanVisible(false);
      }
    } else {
      setPackageNo(String(data || '').trim());
      setScanVisible(false);
    }
  };

  function renderProfileSummary(p) {
    if (!p) return <Text italic color="#94a3b8">No profile saved.</Text>;
    const safe = {
      apiEndpoint: p.apiEndpoint || '',
      orderNo: p.orderNo || '',
      recordingNo: p.recordingNo ?? '',
      locationCode: p.locationCode || '',
      bearerToken: p.bearerToken ? '(stored)' : '(none)'
    };
    return (
      <Box bg="rgba(0,0,0,0.25)" borderWidth={1} borderColor="rgba(255,255,255,0.15)" borderRadius={10} p={10}>
        <Text style={{ fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), opacity: 0.95 }}>{JSON.stringify(safe, null, 2)}</Text>
      </Box>
    );
  }

  async function onSaveProfile() {
    if (!(scannedApi && scannedInfo)) return;
    const p = {
      apiEndpoint: scannedApi,
      orderNo: scannedInfo.orderNo,
      recordingNo: Number(scannedInfo.recordingNo),
      locationCode: scannedInfo.locationCode,
      bearerToken: bearerToken.trim() || undefined
    };
    await saveProfile(p);
    setProfile(p);
    alert('Profile saved to device.');
  }

  async function onClearProfile() {
    await clearProfile();
    setProfile(null);
    resetScanState();
    alert('Profile cleared.');
  }

  useEffect(() => {
    if (pkgIntact) setQuantity('0');
  }, [pkgIntact]);

  function validateBeforeSubmit() {
    const p = profile;
    if (!p) throw new Error('No profile saved. Please create and save a profile first.');
    if (!p.apiEndpoint || !/^https?:\/\//i.test(p.apiEndpoint)) throw new Error('Profile API endpoint is invalid.');
    const pkg = String(packageNo || '').trim();
    if (!pkg) throw new Error('Package number is required.');
    const intact = !!pkgIntact;
    let qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0) qty = 0;
    if (intact) qty = 0;
    return {
      profile: p,
      payload: {
        orderNo: p.orderNo,
        recordingNo: Number(p.recordingNo),
        locationCode: p.locationCode,
        packageNo: pkg,
        quantity: Number(qty),
        packageIntact: Boolean(intact)
      }
    };
  }

  async function submitPayload() {
    setResultText('');
    let pre;
    try {
      pre = validateBeforeSubmit();
    } catch (e) {
      setResultText(`Error: ${e.message || e}`);
      return;
    }
    const { profile: p, payload } = pre;
    const url = sanitizeEndpoint(p.apiEndpoint);
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-ms-client-tracking-id': uuidv4()
    };
    if (p.bearerToken) headers['Authorization'] = `Bearer ${p.bearerToken}`;

    let respText = '';
    try {
      const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await resp.json();
        respText = JSON.stringify({ status: resp.status, ok: resp.ok, json: data }, null, 2);
      } else {
        const txt = await resp.text();
        respText = JSON.stringify({ status: resp.status, ok: resp.ok, text: txt }, null, 2);
      }
    } catch (e) {
      respText = `Request failed.\n${e.message || e}`;
    }
    setResultText(`POST ${url}\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nResponse:\n${respText}`);
  }

  return (
    <>
      <VStack space="md">
        <Box alignItems="center" mt={8}>
          <Text size="xl" bold>Inventory Scanner PoC</Text>
          <Text color="#94a3b8">React Native + Expo + GlueStack UI</Text>
        </Box>

        <SectionCard>
          <Text size="lg" bold mb={8}>1) Recording Profile</Text>
          <Text color="#94a3b8">Scan two QR codes in any order to establish a profile: API Endpoint and Recording Info. The app will combine and save them on your device.</Text>
          <VStack space="sm" mt={10}>
            <HStack space="sm">
              <Pill ok={!!scannedApi} label="API Endpoint" />
              <Pill ok={!!scannedInfo} label="Recording Info" />
            </HStack>

            <HStack space="sm" mt={6} flexWrap="wrap">
              <Button onPress={() => openScanner('qr')}>Scan QR</Button>
              <Button variant="outline" onPress={resetScanState}>Reset</Button>
            </HStack>

            <Box mt={8}>
              <Text bold>Paste JSON instead</Text>
              <TextInput
                placeholder='{"apiEndpoint":"<https://...>"} OR {"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}'
                multiline
                numberOfLines={4}
                onChangeText={(t) => {
                  const obj = tryParseQrJson(t);
                  if (obj) handleQrObject(obj);
                }}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.16)',
                  borderRadius: 8,
                  color: '#e5e7eb',
                  paddingHorizontal: 10,
                  paddingVertical: 8
                }}
              />
            </Box>

            <Box mt={8}>
              <Text bold>Advanced: Optional Bearer Token</Text>
              <TextInput
                secureTextEntry
                placeholder="Bearer token (optional)"
                value={bearerToken}
                onChangeText={setBearerToken}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.16)',
                  borderRadius: 8,
                  color: '#e5e7eb',
                  paddingHorizontal: 10,
                  paddingVertical: 8
                }}
              />
            </Box>

            <HStack space="sm" mt={8} flexWrap="wrap">
              <Button isDisabled={!canSaveProfile} onPress={onSaveProfile}>Save Profile to Device</Button>
              <Button variant="outline" onPress={onClearProfile} colorScheme="red">Clear Profile</Button>
            </HStack>

            <Box mt={10}>
              <Text bold>Current Profile</Text>
              {renderProfileSummary(profile)}
            </Box>
          </VStack>
        </SectionCard>

        <SectionCard>
          <Text size="lg" bold mb={8}>2) Work</Text>
          <VStack space="md">
            <Box>
              <Text bold>Package No</Text>
              <HStack space="sm" alignItems="center">
                <View style={{ flex: 1 }}>
                  <TextInput
                    placeholder="Scan or type package number"
                    value={packageNo}
                    onChangeText={setPackageNo}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.16)',
                      borderRadius: 8,
                      color: '#e5e7eb',
                      paddingHorizontal: 10,
                      paddingVertical: 8
                    }}
                  />
                </View>
                <Button onPress={() => openScanner('barcode')}>Scan Barcode</Button>
              </HStack>
            </Box>

            <Box>
              <HStack space="sm" alignItems="center">
                <Switch value={pkgIntact} onValueChange={setPkgIntact} />
                <Text>Package intact</Text>
              </HStack>
            </Box>

            <Box>
              <Text bold>Quantity</Text>
              <HStack space="sm" alignItems="center">
                <Button variant="outline" onPress={() => { if (!pkgIntact) setQuantity(String(Math.max(0, Number(quantity || 0) - 1))); }}>−</Button>
                <View style={{ flex: 1 }}>
                  <TextInput
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={(t) => setQuantity(t.replace(/[^0-9]/g, ''))}
                    editable={!pkgIntact}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.16)',
                      borderRadius: 8,
                      color: '#e5e7eb',
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      opacity: pkgIntact ? 0.6 : 1
                    }}
                  />
                </View>
                <Button variant="outline" onPress={() => { if (!pkgIntact) setQuantity(String(Math.max(0, Number(quantity || 0) + 1))); }}>+</Button>
              </HStack>
              <Text color="#94a3b8" mt={4}>Disabled when Package intact is checked. In that case, your cloud default will be used.</Text>
            </Box>

            <HStack mt={8}>
              <Button onPress={submitPayload}>Submit</Button>
            </HStack>

            <Box mt={8} bg="rgba(0,0,0,0.25)" borderWidth={1} borderColor="rgba(255,255,255,0.15)" borderRadius={10} p={10}>
              <Text style={{ fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) }}>{resultText}</Text>
            </Box>
          </VStack>
        </SectionCard>

        <SectionCard>
          <Text size="lg" bold mb={8}>Notes</Text>
          <VStack space="xs">
            <Text>• Camera access is required for scanning.</Text>
            <Text>• If your endpoint requires OAuth, provide a bearer token in Profile.</Text>
            <Text>• Mobile apps are not affected by browser CORS.</Text>
          </VStack>
        </SectionCard>
      </VStack>

      <Modal visible={scanVisible} animationType="slide" onRequestClose={closeScanner}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0b1225' }}>
          <VStack p={12} space="md" flex={1}>
            <HStack alignItems="center" justifyContent="space-between">
              <Text size="lg" bold>{scanMode === 'qr' ? 'Scan QR (API endpoint or Recording info)' : 'Scan Package Barcode'}</Text>
              <Button variant="outline" onPress={closeScanner}>Close</Button>
            </HStack>
            {hasPermission === false ? (
              <Text color="#ef4444">Camera permission denied.</Text>
            ) : (
              <View style={{ flex: 1, overflow: 'hidden', borderRadius: 8 }}>
                <BarCodeScanner
                  onBarCodeScanned={onBarCodeScanned}
                  style={{ width: '100%', height: '100%' }}
                />
              </View>
            )}
            <Text color="#94a3b8">Point the camera at the code…</Text>
          </VStack>
        </SafeAreaView>
      </Modal>
    </>
  );
}
