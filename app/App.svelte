<script lang="ts">
  let count = 0;
</script>

<Page>
  <ActionBar title="EL Inventory" />
  <StackLayout class="p-20">
    <Label text="Hello from Svelte Native!" class="h1" />
    <Button text={`You tapped ${count} times`} on:tap={() => (count += 1)} />
  </StackLayout>
</Page>
