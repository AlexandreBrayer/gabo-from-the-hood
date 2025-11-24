import { WebSocket, RawData } from 'ws';
import { randomUUID } from 'crypto';
import type { ClientMessage, ServerMessage, ClientInfo } from './types';
import { GameManager } from './gameManager';

export class WebSocketHandler {
  private clients = new Map<WebSocket, string>();
  private gameManager: GameManager;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  handleConnection(ws: WebSocket, clientIp?: string): void {
    const clientId = randomUUID();
    this.clients.set(ws, clientId);
    
    console.log(`✅ Nouveau client connecté depuis ${clientIp || 'unknown'} - ID: ${clientId}`);

    // Message de bienvenue
    const welcomeMessage: ServerMessage = {
      type: 'welcome',
      data: { message: 'Connexion réussie au serveur Gabo!' },
      clientId: clientId,
      timestamp: new Date().toISOString()
    };
    this.sendToClient(ws, welcomeMessage);

    // Gestionnaires d'événements
    ws.on('message', (rawMessage) => {
      this.handleMessage(ws, rawMessage);
    });

    ws.on('close', (code, reason) => {
      this.handleDisconnection(ws, code, reason);
    });

    ws.on('error', (error) => {
      console.error('💥 Erreur WebSocket:', error);
    });
  }

  private handleMessage(ws: WebSocket, rawMessage: RawData): void {
    const clientId = this.clients.get(ws);
    
    try {
      const message: ClientMessage = JSON.parse(rawMessage.toString());
      console.log(`📨 Message reçu de ${clientId}:`, message);

      this.routeMessage(ws, message);
      
    } catch (error) {
      console.error('❌ Erreur lors du parsing du message:', error);
      const errorMessage: ServerMessage = {
        type: 'error',
        data: { error: 'Format de message invalide' },
        timestamp: new Date().toISOString()
      };
      this.sendToClient(ws, errorMessage);
    }
  }

  private routeMessage(ws: WebSocket, message: ClientMessage): void {
    const clientId = this.clients.get(ws);
    if (!clientId) return;

    switch (message.type) {
      case 'ping':
        this.handlePing(ws);
        break;
        
      case 'echo':
        this.handleEcho(ws, message);
        break;
        
      case 'broadcast':
        this.handleBroadcast(ws, message);
        break;
        
      case 'joinGame':
        this.handleJoinGame(ws, message, clientId);
        break;
        
      case 'leaveGame':
        this.handleLeaveGame(ws, message, clientId);
        break;
        
      case 'startGame':
        this.handleStartGame(ws, message, clientId);
        break;
        
      case 'gameMessage':
        this.handleGameMessage(ws, message, clientId);
        break;
        
      default:
        this.sendToClient(ws, {
          type: 'error',
          data: { error: `Type de message inconnu: ${message.type}` },
          timestamp: new Date().toISOString()
        });
    }
  }

  private handlePing(ws: WebSocket): void {
    this.sendToClient(ws, {
      type: 'pong',
      data: { message: 'pong!' },
      timestamp: new Date().toISOString()
    });
  }

  private handleEcho(ws: WebSocket, message: ClientMessage): void {
    this.sendToClient(ws, {
      type: 'echo',
      data: message.data,
      timestamp: new Date().toISOString()
    });
  }

  private handleBroadcast(ws: WebSocket, message: ClientMessage): void {
    const senderClientId = this.clients.get(ws);
    
    const broadcastMessage: ServerMessage = {
      type: 'broadcast',
      data: { 
        ...message.data, 
        from: senderClientId 
      },
      timestamp: new Date().toISOString()
    };
    
    this.broadcastToAll(broadcastMessage);
  }

