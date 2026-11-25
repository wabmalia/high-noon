import { describe, expect, it } from 'vitest';
import { botAction } from './bot';
import type { Card, Suit } from './cards';
import { advance, apply, createGame, player, spendable, TARGET, type GameState, type Held, type Player } from './game';
import { runBonus, scoreLine } from './score';
import { publicView } from './view';

let nextId = 1000;
const c = (rank: number, suit: Suit = 'star'): Held => ({ card: { id: nextId++, rank, suit } as Card });
const ace = (value: number, suit: Suit = 'star'): Held => ({ card: { id: nextId++, rank: 1, suit: 'gold' }, as: { value, suit } });

function line(cards: Held[], extra: Partial<Player> = {}): Player {
  return { id: 'x', name: 'X', bank: 0, status: 'stayed', line: cards, marker: 0, double: false, cuts: [], ...extra };
}

/** A game past the deal, with A's turn and the given lines. */
function table(lines: Record<string, Held[]>, banks: Record<string, number> = {}): GameState {
  const ids = Object.keys(lines);
  let s = createGame(
    ids.map((id) => ({ id, name: id })),
    { seed: 7, dealer: ids.length - 1 },
  );
  while (s.paused || s.prompt?.kind === 'ace') {
    s = s.paused ? advance(s) : apply(s, (s.prompt as { player: string }).player, { t: 'ace', value: 1, suit: 'star' });
  }
  for (const p of s.players) {
    p.line = lines[p.id]!;
    p.status = 'active';
    p.bank = banks[p.id] ?? 0;
  }
  s.turn = 0;
  s.prompt = { kind: 'turn', player: ids[0]! };
  return s;
}

/** Everyone stays, in turn order, to end the round. */
function stayAll(s: GameState): GameState {
  while (s.prompt?.kind === 'turn') s = apply(s, s.prompt.player, { t: 'stay' });
  return s;
}

describe('run bonus', () => {
  it('grows by the run length', () => {
    expect([2, 3, 4, 5, 6, 7, 10].map(runBonus)).toEqual([0, 3, 7, 12, 18, 25, 52]);
  });
});

describe('scoring', () => {
  it('counts only runs', () => {
    expect(scoreLine(line([c(3), c(4), c(10)])).total).toBe(7);
    expect(scoreLine(line([c(1 + 1), c(3), c(5), c(6), c(8), c(9)])).total).toBe(5 + 11 + 17);
  });
  it('scores a Solo hand: every card the same number', () => {
    expect(scoreLine(line([c(10)])).total).toBe(10);
    expect(scoreLine(line([c(8), c(8, 'cactus')])).total).toBe(16);
    expect(scoreLine(line([c(3), c(10)])).total).toBe(0);
  });
  it('adds run bonuses, $10 for a same suit run of five, and copies score', () => {
    expect(scoreLine(line([c(6), c(7), c(8), c(9), c(10)])).total).toBe(40 + 12 + 10);
    expect(scoreLine(line([c(6), c(7, 'cactus'), c(8), c(9), c(10)])).total).toBe(40 + 12);
    expect(scoreLine(line([c(7), c(8), c(8, 'horse'), c(9)])).total).toBe(32 + 3);
  });
  it('doubles card points only, then adds bonuses and subtracts markers', () => {
    const p = line([c(6), c(7), c(8, 'cactus'), c(9), c(10)], { double: true, marker: 12 });
    expect(scoreLine(p).total).toBe(80 + 12 - 12);
  });
  it('scores an Ace as $1, whatever it stands for, and lets it link a run', () => {
    expect(scoreLine(line([c(6), c(7), ace(8), c(9), c(10)])).total).toBe(33 + 12 + 10);
    // The playtest hand: A (as 1), 2, 3, 4 with a $10 marker.
    expect(scoreLine(line([ace(1, 'cactus'), c(2, 'cactus'), c(3, 'cactus'), c(4, 'cactus')], { marker: 10 })).total).toBe(10 + 7 - 10);
  });
  it('never goes below zero, and a bust scores nothing', () => {
    expect(scoreLine(line([c(2), c(3)], { marker: 20 })).total).toBe(0);
    expect(scoreLine(line([c(9), c(10)], { status: 'busted' })).total).toBe(0);
  });
});

