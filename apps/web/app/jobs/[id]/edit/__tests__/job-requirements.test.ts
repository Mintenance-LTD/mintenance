import { describe, expect, it } from 'vitest';
import { readJobRequirements, writeJobRequirements } from '../job-requirements';

describe('job edit requirements compatibility', () => {
  it('preserves structured scheduling and other metadata when requirements change', () => {
    const stored = {
      preferred_start_date: '2026-12-01',
      inspection: { required: true },
      items: ['Old'],
    };
    const form = readJobRequirements(stored);
    expect(form.items).toEqual(['Old']);
    expect(writeJobRequirements(form.metadata, ['Insurance required'])).toEqual(
      {
        ...stored,
        items: ['Insurance required'],
      }
    );
    expect(stored.items).toEqual(['Old']);
  });
  it('converts legacy lists to the API object format and supports removing all items', () => {
    const form = readJobRequirements(['Weekend access', null, 42]);
    expect(writeJobRequirements(form.metadata, form.items)).toEqual({
      items: ['Weekend access'],
    });
    expect(writeJobRequirements(form.metadata, [])).toEqual({ items: [] });
  });
  it('handles absent requirements without giving the renderer an object', () => {
    for (const value of [
      undefined,
      null,
      {},
      { preferred_start_date: '2026-12-01' },
    ]) {
      expect(readJobRequirements(value).items).toEqual([]);
    }
  });
});
