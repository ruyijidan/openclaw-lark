import { describe, expect, it } from 'vitest';
import { formatPackageDateVersion, getPackageTarballName } from '../scripts/release-version.js';

describe('release version helpers', () => {
  it('formats the package version from the packaging date', () => {
    const date = new Date('2026-04-07T09:30:00+08:00');

    expect(formatPackageDateVersion(date)).toBe('2026.4.7');
  });

  it('uses the generated date version in the tarball name', () => {
    expect(getPackageTarballName('@larksuite/openclaw-lark', '2026.4.7')).toBe(
      'larksuite-openclaw-lark-2026.4.7.tgz',
    );
  });
});
