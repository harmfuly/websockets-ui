import WebSocket, { WebSocketServer } from 'ws';

let players = [];

const wss = new WebSocketServer({ port: 3000 });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    console.log("Received:", message.toString());

    try {
      const parsed = JSON.parse(message.toString());

      if (typeof parsed.data === 'string') {
        try {
          parsed.data = JSON.parse(parsed.data);
        } catch (e) {
          console.error('Invalid nested data JSON format');
          return;
        }
      }

      if (typeof parsed.type === 'reg') {
        const { name, password } = parsed.data;

        let player = players.find(p => p.name === name);

        if (!player) {
          player = { name, password, wins: 0 };
          players.push(player);
        } else if (player.password !== password) {
          ws.send(JSON.stringify({
            type: 'reg',
            data: {
              name,
              password,
              error: true,
              errorText: "Wrong password"
            },
            id: 0
          }));
          return;
        }

        ws.send(JSON.stringify({
          type: 'reg',
          data: {
            name,
            index: players.indexOf(player),
            error: false,
            errorText: ""
          },
          id: 0
        }));

        const winnersList = players.map(p => ({
          name: p.name,
          wins: p.wins
        }));

        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'update_winners',
              data: winnersList,
              id: 0
            }));
          }
        });
      }

    } catch (err) {
      console.error("Failed to handle message:", err);
    }
  });
});

console.log("✅ WebSocket server started on port 3000");
