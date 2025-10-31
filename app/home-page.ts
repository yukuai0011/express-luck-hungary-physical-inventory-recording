import { EventData, Page, TextField, TextView, Label, Switch } from '@nativescript/core';
import { ApplicationSettings } from '@nativescript/core';
import { Http } from '@nativescript/core';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const BarcodeScanner = require('nativescript-barcodescanner').BarcodeScanner;

let page: Page;
let statusApiLabel: Label;
let statusInfoLabel: Label;
let pasteJsonView: TextView;
let bearerTokenField: TextField;
let btnSaveProfileEnabled = false;
let profileSummaryView: TextView;

let packageNoField: TextField;
let packageIntactSwitch: Switch;
let quantityField: TextField;
let resultView: TextView;

const scanner = new BarcodeScanner();

let scannedApi: string | null = null;
let scannedInfo: { orderNo: string; recordingNo: number; locationCode: string } | null = null;
let currentProfile: any = null;

export function onNavigatingTo(args: EventData) {
  page = args.object as Page;
  statusApiLabel = page.getViewById('statusApi') as Label;
  statusInfoLabel = page.getViewById('statusInfo') as Label;
  pasteJsonView = page.getViewById('pasteJson') as TextView;
  bearerTokenField = page.getViewById('bearerToken') as TextField;
  profileSummaryView = page.getViewById('profileSummary') as TextView;

  packageNoField = page.getViewById('packageNo') as TextField;
  packageIntactSwitch = page.getViewById('packageIntact') as Switch;
  quantityField = page.getViewById('quantity') as TextField;
  resultView = page.getViewById('result') as TextView;

  resetScanState();
  const existing = loadProfileFromStorage();
  if (existing) {
    currentProfile = existing;
    renderProfileSummary(existing);
  } else {
    renderProfileSummary(null);
  }
  updateQtyDisabled();
}

function setStatusPill(label: Label, ok: boolean) {
  label.text = ok ? 'ready' : 'missing';
}

function updateSaveProfileButton() {
  btnSaveProfileEnabled = Boolean(scannedApi && scannedInfo);
}

function renderProfileSummary(profile: any) {
  if (!profile) {
    profileSummaryView.text = 'No profile saved.';
    return;
  }
  const safe = {
    apiEndpoint: profile.apiEndpoint || '',
    orderNo: profile.orderNo || '',
    recordingNo: profile.recordingNo ?? '',
    locationCode: profile.locationCode || '',
    bearerToken: profile.bearerToken ? '(stored)' : '(none)'
  };
  profileSummaryView.text = JSON.stringify(safe, null, 2);
}

function sanitizeEndpoint(urlLike: string): string {
  if (!urlLike || typeof urlLike !== 'string') return '';
  let s = urlLike.trim();
  if (s.startsWith('<') && s.endsWith('>')) {
    s = s.slice(1, -1);
  }
  return s;
}

function uuidv4(): string {
  const getRand = () => Math.floor(Math.random() * 16) & 0xf;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = getRand();
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isObject(val: any) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function tryParseQrJson(text: string) {
  try {
    const obj = JSON.parse(text);
    if (!isObject(obj)) return null;
    return obj;
  } catch (e) {
    return null;
  }
}

function handleQrObject(obj: any) {
  if (obj && typeof obj.apiEndpoint === 'string') {
    scannedApi = sanitizeEndpoint(obj.apiEndpoint);
    setStatusPill(statusApiLabel, true);
    return true;
  }
  if (obj && (obj.orderNo || obj.locationCode || obj.recordingNo !== undefined)) {
    const orderNo = String(obj.orderNo || '').trim();
    const locationCode = String(obj.locationCode || '').trim();
    const recordingNo = Number(obj.recordingNo);
    if (orderNo && locationCode && Number.isFinite(recordingNo)) {
      scannedInfo = { orderNo, locationCode, recordingNo };
      setStatusPill(statusInfoLabel, true);
      return true;
    }
  }
  return false;
}

export function onResetScan() {
  resetScanState();
}

function resetScanState() {
  scannedApi = null;
  scannedInfo = null;
  setStatusPill(statusApiLabel, false);
  setStatusPill(statusInfoLabel, false);
  updateSaveProfileButton();
  if (pasteJsonView) pasteJsonView.text = '';
}

export async function onScanQr() {
  try {
    const hasPerm = await scanner.hasCameraPermission();
    if (!hasPerm) {
      await scanner.requestCameraPermission();
    }
    await scanner.scan({
      formats: 'QR_CODE',
      showTorchButton: true,
      showFlipCameraButton: true,
      beepOnScan: true,
      // continuous support
      continuousScanCallback: (result) => {
        const text = result.text || '';
        const obj = tryParseQrJson(text);
        if (!obj) {
          return; // keep scanning
        }
        const ok = handleQrObject(obj);
        if (ok) {
          updateSaveProfileButton();
          if (scannedApi && scannedInfo) {
            scanner.stop();
          }
        }
      },
      reportDuplicates: false
    });
  } catch (e) {
    // ignore
  }
}

export function onDetectPaste() {
  const text = (pasteJsonView.text || '').trim();
  if (!text) return;
  const obj = tryParseQrJson(text);
  if (!obj) {
    alert('Not valid JSON.');
    return;
  }
  if (!handleQrObject(obj)) {
    alert('JSON does not match expected structure.');
    return;
  }
  updateSaveProfileButton();
}

function saveProfileToStorage(profile: any) {
  ApplicationSettings.setString('inventoryProfile', JSON.stringify(profile));
}
function loadProfileFromStorage() {
  try {
    const raw = ApplicationSettings.getString('inventoryProfile');
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.apiEndpoint || !obj.orderNo || obj.recordingNo === undefined || !obj.locationCode) {
      return null;
    }
    return obj;
  } catch (e) {
    return null;
  }
}

