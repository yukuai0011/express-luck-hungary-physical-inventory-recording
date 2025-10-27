<template>
  <div class="card bg-base-200 shadow">
    <div class="card-body">
      <h2 class="card-title">Record Item</h2>
      <form class="grid gap-3" @submit.prevent="submit">
        <label class="form-control">
          <div class="label"><span class="label-text">SKU / Item Code</span></div>
          <input v-model.trim="sku" class="input input-bordered" placeholder="e.g. EL-ABC-123" required />
        </label>
        <label class="form-control">
          <div class="label"><span class="label-text">Quantity</span></div>
          <input v-model.number="quantity" type="number" min="0" step="1" class="input input-bordered" placeholder="0" required />
        </label>
        <label class="form-control">
          <div class="label"><span class="label-text">Location (optional)</span></div>
          <input v-model.trim="location" class="input input-bordered" placeholder="Rack / Bin" />
        </label>
        <div class="card-actions justify-end mt-2">
          <button class="btn btn-primary" :disabled="!canSubmit">Save</button>
        </div>
      </form>
      <p class="text-sm opacity-70">Data is stored locally on this device and works fully offline.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useInventory } from '~/composables/useInventory'

const emit = defineEmits<{ (e: 'saved'): void }>()
const { addItem } = useInventory()

const sku = ref('')
const quantity = ref<number | null>(null)
const location = ref('')

const canSubmit = computed(() => !!sku.value && typeof quantity.value === 'number' && quantity.value >= 0)

function reset() {
  sku.value = ''
  quantity.value = null
  location.value = ''
}

function submit() {
  if (!canSubmit.value) return
  addItem({ sku: sku.value, quantity: quantity.value!, location: location.value || undefined })
  reset()
  emit('saved')
}
</script>
