import { GameConfig } from "./types";

export const DEFAULT_CONFIG: GameConfig = {
  defaultChipSize: 300,
  smallBlind: 1,
  bigBlind: 2,
  suitEmojis: {
    clubs: "♣️",
    diamonds: "♦️",
    hearts: "♥️",
    spades: "♠️",
  },
  heroPlayerId: 3,
};
