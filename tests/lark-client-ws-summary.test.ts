import { describe, expect, it } from 'vitest';

import { summarizeWsInboundEnvelope } from '../src/core/lark-client.ts';

describe('summarizeWsInboundEnvelope', () => {
  it('extracts a compact summary for a text group message envelope', () => {
    const summary = summarizeWsInboundEnvelope({
      headers: [
        { key: 'type', value: 'event' },
      ],
      event: {
        header: {
          event_type: 'im.message.receive_v1',
        },
        event_id: 'evt_001',
        message: {
          chat_id: 'oc_group_001',
          message_id: 'om_001',
          message_type: 'text',
          mentions: [
            { id: { open_id: 'ou_bot_1' } },
            { id: { open_id: 'ou_user_1' } },
          ],
        },
        sender: {
          sender_type: 'app',
          sender_id: {
            open_id: 'ou_bot_source',
          },
        },
      },
    });

    expect(summary).toEqual({
      transportType: 'event',
      eventType: 'im.message.receive_v1',
      eventId: 'evt_001',
      chatId: 'oc_group_001',
      messageId: 'om_001',
      messageType: 'text',
      senderOpenId: 'ou_bot_source',
      senderType: 'app',
      mentionCount: 2,
      isFromBot: true,
    });
  });

  it('falls back safely when the envelope is not a message event', () => {
    const summary = summarizeWsInboundEnvelope({
      headers: [
        { key: 'type', value: 'card' },
      ],
      event: {
        header: {
          event_type: 'card.action.trigger',
        },
        event_id: 'evt_card_001',
      },
    });

    expect(summary).toEqual({
      transportType: 'card',
      eventType: 'card.action.trigger',
      eventId: 'evt_card_001',
      chatId: undefined,
      messageId: undefined,
      messageType: undefined,
      senderOpenId: undefined,
      senderType: undefined,
      mentionCount: 0,
      isFromBot: false,
    });
  });
});
