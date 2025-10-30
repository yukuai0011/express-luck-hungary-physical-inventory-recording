<script>
  import '../app.css';
  let theme = 'dark';
</script>

<svelte:head>
  <title>Express Luck Inventory</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div data-theme={theme} class="min-h-screen bg-base-100 text-base-content">
  <div class="navbar bg-base-200 shadow">
    <div class="container mx-auto px-4">
      <div class="flex-1">
        <span class="text-xl font-semibold">Express Luck Inventory</span>
      </div>
    </div>
  </div>
  <main class="container mx-auto p-4">
    <slot />
  </main>
</div>
