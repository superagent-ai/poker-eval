import { Player, PlayerAction, GameConfig, Card } from "./types";
export declare class PokerGame {
    private table;
    private players;
    private config;
    private logger;
    private eventEmitter;
    constructor(players: Player[], config?: Partial<GameConfig>, logger?: (message: string) => void);
    protected initializePlayers(): void;
    protected cardToText(card: Card): string;
    protected convertCardToEmoji(card: Card): string;
    protected getGameStage(): string;
    protected getPositions(numPlayers: number, buttonIndex: number): string[];
    protected saveHandHistory(initialStacks: number[], finalStacks: number[], holeCards: Card[][], communityCards: Card[], buttonPosition: number, savePath?: string): void;
    on(eventName: string, listener: (...args: any[]) => void): void;
    off(eventName: string, listener: (...args: any[]) => void): void;
    private triggerPostBlindsEvent;
    private triggerDealHoleCardsEvent;
    private triggerStageChangeEvent;
    private triggerPlayerAction;
    private triggerShowdownEvent;
    protected handlePlayerAction(seatIndex: number, gameStage: string): Promise<void>;
    protected processAction(playerAction: PlayerAction, legalActions: any): Promise<void>;
    getPlayerStacks(): number[];
    getCurrentState(): {
        gameStage: string;
        communityCards: any;
        pots: any;
        players: any;
    };
    playHand(options?: {
        outputPath?: string;
    }): Promise<{
        initialStacks: number[];
        finalStacks: number[];
        winners: [number, Card[]][];
    }>;
    runSimulation(numHands: number, options?: {
        outputPath?: string;
    }): Promise<{
        handResults: Array<{
            initialStacks: number[];
            finalStacks: number[];
            winners: [number, Card[]][];
        }>;
        finalStacks: number[];
    }>;
}
