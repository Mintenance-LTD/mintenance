import { assessmentPhotoCoverage } from '../photo-coverage';
it('maps AI inputs by recorded IDs rather than sparse gallery indexes', () => {
  const result = assessmentPhotoCoverage(
    { analysis: { imageIds: ['b', 'a', 'missing'] } },
    [
      { id: 'a', image_index: 4, image_url: 'a.jpg' },
      { id: 'b', image_index: 8, image_url: 'b.jpg' },
      { id: 'later', image_index: 9, image_url: 'later.jpg' },
    ]
  );
  expect(result.frames).toEqual(['b.jpg', 'a.jpg', '']);
  expect(result.recordedIds).toEqual(['b', 'a', 'missing']);
});
it('preserves failed signing positions and declares legacy coverage unknown', () => {
  const result = assessmentPhotoCoverage({}, [
    { id: 'a', image_index: 0, image_url: null },
    { id: 'b', image_index: 2, image_url: 'b.jpg' },
  ]);
  expect(result.recordedIds).toBeNull();
  expect(result.frames[0]).toBe('');
  expect(result.frames[1]).toBeUndefined();
  expect(result.frames[2]).toBe('b.jpg');
});
