<template>
  <view class="min-h-screen bg-surface-50 dark:bg-surface-900">
    <cl-page>
      <view class="p-6">
        <text class="text-xl font-semibold">Express Luck Inventory</text>
        <view class="mt-4">
          <cl-button type="primary" @click="hello">
            Tap to test Cool Unix
          </cl-button>
        </view>
      </view>
      <router-view />
    </cl-page>
  </view>
  
</template>

<script setup lang="ts">
// Import from Cool Unix (uni_modules will be fetched in CI)
import { useUi, t } from '@/uni_modules/cool-unix';
const ui = useUi();
function hello() {
  ui.showToast({ message: t('操作成功') });
}
</script>

<style lang="scss">
@tailwind base;
@tailwind components;
@tailwind utilities;
</style>
