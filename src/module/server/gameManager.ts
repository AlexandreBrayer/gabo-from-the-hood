import { randomUUID } from 'crypto';
import type { GameSession, GameConfig, ClientInfo, GameListResponse } from './types';

// État global des games
const games = new Map<string, GameSession>();

export const createGame = (config: GameConfig, createdBy: string): string => {
  const gameId = randomUUID();
  
  const gameSession: GameSession = {
    id: gameId,
    config: {
      maxPlayers: config.maxPlayers || 4,
      gameName: config.gameName || `Game ${gameId.slice(0, 8)}`,
      isPrivate: config.isPrivate || false,
      password: config.password
    },
    players: new Map(),
    createdAt: new Date(),
    status: 'waiting',
    createdBy
  };

  games.set(gameId, gameSession);
  console.log(`🎮 Game créée: ${gameId} par ${createdBy}`);
  
  return gameId;
};

export const getGame = (gameId: string): GameSession | null => {
  return games.get(gameId) || null;
};

export const deleteGame = (gameId: string): boolean => {
  const deleted = games.delete(gameId);
  if (deleted) {
    console.log(`🗑️ Game supprimée: ${gameId}`);
  }
  return deleted;
};

export const addPlayerToGame = (gameId: string, clientInfo: ClientInfo, password?: string): boolean => {
  const game = games.get(gameId);
  if (!game) {
    console.log(`❌ Game ${gameId} introuvable`);
    return false;
  }

  // Vérifier le mot de passe si la game est privée
  if (game.config.isPrivate && game.config.password !== password) {
    console.log(`❌ Mot de passe incorrect pour la game ${gameId}`);
    return false;
  }

  // Vérifier si la game n'est pas pleine
  if (game.players.size >= game.config.maxPlayers) {
    console.log(`❌ Game ${gameId} est pleine`);
    return false;
  }

  // Vérifier si la game n'a pas déjà commencé
  if (game.status === 'playing') {
    console.log(`❌ Game ${gameId} a déjà commencé`);
    return false;
  }

  game.players.set(clientInfo.id, clientInfo);
  console.log(`👤 Joueur ${clientInfo.id} a rejoint la game ${gameId}`);
  
  return true;
};

export const removePlayerFromGame = (gameId: string, clientId: string): boolean => {
  const game = games.get(gameId);
  if (!game) return false;

  const removed = game.players.delete(clientId);
  if (removed) {
    console.log(`👋 Joueur ${clientId} a quitté la game ${gameId}`);
    
    // Si plus de joueurs, supprimer la game
    if (game.players.size === 0) {
      deleteGame(gameId);
    }
  }
  
  return removed;
};

export const startGame = (gameId: string): boolean => {
  const game = games.get(gameId);
  if (!game) return false;

  if (game.status !== 'waiting') {
    console.log(`❌ Impossible de démarrer la game ${gameId}, status: ${game.status}`);
    return false;
  }

  if (game.players.size < 2) {
    console.log(`❌ Pas assez de joueurs pour démarrer la game ${gameId}`);
    return false;
  }

  game.status = 'playing';
  console.log(`▶️ Game ${gameId} démarrée avec ${game.players.size} joueurs`);
  
  return true;
};

export const endGame = (gameId: string): boolean => {
  const game = games.get(gameId);
  if (!game) return false;

  game.status = 'finished';
  console.log(`🏁 Game ${gameId} terminée`);
  
  return true;
};

export const getPublicGames = (): GameListResponse => {
  const publicGames = Array.from(games.values())
    .filter(game => !game.config.isPrivate)
    .map(game => ({
      id: game.id,
      gameName: game.config.gameName,
      playerCount: game.players.size,
      maxPlayers: game.config.maxPlayers,
      status: game.status,
      isPrivate: game.config.isPrivate || false,
      createdAt: game.createdAt.toISOString()
    }));

  return { games: publicGames };
};

export const cleanupInactiveGames = (maxAgeMs: number = 1000 * 60 * 60): number => {
  const now = new Date().getTime();
  let cleaned = 0;

  for (const [gameId, game] of games.entries()) {
    const gameAge = now - game.createdAt.getTime();
    
    if (game.status === 'finished' || 
       (game.players.size === 0 && gameAge > maxAgeMs)) {
      deleteGame(gameId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 ${cleaned} games inactives nettoyées`);
  }
  
  return cleaned;
};

export const getStats = () => {
  const stats = {
    totalGames: games.size,
    waitingGames: 0,
    playingGames: 0,
    finishedGames: 0,
    totalPlayers: 0
  };

  for (const game of games.values()) {
    stats.totalPlayers += game.players.size;
    
    switch (game.status) {
      case 'waiting': stats.waitingGames++; break;
      case 'playing': stats.playingGames++; break;
      case 'finished': stats.finishedGames++; break;
    }
  }

  return stats;
};
