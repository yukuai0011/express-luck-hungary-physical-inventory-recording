<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Inventory Recorder</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <section class="card">
        <h2>1) Recording Profile</h2>
        <p>
          Scan two QR codes in any order: <b>API Endpoint</b> and <b>Recording Info</b>.
          They will be combined and saved as a profile cookie.
        </p>

        <div style="display:grid; gap:16px; grid-template-columns: 1fr;" class="ion-padding-top">
          <div>
            <h3>Scan QR Codes</h3>
            <div class="scan-status">
              <div>
                API Endpoint: <span :class="['pill', apiReady ? 'pill-green' : 'pill-gray']">{{ apiReady ? 'ready' : 'missing' }}</span>
              </div>
              <div>
                Recording Info: <span :class="['pill', infoReady ? 'pill-green' : 'pill-gray']">{{ infoReady ? 'ready' : 'missing' }}</span>
              </div>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
              <ion-button @click="startQrScan" :disabled="scanning">Scan QR</ion-button>
              <ion-button fill="outline" @click="resetScan" :disabled="scanning">Reset</ion-button>
            </div>

            <ion-accordion-group class="ion-margin-top">
              <ion-accordion value="paste">
                <ion-item slot="header">
                  <ion-label>Paste JSON instead</ion-label>
                </ion-item>
                <div class="ion-padding" slot="content">
                  <ion-textarea auto-grow fill="outline" v-model="pasteText" :rows="4" placeholder='{"apiEndpoint":"<https://...>"} OR {"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}'></ion-textarea>
                  <div class="ion-margin-top">
                    <ion-button fill="outline" @click="detectPaste">Detect</ion-button>
                  </div>
                </div>
              </ion-accordion>
              <ion-accordion value="token">
                <ion-item slot="header"><ion-label>Advanced: Optional Bearer Token</ion-label></ion-item>
                <div class="ion-padding" slot="content">
                  <ion-input type="password" label="Bearer token (optional)" label-placement="stacked" v-model="bearerToken" />
                </div>
              </ion-accordion>
            </ion-accordion-group>

            <div class="ion-margin-top" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
              <ion-button color="primary" @click="saveProfile" :disabled="!apiReady || !infoReady">Save Profile to Cookie</ion-button>
              <ion-button color="danger" fill="outline" @click="clearProfile">Clear Profile Cookie</ion-button>
            </div>
          </div>

          <div>
            <h3>Current Profile</h3>
            <pre class="ion-padding" style="background:rgba(0,0,0,0.25); border:1px dashed rgba(255,255,255,0.15); border-radius:10px; min-height:64px; white-space:pre-wrap;">
{{ profileSummary }}
            </pre>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>2) Work</h2>
        <p>Use your saved profile to submit package records.</p>

        <ion-item lines="full">
          <ion-label position="stacked">Package No</ion-label>
          <ion-input v-model="packageNo" placeholder="Scan or type package number" />
        </ion-item>
        <div class="ion-margin-top">
          <ion-button @click="startBarcodeScan" :disabled="scanning">Scan Barcode</ion-button>
        </div>

        <ion-item class="ion-margin-top">
          <ion-checkbox v-model="packageIntact">Package intact</ion-checkbox>
        </ion-item>

        <ion-item class="ion-margin-top">
          <ion-label position="stacked">Quantity</ion-label>
          <div style="display:flex; gap:8px; align-items:center; width:100%">
            <ion-button size="small" @click="decQty" :disabled="packageIntact">−</ion-button>
            <ion-input :disabled="packageIntact" type="number" :value="quantity" @ionInput="onQtyInput" />
            <ion-button size="small" @click="incQty" :disabled="packageIntact">+</ion-button>
          </div>
        </ion-item>
        <small class="ion-padding-top" style="display:block; color:#94a3b8">Disabled when Package intact is checked. In that case, your cloud default will be used.</small>

        <div class="ion-margin-top">
          <ion-button color="primary" @click="submit">Submit</ion-button>
        </div>

        <pre class="ion-margin-top ion-padding" style="background: rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.15); border-radius:10px; min-height:48px; white-space:pre-wrap;">{{ resultText }}</pre>
      </section>

      <section class="card">
        <h2>Notes</h2>
        <ul>
          <li>Camera access is required for scanning.</li>
          <li>If your endpoint requires OAuth, provide a bearer token in Profile.</li>
          <li>On Android, ensure the app has camera permission when prompted.</li>
        </ul>
      </section>

      <!-- Simple scanning modal (custom) -->
      <div class="modal" v-show="scanning">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ scanTitle }}</h3>
            <ion-button size="small" fill="clear" @click="stopScan">✕</ion-button>
          </div>
          <video ref="videoRef" autoplay playsinline></video>
          <div class="scan-feedback">{{ scanFeedback }}</div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonAccordion,
  IonAccordionGroup,
  IonItem,
  IonLabel,
  IonTextarea,
  IonInput,
  IonCheckbox
} from '@ionic/vue';
import { BrowserMultiFormatReader } from '@zxing/library';

