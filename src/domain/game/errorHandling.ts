import { type Outcome, success, failure } from "../shared/result";
import type { GameActionFailure, GameState, Game } from "./type";


export function asGameActionFailure<E>(error: E, game: Game): GameActionFailure {
  if (typeof error === "string") {
    return { error, game };
  }
  // Si error est un objet avec une propriété `error` string, on l'utilise
  if (typeof error === "object" && error !== null && "error" in error && typeof (error as any).error === "string") {
    return { error: (error as any).error, game };
  }
  // Sinon, on stringify pour ne rien perdre
  return { error: String(error), game };
}

export function isGameInRightState(
  game: Game,
  expectedStates: GameState[]
): Outcome<Game, GameActionFailure> {
  if (!expectedStates.includes(game.state)) {
    return failure({
      error: `Game is in state ${
        game.state
      }, expected one of: ${expectedStates.join(", ")}`,
      game,
    });
  }
  return success(game);
}
