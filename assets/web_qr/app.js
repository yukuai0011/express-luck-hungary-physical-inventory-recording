/* Inventory Scanner PoC - Frontend logic (embedded-friendly) */
(function () {
  'use strict';

  // --- Query params for embedding bridge ---
  const params = new URLSearchParams(window.location.search);
  const bridge = params.get('bridge'); // e.g., 'nav'
  const start = params.get('start');   // 'qr' | 'barcode'

  // Bridge helper: send decoded text back to host
  function sendToHost(text) {
    if (bridge === 'nav') {
      try {
        const url = 'app://scanned?text=' + encodeURIComponent(text || '');
        window.location.href = url;
        return true;
      } catch (_) {
        // ignore
      }
    }
    return false;
  }

  // --- DOM helpers ---
  const $ = (sel) => document.querySelector(sel);
  const byId = (id) => document.getElementById(id);

  // --- Elements ---
  const statusApi = byId('status-api');
  const statusInfo = byId('status-info');
  const btnScanQr = byId('btn-scan-qr');
  const btnResetScan = byId('btn-reset-scan');
  const btnDetectPaste = byId('btn-detect-paste');
  const pasteJson = byId('paste-json');
  const bearerTokenInput = byId('bearer-token');
  const btnSaveProfile = byId('btn-save-profile');
  const btnClearProfile = byId('btn-clear-profile');
  const profileSummary = byId('profile-summary');

  const packageNoInput = byId('package-no');
  const btnScanBarcode = byId('btn-scan-barcode');
  const pkgIntact = byId('package-intact');
  const qtyInput = byId('quantity');
  const qtyMinus = byId('qty-minus');
  const qtyPlus = byId('qty-plus');
  const btnSubmit = byId('btn-submit');
  const resultDiv = byId('result');

  // Scanner modal
  const scannerModal = byId('scanner-modal');
  const scannerTitle = byId('scanner-title');
  const btnCloseScanner = byId('btn-close-scanner');
  const videoEl = byId('video');
  const scanFeedback = byId('scan-feedback');

  // --- State ---
  let scannedApi = null; // string URL
  let scannedInfo = null; // { orderNo, recordingNo, locationCode }
  let currentProfile = null; // persisted profile

  // ZXing reader
  let codeReader = null;
  let currentStream = null;

  // --- Cookie utilities ---
  function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  }
  function getCookie(name) {
    return document.cookie.split('; ').reduce((r, v) => {
      const parts = v.split('=');
      return parts[0] === encodeURIComponent(name) ? decodeURIComponent(parts[1]) : r;
    }, '');
  }
  function deleteCookie(name) {
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }

  // --- Utils ---
  function isObject(val) {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
  }

  function sanitizeEndpoint(urlLike) {
    if (!urlLike || typeof urlLike !== 'string') return '';
    let s = urlLike.trim();
    // strip surrounding angle brackets like <https://...>
    if (s.startsWith('<') && s.endsWith('>')) {
      s = s.slice(1, -1);
    }
    return s;
  }

  function uuidv4() {
    // RFC4122 v4 UUID
    const getRand = () => {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        return crypto.getRandomValues(new Uint8Array(1))[0] & 0xf;
      }
      return Math.floor(Math.random() * 16);
    };
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = getRand();
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function setStatusPill(el, ok) {
    el.textContent = ok ? 'ready' : 'missing';
    el.classList.remove('pill-gray', 'pill-yellow', 'pill-green');
    el.classList.add(ok ? 'pill-green' : 'pill-gray');
  }

  function updateSaveProfileButton() {
    btnSaveProfile.disabled = !(scannedApi && scannedInfo);
  }

  function renderProfileSummary(profile) {
    if (!profile) {
      profileSummary.innerHTML = '<em>No profile saved.</em>';
      return;
    }
    const safe = {
      apiEndpoint: profile.apiEndpoint || '',
      orderNo: profile.orderNo || '',
      recordingNo: profile.recordingNo ?? '',
      locationCode: profile.locationCode || '',
      bearerToken: profile.bearerToken ? '(stored)' : '(none)'
    };
    profileSummary.textContent = JSON.stringify(safe, null, 2);
  }

  function loadProfileFromCookie() {
    try {
      const raw = getCookie('inventoryProfile');
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

  function saveProfileToCookie(profile) {
    setCookie('inventoryProfile', JSON.stringify(profile), 365);
  }

  function resetScanState() {
    scannedApi = null;
    scannedInfo = null;
    setStatusPill(statusApi, false);
    setStatusPill(statusInfo, false);
    updateSaveProfileButton();
    pasteJson.value = '';
  }

  // --- Scanning / ZXing ---
  async function openScannerModal(title) {
    scannerTitle.textContent = title || 'Scanning…';
    scannerModal.hidden = false;
  }
  async function closeScannerModal() {
    scannerModal.hidden = true;
    scanFeedback.textContent = 'Point the camera at the code…';
    await stopScanner();
  }

  async function startScanner({ onDecoded, tryFacingMode = 'environment' }) {
    if (!window.ZXing || !window.ZXing.BrowserMultiFormatReader) {
      throw new Error('ZXing library not loaded');
    }
    codeReader = new ZXing.BrowserMultiFormatReader();

    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: tryFacingMode },
      },
    };

    try {
      currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      videoEl.srcObject = currentStream;
      await videoEl.play();
    } catch (e) {
      console.error('Camera error:', e);
      scanFeedback.textContent = 'Camera access denied or unavailable.';
      throw e;
    }

    // Continuous decode loop
    codeReader.decodeFromVideoDevice(null, videoEl, (result, err, controls) => {
      if (result) {
        try {
          onDecoded(result.getText());
        } catch (e) {
          console.error('onDecoded handler error', e);
        }
      }
      // errors are expected while scanning; ignore until a result is decoded
    });
  }

  async function stopScanner() {
    try {
      if (codeReader) {
        codeReader.reset();
        codeReader = null;
      }
      if (videoEl) {
        videoEl.pause();
        videoEl.srcObject = null;
      }
      if (currentStream) {
        currentStream.getTracks().forEach((t) => t.stop());
        currentStream = null;
      }
    } catch (e) {
      // swallow
    }
  }

  // --- QR handling for profile ---
  function tryParseQrJson(text) {
    try {
      const obj = JSON.parse(text);
      if (!isObject(obj)) return null;
      return obj;
    } catch (e) {
      return null;
    }
  }

  function handleQrObject(obj) {
    if (obj && typeof obj.apiEndpoint === 'string') {
      scannedApi = sanitizeEndpoint(obj.apiEndpoint);
      setStatusPill(statusApi, true);
      return true;
    }
    if (obj && (obj.orderNo || obj.locationCode || obj.recordingNo !== undefined)) {
      const orderNo = String(obj.orderNo || '').trim();
      const locationCode = String(obj.locationCode || '').trim();
      const recordingNo = Number(obj.recordingNo);
      if (orderNo && locationCode && Number.isFinite(recordingNo)) {
        scannedInfo = { orderNo, locationCode, recordingNo };
        setStatusPill(statusInfo, true);
        return true;
      }
    }
    return false;
  }

  async function startQrScanFlow() {
    await openScannerModal('Scan QR (API endpoint or Recording info)');
    const onDecoded = async (text) => {
      const obj = tryParseQrJson(text);
      if (!obj) {
        scanFeedback.textContent = 'Not JSON. Expecting JSON QR. Keep trying…';
        return; // continue scanning
      }
      const ok = handleQrObject(obj);
      if (!ok) {
        scanFeedback.textContent = 'JSON format not recognized. Keep trying…';
        return;
      }
      // In embed mode, immediately send first success to host
      if (sendToHost(text)) {
        return;
      }
      // success for one code; if both present, stop
      updateSaveProfileButton();
      if (scannedApi && scannedInfo) {
        await closeScannerModal();
      } else {
        // keep scanning for second code, brief feedback
        scanFeedback.textContent = 'Got one QR. Scan the other…';
      }
    };
    try {
      await startScanner({ onDecoded });
    } catch (e) {
      // already surfaced
    }
  }

  // --- Barcode handling for package ---
  async function startBarcodeScanFlow() {
    await openScannerModal('Scan Package Barcode');
    const onDecoded = async (text) => {
      // In embed mode, send to host
      if (sendToHost(text)) {
        return;
      }
      // Accept first decoded; fill input and stop
      packageNoInput.value = text.trim();
      await closeScannerModal();
    };
    try {
      await startScanner({ onDecoded });
    } catch (e) {
      // already surfaced
    }
  }

  // --- Submission ---
  function getActiveProfile() {
    if (currentProfile) return currentProfile;
    const fromCookie = loadProfileFromCookie();
    if (fromCookie) currentProfile = fromCookie;
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
    const pkg = packageNoInput.value.trim();
    if (!pkg) {
      throw new Error('Package number is required.');
    }
    const intact = !!pkgIntact.checked;
    let qty = Number(qtyInput.value);
    if (!Number.isFinite(qty) || qty < 0) qty = 0;
    if (intact) qty = 0; // per business rule

    return {
      profile,
      payload: {
        orderNo: profile.orderNo,
        recordingNo: Number(profile.recordingNo),
        locationCode: profile.locationCode,
        packageNo: pkg,
        quantity: Number(qty),
        packageIntact: Boolean(intact),
      },
    };
  }

  async function submitPayload() {
    resultDiv.textContent = '';
    let pre;
    try {
      pre = validateBeforeSubmit();
    } catch (e) {
      resultDiv.textContent = `Error: ${e.message || e}`;
      return;
    }

    const { profile, payload } = pre;
    const url = sanitizeEndpoint(profile.apiEndpoint);
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-ms-client-tracking-id': uuidv4()
    };
    if (profile.bearerToken) {
      headers['Authorization'] = `Bearer ${profile.bearerToken}`;
    }

    let respText = '';
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        // mode: 'cors' // default; Power Automate endpoint must allow CORS
      });
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await resp.json();
        respText = JSON.stringify({ status: resp.status, ok: resp.ok, json: data }, null, 2);
      } else {
        const txt = await resp.text();
        respText = JSON.stringify({ status: resp.status, ok: resp.ok, text: txt }, null, 2);
      }
    } catch (e) {
      respText = `Request failed. This may be due to CORS or network issues.\n${e.message || e}`;
    }

    resultDiv.textContent = `POST ${url}\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nResponse:\n${respText}`;
  }

  // --- Event wiring ---
  btnScanQr.addEventListener('click', startQrScanFlow);
  btnResetScan.addEventListener('click', resetScanState);
  btnDetectPaste.addEventListener('click', () => {
    const text = pasteJson.value.trim();
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
  });

  btnSaveProfile.addEventListener('click', () => {
    if (!(scannedApi && scannedInfo)) return;
    const profile = {
      apiEndpoint: scannedApi,
      orderNo: scannedInfo.orderNo,
      recordingNo: Number(scannedInfo.recordingNo),
      locationCode: scannedInfo.locationCode,
      bearerToken: bearerTokenInput.value.trim() || undefined,
    };
    saveProfileToCookie(profile);
    currentProfile = profile;
    renderProfileSummary(profile);
    alert('Profile saved to cookie.');
  });

  btnClearProfile.addEventListener('click', () => {
    deleteCookie('inventoryProfile');
    currentProfile = null;
    renderProfileSummary(null);
    resetScanState();
    alert('Profile cookie cleared.');
  });

  btnScanBarcode.addEventListener('click', startBarcodeScanFlow);

  btnCloseScanner.addEventListener('click', closeScannerModal);

  pkgIntact.addEventListener('change', () => {
    const disabled = pkgIntact.checked;
    qtyInput.disabled = disabled;
    qtyInput.style.opacity = disabled ? 0.6 : 1;
    if (disabled) qtyInput.value = '0';
  });
  // initialize state based on default checked
  (function initQtyDisabled() {
    const disabled = pkgIntact.checked;
    qtyInput.disabled = disabled;
    qtyInput.style.opacity = disabled ? 0.6 : 1;
  })();

  qtyMinus.addEventListener('click', () => {
    if (qtyInput.disabled) return;
    const v = Math.max(0, Number(qtyInput.value || 0) - 1);
    qtyInput.value = String(v);
  });
  qtyPlus.addEventListener('click', () => {
    if (qtyInput.disabled) return;
    const v = Math.max(0, Number(qtyInput.value || 0) + 1);
    qtyInput.value = String(v);
  });

  btnSubmit.addEventListener('click', submitPayload);

  // Load existing profile on startup
  (function init() {
    resetScanState();
    const existing = loadProfileFromCookie();
    if (existing) {
      currentProfile = existing;
      renderProfileSummary(existing);
    } else {
      renderProfileSummary(null);
    }

    // Auto start when embedded
    if (bridge && (start === 'qr' || start === 'barcode')) {
      setTimeout(() => {
        if (start === 'qr') startQrScanFlow();
        else startBarcodeScanFlow();
      }, 100);
    }
  })();
})();
