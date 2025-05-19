import WebSocket, { WebSocketServer, WebSocket as WSClient } from 'ws';

interface Player {
  name: string;
  password: string;
  wins: number;
}

interface GamePlayer {
  name: string;
  playerId: string;
}

interface Game {
  gameId: string;
  players: GamePlayer[];
  state: 'waiting' | 'started';
  shipsPositions: any;
}

interface ParsedMessage {
  type: string;
  data: string;
  id?: number;
}

interface CustomWebSocket extends WSClient {
  playerName?: string;
}

const players: Player[] = [];
const games: Game[] = [];

const wss = new WebSocketServer({ port: 3000 });

function send(ws: CustomWebSocket, type: string, dataObj: any): void {
  const message = JSON.stringify({
    type,
    data: JSON.stringify(dataObj),
    id: 0
  });
  console.log("Sending:", message);
  ws.send(message);
}


function broadcastRooms() {
  const roomsData = games
    .filter(game => game.players.length === 1)
    .map(game => ({
      roomId: game.gameId,
      roomUsers: game.players.map(p => ({ name: p.name, index: p.playerId })),
    }));

  wss.clients.forEach(client => {
    const ws = client as CustomWebSocket;
    if (ws.readyState === WebSocket.OPEN) {
      send(ws, 'update_room', roomsData);
    }
  });
}

function broadcastWinners(): void {
  const winnersList = players.map(p => ({ name: p.name, wins: p.wins }));
  wss.clients.forEach(client => {
    const ws = client as CustomWebSocket;
    if (ws.readyState === WebSocket.OPEN) {
      send(ws, 'update_winners', winnersList);
    }
  });
}

wss.on('connection', (ws: CustomWebSocket) => {
  ws.on('message', (message: WebSocket.RawData) => {
    console.log("Received:", message.toString());

    let parsed: ParsedMessage;
    try {
      parsed = JSON.parse(message.toString());
    } catch {
      console.error("Invalid JSON");
      send(ws, 'reg', { error: true, errorText: 'Invalid JSON' });
      return;
    }

    let data: any;
    try {
      data = parsed.data ? JSON.parse(parsed.data) : {};
    } catch {
      send(ws, parsed.type, { error: true, errorText: 'Invalid data format' });
      return;
    }

    switch (parsed.type) {
      case 'reg': {
        const { name, password } = data;
        if (!name || !password) {
          send(ws, 'reg', { error: true, errorText: 'Name and password required' });
          return;
        }

        let player = players.find(p => p.name === name);
        if (!player) {
          player = { name, password, wins: 0 };
          players.push(player);
        } else if (player.password !== password) {
          send(ws, 'reg', { name, error: true, errorText: 'Wrong password' });
          return;
        }

        ws.playerName = name;

        send(ws, 'reg', {
          name,
          index: players.indexOf(player),
          error: false,
          errorText: ""
        });

        broadcastRooms();

        broadcastWinners();

        break;
      }

      case 'create_room': {
        if (!ws.playerName) {
          send(ws, 'create_room', { error: true, errorText: 'Not logged in' });
          return;
        }

        const gameId = `game_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const playerId = `${ws.playerName}_${Math.floor(Math.random() * 10000)}`;

        const newGame: Game = {
          gameId,
          players: [{ name: ws.playerName, playerId }],
          state: 'waiting',
          shipsPositions: null,
        };

        games.push(newGame);

        send(ws, 'create_room', { gameId, playerId, error: false, errorText: "" });

        broadcastRooms();

        break;
      }

      case 'add_user_to_room': {
        if (!ws.playerName) {
          send(ws, 'add_user_to_room', { error: true, errorText: 'Not logged in' });
          return;
        }

        const { indexRoom } = data;
        const game = games.find(g => g.gameId === indexRoom);
        if (!game) {
          send(ws, 'add_user_to_room', { error: true, errorText: 'Room not found' });
          return;
        }

        if (game.players.find(p => p.name === ws.playerName)) {
          send(ws, 'add_user_to_room', { error: true, errorText: 'Already in room' });
          return;
        }

        if (game.players.length >= 2) {
          send(ws, 'add_user_to_room', { error: true, errorText: 'Room full' });
          return;
        }

        const playerId = `${ws.playerName}_${Math.floor(Math.random() * 10000)}`;
        game.players.push({ name: ws.playerName, playerId });


        broadcastRooms();

        game.players.forEach(({ name, playerId }) => {
          wss.clients.forEach(client => {
            const wsClient = client as CustomWebSocket;
            if (wsClient.playerName === name && wsClient.readyState === WebSocket.OPEN) {
              send(wsClient, 'create_game', { idGame: game.gameId, idPlayer: playerId });
            }
          });
        });

        break;
      }

      default:
        send(ws, parsed.type, { error: true, errorText: 'Unknown message type' });
        break;
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${ws.playerName}`);
  });
});

console.log("✅ WebSocket server started on port 3000");
