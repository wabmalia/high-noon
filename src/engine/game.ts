import { ACE, buildDeck, RANKS, SUITS, type Card, type CardId, type Suit } from './cards';
import { shuffle, type Seed } from './rng';
import { handMoney, scoreLine, valueOf, type LineScore } from './score';

// High Noon's rules (docs/DESIGN.md). Pure functions over a plain state: the
// host runs them; everyone else only sends actions.

export type PlayerId = string;

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
/** First to this many dollars (at the end of a round) wins. */
export const TARGET = 123;
export const BET = 5;

export type Item = 'roulette' | 'road' | 'pickpocket' | 'sharp' | 'shoot' | 'double' | 'cut' | 'horseshoe';
export const ITEMS: readonly Item[] = ['horseshoe', 'road', 'roulette', 'shoot', 'pickpocket', 'sharp', 'cut', 'double'];
export const PRICE: Record<Item, number> = {
  roulette: 10,
  road: 8,
  pickpocket: 12,
  sharp: 12,
  shoot: 10,
  double: 20,
  cut: 15,
  horseshoe: 3,
};
export const ITEM_NAME: Record<Item, string> = {
  roulette: 'Roulette',
  road: 'One for the Road',
  pickpocket: 'Pickpocket',
  sharp: 'Card Sharp',
  shoot: 'Shoot It Down',
  double: 'Double or Nothing',
  cut: "Sheriff's Cut",
  horseshoe: 'Horseshoe',
};
/** Roulette deals this many cards; surviving them refunds the buyer. */
export const ROULETTE_CARDS = 3;

/** A card in a line. An Ace carries the number and suit picked for it. */
export interface Held {
  card: Card;
  as?: { value: number; suit: Suit };
  shoe?: boolean;
}

export type Status = 'active' | 'stayed' | 'busted';

export interface Player {
  id: PlayerId;
  name: string;
  bank: number;
  status: Status;
  line: Held[];
  /** This round's -$ markers from buying with the hand. */
  marker: number;
  double: boolean;
  /** Who put a Sheriff's Cut on this player, one entry per cut. */
  cuts: PlayerId[];
}

export type Prompt =
  | { kind: 'bet'; waiting: PlayerId[] }
  | { kind: 'turn'; player: PlayerId }
  | { kind: 'ace'; player: PlayerId; card: CardId }
  | { kind: 'shop'; player: PlayerId }
  | { kind: 'target'; player: PlayerId; item: Item; picks: 'player' | 'card' | 'two'; options: (PlayerId | CardId)[] };

export type GameAction =
  | { t: 'bet'; on: PlayerId | null }
  | { t: 'flip' }
  | { t: 'stay' }
  | { t: 'ace'; value: number; suit: Suit }
  | { t: 'buy'; item: Item }
  | { t: 'pass' }
  | { t: 'cancel' }
  | { t: 'player'; target: PlayerId }
  | { t: 'cards'; cards: CardId[] }
  | { t: 'next' };

/** A card on its way to someone, dealt one at a time. */
interface Step {
  to: PlayerId;
  mode: 'deal' | 'flip' | 'road' | 'roulette';
  /** Roulette: who bought it, and how they paid: refunded the same way if the
   * target survives the last card. */
  buyer?: PlayerId;
  paid?: Paid;
  last?: boolean;
}

export interface RoundResult {
  player: PlayerId;
  score: LineScore;
  /** What they kept after Sheriff's Cuts on them. */
  kept: number;
  /** From their own cuts on others. */
  cutIncome: number;
  bet: PlayerId | null;
  betWon: number;
  /** Bank change this round, all included. */
  gain: number;
}

export interface GameState {
  seed: Seed;
  deck: Card[];
  discard: Card[];
  players: Player[];
  dealer: number;
  round: number;
  phase: 'bet' | 'play' | 'roundOver' | 'gameOver';
  prompt: Prompt | null;
  /** Index of the player whose turn it is. */
  turn: number;
  /** Cards still to deal, one at a time (the host paces them). */
  queue: Step[];
  /** What the queue is for: after it empties, the game moves on from here. */
  ctx: 'deal' | 'flip' | 'item';
  /** True while the host should deal the next queued card after a pause. */
  paused: boolean;
  /** The delivery an Ace interrupted, finished once its number is picked. */
  aceStep: Step | null;
  /** Secret until the round ends (see view.ts). */
  bets: Record<PlayerId, PlayerId | null>;
  results: RoundResult[] | null;
  /** Round winners (best score, above $0). */
  roundWinners: PlayerId[];
  winners: PlayerId[];
  log: string[];
}

