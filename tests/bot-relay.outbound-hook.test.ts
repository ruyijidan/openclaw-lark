import { describe, expect, it } from 'vitest';

import { maybeRelayBotMentionsAfterSend } from '../src/messaging/bot-relay/outbound-hook.ts';

describe('maybeRelayBotMentionsAfterSend', () => {
  it('injects a synthetic event for known mentioned bots', async () => {
    const injected: string[] = [];

    await maybeRelayBotMentionsAfterSend({
      sourceAccountId: 'bot-a',
      sourceBotAppId: 'cli_bot_a',
      sourceBotOpenId: 'ou_bot_a',
      chatId: 'oc_group_1',
      sentMessageId: 'om_sent_1',
      text: '@Bot B hello',
      mentions: [{ key: '@_user_1', openId: 'cli_bot_b', name: 'Bot B', isBot: true }],
      messageType: 'text',
      knownBots: new Map([['cli_bot_b', { accountId: 'bot-b', appId: 'cli_bot_b', botOpenId: 'ou_bot_b', botName: 'Bot B' }]]),
      alreadySynthetic: false,
      inject: async ({ event }) => {
        injected.push(event.message.message_id);
      },
    });

    expect(injected.length).toBe(1);
  });

  it('allows one synthetic-originated reply hop', async () => {
    const injectedDepths: number[] = [];

    await maybeRelayBotMentionsAfterSend({
      sourceAccountId: 'bot-a',
      sourceBotAppId: 'cli_bot_a',
      sourceBotOpenId: 'ou_bot_a',
      chatId: 'oc_group_1',
      sentMessageId: 'om_sent_2',
      text: '@Bot B hello',
      mentions: [{ key: '@_user_1', openId: 'cli_bot_b', name: 'Bot B', isBot: true }],
      messageType: 'text',
      knownBots: new Map([['cli_bot_b', { accountId: 'bot-b', appId: 'cli_bot_b', botOpenId: 'ou_bot_b', botName: 'Bot B' }]]),
      alreadySynthetic: true,
      inject: async ({ event }) => {
        injectedDepths.push(event.__relay?.relay_depth ?? 0);
      },
    });

    expect(injectedDepths).toEqual([2]);
  });

  it('still relays when current depth is 19', async () => {
    const relayAsyncContext = await import('../src/messaging/bot-relay/relay-async-context.ts');
    const injectedDepths: number[] = [];

    await relayAsyncContext.runInRelayContext(19, async () => {
      await maybeRelayBotMentionsAfterSend({
        sourceAccountId: 'bot-a',
        sourceBotAppId: 'cli_bot_a',
        sourceBotOpenId: 'ou_bot_a',
        chatId: 'oc_group_1',
        sentMessageId: 'om_sent_3',
        text: '@Bot B hello again',
        mentions: [{ key: '@_user_1', openId: 'cli_bot_b', name: 'Bot B', isBot: true }],
        messageType: 'text',
        knownBots: new Map([['cli_bot_b', { accountId: 'bot-b', appId: 'cli_bot_b', botOpenId: 'ou_bot_b', botName: 'Bot B' }]]),
        alreadySynthetic: false,
        inject: async ({ event }) => {
          injectedDepths.push(event.__relay?.relay_depth ?? 0);
        },
      });
    });

    expect(injectedDepths).toEqual([20]);
  });
});
