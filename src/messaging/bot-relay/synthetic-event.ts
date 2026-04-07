import type { FeishuMessageEvent } from '../types';
import type { SyntheticRelayBuildParams } from './types';

export function buildSyntheticRelayEvent(params: SyntheticRelayBuildParams): FeishuMessageEvent {
  const now = Date.now().toString();
  return {
    schema: '2.0',
    event_id: `synthetic:bot-relay:${params.messageId}:${params.targetBotAppId}`,
    create_time: now,
    event_type: 'im.message.receive_v1',
    app_id: params.targetBotAppId,
    sender: {
      sender_id: { open_id: params.sourceBotOpenId },
      sender_type: 'user',
    },
    message: {
      message_id: `synthetic:bot-relay:${params.messageId}:${params.targetBotAppId}`,
      chat_id: params.chatId,
      thread_id: params.threadId,
      chat_type: 'group',
      message_type: params.messageType,
      content: params.content,
      create_time: now,
      update_time: now,
      mentions: params.mentions.map((mention) => ({
        ...mention,
        mentioned_type: mention.mentioned_type ?? 'bot',
        bot_info: {
          ...mention.bot_info,
          app_id: mention.bot_info?.app_id ?? params.targetBotAppId,
        },
      })),
    },
    __relay: {
      synthetic_source: 'bot-relay',
      relay_depth: params.relayDepth,
      source_bot_app_id: params.sourceBotAppId,
      target_bot_app_id: params.targetBotAppId,
      source_bot_open_id: params.sourceBotOpenId,
      target_bot_open_id: params.targetBotOpenId,
      source_message_id: params.messageId,
    },
  };
}
