import type { Player } from "./type";
import type { Card } from "../card/type";
import { type Outcome, success, failure } from "../shared/result";

export function createPlayer(id: string, name: string): Player {
  return {
    id,
    name,
    score: 0,
    cardMat: [],
    heldCard: null,
  };
}

export function updatePlayerScore(player: Player, score: number): Player {
  return {
    ...player,
    score: player.score + score,
  };
}

export function addCardToPlayerMat(player: Player, card: Card): Player {
  return {
    ...player,
    cardMat: [...player.cardMat, card],
  };
}

export function discardCardFromPlayerMat(
  player: Player,
  index: number
): Outcome<Player, string> {
  if (index < 0 || index >= player.cardMat.length) {
    return failure(
      `Invalid card index: ${index}, must be between 0 and ${
        player.cardMat.length - 1
      }`
    );
  }

  const newCardMat = [...player.cardMat];
  newCardMat.splice(index, 1);

  return success({
    ...player,
    cardMat: newCardMat,
  });
}

export function exchangeCardInPlayerMat(
  player: Player,
  index: number,
  newCard: Card
): Outcome<{ player: Player; card: Card }, string> {
  if (index < 0 || index >= player.cardMat.length) {
    return failure(
      `Invalid card index: ${index}, must be between 0 and ${
        player.cardMat.length - 1
      }`
    );
  }

  const newCardMat = [...player.cardMat];
  const oldCard = newCardMat[index];
  newCardMat[index] = newCard;  
  return success({
    player: {
      ...player,
      cardMat: newCardMat,
    },
    card: oldCard,
  });
}

export function setPlayerHeldCard(player: Player, card: Card | null): Player {
  return {
    ...player,
    heldCard: card,
  };
}

export function clearPlayerHeldCard(player: Player): Player {
  return {
    ...player,
    heldCard: null,
  };
}
