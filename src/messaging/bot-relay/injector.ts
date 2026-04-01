import { handleMessageEvent } from '../../channel/event-handlers';
import { runInRelayContext } from './relay-async-context';
import type { RelayInjectionParams } from './types';

export async function injectSyntheticRelayEvent(params: RelayInjectionParams): Promise<void> {
  await runInRelayContext(() => handleMessageEvent(params.ctx, params.event));
}
