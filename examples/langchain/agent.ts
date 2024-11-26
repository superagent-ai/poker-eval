import { config } from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { PlayerAction, TableState } from "@superagent-ai/poker-eval/dist/types";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";

config();

const model = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
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

const parser = StructuredOutputParser.fromZodSchema(responseSchema);

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

  const chain = RunnableSequence.from([
    ChatPromptTemplate.fromTemplate(
      "Answer the users question as best as possible.\n{format_instructions}\n{question}"
    ),
    model,
    parser,
  ]);

  const response = await chain.invoke({
    question: prompt,
    format_instructions: parser.getFormatInstructions(),
  });

  const { action, bet } = response;

  return {
    action,
    bet: bet ?? 0,
  } as PlayerAction;
};
