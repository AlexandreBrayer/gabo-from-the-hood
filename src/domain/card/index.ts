import type {
  CardDeck,
  Card,
  CardStack,
  CardDeckFailure,
  CardStackFailure,
} from "./type";
import { type Outcome, success, failure } from "../shared/result";

const suits = ["Hearts", "Diamonds", "Clubs", "Spades"] as const;
const values = [
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
] as const;

export function createOrderedDeck(): CardDeck {
  const deck: CardDeck = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ value, suit });
    }
  }

  return deck;
}

export function shuffleDeck(deck: CardDeck): CardDeck {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export function drawCard(
  deck: CardDeck
): Outcome<{ card: Card; deck: CardDeck }, CardDeckFailure> {
  if (deck.length === 0) {
    return failure({
      error: "Cannot draw a card from an empty deck.",
      deck,
    });
  }
  const card = deck[0];
  const remainingDeck = deck.slice(1);

  return success({ card, deck: remainingDeck });
}

export function isDeckEmpty(deck: CardDeck): boolean {
  return deck.length === 0;
}

export function getDeckSize(deck: CardDeck): number {
  return deck.length;
}

export function areCardsEqual(card1: Card, card2: Card): boolean {
  return card1.value === card2.value;
}

export function createCardStack(): CardStack {
  return [];
}

export function addCardToStack(stack: CardStack, card: Card): CardStack {
  return [card, ...stack];
}

export function drawCardFromStack(
  stack: CardStack
): Outcome<{ card: Card; stack: CardStack }, CardStackFailure> {
  if (stack.length === 0) {
    return failure({
      error: "Cannot draw a card from an empty stack.",
      stack,
    });
  }
  const card = stack[0];
  const remainingStack = stack.slice(1);

  return success({ card, stack: remainingStack });
}
