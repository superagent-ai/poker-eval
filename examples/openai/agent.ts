import { config } from "dotenv";
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { PlayerAction, TableState } from "@superagent-ai/poker-eval/dist/types";

config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ActionEnum = z
  .enum(["bet", "fold", "call", "check", "raise"])
  .describe("The action to take");

const responseSchema = z.object({
  action: ActionEnum,
  bet: z
    .number()
    .describe("The amount to bet, call, raise, or check")
    .optional(),
});

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

  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: zodResponseFormat(responseSchema, "action"),
  });

  const { action, bet } = completion.choices[0].message.parsed;

  return {
    action,
    bet: bet ?? 0,
  } as PlayerAction;
};
