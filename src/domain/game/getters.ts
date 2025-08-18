import type { Player } from "../player/type";
import { type Outcome, failure, success } from "../shared/result";
import type { Game, GameActionFailure } from "./type";

export function getPlayerIndex(
  game: Game,
  playerId: string
): Outcome<number, GameActionFailure> {
  const playerIndex = game.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) {
    return failure({
      error: `Player with ID ${playerId} does not exist in the game.`,
      game,
    });
  }
  return success(playerIndex);
}

export function getPlayerById(
  game: Game,
  playerId: string
): Outcome<Player, GameActionFailure> {
  const player = game.players.find((p) => p.id === playerId);
  if (!player) {
    return failure({
      error: `Player with ID ${playerId} does not exist in the game.`,
      game,
    });
  }
  return success(player);
}