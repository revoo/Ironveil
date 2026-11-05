# Ironveil

Ironveil is a top-down multiplayer tank game in early development. The current build is an early cannon laboratory, not yet a complete game.

## Run locally

Install Node.js 20 or newer, then:

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:5173/>. The page should show a movement playground, a Worker simulation at tick 30, and a connected development server. Click the game and use WASD to drive, the mouse to aim, and Shift for silent running. Hold/release Space to charge/fire; right mouse cancels. Orange targets show damage and reset after destruction; the southern target patrols. Press T to toggle the marked incoming-fire test lane and R to reset the range and your HP. See [M2 status](docs/m2.md) for remaining combat work. Stop both processes with Ctrl+C. The development server listens on port 2567; `VITE_SERVER_URL` can override the client endpoint. This server is for local development only and is not ready for public deployment.

Other commands: `npm test`, `npm run validate:map`, and `npm run build`. For browser tests, run `npx playwright install chromium` once, then `npm run test:browser`.

CI is manually triggered from GitHub Actions for substantial checkpoints and release validation. Routine verification runs locally; pushes and pull requests do not start CI automatically.

Shared rules and content live in `shared/`; the Phaser client and Worker live in `client/`; the Colyseus adapter lives in `server/`. The shared code has no browser, Phaser, or transport dependencies. See [the M0 report](docs/m0.md) for decisions, verification, and outstanding work.
