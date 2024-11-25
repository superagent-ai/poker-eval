

<div align="center">

<img src="https://img.recraft.ai/fWW91mib8qMVVKv7Epi4qHqhl0--hZWmog-XRhtsLHU/rs:fit:733:733:0/q:80/g:no/plain/abs://prod/images/01924152-3324-4a01-bb37-32e4e4411fff@avif" alt="OHH Logo" height="100" />

# PokerEval

 A comprehensive tool for assessing AI agents performance in simulated poker environments. Written in Typescript.

[Getting Started](#getting-started) | [Examples](#examples) | [FAQ](#faq) | [Development](#development) | [Contributing](#contributing)

</div>

## Getting started

### Install the package
```
npm i @superagent-ai/poker-eval
```

### Create a game
```ts
// index.ts

import { PokerGame } from "@superagent-ai/poker-eval";

// See example agent: https://github.com/superagent-ai/poker-eval/blob/main/examples/ai-sdk/agent.ts
import { generateAction } from "./agent";
import { Player, PlayerAction } from "../../src/types";

async function executeGameSimulation(numHands: number): Promise<void> {
  // Setup AI players
  const players: Player[] = [
    {
      name: "GPT 1",
      action: async (state): Promise<PlayerAction> => {
        const action = await generateAction(state);
        return action;
      },
    },
    {
      name: "GPT 2",
      action: async (state): Promise<PlayerAction> => {
        const action = await generateAction(state);
        return action;
      },
    },
  ];

  // Setup a game
  const game = new PokerGame(players, {
    defaultChipSize: 1000,
    smallBlind: 1,
    bigBlind: 2,
  });

  // Set the output director for stats collection
  const results = await game.runSimulation(numHands, { outputPath: "./stats" });

  console.log(`Simulation completed for ${numHands} hands.`);
  console.log("Results:", results);
}

// Execute the function with ts-node index.ts
executeGameSimulation(5).catch(console.error);

```

### Evaluate the agent
After the hands are completed you can find the the dataset in the `outputPath` you specified above. 

| position | hole_cards | community_cards | bb_profit |
|----------|------------|-----------------|-----------|
| UTG      | Ah Kh      | 2d 7c 9h 3s 5d  | 3.5       |
| CO       | Qs Qd      | 2d 7c 9h 3s 5d  | -1.0      |
| BTN      | 9c 9s      | 2d 7c 9h 3s 5d  | 2.0       |
| SB       | 7h 8h      | 2d 7c 9h 3s 5d  | -0.5      |
| BB       | 5c 6c      | 2d 7c 9h 3s 5d  | 1.0       |

In this example, the dataset shows the position of the player, their hole cards, the community cards, and the big blind profit (bb_profit) for each hand. The positions are labeled according to standard poker terminology (e.g., UTG for Under the Gun, CO for Cutoff, BTN for Button). The hole cards and community cards are represented in a standard card notation format, and the bb_profit indicates the profit or loss in terms of big blinds for the player in that hand.

BB/100, or Big Blinds per 100 hands, is a common metric used in poker to measure a player's win rate. It represents the average number of big blinds a player wins or loses over 100 hands. To calculate BB/100, use the formula:

BB/100 = (Total bb_profit / Number of hands) * 100

This formula provides a standardized measure of performance, allowing for comparison across different sessions or players by normalizing the win rate to a per-100-hands basis.




