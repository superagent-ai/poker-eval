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
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const events_1 = require("events");
const config_1 = require("./config");
class PokerGame {
    constructor(players, config = {}, logger = console.log) {
        this.config = { ...config_1.DEFAULT_CONFIG, ...config };
        this.players = players;
        this.logger = logger;
        this.table = new poker_ts_1.Table({
            smallBlind: this.config.smallBlind,
            bigBlind: this.config.bigBlind,
        });
        this.eventEmitter = new events_1.EventEmitter();
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
    getPositions(numPlayers, buttonIndex) {
        const positions = ["BTN", "SB", "BB"];
        const remainingPositions = ["UTG", "MP", "LJ", "HJ", "CO"];
        while (positions.length < numPlayers) {
            if (numPlayers - positions.length > 3) {
                positions.push(remainingPositions.shift() || "MP");
            }
            else {
                positions.push("EP");
            }
        }
        return [
            ...positions.slice(-buttonIndex),
            ...positions.slice(0, -buttonIndex),
        ];
    }
    saveHandHistory(initialStacks, finalStacks, holeCards, communityCards, buttonPosition, savePath) {
        if (!savePath)
            return;
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
                    fs.writeFileSync(filePath, "position,hole_cards,community_cards,bb_profit\n", {
                        flag: "w",
                    });
                }
                const holeCardsString = playerHoleCards
                    .map((card) => this.cardToText(card))
                    .join(" ");
                fs.appendFileSync(filePath, `${position},${holeCardsString},${communityCardsString},${diff}\n`);
            }
        });
    }
    on(eventName, listener) {
        this.eventEmitter.on(eventName, listener);
    }
    off(eventName, listener) {
        this.eventEmitter.off(eventName, listener);
    }
    triggerPostBlindsEvent() {
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
    triggerDealHoleCardsEvent() {
        const holeCards = this.table.holeCards().filter((cards) => cards);
        holeCards.forEach((cards, index) => this.eventEmitter.emit("dealt_hole_cards", {
            player: index,
            data: { cards },
        }));
    }
    triggerStageChangeEvent() {
        this.eventEmitter.emit("changed_stage", {
            stage: this.table.roundOfBetting(),
            data: { cards: this.table.communityCards() || [] },
        });
    }
    triggerPlayerAction(data) {
        this.eventEmitter.emit("player_action", {
            player: this.table.playerToAct(),
            data,
        });
    }
    triggerShowdownEvent(initialStacks, finalStacks) {
        initialStacks.forEach((initialStack, index) => {
            const finalStack = finalStacks[index];
            const diff = (finalStack - initialStack) / this.config.bigBlind;
            this.eventEmitter.emit("showdown", {
                player: index,
                data: { stackDiff: diff },
            });
        });
    }
    async handlePlayerAction(seatIndex, gameStage) {
        var _a, _b, _c, _d;
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
        const tableInfo = this.table
            .seats()
            .map((seat, index) => seat
            ? {
                id: index + 1,
                name: this.players[index].name,
                stack: seat.stack,
                hasButton: index === buttonPosition,
                betSize: seat.betSize,
            }
            : null)
            .filter(Boolean);
        const tableState = {
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
    async processAction(playerAction, legalActions) {
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
            }
            else {
                this.triggerPlayerAction({ action, bet });
                await this.table.actionTaken(action, bet);
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
                .filter((seat) => seat)
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
                    this.saveHandHistory(initialStacks, finalStacks, holeCards, communityCards, buttonPosition, options.outputPath);
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
    async runSimulation(numHands, options = {}) {
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
exports.PokerGame = PokerGame;
