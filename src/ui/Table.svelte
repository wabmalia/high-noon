<script lang="ts">
  import { SUITS, SUIT_SYMBOL, type CardId, type Suit } from '../engine/cards';
  import { BET, ITEMS, ITEM_NAME, PRICE, TARGET, targets, type GameState, type Item, type Player } from '../engine/game';
  import { handMoney, scoreLine } from '../engine/score';
  import type { RoomView } from '../net/protocol';
  import { session } from '../net/session.svelte';
  import Hand from './Hand.svelte';
  import { ITEM_TEXT } from './items';
  import RulesSheet from './RulesSheet.svelte';

  let { room }: { room: RoomView } = $props();

  const g = $derived(room.game!);
  const me = $derived(g.players.find((p) => p.id === session.me));
  const prompt = $derived(g.prompt);
  const mine = $derived(!!prompt && prompt.kind !== 'bet' && prompt.player === session.me);
  const isHost = $derived(session.role === 'host');
  const name = (id: string) => g.players.find((p) => p.id === id)?.name ?? '?';
  const connected = (id: string) => room.members.find((m) => m.id === id)?.connected ?? false;

  // My bet this round, which only I know until the round ends.
  const myBet = $derived(session.myBet?.round === g.round ? session.myBet.on : undefined);
  // The engine's rules on what I can buy, with my own bet reserved.
  function options(item: Item) {
    if (!me) return null;
    const bets = myBet !== undefined ? { [me.id]: myBet } : {};
    return targets({ ...g, bets } as unknown as GameState, me, item);
  }

  // Picking targets for an item.
  let pickedCards = $state<CardId[]>([]);
  $effect(() => {
    if (prompt?.kind !== 'target') pickedCards = [];
  });
  const picking = $derived(mine && prompt?.kind === 'target' ? prompt : null);
  const pickablePlayers = $derived(picking?.picks === 'player' ? (picking.options as string[]) : []);
  const pickableCards = $derived(picking && picking.picks !== 'player' ? (picking.options as CardId[]) : []);

  function pickPlayer(id: string) {
    if (pickablePlayers.includes(id)) session.act({ t: 'player', target: id });
  }
  function pickCard(id: CardId) {
    if (!picking) return;
    if (picking.picks === 'card') return session.act({ t: 'cards', cards: [id] });
    pickedCards = pickedCards.includes(id) ? pickedCards.filter((c) => c !== id) : [...pickedCards, id];
    if (pickedCards.length === 2) {
      session.act({ t: 'cards', cards: pickedCards });
      pickedCards = [];
    }
  }

  // The Ace: a number and a suit.
  let aceValue = $state<number | null>(null);
  let aceSuit = $state<Suit>('star');

  const pickHint: Record<string, string> = { player: 'Pick a player', card: 'Pick a card', two: 'Pick two cards, from two players' };

  let showRules = $state(false);
  const others = $derived(g.players.filter((p) => p.id !== session.me));
  const status = (p: Player) =>
    p.status === 'busted' ? 'Busted' : p.status === 'stayed' ? 'Stayed' : prompt?.kind !== 'bet' && prompt?.player === p.id ? 'Turn' : '';
</script>

