import WebSocket from 'ws';

// Types pour les messages (identiques au serveur)
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

// État du client
type ClientState = {
  ws: WebSocket;
  clientId: string | null;
};

// Utilitaire de délai
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Envoyer un message
const sendMessage = (client: ClientState, message: ClientMessage): void => {
  if (client.ws.readyState === WebSocket.OPEN) {
    console.log(`� [${client.clientId || 'Client'}] Envoi:`, message);
    client.ws.send(JSON.stringify(message));
  } else {
    console.error(`❌ [${client.clientId || 'Client'}] WebSocket pas prêt pour l'envoi`);
  }
};

// Tests automatiques
const runTestMessages = async (client: ClientState): Promise<void> => {
  // Attendre un peu pour être sûr que la connexion est établie
  await delay(1000);

  // Test ping
  sendMessage(client, { type: 'ping' });
  await delay(1000);

  // Test echo
  sendMessage(client, {
    type: 'echo',
    data: { message: `Bonjour du client ${client.clientId}!` }
  });
  await delay(1000);

  // Test broadcast
  sendMessage(client, {
    type: 'broadcast',
    data: { 
      message: `Message broadcast de ${client.clientId}` 
    }
  });
  await delay(1000);

  // Test message inconnu
  sendMessage(client, {
    type: 'unknown_type',
    data: { test: 'ceci devrait générer une erreur' }
  });
};

// Créer un client WebSocket
const createGaboClient = (url: string): ClientState => {
  const ws = new WebSocket(url);
  const client: ClientState = {
    ws,
    clientId: null
  };

  // Gestionnaire de connexion
  ws.on('open', () => {
    console.log(`🟢 [Client] Connecté au serveur`);
    runTestMessages(client);
  });

  // Gestionnaire de messages
  ws.on('message', (data) => {
    try {
      const message: ServerMessage = JSON.parse(data.toString());
      
      // Si le serveur nous assigne un ID, on le garde
      if (message.type === 'welcome' && message.clientId) {
        client.clientId = message.clientId;
        console.log(`🆔 ID assigné par le serveur: ${client.clientId}`);
      }
      
      console.log(`✉️ [${client.clientId || 'Client'}] Reçu:`, message);
    } catch (error) {
      console.error(`❌ [${client.clientId || 'Client'}] Erreur parsing:`, error);
    }
  });

  // Gestionnaire de fermeture
  ws.on('close', (code, reason) => {
    console.log(`🔴 [${client.clientId || 'Client'}] Déconnecté - Code: ${code}, Raison: ${reason}`);
  });

  // Gestionnaire d'erreurs
  ws.on('error', (error) => {
    console.error(`💥 [${client.clientId || 'Client'}] Erreur:`, error);
  });

  return client;
};

// Fermer un client
const closeClient = (client: ClientState): void => {
  client.ws.close();
};

// Script de test
async function runTest() {
  const SERVER_URL = 'ws://localhost:8080';

  console.log('🚀 Démarrage du test WebSocket...\n');

  // Créer plusieurs clients pour tester
  const client1 = createGaboClient(SERVER_URL);
  
  // Attendre un peu puis créer un second client
  setTimeout(() => {
    const client2 = createGaboClient(SERVER_URL);
    
    // Fermer les clients après 10 secondes
    setTimeout(() => {
      console.log('\n🛑 Fermeture des clients...');
      closeClient(client1);
      closeClient(client2);
      
      // Quitter le processus après un délai
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    }, 10000);
  }, 2000);
}

// Lancer le test si le fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runTest().catch(console.error);
}

export { createGaboClient, closeClient, sendMessage, type ClientState };
