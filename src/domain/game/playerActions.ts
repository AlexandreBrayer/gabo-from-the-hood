import type { Game } from "./type";
import { type Outcome, success, failure } from "../shared/result";
import type { GameActionFailure } from "./type";
import { drawCard, drawCardFromStack, addCardToStack } from "../card";
import { isGameInRightState } from "./errorHandling";
import { exchangeCardInPlayerMat } from "../player";
import type { Card } from "../card/type";
import { getPlayerIndex } from "./getters";

function isPlayerIdTheCurrentPlayer(
  game: Game,
  playerId: string
): Outcome<boolean, GameActionFailure> {
  if (game.currentPlayerId !== playerId) {
    return failure({
      error: `Player with ID ${playerId} is not the current player.`,
      game,
    });
  }
  return success(true);
}

/**
 * Allows a player to declare "Gabo".
 * This can only be done if the game is in the "gabo" or "playing" state.
 * This action will update the game state to "gabo" and add the player to the list of Gabo players.
 * @param game The current game state.
 * @param playerId The ID of the player declaring Gabo.
 * @returns An Outcome containing the updated game state or an error.
 */
export function playerSaysGabo(
  game: Game,
  playerId: string
): Outcome<Game, GameActionFailure> {
  const isCurrentPlayerResult = isPlayerIdTheCurrentPlayer(game, playerId);
  if (isCurrentPlayerResult.isFailure && !game.config.isRapidGaboAllowed) {
    return failure(isCurrentPlayerResult.error);
  }

  const stateResult = isGameInRightState(game, ["gabo", "playing"]);
  if (stateResult.isFailure) {
    return failure(stateResult.error);
  }

  const playerIndexResult = getPlayerIndex(game, playerId);
  if (playerIndexResult.isFailure) {
    return failure(playerIndexResult.error);
  }

  const playerIndex = playerIndexResult.value;
  const currentPlayer = game.players[playerIndex];
  game.gaboPlayers.push(currentPlayer.id);
  game.state = "gabo";

  return success(game);
}

/**
 * Allows a player to declare a counter to a Gabo declaration.
 * This can only be done if the game is in the "gabo" state and the player has declared Gabo.
 * This action will add the player to the list of Counter Gabo players.
 * @param game The current game state.
 * @param playerId The ID of the player declaring the counter.
 * @returns An Outcome containing the updated game state or an error.
 */
export function playerSaysCounterGabo(
  game: Game,
  playerId: string
): Outcome<Game, GameActionFailure> {
  const isCurrentPlayerResult = isPlayerIdTheCurrentPlayer(game, playerId);
  if (isCurrentPlayerResult.isFailure) {
    return failure(isCurrentPlayerResult.error);
  }
  const stateResult = isGameInRightState(game, ["gabo"]);
  if (stateResult.isFailure) {
    return failure(stateResult.error);
  }
  const playerIndexResult = getPlayerIndex(game, playerId);
  if (playerIndexResult.isFailure) {
    return failure(playerIndexResult.error);
  }
  const currentPlayer = game.players[playerIndexResult.value];
  if (!game.gaboPlayers.includes(currentPlayer.id)) {
    return failure({
      error: `Player with ID ${currentPlayer.id} has not declared Gabo.`,
      game,
    });
  }

  if (!game.counterGaboPlayers) {
    game.counterGaboPlayers = [];
  }

  game.counterGaboPlayers.push(currentPlayer.id);

  return success(game);
}

/**
 * Allows a player to draw a card from the deck.
 * @param game The current game state.
 * @param playerId The ID of the player drawing the card.
 * @returns An Outcome containing the updated game state or an error.
 */
export function playerDrawsCardFromDeck(
  game: Game,
  playerId: string
): Outcome<{game: Game, card: Card}, GameActionFailure> {
  const isCurrentPlayerResult = isPlayerIdTheCurrentPlayer(game, playerId);
  if (isCurrentPlayerResult.isFailure) {
    return failure(isCurrentPlayerResult.error);
  }
  const stateResult = isGameInRightState(game, ["playing"]);
  if (stateResult.isFailure) {
    return failure(stateResult.error);
  }

  const playerIndexResult = getPlayerIndex(game, playerId);
  if (playerIndexResult.isFailure) {
    return failure(playerIndexResult.error);
  }

  const currentPlayer = game.players[playerIndexResult.value];
  const drawnCardResult = drawCard(game.deck);

  if (drawnCardResult.isFailure) {
    return failure({
      error: drawnCardResult.error.error,
      game,
    });
  }

  const drawnCard = drawnCardResult.value.card;
  game.deck = drawnCardResult.value.deck;
  currentPlayer.heldCard = drawnCard;

  return success({game, card: drawnCard});
}

