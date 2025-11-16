import type { GameConfig } from "./module/game/type";
import {
  gameInitialization,
  playerActions,
  gameActions,
} from "./module/game/index";
import { createPlayer } from "./module/player";
import { exchangeMatCard, lookupAndMaybeExchangeCard, lookupOthersCard, lookupOwnCard } from "./module/card/cardRules";

const config: GameConfig = {
  players: 5,
  cardsPerPlayer: 4,
  scoreToLose: 120,
  descents: [
    [25, 50],
    [50, 100],
  ],
  cardRules: [
    [{ value: "Ace", suit: "Hearts"}, lookupOwnCard],
  ],
  falseGaboScore: 25,
  counterGaboScore: 50,
  cardScores: [],
  isRapidGaboAllowed: true,
};

const game = gameInitialization.createGame(config);
if (game.isFailure) {
  console.error("Failed to create game:", game.error);
  throw new Error(game.error);
}
const players = [
  createPlayer("1", "Alice"),
  createPlayer("2", "Bob"),
  createPlayer("3", "Charlie"),
  createPlayer("4", "Diana"),
  createPlayer("5", "Eve"),
];

for (const player of players) {
  const result = gameInitialization.addPlayerToGame(game.value, player);
  if (result.isFailure) {
    console.error("Failed to add player:", result.error.error);
  } else {
    console.log("Player added:", player.name);
  }
}

const removeResult = gameInitialization.removePlayerFromGame(game.value, "4");
if (removeResult.isFailure) {
  console.error("Failed to remove player:", removeResult.error.error);
  throw new Error(removeResult.error.error);
}

const initResult = gameInitialization.initializeGame(removeResult.value);
if (initResult.isFailure) {
  console.error("Failed to initialize game:", initResult.error);
  throw new Error(initResult.error.error);
}
console.log("Game initialized. Current state:", initResult.value);

const distributeResult = gameInitialization.distrubuteCards(initResult.value);
if (distributeResult.isFailure) {
  console.error("Failed to distribute cards:", distributeResult.error);
  throw new Error(distributeResult.error.error);
}
console.log(
  "Cards distributed. Current state:",
  distributeResult.value.players
);
for (const player of distributeResult.value.players) {
  console.log(`Player ${player.name} has the following cards:`);
  for (const card of player.cardMat) {
    console.log(`- ${card.value} of ${card.suit}`);
  }
}
console.log(
  "Deck size after distribution:",
  distributeResult.value.deck.length
);

const startResult = gameInitialization.startGame(distributeResult.value);
if (startResult.isFailure) {
  console.error("Failed to start game:", startResult.error);
  throw new Error(startResult.error.error);
}
console.log("Game started. Current state:", startResult.value.state);
console.log("Current player index:", startResult.value.currentPlayerId);

const drawReslut = playerActions.playerDrawsCardFromDeck(
  startResult.value,
  startResult.value.currentPlayerId!
);
if (drawReslut.isFailure) {
  console.error("Failed to draw card:", drawReslut.error.error);
  throw new Error(drawReslut.error.error);
}
console.log("Card drawn. Current player now has:", drawReslut.value.card);

const discardResult = playerActions.playerDiscardsHeldCard(
  drawReslut.value.game,
  startResult.value.currentPlayerId!
);
if (discardResult.isFailure) {
  console.error("Failed to discard card:", discardResult.error.error);
  throw new Error(discardResult.error.error);
}
console.log(discardResult.value);

console.log(
  "Before drawing from stack, current player has:",
  discardResult.value.players[0].cardMat
);

const drawStackResult = playerActions.playerDrawsCardFromStack(
  discardResult.value,
  discardResult.value.currentPlayerId!,
  1
);
if (drawStackResult.isFailure) {
  console.error("Failed to draw card:", drawStackResult.error.error);
  throw new Error(drawStackResult.error.error);
}

console.log(
  "Card drawn from stack. Current player now has:",
  drawStackResult.value.players[0].cardMat
);
console.log(drawStackResult.value);

const failureResult = playerActions.playerDrawsCardFromStack(
  drawStackResult.value,
  "nonexistent-player",
  1
);
if (!failureResult.isFailure) {
  console.error("Expected failure but got success:", failureResult.value);
  throw new Error("Expected failure but got success");
}
console.error("Expected failure:", failureResult.error.error);

