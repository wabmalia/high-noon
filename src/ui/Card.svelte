<script lang="ts">
  import { ACE, rankLabel, SUIT_SYMBOL, type Card } from '../engine/cards';
  import type { Held } from '../engine/game';

  let {
    held,
    small = false,
    pickable = false,
    picked = false,
    onpick,
  }: { held: Held; small?: boolean; pickable?: boolean; picked?: boolean; onpick?: () => void } = $props();

  const card: Card = $derived(held.card);
  const isAce = $derived(card.rank === ACE);
  // An Ace shows what it stands for once picked.
  const suit = $derived(isAce && held.as ? held.as.suit : card.suit);
  const label = $derived(isAce ? (held.as ? String(held.as.value) : 'A') : rankLabel(card.rank));
</script>

<button
  class="card {suit}"
  class:small
  class:pickable
  class:picked
  class:ace={isAce}
  disabled={!pickable}
  onclick={onpick}
  aria-label="{isAce ? 'Ace as ' : ''}{label} {suit}{held.shoe ? ', horseshoe' : ''}"
>
  <span class="rank">{label}</span>
  <span class="suit">{SUIT_SYMBOL[suit]}</span>
  {#if isAce}<span class="tag">A</span>{/if}
  {#if held.shoe}
    <svg class="shoe" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 3v7a6 6 0 0 0 12 0V3" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" /></svg>
  {/if}
</button>

<style>
  .card {
    --w: 3.1rem;
    position: relative;
    width: var(--w);
    height: calc(var(--w) * 1.4);
    padding: 0.2rem;
    border-radius: 7px;
    border: 2px solid var(--card-edge);
    background: var(--card-face);
    color: var(--ink);
    box-shadow: 0 2px 4px rgb(0 0 0 / 0.35);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.05rem;
    flex: none;
    cursor: default;
    opacity: 1;
  }
  .card:disabled {
    opacity: 1;
    cursor: default;
  }
  .card.small {
    --w: 2.2rem;
    border-width: 1.5px;
    border-radius: 5px;
  }
  .star {
    --ink: #b8322a;
  }
  .cactus {
    --ink: #2f7d3a;
  }
  .horse {
    --ink: #3d5fa8;
  }
  .gold {
    --ink: #a8741a;
  }
  .rank {
    font-family: var(--western);
    font-size: calc(var(--w) * 0.42);
    line-height: 1;
  }
  .suit {
    font-size: calc(var(--w) * 0.3);
    line-height: 1;
  }
  /* Bottom left and top left: the parts of a card still showing when the
     next card in a run overlaps its right side. */
  .tag {
    position: absolute;
    bottom: 2px;
    left: 4px;
    font-size: calc(var(--w) * 0.2);
    font-weight: 800;
    color: var(--card-edge);
  }
  .shoe {
    position: absolute;
    top: -6px;
    left: -6px;
    width: calc(var(--w) * 0.42);
    height: calc(var(--w) * 0.42);
    padding: 2px;
    border-radius: 50%;
    background: var(--gold);
    color: #3a2414;
  }
  .ace {
    background: linear-gradient(160deg, #fff7e0, #f0d99a);
  }
  .pickable {
    cursor: pointer;
    outline: 3px dashed var(--gold);
    outline-offset: 2px;
  }
  .picked {
    outline: 3px solid var(--gold);
    transform: translateY(-6px);
  }
</style>
