import { BarcodeScanner } from 'nativescript-barcodescanner';

const scanner = new BarcodeScanner();

export interface ScanResult {
  text: string;
  format: string;
}

export async function requestCameraPermission(): Promise<boolean> {
  try {
    const granted = await scanner.hasCameraPermission();
    if (!granted) {
      return await scanner.requestCameraPermission();
    }
    return true;
  } catch (error) {
    console.error('Permission error:', error);
    return false;
  }
}

export async function scanBarcode(): Promise<ScanResult | null> {
  try {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      throw new Error('Camera permission denied');
    }

    const result = await scanner.scan({
      formats: 'QR_CODE, EAN_13, EAN_8, CODE_128, CODE_39',
      cancelLabel: 'Cancel',
      cancelLabelBackgroundColor: '#333333',
      message: 'Point the camera at the barcode/QR code',
      showFlipCameraButton: true,
      showTorchButton: true,
      torchOn: false,
      resultDisplayDuration: 500,
      beepOnScan: true,
      reportDuplicates: true,
      preferFrontCamera: false
    });

    if (result && result.text) {
      return {
        text: result.text,
        format: result.format
      };
    }

    return null;
  } catch (error) {
    console.error('Scan error:', error);
    throw error;
  }
}

export async function scanQRCode(): Promise<ScanResult | null> {
  try {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      throw new Error('Camera permission denied');
    }

    const result = await scanner.scan({
      formats: 'QR_CODE',
      cancelLabel: 'Cancel',
      cancelLabelBackgroundColor: '#333333',
      message: 'Point the camera at the QR code',
      showFlipCameraButton: true,
      showTorchButton: true,
      torchOn: false,
      resultDisplayDuration: 500,
      beepOnScan: true,
      reportDuplicates: false,
      preferFrontCamera: false
    });

    if (result && result.text) {
      return {
        text: result.text,
        format: result.format
      };
    }

    return null;
  } catch (error) {
    console.error('QR scan error:', error);
    throw error;
  }
}