  private handleJoinGame(ws: WebSocket, message: ClientMessage, clientId: string): void {
    const { gameId, playerName, password } = message.data || {};
    
    if (!gameId) {
      this.sendToClient(ws, {
        type: 'error',
        data: { error: 'gameId requis' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const clientInfo: ClientInfo = {
      id: clientId,
      ws: ws,
      playerName: playerName || `Player_${clientId.slice(0, 8)}`,
      joinedAt: new Date()
    };

    const success = this.gameManager.addPlayerToGame(gameId, clientInfo, password);
    
    if (success) {
      // Notifier le joueur qu'il a rejoint
      this.sendToClient(ws, {
        type: 'gameJoined',
        gameId: gameId,
        data: { 
          message: 'Game rejointe avec succès',
          playerName: clientInfo.playerName 
        },
        timestamp: new Date().toISOString()
      });

      // Notifier les autres joueurs de la game
      this.broadcastToGame(gameId, {
        type: 'playerJoined',
        gameId: gameId,
        data: {
          playerId: clientId,
          playerName: clientInfo.playerName
        },
        timestamp: new Date().toISOString()
      }, clientId);
    } else {
      this.sendToClient(ws, {
        type: 'error',
        data: { error: 'Impossible de rejoindre la game' },
        timestamp: new Date().toISOString()
      });
    }
  }

  private handleLeaveGame(ws: WebSocket, message: ClientMessage, clientId: string): void {
    const { gameId } = message.data || {};
    
    if (!gameId) {
      this.sendToClient(ws, {
        type: 'error',
        data: { error: 'gameId requis' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const success = this.gameManager.removePlayerFromGame(gameId, clientId);
    
    if (success) {
      this.sendToClient(ws, {
        type: 'gameLeft',
        gameId: gameId,
        data: { message: 'Game quittée avec succès' },
        timestamp: new Date().toISOString()
      });

      // Notifier les autres joueurs
      this.broadcastToGame(gameId, {
        type: 'playerLeft',
        gameId: gameId,
        data: { playerId: clientId },
        timestamp: new Date().toISOString()
      }, clientId);
    }
  }

  private handleStartGame(ws: WebSocket, message: ClientMessage, clientId: string): void {
    const { gameId } = message.data || {};
    
    if (!gameId) {
      this.sendToClient(ws, {
        type: 'error',
        data: { error: 'gameId requis' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const game = this.gameManager.getGame(gameId);
    if (!game) {
      this.sendToClient(ws, {
        type: 'error',
        data: { error: 'Game introuvable' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Vérifier que c'est le créateur de la game
    if (game.createdBy !== clientId) {
      this.sendToClient(ws, {
        type: 'error',
        data: { error: 'Seul le créateur peut démarrer la game' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const success = this.gameManager.startGame(gameId);
    
    if (success) {
      this.broadcastToGame(gameId, {
        type: 'gameStarted',
        gameId: gameId,
        data: { message: 'La game a commencé!' },
        timestamp: new Date().toISOString()
      });
    } else {
      this.sendToClient(ws, {
        type: 'error',
        data: { error: 'Impossible de démarrer la game' },
        timestamp: new Date().toISOString()
      });
    }
  }

  private handleGameMessage(ws: WebSocket, message: ClientMessage, clientId: string): void {
    const { gameId } = message.data || {};
    
    if (!gameId) {
      this.sendToClient(ws, {
        type: 'error',
        data: { error: 'gameId requis' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Transmettre le message aux autres joueurs de la game
    this.broadcastToGame(gameId, {
      type: 'gameMessage',
      gameId: gameId,
      data: {
        ...message.data,
        from: clientId
      },
      timestamp: new Date().toISOString()
    }, clientId);
  }

  private handleDisconnection(ws: WebSocket, code: number, reason: RawData): void {
    const clientId = this.clients.get(ws);
    this.clients.delete(ws);
    
    if (clientId) {
      console.log(`🔌 Client ${clientId} déconnecté - Code: ${code}, Raison: ${reason}`);
      
      // Retirer le client de toutes les games
      // TODO: Implémenter la recherche des games où le client était présent
    }
  }

  private sendToClient(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcastToAll(message: ServerMessage): void {
    this.clients.forEach((clientId, ws) => {
      this.sendToClient(ws, message);
    });
  }

  private broadcastToGame(gameId: string, message: ServerMessage, excludeClientId?: string): void {
    const game = this.gameManager.getGame(gameId);
    if (!game) return;

    game.players.forEach((clientInfo, playerId) => {
      if (excludeClientId && playerId === excludeClientId) return;
      
      this.sendToClient(clientInfo.ws, message);
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}