export class EngineError extends Error {}

function fail(msg: string): never {
  throw new EngineError(msg);
}

export function player(s: GameState, id: PlayerId): Player {
  return s.players.find((p) => p.id === id) ?? fail('No such player');
}

export function ownerOf(s: GameState, card: CardId): Player | undefined {
  return s.players.find((p) => p.line.some((h) => h.card.id === card));
}

// Setup ----------------------------------------------------------------------

export function createGame(members: { id: PlayerId; name: string }[], opts: { dealer?: number; seed?: Seed } = {}): GameState {
  if (members.length < MIN_PLAYERS) fail(`Needs ${MIN_PLAYERS} players`);
  const deck = buildDeck();
  const seed = shuffle(deck, opts.seed ?? null);
  const s: GameState = {
    seed,
    deck,
    discard: [],
    players: members.map((m) => ({ id: m.id, name: m.name, bank: 0, status: 'active', line: [], marker: 0, double: false, cuts: [] })),
    dealer: opts.dealer ?? 0,
    round: 0,
    phase: 'bet',
    prompt: null,
    turn: 0,
    queue: [],
    ctx: 'deal',
    paused: false,
    aceStep: null,
    bets: {},
    results: null,
    roundWinners: [],
    winners: [],
    log: [],
  };
  startRound(s);
  return s;
}

function startRound(s: GameState) {
  s.round++;
  for (const p of s.players) {
    s.discard.push(...p.line.map((h) => h.card));
    Object.assign(p, { status: 'active', line: [], marker: 0, double: false, cuts: [] });
  }
  s.bets = {};
  s.results = null;
  s.roundWinners = [];
  s.log = [];
  const canBet = s.players.filter((p) => p.bank >= BET).map((p) => p.id);
  if (canBet.length) {
    s.phase = 'bet';
    s.prompt = { kind: 'bet', waiting: canBet };
  } else {
    deal(s);
  }
}

// One card each, from the left of the dealer.
function deal(s: GameState) {
  s.phase = 'play';
  s.prompt = null;
  s.ctx = 'deal';
  s.queue = order(s, s.dealer + 1).map((p) => ({ to: p.id, mode: 'deal' }));
  s.paused = true;
}

/** Players in turn order, starting at index `from`. */
function order(s: GameState, from: number): Player[] {
  const n = s.players.length;
  return Array.from({ length: n }, (_, i) => s.players[(from + i) % n]!);
}

// Actions --------------------------------------------------------------------

/** Apply one player's action. Returns a new state; throws EngineError if it's not allowed. */
export function apply(prev: GameState, id: PlayerId, action: GameAction): GameState {
  const s = structuredClone(prev);
  const prompt = s.prompt;

  if (action.t === 'next') {
    if (s.phase !== 'roundOver') fail('The round is not over');
    s.dealer = (s.dealer + 1) % s.players.length;
    startRound(s);
    return s;
  }

  if (!prompt) fail('Wait a moment');

  if (prompt.kind === 'bet') {
    if (action.t !== 'bet') fail('Place your bet');
    if (!prompt.waiting.includes(id)) fail('Not your bet');
    if (action.on !== null) player(s, action.on);
    s.bets[id] = action.on;
    prompt.waiting = prompt.waiting.filter((w) => w !== id);
    if (prompt.waiting.length === 0) deal(s);
    return s;
  }

  if (prompt.player !== id) fail('Not your turn');
  const me = player(s, id);

  switch (prompt.kind) {
    case 'turn':
      if (action.t === 'flip') {
        s.ctx = 'flip';
        s.queue = [{ to: id, mode: 'flip' }];
        s.prompt = null;
        run(s);
      } else if (action.t === 'stay') {
        me.status = 'stayed';
        log(s, `${me.name} stayed`);
        nextTurn(s);
      } else fail('Flip or stay');
      return s;

    case 'ace': {
      if (action.t !== 'ace') fail('Pick a number and suit');
      if (!(Number.isInteger(action.value) && action.value >= 1 && action.value <= RANKS)) fail('Pick a number');
      if (!SUITS.includes(action.suit)) fail('Pick a suit');
      const held = me.line.find((h) => h.card.id === prompt.card) ?? fail('No such card');
      held.as = { value: action.value, suit: action.suit };
      s.prompt = null;
      checkBust(s, me, held);
      const st = s.aceStep;
      s.aceStep = null;
      if (st) afterReceive(s, me, st);
      run(s);
      return s;
    }

    case 'shop':
      if (action.t === 'pass') {
        nextTurn(s);
      } else if (action.t === 'buy') {
        buy(s, me, action.item);
      } else fail('Buy something or pass');
      return s;

    case 'target':
      if (action.t === 'cancel') {
        s.prompt = { kind: 'shop', player: id };
        return s;
      }
      target(s, me, prompt, action);
      return s;
  }
}

