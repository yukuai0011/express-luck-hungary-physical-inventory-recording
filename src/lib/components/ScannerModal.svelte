<script>
  import { onDestroy, onMount, createEventDispatcher } from 'svelte';
  import { BrowserMultiFormatReader } from '@zxing/browser';

  export let open = false;
  export let kind = /** @type {'qr'|'barcode'} */ ('qr');

  const dispatch = createEventDispatcher();
  let usingPlugin = false;
  let reader;
  let videoEl;
  let currentStream;
  let errorMsg = '';

  function stop() {
    if (currentStream) {
      currentStream.getTracks().forEach((t) => t.stop());
      currentStream = undefined;
    }
    if (reader) {
      try { reader.reset(); } catch {}
      reader = undefined;
    }
  }

  async function tryPluginScan() {
    try {
      const mod = await import('@tauri-apps/plugin-barcode-scanner');
      const { scan, requestPermissions, checkPermissions, Format } = mod;
      let perm = await checkPermissions();
      if (perm !== 'granted') {
        perm = await requestPermissions();
      }
      if (perm !== 'granted') {
        throw new Error('Camera permission not granted');
      }
      usingPlugin = true;
      const formats = kind === 'qr' ? [Format.QRCode] : [Format.EAN13, Format.Code128, Format.Code39, Format.UpcA, Format.UpcE, Format.EAN8, Format.ITF];
      const result = await scan({ windowed: true, formats });
      if (result && result.content) {
        dispatch('result', { text: result.content });
        dispatch('close');
      }
    } catch (err) {
      usingPlugin = false;
      throw err;
    }
  }

  async function tryBrowserScan() {
    errorMsg = '';
    reader = new BrowserMultiFormatReader();
    const constraints = {
      video: {
        facingMode: { ideal: 'environment' }
      },
      audio: false
    };
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoEl.srcObject = currentStream;
    await videoEl.play();
    const hints = undefined; // auto detect
    const formats = undefined; // auto
    const controls = await reader.decodeFromVideoDevice(null, videoEl, (res, err) => {
      if (res) {
        stop();
        dispatch('result', { text: res.getText() });
        dispatch('close');
      }
    });
    return controls;
  }

  async function start() {
    errorMsg = '';
    stop();
    // Attempt plugin first (mobile)
    try {
      await tryPluginScan();
      return;
    } catch (_) {
      // fallback to browser camera (desktop/dev)
    }
    try {
      await tryBrowserScan();
    } catch (e) {
      errorMsg = e?.message ?? String(e);
    }
  }

  onMount(() => {
    if (open) start();
  });

  $: if (open) {
    // restart when opened again
    start();
  } else {
    stop();
  }

  onDestroy(() => stop());
</script>

{#if open}
<div class="modal modal-open">
  <div class="modal-box max-w-3xl">
    <h3 class="font-bold text-lg mb-2">{kind === 'qr' ? 'Scan QR' : 'Scan Barcode'}</h3>
    <div class="mb-4">
      {#if !usingPlugin}
      <video bind:this={videoEl} class="w-full rounded" playsinline muted></video>
      {/if}
      {#if errorMsg}
      <div class="alert alert-error mt-3">
        <span>{errorMsg}</span>
      </div>
      {/if}
    </div>
    <div class="modal-action">
      <button class="btn" on:click={() => dispatch('close')}>Close</button>
    </div>
  </div>
</div>
{/if}

<style>
  .modal :global(video) {
    background: #000;
    max-height: 70vh;
  }
</style>
