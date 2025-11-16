import type { Card } from "../card/type";

export type CardMat = Card[];

export type Player = {
  readonly id: string;
  name: string;
  score: number;
  cardMat: CardMat;
  heldCard: Card | null;
};
