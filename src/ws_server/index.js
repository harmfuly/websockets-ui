import WebSocket, { WebSocketServer } from 'ws';

const players = [];
const games = [];

const wss = new WebSocketServer({ port: 3000 });

function send(ws, type, dataObj) {
  ws.send(JSON.stringify({
    type,
    data: JSON.stringify(dataObj),
    id: 0
  }));
}

function broadcastWinners() {
  const winnersList = players.map(p => ({ name: p.name, wins: p.wins }));
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'update_winners',
        data: JSON.stringify(winnersList),
        id: 0
      }));
    }
  });
}

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    console.log("Received:", message.toString());

    let parsed;
    try {
      parsed = JSON.parse(message.toString());
    } catch (e) {
      console.error("Invalid JSON");
      send(ws, 'reg', { error: true, errorText: 'Invalid JSON' });
      return;
    }

    let data;
    try {
      data = JSON.parse(parsed.data);
    } catch (e) {
      send(ws, 'reg', { error: true, errorText: 'Invalid data format' });
      return;
    }

    if (parsed.type === 'reg') {
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

      send(ws, 'reg', { name, index: players.indexOf(player), error: false, errorText: "" });

      broadcastWinners();

      return;
    }

    if (parsed.type === 'create_game') {
      if (!ws.playerName) {
        send(ws, 'create_game', { error: true, errorText: 'Not logged in' });
        return;
      }

      const gameId = `game_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const playerId = `${ws.playerName}_${Math.floor(Math.random() * 10000)}`;

      const newGame = {
        gameId,
        players: [{ name: ws.playerName, playerId }],
        state: 'waiting',
        shipsPositions: null,
      };

      games.push(newGame);

      send(ws, 'create_game', { gameId, playerId, error: false, errorText: "" });

      return;
    }

    if (parsed.type === 'join_game') {
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

      if (game.players.find(p => p.name === ws.playerName)) {
        send(ws, 'join_game', { error: true, errorText: 'Already joined' });
        return;
      }

      const playerId = `${ws.playerName}_${Math.floor(Math.random() * 10000)}`;
      game.players.push({ name: ws.playerName, playerId });

      send(ws, 'join_game', { gameId, playerId, error: false, errorText: "" });

      return;
    }

    if (parsed.type === 'start_game') {
      const { gameId, shipsPositions } = data;
      const game = games.find(g => g.gameId === gameId);
      if (!game) {
        send(ws, 'start_game', { error: true, errorText: 'Game not found' });
        return;
      }

      if (!game.players.find(p => p.name === ws.playerName)) {
        send(ws, 'start_game', { error: true, errorText: 'Not in game' });
        return;
      }

      game.shipsPositions = shipsPositions;
      game.state = 'started';

      game.players.forEach(({ name }) => {
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN && client.playerName === name) {
            send(client, 'start_game', { gameId, shipsPositions });
          }
        });
      });

      return;
    }

    send(ws, 'error', { error: true, errorText: 'Unknown command' });

  });
});

console.log("✅ WebSocket server started on port 3000");
