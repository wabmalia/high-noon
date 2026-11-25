import { ACE, type Suit } from './cards';
import type { Held, Player } from './game';

/** A held card's number and suit: an Ace counts as what was picked for it. */
export function valueOf(h: Held): number | null {
  if (h.card.rank !== ACE) return h.card.rank;
  return h.as?.value ?? null;
}
export function suitOf(h: Held): Suit {
  return h.card.rank === ACE && h.as ? h.as.suit : h.card.suit;
}
/** What a card scores and pays with: its number. An Ace is always worth $1,
 * whatever it stands for. */
export function pointsOf(h: Held): number {
  return h.card.rank === ACE ? 1 : h.card.rank;
}

/** Bonus for a run of n in a row: 3 in a row +3, 4 +7, 5 +12, ... */
export function runBonus(n: number): number {
  return n < 3 ? 0 : (n * (n + 1)) / 2 - 3;
}
export const SAME_SUIT_BONUS = 10;
export const SAME_SUIT_MIN = 5;

export interface Run {
  from: number;
  to: number;
  sameSuit: boolean;
}

/** Runs of two or more consecutive numbers in a line, low to high. */
export function runsOf(line: Held[]): Run[] {
  const values = [...new Set(line.map(valueOf).filter((v): v is number => v !== null))].sort((a, b) => a - b);
  const runs: Run[] = [];
  let start = 0;
  for (let i = 1; i <= values.length; i++) {
    if (i < values.length && values[i] === values[i - 1]! + 1) continue;
    const from = values[start]!;
    const to = values[i - 1]!;
    if (to > from) runs.push({ from, to, sameSuit: sameSuit(line, from, to) });
    start = i;
  }
  return runs;
}

// One suit that has a card for every number of the run.
function sameSuit(line: Held[], from: number, to: number): boolean {
  if (to - from + 1 < SAME_SUIT_MIN) return false;
  const suits: Suit[] = ['star', 'cactus', 'horse', 'gold'];
  return suits.some((suit) => {
    for (let v = from; v <= to; v++) {
      if (!line.some((h) => valueOf(h) === v && suitOf(h) === suit)) return false;
    }
    return true;
  });
}

export interface LineScore {
  /** Face value of the cards that count (runs, or a Solo hand), before x2. */
  cards: number;
  double: boolean;
  /** Run bonuses plus same suit bonuses. */
  bonus: number;
  marker: number;
  /** Before any Sheriff's Cut. */
  total: number;
  solo: boolean;
  runs: Run[];
}

/**
 * A line's score: only runs count, or a Solo (every card the same number).
 * Card points (x2 with Double or Nothing), then bonuses and markers together,
 * never below 0. Busted lines score nothing.
 */
export function scoreLine(p: Player): LineScore {
  const empty: LineScore = { cards: 0, double: p.double, bonus: 0, marker: p.marker, total: 0, solo: false, runs: [] };
  if (p.status === 'busted' || p.line.length === 0) return empty;
  const values = new Set(p.line.map(valueOf));
  if (values.size === 1) {
    const cards = p.line.reduce((sum, h) => sum + pointsOf(h), 0);
    const total = Math.max(0, cards * (p.double ? 2 : 1) - p.marker);
    return { ...empty, cards, total, solo: true };
  }
  const runs = runsOf(p.line);
  const inRun = (v: number | null) => v !== null && runs.some((r) => v >= r.from && v <= r.to);
  const cards = p.line.filter((h) => inRun(valueOf(h))).reduce((sum, h) => sum + pointsOf(h), 0);
  const bonus = runs.reduce((sum, r) => sum + runBonus(r.to - r.from + 1) + (r.sameSuit ? SAME_SUIT_BONUS : 0), 0);
  const total = Math.max(0, cards * (p.double ? 2 : 1) + bonus - p.marker);
  return { cards, double: p.double, bonus, marker: p.marker, total, solo: false, runs };
}

/** What a hand can pay with: all its cards, runs or not, minus markers. */
export function handMoney(p: Player): number {
  return Math.max(0, p.line.reduce((sum, h) => sum + pointsOf(h), 0) - p.marker);
}

/** The cards that score in a line: those in its runs, or all of a Solo. */
export function countingCards(p: Player): number[] {
  const sc = scoreLine(p);
  if (p.status === 'busted') return [];
  if (sc.solo) return p.line.map((h) => h.card.id);
  return p.line.filter((h) => {
    const v = valueOf(h);
    return v !== null && sc.runs.some((r) => v >= r.from && v <= r.to);
  }).map((h) => h.card.id);
}
