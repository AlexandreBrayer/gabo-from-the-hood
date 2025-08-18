import type { Player } from "./type";
import { success, failure, type Outcome } from "../shared/result";


export function isValidMatIndex(
  player: Player,
  matIndex: number
): Outcome<true, string> {
  if (matIndex < 0 || matIndex >= player.cardMat.length) {
    return failure(
      `Invalid mat index: ${matIndex}, must be between 0 and ${player.cardMat.length - 1}`
    );
  }
  return success(true);
}