import type { Item } from '../engine/game';

/** One line on what each bar item does: the bar and the rules sheet. */
export const ITEM_TEXT: Record<Item, string> = {
  horseshoe: 'One of your cards may come twice.',
  road: 'They get one card, then must stay.',
  roulette: 'They get 3 cards. Survive: you get $10 back.',
  shoot: 'Throw away any card.',
  pickpocket: 'Take a card from someone.',
  sharp: 'Swap two cards between two players.',
  cut: 'Take a share of what they score.',
  double: 'Your card points x2.',
};
