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

class GaboClient {
  private ws: WebSocket;
  private clientId: string | null = null;

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.ws.on('open', () => {
      console.log(`🟢 [Client] Connecté au serveur`);
      
      // Tester quelques messages
      this.testMessages();
    });

    this.ws.on('message', (data) => {
      try {
        const message: ServerMessage = JSON.parse(data.toString());
        
        // Si le serveur nous assigne un ID, on le garde
        if (message.type === 'welcome' && message.clientId) {
          this.clientId = message.clientId;
          console.log(`🆔 ID assigné par le serveur: ${this.clientId}`);
        }
        
        console.log(`📨 [${this.clientId || 'Client'}] Reçu:`, message);
      } catch (error) {
        console.error(`❌ [${this.clientId || 'Client'}] Erreur parsing:`, error);
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`🔴 [${this.clientId || 'Client'}] Déconnecté - Code: ${code}, Raison: ${reason}`);
    });

    this.ws.on('error', (error) => {
      console.error(`💥 [${this.clientId || 'Client'}] Erreur:`, error);
    });
  }

  private async testMessages(): Promise<void> {
    // Attendre un peu pour être sûr que la connexion est établie
    await this.delay(1000);

    // Test ping
    this.sendMessage({
      type: 'ping'
    });

    await this.delay(1000);

    // Test echo
    this.sendMessage({
      type: 'echo',
      data: { message: `Bonjour du client ${this.clientId}!` }
    });

    await this.delay(1000);

    // Test broadcast
    this.sendMessage({
      type: 'broadcast',
      data: { 
        message: `Message broadcast de ${this.clientId}` 
      }
    });

    await this.delay(1000);

    // Test message inconnu
    this.sendMessage({
      type: 'unknown_type',
      data: { test: 'ceci devrait générer une erreur' }
    });
  }

  private sendMessage(message: ClientMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      console.log(`📤 [${this.clientId || 'Client'}] Envoi:`, message);
      this.ws.send(JSON.stringify(message));
    } else {
      console.error(`❌ [${this.clientId || 'Client'}] WebSocket pas prêt pour l'envoi`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public close(): void {
    this.ws.close();
  }
}

// Script de test
async function runTest() {
  const SERVER_URL = 'ws://localhost:8080';

  console.log('🚀 Démarrage du test WebSocket...\n');

  // Créer plusieurs clients pour tester
  const client1 = new GaboClient(SERVER_URL);
  
  // Attendre un peu puis créer un second client
  setTimeout(() => {
    const client2 = new GaboClient(SERVER_URL);
    
    // Fermer les clients après 10 secondes
    setTimeout(() => {
      console.log('\n🛑 Fermeture des clients...');
      client1.close();
      client2.close();
      
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

export { GaboClient };
