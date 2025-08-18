import type { Game, GameConfig, GameActionFailure } from "./type";
import { type Outcome, success, failure } from "../shared/result";
import { validGameConfigSchema } from "./type";
import { type Player } from "../player/type";
import {
  createCardStack,
  createOrderedDeck,
  drawCard,
  shuffleDeck,
  getDeckSize,
} from "../card/index";
import { isGameInRightState } from "./errorHandling";

export function validateGameConfig(
  config: GameConfig
): Outcome<GameConfig, string> {
  const result = validGameConfigSchema.safeParse(config);
  if (result.success) {
    return success(config);
  } else {
    return failure(result.error.message);
  }
}

export function createGame(config: GameConfig): Outcome<Game, string> {
  const validation = validateGameConfig(config);
  if (!validation.isSuccess) {
    return failure(`Invalid game configuration: ${validation.error}`);
  }

  const game: Game = {
    config: validation.value,
    state: "waiting",
    deck: [],
    stack: [],
    players: [],
    currentPlayerId: null,
    gaboPlayers: [],
    counterGaboPlayers: [],
  };
  return success(game);
}

export function addPlayerToGame(
  game: Game,
  player: Player
): Outcome<Game, GameActionFailure> {
  const stateResult = isGameInRightState(game, ["waiting"]);
  if (stateResult.isFailure) {
    return failure(stateResult.error);
  }

  if (game.players.length >= game.config.players) {
    return failure({
      error: `Cannot add more players. Maximum players allowed: ${game.config.players}.`,
      game,
    });
  }

  if (game.players.some((p) => p.id === player.id)) {
    return failure({
      error: `Player with ID ${player.id} already exists in the game.`,
      game,
    });
  }

  game.players.push(player);
  return success(game);
}

export function removePlayerFromGame(
  game: Game,
  playerId: string
): Outcome<Game, GameActionFailure> {
  const stateResult = isGameInRightState(game, ["waiting"]);
  if (stateResult.isFailure) {
    return failure(stateResult.error);
  }

  const playerIndex = game.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) {
    return failure({
      error: `Player with ID ${playerId} does not exist in the game.`,
      game,
    });
  }

  game.players.splice(playerIndex, 1);
  return success(game);
}

export function createDeck() {
  return shuffleDeck(createOrderedDeck());
}

export function createStack() {
  return createCardStack();
}

export function initializeGame(game: Game): Outcome<Game, GameActionFailure> {
  const stateResult = isGameInRightState(game, ["waiting"]);
  if (stateResult.isFailure) {
    return failure(stateResult.error);
  }
  if (game.players.length === 0) {
    return failure({
      error: "Cannot initialize game with no players.",
      game,
    });
  }
  game.deck = createDeck();
  game.stack = createStack();
  return success(game);
}

export function distrubuteCards(game: Game): Outcome<Game, GameActionFailure> {
  const stateResult = isGameInRightState(game, ["waiting"]);
  if (stateResult.isFailure) {
    return failure(stateResult.error);
  }
  if (game.players.length === 0) {
    return failure({
      error: "Cannot distribute cards when there are no players.",
      game,
    });
  }
  if (getDeckSize(game.deck) === 0) {
    return failure({
      error: "Cannot distribute cards when the deck is empty.",
      game,
    });
  }
  if (
    getDeckSize(game.deck) <
    game.config.players * game.config.cardsPerPlayer
  ) {
    return failure({
      error: `Not enough cards in the deck to distribute ${game.config.cardsPerPlayer} cards to each of the ${game.config.players} players.`,
      game,
    });
  }
  for (const player of game.players) {
    player.cardMat = [];
    for (let i = 0; i < game.config.cardsPerPlayer; i++) {
      const cardResult = drawCard(game.deck);
      if (cardResult.isSuccess) {
        player.cardMat.push(cardResult.value.card);
        game.deck = cardResult.value.deck;
      } else {
        return failure({
          error: "Deck ran out of cards while distributing.",
          game,
        });
      }
    }
  }

  return success(game);
}

export function startGame(game: Game): Outcome<Game, GameActionFailure> {
  const stateResult = isGameInRightState(game, ["waiting"]);
  if (stateResult.isFailure) {
    return failure(stateResult.error);
  }
  if (game.players.length! == game.config.players) {
    return failure({
      error: `Cannot start game. Expected ${game.config.players} players, but found ${game.players.length}.`,
      game,
    });
  }

  game.state = "playing";
  game.currentPlayerId = game.players[0].id;

  return success(game);
}
