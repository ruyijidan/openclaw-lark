import type { FeishuMessageEvent, MentionInfo } from '../types';

export interface RelayKnownBot {
  accountId: string;
  botOpenId?: string;
  botName?: string;
}

export interface RelayTargetMatch {
  openId: string;
  name?: string;
  accountId: string;
}

export interface SyntheticRelayBuildParams {
  sourceBotOpenId: string;
  targetBotOpenId: string;
  chatId: string;
  messageId: string;
  relayDepth: number;
  threadId?: string;
  content: string;
  messageType: string;
  mentions: NonNullable<FeishuMessageEvent['message']['mentions']>;
}

export interface RelayInjectionParams {
  ctx: import('../../channel/types').MonitorContext;
  event: FeishuMessageEvent;
}

export interface RelayResolutionParams {
  mentions: MentionInfo[];
  knownBots: Map<string, RelayKnownBot>;
}