// --- Reactive state ---
const scannedApi = ref<string | null>(null);
const scannedInfo = ref<{ orderNo: string; recordingNo: number; locationCode: string } | null>(null);
const bearerToken = ref<string>('');
const pasteText = ref<string>('');
const profile = ref<any | null>(null);

const packageNo = ref<string>('');
const packageIntact = ref<boolean>(true);
const quantity = ref<number>(0);
const resultText = ref<string>('');

const scanning = ref(false);
const scanTitle = ref('Scanning…');
const scanFeedback = ref('Point the camera at the code…');
const videoRef = ref<HTMLVideoElement | null>(null);
let reader: BrowserMultiFormatReader | null = null;
let mediaStream: MediaStream | null = null;

// --- Derived ---
const apiReady = computed(() => !!scannedApi.value);
const infoReady = computed(() => !!scannedInfo.value);
const profileSummary = computed(() => {
  if (!profile.value) return 'No profile saved.';
  const safe = {
    apiEndpoint: profile.value.apiEndpoint || '',
    orderNo: profile.value.orderNo || '',
    recordingNo: profile.value.recordingNo ?? '',
    locationCode: profile.value.locationCode || '',
    bearerToken: profile.value.bearerToken ? '(stored)' : '(none)'
  };
  return JSON.stringify(safe, null, 2);
});

// --- Cookie utils ---
function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}
function getCookie(name: string) {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === encodeURIComponent(name) ? decodeURIComponent(parts[1]) : r;
  }, '');
}
function deleteCookie(name: string) {
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

function sanitizeEndpoint(urlLike: string) {
  if (!urlLike || typeof urlLike !== 'string') return '';
  let s = urlLike.trim();
  if (s.startsWith('<') && s.endsWith('>')) s = s.slice(1, -1);
  return s;
}
function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}
function uuidv4() {
  const getRand = () => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      return (crypto.getRandomValues(new Uint8Array(1))[0] & 0xf);
    }
    return Math.floor(Math.random() * 16);
  };
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = getRand();
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function resetScan() {
  scannedApi.value = null;
  scannedInfo.value = null;
  pasteText.value = '';
}

function loadProfileFromCookie() {
  try {
    const raw = getCookie('inventoryProfile');
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.apiEndpoint || !obj.orderNo || obj.recordingNo === undefined || !obj.locationCode) return null;
    return obj;
  } catch {
    return null;
  }
}

function saveProfileToCookie(p: any) {
  setCookie('inventoryProfile', JSON.stringify(p), 365);
}

function tryParseQrJson(text: string) {
  try {
    const obj = JSON.parse(text);
    if (!isObject(obj)) return null;
    return obj as Record<string, unknown>;
  } catch {
    return null;
  }
}

function handleQrObject(obj: Record<string, unknown>) {
  if (typeof obj.apiEndpoint === 'string') {
    scannedApi.value = sanitizeEndpoint(obj.apiEndpoint);
    return true;
  }
  const orderNo = String(obj.orderNo || '').trim();
  const locationCode = String(obj.locationCode || '').trim();
  const recordingNo = Number(obj.recordingNo);
  if (orderNo && locationCode && Number.isFinite(recordingNo)) {
    scannedInfo.value = { orderNo, locationCode, recordingNo };
    return true;
  }
  return false;
}

async function startQrScan() {
  await openScanner('Scan QR (API endpoint or Recording info)', async (text) => {
    const obj = tryParseQrJson(text);
    if (!obj) {
      scanFeedback.value = 'Not JSON. Expecting JSON QR. Keep trying…';
      return; // continue
    }
    const ok = handleQrObject(obj);
    if (!ok) {
      scanFeedback.value = 'JSON format not recognized. Keep trying…';
      return;
    }
    if (scannedApi.value && scannedInfo.value) {
      await stopScan();
    } else {
      scanFeedback.value = 'Got one QR. Scan the other…';
    }
  });
}

