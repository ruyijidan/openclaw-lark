import { describe, expect, it } from 'vitest';

import { inferMentionsFromText } from '../src/messaging/bot-relay/mention-inference';

describe('bot relay mention inference from post content', () => {
  it('detects @bot from post JSON with at.user_name', () => {
    const knownBots = new Map([
      ['ou_bot_1', { accountId: 'bot-1', botOpenId: 'ou_bot_1', botName: '我的飞书机器人' }],
    ]);

    const post = JSON.stringify({
      title: '',
      content: [
        [
          { tag: 'at', user_id: '@_user_1', user_name: '我的飞书机器人', style: [] },
          { tag: 'text', text: ' 你好，请查阅闹钟 App PRD 文档' },
        ],
      ],
    });

    const mentions = inferMentionsFromText(post, knownBots);
    expect(mentions.map((m) => m.openId)).toEqual(['ou_bot_1']);
    expect(mentions[0].name).toBe('我的飞书机器人');
  });

  it('detects @bot from locale-wrapped post', () => {
    const knownBots = new Map([
      ['ou_bot_1', { accountId: 'bot-1', botOpenId: 'ou_bot_1', botName: '我的飞书机器人' }],
    ]);

    const post = JSON.stringify({
      zh_cn: {
        title: '',
        content: [
          [
            { tag: 'at', user_id: '@_user_1', user_name: '我的飞书机器人', style: [] },
            { tag: 'text', text: ' hi' },
          ],
        ],
      },
    });

    const mentions = inferMentionsFromText(post, knownBots);
    expect(mentions.map((m) => m.openId)).toEqual(['ou_bot_1']);
  });
});

