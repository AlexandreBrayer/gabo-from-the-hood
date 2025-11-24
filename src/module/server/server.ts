import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { GameManager } from './gameManager';
import { WebSocketHandler } from './webSocketHandler';
import { HttpServer } from './httpServer';

// Configuration
const WS_PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8080;
const HTTP_PORT = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 3001;

export class GaboServer {
  private gameManager: GameManager;
  private wsHandler: WebSocketHandler;
  private httpServer: HttpServer;
  private wss: WebSocketServer;

  constructor() {
    this.gameManager = new GameManager();
    this.wsHandler = new WebSocketHandler(this.gameManager);
    this.httpServer = new HttpServer(this.gameManager);
    
    // Créer le serveur HTTP pour l'API REST
    const server = createServer(this.httpServer.getApp());
    
    // Créer le serveur WebSocket sur le même serveur HTTP
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'  // WebSocket sera accessible sur ws://localhost:3001/ws
    });

    this.setupWebSocketServer();
    this.setupCleanupTasks();
    this.setupGracefulShutdown();

    // Démarrer le serveur HTTP (qui inclut aussi le WebSocket)
    server.listen(HTTP_PORT, () => {
      console.log(`🌐 Serveur Gabo démarré:`);
      console.log(`   📡 HTTP API: http://localhost:${HTTP_PORT}`);
      console.log(`   🔌 WebSocket: ws://localhost:${HTTP_PORT}/ws`);
      console.log(`   💾 Game Manager initialisé`);
    });
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws, request) => {
      const clientIp = request.socket.remoteAddress;
      this.wsHandler.handleConnection(ws, clientIp);
    });

    console.log(`🎮 WebSocket Handler configuré`);
  }

  private setupCleanupTasks(): void {
    // Nettoyer les games inactives toutes les heures
    setInterval(() => {
      this.gameManager.cleanupInactiveGames();
    }, 60 * 60 * 1000);

    console.log(`🧹 Tâches de nettoyage configurées`);
  }

  private setupGracefulShutdown(): void {
    const shutdown = (signal: string) => {
      console.log(`\n🛑 Signal ${signal} reçu, arrêt du serveur...`);
      
      // Fermer le serveur WebSocket
      this.wss.close(() => {
        console.log('🔌 WebSocket Server fermé');
      });

      // Notifier tous les clients connectés
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'serverShutdown',
            data: { message: 'Le serveur va redémarrer' },
            timestamp: new Date().toISOString()
          }));
          client.close();
        }
      });

      console.log('✅ Serveur fermé proprement');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  // Méthodes publiques pour monitoring
  getStats() {
    return {
      games: this.gameManager.getStats(),
      connections: this.wsHandler.getClientCount(),
      uptime: process.uptime()
    };
  }
}

// Démarrer le serveur si ce fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  new GaboServer();
}
