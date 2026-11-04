import { createServer } from 'node:http';
import { Server, Room, type Client } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { currentHandshake, versionsMatch } from '../shared/protocol';
import { Simulation } from '../shared/sim';
import { trainingMap, validateMap } from '../shared/content';
validateMap(trainingMap);
class FoundationRoom extends Room {
  maxClients = 2;
  private sim = new Simulation();
  onCreate(): void { this.setSimulationInterval(() => this.sim.step(), 1000 / 30); }
  onAuth(_client: Client, options: unknown): boolean { return versionsMatch(options); }
  onJoin(client: Client): void { client.send('welcome', { ...currentHandshake(), tick: this.sim.tick }); }
}
const httpServer = createServer((_req, res) => { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('Ironveil foundation server\n'); });
const gameServer = new Server({ transport: new WebSocketTransport({ server: httpServer }) });
gameServer.define('foundation', FoundationRoom);
const port = Number(process.env.PORT ?? 2567);
gameServer.listen(port).then(() => console.log(`Ironveil foundation server listening on ${port}`));
