import { config } from "dotenv";
import { OpenAI } from "llamaindex";
import { z } from "zod";
import { PlayerAction, TableState } from "@superagent-ai/poker-eval/dist/types";

config();

const llm = new OpenAI({
  model: "gpt-4o",
  additionalChatOptions: { response_format: { type: "json_object" } },
});

const ActionEnum = z
  .enum(["bet", "fold", "call", "check", "raise"])
  .describe("The action to take");

const schemaExample = `{
    "action": "string (one of: ${ActionEnum.options.join(", ")})",
    "bet": "number (optional)"
  }`;

export const generateAction = async (
  state: TableState
): Promise<PlayerAction> => {
  const ActionEnum = z
    .enum(["bet", "fold", "call", "check", "raise"] as const)
    .describe("The action to take");

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

  const response = await llm.chat({
    messages: [
      {
        role: "system",
        content: `You are an expert assistant for summarizing and extracting insights from sales call transcripts.\n\nGenerate a valid JSON in the following format:\n\n${JSON.stringify(
          schemaExample
        )}`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = JSON.parse(response.message.content as string);
  const { action, bet } = content;

  return {
    action,
    bet: bet ?? 0,
  } as PlayerAction;
};
