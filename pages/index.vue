<template>
  <div class="container mx-auto p-4">
    <div class="grid gap-4 md:grid-cols-2">
      <div>
        <inventory-form @saved="handleSaved" />
      </div>
      <div>
        <inventory-list :items="items" @remove="removeItem" @export="exportAll" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import InventoryForm from '~/components/InventoryForm.vue'
import InventoryList from '~/components/InventoryList.vue'
import { useInventory } from '~/composables/useInventory'

const { items, removeItem, exportAll } = useInventory()

function handleSaved() {
  // no-op, list will auto refresh via shared state
}
</script>
