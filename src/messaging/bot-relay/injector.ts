import { handleMessageEvent } from '../../channel/event-handlers';
import { runInRelayContext } from './relay-async-context';
import type { RelayInjectionParams } from './types';

export async function injectSyntheticRelayEvent(params: RelayInjectionParams): Promise<void> {
  await runInRelayContext(params.event.__relay?.relay_depth ?? 1, () => handleMessageEvent(params.ctx, params.event));
}
