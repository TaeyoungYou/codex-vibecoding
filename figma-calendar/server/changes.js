import { EventEmitter } from 'node:events';

export class ChangeBus extends EventEmitter {
  status = 'connecting';
  setStatus(status) { this.status = status; this.emit('status', status); }
  changed() { this.emit('change'); }
}

export function listenForChanges(createClient, bus) {
  let client;
  let timer;
  let stopped = false;
  let attempt = 0;
  let reconnecting = false;

  async function reconnect() {
    if (stopped || reconnecting) return;
    reconnecting = true;
    bus.setStatus('disconnected');
    const old = client;
    client = null;
    await old?.end().catch(() => {});
    if (!stopped) {
      timer = setTimeout(connect, Math.min(1000 * 2 ** attempt++, 30000));
      timer.unref();
    }
    reconnecting = false;
  }

  async function connect() {
    if (stopped) return;
    const next = createClient();
    client = next;
    next.on('error', () => { if (client === next) void reconnect(); });
    next.on('end', () => { if (client === next) void reconnect(); });
    next.on('notification', ({ channel, payload }) => {
      if (!stopped && client === next && channel === 'calendar_events_changed' && payload === 'changed') bus.changed();
    });
    try {
      await next.connect();
      await next.query('LISTEN calendar_events_changed');
      if (stopped || client !== next) { await next.end().catch(() => {}); return; }
      attempt = 0;
      bus.setStatus('connected');
    } catch { if (client === next) await reconnect(); }
  }

  void connect();
  return async () => {
    stopped = true;
    clearTimeout(timer);
    await client?.end().catch(() => {});
    bus.setStatus('disconnected');
  };
}
