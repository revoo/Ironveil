# Ironveil

Ironveil is a top-down tank game focused on local solo play. The current milestone is **S5: battlefield art and tank readability**, awaiting owner playtest. Multiplayer is deferred. See the [current roadmap](docs/roadmap.md) and [S5 handoff](docs/s5.md).

## Run locally

Use Node.js 20 or newer:

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:5173/>. You and one bot face two enemy bots. Each enemy destroyed earns one team kill. First to 15 kills wins, or the leading team after seven minutes; ties get up to one minute of sudden death. Click the game to unlock audio. Use WASD to drive, mouse to aim, Space to charge/fire, right-click to cancel, Shift for slower movement, M to mute, **Q to deploy smoke**, and Escape to open Settings and pause. Brush hides distant occupants; smoke blocks sight but not shells. Mud leaves temporary anonymous tracks; X markers are stale sightings and edge arcs are coarse sound cues. Pause, Restart match, and results/Play again controls are also available. Switching away from the page pauses solo.

Solo runs entirely on your device in a Worker. Settings provides difficulty presets, remappable keys, volume, text size, reduced motion and low effects. Guided training teaches the controls and stealth rules. Difficulty applies on restart; presets are initial baselines, not calibrated challenge levels. The [training range](http://127.0.0.1:5173/?range=1) remains available; T toggles its incoming-fire lane and R resets it.

## Offline solo

Run `npm run build`, then `npm run preview`, and open <http://127.0.0.1:4173/>. Wait for **Ready for offline solo** after the initial connected load. Cached solo can then start after closing/reopening the browser with networking disabled. Development mode does not cache the app. A first uncached offline visit cannot work.

Missing cached content prompts restoration when online. Updates wait until all old Ironveil tabs close; Settings shows an update notice. Settings are saved per browser origin, while matches restart on a new browser session.

## Verify locally

- `npm test`: simulation, collision, lifecycle, visibility, bots and navigation tests.
- `npm run validate:map`: content validation and all authored spawn-to-search-area routes.
- `npm run build`: strict TypeScript check and production build.
- `npx playwright install chromium`, then `npm run test:browser`: browser acceptance and real Worker replay checks.
- `npm run diagnostics:solo -- 100 normal`: seeded headless matches with an idle human.

`npm run dev:all` also starts the legacy Colyseus connection diagnostic on port 2567. That development server remains local-only and is not ready for deployment. Browser tests manage dev, the diagnostic server and a production preview separately. Offline acceptance includes a full browser-process restart; the production preview is built locally as part of the suite. If deliberately testing an existing development session, `PLAYWRIGHT_REUSE_SERVER=1` allows reuse.

CI is manually triggered for substantial checkpoints and release validation. Routine verification runs locally; pushes and pull requests do not start CI automatically.

Shared rules and content live in `shared/`; Phaser presentation and the solo Worker live in `client/`; the deferred Colyseus adapter lives in `server/`. Shared simulation has no browser, Phaser or transport dependencies. The [asset inventory](docs/assets.md) lists procedural placeholders and their licenses. See milestone reports for known limitations; automated checks do not establish game enjoyment.
