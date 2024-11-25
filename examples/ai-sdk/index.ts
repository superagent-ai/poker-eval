import { generateAction } from "./agent";

import { PokerGame } from "../../src/game";
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
