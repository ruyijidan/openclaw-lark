import { describe, expect, it } from 'vitest';

import { maybeRelayBotMentionsAfterSend } from '../src/messaging/bot-relay/outbound-hook.ts';

describe('maybeRelayBotMentionsAfterSend', () => {
  it('injects a synthetic event for known mentioned bots', async () => {
    const injected: string[] = [];

    await maybeRelayBotMentionsAfterSend({
      sourceAccountId: 'bot-a',
      sourceBotOpenId: 'ou_bot_a',
      chatId: 'oc_group_1',
      sentMessageId: 'om_sent_1',
      text: '@Bot B hello',
      mentions: [{ key: '@_user_1', openId: 'ou_bot_b', name: 'Bot B', isBot: true }],
      messageType: 'text',
      knownBots: new Map([['ou_bot_b', { accountId: 'bot-b', botOpenId: 'ou_bot_b', botName: 'Bot B' }]]),
      alreadySynthetic: false,
      inject: async ({ event }) => {
        injected.push(event.message.message_id);
      },
    });

    expect(injected.length).toBe(1);
  });

  it('skips relay when the outbound message originated from synthetic relay', async () => {
    let injectCalls = 0;

    await maybeRelayBotMentionsAfterSend({
      sourceAccountId: 'bot-a',
      sourceBotOpenId: 'ou_bot_a',
      chatId: 'oc_group_1',
      sentMessageId: 'om_sent_2',
      text: '@Bot B hello',
      mentions: [{ key: '@_user_1', openId: 'ou_bot_b', name: 'Bot B', isBot: true }],
      messageType: 'text',
      knownBots: new Map([['ou_bot_b', { accountId: 'bot-b', botOpenId: 'ou_bot_b', botName: 'Bot B' }]]),
      alreadySynthetic: true,
      inject: async () => {
        injectCalls += 1;
      },
    });

    expect(injectCalls).toBe(0);
  });
});
