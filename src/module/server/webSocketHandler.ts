import { WebSocket, RawData } from "ws";
import { randomUUID } from "crypto";
import type { ClientMessage, ServerMessage, ClientInfo } from "./types";
import * as gameManager from "./gameManager";

// État global des clients WebSocket
const clients = new Map<WebSocket, string>();

export const handleConnection = (ws: WebSocket, clientIp?: string): void => {
  const clientId = randomUUID();
  clients.set(ws, clientId);

  console.log(
    `✅ Nouveau client connecté depuis ${
      clientIp || "unknown"
    } - ID: ${clientId}`
  );

  // Message de bienvenue
  const welcomeMessage: ServerMessage = {
    type: "welcome",
    data: { message: "Connexion réussie au serveur Gabo!" },
    clientId: clientId,
    timestamp: new Date().toISOString(),
  };
  sendToClient(ws, welcomeMessage);

  // Gestionnaires d'événements
  ws.on("message", (rawMessage) => {
    handleMessage(ws, rawMessage);
  });

  ws.on("close", (code, reason) => {
    handleDisconnection(ws, code, reason);
  });

  ws.on("error", (error) => {
    console.error("💥 Erreur WebSocket:", error);
  });
};

const handleMessage = (ws: WebSocket, rawMessage: RawData): void => {
  const clientId = clients.get(ws);

  try {
    const message: ClientMessage = JSON.parse(rawMessage.toString());
    console.log(`📨 Message reçu de ${clientId}:`, message);

    routeMessage(ws, message);
  } catch (error) {
    console.error("❌ Erreur lors du parsing du message:", error);
    const errorMessage: ServerMessage = {
      type: "error",
      data: { error: "Format de message invalide" },
      timestamp: new Date().toISOString(),
    };
    sendToClient(ws, errorMessage);
  }
};

const routeMessage = (ws: WebSocket, message: ClientMessage): void => {
  const clientId = clients.get(ws);
  if (!clientId) return;

  switch (message.type) {
    case "ping":
      handlePing(ws);
      break;

    case "echo":
      handleEcho(ws, message);
      break;

    case "broadcast":
      handleBroadcast(ws, message);
      break;

    case "joinGame":
      handleJoinGame(ws, message, clientId);
      break;

    case "leaveGame":
      handleLeaveGame(ws, message, clientId);
      break;

    case "startGame":
      handleStartGame(ws, message, clientId);
      break;

    case "gameMessage":
      handleGameMessage(ws, message, clientId);
      break;

    default:
      sendToClient(ws, {
        type: "error",
        data: { error: `Type de message inconnu: ${message.type}` },
        timestamp: new Date().toISOString(),
      });
  }
};

const handlePing = (ws: WebSocket): void => {
  sendToClient(ws, {
    type: "pong",
    data: { message: "pong!" },
    timestamp: new Date().toISOString(),
  });
};

const handleEcho = (ws: WebSocket, message: ClientMessage): void => {
  sendToClient(ws, {
    type: "echo",
    data: message.data,
    timestamp: new Date().toISOString(),
  });
};

const handleBroadcast = (ws: WebSocket, message: ClientMessage): void => {
  const senderClientId = clients.get(ws);

  const broadcastMessage: ServerMessage = {
    type: "broadcast",
    data: {
      ...message.data,
      from: senderClientId,
    },
    timestamp: new Date().toISOString(),
  };

  broadcastToAll(broadcastMessage);
};