<main>
  <header>
    <span class="western round">Round {g.round}</span>
    <span class="muted small">to ${TARGET} · {g.deckCount} left</span>
    <button class="ghost small-btn" onclick={() => (showRules = true)}>Rules</button>
    <button class="ghost small-btn leave" onclick={() => session.leave()}>{isHost ? 'Close' : 'Leave'}</button>
  </header>
  {#if !session.linked}<p class="warn small center">Reconnecting…</p>{/if}

  <section class="seats">
    {#each others as p (p.id)}
      {@const sc = scoreLine(p)}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        class="seat panel"
        class:turn={status(p) === 'Turn'}
        class:busted={p.status === 'busted'}
        class:pickable={pickablePlayers.includes(p.id)}
        role={pickablePlayers.includes(p.id) ? 'button' : undefined}
        tabindex={pickablePlayers.includes(p.id) ? 0 : undefined}
        onclick={() => pickPlayer(p.id)}
        onkeydown={(e) => e.key === 'Enter' && pickPlayer(p.id)}
      >
        <div class="seat-head">
          <span class="name">{p.name}</span>
          {#if !connected(p.id)}<span class="chip off">away</span>{/if}
          {#if status(p)}<span class="chip {status(p).toLowerCase()}">{status(p)}</span>{/if}
          <span class="bank">${p.bank}</span>
        </div>
        <Hand line={p.line} pickable={pickableCards} picked={pickedCards} onpick={pickCard} />
        <div class="seat-foot muted small">
          {#if p.status !== 'busted' && p.line.length}<span>${sc.total}</span>{/if}
          {#if p.double}<span class="badge">x2</span>{/if}
          {#if p.marker}<span class="badge">-${p.marker}</span>{/if}
          {#each p.cuts as cutter, i (i)}<span class="badge">Cut: {name(cutter)}</span>{/each}
        </div>
      </div>
    {/each}
  </section>

  <section class="action panel">
    {#if g.phase === 'bet' && prompt?.kind === 'bet'}
      {#if me && prompt.waiting.includes(me.id)}
        <h2>The Bet!</h2>
        <p class="muted small">${BET} on who wins this round.</p>
        <div class="choices">
          {#each g.players as p (p.id)}
            <button onclick={() => session.act({ t: 'bet', on: p.id })}>{p.name}</button>
          {/each}
          <button class="ghost" onclick={() => session.act({ t: 'bet', on: null })}>No bet</button>
        </div>
      {:else}
        <p>Bets are in… {myBet ? `You backed ${name(myBet)}.` : ''}</p>
      {/if}
    {:else if g.phase === 'play'}
      {#if !prompt}
        <p class="muted">Dealing…</p>
      {:else if !mine}
        <p class="muted">{name(prompt.kind === 'bet' ? '' : prompt.player)}'s move…</p>
      {:else if prompt.kind === 'turn'}
        <div class="row">
          <button class="primary big" onclick={() => session.act({ t: 'flip' })}>Flip</button>
          <button class="big" onclick={() => session.act({ t: 'stay' })}>Stay</button>
        </div>
      {:else if prompt.kind === 'ace'}
        <h2>Ace!</h2>
        <div class="grid">
          {#each Array.from({ length: 10 }, (_, i) => i + 1) as v (v)}
            <button class:sel={aceValue === v} onclick={() => (aceValue = v)}>{v}</button>
          {/each}
        </div>
        <div class="row">
          {#each SUITS as s (s)}
            <button class="suit {s}" class:sel={aceSuit === s} onclick={() => (aceSuit = s)} aria-label={s}>{SUIT_SYMBOL[s]}</button>
          {/each}
        </div>
        <button
          class="primary"
          disabled={aceValue === null}
          onclick={() => {
            session.act({ t: 'ace', value: aceValue!, suit: aceSuit });
            aceValue = null;
          }}>OK</button
        >
      {:else if prompt.kind === 'shop' && me}
        <div class="bar-head">
          <div>
            <h2>The bar</h2>
            <p class="muted small">Hand ${handMoney(me)} · Bank ${me.bank}</p>
          </div>
          <button class="primary" onclick={() => session.act({ t: 'pass' })}>Done</button>
        </div>
        <div class="shop">
          {#each ITEMS as item (item)}
            <button class="item" disabled={!options(item)} onclick={() => session.act({ t: 'buy', item })}>
              <span class="item-name">{ITEM_NAME[item]}</span><span class="price">${PRICE[item]}</span>
              <span class="item-text">{ITEM_TEXT[item]}</span>
            </button>
          {/each}
        </div>
      {:else if prompt.kind === 'target'}
        <h2>{ITEM_NAME[prompt.item]}</h2>
        <p>{pickHint[prompt.picks]}</p>
        <button class="ghost" onclick={() => session.act({ t: 'cancel' })}>Back</button>
      {/if}
    {:else if g.results}
      {#if g.phase === 'gameOver'}
        <h2>{g.winners.map(name).join(' & ')} win{g.winners.length > 1 ? '' : 's'}!</h2>
      {:else}
        <h2>Round {g.round}</h2>
      {/if}
      <table>
        <tbody>
          {#each g.results as r (r.player)}
            <tr class:won={g.roundWinners.includes(r.player)}>
              <td class="name">{name(r.player)}</td>
              <td class="muted small">
                {r.kept ? `$${r.kept}` : '$0'}{r.cutIncome ? ` +$${r.cutIncome} cut` : ''}{r.bet !== null
                  ? ` · bet ${name(r.bet)} ${r.betWon ? `+$${r.betWon}` : `-$${BET}`}`
                  : ''}
              </td>
              <td class="gain">{r.gain >= 0 ? '+' : ''}{r.gain}</td>
              <td class="bank">${g.players.find((p) => p.id === r.player)?.bank}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      {#if g.phase === 'gameOver'}
        {#if isHost}
          <div class="row">
            <button class="primary" onclick={() => session.start()}>Play again</button>
            <button onclick={() => session.backToLobby()}>Lobby</button>
          </div>
        {:else}
          <p class="muted small">Waiting for the host…</p>
        {/if}
      {:else}
        <button class="primary" onclick={() => session.act({ t: 'next' })}>Next round</button>
      {/if}
    {/if}
  </section>

  {#if g.log.length && !(mine && prompt?.kind === 'shop')}
    <ul class="log muted small" aria-live="polite">
      {#each g.log.slice(-3) as line, i (i)}<li>{line}</li>{/each}
    </ul>
  {/if}

  {#if me}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <section
      class="mine"
      class:turn={status(me) === 'Turn'}
      class:busted={me.status === 'busted'}
      class:pickable={pickablePlayers.includes(me.id)}
      role={pickablePlayers.includes(me.id) ? 'button' : undefined}
      tabindex={pickablePlayers.includes(me.id) ? 0 : undefined}
      onclick={() => pickPlayer(me.id)}
      onkeydown={(e) => e.key === 'Enter' && pickPlayer(me.id)}
    >
      <div class="me-bar">
        <span class="name">{me.name}</span>
        {#if status(me)}<span class="chip {status(me).toLowerCase()}">{status(me)}</span>{/if}
        {#if me.status !== 'busted' && me.line.length}<span class="muted small">Scores ${scoreLine(me).total}</span>{/if}
        {#if me.double}<span class="badge small">x2</span>{/if}
        {#if me.marker}<span class="badge small">-${me.marker}</span>{/if}
        {#each me.cuts as cutter, i (i)}<span class="badge small">Cut: {name(cutter)}</span>{/each}
        <span class="bank">${me.bank}</span>
      </div>
      <Hand line={me.line} mine pickable={pickableCards} picked={pickedCards} onpick={pickCard} />
    </section>
  {/if}

</main>

{#if showRules}
  <RulesSheet onclose={() => (showRules = false)} />
{/if}

<style>
  main {
    max-width: 560px;
    min-height: 100dvh;
    margin: 0 auto;
    padding: max(10px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom))
      max(12px, env(safe-area-inset-left));
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .round {
    color: var(--gold);
    font-size: 1.2rem;
    white-space: nowrap;
  }
  header .small-btn {
    margin-left: auto;
  }
  .small {
    font-size: 0.85rem;
  }
  .small-btn {
    padding: 0.3rem 0.6rem;
    font-size: 0.85rem;
  }
  /* Across the table: the others, side by side when there's room. */
  .seats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.5rem;
  }
  .seat {
    padding: 0.5rem 0.7rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .seat.turn {
    border-color: var(--gold);
  }
  .seat.busted {
    opacity: 0.55;
  }
  .seat.pickable {
    cursor: pointer;
    outline: 3px dashed var(--gold);
    outline-offset: 2px;
  }
  /* My seat: the bottom of the screen, my hand held up toward me. */
  .mine {
    margin-top: auto;
    padding: 0.5rem 0.6rem 1rem;
    border-radius: var(--radius) var(--radius) 0 0;
    background: radial-gradient(ellipse at 50% 120%, #3d6b45 0%, #2b4d31 55%, #1f3824 100%);
    box-shadow: inset 0 2px 0 rgb(255 255 255 / 0.06), var(--shadow);
    border: 1px solid #2a4a2f;
  }
  .mine.turn {
    border-color: var(--gold);
  }
  .mine.busted :global(.hand) {
    opacity: 0.5;
  }
  .mine.pickable {
    cursor: pointer;
    outline: 3px dashed var(--gold);
  }
  .me-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.2rem;
  }
  .seat-head {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .name {
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .bank {
    margin-left: auto;
    font-family: var(--western);
    color: var(--gold);
  }
  .chip {
    font-size: 0.72rem;
    padding: 0.05rem 0.45rem;
    border-radius: 999px;
    background: var(--surface-2);
  }
  .chip.turn {
    background: var(--gold);
    color: #2a1a0e;
  }
  .chip.busted {
    background: var(--bad);
    color: #fff;
  }
  .chip.stayed {
    background: var(--stay);
    color: #fff;
  }
  .chip.off {
    color: var(--muted);
  }
  .seat-foot {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    min-height: 1.1rem;
  }
  .badge {
    padding: 0 0.4rem;
    border-radius: 6px;
    background: rgb(0 0 0 / 0.25);
    color: var(--text);
  }
  .action {
    padding: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    align-items: stretch;
    text-align: center;
  }
  .action h2 {
    margin: 0;
    color: var(--gold);
    font-size: 1.3rem;
  }
  .action p {
    margin: 0;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }
  .row > * {
    flex: 1;
  }
  .big {
    padding: 0.85rem;
    font-size: 1.1rem;
  }
  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: center;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.35rem;
  }
  .sel {
    background: var(--gold);
    color: #2a1a0e;
    border-color: var(--gold);
  }
  .suit {
    font-size: 1.3rem;
  }
  .bar-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    text-align: left;
  }
  .bar-head button {
    padding-inline: 1.4rem;
  }
  /* One item per row: name and price, what it does underneath. The list
     scrolls on its own, so my hand stays in view on small phones. */
  .shop {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    max-height: max(9rem, calc(100dvh - 29.5rem));
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .item {
    display: grid;
    grid-template-columns: 1fr auto;
    column-gap: 0.5rem;
    text-align: left;
    padding: 0.4rem 0.7rem;
    font-size: 0.95rem;
  }
  .item-text {
    grid-column: 1 / -1;
    font-size: 0.8rem;
    font-weight: 400;
    color: var(--muted);
  }
  .price {
    color: var(--gold);
    font-family: var(--western);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
  }
  td {
    padding: 0.3rem 0.2rem;
    border-bottom: 1px solid var(--border);
  }
  tr.won .name {
    color: var(--gold);
  }
  .gain {
    text-align: right;
    font-weight: 700;
  }
  td.bank {
    text-align: right;
    font-family: var(--western);
    color: var(--gold);
  }
  .log {
    margin: 0;
    padding: 0;
    list-style: none;
    text-align: center;
  }
  .leave {
    color: var(--muted);
  }
  .center {
    margin: 0;
    text-align: center;
  }
  .warn {
    color: var(--bad);
  }
</style>
