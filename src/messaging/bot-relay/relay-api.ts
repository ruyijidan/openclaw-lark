import type { FeishuMessageEvent } from '../types';
import type { RelayKnownBot } from './types';
import { registerRelayBot, registerRelayHandler, unregisterRelayHandler, getKnownRelayBots, getRelayHandler } from './runtime';
import { findMentionedRelayTargets } from './registry';
import { buildSyntheticRelayEvent } from './synthetic-event';
import { isRelayContext, runInRelayContext } from './relay-async-context';
import { inferMentionsFromText } from './mention-inference';

/**
 * 注册一个 bot 到 relay 系统。返回注销函数，在 bot 停止时调用。
 *
 * agent-service 在 FeishuClientManager.startClient() 中调用，
 * 无需在 createRuntime 中维护额外的注册逻辑。
 */
export function registerBotForRelay(params: {
  accountId: string;
  botOpenId: string;
  botName: string;
  onRelayEvent: (event: FeishuMessageEvent) => Promise<void>;
}): () => void {
  registerRelayBot({ accountId: params.accountId, botOpenId: params.botOpenId, botName: params.botName });
  registerRelayHandler(params.accountId, params.onRelayEvent);
  return () => unregisterRelayHandler(params.accountId);
}

/**
 * 发送消息后调用，检测文本中的 @bot mention 并向目标 bot 注入合成事件。
 *
 * 循环防护由内部 AsyncLocalStorage 上下文自动处理。
 */
export async function relayAfterSend(params: {
  accountId: string;
  sourceBotOpenId: string;
  chatId: string;
  sentMessageId?: string;
  text: string;
  messageType?: string;
}): Promise<void> {
  if (isRelayContext()) return;
  if (!params.sourceBotOpenId) return;

  const knownBots = getKnownRelayBots();
  if (knownBots.size === 0) return;

  const mentions = inferMentionsFromText(params.text, knownBots);
  const relayTargets = findMentionedRelayTargets({ mentions, knownBots })
    .filter((target) => target.openId !== params.sourceBotOpenId);

  for (const target of relayTargets) {
    const handler = getRelayHandler(target.accountId);
    if (!handler) continue;

    const event = buildSyntheticRelayEvent({
      sourceBotOpenId: params.sourceBotOpenId,
      targetBotOpenId: target.openId,
      chatId: params.chatId,
      messageId: params.sentMessageId ?? `ts:${Date.now()}`,
      content: JSON.stringify({ text: params.text }),
      messageType: params.messageType ?? 'text',
      mentions: mentions.map((mention) => ({
        key: mention.key,
        id: { open_id: mention.openId },
        name: mention.name,
      })),
    });

    await runInRelayContext(() => handler(event));
  }
}
