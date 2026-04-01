import { AsyncLocalStorage } from 'node:async_hooks';

interface RelayAsyncContext {
  alreadySynthetic: boolean;
}

const relayAsyncStorage = new AsyncLocalStorage<RelayAsyncContext>();

export function runInRelayContext<T>(fn: () => T): T {
  return relayAsyncStorage.run({ alreadySynthetic: true }, fn);
}

export function isRelayContext(): boolean {
  return relayAsyncStorage.getStore()?.alreadySynthetic ?? false;
}