/** The host calls this after a pause to deal the next queued card. */
export function advance(prev: GameState): GameState {
  const s = structuredClone(prev);
  if (!s.paused) return s;
  step(s);
  return s;
}

// Deal queued cards until one needs a decision (an Ace) or a pause.
function run(s: GameState) {
  while (!s.prompt && s.queue.length) {
    const paced = s.queue[0]!.mode === 'deal' || s.queue[0]!.mode === 'roulette';
    if (paced) {
      s.paused = true;
      return;
    }
    step(s);
  }
  if (!s.prompt && !s.queue.length) moveOn(s);
}

function step(s: GameState) {
  s.paused = false;
  const st = s.queue.shift();
  if (!st) return moveOn(s);
  const p = player(s, st.to);
  if (p.status === 'busted') {
    if (st.mode === 'roulette') s.queue = s.queue.filter((q) => q.mode !== 'roulette');
    return run(s);
  }
  const card = draw(s);
  if (!card) {
    log(s, 'The deck ran out');
    s.queue = [];
    return run(s);
  }
  const held: Held = { card };
  p.line.push(held);
  if (card.rank === ACE) {
    // The receiver picks what it stands for; the rest waits.
    s.prompt = { kind: 'ace', player: p.id, card: card.id };
    s.aceStep = st;
    return;
  }
  checkBust(s, p, held);
  afterReceive(s, p, st);
  run(s);
}

// What a delivery does besides the card itself.
function afterReceive(s: GameState, p: Player, st: Step) {
  if (st.mode === 'road' && p.status === 'active') p.status = 'stayed';
  if (st.mode === 'roulette') {
    if (p.status === 'busted') {
      s.queue = s.queue.filter((q) => q.mode !== 'roulette');
    } else if (st.last && st.buyer && st.paid) {
      // Back where it came from: the hand's marker, the bank, or both.
      const buyer = player(s, st.buyer);
      buyer.marker = Math.max(0, buyer.marker - st.paid.hand);
      buyer.bank += st.paid.bank;
      log(s, `${p.name} survived the Roulette: ${buyer.name} gets $${PRICE.roulette} back`);
    }
  }
}

/** A number you already hold busts you, unless its cards carry Horseshoes. */
function checkBust(s: GameState, p: Player, held: Held) {
  const v = valueOf(held);
  if (v === null) return;
  const same = p.line.filter((h) => h !== held && valueOf(h) === v);
  const allowed = 1 + same.filter((h) => h.shoe).length;
  if (same.length >= allowed) {
    p.status = 'busted';
    log(s, `${p.name} BUSTED`);
  }
}

function draw(s: GameState): Card | null {
  if (!s.deck.length) {
    if (!s.discard.length) return null;
    s.deck = s.discard;
    s.discard = [];
    s.seed = shuffle(s.deck, s.seed);
  }
  return s.deck.pop() ?? null;
}

