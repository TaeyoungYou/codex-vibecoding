import { EventEmitter } from 'node:events';
import { afterEach, test, expect, vi } from 'vitest';
import { ChangeBus, listenForChanges } from '../server/changes.js';

afterEach(() => vi.useRealTimers());
test('LISTEN 연결과 재연결은 일정 내용 없는 알림만 전달하고 종료 시 연결을 닫는다', async () => {
  vi.useFakeTimers();
  const clients = [];
  const createClient = () => {
    const client = Object.assign(new EventEmitter(), { connect: vi.fn(async () => {}), query: vi.fn(async () => {}), end: vi.fn(async () => {}) });
    clients.push(client); return client;
  };
  const bus = new ChangeBus();
  const changed = vi.fn(); bus.on('change', changed);
  const stop = listenForChanges(createClient, bus);
  await vi.advanceTimersByTimeAsync(0);
  expect(bus.status).toBe('connected');
  expect(clients[0].query).toHaveBeenCalledWith('LISTEN calendar_events_changed');
  clients[0].emit('notification', { channel: 'calendar_events_changed', payload: 'private content' });
  clients[0].emit('notification', { channel: 'other', payload: 'changed' });
  expect(changed).not.toHaveBeenCalled();
  clients[0].emit('notification', { channel: 'calendar_events_changed', payload: 'changed' });
  expect(changed).toHaveBeenCalledTimes(1);
  clients[0].emit('error', new Error('fixture connection failure'));
  expect(bus.status).toBe('disconnected');
  await vi.advanceTimersByTimeAsync(1000);
  expect(clients).toHaveLength(2);
  expect(bus.status).toBe('connected');
  clients[0].emit('error', new Error('stale disconnected client'));
  clients[0].emit('notification', { channel: 'calendar_events_changed', payload: 'changed' });
  expect(changed).toHaveBeenCalledTimes(1);
  expect(bus.status).toBe('connected');
  await stop();
  expect(clients[1].end).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(30000);
  expect(clients).toHaveLength(2);
});
