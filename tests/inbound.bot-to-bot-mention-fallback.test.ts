import { afterEach, describe, expect, it } from 'vitest';

import { parseMessageEvent } from '../src/messaging/inbound/parse';
import { clearRelayRuntimeState, registerRelayBot } from '../src/messaging/bot-relay/runtime';

describe('inbound bot->bot mention fallback', () => {
  afterEach(() => {
    clearRelayRuntimeState();
  });

  it('infers bot mention from post content when mentions array is missing', async () => {
    registerRelayBot({ accountId: 'bot-b', botOpenId: 'ou_bot_b', botName: '我的飞书机器人' });

    const event = {
      sender: { sender_id: { open_id: 'ou_bot_a' }, sender_type: 'app' },
      message: {
        message_id: 'om_post_1',
        chat_id: 'oc_group_1',
        chat_type: 'group' as const,
        message_type: 'post',
        content: JSON.stringify({
          title: '',
          content: [
            [
              { tag: 'at', user_id: '@_user_1', user_name: '我的飞书机器人', style: [] },
              { tag: 'text', text: ' 你好' },
            ],
          ],
        }),
      },
    };

    const ctx = await parseMessageEvent(event as any, 'ou_bot_b');
    expect(ctx.mentions.some((m) => m.openId === 'ou_bot_b' && m.isBot)).toBe(true);
  });
});

