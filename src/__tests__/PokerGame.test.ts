import { PokerGame } from "../game";
import { Player, PlayerAction } from "../types";

const createMockPlayer = (
  name: string,
  defaultAction: PlayerAction
): Player => ({
  name,
  action: async () => defaultAction,
});

const createTestPlayers = (actions: PlayerAction[]): Player[] => {
  return actions.map((action, index) =>
    createMockPlayer(`Player ${index + 1}`, action)
  );
};

describe("No Limit Texas Holdem ($5/10)", () => {
  describe("Game Initialization", () => {
    it("should initialize game with correct number of players", () => {
      const players = createTestPlayers([
        { action: "call" },
        { action: "fold" },
        { action: "fold" },
      ]);

      const game = new PokerGame(players);
      expect(game.getPlayerStacks().filter((stack) => stack)).toHaveLength(3);
    });

    it("should initialize players with correct starting stacks", () => {
      const players = createTestPlayers([
        { action: "call" },
        { action: "call" },
      ]);

      const game = new PokerGame(players, { defaultChipSize: 1000 });
      const stacks = game.getPlayerStacks().filter((stack) => stack);

      expect(stacks).toEqual([1000, 1000]);
    });
  });

  describe("Game Actions", () => {
    it("should handle basic call actions", async () => {
      const players = createTestPlayers([
        { action: "check" },
        { action: "fold" },
        { action: "fold" },
      ]);

      const game = new PokerGame(players, {
        defaultChipSize: 1000,
        smallBlind: 5,
        bigBlind: 10,
      });

      await game.playHand();

      const stacks = game.getPlayerStacks().filter((stack) => stack);
      const stackDifferences = stacks.map((stack) => 1000 - stack);

      expect(stackDifferences[1]).toBe(5); // SB
      expect(stackDifferences[2]).toBe(10); // BB
      expect(stackDifferences[0]).toBe(-15); // Won 10 from each blind

      const totalChipsChange = stackDifferences.reduce(
        (sum, diff) => sum + diff,
        0
      );

      expect(totalChipsChange).toBe(0);
    });

    it("should handle fold actions", async () => {
      const players = createTestPlayers([
        { action: "fold" },
        { action: "call" },
        { action: "call" },
      ]);

      const game = new PokerGame(players, {
        defaultChipSize: 1000,
        smallBlind: 5,
        bigBlind: 10,
      });

      await game.playHand();

      const stacks = game.getPlayerStacks().filter((stack) => stack);

      // Player folds without posting BB
      expect(stacks[0]).toBeGreaterThan(980);
    });

    it("should handle raise actions", async () => {
      const players = createTestPlayers([
        { action: "raise", bet: 20 },
        { action: "call" },
        { action: "fold" },
      ]);

      const game = new PokerGame(players, {
        defaultChipSize: 1000,
        smallBlind: 5,
        bigBlind: 10,
      });

      await game.playHand();
      const stacks = game.getPlayerStacks().filter((stack) => stack);

      expect(stacks[2]).toEqual(990);
      // Check that at least one player has more than their starting stack (the winner)
      expect(stacks[0] > 1000 || stacks[1] > 1000).toBeTruthy();
    });
  });

  describe("Game Events", () => {
    it("should emit blind events", async () => {
      const players = createTestPlayers([
        { action: "fold" },
        { action: "call" },
        { action: "call" },
      ]);

      const game = new PokerGame(players, {
        defaultChipSize: 1000,
        smallBlind: 5,
        bigBlind: 10,
      });

      const events: any[] = [];

      game.on("posted_small_blind", (args) => {
        expect(args.data.amount).toEqual(5);
        events.push(args);
      });

      game.on("posted_big_blind", (args) => {
        expect(args.data.amount).toEqual(10);
        events.push(args);
      });

      await game.playHand();

      expect(events.length).toBe(2);
    });

    it("should emit dealing hole cards events", async () => {
      const players = createTestPlayers([
        { action: "fold" },
        { action: "call" },
        { action: "call" },
      ]);

      const game = new PokerGame(players, {
        defaultChipSize: 1000,
        smallBlind: 5,
        bigBlind: 10,
      });

      const events: any[] = [];

      game.on("dealt_hole_cards", (args) => {
        events.push(args);
      });

      await game.playHand();

      expect(events.length).toBe(3);
    });

    it("should emit game stage changes", async () => {
      const players = createTestPlayers([
        { action: "fold" },
        { action: "call" },
        { action: "call" },
      ]);

      const game = new PokerGame(players, {
        defaultChipSize: 1000,
        smallBlind: 5,
        bigBlind: 10,
      });

      game.on("changed_stage", (args) => {
        expect(["preflop", "flop", "turn", "river"]).toContain(args.stage);

        switch (args.type) {
          case "preflop":
            expect(args.data.cards.length).toEqual(0);
            break;
          case "flop":
            expect(args.data.cards.length).toEqual(3);
            break;
          case "turn":
            expect(args.data.cards.length).toEqual(4);
            break;
          case "river":
            expect(args.data.cards.length).toEqual(5);
            break;
        }
      });

      await game.playHand();
    });

    it("should emit player actions", async () => {
      const players = createTestPlayers([
        { action: "fold" },
        { action: "call" },
        { action: "call" },
      ]);

      const game = new PokerGame(players, {
        defaultChipSize: 1000,
        smallBlind: 5,
        bigBlind: 10,
      });

      game.on("player_action", (args) => {
        expect(["fold", "call", "raise", "bet"]).toContain(args.data.action);
      });
    });

    it("should emit showdown event", async () => {
      const players = createTestPlayers([
        { action: "fold" },
        { action: "call" },
        { action: "call" },
      ]);

      const game = new PokerGame(players, {
        defaultChipSize: 1000,
        smallBlind: 5,
        bigBlind: 10,
      });

      const events: any[] = [];

      game.on("showdown", (args) => {
        expect(typeof args.data.stackDiff).toBe("number");
        events.push(args);
      });

      await game.playHand();

      expect(events.length).toBe(3);
    });
  });

  describe("Game Simulation", () => {
    it("should run a simulation for multiple hands", async () => {
      const players = createTestPlayers([
        { action: "fold" },
        { action: "call" },
        { action: "call" },
      ]);
      const game = new PokerGame(players, {
        defaultChipSize: 1000,
        smallBlind: 5,
        bigBlind: 10,
      });
      const numHands = 5;
      const results = await game.runSimulation(numHands);

      expect(results.handResults.length).toEqual(numHands);
    });
  });
});
