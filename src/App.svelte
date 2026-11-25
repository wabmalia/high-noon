<script lang="ts">
  import { onMount } from 'svelte';
  import { session } from './net/session.svelte';
  import Home from './ui/Home.svelte';
  import Lobby from './ui/Lobby.svelte';
  import Table from './ui/Table.svelte';
  import { previewRoom } from './ui/preview';

  onMount(() => session.restore());

  // Dev only: #/preview/<screen> (see ui/preview.ts).
  const screen = location.hash.split('/')[2] ?? '';
  const previewing = import.meta.env.DEV && location.hash.startsWith('#/preview');
  let preview = $state(previewing ? previewRoom(session.me, screen) : null);
  // #/preview/<screen>/fly: a card arrives for me, then one for Calamity.
  if (previewing && location.hash.endsWith('/fly')) {
    setTimeout(() => (preview = previewRoom(session.me, screen, 1)), 700);
    setTimeout(() => (preview = previewRoom(session.me, screen, 2)), 2600);
  }
</script>

{#if preview}
  <Table room={preview} />
{:else}

{#if session.status === 'room' && session.room}
  {#if session.room.game}
    <Table room={session.room} />
  {:else}
    <Lobby room={session.room} />
  {/if}
{:else}
  <Home />
{/if}

{/if}

{#if session.toast}
  <div class="toast" role="status">{session.toast}</div>
{/if}

<style>
  .toast {
    position: fixed;
    left: 50%;
    bottom: calc(1rem + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    background: var(--text);
    color: var(--bg);
    padding: 0.6rem 1rem;
    border-radius: 999px;
    font-weight: 600;
    z-index: 50;
    max-width: calc(100vw - 2rem);
    text-align: center;
  }
</style>