// The queue is done: on to the next decision.
function moveOn(s: GameState) {
  s.paused = false;
  if (s.prompt) return;
  if (s.players.every((p) => p.status !== 'active')) return endRound(s);
  if (s.ctx === 'deal') {
    s.turn = s.dealer;
    return nextTurn(s);
  }
  if (s.ctx === 'flip' && s.players[s.turn]!.status === 'active') {
    s.prompt = { kind: 'shop', player: s.players[s.turn]!.id };
    return;
  }
  nextTurn(s);
}

function nextTurn(s: GameState) {
  s.prompt = null;
  const n = s.players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (s.turn + i) % n;
    if (s.players[idx]!.status === 'active') {
      s.turn = idx;
      s.prompt = { kind: 'turn', player: s.players[idx]!.id };
      return;
    }
  }
  endRound(s);
}

// The bar -------------------------------------------------------------------

/** Dollars this player can spend: the hand's cards, then the bank (minus a $5 bet). */
export function spendable(s: GameState, p: Player): number {
  const reserved = s.bets[p.id] !== undefined && s.bets[p.id] !== null ? BET : 0;
  return handMoney(p) + Math.max(0, p.bank - reserved);
}

const live = (s: GameState) => s.players.filter((p) => p.status !== 'busted');
const cardsOf = (ps: Player[]) => ps.flatMap((p) => p.line.map((h) => h.card.id));

/** Who or what an item can target now, or null if it can't be bought. */
export function targets(s: GameState, me: Player, item: Item): (PlayerId | CardId)[] | null {
  if (spendable(s, me) < PRICE[item]) return null;
  let options: (PlayerId | CardId)[] = [];
  switch (item) {
    case 'roulette':
    case 'road':
      options = live(s).map((p) => p.id);
      break;
    case 'cut':
      options = live(s).filter((p) => p.id !== me.id).map((p) => p.id);
      break;
    case 'pickpocket':
      options = cardsOf(live(s).filter((p) => p.id !== me.id));
      break;
    case 'sharp': {
      const holders = live(s).filter((p) => p.line.length);
      options = holders.length >= 2 ? cardsOf(holders) : [];
      break;
    }
    case 'shoot':
      options = cardsOf(live(s));
      break;
    case 'horseshoe':
      options = me.line.filter((h) => !h.shoe).map((h) => h.card.id);
      break;
    case 'double':
      return me.double ? null : [];
  }
  return options.length ? options : null;
}

function buy(s: GameState, me: Player, item: Item) {
  if (!PRICE[item]) fail('No such item');
  const options = targets(s, me, item) ?? fail("Can't buy that now");
  if (item === 'double') {
    pay(s, me, item);
    me.double = true;
    log(s, `${me.name}: Double or Nothing`);
    s.ctx = 'item';
    return moveOn(s);
  }
  const picks = item === 'sharp' ? 'two' : ['roulette', 'road', 'cut'].includes(item) ? 'player' : 'card';
  s.prompt = { kind: 'target', player: me.id, item, picks, options };
}