const nextTurnResult = gameActions.setCurrentPlayerToNextPlayer(
  failureResult.error.game
);
if (nextTurnResult.isFailure) {
  console.error("Failed to set next player:", nextTurnResult.error.error);
  throw new Error(nextTurnResult.error.error);
}
console.log(
  "Next player set. Current player is now:",
  nextTurnResult.value.currentPlayerId
);

console.log("Bob mat: ", nextTurnResult.value.players[1].cardMat);
console.log("Alice mat: ", nextTurnResult.value.players[0].cardMat);

const exchange = exchangeMatCard(
  nextTurnResult.value,
  { playerId: "1", matIndex: 0 },
  { playerId: "2", matIndex: 1 }
);

if (exchange.type !== "result") {
  throw new Error("Expected result type but got: " + exchange.type);
}

if (exchange.result.isFailure) {
  console.error("Failed to exchange mat cards:", exchange.result.error.error);
  throw new Error(exchange.result.error.error);
}

console.log("Bob mat: ", exchange.result.value.players[1].cardMat);
console.log("Alice mat: ", exchange.result.value.players[0].cardMat);

const ownCardLookup = lookupOwnCard(
  exchange.result.value,
  { playerId: "1", matIndex: 0 },
  { playerId: "1" }
);

if (ownCardLookup.type !== "result") {
  throw new Error("Expected result type but got: " + ownCardLookup.type);
}

if (ownCardLookup.result.isFailure) {
  console.error("Failed to lookup own card:", ownCardLookup.result.error.error);
  throw new Error(ownCardLookup.result.error.error);
}

console.log(
  "Own card lookup successful. Card:",
  ownCardLookup.extras?.card || "No card found"
);

const othersCardLookup = lookupOthersCard(
  exchange.result.value,
  { playerId: "2", matIndex: 1 },
  { playerId: "1" }
);

if (othersCardLookup.type !== "result") {
  throw new Error("Expected result type but got: " + othersCardLookup.type);
}

if (othersCardLookup.result.isFailure) {
  console.error("Failed to lookup others card:", othersCardLookup.result.error.error);
  throw new Error(othersCardLookup.result.error.error);
}

console.log(
  "Others card lookup successful. Card:",
  othersCardLookup.extras?.card || "No card found"
);

const lookupResult = lookupAndMaybeExchangeCard(
  exchange.result.value,
  { playerId: "1", matIndex: 0 },
  { playerId: "2", matIndex: 1 }
);

if (lookupResult.type !== "cardBasedDecision") {
  throw new Error("Expected result type but got: " + lookupResult.type);
}

console.log(
  "Lookup and maybe exchange card step. Card:",
  lookupResult.card
);

console.log(
  "Continue function available for exchange decision."
);
const exchangeDecision = lookupResult.continue(true, 0);
if (exchangeDecision.type !== "result") {
  throw new Error("Expected result type but got: " + exchangeDecision.type);
}
if (exchangeDecision.result.isFailure) {
  console.error("Failed to exchange card:", exchangeDecision.result.error.error);
  throw new Error(exchangeDecision.result.error.error);
}

console.log("Bob mat after exchange: ", exchangeDecision.result.value.players[1].cardMat);
console.log("Alice mat after exchange: ", exchangeDecision.result.value.players[0].cardMat);

// force set the player id 2 to have an ace of hearts held
const player2 = exchangeDecision.result.value.players.find(p => p.id === "2");
if (!player2) {
  throw new Error("Player 2 not found in game state");
}
player2.heldCard = { value: "Ace", suit: "Hearts" };

const playHeldCardResult = playerActions.playerPlaysHeldCard(
  exchangeDecision.result.value,
  "2"
);
if (playHeldCardResult.isFailure) {
  console.error("Failed to play held card:", playHeldCardResult.error.error);
  throw new Error(playHeldCardResult.error.error);
}

console.log("Held card played. Game state after playing held card:", playHeldCardResult.value.game);
console.log("Card rule function for played card:", playHeldCardResult.value.cardRule);