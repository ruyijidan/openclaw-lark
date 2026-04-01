import { describe, expect, it } from 'vitest';

import { mentionedBot } from '../src/messaging/inbound/mention.ts';
import { buildSyntheticRelayEvent } from '../src/messaging/bot-relay/synthetic-event.ts';
import type { MessageContext } from '../src/messaging/types.ts';

function toMessageContext(
  event: ReturnType<typeof buildSyntheticRelayEvent>,
  botOpenId: string,
): MessageContext {
  return {
    chatId: event.message.chat_id,
    messageId: event.message.message_id,
    senderId: event.sender.sender_id.open_id ?? '',
    chatType: event.message.chat_type,
    content: event.message.content,
    contentType: event.message.message_type,
    resources: [],
    mentions: (event.message.mentions ?? []).map((mention) => ({
      key: mention.key,
      openId: mention.id.open_id ?? '',
      name: mention.name,
      isBot: mention.id.open_id === botOpenId,
    })),
    threadId: event.message.thread_id,
    rawMessage: event.message,
    rawSender: event.sender,
    mentionAll: false,
  };
}

describe('bot relay pipeline', () => {
  it('synthetic relay event still marks the target bot as mentioned', async () => {
    const event = buildSyntheticRelayEvent({
      sourceBotOpenId: 'ou_bot_a',
      targetBotOpenId: 'ou_bot_b',
      chatId: 'oc_group_1',
      messageId: 'om_sent_3',
      content: JSON.stringify({ text: '@Bot B hello' }),
      messageType: 'text',
      mentions: [{ key: '@_user_1', id: { open_id: 'ou_bot_b' }, name: 'Bot B' }],
    });

    const ctx = toMessageContext(event, 'ou_bot_b');

    expect(mentionedBot(ctx)).toBe(true);
  });

  it('synthetic relay event without target mention does not bypass mention logic', () => {
    const event = buildSyntheticRelayEvent({
      sourceBotOpenId: 'ou_bot_a',
      targetBotOpenId: 'ou_bot_b',
      chatId: 'oc_group_1',
      messageId: 'om_sent_4',
      content: JSON.stringify({ text: 'hello without mention' }),
      messageType: 'text',
      mentions: [],
    });

    const ctx = toMessageContext(event, 'ou_bot_b');

    expect(mentionedBot(ctx)).toBe(false);
  });
});
