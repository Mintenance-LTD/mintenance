import {
  propertyPageSize,
  readPropertyPages,
} from '@/lib/services/property-team/read-property-pages';

it('keeps reading owned or shared records after the REST row cap', async () => {
  const records = Array.from({ length: 1025 }, (_, index) => ({
    id: String(index + 1).padStart(4, '0'),
  }));
  const fetchPage = vi.fn(async (after: string | null) => ({
    data: records
      .filter(({ id }) => after === null || id > after)
      .slice(0, propertyPageSize),
    error: null,
  }));
  expect(await readPropertyPages(fetchPage)).toEqual(records);
  expect(fetchPage.mock.calls.map(([after]) => after)).toEqual([
    null,
    '0500',
    '1000',
  ]);
});

it('surfaces a later page failure instead of returning successful incomplete records', async () => {
  const page = Array.from({ length: propertyPageSize }, (_, index) => ({
    id: String(index),
  }));
  await expect(
    readPropertyPages(async (after) =>
      after === null
        ? { data: page, error: null }
        : { data: null, error: new Error('unavailable') }
    )
  ).rejects.toMatchObject({ statusCode: 500 });
});
