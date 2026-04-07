import type { FeishuMessageEvent } from '../types';
import type { RelayKnownBot } from './types';
import { findMentionedRelayTargets } from './registry';
import { buildSyntheticRelayEvent } from './synthetic-event';
import { getRelayDepth, runInRelayContext } from './relay-async-context';
import { inferMentionsFromText } from './mention-inference';

const MAX_RELAY_DEPTH = 20;

export interface BotRelayServiceConfig {
  resolveBots: () => Array<{ accountId: string; appId?: string; botOpenId?: string; botName: string }>;
  inject: (targetAccountId: string, event: FeishuMessageEvent) => Promise<void>;
}

export class BotRelayService {
  constructor(private readonly config: BotRelayServiceConfig) {}

  async afterSend(params: {
    sourceAccountId: string;
    sourceBotAppId: string;
    sourceBotOpenId?: string;
    chatId: string;
    sentMessageId: string;
    threadId?: string;
    text: string;
    messageType: string;
  }): Promise<void> {
    if (!params.sourceBotAppId) return;
    const currentRelayDepth = getRelayDepth();
    if (currentRelayDepth >= MAX_RELAY_DEPTH) return;

    const bots = this.config.resolveBots();
    if (bots.length === 0) return;

    const knownBots = new Map<string, RelayKnownBot>(
      bots
        .map((b): [string, RelayKnownBot] | null => {
          const appId = b.appId ?? b.botOpenId;
          if (!appId) return null;
          return [appId, { accountId: b.accountId, appId, botOpenId: b.botOpenId, botName: b.botName }];
        })
        .filter((item): item is [string, RelayKnownBot] => Boolean(item)),
    );

    const mentions = inferMentionsFromText(params.text, knownBots);
    const relayTargets = findMentionedRelayTargets({ mentions, knownBots })
      .filter((target) => target.openId !== params.sourceBotAppId);

    for (const target of relayTargets) {
      const targetBot = knownBots.get(target.openId);
      const event = buildSyntheticRelayEvent({
        sourceBotAppId: params.sourceBotAppId,
        targetBotAppId: targetBot?.appId ?? target.openId,
        sourceBotOpenId: params.sourceBotOpenId,
        targetBotOpenId: targetBot?.botOpenId,
        chatId: params.chatId,
        threadId: params.threadId,
        messageId: params.sentMessageId,
        relayDepth: currentRelayDepth + 1,
        content: JSON.stringify({ text: params.text }),
        messageType: params.messageType,
        mentions: mentions.map((mention) => ({
          key: mention.key,
          mentioned_type: 'bot',
          bot_info: { app_id: knownBots.get(mention.openId)?.appId ?? mention.openId },
          id: { open_id: knownBots.get(mention.openId)?.botOpenId ?? mention.openId },
          name: mention.name,
        })),
      });

      await runInRelayContext(currentRelayDepth + 1, () => this.config.inject(target.accountId, event));
    }
  }
}
