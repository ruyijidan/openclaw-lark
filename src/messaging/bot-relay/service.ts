import type { FeishuMessageEvent } from '../types';
import type { RelayKnownBot } from './types';
import { findMentionedRelayTargets } from './registry';
import { buildSyntheticRelayEvent } from './synthetic-event';
import { isRelayContext, runInRelayContext } from './relay-async-context';
import { inferMentionsFromText } from './mention-inference';

export interface BotRelayServiceConfig {
  resolveBots: () => Array<{ accountId: string; botOpenId: string; botName: string }>;
  inject: (targetAccountId: string, event: FeishuMessageEvent) => Promise<void>;
}

export class BotRelayService {
  constructor(private readonly config: BotRelayServiceConfig) {}

  async afterSend(params: {
    sourceAccountId: string;
    sourceBotOpenId: string;
    chatId: string;
    sentMessageId: string;
    threadId?: string;
    text: string;
    messageType: string;
  }): Promise<void> {
    if (isRelayContext()) return;
    if (!params.sourceBotOpenId) return;

    const bots = this.config.resolveBots();
    if (bots.length === 0) return;

    const knownBots = new Map<string, RelayKnownBot>(
      bots.map((b) => [b.botOpenId, { accountId: b.accountId, botOpenId: b.botOpenId, botName: b.botName }]),
    );

    const mentions = inferMentionsFromText(params.text, knownBots);
    const relayTargets = findMentionedRelayTargets({ mentions, knownBots })
      .filter((target) => target.openId !== params.sourceBotOpenId);

    for (const target of relayTargets) {
      const event = buildSyntheticRelayEvent({
        sourceBotOpenId: params.sourceBotOpenId,
        targetBotOpenId: target.openId,
        chatId: params.chatId,
        threadId: params.threadId,
        messageId: params.sentMessageId,
        content: JSON.stringify({ text: params.text }),
        messageType: params.messageType,
        mentions: mentions.map((mention) => ({
          key: mention.key,
          id: { open_id: mention.openId },
          name: mention.name,
        })),
      });

      await runInRelayContext(() => this.config.inject(target.accountId, event));
    }
  }
}
