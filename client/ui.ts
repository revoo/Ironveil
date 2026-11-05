import { defaultSettings, parseSettings, saveSettings, keyLabel, type Settings, type Action } from './settings';
export function mountSettings(current: () => Settings, apply: (s: Settings) => void, pause: () => void, onClose: () => void = () => { }): () => boolean {
    const dialog = document.createElement('dialog');
    dialog.id = 'settings-dialog';
    dialog.setAttribute('aria-label', 'Settings');
    dialog.innerHTML = `<form><h2>Settings</h2><p>Settings pause the match. Difficulty applies when you restart.</p><label>Difficulty <select name="difficulty" aria-label="Difficulty"><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option></select></label><label>Effects volume <input aria-label="Effects volume" name="volume" type="range" min="0" max="1" step="0.05"></label><label>Text size <select name="textScale" aria-label="Text size"><option value="1">100%</option><option value="1.25">125%</option><option value="1.5">150%</option></select></label><label><input type="checkbox" name="muted"> Mute audio</label><label><input type="checkbox" name="reducedMotion"> Reduced motion</label><label><input type="checkbox" name="lowEffects"> Low effects</label><fieldset><legend>Keyboard controls</legend><p>Select a field and press a key. Right-click always cancels too.</p><div id="binding-fields"></div></fieldset><p id="settings-error" role="alert"></p><button type="submit">Save settings</button> <button type="button" id="default-settings">Restore defaults</button> <button type="button" id="close-settings">Close settings</button><p id="update-notice" hidden>Update ready. Finish the match, close every Ironveil tab, then reopen to apply it.</p></form>`;
    document.body.append(dialog);
    const form = dialog.querySelector('form')!;
    const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
    const names: Record<Action, string> = { up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right', fire: 'Fire', quiet: 'Quiet movement', smoke: 'Smoke', cancel: 'Cancel charge', pause: 'Pause', restart: 'Restart', mute: 'Mute' };
    const container = dialog.querySelector('#binding-fields')!;
    for (const [action, name] of Object.entries(names)) {
        const label = document.createElement('label');
        label.textContent = name + ' key ';
        const input = document.createElement('input');
        input.name = 'binding-' + action;
        input.readOnly = true;
        input.setAttribute('aria-label', name + ' key');
        input.onkeydown = e => { e.preventDefault(); e.stopPropagation(); input.dataset.code = e.code; input.value = keyLabel(e.code); };
        label.append(input);
        container.append(label);
    }
    const fill = (s: Settings) => { for (const name of ['difficulty', 'volume', 'textScale'])
        field(name).value = String(s[name as keyof Settings]); for (const name of ['muted', 'lowEffects', 'reducedMotion'])
        (field(name) as HTMLInputElement).checked = !!s[name as keyof Settings]; for (const [action, code] of Object.entries(s.bindings)) {
        const input = field('binding-' + action);
        input.dataset.code = code;
        input.value = keyLabel(code);
    } };
    const error = dialog.querySelector('#settings-error')!;
    form.onsubmit = e => {
        e.preventDefault();
        const candidate = { ...current(), bindings: { ...current().bindings } };
        candidate.volume = Number(field('volume').value);
        candidate.textScale = Number(field('textScale').value);
        candidate.difficulty = field('difficulty').value as Settings['difficulty'];
        for (const name of ['muted', 'reducedMotion', 'lowEffects'] as const)
            candidate[name] = (field(name) as HTMLInputElement).checked;
        for (const action of Object.keys(candidate.bindings) as Action[])
            candidate.bindings[action] = field('binding-' + action).dataset.code!;
        const parsed = parseSettings(JSON.stringify(candidate));
        if (JSON.stringify(parsed.bindings) !== JSON.stringify(candidate.bindings)) {
            error.textContent = 'Choose supported, unique keys. Two actions cannot share a key.';
            return;
        }
        apply(parsed);
        error.textContent = saveSettings(parsed) ? 'Saved. Restart to apply difficulty.' : 'Applied for this session; browser storage is unavailable.';
    };
    dialog.querySelector<HTMLButtonElement>('#default-settings')!.onclick = () => { fill(defaultSettings()); error.textContent = 'Defaults loaded; save to apply.'; };
    dialog.querySelector<HTMLButtonElement>('#close-settings')!.onclick = () => dialog.close();
    dialog.addEventListener('close', onClose);
    document.querySelector<HTMLButtonElement>('#settings')!.onclick = () => { pause(); fill(current()); error.textContent = ''; dialog.showModal(); };
    return () => dialog.open;
}
