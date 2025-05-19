import { httpServer } from './src/http_server/index';
import './src/ws_server/index';

const HTTP_PORT = 8181;

httpServer.listen(HTTP_PORT, () => {
  console.log(`✅ Static HTTP server running at http://localhost:${HTTP_PORT}/`);
});
