export function setupOffline(): void {
    const status = document.querySelector<HTMLElement>('#offline-status')!, repair = document.querySelector<HTMLButtonElement>('#repair-offline')!;
    if (!import.meta.env.PROD) {
        status.textContent = 'Offline caching is available in the production preview.';
        return;
    }
    if (!('serviceWorker' in navigator)) {
        status.textContent = 'This browser does not support offline solo.';
        return;
    }
    let registration: ServiceWorkerRegistration;
    const query = async (type = 'STATUS') => { const worker = registration?.active; if (!worker)
        return; const data = await new Promise<{
        ready: boolean;
        version: string;
        error?: string;
    }>((resolve, reject) => { const channel = new MessageChannel(); const timeout = setTimeout(() => reject(new Error('Offline check timed out')), 5000); channel.port1.onmessage = e => { clearTimeout(timeout); resolve(e.data); channel.port1.close(); }; worker.postMessage({ type }, [channel.port2]); }); status.dataset.ready = String(data.ready); status.dataset.version = data.version; status.textContent = data.ready ? 'Ready for offline solo' : data.error ?? 'Offline assets are missing. Connect and restore them before offline play.'; repair.hidden = data.ready; };
    repair.onclick = () => { status.textContent = 'Restoring offline assets…'; void query('REPAIR').catch(() => { status.textContent = 'A connection is needed to restore offline assets.'; }); };
    status.textContent = 'Preparing offline solo…';
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(async (reg) => { registration = reg; const waiting = () => { const notice = document.querySelector<HTMLElement>('#update-notice'); if (notice)
        notice.hidden = !registration.waiting; }; waiting(); reg.addEventListener('updatefound', () => { reg.installing?.addEventListener('statechange', waiting); }); await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Offline setup timed out')), 12000))]); await query(); navigator.serviceWorker.addEventListener('controllerchange', () => void query()); window.addEventListener('offline', () => void query()); window.addEventListener('online', () => void query()); document.querySelector('#settings')?.addEventListener('click', () => { waiting(); void query(); }); }).catch(() => { status.dataset.ready = 'false'; status.textContent = 'Offline setup failed. Reconnect and reload to retry.'; });
}
