<script lang="ts">
  import type { Player } from '../engine/game';
  import { scoreLine } from '../engine/score';

  // Bank, this round, and where it lands: $41 (+30 −3) → $68.
  let { p }: { p: Player } = $props();

  const sc = $derived(scoreLine(p));
  const gross = $derived(sc.cards * (sc.double ? 2 : 1) + sc.bonus);
  const live = $derived(p.status !== 'busted' && p.line.length > 0);
</script>

<span class="money">
  <b class="bank">${p.bank}</b>
  {#if live}
    <span class="muted">(+{gross}{sc.marker ? ` −${sc.marker}` : ''}) →</span>
    <b class="proj">${p.bank + sc.total}</b>
  {:else if p.status === 'busted'}
    <span class="bust">busted</span>
  {/if}
</span>

<style>
  .money {
    display: inline-flex;
    align-items: baseline;
    gap: 0.3rem;
    white-space: nowrap;
    font-size: 0.9rem;
  }
  b {
    font-family: var(--western);
    font-weight: 400;
    color: var(--gold);
  }
  .bank {
    font-size: 1.05rem;
  }
  .bust {
    color: var(--bad);
    font-weight: 700;
  }
</style>
