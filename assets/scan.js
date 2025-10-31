/* Simple ZXing-based scanner bridge for Dioxus (web/webview)
   Provides: window.scanCode(type: 'qr'|'barcode'|'any') -> Promise<string>
*/
(function(){
  async function ensureZXing(){
    if (window.ZXing && window.ZXing.BrowserMultiFormatReader) return;
    // load from CDN
    await new Promise((resolve, reject)=>{
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/@zxing/library@0.21.2';
      s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
    });
  }

  function makeOverlay(){
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#fff;';

    const title = document.createElement('div');
    title.textContent = 'Scanning... Tap anywhere to cancel';
    title.style.cssText = 'margin:8px 0 6px 0; opacity:.85;';

    const video = document.createElement('video');
    video.autoplay = true; video.playsInline = true;
    video.style.cssText = 'width:min(92vw,680px);border-radius:10px;background:#000;';

    overlay.appendChild(video);
    overlay.appendChild(title);

    return { overlay, video };
  }

  async function scanCode(type){
    await ensureZXing();
    const formats = type === 'qr' ? [ZXing.BarcodeFormat.QR_CODE] : undefined;

    const { overlay, video } = makeOverlay();
    document.body.appendChild(overlay);

    const codeReader = new ZXing.BrowserMultiFormatReader();
    let resolveFn, rejectFn;
    const p = new Promise((res, rej)=>{ resolveFn= res; rejectFn= rej; });

    function cleanup(){
      try { codeReader.reset(); } catch(_){}
      try { video.pause(); video.srcObject = null; } catch(_){ }
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    overlay.addEventListener('click', ()=>{ cleanup(); rejectFn(new Error('cancelled')); });

    try{
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio:false });
      video.srcObject = stream; await video.play();
    }catch(e){ cleanup(); throw e; }

    codeReader.decodeFromVideoDevice(null, video, (result, err)=>{
      if (result && result.getText){
        const text = result.getText();
        cleanup(); resolveFn(text);
      }
    });

    return p;
  }

  window.scanCode = scanCode;
})();
