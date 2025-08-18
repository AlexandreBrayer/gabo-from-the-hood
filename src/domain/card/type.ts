export type Card = {
  value:
    | "Ace"
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
    | "10"
    | "Jack"
    | "Queen"
    | "King";
  suit: "Hearts" | "Diamonds" | "Clubs" | "Spades";
};

export type CardDeck = Card[];

export type CardStack = Card[];

export type CardDeckFailure = {
  error: string;
  deck: CardDeck;
};

export type CardStackFailure = {
  error: string;
  stack: CardStack;
};