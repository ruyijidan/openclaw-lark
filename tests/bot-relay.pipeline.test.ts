import { afterEach, describe, expect, it } from 'vitest';

import { registerBotForRelay, relayAfterSend } from '../src/messaging/bot-relay/relay-api.ts';
import { clearRelayRuntimeState } from '../src/messaging/bot-relay/runtime.ts';
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
  afterEach(() => {
    clearRelayRuntimeState();
  });

  it('synthetic relay event still marks the target bot as mentioned', async () => {
    const event = buildSyntheticRelayEvent({
      sourceBotAppId: 'cli_bot_a',
      sourceBotOpenId: 'ou_bot_a',
      targetBotAppId: 'cli_bot_b',
      targetBotOpenId: 'ou_bot_b',
      chatId: 'oc_group_1',
      messageId: 'om_sent_3',
      relayDepth: 1,
      content: JSON.stringify({ text: '@Bot B hello' }),
      messageType: 'text',
      mentions: [{ key: '@_user_1', id: { open_id: 'ou_bot_b' }, name: 'Bot B' }],
    });

    const ctx = toMessageContext(event, 'ou_bot_b');

    expect(mentionedBot(ctx)).toBe(true);
  });

  it('synthetic relay event without target mention does not bypass mention logic', () => {
    const event = buildSyntheticRelayEvent({
      sourceBotAppId: 'cli_bot_a',
      sourceBotOpenId: 'ou_bot_a',
      targetBotAppId: 'cli_bot_b',
      targetBotOpenId: 'ou_bot_b',
      chatId: 'oc_group_1',
      messageId: 'om_sent_4',
      relayDepth: 1,
      content: JSON.stringify({ text: 'hello without mention' }),
      messageType: 'text',
      mentions: [],
    });

    const ctx = toMessageContext(event, 'ou_bot_b');

    expect(mentionedBot(ctx)).toBe(false);
  });

  it('allows relayed replies to continue until the temporary depth cap of 20', async () => {
    const receivedByA: string[] = [];
    const receivedByB: string[] = [];

    registerBotForRelay({
      accountId: 'bot-a',
      appId: 'cli_bot_a',
      botOpenId: 'ou_bot_a',
      botName: 'Bot A',
      onRelayEvent: async (event) => {
        receivedByA.push(event.message.content);
        await relayAfterSend({
          accountId: 'bot-a',
          sourceAppId: 'cli_bot_a',
          chatId: event.message.chat_id,
          sentMessageId: 'om_reply_from_a',
          text: '@Bot B third hop continues',
          messageType: 'text',
        });
      },
    });
    registerBotForRelay({
      accountId: 'bot-b',
      appId: 'cli_bot_b',
      botOpenId: 'ou_bot_b',
      botName: 'Bot B',
      onRelayEvent: async (event) => {
        receivedByB.push(event.message.content);
        await relayAfterSend({
          accountId: 'bot-b',
          sourceAppId: 'cli_bot_b',
          chatId: event.message.chat_id,
          sentMessageId: 'om_reply_from_b',
          text: '@Bot A second hop works',
          messageType: 'text',
        });
      },
    });

    await relayAfterSend({
      accountId: 'bot-a',
      sourceAppId: 'cli_bot_a',
      chatId: 'oc_group_1',
      sentMessageId: 'om_initial',
      text: '@Bot B first hop works',
      messageType: 'text',
    });

    expect(receivedByB).toEqual([
      JSON.stringify({ text: '@Bot B first hop works' }),
      ...Array.from({ length: 9 }, () => JSON.stringify({ text: '@Bot B third hop continues' })),
    ]);
    expect(receivedByA).toEqual(
      Array.from({ length: 10 }, () => JSON.stringify({ text: '@Bot A second hop works' })),
    );
  });
});
