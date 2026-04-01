import { AsyncLocalStorage } from 'node:async_hooks';

interface RelayAsyncContext {
  relayDepth: number;
}

const relayAsyncStorage = new AsyncLocalStorage<RelayAsyncContext>();

export function runInRelayContext<T>(relayDepth: number, fn: () => T): T {
  return relayAsyncStorage.run({ relayDepth }, fn);
}

export function isRelayContext(): boolean {
  return (relayAsyncStorage.getStore()?.relayDepth ?? 0) > 0;
}

export function getRelayDepth(): number {
  return relayAsyncStorage.getStore()?.relayDepth ?? 0;
}
