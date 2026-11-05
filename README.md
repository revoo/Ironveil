# Ironveil

Ironveil is a top-down tank game focused on local solo play. The current milestone is **S2: Relay Yard stealth and encounter loop**, awaiting owner playtest. Multiplayer is deferred. See the [current roadmap](docs/roadmap.md) and [S2 handoff](docs/s2.md).

## Run locally

Use Node.js 20 or newer:

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:5173/>. You and one bot face two enemy bots. Stand in the relay ring to score; both teams present means no scoring. Click the game to unlock audio. Use WASD to drive, mouse to aim, Space to charge/fire, right-click to cancel, Shift for slower movement, M to mute, and Escape to pause, and **Q to deploy smoke**. Brush hides distant occupants; smoke blocks sight but not shells. Mud leaves temporary anonymous tracks; X markers are stale sightings and edge arcs are coarse sound cues. Pause, Restart match, and results/Play again controls are also available. Switching away from the page pauses solo.

Solo runs entirely on your device in a Worker and needs no game server. Offline asset caching has not been added yet. The [training range](http://127.0.0.1:5173/?range=1) remains available; T toggles its incoming-fire lane and R resets it.

## Verify locally

- `npm test`: simulation, collision, lifecycle, visibility, bots and navigation tests.
- `npm run validate:map`: content validation and all spawn-to-relay routes.
- `npm run build`: strict TypeScript check and production build.
- `npx playwright install chromium`, then `npm run test:browser`: browser acceptance and real Worker replay checks.
- `npm run diagnostics:solo -- 100`: seeded headless matches with an idle human.

`npm run dev:all` also starts the legacy Colyseus connection diagnostic on port 2567. That development server remains local-only and is not ready for deployment. Browser tests start both adapters to retain the earlier foundation checks. If deliberately testing an existing development session, `PLAYWRIGHT_REUSE_SERVER=1` allows reuse.

CI is manually triggered for substantial checkpoints and release validation. Routine verification runs locally; pushes and pull requests do not start CI automatically.

Shared rules and content live in `shared/`; Phaser presentation and the solo Worker live in `client/`; the deferred Colyseus adapter lives in `server/`. Shared simulation has no browser, Phaser or transport dependencies. The [asset inventory](docs/assets.md) lists procedural placeholders and their licenses. See milestone reports for known limitations; automated checks do not establish game enjoyment.
