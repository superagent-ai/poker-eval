export interface TableState {
  tableInfo: TableInfo[];
  gameStage: string;
  playerName: string;
  playerCards: string[];
  tableCards: string[];
  potSize: number;
  stack: number;
  legalActions: LegalActions;
  hasButton: boolean;
  minRaise: number;
  maxRaise: number;
}

export interface Player {
  name: string;
  action: (state: TableState) => Promise<PlayerAction>;
}

interface LegalActions {
  chipRange?: {
    min: number;
    max: number;
  };
  [key: string]: any;
}

export interface PlayerAction {
  action: "fold" | "call" | "check" | "bet" | "raise";
  bet?: number;
}

export interface TableInfo {
  id: number;
  name: string;
  stack: number;
  hasButton: boolean;
  betSize: number;
}

export interface GameConfig {
  defaultChipSize: number;
  smallBlind: number;
  bigBlind: number;
  suitEmojis?: Record<string, string>;
  heroPlayerId?: number;
}

export interface Card {
  rank:
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
    | "T"
    | "J"
    | "Q"
    | "K"
    | "A";
  suit: "clubs" | "diamonds" | "hearts" | "spades";
}
