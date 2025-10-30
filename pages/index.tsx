"use client";

import Head from 'next/head';
import Script from 'next/script';
import { useEffect } from 'react';

// Declare ZXing global for TypeScript
declare global {
  interface Window {
    ZXing?: any;
  }
}

export default function Home() {
  useEffect(() => {
    // The following logic is adapted from the original app.js and runs on the client
    // --- DOM helpers ---
    const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null;
    const byId = (id: string) => document.getElementById(id) as HTMLElement & { value?: string; checked?: boolean } | null;

    // --- Elements ---
    const statusApi = byId('status-api')!;
    const statusInfo = byId('status-info')!;
    const btnScanQr = byId('btn-scan-qr')!;
    const btnResetScan = byId('btn-reset-scan')!;
    const btnDetectPaste = byId('btn-detect-paste')!;
    const pasteJson = byId('paste-json') as HTMLTextAreaElement;
    const bearerTokenInput = byId('bearer-token') as HTMLInputElement;
    const btnSaveProfile = byId('btn-save-profile') as HTMLButtonElement;
    const btnClearProfile = byId('btn-clear-profile') as HTMLButtonElement;
    const profileSummary = byId('profile-summary')!;

    const packageNoInput = byId('package-no') as HTMLInputElement;
    const btnScanBarcode = byId('btn-scan-barcode') as HTMLButtonElement;
    const pkgIntact = byId('package-intact') as HTMLInputElement;
    const qtyInput = byId('quantity') as HTMLInputElement;
    const qtyMinus = byId('qty-minus') as HTMLButtonElement;
    const qtyPlus = byId('qty-plus') as HTMLButtonElement;
    const btnSubmit = byId('btn-submit') as HTMLButtonElement;
    const resultDiv = byId('result')!;

    // Scanner modal
    const scannerModal = byId('scanner-modal')!;
    const scannerTitle = byId('scanner-title')!;
    const btnCloseScanner = byId('btn-close-scanner') as HTMLButtonElement;
    const videoEl = byId('video') as HTMLVideoElement;
    const scanFeedback = byId('scan-feedback')!;

    // --- State ---
    let scannedApi: string | null = null; // string URL
    let scannedInfo: { orderNo: string; recordingNo: number; locationCode: string } | null = null; // info
    let currentProfile: any = null; // persisted profile

    // ZXing reader
    let codeReader: any = null;
    let currentStream: MediaStream | null = null;

    // --- Cookie utilities ---
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

    // --- Utils ---
    function isObject(val: any) {
      return val !== null && typeof val === 'object' && !Array.isArray(val);
    }

    function sanitizeEndpoint(urlLike: string) {
      if (!urlLike || typeof urlLike !== 'string') return '';
      let s = urlLike.trim();
      // strip surrounding angle brackets like <https://...>
      if (s.startsWith('<') && s.endsWith('>')) {
        s = s.slice(1, -1);
      }
      return s;
    }

    function uuidv4() {
      const getRand = () => {
        if (typeof crypto !== 'undefined' && (crypto as any).getRandomValues) {
          return (crypto as any).getRandomValues(new Uint8Array(1))[0] & 0xf;
        }
        return Math.floor(Math.random() * 16);
      };
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = getRand();
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    function setStatusPill(el: HTMLElement, ok: boolean) {
      el.textContent = ok ? 'ready' : 'missing';
      el.classList.remove('pill-gray', 'pill-yellow', 'pill-green');
      el.classList.add(ok ? 'pill-green' : 'pill-gray');
    }

    function updateSaveProfileButton() {
      (btnSaveProfile as HTMLButtonElement).disabled = !(scannedApi && scannedInfo);
    }

    function renderProfileSummary(profile: any) {
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

    function saveProfileToCookie(profile: any) {
      setCookie('inventoryProfile', JSON.stringify(profile), 365);
    }

    function resetScanState() {
      scannedApi = null;
      scannedInfo = null;
      setStatusPill(statusApi, false);
      setStatusPill(statusInfo, false);
      if (pasteJson) pasteJson.value = '';
      updateSaveProfileButton();
    }

    // --- Scanning / ZXing ---
    async function openScannerModal(title?: string) {
      scannerTitle.textContent = title || 'Scanning…';
      (scannerModal as any).hidden = false;
    }
    async function closeScannerModal() {
      (scannerModal as any).hidden = true;
      scanFeedback.textContent = 'Point the camera at the code…';
      await stopScanner();
    }

    async function startScanner({ onDecoded, tryFacingMode = 'environment' }: { onDecoded: (text: string) => void; tryFacingMode?: 'environment' | 'user' }) {
      if (!window.ZXing || !window.ZXing.BrowserMultiFormatReader) {
        throw new Error('ZXing library not loaded');
      }
      codeReader = new window.ZXing.BrowserMultiFormatReader();

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: tryFacingMode },
        },
      } as any;

      try {
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoEl.srcObject = currentStream as any;
        await videoEl.play();
      } catch (e) {
        console.error('Camera error:', e);
        scanFeedback.textContent = 'Camera access denied or unavailable.';
        throw e;
      }

      // Continuous decode loop
      codeReader.decodeFromVideoDevice(null, videoEl, (result: any, err: any, controls: any) => {
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
          (videoEl as any).srcObject = null;
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
      const onDecoded = async (text: string) => {
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
      const onDecoded = async (text: string) => {
        // Accept first decoded; fill input and stop
        if (packageNoInput) packageNoInput.value = text.trim();
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
      const pkg = (packageNoInput?.value || '').trim();
      if (!pkg) {
        throw new Error('Package number is required.');
      }
      const intact = !!pkgIntact?.checked;
      let qty = Number(qtyInput?.value);
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
      if (resultDiv) resultDiv.textContent = '';
      let pre: any;
      try {
        pre = validateBeforeSubmit();
      } catch (e: any) {
        if (resultDiv) resultDiv.textContent = `Error: ${e.message || e}`;
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
        respText = `Request failed. This may be due to CORS or network issues.\n${e.message || e}`;
      }

      if (resultDiv) resultDiv.textContent = `POST ${url}\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nResponse:\n${respText}`;
    }

    // --- Event wiring ---
    btnScanQr?.addEventListener('click', startQrScanFlow);
    btnResetScan?.addEventListener('click', resetScanState);
    btnDetectPaste?.addEventListener('click', () => {
      const text = (pasteJson?.value || '').trim();
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

    btnSaveProfile?.addEventListener('click', () => {
      if (!(scannedApi && scannedInfo)) return;
      const profile = {
        apiEndpoint: scannedApi,
        orderNo: scannedInfo.orderNo,
        recordingNo: Number(scannedInfo.recordingNo),
        locationCode: scannedInfo.locationCode,
        bearerToken: (bearerTokenInput?.value || '').trim() || undefined,
      };
      saveProfileToCookie(profile);
      currentProfile = profile;
      renderProfileSummary(profile);
      alert('Profile saved to cookie.');
    });

    btnClearProfile?.addEventListener('click', () => {
      deleteCookie('inventoryProfile');
      currentProfile = null;
      renderProfileSummary(null);
      resetScanState();
      alert('Profile cookie cleared.');
    });

    btnScanBarcode?.addEventListener('click', startBarcodeScanFlow);
    btnCloseScanner?.addEventListener('click', closeScannerModal);

    pkgIntact?.addEventListener('change', () => {
      const disabled = !!pkgIntact?.checked;
      if (qtyInput) {
        qtyInput.disabled = disabled;
        (qtyInput.style as any).opacity = disabled ? '0.6' : '1';
        if (disabled) qtyInput.value = '0';
      }
    });
    // initialize state based on default checked
    (function initQtyDisabled() {
      const disabled = !!pkgIntact?.checked;
      if (qtyInput) {
        qtyInput.disabled = disabled;
        (qtyInput.style as any).opacity = disabled ? '0.6' : '1';
      }
    })();

    qtyMinus?.addEventListener('click', () => {
      if (qtyInput?.disabled) return;
      const v = Math.max(0, Number(qtyInput?.value || 0) - 1);
      if (qtyInput) qtyInput.value = String(v);
    });
    qtyPlus?.addEventListener('click', () => {
      if (qtyInput?.disabled) return;
      const v = Math.max(0, Number(qtyInput?.value || 0) + 1);
      if (qtyInput) qtyInput.value = String(v);
    });

    btnSubmit?.addEventListener('click', submitPayload);

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
    })();

    return () => {
      // Cleanup listeners and camera
      btnScanQr?.removeEventListener('click', startQrScanFlow);
      btnResetScan?.removeEventListener('click', resetScanState);
      btnDetectPaste?.removeEventListener('click', () => {});
      btnSaveProfile?.removeEventListener('click', () => {});
      btnClearProfile?.removeEventListener('click', () => {});
      btnScanBarcode?.removeEventListener('click', startBarcodeScanFlow);
      btnCloseScanner?.removeEventListener('click', closeScannerModal);
      qtyMinus?.removeEventListener('click', () => {});
      qtyPlus?.removeEventListener('click', () => {});
      btnSubmit?.removeEventListener('click', submitPayload);
      stopScanner();
    };
  }, []);

  return (
    <>
      <Head>
        <title>Inventory Scanner PoC</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header>
        <h1>Inventory Scanner PoC</h1>
        <p className="subtitle">GitHub Pages-ready, camera-enabled QR/Barcode app</p>
      </header>

      <main>
        <section className="card" id="profile-section">
          <h2>1) Recording Profile</h2>
          <p>
            Scan two QR codes in any order to establish a profile: <strong>API Endpoint</strong> and <strong>Recording Info</strong>. The app will combine and save them as a cookie.
          </p>

          <div className="grid two">
            <div>
              <h3>Scan QR Codes</h3>
              <div className="scan-status" id="scan-status">
                <div>
                  API Endpoint: <span id="status-api" className="pill pill-gray">missing</span>
                </div>
                <div>
                  Recording Info: <span id="status-info" className="pill pill-gray">missing</span>
                </div>
              </div>
              <div className="actions-row">
                <button id="btn-scan-qr" className="btn">Scan QR</button>
                <button id="btn-reset-scan" className="btn btn-secondary">Reset</button>
              </div>
              <details className="mt-8">
                <summary>Paste JSON instead</summary>
                <div className="paste-area">
                  <label htmlFor="paste-json">Paste QR JSON text, then click Detect:</label>
                  <textarea id="paste-json" rows={4} placeholder='{"apiEndpoint":"<https://...>"} OR {"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}'></textarea>
                  <div className="actions-row">
                    <button id="btn-detect-paste" className="btn btn-secondary">Detect</button>
                  </div>
                </div>
              </details>

              <details className="mt-8">
                <summary>Advanced: Optional Bearer Token</summary>
                <p>If your endpoint requires OAuth, paste a bearer token below. It will be saved in the profile cookie.</p>
                <input id="bearer-token" type="password" placeholder="Bearer token (optional)" />
              </details>

              <div className="actions-row mt-12">
                <button id="btn-save-profile" className="btn btn-primary" disabled>Save Profile to Cookie</button>
                <button id="btn-clear-profile" className="btn btn-danger">Clear Profile Cookie</button>
              </div>
            </div>

            <div>
              <h3>Current Profile</h3>
              <div id="profile-summary" className="profile">
                <em>No profile saved.</em>
              </div>
            </div>
          </div>
        </section>

        <section className="card" id="work-section">
          <h2>2) Work</h2>
          <p>Use your saved profile to submit package records.</p>

          <div className="form-row">
            <label htmlFor="package-no">Package No</label>
            <div className="inline">
              <input id="package-no" type="text" placeholder="Scan or type package number" />
              <button id="btn-scan-barcode" className="btn">Scan Barcode</button>
            </div>
          </div>

          <div className="form-row">
            <label className="checkbox">
              <input id="package-intact" type="checkbox" defaultChecked />
              Package intact
            </label>
          </div>

          <div className="form-row">
            <label htmlFor="quantity">Quantity</label>
            <div className="quantity-row">
              <button id="qty-minus" className="btn btn-icon" aria-label="Decrease quantity">−</button>
              <input id="quantity" type="number" min={0} step={1} defaultValue={0} />
              <button id="qty-plus" className="btn btn-icon" aria-label="Increase quantity">+</button>
            </div>
            <small className="hint">Disabled when Package intact is checked. In that case, your cloud default will be used.</small>
          </div>

          <div className="actions-row mt-12">
            <button id="btn-submit" className="btn btn-primary">Submit</button>
          </div>

          <div id="result" className="result mt-12"></div>
        </section>

        <section className="card" id="about-section">
          <h2>Notes</h2>
          <ul>
            <li>Camera access is required for scanning. Use a modern browser (Chrome, Edge, Safari ≥17).</li>
            <li>If your endpoint requires OAuth, provide a bearer token in Profile. Otherwise, signed URLs with a <code>sig</code> parameter typically work without a token.</li>
            <li>When hosted on GitHub Pages, cross-origin (CORS) must be allowed by your Power Automate endpoint.</li>
          </ul>
        </section>
      </main>

      {/* Simple scanning modal */}
      <div id="scanner-modal" className="modal" hidden>
        <div className="modal-content">
          <div className="modal-header">
            <h3 id="scanner-title">Scanning…</h3>
            <button id="btn-close-scanner" className="btn btn-icon" aria-label="Close">✕</button>
          </div>
          <video id="video" autoPlay playsInline />
          <div id="scan-feedback" className="scan-feedback">Point the camera at the code…</div>
        </div>
      </div>

      {/* ZXing UMD */}
      <Script src="https://unpkg.com/@zxing/library@0.21.2" strategy="afterInteractive" />
    </>
  );
}
