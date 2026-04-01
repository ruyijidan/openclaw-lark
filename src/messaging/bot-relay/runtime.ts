import type { MonitorContext } from '../../channel/types';
import type { FeishuMessageEvent } from '../types';
import type { RelayKnownBot } from './types';

const knownBotsByOpenId = new Map<string, RelayKnownBot>();
const contextsByAccountId = new Map<string, MonitorContext>();
const relayHandlersByAccountId = new Map<string, (event: FeishuMessageEvent) => Promise<void>>();

export function registerRelayBot(params: RelayKnownBot): void {
  if (!params.botOpenId) return;
  knownBotsByOpenId.set(params.botOpenId, params);
}

export function registerRelayContext(accountId: string, ctx: MonitorContext): void {
  contextsByAccountId.set(accountId, ctx);
}

export function getKnownRelayBots(): Map<string, RelayKnownBot> {
  return new Map(knownBotsByOpenId);
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
  knownBotsByOpenId.clear();
  contextsByAccountId.clear();
  relayHandlersByAccountId.clear();
}