const handleJoinGame = (
  ws: WebSocket,
  message: ClientMessage,
  clientId: string
): void => {
  const { gameId, playerName, password } = message.data || {};

  if (!gameId) {
    sendToClient(ws, {
      type: "error",
      data: { error: "gameId requis" },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const clientInfo: ClientInfo = {
    id: clientId,
    ws: ws,
    playerName: playerName || `Player_${clientId.slice(0, 8)}`,
    joinedAt: new Date(),
  };

  const success = gameManager.addPlayerToGame(gameId, clientInfo, password);

  if (success) {
    // Notifier le joueur qu'il a rejoint
    sendToClient(ws, {
      type: "gameJoined",
      gameId: gameId,
      data: {
        message: "Game rejointe avec succès",
        playerName: clientInfo.playerName,
      },
      timestamp: new Date().toISOString(),
    });

    // Notifier les autres joueurs de la game
    broadcastToGame(
      gameId,
      {
        type: "playerJoined",
        gameId: gameId,
        data: {
          playerId: clientId,
          playerName: clientInfo.playerName,
        },
        timestamp: new Date().toISOString(),
      },
      clientId
    );
  } else {
    sendToClient(ws, {
      type: "error",
      data: { error: "Impossible de rejoindre la game" },
      timestamp: new Date().toISOString(),
    });
  }
};

const handleLeaveGame = (
  ws: WebSocket,
  message: ClientMessage,
  clientId: string
): void => {
  const { gameId } = message.data || {};

  if (!gameId) {
    sendToClient(ws, {
      type: "error",
      data: { error: "gameId requis" },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const success = gameManager.removePlayerFromGame(gameId, clientId);

  if (success) {
    sendToClient(ws, {
      type: "gameLeft",
      gameId: gameId,
      data: { message: "Game quittée avec succès" },
      timestamp: new Date().toISOString(),
    });

    // Notifier les autres joueurs
    broadcastToGame(
      gameId,
      {
        type: "playerLeft",
        gameId: gameId,
        data: { playerId: clientId },
        timestamp: new Date().toISOString(),
      },
      clientId
    );
  }
};

const handleStartGame = (
  ws: WebSocket,
  message: ClientMessage,
  clientId: string
): void => {
  const { gameId } = message.data || {};

  if (!gameId) {
    sendToClient(ws, {
      type: "error",
      data: { error: "gameId requis" },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const game = gameManager.getGame(gameId);
  if (!game) {
    sendToClient(ws, {
      type: "error",
      data: { error: "Game introuvable" },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Vérifier que c'est le créateur de la game
  if (game.createdBy !== clientId) {
    sendToClient(ws, {
      type: "error",
      data: { error: "Seul le créateur peut démarrer la game" },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const success = gameManager.startGame(gameId);

  if (success) {
    broadcastToGame(gameId, {
      type: "gameStarted",
      gameId: gameId,
      data: { message: "La game a commencé!" },
      timestamp: new Date().toISOString(),
    });
  } else {
    sendToClient(ws, {
      type: "error",
      data: { error: "Impossible de démarrer la game" },
      timestamp: new Date().toISOString(),
    });
  }
};

const handleGameMessage = (
  ws: WebSocket,
  message: ClientMessage,
  clientId: string
): void => {
  const { gameId } = message.data || {};

  if (!gameId) {
    sendToClient(ws, {
      type: "error",
      data: { error: "gameId requis" },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Transmettre le message aux autres joueurs de la game
  broadcastToGame(
    gameId,
    {
      type: "gameMessage",
      gameId: gameId,
      data: {
        ...message.data,
        from: clientId,
      },
      timestamp: new Date().toISOString(),
    },
    clientId
  );
};

const handleDisconnection = (
  ws: WebSocket,
  code: number,
  reason: RawData
): void => {
  const clientId = clients.get(ws);
  clients.delete(ws);

  if (clientId) {
    console.log(
      `🔌 Client ${clientId} déconnecté - Code: ${code}, Raison: ${reason}`
    );

    // Retirer le client de toutes les games
    // TODO: Implémenter la recherche des games où le client était présent
  }
};

const sendToClient = (ws: WebSocket, message: ServerMessage): void => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
};

const broadcastToAll = (message: ServerMessage): void => {
  clients.forEach((clientId, ws) => {
    sendToClient(ws, message);
  });
};

const broadcastToGame = (
  gameId: string,
  message: ServerMessage,
  excludeClientId?: string
): void => {
  const game = gameManager.getGame(gameId);
  if (!game) return;

  game.players.forEach((clientInfo, playerId) => {
    if (excludeClientId && playerId === excludeClientId) return;

    sendToClient(clientInfo.ws, message);
  });
};

export const getClientCount = (): number => {
  return clients.size;
};
