export interface Player {
    name: string;
    action: (handEvaluation: any, tableInfo: any, gameStage: string, playerName: string, playerCards: string[], tableCards: string[], potSize: number, stack: number, legalActions: any, hasButton: boolean, minRaise: number, maxRaise: number) => Promise<{
        action: PlayerAction;
    }>;
    hasHandEvals?: boolean;
}
export interface PlayerAction {
    value: string;
    bet?: number;
}
export interface TableInfo {
    id: number;
    name: string;
    stack: number;
    hasButton: boolean;
}
export interface GameConfig {
    defaultChipSize: number;
    smallBlind: number;
    bigBlind: number;
    suitEmojis?: Record<string, string>;
    heroPlayerId?: number;
}
