import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import * as gameManager from './gameManager';
import * as wsHandler from './webSocketHandler';
import { createHttpServer } from './httpServer';

// Configuration
const HTTP_PORT = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 3001;

let wss: WebSocketServer;

const setupWebSocketServer = (server: any): void => {
  // Créer le serveur WebSocket sur le même serveur HTTP
  wss = new WebSocketServer({ 
    server,
    path: '/ws'  // WebSocket sera accessible sur ws://localhost:3001/ws
  });

  wss.on('connection', (ws, request) => {
    const clientIp = request.socket.remoteAddress;
    wsHandler.handleConnection(ws, clientIp);
  });

  console.log(`🎮 WebSocket Handler configuré`);
};

const setupCleanupTasks = (): void => {
  // Nettoyer les games inactives toutes les heures
  setInterval(() => {
    gameManager.cleanupInactiveGames();
  }, 60 * 60 * 1000);

  console.log(`🧹 Tâches de nettoyage configurées`);
};

const setupGracefulShutdown = (): void => {
  const shutdown = (signal: string) => {
    console.log(`\n🛑 Signal ${signal} reçu, arrêt du serveur...`);
    
    // Fermer le serveur WebSocket
    wss?.close(() => {
      console.log('🔌 WebSocket Server fermé');
    });

    // Notifier tous les clients connectés
    wss?.clients.forEach((client) => {
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
};

export const startGaboServer = (): void => {
  // Créer le serveur HTTP pour l'API REST
  const app = createHttpServer();
  const server = createServer(app);
  
  setupWebSocketServer(server);
  setupCleanupTasks();
  setupGracefulShutdown();

  // Démarrer le serveur HTTP (qui inclut aussi le WebSocket)
  server.listen(HTTP_PORT, () => {
    console.log(`🚀 Serveur Gabo démarré:`);
    console.log(`   📡 HTTP API: http://localhost:${HTTP_PORT}`);
    console.log(`   🔌 WebSocket: ws://localhost:${HTTP_PORT}/ws`);
    console.log(`   💾 Game Manager initialisé`);
  });
};

// Fonction pour monitoring
export const getServerStats = () => {
  return {
    games: gameManager.getStats(),
    connections: wsHandler.getClientCount(),
    uptime: process.uptime()
  };
};

// Démarrer le serveur si ce fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  startGaboServer();
}
