<script lang="ts">
  import type { ArmyList } from '../data/types';
  import ArmyListPage from './ArmyListPage.svelte';
  import ArmyBuilderPage from './ArmyBuilderPage.svelte';

  let activeArmyId = $state<string | null>(null);
</script>

{#if activeArmyId !== null}
  <ArmyBuilderPage armyId={activeArmyId} onback={() => (activeArmyId = null)} />
{:else}
  <ArmyListPage onopen={(id) => (activeArmyId = id)} />
{/if}
