<script lang="ts">
  import { Template } from 'svelte-native/components';
  import ProfileSetup from './components/ProfileSetup.svelte';
  import WorkScreen from './components/WorkScreen.svelte';
  
  let currentTab = 'profile'; // 'profile' | 'work'
  
  function switchTab(tab: string) {
    currentTab = tab;
  }
</script>

<page>
  <actionBar title="Inventory Scanner" class="action-bar" />
  
  <tabView selectedIndex={currentTab === 'profile' ? 0 : 1} 
           on:selectedIndexChange={(e) => switchTab(e.value === 0 ? 'profile' : 'work')}>
    <tabViewItem title="Profile">
      <ProfileSetup />
    </tabViewItem>
    
    <tabViewItem title="Work">
      <WorkScreen />
    </tabViewItem>
  </tabView>
</page>
