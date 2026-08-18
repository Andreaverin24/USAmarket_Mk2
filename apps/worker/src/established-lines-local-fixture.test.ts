import { describe, expect, it } from 'vitest';
import { loadEstablishedLinesLocalFixture } from './established-lines-local-fixture.js';

describe('Established Lines local fixture', () => {
  it('contains 30 validated source records and no placeholder images', async () => {
    const fixture = await loadEstablishedLinesLocalFixture();

    expect(fixture.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(fixture.rows).toHaveLength(30);
    expect(fixture.rows.map((row) => row.rowNumber)).toEqual(
      Array.from({ length: 30 }, (_, index) => index + 1),
    );
    for (const row of fixture.rows) {
      expect(row.normalizedPayload.source?.key).toBe('establishedlines.com');
      expect(row.normalizedPayload.sourceUrl).toMatch(/^https:\/\/www\.establishedlines\.com\//);
      expect(row.normalizedPayload.imageUrls).not.toHaveLength(0);
      for (const imageUrl of row.normalizedPayload.imageUrls ?? [])
        expect(imageUrl).toMatch(/^https:\/\/www\.establishedlines\.com\//);
    }
  });
});
