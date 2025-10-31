<script lang="ts">
  import { Template } from 'svelte-native/components';
  import { Dialogs } from '@nativescript/core';
  import { scanBarcode } from '../services/barcode-scanner';
  import { loadProfile, type Profile } from '../services/storage';
  import { submitRecord, type RecordPayload } from '../services/api';
  
  let packageNo = '';
  let packageIntact = true;
  let quantity = 0;
  let resultText = '';
  let isSubmitting = false;
  
  $: quantityDisabled = packageIntact;
  $: if (packageIntact) quantity = 0;
  
  async function onScanBarcode() {
    try {
      const result = await scanBarcode();
      if (result) {
        packageNo = result.text.trim();
      } else {
        await Dialogs.alert({
          title: 'Scan Cancelled',
          message: 'No barcode was scanned.',
          okButtonText: 'OK'
        });
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      await Dialogs.alert({
        title: 'Scan Error',
        message: error?.message || 'Failed to scan barcode.',
        okButtonText: 'OK'
      });
    }
  }
  
  function onQuantityMinus() {
    if (!quantityDisabled && quantity > 0) {
      quantity--;
    }
  }
  
  function onQuantityPlus() {
    if (!quantityDisabled) {
      quantity++;
    }
  }
  
  async function onSubmit() {
    if (isSubmitting) return;
    
    const profile = loadProfile();
    if (!profile) {
      await Dialogs.alert({
        title: 'No Profile',
        message: 'Please create and save a profile first in the Profile tab.',
        okButtonText: 'OK'
      });
      return;
    }
    
    if (!packageNo.trim()) {
      await Dialogs.alert({
        title: 'Missing Package Number',
        message: 'Please enter or scan a package number.',
        okButtonText: 'OK'
      });
      return;
    }
    
    const payload: RecordPayload = {
      orderNo: profile.orderNo,
      recordingNo: profile.recordingNo,
      locationCode: profile.locationCode,
      packageNo: packageNo.trim(),
      quantity: packageIntact ? 0 : quantity,
      packageIntact
    };
    
    isSubmitting = true;
    resultText = 'Submitting...';
    
    try {
      const response = await submitRecord(
        profile.apiEndpoint,
        payload,
        profile.bearerToken
      );
      
      resultText = `Status: ${response.status} ${response.ok ? 'OK' : 'ERROR'}\n\n` +
                   `Payload:\n${JSON.stringify(payload, null, 2)}\n\n` +
                   `Response:\n${JSON.stringify(response.data, null, 2)}`;
      
      if (response.ok) {
        await Dialogs.alert({
          title: 'Success',
          message: 'Record submitted successfully!',
          okButtonText: 'OK'
        });
        
        // Reset form
        packageNo = '';
        packageIntact = true;
        quantity = 0;
      } else {
        await Dialogs.alert({
          title: 'Submission Failed',
          message: `Server returned status ${response.status}. Check the result below.`,
          okButtonText: 'OK'
        });
      }
    } catch (error) {
      console.error('Submit error:', error);
      resultText = `Error: ${error?.message || 'Network request failed. Check your connection and endpoint.'}`;
      
      await Dialogs.alert({
        title: 'Submission Error',
        message: error?.message || 'Failed to submit record.',
        okButtonText: 'OK'
      });
    } finally {
      isSubmitting = false;
    }
  }
</script>

<scrollView class="container">
  <stackLayout>
    <label text="2) Work" class="section-title" />
    <label text="Use your saved profile to submit package records" class="section-subtitle" />
    
    <stackLayout class="card">
      <label text="Package Number" class="label-text" />
      <gridLayout rows="auto" columns="*, auto">
        <textField row="0" col="0" bind:text={packageNo} hint="Scan or type package number" 
                   class="input-field" />
        <button row="0" col="1" text="📷 Scan" class="btn-secondary" 
                on:tap={onScanBarcode} marginLeft="8" />
      </gridLayout>
      
      <gridLayout rows="auto" columns="auto, *" marginTop="16">
        <switch row="0" col="0" bind:checked={packageIntact} />
        <label row="0" col="1" text="Package intact" class="label-text" marginLeft="8" 
               verticalAlignment="center" />
      </gridLayout>
      
      <label text="Quantity" class="label-text" marginTop="16" />
      <label text="Disabled when Package intact is checked" class="hint-text" />
      
      <gridLayout rows="auto" columns="auto, *, auto" class="quantity-container" marginTop="8">
        <button row="0" col="0" text="−" class="quantity-btn" 
                on:tap={onQuantityMinus} isEnabled={!quantityDisabled} />
        <textField row="0" col="1" bind:text={quantity} keyboardType="number" 
                   class="quantity-input" editable={!quantityDisabled} />
        <button row="0" col="2" text="+" class="quantity-btn" 
                on:tap={onQuantityPlus} isEnabled={!quantityDisabled} />
      </gridLayout>
      
      <button text="{isSubmitting ? 'Submitting...' : 'Submit'}" class="btn-primary" 
              on:tap={onSubmit} isEnabled={!isSubmitting} marginTop="24" />
    </stackLayout>
    
    {#if resultText}
      <stackLayout class="card">
        <label text="Result" class="section-title" fontSize="16" />
        <label text="{resultText}" class="result-text" textWrap="true" />
      </stackLayout>
    {/if}
  </stackLayout>
</scrollView>