export function onSaveProfile() {
  if (!(scannedApi && scannedInfo)) return;
  const profile = {
    apiEndpoint: scannedApi,
    orderNo: scannedInfo.orderNo,
    recordingNo: Number(scannedInfo.recordingNo),
    locationCode: scannedInfo.locationCode,
    bearerToken: (bearerTokenField.text || '').trim() || undefined
  };
  saveProfileToStorage(profile);
  currentProfile = profile;
  renderProfileSummary(profile);
  alert('Profile saved.');
}

export function onClearProfile() {
  ApplicationSettings.remove('inventoryProfile');
  currentProfile = null;
  renderProfileSummary(null);
  resetScanState();
  alert('Profile cleared.');
}

export async function onScanBarcode() {
  try {
    const hasPerm = await scanner.hasCameraPermission();
    if (!hasPerm) {
      await scanner.requestCameraPermission();
    }
    const result = await scanner.scan({
      showTorchButton: true,
      showFlipCameraButton: true,
      beepOnScan: true,
      formats: 'QR_CODE, CODE_39, CODE_93, CODE_128, EAN_8, EAN_13, ITF, UPC_A, UPC_E, DATA_MATRIX'
    });
    if (result && result.text && packageNoField) {
      packageNoField.text = String(result.text).trim();
    }
  } catch (e) {
    // ignore
  }
}

function updateQtyDisabled() {
  const disabled = packageIntactSwitch.checked;
  if (disabled) {
    quantityField.text = '0';
  }
  quantityField.isEnabled = !disabled;
}

export function onQtyMinus() {
  if (!quantityField.isEnabled) return;
  const v = Math.max(0, Number(quantityField.text || 0) - 1);
  quantityField.text = String(v);
}

export function onQtyPlus() {
  if (!quantityField.isEnabled) return;
  const v = Math.max(0, Number(quantityField.text || 0) + 1);
  quantityField.text = String(v);
}

export function onSubmit() {
  resultView.text = '';
  let pre;
  try {
    pre = validateBeforeSubmit();
  } catch (e) {
    resultView.text = `Error: ${e instanceof Error ? e.message : e}`;
    return;
  }

  const { profile, payload } = pre;
  const url = sanitizeEndpoint(profile.apiEndpoint);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-ms-client-tracking-id': uuidv4()
  };
  if (profile.bearerToken) {
    headers['Authorization'] = `Bearer ${profile.bearerToken}`;
  }

  Http.request({
    url,
    method: 'POST',
    headers,
    content: JSON.stringify(payload)
  }).then((resp) => {
    const ct = resp.headers ? String(resp.headers['Content-Type'] || resp.headers['content-type'] || '') : '';
    let respText = '';
    if (ct.toLowerCase().includes('application/json')) {
      try {
        const json = resp.content && resp.content.toString() ? JSON.parse(resp.content.toString()) : null;
        respText = JSON.stringify({ status: resp.statusCode, ok: resp.statusCode >= 200 && resp.statusCode < 300, json }, null, 2);
      } catch (e) {
        respText = JSON.stringify({ status: resp.statusCode, ok: resp.statusCode >= 200 && resp.statusCode < 300, text: resp.content && resp.content.toString() }, null, 2);
      }
    } else {
      respText = JSON.stringify({ status: resp.statusCode, ok: resp.statusCode >= 200 && resp.statusCode < 300, text: resp.content && resp.content.toString() }, null, 2);
    }
    resultView.text = `POST ${url}\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nResponse:\n${respText}`;
  }).catch((e) => {
    resultView.text = `Request failed.\n${e instanceof Error ? e.message : e}`;
  });
}

function getActiveProfile() {
  if (currentProfile) return currentProfile;
  const fromStorage = loadProfileFromStorage();
  if (fromStorage) currentProfile = fromStorage;
  return currentProfile;
}

function validateBeforeSubmit() {
  const profile = getActiveProfile();
  if (!profile) {
    throw new Error('No profile saved. Please create and save a profile first.');
  }
  if (!profile.apiEndpoint || !/^https?:\/\//i.test(profile.apiEndpoint)) {
    throw new Error('Profile API endpoint is invalid.');
  }
  const pkg = String(packageNoField.text || '').trim();
  if (!pkg) {
    throw new Error('Package number is required.');
  }
  const intact = !!packageIntactSwitch.checked;
  let qty = Number(quantityField.text);
  if (!Number.isFinite(qty) || qty < 0) qty = 0;
  if (intact) qty = 0; // business rule

  return {
    profile,
    payload: {
      orderNo: profile.orderNo,
      recordingNo: Number(profile.recordingNo),
      locationCode: profile.locationCode,
      packageNo: pkg,
      quantity: Number(qty),
      packageIntact: Boolean(intact)
    }
  };
}
