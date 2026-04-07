import { describe, expect, it } from 'vitest';

import { findMentionedRelayTargets } from '../src/messaging/bot-relay/registry.ts';
import { buildSyntheticRelayEvent } from '../src/messaging/bot-relay/synthetic-event.ts';

describe('bot relay synthetic event', () => {
  it('findMentionedRelayTargets returns only known bot mentions', () => {
    const targets = findMentionedRelayTargets({
      mentions: [
        { key: '@_user_1', openId: 'ou_human', name: 'Alice', isBot: false },
        { key: '@_user_2', openId: 'ou_bot_b', name: 'Bot B', isBot: true },
      ],
      knownBots: new Map([
        ['ou_bot_a', { accountId: 'bot-a' }],
        ['ou_bot_b', { accountId: 'bot-b' }],
      ]),
    });

    expect(targets.map((item) => item.openId)).toEqual(['ou_bot_b']);
  });

  it('buildSyntheticRelayEvent creates a Feishu-like group message event accepted by the inbound parser', () => {
    const event = buildSyntheticRelayEvent({
      sourceBotAppId: 'cli_bot_a',
      targetBotAppId: 'cli_bot_b',
      chatId: 'oc_group_1',
      messageId: 'om_source_1',
      relayDepth: 1,
      content: JSON.stringify({ text: '@Bot B hello' }),
      messageType: 'text',
      mentions: [
        {
          key: '@_user_1',
          id: { open_id: 'ou_bot_b' },
          name: 'Bot B',
        },
      ],
    });

    expect(event.schema).toBe('2.0');
    expect(event.event_type).toBe('im.message.receive_v1');
    expect(event.app_id).toBe('cli_bot_b');
    expect(event.sender.sender_type).toBe('user');
    expect(event.message.chat_type).toBe('group');
    expect(event.message.message_type).toBe('text');
    expect(event.message.chat_id).toBe('oc_group_1');
    expect(event.message.mentions?.[0]?.id?.open_id).toBe('ou_bot_b');
    expect(event.message.mentions?.[0]?.mentioned_type).toBe('bot');
    expect(event.message.mentions?.[0]?.bot_info?.app_id).toBe('cli_bot_b');
    expect(event.message.message_id).toMatch(/^synthetic:bot-relay:/);
  });

  it('buildSyntheticRelayEvent marks the event as synthetic relay metadata', () => {
    const event = buildSyntheticRelayEvent({
      sourceBotAppId: 'cli_bot_a',
      targetBotAppId: 'cli_bot_b',
      chatId: 'oc_group_1',
      messageId: 'om_source_2',
      relayDepth: 1,
      content: JSON.stringify({ text: '@Bot B hello again' }),
      messageType: 'text',
      mentions: [],
    });

    expect(event.__relay?.synthetic_source).toBe('bot-relay');
    expect(event.__relay?.relay_depth).toBe(1);
    expect(event.__relay?.source_bot_app_id).toBe('cli_bot_a');
  });
});
