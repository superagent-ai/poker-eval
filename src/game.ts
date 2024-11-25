import { Table } from "poker-ts";
import * as path from "path";
import * as fs from "fs";
import { EventEmitter } from "events";

import {
  Player,
  PlayerAction,
  TableInfo,
  TableState,
  GameConfig,
  Card,
} from "./types";
import { DEFAULT_CONFIG } from "./config";

export class PokerGame {
  private table: any;
  private players: Player[];
  private config: GameConfig;
  private logger: (message: string) => void;
  private eventEmitter: EventEmitter;

  constructor(
    players: Player[],
    config: Partial<GameConfig> = {},
    logger: (message: string) => void = console.log
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.players = players;
    this.logger = logger;

    this.table = new Table({
      smallBlind: this.config.smallBlind,
      bigBlind: this.config.bigBlind,
    });

    this.eventEmitter = new EventEmitter();

    this.initializePlayers();
  }

  protected initializePlayers(): void {
    this.players.forEach((_, index) => {
      this.table.sitDown(index, this.config.defaultChipSize);
    });
  }

  protected cardToText(card: Card): string {
    return `${card.rank}${card.suit.charAt(0).toLowerCase()}`;
  }

  protected convertCardToEmoji(card: Card): string {
    return `${card.rank}${this.config.suitEmojis?.[card.suit] ?? ""}`;
  }

  protected getGameStage(): string {
    return this.table.roundOfBetting();
  }

  protected getPositions(numPlayers: number, buttonIndex: number): string[] {
    const positions = ["BTN", "SB", "BB"];
    const remainingPositions = ["UTG", "MP", "LJ", "HJ", "CO"];

    while (positions.length < numPlayers) {
      if (numPlayers - positions.length > 3) {
        positions.push(remainingPositions.shift() || "MP");
      } else {
        positions.push("EP");
      }
    }

    return [
      ...positions.slice(-buttonIndex),
      ...positions.slice(0, -buttonIndex),
    ];
  }

