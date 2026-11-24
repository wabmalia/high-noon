# High Noon: design

A saloon card game for the arcade, multiplayer only. It grew out of Turn 7
(wabmalia/turn7), which follows a commercial card game's rules closely: fine
for friends on the website, not for the app stores. High Noon keeps the
feeling (flip, push your luck, bust) and changes the name, the look, the
deck, the goal and how actions work. Turn 7 stays as it is.

Status: design in progress (2026-11-24). Nothing built yet. **Proposal**
marks a choice not yet confirmed; **Open** marks a question still to decide.

## The pitch

A saloon card game. Flip cards, build runs (wild Aces help), and spend
your winnings at the bar on dirty tricks: a spin of the Roulette, the
sheriff's cut, a horseshoe for luck, and a secret bet on who wins the round. First to
$123. Multiplayer only.

## Deck

- **Ace and 2 to 10, four suits**: 40 cards, 4 copies of each. The Ace
  takes the place of the 1 and is wild (see Aces).
- Enough cards that the deck doesn't need a reshuffle every turn.
- No action, modifier or special cards in the deck: actions are bought
  (see Shop).
- Suits have western symbols. **Proposal:** horseshoes, sheriff's stars,
  bullets and cacti, each with its own colour.
- Empty deck: the discard pile is shuffled back in.

Why: every number is equally likely, so runs anywhere on the line are
fair, and the "n copies of n" distribution of the original is gone.

## A turn

- On your turn you flip a card, or stay to keep what you have.
- **Bust:** receiving a number you already hold (unless it has a Horseshoe,
  see Shop) busts you. A busted hand scores $0.
- After you flip, you may buy **one** item at the bar (see Shop).
- Any way a card arrives in your line (flip, Roulette, One for the
  Road, Pickpocket, Card Sharp) counts as receiving it: duplicates bust,
  runs complete.

## Aces

- An Ace is **wild**: when it arrives, its receiver picks the number
  (1 to 10) and the suit it stands for.
- It scores **$0**: it's there to link runs, not for its value.
- It counts as that number and suit for everything else: runs, same
  suit runs, and duplicates (picking a number you already hold busts
  you, unless that card has a Horseshoe).
- The choice stays with the card, except: **a Pickpocketed Ace is picked
  again by the thief** (any number and suit). A swapped Ace keeps what it
  stands for; Shoot It Down removes it.
- **Proposal:** an Ace can stand for 1, so A-2-3-4-5 is a run of five even
  though there's no 1 card.

## What scores: runs only

- Only **runs** score: two or more consecutive numbers in your line
  (e.g. 4-5, or 7-8-9). Each run scores the sum of its cards. You can have
  several runs at once: 1-2, 4-5 and 7-8 score $3 + $9 + $15 = $27.
- A card with no neighbour scores **nothing**: 3-4 with a lone 10 scores
  $7.
- **Solo:** if a single card is your *whole* hand, it scores its value.
  Staying with just a 10 banks $10 and keeps your money safe for later
  rounds and the bar.
- **Proposal:** Horseshoe copies follow their number. Two 8s inside 7-8-9
  score 7 + 8 + 8 + 9 = $32; a lone pair of 8s (nothing next to them) scores
  nothing, unless they're your whole hand (a Solo of $16).
- An Ace scores $0 wherever it is, but links a run.

## Run bonuses

On top of its cards, a run earns a bonus that grows with its length: each
card past the second adds the run's length at that card.

| Run | Bonus | How |
|---|---|---|
| 2 in a row | $0 | |
| 3 in a row | +$3 | 3 |
| 4 in a row | +$7 | 3 + 4 |
| 5 in a row | +$12 | 3 + 4 + 5 |
| 6 in a row | +$18 | 3 + 4 + 5 + 6 |
| 7 in a row | +$25 | ... + 7 |
| 8 in a row | +$33 | ... + 8 |
| 9 in a row | +$42 | ... + 9 |
| 10 in a row (A to 10) | +$52 | ... + 10 |

(For a run of n: n(n+1)/2 - 3.) Example: 6-7-8-9-10 scores $40 for the
cards plus $12, so $52.