async function startBarcodeScan() {
  await openScanner('Scan Package Barcode', async (text) => {
    packageNo.value = text.trim();
    await stopScan();
  });
}

async function openScanner(title: string, onDecoded: (text: string) => void) {
  if (!videoRef.value) return;
  scanTitle.value = title || 'Scanning…';
  scanFeedback.value = 'Point the camera at the code…';
  scanning.value = true;

  reader = new BrowserMultiFormatReader();
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' } }
    });
    videoRef.value.srcObject = mediaStream;
    await videoRef.value.play();
  } catch (e) {
    console.error('Camera error:', e);
    scanFeedback.value = 'Camera access denied or unavailable.';
    // keep modal open to show message
  }

  // Continuous decoding
  try {
    reader.decodeFromVideoDevice(null as any, videoRef.value!, (result) => {
      if (result) {
        try { onDecoded(result.getText()); } catch (e) { console.error(e); }
      }
    });
  } catch (e) {
    console.error('Decode error:', e);
  }
}

async function stopScan() {
  try {
    if (reader) { reader.reset(); reader = null; }
    if (videoRef.value) {
      try { videoRef.value.pause(); } catch {}
      (videoRef.value as any).srcObject = null;
    }
    if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  } finally {
    scanning.value = false;
  }
}

function detectPaste() {
  const text = pasteText.value.trim();
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
}

function saveProfile() {
  if (!(scannedApi.value && scannedInfo.value)) return;
  const p = {
    apiEndpoint: scannedApi.value,
    orderNo: scannedInfo.value.orderNo,
    recordingNo: Number(scannedInfo.value.recordingNo),
    locationCode: scannedInfo.value.locationCode,
    bearerToken: (bearerToken.value || '').trim() || undefined,
  };
  saveProfileToCookie(p);
  profile.value = p;
  alert('Profile saved to cookie.');
}

function clearProfile() {
  deleteCookie('inventoryProfile');
  profile.value = null;
  resetScan();
  alert('Profile cookie cleared.');
}

function decQty() { if (!packageIntact.value) quantity.value = Math.max(0, Number(quantity.value || 0) - 1); }
function incQty() { if (!packageIntact.value) quantity.value = Math.max(0, Number(quantity.value || 0) + 1); }
function onQtyInput(e: any) {
  const v = Number((e.target?.value ?? 0));
  quantity.value = Number.isFinite(v) && v >= 0 ? v : 0;
}

function getActiveProfile() {
  return profile.value || loadProfileFromCookie();
}

async function submit() {
  resultText.value = '';
  // validate
  const p = getActiveProfile();
  if (!p) { resultText.value = 'Error: No profile saved. Please create and save a profile first.'; return; }
  if (!p.apiEndpoint || !/^https?:\/\//i.test(p.apiEndpoint)) { resultText.value = 'Error: Profile API endpoint is invalid.'; return; }
  const pkg = (packageNo.value || '').trim();
  if (!pkg) { resultText.value = 'Error: Package number is required.'; return; }
  const intact = !!packageIntact.value;
  let qty = Number(quantity.value);
  if (!Number.isFinite(qty) || qty < 0) qty = 0;
  if (intact) qty = 0;

  const payload = {
    orderNo: p.orderNo,
    recordingNo: Number(p.recordingNo),
    locationCode: p.locationCode,
    packageNo: pkg,
    quantity: Number(qty),
    packageIntact: Boolean(intact),
  };

  const url = sanitizeEndpoint(p.apiEndpoint);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-ms-client-tracking-id': uuidv4()
  };
  if (p.bearerToken) headers['Authorization'] = `Bearer ${p.bearerToken}`;

  try {
    const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await resp.json();
      resultText.value = `POST ${url}\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nResponse:\n${JSON.stringify({ status: resp.status, ok: resp.ok, json: data }, null, 2)}`;
    } else {
      const txt = await resp.text();
      resultText.value = `POST ${url}\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nResponse:\n${JSON.stringify({ status: resp.status, ok: resp.ok, text: txt }, null, 2)}`;
    }
  } catch (e: any) {
    resultText.value = `POST ${url}\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nResponse:\nRequest failed. This may be due to CORS or network issues.\n${e?.message || e}`;
  }
}

onMounted(() => {
  const existing = loadProfileFromCookie();
  if (existing) profile.value = existing;
});

onBeforeUnmount(() => { stopScan(); });
</script>

<style scoped>
.scan-status { display: grid; gap: 6px; margin: 8px 0 10px; }
h2 { margin: 8px 0 12px; }
</style>
