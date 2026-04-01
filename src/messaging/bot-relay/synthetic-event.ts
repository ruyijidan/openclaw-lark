import type { FeishuMessageEvent } from '../types';
import type { SyntheticRelayBuildParams } from './types';

export function buildSyntheticRelayEvent(params: SyntheticRelayBuildParams): FeishuMessageEvent {
  return {
    sender: {
      sender_id: { open_id: params.sourceBotOpenId },
      sender_type: 'app',
    },
    message: {
      message_id: `synthetic:bot-relay:${params.messageId}:${params.targetBotOpenId}`,
      chat_id: params.chatId,
      thread_id: params.threadId,
      chat_type: 'group',
      message_type: params.messageType,
      content: params.content,
      mentions: params.mentions,
    },
    __relay: {
      synthetic_source: 'bot-relay',
      relay_depth: 1,
      source_bot_open_id: params.sourceBotOpenId,
      target_bot_open_id: params.targetBotOpenId,
      source_message_id: params.messageId,
    },
  };
}
