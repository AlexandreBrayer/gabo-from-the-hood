import { type Outcome, success, failure } from "../shared/result";
import type { Game, GameActionFailure } from "./type";
import { isGameInRightState } from "./errorHandling";
import { getPlayerIndex } from "./getters";

export function setCurrentPlayerToNextPlayer(
  game: Game
): Outcome<Game, GameActionFailure> {
  game = structuredClone(game);
  const stateResult = isGameInRightState(game, ["playing"]);
  if (stateResult.isFailure) {
    return failure(stateResult.error);
  }

  if (game.currentPlayerId === null) {
    return failure({
      error: "No current player set. Cannot determine next player.",
      game,
    });
  }

  const currentPlayerIndex = getPlayerIndex(game, game.currentPlayerId);
  if (currentPlayerIndex.isFailure) {
    return failure(currentPlayerIndex.error);
  }

  const nextPlayerIndex = (currentPlayerIndex.value + 1) % game.players.length;
  game.currentPlayerId = game.players[nextPlayerIndex].id;

  return success(game);
}
