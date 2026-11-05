import { TUNING } from '../shared/content';
export interface Pose { x: number; y: number; hull: number; turret: number }
type Snapshot = { tick: number; pose: Pose; received: number };
/** Presentation-only, one-tick delay. Never extrapolates authoritative collision state. */
export class PoseBuffer {
  private previous?: Snapshot;
  private latest?: Snapshot;
  push(tick: number, pose: Pose, now: number): void {
    if (this.latest && tick <= this.latest.tick) return;
    this.previous = this.latest && now - this.latest.received < 250 && Math.hypot(pose.x-this.latest.pose.x,pose.y-this.latest.pose.y)<180 ? this.latest : undefined;
    this.latest = { tick, pose: { ...pose }, received: now };
  }
  sample(now: number): Pose | undefined {
    const latest = this.latest, previous = this.previous;
    if (!latest) return;
    if (!previous) return { ...latest.pose };
    const duration = (latest.tick - previous.tick) * 1000 / TUNING.tickRate;
    const alpha = Math.max(0, Math.min(1, (now - latest.received) / duration));
    const lerp = (a: number, b: number) => a + (b - a) * alpha;
    const angle = (a: number, b: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * alpha;
    return { x: lerp(previous.pose.x, latest.pose.x), y: lerp(previous.pose.y, latest.pose.y), hull: angle(previous.pose.hull, latest.pose.hull), turret: angle(previous.pose.turret, latest.pose.turret) };
  }
}
