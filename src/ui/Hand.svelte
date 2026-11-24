<script lang="ts">
  import type { CardId } from '../engine/cards';
  import type { Held } from '../engine/game';
  import { valueOf } from '../engine/score';
  import Card from './Card.svelte';

  let {
    line,
    small = false,
    pickable = [],
    picked = [],
    onpick,
  }: { line: Held[]; small?: boolean; pickable?: CardId[]; picked?: CardId[]; onpick?: (id: CardId) => void } = $props();

  // Sorted by number, cut into groups of consecutive numbers: a run sits
  // tight together (copies too), separate groups apart. An Ace still waiting
  // for its pick goes on its own at the end.
  const groups = $derived.by(() => {
    const sorted = [...line].sort((a, b) => (valueOf(a) ?? 99) - (valueOf(b) ?? 99));
    const out: Held[][] = [];
    for (const h of sorted) {
      const v = valueOf(h);
      const last = out[out.length - 1];
      const lastV = last ? valueOf(last[last.length - 1]!) : null;
      if (last && v !== null && lastV !== null && (v === lastV || v === lastV + 1)) last.push(h);
      else out.push([h]);
    }
    return out;
  });
</script>

<div class="hand" class:small>
  {#each groups as group, i (i)}
    <div class="group" class:run={group.length > 1}>
      {#each group as h (h.card.id)}
        <Card
          held={h}
          {small}
          pickable={pickable.includes(h.card.id)}
          picked={picked.includes(h.card.id)}
          onpick={() => onpick?.(h.card.id)}
        />
      {/each}
    </div>
  {:else}
    <p class="empty muted">No cards</p>
  {/each}
</div>

<style>
  .hand {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.9rem;
    min-height: 4.4rem;
  }
  .hand.small {
    gap: 0.55rem;
    min-height: 3.1rem;
  }
  .group {
    display: flex;
  }
  /* Run cards overlap: they read as one block. */
  .group :global(.card + .card) {
    margin-left: -1.2rem;
  }
  .small .group :global(.card + .card) {
    margin-left: -0.9rem;
  }
  .empty {
    margin: 0;
    font-size: 0.85rem;
    align-self: center;
  }
</style>
