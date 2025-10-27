<template>
  <div class="min-h-screen bg-base-100 text-base-content">
    <div class="navbar bg-base-200 sticky top-0 z-10">
      <div class="flex-1 px-2">
        <span class="text-xl font-semibold">Express Luck Inventory</span>
      </div>
      <div class="flex-none px-2">
        <label class="swap swap-rotate">
          <input type="checkbox" :checked="theme === 'dim'" @change="toggleTheme" />
          <svg class="swap-on fill-current w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5.64 17.657A9 9 0 1112 21a9 9 0 01-6.36-3.343z"/></svg>
          <svg class="swap-off fill-current w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5.64 17.657A9 9 0 1112 21a9 9 0 01-6.36-3.343z"/></svg>
        </label>
      </div>
    </div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
const theme = useState<'corporate' | 'dim'>('theme', () => 'corporate')

onMounted(() => {
  document.documentElement.setAttribute('data-theme', theme.value)
})

watch(theme, (t) => {
  document.documentElement.setAttribute('data-theme', t)
})

function toggleTheme(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  theme.value = checked ? 'dim' : 'corporate'
}
</script>

<style>
/* Tailwind base is injected via module */
</style>
