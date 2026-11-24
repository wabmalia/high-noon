<script lang="ts">
  import type { CardId } from '../engine/cards';
  import type { Held } from '../engine/game';
  import { valueOf } from '../engine/score';
  import Card from './Card.svelte';

  let {
    line,
    mine = false,
    pickable = [],
    picked = [],
    onpick,
  }: { line: Held[]; mine?: boolean; pickable?: CardId[]; picked?: CardId[]; onpick?: (id: CardId) => void } = $props();

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

  // My hand fans out a little: each card turned by its distance from the middle.
  const count = $derived(line.length);
  const fan = (group: number, i: number) => {
    let index = i;
    for (let g = 0; g < group; g++) index += groups[g]!.length;
    const off = index - (count - 1) / 2;
    return `--turn: ${off * 3}deg; --drop: ${Math.abs(off) * 3}px`;
  };
</script>

<div class="hand" class:mine class:theirs={!mine}>
  <div class="tilt">
    {#each groups as group, g (g)}
      <div class="group">
        {#each group as h, i (h.card.id)}
          <div class="slot" style={mine ? fan(g, i) : ''}>
            <Card
              held={h}
              small={!mine}
              pickable={pickable.includes(h.card.id)}
              picked={picked.includes(h.card.id)}
              onpick={() => onpick?.(h.card.id)}
            />
          </div>
        {/each}
      </div>
    {:else}
      <p class="empty muted">No cards</p>
    {/each}
  </div>
</div>

<style>
  .hand {
    perspective: 700px;
  }
  .tilt {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    transform-style: preserve-3d;
  }
  /* Each group is one flat plane in the tilted hand, so its cards stack in
     order (later on top) and badges on a card never slip behind the next. */
  .group {
    display: flex;
    transform-style: flat;
  }

  /* Theirs: lying on the table across from me, seen at an angle. */
  .theirs .tilt {
    gap: 0.5rem;
    min-height: 2.6rem;
    transform: rotateX(32deg);
    transform-origin: bottom center;
  }
  .theirs .group :global(.slot + .slot) {
    margin-left: -0.9rem;
  }

  /* Mine: big, held up toward me, fanned. */
  .mine {
    perspective: 900px;
  }
  .mine .tilt {
    justify-content: center;
    gap: 1.1rem;
    min-height: 6.6rem;
    padding-top: 0.6rem;
    transform: rotateX(18deg);
    transform-origin: bottom center;
  }
  .mine .slot {
    transform: rotate(var(--turn)) translateY(var(--drop));
    transform-origin: bottom center;
  }
  .mine .slot :global(.card) {
    --w: 4.1rem;
  }
  .mine .group :global(.slot + .slot) {
    margin-left: -1.55rem;
  }
  .empty {
    margin: 0;
    font-size: 0.85rem;
    align-self: center;
  }
</style>
