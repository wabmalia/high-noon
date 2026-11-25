<script lang="ts">
  import { ITEMS, ITEM_NAME, PRICE, TARGET } from '../engine/game';
  import { ITEM_TEXT } from './items';

  let { onclose }: { onclose: () => void } = $props();
</script>

<div class="backdrop" role="presentation" onclick={onclose}></div>
<div class="sheet panel" role="dialog" aria-modal="true" aria-labelledby="rules-title">
  <h2 id="rules-title">How to play</h2>
  <ul>
    <li>Flip a card or stay. A number you already have: <b>busted</b>.</li>
    <li>Only <b>runs</b> score: 4-5, 7-8-9. A lone card scores only if it's your whole hand.</li>
    <li>Longer runs pay more: 3 in a row +$3, 4 +$7, 5 +$12… Five of one suit: +$10.</li>
    <li><b>Ace</b>: any number and suit you want, worth $1.</li>
    <li>After each flip, buy one thing at the bar. Pay with your hand (it lowers your score) or your bank.</li>
    <li><b>The Bet</b>: before a round, $5 on who wins it. Right bets split the winner's score.</li>
    <li>First to <b>${TARGET}</b>.</li>
  </ul>
  <h3>The bar</h3>
  <dl>
    {#each ITEMS as item (item)}
      <dt>{ITEM_NAME[item]} <span class="price">${PRICE[item]}</span></dt>
      <dd>{ITEM_TEXT[item]}</dd>
    {/each}
  </dl>
  <button class="primary" onclick={onclose}>Got it</button>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.55);
    z-index: 40;
  }
  .sheet {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(440px, calc(100vw - 24px));
    max-height: calc(100dvh - 24px);
    overflow-y: auto;
    padding: 1rem 1.2rem;
    z-index: 41;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  h2,
  h3 {
    margin: 0;
    color: var(--gold);
  }
  h3 {
    font-size: 1rem;
  }
  ul {
    margin: 0;
    padding-left: 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  dl {
    margin: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.25rem 0.75rem;
    font-size: 0.9rem;
  }
  dt {
    font-weight: 700;
    white-space: nowrap;
  }
  dd {
    margin: 0;
    color: var(--muted);
  }
  .price {
    color: var(--gold);
  }
</style>
