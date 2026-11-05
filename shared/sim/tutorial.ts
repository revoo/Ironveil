import type { SoloMatch } from './match';
/** Local-only authored lesson fixtures; no client-supplied transforms are accepted. */
export function configureLesson(match: SoloMatch, index: number): void {
    match.restart();
    match.botsEnabled = false;
    for (const a of match.actors.slice(1)) {
        a.hp = 0;
        a.respawn = 999999;
    }
    const positions = [{ x: 160, y: 272 }, { x: 160, y: 272 }, { x: 160, y: 272 }, { x: 300, y: 600 }, { x: 420, y: 580 }, { x: 360, y: 140 }, { x: 360, y: 220 }, { x: 400, y: 580 }, { x: match.zone.x, y: match.zone.y + 124 }];
    Object.assign(match.actors[0], positions[index] ?? positions[0], { vx: 0, vy: 0, speed: 0, protection: 0 });
    if (index === 2 || index === 3)
        Object.assign(match.actors[2], { hp: 100, respawn: 0, protection: 0, x: index === 2 ? 280 : 580, y: index === 2 ? 272 : 600 });
}