  protected saveHandHistory(
    initialStacks: number[],
    finalStacks: number[],
    holeCards: Card[][],
    communityCards: Card[],
    buttonPosition: number,
    savePath?: string
  ): void {
    if (!savePath) return;

    if (initialStacks.length !== finalStacks.length) {
      throw new Error("Initial and final stacks must have the same length.");
    }

    const positions = this.getPositions(this.players.length, buttonPosition);
    const communityCardsString = communityCards
      .map((card) => this.cardToText(card))
      .join(" ");

    initialStacks.forEach((initialStack, index) => {
      const finalStack = finalStacks[index];
      const playerName = this.players[index].name;
      const playerHoleCards = holeCards[index];
      const position = positions[index];

      if (initialStack !== 0 || finalStack !== 0) {
        const diff = (finalStack - initialStack) / this.config.bigBlind;
        const filePath = path.join(savePath, `${playerName}.csv`);

        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(
            filePath,
            "position,hole_cards,community_cards,bb_profit\n",
            {
              flag: "w",
            }
          );
        }

        const holeCardsString = playerHoleCards
          .map((card) => this.cardToText(card))
          .join(" ");

        fs.appendFileSync(
          filePath,
          `${position},${holeCardsString},${communityCardsString},${diff}\n`
        );
      }
    });
  }

  public on(eventName: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(eventName, listener);
  }

  public off(eventName: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(eventName, listener);
  }

  private triggerPostBlindsEvent(): void {
    const buttonPosition = this.table.button();
    const smallBlindSeat = (buttonPosition + 1) % this.players.length;
    const bigBlindSeat = (buttonPosition + 2) % this.players.length;

    this.eventEmitter.emit("posted_small_blind", {
      player: smallBlindSeat,
      data: { amount: this.config.smallBlind },
    });

    this.eventEmitter.emit("posted_big_blind", {
      player: bigBlindSeat,
      data: { amount: this.config.bigBlind },
    });
  }

  private triggerDealHoleCardsEvent(): void {
    const holeCards = this.table.holeCards().filter((cards: Card[]) => cards);

    holeCards.forEach((cards: Card[], index: number) =>
      this.eventEmitter.emit("dealt_hole_cards", {
        player: index,
        data: { cards },
      })
    );
  }

  private triggerStageChangeEvent(): void {
    this.eventEmitter.emit("changed_stage", {
      stage: this.table.roundOfBetting(),
      data: { cards: this.table.communityCards() || [] },
    });
  }

  private triggerPlayerAction(data: {
    action: string;
    bet: number | undefined;
  }): void {
    this.eventEmitter.emit("player_action", {
      player: this.table.playerToAct(),
      data,
    });
  }

  private triggerShowdownEvent(
    initialStacks: number[],
    finalStacks: number[]
  ): void {
    initialStacks.forEach((initialStack, index) => {
      const finalStack = finalStacks[index];
      const diff = (finalStack - initialStack) / this.config.bigBlind;

      this.eventEmitter.emit("showdown", {
        player: index,
        data: { stackDiff: diff },
      });
    });
  }

  protected async handlePlayerAction(
    seatIndex: number,
    gameStage: string
  ): Promise<void> {
    const buttonPosition = this.table.button();
    const legalActions = this.table.legalActions();
    const holeCards = this.table.holeCards();
    const communityCards = this.table.communityCards();

    const playerInfo = {
      cards: holeCards[seatIndex]?.map(this.convertCardToEmoji.bind(this)),
      hasButton: seatIndex === buttonPosition,
      stack: this.table.seats()[seatIndex]?.stack || 0,
    };

    const gameInfo = {
      tableCards: communityCards.map(this.convertCardToEmoji.bind(this)),
      potSize: this.table
        .pots()
        .reduce((sum: number, pot: { size: number }) => sum + pot.size, 0),
      minRaise: legalActions.chipRange?.min || 0,
      maxRaise: legalActions.chipRange?.max || playerInfo.stack,
    };

    const tableInfo: TableInfo[] = this.table
      .seats()
      .map((seat: { stack: number; betSize: number }, index: number) =>
        seat
          ? {
              id: index + 1,
              name: this.players[index].name,
              stack: seat.stack,
              hasButton: index === buttonPosition,
              betSize: seat.betSize,
            }
          : null
      )
      .filter(Boolean) as TableInfo[];

    const tableState: TableState = {
      tableInfo,
      gameStage,
      playerName: this.players[seatIndex].name,
      playerCards: playerInfo.cards,
      tableCards: gameInfo.tableCards,
      potSize: gameInfo.potSize,
      stack: playerInfo.stack,
      legalActions,
      hasButton: playerInfo.hasButton,
      minRaise: gameInfo.minRaise,
      maxRaise: gameInfo.maxRaise,
    };

    const playerAction = await this.players[seatIndex].action(tableState);

    await this.processAction(playerAction, legalActions);
  }

  protected async processAction(
    playerAction: PlayerAction,
    legalActions: any
  ): Promise<void> {
    const { action, bet } = playerAction;

    if (!action) {
      throw new Error("Invalid action: no value specified");
    }

    try {
      if (bet && bet < legalActions.minBet) {
        this.logger("Warning: Bet below minimum - defaulting to call");
        this.triggerPlayerAction({
          action: "call",
          bet: 0,
        });
        await this.table.actionTaken("call", bet);
      } else {
        this.triggerPlayerAction({ action, bet });
        await this.table.actionTaken(action, bet);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger(`Error processing action: ${error.message}`);
      } else {
        this.logger("An unknown error occurred while processing action");
      }
      throw error;
    }
  }

  public getPlayerStacks(): number[] {
    return this.table
      .seats()
      .map((seat: { stack?: number }) => seat?.stack ?? 0);
  }

  public getCurrentState() {
    return {
      gameStage: this.getGameStage(),
      communityCards: this.table
        .communityCards()
        .map(this.convertCardToEmoji.bind(this)),
      pots: this.table.pots(),
      players: this.table
        .seats()
        .filter((seat: any) => seat)
        .map((seat: { stack?: number }, index: number) => ({
          name: this.players[index].name,
          stack: seat?.stack ?? 0,
          hasButton: index === this.table.button(),
          holeCards:
            this.table
              .holeCards()
              [index]?.map(this.convertCardToEmoji.bind(this)) ?? [],
        })),
    };
  }

  public async playHand(options: { outputPath?: string } = {}): Promise<{
    initialStacks: number[];
    finalStacks: number[];
    winners: [number, Card[]][];
  }> {
    const initialStacks = this.getPlayerStacks().filter((stack) => stack);

    this.table.startHand();
    this.triggerDealHoleCardsEvent();
    this.triggerPostBlindsEvent();

    while (this.table.isHandInProgress()) {
      const holeCards = this.table.holeCards();
      const buttonPosition = this.table.button();

      while (this.table.isBettingRoundInProgress()) {
        const seatIndex = this.table.playerToAct();
        await this.handlePlayerAction(seatIndex, this.getGameStage());

        if (!this.table.isBettingRoundInProgress()) {
          this.table.endBettingRound();
          this.triggerStageChangeEvent();
        }
      }

      if (this.table.areBettingRoundsCompleted()) {
        const communityCards = this.table.communityCards() || [];
        this.table.showdown();
        const finalStacks = this.getPlayerStacks().filter((stack) => stack);

        const winners = this.table.winners();

        if (options.outputPath) {
          this.saveHandHistory(
            initialStacks,
            finalStacks,
            holeCards,
            communityCards,
            buttonPosition,
            options.outputPath
          );
        }

        this.triggerShowdownEvent(initialStacks, finalStacks);

        return {
          initialStacks,
          finalStacks,
          winners,
        };
      }
    }

    throw new Error("Hand ended unexpectedly");
  }

  public async runSimulation(
    numHands: number,
    options: { outputPath?: string } = {}
  ): Promise<{
    handResults: Array<{
      initialStacks: number[];
      finalStacks: number[];
      winners: [number, Card[]][];
    }>;
    finalStacks: number[];
  }> {
    const handResults = [];

    for (let i = 0; i < numHands; i++) {
      const result = await this.playHand(options);
      handResults.push(result);
    }

    return {
      handResults,
      finalStacks: this.getPlayerStacks().filter((seat) => seat),
    };
  }
}
