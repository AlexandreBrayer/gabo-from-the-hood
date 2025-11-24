type ClientState = {
  ws: WebSocket;
  clientId: string | null;
};

type ServerMessage = {
  type: string;
  data?: unknown;
  timestamp?: string;
  clientId?: string;
};

type ClientMessage = {
  type: string;
  data?: unknown;
};

type ClientOptions = {
  onConnect?: () => void;
  onMessage?: (message: ServerMessage, client: ClientState) => void;
  onDisconnect?: (code: number, reason: string) => void;
  onError?: (error: Event) => void;
};

export const createGaboClient = (url: string, options: ClientOptions = {}): ClientState => {
  const ws = new WebSocket(url);
  const client: ClientState = {
    ws,
    clientId: null
  };

  ws.addEventListener('open', () => {
    console.log(`🟢 [Client] Connecté au serveur`);
    options.onConnect?.();
  });

  ws.addEventListener('message', (event) => {
    try {
      const message: ServerMessage = JSON.parse(event.data);
      
      if (message.type === 'welcome' && message.clientId) {
        client.clientId = message.clientId;
        console.log(`🆔 ID assigné par le serveur: ${client.clientId}`);
      }
      
      console.log(`✉️ [${client.clientId || 'Client'}] Reçu:`, message);
      options.onMessage?.(message, client);
    } catch (error) {
      console.error(`❌ [${client.clientId || 'Client'}] Erreur parsing:`, error);
    }
  });

  ws.addEventListener('close', (event) => {
    console.log(`🔴 [${client.clientId || 'Client'}] Déconnecté - Code: ${event.code}, Raison: ${event.reason}`);
    options.onDisconnect?.(event.code, event.reason);
  });

  ws.addEventListener('error', (error) => {
    console.error(`💥 [${client.clientId || 'Client'}] Erreur:`, error);
    options.onError?.(error);
  });

  return client;
};

export const sendMessage = (client: ClientState, message: ClientMessage): boolean => {
  if (client.ws.readyState === WebSocket.OPEN) {
    console.log(`📤 [${client.clientId || 'Client'}] Envoi:`, message);
    client.ws.send(JSON.stringify(message));
    return true;
  } else {
    console.error(`❌ [${client.clientId || 'Client'}] WebSocket pas prêt pour l'envoi`);
    return false;
  }
};

export const closeClient = (client: ClientState): void => {
  client.ws.close();
};

export const isConnected = (client: ClientState): boolean => {
  return client.ws.readyState === WebSocket.OPEN;
};

export const getConnectionState = (client: ClientState): string => {
  switch (client.ws.readyState) {
    case WebSocket.CONNECTING:
      return 'CONNECTING';
    case WebSocket.OPEN:
      return 'OPEN';
    case WebSocket.CLOSING:
      return 'CLOSING';
    case WebSocket.CLOSED:
      return 'CLOSED';
    default:
      return 'UNKNOWN';
  }
};

// Utilitaire pour attendre que la connexion soit établie
export const waitForConnection = (client: ClientState): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }

    const onOpen = () => {
      cleanup();
      resolve();
    };

    const onError = (error: Event) => {
      cleanup();
      reject(error);
    };

    const onClose = () => {
      cleanup();
      reject(new Error('Connection closed'));
    };

    const cleanup = () => {
      client.ws.removeEventListener('open', onOpen);
      client.ws.removeEventListener('error', onError);
      client.ws.removeEventListener('close', onClose);
    };

    client.ws.addEventListener('open', onOpen);
    client.ws.addEventListener('error', onError);
    client.ws.addEventListener('close', onClose);
  });
};

export type { ClientState, ServerMessage, ClientMessage, ClientOptions };