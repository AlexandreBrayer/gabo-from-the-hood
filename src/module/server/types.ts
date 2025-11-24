// Types partagés pour les messages WebSocket
export type ClientMessage = {
  type: string;
  gameId?: string;
  data?: any;
};

export type ServerMessage = {
  type: string;
  gameId?: string;
  data?: any;
  timestamp?: string;
  clientId?: string;
};

// Types pour la gestion des games
export type GameConfig = {
  maxPlayers: number;
  gameName?: string;
  isPrivate?: boolean;
  password?: string;
};

export type GameSession = {
  id: string;
  config: GameConfig;
  players: Map<string, ClientInfo>;
  createdAt: Date;
  status: 'waiting' | 'playing' | 'finished';
  createdBy: string;
};

import { WebSocket } from 'ws';

export type ClientInfo = {
  id: string;
  ws: WebSocket;
  playerName?: string;
  joinedAt: Date;
};

// Types pour l'API HTTP
export type CreateGameRequest = {
  config: GameConfig;
};

export type CreateGameResponse = {
  gameId: string;
  joinUrl: string;
  status: string;
};

export type GameListResponse = {
  games: Array<{
    id: string;
    gameName?: string;
    playerCount: number;
    maxPlayers: number;
    status: string;
    isPrivate: boolean;
    createdAt: string;
  }>;
};
