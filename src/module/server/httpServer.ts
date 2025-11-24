import express from 'express';
import type { CreateGameRequest, CreateGameResponse, GameListResponse } from './types';
import * as gameManager from './gameManager';

const setupMiddleware = (app: express.Application): void => {
  // Middleware pour parser le JSON
  app.use(express.json());

  // CORS pour permettre les requêtes depuis le frontend
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    
    next();
  });

  // Logging des requêtes
  app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.path} - ${req.ip}`);
    next();
  });
};

const setupRoutes = (app: express.Application): void => {
  // Route de santé
  app.get('/health', (req, res) => {
    const stats = gameManager.getStats();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      stats
    });
  });

  // Créer une nouvelle game
  app.post('/api/games', (req, res) => {
    try {
      const gameRequest: CreateGameRequest = req.body;
      
      // Validation basique
      if (!gameRequest.config) {
        return res.status(400).json({
          error: 'Configuration de game requise'
        });
      }

      if (gameRequest.config.maxPlayers && 
         (gameRequest.config.maxPlayers < 2 || gameRequest.config.maxPlayers > 8)) {
        return res.status(400).json({
          error: 'maxPlayers doit être entre 2 et 8'
        });
      }

      // Générer un ID client temporaire pour le créateur
      const creatorId = req.headers['x-client-id'] as string || 'anonymous';
      
      const gameId = gameManager.createGame(gameRequest.config, creatorId);
      
      const response: CreateGameResponse = {
        gameId: gameId,
        joinUrl: `ws://localhost:3001/ws?gameId=${gameId}`,
        status: 'created'
      };

      res.status(201).json(response);
      
    } catch (error) {
      console.error('❌ Erreur lors de la création de game:', error);
      res.status(500).json({
        error: 'Erreur serveur lors de la création de game'
      });
    }
  });

  // Lister les games publiques
  app.get('/api/games', (req, res) => {
    try {
      const games: GameListResponse = gameManager.getPublicGames();
      res.json(games);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des games:', error);
      res.status(500).json({
        error: 'Erreur serveur lors de la récupération des games'
      });
    }
  });

  // Obtenir les détails d'une game spécifique
  app.get('/api/games/:gameId', (req, res) => {
    try {
      const { gameId } = req.params;
      const game = gameManager.getGame(gameId);
      
      if (!game) {
        return res.status(404).json({
          error: 'Game introuvable'
        });
      }

      // Retourner les informations publiques de la game
      const gameInfo = {
        id: game.id,
        config: {
          gameName: game.config.gameName,
          maxPlayers: game.config.maxPlayers,
          isPrivate: game.config.isPrivate
        },
        playerCount: game.players.size,
        status: game.status,
        createdAt: game.createdAt.toISOString(),
        players: Array.from(game.players.values()).map(player => ({
          id: player.id,
          playerName: player.playerName,
          joinedAt: player.joinedAt.toISOString()
        }))
      };

      res.json(gameInfo);
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de la game:', error);
      res.status(500).json({
        error: 'Erreur serveur lors de la récupération de la game'
      });
    }
  });

  // Supprimer une game (seulement par le créateur)
  app.delete('/api/games/:gameId', (req, res) => {
    try {
      const { gameId } = req.params;
      const creatorId = req.headers['x-client-id'] as string;
      
      const game = gameManager.getGame(gameId);
      if (!game) {
        return res.status(404).json({
          error: 'Game introuvable'
        });
      }

      if (game.createdBy !== creatorId) {
        return res.status(403).json({
          error: 'Seul le créateur peut supprimer la game'
        });
      }

      const deleted = gameManager.deleteGame(gameId);
      if (deleted) {
        res.json({ message: 'Game supprimée avec succès' });
      } else {
        res.status(500).json({ error: 'Erreur lors de la suppression' });
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de game:', error);
      res.status(500).json({
        error: 'Erreur serveur lors de la suppression de game'
      });
    }
  });

  // Route pour les statistiques
  app.get('/api/stats', (req, res) => {
    try {
      const stats = gameManager.getStats();
      res.json(stats);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des stats:', error);
      res.status(500).json({
        error: 'Erreur serveur lors de la récupération des stats'
      });
    }
  });

  // 404 pour les routes non trouvées
  app.use((req, res) => {
    res.status(404).json({
      error: 'Route non trouvée'
    });
  });
};

export const createHttpServer = (): express.Application => {
  const app = express();
  
  setupMiddleware(app);
  setupRoutes(app);
  
  return app;
};
