# Meowdoku

A cat placement logic puzzle with endless levels.

## Rules

- Place one cat in every row, every column and every coloured region.
- Cats can't touch each other, not even diagonally.
- Tap a cell once to cross it out, twice to place a cat. Drag to cross out several cells.
- A wrong cat costs a fish. Lose all three and the level restarts.

## Endless levels

No levels are stored. Each one is generated from its level number, so level 37 is the same board for everyone.

1. Place the cats at random in a valid arrangement. This is the answer.
2. Grow a region out from each cat until the board is covered.
3. Search for any other valid arrangement. While one exists, move one of its cells into a neighbouring region to break it. Repeat until the answer is the only solution.
4. Solve the board with a solver that only uses deductions a person would make (forced cells, regions confined to rows or columns, and "this cell would leave a region with nowhere to go"). Boards that need guessing are thrown away.
5. Later levels nudge region borders until the board needs a target number of harder deductions.

Board size grows from 5×5 to 10×10 by level 91. Difficulty keeps rising after that. There is also a daily 8×8 puzzle seeded by date.

Generation runs in a Web Worker and the next level is built while you play the current one.

## Development

```bash
npm install
npm run dev
npm test
npm run bench
```

## Deploy

```bash
npm run deploy
```

This builds and uploads `dist` to the `meowdoku` Cloudflare Pages project.
