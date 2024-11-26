import { config } from "dotenv";
import { PlayerAction, TableState } from "@superagent-ai/poker-eval/dist/types";
import { Agent } from "@mastra/core";

config();

const chefAgent = new Agent({
  name: "PokerAgent",
  instructions: "You are an AI Assistant playing No Limit Texas Holdem.",
  model: {
    provider: "OPEN_AI",
    name: "gpt-4o",
    toolChoice: "auto",
  },
});

export const generateAction = async (
  state: TableState
): Promise<PlayerAction> => {
  const prompt = `
You are a poker assistant named ${state.playerName}. 
You are playing at a table with ${state.tableInfo.length} players.
Act based on the information below.

Players:
${state.tableInfo
  .map(
    (player) =>
      `${player.name}${player.hasButton ? " (Button)" : ""}, Stack: $${
        player.stack
      }, Bet size: $${player.betSize}`
  )
  .join("\n")}

Game stage: ${state.gameStage}
Your cards: ${state.playerCards}
Cards on the table: ${state.tableCards}
Legal actions: ${state.legalActions.actions.join(", ")}
Min bet: $${state.minRaise}
Max bet: $${state.maxRaise}

Considering the hand strength, potential opponent hands, and optimal strategy, what action should the player take? Explain your reasoning.

Make sure to return the correct amount when calling, raising or bettings.
  `;

  const { object } = await chefAgent.textObject({
    messages: [prompt],
    structuredOutput: {
      action: {
        type: "string",
      },
      bet: {
        type: "number",
      },
    },
  });

  const { action, bet } = object;

  return {
    action,
    bet: bet ?? 0,
  } as PlayerAction;
};
