<script lang="ts">
  import { SUITS, SUIT_SYMBOL, type CardId, type Suit } from '../engine/cards';
  import { BET, ITEMS, ITEM_NAME, PRICE, TARGET, targets, type GameState, type Item, type Player } from '../engine/game';
  import { countingCards, handMoney, runBonus, SAME_SUIT_BONUS } from '../engine/score';
  import type { RoomView } from '../net/protocol';
  import { session } from '../net/session.svelte';
  import Hand from './Hand.svelte';
  import { ITEM_TEXT } from './items';
  import Money from './Money.svelte';
  import RulesSheet from './RulesSheet.svelte';
  import Sheet from './Sheet.svelte';
  import TaxChips from './TaxChips.svelte';

  let { room }: { room: RoomView } = $props();

  const g = $derived(room.game!);
  const me = $derived(g.players.find((p) => p.id === session.me));
  const others = $derived(g.players.filter((p) => p.id !== session.me));
  const prompt = $derived(g.prompt);
  const mine = $derived(!!prompt && prompt.kind !== 'bet' && prompt.player === session.me);
  const isHost = $derived(session.role === 'host');
  const name = (id: string) => g.players.find((p) => p.id === id)?.name ?? '?';
  const player = (id: string) => g.players.find((p) => p.id === id)!;
  const connected = (id: string) => room.members.find((m) => m.id === id)?.connected ?? false;
  const status = (p: Player) =>
    p.status === 'busted' ? 'Busted' : p.status === 'stayed' ? 'Stayed' : prompt?.kind !== 'bet' && prompt?.player === p.id ? 'Turn' : '';

  // My bet this round, which only I know until the round ends.
  const myBet = $derived(session.myBet?.round === g.round ? session.myBet.on : undefined);
  // The engine's rules on what I can buy, with my own bet reserved.
  function options(item: Item) {
    if (!me) return null;
    const bets = myBet !== undefined ? { [me.id]: myBet } : {};
    return targets({ ...g, bets } as unknown as GameState, me, item);
  }

  // Which sheet is up.
  const betting = $derived(g.phase === 'bet' && prompt?.kind === 'bet' && !!me && prompt.waiting.includes(me.id));
  const acing = $derived(mine && prompt?.kind === 'ace');
  const shopping = $derived(mine && (prompt?.kind === 'shop' || prompt?.kind === 'target'));
  const summary = $derived(!!g.results && (g.phase === 'roundOver' || g.phase === 'gameOver'));

  // The bar: pick an item, then Buy; then its target, in the same sheet.
  let chosen = $state<Item | null>(null);
  let peek = $state(false);
  let pickedCards = $state<CardId[]>([]);
  $effect(() => {
    if (prompt?.kind !== 'shop') chosen = null;
    if (prompt?.kind !== 'target') pickedCards = [];
  });
  const picking = $derived(mine && prompt?.kind === 'target' ? prompt : null);
  const pickHint: Record<string, string> = { player: 'Pick a player', card: 'Pick a card', two: 'Pick two cards, from two players' };
  function pickCard(id: CardId) {
    if (!picking) return;
    if (picking.picks === 'card') return session.act({ t: 'cards', cards: [id] });
    pickedCards = pickedCards.includes(id) ? pickedCards.filter((c) => c !== id) : [...pickedCards, id];
    if (pickedCards.length === 2) {
      session.act({ t: 'cards', cards: pickedCards });
      pickedCards = [];
    }
  }
  const optionCards = $derived(picking && picking.picks !== 'player' ? (picking.options as CardId[]) : []);
  const optionPlayers = $derived(picking?.picks === 'player' ? (picking.options as string[]) : []);
  const cardHolders = $derived(g.players.filter((p) => p.line.some((h) => optionCards.includes(h.card.id))));

  // The Ace: a number and a suit.
  let aceValue = $state<number | null>(null);
  let aceSuit = $state<Suit>('star');

  // The round summary: tap a player for their breakdown.
  // (Dev previews ending in /open start with every breakdown open.)
  let expanded = $state<string[]>(import.meta.env.DEV && location.hash.endsWith('/open') ? room.game!.players.map((p) => p.id) : []);
  $effect(() => {
    if (!summary) expanded = [];
  });
  const toggle = (id: string) => (expanded = expanded.includes(id) ? expanded.filter((x) => x !== id) : [...expanded, id]);

  let showRules = $state(false);
