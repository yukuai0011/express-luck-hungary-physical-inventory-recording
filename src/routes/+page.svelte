<script>
  import ScannerModal from '$lib/components/ScannerModal.svelte';

  // profile state
  let apiEndpoint = '';
  let orderNo = '';
  let recordingNo = '';
  let locationCode = '';
  let bearerToken = '';

  let hasProfile = false;

  // work state
  let packageNo = '';
  let packageIntact = false;
  let quantity = 1;
  let isSubmitting = false;
  let submitMessage = '';
  let submitKind = /** @type {'success'|'error'|''} */('');

  // scanner modal
  let showScanner = false;
  let scanKind = /** @type {'qr'|'barcode'} */('qr');
  let qrTarget = /** @type {'api'|'recording'} */('api');

  function setProfileFromObj(p) {
    apiEndpoint = (p.apiEndpoint ?? '').toString().trim();
    // trim angle brackets if present
    if (apiEndpoint.startsWith('<') && apiEndpoint.endsWith('>')) {
      apiEndpoint = apiEndpoint.slice(1, -1);
    }
    orderNo = (p.orderNo ?? '').toString();
    recordingNo = (p.recordingNo ?? '').toString();
    locationCode = (p.locationCode ?? '').toString();
    if (p.bearerToken) bearerToken = p.bearerToken.toString();
  }

  function saveProfile() {
    const profile = { apiEndpoint, orderNo, recordingNo, locationCode, bearerToken };
    localStorage.setItem('inventoryProfile', JSON.stringify(profile));
    hasProfile = true;
  }

  function loadProfile() {
    const raw = localStorage.getItem('inventoryProfile');
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      setProfileFromObj(p);
      hasProfile = !!(apiEndpoint && orderNo && recordingNo && locationCode);
    } catch {}
  }

  function clearProfile() {
    localStorage.removeItem('inventoryProfile');
    apiEndpoint = orderNo = recordingNo = locationCode = bearerToken = '';
    hasProfile = false;
  }

  function inc() { quantity = Math.max(0, (quantity || 0) + 1); }
  function dec() { quantity = Math.max(0, (quantity || 0) - 1); }

  function openQrScan(which) {
    qrTarget = which;
    scanKind = 'qr';
    showScanner = true;
  }
  function openBarcodeScan() {
    scanKind = 'barcode';
    showScanner = true;
  }

  function handleScanResult(e) {
    const text = e.detail.text;
    if (scanKind === 'barcode') {
      packageNo = text;
      return;
    }
    // QR: either API endpoint json or recording info json
    try {
      const obj = JSON.parse(text);
      if (qrTarget === 'api') {
        if (typeof obj.apiEndpoint === 'string') {
          apiEndpoint = obj.apiEndpoint.trim();
          if (apiEndpoint.startsWith('<') && apiEndpoint.endsWith('>')) {
            apiEndpoint = apiEndpoint.slice(1, -1);
          }
        }
      } else {
        if (obj.orderNo && obj.recordingNo && obj.locationCode) {
          orderNo = obj.orderNo.toString();
          recordingNo = obj.recordingNo.toString();
          locationCode = obj.locationCode.toString();
        }
      }
    } catch (err) {
      // ignore
    }
  }

  async function submit() {
    submitMessage = '';
    submitKind = '';
    if (!apiEndpoint || !orderNo || !recordingNo || !locationCode) {
      submitKind = 'error';
      submitMessage = 'Profile incomplete';
      return;
    }
    if (!packageNo) {
      submitKind = 'error';
      submitMessage = 'Package number required';
      return;
    }
    const qty = packageIntact ? 0 : Number(quantity || 0);
    const payload = {
      orderNo,
      recordingNo,
      locationCode,
      packageNo,
      quantity: qty,
      packageIntact
    };
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-ms-client-tracking-id': (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))
    };
    if (bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
    }
    isSubmitting = true;
    try {
      const resp = await fetch(apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`${resp.status} ${resp.statusText}: ${txt}`);
      }
      submitKind = 'success';
      submitMessage = 'Submitted successfully';
      // reset work inputs
      packageNo = '';
      packageIntact = false;
      quantity = 1;
    } catch (e) {
      submitKind = 'error';
      submitMessage = e?.message ?? String(e);
    } finally {
      isSubmitting = false;
    }
  }

  // init
  loadProfile();
