import { getPlayerById } from "../game/getters";
import type { Game, RuleTarget, CardRuleStep, RuleCaster, CardRuleFunction } from "../game/type";
import { success, failure, validate } from "../shared/result";
import { isValidMatIndex } from "../player/getters";
import { asGameActionFailure } from "../game/errorHandling";
import { type Card } from "./type";

function stepError(error: string, game: Game): CardRuleStep {
  return {
    type: "result",
    result: failure({
      error,
      game,
    }),
  };
}

function stepSuccess(game: Game, extras?: {
  card: Card
}): CardRuleStep {
  return {
    type: "result",
    result: success(game),
    extras
  };
}

/**
 * Exchanges a card in the player's mat with another player's card.
 * @param game - The current game state.
 * @param target - The player and index of the card to exchange.
 * @param caster - The player and index of the card to exchange with.
 * @returns A CardRuleStep indicating the result of the operation.
 */
export const exchangeMatCard: CardRuleFunction = (
  game: Game,
  target: RuleTarget,
  caster: RuleCaster
) => {
  const p1 = validate(getPlayerById(game, target.playerId))
  .check((player) => {
    const idxCheck = isValidMatIndex(player, target.matIndex);
    if (idxCheck.isFailure) {
      return failure(asGameActionFailure(idxCheck.error, game));
    }
    return success(player);
  })
  .result();
 
  if (p1.isFailure) {
    return stepError(p1.error.error, game);
  }
  const p2 = validate(getPlayerById(game, caster.playerId))
  .check((player) => {
    const idxCheck = isValidMatIndex(player, caster.matIndex ?? -1); // in case caster.matIndex is not provided, we assume -1
    if (idxCheck.isFailure) {
      return failure(asGameActionFailure(idxCheck.error, game));
    }
    return success(player);
  })
  .result();
  if (p2.isFailure) {
    return stepError(p2.error.error, game);
  }
  // Swap
  [p1.value.cardMat[target.matIndex], p2.value.cardMat[caster.matIndex!]] = [
    p2.value.cardMat[caster.matIndex!],
    p1.value.cardMat[target.matIndex],
  ];

  return stepSuccess(game);
}

/**
 * Looks up a card in the player's mat.
 * target must be the same as caster.
 * @param game - The current game state.
 * @param target - The player and index of the card to look up.
 * @param caster - The player who is looking up the card.
 * @returns A CardRuleStep indicating the result of the lookup.
 */
export const lookupOwnCard: CardRuleFunction = (
  game: Game,
  target: RuleTarget,
  caster: RuleCaster
) =>  {
  const player = validate(getPlayerById(game, target.playerId))
    .check((player) => {
      const idxCheck = isValidMatIndex(player, target.matIndex);
      if (idxCheck.isFailure) {
        return failure(asGameActionFailure(idxCheck.error, game));
      }
      return success(player);
    })
    .check((player) => {
      if (player.id !== caster.playerId) {
        return failure(asGameActionFailure(`Cannot look up card for another player: ${target.playerId}`, game));
      }
      return success(player);
    })
    .result();
  
  if (player.isFailure) {
    return stepError(player.error.error, game);
  }
  const matIndex = target.matIndex;
  const card = player.value.cardMat[matIndex];

  return stepSuccess(game, { card });

}

/**
 * Looks up a card in the player's mat.
 * target must be different from caster.
 * @param game - The current game state.
 * @param target - The player and index of the card to look up.
 * @param caster - The player who is looking up the card.
 * @returns A CardRuleStep indicating the result of the lookup.
 */
export const lookupOthersCard : CardRuleFunction= (
  game: Game,
  target: RuleTarget,
  caster: RuleCaster
) => {
  const player = validate(getPlayerById(game, target.playerId))
    .check((player) => {
      const idxCheck = isValidMatIndex(player, target.matIndex);
      if (idxCheck.isFailure) {
        return failure(asGameActionFailure(idxCheck.error, game));
      }
      return success(player);
    })
    .check((player) => {
      if (player.id === caster.playerId) {
        return failure(asGameActionFailure(`Cannot look up own card: ${target.playerId}`, game));
      }
      return success(player);
    })
    .result();

  if (player.isFailure) {
    return stepError(player.error.error, game);
  }

  const matIndex = target.matIndex;
  const card = player.value.cardMat[matIndex];
  return stepSuccess(game, { card });
}

/**
 * Looks up a card in the player's mat and optionally exchanges it with another player's card.
 * @param game - The current game state.
 * @param target - The player and index of the card to look up.
 * @param caster - The player who is looking up the card and may exchange it.
 * @returns A CardRuleStep indicating the result of the lookup and potential exchange.
 */
export const lookupAndMaybeExchangeCard: CardRuleFunction = (
  game: Game,
  target: RuleTarget,
  caster: RuleCaster
) => {
  const lookupResult = lookupOthersCard(game, target, caster);
  if (lookupResult.type !== "result") {
    return lookupResult;
  }

  if (lookupResult.result.isFailure) {
    return lookupResult;
  }

  const card = lookupResult.extras?.card;
  if (!card) {
    return stepError("Card not found in lookup result", game);
  }
  return {
    type: "cardBasedDecision",
    card,
    continue: (doContinue, matIndex?) => {
      if (!doContinue) return { type: "result", result: success(game) };
      return exchangeMatCard(game, target, {
        ...caster,
        matIndex: matIndex ?? -1,
      });
    },
  };
}
