import type { MentionInfo } from '../types';
import type { RelayKnownBot } from './types';

function unwrapLocalePost(parsed: Record<string, unknown>): { title?: string; content?: unknown } | null {
  if ('title' in parsed || 'content' in parsed) {
    return parsed as { title?: string; content?: unknown };
  }
  for (const key of ['zh_cn', 'en_us', 'ja_jp']) {
    const v = parsed[key];
    if (v && typeof v === 'object') {
      return v as { title?: string; content?: unknown };
    }
  }
  const firstKey = Object.keys(parsed)[0];
  if (firstKey) {
    const v = parsed[firstKey];
    if (v && typeof v === 'object') {
      return v as { title?: string; content?: unknown };
    }
  }
  return null;
}

function flattenPostToText(raw: string): string | null {
  if (!raw.trim().startsWith('{')) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    const body = unwrapLocalePost(parsed);
    const content = body?.content;
    if (!Array.isArray(content)) return null;

    const lines: string[] = [];
    for (const row of content as any[]) {
      if (!Array.isArray(row)) continue;
      let line = '';
      for (const el of row) {
        if (!el || typeof el !== 'object') continue;
        const tag = (el as any).tag;
        if (tag === 'text') {
          line += String((el as any).text ?? '');
          continue;
        }
        if (tag === 'at') {
          const userId = String((el as any).user_id ?? '');
          const userName = String((el as any).user_name ?? '');
          if (userId && userId !== 'all') {
            // If user_id looks like an open_id, emit <at> tag for precise matching.
            if (userId.startsWith('ou_')) {
              line += `<at user_id="${userId}">${userName}</at>`;
            } else {
              line += `@${userName}`;
            }
          } else if (userId === 'all') {
            line += '@all';
          }
          continue;
        }
      }
      lines.push(line);
    }
    const flattened = lines.join('\n').trim();
    return flattened || null;
  } catch {
    return null;
  }
}

export function inferMentionsFromText(text: string, knownBots: Map<string, RelayKnownBot>): MentionInfo[] {
  const normalizedText = flattenPostToText(text) ?? text;
  const mentions: MentionInfo[] = [];
  const seen = new Set<string>();

  const tagRegex = /<at\s+user_id="([^"]+)">([^<]*)<\/at>/g;
  for (const match of normalizedText.matchAll(tagRegex)) {
    const openId = match[1] ?? '';
    if (!openId || seen.has(openId)) continue;
    const knownBot = knownBots.get(openId);
    if (!knownBot) continue;
    seen.add(openId);
    mentions.push({
      key: match[0],
      openId,
      name: match[2] || knownBot.botName || openId,
      isBot: true,
    });
  }

  if (mentions.length > 0) {
    return mentions;
  }

  for (const [openId, knownBot] of knownBots.entries()) {
    const name = knownBot.botName;
    if (!name) continue;
    if (!normalizedText.includes(`@${name}`)) continue;
    if (seen.has(openId)) continue;
    seen.add(openId);
    mentions.push({
      key: `@${name}`,
      openId,
      name,
      isBot: true,
    });
  }

  return mentions;
}
