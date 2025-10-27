import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, SafeAreaView, ScrollView, Text, TextInput, ToastAndroid, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScanScreen } from './src/ScanScreen';

// Simple daisy-like utility components via NativeWind classes
// We assume NativeWind is configured; className works as RN prop in the generated app.

type Profile = {
  apiEndpoint: string;
  orderNo: string;
  recordingNo: number;
  locationCode: string;
  bearerToken?: string | null;
};

type OutboxItem = {
  url: string;
  headers?: Record<string, string | undefined | null>;
  payload: any;
  ts: string;
};

const K_PROFILE = 'profile';
const K_OUTBOX = 'outbox';

function isAndroidOrIOS() {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

function pill(label: string, ok: boolean) {
  return (
    <View className={`px-3 py-1 rounded-full ${ok ? 'bg-green-700' : 'bg-gray-700'} mr-2 mb-2`}>
      <Text className="text-white">{label}: {ok ? 'ready' : 'missing'}</Text>
    </View>
  );
}

export default function App() {
  // Profile scanning state
  const [scannedApi, setScannedApi] = useState<string | null>(null);
  const [scannedInfo, setScannedInfo] = useState<Partial<Profile> | null>(null);
  const [bearer, setBearer] = useState('');

  // Work state
  const [packageNo, setPackageNo] = useState('');
  const [intact, setIntact] = useState(true);
  const [quantity, setQuantity] = useState(0);
  const [result, setResult] = useState('');

  const [showScanner, setShowScanner] = useState<null | { mode: 'qr' | 'barcode' }>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [outboxCount, setOutboxCount] = useState(0);

  const hasBoth = useMemo(() => !!scannedApi && !!scannedInfo, [scannedApi, scannedInfo]);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(K_PROFILE);
      if (raw) {
        try { setProfile(JSON.parse(raw)); } catch {}
      }
      const box = await AsyncStorage.getItem(K_OUTBOX);
      if (box) {
        try { const arr = JSON.parse(box) as OutboxItem[]; setOutboxCount(arr.length); } catch {}
      }
    })();
  }, []);

  const handleDetectPastedJson = useCallback((text: string) => {
    try {
      const obj = JSON.parse(text);
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
    } catch {
      return false;
    }
  }, []);

  const onScanDecoded = useCallback((text: string) => {
    const ok = handleDetectPastedJson(text);
    if (!ok && Platform.OS === 'android') ToastAndroid.show('Not JSON or unexpected structure; keep scanning…', ToastAndroid.SHORT);
    setShowScanner(null);
  }, [handleDetectPastedJson]);

  const onSaveProfile = useCallback(async () => {
    if (!hasBoth) return;
    const p: Profile = {
      apiEndpoint: scannedApi!,
      orderNo: String(scannedInfo!.orderNo),
      recordingNo: Number(scannedInfo!.recordingNo),
      locationCode: String(scannedInfo!.locationCode),
      bearerToken: bearer.trim() || null,
    };
    await AsyncStorage.setItem(K_PROFILE, JSON.stringify(p));
    setProfile(p);
    Alert.alert('Saved', 'Profile saved.');
  }, [hasBoth, scannedApi, scannedInfo, bearer]);

  const sanitizeEndpoint = (s: string) => {
    let t = s.trim();
    if (t.startsWith('<') && t.endsWith('>')) t = t.slice(1, -1);
    return t;
  };

  const submit = useCallback(async () => {
    setResult('');
    if (!profile) { Alert.alert('Missing', 'No profile saved.'); return; }
    const url = sanitizeEndpoint(profile.apiEndpoint);
    if (!/^https?:\/\//i.test(url)) { Alert.alert('Invalid', 'Profile API endpoint is invalid.'); return; }
    const pkg = packageNo.trim();
    if (!pkg) { Alert.alert('Missing', 'Package number is required.'); return; }
    const qty = intact ? 0 : quantity;
    const payload = {
      orderNo: profile.orderNo,
      recordingNo: Number(profile.recordingNo),
      locationCode: profile.locationCode,
      packageNo: pkg,
      quantity: Number(qty),
      packageIntact: Boolean(intact),
    };
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-ms-client-tracking-id': uuidv4(),
      };
      if (profile.bearerToken) headers['Authorization'] = `Bearer ${profile.bearerToken}`;
      const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
      const ct = resp.headers.get('content-type') || '';
      let bodyOut = '';
      if (ct.includes('application/json')) {
        try { bodyOut = JSON.stringify(await resp.json()); } catch { bodyOut = await resp.text(); }
      } else { bodyOut = await resp.text(); }
      setResult(`POST ${url}\nPayload:\n${JSON.stringify(payload)}\n\nResponse:\n${JSON.stringify({ status: resp.status, ok: resp.ok, body: bodyOut })}`);
    } catch (e: any) {
      // queue
      const raw = (await AsyncStorage.getItem(K_OUTBOX)) || '[]';
      let arr: OutboxItem[] = [];
      try { arr = JSON.parse(raw); } catch {}
      arr.push({ url, headers: profile.bearerToken ? { Authorization: `Bearer ${profile.bearerToken}` } : undefined, payload, ts: new Date().toISOString() });
      await AsyncStorage.setItem(K_OUTBOX, JSON.stringify(arr));
      setOutboxCount(arr.length);
      setResult(`Request failed. Saved to queue.\n${String(e?.message || e)}`);
    }
  }, [profile, packageNo, intact, quantity]);

  const syncNow = useCallback(async () => {
    const raw = (await AsyncStorage.getItem(K_OUTBOX)) || '[]';
    let arr: OutboxItem[] = [];
    try { arr = JSON.parse(raw); } catch {}
    let success = 0;
    const remain: OutboxItem[] = [];
    for (const it of arr) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json', 'Accept': 'application/json', 'x-ms-client-tracking-id': uuidv4(),
        };
        if (it.headers?.Authorization) headers['Authorization'] = String(it.headers.Authorization);
        const resp = await fetch(it.url, { method: 'POST', headers, body: JSON.stringify(it.payload) });
        if (resp.ok) success++; else remain.push(it);
      } catch { remain.push(it); }
    }
    await AsyncStorage.setItem(K_OUTBOX, JSON.stringify(remain));
    setOutboxCount(remain.length);
    Alert.alert('Sync', success > 0 ? `Synced ${success} item(s)` : 'Nothing synced');
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-base-200">
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        {/* Profile */}
        <View className="bg-base-100 rounded-xl p-4 mb-4 border border-neutral/20">
          <Text className="text-xl font-semibold mb-1">1) Recording Profile</Text>
          <Text className="text-neutral-400 mb-2">Scan two QR codes in any order to establish a profile: API Endpoint and Recording Info. Then save.</Text>
          <View className="flex-row flex-wrap mb-2">
            {pill('API Endpoint', !!scannedApi)}
            {pill('Recording Info', !!scannedInfo)}
          </View>
          <View className="flex-row gap-2 mb-2">
            <Button title="Scan QR" onPress={() => isAndroidOrIOS() ? setShowScanner({ mode: 'qr' }) : Alert.alert('Info','Camera scanning is supported on Android/iOS only. Use Paste JSON.') } />
            <Button outlined title="Reset" onPress={() => { setScannedApi(null); setScannedInfo(null); }} />
          </View>
          <Details title="Paste JSON instead">
            <Paste onDetect={(text) => { const ok = handleDetectPastedJson(text); if (!ok) Alert.alert('Invalid','Not valid JSON or unexpected format'); }} />
          </Details>
          <Details title="Advanced: Optional Bearer Token">
            <TextInput className="border rounded-lg p-2" placeholder="Bearer token (optional)" secureTextEntry value={bearer} onChangeText={setBearer} />
          </Details>
          <View className="flex-row gap-2 mt-2">
            <Button title="Save Profile" disabled={!hasBoth} onPress={onSaveProfile} />
            <Button outlined title="Clear Saved Profile" onPress={async () => { await AsyncStorage.removeItem(K_PROFILE); setProfile(null); }} />
          </View>
          <Text className="mt-2">Current Profile</Text>
          <View className="border rounded-lg p-2 mt-1">
            <Text selectable>{profile ? JSON.stringify({ apiEndpoint: profile.apiEndpoint, orderNo: profile.orderNo, recordingNo: profile.recordingNo, locationCode: profile.locationCode, bearerToken: profile.bearerToken ? '(stored)' : '(none)' }, null, 2) : '(No profile saved)'}</Text>
          </View>
        </View>

        {/* Work */}
        <View className="bg-base-100 rounded-xl p-4 mb-4 border border-neutral/20">
          <Text className="text-xl font-semibold mb-1">2) Work</Text>
          <Text className="text-neutral-400 mb-2">Use your saved profile to submit package records.</Text>
          <View className="flex-row items-center gap-2 mb-2">
            <TextInput className="flex-1 border rounded-lg p-2" placeholder="Scan or type package number" value={packageNo} onChangeText={setPackageNo} />
            <Button outlined title="Scan" onPress={() => isAndroidOrIOS() ? setShowScanner({ mode: 'barcode' }) : Alert.alert('Info','Camera scanning is supported on Android/iOS only. Type the package number.')} />
          </View>
          <TouchableOpacity onPress={() => setIntact(v => !v)}>
            <Text className="mb-2">{intact ? '☑' : '☐'} Package intact</Text>
          </TouchableOpacity>
          <View style={{ opacity: intact ? 0.6 : 1 }} pointerEvents={intact ? 'none' : 'auto'}>
            <View className="flex-row items-center gap-2 mb-2">
              <Button outlined title="-" onPress={() => setQuantity(q => Math.max(0, q - 1))} />
              <TextInput className="w-24 border rounded-lg p-2 text-center" value={String(quantity)} editable={false} />
              <Button outlined title="+" onPress={() => setQuantity(q => q + 1)} />
            </View>
          </View>
          <Button title="Submit" onPress={submit} />
          {result ? (
            <View className="border rounded-lg p-2 mt-2"><Text selectable>{result}</Text></View>
          ) : null}
        </View>

        {/* Outbox */}
        <View className="bg-base-100 rounded-xl p-4 mb-4 border border-neutral/20">
          <Text className="text-xl font-semibold mb-1">Offline queue</Text>
          <Text className="text-neutral-400 mb-2">Pending submissions: {outboxCount}</Text>
          <View className="flex-row gap-2">
            <Button outlined title="Sync now" onPress={syncNow} />
            <Button outlined title="Clear" onPress={async () => { await AsyncStorage.setItem(K_OUTBOX, '[]'); setOutboxCount(0); }} />
          </View>
        </View>
      </ScrollView>

      {showScanner ? (
        <ScanScreen
          mode={showScanner.mode}
          onDecoded={(text) => {
            if (showScanner.mode === 'qr') {
              const ok = handleDetectPastedJson(text);
              if (!ok) Alert.alert('Invalid','Not JSON or unexpected format');
            } else {
              setPackageNo(text.trim());
            }
            setShowScanner(null);
          }}
          onClose={() => setShowScanner(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function Button({ title, onPress, outlined, disabled }: { title: string; onPress?: () => void; outlined?: boolean; disabled?: boolean }) {
  const base = outlined ? 'border border-neutral/40 bg-transparent' : 'bg-primary';
  const text = outlined ? 'text-primary' : 'text-white';
  const opacity = disabled ? 'opacity-50' : '';
  return (
    <TouchableOpacity onPress={disabled ? undefined : onPress} className={`px-4 py-2 rounded-lg ${base} ${opacity}`}>
      <Text className={`font-medium ${text}`}>{title}</Text>
    </TouchableOpacity>
  );
}

function Details({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View className="mb-2">
      <TouchableOpacity onPress={() => setOpen(o => !o)}>
        <Text className="text-primary font-medium">{open ? '▾' : '▸'} {title}</Text>
      </TouchableOpacity>
      {open ? <View className="mt-2">{children}</View> : null}
    </View>
  );
}

function Paste({ onDetect }: { onDetect: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <View>
      <TextInput className="border rounded-lg p-2" multiline placeholder='{"apiEndpoint":"<https://...>"} or {"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}' value={text} onChangeText={setText} />
      <View className="mt-2">
        <Button outlined title="Detect" onPress={() => onDetect(text.trim())} />
      </View>
    </View>
  );
}

function uuidv4() {
  const rnd = (n: number) => Math.floor(Math.random() * n);
  const s4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  return `${s4()}${s4()}-${s4()}-4${((rnd(0x1000)) | 0x800).toString(16).substring(1)}-${((rnd(0x1000)) | 0x800).toString(16).substring(1)}-${s4()}${s4()}${s4()}`;
}
