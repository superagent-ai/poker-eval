import { Card } from "poker-ts";
import { Player, PlayerAction, GameConfig } from "./types";
export declare class PokerGame {
    private table;
    private players;
    private config;
    private logger;
    constructor(players: Player[], config?: Partial<GameConfig>, logger?: (message: string) => void);
    protected initializePlayers(): void;
    protected cardToText(card: Card): string;
    protected convertCardToEmoji(card: Card): string;
    protected getGameStage(): string;
    protected evaluateHand(holeCards: string[], communityCards: string[]): any;
    protected saveHandHistory(initialStacks: number[], finalStacks: number[], savePath?: string): void;
    protected handlePlayerAction(seatIndex: number, gameStage: string): Promise<void>;
    protected processAction(playerAction: PlayerAction, legalActions: any): Promise<void>;
    protected processWinners(winners: Array<Array<[number, Card[]]>>, pots: any[]): void;
    getPlayerStacks(): number[];
    getCurrentState(): {
        gameStage: string;
        communityCards: any;
        pots: any;
        players: any;
    };
    playHand(options?: {
        saveHistory?: string;
    }): Promise<{
        initialStacks: number[];
        finalStacks: number[];
        winners: [number, Card[]][];
    }>;
    startTournament(numHands: number, options?: {
        saveHistory?: string;
    }): Promise<{
        handResults: Array<{
            initialStacks: number[];
            finalStacks: number[];
            winners: [number, Card[]][];
        }>;
        finalStacks: number[];
    }>;
}
