"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PokerGame = void 0;
const poker_ts_1 = require("poker-ts");
const PokerEvaluator = __importStar(require("poker-evaluator"));
const config_1 = require("./config");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class PokerGame {
    constructor(players, config = {}, logger = console.log) {
        this.config = { ...config_1.DEFAULT_CONFIG, ...config };
        this.players = players;
        this.logger = logger;
        this.table = new poker_ts_1.Table({
            smallBlind: this.config.smallBlind,
            bigBlind: this.config.bigBlind,
        });
        this.initializePlayers();
    }
    initializePlayers() {
        this.players.forEach((_, index) => {
            this.table.sitDown(index, this.config.defaultChipSize);
        });
    }
    cardToText(card) {
        return `${card.rank}${card.suit.charAt(0).toLowerCase()}`;
    }
    convertCardToEmoji(card) {
        var _a, _b;
        return `${card.rank}${(_b = (_a = this.config.suitEmojis) === null || _a === void 0 ? void 0 : _a[card.suit]) !== null && _b !== void 0 ? _b : ""}`;
    }
    getGameStage() {
        return this.table.roundOfBetting();
    }
    evaluateHand(holeCards, communityCards) {
        return PokerEvaluator.winningOddsForPlayer(holeCards, communityCards, this.players.length, 1000);
    }
    saveHandHistory(initialStacks, finalStacks, savePath) {
        if (!savePath)
            return;
        if (initialStacks.length !== finalStacks.length) {
            throw new Error("Initial and final stacks must have the same length.");
        }
        initialStacks.forEach((initialStack, index) => {
            const finalStack = finalStacks[index];
            const playerName = this.players[index].name;
            if (initialStack !== 0 || finalStack !== 0) {
                const diff = (finalStack - initialStack) / this.config.bigBlind;
                const filePath = path.join(savePath, `${playerName}.csv`);
                if (!fs.existsSync(filePath)) {
                    fs.writeFileSync(filePath, "hand_result\n", { flag: "w" });
                }
                fs.appendFileSync(filePath, `${diff}\n`);
            }
        });
    }
    async handlePlayerAction(seatIndex, gameStage) {
        var _a, _b, _c, _d, _e;
        const buttonPosition = this.table.button();
        const legalActions = this.table.legalActions();
        const holeCards = this.table.holeCards();
        const communityCards = this.table.communityCards();
        const playerInfo = {
            cards: (_a = holeCards[seatIndex]) === null || _a === void 0 ? void 0 : _a.map(this.convertCardToEmoji.bind(this)),
            hasButton: seatIndex === buttonPosition,
            stack: ((_b = this.table.seats()[seatIndex]) === null || _b === void 0 ? void 0 : _b.stack) || 0,
        };
        const gameInfo = {
            tableCards: communityCards.map(this.convertCardToEmoji.bind(this)),
            potSize: this.table
                .pots()
                .reduce((sum, pot) => sum + pot.size, 0),
            minRaise: ((_c = legalActions.chipRange) === null || _c === void 0 ? void 0 : _c.min) || 0,
            maxRaise: ((_d = legalActions.chipRange) === null || _d === void 0 ? void 0 : _d.max) || playerInfo.stack,
        };
        const handEvaluation = ((_e = this.players[seatIndex]) === null || _e === void 0 ? void 0 : _e.hasHandEvals)
            ? this.evaluateHand(holeCards[seatIndex].map(this.cardToText.bind(this)), communityCards.map(this.cardToText.bind(this)))
            : null;
        const tableInfo = this.table
            .seats()
            .map((seat, index) => seat
            ? {
                id: index + 1,
                name: this.players[index].name,
                stack: seat.stack,
                hasButton: index === buttonPosition,
            }
            : null)
            .filter(Boolean);
        const { action: playerAction } = await this.players[seatIndex].action(handEvaluation, tableInfo, gameStage, this.players[seatIndex].name, playerInfo.cards, gameInfo.tableCards, gameInfo.potSize, playerInfo.stack, legalActions, playerInfo.hasButton, gameInfo.minRaise, gameInfo.maxRaise);
        await this.processAction(playerAction, legalActions);
    }
    async processAction(playerAction, legalActions) {
        const { value, bet } = playerAction;
        if (!value) {
            throw new Error("Invalid action: no value specified");
        }
        try {
            if (bet && bet < legalActions.minBet) {
                this.logger("Warning: Bet below minimum - defaulting to call");
                await this.table.actionTaken("call", bet);
            }
            else {
                await this.table.actionTaken(value, bet);
            }
        }
        catch (error) {
            if (error instanceof Error) {
                this.logger(`Error processing action: ${error.message}`);
            }
            else {
                this.logger("An unknown error occurred while processing action");
            }
            throw error;
        }
    }
    processWinners(winners, pots) {
        winners.forEach((potWinners, potIndex) => {
            potWinners.forEach((winner) => {
                const [seatIndex] = winner;
                this.logger(`Player ${this.players[seatIndex].name} wins pot ${potIndex + 1}`);
            });
        });
    }
    getPlayerStacks() {
        return this.table
            .seats()
            .map((seat) => { var _a; return (_a = seat === null || seat === void 0 ? void 0 : seat.stack) !== null && _a !== void 0 ? _a : 0; });
    }
    getCurrentState() {
        return {
            gameStage: this.getGameStage(),
            communityCards: this.table
                .communityCards()
                .map(this.convertCardToEmoji.bind(this)),
            pots: this.table.pots(),
            players: this.table
                .seats()
                .map((seat, index) => {
                var _a, _b, _c;
                return ({
                    name: this.players[index].name,
                    stack: (_a = seat === null || seat === void 0 ? void 0 : seat.stack) !== null && _a !== void 0 ? _a : 0,
                    hasButton: index === this.table.button(),
                    holeCards: (_c = (_b = this.table
                        .holeCards()[index]) === null || _b === void 0 ? void 0 : _b.map(this.convertCardToEmoji.bind(this))) !== null && _c !== void 0 ? _c : [],
                });
            }),
        };
    }
    async playHand(options = {}) {
        const initialStacks = this.getPlayerStacks();
        this.table.startHand();
        while (this.table.isHandInProgress()) {
            while (this.table.isBettingRoundInProgress()) {
                const seatIndex = this.table.playerToAct();
                await this.handlePlayerAction(seatIndex, this.getGameStage());
                if (!this.table.isBettingRoundInProgress()) {
                    this.table.endBettingRound();
                }
            }
            if (this.table.areBettingRoundsCompleted()) {
                const finalPots = this.table.pots().map((pot) => ({ ...pot }));
                this.table.showdown();
                const finalStacks = this.getPlayerStacks();
                const winners = this.table.winners();
                if (options.saveHistory) {
                    this.saveHandHistory(initialStacks, finalStacks, options.saveHistory);
                }
                this.processWinners(winners, finalPots);
                return {
                    initialStacks,
                    finalStacks,
                    winners,
                };
            }
        }
        throw new Error("Hand ended unexpectedly");
    }
    async startTournament(numHands, options = {}) {
        const handResults = [];
        for (let i = 0; i < numHands; i++) {
            const result = await this.playHand(options);
            handResults.push(result);
            // Reset stacks if any player is eliminated
            if (this.getPlayerStacks().some((stack) => stack === 0)) {
                this.initializePlayers();
            }
        }
        return {
            handResults,
            finalStacks: this.getPlayerStacks(),
        };
    }
}
exports.PokerGame = PokerGame;
