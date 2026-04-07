import type { MonitorContext } from '../../channel/types';
import type { FeishuMessageEvent } from '../types';
import type { RelayKnownBot } from './types';

const knownBotsByAppId = new Map<string, RelayKnownBot>();
const contextsByAccountId = new Map<string, MonitorContext>();
const relayHandlersByAccountId = new Map<string, (event: FeishuMessageEvent) => Promise<void>>();

export function registerRelayBot(params: RelayKnownBot): void {
  const routeId = params.appId ?? params.botOpenId;
  if (!routeId) return;
  knownBotsByAppId.set(routeId, params);
}

export function registerRelayContext(accountId: string, ctx: MonitorContext): void {
  contextsByAccountId.set(accountId, ctx);
}

export function getKnownRelayBots(): Map<string, RelayKnownBot> {
  return new Map(knownBotsByAppId);
}

export function getRelayContext(accountId: string): MonitorContext | undefined {
  return contextsByAccountId.get(accountId);
}

export function registerRelayHandler(accountId: string, fn: (event: FeishuMessageEvent) => Promise<void>): void {
  relayHandlersByAccountId.set(accountId, fn);
}

export function unregisterRelayHandler(accountId: string): void {
  relayHandlersByAccountId.delete(accountId);
}

export function getRelayHandler(accountId: string): ((event: FeishuMessageEvent) => Promise<void>) | undefined {
  return relayHandlersByAccountId.get(accountId);
}

export function clearRelayRuntimeState(): void {
  knownBotsByAppId.clear();
  contextsByAccountId.clear();
  relayHandlersByAccountId.clear();
}
