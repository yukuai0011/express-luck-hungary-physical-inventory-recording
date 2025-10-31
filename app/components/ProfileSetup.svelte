<script lang="ts">
  import { Template } from 'svelte-native/components';
  import { Dialogs } from '@nativescript/core';
  import { scanQRCode } from '../services/barcode-scanner';
  import { saveProfile, loadProfile, clearProfile, type Profile } from '../services/storage';
  
  let scannedApi: string | null = null;
  let scannedInfo: { orderNo: string; recordingNo: number; locationCode: string; } | null = null;
  let bearerToken = '';
  let currentProfile: Profile | null = null;
  let profileSummary = '';
  let manualJson = '';
  
  $: hasApi = !!scannedApi;
  $: hasInfo = !!scannedInfo;
  $: canSaveProfile = hasApi && hasInfo;
  
  function sanitizeEndpoint(url: string): string {
    let s = url.trim();
    if (s.startsWith('<') && s.endsWith('>')) {
      s = s.slice(1, -1);
    }
    return s;
  }
  
  function tryParseJson(text: string): any {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
  
  function handleQrObject(obj: any): boolean {
    if (obj && typeof obj.apiEndpoint === 'string') {
      scannedApi = sanitizeEndpoint(obj.apiEndpoint);
      return true;
    }
    if (obj && (obj.orderNo || obj.locationCode || obj.recordingNo !== undefined)) {
      const orderNo = String(obj.orderNo || '').trim();
      const locationCode = String(obj.locationCode || '').trim();
      const recordingNo = Number(obj.recordingNo);
      if (orderNo && locationCode && Number.isFinite(recordingNo)) {
        scannedInfo = { orderNo, locationCode, recordingNo };
        return true;
      }
    }
    return false;
  }
  
  async function onScanQR() {
    try {
      const result = await scanQRCode();
      if (!result) {
        await Dialogs.alert({
          title: 'Scan Cancelled',
          message: 'No QR code was scanned.',
          okButtonText: 'OK'
        });
        return;
      }
      
      const obj = tryParseJson(result.text);
      if (!obj) {
        await Dialogs.alert({
          title: 'Invalid QR Code',
          message: 'The QR code does not contain valid JSON.',
          okButtonText: 'OK'
        });
        return;
      }
      
      const handled = handleQrObject(obj);
      if (!handled) {
        await Dialogs.alert({
          title: 'Unknown Format',
          message: 'The QR code JSON format is not recognized.',
          okButtonText: 'OK'
        });
        return;
      }
      
      if (canSaveProfile) {
        await Dialogs.alert({
          title: 'Success',
          message: 'Both QR codes scanned! You can now save the profile.',
          okButtonText: 'OK'
        });
      } else {
        await Dialogs.alert({
          title: 'Partial Success',
          message: 'One QR code scanned. Please scan the other one.',
          okButtonText: 'OK'
        });
      }
    } catch (error) {
      console.error('Scan error:', error);
      await Dialogs.alert({
        title: 'Scan Error',
        message: error?.message || 'Failed to scan QR code.',
        okButtonText: 'OK'
      });
    }
  }
  
  function onResetScan() {
    scannedApi = null;
    scannedInfo = null;
    manualJson = '';
  }
  
  async function onDetectPaste() {
    const text = manualJson.trim();
    if (!text) {
      await Dialogs.alert({
        title: 'Empty Input',
        message: 'Please paste JSON text first.',
        okButtonText: 'OK'
      });
      return;
    }
    
    const obj = tryParseJson(text);
    if (!obj) {
      await Dialogs.alert({
        title: 'Invalid JSON',
        message: 'The pasted text is not valid JSON.',
        okButtonText: 'OK'
      });
      return;
    }
    
    const handled = handleQrObject(obj);
    if (!handled) {
      await Dialogs.alert({
        title: 'Unknown Format',
        message: 'The JSON format is not recognized.',
        okButtonText: 'OK'
      });
      return;
    }
    
    await Dialogs.alert({
      title: 'Success',
      message: 'JSON detected and processed!',
      okButtonText: 'OK'
    });
  }
  
  async function onSaveProfile() {
    if (!canSaveProfile) return;
    
    const profile: Profile = {
      apiEndpoint: scannedApi!,
      orderNo: scannedInfo!.orderNo,
      recordingNo: scannedInfo!.recordingNo,
      locationCode: scannedInfo!.locationCode,
      bearerToken: bearerToken.trim() || undefined
    };
    
    saveProfile(profile);
    currentProfile = profile;
    updateProfileSummary();
    
    await Dialogs.alert({
      title: 'Profile Saved',
      message: 'The profile has been saved successfully!',
      okButtonText: 'OK'
    });
  }
  
  async function onClearProfile() {
    const result = await Dialogs.confirm({
      title: 'Clear Profile',
      message: 'Are you sure you want to clear the saved profile?',
      okButtonText: 'Yes',
      cancelButtonText: 'No'
    });
    
    if (result) {
      clearProfile();
      currentProfile = null;
      onResetScan();
      updateProfileSummary();
      
      await Dialogs.alert({
        title: 'Profile Cleared',
        message: 'The profile has been cleared.',
        okButtonText: 'OK'
      });
    }
  }
  
  function updateProfileSummary() {
    if (!currentProfile) {
      profileSummary = 'No profile saved.';
      return;
    }
    
    const safe = {
      apiEndpoint: currentProfile.apiEndpoint || '',
      orderNo: currentProfile.orderNo || '',
      recordingNo: currentProfile.recordingNo ?? '',
      locationCode: currentProfile.locationCode || '',
      bearerToken: currentProfile.bearerToken ? '(stored)' : '(none)'
    };
    
    profileSummary = JSON.stringify(safe, null, 2);
  }
  
  // Load profile on mount
  function init() {
    const existing = loadProfile();
    if (existing) {
      currentProfile = existing;
    }
    updateProfileSummary();
  }
  
  init();
</script>

<scrollView class="container">
  <stackLayout>
    <label text="1) Recording Profile" class="section-title" />
    <label text="Scan two QR codes: API Endpoint and Recording Info" class="section-subtitle" />
    
    <stackLayout class="card">
      <label text="Scan QR Codes" class="section-title" fontSize="16" />
      
      <gridLayout rows="auto, auto" columns="*, *" class="mb-4">
        <label row="0" col="0" text="API Endpoint:" class="label-text" />
        <label row="0" col="1" text="{hasApi ? 'ready' : 'missing'}" 
               class="status-pill {hasApi ? 'status-ready' : 'status-missing'}" />
        
        <label row="1" col="0" text="Recording Info:" class="label-text" />
        <label row="1" col="1" text="{hasInfo ? 'ready' : 'missing'}" 
               class="status-pill {hasInfo ? 'status-ready' : 'status-missing'}" />
      </gridLayout>
      
      <button text="Scan QR Code" class="btn-primary" on:tap={onScanQR} />
      <button text="Reset Scan" class="btn-secondary" on:tap={onResetScan} />
      
      <label text="Or Paste JSON:" class="label-text" marginTop="16" />
      <textView bind:text={manualJson} hint="Paste QR JSON here" class="input-field" height="100" />
      <button text="Detect JSON" class="btn-secondary" on:tap={onDetectPaste} />
      
      <label text="Optional Bearer Token:" class="label-text" marginTop="16" />
      <textField bind:text={bearerToken} hint="Bearer token (optional)" secure="true" class="input-field" />
      
      <button text="Save Profile" class="btn-primary" on:tap={onSaveProfile} 
              isEnabled={canSaveProfile} marginTop="16" />
      <button text="Clear Profile" class="btn-danger" on:tap={onClearProfile} />
    </stackLayout>
    
    <stackLayout class="card">
      <label text="Current Profile" class="section-title" fontSize="16" />
      <label text="{profileSummary}" class="profile-text" textWrap="true" />
    </stackLayout>
  </stackLayout>
</scrollView>
