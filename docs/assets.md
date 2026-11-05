# Asset and license inventory

| Asset | Source | License / status |
| --- | --- | --- |
| Terrain textures, brush foliage, wall panels, separate hull/turret sprites and team symbols | Original code-generated art in client/art.ts | Project MIT license; Selected solo V1 stylized art |
| Range target shapes, HUD, tutorial/settings UI, feedback rings | Original procedural Phaser graphics in client/main.ts | Project MIT license; presentation subject to playtest |
| Tap/full shot, impact, destruction, vent, engine, charge and smoke audio | Original deterministic PCM synthesis in client/audio.ts | Project MIT license; original synthesized solo audio |
| Training map, Tiled-compatible Relay Yard JSON/terrain atlas, solo relay/spawn layouts and tuning | Original project data | Project MIT license |
| Ambient music loop | Original deterministic 16-second PCM synthesis in client/audio.ts | Project MIT license; non-positional score |
| Smoke/fire/light textures, particle animation, normal maps, shadows, wreck silhouettes and vignette | Original code-generated art in client/fx-renderer.ts, client/lighting.ts and client/art.ts | Project MIT license; no external assets |
| EventEmitter3 | Phaser dependency, eventemitter3 5.x | MIT; license included in standalone package |
| Phaser | npm phaser 3.90.0 | MIT; bundled library, see dependency license |

No third-party art, fonts, recordings or music are included. The interface uses system fonts. Dependency license files remain in installed packages; release packaging must preserve required notices.

The standalone package includes the project LICENSE, PHASER-LICENSE.md and EVENTEMITTER3-LICENSE. The development-only Colyseus transport is pruned from the production client and is not packaged as a server dependency. No third-party music or recordings are included.