describe('a round', () => {
  it('deals one card each, then the first player flips or stays', () => {
    let s = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], { seed: 3, dealer: 1 });
    expect(s.phase).toBe('play');
    while (s.paused || s.prompt?.kind === 'ace') {
      s = s.paused ? advance(s) : apply(s, (s.prompt as { player: string }).player, { t: 'ace', value: 5, suit: 'star' });
    }
    expect(s.players.every((p) => p.line.length === 1)).toBe(true);
    expect(s.prompt).toEqual({ kind: 'turn', player: 'a' });
  });

  it('busts on a number already held, unless a Horseshoe covers it', () => {
    const s = table({ a: [c(5)], b: [c(9)] });
    s.deck.push({ id: 1, rank: 5, suit: 'cactus' });
    expect(player(apply(s, 'a', { t: 'flip' }), 'a').status).toBe('busted');
    s.players[0]!.line[0]!.shoe = true;
    const t = apply(s, 'a', { t: 'flip' });
    expect(player(t, 'a').status).toBe('active');
    expect(t.prompt).toEqual({ kind: 'shop', player: 'a' });
  });

  it('pays with the hand first, then the bank', () => {
    let s = table({ a: [c(2)], b: [c(9)] }, { a: 50 });
    s.deck.push({ id: 1, rank: 3, suit: 'cactus' });
    s = apply(s, 'a', { t: 'flip' });
    s = apply(s, 'a', { t: 'buy', item: 'road' });
    s = apply(s, 'a', { t: 'player', target: 'b' });
    expect(player(s, 'a').marker).toBe(5);
    expect(player(s, 'a').bank).toBe(47);
  });

  it("splits a Sheriff's Cut in equal shares, rounding down", () => {
    let s = table({ a: [c(2), c(3)], b: [c(9), c(10)], c: [c(4)] }, { a: 30, c: 30 });
    s.deck.push({ id: 1, rank: 4, suit: 'cactus' });
    s = apply(s, 'a', { t: 'flip' });
    s = apply(s, 'a', { t: 'buy', item: 'cut' });
    s = apply(s, 'a', { t: 'player', target: 'b' });
    s.players[2]!.status = 'stayed';
    s.prompt = { kind: 'turn', player: 'b' };
    s.turn = 1;
    s = stayAll(s);
    const r = (id: string) => s.results!.find((x) => x.player === id)!;
    expect(r('b').kept).toBe(9);
    expect(r('a').cutIncome).toBe(9);
  });

  it('refunds the Roulette buyer the way they paid, when the target survives all three cards', () => {
    let s = table({ a: [c(2)], b: [c(9)] }, { a: 40 });
    s.deck.push({ id: 4, rank: 6, suit: 'gold' }, { id: 3, rank: 5, suit: 'gold' }, { id: 2, rank: 4, suit: 'gold' }, { id: 1, rank: 3, suit: 'gold' });
    s = apply(s, 'a', { t: 'flip' });
    s = apply(s, 'a', { t: 'buy', item: 'roulette' });
    s = apply(s, 'a', { t: 'player', target: 'b' });
    // Paid $5 from the hand (2 + 3) as a marker, $5 from the bank.
    expect(player(s, 'a').marker).toBe(5);
    expect(player(s, 'a').bank).toBe(35);
    while (s.paused) s = advance(s);
    expect(player(s, 'b').line).toHaveLength(4);
    expect(player(s, 'a').marker).toBe(0);
    expect(player(s, 'a').bank).toBe(40);
  });
});

describe('the Bet', () => {
  it('is secret until the round ends, and splits between the backers of the winner', () => {
    let s = table({ a: [c(9), c(10)], b: [c(2)], c: [c(3)] }, { a: 20, b: 20, c: 20 });
    // Rewind to a betting round: everyone can afford it.
    s.phase = 'bet';
    s.prompt = { kind: 'bet', waiting: ['a', 'b', 'c'] };
    s = apply(s, 'b', { t: 'bet', on: 'a' });
    expect(publicView(s).bets).toEqual({});
    s = apply(s, 'c', { t: 'bet', on: 'a' });
    s = apply(s, 'a', { t: 'bet', on: null });
    for (const p of s.players) p.status = 'stayed';
    s.players[0]!.line = [c(9), c(10)];
    s.players[0]!.status = 'active';
    s.queue = [];
    s.paused = false;
    s.prompt = { kind: 'turn', player: 'a' };
    s.turn = 0;
    s = stayAll(s);
    expect(s.roundWinners).toEqual(['a']);
    const r = (id: string) => s.results!.find((x) => x.player === id)!;
    expect(r('b').betWon).toBe(9);
    expect(r('b').gain).toBe(2 + 9 - 5); // their Solo 2, the bet, minus the stake
    expect(publicView(s).bets).toEqual({ a: null, b: 'a', c: 'a' });
  });
});

describe('bots', () => {
  it('play whole games to the target without breaking the rules', () => {
    for (let seed = 1; seed <= 20; seed++) {
      let s = createGame(['a', 'b', 'c'].map((id) => ({ id, name: id })), { seed });
      for (let i = 0; i < 5000 && s.phase !== 'gameOver'; i++) {
        if (s.paused) s = advance(s);
        else if (s.phase === 'roundOver') s = apply(s, 'a', { t: 'next' });
        else {
          const p = s.prompt!;
          const who = p.kind === 'bet' ? p.waiting[0]! : p.player;
          s = apply(s, who, botAction(s, who, () => 0.5)!);
        }
      }
      expect(s.phase).toBe('gameOver');
      expect(Math.max(...s.players.map((p) => p.bank))).toBeGreaterThanOrEqual(TARGET);
      expect(s.players.every((p) => spendable(s, p) >= 0)).toBe(true);
    }
  });
});
