import type { FeishuMessageEvent, MentionInfo } from '../types';
import { findMentionedRelayTargets } from './registry';
import { buildSyntheticRelayEvent } from './synthetic-event';
import { getRelayDepth } from './relay-async-context';
import { inferMentionsFromText } from './mention-inference';
import type { RelayKnownBot } from './types';

const MAX_RELAY_DEPTH = 20;

export async function maybeRelayBotMentionsAfterSend(params: {
  sourceAccountId: string;
  sourceBotOpenId: string;
  chatId: string;
  sentMessageId: string;
  threadId?: string;
  text: string;
  messageType: string;
  mentions?: MentionInfo[];
  knownBots: Map<string, RelayKnownBot>;
  alreadySynthetic: boolean;
  inject: (params: { targetAccountId: string; event: FeishuMessageEvent }) => Promise<void>;
}): Promise<void> {
  if (!params.sourceBotOpenId) return;
  const currentRelayDepth = Math.max(getRelayDepth(), params.alreadySynthetic ? 1 : 0);
  if (currentRelayDepth >= MAX_RELAY_DEPTH) return;

  const mentions =
    params.mentions && params.mentions.length > 0
      ? params.mentions
      : inferMentionsFromText(params.text, params.knownBots);

  const relayTargets = findMentionedRelayTargets({
    mentions,
    knownBots: params.knownBots,
  }).filter((target) => target.openId !== params.sourceBotOpenId);

  for (const target of relayTargets) {
    const event = buildSyntheticRelayEvent({
      sourceBotOpenId: params.sourceBotOpenId,
      targetBotOpenId: target.openId,
      chatId: params.chatId,
      threadId: params.threadId,
      messageId: params.sentMessageId,
      relayDepth: currentRelayDepth + 1,
      content: JSON.stringify({ text: params.text }),
      messageType: params.messageType,
      mentions: mentions.map((mention) => ({
        key: mention.key,
        id: { open_id: mention.openId },
        name: mention.name,
      })),
    });

    await params.inject({
      targetAccountId: target.accountId,
      event,
    });
  }
}
