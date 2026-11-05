export type Action = 'up' | 'down' | 'left' | 'right' | 'fire' | 'quiet' | 'smoke' | 'cancel' | 'pause' | 'restart' | 'mute' | 'scoreboard';
export interface Settings {
    muted: boolean;
    volume: number;
    musicVolume: number;
    textScale: number;
    reducedMotion: boolean;
    lowEffects: boolean;
    difficulty: 'easy' | 'normal' | 'hard';
    bindings: Record<Action, string>;
}
export function defaultSettings(): Settings { return { muted: false, volume: .5, musicVolume:.15, textScale: 1, reducedMotion: false, lowEffects: false, difficulty: 'normal', bindings: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', fire: 'Space', quiet: 'ShiftLeft', smoke: 'KeyQ', cancel: 'KeyC', pause: 'Escape', restart: 'KeyR', mute: 'KeyM',scoreboard:'Tab' } }; }
export function parseSettings(raw: string | null): Settings {
    const defaults = defaultSettings();
    let input: Record<string, unknown>;
    try {
        input = JSON.parse(raw ?? '{}');
        if (!input || typeof input !== 'object')
            return defaults;
    }
    catch {
        return defaults;
    }
    const clamp = (value: unknown, min: number, max: number, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
    const result = { ...defaults, muted: input.muted === true, volume: clamp(input.volume, 0, 1, defaults.volume),musicVolume:clamp(input.musicVolume,0,1,defaults.musicVolume), textScale: clamp(input.textScale, 1, 1.5, 1), reducedMotion: input.reducedMotion === true, lowEffects: input.lowEffects === true, difficulty: ['easy', 'normal', 'hard'].includes(String(input.difficulty)) ? input.difficulty as Settings['difficulty'] : 'normal' };
    const candidate = { ...defaults.bindings };
    if (input.bindings && typeof input.bindings === 'object')
        for (const action of Object.keys(candidate) as Action[]) {
            const code = (input.bindings as Record<string, unknown>)[action];
            if (typeof code === 'string' && /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Tab|ShiftLeft|ShiftRight|ControlLeft|AltLeft|Escape|Enter|Backspace)$/.test(code))
                candidate[action] = code;
        }
    if (new Set(Object.values(candidate).map(code => candidate.quiet === 'ShiftLeft' && code === 'ShiftRight' ? 'ShiftLeft' : code)).size === Object.values(candidate).length)
        result.bindings = candidate;
    return result;
}
export class Controls {
    private held = new Set<string>();
    constructor(public bindings: Settings['bindings']) { }
    private code(code: string): string { return code === 'ShiftRight' && this.bindings.quiet === 'ShiftLeft' ? 'ShiftLeft' : code; }
    down(raw: string, repeat: boolean): string[] { const code = this.code(raw); if (repeat || this.held.has(code))
        return []; const entry = (Object.entries(this.bindings) as [
        Action,
        string
    ][]).find(([, value]) => value === code); if (!entry)
        return []; this.held.add(code); return entry[0] === 'fire' ? ['press'] : ['smoke', 'cancel', 'pause', 'restart', 'mute','scoreboard'].includes(entry[0]) ? [entry[0]] : []; }
    up(raw: string): string[] { const code = this.code(raw), was = this.held.delete(code); return was && code === this.bindings.fire ? ['release'] : was&&code===this.bindings.scoreboard?['scoreboard-close']:[]; }
    clear(): void { this.held.clear(); }
    drive(aim: number) { const on = (action: Action) => this.held.has(this.bindings[action]); return { x: Number(on('right')) - Number(on('left')), y: Number(on('down')) - Number(on('up')), aim, silent: on('quiet') }; }
}
export function readSettings(): Settings { try {
    return parseSettings(localStorage.getItem('ironveil-settings-v1'));
}
catch {
    return defaultSettings();
} }
export function saveSettings(settings: Settings): boolean { try {
    localStorage.setItem('ironveil-settings-v1', JSON.stringify(settings));
    return true;
}
catch {
    return false;
} }
export function keyLabel(code: string): string { return code.replace('Key', '').replace('Digit', '').replace('Left', '').replace('Right', '').replace('Arrow', ''); }
