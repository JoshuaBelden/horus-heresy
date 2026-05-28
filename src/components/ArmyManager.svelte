<script lang="ts">
  import ArmyListPage from './ArmyListPage.svelte';
  import ArmyBuilderPage from './ArmyBuilderPage.svelte';
  import BattleReportPage from './BattleReportPage.svelte';

  let activeArmyId = $state<string | null>(null);
  let activeView = $state<'builder' | 'report'>('builder');

  function openBuilder(id: string) {
    activeArmyId = id;
    activeView = 'builder';
  }

  function openReport(id: string) {
    activeArmyId = id;
    activeView = 'report';
  }

  function goBack() {
    activeArmyId = null;
    activeView = 'builder';
  }

  // From the Battle Report, return to the same army's roster (the builder).
  function backToRoster() {
    activeView = 'builder';
  }
</script>

{#if activeArmyId !== null && activeView === 'report'}
  <BattleReportPage armyId={activeArmyId} onback={backToRoster} />
{:else if activeArmyId !== null}
  <ArmyBuilderPage armyId={activeArmyId} onback={goBack} onreport={() => openReport(activeArmyId!)} />
{:else}
  <ArmyListPage onopen={openBuilder} onreport={openReport} />
{/if}
