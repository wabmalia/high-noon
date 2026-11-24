export type CardId = number;

/** Four western suits, each with its own colour (see ui/Card.svelte). */
export type Suit = 'star' | 'cactus' | 'horse' | 'gold';
export const SUITS: readonly Suit[] = ['star', 'cactus', 'horse', 'gold'];

/** Rank 1 is the Ace (wild); 2 to 10 are numbers. */
export interface Card {
  id: CardId;
  rank: number;
  suit: Suit;
}

export const ACE = 1;
export const RANKS = 10;
export const DECK_SIZE = RANKS * SUITS.length;

/** The 40-card deck, unshuffled: A and 2 to 10 in each suit. */
export function buildDeck(): Card[] {
  const cards: Card[] = [];
  let id = 0;
  for (const suit of SUITS) {
    for (let rank = 1; rank <= RANKS; rank++) cards.push({ id: id++, rank, suit });
  }
  return cards;
}

export const SUIT_SYMBOL: Record<Suit, string> = {
  star: '★',
  cactus: '🌵',
  horse: '🐴',
  gold: '💰',
};

export function rankLabel(rank: number): string {
  return rank === ACE ? 'A' : String(rank);
}