function target(s: GameState, me: Player, prompt: Extract<Prompt, { kind: 'target' }>, action: GameAction) {
  const { item, options } = prompt;
  s.prompt = null;
  s.ctx = 'item';
  if (prompt.picks === 'player') {
    if (action.t !== 'player' || !options.includes(action.target)) fail('Pick a player');
    const t = player(s, (action as { target: PlayerId }).target);
    const paid = pay(s, me, item);
    log(s, `${me.name}: ${ITEM_NAME[item]} on ${t.name}`);
    if (item === 'cut') {
      t.cuts.push(me.id);
      return moveOn(s);
    }
    if (item === 'road') s.queue = [{ to: t.id, mode: 'road' }];
    else
      s.queue = Array.from({ length: ROULETTE_CARDS }, (_, i) => ({
        to: t.id,
        mode: 'roulette' as const,
        buyer: me.id,
        paid,
        last: i === ROULETTE_CARDS - 1,
      }));
    return run(s);
  }

  if (action.t !== 'cards') fail('Pick a card');
  const ids = (action as { cards: CardId[] }).cards;
  const want = prompt.picks === 'two' ? 2 : 1;
  if (ids.length !== want || ids.some((c) => !options.includes(c))) fail('Pick a card');
  const [a, b] = ids as [CardId, CardId?];
  const ownerA = ownerOf(s, a) ?? fail('No such card');
  const heldA = ownerA.line.find((h) => h.card.id === a)!;

  if (item === 'sharp') {
    const ownerB = ownerOf(s, b!) ?? fail('No such card');
    if (ownerB === ownerA) fail('Pick cards from two players');
    const heldB = ownerB.line.find((h) => h.card.id === b)!;
    pay(s, me, item);
    // Both leave, then both arrive: a simultaneous swap. Aces keep their pick.
    ownerA.line = ownerA.line.filter((h) => h !== heldA);
    ownerB.line = ownerB.line.filter((h) => h !== heldB);
    ownerA.line.push(heldB);
    ownerB.line.push(heldA);
    log(s, `${me.name}: Card Sharp, ${ownerA.name} and ${ownerB.name} swap`);
    checkBust(s, ownerA, heldB);
    checkBust(s, ownerB, heldA);
    return moveOn(s);
  }

  pay(s, me, item);
  if (item === 'horseshoe') {
    heldA.shoe = true;
    log(s, `${me.name}: Horseshoe`);
    return moveOn(s);
  }
  ownerA.line = ownerA.line.filter((h) => h !== heldA);
  if (item === 'shoot') {
    s.discard.push(heldA.card);
    log(s, `${me.name}: Shoot It Down on ${ownerA.name}`);
    return moveOn(s);
  }
  // Pickpocket: the card joins the thief's line. A stolen Ace is picked again.
  log(s, `${me.name}: Pickpocket from ${ownerA.name}`);
  me.line.push(heldA);
  if (heldA.card.rank === ACE) {
    delete heldA.as;
    s.prompt = { kind: 'ace', player: me.id, card: heldA.card.id };
    return;
  }
  checkBust(s, me, heldA);
  moveOn(s);
}

export interface Paid {
  hand: number;
  bank: number;
}

/** Pay with the hand first (a -$ marker for this round), the rest from the bank. */
function pay(s: GameState, p: Player, item: Item): Paid {
  const price = PRICE[item];
  if (spendable(s, p) < price) fail("You can't afford that");
  const hand = Math.min(price, handMoney(p));
  p.marker += hand;
  p.bank -= price - hand;
  return { hand, bank: price - hand };
}

// End of a round --------------------------------------------------------------

function endRound(s: GameState) {
  s.prompt = null;
  s.queue = [];
  s.paused = false;
  const scores = new Map(s.players.map((p) => [p.id, scoreLine(p)]));
  const kept = new Map<PlayerId, number>();
  const income = new Map<PlayerId, number>(s.players.map((p) => [p.id, 0]));
  for (const p of s.players) {
    const total = scores.get(p.id)!.total;
    // Sheriff's Cut: equal shares between the player and each cut on them,
    // rounded down; the odd dollars stay with the player. A cutter collects
    // even if they busted.
    const share = Math.floor(total / (p.cuts.length + 1));
    kept.set(p.id, total - share * p.cuts.length);
    for (const c of p.cuts) income.set(c, income.get(c)! + share);
  }
  const best = Math.max(...kept.values());
  s.roundWinners = best > 0 ? s.players.filter((p) => kept.get(p.id) === best).map((p) => p.id) : [];

  s.results = s.players.map((p) => {
    const bet = s.bets[p.id] ?? null;
    let betWon = 0;
    if (bet !== null && s.roundWinners.includes(bet)) {
      const backers = Object.values(s.bets).filter((b) => b === bet).length;
      betWon = Math.floor(kept.get(bet)! / backers);
    }
    const gain = kept.get(p.id)! + income.get(p.id)! + betWon - (bet !== null ? BET : 0);
    p.bank += gain;
    return { player: p.id, score: scores.get(p.id)!, kept: kept.get(p.id)!, cutIncome: income.get(p.id)!, bet, betWon, gain };
  });

  const top = Math.max(...s.players.map((p) => p.bank));
  if (top >= TARGET) {
    s.phase = 'gameOver';
    s.winners = s.players.filter((p) => p.bank === top).map((p) => p.id);
  } else {
    s.phase = 'roundOver';
  }
}

function log(s: GameState, line: string) {
  s.log = [...s.log, line].slice(-6);
}