/**
 * Allows a player to draw a card from the stack and exchange it with a card in their mat.
 * @param game The current game state.
 * @param playerId The ID of the player drawing the card.
 * @param matIndex The index of the mat where the card will be exchanged.
 * @returns An Outcome containing the updated game state or an error.
 */
export function playerDrawsCardFromStack(
  game: Game,
  playerId: string,
  matIndex: number
): Outcome<Game, GameActionFailure> {
  const isCurrentPlayerResult = isPlayerIdTheCurrentPlayer(game, playerId);
  if (isCurrentPlayerResult.isFailure) {
    return failure(isCurrentPlayerResult.error);
  }
  const stateResult = isGameInRightState(game, ["playing"]);
  if (stateResult.isFailure) {
    return failure(stateResult.error);
  }
  const playerIndexResult = getPlayerIndex(game, playerId);
  if (playerIndexResult.isFailure) {
    return failure(playerIndexResult.error);
  }

  const currentPlayer = game.players[playerIndexResult.value];
  const drawnCardResult = drawCardFromStack(game.stack);

  if (drawnCardResult.isFailure) {
    return failure({
      error: drawnCardResult.error.error,
      game,
    });
  }

  const drawnCard = drawnCardResult.value.card;
  game.stack = drawnCardResult.value.stack;
  const exchangeResult = exchangeCardInPlayerMat(
    currentPlayer,
    matIndex,
    drawnCard
  );
  if (exchangeResult.isFailure) {
    return failure({
      error: exchangeResult.error,
      game,
    });
  }
  game.players[playerIndexResult.value] = exchangeResult.value.player;
  game.stack = addCardToStack(game.stack, exchangeResult.value.card);

  return success(game);
}
/**
 * Allows a player to discard their held card.
 * @param game The current game state.
 * @param playerId The ID of the player discarding the card.
 * @returns An Outcome containing the updated game state or an error.
 */
export function playerDiscardsHeldCard(
  game: Game,
  playerId: string
): Outcome<Game, GameActionFailure> {
  const isCurrentPlayerResult = isPlayerIdTheCurrentPlayer(game, playerId);
  if (isCurrentPlayerResult.isFailure) {
    return failure(isCurrentPlayerResult.error);
  }
  const stateResult = isGameInRightState(game, ["playing"]);
  if (stateResult.isFailure) {
    return failure(stateResult.error);
  }

  const playerIndexResult = getPlayerIndex(game, playerId);
  if (playerIndexResult.isFailure) {
    return failure(playerIndexResult.error);
  }

  const currentPlayer = game.players[playerIndexResult.value];
  const heldCard = currentPlayer.heldCard;
  if (!heldCard) {
    return failure({
      error: `Player with ID ${currentPlayer.id} has no card to discard.`,
      game,
    });
  }

  game.stack = addCardToStack(game.stack, heldCard);
  currentPlayer.heldCard = null;

  return success(game);
}

/**
 * Allows a player to exchange their held card with a card in their mat.
 * @param game The current game state.
 * @param playerId The ID of the player exchanging the card.
 * @param matIndex The index of the mat where the card will be exchanged.
 * @returns An Outcome containing the updated game state or an error.
 */
export function playerExchangesHeldCard(
  game: Game,
  playerId: string,
  matIndex: number
): Outcome<Game, GameActionFailure> {
  const stateResult = isGameInRightState(game, ["playing"]);
  if (stateResult.isFailure) {
    return failure(stateResult.error);
  }

  const playerIndexResult = getPlayerIndex(game, playerId);
  if (playerIndexResult.isFailure) {
    return failure(playerIndexResult.error);
  }

  const currentPlayer = game.players[playerIndexResult.value];
  const heldCard = currentPlayer.heldCard;
  if (!heldCard) {
    return failure({
      error: `Player with ID ${currentPlayer.id} has no card to exchange.`,
      game,
    });
  }
  const exchangeResult = exchangeCardInPlayerMat(
    currentPlayer,
    matIndex,
    heldCard
  );
  if (exchangeResult.isFailure) {
    return failure({
      error: exchangeResult.error,
      game,
    });
  }

  game.players[playerIndexResult.value] = exchangeResult.value.player;
  game.stack = addCardToStack(game.stack, exchangeResult.value.card);

  return success(game);
}
