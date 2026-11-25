<script lang="ts">
  import type { Snippet } from 'svelte';

  // A decision or a summary over the table, without hiding it: a drawer from
  // the bottom on phones, only as tall as its content; a dialog in the middle
  // on wide screens. Title on top, its buttons at the bottom (under the thumb).
  let { title, sub = '', top, children, actions }: { title: string; sub?: string; top?: Snippet; children: Snippet; actions?: Snippet } = $props();
</script>

<div class="scrim" aria-hidden="true"></div>
<div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
  <span class="grip" aria-hidden="true"></span>
  <header>
    <div>
      <h2>{title}</h2>
      {#if sub}<p class="muted small">{sub}</p>{/if}
    </div>
    {@render top?.()}
  </header>
  <div class="body">
    {@render children()}
  </div>
  {#if actions}
    <footer>{@render actions()}</footer>
  {/if}
</div>

<style>
  /* Just enough shade to tell the drawer from the table, which stays readable. */
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 29;
    background: rgb(10 6 3 / 0.35);
  }
  .sheet {
    position: fixed;
    z-index: 30;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 72dvh;
    display: flex;
    flex-direction: column;
    padding: 0.4rem max(14px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
    border-radius: 18px 18px 0 0;
    border: 1px solid var(--border);
    border-bottom: 0;
    background: linear-gradient(180deg, #3b2617, var(--bg) 60%);
    box-shadow: 0 -10px 30px rgb(0 0 0 / 0.5);
    animation: up 0.2s ease-out;
  }
  .grip {
    align-self: center;
    width: 2.6rem;
    height: 4px;
    border-radius: 2px;
    background: var(--border);
    margin-bottom: 0.4rem;
  }
  @keyframes up {
    from {
      transform: translateY(40px);
      opacity: 0;
    }
  }
  /* Wide screens: a dialog in the middle. */
  @media (min-width: 720px) {
    .sheet {
      left: 50%;
      right: auto;
      bottom: auto;
      top: 50%;
      width: min(480px, calc(100vw - 32px));
      max-height: 80dvh;
      transform: translate(-50%, -50%);
      padding: 1rem 1.1rem;
      border-radius: 16px;
      border-bottom: 1px solid var(--border);
      animation: none;
    }
    .grip {
      display: none;
    }
    .scrim {
      background: rgb(10 6 3 / 0.55);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .sheet {
      animation: none;
    }
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    margin-bottom: 0.5rem;
  }
  h2 {
    margin: 0;
    color: var(--gold);
    font-size: 1.35rem;
  }
  p {
    margin: 0;
  }
  .small {
    font-size: 0.85rem;
  }
  .body {
    overflow-y: auto;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-height: 0;
  }
  footer {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.6rem;
  }
  footer > :global(*) {
    flex: 1;
  }
  footer :global(button) {
    padding: 0.85rem;
    font-size: 1.05rem;
  }
</style>
