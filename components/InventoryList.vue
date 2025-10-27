<template>
  <div class="card bg-base-200 shadow">
    <div class="card-body">
      <div class="flex items-center justify-between">
        <h2 class="card-title">Current Items</h2>
        <button class="btn btn-outline btn-secondary" @click="$emit('export')">
          Export CSV
        </button>
      </div>
      <div v-if="!items?.length" class="text-sm opacity-70">No items yet.</div>
      <div v-else class="overflow-x-auto">
        <table class="table table-zebra">
          <thead>
            <tr>
              <th>SKU</th>
              <th class="text-right">Qty</th>
              <th>Location</th>
              <th>Time</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in items" :key="i.id">
              <td class="font-mono">{{ i.sku }}</td>
              <td class="text-right">{{ i.quantity }}</td>
              <td>{{ i.location || '-' }}</td>
              <td>{{ new Date(i.timestamp).toLocaleString() }}</td>
              <td>
                <button class="btn btn-xs btn-error" @click="$emit('remove', i.id)">Remove</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { InventoryItem } from '~/composables/useInventory'

defineProps<{ items: InventoryItem[] }>()

defineEmits<{ (e: 'remove', id: string): void; (e: 'export'): void }>()
</script>
