import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { IncomingMessage, ServerResponse } from 'http';

export const httpServer = http.createServer((req: IncomingMessage, res: ServerResponse) => {
  const __dirname = path.resolve();
  const urlPath = req.url === '/' ? '/front/index.html' : `/front${req.url}`;
  const filePath = path.join(__dirname, urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'File not found' }));
      return;
    }

    res.writeHead(200);
    res.end(data);
  });
});
