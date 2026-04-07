import type { FeishuMessageEvent } from '../types';
import type { RelayKnownBot } from './types';
import { registerRelayBot, registerRelayHandler, unregisterRelayHandler, getKnownRelayBots, getRelayHandler } from './runtime';
import { findMentionedRelayTargets } from './registry';
import { buildSyntheticRelayEvent } from './synthetic-event';
import { getRelayDepth, runInRelayContext } from './relay-async-context';
import { inferMentionsFromText } from './mention-inference';

const MAX_RELAY_DEPTH = 20;

/**
 * 注册一个 bot 到 relay 系统。返回注销函数，在 bot 停止时调用。
 *
 * agent-service 在 FeishuClientManager.startClient() 中调用，
 * 无需在 createRuntime 中维护额外的注册逻辑。
 */
export function registerBotForRelay(params: {
  accountId: string;
  appId: string;
  botOpenId?: string;
  botName: string;
  onRelayEvent: (event: FeishuMessageEvent) => Promise<void>;
}): () => void {
  registerRelayBot({ accountId: params.accountId, appId: params.appId, botOpenId: params.botOpenId, botName: params.botName });
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
  sourceAppId: string;
  chatId: string;
  sentMessageId?: string;
  text: string;
  messageType?: string;
}): Promise<void> {
  if (!params.sourceAppId) return;
  const currentRelayDepth = getRelayDepth();
  if (currentRelayDepth >= MAX_RELAY_DEPTH) return;

  const knownBots = getKnownRelayBots();
  if (knownBots.size === 0) return;
  const sourceBot = knownBots.get(params.sourceAppId);

  const mentions = inferMentionsFromText(params.text, knownBots);
  const relayTargets = findMentionedRelayTargets({ mentions, knownBots })
    .filter((target) => target.openId !== params.sourceAppId);

  for (const target of relayTargets) {
    const handler = getRelayHandler(target.accountId);
    if (!handler) continue;
    const targetBot = knownBots.get(target.openId);
    const targetAppId = targetBot?.appId ?? target.openId;

    const event = buildSyntheticRelayEvent({
      sourceBotAppId: params.sourceAppId,
      targetBotAppId: targetAppId,
      sourceBotOpenId: sourceBot?.botOpenId,
      targetBotOpenId: targetBot?.botOpenId,
      chatId: params.chatId,
      messageId: params.sentMessageId ?? `ts:${Date.now()}`,
      relayDepth: currentRelayDepth + 1,
      content: JSON.stringify({ text: params.text }),
      messageType: params.messageType ?? 'text',
      mentions: mentions.map((mention) => ({
        key: mention.key,
        mentioned_type: 'bot',
        bot_info: { app_id: knownBots.get(mention.openId)?.appId ?? mention.openId },
        id: { open_id: knownBots.get(mention.openId)?.botOpenId ?? mention.openId },
        name: mention.name,
      })),
    });

    await runInRelayContext(currentRelayDepth + 1, () => handler(event));
  }
}
