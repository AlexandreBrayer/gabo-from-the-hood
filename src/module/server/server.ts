import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

// Types pour les messages
type ClientMessage = {
  type: string;
  data?: any;
};

type ServerMessage = {
  type: string;
  data?: any;
  timestamp?: string;
  clientId?: string;
};

// Map pour stocker les clients connectés avec leurs IDs
const clients = new Map<WebSocket, string>();

// Créer le serveur WebSocket
const wss = new WebSocketServer({ port: PORT });

console.log(`🚀 WebSocket Server démarré sur le port ${PORT}`);

// Gestionnaire de connexions
wss.on('connection', (ws, request) => {
  const clientIp = request.socket.remoteAddress;
  const clientId = randomUUID();
  
  // Stocker le client avec son ID
  clients.set(ws, clientId);
  
  console.log(`✅ Nouveau client connecté depuis ${clientIp} - ID: ${clientId}`);

  // Envoyer un message de bienvenue avec l'ID assigné
  const welcomeMessage: ServerMessage = {
    type: 'welcome',
    data: { message: 'Connexion réussie au serveur Gabo!' },
    clientId: clientId,
    timestamp: new Date().toISOString()
  };
  ws.send(JSON.stringify(welcomeMessage));

  // Gestionnaire de messages reçus
  ws.on('message', (rawMessage) => {
    try {
      const message: ClientMessage = JSON.parse(rawMessage.toString());
      console.log(`📨 Message reçu de ${clientId}:`, message);

      // Traiter le message selon son type
      handleMessage(ws, message);
      
    } catch (error) {
      console.error('❌ Erreur lors du parsing du message:', error);
      const errorMessage: ServerMessage = {
        type: 'error',
        data: { error: 'Format de message invalide' },
        timestamp: new Date().toISOString()
      };
      ws.send(JSON.stringify(errorMessage));
    }
  });

  // Gestionnaire de fermeture de connexion
  ws.on('close', (code, reason) => {
    const disconnectedClientId = clients.get(ws);
    clients.delete(ws);
    console.log(`🔌 Client ${disconnectedClientId} déconnecté - Code: ${code}, Raison: ${reason}`);
  });

  // Gestionnaire d'erreurs
  ws.on('error', (error) => {
    console.error('💥 Erreur WebSocket:', error);
  });
});

// Fonction pour traiter les messages
function handleMessage(ws: WebSocket, message: ClientMessage) {
  const response: ServerMessage = {
    type: '',
    timestamp: new Date().toISOString()
  };

  switch (message.type) {
    case 'ping':
      response.type = 'pong';
      response.data = { message: 'pong!' };
      break;

    case 'echo':
      response.type = 'echo';
      response.data = message.data;
      break;

    case 'broadcast':
      // Récupérer l'ID du client qui envoie le message
      const senderClientId = clients.get(ws);
      
      // Diffuser le message à tous les clients connectés avec l'ID du sender
      const broadcastMessage: ServerMessage = {
        type: 'broadcast',
        data: { 
          ...message.data, 
          from: senderClientId // Le serveur ajoute l'ID réel du sender
        },
        timestamp: new Date().toISOString()
      };
      
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(broadcastMessage));
        }
      });
      return; // Pas de réponse individuelle

    default:
      response.type = 'unknown';
      response.data = { error: `Type de message inconnu: ${message.type}` };
  }

  // Envoyer la réponse
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(response));
  }
}

// Gestionnaire d'arrêt propre
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du serveur...');
  wss.close(() => {
    console.log('✅ Serveur fermé proprement');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Signal SIGTERM reçu, arrêt du serveur...');
  wss.close(() => {
    console.log('✅ Serveur fermé proprement');
    process.exit(0);
  });
});
