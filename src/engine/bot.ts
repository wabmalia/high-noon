import { SUITS } from './cards';
import { player, type GameAction, type GameState, type PlayerId } from './game';
import { valueOf } from './score';

/**
 * A simple, cautious bot: no bets, no purchases. Keeps the game moving when a
 * player disconnects, and drives the simulation tests.
 */
export function botAction(s: GameState, id: PlayerId, rand: () => number = Math.random): GameAction | null {
  const prompt = s.prompt;
  if (!prompt) return null;
  if (prompt.kind === 'bet') return prompt.waiting.includes(id) ? { t: 'bet', on: null } : null;
  if (prompt.player !== id) return null;
  const me = player(s, id);
  switch (prompt.kind) {
    case 'turn':
      return me.line.length < 2 + Math.floor(rand() * 3) ? { t: 'flip' } : { t: 'stay' };
    case 'ace': {
      // A number not held yet, next to one that is if possible.
      const held = new Set(me.line.map(valueOf));
      const free = Array.from({ length: 10 }, (_, i) => i + 1).filter((v) => !held.has(v));
      const near = free.find((v) => held.has(v - 1) || held.has(v + 1));
      return { t: 'ace', value: near ?? free[0] ?? 1, suit: SUITS[0]! };
    }
    case 'shop':
      return { t: 'pass' };
    case 'target':
      return { t: 'cancel' };
  }
}
