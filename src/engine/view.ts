import type { GameState } from './game';

/**
 * What clients receive: everything on the table, but not the deck order, the
 * seed, the queued deliveries, or the bets before the round ends (you only
 * see that a player has decided). Each player remembers their own bet.
 */
export type PublicState = Omit<GameState, 'deck' | 'seed' | 'queue' | 'aceStep'> & { deckCount: number };

export function publicView(s: GameState): PublicState {
  const { deck, seed: _seed, queue: _queue, aceStep: _aceStep, ...rest } = s;
  const reveal = s.phase === 'roundOver' || s.phase === 'gameOver';
  return { ...rest, bets: reveal ? s.bets : {}, deckCount: deck.length };
}
