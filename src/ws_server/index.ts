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
  ws.send(JSON.stringify({
    type,
    data: JSON.stringify(dataObj),
    id: 0
  }));
}

function broadcastWinners(): void {
  const winnersList = players.map(p => ({ name: p.name, wins: p.wins }));
  wss.clients.forEach(client => {
    const ws = client as CustomWebSocket;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'update_winners',
        data: JSON.stringify(winnersList),
        id: 0
      }));
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
      data = JSON.parse(parsed.data);
    } catch {
      send(ws, 'reg', { error: true, errorText: 'Invalid data format' });
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

        broadcastWinners();
        break;
      }

      case 'create_game': {
        if (!ws.playerName) {
          send(ws, 'create_game', { error: true, errorText: 'Not logged in' });
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

        send(ws, 'create_game', { gameId, playerId, error: false, errorText: "" });
        break;
      }

      case 'join_game': {
        if (!ws.playerName) {
          send(ws, 'join_game', { error: true, errorText: 'Not logged in' });
          return;
        }

        const { gameId } = data;
        const game = games.find(g => g.gameId === gameId);
        if (!game) {
          send(ws, 'join_game', { error: true, errorText: 'Game not found' });
          return;
        }

        if (game.players.some(p => p.name === ws.playerName)) {
          send(ws, 'join_game', { error: true, errorText: 'Already joined' });
          return;
        }

        const playerId = `${ws.playerName}_${Math.floor(Math.random() * 10000)}`;
        game.players.push({ name: ws.playerName, playerId });

        send(ws, 'join_game', { gameId, playerId, error: false, errorText: "" });
        break;
      }

      case 'start_game': {
        const { gameId, shipsPositions } = data;
        const game = games.find(g => g.gameId === gameId);
        if (!game) {
          send(ws, 'start_game', { error: true, errorText: 'Game not found' });
          return;
        }

        if (!game.players.some(p => p.name === ws.playerName)) {
          send(ws, 'start_game', { error: true, errorText: 'Not in game' });
          return;
        }

        game.shipsPositions = shipsPositions;
        game.state = 'started';

        game.players.forEach(({ name }) => {
          wss.clients.forEach(client => {
            const clientWs = client as CustomWebSocket;
            if (clientWs.readyState === WebSocket.OPEN && clientWs.playerName === name) {
              send(clientWs, 'start_game', { gameId, shipsPositions });
            }
          });
        });

        break;
      }

      default:
        send(ws, 'error', { error: true, errorText: 'Unknown command' });
    }
  });
});

console.log("✅ WebSocket server started on port 3000");