import React, { useEffect, useState } from 'react';
import { Modal, Platform, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';

// Only use camera on Android/iOS; on Windows show a fallback
let Camera: any = null;
let useCameraDevices: any = null;
let useBarcodeScanner: any = null;
try {
  // These imports work in the RN app runtime; they will fail in this workspace context.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const vc = require('react-native-vision-camera');
  Camera = vc.Camera;
  useCameraDevices = vc.useCameraDevices;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useBarcodeScanner = require('@mgcrea/vision-camera-barcode-scanner').useBarcodeScanner;
} catch {}

export function ScanScreen({ mode, onDecoded, onClose }: { mode: 'qr' | 'barcode'; onDecoded: (value: string) => void; onClose: () => void }) {
  const [visible, setVisible] = useState(true);

  if (!(Platform.OS === 'android' || Platform.OS === 'ios') || !Camera) {
    return (
      <Modal visible={visible} transparent onRequestClose={() => { setVisible(false); onClose(); }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#111827', padding: 16, borderRadius: 12, width: '90%' }}>
            <Text style={{ color: 'white', marginBottom: 8 }}>Camera scanning is supported on Android/iOS only.</Text>
            <TouchableOpacity onPress={() => { setVisible(false); onClose(); }} style={{ padding: 10, backgroundColor: '#2563eb', borderRadius: 8, alignSelf: 'flex-end' }}>
              <Text style={{ color: 'white' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  if (!useBarcodeScanner) {
    // Plugin not available, show fallback
    return (
      <Modal visible={visible} transparent onRequestClose={() => { setVisible(false); onClose(); }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#111827', padding: 16, borderRadius: 12, width: '90%' }}>
            <Text style={{ color: 'white', marginBottom: 8 }}>Barcode/QR plugin not available. Please type manually or try again.</Text>
            <TouchableOpacity onPress={() => { setVisible(false); onClose(); }} style={{ padding: 10, backgroundColor: '#2563eb', borderRadius: 8, alignSelf: 'flex-end' }}>
              <Text style={{ color: 'white' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return <MobileScanModal mode={mode} onDecoded={onDecoded} onClose={onClose} />;
}

function MobileScanModal({ mode, onDecoded, onClose }: { mode: 'qr' | 'barcode'; onDecoded: (value: string) => void; onClose: () => void }) {
  const devices = useCameraDevices();
  const device = devices.back ?? devices.external ?? devices.front;
  const [visible, setVisible] = useState(true);

  const { props: cameraProps } = useBarcodeScanner({
    fps: 5,
    barcodeTypes: mode === 'qr' ? ['qr'] : ['qr', 'ean-13', 'code-128', 'code-39'],
    onBarcodeScanned: (barcodes: any[]) => {
      'worklet';
      if (barcodes && barcodes.length > 0) {
        // We don't have access to setState from a worklet; schedule on JS thread
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { runOnJS } = require('react-native-worklets-core');
        runOnJS((val: string) => {
          setVisible(false);
          onDecoded(val);
        })(String(barcodes[0]?.value ?? ''));
      }
    },
  });

  useEffect(() => {
    (async () => {
      const { Camera } = require('react-native-vision-camera');
      const status = await Camera.getCameraPermissionStatus();
      if (status !== 'authorized') {
        await Camera.requestCameraPermission();
      }
    })();
  }, []);

  if (!device) return null;

  return (
    <Modal visible={visible} transparent onRequestClose={() => { setVisible(false); onClose(); }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#0b1225', padding: 12, borderRadius: 12, width: '94%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ color: 'white', fontWeight: '600' }}>{mode === 'qr' ? 'Scan QR' : 'Scan Barcode'}</Text>
            <TouchableOpacity onPress={() => { setVisible(false); onClose(); }}>
              <Text style={{ color: 'white' }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 360, overflow: 'hidden', borderRadius: 8 }}>
            <Camera style={{ flex: 1 }} device={device} isActive={visible} {...cameraProps} />
          </View>
          <Text style={{ color: '#94a3b8', marginTop: 6 }}>Point the camera at the code…</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
