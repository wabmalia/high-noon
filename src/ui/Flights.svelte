<script lang="ts">
  import { tick } from 'svelte';
  import type { CardId } from '../engine/cards';
  import type { Held, Player } from '../engine/game';
  import Card from './Card.svelte';

  // New cards fly in: off the deck, flipping through the air, landing big in
  // the middle of the table for a beat, then into their hand. The real card
  // in the hand stays hidden until its flight lands there. One at a time, a
  // little faster when several are waiting (the deal, a Roulette).
  let { players, table, deck }: { players: Player[]; table: HTMLElement | null; deck: HTMLElement | null } = $props();

  const W = 66; // the flying card's width in px (it scales from there)
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  let flying = $state<Held | null>(null);
  let flyer = $state<HTMLElement | null>(null);
  const queue: Held[] = [];
  let busy = false;
  let previous: Set<CardId> | null = null;

  // Spot the cards that weren't on the table at the last update.
  $effect(() => {
    const now = new Set<CardId>();
    const held = new Map<CardId, Held>();
    for (const p of players) for (const h of p.line) (now.add(h.card.id), held.set(h.card.id, h));
    const before = previous;
    previous = now;
    if (!before || still) return; // nothing flies on the first look at the table
    for (const id of now) if (!before.has(id)) queue.push(held.get(id)!);
    if (queue.length) void hide().then(run);
  });

  const target = (id: CardId) => table?.querySelector<HTMLElement>(`[data-card="${id}"]`) ?? null;

  // Hide the waiting cards' places in their hands.
  async function hide() {
    await tick();
    for (const h of queue) {
      const el = target(h.card.id);
      if (el) el.style.visibility = 'hidden';
    }
  }

  async function run() {
    if (busy) return;
    busy = true;
    while (queue.length) {
      const h = queue.shift()!;
      await fly(h, queue.length ? 750 : 1150);
    }
    busy = false;
  }

  async function fly(h: Held, ms: number) {
    flying = h;
    await tick();
    const el = flyer;
    const dest = target(h.card.id);
    if (!el) return reveal(dest);
    const vw = innerWidth;
    const vh = innerHeight;
    const from = deck?.getBoundingClientRect() ?? new DOMRect(vw / 2 - 20, vh / 2 - 28, 40, 56);
    // The landing: the middle of the table, big.
    const land = { x: vw / 2, y: vh * 0.45, s: Math.min(1.9, (vw * 0.34) / W) };
    const to = dest?.getBoundingClientRect();
    const at = (x: number, y: number, s: number, ry: number, rz: number) =>
      `translate(${x - W / 2}px, ${y - (W * 1.4) / 2}px) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`;
    const sx = from.x + from.width / 2;
    const sy = from.y + from.height / 2;
    const ss = from.width / W;
    const frames: Keyframe[] = [
      // (No opacity changes in flight: anything below 1 flattens the 3D.)
      { transform: at(sx, sy, ss, 180, 0), offset: 0 },
      // Up through the air, turning over.
      { transform: at((sx + land.x) / 2, Math.min(sy, land.y) - 70, land.s * 0.8, 90, -14), offset: 0.25 },
      // Lands, with a little bounce.
      { transform: at(land.x, land.y, land.s * 1.08, 0, 4), offset: 0.48 },
      { transform: at(land.x, land.y, land.s, 0, 0), offset: 0.56 },
      // A beat to see it.
      { transform: at(land.x, land.y, land.s, 0, 0), offset: 0.74 },
      // Into the hand.
      to
        ? { transform: at(to.x + to.width / 2, to.y + to.height / 2, to.width / W, 0, 0), offset: 1 }
        : { transform: at(land.x, land.y + 40, land.s * 0.5, 0, 0), opacity: 0, offset: 1 },
    ];
    await el.animate(frames, { duration: ms, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' }).finished.catch(() => {});
    reveal(dest);
  }

  function reveal(dest: HTMLElement | null) {
    if (dest) dest.style.visibility = '';
    flying = null;
  }
</script>

{#if flying}
  <div class="flyer" bind:this={flyer} style="--fw: {W}px" aria-hidden="true">
    <div class="face"><Card held={flying} still /></div>
    <div class="back"></div>
  </div>
{/if}

<style>
  .flyer {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 40;
    width: var(--fw);
    height: calc(var(--fw) * 1.4);
    transform-style: preserve-3d;
    pointer-events: none;
    will-change: transform;
  }
  .face,
  .back {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
  }
  /* The card itself flat, its back hidden: from behind you see the back. */
  .face :global(.card) {
    --w: var(--fw);
    transform-style: flat;
    backface-visibility: hidden;
  }
  /* The back: red saloon paper with a gold diamond lattice. */
  .back {
    transform: rotateY(180deg);
    border-radius: 7px;
    border: 2px solid var(--card-edge);
    background:
      repeating-linear-gradient(45deg, rgb(224 168 60 / 0.35) 0 2px, transparent 2px 9px),
      repeating-linear-gradient(-45deg, rgb(224 168 60 / 0.35) 0 2px, transparent 2px 9px),
      #8e2b1f;
    box-shadow: inset 0 0 0 4px #f6ecd4;
  }
</style>
