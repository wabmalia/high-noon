<script lang="ts">
  import { ACE, rankLabel, SUIT_SYMBOL, type Card } from '../engine/cards';
  import type { Held } from '../engine/game';

  let {
    held,
    small = false,
    pickable = false,
    picked = false,
    dim = false,
    onpick,
  }: { held: Held; small?: boolean; pickable?: boolean; picked?: boolean; dim?: boolean; onpick?: () => void } = $props();

  const card: Card = $derived(held.card);
  const isAce = $derived(card.rank === ACE);
  // An Ace always looks like itself; what it stands for is scrawled on it.
  const suit = $derived(card.suit);
  const label = $derived(rankLabel(card.rank));
</script>

<button
  class="card {suit}"
  class:small
  class:pickable
  class:picked
  class:ace={isAce}
  class:dim
  disabled={!pickable}
  onclick={onpick}
  aria-label="{label} {suit}{isAce && held.as ? `, as ${held.as.value} ${held.as.suit}` : ''}{held.shoe ? ', horseshoe' : ''}"
>
  <span class="rank">{label}</span>
  <span class="suit">{SUIT_SYMBOL[suit]}</span>
  {#if isAce && held.as}
    <span class="scrawl {held.as.suit}" aria-hidden="true">{held.as.value}{SUIT_SYMBOL[held.as.suit]}</span>
  {/if}
  {#if held.shoe}
    <!-- A horseshoe: an iron arch, flared heels, nail holes. -->
    <svg class="shoe" viewBox="0 0 24 24" aria-hidden="true"
      ><path d="M4.5 3.5h4l-.6 8.2a4.1 4.1 0 0 0 8.2 0l-.6-8.2h4l.4 8.4a7.9 7.9 0 0 1-15.8 0z" fill="#5a4636" /><g fill="#f6ecd4"
        ><circle cx="6.6" cy="7" r=".9" /><circle cx="6.9" cy="12.2" r=".9" /><circle cx="9.3" cy="16.9" r=".9" /><circle cx="17.4" cy="7" r=".9" /><circle
          cx="17.1"
          cy="12.2"
          r=".9"
        /><circle cx="14.7" cy="16.9" r=".9" /></g
      ></svg
    >
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
    /* A little thickness: the card's edge, then its shadow on the table. */
    box-shadow:
      0 1px 0 #c9b791,
      0 2px 0 #a8946c,
      0 6px 10px rgb(0 0 0 / 0.45);
    transform-style: preserve-3d;
    animation: arrive 0.45s ease-out backwards;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.05rem;
    flex: none;
    cursor: default;
    opacity: 1;
  }
  /* Not pickable: let taps through to the stack around it (it opens). */
  .card:disabled {
    opacity: 1;
    cursor: inherit;
    pointer-events: none;
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
  /* What an Ace stands for, written on it in rough pencil, on the left
     where it still shows inside a run. */
  .scrawl {
    position: absolute;
    left: 6%;
    bottom: 4%;
    font-family: 'Permanent Marker', 'Rye', cursive;
    font-size: calc(var(--w) * 0.36);
    line-height: 1;
    color: #2b1c10;
    transform: rotate(-14deg);
    text-shadow: 0 0 1px rgb(43 28 16 / 0.4);
    white-space: nowrap;
  }
  .dim {
    filter: grayscale(0.7) brightness(0.65);
  }
  .shoe {
    position: absolute;
    top: -7px;
    left: -7px;
    width: calc(var(--w) * 0.48);
    height: calc(var(--w) * 0.48);
    padding: 2px;
    border-radius: 50%;
    background: var(--gold);
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.5);
  }
  .ace {
    background: linear-gradient(160deg, #fff7e0, #f0d99a);
  }
  /* Turned face down, then over, as it lands. */
  @keyframes arrive {
    from {
      transform: translateY(-18px) rotateY(-180deg);
      opacity: 0.2;
    }
    60% {
      opacity: 1;
    }
    to {
      transform: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .card {
      animation: none;
    }
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
