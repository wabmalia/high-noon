// Dev only (npm run dev): #/preview/<screen> shows the table from a made-up
// game, to check the layout without two browsers. Not in production builds.
import type { Card, Suit } from '../engine/cards';
import { createGame, type GameState, type Held } from '../engine/game';
import { publicView } from '../engine/view';
import type { RoomView } from '../net/protocol';

let id = 500;
const c = (rank: number, suit: Suit, extra: Partial<Held> = {}): Held => ({ card: { id: id++, rank, suit } as Card, ...extra });

export function previewRoom(me: string, screen: string, extra = 0): RoomView {
  id = 500; // the same ids every time, so a later call only adds new cards
  const members = [
    { id: me, name: 'You' },
    { id: 'b', name: 'Calamity' },
    { id: 'c', name: 'Doc' },
  ];
  // A full table: six players, everyone holding a lot.
  if (screen === 'crowd' || screen === 'crowd-look') members.push({ id: 'd', name: 'Wyatt' }, { id: 'e', name: 'Belle' }, { id: 'f', name: 'Jesse' });
  const s: GameState = createGame(members, { seed: 1 });
  s.phase = 'play';
  s.paused = false;
  s.round = 3;
  const [you, b, d] = s.players as [GameState['players'][0], GameState['players'][0], GameState['players'][0]];
  you.line = [c(6, 'star'), c(7, 'star', { shoe: true }), c(7, 'gold'), c(8, 'cactus'), c(2, 'horse'), c(1, 'gold', { as: { value: 3, suit: 'horse' } })];
  you.bank = 41;
  you.marker = 3;
  b.line = [c(9, 'horse'), c(10, 'horse'), c(4, 'star')];
  b.bank = 58;
  b.double = true;
  d.line = [c(5, 'cactus')];
  d.status = 'stayed';
  d.bank = 22;
  b.cuts = [me];
  s.log = ['Doc stayed', 'You: Horseshoe'];
  // Everyone's latest card, stamped NEW.
  you.lastCard = you.line[3]?.card.id ?? null;
  b.lastCard = b.line[1]?.card.id ?? null;
  d.lastCard = d.line[0]?.card.id ?? null;
  s.turn = 0;
  if (screen === 'crowd' || screen === 'crowd-look') {
    const suits: Suit[] = ['star', 'cactus', 'horse', 'gold'];
    you.line = [1, 2, 2, 3, 5, 6, 7, 7, 9, 10].map((r, i) => c(r, suits[i % 4]!, r === 1 ? { as: { value: 4, suit: 'star' } } : i % 3 === 0 ? { shoe: true } : {}));
    for (const [k, p] of s.players.slice(1).entries()) {
      p.status = 'active';
      p.cuts = k % 2 ? [me] : [];
      p.double = k === 2;
      p.line = [2, 3, 3, 4, 6, 7, 9, 10].map((r, i) => c(r, suits[(i + k) % 4]!, i === 2 ? { shoe: true } : {}));
    }
    s.prompt = { kind: 'turn', player: me };
  } else if (screen === 'ten') {
    // Ten cards, one long run: A (as 1) to 10.
    you.line = [c(1, 'gold', { as: { value: 1, suit: 'star' } }), ...[2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => c(r, 'star'))];
    s.prompt = { kind: 'turn', player: me };
  } else if (screen === 'scatter') {
    // Ten cards in short runs with copies: the widest hand.
    you.line = [c(1, 'gold', { as: { value: 1, suit: 'cactus' } }), c(2, 'star', { shoe: true }), c(2, 'horse'), c(4, 'cactus'), c(5, 'star', { shoe: true }), c(5, 'gold'), c(7, 'horse'), c(8, 'cactus'), c(10, 'star', { shoe: true }), c(10, 'gold')];
    s.prompt = { kind: 'turn', player: me };
  } else if (screen === 'stack') {
    // Three 7s and two 9s, stacked.
    you.line = [c(6, 'star'), c(7, 'star', { shoe: true }), c(7, 'gold', { shoe: true }), c(7, 'cactus'), c(8, 'horse'), c(9, 'horse', { shoe: true }), c(9, 'star')];
    s.prompt = { kind: 'turn', player: me };
  } else if (screen === 'stackpick') {
    // The same hand while picking a card of mine: every stack opens.
    you.line = [c(6, 'star'), c(7, 'star', { shoe: true }), c(7, 'gold', { shoe: true }), c(7, 'cactus'), c(8, 'horse'), c(9, 'horse', { shoe: true }), c(9, 'star')];
    s.prompt = { kind: 'target', player: me, item: 'shoot', picks: 'card', options: you.line.map((h) => h.card.id) };
  } else if (screen === 'roulette') {
    s.prompt = { kind: 'target', player: me, item: 'roulette', picks: 'player', options: [me, 'b', 'c'] };
  } else if (screen === 'bet') {
    s.phase = 'bet';
    for (const p of s.players) p.line = [];
    s.prompt = { kind: 'bet', waiting: [me, 'c'] };
  } else if (screen === 'ace') {
    s.prompt = { kind: 'ace', player: me, card: you.line[5]!.card.id };
    delete you.line[5]!.as;
  } else if (screen === 'turn') {
    s.prompt = { kind: 'turn', player: me };
  } else if (screen === 'pick') {
    s.prompt = { kind: 'target', player: me, item: 'pickpocket', picks: 'card', options: b.line.map((h) => h.card.id) };
  } else if (screen === 'results') {
    s.phase = 'roundOver';
    s.prompt = null;
    s.bets = { [me]: 'b', c: null };
    s.roundWinners = ['b'];
    s.results = [
      { player: me, score: { cards: 21, double: false, bonus: 3, marker: 3, total: 21, solo: false, runs: [] }, kept: 21, cutIncome: 19, bet: 'b', betWon: 19, gain: 54 },
      { player: 'b', score: { cards: 38, double: true, bonus: 0, marker: 0, total: 38, solo: false, runs: [] }, kept: 19, cutIncome: 0, bet: null, betWon: 0, gain: 19 },
      { player: 'c', score: { cards: 5, double: false, bonus: 0, marker: 0, total: 5, solo: true, runs: [] }, kept: 5, cutIncome: 0, bet: null, betWon: 0, gain: 5 },
    ];
  } else {
    s.prompt = { kind: 'shop', player: me };
  }
  // Cards arriving after the first look (#/preview/<screen>/fly).
  if (extra >= 1) you.line.push(c(5, 'horse'));
  if (extra >= 2) b.line.push(c(8, 'gold'));
  return { code: 'NOON1', hostId: me, members: members.map((m) => ({ ...m, connected: true })), game: publicView(s) };
}
