import type { Card, CardDeck, CardStack } from "../card/type";
import type { Player } from "../player/type";
import * as z from "zod/v4";
import type { Outcome } from "../shared/result";

export type Game = {
  readonly config: GameConfig;
  state: GameState;
  deck: CardDeck;
  stack: CardStack;
  players: Player[];
  currentPlayerId: string | null; // ID of the player whose turn it is
  gaboPlayers: string[]; // Player IDs who have declared "Gabo"
  counterGaboPlayers?: string[]; // Player IDs who have declared "Counter Gabo"
};

export type GameState = "waiting" | "playing" | "gabo" | "finished";

export type GameConfig = {
  players: number;
  cardsPerPlayer: number;
  scoreToLose: number;
  descents: Descent[];
  cardRules: CardRule[];
  falseGaboScore: number;
  counterGaboScore: number;
  cardScores: CardScore[];
  isRapidGaboAllowed: boolean;
};

export type Descent = [number, number];

export type RuleTarget = {
  playerId: string;
  matIndex: number;
};

export type RuleCaster = {
  playerId: string;
  matIndex?: number;
};

export type CardRuleStep =
  | {
      type: "result";
      result: Outcome<Game, GameActionFailure>;
      extras?: {
        card?: Card;
      };
    }
  | {
      type: "cardBasedDecision";
      card: Card;
      continue: (doExchange: boolean, matIndex?: number) => CardRuleStep
    };

export type CardRuleFunction = (
  game: Game,
  target: RuleTarget,
  caster?: RuleTarget
) => CardRuleStep;

export type CardRule = [Card, CardRuleFunction];

export type CardScore = {
  card: Card;
  score: number;
};

export type GameActionFailure = {
  error: string;
  game: Game;
};

export const validGameConfigSchema = z.object({
  players: z.number().int().min(2).max(6),
  cardsPerPlayer: z.number().int().min(2).max(10),
  scoreToLose: z.number().int().min(1),
  descents: z.array(
    z.tuple([z.number().int().min(1), z.number().int().min(1)])
  ),
  falseGaboScore: z.number().int().min(1),
  counterGaboScore: z.number().int().min(1),
  cardScores: z.array(
    z.object({
      card: z.object({
        value: z.enum([
          "Ace",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "10",
          "Jack",
          "Queen",
          "King",
        ]),
        suit: z.enum(["Hearts", "Diamonds", "Clubs", "Spades"]),
      }),
      score: z.number().int().min(0),
    })
  ),
  isRapidGaboAllowed: z.boolean(),
});
