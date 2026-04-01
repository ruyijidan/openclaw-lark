import type { RelayResolutionParams, RelayTargetMatch } from './types';

export function findMentionedRelayTargets(params: RelayResolutionParams): RelayTargetMatch[] {
  const seen = new Set<string>();
  const matches: RelayTargetMatch[] = [];

  for (const mention of params.mentions) {
    if (!mention.isBot) continue;

    const knownBot = params.knownBots.get(mention.openId);
    if (!knownBot) continue;
    if (seen.has(mention.openId)) continue;

    seen.add(mention.openId);
    matches.push({
      openId: mention.openId,
      name: mention.name,
      accountId: knownBot.accountId,
    });
  }

  return matches;
}