</script>

<!-- Profile Card -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div class="card bg-base-200 shadow">
    <div class="card-body">
      <h2 class="card-title">Recording Profile</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="form-control">
          <label class="label"><span class="label-text">API Endpoint</span></label>
          <input class="input input-bordered" bind:value={apiEndpoint} placeholder="https://..." />
          <div class="mt-2 flex gap-2">
            <button class="btn btn-sm" on:click={() => openQrScan('api')}>Scan QR</button>
            <button class="btn btn-sm" on:click={() => {
              const raw = prompt('Paste API JSON {"apiEndpoint":"<...>"}');
              if (raw) {
                try {
                  const obj = JSON.parse(raw);
                  if (typeof obj.apiEndpoint === 'string') {
                    apiEndpoint = obj.apiEndpoint.trim();
                    if (apiEndpoint.startsWith('<') && apiEndpoint.endsWith('>')) apiEndpoint = apiEndpoint.slice(1, -1);
                  }
                } catch {}
              }
            }}>Paste JSON</button>
          </div>
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text">Bearer Token (optional)</span></label>
          <input class="input input-bordered" bind:value={bearerToken} placeholder="ey..." />
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text">Order No</span></label>
          <input class="input input-bordered" bind:value={orderNo} />
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text">Recording No</span></label>
          <input class="input input-bordered" bind:value={recordingNo} />
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text">Location Code</span></label>
          <input class="input input-bordered" bind:value={locationCode} />
        </div>
      </div>
      <div class="mt-2 flex gap-2">
        <button class="btn" on:click={() => openQrScan('recording')}>Scan Recording QR</button>
        <button class="btn" on:click={() => {
          const raw = prompt('Paste recording JSON {"orderNo":"...","recordingNo":"...","locationCode":"..."}');
          if (raw) {
            try {
              const obj = JSON.parse(raw);
              if (obj.orderNo && obj.recordingNo && obj.locationCode) {
                orderNo = obj.orderNo.toString();
                recordingNo = obj.recordingNo.toString();
                locationCode = obj.locationCode.toString();
              }
            } catch {}
          }
        }}>Paste Recording JSON</button>
        <button class="btn btn-primary" on:click={saveProfile}>Save Profile</button>
        <button class="btn btn-ghost" on:click={clearProfile}>Clear</button>
      </div>
      <div class="mt-2">
        {#if hasProfile}
          <div class="badge badge-success">Profile Saved</div>
        {:else}
          <div class="badge">No Profile</div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Work Card -->
  <div class="card bg-base-200 shadow">
    <div class="card-body">
      <h2 class="card-title">Work</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="form-control">
          <label class="label"><span class="label-text">Package No</span></label>
          <div class="flex gap-2">
            <input class="input input-bordered flex-1" bind:value={packageNo} />
            <button class="btn" on:click={openBarcodeScan}>Scan</button>
          </div>
        </div>
        <div class="form-control">
          <label class="cursor-pointer label">
            <span class="label-text">Package Intact</span>
            <input type="checkbox" class="toggle" bind:checked={packageIntact} />
          </label>
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text">Quantity</span></label>
          <div class="join">
            <button class="btn join-item" on:click={dec}>-</button>
            <input class="input input-bordered join-item w-24 text-center" type="number" bind:value={quantity} min="0" />
            <button class="btn join-item" on:click={inc}>+</button>
          </div>
          {#if packageIntact}
            <div class="text-sm opacity-70 mt-1">Quantity will be sent as 0 when intact.</div>
          {/if}
        </div>
      </div>
      <div class="mt-4">
        <button class="btn btn-primary" disabled={isSubmitting} on:click={submit}>
          {#if isSubmitting}<span class="loading loading-spinner"></span>{/if}
          Submit
        </button>
      </div>
      {#if submitMessage}
        <div class={`alert mt-3 ${submitKind === 'success' ? 'alert-success' : 'alert-error'}`}>
          <span>{submitMessage}</span>
        </div>
      {/if}
    </div>
  </div>
</div>

<ScannerModal bind:open={showScanner} {kind} on:close={() => (showScanner = false)} on:result={handleScanResult} />
