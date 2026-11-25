<script lang="ts">
  import type { PlayerId } from '../engine/game';

  // Sheriff's Cuts on a player: poker chips marked TAX, stacked. A tap shows
  // who collects.
  let { cuts, name }: { cuts: PlayerId[]; name: (id: PlayerId) => string } = $props();
  let open = $state(false);
</script>

{#if cuts.length}
  <span class="wrap">
    <button
      class="chips"
      style="--n: {cuts.length - 1}"
      onclick={(e) => {
        e.stopPropagation();
        open = !open;
      }}
      aria-label="Sheriff's Cut: {cuts.map(name).join(', ')}"
    >
      {#each cuts as _, i (i)}<span class="chip" style="--i: {i}">TAX</span>{/each}
    </button>
    {#if open}
      <span class="tip" role="status">Tax to {cuts.map(name).join(', ')}</span>
    {/if}
  </span>
{/if}

<style>
  .wrap {
    position: relative;
    display: inline-flex;
  }
  .chips {
    position: relative;
    padding: 0;
    border: 0;
    background: none;
    width: calc(1.9rem + var(--n, 0) * 0.3rem);
    height: 1.9rem;
    display: inline-flex;
  }
  /* A clay chip: red with a dashed white rim, stacked a little apart. */
  .chip {
    position: absolute;
    left: calc(var(--i) * 0.3rem);
    top: calc(var(--i) * -0.15rem);
    width: 1.9rem;
    height: 1.9rem;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 0.52rem;
    font-weight: 900;
    letter-spacing: 0.04em;
    color: #fff6e6;
    background: radial-gradient(circle, #b8322a 0 52%, #fff6e6 53% 58%, #b8322a 59%);
    border: 2px dashed #fff6e6;
    box-shadow: 0 2px 3px rgb(0 0 0 / 0.5);
  }
  .tip {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 5;
    white-space: nowrap;
    padding: 0.3rem 0.6rem;
    border-radius: 8px;
    background: var(--text);
    color: var(--bg);
    font-size: 0.8rem;
    font-weight: 700;
  }
</style>
