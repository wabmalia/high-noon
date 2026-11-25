<script lang="ts">
  import type { Snippet } from 'svelte';

  // A full-screen sheet for a decision or a summary: title at the top, its
  // buttons at the bottom, under the thumb.
  let { title, sub = '', top, children, actions }: { title: string; sub?: string; top?: Snippet; children: Snippet; actions?: Snippet } = $props();
</script>

<div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
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
  .sheet {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    background: radial-gradient(ellipse at 50% 0%, #3b2617 0%, var(--bg) 70%);
    padding: max(12px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom))
      max(14px, env(safe-area-inset-left));
    animation: rise 0.18s ease-out;
  }
  @keyframes rise {
    from {
      transform: translateY(16px);
      opacity: 0;
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
    max-width: 560px;
    width: 100%;
    margin: 0 auto 0.6rem;
  }
  h2 {
    margin: 0;
    color: var(--gold);
    font-size: 1.5rem;
  }
  p {
    margin: 0;
  }
  .small {
    font-size: 0.85rem;
  }
  .body {
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    max-width: 560px;
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  footer {
    display: flex;
    gap: 0.5rem;
    max-width: 560px;
    width: 100%;
    margin: 0.6rem auto 0;
  }
  footer > :global(*) {
    flex: 1;
  }
  footer :global(button) {
    padding: 0.85rem;
    font-size: 1.05rem;
  }
</style>
