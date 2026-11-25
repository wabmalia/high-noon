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
    counting = null,
    toggle = true,
    onpick,
  }: {
    line: Held[];
    mine?: boolean;
    pickable?: CardId[];
    picked?: CardId[];
    /** If set, cards not in it are dimmed: what scored in a round summary. */
    counting?: CardId[] | null;
    /** False: taps on a stack go to whatever is around the hand (a seat). */
    toggle?: boolean;
    onpick?: (id: CardId) => void;
  } = $props();

  // Sorted by number and cut into groups of consecutive numbers (a run sits
  // tight together, separate groups apart). Inside a group, copies of the
  // same number form a stack. An Ace still waiting for its pick goes on its
  // own at the end.
  const groups = $derived.by(() => {
    const sorted = [...line].sort((a, b) => (valueOf(a) ?? 99) - (valueOf(b) ?? 99));
    const out: Held[][][] = [];
    for (const h of sorted) {
      const v = valueOf(h);
      const group = out[out.length - 1];
      const stack = group?.[group.length - 1];
      const lastV = stack ? valueOf(stack[0]!) : null;
      if (stack && v !== null && v === lastV) stack.push(h);
      else if (group && v !== null && lastV !== null && v === lastV + 1) group.push([h]);
      else out.push([[h]]);
    }
    return out;
  });

  // A stack opens (its copies spread) on hover, or on a tap until tapped
  // again; and always while one of its cards can be picked.
  let opened = $state<number[]>([]);
  const keyOf = (stack: Held[]) => valueOf(stack[0]!) ?? -1;
  const isOpen = (stack: Held[]) => opened.includes(keyOf(stack)) || stack.some((h) => pickable.includes(h.card.id));
  function open(stack: Held[]) {
    if (!toggle || stack.length < 2 || stack.some((h) => pickable.includes(h.card.id))) return;
    const k = keyOf(stack);
    opened = opened.includes(k) ? opened.filter((x) => x !== k) : [...opened, k];
  }

  // My hand stays one row, whatever its size: cards shrink to fit. In card
  // widths: a closed stack is one card plus a sliver per copy, an open one
  // shows 0.62 of each copy; stacks in a run overlap by 0.38; groups have a
  // 0.27 gap; plus room for the fan.
  const OVERLAP = 0.38;
  const PEEK = 0.2;
  const GAP = 0.27;
  const stackWidth = (s: Held[]) => 1 + (s.length - 1) * (isOpen(s) ? 1 - OVERLAP : PEEK);
  const widths = $derived(
    groups.reduce((sum, grp) => sum + grp.reduce((w, s) => w + stackWidth(s), 0) - (grp.length - 1) * OVERLAP, 0) +
      Math.max(0, groups.length - 1) * GAP +
      (mine ? 0.4 : 0.1),
  );

  // My hand fans out a little: each stack turned by its distance from the middle.
  const stacks = $derived(groups.reduce((n, grp) => n + grp.length, 0));
  const fan = (g: number, i: number) => {
    let index = i;
    for (let k = 0; k < g; k++) index += groups[k]!.length;
    const off = index - (stacks - 1) / 2;
    return `--turn: ${off * 3}deg; --drop: ${Math.abs(off) * 3}px`;
  };
</script>

<div class="hand" class:mine class:theirs={!mine}>
  <div class="tilt" style="--fit: {widths}">
    {#each groups as group, g (g)}
      <div class="group">
        {#each group as stack, i (stack[0]!.card.id)}
          <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
          <div
            class="stack"
            class:open={isOpen(stack)}
            class:many={stack.length > 1}
            style={mine ? fan(g, i) : ''}
            title={stack.length > 1 ? `${stack.length} copies` : undefined}
            onclick={(e) => {
              if (toggle && stack.length > 1) e.stopPropagation();
              open(stack);
            }}
          >
            {#each stack as h (h.card.id)}
              <Card
                held={h}
                small={!mine}
                pickable={pickable.includes(h.card.id)}
                picked={picked.includes(h.card.id)}
                dim={counting !== null && !counting.includes(h.card.id)}
                onpick={() => onpick?.(h.card.id)}
              />
            {/each}
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
  .stack {
    display: flex;
  }
  .stack.many {
    cursor: pointer;
  }
  /* Stacks in a run overlap; copies in a stack only peek out, until the
     stack opens (hover, a tap, or picking a card from it). */
  .group > .stack + .stack {
    margin-left: calc(var(--w) * -0.38);
  }
  .stack > :global(.card + .card) {
    margin-left: calc(var(--w) * -0.8);
    transition: margin-left 0.18s ease-out;
  }
  .stack.open > :global(.card + .card) {
    margin-left: calc(var(--w) * -0.38);
  }
  @media (hover: hover) {
    .stack.many:hover > :global(.card + .card) {
      margin-left: calc(var(--w) * -0.38);
    }
  }

  /* Theirs: lying on the table across from me, seen at an angle; one row,
     shrinking to fit like mine. */
  .theirs {
    container-type: inline-size;
  }
  .theirs .tilt {
    /* Readable on any phone: never smaller than 1.75rem a card. */
    --w: clamp(1.75rem, calc(100cqw / var(--fit)), 2.4rem);
    flex-wrap: nowrap;
    gap: calc(var(--w) * 0.27);
    min-height: calc(var(--w) * 1.4 + 0.2rem);
    transform: rotateX(28deg);
    transform-origin: bottom center;
  }
  .theirs .tilt .stack :global(.card.small) {
    --w: inherit;
  }

  /* Mine: big, held up toward me, fanned, always one row. The card width
     is the hand's width shared out (--fit card widths), up to full size. */
  .mine {
    perspective: 900px;
    container-type: inline-size;
  }
  .mine .tilt {
    --w: min(4.1rem, calc(100cqw / var(--fit)));
    flex-wrap: nowrap;
    justify-content: center;
    gap: calc(var(--w) * 0.27);
    min-height: calc(var(--w) * 1.4 + 0.8rem);
    padding-top: 0.6rem;
    transform: rotateX(18deg);
    transform-origin: bottom center;
  }
  .mine .stack {
    transform: rotate(var(--turn)) translateY(var(--drop));
    transform-origin: bottom center;
  }
  .mine .stack :global(.card) {
    --w: inherit;
  }
  .empty {
    margin: 0;
    font-size: 0.85rem;
    align-self: center;
  }
</style>