- Each run gets its own bonus: 2-3-4 and 7-8-9 earn +$3 each.
- **Same suit run:** a run of five or more all in one suit earns **+$10**
  more (a flat bonus, so it isn't overpowered).
- A Horseshoe's copy doesn't lengthen a run: a second 4 is still one 4 in
  the run (it adds its points, not length).
- Runs never end your turn: keep flipping for a longer run as long as you
  dare. (The old "five in a row ends your turn" rule is gone.)

## Paying

- **From your hand:** the price becomes a **-$X marker** in your line for
  this round. If you bust, the hand is lost anyway and the marker with it.
- For paying, your hand is worth **all its cards**, runs or not: a lone 10
  doesn't score, but it can still pay for a drink at the bar.
- **Beyond your hand's value**, the rest comes out of your bank (your total),
  and that's gone for good, bust or not.
- One purchase per turn, after you flip.

## Shop (the bar)

| Item | Was | Cost | Effect |
|---|---|---|---|
| **Roulette** | Flip Four | $10 | The target receives 3 cards, one at a time, stopping early on a bust. If they get through all 3, the **buyer gets the $10 back into their bank**, whoever the target was. |
| **One for the Road** | Just One More | $8 | The target receives one card, then must stay. Works on players who already stayed. |
| **Pickpocket** | Steal | $12 | Take one face-up card from another player's line into yours. |
| **Card Sharp** | Swap | $12 | Swap two face-up cards between two different players (you can be one). |
| **Shoot It Down** | Discard | $10 | Remove one face-up card from any line. |
| **Double or Nothing** | (new) | $20 | Doubles your card points this round (not the bonuses). |
| **Sheriff's Cut** | ÷2 | $15 | Put on another player: at the end of the round, what they earn is **split in equal shares** between them and each Sheriff's Cut on them: one cut, half each; two cuts, a third each; and so on. Shares round down. |
| **Horseshoe** | Lucky 13 | $3 | A sticker on one of your cards without one: you can receive that number once more without busting, and both copies score. The copy can get its own Horseshoe, so copies stack: three 8s score $24. |

Notes:
- Horseshoe is cheap on purpose: with four of each number, a second copy is
  common, so luck has to be affordable. With only 40 cards, players can
  count what's left and sticker the numbers still likely to come. Stickering a whole 6-7-8-9-10 hand
  costs $15 over five turns (one purchase per turn).
- Roulette is the centerpiece animation: a revolver cylinder spins and
  shoots each card out onto the table, one at a time. Never aimed at a
  player: playful, not mature (keeps the store age rating low).

## Scoring a round

In this order:

1. **Card points:** the face values of your runs (or your Solo hand).
   Double or Nothing doubles these, and only these.
2. **Pluses and minuses, together:** add the run bonuses and $10 for each
   same suit run of five or more, subtract your -$X markers. Not below $0.
   A marker bigger than your score doesn't touch your bank, for now (a
   known loophole: weak hands can buy cheaply; watch it in the simulation).
3. **Sheriff's Cut, last:** the result is split in equal shares between you
   and each cutter (one cut: halves; two: thirds). Shares round down; any
   leftover dollar goes to nobody.
4. Busted: $0, and nothing for the sheriff either.

Example: 6-7-8-9-10, all hearts, Double or Nothing, a -$12 marker and one
Sheriff's Cut on you: cards $40 x2 = $80, + $12 run bonus + $10 same suit
- $12 marker = $90, then the sheriff takes half: $45 for you, $45 for the
cutter.

## The Bet!

Before each round, every player may secretly **bet $5 from their bank** on
who will win that round.

- The round's winner is whoever scores the most that round. Ties are fine
  (all of them won). A round where the best score is $0 has no winner.
- A right bet pays **the winner's round score, divided by the number of
  players who bet** (rounded down), into the bettor's bank. A wrong bet
  just loses the $5.
- Bets stay hidden until the round ends, then everyone sees who bet on
  whom.
- **Proposal:** you may bet on yourself.
- **Proposal:** "the number of players who bet" means everyone who placed
  a bet that round, right or wrong, so a crowded table pays less. To
  confirm.

## Winning

- Multiplayer only: High Noon is a game against other people (no solo
  mode).
- At the end of a round, if anyone has **$123** or more (a run, of course),
  the highest total wins.
- A first-round win is possible but very unlikely: A to 10 in one suit is
  $54 for the cards (the Ace scores $0) + $52 run bonus + $10 same suit =
  $116, still short of $123. It takes that plus a Horseshoe copy, or Double
  or Nothing on the cards ($54 x2 + $62 = $170).

## Theme

- Saloon, wild west. Money is dollars, the bank is your stash, the shop is
  the bar.
- Bust: a "BUSTED" sheriff's badge stamp.
- Cards: four western suits on worn paper.

## Balancing

Everything here needs testing: prices, the $123 target, the run
bonuses, Horseshoe stacking and the Ace. The simulation (next steps) comes
before any of it is built.

## Next steps

1. Settle the open questions above.
2. A simulation (thousands of rounds, simple strategies: never buy, buy
   Horseshoes, roulette the leader, ...) to tune the prices and the $123
   target before building.
3. Build High Noon here: engine rules and tests first, then the art. It can
   reuse courier for rooms, like the other games.
4. Then it joins the arcade (a tile on the website) and arcade-app's
   `games.json` for the store builds, where Turn 7 stays test only.