</script>

<main>
  <header>
    <span class="western round">Round {g.round}</span>
    <span class="muted small goal">to ${TARGET} · {g.deckCount} left</span>
    <span class="spacer"></span>
    <button class="small-btn" onclick={() => (showRules = true)}>Rules</button>
    <button class="small-btn" onclick={() => session.leave()}>{isHost ? 'Close' : 'Leave'}</button>
  </header>
  {#if !session.linked}<p class="warn small center">Reconnecting…</p>{/if}

  <section class="seats">
    {#each others as p (p.id)}
      <div class="seat panel" class:turn={status(p) === 'Turn'} class:busted={p.status === 'busted'}>
        <div class="seat-head">
          <span class="name">{p.name}</span>
          {#if !connected(p.id)}<span class="chip off">away</span>{/if}
          {#if status(p) && status(p) !== 'Busted'}<span class="chip {status(p).toLowerCase()}">{status(p)}</span>{/if}
          {#if p.double}<span class="badge">x2</span>{/if}
          <span class="spacer"></span>
          <TaxChips cuts={p.cuts} {name} />
        </div>
        <Hand line={p.line} />
        <Money {p} />
      </div>
    {/each}
  </section>

  <div class="middle">
    {#if g.log.length}
      <ul class="log muted small" aria-live="polite">
        {#each g.log.slice(-3) as line, i (i)}<li>{line}</li>{/each}
      </ul>
    {/if}
  </div>

  {#if me}
    <section class="mine" class:turn={status(me) === 'Turn'} class:busted={me.status === 'busted'}>
      <div class="me-bar">
        <span class="name">{me.name}</span>
        {#if status(me) && status(me) !== 'Busted'}<span class="chip {status(me).toLowerCase()}">{status(me)}</span>{/if}
        {#if me.double}<span class="badge">x2</span>{/if}
        <TaxChips cuts={me.cuts} {name} />
        <span class="spacer"></span>
        <Money p={me} />
      </div>
      <Hand line={me.line} mine />
    </section>
  {/if}

  <!-- Under the thumb: the move, or whose move it is. -->
  <nav class="actions">
    {#if g.phase === 'play' && mine && prompt?.kind === 'turn'}
      <button class="big" onclick={() => session.act({ t: 'stay' })}>Stay</button>
      <button class="primary big" onclick={() => session.act({ t: 'flip' })}>Flip</button>
    {:else}
      <p class="muted status">
        {#if g.phase === 'bet'}Bets are in…{myBet ? ` You backed ${name(myBet)}.` : ''}
        {:else if g.phase === 'play' && !prompt}Dealing…
        {:else if prompt && prompt.kind !== 'bet' && !mine}{name(prompt.player)}'s move…
        {:else}&nbsp;{/if}
      </p>
    {/if}
  </nav>
</main>

{#if betting}
  <Sheet title="The Bet!" sub="${BET} on who wins this round.">
    {#each g.players as p (p.id)}
      <button class="row-btn" onclick={() => session.act({ t: 'bet', on: p.id })}>
        <span class="row-head"><span class="name">{p.name}{p.id === session.me ? ' (you)' : ''}</span><b class="bank">${p.bank}</b></span>
      </button>
    {/each}
    {#snippet actions()}
      <button onclick={() => session.act({ t: 'bet', on: null })}>No bet</button>
    {/snippet}
  </Sheet>
{/if}

{#if acing}
  <Sheet title="Ace!" sub="Worth $1. Which card is it?">
    <div class="grid">
      {#each Array.from({ length: 10 }, (_, i) => i + 1) as v (v)}
        <button class:sel={aceValue === v} onclick={() => (aceValue = v)}>{v}</button>
      {/each}
    </div>
    <div class="suits">
      {#each SUITS as s (s)}
        <button class:sel={aceSuit === s} onclick={() => (aceSuit = s)} aria-label={s}>{SUIT_SYMBOL[s]}</button>
      {/each}
    </div>
    {#if me}<div class="row-card"><span class="name">Your hand</span><Hand line={me.line} /></div>{/if}
    {#snippet actions()}
      <button
        class="primary"
        disabled={aceValue === null}
        onclick={() => {
          session.act({ t: 'ace', value: aceValue!, suit: aceSuit });
          aceValue = null;
        }}>OK</button
      >
    {/snippet}
  </Sheet>
{/if}

{#if shopping && me}
  {#if picking}
    <Sheet title={ITEM_NAME[picking.item]} sub={pickHint[picking.picks]}>
      {#if picking.picks === 'player'}
        {#each optionPlayers as id (id)}
          {@const p = player(id)}
          <button class="row-btn" onclick={() => session.act({ t: 'player', target: id })}>
            <span class="row-head"><span class="name">{p.name}{id === session.me ? ' (you)' : ''}</span><Money {p} /></span>
            <Hand line={p.line} />
          </button>
        {/each}
      {:else}
        {#each cardHolders as p (p.id)}
          <div class="row-card">
            <span class="name">{p.name}{p.id === session.me ? ' (you)' : ''}</span>
            <Hand line={p.line} pickable={optionCards} picked={pickedCards} onpick={pickCard} />
          </div>
        {/each}
      {/if}
      {#snippet actions()}
        <button onclick={() => session.act({ t: 'cancel' })}>Back</button>
      {/snippet}
    </Sheet>
  {:else}
    <Sheet title="The bar" sub="Hand ${handMoney(me)} · Bank ${me.bank}">
      {#snippet top()}
        <button class="small-btn" onclick={() => (peek = !peek)}>{peek ? 'Hide table' : 'Table'}</button>
      {/snippet}
      {#if peek}
        {#each g.players as p (p.id)}
          <div class="row-card">
            <span class="row-head"><span class="name">{p.name}{p.id === session.me ? ' (you)' : ''}</span><Money {p} /></span>
            <Hand line={p.line} />
          </div>
        {/each}
      {/if}
      {#each ITEMS as item (item)}
        <button class="item" class:sel={chosen === item} disabled={!options(item)} onclick={() => (chosen = chosen === item ? null : item)}>
          <span class="item-name">{ITEM_NAME[item]}</span><span class="price">${PRICE[item]}</span>
          <span class="item-text">{ITEM_TEXT[item]}</span>
        </button>
      {/each}
      {#snippet actions()}
        <button onclick={() => session.act({ t: 'pass' })}>Skip</button>
        <button class="primary" disabled={!chosen} onclick={() => chosen && session.act({ t: 'buy', item: chosen })}>
          {chosen ? `Buy · $${PRICE[chosen]}` : 'Buy'}
        </button>
      {/snippet}
    </Sheet>
  {/if}
{/if}

{#if summary && g.results}
  <Sheet
    title={g.phase === 'gameOver' ? `${g.winners.map(name).join(' & ')} win${g.winners.length > 1 ? '' : 's'}!` : `Round ${g.round}`}
    sub="Tap a player for the details."
  >
    {#each g.results as r (r.player)}
      {@const p = player(r.player)}
      {@const sc = r.score}
      <button class="row-btn result" class:won={g.roundWinners.includes(r.player)} onclick={() => toggle(r.player)}>
        <span class="row-head">
          <span class="name">{p.name}{p.id === session.me ? ' (you)' : ''}</span>
          <span class="gain">{r.gain >= 0 ? '+' : '−'}${Math.abs(r.gain)}</span>
          <b class="bank">${p.bank}</b>
        </span>
        {#if expanded.includes(r.player)}
          <Hand line={p.line} counting={countingCards(p)} />
          <dl class="breakdown">
            {#if p.status === 'busted'}
              <dt>Busted</dt><dd>$0</dd>
            {:else}
              <dt>{sc.solo ? 'Solo' : 'Runs'}</dt><dd>${sc.cards}{sc.double ? ` x2 = $${sc.cards * 2}` : ''}</dd>
              {#each sc.runs as run, i (i)}
                {#if runBonus(run.to - run.from + 1) || run.sameSuit}
                  <dt>{run.from}–{run.to}</dt>
                  <dd>+${runBonus(run.to - run.from + 1) + (run.sameSuit ? SAME_SUIT_BONUS : 0)}{run.sameSuit ? ' (one suit)' : ''}</dd>
                {/if}
              {/each}
              {#if sc.marker}<dt>Bar tab</dt><dd>−${sc.marker}</dd>{/if}
              {#if p.cuts.length}<dt>Tax</dt><dd>−${sc.total - r.kept} to {p.cuts.map(name).join(', ')}</dd>{/if}
            {/if}
            {#if r.cutIncome}<dt>Tax in</dt><dd>+${r.cutIncome}</dd>{/if}
            {#if r.bet !== null}<dt>Bet on {name(r.bet)}</dt><dd>{r.betWon ? `+$${r.betWon} ` : ''}−${BET}</dd>{/if}
          </dl>
        {/if}
      </button>
    {/each}
    {#snippet actions()}
      {#if g.phase === 'gameOver'}
        {#if isHost}
          <button onclick={() => session.backToLobby()}>Lobby</button>
          <button class="primary" onclick={() => session.start()}>Play again</button>
        {:else}
          <p class="muted center">Waiting for the host…</p>
        {/if}
      {:else}
        <button class="primary" onclick={() => session.act({ t: 'next' })}>Next round</button>
      {/if}
    {/snippet}
  </Sheet>
{/if}

{#if showRules}
  <RulesSheet onclose={() => (showRules = false)} />
{/if}

<style>
  main {
    max-width: 560px;
    min-height: 100dvh;
    margin: 0 auto;
    padding: max(10px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom))
      max(12px, env(safe-area-inset-left));
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .round {
    color: var(--gold);
    font-size: 1.2rem;
    white-space: nowrap;
  }
  .spacer {
    flex: 1;
  }
  .goal {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .small {
    font-size: 0.85rem;
  }
  .small-btn {
    padding: 0.3rem 0.7rem;
    font-size: 0.85rem;
  }
  .center {
    margin: 0;
    text-align: center;
  }
  .warn {
    color: var(--bad);
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
    gap: 0.35rem;
  }
  .seat.turn {
    border-color: var(--gold);
  }
  .seat.busted {
    opacity: 0.55;
  }
  .seat-head,
  .me-bar,
  .row-head {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
  }
  .name {
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
  .chip.stayed {
    background: var(--stay);
    color: #fff;
  }
  .chip.off {
    color: var(--muted);
  }
  .badge {
    font-size: 0.8rem;
    font-weight: 800;
    padding: 0 0.4rem;
    border-radius: 6px;
    background: var(--gold);
    color: #2a1a0e;
  }
  .middle {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .log {
    margin: 0;
    padding: 0;
    list-style: none;
    text-align: center;
  }
  /* My seat: my hand held up toward me, on the felt. */
  .mine {
    padding: 0.5rem 0.6rem 0.8rem;
    border-radius: var(--radius);
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
  .me-bar {
    margin-bottom: 0.2rem;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    min-height: 3.4rem;
  }
  .actions > button {
    flex: 1;
  }
  .big {
    padding: 0.9rem;
    font-size: 1.15rem;
  }
  .actions .primary.big {
    flex: 1.6;
  }
  .status {
    margin: auto;
  }
  /* In the sheets. */
  .row-btn {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.35rem;
    text-align: left;
    padding: 0.7rem 0.8rem;
  }
  .row-head {
    justify-content: space-between;
  }
  .row-card {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
  }
  .bank {
    font-family: var(--western);
    font-weight: 400;
    color: var(--gold);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.4rem;
  }
  .grid button,
  .suits button {
    padding: 0.8rem 0;
    font-size: 1.15rem;
  }
  .suits {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.4rem;
  }
  .sel {
    background: var(--gold);
    color: #2a1a0e;
    border-color: var(--gold);
  }
  .item {
    display: grid;
    grid-template-columns: 1fr auto;
    column-gap: 0.5rem;
    text-align: left;
    padding: 0.55rem 0.8rem;
    font-size: 0.95rem;
  }
  .item.sel .item-text,
  .item.sel .price {
    color: #2a1a0e;
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
  .result .gain {
    margin-left: auto;
    font-weight: 800;
  }
  .result .bank {
    min-width: 3.2rem;
    text-align: right;
  }
  .result.won .name {
    color: var(--gold);
  }
  .breakdown {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.15rem 0.8rem;
    margin: 0.2rem 0 0;
    font-size: 0.88rem;
  }
  .breakdown dt {
    color: var(--muted);
  }
  .breakdown dd {
    margin: 0;
    font-weight: 700;
  }
</style>
